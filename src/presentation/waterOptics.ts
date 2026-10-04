import * as THREE from 'three';

/** Metre-scale validity ramps; UInt captured depth clears to exactly one. */
export const WATER_DEPTH_VALIDITY = Object.freeze({ clearDepth: 1, foregroundTolerance: 0.03, refractionFade: 0.06 });

/** Rectangular pixel variance, calibrated below; the GPU supplies angular ray derivatives. */
export const WATER_PIXEL_VARIANCE = 1 / 12;

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
vec3 waterReflectionProjection(vec3 normal, vec3 world) {
  vec4 projected = uWaterReflectionMatrix * vec4(world.x, 0.0, world.z, 1.0);
  vec2 uv = projected.xy / max(abs(projected.w), 0.0001) + normal.xz * 0.032;
  return vec3(uv, projected.w);
}
`;

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
  };
}

export function detachWaterOptics(material: THREE.ShaderMaterial) {
  const u = material.uniforms;
  for (const key of ['tWaterColor', 'tWaterDepth', 'tWaterReflection']) if (u[key]) u[key]!.value = null;
  for (const key of ['uWaterCapture', 'uWaterReflectionReady']) if (u[key]) u[key]!.value = 0;
}

/** Original inexpensive screen-space transmission; no FFT or purchased shader code. */
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

vec3 waterAbsorbedSample(vec3 body, vec2 uv, float bed, vec3 viewSurface) {
  float path = clamp(waterRayGap(bed, viewSurface), 0.0, 32.0);
  vec3 transmittance = exp(-uWaterAbsorption * path);
  // Captured attachments have one level. Explicit LOD remains defined inside
  // depth-validity branches and after the caller's shoreline discard.
  return texture2DLodEXT(tWaterColor, uv, 0.0).rgb * transmittance + body * (vec3(1.0) - transmittance);
}

vec3 waterTransmission(vec3 body, vec3 normal, vec3 world, float depth) {
  if (uWaterCapture < 0.5) return body;
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
  float raw = texture2DLodEXT(tWaterDepth, sampleUV, 0.0).r;
  float bed = waterViewDepth(raw);
  // A dry silhouette has no refraction weight. Ramp up only behind the surface
  // instead of snapping between two different colors at one depth threshold.
  // The exact clear value preserves real terrain near the camera's far plane.
  float refraction = (1.0 - step(${WATER_DEPTH_VALIDITY.clearDepth.toFixed(1)}, raw))
    * smoothstep(0.0, ${WATER_DEPTH_VALIDITY.refractionFade.toFixed(3)}, bed - surface);
  if (refraction >= 1.0) return waterAbsorbedSample(body, sampleUV, bed, viewSurface);
  float baseRaw = texture2DLodEXT(tWaterDepth, base, 0.0).r;
  float baseBed = waterViewDepth(baseRaw);
  float baseValidity = (1.0 - step(${WATER_DEPTH_VALIDITY.clearDepth.toFixed(1)}, baseRaw))
    * smoothstep(-${WATER_DEPTH_VALIDITY.foregroundTolerance.toFixed(3)}, 0.0, baseBed - surface);
  vec3 fallback = body;
  if (baseValidity > 0.0) {
    fallback = mix(body, waterAbsorbedSample(body, base, baseBed, viewSurface), baseValidity);
  }
  if (refraction <= 0.0) return fallback;
  // Only the narrow validity band evaluates both colors. Each candidate retains
  // its own Beer-Lambert path, so blending never leaks a foreground sample.
  return mix(fallback, waterAbsorbedSample(body, sampleUV, bed, viewSurface), refraction);
}

vec3 waterReflection(vec3 sky, vec3 projected, vec2 uvDx, vec2 uvDy) {
  if (uWaterReflectionReady <= 0.0) return sky;
  if (projected.z <= 0.0) return sky;
  vec2 uv = projected.xy;
  float valid = smoothstep(0.0, 0.025, uv.x) * (1.0 - smoothstep(0.975, 1.0, uv.x))
              * smoothstep(0.0, 0.025, uv.y) * (1.0 - smoothstep(0.975, 1.0, uv.y));
  // The capture has mip levels: choose them from derivatives gathered before
  // shoreline divergence, so distant reflected stone does not sparkle as we run.
  vec3 reflected = texture2DGradEXT(tWaterReflection, clamp(uv, vec2(0.002), vec2(0.998)), uvDx, uvDy).rgb;
  return mix(sky, reflected, valid * 0.9 * uWaterReflectionReady);
}

float waterContactEdge(vec3 world, float pixelMetres) {
  if (uWaterCapture < 0.5) return 0.0;
  vec2 uv = gl_FragCoord.xy / uWaterResolution;
  float raw = texture2DLodEXT(tWaterDepth, uv, 0.0).r;
  if (raw >= ${WATER_DEPTH_VALIDITY.clearDepth.toFixed(1)}) return 0.0;
  vec3 viewSurface = (viewMatrix * vec4(world, 1.0)).xyz;
  float gap = waterRayGap(waterViewDepth(raw), viewSurface);
  // A 3.5 cm lip cannot remain a hard single-pixel edge at long distance.
  return waterSmooth(0.0, 0.035, gap, pixelMetres) * (1.0 - waterSmooth(0.04, 0.28, gap, pixelMetres))
    * (1.0 - smoothstep(0.12, 0.56, pixelMetres));
}
`;
