import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { heroPineEnabled, HERO_PINE_DEFAULT, HERO_PINE_FILES, HERO_PINE_VARIANTS } from '../../src/presentation/heroPine';

interface Glb { json: any }
function readGlb(name: string): Glb {
  const bytes = readFileSync(new URL(`../../public/models/flora/hero/${name}`, import.meta.url));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  return { json: JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8')) };
}
const mesh = (glb: Glb, name: string) => glb.json.meshes.find((m: { name: string }) => m.name === name).primitives[0];
const tris = (glb: Glb, name: string) => glb.json.accessors[mesh(glb, name).indices].count / 3;

describe('generated hero pine (tools/tree-gen-pine)', () => {
  const lods = Object.fromEntries(['near', 'mid', 'far'].map((lod) => [lod, readGlb(`hero-pine-${lod}.glb`)]));
  const total = (lod: string, v: number) => tris(lods[lod]!, `v${v}-wood`) + tris(lods[lod]!, `v${v}-leaf`);

  it('keeps the triangle budget of every variant and level', () => {
    for (let v = 0; v < HERO_PINE_VARIANTS; v++) {
      expect(total('near', v)).toBeLessThanOrEqual(9_800);
      expect(total('mid', v)).toBeLessThanOrEqual(3_700);
      expect(total('far', v)).toBeLessThanOrEqual(300);
    }
  });

  it('writes the wind attributes, baked AO and a trunk-only collision index', () => {
    for (const glb of Object.values(lods)) for (let v = 0; v < HERO_PINE_VARIANTS; v++) for (const part of ['wood', 'leaf']) {
      const p = mesh(glb, `v${v}-${part}`);
      for (const key of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'COLOR_0', '_WIND', '_PIVOT']) expect(p.attributes[key], key).toBeDefined();
      expect(glb.json.accessors[p.attributes._WIND].type).toBe('VEC4');
      if (part === 'wood') {
        const extras = glb.json.meshes.find((m: { name: string }) => m.name === `v${v}-wood`).extras;
        expect(extras.trunkIndexCount % 3).toBe(0);
        expect(extras.trunkIndexCount).toBeLessThanOrEqual(glb.json.accessors[p.indices].count);
      }
    }
  });

  it('is off by default, on with ?heropine=1, and ?heropine=0 is the escape', () => {
    expect(heroPineEnabled('')).toBe(HERO_PINE_DEFAULT); expect(heroPineEnabled('?heropine=0')).toBe(false); expect(heroPineEnabled('?heropine=1')).toBe(true); expect(heroPineEnabled('?heropine=x')).toBe(HERO_PINE_DEFAULT);
    expect(HERO_PINE_FILES).toHaveLength(3);
  });
});
