import { describe, expect, it } from 'vitest';
import { Habitat, newSample, woodlandColonyAt } from '../../src/presentation/ground/habitat';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders } from '../../src/world/colliders';
import { Terrain, roadWeight } from '../../src/world/terrain';
import { ARRIVAL_ROUTE } from '../../src/world/layout';
import { biomeAt } from '../../src/world/biomes';
import { groundSplat } from '../../src/presentation/groundSplat';
import { LAYER } from '../../src/presentation/terrainTextures';

describe('ground habitat beneath planted crowns', () => {
  it('has smooth, bounded shared colony pockets at more than one scale without a patch grid seam', () => {
    let low = 1, high = 0, maximumStep = 0;
    for (let z = -100; z <= 100; z += 5) for (let x = -250; x <= -80; x += 5) {
      const value = woodlandColonyAt(x, z);
      low = Math.min(low, value); high = Math.max(high, value);
      maximumStep = Math.max(maximumStep, Math.abs(value - woodlandColonyAt(x + 0.01, z)));
      expect(woodlandColonyAt(x, z)).toBe(value);
    }
    expect(low).toBeGreaterThanOrEqual(0); expect(high).toBeLessThanOrEqual(1);
    expect(high - low).toBeGreaterThan(0.6);
    expect(maximumStep).toBeLessThan(0.003);
  });
  it('reads source-derived shade even with no logical tree collider and respects an explicitly empty canopy', () => {
    const terrain = new Terrain(), colliders = new Colliders(), excl = new Exclusions(terrain);
    const shade = { coverAt: (x: number) => Math.max(0, Math.min(1, (x + 200) / 40)), broadleafAt: () => 0 };
    const habitat = new Habitat({ terrain, colliders, excl, plantedCrowns: shade });
    for (const [x, expected] of [[-200, 0], [-190, 0.25], [-180, 0.5], [-160, 1]]) {
      expect(habitat.woodAt(x!, 10)).toBe(expected);
      expect(habitat.sample(x!, 10, newSample()).wood).toBeCloseTo(expected!, 6);
    }
    colliders.circle('tree:fixture', -180, 10, 1.4);
    const bare = new Habitat({ terrain, colliders, excl, plantedCrowns: { coverAt: () => 0, broadleafAt: () => 0 } });
    expect(bare.woodAt(-180, 10)).toBe(0);
    expect(bare.hardBlocked(-180, 10)).toBe(true);
  });

  it('keeps physical trunk exclusion independent of broad canopy reach and palette shade', () => {
    const terrain = new Terrain(), colliders = new Colliders(), excl = new Exclusions(terrain);
    colliders.circle('tree:fixture', -180, 10, 1.4);
    const habitat = new Habitat({ terrain, colliders, excl, plantedCrowns: { coverAt: () => 0.75, broadleafAt: () => 0.5 } });
    expect(habitat.woodAt(-176, 10)).toBe(0.75);
    expect(habitat.hardBlocked(-176, 10)).toBe(false);
    expect(habitat.hardBlocked(-178.6, 10, 0.2)).toBe(true);
    expect(habitat.treesNear(-178, 10, 3)).toEqual([{ x: -180, z: 10, r: 1.4 }]);
  });

  it('coordinates warm and humid plant cues with the soil while keeping the arrival track clear', () => {
    const terrain = new Terrain(), colliders = new Colliders(), excl = new Exclusions(terrain);
    const habitat = new Habitat({ terrain, colliders, excl, plantedCrowns: { coverAt: () => 0, broadleafAt: () => 0 } });
    const swale = habitat.sample(-205, -8, newSample()), warm = habitat.sample(-54, 20, newSample());
    expect(swale.wet).toBeGreaterThanOrEqual(biomeAt(-205, -8).moisture * 0.65);
    expect(swale.wet).toBeGreaterThan(warm.wet + 0.25);
    expect(warm.dry).toBeGreaterThan(swale.dry + 0.2);
    // Fertile soil is not a logical crown: an explicitly empty planted field stays empty.
    expect(swale.wood).toBe(0);
    for (let i = 1; i < ARRIVAL_ROUTE.length; i++) {
      const a = ARRIVAL_ROUTE[i - 1]!, b = ARRIVAL_ROUTE[i]!;
      for (let k = 0; k <= 5; k++) {
        const x = a.x + (b.x - a.x) * k / 5, z = a.z + (b.z - a.z) * k / 5;
        expect(habitat.sample(x, z, newSample()).open).toBeLessThan(0.08);
      }
    }
  });

  it('preserves authoritative track, cliff and tidal layers over the overlapping biome soil', () => {
    const terrain = new Terrain(), weights = new Float32Array(8);
    for (const [x, z] of [[-205, -8], [-174, -76], [-52, 20], [-266, -82], [-283, 124]]) {
      const wet = groundSplat(terrain, x!, z!, weights, { coverAt: () => 0, broadleafAt: () => 0 });
      expect([...weights].reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 6);
      expect([...weights].every(weight => Number.isFinite(weight) && weight >= 0 && weight <= 1)).toBe(true);
      expect(wet).toBeGreaterThanOrEqual(0);
      expect(wet).toBeLessThanOrEqual(1);
    }
    for (const point of ARRIVAL_ROUTE.slice(1, -1)) {
      groundSplat(terrain, point.x, point.z, weights);
      expect(weights[LAYER.path]).toBeGreaterThan(0.9);
    }
  });

  it('reuses an exact same-point biome sample without changing soil weights or physical wetness', () => {
    const terrain = new Terrain(), direct = new Float32Array(8), reused = new Float32Array(8);
    const crowns = { coverAt: () => 0.65, broadleafAt: () => 0.3 };
    for (const [x, z] of [[-205, -8], [-174, -76], [-52, 20], [-266, -82], [-283, 124], [-248, 38]]) {
      const wet = groundSplat(terrain, x!, z!, direct, crowns);
      expect(groundSplat(terrain, x!, z!, reused, crowns, biomeAt(x!, z!))).toBe(wet);
      expect(reused).toEqual(direct);
    }
  });
});

it('keeps soft-circle attenuation exact across negative cells, overlapping circles and broad radii', () => {
  const terrain = new Terrain(), colliders = new Colliders();
  const excl = { circles: [{ x: -31.9, z: 31.9, r: 35 }, { x: -7.9, z: -8.1, r: 3.5 }, { x: 8, z: -8, r: 7.8 }] } as unknown as Exclusions;
  const indexed = new Habitat({ terrain, colliders, excl }), reference = new Habitat({ terrain, colliders, excl });
  // Full-scan oracle: the pre-index algorithm considered every circle in source order for each node.
  const circles = Reflect.get(reference, 'softCircles');
  Reflect.get(reference, 'softCircleHash').get = () => circles;
  const a = newSample(), b = newSample();
  for (let z = -64; z <= 64; z += 5) for (let x = -80; x <= 64; x += 5) {
    indexed.sample(x + .013, z - .017, a); reference.sample(x + .013, z - .017, b);
    expect(a).toEqual(b);
  }
});

it('reuses same-point road samples, including zero, without changing ground-layer words', () => {
  const terrain = new Terrain(), ordinary = new Float32Array(8), sampled = new Float32Array(8);
  for (let z = -80; z <= 80; z += 13) for (let x = -250; x <= 130; x += 17) {
    const road = roadWeight(x, z);
    const wet = groundSplat(terrain, x, z, ordinary);
    expect(groundSplat(terrain, x, z, sampled, undefined, undefined, undefined, undefined, road)).toBe(wet);
    expect(Array.from(new Uint32Array(sampled.buffer))).toEqual(Array.from(new Uint32Array(ordinary.buffer)));
  }
});

it('reuses same-point slope and carve samples without changing ground-layer words', () => {
  const terrain = new Terrain(), ordinary = new Float32Array(8), reused = new Float32Array(8);
  for (let z = -64; z <= 64; z += 23) for (let x = -280; x <= 80; x += 37) {
    const surface = {slope: terrain.slopeAt(x, z), carve: terrain.carveAt(x, z)};
    const wet = groundSplat(terrain, x, z, ordinary);
    expect(groundSplat(terrain, x, z, reused, undefined, undefined, undefined, undefined, undefined, surface)).toBe(wet);
    expect(Array.from(new Uint32Array(reused.buffer))).toEqual(Array.from(new Uint32Array(ordinary.buffer)));
  }
});

it('accepts zero-valued surface samples without falling back to terrain derivatives', () => {
  const terrain = new Terrain(), reference = Object.create(terrain) as Terrain;
  reference.slopeAt = () => 0; reference.carveAt = () => 0;
  const a = new Float32Array(8), b = new Float32Array(8), x = -180, z = 12;
  const wet = groundSplat(reference, x, z, a);
  terrain.slopeAt = () => { throw Error('unexpected slope resample'); };
  terrain.carveAt = () => { throw Error('unexpected carve resample'); };
  expect(groundSplat(terrain, x, z, b, undefined, undefined, undefined, undefined, undefined, {slope:0, carve:0})).toBe(wet);
  expect(Array.from(new Uint32Array(b.buffer))).toEqual(Array.from(new Uint32Array(a.buffer)));
});

it('skips soft-exclusion bucket lookups on already bare ocean nodes', () => {
  const terrain = new Terrain(), colliders = new Colliders(), excl = new Exclusions(terrain);
  const habitat = new Habitat({ terrain, colliders, excl, plantedCrowns: { coverAt: () => 0, broadleafAt: () => 0 } });
  let lookups = 0;
  Reflect.get(habitat, 'softCircleHash').get = () => { lookups++; return []; };
  const out = new Float32Array(5);
  Reflect.get(habitat, 'evalNode').call(habitat, -370, 0, out, 0);
  expect(out[0]).toBe(0);
  expect(Array.from(out).every(Number.isFinite)).toBe(true);
  expect(lookups).toBe(0);
});

it('stops overlapping soft exclusions once one clears the node, retaining other habitat channels', () => {
  const terrain = new Terrain(), colliders = new Colliders(), excl = new Exclusions(terrain);
  const habitat = new Habitat({ terrain, colliders, excl, plantedCrowns: { coverAt: () => 0, broadleafAt: () => 0 } });
  const hash = Reflect.get(habitat, 'softCircleHash'), evaluate = Reflect.get(habitat, 'evalNode');
  hash.get = () => [];
  const ordinary = new Float32Array(5);
  let selected: [number, number] | null = null;
  search: for (let z = 50; z <= 86; z += 2) for (let x = 30; x <= 66; x += 2) {
    evaluate.call(habitat, x, z, ordinary, 0);
    if (ordinary[0]! > 0.05) { selected = [x, z]; break search; }
  }
  expect(selected).not.toBeNull();
  const [x, z] = selected!;
  let redundantReads = 0;
  hash.get = () => [{ x, z, hard: 1 }, { get x() { redundantReads++; return x; }, z, hard: 2 }];
  const cleared = new Float32Array(5);
  evaluate.call(habitat, x, z, cleared, 0);
  expect(cleared[0]).toBe(0);
  expect(cleared.slice(1)).toEqual(ordinary.slice(1));
  expect(redundantReads).toBe(0);
});
