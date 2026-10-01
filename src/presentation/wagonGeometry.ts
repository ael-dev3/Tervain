import type { Region } from './regions';
import { TINT, jitterTone, type Rnd } from './structures';

export interface VehicleConstruction {
  length: number;
  width: number;
  wheelRadius: number;
  wheelTrack: number;
  axleXs: readonly number[];
  bedTop: number;
  sideTop: number;
  shaftStart: number;
  shaftEnd: number;
  shaftStartY: number;
  shaftEndY: number;
  shaftZ: number;
}

/** An open, iron-shod felloe with spokes meeting a solid hub. Its axle runs along local z. */
export function spokedWheel(R: Region, rnd: Rnd, x: number, y: number, z: number, radius: number, spokes = 10) {
  const rimDepth = radius * 0.19;
  const rimInner = radius * 0.81;
  const hubRadius = radius * 0.19;
  R.ctx.push(x, y, z, 0, Math.PI / 2);
  // Closed annular profiles retain the central opening. A solid cylinder or a three-point lathe makes a disc.
  R.timber.lathe([
    rimInner, -rimDepth / 2, radius * 0.98, -rimDepth / 2,
    radius * 0.98, rimDepth / 2, rimInner, rimDepth / 2, rimInner, -rimDepth / 2,
  ], 20, 0, 0, 0, jitterTone(TINT.woodDark, rnd, 0.08), { jit: 0.035 });
  R.metal.lathe([
    radius * 0.976, -rimDepth * 0.55, radius, -rimDepth * 0.55,
    radius, rimDepth * 0.55, radius * 0.976, rimDepth * 0.55, radius * 0.976, -rimDepth * 0.55,
  ], 20, 0, 0, 0, TINT.iron, { jit: 0.025 });
  for (let i = 0; i < spokes; i++) {
    const a = i * Math.PI * 2 / spokes;
    const ca = Math.cos(a), sa = Math.sin(a);
    R.timber.rod(ca * hubRadius * 0.7, 0, sa * hubRadius * 0.7, ca * radius * 0.9, 0, sa * radius * 0.9, radius * 0.052, 4, jitterTone(TINT.woodPale, rnd, 0.12), { jit: 0.025 });
    // Iron nails at the joined felloe segments, rather than floating ornament.
    R.metal.cyl(radius * 0.019, radius * 0.019, 0.018, 5, ca * radius * 0.9, rimDepth / 2, sa * radius * 0.9, TINT.iron, { jit: 0 });
  }
  R.timber.cyl(hubRadius, hubRadius * 1.12, rimDepth * 2.3, 10, 0, -rimDepth * 1.15, 0, jitterTone(TINT.woodDark, rnd, 0.06), { jit: 0.02 });
  for (const side of [-1, 1]) {
    R.metal.cyl(hubRadius * 0.83, hubRadius * 0.83, 0.035, 10, 0, side * rimDepth * 1.12 - 0.017, 0, TINT.iron, { jit: 0 });
  }
  // The projecting axle pin remains part of the hub, on both sides of the wheel.
  R.metal.cyl(hubRadius * 0.4, hubRadius * 0.4, rimDepth * 3, 8, 0, -rimDepth * 1.5, 0, TINT.iron, { jit: 0 });
  R.ctx.pop();
}

/** Construction common to a handcart and four-wheel freight wagon. Every member bears on the next one. */
export function vehicleFrame(R: Region, rnd: Rnd, v: VehicleConstruction) {
  const axleY = v.wheelRadius;
  const bottom = v.bedTop - 0.14;
  const frameY = bottom - 0.19;
  const wood = () => jitterTone(TINT.wood, rnd, 0.12);
  const dark = () => jitterTone(TINT.woodDark, rnd, 0.09);
  // Longitudinal chassis rails and broad bolsters transfer the bed's weight to each axle.
  for (const side of [-1, 1]) R.timber.box(v.length - 0.1, 0.22, 0.18, 0, frameY, side * v.width * 0.36, dark(), { grain: 'x', jit: 0.025 });
  for (const ax of v.axleXs) {
    R.timber.rod(ax, axleY, -v.wheelTrack - 0.16, ax, axleY, v.wheelTrack + 0.16, 0.105 * v.wheelRadius / 0.74, 8, dark(), { jit: 0.025 });
    R.timber.box(0.25, 0.2, v.width + 0.12, ax, axleY + 0.04, 0, dark(), { grain: 'z', jit: 0.025 });
    for (const side of [-1, 1]) {
      spokedWheel(R, rnd, ax, axleY, side * v.wheelTrack, v.wheelRadius, v.axleXs.length > 1 ? 10 : 8);
      R.metal.box(0.12, bottom - axleY + 0.03, 0.22, ax, axleY - 0.015, side * v.width * 0.36, TINT.iron, { jit: 0.02 });
    }
  }
  // A separate board per strip makes the bed and grain readable without needing a dense mesh.
  // A continuous head beneath the board seams also seals floating-point gaps at touching strip edges.
  R.planks.box(v.length, 0.022, v.width, 0, v.bedTop - 0.022, 0, wood(), { grain: 'x', jit: 0.01 });
  const boards = Math.ceil(v.width / 0.24);
  for (let i = 0; i < boards; i++) {
    R.planks.box(v.length, 0.14, v.width / boards, 0, bottom, -v.width / 2 + (i + 0.5) * v.width / boards, wood(), { grain: 'x', jit: 0.022 });
  }
  const courses = Math.ceil((v.sideTop - v.bedTop) / 0.23);
  const courseH = (v.sideTop - v.bedTop) / courses;
  for (const side of [-1, 1]) {
    for (let i = 0; i < courses; i++) R.planks.box(v.length, courseH * 0.97, 0.075, 0, v.bedTop + i * courseH, side * v.width / 2, wood(), { grain: 'x', jit: 0.018 });
    const posts = v.axleXs.length > 1 ? 5 : 3;
    for (let i = 0; i < posts; i++) {
      const px = -v.length / 2 + 0.06 + i * (v.length - 0.12) / (posts - 1);
      R.timber.box(0.11, v.sideTop - frameY + 0.09, 0.12, px, frameY, side * (v.width / 2 + 0.02), dark(), { grain: 'y', jit: 0.02 });
      for (const yy of [v.bedTop + 0.08, v.sideTop - 0.1]) R.metal.box(0.065, 0.065, 0.025, px, yy, side * (v.width / 2 + 0.085), TINT.iron, { jit: 0 });
    }
    R.timber.box(v.length + 0.1, 0.09, 0.13, 0, v.sideTop, side * v.width / 2, dark(), { grain: 'x', jit: 0.02 });
  }
  // Closed headboard and lower hinged tailboard; all four corners are connected.
  for (const end of [-1, 1]) {
    for (let i = 0; i < courses; i++) R.planks.box(0.075, courseH * 0.97, v.width, end * (v.length / 2 - 0.04), v.bedTop + i * courseH, 0, wood(), { grain: 'z', jit: 0.018 });
    for (const side of [-1, 1]) R.metal.box(0.025, 0.32, 0.12, end * v.length / 2, v.bedTop + 0.02, side * v.width * 0.34, TINT.iron, { jit: 0.02 });
  }
  // Shafts begin under the front bolster, extend through the chassis and rest on the ground.
  for (const side of [-1, 1]) {
    const sx = v.shaftStart, ex = v.shaftEnd;
    R.timber.rod(sx, v.shaftStartY, side * v.shaftZ, ex, v.shaftEndY, side * v.shaftZ * 0.78, 0.07, 5, dark(), { rEnd: 0.045, jit: 0.025 });
    R.metal.box(0.28, 0.045, 0.16, sx + 0.08, v.shaftStartY + 0.04, side * v.shaftZ, TINT.iron, { jit: 0.02 });
  }
  R.timber.rod(v.shaftEnd - 0.24, v.shaftEndY + 0.04, -v.shaftZ * 0.78, v.shaftEnd - 0.24, v.shaftEndY + 0.04, v.shaftZ * 0.78, 0.045, 5, dark(), { jit: 0.02 });
}
