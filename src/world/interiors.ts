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

/** Rooms with a hearth have a chimney: where its stack stands on the floor, in the building's frame. */
export function chimneyOf(b: BuildingSpec): { x: number; z: number } | null {
  return b.kind === 'lodge' || b.kind === 'office' || b.kind === 'bunks' || b.kind === 'store' || b.kind === 'shrine' || b.kind === 'archive'
    ? null : { x: b.w * 0.28, z: -b.d * 0.12 };
}

/** Half the side of a chimney stack where it stands in a room. */
export const CHIMNEY_STACK = 0.43;

/** The fireplace built against a chimney stack: half its width, its depth and its height. */
export const FIREPLACE = { halfWidth: 0.68, depth: 0.5, height: 1.32 } as const;

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
  /** A depth `depth` and half width `halfWidth` against the stack: its footprint, in the building's frame. */
  footprint(halfWidth: number, depth: number): { x0: number; x1: number; z0: number; z1: number };
  /** A point `out` before the stack's face, at the fire's middle. */
  before(out: number): { x: number; z: number };
}

/**
 * A room's hearth: its chimney stack and which way its fire faces. It faces the front wall, unless there it would crowd
 * the way in from the doorway; then it faces the middle of the room.
 */
export function hearthOf(room: InteriorSpec): Hearth | null {
  const stack = chimneyOf(room.building);
  if (!stack) return null;
  const make = (yaw: number): Hearth => {
    const fx = Math.round(Math.sin(yaw)), fz = Math.round(Math.cos(yaw));
    return {
      stack, yaw,
      footprint(halfWidth, depth) {
        const near = CHIMNEY_STACK, far = CHIMNEY_STACK + depth;
        if (fz !== 0) {
          const z0 = stack.z + fz * near, z1 = stack.z + fz * far;
          return { x0: stack.x - halfWidth, x1: stack.x + halfWidth, z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
        }
        const x0 = stack.x + fx * near, x1 = stack.x + fx * far;
        return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: stack.z - halfWidth, z1: stack.z + halfWidth };
      },
      before(out) { return { x: stack.x + fx * (CHIMNEY_STACK + out), z: stack.z + fz * (CHIMNEY_STACK + out) }; },
    };
  };
  const front = make(0), clear = doorwayClear(room), f = front.footprint(FIREPLACE.halfWidth + 0.1, FIREPLACE.depth + 0.5);
  const crowds = f.x0 < clear.x1 && clear.x0 < f.x1 && f.z0 < clear.z1 && clear.z0 < f.z1;
  return crowds ? make(stack.x > 0 ? -Math.PI / 2 : Math.PI / 2) : front;
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

export interface RoomLocator {
  /** The room whose floor or doorway holds this point, if any. */
  at(x: number, z: number): InteriorSpec | null;
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
    floorAt(x, z) { const room = at(x, z); return room ? base(room) + room.floorTop : null; },
    base,
  };
}
