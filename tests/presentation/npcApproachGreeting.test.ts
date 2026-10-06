import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { NPCS } from '../../src/content/npcs';
import { createInitialState } from '../../src/game/state';
import { reviveState } from '../../src/platform/storage';
import { finishNpcPath, NpcActor, resolveGoal, type ActorContext } from '../../src/presentation/actors';
import type { Rig } from '../../src/presentation/characters';
import { NpcApproachGreeting } from '../../src/presentation/npcApproachGreeting';
import { npcStyle } from '../../src/presentation/npcStyle';
import { workSound } from '../../src/presentation/sound/foley';
import { Colliders } from '../../src/world/colliders';
import { ANCHORS } from '../../src/world/layout';
import type { NavGrid } from '../../src/world/nav';
import type { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({ poseRig: vi.fn(), applyFlash: vi.fn(), createNpcRig: vi.fn(), createBanditRig: vi.fn(), createThornback: vi.fn() }));

const config = NPCS.trail_hunter.approachGreeting!;

describe('roadside hunter welcome', () => {
  it('welcomes an arrival promptly, without periodic repeats while they stay at the table', () => {
    const greeting = new NpcApproachGreeting(config), speak = vi.fn(() => true);
    greeting.update(10, 30, true, speak);
    expect(speak).not.toHaveBeenCalled();
    greeting.update(1 / 60, 5, true, speak);
    expect(speak).toHaveBeenCalledOnce();
    for (let i = 0; i < 600; i++) greeting.update(1, 5, true, speak);
    expect(speak).toHaveBeenCalledOnce();
  });

  it('requires both a real departure and the cooldown before a return welcome', () => {
    const greeting = new NpcApproachGreeting(config), speak = vi.fn(() => true);
    greeting.update(0, 5, true, speak);
    greeting.update(1, 10, true, speak); // Radius jitter is not a departure.
    greeting.update(150, 5, true, speak);
    expect(speak).toHaveBeenCalledOnce();
    greeting.update(0, 12, true, speak);
    greeting.update(0.5, 5, true, speak);
    expect(speak).toHaveBeenCalledTimes(2);
    greeting.update(0.5, 12, true, speak);
    greeting.update(1, 5, true, speak);
    expect(speak).toHaveBeenCalledTimes(2);
    greeting.update(120, 5, true, speak);
    expect(speak).toHaveBeenCalledTimes(3);
  });

  it('retries a loading voice at a bounded rate without treating an unheard line as a welcome', () => {
    const greeting = new NpcApproachGreeting(config), speak = vi.fn(() => false);
    greeting.update(0, 5, true, speak);
    for (let i = 0; i < 20; i++) greeting.update(0.01, 5, true, speak);
    expect(speak).toHaveBeenCalledOnce();
    speak.mockReturnValue(true);
    greeting.update(0.5, 5, true, speak);
    expect(speak).toHaveBeenCalledTimes(2);
    greeting.update(600, 5, true, speak);
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('does not start a delayed greeting after departure or while the hunter is already speaking', () => {
    const greeting = new NpcApproachGreeting(config), speak = vi.fn(() => false);
    greeting.update(0, 5, true, speak);
    speak.mockReturnValue(true);
    greeting.update(10, 12, true, speak);
    greeting.update(10, 5, false, speak);
    expect(speak).toHaveBeenCalledOnce();
    greeting.update(0, 5, true, speak);
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('uses the actual actor and spatial speaker position at its camp, with no random periodic bark', () => {
    const npc = new NpcActor(NPCS.trail_hunter, { root: new THREE.Group(), height: 1.8, materials: [], hitFlash: 0 } as unknown as Rig);
    const anchor = ANCHORS.hunter_station!;
    const onBark = vi.fn(() => true);
    const ctx: ActorContext = { terrain: { groundAt: () => 1 } as unknown as Terrain,
      colliders: new Colliders(), nav: { findPath: vi.fn() } as unknown as NavGrid, state: createInitialState(), hour: 12,
      player: { x: anchor.x + 4, y: 1, z: anchor.z }, reducedMotion: false, onBark };
    npc.update(1 / 60, ctx);
    expect(npc.goal).toEqual({ anchor: 'hunter_station', activity: 'work' });
    expect(npc.mode).toBe('work');
    expect(npcStyle(npc.id).work).toBe('provisioning');
    expect(workSound(npc.id, npcStyle(npc.id).work)?.clip).toBe('item.cloth');
    expect(onBark).toHaveBeenCalledWith(npc, 'rowan.bark.supplies');
    expect(npc.headPosition.x).toBe(anchor.x);
    expect(npc.headPosition.y).toBeGreaterThan(npc.y + 1.6);
    for (let i = 0; i < 600; i++) npc.update(1, ctx);
    expect(onBark).toHaveBeenCalledOnce();
  });

  it('works by day, closes the camp at night, and fills old-save defaults without changing quest state', () => {
    const old = createInitialState(), quest = structuredClone(old.quest);
    delete (old.npcs as Partial<typeof old.npcs>).trail_hunter;
    const loaded = reviveState(old)!;
    expect(loaded.npcs.trail_hunter).toEqual({ available: true, cause: null, trust: 0, met: false });
    expect(loaded.quest).toEqual(quest);
    for (const hour of [6, 12, 19.99]) {
      expect(resolveGoal(NPCS.trail_hunter, loaded, hour)).toEqual({ anchor: 'hunter_station', activity: 'work' });
    }
    expect(resolveGoal(NPCS.trail_hunter, loaded, 20)).toEqual({ anchor: 'hunter_station', activity: 'stand' });
    expect(resolveGoal(NPCS.trail_hunter, loaded, 21.99)).toEqual({ anchor: 'hunter_station', activity: 'stand' });
    for (const hour of [0, 5.99, 22, 23.99]) {
      expect(resolveGoal(NPCS.trail_hunter, loaded, hour)).toEqual({ anchor: NPCS.trail_hunter.home, activity: 'rest' });
    }
  });
});

describe('precise NPC workbench approaches', () => {
  const flat = { groundAt: () => 0, walkable: () => true } as unknown as Terrain;

  it('finishes the short actual capsule route to a stance whose coarse table cell is blocked', () => {
    const colliders = new Colliders();
    colliders.box('counter', -216, 31, 1.2, .775, Math.PI, true, { minY: 0, maxY: 1.02 });
    const original = [{ x: -219, z: 31 }], goal = { x: -217.75, z: 31 };
    expect(finishNpcPath(original, goal, { terrain: flat, colliders }, 1.836)).toEqual([...original, goal]);
    expect(original).toEqual([{ x: -219, z: 31 }]);
    const blocked = { x: -217.45, z: 31 };
    expect(finishNpcPath(original, blocked, { terrain: flat, colliders }, 1.836)).toBe(original);
  });

  it('retains the A* route when an obstacle, water or abrupt ledge separates it from the authored stance', () => {
    const original = [{ x: 0, z: 0 }], goal = { x: 2, z: 0 }, colliders = new Colliders();
    colliders.box('intervening wall', 1, 0, .1, 3);
    expect(finishNpcPath(original, goal, { terrain: flat, colliders }, 1.8)).toBe(original);
    const empty = new Colliders();
    const water = { ...flat, walkable: (x: number) => x < .8 || x > 1.2 } as unknown as Terrain;
    expect(finishNpcPath(original, goal, { terrain: water, colliders: empty }, 1.8)).toBe(original);
    const ledge = { ...flat, groundAt: (x: number) => x < 1 ? 0 : 1.1 } as unknown as Terrain;
    expect(finishNpcPath(original, goal, { terrain: ledge, colliders: empty }, 1.8)).toBe(original);
    expect(finishNpcPath(original, { x: 5, z: 0 }, { terrain: flat, colliders: empty }, 1.8)).toBe(original);
    expect(finishNpcPath(null, goal, { terrain: flat, colliders: empty }, 1.8)).toBeNull();
  });

  it('settles the worker close enough to reach the bench rather than stopping at ordinary waypoint tolerance', () => {
    const anchor = ANCHORS.hunter_station!, npc = new NpcActor(NPCS.trail_hunter,
      { root: new THREE.Group(), height: 1.836, materials: [], hitFlash: 0 } as unknown as Rig);
    Reflect.set(npc, 'placed', true);
    npc.goal = { anchor: 'hunter_station', activity: 'work' };
    npc.x = anchor.x - 1.25; npc.z = anchor.z;
    Reflect.set(npc, 'path', [{ x: anchor.x, z: anchor.z }]);
    const ctx: ActorContext = { terrain: flat, colliders: new Colliders(), nav: { findPath: vi.fn() } as unknown as NavGrid,
      state: createInitialState(), hour: 12, player: { x: anchor.x - 20, y: 0, z: anchor.z }, reducedMotion: false, onBark: vi.fn(() => false) };
    for (let i = 0; i < 120; i++) npc.update(1 / 60, ctx);
    expect(Math.hypot(npc.x - anchor.x, npc.z - anchor.z)).toBeLessThan(.06);
    expect(npc.mode).toBe('work');
  });
});
