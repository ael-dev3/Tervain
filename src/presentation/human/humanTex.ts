import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { clamp01, fbmField, sstep, voronoi } from '../procTex';
import { beardAt, hairlineAt, headSection, warpU, warpV, type BeardStyle, type FaceShape } from './headShape';

/**
 * Surface detail for people, generated in code as plain pixel arrays (so it works in tests without a canvas) and wrapped
 * in DataTextures. Gothic 3's people read as real because their faces and clothes are painted: skin with stubble and brows,
 * linen with a visible weave, stitched leather, quilted padding (see docs/art/gothic3-reference.md#people). These are
 * original equivalents: tiling detail maps that multiply a garment's vertex colours, a strand map for hair and beards, and
 * one face painted per character in the head's own UV space.
 */

export type ClothKind = 'linen' | 'wool' | 'leather' | 'padded' | 'mail' | 'felt';

const texCache = new Map<string, THREE.DataTexture>();

/** Colour images (faces, eyes) are sRGB; detail maps that multiply a vertex colour are plain linear factors. */
function dataTexture(key: string, w: number, h: number, data: Uint8Array, repeat = true, srgb = !repeat): THREE.DataTexture {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  t.name = key;
  return t;
}

/** Grey detail around 0.86 (a linear factor), so multiplying a vertex colour keeps its tone and adds surface. */
export function clothPixels(kind: ClothKind, n = 128, seed = 11): Uint8Array {
  const d = new Uint8Array(n * n * 4);
  const f1 = fbmField(n, 8, 8, 3, seed);
  const f2 = fbmField(n, 32, 32, 2, seed + 1);
  const cr = kind === 'leather' ? voronoi(n, 7, seed + 2, 0.95) : null;
  const rng = mulberry32(seed + 3);
  const slub = new Float32Array(n);
  for (let i = 0; i < n; i++) slub[i] = (rng() - 0.5) * 0.12;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const o = y * n + x;
      let k = 0.86 + (f1[o]! - 0.5) * 0.16;
      switch (kind) {
        case 'linen': {
          // A plain weave: warp and weft threads crossing every two pixels, slubs along some threads.
          const wv = ((x >> 1) + (y >> 1)) & 1 ? 0.07 : -0.07;
          k += wv * (0.6 + f2[o]! * 0.6) + slub[x]! * 0.6 + slub[y]! * 0.4;
          break;
        }
        case 'wool': {
          // Coarser, fulled cloth: fuzz and a faint twill running diagonally.
          const tw = Math.sin((x + y) * 0.9) * 0.04;
          k += (f2[o]! - 0.5) * 0.24 + tw;
          break;
        }
        case 'leather': {
          const crease = 1 - sstep(0, 0.045, cr!.f2[o]! - cr!.f1[o]!);
          k += (f2[o]! - 0.5) * 0.14 - crease * 0.2 + sstep(0.62, 0.9, f1[o]!) * 0.12;
          break;
        }
        case 'padded': {
          // Quilting: stitched diamonds with the padding puffed between them.
          const a = (x + y) / (n / 6);
          const b = (x - y + n) / (n / 6);
          const du = Math.abs(a - Math.round(a));
          const dv = Math.abs(b - Math.round(b));
          const seam = 1 - sstep(0.0, 0.06, Math.min(du, dv));
          const puff = Math.sin(du * Math.PI) * Math.sin(dv * Math.PI);
          k += puff * 0.1 - seam * 0.3 + (f2[o]! - 0.5) * 0.12;
          break;
        }
        case 'mail': {
          // Rows of rings: bright on each ring's upper curve, dark in its centre.
          const rx = ((x % 8) + (((y >> 3) & 1) ? 4 : 0)) % 8 - 4;
          const ry = (y % 8) - 4;
          const r = Math.hypot(rx, ry);
          const ring = sstep(1.2, 2.2, r) * (1 - sstep(3.2, 4.2, r));
          k = 0.42 + ring * (0.55 + (ry < 0 ? 0.25 : -0.05)) + (f2[o]! - 0.5) * 0.1;
          break;
        }
        case 'felt':
          k += (f2[o]! - 0.5) * 0.2 + (f1[o]! - 0.5) * 0.1;
          break;
      }
      const v = Math.round(clamp01(k) * 255);
      d[o * 4] = v;
      d[o * 4 + 1] = v;
      d[o * 4 + 2] = v;
      d[o * 4 + 3] = 255;
    }
  }
  return d;
}

export function clothTexture(kind: ClothKind): THREE.DataTexture {
  const key = `cloth:${kind}`;
  let t = texCache.get(key);
  if (!t) {
    const n = kind === 'mail' ? 64 : 128;
    t = dataTexture(key, n, n, clothPixels(kind, n, kind.length * 7 + 3));
    texCache.set(key, t);
  }
  return t;
}

/** Hair and beard strands: streaks running along v (from the crown or chin outward), with darker partings between locks. */
export function strandPixels(w = 64, h = 128, seed = 5): Uint8Array {
  const d = new Uint8Array(w * h * 4);
  const rng = mulberry32(seed);
  const lock = new Float32Array(w);
  const fine = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    lock[x] = rng();
    fine[x] = rng();
  }
  const along = fbmField(w, 2, 6, 2, seed + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * w + x;
      const lockK = 0.8 + 0.3 * Math.sin((x / w) * Math.PI * 12 + lock[(x >> 2) % w]! * 6);
      const strand = 0.78 + 0.34 * fine[x]!;
      const k = clamp01(lockK * strand * (0.85 + 0.3 * along[(y % w) * w + x]!) * 0.9);
      const v = Math.round(k * 255);
      d[o * 4] = v;
      d[o * 4 + 1] = v;
      d[o * 4 + 2] = v;
      d[o * 4 + 3] = 255;
    }
  }
  return d;
}

export function strandTexture(): THREE.DataTexture {
  const key = 'strands';
  let t = texCache.get(key);
  if (!t) {
    t = dataTexture(key, 64, 128, strandPixels());
    texCache.set(key, t);
  }
  return t;
}

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

export function facePixels(shape: FaceShape, p: FacePaint, n = 256): Uint8Array {
  const d = new Uint8Array(n * n * 4);
  const fields = faceNoiseFields(n);
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
          const nk = 1 - gs(ax - 0.085 * noseW, 0.045) * nostrilY * fr * (fine ? 0.42 : 0.6) - gs(x, 0.2) * underY * fr * 0.15;
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

export function faceTexture(shape: FaceShape, paint: FacePaint, n = 256): THREE.DataTexture {
  const t = dataTexture(`face:${paint.seed}`, n, n, facePixels(shape, paint, n), false, true);
  // The head's texture meets itself at the back seam.
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/**
 * An eye, painted for a UV sphere whose +z pole looks forward (texture (0.25, 0.5)): a darker ring round the iris, fibres
 * radiating from the pupil, a sclera that yellows and reddens toward the corners.
 */
export function eyePixels(iris: RGB, w = 128, h = 64): Uint8Array {
  const d = new Uint8Array(w * h * 4);
  const rng = mulberry32(Math.round(iris[0] * 997 + iris[1] * 131 + iris[2] * 17));
  const fib = Array.from({ length: 48 }, () => rng());
  for (let j = 0; j < h; j++) {
    const th = (1 - (j + 0.5) / h) * Math.PI;
    for (let i = 0; i < w; i++) {
      const ph = ((i + 0.5) / w) * Math.PI * 2;
      const dx = -Math.cos(ph) * Math.sin(th);
      const dy = Math.cos(th);
      const dz = Math.sin(ph) * Math.sin(th);
      const ang = Math.acos(Math.max(-1, Math.min(1, dz)));
      const around = Math.atan2(dy, dx);
      let c: RGB;
      if (ang < 0.21) c = [0.012, 0.011, 0.01];
      else if (ang < 0.58) {
        const t = (ang - 0.21) / 0.37;
        const f = fib[Math.floor(((around + Math.PI) / (Math.PI * 2)) * 48) % 48]!;
        const k = (0.55 + 0.6 * f) * (0.75 + 0.45 * Math.sin(t * Math.PI)) * (1 - 0.6 * sstep(0.75, 1, t));
        c = [iris[0] * k, iris[1] * k, iris[2] * k];
      } else {
        const t = sstep(0.58, 1.6, ang);
        const side = Math.abs(dx);
        c = [0.4 - t * 0.16 + side * 0.03, 0.36 - t * 0.16 - side * 0.03, 0.31 - t * 0.15 - side * 0.04];
      }
      const o = (j * w + i) * 4;
      d[o] = toSrgb(c[0]);
      d[o + 1] = toSrgb(c[1]);
      d[o + 2] = toSrgb(c[2]);
      d[o + 3] = 255;
    }
  }
  return d;
}

export function eyeTexture(iris: RGB): THREE.DataTexture {
  const key = `eye:${iris.map((v) => v.toFixed(3)).join(',')}`;
  let t = texCache.get(key);
  if (!t) {
    t = dataTexture(key, 128, 64, eyePixels(iris), false);
    texCache.set(key, t);
  }
  return t;
}
