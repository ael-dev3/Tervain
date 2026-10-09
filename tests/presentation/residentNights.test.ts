import * as THREE from 'three';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { createInitialState } from '../../src/game/state';
import type { WorldState } from '../../src/game/types';
import { NpcActor, resolveGoal, type ActorContext } from '../../src/presentation/actors';
import type { Rig } from '../../src/presentation/characters';
import { buildAmbient } from '../../src/presentation/ambient';
import type { BuildContext } from '../../src/presentation/context';
import { forestLandmarkGeometry } from '../../src/presentation/forestLandmarks';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { buildHunterSupplies, disposeHunterSupplies } from '../../src/presentation/hunterSupplies';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { buildScenery, type SceneryHandles } from '../../src/presentation/settlement';
import { Exclusions } from '../../src/presentation/vegetation';
import { buildStaticColliders, type Colliders } from '../../src/world/colliders';
import { NavGrid } from '../../src/world/nav';
import { Terrain } from '../../src/world/terrain';
import { berthFor, RESIDENT_HOMES } from '../../src/world/homes';

vi.mock('../../src/presentation/characters', () => ({ poseRig: vi.fn(), applyFlash: vi.fn(), createNpcRig: vi.fn(), createBanditRig: vi.fn(), createThornback: vi.fn(),
  createAmbientRig: () => ({ root: new THREE.Group(), height: 1.8, hipY: .95 }) }));
vi.mock('../../src/presentation/regions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/presentation/regions')>();
  class MaterialSet {
    readonly windowMat = new THREE.MeshBasicMaterial(); readonly lanternMat = new THREE.MeshBasicMaterial();
    readonly daylightMat = new THREE.MeshBasicMaterial();
    private readonly materials = new Map<string, THREE.Material>([['pane', this.windowMat], ['glow', this.lanternMat], ['daylight', this.daylightMat]]);
    get(key: string) { if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial()); return this.materials.get(key)!; }
    dispose() { for (const material of this.materials.values()) material.dispose(); }
  }
  return { ...actual, MaterialSet };
});

let terrain: Terrain, colliders: Colliders, nav: NavGrid, scenery: SceneryHandles, station: THREE.Group;
beforeAll(() => {
  vi.stubGlobal('document', { createElement: () => {
    const canvas = { width: 0, height: 0, getContext: () => context };
    const context = new Proxy<Record<string, unknown>>({ canvas, measureText: (text: string) => ({ width: text.length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => target[String(key)] ?? (() => {}) });
    return canvas;
  } });
  terrain = new Terrain(); colliders = buildStaticColliders(terrain);
  scenery = buildScenery(terrain, colliders, 'low'); station = buildHunterSupplies(terrain, colliders);
  forestLandmarkGeometry(terrain, colliders);
  const exclusion = new Exclusions(terrain), flora = createFloraPopulation(terrain, exclusion);
  registerFloraColliders(flora, colliders); registerScatterColliders(createScatterPopulation(terrain, exclusion, flora), colliders);
  buildAmbient({ terrain, colliders } as BuildContext).dispose?.();
  nav = new NavGrid(terrain, colliders);
}, 20000);
afterAll(() => { scenery?.dispose(); if (station) disposeHunterSupplies(station); vi.unstubAllGlobals(); });

function cast(state: WorldState, hour: number) {
  const ctx: ActorContext = { terrain, colliders, nav, state, hour, player: { x: -500, y: 0, z: -500 }, reducedMotion: false, onBark: () => false };
  const people = NPC_LIST.map(def => {
    const npc = new NpcActor(def, { root: new THREE.Group(), height: def.look.height * 1.8, materials: [], hitFlash: 0 } as unknown as Rig);
    npc.snapToGoal(ctx); return npc;
  });
  const run = (seconds: number, until?: () => boolean) => {
    for (let frame = 0; frame < seconds * 20; frame++) {
      const contacts = people.filter(n => n.solid).map(n => ({ id: `person:${n.id}`, kind: 'circle' as const, x: n.x, z: n.z, r: .35, active: true, minY: n.y + .02, maxY: n.y + n.rig.height }));
      ctx.residentContacts = contacts;
      for (const npc of people) {
        const x = npc.x, z = npc.z; npc.update(.05, ctx);
        expect(Math.hypot(npc.x - x, npc.z - z), `${npc.id} jumps at ${ctx.hour}h`).toBeLessThanOrEqual(.078);
      }
      if (until?.()) return true;
    }
    return false;
  };
  return { ctx, people, run };
}

const resting = (n: NpcActor, state: WorldState, hour: number) => resolveGoal(n.def, state, hour).activity === 'rest';

it('walks every resident with a home in through their door to bed at night, and out again by morning (A70)', () => {
  const state = createInitialState(); colliders.setActive('shortcut_gate', true);
  const { ctx, people, run } = cast(state, 18.9);
  for (const hour of [19, 20, 21, 22, 23, 0, 1]) {
    ctx.hour = hour;
    run(400, () => people.every(n => !resting(n, state, hour) || n.lie === 1));
  }
  const sleepers = people.filter(n => resting(n, state, 1));
  expect(sleepers.length).toBeGreaterThanOrEqual(9);
  for (const n of people) expect(n.hidden, `${n.id} hidden at 01:00`).toBe(false);
  for (const n of sleepers) {
    expect(RESIDENT_HOMES[n.id], `${n.id} has a home`).toBeDefined();
    const berth = berthFor(n.id, terrain, colliders, n.rig.height)!;
    expect(berth, `${n.id} berth`).not.toBeNull();
    expect(n.lie, `${n.id} lying at 01:00 (${n.x.toFixed(2)}, ${n.z.toFixed(2)})`).toBe(1);
    expect(n.asleep && !n.solid).toBe(true);
    if (berth.room) expect(terrain.rooms.at(n.x, n.z), `${n.id} inside their home`).toBe(berth.room);
  }
  for (const hour of [5, 6, 7, 8, 9]) { ctx.hour = hour; run(400, () => people.every(n => n.lie === 0 && !Reflect.get(n, 'path'))); }
  for (const n of people) {
    expect(n.hidden || n.lie > 0, `${n.id} still abed at 09:00`).toBe(false);
    const goal = resolveGoal(n.def, state, 9), room = terrain.rooms.at(n.x, n.z);
    if (goal.activity !== 'rest' && !goal.inside) expect(room?.building.id, `${n.id} left indoors at 09:00 (${n.x.toFixed(2)}, ${n.z.toFixed(2)})`).toBeUndefined();
  }
}, 120000);

it('loads at night with a resident lying in bed, and gets them up and out without a jump (A70)', () => {
  const state = createInitialState();
  const { ctx, people, run } = cast(state, 1);
  const reeve = people.find(n => n.id === 'rillford_reeve')!;
  expect(reeve.hidden).toBe(false);
  expect(reeve.lie).toBe(1);
  expect(terrain.rooms.at(reeve.x, reeve.z)?.building.id).toBe('reeve_house');
  ctx.hour = 8;
  const x = reeve.x, z = reeve.z;
  run(1);
  // Sitting up first, still on the bed.
  expect(reeve.lie).toBeGreaterThan(0);
  expect(reeve.lie).toBeLessThan(1);
  expect(Math.hypot(reeve.x - x, reeve.z - z)).toBe(0);
  expect(reeve.mode).toBe('sit');
  run(120, () => terrain.rooms.at(reeve.x, reeve.z) === null);
  expect(terrain.rooms.at(reeve.x, reeve.z)).toBeNull();
}, 60000);

it('sits up to talk when spoken to in bed, and lies down again after (A70)', () => {
  const state = createInitialState();
  const { people, run } = cast(state, 1);
  const baker = people.find(n => n.id === 'village_baker')!;
  expect(baker.asleep).toBe(true);
  baker.talking = true; baker.speaking = true;
  run(3);
  expect(baker.lie).toBe(0);
  expect(baker.asleep).toBe(false);
  expect(baker.interactable).toBe(true);
  baker.talking = false; baker.speaking = false;
  run(5);
  expect(baker.lie).toBe(1);
}, 60000);

it('sits up awake while a fight goes on nearby, and lies down again once it is over (A70)', () => {
  const state = createInitialState();
  const { ctx, people, run } = cast(state, 1);
  const baker = people.find(n => n.id === 'village_baker')!;
  expect(baker.asleep).toBe(true);
  ctx.alarm = { x: baker.x + 12, z: baker.z };
  run(3);
  expect(baker.lie).toBe(0);
  expect(baker.asleep).toBe(false);
  ctx.alarm = null;
  run(5);
  expect(baker.lie).toBe(1);
}, 60000);

it.each([
  ['village_baker', 4.5, 6, 9, 'bakery'],
  ['mill_hand', 6.5, 8, 11, 'mill'],
  ['estate_steward', 7.5, 9, 13, 'quarry_office'],
  ['rillford_reeve', 5.5, 7, 9, 'reeve_house'],
] as const)('%s walks in to work at a furnished spot indoors by day, and out again after (A70)', (id, before, during, after, building) => {
  const state = createInitialState();
  const { ctx, people, run } = cast(state, before);
  const npc = people.find(n => n.id === id)!;
  ctx.hour = during;
  expect(run(300, () => npc.mode === 'work'), `${id} never works (${npc.x.toFixed(2)}, ${npc.z.toFixed(2)}) ${npc.mode}`).toBe(true);
  expect(terrain.rooms.at(npc.x, npc.z)?.building.id).toBe(building);
  ctx.hour = after;
  expect(run(300, () => terrain.rooms.at(npc.x, npc.z) === null && npc.mode !== 'walk')).toBe(true);
}, 60000);
