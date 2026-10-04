import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { attachInstanceDistanceVisibility, smoothDistanceFade } from '../../src/presentation/distanceVisibility';
import { FLORA_FADE_START, FLORA_LOD_BANDS, FLORA_MAX_DISTANCE, floraLodWeights } from '../../src/presentation/floraPopulation';

describe('opaque distance continuity', () => {
  it('keeps exactly one combined silhouette through every LOD transition and never submits nonadjacent levels', () => {
    for (const quality of ['low', 'medium', 'high'] as const) {
      let previousNear = 1, previousFar = 0;
      let invalid = 0, maximumSumError = 0;
      for (let distance = 0; distance <= FLORA_MAX_DISTANCE; distance += 0.25) {
        const weights = floraLodWeights(quality, distance);
        maximumSumError = Math.max(maximumSumError, Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1));
        if (!weights.every(value => value >= 0 && value <= 1) || weights[0] * weights[2] !== 0
          || weights[0] > previousNear || weights[2] < previousFar || (quality === 'low' && weights[0] !== 0)) invalid++;
        previousNear = weights[0]; previousFar = weights[2];
      }
      expect(maximumSumError).toBeLessThan(1e-12); expect(invalid).toBe(0);
      for (const [start, end] of [FLORA_LOD_BANDS[quality].near, FLORA_LOD_BANDS[quality].middle]) {
        if (end === start) continue;
        const before = floraLodWeights(quality, start - 0.001);
        const after = floraLodWeights(quality, start + 0.001);
        expect(Math.max(...before.map((weight, i) => Math.abs(weight - after[i]!)))).toBeLessThan(0.000001);
        const finishBefore = floraLodWeights(quality, end - 0.001);
        const finishAfter = floraLodWeights(quality, end + 0.001);
        expect(Math.max(...finishBefore.map((weight, i) => Math.abs(weight - finishAfter[i]!)))).toBeLessThan(0.000001);
      }
    }
  });

  it('keeps far crowns beyond the whole playable realm and removes them only under dense distance fog', () => {
    expect(smoothDistanceFade(760, FLORA_FADE_START, FLORA_MAX_DISTANCE)).toBe(1);
    expect(smoothDistanceFade(FLORA_FADE_START, FLORA_FADE_START, FLORA_MAX_DISTANCE)).toBe(1);
    expect(smoothDistanceFade((FLORA_FADE_START + FLORA_MAX_DISTANCE) / 2, FLORA_FADE_START, FLORA_MAX_DISTANCE)).toBe(0.5);
    expect(smoothDistanceFade(FLORA_MAX_DISTANCE, FLORA_FADE_START, FLORA_MAX_DISTANCE)).toBe(0);
    // The clearest regular-world sky uses FogExp2 density0.0024; no visible treeline is cut at the final boundary.
    expect(Math.exp(-((0.0024 * FLORA_FADE_START) ** 2))).toBeLessThan(0.01);
  });

  it('keeps complete source trees at all visible High distances, including both former geometry switches', () => {
    for (const distance of [0, 36, 42, 48, 116, 132, 148, 350, 620, FLORA_FADE_START, FLORA_MAX_DISTANCE]) {
      expect(floraLodWeights('high', distance)).toEqual([1, 0, 0]);
    }
    expect(floraLodWeights('medium', 100)).toEqual([1, 0, 0]);
    expect(floraLodWeights('medium', 150)).toEqual([0.5, 0.5, 0]);
    expect(floraLodWeights('medium', 400)).toEqual([0, 1, 0]);
    expect(floraLodWeights('medium', 550)).toEqual([0, 0.5, 0.5]);
  });

  it('assigns every overlapping pixel to exactly one adjacent level without blending or temporal noise', () => {
    for (const distance of [121, 150, 179, 481, 550, 619]) {
      const weights = floraLodWeights('medium', distance);
      let invalid = 0;
      for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
        const dot = x * 0.06711056 + y * 0.00583715;
        const value = 52.9829189 * (dot - Math.floor(dot)), sample = value - Math.floor(value);
        let start = 0, visible = 0;
        for (const weight of weights) {
          const end = start + weight;
          if (sample >= start && sample < end) visible++;
          start = end;
        }
        if (visible !== 1) invalid++;
      }
      expect(invalid).toBe(0);
    }
  });

  it('retains source material hooks and MASK textures in the color, depth and distance shaders', () => {
    const texture = new THREE.Texture();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.42, side: THREE.DoubleSide });
    material.onBeforeCompile = shader => { shader.vertexShader += '\n// source hook retained'; };
    material.customProgramCacheKey = () => 'source-hook';
    const mesh = new THREE.InstancedMesh(geometry, material, 2);
    const visibility = attachInstanceDistanceVisibility(mesh);
    expect(visibility.coverage.getY(0)).toBe(1);
    visibility.coverage.setXY(0, 0.3, 0.8);
    expect(material.transparent).toBe(false);
    expect(material.alphaTest).toBe(0.42);
    expect(material.map).toBe(texture);
    expect(material.customProgramCacheKey()).toContain('source-hook');
    for (const [candidate, shaderName] of [[material, 'standard'], [mesh.customDepthMaterial!, 'depth'], [mesh.customDistanceMaterial!, 'distance']] as const) {
      const original = THREE.ShaderLib[shaderName]!;
      const shader = { uniforms: {}, vertexShader: original.vertexShader, fragmentShader: original.fragmentShader } as Parameters<THREE.Material['onBeforeCompile']>[0];
      candidate.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      expect(shader.vertexShader).toContain('aDistanceCoverage');
      expect(shader.fragmentShader).toContain('tvDistanceNoise(gl_FragCoord.xy)');
      expect(shader.fragmentShader.indexOf('tvCoverageSample <')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <alphatest_fragment>'));
      expect((candidate as THREE.MeshStandardMaterial).map).toBe(texture);
      expect((candidate as THREE.MeshStandardMaterial).alphaTest).toBe(0.42);
      if (candidate === material) expect(shader.vertexShader).toContain('source hook retained');
    }
    const geometryReleased = vi.fn(), textureReleased = vi.fn(), sourceReleased = vi.fn(), shadowReleased = vi.fn();
    geometry.addEventListener('dispose', geometryReleased); texture.addEventListener('dispose', textureReleased); material.addEventListener('dispose', sourceReleased);
    mesh.customDepthMaterial!.addEventListener('dispose', shadowReleased); mesh.customDistanceMaterial!.addEventListener('dispose', shadowReleased);
    visibility.dispose(); visibility.dispose();
    expect(shadowReleased).toHaveBeenCalledTimes(2);
    expect(geometryReleased).not.toHaveBeenCalled(); expect(textureReleased).not.toHaveBeenCalled(); expect(sourceReleased).not.toHaveBeenCalled();
    mesh.dispose(); geometry.dispose(); material.dispose(); texture.dispose();
  });
});
