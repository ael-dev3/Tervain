import { describe, expect, it } from 'vitest';
import { Colliders } from '../../src/world/colliders';

describe('swept scenery contacts', () => {
  it('stops a long dodge at a thin wall rather than resolving on its far side', () => {
    const c = new Colliders();
    c.box('fence', 0, 0, 4, 0.02);
    const m = c.move(0, -3, 0, 8, 0.4);
    expect(m.hit).toBe(true);
    expect(m.z).toBeCloseTo(-0.4201, 5);
    expect(c.blocked(m.x, m.z, 0.4)).toBe(false);
  });

  it('retains tangential motion along a face and can leave a touching contact', () => {
    const c = new Colliders();
    c.box('wall', 0, 0, 0.05, 10);
    const m = c.move(-1, -2, 3, 4, 0.4);
    expect(m.x).toBeCloseTo(-0.4501, 5);
    expect(m.z).toBeCloseTo(2, 5);
    const away = c.move(m.x, m.z, -1, 1, 0.4);
    expect(away.x).toBeCloseTo(m.x - 1, 5);
    expect(away.z).toBeCloseTo(m.z + 1, 5);
  });

  it('uses rounded box corners, preserving clearance where square expansion would snag', () => {
    const c = new Colliders();
    c.box('crate', 0, 0, 1, 1);
    const miss = c.cast(1.39, 1.38, 1.39, 2, 0.4);
    expect(miss).toBeNull(); // corner distance .544, outside a .4 m disc
    const hit = c.cast(2, 2, 0, 0, 0.4)!;
    expect(hit.t).toBeCloseTo((2 - 1 - 0.4 / Math.sqrt(2)) / 2, 6);
    expect(hit.nx).toBeCloseTo(Math.SQRT1_2, 6);
    expect(hit.nz).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('handles rotated boxes without changing their contact distance', () => {
    const c = new Colliders();
    const yaw = 0.7;
    c.box('rotated', 8, -2, 0.05, 4, yaw);
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const m = c.move(8 - 3 * cos, -2 + 3 * sin, 6 * cos, -6 * sin, 0.4);
    const lx = (m.x - 8) * cos - (m.z + 2) * sin;
    expect(lx).toBeCloseTo(-0.4501, 5);
    expect(c.blocked(m.x, m.z, 0.4)).toBe(false);
  });

  it('finds the earliest collider across spatial cells and honours dynamic gates', () => {
    const c = new Colliders();
    c.circle('later', 21, 0, 1);
    c.box('gate', 10, 0, 0.02, 2);
    expect(c.cast(0, 0, 30, 0, 0.4)?.collider.id).toBe('gate');
    c.setActive('gate', false);
    expect(c.cast(0, 0, 30, 0, 0.4)?.collider.id).toBe('later');
  });

  it('cannot miss a narrow obstacle, an endpoint, or a segment starting inside', () => {
    const c = new Colliders();
    c.box('sliver', 0.31, 0, 0.001, 0.2);
    expect(c.segmentBlocked(0, 0, 1, 0)).toBe(true);
    expect(c.segmentBlocked(0, 0, 0.31, 0)).toBe(true);
    expect(c.segmentBlocked(0.31, 0, 1, 0)).toBe(true);
    expect(c.segmentBlocked(0, 0, 1, 0, new Set(['sliver']))).toBe(false);
  });

  it('filters finite vertical volumes without breaking old collider callers', () => {
    const c = new Colliders();
    c.box('low', 0, 0, 1, 1, 0, true, { minY: 0, maxY: 0.5 });
    expect(c.move(-3, 0, 6, 0, 0.4, undefined, { minY: 0.6, maxY: 2.6 }).x).toBe(3);
    expect(c.move(-3, 0, 6, 0, 0.4, undefined, { minY: 0.05, maxY: 2 }).x).toBeLessThan(-1.4);
    expect(c.segmentBlocked(-3, 0, 3, 0)).toBe(true);
  });

  it('sweeps dynamic people as part of the same scenery-safe move', () => {
    const c = new Colliders();
    c.box('wall', 0, 0, 0.05, 4);
    const people = [{ id: 'person', kind: 'circle' as const, x: -1, z: 0, r: 0.35, active: true }];
    const m = c.move(-3, 0, 6, 0, 0.4, undefined, undefined, people);
    expect(m.x).toBeCloseTo(-1.7501, 5);
    expect(c.blocked(m.x, m.z, 0.4)).toBe(false);
  });

  it('settles against both faces of an inside corner instead of oscillating through either', () => {
    const c = new Colliders();
    c.box('vertical', 0, 0, 0.05, 4);
    c.box('horizontal', 0, 0, 4, 0.05);
    const m = c.move(-2, -2, 5, 5, 0.4);
    expect(m.x).toBeLessThanOrEqual(-0.45);
    expect(m.z).toBeLessThanOrEqual(-0.45);
    expect(c.blocked(m.x, m.z, 0.4)).toBe(false);
  });
});
