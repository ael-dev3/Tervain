import { beforeAll, describe, expect, it } from 'vitest';
import { Colliders } from '../../src/world/colliders';
import { FLOAT_LINE, RealmPhysics, initializePhysics, type PropSpec, type WaterField } from '../../src/world/physics';
import type { Terrain } from '../../src/world/terrain';
import type { WaterSample } from '../../src/world/water/waterWorld';

/** A flat bed three metres under still water, with an optional current, west of x = 6 (dry land beyond). */
const bed = { nx: 20, nz: 20, vertexX: (i: number) => i * 2 - 20, vertexZ: (i: number) => i * 2 - 20,
  vertexHeight: () => -3, heightAt: () => -3, groundAt: () => -3 } as unknown as Terrain;
function water(flowX = 0, surface = () => 0): WaterField & { revision: number } {
  return {
    revision: 0,
    sample(x: number): WaterSample | null {
      if (x > 6) return null;
      const s = surface();
      return { body: 'sea', surface: s, bed: -3, depth: s + 3, flowX, flowZ: 0, rough: 0 };
    },
  };
}
const barrel: PropSpec = { id: 'barrel', kind: 'barrel', name: 'Barrel', x: 0, z: 0, width: .76, height: 1, depth: .76, yaw: 0, mass: 18 };
const crate: PropSpec = { id: 'crate', kind: 'crate', name: 'Crate', x: 2, z: 2, width: .8, height: .6, depth: .6, yaw: 0, mass: 12 };
const player = { x: 9, y: -3, z: 9 };
beforeAll(() => initializePhysics());
function tick(p: RealmPhysics, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) { p.beginCharacter(player); p.step(1 / 60, player, 0, 0); }
}

describe('loose cargo afloat', () => {
  it('floats a barrel and a crate at their own water lines instead of sinking to the bed', () => {
    const p = new RealmPhysics(bed, new Colliders(), [barrel, crate]);
    try {
      p.setWater(water());
      p.props[0]!.body.setTranslation({ x: 0, y: 0.2, z: 0 }, true);
      p.props[1]!.body.setTranslation({ x: 2, y: 0.2, z: 2 }, true);
      tick(p, 8);
      const wet = p.wetness();
      expect(wet.barrel).toBeGreaterThan(FLOAT_LINE.barrel - 0.12);
      expect(wet.barrel).toBeLessThan(FLOAT_LINE.barrel + 0.12);
      expect(wet.crate).toBeGreaterThan(FLOAT_LINE.crate - 0.12);
      expect(wet.crate).toBeLessThan(FLOAT_LINE.crate + 0.12);
      for (const pose of p.poses(false)) expect(pose.position.y).toBeGreaterThan(-1);
    } finally { p.dispose(); }
  });

  it('sinks to the bed when there is no water, exactly as before', () => {
    const p = new RealmPhysics(bed, new Colliders(), [barrel]);
    try {
      p.props[0]!.body.setTranslation({ x: 0, y: 0.2, z: 0 }, true);
      tick(p, 4);
      expect(p.poses(false)[0]!.position.y).toBeLessThan(-2.4);
      expect(p.wetness().barrel).toBe(0);
    } finally { p.dispose(); }
  });

  it('drifts with the current and bobs with a moving surface', () => {
    let t = 0;
    const p = new RealmPhysics(bed, new Colliders(), [barrel]);
    try {
      p.setWater(water(0.6, () => 0.25 * Math.sin(t * 1.2)));
      p.props[0]!.body.setTranslation({ x: -10, y: 0, z: 0 }, true);
      const heights: number[] = [];
      for (let i = 0; i < 6 * 60; i++) { t += 1 / 60; p.beginCharacter(player); p.step(1 / 60, player, 0, 0); if (i > 120) heights.push(p.props[0]!.body.translation().y); }
      expect(p.props[0]!.body.translation().x).toBeGreaterThan(-10 + 1.2);
      expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.2);
    } finally { p.dispose(); }
  });

  it('throws one splash when a body drops into the water, none while it floats', () => {
    const p = new RealmPhysics(bed, new Colliders(), [barrel]);
    try {
      p.setWater(water());
      p.props[0]!.body.setTranslation({ x: 0, y: 3, z: 0 }, true);
      tick(p, 3);
      const splashes = p.drainSplashes();
      expect(splashes).toHaveLength(1);
      expect(splashes[0]!.energy).toBeGreaterThan(0.2);
      expect(splashes[0]!.y).toBeCloseTo(0, 6);
      tick(p, 2);
      expect(p.drainSplashes()).toHaveLength(0);
    } finally { p.dispose(); }
  });

  it('lets go of a floating body that drifts ashore, and reports it dry', () => {
    const p = new RealmPhysics(bed, new Colliders(), [barrel]);
    try {
      p.setWater(water());
      p.props[0]!.body.setTranslation({ x: 0, y: 0, z: 0 }, true);
      tick(p, 3);
      expect(p.wetness().barrel).toBeGreaterThan(0.2);
      p.setWater(null);
      tick(p, 3);
      expect(p.poses(false)[0]!.position.y).toBeLessThan(-2.4);
    } finally { p.dispose(); }
  });
});
