import {describe, expect, it} from 'vitest';
import {Habitat, newSample} from '../../src/presentation/ground/habitat';
import {Colliders} from '../../src/world/colliders';
import {Terrain} from '../../src/world/terrain';
import {Exclusions} from '../../src/presentation/vegetation';

describe('habitat crown sampling', () => {
  it('shares one planted crown sample per raster node and keeps cached tiles unchanged', () => {
    const terrain = new Terrain();
    let calls = 0;
    const field = {coverAt: () => { calls++; return .35; }, broadleafAt: () => 0};
    const habitat = new Habitat({terrain, colliders: new Colliders(), excl: new Exclusions(terrain), plantedCrowns: field});
    const first = {...habitat.sample(-180, 12, newSample())};
    expect(first.wood).toBeCloseTo(.35, 6);
    // One 32 m habitat tile contains a 17 by 17 raster, shared by soil and shade.
    expect(calls).toBe(17 * 17);
    expect(habitat.sample(-180, 12, newSample())).toEqual(first);
    expect(calls).toBe(17 * 17);
    habitat.sample(-140, 12, newSample());
    expect(calls).toBe(2 * 17 * 17);
  });

  it('retains the source-free woodland fallback for authoring fixtures', () => {
    const terrain = new Terrain();
    const habitat = new Habitat({terrain, colliders: new Colliders(), excl: new Exclusions(terrain)});
    for (const p of [{x:-180,z:12},{x:-140,z:12},{x:-2,z:36}]) {
      const sample = habitat.sample(p.x, p.z, newSample());
      expect(sample.wood).toBeCloseTo(habitat.woodAt(p.x, p.z), 6);
      expect(Object.values(sample).every(Number.isFinite)).toBe(true);
    }
  });
});

it('shares one slope query per cold habitat raster node', () => {
  const terrain = new Terrain(), originalSlope = terrain.slopeAt;
  let slopeCalls = 0;
  terrain.slopeAt = function(x, z) { slopeCalls++; return originalSlope.call(this, x, z); };
  const habitat = new Habitat({terrain, colliders: new Colliders(), excl: new Exclusions(terrain),
    plantedCrowns: {coverAt: () => .35, broadleafAt: () => 0}});
  slopeCalls = 0;
  const sample = {...habitat.sample(-180, 12, newSample())};
  expect(slopeCalls).toBe(17 * 17);
  expect(habitat.sample(-180, 12, newSample())).toEqual(sample);
  expect(slopeCalls).toBe(17 * 17);
});
