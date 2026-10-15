import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { horizontalSphereIntersects } from '../../src/presentation/ground/extentCull';

it('accepts centre-inside planes without evaluating clipped-sphere support, including sheared transforms', () => {
  const world = new THREE.Matrix4().set(2, .2, -.3, 10, .1, .5, .4, 4, .3, .2, 3, -6, 0, 0, 0, 1);
  const sphere = new THREE.Sphere(new THREE.Vector3(2, 3, -1), 10);
  const centre = sphere.center.clone().applyMatrix4(world);
  const planes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]
    .map(normal => new THREE.Plane(normal, 20 - normal.dot(centre)));
  const frustum = new THREE.Frustum(...planes), hypot = vi.spyOn(Math, 'hypot');
  try {
    expect(horizontalSphereIntersects(frustum, sphere, 4, world)).toBe(true);
    expect(hypot).not.toHaveBeenCalled();
  } finally { hypot.mockRestore(); }
});

it('retains support evaluation for an outside centre and the existing boundary tolerance', () => {
  const sphere = new THREE.Sphere(new THREE.Vector3(), 1), world = new THREE.Matrix4();
  const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -.75);
  const frustum = new THREE.Frustum(...Array.from({ length: 6 }, () => plane.clone()));
  const hypot = vi.spyOn(Math, 'hypot');
  try {
    expect(horizontalSphereIntersects(frustum, sphere, .5, world)).toBe(false);
    expect(hypot).toHaveBeenCalled();
    plane.constant = -.25;
    frustum.planes.forEach(p => { p.constant = plane.constant; });
    expect(horizontalSphereIntersects(frustum, sphere, .5, world)).toBe(true);
    sphere.radius = 0; plane.constant = -.5e-6;
    frustum.planes.forEach(p => { p.constant = plane.constant; });
    expect(horizontalSphereIntersects(frustum, sphere, 0, world)).toBe(true);
    plane.constant = -2e-6;
    frustum.planes.forEach(p => { p.constant = plane.constant; });
    expect(horizontalSphereIntersects(frustum, sphere, 0, world)).toBe(false);
  } finally { hypot.mockRestore(); }
});
