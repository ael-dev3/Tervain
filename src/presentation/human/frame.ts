import type { Build } from './headShape';
import { BI, rigid, sstep, type BoneName, type Influence, type Ring, type RGB, type WeightFn } from './skin';

/**
 * The bind-pose skeleton and body surface of a person, and how the surface is weighted to the bones.
 *
 * Proportions follow the Gothic 3 bodies measured for docs/art/gothic3-reference.md#people (as fractions of stature):
 * crotch 0.50, waist 0.65, chest 0.74, shoulders 0.83, shoulder span 0.29, arm 0.38, head about an eighth. The person
 * stands with the arms hanging, facing +z, feet on y = 0; L is their own left (+x).
 */

export type Region = 'trunk' | 'skirt' | 'hair' | 'armL' | 'armR' | 'legL' | 'legR' | BoneName;

// Trunk sections for a 1.8 m man and woman: height, half-width, front, back, superellipse exponent.
type Row = [number, number, number, number, number];
const TRUNK_M: Row[] = [
  [0.82, 0.14, 0.065, 0.08, 2.2],
  [0.88, 0.16, 0.085, 0.1, 2.3],
  [0.95, 0.172, 0.096, 0.114, 2.4],
  [1.02, 0.166, 0.099, 0.108, 2.4],
  [1.09, 0.152, 0.101, 0.096, 2.5],
  [1.16, 0.153, 0.107, 0.095, 2.5],
  [1.24, 0.162, 0.118, 0.099, 2.6],
  [1.31, 0.17, 0.126, 0.104, 2.7],
  [1.37, 0.176, 0.122, 0.108, 2.7],
  [1.42, 0.182, 0.106, 0.104, 2.6],
  [1.45, 0.174, 0.092, 0.095, 2.4],
  [1.475, 0.148, 0.076, 0.085, 2.2],
  [1.5, 0.104, 0.062, 0.07, 2.0],
  [1.53, 0.066, 0.056, 0.059, 2.0],
  [1.58, 0.058, 0.052, 0.055, 2.0],
  [1.64, 0.049, 0.045, 0.049, 2.0],
];
const TRUNK_F: Row[] = [
  [0.82, 0.145, 0.066, 0.085, 2.2],
  [0.88, 0.172, 0.087, 0.108, 2.3],
  [0.95, 0.186, 0.098, 0.124, 2.4],
  [1.02, 0.172, 0.097, 0.112, 2.4],
  [1.09, 0.138, 0.09, 0.088, 2.5],
  [1.16, 0.137, 0.096, 0.088, 2.5],
  [1.24, 0.148, 0.124, 0.092, 2.5],
  [1.3, 0.155, 0.134, 0.096, 2.6],
  [1.36, 0.16, 0.118, 0.1, 2.6],
  [1.41, 0.172, 0.1, 0.098, 2.5],
  [1.44, 0.17, 0.086, 0.09, 2.4],
  [1.465, 0.136, 0.07, 0.08, 2.2],
  [1.49, 0.088, 0.056, 0.063, 2.0],
  [1.515, 0.056, 0.05, 0.053, 2.0],
  [1.565, 0.05, 0.046, 0.049, 2.0],
  [1.62, 0.043, 0.041, 0.044, 2.0],
];
// Arm radius down from the shoulder joint; leg radius and centre depth down from the hip joint (1.8 m man).
const ARM: [number, number][] = [
  [-0.032, 0.02],
  [-0.016, 0.039],
  [0, 0.048],
  [0.05, 0.049],
  [0.12, 0.044],
  [0.2, 0.039],
  [0.265, 0.035],
  [0.3, 0.038],
  [0.345, 0.039],
  [0.42, 0.033],
  [0.5, 0.027],
  [0.55, 0.025],
];
const LEG: [number, number, number][] = [
  [-0.07, 0.07, 0],
  [0, 0.088, 0.004],
  [0.06, 0.088, 0.005],
  [0.14, 0.082, 0.005],
  [0.24, 0.073, 0.004],
  [0.34, 0.063, 0.002],
  [0.42, 0.054, 0],
  [0.45, 0.051, 0],
  [0.5, 0.052, -0.004],
  [0.57, 0.057, -0.012],
  [0.63, 0.056, -0.012],
  [0.72, 0.046, -0.006],
  [0.8, 0.038, -0.002],
  [0.87, 0.034, 0],
];

function lerpTable(rows: number[][], key: number, col: number): number {
  if (key <= rows[0]![0]!) return rows[0]![col]!;
  const last = rows[rows.length - 1]!;
  if (key >= last[0]!) return last[col]!;
  let i = 0;
  while (key > rows[i + 1]![0]!) i++;
  const a = rows[i]!;
  const b = rows[i + 1]!;
  const t = (key - a[0]!) / (b[0]! - a[0]!);
  const s = t * t * (3 - 2 * t);
  return a[col]! + (b[col]! - a[col]!) * (0.5 * t + 0.5 * s);
}

export interface TrunkSection {
  w: number;
  f: number;
  b: number;
  p: number;
}

export class Frame {
  /** Stature scale (1 = 1.8 m), girth scale, 0 man .. 1 woman. */
  readonly H: number;
  readonly G: number;
  readonly wf: number;
  readonly hipY: number;
  readonly hipX: number;
  readonly torsoY: number;
  readonly headY: number;
  readonly neckY: number;
  readonly shoulderY: number;
  readonly shoulderX: number;
  readonly upper: number;
  readonly fore: number;
  readonly thigh: number;
  readonly shin: number;
  /** Scale for hands and head, which vary less than stature and girth. */
  readonly handScale: number;
  readonly headScale: number;

  constructor(build: Build, height: number, girth: number) {
    this.wf = build === 'woman' ? 1 : build === 'neutral' ? 0.5 : 0;
    // Proposal: women and neutral builds stand a little shorter than a man of the same authored height.
    this.H = height * (1 - 0.06 * this.wf);
    this.G = girth;
    const H = this.H;
    this.hipY = 0.95 * H;
    this.hipX = (0.095 + 0.006 * this.wf) * girth;
    this.torsoY = 1.07 * H;
    this.shoulderY = (1.45 - 0.02 * this.wf) * H;
    this.shoulderX = (0.2 - 0.016 * this.wf) * Math.sqrt(girth);
    this.neckY = (1.495 - 0.015 * this.wf) * H;
    // The head sits low on a thick neck, as Gothic 3's people carry it.
    this.headY = (1.563 - 0.02 * this.wf) * H;
    this.upper = 0.29 * H;
    this.fore = 0.26 * H;
    this.thigh = 0.45 * H;
    this.shin = 0.42 * H;
    // Working hands, a little large for the frame the way Gothic 3 draws them.
    this.handScale = 1.1 * (1 - 0.1 * this.wf) * (0.85 + 0.15 * H) * (0.9 + 0.1 * girth);
    this.headScale = 0.55 + 0.45 * H;
  }

  /** The body's surface at a height (bind space). */
  trunk(y: number): TrunkSection {
    const yy = y / this.H;
    const col = (c: number) => lerpTable(TRUNK_M, yy, c) * (1 - this.wf) + lerpTable(TRUNK_F, yy, c) * this.wf;
    // Shoulders widen with the square root of girth (a stout person is not proportionally broader in the bone).
    const sh = sstep(1.36, 1.46, yy) * (1 - sstep(1.47, 1.5, yy));
    const gw = this.G * (1 - sh) + Math.sqrt(this.G) * sh;
    return { w: col(1) * gw, f: col(2) * this.G, b: col(3) * this.G, p: col(4) };
  }

  trunkRing(y: number, grow: number, c: RGB): Ring {
    const t = this.trunk(y);
    return { y, w: t.w + grow, f: t.f + grow, b: t.b + grow, p: t.p, c };
  }

  /** Arm radius at s metres below the shoulder joint. */
  armR(s: number): number {
    const r = lerpTable(ARM, s / this.H, 1) * this.G * (1 - 0.13 * this.wf);
    return r;
  }

  /** A ring around the hanging arm (side +1 = left, -1 = right). */
  armRing(side: number, s: number, grow: number, c: RGB): Ring {
    const r = this.armR(s) + grow * (1 - 0.5 * sstep(0, -0.032 * this.H, s));
    const lean = 0.012 * sstep(0.04, -0.035, s);
    const fore = sstep(this.upper + 0.06, this.upper + 0.16, s);
    return { y: this.shoulderY - s, w: r * (1 - 0.1 * fore), f: r * (1 + 0.08 * fore), b: r * (1 + 0.08 * fore), cx: side * (this.shoulderX - lean), cz: 0, p: 2, c };
  }

  legR(s: number): number {
    const t = s / this.H;
    const thighK = t < 0.42 ? 1 : 1 - 0.08 * this.wf;
    return lerpTable(LEG, t, 1) * this.G * thighK;
  }

  legCz(s: number): number {
    return lerpTable(LEG, s / this.H, 2) * this.G;
  }

  legRing(side: number, s: number, grow: number, c: RGB): Ring {
    const r = this.legR(s) + grow;
    return { y: this.hipY - s, w: r, f: r, b: r, cx: side * this.hipX, cz: this.legCz(s), p: 2, c };
  }

  /** The hips and both thighs as one section (for skirts, coat tails, trousers' seat). */
  hipsRing(y: number, grow: number, c: RGB): Ring {
    const s = this.hipY - y;
    const lr = this.legR(Math.max(-0.07, s));
    const lz = this.legCz(Math.max(0, s));
    let w = this.hipX + lr + 0.004;
    let f = lr + lz + 0.004;
    let b = lr - lz + 0.006;
    if (y >= 0.82 * this.H) {
      const t = this.trunk(y);
      w = Math.max(w, t.w);
      f = Math.max(f, t.f);
      b = Math.max(b, t.b);
    }
    return { y, w: w + grow, f: f + grow, b: b + grow, p: 2.3, c };
  }

  /** The back of the body at a height (bind space z), for things that hang on it. */
  backZ(y: number): number {
    return -this.trunk(Math.min(y, 1.62 * this.H)).b;
  }

  /* ---------------------------------------------------------------- weights */

  trunkW(x: number, y: number): Influence[] {
    const H = this.H;
    const t = sstep(this.hipY + 0.02 * H, this.hipY + 0.26 * H, y);
    const n = sstep(this.neckY, this.headY + 0.012 * H, y);
    const l = sstep(this.hipY + 0.03 * H, this.hipY - 0.1 * H, y) * sstep(0.015, 0.09, Math.abs(x)) * 0.55;
    const leg = x > 0 ? BI.legL : BI.legR;
    return [
      [BI.hips, (1 - t) * (1 - l)],
      [leg, (1 - t) * l],
      [BI.torso, t * (1 - n)],
      [BI.head, t * n],
    ];
  }

  skirtW(x: number, y: number): Influence[] {
    const below = sstep(this.hipY + 0.02 * this.H, this.hipY - 0.34 * this.H, y) * 0.78;
    if (below <= 0) return this.trunkW(x, y);
    const side = sstep(-0.09, 0.09, x);
    const out: Influence[] = this.trunkW(x, y).map(([b, w]) => [b, w * (1 - below)] as Influence);
    out.push([BI.legL, below * side], [BI.legR, below * (1 - side)]);
    return out;
  }

  armW(side: 'L' | 'R', y: number): Influence[] {
    const s = this.shoulderY - y;
    const a = sstep(-0.04, 0.06, s);
    const e = sstep(this.upper - 0.035, this.upper + 0.03, s);
    return [
      [BI.torso, 1 - a],
      [side === 'L' ? BI.armL : BI.armR, a * (1 - e)],
      [side === 'L' ? BI.elbowL : BI.elbowR, a * e],
    ];
  }

  legW(side: 'L' | 'R', y: number): Influence[] {
    const s = this.hipY - y;
    const h = sstep(-0.07, 0.07, s);
    const k = sstep(this.thigh - 0.045, this.thigh + 0.035, s);
    return [
      [BI.hips, 1 - h],
      [side === 'L' ? BI.legL : BI.legR, h * (1 - k)],
      [side === 'L' ? BI.kneeL : BI.kneeR, h * k],
    ];
  }

  hairW(y: number): Influence[] {
    const q = sstep(this.headY + 0.03, this.headY - 0.16, y);
    return [
      [BI.head, 1 - q],
      [BI.torso, q],
    ];
  }

  weights(region: Region): WeightFn {
    switch (region) {
      case 'trunk':
        return (x, y) => this.trunkW(x, y);
      case 'skirt':
        return (x, y) => this.skirtW(x, y);
      case 'hair':
        return (_x, y) => this.hairW(y);
      case 'armL':
        return (_x, y) => this.armW('L', y);
      case 'armR':
        return (_x, y) => this.armW('R', y);
      case 'legL':
        return (_x, y) => this.legW('L', y);
      case 'legR':
        return (_x, y) => this.legW('R', y);
      default:
        return rigid(region);
    }
  }

  /** Bind-pose joint positions (world space of the rig), parents first, in BONES order. */
  joints(): Record<BoneName, [number, number, number]> {
    const u = this.shoulderY - this.upper;
    const k = this.hipY - this.thigh;
    return {
      hips: [0, this.hipY, 0],
      torso: [0, this.torsoY, 0],
      head: [0, this.headY, 0],
      armL: [this.shoulderX, this.shoulderY, 0],
      elbowL: [this.shoulderX, u, 0],
      armR: [-this.shoulderX, this.shoulderY, 0],
      elbowR: [-this.shoulderX, u, 0],
      legL: [this.hipX, this.hipY, 0],
      kneeL: [this.hipX, k, 0],
      legR: [-this.hipX, this.hipY, 0],
      kneeR: [-this.hipX, k, 0],
    };
  }
}
