import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import { createInitialState } from '../../src/game/state';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import { MemoryStore, SaveStore, reviveState } from '../../src/platform/storage';
import type { AudioEngine } from '../../src/presentation/audio';
import { CameraRig } from '../../src/presentation/cameraRig';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import {
  DEER_BODY, MOUNT_SIDE, MOUNT_STAMINA, MOUNT_TIMES, RIDE, RIDE_CAMERA, deerBodyPoints, doorwayAhead, gaitBob, roomAtDoor, steerMount,
} from '../../src/presentation/riding';
import { Colliders } from '../../src/world/colliders';
import { INTERIORS, fromBuildingLocal } from '../../src/world/interiors';
import type { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

const DT = 1 / 60;
const DEER = '1005232412';

function setup(colliders = new Colliders()) {
  let move = { x: 0, y: 0 };
  const held = new Set<string>();
  const presses = new Set<string>();
  const ground = () => 0;
  const terrain = {
    groundAt: ground, supportAt: ground, walkable: () => true, valleyRadius: () => 0,
    deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0,
  } as unknown as Terrain;
  const audio = { footstep: vi.fn(), swing: vi.fn(), hit: vi.fn(), hurt: vi.fn(), jump: vi.fn(), land: vi.fn(), dodge: vi.fn() } as unknown as AudioEngine;
  const input = {
    move: () => move, held: (a: string) => held.has(a), pressed: (a: string) => presses.has(a),
    clearToggle: vi.fn(), uiOpen: false,
  } as unknown as Input;
  const ctx: PlayerCtx = {
    terrain, audio, input, colliders, settings: defaultSettings(), game: new Game(),
    npcs: [], enemies: [], viewYaw: 0, controllable: true,
    onHitEnemy: vi.fn(), onHurt: vi.fn(), onDeath: vi.fn(), onBoundary: vi.fn(),
  };
  const player = new Player();
  player.setPosition(0, 0, 0, terrain);
  return { player, ctx, audio, presses, held, colliders, setMove: (x: number, y: number) => { move = { x, y }; }, tick: (dt = DT) => { player.update(dt, ctx); presses.clear(); } };
}

/** How far a disc of radius r at (x, z) lies inside an axis-aligned box (negative: clear of it). */
function inside(box: { x: number; z: number; hw: number; hd: number }, x: number, z: number, r: number) {
  const dx = Math.max(0, Math.abs(x - box.x) - box.hw), dz = Math.max(0, Math.abs(z - box.z) - box.hd);
  return r - Math.hypot(dx, dz);
}

beforeEach(() => vi.clearAllMocks());

describe('getting onto and off the saddled deer', () => {
  it('walks to the clear side, swings up over ~0.8 s with input locked, and ends in the saddle without entering scenery', () => {
    const crate = { x: MOUNT_SIDE, z: 3, hw: 0.3, hd: 0.3 };
    const c = new Colliders(); c.box('crate', crate.x, crate.z, crate.hw, crate.hd, 0, true, { minY: -1, maxY: 1 });
    const s = setup(c);
    const deer = { x: 0, y: 0, z: 3, yaw: 0 };
    expect(s.player.beginMount(DEER, 1.2, deer, s.ctx)).toBe(true);
    // The deer's left is blocked by the crate: he goes round to its right.
    expect(s.player.mountMove!.side.x).toBeCloseTo(-MOUNT_SIDE, 6);
    let swing = 0, ticks = 0;
    s.setMove(1, 0);
    while (s.player.mountMove && ticks++ < 600) {
      s.presses.add('attack'); s.presses.add('jump');
      if (s.player.mountMove.kind === 'swing') swing += DT;
      s.tick();
      expect(inside(crate, s.player.x, s.player.z, 0.3)).toBeLessThanOrEqual(1e-6);
    }
    expect(s.audio.swing).not.toHaveBeenCalled();
    expect(s.audio.jump).not.toHaveBeenCalled();
    expect(s.player.mount).toEqual({ id: DEER, seat: 1.2 });
    expect(swing).toBeGreaterThan(MOUNT_TIMES.swing - 2 * DT);
    expect(swing).toBeLessThan(MOUNT_TIMES.swing + 2 * DT);
    expect(s.player.x).toBeCloseTo(0, 6); expect(s.player.z).toBeCloseTo(3, 6); expect(s.player.yaw).toBeCloseTo(0, 6);
    s.setMove(0, 0); s.tick();
    expect(s.player.seatHeight).toBeCloseTo(1.2, 6);
  });

  it('steps down beside the deer to a clear side, and cancelling midway leaves him standing clear', () => {
    const crate = { x: MOUNT_SIDE, z: 3, hw: 0.3, hd: 0.3 };
    const c = new Colliders(); c.box('crate', crate.x, crate.z, crate.hw, crate.hd, 0, true, { minY: -1, maxY: 1 });
    const s = setup(c);
    s.player.mountUp(DEER, 1.2, 0, 0, 3, 0);
    expect(s.player.beginDismount(s.ctx)).toBe(true);
    let t = 0;
    while (s.player.mountMove && t < 2) { s.tick(); t += DT; expect(s.player.seatHeight).toBeLessThanOrEqual(1.2 + 0.1 + 1e-9); }
    expect(t).toBeCloseTo(MOUNT_TIMES.descend, 1);
    expect(s.player.mount).toBeNull();
    expect(s.player.x).toBeCloseTo(-MOUNT_SIDE, 6); expect(s.player.z).toBeCloseTo(3, 6);
    expect(c.blocked(s.player.x, s.player.z, 0.3, { minY: 0.1, maxY: 1.8 })).toBe(false);
    expect(s.player.grounded).toBe(true);

    // Swinging up, then cut short: back where he stood, afoot, and the deer is not ridden.
    const from = { x: s.player.x, z: s.player.z };
    expect(s.player.beginMount(DEER, 1.2, { x: 0, y: 0, z: 3, yaw: 0 }, s.ctx)).toBe(true);
    expect(s.player.mountMove!.kind).toBe('swing');
    for (let i = 0; i < 24; i++) s.tick();
    expect(s.player.mountProgress).toBeGreaterThan(0.3);
    s.player.dismount(s.ctx);
    expect(s.player.mountMove).toBeNull(); expect(s.player.mount).toBeNull();
    expect(s.player.x).toBeCloseTo(from.x, 6); expect(s.player.z).toBeCloseTo(from.z, 6);
    s.tick();
    expect(s.player.seatHeight).toBe(0);
  });
});

describe('steering the deer', () => {
  it('turns at a bounded rate and gathers speed rather than snapping to the input', () => {
    const s = setup();
    s.player.mountUp(DEER, 1.2, 0, 0, 0, 0);
    s.setMove(1, 0); // screen right at view yaw 0: -x, a quarter turn away
    let maxRate = 0, t = 0;
    while (Math.abs(Math.atan2(Math.sin(s.player.yaw + Math.PI / 2), Math.cos(s.player.yaw + Math.PI / 2))) > 0.01 && t < 5) {
      const before = s.player.yaw; s.tick(); t += DT;
      maxRate = Math.max(maxRate, Math.abs(Math.atan2(Math.sin(s.player.yaw - before), Math.cos(s.player.yaw - before))) / DT);
    }
    expect(maxRate).toBeLessThanOrEqual(RIDE.turnStill + 1e-6);
    expect(t).toBeGreaterThan(Math.PI / 2 / RIDE.turnStill - DT);
    // Speed builds no faster than the deer can gather itself.
    s.setMove(0, 1);
    const v0 = s.player.rideSpeed;
    for (let i = 0; i < 12; i++) s.tick();
    expect(s.player.rideSpeed - v0).toBeLessThanOrEqual(RIDE.accel * 12 * DT + 1e-6);
    // A gallop turns more widely than a standstill.
    expect(steerMount({ speed: RIDE.run, yaw: 0 }, -1, 0, 1, true, 0.1).turn).toBeCloseTo(-RIDE.turnRun, 6);
    expect(steerMount({ speed: 0, yaw: 0 }, -1, 0, 1, true, 0.1).turn).toBeCloseTo(-RIDE.turnStill, 6);
  });

  it('backs up slowly when steered straight behind, and leans into turns', () => {
    const s = setup();
    s.player.mountUp(DEER, 1.2, 0, 0, 0, 0);
    s.setMove(0, -1);
    for (let i = 0; i < 120; i++) s.tick();
    expect(s.player.yaw).toBeCloseTo(0, 6);
    expect(s.player.rideSpeed).toBeCloseTo(-RIDE.back, 3);
    expect(s.player.z).toBeLessThan(-0.5);
    s.setMove(0, 0); for (let i = 0; i < 60; i++) s.tick();
    s.setMove(0, 1); s.held.add('sprint'); for (let i = 0; i < 120; i++) s.tick();
    s.setMove(-1, 0.3); for (let i = 0; i < 30; i++) s.tick(); // turning left (yaw rising)
    expect(s.player.rideTurn).toBeGreaterThan(0);
    expect(s.player.leanAngle).toBeLessThan(-0.02);
    expect(Math.abs(s.player.leanAngle)).toBeLessThanOrEqual(RIDE.leanMax);
  });

  it('gallops at 6.2 m/s on its own stamina, and walks when that is spent until it recovers', () => {
    const s = setup();
    // Open ground far from any building's door.
    s.player.mountUp(DEER, 1.2, 3000, 0, 0, 0);
    s.setMove(0, 1); s.held.add('sprint');
    for (let i = 0; i < 180; i++) s.tick();
    expect(s.player.rideSpeed).toBeCloseTo(RIDE.run, 3);
    expect(s.player.galloping).toBe(true);
    const heroStamina = s.player.stamina;
    let t = 3;
    while (!s.player.mountSpent && t < 30) { s.tick(); t += DT; }
    // Full to spent at a gallop: (100 - 4) / 10 per second, after the moment it takes to break from a walk.
    const gallopSeconds = (MOUNT_STAMINA.max - MOUNT_STAMINA.spent) / MOUNT_STAMINA.drain;
    expect(t).toBeGreaterThan(gallopSeconds);
    expect(t).toBeLessThan(gallopSeconds + 1.2);
    for (let i = 0; i < 60; i++) s.tick();
    expect(s.player.mountSpent).toBe(true);
    expect(s.player.rideSpeed).toBeLessThanOrEqual(RIDE.walk + 1e-6);
    expect(s.player.stamina).toBe(heroStamina);
    s.held.delete('sprint');
    for (let i = 0; i < 60 * 3; i++) s.tick();
    expect(s.player.mountSpent).toBe(false);
    expect(s.player.mountStamina).toBeGreaterThanOrEqual(MOUNT_STAMINA.resume);
  });

  it('rises and falls with the deer\'s footfalls: twice a stride, higher at a gallop', () => {
    expect(gaitBob(0, RIDE.walk)).toBeCloseTo(0, 9);
    expect(gaitBob(0.25, RIDE.walk)).toBeCloseTo(gaitBob(0.75, RIDE.walk), 9);
    expect(gaitBob(0.25, RIDE.run)).toBeGreaterThan(gaitBob(0.25, RIDE.walk));
    expect(gaitBob(0.25, 0)).toBe(0);
    const s = setup();
    s.player.mountUp(DEER, 1.2, 0, 0, 0, 0);
    s.setMove(0, 1); for (let i = 0; i < 60; i++) s.tick();
    s.player.setMountGait(0.25); s.tick();
    expect(s.player.seatHeight).toBeCloseTo(1.2 + gaitBob(0.25, s.player.rideSpeed), 9);
  });
});

describe('the deer\'s body against the world', () => {
  it('stops a full gallop at a wall with its head outside it', () => {
    const wall = { x: 0, z: 12, hw: 6, hd: 0.3 };
    const c = new Colliders(); c.box('wall', wall.x, wall.z, wall.hw, wall.hd, 0, true, { minY: -1, maxY: 4 });
    const s = setup(c);
    s.player.mountUp(DEER, 1.2, 0, 0, 0, 0);
    s.setMove(0, 1); s.held.add('sprint');
    let top = 0;
    for (let i = 0; i < 60 * 5; i++) {
      s.tick();
      top = Math.max(top, s.player.rideSpeed);
      for (const p of deerBodyPoints(s.player.x, s.player.z, s.player.yaw)) expect(inside(wall, p.x, p.z, DEER_BODY.radius)).toBeLessThanOrEqual(1e-6);
    }
    expect(top).toBeGreaterThan(6);
    // It got to the wall (within a step) and stopped there; a hero's capsule alone would have let the head through.
    const nose = s.player.z + DEER_BODY.front + DEER_BODY.radius;
    expect(nose).toBeGreaterThan(wall.z - wall.hd - 0.2);
    expect(s.player.rideSpeed).toBe(0);
    expect(s.player.z + 0.3).toBeLessThan(wall.z - wall.hd);
  });

  it('will not carry its rider through a building door, and offers to get down there instead', () => {
    const room = INTERIORS[0]!, b = room.building;
    const out = fromBuildingLocal(b, room.door.x, b.d / 2 + 4), toward = fromBuildingLocal(b, room.door.x, b.d / 2 + 3);
    const yaw = Math.atan2(toward.x - out.x, toward.z - out.z);
    const s = setup();
    s.ctx.viewYaw = yaw;
    s.player.mountUp(DEER, 1.2, out.x, 0, out.z, yaw);
    expect(doorwayAhead(out.x, out.z)).toBeNull();
    s.setMove(0, 1);
    for (let i = 0; i < 60 * 6; i++) {
      s.tick();
      for (const p of deerBodyPoints(s.player.x, s.player.z, s.player.yaw)) expect(roomAtDoor(p.x, p.z)).toBeNull();
    }
    expect(Math.hypot(s.player.x - out.x, s.player.z - out.z)).toBeGreaterThan(1.5);
    const nose = deerBodyPoints(s.player.x, s.player.z, s.player.yaw)[0]!;
    expect(doorwayAhead(nose.x, nose.z)).toBe(room);
    // Afoot the same walk carries him in.
    s.player.dismount(s.ctx);
    s.player.setPosition(s.player.x, s.player.z, yaw, s.ctx.terrain);
    for (let i = 0; i < 60 * 3; i++) s.tick();
    expect(roomAtDoor(s.player.x, s.player.z)).toBe(room);
  });
});

describe('saving in the saddle', () => {
  it('keeps the ridden deer in the save so a load puts him back in its saddle, and drops anything else', () => {
    const state = createInitialState(); state.player.mount = DEER; state.player.x = 12; state.player.z = -4;
    const store = new SaveStore(new MemoryStore());
    expect(store.save('slot-1', state).ok).toBe(true);
    const loaded = store.load('slot-1'); expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.player.mount).toBe(DEER);
    expect(reviveState({ ...createInitialState(), player: { ...state.player, mount: 42 } })!.player.mount).toBeUndefined();
    expect(reviveState({ ...createInitialState(), player: { ...state.player, mount: '<x>' } })!.player.mount).toBeUndefined();
    expect(reviveState(createInitialState())!.player.mount).toBeUndefined();
    // The load mounts him where he was saved, the deer brought under him (App.carryRider): seated, no swing.
    const s = setup();
    s.player.setPosition(loaded.state.player.x, loaded.state.player.z, 0, s.ctx.terrain);
    s.player.mountUp(DEER, 1.2, s.player.x, s.player.y, s.player.z, s.player.yaw);
    s.tick();
    expect(s.player.mount?.id).toBe(DEER); expect(s.player.mountMove).toBeNull();
    expect(s.player.x).toBe(12); expect(s.player.z).toBe(-4);
  });
});

describe('the riding camera', () => {
  it('pulls back and up while mounted, easing between', () => {
    const terrain = { groundAt: () => -50 };
    const cam = new CameraRig();
    cam.pitch = 0;
    cam.follow(DT, 0, 0, 0, terrain, new Colliders(), true, 0);
    const afoot = { boom: cam.lastBoom, lift: cam.lastPivotLift, eye: cam.camera.position.clone() };
    cam.mounted = true;
    // The boom lengthens gently (it never jumps out from an obstruction); give it time to reach full length.
    for (let i = 0; i < 600; i++) cam.follow(DT, 0, 0, 0, terrain, new Colliders(), true, 0);
    expect(cam.lastBoom - afoot.boom).toBeCloseTo(RIDE_CAMERA.back, 6);
    expect(cam.lastPivotLift - afoot.lift).toBeCloseTo(RIDE_CAMERA.up, 6);
    expect(cam.camera.position.y).toBeGreaterThan(afoot.eye.y + RIDE_CAMERA.up - 0.05);
    expect(Math.hypot(cam.camera.position.x, cam.camera.position.z)).toBeGreaterThan(Math.hypot(afoot.eye.x, afoot.eye.z) + RIDE_CAMERA.back - 0.05);
    cam.mounted = false;
    cam.follow(DT, 0, 0, 0, terrain, new Colliders(), false, 0);
    expect(cam.rideBlend).toBeGreaterThan(0.9);
    for (let i = 0; i < 180; i++) cam.follow(DT, 0, 0, 0, terrain, new Colliders(), false, 0);
    expect(cam.rideBlend).toBeLessThan(0.01);
  });
});
