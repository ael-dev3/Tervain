import * as THREE from 'three';
import { fbm, mulberry32, valueNoise } from '../../world/noise';

/**
 * Standing stones: tall, thin slabs of split rock, older than the order and older than the tree. Each is a subdivided slab
 * pushed in and out by noise, tapering upward, with its top broken off at a slant and a notch knocked out of it. Lichen
 * grows on the upper weather side, rain has left dark streaks down the faces, and the foot is stained by the earth.
 * Vertex colours multiply the playable rock texture, like the rest of the kit.
 *
 * Every vertex is displaced as a function of its undisplaced position (radially from the slab's axis), so the corners
 * shared by two faces move together and the stone stays closed.
 */

type V3 = [number, number, number];

export interface SlabSpec {
  w: number;
  h: number;
  d: number;
  seed: number;
  /** Where the sides start, local y: below the ground for a standing stone (default -0.5), 0 for a capstone. */
  below?: number;
  /** Close the underside, for a stone whose bottom can be seen (a capstone). */
  bottom?: boolean;
}

export function slabGeometry(spec: SlabSpec): THREE.BufferGeometry {
  const { w, h, d, seed } = spec;
  const rng = mulberry32(seed);
  const nu = 6;
  const nv = 14;
  const nw = 4;
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const slant = (rng() - 0.5) * 0.9;
  const notchX = (rng() - 0.5) * w * 0.6;
  const notchDepth = 0.08 + rng() * 0.12;
  const below = spec.below ?? -0.5;
  const topAt = (x: number, z: number) =>
    h * (1 - 0.12 * Math.abs((x / w) * 2)) + slant * (x / w) * h * 0.25 - Math.max(0, notchDepth * h - Math.abs(x - notchX) * 1.3) + z * 0.1;
  const displaced = (p: V3, topness: number): V3 => {
    const rx = p[0] / (w * 0.5);
    const rz = p[2] / (d * 0.5);
    const l = Math.hypot(rx, rz) || 1;
    const dir: V3 = [rx / l, 0, rz / l];
    const k = fbm(p[0] * 0.9 + seed, p[1] * 0.7 + p[2] * 0.9, 4, seed) * 0.16 * Math.min(w, d * 2) + (valueNoise(p[0] * 5.1 + p[2] * 3.7, p[1] * 4.3, seed + 7) - 0.5) * 0.035;
    const up = topness * (valueNoise(p[0] * 3.3, p[2] * 3.3, seed + 13) - 0.5) * 0.12;
    return [p[0] + dir[0] * k, p[1] + up, p[2] + dir[2] * k];
  };
  const colour = (q: V3): V3 => {
    const y01 = Math.max(0, q[1] / h);
    const streak = valueNoise(q[0] * 6 + q[2] * 6, 0.5, seed + 3) * valueNoise(q[0] * 1.3 + q[2] * 1.1, q[1] * 0.4, seed + 5);
    const lichen = Math.max(0, valueNoise(q[0] * 2.2 + seed, q[1] * 2.2 + q[2] * 2.2, seed + 11) - 0.55) * 2.2 * (0.4 + y01);
    const foot = Math.max(0, 1 - q[1] / 0.5);
    let c: V3 = [0.95, 0.93, 0.88];
    c = [c[0] * (1 - streak * 0.45), c[1] * (1 - streak * 0.45), c[2] * (1 - streak * 0.4)];
    c = [c[0] * (1 - lichen) + 1.05 * lichen, c[1] * (1 - lichen) + 0.95 * lichen, c[2] * (1 - lichen) + 0.55 * lichen];
    return [c[0] * (1 - foot * 0.45), c[1] * (1 - foot * 0.5), c[2] * (1 - foot * 0.55)];
  };
  const faceGrid = (corner: (u: number, v: number) => V3, su: number, sv: number, top: boolean) => {
    const base = pos.length / 3;
    for (let j = 0; j <= sv; j++) {
      for (let i = 0; i <= su; i++) {
        const p = corner(i / su, j / sv);
        const edge = top ? Math.min(i, su - i, j, sv - j) / Math.max(1, Math.min(su, sv) / 2) : 0;
        const q = displaced(p, Math.min(1, edge));
        const c = colour(q);
        pos.push(q[0], q[1], q[2]);
        col.push(c[0], c[1], c[2]);
        uv.push((q[0] + q[2]) * 0.6, q[1] * 0.6);
      }
    }
    const row = su + 1;
    for (let j = 0; j < sv; j++) {
      for (let i = 0; i < su; i++) {
        const a = base + j * row + i;
        idx.push(a, a + 1, a + row + 1, a, a + row + 1, a + row);
      }
    }
  };
  const hw = w / 2;
  const hd = d / 2;
  // Sides run bottom (v=0) to the broken top (v=1), tapering; winding is counter-clockwise seen from outside.
  const side = (ax: number, az: number, bx: number, bz: number, su: number) =>
    faceGrid((u, v) => {
      const x = ax + (bx - ax) * u;
      const z = az + (bz - az) * u;
      const t = topAt(x * 0.82, z * 0.88);
      return [x * (1 - v * 0.18), below + (t - below) * v, z * (1 - v * 0.12)];
    }, su, nv, false);
  side(-hw, hd, hw, hd, nu); // +z
  side(hw, -hd, -hw, -hd, nu); // -z
  side(hw, hd, hw, -hd, nw); // +x
  side(-hw, -hd, -hw, hd, nw); // -x
  faceGrid((u, v) => {
    const x = (-hw + w * u) * 0.82;
    const z = (hd - d * v) * 0.88;
    return [x, topAt(x, z), z];
  }, nu, nw, true);
  // The underside runs from the -z edge to the +z edge so it faces down; its rim matches the sides' bottom edges.
  if (spec.bottom) faceGrid((u, v) => [-hw + w * u, below, -hd + d * v], nu, nw, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
