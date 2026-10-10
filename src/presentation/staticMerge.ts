import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Draw a group of fixed props as one mesh per material (A78). Props built from many small parts (a camp's planks, legs,
 * pins and ties) each cost a draw call in the colour pass and another in the sun's shadow pass, though together they
 * cover a few hundred pixels. The parts keep their place in the group (names, transforms and geometry stay as built, for
 * lookups, picking and tests) but are no longer drawn; one merged mesh per material, shadow flags and vertex layout draws
 * them instead, with the same look. Call it once the group is fully built and placed; the parts must not move after.
 * Returns the merged meshes; their geometries are new and belong to the caller (the material is the parts' own).
 */
export function mergeStaticParts(group: THREE.Object3D, options: { skip?: (mesh: THREE.Mesh) => boolean; minParts?: number } = {}): THREE.Mesh[] {
  const minParts = options.minParts ?? 2;
  group.updateMatrixWorld(true);
  const toGroup = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; parts: THREE.Mesh[] }>();
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
    if (!mesh.visible || Array.isArray(mesh.material) || mesh.morphTargetInfluences) return;
    if (mesh.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || mesh.renderOrder !== 0) return;
    if (options.skip?.(mesh)) return;
    // Only parts whose ancestors are all shown: a hidden branch stays hidden.
    for (let parent = mesh.parent; parent && parent !== group; parent = parent.parent) if (!parent.visible) return;
    const geometry = mesh.geometry;
    const layout = Object.keys(geometry.attributes).sort().map((name) => `${name}${geometry.attributes[name]!.itemSize}`).join(',');
    const key = `${mesh.material.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${geometry.index ? 'i' : 'n'}|${layout}`;
    const bucket = buckets.get(key) ?? buckets.set(key, { material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, parts: [] }).get(key)!;
    bucket.parts.push(mesh);
  });
  const merged: THREE.Mesh[] = [];
  for (const { material, cast, receive, parts } of buckets.values()) {
    if (parts.length < minParts) continue;
    const copies = parts.map((part) => {
      const copy = part.geometry.clone();
      copy.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toGroup, part.matrixWorld));
      copy.morphAttributes = {};
      copy.clearGroups();
      return copy;
    });
    const geometry = mergeGeometries(copies, false);
    for (const copy of copies) copy.dispose();
    if (!geometry) continue;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${group.name || 'group'}:merged:${merged.length}`;
    mesh.castShadow = cast; mesh.receiveShadow = receive;
    mesh.userData.mergedParts = parts.length;
    group.add(mesh);
    for (const part of parts) { part.visible = false; part.userData.mergedInto = mesh; }
    merged.push(mesh);
  }
  group.updateMatrixWorld(true);
  return merged;
}
