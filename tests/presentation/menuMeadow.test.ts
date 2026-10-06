import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MEADOW_LEVELS, buildMenuMeadow, meadowAt } from '../../src/presentation/menu/menuMeadow';
import { MENU_CAMERA, MENU_FIRE, MENU_TREE, browZ, menuHeight, trackDistance } from '../../src/presentation/menu/menuLayout';
import { MENU_SEA_LEVEL } from '../../src/presentation/menu/menuSky';
import { GrassWind } from '../../src/presentation/grass/wind';
import { GrassTrample } from '../../src/presentation/grass/trample';
import { clumpTriangles } from '../../src/presentation/grass/bladeGeometry';

const WIND = { direction: [0.5, 0.87] as [number, number], steady: 0.2, gust: 0.55, speed: 3.4 };
const keep = [{ x: 2, z: -4, r: 0.8 }, { x: -6, z: 0, r: 1.5 }];

function clumps(meadow: ReturnType<typeof buildMenuMeadow>) {
  const out: { level: number; x: number; y: number; z: number; height: number; radius: number }[] = [];
  meadow.group.children.forEach((child, level) => {
    const g = (child as THREE.Mesh<THREE.InstancedBufferGeometry>).geometry;
    const base = g.getAttribute('aBase'), shape = g.getAttribute('aShape');
    for (let i = 0; i < g.instanceCount; i++) out.push({ level, x: base.getX(i), y: base.getY(i), z: base.getZ(i), height: shape.getZ(i), radius: shape.getY(i) });
  });
  return out;
}

describe('menu heath meadow', () => {
  it('grows nothing on the ruts, the camp, the tree’s feet, past the brow or under the sea', () => {
    expect(meadowAt(MENU_FIRE.x, MENU_FIRE.z).cover).toBe(0);
    expect(meadowAt(MENU_TREE.x, MENU_TREE.z).cover).toBe(0);
    expect(meadowAt(0, browZ(0) - 2).cover).toBe(0);
    expect(meadowAt(-60, -120).cover).toBe(0);
    let rut = 0, open = 0;
    for (let z = 5; z > -30; z -= 0.37) for (let x = -20; x < 20; x += 0.41) {
      const spot = meadowAt(x, z);
      expect(Object.values(spot).every(Number.isFinite)).toBe(true);
      expect(spot.cover).toBeGreaterThanOrEqual(0);
      expect(spot.cover).toBeLessThanOrEqual(1);
      expect(spot.flowers).toBeLessThanOrEqual(0.32);
      if (Math.abs(trackDistance(x, z).d - 0.72) < 0.15) { rut++; expect(spot.cover).toBe(0); }
      if (spot.cover > 0.5) open++;
    }
    expect(rut).toBeGreaterThan(50);
    // The heath is the scene: most of the headland in view is deep grass.
    expect(open).toBeGreaterThan(1500);
  });

  it('sows every level within the view, clear of claimed ground, and the same way every time', () => {
    const wind = new GrassWind(WIND);
    const a = buildMenuMeadow({ quality: 'medium', keep, wind, trample: null });
    const b = buildMenuMeadow({ quality: 'medium', keep, wind, trample: null });
    const all = clumps(a);
    expect(all.length).toBe(a.count);
    expect(clumps(b)).toEqual(all);
    const view = Math.atan2(MENU_CAMERA.lookX - MENU_CAMERA.x, MENU_CAMERA.lookZ - MENU_CAMERA.z);
    for (const c of all) {
      const level = MEADOW_LEVELS.medium[c.level]!;
      const r = Math.hypot(c.x - MENU_CAMERA.x, c.z - MENU_CAMERA.z);
      expect(r).toBeGreaterThanOrEqual(level.from - 1e-6);
      expect(r).toBeLessThanOrEqual(level.to + 1e-6);
      const off = Math.atan2(c.x - MENU_CAMERA.x, c.z - MENU_CAMERA.z) - view;
      expect(Math.abs(Math.atan2(Math.sin(off), Math.cos(off)))).toBeLessThanOrEqual(1.03);
      expect(c.y).toBeCloseTo(menuHeight(c.x, c.z) - 0.03, 5);
      expect(c.y).toBeGreaterThan(MENU_SEA_LEVEL);
      expect(c.z).toBeGreaterThan(browZ(c.x));
      expect(meadowAt(c.x, c.z).cover).toBeGreaterThan(0);
      for (const k of keep) expect(Math.hypot(c.x - k.x, c.z - k.z)).toBeGreaterThan(k.r);
      expect(c.height).toBeGreaterThanOrEqual(0.2);
    }
    // Each band hands over to the next: the levels overlap where their bands cross.
    for (let i = 1; i < MEADOW_LEVELS.medium.length; i++) {
      const near = MEADOW_LEVELS.medium[i - 1]!, far = MEADOW_LEVELS.medium[i]!;
      expect(far.band.inStart).toBe(near.band.outStart);
      expect(far.band.inEnd).toBe(near.band.outEnd);
      expect(near.to).toBeGreaterThanOrEqual(near.band.outEnd);
      expect(far.from).toBeLessThanOrEqual(far.band.inStart);
    }
    a.dispose(); b.dispose(); wind.dispose();
  });

  it('stays within its budget on every preset, densest and finest on high', () => {
    const wind = new GrassWind(WIND);
    const trample = new GrassTrample(32, 72, { x: 0, z: -14 });
    const budget = { low: 160000, medium: 330000, high: 600000 } as const;
    let last = 0;
    for (const quality of ['low', 'medium', 'high'] as const) {
      const meadow = buildMenuMeadow({ quality, keep, wind, trample });
      let triangles = 0;
      meadow.group.children.forEach((child, i) => {
        const g = (child as THREE.Mesh<THREE.InstancedBufferGeometry>).geometry;
        triangles += g.instanceCount * clumpTriangles(MEADOW_LEVELS[quality][i]!.clump);
        expect(g.index!.count / 3).toBe(clumpTriangles(MEADOW_LEVELS[quality][i]!.clump));
        expect((child as THREE.Mesh).castShadow).toBe(false);
      });
      expect(triangles).toBe(meadow.triangles);
      expect(meadow.triangles).toBeLessThan(budget[quality]);
      expect(meadow.triangles).toBeGreaterThan(last);
      expect(meadow.group.children).toHaveLength(3);
      last = meadow.triangles;
      meadow.dispose();
    }
    trample.dispose(); wind.dispose();
  });
});
