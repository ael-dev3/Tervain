/**
 * A small software rasterizer for painting people's texture sheets on the CPU (so the same code runs in the game, in the
 * tests and in the Node export tool). Triangles are drawn orthographically into a pixel buffer with a depth test that keeps
 * the surface nearest the viewer, which is what an orthographic picture of the person shows: an outer coat hides the shirt
 * beneath it, the arm hides the flank behind it. Each covered pixel remembers its triangle and barycentric weights so a
 * painter can interpolate any vertex attribute there.
 */

export interface RasterTarget {
  readonly width: number;
  readonly height: number;
  /** Depth toward the viewer (larger is nearer); -Infinity where nothing was drawn. */
  readonly depth: Float32Array;
  /** Triangle index (into the index buffer, divided by three), or -1. */
  readonly tri: Int32Array;
  /** Barycentric weights of the triangle's second and third vertices (the first has 1 - b1 - b2). */
  readonly b1: Float32Array;
  readonly b2: Float32Array;
}

export function createTarget(width: number, height: number): RasterTarget {
  const n = width * height;
  const depth = new Float32Array(n).fill(-Infinity);
  const tri = new Int32Array(n).fill(-1);
  return { width, height, depth, tri, b1: new Float32Array(n), b2: new Float32Array(n) };
}

/** A pixel rectangle: x0, y0 inclusive, x1, y1 exclusive. */
export interface Clip {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Draw triangles whose vertices are already projected to pixel coordinates (`sx`, `sy`, origin top-left, pixel centres
 * at +0.5) with depth `sz`. Only triangles listed in `tris` (triangle numbers) are drawn, and only inside `clip`.
 */
export function rasterize(t: RasterTarget, sx: Float32Array, sy: Float32Array, sz: Float32Array, index: ArrayLike<number>, tris: ArrayLike<number>, clip: Clip) {
  const W = t.width;
  const { depth, tri, b1, b2 } = t;
  const cx0 = Math.max(0, clip.x0);
  const cy0 = Math.max(0, clip.y0);
  const cx1 = Math.min(W, clip.x1);
  const cy1 = Math.min(t.height, clip.y1);
  for (let k = 0; k < tris.length; k++) {
    const f = tris[k]!;
    const ia = index[f * 3]!;
    const ib = index[f * 3 + 1]!;
    const ic = index[f * 3 + 2]!;
    const ax = sx[ia]!, ay = sy[ia]!;
    const bx = sx[ib]!, by = sy[ib]!;
    const qx = sx[ic]!, qy = sy[ic]!;
    const area = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
    if (Math.abs(area) < 1e-9) continue;
    const inv = 1 / area;
    let minX = Math.floor(Math.min(ax, bx, qx));
    let maxX = Math.ceil(Math.max(ax, bx, qx));
    let minY = Math.floor(Math.min(ay, by, qy));
    let maxY = Math.ceil(Math.max(ay, by, qy));
    if (minX < cx0) minX = cx0;
    if (minY < cy0) minY = cy0;
    if (maxX > cx1) maxX = cx1;
    if (maxY > cy1) maxY = cy1;
    if (minX >= maxX || minY >= maxY) continue;
    const za = sz[ia]!, zb = sz[ib]!, zc = sz[ic]!;
    // Barycentrics are linear in the pixel centre: wb = ((p - a) x (c - a)) / area, wc = ((b - a) x (p - a)) / area.
    const wbDx = (qy - ay) * inv;
    const wcDx = -(by - ay) * inv;
    // A small tolerance closes hairline cracks between neighbouring triangles.
    const eps = -1e-5;
    for (let y = minY; y < maxY; y++) {
      const py = y + 0.5;
      const px0 = minX + 0.5;
      let wb = ((px0 - ax) * (qy - ay) - (py - ay) * (qx - ax)) * inv;
      let wc = ((bx - ax) * (py - ay) - (by - ay) * (px0 - ax)) * inv;
      const row = y * W;
      for (let x = minX; x < maxX; x++, wb += wbDx, wc += wcDx) {
        const wa = 1 - wb - wc;
        if (wa < eps || wb < eps || wc < eps) continue;
        const z = za * wa + zb * wb + zc * wc;
        const o = row + x;
        if (z <= depth[o]!) continue;
        depth[o] = z;
        tri[o] = f;
        b1[o] = wb;
        b2[o] = wc;
      }
    }
  }
}

/** Each covered pixel's distance (in pixels, chamfer) to the nearest uncovered one; 0 where uncovered. */
export function distanceToUncovered(covered: Uint8Array, width: number, height: number): Float32Array {
  const d = new Float32Array(width * height);
  for (let o = 0; o < d.length; o++) d[o] = covered[o] ? 1e9 : 0;
  const D = Math.SQRT2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = y * width + x;
      let v = d[o]!;
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[o - 1]! + 1);
      if (y > 0) {
        v = Math.min(v, d[o - width]! + 1);
        if (x > 0) v = Math.min(v, d[o - width - 1]! + D);
        if (x < width - 1) v = Math.min(v, d[o - width + 1]! + D);
      }
      d[o] = v;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const o = y * width + x;
      let v = d[o]!;
      if (v === 0) continue;
      if (x < width - 1) v = Math.min(v, d[o + 1]! + 1);
      if (y < height - 1) {
        v = Math.min(v, d[o + width]! + 1);
        if (x < width - 1) v = Math.min(v, d[o + width + 1]! + D);
        if (x > 0) v = Math.min(v, d[o + width - 1]! + D);
      }
      d[o] = v;
    }
  }
  return d;
}

/** How well a replacement image fits a person's sheet, in pixels. */
export interface SheetFit {
  /** The person's pixels the image left as background or transparency, all repaired from the paint beside them. */
  gaps: number;
  /** Of those, the ones deeper than the edge band: holes where the image has no figure at all. */
  holes: number;
  /** Solid paint far outside every silhouette, where the image's figures stand and the person's do not. */
  spill: number;
  /** The person's pixels. */
  covered: number;
}

/** Above these shares of a person's pixels, a replacement image was probably not made for their current shape. */
export const MISFIT_HOLES = 0.01;
export const MISFIT_SPILL = 0.03;

export function sheetMisfit(fit: SheetFit): boolean {
  return fit.covered > 0 && (fit.holes > fit.covered * MISFIT_HOLES || fit.spill > fit.covered * MISFIT_SPILL);
}

/**
 * Make a replacement image safe to use as a sheet. Its background colour is estimated from the opaque pixels no surface
 * covers (the per-channel median; none if most are transparent). Covered pixels that are transparent, or that colour within `band` of a silhouette's edge
 * (the image's figure was a little thinner than the person), or almost exactly that colour anywhere (a hole), are gaps;
 * they and everything outside the figures take the nearest real paint, so filtering and mipmaps never reach the
 * background. Returns the fit: gaps, holes, and solid paint more than `far` from every silhouette (`spill`).
 */
export function prepareSheetImage(
  rgba: Uint8Array,
  covered: Uint8Array,
  width: number,
  height: number,
  band = Math.max(4, Math.round(width * 0.015)),
  far = Math.max(24, Math.round(width * 0.024)),
): SheetFit {
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let count = 0;
  let clear = 0;
  for (let o = 0; o < covered.length; o++) {
    if (covered[o]) continue;
    if (rgba[o * 4 + 3]! < 128) {
      clear++;
      continue;
    }
    hist[0]![rgba[o * 4]!]!++;
    hist[1]![rgba[o * 4 + 1]!]!++;
    hist[2]![rgba[o * 4 + 2]!]!++;
    count++;
  }
  const median = (h: Uint32Array) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += h[i]!;
      if (acc * 2 >= count) return i;
    }
    return 0;
  };
  const bg = count > clear ? [median(hist[0]!), median(hist[1]!), median(hist[2]!)] : null;
  /** Squared distance from the background colour (Infinity when there is none). */
  const fromBackground = (o: number) => {
    if (!bg) return Infinity;
    const dr = rgba[o * 4]! - bg[0]!;
    const dg = rgba[o * 4 + 1]! - bg[1]!;
    const db = rgba[o * 4 + 2]! - bg[2]!;
    return dr * dr + dg * dg + db * db;
  };
  // Near the background colour (generated backgrounds vary), and almost exactly it (no paint matches it by chance).
  const NEAR = 34 * 34;
  const EXACT = 10 * 10;
  const dist = distanceToUncovered(covered, width, height);
  const keep = covered.slice();
  let person = 0;
  let gaps = 0;
  let holes = 0;
  for (let o = 0; o < keep.length; o++) {
    if (!keep[o]) continue;
    person++;
    const edge = dist[o]! <= band;
    const d = fromBackground(o);
    if (rgba[o * 4 + 3]! < 128 || (edge && d < NEAR) || d < EXACT) {
      keep[o] = 0;
      gaps++;
      if (!edge) holes++;
    }
  }
  // Solid paint far from every silhouette, before the fill. A sheet's own gutter fill reaches 16 px; a pixel counts only
  // with all eight neighbours painted too, so guide lines and labels left from a template do not.
  let spill = 0;
  const outside = new Uint8Array(covered.length);
  for (let o = 0; o < outside.length; o++) outside[o] = covered[o] ? 0 : 1;
  const away = distanceToUncovered(outside, width, height);
  const painted = (o: number) => rgba[o * 4 + 3]! >= 128 && fromBackground(o) >= NEAR;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const o = y * width + x;
      if (!outside[o] || away[o]! <= far || !painted(o)) continue;
      let solid = true;
      for (let dy = -1; dy <= 1 && solid; dy++) for (let dx = -1; dx <= 1; dx++) if (!painted(o + dy * width + dx)) solid = false;
      if (solid) spill++;
    }
  }
  // Gaps and everything outside the figures take the nearest real paint.
  fillNearest(rgba, keep, width, height, Math.max(width, height));
  for (let o = 0; o < keep.length; o++) rgba[o * 4 + 3] = 255;
  return { gaps, holes, spill, covered: person };
}

/** The plain colour of a sheet's empty background (sRGB). */
export const SHEET_BACKGROUND: readonly [number, number, number] = [92, 88, 82];

/**
 * Give every empty pixel (`covered` 0) within `reach` pixels of a painted one that pixel's colour, so texture filtering
 * and mipmaps at a silhouette never reach the background; further out, a plain background. Two raster passes propagate
 * each pixel's nearest painted pixel from its neighbours (a chamfer sweep): approximate, but every gutter is filled.
 */
export function fillNearest(rgba: Uint8Array, covered: Uint8Array, width: number, height: number, reach = 16) {
  const N = width * height;
  const src = new Int32Array(N).fill(-1);
  const dist = new Float32Array(N).fill(Infinity);
  for (let o = 0; o < N; o++) {
    if (covered[o]) {
      src[o] = o;
      dist[o] = 0;
    }
  }
  const relax = (o: number, x: number, y: number, q: number) => {
    const s = src[q]!;
    if (s < 0) return;
    const sx = s % width;
    const sy = (s - sx) / width;
    const d = (sx - x) * (sx - x) + (sy - y) * (sy - y);
    if (d < dist[o]!) {
      dist[o] = d;
      src[o] = s;
    }
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = y * width + x;
      if (dist[o] === 0) continue;
      if (x > 0) relax(o, x, y, o - 1);
      if (y > 0) {
        relax(o, x, y, o - width);
        if (x > 0) relax(o, x, y, o - width - 1);
        if (x < width - 1) relax(o, x, y, o - width + 1);
      }
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const o = y * width + x;
      if (dist[o] === 0) continue;
      if (x < width - 1) relax(o, x, y, o + 1);
      if (y < height - 1) {
        relax(o, x, y, o + width);
        if (x < width - 1) relax(o, x, y, o + width + 1);
        if (x > 0) relax(o, x, y, o + width - 1);
      }
    }
  }
  const far = reach * reach;
  const [br, bg, bb] = SHEET_BACKGROUND;
  for (let o = 0; o < N; o++) {
    if (covered[o]) continue;
    const s = src[o]!;
    const d = dist[o]!;
    if (s < 0 || d > far) {
      rgba[o * 4] = br;
      rgba[o * 4 + 1] = bg;
      rgba[o * 4 + 2] = bb;
    } else {
      // Fade toward the background across the outer half of the band, so mips stay close to the edge colour.
      const t = d > far / 4 ? (Math.sqrt(d) - reach / 2) / (reach / 2) : 0;
      rgba[o * 4] = Math.round(rgba[s * 4]! + (br - rgba[s * 4]!) * t * 0.5);
      rgba[o * 4 + 1] = Math.round(rgba[s * 4 + 1]! + (bg - rgba[s * 4 + 1]!) * t * 0.5);
      rgba[o * 4 + 2] = Math.round(rgba[s * 4 + 2]! + (bb - rgba[s * 4 + 2]!) * t * 0.5);
    }
    rgba[o * 4 + 3] = 255;
  }
}
