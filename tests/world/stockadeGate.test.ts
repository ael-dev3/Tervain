import { describe, expect, it } from 'vitest';
import { buildStaticColliders } from '../../src/world/colliders';
import { ANCHORS, PALISADE, PICKUP_LOCATIONS } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { Terrain } from '../../src/world/terrain';

const terrain = new Terrain();
const colliders = buildStaticColliders(terrain);
const body = { minY: -50, maxY: 50 };
/** x of the wall line at a given z on the near-vertical stretch through the gate. */
const wallX = (z: number) => {
  const pts = PALISADE.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    if ((z - a.z) * (z - b.z) <= 0) return a.x + (b.x - a.x) * (z - a.z) / (b.z - a.z);
  }
  throw new Error('z off the wall');
};

describe('the stockade gate and the route grid (A99 scout)', () => {
  it('closes the wall up to the gate posts, keeps the posts and open leaves solid, and the way through clear', () => {
    const { z0, z1 } = PALISADE.gate, gz = (z0 + z1) / 2;
    // Logs stand right up to the gap: no walking through them beside the gate.
    for (const z of [14.3, 19.8]) expect(colliders.blocked(wallX(z), z, 0.15, body), `log at z ${z}`).toBe(true);
    // The great posts.
    for (const z of [gz - (z1 - z0) / 2 - 0.15, gz + (z1 - z0) / 2 + 0.15]) expect(colliders.blocked(PALISADE.gate.x, z, 0.1, body), `post at z ${z}`).toBe(true);
    // The leaves, swung open inside.
    for (const side of [-1, 1]) {
      // Halfway along the leaf from its hinge.
      const swing = side * PALISADE.gate.leafSwing, hx = PALISADE.gate.x + 0.05, hz = gz + side * ((z1 - z0) / 2 - 0.05);
      expect(colliders.blocked(hx - side * 1.05 * Math.sin(swing), hz - side * 1.05 * Math.cos(swing), 0.1, body), `leaf ${side}`).toBe(true);
    }
    // The track through the middle of the gate.
    for (let dx = -3; dx <= 3; dx += 0.5) expect(colliders.blocked(PALISADE.gate.x + dx, gz, 0.4, body), `gate way at dx ${dx}`).toBe(false);
  });

  it('snaps a boxed-in spot to the nearest open place on its own side, and never into a pocket that leads nowhere', () => {
    const nav = new NavGrid(terrain, colliders);
    const wagon = ANCHORS.overlook_wagon!, cell = nav.nearestOpen(wagon.x, wagon.z)!, at = nav.cellCenter(cell.i, cell.j);
    // The wagon stands inside the stockade (west of the wall line); so does where its keeper is routed to.
    expect(wagon.x).toBeLessThan(wallX(wagon.z));
    expect(at.x).toBeLessThan(wallX(at.z));
    const wrench = PICKUP_LOCATIONS.find((p) => p.id === 'quarry_wrench')!;
    expect(nav.findPath(ANCHORS.village_square!, wrench)).not.toBeNull();
  });
});
