import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { InteriorLight } from '../../src/presentation/interiorLight';
import { chimneyOf, fromBuildingLocal, hearthOf, INTERIORS, roomLocator } from '../../src/world/interiors';

const rooms = roomLocator(() => 0);
const run = (light: InteriorLight, at: { x: number; z: number }, seconds: number, night = 0) => {
  let indoors = 0;
  for (let i = 0; i < seconds * 30; i++) indoors = light.update(1 / 30, new THREE.Vector3(at.x, 1.6, at.z), night, i / 30);
  return indoors;
};

describe('light inside the rooms (A66)', () => {
  it('glows from the hearth while the camera is in a room, warmer at night, and fades on leaving', () => {
    const room = INTERIORS.find((r) => r.building.id === 'house_a')!, light = new InteriorLight(rooms);
    const inside = fromBuildingLocal(room.building, room.door.x, 0.5);
    expect(run(light, inside, 2)).toBeGreaterThan(0.99);
    const front = hearthOf(room)!.before(0.45), fire = fromBuildingLocal(room.building, front.x, front.z);
    expect(Math.hypot(light.light.position.x - fire.x, light.light.position.z - fire.z)).toBeLessThan(1e-6);
    const day = light.light.intensity;
    run(light, inside, 1, 1);
    expect(light.light.intensity).toBeGreaterThan(day * 1.8);
    const outside = fromBuildingLocal(room.building, room.door.x, room.building.d / 2 + 4);
    expect(run(light, outside, 3)).toBeLessThan(1e-3);
    expect(light.light.intensity).toBe(0);
  });

  it('hangs from the beams in a room without a hearth', () => {
    const room = INTERIORS.find((r) => r.building.id === 'crew_bunks')!, light = new InteriorLight(rooms);
    run(light, fromBuildingLocal(room.building, room.door.x, 0), 2);
    expect(chimneyOf(room.building)).toBeNull();
    expect(light.light.position.y).toBeCloseTo(room.wallTop - 0.6, 6);
  });
});

describe('indoors only within the walls (A70)', () => {
  it('treats a camera above the roof or under the floor as outdoors, over the very same floor', () => {
    const room = INTERIORS.find((r) => r.building.id === 'reeve_house')!, p = fromBuildingLocal(room.building, 0, 0);
    const at = (y: number) => rooms.within(p.x, y, p.z);
    expect(at(room.floorTop + 1.6)).toBe(room);
    expect(at(room.wallTop - 0.05)).toBe(room);
    expect(at(room.wallTop + 20)).toBeNull();
    expect(at(room.wallBase - 2)).toBeNull();
    const above = new InteriorLight(rooms);
    let indoors = 0;
    for (let i = 0; i < 90; i++) indoors = above.update(1 / 30, new THREE.Vector3(p.x, room.wallTop + 20, p.z), 0, i / 30);
    expect(indoors).toBe(0);
    expect(above.light.intensity).toBe(0);
  });
});
