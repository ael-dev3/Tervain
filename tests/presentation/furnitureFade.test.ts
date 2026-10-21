import * as THREE from 'three';
import { expect, it } from 'vitest';
import type { FrameContext } from '../../src/presentation/context';
import { buildFurniture } from '../../src/presentation/furniture';
import { ROOM_SEEN_FADE, ROOM_SEEN_FROM, roomShowing } from '../../src/presentation/world';
import { FURNITURE } from '../../src/world/furniture';
import type { RoomLocator } from '../../src/world/interiors';

it('fades a room seen through its windows over the last metres instead of in one step', () => {
  expect(roomShowing(0, ROOM_SEEN_FROM - ROOM_SEEN_FADE - 0.01)).toBe(1);
  expect(roomShowing(0, ROOM_SEEN_FROM - ROOM_SEEN_FADE / 2)).toBeCloseTo(0.5, 6);
  expect(roomShowing(0, ROOM_SEEN_FROM)).toBe(0);
  // Its door shows as much as it stands open, from any distance.
  expect(roomShowing(0.25, 80)).toBe(0.25);
  expect(roomShowing(1, ROOM_SEEN_FROM)).toBe(1);
  // Past the old cut nothing new is drawn; inside it the same rooms are drawn as before.
  for (let d = 0; d < 40; d += 0.05) expect(roomShowing(0, d) > 0).toBe(d < ROOM_SEEN_FROM);
});

it("draws a room's furniture with its room's share of the dither, and the same rooms as the old cut", () => {
  const placement = FURNITURE.find(p => p.piece === 'chair')!, b = placement.room.building;
  const template = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  const rooms = { base: () => 0, within: () => null } as unknown as RoomLocator;
  let share = 1;
  const furniture = buildFurniture(new Map([['chair', template]]), rooms, () => share, [placement], []);
  const chair = furniture.group.children.find(o => o.name === 'Furniture / chair') as THREE.InstancedMesh;
  const coverage = chair.geometry.getAttribute('aDistanceCoverage') as THREE.InstancedBufferAttribute;
  const at = (d: number) => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(b.x + d, 1.7, b.z);
    const focus = new THREE.Vector3(b.x + 500, 0, b.z);
    furniture.update(0, { camera, focus } as unknown as FrameContext);
    return chair.count ? coverage.getY(0) : 0;
  };
  try {
    expect((chair.material as THREE.Material).customProgramCacheKey()).toContain('tervain-distance-dither');
    expect(at(10)).toBe(1);
    expect(at(32)).toBeCloseTo(0.5, 6);
    expect(coverage.getX(0)).toBe(0);
    expect(at(34)).toBe(0); expect(chair.count).toBe(0);
    share = 0.5;
    expect(at(10)).toBeCloseTo(0.5, 6);
    share = 0;
    expect(at(10)).toBe(0); expect(chair.count).toBe(0);
    // The old cut drew an open room within 34 m: the same instances are drawn at every distance.
    share = 1;
    for (let d = 0; d < 40; d += 0.25) { at(d); expect(chair.count > 0).toBe(d < 34); }
  } finally { furniture.dispose?.(); template.geometry.dispose(); template.material.dispose(); }
});
