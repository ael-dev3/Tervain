// Placeholder leaf-cluster atlas (the real one is another agent's work): 4 x 4 cells of oak-leaf sprigs with soft
// feathered edges and colour bled under the transparent texels so mips never darken. Replace the picture, keep the layout.
import { makeRng, clamp, lerp, smoothstep } from './util.mjs';

/** Cell layout shared with the mesh generator: swap the texture, keep these. Cell (col,row), row 0 on top (glTF uv). */
export const LEAF_ATLAS = { size: 1024, cells: 4, pad: 6, feather: 3.5 };
export const LEAF_CELL_COUNT = LEAF_ATLAS.cells * LEAF_ATLAS.cells;

const SS = 3; // supersampling per axis

function drawCell(cellPx, index) {
  const rng = makeRng(9000 + index * 31), W = cellPx * SS;
  const row = Math.floor(index / LEAF_ATLAS.cells), col = index % LEAF_ATLAS.cells;
  // Rows: 0 summer, 1 deep summer, 2 spring (young, yellow-green), 3 early autumn (olive with rust touches).
  const pal = [
    { lit: [82, 128, 52], shade: [34, 70, 32] }, { lit: [62, 108, 48], shade: [26, 58, 28] },
    { lit: [156, 188, 72], shade: [88, 128, 44] }, { lit: [150, 150, 56], shade: [78, 92, 34], rust: [176, 108, 42] },
  ][index === 3 || index === 15 ? 3 : row === 3 ? 1 : row === 2 ? 0 : row];
  const rgb = new Float32Array(W * W * 3), cov = new Float32Array(W * W);
  const count = rng.int(11, 17) + (col % 2) * 3, spread = rng.range(0.55, 1.0), curve = rng.range(-0.5, 0.5);
  const base = [W * 0.5, W - cellPx * 0.06 * SS];
  const stemAt = (t) => {
    const a = -Math.PI / 2 + curve * t;
    return [base[0] + Math.cos(a) * t * W * 0.7 * (0.6 + 0.4 * spread) + Math.sin(curve * 3) * t * t * W * 0.1, base[1] + Math.sin(a) * t * W * 0.78, a];
  };
  const leaves = [];
  for (let i = 0; i < count; i++) {
    const t = Math.pow(rng(), 0.8), [sx, sy, stemAng] = stemAt(t);
    const side = rng.sign();
    const ang = i === count - 1 ? stemAng : stemAng + side * rng.range(0.35, 1.25) * spread;
    const len = cellPx * rng.range(0.2, 0.3) * (1.1 - 0.35 * t) * SS;
    leaves.push({ x: sx, y: sy, ang, len, wid: len * rng.range(0.42, 0.55), t, hue: rng(), lobes: rng.range(2.6, 3.6), ph: rng() * 6 });
  }
  leaves.sort((a, b) => a.t - b.t);
  const dot = (x, y, w, c) => {
    for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
      const px = Math.round(x + dx), py = Math.round(y + dy);
      if (px < 0 || py < 0 || px >= W || py >= W || dx * dx + dy * dy > w * w) continue;
      const n = py * W + px; cov[n] = 1; rgb[n * 3] = c[0]; rgb[n * 3 + 1] = c[1]; rgb[n * 3 + 2] = c[2];
    }
  };
  for (let s = 0; s <= 160; s++) { const t = s / 160, [x, y] = stemAt(t); dot(x, y, (2.4 - 1.2 * t) * SS * 0.7, [74, 62, 40]); }
  for (const lf of leaves) {
    const ca = Math.cos(lf.ang), sa = Math.sin(lf.ang), rust = pal.rust && lf.hue > 0.82;
    const reach = lf.len + lf.wid + 2;
    const x0 = Math.max(0, Math.floor(lf.x - reach)), x1 = Math.min(W - 1, Math.ceil(lf.x + reach));
    const y0 = Math.max(0, Math.floor(lf.y - reach)), y1 = Math.min(W - 1, Math.ceil(lf.y + reach));
    const shadeMix = 0.25 + 0.6 * lf.t * (0.7 + 0.3 * lf.hue);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - lf.x, dy = y - lf.y, s = (dx * ca + dy * sa) / lf.len, tt = (-dx * sa + dy * ca) / lf.wid;
      if (s < 0 || s > 1) continue;
      const w = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.85)), 0.8) * (0.8 + 0.2 * Math.cos(Math.PI * 2 * lf.lobes * s + lf.ph));
      if (Math.abs(tt) > w) continue;
      const n = y * W + x;
      const vein = Math.abs(tt) < 0.07 ? 1 : Math.abs(Math.abs(tt) - 0.45 * Math.abs(Math.sin(s * 11 + lf.ph))) < 0.04 ? 0.5 : 0;
      const light = clamp(0.35 + 0.65 * (tt > 0 ? 1 : 0.8) * (1 - shadeMix) + vein * 0.12 + (1 - Math.abs(tt) / Math.max(w, 0.05)) * 0.1, 0, 1);
      const lit = rust ? pal.rust : pal.lit, hv = 0.9 + 0.2 * lf.hue;
      for (let c = 0; c < 3; c++) rgb[n * 3 + c] = lerp(pal.shade[c], lit[c], light) * hv;
      cov[n] = 1;
    }
  }
  const out = new Float32Array(cellPx * cellPx * 4);
  for (let y = 0; y < cellPx; y++) for (let x = 0; x < cellPx; x++) {
    let a = 0, r = 0, g = 0, b = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const n = (y * SS + sy) * W + x * SS + sx, c = cov[n]; a += c; r += rgb[n * 3] * c; g += rgb[n * 3 + 1] * c; b += rgb[n * 3 + 2] * c;
    }
    const o = (y * cellPx + x) * 4, shadeY = lerp(0.72, 1.0, smoothstep(0.95, 0.35, y / cellPx));
    out[o + 3] = a / (SS * SS);
    if (a > 0) { out[o] = r / a * shadeY; out[o + 1] = g / a * shadeY; out[o + 2] = b / a * shadeY; }
  }
  return out;
}

function blurAlpha(img, size, radius) {
  const tmp = new Float32Array(size * size);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let s = 0, n = 0; for (let k = -radius; k <= radius; k++) { const xx = x + k; if (xx < 0 || xx >= size) continue; s += img[(y * size + xx) * 4 + 3]; n++; } tmp[y * size + x] = s / n;
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let s = 0, n = 0; for (let k = -radius; k <= radius; k++) { const yy = y + k; if (yy < 0 || yy >= size) continue; s += tmp[yy * size + x]; n++; } img[(y * size + x) * 4 + 3] = s / n;
    }
  }
}

/** RGBA8 image of the whole atlas. Alpha feathers over about LEAF_ATLAS.feather px; colour is dilated into empty texels. */
export function generateLeafAtlas() {
  const { size, cells } = LEAF_ATLAS, cellPx = size / cells, img = new Float32Array(size * size * 4);
  for (let idx = 0; idx < cells * cells; idx++) {
    const cell = drawCell(cellPx, idx), cx = (idx % cells) * cellPx, cy = Math.floor(idx / cells) * cellPx;
    for (let y = 0; y < cellPx; y++) for (let x = 0; x < cellPx; x++) {
      const inside = x >= LEAF_ATLAS.pad && y >= LEAF_ATLAS.pad && x < cellPx - LEAF_ATLAS.pad && y < cellPx - LEAF_ATLAS.pad;
      const o = ((cy + y) * size + cx + x) * 4, s = (y * cellPx + x) * 4;
      for (let c = 0; c < 4; c++) img[o + c] = inside ? cell[s + c] : 0;
    }
  }
  blurAlpha(img, size, 1);
  const rgb = new Float32Array(size * size * 3), have = new Uint8Array(size * size);
  for (let n = 0; n < size * size; n++) {
    if (img[n * 4 + 3] > 0.02) { have[n] = 1; rgb[n * 3] = img[n * 4]; rgb[n * 3 + 1] = img[n * 4 + 1]; rgb[n * 3 + 2] = img[n * 4 + 2]; }
  }
  // Colour bleed: dilate leaf colour outward so low-alpha and empty texels carry it into the mips.
  for (let pass = 0; pass < 8; pass++) {
    const nextHave = have.slice(), nextRgb = rgb.slice();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const n = y * size + x; if (have[n]) continue;
      let r = 0, g = 0, b = 0, k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
        const m = yy * size + xx; if (have[m]) { r += rgb[m * 3]; g += rgb[m * 3 + 1]; b += rgb[m * 3 + 2]; k++; }
      }
      if (k) { nextRgb[n * 3] = r / k; nextRgb[n * 3 + 1] = g / k; nextRgb[n * 3 + 2] = b / k; nextHave[n] = 1; }
    }
    have.set(nextHave); rgb.set(nextRgb);
  }
  const out = new Uint8Array(size * size * 4);
  for (let n = 0; n < size * size; n++) {
    const al = clamp((img[n * 4 + 3] - 0.5) * 1.25 + 0.5, 0, 1); // a little steeper than the blur keeps the cut-out size
    out[n * 4] = clamp(Math.round(have[n] ? rgb[n * 3] : 60), 0, 255);
    out[n * 4 + 1] = clamp(Math.round(have[n] ? rgb[n * 3 + 1] : 90), 0, 255);
    out[n * 4 + 2] = clamp(Math.round(have[n] ? rgb[n * 3 + 2] : 40), 0, 255);
    out[n * 4 + 3] = Math.max(1, Math.round(al * 255)); // never 0, so lossless WebP keeps the bled colour
  }
  return { rgba: out, size };
}
