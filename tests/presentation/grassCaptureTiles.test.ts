import * as THREE from 'three';
import { expect, it } from 'vitest';
import { TileLayer } from '../../src/presentation/ground/tileStream';
import { WindowView } from '../../src/presentation/windowView';
import type { InteriorSpec, RoomLocator } from '../../src/world/interiors';

function fixture() {
  const material = new THREE.MeshBasicMaterial();
  const layer = new TileLayer({ name: 'capture-tiles', tileSize: 10, capacity: 16,
    geometry: new THREE.PlaneGeometry(.2, .2), material,
    fadeStart: 30, fadeEnd: 40, power: 1, band: { start: -2, end: 20 },
    maxHeight: .2, maxRadius: .3, receiveShadow: false,
    generate(tx, tz, out) {
      out.ymin = out.ymax = 0;
      if (tx !== 0 || tz !== 0) return 0;
      for (let i = 0; i < 16; i++) out.base.set([5, 0, 5, (i + .5) / 16], i * 4);
      return 16;
    },
  });
  layer.update(new THREE.Vector3(31, 2, 5));
  const mesh = layer.group.children.find(o => (o as THREE.Mesh).geometry.getAttribute('aBase').getX(0) === 5) as THREE.Mesh<THREE.InstancedBufferGeometry>;
  return { layer, mesh, material };
}

it('submits a resident tile hidden for the main camera to a nearer capture, then restores its hidden state', () => {
  const { layer, mesh, material } = fixture();
  try {
    expect(mesh.visible).toBe(false);
    expect(mesh.geometry.instanceCount).toBe(0);
    const camera = new THREE.PerspectiveCamera(60, 1, .1, 100);
    camera.position.set(20, 2, 5); camera.lookAt(5, 0, 5); camera.updateMatrixWorld(true);
    const restore = layer.showForCapture(camera.position);
    const nestedRestore = layer.showForCapture(camera.position);
    nestedRestore();
    expect(mesh.visible).toBe(true);
    expect(layer.group.children.filter(o => o.visible)).toEqual([mesh]);
    const scene = new THREE.Scene(); scene.add(layer.group); scene.updateMatrixWorld(true);
    let submitted = 0;
    // Render-list construction skips invisible objects before onBeforeRender can select capture ranks.
    scene.traverseVisible(o => {
      if (o !== mesh) return;
      mesh.onBeforeRender({} as THREE.WebGLRenderer, scene, camera, mesh.geometry, material, {} as THREE.Group);
      submitted += mesh.geometry.instanceCount;
      mesh.onAfterRender({} as THREE.WebGLRenderer, scene, camera, mesh.geometry, material, {} as THREE.Group);
    });
    expect(submitted).toBe(16);
    restore();
    expect(mesh.visible).toBe(false);
    expect(mesh.geometry.instanceCount).toBe(0);
    expect(layer.visibleInstances).toBe(0);
    expect(layer.group.children.filter(o => o.visible)).toHaveLength(0);
    const farRestore = layer.showForCapture(new THREE.Vector3(100, 2, 5));
    expect(mesh.visible).toBe(false); farRestore();
    layer.enabled = false; layer.update(camera.position);
    const disabledRestore = layer.showForCapture(camera.position);
    expect(mesh.visible).toBe(false); disabledRestore();
    layer.enabled = true; layer.update(camera.position);
    const count = mesh.geometry.instanceCount;
    expect(mesh.visible).toBe(true);
    const visibleRestore = layer.showForCapture(new THREE.Vector3(100, 2, 5));
    visibleRestore();
    expect(mesh.visible).toBe(true);
    expect(mesh.geometry.instanceCount).toBe(count);
  } finally { layer.dispose(); }
});

it('restores capture-only tile visibility when a window face fails to render', () => {
  const { layer, mesh, material } = fixture();
  const room = { building: { x: 20, z: 5, yaw: 0, w: 6, d: 5 }, wall: .24, floorTop: .5, wallTop: 3.2 } as InteriorSpec;
  const view = new WindowView({ within: () => room, base: () => 0 } as unknown as RoomLocator, material, 16);
  const renderer = { coordinateSystem: THREE.WebGLCoordinateSystem, shadowMap: { autoUpdate: true }, autoClear: true,
    getRenderTarget: () => null, setRenderTarget() {}, render() { expect(mesh.visible).toBe(true); throw Error('face failed'); },
  } as unknown as THREE.WebGLRenderer;
  view.lighten = at => layer.showForCapture(at);
  try {
    expect(() => view.update(renderer, new THREE.Scene(), new THREE.Vector3(31, 2, 5), 0, true)).toThrow('face failed');
    expect(mesh.visible).toBe(false);
    expect(mesh.geometry.instanceCount).toBe(0);
    expect(material.visible).toBe(true);
    expect(renderer.shadowMap.autoUpdate).toBe(true);
  } finally { view.dispose(); layer.dispose(); }
});
