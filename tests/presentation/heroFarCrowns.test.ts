import * as THREE from 'three';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';
import { MAX_TREE_SCALE, woodReachLocal } from '../../src/presentation/canopy';
import { createMeshyForest, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplate } from './meshyTreeFixture';

const IDS = ['hero-oak', 'hero-oak-b', 'hero-oak-c', 'hero-birch', 'hero-sentinel', 'hero-apple', 'hero-pear'] as const;
let templates: MeshyTreeTemplates;
beforeAll(async () => {
  templates = new Map(await Promise.all(IDS.map(async id => [id, await Promise.all(['near', 'mid', 'far'].map(lod => meshyTreeTemplate(`../hero/${id}-${lod}.glb`))) as [GLTF, GLTF, GLTF]] as const)));
}, 60_000);
afterAll(() => { for (const levels of templates?.values() ?? []) for (const gltf of levels) gltf.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); });

it('seats a generated broadleaf’s far cards within the audit reach of its far wood (A167)', () => {
  const forest = createMeshyForest(templates);
  try {
    for (const [species, seed, id] of [['oak', 0, 'hero-oak'], ['oak', 1, 'hero-oak-b'], ['oak', 2, 'hero-oak-c'], ['birch', 0, 'hero-birch'], ['birch', 2, 'verdant-sentinel']] as const) {
      const { wood, leaf } = forest.variant(species, seed, id).lods[2]!;
      const set = detachedClumpSet(leaf!, wood!, woodReachLocal(1.5, MAX_TREE_SCALE), woodReachLocal(0.75, MAX_TREE_SCALE));
      // The far wood keeps only trunk and limbs: the cards at the boughs' ends hung past the reach before.
      expect(set.far.filter(Boolean).length, id).toBe(0);
      expect(set.far.length, id).toBeGreaterThan(400);
    }
  } finally { forest.dispose(); }
}, 300_000);

const triangles = (g: THREE.BufferGeometry | null) => (g ? (g.index?.count ?? g.getAttribute('position').count) / 3 : 0);
it('rebuilds a generated broadleaf’s far crown like its nearer ones, within its far file’s triangles and its nearer levels’ bounds (A168)', () => {
  const forest = createMeshyForest(templates);
  try {
    for (const [species, seed, id] of [['oak', 0, 'hero-oak'], ['oak', 1, 'hero-oak-b'], ['oak', 2, 'hero-oak-c'], ['birch', 0, 'hero-birch'], ['birch', 2, 'hero-sentinel'], ['orchard', 0, 'hero-apple'], ['orchard', 1, 'hero-pear']] as const) {
      const variant = forest.variant(species, seed, id), [near, mid, far] = variant.lods, materials = forest.materialsFor(variant);
      // The leaf-cluster cards and atlas of the nearer crowns, not the far file's own cards with their darker baked shade.
      expect(far!.leaf!.userData.canopy, id).toBeDefined();
      expect((materials[2]!.leaf as THREE.MeshStandardMaterial).map, id).toBe((materials[0]!.leaf as THREE.MeshStandardMaterial).map);
      expect((materials[2]!.leaf as THREE.MeshStandardMaterial).vertexColors, id).toBe(false);
      // Beyond 68 m every broadleaf casts its sun shadow from this level: it costs no more than the far file did.
      let source = 0;
      templates.get(id)![2].scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) source += triangles(m.geometry); });
      expect(triangles(far!.wood) + triangles(far!.leaf), id).toBeLessThanOrEqual(source);
      // The forest culls a tree by the union of its levels' bounds: the far crown stays inside the nearer levels', so
      // that union, and what is drawn, can only shrink.
      const nearer = new THREE.Box3();
      for (const g of [near!.wood, near!.leaf, mid!.wood, mid!.leaf]) if (g) { g.computeBoundingBox(); nearer.union(g.boundingBox!); }
      far!.leaf!.computeBoundingBox();
      expect(nearer.clone().expandByScalar(1e-4).containsBox(far!.leaf!.boundingBox!), id).toBe(true);
    }
  } finally { forest.dispose(); }
}, 300_000);
