import * as THREE from 'three';
import { expect, it } from 'vitest';
import { treeFootprint, treePlacementBox } from '../../src/presentation/foliage/treeFootprint';

const geometry = (points: number[]) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
it('rejects an empty rotated corner while keeping every source vertex and its wind guard', () => {
  const wood = geometry([-10, 0, 0, 10, 0, 0, 0, 0, -10, 0, 20, 10]);
  const lods = [{ wood, leaf: null }], local = new THREE.Box3().setFromBufferAttribute(wood.getAttribute('position') as THREE.BufferAttribute);
  const matrix = new THREE.Matrix4().makeRotationY(Math.PI / 4), old = local.clone().applyMatrix4(matrix).expandByScalar(2);
  const bound = treePlacementBox(new THREE.Box3(), local, matrix, treeFootprint(lods));
  const corner = new THREE.Box3(new THREE.Vector3(12, 4, -1), new THREE.Vector3(13, 5, 1));
  expect(old.intersectsBox(corner)).toBe(true); expect(bound.intersectsBox(corner)).toBe(false);
  expect(old.containsBox(bound)).toBe(true);
  wood.dispose();
});
it('encloses all three LODs and every two-metre guard under varied yaw and scale', () => {
  const lods = [geometry([-4, -1, 0, 6, 2, 0, 0, 16, -5]), geometry([0, 3, 8, -6, 0, 2]), geometry([7, 1, -7, -8, 2, -4])].map((wood, i) => ({ wood, leaf: i === 1 ? geometry([1, 30, 0]) : null }));
  const local = new THREE.Box3();
  for (const l of lods) for (const g of [l.wood, l.leaf]) if (g) { g.computeBoundingBox(); local.union(g.boundingBox!); }
  const footprint = treeFootprint(lods), point = new THREE.Vector3();
  for (let i = 0; i < 120; i++) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(120, -2, -90), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * .119), new THREE.Vector3(.3 + i * .02, .3 + i * .02, .3 + i * .02));
    const bound = treePlacementBox(new THREE.Box3(), local, matrix, footprint), original = local.clone().applyMatrix4(matrix).expandByScalar(2);
    expect(original.containsBox(bound)).toBe(true);
    expect(bound.min.y).toBe(original.min.y); expect(bound.max.y).toBe(original.max.y);
    for (const l of lods) for (const g of [l.wood, l.leaf]) if (g) {
      const p = g.getAttribute('position');
      for (let v = 0; v < p.count; v++) {
        point.fromBufferAttribute(p, v).applyMatrix4(matrix);
        expect(bound.containsPoint(point.clone().addScalar(2))).toBe(true);
        expect(bound.containsPoint(point.clone().addScalar(-2))).toBe(true);
      }
    }
  }
  for (const l of lods) { l.wood.dispose(); l.leaf?.dispose(); }
});
it('keeps the original box for tilted, projective, missing or invalid footprints', () => {
  const g = geometry([-1, 0, -1, 1, 5, 1]), lods = [{ wood: g, leaf: null }];
  g.computeBoundingBox(); const local = g.boundingBox!;
  for (const matrix of [new THREE.Matrix4().makeRotationX(.3), new THREE.Matrix4().makePerspective(-1, 1, 1, -1, .1, 100)]) {
    expect(treePlacementBox(new THREE.Box3(), local, matrix, treeFootprint(lods))).toEqual(local.clone().applyMatrix4(matrix).expandByScalar(2));
  }
  expect(treeFootprint([])).toEqual([]);
  expect(treePlacementBox(new THREE.Box3(), local, new THREE.Matrix4(), [])).toEqual(local.clone().expandByScalar(2));
  g.dispose();
});
