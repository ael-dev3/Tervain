import { expect, it } from 'vitest';
import { distToPolyline, roadWeight } from '../../src/world/terrain';
import { ROADS } from '../../src/world/layout';
import { smoothstep } from '../../src/world/noise';

it('preserves full-scan road weights at endpoints, overlapping routes and soft influence boundaries', () => {
  const points: number[][] = [];
  for (let z = -160; z <= 160; z += 8) for (let x = -300; x <= 150; x += 8) points.push([x, z]);
  for (const road of ROADS) for (const p of road.points) {
    const reach = road.width * .5 + 1.4;
    for (const delta of [-1e-7, 0, 1e-7]) for (const [dx, dz] of [[reach + delta, 0], [-reach - delta, 0], [0, reach + delta], [0, -reach - delta]]) points.push([p.x + dx!, p.z + dz!]);
    points.push([p.x, p.z]);
  }
  points.push([NaN, 0], [Infinity, 0], [-Infinity, 0]);
  for (const [x, z] of points) {
    let expected = 0;
    for (const road of ROADS) {
      const { d } = distToPolyline(x!, z!, road.points);
      expected = Math.max(expected, 1 - smoothstep(road.width * .5, road.width * .5 + 1.4, d));
    }
    expect(Object.is(roadWeight(x!, z!), expected)).toBe(true);
  }
});
