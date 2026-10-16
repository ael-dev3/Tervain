import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { installLeafTargetCoverage } from '../../src/presentation/foliage/leafTargetCoverage';
import { splitLeafPrepass } from '../../src/presentation/foliage/leafPrepass';

describe('leaf target coverage', () => {
  it('selects each target before both depth and colour draws without changing the material variant', () => {
    const material = new THREE.MeshStandardMaterial({ alphaTest: .5, alphaToCoverage: true });
    const previous = vi.fn();
    material.onBeforeRender = previous;
    const uniform = installLeafTargetCoverage(material)!;
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), material, 1);
    const depth = splitLeafPrepass(mesh)!;
    let target = { samples: 4 };
    const renderer = { getRenderTarget: () => target } as THREE.WebGLRenderer;
    const draw = (m: THREE.Material) => m.onBeforeRender(renderer, new THREE.Scene(), new THREE.Camera(), mesh.geometry, mesh, new THREE.Group());
    draw(material); expect(uniform.value).toBe(1);
    target = { samples: 0 }; draw(depth.material as THREE.Material); expect(uniform.value).toBe(0);
    target = { samples: 4 }; draw(depth.material as THREE.Material); expect(uniform.value).toBe(1);
    expect(previous).toHaveBeenCalledTimes(3);
    expect((depth.material as THREE.Material).alphaToCoverage).toBe(true);
    expect(material.alphaToCoverage).toBe(false);
  });
  it('caches default framebuffer capability and leaves Low materials alone', () => {
    const material = new THREE.MeshStandardMaterial({ alphaToCoverage: true });
    const uniform = installLeafTargetCoverage(material)!;
    const attributes = vi.fn(() => ({ antialias: false }));
    const renderer = { getRenderTarget: () => null, getContext: () => ({ getContextAttributes: attributes }) } as unknown as THREE.WebGLRenderer;
    for (let i = 0; i < 2; i++) material.onBeforeRender(renderer, new THREE.Scene(), new THREE.Camera(), new THREE.PlaneGeometry(), new THREE.Mesh(), new THREE.Group());
    expect(uniform.value).toBe(0); expect(attributes).toHaveBeenCalledTimes(1);
    const low = new THREE.MeshStandardMaterial();
    const hook = low.onBeforeRender;
    expect(installLeafTargetCoverage(low)).toBeNull(); expect(low.onBeforeRender).toBe(hook);
  });
});
