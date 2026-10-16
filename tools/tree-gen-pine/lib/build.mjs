import { mulberry32, clamp, lerp, smoothstep } from './rng.mjs';
import { add, sub, mul, norm, cross, madd, rot, dot, len, lerp3 } from './vec.mjs';
import { BARK_TILE_W, BARK_TILE_H, reliefAt } from './bark.mjs';
import { needleCellUv, PINE_PAD_CELLS, PINE_TUFT_CELL, PINE_LEADER_CELL } from './needles.mjs';

const TAU = Math.PI * 2;
const UP = [0, 1, 0];

/** Tags: 0 trunk/limb wood, 1 needle pad, 2 soil skirt. */
export class Mesh {
  constructor() { this.p = []; this.n = []; this.uv = []; this.w = []; this.pv = []; this.c = []; this.i = []; this.count = 0; this.tag = []; }
  vert(p, uv, w, pv, n = [0, 1, 0], tag = 0) {
    this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.uv.push(uv[0], uv[1]);
    this.w.push(w[0], w[1], w[2], w[3]); this.pv.push(pv[0], pv[1], pv[2]); this.tag.push(tag);
    return this.count++;
  }
  tri(a, b, c) { this.i.push(a, b, c); }
  get tris() { return this.i.length / 3; }
  /** Area-weighted vertex normals, welded across duplicated seam vertices. */
  smoothNormals() {
    const key = (k) => Math.round(this.p[k * 3] * 2e3) + ',' + Math.round(this.p[k * 3 + 1] * 2e3) + ',' + Math.round(this.p[k * 3 + 2] * 2e3) + ',' + this.tag[k];
    const acc = new Map(), ids = new Array(this.count);
    for (let k = 0; k < this.count; k++) { const s = key(k); ids[k] = s; if (!acc.has(s)) acc.set(s, [0, 0, 0]); }
    for (let t = 0; t < this.i.length; t += 3) {
      const a = this.i[t], b = this.i[t + 1], c = this.i[t + 2];
      const pa = this.p.slice(a * 3, a * 3 + 3), pb = this.p.slice(b * 3, b * 3 + 3), pc = this.p.slice(c * 3, c * 3 + 3);
      const nrm = cross(sub(pb, pa), sub(pc, pa));
      for (const k of [a, b, c]) { const s = acc.get(ids[k]); s[0] += nrm[0]; s[1] += nrm[1]; s[2] += nrm[2]; }
    }
    for (let k = 0; k < this.count; k++) {
      const n = norm(acc.get(ids[k]));
      this.n[k * 3] = n[0]; this.n[k * 3 + 1] = n[1]; this.n[k * 3 + 2] = n[2];
    }
  }
}

/** Zip two rings (vertex index lists ascending in angle, seam duplicate last) whose parameter fractions differ. */
function bridge(m, A, fa, B, fb) {
  let i = 0, j = 0;
  while (i < A.length - 1 || j < B.length - 1) {
    const advA = j >= B.length - 1 || (i < A.length - 1 && fa[i + 1] <= fb[j + 1]);
    if (advA) { m.tri(A[i], B[j], A[i + 1]); i++; } else { m.tri(A[i], B[j], B[j + 1]); j++; }
  }
}

export const LODS = {
  near: { name: 'near', minF: 0, trunkSides: [[2.2, 16], [5, 12], [9, 10], [99, 8]], trunkStep: [[1.6, 0.2], [6, 0.75], [99, 1.15]], branchSides: 5, branchSegs: 4, stubSides: 5, stubSegs: 2, rootSides: 8, rootSegs: 6, padSeg: 3, padAcross: 2, laterals: true, lateralSides: 0, skirt: 20, relief: 1, padBoost: 1 },
  mid: { name: 'mid', minF: 0.86, trunkSides: [[3, 8], [99, 6]], trunkStep: [[2, 0.5], [6, 2], [99, 3]], branchSides: 3, branchSegs: 2, stubSides: 3, stubSegs: 1, rootSides: 6, rootSegs: 4, padSeg: 2, padAcross: 2, laterals: false, lateralSides: 0, skirt: 14, relief: 1, padBoost: 1.2 },
  far: { name: 'far', minF: 0.96, trunkSides: [[99, 6]], trunkStep: [[1, 0.5], [99, 4.5]], branchSides: 0, branchSegs: 0, stubSides: 0, stubSegs: 0, rootSides: 0, rootSegs: 0, padSeg: 1, padAcross: 1, laterals: false, lateralSides: 0, skirt: 0, relief: 0, padBoost: 1.45 },
};

function frameTube(pts) {
  // tangents + parallel-transport normals; the seam (theta = 0) starts on the underside
  const T = pts.map((p, j) => norm(sub(pts[Math.min(j + 1, pts.length - 1)], pts[Math.max(j - 1, 0)])));
  let N = sub([0, -1, 0], mul(T[0], -T[0][1]));
  if (len(N) < 0.2) N = [1, 0, 0];
  N = norm(N);
  const Ns = [], Bs = [];
  for (let j = 0; j < pts.length; j++) {
    N = norm(sub(N, mul(T[j], dot(N, T[j]))));
    Ns.push(N); Bs.push(cross(N, T[j]));
  }
  return { T, N: Ns, B: Bs };
}

/**
 * Sweep an elliptical section along `pts`. `radii[j]` = [semi-axis a, semi-axis b]. Rings share one side count.
 * Returns the ring vertex lists (for caps).
 */
function tube(m, bark, cfg, pts, radii, sides, o) {
  const fr = frameTube(pts);
  const rings = [], fracs = [];
  let s = o.s0 ?? 0;
  for (let j = 0; j < pts.length; j++) {
    if (j) s += len(sub(pts[j], pts[j - 1]));
    const ring = [], f = [];
    const rr = radii[j];
    const circ = TAU * Math.max(rr[0], rr[1]);
    const uSpan = circ / BARK_TILE_W;
    for (let i = 0; i <= sides; i++) {
      const th = (i / sides) * TAU;
      const u = (o.u0 ?? 0) + (i / sides) * uSpan, v = (o.v0 ?? 0) + s / BARK_TILE_H;
      const rel = cfg.relief ? reliefAt(bark, u, v) : 0.4;
      const k = 1 + (rel - 0.4) * (o.reliefGain ?? 0.3) * cfg.relief;
      const ox = Math.cos(th) * rr[0] * k, oy = Math.sin(th) * rr[1] * k;
      const p = add(pts[j], add(mul(fr.N[j], ox), mul(fr.B[j], oy)));
      const w = o.wind(j, s, pts.length);
      ring.push(m.vert(p, [u, v], w, o.pivot, [0, 1, 0], o.tag ?? 0));
      f.push(i / sides);
    }
    rings.push(ring); fracs.push(f);
  }
  for (let j = 0; j + 1 < rings.length; j++) bridge(m, rings[j], fracs[j], rings[j + 1], fracs[j + 1]);
  return { rings, fr };
}

function capPoint(m, ring, apexPos, uv, w, pv, tag = 0) {
  const a = m.vert(apexPos, uv, w, pv, [0, 1, 0], tag);
  for (let i = 0; i + 1 < ring.length; i++) m.tri(ring[i], a, ring[i + 1]);
}

function path(spec, b, M, startOffset) {
  const c = spec.center(b.y), r = spec.radius(b.y);
  const hd = [Math.cos(b.theta), 0, Math.sin(b.theta)];
  const base = [c[0] + hd[0] * r * startOffset, b.y, c[1] + hd[2] * r * startOffset];
  const pts = [base];
  let p = base;
  const seg = (b.L + r * (1 - startOffset)) / M;
  for (let j = 0; j < M; j++) {
    const s = (j + 0.5) / M;
    const e = b.e0 - b.droop * Math.pow(s, 1.15) + b.tipUp * Math.pow(s, 2.4) + (b.wave ?? 0) * Math.sin(s * 5.2 + (b.wavePhase ?? 0));
    const th = b.theta + b.yaw * Math.pow(s, 1.3);
    const d = [Math.cos(e) * Math.cos(th), Math.sin(e), Math.cos(e) * Math.sin(th)];
    p = madd(p, d, seg);
    pts.push(p);
  }
  return { pts };
}

const pointAt = (pts, a) => { const x = a * (pts.length - 1), j = Math.min(Math.floor(x), pts.length - 2); return { p: lerp3(pts[j], pts[j + 1], x - j), t: norm(sub(pts[j + 1], pts[j])) }; };

/** One bent needle pad: strip of quads along a drooping centre line, tent-folded across. */
function pad(m, cfg, o) {
  const { root, dir, length, width, roll, droop, fold, cell, phase, parentPhase, centre } = o;
  let right = norm(cross(dir, UP));
  if (len(cross(dir, UP)) < 0.15) right = [1, 0, 0];
  right = rot(right, norm(dir), roll);
  const [u0, v0, u1, v1] = needleCellUv(cell);
  const seg = cfg.padSeg, across = cfg.padAcross, rows = [];
  let pos = root, d = norm(dir);
  for (let j = 0; j <= seg; j++) {
    const t = j / seg;
    if (j) {
      d = norm(rot(d, right, -(droop / seg) * (0.4 + 1.2 * t)));
      pos = madd(pos, d, length / seg);
    }
    const N = norm(cross(right, d));
    const Wj = width;
    const row = [];
    for (let k = 0; k <= across; k++) {
      const x = k / across - 0.5; // -0.5..0.5
      const off = across === 1 ? 0 : fold * Math.max(0, 1 - Math.abs(x) * 2) * width;
      const p = add(add(pos, mul(right, x * Wj)), mul(N, off));
      const tilt = across === 1 ? 0 : 2 * fold * Math.sign(x);
      const cardN = norm(add(N, mul(right, tilt)));
      let out = sub(p, centre); out = norm([out[0], out[1] * 0.55, out[2]]);
      const n = norm(add(mul(cardN, 0.45), mul(out, 0.55)));
      const wv = [0.72 + 0.28 * t, phase, parentPhase, 0.38 + 0.62 * t];
      row.push(m.vert(p, [lerp(u0, u1, x + 0.5), lerp(v1, v0, t)], wv, root, n, 1));
    }
    rows.push(row);
  }
  for (let j = 0; j < seg; j++) for (let k = 0; k < across; k++) {
    const a = rows[j][k], b = rows[j][k + 1], c = rows[j + 1][k], dd = rows[j + 1][k + 1];
    m.tri(a, b, c); m.tri(b, dd, c);
  }
  return { centre: lerp3(root, pos, 0.5), radius: 0.5 * Math.hypot(length, width) * 0.72, tip: pos };
}

function hashJ(i, seed) { let h = Math.imul(i + 1, 374761393) ^ Math.imul(seed, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

export function buildLod(spec, bark, lodName, atlasCells = 16) {
  const cfg = LODS[lodName];
  const wood = new Mesh(), leaf = new Mesh();
  const rnd = mulberry32(spec.seed * 31 + 7);
  const H = spec.H, tp = spec.trunkPhase;
  // ---------- trunk ----------
  const ys = [-0.4];
  for (let y = 0; y < H - 0.05;) {
    const step = cfg.trunkStep.find(([lim]) => y < lim)[1];
    y = y < 0 ? 0 : y + step;
    ys.push(Math.min(y, H));
  }
  if (ys[ys.length - 1] < H - 0.01) ys.push(H);
  let prev = null, s = -0.4;
  const U = (y) => (spec.radius(y) > 0.37 ? 2 : 1);
  const lobes = (th, y) => {
    let a = 0;
    for (const r of spec.roots) {
      if (!r.major) continue;
      const d = Math.abs(((th - r.theta + Math.PI * 3) % TAU) - Math.PI);
      a += 0.3 * r.width * Math.exp(-Math.pow(d / 0.75, 2)) * Math.exp(-Math.max(y, 0) / (r.top * 0.85));
    }
    return a;
  };
  for (let ri = 0; ri < ys.length; ri++) {
    const y = ys[ri], c = spec.center(y);
    if (ri) { const pc = spec.center(ys[ri - 1]); s += Math.hypot(y - ys[ri - 1], c[0] - pc[0], c[1] - pc[1]); }
    const n = cfg.trunkSides.find(([lim]) => y < lim)[1];
    const ring = [], f = [];
    const jit = Array.from({ length: n }, () => (rnd() - 0.5) * 0.3);
    for (let i = 0; i <= n; i++) {
      const fr = i === n ? 1 : (i + jit[i]) / n, th = fr * TAU;
      const fu = i / n; // texture runs evenly, geometry jitters
      const u = spec.barkU + fu * U(y), v = spec.barkV + s / BARK_TILE_H;
      const rel = cfg.relief ? reliefAt(bark, u, v) : 0.4;
      const R = spec.radius(y) * (1 + lobes(th, y)) * (1 + (rel - 0.4) * 0.11 * cfg.relief);
      const p = [c[0] + Math.cos(th) * R, y, c[1] + Math.sin(th) * R];
      ring.push(wood.vert(p, [u, v], [0, tp, tp, 0], [0, 0, 0], [0, 1, 0], 0));
      f.push(fr);
    }
    if (prev) bridge(wood, prev.ring, prev.f, ring, f);
    prev = { ring, f };
  }
  {
    const c = spec.center(H);
    capPoint(wood, prev.ring, [c[0], H + 0.08, c[1]], [spec.barkU, s / BARK_TILE_H], [0, tp, tp, 0], [0, 0, 0]);
  }

  // ---------- roots + soil skirt ----------
  if (cfg.rootSides) {
    for (const r of spec.roots) {
      const rr = mulberry32(r.seed);
      const M = cfg.rootSegs, pts = [], radii = [];
      const y0 = r.top * 0.55, rad0 = spec.radius(y0 * 0.3);
      for (let j = 0; j <= M; j++) {
        const t = j / M;
        const th = r.theta + r.wiggle * t * t * 0.5 + Math.sin(t * 5 + r.seed) * 0.05;
        const dist = rad0 * 0.55 + t * r.reach;
        const y = y0 * Math.pow(1 - t, 1.7) - 0.34 * Math.pow(t, 1.4);
        const c = spec.center(Math.max(y, 0));
        pts.push([c[0] + Math.cos(th) * dist, y, c[1] + Math.sin(th) * dist]);
        const w = (r.major ? 0.27 : 0.1) * spec.rb / 0.4 * (0.35 + 0.65 * Math.pow(1 - t, 1.2)) * r.width + 0.025;
        radii.push([w * 0.95, w]);
      }
      const t0 = tube(wood, bark, cfg, pts, radii, cfg.rootSides, { u0: rr(), v0: rr() * 4, wind: () => [0, tp, tp, 0], pivot: [0, 0, 0], reliefGain: 0.35 });
      capPoint(wood, t0.rings[M], madd(pts[M], t0.fr.T[M], 0.05), [0, 0], [0, tp, tp, 0], [0, 0, 0]);
    }
  }
  if (cfg.skirt) {
    const n = cfg.skirt, inner = [], outer = [];
    const R0 = spec.radius(0.05) * 1.1;
    const cI = spec.center(0.0);
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * TAU, jr = 0.75 + 0.5 * hashJ(i % n, spec.seed);
      const lob = 1 + lobes(th, 0) * 0.9;
      const ri = R0 * lob * 0.7, ro = (R0 + 0.55 * jr) * (0.9 + lob * 0.35);
      inner.push(wood.vert([cI[0] + Math.cos(th) * ri, 0.07, cI[1] + Math.sin(th) * ri], [(Math.cos(th) * ri) / BARK_TILE_W + 0.3, (Math.sin(th) * ri) / BARK_TILE_W], [0, tp, tp, 0], [0, 0, 0], [0, 1, 0], 2));
      outer.push(wood.vert([cI[0] + Math.cos(th) * ro, -0.07, cI[1] + Math.sin(th) * ro], [(Math.cos(th) * ro) / BARK_TILE_W + 0.3, (Math.sin(th) * ro) / BARK_TILE_W], [0, tp, tp, 0], [0, 0, 0], [0, 1, 0], 2));
    }
    for (let i = 0; i < n; i++) { wood.tri(inner[i], inner[i + 1], outer[i]); wood.tri(inner[i + 1], outer[i + 1], outer[i]); }
  }

  wood.trunkIdx = wood.i.length;
  // ---------- limbs, stubs, pads ----------
  const padSpec = [];
  for (const b of spec.branches) {
    const br = mulberry32(b.seed);
    const trunkR = spec.radius(b.y);
    const phase = b.phase;
    const c = spec.center(b.y);
    const pivot = [c[0] + Math.cos(b.theta) * trunkR, b.y, c[1] + Math.sin(b.theta) * trunkR];
    if (b.dead) {
      if (!cfg.stubSides) continue;
      const { pts } = path(spec, b, b.snag ? Math.max(cfg.stubSegs, 3) : cfg.stubSegs, 0.45);
      const r0 = b.snag ? Math.max(0.06, trunkR * 0.3) : Math.max(0.045, trunkR * (0.2 + 0.18 * br()));
      const radii = pts.map((_, j) => { const t = j / (pts.length - 1); const w = r0 * (1 - 0.55 * t) * (j === 0 ? 1.15 : 1); return [w, w]; });
      const t0 = tube(wood, bark, cfg, pts, radii, cfg.stubSides, { u0: br(), v0: br() * 3, wind: (j) => [0.3 + 0.2 * (j / (pts.length - 1)), phase, tp, 0], pivot });
      const e = pts.length - 1;
      capPoint(wood, t0.rings[e], madd(pts[e], t0.fr.T[e], -r0 * 0.1), [0, 0], [0.5, phase, tp, 0], pivot);
      continue;
    }
    const { pts } = path(spec, b, Math.max(cfg.branchSegs, 3), 0.45);
    const r0 = b.spur ? 0.04 + 0.02 * br() : clamp(0.62 * trunkR * Math.pow(b.L / 5, 0.4), 0.09, 0.3);
    const radii = pts.map((_, j) => {
      const t = j / (pts.length - 1);
      const k = (1 - 0.8 * Math.pow(t, 0.9)) * (1 + 0.8 * Math.exp(-t * b.L / 0.25)) * (1 + 0.12 * Math.sin(j * 2.1 + b.phase));
      const w = Math.max(0.012, r0 * k) * (j === 0 ? 1.15 : 1); return [w, w * 0.92];
    });
    if (cfg.branchSides) {
      const t0 = tube(wood, bark, cfg, pts, radii, cfg.branchSides, { u0: br(), v0: br() * 3, wind: (j, ss, n) => [0.3 + 0.4 * (j / (n - 1)), phase, tp, 0], pivot });
      const e = pts.length - 1;
      capPoint(wood, t0.rings[e], madd(pts[e], t0.fr.T[e], 0.04), [0, 0], [0.7, phase, tp, 0], pivot);
    }
    const cellOf = () => PINE_PAD_CELLS[Math.floor(br() * PINE_PAD_CELLS.length)];
    const clusters = b.spur ? [[0.55, 0.55, -0.5], [0.98, 1, 0.2]]
      : b.upper ? [[0.5, 0.6, 0.7], [0.68, 0.78, -0.6], [0.85, 0.92, 0.45], [0.98, 1, 0.1]]
      : [[0.3, 0.5, 0.45], [0.45, 0.62, -0.6], [0.6, 0.75, 0.55], [0.72, 0.85, -0.4], [0.85, 0.92, 0.3], [0.98, 1, 0.2]];
    for (const [a, f, yaw] of clusters) {
      if (f < cfg.minF) continue;
      const { p, t } = pointAt(pts, a);
      const dir = rot(norm(add(t, [0, 0.02, 0])), UP, yaw + (br() - 0.5) * 0.3);
      const size = b.padScale * cfg.padBoost * f * (0.9 + 0.2 * br());
      padSpec.push({ root: p, dir, length: size, width: size * 1.02, roll: (br() - 0.5) * 0.5, droop: 0.05 + 0.25 * br(), fold: 0.04 + 0.05 * br(), cell: cellOf(), phase, parentPhase: tp });
    }
    if (b.upper) {
      const { p, t } = pointAt(pts, 1);
      const size = b.padScale * cfg.padBoost * 0.55;
      padSpec.push({ root: madd(p, t, -size * 0.5), dir: norm([t[0], 0.1, t[2]]), length: size, width: size, roll: 0, droop: 0, fold: 0.03, cell: PINE_TUFT_CELL, phase, parentPhase: tp });
    }
    if (cfg.laterals) {
      for (let l = 0; l < b.laterals; l++) {
        const a = 0.45 + 0.25 * br(), side = (l % 2 ? 1 : -1) * (0.7 + 0.4 * br());
        const { p, t } = pointAt(pts, a);
        const dir = norm(add(rot(t, UP, side), [0, 0.04 + 0.12 * br(), 0]));
        const Ll = (1.0 + 0.9 * br()) * Math.max(1, b.padScale * 0.5);
        const q = [p, madd(p, dir, Ll * 0.5), madd(madd(p, dir, Ll), [0, -0.05, 0], 1)];
        const lw = Math.max(0.025, radii[Math.floor(a * (radii.length - 1))][0] * 0.6);
        if (cfg.lateralSides) {
          const t1 = tube(wood, bark, cfg, q, [[lw, lw], [lw * 0.65, lw * 0.65], [lw * 0.25, lw * 0.25]], cfg.lateralSides, { u0: br(), v0: br() * 3, wind: (j) => [0.55 + 0.2 * j, phase + 0.3, tp, 0], pivot: p });
          capPoint(wood, t1.rings[2], madd(q[2], t1.fr.T[2], 0.02), [0, 0], [0.8, phase, tp, 0], p);
        }
        for (const [f, yaw] of [[0.62, -0.4], [0.5, 0.5]]) {
          const size = b.padScale * cfg.padBoost * f;
          padSpec.push({ root: q[2], dir: rot(norm(add(dir, [0, 0.05, 0])), UP, yaw), length: size, width: size, roll: (br() - 0.5) * 0.5, droop: 0.05 + 0.2 * br(), fold: 0.04, cell: cellOf(), phase: phase + 0.6, parentPhase: phase });
        }
      }
    }
  }
  // leader tuft
  const cH = spec.center(H);
  for (let k = 0; k < 3; k++) {
    const th = k * 2.1 + spec.seed;
    padSpec.push({ root: [cH[0], H - 1.1, cH[1]], dir: k ? norm([Math.cos(th) * 0.8, 0.55, Math.sin(th) * 0.8]) : [0, 1, 0], length: (k ? 1.8 : 2.4) * cfg.padBoost, width: (k ? 1.8 : 1.6) * cfg.padBoost, roll: 0.2 * k, droop: k ? 0.3 : 0, fold: 0.05, cell: k ? PINE_PAD_CELLS[k] : PINE_LEADER_CELL, phase: tp + k, parentPhase: tp });
  }
  let cx = 0, cy = 0, cz = 0;
  for (const p of padSpec) { cx += p.root[0]; cy += p.root[1]; cz += p.root[2]; }
  const centre = [cx / padSpec.length, cy / padSpec.length, cz / padSpec.length];
  const pads = [];
  for (const p of padSpec) pads.push(pad(leaf, cfg, { ...p, centre }));
  wood.smoothNormals();
  return { cfg, wood, leaf, pads, centre };
}

/** Bake vertex colour: R crown AO (0 deep inside, 1 open), G thickness, B ground AO on wood (1 on pads). */
export function bakeColors(result, spec) {
  const { wood, leaf, pads, cfg } = result;
  const spheres = pads.map((p) => ({ c: p.centre, r: Math.max(0.5, p.radius) }));
  const dirs = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - y * y), th = i * 2.399963;
    dirs.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
  }
  const MAXD = 6.5;
  const trace = (p, nrm, skipInside) => {
    let sum = 0, wsum = 0;
    for (const d of dirs) {
      const wgt = nrm ? Math.max(0.15, dot(d, nrm) * 0.8 + 0.35) : 1;
      wsum += wgt;
      let best = MAXD + 1;
      for (const s of spheres) {
        const ox = s.c[0] - p[0], oy = s.c[1] - p[1], oz = s.c[2] - p[2];
        const oo = ox * ox + oy * oy + oz * oz;
        if (skipInside && oo < s.r * s.r * 0.36) continue;
        const tc = ox * d[0] + oy * d[1] + oz * d[2];
        if (tc < 0 || tc > MAXD + s.r) continue;
        const d2 = oo - tc * tc;
        if (d2 > s.r * s.r) continue;
        const t = tc - Math.sqrt(s.r * s.r - d2);
        if (t < best) best = Math.max(t, 0);
      }
      if (best <= MAXD) sum += wgt * (1 - 0.55 * best / MAXD);
    }
    return sum / wsum;
  };
  const density = (p) => {
    let n = 0;
    for (const s of spheres) { const d = Math.hypot(s.c[0] - p[0], s.c[1] - p[1], s.c[2] - p[2]); if (d < 3) n += 1 - d / 3; }
    return n;
  };
  const colWood = [], colLeaf = [];
  for (let k = 0; k < wood.count; k++) {
    const p = [wood.p[k * 3], wood.p[k * 3 + 1], wood.p[k * 3 + 2]], n = [wood.n[k * 3], wood.n[k * 3 + 1], wood.n[k * 3 + 2]];
    const ao = cfg.name === 'far' ? 1 - 0.5 * clamp(1 - Math.abs(p[1] - 0.72 * spec.H) / (0.5 * spec.H), 0, 1) : 1 - clamp(trace(p, n, false) * 1.15, 0, 0.85);
    const ground = wood.tag[k] === 2 ? 0.18 + 0.2 * smoothstep(0, 0.16, p[1] + 0.07) : 0.3 + 0.7 * smoothstep(-0.1, 0.75, p[1]);
    const c = spec.center(clamp(p[1], 0, spec.H));
    const thick = clamp(1.1 - Math.hypot(p[0] - c[0], p[2] - c[1]) / 3.2, 0.1, 1);
    colWood.push(ao, thick, ground, 1);
  }
  for (let k = 0; k < leaf.count; k++) {
    const p = [leaf.p[k * 3], leaf.p[k * 3 + 1], leaf.p[k * 3 + 2]];
    const ao = cfg.name === 'far' ? 0.55 + 0.45 * smoothstep(0.1 * spec.H, 0.95 * spec.H, p[1]) : 1 - clamp(trace(p, null, true) * 0.8, 0, 0.5);
    leaf.c.length = 0;
    colLeaf.push(ao, clamp(density(p) / 12, 0, 1), 1, 1);
  }
  wood.c = colWood; leaf.c = colLeaf;
}
