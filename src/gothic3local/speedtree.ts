import { latin1 } from './binary';

/**
 * SpeedTree definitions (.spt, "__IdvSpt_02_"), as observed: a stream of tokens, each a u32 id and a payload of no
 * bytes, one byte, four bytes, or a u32 length and characters. The tree's geometry is not stored: SpeedTree's runtime
 * grows it from these parameters, and that algorithm is not public. This module only reads the parameters this viewer
 * uses to grow trees of its own (trees.ts):
 *
 *   2000 bark image   2001 size (cm)   2003 size variance (cm)
 *   per branch level (tokens 6000–6017 between 1016 and 1017): 6004 length and 6005 radius (fractions, as
 *   "BezierSpline min max variance {…}"), 6007 start angle (degrees), 6012 a frequency
 *   4003 leaf image   14002 frond image   20002 composite image and 20005 a region of it (4 corner UVs)
 *
 * The leaf and frond images are names from the tree's authoring; the installed game has only the composite images,
 * and the 20005 region (where it is not the whole image) frames the tree's billboards, not its leaves.
 */

export interface SplineValue {
  min: number;
  max: number;
  variance: number;
}

export interface BranchLevel {
  length: SplineValue;
  radius: SplineValue;
  angle: SplineValue;
  frequency: number;
}

export interface SpeedTreeDef {
  bark: string;
  size: number;
  sizeVariance: number;
  levels: BranchLevel[];
  leaf: string;
  frond: string;
  composite: string;
  /** The region 20005 gives in the composite image (u0, v0, u1, v1), where it is not the whole image. */
  billboardRegion: [number, number, number, number] | null;
}

// Token ids come in blocks of a thousand with small offsets (1000–1017, 2000–2007, 6000–6017, 20000–20005, …).
const VALID = (id: number) => id >= 1000 && id < 30000 && id % 1000 < 32;

/** Payload sizes tried when checking that a token leads on to another: the common ones first. */
const CHAIN_SIZES = [0, 4, 1, 8, 12, 16, 24, 32, ...Array.from({ length: 64 }, (_, i) => i + 1).filter((n) => ![1, 4, 8, 12, 16, 24, 32].includes(n))];

interface Token {
  id: number;
  at: number;
  /** Payload bytes. */
  data: Uint8Array;
}

function printable(b: Uint8Array): boolean {
  for (const c of b) if (c !== 9 && c !== 10 && c !== 13 && (c < 32 || c > 126)) return false;
  return true;
}

/**
 * Split a definition into tokens. A payload's size is not stored, so it is taken as the first that leads to a valid
 * token id that itself leads on to another (a string when a printable, length-prefixed run fits); failing that, the
 * stream resynchronises on the next such pair within a short distance.
 */
export function tokenize(bytes: Uint8Array): Token[] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: Token[] = [];
  let p = 0;
  const validAt = (q: number) => q === bytes.length || (q + 4 <= bytes.length && VALID(v.getUint32(q, true)));
  /** The size of a string payload at `at` (u32 length, printable characters), or -1. */
  const stringAt = (at: number) => {
    if (at + 4 > bytes.length) return -1;
    const n = v.getUint32(at, true);
    return n > 0 && n < 8192 && at + 4 + n <= bytes.length && printable(bytes.subarray(at + 4, at + 4 + n)) ? 4 + n : -1;
  };
  /** A valid token at q whose payload (a string, or up to 64 bytes) leads to another valid token. */
  const chainAt = (q: number) => {
    if (q === bytes.length) return true;
    if (!validAt(q)) return false;
    const s = stringAt(q + 4);
    if (s > 0 && validAt(q + 4 + s)) return true;
    for (const k of CHAIN_SIZES) if (q + 4 + k <= bytes.length && validAt(q + 4 + k)) return true;
    return false;
  };
  while (p + 4 <= bytes.length) {
    const id = v.getUint32(p, true);
    if (!VALID(id)) break;
    const at = p + 4;
    const str = stringAt(at);
    if (str > 0 && chainAt(at + str)) {
      out.push({ id, at, data: bytes.subarray(at + 4, at + str) });
      p = at + str;
      continue;
    }
    // An empty payload first: a following valid id is rarely a value (floats are large, counts small).
    let size = -1;
    for (const s of [0, 4, 1]) {
      if (at + s <= bytes.length && chainAt(at + s)) {
        size = s;
        break;
      }
    }
    if (size < 0) for (let s = 2; s <= 96 && at + s <= bytes.length; s++) if (chainAt(at + s)) {
      size = s;
      break;
    }
    if (size < 0) break;
    out.push({ id, at, data: bytes.subarray(at, at + size) });
    p = at + size;
  }
  return out;
}

function f32(t: Token | undefined, fallback = 0): number {
  if (!t || t.data.length < 4) return fallback;
  return new DataView(t.data.buffer, t.data.byteOffset, 4).getFloat32(0, true);
}

function text(t: Token | undefined): string {
  return t && t.data.length > 0 && printable(t.data) ? latin1(t.data) : '';
}

/** "BezierSpline min max variance { … }" → its three numbers. */
export function splineValue(t: Token | undefined): SplineValue {
  const m = /BezierSpline\s+(-?[\d.e+-]+)\s+(-?[\d.e+-]+)\s+(-?[\d.e+-]+)/.exec(text(t));
  if (!m) return { min: 0, max: 0, variance: 0 };
  return { min: Number(m[1]), max: Number(m[2]), variance: Number(m[3]) };
}

export function parseSpeedTree(bytes: Uint8Array): SpeedTreeDef {
  const tokens = tokenize(bytes);
  if (!tokens.length || !text(tokens[0]).startsWith('__IdvSpt')) throw new Error('not a SpeedTree definition');
  const first = (id: number) => tokens.find((t) => t.id === id);
  const levels: BranchLevel[] = [];
  let current: Token[] | null = null;
  for (const t of tokens) {
    if (t.id === 1016) current = [];
    else if (t.id === 1017 && current) {
      const get = (id: number) => current!.find((x) => x.id === id);
      levels.push({ length: splineValue(get(6004)), radius: splineValue(get(6005)), angle: splineValue(get(6007)), frequency: f32(get(6012), 0) });
      current = null;
    } else if (current) current.push(t);
  }
  // A region of the composite image: four corners (u, v) as eight floats.
  let billboardRegion: SpeedTreeDef['billboardRegion'] = null;
  const region = first(20005);
  if (region && region.data.length >= 32) {
    const v = new DataView(region.data.buffer, region.data.byteOffset, region.data.byteLength);
    const us: number[] = [];
    const vs: number[] = [];
    for (let i = 0; i < 4; i++) {
      us.push(v.getFloat32(i * 8, true));
      vs.push(v.getFloat32(i * 8 + 4, true));
    }
    const box: [number, number, number, number] = [Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs)];
    const whole = box[0] === 0 && box[1] === 0 && box[2] === 1 && box[3] === 1;
    if (!whole && us.every((x) => x >= 0 && x <= 1) && vs.every((x) => x >= 0 && x <= 1)) billboardRegion = box;
  }
  return {
    bark: text(first(2000)),
    size: f32(first(2001), 600),
    sizeVariance: f32(first(2003), 0),
    levels,
    leaf: text(first(4003)),
    frond: text(first(14002)),
    composite: text(first(20002)),
    billboardRegion,
  };
}
