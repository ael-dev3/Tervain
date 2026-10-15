// Minimal GLB 2.0 writer for the generator's meshes (uncompressed floats, custom _WIND / _PIVOT attributes).
const pad4 = (n) => (n + 3) & ~3;

/**
 * parts: [{ name, builder (MeshBuilder), material: index, extras? }]
 * materials: glTF material objects (texture refs by index into `textures`)
 * textures: [{ name, mimeType, data: Buffer, sampler: 'repeat'|'clamp', webp: bool }]
 */
export function writeGlb({ parts, materials, textures = [], assetExtras }) {
  const chunks = [], views = [], accessors = [], meshes = [], nodes = [], images = [], texs = [];
  let length = 0;
  const addView = (buf, target) => {
    const start = pad4(length); const filler = start - length;
    if (filler) chunks.push(Buffer.alloc(filler));
    chunks.push(buf); length = start + buf.length;
    views.push({ buffer: 0, byteOffset: start, byteLength: buf.length, ...(target ? { target } : {}) });
    return views.length - 1;
  };
  const addAccessor = (view, componentType, count, type, extra = {}) => { accessors.push({ bufferView: view, componentType, count, type, ...extra }); return accessors.length - 1; };
  for (const part of parts) {
    const b = part.builder, vc = b.vertexCount, attrs = {};
    const pos = Float32Array.from(b.pos);
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], pos[i + k]); max[k] = Math.max(max[k], pos[i + k]); }
    attrs.POSITION = addAccessor(addView(Buffer.from(pos.buffer), 34962), 5126, vc, 'VEC3', { min, max });
    attrs.NORMAL = addAccessor(addView(Buffer.from(Float32Array.from(b.nrm).buffer), 34962), 5126, vc, 'VEC3');
    attrs.TEXCOORD_0 = addAccessor(addView(Buffer.from(Float32Array.from(b.uv).buffer), 34962), 5126, vc, 'VEC2');
    attrs.COLOR_0 = addAccessor(addView(Buffer.from(Uint8Array.from(b.col)), 34962), 5121, vc, 'VEC4', { normalized: true });
    attrs._WIND = addAccessor(addView(Buffer.from(Float32Array.from(b.wind).buffer), 34962), 5126, vc, 'VEC4');
    attrs._PIVOT = addAccessor(addView(Buffer.from(Float32Array.from(b.pivot).buffer), 34962), 5126, vc, 'VEC3');
    const big = vc > 65535, idx = big ? Uint32Array.from(b.idx) : Uint16Array.from(b.idx);
    const indices = addAccessor(addView(Buffer.from(idx.buffer), 34963), big ? 5125 : 5123, idx.length, 'SCALAR');
    meshes.push({ name: part.name, primitives: [{ attributes: attrs, indices, material: part.material, mode: 4, ...(part.extras ? { extras: part.extras } : {}) }] });
    nodes.push({ name: part.name, mesh: meshes.length - 1 });
  }
  const samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }, { magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
  let usesWebp = false;
  textures.forEach((t, i) => {
    images.push({ name: t.name, bufferView: addView(t.data), mimeType: t.mimeType });
    const sampler = t.sampler === 'clamp' ? 1 : 0;
    if (t.webp) { usesWebp = true; texs.push({ name: t.name, sampler, extensions: { EXT_texture_webp: { source: i } } }); } else texs.push({ name: t.name, sampler, source: i });
  });
  const json = {
    asset: { version: '2.0', generator: 'Tervain tools/tree-gen', ...(assetExtras ? { extras: assetExtras } : {}) },
    ...(usesWebp ? { extensionsUsed: ['EXT_texture_webp'], extensionsRequired: ['EXT_texture_webp'] } : {}),
    scene: 0, scenes: [{ name: 'Scene', nodes: nodes.map((_, i) => i) }], nodes, meshes, materials,
    ...(textures.length ? { textures: texs, images, samplers } : {}),
    accessors, bufferViews: views, buffers: [{ byteLength: pad4(length) }],
  };
  let jsonBuf = Buffer.from(JSON.stringify(json)); jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length) - jsonBuf.length, 0x20)]);
  const bin = Buffer.concat([...chunks, Buffer.alloc(pad4(length) - length)]);
  const total = 12 + 8 + jsonBuf.length + 8 + bin.length, out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonBuf.length, 12); out.writeUInt32LE(0x4e4f534a, 16); jsonBuf.copy(out, 20);
  const o = 20 + jsonBuf.length; out.writeUInt32LE(bin.length, o); out.writeUInt32LE(0x004e4942, o + 4); bin.copy(out, o + 8);
  return out;
}
