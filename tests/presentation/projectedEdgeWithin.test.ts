import { expect, it } from 'vitest';
import { projectedEdgeWithin } from '../../src/presentation/plantedCrowns';

// Original norm-based predicate, retained as the numerical oracle.
function original(x: number, z: number, ax: number, az: number, bx: number, bz: number, radius: number) {
  const dx = bx - ax, dz = bz - az, d = dx * dx + dz * dz;
  const t = d > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / d)) : 0;
  return Math.hypot(x - ax - dx * t, z - az - dz * t) <= radius;
}

it('retains endpoint, interior, degenerate and radius-boundary decisions', () => {
  for (const point of [[0, 0], [1, 1], [-2, .3], [4, .3], [.4, .3], [1e150, 1e150]]) {
    for (const edge of [[0, 0, 2, 0], [0, 0, 0, 0], [-2, 3, 4, -5], [1e150, 0, 1e150, 2]]) {
      for (const radius of [-1, 0, Number.MIN_VALUE, 1e-200, .3, 1, 1e150, Infinity]) {
        const args = [...point, ...edge, radius] as [number, number, number, number, number, number, number];
        expect(projectedEdgeWithin(...args)).toBe(original(...args));
      }
    }
  }
});

it('matches the original norm at both sides of 2,000 deterministic rounding-sensitive boundaries', () => {
  let seed = 73251;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  let accepted = 0, rejected = 0;
  for (let i = 0; i < 2000; i++) {
    const x = (random() - .5) * 100, z = (random() - .5) * 100;
    const ax = (random() - .5) * 100, az = (random() - .5) * 100, bx = (random() - .5) * 100, bz = (random() - .5) * 100;
    const dx = bx - ax, dz = bz - az, d = dx * dx + dz * dz;
    const t = d > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / d)) : 0;
    const distance = Math.hypot(x - ax - dx * t, z - az - dz * t);
    for (const factor of [1 - 4 * Number.EPSILON, 1 - Number.EPSILON, 1, 1 + Number.EPSILON, 1 + 4 * Number.EPSILON, .5, 2]) {
      const radius = distance * factor, expected = original(x, z, ax, az, bx, bz, radius);
      expect(projectedEdgeWithin(x, z, ax, az, bx, bz, radius)).toBe(expected);
      if (expected) accepted++; else rejected++;
    }
  }
  expect(accepted).toBeGreaterThan(0); expect(rejected).toBeGreaterThan(0);
});
