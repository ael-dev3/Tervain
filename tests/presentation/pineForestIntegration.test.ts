import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildTreeVariant, type TreeVariant } from '../../src/presentation/treeGen';
import { groundedTreeY, TREE_ROOT_PLANE, TREE_SOIL_OVERLAP } from '../../src/presentation/treeGrounding';
import { buildFlora } from '../../src/presentation/flora';
import { createFloraPopulation, registerFloraColliders, selectFloraPopulation, type FloraTree } from '../../src/presentation/floraPopulation';
import { pineTemplates } from './pineFixture';
import { createPineForest, isPineSpecies, type PineTemplates } from '../../src/presentation/solitaryPine';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { defaultSettings } from '../../src/platform/settings';
import type { FrameContext } from '../../src/presentation/context';
import { worldView } from '../../src/game/worldView';
import { createInitialState } from '../../src/game/state';

// Floor pixels have their own tests/browser gate; isolate actual tree instancing without a DOM canvas.
vi.mock('../../src/presentation/forestFloor', () => ({ buildForestFloor: () => ({ group: new THREE.Group(), update() {}, dispose() {} }) }));
vi.mock('../../src/presentation/treeMaterials', () => ({
  woodMaterial: () => new THREE.MeshStandardMaterial(), leafMaterial: () => new THREE.MeshStandardMaterial(), disposeTreeMaterials() {},
}));
vi.mock('../../src/presentation/treeTextures', () => ({ disposeTreeTextures() {} }));
vi.mock('../../src/presentation/treeGen', async (original) => {
  const actual = await original<typeof import('../../src/presentation/treeGen')>();
  return { ...actual, buildTreeVariant: (species: Parameters<typeof actual.buildTreeVariant>[0], seed: number) => {
    if (['pine', 'fir', 'shorepine'].includes(species)) throw new Error('Old conifer geometry must never be requested.');
    return actual.buildTreeVariant(species, seed);
  } };
});

let templates: PineTemplates, terrain: Terrain, excl: Exclusions, population: FloraTree[], canonical: Colliders;
beforeAll(async () => {
  templates = await pineTemplates();
  terrain = new Terrain(); excl = new Exclusions(terrain);
  const source = createPineForest(templates); canonical = new Colliders();
    const variants = new Map<string, TreeVariant>();
  population = createFloraPopulation(terrain, excl, (tree, footprint) => isPineSpecies(tree.sp)
      ? source.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : footprint, (tree) => {
      const key = `${tree.sp}:${tree.v}`;
      let variant = variants.get(key);
      if (!variant) { variant = isPineSpecies(tree.sp) ? source.variant(tree.sp, tree.v + 1) : buildTreeVariant(tree.sp, tree.v + 1); variants.set(key, variant); }
      return groundedTreeY(terrain, tree, variant);
    });
    registerFloraColliders(population, canonical);
    source.dispose();
    for (const variant of variants.values()) if (!isPineSpecies(variant.species)) for (const lod of variant.lods) { lod.wood?.dispose(); lod.leaf?.dispose(); }
});

describe('world forest render substitution', () => {
  for (const quality of ['low', 'medium', 'high'] as const) it(`replaces every conifer and retains canonical obstacles on ${quality}`, () => {
    for (const lod of [0, 1, 2]) {
      vi.stubGlobal('location', { search: `?lod=${lod}` });
      const colliders = new Colliders();
      const forest = buildFlora({ terrain, excl, colliders, quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
      expect(colliders.all).toEqual(canonical.all);
      expect(forest.stats!().solitaryPines).toBe({ low: 259, medium: 271, high: 281 }[quality]);
      const imported = forest.group.children.filter((object) => object.name.startsWith('solitary-pine:')) as THREE.InstancedMesh[];
      const batches = new Set(selectFloraPopulation(population, quality).trees.filter((tree) => isPineSpecies(tree.sp)).map((tree) => `${tree.sp}:${tree.v}`));
      // Every populated source batch owns two near parts, two middle parts and one far card mesh.
      expect(imported).toHaveLength(batches.size * 5);
      expect(imported.filter((mesh) => mesh.name === 'solitary-pine:2:foliage').every((mesh) => mesh.geometry.index!.count / 3 === 48)).toBe(true);
      const camera = new THREE.OrthographicCamera(-800, 800, 800, -800, 0.1, 1800);
      camera.position.set(0, 1000, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
      const frame: FrameContext = { camera, quality, time: 1, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(1, 1, 1), reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
      forest.update(0.2, frame);
      const drawn = forest.group.children.filter((object) => (object as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh[];
      const triangles = drawn.reduce((total, mesh) => total + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3 * mesh.count, 0);
      expect(forest.stats!().treeTris).toBe(Math.round(triangles));
      const selected = selectFloraPopulation(population, quality).trees;
      expect(forest.stats!().treesDrawn).toBe(selected.length);
      const found = new Set<typeof selected[number]>();
      const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
      for (const mesh of drawn) {
        const p = mesh.geometry.getAttribute('position');
        for (let instance = 0; instance < mesh.count; instance++) {
          mesh.getMatrixAt(instance, matrix);
          const tree = selected.find(tree => Math.abs(tree.x - matrix.elements[12]!) < 0.00002 && Math.abs(tree.z - matrix.elements[14]!) < 0.00002)!;
          expect(tree, mesh.name).toBeDefined(); found.add(tree);
          expect(matrix.elements[13]).toBeCloseTo(tree.y, 4);
          const scale = new THREE.Vector3().setFromMatrixScale(matrix);
          expect(scale.x).toBeCloseTo(tree.s, 5); expect(scale.y).toBeCloseTo(tree.s, 5); expect(scale.z).toBeCloseTo(tree.s, 5);
          if (!mesh.name.endsWith(':wood')) continue;
          // Actual rendered instance positions, not only population metadata or root-origin height.
          let maximumExposure = -Infinity;
          for (let i = 0; i < p.count; i++) if (p.getY(i) <= TREE_ROOT_PLANE) {
            point.fromBufferAttribute(p, i).applyMatrix4(matrix);
            maximumExposure = Math.max(maximumExposure, point.y - terrain.heightAt(point.x, point.z) + TREE_SOIL_OVERLAP);
          }
          expect(maximumExposure, `${quality} LOD${lod} ${mesh.name} ${tree.x},${tree.z}`).toBeLessThanOrEqual(0.00003);
        }
      }
      expect(found.size).toBe(selected.length);
      forest.dispose!(); forest.dispose!();
      vi.unstubAllGlobals();
    }
  });
});
