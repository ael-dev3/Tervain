import * as THREE from 'three';
import type { BuildingSpec } from '../world/layout';
import { mulberry32 } from '../world/noise';
import type { Col } from './buildKit';
import type { Region } from './regions';
import { jitterTone, TINT } from './structures';

/**
 * The inn's hanging sign (A136): a wrought-iron bracket out from the east end wall, near the front corner, its arm braced
 * by a strut and a scroll, with a ring and a short chain at each end of a painted board. The board is three boards
 * pinned by iron corner straps, painted with a tankard of ale in a border, and weathered: paint flaked and bleached,
 * rust run down from the iron, the bottom edge darkened by rain. The board and chains hang apart from the shell and
 * swing a little about the arm in the wind (`signSway`).
 */
export const INN_SIGN = {
  /** Along the east end wall from the building's centre (z), and the arm's height above the wall's foot. */
  z: 2.45, armY: 2.8,
  /** How far the arm reaches out from the wall, and where the board's middle hangs along it. */
  reach: 1.42, middle: 0.9,
  /** The board: width, height, thickness, and how far its top hangs below the arm. */
  w: 0.92, h: 0.64, t: 0.05, drop: 0.3,
} as const;

export interface SwingingPart {
  /** At the pivot, turned with the building: the swing turns about its local x. */
  pivot: THREE.Group;
  swing: THREE.Group;
  phase: number;
}

/** The board's swing about its arm (radians) at time t: a slow sway in the wind, now and then a stronger gust. */
export function signSway(t: number, phase = 0): number {
  const gust = 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.21 + phase) * Math.sin(t * 0.13 + 1.3 + phase * 0.7));
  return gust * (0.075 * Math.sin(t * 1.35 + phase) + 0.03 * Math.sin(t * 2.43 + 0.8 + phase) + 0.012 * Math.sin(t * 4.1 + phase * 2));
}

const IRON = 0x2b2926, RUST = 0x5c3420, PAINT = { ground: 0x2f3b2c, border: 0x7a5a2a, ale: 0x9a6a2c, foam: 0xd9cfb4, band: 0x262422, hop: 0x5d6a32 };

/**
 * Draw the sign. The bracket goes into R (the building's merged shell, in its frame); the board and chains into a
 * region of their own when `apart` is given, hung on a pivot at the arm, else into R where they hang at rest.
 */
export function innSign(R: Region, b: BuildingSpec, y0: number, apart?: (name: string, fn: (L: Region) => void) => THREE.Group): SwingingPart | null {
  const S = INN_SIGN, rnd = mulberry32(5150), wall = b.w / 2, z = S.z, Y = y0 + S.armY, iron = () => jitterTone(IRON, rnd, 0.08);
  // The wall plate, bolted through the plaster, and the arm out from it.
  R.metal.box(0.03, 0.62, 0.11, wall + 0.03, Y - 0.5, z, iron(), { jit: 0.04 });
  for (const y of [Y - 0.44, Y + 0.04]) R.metal.box(0.02, 0.035, 0.035, wall + 0.05, y, z, iron(), { jit: 0.04 });
  R.metal.rod(wall + 0.03, Y, z, wall + S.reach, Y, z, 0.02, 4, iron());
  // The strut from the plate's foot up under the arm, and a scroll curled in the triangle between them.
  R.metal.rod(wall + 0.03, Y - 0.46, z, wall + 0.84, Y - 0.015, z, 0.014, 4, iron());
  const spiral = (cx: number, cy: number, r0: number, turns: number, dir: number): [number, number, number][] =>
    Array.from({ length: 30 }, (_, i) => { const u = i / 29, a = dir * u * turns * Math.PI * 2, r = r0 * (1 - 0.82 * u); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z] as [number, number, number]; });
  R.metal.tube(spiral(wall + 0.27, Y - 0.15, 0.13, 1.6, 1), 0.008, 4, iron(), { amp: 0.02 });
  R.metal.tube(spiral(wall + 0.6, Y - 0.08, 0.07, 1.3, -1), 0.007, 4, iron(), { amp: 0.02 });
  // A curl up at the arm's tip and a knob on it.
  R.metal.tube(Array.from({ length: 14 }, (_, i) => { const a = -Math.PI / 2 + (i / 13) * Math.PI * 1.5, r = 0.06 * (1 - 0.4 * i / 13); return [wall + S.reach + Math.cos(a) * r, Y + 0.06 + Math.sin(a) * r, z] as [number, number, number]; }), 0.009, 4, iron());
  R.metal.blob(0.025, 0.025, 0.025, wall + S.reach + 0.005, Y + 0.002, z, iron(), { seg: 6, rings: 4, lump: 0.1 });
  // A ring round the arm at each hanging point.
  const mid = wall + S.middle, hang = S.w / 2 - 0.08;
  const ring = (L: Region, cx: number, cy: number, cz: number, rx: number, ry: number, plane: 'yz' | 'xy', r: number, c: Col) =>
    L.metal.tube(Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return (plane === 'yz' ? [cx, cy + Math.sin(a) * ry, cz + Math.cos(a) * rx] : [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cz]) as [number, number, number]; }), r, 4, c, { amp: 0.02 });
  for (const dx of [-hang, hang]) ring(R, mid + dx, Y - 0.012, z, 0.034, 0.034, 'yz', 0.006, iron());
  // The swinging part, drawn about the pivot (the arm's axis above the board's middle).
  const hangBoard = (L: Region, ox: number, oy: number, oz: number) => {
    const at = (x: number, y: number) => [ox + x, oy + y] as const;
    // Chains: three links each, turned by turns, from the ring down to an eye on the board's top edge.
    for (const dx of [-hang, hang]) {
      for (let k = 0; k < 4; k++) {
        const [cx, cy] = at(dx, -0.07 - k * 0.062);
        ring(L, cx, cy, oz, 0.016, 0.034, k % 2 ? 'yz' : 'xy', 0.0055, iron());
      }
      const [ex, ey] = at(dx, -S.drop + 0.02);
      ring(L, ex, ey, oz, 0.018, 0.022, 'xy', 0.006, iron());
    }
    // Three boards one above the other, a little uneven, the top one rising to a shallow arch.
    const top = -S.drop, bot = top - S.h, hw = S.w / 2, rows = 3, gap = 0.006;
    for (let i = 0; i < rows; i++) {
      const y1 = top - (i * S.h) / rows - (i ? gap / 2 : 0), y2 = top - ((i + 1) * S.h) / rows + (i < rows - 1 ? gap / 2 : 0);
      const tone = jitterTone(i === rows - 1 ? 0x8a7a64 : TINT.wood, rnd, 0.08);
      if (i === 0) {
        const pts: [number, number][] = [[-hw, y2], [hw, y2], [hw, y1]];
        for (let k = 1; k < 10; k++) { const u = k / 10, x = hw - u * S.w; pts.push([x, y1 + 0.06 * Math.sin(u * Math.PI)]); }
        pts.push([-hw, y1]);
        L.ctx.push(ox, oy, oz);
        L.planks.prism(pts, -S.t / 2, S.t / 2, tone, { jit: 0.06 });
        L.ctx.pop();
      } else {
        // The lowest board has lost a corner.
        const [cx] = at(0, 0);
        if (i === rows - 1) {
          L.ctx.push(ox, oy, oz);
          L.planks.prism([[-hw, y2], [hw - 0.07, y2], [hw, y2 + 0.05], [hw, y1], [-hw, y1]], -S.t / 2, S.t / 2, tone, { jit: 0.06 });
          L.ctx.pop();
        } else L.planks.box(S.w, y1 - y2, S.t, cx, oy + y2, oz, tone, { grain: 'x', jit: 0.06 });
      }
    }
    // Painted on both faces: a dark green ground, an ochre border, a tankard of ale with a head of foam and hops.
    for (const f of [1, -1]) {
      const pz = oz + f * (S.t / 2 + 0.002), paint = (w: number, h: number, x: number, y: number, c: number, d = 0.004) => {
        const [px, py] = at(x, y);
        L.vc.box(w, h, d, px, py - h / 2, pz + f * (d / 2), jitterTone(c, rnd, 0.1), { jit: 0.12, amp: 0.08 });
      };
      const cy = top - S.h / 2 - 0.01;
      paint(S.w - 0.1, S.h - 0.12, 0, cy, PAINT.ground, 0.002);
      // The border, flaked in places: each side in a few lengths, one left out.
      for (const [k, [w, h, x, y]] of ([[S.w - 0.1, 0.03, 0, top - 0.075], [S.w - 0.1, 0.03, 0, bot + 0.075], [0.03, S.h - 0.18, -hw + 0.065, top - 0.09], [0.03, S.h - 0.18, hw - 0.065, top - 0.09]] as const).entries()) {
        const pieces = 3;
        for (let p = 0; p < pieces; p++) {
          if ((k * 3 + p + (f > 0 ? 0 : 1)) % 5 === 4) continue;
          if (w > h) paint(w / pieces - 0.01, h, x - w / 2 + (p + 0.5) * (w / pieces), y, PAINT.border);
          else paint(w, h / pieces - 0.01, x, y - (p + 0.5) * (h / pieces), PAINT.border);
        }
      }
      // The tankard: its body, two dark hoops, a handle and the foam over its rim.
      const tx = -0.09, ty = cy - 0.02;
      paint(0.25, 0.3, tx, ty, PAINT.ale, 0.012);
      for (const y of [ty + 0.09, ty - 0.09]) paint(0.265, 0.026, tx, y, PAINT.band, 0.016);
      L.vc.tube(Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + (i / 8) * Math.PI, [px, py] = at(tx + 0.125 + Math.cos(a) * 0.07, ty + Math.sin(a) * 0.085); return [px, py, pz + f * 0.008] as [number, number, number]; }), 0.016, 5, PAINT.ale, { amp: 0.05 });
      for (const [k, dx] of [-0.08, -0.025, 0.03, 0.085].entries()) {
        const [px, py] = at(tx + dx * 1.12, ty + 0.155 + (k % 2) * 0.012);
        L.vc.blob(0.042, 0.032, 0.012, px, py, pz + f * 0.01, PAINT.foam, { seg: 7, rings: 3, lump: 0.15, seed: k + (f > 0 ? 0 : 9) });
      }
      // A sprig of hops beside it: a curling bine, two leaves and three cones.
      L.vc.tube(Array.from({ length: 8 }, (_, i) => { const u = i / 7, [px, py] = at(0.17 + 0.05 * Math.sin(u * 4), ty + 0.17 - u * 0.3); return [px, py, pz + f * 0.004] as [number, number, number]; }), 0.005, 4, PAINT.hop, { amp: 0.05 });
      for (const [k, [dx, dy, rx, ry]] of ([[0.25, 0.1, 0.03, 0.016], [0.12, -0.02, 0.028, 0.015], [0.2, -0.06, 0.018, 0.03], [0.24, -0.1, 0.018, 0.03], [0.17, -0.12, 0.016, 0.027]] as const).entries()) {
        const [px, py] = at(dx, ty + dy);
        L.vc.blob(rx, ry, 0.008, px, py, pz + f * 0.007, k < 2 ? PAINT.hop : 0x8a9248, { seg: 6, rings: 3, lump: 0.15, seed: 20 + k });
      }
      // The paint flaked off to bare grey wood in patches, most along the edges and the lower board.
      for (let k = 0; k < 9; k++) {
        const u = rnd(), v = rnd() ** 0.6, w = 0.02 + rnd() * 0.05, h = 0.012 + rnd() * 0.025;
        paint(w, h, (u - 0.5) * (S.w - 0.16), bot + 0.07 + v * (S.h - 0.14), 0x7d7466, 0.003);
      }
      // Iron straps over the corners, nailed, rust run down the paint below them.
      for (const sx of [-1, 1]) for (const top_ of [true, false]) {
        const y = top_ ? top - 0.035 : bot + 0.035, x = sx * (hw - 0.05);
        const [px, py] = at(x, y);
        L.metal.box(0.1, 0.028, 0.006, px, py - 0.014, pz + f * 0.006, iron(), { jit: 0.05 });
        L.metal.box(0.028, 0.1, 0.006, at(sx * (hw - 0.014), 0)[0], py - (top_ ? 0.086 : 0.014), pz + f * 0.006, iron(), { jit: 0.05 });
        if (top_) paint(0.012, 0.09 + rnd() * 0.08, x + (rnd() - 0.5) * 0.04, y - 0.03, RUST, 0.001);
      }
    }
    // The bottom edge darkened by rain and mould.
    const [bx, by] = at(0, bot);
    L.vc.box(S.w - 0.02, 0.03, S.t + 0.006, bx, by - 0.002, oz, 0x2e3022, { jit: 0.1, amp: 0.1 });
  };
  if (!apart) { hangBoard(R, mid, Y, z); return null; }
  const leaf = apart(`inn-sign-${b.id}`, (L) => hangBoard(L, 0, 0, 0));
  const pivot = new THREE.Group(), swing = new THREE.Group();
  pivot.name = `Sign / ${b.id}`;
  pivot.position.copy(R.ctx.toWorld(mid, Y, z));
  pivot.rotation.y = b.yaw;
  leaf.removeFromParent();
  pivot.add(swing);
  swing.add(leaf);
  return { pivot, swing, phase: (b.x * 0.37 + b.z * 0.11) % 6.28 };
}
