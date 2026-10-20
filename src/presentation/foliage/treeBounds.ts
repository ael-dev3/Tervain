import type { Box3, Frustum, Sphere } from 'three';

/** Same conservative intersection as sphere && box, rejecting either envelope per plane.
 * Trees keep both existing wind-guarded bounds; no new visibility approximation is introduced. */
export function intersectsTreeBounds(frustum: Frustum, sphere: Sphere, box: Box3): boolean {
  const c = sphere.center, radius = -sphere.radius, min = box.min, max = box.max;
  for (let i = 0; i < 6; i++) {
    const plane = frustum.planes[i]!, n = plane.normal;
    if (n.x * c.x + n.y * c.y + n.z * c.z + plane.constant < radius) return false;
    const x = n.x > 0 ? max.x : min.x, y = n.y > 0 ? max.y : min.y, z = n.z > 0 ? max.z : min.z;
    if (n.x * x + n.y * y + n.z * z + plane.constant < 0) return false;
  }
  return true;
}
