import * as THREE from 'three';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import { Ctx } from '../../src/presentation/buildKit';
import { groundSplat } from '../../src/presentation/groundSplat';
import { authorLighthouse } from '../../src/presentation/lighthouse';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import { HERO_WALK_SPEED } from '../../src/presentation/hero/locomotion';
import { Region } from '../../src/presentation/regions';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { LAYER } from '../../src/presentation/terrainTextures';
import { Exclusions } from '../../src/presentation/vegetation';
import { buildStaticColliders } from '../../src/world/colliders';
import { LANTERN_ROUTE, LANTERN_TRAIL_WIDTH, LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION as L, type V2 } from '../../src/world/layout';
import { PLAYER_BODY_HEIGHT, PLAYER_BODY_RADIUS, canPlayerStandAt, supportedPlayerHeight } from '../../src/world/playerPlacement';
import { initializePhysics, RealmPhysics } from '../../src/world/physics';
import { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

const terrain = new Terrain();
const colliders = buildStaticColliders(terrain);
const population = createScatterPopulation(terrain, new Exclusions(terrain));
registerScatterColliders(population, colliders);
terrain.registerRockSurfaces(population.flatMap(rock => rock.contact ? [rock.contact] : []));
const worlds: RealmPhysics[] = [];
beforeAll(() => initializePhysics());
afterEach(() => { for (const world of worlds.splice(0)) world.dispose(); });
const base = terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
const boundsAt = (x: number, z: number) => ({ minY: terrain.groundAt(x, z) + 0.03, maxY: terrain.groundAt(x, z) + PLAYER_BODY_HEIGHT });

function setup(start: V2) {
  let moving = true;
  const player = new Player();
  player.setPosition(start.x, start.z, 0, terrain);
  const context: PlayerCtx = {
    terrain, colliders, physics: (() => { const p = new RealmPhysics(terrain, colliders, []); worlds.push(p); return p; })(), settings: defaultSettings(), game: new Game(),
    input: { move: () => ({ x: 0, y: moving ? 1 : 0 }), held: () => false, pressed: () => false, clearToggle: vi.fn(), uiOpen: false } as unknown as Input,
    audio: { footstep: vi.fn(), swing: vi.fn(), hit: vi.fn(), hurt: vi.fn(), jump: vi.fn(), land: vi.fn(), dodge: vi.fn() } as unknown as AudioEngine,
    npcs: [], enemies: [], viewYaw: 0, controllable: true,
    onHitEnemy: vi.fn(), onHurt: vi.fn(), onDeath: vi.fn(), onBoundary: vi.fn(),
  };
  return { player, context, stop: () => { moving = false; } };
}

/** Follow a physical walking route through the real controller, never teleport between path nodes. */
function walk(s: ReturnType<typeof setup>, route: readonly V2[], hz: number) {
  let next = 0;
  let length = 0, x = s.player.x, z = s.player.z;
  for (const point of route) {
    length += Math.hypot(point.x - x, point.z - z); x = point.x; z = point.z;
  }
  // Allow the calibrated walk to cover this actual route, including turns and acceleration.
  const maxFrames = Math.ceil(hz * (length / HERO_WALK_SPEED * 1.4 + route.length));
  for (let frame = 0; frame < maxFrames && next < route.length; frame++) {
    const target = route[next]!, dx = target.x - s.player.x, dz = target.z - s.player.z;
    if (Math.hypot(dx, dz) < 0.18) { next++; continue; }
    s.context.viewYaw = Math.atan2(dx, dz);
    (s.context.physics as RealmPhysics).beginCharacter(s.player);
    s.player.update(1 / hz, s.context);
    (s.context.physics as RealmPhysics).step(1 / hz, s.player, s.context.viewYaw, 0);
    expect(s.player.grounded, `route ${next}, frame ${frame}`).toBe(true);
    expect(Math.abs(s.player.y - terrain.supportAt(s.player.x, s.player.z, s.player.y))).toBeLessThan(0.001);
    expect(colliders.blocked(s.player.x, s.player.z, PLAYER_BODY_RADIUS,
      { minY: s.player.y + 0.03, maxY: s.player.y + PLAYER_BODY_HEIGHT, excludePrecise: true })).toBe(false);
  }
  expect(next).toBe(route.length);
}

describe('believable walk to and inside Lantern Point', () => {
  it('grades the entire visible 3.2 m keeper track, keeping a broad dry player strip and no boulders in the route', () => {
    expect(LANTERN_TRAIL_WIDTH).toBe(3.2);
    const weights = new Float32Array(8);
    for (let i = 0; i < LANTERN_ROUTE.length - 1; i++) {
      const a = LANTERN_ROUTE[i]!, b = LANTERN_ROUTE[i + 1]!, length = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length, samples = Math.ceil(length / 0.5);
      for (let step = 0; step <= samples; step++) for (const side of [-0.9, 0, 0.9]) {
        const f = step / samples, x = a.x + (b.x - a.x) * f - dz * side, z = a.z + (b.z - a.z) * f + dx * side;
        expect(terrain.heightAt(x, z)).toBeGreaterThan(0.5);
        expect(terrain.slopeAt(x, z)).toBeLessThan(0.32);
        expect(terrain.walkable(x, z, 0.32)).toBe(true);
        expect(colliders.blocked(x, z, PLAYER_BODY_RADIUS, boundsAt(x, z))).toBe(false);
        groundSplat(terrain, x, z, weights);
        expect(weights[LAYER.path]).toBeGreaterThan(0.85);
      }
    }
  });

  it.each([30, 60])('walks the entire coast track into the tower room without jump at %i Hz', (hz) => {
    const s = setup(LANTERN_ROUTE[0]!);
    const interior = { x: LIGHTHOUSE.x, z: LIGHTHOUSE.z + 0.6 };
    walk(s, [...LANTERN_ROUTE.slice(1), interior], hz);
    s.stop(); for (let i = 0; i < hz; i++) s.player.update(1 / hz, s.context);
    expect(s.player.y).toBeCloseTo(base + L.room.floorTop, 5);
    expect(Math.hypot(s.player.x - interior.x, s.player.z - interior.z)).toBeLessThan(0.5);
    expect(canPlayerStandAt(terrain, colliders, s.player.x, s.player.z, s.player.y)).toBe(true);
    expect(supportedPlayerHeight(terrain, s.player.x, s.player.z, s.player.y)).toBe(s.player.y);
  });

  it('allows entering the keeper house and returning down the graded coast route without falling or jumping', () => {
    const forecourt = LANTERN_ROUTE.at(-1)!;
    const x = LIGHTHOUSE.x + L.house.x + L.house.doorX;
    const s = setup(forecourt);
    const apron = [{ x: LIGHTHOUSE.x, z: LIGHTHOUSE.z + 7.5 }, { x, z: LIGHTHOUSE.z + 7.5 }];
    const inside = { x, z: LIGHTHOUSE.z + 0.5 };
    walk(s, [...apron, inside], 60);
    expect(s.player.y).toBeCloseTo(base + L.house.floorTop, 5);
    expect(canPlayerStandAt(terrain, colliders, s.player.x, s.player.z, s.player.y)).toBe(true);
    walk(s, [...apron.slice().reverse(), forecourt, ...LANTERN_ROUTE.slice(0, -1).reverse()], 60);
    expect(s.player.y).toBeLessThan(1.3);
  });

  it('draws actual open passages, upward-facing interior floors and closed overhead undersides matching standing support', () => {
    const r = new Region('lantern-access', new Ctx());
    authorLighthouse(r, terrain, { lanterns: [] });
    const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
    const g = r.toGroup({ get: () => material }); g.updateMatrixWorld(true);
    for (const room of [
      { x: LIGHTHOUSE.x, z: LIGHTHOUSE.z + 0.6, doorway: LIGHTHOUSE.z + LIGHTHOUSE.r + 0.9, floor: L.room.floorTop, ceiling: L.room.ceilingBottom },
      { x: LIGHTHOUSE.x + L.house.x + L.house.doorX, z: LIGHTHOUSE.z + 0.5, doorway: LIGHTHOUSE.z + L.house.d / 2 + 1, floor: L.house.floorTop, ceiling: L.house.ceilingBottom },
    ]) {
      for (const height of [0.1, 1, 1.9]) {
        const p = new THREE.Vector3(room.x, base + room.floor + height, room.doorway);
        const ray = new THREE.Raycaster(p, new THREE.Vector3(0, 0, -1), 0, room.doorway - room.z);
        expect(ray.intersectObject(g), `portal at ${room.x}, height ${height}`).toHaveLength(0);
      }
      const p = new THREE.Vector3(room.x, base + room.floor + 0.4, room.z);
      const floor = new THREE.Raycaster(p, new THREE.Vector3(0, -1, 0)).intersectObject(g)[0];
      expect(floor).toBeDefined();
      expect(floor!.point.y).toBeCloseTo(terrain.groundAt(room.x, room.z), 5);
      const ceiling = new THREE.Raycaster(p, new THREE.Vector3(0, 1, 0)).intersectObject(g)[0];
      expect(ceiling).toBeDefined();
      expect(ceiling!.point.y).toBeCloseTo(base + room.ceiling, 5);
      const contact = colliders.ceilingAt(room.x, room.z, PLAYER_BODY_RADIUS, base + room.floor + PLAYER_BODY_HEIGHT, base + room.ceiling + 0.5);
      expect(contact).toBeCloseTo(ceiling!.point.y, 5);
    }
    g.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); material.dispose();
  });

  it('retains solid room walls and furniture instead of making the whole lighthouse noncolliding', () => {
    for (const point of [
      { x: LIGHTHOUSE.x, z: LIGHTHOUSE.z - 3 },
      { x: LIGHTHOUSE.x + 3, z: LIGHTHOUSE.z },
      { x: LIGHTHOUSE.x + L.house.x - L.house.w / 2 + 0.1, z: LIGHTHOUSE.z },
      { x: LIGHTHOUSE.x + L.house.x, z: LIGHTHOUSE.z - L.house.d / 2 + 0.1 },
      { x: LIGHTHOUSE.x, z: LIGHTHOUSE.z - 1.75 },
      { x: LIGHTHOUSE.x + L.house.x - 2.05, z: LIGHTHOUSE.z - 1.9 },
    ]) expect(colliders.blocked(point.x, point.z, PLAYER_BODY_RADIUS, boundsAt(point.x, point.z))).toBe(true);
  });
});
