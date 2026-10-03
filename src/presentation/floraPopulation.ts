import { DEEPWOOD, ORCHARD, WORLD } from '../world/layout';
import { deepwoodCover } from '../world/forest';
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

  const RADIUS: Record<Species, number> = { oak: 1.12, birch: 0.34, pine: 0.64, fir: 0.58, shorepine: 0.4, dead: 0.42, orchard: 0.28, shrub: 0 };
  const put = (sp: Species, x: number, z: number, scale = 1, collide = true) => {
    if (bad(x, z, collide ? RADIUS[sp] * scale + 0.55 : 0.4)) return;
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
    if (sd < DEEPWOOD.shoreClearance) return true;
    if (terrain.slopeAt(x, z) > 0.62) return true;
    if (terrain.heightAt(x, z) < 0.3) return true;
    return excl.blocked(x, z, pad);
  };

  /* ---- Deepwood: a continuous layered canopy between the deserted landing and the inland settlement ---- */
  const cell = 6.2;
  for (let gz = WORLD.minZ + 8; gz < WORLD.maxZ - 8; gz += cell) {
    for (let gx = WORLD.minX + 8; gx < WORLD.maxX - 8; gx += cell) {
      const x = gx + (rng() - 0.5) * cell * 0.9;
      const z = gz + (rng() - 0.5) * cell * 0.9;
      if (bad(x, z, 0.9)) continue;
      const h = terrain.heightAt(x, z);
      const forest = deepwoodCover(x, z);
      let density = 0;
      if (x >= -120) {
        const wd = streamDistance(x, z);
        const forestN = fbm(x / 38 + 10, z / 38 - 20, 3, 44) * 0.5 + 0.5;
        const wet = 1 - smoothstep(4, 30, wd);
        density = smoothstep(0.52, 0.8, forestN) * 0.9 + wet * 0.3 + smoothstep(4, 12, h) * 0.3;
        const vd = Math.hypot(x - 4, z - 8);
        density *= smoothstep(30, 62, vd);
      }
      const patches = fbm(x / 32 + 3, z / 32 - 8, 3, 51) * 0.5 + 0.5;
      density = Math.max(density, forest * (0.8 + patches * 0.18));
      if (rng() > density) continue;
      const damp = 1 - smoothstep(4, 30, streamDistance(x, z));
      const pick = rng();
      if (forest > 0.2) {
        // Tall columnar upper canopy alternates with spreading hardwoods and a deliberately shorter birch stratum.
        // Scales and obstacle radii are authored together, before any graphics selection happens.
        const sp: Species = pick < 0.31 ? 'oak' : pick < 0.59 ? 'pine' : pick < 0.83 ? 'fir' : 'birch';
        const sc = sp === 'birch' ? 0.66 + rng() * 0.36 : sp === 'oak' ? 0.98 + rng() * 0.3 : 1.13 + rng() * 0.26;
        if (!bad(x, z, RADIUS[sp] * sc + 0.55)) put(sp, x, z, sc);
        if (rng() < 0.36) {
          const sx = x + 2.5 + rng() * 1.3;
          const sz = z + (rng() - 0.5) * 4;
          if (!bad(sx, sz, 0.4)) put('shrub', sx, sz, 0.6 + rng() * 0.6, false);
        }
        // Young hardwoods fill occasional gaps below the old canopy, rooted in the same real terrain.
        if (rng() < 0.15) {
          const sx = x - 2.8;
          const sz = z + 2.5;
          const sc = 0.42 + rng() * 0.19;
          if (!bad(sx, sz, RADIUS.oak * sc + 0.55)) put('oak', sx, sz, sc);
        }
        continue;
      }
      const conifers = h > 8 || x < -120;
      if (conifers && pick < 0.5) put(rng() < 0.55 ? 'pine' : 'fir', x, z, 0.8 + rng() * 0.45);
      else if (damp > 0.4 && pick < 0.75) put('birch', x, z, 0.85 + rng() * 0.4);
      else put(pick < 0.7 ? 'oak' : 'birch', x, z, 0.75 + rng() * 0.5);
      if (rng() < 0.16) {
        const sx = x + 2 + rng() * 2.5, sz = z + (rng() - 0.5) * 3;
        if (!bad(sx, sz)) put('shrub', sx, sz, 0.9 + rng() * 0.6, false);
      }
    }
  }

  /* ---- The exposed forest margin: rare wind-bent specimens well inland of the empty sand ---- */
  {
    const c = 34;
    for (let gz = -140; gz < 150; gz += c) {
      for (let gx = -300; gx < -100; gx += c) {
        if (rng() > 0.36) continue;
        const x = gx + rng() * c;
        const z = gz + rng() * c;
        if (bad(x, z, 2.5) || shoreDistance(x, z) < DEEPWOOD.shoreClearance + 8 || deepwoodCover(x, z) > 0.2) continue;
        const pick = rng();
        const sp: Species = pick < 0.36 ? 'shorepine' : pick < 0.62 ? 'dead' : pick < 0.82 ? 'oak' : 'birch';
        const sc = sp === 'oak' ? 0.8 + rng() * 0.3 : 0.85 + rng() * 0.35;
        put(sp, x, z, sc);
        // Scrub gathers at the foot of a lone tree.
        const n = 2 + Math.floor(rng() * 4);
        for (let k = 0; k < n; k++) {
          const sx = x + (rng() - 0.5) * 8, sz = z + (rng() - 0.5) * 8;
          if (!bad(sx, sz)) put('shrub', sx, sz, 0.8 + rng() * 0.7, false);
        }
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
        if (bad(x, z)) continue;
        if (deepwoodCover(x, z) > 0.25) continue;
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
      if (rr < 0.86 || shoreDistance(x, z) < DEEPWOOD.shoreClearance + 8 || excl.blocked(x, z, 1)) continue;
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

/** Add stable obstacles before graphics selection. Imported trees can supply a matching wood footprint. */
export function registerFloraColliders(population: readonly FloraTree[], colliders: Pick<Colliders, 'circle'>, radiusFor: (tree: FloraTree) => number = (tree) => tree.radius): void {
  for (const tree of population) {
    if (tree.collisionId && tree.radius > 0) colliders.circle(tree.collisionId, tree.x, tree.z, radiusFor(tree));
  }
}

export const FLORA_MAX_DISTANCE = 760;

/** The low preset uses the branch-and-trunk LOD near players, keeping every obstacle visibly grounded. */
export function floraLod(quality: Quality, distance: number): 0 | 1 | 2 {
  const near = quality === 'high' ? 40 : quality === 'medium' ? 28 : 0;
  const middle = quality === 'high' ? 128 : quality === 'medium' ? 112 : 72;
  return distance < near ? 0 : distance < middle ? 1 : 2;
}
