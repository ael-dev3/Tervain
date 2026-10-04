import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { barkTextures, disposeTreeTextures } from '../../src/presentation/treeTextures';
import { installBarkDetail } from '../../src/presentation/treeMaterials';
import { attachInstanceDistanceVisibility } from '../../src/presentation/distanceVisibility';

afterEach(() => disposeTreeTextures());

function shaderOf(material: THREE.Material, kind: 'standard' | 'depth' | 'distance' = 'standard') {
  const source = THREE.ShaderLib[kind]!;
  const shader = { uniforms: {}, vertexShader: source.vertexShader, fragmentShader: source.fragmentShader } as Parameters<THREE.Material['onBeforeCompile']>[0];
  material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
  return shader;
}

describe('original bark surface detail', () => {
  it('generates new close-scale plate cracks and grain with separate linear relief / roughness data', () => {
    const broad = barkTextures('pine', 256), detail = barkTextures('pine', 512);
    expect(barkTextures('pine', 512)).toBe(detail);
    expect(detail.map).not.toBe(broad.map);
    expect(detail.map.image.width).toBe(512);
    expect(detail.map.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(detail.surface.colorSpace).toBe(THREE.NoColorSpace);
    expect(detail.map.wrapS).toBe(THREE.RepeatWrapping);
    expect(detail.map.wrapT).toBe(THREE.RepeatWrapping);
    expect(detail.map.anisotropy).toBe(16);
    expect(detail.map.generateMipmaps).toBe(true);
    const a = broad.map.image.data!, b = detail.map.image.data!, surface = detail.surface.image.data!;
    let newGrain = 0, lowRelief = 255, highRelief = 0, lowRoughness = 255, highRoughness = 0;
    for (let y = 0; y < 256; y += 7) for (let x = 0; x < 256; x += 7) {
      const i = (y * 256 + x) * 4, j = (y * 2 * 512 + x * 2) * 4;
      newGrain += Math.abs(a[i]! - b[j]!);
      lowRelief = Math.min(lowRelief, surface[j]!); highRelief = Math.max(highRelief, surface[j]!);
      lowRoughness = Math.min(lowRoughness, surface[j + 1]!); highRoughness = Math.max(highRoughness, surface[j + 1]!);
    }
    // Identical UV coordinates differ: this is a new high-frequency field, not upscaled old pixels.
    expect(newGrain).toBeGreaterThan(1000);
    expect(highRelief - lowRelief).toBeGreaterThan(120);
    expect(highRoughness - lowRoughness).toBeGreaterThan(20);
    expect(detail.normal.image.width).toBe(512);
  });

  it('composes metre-scale shading with original material hooks and complementary depth masks without changing vertices', () => {
    const textures = barkTextures('pine', 256), geometry = new THREE.BoxGeometry(), sourceUV = Array.from(geometry.getAttribute('uv').array);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    material.onBeforeCompile = shader => { shader.vertexShader += '\n// original material'; };
    material.customProgramCacheKey = () => 'authored-source';
    installBarkDetail(material, textures);
    const mesh = new THREE.InstancedMesh(geometry, material, 1), coverage = attachInstanceDistanceVisibility(mesh);
    const shader = shaderOf(material);
    expect(shader.uniforms.tvBarkColour!.value).toBe(textures.map);
    expect(shader.uniforms.tvBarkSurface!.value).toBe(textures.surface);
    expect(shader.vertexShader).toContain('// original material');
    expect(shader.vertexShader).toContain('instanceMatrix * tvBarkPosition');
    expect(shader.fragmentShader).toContain('vTvBarkPosition / vec3(0.86, 1.40, 0.86)');
    expect(shader.fragmentShader).toContain('tvBarkReliefRoughness.y');
    expect(shader.fragmentShader).toContain('dFdx(tvBarkHeight)');
    expect(shader.fragmentShader).toContain('tvDistanceNoise(gl_FragCoord.xy)');
    expect(material.customProgramCacheKey()).toContain('authored-source|tervain-metre-bark-v1|tervain-distance-dither-v1');
    expect(Array.from(geometry.getAttribute('uv').array)).toEqual(sourceUV);
    expect(shader.vertexShader).not.toContain('transformed +=');
    expect(shaderOf(mesh.customDepthMaterial!, 'depth').fragmentShader).not.toContain('tvBarkColour');
    expect(shaderOf(mesh.customDistanceMaterial!, 'distance').fragmentShader).not.toContain('tvBarkColour');
    const disposed = vi.fn(); textures.surface.addEventListener('dispose', disposed);
    coverage.dispose(); material.dispose(); mesh.dispose(); geometry.dispose();
    expect(disposed).not.toHaveBeenCalled();
    disposeTreeTextures(); disposeTreeTextures(); expect(disposed).toHaveBeenCalledTimes(1);
  });
});
