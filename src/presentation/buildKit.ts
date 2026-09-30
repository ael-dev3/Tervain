import * as THREE from 'three';
import { valueNoise } from '../world/noise';

/**
 * Geometry authoring kit for the settled landscape. Everything is written straight into growable typed
 * arrays (position, normal, uv, vertex colour, index) and merged per material and per region, so a whole
 * village costs a handful of draw calls. All shapes are authored in a local frame (`Ctx.push`), which
 * lets a house be described once in its own coordinates and placed anywhere.
 */

export type RGB = [number, number, number];

const colorCache = new Map<number, RGB>();
const tmpColor = new THREE.Color();
/** sRGB hex to the linear triple vertex colours expect. */
export function rgb(hex: number): RGB {
  let c = colorCache.get(hex);
  if (!c) {
    tmpColor.set(hex);
    c = [tmpColor.r, tmpColor.g, tmpColor.b];
    colorCache.set(hex, c);
  }
  return c;
}
export const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mulc = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
export type Col = number | RGB;
export const asRGB = (c: Col): RGB => (typeof c === 'number' ? rgb(c) : c);

/** Cheap deterministic hash in 0..1 for jitter that must not depend on call order. */
export function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(Math.floor(x * 97.13 + 1013), 374761393) ^ Math.imul(Math.floor(y * 91.7 + 7), 668265263) ^ Math.imul(Math.floor(z * 89.3 + 31), 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

class GrowF {
  a = new Float32Array(4096);
  n = 0;
  ensure(extra: number) {
    if (this.n + extra > this.a.length) {
      const b = new Float32Array(Math.max(this.a.length * 2, this.n + extra));
      b.set(this.a.subarray(0, this.n));
      this.a = b;
    }
  }
}
class GrowU {
  a = new Uint32Array(4096);
  n = 0;
  ensure(extra: number) {
    if (this.n + extra > this.a.length) {
      const b = new Uint32Array(Math.max(this.a.length * 2, this.n + extra));
      b.set(this.a.subarray(0, this.n));
      this.a = b;
    }
  }
}

/** Transform stack. Only translations and rotations, so normals rotate with the same matrix. */
export class Ctx {
  private cur = new THREE.Matrix4();
  private stack: THREE.Matrix4[] = [];
  private local = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private eu = new THREE.Euler();
  private p = new THREE.Vector3();
  private one = new THREE.Vector3(1, 1, 1);
  get e(): number[] {
    return this.cur.elements;
  }
  get matrix(): THREE.Matrix4 {
    return this.cur;
  }
  push(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0): this {
    this.stack.push(this.cur.clone());
    this.eu.set(rx, ry, rz, 'YXZ');
    this.q.setFromEuler(this.eu);
    this.local.compose(this.p.set(x, y, z), this.q, this.one);
    this.cur.multiply(this.local);
    return this;
  }
  /** Push an arbitrary matrix. */
  pushMatrix(m: THREE.Matrix4): this {
    this.stack.push(this.cur.clone());
    this.cur.multiply(m);
    return this;
  }
  pop(): this {
    const m = this.stack.pop();
    if (m) this.cur.copy(m);
    return this;
  }
  /** World position of a local point. */
  toWorld(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(x, y, z).applyMatrix4(this.cur);
  }
}

export interface BoxOpts {
  ry?: number;
  rx?: number;
  rz?: number;
  /** Brightness jitter for this primitive (default from the batch). */
  jit?: number;
  /** Subdivide faces into cells of this size (metres) so vertex colour noise reads on large walls. */
  sub?: number;
  /** Bit mask of faces to omit: 1=+x 2=-x 4=+y 8=-y 16=+z 32=-z. */
  skip?: number;
  /** Direction wood grain / brick courses run in: 'y' for posts. */
  grain?: 'x' | 'y' | 'z';
  /** Use coordinates local to the box (default: coordinates of the current frame, so neighbouring pieces line up). */
  face?: boolean;
  /** Colour noise amplitude override. */
  amp?: number;
}

export interface LatheOpts {
  jit?: number;
  flat?: boolean;
  ry?: number;
  rx?: number;
  rz?: number;
  amp?: number;
  /** v texture coordinate scale. */
  vs?: number;
}

const FACE_PX = 1, FACE_NX = 2, FACE_PY = 4, FACE_NY = 8, FACE_PZ = 16, FACE_NZ = 32;
export const FACES = { px: FACE_PX, nx: FACE_NX, py: FACE_PY, ny: FACE_NY, pz: FACE_PZ, nz: FACE_NZ, bottom: FACE_NY, all: 63 } as const;

/** Merges primitives that share one material into a single indexed geometry. */
export class Batch {
  readonly p = new GrowF();
  readonly nr = new GrowF();
  readonly uv = new GrowF();
  readonly co = new GrowF();
  readonly ix = new GrowU();
  nv = 0;
  /** Default brightness jitter per primitive and world-space colour noise. */
  jit = 0.05;
  amp = 0.06;
  constructor(
    readonly ctx: Ctx,
    readonly key: string,
    /** Texture repeats per metre. */
    public uvScale = 1,
  ) {}

  get tris() {
    return this.ix.n / 3;
  }

  /** Append one vertex, transformed by the current frame. Returns its index. */
  vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number, c: RGB, k = 1, amp = this.amp): number {
    const e = this.ctx.e;
    const wx = e[0]! * x + e[4]! * y + e[8]! * z + e[12]!;
    const wy = e[1]! * x + e[5]! * y + e[9]! * z + e[13]!;
    const wz = e[2]! * x + e[6]! * y + e[10]! * z + e[14]!;
    let nnx = e[0]! * nx + e[4]! * ny + e[8]! * nz;
    let nny = e[1]! * nx + e[5]! * ny + e[9]! * nz;
    let nnz = e[2]! * nx + e[6]! * ny + e[10]! * nz;
    const nl = Math.hypot(nnx, nny, nnz) || 1;
    nnx /= nl;
    nny /= nl;
    nnz /= nl;
    if (amp > 0) k *= 1 + amp * (valueNoise(wx * 0.9 + wz * 0.35, wy * 0.9 + wz * 0.6, 5) * 2 - 1) + amp * 0.5 * (valueNoise(wx * 3.1, wz * 3.1 + wy * 2.3, 9) * 2 - 1);
    this.p.ensure(3);
    this.nr.ensure(3);
    this.uv.ensure(2);
    this.co.ensure(3);
    const i = this.nv++;
    this.p.a[this.p.n++] = wx;
    this.p.a[this.p.n++] = wy;
    this.p.a[this.p.n++] = wz;
    this.nr.a[this.nr.n++] = nnx;
    this.nr.a[this.nr.n++] = nny;
    this.nr.a[this.nr.n++] = nnz;
    this.uv.a[this.uv.n++] = u * this.uvScale;
    this.uv.a[this.uv.n++] = v * this.uvScale;
    this.co.a[this.co.n++] = c[0] * k;
    this.co.a[this.co.n++] = c[1] * k;
    this.co.a[this.co.n++] = c[2] * k;
    return i;
  }

  tri(a: number, b: number, c: number) {
    this.ix.ensure(3);
    this.ix.a[this.ix.n++] = a;
    this.ix.a[this.ix.n++] = b;
    this.ix.a[this.ix.n++] = c;
  }

  quadI(a: number, b: number, c: number, d: number) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  /** A flat quad given by four local corners in counter-clockwise order (seen from the front). */
  quad(p: number[], c: Col, o: { uv?: number[]; k?: number; amp?: number; nu?: number; nv?: number; flip?: boolean } = {}) {
    const col = asRGB(c);
    const [ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz] = p as [number, number, number, number, number, number, number, number, number, number, number, number];
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    // Use the diagonal cross product, which also works for slightly non-planar quads.
    nx = (cy - ay) * (dz - bz) - (cz - az) * (dy - by);
    ny = (cz - az) * (dx - bx) - (cx - ax) * (dz - bz);
    nz = (cx - ax) * (dy - by) - (cy - ay) * (dx - bx);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    // A flipped face reverses both its visible side and its lighting normal.
    if (o.flip) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const uv = o.uv ?? [0, 0, Math.hypot(bx - ax, by - ay, bz - az), 0, Math.hypot(cx - ax, cy - ay, cz - az), Math.hypot(dx - ax, dy - ay, dz - az), 0, Math.hypot(dx - ax, dy - ay, dz - az)];
    const nu = Math.max(1, o.nu ?? 1);
    const nvv = Math.max(1, o.nv ?? 1);
    const k = o.k ?? 1;
    const amp = o.amp ?? this.amp;
    if (nu === 1 && nvv === 1) {
      const i0 = this.vert(ax, ay, az, nx, ny, nz, uv[0]!, uv[1]!, col, k, amp);
      const i1 = this.vert(bx, by, bz, nx, ny, nz, uv[2]!, uv[3]!, col, k, amp);
      const i2 = this.vert(cx, cy, cz, nx, ny, nz, uv[4]!, uv[5]!, col, k, amp);
      const i3 = this.vert(dx, dy, dz, nx, ny, nz, uv[6]!, uv[7]!, col, k, amp);
      if (o.flip) this.quadI(i0, i3, i2, i1);
      else this.quadI(i0, i1, i2, i3);
      return;
    }
    // Bilinear grid: corners A(0,0) B(1,0) C(1,1) D(0,1).
    const base = this.nv;
    for (let j = 0; j <= nvv; j++) {
      const t = j / nvv;
      for (let i = 0; i <= nu; i++) {
        const s = i / nu;
        const x = (ax * (1 - s) + bx * s) * (1 - t) + (dx * (1 - s) + cx * s) * t;
        const y = (ay * (1 - s) + by * s) * (1 - t) + (dy * (1 - s) + cy * s) * t;
        const z = (az * (1 - s) + bz * s) * (1 - t) + (dz * (1 - s) + cz * s) * t;
        const u = (uv[0]! * (1 - s) + uv[2]! * s) * (1 - t) + (uv[6]! * (1 - s) + uv[4]! * s) * t;
        const v = (uv[1]! * (1 - s) + uv[3]! * s) * (1 - t) + (uv[7]! * (1 - s) + uv[5]! * s) * t;
        this.vert(x, y, z, nx, ny, nz, u, v, col, k, amp);
      }
    }
    const row = nu + 1;
    for (let j = 0; j < nvv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = base + j * row + i;
        if (o.flip) this.quadI(a, a + row, a + row + 1, a + 1);
        else this.quadI(a, a + 1, a + row + 1, a + row);
      }
    }
  }

  /** A single flat triangle (counter-clockwise from the front). */
  tri3(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, c: Col, k = 1, uv?: number[]) {
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    const col = asRGB(c);
    const w = uv ?? [0, 0, Math.hypot(bx - ax, by - ay, bz - az), 0, 0, Math.hypot(cx - ax, cy - ay, cz - az)];
    const i0 = this.vert(ax, ay, az, nx, ny, nz, w[0]!, w[1]!, col, k);
    const i1 = this.vert(bx, by, bz, nx, ny, nz, w[2]!, w[3]!, col, k);
    const i2 = this.vert(cx, cy, cz, nx, ny, nz, w[4]!, w[5]!, col, k);
    this.tri(i0, i1, i2);
  }

  /**
   * Axis-aligned box between two corners of the current frame. Texture coordinates come from the frame's
   * own coordinates, so walls made of several boxes keep their courses aligned.
   */
  bx(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: Col, o: BoxOpts = {}) {
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    if (z1 < z0) [z0, z1] = [z1, z0];
    const col = asRGB(c);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const cz = (z0 + z1) / 2;
    const k = 1 + ((hash3(cx, cy, cz) - 0.5) * 2 * (o.jit ?? this.jit));
    const sub = o.sub ?? 0;
    const amp = o.amp ?? this.amp;
    const skip = o.skip ?? 0;
    const g = o.grain;
    const fo = o.face ? { x: -x0, y: -y0, z: -z0 } : { x: 0, y: 0, z: 0 };
    // [faceBit, corners(12), uv coords picker]
    const faces: [number, number[], number, number, number, number][] = [
      [FACE_PX, [x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1], 2, 1, 0, 0],
      [FACE_NX, [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0], 2, 1, 0, 0],
      [FACE_PY, [x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0], 0, 2, 1, 0],
      [FACE_NY, [x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1], 0, 2, 1, 0],
      [FACE_PZ, [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], 0, 1, 2, 0],
      [FACE_NZ, [x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0], 0, 1, 2, 0],
    ];
    for (const [bit, pts, ua, va] of faces) {
      if (skip & bit) continue;
      let uAxis = ua;
      let vAxis = va;
      if (g === 'y' && bit !== FACE_PY && bit !== FACE_NY) {
        uAxis = 1;
        vAxis = ua;
      } else if (g === 'z' && (bit === FACE_PY || bit === FACE_NY)) {
        uAxis = 2;
        vAxis = 0;
      } else if (g === 'x' && (bit === FACE_PX || bit === FACE_NX)) {
        uAxis = 1;
        vAxis = 2;
      }
      const uvs: number[] = [];
      for (let i = 0; i < 4; i++) {
        const px = pts[i * 3]!;
        const py = pts[i * 3 + 1]!;
        const pz = pts[i * 3 + 2]!;
        const co = [px + fo.x, py + fo.y, pz + fo.z];
        uvs.push(co[uAxis]!, co[vAxis]!);
      }
      const du = Math.max(Math.abs(pts[3]! - pts[0]!), Math.abs(pts[4]! - pts[1]!), Math.abs(pts[5]! - pts[2]!));
      const dv = Math.max(Math.abs(pts[9]! - pts[0]!), Math.abs(pts[10]! - pts[1]!), Math.abs(pts[11]! - pts[2]!));
      this.quad(pts, col, { uv: uvs, k, amp, nu: sub > 0 ? Math.max(1, Math.round(du / sub)) : 1, nv: sub > 0 ? Math.max(1, Math.round(dv / sub)) : 1 });
    }
  }

  /** Box of size w,h,d with its base centre at x,y,z (rotations about that point). */
  box(w: number, h: number, d: number, x: number, y: number, z: number, c: Col, o: BoxOpts = {}) {
    const rotated = !!(o.ry || o.rx || o.rz);
    if (rotated) {
      this.ctx.push(x, y, z, o.ry ?? 0, o.rx ?? 0, o.rz ?? 0);
      this.bx(-w / 2, 0, -d / 2, w / 2, h, d / 2, c, { face: true, ...o });
      this.ctx.pop();
    } else {
      this.bx(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, c, o);
    }
  }

  /** Box centred on x,y,z. */
  boxC(w: number, h: number, d: number, x: number, y: number, z: number, c: Col, o: BoxOpts = {}) {
    this.box(w, h, d, x, y - h / 2, z, c, o);
  }

  /**
   * Surface of revolution about the local y axis through x,y,z. `profile` is a flat list of radius, height
   * pairs from bottom to top. Smooth shading follows the profile; `flat` gives hard facets.
   */
  lathe(profile: number[], seg: number, x: number, y: number, z: number, c: Col | ((i: number, t: number) => RGB), o: LatheOpts = {}) {
    this.ctx.push(x, y, z, o.ry ?? 0, o.rx ?? 0, o.rz ?? 0);
    const n = profile.length / 2;
    const col0 = typeof c === 'function' ? null : asRGB(c);
    const k = 1 + (hash3(x, y, z) - 0.5) * 2 * (o.jit ?? this.jit);
    const amp = o.amp ?? this.amp;
    const vs = o.vs ?? 1;
    const flat = !!o.flat;
    // Profile normals (in the r,y plane), pointing outward.
    const pn: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(n - 1, i + 1);
      const dr = profile[i1 * 2]! - profile[i0 * 2]!;
      const dy = profile[i1 * 2 + 1]! - profile[i0 * 2 + 1]!;
      const l = Math.hypot(dr, dy) || 1;
      pn.push([dy / l, -dr / l]);
    }
    let arc = 0;
    const arcs: number[] = [0];
    for (let i = 1; i < n; i++) {
      arc += Math.hypot(profile[i * 2]! - profile[(i - 1) * 2]!, profile[i * 2 + 1]! - profile[(i - 1) * 2 + 1]!);
      arcs.push(arc);
    }
    if (!flat) {
      const base = this.nv;
      for (let i = 0; i < n; i++) {
        const r = profile[i * 2]!;
        const yy = profile[i * 2 + 1]!;
        const cc = col0 ?? (c as (i: number, t: number) => RGB)(i, i / Math.max(1, n - 1));
        for (let s = 0; s <= seg; s++) {
          const a = (s / seg) * Math.PI * 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          this.vert(r * ca, yy, r * sa, pn[i]![0] * ca, pn[i]![1], pn[i]![0] * sa, ((s / seg) * Math.PI * 2 * Math.max(r, 0.05)) , arcs[i]! * vs, cc, k, amp);
        }
      }
      const row = seg + 1;
      for (let i = 0; i < n - 1; i++) {
        const r0 = profile[i * 2]!;
        const r1 = profile[(i + 1) * 2]!;
        for (let s = 0; s < seg; s++) {
          const a = base + i * row + s;
          // Advance up the profile before advancing around the ring: +y cross +angle
          // points outward. At a pole only one triangle has an actual surface area.
          if (r1 >= 1e-5) this.tri(a, a + row, a + row + 1);
          if (r0 >= 1e-5) this.tri(a, a + row + 1, a + 1);
        }
      }
    } else {
      for (let i = 0; i < n - 1; i++) {
        const r0 = profile[i * 2]!;
        const y0 = profile[i * 2 + 1]!;
        const r1 = profile[(i + 1) * 2]!;
        const y1 = profile[(i + 1) * 2 + 1]!;
        const cc = col0 ?? (c as (i: number, t: number) => RGB)(i, i / Math.max(1, n - 1));
        for (let s = 0; s < seg; s++) {
          const a0 = (s / seg) * Math.PI * 2;
          const a1 = ((s + 1) / seg) * Math.PI * 2;
          const q = [r0 * Math.cos(a0), y0, r0 * Math.sin(a0), r0 * Math.cos(a1), y0, r0 * Math.sin(a1), r1 * Math.cos(a1), y1, r1 * Math.sin(a1), r1 * Math.cos(a0), y1, r1 * Math.sin(a0)];
          const kk = k * (1 + (hash3(x + s, y + i, z) - 0.5) * 0.08);
          if (r0 < 1e-5 && r1 < 1e-5) continue;
          if (r1 < 1e-5) this.tri3(q[0]!, q[1]!, q[2]!, q[9]!, q[10]!, q[11]!, q[3]!, q[4]!, q[5]!, cc, kk);
          else if (r0 < 1e-5) this.tri3(q[0]!, q[1]!, q[2]!, q[9]!, q[10]!, q[11]!, q[6]!, q[7]!, q[8]!, cc, kk);
          else this.quad([q[0]!, q[1]!, q[2]!, q[3]!, q[4]!, q[5]!, q[6]!, q[7]!, q[8]!, q[9]!, q[10]!, q[11]!], cc, { k: kk, flip: true, amp });
        }
      }
    }
    this.ctx.pop();
  }

  /** Cylinder or cone frustum standing on y, with flat end caps. */
  cyl(rTop: number, rBot: number, h: number, seg: number, x: number, y: number, z: number, c: Col, o: LatheOpts & { caps?: boolean; capTop?: boolean; capBottom?: boolean } = {}) {
    const col = asRGB(c);
    this.lathe([rBot, 0, rTop, h], seg, x, y, z, col, { ...o });
    const capsTop = o.capTop ?? o.caps ?? true;
    const capsBot = o.capBottom ?? o.caps ?? true;
    this.ctx.push(x, y, z, o.ry ?? 0, o.rx ?? 0, o.rz ?? 0);
    const amp = o.amp ?? this.amp;
    const k = 1 + (hash3(x, y, z) - 0.5) * 2 * (o.jit ?? this.jit);
    if (capsTop && rTop > 1e-4) {
      const ci = this.vert(0, h, 0, 0, 1, 0, 0, 0, col, k * 1.05, amp);
      const b = this.nv;
      for (let s = 0; s < seg; s++) {
        const a = (s / seg) * Math.PI * 2;
        this.vert(rTop * Math.cos(a), h, rTop * Math.sin(a), 0, 1, 0, rTop * Math.cos(a), rTop * Math.sin(a), col, k * 1.05, amp);
      }
      for (let s = 0; s < seg; s++) this.tri(ci, b + ((s + 1) % seg), b + s);
    }
    if (capsBot && rBot > 1e-4) {
      const ci = this.vert(0, 0, 0, 0, -1, 0, 0, 0, col, k * 0.7, amp);
      const b = this.nv;
      for (let s = 0; s < seg; s++) {
        const a = (s / seg) * Math.PI * 2;
        this.vert(rBot * Math.cos(a), 0, rBot * Math.sin(a), 0, -1, 0, rBot * Math.cos(a), rBot * Math.sin(a), col, k * 0.7, amp);
      }
      for (let s = 0; s < seg; s++) this.tri(ci, b + s, b + ((s + 1) % seg));
    }
    this.ctx.pop();
  }

  /** Cylinder lying along an arbitrary axis from a to b. */
  rod(ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, seg: number, c: Col, o: LatheOpts & { rEnd?: number; caps?: boolean } = {}) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-5) return;
    // Orient +y to the direction.
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(ax, ay, az), q, new THREE.Vector3(1, 1, 1));
    this.ctx.pushMatrix(m);
    this.cyl(o.rEnd ?? r, r, len, seg, 0, 0, 0, c, { ...o, ry: 0, rx: 0, rz: 0 });
    this.ctx.pop();
  }

  /** Lumpy ellipsoid with flat facets: rocks, sacks, bushes, hay. Centre at x,y,z. */
  blob(rx: number, ry: number, rz: number, x: number, y: number, z: number, c: Col, o: { seg?: number; rings?: number; lump?: number; seed?: number; ry?: number; rx?: number; rz?: number; jit?: number; colorFn?: (ny: number, k: number) => RGB; smooth?: boolean } = {}) {
    const seg = o.seg ?? 7;
    const rings = o.rings ?? 4;
    const lump = o.lump ?? 0.12;
    const seed = o.seed ?? Math.floor(x * 31 + z * 17 + y * 7);
    this.ctx.push(x, y, z, o.ry ?? 0, o.rx ?? 0, o.rz ?? 0);
    const col = asRGB(c);
    // vertex grid
    const grid: number[][] = [];
    for (let j = 0; j <= rings; j++) {
      const phi = (j / rings) * Math.PI;
      const row: number[] = [];
      for (let s = 0; s < seg; s++) {
        const th = (s / seg) * Math.PI * 2;
        const h = (hash3(seed + s * 1.3, j * 2.1, seed * 0.7) - 0.5) * 2;
        const rr = 1 + h * lump;
        const px = Math.sin(phi) * Math.cos(th) * rx * rr;
        const py = Math.cos(phi) * ry * (j === 0 || j === rings ? 1 : rr);
        const pz = Math.sin(phi) * Math.sin(th) * rz * rr;
        row.push(px, py, pz);
      }
      grid.push(row);
    }
    const jit = o.jit ?? 0.08;
    const smooth = !!o.smooth;
    const emit = (a: number[], b: number[], cc: number[], ia: number, ib: number, ic: number) => {
      const ax = a[ia]!, ay = a[ia + 1]!, az = a[ia + 2]!;
      const bx = b[ib]!, by = b[ib + 1]!, bz = b[ib + 2]!;
      const cx = cc[ic]!, cy = cc[ic + 1]!, cz = cc[ic + 2]!;
      const ny = (ay + by + cy) / 3 / Math.max(ry, 1e-3);
      const base = o.colorFn ? o.colorFn(ny, hash3(ax + seed, ay, az)) : col;
      const k = 1 + (hash3(ax + seed, by, cz) - 0.5) * 2 * jit;
      if (smooth) {
        // vertex normals from the ellipsoid gradient
        const vn = (px: number, py: number, pz: number) => {
          const nx = px / (rx * rx), nyy = py / (ry * ry), nz = pz / (rz * rz);
          const l = Math.hypot(nx, nyy, nz) || 1;
          return [nx / l, nyy / l, nz / l] as const;
        };
        const na = vn(ax, ay, az), nb = vn(bx, by, bz), nc = vn(cx, cy, cz);
        const i0 = this.vert(ax, ay, az, na[0], na[1], na[2], ax, az, base, k, 0.03);
        const i1 = this.vert(bx, by, bz, nb[0], nb[1], nb[2], bx, bz, base, k, 0.03);
        const i2 = this.vert(cx, cy, cz, nc[0], nc[1], nc[2], cx, cz, base, k, 0.03);
        this.tri(i0, i1, i2);
      } else this.tri3(ax, ay, az, bx, by, bz, cx, cy, cz, base, k, [ax, az, bx, bz, cx, cz]);
    };
    for (let j = 0; j < rings; j++) {
      for (let s = 0; s < seg; s++) {
        const s1 = (s + 1) % seg;
        const r0 = grid[j]!;
        const r1 = grid[j + 1]!;
        const a = s * 3;
        const b = s1 * 3;
        if (j === 0) emit(r0, r1, r1, a, b, a);
        else if (j === rings - 1) emit(r0, r0, r1, a, b, a);
        else {
          emit(r0, r1, r1, a, b, a);
          emit(r0, r0, r1, a, b, b);
        }
      }
    }
    this.ctx.pop();
  }

  /** Swept tube through points (ropes, chains, pipes, gutters). */
  tube(pts: [number, number, number][], r: number | ((t: number) => number), seg: number, c: Col, o: { closed?: boolean; jit?: number; amp?: number } = {}) {
    const col = asRGB(c);
    const n = pts.length;
    if (n < 2) return;
    const k = 1 + (hash3(pts[0]![0], pts[0]![1], pts[0]![2]) - 0.5) * 2 * (o.jit ?? this.jit);
    const amp = o.amp ?? 0.02;
    const base = this.nv;
    const up = new THREE.Vector3();
    const t = new THREE.Vector3();
    const side = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    let refUp = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const p = pts[i]!;
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(n - 1, i + 1)]!;
      t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      if (Math.abs(t.dot(refUp)) > 0.95) refUp = new THREE.Vector3(1, 0, 0);
      side.crossVectors(t, refUp).normalize();
      up.crossVectors(side, t).normalize();
      refUp = up.clone();
      const rad = typeof r === 'number' ? r : r(i / (n - 1));
      for (let s = 0; s <= seg; s++) {
        const ang = (s / seg) * Math.PI * 2;
        nrm.copy(side).multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang));
        this.vert(p[0] + nrm.x * rad, p[1] + nrm.y * rad, p[2] + nrm.z * rad, nrm.x, nrm.y, nrm.z, i * 0.3, s / seg, col, k, amp);
      }
    }
    const row = seg + 1;
    for (let i = 0; i < n - 1; i++) {
      for (let s = 0; s < seg; s++) {
        const a = base + i * row + s;
        this.tri(a, a + row, a + row + 1);
        this.tri(a, a + row + 1, a + 1);
      }
    }
  }

  /**
   * Convex (or star shaped) polygon in the local xy plane extruded along z. Used for gable ends, arches and
   * boards. `pts` are counter-clockwise seen from +z.
   */
  prism(pts: [number, number][], z0: number, z1: number, c: Col, o: { jit?: number; amp?: number; sub?: number; noFront?: boolean; noBack?: boolean; noSides?: boolean } = {}) {
    const col = asRGB(c);
    const k = 1 + (hash3(pts[0]![0], pts[0]![1], z0) - 0.5) * 2 * (o.jit ?? this.jit);
    const amp = o.amp ?? this.amp;
    let cx = 0;
    let cy = 0;
    for (const p of pts) {
      cx += p[0];
      cy += p[1];
    }
    cx /= pts.length;
    cy /= pts.length;
    const face = (z: number, nz: number) => {
      const ci = this.vert(cx, cy, z, 0, 0, nz, cx, cy, col, k, amp);
      const ids = pts.map((p) => this.vert(p[0], p[1], z, 0, 0, nz, p[0], p[1], col, k, amp));
      for (let i = 0; i < ids.length; i++) {
        const a = ids[i]!;
        const b = ids[(i + 1) % ids.length]!;
        if (nz > 0) this.tri(ci, a, b);
        else this.tri(ci, b, a);
      }
    };
    if (!o.noFront) face(z1, 1);
    if (!o.noBack) face(z0, -1);
    if (!o.noSides) {
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % pts.length]!;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        const nx = dy / l;
        const ny = -dx / l;
        const i0 = this.vert(a[0], a[1], z0, nx, ny, 0, 0, 0, col, k, amp);
        const i1 = this.vert(b[0], b[1], z0, nx, ny, 0, l, 0, col, k, amp);
        const i2 = this.vert(b[0], b[1], z1, nx, ny, 0, l, z1 - z0, col, k, amp);
        const i3 = this.vert(a[0], a[1], z1, nx, ny, 0, 0, z1 - z0, col, k, amp);
        this.quadI(i0, i1, i2, i3);
      }
    }
  }

  /** Copy another geometry (already in local units) into this batch through the current frame. */
  addGeometry(g: THREE.BufferGeometry, c: Col | null, k = 1, amp = 0, uvMul = 1) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute | undefined;
    const col = g.attributes.color as THREE.BufferAttribute | undefined;
    const uv = g.attributes.uv as THREE.BufferAttribute | undefined;
    const base = this.nv;
    const cc = c ? asRGB(c) : null;
    for (let i = 0; i < pos.count; i++) {
      const rc: RGB = cc ?? (col ? [col.getX(i), col.getY(i), col.getZ(i)] : [1, 1, 1]);
      this.vert(pos.getX(i), pos.getY(i), pos.getZ(i), nor ? nor.getX(i) : 0, nor ? nor.getY(i) : 1, nor ? nor.getZ(i) : 0, uv ? uv.getX(i) * uvMul : 0, uv ? uv.getY(i) * uvMul : 0, rc, k, amp);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.ix.ensure(1), (this.ix.a[this.ix.n++] = base + g.index.getX(i));
    else for (let i = 0; i < pos.count; i++) this.ix.ensure(1), (this.ix.a[this.ix.n++] = base + i);
  }

  /** Build the merged geometry, or null when nothing was added. */
  toGeometry(): THREE.BufferGeometry | null {
    if (this.nv === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p.a.slice(0, this.p.n), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nr.a.slice(0, this.nr.n), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv.a.slice(0, this.uv.n), 2));
    g.setAttribute('color', new THREE.BufferAttribute(this.co.a.slice(0, this.co.n), 3));
    g.setIndex(new THREE.BufferAttribute(this.nv > 65535 ? this.ix.a.slice(0, this.ix.n) : new Uint16Array(this.ix.a.subarray(0, this.ix.n)), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}
