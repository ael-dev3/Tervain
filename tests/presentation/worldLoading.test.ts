import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldScene, type WorldBuildProgress } from '../../src/presentation/world';
import { createInitialState } from '../../src/game/state';
import { defaultSettings } from '../../src/platform/settings';
import { Colliders } from '../../src/world/colliders';
import type { AssetLibrary } from '../../src/presentation/assets/library';
import { disposeSceneResources } from '../../src/presentation/disposeScene';
import { PINE_FILES } from '../../src/presentation/solitaryPine';
import { MESHY_TREE_IDS, MESHY_TREE_LODS } from '../../src/presentation/meshyTrees';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import { WORLD } from '../../src/world/layout';

const controls = vi.hoisted(() => ({
  owners: [] as { name: string; dispose: () => void; group?: unknown }[],
  colliders: null as unknown,
  navigationGate: null as Promise<unknown> | null,
  navVersions: [] as number[],
  groundFailure: null as Error | null,
  modelGate: null as Promise<void> | null,
  modelsStarted: null as (() => void) | null,
  modelCallbacks: {} as Partial<Record<'pine' | 'stone' | 'trees' | 'animals', (loaded: number, total: number) => void>>,
}));

async function modelFamily(family: keyof typeof controls.modelCallbacks, total: number, progress?: (loaded: number, total: number) => void) {
  if (progress) controls.modelCallbacks[family] = progress;
  progress?.(0, total);
  if (Object.keys(controls.modelCallbacks).length === 4) controls.modelsStarted?.();
  if (controls.modelGate) await controls.modelGate;
  progress?.(total, total);
}

function owner(name: string) {
  const group = new THREE.Group(); group.name = name;
  group.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
  const resource = { name, group, update() {}, dispose: vi.fn() };
  controls.owners.push(resource);
  return resource;
}

vi.mock('../../src/presentation/assets/needs', () => ({ ALL_NEEDS: [] }));
vi.mock('../../src/presentation/assets/library', () => ({ setSharedLibrary: vi.fn() }));
vi.mock('../../src/world/terrain', () => ({ Terrain: class {
  static async create(options: { onProgress?: (completed: number, total: number) => void }) {
    const nz = (WORLD.maxZ - WORLD.minZ) / WORLD.cell;
    options.onProgress?.(nz + 1, nz + 1);
    return { heightAt: () => 0, nz };
  }
} }));
vi.mock('../../src/world/colliders', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/world/colliders')>(), buildStaticColliders: () => controls.colliders,
}));
vi.mock('../../src/world/nav', () => ({ NavGrid: class {
  static async create(terrain: { nz: number }, _colliders: unknown, _radius: number, options: { onProgress?: (completed: number, total: number) => void }) {
    if (controls.navigationGate) await controls.navigationGate;
    options.onProgress?.(terrain.nz, terrain.nz);
    controls.navVersions.push((controls.colliders as Colliders).version);
    return { ensureFresh() {}, async forRadiusAsync(_radius: number, wider: { onProgress?: (completed: number, total: number) => void }) {
      wider.onProgress?.(4, terrain.nz); wider.onProgress?.(terrain.nz, terrain.nz);
      controls.navVersions.push((controls.colliders as Colliders).version);
    } };
  }
} }));
vi.mock('../../src/world/physics', () => ({ initializePhysics: async () => {}, RealmPhysics: class {
  dispose = vi.fn(); setWater() {}
  constructor() { controls.owners.push({ name: 'physics', dispose: this.dispose }); }
} }));
vi.mock('../../src/presentation/terrainTextures', () => ({ makeTerrainTextures: async (_size: number, _yieldNow: unknown, options: { onProgress?: (completed: number, total: number) => void }) => {
  const textures = { albedo: new THREE.DataArrayTexture(), normal: new THREE.DataArrayTexture(), size: 256,
    dispose: vi.fn(() => { textures.albedo.dispose(); textures.normal.dispose(); }) };
  controls.owners.push({ name: 'textures', dispose: textures.dispose });
  options.onProgress?.(8, 8);
  return textures;
} }));
vi.mock('../../src/presentation/terrainMesh', () => ({ buildTerrainTilesAsync: async () => {
  if (controls.groundFailure) throw controls.groundFailure;
  return owner('ground tiles').group;
} }));
vi.mock('../../src/presentation/sky', () => ({ SkyRig: class {
  group = new THREE.Group(); fog = new THREE.FogExp2(0xabbccd); dispose = vi.fn();
  constructor() { controls.owners.push({ name: 'sky', dispose: this.dispose }); }
} }));
vi.mock('../../src/presentation/water/waterSystem', () => ({ WaterSystem: class {
  group = new THREE.Group(); world = {}; dispose = vi.fn();
  constructor() { controls.owners.push({ name: 'water', dispose: this.dispose }); }
} }));
vi.mock('../../src/presentation/solitaryPine', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/presentation/solitaryPine')>(), loadSolitaryPine: async (progress?: (loaded: number, total: number) => void) => {
    await modelFamily('pine', PINE_FILES.length, progress); return [];
  },
}));
vi.mock('../../src/presentation/meshyTrees', async importOriginal => ({
  ...await importOriginal<typeof import('../../src/presentation/meshyTrees')>(), loadMeshyTrees: async (_ids: unknown, progress?: (loaded: number, total: number) => void) => {
    await modelFamily('trees', MESHY_TREE_IDS.length, progress); return [];
  },
}));
vi.mock('../../src/presentation/sourceRockPile', () => ({ loadSourceRockPile: async (progress?: (loaded: number, total: number) => void) => {
  await modelFamily('stone', 1, progress); return {};
}, buildSourceRockPiles: () => owner('rocks') }));
vi.mock('../../src/presentation/forestLandmarks', () => ({ buildForestLandmarks: () => ({ ...owner('landmarks'), stats: {} }) }));
vi.mock('../../src/presentation/flora', () => ({ buildFlora: () => ({ ...owner('forest'), initializeFloor() {}, physicalWood: [] }) }));
vi.mock('../../src/presentation/scatter', () => ({ buildScatter: () => owner('scatter') }));
vi.mock('../../src/presentation/ambient', () => ({ buildAmbient: () => owner('ambient') }));
vi.mock('../../src/presentation/groundcover', () => ({ buildGroundcover: () => owner('groundcover') }));
vi.mock('../../src/presentation/wildlife', () => ({ buildWildlife: () => owner('wildlife') }));
vi.mock('../../src/presentation/woodlandAir', () => ({ buildWoodlandAir: () => owner('air') }));
vi.mock('../../src/presentation/coastalBackdrop', () => ({ buildCoastalBackdrop: () => owner('coast') }));
vi.mock('../../src/presentation/environment', () => ({ buildEnvironment: () => owner('environment') }));
vi.mock('../../src/presentation/settlement', () => ({ buildScenery: () => ({ ...owner('scenery'), riteBowl: new THREE.Group() }) }));
vi.mock('../../src/presentation/hunterSupplies', () => ({ buildHunterSupplies: () => owner('hunter supplies').group, disposeHunterSupplies: (group: THREE.Group) => {
  controls.owners.find(resource => resource.group === group)!.dispose();
} }));
vi.mock('../../src/presentation/animalCamp', () => ({ buildAnimalCamp: () => owner('caravan') }));
vi.mock('../../src/presentation/animals', () => ({ loadAnimalTemplates: async (progress?: (loaded: number, total: number) => void) => {
  await modelFamily('animals', ANIMALS.length, progress); return new Map();
}, buildAnimals: () => owner('animals') }));
vi.mock('../../src/presentation/groundContacts', () => ({ createGroundContactField: () => ({}) }));
vi.mock('../../src/presentation/physicalProps', () => ({ buildPhysicalProps: () => owner('physical supplies') }));
vi.mock('../../src/presentation/riteResponse', () => ({ buildRiteResponse: () => owner('rite') }));

function library() { return { preload: vi.fn(async () => {}) } as unknown as AssetLibrary; }
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(yes => { resolve = yes; });
  return { promise, resolve };
}

beforeEach(() => {
  controls.owners = []; controls.navVersions = []; controls.groundFailure = null; controls.navigationGate = null;
  controls.modelGate = null; controls.modelsStarted = null; controls.modelCallbacks = {};
  const colliders = new Colliders();
  for (const id of ['archive_door', 'archive_shutter', 'shortcut_gate']) colliders.circle(id, 0, 0, 1);
  controls.colliders = colliders;
  vi.spyOn(WorldScene.prototype, 'syncStatic').mockImplementation(() => {});
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({
    createRadialGradient: () => ({ addColorStop() {} }), fillStyle: '', fillRect() {},
  }) }) });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('world load and activation boundary', () => {
  it('reports monotonic completed GLB counts across interleaved families, including every tree LOD', async () => {
    const gate = deferred(), started = deferred(); controls.modelGate = gate.promise; controls.modelsStarted = started.resolve;
    const phases: WorldBuildProgress[] = [], legacy = vi.fn();
    const pending = WorldScene.create(createInitialState(), defaultSettings(), library(), legacy, undefined, { yieldNow: async () => {}, onPhase: p => phases.push(p) });
    await started.promise;
    const expectedTotal = PINE_FILES.length + 1 + MESHY_TREE_IDS.length * MESHY_TREE_LODS.length + ANIMALS.length;
    expect(phases.at(-1)).toMatchObject({ phase: 'models', completed: 0, total: expectedTotal });
    controls.modelCallbacks.pine!(2, PINE_FILES.length);
    expect(phases.at(-1)!.completed).toBe(2);
    controls.modelCallbacks.trees!(3, MESHY_TREE_IDS.length);
    expect(phases.at(-1)!.completed).toBe(2 + 3 * MESHY_TREE_LODS.length);
    controls.modelCallbacks.animals!(5, ANIMALS.length);
    controls.modelCallbacks.stone!(1, 1);
    const previous = phases.at(-1)!.completed;
    controls.modelCallbacks.pine!(0, PINE_FILES.length); // An older cached observer cannot move the bar backwards.
    expect(phases.at(-1)!.completed).toBe(previous);
    expect(legacy).toHaveBeenCalledWith({ loaded: 3, total: MESHY_TREE_IDS.length, label: 'Woodland models' });
    gate.resolve();
    const world = await pending;
    try {
      const counts = phases.filter(p => p.phase === 'models');
      expect(counts.at(-1)).toMatchObject({ completed: expectedTotal, total: expectedTotal });
      expect(counts.every((p, i) => i === 0 || p.completed! >= counts[i - 1]!.completed!)).toBe(true);
      const length = phases.length; controls.modelCallbacks.animals!(0, ANIMALS.length);
      expect(phases).toHaveLength(length); // A previous model phase cannot overwrite later construction.
    } finally { disposeSceneResources(world.scene, () => world.dispose()); }
  });

  it('returns only after physical contacts and both navigation widths are ready, with saved gates installed first', async () => {
    const gate = deferred(); controls.navigationGate = gate.promise;
    const state = createInitialState(); state.locationChanges.shortcut = 'open';
    const phases: WorldBuildProgress[] = [], reachedNavigation = deferred();
    let completed = false;
    const pending = WorldScene.create(state, defaultSettings(), library(), undefined, undefined, {
      yieldNow: async () => {}, onPhase: p => { phases.push(p); if (p.phase === 'navigation') reachedNavigation.resolve(); },
    }).then(world => { completed = true; return world; });
    await reachedNavigation.promise;
    expect(completed).toBe(false);
    expect(controls.owners.find(resource => resource.name === 'physics')).toBeDefined();
    expect((controls.colliders as Colliders).all.find(c => c.id === 'shortcut_gate')!.active).toBe(false);
    gate.resolve();
    const world = await pending;
    try {
      expect(controls.navVersions).toEqual([(controls.colliders as Colliders).version, (controls.colliders as Colliders).version]);
      expect(phases.at(-1)).toMatchObject({ phase: 'finishing', completed: 1, total: 1 });
      for (const stage of ['models', 'textures', 'terrain', 'navigation']) {
        const counts = phases.filter(p => p.phase === stage && p.total !== undefined);
        expect(new Set(counts.map(p => p.total)).size).toBe(1);
        expect(counts.every((p, i) => i === 0 || p.completed! >= counts[i - 1]!.completed!)).toBe(true);
        expect(counts.at(-1)!.completed).toBe(counts.at(-1)!.total);
      }
      const largeRoutes = phases.filter(p => p.label === 'Large creature routes');
      expect(largeRoutes[0]!.completed).toBeGreaterThan((WORLD.maxZ - WORLD.minZ) / WORLD.cell);
      const physicsCounts = phases.filter(p => p.phase === 'physics' && p.completed !== undefined);
      expect(physicsCounts).toEqual([{ phase: 'physics', label: 'Physical contacts', completed: 1, total: 1 }]);
      expect(world.physics).toBeDefined(); expect(world.nav).toBeDefined(); expect(world.animals).toBeDefined();
      expect(world.modules.find(module => module.name === 'forest')).toBeDefined();
      expect(WorldScene.prototype.syncStatic).toHaveBeenCalledWith(state, true);
    } finally { disposeSceneResources(world.scene, () => world.dispose()); }
  });

  it('cleans every completed owner and attached geometry when cancellation arrives before activation', async () => {
    const controller = new AbortController(), reason = new DOMException('Replaced build', 'AbortError');
    const geometryDisposal = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    await expect(WorldScene.create(createInitialState(), defaultSettings(), library(), undefined, undefined, {
      yieldNow: async () => {}, signal: controller.signal,
      onPhase: p => { if (p.phase === 'navigation') controller.abort(reason); },
    })).rejects.toBe(reason);
    for (const resource of controls.owners) {
      if (resource.name !== 'ground tiles') expect(resource.dispose).toHaveBeenCalledOnce();
    }
    expect(geometryDisposal).toHaveBeenCalled();
    expect(WorldScene.prototype.syncStatic).not.toHaveBeenCalled();
  });

  it('cleans earlier modules and private textures when a later ground construction stage fails', async () => {
    const failure = new Error('Ground allocation failed'); controls.groundFailure = failure;
    await expect(WorldScene.create(createInitialState(), defaultSettings(), library(), undefined, undefined, { yieldNow: async () => {} })).rejects.toBe(failure);
    expect(controls.owners.some(resource => resource.name === 'physics')).toBe(false);
    for (const resource of controls.owners) expect(resource.dispose).toHaveBeenCalledOnce();
    expect(WorldScene.prototype.syncStatic).not.toHaveBeenCalled();
  });

  it('continues cleanup after one private module hook throws, retaining the original construction failure', async () => {
    const failure = new Error('Loading screen detached'), privateFailure = new Error('Forest private cleanup failed');
    const geometries = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    await expect(WorldScene.create(createInitialState(), defaultSettings(), library(), undefined, undefined, {
      yieldNow: async () => {}, onPhase: p => {
        if (p.phase === 'physics') {
          vi.mocked(controls.owners.find(resource => resource.name === 'forest')!.dispose).mockImplementation(() => { throw privateFailure; });
          throw failure;
        }
      },
    })).rejects.toBe(failure);
    for (const resource of controls.owners) expect(resource.dispose).toHaveBeenCalledOnce();
    expect(geometries).toHaveBeenCalled();
  });

  it('releases the completed scene if final readiness reporting fails, and owned disposal is idempotent on success', async () => {
    const failure = new Error('Loading screen detached');
    await expect(WorldScene.create(createInitialState(), defaultSettings(), library(), undefined, undefined, {
      yieldNow: async () => {}, onPhase: p => { if (p.phase === 'finishing' && p.completed === 1) throw failure; },
    })).rejects.toBe(failure);
    for (const resource of controls.owners) if (resource.name !== 'ground tiles') expect(resource.dispose).toHaveBeenCalledOnce();
    controls.owners = [];
    const world = await WorldScene.create(createInitialState(), defaultSettings(), library(), undefined, undefined, { yieldNow: async () => {} });
    world.dispose(); world.dispose();
    for (const resource of controls.owners) if (resource.name !== 'ground tiles') expect(resource.dispose).toHaveBeenCalledOnce();
    disposeSceneResources(world.scene, () => world.dispose());
  });
});
