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
import { poseRig } from '../../src/presentation/characters';
import { HERO_WALK_SPEED, HERO_RUN_SPEED } from '../../src/presentation/hero/locomotion';

// This is controller/physics coverage, with real game state and colliders; sculpted rendering is tested separately.
vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

function setup(ground: (x: number, z: number) => number = () => 0, walkable: (x: number, z: number, maxSlope?: number) => boolean = () => true) {
  let move = { x: 0, y: 0 };
  const held = new Set<string>();
  const presses = new Set<string>();
  const terrain = {
    groundAt: ground, supportAt: ground, walkable, valleyRadius: () => 0,
    deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0,
  } as unknown as Terrain;
  const audio = { footstep: vi.fn(), swing: vi.fn(), hit: vi.fn(), hurt: vi.fn(), jump: vi.fn(), land: vi.fn(), dodge: vi.fn() } as unknown as AudioEngine;
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
  it('keeps bow input out of the legacy fist/sword attack and block paths', () => {
    const s = setup();
    s.ctx.game.state.inventory.hunting_bow = 1;
    s.ctx.game.dispatch({ t: 'equipWeapon', item: 'hunting_bow' });
    s.player.syncEquipment(s.ctx.game);
    s.player.setBowAim(new THREE.Vector3(0, 0, 1), .5);
    s.presses.add('attack'); s.presses.add('heavy'); s.held.add('block');
    s.tick();
    expect(s.player.bowEquipped(s.ctx.game)).toBe(true);
    expect(s.player.state).toBe('free');
    expect(s.player.blocking).toBe(false);
    expect(s.audio.swing).not.toHaveBeenCalled();
    expect(s.player.stamina).toBe(100);
  });

  it('locks a skinning channel against combat, pauses its progress and completes only after three active seconds', () => {
    const s = setup();
    const done = vi.fn(), cancelled = vi.fn();
    expect(s.player.beginSkinning(0, .7, 3, done, cancelled, .4)).toBe(true);
    s.presses.add('attack'); s.presses.add('heavy'); s.presses.add('jump'); s.presses.add('dodge');
    for (let i = 0; i < 60; i++) s.tick();
    expect(s.player.skinningProgress).toBeCloseTo(1 / 3, 8);
    expect(s.audio.swing).not.toHaveBeenCalled();
    expect(s.player.x).toBe(0); expect(s.player.z).toBe(0);
    s.ctx.controllable = false;
    for (let i = 0; i < 60; i++) s.tick();
    expect(s.player.skinningProgress).toBeCloseTo(1 / 3, 8);
    expect(done).not.toHaveBeenCalled();
    s.ctx.controllable = true;
    for (let i = 0; i < 121; i++) s.tick();
    expect(s.player.state).toBe('free');
    expect(done).toHaveBeenCalledOnce();
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('cancels skinning on movement intent or an accepted hit without completing the harvest callback', () => {
    const s = setup();
    const done = vi.fn(), cancelled = vi.fn();
    expect(s.player.beginSkinning(0, .7, 3, done, cancelled)).toBe(true);
    s.tick();
    s.setMove(.1, 0); s.tick();
    expect(s.player.channel).toBeNull();
    expect(cancelled).toHaveBeenCalledOnce();
    expect(done).not.toHaveBeenCalled();
    s.setMove(0, 0);
    expect(s.player.beginSkinning(0, .7, 3, done, cancelled)).toBe(true);
    const attacker = { x: 0, y: 0, z: .9 } as EnemyActor;
    s.player.receiveHit(1, false, attacker, s.ctx);
    expect(s.player.state).toBe('hurt');
    expect(s.player.channel).toBeNull();
    expect(cancelled).toHaveBeenCalledTimes(2);
    expect(done).not.toHaveBeenCalled();
  });

  it('cancels a movement request on the exact skinning completion frame before its harvest callback', () => {
    const s = setup();
    const done = vi.fn(), cancelled = vi.fn();
    expect(s.player.beginSkinning(0, .7, 3, done, cancelled)).toBe(true);
    s.player.channel!.t = 3 - 1 / 60;
    s.setMove(.1, 0);
    s.tick(1 / 60);
    expect(s.player.channel).toBeNull();
    expect(s.player.state).toBe('free');
    expect(cancelled).toHaveBeenCalledOnce();
    expect(done).not.toHaveBeenCalled();
  });

  it('matches the supplied walking and running stride speeds after acceleration, including diagonal input', () => {
    for (const sprint of [false, true]) {
      const s = setup();
      s.setMove(1, 1);
      if (sprint) s.held.add('sprint');
      for (let i = 0; i < 120; i++) s.tick();
      expect(s.player.lastMoveSpeed).toBeCloseTo(sprint ? HERO_RUN_SPEED : HERO_WALK_SPEED, 4);
      expect(s.player.mode).toBe(sprint ? 'run' : 'walk');
      const pose = vi.mocked(poseRig).mock.calls.at(-1)![1];
      expect(pose.speed).toBeCloseTo(1, 4);
      expect(pose.moveSpeed).toBeCloseTo(sprint ? HERO_RUN_SPEED : HERO_WALK_SPEED, 4);
    }
  });

  it.each([30, 60, 120])('sustains default running beyond two minutes at %s Hz without stamina-gate pulsing', hz => {
    const s = setup(); s.setMove(0, 1); s.held.add('sprint');
    // A bounded square keeps actual controller travel clear of world boundaries.
    // Do not reset position, stamina or controller state between route segments.
    let travelled = 0;
    for (let frame = 0; frame < 120 * hz; frame++) {
      s.ctx.viewYaw = Math.floor(frame / (8 * hz)) % 4 * Math.PI / 2;
      s.tick(1 / hz);
      travelled += s.player.lastMoveSpeed / hz;
      expect(s.player.exhausted).toBe(false);
      if (frame > hz) expect(s.player.mode).toBe('run');
    }
    expect(travelled).toBeGreaterThan(690);
    expect(s.player.stamina).toBeCloseTo(10, 1);
    // Follow through actual exhaustion rather than stopping at the requirement.
    let elapsed = 120;
    while (!s.player.exhausted && elapsed < 140) {
      s.ctx.viewYaw = Math.floor(elapsed / 8) % 4 * Math.PI / 2;
      s.tick(1 / hz); elapsed += 1 / hz;
    }
    expect(elapsed).toBeGreaterThan(132.5);
    expect(elapsed).toBeLessThan(133);
    expect(s.player.exhausted).toBe(true);
    expect(s.ctx.input.clearToggle).toHaveBeenCalledWith('sprint');
    for (let frame = 0; frame < hz; frame++) s.tick(1 / hz);
    expect(s.player.exhausted).toBe(true); // Held input cannot alternate run/walk near empty.
    expect(s.player.mode).toBe('walk');
    s.held.delete('sprint'); s.setMove(0, 0);
    for (let frame = 0; frame < 6 * hz; frame++) s.tick(1 / hz);
    expect(s.player.stamina).toBe(100);
    expect(s.player.exhausted).toBe(false);
    s.held.add('sprint'); s.setMove(0, 1);
    for (let frame = 0; frame < hz; frame++) s.tick(1 / hz);
    expect(s.player.mode).toBe('run');
    expect(s.player.lastMoveSpeed).toBeCloseTo(HERO_RUN_SPEED, 4);
  });

  it('charges running only for resolved travel, retaining separate jump costs and pause suspension', () => {
    const s = setup(); s.held.add('sprint');
    for (let frame = 0; frame < 120; frame++) s.tick();
    expect(s.player.stamina).toBe(100); // Holding sprint without a direction costs nothing.
    s.ctx.colliders.box('wall', 0, 1, 4, 0.02); s.setMove(0, 1);
    for (let frame = 0; frame < 120; frame++) s.tick();
    expect(s.player.lastMoveSpeed).toBeLessThan(0.01);
    expect(s.player.stamina).toBe(100); // Pushing an impassable wall is not running.
    s.setMove(0, 0); s.held.delete('sprint'); s.presses.add('jump'); s.tick();
    expect(s.player.stamina).toBe(94);
    s.ctx.controllable = false;
    for (let frame = 0; frame < 120; frame++) s.tick();
    expect(s.player.stamina).toBe(94); // Menus neither spend nor replenish the meter.
    s.ctx.controllable = true;
    for (let frame = 0; frame < 120; frame++) s.tick();
    expect(s.player.stamina).toBe(100);
  });

  it('requires real recovery before running from an externally depleted balance', () => {
    const s = setup(); s.player.stamina = 0.25; s.setMove(0, 1); s.held.add('sprint');
    for (let frame = 0; frame < 60; frame++) {
      s.tick();
      expect(s.player.exhausted).toBe(true);
      expect(s.player.mode).not.toBe('run');
    }
    expect(s.player.stamina).toBeLessThan(22);
    expect(s.ctx.input.clearToggle).toHaveBeenCalledWith('sprint');
    for (let frame = 0; frame < 60; frame++) s.tick();
    expect(s.player.exhausted).toBe(false);
    expect(s.player.mode).toBe('run');
  });
  it('feeds the imported hero resolved travel and uses its heel strikes instead of duplicate distance sounds', () => {
    const s = setup();
    const footfalls = vi.fn().mockReturnValueOnce(1).mockReturnValue(0);
    Reflect.set(s.player.rig, 'hero', { consumeFootfalls: footfalls, reset: vi.fn() });
    s.setMove(0, 1);
    for (let i = 0; i < 150; i++) s.tick();
    expect(s.player.z).toBeGreaterThan(3.9);
    expect(s.player.z).toBeLessThan(4.2);
    expect(s.audio.footstep).toHaveBeenCalledOnce();
    const travelling = vi.mocked(poseRig).mock.calls.at(-1)![1];
    expect(travelling.grounded).toBe(true);
    expect(travelling.travel).toBeCloseTo(s.player.lastMoveSpeed / 60, 8);
    s.ctx.colliders.box('wall', 0, s.player.z + 1, 4, 0.02);
    for (let i = 0; i < 150; i++) s.tick();
    const blocked = vi.mocked(poseRig).mock.calls.at(-1)![1];
    expect(blocked.travel).toBe(0);
    expect(blocked.moveSpeed).toBeLessThan(0.01);
    expect(s.audio.footstep).toHaveBeenCalledOnce();
  });
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
    for (let i = 0; i < 60 && s.player.z <= 0.5; i++) s.tick();
    expect(s.player.z).toBeGreaterThan(0.5);
    expect(s.player.grounded).toBe(false);
    expect(s.player.y).toBeGreaterThan(1.7);
    for (let i = 0; i < 60; i++) s.tick();
    expect(s.player.y).toBe(0); expect(s.player.grounded).toBe(true);
  });

  it('jumps across a steep descending hill without its walking-slope policy becoming an invisible wall', () => {
    const ground = (_x: number, z: number) => z < 0.5 ? 4 : Math.max(0, 4 - (z - 0.5) * 1.7);
    const s = setup(ground, (_x, z, maxSlope = 0.95) => z < 0.5 || z > 2.86 || maxSlope >= 1.7);
    s.ctx.terrain.slopeAt = (_x, z) => z < 0.5 || z > 2.86 ? 0 : 1.7;
    s.setMove(0, 1);
    for (let i = 0; i < 12; i++) s.tick();
    s.presses.add('jump');
    let crossedSteepGroundInAir = false;
    for (let i = 0; i < 90; i++) {
      s.tick();
      if (s.player.z > 0.5 && s.player.z < 2.86 && !s.player.grounded) crossedSteepGroundInAir = true;
    }
    expect(crossedSteepGroundInAir).toBe(true);
    expect(s.player.z).toBeGreaterThan(3);
    expect(s.player.y).toBe(0);
    expect(s.player.grounded).toBe(true);
  });

  it('walks from a real Cut hillside onto its steep face, jumps and continues downhill under the real terrain controller', () => {
    const terrain = new Terrain();
    const colliders = buildStaticColliders(terrain);
    let route: { start: { x: number; z: number }; x: number; z: number } | undefined;
    // Pick the first clear, authored descent with walkable ground above and a genuinely steep face below.
    for (let z = -100; z <= -66 && !route; z += 2) {
      for (let x = 108; x <= 145 && !route; x += 2) {
        if (terrain.slopeAt(x, z) < 1.15 || terrain.walkable(x, z) || !terrain.walkable(x, z, Infinity)) continue;
        const n = terrain.normalAt(x, z), length = Math.hypot(n[0], n[2]);
        const downhill = { x: n[0] / length, z: n[2] / length };
        const start = { x: x - downhill.x * 4, z: z - downhill.z * 4 };
        if (!terrain.walkable(start.x, start.z)) continue;
        let clear = true;
        for (let t = 0; t <= 8; t += 0.2) {
          const px = start.x + downhill.x * t, pz = start.z + downhill.z * t;
          if (!terrain.walkable(px, pz, Infinity) || colliders.blocked(px, pz, 0.4)) { clear = false; break; }
        }
        if (clear) route = { start, ...downhill };
      }
    }
    expect(route, 'the authored Cut contains a clear steep descent').toBeDefined();
    const r = route!;
    const s = setup(); s.ctx.terrain = terrain; s.ctx.colliders = colliders;
    s.player.setPosition(r.start.x, r.start.z, Math.atan2(r.x, r.z), terrain);
    s.ctx.viewYaw = Math.atan2(r.x, r.z); s.setMove(0, 1);
    for (let i = 0; i < 65; i++) s.tick();
    s.presses.add('jump');
    let crossedSteep = false, airborne = false;
    for (let i = 0; i < 240; i++) {
      s.tick();
      crossedSteep ||= !terrain.walkable(s.player.x, s.player.z) && terrain.walkable(s.player.x, s.player.z, Infinity);
      airborne ||= !s.player.grounded;
      expect(colliders.blocked(s.player.x, s.player.z, 0.4, { minY: s.player.y + 0.03, maxY: s.player.y + 1.95 })).toBe(false);
      expect(s.player.y).toBeGreaterThanOrEqual(terrain.groundAt(s.player.x, s.player.z) - 1e-6);
    }
    expect(crossedSteep).toBe(true); expect(airborne).toBe(true);
    const descent = (s.player.x - r.start.x) * r.x + (s.player.z - r.start.z) * r.z;
    expect(descent).toBeGreaterThan(6);
    expect(s.player.y).toBeLessThan(terrain.groundAt(r.start.x, r.start.z) - 1);
  });

  it('keeps airborne momentum after releasing movement and brakes only after a supported landing', () => {
    const s = setup(); s.setMove(0, 1);
    for (let i = 0; i < 60; i++) s.tick();
    s.presses.add('jump'); s.tick();
    const airborneSpeed = s.player.vz, jumpZ = s.player.z;
    s.setMove(0, 0);
    for (let i = 0; i < 24; i++) s.tick();
    expect(s.player.grounded).toBe(false);
    expect(s.player.vz).toBeCloseTo(airborneSpeed, 8);
    expect(s.player.z - jumpZ).toBeCloseTo(airborneSpeed * 0.4, 8);
    for (let i = 0; i < 120; i++) s.tick();
    expect(s.player.grounded).toBe(true);
    expect(s.player.vz).toBeLessThan(0.01);
  });

  it('slides down exposed steep ground under gravity while authored raised steps retain firm support', () => {
    const s = setup((_x, z) => 5 - z * 1.6, (_x, _z, maxSlope = 0.95) => maxSlope >= 1.6);
    s.ctx.terrain.slopeAt = () => 1.6;
    for (let i = 0; i < 90; i++) s.tick();
    expect(s.player.z).toBeGreaterThan(3);
    expect(s.player.y).toBeCloseTo(5 - s.player.z * 1.6, 8);
    expect(s.player.grounded).toBe(true);
    const platform = setup();
    platform.ctx.terrain.slopeAt = () => 1.6;
    platform.ctx.physics = {
      move: (x, y, z, dx, dz) => ({ x: x + dx, y, z: z + dz }),
      supportAt: () => 0.7,
      ceilingAt: () => null,
    };
    platform.player.y = 0.7;
    for (let i = 0; i < 90; i++) platform.tick();
    expect(platform.player.z).toBe(0);
    expect(platform.player.y).toBe(0.7);
  });

  it('uses movable-body support and autosteps without skipping a true raised solid face', () => {
    const s = setup();
    s.ctx.physics = {
      move: (x, y, z, dx, dz) => {
        const nz = z + dz;
        if (nz >= 2) return { x, y, z: Math.min(z, 1.999) };
        return { x: x + dx, y: nz >= 0.5 ? Math.max(y, 0.65) : y, z: nz };
      },
      supportAt: (_x, z, feetY) => z >= 0.5 && z < 2 && 0.65 <= feetY + 0.8 ? 0.65 : null,
      ceilingAt: () => null,
      surfaceAt: (_x, z, feetY) => z >= 0.5 && z < 2 && Math.abs(feetY - 0.65) < 0.01 ? 'deck' : null,
    };
    s.setMove(0, 1);
    for (let i = 0; i < 120; i++) s.tick();
    expect(s.player.z).toBeGreaterThan(1.5);
    expect(s.player.z).toBeLessThan(2);
    expect(s.player.y).toBe(0.65);
    expect(s.player.grounded).toBe(true);
    expect(s.player.surface).toBe('deck');
    expect(s.player.lastMoveSpeed).toBeLessThan(0.01);
  });

  it('lands on a movable top after a long fall and uses the lower overhead contact', () => {
    const s = setup();
    s.ctx.physics = {
      move: (x, y, z, dx, dz) => ({ x: x + dx, y, z: z + dz }),
      supportAt: (_x, _z, feetY) => feetY + 0.8 >= 0.65 ? 0.65 : null,
      ceilingAt: (_x, _z, _r, fromY, toY) => toY > fromY && fromY <= 2.85 && toY >= 2.85 ? 2.85 : null,
    };
    s.player.y = 8; s.player.grounded = false;
    for (let i = 0; i < 100; i++) s.tick();
    expect(s.player.y).toBe(0.65); expect(s.player.grounded).toBe(true);
    s.ctx.colliders.box('upper-roof', 0, 0, 3, 3, 0, true, { minY: 3.2, maxY: 3.5 });
    s.presses.add('jump');
    let highest = s.player.y;
    for (let i = 0; i < 90; i++) { s.tick(); highest = Math.max(highest, s.player.y); }
    expect(highest + 1.95).toBeLessThanOrEqual(2.85);
    expect(s.player.y).toBe(0.65); expect(s.player.grounded).toBe(true);
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

  it('sweeps against an animal body during a long dodge without crossing its skin or adjacent scenery', () => {
    const s = setup();
    s.ctx.wildlifeContacts = [{ id: 'animal:seated-pet', kind: 'box', x: 0, z: 1.6, hw: 0.4, hd: 0.7, yaw: 0,
      active: true, minY: 0, maxY: 0.6 }];
    s.ctx.colliders.box('wall', 0, 3, 4, 0.05);
    s.setMove(0, 1); s.presses.add('dodge'); s.tick(0.3);
    for (let i = 0; i < 90; i++) s.tick();
    expect(s.player.z).toBeLessThan(0.65);
    const clear = s.ctx.colliders.resolve(s.player.x, s.player.z, 0.4, undefined, { minY: s.player.y + 0.02, maxY: s.player.y + 1.9 }, s.ctx.wildlifeContacts);
    expect(clear.hit).toBe(false); expect(s.ctx.colliders.blocked(s.player.x, s.player.z, 0.4)).toBe(false);
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
