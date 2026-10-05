import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import { buildStandard } from '../../src/presentation/buildings';
import { Ctx } from '../../src/presentation/buildKit';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import { Region } from '../../src/presentation/regions';
import { buildingEntry, buildingGround } from '../../src/world/buildingEntries';
import { buildStaticColliders } from '../../src/world/colliders';
import { BUILDINGS, HAMLET_PROPS, HANDCART_CONSTRUCTION, VILLAGE_HANDCART, WAGON, WAGON_CONSTRUCTION, type BuildingSpec } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

const terrain = new Terrain();
const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
const world = (b: { x: number; z: number; yaw: number }, x: number, z: number) => ({
  x: b.x + x * Math.cos(b.yaw) + z * Math.sin(b.yaw),
  z: b.z - x * Math.sin(b.yaw) + z * Math.cos(b.yaw),
});

describe('props standing on the authored landscape', () => {
  it('all eight wheel contacts and every drawbar tip meet their local parking terrain', () => {
    for (const [pose, vehicle] of [[WAGON, WAGON_CONSTRUCTION], [HAMLET_PROPS.handcart, HANDCART_CONSTRUCTION], [VILLAGE_HANDCART, HANDCART_CONSTRUCTION]] as const) {
      const base = terrain.heightAt(pose.x, pose.z);
      for (const ax of vehicle.axleXs) for (const side of [-1, 1]) {
        const p = world(pose, ax, side * vehicle.wheelTrack);
        expect(terrain.heightAt(p.x, p.z)).toBeCloseTo(base, 6);
      }
      for (const side of [-1, 1]) {
        const p = world(pose, vehicle.shaftEnd, side * vehicle.shaftZ * 0.78);
        // The shaft's actual tapered end radius is .045; it touches rather than floating or intersecting sand.
        expect(base + vehicle.shaftEndY - 0.045).toBeCloseTo(terrain.heightAt(p.x, p.z), 6);
        for (let f = 0; f < 1; f += 0.1) {
          const point = world(pose, vehicle.shaftStart + f * (vehicle.shaftEnd - vehicle.shaftStart), side * vehicle.shaftZ * (1 - 0.22 * f));
          const bottom = base + vehicle.shaftStartY + f * (vehicle.shaftEndY - vehicle.shaftStartY) - (0.07 - 0.025 * f);
          expect(bottom).toBeGreaterThanOrEqual(terrain.heightAt(point.x, point.z) - 1e-5);
        }
      }
    }
  });

  for (const b of BUILDINGS.filter((b) => b.kind !== 'archive' && b.kind !== 'shrine')) {
    it(`${b.id} renders exactly the exterior entry steps on which the controller stands`, () => {
      const base = buildingGround((x, z) => terrain.heightAt(x, z), b).avg;
      const entry = buildingEntry(b);
      const r = new Region(b.id, new Ctx());
      buildStandard(r, terrain, b, { lanterns: [] });
      const g = r.toGroup({ get: () => material }); g.updateMatrixWorld(true);
      for (const [dz, top] of [[0.42, entry.y + 0.08], [0.96, entry.y * 0.5]]) {
        const p = world(b, entry.x, entry.z + dz!);
        const ray = new THREE.Raycaster(new THREE.Vector3(p.x, base + 0.7, p.z), new THREE.Vector3(0, -1, 0));
        const first = ray.intersectObject(g)[0];
        expect(first).toBeDefined();
        expect(first!.point.y).toBeCloseTo(base + top!, 4);
        expect(terrain.supportAt(p.x, p.z, base + top!)).toBeCloseTo(first!.point.y, 4);
      }
      // Closed shells and roofs do not become accessible floors through a broad support rule.
      expect(terrain.supportAt(b.x, b.z, base + b.h + 4)).toBe(terrain.groundAt(b.x, b.z));
      g.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    });
  }

  it('the real player approaches rotated closed doors, climbs both stone treads and stops outside the wall', () => {
    for (const id of ['house_a', 'house_c', 'keeper_cottage', 'quarry_office']) {
      const b = BUILDINGS.find((b) => b.id === id) as BuildingSpec;
      const entry = buildingEntry(b), base = buildingGround((x, z) => terrain.heightAt(x, z), b).avg;
      const start = world(b, entry.x, entry.z + 1.65);
      const player = new Player(); player.setPosition(start.x, start.z, b.yaw + Math.PI, terrain);
      const ctx: PlayerCtx = {
        terrain, colliders: buildStaticColliders(terrain), settings: defaultSettings(), game: new Game(),
        input: { move: () => ({ x: 0, y: 1 }), held: () => false, pressed: () => false, clearToggle: vi.fn(), uiOpen: false } as unknown as Input,
        audio: { footstep: vi.fn(), swing: vi.fn(), hit: vi.fn(), hurt: vi.fn(), jump: vi.fn(), land: vi.fn(), dodge: vi.fn() } as unknown as AudioEngine,
        npcs: [], enemies: [], viewYaw: b.yaw + Math.PI, controllable: true,
        onHitEnemy: vi.fn(), onHurt: vi.fn(), onDeath: vi.fn(), onBoundary: vi.fn(),
      };
      let highest = player.y;
      for (let i = 0; i < 110; i++) { player.update(1 / 60, ctx); highest = Math.max(highest, player.y); }
      expect(highest, id).toBeCloseTo(base + entry.y + 0.08, 5);
      expect(player.grounded, id).toBe(true);
      expect(ctx.colliders.blocked(player.x, player.z, 0.4, { minY: player.y + 0.03, maxY: player.y + 1.95 }), id).toBe(false);
    }
  });
});
