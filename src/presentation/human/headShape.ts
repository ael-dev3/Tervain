import { mulberry32, valueNoise } from '../../world/noise';

/**
 * The shape of a head. A head is lofted through horizontal sections from under the chin (y = -1) to the crown (y = +1)
 * and then sculpted: brow ridge, eye sockets, nose, lips, cheekbones, jaw and chin. The same functions give the face painted
 * onto it (humanTex.ts), the hair cap and the beard, so a brow, a hairline or a moustache lands on the modelled feature.
 * Gothic 3's heads are separate, denser pieces than its bodies, with eyes and mouth in their own regions and hair and
 * beards as separate shells (docs/art/gothic3-reference.md#people); these are original heads built the same way.
 *
 * Proportions follow a real head: the eyes at half the height from chin to crown, the brows a fifth of the way up from
 * them, the base of the nose and the mouth splitting the lower half, the hairline a third of the face above the brows.
 *
 * Unit space: y up (-1 under the chin, +1 the crown), +z the face, x to the person's left. Head space: metres, origin at
 * the rig's head joint in the middle of the neck.
 */

export type Build = 'man' | 'woman' | 'neutral';
export type BeardStyle = 'none' | 'short' | 'full' | 'goatee' | 'moustache';

export interface FaceShape {
  build: Build;
  seed: number;
  eyeX: number;
  eyeY: number;
  browY: number;
  noseTipY: number;
  noseBaseY: number;
  mouthY: number;
  mouthW: number;
  browK: number;
  noseLen: number;
  noseW: number;
  noseHook: number;
  lips: number;
  cheekW: number;
  gaunt: number;
  jawK: number;
  chinK: number;
  /** Hairline: height of its front edge, recession at the temples, the lowest point of the sideburn, the nape. */
  hairFront: number;
  recede: number;
  sideburn: number;
  nape: number;
  /** Metres: half-width, half-height and half-depth scales, and the unit origin above/in front of the head joint. */
  sx: number;
  sy: number;
  sz: number;
  cy: number;
  cz: number;
}

export const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const g = (d: number, s: number) => Math.exp(-(d * d) / (s * s));

/** A stable face from a seed: the build sets the proportions, the seed the particulars, age the hollows and recession. */
export function makeFaceShape(seed: number, build: Build, age: number): FaceShape {
  const rnd = mulberry32((seed ^ 0x5f3759df) >>> 0);
  const r = (a: number, b: number) => a + (b - a) * rnd();
  const w = build === 'woman' ? 1 : build === 'neutral' ? 0.5 : 0;
  const lerp = (m: number, f: number) => m + (f - m) * w;
  const eyeY = r(-0.01, 0.05);
  return {
    build,
    seed,
    eyeX: r(0.36, 0.41),
    eyeY,
    browY: eyeY + r(0.19, 0.24),
    noseTipY: eyeY - lerp(r(0.33, 0.38), r(0.29, 0.33)),
    noseBaseY: eyeY - lerp(r(0.42, 0.47), r(0.38, 0.42)),
    mouthY: eyeY - lerp(r(0.61, 0.66), r(0.58, 0.62)),
    mouthW: lerp(r(0.27, 0.33), r(0.25, 0.3)),
    browK: lerp(r(0.8, 1.3), r(0.2, 0.45)),
    noseLen: lerp(r(0.85, 1.25), r(0.7, 0.92)),
    noseW: lerp(r(0.9, 1.3), r(0.78, 0.95)),
    noseHook: lerp(r(-0.3, 1), r(-0.3, 0.25)),
    lips: lerp(r(0.018, 0.032), r(0.02, 0.03)),
    cheekW: r(0.6, 1.3),
    gaunt: Math.min(1, r(0, 0.5) + age * 0.6) * (1 - 0.55 * w),
    jawK: lerp(r(0.8, 1.2), r(0.2, 0.5)),
    chinK: lerp(r(0.8, 1.3), r(0.6, 0.85)),
    hairFront: 0.62 + r(-0.04, 0.05) + (build === 'woman' ? -0.03 : age * 0.12),
    recede: build === 'woman' ? 0 : Math.max(0, age - 0.35) * r(0.3, 1.1),
    sideburn: lerp(r(-0.3, -0.12), -0.05),
    nape: lerp(r(-0.35, -0.22), -0.4),
    sx: lerp(0.078, 0.073),
    sy: lerp(0.115, 0.108),
    sz: lerp(0.1, 0.095),
    cy: lerp(0.118, 0.11),
    cz: 0.012,
  };
}

/* ---------------------------------------------------------------- sections */

// Man and woman head sections: height, half-width, front, back, centre offset (forward). Below the jaw line the back
// reaches the back of the neck, so the neck enters the head rather than showing behind it.
const SEC_Y = [-1.0, -0.93, -0.85, -0.72, -0.58, -0.42, -0.25, -0.08, 0.08, 0.25, 0.42, 0.6, 0.76, 0.88, 0.96, 1.0];
const MAN = {
  w: [0.14, 0.4, 0.57, 0.72, 0.8, 0.86, 0.91, 0.95, 0.975, 0.99, 0.97, 0.9, 0.76, 0.56, 0.32, 0.02],
  f: [0.12, 0.3, 0.4, 0.5, 0.6, 0.69, 0.78, 0.84, 0.87, 0.91, 0.9, 0.82, 0.66, 0.46, 0.26, 0.02],
  b: [0.12, 0.3, 0.52, 0.92, 1.0, 0.92, 0.84, 0.92, 0.98, 1.03, 1.04, 0.98, 0.84, 0.62, 0.34, 0.02],
  cz: [0.5, 0.49, 0.46, 0.4, 0.32, 0.22, 0.12, 0.05, 0.02, 0, 0, 0, 0, 0, 0, 0],
};
const WOMAN = {
  w: [0.12, 0.35, 0.5, 0.64, 0.74, 0.81, 0.87, 0.93, 0.96, 0.975, 0.955, 0.89, 0.75, 0.55, 0.31, 0.02],
  f: [0.1, 0.27, 0.36, 0.47, 0.58, 0.68, 0.77, 0.83, 0.86, 0.89, 0.88, 0.81, 0.65, 0.45, 0.25, 0.02],
  b: MAN.b,
  cz: MAN.cz,
};

function interp(ys: number[], vs: number[], y: number): number {
  if (y <= ys[0]!) return vs[0]!;
  const n = ys.length;
  if (y >= ys[n - 1]!) return vs[n - 1]!;
  let i = 0;
  while (i < n - 2 && y > ys[i + 1]!) i++;
  // Catmull-Rom through the neighbours, for a smooth profile without corners at the table rows.
  const y0 = ys[i]!;
  const y1 = ys[i + 1]!;
  const t = (y - y0) / (y1 - y0);
  const p0 = vs[Math.max(0, i - 1)]!;
  const p1 = vs[i]!;
  const p2 = vs[i + 1]!;
  const p3 = vs[Math.min(n - 1, i + 2)]!;
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export interface HeadSection {
  w: number;
  f: number;
  b: number;
  cz: number;
  p: number;
}

export function headSection(s: FaceShape, y: number): HeadSection {
  const k = s.build === 'woman' ? 1 : s.build === 'neutral' ? 0.5 : 0;
  const pick = (key: 'w' | 'f' | 'b' | 'cz') => interp(SEC_Y, MAN[key], y) * (1 - k) + interp(SEC_Y, WOMAN[key], y) * k;
  let w = pick('w');
  let f = pick('f');
  const b = pick('b');
  const cz = pick('cz');
  // Jaw: square and wide at its angle on a heavy jaw, narrow on a fine one; chin forward on a strong chin.
  const jaw = sstep(-0.2, -0.62, y) * (1 - sstep(-0.8, -0.98, y));
  w *= 1 + (s.jawK - 0.75) * 0.14 * jaw;
  f += (s.chinK - 0.8) * 0.06 * g(y + 0.84, 0.1);
  // Flatter across the face than behind it; round at the crown.
  const p = 2 + 0.35 * sstep(0.85, 0.2, y) * sstep(-1, -0.7, y);
  return { w, f, b, cz, p };
}

/* ---------------------------------------------------------------- parameterisation */

/** Angle from the front (0 = +z, positive toward +x) for texture u, crowded toward the face. The seam is at the back. */
export function warpU(u: number): number {
  const t = 2 * u - 1;
  const a = 0.42;
  return Math.PI * t * (a + (1 - a) * Math.abs(t));
}

const WV_K = 0.48;
const WV_C = -0.07;

/** Height for texture v (0 under the chin, 1 at the crown), crowded through the band from the mouth to the brows. */
export function warpV(v: number): number {
  const h = v + (WV_K * (Math.sin(2 * Math.PI * (v - WV_C)) + Math.sin(2 * Math.PI * WV_C))) / (2 * Math.PI);
  return -1 + 2 * h;
}

/** Inverse of warpV (Newton; the warp is monotonic). */
export function unwarpV(y: number): number {
  let v = (y + 1) / 2;
  for (let i = 0; i < 10; i++) {
    const f = warpV(v) - y;
    const d = 2 * (1 + WV_K * Math.cos(2 * Math.PI * (v - WV_C)));
    v = Math.min(1, Math.max(0, v - f / d));
  }
  return v;
}

export interface HeadPoint {
  /** Unit-space position before the features are sculpted (the painted landmarks use it). */
  x: number;
  y: number;
  z: number;
  /** Angle from the front. */
  th: number;
  /** 0 behind the ears, 1 on the face. */
  front: number;
}

/** The base surface point for texture coordinates (u, uvY); uvY is 0 under the chin and 1 at the crown. */
export function headPoint(s: FaceShape, u: number, uvY: number): HeadPoint {
  const th = warpU(u);
  const y = warpV(uvY);
  const sec = headSection(s, y);
  const e = 2 / sec.p;
  const sn = Math.sin(th);
  const cs = Math.cos(th);
  const x = sec.w * Math.sign(sn) * Math.pow(Math.abs(sn), e);
  const zz = Math.sign(cs) * Math.pow(Math.abs(cs), e);
  const z = sec.cz + (zz >= 0 ? sec.f : sec.b) * zz;
  return { x, y, z, th, front: sstep(-0.05, 0.55, cs) };
}

/* ---------------------------------------------------------------- sculpt */

/** Displace a base point into the sculpted head (unit space). */
export function sculpt(s: FaceShape, h: HeadPoint): [number, number, number] {
  let { x, y, z } = h;
  const fr = h.front;
  const ax = Math.abs(x);
  const man = s.build === 'man' ? 1 : s.build === 'neutral' ? 0.5 : 0;
  // Forehead slopes back a little above the brows; hollow temples.
  z -= 0.04 * sstep(s.browY + 0.1, s.browY + 0.5, y) * fr;
  x *= 1 - 0.035 * g(y - (s.browY + 0.1), 0.16) * sstep(0.45, 0.85, ax) * fr;
  // Brow ridge: heavier and lower on a man.
  z += s.browK * 0.075 * g(y - (s.browY - 0.02), 0.075) * g(x, 0.62) * fr;
  // Eye sockets under the brow.
  z -= 0.1 * g(ax - s.eyeX, 0.19) * g(y - s.eyeY, 0.12) * fr;
  // Bridge of the nose between the eyes.
  z += 0.05 * g(x, 0.1) * g(y - (s.eyeY + 0.04), 0.12) * fr;
  // Nose: from the bridge to the tip, widening toward the wings; a hook on some.
  const along = sstep(s.eyeY + 0.08, s.noseTipY, y) * (1 - sstep(s.noseTipY + 0.01, s.noseBaseY - 0.015, y));
  const nw = (0.075 + 0.075 * sstep(s.eyeY, s.noseBaseY, y)) * s.noseW;
  z += 0.3 * s.noseLen * along * Math.pow(along, 0.35) * g(x, nw) * fr;
  z += s.noseHook * 0.05 * g(x, 0.07) * g(y - (s.eyeY - 0.12), 0.08) * fr;
  // Wings of the nose, and the base tucking in under the tip.
  z += (0.045 + 0.03 * man) * g(ax - 0.13 * s.noseW, 0.07) * g(y - (s.noseBaseY + 0.05), 0.06) * fr;
  y += 0.02 * s.noseLen * g(x, 0.1) * g(y - (s.noseBaseY + 0.02), 0.04) * fr;
  // Muzzle: the upper jaw and teeth push the mouth forward; the philtrum; the lips and the line between them.
  const mw = s.mouthW;
  z += 0.05 * (0.3 + 0.7 * man) * g(x, 0.42) * g(y - (s.mouthY + 0.1), 0.16) * fr;
  z += (0.018 + 0.012 * man) * g(x, mw) * g(y - (s.mouthY + 0.04), 0.035) * fr;
  z -= (0.024 + 0.011 * man) * g(x, mw * 1.05) * g(y - s.mouthY, 0.014) * fr;
  z += s.lips * g(x, mw * 0.85) * g(y - (s.mouthY - 0.045), 0.035) * fr;
  z -= (0.012 + 0.018 * man) * g(x, 0.3) * g(y - (s.mouthY - 0.13), 0.05) * fr;
  // Chin.
  z += s.chinK * 0.05 * g(x, 0.34) * g(y + 0.86, 0.1) * fr;
  // Cheekbones, and hollows beneath them on a lean or old face.
  x *= 1 + 0.045 * s.cheekW * g(y - (s.eyeY - 0.14), 0.16) * sstep(0.2, 0.7, fr);
  z += 0.035 * g(ax - 0.6, 0.16) * g(y - (s.eyeY - 0.12), 0.12) * fr;
  z -= 0.05 * s.gaunt * g(ax - 0.55, 0.15) * g(y - (s.mouthY + 0.12), 0.14) * fr;
  // The jaw's angle below the ear on a man.
  x *= 1 + 0.05 * man * s.jawK * g(y + 0.62, 0.12) * g(h.th - Math.sign(h.th) * 1.35, 0.4);
  return [x, y, z];
}

/** Unit space to head space (metres). */
export function toHead(s: FaceShape, p: readonly [number, number, number]): [number, number, number] {
  return [p[0] * s.sx, p[1] * s.sy + s.cy, p[2] * s.sz + s.cz];
}

/** Where an eye sits (unit space, before the socket is carved): the base surface straight ahead of the pupil. */
export function eyeBase(s: FaceShape): { x: number; y: number; z: number } {
  const sec = headSection(s, s.eyeY);
  const e = 2 / sec.p;
  // Solve x = w * sin(th)^e for th.
  const sn = Math.pow(Math.min(0.999, s.eyeX / sec.w), 1 / e);
  const cs = Math.sqrt(1 - sn * sn);
  const z = sec.cz + sec.f * Math.pow(cs, e);
  return { x: s.eyeX, y: s.eyeY, z };
}

/* ---------------------------------------------------------------- hair and beard regions */

const HAIR_CTRL: [number, number][] = [
  // angle from the face (rad), hairline height in unit space relative to the front edge
  [0, 0],
  [0.5, -0.04],
  [0.85, -0.2],
  [1.1, -0.42],
  [1.22, -0.55],
  [1.38, -0.4],
  [1.62, -0.52],
  [2.1, -0.75],
  [2.6, -0.92],
  [Math.PI, -0.96],
];

/** Positive where hair grows (unit space, base surface). */
export function hairlineAt(s: FaceShape, x: number, y: number, z: number): number {
  const a = Math.abs(Math.atan2(x, z));
  let base = HAIR_CTRL[HAIR_CTRL.length - 1]![1];
  for (let i = 0; i < HAIR_CTRL.length - 1; i++) {
    const [a0, h0] = HAIR_CTRL[i]!;
    const [a1, h1] = HAIR_CTRL[i + 1]!;
    if (a >= a0 && a <= a1) {
      const t = (a - a0) / (a1 - a0);
      base = h0 + (h1 - h0) * t * t * (3 - 2 * t);
      break;
    }
  }
  let h = s.hairFront + base;
  // Recession at the temples; the sideburn's depth; the nape.
  h += s.recede * 0.4 * g(a - 0.62, 0.3);
  h += (s.sideburn + 0.55 - s.hairFront) * 0.8 * g(a - 1.22, 0.12);
  const back = sstep(1.9, 2.8, a);
  h = h * (1 - back) + s.nape * back;
  h += (valueNoise(a * 9 + (s.seed % 97), y * 3, s.seed) - 0.5) * 0.05;
  return y - h;
}

/** How much beard grows at a point (0..1) for a style (unit space, base surface). */
export function beardAt(s: FaceShape, style: BeardStyle, x: number, y: number, z: number): number {
  if (style === 'none') return 0;
  const a = Math.abs(Math.atan2(x, z - 0.2));
  const mw = s.mouthW;
  const lipsBare = g(x, mw * 1.05) * g(y - (s.mouthY - 0.01), 0.05) * sstep(1.9, 0.9, a);
  const moustache = g(x, mw * 1.45) * sstep(s.mouthY + 0.015, s.mouthY + 0.06, y) * (1 - sstep(s.noseBaseY - 0.03, s.noseBaseY + 0.01, y)) * sstep(1.2, 0.5, a);
  const chin = g(x, 0.36) * (1 - sstep(s.mouthY - 0.14, s.mouthY - 0.07, y)) * sstep(1.3, 0.6, a);
  if (style === 'moustache') return Math.min(1, moustache * 1.3) * (1 - lipsBare);
  if (style === 'goatee') return Math.min(1, Math.max(moustache, chin * 1.3)) * (1 - lipsBare);
  // Short and full beards: along the jaw from ear to ear, up the cheeks toward the cheekbones, meeting the sideburns. A
  // short beard is trimmed to the jaw and chin; the painted stubble carries the cheeks.
  const cheekLine = (style === 'short' ? s.noseBaseY - 0.04 : s.noseBaseY + 0.02) - 0.2 * sstep(0.4, 1.4, a);
  const jaw = (1 - sstep(cheekLine - 0.1, cheekLine, y)) * sstep(1.9, 1.5, a);
  const sideburn = g(a - 1.45, 0.14) * (1 - sstep(s.eyeY - 0.12, s.eyeY - 0.02, y)) * sstep(-0.9, -0.5, y + 0.4);
  const w = Math.max(jaw, sideburn * 0.9, moustache, chin);
  return Math.max(0, Math.min(1, w) * (1 - lipsBare * 1.2));
}
