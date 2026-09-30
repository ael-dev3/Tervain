import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { createFloraPopulation, floraLod, selectFloraPopulation } from '../../src/presentation/floraPopulation';
import { buildTreeVariant, type Species } from '../../src/presentation/treeGen';
import { Exclusions, TREE_SWAY_MULTIPLIER } from '../../src/presentation/vegetation';
import { deepwoodCover } from '../../src/world/forest';
import { shoreDistance } from '../../src/world/coast';
import { Terrain } from '../../src/world/terrain';
import { ARRIVAL_ROUTE, DEEPWOOD, FOREST_RUIN, FOREST_WAYMARKERS, SPAWN } from '../../src/world/layout';
import { distToPolyline } from '../../src/world/terrain';

const terrain = new Terrain();
const population = createFloraPopulation(terrain, new Exclusions(terrain));
const models = new Map<string, ReturnType<typeof buildTreeVariant>>();
const model = (sp: Species, variant: number) => {
  const key = `${sp}:${variant}`;
  let m = models.get(key);
  if (!m) { m = buildTreeVariant(sp, variant); models.set(key, m); }
  return m;
};

afterAll(() => { for (const tree of models.values()) for (const lod of tree.lods) { lod.wood?.dispose(); lod.leaf?.dispose(); } });

describe('Deepwood forest canopy', () => {
  it('surrounds the entire arrival trail with a dense rooted hardwood/conifer forest and a lower birch layer, leaving the landing open', () => {
    const core = population.filter((p) => p.radius > 0 && deepwoodCover(p.x, p.z) > 0.8);
    expect(core.length).toBeGreaterThan(450);
    const types = new Set(core.map((p) => p.sp));
    expect(types).toEqual(new Set(['oak', 'pine', 'fir', 'birch']));
    const sandTrees = population.filter((p) => shoreDistance(p.x, p.z) < DEEPWOOD.shoreClearance || Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z) < 30);
    expect(sandTrees).toEqual([]);
    expect(core.filter((p) => model(p.sp, p.v + 1).height * p.s > 30).length).toBeGreaterThan(60);
    expect(core.filter((p) => p.sp === 'birch' && model(p.sp, p.v + 1).height * p.s < 16).length).toBeGreaterThan(30);
    // Both sides of the winding path have depth, not just a single decorative avenue of trees.
    const left = core.filter((p) => p.z < 2), right = core.filter((p) => p.z > 42);
    expect(left.length).toBeGreaterThan(160);
    expect(right.length).toBeGreaterThan(140);
    for (const p of core) {
      expect(Math.hypot(p.x - FOREST_RUIN.x, p.z - FOREST_RUIN.z)).toBeGreaterThan(FOREST_RUIN.r + p.radius);
      for (const marker of FOREST_WAYMARKERS) expect(Math.hypot(p.x - marker.x, p.z - marker.z)).toBeGreaterThan(2.4 + p.radius);
      expect(p.y).toBeCloseTo(terrain.heightAt(p.x, p.z) - 0.06, 7);
      expect(distToPolyline(p.x, p.z, ARRIVAL_ROUTE).d).toBeGreaterThan(p.radius + 2.2);
    }
  });

  it('preserves the full forest silhouette population and physical trunks on the low preset', () => {
    const trees = selectFloraPopulation(population, 'low').trees;
    const core = population.filter((p) => p.radius > 0 && deepwoodCover(p.x, p.z) > 0.8);
    expect(core.every((p) => trees.includes(p))).toBe(true);
    expect(floraLod('low', 45)).toBe(1);
    expect(TREE_SWAY_MULTIPLIER).toBe(0);
  });

  it('keeps the same main trunk path across near/middle LODs and uses finite bounded geometry with grounded roots', () => {
    for (const sp of ['oak', 'birch', 'pine', 'fir'] as const) {
      for (let variant = 1; variant <= 3; variant++) {
        const m = model(sp, variant);
        expect(m.height).toBeGreaterThan(sp === 'birch' ? 11 : sp === 'oak' ? 16 : 18);
        expect(m.lods[0].tris).toBeLessThan(7000);
        expect(m.lods[1].tris).toBeLessThan(m.lods[0].tris * 0.65);
        expect(m.lods[2].tris).toBeLessThan(100);
        const ringCenter = (g: THREE.BufferGeometry, ring: number, sides: number) => {
          const p = g.getAttribute('position');
          const v = new THREE.Vector3();
          for (let i = 0; i < sides; i++) v.add(new THREE.Vector3(p.getX(ring * (sides + 1) + i), p.getY(ring * (sides + 1) + i), p.getZ(ring * (sides + 1) + i)));
          return v.divideScalar(sides);
        };
        const rings = sp === 'pine' || sp === 'fir' ? 13 : 8;
        for (let ring = 0; ring < rings; ring++) {
          expect(ringCenter(m.lods[0].wood!, ring, 10).distanceTo(ringCenter(m.lods[1].wood!, ring, 7))).toBeLessThan(0.08);
        }
        for (const lod of m.lods) {
          for (const g of [lod.wood, lod.leaf]) {
            expect(g).not.toBeNull();
            const p = g!.getAttribute('position');
            expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
            g!.computeBoundingBox();
            expect(g!.boundingBox!.max.y).toBeLessThanOrEqual(m.height * 1.16);
            const uv = g!.getAttribute('uv');
            expect(uv.count).toBe(p.count);
            const sway = g!.getAttribute('aSway');
            expect(sway.count).toBe(p.count);
          }
          expect(lod.wood!.boundingBox!.min.y).toBeLessThan(0);
        }
        if (sp === 'oak') {
          const wood = m.lods[0].wood!;
          const p = wood.getAttribute('position');
          const rootVerts = Array.from({ length: p.count }, (_, i) => i).filter(i => p.getY(i) < 0.45 && Math.hypot(p.getX(i), p.getZ(i)) > 1.35);
          expect(rootVerts.length).toBeGreaterThan(15);
        }
      }
    }
  });
});
