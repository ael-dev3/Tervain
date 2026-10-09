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
