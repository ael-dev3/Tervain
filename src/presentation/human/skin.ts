import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';

/**
 * Geometry for skinned people. Every part of a person (body, clothes, head, hair) is written into a `Mesher` per material
 * in the rig's bind pose, each vertex carrying up to four bone weights, and becomes one SkinnedMesh on a shared skeleton.
 * Gothic 3 builds its actors the same way (skinned bodies with separate heads and hair on one skeleton), and it is what
 * lets a shoulder, knee or skirt bend without the gaps and interpenetration of rigid segments.
 */

export type RGB = [number, number, number];
export type V3 = [number, number, number];

/** The bones of every humanoid, in skeleton order. L is the person's own left (+x in the bind pose; they face +z). */
export const BONES = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'legR', 'kneeR'] as const;
export type BoneName = (typeof BONES)[number];
export const BI = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;

/** A bone index and its weight. */
export type Influence = [number, number];
export type WeightFn = (x: number, y: number, z: number) => Influence[];

export const rigid = (bone: BoneName): WeightFn => {
  const w: Influence[] = [[BI[bone], 1]];
  return () => w;
};

export const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const mix3 = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul3 = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

export class Mesher {
  private readonly p: number[] = [];
  private readonly c: number[] = [];
  private readonly t: number[] = [];
  private readonly si: number[] = [];
  private readonly sw: number[] = [];
  private readonly ix: number[] = [];
  private readonly welds: number[] = [];

  get count() {
    return this.p.length / 3;
  }

  get triangles() {
    return this.ix.length / 3;
  }

  vert(x: number, y: number, z: number, col: RGB, u: number, v: number, w: Influence[]): number {
    this.p.push(x, y, z);
    this.c.push(col[0], col[1], col[2]);
    this.t.push(u, v);
    // Keep the four strongest influences, normalised.
    const s = w.filter((e) => e[1] > 1e-4).sort((a, b) => b[1] - a[1]);
    let tot = 0;
    for (let i = 0; i < Math.min(4, s.length); i++) tot += s[i]![1];
    for (let i = 0; i < 4; i++) {
      const e = s[i];
      this.si.push(e ? e[0] : 0);
      this.sw.push(e && tot > 0 ? e[1] / tot : i === 0 && !e ? 1 : 0);
    }
    return this.count - 1;
  }

  tri(a: number, b: number, c: number) {
    this.ix.push(a, b, c);
  }

  /** Two vertices at one place (a texture seam) that should share a normal. */
  weld(a: number, b: number) {
    this.welds.push(a, b);
  }

  position(i: number): V3 {
    return [this.p[i * 3]!, this.p[i * 3 + 1]!, this.p[i * 3 + 2]!];
  }

  geometry(): THREE.BufferGeometry | null {
    const n = this.count;
    if (n === 0 || this.ix.length === 0) return null;
    const P = this.p;
    const nrm = new Float32Array(n * 3);
    for (let i = 0; i < this.ix.length; i += 3) {
      const a = this.ix[i]!;
      const b = this.ix[i + 1]!;
      const c = this.ix[i + 2]!;
      const ax = P[a * 3]!, ay = P[a * 3 + 1]!, az = P[a * 3 + 2]!;
      const e1x = P[b * 3]! - ax, e1y = P[b * 3 + 1]! - ay, e1z = P[b * 3 + 2]! - az;
      const e2x = P[c * 3]! - ax, e2y = P[c * 3 + 1]! - ay, e2z = P[c * 3 + 2]! - az;
      const fx = e1y * e2z - e1z * e2y;
      const fy = e1z * e2x - e1x * e2z;
      const fz = e1x * e2y - e1y * e2x;
      for (const v of [a, b, c]) {
        nrm[v * 3] = nrm[v * 3]! + fx;
        nrm[v * 3 + 1] = nrm[v * 3 + 1]! + fy;
        nrm[v * 3 + 2] = nrm[v * 3 + 2]! + fz;
      }
    }
    for (let i = 0; i < this.welds.length; i += 2) {
      const a = this.welds[i]!;
      const b = this.welds[i + 1]!;
      for (let k = 0; k < 3; k++) {
        const s = nrm[a * 3 + k]! + nrm[b * 3 + k]!;
        nrm[a * 3 + k] = s;
        nrm[b * 3 + k] = s;
      }
    }
    for (let i = 0; i < n; i++) {
      const x = nrm[i * 3]!;
      const y = nrm[i * 3 + 1]!;
      const z = nrm[i * 3 + 2]!;
      const l = Math.hypot(x, y, z) || 1;
      nrm[i * 3] = x / l;
      nrm[i * 3 + 1] = y / l;
      nrm[i * 3 + 2] = z / l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.t, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(this.ix, 1) : new THREE.Uint16BufferAttribute(this.ix, 1));
    return g;
  }
}

/* ---------------------------------------------------------------- lofts */

/**
 * A horizontal section of a lofted surface. `w` is the half-width (x), `f` and `b` the reach in front (+z) and behind (-z)
 * of the centre, `p` a superellipse exponent (2 is an ellipse, 3 is nearly a rounded box).
 */
export interface Ring {
  y: number;
  w: number;
  f: number;
  b: number;
  cx?: number;
  cz?: number;
  p?: number;
  c: RGB;
}

export interface LoftOpts {
  sides: number;
  wf: WeightFn;
  /** Angular range, measured from the front (0 = +z) toward the person's left (+x). Default: closed all round. */
  arc?: [number, number];
  capTop?: boolean;
  capBottom?: boolean;
  /** Metres per repeat of the detail texture. */
  tile?: number;
  wobble?: number;
  seed?: number;
  /** Thickness of a turned edge at the bottom or top ring: an annulus that gives a hem or collar a visible edge. */
  lipBottom?: number;
  lipTop?: number;
  /** Per-vertex colour adjustment (angle from the front, height, base colour). */
  shade?: (th: number, y: number, c: RGB, x: number, z: number) => RGB;
  /** Per-vertex radial push in metres (angle, height), for folds, bulges and seams. */
  push?: (th: number, y: number) => number;
  /** Per-vertex vertical offset (angle, height): a neckline's V, a cloak's longer back. */
  lift?: (th: number, y: number) => number;
  /** Map a lofted point to its final place (a foot lofted along its length is turned to lie forward). */
  map?: (x: number, y: number, z: number) => V3;
}

/** A point on a section at angle th (0 = front, +π/2 = the left side). */
export function ringPoint(r: Ring, th: number, grow = 0): [number, number] {
  const s = Math.sin(th);
  const c = Math.cos(th);
  const e = 2 / (r.p ?? 2);
  const sx = Math.sign(s) * Math.pow(Math.abs(s), e);
  const sz = Math.sign(c) * Math.pow(Math.abs(c), e);
  const x = (r.cx ?? 0) + (r.w + grow) * sx;
  const z = (r.cz ?? 0) + ((sz >= 0 ? r.f : r.b) + grow) * sz;
  return [x, z];
}

export function perimeter(r: Ring): number {
  const a = r.w;
  const b = (r.f + r.b) / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

export function loft(m: Mesher, rings: Ring[], o: LoftOpts) {
  const closed = !o.arc;
  const [t0, t1] = o.arc ?? [-Math.PI, Math.PI];
  const S = o.sides;
  const rnd = mulberry32(o.seed ?? 7);
  const ph0 = rnd() * 6.28;
  const ph1 = rnd() * 6.28;
  const wob = o.wobble ?? 0;
  const tile = o.tile ?? 0.3;
  let circ = 0;
  for (const r of rings) circ += perimeter(r);
  circ /= Math.max(1, rings.length);
  const uScale = (circ * (t1 - t0)) / (2 * Math.PI) / tile;
  const starts: number[] = [];
  const addRing = (r: Ring, i: number, grow: number, dy: number, dark: number) => {
    const start = m.count;
    for (let k = 0; k <= S; k++) {
      const th = t0 + ((t1 - t0) * k) / S;
      const n = wob ? wob * (Math.sin(3 * th + ph0 + i * 0.7) * 0.6 + Math.sin(5 * th + ph1 - i * 1.3) * 0.4) : 0;
      const push = o.push ? o.push(th, r.y) : 0;
      const ww = r.w * (1 + n) + push + grow;
      const ff = r.f * (1 + n) + push + grow;
      const bb = r.b * (1 + n) + push + grow;
      const [x, z] = ringPoint({ ...r, w: Math.max(1e-4, ww), f: Math.max(1e-4, ff), b: Math.max(1e-4, bb) }, th);
      const y = r.y + dy + (o.lift ? o.lift(th, r.y) : 0);
      let col = o.shade ? o.shade(th, y, r.c, x, z) : r.c;
      if (dark !== 1) col = mul3(col, dark);
      const q: V3 = o.map ? o.map(x, y, z) : [x, y, z];
      m.vert(q[0], q[1], q[2], col, (k / S) * uScale, r.y / tile, o.wf(q[0], q[1], q[2]));
    }
    if (closed) m.weld(start, start + S);
    return start;
  };
  if (o.lipBottom) starts.push(addRing(rings[0]!, -1, -o.lipBottom, o.lipBottom * 0.4, 0.72));
  rings.forEach((r, i) => starts.push(addRing(r, i, 0, 0, 1)));
  if (o.lipTop) starts.push(addRing(rings[rings.length - 1]!, rings.length, -o.lipTop, -o.lipTop * 0.4, 0.78));
  for (let i = 0; i < starts.length - 1; i++) {
    for (let k = 0; k < S; k++) {
      const a = starts[i]! + k;
      const b = a + 1;
      const d = starts[i + 1]! + k;
      const c = d + 1;
      m.tri(a, b, c);
      m.tri(a, c, d);
    }
  }
  const cap = (ringStart: number, r: Ring, top: boolean) => {
    const cx = r.cx ?? 0;
    const cz = r.cz ?? 0;
    const q: V3 = o.map ? o.map(cx, r.y, cz) : [cx, r.y, cz];
    const ctr = m.vert(q[0], q[1], q[2], o.shade ? o.shade(0, r.y, r.c, cx, cz) : r.c, 0.5 * uScale, r.y / tile, o.wf(q[0], q[1], q[2]));
    for (let k = 0; k < S; k++) {
      const a = ringStart + k;
      if (top) m.tri(ctr, a, a + 1);
      else m.tri(ctr, a + 1, a);
    }
  };
  if (o.capBottom) cap(starts[0]!, rings[0]!, false);
  if (o.capTop) cap(starts[starts.length - 1]!, rings[rings.length - 1]!, true);
}

/* ---------------------------------------------------------------- tubes along paths */

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const v3 = { sub, add, scl, dot, cross, norm };

export interface TubeOpts {
  sides: number;
  wf: WeightFn;
  capStart?: boolean;
  capEnd?: boolean;
  /** Reference "up" for the first frame; for straps, a function giving the outward direction at a point. */
  up?: V3 | ((p: V3) => V3);
  /** Section aspect: the radius along the frame's normal is r * flat (a strap is wide and thin). */
  flat?: number;
  tile?: number;
  /** Rotate the section about the path (radians). */
  twist?: number;
  /** Offset the section along the frame's normal by this fraction of r (a strap lies on a surface, not through it). */
  lift?: number;
}

/** A tube along a polyline with radius per point, using transported frames so it never twists unexpectedly. */
export function tube(m: Mesher, pts: V3[], radii: number[] | number, colors: RGB[] | RGB, o: TubeOpts) {
  const N = pts.length;
  if (N < 2) return;
  const S = o.sides;
  const rad = (i: number) => (Array.isArray(radii) ? radii[i]! : radii);
  const col = (i: number): RGB => (Array.isArray(colors[0]) ? (colors as RGB[])[i]! : (colors as RGB));
  const tangents: V3[] = pts.map((_, i) => norm(sub(pts[Math.min(N - 1, i + 1)]!, pts[Math.max(0, i - 1)]!)));
  const upAt = (i: number): V3 => (typeof o.up === 'function' ? o.up(pts[i]!) : (o.up ?? [0, 0, 1]));
  let nPrev: V3 = [0, 0, 0];
  const frames: [V3, V3][] = [];
  for (let i = 0; i < N; i++) {
    const t = tangents[i]!;
    let n: V3;
    if (i === 0 || typeof o.up === 'function') {
      const u = upAt(i);
      n = sub(u, scl(t, dot(u, t)));
      if (Math.hypot(n[0], n[1], n[2]) < 1e-5) n = sub([1, 0, 0], scl(t, t[0]));
      n = norm(n);
    } else {
      n = norm(sub(nPrev, scl(t, dot(nPrev, t))));
    }
    nPrev = n;
    frames.push([n, norm(cross(t, n))]);
  }
  const flat = o.flat ?? 1;
  const tw = o.twist ?? 0;
  const tile = o.tile ?? 0.1;
  let along = 0;
  const starts: number[] = [];
  for (let i = 0; i < N; i++) {
    if (i > 0) along += Math.hypot(...sub(pts[i]!, pts[i - 1]!));
    const [n, b] = frames[i]!;
    const r = rad(i);
    const c = pts[i]!;
    const lift = scl(n, (o.lift ?? 0) * r * flat);
    const start = m.count;
    for (let k = 0; k <= S; k++) {
      const a = (k / S) * Math.PI * 2 + tw;
      const off = add(scl(n, Math.cos(a) * r * flat), scl(b, Math.sin(a) * r));
      const p = add(add(c, off), lift);
      m.vert(p[0], p[1], p[2], col(i), k / S, along / tile, o.wf(c[0], c[1], c[2]));
    }
    m.weld(start, start + S);
    starts.push(start);
  }
  for (let i = 0; i < N - 1; i++) {
    for (let k = 0; k < S; k++) {
      const a = starts[i]! + k;
      const b = a + 1;
      const d = starts[i + 1]! + k;
      const c = d + 1;
      // (tangent, normal, binormal) is right-handed whichever way the path runs, so this winding always faces outward.
      m.tri(a, b, c);
      m.tri(a, c, d);
    }
  }
  const cap = (i: number, end: boolean) => {
    const c = pts[i]!;
    const [n] = frames[i]!;
    const lift = scl(n, (o.lift ?? 0) * rad(i) * flat);
    const ctr = m.vert(c[0] + lift[0], c[1] + lift[1], c[2] + lift[2], col(i), 0.5, along / tile, o.wf(c[0], c[1], c[2]));
    for (let k = 0; k < S; k++) {
      const a = starts[i]! + k;
      if (end) m.tri(ctr, a, a + 1);
      else m.tri(ctr, a + 1, a);
    }
  };
  if (o.capStart) cap(0, false);
  if (o.capEnd) cap(N - 1, true);
}

/* ---------------------------------------------------------------- small solids */

/** A box given by its centre, half-sizes and an orthonormal basis (x, y, z axes). Flat-shaded look via separate faces. */
export function box(m: Mesher, c: V3, h: V3, col: RGB, wf: WeightFn, axes: [V3, V3, V3] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
  const [ax, ay, az] = axes;
  const corner = (sx: number, sy: number, sz: number): V3 => add(add(add(c, scl(ax, sx * h[0])), scl(ay, sy * h[1])), scl(az, sz * h[2]));
  const faces: [V3, V3, V3, V3][] = [
    [corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(1, -1, 1)],
    [corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1), corner(-1, -1, -1)],
    [corner(-1, 1, -1), corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1)],
    [corner(-1, -1, 1), corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1)],
    [corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1)],
    [corner(1, -1, -1), corner(-1, -1, -1), corner(-1, 1, -1), corner(1, 1, -1)],
  ];
  const w = wf(c[0], c[1], c[2]);
  for (const f of faces) {
    const i0 = m.vert(...f[0], col, 0, 0, w);
    const i1 = m.vert(...f[1], col, 1, 0, w);
    const i2 = m.vert(...f[2], col, 1, 1, w);
    const i3 = m.vert(...f[3], col, 0, 1, w);
    m.tri(i0, i1, i2);
    m.tri(i0, i2, i3);
  }
}

/**
 * An ellipsoid (UV sphere) with three.js SphereGeometry's parameterisation, so a texture's (0.25, 0.5) lands on its +z
 * pole. `basis` orients it; `shape` may reshape each unit direction (for ears, pouches, caps).
 */
export function ellipsoid(
  m: Mesher,
  c: V3,
  r: V3,
  col: RGB | ((d: V3) => RGB),
  wf: WeightFn,
  o: { ws?: number; hs?: number; basis?: [V3, V3, V3]; theta?: [number, number]; shape?: (d: V3) => V3 } = {},
) {
  const ws = o.ws ?? 10;
  const hs = o.hs ?? 8;
  const [ax, ay, az] = o.basis ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const [th0, th1] = o.theta ?? [0, Math.PI];
  const w = wf(c[0], c[1], c[2]);
  const rows: number[] = [];
  for (let iy = 0; iy <= hs; iy++) {
    const th = th0 + ((th1 - th0) * iy) / hs;
    const start = m.count;
    for (let ix = 0; ix <= ws; ix++) {
      const ph = (ix / ws) * Math.PI * 2;
      let d: V3 = [-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)];
      if (o.shape) d = o.shape(d);
      const lx = d[0] * r[0];
      const ly = d[1] * r[1];
      const lz = d[2] * r[2];
      const p = add(add(add(c, scl(ax, lx)), scl(ay, ly)), scl(az, lz));
      m.vert(p[0], p[1], p[2], typeof col === 'function' ? col(d) : col, ix / ws, 1 - iy / hs, w);
    }
    m.weld(start, start + ws);
    rows.push(start);
  }
  for (let iy = 0; iy < hs; iy++) {
    for (let ix = 0; ix < ws; ix++) {
      const a = rows[iy]! + ix;
      const b = rows[iy + 1]! + ix;
      if (iy !== 0 || th0 > 0) m.tri(a, b, a + 1);
      if (iy !== hs - 1 || th1 < Math.PI) m.tri(a + 1, b, b + 1);
    }
  }
}
