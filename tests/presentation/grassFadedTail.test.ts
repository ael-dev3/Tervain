import * as THREE from 'three';
import { expect, it } from 'vitest';
import { TileLayer } from '../../src/presentation/ground/tileStream';

it('trims only fully faded trailing anchors and selects a separate prefix for capture cameras', () => {
  const material = new THREE.MeshBasicMaterial();
  const layer = new TileLayer({ name: 'tail', tileSize: 10, capacity: 8,
    geometry: new THREE.PlaneGeometry(.2, .2), material, fadeStart: 0, fadeEnd: 10,
    power: 1, maxHeight: .2, maxRadius: .3, receiveShadow: false, trimFadedTail: true,
    generate(tx, tz, out) {
      out.ymin = out.ymax = 0;
      if (tx || tz) return 0;
      for (let i = 0; i < 8; i++) out.base.set([i < 3 ? 1 : 9, 0, 0, (i + 1) / 10], i * 4);
      return 8;
    },
  });
  try {
    layer.update(new THREE.Vector3());
    const mesh = layer.group.children.find(o => (o as THREE.Mesh).geometry.getAttribute('aBase').getX(0) === 1) as THREE.Mesh<THREE.InstancedBufferGeometry>;
    expect(mesh.geometry.instanceCount).toBe(3);
    const camera = new THREE.PerspectiveCamera(90, 1, .1, 100);
    camera.position.set(10, 0, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    mesh.onBeforeRender({} as THREE.WebGLRenderer, new THREE.Scene(), camera, mesh.geometry, material, {} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(8);
    mesh.onAfterRender({} as THREE.WebGLRenderer, new THREE.Scene(), camera, mesh.geometry, material, {} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(3);
    // Moving the primary camera close again must restore every rank without regenerating buffers.
    layer.update(camera.position);
    expect(mesh.geometry.instanceCount).toBe(8);
  } finally { layer.dispose(); }
});

it('keeps a zero-count main tile available to a closer capture camera', () => {
  const material = new THREE.MeshBasicMaterial();
  const layer = new TileLayer({ name: 'tail-zero', tileSize: 10, capacity: 1,
    geometry: new THREE.PlaneGeometry(.2, .2), material, fadeStart: 0, fadeEnd: 10,
    power: 1, maxHeight: .2, maxRadius: .3, receiveShadow: false, trimFadedTail: true,
    generate(tx, tz, out) {
      out.ymin = out.ymax = 0;
      if (tx || tz) return 0;
      out.base.set([9, 0, 0, .9]); return 1;
    },
  });
  try {
    layer.update(new THREE.Vector3());
    const mesh = layer.group.children.find(o => (o as THREE.Mesh).geometry.getAttribute('aBase').getX(0) === 9) as THREE.Mesh<THREE.InstancedBufferGeometry>;
    expect(mesh.geometry.instanceCount).toBe(0);
    expect(mesh.visible).toBe(true);
    const camera = new THREE.PerspectiveCamera(90, 1, .1, 100);
    camera.position.set(10, 0, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    mesh.onBeforeRender({} as THREE.WebGLRenderer, new THREE.Scene(), camera, mesh.geometry, material, {} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(1);
    mesh.onAfterRender({} as THREE.WebGLRenderer, new THREE.Scene(), camera, mesh.geometry, material, {} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(0);
  } finally { layer.dispose(); }
});
