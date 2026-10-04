import { MILL_WHEEL, bySpec } from './layout';
import type { Terrain } from './terrain';

/** Original wheel construction: dimensions cover the complete paddle sweep, not only its timber rim. */
export const MILL_WHEEL_CONSTRUCTION = {
  halfWidth: 0.52,
  rimRadius: 2.45,
  bedClearance: 0.025,
  outerAxle: 1.05,
  bearingX: 0.9,
  bearingHalfDepth: 0.75,
} as const;

export function millWheelPlacement(terrain: Pick<Terrain, 'heightAt'>) {
  const C = MILL_WHEEL_CONSTRUCTION;
  // A rotating paddle traces a disk. Fit that complete envelope above the rendered channel floor, not a centre sample.
  let y = -Infinity;
  const steps = Math.ceil(MILL_WHEEL.r * 2 / 0.12);
  for (const dx of [-C.halfWidth, 0, C.halfWidth]) {
    for (let i = 0; i <= steps; i++) {
      const dz = -MILL_WHEEL.r + i / steps * MILL_WHEEL.r * 2;
      y = Math.max(y, terrain.heightAt(MILL_WHEEL.x + dx, MILL_WHEEL.z + dz) + Math.sqrt(Math.max(0, MILL_WHEEL.r ** 2 - dz ** 2)));
    }
  }
  const wallX = bySpec('mill').x + bySpec('mill').w / 2;
  return { x: MILL_WHEEL.x, y: y + C.bedClearance, z: MILL_WHEEL.z, innerAxle: wallX - MILL_WHEEL.x - 0.2 };
}
