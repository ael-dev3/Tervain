/** Independent audit of the delivered 0.0.12 tree GLBs and protected source pine. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(new URL('docs/engineering/meshy-tree-assets.json', root), 'utf8'));
assert.equal(manifest.assets.length, 15);
let totalBytes = 0;
for (const asset of manifest.assets) {
  for (const level of ['near', 'mid', 'far']) {
    const row = asset.runtime[level];
    const data = readFileSync(new URL(row.path, root));
    assert.equal(data.length, row.bytes, `${row.path}: byte receipt`);
    assert.equal(digest(data), row.sha256, `${row.path}: SHA-256 receipt`);
    assert.equal(data.readUInt32LE(0), 0x46546c67);
    assert.equal(data.readUInt32LE(4), 2);
    assert.equal(data.readUInt32LE(8), data.length);
    const jsonLength = data.readUInt32LE(12);
    assert.equal(data.readUInt32LE(16), 0x4e4f534a);
    const doc = JSON.parse(data.subarray(20, 20 + jsonLength));
    const binaryStart = 28 + jsonLength;
    assert.equal(data.readUInt32LE(24 + jsonLength), 0x004e4942);
    assert.equal(doc.asset.version, '2.0');
    assert.deepEqual(doc.extensionsRequired ?? [], []);
    assert.equal(doc.buffers.length, 1);
    assert.equal(doc.buffers[0].uri, undefined);
    assert(doc.buffers[0].byteLength <= data.length - binaryStart);
    assert.equal((doc.animations ?? []).length, 0);
    assert.equal((doc.skins ?? []).length, 0);
    const parts = [];
    const active = new Set();
    const visit = (index) => {
      assert(!active.has(index), 'cyclic scene graph'); active.add(index);
      const node = doc.nodes[index]; assert(node);
      if (node.mesh !== undefined) {
        const mesh = doc.meshes[node.mesh]; assert.equal(mesh.primitives.length, 1);
        let triangles = 0;
        for (const primitive of mesh.primitives) {
          assert.equal(primitive.mode ?? 4, 4);
          for (const semantic of ['POSITION', 'NORMAL', 'TEXCOORD_0']) assert(primitive.attributes[semantic] !== undefined);
          const count = doc.accessors[primitive.indices ?? primitive.attributes.POSITION].count;
          assert.equal(count % 3, 0); triangles += count / 3;
          const material = doc.materials[primitive.material]; assert(material);
          assert(material.pbrMetallicRoughness.baseColorTexture);
          assert.equal(material.pbrMetallicRoughness.metallicFactor, 0);
          assert(material.pbrMetallicRoughness.roughnessFactor >= .85);
          assert.deepEqual(material.emissiveFactor ?? [0, 0, 0], [0, 0, 0]);
          if (node.name === 'Foliage') {
            assert.equal(material.doubleSided, true);
            assert(['OPAQUE', 'MASK'].includes(material.alphaMode ?? 'OPAQUE'));
            if (asset.preparation.crownCards) {
              assert.equal(material.alphaMode, 'MASK'); assert.equal(material.alphaCutoff, .35);
            }
          }
        }
        parts.push({ name: node.name, triangles });
      }
      for (const child of node.children ?? []) visit(child);
      active.delete(index);
    };
    for (const node of doc.scenes[doc.scene ?? 0].nodes) visit(node);
    assert.deepEqual(parts.map((p) => p.name).sort(), ['Foliage', 'Wood']);
    const triangles = parts.reduce((sum, p) => sum + p.triangles, 0);
    assert(triangles < 20000, `${row.path}: actual scene budget`);
    assert.equal(triangles, row.triangles);
    for (const image of doc.images) {
      assert(image.bufferView !== undefined && !image.uri);
      assert(['image/png', 'image/jpeg'].includes(image.mimeType));
    }
    for (const view of doc.bufferViews) {
      assert.equal(view.buffer, 0);
      assert((view.byteOffset ?? 0) + view.byteLength <= doc.buffers[0].byteLength);
    }
    for (const accessor of doc.accessors) {
      if (accessor.type !== 'VEC3' || accessor.componentType !== 5126 || accessor.bufferView === undefined) continue;
      const view = doc.bufferViews[accessor.bufferView];
      const stride = view.byteStride ?? 12;
      for (let i = 0; i < accessor.count; i++) for (let c = 0; c < 3; c++) {
        const at = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + i * stride + c * 4;
        assert(at + 4 <= binaryStart + doc.buffers[0].byteLength);
        assert(Number.isFinite(data.readFloatLE(at)), `${row.path}: finite vertices/normals`);
      }
    }
    totalBytes += data.length;
  }
  console.log(`${asset.id}: ${['near', 'mid', 'far'].map((level) => asset.runtime[level].triangles.toLocaleString()).join(' / ')} triangles`);
}
for (const asset of manifest.protectedPine) {
  const data = readFileSync(new URL(asset.path, root));
  assert.equal(digest(data), asset.sha256, `${asset.path}: protected pine must be unchanged`);
  assert.equal(data.length, asset.bytes);
}
console.log(`15 trees / 45 LOD GLBs verified; ${totalBytes.toLocaleString()} bytes; protected pine unchanged.`);
