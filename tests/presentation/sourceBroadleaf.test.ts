import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildSourceBroadleaf } from '../../src/presentation/sourceBroadleaf';
import { assertNaturalModelBudget } from '../../src/presentation/naturalModelBudget';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { defaultSettings } from '../../src/platform/settings';
import { Terrain } from '../../src/world/terrain';
import { buildStaticColliders } from '../../src/world/colliders';
import { Exclusions } from '../../src/presentation/vegetation';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { groundedTreeY } from '../../src/presentation/treeGrounding';
import { createPineForest, isPineSpecies } from '../../src/presentation/solitaryPine';
import { buildTreeVariant, type TreeVariant } from '../../src/presentation/treeGen';
import { broadleafBinary, broadleafTemplate } from './broadleafFixture';
import { pineTemplates } from './pineFixture';

let template: GLTF;
let forest: ReturnType<typeof createPineForest>;
const variants = new Map<string, TreeVariant>();
beforeAll(async () => { template = await broadleafTemplate(); forest = createPineForest(await pineTemplates()); });
afterAll(() => {
  template.scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.isMesh) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); } });
  forest.dispose(); variants.forEach(v => v.lods.forEach(lod => { lod.wood?.dispose(); lod.leaf?.dispose(); }));
});
function fixture(quality: 'low' | 'medium' | 'high' = 'high') {
  const terrain = new Terrain(), excl = new Exclusions(terrain), colliders = buildStaticColliders(terrain);
  const population = createFloraPopulation(terrain, excl, (tree, radius) => isPineSpecies(tree.sp)
    ? forest.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : radius,
  tree => {
    let variant = isPineSpecies(tree.sp) ? forest.variant(tree.sp, tree.v + 1) : variants.get(`${tree.sp}:${tree.v}`);
    if (!variant) { variant = buildTreeVariant(tree.sp, tree.v + 1); variants.set(`${tree.sp}:${tree.v}`, variant); }
    return groundedTreeY(terrain, tree, variant);
  });
  registerFloraColliders(population, colliders);
  const previousIds = colliders.all.map(c => c.id);
  const module = buildSourceBroadleaf({ terrain, colliders, excl, quality, settings: { ...defaultSettings(), quality },
    library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, template);
  return { module, terrain, colliders, excl, previousIds };
}

describe('source-derived Guardian broadleaf', () => {
  it('counts the reviewed volume and restrained fringe together under the whole-model cap', () => {
    const { bytes, json, binary } = broadleafBinary();
    const receipt = JSON.parse(readFileSync(new URL('../../docs/engineering/broadleaf-assets.json', import.meta.url), 'utf8'));
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(receipt.runtime.sha256);
    expect(receipt.source.triangles).toBe(1890128); expect(receipt.runtime.triangles).toBeLessThanOrEqual(20_000);
    const count = json.meshes.flatMap((m: any) => m.primitives).reduce((n: number, p: any) => n + json.accessors[p.indices].count / 3, 0);
    expect(count).toBe(receipt.runtime.triangles); expect(count).toBe(19_319);
    expect(receipt.runtime.meshes.reduce((n: number, m: { triangles: number }) => n + m.triangles, 0)).toBe(count);
    expect(receipt.runtime.meshes[2].triangles).toBe(600);
    expect(receipt.method.fringe.quads).toBe(300);
    expect(json.materials.some((m: any) => m.alphaMode === 'MASK' && m.alphaCutoff > 0)).toBe(true);
    expect(json.materials.every((m: any) => m.pbrMetallicRoughness.metallicFactor === 0)).toBe(true);
    expect(json.animations).toBeUndefined();
    expect(bytes.length).toBeLessThan(receipt.source.bytes * 0.1);
    for (const [index, image] of json.images.entries()) {
      const view = json.bufferViews[image.bufferView], data = binary.subarray(view.byteOffset, view.byteOffset + view.byteLength);
      expect(createHash('sha256').update(data).digest('hex')).toBe(receipt.runtime.maps[index].sha256);
    }
  });

  it('retains canonical pines and routes with a few stable grounded obstacle identities across all presets', () => {
    let previous: unknown;
    for (const quality of ['low', 'medium', 'high'] as const) {
      const f = fixture(quality);
      try {
        expect(f.module.placements.length).toBeGreaterThan(0); expect(f.module.placements.length).toBeLessThanOrEqual(4);
        expect(f.colliders.all.slice(0, f.previousIds.length).map(c => c.id)).toEqual(f.previousIds);
        if (previous) expect(f.module.placements).toEqual(previous); else previous = f.module.placements;
        for (const p of f.module.placements) {
          expect(f.excl.blocked(p.x, p.z, p.radius + 0.5)).toBe(false);
          expect(f.colliders.cast(p.x, p.z, p.x, p.z, p.radius + 0.35, new Set([p.id]))).toBeNull();
          const tree = f.module.group.getObjectByName(p.id)!;
          expect(tree.scale.x).toBe(tree.scale.y); expect(tree.scale.y).toBe(tree.scale.z);
          expect(tree.rotation.x).toBe(0); expect(tree.rotation.z).toBe(0);
          expect(tree.children).toHaveLength(3);
          expect(assertNaturalModelBudget('Whole rendered broadleaf', tree.children.map(child => (child as THREE.Mesh).geometry))).toBe(f.module.stats!().sourceBroadleafModelTris);
        }
      } finally { f.module.dispose!(); }
    }
  });

  it('registers exact rendered woody buffers and seats source roots below every sampled terrain facet', () => {
    const f = fixture(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), point = new THREE.Vector3();
    try {
      for (const p of f.module.placements) {
        const tree = f.module.group.getObjectByName(p.id)!, wood = tree.children[0] as THREE.Mesh;
        const contact = f.module.physicalWood.find(contact => contact.id === p.id)!;
        const pos = wood.geometry.getAttribute('position'), index = wood.geometry.index!;
        expect(contact.indices.length).toBe(index.count); expect(contact.positions.length).toBe(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          expect(contact.positions[i * 3]).toBe(pos.getX(i)); expect(contact.positions[i * 3 + 1]).toBe(pos.getY(i)); expect(contact.positions[i * 3 + 2]).toBe(pos.getZ(i));
        }
        tree.updateMatrixWorld(true);
        for (let i = 0; i < index.count; i += 3) {
          a.fromBufferAttribute(pos, index.getX(i)); b.fromBufferAttribute(pos, index.getX(i + 1)); c.fromBufferAttribute(pos, index.getX(i + 2));
          expect([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z].every(Number.isFinite)).toBe(true);
          if (Math.min(a.y, b.y, c.y) > 0.025) continue;
          for (let u = 0; u <= 3; u++) for (let v = 0; v <= 3 - u; v++) {
            point.copy(a).multiplyScalar(u / 3).addScaledVector(b, v / 3).addScaledVector(c, 1 - (u + v) / 3);
            if (point.y > 0.025 + 1e-7) continue;
            point.applyMatrix4(tree.matrixWorld);
            expect(point.y).toBeLessThanOrEqual(f.terrain.heightAt(point.x, point.z) - 0.059);
          }
        }
      }
    } finally { f.module.dispose!(); }
  });

  it('keeps attached wood/crown static, with private once-disposed resources and finite detached-leaf release sites', () => {
    const f = fixture(), meshes: THREE.Mesh[] = [];
    f.module.group.traverse(o => { if ((o as THREE.Mesh).isMesh && !o.name.startsWith('detached')) meshes.push(o as THREE.Mesh); });
    try {
      const geometries = new Set(meshes.filter(mesh => !(mesh as THREE.InstancedMesh).isInstancedMesh).map(mesh => mesh.geometry));
      expect(geometries.size).toBe(3);
      const spies = [...geometries].map(geometry => vi.spyOn(geometry, 'dispose'));
      const source: THREE.BufferGeometry[] = []; template.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) source.push((o as THREE.Mesh).geometry); });
      const sourceSpies = source.map(geometry => vi.spyOn(geometry, 'dispose'));
      expect(f.module.stats!().fallingLeaves).toBeGreaterThan(0);
      f.module.dispose!(); f.module.dispose!(); spies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1)); sourceSpies.forEach(spy => expect(spy).not.toHaveBeenCalled());
      expect(f.module.group.children).toHaveLength(0);
    } finally { vi.restoreAllMocks(); f.module.dispose!(); }
  });
});
