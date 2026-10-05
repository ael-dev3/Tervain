import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildSourceRockPiles } from '../../src/presentation/sourceRockPile';
import { assertNaturalModelBudget } from '../../src/presentation/naturalModelBudget';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { defaultSettings } from '../../src/platform/settings';
import { Terrain } from '../../src/world/terrain';
import { buildStaticColliders } from '../../src/world/colliders';
import { Exclusions } from '../../src/presentation/vegetation';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { rockPileBinary, rockPileTemplate } from './rockPileFixture';

let template: GLTF;
beforeAll(async () => { template = await rockPileTemplate(); });
afterAll(() => { template.scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.isMesh) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); } }); });

function fixture(quality: 'low' | 'medium' | 'high' = 'high') {
  const terrain = new Terrain(), excl = new Exclusions(terrain), colliders = buildStaticColliders(terrain);
  const forest = createFloraPopulation(terrain, excl);
  registerFloraColliders(forest, colliders);
  const trunks = colliders.all.flatMap(c => c.kind === 'circle' && c.id.startsWith('tree:') ? [{ x: c.x, z: c.z, radius: c.r }] : []);
  const scatter = createScatterPopulation(terrain, excl, trunks);
  registerScatterColliders(scatter, colliders);
  terrain.registerRockSurfaces(colliders.rockMeshes);
  const previousContacts = [...colliders.rockMeshes], previousIds = colliders.all.map(c => c.id);
  const module = buildSourceRockPiles({ terrain, colliders, excl, quality, settings: { ...defaultSettings(), quality },
    library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, template);
  return { terrain, colliders, excl, module, previousContacts, previousIds };
}

describe('owner rock pile derivative', () => {
  it('matches the recorded runtime hash and retains every original geometry buffer byte under the complete model budget', () => {
    const { bytes, json, binary } = rockPileBinary();
    const receipt = JSON.parse(readFileSync(new URL('../../docs/engineering/rock-pile-assets.json', import.meta.url), 'utf8'));
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(receipt.runtime.sha256);
    expect(receipt.runtime.triangles).toBe(5220); expect(receipt.source.triangles).toBe(5220);
    expect(bytes.length).toBeLessThan(receipt.source.bytes * 0.25);
    for (const record of receipt.runtime.geometryBufferFidelity) {
      const view = json.bufferViews[record.runtimeBufferView], data = binary.subarray(view.byteOffset, view.byteOffset + view.byteLength);
      expect(view.byteLength).toBe(record.bytes);
      expect(createHash('sha256').update(data).digest('hex')).toBe(record.sha256);
    }
    const materials = json.materials;
    expect(materials).toHaveLength(1); expect(materials[0].emissiveTexture).toBeUndefined();
    expect(materials[0].pbrMetallicRoughness.metallicFactor).toBe(0);
    expect(materials[0].pbrMetallicRoughness.roughnessFactor).toBe(1);
    expect(json.images).toHaveLength(3);
    for (let i = 1; i < json.images.length; i++) {
      const view = json.bufferViews[json.images[i].bufferView], data = binary.subarray(view.byteOffset, view.byteOffset + view.byteLength);
      expect(data.readUInt32BE(16)).toBe(i === 1 ? 1024 : 512);
      expect(data.readUInt32BE(20)).toBe(i === 1 ? 1024 : 512);
    }
  });

  it('adds a modest deterministic set without replacing canonical rocks, filling the arrival, or overlapping existing tree/route claims', () => {
    const f = fixture();
    try {
      expect(f.module.placements.length).toBeGreaterThanOrEqual(2);
      expect(f.module.placements.length).toBeLessThanOrEqual(6);
      expect(f.colliders.rockMeshes.slice(0, f.previousContacts.length)).toEqual(f.previousContacts);
      expect(f.colliders.all.slice(0, f.previousIds.length).map(c => c.id)).toEqual(f.previousIds);
      for (const p of f.module.placements) {
        expect(f.excl.blocked(p.x, p.z, p.radius + 0.5)).toBe(false);
        const own = new Set([p.id]);
        expect(f.colliders.cast(p.x, p.z, p.x, p.z, p.radius + 0.35, own)).toBeNull();
      }
    } finally { f.module.dispose!(); }
  });

  it('keeps identical meshes and contacts across Low, Medium and High, using uniform source transforms and real submitted triangle counts', () => {
    let first: unknown;
    for (const quality of ['low', 'medium', 'high'] as const) {
      const f = fixture(quality);
      try {
        const transforms = f.module.placements.map(p => ({ ...p }));
        if (first) expect(transforms).toEqual(first); else first = transforms;
        expect(f.module.group.children).toHaveLength(f.module.contacts.length);
        for (const object of f.module.group.children) {
          const mesh = object as THREE.Mesh;
          expect(assertNaturalModelBudget('Rendered source pile', [mesh.geometry])).toBe(5220);
          expect(mesh.scale.x).toBe(mesh.scale.y); expect(mesh.scale.y).toBe(mesh.scale.z);
          expect(mesh.rotation.x).toBe(0); expect(mesh.rotation.z).toBe(0);
          expect((mesh.material as THREE.MeshStandardMaterial).metalness).toBe(0);
          expect((mesh.material as THREE.MeshStandardMaterial).roughness).toBe(1);
          expect((mesh.material as THREE.MeshStandardMaterial).emissive.getHex()).toBe(0);
        }
        expect(f.module.stats!()).toEqual({ sourceRockPiles: transforms.length, sourceRockModelTris: 5220, sourceRockTris: transforms.length * 5220 });
      } finally { f.module.dispose!(); }
    }
  });

  it('uses every rendered source vertex/index in finite contact, with the entire basal surface seated in the actual triangulated soil', () => {
    const f = fixture();
    const point = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    try {
      for (const object of f.module.group.children) {
        const mesh = object as THREE.Mesh, contact = f.module.contacts.find(rock => rock.id === mesh.name)!;
        const positions = mesh.geometry.getAttribute('position'), index = mesh.geometry.index!;
        expect(contact.indices.length).toBe(index.count); expect(contact.positions.length).toBe(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
          expect(contact.positions[i * 3]).toBeCloseTo(point.x, 4);
          expect(contact.positions[i * 3 + 1]).toBeCloseTo(point.y, 5);
          expect(contact.positions[i * 3 + 2]).toBeCloseTo(point.z, 4);
        }
        for (let i = 0; i < index.count; i++) expect(contact.indices[i]).toBe(index.getX(i));
        const bounds = mesh.geometry.boundingBox!, plane = bounds.min.y + (bounds.max.y - bounds.min.y) * 0.12;
        for (let triangle = 0; triangle < index.count; triangle += 3) {
          a.fromBufferAttribute(positions, index.getX(triangle)); b.fromBufferAttribute(positions, index.getX(triangle + 1)); c.fromBufferAttribute(positions, index.getX(triangle + 2));
          if (Math.min(a.y, b.y, c.y) > plane) continue;
          for (let u = 0; u <= 3; u++) for (let v = 0; v <= 3 - u; v++) {
            point.copy(a).multiplyScalar(u / 3).addScaledVector(b, v / 3).addScaledVector(c, 1 - (u + v) / 3);
            if (point.y > plane + 1e-7) continue;
            point.applyMatrix4(mesh.matrixWorld);
            expect(point.y, `floating basal source face at ${point.x},${point.z}`).toBeLessThanOrEqual(f.terrain.heightAt(point.x, point.z) - 0.054);
          }
        }
        expect(f.colliders.rockMeshes).toContain(contact);
        expect(f.colliders.all.find(collider => collider.id === mesh.name)?.rockMesh).toBe(contact);
      }
    } finally { f.module.dispose!(); }
  });

  it('owns one private geometry/material and releases them once without disposing the cached source', () => {
    const f = fixture(), meshes = f.module.group.children as THREE.Mesh[];
    try {
      expect(new Set(meshes.map(mesh => mesh.geometry)).size).toBe(1);
      expect(new Set(meshes.map(mesh => mesh.material)).size).toBe(1);
      const original = template.scene.children[0] as THREE.Mesh;
      const sourceGeometry = vi.spyOn(original.geometry, 'dispose'), sourceMaterial = vi.spyOn(original.material as THREE.Material, 'dispose');
      const geometry = vi.spyOn(meshes[0]!.geometry, 'dispose'), material = vi.spyOn(meshes[0]!.material as THREE.Material, 'dispose');
      f.module.dispose!(); f.module.dispose!();
      expect(geometry).toHaveBeenCalledTimes(1); expect(material).toHaveBeenCalledTimes(1);
      expect(sourceGeometry).not.toHaveBeenCalled(); expect(sourceMaterial).not.toHaveBeenCalled();
      expect(f.module.group.children).toHaveLength(0);
    } finally { vi.restoreAllMocks(); f.module.dispose!(); }
  });
});
