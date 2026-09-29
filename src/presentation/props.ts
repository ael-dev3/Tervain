import { hash3 } from './buildKit';
import type { Region } from './regions';
import { TINT, barrel, crate, fieldstone, jitterTone, sack, type Rnd } from './structures';

/**
 * The things people leave lying about: boats hauled up the beach, a jetty of mismatched planks, net racks and drying
 * fish, lobster pots, coiled rope, fences that lean, a cart, a well. Every one is a little wrong on purpose.
 */

/** A clinker-built rowing boat: planked hull lofted through ribs, gunwales, thwarts, and oars. `overturned` puts it keel-up. */
export function boat(R: Region, rnd: Rnd, x: number, y: number, z: number, yaw: number, o: { len?: number; beam?: number; overturned?: boolean; tilt?: number; sunk?: number } = {}) {
  const len = o.len ?? 4.8;
  const beam = o.beam ?? 1.7;
  const depth = 0.62;
  const ctx = R.ctx;
  ctx.push(x, y - (o.sunk ?? 0.12), z, yaw, o.overturned ? Math.PI : 0, o.tilt ?? 0);
  const N = 14;
  const B = R.planks;
  // Section i: half-beam and keel height along the length. The bow rises, the stern is squarer.
  const sec = (t: number) => {
    const u = t * 2 - 1;
    const hb = (beam / 2) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.2)), 0.72) * (t > 0.5 ? 0.9 : 1);
    const sheer = 0.5 * Math.pow(Math.abs(u), 2.4) * (u > 0 ? 1.15 : 0.7);
    return { hb, sheer };
  };
  const inner = jitterTone(TINT.woodDark, rnd, 0.1);
  const strakes = 5;
  for (let i = 0; i < N; i++) {
    const t0 = i / N;
    const t1 = (i + 1) / N;
    const a = sec(t0);
    const b = sec(t1);
    const z0 = (t0 - 0.5) * len;
    const z1 = (t1 - 0.5) * len;
    for (const side of [-1, 1]) {
      for (let s = 0; s < strakes; s++) {
        const f0 = s / strakes;
        const f1 = (s + 1) / strakes;
        // Each strake is a strip up the hull: angle from keel (f=0) to gunwale (f=1).
        const p = (sec_: { hb: number; sheer: number }, f: number, zz: number): [number, number, number] => {
          const ang = f * (Math.PI / 2);
          const yy = depth * (1 - Math.cos(ang) * 0.92) + sec_.sheer * f * f - 0.02 * Math.sin(f * 3 + zz);
          return [side * sec_.hb * Math.sin(ang), yy, zz];
        };
        const q0 = p(a, f0, z0);
        const q1 = p(b, f0, z1);
        const q2 = p(b, f1, z1);
        const q3 = p(a, f1, z0);
        const lap = 0.018 * (s % 2 ? 1 : -1) * side;
        const c = jitterTone(s % 2 ? TINT.wood : TINT.woodDark, rnd, 0.14);
        B.quad([q0[0] + lap, q0[1], q0[2], q1[0] + lap, q1[1], q1[2], q2[0] + lap, q2[1], q2[2], q3[0] + lap, q3[1], q3[2]], c, { flip: side < 0, k: 1, uv: [z0, f0 * 2, z1, f0 * 2, z1, f1 * 2, z0, f1 * 2] });
        // Inner face, dark.
        B.quad([q3[0], q3[1], q3[2], q2[0], q2[1], q2[2], q1[0], q1[1], q1[2], q0[0], q0[1], q0[2]], inner, { flip: side < 0, k: 0.8, uv: [z0, f1 * 2, z1, f1 * 2, z1, f0 * 2, z0, f0 * 2] });
      }
    }
  }
  // Keel, stem, sternpost.
  R.timber.box(0.09, 0.12, len * 0.96, 0, depth * 0.06 - 0.06, 0, jitterTone(TINT.woodDark, rnd), { jit: 0.08, grain: 'z' });
  const bow = sec(1);
  R.timber.rod(0, depth * 0.08, len / 2 - 0.02, 0, depth + bow.sheer + 0.05, len / 2 + 0.02, 0.05, 5, inner, { jit: 0.08 });
  const stern = sec(0);
  R.timber.rod(0, depth * 0.08, -len / 2 + 0.02, 0, depth + stern.sheer + 0.02, -len / 2 - 0.05, 0.05, 5, inner, { jit: 0.08 });
  // Gunwale rails, thwarts and a floorboard.
  for (const side of [-1, 1]) {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const s = sec(t);
      pts.push([side * (s.hb + 0.015), depth + s.sheer + 0.02, (t - 0.5) * len]);
    }
    R.timber.tube(pts, 0.035, 4, jitterTone(TINT.woodDark, rnd, 0.1));
  }
  for (const t of [0.3, 0.52, 0.72]) {
    const s = sec(t);
    R.planks.box(s.hb * 2 - 0.05, 0.05, 0.28, 0, depth * 0.55 + s.sheer * 0.3, (t - 0.5) * len, jitterTone(TINT.wood, rnd, 0.16), { jit: 0.12, grain: 'x' });
  }
  R.planks.box(0.5, 0.03, len * 0.6, 0, depth * 0.13, -0.1, jitterTone(TINT.woodDark, rnd, 0.12), { jit: 0.1, grain: 'z' });
  ctx.pop();
}

export function oar(R: Region, rnd: Rnd, ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  R.planks.rod(ax, ay, az, bx, by, bz, 0.03, 5, jitterTone(TINT.woodPale, rnd, 0.1), { jit: 0.08 });
  const dx = bx - ax;
  const dz = bz - az;
  const l = Math.hypot(dx, dz) || 1;
  R.planks.box(0.16, 0.03, 0.6, bx + (dx / l) * 0.25, by + 0.05, bz + (dz / l) * 0.25, jitterTone(TINT.woodPale, rnd, 0.1), { ry: Math.atan2(dx, dz), jit: 0.08 });
}

/** The fishermen's jetty: individual planks laid across stringers, piles below, ropes and bollards. Deck matches layout DECKS. */
export function jetty(R: Region, rnd: Rnd, deck: { x: number; z: number; hx: number; hz: number; y: number }, seabedAt: (x: number, z: number) => number) {
  const B = R.planks;
  const { x, z, hx, hz, y } = deck;
  // Planks: each its own length, thickness and angle, some missing.
  let px = x - hx;
  while (px < x + hx - 0.1) {
    const pw = 0.2 + rnd() * 0.06;
    if (rnd() > 0.035) {
      const th = 0.06 + rnd() * 0.02;
      const ww = hz * 2 + (rnd() - 0.5) * 0.1;
      B.box(pw * 0.94, th, ww, px + pw / 2, y - th, z + (rnd() - 0.5) * 0.06, jitterTone(TINT.wood, rnd, 0.2), { ry: (rnd() - 0.5) * 0.04, rz: (rnd() - 0.5) * 0.02, jit: 0.16, grain: 'z' });
    }
    px += pw;
  }
  // Stringers and piles, every 2.4 m, leaning a little.
  for (let sx = x - hx + 0.4; sx <= x + hx - 0.3; sx += 2.4 + rnd() * 0.3) {
    for (const sz of [-1, 1]) {
      const wx = sx + (rnd() - 0.5) * 0.15;
      const wz = z + sz * (hz - 0.15);
      const bed = seabedAt(wx, wz);
      R.bark.rod(wx, bed - 0.4, wz, wx + (rnd() - 0.5) * 0.08, y + 0.05, wz + (rnd() - 0.5) * 0.06, 0.13 + rnd() * 0.03, 6, jitterTone(0xa89a86, rnd, 0.2), { jit: 0.12 });
    }
    R.timber.box(0.16, 0.16, hz * 2 + 0.3, sx, y - 0.32, z, jitterTone(TINT.woodDark, rnd, 0.12), { jit: 0.1, grain: 'z', ry: (rnd() - 0.5) * 0.02 });
  }
  R.timber.box((hx * 2), 0.14, 0.14, x, y - 0.3, z - hz + 0.18, jitterTone(TINT.woodDark, rnd, 0.12), { jit: 0.1, grain: 'x' });
  R.timber.box((hx * 2), 0.14, 0.14, x, y - 0.3, z + hz - 0.18, jitterTone(TINT.woodDark, rnd, 0.12), { jit: 0.1, grain: 'x' });
  // Bollards and a rope rail on the seaward half.
  for (const bx of [x - hx + 1.2, x - hx + 0.3]) R.bark.cyl(0.11, 0.14, 0.5, 7, bx, y, z + hz - 0.2, jitterTone(0xa89a86, rnd, 0.16), { jit: 0.1 });
  for (let sx = x - hx + 2.4; sx < x + hx - 3; sx += 2.6) {
    for (const sz of [-1, 1]) R.bark.rod(sx, y - 0.05, z + sz * (hz - 0.05), sx, y + 0.95, z + sz * (hz - 0.05), 0.045, 5, jitterTone(0xa89a86, rnd, 0.16), { jit: 0.1 });
  }
  for (const sz of [-1, 1]) {
    const pts: [number, number, number][] = [];
    for (let sx = x - hx + 2.4; sx < x + hx - 3; sx += 0.65) pts.push([sx, y + 0.86 - 0.12 * Math.abs(Math.sin((sx - x) * 1.2)), z + sz * (hz - 0.05)]);
    if (pts.length > 1) R.vc.tube(pts, 0.018, 4, TINT.rope);
  }
}

/** Two posts and a crossbar with a net hung over it, sagging into the wind. */
export function netRack(R: Region, rnd: Rnd, x: number, y: number, z: number, yaw: number, len = 3.2) {
  const ctx = R.ctx;
  ctx.push(x, y, z, yaw);
  for (const s of [-1, 1]) R.bark.rod(s * len / 2, -0.25, 0, s * len / 2 + (rnd() - 0.5) * 0.1, 2.05, 0, 0.07, 5, jitterTone(0xa89a86, rnd, 0.16), { jit: 0.1 });
  R.bark.rod(-len / 2 - 0.15, 1.95, 0, len / 2 + 0.15, 1.98, 0, 0.05, 5, jitterTone(0xa89a86, rnd, 0.16), { jit: 0.1 });
  // The net: a draped sheet of coarse mesh, a few panels with a sag and torn corners.
  const panels = 6;
  for (let i = 0; i < panels; i++) {
    const x0 = -len / 2 + (i / panels) * len;
    const x1 = -len / 2 + ((i + 1) / panels) * len;
    const sag0 = 0.6 + rnd() * 0.5;
    const sag1 = 0.6 + rnd() * 0.5;
    R.cloth.quad([x0, 1.95 - sag0, 0.05, x1, 1.95 - sag1, 0.05, x1, 1.95, 0.02, x0, 1.95, 0.02], jitterTone(0xb0a48a, rnd, 0.16), { uv: [0, 0, 1, 0, 1, 1, 0, 1], amp: 0.14 });
  }
  ctx.pop();
}

/** A drying rack for fish: a rail on two forked posts and rows of split fish. */
export function fishRack(R: Region, rnd: Rnd, x: number, y: number, z: number, yaw: number) {
  const ctx = R.ctx;
  ctx.push(x, y, z, yaw);
  for (const s of [-1, 1]) R.bark.rod(s * 1.4, -0.2, 0, s * 1.4, 1.5, 0, 0.06, 5, jitterTone(0xa89a86, rnd, 0.16), { jit: 0.1 });
  R.bark.rod(-1.5, 1.42, 0, 1.5, 1.44, 0, 0.045, 5, jitterTone(0xa89a86, rnd, 0.16), { jit: 0.1 });
  for (let i = 0; i < 9; i++) {
    const fx = -1.25 + i * 0.31 + (rnd() - 0.5) * 0.06;
    R.vc.blob(0.05, 0.3, 0.02, fx, 1.05, 0, jitterTone(0xa8a292, rnd, 0.2), { seg: 5, rings: 3, lump: 0.12, seed: i, jit: 0.1 });
  }
  ctx.pop();
}

/** A lobster pot: a wicker dome with a rope handle. */
export function pot(R: Region, rnd: Rnd, x: number, y: number, z: number) {
  R.thatch.lathe([0.42, 0, 0.44, 0.15, 0.38, 0.4, 0.24, 0.55, 0.12, 0.6], 9, x, y, z, jitterTone(0xb0a078, rnd, 0.18), { jit: 0.12, amp: 0.14 });
  R.vc.tube([[x - 0.1, y + 0.55, z], [x, y + 0.72, z], [x + 0.1, y + 0.55, z]], 0.015, 4, TINT.rope);
}

export function ropeCoil(R: Region, rnd: Rnd, x: number, y: number, z: number, r = 0.35) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 6;
    const rr = r * (1 - (i / 40) * 0.5);
    pts.push([x + Math.cos(a) * rr, y + 0.04 + (i / 40) * 0.1, z + Math.sin(a) * rr]);
  }
  R.vc.tube(pts, 0.03, 5, jitterTone(TINT.rope, rnd, 0.14));
}

/** A campfire ring: stones, charred logs and a glowing ember bed. */
export function campfire(R: Region, rnd: Rnd, x: number, y: number, z: number) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    fieldstone(R, rnd, x + Math.cos(a) * 0.62, y - 0.05, z + Math.sin(a) * 0.62, 0.2 + rnd() * 0.08, 0.15, 0.2 + rnd() * 0.08);
  }
  R.vc.cyl(0.5, 0.52, 0.05, 9, x, y, z, 0x1a1512, { jit: 0.1 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + rnd() * 0.4;
    R.bark.rod(x + Math.cos(a) * 0.45, y + 0.12, z + Math.sin(a) * 0.45, x - Math.cos(a) * 0.2, y + 0.3, z - Math.sin(a) * 0.2, 0.07, 5, 0x3a3028, { jit: 0.1 });
  }
  R.glow.cyl(0.26, 0.3, 0.06, 8, x, y + 0.06, z, 0xffffff, { jit: 0 });
}

/** A run of fence: leaning posts and two rough rails, some broken. Returns the fence's centre points for colliders. */
export function fence(R: Region, rnd: Rnd, pts: [number, number][], groundAt: (x: number, z: number) => number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i]!;
    const [bx, bz] = pts[i + 1]!;
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 2.2));
    const posts: [number, number, number][] = [];
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n + (rnd() - 0.5) * 0.15;
      const z = az + ((bz - az) * k) / n + (rnd() - 0.5) * 0.15;
      const y = groundAt(x, z);
      R.bark.rod(x, y - 0.3, z, x + (rnd() - 0.5) * 0.14, y + 1.0 + (rnd() - 0.5) * 0.14, z + (rnd() - 0.5) * 0.14, 0.055 + rnd() * 0.02, 5, jitterTone(0xa89a86, rnd, 0.2), { jit: 0.1 });
      posts.push([x, y, z]);
    }
    for (let k = 0; k < n; k++) {
      const p = posts[k]!;
      const q = posts[k + 1]!;
      for (const h of [0.42, 0.82]) {
        if (rnd() < 0.08) continue;
        const droop = (rnd() - 0.5) * 0.14;
        R.timber.rod(p[0], p[1] + h + (rnd() - 0.5) * 0.06, p[2], q[0], q[1] + h + droop, q[2], 0.035, 4, jitterTone(TINT.woodDark, rnd, 0.14), { jit: 0.1, caps: false });
      }
    }
  }
}

/** A well: rubble ring, two posts, a crossbeam with a crank, a thatched hood, a bucket. */
export function well(R: Region, rnd: Rnd, x: number, y: number, z: number) {
  const ctx = R.ctx;
  ctx.push(x, y, z, rnd() * 0.5);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    R.stone.box(0.62, 0.36 + rnd() * 0.12, 0.42, Math.cos(a) * 1.05, -0.05, Math.sin(a) * 1.05, jitterTone(TINT.stone, rnd, 0.18), { ry: -a + Math.PI / 2 + (rnd() - 0.5) * 0.1, jit: 0.14 });
    R.stone.box(0.55, 0.3, 0.4, Math.cos(a + 0.26) * 1.03, 0.28, Math.sin(a + 0.26) * 1.03, jitterTone(TINT.stone, rnd, 0.18), { ry: -a + Math.PI / 2, jit: 0.14 });
  }
  R.vc.cyl(0.85, 0.85, 0.05, 12, 0, 0.55, 0, 0x0c1418, { jit: 0 });
  for (const s of [-1, 1]) R.timber.box(0.16, 2.3, 0.16, s * 1.05, 0.2, 0, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'y', rz: (rnd() - 0.5) * 0.04, jit: 0.1 });
  R.timber.box(2.5, 0.16, 0.16, 0, 2.35, 0, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'x', jit: 0.1, rz: 0.02 });
  R.timber.rod(-0.5, 2.3, 0.1, 0.5, 2.3, 0.1, 0.06, 6, jitterTone(TINT.wood, rnd, 0.1), { jit: 0.08 });
  R.vc.tube([[0, 2.3, 0.1], [0.02, 1.5, 0.1], [0.05, 0.9, 0.1]], 0.012, 4, TINT.rope);
  R.planks.lathe([0.16, 0, 0.19, 0.24], 8, 0.05, 0.6, 0.1, jitterTone(TINT.wood, rnd, 0.1), { jit: 0.1 });
  // Hood.
  R.thatch.prism([[-1.5, 0], [1.5, 0], [0, 0.9]], -0.9, 0.9, jitterTone(TINT.thatch, rnd, 0.1), { jit: 0.1, amp: 0.14 });
  ctx.pop();
}

/** A handcart: two wheels, a plank bed and shafts. */
export function cart(R: Region, rnd: Rnd, x: number, y: number, z: number, yaw: number) {
  const ctx = R.ctx;
  ctx.push(x, y, z, yaw);
  R.planks.box(1.7, 0.1, 1.0, 0, 0.55, 0, jitterTone(TINT.wood, rnd, 0.14), { jit: 0.1, grain: 'x' });
  for (const s of [-1, 1]) {
    R.planks.box(1.7, 0.4, 0.06, 0, 0.6, s * 0.5, jitterTone(TINT.wood, rnd, 0.14), { jit: 0.1, grain: 'x', rz: (rnd() - 0.5) * 0.03 });
    ctx.push(0, 0.45, s * 0.62, 0, 0, Math.PI / 2);
    R.timber.lathe([0.44, -0.04, 0.47, 0, 0.44, 0.04], 12, 0, 0, 0, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      R.timber.box(0.06, 0.02, 0.86, 0, 0, 0, jitterTone(TINT.wood, rnd, 0.1), { ry: 0, rx: a, jit: 0.08 });
    }
    ctx.pop();
  }
  R.timber.rod(0.8, 0.5, -0.4, 2.2, 0.35, -0.3, 0.04, 5, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });
  R.timber.rod(0.8, 0.5, 0.4, 2.2, 0.35, 0.3, 0.04, 5, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });
  sack(R, rnd, -0.3, 0.6, 0.1, 1.1);
  crate(R, rnd, 0.3, 0.6, -0.1, 0.5, 0.4, 0.5, 0.3);
  ctx.pop();
}

/** A wagon of the caravan master: a big covered wagon, canvas patched, wheels spoked, a shaft laid down. */
export function wagon(R: Region, rnd: Rnd, x: number, y: number, z: number, yaw: number) {
  const ctx = R.ctx;
  ctx.push(x, y, z, yaw);
  const bed = 0.95;
  R.planks.box(4.6, 0.16, 2.2, 0, bed, 0, jitterTone(TINT.wood, rnd, 0.14), { jit: 0.1, grain: 'x' });
  for (const s of [-1, 1]) {
    R.planks.box(4.6, 0.6, 0.08, 0, bed + 0.1, s * 1.08, jitterTone(TINT.wood, rnd, 0.14), { jit: 0.1, grain: 'x', rz: (rnd() - 0.5) * 0.02 });
    for (const wx of [-1.5, 1.5]) {
      ctx.push(wx, 0.62, s * 1.22, 0, 0, Math.PI / 2);
      R.timber.lathe([0.66, -0.06, 0.7, 0, 0.66, 0.06], 16, 0, 0, 0, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });
      R.metal.lathe([0.7, -0.03, 0.72, 0, 0.7, 0.03], 16, 0, 0, 0, TINT.iron, { jit: 0.05 });
      for (let k = 0; k < 8; k++) R.timber.box(0.07, 0.03, 1.25, 0, 0, 0, jitterTone(TINT.wood, rnd, 0.1), { rx: (k / 8) * Math.PI, jit: 0.08 });
      R.timber.cyl(0.1, 0.1, 0.24, 8, 0, -0.12, 0, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.06 });
      ctx.pop();
    }
  }
  // Canvas hood over bows, patched and slack.
  for (let i = 0; i < 5; i++) {
    const bx = -1.7 + i * 0.85;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * Math.PI;
      pts.push([bx, bed + 0.2 + Math.sin(a) * 1.3, -Math.cos(a) * 1.05]);
    }
    R.timber.tube(pts, 0.035, 4, jitterTone(TINT.woodDark, rnd, 0.1));
  }
  const segs = 9;
  for (let i = 0; i < 4; i++) {
    const x0 = -1.7 + i * 0.85;
    const x1 = x0 + 0.85;
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * Math.PI;
      const a1 = ((k + 1) / segs) * Math.PI;
      const sag = -0.05 * Math.sin(((x0 + x1) / 2) * 3);
      R.cloth.quad([x0, bed + 0.2 + Math.sin(a0) * 1.32 + sag, -Math.cos(a0) * 1.07, x1, bed + 0.2 + Math.sin(a0) * 1.32 + sag, -Math.cos(a0) * 1.07, x1, bed + 0.2 + Math.sin(a1) * 1.32 + sag, -Math.cos(a1) * 1.07, x0, bed + 0.2 + Math.sin(a1) * 1.32 + sag, -Math.cos(a1) * 1.07], jitterTone(i % 2 ? 0xc8bca0 : 0xb8ad94, rnd, 0.1), { uv: [0, 0, 1, 0, 1, 1, 0, 1], amp: 0.12, flip: true });
    }
  }
  // Shaft, laid down.
  R.timber.rod(2.2, 0.6, -0.5, 4.4, 0.18, -0.35, 0.06, 5, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });
  R.timber.rod(2.2, 0.6, 0.5, 4.4, 0.18, 0.35, 0.06, 5, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });
  // Cargo: barrels, sacks, a chest.
  barrel(R, rnd, -1.4, bed + 0.1, 0.4, 0.8);
  barrel(R, rnd, -0.9, bed + 0.1, -0.5, 0.8);
  sack(R, rnd, 0.9, bed + 0.1, 0.4, 1.1);
  crate(R, rnd, 1.4, bed + 0.1, -0.5, 0.8, 0.5, 0.6, 0.2);
  ctx.pop();
}

/** A shipwreck: a few ribs and strakes of a hull half buried in the sand. */
export function wreck(R: Region, rnd: Rnd, x: number, y: number, z: number, yaw: number, len = 9) {
  const ctx = R.ctx;
  ctx.push(x, y, z, yaw);
  const ribs = 9;
  for (let i = 0; i < ribs; i++) {
    const t = i / (ribs - 1);
    const zz = (t - 0.5) * len;
    const w = (1.5 + 0.6 * Math.sin(Math.PI * t)) * (0.85 + rnd() * 0.15);
    const broken = rnd() < 0.3;
    for (const s of [-1, 1]) {
      const pts: [number, number, number][] = [];
      const top = broken ? 0.4 + rnd() * 0.5 : 1;
      for (let k = 0; k <= 8; k++) {
        const a = (k / 8) * (Math.PI / 2) * top;
        pts.push([s * w * Math.sin(a) * 1.05, 0.1 + 1.5 * (1 - Math.cos(a)) * 0.9 * 1.2 - 0.5, zz]);
      }
      R.timber.tube(pts, 0.09, 5, jitterTone(TINT.woodDark, rnd, 0.2));
    }
  }
  for (let s = 0; s < 3; s++) {
    for (const side of [-1, 1]) {
      const pts: [number, number, number][] = [];
      for (let i = 0; i < ribs - 2; i++) {
        const t = (i + s) / (ribs - 1);
        pts.push([side * (1.3 + s * 0.42 + 0.4 * Math.sin(Math.PI * t)), 0.25 + s * 0.42, (t - 0.5) * len]);
      }
      if (pts.length > 1) R.planks.tube(pts, 0.05, 4, jitterTone(TINT.wood, rnd, 0.2));
    }
  }
  R.timber.box(0.24, 0.2, len, 0, -0.55, 0, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.1, grain: 'z' });
  ctx.pop();
}

/** A rough table-and-stools set. */
export function benchSet(R: Region, rnd: Rnd, x: number, y: number, z: number, yaw: number) {
  const ctx = R.ctx;
  ctx.push(x, y, z, yaw);
  R.planks.box(1.9, 0.09, 0.42, 0, 0.46, 0, jitterTone(TINT.wood, rnd, 0.14), { jit: 0.1, grain: 'x', rz: (rnd() - 0.5) * 0.02 });
  for (const s of [-1, 1]) R.timber.box(0.12, 0.5, 0.36, s * 0.78, -0.04, 0, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08, grain: 'y' });
  ctx.pop();
}

export { hash3 };
