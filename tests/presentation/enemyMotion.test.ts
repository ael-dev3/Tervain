import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnemyActor, type EnemyContext, type EnemyState } from '../../src/presentation/actors';
import { poseRig, type Pose, type Rig } from '../../src/presentation/characters';
import type { EnemySpawn } from '../../src/world/layout';
import { Colliders } from '../../src/world/colliders';
import { NavGrid } from '../../src/world/nav';
import type { Terrain } from '../../src/world/terrain';
import { WORLD } from '../../src/world/layout';

// Exercise the real hostile controller/contact/state transitions. Geometry and source skinning
// have separate actual-file coverage; capturing the presentation pose makes gait continuity observable.
vi.mock('../../src/presentation/characters', () => ({
  createBanditRig: () => rig(), createThornback: () => rig('thornback'), createNpcRig: vi.fn(),
  poseRig: vi.fn(), applyFlash: vi.fn(),
}));

function rig(kind: Rig['kind'] = 'humanoid'): Rig {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  return { root, body, kind, height: 1.8, hitFlash: 0 } as Rig;
}

function setup(kind: EnemySpawn['kind'] = 'bandit') {
  const spawn = { id: kind === 'thornback' ? 'cut_creature' : 'ford_bandit_a', kind,
    x: 0, z: 0, leash: 100 } as EnemySpawn;
  const enemy = new EnemyActor(spawn);
  const resolve = vi.fn((x: number, z: number) => ({ x, z }));
  const walkable = vi.fn(() => true);
  const ctx = {
    player: { x: 0, y: 0, z: 20, alive: true, invulnerable: false }, reducedMotion: false,
    terrain: { groundAt: () => 0, walkable }, colliders: { resolve,
      move: (ax: number, az: number, dx: number, dz: number) => resolve(ax + dx, az + dz), segmentBlocked: () => false },
    strikePlayer: vi.fn(() => true), onGrowl: vi.fn(), time: 0,
  } as unknown as EnemyContext;
  const tick = (dt = 1 / 60): Pose => {
    ctx.time += dt; enemy.update(dt, ctx);
    return vi.mocked(poseRig).mock.calls.at(-1)![1];
  };
  return { enemy, ctx, resolve, walkable, tick };
}

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0); });
afterEach(() => vi.restoreAllMocks());

describe('humanoid enemy movement presentation', () => {
  it.each([30, 60, 120])('keeps a continuous distance-driven gait through chase/return/chase at %s Hz', hz => {
    const s = setup(); const dt = 1 / hz;
    let previousPhase = 0, distance = 0;
    for (const [state, seconds, alive] of [
      ['chase', 1, true], ['return', 1, false], ['chase', 2, true],
    ] as const) {
      s.enemy.state = state; s.ctx.player.alive = alive;
      for (let frame = 0; frame < seconds * hz; frame++) {
        const old = { x: s.enemy.x, z: s.enemy.z }, p = s.tick(dt);
        distance += Math.hypot(s.enemy.x - old.x, s.enemy.z - old.z);
        expect(p.mode).toBe(state === 'return' ? 'walk' : 'run');
        expect(p.time).toBeGreaterThan(previousPhase);
        // A state change can add one ordinary frame of gait, never a lifetime-clock jump.
        expect(p.time - previousPhase).toBeLessThanOrEqual(1.5 * dt + 1e-10);
        previousPhase = p.time;
      }
    }
    expect(distance).toBeCloseTo(12.95, 8);
    expect(previousPhase).toBeCloseTo(5.4, 8);
    expect(s.enemy.z).toBeCloseTo(8.05, 8);
    expect(s.enemy.hp).toBe(55);
  });

  it.each(['contact', 'unwalkable'] as const)('stops moving feet at a %s barrier and resumes without accruing hidden steps', barrier => {
    const s = setup(); s.enemy.state = 'chase';
    let moving = s.tick();
    if (barrier === 'contact') s.resolve.mockImplementation(() => ({ x: s.enemy.x, z: s.enemy.z }));
    else s.walkable.mockReturnValue(false);
    const before = s.enemy.rig.root.position.clone(), phase = moving.time;
    let previousIdleTime = 0;
    for (let frame = 0; frame < 90; frame++) {
      const stopped = s.tick();
      expect(stopped.mode).toBe('idle'); expect(stopped.speed).toBe(0);
      // Feet stop, but the actual idle poser retains breathing/head motion while the controller waits.
      expect(stopped.time).toBeGreaterThan(previousIdleTime); expect(stopped.travel).toBe(0);
      if (frame > 0) expect(stopped.time - previousIdleTime).toBeCloseTo(0.9 / 60, 8);
      previousIdleTime = stopped.time;
      expect(s.enemy.rig.root.position.equals(before)).toBe(true);
      expect(s.enemy.state).toBe('chase');
    }
    s.resolve.mockImplementation((x, z) => ({ x, z })); s.walkable.mockReturnValue(true);
    moving = s.tick();
    expect(moving.mode).toBe('run'); expect(moving.time - phase).toBeCloseTo(1.5 / 60, 8);
    expect(moving.speed).toBeCloseTo(1, 8);
  });

  it('uses collision-resolved sliding travel for gait amplitude and phase', () => {
    const s = setup(); s.enemy.state = 'chase';
    s.resolve.mockImplementation((x, z) => ({ x, z: s.enemy.z + (z - s.enemy.z) * 0.5 }));
    const p = s.tick(1 / 30);
    expect(s.enemy.z).toBeCloseTo(3.5 / 60, 8);
    expect(p.travel).toBeCloseTo(3.5 / 60, 8); expect(p.moveSpeed).toBeCloseTo(1.75, 8);
    expect(p.speed).toBeCloseTo(0.5, 8); expect(p.time).toBeCloseTo(0.75 / 30, 8);
  });

  it('does not advance gait during combat/recovery and resets it with the existing reset path', () => {
    const s = setup(); s.enemy.state = 'chase';
    const phase = s.tick().time;
    s.enemy.state = 'recover'; s.ctx.player.alive = false;
    for (let frame = 0; frame < 30; frame++) expect(s.tick().mode).toBe('idle');
    s.enemy.state = 'chase'; s.ctx.player.alive = true;
    expect(s.tick().time - phase).toBeCloseTo(1.5 / 60, 8);
    s.enemy.reset({ terrain: s.ctx.terrain }); s.enemy.state = 'chase';
    expect(s.tick().time).toBeCloseTo(1.5 / 60, 8);
    expect(s.enemy.hp).toBe(55);
  });

  it.each(['alert', 'telegraph', 'chase'] as EnemyState[])('turns consistently at 30/60/120 Hz in %s without changing the established 60 Hz response', state => {
    const yaw = [30, 60, 120].map(hz => {
      const s = setup();
      if (state === 'alert') { s.ctx.player.z = 8; s.tick(); } // Real notice starts the alert timer.
      s.enemy.state = state; s.enemy.yaw = 1.2;
      // Straight route and fixed bearing: movement cannot change the aim target during this interval.
      for (let frame = 0; frame < hz / 5; frame++) s.tick(1 / hz);
      expect(s.enemy.state).toBe(state);
      return s.enemy.yaw;
    });
    expect(yaw[0]).toBeCloseTo(yaw[1]!, 10); expect(yaw[2]).toBeCloseTo(yaw[1]!, 10);
    const oldFactor = state === 'alert' ? 0.2 : 0.25;
    expect(yaw[1]).toBeCloseTo(1.2 * (1 - oldFactor) ** 12, 10);
  });

  it('keeps the slow idle look-around response consistent across refresh rates', () => {
    const yaw = [30, 60, 120].map(hz => {
      const s = setup(); s.ctx.player.alive = false;
      for (let frame = 0; frame < hz; frame++) s.tick(1 / hz);
      expect(s.enemy.state).toBe('idle'); expect(s.enemy.z).toBe(0);
      return s.enemy.yaw;
    });
    // The target itself moves slowly; ordinary frame sampling contributes a small integration difference.
    expect(Math.max(...yaw) - Math.min(...yaw)).toBeLessThan(0.002);
    expect(yaw[1]).toBeGreaterThan(0.9); expect(yaw[1]).toBeLessThan(1.05);
  });

  it('preserves attack timing, damage/reach and one strike, including a parry during the strike callback', () => {
    const s = setup(); s.enemy.state = 'chase'; s.ctx.player.z = 1.8;
    s.tick(); expect(s.enemy.state).toBe('telegraph');
    for (let frame = 0; frame < 35; frame++) s.tick();
    expect(s.enemy.state).toBe('telegraph'); expect(s.ctx.strikePlayer).not.toHaveBeenCalled();
    s.tick(); expect(s.enemy.state).toBe('strike');
    const strike = vi.mocked(s.ctx.strikePlayer);
    strike.mockImplementation(enemy => { enemy.parried(0, 1.8); return false; });
    for (let frame = 0; frame < 7; frame++) s.tick();
    expect(strike).toHaveBeenCalledTimes(1); expect(strike).toHaveBeenCalledWith(s.enemy, 11, false);
    expect(s.enemy.state).toBe('stagger'); expect(s.enemy.hp).toBe(55); expect(s.enemy.radius).toBe(0.4);
    expect(vi.mocked(poseRig).mock.calls.at(-1)![1].mode).toBe('hurt');
  });

  it('retains the Thornback clock-driven creature poser, pacing and combat budget', () => {
    const s = setup('thornback'); s.ctx.player.alive = false;
    const p = s.tick();
    expect(p.mode).toBe('walk'); expect(p.speed).toBe(0.35); expect(p.time).toBeCloseTo(0.9 / 60, 8);
    expect(Math.hypot(s.enemy.x, s.enemy.z)).toBeCloseTo(0.9 / 60, 8);
    expect(s.enemy.hp).toBe(110); expect(s.enemy.radius).toBe(0.85);
  });
});

describe('hostile navigation with real finite swept contacts', () => {
  function world() {
    const s = setup();
    const colliders = new Colliders();
    const terrain = { nx: (WORLD.maxX - WORLD.minX) / WORLD.cell, nz: (WORLD.maxZ - WORLD.minZ) / WORLD.cell,
      groundAt: () => 0, walkable: () => true } as unknown as Terrain;
    s.ctx.terrain = terrain; s.ctx.colliders = colliders;
    return { ...s, colliders, terrain };
  }

  it.each([30, 60, 120])('goes around a blocking fence and returns to its post at %s Hz without teleporting', hz => {
    const s = world(), dt = 1 / hz;
    s.colliders.box('fence', 0, 6, 4, .08, 0, true, { minY: 0, maxY: 2 });
    s.ctx.nav = new NavGrid(s.terrain, s.colliders);
    s.enemy.state = 'chase';
    let maxSide = 0;
    for (let f = 0; f < 16 * hz && s.enemy.state === 'chase'; f++) {
      const old = { x: s.enemy.x, z: s.enemy.z }, p = s.tick(dt);
      expect(Math.hypot(s.enemy.x - old.x, s.enemy.z - old.z)).toBeLessThanOrEqual(3.5 * dt + .001);
      expect(s.colliders.blocked(s.enemy.x, s.enemy.z, s.enemy.radius - .001)).toBe(false);
      if (p.travel === 0) expect(p.mode).toBe('idle');
      maxSide = Math.max(maxSide, Math.abs(s.enemy.x));
    }
    expect(maxSide).toBeGreaterThan(4.4);
    expect(s.enemy.state).toBe('telegraph');
    s.enemy.state = 'return'; s.ctx.player.alive = false;
    for (let f = 0; f < 20 * hz && (s.enemy.state as EnemyState) !== 'idle'; f++) s.tick(dt);
    expect(s.enemy.state).toBe('idle');
    expect(Math.hypot(s.enemy.x, s.enemy.z)).toBeLessThan(1);
  });

  it('waits with still feet on an unreachable return and retries when a gate opens', () => {
    const s = world(); s.enemy.x = 12;
    s.colliders.box('closed-gate', 6, 0, .1, 5, 0, true, { minY: 0, maxY: 3 });
    const findPath = vi.fn(() => null);
    s.ctx.nav = { findPath } as unknown as NavGrid;
    s.enemy.state = 'return'; s.ctx.player.alive = false;
    for (let f = 0; f < 120; f++) { const p = s.tick(); expect(p.mode).toBe('idle'); expect(p.travel).toBe(0); }
    expect(s.enemy.state).toBe('return'); expect(s.enemy.x).toBe(12);
    expect(findPath.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(findPath.mock.calls.length).toBeLessThanOrEqual(4);
    s.colliders.setActive('closed-gate', false);
    expect(s.tick().mode).toBe('walk');
    for (let f = 0; f < 400 && (s.enemy.state as EnemyState) !== 'idle'; f++) s.tick();
    expect(s.enemy.state).toBe('idle'); expect(Math.abs(s.enemy.x)).toBeLessThan(1);
  });

  it('chooses a genuinely wider detour for the Thornback rather than retrying the narrow humanoid route forever', () => {
    const s = setup('thornback'), colliders = new Colliders();
    const terrain = { nx: (WORLD.maxX - WORLD.minX) / WORLD.cell, nz: (WORLD.maxZ - WORLD.minZ) / WORLD.cell,
      groundAt: () => 0, walkable: () => true } as unknown as Terrain;
    colliders.circle('tree', 1, 5.1, .3, true, { minY: 0, maxY: 6 });
    s.ctx.terrain = terrain; s.ctx.colliders = colliders; s.ctx.nav = new NavGrid(terrain, colliders);
    expect(s.ctx.nav.forRadius(.85)).toBe(s.ctx.nav.forRadius(.85));
    s.enemy.state = 'chase';
    let minX = 0;
    for (let f = 0; f < 600 && s.enemy.state === 'chase'; f++) {
      s.tick(); minX = Math.min(minX, s.enemy.x);
      expect(colliders.blocked(s.enemy.x, s.enemy.z, .849)).toBe(false);
    }
    expect(minX).toBeLessThan(-1); expect(s.enemy.state).toBe('telegraph');
  });

  it('sweeps a heavy lunge against a thin wall and ignores an overhead beam', () => {
    const s = setup('thornback'), colliders = new Colliders(); s.ctx.colliders = colliders;
    colliders.box('beam', 0, .1, 4, .01, 0, true, { minY: 4, maxY: 5 });
    colliders.box('wall', 0, 1, 4, .01, 0, true, { minY: 0, maxY: 3 });
    s.enemy.state = 'telegraph'; s.ctx.player.z = 2;
    for (let f = 0; f < 58; f++) s.tick();
    expect(s.enemy.state).toBe('strike');
    for (let f = 0; f < 12; f++) s.tick();
    expect(s.enemy.z).toBeGreaterThan(.01);
    expect(s.enemy.z).toBeLessThan(.15);
    expect(colliders.blocked(s.enemy.x, s.enemy.z, s.enemy.radius - .001, { minY: 0, maxY: 1.8 })).toBe(false);
    expect(s.ctx.strikePlayer).toHaveBeenCalledTimes(1);
  });

  it('holds a finite living body, excludes itself and allows movement below a bridge resident', () => {
    const s = world(); s.enemy.state = 'chase';
    s.ctx.contacts = [{ id: 'enemy:ford_bandit_a', kind: 'circle', x: 0, z: 0, r: .4, active: true, minY: 0, maxY: 1.8 },
      { id: 'person:other', kind: 'circle', x: 0, z: 2, r: .35, active: true, minY: 0, maxY: 1.8 }];
    for (let f = 0; f < 60; f++) s.tick();
    expect(s.enemy.z).toBeGreaterThan(1); expect(s.enemy.z).toBeLessThanOrEqual(1.251);
    expect(s.tick().mode).toBe('idle');
    s.ctx.contacts = s.ctx.contacts.map(c => ({ ...c, minY: 4, maxY: 5.8 }));
    expect(s.tick().mode).toBe('run');
  });
});
