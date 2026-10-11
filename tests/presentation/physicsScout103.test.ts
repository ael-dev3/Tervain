import { beforeAll, describe, expect, it } from 'vitest';
import { buildStaticColliders } from '../../src/world/colliders';
import { buildingEntry, buildingGround } from '../../src/world/buildingEntries';
import { bySpec } from '../../src/world/layout';
import { RealmPhysics, initializePhysics, type PropSpec } from '../../src/world/physics';
import { Terrain } from '../../src/world/terrain';

let terrain: Terrain;
beforeAll(async () => { await initializePhysics(); terrain = new Terrain(); });

const crate = (x: number, z: number): PropSpec => ({ id: 'test_crate', name: 'crate', kind: 'crate', x, z, width: .66, height: .47, depth: .52, yaw: 0, mass: 12 });
const away = { x: 0, y: -100, z: 0 };

describe('tenth scout fixes: props and the hero\'s body (A103)', () => {
  it('rests a crate set on a house\'s doorstep on the stone, not sunk to the ground beneath', () => {
    const b = bySpec('house_a'), entry = buildingEntry(b), ground = buildingGround((x, z) => terrain.heightAt(x, z), b);
    const lz = entry.z + 0.42, at = { x: b.x + entry.x * Math.cos(b.yaw) + lz * Math.sin(b.yaw), z: b.z - entry.x * Math.sin(b.yaw) + lz * Math.cos(b.yaw) };
    const physics = new RealmPhysics(terrain, buildStaticColliders(terrain), [crate(at.x, at.z)]);
    const top = ground.avg + entry.y + 0.08;
    physics.restore([{ id: 'test_crate', position: { x: at.x, y: top + 0.6, z: at.z }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
    for (let i = 0; i < 180; i++) { physics.syncActors([]); physics.step(1 / 60, away, 0, 0); }
    const pose = physics.snapshot()[0]!;
    // Its centre rests half its height above the tread's top.
    expect(pose.position.y).toBeGreaterThan(top + 0.235 - 0.05);
  });

});
