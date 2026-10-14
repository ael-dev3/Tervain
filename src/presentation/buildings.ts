import * as THREE from 'three';
import type { BuildingSpec } from '../world/layout';
import { ARCHIVE_ROOM } from '../world/layout';
import { mulberry32 } from '../world/noise';
import { buildingEntry, buildingGround } from '../world/buildingEntries';
import { BREAST_DEPTH, CHIMNEY_STACK, chimneyOf, FIREPLACE, HEARTH_DRESS, HEARTH_SHAPE, hearthOf, interiorOf, joistsOf, roomHalfSize, roomOf, sideWindowZ, type InteriorSpec } from '../world/interiors';
import type { Terrain } from '../world/terrain';
import { Ctx, FACES, hash3, mulc, rgb, type Col } from './buildKit';
import { Region } from './regions';
import { authorLighthouse } from './lighthouse';
import { innSign, type SwingingPart } from './innSign';
import { antlers, doorHood, dormer, drawHouseYard, lookOf, lookRnd, plinthCourse } from './houseExteriors';
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
  /** Parts that swing in the wind (A136): the inn's sign. */
  swinging?: SwingingPart[];
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
export function roomInterior(R: Region, room: InteriorSpec, windows: { x: number; z: number; y: number; ry: number; w: number; h: number }[], floorOf: 'planks' | 'stone' = 'planks', openings = false, roof?: { ridgeY: number; pitch: number }) {
  const b = room.building, t = room.wall, hw = b.w / 2 - t, hd = b.d / 2 - t;
  const inner: Rnd = mulberry32(Math.floor(hash3(b.x, b.z, 23) * 1e9));
  const { x: dx, halfWidth: dw, height: dh } = room.door;
  const floor = room.floorTop, base = room.wallBase, top = room.wallTop;
  if (floorOf === 'stone') R.stone.bx(-hw - 0.02, floor - 0.07, -hd - 0.02, hw + 0.02, floor, hd + 0.02, jitterTone(TINT.stone, inner, 0.08), { jit: 0.05, amp: 0.03, sub: 0.9 });
  else R.planks.bx(-hw - 0.02, floor - 0.07, -hd - 0.02, hw + 0.02, floor, hd + 0.02, jitterTone(TINT.woodDark, inner, 0.08), { grain: 'x', jit: 0.05, amp: 0.03, sub: 0.3 });
  R.stone.bx(dx - dw - 0.02, base - 0.04, hd - 0.02, dx + dw + 0.02, floor, b.d / 2 + 0.06, jitterTone(TINT.stone, inner, 0.1), { jit: 0.04, amp: 0.02 });
  // The opening's frame on the inside: jambs and a lintel set into the wall.
  const frame = () => jitterTone(TINT.woodDark, inner, 0.08);
  for (const side of [-1, 1]) R.timber.bx(dx + side * dw - (side < 0 ? 0.12 : 0), floor - 0.01, hd - 0.05, dx + side * dw + (side > 0 ? 0.12 : 0), base + dh + 0.04, hd + 0.03, frame(), { grain: 'y', jit: 0.03 });
  R.timber.bx(dx - dw - 0.16, base + dh, hd - 0.06, dx + dw + 0.16, base + dh + 0.18, hd + 0.03, frame(), { grain: 'x', jit: 0.03 });
  // A boarded ceiling at the wall top (where the room's ceiling collider is), tie beams under it, wall plates along it.
  // A139: under a gable roof the room is open to the rafters instead (the collider stays at the wall top).
  if (!roof) R.planks.bx(-hw - 0.02, top - 0.05, -hd - 0.02, hw + 0.02, top + 0.02, hd + 0.02, jitterTone(TINT.wood, inner, 0.08), { grain: 'x', jit: 0.04, amp: 0.03, sub: floorOf === 'planks' ? 0.45 : 0.9 });
  const beams = Math.max(1, Math.round(b.w / 2.4) - 1);
  for (let i = 1; i <= beams; i++) {
    const x = -hw + (i * 2 * hw) / (beams + 1) + (inner() - 0.5) * 0.2;
    // A136: heavy tie beams, the joists over them darker in the gaps between (roomShade).
    R.timber.bx(x - 0.13, top - 0.34, -hd - 0.05, x + 0.13, top - 0.05, hd + 0.05, frame(), { grain: 'z', jit: 0.05, amp: 0.02 });
  }
  for (const sz of [-1, 1]) R.timber.bx(-hw - 0.02, top - 0.19, sz * hd - 0.08, hw + 0.02, top - 0.05, sz * hd + 0.08, frame(), { grain: 'x', jit: 0.04, amp: 0.02 });
  if (floorOf === 'planks') roomFrame(R, room, windows, inner, frame);
  if (roof) openRoof(R, room, roof, mulberry32(Math.floor(hash3(b.x, b.z, 43) * 1e9)));
  // The hearth (A135): a chimney breast built out of its wall up to the ceiling, the stack carried on up inside the wall
  // to the chimney outside; before it an open fireplace with a soot-black firebox, logs on an ash bed, a stone hood, a
  // timber mantel shelf and a hearthstone. The fire itself burns in presentation/hearthFire.ts.
  const hearth = hearthOf(room);
  if (hearth) {
    const c = CHIMNEY_STACK, face = c - BREAST_DEPTH, S = HEARTH_SHAPE;
    const stone = () => jitterTone(TINT.stone, inner, 0.1), soot = () => jitterTone(0x221d18, inner, 0.08);
    // Drawn facing local +z from the stack's centre, turned the way the hearth faces.
    R.ctx.push(hearth.stack.x, 0, hearth.stack.z, hearth.yaw);
    R.stone.bx(-c, floor - 0.02, face - 0.02, c, top - 0.04, c, stone(), { sub: 0.22, jit: 0.06, amp: 0.05, skip: FACES.nz });
    if (b.kind !== 'bakery') {
      const { halfWidth: fw, height: fh } = FIREPLACE, m = S.mouth, mt = floor + S.mouthTop, my = floor + S.mantelY;
      // Piers either side of the mouth, lined with soot inside.
      for (const side of [-1, 1]) {
        R.stone.bx(side < 0 ? -fw : m, floor - 0.02, face, side < 0 ? -m : fw, mt, S.front, stone(), { jit: 0.05, amp: 0.04, sub: 0.25 });
        R.vc.bx(side < 0 ? -m : m - 0.025, floor + 0.04, S.back, side < 0 ? -m + 0.025 : m, mt, S.front - 0.03, soot(), { jit: 0.04, amp: 0.05 });
      }
      // The firebox: its back and roof black with soot, a hearthstone floor under a bed of ash.
      R.stone.bx(-m, floor - 0.02, face, m, mt, S.back, soot(), { jit: 0.05, amp: 0.06, sub: 0.2 });
      R.vc.bx(-m, mt - 0.04, S.back, m, mt, S.front, soot(), { jit: 0.04, amp: 0.04 });
      R.stone.bx(-m, floor - 0.02, S.back, m, floor + 0.05, S.front, jitterTone(TINT.stoneDark, inner, 0.08), { jit: 0.04, amp: 0.03 });
      R.vc.bx(-m + 0.04, floor + 0.05, S.back + 0.02, m - 0.04, floor + 0.068, S.front - 0.06, 0x47423c, { jit: 0.05, amp: 0.08 });
      R.glow.box(m * 1.3, 0.03, 0.26, 0, floor + 0.062, S.fire.z, 0xffffff, { jit: 0 });
      // Firedogs and the logs on them.
      for (const side of [-1, 1]) R.metal.bx(side * 0.2 - 0.015, floor + 0.05, S.fire.z - 0.16, side * 0.2 + 0.015, floor + 0.13, S.fire.z + 0.18, 0x2a2826, { jit: 0.02 });
      for (const [lz, ly, tilt] of [[-0.07, 0.17, 0.05], [0.08, 0.17, -0.04], [0.0, 0.27, 0.12]] as const) {
        R.bark.rod(-0.33, floor + ly - tilt, S.fire.z + lz, 0.33, floor + ly + tilt, S.fire.z + lz * 0.6, 0.05, 6, jitterTone(TINT.woodDark, inner, 0.15));
      }
      // The lintel over the mouth, the mantel shelf on it, and the stone hood narrowing up into the breast.
      R.stone.bx(-fw, mt, face, fw, my - 0.11, S.front, stone(), { jit: 0.04, amp: 0.03, sub: 0.25 });
      R.timber.bx(-fw - 0.1, my - 0.11, face, fw + 0.1, my, S.mantelFront, frame(), { grain: 'x', jit: 0.03, amp: 0.02 });
      for (const side of [-1, 1]) R.timber.bx(side * (fw - 0.02) - 0.04, my - 0.32, S.front - 0.02, side * (fw - 0.02) + 0.04, my - 0.11, S.mantelFront - 0.04, frame(), { grain: 'y', jit: 0.03 });
      R.stone.bx(-fw + 0.08, my, face, fw - 0.08, floor + fh + 0.2, S.front - 0.14, stone(), { jit: 0.04, amp: 0.03, sub: 0.22 });
      R.stone.bx(-c - 0.08, floor + fh + 0.2, face, c + 0.08, floor + fh + 0.55, c + 0.16, stone(), { jit: 0.04, amp: 0.03, sub: 0.22 });
      // The hearthstone before it.
      R.stone.bx(-fw - 0.17, floor - 0.04, S.front, fw + 0.17, floor + 0.045, S.slab, jitterTone(TINT.stoneDark, inner, 0.08), { jit: 0.04, amp: 0.03, sub: 0.3 });
      // An iron trivet for the pot at the side of the mouth.
      const pot = HEARTH_DRESS.pot, legs = [0, 2.1, 4.2].map((a) => [pot.x + Math.cos(a) * 0.17, pot.z + Math.sin(a) * 0.17] as const);
      for (const [i, [x, z]] of legs.entries()) {
        const [nx, nz] = legs[(i + 1) % 3]!;
        R.metal.rod(x, floor + 0.045, z, x * 0.9 + pot.x * 0.1, floor + pot.y, z * 0.9 + pot.z * 0.1, 0.012, 4, 0x2a2826);
        R.metal.rod(x * 0.9 + pot.x * 0.1, floor + pot.y, z * 0.9 + pot.z * 0.1, nx * 0.9 + pot.x * 0.1, floor + pot.y, nz * 0.9 + pot.z * 0.1, 0.012, 4, 0x2a2826);
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

type RoomWindow = { x: number; z: number; y: number; ry: number; w: number; h: number };

/**
 * The open roof over a room (A139): the gable roof's boards seen from below between its rafters, a purlin along each
 * slope, the eaves closed over the walls and the chimney breast carried up to the roof. The ridge beam is the roof's own.
 * Smoke darkens it all, more towards the ridge and over the hearth, by tint (roomShade stops at the wall top so as not
 * to darken the roof outside). The room's ceiling collider stays at the wall top; only the look changes.
 */
function openRoof(R: Region, room: InteriorSpec, roof: { ridgeY: number; pitch: number }, inner: Rnd) {
  const b = room.building, t = room.wall, { hw, hd } = roomHalfSize(room), top = room.wallTop, tn = Math.tan(roof.pitch);
  // The underside of the roof's shell (roofs.ts: 0.016 + 0.09 below its planes), less a few millimetres.
  const under = (z: number) => roof.ridgeY - 0.112 - Math.abs(z) * tn;
  const hearth = hearthOf(room), sooty = hearth && b.kind !== 'bakery';
  // A140: one smoke for everything up here, per vertex, so the boards, rafters and gable ends darken together from the
  // wall top to near black at the ridge, and more over the fire. It stands in for roomShade while the roof is drawn.
  const smoke = (x: number, y: number, z: number) => {
    const up = Math.min(1, Math.max(0, (y - top) / Math.max(0.5, roof.ridgeY - top)));
    let k = 0.7 - 0.45 * up ** 0.8;
    if (sooty) k *= 1 - 0.35 * Math.exp(-((x - hearth.stack.x) ** 2 + (z - hearth.stack.z) ** 2) / 3);
    return k;
  };
  const e = R.ctx.matrix.clone().invert().elements, before = R.ctx.shade;
  R.ctx.shade = (wx, wy, wz) => smoke(e[0]! * wx + e[4]! * wy + e[8]! * wz + e[12]!, e[1]! * wx + e[5]! * wy + e[9]! * wz + e[13]!, e[2]! * wx + e[6]! * wy + e[10]! * wz + e[14]!);
  const tone = (base: number, _x: number, _y: number, _z: number, j = 0.08) => jitterTone(base, inner, j);
  // The eaves closed over the front and back walls, from the wall top up to the roof, in steps under its slope.
  for (const sz of [-1, 1]) {
    const steps = 4, z0 = b.d / 2 - t, z1 = b.d / 2;
    for (let i = 0; i < steps; i++) {
      const a = z0 + ((z1 - z0) * i) / steps, c = z0 + ((z1 - z0) * (i + 1)) / steps;
      if (under(c) <= top) continue;
      R.planks.bx(-b.w / 2, top - 0.05, sz * a, b.w / 2, under(c), sz * c, tone(TINT.wood, 0, top, sz * hd, 0.04), { grain: 'x', jit: 0.03, amp: 0.02 });
    }
  }
  // Roof boards between the rafters: strips up each slope, each its own tone.
  const strip = 0.24, slopeLen = hd / Math.cos(roof.pitch), n = Math.max(2, Math.round(slopeLen / strip));
  for (const sz of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const za = hd * (1 - i / n), zb = hd * (1 - (i + 1) / n), ya = under(za) - 0.004, yb = under(zb) - 0.004;
      const c = tone(TINT.wood, 0, (ya + yb) / 2, sz * (za + zb) / 2, 0.1), L = hw + 0.02, s = Math.hypot(za - zb, ya - yb);
      // Facing down into the room (the winding of roofs.ts's underside).
      const pts = sz > 0 ? [-L, yb, zb, L, yb, zb, L, ya, za, -L, ya, za] : [L, yb, -zb, -L, yb, -zb, -L, ya, -za, L, ya, -za];
      R.planks.quad(pts, c, { uv: [0, 0, 2 * L, 0, 2 * L, s, 0, s], nu: Math.max(1, Math.round(L / 0.6)), amp: 0.02 });
    }
  }
  // The gable ends inside, above the wall top: lime wash gone dark with smoke, up to the roof.
  for (const sx of [-1, 1]) {
    // Lime wash, but no whiter than the boards beside it once smoked: the same smoke, on a duller base.
    const X = sx * (hw - 0.012), U = under(hd), Rr = under(0), c = mulc(jitterTone(0xf2ead8, inner, 0.05), 0.55);
    const quad = [X, top - 0.05, -hd, X, top - 0.05, hd, X, U, hd, X, U, -hd];
    // Both windings: the one facing the room shows, the other faces the gable's own infill a hand's breadth behind.
    for (const flip of [false, true]) R.lime.quad(quad, c, { flip, uv: [-hd, top, hd, top, hd, U, -hd, U], nu: Math.max(1, Math.round(hd / 0.6)), nv: 2, amp: 0.02 });
    R.lime.tri3(X, U, -hd, X, U, hd, X, Rr, 0, c, 1, [-hd, U, hd, U, 0, Rr]);
    R.lime.tri3(X, U, hd, X, U, -hd, X, Rr, 0, c, 1, [hd, U, -hd, U, 0, Rr]);
  }
  // Rafters, about 0.6 m apart, from the wall plate to the ridge; a purlin under them half way up each slope.
  const rafters = Math.max(3, Math.round((2 * hw) / 0.6));
  for (let i = 0; i <= rafters; i++) {
    const x = -hw + 0.08 + (i * (2 * hw - 0.16)) / rafters;
    for (const sz of [-1, 1]) {
      R.timber.rod(x, under(hd + 0.1) - 0.07, sz * (hd + 0.1), x, under(0.06) - 0.07, sz * 0.06, 0.06, 4, tone(TINT.woodDark, x, (top + roof.ridgeY) / 2, sz * hd / 2), { jit: 0.03, amp: 0.02 });
    }
  }
  for (const sz of [-1, 1]) {
    const zc = hd * 0.5, y1 = under(zc + 0.08) - 0.13;
    R.timber.bx(-hw - 0.02, y1 - 0.17, sz * zc - 0.08, hw + 0.02, y1, sz * zc + 0.08, tone(TINT.woodDark, 0, y1, sz * zc), { grain: 'x', jit: 0.04, amp: 0.02 });
  }
  R.ctx.shade = before;
  // The chimney breast carried on up to the roof, in slices that each stop under the slope over them.
  if (hearth) {
    const c = CHIMNEY_STACK, face = c - BREAST_DEPTH;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const lx0 = -c + (i * 2 * c) / 4, lx1 = -c + ((i + 1) * 2 * c) / 4, lz0 = face - 0.02 + (j * (c - face + 0.02)) / 2, lz1 = face - 0.02 + ((j + 1) * (c - face + 0.02)) / 2;
      const y1 = Math.min(...[[lx0, lz0], [lx1, lz0], [lx0, lz1], [lx1, lz1]].map(([lx, lz]) => under(hearth.at(lx!, lz!).z))) - 0.01;
      if (y1 <= top) continue;
      R.ctx.push(hearth.stack.x, 0, hearth.stack.z, hearth.yaw);
      R.stone.bx(lx0, top - 0.06, lz0, lx1, y1, lz1, mulc(jitterTone(TINT.stone, inner, 0.1), sooty ? 0.45 : 0.7), { sub: 0.22, jit: 0.06, amp: 0.05 });
      R.ctx.pop();
    }
  }
}

/**
 * The timber of a lived-in room (A135), after Gothic 3's houses: corner posts and wall posts with knee braces up to the
 * wall plates, a plank wainscot to waist height with a rail along its top and a skirting at its foot, and light joists
 * across under the ceiling boards. Drawn into the building's merged shell, in its timber and plank materials.
 */
function roomFrame(R: Region, room: InteriorSpec, windows: readonly RoomWindow[], inner: Rnd, frame: () => Col) {
  const { hw, hd } = roomHalfSize(room), floor = room.floorTop, top = room.wallTop, { x: dx, halfWidth: dw } = room.door;
  const hearth = hearthOf(room), fire = hearth?.footprint(FIREPLACE.halfWidth + 0.2, FIREPLACE.depth + 0.1);
  const wainscot = floor + 0.98, board = () => mulc(jitterTone(TINT.wood, inner, 0.1), 0.78);
  type Side = 'back' | 'front' | 'left' | 'right';
  // Each wall as a run along it: its fixed coordinate, its length, and where a point along it lies.
  const walls: { side: Side; at: (t: number, out: number) => [number, number]; len: number }[] = [
    { side: 'back', at: (t, out) => [t, -hd + out], len: hw }, { side: 'front', at: (t, out) => [t, hd - out], len: hw },
    { side: 'left', at: (t, out) => [-hw + out, t], len: hd }, { side: 'right', at: (t, out) => [hw - out, t], len: hd },
  ];
  // Spans of a wall left bare: the doorway, and the hearth's breast and fireplace.
  const gaps = (side: Side): [number, number][] => {
    const out: [number, number][] = [];
    if (side === 'front') out.push([dx - dw - 0.12, dx + dw + 0.12]);
    if (fire && hearth!.wall === side) out.push(side === 'back' ? [fire.x0, fire.x1] : [fire.z0, fire.z1]);
    return out;
  };
  const runs = (side: Side, len: number): [number, number][] => {
    let spans: [number, number][] = [[-len, len]];
    for (const [g0, g1] of gaps(side)) spans = spans.flatMap(([a, b]) => (g1 <= a || g0 >= b ? [[a, b]] : [[a, g0], [g1, b]].filter((r) => r[1]! - r[0]! > 0.05)) as [number, number][]);
    return spans;
  };
  const piece = (mat: 'planks' | 'timber', side: Side, t0: number, t1: number, y0: number, y1: number, d0: number, d1: number, tone: Col, grain: 'x' | 'y' | 'z', sub?: number) => {
    const w = walls.find((x) => x.side === side)!, [ax, az] = w.at(t0, d0), [bx, bz] = w.at(t1, d1);
    R[mat].bx(Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz), tone, { grain, jit: 0.04, amp: 0.04, sub });
  };
  for (const { side, len } of walls) {
    const along: 'x' | 'z' = side === 'back' || side === 'front' ? 'x' : 'z';
    for (const [t0, t1] of runs(side, len)) {
      // Upright boards to waist height, a rail capping them and a skirting at their foot.
      for (let t = t0; t < t1 - 0.02; t += 0.24) piece('planks', side, t, Math.min(t1, t + 0.235), floor - 0.01, wainscot, 0, 0.028, board(), 'y', 0.24);
      piece('timber', side, t0, t1, wainscot - 0.02, wainscot + 0.06, 0, 0.055, frame(), along);
      piece('timber', side, t0, t1, floor - 0.01, floor + 0.13, 0, 0.045, frame(), along);
    }
    // Wall plates under the ceiling along the sides (the front and back have theirs).
    if (along === 'z') piece('timber', side, -hd, hd, top - 0.19, top - 0.05, 0, 0.14, frame(), 'z');
    // Posts: in the corners, and along the wall where no window, doorway or hearth stands, each braced to the plate.
    const clear = (t: number) => !gaps(side).some(([g0, g1]) => t > g0 - 0.3 && t < g1 + 0.3)
      && !windows.some((w) => {
        const onSide = side === 'back' ? w.z < -hd + 0.3 : side === 'front' ? w.z > hd - 0.3 : side === 'left' ? w.x < -hw + 0.3 : w.x > hw - 0.3;
        return onSide && Math.abs((along === 'x' ? w.x : w.z) - t) < w.w / 2 + 0.35;
      });
    const posts = [-len + 0.09, len - 0.09, ...(len > 2.2 ? [-len * 0.36, len * 0.36] : []), 0].filter(clear);
    // A136: the plaster above the wainscot framed as well: studs between the posts, so no stretch of bare plaster is
    // wider than about 0.8 m.
    const studs: number[] = [];
    for (let t = -len + 0.5; t < len - 0.4; t += 0.78) if (clear(t) && !posts.some((p) => Math.abs(p - t) < 0.42)) studs.push(t);
    for (const t of studs) piece('timber', side, t - 0.055, t + 0.055, wainscot + 0.04, top - 0.18, 0, 0.04, frame(), 'y');
    // A sill girt only on a wall with windows: at their sill line, wall to wall, stopping at each window's frame, so the
    // frame sits on it (a rail at any other height read as a cross nailed beside the window).
    const mine = windows.filter((w) => (side === 'back' ? w.z < -hd + 0.3 : side === 'front' ? w.z > hd - 0.3 : side === 'left' ? w.x < -hw + 0.3 : w.x > hw - 0.3));
    if (mine.length) {
      const sill = Math.min(...mine.map((w) => w.y)), inWindow = (t: number) => mine.some((w) => Math.abs((along === 'x' ? w.x : w.z) - t) < w.w / 2 + 0.09);
      for (const [t0, t1] of runs(side, len)) {
        let s0: number | null = null;
        for (let t = t0; t <= t1 + 1e-6; t += 0.02) {
          const ok = t < t1 - 1e-6 && !inWindow(t);
          if (ok && s0 === null) s0 = t;
          if (!ok && s0 !== null) { if (t - s0 > 0.25) piece('timber', side, s0, t, sill - 0.09, sill, 0, 0.05, frame(), along); s0 = null; }
        }
      }
    }
    for (const t of posts) {
      piece('timber', side, t - 0.09, t + 0.09, floor - 0.01, top - 0.05, 0, 0.16, frame(), 'y');
      if (Math.abs(t) > len - 0.2) continue;
      for (const dir of [-1, 1]) {
        if (!clear(t + dir * 0.55)) continue;
        const w = walls.find((x) => x.side === side)!, [ax, az] = w.at(t + dir * 0.06, 0.07), [bx, bz] = w.at(t + dir * 0.6, 0.07);
        R.timber.rod(ax, top - 0.72, az, bx, top - 0.17, bz, 0.05, 4, frame(), { flat: true });
      }
    }
  }
  // Joists across under the ceiling boards.
  for (const z of joistsOf(room)) R.timber.bx(-hw, top - 0.2, z - 0.06, hw, top - 0.05, z + 0.06, frame(), { grain: 'x', jit: 0.05, amp: 0.03 });
}

/**
 * Contact darkening and soot in a room (A135), as a vertex-colour factor for everything drawn inside it: floors darken
 * towards the walls and walls towards the floor and the ceiling, more in the corners; the hearth's wall is smoked black
 * above the fire and the floor before it dulled with ash. A point outside the room is left alone.
 */
export function roomShade(room: InteriorSpec, frame: THREE.Matrix4): (x: number, y: number, z: number) => number {
  const e = frame.clone().invert().elements, { hw, hd } = roomHalfSize(room), floor = room.floorTop, top = room.wallTop;
  const hearth = hearthOf(room), soot = hearth && room.building.kind !== 'bakery';
  return (wx, wy, wz) => {
    const x = e[0]! * wx + e[4]! * wy + e[8]! * wz + e[12]!, y = e[1]! * wx + e[5]! * wy + e[9]! * wz + e[13]!, z = e[2]! * wx + e[6]! * wy + e[10]! * wz + e[14]!;
    if (Math.abs(x) > hw + 0.03 || Math.abs(z) > hd + 0.03 || y < floor - 0.12 || y > top + 0.05) return 1;
    const ax = Math.max(0, hw - Math.abs(x)), az = Math.max(0, hd - Math.abs(z)), wall = Math.min(ax, az), corner = Math.max(ax, az);
    const up = Math.max(0, y - floor), down = Math.max(0, top - y);
    let k = 1 - 0.42 * Math.exp(-wall / 0.5 - up / 0.42) - 0.28 * Math.exp(-wall / 0.45 - down / 0.35) - 0.22 * Math.exp(-corner / 0.55);
    // A little darker the further from the hearth's side of the room.
    if (hearth) k *= 1 - 0.12 * Math.min(1, Math.hypot(x - hearth.stack.x, z - hearth.stack.z) / 6);
    if (soot) {
      const c = Math.cos(hearth.yaw), s = Math.sin(hearth.yaw), rx = x - hearth.stack.x, rz = z - hearth.stack.z;
      const lx = rx * c - rz * s, lz = rx * s + rz * c, h = y - floor;
      if (lz < HEARTH_SHAPE.front + 0.2) {
        const rise = h < HEARTH_SHAPE.mouthTop ? 0 : Math.min(1, (h - HEARTH_SHAPE.mouthTop) / 0.35);
        k *= 1 - 0.62 * rise * Math.exp(-(lx * lx) / (0.18 + 0.12 * Math.max(0, h - 1)));
      }
      if (h < 0.1 && lz < HEARTH_SHAPE.slab + 0.5) k *= 1 - 0.25 * Math.exp(-(lx * lx) / 0.5) * Math.min(1, Math.max(0, (HEARTH_SHAPE.slab + 0.5 - lz) / 0.5));
    }
    // A136: the plaster. Lime wash laid on unevenly, each panel between the studs its own shade, smoke under the
    // ceiling, and the boards overhead dark between the joists.
    const onWall = Math.min(ax, az) < 0.06 && y > floor + 1.0 && y < top - 0.06;
    if (onWall) {
      const t = ax < az ? z : x;
      k *= 0.9 + 0.1 * valueNoise(t * 1.6, y * 2.1) + 0.05 * (valueNoise(t * 5.3 + 7, y * 4.7) - 0.5);
      k *= 0.93 + 0.09 * hashUnit(Math.floor((t + 20) / 0.78) + (ax < az ? 0.5 : 0));
      k *= 1 - 0.22 * Math.max(0, (y - (top - 0.9)) / 0.9) ** 1.5;
      // A140: plank walls take the smoke harder and wider than lime wash (the woodcutter's).
      const planked = room.building.wall === 'timber';
      if (soot) k *= 1 - (planked ? 0.5 : 0.3) * Math.exp(-((x - hearth.stack.x) ** 2 + (z - hearth.stack.z) ** 2) / (planked ? 3.4 : 2.2)) * Math.min(1, Math.max(0, y - floor - (planked ? 0.8 : 1.1)));
    }
    if (y > top - 0.06 && y < top + 0.03) k *= 0.5 * (soot ? 1 - 0.25 * Math.exp(-((x - hearth.stack.x) ** 2 + (z - hearth.stack.z) ** 2) / 4) : 1);
    return Math.max(0.2, k);
  };
}

/**
 * A140: the lime wash's map turned and shifted differently on each wall face, and drifted slowly along it, so its 1.5 m
 * repeat does not line up from panel to panel. Seamless: each wall face is its own geometry, and the drift is smooth.
 */
function scatterLime(B: Region['lime'], from: number, seed: number) {
  const uv = B.uv.a, nr = B.nr.a;
  for (let i = from / 2; i < B.uv.n / 2; i++) {
    const face = (Math.round(Math.atan2(nr[i * 3]!, nr[i * 3 + 2]!) / (Math.PI / 2)) + 4) % 4 + (Math.abs(nr[i * 3 + 1]!) > 0.7 ? 4 : 0);
    const a = (hashUnit(seed * 31 + face * 7.3) - 0.5) * 1.1, c = Math.cos(a), s = Math.sin(a);
    const u = uv[i * 2]!, v = uv[i * 2 + 1]!;
    const du = 0.55 * (valueNoise(u * 0.6 + face * 9.1, v * 0.6) - 0.5), dv = 0.55 * (valueNoise(u * 0.6 + 31, v * 0.6 + face * 4.7) - 0.5);
    uv[i * 2] = c * u - s * v + hashUnit(seed * 13 + face) * 4 + du;
    uv[i * 2 + 1] = s * u + c * v + hashUnit(seed * 17 + face * 3) * 4 + dv;
  }
}

const hashUnit = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** Smooth value noise in [0, 1] (A136): the unevenness of a room's lime wash. */
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hashUnit(a * 57 + b * 131);
  return (h(ix, iy) * (1 - u) + h(ix + 1, iy) * u) * (1 - v) + (h(ix, iy + 1) * (1 - u) + h(ix + 1, iy + 1) * u) * v;
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
  // A132: a village house's own look; the roof's kind may differ from the spec's (nothing else reads it).
  const look = lookOf(b);
  const roofKind = look?.roof ?? b.roof;
  ctx.push(b.x, avg, b.z, b.yaw);
  // Everything drawn inside the room darkens towards its floor, walls and corners and is smoked by its fire (A135).
  ctx.shade = roomShade(room, ctx.matrix);
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
    // A136: finer cells (0.3 m) so the lime wash and smoke inside (roomShade) read; the outside takes the same cells.
    roomWalls(R.plaster, b.w, b.d, wallH, y0, t, room.door, jitterTone(TINT.plaster, rnd, 0.06), 0.3, openings);
    // A139: the lime wash inside, a skin 12 mm before the walls' inner faces in its own small texture, with the same
    // doorway and window openings. Its tint is taken from a hash, not `rnd`, so the building's sequence is unchanged.
    const limeFrom = R.lime.uv.n;
    roomWalls(R.lime, b.w - 2 * t, b.d - 2 * t, wallH, y0, 0.012, room.door, jitterTone(0xf2ead8, mulberry32(Math.floor(hash3(b.x, b.z, 41) * 1e9)), 0.05), 0.3, openings);
    scatterLime(R.lime, limeFrom, hash3(b.x, b.z, 47));
    timberFrame(R, rnd, b.w, b.d, wallH, y0, gap, openings);
  } else {
    roomWalls(R.stone, b.w, b.d, wallH, y0, t, room.door, jitterTone(TINT.stone, rnd, 0.05), 0.9, openings);
    quoins(R, rnd, b.w, b.d, wallH, y0, openings);
  }

  // Roof.
  const style = roofStyleOf(b);
  const roof = roofFor(R, roofKind, style, b.w, b.d, y0 + wallH, Math.floor(hash3(b.x, b.z, 5) * 1000),
    { pitch: roofKind === 'lean' ? 0.3 : style === 'thatch' ? 0.82 : undefined, ohx: look?.ohx, ohz: look?.ohz });
  roofWallInfill(R, roofKind, b.w, b.d, y0 + wallH, roof, wallMat(b));
  // A hipped house draws no gable posts or ridge beam, but takes their tones all the same, so its windows, shutters and
  // clutter fall where they did.
  if (b.wall !== 'stone' && b.roof === 'gable' && roofKind !== 'gable') for (let i = 0; i < 6; i++) rnd();
  if (b.wall !== 'stone' && roofKind === 'gable') {
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
  if (b.wall !== 'stone' && roofKind === 'gable') {
    const slope = Math.tan(roof.pitch);
    for (const sx of [-1, 1]) for (const fraction of [-0.55, 0.55]) {
      const x = sx * (b.w / 2 + 0.13), z = fraction * b.d / 2;
      const lower = y0 + wallH - 0.02, upper = roof.ridgeY - Math.abs(z) * slope - 0.13;
      if (upper > lower) R.timber.box(0.11, upper - lower, 0.11, x, lower, z,
        structureTint, { grain: 'y', jit: 0.025, amp: 0.025 });
    }
  }
  // Ridge sag: a beam under the ridge that visibly dips.
  if (b.roof === 'gable' && roofKind !== 'gable') rnd();
  if (roofKind === 'gable') R.timber.bx(-b.w / 2 - 0.2, roof.ridgeY - 0.35, -0.08, b.w / 2 + 0.2, roof.ridgeY - 0.2, 0.08, jitterTone(TINT.woodDark, rnd, 0.1), { jit: 0.08 });

  // Door and windows. The leaf hangs apart from the shell, hinged at the doorway's inner face, so it can swing.
  rnd(); // Retain the existing decorative RNG sequence after the now-shared, authored door position.
  const doorOpts = { x: doorX, y: y0, z: b.d / 2 + 0.03, stone: b.wall === 'stone', leafTint: look?.door };
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
      windowAt(R, rnd, { x: wx, y: y0 + wallH * 0.45, z: b.d / 2 + 0.02, shutters: true, stone: b.wall === 'stone', opening: true, shutterTint: look?.shutter });
      inside(wx, b.d / 2 - t - 0.005, Math.PI);
      opening('front', wx);
    }
  }
  const eastZ = sideWindowZ(room, 'east', (rnd() - 0.5) * b.d * 0.4);
  windowAt(R, rnd, { x: b.w / 2 + 0.02, y: y0 + wallH * 0.45, z: eastZ, ry: Math.PI / 2, stone: b.wall === 'stone', opening: true });
  inside(b.w / 2 - t - 0.005, eastZ, -Math.PI / 2);
  opening('east', eastZ);
  const westZ = sideWindowZ(room, 'west', (rnd() - 0.5) * b.d * 0.4);
  windowAt(R, rnd, { x: -b.w / 2 - 0.02, y: y0 + wallH * 0.45, z: westZ, ry: -Math.PI / 2, stone: b.wall === 'stone', opening: true });
  inside(-b.w / 2 + t + 0.005, westZ, Math.PI / 2);
  opening('west', westZ);
  for (const side of [-1, 1]) {
    windowAt(R, rnd, { x: side * b.w * 0.24, y: y0 + wallH * 0.45, z: -b.d / 2 - 0.02, ry: Math.PI, stone: b.wall === 'stone', opening: true });
    inside(side * b.w * 0.24, -b.d / 2 + t + 0.005, 0);
    opening('back', side * b.w * 0.24);
  }
  roomInterior(R, room, windows, 'planks', true, roofKind === 'gable' ? roof : undefined);

  // Chimney (A135): the stack of the hearth inside rises up the outside of the same wall, from the ground to the eaves
  // as a stone breast proud of the wall, then on up through the roof, on the centre the room's breast is built on.
  const chimneyAt = chimneyOf(b), hearthWall = hearthOf(room)?.wall;
  if (chimneyAt && hearthWall) {
    const cw = look?.chimneyW ?? 0.75, out = 0.06 + cw / 2;
    const [x0, x1, z0, z1] = hearthWall === 'back' ? [chimneyAt.x - cw / 2, chimneyAt.x + cw / 2, chimneyAt.z - out + 0.06, -b.d / 2 + 0.04]
      : hearthWall === 'left' ? [chimneyAt.x - out + 0.06, -b.w / 2 + 0.04, chimneyAt.z - cw / 2, chimneyAt.z + cw / 2]
      : [b.w / 2 - 0.04, chimneyAt.x + out - 0.06, chimneyAt.z - cw / 2, chimneyAt.z + cw / 2];
    const tone = jitterTone(TINT.stone, rnd, 0.1);
    R.stone.bx(Math.min(x0, x1), -sink, Math.min(z0, z1), Math.max(x0, x1), y0 + wallH + 0.05, Math.max(z0, z1), tone, { sub: 0.5, jit: 0.08, amp: 0.06 });
    chimney(R, rnd, chimneyAt.x, chimneyAt.z, y0 + wallH + 0.05, roof.rise + 1.05 + (look?.chimneyUp ?? 0), look?.chimneyW);
  }

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
  if (look) {
    // A132: the house's own look and its household's yard, on their own random sequence.
    const lr = lookRnd(b);
    if (look.plinth > 0) plinthCourse(R, lr, b, y0, look.plinth, gap);
    if (look.hood) doorHood(R, lr, b, doorX, y0 + gap.top + 0.42);
    if (look.dormer && roofKind === 'gable') {
      const thatch = style === 'thatch';
      dormer(R, lr, b, doorX + (doorX > 0 ? -0.2 : 0.2), y0 + wallH, roof, thatch ? 'thatch' : 'planks', thatch ? 0xb39a60 : 0x84715a, b.wall === 'plaster' ? 'plaster' : 'planks');
    }
    if (look.antlers) antlers(R, lr, doorX, y0 + gap.top + 0.3, b.d / 2 + 0.06);
    drawHouseYard(R, b, (author) => groundExteriorProp(R, terrain, author));
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
    // The hanging sign (A136): a wrought-iron bracket out from the east end, its painted board swinging on chains.
    const sign = innSign(R, b, y0, out.swinging ? out.apart : undefined);
    if (sign) out.swinging!.push(sign);
  }
  if (b.kind === 'bakery') {
    // A bread oven built against the side wall: stone body, domed top, dark mouth.
    groundExteriorProp(R, terrain, () => {
      R.stone.box(1.6, 0.9, 1.4, b.w / 2 + 0.9, 0, -0.4, jitterTone(TINT.stone, rnd, 0.1), { jit: 0.1 });
      R.stone.blob(0.85, 0.5, 0.72, b.w / 2 + 0.9, 0.85, -0.4, jitterTone(TINT.stone, rnd, 0.1), { seg: 9, rings: 4, lump: 0.1, seed: 4, smooth: true });
      R.vc.box(0.46, 0.34, 0.06, b.w / 2 + 0.9, 0.38, 0.33, 0x0c0a08, { jit: 0 });
    });
  }
  ctx.shade = null;
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
