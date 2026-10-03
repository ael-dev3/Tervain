import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('docs/engineering/solitary-pine-assets.json', root), 'utf8'));
for (const asset of manifest.runtime) {
  const data = readFileSync(new URL(asset.path, root));
  assert.equal(data.length, asset.bytes, `${asset.path}: bytes`);
  assert.equal(createHash('sha256').update(data).digest('hex'), asset.sha256, `${asset.path}: hash`);
  assert.equal(data.readUInt32LE(0), 0x46546c67); assert.equal(data.readUInt32LE(4), 2); assert.equal(data.readUInt32LE(8), data.length);
  const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8'));
  let triangles = 0;
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    assert.equal(primitive.mode ?? 4, 4);
    triangles += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
  }
  assert.equal(triangles, asset.triangles, `${asset.path}: triangles`);
  assert.deepEqual(gltf.extensionsRequired ?? [], []);
  assert(gltf.images.every((image) => image.bufferView !== undefined && ['image/png', 'image/jpeg'].includes(image.mimeType)));
  const foliage = gltf.materials.find((material) => material.alphaMode === 'MASK');
  assert(foliage && foliage.doubleSided && foliage.alphaCutoff === 0.42);
  console.log(`${asset.level}: ${triangles.toLocaleString()} triangles; ${data.length.toLocaleString()} bytes; hash verified`);
}
assert(manifest.runtime[0].triangles < 10000);
