import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { Exclusions } from '../../src/presentation/vegetation';
import { ARRIVAL_ROUTE } from '../../src/world/layout';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import { groundedRockY, rockContactGeometry, rockShapes, rockTransform, type RockTransform } from '../../src/presentation/rockGeometry';
import { Colliders } from '../../src/world/colliders';
import { initializePhysics, RealmPhysics } from '../../src/world/physics';
import { canPlayerStandAt, supportedPlayerHeight } from '../../src/world/playerPlacement';
import { rockTriangleSupport, ROCK_STEP_HEIGHT } from '../../src/world/rockContacts';
import { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));
beforeAll(() => initializePhysics());
const X = -200;
const original: RockTransform = { x: X, y: 0, z: 0, size: 1.2, shape: 4, yaw: .15, rx: .06, rz: -.04, squash: 1, zScale: 1.1 };
function setup(variation: Partial<RockTransform> = {}) {
  const terrain = new Terrain(); terrain.heights.fill(0); terrain.carve.fill(0);
  terrain.walkable = () => true;
  const rock = { ...original, ...variation };
  rock.y = groundedRockY(rock, () => 0, rock.size * .06);
  const mesh = rockContactGeometry(rock, 'rock:source'), colliders = new Colliders();
  terrain.registerRockSurfaces([mesh]); colliders.registerRockMesh(mesh);
  colliders.circle(mesh.id, X, 0, rock.size * .72, true, { minY: mesh.bounds.minY, maxY: mesh.bounds.maxY, rockMesh: mesh });
  const physics = new RealmPhysics(terrain, colliders, []);
  let movement = 0;
  const presses = new Set<string>();
  const input = { move: () => ({ x: 0, y: movement }), held: () => false, pressed: (a: string) => presses.has(a),
    clearToggle: vi.fn(), uiOpen: false } as unknown as Input;
  const ctx: PlayerCtx = { terrain, colliders, physics, input, settings: defaultSettings(), game: new Game(),
    audio: { footstep: vi.fn(), swing: vi.fn(), hit: vi.fn(), hurt: vi.fn() } as unknown as AudioEngine,
    enemies: [], npcs: [], viewYaw: 0, controllable: true, onHitEnemy: vi.fn(), onHurt: vi.fn(), onDeath: vi.fn(), onBoundary: vi.fn() };
  const player = new Player(); player.setPosition(X, -2, 0, terrain);
  const tick = (dt: number) => { physics.beginCharacter(player); player.update(dt, ctx); presses.clear(); physics.step(dt, player, 0, 0); };
  return { rock, mesh, terrain, colliders, physics, player, presses, tick, setMove: (v: number) => movement = v };
}

describe('source-exact grounded rock contacts', () => {
  it('uses every transformed render position, including the real tilted/scaled base, without mutating shared shapes', () => {
    const rock = { ...original, size: 2, squash: 1.2, rx: .14, rz: -.13, yaw: 1.1 };
    const slope = (x: number, z: number) => .36 * (x - X) + .22 * z;
    rock.y = groundedRockY(rock, slope, .12);
    const mesh = rockContactGeometry(rock, 'test'), source = rockShapes().big[rock.shape]!.getAttribute('position');
    const matrix = rockTransform(rock), point = new THREE.Vector3();
    let lowest = Infinity, highest = -Infinity;
    for (let i = 0; i < source.count; i++) {
      point.fromBufferAttribute(source, i).applyMatrix4(matrix);
      expect(mesh.positions[i * 3]).toBeCloseTo(point.x, 4);
      expect(mesh.positions[i * 3 + 1]).toBeCloseTo(point.y, 5);
      expect(mesh.positions[i * 3 + 2]).toBeCloseTo(point.z, 5);
      lowest = Math.min(lowest, point.y); highest = Math.max(highest, point.y);
    }
    let embedded = 0;
    for (let i = 0; i < source.count; i++) {
      point.fromBufferAttribute(source, i).applyMatrix4(matrix);
      if (point.y <= lowest + (highest - lowest) * .12 + 1e-6) {
        expect(point.y).toBeLessThan(slope(point.x, point.z) - .119); embedded++;
      }
    }
    expect(embedded).toBeGreaterThan(10);
    expect(mesh.indices.length).toBe(source.count);
    for (const geometry of [...rockShapes().big, ...rockShapes().small]) {
      const uv = geometry.getAttribute('uv');
      expect(uv.count).toBe(geometry.getAttribute('position').count);
      expect(new Set(Array.from(uv.array)).size).toBeGreaterThan(10);
    }
    expect(mesh.bounds.maxY - mesh.bounds.minY).toBeGreaterThan(1);
  });

  it('measures finite curved-foot support on slopes and edges rather than an enclosing rock bounding box', () => {
    const a = { x: -2, y: 0, z: -2 }, b = { x: 2, y: 2, z: -2 }, c = { x: -2, y: 0, z: 2 };
    expect(rockTriangleSupport(-1, -1, a, c, b)).toBeCloseTo(.5 + .4 * (Math.sqrt(1.25) - 1), 6);
    expect(rockTriangleSupport(5, 0, a, c, b)).toBeNull();
    expect(rockTriangleSupport(0, 0, a, b, c)).toBeNull(); // underside is not a foothold
  });

  it.each([30, 60, 120])('walks a modest real boulder and keeps capsule/visible root on source footholds at %i Hz', hz => {
    const s = setup({ size: .45 });
    try {
      s.setMove(1);
      let highest = 0, overRock = 0;
      for (let i = 0; i < hz * 3; i++) {
        s.tick(1 / hz); highest = Math.max(highest, s.player.y);
        if (s.player.y > .1 && s.player.grounded) {
          overRock++;
          expect(Math.abs(s.player.y - s.physics.supportAt(s.player.x, s.player.z, s.player.y)!)).toBeLessThan(.003);
          expect(Math.abs(s.player.y - s.terrain.rockSupportAt(s.player.x, s.player.z, s.player.y)!)).toBeLessThan(.003);
          expect(s.player.surface).toBe('stone');
        }
      }
      expect(highest).toBeGreaterThan(.2); expect(highest).toBeLessThan(.48);
      expect(overRock).toBeGreaterThan(5); expect(s.player.z).toBeGreaterThan(1);
      expect(s.player.rig.root.position.y).toBe(s.player.y);
      expect(s.player.y).toBe(0);
    } finally { s.physics.dispose(); }
  });

  it.each([30, 60, 120])('jumps onto the larger source crown, lands and restores the same saved standing pose at %i Hz', hz => {
    const s = setup();
    try {
      s.player.setPosition(X, -1.55, 0, s.terrain);
      s.setMove(1); s.presses.add('jump');
      let landed = false, highest = 0;
      for (let i = 0; i < hz * 2; i++) {
        if (s.player.z > -.05) s.setMove(0);
        s.tick(1 / hz); highest = Math.max(highest, s.player.y);
        if (s.player.grounded && s.player.y > .3) landed = true;
      }
      expect(highest).toBeGreaterThan(.8); expect(landed).toBe(true);
      expect(s.player.grounded).toBe(true); expect(s.player.y).toBeGreaterThan(.3);
      const { x, y, z } = s.player;
      expect(Math.abs(y - s.physics.supportAt(x, z, y)!)).toBeLessThan(.003);
      expect(supportedPlayerHeight(s.terrain, x, z, y)).toBeCloseTo(y, 3);
      expect(canPlayerStandAt(s.terrain, s.colliders, x, z, y)).toBe(true);
      expect(s.player.rig.root.position.y).toBe(y);
    } finally { s.physics.dispose(); }
  });

  it('rejects restoring a supported low-rock pose through an adjacent sheer face', () => {
    const s = setup({ size: .45 });
    try {
      const height = s.terrain.rockSupportAt(X, 0, 2)!;
      expect(canPlayerStandAt(s.terrain, s.colliders, X, 0, height)).toBe(true);
      const adjacent = { ...original, x: X + .65, size: 2.5, squash: 3 };
      adjacent.y = groundedRockY(adjacent, () => 0, .12);
      const face = rockContactGeometry(adjacent, 'rock:adjacent');
      s.terrain.registerRockSurfaces([s.mesh, face]);
      expect(s.terrain.rockClearAt(X, height, 0)).toBe(false);
      expect(canPlayerStandAt(s.terrain, s.colliders, X, 0, height)).toBe(false);
    } finally { s.physics.dispose(); }
  });

  it('retains a clear saved ground pose inside the conservative navigation footprint and checks overhead autostep clearance', () => {
    const s = setup({ size: .45 });
    try {
      s.colliders.circle('rock:broad-footprint', X, 0, 3, true, { minY: s.mesh.bounds.minY, maxY: s.mesh.bounds.maxY, rockMesh: s.mesh });
      expect(s.colliders.blocked(X + 1.5, 0, .4, { minY: .03, maxY: 1.95 })).toBe(true);
      expect(canPlayerStandAt(s.terrain, s.colliders, X + 1.5, 0, 0)).toBe(true);
      s.colliders.box('overhead-standing-plank', X, 0, 2, 2, 0, true, { minY: 2.05, maxY: 2.15, supportOnly: true });
      s.setMove(1);
      let highest = 0;
      for (let i = 0; i < 180; i++) { s.tick(1 / 60); highest = Math.max(highest, s.player.y); }
      expect(highest + 1.95).toBeLessThanOrEqual(2.05 + 1e-5);
    } finally { s.physics.dispose(); }
  });

  it('lands loose cargo on the real fractured crown, away from the old cylinder top', () => {
    const s = setup({ size: 2, rx: 0, rz: 0, yaw: 0 });
    const cargo = new RealmPhysics(s.terrain, s.colliders, [{ id: 'rock-crate', kind: 'crate', name: 'Small crate',
      x: X, z: 0, width: .22, height: .22, depth: .22, yaw: 0, mass: 8 }]);
    try {
      const body = cargo.props[0]!.body;
      body.setTranslation({ x: X, y: s.mesh.bounds.maxY + 2, z: 0 }, true);
      for (let i = 0; i < 240; i++) {
        const player = { x: X + 5, y: 0, z: 5 };
        cargo.beginCharacter(player); cargo.step(1 / 60, player, 0, 0);
      }
      expect(body.translation().y).toBeGreaterThan(.8);
      expect(Math.hypot(body.linvel().x, body.linvel().y, body.linvel().z)).toBeLessThan(.04);
      // Bottom corners contact actual triangles: the old cylinder would instead stop them four metres above ground.
      let smallestGap = Infinity;
      const q = new THREE.Quaternion(body.rotation().x, body.rotation().y, body.rotation().z, body.rotation().w);
      for (const x of [-.11, .11]) for (const z of [-.11, .11]) {
        const corner = new THREE.Vector3(x, -.11, z).applyQuaternion(q).add(new THREE.Vector3(body.translation().x, body.translation().y, body.translation().z));
        const hit = cargo.world.castRay(new RAPIER.Ray({ x: corner.x, y: corner.y + 2, z: corner.z }, { x: 0, y: -1, z: 0 }), 8, true,
          undefined, undefined, cargo.props[0]!.collider);
        expect(hit).not.toBeNull();
        const gap = hit!.timeOfImpact - 2;
        expect(gap).toBeGreaterThan(-.025); smallestGap = Math.min(smallestGap, Math.abs(gap));
      }
      expect(smallestGap).toBeLessThan(.025);
    } finally { cargo.dispose(); s.physics.dispose(); }
  });

  it('keeps the actual arrival road capsule sweep clear through the new finite medium and large rock surfaces', () => {
    const terrain = new Terrain(), colliders = new Colliders();
    const population = createScatterPopulation(terrain, new Exclusions(terrain));
    registerScatterColliders(population, colliders);
    terrain.registerRockSurfaces(population.flatMap(rock => rock.contact ? [rock.contact] : []));
    const physics = new RealmPhysics(terrain, colliders, []);
    try {
      for (let segment = 0; segment < ARRIVAL_ROUTE.length - 1; segment++) {
        const from = ARRIVAL_ROUTE[segment]!, to = ARRIVAL_ROUTE[segment + 1]!;
        const count = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .25);
        for (let step = 0; step < count; step++) {
          const f = step / count, g = (step + 1) / count;
          const x = from.x + (to.x - from.x) * f, z = from.z + (to.z - from.z) * f;
          const dx = (to.x - from.x) * (g - f), dz = (to.z - from.z) * (g - f);
          const y = terrain.groundAt(x, z), move = physics.move(x, y, z, dx, dz, true);
          expect(move.x, `route ${segment}, sample ${step}`).toBeCloseTo(x + dx, 4);
          expect(move.z, `route ${segment}, sample ${step}`).toBeCloseTo(z + dz, 4);
        }
      }
    } finally { physics.dispose(); }
  });

  it('does not make a sheer tall rock an automatic giant step or teleport below/above its real surfaces', () => {
    const s = setup({ size: 3, squash: 3 });
    s.player.setPosition(X, -5, 0, s.terrain);
    try {
      expect(ROCK_STEP_HEIGHT).toBe(.48);
      expect(s.physics.supportAt(X, 0, 0)).toBeNull();
      s.setMove(1);
      for (let i = 0; i < 180; i++) s.tick(1 / 60);
      expect(s.player.z).toBeLessThan(-1);
      expect(s.player.y).toBeLessThan(.5);
      const highRay = s.physics.world.castRay(new RAPIER.Ray({ x: X, y: s.mesh.bounds.maxY + 1, z: -10 }, { x: 0, y: 0, z: 1 }), 20, true);
      expect(highRay).toBeNull();
      expect(canPlayerStandAt(s.terrain, s.colliders, X, 0, 0)).toBe(false);
    } finally { s.physics.dispose(); }
  });
});
