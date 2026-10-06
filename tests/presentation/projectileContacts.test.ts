import { beforeAll, describe, expect, it } from 'vitest';
import { Colliders } from '../../src/world/colliders';
import { initializePhysics, RealmPhysics, type PropSpec } from '../../src/world/physics';
import type { PhysicalWoodGeometry } from '../../src/world/physicsGeometry';
import type { Terrain } from '../../src/world/terrain';

const floor = {
  nx: 10, nz: 10, vertexX: (i: number) => i * 2 - 10, vertexZ: (j: number) => j * 2 - 10,
  vertexHeight: () => 0, heightAt: () => 0, groundAt: () => 0,
} as unknown as Terrain;
const crate: PropSpec = {
  id: 'arrow-cover-crate', kind: 'crate', name: 'Crate', x: 4, z: 5,
  width: .8, height: 1, depth: .8, yaw: 0, mass: 12,
};
const from = { x: 0, y: 1.2, z: 0 }, to = { x: 0, y: 1.2, z: 8 };
beforeAll(() => initializePhysics());

describe('real finite projectile world contacts', () => {
  it('ignores wildlife contact capsules while retaining NPC and cargo projectile blockers', () => {
    const physics = new RealmPhysics(floor, new Colliders(), [crate]);
    const animal = { id: 'animal:1005232351', x: 0, y: 0, z: 2, radius: .6, height: 2.1, active: true };
    const person = { ...animal, id: 'person:harrow', z: 4, radius: .35 };
    try {
      physics.syncActors([animal]);
      expect(physics.traceProjectile(from, to)).toBeNull();
      physics.syncActors([animal, person]);
      expect(physics.traceProjectile(from, to)?.point.z).toBeCloseTo(3.65, 4);
      physics.syncActors([animal]);
      physics.restore([{ id: crate.id, position: { x: 0, y: 1.2, z: 5 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
      expect(physics.traceProjectile(from, to)?.point.z).toBeCloseTo(4.6, 4);
    } finally { physics.dispose(); }
  });
  it('hits the exact rendered terrain triangle diagonal instead of a smoothed or bilinear floor', () => {
    const patch = {
      nx: 1, nz: 1, vertexX: (i: number) => i * 2, vertexZ: (j: number) => j * 2,
      vertexHeight: (i: number, j: number) => i === 1 && j === 1 ? 4 : 0,
      heightAt: () => 0, groundAt: () => 0,
    } as unknown as Terrain;
    const physics = new RealmPhysics(patch, new Colliders(), []);
    try {
      const lower = physics.traceProjectile({ x: .5, y: 5, z: .5 }, { x: .5, y: -1, z: .5 });
      const upper = physics.traceProjectile({ x: 1.5, y: 5, z: 1.5 }, { x: 1.5, y: -1, z: 1.5 });
      expect(lower?.point.y).toBeCloseTo(0, 5);
      expect(lower?.distance).toBeCloseTo(5, 5);
      expect(upper?.point.y).toBeCloseTo(2, 5);
      expect(upper?.distance).toBeCloseTo(3, 5);
    } finally { physics.dispose(); }
  });

  it('stops a segment at a thin finite wall while allowing the clear space above and beside it', () => {
    const colliders = new Colliders();
    colliders.box('arrow-wall', 0, 3, 1, .02, 0, true, { minY: 0, maxY: 2 });
    const physics = new RealmPhysics(floor, colliders, []);
    try {
      const hit = physics.traceProjectile(from, to);
      expect(hit?.point.z).toBeCloseTo(2.98, 5);
      expect(hit?.distance).toBeCloseTo(2.98, 5);
      expect(physics.traceProjectile({ ...from, y: 2.2 }, { ...to, y: 2.2 })).toBeNull();
      expect(physics.traceProjectile({ ...from, x: 1.2 }, { ...to, x: 1.2 })).toBeNull();
      expect(physics.traceProjectile(from, { ...to, z: 2.9 })).toBeNull();
    } finally { physics.dispose(); }
  });

  it('returns the nearest physical cover and follows door toggles before another simulation step', () => {
    const colliders = new Colliders();
    colliders.box('arrow-door', 0, 2, 2, .02, 0, true, { minY: 0, maxY: 3 });
    const physics = new RealmPhysics(floor, colliders, [crate]);
    try {
      physics.restore([{ id: crate.id, position: { x: 0, y: 1.2, z: 5 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
      expect(physics.traceProjectile(from, to)?.distance).toBeCloseTo(1.98, 5);
      colliders.setActive('arrow-door', false);
      expect(physics.traceProjectile(from, to)?.distance).toBeCloseTo(4.6, 5);
      colliders.setActive('arrow-door', true);
      expect(physics.traceProjectile(from, to)?.distance).toBeCloseTo(1.98, 5);
    } finally { physics.dispose(); }
  });

  it('sees a door reenabled during a frame shorter than the fixed physics step', () => {
    const colliders = new Colliders();
    colliders.box('arrow-door', 0, 2, 2, .02, 0, true, { minY: 0, maxY: 3 });
    const physics = new RealmPhysics(floor, colliders, [crate]);
    try {
      physics.restore([{ id: crate.id, position: { x: 0, y: 1.2, z: 5 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
      colliders.setActive('arrow-door', false);
      physics.step(1 / 60, { x: 0, y: 0, z: 0 }, 0, 0);
      expect(physics.traceProjectile(from, to)?.distance).toBeCloseTo(4.6, 5);
      colliders.setActive('arrow-door', true);
      const before = physics.stats().steps;
      physics.step(.001, { x: 0, y: 0, z: 0 }, 0, 0);
      expect(physics.stats().steps).toBe(before);
      expect(physics.traceProjectile(from, to)?.distance).toBeCloseTo(1.98, 5);
    } finally { physics.dispose(); }
  });

  it('sees restored movable cargo at its new pose without relying on stale broad-phase bounds', () => {
    const physics = new RealmPhysics(floor, new Colliders(), [crate]);
    try {
      expect(physics.traceProjectile(from, to)).toBeNull();
      physics.restore([{ id: crate.id, position: { x: 0, y: 1.2, z: 4 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
      expect(physics.traceProjectile(from, to)?.distance).toBeCloseTo(3.6, 5);
      physics.restore([{ id: crate.id, position: { x: 4, y: 1.2, z: 4 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
      expect(physics.traceProjectile(from, to)).toBeNull();
    } finally { physics.dispose(); }
  });

  it('excludes the archer body but stops at a living person and releases that obstruction when inactive', () => {
    const physics = new RealmPhysics(floor, new Colliders(), []);
    const origin = { x: 0, y: 1.2, z: -.2 };
    const person = { id: 'arrow-contact-person', x: 0, y: 0, z: 3, radius: .35, height: 2.1, active: true };
    try {
      physics.beginCharacter({ x: 0, y: 0, z: 0 });
      expect(physics.traceProjectile(origin, to)).toBeNull();
      physics.syncActors([person]);
      expect(physics.traceProjectile(origin, to)?.point.z).toBeCloseTo(2.65, 4);
      physics.syncActors([{ ...person, active: false }]);
      expect(physics.traceProjectile(origin, to)).toBeNull();
    } finally { physics.dispose(); }
  });

  it('hits source-exact wood while the larger tree navigation footprint leaves its empty air clear', () => {
    const colliders = new Colliders();
    colliders.circle('tree:projectile-review', 0, 3, 1.8);
    const tree: PhysicalWoodGeometry = {
      id: 'tree:projectile-review',
      positions: new Float32Array([-.1, 0, 0, .1, 0, 0, -.1, 2, 0, .1, 2, 0]),
      indices: new Uint32Array([0, 2, 1, 1, 2, 3]),
      translation: { x: 0, y: 0, z: 3 }, yaw: 0, scale: 1,
    };
    const physics = new RealmPhysics(floor, colliders, [], [tree]);
    try {
      expect(physics.traceProjectile(from, to)?.distance).toBeCloseTo(3, 5);
      expect(physics.traceProjectile({ ...from, x: .6 }, { ...to, x: .6 })).toBeNull();
    } finally { physics.dispose(); }
  });

  it('treats a shot beginning inside solid cover as an immediate contact', () => {
    const colliders = new Colliders();
    colliders.box('arrow-wall', 0, 2, 1, .08, 0, true, { minY: 0, maxY: 3 });
    const physics = new RealmPhysics(floor, colliders, []);
    try {
      const origin = { x: 0, y: 1.2, z: 2 };
      expect(physics.traceProjectile(origin, to)).toEqual({ point: origin, distance: 0 });
    } finally { physics.dispose(); }
  });

  it('rejects degenerate and nonfinite segments, and a disposed world cannot be queried', () => {
    const physics = new RealmPhysics(floor, new Colliders(), []);
    expect(physics.traceProjectile(from, from)).toBeNull();
    expect(physics.traceProjectile({ ...from, x: NaN }, to)).toBeNull();
    expect(physics.traceProjectile(from, { ...to, y: Infinity })).toBeNull();
    physics.dispose();
    expect(physics.traceProjectile(from, to)).toBeNull();
  });
});
