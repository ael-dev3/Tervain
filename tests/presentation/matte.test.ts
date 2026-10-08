import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { matteHide, roughnessFloor } from '../../src/presentation/matte';

const shaderSource = () => ({
  uniforms: {} as Record<string, THREE.IUniform>,
  vertexShader: 'void main() {}',
  fragmentShader: 'uniform float roughness;\nvoid main() {\n#include <roughnessmap_fragment>\n}',
});
type Shader = Parameters<THREE.Material['onBeforeCompile']>[0];
const compile = (material: THREE.Material) => {
  const shader = shaderSource();
  material.onBeforeCompile(shader as unknown as Shader, {} as THREE.WebGLRenderer);
  return shader;
};

describe('matte surfaces (A67)', () => {
  it('floors the final roughness after the map, keeping earlier patches and keying the program', () => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.45 });
    let earlier = 0;
    material.onBeforeCompile = () => { earlier++; };
    roughnessFloor(material, 0.7);
    expect(material.roughness).toBe(0.7);
    expect(material.customProgramCacheKey()).toContain('tervain-rough-floor-v1');
    const shader = compile(material);
    expect(earlier).toBe(1);
    expect(shader.fragmentShader).toContain('uniform float uTvRoughFloor;');
    expect(shader.fragmentShader.indexOf('roughnessFactor = max( roughnessFactor, uTvRoughFloor );'))
      .toBeGreaterThan(shader.fragmentShader.indexOf('#include <roughnessmap_fragment>'));
    expect(shader.uniforms.uTvRoughFloor!.value).toBe(0.7);
  });

  it('moves the floor when applied again rather than patching twice, and leaves rougher materials alone', () => {
    const material = roughnessFloor(new THREE.MeshStandardMaterial({ roughness: 0.9 }), 0.6);
    expect(material.roughness).toBe(0.9);
    const shader = compile(material);
    roughnessFloor(material, 0.8);
    expect(shader.uniforms.uTvRoughFloor!.value).toBe(0.8);
    expect(compile(material).fragmentShader.match(/uniform float uTvRoughFloor;/g)).toHaveLength(1);
    // A copy carries the setting in its user data but not the patch, so it is patched afresh.
    const copy = roughnessFloor(material.clone(), 0.75);
    expect(compile(copy).uniforms.uTvRoughFloor!.value).toBe(0.75);
  });

  it('makes hides matte and never metallic', () => {
    const hide = matteHide(new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 1, metalnessMap: new THREE.Texture() }));
    expect(hide.metalness).toBe(0);
    expect(hide.metalnessMap).toBeNull();
    expect(hide.roughness).toBeGreaterThanOrEqual(0.8);
    expect(hide.envMapIntensity).toBeLessThan(1);
  });
});
