#!/usr/bin/env node
/**
 * Repair the solitary pine's bark normals in place (A97).
 *
 *   node tools/repair-pine-normals.mjs              both close levels (near and mid)
 *   node tools/repair-pine-normals.mjs --dry        report only
 *
 * About a quarter of the bark's vertex normals pointed against the faces that use them. Interpolated across a triangle,
 * such normals pass near zero, and the bark shader's triplanar weights (normalize, pow 5) then flicker pixel by pixel:
 * the grey, dot-grid "slivers" seen on the branch stubs from below. Each such normal is recomputed from its faces
 * (area-weighted); every other normal, and every other byte of the file, keeps its value. Only the bark's NORMAL view is
 * re-encoded (EXT_meshopt_compression, decoded again and compared before it is kept). Afterwards run
 * `node tools/model-files.mjs` and update the receipts that pin the files' hashes.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshoptEncoder } from 'meshoptimizer';

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const FILES = ['solitary-pine-under-10k.glb', 'solitary-pine-mid.glb'];
const AGREE = 0.3; // a normal whose cosine with its faces' summed normal is below this is recomputed
const dry = process.argv.includes('--dry');
const pad4 = (n) => (n + 3) & ~3;

export function readGlbParts(bytes) {
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
  const bin = bytes.subarray(28 + jsonLength, 28 + jsonLength + bytes.readUInt32LE(20 + jsonLength));
  const decode = (view) => {
    const m = json.bufferViews[view].extensions.EXT_meshopt_compression, out = new Uint8Array(m.count * m.byteStride);
    MeshoptDecoder.decodeGltfBuffer(out, m.count, m.byteStride, bin.subarray(m.byteOffset ?? 0, (m.byteOffset ?? 0) + m.byteLength), m.mode, m.filter);
    return out;
  };
  const bark = json.meshes.findIndex((m) => json.materials[m.primitives[0].material].name.toLowerCase().includes('bark'));
  return { json, bin, decode, primitive: json.meshes[bark].primitives[0] };
}

/** Bark vertex normals that disagree with their faces, and the repaired normals. */
export function repairNormals({ json, decode, primitive }) {
  const position = new Float32Array(decode(json.accessors[primitive.attributes.POSITION].bufferView).buffer);
  const normal = new Float32Array(decode(json.accessors[primitive.attributes.NORMAL].bufferView).buffer);
  const indexBytes = decode(json.accessors[primitive.indices].bufferView);
  const index = json.accessors[primitive.indices].componentType === 5123 ? new Uint16Array(indexBytes.buffer) : new Uint32Array(indexBytes.buffer);
  const faces = new Float64Array(normal.length);
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
    const e1 = [0, 1, 2].map((k) => position[b * 3 + k] - position[a * 3 + k]), e2 = [0, 1, 2].map((k) => position[c * 3 + k] - position[a * 3 + k]);
    const f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) faces[v * 3 + k] += f[k];
  }
  let disagreeing = 0;
  for (let v = 0; v < normal.length / 3; v++) {
    const f = [faces[v * 3], faces[v * 3 + 1], faces[v * 3 + 2]], length = Math.hypot(...f);
    if (!length) continue;
    const n = [normal[v * 3], normal[v * 3 + 1], normal[v * 3 + 2]];
    if ((n[0] * f[0] + n[1] * f[1] + n[2] * f[2]) / (length * (Math.hypot(...n) || 1)) >= AGREE) continue;
    disagreeing++;
    for (let k = 0; k < 3; k++) normal[v * 3 + k] = f[k] / length;
  }
  return { normal, disagreeing, vertices: normal.length / 3 };
}

function writeView(bytes, parts, view, data) {
  const { json, bin } = parts, ext = json.bufferViews[view].extensions.EXT_meshopt_compression;
  const raw = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const encoded = MeshoptEncoder.encodeGltfBuffer(raw, ext.count, ext.byteStride, ext.mode);
  const check = new Uint8Array(raw.length);
  MeshoptDecoder.decodeGltfBuffer(check, ext.count, ext.byteStride, encoded, ext.mode);
  if (Buffer.compare(Buffer.from(check), Buffer.from(raw)) !== 0) throw new Error('meshopt round trip failed');
  const start = ext.byteOffset ?? 0, oldSpan = pad4(ext.byteLength), newSpan = pad4(encoded.length), delta = newSpan - oldSpan;
  const newBin = Buffer.concat([bin.subarray(0, start), Buffer.from(encoded), Buffer.alloc(newSpan - encoded.length), bin.subarray(start + oldSpan)]);
  ext.byteLength = encoded.length;
  for (const v of json.bufferViews) {
    const m = v.extensions?.EXT_meshopt_compression;
    if (m && m !== ext && (m.byteOffset ?? 0) > start) m.byteOffset += delta;
    if (v.buffer === 0 && !m && (v.byteOffset ?? 0) > start) v.byteOffset += delta;
  }
  json.buffers[0].byteLength = newBin.length;
  let text = Buffer.from(JSON.stringify(json)); text = Buffer.concat([text, Buffer.alloc(pad4(text.length) - text.length, 0x20)]);
  const body = Buffer.concat([newBin, Buffer.alloc(pad4(newBin.length) - newBin.length)]);
  const head = Buffer.alloc(28);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(28 + text.length + body.length, 8);
  head.writeUInt32LE(text.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  const binHead = Buffer.alloc(8); binHead.writeUInt32LE(body.length, 0); binHead.writeUInt32LE(0x004e4942, 4);
  void bytes;
  return Buffer.concat([head.subarray(0, 20), text, binHead, body]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  for (const file of FILES) {
    const path = new URL(`../public/models/flora/${file}`, import.meta.url);
    const bytes = fs.readFileSync(path), parts = readGlbParts(bytes);
    const { normal, disagreeing, vertices } = repairNormals(parts);
    console.log(`${file}: ${disagreeing} of ${vertices} bark normals disagree with their faces`);
    if (dry || !disagreeing) continue;
    const view = parts.json.accessors[parts.primitive.attributes.NORMAL].bufferView;
    delete parts.json.accessors[parts.primitive.attributes.NORMAL].min; delete parts.json.accessors[parts.primitive.attributes.NORMAL].max;
    fs.writeFileSync(path, writeView(bytes, parts, view, normal));
  }
}
