import * as THREE from 'three';
import type { Batch } from './buildKit';
import { asRGB, hash3, mulc, rgb, type Col, type RGB } from './buildKit';
import type { Region } from './regions';
import { hipRoof, gableRoof, leanRoof, ROOFS } from './roofs';
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
  const run = (len: number, place: (t: number, sw: number) => [number, number, number]) => {
    let t = -len / 2;
    while (t < len / 2 - 0.2) {
      const sw = 0.5 + rnd() * 0.55;
      const [x, z, yaw] = place(t + sw / 2, sw);
      const h = top + sink + (rnd() - 0.5) * 0.12;
      B.box(sw * 0.98, h, 0.5 + rnd() * 0.2, x, -sink, z, jitterTone(tint, rnd, 0.16), { ry: yaw + (rnd() - 0.5) * 0.12, jit: 0.16, amp: 0.1 });
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

/** A run of vertical boards. Each stands slightly proud or recessed, at a slightly different height, with a gap. */
export function plankFace(R: Region, rnd: Rnd, len: number, h: number, y0: number, tint = TINT.wood) {
  const B = R.planks;
  let x = -len / 2;
  while (x < len / 2 - 0.05) {
    const pw = Math.min(len / 2 - x, 0.2 + rnd() * 0.14);
    const cx = x + pw / 2;
    const top = h + (rnd() - 0.5) * 0.14 - (rnd() < 0.08 ? 0.35 : 0);
    B.box(pw * 0.93, top, 0.06 + rnd() * 0.02, cx, y0, (rnd() - 0.5) * 0.06, jitterTone(tint, rnd, 0.16), { ry: (rnd() - 0.5) * 0.02, rz: (rnd() - 0.5) * 0.014, jit: 0.14, grain: 'y', amp: 0.1 });
    x += pw;
  }
}

/** A wall slab in one material with a subdivided front so vertex colour noise reads on large planes. */
export function slab(B: Batch, w: number, h: number, d: number, y0: number, tint: Col, sub = 0.7) {
  B.bx(-w / 2, y0, -d / 2, w / 2, y0 + h, d / 2, tint, { sub, amp: 0.1, jit: 0.02 });
}

/** Exposed timber frame over a plaster or stone wall: corner posts, a sill, a mid rail, a top plate and braces. */
export function timberFrame(R: Region, rnd: Rnd, w: number, d: number, h: number, y0: number) {
  const B = R.timber;
  const t = TINT.woodDark;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(B, rnd, sx * (w / 2 + 0.02), sz * (d / 2 + 0.02), h + 0.1, 0.26, jitterTone(t, rnd, 0.1), 0.2);
  const rails = [y0 + 0.02, y0 + h * 0.46, y0 + h - 0.05];
  for (const y of rails) {
    for (const sz of [-1, 1]) B.bx(-w / 2 - 0.05, y, sz * (d / 2 + 0.03) - 0.09, w / 2 + 0.05, y + 0.17, sz * (d / 2 + 0.03) + 0.09, jitterTone(t, rnd, 0.12), { grain: 'x', jit: 0.1 });
    for (const sx of [-1, 1]) B.bx(sx * (w / 2 + 0.03) - 0.09, y, -d / 2 - 0.05, sx * (w / 2 + 0.03) + 0.09, y + 0.17, d / 2 + 0.05, jitterTone(t, rnd, 0.12), { grain: 'z', jit: 0.1 });
  }
  // Intermediate studs and corner braces.
  const nStud = Math.max(1, Math.round(w / 2.1) - 1);
  for (let i = 1; i <= nStud; i++) {
    const x = -w / 2 + (i * w) / (nStud + 1) + (rnd() - 0.5) * 0.2;
    for (const sz of [-1, 1]) B.box(0.14, h - 0.1, 0.16, x, y0 + 0.05, sz * (d / 2 + 0.03), jitterTone(t, rnd, 0.1), { grain: 'y', rz: (rnd() - 0.5) * 0.03, jit: 0.1 });
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
      B.box(lx, sh, lz, sx * (w / 2 - lx / 2 + 0.06), y, sz * (d / 2 - lz / 2 + 0.06), jitterTone(TINT.stone, rnd, 0.16), { ry: (rnd() - 0.5) * 0.06, jit: 0.14, amp: 0.1 });
      y += sh + 0.01;
      i++;
    }
  }
}

export interface DoorOpts {
  x?: number;
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
  const T = R.timber;
  T.box(0.2, h + 0.2, 0.2, x - w / 2 - 0.1, -0.05, z + 0.08, jitterTone(TINT.woodDark, rnd), { rz: (rnd() - 0.5) * 0.02, grain: 'y', jit: 0.1 });
  T.box(0.2, h + 0.2, 0.2, x + w / 2 + 0.1, -0.05, z + 0.08, jitterTone(TINT.woodDark, rnd), { rz: (rnd() - 0.5) * 0.02, grain: 'y', jit: 0.1 });
  T.box(w + 0.7, 0.24, 0.24, x, h + 0.02, z + 0.08, jitterTone(TINT.woodDark, rnd), { rz: (rnd() - 0.5) * 0.03, grain: 'x', jit: 0.1 });
  const P = R.planks;
  const n = Math.round(w / 0.2);
  for (let i = 0; i < n; i++) P.box((w / n) * 0.94, h - (rnd() < 0.15 ? 0.05 : 0), 0.05, x - w / 2 + (i + 0.5) * (w / n), 0, z + 0.05 + (rnd() - 0.5) * 0.02, jitterTone(TINT.woodPale, rnd, 0.18), { grain: 'y', jit: 0.14 });
  for (const yy of [0.35, h - 0.4]) R.metal.box(w * 0.9, 0.09, 0.03, x, yy, z + 0.095, TINT.iron, { jit: 0.08 });
  R.metal.box(0.09, 0.09, 0.05, x + w * 0.32, h * 0.5, z + 0.1, TINT.iron, { jit: 0.05 });
  R.stone.box(w + 0.7, 0.16, 0.7, x, -0.08, z + 0.42, jitterTone(TINT.stone, rnd, 0.16), { ry: (rnd() - 0.5) * 0.1, jit: 0.14 });
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
}

/** A small window: frame, sill, glowing pane, and shutters standing open at odd angles. */
export function windowAt(R: Region, rnd: Rnd, o: WindowOpts) {
  const w = o.w ?? 0.72;
  const h = o.h ?? 0.82;
  const ctx = R.ctx;
  ctx.push(o.x, o.y, o.z, o.ry ?? 0);
  R.timber.box(w + 0.2, 0.11, 0.2, 0, -0.1, 0.06, jitterTone(TINT.woodDark, rnd), { jit: 0.1 });
  R.timber.box(w + 0.2, 0.11, 0.16, 0, h, 0.05, jitterTone(TINT.woodDark, rnd), { jit: 0.1 });
  R.timber.box(0.1, h + 0.1, 0.14, -w / 2 - 0.05, -0.03, 0.05, jitterTone(TINT.woodDark, rnd), { jit: 0.1, grain: 'y' });
  R.timber.box(0.1, h + 0.1, 0.14, w / 2 + 0.05, -0.03, 0.05, jitterTone(TINT.woodDark, rnd), { jit: 0.1, grain: 'y' });
  R.glow.box(w, h, 0.03, 0, 0, 0.04, 0xffffff, { jit: 0 });
  R.pane.box(w, h, 0.04, 0, 0, 0.045, 0xffffff, { jit: 0 });
  R.timber.box(0.05, h, 0.06, 0, 0, 0.075, jitterTone(TINT.woodDark, rnd), { jit: 0.05 });
  R.timber.box(w, 0.05, 0.06, 0, h * 0.5, 0.075, jitterTone(TINT.woodDark, rnd), { jit: 0.05 });
  if (o.shutters ?? true) {
    for (const s of [-1, 1]) {
      const open = rnd() < 0.7 ? 0.9 + rnd() * 0.5 : 0.25 * rnd();
      ctx.push(s * (w / 2 + 0.04), 0, 0.08, s * open + (rnd() - 0.5) * 0.06);
      R.planks.box(w / 2 * 0.98, h * (0.96 + rnd() * 0.06), 0.05, s * (w / 4), 0, 0, jitterTone(TINT.wood, rnd, 0.16), { rz: (rnd() - 0.5) * 0.04, grain: 'y', jit: 0.14 });
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
export function gableEnd(R: Region, side: 1 | -1, w: number, d: number, y: number, rise: number, mat: 'planks' | 'plaster' | 'stone') {
  const ctx = R.ctx;
  const hs = d / 2;
  ctx.push(side * (w / 2), y, 0, (side * Math.PI) / 2);
  R.get(mat).prism([[-hs, 0], [hs, 0], [0, rise]], -0.12, 0.05, rgb(mat === 'stone' ? TINT.stone : mat === 'plaster' ? TINT.plaster : TINT.wood), { jit: 0.06, amp: 0.1 });
  ctx.pop();
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
  R.planks.lathe([r * 0.82, 0, r, 0.32 * s, r * 1.06, 0.62 * s, r, 0.92 * s, r * 0.84, 1.0 * s], 10, x, y, z, jitterTone(TINT.wood, rnd, 0.16), { jit: 0.1 });
  for (const hy of [0.16, 0.5, 0.84]) R.metal.lathe([r * (0.86 + hy * 0.18) + 0.01, hy * s, r * (0.86 + hy * 0.18) + 0.03, (hy + 0.05) * s], 10, x, y, z, TINT.iron, { jit: 0.05 });
}

export function crate(R: Region, rnd: Rnd, x: number, y: number, z: number, w = 0.7, h = 0.5, d = 0.55, yaw = 0) {
  R.planks.box(w, h, d, x, y, z, jitterTone(TINT.wood, rnd, 0.18), { ry: yaw, jit: 0.14, grain: 'x' });
  for (const s of [-1, 1]) R.timber.box(0.06, h + 0.02, d + 0.02, x + Math.cos(yaw) * s * (w / 2), y - 0.01, z - Math.sin(yaw) * s * (w / 2), jitterTone(TINT.woodDark, rnd, 0.1), { ry: yaw, jit: 0.08 });
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
