import * as THREE from 'three';
import { expect, it } from 'vitest';
import { TileLayer } from '../../src/presentation/ground/tileStream';

it('omits only band-invisible trailing clumps, with rounding headroom and independent capture recovery', () => {
  const material = new THREE.MeshBasicMaterial();
  const layer = new TileLayer({ name: 'band-tail', tileSize: 32, capacity: 5,
    geometry: new THREE.PlaneGeometry(.2, .2), material, fadeStart: 40, fadeEnd: 41,
    power: 1, maxHeight: .2, maxRadius: .3, receiveShadow: false, trimFadedTail: true,
    band: { start: 14, end: 19 },
    generate(tx, tz, out) {
      out.ymin = out.ymax = 0;
      if (tx || tz) return 0;
      // Visible head, boundary-margin anchors, and certainly invisible outer/inner tails.
      [16, 19.005, 13.995, 24, 8].forEach((x, i) => out.base.set([x, 0, 0, i / 10], i * 4));
      return 5;
    },
  });
  try {
    const main = new THREE.Vector3(); layer.update(main); layer.group.updateMatrixWorld(true);
    const mesh = layer.group.children.find(o => (o as THREE.Mesh).geometry.getAttribute('aBase').getX(0) === 16) as THREE.Mesh<THREE.InstancedBufferGeometry>;
    const bases = (mesh.geometry.getAttribute('aBase').array as Float32Array).slice();
    expect(mesh.geometry.instanceCount).toBe(3);
    const capture = new THREE.PerspectiveCamera(90, 1, .1, 100);
    capture.position.set(24, 0, 0); capture.lookAt(8, 0, 0); capture.updateMatrixWorld(true);
    mesh.onBeforeRender({} as THREE.WebGLRenderer, new THREE.Scene(), capture, mesh.geometry, material, {} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(5); // Tail at x=8 is 16 m from this camera.
    mesh.onAfterRender({} as THREE.WebGLRenderer, new THREE.Scene(), capture, mesh.geometry, material, {} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(3);
    expect(mesh.geometry.getAttribute('aBase').array).toEqual(bases);
    layer.update(capture.position); expect(mesh.geometry.instanceCount).toBe(5);
  } finally { layer.dispose(); }
});
