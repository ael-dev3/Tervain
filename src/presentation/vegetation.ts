import * as THREE from 'three';
import { isWorldPickupItem } from '../content/pickups';
import { ANCHORS, BUILDINGS, DECKS, FIELDS, FOREST_RUIN, FOREST_WAYMARKERS, INSPECT_LOCATIONS, LIGHTHOUSE, PALISADE, PICKUP_LOCATIONS, PLACES, ROADS, SPAWN, SPRING_POOL, STREAMS, STRAND, WAGON } from '../world/layout';
import { distToPolyline, roadWeight, type Terrain } from '../world/terrain';

export interface SwayUniforms {
  uTime: { value: number };
  uWind: { value: number };
}

/**
 * The old rooted sway of the procedural fallback trees (authoring tools and fixtures) stays off. The supplied trees in
 * the world answer the realm's wind through foliage/foliageWind.ts instead (A62).
 */
export const TREE_SWAY_ENABLED = false;
export const TREE_SWAY_MULTIPLIER = TREE_SWAY_ENABLED ? 1 : 0;

/** Standard material whose vertices bend with `aSway` so branch and canopy motion stays attached. */
export function makeSwayMaterial(u: SwayUniforms, opts: { side?: THREE.Side; flat?: boolean } = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: opts.flat ?? true, roughness: 0.95, metalness: 0, side: opts.side ?? THREE.FrontSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = u.uTime;
    shader.uniforms.uWind = u.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSway;\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 ip = vec3(0.0);
          #ifdef USE_INSTANCING
            ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #endif
          float ph = ip.x * 0.31 + ip.z * 0.27;
          float gust = sin(uTime * 0.35 + ip.x * 0.02) * 0.5 + 0.5;
          float w = sin(uTime * 1.5 + ph + position.y * 0.7) * aSway * uWind * (0.55 + gust * 0.6) * ${TREE_SWAY_MULTIPLIER.toFixed(1)};
          transformed.x += w * 0.55;
          transformed.z += w * 0.3;
        }`,
      );
  };
  return mat;
}


/**
 * Prevailing wind (the same world-space convention Warpkeep uses for its grass and forest) and a shared
 * gust field. Adapted from ael-dev3/Warpkeep src/components/realm/realmLivingEnvironment.ts @786c0b2 (Apache-2.0).
 * Materials that want the wind to feel like one wind (trees, leaves, understory) inject WIND_GLSL.
 */
const WIND_LEN = Math.hypot(0.78, 0.62);
export const WIND_DIR = { x: 0.78 / WIND_LEN, z: 0.62 / WIND_LEN } as const;

const f9 = (v: number) => v.toFixed(9);

/** GLSL: `tvGust(worldXZ, t)` in 0..1 and `tvSwayLocal(instanceMatrix, amp, t, wind)`, a local-space rooted sway offset. */
export const WIND_GLSL = /* glsl */ `
const vec2 tvWindDir = vec2(${f9(WIND_DIR.x)}, ${f9(WIND_DIR.z)});
float tvGust(vec2 worldXZ, float t) {
  vec2 cross = vec2(-tvWindDir.y, tvWindDir.x);
  float front = sin(dot(worldXZ, tvWindDir) * 0.21 - t * 0.34);
  float side = sin(dot(worldXZ, cross) * 0.087 + t * 0.19 + 1.7);
  float shaped = clamp((front + 0.64) / 1.46, 0.0, 1.0);
  return clamp(shaped * 0.82 + (side * 0.5 + 0.5) * 0.18, 0.0, 1.0);
}
float tvHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
// Rooted sway of an instanced tree: 'amp' is the per-vertex rooted weight in native metres (height weighting is
// baked into the attribute), the result is a displacement in the mesh's local space (xz) so it stays attached
// whatever the instance yaw and scale are.
vec3 tvSwayLocal(mat4 wm, float amp, float t, float wind) {
  vec2 baseXZ = wm[3].xz;
  float gust = tvGust(baseXZ, t);
  float ph = tvHash(floor(baseXZ * 0.5));
  float s = sin(t * 0.72 + ph * 6.2831853 + dot(baseXZ, tvWindDir) * 0.11) * mix(0.28, 1.0, gust);
  s += 0.18 * sin(t * 1.9 + ph * 17.0) * gust;
  vec2 dW = tvWindDir * (s * amp * 0.02 * wind);
  mat2 A = mat2(wm[0].xz, wm[2].xz);
  float sc = max(length(wm[0].xz), 0.0001);
  vec2 dl = (dW * A) / sc;
  return vec3(dl.x, 0.0, dl.y);
}
`;

export function withSway(geo: THREE.BufferGeometry, fn: (y: number, x: number, z: number) => number): THREE.BufferGeometry {
  const n = geo.attributes.position!.count;
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = fn(geo.attributes.position!.getY(i), geo.attributes.position!.getX(i), geo.attributes.position!.getZ(i));
  geo.setAttribute('aSway', new THREE.BufferAttribute(a, 1));
  return geo;
}

export class Exclusions {
  private circles: { x: number; z: number; r: number }[] = [];
  constructor(private terrain: Terrain) {
    for (const b of BUILDINGS) this.circles.push({ x: b.x, z: b.z, r: Math.hypot(b.w, b.d) / 2 + 3.2 });
    for (const a of Object.values(ANCHORS)) this.circles.push({ x: a.x, z: a.z, r: 3.5 });
    for (const p of INSPECT_LOCATIONS) this.circles.push({ x: p.x, z: p.z, r: p.r + 1.5 });
    for (const p of PICKUP_LOCATIONS) this.circles.push({ x: p.x, z: p.z, r: isWorldPickupItem(p.item) ? 0.8 : 3.5 });
    for (const p of Object.values(PLACES)) {
      if (p.r < 20) this.circles.push({ x: p.x, z: p.z, r: 3 });
    }
    this.circles.push({ x: 3, z: 8, r: 11 }, { x: -1, z: 4, r: 4 }, { x: SPRING_POOL.x, z: SPRING_POOL.z, r: SPRING_POOL.r + 2.5 }, { x: 88, z: -20, r: 20 }, { x: -136, z: 28, r: 12 });
    this.circles.push({ x: 10, z: -58, r: 9 }, { x: -20, z: -98, r: 20 }, { x: -46, z: -100, r: 10 }, { x: 96, z: -8, r: 8 }, { x: 100, z: -19, r: 5 });
    for (const d of DECKS) this.circles.push({ x: d.x, z: d.z, r: d.hx + 3 });
    // The strand, the wagon and the foot of the lighthouse stay open ground.
    this.circles.push({ x: STRAND.x, z: STRAND.z, r: 26 }, { x: SPAWN.x, z: SPAWN.z, r: 32 }, { x: WAGON.x, z: WAGON.z, r: 7 }, { x: LIGHTHOUSE.x, z: LIGHTHOUSE.z, r: 13 });
    for (const marker of FOREST_WAYMARKERS) this.circles.push({ x: marker.x, z: marker.z, r: 2.4 });
    this.circles.push({ x: FOREST_RUIN.x, z: FOREST_RUIN.z, r: FOREST_RUIN.r + 0.5 });
  }

  blocked(x: number, z: number, pad = 0): boolean {
    for (const c of this.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
    if (roadWeight(x, z) > 0.04) return true;
    for (const road of ROADS) if (distToPolyline(x, z, road.points).d < road.width * 0.5 + pad) return true;
    if (this.terrain.carveAt(x, z) > 0.02) return true;
    if (distToPolyline(x, z, PALISADE.points).d < 3.5 + pad) return true;
    for (const f of FIELDS) {
      const dx = x - f.x;
      const dz = z - f.z;
      const lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
      const lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
      if (Math.abs(lx) < f.w / 2 + 1.5 && Math.abs(lz) < f.d / 2 + 1.5) return true;
    }
    return false;
  }
}


export function streamDistance(x: number, z: number) {
  let d = Infinity;
  for (const s of STREAMS) d = Math.min(d, distToPolyline(x, z, s.points).d);
  return Math.min(d, Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z) - SPRING_POOL.r);
}
