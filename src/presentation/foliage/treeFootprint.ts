import type { Box3, BufferGeometry, Matrix4 } from 'three';

type Point = readonly [number, number];
/** All-LOD horizontal envelope: cardinal bounds clipped by the four diagonal support planes.
 * Constant storage per template; source vertices are read once, never copied or sorted. */
export function treeFootprint(lods: readonly { wood: BufferGeometry | null; leaf: BufferGeometry | null }[]): readonly Point[] {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let minSum = Infinity, maxSum = -Infinity, minDifference = Infinity, maxDifference = -Infinity;
  for (const lod of lods) for (const geometry of [lod.wood, lod.leaf]) {
    const position = geometry?.getAttribute('position');
    if (!position) continue;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return [];
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      minSum = Math.min(minSum, x + z); maxSum = Math.max(maxSum, x + z);
      minDifference = Math.min(minDifference, x - z); maxDifference = Math.max(maxDifference, x - z);
    }
  }
  if (!Number.isFinite(minX)) return [];
  let polygon: Point[] = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]];
  // Expand the diagonal planes slightly to retain boundary vertices under rounding.
  for (const [nx, nz, limit] of [[1, 1, maxSum + 1e-7], [-1, -1, -minSum + 1e-7], [1, -1, maxDifference + 1e-7], [-1, 1, -minDifference + 1e-7]]) {
    const clipped: Point[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!;
      const da = nx! * a[0] + nz! * a[1] - limit!, db = nx! * b[0] + nz! * b[1] - limit!;
      if (da <= 0) clipped.push(a);
      if (da < 0 && db > 0 || da > 0 && db < 0) {
        const t = da / (da - db);
        clipped.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    polygon = clipped;
  }
  return polygon;
}

/** Preserve the original vertical bounds and wind guard, tightening only empty horizontal corners.
 * Non-upright or projective transforms keep the original box. Always contained in that original box. */
export function treePlacementBox(target: Box3, local: Box3, matrix: Matrix4, footprint: readonly Point[], guard = 2): Box3 {
  target.copy(local).applyMatrix4(matrix).expandByScalar(guard);
  const e = matrix.elements;
  if (!footprint.length || e[4] !== 0 || e[6] !== 0 || e[3] !== 0 || e[7] !== 0 || e[11] !== 0 || e[15] !== 1) return target;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of footprint) {
    const wx = e[0]! * x + e[8]! * z + e[12]!, wz = e[2]! * x + e[10]! * z + e[14]!;
    minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
  }
  const margin = guard + 1e-5;
  target.min.x = Math.max(target.min.x, minX - margin); target.max.x = Math.min(target.max.x, maxX + margin);
  target.min.z = Math.max(target.min.z, minZ - margin); target.max.z = Math.min(target.max.z, maxZ + margin);
  return target;
}
