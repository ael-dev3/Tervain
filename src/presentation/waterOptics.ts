import * as THREE from 'three';

/**
 * How light meets water, shared by the sea and every inland surface. Original shader code throughout; no FFT ocean or
 * purchased water shader. A water pixel is built from:
 *
 *  - reflection: Fresnel with water's real 2 % head-on reflectance, from the planar capture (the sea), a screen-space
 *    march (rivers and pools, which sit at many heights), or the captured sky with its clouds, blurred by roughness;
 *  - the sun: a GGX highlight whose width follows the water's roughness and the pixel's footprint;
 *  - transmission: the refracted bed from the captured scene, dimmed by Beer-Lambert absorption over the actual path
 *    length, filled by light scattered inside the water, with caustics thrown onto the real submerged ground;
 *  - detail: drifting ripples and foam advected by the water's own flow, and the interactive ripple field.
 */

/** Metre-scale validity ramps; UInt captured depth clears to exactly one. */
export const WATER_DEPTH_VALIDITY = Object.freeze({ clearDepth: 1, foregroundTolerance: 0.03, refractionFade: 0.06 });

/** Rectangular pixel variance, calibrated below; the GPU supplies angular ray derivatives. */
export const WATER_PIXEL_VARIANCE = 1 / 12;

/** Water's reflectance at normal incidence ((1.33 - 1) / (1.33 + 1))^2. */
export const WATER_F0 = 0.02;

/** CPU calibration of the filtered highlight, not a substitute for native shader review. */
export function waterHighlightLobe(cosine: number, power: number, rayFootprintSquared: number): number {
  if (![cosine, power, rayFootprintSquared].every(Number.isFinite) || power <= 0 || rayFootprintSquared < 0) {
    throw new RangeError('Water highlight inputs must be finite, with positive power and nonnegative footprint.');
  }
  const filteredPower = power / (1 + power * rayFootprintSquared * WATER_PIXEL_VARIANCE);
  // The hemispherical integral of cos(theta)^power is 2*pi/(power+1).
  // Broaden a subpixel glint while retaining its integrated energy.
  return Math.pow(THREE.MathUtils.clamp(cosine, 0, 1), filteredPower) * (filteredPower + 1) / (power + 1);
}

/** Schlick's Fresnel for water: the share of light reflected at `cosine` between view and normal. */
export function waterFresnel(cosine: number): number {
  const c = THREE.MathUtils.clamp(cosine, 0, 1);
  return WATER_F0 + (1 - WATER_F0) * Math.pow(1 - c, 5);
}

/** Absorption per metre of water: red vanishes first, while blue-green survives deeper paths. */
export function waterAbsorptionCoefficients(clarity = 1): THREE.Vector3 {
  if (!Number.isFinite(clarity)) throw new RangeError('Water clarity must be finite.');
  return new THREE.Vector3(0.52, 0.20, 0.115).divideScalar(Math.max(clarity, 0.2));
}

/** Borrowed render textures: the Grade owns their lifetime, never a water mesh. */
export function makeWaterOpticsUniforms(clarity = 1) {
  return {
    tWaterColor: { value: null as THREE.Texture | null },
    tWaterDepth: { value: null as THREE.Texture | null },
    uWaterResolution: { value: new THREE.Vector2(1, 1) },
    uWaterNear: { value: 0.1 },
    uWaterFar: { value: 1200 },
    uWaterCapture: { value: 0 },
    uWaterAbsorption: { value: waterAbsorptionCoefficients(clarity) },
    tWaterReflection: { value: null as THREE.Texture | null },
    uWaterReflectionMatrix: { value: new THREE.Matrix4() },
    uWaterReflectionReady: { value: 0 },
    /** Camera matrices for reconstructing submerged ground from captured depth (caustics, screen-space reflection). */
    uWaterInverseProjection: { value: new THREE.Matrix4() },
    uWaterCameraWorld: { value: new THREE.Matrix4() },
  };
}

export function detachWaterOptics(material: THREE.ShaderMaterial) {
  const u = material.uniforms;
  for (const key of ['tWaterColor', 'tWaterDepth', 'tWaterReflection']) if (u[key]) u[key]!.value = null;
  for (const key of ['uWaterCapture', 'uWaterReflectionReady']) if (u[key]) u[key]!.value = 0;
}

const WATER_FILTERING_GLSL = /* glsl */ `
// Widths and angular footprints are gathered before any nonuniform discard.
float waterSmooth(float start, float end, float value, float footprint) {
  float halfWidth = max(footprint, 0.0) * 0.5;
  return smoothstep(start - halfWidth, end + halfWidth, value);
}
float waterHighlight(float alignment, float power, float rayFootprintSquared) {
  float filteredPower = power / (1.0 + power * rayFootprintSquared * ${WATER_PIXEL_VARIANCE.toFixed(9)});
  return pow(clamp(alignment, 0.0, 1.0), filteredPower) * (filteredPower + 1.0) / (power + 1.0);
}
float waterWaveCoverage(float phaseFootprint) {
  // A Gaussian approximation of a rectangular pixel removes unresolved analytic ripples.
  return exp(-phaseFootprint * phaseFootprint / 24.0);
}
vec3 waterReflectionProjection(vec3 normal, vec3 world, float planeY) {
  vec4 projected = uWaterReflectionMatrix * vec4(world.x, planeY, world.z, 1.0);
  vec2 uv = projected.xy / max(abs(projected.w), 0.0001) + normal.xz * 0.045;
  return vec3(uv, projected.w);
}
`;

/** Original screen-space optics: GLSL shared by the sea and inland water. */
export const WATER_OPTICS_GLSL = /* glsl */ `
uniform sampler2D tWaterColor;
uniform sampler2D tWaterDepth;
uniform vec2 uWaterResolution;
uniform float uWaterNear;
uniform float uWaterFar;
uniform float uWaterCapture;
uniform vec3 uWaterAbsorption;
uniform mat4 projectionMatrix;
uniform sampler2D tWaterReflection;
uniform mat4 uWaterReflectionMatrix;
uniform float uWaterReflectionReady;
uniform mat4 uWaterInverseProjection;
uniform mat4 uWaterCameraWorld;
${WATER_FILTERING_GLSL}

float waterViewDepth(float d) {
  return uWaterNear * uWaterFar / max(uWaterFar - d * (uWaterFar - uWaterNear), 0.0001);
}

// The depth buffer stores camera-axis depth. Recover distance along the pixel's
// viewing ray so attenuation is in metres, independent of field of view.
float waterRayGap(float bed, vec3 viewSurface) {
  float axial = max(0.001, -viewSurface.z);
  return max(0.0, bed - axial) * length(viewSurface) / axial;
}

// Captured ground in world space at a screen position (for caustics on the actual submerged surface).
vec3 waterWorldAt(vec2 uv, float raw) {
  vec4 view = uWaterInverseProjection * vec4(uv * 2.0 - 1.0, raw * 2.0 - 1.0, 1.0);
  view /= view.w;
  return (uWaterCameraWorld * vec4(view.xyz, 1.0)).xyz;
}

// The light a submerged surface receives: sunlight focused into a drifting web where it is shallow.
uniform sampler2D tWaterCaustics;
uniform float uWaterCausticStrength;
float waterCaustic(vec3 bed, float below, float t) {
  if (uWaterCausticStrength <= 0.0) return 0.0;
  vec2 p = bed.xz;
  float a = textureLod(tWaterCaustics, p * 0.31 + vec2(t * 0.021, t * 0.013), 0.0).r;
  float b = textureLod(tWaterCaustics, p * 0.27 + vec2(-t * 0.017, t * 0.019) + 0.37, 0.0).r;
  // The web sharpens just below the surface and spreads out (and dims) with depth.
  float web = min(a, b) * 1.6 + (a + b) * 0.12;
  return web * smoothstep(0.02, 0.18, below) * exp(-below * 0.45) * uWaterCausticStrength;
}

vec3 waterAbsorbedSample(vec3 scatter, vec2 uv, float raw, float bed, vec3 viewSurface, float t, float lit) {
  float path = clamp(waterRayGap(bed, viewSurface), 0.0, 40.0);
  vec3 transmittance = exp(-uWaterAbsorption * path);
  vec3 ground = textureLod(tWaterColor, uv, 0.0).rgb;
  // The captured ground was lit as if dry; under water it also catches the caustics.
  if (lit > 0.0) {
    vec3 g = waterWorldAt(uv, raw);
    float below = max(0.0, path * 0.7);
    ground *= 1.0 + waterCaustic(g, below, t) * lit;
  }
  return ground * transmittance + scatter * (vec3(1.0) - transmittance);
}

// The refracted ground behind a water pixel, absorbed and in-scattered; 'scatter' is the light the water itself sends
// back (its colour in deep water). 'bedPath' receives the path length through water (metres) for foam and alpha.
vec3 waterTransmission(vec3 scatter, vec3 normal, vec3 world, float depth, float t, float lit, out float bedPath) {
  bedPath = depth;
  if (uWaterCapture < 0.5) return scatter;
  vec2 base = gl_FragCoord.xy / uWaterResolution;
  vec3 viewSurface = (viewMatrix * vec4(world, 1.0)).xyz;
  float surface = max(0.001, -viewSurface.z);
  // Project a small metre-scale bend instead of moving every depth by a fixed
  // fraction of the screen. Nearby submerged forms refract; distant coast and
  // foreground silhouettes retain their shape.
  vec3 viewNormal = mat3(viewMatrix) * normal;
  vec2 projectionScale = vec2(projectionMatrix[0][0], projectionMatrix[1][1]) * 0.5;
  vec2 offset = viewNormal.xy * projectionScale * min(max(depth, 0.0) * 0.16, 0.42) / max(surface, 0.8);
  vec2 sampleUV = clamp(base + offset, vec2(0.001), vec2(0.999));
  float raw = textureLod(tWaterDepth, sampleUV, 0.0).r;
  float bed = waterViewDepth(raw);
  // A dry silhouette has no refraction weight. Ramp up only behind the surface
  // instead of snapping between two different colors at one depth threshold.
  // The exact clear value preserves real terrain near the camera's far plane.
  float refraction = (1.0 - step(${WATER_DEPTH_VALIDITY.clearDepth.toFixed(1)}, raw))
    * smoothstep(0.0, ${WATER_DEPTH_VALIDITY.refractionFade.toFixed(3)}, bed - surface);
  if (refraction >= 1.0) {
    bedPath = waterRayGap(bed, viewSurface);
    return waterAbsorbedSample(scatter, sampleUV, raw, bed, viewSurface, t, lit);
  }
  float baseRaw = textureLod(tWaterDepth, base, 0.0).r;
  float baseBed = waterViewDepth(baseRaw);
  float baseValidity = (1.0 - step(${WATER_DEPTH_VALIDITY.clearDepth.toFixed(1)}, baseRaw))
    * smoothstep(-${WATER_DEPTH_VALIDITY.foregroundTolerance.toFixed(3)}, 0.0, baseBed - surface);
  vec3 fallback = scatter;
  if (baseValidity > 0.0) {
    bedPath = waterRayGap(baseBed, viewSurface);
    fallback = mix(scatter, waterAbsorbedSample(scatter, base, baseRaw, baseBed, viewSurface, t, lit), baseValidity);
  }
  if (refraction <= 0.0) return fallback;
  // Only the narrow validity band evaluates both colors. Each candidate retains
  // its own Beer-Lambert path, so blending never leaks a foreground sample.
  return mix(fallback, waterAbsorbedSample(scatter, sampleUV, raw, bed, viewSurface, t, lit), refraction);
}

// 'rough' smears the image along the line of sight: unresolved waves each tilt a facet, so a reflected island or cliff
// is drawn out into streaks toward the viewer instead of standing in a mirror.
vec3 waterReflection(vec3 sky, vec3 projected, vec2 uvDx, vec2 uvDy, float rough) {
  if (uWaterReflectionReady <= 0.0) return sky;
  if (projected.z <= 0.0) return sky;
  vec2 uv = projected.xy;
  float valid = smoothstep(0.0, 0.025, uv.x) * (1.0 - smoothstep(0.975, 1.0, uv.x))
              * smoothstep(0.0, 0.025, uv.y) * (1.0 - smoothstep(0.975, 1.0, uv.y));
  // The capture has mip levels: choose them from derivatives gathered before
  // shoreline divergence, so distant reflected stone does not sparkle as we run.
  vec2 smear = vec2(0.0, rough * 0.11);
  vec2 dy = uvDy + smear * 0.35;
  vec3 reflected = textureGrad(tWaterReflection, clamp(uv, vec2(0.002), vec2(0.998)), uvDx, dy).rgb * 0.36;
  reflected += textureGrad(tWaterReflection, clamp(uv + smear * 0.5, vec2(0.002), vec2(0.998)), uvDx, dy).rgb * 0.22;
  reflected += textureGrad(tWaterReflection, clamp(uv - smear * 0.5, vec2(0.002), vec2(0.998)), uvDx, dy).rgb * 0.22;
  reflected += textureGrad(tWaterReflection, clamp(uv + smear, vec2(0.002), vec2(0.998)), uvDx, dy).rgb * 0.1;
  reflected += textureGrad(tWaterReflection, clamp(uv - smear, vec2(0.002), vec2(0.998)), uvDx, dy).rgb * 0.1;
  return mix(sky, reflected, valid * 0.95 * uWaterReflectionReady);
}

// Screen-space reflection for water that is not at sea level: march the reflected ray through the captured depth.
// Returns the reflected scene colour in rgb and how much of it to trust in a.
vec4 waterScreenReflection(vec3 world, vec3 R, float rough) {
  if (uWaterCapture < 0.5) return vec4(0.0);
  vec3 origin = (viewMatrix * vec4(world, 1.0)).xyz;
  vec3 dir = normalize(mat3(viewMatrix) * R);
  // A ray toward the camera or straight up leaves the captured image at once.
  if (dir.z > 0.35) return vec4(0.0);
  float stepLength = 0.35 + 0.02 * length(origin);
  vec3 p = origin;
  vec3 lastP = origin;
  float hit = 0.0;
  vec2 uv = vec2(0.0);
  for (int i = 0; i < 28; i++) {
    lastP = p;
    p += dir * stepLength;
    stepLength *= 1.12;
    vec4 clip = projectionMatrix * vec4(p, 1.0);
    uv = clip.xy / clip.w * 0.5 + 0.5;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0))) || p.z > -uWaterNear) break;
    float scene = waterViewDepth(textureLod(tWaterDepth, uv, 0.0).r);
    float gap = -p.z - scene;
    if (gap > 0.0 && gap < stepLength * 2.5 + 0.4) {
      // Refine between the last two samples.
      vec3 a = lastP, b = p;
      for (int k = 0; k < 5; k++) {
        vec3 m = (a + b) * 0.5;
        vec4 mc = projectionMatrix * vec4(m, 1.0);
        vec2 muv = mc.xy / mc.w * 0.5 + 0.5;
        float ms = waterViewDepth(textureLod(tWaterDepth, muv, 0.0).r);
        if (-m.z > ms) b = m; else a = m;
        uv = muv;
      }
      hit = 1.0;
      break;
    }
  }
  if (hit < 0.5) return vec4(0.0);
  vec2 edge = smoothstep(vec2(0.0), vec2(0.08), uv) * (1.0 - smoothstep(vec2(0.92), vec2(1.0), uv));
  float trust = edge.x * edge.y * (1.0 - smoothstep(0.35, 0.8, rough)) * smoothstep(0.35, -0.1, dir.z);
  return vec4(textureLod(tWaterColor, uv, rough * 3.0).rgb, trust);
}

// 'depth' is the water's own depth to its bed here: only something standing up out of the bed (a shin, a stone, a
// post) makes a lip, never a broad sheet of shallow water over the bed itself, which reads as clear water.
float waterContactEdge(vec3 world, float pixelMetres, float depth) {
  if (uWaterCapture < 0.5) return 0.0;
  vec2 uv = gl_FragCoord.xy / uWaterResolution;
  float raw = textureLod(tWaterDepth, uv, 0.0).r;
  if (raw >= ${WATER_DEPTH_VALIDITY.clearDepth.toFixed(1)}) return 0.0;
  vec3 viewSurface = (viewMatrix * vec4(world, 1.0)).xyz;
  float gap = waterRayGap(waterViewDepth(raw), viewSurface);
  float obstacle = 1.0 - smoothstep(0.35, 0.7, gap / max(depth, 0.02));
  // A few centimetres of water against stone or a shin: a thin broken lip, faded where it would be subpixel.
  return waterSmooth(0.0, 0.05, gap, pixelMetres) * (1.0 - waterSmooth(0.06, 0.34, gap, pixelMetres))
    * (1.0 - smoothstep(0.12, 0.56, pixelMetres)) * obstacle;
}

// Sun on water: GGX, roughness from the waves the pixel cannot resolve.
float waterSun(vec3 N, vec3 V, vec3 L, float roughness) {
  vec3 H = normalize(V + L);
  float a = max(roughness * roughness, 0.0025);
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0), NdotL = max(dot(N, L), 0.0), NdotV = max(dot(N, V), 0.0001);
  float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159265 * d * d);
  float k = a * 0.5;
  float G = NdotL / (NdotL * (1.0 - k) + k) * NdotV / (NdotV * (1.0 - k) + k);
  float F = ${WATER_F0.toFixed(3)} + ${(1 - WATER_F0).toFixed(3)} * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  return D * G * F / (4.0 * NdotV) ;
}
`;

/** The sky in reflections: a capture of the actual dome (clouds included), or its two-colour gradient until ready. */
export const WATER_SKY_GLSL = /* glsl */ `
uniform samplerCube tSkyCube;
uniform float uSkyCubeReady;
vec3 waterSky(vec3 R, float rough, vec3 top, vec3 horizon) {
  vec3 dir = normalize(vec3(R.x, max(R.y, 0.0) * 0.98 + 0.02, R.z));
  vec3 gradient = mix(horizon, top, pow(clamp(R.y, 0.0, 1.0), 0.5));
  if (uSkyCubeReady < 0.5) return gradient;
  vec3 captured = textureLod(tSkyCube, dir, rough * 6.0).rgb;
  return mix(gradient, captured, uSkyCubeReady);
}
`;

/** Detail on any water: flow-advected ripple slopes (two phases, so the pattern never stretches), and foam. */
export const WATER_DETAIL_GLSL = /* glsl */ `
uniform sampler2D tWaterRipples;
uniform sampler2D tWaterFoam;
// Two copies of the texture advected by the flow, each restarting while the other is at full weight.
vec2 waterFlowSlope(vec2 p, vec2 flow, float t, float scale, float footprint) {
  float phaseA = fract(t * 0.25), phaseB = fract(t * 0.25 + 0.5);
  float weight = abs(phaseA * 2.0 - 1.0);
  vec2 drift = flow * 4.0;
  vec2 uvA = p * scale - drift * phaseA * scale;
  vec2 uvB = p * scale - drift * phaseB * scale + 0.5;
  vec2 a = texture(tWaterRipples, uvA).rg * 2.0 - 1.0;
  vec2 b = texture(tWaterRipples, uvB).rg * 2.0 - 1.0;
  // Ripples smaller than a pixel only shimmer: fade them by footprint.
  float keep = 1.0 - smoothstep(0.35, 1.2, footprint * scale * 3.0);
  return mix(a, b, weight) * keep;
}
vec4 waterFlowFoam(vec2 p, vec2 flow, float t, float scale) {
  float phaseA = fract(t * 0.18), phaseB = fract(t * 0.18 + 0.5);
  float weight = abs(phaseA * 2.0 - 1.0);
  vec2 drift = flow * 5.5;
  vec4 a = texture(tWaterFoam, p * scale - drift * phaseA * scale);
  vec4 b = texture(tWaterFoam, p * scale - drift * phaseB * scale + 0.31);
  return mix(a, b, weight);
}
// How much of a pixel is white for a foam 'amount' 0..1, from the texture's cells and lace.
float waterFoamCover(vec4 tex, float amount, float footprint) {
  float pattern = tex.r * 0.62 + tex.g * 0.38 + (tex.a - 0.5) * 0.35;
  float edge = 0.12 + footprint * 0.4;
  return smoothstep(1.0 - amount - edge, 1.0 - amount + edge, pattern) * smoothstep(0.0, 0.08, amount);
}
`;

/** The interactive ripple field near the player: wakes, splashes and the foam they leave. */
export const WATER_RIPPLE_GLSL = /* glsl */ `
uniform sampler2D tRipple;
uniform vec3 uRipple;       // world x, z of the field's corner; field size (m)
uniform float uRippleReady;
// slope xz, height, foam.
vec4 waterRipple(vec2 p) {
  if (uRippleReady < 0.5) return vec4(0.0);
  vec2 uv = (p - uRipple.xy) / uRipple.z;
  if (any(lessThan(uv, vec2(0.01))) || any(greaterThan(uv, vec2(0.99)))) return vec4(0.0);
  vec4 r = textureLod(tRipple, uv, 0.0);
  float fade = smoothstep(0.0, 0.12, min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y)));
  return vec4(r.zw, r.x, r.y) * fade;
}
`;
