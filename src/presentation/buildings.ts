import * as THREE from 'three';
import type { BuildingSpec } from '../world/layout';
import { ARCHIVE_ROOM } from '../world/layout';
import { mulberry32 } from '../world/noise';
import { buildingEntry, buildingGround } from '../world/buildingEntries';
import type { Terrain } from '../world/terrain';
import { hash3, mulc, rgb } from './buildKit';
import type { Region } from './regions';
import { authorLighthouse } from './lighthouse';
import {
  TINT,
  chimney,
  crate,
  barrel,
  door,
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
  return buildingGround((x, z) => terrain.heightAt(x, z), b);
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

/** Exterior cargo rests on its own terrain footprint, independently of the building's level foundation frame.
 * Sink the lowest point slightly through the lowest local ground sample so the downhill edge never hovers.
 * Moving only the newly authored vertices preserves the shell, doorsteps, shapes and decorative RNG sequence.
 */
function groundExteriorProp(R: Region, terrain: Terrain, author: () => void) {
  const starts = new Map([...R.batches].map(([key, batch]) => [key, batch.p.n]));
  author();
  let bottom = Infinity, lowestGround = Infinity;
  for (const [key, batch] of R.batches) {
    for (let i = starts.get(key) ?? 0; i < batch.p.n; i += 3) {
      bottom = Math.min(bottom, batch.p.a[i + 1]!);
      lowestGround = Math.min(lowestGround, terrain.heightAt(batch.p.a[i]!, batch.p.a[i + 2]!));
    }
  }
  if (!Number.isFinite(bottom + lowestGround)) return;
  const shift = lowestGround - bottom - 0.02;
  for (const [key, batch] of R.batches) {
    for (let i = (starts.get(key) ?? 0) + 1; i < batch.p.n; i += 3) batch.p.a[i]! += shift;
  }
}

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
  // Short knee braces carry the eaves into existing wall posts; all remain inside the established
  // wall/eave envelope. Local deterministic hashes do not perturb the cargo or window RNG stream.
  const structureTint = mulc(rgb(TINT.woodDark), 1.65);
  if (b.wall !== 'stone') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const bx = sx * (b.w / 2 + 0.06), bz = sz * (b.d / 2 + 0.055);
      R.timber.rod(bx, y0 + wallH - 0.67, bz, bx - sx * 0.52, y0 + wallH - 0.07, bz,
        0.082, 4, structureTint, { jit: 0.025, amp: 0.025 });
      R.timber.box(0.046, 0.046, 0.028, bx - sx * 0.43, y0 + wallH - 0.145, bz + sz * 0.09,
        structureTint, { jit: 0, amp: 0 });
    }
  }
  if (b.wall !== 'stone' && b.roof === 'gable') {
    const slope = Math.tan(roof.pitch);
    for (const sx of [-1, 1]) for (const fraction of [-0.55, 0.55]) {
      const x = sx * (b.w / 2 + 0.13), z = fraction * b.d / 2;
      const lower = y0 + wallH - 0.02, upper = roof.ridgeY - Math.abs(z) * slope - 0.13;
      if (upper > lower) R.timber.box(0.11, upper - lower, 0.11, x, lower, z,
        structureTint, { grain: 'y', jit: 0.025, amp: 0.025 });
    }
  }
  // Ridge sag: a beam under the ridge that visibly dips.
  if (b.roof === 'gable') R.timber.bx(-b.w / 2 - 0.2, roof.ridgeY - 0.35, -0.08, b.w / 2 + 0.2, roof.ridgeY - 0.2, 0.08, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });

  // Door and windows.
  const doorX = buildingEntry(b).x;
  rnd(); // Retain the existing decorative RNG sequence after the now-shared, authored door position.
  door(R, rnd, { x: doorX, y: y0, z: b.d / 2 + 0.03, stone: b.wall === 'stone' });
  for (const side of [-1, 1]) {
    const wx = side * Math.min(b.w * 0.32, b.w / 2 - 0.75);
    if (Math.abs(wx - doorX) >= 1.25) windowAt(R, rnd, { x: wx, y: y0 + wallH * 0.45, z: b.d / 2 + 0.02, shutters: true, stone: b.wall === 'stone' });
  }
  windowAt(R, rnd, { x: b.w / 2 + 0.02, y: y0 + wallH * 0.45, z: (rnd() - 0.5) * b.d * 0.4, ry: Math.PI / 2, stone: b.wall === 'stone' });
  windowAt(R, rnd, { x: -b.w / 2 - 0.02, y: y0 + wallH * 0.45, z: (rnd() - 0.5) * b.d * 0.4, ry: -Math.PI / 2, stone: b.wall === 'stone' });
  for (const side of [-1, 1]) windowAt(R, rnd, { x: side * b.w * 0.24, y: y0 + wallH * 0.45, z: -b.d / 2 - 0.02, ry: Math.PI, stone: b.wall === 'stone' });

  // Chimney.
  if (b.kind !== 'lodge' && b.kind !== 'office' && b.kind !== 'bunks' && b.kind !== 'store') chimney(R, rnd, b.w * 0.28, -b.d * 0.12, y0 + wallH - 0.5, roof.rise + 1.6);

  // Lantern and the small litter of a used doorway.
  const lp = ctx.toWorld(doorX + 0.95, y0 + 2.2, b.d / 2 + 0.35);
  out.lanterns.push(lp.clone());
  lantern(R, doorX + 0.95, y0 + 2.4, b.d / 2 + 0.15);
  if (b.kind === 'house' || b.kind === 'reeve' || b.kind === 'inn') groundExteriorProp(R, terrain, () => woodpile(R, rnd, b.w / 2 - 0.8, b.d / 2 + 0.55, (rnd() - 0.5) * 0.3, 1.5, 4));
  if (b.kind === 'house') {
    groundExteriorProp(R, terrain, () => barrel(R, rnd, -b.w / 2 + 0.7, 0, b.d / 2 + 0.7, 1));
    groundExteriorProp(R, terrain, () => sack(R, rnd, -b.w / 2 + 1.5, 0, b.d / 2 + 0.6, 1));
  }
  if (b.kind === 'store' || b.kind === 'bunks' || b.kind === 'office') {
    groundExteriorProp(R, terrain, () => crate(R, rnd, b.w / 2 - 0.9, 0, b.d / 2 + 0.7, 0.8, 0.55, 0.6, 0.2));
    groundExteriorProp(R, terrain, () => crate(R, rnd, b.w / 2 - 1.8, 0, b.d / 2 + 0.75, 0.6, 0.45, 0.5, -0.3));
    groundExteriorProp(R, terrain, () => barrel(R, rnd, -b.w / 2 + 0.7, 0, b.d / 2 + 0.6, 0.9));
  }
  if (b.kind === 'inn') {
    // Hanging sign on an iron bracket, and benches outside.
    R.metal.box(0.08, 0.08, 1.3, b.w / 2 - 0.6, y0 + 2.6, b.d / 2 + 0.7, TINT.iron, { jit: 0.05 });
    R.planks.box(0.9, 0.55, 0.06, b.w / 2 - 0.6, y0 + 1.95, b.d / 2 + 1.3, jitterTone(TINT.wood, rnd, 0.1), { rz: 0.05, jit: 0.1, grain: 'x' });
    R.vc.box(0.5, 0.3, 0.02, b.w / 2 - 0.6, y0 + 2.08, b.d / 2 + 1.34, 0x5a2a20, { jit: 0.1 });
  }
  if (b.kind === 'bakery') {
    // A bread oven built against the side wall: stone body, domed top, dark mouth.
    groundExteriorProp(R, terrain, () => {
      R.stone.box(1.6, 0.9, 1.4, b.w / 2 + 0.9, 0, -0.4, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
      R.stone.blob(0.85, 0.5, 0.72, b.w / 2 + 0.9, 0.85, -0.4, jitterTone(TINT.stone, rnd, 0.1), { seg: 9, rings: 4, lump: 0.1, seed: 4, smooth: true });
      R.vc.box(0.46, 0.34, 0.06, b.w / 2 + 0.9, 0.38, 0.33, 0x0c0a08, { jit: 0 });
    });
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

/** The connected keeper compound shares its footprint and stair measurements with world support and collision. */
export function buildLighthouse(R: Region, terrain: Terrain, out: BuildOut): { lampY: number; lampWorld: THREE.Vector3; base: number } {
  return authorLighthouse(R, terrain, out);
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
