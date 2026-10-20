import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { anchorLeafIslands } from '../../src/presentation/leafIslands';

it('reuses the centre-search scratch while keeping opposing island contacts independent', () => {
  const leaf = mergeGeometries([
    new THREE.PlaneGeometry(2, 2).translate(4, 3, 0),
    new THREE.PlaneGeometry(2, 2).translate(-4, 3, 0),
  ]);
  const wood = new THREE.BoxGeometry(.4, 8, .4).translate(0, 4, 0);
  const targets = new Set<THREE.Vector3>(), centre = THREE.Box3.prototype.getCenter;
  const spy = vi.spyOn(THREE.Box3.prototype, 'getCenter').mockImplementation(function(this: THREE.Box3, out: THREE.Vector3) {
    targets.add(out); return centre.call(this, out);
  });
  try {
    expect(anchorLeafIslands(leaf, wood, null, { reach: .5, gap: .2 })).toEqual({ islands: 2, moved: 2, dropped: 0 });
    leaf.computeBoundingBox();
    expect(leaf.boundingBox!.min.x).toBeCloseTo(-2.6, 5);
    expect(leaf.boundingBox!.max.x).toBeCloseTo(2.6, 5);
    expect(spy.mock.calls.length).toBeGreaterThan(4);
    // One shared query centre plus the rebuilt geometry bounding sphere centre.
    expect(targets.size).toBe(2);
  } finally { spy.mockRestore(); leaf.dispose(); wood.dispose(); }
});
