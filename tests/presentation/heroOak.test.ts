import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { activeMeshyTreeIds, heroOakEnabled, HERO_OAK_ID, MESHY_TREE_IDS, meshyTreeModelPath, meshyTreeUrl } from '../../src/presentation/meshyTrees';

interface Glb { json: any; bin: Buffer }
function readGlb(name: string): Glb {
  const bytes = readFileSync(new URL(`../../public/models/flora/hero/${name}`, import.meta.url));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')), bin: bytes.subarray(28 + jsonLength) };
}
const meshByName = (glb: Glb, name: string) => glb.json.meshes.find((m: { name: string }) => m.name === name).primitives[0];
const triangles = (glb: Glb, name: string) => glb.json.accessors[meshByName(glb, name).indices].count / 3;

describe('generated hero oak (tools/tree-gen)', () => {
  const lods = Object.fromEntries(['near', 'mid', 'far'].map((lod) => [lod, readGlb(`hero-oak-${lod}.glb`)]));

  it('keeps the triangle budget of each level of detail', () => {
    const total = (lod: string) => triangles(lods[lod]!, 'Wood') + triangles(lods[lod]!, 'Foliage');
    expect(total('near')).toBeLessThanOrEqual(18_000);
    expect(triangles(lods.near!, 'Wood')).toBeGreaterThan(3_500);
    expect(total('mid')).toBeLessThanOrEqual(11_000);
    expect(total('far')).toBeLessThanOrEqual(1_300);
  });

  it('carries the hierarchical-wind attributes and the baked crown data on every level', () => {
    for (const glb of Object.values(lods)) for (const name of ['Wood', 'Foliage']) {
      const { attributes } = meshByName(glb, name);
      for (const key of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'COLOR_0', '_WIND', '_PIVOT']) expect(attributes[key], `${name} ${key}`).toBeDefined();
      expect(glb.json.accessors[attributes._WIND].type).toBe('VEC4');
      expect(glb.json.accessors[attributes._PIVOT].type).toBe('VEC3');
    }
  });

  it('marks where the trunk-only collision geometry ends (roots and skirt follow it)', () => {
    for (const glb of Object.values(lods)) {
      const index = meshByName(glb, 'Wood').extras.tervainWoodCollisionIndex as number;
      expect(index).toBeGreaterThan(0); expect(index).toBeLessThanOrEqual(glb.json.accessors[meshByName(glb, 'Wood').indices].count);
      expect(index % 3).toBe(0);
    }
  });

  it('shares the near level\'s images with mid and far, like the supplied trees', () => {
    expect(lods.near!.json.images).toHaveLength(3);
    for (const lod of ['mid', 'far']) { expect(lods[lod]!.json.images).toBeUndefined(); expect(lods[lod]!.json.asset.extras.tervainSharedImages).toBe('hero-oak-near.glb'); }
    expect(lods.near!.json.materials.map((m: { name: string }) => m.name)).toEqual(lods.mid!.json.materials.map((m: { name: string }) => m.name));
  });

  it('stays out of the supplied-tree set unless its flag is on', () => {
    expect(MESHY_TREE_IDS as readonly string[]).not.toContain(HERO_OAK_ID);
    expect(heroOakEnabled('')).toBe(true); expect(heroOakEnabled('?herooak=0')).toBe(false); expect(heroOakEnabled('?herooak=1')).toBe(true);
    expect(activeMeshyTreeIds(false)).toBe(MESHY_TREE_IDS); expect(activeMeshyTreeIds(true)).toContain(HERO_OAK_ID);
    expect(meshyTreeModelPath(HERO_OAK_ID, 'near')).toBe('flora/hero/hero-oak-near.glb');
    expect(meshyTreeUrl(HERO_OAK_ID, 'far', '/Tervain/', 'https://example.test/Tervain/').href).toMatch(/flora\/hero\/hero-oak-far\.glb/);
  });
});
