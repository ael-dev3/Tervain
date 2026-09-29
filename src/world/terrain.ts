import { clamp, fbm, lerp, smoothstep } from './noise';
import {
  DECKS,
  DEEP_WATER,
  FORD,
  LEDGE,
  OVERLOOK_BUMP,
  ROADS,
  SHRINE_PLATEAU,
  SPRING_POOL,
  STREAMS,
  VALLEY,
  WORLD,
  type StreamSpec,
  type V2,
} from './layout';

/** Distance from p to a polyline, plus which segment and the parameter along it. */
export function distToPolyline(px: number, pz: number, pts: V2[]) {
  let best = Infinity;
  let seg = 0;
  let t = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz;
    const u = l2 === 0 ? 0 : clamp(((px - a.x) * dx + (pz - a.z) * dz) / l2, 0, 1);
    const qx = a.x + dx * u;
    const qz = a.z + dz * u;
    const d = Math.hypot(px - qx, pz - qz);
    if (d < best) {
      best = d;
      seg = i;
      t = u;
    }
  }
  return { d: best, seg, t };
}

const bump = (x: number, z: number, cx: number, cz: number, r: number, h: number, core = 0.35) => {
  const d = Math.hypot(x - cx, z - cz) / r;
  return h * (1 - smoothstep(core, 1, d));
};

/** Ground height before rivers are carved. */
export function baseHeight(x: number, z: number): number {
  const rx = (x - VALLEY.cx) / VALLEY.rx;
  const rz = (z - VALLEY.cz) / VALLEY.rz;
  const r = Math.hypot(rx, rz);

  const m = smoothstep(0.8, 1.16, r);
  const ridge = 0.55 + 0.45 * fbm(x / 55 + 9, z / 55 - 4, 4, 7);
  let h = m * (44 + 30 * ridge) + Math.max(0, r - 1.16) * 80;

  const shrine = bump(x, z, SHRINE_PLATEAU.x, SHRINE_PLATEAU.z, SHRINE_PLATEAU.r, SHRINE_PLATEAU.h, 0.5);
  const overlook = bump(x, z, OVERLOOK_BUMP.x, OVERLOOK_BUMP.z, OVERLOOK_BUMP.r, OVERLOOK_BUMP.h, 0.4);
  const ledge = bump(x, z, LEDGE.x, LEDGE.z, LEDGE.r, LEDGE.h, 0.5);

  const calm = 1 - clamp((shrine + overlook + ledge) / 8, 0, 0.85);
  const rolling = (2.4 * fbm(x / 46, z / 46, 3, 3) + 0.7 * fbm(x / 13, z / 13, 2, 5)) * calm;
  // The land climbs gently toward the north-east where the quarry is cut into the hillside.
  const hillside = Math.min(20, 0.1 * Math.max(0, x - 80) + 0.1 * Math.max(0, -z - 25));
  const crags = Math.max(0, fbm(x / 8, z / 8, 3, 11)) * Math.min(1, hillside / 6) * 1.4;
  // The gully north of the Cut: a cliff drop that makes the ledge a dead end on that side.
  const gully = -bump(x, z, LEDGE.x, LEDGE.z - 26, 17, 9, 0.4);
  h += rolling + shrine + overlook + hillside + crags + gully;

  // Village fields: gently flatten so buildings sit on the ground.
  const vd = Math.hypot(x - 4, z - 8) / 42;
  h = lerp(h, 0.55 + 0.35 * fbm(x / 30, z / 30, 2, 2), 1 - smoothstep(0.55, 1, vd));
  // Quarry yard: a levelled working floor.
  const qd = Math.hypot(x - 88, z + 20) / 34;
  h = lerp(h, 2.1, (1 - smoothstep(0.3, 1, qd)) * 0.95);
  // Shrine forecourt and spring plateau stay level around the buildings.
  const sd = Math.hypot(x - -28, z + 100) / 26;
  h = lerp(h, SHRINE_PLATEAU.h - 0.4, (1 - smoothstep(0.5, 1, sd)) * 0.9);
  // Overlook shelf where the caravan stops.
  const od = Math.hypot(x + 136, z - 28) / 14;
  h = lerp(h, 10.4, (1 - smoothstep(0.4, 1, od)) * 0.95);
  // Ledge floor.
  const ld = Math.hypot(x - LEDGE.x, z - LEDGE.z) / 11;
  h = lerp(h, 9.2, (1 - smoothstep(0.5, 1, ld)) * 0.9);
  return h;
}

export function carveDepthAt(x: number, z: number): number {
  let carve = 0;
  for (const s of STREAMS) {
    const { d } = distToPolyline(x, z, s.points);
    let depth = s.depth;
    if (s.id === 'main') {
      const fd = Math.hypot(x - FORD.x, z - FORD.z);
      depth = lerp(FORD.depth, s.depth, smoothstep(FORD.r * 0.45, FORD.r, fd));
    }
    const c = depth * (1 - smoothstep(s.halfWidth * 0.5, s.halfWidth * 1.65, d));
    carve = Math.max(carve, c);
  }
  const pd = Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z);
  carve = Math.max(carve, 1.3 * (1 - smoothstep(SPRING_POOL.r * 0.55, SPRING_POOL.r * 1.0, pd)));
  return carve;
}

export function roadWeight(x: number, z: number): number {
  let w = 0;
  for (const r of ROADS) {
    const { d } = distToPolyline(x, z, r.points);
    w = Math.max(w, 1 - smoothstep(r.width * 0.5, r.width * 0.5 + 1.4, d));
  }
  return w;
}

export class Terrain {
  readonly nx = (WORLD.maxX - WORLD.minX) / WORLD.cell;
  readonly nz = (WORLD.maxZ - WORLD.minZ) / WORLD.cell;
  readonly heights: Float32Array;
  readonly carve: Float32Array;

  constructor() {
    const w = this.nx + 1;
    const h = this.nz + 1;
    this.heights = new Float32Array(w * h);
    this.carve = new Float32Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = WORLD.minX + i * WORLD.cell;
        const z = WORLD.minZ + j * WORLD.cell;
        const base = baseHeight(x, z);
        const c = carveDepthAt(x, z);
        this.heights[j * w + i] = base - c;
        this.carve[j * w + i] = c;
      }
    }
  }

  private idx(i: number, j: number) {
    return j * (this.nx + 1) + i;
  }

  vertexHeight(i: number, j: number) {
    return this.heights[this.idx(i, j)]!;
  }

  vertexX(i: number) {
    return WORLD.minX + i * WORLD.cell;
  }

  vertexZ(j: number) {
    return WORLD.minZ + j * WORLD.cell;
  }

  /** Terrain height following the rendered triangle split exactly, so feet meet the visible ground. */
  heightAt(x: number, z: number): number {
    const gx = (x - WORLD.minX) / WORLD.cell;
    const gz = (z - WORLD.minZ) / WORLD.cell;
    const i = clamp(Math.floor(gx), 0, this.nx - 1);
    const j = clamp(Math.floor(gz), 0, this.nz - 1);
    const fx = clamp(gx - i, 0, 1);
    const fz = clamp(gz - j, 0, 1);
    const ha = this.heights[this.idx(i, j)]!;
    const hb = this.heights[this.idx(i + 1, j)]!;
    const hc = this.heights[this.idx(i, j + 1)]!;
    const hd = this.heights[this.idx(i + 1, j + 1)]!;
    if (fx + fz <= 1) return ha + fx * (hb - ha) + fz * (hc - ha);
    return hd + (1 - fx) * (hc - hd) + (1 - fz) * (hb - hd);
  }

  carveAt(x: number, z: number): number {
    const gx = (x - WORLD.minX) / WORLD.cell;
    const gz = (z - WORLD.minZ) / WORLD.cell;
    const i = clamp(Math.floor(gx), 0, this.nx - 1);
    const j = clamp(Math.floor(gz), 0, this.nz - 1);
    const fx = clamp(gx - i, 0, 1);
    const fz = clamp(gz - j, 0, 1);
    const c = this.carve;
    const a = c[this.idx(i, j)]!;
    const b = c[this.idx(i + 1, j)]!;
    const cc = c[this.idx(i, j + 1)]!;
    const d = c[this.idx(i + 1, j + 1)]!;
    return lerp(lerp(a, b, fx), lerp(cc, d, fx), fz);
  }

  deckAt(x: number, z: number) {
    for (const d of DECKS) {
      const dx = x - d.x;
      const dz = z - d.z;
      const lx = dx * Math.cos(d.yaw) - dz * Math.sin(d.yaw);
      const lz = dx * Math.sin(d.yaw) + dz * Math.cos(d.yaw);
      if (Math.abs(lx) <= d.hx && Math.abs(lz) <= d.hz) return d;
    }
    return null;
  }

  /** Height a character stands on: terrain, or a deck when on one. */
  groundAt(x: number, z: number): number {
    const deck = this.deckAt(x, z);
    const t = this.heightAt(x, z);
    return deck ? Math.max(deck.y, t) : t;
  }

  slopeAt(x: number, z: number): number {
    const e = 0.9;
    const dx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    const dz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    return Math.hypot(dx, dz);
  }

  normalAt(x: number, z: number, out: [number, number, number] = [0, 1, 0]) {
    const e = 1;
    const dx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    const dz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    const l = Math.hypot(dx, 1, dz);
    out[0] = -dx / l;
    out[1] = 1 / l;
    out[2] = -dz / l;
    return out;
  }

  valleyRadius(x: number, z: number): number {
    return Math.hypot((x - VALLEY.cx) / VALLEY.rx, (z - VALLEY.cz) / VALLEY.rz);
  }

  isDeepWater(x: number, z: number): boolean {
    if (this.deckAt(x, z)) return false;
    return this.carveAt(x, z) > DEEP_WATER;
  }

  /** Whether a walking character may stand here (ignoring dynamic colliders). */
  walkable(x: number, z: number, maxSlope = 0.95): boolean {
    if (x < WORLD.minX + 4 || x > WORLD.maxX - 4 || z < WORLD.minZ + 4 || z > WORLD.maxZ - 4) return false;
    if (this.valleyRadius(x, z) > 1.02) return false;
    if (this.isDeepWater(x, z)) return false;
    if (this.deckAt(x, z)) return true;
    return this.slopeAt(x, z) <= maxSlope;
  }
}

export function streamById(id: StreamSpec['id']): StreamSpec {
  const s = STREAMS.find((x) => x.id === id);
  if (!s) throw new Error(`no stream ${id}`);
  return s;
}
