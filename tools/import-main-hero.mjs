#!/usr/bin/env node
/**
 * Deliver the owner-approved 49,500-triangle hero without changing its artwork.
 * Geometry, UVs, skinning and animation payloads are copied byte for byte.
 * Embedded PNGs are encoded as lossless WebP, then decoded and compared pixel
 * for pixel. Sharp is an offline preparation tool, not a game dependency.
 *
 * node tools/import-main-hero.mjs --source <approved.glb> --sharp <sharp-package>
 * node tools/import-main-hero.mjs --check
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME = path.join(ROOT, 'public/models/hero/weathered-wanderer-hero-50k.glb');
const RECORD = path.join(ROOT, 'docs/engineering/main-hero-assets.json');
const APPROVED_SHA = 'ceb90399b8a6ee8678861c67a30c5d1cdc603cb0c22020d0a3994392bccbd76d';
const MESHY_SHA = '41f1be6d97ed683973d0c78e0e964b41c6e57143cf90a72d5d1d0c78b6c9556c';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];

function readGlb(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'GLB version');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB total length');
  let json, bin;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString());
    else if (type === 0x004e4942) bin = chunk;
    else throw new Error('Unexpected GLB chunk');
    offset += 8 + length;
  }
  assert.ok(json && bin, 'Embedded JSON and BIN chunks');
  assert.equal(json.buffers.length, 1);
  assert.equal(json.buffers[0].uri, undefined);
  return { json, bin };
}

function viewBytes(glb, index) {
  const view = glb.json.bufferViews[index];
  assert.equal(view.buffer, 0);
  return glb.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}

function contract(glb) {
  const j = glb.json, primitives = j.meshes.flatMap((mesh) => mesh.primitives);
  const triangles = primitives.reduce((sum, primitive) => sum + j.accessors[primitive.indices].count / 3, 0);
  assert.equal(triangles, 49500);
  assert.equal(primitives.length, 1);
  assert.equal(j.materials.length, 1);
  assert.equal(j.skins.length, 1);
  assert.equal(j.skins[0].joints.length, 30);
  assert.deepEqual(j.animations.map((clip) => clip.name).sort(), ['Breathing', 'Idle', 'LookAround', 'Walk', 'WalkRootMotion']);
  assert.equal(j.images.length, 3);
  assert.ok(j.images.every((image) => image.bufferView !== undefined && image.uri === undefined));
  const position = j.accessors[primitives[0].attributes.POSITION];
  return {
    triangles, triangleBudget: 50000, attributeSplitVertices: position.count,
    meshCount: j.meshes.length, primitiveCount: primitives.length, materialCount: j.materials.length,
    jointCount: j.skins[0].joints.length,
    jointNames: j.skins[0].joints.map((index) => j.nodes[index].name),
    bounds: { min: position.min, max: position.max },
    clips: j.animations.map((clip) => ({
      name: clip.name,
      seconds: Math.max(...clip.samplers.map((sampler) => j.accessors[sampler.input].max[0])),
      rootMotion: clip.name === 'WalkRootMotion',
      gameplayUse: clip.name === 'WalkRootMotion' ? 'Preserved for authoring; do not loop this alongside controller movement.' : 'Available in-place animation.',
    })),
  };
}

function semanticJson(j) {
  const clone = structuredClone(j);
  delete clone.buffers;
  delete clone.extensionsUsed;
  delete clone.extensionsRequired;
  for (const view of clone.bufferViews) { delete view.byteOffset; delete view.byteLength; }
  for (const image of clone.images) delete image.mimeType;
  for (const texture of clone.textures) {
    if (texture.extensions?.EXT_texture_webp) {
      texture.source = texture.extensions.EXT_texture_webp.source;
      delete texture.extensions.EXT_texture_webp;
      if (Object.keys(texture.extensions).length === 0) delete texture.extensions;
    }
  }
  return clone;
}

function writeGlb(json, bin) {
  const rawJson = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(Math.ceil(rawJson.length / 4) * 4, 0x20);
  rawJson.copy(jsonChunk);
  const total = 12 + 8 + jsonChunk.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8), binHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]);
}

if (args.includes('--check')) {
  const record = JSON.parse(fs.readFileSync(RECORD));
  const bytes = fs.readFileSync(RUNTIME), glb = readGlb(bytes);
  assert.equal(bytes.length, record.runtime.bytes);
  assert.equal(hash(bytes), record.runtime.sha256, 'Runtime GLB must match the audited asset');
  assert.deepEqual(contract(glb), record.geometryAndRig);
  assert.ok(glb.json.extensionsRequired.includes('EXT_texture_webp'));
  assert.ok(record.preparation.images.every((image) => image.decodedPixelBytesIdentical));
  console.log(JSON.stringify({ passed: true, bytes: bytes.length, sha256: hash(bytes), triangles: contract(glb).triangles, joints: 30, clips: 5 }));
  process.exit(0);
}

assert.ok(args.includes('--source') && args.includes('--sharp'), 'Supply --source and --sharp, or --check');
const sourcePath = path.resolve(option('--source')), sourceBytes = fs.readFileSync(sourcePath);
assert.equal(hash(sourceBytes), APPROVED_SHA, 'Source must be the owner-approved final 50k GLB');
const require = createRequire(import.meta.url);
const sharp = require(path.resolve(option('--sharp')));
const source = readGlb(sourceBytes), json = structuredClone(source.json);
const imageViews = new Map(json.images.map((image, index) => [image.bufferView, index]));
const parts = [], images = [], untouchedViews = [];
let offset = 0;
for (let index = 0; index < json.bufferViews.length; index++) {
  const input = viewBytes(source, index);
  let output = input;
  if (imageViews.has(index)) {
    const imageIndex = imageViews.get(index), image = json.images[imageIndex];
    const original = await sharp(input).raw().toBuffer({ resolveWithObject: true });
    output = await sharp(input).webp({ lossless: true, effort: 6 }).toBuffer();
    const decoded = await sharp(output).raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual(decoded.info, original.info, `${image.name} dimensions/channel layout`);
    assert.ok(decoded.data.equals(original.data), `${image.name} decoded pixel bytes must be identical`);
    image.mimeType = 'image/webp';
    images.push({
      index: imageIndex, name: image.name, width: original.info.width, height: original.info.height,
      channels: original.info.channels, originalMimeType: 'image/png', runtimeMimeType: 'image/webp',
      sourceBytes: input.length, runtimeBytes: output.length,
      sourceEncodedSha256: hash(input), runtimeEncodedSha256: hash(output),
      decodedPixelSha256: hash(original.data), decodedPixelBytesIdentical: true,
    });
    console.log(`${image.name}: ${input.length} -> ${output.length} bytes; exact decoded RGB`);
  } else {
    untouchedViews.push({ index, bytes: input.length, sha256: hash(input) });
  }
  json.bufferViews[index].byteOffset = offset;
  json.bufferViews[index].byteLength = output.length;
  parts.push(output);
  offset += output.length;
  const padding = (4 - offset % 4) % 4;
  if (padding) { parts.push(Buffer.alloc(padding)); offset += padding; }
}
for (const texture of json.textures) {
  texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: texture.source } };
  delete texture.source;
}
json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), 'EXT_texture_webp'])];
json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), 'EXT_texture_webp'])];
json.buffers[0].byteLength = offset;
const runtimeBytes = writeGlb(json, Buffer.concat(parts)), runtime = readGlb(runtimeBytes);
assert.deepEqual(semanticJson(runtime.json), semanticJson(source.json), 'All scene/mesh/skin/animation/material semantics retained');
for (const view of untouchedViews) assert.ok(viewBytes(runtime, view.index).equals(viewBytes(source, view.index)));
assert.ok(runtimeBytes.length < sourceBytes.length, 'Do not deliver a larger derivative');
assert.equal(hash(fs.readFileSync(sourcePath)), APPROVED_SHA, 'Approved source remains unchanged');
fs.mkdirSync(path.dirname(RUNTIME), { recursive: true });
fs.writeFileSync(RUNTIME, runtimeBytes);
const record = {
  schemaVersion: 1, date: '2026-10-02', id: 'tervain.hero.weathered-wanderer.50k',
  displayName: 'The Weathered Wanderer', intendedUse: 'Owner-selected main playable character for Tervain 0.0.8.',
  source: {
    suppliedBy: 'Ael', suppliedFilename: 'Meshy_AI_The_Weathered_Wandere_1002192705_texture.glb',
    suppliedSha256: MESHY_SHA,
    approvedDerivativeFilename: 'weathered-wanderer-hero-50k.glb', approvedDerivativeBytes: sourceBytes.length,
    approvedDerivativeSha256: APPROVED_SHA,
    editableBlendFilename: 'weathered-wanderer-hero-50k.blend', editableBlendBytes: 46141922,
    editableBlendSha256: '280d0d3deff89678e5a01ac027e63563a8ba1ab65c198ae1f1e9d1949985583a',
    workshop: 'Original source, editable Blender scene, texture sources, prompts and validation remain in the owner’s approved wanderer-hero-50k asset workshop. They are not bundled in the game.',
    history: 'Owner-supplied Meshy model, UV-preserving reduction to 49,500 triangles, original rig and five clips, owner-authorized ImageGen material refinement. No Gothic/Warcraft game files are shipped.',
  },
  terms: {
    spdx: null,
    authority: 'Owner explicitly approved the finished hero and requested adding him as Tervain’s main character on 2026-10-02.',
    credit: 'The Weathered Wanderer — supplied by Ael; Meshy-generated source, refined and rigged for Tervain using Blender and owner-authorized ImageGen textures.',
    boundary: 'Specific project-use authority. No general open-content license, exclusive authorship or independently reviewed Meshy/account/third-party rights are asserted.',
  },
  runtime: {
    path: 'public/models/hero/weathered-wanderer-hero-50k.glb',
    urlRelativeToBase: 'models/hero/weathered-wanderer-hero-50k.glb',
    bytes: runtimeBytes.length, sha256: hash(runtimeBytes),
    sourceBytesSaved: sourceBytes.length - runtimeBytes.length,
    reductionPercent: Number(((1 - runtimeBytes.length / sourceBytes.length) * 100).toFixed(2)),
    externalDependencies: [], requiredGltfExtension: 'EXT_texture_webp',
    loading: 'Locally served embedded GLB using the existing Three.js GLTFLoader; use import.meta.env.BASE_URL so GitHub Pages subpaths work.',
  },
  geometryAndRig: contract(runtime),
  coordinateSystem: { units: 'metres', up: '+Y', forward: '+Z', origin: 'Ground-centred; rest-pose minimum Y 0.000267 m.' },
  materials: {
    baseColor: { colorSpace: 'sRGB', resolution: [4096, 4096], transparent: false },
    normal: { colorSpace: 'linear/non-color', resolution: [4096, 4096], tangentSpace: true },
    metallicRoughness: { colorSpace: 'linear/non-color', resolution: [2048, 2048], channels: 'G roughness, B metallic; R unused by the material.' },
    compressedTextureFormat: 'Lossless WebP is a download encoding, not GPU block compression.',
    rgbaGpuBytesIncludingMipmapsEstimate: 201326592,
    estimateBoundary: 'Three maps decoded as RGBA8 with a full mip chain; device residency and render performance are not measured by this estimate.',
  },
  preparation: {
    tool: 'tools/import-main-hero.mjs', nativeEncoderVersions: sharp.versions,
    operation: 'Lossless encoding only: no resize, repaint, palette, normal, UV, geometry, weight, rig or animation changes.',
    webpOptions: { lossless: true, effort: 6 },
    images: images.sort((a, b) => a.index - b.index),
    unchangedNonImageBufferViewCount: untouchedViews.length,
    unchangedNonImageBufferViewsSha256: hash(Buffer.concat(untouchedViews.map((view) => viewBytes(source, view.index)))),
    sceneMeshSkinAnimationMaterialSemanticsIdentical: true,
    approvedSourceFileUnmodified: true,
  },
  motionPolicy: {
    inPlaceWalkCycleSeconds: 1.2, authoredWalkRootMotionMetres: 0.516129,
    authoredWalkSpeedMetresPerSecond: 0.43010752688172044,
    rootMotion: 'Keep the gameplay controller authoritative. Use Walk for controller-driven locomotion; WalkRootMotion is preserved but cannot be layered on top of controller translation.',
    contacts: 'Source rig/deformation audits verify the authored walk. Controller speed, slopes, weapons and camera contact must be checked in the integrated game.',
  },
  verification: {
    assetPreparation: 'Passed: approved source hash; exact decoded pixels for all three maps; byte-identical non-image buffer views; identical scene/mesh/skin/animation/material semantics; strict triangle budget and complete clip contract.',
    gameIntegration: 'Requires the coordinating assistant’s typecheck/tests/build and running-game observations; not implied by asset preparation.',
    publication: 'No remote publication or CI was performed by this preparation script.',
  },
};
fs.writeFileSync(RECORD, JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, runtime: record.runtime, triangles: record.geometryAndRig.triangles }));
