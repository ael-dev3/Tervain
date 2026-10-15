import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { TileLayer } from '../../src/presentation/ground/tileStream';

it.each([false, true])('reuses main-camera thinning and retains independent capture thinning (blade prefixes: %s)', prefix => {
  const material = new THREE.MeshBasicMaterial(), geometry = new THREE.PlaneGeometry(.2, .2);
  const layer = new TileLayer({ name: 'main-distance', tileSize: 10, capacity: 16, geometry, material,
    fadeStart: 0, fadeEnd: 100, power: 1, maxHeight: .2, maxRadius: .3, receiveShadow: false,
    ...(prefix ? { drawCountAt: (d: number) => d > 30 ? 3 : 6 } : {}),
    generate(tx, tz, out) {
      out.ymin = out.ymax = 0;
      if (tx || tz) return 0;
      for (let i = 0; i < 16; i++) out.base.set([5, 0, 5, (i + .5) / 16], i * 4);
      return 16;
    },
  });
  try {
    const main = new THREE.PerspectiveCamera(60, 1, .1, 200);
    main.position.set(70, 2, 5); main.lookAt(5, 0, 5); main.updateMatrixWorld(true);
    layer.update(main.position); layer.group.updateMatrixWorld(true);
    const mesh = layer.group.children.find(o => (o as THREE.Mesh).geometry.getAttribute('aBase').getX(0) === 5) as THREE.Mesh<THREE.InstancedBufferGeometry>;
    const primary = mesh.geometry.instanceCount, scene = new THREE.Scene(), renderer = {} as THREE.WebGLRenderer;
    const distances = vi.spyOn(layer as unknown as { distTo(...args: unknown[]): number }, 'distTo');
    const draw = (camera: THREE.Camera) => {
      mesh.onBeforeRender(renderer, scene, camera, mesh.geometry, material, {} as THREE.Group);
      const result = [mesh.geometry.instanceCount, mesh.geometry.drawRange.count];
      mesh.onAfterRender(renderer, scene, camera, mesh.geometry, material, {} as THREE.Group);
      expect(mesh.geometry.instanceCount).toBe(primary);
      return result;
    };
    expect(draw(main)).toEqual([6, prefix ? 3 : Infinity]);
    expect(distances).not.toHaveBeenCalled();
    const capture = main.clone(); capture.position.set(5, 2, 8); capture.lookAt(5, 0, 5); capture.updateMatrixWorld(true);
    expect(draw(capture)).toEqual([16, prefix ? 6 : Infinity]);
    expect(distances).toHaveBeenCalledTimes(1);
    expect(draw(main)).toEqual([6, prefix ? 3 : Infinity]);
    expect(distances).toHaveBeenCalledTimes(1);
  } finally { layer.dispose(); }
});
