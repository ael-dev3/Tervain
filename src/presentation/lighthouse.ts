import * as THREE from 'three';
import { LANTERN_ROUTE, LANTERN_TRAIL_WIDTH, LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION as L } from '../world/layout';
import { LIGHTHOUSE_DOOR_OUTER_WIDTH, LIGHTHOUSE_STAIR_ANGLE, lighthouseTreadTop, lighthouseWallSectors } from '../world/lighthouse';
import { mulberry32 } from '../world/noise';
import type { Terrain } from '../world/terrain';
import type { Batch, Col } from './buildKit';
import type { Region } from './regions';
import type { RoofResult } from './roofs';
import { TINT, chimney, jitterTone, lantern, quoins, roofWallInfill, windowAt, woodpile, type Rnd } from './structures';

type V3 = [number, number, number];
const radial = (r: number, a: number, y: number): V3 => [r * Math.cos(a), y, r * Math.sin(a)];

/** Six closed faces: the stair's underside and risers remain real geometry when seen from the beach. */
export function radialPlank(B: Batch, inner: number, outer: number, a0: number, a1: number, top: number, thickness: number, color: Col) {
  const a = radial(inner, a0, top), b = radial(inner, a1, top);
  const c = radial(outer, a1, top), d = radial(outer, a0, top);
  const lower = (p: V3): V3 => [p[0], p[1] - thickness, p[2]];
  B.quad([...a, ...b, ...c, ...d], color, { amp: 0.025 });
  B.quad([...lower(d), ...lower(c), ...lower(b), ...lower(a)], color, { k: 0.7, amp: 0.025 });
  const points = [a, b, c, d];
  for (let i = 0; i < 4; i++) {
    const p = points[i]!, q = points[(i + 1) % 4]!;
    B.quad([...p, ...lower(p), ...lower(q), ...q], color, { k: 0.86, amp: 0.025 });
  }
}

/** Thick broad roof boards give the keeper's silhouette a rough working-building character, at a modest mesh cost. */
function plankRoof(R: Region, rnd: Rnd, w: number, d: number, wallTop: number, pitch: number, lean = false): RoofResult {
  const width = w + 0.9, span = d / 2 + 0.6;
  const eave = wallTop - 0.06, rise = (lean ? span * 2 : span) * Math.tan(pitch);
  const boards = Math.ceil(width / 0.32), courses = lean ? 1 : 4;
  for (const side of lean ? [1] : [-1, 1]) {
    for (let i = 0; i < boards; i++) {
      const x0 = -width / 2 + i * width / boards, x1 = x0 + width / boards;
      for (let j = 0; j < courses; j++) {
        const f0 = j / courses, f1 = (j + 1) / courses;
        const z0 = side * span * (1 - f0 * (lean ? 2 : 1)), z1 = side * span * (1 - f1 * (lean ? 2 : 1));
        const lift = 0.018 + (rnd() - 0.5) * 0.014;
        const y0 = eave + f0 * rise + lift, y1 = eave + f1 * rise + lift;
        const top: V3[] = side > 0 ? [[x0, y0, z0], [x1, y0, z0], [x1, y1, z1], [x0, y1, z1]] : [[x1, y0, z0], [x0, y0, z0], [x0, y1, z1], [x1, y1, z1]];
        const lower = (p: V3): V3 => [p[0], p[1] - 0.1, p[2]];
        const tint = jitterTone(TINT.wood, rnd, 0.16);
        R.planks.quad(top.flat(), tint, { amp: 0.05, uv: [x0, f0 * span, x1, f0 * span, x1, f1 * span, x0, f1 * span] });
        R.timber.quad(top.map(lower).reverse().flat(), tint, { k: 0.7, amp: 0.04 });
        for (let k = 0; k < 4; k++) {
          const a = top[k]!, b = top[(k + 1) % 4]!;
          R.planks.quad([...a, ...lower(a), ...lower(b), ...b], tint, { k: 0.83, amp: 0.04 });
        }
      }
    }
    // The barge rafters and eave beam physically join the boards to the timber walls.
    R.timber.rod(-width / 2 - 0.02, eave - 0.05, side * span, width / 2 + 0.02, eave - 0.05, side * span, 0.1, 4, jitterTone(TINT.woodDark, rnd, 0.08));
    for (const end of [-1, 1]) R.timber.rod(end * width / 2, eave - 0.02, side * span, end * width / 2, eave + rise - 0.02, lean ? -span : 0, 0.1, 4, jitterTone(TINT.woodDark, rnd, 0.08));
  }
  R.timber.rod(-width / 2 - 0.12, eave + rise + 0.05, lean ? -span : 0, width / 2 + 0.12, eave + rise + 0.05, lean ? -span : 0, 0.13, 6, jitterTone(TINT.woodDark, rnd, 0.08));
  return { rise, ridgeY: eave + rise, halfSpan: span, pitch, slope: (lean ? span * 2 : span) / Math.cos(pitch) };
}

/** An open door is a real hinged leaf beside the opening, with no dark plane sealing the passage. */
function openEntry(R: Region, rnd: Rnd, x: number, z: number, width: number, height: number, floor: number) {
  for (const side of [-1, 1]) R.timber.box(0.18, height + 0.22, 0.24,
    x + side * (width / 2 + 0.09), floor - 0.06, z + 0.04, jitterTone(TINT.woodDark, rnd), { grain: 'y', jit: 0.015 });
  R.timber.box(width + 0.6, 0.22, 0.27, x, floor + height, z + 0.04, jitterTone(TINT.woodDark, rnd), { grain: 'x', jit: 0.015 });
  const hinge = x - width / 2 - 0.1;
  R.ctx.push(hinge, floor, z + 0.15, Math.PI / 2);
  R.planks.box(width - 0.08, height - 0.08, 0.085, -(width - 0.08) / 2, 0, 0, jitterTone(TINT.woodPale, rnd, 0.1), { grain: 'y', jit: 0.02, sub: 0.4 });
  for (const y of [0.4, height - 0.42]) R.metal.box(width - 0.18, 0.09, 0.1, -(width - 0.08) / 2, y, 0, TINT.iron, { jit: 0 });
  R.metal.box(0.075, 0.12, 0.06, -(width - 0.3), height * 0.5, 0.07, TINT.iron, { jit: 0 });
  R.ctx.pop();
  // The old external doorstep remains physically joined to the now open threshold.
  R.stone.box(width + 0.7, L.house.wallBase + 0.16, 0.7, x, -0.08, z + 0.42, jitterTone(TINT.stone, rnd, 0.06), { jit: 0 });
  R.stone.box(width + 0.9, L.house.wallBase * 0.5 + 0.08, 0.5, x, -0.08, z + 0.96, jitterTone(TINT.stoneDark, rnd, 0.06), { jit: 0 });
}

/** Low buried coping stones mark the cut track's edge; the continuous dirt surface stays the terrain itself. */
function keeperTrackEdges(R: Region, terrain: Terrain, rnd: Rnd) {
  for (let segment = 3; segment < LANTERN_ROUTE.length - 2; segment++) {
    const a = LANTERN_ROUTE[segment]!, b = LANTERN_ROUTE[segment + 1]!;
    const length = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
    for (let along = 1.6; along < length - 1; along += 2.5) {
      const side = segment % 2 ? 1 : -1;
      const edge = LANTERN_TRAIL_WIDTH / 2 + 0.38;
      const x = a.x + dx * along - dz * edge * side, z = a.z + dz * along + dx * edge * side;
      // These low stones are embedded into the grade, outside the whole player walking strip.
      R.stone.box(0.65 + rnd() * 0.2, 0.32, 0.3, x, terrain.heightAt(x, z) - 0.18, z,
        jitterTone(TINT.stoneDark, rnd, 0.13), { ry: Math.atan2(-dz, dx), jit: 0.04, amp: 0.1 });
    }
  }
}

/** Closed buried footing with rubble facing below the floor; unlike a closed-house footing it cannot pierce the doorway. */
function keeperFoundation(R: Region, rnd: Rnd, sink: number) {
  const h = L.house, top = h.floorTop - 0.06;
  R.stone.box(h.w - 0.12, sink + top, h.d - 0.12, 0, -sink, 0,
    jitterTone(TINT.stoneDark, rnd, 0.07), { jit: 0, amp: 0.1 });
  for (const side of [-1, 1]) {
    const nx = Math.ceil(h.w / 0.8), nz = Math.ceil(h.d / 0.8);
    for (let i = 0; i < nx; i++) {
      const x = -h.w / 2 + (i + 0.5) * h.w / nx;
      R.stone.box(h.w / nx * 0.98, sink + top, 0.46, x, -sink, side * (h.d / 2 - 0.05),
        jitterTone(TINT.stoneDark, rnd, 0.13), { jit: 0.02, amp: 0.1 });
    }
    for (let i = 0; i < nz; i++) R.stone.box(0.46, sink + top, h.d / nz * 0.98,
      side * (h.w / 2 - 0.05), -sink, -h.d / 2 + (i + 0.5) * h.d / nz,
      jitterTone(TINT.stoneDark, rnd, 0.13), { jit: 0.02, amp: 0.1 });
  }
}

/** Heavy stone tower, connected timber stair and keeper's house. All geometry is original and batched by material. */
export function authorLighthouse(R: Region, terrain: Terrain, out: { lanterns: THREE.Vector3[] }): { lampY: number; lampWorld: THREE.Vector3; base: number } {
  const { x, z, r } = LIGHTHOUSE;
  const base = terrain.heightAt(x, z);
  const rnd = mulberry32(90210);
  const ctx = R.ctx;
  const stone = () => jitterTone(TINT.stone, rnd, 0.11);
  const dark = () => jitterTone(TINT.woodDark, rnd, 0.11);
  keeperTrackEdges(R, terrain, rnd);
  ctx.push(x, base, z);
  // The connected rubble plinth sinks below the lowest local sample instead of perching on boulders.
  let lowest = base;
  for (let sx = -11; sx <= 5; sx += 2) for (let sz = -5; sz <= 5; sz += 2) lowest = Math.min(lowest, terrain.heightAt(x + sx, z + sz));
  const sink = base - lowest + 0.55;
  R.stone.cyl(r + 0.28, r + 0.52, sink + L.house.wallBase, 28, 0, -sink, 0, stone(), { jit: 0.03, amp: 0.12 });
  const radiusAt = (y: number) => r + (L.shaftTopRadius - r) * y / L.shaftTop;
  // Irregular masonry courses silhouette the shaft; texture carries the small stones instead of thousands of boxes.
  // The ground store is hollow, with thick closed masonry walls and a genuine south door gap.
  for (const sector of lighthouseWallSectors()) {
    radialPlank(R.stone, L.room.radius, r + 0.08, sector.a0, sector.a1,
      L.room.floorTop + L.room.doorHeight, L.room.doorHeight, stone());
  }
  for (let i = 0; i < L.room.wallSegments; i++) radialPlank(R.stone, L.room.radius, r + 0.065,
    i * Math.PI * 2 / L.room.wallSegments, (i + 1) * Math.PI * 2 / L.room.wallSegments,
    L.room.ceilingBottom, L.room.ceilingBottom - L.room.floorTop - L.room.doorHeight, stone());
  R.stone.cyl(L.room.radius, L.room.radius, 0.08, 40, 0, L.room.floorTop - 0.08, 0, stone(), { jit: 0, amp: 0.08 });
  R.stone.box(L.room.doorHalfWidth * 2, 0.08, 1.2, 0, L.room.floorTop - 0.08, r - 0.52, stone(), { jit: 0, sub: 0.6 });
  R.stone.cyl(r + 0.065, r + 0.065, 0.22, 40, 0, L.room.ceilingBottom, 0, stone(), { jit: 0, amp: 0.08 });
  const profile: number[] = [radiusAt(L.room.ceilingBottom), L.room.ceilingBottom];
  for (let i = 1; i <= 32; i++) {
    const y = L.room.ceilingBottom + i * (L.shaftTop - L.room.ceilingBottom) / 32;
    profile.push(radiusAt(y) + (i % 4 === 0 ? 0.055 : 0), y);
  }
  R.stone.lathe(profile, 28, 0, 0, 0, stone(), { jit: 0.025, amp: 0.14 });
  R.stone.cyl(L.shaftTopRadius, L.shaftTopRadius, 0.16, 28, 0, L.shaftTop - 0.16, 0, stone(), { jit: 0.02 });
  for (const yy of [3.8, 8.1, 12.4]) {
    const rr = radiusAt(yy);
    R.stone.lathe([rr + 0.02, yy - 0.11, rr + 0.09, yy - 0.06, rr + 0.09, yy + 0.1, rr + 0.02, yy + 0.14], 28, 0, 0, 0, jitterTone(TINT.stoneDark, rnd, 0.08), { jit: 0.02 });
  }
  const towerDoorWidth = LIGHTHOUSE_DOOR_OUTER_WIDTH;
  openEntry(R, rnd, 0, r + 0.015, towerDoorWidth, L.room.doorHeight, L.room.floorTop);
  // A working room with oil barrels and a simple bench gives the entrance a believable purpose.
  R.planks.box(1.75, 0.16, 0.6, 0, L.room.floorTop + 0.67, -1.75, jitterTone(TINT.wood, rnd), { jit: 0.02 });
  for (const px of [-0.68, 0.68]) R.timber.box(0.13, 0.67, 0.42, px, L.room.floorTop, -1.75, dark(), { jit: 0.02 });
  R.stone.box(0.85, 0.18, 0.5, -1.7, L.room.floorTop, -0.5, stone(), { jit: 0.02 });
  lantern(R, 1.7, 2.95, -1.4);
  out.lanterns.push(ctx.toWorld(1.7, 2.65, -1));
  for (const [a, yy] of [[0.1, 5.2], [1.9, 9.2], [4.6, 12.4]] as const) {
    ctx.push(Math.cos(a) * radiusAt(yy), yy, Math.sin(a) * radiusAt(yy), Math.PI / 2 - a);
    R.vc.box(0.28, 1.1, 0.04, 0, 0, 0.04, 0x171712, { jit: 0, amp: 0 });
    for (const side of [-1, 1]) R.stone.box(0.15, 1.3, 0.22, side * 0.23, -0.1, 0.025, stone(), { jit: 0.04 });
    R.stone.box(0.64, 0.16, 0.26, 0, 1.08, 0.035, stone(), { jit: 0.04 });
    R.stone.box(0.68, 0.18, 0.3, 0, -0.17, 0.06, stone(), { jit: 0.04 });
    ctx.pop();
  }

  // One full ascending turn. Broad wedges keep a usable walking strip outside the solid shaft.
  const innerStringer: V3[] = [], outerStringer: V3[] = [], lowerRail: V3[] = [], upperRail: V3[] = [];
  for (let i = 0; i < L.stairSteps; i++) {
    const a0 = L.stairStart + i * LIGHTHOUSE_STAIR_ANGLE;
    const a1 = a0 + LIGHTHOUSE_STAIR_ANGLE;
    const top = lighthouseTreadTop(i);
    radialPlank(R.planks, L.stairInner, L.stairOuter, a0, a1, top, L.treadThickness, jitterTone(TINT.woodPale, rnd, 0.12));
    const mid = (a0 + a1) / 2;
    innerStringer.push(radial(L.stairInner + 0.08, mid, top - 0.19));
    outerStringer.push(radial(L.stairOuter - 0.12, mid, top - 0.19));
    lowerRail.push(radial(L.stairOuter - 0.02, mid, top + 0.46));
    upperRail.push(radial(L.stairOuter - 0.02, mid, top + L.railHeight));
    // Closely spaced joists and wall corbels visually bear the stair into the stone.
    if (i % 4 === 0) {
      const inP = radial(radiusAt(top) - 0.15, mid, top - 0.34);
      const outP = radial(L.stairOuter - 0.08, mid, top - 0.2);
      R.timber.rod(...inP, ...outP, 0.085, 4, dark(), { jit: 0.025 });
      if (top > 1.2) R.timber.rod(...radial(radiusAt(top - 0.95) + 0.01, mid, top - 0.95), ...outP, 0.065, 4, dark(), { jit: 0.025 });
      R.timber.rod(...radial(L.stairOuter - 0.02, mid, top - 0.1), ...radial(L.stairOuter - 0.02, mid, top + L.railHeight), 0.055, 5, dark(), { jit: 0.025 });
    }
  }
  for (const pts of [innerStringer, outerStringer]) R.timber.tube(pts, 0.085, 4, dark(), { jit: 0.025 });
  R.timber.tube(lowerRail, 0.035, 4, dark(), { jit: 0.025 });
  R.timber.tube(upperRail, 0.05, 5, dark(), { jit: 0.025 });
  // A braced timber gallery sits on the same upper standing surface as the last stair.
  const gallerySegments = 32;
  const galleryRail: V3[] = [], galleryLowerRail: V3[] = [];
  for (let i = 0; i < gallerySegments; i++) {
    const a0 = i * Math.PI * 2 / gallerySegments, a1 = (i + 1) * Math.PI * 2 / gallerySegments;
    const opening = a0 >= L.galleryOpeningStart - 1e-6 && a0 < L.galleryOpeningEnd - 1e-6;
    radialPlank(R.planks, L.galleryInner, opening ? L.stairInner : L.galleryOuter, a0, a1, L.stairTop, 0.18, jitterTone(TINT.wood, rnd, 0.14));
    const mid = (a0 + a1) / 2;
    if (i % 2 === 0 && !opening) {
      const edge = radial(L.galleryOuter - 0.08, mid, L.stairTop - 0.2);
      R.timber.rod(...radial(L.shaftTopRadius - 0.12, mid, L.stairTop - 0.2), ...edge, 0.11, 4, dark(), { jit: 0.02 });
      R.timber.rod(...radial(L.shaftTopRadius + 0.04, mid, L.stairTop - 1.25), ...edge, 0.085, 4, dark(), { jit: 0.02 });
      R.timber.rod(...radial(L.galleryOuter - 0.02, mid, L.stairTop - 0.1), ...radial(L.galleryOuter - 0.02, mid, L.stairTop + L.railHeight), 0.06, 5, dark(), { jit: 0.02 });
    }
    galleryRail.push(radial(L.galleryOuter - 0.02, a0, L.stairTop + L.railHeight));
    galleryLowerRail.push(radial(L.galleryOuter - 0.02, a0, L.stairTop + 0.46));
  }
  galleryRail.push(galleryRail[0]!); galleryLowerRail.push(galleryLowerRail[0]!);
  R.timber.tube(galleryRail, 0.055, 5, dark());
  R.timber.tube(galleryLowerRail, 0.036, 4, dark());

  // Keeper's house: a tall, steep roof meeting stone lower walls and a timber loft. The eastern wall joins the shaft.
  const house = L.house;
  ctx.push(house.x, 0, house.z);
  keeperFoundation(R, rnd, sink);
  const hw = house.w / 2, hd = house.d / 2, wall = house.wallThickness;
  const roomWall = (B: Batch, bottom: number, top: number, tint: Col) => {
    B.bx(-hw, bottom, -hd, -hw + wall, top, hd, tint, { sub: 0.75, jit: 0, amp: 0.1 });
    B.bx(hw - wall, bottom, -hd, hw, top, hd, tint, { sub: 0.75, jit: 0, amp: 0.1 });
    B.bx(-hw + wall, bottom, -hd, hw - wall, top, -hd + wall, tint, { sub: 0.75, jit: 0, amp: 0.1 });
    const doorTop = house.floorTop + house.doorHeight;
    if (bottom < doorTop) {
      const lowerTop = Math.min(top, doorTop);
      B.bx(-hw + wall, bottom, hd - wall, house.doorX - house.doorHalfWidth, lowerTop, hd, tint, { sub: 0.75, jit: 0, amp: 0.1 });
      B.bx(house.doorX + house.doorHalfWidth, bottom, hd - wall, hw - wall, lowerTop, hd, tint, { sub: 0.75, jit: 0, amp: 0.1 });
    }
    if (top > doorTop) B.bx(-hw + wall, Math.max(bottom, doorTop), hd - wall, hw - wall, top, hd, tint, { sub: 0.75, jit: 0, amp: 0.1 });
  };
  roomWall(R.stone, house.wallBase, house.wallBase + 2.1, stone());
  roomWall(R.planks, house.wallBase + 2.1, house.wallTop, jitterTone(TINT.wood, rnd, 0.09));
  // Real floor, loft underside and beams seal the room without filling its playable air volume.
  R.planks.box(house.w - wall * 2, 0.06, house.d - wall * 2, 0, house.floorTop - 0.06, 0, jitterTone(TINT.woodPale, rnd, 0.1), { sub: 1.3, jit: 0 });
  R.stone.box(house.doorHalfWidth * 2, 0.06, wall + 0.12, house.doorX, house.floorTop - 0.06, hd - wall / 2 + 0.06, stone(), { jit: 0 });
  R.planks.box(house.w - wall * 2, 0.15, house.d - wall * 2, 0, house.ceilingBottom, 0, jitterTone(TINT.wood, rnd), { sub: 1.3, jit: 0 });
  for (const px of [-2.5, 0, 2.5]) R.timber.box(0.18, 0.2, house.d - wall * 2, px, house.ceilingBottom - 0.2, 0, dark(), { grain: 'z', jit: 0 });
  // A keeper's cot and work table use human-scale silhouettes without blocking the central entry aisle.
  R.timber.box(2.05, 0.35, 0.95, -2.05, house.floorTop, -1.9, dark(), { jit: 0.02 });
  R.cloth.box(1.92, 0.13, 0.85, -2.05, house.floorTop + 0.35, -1.9, 0x756958, { jit: 0.02, amp: 0.12 });
  R.planks.box(1.55, 0.12, 0.8, 1.7, house.floorTop + 0.75, -1.7, jitterTone(TINT.wood, rnd), { jit: 0.02 });
  for (const px of [1.12, 2.28]) for (const pz of [-1.98, -1.42]) R.timber.box(0.1, 0.75, 0.1, px, house.floorTop, pz, dark(), { jit: 0.02 });
  quoins(R, rnd, house.w, house.d, 2.1, house.wallBase);
  // Sills/studs are split at the doorway; no decorative timber crosses the player's passage.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) R.timber.box(0.24, house.wallTop + 0.1, 0.24, sx * hw, 0, sz * hd, dark(), { grain: 'y', jit: 0.02 });
  for (const yy of [house.wallBase, 2.48, house.wallTop - 0.1]) {
    for (const sx of [-1, 1]) R.timber.box(0.2, 0.17, house.d, sx * hw, yy, 0, dark(), { grain: 'z', jit: 0.02 });
    R.timber.box(house.w, 0.17, 0.2, 0, yy, -hd, dark(), { grain: 'x', jit: 0.02 });
    if (yy >= house.floorTop + house.doorHeight) R.timber.box(house.w, 0.17, 0.2, 0, yy, hd, dark(), { grain: 'x', jit: 0.02 });
    else for (const [left, right] of [[-hw, house.doorX - house.doorHalfWidth], [house.doorX + house.doorHalfWidth, hw]])
      R.timber.box(right! - left!, 0.17, 0.2, (left! + right!) / 2, yy, hd, dark(), { grain: 'x', jit: 0.02 });
  }
  const roof = plankRoof(R, rnd, house.w, house.d, house.wallTop, house.roofPitch);
  roofWallInfill(R, 'gable', house.w, house.d, house.wallTop, roof, 'planks');
  openEntry(R, rnd, house.doorX, house.d / 2 + 0.06, house.doorHalfWidth * 2, house.doorHeight, house.floorTop);
  windowAt(R, rnd, { x: -2.7, y: 2.7, z: house.d / 2 + 0.035, w: 1.05, h: 1.05 });
  windowAt(R, rnd, { x: 2, y: 2.7, z: house.d / 2 + 0.035, w: 0.85, h: 1.05 });
  windowAt(R, rnd, { x: -house.w / 2 - 0.035, y: house.wallTop + 0.6, z: 0, ry: -Math.PI / 2, w: 1.15, h: 1.1 });
  chimney(R, rnd, -1.3, -1.2, house.wallTop - 0.2, roof.rise + 0.95, 0.8);
  lantern(R, -1.65, 2.7, house.d / 2 + 0.2);
  out.lanterns.push(ctx.toWorld(-1.65, 2.4, house.d / 2 + 0.6));
  woodpile(R, rnd, -house.w / 2 + 0.8, house.d / 2 + 0.7, 0, 1.5, 3);
  // Low work porch under heavy rafters: no disconnected extra building or floating canvas.
  for (const px of [-house.w / 2 + 0.3, house.w / 2 - 0.3]) {
    R.timber.box(0.2, 2.9 + sink, 0.2, px, -sink, house.d / 2 + 1.9, dark(), { grain: 'y', jit: 0.025 });
    R.timber.rod(px, 1.7, house.d / 2 + 1.9, px, 2.65, house.d / 2 + 1, 0.065, 4, dark());
  }
  const porchZ = house.d / 2 + 1;
  ctx.push(0, 0, porchZ);
  plankRoof(R, rnd, house.w + 0.4, 1.9, 2.94, 0.23, true);
  ctx.pop();
  ctx.pop();

  // Original eight-sided lantern room and cap preserve the native lamp and rotating beam interface.
  const ly = L.stairTop, lr = 2.6, lh = 2.5;
  R.metal.cyl(lr + 0.18, lr + 0.18, 0.17, 16, 0, ly, 0, TINT.iron, { jit: 0.025 });
  for (let i = 0; i < 8; i++) {
    const a0 = i * Math.PI / 4, a1 = (i + 1) * Math.PI / 4;
    const pa = radial(lr, a0, ly + 0.17), pb = radial(lr, a1, ly + 0.17);
    R.timber.rod(...pa, ...radial(lr, a0, ly + lh), 0.1, 6, dark(), { jit: 0.025 });
    R.pane.quad([...pa, ...pb, ...radial(lr, a1, ly + lh), ...radial(lr, a0, ly + lh)], 0xffffff, { amp: 0, flip: true });
    R.metal.rod(...radial(lr, a0, ly + 1.3), ...radial(lr, a1, ly + 1.3), 0.028, 4, TINT.iron, { jit: 0 });
  }
  R.metal.cyl(0.12, lr + 0.5, 1.75, 16, 0, ly + lh, 0, jitterTone(0x78736d, rnd, 0.04), { jit: 0.02 });
  R.metal.rod(0, ly + lh + 1.65, 0, 0, ly + lh + 2.35, 0, 0.045, 6, TINT.iron, { jit: 0 });
  R.glow.lathe([0, 0, 0.28, 0.08, 0.42, 0.65, 0.28, 1.1, 0, 1.2], 12, 0, ly + 0.65, 0, 0xffffff, { jit: 0, amp: 0 });
  const lampWorld = ctx.toWorld(0, ly + 1.3, 0);
  ctx.pop();
  return { lampY: lampWorld.y, lampWorld, base };
}
