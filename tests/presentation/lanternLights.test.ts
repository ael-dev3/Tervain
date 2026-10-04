import { describe, expect, it } from 'vitest';
import { LanternLightPool } from '../../src/presentation/lanternLights';

const position = (x: number) => ({ x, y: 2, z: 0 });
const settle = (pool: LanternLightPool, lamps: ReturnType<typeof position>[], focus: ReturnType<typeof position>) => {
  for (let i = 0; i < 180; i++) pool.update(1 / 60, lamps, focus);
};

describe('bounded local lantern lighting', () => {
  it('retains exactly three distinct light slots and avoids source churn at a nearest-lamp tie', () => {
    const lamps = [position(-4), position(0), position(4), position(8)];
    const pool = new LanternLightPool();
    settle(pool, lamps, position(0));
    const original = pool.slots.map(slot => slot.source);
    for (let i = 0; i < 240; i++) {
      const slots = pool.update(1 / 60, lamps, position(2 + Math.sin(i) * 0.2));
      expect(slots.map(slot => slot.source)).toEqual(original);
      expect(new Set(slots.map(slot => slot.source)).size).toBe(3);
      expect(slots.every(slot => slot.strength >= 0 && slot.strength <= 1)).toBe(true);
    }
  });

  it('dims a departing source before reassigning its slot instead of moving a bright light to another lamp', () => {
    const lamps = [position(0), position(8)];
    const pool = new LanternLightPool(1);
    settle(pool, lamps, position(0));
    expect(pool.slots[0]!.strength).toBeCloseTo(1, 5);
    let previousSource = pool.slots[0]!.source;
    let changes = 0;
    for (let i = 0; i < 180; i++) {
      const slot = pool.update(1 / 60, lamps, position(8))[0]!;
      if (slot.source !== previousSource) {
        changes++;
        expect(slot.source).toBe(1);
        expect(slot.strength).toBe(0);
      }
      previousSource = slot.source;
    }
    expect(changes).toBe(1);
    expect(pool.slots[0]!.source).toBe(1);
    expect(pool.slots[0]!.strength).toBeCloseTo(1, 5);
  });

  it('smoothly reduces lamp contribution across the outer twelve metres and reaches zero at the old cutoff', () => {
    const levels: number[] = [];
    for (const distance of [28, 31, 34, 37, 39.95, 40, 41]) {
      const pool = new LanternLightPool(1);
      settle(pool, [position(0)], position(distance));
      levels.push(pool.slots[0]!.strength);
    }
    expect(levels[0]).toBeCloseTo(1, 5);
    expect(levels[1]).toBeCloseTo(0.84375, 5);
    expect(levels[2]).toBeCloseTo(0.5, 5);
    expect(levels[3]).toBeCloseTo(0.15625, 5);
    expect(levels[4]).toBeLessThan(0.0001);
    expect(levels.slice(5)).toEqual([0, 0]);
  });

  it('never assigns duplicate lamps, brightens without overshoot, and safely handles a long frame or missing lamps', () => {
    const pool = new LanternLightPool();
    const lamps = [position(0), position(8)];
    pool.update(1, lamps, position(0));
    expect(pool.slots.filter(slot => slot.source !== null)).toHaveLength(2);
    pool.update(1, lamps, position(0));
    expect(pool.slots.every(slot => slot.strength >= 0 && slot.strength <= 1)).toBe(true);
    pool.update(2, [], position(0));
    expect(pool.slots.every(slot => slot.source === null && slot.strength === 0)).toBe(true);
    pool.update(Number.NaN, lamps, position(0));
    expect(pool.slots.every(slot => Number.isFinite(slot.strength))).toBe(true);
  });
});
