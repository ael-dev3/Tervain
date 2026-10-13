import { expect, it } from 'vitest';
import { waterDistance } from '../../src/presentation/ground/habitat';
import { STREAMS, SPRING_POOL } from '../../src/world/layout';
import { distToPolyline } from '../../src/world/terrain';

it('shares stream traversal while retaining distinct centre-line and bank distances', () => {
  const centre = new Float64Array(1);
  const points = STREAMS.flatMap(stream => stream.points.map(p => [p.x, p.z]));
  points.push([SPRING_POOL.x, SPRING_POOL.z], [-5.2, -4], [-7, 45], [88, -20], [-140, 40]);
  for (const [x, z] of points) for (const offset of [-3, 0, 3]) {
    const distances = STREAMS.map(stream => distToPolyline(x! + offset, z!, stream.points).d);
    const expectedCentre = Math.min(...distances);
    const expectedBank = Math.min(...distances.map((d, i) => d - STREAMS[i]!.halfWidth), Math.hypot(x! + offset - SPRING_POOL.x, z! - SPRING_POOL.z) - SPRING_POOL.r);
    expect(waterDistance(x! + offset, z!, centre)).toBe(expectedBank);
    expect(centre[0]).toBe(expectedCentre);
    expect(waterDistance(x! + offset, z!)).toBe(expectedBank);
  }
});
