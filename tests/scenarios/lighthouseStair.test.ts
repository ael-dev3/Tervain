import { describe, expect, it } from 'vitest';
import { LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION as L, SPAWN, ANCHORS } from '../../src/world/layout';
import { LIGHTHOUSE_STAIR_ANGLE, LIGHTHOUSE_STAIR_RISE, lighthouseSurfacesAt, lighthouseTreadTop } from '../../src/world/lighthouse';
import { Terrain } from '../../src/world/terrain';
import { buildStaticColliders } from '../../src/world/colliders';
import { NavGrid } from '../../src/world/nav';

const terrain = new Terrain();
const base = terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
const treadPoint = (i: number, radius = 4.13) => {
  const a = L.stairStart + (i + 0.5) * LIGHTHOUSE_STAIR_ANGLE;
  return { x: LIGHTHOUSE.x + Math.cos(a) * radius, z: LIGHTHOUSE.z + Math.sin(a) * radius };
};

describe('climbable original lighthouse compound', () => {
  it('supports every rendered tread at its measured top, including descent', () => {
    let feet = base;
    for (let i = 0; i < L.stairSteps; i++) {
      const p = treadPoint(i), top = base + lighthouseTreadTop(i);
      const support = terrain.supportAt(p.x, p.z, feet);
      expect(support).toBeCloseTo(top, 6);
      expect(terrain.walkable(p.x, p.z, 0.95, feet)).toBe(true);
      expect(top - feet).toBeLessThan(0.8);
      feet = top;
    }
    for (let i = L.stairSteps - 8; i >= 0; i--) {
      const p = treadPoint(i), top = base + lighthouseTreadTop(i);
      feet = top + LIGHTHOUSE_STAIR_RISE;
      expect(terrain.supportAt(p.x, p.z, feet)).toBeCloseTo(top, 6);
    }
  });

  it('does not teleport ground visitors onto a high stair or gallery or support the air outside its real wedge', () => {
    for (const i of [12, 35, 62, 80]) {
      const p = treadPoint(i);
      expect(terrain.supportAt(p.x, p.z, base)).toBeCloseTo(terrain.heightAt(p.x, p.z), 6);
    }
    const p = treadPoint(60, L.stairOuter + 0.03);
    expect(lighthouseSurfacesAt(p.x, p.z)).toEqual([]);
    expect(terrain.supportAt(p.x, p.z, base + 12)).toBe(terrain.heightAt(p.x, p.z));
  });

  it('supports the rendered stone steps outside both closed doors', () => {
    for (const entry of [{ x: 0, z: LIGHTHOUSE.r + 0.015 }, { x: L.house.x - 0.65, z: L.house.d / 2 + 0.06 }]) {
      const x = LIGHTHOUSE.x + entry.x;
      expect(terrain.supportAt(x, LIGHTHOUSE.z + entry.z + 0.42, base)).toBeCloseTo(base + L.house.wallBase + 0.08, 6);
      expect(terrain.supportAt(x, LIGHTHOUSE.z + entry.z + 0.96, base)).toBeCloseTo(base + L.house.wallBase * 0.5, 6);
    }
  });

  it('grounds the entire joined keeper foundation on one terrace and retains the arrival route to its door', () => {
    for (const x of [-10.8, -6.4, -2.2, 0, 4.8]) for (const z of [-4, 0, 5.4]) {
      expect(terrain.heightAt(LIGHTHOUSE.x + x, LIGHTHOUSE.z + z)).toBeCloseTo(base, 5);
    }
    const c = buildStaticColliders();
    const nav = new NavGrid(terrain, c);
    expect(nav.findPath(SPAWN, ANCHORS.lantern_door!)).not.toBeNull();
  });
});
