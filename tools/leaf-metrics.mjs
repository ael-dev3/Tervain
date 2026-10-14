/**
 * Image metrics for leaf cards (B12), pure functions over RGBA pixels.
 *
 *  hardEdges(img, bg): stills of a tree on a flat background colour. Coverage of each pixel is its distance from the
 *  background colour over the foliage's typical distance; a "step" is a 4-neighbour pair of fully covered and fully
 *  empty pixels with no partly covered pixel between them. Reports the share of silhouette edge made of such steps, and
 *  isolated high-contrast pixels (a covered pixel almost alone, or a pixel far brighter/darker than every neighbour)
 *  per megapixel of silhouette area.
 *
 *  repetition(img, crop): the highest normalised autocorrelation of a canopy crop at lags beyond `minLag` pixels; a
 *  texture of repeated pictures has strong off-centre peaks, a varied one stays low.
 */
import { createRequire } from 'node:module';

export async function readRgba(file, sharpModule) {
  const sharp = sharpModule ?? createRequire(new URL('../package.json', import.meta.url))('sharp');
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, rgb: data };
}

const dist = (rgb, i, bg) => Math.hypot(rgb[i * 3] - bg[0], rgb[i * 3 + 1] - bg[1], rgb[i * 3 + 2] - bg[2]);

export function estimateBackground(img) {
  // Median colour of the four corners' 8 x 8 blocks.
  const px = [];
  for (const [x0, y0] of [[0, 0], [img.width - 8, 0], [0, img.height - 8], [img.width - 8, img.height - 8]])
    for (let y = y0; y < y0 + 8; y++) for (let x = x0; x < x0 + 8; x++) px.push([0, 1, 2].map((k) => img.rgb[(y * img.width + x) * 3 + k]));
  return [0, 1, 2].map((k) => px.map((p) => p[k]).sort((a, b) => a - b)[px.length >> 1]);
}

export function hardEdges(img, bg = estimateBackground(img)) {
  const { width: w, height: h } = img, n = w * h, d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = dist(img.rgb, i, bg);
  // The typical distance of foliage from the background: the 70th percentile among pixels clearly not background.
  const far = [];
  for (let i = 0; i < n; i += 7) if (d[i] > 60) far.push(d[i]);
  far.sort((a, b) => a - b);
  const full = far.length ? far[Math.floor(far.length * 0.7)] : 255;
  const cov = new Float32Array(n);
  for (let i = 0; i < n; i++) cov[i] = Math.min(1, d[i] / full);
  const EMPTY = 0.08, FULL = 0.92;
  let steps = 0, soft = 0, isolated = 0, contrast = 0, area = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, c = cov[i];
    if (c > EMPTY) area++;
    for (const j of [i + 1, i + w]) {
      const e = cov[j];
      if ((c > FULL && e < EMPTY) || (e > FULL && c < EMPTY)) steps++;
      else if ((c <= FULL && c >= EMPTY && (e < EMPTY || e > FULL)) || (e <= FULL && e >= EMPTY && (c < EMPTY || c > FULL))) soft++;
    }
    if (c > FULL) {
      let bgNeighbours = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && cov[i + dy * w + dx] < EMPTY) bgNeighbours++;
      if (bgNeighbours >= 7) isolated++;
    }
    // A pixel whose luminance is far from every neighbour's, inside the silhouette.
    if (c > FULL) {
      const l = (j) => 0.3 * img.rgb[j * 3] + 0.59 * img.rgb[j * 3 + 1] + 0.11 * img.rgb[j * 3 + 2];
      const l0 = l(i);
      let min = 1e9, count = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const j = i + dy * w + dx; if (cov[j] > FULL) { min = Math.min(min, Math.abs(l(j) - l0)); count++; } }
      if (count >= 6 && min > 38) contrast++;
    }
  }
  const edge = steps + soft * 0.5;
  return { hardShare: edge ? steps / edge : 0, steps, soft, isolatedPerMpx: area ? (isolated + contrast) / area * 1e6 : 0, isolated, contrast, area };
}

/* ---- repetition: autocorrelation by FFT ---- */

function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inverse ? -1 : 1), wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function fft2(re, im, n, inverse) {
  const rr = new Float64Array(n), ri = new Float64Array(n);
  for (let y = 0; y < n; y++) { rr.set(re.subarray(y * n, y * n + n)); ri.set(im.subarray(y * n, y * n + n)); fft(rr, ri, inverse); re.set(rr, y * n); im.set(ri, y * n); }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { rr[y] = re[y * n + x]; ri[y] = im[y * n + x]; }
    fft(rr, ri, inverse);
    for (let y = 0; y < n; y++) { re[y * n + x] = rr[y]; im[y * n + x] = ri[y]; }
  }
}

/** crop: [x, y, size] with size <= 256 (a canopy patch). Returns the strongest normalised autocorrelation beyond minLag. */
export function repetition(img, crop, { minLag = 14, maxLag = 120 } = {}) {
  const [cx, cy, size] = crop, N = 512, re = new Float64Array(N * N), im = new Float64Array(N * N);
  let mean = 0;
  const lum = new Float64Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (cy + y) * img.width + cx + x;
    lum[y * size + x] = 0.3 * img.rgb[i * 3] + 0.59 * img.rgb[i * 3 + 1] + 0.11 * img.rgb[i * 3 + 2];
    mean += lum[y * size + x];
  }
  mean /= size * size;
  // Hann window so the crop's edges do not correlate with themselves.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const wnd = 0.25 * (1 - Math.cos(2 * Math.PI * x / (size - 1))) * (1 - Math.cos(2 * Math.PI * y / (size - 1)));
    re[y * N + x] = (lum[y * size + x] - mean) * wnd;
  }
  fft2(re, im, N, false);
  for (let i = 0; i < N * N; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
  fft2(re, im, N, true);
  const zero = re[0];
  let peak = 0, at = [0, 0];
  for (let dy = -maxLag; dy <= maxLag; dy++) for (let dx = -maxLag; dx <= maxLag; dx++) {
    const r = Math.hypot(dx, dy);
    if (r < minLag || r > maxLag) continue;
    const v = re[((dy + N) % N) * N + ((dx + N) % N)] / zero;
    if (v > peak) { peak = v; at = [dx, dy]; }
  }
  return { peak, at };
}
