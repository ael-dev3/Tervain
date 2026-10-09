import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { NPCS } from '../../src/content/npcs';
import { createInitialState } from '../../src/game/state';
import { EnemyActor, NpcActor } from '../../src/presentation/actors';
import { buildAmbient } from '../../src/presentation/ambient';
import { createStandInRig, type Rig } from '../../src/presentation/characters';
import type { BuildContext, FrameContext } from '../../src/presentation/context';
import type { MeshyNpcCatalog } from '../../src/presentation/meshynpcs';
import { NEAR_ENTRY_METRES, ResidentArrivals, residentRolesNear, type AwaitingFigure } from '../../src/presentation/residentArrivals';
import { defaultSettings } from '../../src/platform/settings';
import { Colliders } from '../../src/world/colliders';
import { ENEMY_SPAWNS } from '../../src/world/layout';
import type { Terrain } from '../../src/world/terrain';

/** A model that has arrived: something to draw. */
function arrivedRig(height = 1.8): Rig {
  const rig = createStandInRig(height);
  rig.root.name = 'resident';
  rig.body.add(new THREE.Mesh(new THREE.BoxGeometry(.4, height, .3), new THREE.MeshBasicMaterial()));
  return rig;
}

const drawable = (rig: Rig) => { let found = false; rig.root.traverse((o) => { found ||= (o as THREE.Mesh).isMesh === true; }); return found; };

describe('residents near the entry point (stage 2)', () => {
  it('fetches only the people within reach of a new journey before the world opens', () => {
    const roles = residentRolesNear(createInitialState('slot-1'));
    // The trail hunter keeps the station a short walk from the landing; everyone else is a long way inland.
    expect(roles).toEqual(['named:trail_hunter']);
    expect(NEAR_ENTRY_METRES).toBe(60);
  });

  it('follows the player: a save at the ford brings its bandits, and a defeated or absent figure never comes first', () => {
    const state = createInitialState('slot-1'), bandit = ENEMY_SPAWNS.find((s) => s.id === 'ford_bandit_a')!;
    state.player.x = bandit.x; state.player.z = bandit.z;
    expect(residentRolesNear(state)).toEqual(expect.arrayContaining(['enemy:ford_bandit_a', 'enemy:ford_bandit_b']));
    state.defeated.ford_bandit_a = true;
    expect(residentRolesNear(state)).not.toContain('enemy:ford_bandit_a');
    const everyone = residentRolesNear(createInitialState('slot-1'), 1e6);
    expect(everyone).toEqual(expect.arrayContaining([...Object.keys(NPCS).map((id) => `named:${id}`), 'ambient:fisher', 'ambient:fireside', 'ambient:keeper']));
    expect(everyone).not.toContain('menu:warden');
    const away = createInitialState('slot-1');
    away.npcs.trail_hunter.available = false;
    expect(residentRolesNear(away)).not.toContain('named:trail_hunter');
  });
});

describe('a resident whose model has not arrived', () => {
  it('stands in with nothing to draw, cannot be met or bumped into, and becomes themselves when the model comes', () => {
    const def = NPCS.trail_hunter, standIn = createStandInRig(1.8);
    expect(drawable(standIn)).toBe(false);
    expect(standIn.height).toBe(1.8);
    const npc = new NpcActor(def, standIn, false), scene = new THREE.Scene();
    scene.add(npc.rig.root);
    npc.x = 3; npc.z = 4; npc.yaw = 1;
    expect(npc.hidden).toBe(true);
    expect(npc.away).toBe(false);
    expect(npc.interactable).toBe(false);
    expect(npc.solid).toBe(false);
    expect(npc.asleep).toBe(false);
    const model = arrivedRig();
    npc.adoptRig(model);
    expect(npc.rig).toBe(model);
    expect(npc.arrived).toBe(true);
    expect(standIn.root.parent).toBeNull();
    expect(model.root.parent).toBe(scene);
    expect(model.root.position.toArray()).toEqual([3, 0, 4]);
    model.root.traverse((o) => expect(o.userData.npc).toBe(def.id));
    expect(npc.interactable).toBe(true);
    expect(npc.solid).toBe(true);
    // Their schedule's own absence still hides them.
    npc.hidden = true;
    expect(npc.interactable).toBe(false);
    expect(npc.away).toBe(true);
  });

  it('keeps a bandit out of every fight until their model comes, then fights as before', () => {
    const spawn = ENEMY_SPAWNS.find((s) => s.id === 'ford_bandit_a')!, standIn = createStandInRig(1.87, 'blade');
    const enemy = new EnemyActor(spawn, standIn, false), scene = new THREE.Scene();
    scene.add(enemy.rig.root);
    expect(enemy.alive).toBe(false);
    expect(enemy.takeHit(20, false, spawn.x + 1, spawn.z)).toBe(false);
    expect(enemy.hp).toBe(55);
    enemy.update(1, {} as never);
    expect(enemy.state).toBe('idle');
    const model = arrivedRig(1.87);
    enemy.adoptRig(model);
    expect(enemy.alive).toBe(true);
    expect(model.root.parent).toBe(scene);
    model.root.traverse((o) => expect(o.userData.enemy).toBe(spawn.id));
    expect(enemy.takeHit(20, false, spawn.x + 1, spawn.z)).toBe(false);
    expect(enemy.hp).toBe(35);
  });
});

describe('arrivals', () => {
  const catalog = (roles: string[]) => ({ has: (role: string) => roles.includes(role) }) as unknown as MeshyNpcCatalog;
  const figure = (role: string, x: number, unseen = false) =>
    ({ role, position: () => ({ x, y: 0, z: 0 }), unseen: () => unseen, adopt: vi.fn<(catalog: MeshyNpcCatalog) => void>() }) satisfies AwaitingFigure;

  it('hands models over only where nobody sees the change, a couple a frame, once the catalog holds them', () => {
    const arrivals = new ResidentArrivals(), seen = figure('named:mill_hand', 0), behind = figure('named:village_baker', 100);
    const indoors = figure('named:rillford_reeve', 0, true), more = figure('named:quarry_hand', 100), later = figure('named:fisher', 100);
    for (const f of [seen, behind, indoors, more, later]) arrivals.add(f);
    const inView = (p: { x: number }) => p.x < 50;
    expect(arrivals.update(null, inView)).toBe(0);
    expect(arrivals.update(catalog(['named:mill_hand', 'named:village_baker', 'named:rillford_reeve', 'named:quarry_hand']), inView)).toBe(2);
    expect(behind.adopt).toHaveBeenCalledOnce();
    expect(indoors.adopt).toHaveBeenCalledOnce();
    expect(seen.adopt).not.toHaveBeenCalled();
    expect(arrivals.update(catalog(['named:mill_hand', 'named:quarry_hand']), inView)).toBe(1);
    expect(more.adopt).toHaveBeenCalledOnce();
    expect(later.adopt).not.toHaveBeenCalled();
    expect(arrivals.count).toBe(2);
    // Looked away: the one in view takes theirs too.
    expect(arrivals.update(catalog(['named:mill_hand']), () => false)).toBe(1);
    expect(seen.adopt).toHaveBeenCalledOnce();
    arrivals.clear();
    expect(arrivals.count).toBe(0);
  });

  it('leaves the hamlet people whose models are on their way unseen and out of the way until they come', () => {
    const colliders = new Colliders(), terrain = { groundAt: () => 2, heightAt: () => -5 } as unknown as Terrain;
    const assets = { has: (role: string) => role === 'ambient:keeper', create: vi.fn((_: string, h: number) => arrivedRig(1.8 * h)),
      standIn: (_: string, h: number) => createStandInRig(1.8 * h) };
    const ambient = buildAmbient({ terrain, colliders, settings: defaultSettings(), npcAssets: assets } as unknown as BuildContext);
    expect(ambient.awaiting.map((f) => f.role)).toEqual(['ambient:fisher', 'ambient:fireside']);
    const frame = { time: 0, nightness: 0, reducedMotion: false, wildlifeActive: true } as FrameContext;
    ambient.update(1 / 60, frame);
    expect(colliders.all.map((c) => c.active)).toEqual([false, false, true]);
    expect(ambient.group.children.filter((o) => o.name === 'stand-in')).toHaveLength(2);
    for (const f of ambient.awaiting) f.adopt(assets as unknown as MeshyNpcCatalog);
    ambient.update(1 / 60, frame);
    expect(colliders.all.every((c) => c.active)).toBe(true);
    expect(ambient.group.children.some((o) => o.name === 'stand-in')).toBe(false);
    expect(ambient.group.children).toHaveLength(3);
  });
});
