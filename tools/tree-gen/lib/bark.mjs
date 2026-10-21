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
    const cx = Math.floor(x * gx), cy = Math.floor(y * gy); let f1 = 9, f2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const nx = cx + i, ny = cy + j, wx = ((nx % gx) + gx) % gx, wy = ((ny % gy) + gy) % gy;
      const px = nx + 0.15 + 0.7 * hash(wx, wy, 1), py = ny + 0.15 + 0.7 * hash(wx, wy, 2);
      const dx = px - x * gx, dy = py - y * gy, d = Math.sqrt(dx * dx + dy * dy);
      if (d < f1) { f2 = f1; f1 = d; id = hash(wx, wy, 3); } else if (d < f2) f2 = d;
    }
    return [f2 - f1, f1, id];
  };
}

export const BARK_SIZE = 2048;

/** Returns { albedo: Uint8Array(S*S*3), normal: Uint8Array(S*S*3), height: Float32Array(256*256) (0..1, for vertex relief), twigU }. */
export function generateBark(size = BARK_SIZE, seed = 7) {
  const pn = makePNoise(seed), pw = makePNoise(seed + 101), pt = makePNoise(seed + 202), pm = makePNoise(seed + 303), wo = makeWorley(seed), wo2 = makeWorley(seed + 9);
  const S = size, plateTone = new Float32Array(S * S), H = new Float32Array(S * S), tintA = new Float32Array(S * S), moss = new Float32Array(S * S);
  const N = (f, u, v, px, py) => f(u * px, v * py, px, py);
  for (let j = 0; j < S; j++) {
    const v = j / S;
    for (let i = 0; i < S; i++) {
      const u = i / S;
      // Domain warp: furrows wander sideways with height and fork, but never run across the trunk (no horizontal bands).
      const wx = 0.03 * N(pw, u, v, 5, 3) + 0.012 * N(pw, u + 0.3, v, 17, 7) + 0.003 * N(pw, u, v, 61, 23), wy = 0.02 * N(pw, u + 0.6, v, 5, 2);
      const x = u + wx, y = v + wy;
      // Deep primary furrows: borders of tall thin Worley plates (about 9 cm wide, 33 cm long at trunk scale), which
      // fork and rejoin; a few furrows fade out so neighbouring ridges interlock. Each plate has its own height.
      // 0.0.39: Gothic 3's oak bark is long narrow ridges, not wide plates; finer cells, three times taller than wide.
      const [d1, c1, id1] = wo(x, y, 72, 8), [d2, , id2] = wo2(x + 0.13, y + 0.31, 150, 16);
      const fade = smoothstep(-0.25, 0.1, N(pt, x, y, 30, 5));
      const furrowA = 1 - (1 - smoothstep(0.0, 0.2, d1)) * (0.35 + 0.45 * fade);
      const furrowB = 0.35 + 0.65 * smoothstep(0.0, 0.2, d2);
      const dome = 0.8 + 0.2 * smoothstep(0.9, 0.1, c1);
      let h = furrowA * (0.72 + 0.28 * furrowB) * dome * (0.84 + 0.16 * id1) * (0.97 + 0.03 * id2);
      h += 0.03 * N(pm, x, y, 190, 22) + 0.015 * N(pm, x, y, 380, 60) + 0.03 * N(pm, x, y, 40, 4);
      H[j * S + i] = clamp(h, 0, 1);
      tintA[j * S + i] = N(pt, u, v, 3, 3) * 0.7 + 0.5 * N(pt, u, v, 11, 9);
      plateTone[j * S + i] = 0.9 + 0.2 * (((id1 * 7.31) % 1)); moss[j * S + i] = N(pm, u + 0.2, v, 5, 3) * 0.8 + 0.5 * N(pm, u, v + 0.4, 14, 9);
    }
  }
  const albedo = new Uint8Array(S * S * 3), normal = new Uint8Array(S * S * 3);
  const k = 5.5, colLum = new Float32Array(S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const n = j * S + i, h = H[n];
    const l = H[j * S + ((i + S - 1) % S)], r = H[j * S + ((i + 1) % S)], up = H[((j + S - 1) % S) * S + i], dn = H[((j + 1) % S) * S + i];
    let nx = -(r - l) * k * 3.2, ny = (dn - up) * k * 3.2, nz = 1;
    const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
    normal[n * 3] = Math.round((nx * 0.5 + 0.5) * 255); normal[n * 3 + 1] = Math.round((ny * 0.5 + 0.5) * 255); normal[n * 3 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    // Colour from height: furrow bottoms dark brown, plates warm grey-brown, plate tops lightest; cavity occlusion in the furrows.
    const plate = smoothstep(0.1, 0.5, h), top = smoothstep(0.62, 0.95, h), tint = tintA[n];
    const grain = 1 + 0.3 * N(pm, i / S, j / S, 300, 36) + 0.2 * N(pm, i / S, j / S, 90, 11);
    let R = lerp(50, 74, plate) + 10 * top, G = lerp(42, 66, plate) + 9 * top, B = lerp(33, 56, plate) + 7 * top;
    const cavity = (0.62 + 0.38 * smoothstep(0.05, 0.55, h)) * grain;
    // Moss on plate tops in patches, pale lichen speckle on a few.
    const mossMask = smoothstep(0.1, 0.5, moss[n]) * plate * 0.6;
    R = lerp(R, 78, mossMask); G = lerp(G, 94, mossMask); B = lerp(B, 52, mossMask);
    const lichen = smoothstep(0.5, 0.64, moss[n] + 0.25 * Math.sin(i * 0.9) * Math.sin(j * 1.3)) * top * 0.4;
    R = lerp(R, 150, lichen); G = lerp(G, 152, lichen); B = lerp(B, 128, lichen);
    const pt2 = plateTone[n]; R *= pt2; G *= pt2; B *= pt2;
    R *= (1 + tint * 0.12) * cavity; G *= (1 + tint * 0.05) * cavity; B *= (1 - tint * 0.05) * cavity;
    R *= 1.4; G *= 1.38; B *= 1.34;   // lifted: the game reads bark darker than the atlas
    albedo[n * 3] = clamp(Math.round(R), 0, 255); albedo[n * 3 + 1] = clamp(Math.round(G), 0, 255); albedo[n * 3 + 2] = clamp(Math.round(B), 0, 255);
    colLum[i] += (R * 0.3 + G * 0.59 + B * 0.11) / S;
  }
  // Twigs sample one narrow bright plate strip (a thin tube would otherwise land in a furrow and shade near-black).
  const win = Math.round(S * 0.02); let best = 0, bestLum = -1;
  for (let i = 0; i < S; i += 4) { let s = 0, lo = 1e9; for (let w = 0; w < win; w++) { const c = colLum[(i + w) % S]; s += c; lo = Math.min(lo, c); } const sc = s / win + lo; if (sc > bestLum) { bestLum = sc; best = i; } }
  const twigU = best / S;
  // 256 x 256 box-filtered height for the vertex relief.
  const D = 256, f = S / D, height = new Float32Array(D * D);
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    let s = 0; for (let b = 0; b < f; b++) for (let a = 0; a < f; a++) s += H[(j * f + b) * S + i * f + a];
    height[j * D + i] = s / (f * f);
  }
  return { albedo, normal, height, size: S, heightSize: D, twigU };
}

/**
 * Silver birch bark, the same outputs as generateBark: chalk-white papery bark in faint horizontal bands, scattered dark
 * lenticels (short horizontal dashes), and a few black marks where branches were shed. The dark fissured foot of the
 * trunk varies with height, so the mesher paints it (addTube's palette), not this tile. One tile spans about 1.5 m
 * around a trunk and 2 m along it.
 */
export function generateBirchBark(size = BARK_SIZE, seed = 17) {
  const pn = makePNoise(seed), pw = makePNoise(seed + 101), pm = makePNoise(seed + 303);
  const S = size, H = new Float32Array(S * S), dark = new Float32Array(S * S), tone = new Float32Array(S * S);
  const N = (f, u, v, px, py) => f(u * px, v * py, px, py);
  const hash = (x, y, k) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k + seed * 131, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // Lenticels: at most one dash per cell of a periodic grid, 2 to 7 cm long and a few millimetres tall.
  const GX = 20, GY = 64;
  const lenticel = (u, v) => {
    const cx = Math.floor(u * GX), cy = Math.floor(v * GY); let best = 0;
    for (let j = -1; j <= 1; j++) for (let i = -2; i <= 2; i++) {
      const nx = cx + i, ny = cy + j, wx = ((nx % GX) + GX) % GX, wy = ((ny % GY) + GY) % GY;
      if (hash(wx, wy, 1) > 0.36) continue;
      const len = (0.012 + 0.035 * hash(wx, wy, 2)) * GX, thick = (0.0022 + 0.0026 * hash(wx, wy, 3)) * GY;
      const px = nx + hash(wx, wy, 4), py = ny + hash(wx, wy, 5);
      const dx = (u * GX - px) / (len * 0.5), dy = (v * GY - py + 0.18 * dx * dx * (hash(wx, wy, 6) - 0.5)) / (thick * 0.5);
      const e = Math.pow(Math.pow(Math.abs(dx), 4) + Math.pow(Math.abs(dy), 2), 0.5);
      best = Math.max(best, (1 - smoothstep(0.6, 1.0, e)) * (0.55 + 0.45 * hash(wx, wy, 7)));
    }
    return best;
  };
  for (let j = 0; j < S; j++) {
    const v = j / S;
    for (let i = 0; i < S; i++) {
      const u = i / S, n = j * S + i;
      const wx = 0.01 * N(pw, u, v, 4, 9), wy = 0.004 * N(pw, u + 0.5, v, 9, 4);
      const x = u + wx, y = v + wy;
      const len = lenticel(x, y);
      // Black marks: a few broad horizontal patches with ragged edges, wider around the trunk than tall.
      const markField = N(pn, x, y, 3, 14) * 0.75 + 0.25 * N(pn, x + 0.3, y, 11, 40);
      const mark = smoothstep(0.3, 0.36, markField) * (0.75 + 0.25 * N(pm, x, y, 60, 120));
      // Papery bands: faint horizontal strips of warmer or greyer white, and a fine horizontal striation.
      const band = N(pw, u, v, 2, 26) * 0.7 + 0.3 * N(pw, u + 0.2, v, 5, 70);
      const fine = N(pm, u, v, 40, 400) * 0.5 + 0.5 * N(pm, u, v, 120, 900);
      dark[n] = clamp(Math.max(len, mark), 0, 1);
      tone[n] = band;
      H[n] = clamp(0.62 + 0.05 * band + 0.03 * fine - 0.28 * len - 0.22 * mark, 0, 1);
    }
  }
  const albedo = new Uint8Array(S * S * 3), normal = new Uint8Array(S * S * 3);
  const k = 3.2;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const n = j * S + i;
    const l = H[j * S + ((i + S - 1) % S)], r = H[j * S + ((i + 1) % S)], up = H[((j + S - 1) % S) * S + i], dn = H[((j + 1) % S) * S + i];
    let nx = -(r - l) * k * 3.2, ny = (dn - up) * k * 3.2, nz = 1;
    const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
    normal[n * 3] = Math.round((nx * 0.5 + 0.5) * 255); normal[n * 3 + 1] = Math.round((ny * 0.5 + 0.5) * 255); normal[n * 3 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    const b = tone[n], d = dark[n];
    // Chalk white, a little warm in some bands and grey in others; lenticels and marks are a soft charcoal.
    let R = 214 + 14 * b, G = 210 + 9 * b, B = 199 + 3 * b;
    R = lerp(R, 54, d); G = lerp(G, 52, d); B = lerp(B, 50, d);
    albedo[n * 3] = clamp(Math.round(R), 0, 255); albedo[n * 3 + 1] = clamp(Math.round(G), 0, 255); albedo[n * 3 + 2] = clamp(Math.round(B), 0, 255);
  }
  const D = 256, f = S / D, height = new Float32Array(D * D);
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    let s = 0; for (let b = 0; b < f; b++) for (let a = 0; a < f; a++) s += H[(j * f + b) * S + i * f + a];
    height[j * D + i] = s / (f * f);
  }
  // Twigs sample the plain white: no strip of this tile is darker than another on average.
  return { albedo, normal, height, size: S, heightSize: D, twigU: 0.5 };
}

/** Bilinear periodic lookup of the relief height (0..1) at texture coordinates (u, v). */
export function barkHeight(bark, u, v) {
  const D = bark.heightSize, x = ((u % 1) + 1) % 1 * D, y = ((v % 1) + 1) % 1 * D;
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0, x1 = (x0 + 1) % D, y1 = (y0 + 1) % D, h = bark.height;
  return lerp(lerp(h[y0 * D + x0], h[y0 * D + x1], tx), lerp(h[y1 * D + x0], h[y1 * D + x1], tx), ty);
}
