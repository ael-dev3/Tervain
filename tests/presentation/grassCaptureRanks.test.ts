import * as THREE from 'three';
import { expect, it } from 'vitest';
import { TileLayer } from '../../src/presentation/ground/tileStream';

it.each([[70, 5, 16], [5, 70, 6]])('uses capture ranks with main x=%s and capture x=%s, then restores the count', (mainX, captureX, expected) => {
  const material = new THREE.MeshBasicMaterial();
  const geometry = new THREE.PlaneGeometry(.2, .2);
  const layer = new TileLayer({ name: 'capture-ranks', tileSize: 10, capacity: 16, geometry, material,
    fadeStart: 0, fadeEnd: 100, power: 1, maxHeight: .2, maxRadius: .3, receiveShadow: false,
    generate(tx, tz, out) {
      if (tx !== 0 || tz !== 0) { out.ymin = out.ymax = 0; return 0; }
      out.ymin = out.ymax = 0;
      for (let i = 0; i < 16; i++) out.base.set([5, 0, 5, (i + .5) / 16], i * 4);
      return 16;
    },
  });
  try {
    const main = new THREE.PerspectiveCamera(60, 1, .1, 200);
    main.position.set(mainX!, 2, 5); main.lookAt(5, 0, 5); main.updateMatrixWorld(true);
    layer.update(main.position); layer.group.updateMatrixWorld(true);
    const mesh = layer.group.children.find(o => (o as THREE.Mesh).geometry.getAttribute('aBase').getX(0) === 5) as THREE.Mesh<THREE.InstancedBufferGeometry>;
    const primaryCount = mesh.geometry.instanceCount;
    expect(primaryCount).toBeGreaterThan(0);
    if (mainX === 70) expect(primaryCount).toBeLessThan(16); else expect(primaryCount).toBe(16);
    const capture = main.clone(); capture.position.set(captureX!, 2, 8); capture.lookAt(5, 0, 5); capture.updateMatrixWorld(true);
    mesh.onBeforeRender({} as THREE.WebGLRenderer, new THREE.Scene(), capture, mesh.geometry, material, {} as THREE.Group);
    // The close camera needs all ranks; the distant camera can trim them independently.
    expect(mesh.geometry.instanceCount).toBe(expected);
    mesh.onAfterRender({} as THREE.WebGLRenderer, new THREE.Scene(), capture, mesh.geometry, material, {} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(primaryCount);
  } finally { layer.dispose(); }
});
