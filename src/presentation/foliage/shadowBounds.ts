import type { Frustum, Matrix4, Sphere } from 'three';

/** Immutable per-placement envelopes. CPU-only doubles retain the cached matrices' precision. */
export function casterPlacementBounds(source: Sphere, placements: readonly { matrix: Matrix4 }[]): Float64Array {
  const bounds = new Float64Array(placements.length * 4), scratch = source.clone();
  for (let i = 0; i < placements.length; i++) {
    scratch.copy(source).applyMatrix4(placements[i]!.matrix);
    scratch.center.toArray(bounds, i * 4);
    bounds[i * 4 + 3] = scratch.radius + 2; // The existing world-space wind guard.
  }
  return bounds;
}

/** Union only the active packed prefix; no transforms or allocations during refresh. */
export function updateCasterBounds(
  target: Sphere, placements: Float64Array, packed: readonly number[] | undefined, count: number, scratch: Sphere,
): void {
  target.makeEmpty();
  for (let i = 0; i < count; i++) {
    const offset = packed![i]! * 4;
    scratch.center.fromArray(placements, offset);
    scratch.radius = placements[offset + 3]!;
    target.union(scratch);
  }
}

/** The same one-metre plane-drift bound used by forest shadow preloading, over the authored realm. */
export function shadowBoundsNeedRefresh(actual: Frustum, reference: Frustum): boolean {
  for (let i = 0; i < actual.planes.length; i++) {
    const a = actual.planes[i]!, b = reference.planes[i]!;
    if (Math.abs(a.constant - b.constant) + 600 * Math.hypot(a.normal.x - b.normal.x, a.normal.y - b.normal.y, a.normal.z - b.normal.z) > 1) return true;
  }
  return false;
}

/** The extra metre keeps a rejection safe while the sun moves within the reference volume's guard. */
export function shadowCasterVisible(reference: Frustum, bound: Sphere): boolean {
  if (bound.isEmpty()) return false;
  for (let i = 0; i < reference.planes.length; i++) if (reference.planes[i]!.distanceToPoint(bound.center) < -bound.radius - 1) return false;
  return true;
}

/** Test one cached part envelope, retaining the same wind and reference-volume drift guards as the batch bound. */
export function shadowPlacementVisible(reference: Frustum, placements: Float64Array, index: number): boolean {
  const offset = index * 4, x = placements[offset]!, y = placements[offset + 1]!, z = placements[offset + 2]!;
  const radius = placements[offset + 3]! + 1;
  for (const plane of reference.planes) {
    if (plane.normal.x * x + plane.normal.y * y + plane.normal.z * z + plane.constant < -radius) return false;
  }
  return true;
}
