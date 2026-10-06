import { describe, expect, it } from 'vitest';
import { BIOME_IDS, BIOME_REGIONS, biomeAt } from '../../src/world/biomes';
import { SPAWN, STRAND, WORLD } from '../../src/world/layout';
import { forestStandAt } from '../../src/world/forestStands';

describe('connected coastal habitats', () => {
  it('shares a deterministic normalized region field with gradual mixed shoulders', () => {
    let mixed = 0;
    for (let z = WORLD.minZ; z <= WORLD.maxZ; z += 9) {
      for (let x = WORLD.minX; x <= WORLD.maxX; x += 9) {
        const a = biomeAt(x, z), b = biomeAt(x + 0.1, z - 0.1);
        expect(a).toEqual(biomeAt(x, z));
        expect(BIOME_IDS.reduce((sum, id) => sum + a.weights[id], 0)).toBeCloseTo(1, 12);
        expect(a.weights[a.id]).toBe(Math.max(...Object.values(a.weights)));
        for (const id of BIOME_IDS) {
          expect(a.weights[id]).toBeGreaterThanOrEqual(0);
          expect(a.weights[id]).toBeLessThanOrEqual(1);
          expect(Math.abs(a.weights[id] - b.weights[id])).toBeLessThan(0.035);
        }
        for (const value of [a.woodland, a.moisture, a.exposure, a.grassDensity, a.lowGrowth]) expect(Number.isFinite(value)).toBe(true);
        if (Object.values(a.weights).filter(weight => weight > 0.1).length > 1) mixed++;
      }
    }
    expect(mixed).toBeGreaterThan(100);
  });

  it('preserves the sparse landing and pine core while giving both coastal shoulders palm habitat', () => {
    expect(biomeAt(SPAWN.x, SPAWN.z).id).toBe('grey-strand');
    for (let z = STRAND.z - 45; z <= STRAND.z + 45; z += 5) {
      for (let x = STRAND.x - 45; x <= STRAND.x + 45; x += 5) {
        if (Math.hypot(x - STRAND.x, z - STRAND.z) <= 56) expect(biomeAt(x, z).weights['sheltered-palms']).toBe(0);
      }
    }
    for (const core of BIOME_REGIONS.pine) {
      const sample = biomeAt(core.x, core.z);
      expect(sample.id).toBe('pine-deepwood');
      expect(sample.weights['pine-deepwood']).toBeGreaterThan(0.9);
      expect(forestStandAt(core.x, core.z).sp).toBe('pine');
    }
    for (const core of BIOME_REGIONS.palms) expect(biomeAt(core.x, core.z).weights['sheltered-palms']).toBeGreaterThan(0.7);
  });

  it('provides genuinely different plant and soil cues without claiming extra places or water', () => {
    const humid = biomeAt(-205, -8), fir = biomeAt(-174, -76), warm = biomeAt(-52, 20), palm = biomeAt(-266, -82);
    expect(humid.id).toBe('humid-broadleaf');
    expect(fir.id).toBe('cool-fir-ridge');
    expect(warm.id).toBe('ochre-woodland');
    expect(palm.id).toBe('sheltered-palms');
    expect(humid.moisture).toBeGreaterThan(warm.moisture + 0.35);
    expect(humid.lowGrowth).toBeGreaterThan(warm.lowGrowth + 0.5);
    expect(warm.exposure).toBeGreaterThan(fir.exposure + 0.5);
    expect(palm.grassDensity).toBeLessThan(fir.grassDensity * 0.7);
    expect(forestStandAt(-174, -76)).toMatchObject({ sp: 'fir', id: 'north_fir_ridge' });
  });
});
