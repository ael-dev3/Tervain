import * as THREE from 'three';
import { mulberry32 } from '../world/noise';

/**
 * Two small tileable data textures shared by the terrain, water and sky shaders. They are generated once from
 * fixed seeds (no downloads, no assets) so every machine sees the same detail.
 *
 *  detail (RGBA8): R = fractal value noise, G/B = its gradient (0.5 = flat), A = a second independent fractal noise.
 *  cell   (RGBA8): R/G = offset from the pixel to its nearest Voronoi feature point (0.5 = on it),
 *                  B = distance to the nearest cell edge (crack pattern), A = random id of the cell.
 */
export interface NoiseTextures {
  detail: THREE.DataTexture;
  cell: THREE.DataTexture;
}

const SIZE = 256;
let shared: NoiseTextures | null = null;

function hashLattice(ix: number, iy: number, period: number, seed: number): number {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Value noise that repeats every `period` lattice cells. */
function periodicNoise(x: number, y: number, period: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = hashLattice(ix, iy, period, seed);
  const b = hashLattice(ix + 1, iy, period, seed);
  const c = hashLattice(ix, iy + 1, period, seed);
  const d = hashLattice(ix + 1, iy + 1, period, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function fractal(u: number, v: number, base: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let freq = base;
  for (let o = 0; o < octaves; o++) {
    sum += periodicNoise(u * freq, v * freq, freq, seed + o * 31) * amp;
    norm += amp;
    amp *= 0.52;
    freq *= 2;
  }
  return sum / norm;
}

function makeDetail(): THREE.DataTexture {
  const h1 = new Float32Array(SIZE * SIZE);
  const h2 = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const v = y / SIZE;
      h1[y * SIZE + x] = fractal(u, v, 4, 6, 11);
      h2[y * SIZE + x] = fractal(u, v, 3, 5, 77);
    }
  }
  // Remap the first field so it is centred on 0.5 with a decent spread (value noise clusters near the middle).
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of h1) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const span = hi - lo || 1;
  for (let i = 0; i < h1.length; i++) h1[i] = (h1[i]! - lo) / span;
  lo = Infinity;
  hi = -Infinity;
  for (const v of h2) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const span2 = hi - lo || 1;
  for (let i = 0; i < h2.length; i++) h2[i] = (h2[i]! - lo) / span2;

  const data = new Uint8Array(SIZE * SIZE * 4);
  const at = (x: number, y: number) => h1[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]!;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const gx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const gy = (at(x, y + 1) - at(x, y - 1)) * 0.5;
      const k = 22; // gradient range: a full 0..1 ramp across ~11 texels reaches the ends of the byte
      const o = (y * SIZE + x) * 4;
      data[o] = Math.round(h1[y * SIZE + x]! * 255);
      data[o + 1] = Math.round((0.5 + Math.max(-0.5, Math.min(0.5, gx * k * 0.5))) * 255);
      data[o + 2] = Math.round((0.5 + Math.max(-0.5, Math.min(0.5, gy * k * 0.5))) * 255);
      data[o + 3] = Math.round(h2[y * SIZE + x]! * 255);
    }
  }
  return finish(new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType), 'tervain-detail-noise');
}

function makeCell(): THREE.DataTexture {
  const cells = 14;
  const rng = mulberry32(4242);
  const fx = new Float32Array(cells * cells);
  const fy = new Float32Array(cells * cells);
  const id = new Float32Array(cells * cells);
  for (let i = 0; i < cells * cells; i++) {
    fx[i] = 0.12 + rng() * 0.76;
    fy[i] = 0.12 + rng() * 0.76;
    id[i] = rng();
  }
  const wrap = (v: number) => ((v % cells) + cells) % cells;
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const px = ((x + 0.5) / SIZE) * cells;
      const py = ((y + 0.5) / SIZE) * cells;
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      let f1 = Infinity;
      let f2 = Infinity;
      let ox = 0;
      let oy = 0;
      let best = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const ci = wrap(cx + i);
          const cj = wrap(cy + j);
          const k = cj * cells + ci;
          const dx = cx + i + fx[k]! - px;
          const dy = cy + j + fy[k]! - py;
          const d = Math.hypot(dx, dy);
          if (d < f1) {
            f2 = f1;
            f1 = d;
            ox = dx;
            oy = dy;
            best = k;
          } else if (d < f2) f2 = d;
        }
      }
      const o = (y * SIZE + x) * 4;
      // Offsets point from the pixel to the feature point, in cell units (nearest point is always within ~0.9).
      data[o] = Math.round((0.5 - Math.max(-1, Math.min(1, ox)) * 0.5) * 255);
      data[o + 1] = Math.round((0.5 - Math.max(-1, Math.min(1, oy)) * 0.5) * 255);
      data[o + 2] = Math.round(Math.max(0, Math.min(1, (f2 - f1) * 1.6)) * 255);
      data[o + 3] = Math.round(id[best]! * 255);
    }
  }
  return finish(new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType), 'tervain-cell-noise');
}

function finish(tex: THREE.DataTexture, name: string): THREE.DataTexture {
  tex.name = name;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** The shared textures; created on first use and kept for the life of the page. */
export function sharedNoise(): NoiseTextures {
  if (!shared) shared = { detail: makeDetail(), cell: makeCell() };
  return shared;
}
