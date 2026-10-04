import { ARRIVAL_ROUTE, DEEPWOOD, ORCHARD, WORLD } from '../world/layout';
import { deepwoodCover, forestOpeningCover, forestClearingCover, forestClearingDistance } from '../world/forest';
import { forestStandAt, FOREST_CROWN_ENVELOPE, type ForestFamilyRole } from '../world/forestStands';
import { cliffiness, shoreDistance } from '../world/coast';
import { fbm, mulberry32, smoothstep } from '../world/noise';
import { distToPolyline, realmRadius, type Terrain } from '../world/terrain';
import type { Colliders } from '../world/colliders';
import type { Quality } from './context';
import type { Species } from './treeGen';
import { streamDistance, type Exclusions } from './vegetation';
import { smoothDistanceFade } from './distanceVisibility';

export type TreeAge = 'veteran' | 'mature' | 'young' | 'sapling';
export interface FloraTree {
  sp: Species; v: number; x: number; y: number; z: number; s: number; yaw: number; tint: number;
  /** Nonzero only for a canonical movement obstacle. */
  radius: number;
  collisionId: string | null;
  decorationRank: number;
  /** Optional for developer lineups; generated wild trees expose their authoring cohorts. */
  groveId?: string;
  standId?: string;
  familyRole?: ForestFamilyRole;
  age?: TreeAge;
}

export const FLORA_VARIANTS = 3;
export const FLORA_TRUNK_GAP = 0.35;
/** Local exclusions can affect spacing neighbours, never a chain across the world. */
export const FLORA_EDIT_INFLUENCE = 16;
const RADIUS: Record<Species, number> = { oak: 1.12, birch: 0.34, pine: 0.64, fir: 0.58, shorepine: 0.4, dead: 0.42, orchard: 0.28, shrub: 0 };
function hashKey(key: string, salt = 0): number {
  let hash = (2166136261 ^ salt ^ 2026) >>> 0;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
  return hash;
}
const randomFor = (key: string, salt = 0) => mulberry32(hashKey(key, salt));
type CanopySpecies = 'oak' | 'pine' | 'fir' | 'birch';
interface Grove { id: string; x: number; z: number; radius: number; dominant: CanopySpecies; companion: CanopySpecies; accent: CanopySpecies; tint: number; role?: ForestFamilyRole; regrowth?: number }
interface Candidate { key: string; priority: number; footprint: number; tree: FloraTree }

/** Coordinate-keyed groves and symmetric spacing keep the layout stable through local authoring edits.
 * Optional source geometry supplies grounding first, then footprints for exclusions and spacing. */
export function createFloraPopulation(terrain: Pick<Terrain, 'heightAt' | 'slopeAt' | 'carveAt'>, excl: Pick<Exclusions, 'blocked'>,
  footprintFor?: (tree: Readonly<FloraTree>, legacyFootprint: number) => number,
  groundFor?: (tree: Readonly<FloraTree>) => number): FloraTree[] {
  const candidates: Candidate[] = [], groves = new Map<string, Grove>();
  const grove = (ix: number, iz: number): Grove => {
    const id = `grove:${ix}:${iz}`, found = groves.get(id);
    if (found) return found;
    const rnd = randomFor(id, 101);
    const x = (ix + 0.25 + rnd() * 0.5) * 48, z = (iz + 0.25 + rnd() * 0.5) * 48;
    const radius = 18 + rnd() * 17, pick = rnd();
    const wet = 1 - smoothstep(4, 30, streamDistance(x, z)), high = terrain.heightAt(x, z) > 8;
    const dominant: CanopySpecies = wet > 0.55 ? 'birch' : high ? (pick < 0.55 ? 'pine' : 'fir') : pick < 0.5 ? 'oak' : pick < 0.77 ? 'pine' : 'fir';
    const companion: CanopySpecies = dominant === 'oak' ? (rnd() < 0.55 ? 'birch' : 'fir') : dominant === 'birch' ? 'oak' : dominant === 'pine' ? 'fir' : 'pine';
    const accent: CanopySpecies = dominant === 'oak' || dominant === 'birch' ? 'pine' : 'oak';
    const result = { id, x, z, radius, dominant, companion, accent, tint: 0.95 + rnd() * 0.07 };
    groves.set(id, result); return result;
  };
  const grovesAt = (x: number, z: number) => {
    const ix = Math.floor(x / 48), iz = Math.floor(z / 48), nearby: { grove: Grove; d: number }[] = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const g = grove(ix + dx, iz + dz);
      nearby.push({ grove: g, d: Math.hypot(x - g.x, z - g.z) / g.radius });
    }
    nearby.sort((a, b) => a.d - b.d || a.grove.id.localeCompare(b.grove.id));
    return { first: nearby[0]!.grove, second: nearby[1]!.grove, blend: (1 - smoothstep(0, 0.45, nearby[1]!.d - nearby[0]!.d)) * 0.35 };
  };
  const bad = (x: number, z: number, pad: number) => realmRadius(x, z) > 0.97
    || shoreDistance(x, z) < DEEPWOOD.shoreClearance || terrain.slopeAt(x, z) > 0.62
    || terrain.heightAt(x, z) < 0.3 || excl.blocked(x, z, pad);
  const put = (key: string, sp: Species, x: number, z: number, scale = 1, collide = true, age: TreeAge = 'mature', site?: Grove) => {
    // Avoid constructing and sampling source roots at a site already excluded even without padding.
    if (bad(x, z, 0)) return;
    const legacyFootprint = sp === 'shrub' ? 0.4 * scale : RADIUS[sp] * scale;
    const rnd = randomFor(key, 211), radius = collide ? RADIUS[sp] * scale : 0;
    // Appearance has its own cell stream: evaluating a rejected claim never changes its neighbours.
    const tree: FloraTree = {
      sp, v: Math.floor(rnd() * FLORA_VARIANTS), x, y: terrain.heightAt(x, z) - 0.06, z, s: scale,
      yaw: rnd() * Math.PI * 2, tint: (site?.tint ?? 0.98) * (0.97 + rnd() * 0.06), radius,
      collisionId: radius > 0 ? `tree:${key}` : null, decorationRank: randomFor(key, 619)(),
      ...(site ? { groveId: site.id, ...(site.role ? { standId: site.id, familyRole: site.role } : {}) } : {}), age,
    };
    if (groundFor) {
      tree.y = groundFor(tree);
      if (!Number.isFinite(tree.y)) throw new Error('Tree ground contact must be finite.');
    }
    const footprint = footprintFor?.(tree, legacyFootprint) ?? legacyFootprint;
    if (!Number.isFinite(footprint) || footprint < 0) throw new Error('Tree footprint must be finite and nonnegative.');
    if (bad(x, z, footprint + 0.55)) return;
    const crown = sp in FOREST_CROWN_ENVELOPE ? FOREST_CROWN_ENVELOPE[sp as CanopySpecies] * scale : footprint;
    if (forestClearingDistance(x, z) < crown + 0.5) return;
    if (radius > 0) tree.radius = footprint;
    candidates.push({ key, priority: randomFor(key, 431)(), footprint, tree });
  };
  const ageAndScale = (sp: CanopySpecies, rnd: () => number, regrowth = 0.5): { age: TreeAge; scale: number } => {
    const pick = rnd(), veteran = 0.22 - regrowth * 0.14, mature = 0.84 - regrowth * 0.18;
    const age: TreeAge = pick < veteran ? 'veteran' : pick < mature ? 'mature' : pick < 0.95 ? 'young' : 'sapling';
    const tier = sp === 'birch' ? 0.76 : sp === 'oak' ? 1 : 1.16;
    const scale = age === 'veteran' ? 1.22 + rnd() * 0.24 : age === 'mature' ? 0.94 + rnd() * 0.25 : age === 'young' ? 0.55 + rnd() * 0.24 : 0.28 + rnd() * 0.16;
    return { age, scale: scale * tier };
  };

  // Position, acceptance, grove choice and appearance use independent cell keys. Rejection never
  // consumes another cell's random values or renumbers its movement obstacle.
  const cell = 6.2;
  for (let iz = 0, gz = WORLD.minZ + 8; gz < WORLD.maxZ - 8; gz += cell, iz++) {
    for (let ix = 0, gx = WORLD.minX + 8; gx < WORLD.maxX - 8; gx += cell, ix++) {
      const key = `wild:${ix}:${iz}`, pos = randomFor(key, 1);
      const x = gx + (pos() - 0.5) * cell * 0.9, z = gz + (pos() - 0.5) * cell * 0.9;
      const forest = deepwoodCover(x, z), rnd = randomFor(key, 7);
      const wet = 1 - smoothstep(4, 30, streamDistance(x, z)), height = terrain.heightAt(x, z);
      let density = 0;
      if (x >= -120) {
        const noise = fbm(x / 38 + 10, z / 38 - 20, 3, 44) * 0.5 + 0.5;
        density = (smoothstep(0.52, 0.8, noise) * 0.8 + wet * 0.3 + smoothstep(4, 12, height) * 0.26)
          * smoothstep(30, 62, Math.hypot(x - 4, z - 8));
      }
      const patch = smoothstep(-0.32, 0.5, fbm(x / 61 + 3, z / 61 - 8, 3, 51));
      const shoulder = 0.42 + 0.58 * smoothstep(3.4, 10 + fbm(x / 19, z / 19, 2, 71) * 2.5, distToPolyline(x, z, ARRIVAL_ROUTE).d);
      density = Math.max(density, forest * (0.60 + patch * 0.26) * shoulder * forestOpeningCover(x, z)) * forestClearingCover(x, z);
      if (rnd() > density) continue;
      const g = grovesAt(x, z), selected = rnd() < g.blend ? g.second : g.first, pick = rnd();
      let sp: CanopySpecies = pick < 0.76 ? selected.dominant : pick < 0.94 ? selected.companion : selected.accent;
      let site = selected;
      if (forest > 0.15) {
        const stand = forestStandAt(x, z);
        sp = stand.sp;
        site = { ...selected, id: stand.id, tint: stand.tint, role: stand.role, regrowth: stand.regrowth };
      }
      if (forest <= 0.15) sp = height > 8 ? (rnd() < 0.6 ? 'pine' : 'fir') : wet > 0.4 ? 'birch' : sp;
      const { age, scale } = ageAndScale(sp, rnd, site.regrowth);
      put(key, sp, x, z, scale, true, age, site);
      if (forest > 0.2 && age !== 'sapling' && rnd() < 0.18) {
        const child = randomFor(`${key}:sapling`, 13), angle = child() * Math.PI * 2, reach = 3.5 + child() * 2.8;
        const cx = x + Math.cos(angle) * reach, cz = z + Math.sin(angle) * reach;
        const stand = forestStandAt(cx, cz);
        put(`${key}:sapling`, stand.sp, cx, cz, 0.28 + child() * 0.18, true, 'sapling',
          { ...site, id: stand.id, role: stand.role, tint: stand.tint });
      }
      if (rnd() < (forest > 0.2 ? 0.3 : 0.16)) {
        const child = randomFor(`${key}:scrub`, 17), angle = child() * Math.PI * 2, reach = 2.2 + child() * 2.7;
        put(`${key}:scrub`, 'shrub', x + Math.cos(angle) * reach, z + Math.sin(angle) * reach, 0.6 + child() * 0.7, false, 'young', site);
      }
    }
  }

  // The empty coast retains sparse exposed specimens and scrub, with separate local seeds.
  for (let iz = 0, gz = -140; gz < 150; gz += 34, iz++) for (let ix = 0, gx = -300; gx < -100; gx += 34, ix++) {
    const key = `edge:${ix}:${iz}`, rnd = randomFor(key, 23);
    if (rnd() > 0.36) continue;
    const x = gx + rnd() * 34, z = gz + rnd() * 34;
    if (shoreDistance(x, z) < DEEPWOOD.shoreClearance + 8 || deepwoodCover(x, z) > 0.2) continue;
    const pick = rnd(), sp: Species = pick < 0.36 ? 'shorepine' : pick < 0.62 ? 'dead' : pick < 0.82 ? 'oak' : 'birch';
    put(key, sp, x, z, 0.8 + rnd() * 0.35);
    const count = 2 + Math.floor(rnd() * 4);
    for (let k = 0; k < count; k++) {
      const child = randomFor(`${key}:scrub:${k}`, 29), angle = child() * Math.PI * 2, reach = 2.5 + child() * 3;
      put(`${key}:scrub:${k}`, 'shrub', x + Math.cos(angle) * reach, z + Math.sin(angle) * reach, 0.7 + child() * 0.6, false);
    }
  }
  for (let iz = 0, gz = -150; gz < 160; gz += 8.5, iz++) for (let ix = 0, gx = -290; gx < -90; gx += 8.5, ix++) {
    const key = `heath:${ix}:${iz}`, rnd = randomFor(key, 31), x = gx + rnd() * 8.5, z = gz + rnd() * 8.5;
    if (rnd() > smoothstep(0.42, 0.72, fbm(x / 16, z / 16, 3, 71) * 0.5 + 0.5) * 0.7 || deepwoodCover(x, z) > 0.25) continue;
    if (cliffiness(z) > 0.6 && shoreDistance(x, z) < 30) continue;
    put(key, 'shrub', x, z, 0.7 + rnd() * 0.9, false);
  }
  for (let ix = 0, ox = ORCHARD.x; ox < ORCHARD.x + ORCHARD.w; ox += 5.4, ix++) for (let iz = 0, oz = ORCHARD.z; oz < ORCHARD.z + ORCHARD.d; oz += 5.4, iz++) {
    const key = `orchard:${ix}:${iz}`, rnd = randomFor(key, 37);
    put(key, 'orchard', ox + (rnd() - 0.5) * 0.5, oz + (rnd() - 0.5) * 0.5, 0.9 + rnd() * 0.25);
  }
  for (const [index, point] of [{ x: 16.5, z: -63, s: 0.95 }, { x: -2, z: -78, s: 0.85 }, { x: 70, z: -37, s: 0.9 }].entries()) put(`flood:${index}`, 'dead', point.x, point.z, point.s);
  for (let iz = 0, gz = WORLD.minZ + 6; gz < WORLD.maxZ - 6; gz += 11, iz++) for (let ix = 0, gx = WORLD.minX + 6; gx < WORLD.maxX - 6; gx += 11, ix++) {
    const key = `horizon:${ix}:${iz}`, rnd = randomFor(key, 41), x = gx + (rnd() - 0.5) * 11, z = gz + (rnd() - 0.5) * 11;
    if (realmRadius(x, z) < 0.86 || shoreDistance(x, z) < DEEPWOOD.shoreClearance + 8 || rnd() < 0.3) continue;
    put(key, rnd() < 0.6 ? 'fir' : 'pine', x, z, 1.05 + rnd() * 1.2, false);
  }

  // Symmetric priority suppression, not greedy insertion: every valid candidate has a fixed claim,
  // including suppressed ones. Removing a claim cannot expose a distant chain of new trees.
  const bucketSize = 8, buckets = new Map<string, Candidate[]>();
  let maximumFootprint = 0;
  for (const c of candidates) {
    maximumFootprint = Math.max(maximumFootprint, c.footprint);
    const id = `${Math.floor(c.tree.x / bucketSize)}:${Math.floor(c.tree.z / bucketSize)}`, bucket = buckets.get(id) ?? [];
    bucket.push(c); buckets.set(id, bucket);
  }
  return candidates.filter(c => {
    const ix = Math.floor(c.tree.x / bucketSize), iz = Math.floor(c.tree.z / bucketSize);
    const reach = Math.ceil((c.footprint + maximumFootprint + FLORA_TRUNK_GAP) / bucketSize);
    for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) for (const other of buckets.get(`${ix + dx}:${iz + dz}`) ?? []) {
      if (other === c || other.priority < c.priority || (other.priority === c.priority && other.key > c.key)) continue;
      if (Math.hypot(c.tree.x - other.tree.x, c.tree.z - other.tree.z) < c.footprint + other.footprint + FLORA_TRUNK_GAP) return false;
    }
    return true;
  }).map(c => c.tree);
}

/** Presets retain all blocking trunks and thin only decorative scrub and horizon detail. */
export function selectFloraPopulation(population: readonly FloraTree[], quality: Quality): { trees: FloraTree[]; obstacles: FloraTree[] } {
  const density = quality === 'low' ? 0.42 : quality === 'medium' ? 0.7 : 1;
  return { trees: population.filter(tree => tree.radius > 0 || tree.decorationRank < density), obstacles: population.filter(tree => tree.radius > 0) };
}

/** Add stable obstacles before graphics selection. Imported trees can supply a matching wood footprint. */
export function registerFloraColliders(population: readonly FloraTree[], colliders: Pick<Colliders, 'circle'>, radiusFor: (tree: FloraTree) => number = (tree) => tree.radius): void {
  for (const tree of population) {
    if (tree.collisionId && tree.radius > 0) colliders.circle(tree.collisionId, tree.x, tree.z, radiusFor(tree));
  }
}
// Keep trees beyond the playable realm, then fade only into dense distance haze.
export const FLORA_FADE_START = 900;
export const FLORA_MAX_DISTANCE = 1020;
export const FLORA_LOD_BANDS: Record<Quality, { near: readonly [number, number]; middle: readonly [number, number] }> = {
  high: { near: [FLORA_MAX_DISTANCE, FLORA_MAX_DISTANCE], middle: [FLORA_MAX_DISTANCE, FLORA_MAX_DISTANCE] },
  medium: { near: [120, 180], middle: [480, 620] },
  low: { near: [0, 0], middle: [64, 96] },
};
/** High keeps the exact source mesh at every visible distance: no simplified trunk,
 * missing lower branches, or crossed crown impostor can change its silhouette while moving.
 * Other presets retain complementary pixel coverage over broad distance bands. */
export function floraLodWeights(quality: Quality, distance: number): readonly [number, number, number] {
  if (quality === 'high') return [1, 0, 0];
  const bands = FLORA_LOD_BANDS[quality];
  const near = quality === 'low' ? 0 : smoothDistanceFade(distance, ...bands.near);
  const middle = smoothDistanceFade(distance, ...bands.middle);
  return [near, middle - near, 1 - middle];
}
/** Dominant level for inspections and non-render consumers. Actual drawing crossfades both adjacent levels. */
export function floraLod(quality: Quality, distance: number): 0 | 1 | 2 {
  const weights = floraLodWeights(quality, distance);
  return weights[0] >= weights[1] && weights[0] >= weights[2] ? 0 : weights[1] >= weights[2] ? 1 : 2;
}
