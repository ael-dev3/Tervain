import { describe, expect, it } from 'vitest';
import { CROWN_CORE, CROWN_MIN_BOOM, CrownIndex, crownBoom, type CameraCrown } from '../../src/presentation/cameraCrowns';

const crown = (x: number, z: number, over: Partial<CameraCrown> = {}): CameraCrown => ({ x, y: 7, z, h: 5, v: 3.5, floor: 2.6, ...over });

describe('the follow camera and tree crowns (A82)', () => {
  it('draws the boom in to stop short of a crown core on its way, not of its fringe', () => {
    const pivot = { x: 0, y: 1.6, z: 0 };
    // Looking down from behind and above: the boom rises back through a crown beside the wanderer.
    const dir = { x: 0, y: Math.sin(0.9), z: Math.cos(0.9) };
    const allowed = crownBoom(pivot, dir, 6.2, [crown(0, 3.5)]);
    expect(allowed).toBeLessThan(6.2);
    expect(allowed).toBeGreaterThanOrEqual(CROWN_MIN_BOOM);
    // The camera where the boom now ends is outside the core.
    const c = crown(0, 3.5), x = dir.x * allowed, y = pivot.y + dir.y * allowed, z = dir.z * allowed;
    const h = c.h * CROWN_CORE, v = c.v * CROWN_CORE;
    expect((x - c.x) ** 2 / h ** 2 + (z - c.z) ** 2 / h ** 2 + (y - c.y) ** 2 / v ** 2).toBeGreaterThanOrEqual(1);
    // A crown well to the side is left alone.
    expect(crownBoom(pivot, dir, 6.2, [crown(20, 0)])).toBe(6.2);
  });

  it('leaves the boom free below the crown floor and when the wanderer is inside the core already', () => {
    const level = { x: 0, y: 0, z: 1 };
    // A level boom at head height passes under the crown's floor.
    expect(crownBoom({ x: 0, y: 1.6, z: 0 }, level, 6.2, [crown(0, 3, { y: 2.5, v: 3 })])).toBe(6.2);
    // Up in a tree's core (on a branch, on a ladder): nothing to keep out of.
    expect(crownBoom({ x: 0, y: 7, z: 0 }, { x: 0, y: 0.6, z: 0.8 }, 6.2, [crown(0, 0)])).toBe(6.2);
  });

  it('finds crowns by neighbourhood, wide ones included', () => {
    const index = new CrownIndex(8);
    index.add(crown(0, 0));
    index.add(crown(40, 0, { h: 12 }));
    index.add(crown(200, 200));
    index.add(crown(Number.NaN, 0));
    expect(index.size).toBe(3);
    expect(index.near(1, 1, 6).map((c) => c.x).sort((a, b) => a - b)).toEqual([0]);
    // The wide crown's centre is 30 m off, but its leaves reach within the asked radius.
    expect(index.near(22, 0, 6).map((c) => c.x)).toContain(40);
    expect(index.near(200, 200, 2)).toHaveLength(1);
  });
});
