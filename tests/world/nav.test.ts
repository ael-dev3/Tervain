import { describe, expect, it } from 'vitest';
import { Colliders } from '../../src/world/colliders';
import { WORLD } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import type { Terrain } from '../../src/world/terrain';

const open = () => new NavGrid({ nx: (WORLD.maxX - WORLD.minX) / WORLD.cell, nz: (WORLD.maxZ - WORLD.minZ) / WORLD.cell,
  groundAt: () => 0, walkable: () => true } as unknown as Terrain, new Colliders());

describe('nav routes', () => {
  it('reaches a goal in the start’s own cell instead of returning an empty route (A71)', () => {
    const nav = open();
    expect(nav.findPath({ x: .1, z: .1 }, { x: 1.9, z: 1.9 })).toEqual([{ x: 1.9, z: 1.9 }]);
    expect(nav.findPath({ x: .1, z: .1 }, { x: 2.1, z: .1 })).toEqual([{ x: 2.1, z: .1 }]);
  });
});

it('does not route or snap goals into a seated tree walking-height footprint', () => {
  const colliders = new Colliders();
  colliders.circle('tree:seated', 0, 0, .5, true, { navigationRadius: 8 });
  const nav = new NavGrid({ nx: (WORLD.maxX - WORLD.minX) / WORLD.cell, nz: (WORLD.maxZ - WORLD.minZ) / WORLD.cell,
    groundAt: () => 0, walkable: () => true } as unknown as Terrain, colliders);
  const cell = nav.toCell(5, 1);
  expect(colliders.blocked(5, 1, .55)).toBe(false);
  expect(nav.isBlocked(cell.i, cell.j)).toBe(true);
  expect(nav.nearestOpen(5, 1)).not.toEqual(cell);
  expect(nav.findPath({ x: -15, z: 1 }, { x: 15, z: 1 })).not.toBeNull();
});

it.each([[1.05, false], [1.8, true]])('checks exact goal collision at x=%s while preserving free points in coarse blocked cells', (x, exact) => {
  const colliders = new Colliders(); colliders.circle('small-post', 1, 1, .1);
  const nav = new NavGrid({ nx: (WORLD.maxX - WORLD.minX) / WORLD.cell, nz: (WORLD.maxZ - WORLD.minZ) / WORLD.cell,
    groundAt: () => 0, walkable: () => true } as unknown as Terrain, colliders);
  const goal = { x, z: 1 }, cell = nav.toCell(x, 1), path = nav.findPath({ x: 5, z: 1 }, goal);
  expect(nav.isBlocked(cell.i, cell.j)).toBe(true);
  expect(path).not.toBeNull();
  expect(colliders.blockedForNavigation(path!.at(-1)!.x, path!.at(-1)!.z, .55)).toBe(false);
  if (exact) expect(path!.at(-1)).toEqual(goal);
  else expect(path!.at(-1)).not.toEqual(goal);
});
