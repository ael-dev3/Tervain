import type * as THREE from 'three';

type SupportLengths = { x: number; y: number; z: number; norm: number; yz: number; xy: number };
// Tile translations change plane distance, but not the transported normal's lengths.
// Keep weak entries so discarded capture frusta are not retained.
const planeLengths = new WeakMap<THREE.Plane, SupportLengths>();

/** Support of a sphere intersected with its known horizontal shader extent. Vertical extent stays the original sphere's. */
export function sphereSlabSupport(x: number, y: number, z: number, radius: number, half: number, lengths?: SupportLengths): number {
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z), norm = lengths?.norm ?? Math.hypot(ax, ay, az);
  if (!norm) return 0;
  if (half >= radius || radius * ax <= half * norm && radius * az <= half * norm) return radius * norm;
  const remaining = Math.sqrt(Math.max(0, radius * radius - half * half));
  const yz = lengths?.yz ?? Math.hypot(ay, az), xy = lengths?.xy ?? Math.hypot(ax, ay);
  const atZ = yz ? Math.min(half, remaining * az / yz) : 0;
  const atX = xy ? Math.min(half, remaining * ax / xy) : 0;
  return Math.max(
    ax * half + az * atZ + ay * Math.sqrt(Math.max(0, remaining * remaining - atZ * atZ)),
    az * half + ax * atX + ay * Math.sqrt(Math.max(0, remaining * remaining - atX * atX)),
  );
}

/** Plane tests for the original sphere clipped only by its guaranteed tile-footprint X/Z bounds. Reuses cached lengths while normals stay unchanged. */
export function horizontalSphereIntersects(frustum: THREE.Frustum, sphere: THREE.Sphere, half: number, world: THREE.Matrix4): boolean {
  const e = world.elements, c = sphere.center;
  for (const plane of frustum.planes) {
    const n = plane.normal;
    // Transport the plane into local coordinates; this also handles rotated/nonuniformly scaled groups.
    const x = n.x * e[0] + n.y * e[1] + n.z * e[2];
    const y = n.x * e[4] + n.y * e[5] + n.z * e[6];
    const z = n.x * e[8] + n.y * e[9] + n.z * e[10];
    const distance = x * c.x + y * c.y + z * c.z + plane.constant + n.x * e[12] + n.y * e[13] + n.z * e[14];
    // A nonempty clipped sphere contains its centre, so this plane already accepts it.
    if (distance >= -1e-6 && sphere.radius >= 0 && half >= 0) continue;
    let lengths = planeLengths.get(plane);
    if (!lengths || lengths.x !== x || lengths.y !== y || lengths.z !== z) {
      const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
      if (!lengths) {
        lengths = { x, y, z, norm: 0, yz: 0, xy: 0 };
        planeLengths.set(plane, lengths);
      }
      lengths.x = x; lengths.y = y; lengths.z = z;
      lengths.norm = Math.hypot(ax, ay, az);
      lengths.yz = Math.hypot(ay, az); lengths.xy = Math.hypot(ax, ay);
    }
    if (distance + sphereSlabSupport(x, y, z, sphere.radius, half, lengths) < -1e-6) return false;
  }
  return true;
}
