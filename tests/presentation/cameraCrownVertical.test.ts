import { expect, it } from 'vitest';
import { crownBoom, type CameraCrown } from '../../src/presentation/cameraCrowns';

it.each([-20, 30])('does not sample a crown wholly outside the boom height range (centre %s)', (y) => {
  const c: CameraCrown = { x: 0, y, z: 3, h: 5, v: 3.5, floor: -30 };
  let horizontalReads = 0;
  Object.defineProperty(c, 'x', { get() { horizontalReads++; return 0; } });
  const allowed = crownBoom({ x: 0, y: 1.6, z: 0 }, { x: 0, y: .5, z: Math.sqrt(.75) }, 6.2, [c]);
  expect(allowed).toBe(6.2);
  expect(horizontalReads).toBe(0);
});
