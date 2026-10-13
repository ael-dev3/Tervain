import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app';
import { Game } from '../../src/game/game';
import { Player } from '../../src/presentation/player';
import { CameraRig } from '../../src/presentation/cameraRig';

vi.mock('../../src/presentation/characters', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/presentation/characters')>(),
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

function restore(savedY: number, contact: number | null, ground = 2, support = ground, afloat = false) {
  const game = new Game(), player = new Player();
  game.setPlayerTransform(-7, savedY, 45, 0);
  const app = Object.assign(Object.create(App.prototype), {
    game, player, cam: new CameraRig(),
    world: { terrain: { groundAt: () => ground, supportAt: () => support, walkable: () => !afloat },
      colliders: { blocked: () => false },
      water: { world: { sample: () => afloat ? { surface: 6.1, depth: 4.1 } : null } },
      physics: { reset: vi.fn(), restore: vi.fn(), supportAt: () => contact },
      occupiesArchive: () => false },
    syncWorldFromState: vi.fn(), markCheckpoint: vi.fn(),
  });
  app.placePlayerForEntry({ recovered: null });
  return { player, game };
}

describe('restored loose-body contact and current terrain', () => {
  it('does not undo safe placement when a saved crate top is buried by newer terrain', () => {
    const { player, game } = restore(-.01, -.01);
    expect(player.y).toBe(2);
    expect(player.rig.root.position.y).toBe(2);
    expect(game.state.player.y).toBe(2);
  });

  it('still restores a matching crate top above the terrain', () => {
    const { player } = restore(2.6, 2.6);
    expect(player.y).toBe(2.6);
    expect(player.rig.root.position.y).toBe(2.6);
  });

  it.each([null, 4])('ignores an absent or unrelated contact (%s)', contact => {
    expect(restore(2.6, contact).player.y).toBe(2);
  });

  it('does not lower an authored stair surface to an older loose-body contact', () => {
    expect(restore(2.7, 2.7, 2, 3).player.y).toBe(3);
  });

  it('retains a saved swimming height instead of lowering it onto a nearby contact', () => {
    expect(restore(5, 4.95, 2, 2, true).player.y).toBe(5);
  });
});
