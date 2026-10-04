import { MILL_WHEEL_CONSTRUCTION as C, millWheelPlacement } from '../world/millWheel';
import { mulberry32 } from '../world/noise';
import type { Terrain } from '../world/terrain';
import type { Region } from './regions';
import { TINT, jitterTone } from './structures';

/** The existing planked wheel is authored at its axle origin; quest presentation rotates this assembly around X. */
export function authorMillWheel(R: Region, terrain: Pick<Terrain, 'heightAt'>) {
  const placement = millWheelPlacement(terrain), rnd = mulberry32(5503);
  const spokes = 12;
  for (let i = 0; i < spokes; i++) {
    const a = i / spokes * Math.PI * 2;
    for (const side of [-1, 1]) R.timber.rod(side * 0.42, 0, 0, side * 0.42, Math.cos(a) * C.rimRadius, Math.sin(a) * C.rimRadius, 0.06, 5, jitterTone(TINT.woodDark, rnd, 0.12), { jit: 0.1, caps: false });
    R.ctx.push(0, 0, 0, 0, a, 0);
    R.planks.box(0.98, 0.5, 0.07, 0, 2.3, 0, jitterTone(TINT.wood, rnd, 0.16), { jit: 0.12, grain: 'x', rx: (rnd() - 0.5) * 0.05 });
    R.planks.box(0.98, 0.05, 0.5, 0, 2.25, 0.2, jitterTone(TINT.woodDark, rnd, 0.16), { jit: 0.12 });
    R.ctx.pop();
  }
  for (const side of [-1, 1]) {
    const points: [number, number, number][] = [];
    for (let i = 0; i <= 36; i++) {
      const a = i / 36 * Math.PI * 2;
      points.push([side * 0.42, Math.cos(a) * C.rimRadius, Math.sin(a) * C.rimRadius]);
    }
    R.timber.tube(points, 0.09, 5, jitterTone(TINT.woodDark, rnd, 0.1));
  }
  // The shaft now reaches inside the mill wall and passes through the outer bearing instead of ending in midair.
  R.timber.rod(placement.innerAxle, 0, 0, C.outerAxle, 0, 0, 0.16, 8, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });
  return placement;
}

/** Stationary wooden bearings, an anchored wall corbel and riverbed-planted outer posts support the rotating shaft. */
export function authorMillWheelSupports(R: Region, terrain: Pick<Terrain, 'heightAt'>) {
  const p = millWheelPlacement(terrain), rnd = mulberry32(5513);
  const dark = () => jitterTone(TINT.woodDark, rnd, 0.1);
  R.ctx.push(p.x, p.y, p.z);
  for (const z of [-0.58, 0.58]) {
    const floor = terrain.heightAt(p.x + C.bearingX, p.z + z) - p.y;
    R.timber.box(0.18, -floor + 0.16, 0.18, C.bearingX, floor - 0.08, z, dark(), { grain: 'y', jit: 0.08 });
    R.timber.rod(C.bearingX, -0.9, z, C.bearingX, -0.16, z > 0 ? -0.35 : 0.35, 0.055, 4, dark(), { jit: 0.08 });
  }
  R.timber.box(0.28, 0.24, 1.5, C.bearingX, -0.24, 0, dark(), { grain: 'z', jit: 0.08 });
  R.timber.box(0.34, 0.2, 0.42, C.bearingX, 0, 0, dark(), { grain: 'y', jit: 0.08 });
  const wall = p.innerAxle + 0.2;
  R.stone.box(0.48, 0.42, 0.55, wall + 0.1, -0.44, 0, jitterTone(TINT.stoneDark, rnd, 0.1), { jit: 0.08 });
  R.timber.box(0.36, 0.25, 0.38, wall + 0.18, -0.17, 0, dark(), { grain: 'x', jit: 0.08 });
  R.ctx.pop();
}
