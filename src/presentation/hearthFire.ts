import * as THREE from 'three';
import { fromBuildingLocal, HEARTH_SHAPE, hearthOf, INTERIORS, type InteriorSpec, type RoomLocator } from '../world/interiors';
import type { FrameContext, SceneModule } from './context';

/**
 * The fires in the rooms' hearths (A135): a few crossed flame cards over the logs and a glowing bed of embers under them,
 * in one additive draw for the whole valley. The flames are shaped and licked upward by scrolling noise in the shader,
 * so nothing is uploaded per frame but the clock. The room's light (interiorLight.ts) flickers with them.
 */
export interface HearthFireSpot { room: InteriorSpec; x: number; y: number; z: number; yaw: number }

/** Where each burning hearth's fire sits in the world: the middle of its log bed, and which way its mouth faces. */
export function hearthFires(rooms: Pick<RoomLocator, 'base'>): HearthFireSpot[] {
  const out: HearthFireSpot[] = [];
  for (const room of INTERIORS) {
    const hearth = hearthOf(room);
    if (!hearth || room.building.kind === 'bakery') continue;
    const local = hearth.at(0, HEARTH_SHAPE.fire.z), p = fromBuildingLocal(room.building, local.x, local.z);
    out.push({ room, x: p.x, y: rooms.base(room) + room.floorTop + HEARTH_SHAPE.fire.y, z: p.z, yaw: room.building.yaw + hearth.yaw });
  }
  return out;
}

/** Flame cards per fire, their width and height (metres), and the ember bed's size. */
const CARDS = 3, FLAME_W = 0.62, FLAME_H = 0.62, EMBERS = { w: 0.7, d: 0.32 } as const;

const vertex = /* glsl */ `
attribute float seed;
attribute float kind;
varying vec2 vUv;
varying float vSeed;
varying float vKind;
void main() {
  vUv = uv; vSeed = seed; vKind = kind;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragment = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
varying float vKind;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  if (vKind > 0.5) {
    // Embers: a breathing bed of red and orange under the logs, darkest at its edges.
    vec2 d = (vUv - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.35, 1.0, length(d));
    float n = noise(vUv * vec2(9.0, 5.0) + vec2(vSeed * 7.0, uTime * 0.5)) * 0.65 + noise(vUv * vec2(21.0, 13.0) - vec2(uTime * 0.8, vSeed)) * 0.35;
    float g = edge * smoothstep(0.3, 0.85, n);
    vec3 col = mix(vec3(0.35, 0.03, 0.0), vec3(1.0, 0.42, 0.06), g);
    gl_FragColor = vec4(col * g * 1.5, 1.0);
    return;
  }
  float t = uTime * 1.5 + vSeed * 10.0;
  float x = (vUv.x - 0.5) * 2.0, y = vUv.y;
  float n = noise(vec2(vUv.x * 4.0 + vSeed * 3.0, y * 3.0 - t * 1.9)) * 0.6 + noise(vec2(vUv.x * 9.0 - vSeed, y * 7.0 - t * 3.3)) * 0.4;
  float sway = (noise(vec2(t * 0.6, y * 1.5 + vSeed)) - 0.5) * 0.5 * y;
  float width = mix(0.9, 0.05, pow(y, 0.75));
  float body = 1.0 - smoothstep(width * 0.45, width, abs(x - sway) + (n - 0.5) * 0.5);
  float fade = smoothstep(1.0, 0.2, y + (n - 0.5) * 0.4) * smoothstep(0.0, 0.1, y);
  float a = clamp(body * fade, 0.0, 1.0);
  float heat = clamp(a * (1.25 - y) * 1.25, 0.0, 1.0);
  vec3 col = mix(vec3(0.55, 0.07, 0.01), vec3(1.0, 0.42, 0.05), smoothstep(0.1, 0.55, heat));
  col = mix(col, vec3(1.0, 0.85, 0.5), smoothstep(0.7, 1.0, heat));
  gl_FragColor = vec4(col * a * 1.35, 1.0);
}`;

/** The cards of every fire in one geometry, in world space. */
export function hearthFireGeometry(spots: readonly HearthFireSpot[]): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], seed: number[] = [], kind: number[] = [], index: number[] = [];
  const quad = (corners: [number, number, number][], s: number, k: number) => {
    const n = pos.length / 3;
    for (const c of corners) pos.push(...c);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let i = 0; i < 4; i++) { seed.push(s); kind.push(k); }
    index.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  for (const [f, spot] of spots.entries()) {
    for (let i = 0; i < CARDS; i++) {
      const a = spot.yaw + (i * Math.PI) / CARDS, cx = Math.cos(a) * FLAME_W / 2, sz = -Math.sin(a) * FLAME_W / 2;
      // Each card a little off the middle and of its own height, so the fire is never symmetrical.
      const off = (i - 1) * 0.07, ox = Math.cos(spot.yaw) * off, oz = -Math.sin(spot.yaw) * off, h = FLAME_H * (0.8 + 0.2 * ((i * 7 + f) % 3) / 2);
      const y0 = spot.y + 0.04, y1 = spot.y + h;
      quad([[spot.x + ox - cx, y0, spot.z + oz - sz], [spot.x + ox + cx, y0, spot.z + oz + sz], [spot.x + ox + cx, y1, spot.z + oz + sz], [spot.x + ox - cx, y1, spot.z + oz - sz]], f * 1.37 + i * 0.29, 0);
    }
    // The ember bed, level on the ash just under the logs.
    const c = Math.cos(spot.yaw), s = Math.sin(spot.yaw), y = spot.y - 0.025;
    const at = (lx: number, lz: number): [number, number, number] => [spot.x + lx * c + lz * s, y, spot.z - lx * s + lz * c];
    quad([at(-EMBERS.w / 2, EMBERS.d / 2), at(EMBERS.w / 2, EMBERS.d / 2), at(EMBERS.w / 2, -EMBERS.d / 2), at(-EMBERS.w / 2, -EMBERS.d / 2)], f * 0.71, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
  g.setAttribute('kind', new THREE.Float32BufferAttribute(kind, 1));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

export function buildHearthFires(rooms: Pick<RoomLocator, 'base'>): SceneModule & { readonly spots: readonly HearthFireSpot[] } {
  const group = new THREE.Group();
  group.name = 'Hearth fires';
  const spots = hearthFires(rooms);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, vertexShader: vertex, fragmentShader: fragment,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  const mesh = new THREE.Mesh(hearthFireGeometry(spots), material);
  mesh.name = 'Hearth fires / flames';
  mesh.renderOrder = 2;
  group.add(mesh);
  return {
    group,
    spots,
    update(_dt: number, f: FrameContext) {
      // Wrapped, so the noise keeps its precision over a long session.
      material.uniforms.uTime!.value = f.reducedMotion ? 0 : f.time % 600;
    },
    stats: () => ({ hearthFires: spots.length }),
    dispose() { mesh.geometry.dispose(); material.dispose(); },
  };
}
