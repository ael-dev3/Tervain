#!/usr/bin/env node
/**
 * Move a near tree's triangle budget from its wood to its crown (A72): simplify the Wood mesh of each heavy-wooded
 * tree file under public/models/flora/meshy-012, in place, leaving the Foliage mesh and every image byte for byte.
 *
 *   node tools/rebalance-tree-wood.mjs           rebalance every listed file (TARGETS), then re-encode and rehash:
 *                                                node tools/optimise-models.mjs --geometry flora/meshy-012/<file> ...
 *                                                node tools/model-files.mjs
 *   node tools/rebalance-tree-wood.mjs --dry     report what would change, write nothing
 *
 * Close up, the exported near trees spent about 14,000 of their 20,000 triangles on bark and some 5,500 on leaf cards,
 * so a crown showed sky through it. Their mid files carry the same wood at about 4,900 triangles and read the same
 * from a few metres, so the near wood loses little at about 8,000. The freed budget is spent on leaf cards at load
 * (thicken() in src/presentation/meshyTrees.ts).
 *
 * - The file's EXT_meshopt_compression views are decoded (three's MeshoptDecoder, as the game decodes them), the wood
 *   is simplified, and the file is written without compression; optimise-models.mjs --geometry then compresses it
 *   again losslessly, exactly as every other model.
 * - Simplification is meshoptimizer's attribute-aware edge collapse, which never moves a vertex (every kept vertex is
 *   an original one, with its normal, UV and tangent) and lets an open border collapse only along itself. It never
 *   collapses across a UV seam (A79). A72 allowed that (Permissive) to reach 6,000 triangles, and it stretched a
 *   branch's texture island over its neighbours': 8-40 % of the wood's surface mapped more than 8:1 (0-2 % in the
 *   exports), and close up the branches read as long smeared ribbons streaked with the atlas's greens. With seams kept,
 *   the wood stops near 8,000 triangles at the error ceiling (MAX_ERROR); the leaning palm near 12,000. The surface
 *   deviation (original vertices to the simplified surface) is reported per file.
 * - Locked: all wood at the foot of the tree (the lowest share of its height in TARGETS, where it meets the soil), and,
 *   with the triangles around them, its lowest and topmost vertex and its widest vertex in each of BANDS height bands,
 *   so height, ground contact and the radius at every height are kept (checked below to stay within 1 %).
 * - Images, the Foliage mesh (including its tervainCustomFoliage extras), materials, nodes and every other accessor
 *   keep their bytes; only the Wood primitive's accessors are rewritten.
 * - Mid and far files are rebalanced only where listed (their wood was the near wood, unsimplified); their shared
 *   images (asset.extras.tervainSharedImages) are untouched.
 * - The Wood mesh records the pass in extras.tervainRebalancedWood; a file carrying it, or whose wood is already at or
 *   under its target, is left alone, so running the tool again changes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'public', 'models', 'flora', 'meshy-012');
const dry = process.argv.includes('--dry');
const MESHOPT_EXT = 'EXT_meshopt_compression';

/**
 * Wood triangle target and kept foot (share of the wood's height, from its lowest point) by file. The foot is the
 * ground contact: treeGrounding.ts takes the wood's lowest 2.5 cm in the world, about 0.15-0.35 % of these trees'
 * heights as planted; a tree also planted as a shrub (1.5 m) needs about 1.7 %. The dead tree (tree-1537) is all
 * wood and keeps it.
 */
const NEAR_WOOD = 8000, FOOT = 0.005, SHRUB_FOOT = 0.02;
const TARGETS = {
  'oak-elder-near.glb': [NEAR_WOOD, FOOT], 'tree-0208-near.glb': [NEAR_WOOD, FOOT], 'tree-1505-near.glb': [NEAR_WOOD, FOOT],
  'tree-4815-near.glb': [NEAR_WOOD, FOOT], 'tree-1521-near.glb': [NEAR_WOOD, SHRUB_FOOT], 'tree-4949-near.glb': [NEAR_WOOD, SHRUB_FOOT],
  'palm-fan-near.glb': [NEAR_WOOD, FOOT], 'palm-lean-near.glb': [NEAR_WOOD, FOOT],
  // The sentinel's mid and far files carried its whole 13,000-triangle wood; they come down with it. Its wood is
  // mostly open rims and stops near 8,000 within the error ceiling at every level.
  'verdant-sentinel-near.glb': [NEAR_WOOD, FOOT], 'verdant-sentinel-mid.glb': [NEAR_WOOD, FOOT], 'verdant-sentinel-far.glb': [NEAR_WOOD, FOOT],
};
/** Height bands whose widest vertex is kept, so the wood's radius at every height stays put. */
const BANDS = 128;
/**
 * Error ceiling for the collapse, relative to the wood's extent (meshoptimizer's combined position and attribute
 * error): the simplifier stops there even short of its target. The geometric deviation is measured independently.
 */
const MAX_ERROR = 0.02;
/** Attribute weights: normal xyz, uv. */
const WEIGHTS = [0.5, 0.5, 0.5, 1, 1];

await MeshoptSimplifier.ready;
await MeshoptDecoder.ready;

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

/** Every buffer view's raw (decoded) bytes, by view index. */
function decodeViews(json, bin) {
  return json.bufferViews.map((view, index) => {
    const meshopt = view.extensions?.[MESHOPT_EXT];
    if (!meshopt) {
      if ((view.buffer ?? 0) !== 0) throw new Error(`buffer view ${index} lives outside the GLB`);
      return Buffer.from(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
    }
    if ((meshopt.buffer ?? 0) !== 0) throw new Error(`buffer view ${index} compressed outside the GLB`);
    const source = bin.subarray(meshopt.byteOffset ?? 0, (meshopt.byteOffset ?? 0) + meshopt.byteLength);
    const target = new Uint8Array(meshopt.count * meshopt.byteStride);
    MeshoptDecoder.decodeGltfBuffer(target, meshopt.count, meshopt.byteStride, source, meshopt.mode, meshopt.filter);
    return Buffer.from(target.buffer, target.byteOffset, target.byteLength);
  });
}

/** Write every view raw into one buffer, in view order, and drop the compression extension. */
function packRaw(json, views) {
  const parts = [];
  let at = 0;
  for (const [index, view] of json.bufferViews.entries()) {
    const data = views[index], pad = (4 - (at % 4)) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); at += pad; }
    view.buffer = 0; view.byteOffset = at; view.byteLength = data.length;
    if (view.extensions) { delete view.extensions[MESHOPT_EXT]; if (!Object.keys(view.extensions).length) delete view.extensions; }
    parts.push(data); at += data.length;
  }
  const bin = Buffer.concat(parts);
  json.buffers = [{ byteLength: bin.length }];
  json.extensionsUsed = (json.extensionsUsed ?? []).filter((name) => name !== MESHOPT_EXT);
  json.extensionsRequired = (json.extensionsRequired ?? []).filter((name) => name !== MESHOPT_EXT);
  if (!json.extensionsUsed.length) delete json.extensionsUsed;
  if (!json.extensionsRequired.length) delete json.extensionsRequired;
  return bin;
}

const FLOAT = 5126;
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

/** A tightly packed float accessor as a Float32Array copy. */
function floats(json, views, index) {
  const accessor = json.accessors[index], view = json.bufferViews[accessor.bufferView];
  const width = COMPONENTS[accessor.type];
  if (accessor.componentType !== FLOAT || accessor.sparse || (view.byteStride && view.byteStride !== width * 4)) throw new Error(`accessor ${index} is not packed float`);
  const data = views[accessor.bufferView], at = accessor.byteOffset ?? 0;
  return new Float32Array(data.buffer.slice(data.byteOffset + at, data.byteOffset + at + accessor.count * width * 4));
}

function indices(json, views, index) {
  const accessor = json.accessors[index], data = views[json.accessors[index].bufferView], at = accessor.byteOffset ?? 0;
  const bytes = data.buffer.slice(data.byteOffset + at, data.byteOffset + at + accessor.count * (accessor.componentType === 5125 ? 4 : 2));
  return Uint32Array.from(accessor.componentType === 5125 ? new Uint32Array(bytes) : accessor.componentType === 5123 ? new Uint16Array(bytes) : new Uint8Array(bytes));
}

/** Radius in the floor plane below a height, the height, and the foot of a vertex set. */
function measure(positions, used, below) {
  let minY = Infinity, maxY = -Infinity, reach = 0;
  for (const i of used) { const y = positions[i * 3 + 1]; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  let trunk = 0;
  for (const i of used) {
    const r = Math.hypot(positions[i * 3], positions[i * 3 + 2]);
    reach = Math.max(reach, r);
    if (positions[i * 3 + 1] < minY + below * (maxY - minY)) trunk = Math.max(trunk, r);
  }
  return { minY, maxY, reach, trunk };
}

/** Distance from p to triangle abc (Ericson, Real-Time Collision Detection 5.1.5). */
function pointTriangle(p, a, b, c) {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const at = (u, v, w) => [a[0] + u * (b[0] - a[0]) + w * (c[0] - a[0]), a[1] + u * (b[1] - a[1]) + w * (c[1] - a[1]), a[2] + u * (b[2] - a[2]) + w * (c[2] - a[2])];
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap);
  let q;
  if (d1 <= 0 && d2 <= 0) q = a;
  else {
    const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp), cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
    const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
    if (d3 >= 0 && d4 <= d3) q = b;
    else if (d6 >= 0 && d5 <= d6) q = c;
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) q = at(d1 / (d1 - d3), 0, 0);
    else if (vb <= 0 && d2 >= 0 && d6 <= 0) q = at(0, 0, d2 / (d2 - d6));
    else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); q = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]; }
    else { const den = 1 / (va + vb + vc); q = at(vb * den, 0, vc * den); }
  }
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** How far the original wood's vertices lie from the simplified surface: largest and mean, in model units. */
function deviation(positions, original, simplified) {
  const point = (i) => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
  const cell = 0.25, grid = new Map(), key = (x, y, z) => `${x},${y},${z}`;
  for (let t = 0; t < simplified.length; t += 3) {
    const corners = [point(simplified[t]), point(simplified[t + 1]), point(simplified[t + 2])];
    const lo = [0, 1, 2].map((c) => Math.floor(Math.min(...corners.map((p) => p[c])) / cell));
    const hi = [0, 1, 2].map((c) => Math.floor(Math.max(...corners.map((p) => p[c])) / cell));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      const k = key(x, y, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t);
    }
  }
  let max = 0, sum = 0, n = 0;
  for (const i of new Set(original)) {
    const p = point(i), home = p.map((v) => Math.floor(v / cell));
    let best = Infinity;
    // Search outward ring by ring until no nearer triangle can exist.
    for (let r = 0; r < 64 && best > (r - 1) * cell; r++) {
      for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) {
        if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== r) continue;
        for (const t of grid.get(key(home[0] + x, home[1] + y, home[2] + z)) ?? []) {
          best = Math.min(best, pointTriangle(p, point(simplified[t]), point(simplified[t + 1]), point(simplified[t + 2])));
        }
      }
    }
    max = Math.max(max, best); sum += best; n++;
  }
  return { max, mean: sum / n };
}

function rebalance(file, [target, base]) {
  const full = path.join(folder, file), original = fs.readFileSync(full);
  const { json, bin } = readGlb(original);
  const node = json.nodes.find((n) => Number.isInteger(n.mesh) && n.name?.toLowerCase().includes('wood'));
  if (!node || node.matrix || node.rotation || node.scale || node.translation) throw new Error(`${file}: no untransformed Wood node`);
  const mesh = json.meshes[node.mesh];
  if (mesh.primitives.length !== 1) throw new Error(`${file}: Wood must be one primitive`);
  const primitive = mesh.primitives[0];
  const before = json.accessors[primitive.indices].count / 3;
  if (mesh.extras?.tervainRebalancedWood) return { file, before, after: before, note: 'already rebalanced' };
  if (before <= target) return { file, before, after: before, note: 'already within target' };
  const views = decodeViews(json, bin);
  // Each of the Wood's accessors must own its view, so rewriting them touches nothing else.
  const own = [primitive.indices, ...Object.values(primitive.attributes)];
  for (const index of own) {
    const viewIndex = json.accessors[index].bufferView;
    if (json.accessors.some((a, i) => a.bufferView === viewIndex && i !== index)) throw new Error(`${file}: Wood accessor ${index} shares its view`);
  }
  const positions = floats(json, views, primitive.attributes.POSITION);
  const normals = floats(json, views, primitive.attributes.NORMAL);
  const uvs = floats(json, views, primitive.attributes.TEXCOORD_0);
  const source = indices(json, views, primitive.indices);
  const count = positions.length / 3;
  const all = new Set(source);
  const was = measure(positions, all, 0.2);
  const lock = new Uint8Array(count);
  const footTop = was.minY + base * (was.maxY - was.minY);
  const remap = MeshoptSimplifier.generatePositionRemap(positions, 3);
  // The radial silhouette: in each height band, the vertex furthest from the axis; and the topmost and lowest vertex.
  const widest = new Int32Array(BANDS).fill(-1), radius = (i) => Math.hypot(positions[i * 3], positions[i * 3 + 2]);
  let top = -1, foot = -1, locked = 0;
  for (const i of all) {
    if (positions[i * 3 + 1] <= footTop) lock[remap[i]] = 1;
    if (top < 0 || positions[i * 3 + 1] > positions[top * 3 + 1]) top = i;
    if (foot < 0 || positions[i * 3 + 1] < positions[foot * 3 + 1]) foot = i;
    const band = Math.min(BANDS - 1, Math.floor((positions[i * 3 + 1] - was.minY) / (was.maxY - was.minY) * BANDS));
    if (widest[band] < 0 || radius(i) > radius(widest[band])) widest[band] = i;
  }
  // A locked vertex still vanishes when the vertices around it collapse into each other: these keep their ring too.
  const keys = new Set([top, foot, ...widest].filter((i) => i >= 0).map((i) => remap[i]));
  for (const key of keys) lock[key] = 1;
  for (let t = 0; t < source.length; t += 3) {
    const corners = [remap[source[t]], remap[source[t + 1]], remap[source[t + 2]]];
    if (corners.some((c) => keys.has(c))) for (const c of corners) lock[c] = 1;
  }
  // Every vertex sharing a locked position (split along a UV seam or normal crease) is locked with it.
  for (let i = 0; i < count; i++) lock[i] = lock[remap[i]];
  for (const i of all) locked += lock[i];
  const attributes = new Float32Array(count * 5);
  for (let i = 0; i < count; i++) attributes.set([normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2], uvs[i * 2], uvs[i * 2 + 1]], i * 5);
  const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(source, positions, 3, attributes, 5, WEIGHTS, lock,
    target * 3, MAX_ERROR, []);
  const after = simplified.length / 3;
  // Compact: keep the used vertices, in their original order.
  const keptOld = Uint32Array.from(new Set(simplified)).sort(), kept = keptOld.length, renumber = new Map();
  keptOld.forEach((old, v) => renumber.set(old, v));
  const compactIndices = simplified.map((old) => renumber.get(old));
  const now = measure(positions, keptOld, 0.2), off = deviation(positions, source, simplified);
  // The game takes the trunk radius below a height that depends on the species' scale: check it at several.
  for (const below of [0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 1]) {
    const a = measure(positions, all, below).trunk, b = measure(positions, keptOld, below).trunk;
    if (Math.abs(a - b) > a * 0.01) throw new Error(`${file}: wood radius below ${below * 100} % of its height moved ${a} -> ${b}`);
  }
  if (Math.abs(now.maxY - was.maxY) > (was.maxY - was.minY) * 0.01) throw new Error(`${file}: wood height moved`);
  if (now.minY !== was.minY) throw new Error(`${file}: wood foot moved`);
  // Rewrite each wood accessor with only the kept vertices.
  for (const [semantic, index] of Object.entries(primitive.attributes)) {
    const accessor = json.accessors[index], width = COMPONENTS[accessor.type];
    if (accessor.componentType !== FLOAT) throw new Error(`${file}: Wood ${semantic} is not float`);
    const data = floats(json, views, index), out = new Float32Array(kept * width);
    for (let v = 0; v < kept; v++) for (let c = 0; c < width; c++) out[v * width + c] = data[keptOld[v] * width + c];
    views[accessor.bufferView] = Buffer.from(out.buffer);
    delete accessor.byteOffset; accessor.count = kept;
    if (accessor.min || accessor.max) {
      accessor.min = Array(width).fill(Infinity); accessor.max = Array(width).fill(-Infinity);
      for (let v = 0; v < kept; v++) for (let c = 0; c < width; c++) {
        accessor.min[c] = Math.min(accessor.min[c], out[v * width + c]); accessor.max[c] = Math.max(accessor.max[c], out[v * width + c]);
      }
    }
  }
  const indexAccessor = json.accessors[primitive.indices];
  const short = kept <= 65535;
  views[indexAccessor.bufferView] = Buffer.from((short ? Uint16Array.from(compactIndices) : Uint32Array.from(compactIndices)).buffer);
  delete indexAccessor.byteOffset; indexAccessor.count = compactIndices.length; indexAccessor.componentType = short ? 5123 : 5125;
  mesh.extras = { ...mesh.extras, tervainRebalancedWood: { tool: 'tools/rebalance-tree-wood.mjs', sourceTriangles: before, triangles: after } };
  const imagesBefore = (json.images ?? []).map((image) => views[image.bufferView]);
  const out = writeGlb(json, packRaw(json, views));
  // Proof: images and every non-wood accessor are byte for byte as they were.
  const check = readGlb(out), checkViews = decodeViews(check.json, check.bin), origViews = decodeViews(readGlb(original).json, readGlb(original).bin);
  (check.json.images ?? []).forEach((image, i) => { if (!checkViews[image.bufferView].equals(imagesBefore[i]) || !origViews[image.bufferView].equals(imagesBefore[i])) throw new Error(`${file}: image ${i} changed`); });
  check.json.accessors.forEach((accessor, i) => { if (!own.includes(i) && !checkViews[accessor.bufferView].equals(origViews[accessor.bufferView])) throw new Error(`${file}: accessor ${i} changed`); });
  if (!dry) fs.writeFileSync(full, out);
  return { file, before, after, verticesBefore: all.size, verticesAfter: kept, locked, error: error * MeshoptSimplifier.getScale(positions, 3), off,
    relativeError: error, trunk: [was.trunk, now.trunk], height: [was.maxY - was.minY, now.maxY - now.minY] };
}

const changed = [];
for (const [file, target] of Object.entries(TARGETS)) {
  const result = rebalance(file, target);
  if (result.after !== result.before) changed.push(file);
  console.log(result.note ? `${file}: ${result.before} wood triangles, ${result.note}`
    : `${file}: wood ${result.before} -> ${result.after} triangles, ${result.verticesBefore} -> ${result.verticesAfter} vertices (${result.locked} locked); `
      + `error ${result.error.toFixed(4)} (${(result.relativeError * 100).toFixed(2)} %), surface deviation max ${result.off.max.toFixed(4)} mean ${result.off.mean.toFixed(4)}; trunk radius ${result.trunk.map((v) => v.toFixed(4)).join(' -> ')}; `
      + `height ${result.height.map((v) => v.toFixed(4)).join(' -> ')}`);
}
if (changed.length && !dry) console.log(`Now run: node tools/optimise-models.mjs --geometry ${changed.map((f) => `flora/meshy-012/${f}`).join(' ')} && node tools/model-files.mjs`);
