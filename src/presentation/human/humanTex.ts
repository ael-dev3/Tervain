import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { clamp01, fbmField, sstep, voronoi } from '../procTex';
export { facePixels, type FacePaint } from './facePaint';
import { DETAIL_LAYERS, type DetailLayer } from './paint';

/**
 * Surface detail for people, generated in code as plain pixel arrays (so it works in tests and in Node without a canvas).
 * Gothic 3's people read as real because their faces and clothes are painted: skin with stubble and brows, linen with a
 * visible weave, stitched leather, quilted padding (see docs/art/gothic3-reference.md#people). These are original
 * equivalents: the face painted in the head's own (u, v) parameterisation, which the sheet painter then projects into the
 * person's sheet (paint.ts), and the tiling fine-detail layers the person material multiplies over any sheet.
 */

export type ClothKind = 'linen' | 'wool' | 'leather' | 'padded' | 'mail' | 'felt';

/** Grey detail around 0.86 (a linear factor) for a kind of cloth, `n` square, tiling. */
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
          // Close-woven cotton over wadding: a fine twill and soft lumps (the quilting itself is painted on the sheet).
          const tw = Math.sin((x - y) * 1.3) * 0.035;
          k += tw + (f2[o]! - 0.5) * 0.16 + (f1[o]! - 0.5) * 0.1;
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

/* ---------------------------------------------------------------- fine detail layers */

const DETAIL_N = 128;

/** Normalise a grey field so its mean is 1 and store it as bytes centred on 128 (the shader multiplies by 2 × byte / 255). */
function centred(values: Float32Array): Uint8Array {
  let mean = 0;
  for (let i = 0; i < values.length; i++) mean += values[i]!;
  mean /= values.length;
  const out = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = Math.max(0, Math.min(255, Math.round((values[i]! / mean) * 127.5)));
  return out;
}

function fromRgba(px: Uint8Array, w: number, h: number, n: number): Float32Array {
  const f = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) f[y * n + x] = px[((y % h) * w + (x % w)) * 4]! / 255;
  return f;
}

/**
 * One tiling fine-detail layer, a single channel centred on 1. The sheet carries colour and the broad paint; these carry the
 * weave, grain, pores, strands and rings that a texture of the whole person cannot hold at close range.
 */
export function detailPixels(layer: DetailLayer, n = DETAIL_N): Uint8Array {
  const f = new Float32Array(n * n);
  switch (layer) {
    case 'flat':
      f.fill(1);
      break;
    case 'linen':
    case 'wool':
    case 'leather':
    case 'padded':
    case 'mail':
    case 'felt':
      f.set(fromRgba(clothPixels(layer, n, layer.length * 7 + 3), n, n, n));
      break;
    case 'skin': {
      // Pores and fine mottling: a few percent either way.
      const a = fbmField(n, 24, 24, 2, 211);
      const b = fbmField(n, 64, 64, 1, 212);
      for (let i = 0; i < f.length; i++) f[i] = 1 + (a[i]! - 0.5) * 0.1 + (b[i]! - 0.5) * 0.12;
      break;
    }
    case 'hair':
      f.set(fromRgba(strandPixels(64, 128, 5), 64, 128, n));
      break;
    case 'fur': {
      const s = strandPixels(64, 128, 17);
      const g = fromRgba(s, 64, 128, n);
      const c = fbmField(n, 4, 16, 2, 213);
      for (let i = 0; i < f.length; i++) f[i] = g[i]! * (0.75 + 0.5 * c[i]!);
      break;
    }
    case 'metal': {
      // Fine pits and long scratches.
      const a = fbmField(n, 48, 48, 1, 214);
      const rng = mulberry32(215);
      for (let i = 0; i < f.length; i++) f[i] = 1 + (a[i]! - 0.5) * 0.14;
      for (let k = 0; k < 40; k++) {
        const x0 = rng() * n;
        const y0 = rng() * n;
        const ang = rng() * Math.PI;
        const len = 8 + rng() * 40;
        const dark = rng() < 0.5;
        for (let t = 0; t < len; t++) {
          const x = Math.floor(x0 + Math.cos(ang) * t) & (n - 1);
          const y = Math.floor(y0 + Math.sin(ang) * t) & (n - 1);
          f[y * n + x] = f[y * n + x]! * (dark ? 0.82 : 1.16);
        }
      }
      break;
    }
    case 'rope': {
      const a = fbmField(n, 8, 32, 2, 216);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) f[y * n + x] = 0.85 + 0.3 * Math.abs(Math.sin(((x + y * 2) / n) * Math.PI * 8)) * (0.7 + 0.6 * a[y * n + x]!);
      break;
    }
  }
  return centred(f);
}

let detailArray: THREE.DataArrayTexture | null = null;

/** Every detail layer in one texture array (layer index = DETAIL_LAYERS order). */
export function detailArrayTexture(): THREE.DataArrayTexture {
  if (detailArray) return detailArray;
  const n = DETAIL_N;
  const data = new Uint8Array(n * n * DETAIL_LAYERS.length);
  DETAIL_LAYERS.forEach((layer, i) => data.set(detailPixels(layer, n), i * n * n));
  const t = new THREE.DataArrayTexture(data, n, n, DETAIL_LAYERS.length);
  t.format = THREE.RedFormat;
  t.type = THREE.UnsignedByteType;
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.name = 'person-detail';
  t.needsUpdate = true;
  detailArray = t;
  return t;
}
