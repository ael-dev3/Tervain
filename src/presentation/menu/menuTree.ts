import * as THREE from 'three';
import { fbm, mulberry32, valueNoise } from '../../world/noise';

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

/**
 * The trunk as a loft of noisy rings. Seven buttress lobes swell toward the ground and are pulled down below it so each
 * becomes a root; the rings above are lumpy and slightly twisted.
 */
function trunk(m: Mesh3, rng: () => number) {
  const rings = 34;
  const seg = 40;
  const lobes: { a: number; amp: number; sharp: number }[] = [];
  for (let k = 0; k < 7; k++) lobes.push({ a: (k / 7) * Math.PI * 2 + (rng() - 0.5) * 0.5, amp: 0.55 + rng() * 0.75, sharp: 5 + rng() * 6 });
  const base = m.n;
  const center = (h: number): V3 => [0.35 * Math.sin(h * 2.1) + 0.6 * h * h, h * 6.6 - 0.9, -0.25 * h - 0.2 * Math.sin(h * 3.3)];
  for (let r = 0; r <= rings; r++) {
    const h = r / rings;
    const c = center(h);
    const R = 1.25 * (1 + 0.8 * Math.pow(1 - h, 5)) * (1 - 0.22 * h);
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
      const p: V3 = [c[0] + Math.cos(th) * rr, c[1] + dip, c[2] + Math.sin(th) * rr];
      const up = h < 0.25 ? b * flare : 0;
      m.v(p, (th / (Math.PI * 2)) * 6, h * 7.5, barkTint(p, up, 5));
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < seg; s++) {
      const a = base + r * (seg + 1) + s;
      const b = a + seg + 1;
      m.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return center(1);
}

/** A tapered, lumpy tube along a polyline, with rings aligned by parallel transport so it never corkscrews. */
function tube(m: Mesh3, pts: V3[], r0: number, r1: number, seed: number, capEnd: boolean) {
  const n = pts.length;
  const seg = r0 > 0.4 ? 14 : r0 > 0.15 ? 9 : 6;
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
  /** Low boughs where pilgrims could reach to tie a ribbon. */
  lowBoughs: { p: V3; dir: V3 }[];
  height: number;
  stats: { woodTris: number; leafCards: number };
}

export function buildAncientTree(seed = 1207, opts: { leafCards?: number } = {}): AncientTree {
  const rng = mulberry32(seed);
  const wood = new Mesh3();
  const top = trunk(wood, rng);
  const perches: V3[] = [];
  const lowBoughs: { p: V3; dir: V3 }[] = [];
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
    tube(wood, pts, r0, mn.dead ? 0.36 : 0.16, 11, mn.dead);
    if (mn.dead) {
      perches.push(pts[pts.length - 1]!, pts[pts.length - 3]!);
      // A couple of dead stubs off the broken limb.
      for (let j = 0; j < 2; j++) {
        const at = pts[2 + j * 2]!;
        const sd = normv(addv(dir, [rng() - 0.5, rng() * 0.6, rng() - 0.5]));
        const sp = growPath(at, sd, 1.6 + rng() * 1.4, 3, 0.5, 0.03);
        tube(wood, sp, 0.14, 0.05, 40 + j, true);
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
      tube(wood, bp, br, 0.045, 20 + j, false);
      sites.push({ p: bp[bp.length - 1]!, dir: normv(sub(bp[bp.length - 1]!, bp[bp.length - 2]!)) });
      for (let q = 0; q < 3; q++) {
        const a2 = bp[1 + Math.floor(rng() * (bp.length - 2))]!;
        const td = normv(addv(addv(bd, [rng() - 0.5, rng() * 0.5, rng() - 0.5]), mulv(normv(sub(a2, crownC)), 0.45)));
        const tp = growPath(a2, td, bl * (0.3 + rng() * 0.2), 3, 0.7, 0.04);
        tube(wood, tp, 0.05, 0.018, 60 + q, false);
        sites.push({ p: tp[tp.length - 1]!, dir: td });
        sites.push({ p: tp[1]!, dir: td });
      }
    }
  }
  // Two old low boughs reaching out toward the camp: this is where the pilgrims' rags hang.
  for (const [az, h] of [[0.75, 0.34], [2.6, 0.42]] as const) {
    const from: V3 = [0.35 * Math.sin(h * 2.1) + 0.6 * h * h, h * 6.6 - 0.9, -0.25 * h - 0.2 * Math.sin(h * 3.3)];
    const dir: V3 = [Math.cos(az), 0.2, Math.sin(az)];
    const pts = growPath(from, dir, 8, 10, 0.42, 0.11);
    tube(wood, pts, 0.42, 0.05, 80, false);
    // Kept bare: this is where the rags and lanterns hang, and the sunset shows through.
    for (let i = 2; i < pts.length; i++) lowBoughs.push({ p: pts[i]!, dir: normv(sub(pts[i]!, pts[i - 1]!)) });
    for (let q = 0; q < 6; q++) {
      const a2 = pts[2 + q]!;
      const up = q % 2 === 0 ? 0.55 : -0.15;
      const tp = growPath(a2, normv([dir[0] + (rng() - 0.5) * 1.4, up, dir[2] + (rng() - 0.5) * 1.4]), 1.2 + rng() * 1.6, 4, 0.8, 0.06);
      tube(wood, tp, 0.07 - q * 0.006, 0.015, 90 + q, false);
    }
  }
  // Surface roots crawling out from the buttresses, half buried.
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rng() * 0.6;
    const from: V3 = [Math.cos(a) * 2.1, 0.12, Math.sin(a) * 2.1];
    const pts: V3[] = [from];
    let p = from;
    let d: V3 = [Math.cos(a), -0.02, Math.sin(a)];
    for (let i = 0; i < 6; i++) {
      d = normv([d[0] + (rng() - 0.5) * 0.7, -0.03, d[2] + (rng() - 0.5) * 0.7]);
      p = addv(p, mulv(d, 0.7 + rng() * 0.5));
      p[1] = 0.06 - i * 0.035;
      pts.push(p);
    }
    tube(wood, pts, 0.3 + rng() * 0.14, 0.05, 100 + k, false);
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
  const woodGeo = wood.geometry();
  const leafGeo = leaves.geometry();
  // Cards light like a crown, not like flat planes: normals point out of the crown's centre (and a little up).
  const lp = leafGeo.getAttribute('position') as THREE.BufferAttribute;
  const ln = leafGeo.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < lp.count; i++) {
    const d = normv(addv(mulv(normv([lp.getX(i) - crownC[0], lp.getY(i) - crownC[1], lp.getZ(i) - crownC[2]]), 0.75), [0, 0.35, 0]));
    ln.setXYZ(i, d[0], d[1], d[2]);
  }
  return {
    wood: woodGeo,
    leaves: leafGeo,
    perches,
    lowBoughs,
    height: top[1] + 11,
    stats: { woodTris: (woodGeo.index?.count ?? 0) / 3, leafCards: cards },
  };
}
