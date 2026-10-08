import { describe, expect, it } from 'vitest';
import { buildStaticColliders } from '../../src/world/colliders';
import { FURNITURE } from '../../src/world/furniture';
import { fromBuildingLocal, INTERIORS, roomHalfSize, roomOf } from '../../src/world/interiors';
import { BUILDINGS } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';

const terrain = new Terrain();
const colliders = buildStaticColliders(terrain);
/** The wanderer's body: 0.4 m round, 1.95 m tall, feet a hair above what they stand on. */
const body = (feet: number) => ({ minY: feet + 0.03, maxY: feet + 1.95 });

describe('the buildings\' rooms (A66)', () => {
  it('gives every building but the archive a room, and the archive keeps its own', () => {
    expect(INTERIORS.map((room) => room.building.id).sort()).toEqual(BUILDINGS.filter((b) => b.kind !== 'archive').map((b) => b.id).sort());
    for (const b of BUILDINGS) expect(roomOf(b)?.building ?? null).toBe(b.kind === 'archive' ? null : b);
  });

  it('puts a floor under every room and its doorway, level with the doorstep', () => {
    for (const room of INTERIORS) {
      const b = room.building, base = terrain.rooms.base(room), floor = base + room.floorTop;
      const { hw, hd } = roomHalfSize(room);
      for (const [lx, lz] of [[0, 0], [hw - 0.05, hd - 0.05], [-hw + 0.05, -hd + 0.05], [room.door.x, b.d / 2 - room.wall / 2]] as const) {
        const p = fromBuildingLocal(b, lx, lz);
        expect(terrain.groundAt(p.x, p.z), `${b.id} ${lx},${lz}`).toBeCloseTo(Math.max(floor, terrain.heightAt(p.x, p.z)), 6);
        expect(terrain.rooms.at(p.x, p.z), b.id).toBe(room);
      }
      // Beside the doorway the wall stands: no floor reaches through it.
      const wall = fromBuildingLocal(b, room.door.x + room.door.halfWidth + 0.3, b.d / 2 - room.wall / 2);
      expect(terrain.rooms.at(wall.x, wall.z), b.id).toBeNull();
    }
  });

  it('lets the wanderer walk in through every doorway, and nowhere through a wall', () => {
    for (const room of INTERIORS) {
      const b = room.building, base = terrain.rooms.base(room), floor = base + room.floorTop, hd = roomHalfSize(room).hd;
      const outside = fromBuildingLocal(b, room.door.x, b.d / 2 + 1.2), inside = fromBuildingLocal(b, room.door.x, hd - 1.0);
      const through = colliders.move(outside.x, outside.z, inside.x - outside.x, inside.z - outside.z, 0.4, undefined, body(floor));
      expect(Math.hypot(through.x - inside.x, through.z - inside.z), b.id).toBeLessThan(0.02);
      // Into the back wall from outside: stopped at the wall.
      const behind = fromBuildingLocal(b, 0, -b.d / 2 - 1.2), centre = fromBuildingLocal(b, 0, 0);
      const blocked = colliders.move(behind.x, behind.z, centre.x - behind.x, centre.z - behind.z, 0.4, undefined, body(base));
      expect(terrain.rooms.at(blocked.x, blocked.z), b.id).toBeNull();
    }
  });

  it('closes the room overhead: a jump in the doorway meets the lintel, one inside meets the ceiling', () => {
    for (const room of INTERIORS) {
      const b = room.building, base = terrain.rooms.base(room), floor = base + room.floorTop;
      const doorway = fromBuildingLocal(b, room.door.x, b.d / 2 - room.wall / 2);
      const head = floor + 1.95;
      expect(colliders.ceilingAt(doorway.x, doorway.z, 0.3, head, head + 2), b.id).toBeCloseTo(base + room.wallBase + room.door.height, 6);
      // A clear spot inside, away from the furniture and the hearth.
      const inside = fromBuildingLocal(b, room.door.x, roomHalfSize(room).hd - 0.8);
      expect(colliders.ceilingAt(inside.x, inside.z, 0.3, head, head + 4), b.id).toBeCloseTo(base + room.wallTop, 6);
    }
  });

  it('gives every piece of furniture a finite collider as tall as the piece', () => {
    for (const room of INTERIORS) {
      const pieces = FURNITURE.filter((p) => p.room === room);
      const boxes = colliders.all.filter((c) => c.id.startsWith(`room:${room.building.id}:furniture:`));
      expect(boxes.length, room.building.id).toBe(pieces.length);
      for (const box of boxes) {
        expect(Number.isFinite(box.minY) && Number.isFinite(box.maxY), box.id).toBe(true);
        expect(box.maxY! - box.minY!, box.id).toBeGreaterThan(0.3);
      }
    }
  });
});
