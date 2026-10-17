import { FENCE_WALL_LIFT, type Colliders } from '../world/colliders';
import { fence } from './props';
import type { Rnd } from './structures';
import type { Region } from './regions';
import type { PhysicalProjectileGeometry } from '../world/physicsGeometry';

/** Copy only triangles appended by the next static prop, in their rendered world coordinates. */
export function captureProjectileGeometry(region: Region): () => PhysicalProjectileGeometry {
  const starts = new Map([...region.batches].map(([key, b]) => [key, { p: b.p.n, ix: b.ix.n }]));
  return () => {
    let floats = 0, indices = 0;
    for (const [key, b] of region.batches) {
      floats += b.p.n - (starts.get(key)?.p ?? 0);
      indices += b.ix.n - (starts.get(key)?.ix ?? 0);
    }
    const positions = new Float32Array(floats), topology = new Uint32Array(indices);
    let p = 0, ix = 0;
    for (const [key, b] of region.batches) {
      const start = starts.get(key) ?? { p: 0, ix: 0 }, first = start.p / 3;
      positions.set(b.p.a.subarray(start.p, b.p.n), p);
      for (let i = start.ix; i < b.ix.n; i++) {
        const vertex = b.ix.a[i]!;
        if (vertex < first || vertex >= b.p.n / 3) throw new Error('Projectile geometry references another prop');
        topology[ix++] = vertex - first + p / 3;
      }
      p += b.p.n - start.p;
    }
    return { positions, indices: topology };
  };
}

/** Keep movement's continuous barrier, but give arrows the exact rendered rails and posts. */
export function buildFenceRun(region: Region, random: Rnd, points: [number, number][], groundAt: (x: number, z: number) => number, colliders: Colliders): void {
  const capture = captureProjectileGeometry(region);
  fence(region, random, points, groundAt);
  const projectileMesh = capture();
  let minY = Infinity, maxY = -Infinity;
  for (let i = 1; i < projectileMesh.positions.length; i += 3) {
    minY = Math.min(minY, projectileMesh.positions[i]!); maxY = Math.max(maxY, projectileMesh.positions[i]!);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]!, [bx, bz] = points[i + 1]!;
    colliders.box('fence', (ax + bx) / 2, (az + bz) / 2, .12, Math.hypot(bx - ax, bz - az) / 2,
      Math.atan2(bx - ax, bz - az), true, { minY, maxY: maxY + FENCE_WALL_LIFT, projectileMesh });
  }
}
