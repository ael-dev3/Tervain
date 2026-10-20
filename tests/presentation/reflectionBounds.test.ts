import * as THREE from 'three';
import { expect, it } from 'vitest';
import { ReflectionBounds } from '../../src/presentation/reflectionBounds';

it('retains exact transformed bounds through static, moving, scaled and edited geometry inputs', () => {
  const cache = new ReflectionBounds(), matrix = new THREE.Matrix4();
  const sphere = new THREE.Sphere(new THREE.Vector3(2, 3, 4), 2), box = new THREE.Box3(new THREE.Vector3(-1, -2, -3), new THREE.Vector3(3, 4, 5));
  const check = () => {
    expect(cache.sphere(sphere, matrix).equals(sphere.clone().applyMatrix4(matrix))).toBe(true);
    expect(cache.box(box, matrix).equals(box.clone().applyMatrix4(matrix))).toBe(true);
  };
  check(); check();
  matrix.compose(new THREE.Vector3(-8, 4, 9), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .7), new THREE.Vector3(2, .5, -3));
  check(); check();
  sphere.center.y -= 8; sphere.radius += 1; box.min.y -= 12; check();
  const other = matrix.clone();
  expect(cache.sphere(sphere, other)).not.toBe(cache.sphere(sphere, matrix));
  expect(cache.box(box, other)).not.toBe(cache.box(box, matrix));
});
