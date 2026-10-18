import type { BufferGeometry, Sphere } from 'three';

/** Unused radial space around the existing whole-tree centre, across every leaf LOD. */
export function leafBoundsShrink(lods: readonly { leaf: BufferGeometry | null }[], whole: Sphere): number {
  let farthest2 = 0, found = false;
  for (const lod of lods) {
    const position = lod.leaf?.getAttribute('position');
    if (!position) continue;
    found = true;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i) - whole.center.x, y = position.getY(i) - whole.center.y, z = position.getZ(i) - whole.center.z;
      farthest2 = Math.max(farthest2, x * x + y * y + z * z);
    }
  }
  // Retain a rounding margin as well as the existing two-metre world-space wind guard.
  return found ? Math.max(0, whole.radius - Math.sqrt(farthest2) - 1e-4) : 0;
}

/** Same centre, smaller radius: every camera's new bound is contained in the old one. */
export function copyLeafBatchBounds(target: Sphere, whole: Sphere, shrink: number): Sphere {
  target.copy(whole);
  if (!target.isEmpty() && shrink > 0) target.radius = Math.max(0, target.radius - shrink);
  return target;
}
