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

it('shares full matrix capacity without initialising a discarded depth buffer, including after disposal', () => {
  const geometry = new THREE.PlaneGeometry();
  const material = new THREE.MeshStandardMaterial({ alphaTest: .5 });
  const leaf = new THREE.InstancedMesh(geometry, material, 73);
  leaf.setMatrixAt(72, new THREE.Matrix4().makeTranslation(2, 3, 4));
  leaf.setColorAt(72, new THREE.Color('red'));
  const writes = vi.spyOn(THREE.InstancedMesh.prototype, 'setMatrixAt');
  let depth: THREE.InstancedMesh | null = null;
  try {
    depth = splitLeafPrepass(leaf)!;
    expect(writes).not.toHaveBeenCalled();
    expect(depth.instanceMatrix).toBe(leaf.instanceMatrix);
    expect(depth.instanceColor).toBe(leaf.instanceColor);
    expect(depth.instanceMatrix.count).toBe(73);
    expect(depth.count).toBe(0); expect(depth.visible).toBe(false);
    depth.count = 73;
    const matrix = new THREE.Matrix4();
    depth.getMatrixAt(72, matrix);
    expect(matrix.elements.slice(12, 15)).toEqual([2, 3, 4]);
    depth.dispose();
    leaf.setMatrixAt(72, new THREE.Matrix4().makeTranslation(5, 6, 7));
    leaf.getMatrixAt(72, matrix);
    expect(matrix.elements.slice(12, 15)).toEqual([5, 6, 7]);
  } finally {
    writes.mockRestore();
    if (depth) (depth.material as THREE.Material).dispose();
    leaf.dispose(); geometry.dispose(); material.dispose();
  }
});
