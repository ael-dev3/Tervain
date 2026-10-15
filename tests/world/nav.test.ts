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

describe('navigation search state isolation', () => {
  it('keeps results independent across successful, expansion-limited and failed searches after gate changes', () => {
    const terrain = { nx: (WORLD.maxX - WORLD.minX) / WORLD.cell, nz: (WORLD.maxZ - WORLD.minZ) / WORLD.cell,
      groundAt: () => 0, walkable: () => true } as unknown as Terrain;
    const colliders = new Colliders();
    colliders.box('gate', 0, 0, .1, WORLD.maxZ - WORLD.minZ);
    const nav = new NavGrid(terrain, colliders);
    const from = { x: -9, z: 1 }, to = { x: 9, z: 1 };
    expect(nav.findPath(from, to)).toBeNull();
    colliders.setActive('gate', false);
    const saved = nav.findPath(from, to);
    expect(saved?.at(-1)).toEqual(to);
    const snapshot = structuredClone(saved);
    expect(nav.findPath(to, from, 0)).toBeNull();
    expect(nav.findPath(to, from)).toEqual(new NavGrid(terrain, colliders).findPath(to, from));
    colliders.setActive('gate', true);
    expect(nav.findPath(from, to)).toBeNull();
    colliders.setActive('gate', false);
    expect(nav.findPath(from, to)).toEqual(snapshot);
    expect(saved).toEqual(snapshot);
  });

  it('keeps the wider-creature search state separate from ordinary routes', () => {
    const nav = open(), wide = nav.forRadius(.85);
    const a = { x: -9, z: 1 }, b = { x: 9, z: 1 };
    const route = nav.findPath(a, b), snapshot = structuredClone(route);
    expect(wide.findPath(b, a, 0)).toBeNull();
    expect(wide.findPath(b, a)?.at(-1)).toEqual(a);
    expect(nav.findPath(a, b)).toEqual(snapshot);
    expect(route).toEqual(snapshot);
  });
});
