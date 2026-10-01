import type { Collider } from '../world/colliders';

export interface CameraPoint { x: number; y: number; z: number }

/** The camera's body includes the near-plane corners and the small impact recoil. */
export const CAMERA_CLEARANCE = 0.34;

type Interval = [number, number];

function slab(origin: number, delta: number, low: number, high: number): Interval | null {
  if (Math.abs(delta) < 1e-10) return origin >= low && origin <= high ? [0, 1] : null;
  const a = (low - origin) / delta;
  const b = (high - origin) / delta;
  const entry = Math.max(0, Math.min(a, b));
  const exit = Math.min(1, Math.max(a, b));
  return entry <= exit ? [entry, exit] : null;
}

/** Exact continuous boom intersection with a finite cylinder or a conservative expanded oriented box.
 * Keeping the vertical interval avoids treating a low crate or a roof opening as an infinite wall.
 */
export function cameraColliderEntry(a: CameraPoint, b: CameraPoint, c: Collider, ground: number, fallbackHeight: number, radius = CAMERA_CLEARANCE): number | null {
  if (!c.active) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const bounds = c as Collider & { minY?: number; maxY?: number };
  const vertical = slab(a.y, dy, (bounds.minY ?? ground) - radius, (bounds.maxY ?? ground + fallbackHeight) + radius);
  if (!vertical) return null;
  let horizontal: Interval | null;
  if (c.kind === 'circle') {
    const ox = a.x - c.x;
    const oz = a.z - c.z;
    const r = c.r + radius;
    const aa = dx * dx + dz * dz;
    const bb = ox * dx + oz * dz;
    const cc = ox * ox + oz * oz - r * r;
    if (aa < 1e-12) horizontal = cc <= 0 ? [0, 1] : null;
    else {
      const discriminant = bb * bb - aa * cc;
      if (discriminant < 0) horizontal = null;
      else {
        const root = Math.sqrt(discriminant);
        const entry = Math.max(0, (-bb - root) / aa);
        const exit = Math.min(1, (-bb + root) / aa);
        horizontal = entry <= exit ? [entry, exit] : null;
      }
    }
  } else {
    const cos = Math.cos(c.yaw);
    const sin = Math.sin(c.yaw);
    const ox = a.x - c.x;
    const oz = a.z - c.z;
    const x = slab(ox * cos - oz * sin, dx * cos - dz * sin, -c.hw - radius, c.hw + radius);
    const z = slab(ox * sin + oz * cos, dx * sin + dz * cos, -c.hd - radius, c.hd + radius);
    if (!x || !z) horizontal = null;
    else {
      const entry = Math.max(x[0], z[0]);
      const exit = Math.min(x[1], z[1]);
      horizontal = entry <= exit ? [entry, exit] : null;
    }
  }
  if (!horizontal) return null;
  const entry = Math.max(horizontal[0], vertical[0]);
  return entry <= Math.min(horizontal[1], vertical[1]) ? entry : null;
}
