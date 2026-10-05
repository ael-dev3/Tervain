import { describe, expect, it } from 'vitest';
import { mapTerrainColor } from '../../src/presentation/ui/mapTerrain';
import { biomeAt } from '../../src/world/biomes';

describe('regional map habitat washes', () => {
  it('follows the actual six shared habitats while retaining physical sea elevation and hill shading', () => {
    const samples = [[-258, 44], [-266, -82], [-205, -8], [-171, 18], [-174, -76], [-52, 20]] as const;
    const washes = samples.map(([x, z]) => mapTerrainColor(x, z, 2));
    expect(new Set(washes.map(color => color.map(channel => Math.round(channel)).join(','))).size).toBe(6);
    for (const [x, z] of samples) {
      const wash = mapTerrainColor(x, z, 2), hill = mapTerrainColor(x, z, 32);
      expect(wash.every(channel => Number.isFinite(channel) && channel > 90 && channel < 240)).toBe(true);
      expect(hill.every((channel, index) => channel < wash[index]!)).toBe(true);
      expect(mapTerrainColor(x, z, 2, biomeAt(x, z))).toEqual(wash);
    }
    expect(mapTerrainColor(-300, -30, -10)).toEqual([82, 114, 128]);
    expect(mapTerrainColor(-300, -30, -5)).toEqual([105, 136, 143]);
    expect(mapTerrainColor(-300, -30, 2)).not.toEqual(mapTerrainColor(-300, -30, -5));
  });

  it('retains smooth overlapping ink transitions instead of hard biome-colored squares', () => {
    let changes = 0;
    for (let z = -120; z <= 140; z += 8) for (let x = -290; x <= 145; x += 8) {
      const a = mapTerrainColor(x, z, 4), b = mapTerrainColor(x + 0.1, z - 0.1, 4);
      for (let channel = 0; channel < 3; channel++) {
        expect(Math.abs(a[channel]! - b[channel]!)).toBeLessThan(2);
        if (Math.abs(a[channel]! - b[channel]!) > 0.01) changes++;
      }
    }
    expect(changes).toBeGreaterThan(100);
  });
});
