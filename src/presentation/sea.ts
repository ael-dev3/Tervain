import * as THREE from 'three';
import type { Terrain } from '../world/terrain';
import { sharedNoise } from './noiseTextures';
import { SKY } from './skyState';
import { buildSeaGeometry } from './seaGeometry';
import { detachWaterOptics, makeWaterOpticsUniforms, WATER_OPTICS_GLSL } from './waterOptics';

// Keep the CPU visibility envelope and the vertex shader's actual waves together.
const WAVES = [[1, 0.18, 23, 0.24], [0.92, -0.39, 11, 0.11], [0.68, 0.73, 6, 0.045], [-0.28, 0.96, 3.8, 0.018]] as const;
const WAVE_HARMONIC = 0.16;
const MAX_WAVE_HEIGHT = WAVES.reduce((sum, wave) => sum + wave[3], 0) * (1 + WAVE_HARMONIC);
const LAND_MASK_START = -0.035;

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
      const t = THREE.MathUtils.clamp((d - 0.04) / (2 - 0.04), 0, 1);
      ids[corner] = id;
      upper[corner] = d + MAX_WAVE_HEIGHT * t * t * (3 - 2 * t) - LAND_MASK_START;
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
varying float vShore;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;
#include <fog_pars_vertex>
void wave(vec2 dir, float wavelength, float amplitude, vec2 xz, inout float height, inout vec2 slope) {
  float k = 6.2831853 / wavelength;
  float phase = dot(dir, xz) * k - sqrt(9.81 * k) * uTime * 0.65;
  height += amplitude * (sin(phase) + ${WAVE_HARMONIC.toFixed(2)} * sin(phase * 2.0));
  slope += amplitude * k * (cos(phase) + 0.32 * cos(phase * 2.0)) * dir;
}
void main() {
  vec3 p = position;
  float h = 0.0;
  vec2 slope = vec2(0.0);
  ${WAVES.map(([x, z, length, amplitude]) => `wave(normalize(vec2(${x.toFixed(3)}, ${z.toFixed(3)})), ${length.toFixed(3)}, ${amplitude.toFixed(3)}, p.xz, h, slope);`).join('\n  ')}
  float shoreDamping = smoothstep(0.04, 2.0, aDepth);
  p.y += h * shoreDamping;
  vNormal = normalize(vec3(-slope.x * shoreDamping, 1.0, -slope.y * shoreDamping));
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
varying float vShore;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;
#include <fog_pars_fragment>
${WATER_OPTICS_GLSL}
void main() {
  float d = max(vDepth, 0.0);
  float landMask = smoothstep(${LAND_MASK_START.toFixed(3)}, 0.065, vDepth);
  if (landMask < 0.005) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  float distanceToCamera = length(cameraPosition - vWorld);
  vec2 uv = vWorld.xz * 0.075 + vec2(-uTime * 0.008, uTime * 0.005);
  vec2 uv2 = vWorld.xz * 0.24 + vec2(uTime * 0.012, -uTime * 0.009);
  vec2 ripple = (texture2D(uNoise, uv).gb - 0.5) * 0.65;
  ripple += (texture2D(uNoise, uv2).gb - 0.5) * 0.4 * uDetail;
  ripple *= (1.0 - smoothstep(18.0, 220.0, distanceToCamera)) * smoothstep(0.02, 0.5, d);
  vec3 N = normalize(vNormal + vec3(-ripple.x * 0.65, 0.0, -ripple.y * 0.65));
  float facing = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = 0.025 + 0.975 * pow(1.0 - facing, 5.0);
  vec3 R = reflect(-V, N);
  float day = 1.0 - uNight;
  float light = 0.18 + day * (0.5 + min(uSunI, 2.2) * 0.22);
  vec3 shallow = vec3(0.045, 0.235, 0.215);
  vec3 deep = vec3(0.012, 0.07, 0.105);
  vec3 body = mix(shallow, deep, 1.0 - exp(-d * 0.22)) * light;
  body = waterTransmission(body, N, vWorld, d, 1.25);
  float cell = texture2D(uCells, vWorld.xz * 0.12 + ripple * 0.05 + vec2(uTime * 0.0015, -uTime * 0.001)).b;
  float caustic = (1.0 - smoothstep(0.015, 0.11, cell)) * (1.0 - smoothstep(1.0, 4.0, d)) * smoothstep(0.05, 0.45, d);
  body += vec3(0.012, 0.027, 0.022) * caustic * day * uDetail * facing;
  vec3 sky = mix(uHorizon, uTop, pow(clamp(R.y, 0.0, 1.0), 0.5));
  vec3 reflected = waterReflection(sky, N, vWorld);
  float sd = max(dot(R, uSunDir), 0.0);
  reflected += uSunColor * (pow(sd, 96.0) * 1.2 + pow(sd, 18.0) * 0.04) * uSunI * day;
  vec3 color = mix(body, reflected, clamp(fresnel, 0.025, 0.92));
  float backlight = pow(max(dot(V, -uSunDir), 0.0), 3.0);
  color += shallow * max(vCrest, 0.0) * backlight * day * 0.5;
  // Receding shore wash: narrow cell-edge lace instead of solid white noise blobs.
  float noise = texture2D(uNoise, vWorld.xz * 0.048 + vec2(0.0, uTime * 0.002)).r;
  float phase = vShore * 0.65 - uTime * 0.7 + vWorld.z * 0.025 + noise * 1.4;
  float run = 0.16 + 0.22 * (0.5 + 0.5 * sin(uTime * 0.75 + vWorld.z * 0.035));
  float edge = d - run;
  float wash = (1.0 - smoothstep(0.06, 0.28, abs(edge))) * smoothstep(-0.015, 0.08, d);
  float breaker = pow(max(sin(phase), 0.0), 7.0) * smoothstep(0.3, 0.9, d) * (1.0 - smoothstep(1.0, 2.8, d));
  vec2 churn = vWorld.xz * 0.11 + vec2(sin(vWorld.z * 0.9), cos(vWorld.x * 0.7)) * 0.027;
  float laceCell = texture2D(uCells, churn + vec2(-uTime * 0.004, uTime * 0.003)).b;
  float lace = 1.0 - smoothstep(0.01, 0.085, laceCell);
  float pockets = texture2D(uNoise, vWorld.xz * 0.26 + vec2(-uTime * 0.008, uTime * 0.002)).r;
  float breakup = smoothstep(0.36, 0.68, pockets);
  float foam = clamp(wash * (0.035 + lace * 0.46) + breaker * (0.04 + lace * 0.29), 0.0, 0.7);
  foam *= breakup * (0.65 + noise * 0.35);
  // A small broken lip where submerged rocks cut the surface, using captured depth.
  foam += waterContactEdge(vWorld) * smoothstep(0.45, 1.0, d) * (0.08 + lace * 0.28) * breakup;
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
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...makeWaterOpticsUniforms(),
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
