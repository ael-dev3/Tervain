import * as THREE from 'three';
import { fbm, valueNoise } from '../../world/noise';
import type { TreeDoorFace } from './menuTree';

/**
 * The hollow behind the hermit's door (0.0.7, A32): a chamber adzed into the heartwood of the ancient tree, seen through
 * the open door. A short tunnel the size of the doorway opens into a rounded cell about 1.5 m across and 2.2 m high,
 * with roots hanging from its roof, others coiling over its floor, and pale fungi on the walls. At the back a burl in the
 * old wood holds the grove's heart: veins of light that brighten with the score's low notes and flare on its accents,
 * and light the cell from within. The spirits light it too while they are inside. Nothing here is a scene light: the
 * cell lights itself in its own shader, so no light leaks through the bole onto the bark outside.
 *
 * Built in the door frame (x across the face, y up from its foot, z out of it) and placed with the tree, inside the
 * boxes the tree carves for it (TREE_HOLLOW). Original procedural geometry; no texture.
 */

type V3 = [number, number, number];

export interface MenuHollow {
  mesh: THREE.Mesh;
  stats: { triangles: number };
  /** Door opening 0..1, the heart's power (music), the wisp lights' view-space data and the song time. */
  update(state: { opening: number; heart: number; warm: number; time: number }): void;
  /** View-space heart position needs the camera and the tree's world matrix; call once both are known. */
  setView(camera: THREE.Camera, tree: THREE.Object3D): void;
  dispose(): void;
}

/** Wall stations from the face inward: depth z, half-width, floor and roof heights, squareness, centre x, roughness. */
const STATIONS: readonly [number, number, number, number, number, number, number][] = [
  [-0.06, 0.425, 0.0, 1.71, 10, 0, 0],
  [-0.2, 0.435, -0.01, 1.73, 9, 0, 0.012],
  [-0.34, 0.47, -0.02, 1.78, 7, 0, 0.02],
  [-0.5, 0.6, -0.03, 1.97, 4, -0.02, 0.032],
  [-0.75, 0.7, -0.04, 2.14, 3, -0.04, 0.04],
  [-1.05, 0.73, -0.04, 2.22, 2.8, -0.05, 0.045],
  [-1.35, 0.67, -0.03, 2.14, 2.8, -0.05, 0.045],
  [-1.53, 0.53, -0.02, 1.94, 2.6, -0.04, 0.04],
  [-1.64, 0.33, 0.06, 1.62, 2.4, -0.03, 0.03],
];
const BACK: V3 = [-0.06, 0.92, -1.69];
/** Where the heart's light sits: low on the back wall, on the side the doorway shows. */
export const HOLLOW_HEART: V3 = [-0.22, 0.78, -1.42];
const RING = 36;

const VERT = /* glsl */ `
attribute vec3 aLocal;
attribute float aGlow;
varying vec3 vLocal;
varying vec3 vNormalV;
varying vec3 vViewPosition;
varying float vGlow;
varying vec3 vColor;
#include <fog_pars_vertex>
void main() {
  vLocal = aLocal;
  vGlow = aGlow;
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

function fragment(lights: number) {
  return /* glsl */ `
uniform vec3 uHeartView;
uniform vec3 uHeartColour;
uniform float uHeart;
uniform float uOpen;
uniform float uWarm;
uniform float uTime;
${lights > 0 ? `uniform vec4 uWispLights[${lights}];\nuniform vec4 uWispColours[${lights}];` : ''}
varying vec3 vLocal;
varying vec3 vNormalV;
varying vec3 vViewPosition;
varying float vGlow;
varying vec3 vColor;
#include <common>
#include <fog_pars_fragment>
float tvHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tvNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(tvHash(i), tvHash(i + vec2(1.0, 0.0)), f.x), mix(tvHash(i + vec2(0.0, 1.0)), tvHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec3 n = normalize(vNormalV);
  vec3 p = -vViewPosition;
  // Heartwood: warm and dark, long vertical fibres, darker growth bands round the burl at the back.
  float fibre = tvNoise(vec2(vLocal.x * 7.0 + vLocal.z * 5.0, vLocal.y * 1.2)) * 0.6 + tvNoise(vec2(vLocal.x * 31.0 + vLocal.z * 23.0, vLocal.y * 3.0)) * 0.4;
  vec2 hb = vLocal.xy - vec2(${HOLLOW_HEART[0].toFixed(3)}, ${(HOLLOW_HEART[1] + 0.25).toFixed(3)});
  float rings = 0.5 + 0.5 * sin(length(hb * vec2(1.0, 0.7)) * 34.0 + tvNoise(vLocal.xy * 4.0) * 3.0);
  vec3 albedo = vColor * mix(vec3(0.26, 0.15, 0.08), vec3(0.46, 0.3, 0.17), fibre) * mix(0.8, 1.0, rings);
  // Light: a faint warm spill of dusk and lantern through the doorway, the heart, and the spirits.
  float entrance = (1.0 - smoothstep(0.0, 1.0, -vLocal.z)) * uOpen;
  vec3 light = vec3(0.018, 0.016, 0.014) + vec3(1.35, 0.82, 0.42) * entrance * entrance * (0.35 + 0.65 * max(0.0, n.y * 0.3 + 0.7)) * uWarm;
  vec3 toH = uHeartView - p;
  float hd2 = dot(toH, toH);
  float hWrap = clamp((dot(n, toH * inversesqrt(max(hd2, 1e-4))) + 0.25) / 1.25, 0.0, 1.0);
  light += uHeartColour * (uHeart * 0.8 * hWrap / (1.0 + hd2 * 6.0));
${lights > 0 ? `  for (int i = 0; i < ${lights}; i++) {
    vec3 toL = uWispLights[i].xyz - p;
    float d2 = dot(toL, toL);
    float r = uWispLights[i].w;
    float att = clamp(1.0 - d2 / (r * r), 0.0, 1.0);
    att = att * att / (1.0 + d2 * 2.2);
    float wrap = clamp((dot(n, toL * inversesqrt(max(d2, 1e-4))) + 0.35) / 1.35, 0.0, 1.0);
    light += uWispColours[i].rgb * (att * wrap * 0.28);
  }` : ''}
  vec3 col = albedo * light;
  // The heart: a small knot of light low in the burl, with fine veins running out of it through the old wood.
  vec2 hc = vLocal.xy - vec2(${HOLLOW_HEART[0].toFixed(3)}, ${(HOLLOW_HEART[1] + 0.12).toFixed(3)});
  float back = smoothstep(-1.38, -1.58, vLocal.z);
  float knot = exp(-dot(hc, hc) * 70.0) * back;
  float spread = exp(-dot(hc, hc) * 9.0) * back;
  float ang = atan(hc.y, hc.x);
  float ridge = 1.0 - abs(2.0 * tvNoise(vec2(ang * 2.6, length(hc) * 9.0 - uTime * 0.12)) - 1.0);
  float veins = smoothstep(0.9, 0.985, ridge) * spread;
  col += uHeartColour * (knot * (1.2 + 2.4 * uHeart) + veins * (0.35 + 1.3 * uHeart)) * uOpen;
  // Fungi on the walls glow faintly of themselves.
  col += vec3(0.2, 0.75, 0.62) * vGlow * (0.35 + 0.55 * uHeart) * uOpen;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
}

class Builder {
  pos: number[] = [];
  local: number[] = [];
  col: number[] = [];
  glow: number[] = [];
  idx: number[] = [];
  v(p: V3, c: V3, glow = 0) {
    this.pos.push(p[0], p[1], p[2]);
    this.local.push(p[0], p[1], p[2]);
    this.col.push(c[0], c[1], c[2]);
    this.glow.push(glow);
    return this.pos.length / 3 - 1;
  }
}

/** A tapered tube along a polyline (door frame), for roots. */
function tube(b: Builder, pts: V3[], r0: number, r1: number, sides: number, tint: V3, glow = 0) {
  const base = b.pos.length / 3;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[Math.min(pts.length - 1, i + 1)]!;
    const o = pts[Math.max(0, i - 1)]!;
    const t: V3 = [q[0] - o[0], q[1] - o[1], q[2] - o[2]];
    const tl = Math.hypot(t[0], t[1], t[2]) || 1;
    t[0] /= tl; t[1] /= tl; t[2] /= tl;
    const ref: V3 = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const s: V3 = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]];
    const sl = Math.hypot(s[0], s[1], s[2]) || 1;
    s[0] /= sl; s[1] /= sl; s[2] /= sl;
    const u: V3 = [t[1] * s[2] - t[2] * s[1], t[2] * s[0] - t[0] * s[2], t[0] * s[1] - t[1] * s[0]];
    const r = r0 + (r1 - r0) * (i / (pts.length - 1));
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      b.v([p[0] + (s[0] * Math.cos(a) + u[0] * Math.sin(a)) * r, p[1] + (s[1] * Math.cos(a) + u[1] * Math.sin(a)) * r, p[2] + (s[2] * Math.cos(a) + u[2] * Math.sin(a)) * r], tint, glow);
    }
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a = base + i * sides + k;
      const c = base + i * sides + ((k + 1) % sides);
      b.idx.push(a, a + sides, c, c, a + sides, c + sides);
    }
  }
}

/** A small rounded bracket fungus sticking out from a wall point along its normal. */
function fungus(b: Builder, at: V3, out: V3, r: number) {
  const base = b.pos.length / 3;
  const ref: V3 = Math.abs(out[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const s: V3 = [out[1] * ref[2] - out[2] * ref[1], out[2] * ref[0] - out[0] * ref[2], out[0] * ref[1] - out[1] * ref[0]];
  const sl = Math.hypot(s[0], s[1], s[2]) || 1;
  s[0] /= sl; s[1] /= sl; s[2] /= sl;
  const u: V3 = [out[1] * s[2] - out[2] * s[1], out[2] * s[0] - out[0] * s[2], out[0] * s[1] - out[1] * s[0]];
  const tip = b.v([at[0] + out[0] * r * 0.9, at[1] + out[1] * r * 0.9 + r * 0.25, at[2] + out[2] * r * 0.9], [1, 1, 1], 1);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    b.v([at[0] + (s[0] * Math.cos(a) + u[0] * Math.sin(a)) * r, at[1] + (s[1] * Math.cos(a) + u[1] * Math.sin(a)) * r * 0.45, at[2] + (s[2] * Math.cos(a) + u[2] * Math.sin(a)) * r], [1, 1, 1], 0.7);
  }
  for (let k = 0; k < 7; k++) b.idx.push(tip, base + 1 + k, base + 1 + ((k + 1) % 7));
}

/** The wall profile: a point of station j at angle index k, roughened, as door-frame coordinates. */
function wallPoint(j: number, k: number): V3 {
  const [z, hw, y0, y1, p, xc, amp] = STATIONS[j]!;
  const th = -Math.PI / 2 + (k / RING) * Math.PI * 2;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const yc = (y0 + y1) / 2;
  const hh = (y1 - y0) / 2;
  let x = xc + hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
  let y = yc + hh * Math.sign(s) * Math.pow(Math.abs(s), 2 / p);
  // Adze-marked: the roughness is coarse and faceted rather than smooth.
  const rough = amp * (fbm(th * 1.6 + z * 2.3, z * 3.1 + 7, 3, 41) * 1.6 + valueNoise(th * 6 + 3, z * 9, 43) * 0.5);
  const rx = x - xc;
  const ry = y - yc;
  const rl = Math.hypot(rx, ry) || 1;
  x += (rx / rl) * rough;
  y += (ry / rl) * rough;
  // A flat trodden floor.
  if (y < y0 + 0.04) y = y0 + 0.01 * valueNoise(x * 9, z * 9, 47);
  return [x, y, z];
}

export function buildMenuHollow(face: TreeDoorFace, options: { lights: { count: number; uniforms: { uWispLights: { value: THREE.Vector4[] }; uWispColours: { value: THREE.Vector4[] } } } }): MenuHollow {
  const b = new Builder();
  const wood = (z: number): V3 => {
    // Paler fresh-cut wood near the doorway, darker and older deeper in.
    const k = 1 - Math.min(1, -z / 1.6) * 0.35;
    return [k, k * 0.97, k * 0.94];
  };
  // ---- Walls ----
  const rows: number[][] = [];
  for (let j = 0; j < STATIONS.length; j++) {
    const row: number[] = [];
    for (let k = 0; k < RING; k++) {
      const p = wallPoint(j, k);
      row.push(b.v(p, wood(p[2])));
    }
    rows.push(row);
  }
  for (let j = 0; j < rows.length - 1; j++) {
    for (let k = 0; k < RING; k++) {
      const a = rows[j]![k]!;
      const c = rows[j]![(k + 1) % RING]!;
      const d = rows[j + 1]![k]!;
      const e = rows[j + 1]![(k + 1) % RING]!;
      b.idx.push(a, d, c, c, d, e);
    }
  }
  // ---- The back wall: a fan into a burl that bulges toward the doorway round the heart. ----
  const back = b.v(BACK, wood(BACK[2]));
  const last = rows[rows.length - 1]!;
  for (let k = 0; k < RING; k++) b.idx.push(last[k]!, back, last[(k + 1) % RING]!);
  // Subdivide the burl once more so it can swell: a ring halfway between the last station and the centre.
  // (Kept simple: the fan above is the back; the burl's bulge is carried by the heart's light and veins in the shader.)

  // ---- Hanging roots from the roof, and roots over the floor. ----
  const roof = (x: number, z: number) => {
    // Interpolate the roof height between stations at this depth.
    for (let j = 0; j < STATIONS.length - 1; j++) {
      const [za, , , ya] = STATIONS[j]!;
      const [zb, , , yb] = STATIONS[j + 1]!;
      if (z <= za && z >= zb) {
        const t = (za - z) / (za - zb);
        return ya + (yb - ya) * t - 0.12 - Math.abs(x) * 0.25;
      }
    }
    return 1.5;
  };
  const rootTint: V3 = [0.62, 0.5, 0.4];
  for (const [x, z, len, r] of [
    [-0.42, -1.22, 0.85, 0.024], [-0.18, -1.44, 0.6, 0.02], [0.16, -1.08, 0.72, 0.022], [-0.52, -0.82, 0.5, 0.018],
    [0.34, -1.32, 0.58, 0.02], [-0.04, -0.9, 0.42, 0.016], [-0.34, -1.52, 0.7, 0.019], [0.05, -1.3, 0.95, 0.026],
  ] as const) {
    const top = roof(x, z);
    const pts: V3[] = [];
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      pts.push([x + Math.sin(f * 2.4 + x * 9) * 0.05 * f, top - len * f, z + Math.cos(f * 2.1 + z * 7) * 0.04 * f]);
    }
    tube(b, pts, r, r * 0.35, 5, rootTint);
  }
  for (const pts of [
    [[-0.66, 0.05, -0.55], [-0.6, 0.06, -0.9], [-0.42, 0.05, -1.25], [-0.15, 0.04, -1.5]],
    [[0.62, 0.05, -0.62], [0.55, 0.07, -1.0], [0.38, 0.05, -1.38]],
    [[-0.3, 0.03, -1.58], [0.0, 0.05, -1.45], [0.28, 0.04, -1.5], [0.45, 0.06, -1.3]],
  ] as V3[][]) tube(b, pts, 0.07, 0.035, 6, [0.55, 0.42, 0.32]);
  // ---- Pale fungi low on the walls and on the floor roots, mostly on the side the doorway shows. ----
  for (const [j, k, r] of [[4, 23, 0.05], [5, 25, 0.042], [5, 21, 0.035], [6, 24, 0.055], [6, 28, 0.04], [3, 26, 0.03], [7, 22, 0.045], [4, 11, 0.04], [6, 12, 0.05]] as const) {
    const p = wallPoint(j, k);
    const q = wallPoint(j, (k + 1) % RING);
    const centre = STATIONS[j]!;
    const inward: V3 = [centre[5] - p[0], (centre[2] + centre[3]) / 2 - p[1], 0];
    const l = Math.hypot(inward[0], inward[1]) || 1;
    fungus(b, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, p[2]], [inward[0] / l, inward[1] / l, 0], r);
  }

  // ---- Into the tree's frame. ----
  const n = face.normal;
  const t: V3 = [n[2], 0, -n[0]];
  const o = face.origin;
  const positions = new Float32Array(b.pos.length);
  for (let i = 0; i < b.pos.length; i += 3) {
    const x = b.pos[i]!;
    const y = b.pos[i + 1]!;
    const z = b.pos[i + 2]!;
    positions[i] = o[0] + t[0] * x + n[0] * z;
    positions[i + 1] = o[1] + y;
    positions[i + 2] = o[2] + t[2] * x + n[2] * z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aLocal', new THREE.Float32BufferAttribute(b.local, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  geometry.setAttribute('aGlow', new THREE.Float32BufferAttribute(b.glow, 1));
  geometry.setIndex(b.idx);
  geometry.computeVertexNormals();
  // The cell is seen from inside: make sure the walls face inward (toward the doorway's axis).
  {
    const nn = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const centre = [o[0] - n[0] * 1.0, o[1] + 1.0, o[2] - n[2] * 1.0];
    let inward = 0;
    for (let k = 0; k < RING * STATIONS.length; k++) {
      const dx = centre[0]! - positions[k * 3]!;
      const dy = centre[1]! - positions[k * 3 + 1]!;
      const dz = centre[2]! - positions[k * 3 + 2]!;
      inward += Math.sign(nn.getX(k) * dx + nn.getY(k) * dy + nn.getZ(k) * dz);
    }
    if (inward < 0) {
      const idx = geometry.index!;
      for (let i = 0; i < idx.count; i += 3) {
        const a = idx.getX(i + 1);
        idx.setX(i + 1, idx.getX(i + 2));
        idx.setX(i + 2, a);
      }
      geometry.computeVertexNormals();
    }
  }
  geometry.computeBoundingSphere();

  const lights = options.lights;
  const uniforms: Record<string, THREE.IUniform> = {
    uHeartView: { value: new THREE.Vector3() },
    uHeartColour: { value: new THREE.Color(0.32, 0.95, 0.74) },
    uHeart: { value: 0 },
    uOpen: { value: 0 },
    uWarm: { value: 1 },
    uTime: { value: 0 },
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
  };
  if (lights.count > 0) {
    uniforms.uWispLights = lights.uniforms.uWispLights;
    uniforms.uWispColours = lights.uniforms.uWispColours;
  }
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: fragment(lights.count), uniforms, vertexColors: true, fog: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Menu_Tree_Hollow';
  mesh.castShadow = mesh.receiveShadow = false;
  const heartLocal = new THREE.Vector3(o[0] + t[0] * HOLLOW_HEART[0] + n[0] * HOLLOW_HEART[2], o[1] + HOLLOW_HEART[1], o[2] + t[2] * HOLLOW_HEART[0] + n[2] * HOLLOW_HEART[2]);
  let disposed = false;
  return {
    mesh,
    stats: { triangles: b.idx.length / 3 },
    setView(camera, tree) {
      tree.updateMatrixWorld(true);
      (uniforms.uHeartView!.value as THREE.Vector3).copy(heartLocal).applyMatrix4(tree.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    },
    update(state) {
      if (disposed) return;
      uniforms.uOpen!.value = Math.max(0, Math.min(1, state.opening));
      uniforms.uHeart!.value = Math.max(0, state.heart);
      uniforms.uWarm!.value = Math.max(0, state.warm);
      uniforms.uTime!.value = state.time;
      // Closed, nothing of it can be seen: skip the draw.
      mesh.visible = state.opening > 0.002;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
    },
  };
}
