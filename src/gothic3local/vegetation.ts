import type { BinaryReader } from './binary';
import { type PropertyObject, looksLikeObject, propBool, propNumber, propString, readPropertyObject } from './genome';

/**
 * Ground vegetation, as observed in the compiled world. A world cell's `eCVegetation_PS` property set carries its own
 * small meshes (grass, herbs, ferns, pebbles, twigs, decals) and a grid of the instances placed from them. Its class
 * data is:
 *
 * - a version (u16) and a short header, then the meshes as `eCVegetation_Mesh` property objects back to back. Each
 *   object's properties name its source mesh and give its shading, spacing, wind strength and sidedness; its class
 *   data is a version (u16), a word, the mesh's index (u16), a timestamp (8 bytes), the texture's name (string), a
 *   bounding box (6 floats) and four streams, each a flag (u8), a count (u32) and the items: positions (3 floats),
 *   normals (3 floats), texture coordinates (2 floats) and triangle indices (u32);
 * - the grid: a version (u16), the node size (float), four integers (the grid's bounds), the node count (u32) and the
 *   nodes, each an index (u32), a version (u16), a bounding box (6 floats), an instance count (u32) and the instances;
 * - each instance in 44 bytes: a word, the mesh index (u16), the position (3 floats), a rotation quaternion (x, y, z,
 *   w), two scale factors and a tint (ARGB);
 * - the bounding box of everything (6 floats).
 *
 * Positions are world centimetres in Gothic 3's own (left-handed) space, like the entities' matrices.
 */

export interface VegetationMesh {
  index: number;
  /** The source mesh's file name (the vertex data is carried here; the name is for display and sharing). */
  name: string;
  texture: string;
  box: Float32Array;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  /** 1 where the plant is lit as if it faced up, like the ground it grows from. */
  shading: number;
  /** How far the plant sways in the wind, 0 for stones and twigs. */
  wind: number;
  doubleSided: boolean;
}

export interface VegetationNode {
  box: Float32Array;
  first: number;
  count: number;
}

export interface Vegetation {
  /** Centimetres: drawn up to this distance, fading from `fadeStart`. */
  viewRange: number;
  fadeStart: number;
  meshes: VegetationMesh[];
  nodes: VegetationNode[];
  /** Per instance: the mesh's index, position (3), rotation quaternion (4: x, y, z, w), scale (2) and tint (ARGB). */
  mesh: Uint16Array;
  position: Float32Array;
  rotation: Float32Array;
  scale: Float32Array;
  tint: Uint32Array;
}

const INSTANCE_BYTES = 44;

const isMesh = (c: string) => c === 'eCVegetation_Mesh';

function stream(r: BinaryReader, itemSize: number, read: (count: number) => Float32Array | Uint32Array): Float32Array | Uint32Array {
  r.u8();
  const count = r.u32();
  return read((count * itemSize) / 4);
}

function readMesh(r: BinaryReader, o: PropertyObject): VegetationMesh {
  r.pos = o.dataStart;
  r.u16();
  r.u16();
  const index = r.u16();
  r.skip(8);
  const texture = r.str();
  const box = r.floats(6);
  const positions = stream(r, 12, (n) => r.floats(n)) as Float32Array;
  const normals = stream(r, 12, (n) => r.floats(n)) as Float32Array;
  const uvs = stream(r, 8, (n) => r.floats(n)) as Float32Array;
  const indices = stream(r, 4, (n) => r.uints(n)) as Uint32Array;
  const path = propString(o, 'MeshFilePath');
  return {
    index,
    name: path.slice(path.lastIndexOf('\\') + 1),
    texture,
    box,
    positions,
    normals,
    uvs,
    indices,
    shading: propNumber(o, 'MeshShading'),
    wind: propNumber(o, 'WindStrength'),
    doubleSided: propBool(o, 'DoubleSided'),
  };
}

/** Read an `eCVegetation_PS` set's class data. `r` must read the file the set came from. */
export function parseVegetation(r: BinaryReader, set: PropertyObject): Vegetation {
  const meshes: VegetationMesh[] = [];
  let at = set.dataStart;
  const limit = Math.min(set.end, at + 64);
  while (at < limit && !looksLikeObject(r, at, isMesh)) at++;
  if (at >= limit) throw new Error('vegetation without meshes');
  r.pos = at;
  while (r.pos < set.end && looksLikeObject(r, r.pos, isMesh)) {
    const o = readPropertyObject(r);
    if (!o) break;
    meshes.push(readMesh(r, o));
    r.pos = o.end;
  }
  // The grid.
  r.u16();
  r.f32();
  r.skip(16);
  const nodeCount = r.u32();
  const nodes: VegetationNode[] = [];
  const starts: number[] = [];
  let total = 0;
  for (let i = 0; i < nodeCount; i++) {
    r.u32();
    r.u16();
    const box = r.floats(6);
    const count = r.u32();
    if (r.pos + count * INSTANCE_BYTES > set.end) throw new RangeError('vegetation instances run past the data');
    nodes.push({ box, first: total, count });
    starts.push(r.pos);
    r.pos += count * INSTANCE_BYTES;
    total += count;
  }
  const mesh = new Uint16Array(total);
  const position = new Float32Array(total * 3);
  const rotation = new Float32Array(total * 4);
  const scale = new Float32Array(total * 2);
  const tint = new Uint32Array(total);
  const v = r.view;
  nodes.forEach((node, n) => {
    let p = starts[n]!;
    for (let i = node.first; i < node.first + node.count; i++, p += INSTANCE_BYTES) {
      mesh[i] = v.getUint16(p + 2, true);
      for (let k = 0; k < 3; k++) position[i * 3 + k] = v.getFloat32(p + 4 + k * 4, true);
      for (let k = 0; k < 4; k++) rotation[i * 4 + k] = v.getFloat32(p + 16 + k * 4, true);
      scale[i * 2] = v.getFloat32(p + 32, true);
      scale[i * 2 + 1] = v.getFloat32(p + 36, true);
      tint[i] = v.getUint32(p + 40, true);
    }
  });
  return {
    viewRange: propNumber(set, 'ViewRange', 5000),
    fadeStart: propNumber(set, 'FadeOutStart', 2500),
    meshes,
    nodes,
    mesh,
    position,
    rotation,
    scale,
    tint,
  };
}
