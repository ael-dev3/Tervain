// Which borders between an atlas's 256 px views do leaf cards cross (A110)? Prints JSON for feather-leaf-atlases.py:
// { id: { v: [[tx, ty], ...], h: [[tx, ty], ...] } }, where v [tx, ty] is the border between views (tx, ty) and
// (tx + 1, ty), and h [tx, ty] the border between (tx, ty) and (tx, ty + 1); a border listed is left unfeathered.
// Usage: node tools/flora/leaf-atlas-joins.mjs <id>...
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

await MeshoptDecoder.ready;
const DIR = fileURLToPath(new URL('../../public/models/flora/meshy-012/', import.meta.url));
const T = 8;
const out = {};
for (const id of process.argv.slice(2)) {
  const bytes = fs.readFileSync(`${DIR}${id}-near.glb`);
  const jl = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + jl).toString('utf8'));
  const bin = bytes.subarray(28 + jl, 28 + jl + bytes.readUInt32LE(20 + jl));
  const view = (i) => {
    const bv = json.bufferViews[i], m = bv.extensions?.EXT_meshopt_compression;
    if (!m) return bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    const o = new Uint8Array(m.count * m.byteStride);
    MeshoptDecoder.decodeGltfBuffer(o, m.count, m.byteStride, bin.subarray(m.byteOffset ?? 0, (m.byteOffset ?? 0) + m.byteLength), m.mode, m.filter);
    return o;
  };
  const read = (ai) => {
    const a = json.accessors[ai], bv = json.bufferViews[a.bufferView], raw = view(a.bufferView);
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type], size = { 5126: 4, 5123: 2, 5121: 1, 5125: 4 }[a.componentType];
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength), st = bv.byteStride || comps * size, r = new Float64Array(a.count * comps);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < comps; c++) {
      const o = (a.byteOffset ?? 0) + i * st + c * size;
      let v = a.componentType === 5126 ? dv.getFloat32(o, true) : a.componentType === 5123 ? dv.getUint16(o, true) : a.componentType === 5121 ? dv.getUint8(o) : dv.getUint32(o, true);
      if (a.normalized) v /= a.componentType === 5123 ? 65535 : 255;
      r[i * comps + c] = v;
    }
    return r;
  };
  const leaf = json.materials.findIndex((m) => m.alphaMode === 'MASK');
  const v = new Set(), h = new Set();
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    if (p.material !== leaf) continue;
    const uv = read(p.attributes.TEXCOORD_0), idx = read(p.indices), e = 1e-4;
    for (let t = 0; t < idx.length; t += 3) {
      let u0 = 9, u1 = -9, w0 = 9, w1 = -9;
      for (let k = 0; k < 3; k++) { const i = idx[t + k]; u0 = Math.min(u0, uv[i * 2]); u1 = Math.max(u1, uv[i * 2]); w0 = Math.min(w0, uv[i * 2 + 1]); w1 = Math.max(w1, uv[i * 2 + 1]); }
      const tx0 = Math.floor(u0 * T + e), tx1 = Math.floor(u1 * T - e), ty0 = Math.floor(w0 * T + e), ty1 = Math.floor(w1 * T - e);
      // glTF UV v runs down the image, as the atlas rows do.
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx < tx1; tx++) v.add(`${tx},${ty}`);
      for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty < ty1; ty++) h.add(`${tx},${ty}`);
    }
  }
  out[id] = { v: [...v].map((s) => s.split(',').map(Number)), h: [...h].map((s) => s.split(',').map(Number)) };
}
console.log(JSON.stringify(out));
