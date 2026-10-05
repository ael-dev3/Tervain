import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createGrassPatch, GRASS_Q } from '../../src/presentation/ground/grass';
import { buildGrassClusterTexture } from '../../src/presentation/ground/grassTexture';
import { createPatchMaterial, createPushers } from '../../src/presentation/ground/patchMaterial';

describe('fine rooted grass art', () => {
  it('makes four distinct cutout charts with rooted stems, sky gaps and private disposable buffers', () => {
    const a = buildGrassClusterTexture(128), b = buildGrassClusterTexture(128);
    const data = a.image.data as Uint8Array, cell = 64;
    expect(data).toEqual(b.image.data); expect(data).not.toBe(b.image.data);
    const signature = [];
    for (let tile = 0; tile < 4; tile++) {
      const alpha: number[] = [];
      let baseOpaque = 0;
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const p = ((Math.floor(tile / 2) * cell + y) * 128 + tile % 2 * cell + x) * 4;
        alpha.push(data[p + 3]!);
        if (y < 4 && data[p + 3]! > 90) baseOpaque++;
      }
      expect(alpha.filter(value => value > 90).length).toBeGreaterThan(cell * cell * 0.04);
      expect(alpha.filter(value => value < 90).length).toBeGreaterThan(cell * cell * 0.6);
      expect(baseOpaque).toBeGreaterThan(0);
      signature.push(alpha.join(','));
    }
    expect(new Set(signature).size).toBe(4);
    const sourceB = (b.image.data as Uint8Array)[0]; data[0] = 127; expect((b.image.data as Uint8Array)[0]).toBe(sourceB);
    expect(a.colorSpace).toBe(THREE.NoColorSpace); expect(a.generateMipmaps).toBe(true);
    a.dispose(); b.dispose();
  });

  it('uses small interlocking supports with terrain-fitted roots and never the old six-triangle folded blade', () => {
    for (const quality of ['high', 'medium', 'low'] as const) {
      const geometry = createGrassPatch(GRASS_Q[quality].blades, 12345);
      const p = geometry.getAttribute('position'), root = geometry.getAttribute('aRoot'), uv = geometry.getAttribute('uv');
      expect(p.count / 3).toBe(GRASS_Q[quality].blades * 4);
      expect(root.count).toBe(p.count); expect(uv.count).toBe(p.count);
      let maxHeight = 0;
      for (let i = 0; i < p.count; i++) {
        expect([p.getX(i), p.getY(i), p.getZ(i), root.getX(i), root.getY(i), uv.getX(i), uv.getY(i)].every(Number.isFinite)).toBe(true);
        expect(uv.getX(i)).toBeGreaterThan(0); expect(uv.getX(i)).toBeLessThan(1);
        expect(uv.getY(i)).toBeGreaterThan(0); expect(uv.getY(i)).toBeLessThan(1);
        if (p.getY(i) === 0) { expect(root.getX(i)).toBeCloseTo(p.getX(i), 6); expect(root.getY(i)).toBeCloseTo(p.getZ(i), 6); }
        maxHeight = Math.max(maxHeight, p.getY(i));
      }
      expect(maxHeight).toBeLessThan(0.44);
      geometry.dispose();
    }
  });

  it('keeps original cutout, habitat tint, smooth distance mask and shadows on the same opaque pipeline', () => {
    const map = buildGrassClusterTexture(128);
    const patch = createPatchMaterial({ uTime: { value: 0 }, uWind: { value: 0 } }, createPushers(), new THREE.Vector4(0, 1, 0, 1),
      { cutoutMap: map, vertexColors: false, fadeStart: 12, fadeEnd: 96, sizeComp: 1.12, power: 2.1, windAmp: 0.13, rootShade: 0.43, tipShade: 0.92 });
    expect(patch.material.map).toBe(map); expect(patch.material.alphaTest).toBe(0.36);
    expect(patch.material.alphaToCoverage).toBe(true); expect(patch.material.transparent).toBe(false);
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} } as Parameters<THREE.Material['onBeforeCompile']>[0];
    patch.material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *= vGCol');
    expect(shader.fragmentShader.indexOf('tvDistanceNoise(gl_FragCoord.xy) >= vGCoverage')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <alphatest_fragment>'));
    const dispose = vi.spyOn(map, 'dispose'); patch.material.dispose(); expect(dispose).not.toHaveBeenCalled(); map.dispose();
  });
});
