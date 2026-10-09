import * as THREE from 'three';
import { BUILDINGS, LIGHTHOUSE } from '../world/layout';
import { coastX } from '../world/coast';
import { mulberry32 } from '../world/noise';
import { groundOf } from './buildings';
import type { BuildContext, FrameContext, SceneModule } from './context';
import type { AssetNeed } from './assets/library';
import { RENDER_PX, SKY } from './skyState';

/** Assets this module wants loaded before the world is built. */
export const NEEDS: AssetNeed[] = [];

/**
 * Ambient life: gulls wheeling over the strand and the lighthouse, and chimney smoke over the settled buildings. Both are
 * drawn entirely on the GPU from a few per-instance numbers, so they cost two draw calls and no per-frame CPU work beyond
 * one uniform. Presentation only.
 */

const GULL_VERT = /* glsl */ `
attribute vec4 aPath;     // centre x, centre z, radius, angular speed (rad/s)
attribute vec4 aParams;   // height, phase, size, flap rate
attribute float aWing;    // 0 body, +1 / -1 wing tips (signed side)
uniform float uTime;
varying float vShade;
#include <fog_pars_vertex>
void main() {
  float a = aParams.y + uTime * aPath.w;
  vec2 c = aPath.xy + vec2(cos(a), sin(a)) * aPath.z;
  float bob = sin(uTime * 0.7 + aParams.y * 3.0) * 1.6;
  vec3 tang = normalize(vec3(-sin(a), 0.0, cos(a)) * sign(aPath.w));
  // Flight frame: forward = tangent of the circle, up = world up banked toward the centre of the turn.
  vec3 fwd = tang;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  float bank = 0.35 * sign(aPath.w);
  vec3 up = normalize(vec3(0.0, 1.0, 0.0) + right * bank * -1.0);
  float flap = sin(uTime * aParams.w + aParams.y * 7.0);
  vec3 p = position;
  // Wing tips beat up and down; the wing root moves less.
  p.y += aWing * abs(p.x) * flap * 0.7 - abs(p.x) * 0.1 + abs(p.x) * 0.12;
  vec3 world = vec3(c.x, aParams.x + bob, c.y) + (right * p.x + up * p.y + fwd * p.z) * aParams.z;
  vShade = 0.72 + 0.28 * (0.5 + 0.5 * dot(up, normalize(vec3(0.3, 1.0, 0.2)))) + aWing * flap * 0.06;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const GULL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uDay;
varying float vShade;
#include <fog_pars_fragment>
void main() {
  if (uDay < 0.02) discard;
  gl_FragColor = vec4(uColor * vShade * uDay, 1.0);
  #include <fog_fragment>
}`;

const SMOKE_VERT = /* glsl */ `
attribute vec3 aBase;
attribute vec2 aSeed;     // phase 0..1, size
uniform float uTime;
uniform float uStrength;
uniform vec2 uWind;
uniform float uPx;
varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  float t = fract(uTime * 0.075 + aSeed.x);
  float rise = t * 11.0;
  vec3 p = aBase + vec3(uWind.x * t * t * 26.0 + sin(t * 9.0 + aSeed.x * 40.0) * 0.5 * t, rise, uWind.y * t * t * 26.0 + cos(t * 7.0 + aSeed.x * 31.0) * 0.5 * t);
  vAlpha = smoothstep(0.0, 0.08, t) * pow(1.0 - t, 1.6) * uStrength;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = (1.5 + aSeed.y * (5.0 + t * 24.0)) * uPx * (90.0 / max(8.0, -mvPosition.z));
  #include <fog_vertex>
}`;

const SMOKE_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float soft = smoothstep(1.0, 0.0, r);
  float a = vAlpha * soft * soft * 0.55;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  #include <fog_fragment>
}`;

function gullGeometry(): THREE.BufferGeometry {
  // A gull from above: a spindle body and two swept wings, each wing a pair of triangles, tips flagged for flapping.
  const pos: number[] = [];
  const wing: number[] = [];
  const idx: number[] = [];
  const v = (x: number, y: number, z: number, w: number) => {
    pos.push(x, y, z);
    wing.push(w);
    return pos.length / 3 - 1;
  };
  const nose = v(0, 0, 0.55, 0);
  const tail = v(0, 0, -0.5, 0);
  const l = v(-0.09, 0.02, 0.05, 0);
  const r = v(0.09, 0.02, 0.05, 0);
  const top = v(0, 0.08, 0.05, 0);
  const bot = v(0, -0.06, 0.02, 0);
  idx.push(nose, l, top, nose, top, r, nose, bot, l, nose, r, bot, tail, top, l, tail, r, top, tail, l, bot, tail, bot, r);
  for (const s of [-1, 1]) {
    const root0 = v(s * 0.08, 0.02, 0.24, 0);
    const root1 = v(s * 0.08, 0.02, -0.14, 0);
    const mid = v(s * 0.75, 0.0, 0.02, s);
    const tip = v(s * 1.42, -0.02, -0.28, s);
    const tipF = v(s * 1.25, -0.01, 0.12, s);
    if (s > 0) idx.push(root0, root1, mid, root0, mid, tipF, mid, tip, tipF, root1, tip, mid);
    else idx.push(root0, mid, root1, root0, tipF, mid, mid, tipF, tip, root1, mid, tip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 1));
  g.setIndex(idx);
  return g;
}

export function buildWildlife(ctx: BuildContext): SceneModule {
  const { terrain, quality } = ctx;
  const group = new THREE.Group();
  group.name = 'wildlife';
  const rnd = mulberry32(31337);

  /* ---- Gulls ---- */
  const nGulls = quality === 'low' ? 6 : quality === 'medium' ? 10 : 16;
  const geo = gullGeometry();
  const path = new Float32Array(nGulls * 4);
  const params = new Float32Array(nGulls * 4);
  for (let i = 0; i < nGulls; i++) {
    const zone = i % 4;
    // Strand, jetty, headland, open sea.
    const cz = zone === 0 ? 30 + rnd() * 30 : zone === 1 ? 60 + rnd() * 30 : zone === 2 ? LIGHTHOUSE.z + (rnd() - 0.5) * 20 : 10 + rnd() * 100;
    const cx = zone === 2 ? LIGHTHOUSE.x + 6 : coastX(cz) - 25 - rnd() * 30;
    path[i * 4] = cx;
    path[i * 4 + 1] = cz;
    path[i * 4 + 2] = zone === 2 ? 14 + rnd() * 22 : 28 + rnd() * 60;
    path[i * 4 + 3] = (rnd() < 0.5 ? -1 : 1) * (0.06 + rnd() * 0.08);
    params[i * 4] = (zone === 2 ? 20 : 12) + rnd() * 22;
    params[i * 4 + 1] = rnd() * Math.PI * 2;
    params[i * 4 + 2] = 0.62 + rnd() * 0.22;
    params[i * 4 + 3] = 7 + rnd() * 3;
  }
  const igeo = new THREE.InstancedBufferGeometry();
  igeo.index = geo.index;
  igeo.setAttribute('position', geo.attributes.position!);
  igeo.setAttribute('aWing', geo.attributes.aWing!);
  igeo.setAttribute('aPath', new THREE.InstancedBufferAttribute(path, 4));
  igeo.setAttribute('aParams', new THREE.InstancedBufferAttribute(params, 4));
  igeo.instanceCount = nGulls;
  const gullMat = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: { value: 0 }, uColor: { value: new THREE.Color(0.62, 0.62, 0.6) }, uDay: { value: 1 } },
    vertexShader: GULL_VERT,
    fragmentShader: GULL_FRAG,
    side: THREE.DoubleSide,
    fog: true,
  });
  const gulls = new THREE.Mesh(igeo, gullMat);
  gulls.frustumCulled = false;
  group.add(gulls);

  /* ---- Chimney smoke ---- */
  const chimneys: THREE.Vector3[] = [];
  for (const b of BUILDINGS) {
    if (b.kind === 'lodge' || b.kind === 'office' || b.kind === 'bunks' || b.kind === 'store' || b.kind === 'archive' || b.kind === 'shrine' || b.kind === 'hut' || b.kind === 'mill') continue;
    const { avg } = groundOf(terrain, b);
    const lx = b.w * 0.28;
    const lz = -b.d * 0.12;
    const c = Math.cos(b.yaw);
    const s = Math.sin(b.yaw);
    chimneys.push(new THREE.Vector3(b.x + lx * c + lz * s, avg + b.h + 0.4 + b.d * 0.36 + 1.8, b.z - lx * s + lz * c));
  }
  const perChimney = quality === 'low' ? 10 : 22;
  const base = new Float32Array(chimneys.length * perChimney * 3);
  const seed = new Float32Array(chimneys.length * perChimney * 2);
  chimneys.forEach((p, ci) => {
    for (let k = 0; k < perChimney; k++) {
      const o = ci * perChimney + k;
      base[o * 3] = p.x + (rnd() - 0.5) * 0.25;
      base[o * 3 + 1] = p.y;
      base[o * 3 + 2] = p.z + (rnd() - 0.5) * 0.25;
      seed[o * 2] = (k + rnd() * 0.6) / perChimney + ci * 0.137;
      seed[o * 2 + 1] = 0.6 + rnd() * 0.8;
    }
  });
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  sgeo.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
  sgeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: { value: 0 }, uStrength: { value: 0.5 }, uWind: { value: new THREE.Vector2(0.62, 0.5) }, uColor: { value: new THREE.Color(0.36, 0.34, 0.31) }, uPx: { value: 1 } },
    vertexShader: SMOKE_VERT,
    fragmentShader: SMOKE_FRAG,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const smoke = new THREE.Points(sgeo, smokeMat);
  smoke.frustumCulled = false;
  group.add(smoke);

  return {
    group,
    update(_dt: number, f: FrameContext) {
      gullMat.uniforms.uTime!.value = f.time;
      gullMat.uniforms.uDay!.value = 1 - Math.min(1, f.nightness * 1.6);
      gullMat.uniforms.uColor!.value.setRGB(0.7 * (0.5 + 0.5 * SKY.sunI.value / 2), 0.7 * (0.5 + 0.5 * SKY.sunI.value / 2), 0.68 * (0.5 + 0.5 * SKY.sunI.value / 2));
      smokeMat.uniforms.uTime!.value = f.time;
      // Fires burn brighter in the cold of the morning and evening and through the night, and are banked at midday.
      const h = f.hour;
      const cold = h < 9 ? 1 : h > 17 ? 1 : 0.35;
      smokeMat.uniforms.uStrength!.value = f.reducedMotion ? 0.3 : 0.45 + 0.45 * cold;
      smokeMat.uniforms.uPx!.value = RENDER_PX.value;
      smokeMat.uniforms.uColor!.value.setRGB(0.3 + 0.12 * (1 - f.nightness), 0.28 + 0.12 * (1 - f.nightness), 0.26 + 0.12 * (1 - f.nightness));
    },
    stats: () => ({ gulls: nGulls, chimneys: chimneys.length }),
    dispose() {
      geo.dispose();
      igeo.dispose();
      sgeo.dispose();
      gullMat.dispose();
      smokeMat.dispose();
    },
  };
}
