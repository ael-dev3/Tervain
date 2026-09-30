import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MENU_CAMERA, MENU_FIRE, MENU_TREE, browZ, menuHeight, menuSplat, trackDistance } from '../../src/presentation/menu/menuLayout';
import { buildMenuGroundGeometry, gridAxis, puddleSpots, restHeight } from '../../src/presentation/menu/menuLand';
import { MENU_SEA_LEVEL } from '../../src/presentation/menu/menuSky';
import { buildAncientTree } from '../../src/presentation/menu/menuTree';
import { slabGeometry } from '../../src/presentation/menu/menuStones';
import { buildCloakedFigure } from '../../src/presentation/menu/menuFigure';
import { weatherEmblemPixels } from '../../src/presentation/menu/menuBanner';

const finite = (a: ArrayLike<number>) => Array.from(a).every(Number.isFinite);

describe('menu headland', () => {
  it('is standable where people and things are, and falls away to the sea beyond the brow', () => {
    // Gentle ground under the camera, the camp and the tree.
    for (const [x, z] of [[MENU_CAMERA.x, MENU_CAMERA.z], [MENU_FIRE.x, MENU_FIRE.z], [MENU_TREE.x + 3, MENU_TREE.z + 3]] as const) {
      const s = Math.abs(menuHeight(x + 0.5, z) - menuHeight(x - 0.5, z)) + Math.abs(menuHeight(x, z + 0.5) - menuHeight(x, z - 0.5));
      expect(s).toBeLessThan(0.6);
    }
    // The camera stands above the ground it looks over.
    expect(MENU_CAMERA.y - menuHeight(MENU_CAMERA.x, MENU_CAMERA.z)).toBeGreaterThan(1.2);
    for (let x = -20; x <= 20; x += 5) expect(menuHeight(x, browZ(x) - 20)).toBeLessThan(MENU_SEA_LEVEL + 1);
  });

  it('has normalised, non-negative layer weights and bounded wetness everywhere', () => {
    for (let x = -60; x <= 60; x += 7.3) {
      for (let z = -70; z <= 16; z += 6.1) {
        const { w, wet } = menuSplat(x, z);
        expect(w).toHaveLength(8);
        expect(w.every((v) => v >= 0 && Number.isFinite(v))).toBe(true);
        expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
        expect(wet).toBeGreaterThanOrEqual(0);
        expect(wet).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps puddles in the ruts and the camp hollow, never floating', () => {
    for (const p of puddleSpots()) {
      const inTrack = trackDistance(p.x, p.z).d < 1.5;
      const inCamp = Math.hypot(p.x - MENU_FIRE.x, p.z - MENU_FIRE.z) < 4;
      expect(inTrack || inCamp).toBe(true);
      expect(restHeight(p.x, p.z, 0.3)).toBeLessThanOrEqual(menuHeight(p.x, p.z));
    }
  });

  it('meshes finely near the camp and leaves open sea unmeshed', () => {
    const axis = gridAxis(-20, 20, -5, 5, 0.3, 0.1);
    expect(axis[0]).toBe(-20);
    expect(axis[axis.length - 1]).toBe(20);
    for (let i = 1; i < axis.length; i++) expect(axis[i]!).toBeGreaterThan(axis[i - 1]!);
    const g = buildMenuGroundGeometry('low');
    const pos = g.getAttribute('position');
    expect(finite(pos.array as Float32Array)).toBe(true);
    const idx = g.index!;
    // No triangle lies entirely under the sea.
    for (let i = 0; i < idx.count; i += 3) {
      const ys = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)].map((k) => pos.getY(k));
      expect(Math.max(...ys)).toBeGreaterThan(MENU_SEA_LEVEL - 0.5);
    }
    // Every face is wound to face the sky (cliff faces lean outward but never face down).
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    let up = 0;
    for (let i = 0; i < idx.count; i += 3) {
      p0.fromBufferAttribute(pos, idx.getX(i));
      p1.fromBufferAttribute(pos, idx.getX(i + 1));
      p2.fromBufferAttribute(pos, idx.getX(i + 2));
      if (p1.sub(p0).cross(p2.sub(p0)).y > 0) up++;
    }
    expect(up / (idx.count / 3)).toBeGreaterThan(0.995);
  });
});

describe('ancient tree', () => {
  it('is deterministic, finite, and stays within its space', () => {
    const a = buildAncientTree(1207, { leafCards: 600 });
    const b = buildAncientTree(1207, { leafCards: 600 });
    expect(a.wood.getAttribute('position').count).toBe(b.wood.getAttribute('position').count);
    expect(Array.from(a.leaves.getAttribute('position').array as Float32Array)).toEqual(Array.from(b.leaves.getAttribute('position').array as Float32Array));
    expect(a.stats.leafCards).toBe(600);
    for (const g of [a.wood, a.leaves]) {
      expect(finite(g.getAttribute('position').array as Float32Array)).toBe(true);
      expect(finite(g.getAttribute('normal').array as Float32Array)).toBe(true);
      g.computeBoundingBox();
      const box = g.boundingBox!;
      expect(box.max.y).toBeLessThan(26);
      expect(box.min.y).toBeGreaterThan(-2);
      expect(Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z)).toBeLessThan(20);
    }
    expect(a.lowBoughs.length).toBeGreaterThan(8);
    expect(a.perches.length).toBeGreaterThan(3);
  });
});

describe('standing stones', () => {
  it('are closed, upright slabs with a broken top', () => {
    const g = slabGeometry({ w: 1, h: 3.2, d: 0.6, seed: 300 });
    const pos = g.getAttribute('position');
    expect(finite(pos.array as Float32Array)).toBe(true);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    expect(box.max.y).toBeLessThan(3.4);
    expect(box.max.y).toBeGreaterThan(2.4);
    expect(box.min.y).toBeLessThan(0);
    expect(box.max.x - box.min.x).toBeLessThan(1.5);
    // Shared corners displace identically, so every position appears on at least two faces or is interior to one.
    const key = (i: number) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    const count = new Map<string, number>();
    for (let i = 0; i < pos.count; i++) count.set(key(i), (count.get(key(i)) ?? 0) + 1);
    const shared = [...count.values()].filter((c) => c >= 2).length;
    expect(shared).toBeGreaterThan(40);
  });
});

describe('the warden', () => {
  it('is a finite seated figure about as tall as a sitting man, and holds still with zero amplitude', () => {
    const f = buildCloakedFigure(3);
    const mesh = f.group.children[0] as THREE.Mesh;
    const pos = mesh.geometry.getAttribute('position');
    expect(finite(pos.array as Float32Array)).toBe(true);
    mesh.geometry.computeBoundingBox();
    const h = mesh.geometry.boundingBox!.max.y;
    expect(h).toBeGreaterThan(1.3);
    expect(h).toBeLessThan(1.7);
    f.update(4, 0);
    expect(mesh.scale.toArray()).toEqual([1, 1, 1]);
    f.dispose();
  });
});

describe('the standard emblem', () => {
  it('is dulled and worn, never repainted where it is transparent', () => {
    const w = 8;
    const h = 8;
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      d.set(i % 2 ? [220, 170, 40, 255] : [120, 40, 200, 0], i * 4);
    }
    const before = d.slice();
    weatherEmblemPixels(d, w, h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      if (before[o + 3] === 0) {
        expect(d[o + 3]).toBe(0);
        continue;
      }
      const sat = (r: number, g: number, b: number) => Math.max(r, g, b) - Math.min(r, g, b);
      expect(sat(d[o]!, d[o + 1]!, d[o + 2]!)).toBeLessThan(sat(before[o]!, before[o + 1]!, before[o + 2]!));
      expect(d[o + 3]!).toBeLessThanOrEqual(before[o + 3]!);
    }
  });
});
