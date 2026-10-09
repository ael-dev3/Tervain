import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { MESHY_TREE_IDS, MESHY_TREE_LODS, createMeshyForest, meshyTreeParts, meshyTreeUrl, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { meshyTreeBinary, meshyTreeTemplates } from './meshyTreeFixture';
import { buildAncientTree } from '../../src/presentation/menu/menuTree';
import { MENU_TREE_SOURCE, assertMenuTreeBudget, createMenuTreeRemix } from '../../src/presentation/menu/menuTreeRemix';
import { HERMIT_DOOR } from '../../src/presentation/menu/menuCamp';
import { buildMenuHollow } from '../../src/presentation/menu/menuHollow';
import { createWispLighting } from '../../src/presentation/menu/menuWispLight';
import { MenuScene } from '../../src/presentation/menuScene';
import { menuResourceFixture } from './menuResourceFixture';

const preparedIds = [...MESHY_TREE_IDS, 'tree-3106', 'tree-1459'];
let templates: MeshyTreeTemplates;
beforeAll(async () => { templates = await meshyTreeTemplates(preparedIds); }, 30_000);
afterAll(() => {
  // Test fixture owns image-free original GPU handles; production forests must never dispose them.
  for (const source of templates?.values() ?? []) for (const gltf of source) gltf.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return; mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
  });
});

describe('actual supplied Meshy tree catalog', () => {
  it('retains the exempt custom Pine exactly at its approved three runtime hashes', () => {
    const files = {
      'solitary-pine-under-10k.glb': '4f650c34b2a0ddd7f084ad76d57f00c4bf82eaa6e6188748e0720430ab34e174',
      'solitary-pine-mid.glb': 'f3e1018ffca84baa6b9ee4ce9ef90884ffa562a4b899826b4058a98d7a2cb59f',
      'solitary-pine-far.glb': '958bd193f652d1ef9cce89c4de1a319730d0e87594126288ffaf479f9f9b02ec',
    };
    for (const [file, sha] of Object.entries(files)) expect(createHash('sha256')
      .update(readFileSync(new URL(`../../public/models/flora/${file}`, import.meta.url))).digest('hex')).toBe(sha);
  });
  it('resolves asset URLs under the deployed repository prefix', () => {
    expect(meshyTreeUrl('oak-elder', 'near', '/Tervain/', 'https://example.test/Tervain/').href)
      .toBe('https://example.test/Tervain/models/flora/meshy-012/oak-elder-near.glb');
  });

  it('decodes every active source level with finite actual wood/foliage, valid triangles/UVs/normals and a strict complete under-20k count', () => {
    expect(templates.size).toBe(preparedIds.length);
    for (const id of preparedIds) {
      const levels = templates.get(id)!;
      let previousTriangles = Infinity;
      for (const [level, gltf] of levels.entries()) {
        const decoded = meshyTreeParts(gltf), parts = [decoded.wood!, decoded.leaf!];
        let triangles = 0, errors = 0;
        for (const part of parts) {
          const p = part.geometry.getAttribute('position'), normal = part.geometry.getAttribute('normal'), uv = part.geometry.getAttribute('uv');
          expect(normal.count, `${id}:${level} normals`).toBe(p.count); expect(uv.count, `${id}:${level} UVs`).toBe(p.count);
          for (let i = 0; i < p.count; i++) {
            if (![p.getX(i), p.getY(i), p.getZ(i), normal.getX(i), normal.getY(i), normal.getZ(i), uv.getX(i), uv.getY(i)].every(Number.isFinite)) errors++;
          }
          const indices = part.geometry.index, count = indices?.count ?? p.count;
          if (count % 3) errors++;
          if (indices) for (let i = 0; i < indices.count; i++) {
            const index = indices.getX(i); if (!Number.isInteger(index) || index < 0 || index >= p.count) errors++;
          }
          triangles += count / 3;
          expect(part.material.metalness, `${id}:${level} natural material`).toBe(0);
          expect(part.material.roughness).toBeGreaterThanOrEqual(0.8);
        }
        expect(errors, `${id}:${level} malformed actual geometry`).toBe(0);
        expect(triangles, `${id}:${MESHY_TREE_LODS[level]} complete budget`).toBeGreaterThan(0);
        expect(triangles).toBeLessThan(20_000); expect(triangles).toBeLessThanOrEqual(previousTriangles); previousTriangles = triangles;
        const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3());
        expect([size.x, size.y, size.z].every(value => Number.isFinite(value) && value > 0.01)).toBe(true);
        const { bytes, json } = meshyTreeBinary(`${id}-${MESHY_TREE_LODS[level]}.glb`);
        expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
        // The near file carries the tree's images; its mid and far files share them (A71).
        const shared = json.asset?.extras?.tervainSharedImages;
        if (level === 0) expect((json.images ?? []).length).toBeGreaterThan(0);
        else { expect(shared).toBe(`${id}-near.glb`); expect(json.images).toBeUndefined(); }
        expect((json.images ?? []).every((image: { bufferView?: number; uri?: string }) => Number.isInteger(image.bufferView) && !image.uri)).toBe(true);
      }
    }
  });

  it('retains prepared asset topology/UVs with one uniform metre-scale transform and owns cloned resources across rebuilds', () => {
    const source = templates.get('tree-0208')!, originals = source.map(meshyTreeParts);
    const originalBounds = new THREE.Box3().setFromObject(source[0].scene);
    const height = originalBounds.max.y - originalBounds.min.y, scale = 18 / height;
    const spies = originals.flatMap(parts => [parts.wood!, parts.leaf!]).flatMap(part => [vi.spyOn(part.geometry, 'dispose'), vi.spyOn(part.material, 'dispose')]);
    const forest = createMeshyForest(templates), variant = forest.variant('oak', 1, 'tree-0208');
    const ownDisposals = variant.lods.flatMap(lod => [lod.wood!, lod.leaf!]).map(geometry => vi.spyOn(geometry, 'dispose'));
    expect(forest.variant('oak', 88, 'tree-0208')).toBe(variant);
    for (const [level, lod] of variant.lods.entries()) for (const kind of ['wood', 'leaf'] as const) {
      const original = originals[level]![kind]!, prepared = lod[kind]!;
      expect(prepared).not.toBe(original.geometry);
      // The near broadleaf crown carries the exported cards first, then a second layer of the same cards (A70).
      const sourceUv = original.geometry.getAttribute('uv').array;
      expect(prepared.getAttribute('uv').array.slice(0, sourceUv.length)).toEqual(sourceUv);
      const sourceIndex = original.geometry.index?.array;
      expect(Array.from(prepared.index?.array.slice(0, sourceIndex?.length) ?? [])).toEqual(Array.from(sourceIndex ?? []));
      const sourcePositions = original.geometry.getAttribute('position'), actualPositions = prepared.getAttribute('position');
      const point = new THREE.Vector3(); let maximumError = 0;
      for (let i = 0; i < sourcePositions.count; i += Math.max(1, Math.floor(sourcePositions.count / 128))) {
        point.fromBufferAttribute(sourcePositions, i).applyMatrix4(original.matrix);
        point.y -= originalBounds.min.y; point.multiplyScalar(scale);
        maximumError = Math.max(maximumError, Math.abs(point.x - actualPositions.getX(i)), Math.abs(point.y - actualPositions.getY(i)), Math.abs(point.z - actualPositions.getZ(i)));
      }
      expect(maximumError).toBeLessThan(0.00002);
    }
    forest.dispose(); forest.dispose(); for (const spy of ownDisposals) expect(spy).toHaveBeenCalledTimes(1);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    expect(() => forest.variant('oak', 1)).toThrow(/disposed/);
    const rebuilt = createMeshyForest(templates), next = rebuilt.variant('oak', 1, 'tree-0208');
    expect(next.lods.map(lod => lod.tris)).toEqual(variant.lods.map(lod => lod.tris));
    rebuilt.dispose();
  });

  it('fits the actual selected source crown with carved interior while preserving musical contact curves', () => {
    const tree = buildAncientTree(1207, { leafCards: 0, woodDetail: 0.8,
      door: { az: 2, halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop,
        opening: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height } } });
    const lights = createWispLighting(4), crown = createMenuTreeRemix(templates.get(MENU_TREE_SOURCE)!, tree,
      null, lights);
    const root = new THREE.Group(); root.add(new THREE.Mesh(tree.wood));
    for (const part of crown.parts) root.add(new THREE.Mesh(part.geometry, part.material));
    const hollow = buildMenuHollow(tree.door!, { lights }); root.add(hollow.mesh);
    expect(assertMenuTreeBudget(root)).toBeLessThan(20_000);
    expect(crown.sourceLod).toBe(0);
    // This actual-geometry fixture strips decoded images; MASK cards cannot
    // invent visible perches without pixel evidence. Native review covers pixels.
    expect(crown.leafSites).toEqual([]);
    expect(crown.crown.bottom).toBeGreaterThan(2.5); expect(crown.crown.top).toBeLessThan(20);
    expect(tree.capsules.length / 8).toBeGreaterThan(200); expect(tree.door).toBeDefined();
    hollow.dispose(); crown.dispose(); tree.wood.dispose(); tree.leaves.dispose();
  });

  it('keeps the actual complete installed menu tree below 20k and score/choreography stable across presets', () => {
    const high = new MenuScene({ quality: 'high', resources: menuResourceFixture(), treeTemplates: templates });
    let low: MenuScene | undefined;
    try {
      expect(high.stats.treeTriangles).toBeGreaterThan(10_000); expect(high.stats.treeTriangles).toBeLessThan(20_000);
      expect(high.stats.treeSource).toBe('tree-0208:LOD0');
      high.update(0.04, false, { time: 35, duration: 214.2, playing: true, gain: 0.352 });
      expect(high.doorOpening).toBeGreaterThan(0);
      low = new MenuScene({ quality: 'low', resources: menuResourceFixture(), treeTemplates: templates,
        awakening: high.awakeningState, grove: high.grove });
      expect(low.stats.treeTriangles).toBe(high.stats.treeTriangles); expect(low.stats.treeSource).toBe(high.stats.treeSource);
      expect(low.grove).toBe(high.grove); expect(low.awakeningState).toEqual(high.awakeningState);
      const frozen = low.awakeningState; low.update(10, true, { time: 90, duration: 214.2, playing: true, gain: 0.352 });
      expect(low.awakeningState).toEqual(frozen);
    } finally { high.dispose(); low?.dispose(); }
  });

});
