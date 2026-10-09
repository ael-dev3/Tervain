import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import { buildStaticColliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { RealmPhysics, initializePhysics } from '../../src/world/physics';
import { FURNITURE, pieceSize } from '../../src/world/furniture';
import { fromBuildingLocal, toBuildingLocal, roomHalfSize } from '../../src/world/interiors';
import { canPlayerStandAt } from '../../src/world/playerPlacement';

vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

let terrain: Terrain;
beforeAll(async () => { await initializePhysics(); terrain = new Terrain(); });

describe('jump onto furniture', () => {
  it('never lands a sprint jump outside the room', () => {
    const colliders = buildStaticColliders(terrain);
    const physics = new RealmPhysics(terrain, colliders);
    const hz = 60, dt = 1 / hz;
    const report: string[] = [];
    let trials = 0;
    for (const placement of FURNITURE) {
      const [, height] = pieceSize(placement.piece);
      if (height > 0.82) continue;
      const room = placement.room, b = room.building;
      const { hw, hd } = roomHalfSize(room);
      const centre = fromBuildingLocal(b, placement.x, placement.z);
      for (let a = 0; a < 16; a++) {
        const ang = a * Math.PI / 8, ux = Math.sin(ang), uz = Math.cos(ang);
        let start: { x: number; z: number } | null = null;
        for (let back = 1.1; back < 2.4; back += 0.1) {
          const p = { x: centre.x - ux * back, z: centre.z - uz * back };
          const l = toBuildingLocal(b, p.x, p.z);
          if (Math.abs(l.x) > hw - 0.45 || Math.abs(l.z) > hd - 0.45) continue;
          if (canPlayerStandAt(terrain, colliders, p.x, p.z)) { start = p; break; }
        }
        if (!start) continue;
        trials++;
        const move = { x: 0, y: 1 };
        const held = new Set<string>(['sprint']); const presses = new Set<string>();
        const ctx: PlayerCtx = {
          terrain, colliders, physics, game: new Game(), settings: defaultSettings(),
          input: { move: () => move, held: (k: string) => held.has(k), pressed: (k: string) => presses.has(k), clearToggle: () => {} } as unknown as Input,
          audio: { footstep: () => {}, swing: () => {}, hit: () => {}, hurt: () => {}, jump: () => {}, land: () => {}, dodge: () => {} } as unknown as AudioEngine,
          npcs: [], enemies: [], viewYaw: ang, controllable: true,
          onHitEnemy: () => {}, onHurt: () => {}, onDeath: () => {}, onBoundary: () => {},
        };
        const player = new Player();
        physics.reset();
        player.setPosition(start.x, start.z, ang, terrain, terrain.groundAt(start.x, start.z));
        const step = () => { physics.beginCharacter(player); player.update(dt, ctx); presses.clear(); physics.syncActors([]); physics.step(dt, player, ang, 0.3); };
        let jumped = false, worst = 0, where = '';
        for (let f = 0; f < hz * 2.5; f++) {
          const l = toBuildingLocal(b, player.x, player.z);
          if (!jumped && player.grounded && Math.hypot(player.x - centre.x, player.z - centre.z) < 1.15) { presses.add('jump'); jumped = true; }
          const before = { x: player.x, z: player.z };
          step();
          const jumpDist = Math.hypot(player.x - before.x, player.z - before.z);
          const after = toBuildingLocal(b, player.x, player.z);
          const outside = Math.abs(after.x) > b.w / 2 || Math.abs(after.z) > b.d / 2 + 0.2;
          const wasInside = Math.abs(l.x) < b.w / 2 && Math.abs(l.z) < b.d / 2;
          if (outside && wasInside && jumpDist > worst && !(Math.abs(after.x - room.door.x) < room.door.halfWidth && after.z > 0)) {
            worst = jumpDist; where = `frame ${f}: (${before.x.toFixed(2)},${before.z.toFixed(2)}) -> (${player.x.toFixed(2)},${player.z.toFixed(2)}) y=${player.y.toFixed(2)}`;
          }
        }
        if (worst > 0) report.push(`${b.id} ${placement.piece} approach ${(ang * 180 / Math.PI).toFixed(0)} deg: crossed the wall in one frame (${worst.toFixed(2)} m) ${where}`);
      }
    }
    physics.dispose();
    expect(report, 'a jump onto low furniture never carries the hero through a wall (A70)').toEqual([]);
    expect(trials).toBeGreaterThan(0);
  }, 1800000);
});
