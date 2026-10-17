import { readFileSync } from 'node:fs';
import { Layer, rng, mix, clamp, smooth, blurPlane, finish } from './raster.mjs';
import { needle } from './conifer.mjs';

/**
 * The fir needle sheet, redrawn needle by needle in the source sheet's own 8 x 8 layout (B12). The fir model's cards cut the
 * sheet into small pieces that follow each sprig's silhouette, so new art must keep that silhouette: every needle is drawn
 * inside the source cell's alpha mask (grown 2 px) and takes its large-scale light and dark from the source colour, so the
 * baked shading survives while the pixelated, painted edge is replaced by needle tips with soft alpha.
 */
export function readGlbImage(file, materialMatch) {
  const b = readFileSync(file), jl = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + jl).toString());
  const bl = b.readUInt32LE(20 + jl), bin = b.subarray(28 + jl, 28 + jl + bl);
  const mat = json.materials.find((m) => materialMatch.test(m.name));
  const tex = json.textures[mat.pbrMetallicRoughness.baseColorTexture.index];
  const image = json.images[tex.extensions?.EXT_texture_webp?.source ?? tex.source], view = json.bufferViews[image.bufferView];
  return bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}

const FIR = [[34, 66, 36], [40, 74, 40], [30, 58, 34], [46, 80, 44]], NEW = [96, 138, 56];

/** src: { data: RGBA bytes (straight), width } of the source sheet. Returns 64 finished cells (256 px), row-major. */
export function drawFirSheet(src, grid = 8, seed = 7000) {
  const C = src.width / grid, cells = [];
  for (let cell = 0; cell < grid * grid; cell++) {
    const cu = cell % grid, cv = Math.floor(cell / grid), random = rng(seed + cell * 131);
    const mask = new Float32Array(C * C), luma = new Float32Array(C * C);
    let cx = 0, cy = 0, mw = 0, ml = 0, minx = C, maxx = 0;
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      const o = ((cv * C + y) * src.width + cu * C + x) * 4, a = src.data[o + 3] / 255;
      mask[y * C + x] = a; luma[y * C + x] = 0.3 * src.data[o] + 0.59 * src.data[o + 1] + 0.11 * src.data[o + 2];
      if (a > 0.35) { cx += x * a; cy += y * a; mw += a; ml += luma[y * C + x] * a; minx = Math.min(minx, x); maxx = Math.max(maxx, x); }
    }
    const L = new Layer(C);
    if (mw > 0) {
      cx /= mw; cy /= mw; ml /= mw;
      const width = (maxx - minx) / C, side = cx / C > 0.56 ? -1 : 1, tip = width < 0.45, whorl = !tip && Math.abs(cx / C - 0.5) < 0.06;
      const grown = Float32Array.from(mask);
      for (let pass = 0; pass < 2; pass++) { const t = Float32Array.from(grown); for (let y = 1; y < C - 1; y++) for (let x = 1; x < C - 1; x++) grown[y * C + x] = Math.max(t[y * C + x], t[y * C + x - 1], t[y * C + x + 1], t[(y - 1) * C + x], t[(y + 1) * C + x]); }
      blurPlane(grown, C, 1.2);
      const seen = new Float32Array(C * C), items = [];
      const total = mask.reduce((s, v) => s + (v > 0.5 ? 1 : 0), 0);
      let covered = 0;
      for (let tries = 0; tries < 9000 && covered < total * 0.93; tries++) {
        const x = random() * C, y = random() * C, i = Math.floor(y) * C + Math.floor(x);
        if (mask[i] < 0.5 || seen[i] > 0.7 + random() * 0.6) continue;
        const flow = tip ? -Math.PI / 2 : whorl ? Math.atan2(y - cy, x - cx) : side > 0 ? 0 : Math.PI;
        const droop = tip || whorl ? 0 : 0.18 * (side > 0 ? 1 : -1);
        const ang = flow + droop + (random() - 0.5) * (tip ? 1.1 : whorl ? 0.5 : 2.0);
        const len = (tip ? 15 : 17) * (0.7 + random() * 0.7);
        const m = clamp(Math.pow(luma[i] / ml, 0.85), 0.55, 1.6), base = FIR[Math.floor(random() * 4)], j = 1 + (random() - 0.5) * 0.2;
        const newer = smooth(0.55, 1, x / C * (side > 0 ? 1 : -1) + (side > 0 ? 0 : 1)) * (random() < 0.6 ? 0.7 : 0.2);
        items.push({ x, y, ang, len, colour: [mix(base[0] * j, NEW[0], newer) * m, mix(base[1] * j, NEW[1], newer) * m, mix(base[2] * j, NEW[2], newer) * m], depth: random() });
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = (Math.floor(y) + dy) * C + Math.floor(x) + dx; if (k >= 0 && k < C * C) { if (seen[k] < 0.5 && mask[k] > 0.5) covered++; seen[k] += 0.34; } }
      }
      items.sort((p, q) => p.depth - q.depth);
      for (const o of items) needle(L, o.x, o.y, o.ang, o.len, 2.1, o.colour, o.depth, 0.5);
      for (let i = 0; i < C * C; i++) { const k = clamp(grown[i] * 1.6, 0, 1); L.a[i] *= k; L.r[i] *= k; L.g[i] *= k; L.b[i] *= k; }
    }
    cells.push(finish(L, { feather: 0.55, gain: 1.15, border: 2 }));
  }
  return cells;
}
