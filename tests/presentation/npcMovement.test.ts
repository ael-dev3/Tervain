import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { NPCS, type NpcDef } from '../../src/content/npcs';
import { createInitialState } from '../../src/game/state';
import { NpcActor, npcGoalPosition, type ActorContext } from '../../src/presentation/actors';
import { poseRig, type Rig } from '../../src/presentation/characters';
import { Colliders, type Collider } from '../../src/world/colliders';
import { ANCHORS } from '../../src/world/layout';
import type { NavGrid } from '../../src/world/nav';
import type { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({ poseRig: vi.fn(), applyFlash: vi.fn(), createNpcRig: vi.fn(), createBanditRig: vi.fn(), createThornback: vi.fn() }));
const flat = { groundAt: () => 0, walkable: () => true } as unknown as Terrain;
const rig = () => ({ root: new THREE.Group(), height: 1.836, materials: [], hitFlash: 0 } as unknown as Rig);
function harness(def: NpcDef = NPCS.trail_hunter) {
  const ctx: ActorContext = { terrain: flat, colliders: new Colliders(), nav: { findPath: vi.fn((_from, to) => [{ ...to }]) } as unknown as NavGrid,
    state: createInitialState(), hour: 23, player: { x: 1000, y: 0, z: 1000 }, reducedMotion: false, onBark: vi.fn(() => false) };
  const npc = new NpcActor(def, rig());
  npc.snapToGoal(ctx);
  return { npc, ctx, tick: (seconds: number, hz = 60) => { for (let i = 0; i < seconds * hz; i++) npc.update(1 / hz, ctx); } };
}

describe('peaceful resident motion', () => {
  it('walks a schedule transition even beyond the old 90 metre teleport boundary, easing start and end', () => {
    const { npc, ctx, tick } = harness(), start = { x: npc.x, z: npc.z };
    ctx.hour = 7;
    npc.update(1 / 60, ctx);
    expect(Math.hypot(npc.x - start.x, npc.z - start.z)).toBeLessThan(.01);
    expect(npc.mode).not.toBe('work');
    tick(12);
    const target = ANCHORS.hunter_station!;
    expect(Math.hypot(npc.x - target.x, npc.z - target.z)).toBeLessThan(.06);
    expect(npc.mode).toBe('work');
    const gait = Reflect.get(npc, 'anim');
    tick(3);
    expect(Reflect.get(npc, 'anim')).toBe(gait);
  });

  it('keeps an unreachable resident idle and retries after navigation opens, without false work or teleport', () => {
    const { npc, ctx, tick } = harness(), start = { x: npc.x, z: npc.z };
    vi.mocked(ctx.nav.findPath).mockReturnValue(null);
    ctx.hour = 7; tick(10);
    expect({ x: npc.x, z: npc.z }).toEqual(start);
    expect(npc.mode).toBe('idle');
    expect(vi.mocked(ctx.nav.findPath).mock.calls.length).toBeLessThan(5);
    vi.mocked(ctx.nav.findPath).mockImplementation((_from, to) => [{ ...to }]);
    ctx.colliders.version++; tick(12);
    expect(npc.mode).toBe('work');
  });

  it('stops at a thin static wall on a long frame and resumes after it is removed', () => {
    const { npc, ctx, tick } = harness();
    const wallX = npc.x - 2.5;
    ctx.colliders.box('closed gate', wallX, 30.5, .015, 5, 0, true, { minY: 0, maxY: 2 });
    ctx.hour = 7; npc.update(2, ctx); tick(3);
    expect(npc.x).toBeGreaterThan(wallX + .35);
    expect(npc.mode).toBe('idle');
    const gait = Reflect.get(npc, 'anim'); tick(1);
    expect(Reflect.get(npc, 'anim')).toBe(gait);
    ctx.colliders.setActive('closed gate', false); tick(12);
    expect(npc.mode).toBe('work');
  });

  it('uses vertical body clearance for overhead geometry and rejects an abrupt floor discontinuity', () => {
    const { npc, ctx, tick } = harness();
    ctx.colliders.box('high roof', -214, 30, 1, 5, 0, true, { minY: 3, maxY: 4 });
    ctx.hour = 7; tick(12); expect(npc.mode).toBe('work');
    const blocked = harness();
    blocked.ctx.terrain = { groundAt: (x: number) => x < -214 ? 2 : 0, walkable: () => true } as unknown as Terrain;
    blocked.ctx.hour = 7; blocked.tick(12);
    expect(blocked.npc.x).toBeGreaterThanOrEqual(-214);
    expect(blocked.npc.mode).toBe('idle');
  });

  it('never starts work at an approximate coarse endpoint outside the actual working reach', () => {
    const { npc, ctx, tick } = harness();
    const target = ANCHORS.hunter_station!;
    ctx.colliders.box('occupied work edge', target.x, target.z, .1, 2, 0, true, { minY: 0, maxY: 2 });
    vi.mocked(ctx.nav.findPath).mockReturnValue([{ x: target.x + 1.5, z: target.z }]);
    ctx.hour = 7; tick(15);
    expect(npc.mode).toBe('idle');
    expect(Math.hypot(npc.x - target.x, npc.z - target.z)).toBeGreaterThan(1);
  });

  it('excludes its own body and safely passes a persistent visitor in an open lane', () => {
    const { npc, ctx } = harness();
    const home = ANCHORS.hunter_shelter!, target = ANCHORS.hunter_station!;
    const dx = target.x - home.x, dz = target.z - home.z, distance = Math.hypot(dx, dz);
    const visitor: Collider = { id: 'person:mill_hand', kind: 'circle', x: home.x + dx / distance * 2, z: home.z + dz / distance * 2, r: .35, active: true, minY: 0, maxY: 1.8 };
    ctx.residentContacts = [visitor, { ...visitor, id: 'person:trail_hunter', x: npc.x, z: npc.z }];
    ctx.hour = 7;
    for (let i = 0; i < 1800; i++) {
      npc.update(1 / 60, ctx);
      expect(Math.hypot(npc.x - visitor.x, npc.z - visitor.z)).toBeGreaterThanOrEqual(.7);
    }
    expect(npc.mode).toBe('work');
  });

  it('passes a resident blocking a short intermediate waypoint and prunes that corner without backtracking', () => {
    const def = { ...NPCS.ash_recorder, schedule: [{ from: 0, to: 24, anchor: 'ford_camp', activity: 'stand' as const }], overrides: [] };
    const { npc, ctx } = harness(def), target = ANCHORS.ford_camp!;
    const start = { x: target.x, z: target.z - 10 }, corner = { x: target.x, z: start.z + 2 };
    npc.x = start.x; npc.z = start.z;
    Reflect.set(npc, 'path', [corner, { x: target.x, z: target.z }]);
    vi.mocked(ctx.nav.findPath).mockReturnValue([corner, { x: target.x, z: target.z }]);
    const visitor: Collider = { id: 'person:mill_hand', kind: 'circle', x: start.x, z: start.z + 1.6, r: .35, active: true, minY: 0, maxY: 1.8 };
    ctx.residentContacts = [visitor];
    let passed = false;
    for (let i = 0; i < 1800; i++) {
      npc.update(1 / 60, ctx);
      expect(Math.hypot(npc.x - visitor.x, npc.z - visitor.z)).toBeGreaterThanOrEqual(.7);
      if (npc.z > corner.z + .3) {
        passed = true;
        expect(npc.z, 'returns to the discarded corner behind the visitor').toBeGreaterThan(corner.z);
      }
      if (passed) expect(npc.z).toBeGreaterThan(corner.z);
    }
    expect(passed).toBe(true);
    expect(Math.hypot(npc.x - target.x, npc.z - target.z)).toBeLessThan(.15);
    expect(vi.mocked(ctx.nav.findPath).mock.calls.length).toBeLessThan(4);
  });

  it('waits at an occupied final work edge instead of treating it as an intermediate corner to bypass', () => {
    const { npc, ctx, tick } = harness(), target = ANCHORS.hunter_station!;
    ctx.hour = 12; npc.snapToGoal(ctx);
    npc.x = target.x + 2; npc.z = target.z;
    npc.goal = { anchor: 'hunter_station', activity: 'work' };
    Reflect.set(npc, 'destination', target);
    Reflect.set(npc, 'path', [{ x: target.x, z: target.z }]);
    ctx.hour = 12;
    ctx.residentContacts = [{ id: 'person:quarry_hand', kind: 'circle', x: target.x, z: target.z, r: .35, active: true, minY: 0, maxY: 1.8 }];
    tick(12);
    expect(npc.mode).toBe('idle');
    expect(Math.hypot(npc.x - target.x, npc.z - target.z)).toBeGreaterThanOrEqual(.7);
    expect(npc.z).toBe(target.z);
    ctx.residentContacts = []; tick(5); expect(npc.mode).toBe('work');
  });

  it('returns to visibility after temporary unavailability without changing its schedule', () => {
    const { npc, ctx } = harness(); ctx.hour = 12; npc.update(1 / 60, ctx);
    ctx.state.npcs.trail_hunter.available = false; npc.update(1 / 60, ctx);
    expect(npc.rig.root.visible).toBe(false);
    ctx.state.npcs.trail_hunter.available = true; npc.update(1 / 60, ctx);
    expect(npc.rig.root.visible).toBe(true);
  });

  it('listens while seated without standing or gesturing through another person’s entire speech', () => {
    const { npc, ctx } = harness(NPCS.ash_recorder); ctx.hour = 12; npc.snapToGoal(ctx);
    npc.talking = true; npc.speaking = false; npc.update(1 / 60, ctx);
    expect(npc.mode).toBe('sit');
    expect(vi.mocked(poseRig)).toHaveBeenLastCalledWith(npc.rig, expect.objectContaining({ seated: true }), 1 / 60);
    npc.speaking = true; npc.update(1 / 60, ctx); expect(npc.mode).toBe('talk');
    expect(vi.mocked(poseRig)).toHaveBeenLastCalledWith(npc.rig, expect.objectContaining({ seated: true }), 1 / 60);
    const head = npc.headPosition.y;
    npc.speaking = false; npc.update(1 / 60, ctx); expect(npc.headPosition.y).toBe(head);
    Reflect.set(npc.rig, 'cur', { lower: -.25 }); Reflect.set(npc.rig, 'hipY', .95);
    expect(npc.headPosition.y).toBeCloseTo(npc.y + npc.def.look.height * 1.95 - .25);
  });

  it('waits inside a shared doorway instead of spawning overlapping residents, then exits when it clears', () => {
    // Someone without a bed still goes in at their door (A70): the hunter's routine under a bedless name.
    const { npc, ctx, tick } = harness({ ...NPCS.trail_hunter, id: 'caravan_master' }), home = ANCHORS.hunter_shelter!;
    ctx.residentContacts = [{ id: 'person:quarry_hand', kind: 'circle', x: home.x, z: home.z, r: .35, active: true, minY: 0, maxY: 1.8 }];
    ctx.hour = 7; tick(2);
    expect(npc.hidden).toBe(true); expect(npc.rig.root.visible).toBe(false);
    ctx.residentContacts = []; tick(12);
    expect(npc.hidden).toBe(false); expect(npc.mode).toBe('work');
  });

  it('lets a seated resident rise before translating to a new routine', () => {
    const def = { ...NPCS.ash_recorder, schedule: [
      { from: 0, to: 12, anchor: 'ford_camp', activity: 'sit' as const },
      { from: 12, to: 24, anchor: 'hunter_shelter', activity: 'stand' as const },
    ], overrides: [] };
    const { npc, ctx, tick } = harness(def);
    ctx.hour = 11; npc.snapToGoal(ctx); npc.update(1 / 60, ctx);
    expect(npc.mode).toBe('sit');
    const start = { x: npc.x, z: npc.z };
    ctx.hour = 13; tick(.75);
    expect({ x: npc.x, z: npc.z }).toEqual(start);
    tick(2);
    expect(Math.hypot(npc.x - start.x, npc.z - start.z)).toBeGreaterThan(.1);
  });

  it('preserves actual gait distance and arrival across desktop refresh rates', () => {
    const measurements = [30, 60, 144].map(hz => {
      const { npc, ctx, tick } = harness(); ctx.hour = 7; tick(12, hz);
      return { x: npc.x, z: npc.z, phase: Reflect.get(npc, 'anim') as number };
    });
    for (const result of measurements.slice(1)) {
      expect(Math.hypot(result.x - measurements[0]!.x, result.z - measurements[0]!.z)).toBeLessThan(.04);
      expect(Math.abs(result.phase - measurements[0]!.phase)).toBeLessThan(.04);
    }
  });

  it('assigns distinct safe office/square conversation stances while preserving work and seated placement', () => {
    const ctx = { terrain: flat, colliders: new Colliders() };
    for (const [a, b, anchor] of [[NPCS.rillford_reeve, NPCS.quarry_foreman, 'village_square'], [NPCS.estate_steward, NPCS.quarry_foreman, 'quarry_office']] as const) {
      const pa = npcGoalPosition(a, { anchor, activity: 'stand' }, ctx, 1.8), pb = npcGoalPosition(b, { anchor, activity: 'stand' }, ctx, 1.8);
      expect(Math.hypot(pa.x - pb.x, pa.z - pb.z)).toBeGreaterThan(1);
    }
    expect(npcGoalPosition(NPCS.trail_hunter, { anchor: 'hunter_station', activity: 'work' }, ctx, 1.836)).toBe(ANCHORS.hunter_station);
    expect(npcGoalPosition(NPCS.ash_recorder, { anchor: 'ford_camp', activity: 'sit' }, ctx, 1.8)).toBe(ANCHORS.ford_camp);
  });
});
