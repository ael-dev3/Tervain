import { asRGB, hash3, mulc, type Batch, type Col, type RGB } from './buildKit';
import type { Region } from './regions';

/**
 * Real roof geometry. A roof plane is built course by course; every course is cut into pieces (tiles,
 * slates, thatch bundles) whose free edge stands proud of the course below, so the sawtooth silhouette and
 * the shadow line under each row come from geometry, not just from a texture.
 */

export type V3 = [number, number, number];

export interface RoofStyle {
  key: 'tile' | 'slate' | 'thatch' | 'planks';
  /** Course height measured up the slope. */
  ch: number;
  /** Height of a free edge above the course below. */
  t: number;
  /** Piece width along the eave. */
  pw: number;
  pitch: number;
  colors: number[];
  jit: number;
  /** Extra random lift of each piece. */
  wiggle: number;
}

export const ROOFS: Record<'tile' | 'slate' | 'thatch' | 'shingle', RoofStyle> = {
  tile: { key: 'tile', ch: 0.2, t: 0.04, pw: 0.3333, pitch: 0.62, colors: [0xa5573e, 0x9a4e37, 0xb0634a, 0x8f4a35, 0xb5694c], jit: 0.1, wiggle: 0.012 },
  slate: { key: 'slate', ch: 0.2, t: 0.03, pw: 0.25, pitch: 0.66, colors: [0x5d6570, 0x545c66, 0x687079, 0x4c535c, 0x60686f], jit: 0.08, wiggle: 0.01 },
  thatch: { key: 'thatch', ch: 0.3, t: 0.12, pw: 0.6, pitch: 0.86, colors: [0xb59a56, 0xa78c4a, 0xc2a862, 0x9a7f42, 0xb9a05c], jit: 0.12, wiggle: 0.04 },
  shingle: { key: 'planks', ch: 0.24, t: 0.035, pw: 0.24, pitch: 0.6, colors: [0x7a5b3c, 0x6d5034, 0x86664a, 0x5f452e], jit: 0.1, wiggle: 0.012 },
};

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * One roof plane. `O` is the eave corner, `A` the unit direction along the eave and `Sv` the unit direction
 * up the slope. `lo(s)` and `hi(s)` give the extent along `A` at slope distance `s`.
 */
export function roofPlane(B: Batch, st: RoofStyle, O: V3, A: V3, Sv: V3, S: number, lo: (s: number) => number, hi: (s: number) => number, seed: number, palette?: number[]) {
  let N = cross(A, Sv);
  const flip = N[1] < 0;
  if (flip) N = [-N[0], -N[1], -N[2]];
  N = norm(N);
  const pal = (palette ?? st.colors).map((c) => asRGB(c));
  const P = (a: number, s: number, n: number): V3 => [O[0] + A[0] * a + Sv[0] * s + N[0] * n, O[1] + A[1] * a + Sv[1] * s + N[1] * n, O[2] + A[2] * a + Sv[2] * s + N[2] * n];
  const courses = Math.max(1, Math.round(S / st.ch));
  const ch = S / courses;
  const thatch = st.key === 'thatch';
  for (let j = 0; j < courses; j++) {
    const s0 = j * ch;
    const s1 = s0 + ch;
    const sm = s0 + ch * 0.5;
    const a0 = lo(sm);
    const a1 = hi(sm);
    if (a1 - a0 < 0.05) continue;
    const pieces = Math.max(1, Math.round((a1 - a0) / st.pw));
    const w = (a1 - a0) / pieces;
    const stagger = (j % 2) * 0.5;
    for (let i = 0; i < pieces; i++) {
      let pa0 = a0 + i * w;
      let pa1 = pa0 + w;
      // Half-shifted courses: shorten the first and last pieces instead of overhanging.
      if (stagger) {
        pa0 = Math.max(a0, pa0 - w * 0.5);
        pa1 = Math.min(a1, pa1 - w * 0.5);
        if (i === pieces - 1) pa1 = a1;
        if (pa1 - pa0 < 0.03) continue;
      }
      const h = hash3(seed + i * 1.7, j * 3.1, seed * 0.3);
      const base = mulc(pal[Math.floor(h * pal.length) % pal.length]!, 1.9);
      const k = 1 + (hash3(pa0 * 3.3, s0 * 2.9, seed) - 0.5) * 2 * st.jit;
      const lift = (hash3(seed, pa0 * 5, s0 * 5) - 0.5) * st.wiggle;
      const t = st.t * (thatch ? 0.7 + hash3(pa0, s0, 3) * 0.6 : 1);
      const p0 = P(pa0, s0, t + lift);
      const p1 = P(pa1, s0, t + lift);
      const p2 = P(pa1, s1, lift * 0.3);
      const p3 = P(pa0, s1, lift * 0.3);
      // Sloped exposed face; uv follows the eave and slope so texture rows line up with the courses.
      B.quad([...p0, ...p1, ...p2, ...p3], base, { uv: [pa0, s0, pa1, s0, pa1, s1, pa0, s1], k, flip, amp: 0.03 });
      // Riser: the free edge's thickness, darker because it is in the shadow of the course above.
      const q0 = P(pa0, s0, lift);
      const q1 = P(pa1, s0, lift);
      B.quad([...q0, ...q1, ...p1, ...p0], mulc(base, 0.78), { uv: [pa0, s0, pa1, s0, pa1, s0 + t, pa0, s0 + t], k: k * 0.92, flip, amp: 0.02 });
    }
  }
}

/** A dark underside so no daylight shows through eaves. */
export function roofSoffit(B: Batch, O: V3, A: V3, Sv: V3, S: number, len: number, color: Col, drop = 0.045) {
  let N = cross(A, Sv);
  const flip = N[1] < 0;
  if (flip) N = [-N[0], -N[1], -N[2]];
  N = norm(N);
  const P = (a: number, s: number): V3 => [O[0] + A[0] * a + Sv[0] * s - N[0] * drop, O[1] + A[1] * a + Sv[1] * s - N[1] * drop, O[2] + A[2] * a + Sv[2] * s - N[2] * drop];
  const p0 = P(0, 0);
  const p1 = P(len, 0);
  const p2 = P(len, S);
  const p3 = P(0, S);
  // Facing down: reverse the winding used for the top.
  B.quad([...p0, ...p3, ...p2, ...p1], color, { flip: !flip, amp: 0.02 });
}

export interface RoofResult {
  rise: number;
  ridgeY: number;
  halfSpan: number;
  pitch: number;
  slope: number;
}

export interface GableOpts {
  /** Length along the ridge (local x) and span across it (local z) of the walls below. */
  w: number;
  d: number;
  /** Height of the wall top. */
  y: number;
  style: keyof typeof ROOFS;
  palette?: number[];
  pitch?: number;
  /** Overhang beyond the gable walls and beyond the eaves. */
  ohx?: number;
  ohz?: number;
  seed?: number;
  ridgeColor?: number;
  timber?: number;
}

/** Gable roof with its ridge along local x and eaves at +z / -z. */
export function gableRoof(R: Region, o: GableOpts): RoofResult {
  const st = ROOFS[o.style];
  const pitch = o.pitch ?? st.pitch;
  const ohx = o.ohx ?? 0.4;
  const ohz = o.ohz ?? 0.5;
  const hs = o.d / 2 + ohz;
  const S = hs / Math.cos(pitch);
  const rise = hs * Math.tan(pitch);
  const len = o.w + ohx * 2;
  const B = R.get(st.key);
  const seed = o.seed ?? 1;
  const sn = Math.sin(pitch);
  const cs = Math.cos(pitch);
  // Eaves droop slightly below the wall top so the roof sits on the walls.
  const ey = o.y - 0.06;
  roofPlane(B, st, [-len / 2, ey, hs], [1, 0, 0], [0, sn, -cs], S, () => 0, () => len, seed, o.palette);
  roofPlane(B, st, [len / 2, ey, -hs], [-1, 0, 0], [0, sn, cs], S, () => 0, () => len, seed + 17, o.palette);
  const dark = o.timber ?? 0x4b3826;
  roofSoffit(R.timber, [-len / 2, ey, hs], [1, 0, 0], [0, sn, -cs], S, len, dark);
  roofSoffit(R.timber, [len / 2, ey, -hs], [-1, 0, 0], [0, sn, cs], S, len, dark);
  // Ridge cap and barge boards.
  const ry = ey + rise;
  const rc = o.ridgeColor ?? (o.style === 'thatch' ? 0xa08a48 : o.style === 'slate' ? 0x4c535c : 0x87432f);
  if (o.style === 'thatch') {
    R.thatch.rod(-len / 2 - 0.05, ry + 0.02, 0, len / 2 + 0.05, ry + 0.02, 0, 0.26, 7, rc, { jit: 0.1 });
  } else {
    R.get(st.key).rod(-len / 2 - 0.02, ry + 0.03, 0, len / 2 + 0.02, ry + 0.03, 0, 0.11, 6, rc);
  }
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const x = sx * (len / 2 - 0.02);
      // Barge board along the slope edge.
      R.timber.rod(x, ey, sz * hs, x, ry, 0, 0.055, 4, dark, { caps: false });
    }
  }
  // Eave fascia and rafter tails.
  for (const sz of [-1, 1]) {
    R.timber.bx(-len / 2, ey - 0.13, sz * hs - 0.03, len / 2, ey - 0.01, sz * hs + 0.03, dark, { jit: 0.02 });
    const n = Math.max(3, Math.round(len / 0.62));
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + (i * len) / n;
      R.timber.bx(x - 0.045, ey - 0.13, sz * (hs - 0.34), x + 0.045, ey - 0.06, sz * hs, dark, { jit: 0.03 });
    }
  }
  return { rise, ridgeY: ry, halfSpan: hs, pitch, slope: S };
}

export interface HipOpts {
  w: number;
  d: number;
  y: number;
  style: keyof typeof ROOFS;
  palette?: number[];
  pitch?: number;
  oh?: number;
  seed?: number;
  ridgeColor?: number;
}

/** Hip roof over a rectangle wider than deep. */
export function hipRoof(R: Region, o: HipOpts): RoofResult {
  const st = ROOFS[o.style];
  const pitch = o.pitch ?? st.pitch;
  const oh = o.oh ?? 0.7;
  const Hw = o.w / 2 + oh;
  const Hd = o.d / 2 + oh;
  const sn = Math.sin(pitch);
  const cs = Math.cos(pitch);
  const S = Hd / cs;
  const rise = Hd * Math.tan(pitch);
  const B = R.get(st.key);
  const seed = o.seed ?? 3;
  const ey = o.y - 0.06;
  roofPlane(B, st, [-Hw, ey, Hd], [1, 0, 0], [0, sn, -cs], S, (s) => s * cs, (s) => 2 * Hw - s * cs, seed, o.palette);
  roofPlane(B, st, [Hw, ey, -Hd], [-1, 0, 0], [0, sn, cs], S, (s) => s * cs, (s) => 2 * Hw - s * cs, seed + 5, o.palette);
  roofPlane(B, st, [-Hw, ey, -Hd], [0, 0, 1], [cs, sn, 0], S, (s) => s * cs, (s) => 2 * Hd - s * cs, seed + 9, o.palette);
  roofPlane(B, st, [Hw, ey, Hd], [0, 0, -1], [-cs, sn, 0], S, (s) => s * cs, (s) => 2 * Hd - s * cs, seed + 13, o.palette);
  const ry = ey + rise;
  const rc = o.ridgeColor ?? 0x4c535c;
  const rl = Hw - Hd;
  B.rod(-rl, ry + 0.03, 0, rl, ry + 0.03, 0, 0.13, 6, rc);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.rod(sx * Hw, ey + 0.02, sz * Hd, sx * rl, ry + 0.03, 0, 0.1, 5, rc);
  // Soffit slab under the whole roof.
  R.timber.bx(-Hw, ey - 0.08, -Hd, Hw, ey - 0.02, Hd, 0x4b3826, { jit: 0.02 });
  for (const sz of [-1, 1]) R.timber.bx(-Hw, ey - 0.16, sz * Hd - 0.03, Hw, ey - 0.02, sz * Hd + 0.03, 0x4b3826, { jit: 0.02 });
  for (const sx of [-1, 1]) R.timber.bx(sx * Hw - 0.03, ey - 0.16, -Hd, sx * Hw + 0.03, ey - 0.02, Hd, 0x4b3826, { jit: 0.02 });
  return { rise, ridgeY: ry, halfSpan: Hd, pitch, slope: S };
}

export interface LeanOpts {
  w: number;
  d: number;
  y: number;
  style: keyof typeof ROOFS;
  palette?: number[];
  pitch?: number;
  ohx?: number;
  ohz?: number;
  seed?: number;
  /** Eave on the +z side (default) or the -z side. */
  lowSide?: 1 | -1;
}

/** Single-pitch roof: low eave at the front (local +z), rising toward the back wall. */
export function leanRoof(R: Region, o: LeanOpts): RoofResult {
  const st = ROOFS[o.style];
  const pitch = o.pitch ?? Math.min(st.pitch, 0.36);
  const ohx = o.ohx ?? 0.35;
  const ohz = o.ohz ?? 0.5;
  const side = o.lowSide ?? 1;
  const hd = o.d / 2 + ohz;
  const total = o.d + ohz * 2;
  const S = total / Math.cos(pitch);
  const rise = total * Math.tan(pitch);
  const len = o.w + ohx * 2;
  const sn = Math.sin(pitch);
  const cs = Math.cos(pitch);
  const B = R.get(st.key);
  const ey = o.y - 0.08;
  if (side === 1) roofPlane(B, st, [-len / 2, ey, hd], [1, 0, 0], [0, sn, -cs], S, () => 0, () => len, o.seed ?? 4, o.palette);
  else roofPlane(B, st, [len / 2, ey, -hd], [-1, 0, 0], [0, sn, cs], S, () => 0, () => len, o.seed ?? 4, o.palette);
  const O: V3 = side === 1 ? [-len / 2, ey, hd] : [len / 2, ey, -hd];
  const A: V3 = side === 1 ? [1, 0, 0] : [-1, 0, 0];
  const Sv: V3 = side === 1 ? [0, sn, -cs] : [0, sn, cs];
  roofSoffit(R.timber, O, A, Sv, S, len, 0x4b3826);
  R.timber.bx(-len / 2, ey - 0.14, side * hd - 0.03, len / 2, ey - 0.01, side * hd + 0.03, 0x4b3826, { jit: 0.02 });
  // side boards
  for (const sx of [-1, 1]) R.timber.rod(sx * (len / 2 - 0.02), ey, side * hd, sx * (len / 2 - 0.02), ey + rise, -side * hd, 0.05, 4, 0x4b3826, { caps: false });
  return { rise, ridgeY: ey + rise, halfSpan: hd, pitch, slope: S };
}

export { type RGB };
