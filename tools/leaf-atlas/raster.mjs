/**
 * A small analytic rasteriser for the leaf and needle atlases (B12). Everything is drawn from our own code: leaves from
 * outline functions, twigs and needles from tapered capsules, shaded per pixel (veins, edge darkening, depth) with a
 * drop shadow cast onto what is already drawn (baked self-shadow). Coverage is analytic (signed distance), so edges are
 * anti-aliased without supersampling. A layer holds premultiplied colour, coverage, a "thickness" count of overlapped
 * layers and a lighter underside gain used for translucency.
 */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const frac = (x) => x - Math.floor(x);

export class Layer {
  constructor(n) {
    this.n = n;
    const size = n * n;
    this.r = new Float32Array(size); this.g = new Float32Array(size); this.b = new Float32Array(size); // premultiplied
    this.a = new Float32Array(size);
    this.k = new Float32Array(size); // thickness: overlapped layers
    this.u = new Float32Array(size); // premultiplied underside gain
  }

  over(i, r, g, b, a, under) {
    if (a <= 0) return;
    const ia = 1 - a;
    this.r[i] = this.r[i] * ia + r * a; this.g[i] = this.g[i] * ia + g * a; this.b[i] = this.b[i] * ia + b * a;
    this.u[i] = this.u[i] * ia + under * a;
    this.k[i] = Math.min(1, this.k[i] * (1 - a * 0.5) + a * 0.34);
    this.a[i] = this.a[i] * ia + a;
  }

  /** Darken what is already drawn at pixel i by `f` (1 = none). */
  shade(i, f) {
    const a = this.a[i];
    if (a <= 0) return;
    const k = 1 - (1 - f) * Math.min(1, a * 1.4);
    this.r[i] *= k; this.g[i] *= k; this.b[i] *= k;
  }
}

/* ---- leaf outlines: half-width ratio (0..1) along t in 0..1, one value for each side ---- */

const saw = (x) => frac(x) * 2 - 1;

export const OUTLINES = {
  // Lobed oak leaf: narrow base, widest past the middle, 3 rounded lobes a side with real sinuses.
  oak(t, side, p) {
    const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.78)), 0.72);
    const ph = side * 0.9 + p.phase, lobes = p.lobes ?? 3.2;
    const c = 0.5 + 0.5 * Math.cos(2 * Math.PI * (lobes * t + ph));
    const lobe = 0.5 + 0.5 * Math.pow(c, 0.65);
    return env * lobe * smooth(0.0, 0.18, t) * 1.0 + env * 0.1 * (1 - smooth(0, 0.35, t));
  },
  // Ovate birch leaf: broad base, long drawn tip, double-toothed margin.
  birch(t, side, p) {
    const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.9);
    const tooth = 1 + 0.06 * saw(t * 13 + side * 0.4 + p.phase) * smooth(0.12, 0.3, t) * smooth(0.02, 0.35, 1 - t);
    return env * tooth * (1 - 0.1 * smooth(0.55, 1, t));
  },
  // Orchard (cherry/apple) leaf: elliptic, pointed, finely serrate.
  orchard(t, side, p) {
    const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.7);
    const tooth = 1 + 0.04 * saw(t * 22 + side * 0.5 + p.phase) * smooth(0.1, 0.3, t);
    return env * tooth;
  },
  // Beech / hornbeam: elliptic with a smooth margin and a short point.
  beech(t) { return Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.62); },
  // Narrow willow-like leaf.
  lance(t) { return Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.8); },
};

/**
 * Draw one leaf. `o`: x, y (base), ang (radians, 0 = +x, y down), len, wid (full width), shape, bend (curl, fraction of len),
 * colour [r,g,b] 0..255, lit (0.6..1.3), depth (0..1 = front), under (underside gain 0..1), veins (0..1), phase, lobes.
 */
export function drawLeaf(L, o) {
  const n = L.n, outline = OUTLINES[o.shape], len = o.len, half = o.wid / 2;
  const ca = Math.cos(o.ang), sa = Math.sin(o.ang), R = len * 1.1 + half + 6;
  const x0 = Math.max(0, Math.floor(o.x - R)), x1 = Math.min(n - 1, Math.ceil(o.x + R));
  const y0 = Math.max(0, Math.floor(o.y - R)), y1 = Math.min(n - 1, Math.ceil(o.y + R));
  const bend = o.bend ?? 0, shadow = o.shadow !== false, sh = [2.6 * (len / 60), 3.4 * (len / 60)];
  const veins = o.veins ?? 0.7, nv = Math.round(5 + len / 14);
  const [cr, cg, cb] = o.colour;
  const half2 = (t, s) => (t <= 0 || t >= 1 ? 0 : outline(t, s, o) * half);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5 - o.x, py = y + 0.5 - o.y;
    const al = px * ca + py * sa, s0 = -px * sa + py * ca;
    const t = al / len;
    const i = y * n + x;
    // The shadow this leaf throws on what is behind it, offset away from the light (down and right in the picture).
    if (shadow && o.depth > 0.05) {
      const qx = px - sh[0], qy = py - sh[1];
      const qa = qx * ca + qy * sa, qs = -qx * sa + qy * ca, qt = qa / len;
      if (qt > -0.05 && qt < 1.05) {
        const qc = qs - bend * len * (qt - 0.5) * (qt - 0.5) * 2;
        const h = half2(Math.min(0.995, Math.max(0.005, qt)), qc >= 0 ? 1 : -1) + 2.2;
        const d = h - Math.abs(qc);
        if (d > -3) L.shade(i, 1 - 0.34 * smooth(-3, 2.5, d));
      }
    }
    if (t <= 0 || t >= 1) continue;
    const s = s0 - bend * len * (t - 0.5) * (t - 0.5) * 2;
    const side = s >= 0 ? 1 : -1;
    const hw = half2(t, side);
    if (hw <= 0) continue;
    const e = 0.004, slope = (half2(Math.min(0.999, t + e), side) - half2(Math.max(0.001, t - e), side)) / (2 * e * len);
    const d = (hw - Math.abs(s)) / Math.sqrt(1 + slope * slope);
    const cov = clamp(d + 0.5, 0, 1);
    if (cov <= 0) continue;
    const rel = Math.abs(s) / Math.max(hw, 1e-3); // 0 on the midrib, 1 at the margin
    let k = (0.84 + 0.2 * t) * (1.04 - 0.22 * rel * rel) * o.lit * (0.62 + 0.5 * o.depth);
    k *= 1 + 0.07 * side * (o.cup ?? 0.5) * rel; // one half of the blade catches more light than the other
    let lift = 1, tint = 0;
    const rib = smooth(1.5, 0.3, Math.abs(s)) * smooth(0.0, 0.08, t) * smooth(0.95, 0.55, t);
    lift += 0.34 * rib * veins; tint += 0.5 * rib;
    const ph = t * nv * 0.9 - rel * 0.9 * (hw / half), f = frac(ph);
    const vein = smooth(0.11, 0.0, Math.min(f, 1 - f)) * smooth(0.95, 0.5, rel) * smooth(0.06, 0.2, t) * smooth(0.97, 0.7, t);
    lift += 0.16 * vein * veins; tint += 0.25 * vein;
    const m = k * lift, edge = 1 + 0.12 * smooth(0.78, 1.0, rel);
    const r = clamp(cr * m * (1 + 0.04 * tint), 0, 255), g = clamp(cg * m * edge, 0, 255), b = clamp(cb * m * (1 - 0.05 * tint), 0, 255);
    L.over(i, r, g, b, cov * (o.opacity ?? 1), o.under * (0.85 + 0.3 * t));
  }
}

/**
 * A tapered capsule along a polyline [[x,y,radius],...], drawn through a temporary coverage buffer so joints never
 * double-cover. `colour(t)` returns [r,g,b] along the stroke; `fade(t)` scales alpha (0 at an end that should vanish).
 */
export function drawStroke(L, pts, colour, fade = () => 1, under = 0.2, shadow = false) {
  const n = L.n;
  let minx = n, miny = n, maxx = 0, maxy = 0;
  for (const [x, y, r] of pts) { minx = Math.min(minx, x - r - 2); miny = Math.min(miny, y - r - 2); maxx = Math.max(maxx, x + r + 2); maxy = Math.max(maxy, y + r + 2); }
  const x0 = Math.max(0, Math.floor(minx)), y0 = Math.max(0, Math.floor(miny)), x1 = Math.min(n - 1, Math.ceil(maxx)), y1 = Math.min(n - 1, Math.ceil(maxy));
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w <= 0 || h <= 0) return;
  const cov = new Float32Array(w * h), tt = new Float32Array(w * h);
  let total = 0; const seg = [];
  for (let k = 0; k + 1 < pts.length; k++) { const l = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); seg.push(total); total += l; }
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay, ar] = pts[k], [bx, by, br] = pts[k + 1], dx = bx - ax, dy = by - ay, l2 = Math.max(dx * dx + dy * dy, 1e-6), l = Math.sqrt(l2);
    const sx0 = Math.max(x0, Math.floor(Math.min(ax, bx) - Math.max(ar, br) - 2)), sx1 = Math.min(x1, Math.ceil(Math.max(ax, bx) + Math.max(ar, br) + 2));
    const sy0 = Math.max(y0, Math.floor(Math.min(ay, by) - Math.max(ar, br) - 2)), sy1 = Math.min(y1, Math.ceil(Math.max(ay, by) + Math.max(ar, br) + 2));
    for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) {
      const px = x + 0.5 - ax, py = y + 0.5 - ay;
      const u = clamp((px * dx + py * dy) / l2, 0, 1);
      const dist = Math.hypot(px - u * dx, py - u * dy), r = ar + (br - ar) * u;
      const c = clamp(r - dist + 0.5, 0, 1);
      const j = (y - y0) * w + (x - x0);
      if (c > cov[j]) { cov[j] = c; tt[j] = (seg[k] + u * l) / Math.max(total, 1e-6); }
    }
  }
  if (shadow) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const sx = x - 2, sy = y - 3;
      if (sx < x0 || sy < y0 || sx > x1 || sy > y1) continue;
      const c = cov[(sy - y0) * w + (sx - x0)];
      if (c > 0 && cov[(y - y0) * w + (x - x0)] < 1) L.shade(y * n + x, 1 - 0.3 * c);
    }
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const j = (y - y0) * w + (x - x0), c = cov[j];
    if (c <= 0) continue;
    const t = tt[j], [r, g, b] = colour(t);
    L.over(y * n + x, r, g, b, c * fade(t), under);
  }
}

/** Soft separable gaussian blur of one float plane, in place. */
export function blurPlane(plane, n, sigma) {
  if (sigma <= 0) return;
  const rad = Math.ceil(sigma * 3), kern = new Float32Array(rad * 2 + 1);
  let sum = 0;
  for (let i = -rad; i <= rad; i++) { kern[i + rad] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += kern[i + rad]; }
  for (let i = 0; i < kern.length; i++) kern[i] /= sum;
  const tmp = new Float32Array(plane.length);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = 0;
    for (let k = -rad; k <= rad; k++) v += plane[y * n + clamp(x + k, 0, n - 1)] * kern[k + rad];
    tmp[y * n + x] = v;
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let v = 0;
    for (let k = -rad; k <= rad; k++) v += tmp[clamp(y + k, 0, n - 1) * n + x] * kern[k + rad];
    plane[y * n + x] = v;
  }
}

/**
 * Turn a layer into straight RGBA bytes: alpha feathered by `feather` (gaussian sigma, px) and faded to nothing at the
 * cell border, colour taken from the leaves and spread outward over the transparent texels (premultiplied dilation), so a
 * filtered or mipped edge never picks up black, white or a halo.
 */
export function finish(L, { feather, gain = 1, border = 14 }) {
  const n = L.n, size = n * n;
  const a = Float32Array.from(L.a), cr = new Float32Array(size), cg = new Float32Array(size), cb = new Float32Array(size), have = new Uint8Array(size);
  const under = new Float32Array(size), thick = Float32Array.from(L.k);
  let mr = 0, mg = 0, mb = 0, mw = 0;
  for (let i = 0; i < size; i++) {
    if (L.a[i] > 0.02) {
      cr[i] = L.r[i] / L.a[i]; cg[i] = L.g[i] / L.a[i]; cb[i] = L.b[i] / L.a[i]; under[i] = L.u[i] / L.a[i]; have[i] = 1;
      mr += cr[i] * L.a[i]; mg += cg[i] * L.a[i]; mb += cb[i] * L.a[i]; mw += L.a[i];
    }
  }
  blurPlane(a, n, feather);
  blurPlane(thick, n, feather * 1.5);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.min(x, y, n - 1 - x, n - 1 - y);
    const i = y * n + x;
    a[i] = clamp(a[i] * gain, 0, 1) * smooth(1, border, d);
  }
  // Dilate colour outward: each pass fills texels beside filled ones with their neighbours' mean.
  const avg = mw > 0 ? [mr / mw, mg / mw, mb / mw] : [80, 100, 50];
  let front = have;
  for (let pass = 0; pass < 36; pass++) {
    const next = Uint8Array.from(front);
    let changed = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (front[i]) continue;
      let sr = 0, sg = 0, sb = 0, su = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        const j = yy * n + xx;
        if (front[j]) { sr += cr[j]; sg += cg[j]; sb += cb[j]; su += under[j]; c++; }
      }
      if (c) { cr[i] = sr / c; cg[i] = sg / c; cb[i] = sb / c; under[i] = su / c; next[i] = 1; changed++; }
    }
    front = next;
    if (!changed) break;
  }
  for (let i = 0; i < size; i++) if (!front[i]) { cr[i] = avg[0]; cg[i] = avg[1]; cb[i] = avg[2]; }
  return { n, a, r: cr, g: cg, b: cb, under, thick, mean: avg };
}

/** Fraction of texels whose alpha clears `cutoff` (0..1). */
export function coverage(a, cutoff) {
  let c = 0;
  for (let i = 0; i < a.length; i++) if (a[i] > cutoff) c++;
  return c / a.length;
}
