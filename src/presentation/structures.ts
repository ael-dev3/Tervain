import * as THREE from 'three';
import type { Batch } from './buildKit';
import { asRGB, hash3, mulc, rgb, type Col, type RGB } from './buildKit';
import type { Region } from './regions';
import { hipRoof, gableRoof, leanRoof, ROOFS, type RoofResult } from './roofs';
import { rockShapes } from './scatter';

/**
 * Building blocks shared by every structure: rough foundations, plank and timber-frame and rubble walls, doors and windows
 * with shutters that hang wrong, chimneys, crooked posts. Everything is written in a local frame (x along the front wall, z
 * toward the door, y up from the average ground) through the region's transform stack, and nothing is quite square: posts
 * lean, planks stand at different depths, stones are uneven, and every roof sags a little.
 */

export type Rnd = () => number;

/** Tints multiply the textures, which carry the colour, so these sit near 1 with a little hue. */
export const TINT = {
  wood: 0xd4cbbd,
  woodDark: 0x8e8478,
  woodPale: 0xe6dccb,
  stone: 0xd6cec2,
  stoneDark: 0x9a9388,
  plaster: 0xe2d9c6,
  iron: 0x77726a,
  rust: 0x8a6a4a,
  rope: 0xb4a07a,
  cloth: 0xd6ccb4,
  slate: 0xb8bcc0,
  thatch: 0xe0d0a8,
  shingle: 0xd0c0a8,
  tile: 0xd8b8a4,
} as const;

/** The building textures are dark (they hold the colour), so tints are lifted a little to compensate. */
export const TONE_GAIN = 1.65;
export const jitterTone = (hex: number, rnd: Rnd, j = 0.12): RGB => mulc(rgb(hex), TONE_GAIN * (1 + (rnd() - 0.5) * 2 * j));

export function windowMats(R: Region) {
  return { glow: R.glow, pane: R.pane };
}

/** A post that leans a little and stands at its own height. */
export function post(B: Batch, rnd: Rnd, x: number, z: number, h: number, w: number, tint: Col, sink = 0.3) {
  const lean = (rnd() - 0.5) * 0.05;
  const lean2 = (rnd() - 0.5) * 0.05;
  B.box(w * (0.9 + rnd() * 0.25), h + sink, w * (0.9 + rnd() * 0.25), x, -sink, z, tint, { rx: lean, rz: lean2, ry: rnd() * 1.5, jit: 0.12, grain: 'y' });
}

/** Rough stones set round a footprint, sunk into the ground, so the building stands on rubble and not on a plinth of boxes. */
export function foundation(R: Region, rnd: Rnd, w: number, d: number, top: number, sink: number, tint = TINT.stoneDark) {
  const B = R.stone;
  // Rubble is the visible facing; this recessed plinth seals its seams and carries the wall/floor down into the earth.
  B.bx(-w / 2 + 0.08, -sink, -d / 2 + 0.08, w / 2 - 0.08, top + 0.02, d / 2 - 0.08, jitterTone(tint, rnd, 0.06), { jit: 0.02, amp: 0.06 });
  const run = (len: number, place: (t: number, sw: number) => [number, number, number]) => {
    let t = -len / 2;
    while (t < len / 2 - 0.2) {
      const sw = 0.5 + rnd() * 0.55;
      const [x, z, yaw] = place(t + sw / 2, sw);
      const h = top + sink + (rnd() - 0.5) * 0.12;
      B.box(sw * 0.98, h, 0.5 + rnd() * 0.2, x, -sink, z, jitterTone(tint, rnd, 0.10), { ry: yaw + (rnd() - 0.5) * 0.12, jit: 0.055, amp: 0.045 });
      // A second, smaller course now and then.
      if (rnd() < 0.3) B.box(sw * 0.7, 0.16 + rnd() * 0.1, 0.4, x + (rnd() - 0.5) * 0.2, top - 0.02, z, jitterTone(tint, rnd, 0.2), { ry: yaw + (rnd() - 0.5) * 0.3, jit: 0.16 });
      t += sw * 0.97;
    }
  };
  const ox = 0.1;
  run(w + 0.6, (t) => [t, d / 2 + ox, 0]);
  run(w + 0.6, (t) => [t, -d / 2 - ox, 0]);
  run(d, (t) => [w / 2 + ox, t, Math.PI / 2]);
  run(d, (t) => [-w / 2 - ox, t, Math.PI / 2]);
}

/** An opening through a face: between x0 and x1, up to `top` above the face's foot. */
export interface FaceGap { x0: number; x1: number; top: number }

/**
 * A run of vertical boards. Each stands slightly proud or recessed, at a slightly different height, with a gap. Boards
 * across a doorway stop above it; the decorative random sequence is the same with or without one.
 */
export function plankFace(R: Region, rnd: Rnd, len: number, h: number, y0: number, tint = TINT.wood, gap?: FaceGap) {
  const B = R.planks;
  let x = -len / 2;
  while (x < len / 2 - 0.05) {
    const pw = Math.min(len / 2 - x, 0.2 + rnd() * 0.14);
    const cx = x + pw / 2;
    const top = h + (rnd() - 0.5) * 0.14 - (rnd() < 0.08 ? 0.35 : 0);
    const depth = 0.06 + rnd() * 0.02, z = (rnd() - 0.5) * 0.06, tone = jitterTone(tint, rnd, 0.09);
    const o = { ry: (rnd() - 0.5) * 0.02, rz: (rnd() - 0.5) * 0.014, jit: 0.045, grain: 'y' as const, amp: 0.035 };
    const width = pw * 0.93, left = cx - width / 2, right = cx + width / 2;
    if (!gap || right <= gap.x0 || left >= gap.x1) B.box(width, top, depth, cx, y0, z, tone, o);
    else {
      // The parts beside the doorway stand full height; the part over it starts at the lintel.
      if (left < gap.x0) B.box(gap.x0 - left, top, depth, (left + gap.x0) / 2, y0, z, tone, o);
      if (right > gap.x1) B.box(right - gap.x1, top, depth, (gap.x1 + right) / 2, y0, z, tone, o);
      const over = Math.max(left, gap.x0), under = Math.min(right, gap.x1);
      if (top > gap.top) B.box(under - over, top - gap.top, depth, (over + under) / 2, y0 + gap.top, z, tone, o);
    }
    x += pw;
  }
}

/**
 * Walls of a given thickness, standing inward from the footprint line, with a doorway through the front (+z) wall:
 * the door's width and height, centred at `door.x`.
 */
export function roomWalls(B: Batch, w: number, d: number, h: number, y0: number, t: number, door: { x: number; halfWidth: number; height: number }, tint: Col, sub = 0.7) {
  const o = { sub, amp: 0.045, jit: 0.02 };
  const x0 = door.x - door.halfWidth, x1 = door.x + door.halfWidth;
  B.bx(-w / 2, y0, d / 2 - t, x0, y0 + h, d / 2, tint, o);
  B.bx(x1, y0, d / 2 - t, w / 2, y0 + h, d / 2, tint, o);
  B.bx(x0, y0 + door.height, d / 2 - t, x1, y0 + h, d / 2, tint, o);
  B.bx(-w / 2, y0, -d / 2, w / 2, y0 + h, -d / 2 + t, tint, o);
  B.bx(-w / 2, y0, -d / 2 + t, -w / 2 + t, y0 + h, d / 2 - t, tint, o);
  B.bx(w / 2 - t, y0, -d / 2 + t, w / 2, y0 + h, d / 2 - t, tint, o);
}

/** A wall slab in one material with a subdivided front so vertex colour noise reads on large planes. */
export function slab(B: Batch, w: number, h: number, d: number, y0: number, tint: Col, sub = 0.7) {
  B.bx(-w / 2, y0, -d / 2, w / 2, y0 + h, d / 2, tint, { sub, amp: 0.045, jit: 0.02 });
}

/**
 * Exposed timber frame over a plaster or stone wall: corner posts, a sill, a mid rail, a top plate and braces. Across a
 * doorway in the front wall (local x from x0 to x1, up to `top` above y0) the rails and studs stop at its sides; the
 * decorative random sequence is unchanged.
 */
export function timberFrame(R: Region, rnd: Rnd, w: number, d: number, h: number, y0: number, gap?: FaceGap) {
  const B = R.timber;
  const t = TINT.woodDark;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(B, rnd, sx * (w / 2 + 0.02), sz * (d / 2 + 0.02), y0 + h + 0.1, 0.26, jitterTone(t, rnd, 0.1), 0.2);
  const rails = [y0 + 0.02, y0 + h * 0.46, y0 + h - 0.05];
  for (const y of rails) {
    for (const sz of [-1, 1]) {
      const tone = jitterTone(t, rnd, 0.12), z0 = sz * (d / 2 + 0.03) - 0.09, z1 = sz * (d / 2 + 0.03) + 0.09;
      if (sz === 1 && gap && y < y0 + gap.top) {
        B.bx(-w / 2 - 0.05, y, z0, gap.x0, y + 0.17, z1, tone, { grain: 'x', jit: 0.1 });
        B.bx(gap.x1, y, z0, w / 2 + 0.05, y + 0.17, z1, tone, { grain: 'x', jit: 0.1 });
      } else B.bx(-w / 2 - 0.05, y, z0, w / 2 + 0.05, y + 0.17, z1, tone, { grain: 'x', jit: 0.1 });
    }
    for (const sx of [-1, 1]) B.bx(sx * (w / 2 + 0.03) - 0.09, y, -d / 2 - 0.05, sx * (w / 2 + 0.03) + 0.09, y + 0.17, d / 2 + 0.05, jitterTone(t, rnd, 0.12), { grain: 'z', jit: 0.1 });
  }
  // Intermediate studs and corner braces.
  const nStud = Math.max(1, Math.round(w / 2.1) - 1);
  for (let i = 1; i <= nStud; i++) {
    const x = -w / 2 + (i * w) / (nStud + 1) + (rnd() - 0.5) * 0.2;
    for (const sz of [-1, 1]) {
      const tone = jitterTone(t, rnd, 0.1), rz = (rnd() - 0.5) * 0.03;
      // A stud never stands in the doorway; over it, it shortens to the lintel.
      if (sz === 1 && gap && x + 0.07 > gap.x0 && x - 0.07 < gap.x1) {
        if (h - 0.1 > gap.top + 0.05) B.box(0.14, h - 0.1 - gap.top - 0.05, 0.16, x, y0 + gap.top + 0.1, sz * (d / 2 + 0.03), tone, { grain: 'y', rz, jit: 0.1 });
      } else B.box(0.14, h - 0.1, 0.16, x, y0 + 0.05, sz * (d / 2 + 0.03), tone, { grain: 'y', rz, jit: 0.1 });
    }
  }
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const bx = sx * (w / 2 + 0.03);
    const bz = sz * (d / 2 + 0.03);
    B.rod(bx, y0 + h * 0.46, bz, bx - sx * Math.min(1.1, w * 0.13), y0 + h - 0.1, bz, 0.06, 4, jitterTone(t, rnd, 0.1), { caps: false });
  }
}

/** Rubble corners: alternating long and short stones proud of the wall. */
export function quoins(R: Region, rnd: Rnd, w: number, d: number, h: number, y0: number) {
  const B = R.stone;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    let y = y0;
    let i = 0;
    while (y < y0 + h - 0.15) {
      const sh = 0.24 + rnd() * 0.14;
      const long = i % 2 === 0;
      const lx = (long ? 0.62 : 0.34) + rnd() * 0.12;
      const lz = (long ? 0.34 : 0.62) + rnd() * 0.12;
      B.box(lx, sh, lz, sx * (w / 2 - lx / 2 + 0.06), y, sz * (d / 2 - lz / 2 + 0.06), jitterTone(TINT.stone, rnd, 0.10), { ry: (rnd() - 0.5) * 0.06, jit: 0.045, amp: 0.04 });
      y += sh + 0.01;
      i++;
    }
  }
}

export interface DoorOpts {
  /**
   * Draw the leaf apart, so it can swing: into this region, in a frame whose origin is the hinge at the leaf's left
   * edge (the leaf extending along +x, its outer face towards +z). The dark backing of a closed door is then left out.
   * The decorative random sequence is the same either way.
   */
  leaf?: Region;
  x?: number;
  /** Threshold height above the building's ground frame. */
  y?: number;
  w?: number;
  h?: number;
  /** Depth of the wall surface in the local frame (z of the wall face). */
  z: number;
  stone?: boolean;
}

/** A plank door in a heavy frame with strap hinges, a lintel and a worn stone step. */
export function door(R: Region, rnd: Rnd, o: DoorOpts) {
  const w = o.w ?? 1.05;
  const h = o.h ?? 2.05;
  const x = o.x ?? 0;
  const z = o.z;
  const base = o.y ?? 0;
  R.ctx.push(0, base, 0);
  const T = o.stone ? R.stone : R.timber;
  const frameTint = o.stone ? TINT.stone : TINT.woodDark;
  T.box(0.2, h + 0.2, 0.2, x - w / 2 - 0.1, -0.05, z + 0.08, jitterTone(frameTint, rnd, 0.075), { rz: (rnd() - 0.5) * 0.02, grain: 'y', jit: 0.1 });
  T.box(0.2, h + 0.2, 0.2, x + w / 2 + 0.1, -0.05, z + 0.08, jitterTone(frameTint, rnd, 0.075), { rz: (rnd() - 0.5) * 0.02, grain: 'y', jit: 0.1 });
  T.box(w + 0.7, 0.24, 0.24, x, h + 0.02, z + 0.08, jitterTone(frameTint, rnd, 0.075), { rz: (rnd() - 0.5) * 0.03, grain: 'x', jit: 0.1 });
  if (o.stone) {
    for (const side of [-1, 1]) for (let j = 0; j < 5; j++) {
      const tone = mulc(rgb(TINT.stone), TONE_GAIN * (0.91 + hash3(x + side, j, z) * 0.13));
      R.stone.box(0.24, h / 5 - 0.035, 0.035, x + side * (w / 2 + 0.1), -0.025 + j * h / 5, z + 0.198, tone, { jit: 0.015, amp: 0.015 });
    }
  }
  // The leaf: in place in this region, or about its hinge in its own (the same shapes either way).
  const L = o.leaf ?? R;
  const lx = o.leaf ? -(x - w / 2) : 0, lz = o.leaf ? -(z + 0.05) : 0;
  if (!o.leaf) R.vc.box(w, h, 0.045, x, 0, z + 0.015, 0x17110c, { jit: 0, amp: 0 });
  const P = L.planks;
  const n = Math.round(w / 0.2);
  for (let i = 0; i < n; i++) P.box((w / n) * 0.94, h - (rnd() < 0.15 ? 0.05 : 0), 0.05, lx + x - w / 2 + (i + 0.5) * (w / n), 0, lz + z + 0.05 + (rnd() - 0.5) * 0.02, jitterTone(TINT.woodPale, rnd, 0.09), { grain: 'y', jit: 0.045, amp: 0.03 });
  for (const yy of [0.35, h - 0.4]) L.metal.box(w * 0.9, 0.09, 0.03, lx + x, yy, lz + z + 0.095, TINT.iron, { jit: 0.08 });
  L.metal.box(0.09, 0.09, 0.05, lx + x + w * 0.32, h * 0.5, lz + z + 0.1, TINT.iron, { jit: 0.05 });
  // Forged straps are fastened into the boards; these details never consume the layout's RNG stream.
  for (const yy of [0.35, h - 0.4]) for (const f of [-0.32, 0.32]) {
    L.metal.rod(lx + x + w * f, yy + 0.04, lz + z + 0.106, lx + x + w * f, yy + 0.04, lz + z + 0.13, 0.018, 4, TINT.iron, { jit: 0.02, amp: 0 });
  }
  L.metal.box(0.075, 0.21, 0.028, lx + x + w * 0.32, h * 0.5 - 0.045, lz + z + 0.098, TINT.iron, { jit: 0.02, amp: 0 });
  const ring: [number, number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    ring.push([lx + x + w * 0.32 + Math.cos(a) * 0.047, h * 0.5 + 0.015 + Math.sin(a) * 0.055, lz + z + 0.143]);
  }
  for (let i = 0; i < ring.length; i++) L.metal.rod(...ring[i]!, ...ring[(i + 1) % ring.length]!, 0.012, 3, TINT.iron, { jit: 0.02, amp: 0 });
  R.ctx.pop();
  // Full-depth treads meet both the ground and the raised threshold, rather than floating slabs.
  R.stone.box(w + 0.7, base + 0.16, 0.7, x, -0.08, z + 0.42, jitterTone(TINT.stone, rnd, 0.12), { jit: 0.1 });
  if (base > 0.15) R.stone.box(w + 0.9, base * 0.5 + 0.08, 0.5, x, -0.08, z + 0.96, jitterTone(TINT.stoneDark, rnd, 0.12), { jit: 0.1 });
}

export interface WindowOpts {
  x: number;
  y: number;
  z: number;
  w?: number;
  h?: number;
  /** Rotation of the window about y, in the caller's frame (0 faces +z). */
  ry?: number;
  shutters?: boolean;
  /** Heavy lime-set jambs on stone structures, retaining the same window envelope. */
  stone?: boolean;
}

/** A small window: frame, sill, glowing pane, and shutters standing open at odd angles. */
export function windowAt(R: Region, rnd: Rnd, o: WindowOpts) {
  const w = o.w ?? 0.72;
  const h = o.h ?? 0.82;
  const ctx = R.ctx;
  ctx.push(o.x, o.y, o.z, o.ry ?? 0);
  const frame = o.stone ? R.stone : R.timber;
  const tint = () => jitterTone(o.stone ? TINT.stone : TINT.woodDark, rnd, 0.075);
  // A recessed dark reveal makes the small opening legible in bright sunlight without bright glass.
  R.vc.box(w + 0.15, h + 0.12, 0.02, 0, -0.055, 0.005, 0x171610, { jit: 0, amp: 0 });
  frame.box(w + 0.2, 0.11, 0.2, 0, -0.1, 0.06, tint(), { jit: 0.1 });
  frame.box(w + 0.2, 0.11, 0.16, 0, h, 0.05, tint(), { jit: 0.1 });
  frame.box(0.1, h + 0.1, 0.14, -w / 2 - 0.05, -0.03, 0.05, tint(), { jit: 0.1, grain: 'y' });
  frame.box(0.1, h + 0.1, 0.14, w / 2 + 0.05, -0.03, 0.05, tint(), { jit: 0.1, grain: 'y' });
  R.glow.box(w, h, 0.03, 0, 0, 0.04, 0xffffff, { jit: 0 });
  R.pane.box(w, h, 0.04, 0, 0, 0.045, 0xffffff, { jit: 0 });
  R.timber.box(0.05, h, 0.06, 0, 0, 0.075, jitterTone(TINT.woodDark, rnd), { jit: 0.05 });
  R.timber.box(w, 0.05, 0.06, 0, h * 0.5, 0.075, jitterTone(TINT.woodDark, rnd), { jit: 0.05 });
  if (o.shutters ?? true) {
    for (const s of [-1, 1]) {
      const open = rnd() < 0.7 ? 0.9 + rnd() * 0.5 : 0.25 * rnd();
      // Open shutters swing out from the wall (A75): turned by +s·open they swung inward, through the wall and into the room.
      ctx.push(s * (w / 2 + 0.04), 0, 0.08, -s * open + (rnd() - 0.5) * 0.06);
      const sh = h * (0.96 + rnd() * 0.06);
      const tint = jitterTone(TINT.wood, rnd, 0.09);
      const lean = (rnd() - 0.5) * 0.04;
      ctx.push(s * w / 4, 0, 0, 0, 0, lean);
      const sw = w * 0.49;
      for (let i = 0; i < 2; i++) R.planks.box(sw / 2 * 0.96, sh, 0.05, -sw / 2 + (i + 0.5) * sw / 2, 0, 0, mulc(tint, 0.96 + hash3(i, o.x, o.z) * 0.08), { grain: 'y', jit: 0.025, amp: 0.025 });
      for (const y of [sh * 0.17, sh * 0.76]) R.timber.box(sw * 0.94, 0.065, 0.038, 0, y, 0.036, mulc(tint, 0.83), { grain: 'x', jit: 0.025, amp: 0.02 });
      R.timber.box(0.048, Math.hypot(sw * 0.72, sh * 0.52), 0.035, -sw * 0.36, sh * 0.24, 0.053, mulc(tint, 0.82), { rz: -Math.atan2(sw * 0.72, sh * 0.52), grain: 'y', jit: 0.02, amp: 0.02 });
      ctx.pop();
      ctx.pop();
    }
  }
  ctx.pop();
}

/** A rubble chimney stack rising through the roof. */
export function chimney(R: Region, rnd: Rnd, x: number, z: number, y0: number, h: number, w = 0.75) {
  const B = R.stone;
  let y = y0;
  let course = 0;
  while (y < y0 + h) {
    const sh = 0.22 + rnd() * 0.1;
    const inset = course > 3 && course % 2 === 0 ? 0.03 : 0;
    B.box(w - inset, sh, w - inset, x + (rnd() - 0.5) * 0.03, y, z + (rnd() - 0.5) * 0.03, jitterTone(TINT.stone, rnd, 0.18), { ry: (rnd() - 0.5) * 0.1, jit: 0.14 });
    y += sh;
    course++;
  }
  B.box(w + 0.16, 0.12, w + 0.16, x, y, z, jitterTone(TINT.stoneDark, rnd, 0.12), { jit: 0.1 });
  R.vc.box(w - 0.3, 0.04, w - 0.3, x, y + 0.1, z, 0x141210, { jit: 0 });
}

export type RoofKind = 'thatch' | 'shingle' | 'slate' | 'tile';

/** Roof with a sag: a second, slightly lower ridge board and an uneven overhang so it never reads as a prefab. */
export function roofFor(R: Region, kind: 'gable' | 'hip' | 'lean', style: RoofKind, w: number, d: number, y: number, seed: number, o: { pitch?: number; palette?: number[] } = {}) {
  const pal = o.palette ?? ROOFS[style].colors;
  if (kind === 'hip') return hipRoof(R, { w, d, y, style, seed, palette: pal, pitch: o.pitch, oh: 0.6 });
  if (kind === 'lean') return leanRoof(R, { w, d, y, style, seed, palette: pal, pitch: o.pitch, ohx: 0.35, ohz: 0.55 });
  return gableRoof(R, { w, d, y, style, seed, palette: pal, pitch: o.pitch, ohx: 0.45, ohz: 0.6 });
}

/** The triangular fill of a gable end, in plank or plaster. */
export function gableEnd(R: Region, side: 1 | -1, w: number, d: number, y: number, rise: number, mat: 'planks' | 'plaster' | 'stone', knee = 0, thickness = 0.24) {
  const ctx = R.ctx;
  const hs = d / 2;
  ctx.push(side * (w / 2), y, 0, (side * Math.PI) / 2);
  const profile: [number, number][] = knee > 0 ? [[-hs, 0], [hs, 0], [hs, knee], [0, rise], [-hs, knee]] : [[-hs, 0], [hs, 0], [0, rise]];
  const batch = R.get(mat);
  const firstUV = batch.uv.n;
  batch.prism(profile, -thickness * 0.5, thickness * 0.5, mulc(rgb(mat === 'stone' ? TINT.stone : mat === 'plaster' ? TINT.plaster : TINT.wood), TONE_GAIN), { jit: 0.06, amp: 0.1 });
  if (mat === 'planks') for (let i = firstUV; i < batch.uv.n; i += 2) {
    const u = batch.uv.a[i]!;
    batch.uv.a[i] = batch.uv.a[i + 1]!;
    batch.uv.a[i + 1] = u;
  }
  ctx.pop();
}

/** Structural wall infill follows the actual overhanging roof, including its raised wall/eave intersection. */
export function roofWallInfill(R: Region, kind: 'gable' | 'hip' | 'lean', w: number, d: number, wallTop: number, roof: RoofResult, mat: 'planks' | 'plaster' | 'stone', thickness = 0.24) {
  const base = wallTop - 0.04;
  const upper = roof.ridgeY - 0.03; // Meets the roof's structural shell inside its thickness.
  const slope = Math.tan(roof.pitch);
  const tint = mulc(rgb(mat === 'stone' ? TINT.stone : mat === 'plaster' ? TINT.plaster : TINT.wood), TONE_GAIN);
  if (kind === 'hip') {
    const B = R.get(mat);
    const hw = w / 2, hd = d / 2, t = thickness / 2;
    // Equal overhangs put the hip roof at one height around the wall perimeter. Its
    // joint follows the slope across the wall thickness, including the four miters.
    const outerY = upper - (Math.min(w, d) / 2 + t) * slope;
    const innerY = upper - (Math.min(w, d) / 2 - t) * slope;
    const outer: [number, number][] = [[-hw - t, hd + t], [hw + t, hd + t], [hw + t, -hd - t], [-hw - t, -hd - t]];
    const inner: [number, number][] = [[-hw + t, hd - t], [hw - t, hd - t], [hw - t, -hd + t], [-hw + t, -hd + t]];
    const point = (p: [number, number], y: number) => [p[0], y, p[1]];
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const oa = outer[i]!, ob = outer[next]!, ia = inner[i]!, ib = inner[next]!;
      B.quad([...point(oa, outerY), ...point(ob, outerY), ...point(ib, innerY), ...point(ia, innerY)], tint, { amp: 0.08 });
      B.quad([...point(oa, base), ...point(ia, base), ...point(ib, base), ...point(ob, base)], tint, { amp: 0.08 });
      B.quad([...point(oa, base), ...point(ob, base), ...point(ob, outerY), ...point(oa, outerY)], tint, { amp: 0.08 });
      B.quad([...point(ib, base), ...point(ia, base), ...point(ia, innerY), ...point(ib, innerY)], tint, { amp: 0.08 });
    }
    return;
  }
  if (kind === 'gable') {
    const knee = Math.max(0, upper - d / 2 * slope - base);
    for (const side of [-1, 1] as const) gableEnd(R, side, w, d, base, upper - base, mat, knee, thickness);
    return;
  }
  const high = upper - (roof.halfSpan - d / 2) * slope;
  const low = high - d * slope;
  for (const side of [-1, 1] as const) {
    R.ctx.push(side * w / 2, base, 0, side * Math.PI / 2);
    // Local profile x maps to -side*z: keep the high edge at the building's rear (-z).
    const left = side === 1 ? low : high;
    const right = side === 1 ? high : low;
    R.get(mat).prism([[-d / 2, 0], [d / 2, 0], [d / 2, right - base], [-d / 2, left - base]], -thickness * 0.5, thickness * 0.5, tint, { jit: 0.04, amp: 0.08 });
    R.ctx.pop();
  }
  R.get(mat).bx(-w / 2, base, -d / 2 - thickness * 0.5, w / 2, high, -d / 2 + thickness * 0.5, tint, { jit: 0.03, amp: 0.08 });
  if (low > base) R.get(mat).bx(-w / 2, base, d / 2 - thickness * 0.5, w / 2, low, d / 2 + thickness * 0.5, tint, { jit: 0.03, amp: 0.08 });
}

/**
 * The shrine's static stone shell, with a sloped wall joint under all four hip roof planes. Its walls (`t` thick) stand
 * about the great door's opening (A66).
 */
export function buildShrineHallShell(R: Region, rnd: Rnd, w: number, d: number, h: number, sink: number, t: number, door: { x: number; halfWidth: number; height: number }): RoofResult {
  foundation(R, rnd, w + 0.6, d + 0.6, 0.7, sink);
  roomWalls(R.stone, w, d, h, 0.5, t, door, jitterTone(TINT.stone, rnd, 0.05), 0.9);
  quoins(R, rnd, w, d, h, 0.5);
  const roof = roofFor(R, 'hip', 'slate', w, d, 0.5 + h, 41, { pitch: 0.55 });
  roofWallInfill(R, 'hip', w, d, 0.5 + h, roof, 'stone');
  return roof;
}

/** A hanging lantern: bracket and a glowing cage. Registered for the night lights by the caller. */
export function lantern(R: Region, x: number, y: number, z: number) {
  R.metal.box(0.05, 0.05, 0.42, x, y + 0.02, z + 0.2, TINT.iron, { jit: 0.05 });
  R.metal.box(0.22, 0.03, 0.22, x, y - 0.34, z + 0.4, TINT.iron, { jit: 0.05 });
  R.glow.box(0.2, 0.28, 0.2, x, y - 0.3, z + 0.4, 0xffffff, { jit: 0 });
  R.metal.box(0.26, 0.04, 0.26, x, y - 0.02, z + 0.4, TINT.iron, { jit: 0.05 });
}

/** Stacked firewood, split logs laid in rows. */
export function woodpile(R: Region, rnd: Rnd, x: number, z: number, yaw: number, len = 1.6, rows = 4) {
  R.ctx.push(x, 0, z, yaw);
  for (let r = 0; r < rows; r++) {
    const n = Math.max(2, Math.round(len / 0.22) - r);
    for (let i = 0; i < n; i++) {
      const lx = -len / 2 + (i + 0.5) * (len / n) + r * 0.11;
      R.bark.rod(lx, 0.12 + r * 0.2, -0.28, lx + (rnd() - 0.5) * 0.02, 0.12 + r * 0.2 + (rnd() - 0.5) * 0.02, 0.28, 0.09 + rnd() * 0.03, 5, jitterTone(0xd8cbb8, rnd, 0.2), { jit: 0.1 });
    }
  }
  R.ctx.pop();
}

export function barrel(R: Region, rnd: Rnd, x: number, y: number, z: number, s = 1) {
  const r = 0.36 * s;
  const firstUV = R.planks.uv.n;
  // The head and foot are part of the profile: cargo barrels remain closed when seen from the elevated camera.
  R.planks.lathe([0, 0, r * 0.82, 0, r, 0.32 * s, r * 1.06, 0.62 * s, r, 0.92 * s, r * 0.84, 1.0 * s, 0, 1.0 * s], 10, x, y, z, jitterTone(TINT.wood, rnd, 0.16), { jit: 0.1 });
  // Staves run vertically around the closed hull instead of painting long grain around the hoop.
  for (let i = firstUV; i < R.planks.uv.n; i += 2) {
    const u = R.planks.uv.a[i]!;
    R.planks.uv.a[i] = R.planks.uv.a[i + 1]!;
    R.planks.uv.a[i + 1] = u;
  }
  for (const hy of [0.16, 0.5, 0.84]) R.metal.lathe([r * (0.86 + hy * 0.18) + 0.01, hy * s, r * (0.86 + hy * 0.18) + 0.03, (hy + 0.05) * s], 10, x, y, z, TINT.iron, { jit: 0.05 });
}

/** A hollow cast bell, with a rolled lip and closed shoulder under its existing timber yoke. */
export function villageBell(R: Region, rnd: Rnd) {
  // A single continuous outside/inside profile closes the mouth rim, crown and neck.
  // Maximum radius and low lip match the former bell, preserving the tower's contact envelope.
  R.bronze.lathe([0.53, -0.94, 0.62, -0.96, 0.61, -0.91, 0.55, -0.865, 0.45, -0.72, 0.36, -0.48,
    0.30, -0.17, 0.23, -0.065, 0.11, -0.02, 0.11, 0.035, 0, 0.035,
    0, -0.045, 0.18, -0.045, 0.25, -0.17, 0.29, -0.48, 0.38, -0.7, 0.48, -0.85, 0.53, -0.94],
  18, 0, 0, 0, jitterTone(0xd6c6a2, rnd, 0.04), { jit: 0.02, amp: 0.025 });
  // Restrained cast rings are part of the bronze, rather than arbitrary faction ornaments.
  R.bronze.lathe([0.306, -0.24, 0.316, -0.22, 0.314, -0.195, 0.302, -0.195, 0.306, -0.24], 18, 0, 0, 0, mulc(rgb(0xd6c6a2), TONE_GAIN), { jit: 0.015, amp: 0.02 });
  R.metal.rod(0, -0.08, 0, 0, -0.89, 0, 0.026, 6, TINT.iron, { jit: 0.02, amp: 0.02 });
  R.metal.blob(0.11, 0.11, 0.11, 0, -0.98, 0, TINT.iron, { seg: 6, rings: 3, lump: 0.08, seed: 9, smooth: true });
  R.timber.box(0.7, 0.12, 0.16, 0, 0, 0, TINT.woodDark, { jit: 0.025, amp: 0.025 });
}

export function crate(R: Region, rnd: Rnd, x: number, y: number, z: number, w = 0.7, h = 0.5, d = 0.55, yaw = 0) {
  R.planks.box(w, h, d, x, y, z, jitterTone(TINT.wood, rnd, 0.18), { ry: yaw, jit: 0.14, grain: 'x' });
  for (const s of [-1, 1]) R.timber.box(0.06, h + 0.02, d + 0.02, x + Math.cos(yaw) * s * (w / 2), y - 0.01, z - Math.sin(yaw) * s * (w / 2), jitterTone(TINT.woodDark, rnd, 0.1), { ry: yaw, jit: 0.08 });
  // Battens follow the same local frame as their box, including rotated and stacked cargo.
  R.ctx.push(x, y, z, yaw);
  const tint = mulc(rgb(TINT.woodDark), TONE_GAIN);
  for (const side of [-1, 1]) {
    for (const yy of [0.03, h - 0.085]) R.timber.box(w, 0.055, 0.035, 0, yy, side * (d / 2 + 0.015), tint, { jit: 0.025, amp: 0.025, grain: 'x' });
    R.timber.rod(-w * 0.38, h * 0.18, side * (d / 2 + 0.034), w * 0.38, h * 0.82, side * (d / 2 + 0.034), 0.027, 4, tint, { jit: 0.02, amp: 0.02 });
  }
  R.ctx.pop();
}

/** A sack, slumped. */
export function sack(R: Region, rnd: Rnd, x: number, y: number, z: number, s = 1) {
  R.cloth.blob(0.34 * s, 0.32 * s, 0.26 * s, x, y + 0.28 * s, z, jitterTone(TINT.cloth, rnd, 0.18), { seg: 7, rings: 4, lump: 0.16, seed: Math.floor(hash3(x, y, z) * 1000), smooth: true });
}

/** A boulder-sized rough stone that sits in the ground: for walls, gate posts, corner markers and quarry faces. Same shapes as the heath rocks. */
export function fieldstone(R: Region, rnd: Rnd, x: number, y: number, z: number, rx: number, ry: number, rz: number) {
  const shapes = rockShapes();
  const list = Math.max(rx, ry, rz) > 0.55 ? shapes.big : shapes.small;
  const g = list[Math.floor(rnd() * list.length)]!;
  const ctx = R.ctx;
  ctx.push(x, y + ry * 0.5, z, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.2);
  ctx.matrix.scale(new THREE.Vector3(rx * 1.05, ry * 1.5, rz * 1.05));
  R.rock.addGeometry(g, null, 0.95 + rnd() * 0.1, 0.05, Math.max(rx, ry, rz) * 1.2);
  ctx.pop();
}

export const asRgb = asRGB;
export { THREE };
