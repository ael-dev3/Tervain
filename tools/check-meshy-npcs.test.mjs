import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditNpcGlb, JOINT_NAMES } from './check-meshy-npcs.mjs';

function fixture(edit = () => {}) {
  const binary = []; const views = []; const accessors = []; let length = 0;
  function bytes(data) { const padding = (4 - length % 4) % 4; binary.push(Buffer.alloc(padding)); length += padding; const index = views.length; views.push({ buffer: 0, byteOffset: length, byteLength: data.length }); binary.push(data); length += data.length; return index; }
  function accessor(values, componentType, type) { const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[type]; const size = componentType === 5123 ? 2 : 4; const data = Buffer.alloc(values.length * size); values.forEach((v, i) => componentType === 5123 ? data.writeUInt16LE(v, i * size) : data.writeFloatLE(v, i * size)); const index = accessors.length; accessors.push({ bufferView: bytes(data), componentType, type, count: values.length / components }); return index; }
  const pos = accessor([0, 0, 0, 1, 0, 0, 0, 1, 0], 5126, 'VEC3');
  const norm = accessor([0, 0, 1, 0, 0, 1, 0, 0, 1], 5126, 'VEC3'); const uv = accessor([0, 0, 1, 0, 0, 1], 5126, 'VEC2');
  const joints = accessor(Array(12).fill(0), 5123, 'VEC4'); const weights = accessor([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 5126, 'VEC4'); const indices = accessor([0, 1, 2], 5123, 'SCALAR');
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; const binds = accessor(Array.from({ length: 11 }, () => identity).flat(), 5126, 'MAT4');
  const png = Buffer.alloc(24); Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png); png.writeUInt32BE(1, 16); png.writeUInt32BE(1, 20); const image = bytes(png);
  const nodes = [{ mesh: 0, skin: 0 }, ...JOINT_NAMES.map((name) => ({ name }))]; const parents = [null, 0, 1, 1, 3, 1, 5, 0, 7, 0, 9]; parents.forEach((p, i) => { if (p !== null) (nodes[p + 1].children ??= []).push(i + 1); });
  const doc = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0, 1] }], nodes, meshes: [{ primitives: [{ attributes: { POSITION: pos, NORMAL: norm, TEXCOORD_0: uv, JOINTS_0: joints, WEIGHTS_0: weights }, indices, material: 0 }] }], skins: [{ joints: JOINT_NAMES.map((_, i) => i + 1), inverseBindMatrices: binds }], accessors, bufferViews: views, buffers: [{ byteLength: length }], textures: [{ source: 0 }], images: [{ bufferView: image, mimeType: 'image/png' }], materials: [{ normalTexture: { index: 0 }, pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }] };
  const bin = Buffer.concat(binary); edit(doc, bin); const jsonRaw = Buffer.from(JSON.stringify(doc)); const json = Buffer.concat([jsonRaw, Buffer.alloc((4 - jsonRaw.length % 4) % 4, 32)]); const paddedBin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + paddedBin.length, 8); const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length); jh.writeUInt32LE(0x4e4f534a, 4); const bh = Buffer.alloc(8); bh.writeUInt32LE(paddedBin.length); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, json, bh, paddedBin]);
}

test('independently measures skinned scene triangles, maps and neutral bind', () => {
  const report = auditNpcGlb(fixture()); assert.equal(report.sceneTriangles, 1); assert.equal(report.storedTriangles, 1); assert.equal(report.vertices, 3); assert.equal(report.skins[0].joints.length, 11); assert.equal(report.maximumWeightSumError, 0); assert.equal(report.skins[0].neutralBindMaximumError, 0); assert.deepEqual([report.images[0].width, report.images[0].height], [1, 1]);
});
test('duplicate mesh nodes count twice toward the cap', () => {
  const data = fixture((doc) => { doc.nodes.push({ mesh: 0, skin: 0 }); doc.scenes[0].nodes.push(12); });
  assert.throws(() => auditNpcGlb(data, { triangleBudget: 1 }), /2 scene triangles/);
});
test('GPU mesh instancing also counts each drawn instance', () => {
  const data = fixture((doc) => { doc.nodes[0].extensions = { EXT_mesh_gpu_instancing: { attributes: { TRANSLATION: 0 } } }; });
  assert.throws(() => auditNpcGlb(data, { triangleBudget: 2 }), /3 scene triangles/);
});
test('rejects nonnormalized weights from actual binary values', () => {
  const data = fixture((doc, bin) => { const index = doc.meshes[0].primitives[0].attributes.WEIGHTS_0; bin.writeFloatLE(0.5, doc.bufferViews[doc.accessors[index].bufferView].byteOffset); });
  assert.throws(() => auditNpcGlb(data), /weights do not sum/);
});
test('rejects a joint index outside the skin', () => {
  const data = fixture((doc, bin) => { const index = doc.meshes[0].primitives[0].attributes.JOINTS_0; bin.writeUInt16LE(11, doc.bufferViews[doc.accessors[index].bufferView].byteOffset); });
  assert.throws(() => auditNpcGlb(data), /joint index outside skin/);
});
test('rejects nonneutral inverse bind transforms', () => {
  const data = fixture((doc, bin) => { const accessor = doc.accessors[doc.skins[0].inverseBindMatrices]; bin.writeFloatLE(1, doc.bufferViews[accessor.bufferView].byteOffset + 12 * 4); });
  assert.throws(() => auditNpcGlb(data), /not neutral/);
});
test('checks embedded texture dimensions instead of metadata claims', () => {
  const data = fixture((doc, bin) => { bin.writeUInt32BE(8192, doc.bufferViews[doc.images[0].bufferView].byteOffset + 16); });
  assert.throws(() => auditNpcGlb(data), /exceeds 2048px cap/);
});
test('refuses external resource dependencies and truncated accessors', () => {
  assert.throws(() => auditNpcGlb(fixture((doc) => { doc.images[0].uri = 'missing.png'; })), /external image/);
  assert.throws(() => auditNpcGlb(fixture((doc) => { doc.bufferViews[0].byteLength = 4; })), /outside its buffer view/);
});
