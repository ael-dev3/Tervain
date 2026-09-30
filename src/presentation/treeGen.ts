import * as THREE from 'three';
import { mulberry32 } from '../world/noise';
import type { BarkKind, LeafKind } from './treeTextures';

/**
 * Procedural trees. Every tree is a hierarchy of curved, tapering, slightly lumpy tubes (trunk, limbs, boughs, twigs) with
 * leaf or needle cards hung on the outer ends. Nothing is symmetric: limbs droop and twist, trunks lean and bulge at the
 * root, and dead trees keep broken stubs. Each species is built at three levels of detail from the same seed, so a tree keeps
 * its shape as it recedes. Geometry is in tree-local metres, y up, roots at y = 0.
 */

export type Species = 'oak' | 'birch' | 'pine' | 'fir' | 'shorepine' | 'dead' | 'orchard' | 'shrub';
export const SPECIES: Species[] = ['oak', 'birch', 'pine', 'fir', 'shorepine', 'dead', 'orchard', 'shrub'];

type V3 = [number, number, number];
export type RGB = [number, number, number];

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** A linear multiplier colour (vertex colours multiply the textures, so these are tints around 1, not albedos). */
const lin = (r: number, g: number, b: number): RGB => [r, g, b];
/** Bark tints are multiplied by dark textures, so they sit well above 1. */
const barkT = (r: number, g: number, b: number): RGB => [r * 2.3, g * 2.3, b * 2.3];

class Acc {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  sway: number[] = [];
  idx: number[] = [];
  get n() {
    return this.pos.length / 3;
  }
  vert(p: V3, n: V3, u: number, v: number, c: RGB, sw: number) {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.uv.push(u, v);
    this.col.push(c[0], c[1], c[2]);
    this.sway.push(sw);
    return this.n - 1;
  }
  tri(a: number, b: number, c: number) {
    this.idx.push(a, b, c);
  }
  geometry(): THREE.BufferGeometry | null {
    if (this.n === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 1));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

type Rnd = () => number;

/** A curving path: direction eases toward random turns and toward gravity, so limbs arch and droop. */
function grow(start: V3, dir: V3, length: number, steps: number, rnd: Rnd, o: { curl?: number; gravity?: number; up?: number } = {}): V3[] {
  const pts: V3[] = [start];
  let d = norm(dir);
  const step = length / steps;
  let p = start;
  for (let i = 1; i <= steps; i++) {
    const r: V3 = [rnd() - 0.5, (rnd() - 0.5) * 0.55, rnd() - 0.5];
    d = norm(add(add(d, mul(r, o.curl ?? 0.3)), [0, (o.up ?? 0) - (o.gravity ?? 0) * (i / steps), 0]));
    p = add(p, mul(d, step));
    pts.push(p);
  }
  return pts;
}

interface TubeOpts {
  sides: number;
  color: RGB;
  colorVar?: number;
  /** Bark texture repeats around the trunk and per metre along it. */
  uRep?: number;
  vLen?: number;
  /** Sway weight at a point: called with the point. */
  sway: (p: V3) => number;
  /** Extra lumpiness of the radius. */
  lump?: number;
  /** Close the last ring to a point (stubs, branch tips). */
  capEnd?: boolean;
  seed?: number;
  /** Flare at the base: extra radius factor decaying over `flareH` metres. */
  flare?: number;
  flareH?: number;
}

function tube(acc: Acc, pts: V3[], radii: number[], o: TubeOpts, rnd: Rnd) {
  const n = pts.length;
  if (n < 2) return;
  const sides = o.sides;
  let T0 = norm(sub(pts[1]!, pts[0]!));
  let N: V3 = norm(cross(T0, Math.abs(T0[0]) < 0.9 ? [1, 0.11, 0.07] : [0, 0, 1]));
  let along = 0;
  const rings: number[] = [];
  const lumpA = rnd() * 6;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    const T = norm(sub(b, a));
    N = norm(sub(N, mul(T, dot(N, T))));
    const B = cross(T, N);
    if (i > 0) along += len(sub(pts[i]!, pts[i - 1]!));
    let r = radii[Math.min(radii.length - 1, i)]!;
    if (o.flare) r *= 1 + o.flare * Math.exp(-(pts[i]![1] - pts[0]![1]) / (o.flareH ?? 0.7));
    r *= 1 + (o.lump ?? 0.06) * Math.sin(along * 3.1 + lumpA) + (o.lump ?? 0.06) * 0.6 * (rnd() - 0.5);
    const cv = 1 + ((o.colorVar ?? 0.12) * (rnd() - 0.5) * 2);
    const c: RGB = [o.color[0] * cv, o.color[1] * cv, o.color[2] * cv];
    const sw = o.sway(pts[i]!);
    const start = acc.n;
    for (let s = 0; s <= sides; s++) {
      const ang = (s / sides) * Math.PI * 2;
      const d: V3 = add(mul(N, Math.cos(ang)), mul(B, Math.sin(ang)));
      // Ridged silhouette so the trunk is not a smooth cylinder: bumps run along the length.
      const bump = 1 + 0.07 * Math.sin(ang * 5 + lumpA + along * 0.6) * Math.min(1, r * 4);
      const p = add(pts[i]!, mul(d, r * bump));
      acc.vert(p, d, (s / sides) * (o.uRep ?? 2), along / (o.vLen ?? 1.6), c, sw);
    }
    rings.push(start);
    T0 = T;
  }
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < sides; s++) {
      const a = rings[i]! + s;
      const b = rings[i + 1]! + s;
      acc.tri(a, a + 1, b);
      acc.tri(a + 1, b + 1, b);
    }
  }
  if (o.capEnd) {
    const last = pts[n - 1]!;
    const tip = add(last, mul(norm(sub(last, pts[n - 2]!)), radii[radii.length - 1]! * 0.9));
    const ti = acc.vert(tip, norm(sub(last, pts[n - 2]!)), 0.5, along / (o.vLen ?? 1.6), o.color, o.sway(last));
    for (let s = 0; s < sides; s++) acc.tri(rings[n - 1]! + s, rings[n - 1]! + s + 1, ti);
  }
}

interface CardOpts {
  /** In-plane axis along the card's height (the twig direction). */
  up: V3;
  w: number;
  h: number;
  color: RGB;
  normal: V3;
  sway: number;
}

/** One alpha card: a double-sided quad (two quads back to back, so the smoothed normal is the same from both sides). */
function card(acc: Acc, c: V3, o: CardOpts, rnd: Rnd) {
  const v = norm(o.up);
  let u = cross(v, o.normal);
  if (len(u) < 1e-3) u = cross(v, [0, 0, 1]);
  u = norm(u);
  const hw = o.w / 2;
  const bottom = sub(c, mul(v, o.h * 0.15));
  const corners: V3[] = [sub(bottom, mul(u, hw)), add(bottom, mul(u, hw)), add(add(bottom, mul(v, o.h)), mul(u, hw)), sub(add(bottom, mul(v, o.h)), mul(u, hw))];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
  const k = 0.88 + rnd() * 0.24;
  const col: RGB = [o.color[0] * k, o.color[1] * k, o.color[2] * k];
  for (let side = 0; side < 2; side++) {
    const ids: number[] = [];
    for (let i = 0; i < 4; i++) ids.push(acc.vert(corners[i]!, o.normal, uvs[i * 2]!, uvs[i * 2 + 1]!, col, o.sway));
    if (side === 0) {
      acc.tri(ids[0]!, ids[1]!, ids[2]!);
      acc.tri(ids[0]!, ids[2]!, ids[3]!);
    } else {
      acc.tri(ids[0]!, ids[2]!, ids[1]!);
      acc.tri(ids[0]!, ids[3]!, ids[2]!);
    }
  }
}

/** A tuft card standing in a plane through `axis`: two crossed quads, for needle bursts seen from any side. */
function crossedTuft(acc: Acc, c: V3, size: number, normal: V3, color: RGB, sway: number, rnd: Rnd) {
  const a = rnd() * Math.PI;
  for (let k = 0; k < 2; k++) {
    const ang = a + (k * Math.PI) / 2;
    const u: V3 = [Math.cos(ang), 0, Math.sin(ang)];
    // Lay the second plane nearly horizontal so the tuft has a top and a side.
    const v: V3 = k === 0 ? [0, 1, 0] : [-Math.sin(ang) * 0.35, 0.94, Math.cos(ang) * 0.35];
    const hs = size / 2;
    const corners: V3[] = [sub(sub(c, mul(u, hs)), mul(v, hs)), sub(add(c, mul(u, hs)), mul(v, hs)), add(add(c, mul(u, hs)), mul(v, hs)), add(sub(c, mul(u, hs)), mul(v, hs))];
    const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    for (let side = 0; side < 2; side++) {
      const ids: number[] = [];
      for (let i = 0; i < 4; i++) ids.push(acc.vert(corners[i]!, normal, uvs[i * 2]!, uvs[i * 2 + 1]!, color, sway));
      if (side === 0) {
        acc.tri(ids[0]!, ids[1]!, ids[2]!);
        acc.tri(ids[0]!, ids[2]!, ids[3]!);
      } else {
        acc.tri(ids[0]!, ids[2]!, ids[1]!);
        acc.tri(ids[0]!, ids[3]!, ids[2]!);
      }
    }
  }
}

export interface LodGeometry {
  wood: THREE.BufferGeometry | null;
  leaf: THREE.BufferGeometry | null;
  tris: number;
}

export interface TreeVariant {
  species: Species;
  height: number;
  crownRadius: number;
  trunkRadius: number;
  bark: BarkKind;
  leafTexture: LeafKind;
  crownTexture: LeafKind;
  lods: [LodGeometry, LodGeometry, LodGeometry];
}

interface Spec {
  bark: BarkKind;
  barkColor: RGB;
  leaf: LeafKind;
  crownTex: LeafKind;
  leafColors: RGB[];
  /** Fraction of cards that are dying or dead-brown. */
  dying: number;
}

const SPECS: Record<Species, Spec> = {
  oak: { bark: 'oak', barkColor: barkT(0.78, 0.72, 0.64), leaf: 'oak', crownTex: 'crown', leafColors: [lin(1.0, 0.98, 0.72), lin(0.86, 0.92, 0.66), lin(1.08, 1.02, 0.7), lin(0.92, 0.86, 0.6)], dying: 0.1 },
  birch: { bark: 'birch', barkColor: barkT(1, 1, 1), leaf: 'birch', crownTex: 'crown', leafColors: [lin(1.1, 1.1, 0.68), lin(0.96, 1.06, 0.66), lin(1.16, 1.06, 0.62)], dying: 0.06 },
  pine: { bark: 'pine', barkColor: barkT(0.95, 0.82, 0.72), leaf: 'needle', crownTex: 'conifer', leafColors: [lin(0.98, 1.08, 0.86), lin(0.86, 1.0, 0.78), lin(1.05, 1.1, 0.88)], dying: 0.05 },
  fir: { bark: 'pine', barkColor: barkT(0.85, 0.74, 0.66), leaf: 'sprig', crownTex: 'conifer', leafColors: [lin(0.86, 1.02, 0.86), lin(0.78, 0.94, 0.8), lin(0.94, 1.06, 0.9)], dying: 0.03 },
  shorepine: { bark: 'pine', barkColor: barkT(0.9, 0.78, 0.68), leaf: 'needle', crownTex: 'conifer', leafColors: [lin(0.94, 1.04, 0.8), lin(0.82, 0.96, 0.74)], dying: 0.12 },
  dead: { bark: 'dead', barkColor: barkT(1.05, 1.02, 0.95), leaf: 'oak', crownTex: 'crown', leafColors: [lin(1.2, 0.96, 0.5)], dying: 1 },
  orchard: { bark: 'oak', barkColor: barkT(0.86, 0.8, 0.7), leaf: 'oak', crownTex: 'crown', leafColors: [lin(1.05, 1.06, 0.72), lin(0.94, 1.0, 0.68), lin(1.12, 1.06, 0.66)], dying: 0.08 },
  shrub: { bark: 'oak', barkColor: barkT(0.9, 0.78, 0.6), leaf: 'birch', crownTex: 'crown', leafColors: [lin(0.98, 1.04, 0.66), lin(0.86, 0.98, 0.62), lin(1.12, 1.04, 0.6)], dying: 0.18 },
};

const DYING: RGB[] = [lin(1.35, 0.95, 0.45), lin(1.1, 0.7, 0.36), lin(1.4, 1.1, 0.5)];

/** Painted forest greens: shaded blue-green interiors and warmer olive tips, without neon lawn colour. */
const LEAF_GAIN: RGB = [0.86, 0.94, 0.78];

function leafTint(spec: Spec, rnd: Rnd): RGB {
  const c = rnd() < spec.dying ? DYING[Math.floor(rnd() * DYING.length)]! : spec.leafColors[Math.floor(rnd() * spec.leafColors.length)]!;
  return [c[0] * LEAF_GAIN[0], c[1] * LEAF_GAIN[1], c[2] * LEAF_GAIN[2]];
}

interface Detail {
  sides: number;
  /** Fraction of branches and cards kept. */
  keep: number;
  /** Multiplier on card size (fewer cards are bigger). */
  cardScale: number;
  depth: number;
}

const DETAIL: [Detail, Detail] = [
  { sides: 8, keep: 1, cardScale: 1, depth: 2 },
  { sides: 5, keep: 0.34, cardScale: 1.55, depth: 1 },
];

function swayFn(H: number) {
  return (p: V3) => Math.pow(Math.max(0, p[1]) / Math.max(1, H), 1.7) * H * 0.9;
}

/* ------------------------------------------------------------------ broadleaf ------------------------------------------------------------------ */

interface BroadSpec {
  H: number;
  trunkR: number;
  forkH: number;
  limbs: number;
  limbLen: number;
  crownR: number;
  cards: number;
  cardSize: number;
  gravity: number;
  curl: number;
  lean: number;
  /** Radius of stubs and broken ends (dead trees). */
  dead?: boolean;
}

const BROAD: Partial<Record<Species, BroadSpec>> = {
  oak: { H: 19.5, trunkR: 0.64, forkH: 8.1, limbs: 6, limbLen: 8.2, crownR: 7.8, cards: 360, cardSize: 2.55, gravity: 0.17, curl: 0.43, lean: 0.045 },
  birch: { H: 14.2, trunkR: 0.2, forkH: 6.2, limbs: 6, limbLen: 4.6, crownR: 4.3, cards: 320, cardSize: 1.65, gravity: 0.12, curl: 0.42, lean: 0.05 },
  orchard: { H: 4.4, trunkR: 0.2, forkH: 1.3, limbs: 4, limbLen: 2.7, crownR: 3.0, cards: 360, cardSize: 1.0, gravity: 0.32, curl: 0.55, lean: 0.12 },
  dead: { H: 8.5, trunkR: 0.34, forkH: 3.6, limbs: 4, limbLen: 3.4, crownR: 3.6, cards: 0, cardSize: 0, gravity: 0.1, curl: 0.7, lean: 0.14, dead: true },
};

function buildBroadleaf(sp: Species, lod: 0 | 1, seed: number): { wood: Acc; leaf: Acc; height: number; crownR: number; trunkR: number } {
  const b = BROAD[sp]!;
  const spec = SPECS[sp];
  const det = DETAIL[lod];
  const rnd = mulberry32(seed * 977 + sp.length * 31);
  // Tube tessellation has its own stream: choosing a LOD cannot regrow the tree into a different shape.
  let tubeId = 0;
  const tubeRnd = () => mulberry32(seed * 6101 + tubeId++ * 131);
  const scale = 0.85 + rnd() * 0.3;
  const H = b.H * scale;
  const wood = new Acc();
  const leaf = new Acc();
  const sway = swayFn(H);
  const leanDir: V3 = norm([rnd() - 0.5, 0.0, rnd() - 0.5]);
  const trunkDir: V3 = norm(add([0, 1, 0], mul(leanDir, b.lean * (0.5 + rnd()))));
  const trunkPts = grow([0, -0.25, 0], trunkDir, b.forkH * scale + 0.25, 7, rnd, { curl: 0.16, gravity: 0 });
  const r0 = b.trunkR * scale;
  const trunkRadii = trunkPts.map((_, i) => r0 * (1 - (i / (trunkPts.length - 1)) * 0.42));
  tube(wood, trunkPts, trunkRadii, { sides: det.sides + 2, color: spec.barkColor, uRep: 2, vLen: 1.6, sway, flare: sp === 'oak' ? 0.82 : 0.55, flareH: sp === 'oak' ? 1.5 : 0.8, lump: 0.05, seed }, tubeRnd());
  if (sp === 'oak') {
    // Buttress roots start inside the flared trunk and descend into the ground; they never float as separate props.
    for (let k = 0; k < 5; k++) {
      const az = k * Math.PI * 2 / 5 + seed * 0.37;
      const reach = (1.7 + 0.7 * Math.sin(seed + k) ** 2) * scale;
      const dir: V3 = [Math.cos(az), 0, Math.sin(az)];
      const root: V3[] = [[0, 1.1 * scale, 0], [dir[0] * reach * 0.4, 0.28 * scale, dir[2] * reach * 0.4], [dir[0] * reach, -0.22, dir[2] * reach]];
      const tr = tubeRnd();
      if (lod === 0 || k % 2 === 0) tube(wood, root, [r0 * 0.5, r0 * 0.24, 0.02], { sides: det.sides, color: spec.barkColor, sway: () => 0, capEnd: true, uRep: 1, vLen: 1.5 }, tr);
    }
  }
  const fork = trunkPts[trunkPts.length - 1]!;
  const crownC: V3 = [fork[0], fork[1] + b.crownR * scale * 0.55, fork[2]];
  const sites: { p: V3; dir: V3; t: number }[] = [];
  const nLimbs = b.limbs;
  for (let k = 0; k < nLimbs; k++) {
    const az = (k / nLimbs) * Math.PI * 2 + (rnd() - 0.5) * 0.9;
    const el = 0.5 + rnd() * 0.55;
    const dir: V3 = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
    const L = b.limbLen * scale * (0.75 + rnd() * 0.5) * (b.dead ? 0.7 + rnd() * 0.3 : 1);
    const pts = grow(add(fork, [0, -0.15 * rnd(), 0]), dir, L, 6, rnd, { curl: b.curl, gravity: b.gravity, up: 0.04 });
    const rr = pts.map((_, i) => r0 * 0.55 * (1 - (i / (pts.length - 1)) * 0.85) + 0.025);
    tube(wood, pts, rr, { sides: Math.max(4, det.sides - 1), color: spec.barkColor, uRep: 1.5, vLen: 1.4, sway, capEnd: true, lump: 0.08 }, tubeRnd());
    if (b.dead) {
      // Broken stub or two off the limb.
      for (let j = 0; j < 2; j++) {
        const at = pts[1 + Math.floor(rnd() * (pts.length - 2))]!;
        const sd = norm(add(dir, [rnd() - 0.5, rnd() * 0.5, rnd() - 0.5]));
        const sp2 = grow(at, sd, L * (0.18 + rnd() * 0.22), 3, rnd, { curl: 0.5, gravity: 0.1 });
        tube(wood, sp2, sp2.map((_, i) => rr[2]! * (0.55 - i * 0.12) + 0.02), { sides: lod === 0 ? 4 : 3, color: spec.barkColor, sway, capEnd: true }, tubeRnd());
      }
      continue;
    }
    sites.push({ p: pts[pts.length - 1]!, dir: norm(sub(pts[pts.length - 1]!, pts[pts.length - 2]!)), t: 1 });
    const nb = Math.round(2 + rnd() * 2);
    for (let j = 0; j < nb; j++) {
      const ti = 2 + Math.floor(rnd() * (pts.length - 3));
      const at = pts[ti]!;
      const tang = norm(sub(pts[ti + 1]!, pts[ti]!));
      const bd = norm(add(add(mul(tang, 0.6), [rnd() - 0.5, rnd() * 0.5 + 0.1, rnd() - 0.5]), mul(norm(sub(at, crownC)), 0.5)));
      const bl = L * (0.4 + rnd() * 0.3);
      const bp = grow(at, bd, bl, 5, rnd, { curl: b.curl * 1.1, gravity: b.gravity * 0.9, up: 0.03 });
      const br = bp.map((_, i) => rr[ti]! * 0.62 * (1 - (i / (bp.length - 1)) * 0.85) + 0.012);
      tube(wood, bp, br, { sides: Math.max(3, det.sides - 3), color: spec.barkColor, uRep: 1, vLen: 1.2, sway, capEnd: true, lump: 0.1 }, tubeRnd());
      sites.push({ p: bp[bp.length - 1]!, dir: norm(sub(bp[bp.length - 1]!, bp[bp.length - 2]!)), t: 1 });
      {
        // Twigs: short, thin, each ends in a leaf site.
        for (let q = 0; q < 2; q++) {
          const at2 = bp[2 + Math.floor(rnd() * (bp.length - 3))]!;
          const td = norm(add(add(bd, [rnd() - 0.5, rnd() * 0.4, rnd() - 0.5]), mul(norm(sub(at2, crownC)), 0.4)));
          const tp = grow(at2, td, bl * 0.45, 3, rnd, { curl: 0.6, gravity: b.gravity * 0.6 });
          const tr = tubeRnd();
          const twigPts = det.depth > 1 ? tp : [tp[0]!, tp[1]!, tp[3]!];
          const twigRadii = det.depth > 1 ? tp.map((_, i) => 0.026 * (1 - i * 0.28)) : [0.026, 0.026 * 0.72, 0.026 * 0.16];
          // The middle LOD retains a cheap twig through both foliage attachment sites. Omitting its wood while
          // keeping the terminal fans would leave floating leaves beyond the surviving parent bough.
          tube(wood, twigPts, twigRadii, { sides: 3, color: spec.barkColor, sway, capEnd: true, uRep: 1, vLen: 1 }, tr);
          sites.push({ p: tp[tp.length - 1]!, dir: norm(sub(tp[tp.length - 1]!, tp[tp.length - 2]!)), t: 1 });
          sites.push({ p: tp[1]!, dir: td, t: 0.5 });
        }
      }
    }
  }
  // Leaf cards hang on the outer sites and are clustered along the last part of each bough.
  if (!b.dead && sites.length) {
    const want = b.cards;
    for (let i = 0; i < want; i++) {
      const s = sites[i % sites.length]!;
      const p = s.p;
      const outward = norm(sub(p, crownC));
      const depth = Math.min(1, len(sub(p, crownC)) / (b.crownR * scale));
      const tint = leafTint(spec, rnd);
      const shade = 0.64 + 0.42 * depth;
      const nrm = norm(add(mul(outward, 0.75), [0, 0.35, 0]));
      const up = norm(add(add(s.dir, mul(outward, 0.5)), [(rnd() - 0.5) * 0.9, (rnd() - 0.2) * 0.6, (rnd() - 0.5) * 0.9]));
      const w = b.cardSize * det.cardScale * (0.85 + rnd() * 0.35);
      const h = b.cardSize * det.cardScale * (0.9 + rnd() * 0.4);
      const cr = mulberry32(seed * 631 + i * 197);
      // The atlas stem starts at the card bottom, directly on the terminal twig. The middle LOD keeps an evenly
      // distributed subset of these sites and enlarges the same foliage fans rather than inventing a new skeleton.
      if (lod === 0 || i % 3 === 0) card(leaf, add(p, mul(up, h * 0.15)), { up, w, h, color: [tint[0] * shade, tint[1] * shade, tint[2] * shade], normal: nrm, sway: sway(p) * 1.15 + 0.05 * H }, cr);
    }
  }
  return { wood, leaf, height: H, crownR: b.crownR * scale, trunkR: r0 };
}

/* ------------------------------------------------------------------ conifers ------------------------------------------------------------------ */

interface ConiferSpec {
  H: number;
  trunkR: number;
  crownStart: number;
  branchLen: number;
  droop: number;
  whorlGap: number;
  perWhorl: number;
  tuft: boolean;
  cardSize: number;
  lean: number;
  twist: number;
  /** 0 for a symmetric crown; 1 pushes every branch to the lee side (wind-shaped). */
  oneSided: number;
}

const CONIFER: Partial<Record<Species, ConiferSpec>> = {
  pine: { H: 25, trunkR: 0.4, crownStart: 0.44, branchLen: 5.8, droop: 0.15, whorlGap: 1.25, perWhorl: 6, tuft: true, cardSize: 3.6, lean: 0.025, twist: 0.14, oneSided: 0 },
  fir: { H: 22, trunkR: 0.36, crownStart: 0.18, branchLen: 5.3, droop: 0.34, whorlGap: 1.05, perWhorl: 7, tuft: false, cardSize: 2.2, lean: 0.02, twist: 0.1, oneSided: 0 },
  shorepine: { H: 8.5, trunkR: 0.24, crownStart: 0.28, branchLen: 3.4, droop: 0.05, whorlGap: 0.8, perWhorl: 5, tuft: true, cardSize: 2.6, lean: 0.34, twist: 0.7, oneSided: 0.8 },
};

function buildConifer(sp: Species, lod: 0 | 1, seed: number): { wood: Acc; leaf: Acc; height: number; crownR: number; trunkR: number } {
  const c = CONIFER[sp]!;
  const spec = SPECS[sp];
  const det = DETAIL[lod];
  const rnd = mulberry32(seed * 1291 + sp.length * 17);
  let tubeId = 0;
  const tubeRnd = () => mulberry32(seed * 8171 + tubeId++ * 137);
  let cardId = 0;
  const cardRnd = () => mulberry32(seed * 9173 + cardId++ * 131);
  const scale = 0.85 + rnd() * 0.3;
  const H = c.H * scale;
  const wood = new Acc();
  const leaf = new Acc();
  const sway = swayFn(H);
  const lee = norm([Math.cos(seed * 1.7), 0, Math.sin(seed * 1.7)]);
  const trunkDir = norm(add([0, 1, 0], mul(lee, c.lean)));
  // A trunk that wanders: more for the wind-shaped tree.
  const trunkPts = grow([0, -0.25, 0], trunkDir, H + 0.25, 12, rnd, { curl: 0.1 + c.twist * 0.34, gravity: 0, up: 0.05 });
  const r0 = c.trunkR * scale;
  const trunkRadii = trunkPts.map((_, i) => Math.max(0.03, r0 * (1 - Math.pow(i / (trunkPts.length - 1), 0.9) * 0.93)));
  tube(wood, trunkPts, trunkRadii, { sides: det.sides + 2, color: spec.barkColor, uRep: 2, vLen: 1.8, sway, flare: 0.6, flareH: 1.0, lump: 0.04, capEnd: true }, tubeRnd());
  const at = (t: number): V3 => {
    const f = t * (trunkPts.length - 1);
    const i = Math.min(trunkPts.length - 2, Math.floor(f));
    return lerp3(trunkPts[i]!, trunkPts[i + 1]!, f - i);
  };
  const y0 = H * c.crownStart;
  const gap = c.whorlGap;
  let y = y0;
  let whorl = 0;
  while (y < H * 0.985) {
    const t = y / H;
    const base = at(t);
    // Branch length follows a conifer profile: longest low in the crown, short at the leader.
    const prof = c.tuft ? Math.pow(1 - (t - c.crownStart) / (1 - c.crownStart), 0.7) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, (t - c.crownStart) * 2.4))) : Math.pow(1 - (t - c.crownStart) / (1 - c.crownStart), 0.95);
    const L = Math.max(0.5, c.branchLen * scale * Math.max(0.12, prof));
    const n = c.perWhorl;
    const off = rnd() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      let az = off + (k / n) * Math.PI * 2 + (rnd() - 0.5) * 0.7;
      if (c.oneSided > 0) {
        const leeAz = Math.atan2(lee[2], lee[0]);
        az = az + (leeAz - az) * c.oneSided * 0.6 * rnd();
      }
      const el = -c.droop * (0.4 + rnd() * 0.9) + (t > 0.85 ? 0.35 : 0.05);
      const dir: V3 = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
      const bl = L * (0.7 + rnd() * 0.5) * (c.oneSided > 0 ? 0.5 + 0.5 * Math.max(0, dot(dir, lee) + 0.6) : 1);
      const pts = grow(base, dir, bl, 4, rnd, { curl: 0.25, gravity: c.droop * 0.9, up: c.tuft ? 0.05 : 0 });
      const rr = pts.map((_, i) => Math.max(0.012, 0.045 * scale * (1 - i / (pts.length - 1)) * (0.6 + 0.4 * prof)));
      const branchPts = lod === 0 ? pts : [pts[0]!, pts[2]!, pts[4]!];
      const branchRadii = lod === 0 ? rr : [rr[0]!, rr[2]!, rr[4]!];
      tube(wood, branchPts, branchRadii, { sides: Math.max(3, det.sides - 4), color: spec.barkColor, sway, capEnd: true, uRep: 1, vLen: 1 }, tubeRnd());
      const tint = leafTint(spec, rnd);
      const shade = 0.7 + 0.4 * rnd();
      const cc: RGB = [tint[0] * shade, tint[1] * shade, tint[2] * shade];
      const end = pts[pts.length - 1]!;
      const outward = norm(sub(end, add(base, [0, 0.6, 0])));
      if (c.tuft) {
        const size = c.cardSize * (lod === 0 ? 1 : 1.22) * (0.55 + prof * 0.7) * (0.85 + rnd() * 0.3);
        crossedTuft(leaf, end, size, norm(add(mul(outward, 0.5), [0, 0.85, 0])), cc, sway(end) + 0.1 * H, cardRnd());
        const inner = cardRnd();
        if (lod === 0 && bl > 1.6) crossedTuft(leaf, pts[2]!, c.cardSize * 0.7 * (0.5 + prof * 0.6), norm(add(mul(outward, 0.4), [0, 0.9, 0])), cc, sway(pts[2]!) + 0.08 * H, inner);
      } else {
        // Fir: cards lie along the bough and hang from it.
        const along = norm(sub(end, base));
        const m = 3;
        for (let q = 0; q < m; q++) {
          const p = pts[1 + Math.min(pts.length - 2, Math.floor((q / m) * (pts.length - 1)))]!;
          const across = norm(cross(along, [0, 1, 0]));
          const w = bl * 0.62 * det.cardScale * (0.9 + rnd() * 0.2);
          const cr = cardRnd();
          if (lod === 0 || q !== 1) card(leaf, p, { up: along, w, h: 1.3 * det.cardScale, color: cc, normal: norm(add(mul(outward, 0.4), [0, 0.9, 0])), sway: sway(p) + 0.08 * H }, cr);
          void across;
        }
      }
    }
    y += gap * (0.8 + rnd() * 0.5);
    whorl++;
  }
  void whorl;
  return { wood, leaf, height: H, crownR: c.branchLen * scale * 0.9, trunkR: r0 };
}

/* ------------------------------------------------------------------ shrub ------------------------------------------------------------------ */

function buildShrub(lod: 0 | 1, seed: number): { wood: Acc; leaf: Acc; height: number; crownR: number; trunkR: number } {
  const spec = SPECS.shrub;
  const rnd = mulberry32(seed * 733 + 5);
  const scale = 0.8 + rnd() * 0.5;
  const wood = new Acc();
  const leaf = new Acc();
  const H = 1.5 * scale;
  const sway = (p: V3) => p[1] * 0.35;
  const stems = lod === 0 ? 9 : 5;
  for (let s = 0; s < stems; s++) {
    const az = rnd() * Math.PI * 2;
    const dir: V3 = norm([Math.cos(az) * (0.3 + rnd() * 0.5), 1, Math.sin(az) * (0.3 + rnd() * 0.5)]);
    const pts = grow([(rnd() - 0.5) * 0.3, -0.1, (rnd() - 0.5) * 0.3], dir, H * (0.7 + rnd() * 0.5), 4, rnd, { curl: 0.5, gravity: 0.1 });
    tube(wood, pts, pts.map((_, i) => 0.03 * (1 - i * 0.22)), { sides: 4, color: spec.barkColor, sway, capEnd: true, uRep: 1, vLen: 0.8 }, rnd);
    const nCards = lod === 0 ? 9 : 5;
    for (let q = 0; q < nCards; q++) {
      const p = pts[1 + Math.floor(rnd() * (pts.length - 1))]!;
      const outward = norm(sub(p, [0, H * 0.4, 0]));
      const tint = leafTint(spec, rnd);
      card(leaf, p, { up: norm(add(outward, [0, 0.4, 0])), w: 0.85 * (lod === 0 ? 1 : 1.4), h: 0.9 * (lod === 0 ? 1 : 1.4), color: tint, normal: norm(add(outward, [0, 0.5, 0])), sway: sway(p) + 0.1 }, rnd);
    }
  }
  return { wood, leaf, height: H, crownR: 0.9 * scale, trunkR: 0.05 };
}

/* ------------------------------------------------------------------ far LOD ------------------------------------------------------------------ */

/** The distant tree: a plain trunk and a few crossed silhouette cards. Fog does the rest. */
function buildFar(sp: Species, height: number, crownR: number, crownBase: number, trunkR: number, seed: number): { wood: Acc; leaf: Acc } {
  const spec = SPECS[sp];
  const rnd = mulberry32(seed * 313 + 9);
  const wood = new Acc();
  const leaf = new Acc();
  const conifer = sp === 'pine' || sp === 'fir' || sp === 'shorepine';
  const base = sp === 'dead' ? height : crownBase;
  const tr: V3[] = [[0, -0.2, 0], [0, base * 0.5, 0], [0, Math.min(height, base + 1), 0]];
  tube(wood, tr, [trunkR * 1.1, trunkR * 0.8, trunkR * 0.6], { sides: 4, color: spec.barkColor, sway: () => 0, capEnd: true }, rnd);
  const tint = spec.leafColors[0]!;
  if (sp === 'dead') return { wood, leaf };
  if (conifer) {
    const h = height - base;
    const w = crownR * 1.9;
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3 + seed * 0.17;
      const u: V3 = [Math.cos(a), 0, Math.sin(a)];
      const bottom: V3 = [0, base, 0];
      const c0 = sub(bottom, mul(u, w / 2));
      const c1 = add(bottom, mul(u, w / 2));
      const c2 = add(c1, [0, h, 0]);
      const c3 = add(c0, [0, h, 0]);
      const col: RGB = [tint[0] * 0.7, tint[1] * 0.7, tint[2] * 0.7];
      const nrm: V3 = [0, 0.8, 0.2];
      for (let side = 0; side < 2; side++) {
        const ids = [c0, c1, c2, c3].map((p, i) => leaf.vert(p, nrm, [0, 1, 1, 0][i]!, [0, 0, 1, 1][i]!, col, 0.2 * height));
        if (side === 0) {
          leaf.tri(ids[0]!, ids[1]!, ids[2]!);
          leaf.tri(ids[0]!, ids[2]!, ids[3]!);
        } else {
          leaf.tri(ids[0]!, ids[2]!, ids[1]!);
          leaf.tri(ids[0]!, ids[3]!, ids[2]!);
        }
      }
    }
  } else {
    const n = sp === 'shrub' ? 2 : 4;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI + rnd() * 0.4;
      const cy = (base + height) * 0.5;
      const w = crownR * (1.8 + rnd() * 0.2);
      const u: V3 = [Math.cos(a), 0, Math.sin(a)];
      const c: V3 = [(rnd() - 0.5) * crownR * 0.4, cy, (rnd() - 0.5) * crownR * 0.4];
      const v: V3 = [0, 1, 0];
      const halfHeight = (height - base) * 0.5;
      const corners: V3[] = [sub(sub(c, mul(u, w / 2)), mul(v, halfHeight)), sub(add(c, mul(u, w / 2)), mul(v, halfHeight)), add(add(c, mul(u, w / 2)), mul(v, halfHeight)), add(sub(c, mul(u, w / 2)), mul(v, halfHeight))];
      const col: RGB = [tint[0] * 0.75, tint[1] * 0.75, tint[2] * 0.75];
      const nrm: V3 = [0, 1, 0];
      for (let side = 0; side < 2; side++) {
        const ids = corners.map((p, i) => leaf.vert(p, nrm, [0, 1, 1, 0][i]!, [0, 0, 1, 1][i]!, col, 0.15 * height));
        if (side === 0) {
          leaf.tri(ids[0]!, ids[1]!, ids[2]!);
          leaf.tri(ids[0]!, ids[2]!, ids[3]!);
        } else {
          leaf.tri(ids[0]!, ids[2]!, ids[1]!);
          leaf.tri(ids[0]!, ids[3]!, ids[2]!);
        }
      }
    }
  }
  return { wood, leaf };
}

/* ------------------------------------------------------------------ public ------------------------------------------------------------------ */

function lodFrom(w: Acc, l: Acc): LodGeometry {
  return { wood: w.geometry(), leaf: l.geometry(), tris: w.idx.length / 3 + l.idx.length / 3 };
}

/** Build one variant (seeded shape) of a species at all three levels of detail. */
export function buildTreeVariant(species: Species, variant: number): TreeVariant {
  const seed = variant * 7 + 3;
  const spec = SPECS[species];
  const one = (lod: 0 | 1) => {
    if (species === 'shrub') return buildShrub(lod, seed);
    if (CONIFER[species]) return buildConifer(species, lod, seed);
    return buildBroadleaf(species, lod, seed);
  };
  const a = one(0);
  const b = one(1);
  const near = lodFrom(a.wood, a.leaf);
  const middle = lodFrom(b.wood, b.leaf);
  // Culling bounds come from the finished tree, including bent branches and hanging fans, rather than an idealised height.
  let height = 0;
  let crownRadius = 0;
  let crownBase = Infinity;
  for (const geometry of [near.wood, near.leaf, middle.wood, middle.leaf]) {
    if (!geometry) continue;
    const p = geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      height = Math.max(height, p.getY(i));
      crownRadius = Math.max(crownRadius, Math.hypot(p.getX(i), p.getZ(i)));
      if (geometry === near.leaf || geometry === middle.leaf) crownBase = Math.min(crownBase, p.getY(i));
    }
  }
  const far = buildFar(species, height, crownRadius, Number.isFinite(crownBase) ? crownBase : height, a.trunkR, seed);
  return {
    species,
    height,
    crownRadius,
    trunkRadius: a.trunkR,
    bark: spec.bark,
    leafTexture: spec.leaf,
    crownTexture: spec.crownTex,
    lods: [near, middle, lodFrom(far.wood, far.leaf)],
  };
}
