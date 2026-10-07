import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildAncientTree, type AncientTree } from '../../src/presentation/menu/menuTree';
import { assertMenuTreeBudget, createMenuTreeRemix, type MenuTreeRemix } from '../../src/presentation/menu/menuTreeRemix';
import { createWispLighting } from '../../src/presentation/menu/menuWispLight';
import { HERMIT_DOOR } from '../../src/presentation/menu/menuCamp';

const owned: { dispose(): void }[] = [];
afterEach(() => { for (const resource of owned.splice(0)) resource.dispose(); });
const architecture = (woodDetail = 0.8): AncientTree => {
  const tree = buildAncientTree(1207, { leafCards: 0, woodDetail,
    door: { az: 2, halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop,
      opening: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height } } });
  owned.push(tree.wood, tree.leaves); return tree;
};
const template = (triangles = 12): GLTF => {
  const geometry = new THREE.BoxGeometry(4, 3, 5);
  const original = Array.from(geometry.index!.array);
  geometry.setIndex(Array.from({ length: triangles * 3 }, (_, i) => original[i % original.length]!));
  const map = new THREE.DataTexture(new Uint8Array([63, 93, 45, 255]), 1, 1);
  const material = new THREE.MeshStandardMaterial({ map, color: 0x83956c, roughness: 0.95 });
  const scene = new THREE.Group(), mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Foliage'; mesh.position.set(1, 7, -0.5); scene.add(mesh);
  owned.push(geometry, material, map);
  return { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, userData: {} } as unknown as GLTF;
};
const remix = (source: readonly [GLTF, GLTF, GLTF], tree: AncientTree): MenuTreeRemix => {
  const result = createMenuTreeRemix(source, tree, null, createWispLighting(4));
  owned.push(result); return result;
};

describe('supplied menu crown and retained score-led hermitage', () => {
  it('reduces only wood radial detail while preserving carved bole, door, roots, hanging branches and every music collision curve', () => {
    const full = architecture(1), fitted = architecture(0.8);
    expect(fitted.stats.woodTris).toBeLessThan(full.stats.woodTris - 1000);
    expect(fitted.door).toEqual(full.door);
    expect(fitted.trunk).toEqual(full.trunk);
    expect(fitted.roots).toEqual(full.roots);
    expect(fitted.lowBoughs).toEqual(full.lowBoughs);
    expect(fitted.capsules).toEqual(full.capsules);
    expect(fitted.leafSites).toEqual(full.leafSites);
  });

  it('keeps actual source UVs, PBR map and volumetric proportions without modifying or disposing a shared template', () => {
    const source = template(), mesh = source.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    const positions = new Float32Array(mesh.geometry.getAttribute('position').array);
    const sourceUv = mesh.geometry.getAttribute('uv').array;
    const disposeGeometry = vi.spyOn(mesh.geometry, 'dispose'), disposeMaterial = vi.spyOn(mesh.material, 'dispose');
    const first = remix([source, source, source], architecture());
    const geometry = first.parts[0]!.geometry, material = first.parts[0]!.material;
    expect(geometry.getAttribute('uv').array).toEqual(sourceUv);
    geometry.computeBoundingBox();
    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(size.x / size.y).toBeCloseTo(4 / 3, 5); expect(size.z / size.y).toBeCloseTo(5 / 3, 5);
    expect(material).not.toBe(mesh.material); expect(material.map).not.toBe(mesh.material.map);
    expect(material.map!.image).toBe(mesh.material.map!.image);
    const disposeOwnedGeometry = vi.spyOn(geometry, 'dispose'), disposeOwnedMaterial = vi.spyOn(material, 'dispose');
    first.dispose(); first.dispose();
    expect(disposeOwnedGeometry).toHaveBeenCalledTimes(1); expect(disposeOwnedMaterial).toHaveBeenCalledTimes(1);
    expect(disposeGeometry).not.toHaveBeenCalled(); expect(disposeMaterial).not.toHaveBeenCalled();
    expect(mesh.geometry.getAttribute('position').array).toEqual(positions);
    const next = remix([source, source, source], architecture());
    expect(next.leafSites).toEqual(first.leafSites); expect(next.crown).toEqual(first.crown);
  });

  it('samples real transformed foliage centroids and bounds rather than keeping the retired crown envelope', () => {
    const source = template(), result = remix([source, source, source], architecture());
    expect(result.leafSites).toHaveLength(12);
    const box = result.parts[0]!.geometry.boundingBox!;
    for (const site of result.leafSites) expect(box.containsPoint(new THREE.Vector3(...site))).toBe(true);
    // The crow envelope covers the crown's swing in the sea wind.
    expect(result.crown.bottom).toBeCloseTo(box.min.y - 0.2, 5);
    expect(result.crown.top).toBeCloseTo(box.max.y + 0.25, 5);
    const p = result.parts[0]!.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) expect(Math.hypot(p.getX(i) - result.crown.x, p.getZ(i) - result.crown.z)).toBeLessThan(result.crown.radius);
  });

  it('rejects invisible MASK perches after the uniform fit while retaining visible alpha-tested surface sites', () => {
    const clear = template(), visible = template();
    const clearMaterial = (clear.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material;
    const visibleMaterial = (visible.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material;
    clearMaterial.alphaTest = visibleMaterial.alphaTest = 0.35;
    const clearPixels = clearMaterial.map!.image as { data: Uint8Array };
    clearPixels.data[3] = 0;
    const noPerches = remix([clear, clear, clear], architecture());
    const perches = remix([visible, visible, visible], architecture());
    expect(noPerches.leafSites).toEqual([]); expect(perches.leafSites).toHaveLength(12);
    expect(noPerches.triangles).toBe(perches.triangles);
    expect(noPerches.crown).toEqual(perches.crown);
    expect(clearMaterial.alphaTest).toBe(0.35); expect(visibleMaterial.alphaTest).toBe(0.35);
  });

  it('selects a complete source crown that leaves space for the carved interior and door, and rejects all oversized options', () => {
    const heavy = template(20_000), middle = template(5000), far = template(3000);
    const tree = architecture(), selected = remix([heavy, middle, far], tree);
    expect(selected.sourceLod).toBe(1); expect(selected.triangles).toBe(5000);
    expect(tree.stats.woodTris + selected.triangles + 2500).toBeLessThan(20_000);
    expect(() => remix([heavy, heavy, heavy], tree)).toThrow(/under-20k/);
  });

  it('counts hidden complete tree and moving-door geometry and rejects exactly 20,000 triangles', () => {
    const source = template(19988), doorSource = template(12);
    const root = source.scene, door = doorSource.scene;
    root.visible = false; door.visible = false;
    expect(assertMenuTreeBudget(root)).toBe(19988);
    expect(() => assertMenuTreeBudget(root, door)).toThrow(/strictly below/);
    expect(() => assertMenuTreeBudget(root, undefined, 12)).toThrow(/strictly below/);
  });
});
