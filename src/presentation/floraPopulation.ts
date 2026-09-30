import { ORCHARD, WORLD } from '../world/layout';
import { cliffiness, shoreDistance } from '../world/coast';
import { fbm, mulberry32, smoothstep } from '../world/noise';
import { realmRadius, type Terrain } from '../world/terrain';
import type { Colliders } from '../world/colliders';
import type { Quality } from './context';
import type { Species } from './treeGen';
import { streamDistance, type Exclusions } from './vegetation';

/** Stable world population. Graphics settings choose detail after all movement obstacles are authored. */
export interface FloraTree {
  sp: Species;
  v: number;
  x: number;
  y: number;
  z: number;
  s: number;
  yaw: number;
  tint: number;
  /** Radius is nonzero only for a canonical movement obstacle. */
  radius: number;
  collisionId: string | null;
  decorationRank: number;
}

export const FLORA_VARIANTS = 3;

export function createFloraPopulation(terrain: Pick<Terrain, 'heightAt' | 'slopeAt' | 'carveAt'>, excl: Pick<Exclusions, 'blocked'>): FloraTree[] {
  const rng = mulberry32(2026);
  const trees: FloraTree[] = [];
  let id = 0;

  const RADIUS: Record<Species, number> = { oak: 0.55, birch: 0.25, pine: 0.38, fir: 0.34, shorepine: 0.34, dead: 0.42, orchard: 0.28, shrub: 0 };
  const put = (sp: Species, x: number, z: number, scale = 1, collide = true) => {
    const y = terrain.heightAt(x, z) - 0.06;
    const r = collide ? RADIUS[sp] * scale : 0;
    const collisionId = r > 0 ? `tree:${id++}` : null;
    // The visual thinning rank never consumes the population's random stream.
    const decorationRank = mulberry32(Math.imul(Math.round(x * 100), 73856093) ^ Math.imul(Math.round(z * 100), 19349663))();
    trees.push({ sp, v: Math.floor(rng() * FLORA_VARIANTS), x, y, z, s: scale, yaw: rng() * Math.PI * 2, tint: 0.82 + rng() * 0.36, radius: r, collisionId, decorationRank });
  };

  // Fixed spacing is part of world authoring; graphics settings never enter this generator.

  /** Why a spot is unsuitable for a tree: beach, water, rock, steep ground, paths, buildings. */
  const bad = (x: number, z: number, pad = 0.5) => {
    if (realmRadius(x, z) > 0.97) return true;
    const sd = shoreDistance(x, z);
    if (sd < 16) return true;
    if (terrain.slopeAt(x, z) > 0.62) return true;
    if (terrain.heightAt(x, z) < 0.3) return true;
    return excl.blocked(x, z, pad);
  };

  /* ---- Forests on the coastal plain: two belts back from the road, and the hill above the overlook ---- */
  const cell = 6.4;
  for (let gz = WORLD.minZ + 8; gz < WORLD.maxZ - 8; gz += cell) {
    for (let gx = WORLD.minX + 8; gx < WORLD.maxX - 8; gx += cell) {
      const x = gx + (rng() - 0.5) * cell * 0.9;
      const z = gz + (rng() - 0.5) * cell * 0.9;
      if (bad(x, z, 0.9)) continue;
      const sd = shoreDistance(x, z);
      const h = terrain.heightAt(x, z);
      let density = 0;
      if (x < -120) {
        // Coastal plain: forest only well back from the shore and away from the road.
        const north = smoothstep(-34, -74, z);
        const south = smoothstep(104, 130, z);
        const patches = smoothstep(0.34, 0.62, fbm(x / 34 + 3, z / 34 - 8, 3, 51) * 0.5 + 0.5);
        density = Math.max(north, south) * (0.35 + 0.65 * patches) * smoothstep(34, 86, sd);
        // A wind-shaped stand of scrub pine on the rise below the overlook.
        density = Math.max(density, smoothstep(0.55, 0.8, fbm(x / 22 - 11, z / 22 + 6, 3, 57) * 0.5 + 0.5) * smoothstep(90, 130, sd) * 0.5);
      } else {
        const wd = streamDistance(x, z);
        const forestN = fbm(x / 38 + 10, z / 38 - 20, 3, 44) * 0.5 + 0.5;
        const wet = 1 - smoothstep(4, 30, wd);
        density = smoothstep(0.52, 0.8, forestN) * 0.9 + wet * 0.3 + smoothstep(4, 12, h) * 0.3;
        const vd = Math.hypot(x - 4, z - 8);
        density *= smoothstep(30, 62, vd);
      }
      if (rng() > density) continue;
      const damp = 1 - smoothstep(4, 30, streamDistance(x, z));
      const pick = rng();
      const conifers = h > 8 || x < -120;
      if (conifers && pick < 0.5) put(rng() < 0.55 ? 'pine' : 'fir', x, z, 0.8 + rng() * 0.45);
      else if (damp > 0.4 && pick < 0.75) put('birch', x, z, 0.85 + rng() * 0.4);
      else put(pick < 0.7 ? 'oak' : 'birch', x, z, 0.75 + rng() * 0.5);
      if (rng() < 0.16) put('shrub', x + 2 + rng() * 2.5, z + (rng() - 0.5) * 3, 0.9 + rng() * 0.6, false);
    }
  }

  /* ---- The open heath: rare, characterful lone trees, mostly leaning with the wind or dead ---- */
  {
    const c = 34;
    for (let gz = -140; gz < 150; gz += c) {
      for (let gx = -300; gx < -100; gx += c) {
        if (rng() > 0.36) continue;
        const x = gx + rng() * c;
        const z = gz + rng() * c;
        if (bad(x, z, 2.5) || shoreDistance(x, z) < 26) continue;
        const pick = rng();
        const sp: Species = pick < 0.36 ? 'shorepine' : pick < 0.62 ? 'dead' : pick < 0.82 ? 'oak' : 'birch';
        const sc = sp === 'oak' ? 0.8 + rng() * 0.3 : 0.85 + rng() * 0.35;
        put(sp, x, z, sc);
        // Scrub gathers at the foot of a lone tree.
        const n = 2 + Math.floor(rng() * 4);
        for (let k = 0; k < n; k++) put('shrub', x + (rng() - 0.5) * 8, z + (rng() - 0.5) * 8, 0.8 + rng() * 0.7, false);
      }
    }
    // Scrub across the heath and on the dunes: gorse and heather, thin and patchy.
    const sc = 8.5;
    for (let gz = -150; gz < 160; gz += sc) {
      for (let gx = -290; gx < -90; gx += sc) {
        const x = gx + rng() * sc;
        const z = gz + rng() * sc;
        const p = fbm(x / 16, z / 16, 3, 71) * 0.5 + 0.5;
        if (rng() > smoothstep(0.42, 0.72, p) * 0.7) continue;
        if (realmRadius(x, z) > 0.97 || shoreDistance(x, z) < 12 || terrain.slopeAt(x, z) > 0.7 || excl.blocked(x, z, 0.5)) continue;
        if (cliffiness(z) > 0.6 && shoreDistance(x, z) < 30) continue;
        put('shrub', x, z, 0.7 + rng() * 0.9, false);
      }
    }
  }

  /* ---- Orchard rows west of the village ---- */
  for (let ox = ORCHARD.x; ox < ORCHARD.x + ORCHARD.w; ox += 5.4) {
    for (let oz = ORCHARD.z; oz < ORCHARD.z + ORCHARD.d; oz += 5.4) {
      const x = ox + (rng() - 0.5) * 0.5;
      const z = oz + (rng() - 0.5) * 0.5;
      // Orchard trunks obey the same building, field, water, and approach clearances as wild trees.
      if (bad(x, z, 0.75)) continue;
      put('orchard', x, z, 0.9 + rng() * 0.25);
    }
  }

  // Late-thaw damage: three dead trees where the flood struck.
  put('dead', 16.5, -63, 0.95);
  put('dead', -2, -78, 0.85);
  put('dead', 70, -37, 0.9);

  /* ---- Distant tree line: pine and fir beyond the open heath, without a mountain backdrop ---- */
  const pineStep = 11;
  for (let gz = WORLD.minZ + 6; gz < WORLD.maxZ - 6; gz += pineStep) {
    for (let gx = WORLD.minX + 6; gx < WORLD.maxX - 6; gx += pineStep) {
      const x = gx + (rng() - 0.5) * pineStep;
      const z = gz + (rng() - 0.5) * pineStep;
      const rr = realmRadius(x, z);
      if (rr < 0.86 || shoreDistance(x, z) < 30) continue;
      if (terrain.slopeAt(x, z) > 1.25) continue;
      if (rng() < 0.3) continue;
      put(rng() < 0.6 ? 'fir' : 'pine', x, z, 1.05 + rng() * 1.2, false);
    }
  }

  return trees;
}

/** All blocking trunks are present in every preset; only nonblocking scrub and horizon detail is thinned. */
export function selectFloraPopulation(population: readonly FloraTree[], quality: Quality): { trees: FloraTree[]; obstacles: FloraTree[] } {
  const density = quality === 'low' ? 0.42 : quality === 'medium' ? 0.7 : 1;
  return {
    trees: population.filter((tree) => tree.radius > 0 || tree.decorationRank < density),
    obstacles: population.filter((tree) => tree.radius > 0),
  };
}

/** Add canonical obstacles without consulting the graphics settings or the decorative render selection. */
export function registerFloraColliders(population: readonly FloraTree[], colliders: Pick<Colliders, 'circle'>): void {
  for (const tree of population) {
    if (tree.collisionId && tree.radius > 0) colliders.circle(tree.collisionId, tree.x, tree.z, tree.radius);
  }
}

export const FLORA_MAX_DISTANCE = 760;

/** The low preset uses the branch-and-trunk LOD near players, keeping every obstacle visibly grounded. */
export function floraLod(quality: Quality, distance: number): 0 | 1 | 2 {
  const near = quality === 'high' ? 40 : quality === 'medium' ? 28 : 0;
  const middle = quality === 'high' ? 128 : quality === 'medium' ? 112 : 72;
  return distance < near ? 0 : distance < middle ? 1 : 2;
}
