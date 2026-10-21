import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { activeMeshyTreeIds, HERO_BIRCH_IDS, heroBirchEnabled, MESHY_TREE_IDS, meshyTreeModelPath } from '../../src/presentation/meshyTrees';

interface Glb { json: any; bin: Buffer }
function readGlb(name: string): Glb {
  const bytes = readFileSync(new URL(`../../public/models/flora/hero/${name}`, import.meta.url));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')), bin: bytes.subarray(28 + jsonLength) };
}
const primitive = (glb: Glb, name: string) => glb.json.meshes.find((m: { name: string }) => m.name === name).primitives[0];
const triangles = (glb: Glb, name: string) => glb.json.accessors[primitive(glb, name).indices].count / 3;
function attribute(glb: Glb, accessorIndex: number, size: number): number[] {
  const accessor = glb.json.accessors[accessorIndex], view = glb.json.bufferViews[accessor.bufferView];
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), out: number[] = [];
  for (let i = 0; i < accessor.count * size; i++) {
    out.push(accessor.componentType === 5126 ? glb.bin.readFloatLE(offset + i * 4) : glb.bin.readUInt8(offset + i) / (accessor.normalized ? 255 : 1));
  }
  return out;
}

describe('generated hero birch (tools/tree-gen --species birch)', () => {
  const files = Object.fromEntries(HERO_BIRCH_IDS.flatMap(id => ['near', 'mid', 'far'].map(lod => [`${id}-${lod}`, readGlb(`${id}-${lod}.glb`)])));

  it('stays within its triangle budget at every level of detail', () => {
    for (const id of HERO_BIRCH_IDS) {
      const total = (lod: string) => triangles(files[`${id}-${lod}`]!, 'Wood') + triangles(files[`${id}-${lod}`]!, 'Foliage');
      expect(total('near'), id).toBeLessThanOrEqual(14_000);
      expect(total('mid'), id).toBeLessThanOrEqual(8_000);
      expect(total('far'), id).toBeLessThanOrEqual(1_300);
    }
  });

  it('carries one set of birch images in hero-birch-near, which every other birch file names and borrows', () => {
    expect(files['hero-birch-near']!.json.images).toHaveLength(3);
    for (const [name, glb] of Object.entries(files)) {
      expect(glb.json.materials.map((m: { name: string }) => m.name)).toEqual(['Foliage | hero birch', 'Wood | hero birch']);
      expect(glb.json.asset.extras.tervainHeroTree.species).toBe('birch');
      if (name === 'hero-birch-near') continue;
      expect(glb.json.images, name).toBeUndefined();
      expect(glb.json.asset.extras.tervainSharedImages, name).toBe('hero-birch-near.glb');
    }
  });

  it('paints the white stem dark at its foot only', () => {
    for (const id of HERO_BIRCH_IDS) {
      const glb = files[`${id}-near`]!, wood = primitive(glb, 'Wood');
      const position = attribute(glb, wood.attributes.POSITION, 3), colour = attribute(glb, wood.attributes.COLOR_0, 4);
      const red = (lo: number, hi: number) => { const v: number[] = []; for (let i = 0; i < position.length / 3; i++) { const y = position[i * 3 + 1]!; if (y >= lo && y < hi) v.push(colour[i * 4]!); } return v.reduce((s, x) => s + x, 0) / v.length; };
      expect(red(0, 0.8), id).toBeLessThan(0.3);
      expect(red(3, 4.5), id).toBeGreaterThan(0.85);
    }
  });

  it('replaces the supplied birch family while its flag is on', () => {
    expect(heroBirchEnabled('')).toBe(true); expect(heroBirchEnabled('?herobirch=0')).toBe(false);
    expect(activeMeshyTreeIds(true, true)).toEqual(expect.arrayContaining([...HERO_BIRCH_IDS]));
    expect(activeMeshyTreeIds(true, false)).not.toContain(HERO_BIRCH_IDS[0]);
    expect(MESHY_TREE_IDS as readonly string[]).not.toContain(HERO_BIRCH_IDS[0]);
    expect(meshyTreeModelPath(HERO_BIRCH_IDS[0], 'near')).toBe('flora/hero/hero-birch-near.glb');
  });
});
