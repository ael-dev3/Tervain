#!/usr/bin/env node
/**
 * Shrink the embedded textures of every GLB under public/models, in place (backlog 4: a smaller first download).
 *
 *   node tools/optimise-models.mjs              optimise every model, then run `node tools/model-files.mjs`
 *   node tools/optimise-models.mjs --dry        report what would change, write nothing
 *   node tools/optimise-models.mjs npcs/fisher.glb animals
 *                                              only these files or folders (paths under public/models)
 *
 * Only image bytes change. The GLB is edited surgically: the JSON keeps every node, mesh, accessor, skin, animation,
 * material, extension and extra as it was, and every non-image buffer view keeps its index and exact bytes (only its
 * offset moves), so geometry receipts and skin/animation data stay byte-identical. No Draco or meshopt: the game's
 * loaders carry no decoders.
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
 * Needs the devDependency sharp.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const models = path.join(root, 'public', 'models');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
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

async function optimise(bytes, caps) {
  const { json, bin } = readGlb(bytes);
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
  // Rebuild the binary chunk in buffer-view order; untouched views keep their exact bytes.
  const parts = [];
  let at = 0;
  for (const [index, view] of json.bufferViews.entries()) {
    const data = replaced.get(index) ?? bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const pad = (4 - (at % 4)) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); at += pad; }
    view.byteOffset = at; view.byteLength = data.length;
    parts.push(data); at += data.length;
  }
  const newBin = Buffer.concat(parts);
  json.buffers[0].byteLength = newBin.length;
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
  return { out: writeGlb(json, newBin), notes };
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
  const result = await optimise(bytes, CAPS.find((c) => rel.startsWith(c.prefix)));
  if (!result || result.out.length >= bytes.length) { after += bytes.length; console.log(`${rel}: unchanged`); continue; }
  after += result.out.length;
  if (!dry) fs.writeFileSync(file, result.out);
  console.log(`${rel}: ${(bytes.length / 1e6).toFixed(2)} -> ${(result.out.length / 1e6).toFixed(2)} MB  [${result.notes.join('; ')}]`);
}
console.log(`${files.length} models: ${(before / 1048576).toFixed(1)} MiB -> ${(after / 1048576).toFixed(1)} MiB${dry ? ' (dry run)' : ''}`);
if (!dry) console.log('Now run: node tools/model-files.mjs');
