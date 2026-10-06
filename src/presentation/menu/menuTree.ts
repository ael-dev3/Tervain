import * as THREE from 'three';
import { fbm, mulberry32, valueNoise } from '../../world/noise';
import { assertNaturalModelBudget } from '../naturalModelBudget';

/**
 * The ancient tree of the menu vigil. A Templar hermitage has been made in its roots (see menuCamp); the tree is older than
 * the order's claim on it. It is built for this one view: a trunk nearly four metres across at the root, flared into
 * buttresses that dive into the ground as roots, a short massive bole that forks at about eight metres, and a wide crown.
 * One great limb is dead and broken off. Everything is original procedural geometry; bark and leaf textures are the
 * playable trees' generated ones.
 *
 * Output is plain geometry in tree-local metres (roots at y = 0): `wood` (trunk, limbs, roots) and `leaves` (alpha-cut cards).
 */

type V3 = [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mulv = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const lenv = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const normv = (a: V3): V3 => {
  const l = lenv(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

class Mesh3 {
  pos: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  get n() {
    return this.pos.length / 3;
  }
  v(p: V3, u: number, w: number, c: V3) {
    this.pos.push(p[0], p[1], p[2]);
    this.uv.push(u, w);
    this.col.push(c[0], c[1], c[2]);
    return this.n - 1;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

/** Bark tint (multiplies a dark texture): wet and near-black at the foot, grey-brown up the bole, moss on the tops of roots. */
function barkTint(p: V3, up: number, seed: number): V3 {
  const n = valueNoise(p[0] * 1.3 + p[2] * 0.7, p[1] * 1.9, seed);
  const k = 1.9 + 0.5 * n;
  let c: V3 = [0.78 * k, 0.72 * k, 0.64 * k];
  const foot = Math.max(0, 1 - p[1] / 1.4);
  c = mulv(c, 1 - foot * 0.45);
  // Moss where water runs off: on upward-facing bark low down, and on the north (+z away from the sun here) side.
  const moss = Math.max(0, up) * Math.max(0, 1 - p[1] / 5) * (0.5 + 0.5 * valueNoise(p[0] * 2.1, p[2] * 2.1, seed + 3));
  c = [c[0] * (1 - moss * 0.55) + 0.42 * moss, c[1] * (1 - moss * 0.35) + 0.55 * moss, c[2] * (1 - moss * 0.6) + 0.2 * moss];
  return c;
}

/** Signed difference between two angles, in (-pi, pi]. */
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** The trunk's axis: it leans and wanders a little as it rises. `h` runs 0..1 from below the ground to the fork. */
const trunkCenter = (h: number): V3 => [0.35 * Math.sin(h * 2.1) + 0.6 * h * h, h * 6.6 - 0.9, -0.25 * h - 0.2 * Math.sin(h * 3.3)];

/** Where the hermit's door is cut into the trunk (see menuCamp). */
export interface TreeDoorSpec {
  /** The ring angle the door faces, tree-local: a trunk point at angle a lies toward (cos a, 0, sin a). */
  az: number;
  /** Half the width of the face cut flat for the door and its posts, metres. */
  halfWidth: number;
  /** Height of the flat face above the ground at its foot (the lintel's top), metres. */
  height: number;
  /** An actual aperture in the flattened bark, with the frame hiding its precisely clipped edges. */
  opening?: { width: number; height: number };
}

/**
 * The flat face cut for the door, tree-local: a vertical plane facing `normal` through `origin`, which is centred across
 * the face and lies on the ground at its foot.
 */
export interface TreeDoorFace {
  origin: V3;
  normal: V3;
}

/**
 * The hollow behind the door, in the door frame (x across the face, y up from its foot, z out of it): a short tunnel the
 * size of the aperture, then a chamber carved into the heart of the bole. Everything of the tree inside these two boxes
 * is cut away; the hollow's own walls (menuHollow) lie inside them.
 */
export const TREE_HOLLOW = {
  /** The tunnel through the face: the aperture, from just in front of the face back to `tunnelDepth`. */
  tunnelDepth: 0.35,
  /** The chamber box behind the tunnel. */
  halfWidth: 0.82,
  height: 2.32,
  depth: 1.75,
} as const;

/**
 * The trunk as the wisps meet it: ring centres up the bole and, for each ring, the bark's distance from that centre at
 * evenly spaced angles (after the door's face has been adzed flat). Tree-local metres; angle 0 is +x, increasing toward +z.
 */
export interface TreeTrunkShape {
  rings: number;
  segments: number;
  /** (rings + 1) × [x, y, z] ring centres. */
  centres: Float64Array;
  /** (rings + 1) × segments radii (the closing seam duplicate is dropped). */
  radii: Float32Array;
}

/** Tapered capsules along the limbs, boughs and roots, tree-local: [ax, ay, az, bx, by, bz, ra, rb] per segment. */
export type TreeCapsules = Float32Array;

/**
 * The trunk as a loft of noisy rings. Seven buttress lobes swell toward the ground and are pulled down below it so each
 * becomes a root; the rings above are lumpy and slightly twisted. With a door, a flat face is adzed into the front of the
 * bole for it, the buttresses step aside to stand either side of it, and the bark rounds over into the cut at its edges.
 */
function trunk(m: Mesh3, rng: () => number, door: TreeDoorSpec | undefined, ground: (x: number, z: number) => number) {
  const rings = 44;
  const seg = 56;
  const lobes: { a: number; amp: number; sharp: number }[] = [];
  for (let k = 0; k < 7; k++) lobes.push({ a: (k / 7) * Math.PI * 2 + (rng() - 0.5) * 0.5, amp: 0.55 + rng() * 0.75, sharp: 5 + rng() * 6 });
  if (door) {
    // The door stands between two roots: the nearest buttress on each side moves to flank it, and none swells in front.
    const nearest = (sign: number) =>
      lobes.reduce<(typeof lobes)[number] | undefined>((best, l) => {
        const d = angDiff(l.a, door.az) * sign;
        return d >= 0 && (!best || d < angDiff(best.a, door.az) * sign) ? l : best;
      }, undefined);
    const right = nearest(1);
    const left = nearest(-1);
    if (right) Object.assign(right, { a: door.az + 0.78, amp: Math.max(right.amp, 0.9) });
    if (left && left !== right) Object.assign(left, { a: door.az - 0.78, amp: Math.max(left.amp, 0.9) });
    for (const l of lobes) if (Math.abs(angDiff(l.a, door.az)) < 0.7) l.a = door.az + Math.sign(angDiff(l.a, door.az) || 1) * 0.78;
  }
  const base = m.n;
  const pts: V3[] = [];
  const ups: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const h = r / rings;
    const c = trunkCenter(h);
    // A massive, short bole: nearly four metres across at the foot, still over three at head height.
    const R = 1.5 * (1 + 0.6 * Math.pow(1 - h, 3.5)) * (1 - 0.33 * h);
    const twist = h * 0.6;
    for (let s = 0; s <= seg; s++) {
      const th = (s / seg) * Math.PI * 2;
      let b = 0;
      for (const l of lobes) b += Math.pow(Math.max(0, Math.cos(th - l.a)), l.sharp) * l.amp;
      const flare = Math.pow(Math.max(0, 1 - h * 1.6), 3);
      const gn = fbm(Math.cos(th + twist) * 1.3 + h * 4, Math.sin(th + twist) * 1.3 + h * 3, 3, 71);
      const rr = R * (1 + b * flare * 1.25 + gn * 0.16 + Math.sin(th * 3 + h * 9) * 0.03);
      // Roots dive: the bottom ring is pulled under the ground more where a lobe is strong.
      const dip = h < 0.08 ? -b * (0.08 - h) * 9 : 0;
      pts.push([c[0] + Math.cos(th) * rr, c[1] + dip, c[2] + Math.sin(th) * rr]);
      ups.push(h < 0.25 ? b * flare : 0);
    }
  }
  let face: TreeDoorFace | undefined;
  if (door) {
    const n: V3 = [Math.cos(door.az), 0, Math.sin(door.az)];
    const t: V3 = [n[2], 0, -n[0]];
    const foot = trunkCenter(0.14);
    const top0 = ground(foot[0] + n[0] * 1.6, foot[2] + n[2] * 1.6) + door.height;
    const c0 = trunkCenter((top0 * 0.5 + 0.9) / 6.6);
    // The face lies as deep as the bark just outside the posts, so the frame meets bark on both sides and nothing floats.
    let depth = Infinity;
    for (const p of pts) {
      if (p[1] < top0 * 0.3 || p[1] > top0) continue;
      const x = (p[0] - c0[0]) * t[0] + (p[2] - c0[2]) * t[2];
      const z = (p[0] - c0[0]) * n[0] + (p[2] - c0[2]) * n[2];
      if (z > 0 && Math.abs(Math.abs(x) - door.halfWidth) < 0.12) depth = Math.min(depth, z);
    }
    if (!Number.isFinite(depth)) depth = 1.2;
    const ox = c0[0] + n[0] * depth;
    const oz = c0[2] + n[2] * depth;
    // The foot of the face is the lower of the ground at the face and just in front of it, where the step goes.
    const o: V3 = [ox, Math.min(ground(ox, oz), ground(ox + n[0] * 0.3, oz + n[2] * 0.3)) - 0.02, oz];
    const top = o[1] + door.height;
    for (const p of pts) {
      const x = (p[0] - o[0]) * t[0] + (p[2] - o[2]) * t[2];
      const z = (p[0] - o[0]) * n[0] + (p[2] - o[2]) * n[2];
      if (z <= 0) continue;
      const w = (1 - smooth(door.halfWidth, door.halfWidth + 0.3, Math.abs(x))) * (1 - smooth(top, top + 0.3, p[1]));
      p[0] -= n[0] * z * w;
      p[2] -= n[2] * z * w;
    }
    face = { origin: o, normal: n };
  }
  for (let r = 0; r <= rings; r++) {
    const h = r / rings;
    for (let s = 0; s <= seg; s++) {
      const k = r * (seg + 1) + s;
      const p = pts[k]!;
      m.v(p, (s / seg) * 6, h * 7.5, barkTint(p, ups[k]!, 5));
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < seg; s++) {
      const a = base + r * (seg + 1) + s;
      const b = a + seg + 1;
      m.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  // The bark's reach from each ring's centre, for anything that must fly round the bole without passing through it.
  const shape: TreeTrunkShape = { rings, segments: seg, centres: new Float64Array((rings + 1) * 3), radii: new Float32Array((rings + 1) * seg) };
  for (let r = 0; r <= rings; r++) {
    const c = trunkCenter(r / rings);
    shape.centres.set(c, r * 3);
    for (let s = 0; s < seg; s++) {
      const p = pts[r * (seg + 1) + s]!;
      shape.radii[r * seg + s] = Math.hypot(p[0] - c[0], p[2] - c[2]);
    }
  }
  return { top: trunkCenter(1), lobes, face, shape };
}

/**
 * Carve the completed wood mesh with a box in the door frame, so no bark, bough or root remains inside the doorway or the
 * hollow behind it: triangles are split into the strips outside the box and the part inside is dropped.
 */
function carveDoorBox(m: Mesh3, face: TreeDoorFace, box: { hw: number; y0: number; y1: number; z0: number; z1: number }) {
  const triangles = m.idx;
  m.idx = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const tri = triangles.slice(i, i + 3);
    const n = face.normal;
    const tangent: V3 = [n[2], 0, -n[0]];
    const vertices = tri.map((i) => {
      const p: V3 = [m.pos[i! * 3]!, m.pos[i! * 3 + 1]!, m.pos[i! * 3 + 2]!];
      const d = sub(p, face.origin);
      return { p, x: d[0] * tangent[0] + d[2] * tangent[2], y: d[1], z: d[0] * n[0] + d[2] * n[2],
        u: m.uv[i! * 2]!, v: m.uv[i! * 2 + 1]!, c: [m.col[i! * 3]!, m.col[i! * 3 + 1]!, m.col[i! * 3 + 2]!] as V3 };
    });
    const hw = box.hw;
    if (vertices.every((v) => v.z <= box.z0) || vertices.every((v) => v.z >= box.z1) || vertices.every((v) => v.x <= -hw)
      || vertices.every((v) => v.x >= hw) || vertices.every((v) => v.y <= box.y0) || vertices.every((v) => v.y >= box.y1)) {
      m.idx.push(...tri);
      continue;
    }
    type Vertex = (typeof vertices)[number];
    const clip = (poly: Vertex[], axis: 'x' | 'y' | 'z', edge: number, sign: number): Vertex[] => {
      const out: Vertex[] = [];
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i]!;
        const q = poly[(i + 1) % poly.length]!;
        const dp = (p[axis] - edge) * sign;
        const dq = (q[axis] - edge) * sign;
        if (dp >= 0) out.push(p);
        if ((dp >= 0) !== (dq >= 0)) {
          const t = dp / (dp - dq);
          const mix = (a: number, b: number) => a + (b - a) * t;
          out.push({ p: p.p.map((v, k) => mix(v, q.p[k]!)) as V3, c: p.c.map((v, k) => mix(v, q.c[k]!)) as V3,
            x: mix(p.x, q.x), y: mix(p.y, q.y), z: mix(p.z, q.z), u: mix(p.u, q.u), v: mix(p.v, q.v) });
        }
      }
      return out;
    };
    // Subtract the box by partitioning the triangle into disjoint strips outside each of its six faces in turn.
    const middle = clip(clip(vertices, 'x', -hw, 1), 'x', hw, -1);
    const inside = clip(clip(middle, 'y', box.y0, 1), 'y', box.y1, -1);
    const strips = [clip(vertices, 'x', -hw, -1), clip(vertices, 'x', hw, 1), clip(middle, 'y', box.y0, -1), clip(middle, 'y', box.y1, 1),
      clip(inside, 'z', box.z0, -1), clip(inside, 'z', box.z1, 1)];
    for (const poly of strips) {
      if (poly.length < 3) continue;
      const ids = poly.map((v) => m.v(v.p, v.u, v.v, v.c));
      for (let k = 1; k < ids.length - 1; k++) m.idx.push(ids[0]!, ids[k]!, ids[k + 1]!);
    }
  }
}

/**
 * A tapered, lumpy tube along a polyline, with rings aligned by parallel transport so it never corkscrews. Segments thick
 * enough to matter to anything flying past are recorded in `caps` as tapered capsules.
 */
function tube(m: Mesh3, pts: V3[], r0: number, r1: number, seed: number, capEnd: boolean, caps?: number[], detail = 1) {
  const n = pts.length;
  if (caps) {
    for (let i = 0; i < n - 1; i++) {
      const ra = r0 + ((r1 - r0) * i) / (n - 1);
      const rb = r0 + ((r1 - r0) * (i + 1)) / (n - 1);
      if (Math.max(ra, rb) < 0.06) break;
      caps.push(...pts[i]!, ...pts[i + 1]!, ra * 1.08, rb * 1.08);
    }
  }
  // The supplied-crown menu keeps every branch/root curve and collision capsule. Only
  // its radial tessellation is reduced to leave room for actual source-painted foliage.
  const seg = Math.max(4, Math.round((r0 > 0.4 ? 14 : r0 > 0.15 ? 9 : 6) * detail));
  const base = m.n;
  let ref: V3 = Math.abs(normv(sub(pts[1]!, pts[0]!))[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let along = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const t = normv(sub(pts[Math.min(n - 1, i + 1)]!, pts[Math.max(0, i - 1)]!));
    const side = normv(cross(t, ref));
    const up = normv(cross(side, t));
    ref = up;
    if (i > 0) along += lenv(sub(p, pts[i - 1]!));
    const f = i / (n - 1);
    const r = r0 + (r1 - r0) * f;
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      const lump = 1 + 0.13 * valueNoise(a * 1.7 + seed, along * 1.4, seed) - 0.06;
      const d = addv(mulv(side, Math.cos(a) * r * lump), mulv(up, Math.sin(a) * r * lump));
      const q = addv(p, d);
      m.v(q, (s / seg) * Math.max(1, r * 6), along / 1.3, barkTint(q, Math.max(0, d[1] / r) * 0.5, seed));
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < seg; s++) {
      const a = base + i * (seg + 1) + s;
      const b = a + seg + 1;
      m.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  if (capEnd) {
    // A broken end: jagged splinters rather than a clean cut.
    const last = base + (n - 1) * (seg + 1);
    const c = pts[n - 1]!;
    const t = normv(sub(c, pts[n - 2]!));
    const tip = m.v(addv(c, mulv(t, r1 * 1.4)), 0.5, along / 1.3 + 0.3, [1.1, 1.0, 0.85]);
    for (let s = 0; s < seg; s++) {
      if (s % 2 === 0) m.idx.push(last + s, last + s + 1, tip);
      else {
        const mid = m.v(addv(c, mulv(t, r1 * 0.3)), 0.5, along / 1.3, [1.25, 1.1, 0.9]);
        m.idx.push(last + s, last + s + 1, mid);
      }
    }
  }
}

export interface AncientTree {
  wood: THREE.BufferGeometry;
  leaves: THREE.BufferGeometry;
  /** Twig ends that carry foliage, and the dead limb's ends, for the crows and ribbons. */
  perches: V3[];
  /** Points along the low boughs where pilgrims could reach to tie a ribbon: the centreline, its direction, the bough's radius there. */
  lowBoughs: { p: V3; dir: V3; r: number }[];
  /** The surface roots' centrelines and radii, so nothing else is set down on them. */
  roots: { pts: V3[]; r0: number; r1: number }[];
  /** The flat face cut for the door, when one was asked for. */
  door?: TreeDoorFace;
  /** The crown's reach: horizontal radius from the trunk's axis at the fork, and the heights of its lowest and highest leaves. */
  crown: { x: number; z: number; radius: number; bottom: number; top: number };
  height: number;
  /** The bole's measured shape, for anything that flies round it. */
  trunk: TreeTrunkShape;
  /** Limbs, boughs and surface roots as tapered capsules. */
  capsules: TreeCapsules;
  /** Where clusters of leafy twigs hang (tree-local): the crown's perches for anything small and bright. */
  leafSites: V3[];
  stats: { woodTris: number; leafCards: number };
}

export interface AncientTreeOptions {
  leafCards?: number;
  /** Radial detail for branches and roots only; the carved bole and all contact curves stay unchanged. */
  woodDetail?: number;
  door?: TreeDoorSpec;
  /** Ground height under a tree-local point, tree-local metres; surface roots follow it half-buried. Flat at y = 0 if absent. */
  ground?: (x: number, z: number) => number;
}

export function buildAncientTree(seed = 1207, opts: AncientTreeOptions = {}): AncientTree {
  const rng = mulberry32(seed);
  const woodDetail = Number.isFinite(opts.woodDetail) ? THREE.MathUtils.clamp(opts.woodDetail!, 0.5, 1) : 1;
  const wood = new Mesh3();
  const ground = opts.ground ?? (() => 0);
  const { top, lobes, face, shape } = trunk(wood, rng, opts.door, ground);
  const caps: number[] = [];
  const perches: V3[] = [];
  const lowBoughs: { p: V3; dir: V3; r: number }[] = [];
  const roots: { pts: V3[]; r0: number; r1: number }[] = [];
  const crownC: V3 = [top[0], top[1] + 4.5, top[2]];
  /** Leaf sites: where a cluster of leafy twigs hangs, and the direction the twig grew. */
  const sites: { p: V3; dir: V3 }[] = [];

  /** A branch that curls a little at every step and sags under gravity, bending back up at the tip like old oak. */
  const growPath = (from: V3, dir: V3, length: number, steps: number, curl: number, gravity: number): V3[] => {
    const pts: V3[] = [from];
    let d = normv(dir);
    let p = from;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      d = normv([d[0] + (rng() - 0.5) * curl, d[1] + (rng() - 0.5) * curl * 0.6 - gravity * (1 - t) + 0.05 * t, d[2] + (rng() - 0.5) * curl]);
      p = addv(p, mulv(d, length / steps));
      pts.push(p);
    }
    return pts;
  };

  // Main limbs from the fork. One is dead and snapped off; the others spread wide, low and heavy.
  const mains: { az: number; el: number; len: number; dead: boolean }[] = [
    { az: 0.35, el: 0.32, len: 11.5, dead: false },
    { az: 1.35, el: 0.26, len: 12.5, dead: false },
    { az: 2.45, el: 0.5, len: 10, dead: false },
    { az: 3.4, el: 0.22, len: 12.5, dead: false },
    { az: 4.5, el: 0.62, len: 9, dead: false },
    { az: 5.55, el: 0.36, len: 7.5, dead: true },
  ];
  for (const mn of mains) {
    const dir: V3 = [Math.cos(mn.az) * Math.cos(mn.el), Math.sin(mn.el), Math.sin(mn.az) * Math.cos(mn.el)];
    const pts = growPath(addv(top, mulv(dir, -0.5)), dir, mn.len * (mn.dead ? 0.6 : 1), 8, 0.35, mn.dead ? 0.02 : 0.07);
    const r0 = mn.dead ? 0.6 : 0.72;
    tube(wood, pts, r0, mn.dead ? 0.36 : 0.16, 11, mn.dead, caps, woodDetail);
    if (mn.dead) {
      perches.push(pts[pts.length - 1]!, pts[pts.length - 3]!);
      // A couple of dead stubs off the broken limb.
      for (let j = 0; j < 2; j++) {
        const at = pts[2 + j * 2]!;
        const sd = normv(addv(dir, [rng() - 0.5, rng() * 0.6, rng() - 0.5]));
        const sp = growPath(at, sd, 1.6 + rng() * 1.4, 3, 0.5, 0.03);
        tube(wood, sp, 0.14, 0.05, 40 + j, true, caps, woodDetail);
        perches.push(sp[sp.length - 1]!);
      }
      continue;
    }
    sites.push({ p: pts[pts.length - 1]!, dir: normv(sub(pts[pts.length - 1]!, pts[pts.length - 2]!)) });
    // Boughs off each limb, twigs off each bough.
    const nb = 5;
    for (let j = 0; j < nb; j++) {
      const ti = 2 + Math.floor(rng() * (pts.length - 3));
      const at = pts[ti]!;
      const tang = normv(sub(pts[ti + 1]!, pts[ti]!));
      const out = normv(sub(at, crownC));
      const bd = normv(addv(addv(mulv(tang, 0.55), [rng() - 0.5, rng() * 0.5 + 0.15, rng() - 0.5]), mulv(out, 0.55)));
      const bl = mn.len * (0.38 + rng() * 0.28);
      const bp = growPath(at, bd, bl, 5, 0.55, 0.05);
      const f = ti / (pts.length - 1);
      const br = (0.72 + (0.16 - 0.72) * f) * 0.55;
      tube(wood, bp, br, 0.045, 20 + j, false, caps, woodDetail);
      sites.push({ p: bp[bp.length - 1]!, dir: normv(sub(bp[bp.length - 1]!, bp[bp.length - 2]!)) });
      for (let q = 0; q < 3; q++) {
        const a2 = bp[1 + Math.floor(rng() * (bp.length - 2))]!;
        const td = normv(addv(addv(bd, [rng() - 0.5, rng() * 0.5, rng() - 0.5]), mulv(normv(sub(a2, crownC)), 0.45)));
        const tp = growPath(a2, td, bl * (0.3 + rng() * 0.2), 3, 0.7, 0.04);
        tube(wood, tp, 0.05, 0.018, 60 + q, false, undefined, woodDetail);
        sites.push({ p: tp[tp.length - 1]!, dir: td });
        sites.push({ p: tp[1]!, dir: td });
      }
    }
  }
  // Two old low boughs reaching out either side of the door: this is where the pilgrims' rags hang. Neither grows out
  // beside the door, and neither sags into the ground: a bough that low would long since have been cut back.
  for (const [az0, h, len] of [[0.25, 0.42, 6.8], [2.6, 0.46, 8]] as const) {
    let az: number = az0;
    if (opts.door && Math.abs(angDiff(az, opts.door.az)) < 1.0) az = opts.door.az + Math.sign(angDiff(az, opts.door.az) || 1) * 1.0;
    const from = trunkCenter(h);
    const dir: V3 = [Math.cos(az), 0.2, Math.sin(az)];
    const pts = growPath(from, dir, len, 10, 0.42, 0.08);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]!;
      p[1] = Math.max(p[1], ground(p[0], p[2]) + 1.9);
    }
    const r0 = 0.38;
    const r1 = 0.045;
    tube(wood, pts, r0, r1, 80, false, caps, woodDetail);
    // Kept bare: this is where the rags and lanterns hang, and the sunset shows through.
    for (let i = 2; i < pts.length; i++) lowBoughs.push({ p: pts[i]!, dir: normv(sub(pts[i]!, pts[i - 1]!)), r: r0 + ((r1 - r0) * i) / (pts.length - 1) });
    // A few side twigs, spreading and climbing rather than hanging, stopped short of anyone's head; the end of the bough
    // breaks into a small fork instead of stopping blunt.
    const tip = pts[pts.length - 1]!;
    const tipDir = normv(sub(tip, pts[pts.length - 2]!));
    const twigs: { from: V3; dir: V3; len: number; r: number }[] = [];
    for (let q = 0; q < 6; q++) {
      const up = q % 2 === 0 ? 0.55 : 0.12;
      twigs.push({ from: pts[2 + q]!, dir: normv([dir[0] + (rng() - 0.5) * 1.4, up, dir[2] + (rng() - 0.5) * 1.4]), len: 1.0 + rng() * 1.3, r: 0.07 - q * 0.006 });
    }
    for (let q = 0; q < 3; q++) {
      twigs.push({ from: tip, dir: normv([tipDir[0] + (rng() - 0.5) * 0.9, tipDir[1] + 0.1 + rng() * 0.35, tipDir[2] + (rng() - 0.5) * 0.9]), len: 0.6 + rng() * 0.8, r: r1 });
    }
    twigs.forEach((t, q) => {
      const tp = growPath(t.from, t.dir, t.len, 4, 0.8, 0.04);
      const cut = tp.findIndex((p) => p[1] < ground(p[0], p[2]) + 1.7);
      const twig = cut < 0 ? tp : tp.slice(0, cut);
      if (twig.length >= 2) tube(wood, twig, t.r, 0.012, 90 + q, false, undefined, woodDetail);
    });
  }
  // Surface roots: each buttress runs on into a root that crawls over the ground half buried and dives at its tip. None
  // crosses the ground in front of the door.
  /** Moves a root's point sideways until the root, at radius r, is clear of the doorway and its step. */
  const clearOfDoor = (p: V3, r: number): V3 => {
    if (!face || !opts.door) return p;
    const n = face.normal;
    const dx = p[0] - face.origin[0];
    const dz = p[2] - face.origin[2];
    const x = dx * n[2] - dz * n[0];
    const z = dx * n[0] + dz * n[2];
    const need = opts.door.halfWidth + r + 0.12;
    if (z < -(r + 0.4) || Math.abs(x) >= need) return p;
    const push = (Math.sign(x) || 1) * (need - Math.abs(x));
    return [p[0] + n[2] * push, p[1], p[2] - n[0] * push];
  };
  for (let k = 0; k < lobes.length; k++) {
    const a = lobes[k]!.a + (rng() - 0.5) * 0.2;
    const c = trunkCenter(0.14);
    let p: V3 = [c[0] + Math.cos(a) * 1.5, 0, c[2] + Math.sin(a) * 1.5];
    const r0 = 0.3 + rng() * 0.14;
    const r1 = 0.05;
    const steps = 6;
    const pts: V3[] = [];
    let d: V3 = [Math.cos(a), 0, Math.sin(a)];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const r = r0 + (r1 - r0) * f;
      if (i > 0) {
        d = normv([d[0] + (rng() - 0.5) * 0.7, 0, d[2] + (rng() - 0.5) * 0.7]);
        p = addv(p, mulv(d, 0.7 + rng() * 0.5));
      }
      p = clearOfDoor(p, r);
      // Most of the root's back shows above the ground near the trunk; the tip is under it.
      p = [p[0], ground(p[0], p[2]) - r * (0.2 + 1.05 * f * f), p[2]];
      pts.push(p);
    }
    tube(wood, pts, r0, r1, 100 + k, false, caps, woodDetail);
    roots.push({ pts, r0, r1 });
  }

  // Leaf cards: each card is a twig of leaves. Clustered round the sites, facing out of the crown, darker inside it.
  const leaves = new Mesh3();
  const target = opts.leafCards ?? 1800;
  const crownR = 10;
  let cards = 0;
  for (let i = 0; i < target && sites.length; i++) {
    const s = sites[Math.floor(rng() * sites.length)]!;
    const size = 1.25 + rng() * 0.55;
    const p: V3 = addv(s.p, [(rng() - 0.5) * size * 1.1, (rng() - 0.35) * size * 0.8, (rng() - 0.5) * size * 1.1]);
    const outward = normv(sub(p, crownC));
    const depth = Math.min(1, lenv(sub(p, crownC)) / crownR);
    const shade = 0.42 + 0.6 * depth;
    const up = normv(addv(addv(s.dir, mulv(outward, 0.5)), [(rng() - 0.5) * 0.9, (rng() - 0.2) * 0.6, (rng() - 0.5) * 0.9]));
    const n = normv(addv(mulv(outward, 0.75), [0, 0.35, 0]));
    // Card frame: `up` along the card, `side` across it.
    const side = normv(cross(up, n));
    const w = size * (0.85 + rng() * 0.3);
    const h = size * (0.95 + rng() * 0.35);
    const olive: V3 = [0.5 + rng() * 0.1, 0.52 + rng() * 0.07, 0.34 + rng() * 0.05];
    const dying = rng() < 0.16;
    const tint: V3 = dying ? [0.78, 0.52, 0.26] : olive;
    const col: V3 = [tint[0] * shade, tint[1] * shade, tint[2] * shade];
    const b = leaves.n;
    for (const [du, dv] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]] as const) {
      const q = addv(p, addv(mulv(side, du * w), mulv(up, (dv - 0.15) * h)));
      leaves.v(q, du + 0.5, dv, col);
    }
    leaves.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    cards++;
  }
  if (face && opts.door?.opening) {
    // The doorway through the face, then the hollow chamber behind it (TREE_HOLLOW). Low boughs that start at the bole's
    // axis and roots that start inside its wall would otherwise cross the hollow.
    const { width, height } = opts.door.opening;
    carveDoorBox(wood, face, { hw: width / 2, y0: 0, y1: height, z0: -TREE_HOLLOW.tunnelDepth, z1: 10 });
    carveDoorBox(wood, face, { hw: TREE_HOLLOW.halfWidth, y0: -0.05, y1: TREE_HOLLOW.height, z0: -TREE_HOLLOW.depth, z1: -TREE_HOLLOW.tunnelDepth });
  }
  const woodGeo = wood.geometry();
  const leafGeo = leaves.geometry();
  assertNaturalModelBudget('Ancient menu tree', [woodGeo, ...(cards ? [leafGeo] : [])]);
  // Cards light like a crown, not like flat planes: normals point out of the crown's centre (and a little up).
  const lp = leafGeo.getAttribute('position') as THREE.BufferAttribute;
  const ln = leafGeo.getAttribute('normal') as THREE.BufferAttribute;
  const crown = { x: top[0], z: top[2], radius: 0, bottom: Infinity, top: -Infinity };
  for (let i = 0; i < lp.count; i++) {
    const d = normv(addv(mulv(normv([lp.getX(i) - crownC[0], lp.getY(i) - crownC[1], lp.getZ(i) - crownC[2]]), 0.75), [0, 0.35, 0]));
    ln.setXYZ(i, d[0], d[1], d[2]);
    crown.radius = Math.max(crown.radius, Math.hypot(lp.getX(i) - crown.x, lp.getZ(i) - crown.z));
    crown.bottom = Math.min(crown.bottom, lp.getY(i));
    crown.top = Math.max(crown.top, lp.getY(i));
  }
  return {
    wood: woodGeo,
    leaves: leafGeo,
    perches,
    lowBoughs,
    roots,
    door: face,
    crown,
    height: top[1] + 11,
    trunk: shape,
    capsules: new Float32Array(caps),
    leafSites: sites.map((s) => s.p),
    stats: { woodTris: (woodGeo.index?.count ?? 0) / 3, leafCards: cards },
  };
}
