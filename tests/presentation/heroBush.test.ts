import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { activeMeshyTreeIds, HERO_BUSH_IDS, heroBushEnabled, heroFamilyId, MESHY_TREE_IDS, meshyTreeId, meshyTreeModelPath } from '../../src/presentation/meshyTrees';

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
      expect(total('far'), id).toBeLessThanOrEqual(1_400);
    }
  });

  it('stays within the width of the supplied shrubs at every level, so placement, clearings and culling keep their footprint', () => {
    for (const id of HERO_BUSH_IDS) {
      // In game a bush is scaled to 1.5 m by its near model's top; the supplied shrubs are 1.53 to 1.70 m across.
      const near = files[`${id}-near`]!, top = Math.max(...['Wood', 'Foliage'].map(name => near.json.accessors[primitive(near, name).attributes.POSITION].max[1]));
      for (const lod of ['near', 'mid', 'far']) {
        const glb = files[`${id}-${lod}`]!;
        for (const name of ['Wood', 'Foliage']) {
          const position = glb.json.accessors[primitive(glb, name).attributes.POSITION];
          for (const axis of [0, 2]) expect((position.max[axis] - position.min[axis]) * 1.5 / top, `${id}-${lod} ${name}`).toBeLessThanOrEqual(1.72);
        }
      }
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
    // Stems fanning out through the crown from a root crown below the ground plane (y = 0), under 2.4 m before scaling.
    expect(position.max[0] - position.min[0]).toBeGreaterThan(1.2);
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

  it('shares templates slot for slot as the supplied shrubs do, so the bushes draw no more batches than they did', () => {
    const seeds = Array.from({ length: 12 }, (_, i) => i - 3);
    for (const a of seeds) for (const b of seeds) {
      expect(heroFamilyId('shrub', a) === heroFamilyId('shrub', b), `${a}/${b}`).toBe(meshyTreeId('shrub', a) === meshyTreeId('shrub', b));
    }
    expect(new Set(seeds.map(s => heroFamilyId('shrub', s)))).toEqual(new Set(HERO_BUSH_IDS));
  });
});
