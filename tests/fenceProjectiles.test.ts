import { beforeAll, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Colliders, FENCE_WALL_LIFT } from '../src/world/colliders';
import { initializePhysics, RealmPhysics } from '../src/world/physics';
import type { Terrain } from '../src/world/terrain';
const floor = { nx: 10, nz: 10, vertexX: (i: number) => i * 2 - 10, vertexZ: (i: number) => i * 2 - 10, vertexHeight: () => 0, heightAt: () => 0, groundAt: () => 0 } as unknown as Terrain;
beforeAll(initializePhysics);
it('passes above fence wood, still hits its real bounds, and keeps the movement barrier', () => {
  for (const yaw of [0, .7, 1.57]) for (const side of [-1, 1]) {
    const c = new Colliders(); c.box('fence', 0, 0, .12, 3, yaw, true, { minY: 0, maxY: 2 + FENCE_WALL_LIFT });
    const p = new RealmPhysics(floor, c, []), cs = Math.cos(yaw), sn = Math.sin(yaw);
    try {
      for (const y of [1.9, 2.01, 2.3, 2.59]) {
        const from = { x: side * 2 * cs, y, z: -side * 2 * sn }, to = { x: -from.x, y, z: -from.z };
        const hit = p.traceProjectile(from, to);
        if (y < 2) expect(hit?.distance).toBeCloseTo(1.88, 4); else expect(hit).toBeNull();
      }
      const raw = p.world.castRay(new RAPIER.Ray({ x: side * 2 * cs, y: 2.3, z: -side * 2 * sn }, { x: -side * cs, y: 0, z: side * sn }), 4, true);
      expect(raw?.timeOfImpact).toBeCloseTo(1.88, 4);
      const move = c.move(side * cs, -side * sn, -2 * side * cs, 2 * side * sn, .4, undefined, { minY: 2.1, maxY: 4.05 });
      expect(side * (move.x * cs - move.z * sn)).toBeGreaterThan(.4);
      c.setActive('fence', false);
      expect(p.traceProjectile({ x: -2 * cs, y: 1, z: 2 * sn }, { x: 2 * cs, y: 1, z: -2 * sn })).toBeNull();
      c.setActive('fence', true); // Dirty direct-query path, before a simulation step.
      expect(p.traceProjectile({ x: -2 * cs, y: 2.3, z: 2 * sn }, { x: 2 * cs, y: 2.3, z: -2 * sn })).toBeNull();
      expect(p.traceProjectile({ x: -2 * cs, y: 1, z: 2 * sn }, { x: 2 * cs, y: 1, z: -2 * sn })).not.toBeNull();
    } finally { p.dispose(); }
  }
});
it('clips descending rays and cap-inside origins without skipping real contacts or scenery behind', () => {
  const c = new Colliders(); c.box('fence', 0, 0, .12, 3, 0, true, { minY: 0, maxY: 2.6 });
  c.box('wall', 1, 0, .1, 3, 0, true, { minY: 0, maxY: 4 });
  const p = new RealmPhysics(floor, c, []);
  try {
    expect(p.traceProjectile({ x: -2, y: 2.3, z: 0 }, { x: 2, y: 1.7, z: 0 })?.point.y).toBeCloseTo(2, 5);
    expect(p.traceProjectile({ x: 0, y: 2.3, z: 0 }, { x: 0, y: 1, z: 0 })?.distance).toBeCloseTo(.3, 5);
    expect(p.traceProjectile({ x: -2, y: 2.3, z: 0 }, { x: 2, y: 2.3, z: 0 })?.distance).toBeCloseTo(2.9, 4);
    expect(p.traceProjectile({ x: -2, y: 1, z: 0 }, { x: 2, y: 1, z: 0 })?.distance).toBeCloseTo(1.88, 4);
  } finally { p.dispose(); }
});
