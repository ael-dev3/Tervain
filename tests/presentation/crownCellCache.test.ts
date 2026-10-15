import { expect, it } from 'vitest';
import { CrownIndex, type CameraCrown } from '../../src/presentation/cameraCrowns';

const crown = (x: number, z: number, h = 5): CameraCrown => ({ x, y: 7, z, h, v: 4, floor: 2.6 });

it('reuses cells while fresh distance tests change results inside the same grid rectangle', () => {
  const index = new CrownIndex(), near = crown(1, 0, .1);
  index.add(near); index.add(crown(100, 100, 20));
  expect(Array.from(index.near(0, 0, .5))).toEqual([]);
  const get = Map.prototype.get;
  let lookups = 0, found: readonly CameraCrown[];
  try {
    Map.prototype.get = function(key: unknown) { lookups++; return get.call(this, key); };
    found = Array.from(index.near(.6, 0, .5));
  } finally { Map.prototype.get = get; }
  expect(found!).toEqual([near]);
  expect(lookups).toBe(0);
});

it('invalidates cached empty cells when add changes membership without expanding the query rectangle', () => {
  const index = new CrownIndex(), a = crown(1, 0, .1), far = crown(100, 100, 20), b = crown(8, 0, 10);
  index.add(a); index.add(far);
  expect(Array.from(index.near(0, 0, 1))).toEqual([a]);
  index.add(b); // Its width stays below the existing maximum, so the rectangle stays the same.
  expect(Array.from(index.near(0, 0, 1))).toEqual([a, b]);
  expect(Array.from(index.near(100, 100, 0))).toEqual([far]);
  index.add(crown(Number.NaN, 9999));
  expect(index.size).toBe(3);
});

it.each([5, 8])('retains a full-population radius/order oracle on signed cells of size %s', cell => {
  let seed = 59171;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const points = Array.from({ length: 80 }, () => crown((random() - .5) * 700, (random() - .5) * 600, 1 + random() * 24));
  const ordered = [...points].sort((a, b) => Math.floor(a.x / cell) - Math.floor(b.x / cell) || Math.floor(a.z / cell) - Math.floor(b.z / cell));
  const index = new CrownIndex(cell);
  for (const point of points) index.add(point);
  for (let i = 0; i < 300; i++) {
    const x = (random() - .5) * 800, z = (random() - .5) * 700, r = random() * 30;
    const expected = ordered.filter(c => Math.hypot(c.x - x, c.z - z) <= r + c.h);
    expect(Array.from(index.near(x, z, r))).toEqual(expected);
  }
});
