import * as THREE from 'three';
import { expect, it } from 'vitest';
import { TileLayer } from '../../src/presentation/ground/tileStream';

it.each([false, true])('keeps slope data correct after tile reuse (complete writer: %s)', (complete) => {
  let phase = 0;
  const layer = new TileLayer({
    name: 'slope-reuse', tileSize: 10, capacity: 1,
    geometry: new THREE.PlaneGeometry(.2, .2), material: new THREE.MeshBasicMaterial(),
    fadeStart: 0, fadeEnd: 20, power: 1, maxHeight: .2, receiveShadow: false,
    writesSlope: complete,
    generate(tx, tz, out) {
      out.ymin = out.ymax = 0;
      out.base.set([tx * 10 + 5, 0, tz * 10 + 5, .1]);
      // The default producer intentionally leaves the second generation's optional data unwritten.
      if (phase === 0 || complete) out.slope.set(phase === 0 ? [1, 2, 3, 4] : [5, 6, 7, 8]);
      return 1;
    },
  });
  try {
    layer.update(new THREE.Vector3(0, 2, 0));
    const originals = new Set(layer.group.children);
    phase = 1;
    layer.update(new THREE.Vector3(1000, 2, 0));
    const visible = layer.group.children.filter(mesh => mesh.visible) as THREE.Mesh<THREE.InstancedBufferGeometry>[];
    expect(visible.length).toBeGreaterThan(0);
    for (const mesh of visible) {
      expect(originals.has(mesh)).toBe(true);
      expect(Array.from(mesh.geometry.getAttribute('aSlope').array).slice(0, 4)).toEqual(complete ? [5, 6, 7, 8] : [0, 0, 0, 0]);
    }
  } finally { layer.dispose(); }
});
