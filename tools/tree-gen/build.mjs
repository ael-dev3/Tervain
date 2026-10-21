#!/usr/bin/env node
/**
 * Offline hero-oak generator: node tools/tree-gen/build.mjs [--seed 1] [--out public/models/flora/hero] [--stats]
 * Also grows birches, bushes and orchard trees: [--species oak|birch|bush|apple|pear] [--name hero-birch] (SPECIES below).
 *
 * Grows a four-level oak skeleton (skeleton.mjs), meshes it as bark-relief tubes with buttress roots and a soil skirt
 * (mesh.mjs), places leaf clusters on the twig ends (leaves.mjs) and writes three GLBs: hero-oak-near / -mid / -far.
 * Original procedural work: no third-party geometry or images. The bark and the placeholder leaf atlas are generated
 * here (bark.mjs, leafAtlas.mjs); every oak draws the same ones, so only hero-oak-near carries them and every other file
 * names it in asset.extras.tervainSharedImages, borrowing its images when loaded.
 *
 * Extra vertex attributes (consumed by the hierarchical-wind shader work):
 *   _WIND  vec4  x branch level weight 0 trunk .. 1 twig tip, y branch phase (0..2pi, unique per branch),
 *                z parent branch phase, w leaf flutter weight (0 wood, 1 cards)
 *   _PIVOT vec3  attachment point of the branch segment in tree space (a cluster's twig tip for cards)
 *   COLOR_0 on cards: RGB crown shade (about 0.4 inside .. 1 at the outer rim, slightly cool, times a per-card tint), A 1
 *   COLOR_0 on wood:  RGB ground AO = smoothstep(0, 0.5 m, height); A 1 (the soil skirt fades its alpha to 0 at its rim)
 * The wood primitive's extras.tervainWoodCollisionIndex is the index count before roots and skirt: colliders stay trunk-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import sharp from 'sharp';
import { makeRng, clamp, lerp, smoothstep } from './lib/util.mjs';
import { generateBark, generateBirchBark } from './lib/bark.mjs';
import { generateLeafAtlas, LEAF_ATLAS } from './lib/leafAtlas.mjs';
import { growOak, trunkRadiusAt, OAK, growBirch, birchRadiusAt, BIRCH, growBush, bushRadiusAt, growFruit, fruitRadiusAt, APPLE, PEAR } from './lib/skeleton.mjs';
import { MeshBuilder, addTube, addRoots, addSkirt, windLevel } from './lib/mesh.mjs';
import { leafCandidates, placeClusters, clusterCards, bakeCrown } from './lib/leaves.mjs';
import { writeGlb } from './lib/glb.mjs';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
// Each hero variant takes the trunk profile of the supplied oak it replaces (a: oak-elder, b: tree-0208, the giant, c: tree-1521), so a giant stays giant.
const TRUNK_PROFILES = {
  'hero-oak': { trunkRadius: 0.88, flareGain: 0.25, flareDecay: 1.0 },
  'hero-oak-b': { trunkRadius: 1.85, flareGain: 1.0, flareDecay: 0.9 },
  'hero-oak-c': { trunkRadius: 1.5, flareGain: 1.2, flareDecay: 0.8 },
};
Object.assign(OAK, TRUNK_PROFILES[arg('--name', 'hero-oak')] ?? {});
const seed = Number(arg('--seed', 1)), outDir = path.resolve(root, arg('--out', 'public/models/flora/hero'));
const name = arg('--name', 'hero-oak'), species = arg('--species', 'oak');

const LODS = {
  near: { trunk: 12, limb: 8, bough: 4, twig: 3, root: 8, stride: 1, twigs: false, boughs: true, rootRings: 1, clusters: 3400, cards: 3, cardRows: 1, sizeScale: 1.0, skirtSeg: 0 },
  mid: { trunk: 10, limb: 6, bough: 4, twig: 0, root: 6, stride: 2, twigs: false, boughs: true, rootRings: 1, clusters: 1750, cards: 3, cardRows: 1, sizeScale: 1.25, skirtSeg: 0 },
  far: { trunk: 5, limb: 3, bough: 0, twig: 0, root: 0, stride: 4, twigs: false, boughs: false, rootRings: 1, clusters: 200, cards: 3, cardRows: 1, sizeScale: 2.2, skirtSeg: 0 },
};

// Birch wood is thin: fewer sides, no buttress roots (the trunk's own flare makes its foot); its crown is airier, so its
// clusters are fewer and smaller.
const BIRCH_LODS = {
  // The game rebuilds the near crown at its own card count; these clusters only say where the clumps go.
  near: { trunk: 10, limb: 6, bough: 4, twig: 3, root: 0, stride: 1, twigs: false, boughs: true, rootRings: 1, clusters: 900, cards: 3, cardRows: 1, sizeScale: 0.8, skirtSeg: 0 },
  mid: { trunk: 8, limb: 5, bough: 3, twig: 0, root: 0, stride: 2, twigs: false, boughs: true, rootRings: 1, clusters: 1300, cards: 3, cardRows: 1, sizeScale: 1.0, skirtSeg: 0 },
  far: { trunk: 5, limb: 3, bough: 0, twig: 0, root: 0, stride: 4, twigs: false, boughs: false, rootRings: 1, clusters: 180, cards: 3, cardRows: 1, sizeScale: 1.8, skirtSeg: 0 },
};
// Birch bark keeps a neutral tint and little moss, a light grey rather than chalk white: whiter bark flickered against the
// foliage swaying in front of it (A160). Its foot is dark for a metre or two; its limbs and twigs are greyer than its stem.
const BIRCH_PALETTE = { warm: [0.76, 0.75, 0.73], moss: 0.25, level: { 1: 0.7, 2: 0.6, 3: 0.45 }, foot: (y, n) => lerp(0.1, 1, smoothstep(1.0, 2.8, y + 1.6 * (n - 0.5))) };
// A bush is small and seen close: slim stems, small leaf cards, twigs at the near level (A163). Every level keeps the near
// cards' size, so no level's leaves reach past the near crown's outline.
const BUSH_LODS = {
  near: { trunk: 6, limb: 5, bough: 4, twig: 3, root: 0, stride: 1, twigs: true, boughs: true, rootRings: 1, clusters: 420, cards: 3, cardRows: 1, sizeScale: 0.42, skirtSeg: 0 },
  mid: { trunk: 4, limb: 4, bough: 3, twig: 0, root: 0, stride: 2, twigs: false, boughs: true, rootRings: 1, clusters: 300, cards: 3, cardRows: 1, sizeScale: 0.45, skirtSeg: 0 },
  far: { trunk: 3, limb: 3, bough: 0, twig: 0, root: 0, stride: 3, twigs: false, boughs: false, rootRings: 1, clusters: 200, cards: 3, cardRows: 1, sizeScale: 0.45, skirtSeg: 0 },
};
// Hazel-grey stems, a little moss, no dark foot; the thinnest wood a little darker.
const BUSH_PALETTE = { warm: [0.62, 0.56, 0.49], moss: 0.4, level: { 1: 1, 2: 0.92, 3: 0.82 }, foot: () => 1 };
// Orchard trees (A164) are the oak's crown at half its size: smaller cards, fewer clusters, no buttress roots. The game
// rebuilds the near and middle crowns (the middle at 1.2 times these cards); the far crown draws its own. Every level
// keeps the near cards' size, so no level reaches past the near crown's outline.
const ORCHARD_LODS = {
  near: { trunk: 10, limb: 7, bough: 4, twig: 3, root: 0, stride: 1, twigs: false, boughs: true, rootRings: 1, clusters: 1100, cards: 3, cardRows: 1, sizeScale: 0.5, skirtSeg: 0 },
  mid: { trunk: 8, limb: 5, bough: 3, twig: 0, root: 0, stride: 2, twigs: false, boughs: true, rootRings: 1, clusters: 700, cards: 3, cardRows: 1, sizeScale: 0.5, skirtSeg: 0 },
  far: { trunk: 5, limb: 3, bough: 0, twig: 0, root: 0, stride: 4, twigs: false, boughs: false, rootRings: 1, clusters: 300, cards: 3, cardRows: 1, sizeScale: 0.5, skirtSeg: 0 },
};
// Fruit-tree bark is darker and greyer than an oak's, a little mossy; its thin wood darker still.
const ORCHARD_PALETTE = { warm: [0.62, 0.55, 0.48], moss: 0.5, level: { 1: 0.95, 2: 0.88, 3: 0.8 }, foot: () => 1 };
// Each generated species: skeleton, trunk radius, bark, levels of detail and the one file that carries its images (the bark
// and leaf atlas do not depend on the seed, so every other file of the species names that one and borrows them).
const SPECIES = {
  oak: { grow: (s) => growOak(s), radiusAt: (y) => trunkRadiusAt(y, OAK), bark: () => generateBark(2048, 7), lods: LODS, imageFile: 'hero-oak-near.glb', label: 'hero oak' },
  birch: { grow: (s) => growBirch(s), radiusAt: (y) => birchRadiusAt(y, BIRCH), bark: () => generateBirchBark(2048, 17), lods: BIRCH_LODS, imageFile: 'hero-birch-near.glb', label: 'hero birch', palette: BIRCH_PALETTE, leaves: { fill: 0.25 }, crownShade: 0.68, normalSize: 1024 },
  // Bushes draw the oaks' bark and leaves, so they borrow hero-oak-near's images and carry none (A163). Their branches reach
  // the dome's edge in leaf, so no bough is dropped for ending there.
  bush: { grow: (s) => growBush(s), radiusAt: (y) => bushRadiusAt(y), bark: () => generateBark(2048, 7), lods: BUSH_LODS, imageFile: 'hero-oak-near.glb', label: 'hero bush', palette: BUSH_PALETTE, leaves: { fill: 0, undersides: false }, crownShade: 0.62, boughEnvelope: 1.05, clusterSpacing: 0.06, cardClearance: 0.03 },
  // Orchard trees borrow the oak's images too (A164): an apple in the wide orchard tree's slots, a pear in the narrow one's.
  apple: { grow: (s) => growFruit(s, APPLE), radiusAt: (y) => fruitRadiusAt(y, APPLE), bark: () => generateBark(2048, 7), lods: ORCHARD_LODS, imageFile: 'hero-oak-near.glb', label: 'hero apple', palette: ORCHARD_PALETTE, leaves: { fill: 0.15 }, crownShade: 0.6, clusterSpacing: 0.1, cardClearance: 0.08 },
  pear: { grow: (s) => growFruit(s, PEAR), radiusAt: (y) => fruitRadiusAt(y, PEAR), bark: () => generateBark(2048, 7), lods: ORCHARD_LODS, imageFile: 'hero-oak-near.glb', label: 'hero pear', palette: ORCHARD_PALETTE, leaves: { fill: 0.15 }, crownShade: 0.6, clusterSpacing: 0.1, cardClearance: 0.08 },
};
const SP = SPECIES[species];
if (!SP) throw new Error(`Unknown species ${species}`);

function decimate(b, stride) {
  if (stride <= 1) return b;
  const keep = b.points.map((_, i) => i).filter((i) => i % stride === 0 || i === b.points.length - 1);
  const o = Object.create(Object.getPrototypeOf(b)); Object.assign(o, b);
  o.points = keep.map((i) => b.points[i]); o.radii = keep.map((i) => b.radii[i]);
  o.cum = [0]; for (let i = 1; i < o.points.length; i++) o.cum.push(o.cum[i - 1] + o.points[i].distanceTo(o.points[i - 1]));
  o.tangents = o.points.map((p, i) => o.points[Math.min(o.points.length - 1, i + 1)].clone().sub(o.points[Math.max(0, i - 1)]).normalize());
  return o;
}

function shortTwig(b, keep, stride) {
  const o = Object.create(Object.getPrototypeOf(b)); Object.assign(o, b);
  const a = b.points[0], end = b.at(keep);
  o.points = [a.clone(), end.p]; o.radii = [b.radii[0], 0.006];
  o.cum = [0, a.distanceTo(end.p)]; const t = end.p.clone().sub(a).normalize(); o.tangents = [t, t.clone()];
  void stride; return o;
}

function buildWood(sk, lod, bark, seedBase, centres = []) {
  const P = SP.lods[lod], rng = makeRng(seedBase + 77), mb = new MeshBuilder(), seam = [];
  const rootAz = []; if (P.root) { const n = rng.int(5, 7), a0 = rng() * Math.PI * 2; for (let k = 0; k < n; k++) rootAz.push(a0 + (k / n) * Math.PI * 2 + rng.range(-0.25, 0.25)); }
  const trunkShape = (r, y, ang, i, dir) => {
    if (y > 4.5) return r;
    const az = Math.atan2(dir.z, dir.x); let lobe = 0;
    for (const a of rootAz) { let d = az - a; d = Math.atan2(Math.sin(d), Math.cos(d)); lobe += Math.exp(-(d * d) / (2 * 0.32 * 0.32)); }
    return r * (1 + 0.3 * lobe * Math.exp(-Math.max(y, 0) / 1.0));
  };
  // Wood deep inside the canopy sits in leaf shadow: dark and cool, full value at the crown rim.
  const crownShade = (p, b) => { const d = Math.hypot((p.x - sk.center.x) / sk.Rh, (p.y - sk.center.y) / sk.Rv, (p.z - sk.center.z) / sk.Rh); return lerp(b.isTrunk || b.level === 1 ? 0.66 : 0.45, 0.85, smoothstep(0.45, 1.0, d)); };
  const relief = (r) => clamp(0.3 * r, 0.008, 0.06);
  const sidesFor = (b) => (b.isTrunk ? P.trunk : b.level === 1 ? P.limb : b.level === 2 ? P.bough : P.twig);
  // A stem that runs up into its crown is in the leaves' shade there: white bark seen through the gaps between leaf cards
  // flickered against them (A160), so the stem darkens from the crown's base up.
  const stemPalette = SP.palette && sk.crownBase !== undefined ? { ...SP.palette, crown: (y) => lerp(1, 0.3, smoothstep(sk.crownBase - 0.3, sk.crownBase + 2.2, y)) } : SP.palette;
  for (const level of [0, 1, 2, 3]) {
    if (level === 2 && !P.boughs) continue; if (level === 3 && !P.twigs) continue;
    for (const b0 of sk.branches.filter((b) => b.level === level)) {
      // A twig that ends outside the leaf mass is a bare spike: only twigs ending inside a leaf cluster are grown.
      // Sprigs (twigs of twigs) only carry leaves: their wood would show as bare dark sticks between the cards.
      if (level === 3 && b0.parent?.level === 3) continue;
      // A bough is kept only while every point past its root lies in leaf cover (within 1.3 m of a clump), so no bare stick shows between the leaves.
      if (level === 2 && sk.envelope(b0.points[b0.points.length - 1]) > (SP.boughEnvelope ?? 0.85)) continue;
      if (level === 2 && !b0.points.slice(1).every((pt) => centres.some((c) => c.distanceToSquared(pt) < 1.3 * 1.3))) continue;
      if (level === 3 && !centres.some((c) => c.distanceToSquared(b0.points[b0.points.length - 1]) < 0.7 * 0.7)) continue;
      // Near twigs are one straight, shortened, pointed stick (the leaf cards that sit along them hide it): long full-length ones read as black hairlines.
      const b = level === 3 ? shortTwig(b0, lod === 'near' ? 0.62 : 1, P.stride) : decimate(b0, P.stride), sides = sidesFor(b);
      const circ = Math.PI * 2 * b.radii[0];
      const trunk = !!b.isTrunk;
      const sm = addTube(mb, b, {
        sides, uTiles: trunk ? Math.max(1, Math.round(SP.radiusAt(2) * Math.PI * 2 / 5.2)) : level === 3 ? 0.02 : Math.max(clamp(circ / 2.0, 0.12, 1), 0.2), vScale: trunk || level === 3 ? 1 : Math.max(clamp(circ / 2.0, 0.12, 1), 0.2) / Math.max(0.05, circ / 2.0), crownShade: trunk ? null : crownShade, uOff: level === 3 ? bark.twigU : rng(), vOff: rng(), relief, seed: seedBase + b.id,
        shape: trunk ? trunkShape : null, lumps: trunk ? 0.14 : 0.05, noRelief: lod === 'far' || level === 3, palette: stemPalette,
      }, bark);
      seam.push(...sm);
    }
  }
  const collisionIndex = mb.idx.length;
  // Roots draw from their own stream: reshaping the crown above must not move them (tests/presentation/renderedRootSeating.test.ts).
  if (P.root) addRoots(mb, { rootSides: P.root }, bark, makeRng(seedBase + 91), SP.radiusAt(0.4), seam, rootAz);
  if (P.skirtSeg) addSkirt(mb, bark, rng, SP.radiusAt(0.0) * 0.98, P.skirtSeg);
  mb.computeNormals(seam);
  return { mb, collisionIndex };
}

/** Segments of every wood tube, to keep leaf cards off the wood. */
function woodSegments(sk) {
  const segs = [];
  for (const b of sk.branches) for (let i = 0; i < b.points.length - 1; i++) segs.push({ a: b.points[i], b: b.points[i + 1], r: Math.max(b.radii[i], b.radii[i + 1]), branch: b });
  return segs;
}
function segDist(p, s, tmp = new THREE.Vector3(), ab = new THREE.Vector3()) {
  ab.copy(s.b).sub(s.a); const t = clamp(tmp.copy(p).sub(s.a).dot(ab) / Math.max(1e-9, ab.lengthSq()), 0, 1);
  return tmp.copy(s.a).addScaledVector(ab, t).distanceTo(p);
}

function buildLeaves(sk, lod, cands, segs, seedBase) {
  const P = SP.lods[lod], rng = makeRng(seedBase + 501), mb = new MeshBuilder();
  const picked = placeClusters(cands, P.clusters, rng, SP.clusterSpacing ?? 0.14);
  const clusters = picked.map((c) => ({ ...c, cards: [] }));
  const grid = new Map(), cell = 2.5, key = (x, y, z) => `${x},${y},${z}`;
  segs.forEach((s, i) => { for (const p of [s.a, s.b, s.a.clone().lerp(s.b, 0.5)]) { const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell)); (grid.get(k) ?? grid.set(k, []).get(k)).push(i); } });
  const nearWood = (p, reach) => { const out = new Set(), r = Math.ceil(reach / cell), gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell), gz = Math.floor(p.z / cell);
    for (let x = gx - r; x <= gx + r; x++) for (let y = gy - r; y <= gy + r; y++) for (let z = gz - r; z <= gz + r; z++) for (const i of grid.get(key(x, y, z)) ?? []) out.add(i); return out; };
  let rejected = 0;
  const tmp = new THREE.Vector3();
  for (const cl of clusters) {
    for (let attempt = 0; attempt < 4 && cl.cards.length === 0; attempt++) {
      const cards = clusterCards(cl, sk, rng, { cards: P.cards, sizeScale: P.sizeScale }), kept = [];
      for (const card of cards) {
        let ok = true;
        for (const s of [0.45, 0.75, 1.0]) {
          const p = tmp.copy(card.base).addScaledVector(card.dir, card.len * s);
          for (const i of nearWood(p, 1.2)) { const seg = segs[i]; if (seg.branch === cl.branch && s < 0.5) continue; if (segDist(p, seg) < seg.r + (SP.cardClearance ?? 0.15)) { ok = false; break; } }
          if (!ok) break;
        }
        if (ok) kept.push(card); else rejected++;
      }
      if (kept.length >= 2) cl.cards = kept;
    }
  }
  const live = clusters.filter((c) => c.cards.length);
  bakeCrown(live);
  const C = LEAF_ATLAS.cells, inset = LEAF_ATLAS.pad / LEAF_ATLAS.size;
  const rows = P.cardRows, tmpN = new THREE.Vector3();
  for (const cl of live) for (const card of cl.cards) {
    const cx = card.cell % C, cy = Math.floor(card.cell / C);
    let u0 = cx / C + inset, u1 = (cx + 1) / C - inset; if (card.flip) [u0, u1] = [u1, u0];
    const vTop = cy / C + inset, vBot = (cy + 1) / C - inset;
    const half = card.wid / 2, first = mb.vertexCount;
    const wind = [1, cl.branch.phase, cl.branch.parentPhase ?? 0, 1];
    // Crown shade baked as RGB (the game multiplies it into the albedo): a dark, cool inner crown rising to the full value at the rim.
    const sh = lerp(SP.crownShade ?? 0.56, 1, Math.pow(cl.crownAO, 0.8)) * lerp(0.9, 1, card.tint), col = [Math.round(sh * 0.93 * 255), Math.round(sh * 255), Math.round(sh * 0.96 * 255), 255];
    for (let r = 0; r <= rows; r++) {
      const t = r / rows, bend = rows > 1 ? t : 0;
      const centre = card.base.clone().addScaledVector(card.dir, card.len * t); centre.y -= card.len * (0.16 * t * t) * (rows > 1 ? 1 : 0.5);
      const w = half * (0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, t * 0.8 + 0.1)));
      void bend;
      for (const sgn of [-1, 1]) {
        const p = centre.clone().addScaledVector(card.side, sgn * w);
        // normal: the card's face leaning toward the crown sphere's outward direction (per-cluster rounded shading)
        tmpN.copy(p).sub(sk.center).normalize();
        const n = card.normal.clone().multiplyScalar(0.5).addScaledVector(tmpN, 0.5).normalize();
        mb.vertex(p, [sgn < 0 ? u0 : u1, lerp(vBot, vTop, t)], col, wind, cl.p, [n.x, n.y, n.z]);
      }
    }
    for (let r = 0; r < rows; r++) { const a = first + r * 2; mb.tri(a, a + 1, a + 2); mb.tri(a + 1, a + 3, a + 2); }
  }
  return { mb, centres: live.map((c) => c.p), clusters: live.length, cards: live.reduce((s, c) => s + c.cards.length, 0), rejected };
}

async function main() {
  const t0 = Date.now();
  const bark = SP.bark(), leaf = generateLeafAtlas();
  const sk = SP.grow(seed), segs = woodSegments(sk);
  const cands = leafCandidates(sk, makeRng(seed + 5), SP.leaves);
  const report = { seed, lods: {} };
  const textures = [
    { name: `${name}-bark`, mimeType: 'image/webp', webp: true, sampler: 'repeat', data: await sharp(Buffer.from(bark.albedo), { raw: { width: bark.size, height: bark.size, channels: 3 } }).webp({ quality: 88, effort: 5 }).toBuffer() },
    { name: `${name}-bark-normal`, mimeType: 'image/jpeg', sampler: 'repeat', data: await (SP.normalSize ? sharp(Buffer.from(bark.normal), { raw: { width: bark.size, height: bark.size, channels: 3 } }).resize(SP.normalSize, SP.normalSize) : sharp(Buffer.from(bark.normal), { raw: { width: bark.size, height: bark.size, channels: 3 } })).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer() },
    { name: `${name}-leaves`, mimeType: 'image/webp', webp: true, sampler: 'clamp', data: await sharp(Buffer.from(leaf.rgba), { raw: { width: leaf.size, height: leaf.size, channels: 4 } }).webp({ lossless: true, effort: 4 }).toBuffer() },
  ];
  fs.mkdirSync(outDir, { recursive: true });
  for (const lod of ['near', 'mid', 'far']) {
    const lv = buildLeaves(sk, lod, cands, segs, seed * 100 + 9);
    const { mb: wood, collisionIndex } = buildWood(sk, lod, bark, seed * 100, lv.centres);
    const carries = `${name}-${lod}.glb` === SP.imageFile;
    const materials = [
      { name: `Foliage | ${SP.label}`, alphaMode: 'MASK', alphaCutoff: 0.42, doubleSided: true, pbrMetallicRoughness: { ...(carries ? { baseColorTexture: { index: 2 } } : {}), baseColorFactor: [0.95, 1, 0.92, 1], metallicFactor: 0, roughnessFactor: 0.88 }, emissiveFactor: [0, 0, 0] },
      { name: `Wood | ${SP.label}`, alphaMode: 'MASK', alphaCutoff: 0.18, ...(carries ? { normalTexture: { index: 1, scale: 1 } } : {}), pbrMetallicRoughness: { ...(carries ? { baseColorTexture: { index: 0 } } : {}), baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.95 } },
    ];
    const glb = writeGlb({
      parts: [{ name: 'Foliage', builder: lv.mb, material: 0 }, { name: 'Wood', builder: wood, material: 1, extras: { tervainWoodCollisionIndex: collisionIndex } }],
      materials, textures: carries ? textures : [],
      assetExtras: { ...(carries ? {} : { tervainSharedImages: SP.imageFile }), tervainHeroTree: { generator: 'tools/tree-gen', ...(species === 'oak' ? {} : { species }), seed, lod } },
    });
    fs.writeFileSync(path.join(outDir, `${name}-${lod}.glb`), glb);
    report.lods[lod] = { bytes: glb.length, woodTris: wood.triangleCount, leafTris: lv.mb.triangleCount, tris: wood.triangleCount + lv.mb.triangleCount, clusters: lv.clusters, cards: lv.cards, rejectedCards: lv.rejected, verts: wood.vertexCount + lv.mb.vertexCount };
    if (lod === 'near') { const b = new THREE.Box3(); const p = Float32Array.from(wood.pos.concat(lv.mb.pos)); for (let i = 0; i < p.length; i += 3) b.expandByPoint(new THREE.Vector3(p[i], p[i + 1], p[i + 2])); report.bounds = { min: b.min.toArray().map((v) => +v.toFixed(2)), max: b.max.toArray().map((v) => +v.toFixed(2)) }; }
  }
  report.seconds = (Date.now() - t0) / 1000;
  report.branches = { total: sk.branches.length, limbs: sk.branches.filter((b) => b.level === 1).length, boughs: sk.branches.filter((b) => b.level === 2).length, twigs: sk.branches.filter((b) => b.level === 3).length };
  console.log(JSON.stringify(report, null, 1));
}
main();
