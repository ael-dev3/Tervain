import * as THREE from 'three';
import type { BuildingSpec } from '../world/layout';
import { ARCHIVE_ROOM, LIGHTHOUSE } from '../world/layout';
import { mulberry32 } from '../world/noise';
import type { Terrain } from '../world/terrain';
import { hash3, mulc, rgb } from './buildKit';
import type { Region } from './regions';
import {
  TINT,
  chimney,
  crate,
  barrel,
  door,
  fieldstone,
  foundation,
  jitterTone,
  lantern,
  plankFace,
  post,
  quoins,
  roofFor,
  roofWallInfill,
  sack,
  slab,
  timberFrame,
  windowAt,
  woodpile,
  type RoofKind,
  type Rnd,
} from './structures';

/** Ground under a footprint: the average height and the lowest corner, so the foundation always reaches the earth. */
export function groundOf(terrain: Terrain, b: { x: number; z: number; w: number; d: number; yaw: number }) {
  let lo = Infinity;
  let hi = -Infinity;
  let sum = 0;
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]] as const) {
    const lx = (sx * b.w) / 2;
    const lz = (sz * b.d) / 2;
    const h = terrain.heightAt(b.x + lx * c + lz * s, b.z - lx * s + lz * c);
    lo = Math.min(lo, h);
    hi = Math.max(hi, h);
    sum += h;
  }
  return { avg: sum / 5, lo, hi };
}

export interface BuildOut {
  /** World-space positions of lanterns (they get real light at night when the player is near). */
  lanterns: THREE.Vector3[];
}

const roofStyleOf = (b: BuildingSpec): RoofKind => {
  switch (b.kind) {
    case 'shrine':
    case 'archive':
    case 'keeper':
    case 'hut':
      return 'slate';
    case 'house':
    case 'fisher':
      return b.id.endsWith('_a') || b.id.endsWith('_c') || b.id.endsWith('_e') || b.kind === 'fisher' ? 'thatch' : 'shingle';
    case 'bakery':
    case 'inn':
    case 'reeve':
      return 'tile';
    default:
      return 'shingle';
  }
};

const wallMat = (b: BuildingSpec) => (b.wall === 'stone' ? 'stone' : b.wall === 'timber' ? 'planks' : 'plaster');

/** Any ordinary building: foundation, walls in the chosen material, sagging roof, door, windows, chimney, and the clutter of use. */
export function buildStandard(R: Region, terrain: Terrain, b: BuildingSpec, out: BuildOut) {
  const { avg, lo } = groundOf(terrain, b);
  const rnd: Rnd = mulberry32(Math.floor(hash3(b.x, b.z, 17) * 1e9));
  const ctx = R.ctx;
  ctx.push(b.x, avg, b.z, b.yaw);
  const sink = avg - lo + 0.4;
  const plinth = 0.42;
  const wallH = b.h;
  const y0 = plinth - 0.02;
  foundation(R, rnd, b.w, b.d, plinth, sink);
  // Dark core behind everything, so gaps between boards and around windows show shadow instead of daylight.
  R.vc.bx(-b.w / 2 + 0.04, y0 - 0.1, -b.d / 2 + 0.04, b.w / 2 - 0.04, y0 + wallH, b.d / 2 - 0.04, 0x1a140e, { jit: 0, amp: 0 });

  if (b.wall === 'timber') {
    const faces: [number, number, number, number][] = [[0, b.d / 2, 0, b.w], [0, -b.d / 2, Math.PI, b.w], [b.w / 2, 0, Math.PI / 2, b.d], [-b.w / 2, 0, -Math.PI / 2, b.d]];
    for (const [fx, fz, yaw, len] of faces) {
      ctx.push(fx, 0, fz, yaw);
      plankFace(R, rnd, len, wallH, y0, TINT.wood);
      ctx.pop();
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(R.timber, rnd, sx * (b.w / 2 + 0.02), sz * (b.d / 2 + 0.02), y0 + wallH + 0.15, 0.24, jitterTone(TINT.woodDark, rnd, 0.1), 0.2);
    // A rough rail along the eave line and another at waist height.
    for (const y of [y0 + wallH - 0.08, y0 + wallH * 0.42]) for (const sz of [-1, 1]) R.timber.bx(-b.w / 2 - 0.04, y, sz * (b.d / 2 + 0.06) - 0.06, b.w / 2 + 0.04, y + 0.14, sz * (b.d / 2 + 0.06) + 0.06, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'x', jit: 0.1 });
    for (const y of [y0 + wallH - 0.08, y0 + wallH * 0.42]) for (const sx of [-1, 1]) R.timber.bx(sx * (b.w / 2 + 0.06) - 0.06, y, -b.d / 2 - 0.04, sx * (b.w / 2 + 0.06) + 0.06, y + 0.14, b.d / 2 + 0.04, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'z', jit: 0.1 });
  } else if (b.wall === 'plaster') {
    slab(R.plaster, b.w, wallH, b.d, y0, jitterTone(TINT.plaster, rnd, 0.06));
    timberFrame(R, rnd, b.w, b.d, wallH, y0);
  } else {
    slab(R.stone, b.w, wallH, b.d, y0, jitterTone(TINT.stone, rnd, 0.05), 0.9);
    quoins(R, rnd, b.w, b.d, wallH, y0);
  }

  // Roof.
  const style = roofStyleOf(b);
  const roof = roofFor(R, b.roof, style, b.w, b.d, y0 + wallH, Math.floor(hash3(b.x, b.z, 5) * 1000), { pitch: b.roof === 'lean' ? 0.3 : style === 'thatch' ? 0.82 : undefined });
  roofWallInfill(R, b.roof, b.w, b.d, y0 + wallH, roof, wallMat(b));
  if (b.wall !== 'stone' && b.roof === 'gable') {
    const eaveY = roof.ridgeY - b.d / 2 * Math.tan(roof.pitch) - 0.04;
    for (const sx of [-1, 1]) {
      const x = sx * (b.w / 2 + 0.13);
      R.timber.box(0.14, roof.ridgeY - y0 - wallH, 0.14, x, y0 + wallH, 0, jitterTone(TINT.woodDark, rnd), { grain: 'y', jit: 0.04 });
      for (const sz of [-1, 1]) R.timber.rod(x, eaveY, sz * b.d / 2, x, roof.ridgeY - 0.06, 0, 0.05, 4, jitterTone(TINT.woodDark, rnd));
    }
  }
  // Ridge sag: a beam under the ridge that visibly dips.
  if (b.roof === 'gable') R.timber.bx(-b.w / 2 - 0.2, roof.ridgeY - 0.35, -0.08, b.w / 2 + 0.2, roof.ridgeY - 0.2, 0.08, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });

  // Door and windows.
  const doorX = (rnd() - 0.5) * b.w * 0.2;
  door(R, rnd, { x: doorX, y: y0, z: b.d / 2 + 0.03 });
  for (const side of [-1, 1]) {
    const wx = side * Math.min(b.w * 0.32, b.w / 2 - 0.75);
    if (Math.abs(wx - doorX) >= 1.25) windowAt(R, rnd, { x: wx, y: y0 + wallH * 0.45, z: b.d / 2 + 0.02, shutters: true });
  }
  windowAt(R, rnd, { x: b.w / 2 + 0.02, y: y0 + wallH * 0.45, z: (rnd() - 0.5) * b.d * 0.4, ry: Math.PI / 2 });
  windowAt(R, rnd, { x: -b.w / 2 - 0.02, y: y0 + wallH * 0.45, z: (rnd() - 0.5) * b.d * 0.4, ry: -Math.PI / 2 });
  for (const side of [-1, 1]) windowAt(R, rnd, { x: side * b.w * 0.24, y: y0 + wallH * 0.45, z: -b.d / 2 - 0.02, ry: Math.PI });

  // Chimney.
  if (b.kind !== 'lodge' && b.kind !== 'office' && b.kind !== 'bunks' && b.kind !== 'store') chimney(R, rnd, b.w * 0.28, -b.d * 0.12, y0 + wallH - 0.5, roof.rise + 1.6);

  // Lantern and the small litter of a used doorway.
  const lp = ctx.toWorld(doorX + 0.95, y0 + 2.2, b.d / 2 + 0.35);
  out.lanterns.push(lp.clone());
  lantern(R, doorX + 0.95, y0 + 2.4, b.d / 2 + 0.15);
  if (b.kind === 'house' || b.kind === 'reeve' || b.kind === 'inn') woodpile(R, rnd, b.w / 2 - 0.8, b.d / 2 + 0.55, (rnd() - 0.5) * 0.3, 1.5, 4);
  if (b.kind === 'house') {
    barrel(R, rnd, -b.w / 2 + 0.7, 0, b.d / 2 + 0.7, 1);
    sack(R, rnd, -b.w / 2 + 1.5, 0, b.d / 2 + 0.6, 1);
  }
  if (b.kind === 'store' || b.kind === 'bunks' || b.kind === 'office') {
    crate(R, rnd, b.w / 2 - 0.9, 0, b.d / 2 + 0.7, 0.8, 0.55, 0.6, 0.2);
    crate(R, rnd, b.w / 2 - 1.5, 0, b.d / 2 + 0.75, 0.6, 0.45, 0.5, -0.3);
    barrel(R, rnd, -b.w / 2 + 0.7, 0, b.d / 2 + 0.6, 0.9);
  }
  if (b.kind === 'inn') {
    // Hanging sign on an iron bracket, and benches outside.
    R.metal.box(0.08, 0.08, 1.3, b.w / 2 - 0.6, y0 + 2.6, b.d / 2 + 0.7, TINT.iron, { jit: 0.05 });
    R.planks.box(0.9, 0.55, 0.06, b.w / 2 - 0.6, y0 + 1.95, b.d / 2 + 1.3, jitterTone(TINT.wood, rnd, 0.1), { rz: 0.05, jit: 0.1, grain: 'x' });
    R.vc.box(0.5, 0.3, 0.02, b.w / 2 - 0.6, y0 + 2.08, b.d / 2 + 1.34, 0x5a2a20, { jit: 0.1 });
  }
  if (b.kind === 'bakery') {
    // A bread oven built against the side wall: stone body, domed top, dark mouth.
    R.stone.box(1.6, 0.9, 1.4, b.w / 2 + 0.9, 0, -0.4, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
    R.stone.blob(0.85, 0.5, 0.72, b.w / 2 + 0.9, 0.85, -0.4, jitterTone(TINT.stone, rnd, 0.1), { seg: 9, rings: 4, lump: 0.1, seed: 4, smooth: true });
    R.vc.box(0.46, 0.34, 0.06, b.w / 2 + 0.9, 0.38, 0.33, 0x0c0a08, { jit: 0 });
  }
  ctx.pop();
}

/** The archive has a real interior: closed wall/roof joints, backed foundations and measured openings for its moving leaves. */
export function buildArchiveShell(R: Region, terrain: Terrain, b: BuildingSpec): number {
  const { avg, lo } = groundOf(terrain, b);
  const rnd = mulberry32(4403);
  const hw = b.w / 2;
  const hd = b.d / 2;
  const { wallBase, wallThickness: t, floorBase, floorTop, doorHalfWidth: gap, doorHeight, shutterHalfWidth: sw, shutterBottom, shutterTop, roofPitch } = ARCHIVE_ROOM;
  const top = wallBase + b.h;
  const seg = (x0: number, x1: number, z0: number, z1: number, y0: number = wallBase, y1: number = top) => R.stone.bx(x0, y0, z0, x1, y1, z1, jitterTone(TINT.stone, rnd, 0.05), { sub: 0.8, amp: 0.1 });
  R.ctx.push(b.x, avg, b.z, b.yaw);
  foundation(R, rnd, b.w + t * 2, b.d + t * 2, floorBase, avg - lo + 0.35);
  seg(-hw, -gap, hd - t, hd + t);
  seg(gap, hw, hd - t, hd + t);
  seg(-gap, gap, hd - t, hd + t, wallBase + doorHeight);
  seg(-hw, -sw, -hd - t, -hd + t);
  seg(sw, hw, -hd - t, -hd + t);
  seg(-sw, sw, -hd - t, -hd + t, wallBase, shutterBottom);
  seg(-sw, sw, -hd - t, -hd + t, shutterTop);
  seg(-hw - t, -hw + t, -hd, hd);
  seg(hw - t, hw + t, -hd, hd);
  R.planks.bx(-hw + t - 0.08, floorBase, -hd + t - 0.08, hw - t + 0.08, floorTop, hd - t + 0.08, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.1, grain: 'x' });
  // Floor reaches the front threshold; the rear opening retains its climbable stone sill.
  R.stone.box(gap * 2 + 0.2, floorTop + 0.08, 0.95, 0, -0.08, hd + 0.08, jitterTone(TINT.stoneDark, rnd), { jit: 0.04 });
  const roof = roofFor(R, 'gable', 'slate', b.w, b.d, top, 61, { pitch: roofPitch });
  roofWallInfill(R, 'gable', b.w, b.d, top, roof, 'stone', t * 2);
  for (const sx of [-1, 1]) {
    R.timber.box(0.14, doorHeight + 0.12, 0.12, sx * (gap + 0.06), wallBase - 0.02, hd + t + 0.01, jitterTone(TINT.woodDark, rnd), { grain: 'y', jit: 0.04 });
    R.timber.box(0.12, shutterTop - shutterBottom + 0.14, 0.13, sx * (sw + 0.06), shutterBottom - 0.07, -hd - t - 0.01, jitterTone(TINT.woodDark, rnd), { grain: 'y', jit: 0.04 });
  }
  R.timber.box(gap * 2 + 0.28, 0.14, 0.12, 0, wallBase + doorHeight - 0.04, hd + t + 0.01, jitterTone(TINT.woodDark, rnd), { grain: 'x', jit: 0.04 });
  for (const y of [shutterBottom - 0.08, shutterTop - 0.04]) R.timber.box(sw * 2 + 0.24, 0.12, 0.13, 0, y, -hd - t - 0.01, jitterTone(TINT.woodDark, rnd), { grain: 'x', jit: 0.04 });
  R.ctx.pop();
  return avg;
}

/** The lighthouse: a stone shaft on the rock of Lantern Point, banded and stained, a corbelled gallery, a lantern room and a dark cap. */
export function buildLighthouse(R: Region, terrain: Terrain, out: BuildOut): { lampY: number; lampWorld: THREE.Vector3; base: number } {
  const { x, z, r, h } = LIGHTHOUSE;
  const base = terrain.heightAt(x, z);
  const rnd: Rnd = mulberry32(90210);
  const ctx = R.ctx;
  ctx.push(x, base, z, 0);
  // Rock skirt: big boulders round the foot, half sunk.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rnd() * 0.3;
    const rr = r + 0.7 + rnd() * 0.8;
    fieldstone(R, rnd, Math.cos(a) * rr, -0.5, Math.sin(a) * rr, 0.9 + rnd() * 0.9, 0.7 + rnd() * 0.7, 0.9 + rnd() * 0.9);
  }
  // Shaft: stone below, faded whitewash above. Radius tapers with a slight swell (entasis).
  const N = 24;
  const stoneProfile: number[] = [];
  const whiteProfile: number[] = [];
  const sh = h - 1.2;
  const rad = (t: number) => r * (1 - 0.24 * t) * (1 + 0.025 * Math.sin(Math.PI * t));
  const split = 0.5;
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * split;
    stoneProfile.push(rad(t) + (i === 0 ? 0.25 : 0), t * sh - (i === 0 ? 0.4 : 0));
  }
  for (let i = 0; i <= 8; i++) {
    const t = split + (i / 8) * (1 - split);
    whiteProfile.push(rad(t) + 0.03, t * sh);
  }
  R.stone.lathe(stoneProfile, N, 0, 0, 0, jitterTone(TINT.stone, rnd, 0.04), { jit: 0.02, amp: 0.1, vs: 1 });
  R.plaster.lathe(whiteProfile, N, 0, 0, 0, mulc(jitterTone(TINT.plaster, rnd, 0.04), 1.7), { jit: 0.02, amp: 0.12, vs: 1 });
  // Bands and stains: rough stone belts at intervals; dark streaks running down from the gallery.
  for (const t of [0.22, 0.5, 0.78]) {
    const y = t * sh;
    R.stone.lathe([rad(t) + 0.06, y - 0.12, rad(t) + 0.13, y, rad(t) + 0.06, y + 0.12], N, 0, 0, 0, jitterTone(TINT.stoneDark, rnd, 0.08), { jit: 0.05 });
  }
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const t = 0.7 + rnd() * 0.3;
    const rr = rad(t) + 0.04;
    const len = 1.5 + rnd() * 4;
    R.vc.box(0.2 + rnd() * 0.3, len, 0.03, Math.cos(a) * rr, t * sh - len, Math.sin(a) * rr, 0x241d16, { ry: -a + Math.PI / 2, jit: 0.2, amp: 0 });
  }
  // Door at the south foot: arched stone frame, plank leaf.
  ctx.push(0, 0, r - 0.05, 0);
  R.stone.box(0.34, 2.6, 0.5, -0.86, -0.1, 0.1, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
  R.stone.box(0.34, 2.6, 0.5, 0.86, -0.1, 0.1, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
  R.stone.box(2.06, 0.42, 0.5, 0, 2.35, 0.1, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
  for (let i = 0; i < 7; i++) R.planks.box(0.23, 2.3 + (rnd() - 0.5) * 0.04, 0.07, -0.84 + i * 0.28, 0, 0.16, jitterTone(TINT.woodPale, rnd, 0.18), { jit: 0.14, grain: 'y' });
  for (const yy of [0.5, 1.6]) R.metal.box(1.7, 0.1, 0.04, 0, yy, 0.21, TINT.iron, { jit: 0.05 });
  R.stone.box(2.6, 0.2, 1.3, 0, -0.1, 0.9, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
  ctx.pop();
  // Slit windows spiralling up the shaft.
  for (let i = 0; i < 5; i++) {
    const t = 0.16 + i * 0.16;
    const a = Math.PI / 2 + i * 1.9;
    const rr = rad(t);
    ctx.push(Math.cos(a) * rr, t * sh, Math.sin(a) * rr, -a + Math.PI / 2);
    R.vc.box(0.22, 0.9, 0.12, 0, 0, -0.06, 0x0a0806, { jit: 0 });
    R.stone.box(0.5, 0.16, 0.22, 0, -0.08, 0.02, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
    R.stone.box(0.5, 0.16, 0.22, 0, 0.86, 0.02, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
    ctx.pop();
  }
  // Gallery: a corbelled ring, a plank deck and an iron rail.
  const gy = sh;
  const gr = rad(1) + 0.95;
  R.stone.lathe([rad(1) + 0.03, gy - 0.7, rad(1) + 0.55, gy - 0.4, gr, gy - 0.15, gr, gy + 0.05, rad(1) + 0.4, gy + 0.05], N, 0, 0, 0, jitterTone(TINT.stoneDark, rnd, 0.06), { jit: 0.04 });
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rr = gr - 0.05;
    R.metal.box(0.06, 1.05, 0.06, Math.cos(a) * rr, gy + 0.05, Math.sin(a) * rr, TINT.iron, { jit: 0.1, rx: (rnd() - 0.5) * 0.03 });
  }
  const railPts: [number, number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    railPts.push([Math.cos(a) * (gr - 0.05), gy + 1.05, Math.sin(a) * (gr - 0.05)]);
  }
  R.metal.tube(railPts, 0.03, 4, TINT.iron);
  const railPts2 = railPts.map((p): [number, number, number] => [p[0], gy + 0.55, p[2]]);
  R.metal.tube(railPts2, 0.02, 4, TINT.iron);
  // Lantern room: eight posts, dark glass between them, a glowing lamp and a lead-dark cap.
  const lr = rad(1) + 0.15;
  const ly = gy + 0.05;
  const lh = 2.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    R.metal.box(0.14, lh, 0.14, Math.cos(a) * lr, ly, Math.sin(a) * lr, TINT.iron, { jit: 0.06 });
    const a2 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    const mx = (Math.cos(a) + Math.cos(a2)) * 0.5 * lr;
    const mz = (Math.sin(a) + Math.sin(a2)) * 0.5 * lr;
    ctx.push(mx, ly + 0.15, mz, -(a + a2) / 2 + Math.PI / 2);
    R.pane.box(lr * 0.72, lh - 0.3, 0.05, 0, 0, 0, 0xffffff, { jit: 0 });
    R.metal.box(lr * 0.72, 0.05, 0.08, 0, (lh - 0.3) * 0.5, 0, TINT.iron, { jit: 0.05 });
    ctx.pop();
  }
  R.metal.lathe([lr + 0.1, ly + lh, lr * 0.4, ly + lh + 0.2, lr * 0.32, ly + lh + 0.8, 0.12, ly + lh + 1.05, 0.04, ly + lh + 1.5], 16, 0, 0, 0, jitterTone(0x8a8a86, rnd, 0.05), { jit: 0.04 });
  R.metal.box(0.03, 0.03, 0.9, 0, ly + lh + 1.5, 0, TINT.iron, { jit: 0.05 });
  R.metal.box(0.9, 0.03, 0.03, 0, ly + lh + 1.5, 0, TINT.iron, { jit: 0.05 });
  R.glow.lathe([0.05, ly + 0.6, 0.34, ly + 1.15, 0.28, ly + 1.55, 0.05, ly + 1.9], 10, 0, 0, 0, 0xffffff, { jit: 0 });
  R.metal.cyl(0.08, 0.1, 0.6, 6, 0, ly, 0, TINT.iron, { jit: 0.05 });
  const lampWorld = ctx.toWorld(0, ly + 1.3, 0);
  out.lanterns.push(ctx.toWorld(0, ly + 1.3, r + 1));
  ctx.pop();
  void terrain;
  return { lampY: base + ly + 1.3, lampWorld, base };
}

/** A cairn of stones: beach markers and trail cairns, each rock leaning on the last. */
export function cairn(R: Region, rnd: Rnd, x: number, y: number, z: number, n = 5) {
  let h = 0;
  for (let i = 0; i < n; i++) {
    const s = 0.34 * (1 - i * 0.14);
    R.stone.blob(s * (1 + rnd() * 0.3), s * 0.55, s * (1 + rnd() * 0.3), x + (rnd() - 0.5) * 0.08, y + h + s * 0.4, z + (rnd() - 0.5) * 0.08, jitterTone(TINT.stone, rnd, 0.2), { seg: 7, rings: 4, lump: 0.16, seed: i + Math.floor(x * 7), smooth: true });
    h += s * 0.9;
  }
}

export { mulc, rgb };
