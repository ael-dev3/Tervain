import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { createInitialState } from '../../src/game/state';
import type { WorldState } from '../../src/game/types';
import { NpcActor, npcGoalPosition, resolveGoal, type ActorContext } from '../../src/presentation/actors';
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
import { MAINT_ROUTE } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';
import { berthFor } from '../../src/world/homes';

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

const cases: { name: string; state: () => WorldState }[] = [
  { name: 'original routines', state: createInitialState },
  { name: 'Ila rescued by combat', state: () => { const s = createInitialState(); s.facts.ila_rescued = true; s.facts.ila_method = 'fight'; return s; } },
  { name: 'Ila rescued through maintenance gate', state: () => { const s = createInitialState(); s.facts.ila_rescued = true; s.facts.ila_method = 'shortcut'; return s; } },
  { name: 'emergency Rillford meeting', state: () => { const s = createInitialState(); s.facts.ila_rescued = true; s.quest.phase = 'committed'; s.quest.allocation = 'rillford'; s.facts.emergency_allocation = true; return s; } },
  { name: 'rotation schedules', state: () => { const s = createInitialState(); s.facts.ila_rescued = true; s.quest.phase = 'committed'; s.quest.allocation = 'rotation'; return s; } },
];

describe.each(cases)('authored resident schedule: $name', ({ state: makeState }) => {
  it.each(NPC_LIST)('walks every active $id routine using the real world, without false destination poses or stuck paths', def => {
    const state = makeState();
    colliders.setActive('shortcut_gate', state.facts.ila_method !== 'shortcut');
    const hours = [...new Set([0, ...def.schedule.flatMap(s => [s.from, s.to]), ...(def.overrides ?? []).flatMap(s => [s.from ?? 0, s.to ?? 24])])].filter(h => h < 24).sort((a, b) => a - b);
    const ctx: ActorContext = { terrain, colliders, nav, state, hour: hours[0]!, player: { x: -500, y: 0, z: -500 }, reducedMotion: false, onBark: () => false };
    const height = def.look.height * 1.8;
    const npc = new NpcActor(def, { root: new THREE.Group(), height, materials: [], hitFlash: 0 } as unknown as Rig);
    npc.snapToGoal(ctx);
    for (const hour of [...hours.slice(1), hours[0]!]) {
      // A resting resident with a bed goes to stand before it (A70).
      const expected = resolveGoal(def, state, hour), target = (expected.activity === 'rest' ? berthFor(def.id, terrain, colliders, height)?.stand : null) ?? npcGoalPosition(def, expected, ctx, height);
      const y = terrain.groundAt(target.x, target.z);
      expect(terrain.walkable(target.x, target.z), `${def.id} ${expected.anchor} exact feet`).toBe(true);
      expect(colliders.blocked(target.x, target.z, .35, { minY: y + .02, maxY: y + height }), `${def.id} ${expected.anchor} body overlap`).toBe(false);
      ctx.hour = hour;
      for (let frame = 0; frame < 6000; frame++) {
        const x = npc.x, z = npc.z;
        npc.update(.05, ctx);
        expect(Math.hypot(npc.x - x, npc.z - z), `${def.id} ${expected.anchor} schedule teleport`).toBeLessThanOrEqual(.078);
        const arrived = Math.hypot(npc.x - target.x, npc.z - target.z) <= (expected.activity === 'work' || expected.activity === 'sit' ? .06 : .15);
        if (arrived && (expected.activity !== 'rest' || npc.hidden || npc.lie === 1)) break;
      }
      expect(Math.hypot(npc.x - target.x, npc.z - target.z), `${def.id} ${hour}h ${expected.anchor} stalled at ${npc.x.toFixed(2)}, ${npc.z.toFixed(2)}`).toBeLessThanOrEqual(expected.activity === 'work' || expected.activity === 'sit' ? .06 : .15);
      // Residents with a bed lie in it rather than vanishing at their door (A70).
      expect(npc.hidden || npc.lie === 1, `${def.id} ${hour}h sleeping state`).toBe(expected.activity === 'rest');
    }
  }, 15000);
});

it.each(['fight', 'shortcut'] as const)('walks Ila from the actual trapped ledge after a %s rescue, with swept collisions throughout', method => {
  const state = createInitialState(), def = NPC_LIST.find(d => d.id === 'maintenance_worker')!;
  colliders.setActive('shortcut_gate', method !== 'shortcut');
  const ctx: ActorContext = { terrain, colliders, nav, state, hour: 12, player: { x: -500, y: 0, z: -500 }, reducedMotion: false, onBark: () => false };
  const npc = new NpcActor(def, { root: new THREE.Group(), height: def.look.height * 1.8, materials: [], hitFlash: 0 } as unknown as Rig);
  npc.snapToGoal(ctx);
  state.facts.ila_rescued = true; state.facts.ila_method = method;
  const target = npcGoalPosition(def, resolveGoal(def, state, ctx.hour), ctx, npc.rig.height);
  for (let i = 0; i < 6000 && npc.mode !== 'sit'; i++) {
    const x = npc.x, z = npc.z;
    npc.update(.05, ctx);
    expect(Math.hypot(npc.x - x, npc.z - z)).toBeLessThanOrEqual(.078);
  }
  expect(npc.mode, `${method} stalls at ${npc.x},${npc.z}`).toBe('sit');
  expect(Math.hypot(npc.x - target.x, npc.z - target.z)).toBeLessThan(.06);
});

it('runs the full named cast through shared dawn exits, evening office arrivals and night retirement without overlapping bodies', () => {
  const state = createInitialState(); colliders.setActive('shortcut_gate', true);
  const ctx: ActorContext = { terrain, colliders, nav, state, hour: 0, player: { x: -500, y: 0, z: -500 }, reducedMotion: false, onBark: () => false };
  const cast = NPC_LIST.map(def => {
    const npc = new NpcActor(def, { root: new THREE.Group(), height: def.look.height * 1.8, materials: [], hitFlash: 0 } as unknown as Rig);
    npc.snapToGoal(ctx); return npc;
  });
  for (const hour of [9, 18.5, 23]) {
    ctx.hour = hour;
    let complete = false;
    for (let frame = 0; frame < 6000; frame++) {
      // The same live snapshot/update contract as App: a subsequent resident sees earlier actors' resolved steps.
      const contacts = cast.filter(n => n.solid).map(n => ({ id: `person:${n.id}`, kind: 'circle' as const, x: n.x, z: n.z, r: .35, active: true, minY: n.y + .02, maxY: n.y + n.rig.height }));
      ctx.residentContacts = contacts;
      for (const npc of cast) {
        const x = npc.x, z = npc.z; npc.update(.05, ctx);
        expect(Math.hypot(npc.x - x, npc.z - z), `${npc.id} shared exit jumps`).toBeLessThanOrEqual(.078);
        const contact = contacts.find(c => c.id === `person:${npc.id}`);
        if (contact) Object.assign(contact, { x: npc.x, z: npc.z, minY: npc.y + .02, maxY: npc.y + npc.rig.height, active: npc.solid });
        else if (npc.solid) contacts.push({ id: `person:${npc.id}`, kind: 'circle', x: npc.x, z: npc.z, r: .35, active: true, minY: npc.y + .02, maxY: npc.y + npc.rig.height });
      }
      for (let i = 0; i < cast.length; i++) for (const other of cast.slice(i + 1)) {
        const npc = cast[i]!;
        if (npc.hidden || other.hidden || Math.abs(npc.y - other.y) > 2) continue;
        expect(Math.hypot(npc.x - other.x, npc.z - other.z), `${npc.id}/${other.id} body intersection at ${hour}h`).toBeGreaterThanOrEqual(.699);
      }
      complete = cast.every(n => {
        const goal = resolveGoal(n.def, state, hour), target = (goal.activity === 'rest' ? berthFor(n.id, terrain, colliders, n.rig.height)?.stand : null) ?? npcGoalPosition(n.def, goal, ctx, n.rig.height);
        return goal.activity === 'rest' ? n.hidden || n.lie === 1 : !n.hidden && Math.hypot(n.x - target.x, n.z - target.z) <= (goal.activity === 'work' || goal.activity === 'sit' ? .06 : .15);
      });
      if (complete) break;
    }
    expect(complete, `cast stalls at ${hour}h: ${cast.filter(n => !n.hidden).map(n => `${n.id} ${n.mode} (${n.x.toFixed(2)},${n.z.toFixed(2)})`).join('; ')}`).toBe(true);
  }
}, 20000);

it('keeps Ila’s completed maintenance-track progress when a visitor blocks her exit and navigation refreshes', () => {
  const state = createInitialState(), def = NPC_LIST.find(d => d.id === 'maintenance_worker')!;
  colliders.setActive('shortcut_gate', false);
  const ctx: ActorContext = { terrain, colliders, nav, state, hour: 12, player: { x: -500, y: 0, z: -500 }, reducedMotion: false, onBark: () => false };
  const npc = new NpcActor(def, { root: new THREE.Group(), height: def.look.height * 1.8, materials: [], hitFlash: 0 } as unknown as Rig);
  npc.snapToGoal(ctx); state.facts.ila_rescued = true; state.facts.ila_method = 'shortcut';
  for (let i = 0; i < 160; i++) npc.update(.05, ctx);
  const start = { x: npc.x, z: npc.z }, path = Reflect.get(npc, 'path') as { x: number; z: number }[], index = Reflect.get(npc, 'pi') as number;
  const next = path[index]!, distance = Math.hypot(next.x - npc.x, next.z - npc.z);
  const visitor = { id: 'person:quarry_hand', kind: 'circle' as const, x: npc.x + (next.x - npc.x) / distance * 1.1,
    z: npc.z + (next.z - npc.z) / distance * 1.1, r: .35, active: true,
    minY: npc.y + .02, maxY: npc.y + 1.8 };
  ctx.residentContacts = [visitor]; colliders.version++;
  for (let i = 0; i < 240; i++) {
    npc.update(.05, ctx);
    expect(npc.z, 'walks back toward the ledge when retrying the maintenance route').toBeGreaterThanOrEqual(start.z - .05);
    expect(Math.hypot(npc.x - visitor.x, npc.z - visitor.z)).toBeGreaterThanOrEqual(.699);
    const remaining = (Reflect.get(npc, 'path') as { x: number; z: number }[] | null)?.slice(Reflect.get(npc, 'pi') as number) ?? [];
    expect(remaining, 'reintroduces an already completed ledge waypoint').not.toContainEqual(MAINT_ROUTE[0]);
  }
  ctx.residentContacts = [];
  for (let i = 0; i < 6000 && npc.mode !== 'sit'; i++) npc.update(.05, ctx);
  expect(npc.mode).toBe('sit');
});
