import { describe, expect, it } from 'vitest';
import { footprint, FURNITURE, furnishRoom, pieceSize, type FurniturePlacement } from '../../src/world/furniture';
import { CHIMNEY_STACK, FIREPLACE, hearthOf, INTERIORS, roomHalfSize, type InteriorSpec } from '../../src/world/interiors';

const inRoom = (room: InteriorSpec) => FURNITURE.filter((p) => p.room === room);

/** Cells of the room floor a body of `radius` can stand in and reach from the doorway, out of all free cells. */
function reachable(room: InteriorSpec, pieces: readonly FurniturePlacement[], radius = 0.4, step = 0.1) {
  const { hw, hd } = roomHalfSize(room);
  const blocks = pieces.map((p) => footprint(p.piece, p.x, p.z, p.yaw));
  const hearth = hearthOf(room);
  if (hearth) {
    const { x, z } = hearth.stack;
    blocks.push({ x0: x - CHIMNEY_STACK, x1: x + CHIMNEY_STACK, z0: z - CHIMNEY_STACK, z1: z + CHIMNEY_STACK }, hearth.footprint(FIREPLACE.halfWidth, FIREPLACE.depth));
  }
  const nx = Math.floor((2 * hw) / step), nz = Math.floor((2 * hd) / step);
  const free = (i: number, j: number) => {
    const x = -hw + (i + 0.5) * step, z = -hd + (j + 0.5) * step;
    if (x - radius < -hw || x + radius > hw || z - radius < -hd || z + radius > hd + room.wall) return false;
    return !blocks.some((r) => x + radius > r.x0 && x - radius < r.x1 && z + radius > r.z0 && z - radius < r.z1);
  };
  const seen = new Set<number>();
  const cell = (key: number) => ({ x: -hw + ((key % nx) + 0.5) * step, z: -hd + (Math.floor(key / nx) + 0.5) * step });
  const start = { i: Math.floor((room.door.x + hw) / step), j: nz - Math.ceil(radius / step) - 1 };
  const queue = [start];
  if (free(start.i, start.j)) seen.add(start.j * nx + start.i);
  while (queue.length) {
    const { i, j } = queue.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const a = i + di, b = j + dj, key = b * nx + a;
      if (a < 0 || b < 0 || a >= nx || b >= nz || seen.has(key) || !free(a, b)) continue;
      seen.add(key);
      queue.push({ i: a, j: b });
    }
  }
  let total = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (free(i, j)) total++;
  // How near the wanderer can stand to a piece: the nearest reachable spot to its footprint.
  const approach = (r: { x0: number; x1: number; z0: number; z1: number }) => Math.min(...[...seen].map((key) => {
    const p = cell(key);
    return Math.hypot(Math.max(0, r.x0 - p.x, p.x - r.x1), Math.max(0, r.z0 - p.z, p.z - r.z1));
  }));
  return { reached: seen.size, total, approach };
}

describe('the rooms\' furniture (A66)', () => {
  it('furnishes every room', () => {
    for (const room of INTERIORS) {
      const pieces = inRoom(room);
      expect(pieces.length, room.building.id).toBeGreaterThanOrEqual(room.building.kind === 'hut' ? 2 : 4);
    }
    // The layout is deterministic: placing again gives the same.
    for (const room of INTERIORS) expect(furnishRoom(room)).toEqual(inRoom(room));
  });

  it('keeps every piece inside its room, apart from the others, out of the way in and off the windows', () => {
    for (const room of INTERIORS) {
      const { hw, hd } = roomHalfSize(room);
      const pieces = inRoom(room), rects = pieces.map((p) => footprint(p.piece, p.x, p.z, p.yaw));
      for (const [i, r] of rects.entries()) {
        const label = `${room.building.id} ${pieces[i]!.piece}`;
        expect(r.x0, label).toBeGreaterThanOrEqual(-hw - 1e-6);
        expect(r.x1, label).toBeLessThanOrEqual(hw + 1e-6);
        expect(r.z0, label).toBeGreaterThanOrEqual(-hd - 1e-6);
        expect(r.z1, label).toBeLessThanOrEqual(hd + 1e-6);
        // Nothing stands in front of the doorway.
        const door = room.door;
        const blocksDoor = r.x1 > door.x - door.halfWidth - 0.45 && r.x0 < door.x + door.halfWidth + 0.45 && r.z1 > hd - 1.45;
        expect(blocksDoor, label).toBe(false);
        for (const [j, o] of rects.entries()) {
          if (j <= i) continue;
          const apart = r.x1 <= o.x0 + 1e-6 || o.x1 <= r.x0 + 1e-6 || r.z1 <= o.z0 + 1e-6 || o.z1 <= r.z0 + 1e-6;
          expect(apart, `${label} and ${pieces[j]!.piece}`).toBe(true);
        }
        // Tall pieces keep off the windows (their sills stand about 1.3 m above the floor).
        if (pieceSize(pieces[i]!.piece)[1] > 1.2 && pieces[i]!.piece !== 'bunk' && room.building.kind !== 'shrine') {
          const b = room.building;
          const onSide = (r.x0 < -hw + 0.1 || r.x1 > hw - 0.1) && r.z1 > -b.d * 0.2 - 0.36 && r.z0 < b.d * 0.2 + 0.36;
          expect(onSide, label).toBe(false);
        }
      }
    }
  });

  it('leaves each room walkable from its doorway, every piece within reach', () => {
    for (const room of INTERIORS) {
      const pieces = inRoom(room);
      const { reached, total, approach } = reachable(room, pieces);
      // Most of the free floor is reachable: no part of the room is walled off by furniture.
      expect(reached / total, room.building.id).toBeGreaterThan(0.7);
      // The wanderer can walk up to every piece.
      for (const p of pieces) expect(approach(footprint(p.piece, p.x, p.z, p.yaw)), `${room.building.id} ${p.piece}`).toBeLessThan(0.75);
    }
  });

  it('describes the rooms', () => {
    const lines = INTERIORS.map((room) => `${room.building.id.padEnd(15)} ${inRoom(room).map((p) => p.piece).join(', ')}`);
    console.log(lines.join('\n'));
  });
});
