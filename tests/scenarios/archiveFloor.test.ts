import { beforeAll, describe, expect, it } from 'vitest';
import { groundOf } from '../../src/presentation/buildings';
import { ANCHORS, ARCHIVE_ROOM, bySpec } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';

const archive = bySpec('archive');
let terrain: Terrain;

const world = (x: number, z: number) => {
  const c = Math.cos(archive.yaw);
  const s = Math.sin(archive.yaw);
  return { x: archive.x + x * c + z * s, z: archive.z - x * s + z * c };
};

beforeAll(() => {
  terrain = new Terrain();
});

describe('archive terrace and walking floor', () => {
  it('supports the complete shell on one level without terrain penetrating the floor', () => {
    const base = groundOf(terrain, archive).avg;
    for (let x = -archive.w / 2; x <= archive.w / 2; x += 0.5) {
      for (let z = -archive.d / 2; z <= archive.d / 2; z += 0.5) {
        const p = world(x, z);
        expect(terrain.heightAt(p.x, p.z)).toBeCloseTo(base, 6);
        expect(terrain.heightAt(p.x, p.z)).toBeLessThan(base + ARCHIVE_ROOM.floorBase);
      }
    }
  });

  it('keeps the front door and rear shutter approaches level and walkable', () => {
    const base = groundOf(terrain, archive).avg;
    for (const anchor of [ANCHORS.archive_door!, ANCHORS.archive_back!]) {
      for (const dx of [-0.8, 0, 0.8]) {
        for (const dz of [-0.8, 0, 0.8]) {
          expect(terrain.heightAt(anchor.x + dx, anchor.z + dz)).toBeCloseTo(base, 6);
          expect(terrain.walkable(anchor.x + dx, anchor.z + dz)).toBe(true);
        }
      }
    }
  });

  it('grounds residents and the player on the same plank surface the archive renders', () => {
    const floor = groundOf(terrain, archive).avg + ARCHIVE_ROOM.floorTop;
    const hw = archive.w / 2 - ARCHIVE_ROOM.wallThickness;
    const hd = archive.d / 2 - ARCHIVE_ROOM.wallThickness - 0.01;
    for (let x = -hw; x <= hw; x += 0.5) {
      for (let z = -hd; z <= hd; z += 0.5) {
        const p = world(x, z);
        expect(terrain.groundAt(p.x, p.z)).toBeCloseTo(floor, 6);
        expect(terrain.groundAt(p.x, p.z)).toBeGreaterThan(terrain.heightAt(p.x, p.z));
      }
    }
  });

  it('supports both entry thresholds and keeps the rear stone sill within the existing walking step limit', () => {
    const base = groundOf(terrain, archive).avg;
    const hd = archive.d / 2;
    for (const x of [-ARCHIVE_ROOM.shutterHalfWidth, 0, ARCHIVE_ROOM.shutterHalfWidth]) {
      for (const z of [-hd - ARCHIVE_ROOM.wallThickness, -hd, -hd + ARCHIVE_ROOM.wallThickness]) {
        const p = world(x, z);
        expect(terrain.groundAt(p.x, p.z)).toBeCloseTo(base + ARCHIVE_ROOM.shutterBottom, 6);
        expect(terrain.walkable(p.x, p.z)).toBe(true);
      }
    }
    for (const z of [hd - ARCHIVE_ROOM.wallThickness, hd, hd + ARCHIVE_ROOM.wallThickness + 0.2]) {
      const p = world(0, z);
      expect(terrain.groundAt(p.x, p.z)).toBeCloseTo(base + ARCHIVE_ROOM.floorTop, 6);
    }
    // Player.tryMove allows a grounded rise up to 0.8 m; do not alter that controller contract.
    expect(ARCHIVE_ROOM.shutterBottom - ARCHIVE_ROOM.floorTop).toBeLessThanOrEqual(0.8);
    expect(ARCHIVE_ROOM.shutterBottom).toBeLessThanOrEqual(0.8);
  });

  it('leaves ground outside the room at the terrain surface', () => {
    for (const [x, z] of [[archive.w / 2 + 0.5, 0], [0, archive.d / 2 + 0.8], [0, -archive.d / 2 - 0.5]]) {
      const p = world(x!, z!);
      expect(terrain.groundAt(p.x, p.z)).toBe(terrain.heightAt(p.x, p.z));
    }
  });
});
