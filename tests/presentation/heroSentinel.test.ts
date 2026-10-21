import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';
import { MAX_TREE_SCALE, woodReachLocal } from '../../src/presentation/canopy';
import { activeMeshyTreeIds, createMeshyForest, HERO_SENTINEL_IDS, heroSentinelEnabled, MESHY_TREE_IDS, meshyTreeModelPath, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplate } from './meshyTreeFixture';

interface Glb { json: any }
function readGlb(path: string): Glb {
  const bytes = readFileSync(new URL(`../../public/models/flora/${path}`, import.meta.url));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  return { json: JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8')) };
}
const positions = (glb: Glb) => glb.json.meshes.map((m: { primitives: { attributes: { POSITION: number } }[] }) => glb.json.accessors[m.primitives[0]!.attributes.POSITION]);
const triangles = (glb: Glb) => glb.json.meshes.reduce((n: number, m: { primitives: { indices: number }[] }) => n + glb.json.accessors[m.primitives[0]!.indices].count / 3, 0);
/** The box corner farthest from the trunk's axis, at a 16 m height (from the model's foot to its top). */
const reach = (glb: Glb, height: number) => Math.max(...positions(glb).map((a: { min: number[]; max: number[] }) => Math.hypot(Math.max(-a.min[0]!, a.max[0]!), Math.max(-a.min[2]!, a.max[2]!)))) * 16 / height;
const extent = (glb: Glb) => ({ bottom: Math.min(...positions(glb).map((a: { min: number[] }) => a.min[1]!)), top: Math.max(...positions(glb).map((a: { max: number[] }) => a.max[1]!)) });

describe('generated sentinel (tools/tree-gen --species sentinel)', () => {
  const id = HERO_SENTINEL_IDS[0];
  const files = Object.fromEntries(['near', 'mid', 'far'].map(lod => [lod, readGlb(`hero/${id}-${lod}.glb`)]));

  it('costs less than the supplied verdant-sentinel it draws at every level of detail', () => {
    for (const lod of ['near', 'mid', 'far']) expect(triangles(files[lod]!), lod).toBeLessThan(triangles(readGlb(`meshy-012/verdant-sentinel-${lod}.glb`)));
  });

  it('reaches no farther from its trunk than the verdant-sentinel, at every level, so placement and culling keep their footprint', () => {
    const source = readGlb('meshy-012/verdant-sentinel-near.glb'), s = extent(source), limit = reach(source, s.top - s.bottom);
    const top = extent(files.near!).top;
    for (const lod of ['near', 'mid', 'far']) expect(reach(files[lod]!, top), lod).toBeLessThanOrEqual(limit);
  });

  it('carries no images: it borrows the oaks’ bark and leaves from hero-oak-near', () => {
    for (const [lod, glb] of Object.entries(files)) {
      expect(glb.json.images, lod).toBeUndefined();
      expect(glb.json.asset.extras.tervainSharedImages, lod).toBe('hero-oak-near.glb');
    }
  });

  it('loads while its flag is on and is not part of the supplied catalog', () => {
    expect(heroSentinelEnabled('')).toBe(true); expect(heroSentinelEnabled('?herosentinel=0')).toBe(false);
    expect(activeMeshyTreeIds(true, true, true, true, true)).toContain(id);
    expect(activeMeshyTreeIds(true, true, true, true, false)).not.toContain(id);
    expect(MESHY_TREE_IDS as readonly string[]).toContain('verdant-sentinel');
    expect(meshyTreeModelPath(id, 'mid')).toBe('flora/hero/hero-sentinel-mid.glb');
  });
});

describe('the sentinel drawing verdant-sentinel placements in game', () => {
  let templates: MeshyTreeTemplates;
  beforeAll(async () => {
    templates = new Map(await Promise.all(HERO_SENTINEL_IDS.map(async id => [id, await Promise.all(['near', 'mid', 'far'].map(lod => meshyTreeTemplate(`../hero/${id}-${lod}.glb`))) as [GLTF, GLTF, GLTF]] as const)));
  }, 60_000);
  afterAll(() => { for (const levels of templates?.values() ?? []) for (const gltf of levels) gltf.scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); });

  it('draws a habitat’s verdant-sentinel in the birch and oak slots, with no card past the audit reach at the largest tree scale', () => {
    const forest = createMeshyForest(templates);
    try {
      for (const species of ['birch', 'oak'] as const) {
        const variant = forest.variant(species, 2, 'verdant-sentinel');
        expect(variant.assetId, species).toBe('hero-sentinel');
        for (const lod of [0, 1]) {
          const { wood, leaf } = variant.lods[lod]!;
          const set = detachedClumpSet(leaf!, wood!, woodReachLocal(1.5, MAX_TREE_SCALE), woodReachLocal(0.75, MAX_TREE_SCALE));
          expect(set.far.filter(Boolean).length, `${species} lod ${lod}`).toBe(0);
        }
      }
    } finally { forest.dispose(); }
  }, 300_000);
});
