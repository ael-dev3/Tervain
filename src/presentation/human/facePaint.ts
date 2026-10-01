import { clamp01, fbmField, sstep } from '../procTex';
import { beardAt, hairlineAt, headSection, sculpt, warpU, warpV, type BeardStyle, type FaceShape } from './headShape';

/**
 * The painted face: skin, brows, lips, stubble, beard and the hair on the scalp, painted in the head mesh's own (u, v)
 * parameterisation so every feature lands on the sculpted one. The sheet painter (paint.ts) projects this map into the
 * face panel of the person's sheet. Plain pixel arrays, no three.js, so it runs on a worker thread.
 */

type RGB = [number, number, number];

/** Linear (three.js working space) to sRGB bytes, for textures tagged SRGBColorSpace (a table: faces paint many texels). */
const SRGB_LUT = (() => {
  const t = new Uint8Array(4097);
  for (let i = 0; i <= 4096; i++) {
    const c = i / 4096;
    t[i] = Math.round(clamp01(c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
  }
  return t;
})();
const toSrgb = (c: number) => SRGB_LUT[c <= 0 ? 0 : c >= 1 ? 4096 : Math.round(c * 4096)]!;

export interface FacePaint {
  /** Linear RGB. */
  skin: RGB;
  hair: RGB;
  /** 0 smooth-shaven .. 1 a week's growth; ignored when `fine`. */
  stubble: number;
  /** 0 young .. 1 old. */
  age: number;
  /** Paint hair on the scalp under the hair shell: all of it, only the fringe of a bald crown, or none. */
  scalp: 'full' | 'fringe' | 'none';
  /** A beard painted onto the skin (a short beard is only paint; longer ones get a shell over the paint). */
  beard: BeardStyle;
  /** Thin, arched brows and no stubble. */
  fine: boolean;
  /** Sun and weather on the forehead, nose and cheekbones. */
  weather: number;
  seed: number;
}

const gs = (d: number, s: number) => Math.exp(-(d * d) / (s * s));

/** Distance from (px, py) to the segment (ax, ay)-(bx, by). */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax;
  const vy = by - ay;
  const t = clamp01(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1));
  return Math.hypot(px - ax - vx * t, py - ay - vy * t);
}

/**
 * A face painted in the head mesh's own UV space: every texel is turned back into the head's unit-space point (the same
 * frame the sculpt uses), so brows, lips, nostrils, stubble and the hairline land exactly on the modelled features. Like
 * Gothic 3's painted heads: shadowed sockets, heavy brows, stubble, warm ears and nose, hair painted onto the scalp.
 */
const faceNoise = new Map<number, { mottle: Float32Array; pores: Float32Array; grain: Float32Array; streak: Float32Array }>();

/** Noise fields shared by every face at a size (they tile, so each face reads them at its own offset). */
function faceNoiseFields(n: number) {
  let f = faceNoise.get(n);
  if (!f) {
    f = { mottle: fbmField(n, 6, 6, 3, 101), pores: fbmField(n, 48, 48, 1, 102), grain: fbmField(n, 128, 128, 1, 103), streak: fbmField(n, 96, 8, 2, 104) };
    faceNoise.set(n, f);
  }
  return f;
}

/** Resolution of the relief map (the painted hollows and ridges are broad; a coarse map is plenty). */
const RN = 128;

/**
 * The sculpt's relief as a painter shades it: how far the sculpt pushes each point out from the plain head, minus the
 * average round it. Negative in hollows (sockets, the corners of the nose and mouth, the fold below the lower lip),
 * positive on ridges (brow, bridge of the nose, cheekbones, lips, chin). RN x RN over the head's (u, v).
 */
export function reliefMap(shape: FaceShape): Float32Array {
  const rel = new Float32Array(RN * RN);
  for (let j = 0; j < RN; j++) {
    const y = warpV((j + 0.5) / RN);
    const sec = headSection(shape, y);
    const e = 2 / sec.p;
    for (let i = 0; i < RN; i++) {
      const th = warpU((i + 0.5) / RN);
      const sn = Math.sin(th);
      const cs = Math.cos(th);
      const x = sec.w * Math.sign(sn) * Math.pow(Math.abs(sn), e);
      const zz = Math.sign(cs) * Math.pow(Math.abs(cs), e);
      const z = sec.cz + (zz >= 0 ? sec.f : sec.b) * zz;
      const q = sculpt(shape, { x, y, z, th, front: sstep(-0.05, 0.55, cs) });
      rel[j * RN + i] = (q[0] - x) * sn + (q[2] - z) * cs;
    }
  }
  // High-pass: subtract a blurred copy (two box passes each way; u wraps round the head, v clamps).
  const blur = rel.slice();
  const tmp = new Float32Array(RN * RN);
  const r = 4;
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < RN; j++) {
      for (let i = 0; i < RN; i++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += blur[j * RN + ((i + k + RN) % RN)]!;
        tmp[j * RN + i] = s / (2 * r + 1);
      }
    }
    for (let j = 0; j < RN; j++) {
      for (let i = 0; i < RN; i++) {
        let s = 0;
        for (let k = -r; k <= r; k++) s += tmp[Math.min(RN - 1, Math.max(0, j + k)) * RN + i]!;
        blur[j * RN + i] = s / (2 * r + 1);
      }
    }
  }
  for (let o = 0; o < rel.length; o++) rel[o] = rel[o]! - blur[o]!;
  return rel;
}

/** Bilinear sample of the relief map at texture (u, v). */
function reliefAt(rel: Float32Array, u: number, v: number): number {
  const fx = u * RN - 0.5;
  const fy = Math.max(0, Math.min(RN - 1, v * RN - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const xa = ((x0 % RN) + RN) % RN;
  const xb = (xa + 1) % RN;
  const yb = Math.min(RN - 1, y0 + 1);
  return (rel[y0 * RN + xa]! * (1 - tx) + rel[y0 * RN + xb]! * tx) * (1 - ty) + (rel[yb * RN + xa]! * (1 - tx) + rel[yb * RN + xb]! * tx) * ty;
}

export function facePixels(shape: FaceShape, p: FacePaint, n = 256): Uint8Array {
  const d = new Uint8Array(n * n * 4);
  const fields = faceNoiseFields(n);
  const relief = reliefMap(shape);
  const ox = Math.abs(p.seed * 7919) % n;
  const oy = Math.abs(p.seed * 104729) % n;
  const [sr, sg, sb] = p.skin;
  const grey = sstep(0.5, 0.95, p.age) * 0.7;
  const hairC: RGB = [p.hair[0] * (1 - grey) + 0.34 * grey, p.hair[1] * (1 - grey) + 0.33 * grey, p.hair[2] * (1 - grey) + 0.31 * grey];
  const browC: RGB = [hairC[0] * 0.55, hairC[1] * 0.52, hairC[2] * 0.5];
  const stubC: RGB = [hairC[0] * 0.45 + sr * 0.2, hairC[1] * 0.45 + sg * 0.2, hairC[2] * 0.45 + sb * 0.22];
  const beardGrey = sstep(0.4, 0.9, p.age) * 0.75;
  const beardC: RGB = [p.hair[0] * (1 - beardGrey) + 0.36 * beardGrey, p.hair[1] * (1 - beardGrey) + 0.35 * beardGrey, p.hair[2] * (1 - beardGrey) + 0.33 * beardGrey];
  const { eyeX, eyeY, browY, noseBaseY, noseTipY, mouthY, mouthW: mw, noseW } = shape;
  const fine = p.fine;
  const aged = sstep(0.2, 1, p.age);
  // The head's parameterisation, split so each row's section and each column's angle are computed once.
  const colSin = new Float32Array(n);
  const colCos = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const th = warpU((i + 0.5) / n);
    colSin[i] = Math.sin(th);
    colCos[i] = Math.cos(th);
  }
  const stubbleOn = !fine && p.stubble > 0;
  const beardOn = p.beard !== 'none';
  for (let j = 0; j < n; j++) {
    const y = warpV((j + 0.5) / n);
    const sec = headSection(shape, y);
    const e = 2 / sec.p;
    const nj = ((j + oy) % n) * n;
    // Everything that depends only on the height, once per row.
    const cheekY = gs(y - (eyeY - 0.24), 0.16);
    const noseY = sstep(eyeY - 0.05, noseTipY, y) * (1 - sstep(noseTipY, noseBaseY - 0.02, y));
    const earY = gs(y - (eyeY - 0.15), 0.32);
    const sunY = sstep(browY - 0.05, browY + 0.15, y) * (1 - sstep(0.45, 0.8, y)) * 0.6;
    const boneY = gs(y - (eyeY - 0.12), 0.1) * 0.5;
    const socketY = gs(y - eyeY, 0.13);
    const bagY = gs(y - (eyeY - 0.12), 0.05) * aged;
    const nostrilY = gs(y - (noseBaseY + 0.03), 0.025);
    const underY = gs(y - (noseBaseY - 0.01), 0.03);
    const lipUY = gs(y - (mouthY + 0.03), 0.026);
    const lipLY = gs(y - (mouthY - 0.042), 0.034);
    const nearBrow = Math.abs(y - browY) < 0.16;
    const nearMouth = Math.abs(y - mouthY) < 0.07;
    const foreY = aged > 0 ? Math.pow(Math.max(0, Math.sin((y - browY) * 70)), 5) * sstep(browY + 0.08, browY + 0.14, y) * sstep(browY + 0.42, browY + 0.3, y) : 0;
    const crowY = aged > 0 ? gs(y - eyeY, 0.08) : 0;
    const foldRow = aged > 0 && y < noseBaseY + 0.08 && y > mouthY - 0.1;
    const occlA = 0.22 * sstep(-0.82, -1, y);
    const occlB = 0.1 * sstep(-0.1, -0.7, y);
    const upperStubY = sstep(mouthY + 0.02, mouthY + 0.06, y) * (1 - sstep(noseBaseY - 0.03, noseBaseY + 0.01, y));
    const stubbleRow = stubbleOn && y < noseBaseY + 0.06;
    const beardRow = beardOn && y < eyeY + 0.05;
    const hairRow = p.scalp !== 'none' && y > -0.6;
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      const q = nj + ((i + ox) % n);
      const grainQ = fields.grain[q]!;
      const sn = colSin[i]!;
      const cs = colCos[i]!;
      const x = sec.w * Math.sign(sn) * Math.pow(Math.abs(sn), e);
      const zz = Math.sign(cs) * Math.pow(Math.abs(cs), e);
      const z = sec.cz + (zz >= 0 ? sec.f : sec.b) * zz;
      const ax = Math.abs(x);
      const fr = sstep(-0.05, 0.55, cs);
      let r = sr;
      let g = sg;
      let b = sb;
      // Uneven, outdoor skin.
      const mot = (fields.mottle[q]! - 0.5) * 0.16 + (fields.pores[q]! - 0.5) * 0.07;
      r *= 1 + mot;
      g *= 1 + mot * 0.95;
      b *= 1 + mot * 0.9;
      let lip = 0;
      let line = 0;
      if (fr > 0.002) {
        // Warmth where the blood is near the skin: cheeks and nose; sun on the brow, nose and cheekbones.
        const cheek = cheekY > 0.002 ? gs(ax - 0.52, 0.2) * cheekY * fr : 0;
        const nose = noseY > 0 ? gs(x, 0.15) * noseY * fr : 0;
        const sun = p.weather * fr * (sunY + nose * 0.8 + (boneY > 0.002 ? gs(ax - 0.55, 0.15) * boneY : 0));
        const warm = cheek * 0.55 + nose * 0.5 + sun * 0.5;
        r *= 1 + warm * 0.16;
        g *= 1 - warm * 0.03;
        b *= 1 - warm * 0.1;
        // Shadowed sockets, darker and bruised with age.
        if (socketY > 0.002 || bagY > 0.002) {
          const dx = ax - eyeX;
          const sk = 1 - gs(dx, 0.21) * socketY * fr * (0.3 + p.age * 0.14) - gs(dx, 0.16) * bagY * fr * 0.18;
          r *= sk;
          g *= sk * 0.98;
          b *= sk * 1.02;
        }
        // Brows: thick and straight on a man, finer and arched; they follow the brow ridge and taper outward.
        if (nearBrow) {
          const t = (ax - (eyeX - 0.21)) / 0.43;
          if (t > -0.03 && t < 1.06) {
            const by = browY + (fine ? 0.05 : 0.018) * Math.sin(Math.PI * clamp01(t)) - (fine ? 0.01 : 0.025) * t;
            const bh = fine ? 0.022 : 0.042 - 0.016 * clamp01(t);
            const brow = sstep(-0.03, 0.1, t) * sstep(1.06, 0.82, t) * gs(y - by, bh) * fr;
            const bw = Math.min(1, brow * (0.7 + 0.45 * grainQ)) * (fine ? 0.82 : 0.96);
            r = r * (1 - bw) + browC[0] * bw;
            g = g * (1 - bw) + browC[1] * bw;
            b = b * (1 - bw) + browC[2] * bw;
          }
        }
        // Nostrils, and shade under the nose.
        if (nostrilY > 0.002 || underY > 0.002) {
          const nk = 1 - gs(ax - 0.09 * noseW, 0.04) * nostrilY * fr * (fine ? 0.36 : 0.46) - gs(x, 0.2) * underY * fr * 0.1;
          r *= nk;
          g *= nk;
          b *= nk;
        }
        // Lips, and the mouth's line with its corners turned a little down.
        if (nearMouth) {
          const lipU = gs(x, mw * 0.95) * lipUY * fr;
          const lipL = gs(x, mw * 0.85) * lipLY * fr;
          lip = Math.max(lipU, lipL) * (fine ? 0.8 : 0.45) * (1 - p.age * 0.35);
          line = gs(x, mw * 1.1) * gs(y - (mouthY - 0.03 * (x / mw) ** 2), 0.011) * fr;
          r = r * (1 - lip * 0.02) * (1 - line * 0.6);
          g = g * (1 - lip * 0.3) * (1 - line * 0.66);
          b = b * (1 - lip * 0.24) * (1 - line * 0.66);
        }
        // Age: forehead lines, crow's feet, the folds from the nose to the corners of the mouth.
        if (aged > 0) {
          const fore = foreY > 0 ? foreY * gs(x, 0.45) * fr : 0;
          const crow = crowY > 0.002 ? Math.pow(Math.max(0, Math.sin(Math.atan2(y - eyeY, ax - eyeX - 0.18) * 6)), 8) * gs(ax - eyeX - 0.24, 0.07) * crowY * fr : 0;
          const fold = foldRow ? gs(segDist(ax, y, 0.15 * noseW + 0.05, noseBaseY + 0.04, mw + 0.06, mouthY - 0.06), 0.02) * fr : 0;
          const wr = 1 - aged * (fore * 0.22 + crow * 0.25) - (aged * 0.3 + shape.gaunt * 0.15) * fold;
          r *= wr;
          g *= wr;
          b *= wr;
        }
      }
      // Hollows darker and a touch cooler, ridges a little lighter: the relief the sculpt carves, painted in as
      // Gothic's painted faces carry it, so the face reads at a distance under any light.
      {
        const c = reliefAt(relief, (i + 0.5) / n, (j + 0.5) / n);
        const k = 1 + Math.max(-0.3, Math.min(0.14, c * (c < 0 ? 4.5 : 2.6))) * (0.35 + 0.65 * fr);
        r *= k;
        g *= k * (c < 0 ? 0.985 : 1);
        b *= k * (c < 0 ? 0.975 : 1);
      }
      // Warm ears.
      if (fr < 1 && ax > 0.82) {
        const ear = sstep(0.82, 0.96, ax) * earY * (1 - fr) * 0.45;
        r *= 1 + ear * 0.16;
        g *= 1 - ear * 0.03;
        b *= 1 - ear * 0.1;
      }
      // Under the jaw and at the back of the head, where the light rarely reaches.
      const occl = 1 - occlA - (occlB > 0 ? occlB * sstep(0.2, -0.6, z) : 0);
      r *= occl;
      g *= occl;
      b *= occl;
      // Stubble: grainy growth over the jaw, chin, cheeks and upper lip.
      if (stubbleRow) {
        const a = Math.abs(Math.atan2(x, z - 0.2));
        const cheekLine = noseBaseY + 0.02 - 0.18 * sstep(0.4, 1.4, a);
        const jaw = (1 - sstep(cheekLine - 0.1, cheekLine + 0.02, y)) * sstep(1.95, 1.45, a);
        const upper = upperStubY > 0 ? gs(x, mw * 1.3) * upperStubY * fr : 0;
        const zone = clamp01(Math.max(jaw, upper)) * (1 - lip * 1.8) * (1 - line);
        if (zone > 0) {
          const s = zone * p.stubble * (0.3 + 0.7 * sstep(0.3, 0.75, grainQ)) * 0.8;
          r = r * (1 - s) + stubC[0] * s;
          g = g * (1 - s) + stubC[1] * s;
          b = b * (1 - s) + stubC[2] * s;
        }
      }
      // A painted beard: dense, grainy growth with streaks running down, fading into the stubble at its edge.
      if (beardRow && cs > -0.4) {
        const k = beardAt(shape, p.beard, x, y, z);
        if (k > 0) {
          const dens = Math.min(1, Math.pow(k, 0.7) * (0.72 + 0.4 * grainQ)) * 0.94;
          const str = 0.7 + 0.45 * fields.streak[q]!;
          r = r * (1 - dens) + beardC[0] * str * dens;
          g = g * (1 - dens) + beardC[1] * str * dens;
          b = b * (1 - dens) + beardC[2] * str * dens;
        }
      }
      // The scalp under the hair: painted so the hairline never shows a hard mesh edge. (The face below the front
      // hairline never has hair, so it is skipped.)
      if (hairRow && !(cs > 0.9 && y < shape.hairFront - 0.25)) {
        let hl = hairlineAt(shape, x, y, z);
        // A bald crown keeps a fringe round the back and sides.
        if (p.scalp === 'fringe') hl = Math.min(hl, 0.12 - Math.max(0, y - 0.1) * 1.4 - sstep(1.2, 0.3, Math.abs(Math.atan2(x, z))) * 0.3);
        const hair = sstep(-0.05, 0.03, hl);
        if (hair > 0) {
          const str = 0.62 + 0.5 * fields.streak[q]! * (0.7 + 0.3 * grainQ);
          const k = hair * (0.95 - 0.35 * sstep(0.06, -0.02, hl) * grainQ);
          r = r * (1 - k) + hairC[0] * str * k;
          g = g * (1 - k) + hairC[1] * str * k;
          b = b * (1 - k) + hairC[2] * str * k;
        }
      }
      d[o * 4] = toSrgb(r);
      d[o * 4 + 1] = toSrgb(g);
      d[o * 4 + 2] = toSrgb(b);
      d[o * 4 + 3] = 255;
    }
  }
  return d;
}
