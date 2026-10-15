import {
  ANCHORS,
  BUILDINGS,
  DECKS,
  FIELDS,
  INSPECT_LOCATIONS,
  PICKUP_LOCATIONS,
  PLACES,
  SPRING_POOL,
  STREAMS,
  VALLEY,
  WORLD,
} from '../../world/layout';
import { clamp, fbm, smoothstep } from '../../world/noise';
import { distToPolyline, roadWeight, type Terrain } from '../../world/terrain';
import type { BuildContext } from '../context';
import { groundSplat } from '../groundSplat';
import { LAYER } from '../terrainTextures';
import { shoreDistance } from '../../world/coast';
import { isWorldPickupItem } from '../../content/pickups';
import type { PlantedCrownField } from '../plantedCrowns';
import { biomeAt } from '../../world/biomes';

/**
 * A cheap, lazily evaluated map of where plants may grow and what kind of ground it is.
 * Everything that scatters ground cover (grass, flowers, ferns, reeds, mushrooms ...) asks this one
 * object, so the meadow, the wet margins and the woodland floor agree with each other and with the
 * ground colouring in terrainMesh.ts (same moisture and dry-patch formulas).
 *
 * Smooth quantities (paths, water, moisture ...) come from a 2 m raster that is filled per 32 m tile
 * on demand; hard obstacles (walls, trunks, props) are tested exactly per candidate through a
 * spatial hash so nothing pokes through a wall or a trunk.
 */
export interface HabitatSample {
  /** 0..1: how much of the surface is free for plants (paths, water, doorways and interaction points removed). */
  open: number;
  /** 0..1: plant moisture from water and the shared regional soil profile; not surface wetness. */
  wet: number;
  /** 0..1: sun-cured patch (matches the golden patches the terrain colouring paints). */
  dry: number;
  /** 0..1: woodland shade from the planted source-leaf envelope shared with the forest floor. */
  wood: number;
  slope: number;
}

export interface TreeSpot {
  x: number;
  z: number;
  r: number;
}

const TILE_CELLS = 16;
const STEP = WORLD.cell;
const TILE = TILE_CELLS * STEP;
const NODES = TILE_CELLS + 1;
const CH = 5;
const HASH = 8;
// Authored field transforms are fixed; reuse their rotation for each raster node.
const fieldRotations = FIELDS.map(f => ({ ...f, cosine: Math.cos(f.yaw), sine: Math.sin(f.yaw) }));

/** Integer hash to [0,1). Stable across runs. */
export function hash3(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** One continuous, original two-scale colony field for woodland grass, ferns and litter.
 * A shared field makes the shaded floor grow in overlapping pockets rather than separate grids.
 * It is a habitat cue only: source crown shade and hard contacts remain authoritative. */
export function woodlandColonyAt(x: number, z: number): number {
  return clamp(fbm(x / 17 + 3.7, z / 17 - 6.2, 2, 50420) * 0.5 + 0.5, 0, 1);
}

interface SoftCircle { x: number; z: number; hard: number }

interface Obstacle {
  kind: 0 | 1; // 0 circle, 1 rect
  x: number;
  z: number;
  a: number; // radius or half width
  b: number; // half depth
  c: number; // cos yaw
  s: number; // sin yaw
}

/** Distance from p to the water banks, including the pool rim. Optionally writes
 * stream centre-line distance to slot zero so raster generation can share the traversal. */
export function waterDistance(x: number, z: number, centreOut?: Float64Array): number {
  let d = Infinity, centre = Infinity;
  for (const s of STREAMS) {
    const distance = distToPolyline(x, z, s.points).d;
    if (centreOut) centre = Math.min(centre, distance);
    const r = distance - s.halfWidth;
    if (r < d) d = r;
  }
  if (centreOut) centreOut[0] = centre;
  const pd = Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z) - SPRING_POOL.r;
  return Math.min(d, pd);
}

export class Habitat {
  readonly terrain: Terrain;
  readonly trees: TreeSpot[] = [];
  private tiles = new Map<number, Float32Array>();
  private treeHash = new Map<number, TreeSpot[]>();
  private obstacles: Obstacle[] = [];
  private obstacleHash = new Map<number, Obstacle[]>();
  private softCircles: SoftCircle[] = [];
  private softCircleHash = new Map<number, SoftCircle[]>();
  private noiseForest: boolean;
  private readonly plantedCrowns?: PlantedCrownField;

  constructor(ctx: Pick<BuildContext, 'terrain' | 'colliders' | 'excl' | 'plantedCrowns'>) {
    this.terrain = ctx.terrain;
    this.plantedCrowns = ctx.plantedCrowns;

    // Trunks and props from the collision set. Trees may be added by any module before this one.
    for (const c of ctx.colliders.all) {
      if (c.kind === 'circle' && c.id.startsWith('tree')) {
        const t = { x: c.x, z: c.z, r: c.r };
        this.trees.push(t);
        this.addTo(this.treeHash, t, 0);
        this.addObstacle({ kind: 0, x: c.x, z: c.z, a: c.r + 0.15, b: 0, c: 1, s: 0 });
      } else if (c.kind === 'circle') {
        this.addObstacle({ kind: 0, x: c.x, z: c.z, a: c.r, b: 0, c: 1, s: 0 });
      } else {
        this.addObstacle({ kind: 1, x: c.x, z: c.z, a: c.hw, b: c.hd, c: Math.cos(c.yaw), s: Math.sin(c.yaw) });
      }
    }
    for (const b of BUILDINGS) this.addObstacle({ kind: 1, x: b.x, z: b.z, a: b.w / 2 + 0.25, b: b.d / 2 + 0.25, c: Math.cos(b.yaw), s: Math.sin(b.yaw) });
    for (const d of DECKS) this.addObstacle({ kind: 1, x: d.x, z: d.z, a: d.hx + 0.3, b: d.hz + 0.6, c: Math.cos(d.yaw), s: Math.sin(d.yaw) });
    for (const f of FIELDS) this.addObstacle({ kind: 1, x: f.x, z: f.z, a: f.w / 2 + 0.6, b: f.d / 2 + 0.6, c: Math.cos(f.yaw), s: Math.sin(f.yaw) });

    // The Exclusions helper keeps its keep-out discs private; read them when they are there so ground cover
    // agrees with foliage, but shrink them: grass may grow right up to a wall, only doorways and working areas stay bare.
    const circles = (ctx.excl as unknown as { circles?: { x: number; z: number; r: number }[] }).circles;
    if (Array.isArray(circles)) {
      for (const c of circles) {
        if (BUILDINGS.some((b) => Math.abs(b.x - c.x) < 1e-6 && Math.abs(b.z - c.z) < 1e-6)) continue;
        const looseItem = PICKUP_LOCATIONS.some((p) => isWorldPickupItem(p.item) && p.x === c.x && p.z === c.z);
        this.softCircles.push({ x: c.x, z: c.z, hard: looseItem ? 0.25 : c.r < 8 ? c.r * 0.5 : c.r - 3.5 });
      }
    } else {
      for (const a of Object.values(ANCHORS)) this.softCircles.push({ x: a.x, z: a.z, hard: 1.8 });
      for (const p of INSPECT_LOCATIONS) this.softCircles.push({ x: p.x, z: p.z, hard: p.r + 0.5 });
      for (const p of PICKUP_LOCATIONS) this.softCircles.push({ x: p.x, z: p.z, hard: isWorldPickupItem(p.item) ? 0.25 : 1.8 });
      for (const p of Object.values(PLACES)) if (p.r < 20) this.softCircles.push({ x: p.x, z: p.z, hard: 1.5 });
    }
    // Interaction points always keep a clear disc for the player, whatever the helper says.
    for (const p of INSPECT_LOCATIONS) this.softCircles.push({ x: p.x, z: p.z, hard: Math.max(2, p.r * 0.7) });
    for (const p of PICKUP_LOCATIONS) this.softCircles.push({ x: p.x, z: p.z, hard: isWorldPickupItem(p.item) ? 0.25 : 2 });

    // Keep source order within each bucket: attenuation multiplies in that order, so field bytes stay identical.
    for (const circle of this.softCircles) {
      const reach = circle.hard + 1.8;
      const x0 = Math.floor((circle.x - reach) / HASH), x1 = Math.floor((circle.x + reach) / HASH);
      const z0 = Math.floor((circle.z - reach) / HASH), z1 = Math.floor((circle.z + reach) / HASH);
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
        const key = (x + 256) * 1024 + (z + 256), bucket = this.softCircleHash.get(key);
        if (bucket) bucket.push(circle); else this.softCircleHash.set(key, [circle]);
      }
    }
    this.noiseForest = !this.plantedCrowns && this.trees.length < 30;
  }

  private addTo(map: Map<number, TreeSpot[]>, t: TreeSpot, _pad: number) {
    const k = this.cell(t.x, t.z);
    const l = map.get(k);
    if (l) l.push(t);
    else map.set(k, [t]);
  }

  private cell(x: number, z: number) {
    return (Math.floor(x / HASH) + 256) * 1024 + (Math.floor(z / HASH) + 256);
  }

  private addObstacle(o: Obstacle) {
    this.obstacles.push(o);
    const e = (o.kind === 0 ? o.a : Math.hypot(o.a, o.b)) + 1.5;
    const x0 = Math.floor((o.x - e) / HASH);
    const x1 = Math.floor((o.x + e) / HASH);
    const z0 = Math.floor((o.z - e) / HASH);
    const z1 = Math.floor((o.z + e) / HASH);
    for (let i = x0; i <= x1; i++) {
      for (let j = z0; j <= z1; j++) {
        const k = (i + 256) * 1024 + (j + 256);
        const l = this.obstacleHash.get(k);
        if (l) l.push(o);
        else this.obstacleHash.set(k, [o]);
      }
    }
  }

  /** Exact hard-obstacle test: inside a wall, trunk, deck, crop plot or prop (grown by `pad` metres). */
  hardBlocked(x: number, z: number, pad = 0): boolean {
    const l = this.obstacleHash.get(this.cell(x, z));
    if (!l) return false;
    for (const o of l) {
      const dx = x - o.x;
      const dz = z - o.z;
      if (o.kind === 0) {
        const r = o.a + pad;
        if (dx * dx + dz * dz < r * r) return true;
      } else {
        const lx = dx * o.c - dz * o.s;
        const lz = dx * o.s + dz * o.c;
        if (Math.abs(lx) < o.a + pad && Math.abs(lz) < o.b + pad) return true;
      }
    }
    return false;
  }

  /** Source crown shade in production; the trunk/noise stand-in is retained for source-free authoring fixtures. */
  woodAt(x: number, z: number): number {
    if (this.plantedCrowns) return clamp(this.plantedCrowns.coverAt(x, z), 0, 1);
    if (this.noiseForest) {
      const h = this.terrain.heightAt(x, z);
      const f = smoothstep(0.5, 0.78, fbm(x / 38 + 10, z / 38 - 20, 3, 44) * 0.5 + 0.5) * smoothstep(3, 8, h);
      return f * 0.8;
    }
    let sum = 0;
    const cx = Math.floor(x / HASH);
    const cz = Math.floor(z / HASH);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const l = this.treeHash.get((cx + i + 256) * 1024 + (cz + j + 256));
        if (!l) continue;
        for (const t of l) {
          const d2 = (x - t.x) * (x - t.x) + (z - t.z) * (z - t.z);
          if (d2 < 196) sum += Math.exp(-d2 / 30);
        }
      }
    }
    return 1 - Math.exp(-0.5 * sum);
  }

  /** Trees within `r` metres of a point. */
  treesNear(x: number, z: number, r: number, out: TreeSpot[] = []): TreeSpot[] {
    out.length = 0;
    const c0 = Math.floor((x - r) / HASH);
    const c1 = Math.floor((x + r) / HASH);
    const z0 = Math.floor((z - r) / HASH);
    const z1 = Math.floor((z + r) / HASH);
    for (let i = c0; i <= c1; i++) {
      for (let j = z0; j <= z1; j++) {
        const l = this.treeHash.get((i + 256) * 1024 + (j + 256));
        if (!l) continue;
        for (const t of l) if ((t.x - x) ** 2 + (t.z - z) ** 2 <= r * r) out.push(t);
      }
    }
    return out;
  }

  private scratch = new Float32Array(8);
  private streamCentre = new Float64Array(1);
  private readonly surfaceSample = { slope: 0, carve: 0 };

  private evalNode(x: number, z: number, o: Float32Array, k: number) {
    const terrain = this.terrain;
    const biome = biomeAt(x, z);
    // Soil blending and grass shade use the same planted projection at this raster node.
    const sampledCanopy = this.plantedCrowns?.coverAt(x, z);
    let open = 1;
    const road = roadWeight(x, z);
    // The worn core stays completely bare. Outside it, continuous pockets interrupt the
    // even trimmed shoulder; this affects low plants, never the graded road or support mesh.
    const shoulder = 0.43 + woodlandColonyAt(x, z) * 0.25;
    open *= 1 - smoothstep(0.025, shoulder, road);
    const carve = terrain.carveAt(x, z);
    open *= 1 - smoothstep(0.03, 0.3, carve);
    const slope = terrain.slopeAt(x, z);
    open *= 1 - smoothstep(0.55, 0.9, slope);
    open *= 1 - smoothstep(0.9, 0.975, terrain.valleyRadius(x, z));
    // Plants grow where the ground layers say soil is: not on rock, wet sand or the sea bed; a little on dry dunes.
    {
      const w = this.scratch;
      this.surfaceSample.slope = slope;
      this.surfaceSample.carve = carve;
      groundSplat(terrain, x, z, w, this.plantedCrowns, biome, sampledCanopy, undefined, road, this.surfaceSample);
      const sd = shoreDistance(x, z);
      const dune = (1 - smoothstep(12, 44, sd)) * smoothstep(9, 16, sd);
      const soil = w[LAYER.grass]! + w[LAYER.heath]! + 0.55 * w[LAYER.earth]! + 0.4 * w[LAYER.sand]! * dune + 0.12 * w[LAYER.gravel]!;
      open *= clamp(soil, 0, 1);
      if (sd < 8) open = 0;
    }
    const soft = this.softCircleHash.get(this.cell(x, z));
    if (soft) for (const c of soft) {
      const d = Math.hypot(x - c.x, z - c.z) - c.hard;
      if (d < 1.8) open *= smoothstep(0, 1.8, d);
    }
    for (const f of fieldRotations) {
      const dx = x - f.x;
      const dz = z - f.z;
      const lx = dx * f.cosine - dz * f.sine;
      const lz = dx * f.sine + dz * f.cosine;
      const e = Math.max(Math.abs(lx) - f.w / 2, Math.abs(lz) - f.d / 2);
      if (e < 1.6) open *= smoothstep(-0.2, 1.6, e);
    }
    const wd = waterDistance(x, z, this.streamCentre);
    const sd = this.streamCentre[0]!;
    const wetT = 1 - smoothstep(3, 26, sd);
    const n = fbm(x / 22, z / 22, 3, 21) * 0.5 + 0.5;
    const dry = clamp((1 - wetT * 1.2) * smoothstep(0.35, 0.75, n)
      + biome.exposure * 0.48 - biome.moisture * 0.34, 0, 1);
    const wet = Math.max(1 - smoothstep(1.5, 24, wd), biome.moisture * 0.7);
    o[k] = open * biome.grassDensity;
    o[k + 1] = wet;
    o[k + 2] = dry;
    o[k + 3] = sampledCanopy === undefined ? this.woodAt(x, z) : clamp(sampledCanopy, 0, 1);
    o[k + 4] = slope;
  }

  private tile(tx: number, tz: number): Float32Array {
    const key = (tx + 64) * 256 + (tz + 64);
    let t = this.tiles.get(key);
    if (t) return t;
    t = new Float32Array(NODES * NODES * CH);
    const x0 = WORLD.minX + tx * TILE;
    const z0 = WORLD.minZ + tz * TILE;
    for (let j = 0; j < NODES; j++) {
      for (let i = 0; i < NODES; i++) this.evalNode(x0 + i * STEP, z0 + j * STEP, t, (j * NODES + i) * CH);
    }
    this.tiles.set(key, t);
    return t;
  }

  sample(x: number, z: number, out: HabitatSample): HabitatSample {
    const gx = (x - WORLD.minX) / STEP;
    const gz = (z - WORLD.minZ) / STEP;
    const tx = Math.floor(gx / TILE_CELLS);
    const tz = Math.floor(gz / TILE_CELLS);
    const t = this.tile(tx, tz);
    const fx = gx - tx * TILE_CELLS;
    const fz = gz - tz * TILE_CELLS;
    const i0 = Math.min(TILE_CELLS - 1, Math.max(0, Math.floor(fx)));
    const j0 = Math.min(TILE_CELLS - 1, Math.max(0, Math.floor(fz)));
    const u = clamp(fx - i0, 0, 1);
    const v = clamp(fz - j0, 0, 1);
    const a = (j0 * NODES + i0) * CH;
    const b = a + CH;
    const c = a + NODES * CH;
    const d = c + CH;
    const w00 = (1 - u) * (1 - v);
    const w10 = u * (1 - v);
    const w01 = (1 - u) * v;
    const w11 = u * v;
    const q = (o: number) => t[a + o]! * w00 + t[b + o]! * w10 + t[c + o]! * w01 + t[d + o]! * w11;
    out.open = q(0);
    out.wet = q(1);
    out.dry = q(2);
    out.wood = q(3);
    out.slope = q(4);
    return out;
  }
}

export function newSample(): HabitatSample {
  return { open: 1, wet: 0, dry: 0, wood: 0, slope: 0 };
}

export const VALLEY_CENTRE = { x: VALLEY.cx, z: VALLEY.cz };
