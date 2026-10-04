import { cliffiness, coastX, shoreDistance } from '../world/coast';
import type { Colliders } from '../world/colliders';
import { LIGHTHOUSE } from '../world/layout';
import { mulberry32, ridged, smoothstep } from '../world/noise';
import { clearanceAt, realmRadius, type Terrain } from '../world/terrain';
import type { Quality } from './context';
import { streamDistance } from './groundSplat';
import type { Exclusions } from './vegetation';

export const SCATTER_SHAPES = 6;

export interface ScatterRock {
  kind: 'beach' | 'surf' | 'stack' | 'erratic' | 'lighthouse';
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
}

/** Author rocks once. Neither graphics detail nor decorative geometry can change movement obstacles. */
export function createScatterPopulation(terrain: Pick<Terrain, 'heightAt' | 'slopeAt'>, exclusions: Pick<Exclusions, 'blocked'>, trunks: readonly { x: number; z: number; radius: number }[] = []): ScatterRock[] {
  const rng = mulberry32(8080);
  const rocks: ScatterRock[] = [];
  const put = (kind: ScatterRock['kind'], x: number, z: number, size: number, options: { sink: number; collide?: boolean; squash?: number; yOff?: number }) => {
    const radius = options.collide && size > 0.8 ? size * 0.72 : 0;
    // Consume the same appearance draws on every authoring pass, including excluded candidates.
    const appearance = {
      shape: Math.floor(rng() * SCATTER_SHAPES),
      yaw: rng() * Math.PI * 2,
      rx: (rng() - 0.5) * 0.25,
      rz: (rng() - 0.5) * 0.25,
      zScale: 0.8 + rng() * 0.4,
      tint: 0.9 + rng() * 0.2,
    };
    if (radius > 0 && exclusions.blocked(x, z, radius + 0.55)) return;
    // Trees are authored first. Keep their grounded movement footprints distinct from boulders;
    // decorative pebbles can still gather beneath roots without adding invisible movement obstacles.
    if (radius > 0 && trunks.some((tree) => tree.radius > 0 && Math.hypot(x - tree.x, z - tree.z) < radius + tree.radius + 0.35)) return;
    const decorationRank = mulberry32(Math.imul(Math.round(x * 100), 73856093) ^ Math.imul(Math.round(z * 100), 19349663))();
    rocks.push({
      kind, x, z, size,
      y: terrain.heightAt(x, z) + (options.yOff ?? 0) + size * 0.25 * (1 - options.sink),
      squash: options.squash ?? 1,
      ...appearance,
      radius,
      collisionId: radius > 0 ? `rock:${kind}:${x.toFixed(4)}:${z.toFixed(4)}` : null,
      decorationRank,
    });
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
  return rocks;
}

/** Every movement obstacle and offshore landmark stays visible; only nonblocking stones are thinned. */
export function selectScatterPopulation(population: readonly ScatterRock[], quality: Quality): { rocks: ScatterRock[]; obstacles: ScatterRock[] } {
  const density = quality === 'low' ? 0.55 : quality === 'medium' ? 0.8 : 1;
  return {
    rocks: population.filter((rock) => rock.radius > 0 || rock.kind === 'stack' || rock.decorationRank < density),
    obstacles: population.filter((rock) => rock.radius > 0),
  };
}

export function registerScatterColliders(population: readonly ScatterRock[], colliders: Pick<Colliders, 'circle'>): void {
  for (const rock of population) {
    if (rock.collisionId && rock.radius > 0) colliders.circle(rock.collisionId, rock.x, rock.z, rock.radius);
  }
}
