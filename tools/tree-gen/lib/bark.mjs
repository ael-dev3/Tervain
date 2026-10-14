// Procedural, seamlessly tileable oak bark: albedo (with its cavity darkening baked in) + tangent-space normal map.
// Everything is periodic on the unit square, so the glTF sampler can REPEAT it in both directions.
import { makeRng, smoothstep, lerp, clamp } from './util.mjs';

/** Periodic gradient noise, lattice period (px, py); output about -0.7..0.7. */
function makePNoise(seed) {
  const rng = makeRng(seed), table = new Float32Array(256 * 2);
  for (let i = 0; i < 256; i++) { const a = rng() * Math.PI * 2; table[i * 2] = Math.cos(a); table[i * 2 + 1] = Math.sin(a); }
  const perm = new Uint8Array(512); const order = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = order[i & 255];
  return (x, y, px, py) => {
    const fx0 = Math.floor(x), fy0 = Math.floor(y), tx = x - fx0, ty = y - fy0;
    const x0 = ((fx0 % px) + px) % px, y0 = ((fy0 % py) + py) % py, x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
    const g = (ix, iy, dx, dy) => { const k = perm[(perm[ix & 255] + iy) & 511] * 2; return table[k] * dx + table[k + 1] * dy; };
    const u = tx * tx * tx * (tx * (tx * 6 - 15) + 10), v = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
    const a = g(x0, y0, tx, ty), b = g(x1, y0, tx - 1, ty), c = g(x0, y1, tx, ty - 1), d = g(x1, y1, tx - 1, ty - 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
}


/** Periodic Worley noise on the unit tile with gx x gy cells; returns F2 - F1 and F1 in cell units. */
function makeWorley(seed) {
  const hash = (x, y, k) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k + seed * 131, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  return (x, y, gx, gy) => {
    const cx = Math.floor(x * gx), cy = Math.floor(y * gy); let f1 = 9, f2 = 9;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const nx = cx + i, ny = cy + j, wx = ((nx % gx) + gx) % gx, wy = ((ny % gy) + gy) % gy;
      const px = nx + 0.15 + 0.7 * hash(wx, wy, 1), py = ny + 0.15 + 0.7 * hash(wx, wy, 2);
      const dx = px - x * gx, dy = py - y * gy, d = Math.sqrt(dx * dx + dy * dy);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    return [f2 - f1, f1];
  };
}

export const BARK_SIZE = 2048;

/** Returns { albedo: Uint8Array(S*S*3), normal: Uint8Array(S*S*3), height: Float32Array(256*256) (0..1, for vertex relief) }. */
export function generateBark(size = BARK_SIZE, seed = 7) {
  const pn = makePNoise(seed), pw = makePNoise(seed + 101), pt = makePNoise(seed + 202), wo = makeWorley(seed);
  const S = size, H = new Float32Array(S * S), albedoTint = new Float32Array(S * S);
  const TAU = 1;
  for (let j = 0; j < S; j++) {
    const v = j / S;
    for (let i = 0; i < S; i++) {
      const u = i / S;
      // Domain warp keeps furrows wandering and forking instead of ruler-straight.
      // Lines meander along the trunk: the horizontal warp is a function of height.
      const wx = 0.03 * pw(v * 4 + u * 2, u * 3, 4, 3) + 0.012 * pw(v * 11, u * 7 + 2, 11, 7);
      const wy = 0.02 * pw(u * 5 + 9, v * 2 + 2, 5, 2);
      const x = u + wx, y = v + wy;
      // Long ridges: very tall Worley cells; fissure width varies along its length; finer weaker fissures and grain.
      const [d1, c1] = wo(x, y, 11, 2), [d2] = wo(x + 0.31, y + 0.17, 23, 4);
      const wv = 0.1 + 0.22 * (0.5 + pt(u * 3 + 2, v * 9, 3, 9));
      const s1 = smoothstep(0.0, wv, d1), s2 = smoothstep(0.0, 0.3, d2);
      let h = Math.min(s1, 0.55 + 0.45 * s2) * (0.74 + 0.26 * smoothstep(0.9, 0.2, c1)) * 0.9 + 0.1;
      // occasional cross cracks that cut a ridge into blocks
      h *= 1 - 0.55 * smoothstep(0.25, 0.0, Math.abs(pt(x * 3 + 7, y * 14 + 2, 3, 14))) * smoothstep(0.1, 0.5, s1);
      h += 0.05 * pn(x * 36, y * 5, 36, 5) + 0.06 * pn(x * 150, y * 10, 150, 10) + 0.03 * pn(x * 280, y * 40, 280, 40);
      H[j * S + i] = clamp(h * 0.82, 0, 1);
      albedoTint[j * S + i] = pt(u * 3 + 1, v * 3, 3, 3) * 0.7 + 0.5 * pt(u * 13, v * 17 + 5, 13, 17);
    }
  }
  // Lichen/moss blobs need a low-frequency mask.
  const albedo = new Uint8Array(S * S * 3), normal = new Uint8Array(S * S * 3);
  const k = 5.5;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const n = j * S + i, h = H[n];
    const l = H[j * S + ((i + S - 1) % S)], r = H[j * S + ((i + 1) % S)], up = H[((j + S - 1) % S) * S + i], dn = H[((j + 1) % S) * S + i];
    let nx = -(r - l) * k * 3.2, ny = (dn - up) * k * 3.2, nz = 1;
    const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
    normal[n * 3] = Math.round((nx * 0.5 + 0.5) * 255); normal[n * 3 + 1] = Math.round((ny * 0.5 + 0.5) * 255); normal[n * 3 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    const ridge = smoothstep(0.12, 0.42, h), cavity = (0.5 + 0.6 * smoothstep(0.35, 0.85, h)) * (0.55 + 0.45 * smoothstep(0.05, 0.4, h));
    const tint = albedoTint[n];
    const lich = smoothstep(0.1, 0.4, tint) * ridge * 0.45;
    // sRGB colours: furrow near-black brown, ridge warm grey-brown, lichen grey-green.
    let R = lerp(38, 124, ridge), G = lerp(30, 106, ridge), B = lerp(23, 90, ridge);
    R = lerp(R, 92, lich); G = lerp(G, 100, lich); B = lerp(B, 78, lich);
    const warm = 1 + tint * 0.18;
    R *= warm * cavity; G *= (1 + tint * 0.08) * cavity; B *= (1 - tint * 0.06) * cavity;
    albedo[n * 3] = clamp(Math.round(R), 0, 255); albedo[n * 3 + 1] = clamp(Math.round(G), 0, 255); albedo[n * 3 + 2] = clamp(Math.round(B), 0, 255);
  }
  // 256 x 256 box-filtered height for the vertex relief.
  const D = 256, f = S / D, height = new Float32Array(D * D);
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    let s = 0; for (let b = 0; b < f; b++) for (let a = 0; a < f; a++) s += H[(j * f + b) * S + i * f + a];
    height[j * D + i] = s / (f * f);
  }
  void TAU;
  return { albedo, normal, height, size: S, heightSize: D };
}

/** Bilinear periodic lookup of the relief height (0..1) at texture coordinates (u, v). */
export function barkHeight(bark, u, v) {
  const D = bark.heightSize, x = ((u % 1) + 1) % 1 * D, y = ((v % 1) + 1) % 1 * D;
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0, x1 = (x0 + 1) % D, y1 = (y0 + 1) % D, h = bark.height;
  return lerp(lerp(h[y0 * D + x0], h[y0 * D + x1], tx), lerp(h[y1 * D + x0], h[y1 * D + x1], tx), ty);
}
