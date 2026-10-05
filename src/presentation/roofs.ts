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
  tile: { key: 'tile', ch: 0.31, t: 0.075, pw: 0.41, pitch: 0.62, colors: [0xa25b41, 0x9b583f, 0xa76145, 0x94533d], jit: 0.045, wiggle: 0.026 },
  slate: { key: 'slate', ch: 0.32, t: 0.06, pw: 0.39, pitch: 0.66, colors: [0x61635c, 0x5b605b, 0x686b63, 0x5c615e], jit: 0.04, wiggle: 0.024 },
  thatch: { key: 'thatch', ch: 0.42, t: 0.22, pw: 0.76, pitch: 0.86, colors: [0xb39a60, 0xad945b, 0xb9a16a, 0xa58d57], jit: 0.055, wiggle: 0.07 },
  shingle: { key: 'planks', ch: 0.43, t: 0.105, pw: 0.34, pitch: 0.6, colors: [0x84715a, 0x7c6b55, 0x89765e, 0x76654f], jit: 0.045, wiggle: 0.035 },
};

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Thin continuous decking beneath the individual courses, with closed eaves and barge edges. */
function roofShell(top: Batch, underside: Batch, faces: V3[][], perimeter: V3[], color: Col, timber: Col, thickness = 0.09) {
  // The top stays below the lowest course lift; a vertical drop keeps neighbouring hip planes joined.
  const upper = (p: V3): V3 => [p[0], p[1] - 0.016, p[2]];
  const lower = (p: V3): V3 => [p[0], p[1] - 0.016 - thickness, p[2]];
  const face = (B: Batch, points: V3[], tint: Col) => {
    if (points.length === 3) {
      const [a, b, c] = points as [V3, V3, V3];
      B.tri3(...a, ...b, ...c, tint);
    } else B.quad(points.flat(), tint, { amp: 0.02 });
  };
  for (const points of faces) {
    face(top, points.map(upper), color);
    face(underside, points.map(lower).reverse(), timber);
  }
  for (let i = 0; i < perimeter.length; i++) {
    const a = perimeter[i]!;
    const b = perimeter[(i + 1) % perimeter.length]!;
    face(underside, [upper(a), lower(a), lower(b), upper(b)], timber);
  }
}

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
  // Plank grain runs down each long shingle, while clay/slate/thatch retain horizontal overlap courses.
  const UV = (points: number[]) => st.key === 'planks' ? points.map((_v, i) => points[i ^ 1]!) : points;
  const courses = Math.max(1, Math.round(S / st.ch));
  // Hand-laid courses vary as connected groups. Normalize widths to the true slope endpoint so
  // gables/hip boundaries and the continuous backing never acquire gaps or a changed support envelope.
  const weights = Array.from({ length: courses }, (_, j) => 0.82 + hash3(seed, j, 83) * 0.36);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const boundaries = [0];
  for (const weight of weights) boundaries.push(boundaries[boundaries.length - 1]! + S * weight / weightSum);
  boundaries[courses] = S;
  const thatch = st.key === 'thatch';
  for (let j = 0; j < courses; j++) {
    const s0 = boundaries[j]!;
    const s1 = boundaries[j + 1]!;
    const ch = s1 - s0;
    const sm = (s0 + s1) * 0.5;
    const a0 = lo(sm);
    const a1 = hi(sm);
    if (a1 - a0 < 1e-6) continue;
    const pieces = Math.max(1, Math.round((a1 - a0) / st.pw));
    const w = (a1 - a0) / pieces;
    const stagger = (j % 2) * 0.42;
    const pieceEdges = [a0];
    for (let i = 1; i < pieces; i++) {
      const offset = (hash3(seed, i, j + 89) - 0.5) * 0.36;
      pieceEdges.push(a0 + (i - stagger + offset) * w);
    }
    pieceEdges.push(a1);
    for (let i = 0; i < pieces; i++) {
      const pa0 = pieceEdges[i]!;
      const pa1 = pieceEdges[i + 1]!;
      // Broad areas weather together; fine grain supplies detail without random checkerboard roof colours.
      const h = hash3(seed + Math.floor(pa0 / 1.3), Math.floor(s0 / 1.4), seed * 0.3);
      const base = mulc(pal[Math.floor(h * pal.length) % pal.length]!, 1.65);
      const k = 1 + (hash3(pa0 * 3.3, s0 * 2.9, seed) - 0.5) * 2 * st.jit;
      const lift = (hash3(seed, pa0 * 5, s0 * 5) - 0.5) * st.wiggle;
      const t = st.t * (thatch ? 0.7 + hash3(pa0, s0, 3) * 0.6 : 1);
      // Map the piece fractions to each course edge, so tapered hip courses meet their true seams.
      const f0 = (pa0 - a0) / (a1 - a0);
      const f1 = (pa1 - a0) / (a1 - a0);
      const edgeA = lo(s0), edgeB = hi(s0), edgeC = lo(s1), edgeD = hi(s1);
      const bottom0 = edgeA + (edgeB - edgeA) * f0, bottom1 = edgeA + (edgeB - edgeA) * f1;
      const top0 = edgeC + (edgeD - edgeC) * f0, top1 = edgeC + (edgeD - edgeC) * f1;
      // Chipped/uneven free ends expose the continuous deck below. True hip boundaries and the
      // structural shell remain unchanged, so irregular silhouettes never create open roof seams.
      const cut = thatch ? 0.22 : st.key === 'planks' ? 0.18 : 0.1;
      const chip0 = i === 0 ? 0 : hash3(seed, i, j + 31) * ch * cut;
      const chip1 = i === pieces - 1 ? 0 : hash3(seed, i + 7, j + 53) * ch * cut;
      const fray0 = thatch ? (hash3(seed, i, j + 61) - 0.5) * 0.055 : 0;
      const fray1 = thatch ? (hash3(seed, i + 9, j + 67) - 0.5) * 0.055 : 0;
      const p0 = P(bottom0, s0 + chip0, t + lift + fray0);
      const p1 = P(bottom1, s0 + chip1, t + lift + fray1);
      const p2 = P(top1, s1, lift * 0.3);
      const p3 = P(top0, s1, lift * 0.3);
      // Sloped exposed face; uv follows the eave and slope so texture rows line up with the courses.
      if (Math.abs(edgeD - edgeC) < 1e-6) {
        if (flip) B.tri3(...p0, ...p2, ...p1, base, k, UV([bottom0, s0, top1, s1, bottom1, s0]));
        else B.tri3(...p0, ...p1, ...p2, base, k, UV([bottom0, s0, bottom1, s0, top1, s1]));
      } else B.quad([...p0, ...p1, ...p2, ...p3], base, { uv: UV([bottom0, s0, bottom1, s0, top1, s1, top0, s1]), k, flip, amp: 0.03 });
      // Riser: the free edge's thickness, darker because it is in the shadow of the course above.
      const q0 = P(bottom0, s0 + chip0, lift);
      const q1 = P(bottom1, s0 + chip1, lift);
      B.quad([...q0, ...q1, ...p1, ...p0], mulc(base, 0.57), { uv: UV([bottom0, s0, bottom1, s0, bottom1, s0 + t, bottom0, s0 + t]), k: k * 0.92, flip, amp: 0.015 });
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
  B.quad([...p0, ...p3, ...p2, ...p1], color, { flip, amp: 0.02 });
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
  // Ridge cap and barge boards.
  const ry = ey + rise;
  const frontL: V3 = [-len / 2, ey, hs], frontR: V3 = [len / 2, ey, hs];
  const backL: V3 = [-len / 2, ey, -hs], backR: V3 = [len / 2, ey, -hs];
  const ridgeL: V3 = [-len / 2, ry, 0], ridgeR: V3 = [len / 2, ry, 0];
  roofShell(B, R.timber, [[frontL, frontR, ridgeR, ridgeL], [backR, backL, ridgeL, ridgeR]],
    [frontL, frontR, ridgeR, backR, backL, ridgeL], mulc(asRGB((o.palette ?? st.colors)[0]!), 1.4), dark);
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
      R.timber.rod(x, ey - 0.04, sz * hs, x, ry, 0, 0.12, 4, dark);
    }
  }
  // Eave fascia and rafter tails.
  for (const sz of [-1, 1]) {
    R.timber.bx(-len / 2, ey - 0.26, sz * hs - 0.075, len / 2, ey - 0.01, sz * hs + 0.075, dark, { jit: 0.02, amp: 0.025, grain: 'x' });
    const n = Math.max(3, Math.round(len / 0.62));
    for (let i = 0; i <= n; i++) {
      const x = -len / 2 + (i * len) / n;
      R.timber.bx(x - 0.065, ey - 0.2, sz * (hs - 0.34), x + 0.065, ey - 0.06, sz * hs, dark, { jit: 0.025, amp: 0.025, grain: 'z' });
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

/** Hip roof over a rectangle, with the ridge along its longer side. */
export function hipRoof(R: Region, o: HipOpts): RoofResult {
  if (o.d > o.w) {
    R.ctx.push(0, 0, 0, Math.PI / 2);
    const result = hipRoof(R, { ...o, w: o.d, d: o.w });
    R.ctx.pop();
    return result;
  }
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
  const frontL: V3 = [-Hw, ey, Hd], frontR: V3 = [Hw, ey, Hd];
  const backL: V3 = [-Hw, ey, -Hd], backR: V3 = [Hw, ey, -Hd];
  const ridgeL: V3 = [-rl, ry, 0], ridgeR: V3 = [rl, ry, 0];
  const faces: V3[][] = rl > 1e-6
    ? [[frontL, frontR, ridgeR, ridgeL], [backR, backL, ridgeL, ridgeR], [backL, frontL, ridgeL], [frontR, backR, ridgeR]]
    : [[frontL, frontR, ridgeR], [backR, backL, ridgeL], [backL, frontL, ridgeL], [frontR, backR, ridgeR]];
  roofShell(B, R.timber, faces, [frontL, frontR, backR, backL], mulc(asRGB((o.palette ?? st.colors)[0]!), 1.4), 0x4b3826);
  B.rod(-rl, ry + 0.03, 0, rl, ry + 0.03, 0, 0.13, 6, rc);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.rod(sx * Hw, ey + 0.02, sz * Hd, sx * rl, ry + 0.03, 0, 0.1, 5, rc);
  // Fascia is separate from the structural decking and follows the four actual eaves.
  for (const sz of [-1, 1]) R.timber.bx(-Hw, ey - 0.22, sz * Hd - 0.05, Hw, ey - 0.02, sz * Hd + 0.05, 0x4b3826, { jit: 0.02, amp: 0.025, grain: 'x' });
  for (const sx of [-1, 1]) R.timber.bx(sx * Hw - 0.05, ey - 0.22, -Hd, sx * Hw + 0.05, ey - 0.02, Hd, 0x4b3826, { jit: 0.02, amp: 0.025, grain: 'z' });
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
  const lowR: V3 = [-O[0], ey, side * hd];
  const highR: V3 = [-O[0], ey + rise, -side * hd];
  const highL: V3 = [O[0], ey + rise, -side * hd];
  roofShell(B, R.timber, [[O, lowR, highR, highL]], [O, lowR, highR, highL], mulc(asRGB((o.palette ?? st.colors)[0]!), 1.4), 0x4b3826);
  R.timber.bx(-len / 2, ey - 0.2, side * hd - 0.05, len / 2, ey - 0.01, side * hd + 0.05, 0x4b3826, { jit: 0.02, amp: 0.025, grain: 'x' });
  // The high edge is closed too, rather than an uncapped sheet seen from behind.
  R.timber.bx(-len / 2, ey + rise - 0.2, -side * hd - 0.05, len / 2, ey + rise - 0.01, -side * hd + 0.05, 0x4b3826, { jit: 0.02, amp: 0.025, grain: 'x' });
  // side boards
  for (const sx of [-1, 1]) R.timber.rod(sx * (len / 2 - 0.02), ey - 0.025, side * hd, sx * (len / 2 - 0.02), ey + rise, -side * hd, 0.085, 4, 0x4b3826);
  return { rise, ridgeY: ey + rise, halfSpan: hd, pitch, slope: S };
}

export { type RGB };
