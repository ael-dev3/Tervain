import { groundedRockY, rockContactGeometry, SCATTER_SHAPES } from './rockGeometry';
import type { PhysicalRockGeometry } from '../world/physicsGeometry';
export { SCATTER_SHAPES } from './rockGeometry';
import { cliffiness, coastX, shoreDistance } from '../world/coast';
import type { Colliders } from '../world/colliders';
import { LIGHTHOUSE } from '../world/layout';
import { mulberry32, ridged, smoothstep } from '../world/noise';
import { clearanceAt, realmRadius, type Terrain } from '../world/terrain';
import type { Quality } from './context';
import { streamDistance } from './groundSplat';
import type { Exclusions } from './vegetation';


export interface ScatterRock {
  kind: 'beach' | 'surf' | 'stack' | 'erratic' | 'lighthouse' | 'shelf';
  x: number;
  y: number;
  z: number;
  size: number;
  shape: number;
  yaw: number;
  rx: number;
  rz: number;
  squash: number;
  zScale: number;
  tint: number;
  radius: number;
  collisionId: string | null;
  decorationRank: number;
  contact?: PhysicalRockGeometry;
}

/** Author rocks once. Neither graphics detail nor decorative geometry can change movement obstacles. */
export function createScatterPopulation(terrain: Pick<Terrain, 'heightAt' | 'slopeAt'>, exclusions: Pick<Exclusions, 'blocked'>, trunks: readonly { x: number; z: number; radius: number }[] = []): ScatterRock[] {
  const rng = mulberry32(8080);
  const rocks: ScatterRock[] = [];
  const put = (kind: ScatterRock['kind'], x: number, z: number, size: number, options: { sink: number; collide?: boolean; squash?: number; yOff?: number; tint?: number }, appearanceRandom = rng) => {
    const radius = options.collide && size > 0.8 ? size * 0.72 : 0;
    // Consume the same appearance draws on every authoring pass, including excluded candidates.
    const appearance = {
      shape: Math.floor(appearanceRandom() * SCATTER_SHAPES),
      yaw: appearanceRandom() * Math.PI * 2,
      rx: (appearanceRandom() - 0.5) * 0.25,
      rz: (appearanceRandom() - 0.5) * 0.25,
      zScale: 0.8 + appearanceRandom() * 0.4,
      tint: (0.9 + appearanceRandom() * 0.2) * (options.tint ?? 1),
    };
    if (radius > 0 && exclusions.blocked(x, z, radius + 0.55)) return;
    // Trees are authored first. Keep their grounded movement footprints distinct from boulders;
    // decorative pebbles can still gather beneath roots without adding invisible movement obstacles.
    if (radius > 0 && trunks.some((tree) => tree.radius > 0 && Math.hypot(x - tree.x, z - tree.z) < radius + tree.radius + 0.35)) return;
    const decorationRank = mulberry32(Math.imul(Math.round(x * 100), 73856093) ^ Math.imul(Math.round(z * 100), 19349663))();
    const rock: ScatterRock = {
      kind, x, z, size, y: 0,
      squash: options.squash ?? 1,
      ...appearance,
      radius,
      collisionId: radius > 0 ? `rock:${kind}:${x.toFixed(4)}:${z.toFixed(4)}` : null,
      decorationRank,
    };
    rock.y = groundedRockY(rock, (px, pz) => terrain.heightAt(px, pz), size * (.02 + options.sink * .09));
    // Sea stacks intentionally rise above their seabed; ordinary boulders are grounded native pieces.
    if (kind === 'stack') rock.y += options.yOff ?? 0;
    if (size >= .35) rock.contact = rockContactGeometry(rock, rock.collisionId ?? `rock-surface:${kind}:${x.toFixed(4)}:${z.toFixed(4)}`);
    rocks.push(rock);
  };

  // The authored high-detail pebble pass keeps its existing seed stream. Presets thin the result afterward.
  for (let z = -170; z < 170; z += 3.2) {
    if (cliffiness(z) > 0.85) continue;
    for (let k = 0; k < 3; k++) {
      const sd = 0.5 + rng() * 11;
      const zz = z + rng() * 3.2;
      const x = coastX(zz) + sd;
      if (realmRadius(x, zz) > 0.97 || terrain.heightAt(x, zz) < 0.05) continue;
      const n = 3 + Math.floor(rng() * 6);
      for (let q = 0; q < n; q++) put('beach', x + (rng() - 0.5) * 1.6, zz + (rng() - 0.5) * 1.6, 0.06 + rng() * 0.2, { sink: 0.5 });
    }
  }
  for (let z = -170; z < 170; z += 2.6) {
    const cl = cliffiness(z);
    if (rng() > 0.12 + cl * 0.8) continue;
    const x = coastX(z) - 22 + rng() * 34;
    if (x < -375) continue;
    const h = terrain.heightAt(x, z);
    if (h < -2.2) continue;
    if (h < 0.4 || cl > 0.4) put('surf', x, z, 0.5 + rng() * (0.9 + cl * 1.8), { sink: 0.5, collide: h > -0.6, squash: 1.1 });
  }
  for (const [x, z, size] of [[-366, 82, 4.6], [-372, 96, 3.4], [-360, 120, 5.4], [-355, 132, 3.6], [-344, 60, 3.0], [-330, 150, 4.2]] as const) {
    const y = terrain.heightAt(x, z);
    if (y < -0.3 && y > -6) put('stack', x, z, size, { sink: 0.25, squash: 1.7, yOff: 0.4 });
  }
  for (let gz = -160; gz < 165; gz += 9.5) {
    for (let gx = -290; gx < 190; gx += 9.5) {
      const x = gx + rng() * 9.5;
      const z = gz + rng() * 9.5;
      if (realmRadius(x, z) > 0.98 || shoreDistance(x, z) < 14) continue;
      const rockiness = ridged(x / 14, z / 14, 3, 33) + terrain.slopeAt(x, z) * 0.6;
      if (rng() > smoothstep(0.42, 0.85, rockiness) * 0.55) continue;
      if (clearanceAt(x, z) < 0.5 || streamDistance(x, z) < 3) continue;
      put('erratic', x, z, 0.35 + rng() * rng() * 2.2, { collide: true, sink: 0.4 });
    }
  }
  for (let i = 0; i < 22; i++) {
    const a = rng() * Math.PI * 2;
    const radius = 12 + rng() * 26;
    const x = LIGHTHOUSE.x + Math.cos(a) * radius;
    const z = LIGHTHOUSE.z + Math.sin(a) * radius;
    if (terrain.heightAt(x, z) < 0.4) continue;
    put('lighthouse', x, z, 0.7 + rng() * 1.8, { sink: 0.35, collide: true });
  }
  // Broken shelf stone gathers at a few dry sand/grass transitions rather than ringing the bay
  // with equally spaced boulders. An independent stream preserves all previous rock identities.
  for (let cell = -15; cell <= 15; cell++) {
    const shelfRandom = mulberry32(51913 ^ Math.imul(cell, 83492791));
    if (shelfRandom() > 0.5) continue;
    const z = cell * 10 + (shelfRandom() - 0.5) * 7;
    const x = coastX(z) + 24 + shelfRandom() * 18;
    const h = terrain.heightAt(x, z);
    if (h < 1.4 || h > 11.5 || terrain.slopeAt(x, z) > 0.65 || realmRadius(x, z) > 0.96) continue;
    const count = 3 + Math.floor(shelfRandom() * 3);
    const az = shelfRandom() * Math.PI * 2;
    for (let stone = 0; stone < count; stone++) {
      // Each stone has its own stream: rejecting one near source wood cannot move or recolor its neighbours.
      const stoneRandom = mulberry32(51919 ^ Math.imul(cell, 83492791) ^ Math.imul(stone + 1, 93051));
      const size = stone === 0 ? 1.25 + stoneRandom() * 1.45 : 0.4 + stoneRandom() * 0.7;
      const spread = stone === 0 ? 0 : 1.7 + stoneRandom() * 2.8;
      const a = az + stone * 1.8;
      const px = x + Math.cos(a) * spread, pz = z + Math.sin(a) * spread;
      const py = terrain.heightAt(px, pz);
      // Even the low companions respect whole-object approaches, not just the boulder proxy.
      if (py < 0.8 || py > 12 || terrain.slopeAt(px, pz) > 0.72 || exclusions.blocked(px, pz, size * 1.25 + 0.55)) continue;
      if (trunks.some(tree => tree.radius > 0 && Math.hypot(px - tree.x, pz - tree.z) < tree.radius + size * 1.25 + 0.35)) continue;
      put('shelf', px, pz, size, { sink: 0.5, collide: true, squash: 0.72 + stoneRandom() * 0.16, tint: 0.67 + stoneRandom() * 0.14 }, stoneRandom);
    }
  }
  return rocks;
}

export interface ShoreDetail {
  kind: 'driftwood' | 'scrub';
  x: number; y: number; z: number; yaw: number; scale: number; rank: number; seed: number;
}

/** Low shore detail is independent of rock geometry, preset and unrelated inland decoration.
 * Roots and whole driftwood envelopes stay away from routes, pickups, doors and source wood. */
export function createShoreDetailPopulation(terrain: Pick<Terrain, 'heightAt' | 'slopeAt'>, exclusions: Pick<Exclusions, 'blocked'>,
  trunks: readonly { x: number; z: number; radius: number }[] = []): ShoreDetail[] {
  const details: ShoreDetail[] = [];
  for (let cell = -15; cell <= 15; cell++) {
    for (let lane = 0; lane < 2; lane++) {
      const seed = 51917 ^ Math.imul(cell, 83492791) ^ Math.imul(lane, 93051), rnd = mulberry32(seed);
      for (const kind of ['driftwood', 'scrub'] as const) {
        const z = cell * 10 + (rnd() - 0.5) * 7;
        const x = coastX(z) + (kind === 'driftwood' ? 5 + rnd() * 22 : 24 + rnd() * 20);
        const scale = kind === 'driftwood' ? 1.6 + rnd() * 2.7 : 0.72 + rnd() * 0.65;
        const y = terrain.heightAt(x, z), yaw = rnd() * Math.PI * 2, rank = rnd(), chance = rnd();
        const reach = kind === 'driftwood' ? scale * 0.65 + 0.2 : scale * 0.9;
        if (chance > (kind === 'driftwood' ? 0.72 : 0.55) || realmRadius(x, z) > 0.96) continue;
        if (y < 0.18 || y > (kind === 'driftwood' ? 3.2 : 11.5) || terrain.slopeAt(x, z) > (kind === 'driftwood' ? 0.16 : 0.5)) continue;
        if (exclusions.blocked(x, z, reach)) continue;
        if (trunks.some(tree => tree.radius > 0 && Math.hypot(x - tree.x, z - tree.z) < tree.radius + reach + 0.3)) continue;
        // Accepted pieces cannot interpenetrate another connected wood or scrub envelope.
        if (details.some(other => Math.hypot(x - other.x, z - other.z) < reach + (other.kind === 'driftwood' ? other.scale * 0.65 + 0.2 : other.scale * 0.9))) continue;
        details.push({ kind, x, y, z, yaw, scale, rank, seed: seed ^ (kind === 'scrub' ? 9173 : 0) });
      }
    }
  }
  return details;
}

/** Every movement obstacle and offshore landmark stays visible; only nonblocking stones are thinned. */
export function selectScatterPopulation(population: readonly ScatterRock[], quality: Quality): { rocks: ScatterRock[]; obstacles: ScatterRock[] } {
  const density = quality === 'low' ? 0.55 : quality === 'medium' ? 0.8 : 1;
  return {
    rocks: population.filter((rock) => rock.contact || rock.radius > 0 || rock.kind === 'stack' || rock.decorationRank < density),
    obstacles: population.filter((rock) => rock.radius > 0),
  };
}

export function registerScatterColliders(population: readonly ScatterRock[], colliders: Pick<Colliders, 'circle' | 'registerRockMesh'>): void {
  for (const rock of population) {
    if (rock.contact) colliders.registerRockMesh(rock.contact);
    if (rock.collisionId && rock.radius > 0) colliders.circle(rock.collisionId, rock.x, rock.z, rock.radius, true, rock.contact
      ? { minY: rock.contact.bounds.minY, maxY: rock.contact.bounds.maxY, rockMesh: rock.contact } : {});
  }
}
