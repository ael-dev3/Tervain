import { mulberry32 } from '../../world/noise';
import { clamp01, fbmField, sstep, voronoi } from '../procTex';

/**
 * The TERVAIN wordmark, cast in old bronze. Original letterforms (A25): monumental capitals with tapered wedge serifs, a
 * lowered V, and an I made as a sword standing point-down: pommel, grip, cross-guard and blade. They are drawn as simple
 * shapes, rasterised here without the DOM, and then made rough: the edges are chipped, the faces hammered and pitted, the
 * bevels polished bright by handling, verdigris and dirt sit in the hollows, and a hard shadow lifts the letters off the
 * scene behind. The result is deterministic, so every machine shows the same casting.
 *
 * Nothing is taken from a reference game's logo or lettering; Gothic 3's title informed only the material (weathered cast
 * metal against a painted dusk).
 */

type P2 = [number, number];
interface Shape {
  add: P2[][];
  cut: P2[][];
}

/** Design units: cap line y = 28, baseline y = 158, the V and the blade reach y = 180. */
export const WORDMARK_VIEW = { w: 1000, h: 200 };

const bar = (x0: number, y0: number, x1: number, y1: number, t0: number, t1: number): P2[] => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  return [
    [x0 + (nx * t0) / 2, y0 + (ny * t0) / 2],
    [x1 + (nx * t1) / 2, y1 + (ny * t1) / 2],
    [x1 - (nx * t1) / 2, y1 - (ny * t1) / 2],
    [x0 - (nx * t0) / 2, y0 - (ny * t0) / 2],
  ];
};

/** A vertical stem that is waisted in the middle and flares at both ends, the way a chisel leaves a carved stroke. */
const stem = (x: number, y0: number, y1: number, w: number, flare = 1.3): P2[] => {
  const pts: P2[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const k = 1 + (flare - 1) * Math.pow(Math.abs(t * 2 - 1), 2.2);
    pts.push([x - (w * k) / 2, y0 + (y1 - y0) * t]);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const k = 1 + (flare - 1) * Math.pow(Math.abs(t * 2 - 1), 2.2);
    pts.push([x + (w * k) / 2, y0 + (y1 - y0) * t]);
  }
  return pts;
};

/** A tapered wedge serif: base on the stroke end, tip pointing along (dx, dy). */
const wedge = (x: number, y: number, dx: number, dy: number, base: number): P2[] => {
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  return [
    [x + (nx * base) / 2, y + (ny * base) / 2],
    [x + dx, y + dy],
    [x - (nx * base) / 2, y - (ny * base) / 2],
  ];
};

/** A stroke following a quadratic curve, thickness varying from t0 to t1. */
const curve = (a: P2, c: P2, b: P2, t0: number, t1: number, n = 16): P2[] => {
  const left: P2[] = [];
  const right: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0];
    const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
    const tx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
    const ty = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
    const l = Math.hypot(tx, ty) || 1;
    const th = (t0 + (t1 - t0) * t) / 2;
    left.push([x - (ty / l) * th, y + (tx / l) * th]);
    right.push([x + (ty / l) * th, y - (tx / l) * th]);
  }
  return [...left, ...right.reverse()];
};

const diamond = (x: number, y: number, rx: number, ry: number): P2[] => [
  [x, y - ry],
  [x + rx, y],
  [x, y + ry],
  [x - rx, y],
];

/** Foot and head serifs for a stem: two wedges each side. */
function serifs(x: number, top: number, bottom: number, w: number, s: number, parts: P2[][], which: 'both' | 'top' | 'bottom' = 'both') {
  if (which !== 'bottom') {
    parts.push(wedge(x - w / 2, top + 4, -s, -3, 9), wedge(x + w / 2, top + 4, s, -3, 9));
    parts.push(bar(x - w / 2 - s * 0.7, top + 1, x + w / 2 + s * 0.7, top + 1, 5, 5));
  }
  if (which !== 'top') {
    parts.push(wedge(x - w / 2, bottom - 4, -s, 3, 9), wedge(x + w / 2, bottom - 4, s, 3, 9));
    parts.push(bar(x - w / 2 - s * 0.7, bottom - 1, x + w / 2 + s * 0.7, bottom - 1, 5, 5));
  }
}

/** The seven glyphs of TERVAIN. */
export function wordmarkShapes(): Shape {
  const add: P2[][] = [];
  const cut: P2[][] = [];
  const T = 28;
  const B = 158;
  // T
  add.push(bar(2, 36, 118, 36, 19, 19));
  add.push(wedge(5, 44, -7, 24, 15), wedge(115, 44, 7, 24, 15));
  add.push(stem(60, 40, B, 31, 1.3));
  serifs(60, 42, B, 31, 14, add, 'bottom');
  // E
  add.push(stem(162, T + 2, B - 2, 30, 1.25));
  serifs(162, T + 2, B - 2, 30, 12, add);
  add.push(bar(150, 36, 240, 34, 19, 15), wedge(238, 40, 6, 22, 13));
  add.push(bar(170, 93, 226, 93, 15, 12), wedge(224, 93, 6, -11, 8), wedge(224, 93, 6, 11, 8));
  add.push(bar(150, 150, 246, 152, 19, 15), wedge(244, 146, 7, -24, 13));
  // R
  add.push(stem(288, T + 2, B - 2, 30, 1.25));
  serifs(288, T + 2, B - 2, 30, 12, add);
  add.push(curve([282, 36], [376, 25], [366, 70], 19, 26));
  add.push(curve([366, 65], [357, 101], [292, 99], 26, 16));
  add.push(bar(312, 98, 372, 151, 21, 27), bar(364, 154, 398, 155, 8, 5), wedge(392, 156, 15, -2, 7));
  // V (lowered, meeting in a blade point)
  add.push(bar(424, 33, 493, 180, 31, 14));
  add.push(bar(560, 33, 496, 178, 16, 11));
  serifs(424, T + 2, B, 31, 13, add, 'top');
  add.push(wedge(560, 34, 13, -3, 10), wedge(560, 34, -13, -3, 10), bar(547, 29, 573, 29, 6, 6));
  // A
  add.push(bar(592, B - 2, 644, 22, 16, 17));
  add.push(bar(640, 21, 700, B - 2, 20, 32));
  add.push(wedge(644, 24, -15, -7, 14));
  add.push(bar(612, 112, 678, 112, 13, 13));
  add.push(bar(575, B - 1, 610, B - 1, 7, 7), wedge(577, B - 2, -9, 2, 7));
  add.push(bar(680, B - 1, 722, B - 1, 7, 7), wedge(720, B - 2, 9, 2, 7));
  // I as a sword, point down: pommel, grip, cross-guard with drooping quillons, a long blade with a fuller.
  add.push(diamond(764, 9, 12, 12));
  cut.push(diamond(764, 9, 4, 5));
  add.push(bar(764, 18, 764, 32, 11, 12));
  add.push(bar(726, 37, 802, 37, 13, 13), wedge(728, 40, -10, 11, 10), wedge(800, 40, 10, 11, 10));
  add.push([
    [750, 42],
    [778, 42],
    [775, 150],
    [764, 186],
    [753, 150],
  ]);
  cut.push([
    [762.4, 54],
    [765.6, 54],
    [765, 140],
    [763, 140],
  ]);
  // N
  add.push(stem(834, T + 2, B - 2, 18, 1.3));
  add.push(stem(932, T + 2, B - 2, 18, 1.3));
  add.push(bar(832, T + 4, 934, B - 4, 32, 27));
  serifs(834, T + 2, B - 2, 18, 12, add, 'both');
  serifs(932, T + 2, B - 2, 18, 12, add, 'top');
  return { add, cut };
}

/* ------------------------------------------------------------------ rasteriser ------------------------------------------------------------------ */

/** Anti-aliased coverage (0..1) of a polygon (non-zero winding) accumulated into `out` with max(). */
function fillPolygon(out: Float32Array, w: number, h: number, poly: P2[], sx: number, sy: number, ox: number, oy: number, mode: 'add' | 'cut') {
  const pts = poly.map(([x, y]) => [x * sx + ox, y * sy + oy] as P2);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  const SS = 4;
  const row = new Float32Array(w);
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(h - 1, Math.ceil(maxY)); y++) {
    row.fill(0);
    for (let s = 0; s < SS; s++) {
      const yy = y + (s + 0.5) / SS;
      const xs: { x: number; d: number }[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % pts.length]!;
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          const t = (yy - a[1]) / (b[1] - a[1]);
          xs.push({ x: a[0] + (b[0] - a[0]) * t, d: b[1] > a[1] ? 1 : -1 });
        }
      }
      xs.sort((p, q) => p.x - q.x);
      let wind = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        wind += xs[i]!.d;
        if (wind === 0) continue;
        const x0 = xs[i]!.x;
        const x1 = xs[i + 1]!.x;
        const i0 = Math.max(0, Math.floor(x0));
        const i1 = Math.min(w - 1, Math.floor(x1));
        for (let x = i0; x <= i1; x++) {
          const cov = Math.min(x + 1, x1) - Math.max(x, x0);
          if (cov > 0) row[x] = row[x]! + cov / SS;
        }
      }
    }
    for (let x = 0; x < w; x++) {
      const v = Math.min(1, row[x]!);
      const o = y * w + x;
      out[o] = mode === 'add' ? Math.max(out[o]!, v) : out[o]! * (1 - v);
    }
  }
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / k;
      acc += src[y * w + Math.min(w - 1, x + r + 1)]! - src[y * w + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / k;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!;
    }
  }
  return out;
}

/** Two-pass chamfer distance (in pixels) from each inside pixel to the outside. */
function insideDistance(mask: Float32Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i]! > 0.5 ? INF : 0;
  const s2 = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = y * w + x;
      if (d[o] === 0) continue;
      let v = d[o]!;
      if (x > 0) v = Math.min(v, d[o - 1]! + 1);
      if (y > 0) {
        v = Math.min(v, d[o - w]! + 1);
        if (x > 0) v = Math.min(v, d[o - w - 1]! + s2);
        if (x < w - 1) v = Math.min(v, d[o - w + 1]! + s2);
      }
      d[o] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const o = y * w + x;
      if (d[o] === 0) continue;
      let v = d[o]!;
      if (x < w - 1) v = Math.min(v, d[o + 1]! + 1);
      if (y < h - 1) {
        v = Math.min(v, d[o + w]! + 1);
        if (x < w - 1) v = Math.min(v, d[o + w + 1]! + s2);
        if (x > 0) v = Math.min(v, d[o + w - 1]! + s2);
      }
      d[o] = v;
    }
  }
  return d;
}

/** Tileable noise sampled across a larger image (wrapping). */
function sampler(field: Float32Array, n: number) {
  return (x: number, y: number) => field[((Math.floor(y) % n) + n) % n * n + (((Math.floor(x) % n) + n) % n)]!;
}

export interface WordmarkImage {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

/**
 * Render the wordmark at `width` pixels wide (height follows the design box). Pure computation; roughly linear in pixel
 * count. The returned RGBA has a transparent background with the letters and their shadow.
 */
export function renderWordmark(width = 1200, seed = 1147): WordmarkImage {
  const pad = 0.04;
  const W = Math.round(width);
  const scale = (W * (1 - pad * 2)) / WORDMARK_VIEW.w;
  const H = Math.round(WORDMARK_VIEW.h * scale + W * pad * 2);
  const ox = W * pad;
  const oy = W * pad * 0.8;
  const shapes = wordmarkShapes();
  const mask = new Float32Array(W * H);
  for (const p of shapes.add) fillPolygon(mask, W, H, p, scale, scale, ox, oy, 'add');
  for (const p of shapes.cut) fillPolygon(mask, W, H, p, scale, scale, ox, oy, 'cut');
  const u = scale / 1.2; // pixels per design unit relative to the reference width
  // Chipped edges: erode the silhouette with noise only near the edge, so faces stay whole and edges look knocked about.
  const n1 = fbmField(256, 24, 24, 3, seed);
  const n2 = fbmField(256, 70, 70, 2, seed + 1);
  const s1 = sampler(n1, 256);
  const s2 = sampler(n2, 256);
  const soft = boxBlur(mask, W, H, Math.max(1, Math.round(1.6 * u)));
  const chipped = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = (i / W) | 0;
    const n = s1(x / u, y / u) * 0.75 + s2(x / u, y / u) * 0.25;
    const edge = soft[i]!;
    chipped[i] = mask[i]! * clamp01((edge - 0.28 - (n - 0.5) * 0.55) * 6);
  }
  const dist = insideDistance(chipped, W, H);
  const bevel = 7 * u;
  // Height: a chamfered bevel up to a plateau, the face hammered into shallow facets and pitted.
  const cells = voronoi(256, 22, seed + 2, 0.9);
  const fc = sampler(cells.id, 256);
  const pitF = fbmField(256, 90, 90, 2, seed + 3);
  const pit = sampler(pitF, 256);
  const height = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (chipped[i]! < 0.02) continue;
    const x = i % W;
    const y = (i / W) | 0;
    const ramp = Math.min(1, dist[i]! / bevel);
    const face = ramp >= 1 ? (fc(x / u * 0.7, y / u * 0.7) - 0.5) * 0.07 + (s1(x / u * 0.35, y / u * 0.35) - 0.5) * 0.12 : 0;
    const pits = -sstep(0.74, 0.88, pit(x / u * 0.8, y / u * 1.3)) * 0.08 * ramp;
    height[i] = (ramp * (2 - ramp)) * chipped[i]! + face + pits;
  }
  const hs = boxBlur(height, W, H, 1);
  const cavity = boxBlur(height, W, H, Math.max(2, Math.round(3 * u)));
  const rng = mulberry32(seed + 9);
  // A handful of scratches across the faces.
  const scratch = new Float32Array(W * H);
  for (let k = 0; k < 40; k++) {
    let x = rng() * W;
    let y = rng() * H;
    const a = -0.4 + (rng() - 0.5) * 0.9;
    const len = (10 + rng() * 40) * u;
    for (let s = 0; s < len; s++) {
      x += Math.cos(a);
      y += Math.sin(a);
      const o = Math.round(y) * W + Math.round(x);
      if (o >= 0 && o < W * H) scratch[o] = Math.max(scratch[o]!, Math.sin((s / len) * Math.PI));
    }
  }
  // Light from the upper left and a little in front, as from a sky above a fire.
  const L = normalize3([-0.55, -0.62, 0.56]);
  const V: [number, number, number] = [0, 0, 1];
  const Hh = normalize3([L[0] + V[0], L[1] + V[1], L[2] + V[2]]);
  const shadow = boxBlur(chipped, W, H, Math.max(1, Math.round(2.4 * u)));
  // A wide soft darkening round the letters keeps them readable over a busy crown or a bright sky.
  const halo = boxBlur(boxBlur(chipped, W, H, Math.max(2, Math.round(9 * u))), W, H, Math.max(2, Math.round(9 * u)));
  const out = new Uint8ClampedArray(W * H * 4);
  const sOff = Math.round(3.2 * u);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      const a = chipped[i]!;
      // Hard shadow below and right, so the letters stand off the painted sky.
      const sx = x - sOff;
      const sy = y - sOff;
      const sh = Math.max(sx >= 0 && sy >= 0 ? shadow[sy * W + sx]! * 0.85 : 0, Math.min(1, halo[i]! * 1.6) * 0.42);
      if (a < 0.01) {
        out[o] = 6;
        out[o + 1] = 5;
        out[o + 2] = 4;
        out[o + 3] = Math.round(sh * 255);
        continue;
      }
      const hL = hs[Math.max(0, i - 1)]!;
      const hR = hs[Math.min(W * H - 1, i + 1)]!;
      const hU = hs[Math.max(0, i - W)]!;
      const hD = hs[Math.min(W * H - 1, i + W)]!;
      const k = 4.2;
      const N = normalize3([(hL - hR) * k, (hU - hD) * k, 1]);
      const diff = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]);
      const spec = Math.pow(Math.max(0, N[0] * Hh[0] + N[1] * Hh[1] + N[2] * Hh[2]), 18);
      // A warm kick from below right, as if from the fire.
      const kick = Math.max(0, N[0] * 0.6 + N[1] * 0.55 + N[2] * 0.3) * 0.22;
      const ramp = Math.min(1, dist[i]! / bevel);
      // Hollows (the face below its surroundings, the bevel foot) collect dirt and verdigris; the bevel crown is worn bright.
      const hollow = clamp01((cavity[i]! - height[i]!) * 6 + 0.1) * (1 - scratch[i]! * 0.5);
      // Polish on the bevel crown comes and goes: rubbed bright in places, tarnished dark in others.
      const polish = sstep(0.35, 0.7, s2(x / u * 0.5 + 17, y / u * 0.5));
      const crown = sstep(0.55, 0.95, ramp) * (1 - sstep(0.99, 1.0, ramp)) * (0.25 + 0.75 * polish);
      const n = s1(x / u * 2.1, y / u * 2.1);
      let r = 0.52 + n * 0.18;
      let g = 0.37 + n * 0.12;
      let b = 0.18 + n * 0.06;
      // Tarnish: the old bronze is brown more than gold, in broad blotches.
      const tarn = 0.25 + 0.55 * sstep(0.3, 0.75, s1(x / u * 0.3 + 40, y / u * 0.3));
      r = r * (1 - tarn * 0.45);
      g = g * (1 - tarn * 0.4);
      b = b * (1 - tarn * 0.3);
      // Verdigris and grime in the hollows.
      const verd = hollow * 0.8 * (0.4 + 0.6 * sstep(0.45, 0.7, n));
      r = r * (1 - verd) + 0.16 * verd;
      g = g * (1 - verd) + 0.27 * verd;
      b = b * (1 - verd) + 0.22 * verd;
      const grime = hollow * 0.55;
      r *= 1 - grime;
      g *= 1 - grime;
      b *= 1 - grime * 0.9;
      // Bright worn edges and scratches.
      const bright = crown * 0.55 + scratch[i]! * 0.35;
      r += bright * 0.42;
      g += bright * 0.3;
      b += bright * 0.14;
      // Dark bevel sides facing away from the light (the "ink-dark dimensional bevel").
      const lit = 0.07 + diff * 1.45;
      let cr = r * lit + spec * 1.05 * (0.45 + crown) + kick * 0.45;
      let cg = g * lit + spec * 0.74 * (0.45 + crown) + kick * 0.2;
      let cb = b * lit + spec * 0.34 * (0.45 + crown) + kick * 0.06;
      cr = Math.min(1, cr);
      cg = Math.min(1, cg);
      cb = Math.min(1, cb);
      // Composite over the shadow.
      const aa = Math.max(a, sh);
      const mixA = aa > 0 ? a / aa : 0;
      out[o] = Math.round((cr * mixA + 0.02 * (1 - mixA)) * 255);
      out[o + 1] = Math.round((cg * mixA + 0.018 * (1 - mixA)) * 255);
      out[o + 2] = Math.round((cb * mixA + 0.015 * (1 - mixA)) * 255);
      out[o + 3] = Math.round(aa * 255);
    }
  }
  return { w: W, h: H, data: out };
}

function normalize3(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/* ------------------------------------------------------------------ DOM ------------------------------------------------------------------ */

let cached: HTMLCanvasElement | null = null;

/**
 * The wordmark as a canvas element (decorative; the accessible name is the heading text beside it). The casting is
 * rendered once per page at a resolution suited to the screen and copied for later menus.
 */
export function createMenuWordmark(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!cached) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(Math.min(2000, Math.max(900, Math.min(window.innerWidth, 1100) * dpr)));
    const img = renderWordmark(width);
    const c = document.createElement('canvas');
    c.width = img.w;
    c.height = img.h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const id = ctx.createImageData(img.w, img.h);
    id.data.set(img.data);
    ctx.putImageData(id, 0, 0);
    cached = c;
  }
  const copy = document.createElement('canvas');
  copy.width = cached.width;
  copy.height = cached.height;
  copy.getContext('2d')?.drawImage(cached, 0, 0);
  copy.className = 'menu-wordmark-art';
  copy.setAttribute('aria-hidden', 'true');
  copy.setAttribute('role', 'presentation');
  return copy;
}
