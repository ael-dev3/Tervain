import type { Colliders, VerticalBounds } from '../world/colliders';
import { INTERIORS, onRoomFloor, roomHalfSize, toBuildingLocal, type InteriorSpec } from '../world/interiors';

/**
 * Riding the saddled deer (A71): how the deer answers the reins, how big a body it is, how long the hero takes to get up
 * and down, where the camera sits and how long it can gallop. Pure helpers, so the feel is testable without a scene.
 */
export const RIDE = {
  /** Walking and galloping pace, and the slow back-up when steered straight behind (m/s). */
  walk: 2.1, run: 6.2, back: 0.9,
  /** Speeding up and slowing down (m/s²): it gathers itself, and pulls up a little quicker. */
  accel: 3.4, brake: 6.5,
  /** Most it can turn (rad/s): sharp from a standstill, wide at a gallop. */
  turnStill: 2.4, turnRun: 1.15,
  /** Input this far behind the deer's facing (rad) backs it up instead of turning it round. */
  backCone: 2.5,
  /** How far the rider leans into a turn (rad per rad/s × m/s), and at most. */
  lean: 0.045, leanMax: 0.24,
} as const;

/** The deer's body about the saddle, metres along its facing; it is checked at its nose, middle and rump. */
export const DEER_BODY = { front: 1.0, back: 0.8, radius: 0.24, low: 0.35, high: 1.7 } as const;

/** Getting up takes this long; the walk to the deer's side gives up after `approachMax` (s); getting down. */
export const MOUNT_TIMES = { swing: 0.8, approachMax: 4, descend: 0.6 } as const;
/** How far from the saddle (to the deer's side) the hero stands to get up or down (m). */
export const MOUNT_SIDE = 0.95;

/** The camera rides further back and higher while mounted (m), easing in at `rate` per second. */
export const RIDE_CAMERA = { back: 2.2, up: 0.85, rate: 3 } as const;

/** Gallop stamina: drains while galloping, recovers walking or standing; spent, the deer will not gallop until `resume`. */
export const MOUNT_STAMINA = { max: 100, drain: 10, recover: 15, spent: 4, resume: 30 } as const;

export interface RideMotion { speed: number; yaw: number }

/**
 * One step of the reins. `dirX/dirZ` is the wanted way of travel (unit), `mag` how hard it is pushed. The deer turns
 * toward it at a bounded rate and speeds up or slows down toward its pace; steered straight behind it backs up slowly.
 */
export function steerMount(state: RideMotion, dirX: number, dirZ: number, mag: number, gallop: boolean, dt: number): RideMotion & { turn: number } {
  let target = 0, turn = 0;
  const pace = Math.min(1, Math.abs(state.speed) / RIDE.run);
  const maxTurn = (RIDE.turnStill + (RIDE.turnRun - RIDE.turnStill) * pace) * dt;
  if (mag > 0.05) {
    const wanted = Math.atan2(dirX, dirZ);
    const diff = Math.atan2(Math.sin(wanted - state.yaw), Math.cos(wanted - state.yaw));
    if (Math.abs(diff) > RIDE.backCone && state.speed < 0.5) target = -RIDE.back * mag;
    else {
      turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
      target = (gallop ? RIDE.run : RIDE.walk) * mag * Math.max(0.25, Math.cos(diff));
    }
  }
  const rising = Math.abs(target) > Math.abs(state.speed) && Math.sign(target) !== -Math.sign(state.speed);
  const rate = (rising ? RIDE.accel : RIDE.brake) * dt;
  const speed = state.speed + Math.max(-rate, Math.min(rate, target - state.speed));
  const yaw = Math.atan2(Math.sin(state.yaw + turn), Math.cos(state.yaw + turn));
  return { speed, yaw, turn: dt > 0 ? turn / dt : 0 };
}

/** The three points along the deer's spine its body is checked at. */
export function deerBodyPoints(x: number, z: number, yaw: number): { x: number; z: number }[] {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  return [
    { x: x + fx * DEER_BODY.front, z: z + fz * DEER_BODY.front },
    { x, z },
    { x: x - fx * DEER_BODY.back, z: z - fz * DEER_BODY.back },
  ];
}

/** The room whose floor or doorway (out to the doorstep, plus `margin`) holds this point. */
export function roomAtDoor(x: number, z: number, margin = 0.15): InteriorSpec | null {
  for (const room of INTERIORS) {
    const b = room.building;
    if (Math.abs(x - b.x) > b.w + b.d + 3 || Math.abs(z - b.z) > b.w + b.d + 3) continue;
    const l = toBuildingLocal(b, x, z);
    if (onRoomFloor(room, l.x, l.z, margin)) return room;
  }
  return null;
}

/** A doorway within `reach` of the front of the building: where a rider is told to get down to go in. */
export function doorwayAhead(x: number, z: number, reach = 1.6): InteriorSpec | null {
  for (const room of INTERIORS) {
    const b = room.building;
    if (Math.abs(x - b.x) > b.w + b.d + 4 || Math.abs(z - b.z) > b.w + b.d + 4) continue;
    const l = toBuildingLocal(b, x, z), { hd } = roomHalfSize(room);
    if (Math.abs(l.x - room.door.x) <= room.door.halfWidth + 0.6 && l.z >= hd && l.z <= b.d / 2 + reach) return room;
  }
  return null;
}

/** Whether the deer, standing at (x, feet y, z) facing yaw, would be inside scenery or through a doorway. */
export function deerBodyBlocked(colliders: Pick<Colliders, 'blocked'>, x: number, y: number, z: number, yaw: number, excludePrecise = false): boolean {
  const bounds: VerticalBounds = { minY: y + DEER_BODY.low, maxY: y + DEER_BODY.high, excludePrecise };
  for (const p of deerBodyPoints(x, z, yaw)) {
    if (colliders.blocked(p.x, p.z, DEER_BODY.radius, bounds)) return true;
    if (roomAtDoor(p.x, p.z)) return true;
  }
  return false;
}

/**
 * How deep in trouble the deer stands (A71): how many of its spine points are inside scenery, plus how many are in a
 * doorway or on a room floor. A ride that starts in trouble may only move in ways that do not make it worse.
 */
export function deerBodyOverlap(colliders: Pick<Colliders, 'blocked'>, x: number, y: number, z: number, yaw: number, excludePrecise = false): { scenery: number; rooms: number } {
  const bounds: VerticalBounds = { minY: y + DEER_BODY.low, maxY: y + DEER_BODY.high, excludePrecise };
  let scenery = 0, rooms = 0;
  for (const p of deerBodyPoints(x, z, yaw)) {
    if (colliders.blocked(p.x, p.z, DEER_BODY.radius, bounds)) scenery++;
    if (roomAtDoor(p.x, p.z)) rooms++;
  }
  return { scenery, rooms };
}

/** The gallop stamina after one step: drained galloping, recovering otherwise. */
export function mountStaminaStep(stamina: number, galloping: boolean, dt: number): number {
  return galloping ? Math.max(0, stamina - MOUNT_STAMINA.drain * dt) : Math.min(MOUNT_STAMINA.max, stamina + MOUNT_STAMINA.recover * dt);
}

/** How high the saddle lifts the rider as the deer's legs strike: twice a stride, more at a gallop. */
export function gaitBob(phase: number, speed: number): number {
  const amp = Math.min(0.065, 0.012 + Math.abs(speed) * 0.0085);
  return Math.abs(speed) < 0.15 ? 0 : amp * (0.5 - 0.5 * Math.cos(phase * Math.PI * 4));
}
