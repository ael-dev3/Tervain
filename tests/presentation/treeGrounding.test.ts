import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createFloraPopulation, selectFloraPopulation, type FloraTree } from '../../src/presentation/floraPopulation';
import { createPineForest, isPineSpecies, type PineForest } from '../../src/presentation/solitaryPine';
import { buildTreeVariant, SPECIES, type TreeVariant } from '../../src/presentation/treeGen';
import { groundedTreeY, treeRootPolygons, treeWoodCollisionRadius, TREE_ROOT_PLANE, TREE_SOIL_OVERLAP } from '../../src/presentation/treeGrounding';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { WORLD } from '../../src/world/layout';
import { pineTemplates } from './pineFixture';

let forest: PineForest, terrain: Terrain, population: FloraTree[];
const variants = new Map<string, TreeVariant>();
const variantFor = (tree: Pick<FloraTree, 'sp' | 'v'>) => {
  const key = `${tree.sp}:${tree.v}`;
  let variant = variants.get(key);
  if (!variant) {
    variant = isPineSpecies(tree.sp) ? forest.variant(tree.sp, tree.v + 1) : buildTreeVariant(tree.sp, tree.v + 1);
    variants.set(key, variant);
  }
  return variant;
};
beforeAll(async () => {
  forest = createPineForest(await pineTemplates()); terrain = new Terrain();
  population = createFloraPopulation(terrain, new Exclusions(terrain), (tree, radius) => isPineSpecies(tree.sp)
    ? forest.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
    : radius > 0 ? treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : radius,
    (tree) => groundedTreeY(terrain, tree, variantFor(tree)));
});
afterAll(() => {
  forest.dispose();
  for (const variant of variants.values()) if (!isPineSpecies(variant.species)) for (const lod of variant.lods) { lod.wood?.dispose(); lod.leaf?.dispose(); }
});

const worldPoint = (tree: Pick<FloraTree, 'x' | 'y' | 'z' | 's' | 'yaw'>, x: number, y: number, z: number) => {
  const c = Math.cos(tree.yaw), s = Math.sin(tree.yaw);
  return { x: tree.x + tree.s * (x * c + z * s), y: tree.y + tree.s * y, z: tree.z + tree.s * (z * c - x * s) };
};

describe('actual woody tree bases follow the visible ground', () => {
  it('covers a branch crossing player height and the widest woody LOD, while excluding overhead tips', () => {
    const narrow = new THREE.BufferGeometry(), broad = new THREE.BufferGeometry();
    narrow.setAttribute('position', new THREE.Float32BufferAttribute([0.2, 0, 0, 9, 9, 0, 0.2, 0, 0.2], 3));
    broad.setAttribute('position', new THREE.Float32BufferAttribute([4, 1, 0, 4, 3, 0, 4, 2, 0.2], 3));
    const variant: TreeVariant = { species: 'oak', height: 9, crownRadius: 9, trunkRadius: 0.2,
      bark: 'oak', leafTexture: 'oak', crownTexture: 'crown', lods: [narrow, broad, narrow].map(wood => ({ wood, leaf: null, tris: 1 })) as TreeVariant['lods'] };
    const radius = treeWoodCollisionRadius(variant, 1);
    expect(radius).toBeGreaterThanOrEqual(Math.hypot(4, 0.2));
    expect(radius).toBeLessThan(4.1);
    expect(treeWoodCollisionRadius(variant, 1, 3)).toBeGreaterThan(radius + 1);
    expect(treeWoodCollisionRadius(variant, 2)).toBeGreaterThanOrEqual(8);
    narrow.dispose(); broad.dispose();
  });
  it('detects a downhill root rather than trusting the trunk origin', () => {
    const tree = { sp: 'pine' as const, v: 0, x: 0, z: 0, s: 1.25, yaw: 0.73 };
    const slope = { heightAt: (x: number, z: number) => 8 + 0.43 * x - 0.31 * z };
    const variant = variantFor(tree), y = groundedTreeY(slope, tree, variant);
    expect(y).toBeLessThan(slope.heightAt(0, 0) - 0.5);
    const before = new THREE.Vector3().fromBufferAttribute(variant.lods[0].wood!.getAttribute('position'), 0);
    let maxExposure = -Infinity;
    for (const polygon of treeRootPolygons(variant)) for (const point of polygon) {
      const actual = worldPoint({ ...tree, y }, ...point);
      maxExposure = Math.max(maxExposure, actual.y - slope.heightAt(actual.x, actual.z) + TREE_SOIL_OVERLAP);
    }
    expect(maxExposure).toBeLessThanOrEqual(1e-7);
    expect(new THREE.Vector3().fromBufferAttribute(variant.lods[0].wood!.getAttribute('position'), 0)).toEqual(before);
  });

  it('finds terrain-facet minima inside a broad root cap, not only at its edge', () => {
    const geometry = new THREE.BufferGeometry();
    const cx = WORLD.minX + 80 * WORLD.cell, cz = WORLD.minZ + 80 * WORLD.cell;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-3, 0, -2, 3, 0, -2, 0, 0, 4], 3));
    const lod = { wood: geometry, leaf: null, tris: 1 };
    const variant: TreeVariant = { species: 'oak', height: 5, crownRadius: 4, trunkRadius: 0.5, bark: 'oak', leafTexture: 'oak', crownTexture: 'crown', lods: [lod, lod, lod] };
    const ground = new Terrain();
    // One interior grid vertex is lower than every root-edge endpoint.
    const index = 80 + 80 * (ground.nx + 1); ground.heights.fill(5); ground.heights[index] = 3;
    const y = groundedTreeY(ground, { x: cx, z: cz, s: 1, yaw: 0 }, variant);
    expect(y).toBeCloseTo(3 - TREE_SOIL_OVERLAP, 8);
    geometry.dispose();
  });

  it('grounds every species and variant without squashing or tilting the model', () => {
    for (const sp of SPECIES) for (let v = 0; v < 3; v++) {
      const tree = { sp, v, x: -180.35, z: 74.71, s: 1.17, yaw: 1.89 };
      const variant = variantFor(tree), geometry = variant.lods[0].wood!;
      const source = new Float32Array(geometry.getAttribute('position').array);
      const y = groundedTreeY(terrain, tree, variant);
      expect(y).toBeLessThanOrEqual(terrain.heightAt(tree.x, tree.z) - TREE_SOIL_OVERLAP);
      let maxExposure = -Infinity;
      for (const polygon of treeRootPolygons(variant)) for (const point of polygon) {
        const actual = worldPoint({ ...tree, y }, ...point);
        maxExposure = Math.max(maxExposure, actual.y - terrain.heightAt(actual.x, actual.z) + TREE_SOIL_OVERLAP);
      }
      expect(maxExposure, `${sp}:${v}`).toBeLessThanOrEqual(1e-6);
      expect(geometry.getAttribute('position').array).toEqual(source);
    }
  });

  it('includes newly lowered woody branches in the player collision slab before placement acceptance', () => {
    let expanded = 0;
    for (const tree of population) {
      if (!isPineSpecies(tree.sp) || tree.radius <= 0) continue;
      const variant = variantFor(tree), top = terrain.heightAt(tree.x, tree.z) + 2.6;
      const cos = Math.cos(tree.yaw), sin = Math.sin(tree.yaw);
      let maximumRadius = 0;
      if (tree.radius > forest.collisionRadius(tree.sp, tree.v + 1, tree.s) + 1e-7) expanded++;
      for (const lod of variant.lods.slice(0, 2)) {
        const p = lod.wood!.getAttribute('position'), index = lod.wood!.index;
        const count = index?.count ?? p.count;
        for (let i = 0; i < count; i += 3) for (let edge = 0; edge < 3; edge++) {
          const ai = index ? index.getX(i + edge) : i + edge, bi = index ? index.getX(i + (edge + 1) % 3) : i + (edge + 1) % 3;
          const ay = tree.y + p.getY(ai) * tree.s, by = tree.y + p.getY(bi) * tree.s;
          if (ay > top && by > top) continue;
          const ax = tree.s * (p.getX(ai) * cos + p.getZ(ai) * sin), az = tree.s * (p.getZ(ai) * cos - p.getX(ai) * sin);
          if (ay <= top) maximumRadius = Math.max(maximumRadius, Math.hypot(ax, az));
          if ((ay < top && by > top) || (by < top && ay > top)) {
            const t = (top - ay) / (by - ay);
            const bx = tree.s * (p.getX(bi) * cos + p.getZ(bi) * sin), bz = tree.s * (p.getZ(bi) * cos - p.getX(bi) * sin);
            maximumRadius = Math.max(maximumRadius, Math.hypot(ax + (bx - ax) * t, az + (bz - az) * t));
          }
        }
      }
      expect(maximumRadius, `${tree.sp}:${tree.v} ${tree.x},${tree.z}`).toBeLessThanOrEqual(tree.radius);
    }
    expect(expanded).toBeGreaterThan(0);
  });

  for (const quality of ['low', 'medium', 'high'] as const) it(`plants every ${quality} tree, shrub and distant treeline using its full yawed root footprint`, () => {
    const trees = selectFloraPopulation(population, quality).trees;
    expect(trees.length).toBeGreaterThan(400);
    let samples = 0, maximumSink = 0, maximumShrubSink = 0;
    const species = new Set(trees.map(tree => tree.sp));
    expect(species.size).toBeGreaterThanOrEqual(7);
    expect(trees.some(tree => tree.collisionId === null && isPineSpecies(tree.sp))).toBe(true);
    for (const tree of trees) {
      const variant = variantFor(tree), height = terrain.heightAt(tree.x, tree.z);
      const cos = Math.cos(tree.yaw), sin = Math.sin(tree.yaw);
      let maximumExposure = -Infinity;
      // Scan all the same samples; aggregate the worst contact once per placement instead
      // of spending the full-suite budget constructing millions of assertion objects.
      const sample = (x: number, y: number, z: number) => {
        const wx = tree.x + tree.s * (x * cos + z * sin), wz = tree.z + tree.s * (z * cos - x * sin);
        maximumExposure = Math.max(maximumExposure, tree.y + tree.s * y - terrain.heightAt(wx, wz) + TREE_SOIL_OVERLAP);
      };
      if (tree.sp === 'shrub') maximumShrubSink = Math.max(maximumShrubSink, height - tree.y);
      else maximumSink = Math.max(maximumSink, (height - tree.y) / (variant.height * tree.s));
      // Audit delivered wood vertices independently of the root-profile clipping code.
      for (const lod of variant.lods) {
        if (!lod.wood) continue;
        const p = lod.wood.getAttribute('position');
        for (let i = 0; i < p.count; i++) if (p.getY(i) <= TREE_ROOT_PLANE) {
          sample(p.getX(i), p.getY(i), p.getZ(i));
          samples++;
        }
      }
      // A dense barycentric scan exercises edge/facet crossings between vertices too.
      for (const polygon of treeRootPolygons(variant)) {
        const a = polygon[0]!;
        for (let tri = 1; tri < polygon.length - 1; tri++) {
          const b = polygon[tri]!, c = polygon[tri + 1]!;
          for (let i = 0; i <= 3; i++) for (let j = 0; j <= 3 - i; j++) {
            const wa = i / 3, wb = j / 3, wc = 1 - wa - wb;
            sample(wa * a[0] + wb * b[0] + wc * c[0], wa * a[1] + wb * b[1] + wc * c[1], wa * a[2] + wb * b[2] + wc * c[2]);
          }
        }
      }
      expect(maximumExposure, `${quality} ${tree.sp}:${tree.v} ${tree.x},${tree.z}`).toBeLessThanOrEqual(1e-6);
    }
    expect(samples).toBeGreaterThan(10000);
    // Whole-tree translation stays a small part of the authored silhouette.
    expect(maximumSink).toBeLessThan(0.07);
    expect(maximumShrubSink).toBeLessThan(0.3);
  });
});
