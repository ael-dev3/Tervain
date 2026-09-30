import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { sampleMenuScore, type MenuScoreSample } from './menuScoreFeatures';

export interface MenuAwakening {
  opening: number;
  reveal: number;
  returning: number;
}

const TAU = Math.PI * 2;
const TRAIL_SEGMENTS = 6;
const TRAIL_SECONDS = 1.5;
const unit = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const durationOf = (duration: number) => Number.isFinite(duration) && duration > 0 ? duration : 214.2;
const clockOf = (time: number, duration: number) => Number.isFinite(time) ? Math.max(0, Math.min(duration, time)) : 0;
const smooth = (start: number, end: number, value: number) => {
  const t = unit((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

/** Original source-time choreography, separate from the score's measured spectral features. */
export function sampleMenuAwakening(time: number, duration = 214.2): MenuAwakening {
  const d = durationOf(duration);
  const t = clockOf(time, d);
  return {
    opening: smooth(30, 39, t) * (1 - smooth(d - 6, d - 0.5, t)),
    reveal: smooth(31, 42, t) * (1 - smooth(d - 5, d - 2.5, t)),
    returning: smooth(d - 10, d - 4, t),
  };
}

export interface MenuWisps {
  group: THREE.Group;
  stats: { wisps: number; triangles: number; meshes: number };
  /** Absolute native song time. Repeating a frozen time reproduces every point and pulse exactly. */
  update(time: number, gain: number, duration: number): void;
  dispose(): void;
}

const CORE_VERT = /* glsl */ `
attribute vec4 aHead;
attribute vec3 aTint;
attribute vec2 aLife;
varying vec3 vN;
varying vec3 vTint;
varying vec2 vLife;
void main() {
  vN = normalize(normalMatrix * normal);
  vTint = aTint;
  vLife = aLife;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(aHead.xyz + position * aHead.w, 1.0);
}`;

const CORE_FRAG = /* glsl */ `
varying vec3 vN;
varying vec3 vTint;
varying vec2 vLife;
void main() {
  vec3 n = normalize(vN);
  float face = max(dot(n, normalize(vec3(-0.25, 0.5, 1.0))), 0.0);
  float pearl = 0.74 + 0.26 * face;
  vec3 col = mix(vTint, vec3(0.94, 0.98, 0.96), pearl);
  col *= (0.86 + 0.4 * face) * (0.82 + 0.3 * vLife.y);
  gl_FragColor = vec4(col, vLife.x);
}`;

const HALO_VERT = /* glsl */ `
attribute vec4 aHead;
attribute vec3 aTint;
attribute vec2 aLife;
varying vec2 vUv;
varying vec3 vTint;
varying vec2 vLife;
void main() {
  vUv = uv;
  vTint = aTint;
  vLife = aLife;
  vec4 centre = modelViewMatrix * vec4(aHead.xyz, 1.0);
  centre.xy += position.xy * aHead.w * 6.0;
  gl_Position = projectionMatrix * centre;
}`;

const HALO_FRAG = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
varying vec2 vLife;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  float halo = exp(-r2 * 5.0) * (1.0 - smoothstep(0.6, 1.0, r2));
  gl_FragColor = vec4(vTint * (0.72 + vLife.y * 0.55), halo * vLife.x * 0.58);
}`;

const TRAIL_VERT = /* glsl */ `
attribute vec4 aHead;
attribute vec3 aTint;
attribute vec2 aLife;
attribute vec4 aTrail0;
attribute vec4 aTrail1;
attribute vec4 aTrail2;
attribute vec4 aTrail3;
attribute vec4 aTrail4;
attribute vec4 aTrail5;
attribute vec4 aTrail6;
varying vec2 vUv;
varying vec3 vTint;
varying float vLife;
void main() {
  float k = uv.y * 6.0;
  vec4 p;
  vec3 before;
  vec3 after;
  if (k < 0.5) { p = aTrail0; before = aTrail0.xyz; after = aTrail1.xyz; }
  else if (k < 1.5) { p = aTrail1; before = aTrail0.xyz; after = aTrail2.xyz; }
  else if (k < 2.5) { p = aTrail2; before = aTrail1.xyz; after = aTrail3.xyz; }
  else if (k < 3.5) { p = aTrail3; before = aTrail2.xyz; after = aTrail4.xyz; }
  else if (k < 4.5) { p = aTrail4; before = aTrail3.xyz; after = aTrail5.xyz; }
  else if (k < 5.5) { p = aTrail5; before = aTrail4.xyz; after = aTrail6.xyz; }
  else { p = aTrail6; before = aTrail5.xyz; after = aTrail6.xyz; }
  vec4 centre = modelViewMatrix * vec4(p.xyz, 1.0);
  vec3 tangent = mat3(modelViewMatrix) * (after - before);
  vec2 side = vec2(-tangent.y, tangent.x);
  side = length(side) > 0.0001 ? normalize(side) : vec2(1.0, 0.0);
  float width = aHead.w * 0.6 * (1.0 - uv.y * 0.78);
  centre.xy += side * position.x * width;
  vUv = uv;
  vTint = aTint;
  vLife = p.w * (0.7 + aLife.y * 0.25);
  gl_Position = projectionMatrix * centre;
}`;

const TRAIL_FRAG = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
varying float vLife;
void main() {
  float x = vUv.x * 2.0 - 1.0;
  float edge = exp(-x * x * 3.0) * (1.0 - smoothstep(0.72, 1.0, abs(x)));
  float tail = pow(max(0.0, 1.0 - vUv.y), 1.5);
  gl_FragColor = vec4(mix(vTint, vec3(0.8, 0.91, 0.88), 0.16), edge * tail * vLife * 0.58);
}`;

function instanceGeometry(base: THREE.BufferGeometry, count: number): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(base.index);
  for (const [name, attribute] of Object.entries(base.attributes)) geometry.setAttribute(name, attribute);
  geometry.instanceCount = count;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 6, 0), 17);
  base.dispose();
  return geometry;
}

/**
 * Native, modestly faceted pearl spirits and soft connected comet tails. All particles share three draws; their
 * trajectories and historical trail points are functions of the source clock, not previous rendered frames.
 * The colour family is stable per spirit. Measured bands warm/cool its light, gently change its radius and pulse.
 */
export function buildMenuWisps(options: {
  doorAt: THREE.Vector3;
  doorFacing: number;
  treeCentre: THREE.Vector3;
  quality: 'low' | 'medium' | 'high';
}): MenuWisps {
  const count = options.quality === 'low' ? 16 : options.quality === 'medium' ? 24 : 30;
  const group = new THREE.Group();
  group.name = 'Menu_Hermitage_Wisps';
  group.position.copy(options.treeCentre);
  group.visible = false;
  const facing = Number.isFinite(options.doorFacing) ? options.doorFacing : 0;
  const nx = Math.sin(facing);
  const nz = Math.cos(facing);
  const door = options.doorAt.clone().sub(options.treeCentre);
  const frontAngle = Math.atan2(door.x + nx * 0.5 + 1.2, door.z + nz * 0.5);
  const rng = mulberry32(930517);
  const birth = new Float64Array(count);
  const birthMotion = new Float64Array(count);
  const returnAngle = new Float64Array(count);
  const variation = new Float64Array(count);
  const phase = new Float64Array(count);
  const baseColours = [0x70b8ff, 0x4edc9e, 0x4de8de, 0xb68eff, 0xffc06f, 0xff8cab].map((hex) => new THREE.Color(hex));
  const heads = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const tint = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const life = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2).setUsage(THREE.DynamicDrawUsage);
  const trail = Array.from({ length: TRAIL_SEGMENTS + 1 }, () =>
    new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage));
  const samples: MenuScoreSample[] = Array.from({ length: TRAIL_SEGMENTS + 1 }, () => sampleMenuScore(0));
  const buildSample = sampleMenuScore(0);
  const returnSample = sampleMenuScore(0);
  const scratch = new Float64Array(4);
  for (let i = 0; i < count; i++) {
    birth[i] = 31.2 + i * 0.29 + rng() * 0.04;
    variation[i] = rng();
    phase[i] = rng() * TAU;
    sampleMenuScore(birth[i]!, buildSample);
    birthMotion[i] = buildSample.motion;
  }

  const core = instanceGeometry(new THREE.IcosahedronGeometry(1, 0), count);
  const halo = instanceGeometry(new THREE.PlaneGeometry(2, 2), count);
  const strip = new THREE.PlaneGeometry(2, 1, 1, TRAIL_SEGMENTS);
  // Tail vertices index a historical centreline point rather than a flat plane in world space.
  for (let i = 0; i < strip.attributes.position!.count; i++) strip.attributes.position!.setY(i, 0);
  const tail = instanceGeometry(strip, count);
  for (const geometry of [core, halo, tail]) {
    geometry.setAttribute('aHead', heads);
    geometry.setAttribute('aTint', tint);
    geometry.setAttribute('aLife', life);
  }
  for (let i = 0; i < trail.length; i++) tail.setAttribute(`aTrail${i}`, trail[i]!);

  const coreMaterial = new THREE.ShaderMaterial({
    vertexShader: CORE_VERT, fragmentShader: CORE_FRAG, transparent: true, depthTest: true, depthWrite: false,
    toneMapped: false,
  });
  const haloMaterial = new THREE.ShaderMaterial({
    vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, transparent: true, depthTest: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false,
  });
  const tailMaterial = new THREE.ShaderMaterial({
    vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG, transparent: true, depthTest: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false,
  });
  for (const [name, geometry, material, order] of [
    ['Menu_Wisp_Pearl_Cores', core, coreMaterial, 5],
    ['Menu_Wisp_Radial_Halos', halo, haloMaterial, 3],
    ['Menu_Wisp_Connected_Tails', tail, tailMaterial, 4],
  ] as const) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.renderOrder = order;
    mesh.castShadow = mesh.receiveShadow = false;
    group.add(mesh);
  }

  let cachedDuration = -1;
  let previousTime = -1;
  let previousGain = -1;
  let previousDuration = -1;
  let disposed = false;
  /** Fill one pose in an existing array. Angles return around the bark before the last radial approach. */
  const pose = (i: number, t: number, d: number, score: MenuScoreSample) => {
    const v = variation[i]!;
    const age = Math.max(0, t - birth[i]!);
    const emerge = smooth(0, 2.5, age);
    const returning = smooth(d - 10 - v * 0.35, d - 4 - v * 0.15, t);
    const direction = i % 2 ? -1 : 1;
    // A few spirits always process along the visible front-right bark and roots.
    // Others gradually separate into full orbits instead of sharing two birth-time clusters.
    const frontProcession = i % 5 < 2;
    const angle0 = frontProcession
      ? 1.24 + Math.sin(score.motion * 0.105 + phase[i]!) * 0.28
      : frontAngle + direction * (score.motion - birthMotion[i]!) * (0.13 + v * 0.025)
        + (phase[i]! - Math.PI) * smooth(2.5, 14, age);
    const angle = angle0 + (returnAngle[i]! - angle0) * smooth(0, 0.8, returning);
    const radiusX = 4.2 + v * 0.45;
    const radiusZ = 3.8 + v * 0.65 + (i % 3) * 0.4;
    const rise = smooth(0, 9, age);
    const height = frontProcession ? 1.35 + (i % 4) * 0.94 * rise : 1.55 + (i % 3) * 3.7 * rise;
    const orbitX = -1.2 + Math.sin(angle) * radiusX;
    const orbitZ = Math.cos(angle) * radiusZ;
    const orbitY = height + Math.sin(score.motion * 0.19 + phase[i]!) * (frontProcession ? 0.2 : 0.26 + (i % 3) * 0.28);
    const across = (v - 0.5) * 0.14;
    const portalX = door.x + nx * 0.13 + nz * across;
    const portalZ = door.z + nz * 0.13 - nx * across;
    const portalY = door.y + 0.86 + v * 0.12;
    const radialReturn = smooth(0.7, 1, returning);
    scratch[0] = portalX + (orbitX - portalX) * emerge * (1 - radialReturn);
    scratch[1] = portalY + (orbitY - portalY) * emerge * (1 - returning);
    scratch[2] = portalZ + (orbitZ - portalZ) * emerge * (1 - radialReturn);
    scratch[3] = smooth(0, 1.1, age) * (1 - smooth(d - 5, d - 2.5, t));
  };

  return {
    group,
    stats: { wisps: count, triangles: count * (20 + 2 + TRAIL_SEGMENTS * 2), meshes: 3 },
    update(time, gain, duration) {
      if (disposed) return;
      const d = durationOf(duration);
      const t = clockOf(time, d);
      const g = unit(gain);
      if (t === previousTime && g === previousGain && d === previousDuration) return;
      previousTime = t; previousGain = g; previousDuration = d;
      group.visible = g > 0 && t > 31.2 && t < d - 2.5;
      if (!group.visible) return;
      if (cachedDuration !== d) {
        sampleMenuScore(Math.max(0, d - 10), returnSample);
        for (let i = 0; i < count; i++) {
          const age = Math.max(0, d - 10 - birth[i]!);
          const angle = i % 5 < 2
            ? 1.24 + Math.sin(returnSample.motion * 0.105 + phase[i]!) * 0.28 - frontAngle
            : (i % 2 ? -1 : 1) * (returnSample.motion - birthMotion[i]!) * (0.13 + variation[i]! * 0.025)
              + (phase[i]! - Math.PI) * smooth(2.5, 14, age);
          returnAngle[i] = frontAngle + Math.round(angle / TAU) * TAU;
        }
        cachedDuration = d;
      }
      for (let k = 0; k <= TRAIL_SEGMENTS; k++) sampleMenuScore(Math.max(0, t - k * TRAIL_SECONDS / TRAIL_SEGMENTS), samples[k]!);
      const score = samples[0]!;
      const perceptualGain = Math.sqrt(g);
      for (let i = 0; i < count; i++) {
        pose(i, t, d, score);
        const family = i % 6;
        const band = family === 1 || family === 4 ? score.bass : family === 0 || family === 2 ? score.mid : score.treble;
        const radius = 0.13 + variation[i]! * 0.012 + score.energy * 0.018 + band * 0.007;
        heads.setXYZW(i, scratch[0]!, scratch[1]!, scratch[2]!, radius);
        const colour = baseColours[family]!;
        const warmth = 0.06 + score.mid * 0.08;
        tint.setXYZ(i, colour.r * (0.8 + band * 0.2) + warmth, colour.g * (0.8 + band * 0.2) + warmth, colour.b * (0.8 + band * 0.2) + warmth);
        life.setXY(i, scratch[3]! * perceptualGain, 0.65 + score.energy * 0.6 + band * 0.3 + score.onset * 0.07);
        for (let k = 0; k <= TRAIL_SEGMENTS; k++) {
          pose(i, Math.max(0, t - k * TRAIL_SECONDS / TRAIL_SEGMENTS), d, samples[k]!);
          trail[k]!.setXYZW(i, scratch[0]!, scratch[1]!, scratch[2]!, scratch[3]! * perceptualGain);
        }
      }
      heads.needsUpdate = tint.needsUpdate = life.needsUpdate = true;
      for (let k = 0; k < trail.length; k++) trail[k]!.needsUpdate = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.visible = false;
      group.clear();
      core.dispose(); halo.dispose(); tail.dispose();
      coreMaterial.dispose(); haloMaterial.dispose(); tailMaterial.dispose();
    },
  };
}
