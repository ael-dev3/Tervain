import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { activeMeshyTreeIds, HERO_BUSH_IDS, heroBushEnabled, MESHY_TREE_IDS, meshyTreeModelPath } from '../../src/presentation/meshyTrees';

interface Glb { json: any; bin: Buffer }
function readGlb(name: string): Glb {
  const bytes = readFileSync(new URL(`../../public/models/flora/hero/${name}`, import.meta.url));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')), bin: bytes.subarray(28 + jsonLength) };
}
const primitive = (glb: Glb, name: string) => glb.json.meshes.find((m: { name: string }) => m.name === name).primitives[0];
const triangles = (glb: Glb, name: string) => glb.json.accessors[primitive(glb, name).indices].count / 3;

describe('generated bush (tools/tree-gen --species bush)', () => {
  const files = Object.fromEntries(HERO_BUSH_IDS.flatMap(id => ['near', 'mid', 'far'].map(lod => [`${id}-${lod}`, readGlb(`${id}-${lod}.glb`)])));

  it('costs a fraction of the supplied shrubs it replaces at every level of detail', () => {
    for (const id of HERO_BUSH_IDS) {
      const total = (lod: string) => triangles(files[`${id}-${lod}`]!, 'Wood') + triangles(files[`${id}-${lod}`]!, 'Foliage');
      expect(total('near'), id).toBeLessThanOrEqual(5_000);
      expect(total('mid'), id).toBeLessThanOrEqual(2_200);
      expect(total('far'), id).toBeLessThanOrEqual(700);
    }
  });

  it('carries no images: every bush file borrows the oaks\' bark and leaves from hero-oak-near', () => {
    for (const [name, glb] of Object.entries(files)) {
      expect(glb.json.images, name).toBeUndefined();
      expect(glb.json.asset.extras.tervainSharedImages, name).toBe('hero-oak-near.glb');
      expect(glb.json.asset.extras.tervainHeroTree.species).toBe('bush');
      expect(glb.json.materials.map((m: { name: string }) => m.name)).toEqual(['Foliage | hero bush', 'Wood | hero bush']);
    }
  });

  it('grows from many stems at the ground, not one trunk', () => {
    const wood = primitive(files['hero-bush-near']!, 'Wood'), position = files['hero-bush-near']!.json.accessors[wood.attributes.POSITION];
    // Wider than tall within the dome, standing on the ground plane (y = 0).
    expect(position.max[0] - position.min[0]).toBeGreaterThan(1.5);
    expect(position.max[1]).toBeLessThan(2.4);
    expect(position.min[1]).toBeLessThan(0);
  });

  it('replaces the supplied shrub family while its flag is on', () => {
    expect(heroBushEnabled('')).toBe(true); expect(heroBushEnabled('?herobush=0')).toBe(false);
    expect(activeMeshyTreeIds(true, true, true)).toEqual(expect.arrayContaining([...HERO_BUSH_IDS]));
    expect(activeMeshyTreeIds(true, true, false)).not.toContain(HERO_BUSH_IDS[0]);
    expect(MESHY_TREE_IDS as readonly string[]).not.toContain(HERO_BUSH_IDS[0]);
    expect(meshyTreeModelPath(HERO_BUSH_IDS[0], 'near')).toBe('flora/hero/hero-bush-near.glb');
  });
});
