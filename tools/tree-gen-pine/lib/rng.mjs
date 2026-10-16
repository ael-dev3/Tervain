/** Small deterministic helpers (duplicated on purpose: tools/tree-gen-pine shares no files with other generators). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Periodic value noise on a gx x gy lattice; (x, y) in lattice units, wraps. */
export function pnoise(x, y, gx, gy, s = 0) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const m = (v, n) => ((v % n) + n) % n;
  const a = hash2(m(x0, gx), m(y0, gy), s), b = hash2(m(x0 + 1, gx), m(y0, gy), s);
  const c = hash2(m(x0, gx), m(y0 + 1, gy), s), d = hash2(m(x0 + 1, gx), m(y0 + 1, gy), s);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}
