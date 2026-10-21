import * as THREE from 'three';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createMeshyForest, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplate } from './meshyTreeFixture';

const IDS = ['hero-oak', 'hero-birch', 'hero-apple', 'hero-sentinel'] as const;
let templates: MeshyTreeTemplates;
beforeAll(async () => {
  templates = new Map(await Promise.all(IDS.map(async id => [id, await Promise.all(['near', 'mid', 'far'].map(lod => meshyTreeTemplate(`../hero/${id}-${lod}.glb`))) as [GLTF, GLTF, GLTF]] as const)));
}, 60_000);
afterAll(() => { for (const levels of templates?.values() ?? []) for (const gltf of levels) gltf.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); });

/** Distinct limb phases among the leaf vertices that ride a limb (level above the trunk's). */
const phases = (geometry: THREE.BufferGeometry) => {
  const wind = geometry.getAttribute('_wind'), seen = new Set<number>();
  for (let i = 0; i < wind.count; i++) if (wind.getX(i) > 0.02) seen.add(Math.round(wind.getY(i) * 1000));
  return seen.size;
};

it('rebuilt crowns of generated trees ride the limbs the generator grew, at every level (oak, birch, orchard and sentinel)', () => {
  const forest = createMeshyForest(templates);
  try {
    // The oak's crown is snapped onto its wood and the orchard's culled to the reach: both keep the branch data (A166).
    const cases = [['oak', 0, 'hero-oak'], ['birch', 0, 'hero-birch'], ['orchard', 0, 'hero-apple'], ['birch', 2, 'verdant-sentinel']] as const;
    for (const [species, seed, id] of cases) {
      const variant = forest.variant(species, seed, id);
      for (const lod of [0, 1, 2] as const) {
        const { wood, leaf } = variant.lods[lod]!;
        for (const [part, geometry] of [['wood', wood], ['leaf', leaf]] as const) {
          expect(geometry!.getAttribute('_wind'), `${id} lod ${lod} ${part}`).toBeDefined();
          expect(geometry!.getAttribute('_pivot'), `${id} lod ${lod} ${part}`).toBeDefined();
        }
        // Many limbs each sway on their own, not the crown as one.
        expect(phases(leaf!), `${id} lod ${lod}`).toBeGreaterThan(8);
      }
    }
  } finally { forest.dispose(); }
}, 300_000);
