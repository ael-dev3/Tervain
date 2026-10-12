import { describe, expect, it } from 'vitest';
import { buildingEntry } from '../../src/world/buildingEntries';
import { buildStaticColliders } from '../../src/world/colliders';
import { HOUSEHOLDS } from '../../src/world/furniture';
import { houseYard, yardToWorld, type YardProp } from '../../src/world/houseYards';
import { BUILDINGS, ROADS } from '../../src/world/layout';

const houses = BUILDINGS.filter((b) => b.kind === 'house');

/** The footprint's corners and centre, building-local. */
function footprint(p: YardProp): [number, number][] {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  const out: [number, number][] = [[p.x, p.z]];
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const lx = a! * p.hw, lz = b! * p.hd;
    out.push([p.x + lx * c + lz * s, p.z - lx * s + lz * c]);
  }
  return out;
}

const segDist = (px: number, pz: number, a: { x: number; z: number }, b: { x: number; z: number }) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - a.x - t * dx, pz - a.z - t * dz);
};

describe('village house yards (A132)', () => {
  it('gives every household a yard of its own trade', () => {
    for (const b of houses) {
      expect(HOUSEHOLDS[b.id], b.id).toBeDefined();
      expect(houseYard(b).length, b.id).toBeGreaterThan(1);
    }
    const kinds = houses.map((b) => houseYard(b).map((p) => p.kind).sort().join());
    expect(new Set(kinds).size).toBe(houses.length);
    expect(BUILDINGS.filter((b) => b.kind !== 'house').every((b) => houseYard(b).length === 0)).toBe(true);
  });

  it('stands outside the walls, off the door approach and off every road', () => {
    for (const b of houses) {
      const door = buildingEntry(b).x;
      for (const p of houseYard(b)) {
        for (const [x, z] of footprint(p)) {
          const inside = Math.abs(x) < b.w / 2 + 0.45 && Math.abs(z) < b.d / 2 + 0.45;
          expect(inside, `${b.id} ${p.kind} against the walls, not in them`).toBe(false);
          const approach = Math.abs(x - door) < 1.3 && z > b.d / 2 && z < b.d / 2 + 3;
          expect(approach, `${b.id} ${p.kind} off the way in`).toBe(false);
          const w = yardToWorld(b, x, z);
          for (const road of ROADS) for (let i = 0; i + 1 < road.points.length; i++) {
            expect(segDist(w.x, w.z, road.points[i]!, road.points[i + 1]!), `${b.id} ${p.kind} off the road`).toBeGreaterThan(road.width / 2 + 0.3);
          }
        }
      }
    }
  });

  it('collides where a walker would bump into it, and nowhere inside another collider', () => {
    const c = buildStaticColliders();
    const yards = c.all.filter((k) => k.id.includes(':yard:'));
    expect(yards.length).toBe(houses.flatMap((b) => houseYard(b).filter((p) => p.solid)).length);
    const others = c.all.filter((k) => !k.id.includes(':yard:') && k.active !== false);
    for (const b of houses) for (const p of houseYard(b)) {
      if (!p.solid) continue;
      for (const [x, z] of footprint(p)) {
        const w = yardToWorld(b, x, z);
        const hit = others.find((k) => k.kind === 'circle'
          ? Math.hypot(w.x - k.x, w.z - k.z) < k.r
          : (() => {
            const dx = w.x - k.x, dz = w.z - k.z, co = Math.cos(k.yaw), si = Math.sin(k.yaw);
            return Math.abs(dx * co - dz * si) < k.hw && Math.abs(dx * si + dz * co) < k.hd;
          })());
        expect(hit?.id, `${b.id} ${p.kind}`).toBeUndefined();
      }
    }
  });
});
