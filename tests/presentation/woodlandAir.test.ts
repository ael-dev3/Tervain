import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildWoodlandAir } from '../../src/presentation/woodlandAir';
import { groundSplat } from '../../src/presentation/groundSplat';
import type { FrameContext } from '../../src/presentation/context';
import { deepwoodCover } from '../../src/world/forest';
import { Terrain } from '../../src/world/terrain';
import { DEEPWOOD, SPAWN } from '../../src/world/layout';

const terrain = new Terrain();
const frame = (x: number, z: number, reducedMotion = false): FrameContext => ({
  camera: new THREE.PerspectiveCamera(), focus: new THREE.Vector3(x, terrain.heightAt(x, z), z),
  reducedMotion, nightness: 0, time: 0, hour: 11, sunDir: new THREE.Vector3(0.5, 0.8, 0.3),
  quality: 'medium', view: {} as FrameContext['view'],
});

describe('shared woodland habitat and atmosphere', () => {
  it('keeps the landing and vale open while surrounding the inland trail with smoothly blended woodland', () => {
    expect(deepwoodCover(SPAWN.x, SPAWN.z)).toBe(0);
    expect(deepwoodCover(0, 8)).toBe(0);
    expect(deepwoodCover(-182, 14)).toBe(1);
    for (let x = DEEPWOOD.minX - 1; x < DEEPWOOD.maxX + 1; x += 0.25) {
      const w = deepwoodCover(x, 10);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThanOrEqual(1);
      expect(Math.abs(w - deepwoodCover(x + 0.25, 10))).toBeLessThan(0.025);
    }
  });

  it('keeps forest and shore ground blends finite, normalized and physically bounded', () => {
    const layers = new Float32Array(8);
    for (let x = -280; x < -60; x += 7) {
      for (let z = -90; z < 100; z += 17) {
        const wet = groundSplat(terrain, x, z, layers);
        expect(wet).toBeGreaterThanOrEqual(0);
        expect(wet).toBeLessThanOrEqual(1);
        expect([...layers].every((w) => Number.isFinite(w) && w >= 0)).toBe(true);
        expect([...layers].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
      }
    }
  });

  it('adds local depth separation without accumulating fog across sky-reset frames or tinting the empty beach', () => {
    const fog = new THREE.FogExp2(0xa6b0ad, 0.0029);
    const air = buildWoodlandAir({ terrain, quality: 'medium' }, fog);
    air.update(1, frame(-182, 14));
    const firstColor = fog.color.clone();
    const firstDensity = fog.density;
    expect(firstDensity).toBeGreaterThan(0.0029);
    fog.density = 0.0029;
    fog.color.setHex(0xa6b0ad);
    air.update(1, frame(-182, 14));
    expect(fog.density).toBe(firstDensity);
    expect(fog.color).toEqual(firstColor);
    fog.density = 0.0029;
    fog.color.setHex(0xa6b0ad);
    air.update(1, frame(SPAWN.x, SPAWN.z));
    expect(fog.density).toBe(0.0029);
    expect(fog.color.getHex()).toBe(0xa6b0ad);
    expect(air.group.children[0]!.visible).toBe(false);
    air.dispose?.();
  });

  it('freezes actual mote geometry for Reduced Motion, resumes, and releases each allocation once', () => {
    const air = buildWoodlandAir({ terrain, quality: 'medium' }, new THREE.FogExp2(0xa6b0ad, 0.0029));
    const points = air.group.children[0] as THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
    let geometryDisposes = 0, materialDisposes = 0;
    points.geometry.addEventListener('dispose', () => geometryDisposes++);
    points.material.addEventListener('dispose', () => materialDisposes++);
    air.update(1, frame(-182, 14));
    const before = [...points.geometry.getAttribute('position').array];
    air.update(10, frame(-182, 14, true));
    expect([...points.geometry.getAttribute('position').array]).toEqual(before);
    air.update(1, frame(-182, 14));
    expect([...points.geometry.getAttribute('position').array]).not.toEqual(before);
    air.dispose?.();
    air.dispose?.();
    expect(geometryDisposes).toBe(1);
    expect(materialDisposes).toBe(1);
  });
});
