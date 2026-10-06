import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { NPCS } from '../../src/content/npcs';
import { createInitialState } from '../../src/game/state';
import { NpcActor, type ActorContext } from '../../src/presentation/actors';
import type { Rig } from '../../src/presentation/characters';
import { Colliders } from '../../src/world/colliders';
import type { NavGrid } from '../../src/world/nav';
import type { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({ poseRig: vi.fn(), applyFlash: vi.fn(), createNpcRig: vi.fn(), createBanditRig: vi.fn(), createThornback: vi.fn() }));

describe('resident contacts with peaceful wildlife', () => {
  it('waits outside a seated pet even on a long frame, retaining its scheduled path and canonical scenery', () => {
    const definition = { ...NPCS.rillford_reeve, schedule: [{ from: 0, to: 24, anchor: 'village_square', activity: 'stand' as const }], overrides: [] };
    const npc = new NpcActor(definition, { root: new THREE.Group(), height: 1.8, materials: [], hitFlash: 0 } as unknown as Rig);
    Reflect.set(npc, 'placed', true); npc.goal = { anchor: 'village_square', activity: 'stand' }; Reflect.set(npc, 'path', [{ x: 0, z: 8 }]);
    const terrain = { groundAt: () => 0, walkable: () => true } as unknown as Terrain, colliders = new Colliders(), findPath = vi.fn();
    colliders.box('wall', 0, 5, 3, 0.03);
    colliders.box('left doorway', -.95, 2.5, .05, 3);
    colliders.box('right doorway', .95, 2.5, .05, 3);
    const ctx: ActorContext = { terrain, colliders, nav: { findPath } as unknown as NavGrid, state: createInitialState(), hour: 12,
      player: { x: 20, y: 0, z: 0 }, reducedMotion: false, onBark: vi.fn(), wildlifeContacts: [
        { id: 'animal:seated-pet', kind: 'box', x: 0, z: 1.6, hw: 0.45, hd: 0.5, yaw: 0, active: true, minY: 0, maxY: 0.6 },
      ] };
    npc.update(2, ctx); expect(npc.z).toBeLessThan(0.751); expect(npc.z).toBeGreaterThan(0.7);
    for (let i = 0; i < 60; i++) npc.update(1 / 60, ctx);
    expect(npc.z).toBeLessThan(0.751); expect(npc.mode).toBe('idle'); expect(findPath).not.toHaveBeenCalled(); expect(colliders.all).toHaveLength(3);
    expect(colliders.resolve(npc.x, npc.z, 0.35, undefined, { minY: 0.02, maxY: 1.8 }, ctx.wildlifeContacts).hit).toBe(false);
    ctx.wildlifeContacts = []; npc.update(1, ctx); expect(npc.z).toBeGreaterThan(1.7);
  });
});
