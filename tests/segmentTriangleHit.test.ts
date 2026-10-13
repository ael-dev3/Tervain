import { describe, expect, it } from 'vitest';
import { segmentTriangleHit } from '../tools/segment-triangle-hit.mjs';

const a = [0, 0, 0], b = [1, 0, 0], c = [0, 1, 0];
describe('camera near-plane segment contacts', () => {
  it('finds crossings from either side and either winding', () => {
    expect(segmentTriangleHit([.2, .2, -1], [.2, .2, 1], a, b, c)).toBe(true);
    expect(segmentTriangleHit([.2, .2, 1], [.2, .2, -1], a, c, b)).toBe(true);
  });
  it('includes an endpoint and triangle vertex', () => {
    expect(segmentTriangleHit([0, 0, -1], [0, 0, 0], a, b, c)).toBe(true);
  });
  it('rejects an intersection beyond the finite segment', () => {
    expect(segmentTriangleHit([.2, .2, -2], [.2, .2, -1], a, b, c)).toBe(false);
  });
  it('rejects crossings outside the triangle and degenerate triangles', () => {
    expect(segmentTriangleHit([.8, .8, -1], [.8, .8, 1], a, b, c)).toBe(false);
    expect(segmentTriangleHit([0, 0, -1], [0, 0, 1], a, a, a)).toBe(false);
  });
  it('does not claim a coplanar contact', () => {
    expect(segmentTriangleHit([.1, .1, 0], [.2, .2, 0], a, b, c)).toBe(false);
  });
});
