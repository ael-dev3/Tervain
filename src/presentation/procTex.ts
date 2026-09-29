/**
 * Small toolkit for procedural, tileable textures: periodic value noise, fractal fields and Worley noise. Used by the
 * terrain layers and by the bark textures. Everything is deterministic (seeded), so every machine gets the same pixels.
 */
export const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export function hashi(x: number, y: number, s: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Periodic value noise: u and v in [0,1), integer periods px and py, so the texture tiles. */
export function pnoise(u: number, v: number, px: number, py: number, seed: number): number {
  const x = u * px;
  const y = v * py;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const x0 = ((ix % px) + px) % px;
  const x1 = (x0 + 1) % px;
  const y0 = ((iy % py) + py) % py;
  const y1 = (y0 + 1) % py;
  const a = hashi(x0, y0, seed);
  const b = hashi(x1, y0, seed);
  const c = hashi(x0, y1, seed);
  const d = hashi(x1, y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Tileable fractal noise field in 0..1, `n` x `n`. `px` and `py` are the periods of the first octave. */
export function fbmField(n: number, px: number, py: number, octaves: number, seed: number): Float32Array {
  const out = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    const v = j / n;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      let amp = 0.5;
      let sum = 0;
      let norm = 0;
      let fx = px;
      let fy = py;
      for (let o = 0; o < octaves; o++) {
        sum += pnoise(u, v, fx, fy, seed + o * 31) * amp;
        norm += amp;
        amp *= 0.5;
        fx *= 2;
        fy *= 2;
      }
      out[j * n + i] = sum / norm;
    }
  }
  return out;
}

export interface Voronoi {
  f1: Float32Array;
  f2: Float32Array;
  id: Float32Array;
}

/** Tileable Worley noise with `cells` x `cellsY` jittered points (cellsY defaults to `cells`). f1/f2 are distances in cell units. */
export function voronoi(n: number, cells: number, seed: number, jitter = 0.9, cellsY = cells): Voronoi {
  const f1 = new Float32Array(n * n);
  const f2 = new Float32Array(n * n);
  const id = new Float32Array(n * n);
  const px = new Float32Array(cells * cellsY);
  const py = new Float32Array(cells * cellsY);
  for (let cy = 0; cy < cellsY; cy++)
    for (let cx = 0; cx < cells; cx++) {
      px[cy * cells + cx] = 0.5 + (hashi(cx, cy, seed) - 0.5) * jitter;
      py[cy * cells + cx] = 0.5 + (hashi(cx, cy, seed + 7) - 0.5) * jitter;
    }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / n) * cells;
      const y = (j / n) * cellsY;
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      let d1 = 9;
      let d2 = 9;
      let best = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const gx = cx + ox;
          const gy = cy + oy;
          const wx = ((gx % cells) + cells) % cells;
          const wy = ((gy % cellsY) + cellsY) % cellsY;
          const k = wy * cells + wx;
          const dx = gx + px[k]! - x;
          const dy = gy + py[k]! - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            best = k;
          } else if (d < d2) d2 = d;
        }
      }
      const o = j * n + i;
      f1[o] = d1;
      f2[o] = d2;
      id[o] = hashi(best, 3, seed + 13);
    }
  }
  return { f1, f2, id };
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};


export type RGB = [number, number, number];
export const mixc = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** Grain speckle in 0..1 from a hash: a stable per-texel random number. */
export const rnd = (o: number, s: number) => hashi(o & 1023, o >> 10, s);
