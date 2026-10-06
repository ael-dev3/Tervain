import * as THREE from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { createFloraPopulation, floraLod, selectFloraPopulation } from '../../src/presentation/floraPopulation';
import { buildTreeVariant, type Species } from '../../src/presentation/treeGen';
import { Exclusions, TREE_SWAY_MULTIPLIER } from '../../src/presentation/vegetation';
import { deepwoodCover, forestOpeningCover } from '../../src/world/forest';
import { shoreDistance } from '../../src/world/coast';
import { Terrain } from '../../src/world/terrain';
import { ARRIVAL_ROUTE, DEEPWOOD, FOREST_RUIN, FOREST_WAYMARKERS, SPAWN, STRAND } from '../../src/world/layout';
import { distToPolyline } from '../../src/world/terrain';
import { biomeAt } from '../../src/world/biomes';

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
  it('surrounds closed arrival reaches with layered canopy and wooded depth while leaving light pockets and the landing open', () => {
    const core = population.filter((p) => p.radius > 0 && deepwoodCover(p.x, p.z) > 0.8);
    const types = new Set(core.map((p) => p.sp));
    expect(types).toEqual(new Set(['oak', 'pine', 'fir', 'birch']));
    // Ordinary woodland keeps its established shore clearance. Sheltered palms are the
    // owner-authorized coastal exception, beyond the deliberately empty landing itself.
    const sandTrees = population.filter((p) => (p.sp !== 'palm' && shoreDistance(p.x, p.z) < DEEPWOOD.shoreClearance)
      || Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z) < 30);
    expect(sandTrees).toEqual([]);
    for (const palm of population.filter(p => p.sp === 'palm')) {
      expect(shoreDistance(palm.x, palm.z)).toBeGreaterThanOrEqual(16);
      expect(biomeAt(palm.x, palm.z).weights['sheltered-palms']).toBeGreaterThan(0.35);
      expect(Math.hypot(palm.x - STRAND.x, palm.z - STRAND.z)).toBeGreaterThanOrEqual(56 + palm.radius + 0.55);
    }
    const heights = core.map(p => model(p.sp, p.v + 1).height * p.s);
    // A lower stratum may be young members of the local stand, rather than unrelated birches everywhere.
    expect(heights.filter(height => height < 16).length / core.length).toBeGreaterThan(0.15);
    expect(heights.filter(height => height > 25).length / core.length).toBeGreaterThan(0.3);
    const closedSamples: { canopy: boolean; depth: boolean }[] = [];
    for (let i = 0; i < ARRIVAL_ROUTE.length - 1; i++) {
      const a = ARRIVAL_ROUTE[i]!, b = ARRIVAL_ROUTE[i + 1]!;
      const length = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
      for (let step = 0; step < length; step += 5) {
        const x = a.x + dx * step, z = a.z + dz * step;
        // Judge enclosed reaches before the overlook/settlement reveal, not the deliberately open transition.
        if (x < DEEPWOOD.minX + 18 || x > -150 || deepwoodCover(x, z) < 0.8 || forestOpeningCover(x, z) < 0.65) continue;
        const nearby = population.filter(p => p.radius > 0 && Math.hypot(p.x - x, p.z - z) < 35);
        const lateral = (p: typeof nearby[number]) => (p.x - x) * -dz + (p.z - z) * dx;
        const depth = [-1, 1].every(side => nearby.some(p => lateral(p) * side > 4 && lateral(p) * side < 15)
          && nearby.some(p => lateral(p) * side >= 15));
        // Crown envelopes are a composition proxy; native screenshots still verify actual leaf/sky coverage.
        const canopy = nearby.some(p => model(p.sp, p.v + 1).height * p.s > 12
          && Math.hypot(p.x - x, p.z - z) <= model(p.sp, p.v + 1).crownRadius * p.s);
        closedSamples.push({ canopy, depth });
      }
    }
    expect(closedSamples.length).toBeGreaterThan(5);
    expect(closedSamples.filter(sample => sample.canopy).length / closedSamples.length).toBeGreaterThan(0.75);
    expect(closedSamples.filter(sample => sample.depth).length / closedSamples.length).toBeGreaterThan(0.75);
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

  it('connects every retained middle-LOD broadleaf fan to actual surviving twig or bough geometry', () => {
    const triangle = new THREE.Triangle(), root = new THREE.Vector3(), nearest = new THREE.Vector3();
    for (const sp of ['oak', 'birch', 'orchard'] as const) {
      for (let variant = 1; variant <= 3; variant++) {
        const m = model(sp, variant);
        const wood = m.lods[1].wood!, leaf = m.lods[1].leaf!;
        const w = wood.getAttribute('position'), l = leaf.getAttribute('position'), index = wood.index!;
        // Each card contributes four vertices; the material shades both faces. Its bottom edge centre is the atlas stem root.
        for (let card = 0; card < l.count; card += 4) {
          root.set((l.getX(card) + l.getX(card + 1)) * 0.5, (l.getY(card) + l.getY(card + 1)) * 0.5, (l.getZ(card) + l.getZ(card + 1)) * 0.5);
          let distance = Infinity;
          for (let i = 0; i < index.count; i += 3) {
            triangle.a.fromBufferAttribute(w, index.getX(i));
            triangle.b.fromBufferAttribute(w, index.getX(i + 1));
            triangle.c.fromBufferAttribute(w, index.getX(i + 2));
            triangle.closestPointToPoint(root, nearest);
            distance = Math.min(distance, root.distanceToSquared(nearest));
            if (distance < 0.001) break;
          }
          expect(Math.sqrt(distance), `${sp}:${variant} fan ${card / 4} must retain its supporting wood`).toBeLessThan(0.075);
        }
      }
    }
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
