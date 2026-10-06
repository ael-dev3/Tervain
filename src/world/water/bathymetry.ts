import { cliffiness, shoreDistance } from '../coast';
import { DISTANT_COAST, distantCoastHeight } from '../distantCoast';
import { SEA_LEVEL, WORLD } from '../layout';
import type { Terrain } from '../terrain';
import { SWELL, SWELL_DIR, SWELL_K0, SWELL_OMEGA, swellHeight, waveNumber } from './waves';

/**
 * The sea bed under the whole visible sea, sampled on the terrain's own 2 m vertices, and what the swell does over it.
 *
 * Built once per world from the same ground the player walks on:
 *  - `bed`: ground height (m). The playable terrain, the uninhabited promontory across the bay, deep water beyond.
 *  - which samples belong to the sea: everything a wave can reach from open water. Hollows inland that happen to lie
 *    below sea level (the lower stream valley) stay dry; they are not the sea.
 *  - `phase`: the swell's phase (radians), solved with the eikonal equation |grad phase| = k(depth) by fast marching.
 *    Wave crests are lines of equal phase, so they slow, crowd together and turn to meet the shore in shallow water,
 *    and wrap around headlands, exactly as refraction requires.
 *  - `height`: swell height after shelter from land upwind, shoaling and breaking (m), or -1 where there is no sea.
 *  - `shorePhase`: on the beach above still water, the phase at the nearest real waterline, which times the swash.
 */

export const BATHY = { minX: DISTANT_COAST.minX, maxX: -148, minZ: -216, maxZ: 216, cell: 2 } as const;
export const BATHY_NX = (BATHY.maxX - BATHY.minX) / BATHY.cell;
export const BATHY_NZ = (BATHY.maxZ - BATHY.minZ) / BATHY.cell;

/** Highest ground the swash may wet; also how far above still water the sea mask reaches. */
export const SWASH_LIMIT = 1.1;
/** Depth of the open ocean beyond the sampled sea bed (m). */
export const OPEN_DEPTH = 30;
/** How far upwind land shelters the swell (m). */
const SHELTER_RANGE = 460;

export interface Bathymetry {
  readonly nx: number;
  readonly nz: number;
  readonly bed: Float32Array;
  readonly phase: Float32Array;
  readonly shorePhase: Float32Array;
  readonly height: Float32Array;
  /** 0.32 .. 1: how much of the open sea's swell reaches a sample past the land upwind of it. */
  readonly shelter: Float32Array;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** The deep-water swell phase anywhere: a plane wave, which the solved field matches at its open edges. */
export function openPhase(x: number, z: number): number {
  return SWELL_K0 * (SWELL_DIR.x * x + SWELL_DIR.z * z);
}

/** Ground height for the sea: the playable terrain, the far promontory, and open water or land beyond the map. */
export function seaBedAt(terrain: Pick<Terrain, 'heightAt'>, x: number, z: number): number {
  if (x < WORLD.minX) return distantCoastHeight(x, z);
  const cz = clamp(z, WORLD.minZ, WORLD.maxZ);
  const edge = terrain.heightAt(Math.min(x, WORLD.maxX), cz);
  const beyond = Math.abs(z - cz);
  if (beyond <= 0) return edge;
  // Past the north and south edges of the terrain, the sea deepens offshore and the land stays land.
  const offshore = shoreDistance(x, cz) < 0;
  return edge + ((offshore ? -16 : 6) - edge) * smoothstep(0, 40, beyond);
}

/** A small binary min-heap of (key, index) pairs for fast marching. */
class Heap {
  private keys: number[] = [];
  private ids: number[] = [];
  get size() { return this.keys.length; }
  push(key: number, id: number) {
    const k = this.keys, d = this.ids;
    let i = k.length;
    k.push(key); d.push(id);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p]! <= key) break;
      k[i] = k[p]!; d[i] = d[p]!;
      i = p;
    }
    k[i] = key; d[i] = id;
  }
  pop(): number {
    const k = this.keys, d = this.ids;
    const top = d[0]!;
    const lastKey = k.pop()!, lastId = d.pop()!;
    if (k.length) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i, mk = lastKey;
        if (l < k.length && k[l]! < mk) { m = l; mk = k[l]!; }
        if (r < k.length && k[r]! < mk) { m = r; mk = k[r]!; }
        if (m === i) break;
        k[i] = k[m]!; d[i] = d[m]!;
        i = m;
      }
      k[i] = lastKey; d[i] = lastId;
    }
    return top;
  }
}

export function buildBathymetry(terrain: Pick<Terrain, 'heightAt'>): Bathymetry {
  const w = BATHY_NX + 1, h = BATHY_NZ + 1, n = w * h, cell = BATHY.cell;
  const xAt = (i: number) => BATHY.minX + i * cell;
  const zAt = (j: number) => BATHY.minZ + j * cell;
  const bed = new Float32Array(n);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = seaBedAt(terrain, xAt(i), zAt(j));
    if (!Number.isFinite(v)) throw new RangeError('The sea bed needs finite ground heights.');
    bed[j * w + i] = v;
  }

  // The sea: everything reachable from deep water at the open edges without climbing past the swash limit.
  const sea = new Uint8Array(n);
  const queue: number[] = [];
  const open = (id: number) => bed[id]! < SEA_LEVEL - 3;
  for (let i = 0; i < w; i++) for (const j of [0, h - 1]) if (open(j * w + i)) { sea[j * w + i] = 1; queue.push(j * w + i); }
  for (let j = 0; j < h; j++) if (open(j * w)) { sea[j * w] = 1; queue.push(j * w); }
  for (let q = 0; q < queue.length; q++) {
    const id = queue[q]!, i = id % w, j = (id - i) / w;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const nid = nj * w + ni;
      if (sea[nid] || bed[nid]! >= SEA_LEVEL + SWASH_LIMIT) continue;
      sea[nid] = 1; queue.push(nid);
    }
  }

  // Fast marching from the open edges: the first-arrival phase over the real depths.
  const phase = new Float32Array(n).fill(Number.NaN);
  const slowness = new Float32Array(n);
  for (let id = 0; id < n; id++) slowness[id] = waveNumber(SWELL_OMEGA, Math.max(SEA_LEVEL - bed[id]!, SWELL.minDepth)) * cell;
  const state = new Uint8Array(n); // 0 unreached, 1 trial, 2 fixed
  const best = new Float64Array(n).fill(Infinity);
  const heap = new Heap();
  const seed = (id: number) => {
    if (!sea[id] || !open(id)) return;
    const i = id % w, j = (id - i) / w;
    best[id] = openPhase(xAt(i), zAt(j)); state[id] = 1; heap.push(best[id]!, id);
  };
  for (let i = 0; i < w; i++) { seed(i); seed((h - 1) * w + i); }
  for (let j = 0; j < h; j++) seed(j * w);
  const fixedValue = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= w || j >= h) return Infinity;
    const id = j * w + i;
    return state[id] === 2 ? best[id]! : Infinity;
  };
  while (heap.size) {
    const id = heap.pop();
    if (state[id] === 2) continue;
    state[id] = 2;
    const i = id % w, j = (id - i) / w;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const nid = nj * w + ni;
      if (!sea[nid] || state[nid] === 2) continue;
      const a = Math.min(fixedValue(ni - 1, nj), fixedValue(ni + 1, nj));
      const b = Math.min(fixedValue(ni, nj - 1), fixedValue(ni, nj + 1));
      const f = slowness[nid]!;
      let t: number;
      if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) >= f) t = Math.min(a, b) + f;
      else t = (a + b + Math.sqrt(2 * f * f - (a - b) * (a - b))) / 2;
      if (t < best[nid]!) { best[nid] = t; state[nid] = 1; heap.push(t, nid); }
    }
  }
  for (let id = 0; id < n; id++) if (state[id] === 2) phase[id] = best[id]!;

  // Shelter: land upwind of a point (a headland, the far promontory) takes energy out of the swell that reaches it.
  const height = new Float32Array(n).fill(-1);
  const shelterOf = new Float32Array(n).fill(1);
  const step = 6;
  const bedAt = (x: number, z: number) => {
    const fi = (x - BATHY.minX) / cell, fj = (z - BATHY.minZ) / cell;
    if (fi < 0 || fj < 0 || fi > w - 1 || fj > h - 1) return -OPEN_DEPTH;
    return bed[Math.round(fj) * w + Math.round(fi)]!;
  };
  for (let id = 0; id < n; id++) {
    if (!sea[id] || !Number.isFinite(phase[id]!)) continue;
    const i = id % w, j = (id - i) / w, x = xAt(i), z = zAt(j);
    const depth = SEA_LEVEL - bed[id]!;
    let blocked = SHELTER_RANGE;
    // Only land standing clear of the water shelters; a shoal under the surface does not.
    for (let d = 12; d <= SHELTER_RANGE; d += step) {
      if (bedAt(x - SWELL_DIR.x * d, z - SWELL_DIR.z * d) > SEA_LEVEL + 0.6) { blocked = d; break; }
    }
    const shelter = 0.32 + 0.68 * smoothstep(40, SHELTER_RANGE, blocked);
    shelterOf[id] = shelter;
    height[id] = depth > 0 ? swellHeight(depth, SWELL.height * shelter) : 0;
  }

  // The swash: beach samples above still water copy the phase and breaker height of their nearest real waterline.
  const shorePhase = new Float32Array(n).fill(Number.NaN);
  const source = new Int32Array(n).fill(-1);
  const front: number[] = [];
  for (let id = 0; id < n; id++) {
    if (!sea[id] || !Number.isFinite(phase[id]!)) continue;
    const depth = SEA_LEVEL - bed[id]!;
    if (depth >= 0.12 && depth < 1.2) { source[id] = id; front.push(id); }
  }
  for (let q = 0; q < front.length; q++) {
    const id = front[q]!, i = id % w, j = (id - i) / w;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const nid = nj * w + ni;
      if (!sea[nid] || source[nid]! >= 0) continue;
      if (SEA_LEVEL - bed[nid]! >= 0.12) continue;
      source[nid] = source[id]!; front.push(nid);
    }
  }
  for (let id = 0; id < n; id++) {
    const s = source[id]!;
    if (s < 0) continue;
    shorePhase[id] = phase[s]!;
    // In the swash the height channel carries the breaker that feeds this run-up: the tallest the sheltered swell grew
    // before it broke, not what is left of it at the waterline.
    if (SEA_LEVEL - bed[id]! < 0.12) height[id] = breakerHeight(SWELL.height * shelterOf[s]!);
  }
  return { nx: BATHY_NX, nz: BATHY_NZ, bed, phase, shorePhase, height, shelter: shelterOf };
}

/** The height at which a swell of deep-water height `h0` breaks: where its shoaled height first reaches the breaker limit. */
export function breakerHeight(h0: number): number {
  let best = 0;
  for (let depth = 6; depth > 0.05; depth *= 0.96) best = Math.max(best, swellHeight(depth, h0));
  return best;
}

/** Bilinear sample of one channel at world (x, z); `fallback` outside the grid or where a corner is missing. */
export function sampleBathymetry(field: Float32Array, x: number, z: number, fallback: number): number {
  const w = BATHY_NX + 1;
  const fi = (x - BATHY.minX) / BATHY.cell, fj = (z - BATHY.minZ) / BATHY.cell;
  if (!(fi >= 0 && fj >= 0 && fi <= BATHY_NX && fj <= BATHY_NZ)) return fallback;
  const i = Math.min(Math.floor(fi), BATHY_NX - 1), j = Math.min(Math.floor(fj), BATHY_NZ - 1);
  const tx = fi - i, tz = fj - j;
  const a = field[j * w + i]!, b = field[j * w + i + 1]!, c = field[(j + 1) * w + i]!, d = field[(j + 1) * w + i + 1]!;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || !Number.isFinite(d)) {
    // Nearest finite corner: the edge of the solved sea, where a corner may be dry ground.
    const corners = [[a, (1 - tx) * (1 - tz)], [b, tx * (1 - tz)], [c, (1 - tx) * tz], [d, tx * tz]] as const;
    let value = fallback, weight = -1;
    for (const [v, wt] of corners) if (Number.isFinite(v) && wt > weight) { value = v; weight = wt; }
    return value;
  }
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

/**
 * How rocky the shore is at grid cell (i, j), 0 sand .. 1 rock: the coast's own cliffs and outcrops, and steep ground
 * wherever water meets it. Waves burst white against rock (drawn) and boom on it (heard).
 */
export function rockinessAt(b: Bathymetry, i: number, j: number): number {
  const w = BATHY_NX + 1, h = BATHY_NZ + 1;
  const ci = Math.min(w - 1, Math.max(0, i)), cj = Math.min(h - 1, Math.max(0, j));
  const x = BATHY.minX + ci * BATHY.cell, z = BATHY.minZ + cj * BATHY.cell;
  const gx = (b.bed[cj * w + Math.min(w - 1, ci + 1)]! - b.bed[cj * w + Math.max(0, ci - 1)]!) / (2 * BATHY.cell);
  const gz = (b.bed[Math.min(h - 1, cj + 1) * w + ci]! - b.bed[Math.max(0, cj - 1) * w + ci]!) / (2 * BATHY.cell);
  return Math.min(1, Math.max(x < -360 ? 0 : cliffiness(z) * 0.7, (Math.hypot(gx, gz) - 0.25) * 1.4));
}

/** Rockiness at a world point (nearest cell). */
export function rockiness(b: Bathymetry, x: number, z: number): number {
  return rockinessAt(b, Math.round((x - BATHY.minX) / BATHY.cell), Math.round((z - BATHY.minZ) / BATHY.cell));
}
