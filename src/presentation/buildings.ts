import * as THREE from 'three';
import type { BuildingSpec } from '../world/layout';
import { ARCHIVE_ROOM } from '../world/layout';
import { mulberry32 } from '../world/noise';
import { buildingEntry, buildingGround } from '../world/buildingEntries';
import { CHIMNEY_STACK, chimneyOf, FIREPLACE, hearthOf, interiorOf, roomOf, type InteriorSpec } from '../world/interiors';
import type { Terrain } from '../world/terrain';
import { Ctx, hash3, mulc, rgb } from './buildKit';
import { Region } from './regions';
import { authorLighthouse } from './lighthouse';
import {
  TINT,
  type WallOpening,
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
  roomWalls,
  roofFor,
  roofWallInfill,
  sack,
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
  /** Door leaves that swing (A66): built apart from the merged shell, each about its hinge. */
  doors?: DoorLeaf[];
  /** Builds a region of its own, apart from the merged shell, for a part that moves. */
  apart?: (name: string, fn: (R: Region) => void) => THREE.Group;
}

/** A building's door leaf, hinged at the inner face of its doorway; it swings inward by turning about local +y. */
export interface DoorLeaf {
  room: InteriorSpec;
  /** At the hinge, turned with the building; the leaf hangs from it along +x. */
  pivot: THREE.Group;
}

/** How far into the doorway (from the inner face of the wall) a leaf hangs when shut, metres. */
export const DOOR_LEAF_INSET = 0.04;

export { CHIMNEY_STACK, chimneyOf } from '../world/interiors';

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
/**
 * How far out from the front wall the woodpile's middle stands (A75): its logs reach 0.28 m either side, and the
 * foundation's rubble course stands out to about 0.52 m (0.1 m out, up to 0.7 m deep, a little turned), so the pile
 * stands clear of the stones instead of through them, on the ground.
 */
export const WOODPILE_CLEAR = 0.9;

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

/**
 * The inside of a room (A66): a plank floor over the plinth with a stone sill through the doorway, a timber frame
 * round the opening, tie beams under the roof, the stack of the chimney standing on the floor, and the inner face of
 * every window, which shows the daylight outside. Drawn on its own random sequence, so the outside is unchanged.
 */
export function roomInterior(R: Region, room: InteriorSpec, windows: { x: number; z: number; y: number; ry: number; w: number; h: number }[], floorOf: 'planks' | 'stone' = 'planks', openings = false) {
  const b = room.building, t = room.wall, hw = b.w / 2 - t, hd = b.d / 2 - t;
  const inner: Rnd = mulberry32(Math.floor(hash3(b.x, b.z, 23) * 1e9));
  const { x: dx, halfWidth: dw, height: dh } = room.door;
  const floor = room.floorTop, base = room.wallBase, top = room.wallTop;
  if (floorOf === 'stone') R.stone.bx(-hw - 0.02, floor - 0.07, -hd - 0.02, hw + 0.02, floor, hd + 0.02, jitterTone(TINT.stone, inner, 0.08), { jit: 0.05, amp: 0.03, sub: 0.9 });
  else R.planks.bx(-hw - 0.02, floor - 0.07, -hd - 0.02, hw + 0.02, floor, hd + 0.02, jitterTone(TINT.woodDark, inner, 0.08), { grain: 'x', jit: 0.05, amp: 0.03, sub: 0.9 });
  R.stone.bx(dx - dw - 0.02, base - 0.04, hd - 0.02, dx + dw + 0.02, floor, b.d / 2 + 0.06, jitterTone(TINT.stone, inner, 0.1), { jit: 0.04, amp: 0.02 });
  // The opening's frame on the inside: jambs and a lintel set into the wall.
  const frame = () => jitterTone(TINT.woodDark, inner, 0.08);
  for (const side of [-1, 1]) R.timber.bx(dx + side * dw - (side < 0 ? 0.12 : 0), floor - 0.01, hd - 0.05, dx + side * dw + (side > 0 ? 0.12 : 0), base + dh + 0.04, hd + 0.03, frame(), { grain: 'y', jit: 0.03 });
  R.timber.bx(dx - dw - 0.16, base + dh, hd - 0.06, dx + dw + 0.16, base + dh + 0.18, hd + 0.03, frame(), { grain: 'x', jit: 0.03 });
  // A boarded ceiling at the wall top (where the room's ceiling collider is), tie beams under it, wall plates along it.
  R.planks.bx(-hw - 0.02, top - 0.05, -hd - 0.02, hw + 0.02, top + 0.02, hd + 0.02, jitterTone(TINT.wood, inner, 0.08), { grain: 'x', jit: 0.04, amp: 0.03, sub: 0.9 });
  const beams = Math.max(1, Math.round(b.w / 2.4) - 1);
  for (let i = 1; i <= beams; i++) {
    const x = -hw + (i * 2 * hw) / (beams + 1) + (inner() - 0.5) * 0.2;
    R.timber.bx(x - 0.09, top - 0.24, -hd - 0.05, x + 0.09, top - 0.05, hd + 0.05, frame(), { grain: 'z', jit: 0.05, amp: 0.02 });
  }
  for (const sz of [-1, 1]) R.timber.bx(-hw - 0.02, top - 0.19, sz * hd - 0.08, hw + 0.02, top - 0.05, sz * hd + 0.08, frame(), { grain: 'x', jit: 0.04, amp: 0.02 });
  // The chimney's stack stands on the floor and carries the chimney through the roof.
  const hearth = hearthOf(room);
  if (hearth) {
    const c = CHIMNEY_STACK;
    R.stone.bx(hearth.stack.x - c, floor - 0.02, hearth.stack.z - c, hearth.stack.x + c, top - 0.45, hearth.stack.z + c, jitterTone(TINT.stone, inner, 0.1), { sub: 0.6, jit: 0.06, amp: 0.05 });
    // The fireplace is drawn facing local +z from the stack's face, turned the way the hearth faces.
    R.ctx.push(hearth.stack.x, 0, hearth.stack.z, hearth.yaw);
    const cx = 0, back = c;
    // The fireplace against it (the bakery's oven stands there instead): stone piers, a soot-dark firebox with logs and
    // embers that glow after dark, a timber mantel, a stone hood up to the stack and a hearth slab before it.
    if (b.kind !== 'bakery') {
      const { halfWidth: fw, depth: fd, height: fh } = FIREPLACE, mouth = 0.34, lintel = floor + 0.82;
      const stone = () => jitterTone(TINT.stone, inner, 0.1);
      for (const side of [-1, 1]) R.stone.bx(side < 0 ? cx - fw : cx + mouth, floor - 0.02, back, side < 0 ? cx - mouth : cx + fw, lintel, back + fd, stone(), { jit: 0.05, amp: 0.04 });
      R.vc.bx(cx - mouth, floor, back - 0.01, cx + mouth, lintel, back + 0.03, 0x14100c, { jit: 0, amp: 0 });
      R.vc.bx(cx - mouth - 0.01, lintel - 0.06, back, cx + mouth + 0.01, lintel, back + fd - 0.04, 0x1b1611, { jit: 0, amp: 0 });
      R.timber.bx(cx - fw - 0.06, lintel, back, cx + fw + 0.06, lintel + 0.13, back + fd + 0.06, frame(), { grain: 'x', jit: 0.03, amp: 0.02 });
      R.stone.bx(cx - fw + 0.04, lintel + 0.13, back, cx + fw - 0.04, floor + fh, back + fd - 0.08, stone(), { jit: 0.04, amp: 0.03 });
      R.stone.bx(cx - fw - 0.08, floor - 0.04, back + fd, cx + fw + 0.08, floor + 0.05, back + fd + 0.28, stone(), { jit: 0.03, amp: 0.02 });
      R.glow.box(mouth * 1.3, 0.04, fd * 0.5, cx, floor + 0.005, back + fd * 0.4, 0xffffff, { jit: 0 });
      for (const [dx, dz, yaw] of [[-0.05, 0.16, 0.25], [0.04, 0.26, -0.3], [0, 0.21, 1.4]] as const) {
        const l = 0.5;
        R.bark.rod(cx + dx - Math.cos(yaw) * l / 2, floor + 0.08, back + dz + Math.sin(yaw) * l / 2, cx + dx + Math.cos(yaw) * l / 2, floor + 0.1, back + dz - Math.sin(yaw) * l / 2, 0.055, 5, jitterTone(TINT.woodDark, inner, 0.15));
      }
    }
    R.ctx.pop();
  }
  // Every window, seen from inside: the daylight through it, a frame and a sill.
  for (const win of windows) {
    R.ctx.push(win.x, win.y, win.z, win.ry);
    // A real opening (A79) shows the world itself; elsewhere a pane of daylight stands for it.
    if (!openings) R.daylight.box(win.w, win.h, 0.02, 0, 0, 0.012, 0xffffff, { jit: 0 });
    R.timber.box(win.w + 0.18, 0.08, 0.16, 0, -0.08, 0.06, frame(), { grain: 'x', jit: 0.04 });
    R.timber.box(win.w + 0.18, 0.08, 0.06, 0, win.h, 0.03, frame(), { grain: 'x', jit: 0.04 });
    for (const side of [-1, 1]) R.timber.box(0.07, win.h, 0.06, side * (win.w / 2 + 0.035), 0, 0.03, frame(), { grain: 'y', jit: 0.04 });
    // The mullions are the glazing's own, on the outside, where the opening is real (A79); a second cross inside would
    // double them across the wall's depth. Their tones are still drawn, so the room's other tones stay as they were.
    const mullion = frame(), transom = frame();
    if (!openings) {
      R.timber.box(0.04, win.h, 0.04, 0, 0, 0.03, mullion, { grain: 'y', jit: 0.03 });
      R.timber.box(win.w, 0.04, 0.04, 0, win.h * 0.5, 0.03, transom, { grain: 'x', jit: 0.03 });
    }
    R.ctx.pop();
  }
}

/** Any ordinary building: foundation, walls in the chosen material, sagging roof, door, windows, chimney, and the clutter of use. */
export function buildStandard(R: Region, terrain: Terrain, b: BuildingSpec, out: BuildOut) {
  // A79: the windows are real openings through the walls. They are placed by the building's own random sequence after
  // the walls are drawn, so a first pass into a scratch region finds where they fall; the walls are then built with the
  // openings there, every random choice (tones, shutters, clutter) the same as before.
  const found: WallOpening[] = [];
  buildStandardPass(new Region(`${b.id}:openings`, new Ctx()), terrain, b, { lanterns: [] }, [], found);
  buildStandardPass(R, terrain, b, out, found, []);
}

function buildStandardPass(R: Region, terrain: Terrain, b: BuildingSpec, out: BuildOut, openings: readonly WallOpening[], found: WallOpening[]) {
  const { avg, lo } = groundOf(terrain, b);
  const rnd: Rnd = mulberry32(Math.floor(hash3(b.x, b.z, 17) * 1e9));
  // The shared room (whose furniture and colliders the world uses), or a fresh description of a building variant.
  const room = roomOf(b) ?? interiorOf(b)!;
  const ctx = R.ctx;
  ctx.push(b.x, avg, b.z, b.yaw);
  const sink = avg - lo + 0.4;
  const plinth = 0.42;
  const wallH = b.h;
  const y0 = plinth - 0.02;
  const t = room.wall;
  const doorX = buildingEntry(b).x;
  // The doorway through the front wall (A66): its boards, frame and rails stop at its sides and its lintel.
  const gap = { x0: doorX - room.door.halfWidth, x1: doorX + room.door.halfWidth, top: room.door.height };
  foundation(R, rnd, b.w, b.d, plinth, sink);

  if (b.wall === 'timber') {
    const faces: [number, number, number, number][] = [[0, b.d / 2, 0, b.w], [0, -b.d / 2, Math.PI, b.w], [b.w / 2, 0, Math.PI / 2, b.d], [-b.w / 2, 0, -Math.PI / 2, b.d]];
    for (const [fx, fz, yaw, len] of faces) {
      ctx.push(fx, 0, fz, yaw);
      // The openings on this face, along the face (its local x runs as the push turns it).
      const side = fz > 0 ? 'front' : fz < 0 ? 'back' : fx > 0 ? 'east' : 'west';
      const along = (at: number) => side === 'front' || side === 'west' ? at : -at;
      const holes = openings.filter((o) => o.side === side).map((o) => ({ x0: along(o.at) - o.half, x1: along(o.at) + o.half, y0: o.y0, y1: o.y1 }));
      plankFace(R, rnd, len, wallH, y0, TINT.wood, fz > 0 ? gap : undefined, holes);
      ctx.pop();
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(R.timber, rnd, sx * (b.w / 2 + 0.02), sz * (b.d / 2 + 0.02), y0 + wallH + 0.15, 0.24, jitterTone(TINT.woodDark, rnd, 0.1), 0.2);
    // A rough rail along the eave line and another at waist height; the waist rail stops at the doorway.
    for (const y of [y0 + wallH - 0.08, y0 + wallH * 0.42]) for (const sz of [-1, 1]) {
      const tone = jitterTone(TINT.woodDark, rnd, 0.1), z0 = sz * (b.d / 2 + 0.06) - 0.06, z1 = sz * (b.d / 2 + 0.06) + 0.06;
      if (sz === 1 && y < y0 + gap.top) {
        R.timber.bx(-b.w / 2 - 0.04, y, z0, gap.x0, y + 0.14, z1, tone, { grain: 'x', jit: 0.1 });
        R.timber.bx(gap.x1, y, z0, b.w / 2 + 0.04, y + 0.14, z1, tone, { grain: 'x', jit: 0.1 });
      } else R.timber.bx(-b.w / 2 - 0.04, y, z0, b.w / 2 + 0.04, y + 0.14, z1, tone, { grain: 'x', jit: 0.1 });
    }
    for (const y of [y0 + wallH - 0.08, y0 + wallH * 0.42]) for (const sx of [-1, 1]) R.timber.bx(sx * (b.w / 2 + 0.06) - 0.06, y, -b.d / 2 - 0.04, sx * (b.w / 2 + 0.06) + 0.06, y + 0.14, b.d / 2 + 0.04, jitterTone(TINT.woodDark, rnd, 0.1), { grain: 'z', jit: 0.1 });
    // Boards line the room inside, a little behind the outer boards so their gaps stay dark.
    roomWalls(R.planks, b.w - 0.06, b.d - 0.06, wallH, y0, t - 0.03, room.door, mulc(rgb(TINT.wood), 0.82), 0.7, openings);
  } else if (b.wall === 'plaster') {
    roomWalls(R.plaster, b.w, b.d, wallH, y0, t, room.door, jitterTone(TINT.plaster, rnd, 0.06), 0.7, openings);
    timberFrame(R, rnd, b.w, b.d, wallH, y0, gap, openings);
  } else {
    roomWalls(R.stone, b.w, b.d, wallH, y0, t, room.door, jitterTone(TINT.stone, rnd, 0.05), 0.9, openings);
    quoins(R, rnd, b.w, b.d, wallH, y0, openings);
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

  // Door and windows. The leaf hangs apart from the shell, hinged at the doorway's inner face, so it can swing.
  rnd(); // Retain the existing decorative RNG sequence after the now-shared, authored door position.
  const doorOpts = { x: doorX, y: y0, z: b.d / 2 + 0.03, stone: b.wall === 'stone' };
  if (out.apart && out.doors) {
    const leaf = out.apart(`door-${b.id}`, (L) => door(R, rnd, { ...doorOpts, leaf: L }));
    const pivot = new THREE.Group();
    pivot.name = `Door / ${b.id}`;
    pivot.position.copy(ctx.toWorld(doorX - room.door.halfWidth + 0.02, room.floorTop + 0.005, b.d / 2 - t + DOOR_LEAF_INSET));
    pivot.rotation.y = b.yaw;
    leaf.removeFromParent();
    pivot.add(leaf);
    out.doors.push({ room, pivot });
  } else door(R, rnd, doorOpts);
  const windows: { x: number; z: number; y: number; ry: number; w: number; h: number }[] = [];
  const inside = (x: number, z: number, ry: number) => windows.push({ x, z, y: y0 + wallH * 0.45, ry, w: 0.72, h: 0.82 });
  const opening = (side: WallOpening['side'], at: number) => found.push({ side, at, half: 0.36, y0: y0 + wallH * 0.45, y1: y0 + wallH * 0.45 + 0.82 });
  for (const side of [-1, 1]) {
    const wx = side * Math.min(b.w * 0.32, b.w / 2 - 0.75);
    if (Math.abs(wx - doorX) >= 1.25) {
      windowAt(R, rnd, { x: wx, y: y0 + wallH * 0.45, z: b.d / 2 + 0.02, shutters: true, stone: b.wall === 'stone', opening: true });
      inside(wx, b.d / 2 - t - 0.005, Math.PI);
      opening('front', wx);
    }
  }
  const eastZ = (rnd() - 0.5) * b.d * 0.4;
  windowAt(R, rnd, { x: b.w / 2 + 0.02, y: y0 + wallH * 0.45, z: eastZ, ry: Math.PI / 2, stone: b.wall === 'stone', opening: true });
  inside(b.w / 2 - t - 0.005, eastZ, -Math.PI / 2);
  opening('east', eastZ);
  const westZ = (rnd() - 0.5) * b.d * 0.4;
  windowAt(R, rnd, { x: -b.w / 2 - 0.02, y: y0 + wallH * 0.45, z: westZ, ry: -Math.PI / 2, stone: b.wall === 'stone', opening: true });
  inside(-b.w / 2 + t + 0.005, westZ, Math.PI / 2);
  opening('west', westZ);
  for (const side of [-1, 1]) {
    windowAt(R, rnd, { x: side * b.w * 0.24, y: y0 + wallH * 0.45, z: -b.d / 2 - 0.02, ry: Math.PI, stone: b.wall === 'stone', opening: true });
    inside(side * b.w * 0.24, -b.d / 2 + t + 0.005, 0);
    opening('back', side * b.w * 0.24);
  }
  roomInterior(R, room, windows, 'planks', true);

  // Chimney.
  const chimneyAt = chimneyOf(b);
  if (chimneyAt) chimney(R, rnd, chimneyAt.x, chimneyAt.z, y0 + wallH - 0.5, roof.rise + 1.6);

  // Lantern and the small litter of a used doorway.
  const lp = ctx.toWorld(doorX + 0.95, y0 + 2.2, b.d / 2 + 0.35);
  out.lanterns.push(lp.clone());
  lantern(R, doorX + 0.95, y0 + 2.4, b.d / 2 + 0.15);
  if (b.kind === 'house' || b.kind === 'reeve' || b.kind === 'inn') groundExteriorProp(R, terrain, () => woodpile(R, rnd, b.w / 2 - 0.8, b.d / 2 + WOODPILE_CLEAR, (rnd() - 0.5) * 0.3, 1.5, 4));
  if (b.kind === 'house') {
    groundExteriorProp(R, terrain, () => barrel(R, rnd, -b.w / 2 + 0.7, 0, b.d / 2 + 0.7, 1));
    groundExteriorProp(R, terrain, () => sack(R, rnd, -b.w / 2 + 1.5, 0, b.d / 2 + 0.6, 1));
    // A76: the back of a house is where its things are kept: a rain butt at one corner, a crate at the other.
    groundExteriorProp(R, terrain, () => barrel(R, rnd, -b.w / 2 + 0.6, 0, -b.d / 2 - 0.55, 1.05));
    groundExteriorProp(R, terrain, () => crate(R, rnd, b.w / 2 - 0.75, 0, -b.d / 2 - 0.5, 0.7, 0.5, 0.55, (rnd() - 0.5) * 0.4));
  }
  if (b.kind === 'inn') {
    // A76: casks waiting by the inn's door.
    groundExteriorProp(R, terrain, () => barrel(R, rnd, -b.w / 2 + 0.7, 0, b.d / 2 + 0.65, 1));
    groundExteriorProp(R, terrain, () => barrel(R, rnd, -b.w / 2 + 1.4, 0, b.d / 2 + 0.6, 0.95));
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
