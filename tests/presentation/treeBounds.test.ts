import * as THREE from 'three';
import { expect, it } from 'vitest';
import { intersectsTreeBounds } from '../../src/presentation/foliage/treeBounds';

it('stops at a box rejection without walking later sphere planes', () => {
  const frustum = new THREE.Frustum();
  for (const plane of frustum.planes) plane.set(new THREE.Vector3(1, 0, 0), 100);
  frustum.planes[0]!.constant = -2;
  const sphere = new THREE.Sphere(new THREE.Vector3(), 4);
  const box = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
  let laterReads = 0;
  const plane = frustum.planes[5]!;
  Object.defineProperty(frustum.planes, '5', { get() { laterReads++; return plane; } });
  expect(intersectsTreeBounds(frustum, sphere, box)).toBe(false);
  expect(laterReads).toBe(0);
});

it('matches both Three bounds across perspective, orthographic and tangent cases', () => {
  let state = 1729;
  const rnd = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const box = new THREE.Box3(), sphere = new THREE.Sphere(), frustum = new THREE.Frustum(), matrix = new THREE.Matrix4();
  const cameras = [new THREE.PerspectiveCamera(65, 16 / 9, .1, 1200), new THREE.OrthographicCamera(-80, 80, 70, -70, .1, 600)];
  let kept = 0, rejected = 0;
  for (const camera of cameras) for (let pose = 0; pose < 12; pose++) {
    camera.position.set((rnd() - .5) * 100, 3 + rnd() * 30, (rnd() - .5) * 100);
    camera.lookAt((rnd() - .5) * 200, rnd() * 40, (rnd() - .5) * 200); camera.updateMatrixWorld(true);
    frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (let i = 0; i < 500; i++) {
      const centre = new THREE.Vector3((rnd() - .5) * 800, (rnd() - .5) * 160, (rnd() - .5) * 800);
      box.setFromCenterAndSize(centre, new THREE.Vector3(.1 + rnd() * 30, .1 + rnd() * 70, .1 + rnd() * 30));
      box.getBoundingSphere(sphere); sphere.radius += 2;
      const expected = frustum.intersectsSphere(sphere) && frustum.intersectsBox(box);
      expect(intersectsTreeBounds(frustum, sphere, box)).toBe(expected);
      if (expected) kept++; else rejected++;
    }
  }
  expect(kept).toBeGreaterThan(0); expect(rejected).toBeGreaterThan(0);
  for (const plane of frustum.planes) plane.set(new THREE.Vector3(1, 0, 0), 1e6);
  frustum.planes[0]!.constant = 0;
  for (const x of [-1 - Number.EPSILON, -1, -1 + Number.EPSILON]) {
    sphere.set(new THREE.Vector3(x, 0, 0), 1);
    box.set(new THREE.Vector3(x - 1, -1, -1), new THREE.Vector3(x + 1, 1, 1));
    expect(intersectsTreeBounds(frustum, sphere, box)).toBe(frustum.intersectsSphere(sphere) && frustum.intersectsBox(box));
  }
});
