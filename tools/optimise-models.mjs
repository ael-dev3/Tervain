#!/usr/bin/env node
/**
 * Shrink the embedded textures and geometry of every GLB under public/models, in place (backlog 4: a smaller first download).
 *
 *   node tools/optimise-models.mjs              optimise every model, then run `node tools/model-files.mjs`
 *   node tools/optimise-models.mjs --dry        report what would change, write nothing
 *   node tools/optimise-models.mjs npcs/fisher.glb animals
 *                                              only these files or folders (paths under public/models)
 *
 *   node tools/optimise-models.mjs --images     only the image step;  --geometry  only the geometry step (no sharp)
 *   node tools/optimise-models.mjs --share      only the tree-image sharing step (no sharp)
 *
 * Tree images are shared (A71): a tree's near, mid and far files carry the same images, so the mid and far files drop
 * theirs, checked byte for byte against the near file's first, and borrow the near file's textures when loaded
 * (src/presentation/meshyTrees.ts). Their materials keep every other setting; asset.extras.tervainSharedImages names
 * the file the images come from.
 *
 * The GLB is edited surgically: the JSON keeps every node, mesh, accessor, skin, animation, material, extension and
 * extra as it was, and every buffer view keeps its index. Images are re-encoded (below). Geometry (vertex attributes,
 * indices, skins, animation) is compressed losslessly with EXT_meshopt_compression: no quantisation and no filters,
 * every encoding decoded again with three's MeshoptDecoder and compared byte for byte before it is kept, so the loaded
 * geometry, skin and animation data stay byte-identical. Every GLTFLoader for these models must therefore be made with
 * createGltfLoader() (src/presentation/assets/gltfLoader.ts), which carries the decoder. No Draco.
 *
 * - Each texture is capped to a longest side chosen by folder and role (CAPS below), never enlarged.
 * - Colour and emissive maps become WebP (EXT_texture_webp, required; decoded natively by three's GLTFLoader). Alpha
 *   is kept lossless with its colour under transparent texels, so leaf cut-outs and coverage sampling keep their edges.
 * - Normal, metal-roughness and occlusion maps become JPEG with full 4:4:4 chroma, so no channel loses resolution.
 * - An image is re-encoded only when it is over its cap, is PNG, or is colour not yet in WebP, so running the tool
 *   again leaves optimised files untouched (no generation loss). An encoding that is not smaller is discarded.
 * - Encoding is deterministic: images shared between a tree's near/mid/far files stay byte-identical, which the tree
 *   texture pool relies on to keep one GPU copy.
 *
 * The original exports remain in git history. Afterwards run `node tools/model-files.mjs` and update the asset
 * receipts that pin model hashes (public/model-licenses.json, docs/engineering/*-assets.json, model manifests).
 * The image step needs the devDependency sharp; the geometry step uses meshoptimizer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptEncoder } from 'meshoptimizer';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const models = path.join(root, 'public', 'models');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const imagesOnly = args.includes('--images'), geometryOnly = args.includes('--geometry'), shareOnly = args.includes('--share');
/** sharp loads only for the image step, so geometry-only runs work without it. */
const sharp = geometryOnly || shareOnly ? null : (await import('sharp')).default;
const only = args.filter((arg) => !arg.startsWith('--')).map((arg) => arg.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''));

/** Longest side by folder prefix and role. First matching prefix wins. */
const CAPS = [
  // The wanderer is seen closest of all, filling the screen in third person.
  { prefix: 'hero/', color: 2048, data: 2048 },
  // Residents keep their 1536 px painted sheets for conversations; their normal maps are 1024 already.
  { prefix: 'npcs/', color: 1536, data: 1024 },
  // Wildlife is met at a distance, a few hundred pixels tall on screen at most.
  { prefix: 'animals/', color: 1024, data: 1024 },
  // Trees share images across their near/mid/far files: one cap for all three keeps them pooled.
  { prefix: 'flora/', color: 2048, data: 1024 },
  { prefix: 'scenery/', color: 2048, data: 1024 },
  { prefix: '', color: 1024, data: 1024 },
];
const WEBP = { quality: 86, alphaQuality: 100, effort: 6, smartSubsample: true, exact: true };
const JPEG = { quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true };
const WEBP_EXT = 'EXT_texture_webp';
const MESHOPT_EXT = 'EXT_meshopt_compression';
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith('.glb') ? [full] : [];
  });
}

function readGlb(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('not a GLB 2 file');
  let json, bin;
  for (let at = 12; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(at), kind = bytes.readUInt32LE(at + 4);
    const chunk = bytes.subarray(at + 8, at + 8 + length);
    if (kind === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (kind === 0x004e4942) bin = chunk;
    at += 8 + length;
  }
  if (!json || !bin) throw new Error('GLB lacks a JSON or binary chunk');
  return { json, bin };
}

function writeGlb(json, bin) {
  const text = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonLength = Math.ceil(text.length / 4) * 4, binLength = Math.ceil(bin.length / 4) * 4;
  const out = Buffer.alloc(12 + 8 + jsonLength + 8 + binLength);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonLength, 12); out.writeUInt32LE(0x4e4f534a, 16);
  out.fill(0x20, 20, 20 + jsonLength); text.copy(out, 20);
  const binAt = 20 + jsonLength;
  out.writeUInt32LE(binLength, binAt); out.writeUInt32LE(0x004e4942, binAt + 4); bin.copy(out, binAt + 8);
  return out;
}

/** The image index a texture samples, through EXT_texture_webp when present. */
const textureImage = (texture) => texture.extensions?.[WEBP_EXT]?.source ?? texture.source;

/** 'color' or 'data' for every image: colour when any material samples it as base/emissive or via an extension. */
function imageRoles(json) {
  const roles = new Map();
  const mark = (info, role) => {
    const texture = info && json.textures?.[info.index];
    const image = texture && textureImage(texture);
    if (image === undefined) return;
    const was = roles.get(image);
    roles.set(image, was === 'color' || role === 'color' ? 'color' : 'data');
  };
  for (const material of json.materials ?? []) {
    const pbr = material.pbrMetallicRoughness ?? {};
    mark(pbr.baseColorTexture, 'color'); mark(material.emissiveTexture, 'color');
    mark(material.normalTexture, 'data'); mark(pbr.metallicRoughnessTexture, 'data'); mark(material.occlusionTexture, 'data');
    // Extension textures (e.g. specular colour) count as colour.
    for (const extension of Object.values(material.extensions ?? {})) {
      for (const value of Object.values(extension ?? {})) if (value && typeof value === 'object' && Number.isInteger(value.index)) mark(value, 'color');
    }
  }
  return roles;
}

async function encode(input, mime, cap, role) {
  const meta = await sharp(input).metadata();
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  const over = longest > cap;
  const hasAlpha = !!meta.hasAlpha && !(await sharp(input).stats()).isOpaque;
  // A data map with real alpha cannot become JPEG; it becomes WebP instead.
  const target = role === 'color' || hasAlpha ? 'image/webp' : 'image/jpeg';
  if (!over && mime !== 'image/png' && (mime === target || (role === 'data' && mime === 'image/webp'))) return null;
  let pipeline = sharp(input);
  if (over) {
    const scale = cap / longest;
    pipeline = pipeline.resize(Math.max(1, Math.round(meta.width * scale)), Math.max(1, Math.round(meta.height * scale)), { kernel: 'lanczos3' });
  }
  if (!hasAlpha) pipeline = pipeline.removeAlpha();
  pipeline = target === 'image/jpeg' ? pipeline.jpeg(JPEG) : pipeline.webp(WEBP);
  const output = await pipeline.toBuffer();
  if (!over && output.length >= input.length) return null;
  return { output, target, note: `${role} ${mime.split('/')[1]} ${meta.width}x${meta.height} -> ${target.split('/')[1]}${over ? ` ${cap}` : ''}` };
}

/**
 * Rebuild the binary chunk in buffer-view order: `replaced` views get new bytes, every other view keeps its exact bytes.
 * A view already meshopt-compressed keeps its payload, which moves with it.
 */
function repack(json, bin, replaced) {
  const parts = [];
  let at = 0;
  for (const [index, view] of json.bufferViews.entries()) {
    const meshopt = view.extensions?.[MESHOPT_EXT];
    const target = (view.buffer ?? 0) === 0 ? view : meshopt && (meshopt.buffer ?? 0) === 0 ? meshopt : null;
    if (!target) continue;
    const data = replaced.get(index) ?? bin.subarray(target.byteOffset ?? 0, (target.byteOffset ?? 0) + target.byteLength);
    const pad = (4 - (at % 4)) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); at += pad; }
    target.byteOffset = at; target.byteLength = data.length;
    parts.push(data); at += data.length;
  }
  const out = Buffer.concat(parts);
  json.buffers[0].byteLength = out.length;
  return out;
}

async function optimiseImages(json, bin, caps) {
  const roles = imageRoles(json), replaced = new Map(), notes = [];
  for (const [index, image] of (json.images ?? []).entries()) {
    if (image.uri !== undefined || image.bufferView === undefined || !roles.has(index)) continue;
    const view = json.bufferViews[image.bufferView];
    if ((view.buffer ?? 0) !== 0) continue;
    const input = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const role = roles.get(index);
    const result = await encode(input, image.mimeType, caps[role], role);
    if (!result) continue;
    replaced.set(image.bufferView, result.output);
    image.mimeType = result.target;
    notes.push(result.note);
  }
  if (!replaced.size) return null;
  const newBin = repack(json, bin, replaced);
  // Point WebP textures at their image through EXT_texture_webp, which is then required.
  let webp = false;
  for (const texture of json.textures ?? []) {
    const image = textureImage(texture);
    if (json.images[image]?.mimeType !== 'image/webp') continue;
    webp = true;
    texture.extensions = { ...texture.extensions, [WEBP_EXT]: { source: image } };
    delete texture.source;
  }
  if (webp) {
    json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), WEBP_EXT])];
    json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), WEBP_EXT])];
  }
  return { bin: newBin, notes };
}

const COMPONENT_BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

/** Decode one meshopt payload with the decoder the game ships, to prove the encoding lossless. */
function decodes(encoded, count, stride, mode, original) {
  const target = new Uint8Array(count * stride);
  MeshoptDecoder.decodeGltfBuffer(target, count, stride, encoded, mode);
  return Buffer.compare(Buffer.from(target.buffer, target.byteOffset, target.byteLength), original) === 0;
}

/**
 * Losslessly compress every geometry buffer view (vertex attributes, indices, skins, animation) with
 * EXT_meshopt_compression: no quantisation and no filters, so the decoded bytes equal the originals exactly. Each
 * encoding is decoded again and compared before it is kept. Compressed views move to a fallback buffer without data
 * (as gltfpack writes them); images and views no accessor reads stay raw in the GLB's binary chunk.
 */
function compressGeometry(json, bin) {
  if ((json.extensionsUsed ?? []).includes(MESHOPT_EXT) || !json.bufferViews?.length || (json.buffers?.length ?? 0) !== 1) return null;
  const users = new Map(), indexViews = new Map();
  for (const accessor of json.accessors ?? []) {
    if (accessor.sparse) return null;
    if (accessor.bufferView === undefined) continue;
    if (!users.has(accessor.bufferView)) users.set(accessor.bufferView, []);
    users.get(accessor.bufferView).push(COMPONENT_BYTES[accessor.componentType] * TYPE_COMPONENTS[accessor.type]);
  }
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives ?? []) {
    if (primitive.indices === undefined) continue;
    const view = json.accessors[primitive.indices].bufferView;
    indexViews.set(view, (indexViews.get(view) ?? true) && (primitive.mode ?? 4) === 4);
  }
  const replaced = new Map(), compressed = new Map();
  let before = 0, after = 0;
  for (const [index, sizes] of users) {
    const view = json.bufferViews[index];
    if ((view.buffer ?? 0) !== 0) continue;
    const data = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    let mode, stride;
    if (indexViews.has(index)) {
      stride = sizes[0];
      if (!sizes.every((s) => s === stride) || (stride !== 2 && stride !== 4) || data.length % stride) continue;
      mode = indexViews.get(index) && (data.length / stride) % 3 === 0 ? 'TRIANGLES' : 'INDICES';
    } else {
      mode = 'ATTRIBUTES';
      stride = view.byteStride ?? (sizes.every((s) => s === sizes[0]) ? sizes[0] : 4);
      if (stride % 4 || stride > 256 || data.length % stride) stride = 4;
      if (data.length % stride) continue;
    }
    const count = data.length / stride;
    let encoded = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(data), count, stride, mode);
    if (mode === 'TRIANGLES' && !decodes(encoded, count, stride, mode, data)) {
      // The triangle codec may rotate a triangle's corners; the sequence codec keeps every index in place.
      mode = 'INDICES';
      encoded = MeshoptEncoder.encodeGltfBuffer(new Uint8Array(data), count, stride, mode);
    }
    if (!decodes(encoded, count, stride, mode, data)) throw new Error(`buffer view ${index}: meshopt round trip differs`);
    if (encoded.length >= data.length) continue;
    replaced.set(index, Buffer.from(encoded));
    compressed.set(index, { mode, stride, count, byteLength: data.length });
    before += data.length; after += encoded.length;
  }
  if (!replaced.size) return null;
  const newBin = repack(json, bin, replaced);
  // Each compressed view keeps its decoded layout in a fallback buffer that holds no bytes of its own.
  let fallback = 0;
  for (const [index, info] of compressed) {
    const view = json.bufferViews[index];
    fallback = Math.ceil(fallback / 4) * 4;
    view.extensions = { ...view.extensions, [MESHOPT_EXT]: { buffer: 0, byteOffset: view.byteOffset, byteLength: view.byteLength, byteStride: info.stride, count: info.count, mode: info.mode } };
    view.buffer = 1; view.byteOffset = fallback; view.byteLength = info.byteLength;
    fallback += info.byteLength;
  }
  json.buffers.push({ byteLength: fallback, extensions: { [MESHOPT_EXT]: { fallback: true } } });
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), MESHOPT_EXT])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), MESHOPT_EXT])];
  return { bin: newBin, note: `geometry ${(before / 1e6).toFixed(2)} -> ${(after / 1e6).toFixed(2)} MB meshopt` };
}

/** Material texture slots, by their glTF names. */
const TEXTURE_SLOTS = (material) => [material.pbrMetallicRoughness?.baseColorTexture && ['pbrMetallicRoughness', 'baseColorTexture'],
  material.pbrMetallicRoughness?.metallicRoughnessTexture && ['pbrMetallicRoughness', 'metallicRoughnessTexture'],
  material.normalTexture && [null, 'normalTexture'], material.occlusionTexture && [null, 'occlusionTexture'],
  material.emissiveTexture && [null, 'emissiveTexture']].filter(Boolean);

/** The bytes of each image in a GLB, in order. */
function imageBytes(json, bin) {
  return (json.images ?? []).map((image) => {
    const view = json.bufferViews[image.bufferView];
    return bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  });
}

/**
 * A tree's mid or far file whose images are byte for byte the near file's: drop its images, textures and samplers and
 * its materials' texture references, and name the near file as their source (A71). The image buffer views shrink to a
 * byte; every other view keeps its index and contents.
 */
function shareTreeImages(rel, json, bin) {
  const match = /^(flora\/meshy-012\/.+)-(mid|far)\.glb$/.exec(rel);
  if (!match || json.asset?.extras?.tervainSharedImages || !(json.images ?? []).length) return null;
  const nearRel = `${match[1]}-near.glb`, near = readGlb(fs.readFileSync(path.join(models, nearRel)));
  const mine = imageBytes(json, bin), theirs = imageBytes(near.json, near.bin);
  if (mine.length !== theirs.length || mine.some((bytes, i) => !bytes.equals(theirs[i]))) return null;
  const names = (m) => (m.materials ?? []).map((material) => material.name).join('|');
  if (names(json) !== names(near.json)) return null;
  const replaced = new Map();
  for (const image of json.images) replaced.set(image.bufferView, Buffer.alloc(1));
  for (const material of json.materials ?? []) {
    for (const [parent, slot] of TEXTURE_SLOTS(material)) delete (parent ? material[parent] : material)[slot];
  }
  delete json.images; delete json.textures; delete json.samplers;
  json.extensionsUsed = (json.extensionsUsed ?? []).filter((name) => name !== WEBP_EXT);
  json.extensionsRequired = (json.extensionsRequired ?? []).filter((name) => name !== WEBP_EXT);
  if (!json.extensionsUsed.length) delete json.extensionsUsed;
  if (!json.extensionsRequired.length) delete json.extensionsRequired;
  json.asset.extras = { ...(json.asset.extras ?? {}), tervainSharedImages: nearRel.split('/').pop() };
  return { bin: repack(json, bin, replaced), note: `images shared with ${nearRel.split('/').pop()}` };
}

async function optimise(bytes, caps, rel) {
  let { json, bin } = readGlb(bytes);
  const notes = [];
  if (shareOnly || (!imagesOnly && !geometryOnly)) {
    const shared = shareTreeImages(rel, json, bin);
    if (shared) { bin = shared.bin; notes.push(shared.note); }
    if (shareOnly) return notes.length ? { out: writeGlb(json, bin), notes } : null;
  }
  if (!geometryOnly) {
    const images = await optimiseImages(json, bin, caps);
    if (images) { bin = images.bin; notes.push(...images.notes); }
  }
  if (!imagesOnly) {
    const geometry = compressGeometry(json, bin);
    if (geometry) { bin = geometry.bin; notes.push(geometry.note); }
  }
  return notes.length ? { out: writeGlb(json, bin), notes } : null;
}

const files = walk(models).filter((file) => {
  const rel = path.relative(models, file).split(path.sep).join('/');
  return only.length === 0 || only.some((o) => rel === o || rel.startsWith(`${o}/`));
});
let before = 0, after = 0;
for (const file of files) {
  const rel = path.relative(models, file).split(path.sep).join('/');
  const bytes = fs.readFileSync(file);
  before += bytes.length;
  const result = await optimise(bytes, CAPS.find((c) => rel.startsWith(c.prefix)), rel);
  if (!result || result.out.length >= bytes.length) { after += bytes.length; console.log(`${rel}: unchanged`); continue; }
  after += result.out.length;
  if (!dry) fs.writeFileSync(file, result.out);
  console.log(`${rel}: ${(bytes.length / 1e6).toFixed(2)} -> ${(result.out.length / 1e6).toFixed(2)} MB  [${result.notes.join('; ')}]`);
}
console.log(`${files.length} models: ${(before / 1048576).toFixed(1)} MiB -> ${(after / 1048576).toFixed(1)} MiB${dry ? ' (dry run)' : ''}`);
if (!dry) console.log('Now run: node tools/model-files.mjs');
