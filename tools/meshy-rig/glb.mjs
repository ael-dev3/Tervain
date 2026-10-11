/**
 * A small glTF 2.0 binary reader for the rig tools: JSON, accessors as typed arrays, node transforms and skins. Reads
 * only what the tools need; no rendering, no textures.
 */
import fs from 'node:fs';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

await MeshoptDecoder.ready;

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const READERS = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NORMALIZE = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

export function readGlb(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error(`${file}: not a GLB 2 file`);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  const binHeader = 20 + jsonLength;
  const bin = binHeader < bytes.length ? bytes.subarray(binHeader + 8, binHeader + 8 + bytes.readUInt32LE(binHeader)) : Buffer.alloc(0);
  // Views compressed with EXT_meshopt_compression (tools/optimise-models.mjs) are decoded once, as the game decodes them.
  const decoded = new Map();
  const viewData = (index) => {
    const view = json.bufferViews[index], meshopt = view.extensions?.EXT_meshopt_compression;
    if (!meshopt) return { data: new DataView(bin.buffer, bin.byteOffset, bin.byteLength), base: view.byteOffset ?? 0, stride: view.byteStride };
    if (!decoded.has(index)) {
      const target = new Uint8Array(meshopt.count * meshopt.byteStride);
      const source = new Uint8Array(bin.buffer, bin.byteOffset + (meshopt.byteOffset ?? 0), meshopt.byteLength);
      MeshoptDecoder.decodeGltfBuffer(target, meshopt.count, meshopt.byteStride, source, meshopt.mode, meshopt.filter);
      decoded.set(index, target);
    }
    const target = decoded.get(index);
    return { data: new DataView(target.buffer, target.byteOffset, target.byteLength), base: 0, stride: meshopt.byteStride };
  };
  /** An accessor as a flat array of numbers (normalized integers scaled to 0..1 when the accessor says so). */
  const accessor = (index) => {
    const a = json.accessors[index], n = COMPONENTS[a.type];
    const [Type, size] = READERS[a.componentType];
    const { data, base, stride: viewStride } = viewData(a.bufferView);
    const stride = viewStride ?? n * size, offset = base + (a.byteOffset ?? 0);
    const out = new Float64Array(a.count * n);
    const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
    for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) {
      let v = data[get](offset + i * stride + c * size, true);
      if (a.normalized && NORMALIZE[a.componentType]) v /= NORMALIZE[a.componentType];
      out[i * n + c] = v;
    }
    void Type;
    return { array: out, count: a.count, components: n };
  };
  return { bytes, json, accessor };
}

/* ---------------------------------------------------------------- 4x4 matrices (column-major, as glTF) */

export function invert(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) throw new Error('singular matrix');
  const d = 1 / det;
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ];
}

/** Position, unit rotation quaternion [x, y, z, w] and scale of an affine column-major matrix. */
export function decompose(m) {
  const sx = Math.hypot(m[0], m[1], m[2]), sy = Math.hypot(m[4], m[5], m[6]), sz = Math.hypot(m[8], m[9], m[10]);
  const r = [m[0] / sx, m[1] / sx, m[2] / sx, m[4] / sy, m[5] / sy, m[6] / sy, m[8] / sz, m[9] / sz, m[10] / sz];
  // Rotation matrix (column-major r[col*3+row]) to quaternion.
  const m00 = r[0], m10 = r[1], m20 = r[2], m01 = r[3], m11 = r[4], m21 = r[5], m02 = r[6], m12 = r[7], m22 = r[8];
  const trace = m00 + m11 + m22;
  let q;
  if (trace > 0) { const s = 0.5 / Math.sqrt(trace + 1); q = [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s]; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s]; }
  const n = Math.hypot(...q);
  return { position: [m[12], m[13], m[14]], quaternion: q.map((v) => v / n), scale: [sx, sy, sz] };
}

/** The skin's joints with their parents (as indices into the joint list) and their bind transforms in mesh space. */
export function skinJoints(glb, skinIndex = 0) {
  const { json, accessor } = glb;
  const skin = json.skins[skinIndex];
  const parentOf = new Map();
  json.nodes.forEach((node, i) => (node.children ?? []).forEach((child) => parentOf.set(child, i)));
  const ibm = accessor(skin.inverseBindMatrices).array;
  return skin.joints.map((node, j) => {
    let parent = parentOf.get(node);
    while (parent !== undefined && !skin.joints.includes(parent)) parent = parentOf.get(parent);
    const bind = invert(Array.from(ibm.subarray(j * 16, j * 16 + 16)));
    return { name: json.nodes[node].name, node, parent: parent === undefined ? -1 : skin.joints.indexOf(parent), bind };
  });
}
