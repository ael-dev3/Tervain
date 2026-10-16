import type { Terrain } from '../../world/terrain';
import { WORLD } from '../../world/layout';

type Ground = Pick<Terrain, 'heightAt'>;

function below(terrain: Ground, x: number, z: number, px: number, pz: number, gx: number, gz: number): number {
  return terrain.heightAt(px, pz) - gx * (px - x) - gz * (pz - z) - 0.001;
}

/** Minimum clearance along an edge, including every visible terrain-facet boundary. */
function edge(terrain: Ground, x: number, z: number, ax: number, az: number, bx: number, bz: number, gx: number, gz: number, y: number): number {
  y = Math.min(y, below(terrain, x, z, ax, az, gx, gz));
  for (let axis = 0; axis < 3; axis++) {
    const a = axis === 0 ? ax : axis === 1 ? az : ax + az;
    const b = axis === 0 ? bx : axis === 1 ? bz : bx + bz;
    if (a === b) continue;
    const origin = axis === 0 ? WORLD.minX : axis === 1 ? WORLD.minZ : WORLD.minX + WORLD.minZ;
    const first = Math.floor((Math.min(a, b) - origin) / WORLD.cell) + 1;
    const last = Math.ceil((Math.max(a, b) - origin) / WORLD.cell) - 1;
    for (let cell = first; cell <= last; cell++) {
      const t = (origin + cell * WORLD.cell - a) / (b - a);
      y = Math.min(y, below(terrain, x, z, ax + (bx - ax) * t, az + (bz - az) * t, gx, gz));
    }
  }
  return y;
}

function sameCell(a: number, b: number, origin: number): boolean {
  return Math.floor((a - origin) / WORLD.cell) === Math.floor((b - origin) / WORLD.cell);
}

/** Keep safely seated clumps; otherwise lower their plane to give every possible root 2 cm of soil overlap. */
export function grassGroundY(terrain: Ground, x: number, z: number, y: number, gx: number, gz: number, radius: number): number {
  const originalY = y;
  const x0 = x - radius, x1 = x + radius, z0 = z - radius, z1 = z + radius;
  // Inside one triangle the existing central differences already describe the exact plane.
  const stencil = Math.max(radius, 0.35);
  if (sameCell(x - stencil, x + stencil, WORLD.minX) && sameCell(z - stencil, z + stencil, WORLD.minZ)
    && sameCell(x + z - 2 * stencil, x + z + 2 * stencil, WORLD.minX + WORLD.minZ)) return y;
  y = edge(terrain, x, z, x0, z0, x1, z0, gx, gz, y);
  y = edge(terrain, x, z, x1, z0, x1, z1, gx, gz, y);
  y = edge(terrain, x, z, x1, z1, x0, z1, gx, gz, y);
  y = edge(terrain, x, z, x0, z1, x0, z0, gx, gz, y);
  for (let ix = Math.ceil((x0 - WORLD.minX) / WORLD.cell); ix <= Math.floor((x1 - WORLD.minX) / WORLD.cell); ix++) {
    for (let iz = Math.ceil((z0 - WORLD.minZ) / WORLD.cell); iz <= Math.floor((z1 - WORLD.minZ) / WORLD.cell); iz++) {
      y = Math.min(y, below(terrain, x, z, WORLD.minX + ix * WORLD.cell, WORLD.minZ + iz * WORLD.cell, gx, gz));
    }
  }
  return y < originalY ? y - 0.019 : originalY;
}
