import * as THREE from 'three';
import { expect, it } from 'vitest';
import { casterPlacementBounds, updateCasterBounds, shadowBoundsNeedRefresh, shadowCasterVisible, shadowPlacementVisible } from '../../src/presentation/foliage/shadowBounds';

it('bounds only packed casters, enclosing vertices plus wind at mixed scales and rotations', () => {
  const geometry = new THREE.BoxGeometry(4, 8, 3).translate(3, 6, 0);
  geometry.computeBoundingSphere();
  const placements = [.6, 1, 3].map((scale, i) => ({ matrix: new THREE.Matrix4().compose(
    new THREE.Vector3(i * 7, i, -i * 5), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * .7),
    new THREE.Vector3(scale, scale, scale)) }));
  const source = geometry.boundingSphere!, cached = casterPlacementBounds(source, placements), original = source.clone(), target = new THREE.Sphere(), scratch = new THREE.Sphere();
  updateCasterBounds(target, cached, [2, 0], 2, scratch);
  const vertex = new THREE.Vector3(), p = geometry.getAttribute('position');
  for (const index of [2, 0]) for (let i = 0; i < p.count; i++) {
    vertex.fromBufferAttribute(p, i).applyMatrix4(placements[index]!.matrix);
    expect(vertex.distanceTo(target.center) + 2).toBeLessThanOrEqual(target.radius + 1e-10);
  }
  expect(source.equals(original)).toBe(true); expect(cached.byteLength).toBe(placements.length * 32);
  const again = target.clone(); updateCasterBounds(target, cached, [2, 0], 2, scratch);
  expect(target.equals(again)).toBe(true); geometry.dispose();
});

it('drops a removed tail and empties a newly invisible batch without reading absent packing', () => {
  const placements = [0, 1000].map(x => ({ matrix: new THREE.Matrix4().makeTranslation(x, 0, 0) }));
  const source = new THREE.Sphere(new THREE.Vector3(), 1), cached = casterPlacementBounds(source, placements), target = new THREE.Sphere(), scratch = new THREE.Sphere();
  updateCasterBounds(target, cached, [0, 1], 2, scratch);
  expect(target.radius).toBeGreaterThan(500);
  updateCasterBounds(target, cached, [0], 1, scratch);
  expect(target.radius).toBe(3); expect(target.center.x).toBe(0);
  updateCasterBounds(target, cached, undefined, 0, scratch);
  expect(target.isEmpty()).toBe(true);
});

it('keeps rejected casters outside a drifting sun volume and refreshes before its guard is exceeded', () => {
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 100);
  camera.position.set(0, 0, 20); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const reference = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const bound = new THREE.Sphere(new THREE.Vector3(12.05, 0, 0), 1);
  expect(shadowCasterVisible(reference, bound)).toBe(false);
  const current = reference.clone(); for (const plane of current.planes) plane.constant += 1;
  expect(shadowBoundsNeedRefresh(current, reference)).toBe(false);
  expect(current.intersectsSphere(bound)).toBe(false);
  for (const plane of current.planes) plane.constant += .1;
  expect(shadowBoundsNeedRefresh(current, reference)).toBe(true);
  expect(current.intersectsSphere(bound)).toBe(true);
  expect(shadowCasterVisible(current, bound)).toBe(true);
  expect(shadowCasterVisible(reference, new THREE.Sphere().makeEmpty())).toBe(false);
  const rotated = reference.clone(); rotated.planes[0]!.normal.x += .002;
  expect(shadowBoundsNeedRefresh(rotated, reference)).toBe(true);
});

it('rejects off-volume parts independently while preserving wind and sun-drift margins', () => {
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 100);
  camera.position.set(0, 0, 20); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const reference = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const placements = [14.01, 14, 13.99, 0].map(x => ({ matrix: new THREE.Matrix4().makeTranslation(x, 0, 0) }));
  const trunk = casterPlacementBounds(new THREE.Sphere(new THREE.Vector3(), 1), placements);
  const crown = casterPlacementBounds(new THREE.Sphere(new THREE.Vector3(-4, 0, 0), 5), placements);
  expect(shadowPlacementVisible(reference, trunk, 0)).toBe(false);
  for (const i of [1, 2, 3]) expect(shadowPlacementVisible(reference, trunk, i)).toBe(true);
  for (let i = 0; i < placements.length; i++) expect(shadowPlacementVisible(reference, crown, i)).toBe(true);
  const drift = reference.clone(); for (const plane of drift.planes) plane.constant += 1;
  const scratch = new THREE.Sphere();
  for (let i = 0; i < placements.length; i++) {
    scratch.center.fromArray(trunk, i * 4); scratch.radius = trunk[i * 4 + 3]!;
    expect(shadowPlacementVisible(reference, trunk, i)).toBe(shadowCasterVisible(reference, scratch));
    if (!shadowPlacementVisible(reference, trunk, i)) expect(drift.intersectsSphere(scratch)).toBe(false);
  }
});
