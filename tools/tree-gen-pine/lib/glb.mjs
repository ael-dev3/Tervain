/** Minimal binary glTF 2 writer for the hero pine: wood + leaf mesh per variant, shared materials, custom _WIND / _PIVOT. */

const F32 = 5126, U8 = 5121, U16 = 5123, U32 = 5125;

export function writeGlb({ variants, images, name }) {
  const chunks = [];
  let offset = 0;
  const bufferViews = [], accessors = [];
  const push = (buf, target) => {
    const pad = (4 - (offset % 4)) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, ...(target ? { target } : {}) });
    chunks.push(buf); offset += buf.length;
    return bufferViews.length - 1;
  };
  const accessor = (data, type, ctype, count, target, extra = {}) => {
    const view = push(Buffer.from(data.buffer, data.byteOffset, data.byteLength), target);
    accessors.push({ bufferView: view, componentType: ctype, count, type, ...extra });
    return accessors.length - 1;
  };
  const minmax = (arr, n) => {
    const min = Array(n).fill(Infinity), max = Array(n).fill(-Infinity);
    for (let i = 0; i < arr.length; i += n) for (let k = 0; k < n; k++) { min[k] = Math.min(min[k], arr[i + k]); max[k] = Math.max(max[k], arr[i + k]); }
    return { min, max };
  };
  const meshes = [], nodes = [], sceneNodes = [];
  for (const v of variants) {
    for (const part of ['wood', 'leaf']) {
      const m = v[part];
      const pos = new Float32Array(m.p), count = m.count;
      const attrs = {
        POSITION: accessor(pos, 'VEC3', F32, count, 34962, minmax(pos, 3)),
        NORMAL: accessor(new Float32Array(m.n), 'VEC3', F32, count, 34962),
        TEXCOORD_0: accessor(new Float32Array(m.uv), 'VEC2', F32, count, 34962),
        COLOR_0: accessor(Uint8Array.from(m.c, (x) => Math.round(Math.min(1, Math.max(0, x)) * 255)), 'VEC4', U8, count, 34962, { normalized: true }),
        _WIND: accessor(new Float32Array(m.w), 'VEC4', F32, count, 34962),
        _PIVOT: accessor(new Float32Array(m.pv), 'VEC3', F32, count, 34962),
      };
      const indices = count > 65535 ? new Uint32Array(m.i) : new Uint16Array(m.i);
      const ia = accessor(indices, 'SCALAR', count > 65535 ? U32 : U16, m.i.length, 34963);
      meshes.push({ name: `${v.name}-${part}`, extras: part === 'wood' ? { trunkIndexCount: m.trunkIdx, trunkRadius: v.trunkRadius, height: v.height } : { crownRadius: v.crownRadius }, primitives: [{ attributes: attrs, indices: ia, material: part === 'wood' ? 0 : 1 }] });
      nodes.push({ name: `${v.name}-${part}`, mesh: meshes.length - 1 });
      sceneNodes.push(nodes.length - 1);
    }
  }
  const imgDefs = [], textures = [];
  const image = (key) => {
    const img = images[key];
    if (!img) return undefined;
    const view = push(img.data);
    imgDefs.push({ bufferView: view, mimeType: 'image/webp', name: img.name });
    textures.push({ sampler: img.clamp ? 1 : 0, source: imgDefs.length - 1, extensions: { EXT_texture_webp: { source: imgDefs.length - 1 } } });
    return textures.length - 1;
  };
  const t = { bark: image('bark'), normal: image('normal'), orm: image('orm'), needles: image('needles') };
  const woodMat = {
    name: 'Hero pine bark - procedural plated atlas',
    doubleSided: false,
    pbrMetallicRoughness: { baseColorTexture: { index: t.bark }, metallicFactor: 0, roughnessFactor: 1, ...(t.orm !== undefined ? { metallicRoughnessTexture: { index: t.orm } } : {}) },
    ...(t.normal !== undefined ? { normalTexture: { index: t.normal, scale: 1 } } : {}),
    ...(t.orm !== undefined ? { occlusionTexture: { index: t.orm, strength: 0.9 } } : {}),
  };
  const leafMat = {
    name: 'Hero pine needles - placeholder pad atlas',
    alphaMode: 'MASK', alphaCutoff: 0.42, doubleSided: true,
    pbrMetallicRoughness: { baseColorTexture: { index: t.needles }, metallicFactor: 0, roughnessFactor: 0.87 },
  };
  const json = {
    asset: { version: '2.0', generator: 'tools/tree-gen-pine', extras: { tervainHeroPine: name } },
    extensionsUsed: ['EXT_texture_webp'],
    extensionsRequired: ['EXT_texture_webp'],
    scene: 0, scenes: [{ nodes: sceneNodes }], nodes, meshes,
    materials: [woodMat, leafMat], textures, images: imgDefs,
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }, { magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    accessors, bufferViews, buffers: [{ byteLength: 0 }],
  };
  const bin = Buffer.concat(chunks);
  const binPad = (4 - (bin.length % 4)) % 4;
  json.buffers[0].byteLength = bin.length + binPad;
  let js = Buffer.from(JSON.stringify(json), 'utf8');
  const jsPad = (4 - (js.length % 4)) % 4;
  js = Buffer.concat([js, Buffer.alloc(jsPad, 0x20)]);
  const total = 12 + 8 + js.length + 8 + bin.length + binPad;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(js.length, 12); out.writeUInt32LE(0x4e4f534a, 16); js.copy(out, 20);
  const o2 = 20 + js.length;
  out.writeUInt32LE(bin.length + binPad, o2); out.writeUInt32LE(0x004e4942, o2 + 4); bin.copy(out, o2 + 8);
  return out;
}
