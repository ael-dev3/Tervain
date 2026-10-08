import * as THREE from 'three';
import { fromBuildingLocal, type InteriorSpec } from '../world/interiors';
import type { DoorLeaf } from './buildings';

/** Doors (A66): how near a doorway someone opens it, how long it stays open after, and how far and fast it swings. */
export const DOOR_REACH = 2.4, DOOR_LINGER = 1.5, DOOR_OPENING = 0.6, DOOR_CLOSING = 0.9, DOOR_SWING = 1.66;

export interface DoorEvent { at: THREE.Vector3; open: boolean }

/**
 * The rooms' doors (A66): each opens when someone comes within reach of its doorway and shuts a moment after the last of
 * them has gone, turning inward about its hinge. Doors have no collider: they open before anyone reaches them.
 */
export class DoorSwings {
  private readonly swings = new Map<DoorLeaf, { open: number; idle: number }>();

  constructor(private readonly leaves: readonly DoorLeaf[]) {}

  /** How far a room's door stands open, 0 shut .. 1 wide. */
  openness(room: InteriorSpec): number {
    for (const [leaf, swing] of this.swings) if (leaf.room === room) return swing.open;
    return 0;
  }

  /** Swing every door for those near it; returns where a door began to open or fell shut, for its sound. */
  update(dt: number, visitors: readonly { x: number; z: number }[]): DoorEvent[] {
    const events: DoorEvent[] = [];
    const step = Math.max(0, dt);
    for (const leaf of this.leaves) {
      const room = leaf.room, b = room.building;
      const doorway = fromBuildingLocal(b, room.door.x, b.d / 2 - room.wall / 2);
      const near = visitors.some((p) => Math.hypot(p.x - doorway.x, p.z - doorway.z) < DOOR_REACH);
      const swing = this.swings.get(leaf) ?? { open: 0, idle: Infinity };
      swing.idle = near ? 0 : swing.idle + step;
      const was = swing.open;
      swing.open = swing.idle < DOOR_LINGER ? Math.min(1, was + step / DOOR_OPENING) : Math.max(0, was - step / DOOR_CLOSING);
      if ((was === 0) !== (swing.open === 0)) events.push({ at: new THREE.Vector3(doorway.x, leaf.pivot.position.y + 1.2, doorway.z), open: swing.open > 0 });
      this.swings.set(leaf, swing);
      leaf.pivot.rotation.y = b.yaw + DOOR_SWING * swing.open * swing.open * (3 - 2 * swing.open);
    }
    return events;
  }
}
