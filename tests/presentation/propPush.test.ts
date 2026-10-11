import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import { buildStaticColliders } from '../../src/world/colliders';
import { RealmPhysics, initializePhysics, type PropSpec } from '../../src/world/physics';
import { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

let terrain: Terrain;
beforeAll(async () => { await initializePhysics(); terrain = new Terrain(); });

const spot = { x: -14.4, z: -3 };
const crate: PropSpec = { id: 'test_crate', name: 'crate', kind: 'crate', x: spot.x, z: spot.z + 1.2, width: .66, height: .47, depth: .52, yaw: 0, mass: 12 };
const away = { x: 0, y: -100, z: 0 };
const settle = (physics: RealmPhysics, frames = 60) => { for (let i = 0; i < frames; i++) { physics.syncActors([]); physics.step(1 / 60, away, 0, 0); } };

describe('pushing loose cargo only with steps taken (A106)', () => {
  it('asks where the hero can go without shoving what is in the way', () => {
    const physics = new RealmPhysics(terrain, buildStaticColliders(terrain), [crate]);
    settle(physics);
    const before = physics.snapshot()[0]!.position, y = terrain.groundAt(spot.x, spot.z);
    for (let i = 0; i < 60; i++) { physics.move(spot.x, y, spot.z + 0.55, 0, 0.1, true); physics.syncActors([]); physics.step(1 / 60, away, 0, 0); }
    const after = physics.snapshot()[0]!.position;
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.02);
  });

  it('still pushes a crate the hero walks into', () => {
    const physics = new RealmPhysics(terrain, buildStaticColliders(terrain), [crate]);
    settle(physics);
    const before = physics.snapshot()[0]!.position;
    const colliders = buildStaticColliders(terrain);
    const move = { x: 0, y: 1 };
    const ctx: PlayerCtx = {
      terrain, colliders, physics, game: new Game(), settings: defaultSettings(),
      input: { move: () => move, held: () => false, pressed: () => false, clearToggle: () => {} } as unknown as Input,
      audio: { footstep: () => {}, swing: () => {}, hit: () => {}, hurt: () => {}, jump: () => {}, land: () => {}, dodge: () => {} } as unknown as AudioEngine,
      npcs: [], enemies: [], viewYaw: 0, controllable: true,
      onHitEnemy: () => {}, onHurt: () => {}, onDeath: () => {}, onBoundary: () => {},
    };
    const player = new Player();
    player.setPosition(spot.x, spot.z - 0.5, 0, terrain, terrain.groundAt(spot.x, spot.z - 0.5));
    for (let i = 0; i < 120; i++) { physics.beginCharacter(player); player.update(1 / 60, ctx); physics.syncActors([]); physics.step(1 / 60, player, 0, 0); }
    const after = physics.snapshot()[0]!.position;
    // As before the change: leaning on it for two seconds moves it about 0.17 m.
    expect(after.z - before.z).toBeGreaterThan(0.1);
  });
});
