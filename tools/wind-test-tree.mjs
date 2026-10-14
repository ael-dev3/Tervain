#!/usr/bin/env node
/**
 * A synthetic tree for testing the branch-wise wind and the baked crown light (src/presentation/foliage), before the hero
 * tree generators land. Writes public/debug/wind-test-tree.glb: a trunk, 6 limbs, their boughs and twigs, and a leaf
 * card cluster on every twig tip, carrying what a hero tree carries:
 *
 *   _WIND   vec4  x branch level (0 trunk .. 1 twig tip), y the limb's own phase (0..2pi), z its parent's phase,
 *                 w leaf flutter weight (0 wood, 1 cards)
 *   _PIVOT  vec3  where the vertex's branch segment grows from (a card's twig tip), in tree space
 *   COLOR_0 vec3  (leaf only) R crown occlusion 0 in the heart .. 1 on the rim, G thickness
 *
 * Two meshes in one file: node "wood" and node "leaf" (the leaf material takes its atlas at run time).
 * Loaded by the game only behind ?windtest=1 (src/presentation/foliage/windTestTree.ts).
 *
 *   node tools/wind-test-tree.mjs [out.glb]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'debug', 'wind-test-tree.glb');
let seed = 20261014;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const TAU = Math.PI * 2;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / (len(a) || 1));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const wood = { pos: [], nor: [], uv: [], wind: [], pivot: [], idx: [] };
const leaf = { pos: [], nor: [], uv: [], wind: [], pivot: [], col: [], idx: [] };
const cards = [];

/** A tapered tube from a to b in `rings` rings, every vertex carrying the branch data. */
function tube(a, b, ra, rb, rings, data) {
  const axis = norm(sub(b, a));
  const side = norm(cross(axis, Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const up = cross(axis, side);
  const sides = 7, base = wood.pos.length / 3;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings, c = add(a, mul(sub(b, a), t)), rad = ra + (rb - ra) * t;
    for (let s = 0; s <= sides; s++) {
      const ang = (s / sides) * TAU, n = add(mul(side, Math.cos(ang)), mul(up, Math.sin(ang)));
      wood.pos.push(...add(c, mul(n, rad))); wood.nor.push(...n); wood.uv.push(s / sides, t * len(sub(b, a)) / 2);
      wood.wind.push(...data.wind); wood.pivot.push(...data.pivot);
    }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < sides; s++) {
    const i = base + r * (sides + 1) + s, j = i + sides + 1;
    wood.idx.push(i, j, i + 1, i + 1, j, j + 1);
  }
}

const CROWN = { centre: [0, 6.6, 0], radius: 4.2 };
const dirOf = (yaw, pitch) => [Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch)];

/** A card cluster: three crossed quads at the twig tip. */
function cluster(tip, dir, phase, parentPhase) {
  const d = len(sub(tip, CROWN.centre)) / CROWN.radius;
  const rim = Math.min(1, Math.max(0, d)) ** 0.9;
  const thick = 0.25 + 0.7 * Math.max(0, 1 - d * 0.9);
  const size = 1.0 + rnd() * 0.5;
  const centre = add(tip, mul(dir, size * 0.35));
  for (let k = 0; k < 3; k++) {
    const yaw = (k / 3) * Math.PI + rnd() * 0.5, tilt = (rnd() - 0.5) * 0.9;
    const u = norm([Math.cos(yaw), tilt * 0.5, Math.sin(yaw)]);
    const v = norm(cross(u, norm(add(dir, [0, 0.3, 0]))));
    const n = norm(cross(u, v));
    const base = leaf.pos.length / 3;
    const cell = Math.floor(rnd() * 4), cu = (cell % 2) * 0.5, cv = Math.floor(cell / 2) * 0.5;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, y]) => {
      leaf.pos.push(...add(centre, add(mul(u, x * size * 0.5), mul(v, y * size * 0.5))));
      leaf.nor.push(...n);
      leaf.uv.push(cu + (x + 1) * 0.25, cv + (y + 1) * 0.25);
      leaf.wind.push(1, phase, parentPhase, 1);
      leaf.pivot.push(...tip);
      leaf.col.push(rim, thick, 0);
    });
    leaf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  cards.push(centre);
}

// The trunk: a gentle curve in 6 rings, no pivot (level 0 bends as a cantilever).
const trunkTop = [0.25, 4.4, 0.1];
tube([0, -0.15, 0], trunkTop, 0.42, 0.2, 8, { wind: [0, 0, 0, 0], pivot: [0, 0, 0] });
for (let l = 0; l < 6; l++) {
  const yaw = (l / 6) * TAU + rnd() * 0.5, ph = rnd() * TAU;
  const baseL = add([0.25 * (2.4 + l * 0.3) / 4.4, 2.4 + l * 0.35, 0.1], [0, 0, 0]);
  const dl = dirOf(yaw, 0.5 + rnd() * 0.25), lenL = 2.8 + rnd() * 0.8;
  const tipL = add(baseL, mul(dl, lenL));
  tube(baseL, tipL, 0.17, 0.08, 3, { wind: [0.3, ph, 0, 0], pivot: baseL });
  for (let b = 0; b < 4; b++) {
    const t = 0.4 + b * 0.18, baseB = add(baseL, mul(sub(tipL, baseL), t));
    const pb = rnd() * TAU, db = norm(add(dirOf(yaw + (b - 1.5) * 0.8 + (rnd() - 0.5) * 0.4, 0.35 + rnd() * 0.3), mul(dl, 0.4))), lenB = 1.7 + rnd();
    const tipB = add(baseB, mul(db, lenB));
    tube(baseB, tipB, 0.07, 0.035, 2, { wind: [0.55, pb, ph, 0], pivot: baseB });
    for (let w = 0; w < 4; w++) {
      const tw = 0.5 + w * 0.25, baseT = add(baseB, mul(sub(tipB, baseB), tw));
      const pt = rnd() * TAU, dt = norm(add(dirOf(yaw + (w - 1.5) * 0.9 + (rnd() - 0.5) * 0.6, 0.2 + rnd() * 0.5), mul(db, 0.5))), lenT = 0.8 + rnd() * 0.5;
      const tipT = add(baseT, mul(dt, lenT));
      tube(baseT, tipT, 0.03, 0.012, 1, { wind: [0.85, pt, pb, 0], pivot: baseT });
      cluster(tipT, dt, pt, pb);
    }
  }
}

/* ---- GLB packing ---- */
const chunks = [];
const views = [], accessors = [];
function bufferOf(array, Type) { return Buffer.from(new Type(array).buffer); }
function accessor(array, Type, ctype, kind, target, withBounds) {
  const buf = bufferOf(array, Type);
  const pad = (4 - (buf.length % 4)) % 4;
  const offset = chunks.reduce((n, c) => n + c.length, 0);
  chunks.push(Buffer.concat([buf, Buffer.alloc(pad)]));
  views.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, ...(target ? { target } : {}) });
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[kind];
  const a = { bufferView: views.length - 1, componentType: ctype, count: array.length / comps, type: kind };
  if (withBounds) {
    const min = Array(comps).fill(Infinity), max = Array(comps).fill(-Infinity);
    for (let i = 0; i < array.length; i++) { min[i % comps] = Math.min(min[i % comps], array[i]); max[i % comps] = Math.max(max[i % comps], array[i]); }
    a.min = min; a.max = max;
  }
  accessors.push(a);
  return accessors.length - 1;
}
const F = 5126, U = 5125;
function primitive(m, material, hasColour) {
  const attributes = {
    POSITION: accessor(m.pos, Float32Array, F, 'VEC3', 34962, true),
    NORMAL: accessor(m.nor, Float32Array, F, 'VEC3', 34962),
    TEXCOORD_0: accessor(m.uv, Float32Array, F, 'VEC2', 34962),
    _WIND: accessor(m.wind, Float32Array, F, 'VEC4', 34962),
    _PIVOT: accessor(m.pivot, Float32Array, F, 'VEC3', 34962),
  };
  if (hasColour) attributes.COLOR_0 = accessor(m.col, Float32Array, F, 'VEC3', 34962);
  return { attributes, indices: accessor(m.idx, Uint32Array, U, 'SCALAR', 34963), material };
}
const gltf = {
  asset: { version: '2.0', generator: 'tervain tools/wind-test-tree.mjs' },
  scene: 0, scenes: [{ nodes: [0, 1] }],
  nodes: [{ name: 'wood', mesh: 0 }, { name: 'leaf', mesh: 1 }],
  materials: [
    { name: 'wood', pbrMetallicRoughness: { baseColorFactor: [0.32, 0.22, 0.14, 1], metallicFactor: 0, roughnessFactor: 0.9 } },
    { name: 'leaf', alphaMode: 'MASK', alphaCutoff: 0.5, doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.3, 0.45, 0.16, 1], metallicFactor: 0, roughnessFactor: 0.85 } },
  ],
  meshes: [{ name: 'wood', primitives: [primitive(wood, 0, false)] }, { name: 'leaf', primitives: [primitive(leaf, 1, true)] }],
  accessors, bufferViews: views,
};
const bin = Buffer.concat(chunks);
gltf.buffers = [{ byteLength: bin.length }];
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const head = Buffer.alloc(12);
head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const ch = (type, data) => { const h = Buffer.alloc(8); h.writeUInt32LE(data.length, 0); h.writeUInt32LE(type, 4); return Buffer.concat([h, data]); };
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([head, ch(0x4e4f534a, json), ch(0x004e4942, bin)]));
console.log(`${out}: wood ${wood.idx.length / 3} tris, leaf ${leaf.idx.length / 3} tris, ${cards.length} clusters`);
