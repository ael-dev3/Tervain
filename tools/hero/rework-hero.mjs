#!/usr/bin/env node
/**
 * Put the wanderer's Meshy 7.1 body on his rig: node tools/hero/rework-hero.mjs <hero-01a120c8.glb>
 *
 * The source is the Meshy multi-image-to-3D result (meshy-7.1, 2k geometry, 4k PBR, A-pose, task
 * 01a120c8-22b6-72d4-8c60-2b2451b7edfd), generated on 9 October 2026 under Meshy Pro from front, side and back renders of
 * the previous wanderer in his bind pose. It is not in the repository (31 MB); its SHA-256 is checked below. The rig
 * comes from the A45 animated hero kept for audit (public/models/hero/weathered-wanderer-animated-hero.glb): its 66 joints,
 * inverse binds, hierarchy and six clips are copied unchanged, and its own authored skin weights are the ones transferred.
 *
 *  1. Align: scaled to the rig's 1.899 m, soles at y = 0, facing +z, centred, then nudged across the floor onto the old
 *     surface (translation only) and checked joint by joint against the bind skeleton.
 *  2. Reduce with MeshoptSimplifier to at most 150,000 triangles. UV and normal seams stay locked (no Permissive flag);
 *     normals ride along as attributes. Pairs of triangles a collapse folded back to back are dropped, so the surface
 *     stays closed (every edge between exactly two triangles).
 *  3. Skin: every new vertex takes the weights of the closest point of the old skinned surface in bind pose (faces
 *     turned away count from 3 cm further), interpolated across that triangle's corners; copies of one position share
 *     one set; two light smoothing passes along the surface. Hands are skinned from their bones instead (the old hand
 *     weights are sparse and erratic, and the finger chains sit off the fingers): each finger by its band across the
 *     hand, each phalange by its depth down the hand, the thumb as the piece that parts from the hand. The skull is held
 *     rigid on the Head joint above the jaw. Four influences. (The boots keep the A45 source's own share of shin weight
 *     in the sole, which its Dead clip and foot planting were authored with.)
 *  4. Write public/models/hero/weathered-wanderer-hero-sealed.glb: the rig's JSON (nodes, skin, clips) with this mesh,
 *     colour 2048 px WebP, normal 2048 px JPEG and metal-roughness JPEG with a 0.7 roughness floor (images via Pillow,
 *     as sharp is optional), then `node tools/optimise-models.mjs --geometry` and `node tools/model-files.mjs`.
 *     Afterwards `node tools/hero/record.mjs` records the new hash in the model ledger.
 *
 * --dry stops before writing anything, after the alignment, reduction and weight reports.
 * Deterministic for a given source. Requires python with Pillow for the images.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RIG = path.join(root, 'public/models/hero/weathered-wanderer-animated-hero.glb');
const OUT_REL = 'hero/weathered-wanderer-hero-sealed.glb';
const OUT = path.join(root, 'public/models', OUT_REL);
const SOURCE = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const DRY = process.argv.includes('--dry');
const SOURCE_SHA256 = '04c507511c15e0db71ef87b24573a8969e18853ba2172d6dca65b9bc591886eb';
const MAX_TRIANGLES = 150000;
const HEIGHT = 1.899;
const ROUGHNESS_FLOOR = 0.7;
const CELL = 0.02;
const TURNED_AWAY = 0.03;
const SMOOTHING = [0.3, 0.3];
const INFLUENCES = 4;
const KNUCKLE_BLEND = Number(process.env.KNUCKLE_BLEND ?? 0.014);

await MeshoptSimplifier.ready;
await MeshoptDecoder.ready;

// ---------------------------------------------------------------------------------------------------------------- GLB io
const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readGlb(file) {
  const bytes = fs.readFileSync(file);
  let json, bin;
  for (let at = 12; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(at), kind = bytes.readUInt32LE(at + 4);
    const chunk = bytes.subarray(at + 8, at + 8 + length);
    if (kind === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    else if (kind === 0x004e4942) bin = chunk;
    at += 8 + length;
  }
  return { json, bin, bytes };
}

/** A buffer view's bytes, decoding EXT_meshopt_compression. */
function viewBytes(glb, index) {
  const view = glb.json.bufferViews[index];
  const meshopt = view.extensions?.EXT_meshopt_compression;
  if (meshopt) {
    const out = new Uint8Array(meshopt.count * meshopt.byteStride);
    const at = meshopt.byteOffset ?? 0;
    MeshoptDecoder.decodeGltfBuffer(out, meshopt.count, meshopt.byteStride, glb.bin.subarray(at, at + meshopt.byteLength), meshopt.mode, meshopt.filter);
    return Buffer.from(out.buffer, 0, view.byteLength);
  }
  return glb.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}

function accessor(glb, index) {
  const acc = glb.json.accessors[index];
  const Type = COMP[acc.componentType], n = SIZE[acc.type];
  const copy = new Uint8Array(acc.count * n * Type.BYTES_PER_ELEMENT);
  copy.set(viewBytes(glb, acc.bufferView).subarray(acc.byteOffset ?? 0, (acc.byteOffset ?? 0) + copy.length));
  return new Type(copy.buffer, 0, acc.count * n);
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

// ------------------------------------------------------------------------------------------------------- small vectors
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const at3 = (array, i) => [array[i * 3], array[i * 3 + 1], array[i * 3 + 2]];
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pct = (values, p) => { const s = Float64Array.from(values).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mm = (m) => `${(m * 1000).toFixed(1)} mm`;

/** Closest point of triangle abc to p, with barycentric weights (Ericson, Real-Time Collision Detection 5.1.5). */
function closestOnTriangle(p, a, b, c) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return [1, 0, 0];
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return [0, 1, 0];
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [1 - v, v, 0]; }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return [0, 0, 1];
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [1 - w, 0, w]; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [0, 1 - w, w]; }
  const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom;
  return [1 - v - w, v, w];
}

/** Triangles binned in a uniform grid, answering "closest surface point" queries with an optional facing penalty. */
class Surface {
  constructor(positions, indices) {
    this.positions = positions; this.indices = indices;
    const count = indices.length / 3;
    this.normals = new Float64Array(count * 3);
    this.grid = new Map();
    for (let t = 0; t < count; t++) {
      const a = at3(positions, indices[t * 3]), b = at3(positions, indices[t * 3 + 1]), c = at3(positions, indices[t * 3 + 2]);
      const ab = sub(b, a), ac = sub(c, a);
      const n = norm([ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]);
      this.normals.set(n, t * 3);
      const lo = [0, 1, 2].map((k) => Math.floor(Math.min(a[k], b[k], c[k]) / CELL));
      const hi = [0, 1, 2].map((k) => Math.floor(Math.max(a[k], b[k], c[k]) / CELL));
      for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
        const key = `${x},${y},${z}`;
        let list = this.grid.get(key);
        if (!list) this.grid.set(key, list = []);
        list.push(t);
      }
    }
  }

  /** { triangle, bary, distance } of the best-scoring triangle; `normal` (optional) adds the turned-away penalty. */
  closest(p, normal) {
    const cell = p.map((v) => Math.floor(v / CELL));
    let best = null;
    const seen = new Set();
    for (let reach = 1; reach <= 64; reach *= 2) {
      for (let x = -reach; x <= reach; x++) for (let y = -reach; y <= reach; y++) for (let z = -reach; z <= reach; z++) {
        const list = this.grid.get(`${cell[0] + x},${cell[1] + y},${cell[2] + z}`);
        if (!list) continue;
        for (const t of list) {
          if (seen.has(t)) continue;
          seen.add(t);
          const ia = this.indices[t * 3], ib = this.indices[t * 3 + 1], ic = this.indices[t * 3 + 2];
          const a = at3(this.positions, ia), b = at3(this.positions, ib), c = at3(this.positions, ic);
          const bary = closestOnTriangle(p, a, b, c);
          const q = [0, 1, 2].map((k) => bary[0] * a[k] + bary[1] * b[k] + bary[2] * c[k]);
          const distance = len(sub(p, q));
          const score = distance + (normal && dot(at3(this.normals, t), normal) < 0.2 ? TURNED_AWAY : 0);
          if (!best || score < best.score) best = { triangle: t, bary, distance, score, point: q };
        }
      }
      // Everything within `reach` cells is searched; stop once the best lies inside that radius (plus the penalty).
      if (best && best.score <= (reach - 1) * CELL) break;
    }
    return best;
  }
}

// ------------------------------------------------------------------------------------------------------------- inputs
if (!SOURCE) throw new Error('usage: node tools/hero/rework-hero.mjs <path to hero-01a120c8.glb>');
const sourceBytes = fs.readFileSync(SOURCE);
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
if (sourceHash !== SOURCE_SHA256) throw new Error(`source SHA-256 ${sourceHash} is not the recorded Meshy result`);
const source = readGlb(SOURCE);
const rig = readGlb(RIG);
const sp = source.json.meshes[0].primitives[0];
const rp = rig.json.meshes[0].primitives[0];
let pos = Float64Array.from(accessor(source, sp.attributes.POSITION));
let nor = Float64Array.from(accessor(source, sp.attributes.NORMAL));
const uv = accessor(source, sp.attributes.TEXCOORD_0);
const tri = Uint32Array.from(accessor(source, sp.indices));
const rpos = Float64Array.from(accessor(rig, rp.attributes.POSITION));
const rjoints = accessor(rig, rp.attributes.JOINTS_0);
const rweights = accessor(rig, rp.attributes.WEIGHTS_0);
const rtri = Uint32Array.from(accessor(rig, rp.indices));
const jointNames = rig.json.skins[0].joints.map((node) => rig.json.nodes[node].name);
const J = Object.fromEntries(jointNames.map((name, i) => [name.replace('mixamorig:', ''), i]));
const JOINTS = jointNames.length;
const vertexCount = pos.length / 3;
console.log(`source ${path.basename(SOURCE)} ${sourceHash}: ${vertexCount} vertices, ${tri.length / 3} triangles`);

/** Bind position of each joint in mesh space, from its inverse bind matrix (column-major, rigid). */
const ibm = accessor(rig, rig.json.skins[0].inverseBindMatrices);
const jointAt = jointNames.map((_, j) => {
  const m = ibm.subarray(j * 16, j * 16 + 16);
  const scale = m[0] * m[0] + m[1] * m[1] + m[2] * m[2];
  return [0, 1, 2].map((c) => -(m[c * 4] * m[12] + m[c * 4 + 1] * m[13] + m[c * 4 + 2] * m[14]) / scale);
});

// ------------------------------------------------------------------------------------------------------------ 1 align
const rigSurface = new Surface(rpos, rtri);
const bounds = (array) => {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < array.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], array[i + k]); hi[k] = Math.max(hi[k], array[i + k]); }
  return { lo, hi };
};
const rigBounds = bounds(rpos);
{
  const b = bounds(pos);
  const scale = HEIGHT / (b.hi[1] - b.lo[1]);
  const centre = [(b.lo[0] + b.hi[0]) / 2, b.lo[1], (b.lo[2] + b.hi[2]) / 2];
  const target = [(rigBounds.lo[0] + rigBounds.hi[0]) / 2, rigBounds.lo[1], (rigBounds.lo[2] + rigBounds.hi[2]) / 2];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = (pos[i + k] - centre[k]) * scale + target[k];
  console.log(`scale ${scale.toFixed(5)}; soles at mesh y ${target[1].toFixed(5)} (world 0)`);
}
/** Mean / median / 95th distance of a sample of new vertices from the old surface. */
const sampleStep = Math.max(1, Math.floor(vertexCount / 6000));
function fit(label) {
  const distances = [], offsets = [];
  for (let v = 0; v < vertexCount; v += sampleStep) {
    const p = at3(pos, v), hit = rigSurface.closest(p, at3(nor, v));
    distances.push(hit.distance);
    offsets.push(sub(hit.point, p));
  }
  console.log(`${label}: surface gap median ${mm(pct(distances, 0.5))}, 95th ${mm(pct(distances, 0.95))}, max ${mm(Math.max(...distances))}`);
  return { distances, offsets };
}
// Facing: Meshy faces +z, as the rig does; a turned body would sit centimetres off the old surface.
{
  const facing = fit('as delivered');
  const original = Float64Array.from(pos), originalNormals = Float64Array.from(nor);
  const cz = (rigBounds.lo[2] + rigBounds.hi[2]) / 2, cx = (rigBounds.lo[0] + rigBounds.hi[0]) / 2;
  for (let i = 0; i < pos.length; i += 3) { pos[i] = 2 * cx - pos[i]; pos[i + 2] = 2 * cz - pos[i + 2]; nor[i] *= -1; nor[i + 2] *= -1; }
  const back = fit('turned 180 degrees');
  if (pct(back.distances, 0.5) >= pct(facing.distances, 0.5)) { pos = original; nor = originalNormals; }
  else console.log('the source faced -z; turned');
}
// Slide across the floor onto the old surface (x and z only; height and soles are fixed above).
for (let round = 0; round < 4; round++) {
  const { distances, offsets } = fit(`slide ${round}`);
  const limit = pct(distances, 0.8);
  let dx = 0, dz = 0, n = 0;
  offsets.forEach((o, i) => { if (distances[i] <= limit) { dx += o[0]; dz += o[2]; n++; } });
  dx /= n; dz /= n;
  if (Math.hypot(dx, dz) < 1e-4) break;
  for (let i = 0; i < pos.length; i += 3) { pos[i] += dx; pos[i + 2] += dz; }
  console.log(`  moved ${mm(dx)} x, ${mm(dz)} z`);
}
const aligned = fit('aligned');

/**
 * Joint-to-surface fit: where a plane across the bone cuts the surface, the centre of that outline (weighted by its
 * length, so mesh density does not bias it), for the old surface and the new, against the bone line.
 */
function section(array, indices, joint, child, at) {
  const a = jointAt[joint], axis = norm(sub(jointAt[child], a));
  const p = a.map((v, k) => v + (jointAt[child][k] - v) * at);
  let sum = [0, 0, 0], total = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const corners = [0, 1, 2].map((c) => at3(array, indices[t + c]));
    const side = corners.map((q) => dot(sub(q, p), axis));
    const cut = [];
    for (let c = 0; c < 3; c++) {
      const d0 = side[c], d1 = side[(c + 1) % 3];
      if ((d0 < 0) === (d1 < 0)) continue;
      const f = d0 / (d0 - d1), q0 = corners[c], q1 = corners[(c + 1) % 3];
      cut.push(q0.map((v, k) => v + (q1[k] - v) * f));
    }
    if (cut.length !== 2) continue;
    const mid = cut[0].map((v, k) => (v + cut[1][k]) / 2);
    if (len(sub(mid, p)) > 0.085) continue;
    const l = len(sub(cut[0], cut[1]));
    sum = sum.map((v, k) => v + mid[k] * l); total += l;
  }
  if (!total) return null;
  const centre = sum.map((v) => v / total);
  const off = sub(centre, p);
  return { centre, offset: len(off.map((v, k) => v - axis[k] * dot(off, axis))), perimeter: total };
}
const fitReport = [];
for (const [joint, child, at] of [['LeftArm', 'LeftForeArm', 0.5], ['LeftForeArm', 'LeftHand', 0.5], ['LeftForeArm', 'LeftHand', 0.9],
  ['RightArm', 'RightForeArm', 0.5], ['RightForeArm', 'RightHand', 0.5], ['RightForeArm', 'RightHand', 0.9],
  ['LeftUpLeg', 'LeftLeg', 0.5], ['LeftLeg', 'LeftFoot', 0.5], ['RightUpLeg', 'RightLeg', 0.5], ['RightLeg', 'RightFoot', 0.5]]) {
  const old = section(rpos, rtri, J[joint], J[child], at), now = section(pos, tri, J[joint], J[child], at);
  if (!old || !now) continue;
  fitReport.push(`  ${`${joint}@${at}`.padEnd(16)} bone to surface centre: old ${mm(old.offset)}, new ${mm(now.offset)}; centres ${mm(len(sub(now.centre, old.centre)))} apart; outline ${mm(old.perimeter)} -> ${mm(now.perimeter)}`);
}
for (const side of ['Left', 'Right']) {
  const angle = (array) => {
    const indices = array === rpos ? rtri : tri;
    const upper = section(array, indices, J[`${side}Arm`], J[`${side}ForeArm`], 0.5), lower = section(array, indices, J[`${side}ForeArm`], J[`${side}Hand`], 0.9);
    return norm(sub(lower.centre, upper.centre));
  };
  const bones = norm(sub(jointAt[J[`${side}Hand`]], jointAt[J[`${side}Arm`]]));
  const deg = (a, b) => (Math.acos(Math.min(1, dot(a, b))) * 180 / Math.PI).toFixed(1);
  fitReport.push(`  ${side} arm line: old surface ${deg(angle(rpos), bones)} deg from the bones, new ${deg(angle(pos), bones)} deg, old to new ${deg(angle(pos), angle(rpos))} deg`);
}
console.log(['joint-to-surface fit:', ...fitReport].join('\n'));

// --------------------------------------------------------------------------------------------------------- 2 simplify
const positions32 = Float32Array.from(pos);
const attributes = new Float32Array(vertexCount * 3);
for (let i = 0; i < nor.length; i++) attributes[i] = nor[i];
let reduced, error;
for (let target = MAX_TRIANGLES * 3; ; target -= 1500) {
  [reduced, error] = MeshoptSimplifier.simplifyWithAttributes(tri, positions32, 3, attributes, 3, [0.5, 0.5, 0.5], null, target, 1);
  if (reduced.length / 3 <= MAX_TRIANGLES) break;
}
const scaleOf = MeshoptSimplifier.getScale(positions32, 3);
// A collapse can fold a thin sliver into two triangles on the same three points (back to back), which leaves those
// edges shared by four triangles. Dropping both keeps the surface closed.
{
  const pointKey = (v) => `${Math.round(pos[v * 3] / 5e-5)},${Math.round(pos[v * 3 + 1] / 5e-5)},${Math.round(pos[v * 3 + 2] / 5e-5)}`;
  const faceKey = (t) => [0, 1, 2].map((c) => pointKey(reduced[t * 3 + c])).sort().join('|');
  const seen = new Map();
  for (let t = 0; t < reduced.length / 3; t++) seen.set(faceKey(t), (seen.get(faceKey(t)) ?? 0) + 1);
  const keep = [];
  for (let t = 0; t < reduced.length / 3; t++) if (seen.get(faceKey(t)) === 1) keep.push(reduced[t * 3], reduced[t * 3 + 1], reduced[t * 3 + 2]);
  if (keep.length !== reduced.length) console.log(`dropped ${(reduced.length - keep.length) / 3} triangles folded back to back`);
  reduced = Uint32Array.from(keep);
}
const [remap, kept] = MeshoptSimplifier.compactMesh(reduced);
const newPos = new Float32Array(kept * 3), newNor = new Float32Array(kept * 3), newUv = new Float32Array(kept * 2);
for (let v = 0; v < vertexCount; v++) {
  const to = remap[v];
  if (to === 0xffffffff || to >= kept) continue;
  for (let k = 0; k < 3; k++) { newPos[to * 3 + k] = pos[v * 3 + k]; newNor[to * 3 + k] = nor[v * 3 + k]; }
  newUv[to * 2] = uv[v * 2]; newUv[to * 2 + 1] = uv[v * 2 + 1];
}
for (let i = 0; i < newNor.length; i += 3) {
  const l = Math.hypot(newNor[i], newNor[i + 1], newNor[i + 2]) || 1;
  newNor[i] /= l; newNor[i + 1] /= l; newNor[i + 2] /= l;
}
const triangles = reduced.length / 3;
console.log(`simplified ${tri.length / 3} -> ${triangles} triangles, ${kept} vertices; error ${(error * 100).toFixed(3)}% of extent = ${mm(error * scaleOf)}`);

// -------------------------------------------------------------------------------------------------------- 3 weights
const dense = new Float64Array((rpos.length / 3) * JOINTS);
for (let v = 0; v < rpos.length / 3; v++) for (let k = 0; k < 4; k++) dense[v * JOINTS + rjoints[v * 4 + k]] += rweights[v * 4 + k];
const weights = new Float64Array(kept * JOINTS);
const gaps = new Float64Array(kept);
for (let v = 0; v < kept; v++) {
  const hit = rigSurface.closest(at3(newPos, v), at3(newNor, v));
  gaps[v] = hit.distance;
  for (let c = 0; c < 3; c++) {
    const from = rtri[hit.triangle * 3 + c] * JOINTS;
    for (let j = 0; j < JOINTS; j++) weights[v * JOINTS + j] += hit.bary[c] * dense[from + j];
  }
}
console.log(`weight transfer: surface gap median ${mm(pct(gaps, 0.5))}, 95th ${mm(pct(gaps, 0.95))}, max ${mm(Math.max(...gaps))}`);

const FINGERS = ['Thumb', 'Middle', 'Ring', 'Pinky'];
const ARM = (side) => ['Shoulder', 'Arm', 'ForeArm', 'Hand'].map((part) => J[`${side}${part}`])
  .concat(FINGERS.flatMap((f) => [1, 2, 3, 4].map((k) => J[`${side}Hand${f}${k}`])))
  .concat(side === 'Left' ? [J.Bone_034, J.Bone_033, J.Bone_024, J.Bone_023] : [J.Bone_038, J.Bone_037, J.Bone_029, J.Bone_028]);

/**
 * Hands, from their bones. Both meshes hang the fingers together and the rig's finger chains sit up to 3 cm off them
 * across the palm (along the axis the fingers curl about, so a pivot moved that way bends them the same). Each finger
 * vertex therefore takes its chain from its band across the hand (index and middle finger -> Middle, ring -> Ring,
 * little -> Pinky; this rig has no index chain) and its phalange from how far down the hand it lies, blended over 8 mm
 * at each knuckle. The thumb is the piece that parts from the hand below its crotch, found on the mesh; the ball of the
 * thumb shares into Thumb1 by distance. Up the wrist the result blends into the transferred weights.
 */
// Copies of one position (UV and normal seams) are one point of the surface.
const key = (v) => `${Math.round(newPos[v * 3] / 5e-5)},${Math.round(newPos[v * 3 + 1] / 5e-5)},${Math.round(newPos[v * 3 + 2] / 5e-5)}`;
const weldOf = new Map(), weld = new Uint32Array(kept);
for (let v = 0; v < kept; v++) { const k = key(v); if (!weldOf.has(k)) weldOf.set(k, weldOf.size); weld[v] = weldOf.get(k); }
const welded = weldOf.size;
const handReport = [];
/** Neighbours of each welded position along the surface. */
const neighbours = (() => {
  const lists = Array.from({ length: welded }, () => new Set());
  for (let t = 0; t < triangles; t++) for (let c = 0; c < 3; c++) {
    const a = weld[reduced[t * 3 + c]], b = weld[reduced[t * 3 + (c + 1) % 3]];
    if (a !== b) { lists[a].add(b); lists[b].add(a); }
  }
  return lists;
})();
for (const side of ['Left', 'Right']) {
  const joint = (name) => jointAt[J[`${side}${name}`]];
  const hand = joint('Hand');
  const mean = (names) => [0, 1, 2].map((k) => names.reduce((total, name) => total + joint(name)[k], 0) / names.length);
  const along = norm(sub(mean(['HandMiddle4', 'HandRing4', 'HandPinky4']), mean(['HandMiddle1', 'HandRing1', 'HandPinky1'])));
  let across = sub(joint('HandMiddle1'), joint('HandPinky1'));
  across = norm(across.map((v, k) => v - along[k] * dot(across, along)));
  const local = (p) => { const d = sub(p, hand); return { s: dot(d, along), a: dot(d, across) }; };
  const armJoints = new Set(ARM(side));
  const region = [];
  for (let v = 0; v < kept; v++) {
    const p = at3(newPos, v);
    if (len(sub(p, hand)) > 0.25 || local(p).s < -0.04) continue;
    let arm = 0;
    for (const j of armJoints) arm += weights[v * JOINTS + j];
    if (arm >= 0.5) region.push(v);
  }
  // The thumb: below the crotch, the connected piece nearest the thumb chain.
  const thumbTip = joint('HandThumb4');
  let thumb = new Set(), crotch = 0;
  for (let cut = 0.06; cut <= 0.14 && !thumb.size; cut += 0.005) {
    const members = region.filter((v) => local(at3(newPos, v)).s > cut);
    const inside = new Set(members.map((v) => weld[v]));
    const pieceOf = new Map(), pieces = [];
    for (const start of inside) {
      if (pieceOf.has(start)) continue;
      const piece = [start];
      pieceOf.set(start, pieces.length);
      for (let i = 0; i < piece.length; i++) for (const u of neighbours[piece[i]]) {
        if (inside.has(u) && !pieceOf.has(u)) { pieceOf.set(u, pieces.length); piece.push(u); }
      }
      pieces.push([]);
    }
    for (const v of members) pieces[pieceOf.get(weld[v])].push(v);
    const big = pieces.filter((piece) => piece.length > 40);
    if (big.length < 2) continue;
    const centre = (piece) => [0, 1, 2].map((k) => piece.reduce((total, v) => total + newPos[v * 3 + k], 0) / piece.length);
    big.sort((x, y) => len(sub(centre(x), thumbTip)) - len(sub(centre(y), thumbTip)));
    if (big[0].length < big[1].length) { thumb = new Set(big[0]); crotch = cut; }
  }
  if (!thumb.size) throw new Error(`${side} thumb not found`);
  const thumbPoints = [...thumb].map((v) => at3(newPos, v));
  // Finger bands across the hand, from the vertices below the knuckles that are not the thumb.
  const knuckle = local(joint('HandRing1')).s;
  const fingerA = region.filter((v) => !thumb.has(v) && local(at3(newPos, v)).s > knuckle + 0.02).map((v) => local(at3(newPos, v)).a);
  const aLo = pct(fingerA, 0.02), aHi = pct(fingerA, 0.98), band = (aHi - aLo) / 4;
  // Bands from the little finger (low a) up: Pinky, Ring, Middle (middle finger), Middle (index finger).
  const chainOf = ['Pinky', 'Ring', 'Middle', 'Middle'];
  const chainWeights = (s, owners, joints) => {
    // owners[0] below joints[0], owners[i] from joints[i - 1]; blended over KNUCKLE_BLEND about each boundary.
    const out = new Map();
    let previous = 1;
    owners.forEach((owner, i) => {
      const next = i < joints.length ? smoothstep(joints[i] - KNUCKLE_BLEND / 2, joints[i] + KNUCKLE_BLEND / 2, s) : 0;
      const w = previous - next;
      if (w > 1e-4) out.set(owner, (out.get(owner) ?? 0) + w);
      previous = next;
    });
    return out;
  };
  // The mesh's digits are longer than the chains: depth down a digit is scaled so its tip meets the chain's tip
  // (joint 4 plus nine tenths of the last phalange).
  const thumbAxis = norm(sub(joint('HandThumb4'), joint('HandThumb1')));
  const thumbAt = [1, 2, 3, 4].map((k) => dot(sub(joint(`HandThumb${k}`), joint('HandThumb1')), thumbAxis));
  const thumbMeshTip = pct([...thumb].map((v) => dot(sub(at3(newPos, v), joint('HandThumb1')), thumbAxis)), 0.995);
  const thumbScale = (thumbAt[3] + 0.9 * (thumbAt[3] - thumbAt[2])) / thumbMeshTip;
  const fingerAt = (chain) => [1, 2, 3, 4].map((k) => local(joint(`Hand${chain}${k}`)).s);
  const fingerMeshTip = pct(region.filter((v) => !thumb.has(v)).map((v) => local(at3(newPos, v)).s), 0.995);
  const fingerScale = (chain) => {
    const at = fingerAt(chain), tip = at[3] + 0.9 * (at[3] - at[2]);
    return (s) => (s <= at[0] ? s : at[0] + (s - at[0]) * (tip - at[0]) / (fingerMeshTip - at[0]));
  };
  const counts = { thumb: 0, Middle: 0, Ring: 0, Pinky: 0 };
  for (const v of region) {
    const p = at3(newPos, v), { s, a } = local(p);
    const result = new Float64Array(JOINTS);
    // Fingers and palm, by band and depth.
    const position = (a - aLo) / band;
    for (let b = 0; b < 4; b++) {
      const membership = (b === 0 && position < 0.5) || (b === 3 && position > 3.5) ? 1 : Math.max(0, 1 - Math.abs(position - (b + 0.5)));
      if (membership <= 0) continue;
      const chain = chainOf[b];
      const names = [1, 2, 3, 4].map((k) => `${side}Hand${chain}${k}`);
      const owners = [J[`${side}Hand`], ...names.map((n) => J[n])];
      for (const [j, w] of chainWeights(fingerScale(chain)(s), owners, fingerAt(chain))) result[j] += membership * w;
    }
    // The thumb, and the ball of the thumb by distance from it.
    let thumbShare = thumb.has(v) ? 1 : 0;
    if (!thumbShare) {
      let nearest = Infinity;
      for (const q of thumbPoints) nearest = Math.min(nearest, len(sub(p, q)));
      // Fingers beside the thumb, below its crotch, stay fingers.
      thumbShare = s > crotch ? 0 : 1 - smoothstep(0, 0.03, nearest);
    }
    if (thumbShare > 0) {
      const u = dot(sub(p, joint('HandThumb1')), thumbAxis) * thumbScale;
      const owners = [J[`${side}Hand`], ...[1, 2, 3, 4].map((k) => J[`${side}HandThumb${k}`])];
      const tw = chainWeights(u, owners, thumbAt);
      for (let j = 0; j < JOINTS; j++) result[j] *= 1 - thumbShare;
      for (const [j, w] of tw) result[j] += thumbShare * w;
    }
    let total = 0;
    for (let j = 0; j < JOINTS; j++) total += result[j];
    const blend = smoothstep(-0.035, -0.005, s);
    for (let j = 0; j < JOINTS; j++) weights[v * JOINTS + j] = (1 - blend) * weights[v * JOINTS + j] + blend * result[j] / total;
    if (s > knuckle + 0.02) {
      if (thumb.has(v)) counts.thumb++;
      else counts[chainOf[Math.max(0, Math.min(3, Math.floor(position)))]]++;
    }
  }
  handReport.push(`${side} hand: ${region.length} vertices; thumb parts at ${mm(crotch)} down the hand (${thumb.size} vertices); `
    + `thumb scaled ${thumbScale.toFixed(2)}, fingers ${(fingerMeshTip - fingerAt('Middle')[0]).toFixed(3)} m past Middle1; finger band ${mm(aHi - aLo)} wide; below the knuckles thumb ${counts.thumb}, Middle ${counts.Middle}, Ring ${counts.Ring}, Pinky ${counts.Pinky}`);
}
console.log(handReport.join(String.fromCharCode(10)));

// Copies of one position share one set of weights; then light smoothing along the surface.
let shared = new Float64Array(welded * JOINTS);
const copies = new Uint32Array(welded);
for (let v = 0; v < kept; v++) { copies[weld[v]]++; for (let j = 0; j < JOINTS; j++) shared[weld[v] * JOINTS + j] += weights[v * JOINTS + j]; }
for (let w = 0; w < welded; w++) for (let j = 0; j < JOINTS; j++) shared[w * JOINTS + j] /= copies[w];
for (const amount of SMOOTHING) {
  const next = new Float64Array(welded * JOINTS);
  for (let w = 0; w < welded; w++) {
    const around = neighbours[w];
    for (let j = 0; j < JOINTS; j++) {
      let sum = 0;
      for (const u of around) sum += shared[u * JOINTS + j];
      next[w * JOINTS + j] = around.size ? (1 - amount) * shared[w * JOINTS + j] + amount * sum / around.size : shared[w * JOINTS + j];
    }
  }
  shared = next;
}

// The skull: above the jaw everything follows the Head joint rigidly, blended in over 4 cm below.
{
  const head = jointAt[J.Head];
  let held = 0;
  const positionOf = new Float32Array(welded * 3);
  for (let v = 0; v < kept; v++) positionOf.set(at3(newPos, v), weld[v] * 3);
  for (let w = 0; w < welded; w++) {
    const p = at3(positionOf, w);
    if (Math.hypot(p[0] - head[0], p[2] - head[2]) > 0.16) continue;
    const blend = smoothstep(head[1] - 0.02, head[1] + 0.02, p[1]);
    if (!blend || shared[w * JOINTS + J.Head] < 0.4) continue;
    for (let j = 0; j < JOINTS; j++) shared[w * JOINTS + j] *= 1 - blend;
    shared[w * JOINTS + J.Head] += blend;
    held++;
  }
  console.log(`skull: ${held} positions held on the Head joint`);
}

// Four strongest influences, normalised.
const outJoints = new Uint16Array(kept * 4), outWeights = new Float32Array(kept * 4);
const influence = new Float64Array(JOINTS);
for (let w = 0, v = 0; v < kept; v++) {
  w = weld[v];
  const order = [...Array(JOINTS).keys()].sort((a, b) => shared[w * JOINTS + b] - shared[w * JOINTS + a]).slice(0, INFLUENCES);
  let total = 0;
  for (const j of order) total += shared[w * JOINTS + j];
  order.forEach((j, k) => {
    const value = shared[w * JOINTS + j] / total;
    outJoints[v * 4 + k] = value > 1e-6 ? j : 0;
    outWeights[v * 4 + k] = value > 1e-6 ? value : 0;
  });
  let sum = 0;
  for (let k = 0; k < 4; k++) sum += outWeights[v * 4 + k];
  for (let k = 0; k < 4; k++) { outWeights[v * 4 + k] /= sum; influence[outJoints[v * 4 + k]] += outWeights[v * 4 + k]; }
}
console.log('weight by joint:', jointNames.map((n, j) => `${n.replace('mixamorig:', '')} ${influence[j].toFixed(0)}`).filter((s) => !s.endsWith(' 0')).join(', '));

if (DRY) process.exit(0);

// ---------------------------------------------------------------------------------------------------------- 4 images
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tervain-hero-'));
const sourceImage = (textureInfo) => {
  const texture = source.json.textures[textureInfo.index];
  const image = source.json.images[texture.source];
  const file = path.join(tmp, `in-${texture.source}.jpg`);
  fs.writeFileSync(file, viewBytes(source, image.bufferView));
  return file;
};
const material = source.json.materials[0];
const inputs = {
  color: sourceImage(material.pbrMetallicRoughness.baseColorTexture),
  normal: sourceImage(material.normalTexture),
  mr: sourceImage(material.pbrMetallicRoughness.metallicRoughnessTexture),
};
const script = `
import sys
from PIL import Image
color, normal, mr, out, floor = sys.argv[1:6]
floor = round(float(floor) * 255)
def fit(img):
    return img if max(img.size) <= 2048 else img.resize((2048, 2048), Image.Resampling.LANCZOS)
fit(Image.open(color).convert('RGB')).save(out + '/color.webp', 'WEBP', quality=86, method=6)
fit(Image.open(normal).convert('RGB')).save(out + '/normal.jpg', 'JPEG', quality=90, subsampling=0, optimize=True)
r, g, b = fit(Image.open(mr).convert('RGB')).split()
g = g.point(lambda v: max(v, floor))
Image.merge('RGB', (r, g, b)).save(out + '/mr.jpg', 'JPEG', quality=90, subsampling=0, optimize=True)
`;
fs.writeFileSync(path.join(tmp, 'images.py'), script);
execFileSync('python', [path.join(tmp, 'images.py'), inputs.color, inputs.normal, inputs.mr, tmp, String(ROUGHNESS_FLOOR)], { stdio: 'inherit' });
const images = { color: fs.readFileSync(path.join(tmp, 'color.webp')), normal: fs.readFileSync(path.join(tmp, 'normal.jpg')), mr: fs.readFileSync(path.join(tmp, 'mr.jpg')) };
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`images: colour ${images.color.length} B WebP, normal ${images.normal.length} B JPEG, metal-roughness ${images.mr.length} B JPEG`);

// ----------------------------------------------------------------------------------------------------------- 5 write
const json = structuredClone(rig.json);
const replace = new Map();
const asBytes = (data) => Buffer.from(data.buffer, data.byteOffset, data.byteLength);
const attrs = rp.attributes;
const meshData = [[attrs.POSITION, newPos], [attrs.NORMAL, newNor], [attrs.TEXCOORD_0, newUv], [attrs.JOINTS_0, outJoints], [attrs.WEIGHTS_0, outWeights], [rp.indices, reduced]];
for (const [index, data] of meshData) {
  const acc = json.accessors[index];
  if (index === attrs.JOINTS_0) acc.componentType = 5123;
  if (index === rp.indices) acc.componentType = 5125;
  replace.set(acc.bufferView, asBytes(data));
  acc.byteOffset = 0;
  acc.count = data.length / SIZE[acc.type];
}
const pb = bounds(newPos);
json.accessors[attrs.POSITION].min = pb.lo; json.accessors[attrs.POSITION].max = pb.hi;
// Images: the rig's three image slots keep their roles (normal, WebP colour, metal-roughness).
const imageFor = (textureInfo) => json.textures[textureInfo.index].extensions?.EXT_texture_webp?.source ?? json.textures[textureInfo.index].source;
const m = json.materials[rp.material];
const slots = [[imageFor(m.normalTexture), images.normal, 'image/jpeg'], [imageFor(m.pbrMetallicRoughness.baseColorTexture), images.color, 'image/webp'],
  [imageFor(m.pbrMetallicRoughness.metallicRoughnessTexture), images.mr, 'image/jpeg']];
for (const [image, data, mime] of slots) {
  replace.set(json.images[image].bufferView, data);
  json.images[image].mimeType = mime;
}
// Every view in its index order, decoded from meshopt (optimise-models compresses again), mesh and images replaced.
const parts = [];
let offset = 0;
json.bufferViews = rig.json.bufferViews.map((view, index) => {
  const bytes = replace.get(index) ?? viewBytes(rig, index);
  const pad = (4 - (offset % 4)) % 4;
  if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
  const out = { buffer: 0, byteOffset: offset, byteLength: bytes.length };
  if (view.target) out.target = view.target;
  if (view.byteStride) out.byteStride = view.byteStride;
  parts.push(bytes); offset += bytes.length;
  return out;
});
const bin = Buffer.concat(parts);
json.buffers = [{ byteLength: bin.length }];
json.extensionsUsed = (json.extensionsUsed ?? []).filter((e) => e !== 'EXT_meshopt_compression');
json.extensionsRequired = (json.extensionsRequired ?? []).filter((e) => e !== 'EXT_meshopt_compression');
json.meshes[0].name = `Wanderer / Meshy 7.1 mesh, ${triangles.toLocaleString('en-GB')} triangles on the 66-joint rig`;
json.asset = { version: '2.0', generator: 'Tervain tools/hero/rework-hero.mjs' };
fs.writeFileSync(OUT, writeGlb(json, bin));
console.log(`wrote ${path.relative(root, OUT)} ${fs.statSync(OUT).size} B (uncompressed); compressing geometry`);
execFileSync(process.execPath, [path.join(root, 'tools/optimise-models.mjs'), '--geometry', OUT_REL], { stdio: 'inherit', cwd: root });
execFileSync(process.execPath, [path.join(root, 'tools/model-files.mjs')], { stdio: 'inherit', cwd: root });
const final = fs.readFileSync(OUT);
console.log(`${OUT_REL}: ${final.length} B, SHA-256 ${createHash('sha256').update(final).digest('hex')}; ${triangles} triangles, ${kept} vertices`);
