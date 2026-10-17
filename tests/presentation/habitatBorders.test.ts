import { describe, expect, it, vi } from 'vitest';
import { Habitat, newSample } from '../../src/presentation/ground/habitat';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { WORLD } from '../../src/world/layout';

type Raster = { tile(x: number, z: number): Float32Array; evalNode(x: number, z: number, out: Float32Array, k: number): void };
function fixture() {
  const terrain = new Terrain();
  const habitat = new Habitat({ terrain, colliders: new Colliders(), excl: new Exclusions(terrain), plantedCrowns: { coverAt: () => .35, broadleafAt: () => .2 } });
  return { habitat, raster: habitat as unknown as Raster };
}
function cheapNodes(raster: Raster) {
  return vi.spyOn(raster, 'evalNode').mockImplementation((x, z, out, k) => {
    for (let c = 0; c < 5; c++) out[k + c] = Math.sin(x * .03 + z * .07 + c) * .1234567;
  });
}

describe('habitat raster shared borders', () => {
  it.each([[1, 0], [-1, 0], [0, 1], [0, -1]])('reuses all 17 shared nodes toward tile (%i, %i)', (dx, dz) => {
    const { raster } = fixture(), spy = cheapNodes(raster);
    raster.tile(0, 0); const result = raster.tile(dx, dz);
    expect(spy).toHaveBeenCalledTimes(289 * 2 - 17);
    const isolated = fixture().raster; cheapNodes(isolated);
    expect(result).toEqual(isolated.tile(dx, dz)); spy.mockRestore();
  });
  it('does not evaluate shared corners twice in a contiguous 3 by 3 raster', () => {
    const { raster } = fixture(), spy = cheapNodes(raster);
    for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) {
      const actual = raster.tile(x, z), isolated = fixture().raster; cheapNodes(isolated);
      expect(actual).toEqual(isolated.tile(x, z));
    }
    expect(spy).toHaveBeenCalledTimes(49 * 49); spy.mockRestore();
  });
  it('keeps cached tile identity and does not evaluate again', () => {
    const { raster } = fixture(), spy = cheapNodes(raster), first = raster.tile(-2, 3);
    expect(raster.tile(-2, 3)).toBe(first); expect(spy).toHaveBeenCalledTimes(289); spy.mockRestore();
  });
  it('matches all real terrain channels and seam samples with independently generated tiles', () => {
    const { habitat, raster } = fixture(), size = WORLD.cell * 16;
    for (const [tx, tz] of [[3, 3], [4, 3], [4, 4], [3, 4], [2, 4]]) {
      const isolated = fixture();
      expect(raster.tile(tx!, tz!)).toEqual(isolated.raster.tile(tx!, tz!));
      for (const offset of [0, .0001, WORLD.cell, size - .0001]) {
        const x = WORLD.minX + tx! * size + offset, z = WORLD.minZ + tz! * size + offset;
        expect(habitat.sample(x, z, newSample())).toEqual(isolated.habitat.sample(x, z, newSample()));
      }
    }
  });
});
