import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { DoorLeaf } from '../../src/presentation/buildings';
import { DOOR_LINGER, DOOR_REACH, DOOR_SWING, DoorSwings } from '../../src/presentation/doors';
import { fromBuildingLocal, INTERIORS } from '../../src/world/interiors';

const room = INTERIORS.find((r) => r.building.id === 'house_c')!;
const leaf = (): DoorLeaf => {
  const pivot = new THREE.Group();
  pivot.rotation.y = room.building.yaw;
  return { room, pivot };
};
const doorway = fromBuildingLocal(room.building, room.door.x, room.building.d / 2 - room.wall / 2);

describe('the rooms\' doors (A66)', () => {
  it('swing inward for someone at the doorway and shut behind them once they have gone', () => {
    const door = leaf(), swings = new DoorSwings([door]);
    const far = { x: doorway.x + DOOR_REACH + 3, z: doorway.z }, near = { x: doorway.x + 0.5, z: doorway.z };
    expect(swings.update(1 / 30, [far])).toEqual([]);
    expect(swings.openness(room)).toBe(0);
    const opened = swings.update(1 / 30, [near]);
    expect(opened).toHaveLength(1);
    expect(opened[0]!.open).toBe(true);
    for (let i = 0; i < 30; i++) expect(swings.update(1 / 30, [near])).toEqual([]);
    expect(swings.openness(room)).toBe(1);
    expect(door.pivot.rotation.y).toBeCloseTo(room.building.yaw + DOOR_SWING, 6);
    // It lingers open a moment after they leave, then shuts, once.
    let events: { open: boolean }[] = [];
    for (let i = 0; i < Math.ceil(DOOR_LINGER * 30) - 2; i++) events.push(...swings.update(1 / 30, [far]));
    expect(swings.openness(room)).toBe(1);
    for (let i = 0; i < 60; i++) events.push(...swings.update(1 / 30, [far]));
    expect(events.map((e) => e.open)).toEqual([false]);
    expect(swings.openness(room)).toBe(0);
    expect(door.pivot.rotation.y).toBeCloseTo(room.building.yaw, 6);
  });

  it('stays still while the world is paused', () => {
    const swings = new DoorSwings([leaf()]);
    expect(swings.update(0, [doorway])).toEqual([]);
    expect(swings.openness(room)).toBe(0);
  });
});
