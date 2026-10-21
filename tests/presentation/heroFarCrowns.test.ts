import * as THREE from 'three';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';
import { MAX_TREE_SCALE, woodReachLocal } from '../../src/presentation/canopy';
import { createMeshyForest, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplate } from './meshyTreeFixture';

const IDS = ['hero-oak', 'hero-oak-b', 'hero-oak-c', 'hero-birch', 'hero-sentinel'] as const;
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
