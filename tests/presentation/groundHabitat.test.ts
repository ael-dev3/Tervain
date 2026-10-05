import { describe, expect, it } from 'vitest';
import { Habitat, newSample } from '../../src/presentation/ground/habitat';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';

describe('ground habitat beneath planted crowns', () => {
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
});
