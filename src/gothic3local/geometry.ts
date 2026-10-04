import * as THREE from 'three';
import type { G3Mesh, MeshElement } from './mesh';

/**
 * Mesh elements as Three.js geometry, in the mesh's own space (centimetres, left-handed). The world group mirrors Z
 * and scales to metres, and Three.js flips the front-face winding for that negative determinant. Gothic 3's triangles
 * face the other way round from what that leaves (seen in the landscape: drawn as stored, it shows only from below), so
 * each triangle's winding is reversed here.
 */
export function elementGeometry(el: MeshElement): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const n = el.positions.length / 3;
  g.setAttribute('position', new THREE.BufferAttribute(el.positions, 3));
  if (el.normals) g.setAttribute('normal', new THREE.BufferAttribute(el.normals, 3));
  for (let i = 0; i < 4; i++) {
    const uv = el.uvs[i] ?? el.uvs[0] ?? new Float32Array(n * 2);
    g.setAttribute(`g3uv${i}`, new THREE.BufferAttribute(uv, 2));
  }
  let colors = el.colors;
  if (!colors) {
    colors = new Float32Array(n * 4);
    colors.fill(1);
  }
  g.setAttribute('g3color', new THREE.BufferAttribute(colors, 4));
  const index = n < 65536 ? new Uint16Array(el.indices.length) : new Uint32Array(el.indices.length);
  for (let i = 0; i + 2 < el.indices.length; i += 3) {
    index[i] = el.indices[i]!;
    index[i + 1] = el.indices[i + 2]!;
    index[i + 2] = el.indices[i + 1]!;
  }
  g.setIndex(new THREE.BufferAttribute(index, 1));
  if (!el.normals) g.computeVertexNormals();
  g.boundingBox = new THREE.Box3(new THREE.Vector3(el.box[0], el.box[1], el.box[2]), new THREE.Vector3(el.box[3], el.box[4], el.box[5]));
  g.computeBoundingSphere();
  return g;
}

/** Every element of a mesh. */
export function meshGeometries(mesh: G3Mesh): { material: string; geometry: THREE.BufferGeometry; triangles: number }[] {
  return mesh.elements.map((el) => ({ material: el.material, geometry: elementGeometry(el), triangles: el.indices.length / 3 }));
}
