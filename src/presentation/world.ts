import { loadBakedTextures } from './bakedTextures';
import { buildFurniture, deferredFurniture, loadFurniture, type FurnitureTemplates } from './furniture';
import { InteriorLight } from './interiorLight';
import { WindowView } from './windowView';
import type { InteriorSpec } from '../world/interiors';
import { DoorSwings, type DoorEvent } from './doors';
import * as THREE from 'three';
import { buildHunterSupplies, disposeHunterSupplies } from './hunterSupplies';
import { buildAnimalCamp } from './animalCamp';
import { NPCS } from '../content/npcs';
import { S } from '../content/strings';
import { hasFact } from '../game/state';
import type { WorldState } from '../game/types';
import { worldView, type WorldView } from '../game/worldView';
import { buildStaticColliders, type Colliders } from '../world/colliders';
import { ARCHIVE_ROOM, BELL, bySpec, MILL_WHEEL, SHORTCUT, SLUICE, STREAMS, WORLD } from '../world/layout';
import { NavGrid } from '../world/nav';
import { Terrain, distToPolyline } from '../world/terrain';
import { SkyRig } from './sky';
import { buildTerrainTilesAsync } from './terrainMesh';
import { makeTerrainTextures, TERRAIN_TEXTURE_SIZE, type TerrainTextures } from './terrainTextures';
import { buildScenery, type SceneryHandles } from './settlement';
import { buildFlora } from './flora';
import { buildScatter } from './scatter';
import { buildAmbient } from './ambient';
import { buildGroundcover, type Groundcover } from './groundcover';
import type { GrassMover } from './grass/trample';
import { buildWildlife } from './wildlife';
import { buildEnvironment, type EnvironmentHandle } from './environment';
import { Exclusions, type SwayUniforms } from './vegetation';
import { ALL_NEEDS } from './assets/needs';
import type { AssetLibrary, LoadProgress } from './assets/library';
import { setSharedLibrary } from './assets/library';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { WaterSystem } from './water/waterSystem';
import { SkyCapture } from './water/skyCapture';
import type { WaterRenderInputs } from './waterRenderPass';
import type { Settings } from '../platform/settings';
import { buildRiteResponse, type RiteResponse } from './riteResponse';
import { buildForestLandmarks } from './forestLandmarks';
import { buildWoodlandAir } from './woodlandAir';
import { setPickupVisible } from './worldPickups';
import { loadSolitaryPine, PINE_FILES, type PineTemplates } from './solitaryPine';
import { LanternLightPool } from './lanternLights';
import { RealmPhysics, initializePhysics } from '../world/physics';
import { buildPhysicalProps } from './physicalProps';
import type { MeshyNpcCatalog } from './meshynpcs';
import { buildSourceRockPiles, loadSourceRockPile } from './sourceRockPile';
import { loadMeshyTrees, MESHY_TREE_IDS, MESHY_TREE_LODS, type MeshyTreeTemplates } from './meshyTrees';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildCoastalBackdrop } from './coastalBackdrop';
import { createGroundContactField } from './groundContacts';
import { buildAnimals, deferredWildlife, loadAnimalTemplates, type AnimalTemplates, type AnimalWildlife } from './animals';
import { ANIMALS } from './animals/catalog';
import { checkCancelled, yieldToBrowser, type CooperativeOptions } from '../platform/cooperative';
import { disposeSceneResources } from './disposeScene';
import { GrassWind } from './grass/wind';
import { REALM_WIND } from './realmWind';
import { FOLIAGE_MAX_MOVERS, createFoliageField, type FoliageField } from './foliage/foliageWind';
import { installShadowOnlyGroup } from './foliage/shadowCasters';

export interface WorldBuildProgress {
  phase: 'models' | 'textures' | 'terrain' | 'woodland' | 'settlement' | 'physics' | 'navigation' | 'finishing';
  label: string;
  completed?: number;
  total?: number;
}

export interface WorldCreateOptions extends CooperativeOptions {
  onPhase?: (progress: WorldBuildProgress) => void;
  /** Open the world before the animals' models arrive; they move in afterwards (A70). */
  deferWildlife?: boolean;
  /** Open the world before the rooms' furniture models arrive; the rooms are furnished afterwards (backlog 4). */
  deferFurniture?: boolean;
}

type WorldModules = { name: string; module: SceneModule }[];
type DustParticle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number };
interface WorldResources {
  /** Lets in what arrives after the world opens (A72). */
  letIn: () => void;
  scene: THREE.Scene;
  terrain: Terrain;
  colliders: Colliders;
  sky: SkyRig;
  water: WaterSystem;
  sway: SwayUniforms;
  modules: WorldModules;
  environment: EnvironmentHandle;
  scenery: SceneryHandles;
  animals: AnimalWildlife;
  terrainMesh: THREE.Group;
  physics: RealmPhysics;
  nav: NavGrid;
  lanternLights: THREE.PointLight[];
  dust: THREE.Points;
  dustData: DustParticle[];
  riteResponse: RiteResponse;
  /** The realm's one wind, and what moves through the foliage. */
  foliage: FoliageField;
  buildMs: number;
  disposeOwned(): void;
}

/** Everything static in Bellwether Vale, plus the presentation that follows durable state. */
export class WorldScene {
  readonly scene: THREE.Scene;
  readonly terrain: Terrain;
  readonly colliders: Colliders;
  readonly nav: NavGrid;
  readonly physics: RealmPhysics;
  readonly sky: SkyRig;
  readonly water: WaterSystem;
  readonly sway: SwayUniforms;
  readonly library: AssetLibrary;
  /** Forest, ground cover, wildlife: updated every frame with the shared frame context. */
  readonly modules: WorldModules;
  private environment: EnvironmentHandle;
  /** The realm's wind and the bodies moving through the foliage (shared by grass and trees). */
  readonly foliage: FoliageField;
  /** The grass (ground cover module): its wind, and the field everything moving through it writes into. */
  private readonly groundcover: Groundcover | null;
  /** Residents and enemies walking through the grass this frame (from the app); animals and cargo are added here. */
  private grassPeople: readonly GrassMover[] = [];
  private readonly grassLast = new Map<string, { x: number; z: number }>();
  readonly scenery: SceneryHandles;
  readonly animals: AnimalWildlife;
  readonly terrainMesh: THREE.Group;
  private lanternLights: THREE.PointLight[];
  private lanternPool = new LanternLightPool(3);
  private wheelSpin = 0;
  private bellSwing = 0;
  private bellTimer = 0;
  private gateOpen = 0;
  private leverT = 0;
  private doorT = 0;
  private shutterT = 0;
  private braceT = 0;
  private wheelTurn = 0;
  private lastNoticeKey = '';
  private dust: THREE.Points;
  private dustData: DustParticle[];
  private riteResponse: RiteResponse;
  private disposeOwned: () => void;
  time = 0;
  /** Set by the app each frame: true while the player is standing inside the archive. */
  playerInArchive = false;
  view: WorldView;
  buildStats: { ms: number } = { ms: 0 };

  /** Load, construct and activate in separate phases. No partial scene escapes this promise. */
  static async create(state: WorldState, settings: Settings, library: AssetLibrary, onProgress?: (p: LoadProgress) => void, npcAssets?: MeshyNpcCatalog, options: WorldCreateOptions = {}): Promise<WorldScene> {
    const yieldNow = options.yieldNow ?? yieldToBrowser;
    const phase = (stage: WorldBuildProgress['phase'], label: string, completed?: number, total?: number) => {
      checkCancelled(options.signal);
      options.onPhase?.({ phase: stage, label, completed, total });
    };
    const checkpoint = async (stage: WorldBuildProgress['phase'], label: string, completed?: number, total?: number) => {
      phase(stage, label, completed, total);
      await yieldNow();
      checkCancelled(options.signal);
    };
    const libraryModels = new Set<string>();
    for (const need of ALL_NEEDS) {
      const lod = library.resolveLod(need.id, need.lod);
      if (lod) libraryModels.add(`${need.id}:${lod}`);
    }
    // Count actual GLBs: each woodland tree needs all of its LOD files before its group is ready.
    const modelFamilies = {
      library: { completed: 0, total: libraryModels.size },
      pine: { completed: 0, total: PINE_FILES.length },
      stone: { completed: 0, total: 1 },
      trees: { completed: 0, total: new Set(MESHY_TREE_IDS).size * MESHY_TREE_LODS.length },
      animals: { completed: 0, total: options.deferWildlife ? 0 : ANIMALS.length },
      furniture: { completed: 0, total: options.deferFurniture ? 0 : 1 },
    };
    const modelTotal = Object.values(modelFamilies).reduce((sum, family) => sum + family.total, 0);
    let modelProgressActive = true;
    const modelProgress = (family: keyof typeof modelFamilies, completed: number, total: number, label: string, scale = 1) => {
      if (!modelProgressActive) return;
      const current = modelFamilies[family];
      current.completed = Math.max(current.completed, Math.min(current.total, completed * scale));
      phase('models', label, Object.values(modelFamilies).reduce((sum, entry) => sum + entry.completed, 0), modelTotal);
      onProgress?.({ loaded: completed, total, label });
    };
    await checkpoint('models', 'World models', 0, modelTotal);
    // The baked building surfaces download alongside the models; any that fail keep their generated textures.
    const surfaces = loadBakedTextures(settings.quality);
    setSharedLibrary(library);
    let pine: PineTemplates, rockPile: GLTF, treeTemplates: MeshyTreeTemplates, animalTemplates: AnimalTemplates | null, furniture: FurnitureTemplates | null;
    try {
      await library.preload(ALL_NEEDS, progress => modelProgress('library', progress.loaded, progress.total, progress.label));
      [pine, rockPile, treeTemplates, animalTemplates, furniture] = await Promise.all([
        loadSolitaryPine((loaded, total) => modelProgress('pine', loaded, total, 'Coastal pines')),
        loadSourceRockPile((loaded, total) => modelProgress('stone', loaded, total, 'Woodland stone')),
        loadMeshyTrees(undefined, (loaded, total) => modelProgress('trees', loaded, total, 'Woodland models', MESHY_TREE_LODS.length)),
        options.deferWildlife ? Promise.resolve(null) : loadAnimalTemplates((loaded, total) => modelProgress('animals', loaded, total, 'Wildlife models')),
        options.deferFurniture ? Promise.resolve(null) : loadFurniture((loaded, total) => modelProgress('furniture', loaded, total, 'Furniture')),
      ]);
    } finally { modelProgressActive = false; }
    await checkpoint('models', 'World models', modelTotal, modelTotal);
    await initializePhysics();
    await checkpoint('textures', 'Ground materials', 0, 8);
    const tex = await makeTerrainTextures(TERRAIN_TEXTURE_SIZE[settings.quality], yieldNow, {
      signal: options.signal,
      onProgress: (completed, total) => phase('textures', 'Ground materials', completed, total),
    });
    await checkpoint('textures', 'Weathered surfaces', 8, 8);
    await surfaces;
    return await WorldScene.build(state, settings, library, tex, pine, rockPile, treeTemplates, animalTemplates, furniture, npcAssets, options, phase, checkpoint);
  }

  /** Release GPU resources the scene graph does not own. */
  dispose() {
    this.windowView.dispose();
    this.disposeOwned();
  }

  /** Renderer work before the world is drawn: what the windows of the room the camera is in look out on (A70). */
  prepareInterior(renderer: THREE.WebGLRenderer, camera: THREE.Camera, dt: number, settings: Settings) {
    this.windowView.update(renderer, this.scene, camera.position, dt, settings.quality !== 'low');
  }

  private static async build(state: WorldState, settings: Settings, library: AssetLibrary, terrainTex: TerrainTextures, pine: PineTemplates, rockPile: GLTF,
    treeTemplates: MeshyTreeTemplates, animalTemplates: AnimalTemplates | null, furniture: FurnitureTemplates | null, npcAssets: MeshyNpcCatalog | undefined, options: WorldCreateOptions,
    phase: (stage: WorldBuildProgress['phase'], label: string, completed?: number, total?: number) => void,
    checkpoint: (stage: WorldBuildProgress['phase'], label: string, completed?: number, total?: number) => Promise<void>): Promise<WorldScene> {
    const t0 = performance.now();
    const scene = new THREE.Scene(), modules: WorldModules = [];
    const owned: (() => void)[] = [() => terrainTex.dispose()];
    let disposed = false;
    const own = <T extends { dispose?(): void }>(resource: T): T => {
      if (resource.dispose) owned.push(() => resource.dispose!());
      return resource;
    };
    const addModule = <T extends SceneModule>(name: string, module: T): T => {
      own(module);
      modules.push({ name, module });
      scene.add(module.group);
      return module;
    };
    const disposeOwned = () => {
      if (disposed) return;
      disposed = true;
      // A failing private hook must not prevent the remaining scene/resource cleanup or mask the build error.
      for (let i = owned.length - 1; i >= 0; i--) { try { owned[i]!(); } catch { /* Continue releasing independent owners. */ } }
    };
    try {
      const groundRows = (WORLD.maxZ - WORLD.minZ) / WORLD.cell + 1, groundTotal = groundRows + 3;
      await checkpoint('terrain', 'Physical ground', 0, groundTotal);
      const terrain = await Terrain.create({ ...options, onProgress: completed => phase('terrain', 'Physical ground', completed, groundTotal) });
      const colliders = buildStaticColliders(terrain);
      await checkpoint('terrain', 'Ground contacts', groundRows + 1, groundTotal);
      const sky = own(new SkyRig(settings.quality === 'low' ? 1024 : settings.quality === 'medium' ? 2048 : 4096));
      scene.add(sky.group);
      scene.fog = sky.fog;
      // The sky dome and stars are also drawn into the water's own small sky capture, for reflected clouds.
      SkyCapture.include(sky.group);
      await checkpoint('terrain', 'Sky and water', groundRows + 2, groundTotal);
      const water = own(new WaterSystem(terrain, settings.quality));
      scene.add(water.group);
      await checkpoint('terrain', 'Physical ground ready', groundTotal, groundTotal);
      const sway: SwayUniforms = { uTime: { value: 0 }, uWind: { value: 1 } };
      // One wind for the realm: the grass and the trees answer the same gusts as they cross the land.
      const foliage = createFoliageField(own(new GrassWind(REALM_WIND)));
      const ctx: BuildContext = { terrain, colliders, library, quality: settings.quality, settings, sway, excl: new Exclusions(terrain), npcAssets, foliage };
      await checkpoint('woodland', 'Woodland landmarks');
      const landmarks = own(buildForestLandmarks(terrain, colliders, settings.quality));
      addModule('woodland landmarks', { group: landmarks.group, update() {}, stats: () => landmarks.stats });
      await checkpoint('woodland', 'Trees and forest floor');
      const forest = addModule('forest', buildFlora(ctx, pine, true, treeTemplates));
      // Tree shadows come from shadow-only casters that the colour pass never draws.
      const casters = forest.shadowCasters as THREE.Group | undefined;
      if (casters) own({ dispose: installShadowOnlyGroup(scene, sky.sun, casters) });
      await checkpoint('woodland', 'Forest floor');
      forest.initializeFloor();
      await checkpoint('woodland', 'Fallen branches and shore');
      addModule('scatter', buildScatter(ctx));
      await checkpoint('woodland', 'Woodland stone');
      addModule('source rock piles', buildSourceRockPiles(ctx, rockPile));
      // The residents' footprints precede grass placement, as in the original construction order.
      await checkpoint('woodland', 'Hamlet neighbours');
      addModule('ambient', buildAmbient(ctx));
      await checkpoint('woodland', 'Grass and undergrowth');
      addModule('groundcover', buildGroundcover(ctx));
      await checkpoint('woodland', 'Woodland atmosphere');
      addModule('wildlife', buildWildlife(ctx));
      addModule('woodland air', buildWoodlandAir(ctx, sky.fog));
      addModule('coastal promontory', buildCoastalBackdrop(terrainTex));
      // Retain the original module update/draw ordering while still attaching each allocation immediately for cleanup.
      const woodlandOrder = ['forest', 'scatter', 'source rock piles', 'groundcover', 'wildlife', 'ambient', 'woodland air', 'coastal promontory', 'woodland landmarks'];
      modules.sort((a, b) => woodlandOrder.indexOf(a.name) - woodlandOrder.indexOf(b.name));
      for (const module of modules) scene.add(module.module.group);
      await checkpoint('woodland', 'Woodland', 1, 1);
      await checkpoint('settlement', 'Buildings and supplies');
      const environment = own(buildEnvironment(scene, settings.quality));
      const scenery = own(buildScenery(terrain, colliders, settings.quality));
      scene.add(scenery.group);
      // A room's furniture shows only while someone can see into it (A66): see WorldScene.roomOpen.
      let roomOpen: (room: InteriorSpec) => boolean = () => true;
      // What arrives after the world opens is asked for only once it has opened, so it never competes with what the
      // first view needs (A72); WorldScene.open() lets it in.
      let letIn!: () => void;
      const opened = new Promise<void>((resolve) => { letIn = resolve; });
      // Deferred, the rooms stand empty until the pieces are here; their colliders come from the placements either way.
      const furnishing = furniture ? null : deferredFurniture();
      addModule('furniture', furnishing ?? buildFurniture(furniture!, terrain.rooms, (room) => roomOpen(room)));
      if (furnishing) {
        void opened.then(() => loadFurniture()).then(
          (templates) => furnishing.attach(buildFurniture(templates, terrain.rooms, (room) => roomOpen(room))),
          (error) => console.warn('[furniture] the furniture could not be loaded; the rooms stay bare', error));
      }
      await checkpoint('settlement', 'Hunter supplies and caravan');
      const hunterSupplies = buildHunterSupplies(terrain, colliders);
      addModule('hunter supplies', { group: hunterSupplies, update() {}, dispose: () => disposeHunterSupplies(hunterSupplies) });
      addModule('caravan animal rest', buildAnimalCamp(terrain, colliders));
      await checkpoint('settlement', 'Wildlife');
      // Deferred, the world opens with a stand-in and the animals move in once their models are here (A70).
      const arriving = animalTemplates ? null : deferredWildlife();
      const animals: AnimalWildlife = addModule('land wildlife', arriving ?? buildAnimals(ctx, animalTemplates!));
      if (arriving) {
        void opened.then(() => loadAnimalTemplates()).then(
          (templates) => arriving.attach(buildAnimals(ctx, templates)),
          (error) => console.warn('[wildlife] the animals could not be loaded; the world goes on without them', error));
      }
      await checkpoint('settlement', 'Buildings, supplies and wildlife', 1, 1);
      // Register accepted source rocks and constructed thresholds before painting their ground contacts.
      // This field changes surface dressing only; support, obstacle identities and terrain planes are unchanged.
      const contacts = createGroundContactField(terrain, colliders.rockMeshes);
      await checkpoint('physics', 'Preparing terrain surface');
      const terrainMesh = await buildTerrainTilesAsync(terrain, terrainTex, ctx.plantedCrowns, undefined, contacts, {
        ...options, onProgress: progress => phase('physics', progress.phase === 'surface' ? 'Preparing terrain surface' : 'Ground tiles'),
      });
      scene.add(terrainMesh);
      await checkpoint('physics', 'Physical contacts');
      // Initialize saved collision state before physics and navigation, avoiding a duplicate first-frame rebuild.
      const view = worldView(state);
      colliders.setActive('archive_door', view.archiveDoor === 'locked');
      colliders.setActive('archive_shutter', view.archiveShutter !== 'forced');
      colliders.setActive('shortcut_gate', !view.shortcutOpen);
      const physics = own(new RealmPhysics(terrain, colliders, undefined, forest.physicalWood));
      // Loose barrels and crates float on the same water that is drawn and heard.
      physics.setWater(water.world);
      addModule('physical supplies', buildPhysicalProps(physics, settings.quality));
      await checkpoint('physics', 'Physical contacts', 1, 1);
      const navigationTotal = terrain.nz * 2;
      await checkpoint('navigation', 'Walking routes', 0, navigationTotal);
      const nav = await NavGrid.create(terrain, colliders, .55, {
        ...options, onProgress: completed => phase('navigation', 'Walking routes', completed, navigationTotal),
      });
      // Build the Thornback's wider lanes during loading, rather than on its first pursuit frame.
      await nav.forRadiusAsync(.85, { ...options, onProgress: completed => phase('navigation', 'Large creature routes', terrain.nz + completed, navigationTotal) });
      await checkpoint('navigation', 'Walking routes', navigationTotal, navigationTotal);
      await checkpoint('finishing', 'Preparing the scene');

      // A few real lights near the player make lanterns matter at night without a per-lantern cost.
      const lanternLights: THREE.PointLight[] = [];
      for (let i = 0; i < 3; i++) {
        const l = new THREE.PointLight(0xffb060, 0, 16, 1.6);
        lanternLights.push(l);
        scene.add(l);
      }

      // Quarry dust.
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(90 * 3), 3));
      const puff = document.createElement('canvas');
      puff.width = puff.height = 32;
      const pctx = puff.getContext('2d')!;
      const grad = pctx.createRadialGradient(16, 16, 1, 16, 16, 15);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      pctx.fillStyle = grad;
      pctx.fillRect(0, 0, 32, 32);
      const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xd9d0b5, size: 1.1, map: new THREE.CanvasTexture(puff), transparent: true, opacity: 0.55, depthWrite: false }));
      dust.frustumCulled = false;
      scene.add(dust);
      const dustData: DustParticle[] = [];
      for (let i = 0; i < 90; i++) dustData.push({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0 });

      const riteResponse = own(buildRiteResponse(scenery.riteBowl));
      checkCancelled(options.signal);
      const world = new WorldScene(state, library, {
        scene, terrain, colliders, sky, water, sway, modules, environment, scenery, animals, terrainMesh,
        physics, nav, lanternLights, dust, dustData, riteResponse, foliage, buildMs: performance.now() - t0, disposeOwned, letIn,
      });
      roomOpen = (room) => world.roomOpen(room);
      phase('finishing', 'Scene ready', 1, 1);
      return world;
    } catch (error) {
      disposeSceneResources(scene, disposeOwned);
      throw error;
    }
  }

  private constructor(state: WorldState, library: AssetLibrary, resources: WorldResources) {
    this.library = library;
    this.scene = resources.scene;
    this.terrain = resources.terrain;
    this.colliders = resources.colliders;
    this.sky = resources.sky;
    this.water = resources.water;
    this.sway = resources.sway;
    this.modules = resources.modules;
    this.groundcover = (resources.modules.find((m) => m.name === 'groundcover')?.module as Groundcover | undefined) ?? null;
    this.environment = resources.environment;
    this.scenery = resources.scenery;
    this.animals = resources.animals;
    this.terrainMesh = resources.terrainMesh;
    this.physics = resources.physics;
    this.nav = resources.nav;
    this.lanternLights = resources.lanternLights;
    this.dust = resources.dust;
    this.dustData = resources.dustData;
    this.riteResponse = resources.riteResponse;
    this.foliage = resources.foliage;
    this.disposeOwned = resources.disposeOwned;
    this.letIn = resources.letIn;
    this.interiorLight = new InteriorLight(this.terrain.rooms);
    this.windowView = new WindowView(this.terrain.rooms, this.scenery.daylightMat);
    this.doorSwings = new DoorSwings(this.scenery.doors ?? []);
    this.scene.add(this.interiorLight.light);
    this.skyFill = this.scene.environmentIntensity;
    this.view = worldView(state);
    this.syncStatic(state, true);
    this.buildStats.ms = resources.buildMs;
  }

  /** Apply durable state that is not animated: doors, pickups, brace, gate, boards. Instant when `snap`. */
  syncStatic(state: WorldState, snap = false) {
    this.animals.syncHunting(state.hunting);
    this.view = worldView(state);
    const v = this.view;
    const sc = this.scenery;
    // Colliders that follow state.
    // Never close the room around someone who is inside it; the app resyncs when they step out.
    const occupied = this.playerInArchive;
    this.colliders.setActive('archive_door', v.archiveDoor === 'locked' && !occupied);
    this.colliders.setActive('archive_shutter', v.archiveShutter !== 'forced' && !occupied);
    this.colliders.setActive('shortcut_gate', !v.shortcutOpen);
    // Visual targets.
    this.doorT = v.archiveDoor === 'open' ? 1 : 0;
    this.shutterT = v.archiveShutter === 'forced' ? 1 : 0;
    this.gateOpen = v.shortcutOpen ? 1 : 0;
    this.leverT = v.shortcutOpen ? 1 : 0;
    this.braceT = v.gate === 'stabilized' ? 1 : 0;
    sc.sluiceCracks.visible = v.gate !== 'stabilized';
    sc.scheduleBoard.visible = v.scheduleBoard;
    sc.contractGuardPost.visible = v.contractGuard;
    sc.quarryBanner.visible = true;
    for (const [id, obj] of Object.entries(sc.pickups)) setPickupVisible(obj, state.locationChanges[`pickup:${id}`] !== 'taken');
    const key = v.noticeboard.join('|');
    if (key !== this.lastNoticeKey) {
      this.lastNoticeKey = key;
      sc.noticeCanvasSetter(S('board.title'), v.noticeboard.map((k) => S(k)));
    }
    if (snap) {
      sc.archiveDoor.rotation.y = this.scenery.archiveDoor.rotation.y;
      this.applyDynamic(1, true);
    }
    this.nav.ensureFresh();
  }

  /** Where the bell rings from, for spatial audio. */
  get bellPosition() {
    return this.scenery.bellPos;
  }

  ringBell() {
    this.bellSwing = 1;
  }

  playRite() {
    this.riteResponse.play();
  }

  emitDust(dt: number, intensity: number) {
    if (intensity <= 0) return;
    for (const p of this.dustData) {
      if (p.life <= 0 && Math.random() < dt * 3 * intensity) {
        const src = this.scenery.dustEmitters[Math.floor(Math.random() * this.scenery.dustEmitters.length)]!;
        p.x = src.x + (Math.random() - 0.5) * 2;
        p.y = src.y + Math.random() * 0.6;
        p.z = src.z + (Math.random() - 0.5) * 2;
        p.vx = (Math.random() - 0.5) * 0.6 - 0.3;
        p.vy = 0.5 + Math.random() * 0.5;
        p.vz = (Math.random() - 0.5) * 0.6;
        p.life = 1.6 + Math.random();
      }
    }
  }

  /** Everything moving through the grass: the app's people, every visible animal and any loose cargo that is moving. */
  private grassMovers(dt: number): GrassMover[] {
    const movers: GrassMover[] = [...this.grassPeople];
    const step = Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
    const seen = new Set<string>();
    for (const a of this.animals.physicalActors) {
      if (!a.active) continue;
      seen.add(a.id);
      const last = this.grassLast.get(a.id);
      const vx = last ? (a.x - last.x) / step : 0, vz = last ? (a.z - last.z) / step : 0;
      // A jump (a respawn or a restored save) is not a walk.
      const walking = Math.hypot(vx, vz) < 20;
      this.grassLast.set(a.id, { x: a.x, z: a.z });
      // Heavier animals lay grass down; a cat only parts it.
      movers.push({ x: a.x, z: a.z, radius: Math.max(0.35, a.radius * 1.25), weight: Math.min(1, 0.35 + a.radius * 0.9), vx: walking ? vx : 0, vz: walking ? vz : 0 });
    }
    for (const id of this.grassLast.keys()) if (!seen.has(id)) this.grassLast.delete(id);
    for (const p of this.physics.motions()) {
      if (Math.hypot(p.vx, p.vz) < 0.05 && !p.held) {
        // Cargo at rest presses down what it stands on.
        movers.push({ x: p.x, z: p.z, radius: p.kind === 'barrel' ? 0.42 : 0.45, weight: 0.85 });
      } else movers.push({ x: p.x, z: p.z, radius: 0.45, weight: 0.9, vx: p.vx, vz: p.vz });
    }
    return movers;
  }

  /** Residents and enemies in the grass this frame (the app knows where they are). */
  setGrassMovers(people: readonly GrassMover[]) {
    this.grassPeople = people;
  }

  /** Renderer work the ground cover needs before the frame is drawn (the grass interaction field). */
  prepareGrass(renderer: THREE.WebGLRenderer, dt: number) {
    this.groundcover?.prepare(renderer, dt);
  }

  /** The wind the grass and the trees show, for anything else that should move with it. */
  get grassWind() {
    return this.foliage.wind;
  }

  /** Respond to the canonical tree ID retained by a finite wood contact at (x, y, z). */
  strikeTree(x: number, y: number, z: number, strength = 1, treeId?: string): boolean {
    const forest = this.modules.find((m) => m.name === 'forest')?.module as { strike?(x: number, y: number, z: number, s?: number, treeId?: string): boolean } | undefined;
    return forest?.strike?.(x, y, z, strength, treeId) ?? false;
  }

  /** The hero and the nearest bodies moving through low foliage, as spheres the leaves are pushed out of. */
  private setFoliageMovers(focus: THREE.Vector3, movers: readonly GrassMover[]) {
    const near = [{ x: focus.x, z: focus.z, radius: 0.75, centre: 1.0 },
      ...movers.map((m) => ({ x: m.x, z: m.z, radius: m.radius * 1.4, centre: Math.max(0.5, m.radius * 1.2) }))]
      .map((m) => ({ ...m, d: Math.hypot(m.x - focus.x, m.z - focus.z) }))
      .filter((m) => m.d < 40 && [m.x, m.z, m.radius].every(Number.isFinite))
      .sort((a, b) => a.d - b.d)
      .slice(0, FOLIAGE_MAX_MOVERS);
    const slots = this.foliage.movers.value;
    near.forEach((m, i) => slots[i]!.set(m.x, this.terrain.heightAt(m.x, m.z) + m.centre, m.z, m.radius));
    this.foliage.moverCount.value = near.length;
  }

  waterRenderInputs(settings: Settings): WaterRenderInputs {
    return this.water.renderInputs(settings.quality !== 'low' && !settings.reduceEffects, settings.reducedMotion);
  }

  /** Nearest distance to any watercourse, for the ambience bed. */
  waterProximity(x: number, z: number): number {
    let d = Infinity;
    for (const s of STREAMS) d = Math.min(d, distToPolyline(x, z, s.points).d);
    return Math.max(0, 1 - d / 26);
  }

  private applyDynamic(dt: number, snap = false) {
    const sc = this.scenery;
    const k = snap ? 1 : 1 - Math.exp(-dt * 2.4);
    const lerpTo = (cur: number, target: number) => cur + (target - cur) * k;
    // Archive door swings open; shutter swings outward; gate leaf lifts; lever throws.
    sc.archiveDoor.rotation.y = this.scenery.archiveDoor.rotation.y;
    const doorTarget = this.doorT * -1.75;
    const shutterTarget = this.shutterT * 1.2;
    const dParent = sc.archiveDoor;
    dParent.userData.open = lerpTo((dParent.userData.open as number) ?? 0, doorTarget);
    const base = (dParent.userData.baseYaw as number | undefined) ?? dParent.rotation.y;
    dParent.userData.baseYaw = base;
    dParent.rotation.y = base + (dParent.userData.open as number);
    const sParent = sc.archiveShutter;
    sParent.userData.open = lerpTo((sParent.userData.open as number) ?? 0, shutterTarget);
    sParent.rotation.x = -(sParent.userData.open as number);
    const g = sc.shortcutGate;
    g.userData.open = lerpTo((g.userData.open as number) ?? 0, this.gateOpen * 1.55);
    const gBase = (g.userData.baseYaw as number | undefined) ?? SHORTCUT.gate.yaw;
    g.userData.baseYaw = gBase;
    g.rotation.y = gBase + (g.userData.open as number);
    sc.shortcutLever.rotation.z = lerpTo(sc.shortcutLever.rotation.z, this.leverT ? 0.7 : -0.7);
    // Sluice: the leaf hangs low and askew when damaged/jammed, sits square once braced.
    const gate = this.view.gate;
    const tilt = gate === 'jammed' ? 0.22 : gate === 'damaged' ? 0.07 : 0;
    const lift = gate === 'jammed' ? 0.5 : gate === 'damaged' ? 0.25 : -0.05;
    sc.sluiceGate.rotation.z = lerpTo(sc.sluiceGate.rotation.z, tilt);
    sc.sluiceGate.position.y = lerpTo(sc.sluiceGate.position.y, this.terrain.heightAt(SLUICE.gateCenter.x, SLUICE.gateCenter.z) + 1.55 + lift);
    sc.sluiceBrace.visible = this.braceT > 0.5;
    sc.sluiceWheel.rotation.y += dt * this.wheelTurn;
  }

  /** Move the whole scene forward: sky, water, foliage, animated props. */
  update(dt: number, state: WorldState, focus: THREE.Vector3, settings: Settings, hour: number, camera: THREE.Camera, wildlifeActive = true) {
    this.time += dt;
    this.view = worldView(state);
    const v = this.view;
    const reduced = settings.reducedMotion;
    this.sway.uTime.value = this.time;
    this.sway.uWind.value = reduced ? 0.25 : 1;
    // The wind crosses grass and trees alike; Reduced Motion holds the trees entirely still.
    this.foliage.wind.update(dt, { reducedMotion: reduced });
    this.foliage.strength.value = reduced ? 0 : 1;
    this.sky.brightness = settings.brightness;
    this.sky.update(hour, focus, dt, reduced);
    const night = this.sky.state.nightness;
    // Inside a room the sky's fill is mostly shut out and the room's own warm light takes over (A66). Without
    // shadows (Low) the sun itself would shine through the roof, so it is dimmed there as well.
    // Hearth shadows stay off (A70): a further shadow sampler pushed every lit material past the texture-unit limit on
    // high quality, and the world drew white.
    const indoor = this.interiorLight.update(dt, camera.position, night, this.time, false);
    // Indoors the sky's fill eases down, less by day (A75): daylight comes in through the windows and the open door, and
    // rooms at noon read as lit, lived-in places rather than caves. At night it falls as before and the hearth carries
    // the room.
    const day = 1 - night;
    this.sky.hemi.intensity *= 1 - (0.55 - 0.25 * day) * indoor;
    this.scene.environmentIntensity = this.skyFill * (1 - (0.6 - 0.3 * day) * indoor);
    // Direct sun never reaches inside (A75): on medium and high the shadow maps were trusted to keep it out, but they leak
    // through walls 24 cm thick, lighting the inner face of the far wall and drawing the outer frame's rails across it as
    // thin dark lines. The day's fill above carries the room instead.
    this.sky.sun.intensity *= 1 - 0.85 * indoor;
    this.scenery.setNight(night);
    this.scenery.update(dt, this.time, night);
    for (const s of this.physics.drainSplashes()) this.water.splash(s.x, s.y, s.z, s.energy);
    this.water.update(dt, v.flow, camera, focus, reduced, settings.reduceEffects);
    let shadowFrustum: THREE.Frustum | null = null;
    if (settings.quality !== 'low' && this.sky.sunShadows) {
      // Scene modules cull before the renderer updates light matrices. Use the real snapped
      // shadow volume now, so off-screen trees that shade visible ground remain submitted.
      this.sky.sun.updateMatrixWorld(); this.sky.sun.target.updateMatrixWorld();
      this.sky.sun.shadow.updateMatrices(this.sky.sun);
      shadowFrustum = this.sky.sun.shadow.getFrustum();
    }
    const frame: FrameContext = { time: this.time, camera, focus, nightness: night, sunDir: this.sky.state.sunDir, shadowFrustum, reducedMotion: reduced, hour, view: v, quality: settings.quality, wildlifeActive };
    this.animals.setRunning(wildlifeActive);
    this.animals.syncHunting(state.hunting);
    this.animals.setReduceEffects(settings.reduceEffects);
    this.environment.update(dt, frame);
    const movers = this.grassMovers(dt);
    this.groundcover?.setMovers(movers);
    this.setFoliageMovers(focus, movers);
    for (const m of this.modules) m.module.update(dt, frame);

    // Three resident lamps fade at range, and a slot only changes lamp after dimming.
    const ls = this.scenery.lanternPositions;
    const slots = this.lanternPool.update(dt, ls, focus);
    for (let k = 0; k < this.lanternLights.length; k++) {
      const l = this.lanternLights[k]!;
      const slot = slots[k]!;
      if (slot.source !== null) l.position.copy(ls[slot.source]!);
      l.intensity = 14 * Math.max(0, night - 0.15) * slot.strength;
    }

    // Mill wheel turns when the allocation gives the mill water.
    const target = v.millTurning ? 0.7 : 0;
    this.wheelSpin += (target - this.wheelSpin) * (1 - Math.exp(-dt * 0.8));
    this.scenery.millWheel.rotation.x += dt * this.wheelSpin;
    // Bell swing: decays after each ring.
    this.bellSwing = Math.max(0, this.bellSwing - dt * 0.35);
    this.scenery.bell.rotation.z = Math.sin(this.time * 4.2) * 0.55 * this.bellSwing;
    this.bellTimer += dt;
    this.applyDynamic(dt);

    // Quarry dust and the local response of the rite's bowl, water and altar.
    const working = v.quarryState === 'working' || v.quarryState === 'night_shift';
    this.emitDust(dt, working ? 1 : 0);
    const arr = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    this.dustData.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        arr.setXYZ(i, p.x, p.y, p.z);
      } else arr.setXYZ(i, 0, -200, 0);
    });
    arr.needsUpdate = true;
    this.riteResponse.update(dt, reduced, night);
    // Ledger glows faintly while the archive is accessible; the archive lamp is emissive via lantern lights.
    this.scenery.ledger.rotation.y = Math.sin(this.time * 0.8) * 0.05;
    void hasFact;
    void NPCS;
    void BELL;
    void MILL_WHEEL;
    void WORLD;
  }

  /** Spin the control wheel while the gate is being worked. */
  setWheelTurning(v: number) {
    this.wheelTurn = v;
  }

  /** Whether the player is standing inside the archive (roofed) for audio and camera decisions. */
  insideArchive(x: number, z: number): boolean {
    return Math.abs(x + 46) < 3.6 && Math.abs(z + 102) < 3.1;
  }

  /** Whether a point is under a roof: in the archive or in any building's room (A66), not above it (A70). */
  underRoof(x: number, y: number, z: number): boolean {
    return (this.insideArchive(x, z) && y < this.terrain.groundAt(x, z) + ARCHIVE_ROOM.wallBase + bySpec('archive').h + 0.25)
      || this.terrain.rooms.within(x, y, z) !== null;
  }

  private readonly doorSwings: DoorSwings;
  private readonly interiorLight: InteriorLight;
  private readonly windowView: WindowView;
  private readonly letIn: () => void;

  /** The world has opened to the player: the animals and furniture that follow may now be fetched (A72). */
  open() { this.letIn(); }
  /** The sky's image light at full strength, before a room dims it. */
  private readonly skyFill: number;

  /** Whether a room's door stands at all open, so its inside can be seen from outside (A66). */
  roomOpen(room: InteriorSpec): boolean {
    return this.doorSwings.openness(room) > 0;
  }

  /** Swing the rooms' doors for the wanderer and residents near them (A66); returns door sounds to play. */
  updateDoors(dt: number, visitors: readonly { x: number; z: number }[]): DoorEvent[] {
    return this.doorSwings.update(dt, visitors);
  }
}
