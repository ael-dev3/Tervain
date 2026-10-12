import { BUILDINGS, type BuildingSpec } from './layout';
import { buildingEntry, buildingGround } from './buildingEntries';

/**
 * The insides of the buildings (A66): every ordinary building and the shrine hall can be walked into. The archive keeps
 * its own room (ARCHIVE_ROOM) and the lighthouse compound its own (lighthouse.ts). One description serves the shell,
 * the colliders, the floor underfoot, the furniture, the light and the sound, so they agree.
 */
export interface InteriorSpec {
  building: BuildingSpec;
  /** Wall thickness, built inward from the footprint line, metres. */
  wall: number;
  /** Heights above the building's ground frame (its averaged ground): the walls' foot, the floor's top, the wall top. */
  wallBase: number;
  floorTop: number;
  wallTop: number;
  /** The doorway in the front (+z) wall, local: its centre, half its width, and its top above the wall base. */
  door: { x: number; halfWidth: number; height: number };
}

/** Ordinary buildings stand on a 0.42 m plinth; their plank floor lies just above it, level with the doorstep. */
const ORDINARY = { wallBase: 0.4, floorTop: 0.46 } as const;
/** The shrine hall's walls rise from 0.5 m; its flagged floor lies on its 0.72 m plinth, a step up from the threshold. */
const HALL = { wallBase: 0.5, floorTop: 0.74, wall: 0.5 } as const;

export function interiorOf(b: BuildingSpec): InteriorSpec | null {
  if (b.kind === 'archive') return null;
  const entry = buildingEntry(b);
  if (b.kind === 'shrine') {
    return { building: b, wall: HALL.wall, wallBase: HALL.wallBase, floorTop: HALL.floorTop, wallTop: HALL.wallBase + b.h,
      door: { x: entry.x, halfWidth: entry.w / 2, height: entry.h } };
  }
  return { building: b, wall: b.wall === 'stone' ? 0.34 : 0.24, wallBase: ORDINARY.wallBase, floorTop: ORDINARY.floorTop,
    wallTop: ORDINARY.wallBase + b.h, door: { x: entry.x, halfWidth: entry.w / 2, height: entry.h } };
}

export const INTERIORS: readonly InteriorSpec[] = BUILDINGS.map(interiorOf).filter((room): room is InteriorSpec => room !== null);

/** A building's room: the one shared description (not a fresh copy), or null for the archive. */
export function roomOf(b: BuildingSpec): InteriorSpec | null {
  return INTERIORS.find((room) => room.building === b) ?? null;
}

/** A room's walls, as seen from inside: the hearth stands against one of them. */
export type HearthWall = 'back' | 'left' | 'right';

/**
 * Where each village house keeps its hearth (A123, against a wall since A135): which wall, and where along it as a
 * fraction of the room's half length (back: -1 left .. 1 right; sides: -1 back .. 1 front). A fireplace standing free
 * in the room read as a stone column; now each one is a chimney breast built out of a wall, its stack carried up inside
 * the wall and out through the roof where the chimney stands outside. The side-wall hearths keep to the back corner,
 * clear of the side windows, and the back-wall ones to the middle, clear of the two back windows.
 */
const HEARTH_AT: Record<string, { wall: HearthWall; along: number }> = {
  house_a: { wall: 'right', along: -1 }, house_b: { wall: 'left', along: -1 }, house_c: { wall: 'back', along: 0.1 },
  house_d: { wall: 'left', along: -1 }, house_e: { wall: 'back', along: -0.14 }, house_f: { wall: 'back', along: -0.1 },
};

/** How far a chimney breast stands out from the inner face of its wall into the room, metres. */
export const BREAST_DEPTH = 0.3;

/** Half the side of a chimney stack (its centre lies inside the wall; see BREAST_DEPTH). */
export const CHIMNEY_STACK = 0.43;

/** The fireplace built out before a chimney breast: half its width, its depth and its height. */
export const FIREPLACE = { halfWidth: 0.68, depth: 0.5, height: 1.32 } as const;

/**
 * The open hearth (A135), in the fire's own frame (x across the mouth, z out from the stack's centre, y above the
 * floor): the mouth's half width and height, the firebox's back, the mantel shelf's top and how far it reaches, the
 * fire's middle, and where the pot stands on its trivet. The wall's inner face is at z = CHIMNEY_STACK - BREAST_DEPTH.
 */
export const HEARTH_SHAPE = {
  mouth: 0.42, mouthTop: 0.8, back: 0.24, front: 0.43 + 0.5, mantelY: 1.08, mantelFront: 1.04, slab: 1.36,
  fire: { z: 0.5, y: 0.1 },
} as const;

/** Where the hearth's own things go (dressing.ts), in the fire's frame. */
export const HEARTH_DRESS = {
  pot: { x: 0.6, z: 1.13, y: 0.1 },
  mantel: { half: 0.6, z: 0.86, y: HEARTH_SHAPE.mantelY },
} as const;

const HAS_HEARTH = (b: BuildingSpec) => !(b.kind === 'lodge' || b.kind === 'office' || b.kind === 'bunks' || b.kind === 'store'
  || b.kind === 'shrine' || b.kind === 'archive');

/** Which wall a building's hearth stands against and where along it (rooms other than the houses: the back wall's middle). */
export function hearthWallOf(b: BuildingSpec): { wall: HearthWall; along: number } | null {
  return HAS_HEARTH(b) ? HEARTH_AT[b.id] ?? { wall: 'back', along: 0 } : null;
}

/**
 * Rooms with a hearth have a chimney: the centre of its stack in the building's frame. It lies just inside the wall, so
 * the breast stands BREAST_DEPTH into the room and the stack's outer half rises up the outside of the wall, where the
 * exterior chimney (buildings.ts) is drawn on the same centre.
 */
export function chimneyOf(b: BuildingSpec): { x: number; z: number } | null {
  const at = hearthWallOf(b);
  if (!at) return null;
  const t = b.wall === 'stone' ? 0.34 : 0.24, hw = b.w / 2 - t, hd = b.d / 2 - t, inset = CHIMNEY_STACK - BREAST_DEPTH;
  // Along a side wall, -1 puts the fireplace's edge just off the back wall.
  const sideZ = (along: number) => along * (hd - FIREPLACE.halfWidth - 0.03);
  switch (at.wall) {
    case 'back': return { x: at.along * hw, z: -hd - inset };
    case 'left': return { x: -hw - inset, z: sideZ(at.along) };
    case 'right': return { x: hw + inset, z: sideZ(at.along) };
  }
}

/** The clear way in through a room's doorway (local): nothing stands here. */
export function doorwayClear(room: InteriorSpec): { x0: number; x1: number; z0: number; z1: number } {
  const { hd } = roomHalfSize(room), { x, halfWidth } = room.door;
  return { x0: x - halfWidth - 0.45, x1: x + halfWidth + 0.45, z0: hd - 1.45, z1: hd + 1 };
}

export interface Hearth {
  /** The chimney stack's centre (building frame). */
  stack: { x: number; z: number };
  /** Which way the fire faces: its front looks along (sin yaw, cos yaw); 0 is towards the front wall. */
  yaw: number;
  /** The wall its breast is built out of. */
  wall: HearthWall;
  /** The breast's footprint inside the room (the stack clipped to the wall's inner face), in the building's frame. */
  breast: { x0: number; x1: number; z0: number; z1: number };
  /** A depth `depth` and half width `halfWidth` against the stack: its footprint, in the building's frame. */
  footprint(halfWidth: number, depth: number): { x0: number; x1: number; z0: number; z1: number };
  /** A point `out` before the stack's face, at the fire's middle. */
  before(out: number): { x: number; z: number };
  /** A point in the fire's own frame (x across the mouth, z out from the stack's centre), in the building's frame. */
  at(lx: number, lz: number): { x: number; z: number };
}

/** A room's hearth: its chimney stack, the wall it stands against, and which way its fire faces (away from that wall). */
export function hearthOf(room: InteriorSpec): Hearth | null {
  const stack = chimneyOf(room.building), at = hearthWallOf(room.building);
  if (!stack || !at) return null;
  const yaw = at.wall === 'back' ? 0 : at.wall === 'left' ? Math.PI / 2 : -Math.PI / 2;
  const fx = Math.round(Math.sin(yaw)), fz = Math.round(Math.cos(yaw)), c = CHIMNEY_STACK;
  const footprint = (halfWidth: number, depth: number) => {
    const near = CHIMNEY_STACK, far = CHIMNEY_STACK + depth;
    if (fz !== 0) {
      const z0 = stack.z + fz * near, z1 = stack.z + fz * far;
      return { x0: stack.x - halfWidth, x1: stack.x + halfWidth, z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
    }
    const x0 = stack.x + fx * near, x1 = stack.x + fx * far;
    return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: stack.z - halfWidth, z1: stack.z + halfWidth };
  };
  const { hw, hd } = roomHalfSize(room);
  const breast = { x0: Math.max(-hw, stack.x - c), x1: Math.min(hw, stack.x + c), z0: Math.max(-hd, stack.z - c), z1: Math.min(hd, stack.z + c) };
  return {
    stack, yaw, wall: at.wall, breast, footprint,
    before(out) { return { x: stack.x + fx * (CHIMNEY_STACK + out), z: stack.z + fz * (CHIMNEY_STACK + out) }; },
    at(lx, lz) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      return { x: stack.x + lx * c + lz * s, z: stack.z - lx * s + lz * c };
    },
  };
}

/** A world point in a building's own frame (x along its front, z out of its front). */
export function toBuildingLocal(b: Pick<BuildingSpec, 'x' | 'z' | 'yaw'>, x: number, z: number): { x: number; z: number } {
  const dx = x - b.x, dz = z - b.z, c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

/** A point in a building's own frame, in the world. */
export function fromBuildingLocal(b: Pick<BuildingSpec, 'x' | 'z' | 'yaw'>, x: number, z: number): { x: number; z: number } {
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  return { x: b.x + x * c + z * s, z: b.z - x * s + z * c };
}

/** The room's clear floor, local: half its width and depth inside the walls. */
export function roomHalfSize(room: InteriorSpec): { hw: number; hd: number } {
  return { hw: room.building.w / 2 - room.wall, hd: room.building.d / 2 - room.wall };
}

/** Whether a local point lies on the room's floor or in its doorway (through the wall, out to the doorstep). */
export function onRoomFloor(room: InteriorSpec, lx: number, lz: number, margin = 0): boolean {
  const { hw, hd } = roomHalfSize(room);
  if (Math.abs(lx) <= hw + margin && Math.abs(lz) <= hd + margin) return true;
  return Math.abs(lx - room.door.x) <= room.door.halfWidth + margin && lz >= hd - 1e-6 && lz <= room.building.d / 2 + 0.1 + margin;
}

/** How far below the foot of a room's walls, and above its ceiling, a point still counts as in it (metres). */
const WITHIN_BELOW = 0.5, WITHIN_ABOVE = 0.25;

export interface RoomLocator {
  /** The room whose floor or doorway holds this point, if any. */
  at(x: number, z: number): InteriorSpec | null;
  /**
   * The room a point in the world is actually inside: over its floor or doorway, and between the foot of its walls and
   * its ceiling at the wall top. A point above the roof or under the floor is outside (A70).
   */
  within(x: number, y: number, z: number): InteriorSpec | null;
  /** The height of that floor, in the world. */
  floorAt(x: number, z: number): number | null;
  /** A room's ground frame: the averaged ground its walls and floor are measured from. */
  base(room: InteriorSpec): number;
}

/** Floors and rooms over a terrain; the ground frames are measured once (the same five samples as the rendered shell). */
export function roomLocator(heightAt: (x: number, z: number) => number): RoomLocator {
  const bases = new Map<InteriorSpec, number>();
  const base = (room: InteriorSpec) => {
    let y = bases.get(room);
    if (y === undefined) { y = buildingGround(heightAt, room.building).avg; bases.set(room, y); }
    return y;
  };
  const at = (x: number, z: number) => {
    for (const room of INTERIORS) {
      const b = room.building;
      if (Math.abs(x - b.x) > (b.w + b.d) / 2 + 0.2 || Math.abs(z - b.z) > (b.w + b.d) / 2 + 0.2) continue;
      const local = toBuildingLocal(b, x, z);
      if (onRoomFloor(room, local.x, local.z)) return room;
    }
    return null;
  };
  return {
    at,
    within(x, y, z) {
      const room = at(x, z);
      if (!room) return null;
      const ground = base(room);
      return y >= ground + room.wallBase - WITHIN_BELOW && y <= ground + room.wallTop + WITHIN_ABOVE ? room : null;
    },
    floorAt(x, z) { const room = at(x, z); return room ? base(room) + room.floorTop : null; },
    base,
  };
}

/**
 * The ceiling joists of a room (A135): light timbers across the room under its boards, running along x, at these local
 * z (evenly spaced, about 0.6 m apart). Things are hung from them (dressing.ts) and they are drawn in buildings.ts.
 */
export function joistsOf(room: InteriorSpec): number[] {
  const { hd } = roomHalfSize(room), n = Math.max(2, Math.round((2 * hd) / 0.6));
  return Array.from({ length: n - 1 }, (_, i) => -hd + ((i + 1) * 2 * hd) / n);
}

/**
 * Where a side window falls (A135): `z` as the building's random sequence put it, moved forward clear of the chimney
 * where the hearth stands against that side (east is the room's right, +x). Half a window is 0.36 m; the chimney
 * outside is at most 0.5 m wide.
 */
export function sideWindowZ(room: InteriorSpec, side: 'east' | 'west', z: number): number {
  const hearth = hearthOf(room);
  if (!hearth || hearth.wall !== (side === 'east' ? 'right' : 'left')) return z;
  return Math.max(z, hearth.stack.z + CHIMNEY_STACK + 0.36 + 0.12);
}
