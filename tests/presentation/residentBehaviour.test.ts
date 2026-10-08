import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { NPCS, type NpcDef } from '../../src/content/npcs';
import { createInitialState } from '../../src/game/state';
import type { WorldState } from '../../src/game/types';
import { NpcActor, turnToward, type ActorContext } from '../../src/presentation/actors';
import type { Rig } from '../../src/presentation/characters';
import { SpeechDirector } from '../../src/presentation/speech';
import { Colliders } from '../../src/world/colliders';
import { ANCHORS, WORLD } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import type { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({ poseRig: vi.fn(), applyFlash: vi.fn(), createNpcRig: vi.fn(), createBanditRig: vi.fn(), createThornback: vi.fn() }));

const flat = { groundAt: () => 0, walkable: () => true } as unknown as Terrain;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function harness(def: NpcDef, hour: number, state: WorldState = createInitialState()) {
  const ctx: ActorContext = { terrain: flat, colliders: new Colliders(), nav: { findPath: vi.fn((_from, to) => [{ ...to }]) } as unknown as NavGrid,
    state, hour, player: { x: 1000, y: 0, z: 1000 }, reducedMotion: false, onBark: vi.fn(() => false) };
  const npc = new NpcActor(def, { root: new THREE.Group(), height: 1.8, materials: [], hitFlash: 0 } as unknown as Rig);
  npc.snapToGoal(ctx);
  return { npc, ctx, tick: (seconds: number, hz = 60) => { for (let i = 0; i < seconds * hz; i++) npc.update(1 / hz, ctx); } };
}

describe('residents turn and face like people (A69)', () => {
  it('turn at a walking pace, easing into the end of the turn, whatever the frame rate', () => {
    for (const hz of [30, 60, 144]) {
      let yaw = 0, fastest = 0;
      for (let i = 0; i < hz * 3; i++) {
        const next = turnToward(yaw, Math.PI * 0.99, 2.2, 1 / hz);
        fastest = Math.max(fastest, Math.abs(wrap(next - yaw)) * hz);
        yaw = next;
      }
      expect(fastest).toBeLessThanOrEqual(2.2 + 1e-9);
      expect(Math.abs(wrap(yaw - Math.PI * 0.99))).toBeLessThan(0.01);
    }
  });

  it('step round on the spot rather than spinning, and start work only once facing it', () => {
    const { npc, tick } = harness(NPCS.trail_hunter, 12), station = ANCHORS.hunter_station!;
    tick(1 / 60);
    expect(npc.mode).toBe('work');
    npc.yaw = station.yaw + Math.PI;
    let fastest = 0, stepped = false, before = npc.yaw;
    const anim = Reflect.get(npc, 'anim') as number;
    for (let i = 0; i < 4 * 60; i++) {
      tick(1 / 60);
      fastest = Math.max(fastest, Math.abs(wrap(npc.yaw - before)) * 60);
      before = npc.yaw;
      if (npc.mode === 'walk') stepped = true;
      if (Math.abs(wrap(npc.yaw - station.yaw)) > 0.3) expect(npc.mode).not.toBe('work');
    }
    expect(fastest).toBeLessThanOrEqual(2.2 + 1e-6);
    expect(stepped).toBe(true);
    expect(Reflect.get(npc, 'anim')).toBeGreaterThan(anim);
    expect(Math.abs(wrap(npc.yaw - station.yaw))).toBeLessThan(0.05);
    expect(npc.mode).toBe('work');
    expect(npc.x).toBeCloseTo(station.x, 6);
  });

  it('turn toward whoever shares their meeting place, and keep the place\'s heading alone', () => {
    const together = createInitialState();
    together.quest.phase = 'committed'; together.quest.allocation = 'rotation';
    const reeve = harness(NPCS.rillford_reeve, 12, together), foreman = harness(NPCS.quarry_foreman, 12, together);
    reeve.tick(3); foreman.tick(3);
    for (const [a, b] of [[reeve.npc, foreman.npc], [foreman.npc, reeve.npc]] as const) {
      expect(Math.abs(wrap(a.yaw - Math.atan2(b.x - a.x, b.z - a.z)))).toBeLessThan(0.05);
    }
    // Before the meeting the foreman is at the quarry: the reeve alone at the square keeps its heading.
    const alone = createInitialState();
    const solo = harness(NPCS.rillford_reeve, 18, alone);
    solo.tick(3);
    expect(Math.abs(wrap(solo.npc.yaw - ANCHORS.village_square!.yaw))).toBeLessThan(0.05);
  });

  it('talk from their seat rather than swivelling on the bench', () => {
    const { npc, ctx, tick } = harness(NPCS.ash_recorder, 12), seat = ANCHORS.ford_camp!;
    tick(.5);
    expect(npc.mode).toBe('sit');
    ctx.player = { x: npc.x - Math.sin(seat.yaw) * 3, y: 0, z: npc.z - Math.cos(seat.yaw) * 3 };
    npc.talking = true; npc.speaking = true;
    tick(3);
    expect(Math.abs(wrap(npc.yaw - seat.yaw))).toBeLessThan(1e-6);
    expect(npc.mode).toBe('talk');
  });

  it('come out of their door facing the way they are going, not the door they went in by', () => {
    const { npc, ctx, tick } = harness(NPCS.trail_hunter, 23);
    expect(npc.hidden).toBe(true);
    npc.yaw = 2.5;
    ctx.hour = 7;
    for (let i = 0; i < 600 && npc.hidden; i++) tick(1 / 60);
    expect(npc.hidden).toBe(false);
    const station = ANCHORS.hunter_station!;
    expect(Math.abs(wrap(npc.yaw - Math.atan2(station.x - npc.x, station.z - npc.z)))).toBeLessThan(0.05);
  });

  it('are under way only with a route still to walk', () => {
    const { npc, ctx, tick } = harness(NPCS.trail_hunter, 12);
    tick(1);
    expect(npc.underway).toBe(false);
    ctx.hour = 23;
    tick(1 / 60);
    expect(npc.underway).toBe(true);
  });
});

describe('who a remark holds (A69)', () => {
  it('holds nobody for a passing remark, and both parties for an exchange', () => {
    const d = new SpeechDirector({ say: () => 3, caption: () => {} });
    expect(d.remark('mill_hand', 'bess.bark.wheel', { x: 0, y: 0, z: 0 })).toBeGreaterThan(0);
    expect(d.speakingFor('mill_hand')).toBeGreaterThan(0);
    expect(d.heldFor('mill_hand')).toBe(0);
    d.update(4);
    expect(d.talk('mill_hand', () => ({ x: 0, y: 0, z: 0 }), createInitialState())).toBe(true);
    expect(d.heldFor('mill_hand')).toBeGreaterThan(0);
  });
});

describe('a route\'s last step (A69)', () => {
  const grid = (colliders = new Colliders()) => new NavGrid({ nx: 60, nz: 60, walkable: () => true } as unknown as Terrain, colliders);
  const centre = (x: number, z: number) => ({
    x: WORLD.minX + (Math.floor((x - WORLD.minX) / WORLD.cell) + 0.5) * WORLD.cell,
    z: WORLD.minZ + (Math.floor((z - WORLD.minZ) / WORLD.cell) + 0.5) * WORLD.cell,
  });

  it('goes straight to the goal rather than through its grid cell\'s centre', () => {
    const from = { x: -366.2, z: -158.9 }, to = { x: -331.35, z: -141.2 };
    expect(grid().findPath(from, to)).toEqual([to]);
    // Round a wall: the last corner leads straight to the goal.
    const walled = new Colliders();
    walled.box('wall', -350, -150, 0.3, 6, 0, true, { minY: -10, maxY: 10 });
    const path = grid(walled).findPath(from, to)!;
    expect(path.at(-1)).toEqual(to);
    const goalCell = centre(to.x, to.z);
    expect(path.some((p) => Math.hypot(p.x - goalCell.x, p.z - goalCell.z) < 1e-6)).toBe(false);
  });
});
