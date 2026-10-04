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

  it('masks square point corners with a soft round silhouette while retaining built-in fog and depth behavior', () => {
    const air = buildWoodlandAir({ terrain, quality: 'medium' }, new THREE.FogExp2(0xa6b0ad, 0.0029));
    const points = air.group.children[0] as THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
    const original = THREE.ShaderLib.points;
    const shader = { uniforms: {}, vertexShader: original.vertexShader, fragmentShader: original.fragmentShader } as Parameters<THREE.Material['onBeforeCompile']>[0];
    points.material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toBe(original.vertexShader);
    expect(shader.fragmentShader).toContain('length(gl_PointCoord - vec2(0.5))');
    expect(shader.fragmentShader).toContain('if (woodlandMoteRadius >= 0.5) discard;');
    expect(shader.fragmentShader).toContain('1.0 - smoothstep(0.10, 0.5, woodlandMoteRadius)');
    expect(shader.fragmentShader).toContain('diffuseColor.a *= woodlandMoteMask * woodlandMoteMask;');
    for (const include of ['alphatest_fragment', 'map_particle_fragment', 'logdepthbuf_fragment', 'tonemapping_fragment', 'colorspace_fragment', 'fog_fragment']) {
      expect(shader.fragmentShader).toContain(`#include <${include}>`);
    }
    expect(points.material.customProgramCacheKey()).toBe('tervain-woodland-rounded-motes-v1');
    expect(points.material.depthTest).toBe(true);
    expect(points.material.depthWrite).toBe(false);
    expect(points.material.sizeAttenuation).toBe(true);
    expect(points.material.fog).toBe(true);
    expect(points.material.map).toBeNull();
    expect(points.material.alphaMap).toBeNull();
    air.dispose?.();
  });

  it('keeps every mote within its gentle local drift envelope across long and irregular frame intervals', () => {
    const air = buildWoodlandAir({ terrain, quality: 'high' }, new THREE.FogExp2(0xa6b0ad, 0.0029));
    const points = air.group.children[0] as THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
    air.update(0, frame(-182, 14));
    const initial = [...points.geometry.getAttribute('position').array];
    for (const dt of [1 / 60, 0.027, 0.1, 2, 11, 60, 600, 3600]) {
      air.update(dt, frame(-182, 14));
      const current = points.geometry.getAttribute('position').array;
      for (let i = 0; i < current.length; i += 3) {
        expect(Number.isFinite(current[i])).toBe(true);
        expect(Number.isFinite(current[i + 1])).toBe(true);
        expect(Number.isFinite(current[i + 2])).toBe(true);
        // Differences between any two phases are at most twice each authored drift radius.
        expect(Math.abs(current[i]! - initial[i]!)).toBeLessThanOrEqual(1.5001);
        expect(Math.abs(current[i + 1]! - initial[i + 1]!)).toBeLessThanOrEqual(0.7001);
        expect(Math.abs(current[i + 2]! - initial[i + 2]!)).toBeLessThanOrEqual(1.3001);
      }
    }
    air.dispose?.();
  });

  it('fades the pollen patch continuously through the woodland boundary instead of appearing at full opacity', () => {
    const fog = new THREE.FogExp2(0xa6b0ad, 0.0029);
    const air = buildWoodlandAir({ terrain, quality: 'medium' }, fog);
    const points = air.group.children[0] as THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
    let previous = 0, maximumStep = 0, oldThresholdOpacity = 1;
    for (let x = -270; x < -70; x += 0.1) {
      fog.density = 0.0029;
      air.update(1 / 60, frame(x, 10));
      const opacity = points.material.opacity;
      const cover = deepwoodCover(x, 10);
      maximumStep = Math.max(maximumStep, Math.abs(opacity - previous));
      if (cover > 0.019 && cover < 0.021) oldThresholdOpacity = Math.min(oldThresholdOpacity, opacity);
      expect(points.visible).toBe(opacity > 0);
      previous = opacity;
    }
    expect(maximumStep).toBeLessThan(0.025);
    expect(oldThresholdOpacity).toBeLessThan(0.012);
    air.dispose?.();
  });
});
