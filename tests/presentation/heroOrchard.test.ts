import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';
import { activeMeshyTreeIds, createMeshyForest, HERO_ORCHARD_IDS, heroFamilyId, heroOrchardEnabled, MESHY_TREE_IDS, meshyTreeId, meshyTreeModelPath, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { ORCHARD_MAX_SCALE } from '../../src/presentation/treeScale';
import { meshyTreeTemplate } from './meshyTreeFixture';

interface Glb { json: any }
function readGlb(path: string): Glb {
  const bytes = readFileSync(new URL(`../../public/models/flora/${path}`, import.meta.url));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  return { json: JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8')) };
}
const positions = (glb: Glb) => glb.json.meshes.map((m: { primitives: { attributes: { POSITION: number } }[] }) => glb.json.accessors[m.primitives[0]!.attributes.POSITION]);
const triangles = (glb: Glb) => glb.json.meshes.reduce((n: number, m: { primitives: { indices: number }[] }) => n + glb.json.accessors[m.primitives[0]!.indices].count / 3, 0);
/** Farthest reach from the trunk's axis at a 7 m height (the game scales orchard trees to it from the near model's top). */
const reach = (glb: Glb, top: number) => Math.max(...positions(glb).map((a: { min: number[]; max: number[] }) => Math.hypot(Math.max(-a.min[0]!, a.max[0]!), Math.max(-a.min[2]!, a.max[2]!)))) * 7 / top;
const top = (glb: Glb, bottom: number) => Math.max(...positions(glb).map((a: { max: number[] }) => a.max[1]!)) - bottom;
const bottomOf = (glb: Glb) => Math.min(...positions(glb).map((a: { min: number[] }) => a.min[1]!));

describe('generated orchard trees (tools/tree-gen --species apple / pear)', () => {
  // The apple stands where the orchard repeats the wide tree-4949, the pear in the narrow tree-4815's slot.
  const pairs = [['hero-apple', 'tree-4949'], ['hero-pear', 'tree-4815']] as const;
  const files = Object.fromEntries(HERO_ORCHARD_IDS.flatMap(id => ['near', 'mid', 'far'].map(lod => [`${id}-${lod}`, readGlb(`hero/${id}-${lod}.glb`)])));

  it('costs less than the supplied orchard tree it replaces at every level of detail', () => {
    for (const [id, supplied] of pairs) for (const lod of ['near', 'mid', 'far']) {
      expect(triangles(files[`${id}-${lod}`]!), `${id}-${lod}`).toBeLessThan(triangles(readGlb(`meshy-012/${supplied}-${lod}.glb`)));
    }
  });

  it('reaches no farther from its trunk than the supplied tree it replaces, at every level, so placement and culling keep their footprint', () => {
    for (const [id, supplied] of pairs) {
      const source = readGlb(`meshy-012/${supplied}-near.glb`), limit = reach(source, top(source, bottomOf(source)));
      const height = top(files[`${id}-near`]!, 0);
      for (const lod of ['near', 'mid', 'far']) expect(reach(files[`${id}-${lod}`]!, height), `${id}-${lod}`).toBeLessThanOrEqual(limit);
    }
  });

  it('carries no images: every orchard file borrows the oaks’ bark and leaves from hero-oak-near', () => {
    for (const [name, glb] of Object.entries(files)) {
      expect(glb.json.images, name).toBeUndefined();
      expect(glb.json.asset.extras.tervainSharedImages, name).toBe('hero-oak-near.glb');
      expect(glb.json.materials.map((m: { name: string }) => m.name.split('|')[0]!.trim())).toEqual(['Foliage', 'Wood']);
    }
  });

  it('replaces the supplied orchard family slot for slot while its flag is on', () => {
    expect(heroOrchardEnabled('')).toBe(true); expect(heroOrchardEnabled('?heroorchard=0')).toBe(false);
    expect(activeMeshyTreeIds(true, true, true, true)).toEqual(expect.arrayContaining([...HERO_ORCHARD_IDS]));
    expect(activeMeshyTreeIds(true, true, true, false)).not.toContain(HERO_ORCHARD_IDS[0]);
    expect(MESHY_TREE_IDS as readonly string[]).not.toContain(HERO_ORCHARD_IDS[0]);
    expect(meshyTreeModelPath(HERO_ORCHARD_IDS[1], 'far')).toBe('flora/hero/hero-pear-far.glb');
    for (let seed = -3; seed < 9; seed++) {
      expect(heroFamilyId('orchard', seed), String(seed)).toBe(pairs.find(([, supplied]) => supplied === meshyTreeId('orchard', seed))![0]);
    }
  });
});

describe('generated orchard crowns in game', () => {
  let templates: MeshyTreeTemplates;
  beforeAll(async () => {
    templates = new Map(await Promise.all(HERO_ORCHARD_IDS.map(async id => [id, await Promise.all(['near', 'mid', 'far'].map(lod => meshyTreeTemplate(`../hero/${id}-${lod}.glb`))) as [GLTF, GLTF, GLTF]] as const)));
  }, 60_000);
  afterAll(() => { for (const levels of templates?.values() ?? []) for (const gltf of levels) gltf.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); });

  it('keeps the built near crown within the audit reach at the largest orchard scale', () => {
    const forest = createMeshyForest(templates);
    try {
      for (const id of HERO_ORCHARD_IDS) {
        const near = forest.variant('orchard', 0, id).lods[0];
        const matrix = new THREE.Matrix4().makeScale(ORCHARD_MAX_SCALE, ORCHARD_MAX_SCALE, ORCHARD_MAX_SCALE);
        const report = auditCanopies([{ label: id, species: 'orchard', wood: near.wood, leaves: near.leaf, matrix }],
          { lod: 0, alpha: false, gap: .75, woodReach: 1.5, maxOperations: 300_000_000 });
        expect(report.complete, id).toBe(true);
        expect(report.trees[0]!.detachedCards, id).toBe(0);
        expect(report.trees[0]!.detachedClumps, id).toBe(0);
      }
    } finally { forest.dispose(); }
  }, 300_000);
});
