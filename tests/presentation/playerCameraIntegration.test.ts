import { beforeAll, describe, expect, it } from 'vitest';
import { Game } from '../../src/game/game';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import { CameraRig } from '../../src/presentation/cameraRig';
import { CAMERA_CLEARANCE } from '../../src/presentation/cameraObstruction';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import { buildStaticColliders, Colliders, type Collider } from '../../src/world/colliders';
import { LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION as L, bySpec } from '../../src/world/layout';
import { LIGHTHOUSE_STAIR_ANGLE, lighthouseTreadTop } from '../../src/world/lighthouse';
import { canPlayerStandAt, PLAYER_BODY_HEIGHT, PLAYER_BODY_RADIUS, supportedPlayerHeight } from '../../src/world/playerPlacement';
import { Terrain } from '../../src/world/terrain';
import { buildingEntry, buildingGround } from '../../src/world/buildingEntries';

let terrain: Terrain;
let colliders: Colliders;
beforeAll(() => { terrain = new Terrain(); colliders = buildStaticColliders(terrain); });

function setup(ground: Terrain = terrain, collisions: Colliders = colliders) {
  const presses = new Set<string>();
  let movement = false;
  const ctx: PlayerCtx = {
    terrain: ground, colliders: collisions, game: new Game(), settings: defaultSettings(),
    input: { move: () => ({ x: 0, y: movement ? 1 : 0 }), held: () => false, pressed: (key: string) => presses.has(key), clearToggle: () => {} } as unknown as Input,
    audio: { footstep: () => {}, swing: () => {}, hit: () => {}, hurt: () => {} } as unknown as AudioEngine,
    npcs: [], enemies: [], viewYaw: 0, controllable: true,
    onHitEnemy: () => {}, onHurt: () => {}, onDeath: () => {}, onBoundary: () => {},
  };
  const player = new Player();
  const camera = new CameraRig();
  return { player, camera, ctx, presses, setMovement: (value: boolean) => { movement = value; }, tick: (hz: number, headingOffset = 0) => {
    player.update(1 / hz, ctx); presses.clear();
    camera.yaw = ctx.viewYaw + headingOffset;
    camera.follow(1 / hz, player.x, player.y, player.z, ground, collisions, false, player.shake);
  } };
}

/** Distance from the camera centre to the actual finite solid; independent of the boom's conservative expanded-box algorithm. */
function spherePenetration(point: { x: number; y: number; z: number }, shape: Collider, ground: Terrain): number {
  const floor = shape.minY ?? ground.groundAt(shape.x, shape.z);
  const ceiling = shape.maxY ?? floor + 5;
  const dy = Math.max(0, floor - point.y, point.y - ceiling);
  let horizontal: number;
  if (shape.kind === 'circle') horizontal = Math.max(0, Math.hypot(point.x - shape.x, point.z - shape.z) - shape.r);
  else {
    const cos = Math.cos(shape.yaw), sin = Math.sin(shape.yaw);
    const dx = point.x - shape.x, dz = point.z - shape.z;
    horizontal = Math.hypot(Math.max(0, Math.abs(dx * cos - dz * sin) - shape.hw), Math.max(0, Math.abs(dx * sin + dz * cos) - shape.hd));
  }
  return CAMERA_CLEARANCE - Math.hypot(horizontal, dy);
}

function assertFrameClear(s: ReturnType<typeof setup>) {
  const point = s.camera.camera.position;
  for (const shape of s.ctx.colliders.near(point.x, point.z, CAMERA_CLEARANCE)) {
    const penetration = spherePenetration(point, shape, s.ctx.terrain);
    // Check every shape on every frame; allocate assertion diagnostics only when a real contact fails.
    if (penetration > 1e-6) throw new Error(`Camera penetrates ${shape.id} by ${penetration} m at ${point.toArray().join(', ')}`);
  }
  if (s.ctx.colliders.blocked(s.player.x, s.player.z, PLAYER_BODY_RADIUS, { minY: s.player.y + 0.03, maxY: s.player.y + PLAYER_BODY_HEIGHT })) {
    throw new Error(`Player penetrates scenery at ${s.player.x}, ${s.player.y}, ${s.player.z}`);
  }
  if (![point.x, point.y, point.z].every(Number.isFinite)) throw new Error(`Non-finite camera position: ${point.toArray().join(', ')}`);
}

const stairPoint = (index: number) => {
  const angle = L.stairStart + index * LIGHTHOUSE_STAIR_ANGLE;
  return { x: LIGHTHOUSE.x + Math.cos(angle) * 4.13, z: LIGHTHOUSE.z + Math.sin(angle) * 4.13 };
};

function walk(s: ReturnType<typeof setup>, indices: number[], hz: number, headingOffset = 0) {
  s.setMovement(true);
  let reached = 0;
  for (let frame = 0; frame < hz * 30 && reached < indices.length; frame++) {
    const target = stairPoint(indices[reached]!);
    const dx = target.x - s.player.x, dz = target.z - s.player.z;
    if (Math.hypot(dx, dz) < 0.07) { reached++; continue; }
    s.ctx.viewYaw = Math.atan2(dx, dz);
    s.tick(hz, headingOffset);
    assertFrameClear(s);
    const supportError = Math.abs(s.player.y - terrain.supportAt(s.player.x, s.player.z, s.player.y));
    if (supportError >= 0.001) throw new Error(`Player loses tread support by ${supportError} m at ${hz} Hz, stair target ${indices[reached]}`);
  }
  expect(reached).toBe(indices.length);
}

describe('the player and camera share the authored lighthouse surfaces', () => {
  it.each([30, 60, 120])('climbs and descends all 92 treads at %i Hz with three camera headings and no sphere/scenery penetration', (hz) => {
    for (const heading of [0, Math.PI / 2, -Math.PI / 2]) {
      const s = setup(); const start = stairPoint(0.12);
      s.player.setPosition(start.x, start.z, 0, terrain);
      walk(s, Array.from({ length: L.stairSteps }, (_, i) => i + 0.7), hz, heading);
      expect(s.player.y).toBeCloseTo(terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z) + L.stairTop, 5);
      walk(s, Array.from({ length: L.stairSteps }, (_, i) => L.stairSteps - 1 - i + 0.3), hz, heading);
      expect(s.player.y).toBeCloseTo(terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z) + lighthouseTreadTop(0), 5);
    }
  }, 15000);

  it.each([30, 60, 120])('jumps under the real gallery and porch at %i Hz without passing its head or camera through the ceiling', (hz) => {
    const base = terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
    for (const [position, feetY] of [
      [stairPoint(74.5), base + lighthouseTreadTop(74)],
      [{ x: LIGHTHOUSE.x + L.house.x + 1.2, z: LIGHTHOUSE.z + L.house.d / 2 + 1.25 }, undefined],
    ] as const) {
      const s = setup();
      s.player.setPosition(position.x, position.z, 0, terrain, feetY);
      s.ctx.viewYaw = Math.PI;
      s.presses.add('jump');
      let highest = s.player.y;
      const ceiling = feetY === undefined ? base + 2.75 : base + L.stairTop - 0.18;
      for (let frame = 0; frame < hz * 2; frame++) {
        s.tick(hz); assertFrameClear(s); highest = Math.max(highest, s.player.y);
      }
      expect(highest).toBeGreaterThan(s.player.y + 0.1);
      expect(highest + PLAYER_BODY_HEIGHT).toBeLessThanOrEqual(ceiling + 1e-6);
      expect(s.player.grounded).toBe(true);
    }
  });

  it('restores a western stair save above the house and an upper gallery save at their real heights', () => {
    const base = terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
    for (const [point, y] of [[stairPoint(69.5), base + lighthouseTreadTop(69)], [stairPoint(93), base + L.stairTop]] as const) {
      expect(canPlayerStandAt(terrain, colliders, point.x, point.z, y)).toBe(true);
      const s = setup(); s.player.setPosition(point.x, point.z, 0, terrain, y);
      expect(s.player.y).toBeCloseTo(y, 6);
      for (let frame = 0; frame < 60; frame++) { s.tick(60); assertFrameClear(s); }
      expect(s.player.y).toBeCloseTo(y, 6);
    }
  });

  it('restores a stone doorstep save on a rotated house and retains its stone footstep surface', () => {
    const building = bySpec('fisher_house');
    const entry = buildingEntry(building);
    const cos = Math.cos(building.yaw), sin = Math.sin(building.yaw);
    const x = building.x + entry.x * cos + (entry.z + 0.42) * sin;
    const z = building.z - entry.x * sin + (entry.z + 0.42) * cos;
    const feetY = buildingGround((px, pz) => terrain.heightAt(px, pz), building).avg + entry.y + 0.08;
    expect(canPlayerStandAt(terrain, colliders, x, z, feetY)).toBe(true);
    const s = setup(); s.player.setPosition(x, z, building.yaw + Math.PI, terrain, feetY);
    s.ctx.viewYaw = building.yaw + Math.PI;
    for (let frame = 0; frame < 60; frame++) { s.tick(60); assertFrameClear(s); }
    expect(s.player.y).toBeCloseTo(feetY, 6);
    expect(s.player.surface).toBe('stone');
  });

  it('rejects arbitrary saved air heights, non-finite hints, under-ground hints and solid walls', () => {
    const point = stairPoint(15.5);
    const ground = terrain.groundAt(point.x, point.z);
    for (const height of [500, -100, NaN, Infinity]) expect(supportedPlayerHeight(terrain, point.x, point.z, height)).toBe(ground);
    const base = terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
    expect(canPlayerStandAt(terrain, colliders, LIGHTHOUSE.x + LIGHTHOUSE.r - 0.2, LIGHTHOUSE.z, base + L.room.floorTop)).toBe(false);
    expect(canPlayerStandAt(terrain, colliders, NaN, 0, ground)).toBe(false);
  });

  it('keeps a saved steep-land position for gravity instead of teleporting it behind a slope fence', () => {
    const slope = { groundAt: () => 3, supportAt: () => 3, walkable: (_x: number, _z: number, maxSlope = 0.95) => maxSlope > 1.2 };
    expect(canPlayerStandAt(slope, new Colliders(), 0, 0, 3)).toBe(true);
    expect(supportedPlayerHeight(slope, 0, 0, 3)).toBe(3);
    const wall = new Colliders(); wall.box('real-wall', 0, 0, 1, 1);
    expect(canPlayerStandAt(slope, wall, 0, 0, 3)).toBe(false);
  });

  it('restores accepted interior saves onto the tower and keeper floors with a collision-safe camera', () => {
    const base = terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
    for (const [point, floor] of [
      [{ x: LIGHTHOUSE.x, z: LIGHTHOUSE.z + 0.6 }, L.room.floorTop],
      [{ x: LIGHTHOUSE.x + L.house.x + L.house.doorX, z: LIGHTHOUSE.z + 0.5 }, L.house.floorTop],
    ] as const) {
      const feet = base + floor;
      expect(canPlayerStandAt(terrain, colliders, point.x, point.z, feet)).toBe(true);
      expect(supportedPlayerHeight(terrain, point.x, point.z, feet)).toBeCloseTo(feet, 6);
      // Arbitrary air hints still fall back to the real room floor, rather than supplying an airborne position.
      expect(supportedPlayerHeight(terrain, point.x, point.z, 500)).toBeCloseTo(feet, 6);
      const s = setup(); s.player.setPosition(point.x, point.z, 0, terrain, feet);
      for (let frame = 0; frame < 120; frame++) { s.tick(60); assertFrameClear(s); }
      expect(s.player.y).toBeCloseTo(feet, 6);
      expect(s.player.grounded).toBe(true);
    }
  });

  it.each([30, 60, 120])('slides along a corner wall at %i Hz, hides the forced-close body and releases the boom smoothly', (hz) => {
    const flat = {
      groundAt: () => 0, supportAt: () => 0, walkable: () => true, valleyRadius: () => 0,
      deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0,
    } as unknown as Terrain;
    const walls = new Colliders();
    walls.box('east', 2, 0, 0.03, 5, 0, true, { minY: -0.2, maxY: 3 });
    walls.box('north', 0, 2, 5, 0.03, 0, true, { minY: -0.2, maxY: 3 });
    const s = setup(flat, walls);
    s.player.setPosition(0, 0, 0, flat); s.ctx.viewYaw = Math.PI / 4;
    s.setMovement(true);
    for (let frame = 0; frame < hz * 2; frame++) { s.tick(hz, Math.PI); assertFrameClear(s); }
    expect(s.player.x).toBeCloseTo(1.5699, 4); expect(s.player.z).toBeCloseTo(1.5699, 4);
    expect(s.player.lastMoveSpeed).toBeLessThan(0.01);
    expect(s.camera.bodyVisible).toBe(false);
    s.ctx.viewYaw = -Math.PI / 2;
    // Cover the same corner escape at the newly calibrated walking pace.
    for (let frame = 0; frame < hz * 5; frame++) { s.tick(hz, Math.PI); assertFrameClear(s); }
    expect(s.player.x).toBeLessThan(-4);
    expect(s.player.z).toBeCloseTo(1.5699, 3);
    walls.setActive('east', false); walls.setActive('north', false);
    s.setMovement(false);
    const boom = () => Math.hypot(s.camera.camera.position.x - s.player.x, s.camera.camera.position.y - s.player.y - 1.55, s.camera.camera.position.z - s.player.z);
    let previous = boom();
    for (let frame = 0; frame < hz * 3; frame++) {
      s.tick(hz, Math.PI); assertFrameClear(s);
      expect(boom()).toBeGreaterThanOrEqual(previous - 1e-6); previous = boom();
    }
    expect(previous).toBeGreaterThan(5.35);
    expect(s.camera.bodyVisible).toBe(true);
  });

});
