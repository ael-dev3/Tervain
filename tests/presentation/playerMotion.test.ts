import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import type { EnemyActor, NpcActor } from '../../src/presentation/actors';
import { BLADE, FISTS, Player, type PlayerCtx } from '../../src/presentation/player';
import { Colliders, buildStaticColliders } from '../../src/world/colliders';
import { LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION as L } from '../../src/world/layout';
import { LIGHTHOUSE_STAIR_ANGLE, lighthouseTreadTop } from '../../src/world/lighthouse';
import { Terrain } from '../../src/world/terrain';

// This is controller/physics coverage, with real game state and colliders; sculpted rendering is tested separately.
vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

function setup(ground: (x: number, z: number) => number = () => 0, walkable: (x: number, z: number) => boolean = () => true) {
  let move = { x: 0, y: 0 };
  const held = new Set<string>();
  const presses = new Set<string>();
  const terrain = {
    groundAt: ground, supportAt: ground, walkable, valleyRadius: () => 0,
    deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0,
  } as unknown as Terrain;
  const audio = { footstep: vi.fn(), swing: vi.fn(), hit: vi.fn(), hurt: vi.fn() } as unknown as AudioEngine;
  const input = {
    move: () => move, held: (a: string) => held.has(a), pressed: (a: string) => presses.has(a),
    clearToggle: vi.fn(), uiOpen: false,
  } as unknown as Input;
  const ctx: PlayerCtx = {
    terrain, audio, input, colliders: new Colliders(), settings: defaultSettings(), game: new Game(),
    npcs: [], enemies: [], viewYaw: 0, controllable: true,
    onHitEnemy: vi.fn(), onHurt: vi.fn(), onDeath: vi.fn(), onBoundary: vi.fn(),
  };
  const player = new Player();
  player.setPosition(0, 0, 0, terrain);
  return { player, ctx, audio, presses, held, setMove: (x: number, y: number) => { move = { x, y }; }, tick: (dt = 1 / 60) => { player.update(dt, ctx); presses.clear(); } };
}

beforeEach(() => vi.clearAllMocks());

describe('player motion and action contacts', () => {
  it('walks into a wall and then stands still without treadmill footsteps', () => {
    const s = setup();
    s.ctx.colliders.box('wall', 0, 1, 4, 0.02);
    s.setMove(0, 1);
    for (let i = 0; i < 100; i++) s.tick();
    expect(s.player.z).toBeCloseTo(0.5799, 4);
    expect(s.player.lastMoveSpeed).toBeLessThan(0.01);
    expect(s.player.mode).toBe('idle');
    vi.mocked(s.audio.footstep).mockClear();
    for (let i = 0; i < 120; i++) s.tick();
    expect(s.audio.footstep).not.toHaveBeenCalled();
    expect(s.player.stamina).toBe(100);
  });

  it('lunges along the committed facing even with no movement input', () => {
    const s = setup();
    s.player.yaw = Math.PI / 2;
    s.presses.add('attack');
    for (let i = 0; i < 16; i++) s.tick();
    expect(s.player.x).toBeGreaterThan(0.15);
    expect(Math.abs(s.player.z)).toBeLessThan(1e-5);
    expect(s.audio.swing).toHaveBeenCalledOnce();
  });

  it('never dodges backwards at the end of a long frame and covers the same authored distance', () => {
    const distances = [30, 60, 120].map((hz) => {
      const s = setup();
      s.setMove(0, 1);
      s.presses.add('dodge');
      for (let i = 0; i < Math.ceil(0.4 * hz); i++) s.tick(1 / hz);
      return s.player.z;
    });
    for (const distance of distances) expect(distance).toBeCloseTo(2.6, 4);
    const s = setup();
    s.setMove(0, 1); s.presses.add('dodge'); s.tick(0.3);
    const before = s.player.z;
    s.setMove(0, 0); s.tick(0.3);
    expect(s.player.z).toBeGreaterThanOrEqual(before);
  });

  it('stops a dodge at a thin fence and cannot skip a non-walkable water strip', () => {
    const wall = setup();
    wall.ctx.colliders.box('fence', 0, 1, 3, 0.01);
    wall.setMove(0, 1); wall.presses.add('dodge'); wall.tick(0.3);
    expect(wall.player.z).toBeLessThan(0.6);
    const water = setup(() => 0, (_x, z) => z < 0.5 || z > 0.85);
    water.setMove(0, 1); water.presses.add('dodge'); water.tick(0.3);
    expect(water.player.z).toBeLessThan(0.5);
  });

  it('resets action, recoil and velocity when loading, teleporting or restarting', () => {
    const s = setup();
    s.player.vx = 5; s.player.vz = -5; s.player.vy = 7;
    s.player.state = 'dodge'; s.player.blocking = true; s.player.shake = 1;
    s.player.lastMoveSpeed = 6; s.player.drawn = true;
    s.player.setPosition(20, -20, 0.3, s.ctx.terrain);
    s.tick();
    expect(s.player.x).toBe(20); expect(s.player.z).toBe(-20);
    expect(s.player.vx).toBe(0); expect(s.player.vz).toBe(0); expect(s.player.vy).toBe(0);
    expect(s.player.state).toBe('free'); expect(s.player.invulnerable).toBe(false);
    expect(s.player.blocking).toBe(false); expect(s.player.shake).toBe(0);
    expect(s.player.mode).toBe('idle');
  });

  it('freezes action time and drift while controls are unavailable', () => {
    const s = setup();
    s.presses.add('heavy'); s.tick();
    s.ctx.controllable = false;
    const position = s.player.x;
    for (let i = 0; i < 120; i++) s.tick();
    expect(s.player.state).toBe('heavy');
    expect(s.player.x).toBe(position); expect(s.player.vx).toBe(0);
    expect(s.ctx.onHitEnemy).not.toHaveBeenCalled();
  });

  it('falls off a ledge rather than snapping to the ground below', () => {
    const s = setup((_x, z) => z < 0.5 ? 2 : 0);
    s.setMove(0, 1);
    for (let i = 0; i < 18; i++) s.tick();
    expect(s.player.z).toBeGreaterThan(0.5);
    expect(s.player.grounded).toBe(false);
    expect(s.player.y).toBeGreaterThan(1.7);
    for (let i = 0; i < 60; i++) s.tick();
    expect(s.player.y).toBe(0); expect(s.player.grounded).toBe(true);
  });

  it('keeps feet exactly on traversable slopes and legal raised thresholds', () => {
    const s = setup((x) => x * 0.4);
    s.ctx.viewYaw = Math.PI / 2; s.setMove(0, 1);
    for (let i = 0; i < 100; i++) s.tick();
    expect(s.player.y).toBeCloseTo(s.player.x * 0.4, 8);
    expect(s.player.grounded).toBe(true);
    const step = setup((_x, z) => z >= 0.5 ? 0.7 : 0);
    step.setMove(0, 1);
    for (let i = 0; i < 35; i++) step.tick();
    expect(step.player.z).toBeGreaterThan(0.5); expect(step.player.y).toBe(0.7);
    const tooHigh = setup((_x, z) => z >= 0.5 ? 1.1 : 0);
    tooHigh.setMove(0, 1);
    for (let i = 0; i < 100; i++) tooHigh.tick();
    expect(tooHigh.player.z).toBeLessThan(0.5); expect(tooHigh.player.y).toBe(0);
  });

  it('collides with a person before crossing them and cannot be pushed through adjacent scenery', () => {
    const s = setup();
    s.ctx.npcs = [{ id: 'spring_steward', x: 0, z: 1.5, y: 0, hidden: false } as NpcActor];
    s.ctx.colliders.box('wall', 0, 3, 4, 0.05);
    s.setMove(0, 1); s.presses.add('dodge'); s.tick(0.3);
    expect(s.player.z).toBeLessThanOrEqual(0.75);
    expect(s.ctx.colliders.blocked(s.player.x, s.player.z, 0.4)).toBe(false);
  });

  it('cannot strike or receive a strike through a wall or across separate floors', () => {
    const s = setup();
    const enemy = { id: 'cut_creature', x: 0, z: 1.4, y: 0, radius: 0.4, alive: true, engaged: false, takeHit: vi.fn(), parried: vi.fn() } as unknown as EnemyActor;
    s.ctx.enemies = [enemy];
    s.ctx.colliders.box('wall', 0, 0.8, 4, 0.015);
    s.presses.add('attack');
    for (let i = 0; i < 32; i++) s.tick();
    expect(enemy.takeHit).not.toHaveBeenCalled();
    const health = s.ctx.game.state.player.health;
    s.player.receiveHit(20, false, enemy, s.ctx);
    expect(s.ctx.game.state.player.health).toBe(health);
    s.ctx.colliders.setActive('wall', false); enemy.y = 6;
    s.player.receiveHit(20, false, enemy, s.ctx);
    expect(s.ctx.game.state.player.health).toBe(health);
  });
  it('keeps a stationary contact outside scenery instead of shoving through a wall', () => {
    const s = setup();
    s.ctx.colliders.box('wall', 0.5, 0, 0.03, 3);
    s.ctx.npcs = [{ id: 'spring_steward', x: -0.3, z: 0, y: 0, hidden: false } as NpcActor];
    for (let i = 0; i < 12; i++) s.tick();
    expect(s.player.x).toBeLessThan(0.07);
    expect(s.ctx.colliders.blocked(s.player.x, s.player.z, 0.4)).toBe(false);
    expect(s.player.lastMoveSpeed).toBe(0);
    expect(s.audio.footstep).not.toHaveBeenCalled();
  });

  it('stops a jump at the underside of a low roof and then lands without penetration', () => {
    const s = setup();
    s.ctx.colliders.box('porch-roof', 0, 0, 3, 3, 0, true, { minY: 2.2, maxY: 2.5 });
    s.presses.add('jump');
    let highest = 0;
    for (let i = 0; i < 90; i++) { s.tick(); highest = Math.max(highest, s.player.y); }
    expect(highest + 1.95).toBeLessThanOrEqual(2.2);
    expect(highest).toBeGreaterThan(0.2);
    expect(s.player.y).toBe(0); expect(s.player.grounded).toBe(true);
  });

  it('has consistent straight movement and jump trajectory at ordinary frame rates', () => {
    const samples = [30, 60, 120].map((hz) => {
      const s = setup(); s.setMove(0, 1);
      for (let i = 0; i < hz; i++) s.tick(1 / hz);
      const distance = s.player.z;
      s.presses.add('jump');
      for (let i = 0; i < hz / 3; i++) s.tick(1 / hz);
      return { distance, y: s.player.y };
    });
    for (const sample of samples) {
      expect(sample.distance).toBeCloseTo(samples[0]!.distance, 4);
      expect(sample.y).toBeCloseTo(samples[0]!.y, 4);
    }
  });

  it('walks the actual lighthouse stair flight to its gallery using movement, geometry and finite scenery bounds', () => {
    const s = setup();
    const terrain = new Terrain();
    s.ctx.terrain = terrain; s.ctx.colliders = buildStaticColliders(terrain);
    const radius = 4.13;
    const point = (angle: number) => ({ x: LIGHTHOUSE.x + Math.cos(angle) * radius, z: LIGHTHOUSE.z + Math.sin(angle) * radius });
    const start = point(L.stairStart + LIGHTHOUSE_STAIR_ANGLE * 0.12);
    s.player.setPosition(start.x, start.z, 0, terrain);
    s.setMove(0, 1);
    let targetStep = 0;
    let maxGroundError = 0;
    for (let frame = 0; frame < 1600 && targetStep < L.stairSteps; frame++) {
      const target = point(L.stairStart + (targetStep + 0.7) * LIGHTHOUSE_STAIR_ANGLE);
      const dx = target.x - s.player.x, dz = target.z - s.player.z;
      if (Math.hypot(dx, dz) < 0.07) { targetStep++; continue; }
      s.ctx.viewYaw = Math.atan2(dx, dz);
      s.tick();
      maxGroundError = Math.max(maxGroundError, Math.abs(s.player.y - terrain.supportAt(s.player.x, s.player.z, s.player.y)));
      expect(s.ctx.colliders.blocked(s.player.x, s.player.z, 0.4, { minY: s.player.y + 0.03, maxY: s.player.y + 1.95 })).toBe(false);
    }
    expect(targetStep).toBe(L.stairSteps);
    expect(s.player.y).toBeCloseTo(terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z) + lighthouseTreadTop(L.stairSteps - 1), 5);
    expect(s.player.surface).toBe('deck');
    expect(maxGroundError).toBeLessThan(0.001);
  });

});


describe('explicit player equipment', () => {
  it('keeps collected weapons in the bag until equipped and changes combat stats only on equip', () => {
    const s = setup(); s.ctx.game.state.inventory.rusted_sword = 1;
    expect(s.player.arms(s.ctx.game)).toBe(FISTS);
    expect(s.ctx.game.dispatch({ t: 'equipWeapon', item: 'rusted_sword' }).ok).toBe(true);
    s.player.syncEquipment(s.ctx.game, true);
    expect(s.player.arms(s.ctx.game)).toBe(BLADE);
    expect(s.player.drawn).toBe(true);
    expect(s.ctx.game.state.inventory.rusted_sword).toBe(1);
    s.ctx.game.dispatch({ t: 'equipWeapon', item: null }); s.player.syncEquipment(s.ctx.game);
    expect(s.player.arms(s.ctx.game)).toBe(FISTS); expect(s.player.drawn).toBe(false);
    expect(s.ctx.game.state.inventory.rusted_sword).toBe(1);
  });
  it('updates held geometry while paused without completing a blow using another weapon', () => {
    const s = setup(); s.presses.add('heavy'); s.tick();
    const stamina = s.player.stamina, position = { x: s.player.x, y: s.player.y, z: s.player.z };
    s.ctx.controllable = false; s.ctx.game.state.inventory.rusted_sword = 1;
    s.ctx.game.dispatch({ t: 'equipWeapon', item: 'rusted_sword' }); s.player.syncEquipment(s.ctx.game, true);
    expect(s.player.state).toBe('free'); expect(s.player.drawn).toBe(true);
    s.tick();
    expect(s.player.stamina).toBe(stamina); expect(s.ctx.onHitEnemy).not.toHaveBeenCalled();
    expect({ x: s.player.x, y: s.player.y, z: s.player.z }).toEqual(position);
  });
  it('cannot fight with a missing weapon even when handed stale equipment state', () => {
    const s = setup(); s.ctx.game.state.equippedWeapon = 'rusted_sword';
    s.player.syncEquipment(s.ctx.game, true);
    expect(s.player.arms(s.ctx.game)).toBe(FISTS); expect(s.player.drawn).toBe(false);
  });
  it('reselects the same blade without interrupting an attack or clearing an active guard', () => {
    const s = setup(); s.ctx.game.state.inventory.rusted_sword = 1;
    s.ctx.game.dispatch({ t: 'equipWeapon', item: 'rusted_sword' }); s.player.syncEquipment(s.ctx.game);
    s.presses.add('heavy'); s.tick(); s.player.blocking = true; s.player.blockTime = .15;
    const stamina = s.player.stamina;
    s.player.readyWeapon(s.ctx.game);
    expect(s.player.state).toBe('heavy'); expect(s.player.blocking).toBe(true); expect(s.player.blockTime).toBe(.15);
    expect(s.player.stamina).toBe(stamina); expect(s.player.drawn).toBe(true);
  });

});
