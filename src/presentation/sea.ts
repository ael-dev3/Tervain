import * as THREE from 'three';
import type { Terrain } from '../world/terrain';
import { sharedNoise } from './noiseTextures';
import { SKY } from './skyState';
import { buildSeaGeometry } from './seaGeometry';
import { detachWaterOptics, makeWaterOpticsUniforms, WATER_OPTICS_GLSL } from './waterOptics';

// Each fundamental swell has at least five samples on the High coastal mesh.
// Fine wind ripples belong to the fragment normal, not unresolved vertex waves.
const WAVES = [[1, 0.12, 34, 0.35], [0.94, -0.34, 18, 0.21], [0.70, 0.71, 10, 0.08]] as const;
const WAVE_HARMONIC = 0.12;
export const SEA_MAX_WAVE_HEIGHT = WAVES.reduce((sum, wave) => sum + wave[3], 0) * (1 + WAVE_HARMONIC);
const LAND_MASK_START = -0.035;
const DAMP_START = 0.04, DAMP_END = 1.8;

/** The same shoreline envelope used by displacement and conservative wet bounds. */
function waveDamping(depth: number) {
  const t = THREE.MathUtils.clamp((depth - DAMP_START) / (DAMP_END - DAMP_START), 0, 1);
  return { value: t * t * (3 - 2 * t), derivative: 6 * t * (1 - t) / (DAMP_END - DAMP_START) };
}

/** Metre-based analytic surface sample for bounds/calibration, independent of the cosmetic clock owner. */
export function sampleSeaSurface(x: number, z: number, seconds: number, meanDepth: number, depthGradient: readonly [number, number] = [0, 0]) {
  let height = 0, slopeX = 0, slopeZ = 0;
  for (const [dx, dz, wavelength, amplitude] of WAVES) {
    const length = Math.hypot(dx, dz), dirX = dx / length, dirZ = dz / length;
    const k = Math.PI * 2 / wavelength;
    const phase = (dirX * x + dirZ * z) * k - Math.sqrt(9.81 * k) * seconds * 0.65;
    height += amplitude * (Math.sin(phase) + WAVE_HARMONIC * Math.sin(phase * 2));
    const slope = amplitude * k * (Math.cos(phase) + WAVE_HARMONIC * 2 * Math.cos(phase * 2));
    slopeX += slope * dirX; slopeZ += slope * dirZ;
  }
  const damping = waveDamping(meanDepth);
  return {
    height: height * damping.value,
    slopeX: slopeX * damping.value + height * damping.derivative * depthGradient[0],
    slopeZ: slopeZ * damping.value + height * damping.derivative * depthGradient[1],
  };
}

// One source for vertex relief and per-pixel slope: broad moving swells stay connected
// to the same surface instead of adding a second independent "bump-only" sea.
const SWELL_GLSL = /* glsl */ `
float seaDamping(float depth) { return smoothstep(${DAMP_START.toFixed(2)}, ${DAMP_END.toFixed(2)}, depth); }
float seaDampingDerivative(float depth) {
  float t = clamp((depth - ${DAMP_START.toFixed(2)}) / ${(DAMP_END - DAMP_START).toFixed(2)}, 0.0, 1.0);
  return 6.0 * t * (1.0 - t) / ${(DAMP_END - DAMP_START).toFixed(2)};
}
void wave(vec2 dir, float wavelength, float amplitude, vec2 xz, inout float height, inout vec2 slope) {
  float k = 6.2831853 / wavelength;
  float phase = dot(dir, xz) * k - sqrt(9.81 * k) * uTime * 0.65;
  height += amplitude * (sin(phase) + ${WAVE_HARMONIC.toFixed(2)} * sin(phase * 2.0));
  slope += amplitude * k * (cos(phase) + ${(WAVE_HARMONIC * 2).toFixed(2)} * cos(phase * 2.0)) * dir;
}
void seaSwell(vec2 xz, out float height, out vec2 slope) {
  height = 0.0; slope = vec2(0.0);
  ${WAVES.map(([x, z, length, amplitude]) => `wave(normalize(vec2(${x.toFixed(3)}, ${z.toFixed(3)})), ${length.toFixed(3)}, ${amplitude.toFixed(3)}, xz, height, slope);`).join('\n  ')}
}
`;

/**
 * Bounds only the part of the source triangles that can survive the sea's dry-land discard.
 * Interpolated upper vertex depth encloses every wave phase, including partially wet triangles
 * in the stitched horizon. The render pass adds its usual full-metre crest safety margin.
 */
export function seaVisibilityBounds(geometry: THREE.BufferGeometry): THREE.Box3[] {
  const position = geometry.getAttribute('position'), depth = geometry.getAttribute('aDepth');
  const index = geometry.index!;
  const bounds = new THREE.Box3(), point = new THREE.Vector3();
  const pieces: THREE.Box3[] = [], near = new Map<string, THREE.Box3>();
  const ids = [0, 0, 0], upper = [0, 0, 0];
  for (let triangle = 0; triangle < index.count; triangle += 3) {
    bounds.makeEmpty();
    for (let corner = 0; corner < 3; corner++) {
      const id = index.getX(triangle + corner), d = depth.getX(id);
      ids[corner] = id;
      upper[corner] = d + SEA_MAX_WAVE_HEIGHT * waveDamping(d).value - LAND_MASK_START;
    }
    for (let corner = 0; corner < 3; corner++) {
      const next = (corner + 1) % 3, a = ids[corner]!, b = ids[next]!;
      const da = upper[corner]!, db = upper[next]!;
      if (da >= 0) bounds.expandByPoint(point.fromBufferAttribute(position, a));
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db);
        point.set(
          position.getX(a) + (position.getX(b) - position.getX(a)) * t,
          position.getY(a) + (position.getY(b) - position.getY(a)) * t,
          position.getZ(a) + (position.getZ(b) - position.getZ(a)) * t,
        );
        bounds.expandByPoint(point);
      }
    }
    if (bounds.isEmpty()) continue;
    // A single 10 km-wide horizon box overlaps an inland view even when every wet
    // triangle is behind it. Keep those long faces separate; group only nearby grid
    // faces, without changing the sea mesh, its wave amplitudes or its draw distance.
    if (bounds.max.x - bounds.min.x > 32 || bounds.max.z - bounds.min.z > 32) pieces.push(bounds.clone());
    else {
      const key = `${Math.floor(bounds.min.x / 32)}:${Math.floor(bounds.min.z / 32)}`;
      const existing = near.get(key);
      if (existing) existing.union(bounds);
      else near.set(key, bounds.clone());
    }
  }
  return [...near.values(), ...pieces];
}

/** Original layered coastal waves, depth transmission and laced surf, on a stitched ocean mesh. */
const VERT = /* glsl */ `
attribute float aDepth;
attribute float aShore;
uniform float uTime;
varying float vDepth;
varying float vMeanDepth;
varying float vShore;
varying vec3 vWorld;
varying float vCrest;
#include <fog_pars_vertex>
${SWELL_GLSL}
void main() {
  vec3 p = position;
  float h;
  vec2 slope;
  seaSwell(p.xz, h, slope);
  float shoreDamping = seaDamping(aDepth);
  p.y += h * shoreDamping;
  vMeanDepth = aDepth;
  vCrest = h * shoreDamping;
  vDepth = aDepth + h * shoreDamping;
  vShore = aShore;
  vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uDetail;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunI;
uniform float uNight;
uniform sampler2D uNoise;
uniform sampler2D uCells;
varying float vDepth;
varying float vMeanDepth;
varying float vShore;
varying vec3 vWorld;
varying float vCrest;
#include <fog_pars_fragment>
${SWELL_GLSL}
${WATER_OPTICS_GLSL}
// The signed bed depth varies through each triangle. Its derivative is required
// by h(x,z)*damping(depth): omitting that term makes shoreline highlights lie flat.
vec2 meanDepthGradient() {
  vec3 dx = dFdx(vWorld), dy = dFdy(vWorld);
  float ddx = dFdx(vMeanDepth), ddy = dFdy(vMeanDepth);
  float det = dx.x * dy.z - dy.x * dx.z;
  if (abs(det) < 0.0000001) return vec2(0.0);
  return vec2(ddx * dy.z - ddy * dx.z, dx.x * ddy - dy.x * ddx) / det;
}
void main() {
  float d = max(vDepth, 0.0);
  float depthPixel = fwidth(vDepth);
  float landMask = waterSmooth(${LAND_MASK_START.toFixed(3)}, 0.065, vDepth, min(depthPixel, 0.04));
  // Gather all pixel footprints before the nonuniform shoreline discard.
  // This includes noise thresholds, reflected rays and projected reflection UVs.
  // Texture gradients evaluated after a neighboring lane is discarded are undefined.
  float pixelMetres = length(dFdx(vWorld)) + length(dFdy(vWorld));
  vec2 depthGradient = meanDepthGradient();
  vec3 geometric = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (geometric.y < 0.0) geometric = -geometric;
  vec3 V = normalize(cameraPosition - vWorld);
  float distanceToCamera = length(cameraPosition - vWorld);
  float swellHeight;
  vec2 swellSlope;
  seaSwell(vWorld.xz, swellHeight, swellSlope);
  swellSlope = swellSlope * seaDamping(vMeanDepth) + swellHeight * seaDampingDerivative(vMeanDepth) * depthGradient;
  vec3 smoothNormal = normalize(vec3(-swellSlope.x, 1.0, -swellSlope.y));
  // Large horizon triangles have no resolvable swell shape. Fade the smooth
  // near-surface normal to their real geometric slope before it can shimmer.
  vec3 surfaceNormal = normalize(mix(geometric, smoothNormal, 0.82 * (1.0 - smoothstep(160.0, 420.0, distanceToCamera))));
  vec2 uv = vWorld.xz * 0.075 + vec2(-uTime * 0.008, uTime * 0.005);
  vec2 uv2 = vWorld.xz * 0.24 + vec2(uTime * 0.012, -uTime * 0.009);
  vec2 ripple = (texture2D(uNoise, uv).gb - 0.5) * 0.12;
  ripple += (texture2D(uNoise, uv2).gb - 0.5) * 0.075 * uDetail;
  float ripplePhase = dot(vWorld.xz, vec2(3.63, 1.23)) - uTime * 1.6;
  ripple += cos(ripplePhase) * vec2(3.63, 1.23) * 0.009 * waterWaveCoverage(fwidth(ripplePhase));
  ripple *= (1.0 - smoothstep(18.0, 160.0, distanceToCamera)) * smoothstep(0.02, 0.5, d);
  vec3 N = normalize(surfaceNormal + vec3(-ripple.x, 0.0, -ripple.y));
  float facing = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = 0.025 + 0.975 * pow(1.0 - facing, 5.0);
  vec3 R = reflect(-V, N);
  vec3 rayDx = dFdx(R), rayDy = dFdy(R);
  float rayFootprintSquared = dot(rayDx, rayDx) + dot(rayDy, rayDy);
  vec3 reflectionUV = waterReflectionProjection(N, vWorld);
  vec2 reflectionDx = dFdx(reflectionUV.xy), reflectionDy = dFdy(reflectionUV.xy);
  float cell = texture2D(uCells, vWorld.xz * 0.12 + ripple * 0.05 + vec2(uTime * 0.0015, -uTime * 0.001)).b;
  float cellFootprint = fwidth(cell);
  // Receding shore wash: narrow cell-edge lace instead of solid white noise blobs.
  float noise = texture2D(uNoise, vWorld.xz * 0.048 + vec2(0.0, uTime * 0.002)).r;
  float phase = vShore * 0.65 - uTime * 0.7 + vWorld.z * 0.025 + noise * 1.4;
  float run = 0.16 + 0.22 * (0.5 + 0.5 * sin(uTime * 0.75 + vWorld.z * 0.035));
  float edge = d - run;
  float wash = (1.0 - waterSmooth(0.06, 0.28, abs(edge), fwidth(edge))) * waterSmooth(-0.015, 0.08, d, depthPixel);
  float breaker = pow(max(sin(phase), 0.0), 7.0) * smoothstep(0.3, 0.9, d) * (1.0 - smoothstep(1.0, 2.8, d));
  breaker *= waterWaveCoverage(fwidth(phase) * 2.646);
  breaker *= 0.35 + 0.65 * smoothstep(-0.015, 0.16, vCrest);
  vec2 churn = vWorld.xz * 0.11 + vec2(sin(vWorld.z * 0.9), cos(vWorld.x * 0.7)) * 0.027;
  float laceCell = texture2D(uCells, churn + vec2(-uTime * 0.004, uTime * 0.003)).b;
  float lace = 1.0 - waterSmooth(0.01, 0.085, laceCell, fwidth(laceCell));
  float pockets = texture2D(uNoise, vWorld.xz * 0.26 + vec2(-uTime * 0.008, uTime * 0.002)).r;
  float breakup = waterSmooth(0.36, 0.68, pockets, fwidth(pockets));
  if (landMask < 0.005) discard;
  // Opaque-depth and reflection reads happen only for surviving water. Their
  // explicit LOD/gradients remain valid across the shoreline's discarded lanes.
  float day = 1.0 - uNight;
  float light = 0.18 + day * (0.5 + min(uSunI, 2.2) * 0.22);
  vec3 shallow = vec3(0.034, 0.192, 0.155);
  vec3 deep = vec3(0.008, 0.047, 0.075);
  vec3 body = mix(shallow, deep, 1.0 - exp(-d * 0.38)) * light;
  body = waterTransmission(body, N, vWorld, d);
  float caustic = (1.0 - waterSmooth(0.015, 0.11, cell, cellFootprint)) * (1.0 - smoothstep(1.0, 4.0, d)) * smoothstep(0.05, 0.45, d);
  body += vec3(0.012, 0.027, 0.022) * caustic * day * uDetail * facing;
  vec3 sky = mix(uHorizon, uTop, pow(clamp(R.y, 0.0, 1.0), 0.5));
  vec3 reflected = waterReflection(sky, reflectionUV, reflectionDx, reflectionDy);
  float sd = max(dot(R, uSunDir), 0.0);
  reflected += uSunColor * (waterHighlight(sd, 112.0, rayFootprintSquared) * 0.95
    + waterHighlight(sd, 18.0, rayFootprintSquared) * 0.035) * uSunI * day;
  vec3 color = mix(body, reflected, clamp(fresnel, 0.025, 0.92));
  float backlight = pow(max(dot(V, -uSunDir), 0.0), 3.0);
  color += shallow * max(vCrest, 0.0) * backlight * day * 0.5;
  float foam = clamp(wash * (0.035 + lace * 0.46) + breaker * (0.04 + lace * 0.29), 0.0, 0.7);
  foam *= breakup * (0.65 + noise * 0.35);
  // A small broken lip where submerged rocks cut the surface, using captured depth.
  foam += waterContactEdge(vWorld, pixelMetres) * smoothstep(0.45, 1.0, d) * (0.08 + lace * 0.28) * breakup;
  foam = min(foam, 0.8);
  vec3 foamColor = vec3(0.72, 0.78, 0.73) * light;
  color = mix(color, foamColor, foam);
  float alpha = uWaterCapture > 0.5 ? landMask : landMask * mix(0.14, 1.0, smoothstep(0.02, 2.5, d));
  alpha = max(alpha, foam * landMask);
  gl_FragColor = vec4(color, alpha);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface SeaHandle {
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  update(dt: number, time: number, reducedMotion?: boolean, reduceEffects?: boolean): void;
  /** Detach Grade-owned borrowed attachments before generic scene cleanup. */
  dispose(): void;
}

export function buildSea(terrain: Terrain, quality: 'low' | 'medium' | 'high' = 'medium'): SeaHandle {
  const noise = sharedNoise();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...makeWaterOpticsUniforms(0.92),
      uTime: { value: 0 }, uDetail: { value: quality === 'low' ? 0 : 1 },
      uTop: SKY.top, uHorizon: SKY.horizon, uSunDir: SKY.sunDir, uSunColor: SKY.sunColor,
      uSunI: SKY.sunI, uNight: SKY.night,
      uNoise: { value: noise.detail }, uCells: { value: noise.cell },
    },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, fog: true, side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(buildSeaGeometry(terrain, quality), mat);
  mesh.userData.waterVisibilityBounds = seaVisibilityBounds(mesh.geometry);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2; mesh.name = 'sea';
  const group = new THREE.Group(); group.add(mesh);
  let clock = 0;
  return {
    group, mesh,
    update(dt, _time, reducedMotion = false, reduceEffects = false) {
      if (!reducedMotion && Number.isFinite(dt) && dt > 0) clock += dt;
      mat.uniforms.uTime!.value = clock;
      mat.uniforms.uDetail!.value = quality === 'low' || reduceEffects ? 0 : 1;
    },
    dispose() { detachWaterOptics(mat); },
  };
}
