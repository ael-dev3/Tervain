import { hash2, pnoise, clamp, lerp, smoothstep } from './rng.mjs';

/** One bark tile covers TILE_W metres around the stem and TILE_H metres along it (v = metres / TILE_H). */
export const BARK_TILE_W = 1.6;
export const BARK_TILE_H = 2.0;

/**
 * Procedural Scots/Aleppo-style pine bark: tall plates split by deep furrows, flaking scales, a few orange fresh flakes.
 * Periodic in both directions. Returns height, sRGB albedo, tangent-space normal (green up) and ORM (R=AO, G=roughness).
 */
export function makeBark(size = 2048, seed = 7) {
  const GX = 12, GY = 6;
  const h = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 3);
  const tone = new Float32Array(size * size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = px / size, v = py / size;
      // domain warp: large wander of the furrows plus a finer ragged edge
      const wx = (pnoise(u * 6, v * 6, 6, 6, seed + 1) - 0.5) * 0.6 + (pnoise(u * 24, v * 24, 24, 24, seed + 2) - 0.5) * 0.28;
      const wy = (pnoise(u * 6, v * 6, 6, 6, seed + 3) - 0.5) * 0.6 + (pnoise(u * 24, v * 24, 24, 24, seed + 4) - 0.5) * 0.28;
      const sizeVar = 1 + 0.4 * Math.sin(v * 6.2832 + 1.3) + 0.2 * Math.sin(v * 12.566 + 0.4);
      const x = u * GX * 1 + wx + (pnoise(u * 3, v * 3, 3, 3, seed + 5) - 0.5) * 1.6 * sizeVar, y = v * GY + wy * 0.9 + (pnoise(u * 3, v * 3, 3, 3, seed + 6) - 0.5) * 1.2;
      const ix = Math.floor(x), iy = Math.floor(y);
      let f1 = 9, f2 = 9, id = 0, idx = 0, idy = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = ix + dx, cy = iy + dy;
          const wxm = ((cx % GX) + GX) % GX, wym = ((cy % GY) + GY) % GY;
          // brick-like stagger: alternate rows shift by half a plate
          const stagger = (wym & 1) ? 0.5 : 0;
          const fx = cx + 0.12 + 0.76 * hash2(wxm, wym, seed + 11) + stagger * 0.55;
          const fy = cy + 0.12 + 0.76 * hash2(wxm, wym, seed + 12);
          const ddx = x - fx, ddy = (y - fy) * 0.62;
          const d = Math.hypot(ddx, ddy);
          if (d < f1) { f2 = f1; f1 = d; id = hash2(wxm, wym, seed + 13); idx = wxm; idy = wym; }
          else if (d < f2) f2 = d;
        }
      }
      const edge = f2 - f1;
      const furrow = smoothstep(0.02, 0.12 + 0.1 * id, edge);
      const plate = 0.52 + 0.4 * id - 0.22 * f1;
      // scales and cracks across the plate
      const scale = pnoise(u * 10 * 4, v * 7 * 9, 40, 63, seed + 21);
      const crack = Math.abs(pnoise(u * 20, v * 14 * 3, 20, 42, seed + 22) - 0.5);
      const flake = smoothstep(0.02, 0.07, crack);
      const grain = pnoise(u * 160, v * 80, 160, 80, seed + 23) - 0.5;
      let H = furrow * (plate + (scale - 0.5) * 0.18) * (0.78 + 0.22 * flake) + grain * 0.05;
      H = clamp(H, 0, 1.2);
      const i = py * size + px;
      h[i] = H;
      tone[i] = id;
      // albedo
      const t = hash2(idx, idy, seed + 31), orange = hash2(idx, idy, seed + 32) > 0.93 ? 1 : 0;
      let r = lerp(96, 146, t), g = lerp(80, 108, t), b = lerp(68, 86, t);
      if (orange) { r = lerp(r, 158, 0.5); g = lerp(g, 104, 0.4); b = lerp(b, 70, 0.4); }
      const lit = 0.88 + 0.32 * clamp(H, 0, 1);
      const fr = Math.pow(furrow, 0.6);
      r = lerp(104, r * lit, fr); g = lerp(84, g * lit, fr); b = lerp(70, b * lit, fr);
      // lighter lichen-grey speckle on some plate tops
      const sp = smoothstep(0.62, 0.8, pnoise(u * 30, v * 50, 30, 50, seed + 41)) * 0.18 * fr;
      r += sp * 70; g += sp * 74; b += sp * 62;
      albedo[i * 3] = clamp(r * 1.06, 0, 255); albedo[i * 3 + 1] = clamp(g * 1.02, 0, 255); albedo[i * 3 + 2] = clamp(b, 0, 255);
    }
  }
  const normal = new Uint8Array(size * size * 3);
  const orm = new Uint8Array(size * size * 3);
  const k = 3.4; // slope gain: heights change ~0.01 a pixel at 2048 px
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dhx = (at(px + 1, py) - at(px - 1, py)) * 0.5 * k * (size / 256);
      const dhy = (at(px, py - 1) - at(px, py + 1)) * 0.5 * k * (size / 256); // +Y is up the image
      const l = Math.hypot(dhx, dhy, 1);
      const i = py * size + px;
      normal[i * 3] = clamp((-dhx / l * 0.5 + 0.5) * 255, 0, 255);
      normal[i * 3 + 1] = clamp((-dhy / l * 0.5 + 0.5) * 255, 0, 255);
      normal[i * 3 + 2] = clamp((1 / l * 0.5 + 0.5) * 255, 0, 255);
      const H = h[i];
      orm[i * 3] = clamp((0.52 + 0.48 * smoothstep(0.02, 0.5, H)) * 255, 0, 255);
      orm[i * 3 + 1] = clamp((0.92 - 0.1 * H) * 255, 0, 255);
      orm[i * 3 + 2] = 0;
    }
  }
  // low-frequency height (256^2 box average) for displacing trunk rings
  const low = 128, f = size / low, lowH = new Float32Array(low * low);
  for (let y = 0; y < low; y++) for (let x = 0; x < low; x++) {
    let s = 0;
    for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) s += h[(y * f + yy) * size + x * f + xx];
    lowH[y * low + x] = s / (f * f);
  }
  return { size, albedo, normal, orm, lowH, low };
}

/** Bilinear periodic sample of the low-frequency relief at (u, v) texture coordinates, roughly 0..1. */
export function reliefAt(bark, u, v) {
  const n = bark.low;
  const x = (((u % 1) + 1) % 1) * n - 0.5, y = (((v % 1) + 1) % 1) * n - 0.5;
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const g = (a, b) => bark.lowH[(((b % n) + n) % n) * n + (((a % n) + n) % n)];
  return lerp(lerp(g(x0, y0), g(x0 + 1, y0), fx), lerp(g(x0, y0 + 1), g(x0 + 1, y0 + 1), fx), fy);
}
