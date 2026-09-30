import * as THREE from 'three';
import { mulberry32 } from '../world/noise';

/**
 * Rigid lofted geometry for creatures: a surface lofted through elliptical sections with vertex colours, and a tapering
 * limb. People are built by the skinned generator in ./human (characters.ts); the Thornback still uses these.
 */

export type RGB = [number, number, number];

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

class Acc {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  get n() {
    return this.pos.length / 3;
  }
  vert(p: [number, number, number], n: [number, number, number], c: RGB, u = 0, v = 0) {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.col.push(c[0], c[1], c[2]);
    this.uv.push(u, v);
    return this.n - 1;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    return g;
  }
}

export interface Section {
  y: number;
  rx: number;
  rz: number;
  /** Centre offsets. */
  cx?: number;
  cz?: number;
  color: RGB;
}

/** A surface lofted through elliptical sections from bottom to top, with smooth normals and a noise wobble. */
export function loft(sections: Section[], sides: number, o: { wobble?: number; seed?: number; capBottom?: boolean; capTop?: boolean; open?: boolean; uvScale?: number; arc?: [number, number] } = {}): THREE.BufferGeometry {
  const acc = new Acc();
  const rnd = mulberry32(o.seed ?? 1);
  const wob = o.wobble ?? 0;
  const rings: number[] = [];
  const n = sections.length;
  for (let i = 0; i < n; i++) {
    const s = sections[i]!;
    const prev = sections[Math.max(0, i - 1)]!;
    const next = sections[Math.min(n - 1, i + 1)]!;
    const dy = next.y - prev.y || 1e-4;
    const start = acc.n;
    const ph = rnd() * 6;
    for (let k = 0; k <= sides; k++) {
      const a = o.arc ? o.arc[0] + (k / sides) * (o.arc[1] - o.arc[0]) : (k / sides) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const w = 1 + wob * Math.sin(a * 3 + ph + i) * (0.6 + 0.4 * Math.sin(i * 1.7 + ph));
      const px = (s.cx ?? 0) + ca * s.rx * w;
      const pz = (s.cz ?? 0) + sa * s.rz * w;
      // Normal: ellipse normal tilted by the profile slope.
      const drx = (next.rx - prev.rx) / dy;
      const drz = (next.rz - prev.rz) / dy;
      let nx = ca / s.rx;
      let nz = sa / s.rz;
      let ny = -(drx * ca + drz * sa) * 0.5;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      acc.vert([px, s.y, pz], [nx, ny, nz], s.color, (k / sides) * (o.uvScale ?? 1), s.y);
    }
    rings.push(start);
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a = rings[i]! + k;
      const b = rings[i + 1]! + k;
      acc.idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const cap = (i: number, up: boolean) => {
    const s = sections[i]!;
    const c = acc.vert([s.cx ?? 0, s.y, s.cz ?? 0], [0, up ? 1 : -1, 0], s.color);
    for (let k = 0; k < sides; k++) {
      const a = rings[i]! + k;
      if (up) acc.idx.push(c, a + 1, a);
      else acc.idx.push(c, a, a + 1);
    }
  };
  if (!o.open) {
    if (o.capBottom ?? true) cap(0, false);
    if (o.capTop ?? true) cap(n - 1, true);
  }
  return acc.geometry();
}

/** A limb segment hanging down from y = 0 to y = -len, radius easing from r0 to r1 with a bulge (muscle) near the given point. */
export function limb(r0: number, r1: number, len: number, o: { bulge?: number; at?: number; flatten?: number; top: RGB; bottom: RGB; seed?: number; sides?: number; dirt?: number }): THREE.BufferGeometry {
  const secs: Section[] = [];
  const steps = 6;
  const bulge = o.bulge ?? 0.12;
  const at = o.at ?? 0.35;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = (r0 + (r1 - r0) * t) * (1 + bulge * Math.exp(-Math.pow((t - at) / 0.22, 2)));
    const c = mix(o.top, o.bottom, t);
    const dirt = 1 - (o.dirt ?? 0.18) * sstep(0.55, 1, t);
    secs.push({ y: -len * t, rx: r, rz: r * (o.flatten ?? 1), color: mul(c, dirt) });
  }
  return loft(secs, o.sides ?? 9, { wobble: 0.018, seed: o.seed });
}
