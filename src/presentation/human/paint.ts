import { PA, type RGB } from './skin';
import type { SheetProjection } from './sheet';
import { fillNearest } from './raster';

/**
 * The painter for people's texture sheets. Each surface of a person belongs to a painted part (a shirt, a boot, the face,
 * an eye) whose spec says what it is made of and how worn it is; every covered pixel of the sheet is painted as a function
 * of the surface point it shows (its bind-pose position and its place on the part), never of the pixel itself. So the
 * front, side and back views agree wherever they meet, and a surface blended from two of them shows one picture, not two.
 *
 * What it paints is the broad, hand-painted layer Gothic's people carry in their textures: dyed cloth that is uneven and
 * faded, mud rising from hems and boots, darker folds and creases at the joints, turned and stitched edges, seams, mended
 * patches, scuffed leather, quilting, rust; and, on the head, the painted face. The fine weave, grain and pores come from
 * a tiling detail layer in the material (sheetMaterial.ts), so they stay sharp however close the camera comes. All of this
 * is a proposal of style (docs/art/gothic3-reference.md#people), generated in code.
 */

export type Surface = 'skin' | 'linen' | 'wool' | 'leather' | 'padded' | 'mail' | 'felt' | 'metal' | 'fur' | 'rope' | 'face' | 'eye' | 'lid' | 'ear' | 'hair' | 'beard';

/** The tiling fine-detail layers the material multiplies over the sheet, in texture-array order. */
export const DETAIL_LAYERS = ['flat', 'linen', 'wool', 'leather', 'padded', 'mail', 'felt', 'skin', 'hair', 'fur', 'metal', 'rope'] as const;
export type DetailLayer = (typeof DETAIL_LAYERS)[number];

/** Roughness, metalness and detail layer of each surface. */
export const SURFACE_MATERIAL: Readonly<Record<Surface, readonly [number, number, DetailLayer]>> = {
  skin: [0.62, 0, 'skin'],
  face: [0.58, 0, 'skin'],
  lid: [0.6, 0, 'skin'],
  ear: [0.62, 0, 'skin'],
  eye: [0.22, 0, 'flat'],
  hair: [0.74, 0, 'hair'],
  beard: [0.78, 0, 'hair'],
  linen: [0.95, 0, 'linen'],
  wool: [0.95, 0, 'wool'],
  felt: [0.92, 0, 'felt'],
  leather: [0.64, 0, 'leather'],
  padded: [0.92, 0, 'padded'],
  mail: [0.48, 0.6, 'mail'],
  metal: [0.42, 0.62, 'metal'],
  fur: [0.9, 0, 'fur'],
  rope: [0.95, 0, 'rope'],
};

export interface PaintSpec {
  surface: Surface;
  /** What the piece is, for the template legend: 'shirt', 'tunic', 'boot', 'face', ... */
  piece: string;
  seed: number;
  /** 0 clean .. 1 caked. */
  dirt?: number;
  /** Bind height from which hem mud fades upward. */
  hemY?: number;
  /** A band of another colour along an edge. */
  trim?: { color: RGB; edge: 'bottom' | 'top' | 'opening'; width: number };
  /** Stitch lines this far inside the edges (m). */
  stitch?: number;
  /** Angles from the front of vertical seams. */
  seams?: number[];
  /** Mended patches. */
  patches?: number;
  /** Something painted over the material. */
  pattern?: 'quilt' | 'panels' | 'studs' | 'rivets';
  /** Sweat and grime at the collar and under the arms. */
  sweat?: number;
  /** Eye: iris colour. Fur: the tips. Linear RGB. */
  tint?: RGB;
}

/* ---------------------------------------------------------------- noise */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;
/** The angle from b to a, wrapped into -π..π (loft angles run past 2π on an open garment). */
const angDiff = (a: number, b: number) => ((((a - b + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
export const hash = (a: number, b: number) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

function xorshift(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** A periodic lattice of random values, `p` a side. */
function lattice(p: number, seed: number): Float32Array {
  const r = xorshift(seed);
  const a = new Float32Array(p * p * p);
  for (let i = 0; i < a.length; i++) a[i] = r();
  return a;
}

/** Smooth trilinear sample of a periodic lattice (coordinates in lattice units). */
function sampleLattice(L: Float32Array, p: number, x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  let fx = x - ix;
  let fy = y - iy;
  let fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const x0 = ((ix % p) + p) % p;
  const y0 = ((iy % p) + p) % p;
  const z0 = ((iz % p) + p) % p;
  const x1 = (x0 + 1) % p;
  const y1 = ((y0 + 1) % p) * p;
  const z1 = ((z0 + 1) % p) * p * p;
  const yy0 = y0 * p;
  const zz0 = z0 * p * p;
  const c000 = L[zz0 + yy0 + x0]!, c100 = L[zz0 + yy0 + x1]!, c010 = L[zz0 + y1 + x0]!, c110 = L[zz0 + y1 + x1]!;
  const c001 = L[z1 + yy0 + x0]!, c101 = L[z1 + yy0 + x1]!, c011 = L[z1 + y1 + x0]!, c111 = L[z1 + y1 + x1]!;
  const a = c000 + (c100 - c000) * fx;
  const b = c010 + (c110 - c010) * fx;
  const c = c001 + (c101 - c001) * fx;
  const d = c011 + (c111 - c011) * fx;
  const e = a + (b - a) * fy;
  const f = c + (d - c) * fy;
  return e + (f - e) * fz;
}

const LN = 32;
const LATTICE = lattice(LN, 0x9e3779b9);

/** Tiling 3D value noise in 0..1 (period 32), for fine features. */
export function n3(x: number, y: number, z: number): number {
  return sampleLattice(LATTICE, LN, x, y, z);
}

/**
 * Broad variation, precomputed: a periodic 64-cell field holding three octaves of smooth value noise (features of about
 * 8, 4 and 2 cells), read with one trilinear sample. The painters read it at several scales and offsets for dye, grime,
 * creases and mud, which is what lets a whole sheet be painted in a few tens of milliseconds.
 */
const FN = 64;
const FIELD = (() => {
  const f = new Float32Array(FN * FN * FN);
  const oct: [number, number, Float32Array][] = [
    [8, 0.55, lattice(8, 101)],
    [16, 0.3, lattice(16, 202)],
    [32, 0.15, lattice(32, 303)],
  ];
  for (let z = 0; z < FN; z++) {
    for (let y = 0; y < FN; y++) {
      for (let x = 0; x < FN; x++) {
        let v = 0;
        for (const [p, amp, L] of oct) v += amp * sampleLattice(L, p, (x * p) / FN, (y * p) / FN, (z * p) / FN);
        f[(z * FN + y) * FN + x] = v;
      }
    }
  }
  return f;
})();

/** The broad field at a point in cells (period 64): roughly 0.2..0.8 around 0.5. */
export function field(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const x0 = ix & (FN - 1);
  const y0 = iy & (FN - 1);
  const z0 = iz & (FN - 1);
  const x1 = (x0 + 1) & (FN - 1);
  const y1 = ((y0 + 1) & (FN - 1)) * FN;
  const z1 = ((z0 + 1) & (FN - 1)) * FN * FN;
  const yy0 = y0 * FN;
  const zz0 = z0 * FN * FN;
  const F = FIELD;
  const c000 = F[zz0 + yy0 + x0]!, c100 = F[zz0 + yy0 + x1]!, c010 = F[zz0 + y1 + x0]!, c110 = F[zz0 + y1 + x1]!;
  const c001 = F[z1 + yy0 + x0]!, c101 = F[z1 + yy0 + x1]!, c011 = F[z1 + y1 + x0]!, c111 = F[z1 + y1 + x1]!;
  const a = c000 + (c100 - c000) * fx;
  const b = c010 + (c110 - c010) * fx;
  const c = c001 + (c101 - c001) * fx;
  const d = c011 + (c111 - c011) * fx;
  const e = a + (b - a) * fy;
  const f = c + (d - c) * fy;
  return e + (f - e) * fz;
}

/** The field at a bind-pose point, `cell` metres per cell, offset by a part's seed. */
function fieldAt(s: PixelSurface, cell: number, off: number): number {
  return field(s.x / cell + off, s.y / cell + off * 0.61, s.z / cell + off * 0.37);
}

/* ---------------------------------------------------------------- colour */

/** Linear to sRGB bytes through a table. */
const SRGB_LUT = (() => {
  const t = new Uint8Array(4097);
  for (let i = 0; i <= 4096; i++) {
    const c = i / 4096;
    t[i] = Math.round(clamp01(c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
  }
  return t;
})();
export const toSrgb = (c: number) => SRGB_LUT[c > 0 ? (c < 1 ? Math.round(c * 4096) : 4096) : 0]!;
const LINEAR_LUT = (() => {
  const t = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return t;
})();
export const toLinear = (b: number) => LINEAR_LUT[b]!;

const MUD: RGB = [0.07, 0.052, 0.034];
const DRY_MUD: RGB = [0.16, 0.13, 0.095];
const THREAD_DARK: RGB = [0.045, 0.036, 0.027];

/* ---------------------------------------------------------------- the pixel being painted */

/** The interpolated surface a pixel shows: bind position, base colour and the part's local attributes. */
export interface PixelSurface {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  /** Local attributes (PA of them; see skin.ts). */
  a: Float32Array;
}

/** What the painter knows about the person beyond the parts: the painted face map for the head's own surface. */
export interface PaintContext {
  parts: readonly PaintSpec[];
  /** sRGB face map in the head's (u, v) parameterisation, `faceN` square (humanTex.ts). */
  faceMap?: Uint8Array;
  faceN?: number;
}

type Out = Float32Array;

function mixInto(o: Out, r: number, g: number, b: number, t: number) {
  o[0] = o[0]! + (r - o[0]!) * t;
  o[1] = o[1]! + (g - o[1]!) * t;
  o[2] = o[2]! + (b - o[2]!) * t;
}
function scaleOut(o: Out, k: number) {
  o[0] = o[0]! * k;
  o[1] = o[1]! * k;
  o[2] = o[2]! * k;
}

/** Distance from the edge a trim follows. */
function edgeDistance(a: Float32Array, which: 'bottom' | 'top' | 'opening'): number {
  return which === 'bottom' ? a[2]! : which === 'top' ? a[3]! : a[4]!;
}

/** Fold shading: valleys darker, crests a little lighter. */
function folds(o: Out, a: Float32Array, k: number) {
  const f = a[5]!;
  if (f === 0) return;
  scaleOut(o, 1 + Math.max(-0.38, Math.min(0.16, f * k)));
}

/** Mud rising from a hem (wet and dark low down, dried paler above), and grime in blotches. */
function dirtOf(o: Out, s: PixelSurface, spec: PaintSpec, off: number) {
  const dirt = spec.dirt ?? 0;
  if (dirt <= 0) return;
  const hemY = spec.hemY ?? 0;
  const rise = 0.12 + 0.3 * dirt;
  const n = fieldAt(s, 0.012, off + 5);
  const reach = rise * (0.45 + 1.1 * n);
  const h = s.y - hemY;
  if (h < reach) {
    const wet = dirt * (1 - sstep(0, reach, h));
    const dry = dirt * sstep(reach * 0.35, reach * 0.8, h) * (1 - sstep(reach * 0.8, reach, h));
    if (wet > 0.002) mixInto(o, MUD[0], MUD[1], MUD[2], Math.min(0.85, wet * 0.85));
    if (dry > 0.002) mixInto(o, DRY_MUD[0], DRY_MUD[1], DRY_MUD[2], dry * 0.28);
  }
  const blot = sstep(0.56, 0.74, fieldAt(s, 0.02, off + 9)) * dirt;
  if (blot > 0.002) scaleOut(o, 1 - 0.32 * blot);
}

/** A stitched line `inset` inside an edge: short dashes of thread, darker than the cloth. */
function stitches(o: Out, along: number, dist: number, inset: number, thread: RGB, strength: number) {
  const d = Math.abs(dist - inset);
  if (d > 0.0022) return;
  const dash = along / 0.009 - Math.floor(along / 0.009);
  if (dash > 0.62) return;
  mixInto(o, thread[0], thread[1], thread[2], strength * (1 - d / 0.0022));
}

/** Where a part's seed puts its field samples. */
const offsetOf = (spec: PaintSpec) => (spec.seed % 997) * 0.173 + spec.piece.length * 3.1;

/* ---------------------------------------------------------------- painters */

function paintCloth(o: Out, s: PixelSurface, spec: PaintSpec) {
  const a = s.a;
  const off = offsetOf(spec);
  const felt = spec.surface === 'felt';
  // Uneven dye and wear: broad blotches and a finer mottle.
  const dye = fieldAt(s, 0.045, off);
  const mottle = fieldAt(s, 0.011, off + 21);
  scaleOut(o, 0.74 + 0.52 * dye + 0.12 * (mottle - 0.5) + (felt ? 0.1 * (n3(s.x * 60 + off, s.y * 60, s.z * 60) - 0.5) : 0));
  // Sun on the shoulders and upper back: paler and greyer.
  if (s.y > 1.2) {
    const sun = sstep(1.2, 1.5, s.y) * 0.12;
    const l = (o[0]! + o[1]! + o[2]!) / 3;
    mixInto(o, l * 1.18, l * 1.14, l * 1.06, sun);
  }
  folds(o, a, 40);
  // Creases where the cloth bends: round the knees on trousers, the elbows on sleeves; thin, worn patches there.
  const piece = spec.piece;
  const joint = piece === 'trousers' ? 0.5 : piece.endsWith('sleeve') ? 1.17 : 0;
  if (joint) {
    const j = Math.exp(-(((s.y - joint) / 0.07) ** 2));
    if (j > 0.01) {
      const wav = Math.sin(s.y * 210 + 9 * mottle);
      scaleOut(o, 1 - 0.16 * j * Math.max(0, wav));
      const worn = j * sstep(0.45, 0.7, mottle) * 0.25;
      const l = (o[0]! + o[1]! + o[2]!) / 3;
      mixInto(o, l * 1.3, l * 1.25, l * 1.15, worn);
    }
  }
  // Sweat and grime at the collar and in the armpits.
  if (spec.sweat) {
    const collar = sstep(0.06, 0.0, a[3]!) * 0.5;
    const pit = Math.exp(-(((Math.abs(s.x) - 0.15) / 0.05) ** 2) - ((s.y - 1.33) / 0.07) ** 2) * 0.7;
    const k = (collar + pit) * spec.sweat;
    if (k > 0.002) mixInto(o, o[0]! * 0.6, o[1]! * 0.55, o[2]! * 0.42, Math.min(1, k));
  }
  // Seams down the sides.
  if (spec.seams) {
    const th = a[6]!;
    const radius = Math.abs(th) > 0.15 ? Math.abs(a[0]! / th) : 0.15;
    for (const sa of spec.seams) {
      const m = Math.abs(angDiff(th, sa)) * radius;
      if (m < 0.004) scaleOut(o, 0.7 + 0.3 * (m / 0.004));
      else if (m < 0.009) stitches(o, a[1]!, m, 0.0065, THREAD_DARK, 0.3);
    }
  }
  if (spec.patches) patches(o, s, spec);
  // Working hands are wiped on the front of the thighs and the lower front of whatever hangs there.
  if ((spec.dirt ?? 0) > 0.2 && s.z > 0 && s.y > 0.6 && s.y < 1.05) {
    const wipe = Math.exp(-(((Math.abs(s.x) - 0.13) / 0.07) ** 2) - ((s.y - 0.82) / 0.1) ** 2) * (spec.dirt! - 0.2) * 1.2;
    const k = wipe * (0.5 + 0.6 * mottle);
    if (k > 0.01) mixInto(o, MUD[0] * 1.4, MUD[1] * 1.35, MUD[2] * 1.3, Math.min(0.6, k));
  }
  // Turned edges: the lip and the line just inside the hem are darker; frayed where the cloth is worn.
  const edge = Math.min(a[2]!, a[3]!, a[4]!);
  if (a[8] === 1) scaleOut(o, 0.8);
  else if (edge < 0.007) scaleOut(o, 0.76 + 0.24 * (edge / 0.007));
  if (spec.stitch && edge < 0.02) stitches(o, a[0]! + a[1]!, edge, spec.stitch, THREAD_DARK, 0.5);
  if (spec.trim) trim(o, s, spec);
  dirtOf(o, s, spec, off);
}

function trim(o: Out, s: PixelSurface, spec: PaintSpec) {
  const t = spec.trim!;
  const d = edgeDistance(s.a, t.edge);
  if (d >= t.width) return;
  const k = 1 - sstep(t.width - 0.003, t.width, d);
  const v = 0.85 + 0.3 * fieldAt(s, 0.01, 77);
  mixInto(o, t.color[0] * v, t.color[1] * v, t.color[2] * v, k);
  if (Math.abs(d - (t.width - 0.002)) < 0.0012) scaleOut(o, 0.7);
}

function patches(o: Out, s: PixelSurface, spec: PaintSpec) {
  const a = s.a;
  const th = a[6]!;
  const radius = Math.abs(th) > 0.15 ? Math.abs(a[0]! / th) : 0.15;
  for (let i = 0; i < spec.patches!; i++) {
    const h1 = hash(spec.seed, i * 3 + 1);
    const h2 = hash(spec.seed, i * 3 + 2);
    const h3 = hash(spec.seed, i * 3 + 3);
    const ca = (h1 - 0.5) * 2 * Math.PI;
    const cy = (spec.hemY ?? 0.5) + 0.12 + h2 * 0.45;
    const hw = 0.035 + 0.03 * h3;
    const hh = 0.03 + 0.03 * h2;
    const du = Math.abs(angDiff(th, ca) * radius);
    const dv = Math.abs(s.y - cy);
    if (du > hw || dv > hh) continue;
    const k = 0.72 + 0.3 * h3;
    o[0] = o[0]! * k * (0.92 + 0.16 * h1);
    o[1] = o[1]! * k;
    o[2] = o[2]! * k * (0.9 + 0.12 * h2);
    const border = Math.min(hw - du, hh - dv);
    if (border < 0.004) stitches(o, du + dv, border, 0.0025, THREAD_DARK, 0.6);
  }
}

function paintLeather(o: Out, s: PixelSurface, spec: PaintSpec) {
  const a = s.a;
  const off = offsetOf(spec);
  // Uneven tan, oil and wear.
  const tan = fieldAt(s, 0.035, off);
  scaleOut(o, 0.72 + 0.56 * tan);
  // Creases: thin dark lines where the hide has bent, finer than the hide's broad tan.
  const r = 1 - Math.abs(2 * fieldAt(s, 0.0035, off + 13) - 1);
  scaleOut(o, 1 - 0.2 * sstep(0.9, 0.985, r));
  // Scuffs: paler, drier patches; oil: darker, glossier ones.
  const sc = sstep(0.6, 0.74, fieldAt(s, 0.016, off + 31));
  if (sc > 0.002) mixInto(o, o[0]! * 1.55 + 0.012, o[1]! * 1.48 + 0.01, o[2]! * 1.4 + 0.008, sc * 0.6);
  folds(o, a, 26);
  const piece = spec.piece;
  if (piece === 'boot' || piece === 'shoe') {
    // Creases across the ankle, a scuffed toe, and the sole's edge.
    const ankle = Math.exp(-(((s.y - 0.13) / 0.04) ** 2));
    if (ankle > 0.02) scaleOut(o, 1 - 0.3 * ankle * Math.max(0, Math.sin(s.y * 260 + 6 * r)));
    if (s.z > 0.05 && s.y < 0.09) mixInto(o, o[0]! * 1.6 + 0.01, o[1]! * 1.5 + 0.008, o[2]! * 1.4 + 0.006, sstep(0.05, 0.15, s.z) * 0.45);
    if (s.y < 0.012) scaleOut(o, 0.45);
  }
  if (spec.pattern === 'panels') {
    // Panels stitched together across the body.
    const band = s.y / 0.13;
    const d = Math.abs(band - Math.round(band)) * 0.13;
    if (d < 0.003) scaleOut(o, 0.6);
    else stitches(o, a[0]!, d, 0.0065, THREAD_DARK, 0.45);
  }
  if (spec.pattern === 'studs' || spec.pattern === 'rivets') studs(o, s, spec.pattern === 'studs' ? 0.045 : 0.03);
  // Worn, paler edges with stitching just inside.
  const edge = Math.min(a[2]!, a[3]!, a[4]!);
  const wear = a[8] === 1 ? 0.35 : edge < 0.008 ? 0.45 * (1 - edge / 0.008) : 0;
  if (wear > 0) mixInto(o, o[0]! * 1.5, o[1]! * 1.42, o[2]! * 1.32, wear);
  if (edge < 0.016) stitches(o, a[0]! + a[1]!, edge, spec.stitch ?? 0.007, THREAD_DARK, 0.55);
  if (spec.trim) trim(o, s, spec);
  dirtOf(o, s, spec, off);
}

function studs(o: Out, s: PixelSurface, spacing: number) {
  const a = s.a;
  const u = a[0]! / spacing;
  const v = s.y / spacing + (Math.floor(u) & 1 ? 0.5 : 0);
  const du = (u - Math.round(u)) * spacing;
  const dv = (v - Math.round(v)) * spacing;
  const r = Math.sqrt(du * du + dv * dv);
  if (r > 0.0075) return;
  if (r < 0.0055) {
    const hi = 0.5 + (0.5 * Math.max(0, -du - dv)) / 0.0055;
    o[0] = 0.12 + 0.18 * hi;
    o[1] = 0.11 + 0.16 * hi;
    o[2] = 0.1 + 0.13 * hi;
  } else scaleOut(o, 0.55);
}

function paintPadded(o: Out, s: PixelSurface, spec: PaintSpec) {
  const a = s.a;
  const off = offsetOf(spec);
  scaleOut(o, 0.8 + 0.4 * fieldAt(s, 0.04, off));
  // Vertical quilted channels: a stitched line every few centimetres, the padding puffed between.
  const w = 0.036;
  const u = a[0]! / w;
  const fu = u - Math.floor(u);
  const line = Math.abs(fu - 0.5) * 2;
  scaleOut(o, 0.84 + 0.22 * Math.sin(fu * Math.PI));
  if (line > 0.9) {
    scaleOut(o, 0.66);
    const dash = s.y / 0.007 - Math.floor(s.y / 0.007);
    if (dash < 0.55) mixInto(o, 0.2, 0.18, 0.14, 0.25);
  }
  folds(o, a, 20);
  const edge = Math.min(a[2]!, a[3]!, a[4]!);
  if (a[8] === 1 || edge < 0.006) scaleOut(o, 0.78);
  if (spec.trim) trim(o, s, spec);
  dirtOf(o, s, spec, off);
}

function paintMail(o: Out, s: PixelSurface, spec: PaintSpec) {
  const off = offsetOf(spec);
  scaleOut(o, 0.78 + 0.44 * fieldAt(s, 0.02, off));
  const rust = sstep(0.58, 0.72, fieldAt(s, 0.015, off + 5));
  if (rust > 0.002) mixInto(o, 0.2, 0.085, 0.035, rust * 0.65);
  const edge = Math.min(s.a[2]!, s.a[3]!);
  if (edge < 0.012) scaleOut(o, 0.68 + 0.32 * (edge / 0.012));
  dirtOf(o, s, spec, off);
}

function paintMetal(o: Out, s: PixelSurface, spec: PaintSpec) {
  const off = offsetOf(spec);
  scaleOut(o, 0.74 + 0.5 * fieldAt(s, 0.015, off));
  // Pits and rust.
  if (n3(s.x * 140 + off, s.y * 140, s.z * 140) > 0.84) scaleOut(o, 0.55);
  const rust = sstep(0.58, 0.74, fieldAt(s, 0.01, off + 9));
  if (rust > 0.002) mixInto(o, 0.22, 0.09, 0.035, rust * 0.72);
  // Bright worn edges.
  const edge = Math.min(s.a[2]!, s.a[3]!, s.a[4]!);
  if (s.a[8] === 1 || edge < 0.006) scaleOut(o, 1.35);
  if (spec.pattern === 'rivets') studs(o, s, 0.05);
}

function paintFur(o: Out, s: PixelSurface, spec: PaintSpec) {
  const a = s.a;
  const off = offsetOf(spec);
  // Locks: streaks running down and outward, darker roots, paler tips.
  const lock = n3(a[0]! * 55 + off, s.y * 9, a[0]! * 3);
  const strand = n3(a[0]! * 260 + off, s.y * 30, 1.7);
  scaleOut(o, 0.6 + 0.55 * lock * (0.7 + 0.5 * strand));
  if (spec.tint) mixInto(o, spec.tint[0], spec.tint[1], spec.tint[2], 0.4 * sstep(0.55, 0.9, lock * strand));
  dirtOf(o, s, spec, off);
}

function paintRope(o: Out, s: PixelSurface) {
  const a = s.a;
  const t = a[6]! * 3 + a[1]! * 55;
  const g = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  scaleOut(o, 0.6 + 0.48 * g);
}

function paintSkin(o: Out, s: PixelSurface, spec: PaintSpec) {
  const off = offsetOf(spec);
  // Mottled, outdoor skin; a little redder at the knuckles and finger ends; grime on working hands.
  const m = fieldAt(s, 0.008, off);
  o[0] = o[0]! * (0.88 + 0.24 * m);
  o[1] = o[1]! * (0.9 + 0.2 * m);
  o[2] = o[2]! * (0.91 + 0.18 * m);
  const tip = s.a[7]!;
  if (spec.piece === 'finger' && tip > 0.7) mixInto(o, o[0]! * 1.12, o[1]! * 0.92, o[2]! * 0.88, (tip - 0.7) * 1.4);
  const dirt = spec.dirt ?? 0;
  if (dirt > 0) {
    const g = sstep(0.54, 0.7, fieldAt(s, 0.006, off + 3)) * dirt * 0.45;
    if (g > 0.002) mixInto(o, MUD[0], MUD[1], MUD[2], g);
  }
}

function sampleFace(o: Out, ctx: PaintContext, u: number, v: number) {
  const map = ctx.faceMap!;
  const n = ctx.faceN!;
  const fx = u * n - 0.5;
  const fy = Math.max(0, Math.min(n - 1, v * n - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const xa = ((x0 % n) + n) % n;
  const xb = (xa + 1) % n;
  const ya = y0;
  const yb = Math.min(n - 1, y0 + 1);
  for (let k = 0; k < 3; k++) {
    const p00 = toLinear(map[(ya * n + xa) * 4 + k]!);
    const p10 = toLinear(map[(ya * n + xb) * 4 + k]!);
    const p01 = toLinear(map[(yb * n + xa) * 4 + k]!);
    const p11 = toLinear(map[(yb * n + xb) * 4 + k]!);
    o[k] = (p00 * (1 - tx) + p10 * tx) * (1 - ty) + (p01 * (1 - tx) + p11 * tx) * ty;
  }
}

function paintHair(o: Out, s: PixelSurface, spec: PaintSpec, ctx: PaintContext) {
  const a = s.a;
  if (ctx.faceMap) sampleFace(o, ctx, a[0]!, a[1]!);
  // Locks and strands running from the crown (or the chin) outward; a dull sheen along the tops of the locks.
  const off = offsetOf(spec);
  const lock = n3(a[0]! * 70 + off, a[1]! * 5, 0.5);
  const strand = n3(a[0]! * 330 + off, a[1]! * 14, 4.5);
  scaleOut(o, 0.66 + 0.5 * lock * (0.75 + 0.45 * strand));
  const sheen = sstep(0.62, 0.85, lock) * sstep(0.4, 0.75, a[1]!) * 0.22;
  if (sheen > 0.002) mixInto(o, o[0]! * 1.5 + 0.01, o[1]! * 1.45 + 0.01, o[2]! * 1.4 + 0.01, sheen);
}

function paintEye(o: Out, s: PixelSurface, spec: PaintSpec) {
  const a = s.a;
  let dx = a[6]!;
  let dy = a[7]!;
  let dz = a[8]!;
  const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  dx /= l;
  dy /= l;
  dz /= l;
  const ang = Math.acos(Math.max(-1, Math.min(1, dz)));
  const iris = spec.tint ?? [0.12, 0.08, 0.04];
  if (ang < 0.2) {
    o[0] = 0.012;
    o[1] = 0.011;
    o[2] = 0.01;
  } else if (ang < 0.56) {
    const t = (ang - 0.2) / 0.36;
    const around = Math.atan2(dy, dx);
    const fib = hash(Math.floor(((around + Math.PI) / (Math.PI * 2)) * 56), spec.seed);
    const k = (0.55 + 0.6 * fib) * (0.75 + 0.45 * Math.sin(t * Math.PI)) * (1 - 0.65 * sstep(0.72, 1, t));
    o[0] = iris[0] * k;
    o[1] = iris[1] * k;
    o[2] = iris[2] * k;
  } else {
    // Sclera: a dull off-white, yellowing and reddening toward the corners.
    const t = sstep(0.56, 1.5, ang);
    const side = Math.abs(dx);
    o[0] = 0.3 - t * 0.13 + side * 0.03;
    o[1] = 0.26 - t * 0.13 - side * 0.03;
    o[2] = 0.21 - t * 0.12 - side * 0.04;
  }
  // The upper lid's shadow and lashes over the top of the eye.
  scaleOut(o, 1 - 0.7 * sstep(-0.05, 0.5, dy));
}

/** Eyelids: the painted face just round the eye, with lashes along the upper margin and a moist rim along the lower. */
function paintLid(o: Out, s: PixelSurface, ctx: PaintContext) {
  const a = s.a;
  if (ctx.faceMap) sampleFace(o, ctx, a[0]!, a[1]!);
  const row = a[6]!;
  const upper = a[7]! > 0.5;
  if (row < 1) {
    const k = 1 - row;
    if (upper) mixInto(o, 0.028, 0.022, 0.018, 0.88 * k);
    else mixInto(o, o[0]! * 1.08, o[1]! * 0.72, o[2]! * 0.7, 0.55 * k);
  } else if (upper) {
    // The upper lid lies in the brow's shadow: darker at its fold, a little lighter toward the brow.
    scaleOut(o, 0.62 + 0.05 * Math.min(4, row - 1));
  } else if (row < 2.6) {
    // The lower lid's slight pouch.
    scaleOut(o, 0.9 + 0.04 * (row - 1));
  }
}

function paintPlain(o: Out, s: PixelSurface, spec: PaintSpec) {
  const m = fieldAt(s, 0.006, offsetOf(spec));
  scaleOut(o, 0.92 + 0.16 * m);
}

/** Paint one pixel's surface (linear RGB into `o`, which starts as the surface's base colour). */
export function paintSurface(o: Out, s: PixelSurface, spec: PaintSpec, ctx: PaintContext) {
  o[0] = s.r;
  o[1] = s.g;
  o[2] = s.b;
  switch (spec.surface) {
    case 'linen':
    case 'wool':
    case 'felt':
      paintCloth(o, s, spec);
      break;
    case 'leather':
      paintLeather(o, s, spec);
      break;
    case 'padded':
      paintPadded(o, s, spec);
      break;
    case 'mail':
      paintMail(o, s, spec);
      break;
    case 'metal':
      paintMetal(o, s, spec);
      break;
    case 'fur':
      paintFur(o, s, spec);
      break;
    case 'rope':
      paintRope(o, s);
      break;
    case 'skin':
      paintSkin(o, s, spec);
      break;
    case 'face':
      if (ctx.faceMap) sampleFace(o, ctx, s.a[0]!, s.a[1]!);
      break;
    case 'hair':
    case 'beard':
      paintHair(o, s, spec, ctx);
      break;
    case 'eye':
      paintEye(o, s, spec);
      break;
    case 'lid':
      paintLid(o, s, ctx);
      break;
    case 'ear':
      paintPlain(o, s, spec);
      break;
  }
  o[0] = o[0]! > 0 ? o[0]! : 0;
  o[1] = o[1]! > 0 ? o[1]! : 0;
  o[2] = o[2]! > 0 ? o[2]! : 0;
}

/* ---------------------------------------------------------------- the sheet */

/** A person's merged mesh as the painter needs it: bind positions, base colours, local attributes and parts. */
export interface PaintMesh {
  pos: Float32Array;
  col: Float32Array;
  pa: Float32Array;
  part: Uint16Array;
  index: Uint32Array;
}

/**
 * Paint every covered pixel of a projected sheet, then fill the gutters from the nearest painted pixel. Returns sRGB RGBA
 * rows top to bottom (image order) and the coverage mask.
 */
export function paintSheet(proj: SheetProjection, mesh: PaintMesh, ctx: PaintContext): { rgba: Uint8Array; covered: Uint8Array } {
  const { width: W, height: H } = proj.layout;
  const t = proj.target;
  const rgba = new Uint8Array(W * H * 4);
  const covered = new Uint8Array(W * H);
  const surf: PixelSurface = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, a: new Float32Array(PA) };
  const out = new Float32Array(3);
  const { pos, col, pa, part, index } = mesh;
  const A = surf.a;
  for (let o = 0; o < W * H; o++) {
    const f = t.tri[o]!;
    if (f < 0) continue;
    const ia = index[f * 3]!;
    const ib = index[f * 3 + 1]!;
    const ic = index[f * 3 + 2]!;
    const wb = t.b1[o]!;
    const wc = t.b2[o]!;
    const wa = 1 - wb - wc;
    const a3 = ia * 3;
    const b3 = ib * 3;
    const c3 = ic * 3;
    surf.x = pos[a3]! * wa + pos[b3]! * wb + pos[c3]! * wc;
    surf.y = pos[a3 + 1]! * wa + pos[b3 + 1]! * wb + pos[c3 + 1]! * wc;
    surf.z = pos[a3 + 2]! * wa + pos[b3 + 2]! * wb + pos[c3 + 2]! * wc;
    surf.r = col[a3]! * wa + col[b3]! * wb + col[c3]! * wc;
    surf.g = col[a3 + 1]! * wa + col[b3 + 1]! * wb + col[c3 + 1]! * wc;
    surf.b = col[a3 + 2]! * wa + col[b3 + 2]! * wb + col[c3 + 2]! * wc;
    const ap = ia * PA;
    const bp = ib * PA;
    const cp = ic * PA;
    for (let k = 0; k < PA; k++) A[k] = pa[ap + k]! * wa + pa[bp + k]! * wb + pa[cp + k]! * wc;
    // The turned-edge flag is per vertex, not blendable: take the first vertex's.
    A[8] = pa[ap + 8]!;
    const spec = ctx.parts[part[ia]!]!;
    if (spec.surface === 'face' || spec.surface === 'hair' || spec.surface === 'beard') {
      // The head grid's seam: interpolate u across the back without running through the front.
      const ua = pa[ap]!;
      const ub = pa[bp]!;
      const uc = pa[cp]!;
      if (Math.max(ua, ub, uc) - Math.min(ua, ub, uc) > 0.5) {
        const w = (u: number) => (u < 0.5 ? u + 1 : u);
        A[0] = (w(ua) * wa + w(ub) * wb + w(uc) * wc) % 1;
      }
    }
    paintSurface(out, surf, spec, ctx);
    const q = o * 4;
    rgba[q] = toSrgb(out[0]!);
    rgba[q + 1] = toSrgb(out[1]!);
    rgba[q + 2] = toSrgb(out[2]!);
    rgba[q + 3] = 255;
    covered[o] = 1;
  }
  fillNearest(rgba, covered, W, H);
  return { rgba, covered };
}
