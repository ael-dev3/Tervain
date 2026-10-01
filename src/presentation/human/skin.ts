import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';

/**
 * Geometry for skinned people. Every part of a person (body, clothes, head, hair) is written into a `Mesher` in the rig's
 * bind pose, each vertex carrying up to four bone weights, and the person becomes one SkinnedMesh on its skeleton.
 * Gothic 3 builds its actors the same way (skinned bodies with separate heads and hair on one skeleton), and it is what
 * lets a shoulder, knee or skirt bend without the gaps and interpenetration of rigid segments.
 *
 * Each vertex also records which painted part it belongs to (`part`, an index into the person's part table) and where it
 * lies on that part (`PA` local attributes), so the sheet painter can draw hems, seams, trims and folds that land on the
 * modelled ones (sheet.ts, paint.ts).
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

/**
 * Local paint attributes per vertex:
 *   0 lu    across the surface: metres of arc from the front for lofts, 0..1 round a tube or sphere
 *   1 lv    along it: bind height for lofts (distance along a foot), metres along a tube, 0..1 down a sphere
 *   2 e0    distance to the lower (or starting) edge, metres; 9 if none
 *   3 e1    distance to the upper (or end) edge
 *   4 e2    distance to an opening's edge (an open coat's front, an apron's sides)
 *   5 fold  the fold's push at this vertex (m), negative in a valley
 *   6..9    primitive-specific: lofts (angle from the front, ring fraction, 1 on a turned edge); spheres (unit direction);
 *           tubes (angle 0..1, fraction along); the head grid (unused); lids (row, upper)
 */
export const PA = 10;
export const NO_EDGE = 9;
const ZERO_PA: readonly number[] = new Array(PA).fill(0);

export interface MesherData {
  pos: Float32Array;
  col: Float32Array;
  uv: Float32Array;
  skinIndex: Uint16Array;
  skinWeight: Float32Array;
  index: Uint32Array;
  welds: Uint32Array;
  pa: Float32Array;
  part: Uint16Array;
}

export class Mesher {
  private readonly p: number[] = [];
  private readonly c: number[] = [];
  private readonly t: number[] = [];
  private readonly si: number[] = [];
  private readonly sw: number[] = [];
  private readonly ix: number[] = [];
  private readonly welds: number[] = [];
  private readonly pa: number[] = [];
  private readonly pid: number[] = [];
  /** The painted part that new vertices belong to (an index into the person's part table). */
  part = 0;

  get count() {
    return this.p.length / 3;
  }

  get triangles() {
    return this.ix.length / 3;
  }

  vert(x: number, y: number, z: number, col: RGB, u: number, v: number, w: Influence[], a: readonly number[] = ZERO_PA): number {
    this.p.push(x, y, z);
    this.c.push(col[0], col[1], col[2]);
    this.t.push(u, v);
    // Keep the four strongest influences, normalised.
    const s = w.filter((e) => e[1] > 1e-4).sort((p, q) => q[1] - p[1]);
    let tot = 0;
    for (let i = 0; i < Math.min(4, s.length); i++) tot += s[i]![1];
    for (let i = 0; i < 4; i++) {
      const e = s[i];
      this.si.push(e ? e[0] : 0);
      this.sw.push(e && tot > 0 ? e[1] / tot : i === 0 && !e ? 1 : 0);
    }
    for (let k = 0; k < PA; k++) this.pa.push(a[k] ?? 0);
    this.pid.push(this.part);
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

  /** Change the local attributes of a vertex already written (for primitives that learn them afterwards). */
  setAttr(i: number, k: number, value: number) {
    this.pa[i * PA + k] = value;
  }

  data(): MesherData {
    return {
      pos: new Float32Array(this.p),
      col: new Float32Array(this.c),
      uv: new Float32Array(this.t),
      skinIndex: new Uint16Array(this.si),
      skinWeight: new Float32Array(this.sw),
      index: new Uint32Array(this.ix),
      welds: new Uint32Array(this.welds),
      pa: new Float32Array(this.pa),
      part: new Uint16Array(this.pid),
    };
  }

  /** A plain skinned geometry with vertex colours (props and the sash, which are not painted into a sheet). */
  geometry(): THREE.BufferGeometry | null {
    const n = this.count;
    if (n === 0 || this.ix.length === 0) return null;
    const d = this.data();
    const nrm = smoothNormals(d.pos, d.index, d.welds);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('color', new THREE.BufferAttribute(d.col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(d.skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(d.skinWeight, 4));
    g.setIndex(n > 65535 ? new THREE.BufferAttribute(d.index, 1) : new THREE.BufferAttribute(new Uint16Array(d.index), 1));
    return g;
  }
}

/** Area-weighted vertex normals; `welds` pairs vertices at one place (texture seams) that share a normal. */
export function smoothNormals(pos: Float32Array, index: ArrayLike<number>, welds: ArrayLike<number> = []): Float32Array {
  const n = pos.length / 3;
  const nrm = new Float32Array(n * 3);
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i]!;
    const b = index[i + 1]!;
    const c = index[i + 2]!;
    const ax = pos[a * 3]!, ay = pos[a * 3 + 1]!, az = pos[a * 3 + 2]!;
    const e1x = pos[b * 3]! - ax, e1y = pos[b * 3 + 1]! - ay, e1z = pos[b * 3 + 2]! - az;
    const e2x = pos[c * 3]! - ax, e2y = pos[c * 3 + 1]! - ay, e2z = pos[c * 3 + 2]! - az;
    const fx = e1y * e2z - e1z * e2y;
    const fy = e1z * e2x - e1x * e2z;
    const fz = e1x * e2y - e1y * e2x;
    nrm[a * 3] = nrm[a * 3]! + fx;
    nrm[a * 3 + 1] = nrm[a * 3 + 1]! + fy;
    nrm[a * 3 + 2] = nrm[a * 3 + 2]! + fz;
    nrm[b * 3] = nrm[b * 3]! + fx;
    nrm[b * 3 + 1] = nrm[b * 3 + 1]! + fy;
    nrm[b * 3 + 2] = nrm[b * 3 + 2]! + fz;
    nrm[c * 3] = nrm[c * 3]! + fx;
    nrm[c * 3 + 1] = nrm[c * 3 + 1]! + fy;
    nrm[c * 3 + 2] = nrm[c * 3 + 2]! + fz;
  }
  for (let i = 0; i < welds.length; i += 2) {
    const a = welds[i]!;
    const b = welds[i + 1]!;
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
    const l = Math.sqrt(x * x + y * y + z * z) || 1;
    nrm[i * 3] = x / l;
    nrm[i * 3 + 1] = y / l;
    nrm[i * 3 + 2] = z / l;
  }
  return nrm;
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
  // Edges are the lowest and highest rings, whichever way the loft runs (a boot's shaft is lofted downward).
  const yLo = Math.min(rings[0]!.y, rings[rings.length - 1]!.y);
  const yHi = Math.max(rings[0]!.y, rings[rings.length - 1]!.y);
  const starts: number[] = [];
  const a: number[] = new Array(PA).fill(0);
  const addRing = (r: Ring, i: number, grow: number, dy: number, dark: number, lip: number) => {
    const start = m.count;
    const radius = perimeter(r) / (2 * Math.PI);
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
      a[0] = th * radius;
      a[1] = r.y;
      a[2] = Math.max(0, r.y - yLo);
      a[3] = Math.max(0, yHi - r.y);
      a[4] = closed ? NO_EDGE : Math.min(th - t0, t1 - th) * radius;
      a[5] = push + n * radius;
      a[6] = th;
      a[7] = rings.length > 1 ? i / (rings.length - 1) : 0;
      a[8] = lip !== 0 ? 1 : 0;
      a[9] = 0;
      m.vert(q[0], q[1], q[2], col, (k / S) * uScale, r.y / tile, o.wf(q[0], q[1], q[2]), a);
    }
    if (closed) m.weld(start, start + S);
    return start;
  };
  if (o.lipBottom) starts.push(addRing(rings[0]!, -1, -o.lipBottom, o.lipBottom * 0.4, 0.72, -1));
  rings.forEach((r, i) => starts.push(addRing(r, i, 0, 0, 1, 0)));
  if (o.lipTop) starts.push(addRing(rings[rings.length - 1]!, rings.length, -o.lipTop, -o.lipTop * 0.4, 0.78, 1));
  for (let i = 0; i < starts.length - 1; i++) {
    for (let k = 0; k < S; k++) {
      const p = starts[i]! + k;
      const b = p + 1;
      const d = starts[i + 1]! + k;
      const c = d + 1;
      m.tri(p, b, c);
      m.tri(p, c, d);
    }
  }
  const cap = (ringStart: number, r: Ring, top: boolean) => {
    const cx = r.cx ?? 0;
    const cz = r.cz ?? 0;
    const q: V3 = o.map ? o.map(cx, r.y, cz) : [cx, r.y, cz];
    a.fill(0);
    a[1] = r.y;
    a[2] = Math.max(0, r.y - yLo);
    a[3] = Math.max(0, yHi - r.y);
    a[4] = NO_EDGE;
    a[8] = 2;
    const ctr = m.vert(q[0], q[1], q[2], o.shade ? o.shade(0, r.y, r.c, cx, cz) : r.c, 0.5 * uScale, r.y / tile, o.wf(q[0], q[1], q[2]), a);
    for (let k = 0; k < S; k++) {
      const p = ringStart + k;
      if (top) m.tri(ctr, p, p + 1);
      else m.tri(ctr, p + 1, p);
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
  let total = 0;
  for (let i = 1; i < N; i++) total += Math.hypot(...sub(pts[i]!, pts[i - 1]!));
  let along = 0;
  const starts: number[] = [];
  const a: number[] = new Array(PA).fill(0);
  for (let i = 0; i < N; i++) {
    if (i > 0) along += Math.hypot(...sub(pts[i]!, pts[i - 1]!));
    const [n, b] = frames[i]!;
    const r = rad(i);
    const c = pts[i]!;
    const lift = scl(n, (o.lift ?? 0) * r * flat);
    const start = m.count;
    for (let k = 0; k <= S; k++) {
      const ang = (k / S) * Math.PI * 2 + tw;
      const off = add(scl(n, Math.cos(ang) * r * flat), scl(b, Math.sin(ang) * r));
      const p = add(add(c, off), lift);
      a[0] = k / S;
      a[1] = along;
      a[2] = along;
      a[3] = total - along;
      a[4] = NO_EDGE;
      a[6] = k / S;
      a[7] = total > 0 ? along / total : 0;
      m.vert(p[0], p[1], p[2], col(i), k / S, along / tile, o.wf(c[0], c[1], c[2]), a);
    }
    m.weld(start, start + S);
    starts.push(start);
  }
  for (let i = 0; i < N - 1; i++) {
    for (let k = 0; k < S; k++) {
      const p = starts[i]! + k;
      const b = p + 1;
      const d = starts[i + 1]! + k;
      const c = d + 1;
      // (tangent, normal, binormal) is right-handed whichever way the path runs, so this winding always faces outward.
      m.tri(p, b, c);
      m.tri(p, c, d);
    }
  }
  const cap = (i: number, end: boolean) => {
    const c = pts[i]!;
    const [n] = frames[i]!;
    const lift = scl(n, (o.lift ?? 0) * rad(i) * flat);
    a.fill(0);
    a[1] = end ? total : 0;
    a[2] = end ? total : 0;
    a[3] = end ? 0 : total;
    a[4] = NO_EDGE;
    a[7] = end ? 1 : 0;
    const ctr = m.vert(c[0] + lift[0], c[1] + lift[1], c[2] + lift[2], col(i), 0.5, along / tile, o.wf(c[0], c[1], c[2]), a);
    for (let k = 0; k < S; k++) {
      const p = starts[i]! + k;
      if (end) m.tri(ctr, p, p + 1);
      else m.tri(ctr, p + 1, p);
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
  const a: number[] = new Array(PA).fill(0);
  a[2] = a[3] = a[4] = NO_EDGE;
  faces.forEach((f, fi) => {
    a[6] = fi;
    const uvs: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const ids = f.map((p, k) => {
      a[0] = uvs[k]![0];
      a[1] = uvs[k]![1];
      return m.vert(p[0], p[1], p[2], col, uvs[k]![0], uvs[k]![1], w, a);
    });
    m.tri(ids[0]!, ids[1]!, ids[2]!);
    m.tri(ids[0]!, ids[2]!, ids[3]!);
  });
}

/**
 * An ellipsoid (UV sphere) with three.js SphereGeometry's parameterisation. `basis` orients it; `shape` may reshape each
 * unit direction (for ears, pouches, caps). Its local paint attributes carry the (reshaped) unit direction.
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
  const a: number[] = new Array(PA).fill(0);
  a[2] = a[3] = a[4] = NO_EDGE;
  for (let iy = 0; iy <= hs; iy++) {
    const th = th0 + ((th1 - th0) * iy) / hs;
    const start = m.count;
    for (let ix = 0; ix <= ws; ix++) {
      const ph = (ix / ws) * Math.PI * 2;
      const d0: V3 = [-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)];
      const d = o.shape ? o.shape(d0) : d0;
      const lx = d[0] * r[0];
      const ly = d[1] * r[1];
      const lz = d[2] * r[2];
      const p = add(add(add(c, scl(ax, lx)), scl(ay, ly)), scl(az, lz));
      a[0] = ix / ws;
      a[1] = iy / hs;
      a[6] = d0[0];
      a[7] = d0[1];
      a[8] = d0[2];
      m.vert(p[0], p[1], p[2], typeof col === 'function' ? col(d) : col, ix / ws, 1 - iy / hs, w, a);
    }
    m.weld(start, start + ws);
    rows.push(start);
  }
  for (let iy = 0; iy < hs; iy++) {
    for (let ix = 0; ix < ws; ix++) {
      const p = rows[iy]! + ix;
      const b = rows[iy + 1]! + ix;
      if (iy !== 0 || th0 > 0) m.tri(p, b, p + 1);
      if (iy !== hs - 1 || th1 < Math.PI) m.tri(p + 1, b, b + 1);
    }
  }
}
