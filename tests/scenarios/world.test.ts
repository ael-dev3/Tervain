import { beforeAll, describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { validateContent } from '../../src/content/validate';
import { buildStaticColliders } from '../../src/world/colliders';
import {
  ANCHORS,
  ENEMY_SPAWNS,
  INSPECT_LOCATIONS,
  LEDGER,
  MAINT_ROUTE,
  PICKUP_LOCATIONS,
  PLACES,
  RITE_ALTAR,
  SHORTCUT,
  SLUICE,
  SPAWN,
  type V2,
} from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { Terrain } from '../../src/world/terrain';

let terrain: Terrain;
let colliders: ReturnType<typeof buildStaticColliders>;
let nav: NavGrid;

beforeAll(() => {
  terrain = new Terrain();
  colliders = buildStaticColliders();
  colliders.setActive('archive_door', true);
  colliders.setActive('archive_shutter', true);
  nav = new NavGrid(terrain, colliders);
});

const open = (p: V2, r = 0.55) => terrain.walkable(p.x, p.z) && !colliders.blocked(p.x, p.z, r);

describe('world layout', () => {
  it('anchors used by schedules exist and are standable', () => {
    expect(validateContent(new Set(Object.keys(ANCHORS)))).toEqual([]);
    const bad = Object.entries(ANCHORS).filter(([, a]) => !open(a)).map(([n, a]) => `${n}@${a.x.toFixed(1)},${a.z.toFixed(1)}`);
    expect(bad).toEqual([]);
  });

  it('spawn, places, pickups and interaction points are on walkable ground', () => {
    expect(open(SPAWN), 'spawn').toBe(true);
    expect(Object.entries(PLACES).filter(([, p]) => !terrain.walkable(p.x, p.z)).map(([id]) => id)).toEqual([]);
    expect(PICKUP_LOCATIONS.filter((p) => !open(p)).map((p) => p.id)).toEqual([]);
    // A player must be able to stand within reach of each observation point.
    const reachable = (p: { x: number; z: number; r: number }) => {
      for (let a = 0; a < 16; a++) {
        for (const rr of [0, p.r * 0.5, p.r * 0.85]) {
          const q = { x: p.x + Math.cos((a / 16) * Math.PI * 2) * rr, z: p.z + Math.sin((a / 16) * Math.PI * 2) * rr };
          if (open(q)) return true;
        }
      }
      return false;
    };
    expect(INSPECT_LOCATIONS.filter((p) => !reachable(p)).map((p) => p.id)).toEqual([]);
    expect(open({ x: RITE_ALTAR.x, z: RITE_ALTAR.z + 2.4 }), 'altar approach').toBe(true);
    expect(open({ x: SLUICE.control.x, z: SLUICE.control.z }), 'sluice control').toBe(true);
    expect(open({ x: SHORTCUT.lever.x, z: SHORTCUT.lever.z }), 'lever').toBe(true);
    expect(ENEMY_SPAWNS.filter((e) => !open(e)).map((e) => e.id)).toEqual([]);
  });

  const route = (name: string, a: V2, b: V2) =>
    it(`has a walkable route: ${name}`, () => {
      const path = nav.findPath(a, b);
      expect(path, name).not.toBeNull();
    });

  route('overlook → village square', SPAWN, ANCHORS.village_square!);
  route('village → dry channel', ANCHORS.village_square!, ANCHORS.dry_channel!);
  route('village → sluice control', ANCHORS.village_square!, SLUICE.control);
  route('sluice → shrine altar', SLUICE.control, { x: RITE_ALTAR.x, z: RITE_ALTAR.z + 2.4 });
  route('shrine → archive door', ANCHORS.shrine_steps!, ANCHORS.archive_door!);
  route('village → quarry yard (over the footbridge)', ANCHORS.village_square!, ANCHORS.quarry_yard!);
  route('quarry yard → brace', ANCHORS.quarry_yard!, PICKUP_LOCATIONS[0]!);
  route('quarry yard → maintenance lever', ANCHORS.quarry_yard!, SHORTCUT.lever);
  route('village → ford camp', ANCHORS.village_square!, ANCHORS.ford_camp!);
  route('quarry yard → the Cut ledge (through the creature)', ANCHORS.quarry_yard!, ANCHORS.cut_ledge!);
  route('village → inn bench', ANCHORS.village_square!, ANCHORS.inn_bench!);
  route('mill door → village square', ANCHORS.mill_door!, ANCHORS.village_square!);

  it('the ford reaches the side path cache and the bandit spot', () => {
    expect(nav.findPath(ANCHORS.ford_camp!, ENEMY_SPAWNS[0]!)).not.toBeNull();
    expect(nav.findPath(ANCHORS.ford_camp!, PICKUP_LOCATIONS[2]!)).not.toBeNull();
  });

  /** Walk in a straight line with real collision resolution; returns where the walker ended up. */
  const walk = (from: V2, to: V2, r = 0.4) => {
    let p = { x: from.x, z: from.z };
    const steps = 160;
    for (let i = 1; i <= steps; i++) {
      // Step from the resolved position, as the game does each frame.
      const nx = p.x + (to.x - from.x) / steps;
      const nz = p.z + (to.z - from.z) / steps;
      const q = colliders.resolve(nx, nz, r);
      p = { x: q.x, z: q.z };
    }
    return Math.hypot(p.x - to.x, p.z - to.z) < 0.3;
  };

  it('the archive is closed until its door or shutter opens, and open afterwards', () => {
    const outsideDoor = { x: LEDGER.x, z: LEDGER.z + 7 };
    const inside = { x: LEDGER.x, z: LEDGER.z + 1 };
    expect(walk(outsideDoor, inside)).toBe(false);
    colliders.setActive('archive_door', false);
    expect(walk(outsideDoor, inside)).toBe(true);
    colliders.setActive('archive_door', true);
    const outsideShutter = { x: LEDGER.x, z: LEDGER.z - 5 };
    expect(walk(outsideShutter, inside)).toBe(false);
    colliders.setActive('archive_shutter', false);
    expect(walk(outsideShutter, inside)).toBe(true);
    colliders.setActive('archive_shutter', true);
  });

  it('every scheduled transition has a walkable route', () => {
    const missing: string[] = [];
    for (const def of NPC_LIST) {
      const seq = def.schedule.map((e) => e.anchor);
      const pairs: [string, string][] = seq.map((a, i) => [a, seq[(i + 1) % seq.length]!]);
      for (const o of def.overrides ?? []) pairs.push([seq[0]!, o.anchor], [o.anchor, seq[0]!]);
      for (const [a, b] of pairs) {
        if (a === b) continue;
        if (!nav.findPath(ANCHORS[a]!, ANCHORS[b]!)) missing.push(`${def.id}: ${a} -> ${b}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the maintenance route ends where a walkable route to the village begins', () => {
    const end = MAINT_ROUTE[MAINT_ROUTE.length - 1]!;
    expect(nav.findPath(end, ANCHORS.inn_bench!)).not.toBeNull();
  });

  it('the maintenance route points are on ground', () => {
    expect(MAINT_ROUTE.filter((p) => !terrain.walkable(p.x, p.z)).map((p) => `${p.x},${p.z}`)).toEqual([]);
  });

  it('terrain rises into mountains that stop movement at the valley edge', () => {
    expect(terrain.walkable(-190, 0)).toBe(false);
    expect(terrain.heightAt(-180, -100)).toBeGreaterThan(20);
    expect(terrain.walkable(0, 8)).toBe(true);
  });
});
