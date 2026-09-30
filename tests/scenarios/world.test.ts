import { beforeAll, describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { validateContent } from '../../src/content/validate';
import { buildStaticColliders } from '../../src/world/colliders';
import {
  ANCHORS,
  DECKS,
  ENEMY_SPAWNS,
  INSPECT_LOCATIONS,
  LEDGER,
  LIGHTHOUSE,
  MAINT_ROUTE,
  PALISADE,
  PICKUP_LOCATIONS,
  PLACES,
  RESULT_CHECKS,
  ARCHIVE_SHUTTER,
  RITE_ALTAR,
  SHORTCUT,
  SLUICE,
  SPAWN,
  type V2,
} from '../../src/world/layout';
import { coastX, shoreDistance } from '../../src/world/coast';
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
    // Every interaction point that lives on a specific object must have somewhere to stand within its reach.
    const reachable2 = (p: { x: number; z: number; r: number }) => [0.8, p.r * 0.5, p.r * 0.9].some((rr) => Array.from({ length: 16 }, (_, k) => ({ x: p.x + Math.cos((k / 16) * Math.PI * 2) * rr, z: p.z + Math.sin((k / 16) * Math.PI * 2) * rr })).some(open));
    expect(RESULT_CHECKS.filter((p) => !reachable2(p)).map((p) => p.id), 'result checks').toEqual([]);
    expect(reachable2(ARCHIVE_SHUTTER), 'archive shutter').toBe(true);
    expect(open({ x: SHORTCUT.lever.x, z: SHORTCUT.lever.z }), 'lever').toBe(true);
    expect(ENEMY_SPAWNS.filter((e) => !open(e)).map((e) => e.id)).toEqual([]);
  });

  const route = (name: string, a: V2, b: V2) =>
    it(`has a walkable route: ${name}`, () => {
      const path = nav.findPath(a, b);
      expect(path, name).not.toBeNull();
    });

  route('strand → village square', SPAWN, ANCHORS.village_square!);
  route('strand → the blade in the wreck', SPAWN, PICKUP_LOCATIONS.find((p) => p.id === 'wreck_blade')!);
  route('strand → overlook', SPAWN, { x: -136, z: 26 });
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

  it('keeps the coastal horizon low while the world boundary still stops movement', () => {
    expect(terrain.walkable(195, 0)).toBe(false);
    expect(terrain.heightAt(-200, -138)).toBeLessThan(20);
    expect(terrain.heightAt(0, 160)).toBeLessThan(20);
    expect(terrain.walkable(0, 8)).toBe(true);
  });

  it('the strand: the player wakes on dry sand above the tide, with the sea deep beyond the shallows', () => {
    expect(terrain.heightAt(SPAWN.x, SPAWN.z)).toBeGreaterThan(0.2);
    expect(terrain.heightAt(SPAWN.x, SPAWN.z)).toBeLessThan(2.5);
    // Wading is allowed a short way out; the open sea is not walkable.
    expect(terrain.walkable(coastX(30) - 2, 30)).toBe(true);
    expect(terrain.walkable(coastX(30) - 40, 30)).toBe(false);
    expect(terrain.isDeepWater(coastX(30) - 40, 30)).toBe(true);
    expect(terrain.seaDepth(0, 8)).toBe(0);
  });

  it('the coast stays wet where it should: no flooded hollows inland of the shore', () => {
    let flooded = 0;
    for (let x = -270; x < -150; x += 6) for (let z = -160; z < 160; z += 6) if (shoreDistance(x, z) > 10 && terrain.heightAt(x, z) < -0.2 && terrain.valleyRadius(x, z) < 1) flooded++;
    expect(flooded).toBe(0);
  });

  it('Lantern Point is a rocky headland the player can climb to the lighthouse door', () => {
    expect(terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z)).toBeGreaterThan(4);
    expect(nav.findPath(SPAWN, ANCHORS.lantern_door!)).not.toBeNull();
    expect(nav.findPath(ANCHORS.lantern_door!, ANCHORS.village_square!)).not.toBeNull();
  });

  it('the stockade leaves the shore track open through its gate and the player can still reach the village', () => {
    const gate = { x: -219.2, z: (PALISADE.gate.z0 + PALISADE.gate.z1) / 2 };
    expect(open(gate, 0.4), 'gate opening').toBe(true);
    // The wall itself blocks: a point on the wall line away from the gate is not standable.
    expect(colliders.blocked(-219.97, 40, 0.4), 'wall').toBe(true);
    expect(nav.findPath({ x: -230, z: 29 }, { x: -205, z: 31 })).not.toBeNull();
  });

  it('the jetty is walkable over the shallows and reaches out past the wading line', () => {
    const j = DECKS.find((d) => d.id === 'jetty')!;
    expect(terrain.walkable(j.x - j.hx + 1, j.z)).toBe(true);
    expect(terrain.deckAt(j.x - j.hx + 1, j.z)).not.toBeNull();
    expect(terrain.groundAt(j.x - j.hx + 1, j.z)).toBeGreaterThan(terrain.heightAt(j.x - j.hx + 1, j.z));
  });
});
