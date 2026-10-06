import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { assertNaturalModelBudget, NATURAL_MODEL_TRIANGLE_LIMIT } from '../../src/presentation/naturalModelBudget';
import { buildTreeVariant, SPECIES } from '../../src/presentation/treeGen';
import { createPineForest } from '../../src/presentation/solitaryPine';
import { rockShapes } from '../../src/presentation/rockGeometry';
import { buildAncientTree } from '../../src/presentation/menu/menuTree';
import { buildMenuHollow } from '../../src/presentation/menu/menuHollow';
import { HERMIT_DOOR, standingStones } from '../../src/presentation/menu/menuCamp';
import { slabGeometry } from '../../src/presentation/menu/menuStones';
import { pineTemplates } from './pineFixture';
import { rockPileTemplate } from './rockPileFixture';

describe('complete natural model triangle budget', () => {
  it('counts real wood and foliage together at every authored species, seed and LOD', () => {
    expect(NATURAL_MODEL_TRIANGLE_LIMIT).toBe(20_000);
    for (const species of SPECIES) for (let seed = 1; seed <= 3; seed++) {
      const variant = buildTreeVariant(species, seed);
      try {
        for (const lod of variant.lods) expect(assertNaturalModelBudget(`${species}:${seed}`, [lod.wood, lod.leaf])).toBe(lod.tris);
        // Adjacent LODs coexist during complementary fades; even their submitted sum fits one complete model.
        expect(variant.lods[0].tris + variant.lods[1].tris).toBeLessThanOrEqual(NATURAL_MODEL_TRIANGLE_LIMIT);
      } finally { variant.lods.forEach(lod => { lod.wood?.dispose(); lod.leaf?.dispose(); }); }
    }
  });

  it('checks all actual imported pine meshes, not just the bark or a source metadata claim', async () => {
    const forest = createPineForest(await pineTemplates());
    try {
      for (const species of ['pine', 'fir', 'shorepine'] as const) for (let seed = 1; seed <= 3; seed++) {
        const model = forest.variant(species, seed);
        expect(model.lods.map(lod => assertNaturalModelBudget(`${species}:${seed}`, [lod.wood, lod.leaf]))).toEqual([9706, 3610, 48]);
        expect(model.lods[0].tris + model.lods[1].tris).toBeLessThan(20_000);
      }
    } finally { forest.dispose(); }
  });

  it('includes the menu tree hollow and every preset crown rather than treating its separate parts as exemptions', () => {
    for (const cards of [900, 1500, 2200]) {
      const tree = buildAncientTree(1207, { leafCards: cards, ground: (x, z) => 0.03 * x + 0.015 * z,
        door: { az: 1.68, halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop, opening: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height } } });
      const hollow = buildMenuHollow(tree.door!, { lights: { count: 0, uniforms: { uWispLights: { value: [] }, uWispColours: { value: [] } } } });
      try {
        expect(assertNaturalModelBudget(`Ancient menu tree ${cards}`, [tree.wood, tree.leaves, hollow.mesh.geometry])).toBeLessThanOrEqual(20_000);
      } finally { tree.wood.dispose(); tree.leaves.dispose(); hollow.dispose(); }
    }
  });

  it('caps procedural boulders, standing stones and the new complete imported rock pile', async () => {
    for (const list of Object.values(rockShapes())) for (const geometry of list) expect(assertNaturalModelBudget('Fractured stone', [geometry])).toBeLessThan(20_000);
    const stones = standingStones();
    for (const stone of [...stones.slabs, ...stones.uprights, stones.cap]) {
      const geometry = slabGeometry(stone.spec);
      try { expect(assertNaturalModelBudget('Menu standing stone', [geometry])).toBeLessThan(20_000); }
      finally { geometry.dispose(); }
    }
    const template = await rockPileTemplate();
    const meshes: THREE.BufferGeometry[] = [];
    template.scene.traverse(object => { if ((object as THREE.Mesh).isMesh) meshes.push((object as THREE.Mesh).geometry); });
    expect(assertNaturalModelBudget('Rock pile', meshes)).toBe(5220);
    meshes.forEach(geometry => geometry.dispose());
  });

  it('rejects a combined over-budget model and malformed/empty topology', () => {
    const large = new THREE.BufferGeometry(), extra = new THREE.BufferGeometry(), broken = new THREE.BufferGeometry();
    large.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(19999 * 9), 3));
    extra.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(2 * 9), 3));
    broken.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(4 * 3), 3));
    try {
      expect(assertNaturalModelBudget('Whole model', [large])).toBe(19999);
      expect(() => assertNaturalModelBudget('Whole model', [large, extra])).toThrow('20001 triangles');
      expect(() => assertNaturalModelBudget('Empty', [])).toThrow();
      expect(() => assertNaturalModelBudget('Broken', [broken])).toThrow('triangle-list');
    } finally { large.dispose(); extra.dispose(); broken.dispose(); }
  });
});
