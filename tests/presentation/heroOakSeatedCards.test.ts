import * as THREE from 'three';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createMeshyForest, HERO_TREE_IDS, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';
import { MAX_TREE_SCALE, woodReachLocal } from '../../src/presentation/canopy';
import { meshyTreeTemplate } from './meshyTreeFixture';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

let templates: MeshyTreeTemplates;
beforeAll(async () => {
  templates = new Map(await Promise.all(HERO_TREE_IDS.map(async id => [id, await Promise.all(['near', 'mid', 'far'].map(lod => meshyTreeTemplate(`../hero/${id}-${lod}.glb`))) as [GLTF, GLTF, GLTF]] as const)));
}, 60000);
afterAll(() => { for (const levels of templates?.values() ?? []) for (const gltf of levels) gltf.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); });

it('leaves no hero oak card past the audit reach at the largest tree scale, in the near or middle crown', () => {
  const forest = createMeshyForest(templates);
  try {
    for (const id of HERO_TREE_IDS) for (const lod of [0, 1]) {
      const { wood, leaf } = forest.variant('oak', 0, id).lods[lod]!;
      const set = detachedClumpSet(leaf!, wood!, woodReachLocal(1.5, MAX_TREE_SCALE), woodReachLocal(0.75, MAX_TREE_SCALE));
      expect(set.far.filter(Boolean).length, `${id} lod ${lod}`).toBe(0);
      expect(leaf!.userData.seatedCards, `${id} lod ${lod}`).toBeGreaterThan(0);
    }
  } finally { forest.dispose(); }
}, 600000);
