import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Colliders, buildStaticColliders } from '../src/world/colliders';
import { RealmPhysics, initializePhysics, type PropSpec } from '../src/world/physics';
import { ARCHIVE_ROOM, BUILDINGS, DECKS } from '../src/world/layout';
import { Terrain } from '../src/world/terrain';

const floor = { nx: 10, nz: 10, vertexX: (i: number) => i * 2 - 10, vertexZ: (i: number) => i * 2 - 10,
  vertexHeight: () => 0, heightAt: () => 0, groundAt: () => 0 } as unknown as Terrain;
const crate: PropSpec = { id: 'crate', kind: 'crate', name: 'Crate', x: 0, z: 0, width: .8, height: .6, depth: .6, yaw: 0, mass: 12 };
const player = { x: 0, y: 0, z: -2 };
beforeAll(() => initializePhysics());
function tick(p: RealmPhysics, n: number, dt = 1 / 60) {
  for (let i = 0; i < n; i++) { p.beginCharacter(player); p.step(dt, player, 0, 0); }
}

describe('real 60 Hz rigid-body world', () => {
  it('falls under gravity and settles with its closed bottom on the same physical terrain', () => {
    const p = new RealmPhysics(floor, new Colliders(), [crate]);
    try {
      p.props[0]!.body.setTranslation({ x: 0, y: 3, z: 0 }, true);
      tick(p, 240);
      expect(p.poses(false)[0]!.position.y).toBeCloseTo(.3, 2);
      expect(p.props[0]!.body.linvel().y).toBeCloseTo(0, 2);
      expect(p.supportAt(0, 0, 5)).toBeCloseTo(.6, 2);
      expect(p.stats().steps).toBe(240);
    } finally { p.dispose(); }
  });
  it('real stacked bodies support one another without sinking', () => {
    const p = new RealmPhysics(floor, new Colliders(), [crate, { ...crate, id: 'upper' }]);
    try {
      p.props[1]!.body.setTranslation({ x: 0, y: 1.1, z: 0 }, true);
      tick(p, 300);
      expect(p.poses(false)[1]!.position.y).toBeCloseTo(.9, 1);
      expect(p.supportAt(0, 0, 2)).toBeCloseTo(1.2, 1);
    } finally { p.dispose(); }
  });
  it('grab is a force-driven spring; throwing produces real linear/angular motion, then contact', () => {
    const p = new RealmPhysics(floor, new Colliders(), [crate]);
    try {
      tick(p, 40);
      expect(p.candidate(player, 0)?.id).toBe('crate');
      expect(p.grab('crate')).toBe(true);
      expect(p.grab('crate')).toBe(false);
      tick(p, 100);
      expect(p.props[0]!.body.translation().y).toBeGreaterThan(1);
      p.throw(0, 0);
      expect(p.holding).toBeNull();
      expect(p.props[0]!.body.linvel().z).toBeGreaterThan(5);
      tick(p, 40);
      expect(p.props[0]!.body.translation().z).toBeGreaterThan(2);
      expect(Math.abs(p.props[0]!.body.rotation().x)).toBeGreaterThan(.01);
    } finally { p.dispose(); }
  });
  it('walls occlude grab selection and swept fast objects cannot tunnel through a thin wall', () => {
    const c = new Colliders(); c.box('wall', 0, -.65, 3, .05, 0, true, { minY: 0, maxY: 4 });
    const p = new RealmPhysics(floor, c, [crate]);
    try {
      tick(p, 5); expect(p.candidate(player, 0)).toBeNull();
      p.props[0]!.body.setTranslation({ x: 0, y: 1, z: 1 }, true);
      p.props[0]!.body.setLinvel({ x: 0, y: 0, z: -90 }, true);
      tick(p, 10);
      expect(p.props[0]!.body.translation().z).toBeGreaterThan(-.65);
    } finally { p.dispose(); }
  });
  it('capsule contact pushes a real body rather than walking through it', () => {
    const p = new RealmPhysics(floor, new Colliders(), [{ ...crate, height: 1.2 }]);
    try {
      tick(p, 20);
      const from = { x: 0, y: 0, z: -.82 }; p.beginCharacter(from);
      const corrected = p.move(from.x, from.y, from.z, 0, .25, true);
      expect(corrected.z).toBeLessThan(-.57);
      p.step(1 / 60, corrected, 0, 0);
      expect(p.props[0]!.body.linvel().z).toBeGreaterThan(0);
    } finally { p.dispose(); }
  });
  it('fixed steps give the same elapsed gravity path at 30/60/120 Hz, and idle/pause add no time', () => {
    const final = [30, 60, 120].map(hz => {
      const p = new RealmPhysics(floor, new Colliders(), [crate]);
      try {
        p.props[0]!.body.setTranslation({ x: 0, y: 6, z: 0 }, true);
        tick(p, hz / 2, 1 / hz);
        const y = p.props[0]!.body.translation().y;
        p.step(0, player, 0, 0); p.step(NaN, player, 0, 0);
        expect(p.props[0]!.body.translation().y).toBe(y);
        return y;
      } finally { p.dispose(); }
    });
    expect(Math.max(...final) - Math.min(...final)).toBeLessThan(1e-5);
  });
  it('state-driven solid doors retain contact, and a quality rebuild restores loose object poses', () => {
    const c = new Colliders(); c.box('gate', 0, 1, 3, .1, 0, true, { minY: 0, maxY: 4 });
    const p = new RealmPhysics(floor, c, [crate]);
    try {
      p.props[0]!.body.setTranslation({ x: 2, y: 1, z: 0 }, true);
      tick(p, 60);
      const snapshot = p.snapshot();
      const restored = new RealmPhysics(floor, c, [crate]);
      try { restored.restore(snapshot); expect(restored.snapshot()[0]!.position).toEqual(snapshot[0]!.position); }
      finally { restored.dispose(); }
      c.setActive('gate', false); tick(p, 1);
      expect(p.world.colliders.len()).toBeGreaterThan(1);
    } finally { p.dispose(); }
  });

  it.each(['bridge', 'archive'] as const)('cargo dropped on the real %s stands on its visible floor instead of falling through it', (place) => {
    const terrain = new Terrain(), archive = BUILDINGS.find(b => b.kind === 'archive')!, deck = DECKS[0]!;
    const x = place === 'bridge' ? deck.x : archive.x + 1.2, z = place === 'bridge' ? deck.z : archive.z + 1;
    const top = place === 'bridge' ? deck.y : terrain.heightAt(archive.x, archive.z) + ARCHIVE_ROOM.floorTop;
    const p = new RealmPhysics(terrain, buildStaticColliders(terrain), [{ ...crate, x, z }]);
    try {
      p.props[0]!.body.setTranslation({ x, y: top + 3, z }, true);
      tick(p, 240);
      expect(p.props[0]!.body.translation().y - crate.height / 2).toBeCloseTo(top, 2);
      expect(p.props[0]!.body.linvel().y).toBeCloseTo(0, 2);
    } finally { p.dispose(); }
  });

  it('supports the actual curved capsule foot at crate edges, rejects side contacts and reports wood underfoot', () => {
    const p = new RealmPhysics(floor, new Colliders(), [crate]);
    try {
      tick(p, 100);
      const top = p.props[0]!.body.translation().y + .3;
      expect(p.supportAt(.5, 0, 2)).toBeCloseTo(top - (.4 - Math.sqrt(.4 * .4 - .1 * .1)), 2);
      expect(p.supportAt(.79, 0, 2)).toBeNull();
      expect(p.surfaceAt(0, 0, top)).toBe('deck');
      expect(p.surfaceAt(0, 0, 2)).toBeNull();
      expect(p.surfaceAt(4, 0, 0)).toBeNull();
    } finally { p.dispose(); }
  });

  it('does not turn a tall object above the step budget into a fictitious lower support', () => {
    const p = new RealmPhysics(floor, new Colliders(), [{ ...crate, height: 2 }]);
    try { tick(p, 100); expect(p.supportAt(0, 0, 0)).toBeNull(); }
    finally { p.dispose(); }
  });

  it('sweeps held cargo toward an obstructed hand target and drops the hold when a wall interrupts the connection', () => {
    const c = new Colliders(); c.box('wall', 0, .65, 3, .05, 0, true, { minY: 0, maxY: 4 });
    const p = new RealmPhysics(floor, c, [crate]);
    const near = { x: 0, y: 0, z: -1.2 };
    try {
      tick(p, 30); expect(p.candidate(near, 0)?.id).toBe('crate'); expect(p.grab('crate')).toBe(true);
      for (let i = 0; i < 150; i++) { p.beginCharacter(near); p.step(1 / 60, near, 0, 0); }
      expect(p.holding).toBe('Crate');
      expect(p.props[0]!.body.translation().z).toBeLessThan(.34);
      const behind = { x: 0, y: 0, z: 1.5 };
      p.beginCharacter(behind); p.step(1 / 60, behind, 0, 0);
      expect(p.holding).toBeNull();
      expect(p.props[0]!.body.translation().z).toBeLessThan(.65);
    } finally { p.dispose(); }
  });

  it('loose cargo contacts an actual moving person capsule and ignores the same person when inactive', () => {
    const p = new RealmPhysics(floor, new Colliders(), [crate]);
    const person = { id: 'worker', x: 0, y: 0, z: 2, radius: .35, height: 2.1, active: true };
    try {
      p.syncActors([person]); tick(p, 30);
      for (let i = 0; i < 120; i++) {
        p.syncActors([{ ...person, z: 2 - (i + 1) * .012 }]);
        p.beginCharacter(player); p.step(1 / 60, player, 0, 0);
      }
      expect(p.props[0]!.body.translation().z).toBeLessThan(-.05);
      p.syncActors([{ ...person, z: .75, active: false }]);
      p.props[0]!.body.setTranslation({ x: 0, y: .4, z: 0 }, true);
      p.props[0]!.body.setLinvel({ x: 0, y: 0, z: 8 }, true);
      tick(p, 60);
      expect(p.props[0]!.body.translation().z).toBeGreaterThan(1.5);
    } finally { p.dispose(); }
  });

  it('restoring poses normalizes rotations and rejects an invalid zero quaternion', () => {
    const p = new RealmPhysics(floor, new Colliders(), [crate]);
    try {
      p.restore([{ id: 'crate', position: { x: 2, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 3 } }]);
      expect(p.props[0]!.body.rotation().w).toBeCloseTo(1, 6);
      p.restore([{ id: 'crate', position: { x: 4, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 0 } }]);
      expect(p.props[0]!.body.translation().x).toBe(2);
    } finally { p.dispose(); }
  });

  it('uses transformed source wood instead of its broad player footprint and keeps shared source buffers unchanged', () => {
    const positions = new Float32Array([
      -.2, 0, -.1, .2, 0, -.1, .2, 2, -.1, -.2, 2, -.1,
      -.2, 0, .1, .2, 0, .1, .2, 2, .1, -.2, 2, .1,
    ]);
    const indices = new Uint32Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4]);
    const before = Array.from(positions), c = new Colliders(); c.circle('tree:source', 1, 0, 2);
    const p = new RealmPhysics(floor, c, [{ ...crate, x: 1, z: -2 }], [{
      id: 'tree:source', positions, indices, translation: { x: 1, y: 0, z: 0 }, yaw: Math.PI / 2, scale: 2,
    }]);
    try {
      // The broad gameplay root-footprint cylinder would block this clear side ray; exact wood is only .4m wide here.
      const clear = p.world.castRay(new RAPIER.Ray({ x: 1.4, y: 2, z: -3 }, { x: 0, y: 0, z: 1 }), 6, true);
      expect(clear).toBeNull();
      const trunk = p.world.castRay(new RAPIER.Ray({ x: 1, y: 2, z: -3 }, { x: 0, y: 0, z: 1 }), 6, true);
      expect(trunk?.timeOfImpact).toBeCloseTo(2.6, 5);
      p.props[0]!.body.setLinvel({ x: 0, y: 0, z: 14 }, true);
      tick(p, 30);
      expect(p.props[0]!.body.translation().z).toBeLessThan(-.4);
      expect(Array.from(positions)).toEqual(before);
    } finally { p.dispose(); }
  });

  it('a restored moved crate immediately supports saved feet and occludes interaction at its new location before a simulation step', () => {
    const p = new RealmPhysics(floor, new Colliders(), [crate]);
    try {
      p.restore([{ id: 'crate', position: { x: 4, y: .3, z: 4 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
      const restored = p.snapshot()[0]!.position;
      // GJK sphere sweeps converge within a fraction of a millimetre; saved support need not round to an exact decimal.
      expect(Math.abs(p.supportAt(4, 4, .6)! - .6)).toBeLessThan(.001);
      expect(p.supportAt(0, 0, .6)).toBeNull();
      expect(p.occludedByProp({ x: 2, y: .3, z: 4 }, { x: 6, y: .3, z: 4 })).toBe(true);
      expect(p.occludedByProp({ x: 2, y: .3, z: 0 }, { x: 6, y: .3, z: 0 })).toBe(false);
      expect(p.snapshot()[0]!.position).toEqual(restored);
    } finally { p.dispose(); }
  });

  it('blocks first-frame movement at a restored tall body before the world broad phase has advanced', () => {
    const p = new RealmPhysics(floor, new Colliders(), [{ ...crate, height: 1.4 }]);
    try {
      p.restore([{ id: 'crate', position: { x: 4, y: .7, z: 4 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
      const restored = p.snapshot()[0]!.position;
      const from = { x: 4, y: 0, z: 3.1 }; p.beginCharacter(from);
      const corrected = p.move(from.x, from.y, from.z, 0, .4, true);
      expect(corrected.z).toBeLessThan(3.3);
      expect(corrected.y).toBe(0);
      expect(p.candidate(from, 0)?.id).toBe('crate');
      expect(p.stats().steps).toBe(0);
      expect(p.snapshot()[0]!.position).toEqual(restored);
    } finally { p.dispose(); }
  });

  it('sweeps the whole curved head at an overhead crate edge instead of letting sparse probes miss it', () => {
    const p = new RealmPhysics(floor, new Colliders(), [crate]);
    try {
      p.restore([{ id: 'crate', position: { x: 0, y: 3, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }]);
      expect(p.ceilingAt(.5, 0, .4, 2, 3)).toBeCloseTo(2.7 + (.4 - Math.sqrt(.4 * .4 - .1 * .1)), 2);
      expect(p.ceilingAt(.79, 0, .4, 2, 3)).toBeNull();
    } finally { p.dispose(); }
  });
});
