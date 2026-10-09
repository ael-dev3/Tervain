import { loadMeshyTrees, type MeshyTreeTemplates } from './presentation/meshyTrees';
import { loadBakedTextures } from './presentation/bakedTextures';
import { pruneContentCache } from './presentation/assets/download';
import { prefetchJourney } from './presentation/journeyPrefetch';
import * as THREE from 'three';
import { NPCS } from './content/npcs';
import { SCENES, SPEAKER_NAMES, VOICE_LINES, inHours, shown, type HeroCue } from './content/voice';
import { S } from './content/strings';
import { CLOCK_RATE } from './game/constants';
import { Game } from './game/game';
import { nextHint } from './game/hints';
import { huntingHint, restockParams } from './game/hunting';
import { INSPECT_POINTS } from './content/inspect';
import { ITEMS, itemAction } from './content/items';
import { hasFact, hourOfDay, evalAll, createInitialState, formatClock, clockDay, evalCond } from './game/state';
import { EVIDENCE_IDS, type Allocation, type Command, type GameEvent, type ItemId, type NpcId, type PlaceId, type WorldState } from './game/types';
import { worldView } from './game/worldView';
import { Input } from './platform/input';
import { FrameClock, MotionInterpolation, SIM_CATCH_UP, SIM_STEP, cappedFrame } from './platform/frameTiming';
import { waitForGraphicsReady } from './platform/graphicsReady';
import { prepareSceneTextures } from './platform/prepareSceneTextures';
import { codeLabel, loadSettings } from './platform/settings';
import { BrowserStore, SaveStore, SLOT_IDS, type SlotId } from './platform/storage';
import { ENEMY_SPAWNS, PLACES, SPAWN, SLUICE, RITE_ALTAR, type V2 } from './world/layout';
import { coastX } from './world/coast';
import { canPlayerStandAt, PLAYER_BODY_RADIUS, supportedPlayerHeight } from './world/playerPlacement';
import { EnemyActor, NpcActor, type ActorContext, type EnemyContext } from './presentation/actors';
import { AudioEngine } from './presentation/audio';
import { SpeechDirector } from './presentation/speech';
import { threatFrom } from './presentation/sound/musicDirector';
import { windTone } from './presentation/sound/soundscape';
import { CameraRig } from './presentation/cameraRig';
import { Grade } from './presentation/grade';
import { buildInteractables, type Interactable } from './presentation/interactions';
import { chooseInteractable } from './presentation/interactionTarget';
import { Player } from './presentation/player';
import { GPU, RENDER_PX } from './presentation/skyState';
import { Hud } from './presentation/ui/hud';
import { MapView } from './presentation/ui/map';
import { PanelHost, aboutPanel, controlsPanel, huntingPanel, inventoryPanel, journalPanel, noticePanel, pauseMenu, settingsPanel, sluicePanel, slotsPanel, type PanelActions, type PanelCtx, type PanelSaveResult } from './presentation/ui/panels';
import { h, clear } from './presentation/ui/dom';
import { createMenuScreen } from './presentation/ui/menuView';
import { installMenuMaterials } from './presentation/ui/menuMaterials';
import { AssetLibrary } from './presentation/assets/library';
import { ALL_NEEDS } from './presentation/assets/needs';
import { personBuildOptions } from './presentation/characters';
import { sheetsSettled } from './presentation/human/sheetPool';
import type { WorldScene } from './presentation/world';
import { LoadingScreen } from './presentation/ui/loadingScreen';
import { MenuScene } from './presentation/menuScene';
import { disposeSceneResources } from './presentation/disposeScene';
import { GAME_VERSION } from './version';
import { loadMainHero } from './presentation/mainHero';
import { createHeroRig, type MainHeroRig } from './presentation/hero/rig';
import { HuntingController } from './presentation/huntingController';
import { loadMeshyNpcCatalog, NPC_ROLES, type MeshyNpcCatalog } from './presentation/meshynpcs';
import { ResidentArrivals, residentRolesNear, type AwaitingFigure } from './presentation/residentArrivals';
import { ANIMALS, loadAnimalTemplates } from './presentation/animals';
import { REALM_WIND } from './presentation/realmWind';
import type { AnimalDefinition } from './presentation/animals/catalog';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { npcStyle } from './presentation/npcStyle';
import type { CircleCollider } from './world/colliders';

type Mode = 'loading' | 'title' | 'play' | 'dead';

const REVISION = typeof __SOURCE_REVISION__ === 'string' ? __SOURCE_REVISION__ : 'dev';

export class App {
  settings = loadSettings();
  saves = new SaveStore(new BrowserStore());
  game = new Game(createInitialState());
  input!: Input;
  audio = new AudioEngine(() => this.settings);
  renderer!: THREE.WebGLRenderer;
  grade!: Grade;
  private lastFrameDt = 1 / 60;
  /** Whether this step is the frame's last, which draws the picture and the HUD (a slow frame is caught up in several). */
  world!: WorldScene;
  private menuScene!: MenuScene;
  private menuVisitActive = false;
  private menuVisitCounter = 0;
  library: AssetLibrary = AssetLibrary.empty();
  cam = new CameraRig();
  player = new Player();
  private mainHeroInstalled = false;
  private treeTemplates: MeshyTreeTemplates | undefined;
  /** The stag that grazes across the title meadow: the same template the wildlife uses later, loaded once. */
  private menuDeer: { template: GLTF; definition: AnimalDefinition } | undefined;
  private static readonly MENU_DEER_ID = '1005232412';
  private npcAssets: MeshyNpcCatalog | null = null;
  /** The residents' catalog on its way: only the near ones' models before the world opens (stage 2). */
  private npcAssetsLoad: Promise<void> | null = null;
  /** Residents, hamlet people and bandits whose models arrive after the world opened (stage 2). */
  private readonly arrivals = new ResidentArrivals();
  /** The whole cast's catalog, asked for once the world is open. */
  private castLoad: Promise<void> | null = null;
  private readonly viewFrustum = new THREE.Frustum();
  private readonly viewMatrix = new THREE.Matrix4();
  private menuAssets: MeshyNpcCatalog | null = null;
  private menuLoad: Promise<void> | null = null;
  private menuGraphicsReady = false;
  private initialJourneyLoading = false;
  private initialLoad: Promise<void> | null = null;
  private loadingScreen!: LoadingScreen;
  private loadingMenuOnly = false;
  npcs: NpcActor[] = [];
  enemies: EnemyActor[] = [];
  hud = new Hud();
  panels = new PanelHost();
  mapView = new MapView();
  interactables: Interactable[] = [];
  target: Interactable | null = null;

  mode: Mode = 'loading';
  private titleEl!: HTMLElement;
  private musicUnlockEl: HTMLButtonElement | null = null;
  private loadingEl!: HTMLElement;
  private debugEl!: HTMLElement;
  private debugPre!: HTMLElement;
  private mapCanvas: HTMLCanvasElement | null = null;
  private panelKind: 'none' | 'pause' | 'journal' | 'inventory' | 'map' | 'notice' | 'sluice' | 'other' = 'none';
  private frameClock = new FrameClock();
  private worldBuilding = false;
  private worldBuildFailed = false;
  private worldDisposed = false;
  private rebuildPropPoses: WorldState['physicalObjects'] | null = null;
  private menuSceneDisposed = false;
  private rebuildRetry: HTMLButtonElement | null = null;
  private rebuildFocus: HTMLElement | null = null;
  private clockAcc = 0;
  private worldDirty = true;
  private inventoryNotesChanged = false;
  private bellClock = 4;
  private checkpoint: { x: number; y?: number; z: number; yaw: number } = { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw };
  private hitStop = 0;
  private deathRemaining = 0;
  private qualityReload: Promise<void> | null = null;
  private reloadAgain = false;
  private frameTimes: number[] = [];
  private fpsSmooth = 60;
  private debugTimer = 0;
  private bench: { active: boolean; frames: number[]; startedAt: number; result: string | null } = { active: false, frames: [], startedAt: 0, result: null };
  private lockingOut = false;
  private lastHint = '';
  /** Monotonic seconds for ambient audio scheduling; unlike world time it survives a world rebuild. */
  private audioClock = 0;
  private readonly listenerForward = new THREE.Vector3();
  private archiveWasOccupied = false;
  private autosaveTimer = 90;
  private bubbleState = new Map<string, { text: string; until: number }>();
  /** Spoken lines: exchanges with people and the hero's own remarks (A53). */
  private readonly speech = new SpeechDirector({
    say: (line, at) => this.audio.say(line, at),
    // A remark cut short takes its words with it (A70).
    hush: (speaker) => { this.audio.hush(speaker); this.bubbleState?.delete(speaker); },
    caption: (speaker, text, seconds) => {
      if (this.settings.captions) this.hud.speech(SPEAKER_NAMES[speaker], text, seconds);
    },
  });
  /** Screenshot and film tools start a game without the hero's opening words. */
  private quietStart = false;
  private healthFrac = 1;
  private sceneClock = 0;
  /** Lines the people near the hero may say soon; the sound world keeps their voices ready. */
  private speechSoon: string[] = [];
  private wasNight: boolean | null = null;
  private threatUntil = 0;
  private vignetteLevel = 0;
  private wantPlayLock = false;
  private lastActiveNpcTag = '';
  captionsEnabled = true;
  private hunting = new HuntingController(this, () => this.mode === 'play' && this.overlay === 'none' && !this.worldPaused && document.visibilityState !== 'hidden');

  constructor(private canvas: HTMLCanvasElement, private uiRoot: HTMLElement) {}

  /* ================================ boot ================================ */

  async init() {
    const qp = new URLSearchParams(location.search);
    const qq = qp.get('quality');
    if (qp.has('shot') && (qq === 'low' || qq === 'medium' || qq === 'high')) this.settings.quality = qq;
    this.input = new Input(this.canvas, () => this.settings);
    this.applyUiSettings();
    this.buildShell();
    // The menu surfaces (dust, leather, bronze, parchment) also dress the loading screen, so make them first.
    installMenuMaterials();
    this.loadingScreen.start({ mode: 'initial', phase: 'prepare' });

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    } catch {
      this.loadingEl.textContent = S('menu.webgl');
      return;
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    GPU.halfTargets = this.renderer.extensions.has('EXT_color_buffer_float') || this.renderer.extensions.has('EXT_color_buffer_half_float');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.grade = new Grade(this.renderer, { msaa: this.settings.quality !== 'low' });
    this.menuScene = new MenuScene({ quality: this.settings.quality });
    this.applyPixelRatio();
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    this.audio.onCaption = (t) => this.settings.captions && this.hud.caption(t);
    this.audio.onMusicState = () => this.syncMusicUnlock();
    this.game.subscribe((ev) => this.onGameEvents(ev));
    this.input.onNavigate = (dx, dy) => this.onPadNavigate(dx, dy);

    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    const first = () => {
      this.audio.resume();
    };
    window.addEventListener('pointerdown', first, { once: false });
    window.addEventListener('keydown', first, { once: false });
    // Over the title and pause menus the pointer brushes through the heath (presentation only).
    window.addEventListener('pointermove', (e) => {
      if (!this.menuBackgroundActive || this.menuSceneDisposed) return;
      const r = this.canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      this.menuScene.brush(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2);
    }, { passive: true });
    this.canvas.addEventListener('mousedown', () => {
      if (this.mode === 'play' && this.overlay === 'none' && !this.input.locked) {
        this.input.swallowClick = true;
        this.wantLock();
      }
    });
    document.addEventListener('keydown', (e) => this.onUiKey(e), true);
    // Save on backgrounding, and freeze simulation/audio even if the browser still calls RAF.
    window.addEventListener('pagehide', () => this.autosaveQuiet());
    document.addEventListener('visibilitychange', () => {
      const hidden = document.visibilityState === 'hidden';
      this.frameClock.setHidden(hidden);
      this.audio.setPageHidden(hidden);
      this.input.reset();
      if (hidden) {
        this.hunting.controls(0, false);
        this.clearSpeech();
        this.autosaveQuiet();
        if (this.mode === 'play' && this.overlay === 'none' && !this.bench.active) this.openPause();
      }
    });

    window.addEventListener('blur', () => {
      if (this.mode === 'play' && this.overlay === 'none' && !this.bench.active) this.openPause();
    });
    this.enterTitle();
    this.loadingScreen.finish(false);
    this.frameClock.setHidden(document.visibilityState === 'hidden');
    this.audio.setPageHidden(document.visibilityState === 'hidden');
    this.frameClock.tick(performance.now());
    requestAnimationFrame((t) => this.frame(t));
    (window as unknown as { tervain: App }).tervain = this;
    // The menu needs one resident and one tree; the playable valley is requested by Start/Continue.
    void this.prepareMenuAssets().catch(async (error) => {
      console.warn('Menu backdrop unavailable', error);
      // The original vigil remains available if its optional imported backdrop cannot be downloaded.
      await this.prepareMenuGraphics();
    }).catch((error) => console.warn('Menu graphics unavailable', error));
    if (qp.has('shot')) {
      this.quietStart = true;
      this.startNew();
      await this.initialLoad;
      if (!this.worldBuildFailed) this.applyShotParams();
    }
  }

  /**
   * Developer aid: `?shot=1&place=rillford&yaw=0.6&pitch=0.3&dist=12&hour=11&hud=0` starts a new game, frames a
   * view, settles the world, and sets document.title to READY so tools/shot.mjs can capture it headlessly.
   */
  private applyShotParams() {
    const q = new URLSearchParams(location.search);
    if (!q.has('shot')) return;
    const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
    this.quietStart = true;
    this.startNew();
    const place = q.get('place') as PlaceId | null;
    const feet = q.has('feet') ? Number(q.get('feet')) : NaN;
    if (q.has('x') && q.has('z')) this.player.setPosition(num('x', 0), num('z', 0), num('face', 0), this.world.terrain, Number.isFinite(feet) ? feet : undefined);
    else if (place && place in PLACES) this.teleport(place);
    this.cam.yaw = num('yaw', 0);
    this.cam.pitch = num('pitch', 0.25);
    this.cam.wantDist = num('dist', 6);
    this.debugTime(num('hour', 11));
    const camv = q.get('cam')?.split(',').map(Number);
    if (camv && camv.length === 6 && camv.every((n) => Number.isFinite(n))) this.cam.manual = { p: new THREE.Vector3(camv[0], camv[1], camv[2]), look: new THREE.Vector3(camv[3], camv[4], camv[5]) };
    const fov = q.get('fov');
    if (fov) {
      this.cam.camera.fov = Number(fov);
      this.cam.camera.updateProjectionMatrix();
    }
    for (const name of (q.get('hide') ?? '').split(',').filter(Boolean)) {
      const m = this.world.modules.find((x) => x.name === name);
      if (m) m.module.group.visible = false;
      else if (name === 'scenery') this.world.scenery.group.visible = false;
      else if (name === 'water') this.world.water.inland.group.visible = false;
      else if (name === 'sea') this.world.water.ocean.mesh.visible = false;
      else if (name === 'actors') for (const a of [...this.npcs.map((n) => n.rig.root), ...this.enemies.map((e) => e.rig.root), this.player.group]) a.visible = false;
    }
    if (q.get('hud') === '0') this.hud.show(false);
    // Look-development controls are intentionally query-only: each post effect can be isolated in a repeatable shot.
    const controls = ['saturation', 'contrast', 'vignette', 'grain', 'earth', 'chromatic'] as const;
    const grade: Partial<Record<(typeof controls)[number], number>> = {};
    for (const key of controls) {
      if (q.has(key)) {
        const value = Number(q.get(key));
        if (Number.isFinite(value)) grade[key] = value;
      }
    }
    if (Object.keys(grade).length) this.grade.setLook(grade);
    if (q.has('bloom')) this.grade.setBloom(q.get('bloom') !== '0');
    this.settings.reducedMotion = q.get('motion') !== '1';
    this.applyUiSettings();
    for (let i = 0; i < num('settle', 120); i++) {
      this.step(1 / 30);
      this.input.endFrame();
    }
    this.hud.show(q.get('hud') !== '0');
    document.title = 'READY';
  }

  private buildShell() {
    clear(this.uiRoot);
    this.loadingScreen = new LoadingScreen();
    this.loadingEl = this.loadingScreen.el;
    this.titleEl = h('div', { class: 'title' });
    this.debugPre = h('pre', { class: 'debug' });
    this.debugEl = h('div', { class: 'panel surface-paper', style: { position: 'absolute', right: '12px', top: '90px', width: 'min(420px, 92vw)', maxHeight: '80vh', overflow: 'auto', display: 'none', pointerEvents: 'auto', zIndex: '5' } });
    this.uiRoot.append(this.hud.el, this.titleEl, this.panels.el, this.debugEl, this.loadingEl);
    this.hud.onQuickSlotActivate = (slot) => this.activateQuickSlot(slot);
    this.hud.onSkin = () => this.hunting.skin();
    this.hud.onAssignQuickSlot = (slot, item) => this.assignQuickSlot(slot, item);
    this.hud.onSwapQuickSlots = (from, to) => this.swapQuickSlots(from, to);
    this.mapView.onMarker = (marker) => {
      if (this.mode !== 'play' || this.worldPaused || this.panelKind !== 'map') return;
      const result = this.game.dispatch({ t: 'setMapMarker', marker });
      if (result.ok) this.audio.uiConfirm();
    };
    this.panels.onEmpty = () => this.onPanelsClosed();
    this.panels.onChange = () => {
      // A pending rebind never outlives the screen it was started on.
      this.input.captureNext = null;
      this.titleEl.inert = this.panels.isOpen || this.worldPaused;
      this.hud.el.inert = this.panels.isOpen || this.mode !== 'play' || this.worldPaused;
      this.syncMenuHudVisibility();
    };
    this.panels.onOpen = () => {
      this.hunting.controls(0, false);
      this.audio.setWildlifeActive(false);
      this.clearSpeech();
      this.titleEl.inert = true;
      this.input.uiOpen = true;
      this.player.vx = this.player.vz = this.player.lastMoveSpeed = 0;
      this.releaseLock();
    };
  }

  private async prepareMainHero() {
    if (this.mainHeroInstalled) return;
    this.loadingScreen?.update({ phase: 'prepare', detail: 'Preparing the wanderer…' });
    const asset = await loadMainHero();
    const rig = createHeroRig(asset);
    // The provisional procedural sheet must finish before its GPU targets are released.
    await sheetsSettled();
    const previous = this.player;
    this.player = new Player(rig);
    const retired = new THREE.Scene();
    retired.add(previous.group);
    disposeSceneResources(retired, () => {});
    this.mainHeroInstalled = true;
  }

  private async buildWorld() {
    this.worldBuilding = true;
    this.worldBuildFailed = false;
    // Keep staged actors owned until the new world adopts them, including on a failed build.
    const stagedCast = new THREE.Scene();
    const npcs: NpcActor[] = [];
    const enemies: EnemyActor[] = [];
    try {
      // Shared flora caches must be released before replacement assets are constructed.
      if (this.world && !this.worldDisposed) this.rebuildPropPoses = this.world.physics.snapshot();
      if (this.world) this.disposeWorld();
      if (!this.npcAssets) await (this.npcAssetsLoad ?? this.prepareNpcAssets());
      const cast = this.npcAssets!;
      this.arrivals.clear();
      // The wanderer swims with the authored strokes from the residents' motion library once it is here.
      const library = this.npcAssets!.library, hero = (this.player.rig as Partial<MainHeroRig> | undefined)?.hero;
      if (library && hero) hero.useSwimClips(library);
      // Legacy procedural export/fallback controls; Meshy residents retain their baked 1536 px surface maps in every preset.
      personBuildOptions.sheetSize = this.settings.quality === 'low' ? 512 : 1024;
      // Stage private Meshy rigs before the world adopts them, so a failed build can release the complete cast.
      for (const definition of Object.values(NPCS)) {
        const height = definition.look.height * (npcStyle(definition.id).build === 'woman' ? 0.94 : 1);
        const role = `named:${definition.id}`, arrived = cast.has(role);
        // Someone whose model is still on its way keeps their schedule unseen and cannot be met until it is here (stage 2).
        const npc = new NpcActor(definition, arrived ? cast.create(role, height) : cast.standIn(role, height), arrived);
        npcs.push(npc);
        stagedCast.add(npc.rig.root);
        if (!arrived) this.arrivals.add({ role, position: () => npc, unseen: () => npc.away,
          adopt: (catalog) => npc.adoptRig(catalog.create(role, height)) });
      }
      for (const spawn of ENEMY_SPAWNS) {
        const variant = spawn.id === 'ford_bandit_b' ? 1 : 0;
        const role = `enemy:${spawn.id}`, scale = 1.04 + variant * 0.05, arrived = spawn.kind === 'thornback' || cast.has(role);
        const rig = spawn.kind === 'thornback' ? undefined : arrived ? cast.create(role, scale, 'blade') : cast.standIn(role, scale, 'blade');
        // A bandit still waiting for their model is out of every fight until it is here (stage 2).
        const enemy = new EnemyActor(spawn, rig, arrived);
        enemies.push(enemy);
        stagedCast.add(enemy.rig.root);
        if (!arrived) this.arrivals.add({ role, position: () => enemy, unseen: () => !enemy.rig.root.visible,
          adopt: (catalog) => enemy.adoptRig(catalog.create(role, scale, 'blade')) });
      }
      const { WorldScene } = await import('./presentation/world');
      this.world = await WorldScene.create(this.game.state, structuredClone(this.settings), this.library, undefined, this.npcAssets!, {
        // The animals follow the world in; a first visit downloads about a fifth less before entering (A70).
        deferWildlife: true,
        // So does the rooms' furniture: none of it is needed to set foot in the valley (backlog 4).
        deferFurniture: true,
        onPhase: (p) => this.loadingScreen?.update(p.phase === 'finishing'
          ? { phase: 'graphics', detail: p.label }
          : { phase: p.phase, completed: p.completed, total: p.total, detail: p.label }),
      });
      this.worldDisposed = false;
      if (this.rebuildPropPoses) this.world.physics.restore(this.rebuildPropPoses);
      this.world.scene.add(this.player.group);
      this.hunting.attach();
      this.applyQualityToRenderer();
      this.npcs = npcs;
      for (const n of this.npcs) this.world.scene.add(n.rig.root);
      this.enemies = enemies;
      for (const e of this.enemies) this.world.scene.add(e.rig.root);
      const ambient = this.world.modules?.find((m) => m.name === 'ambient')?.module as { awaiting?: AwaitingFigure[] } | undefined;
      for (const figure of ambient?.awaiting ?? []) this.arrivals.add(figure);
      this.interactables = buildInteractables(this);
      this.syncWorldFromState(true);
      // Settle any provisional hero/procedural-tool sheets; imported NPC surfaces are already baked and loaded.
      await sheetsSettled();
      this.rebuildPropPoses = null;
    } catch (error) {
      this.worldBuildFailed = true;
      // Settle late painters before releasing their targets, so recovery cannot leak replaced textures.
      await sheetsSettled();
      disposeSceneResources(stagedCast, () => {}, [this.player.group]);
      throw error;
    } finally {
      this.worldBuilding = false;
    }
  }

  /** No silent runtime fallback: an incomplete resident download uses the existing graphics recovery screen. */
  /** The residents' models: `roles` only (the near ones before entry, stage 2), else everyone's. */
  private prepareNpcAssets(roles: readonly string[] = NPC_ROLES): Promise<void> {
    if (this.npcAssets) return Promise.resolve();
    if (this.npcAssetsLoad) return this.npcAssetsLoad;
    const request = loadMeshyNpcCatalog((loaded, total) => {
      this.loadingScreen?.update({ phase: 'residents', completed: loaded, total });
    }, roles).then((assets) => { this.npcAssets ??= assets; });
    this.npcAssetsLoad = request;
    void request.catch(() => {}).finally(() => { if (this.npcAssetsLoad === request) this.npcAssetsLoad = null; });
    return request;
  }

  /**
   * Everyone else's models, once the world is open (stage 2): they download behind the first view and the waiting
   * figures take theirs as they arrive. A failed download is asked for again a little later; until then they stay unseen.
   */
  private completeCast() {
    if (this.castLoad || NPC_ROLES.every((role) => this.npcAssets?.has(role))) return;
    const request = loadMeshyNpcCatalog(undefined, NPC_ROLES).then((assets) => { this.npcAssets = assets; });
    this.castLoad = request;
    void request.catch((error) => {
      console.warn('Residents still on their way:', error);
      setTimeout(() => { if (this.castLoad === request) { this.castLoad = null; this.completeCast(); } }, 15_000);
    });
  }

  /** Whether the player could see someone standing at `p` now: in the camera's view and near enough to make out. */
  private inView(p: { x: number; y: number; z: number }): boolean {
    const camera = this.cam.camera;
    if (camera.position.distanceTo(new THREE.Vector3(p.x, p.y + 0.9, p.z)) > 150) return false;
    camera.updateMatrixWorld();
    this.viewFrustum.setFromProjectionMatrix(this.viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    return this.viewFrustum.intersectsSphere(new THREE.Sphere(new THREE.Vector3(p.x, p.y + 0.9, p.z), 1.4));
  }

  private prepareMenuAssets(): Promise<void> {
    if (this.menuLoad) return this.menuLoad;
    const request = this.loadMenuAssets();
    this.menuLoad = request;
    void request.finally(() => {
      if (this.menuLoad === request) this.menuLoad = null;
    }).catch(() => {});
    return request;
  }

  private async loadMenuAssets() {
    // The weathered building surfaces never hold up the title: the camp adopts them whenever they arrive.
    void loadBakedTextures(this.settings.quality);
    const [trees, assets] = await Promise.all([
      loadMeshyTrees(['tree-0208']), loadMeshyNpcCatalog(undefined, ['menu:warden']),
    ]);
    this.treeTemplates = trees;
    this.menuAssets = assets;
    this.replaceMenuScene();
    await this.prepareMenuGraphics();
    void this.loadMenuDeer();
  }

  /**
   * The title meadow's stag is cosmetic and follows the backdrop, so it never delays the menu. If its model cannot load
   * the menu simply has none; the wildlife retries (and reports) the same download when the world is built.
   */
  private async loadMenuDeer() {
    const definition = ANIMALS.find((a) => a.id === App.MENU_DEER_ID);
    if (this.menuDeer || !definition) return;
    const template = (await loadAnimalTemplates(undefined, [definition]).catch(() => null))?.get(definition.id);
    if (!template || this.menuDeer) return;
    this.menuDeer = { template, definition };
    if (this.menuSceneDisposed || !this.menuScene.addDeer(template, definition)) return;
    await this.renderer.compileAsync?.(this.menuScene.scene, this.menuScene.camera)?.catch(() => {});
  }

  private replaceMenuScene() {
    const traffic = this.menuScene.trafficState;
    const awakening = this.menuScene.awakeningState;
    const grove = this.menuScene.grove;
    const replacement = new MenuScene({ quality: this.settings.quality, treeTemplates: this.treeTemplates,
      trafficSeed: traffic.seed, trafficTime: traffic.elapsed, awakening, grove,
      // The world's catalog holds the warden only once the whole cast is here (stage 2).
      wardenRig: (this.menuAssets ?? (this.npcAssets?.has('menu:warden') ? this.npcAssets : null))?.create('menu:warden'), deer: this.menuDeer });
    this.menuGraphicsReady = false;
    if (!this.menuSceneDisposed) this.menuScene.dispose();
    this.menuScene = replacement;
    this.menuSceneDisposed = false;
    this.menuScene.resize(window.innerWidth, window.innerHeight);
  }

  private async prepareMenuGraphics() {
    for (;;) {
      const menu = this.menuScene;
      menu.prepare(this.renderer);
      await this.renderer.compileAsync?.(menu.scene, menu.camera);
      // Imported assets or a new quality setting may replace the scene during compilation.
      if (menu !== this.menuScene) continue;
      this.menuGraphicsReady = true;
      return;
    }
  }

  /** Resource completion precedes activation: prepare the real first view while simulation and audio stay paused. */
  private async prepareWorldGraphics(fromLoad?: { recovered: null | 'previous' | 'temporary' } | null) {
    this.loadingScreen?.update({ phase: 'graphics', detail: 'Preparing the first view…' });
    if (fromLoad !== undefined) this.placePlayerForEntry(fromLoad);
    this.cam.follow(1, this.player.x, this.player.y, this.player.z, this.world.terrain, this.world.colliders, true, 0);
    this.world.update(0, this.game.state, new THREE.Vector3(this.player.x, this.player.y, this.player.z),
      this.settings, hourOfDay(this.game.state.clock), this.cam.camera, false);
    let textureCount = 0;
    await prepareSceneTextures(this.renderer, this.world.scene, { camera: this.cam.camera,
      onProgress: (completed, total) => {
        textureCount = total;
        this.loadingScreen?.update({ phase: 'graphics', completed, total: total + 3, detail: 'Preparing surface textures…' });
      },
    });
    await this.renderer.compileAsync?.(this.world.scene, this.cam.camera);
    this.loadingScreen?.update({ phase: 'graphics', completed: textureCount + 1, total: textureCount + 3, detail: 'Preparing the first view…' });
    this.renderWorld();
    this.loadingScreen?.update({ phase: 'graphics', completed: textureCount + 2, total: textureCount + 3, detail: 'Finishing the first view…' });
    // Shader completion precedes uploads and draws. Wait for the submitted view before enabling input.
    const context = this.renderer.getContext?.();
    await waitForGraphicsReady(context && 'fenceSync' in context ? context : undefined);
    this.loadingScreen?.update({ phase: 'graphics', completed: textureCount + 3, total: textureCount + 3 });
  }

  private requestInitialJourney(state: WorldState, fromLoad: { recovered: null | 'previous' | 'temporary' } | null, enter: () => void) {
    const previous = this.game.state;
    this.game.replaceState(state);
    const run = async () => {
      if (this.initialJourneyLoading) return;
      this.pauseForWorldBuild(true);
      this.initialJourneyLoading = true;
      try {
        if (ALL_NEEDS.length > 0) this.library = await AssetLibrary.open();
        // Everything the journey downloads starts now (A68): the wanderer, the residents, then the world's models and
        // surfaces behind them, instead of each group waiting for the one before it to be prepared.
        const hero = this.prepareMainHero();
        // Only the residents near where the journey starts come before it; the rest arrive after (stage 2).
        void this.prepareNpcAssets(residentRolesNear(state)).catch(() => {});
        prefetchJourney(this.settings.quality, { deferFurniture: true });
        await hero;
        do {
          this.reloadAgain = false;
          await this.buildWorld();
          await this.prepareWorldGraphics(fromLoad);
        } while (this.reloadAgain);
        if (!this.menuAssets) {
          // A failed optional menu download can recover from the now-loaded world template caches.
          void this.prepareMenuAssets().catch((error) => console.warn('Menu backdrop unavailable', error));
        }
        this.initialJourneyLoading = false;
        this.finishWorldBuild();
        // Developer aid: what was fetched before the world opened is what started before this mark.
        performance.mark?.('tervain:world-open');
        enter();
        this.completeCast();
        // Every file the game needs has now been asked for: drop cached models that have since been replaced.
        void pruneContentCache();
      } catch (error) {
        this.initialJourneyLoading = false;
        this.showWorldBuildFailure(error, () => { this.initialLoad = run(); return this.initialLoad; }, () => {
          this.disposeWorld();
          delete (this as Partial<App>).world;
          this.worldBuildFailed = false;
          this.game.replaceState(previous);
          this.finishWorldBuild();
          this.enterTitle();
        });
      }
    };
    this.initialLoad = run();
  }

  private disposeWorld() {
    if (!this.world || this.worldDisposed) return;
    const world = this.world;
    this.worldDisposed = true;
    this.hunting.detach();
    const scene = world.scene;
    // This rig persists across quality/world rebuilds and keeps its GPU resources.
    scene.remove(this.player.group);
    disposeSceneResources(scene, () => world.dispose(), [this.player.group]);
  }

  private get worldPaused() {
    return this.worldBuilding || this.worldBuildFailed || this.initialJourneyLoading || !!this.qualityReload;
  }

  private pauseForWorldBuild(initial = false) {
    this.hunting.reset();
    this.audio?.setWildlifeActive(false);
    this.world?.animals?.setRunning(false);
    this.clearSpeech();
    if (!this.worldPaused) this.rebuildFocus = document.activeElement as HTMLElement | null;
    this.audio.pauseWorld();
    this.worldBuildFailed = false;
    this.rebuildRetry = null;
    const menuOnly = !initial && !this.world;
    if (this.loadingScreen && menuOnly !== this.loadingMenuOnly) {
      this.loadingMenuOnly = menuOnly;
      this.loadingScreen = new LoadingScreen(this.loadingEl, menuOnly ? ['prepare', 'graphics'] : undefined);
    }
    this.loadingScreen?.start({ mode: initial || !this.world ? 'initial' : 'rebuild', phase: 'prepare', tip: 'hunt' });
    this.loadingEl.classList.remove('off');
    this.loadingEl.setAttribute('role', 'status');
    this.loadingEl.removeAttribute('aria-label');
    this.titleEl.inert = this.panels.el.inert = this.hud.el.inert = this.debugEl.inert = true;
    this.input.captureNext = null;
    this.input.captureCancel = null;
    this.input.uiOpen = true;
    this.input.reset();
    this.releaseLock();
  }

  private finishWorldBuild() {
    if (this.worldBuildFailed) return;
    this.world?.open?.();
    this.loadingScreen?.finish(false);
    this.loadingEl.classList.add('off');
    this.loadingEl.removeAttribute('role');
    this.loadingEl.removeAttribute('aria-label');
    this.rebuildRetry = null;
    this.titleEl.inert = this.panels.isOpen;
    this.panels.el.inert = this.debugEl.inert = false;
    this.hud.el.inert = this.panels.isOpen || this.mode !== 'play';
    this.input.uiOpen = this.panels.isOpen || this.mode !== 'play';
    this.input.reset();
    this.frameClock?.reset();
    this.rebuildFocus?.focus();
    this.rebuildFocus = null;
  }

  private showWorldBuildFailure(error: unknown, retry: () => void | Promise<void>, back?: () => void) {
    console.error('Graphics rebuild failed', error);
    this.worldBuildFailed = true;
    // A confirmation held during construction is not a fresh press on Retry.
    this.input.poll(0);
    this.input.reset();
    if (this.loadingScreen) {
      this.rebuildRetry = this.loadingScreen.fail({ retry, back, detail: failureDetail(error) });
      return;
    }
    this.loadingEl.classList.remove('off');
    this.loadingEl.setAttribute('role', 'alertdialog');
    this.loadingEl.setAttribute('aria-label', 'Graphics could not be rebuilt');
    this.rebuildRetry = h('button', { class: 'btn primary', onClick: () => {
      if (!this.worldBuilding && !this.qualityReload) void retry();
    } }, 'Retry graphics');
    clear(this.loadingEl);
    this.loadingEl.append(h('div', { style: { maxWidth: '32rem', padding: '24px', textAlign: 'center' } },
      h('h1', {}, 'Graphics could not be rebuilt.'),
      h('p', {}, 'Play is paused. Retry to continue.'), this.rebuildRetry));
    this.rebuildRetry.focus();
  }

  private applyQualityToRenderer() {
    const q = this.settings.quality;
    this.renderer.shadowMap.enabled = q !== 'low';
    this.grade.setMsaa(q !== 'low');
    this.grade.bloom = q !== 'low';
    // The whole resize, not only the pixel ratio: the grade's and water's render targets follow the canvas (A70).
    this.onResize();
  }

  private applyPixelRatio() {
    const q = this.settings.quality;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? Math.min(dpr, 1) : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2));
    RENDER_PX.value = this.renderer.getPixelRatio();
  }

  private onResize() {
    const w = window.innerWidth;
    const h2 = window.innerHeight;
    this.applyPixelRatio();
    this.renderer.setSize(w, h2, false);
    const dpr = this.renderer.getPixelRatio();
    this.grade.setSize(w * dpr, h2 * dpr);
    this.cam.setAspect(w / h2);
    if (!this.menuSceneDisposed) this.menuScene.resize(w, h2);
  }

  /* ============================== settings ============================== */

  applyUiSettings() {
    const s = this.settings;
    document.documentElement.style.setProperty('--ui-scale', String(s.textScale));
    document.body.classList.toggle('high-contrast', s.highContrast);
    document.body.classList.toggle('reduce-effects', s.reduceEffects);
    document.body.classList.toggle('reduced-motion', s.reducedMotion);
    this.audio.applySettings();
    if (this.world && !this.worldDisposed) this.world.sky.brightness = s.brightness;
  }

  applySettings(reload = false) {
    this.applyUiSettings();
    if (reload && this.renderer) {
      this.reloadAgain = true;
      if (this.qualityReload || this.initialJourneyLoading) return;
      this.pauseForWorldBuild();
      this.qualityReload = this.reloadQuality().finally(() => {
        this.qualityReload = null;
        this.finishWorldBuild();
      });
    }
  }

  private async reloadQuality() {
    try {
      while (this.reloadAgain) {
        this.reloadAgain = false;
        if (this.menuSceneDisposed || this.menuScene.quality !== this.settings.quality) {
          this.replaceMenuScene();
        }
        if (!this.world) {
          this.applyQualityToRenderer();
          this.loadingScreen?.update({ phase: 'graphics', detail: 'Preparing the menu…' });
          await this.prepareMenuGraphics();
          continue;
        }
        await this.buildWorld();
        // The player rig and action state survive graphics rebuilds; do not rewind to a stale pre-load transform.
        const safe = this.safePosition(this.player.x, this.player.z, this.player.y);
        if (safe.x !== this.player.x || safe.z !== this.player.z) {
          this.player.setPosition(safe.x, safe.z, this.player.yaw, this.world.terrain, safe.y);
          this.cam.reset();
        }
        await this.prepareWorldGraphics();
        // The title and pause backdrop was replaced for the new preset: prepare it too, or it never draws again (A70).
        if (!this.menuGraphicsReady) await this.prepareMenuGraphics();
      }
    } catch (error) {
      this.showWorldBuildFailure(error, () => this.applySettings(true));
    }
  }

  /* =========================== mode transitions ========================== */

  get overlay(): 'none' | 'panel' {
    if (this.panels.isOpen) return 'panel';
    return 'none';
  }

  private enterTitle() {
    // Returning from pause to the title is a fresh launch even though both screens use the menu scene.
    this.menuVisitActive = false;
    this.clearSpeech();
    this.world?.physics.release();
    this.mode = 'title';
    this.hud.show(false);
    this.panels.closeAll();
    this.input.uiOpen = true;
    this.releaseLock();
    this.buildTitle();
    this.titleEl.classList.add('on');
    this.syncMenuHudVisibility();
    this.focusTitle();
    this.debugEl.style.display = 'none';
    this.worldDirty = true;
  }

  private buildTitle() {
    clear(this.titleEl);
    const latest = this.saves.latest();
    const btn = (label: string, fn: () => void, primary = false) => h('button', { class: `btn${primary ? ' primary' : ''}`, 'data-nav': true, onClick: () => {
      this.audio.resume();
      this.audio.uiConfirm();
      fn();
    } }, label);
    const menu = h(
      'div',
      { class: 'menu-list' },
      latest ? btn(S('menu.continue'), () => this.loadSlot(latest.slot), true) : null,
      btn(S('menu.new'), () => (latest ? this.confirmNew() : this.startNew()), !latest),
      btn(S('menu.load'), () => this.panels.push(slotsPanel(this.panelCtx(), 'load'))),
      btn(S('menu.settings'), () => this.panels.push(settingsPanel(this.panelCtx()))),
      btn(S('menu.controls'), () => this.panels.push(controlsPanel(this.panelCtx()))),
      btn(S('menu.about'), () => this.panels.push(aboutPanel(this.panelCtx()))),
    );
    this.musicUnlockEl = h('button', {
      class: 'btn menu-music-unlock', 'data-nav': true,
      title: S('menu.music.gesture'),
      onClick: () => this.audio.resume({ retryPending: true }),
    }, S('menu.music.play')) as HTMLButtonElement;
    this.titleEl.append(createMenuScreen({ menu, subtitle: S('menu.affiliation'), version: GAME_VERSION, variant: 'title', musicControl: this.musicUnlockEl }));
    this.syncMusicUnlock();
    this.focusTitle();
  }

  private focusTitle() {
    (this.titleEl.querySelector('[data-nav]') as HTMLElement | null)?.focus();
  }

  private syncMusicUnlock() {
    if (!this.musicUnlockEl) return;
    const state = this.audio.menuMusicState;
    this.musicUnlockEl.hidden = state !== 'locked' && state !== 'blocked';
    this.musicUnlockEl.toggleAttribute('data-nav', !this.musicUnlockEl.hidden);
    // A successful music gesture must not leave keyboard focus on a hidden item.
    if (this.musicUnlockEl.hidden && document.activeElement === this.musicUnlockEl) this.focusTitle();
  }

  private confirmNew() {
    this.panels.push(
      h(
        'div',
        { class: 'tv-confirm' },
        h('h1', {}, S('menu.new')),
        h('p', {}, S('menu.newconfirm')),
        h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn primary', 'data-nav': true, onClick: () => {
          this.panels.closeAll();
          this.startNew();
        } }, S('menu.startanyway')), h('button', { class: 'btn', 'data-nav': true, onClick: () => this.panels.back() }, S('menu.cancel'))),
      ),
      { narrow: true },
    );
  }

  startNew() {
    if (this.worldPaused) return;
    if (!this.world) {
      this.requestInitialJourney(createInitialState('slot-1'), null, () => this.startNew());
      return;
    }
    this.game.replaceState(createInitialState('slot-1'));
    this.beginPlay(null);
    if (!this.quietStart) {
      this.speech.hero('arrival', { delay: 3 });
      this.speech.hero('arrival.bell', { delay: 11 });
    }
    // A brief notice leaves movement, look and the world clock running. The journal keeps the premise.
    this.hud.toast(S('arrival.wake'));
    this.hud.caption(S('arrival.controls', {
      move: this.input.label('forward', codeLabel),
      interact: this.input.label('interact', codeLabel),
      journal: this.input.label('journal', codeLabel),
    }));
  }

  private beginPlay(fromLoad: { recovered: null | 'previous' | 'temporary' } | null) {
    if (this.worldPaused) return;
    this.clearSpeech();
    this.inventoryNotesChanged = false;
    this.hunting.reset();
    this.titleEl.classList.remove('on');
    this.panels.closeAll();
    this.mode = 'play';
    this.hud.show(true);
    this.syncMenuHudVisibility();
    this.hud.el.inert = false;
    this.hud.showFade(false);
    this.input.uiOpen = false;
    // Quickload can begin while already playing, so uiOpen may not change at all.
    // Every load/new game discards the old world's held keys, toggles and queued actions.
    this.input.reset();
    this.placePlayerForEntry(fromLoad);
    this.clockAcc = 0;
    this.hitStop = this.deathRemaining = 0;
    this.bellClock = 3;
    // A fresh session waits a full interval: the last session's leftover countdown would otherwise autosave a just-loaded
    // older slot over the newer auto slot within a second (A71).
    this.autosaveTimer = 90;
    if (fromLoad?.recovered) this.hud.toast(S(`menu.recovered.${fromLoad.recovered}`));
    if (this.settings.reducedMotion) this.hud.setVignette(0);
    this.canvas.focus?.({ preventScroll: true });
    this.wantLock();
  }

  private placePlayerForEntry(fromLoad: { recovered: null | 'previous' | 'temporary' } | null) {
    this.world.physics.reset();
    this.world.physics.restore(this.game.state.physicalObjects);
    this.syncWorldFromState(true);
    const p = this.game.state.player;
    const safe = this.safePosition(p.x, p.z, p.y);
    const fresh = fromLoad === null;
    const start = fresh ? { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw } : { x: safe.x, z: safe.z, yaw: p.yaw };
    this.pendingMount = !fresh && typeof p.mount === 'string' ? { id: p.mount, x: start.x, z: start.z } : null;
    this.player.setPosition(start.x, start.z, start.yaw, this.world.terrain, fresh ? undefined : safe.y);
    if (!fresh) {
      const top = this.world.physics.supportAt(start.x, start.z, p.y);
      if (top !== null && Math.abs(top - p.y) < .12) {
        this.player.y = top;
        this.player.rig.root.position.y = top;
      }
    }
    this.cam.yaw = start.yaw;
    this.cam.reset();
    this.player.group.visible = true;
    this.cam.pitch = 0.3;
    this.checkpoint = { ...start, y: this.player.y };
    this.game.setPlayerTransform(this.player.x, this.player.y, this.player.z, this.player.yaw);
  }

  /** Player positions that are no longer standable (geometry changed between builds) fall back to a safe place. */
  private safePosition(x: number, z: number, feetY?: number): V2 & { y: number } {
    const { terrain, colliders } = this.world;
    if (canPlayerStandAt(terrain, colliders, x, z, feetY)) return { x, z, y: supportedPlayerHeight(terrain, x, z, feetY) };
    // A swimmer is saved and rebuilt where he swims, not carried ashore (A70).
    const water = this.world.water?.world.sample(x, z);
    if (water && water.depth > 0.9 && !colliders.blocked(x, z, PLAYER_BODY_RADIUS)) return { x, z, y: feetY ?? water.surface - 1.1 };
    const cell = this.world.nav.nearestOpen(x, z, 10);
    const position = cell ? this.world.nav.cellCenter(cell.i, cell.j) : { x: SPAWN.x, z: SPAWN.z };
    return { ...position, y: terrain.groundAt(position.x, position.z) };
  }

  quitToTitle() {
    if (this.worldPaused) return;
    this.autosaveQuiet();
    this.enterTitle();
  }

  private syncWorldFromState(snap: boolean) {
    this.player.syncEquipment(this.game);
    this.world.syncStatic(this.game.state, snap);
    this.world.animals?.syncHunting(this.game.state.hunting, true);
    const ctx = this.actorContext();
    for (const n of this.npcs) n.snapToGoal(ctx);
    for (const e of this.enemies) {
      if (this.game.state.defeated[e.id]) {
        e.state = 'dead';
        e.fade = 0;
        e.rig.root.visible = false;
      } else {
        e.state = 'idle';
        e.engaged = false;
        e.hp = e.maxHp;
        e.x = e.spawn.x;
        e.z = e.spawn.z;
        e.fade = 1;
        e.rig.root.visible = true;
        e.rig.body.rotation.set(0, 0, 0);
      }
    }
    this.worldDirty = false;
    this.interactables = buildInteractables(this);
  }

  /* ============================== main loop ============================== */

  private nextDraw = -Infinity;
  private frame(now: number) {
    // On a display faster than 60 Hz, refreshes between frames are let pass: the same game, less heat (A71).
    if (this.settings.frameCap60) {
      const capped = cappedFrame(now, this.nextDraw);
      this.nextDraw = capped.due;
      if (!capped.draw) { requestAnimationFrame((t) => this.frame(t)); return; }
    }
    const frame = this.frameClock.tick(now);
    // Between fixed steps on a fast display, presses and mouse movement wait for the next step rather than being lost.
    let held = false;
    if (frame && !this.worldPaused) {
      const { interval, dt, steps, alpha } = frame;
      this.lastFrameDt = Math.min(interval, SIM_CATCH_UP);
      if (interval < 5) this.recordFrame(interval);
      this.audioClock += dt;
      held = steps === 0;
      try {
        // The world advances in fixed steps, as many as the frame's time holds (A72). A press or a mouse movement
        // counts in the first alone; the picture is drawn once, between the last two steps.
        for (let i = 0; i < steps; i++) {
          this.step(SIM_STEP);
          this.input.consumePad(); this.input.endFrame();
        }
        this.present(alpha);
      } catch (e) {
        console.error(e);
      }
    } else if (document.visibilityState !== 'hidden' && this.worldBuildFailed && !this.worldBuilding && !this.qualityReload) {
      // Recovery owns controller confirmation; no world or hidden menu action runs underneath it.
      this.input.poll(frame?.dt ?? 0);
      if (this.input.padButtonPressed(0)) {
        if (this.loadingScreen) this.loadingScreen.confirm();
        else this.rebuildRetry?.click();
      }
    } else if (document.visibilityState !== 'hidden' && !this.worldPaused) {
      // Baseline a held controller after returning; its old press must not become an attack.
      this.input.poll(0);
    }
    if (!held) {
      this.input.consumePad();
      this.input.endFrame();
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Moving things drawn between fixed steps (A72), and the step counter their records are stamped with. */
  private readonly motion = new MotionInterpolation();
  private simStep = 0;

  /** What moves from step to step: the hero, the camera, residents, bandits, animals (the ridden deer too), arrows. */
  private captureMotion() {
    const objects: (THREE.Object3D | null | undefined)[] = [this.player.group, this.cam.camera];
    for (const n of this.npcs) objects.push(n.rig.root);
    for (const e of this.enemies) objects.push(e.rig.root);
    objects.push(...(this.world.animals.movers?.() ?? []));
    objects.push(...this.hunting.arrows.group.children);
    this.motion.capture(this.simStep, objects);
  }

  /** Draw the frame: the HUD from the latest step, the world between its last two steps. */
  private present(alpha: number) {
    if (this.worldPaused || this.mode === 'loading') return;
    if (this.menuBackgroundActive) {
      this.updateDebug(this.lastFrameDt);
      this.render();
      return;
    }
    this.updateHud(this.lastFrameDt);
    this.hunting.updateHud();
    if (this.panelKind === 'map' && this.mapCanvas) this.renderMap();
    this.updateDebug(this.lastFrameDt);
    this.motion.apply(alpha, this.simStep);
    try {
      this.render();
    } finally {
      this.motion.restore();
    }
  }

  private step(dt: number) {
    if (this.worldPaused) return;
    this.simStep++;
    this.hunting.syncInputMode();
    this.input.poll(dt);
    const state = this.game.state;
    if (this.world && this.worldDirty) {
      this.world.syncStatic(state, false);
      this.worldDirty = false;
    }

    if (this.mode === 'loading') return;
    const overlayAtStart = this.overlay;
    this.handleGlobalInput();

    // The frame in which an overlay closes stays paused, so the press that closed it cannot also act in the world.
    const playing = this.mode === 'play' && this.overlay === 'none' && overlayAtStart === 'none';
    this.audio.setWildlifeActive(playing && document.visibilityState !== 'hidden');
    if (this.bench.active) this.stepBenchmark(dt);
    // Those whose models have come take them where nobody is looking (stage 2), even while a panel holds the world still.
    if (this.arrivals.count && this.world) this.arrivals.update(this.npcAssets, (p) => this.inView(p));

    if (this.menuBackgroundActive) {
      // The menu vigil is cosmetic. No patrols or game clock run beneath it.
      this.menuScene.update(dt, this.settings.reducedMotion, this.audio.menuMusicPlayback);
      // An open headland: wind and distant sea beneath the owner-supplied menu score. The wind rises as each gust the
      // heath shows rolling up the slope reaches the lens.
      const gust = this.menuScene.windAtLens;
      this.audio.update(dt, { nightness: 0.3, waterProximity: 0, seaProximity: 0.32, flow: 0,
        millNear: 0, millTurning: false, windAmount: 0.3 + 0.7 * gust, windTone: 360 + 180 * gust, quarryNear: 0,
        quarryWorking: false, time: this.audioClock, underRoof: false });
      this.audio.updateWorld(dt, null);
      return;
    }
    const hour = hourOfDay(state.clock + this.clockAcc);

    // A sealed archive never traps someone inside: the door and shutter only close behind the player once they are out.
    const inArchive = this.world.insideArchive(this.player.x, this.player.z);
    if (inArchive !== this.archiveWasOccupied) {
      this.archiveWasOccupied = inArchive;
      this.worldDirty = true;
      const lm = this.game.state.locationChanges;
      if (!inArchive && (lm.archive_shutter === 'sealed' || lm.archive_door === 'locked') && this.game.state.facts.archive_reported === true) {
        this.hud.toast(S('toast.archive.sealed_now'), 'bad');
      }
    }
    this.world.playerInArchive = inArchive;

    // Time only passes while the world is running freely.
    if (playing) {
      this.autosaveTimer -= dt;
      if (this.autosaveTimer <= 0) {
        this.autosaveTimer = 90;
        this.autosaveQuiet();
      }
      this.game.addPlaySeconds(dt);
      this.clockAcc += dt * CLOCK_RATE;
      if (this.clockAcc >= 0.5) {
        this.game.tickClock(this.clockAcc);
        this.clockAcc = 0;
      }
    }

    // Camera look
    if (playing) {
      const look = this.input.look(dt);
      this.cam.applyLook(look.yaw, look.pitch, this.input.zoom());
    }
    this.hunting.controls(dt, playing && this.hitStop <= 0);

    // Simulation
    const hitStopped = this.hitStop > 0;
    if (playing && hitStopped) this.hitStop -= dt;
    if (playing && this.mode === 'play' && !hitStopped) {
      this.world.physics.beginCharacter(this.player, dt);
      this.player.update(dt, this.playerContext(true));
      this.carryRider();
      this.updateEnemies(dt);
      this.checkDiscoveries();
    } else if (this.mode === 'dead') {
      this.player.update(dt, this.playerContext(false));
      this.updateEnemies(dt * 0.25);
      this.deathRemaining = Math.max(0, this.deathRemaining - dt);
      if (this.deathRemaining === 0) this.respawn();
    }
    // Reading freezes controller/action timers and patrol routes as well as the world clock.
    if (playing) {
      this.speech.update(dt);
      // Someone in an exchange stops, turns to whom they are talking to and talks with their hands. A passing remark is
      // made on the move: only someone already standing turns to it (A69).
      for (const n of this.npcs) {
        n.speaking = this.speech.speakingFor(n.id) > 0;
        n.talking = this.speech.heldFor(n.id) > 0 || (n.speaking && !n.underway);
        if (!n.talking) n.faceTo = null;
      }
      this.sceneClock += dt;
      if (this.sceneClock > 0.5) {
        this.sceneClock = 0;
        this.overhear(hour);
        const state = this.game.state;
        this.speechSoon = this.npcs
          .filter((n) => !n.hidden && Math.hypot(n.x - this.player.x, n.z - this.player.z) < 30)
          .flatMap((n) => this.speech.soon(n.id, state, hour));
      }
      // Nightfall and dawn, once each, in the hero's words.
      const night = hour >= 20 || hour < 5;
      if (this.wasNight !== null && night !== this.wasNight) this.speech.hero(night ? 'night' : 'dawn', { delay: 1 });
      this.wasNight = night;
      this.updateActors(dt, hour);
      // The hero's breath gives out before he does.
      const health = this.game.state.player.health / Math.max(1, this.game.state.player.maxHealth);
      if (health < 0.3 && this.healthFrac >= 0.3 && this.player.alive) this.speech.hero('wounded', { again: 40 });
      this.healthFrac = health;
    }
    if (playing && this.mode === 'play' && !hitStopped) {
      this.world.physics.syncActors([
        ...this.world.animals.physicalActors,
        ...this.npcs.map(n => ({ id: `person:${n.id}`, x: n.x, y: n.y, z: n.z, radius: .35, height: 2.1,
          active: n.solid && this.game.state.npcs[n.id].available })),
        ...this.enemies.map(e => ({ id: `enemy:${e.id}`, x: e.x, y: e.y, z: e.z, radius: e.radius, height: 2.1, active: e.alive })),
      ]);
      this.world.physics.step(dt, this.player, this.cam.yaw, this.cam.pitch);
    }

    // Interaction
    if (playing) this.updateInteraction();
    else this.hud.setPrompt(null);

    // Channelled action progress
    const ch = this.player.channel;
    this.hud.setChannel(ch && ch.kind !== 'skinning' ? ch.label : null, ch ? ch.t / ch.dur : 0);
    this.world.setWheelTurning(ch && ch.kind !== 'skinning' ? 3 : 0);

    // Bell in the drought
    this.updateBell(dt, playing);

    // Camera follow
    if (this.cam.mode === 'follow' && !this.bench.active) {
      const sitting = 0;
      this.cam.mounted = this.riding;
      this.cam.follow(dt, this.player.x, this.player.y, this.player.z, this.world.terrain, this.world.colliders, this.settings.reducedMotion, this.player.shake, 1.55 + sitting);
      this.cam.clearWater((x, z) => this.world.water.world.surfaceAt(x, z), this.player.swimming);
      this.player.group.visible = this.cam.bodyVisible;
    }

    // World presentation
    this.world.animals.setPeople([
      ...this.npcs.map(n => ({ id: `person:${n.id}`, x: n.x, y: n.y, z: n.z, radius: .35, height: 2.1, active: n.solid && this.game.state.npcs[n.id].available })),
      ...this.enemies.map(e => ({ id: `enemy:${e.id}`, x: e.x, y: e.y, z: e.z, radius: e.radius, height: 2.1, active: e.alive })),
    ]);
    // Interactions can open a panel or kill the player after the frame's initial play flag.
    const worldActive = playing && !hitStopped && this.mode === 'play' && this.overlay === 'none'
      && !this.worldPaused && document.visibilityState !== 'hidden';
    // Residents and bandits walk through the grass as well as the hero; the world adds its animals and cargo.
    this.world.setGrassMovers([
      ...this.npcs.filter((n) => n.solid && this.game.state.npcs[n.id].available).map((n) => ({ x: n.x, z: n.z, radius: 0.5, weight: 0.6 })),
      ...this.enemies.filter((e) => e.alive).map((e) => ({ x: e.x, z: e.z, radius: e.radius + 0.25, weight: 0.8 })),
    ]);
    this.world.update(dt, this.game.state, new THREE.Vector3(this.player.x, this.player.y, this.player.z), this.settings, hour, this.cam.camera, worldActive);
    // Doors swing open for the wanderer and the residents who come to them, and shut behind them (A66); someone only
    // standing near a door, at their place outside it, leaves it shut (A69).
    for (const swing of this.world.updateDoors(worldActive ? dt : 0, [...(this.riding ? [] : [this.player]), ...this.npcs.filter((n) => n.underway)])) this.audio.door(swing.at, swing.open);
    this.hunting.afterWorld(dt, worldActive);
    this.audioUpdate(dt, this.cam.camera.position, hour);

    this.captureMotion();
  }

  private render() {
    if (this.worldPaused) return;
    if (this.menuBackgroundActive) {
      if (!this.menuGraphicsReady) return;
      this.menuScene.prepare(this.renderer);
      this.menuScene.prepareFrame(this.renderer, this.lastFrameDt, this.settings.reducedMotion);
      this.renderer.toneMappingExposure = 1.05 * this.settings.brightness;
      if (!this.worldLook) this.worldLook = this.grade.getLook();
      this.grade.setLook({ ...App.MENU_LOOK, night: 0 });
      this.grade.render(this.menuScene.scene, this.menuScene.camera, this.settings.reducedMotion ? 0 : this.lastFrameDt);
      return;
    }
    this.renderWorld();
  }

  private renderWorld() {
    this.renderer.toneMappingExposure = 1.22;
    if (this.worldLook) {
      this.grade.setLook(this.worldLook);
      this.worldLook = null;
    }
    this.grade.setLook({ night: this.world.sky.state.nightness });
    this.world.prepareGrass(this.renderer, this.lastFrameDt);
    this.world.prepareInterior(this.renderer, this.cam.camera, this.lastFrameDt, this.settings);
    this.grade.render(this.world.scene, this.cam.camera, this.lastFrameDt, this.world.waterRenderInputs(this.settings));
  }

  /** The menu's picture is rougher than play: an old painted backdrop, grainy and darkened at the edges. */
  private static readonly MENU_LOOK = { saturation: 0.9, contrast: 1.07, vignette: 0.3, grain: 0.03, earth: 1, chromatic: 0.0012 };
  private worldLook: ReturnType<Grade['getLook']> | null = null;

  private get menuBackgroundActive() {
    return this.mode === 'title' || (this.panelKind === 'pause' && this.panels.isOpen);
  }

  private syncMenuHudVisibility() {
    if (this.worldPaused) return;
    // Nested pause forms retain the courtyard even though the top panel is now paper.
    const active = this.menuBackgroundActive;
    if (active && !this.menuVisitActive) {
      const previous = this.menuScene.trafficState.seed;
      const entropy = new Uint32Array(1);
      let seed = globalThis.crypto?.getRandomValues
        ? globalThis.crypto.getRandomValues(entropy)[0]!
        : (Date.now() ^ Math.imul(++this.menuVisitCounter, 0x9e3779b9)) >>> 0;
      if (seed === previous) seed = (seed + 1) >>> 0;
      this.menuScene.beginTrafficVisit(seed);
    }
    this.menuVisitActive = active;
    this.hud.el.classList.toggle('menu-hidden', active);
    this.audio.setMenuActive(active);
  }

  /* ============================== input glue ============================== */

  private handleGlobalInput() {
    const inp = this.input;
    if (inp.pressedKey('Backquote') || inp.pressedKey('F3')) this.toggleDebug();
    if (this.mode === 'title') {
      if (inp.pressed('pause') && this.panels.isOpen) this.panels.back();
      this.handleMenuPad();
      return;
    }
    if (inp.pressed('pause')) {
      if (this.panels.isOpen) this.panels.back();
      else if (this.mode === 'play') this.openPause();
    }
    this.handleMenuPad();
    if (this.mode !== 'play') return;
    // Tab, M and I only toggle their own panel; inside another panel Tab is ordinary focus movement.
    const open = this.panels.isOpen;
    const padBusy = inp.device === 'gamepad' && open;
    if (inp.pressed('journal') && !padBusy && (!open || this.panelKind === 'journal')) this.togglePanel('journal');
    if (inp.pressed('map') && (!open || this.panelKind === 'map')) this.togglePanel('map');
    if (inp.pressed('inventory') && !padBusy && (!open || this.panelKind === 'inventory')) this.togglePanel('inventory');
    if (this.overlay === 'none') {
      if (inp.pressed('quicksave')) this.saveTo('quick');
      if (inp.pressed('quickload')) this.loadSlot('quick');
      if (inp.pressed('heal')) this.usePoultice();
      for (let slot = 0; slot < 10; slot++) {
        const key = (slot + 1) % 10;
        if (inp.pressedKey(`Digit${key}`) || inp.pressedKey(`Numpad${key}`)) { this.activateQuickSlot(slot); break; }
      }
    }
  }

  private handleMenuPad() {
    // Gamepad confirm/back inside panels.
    let handled = false;
    if (this.panels.isOpen || this.mode === 'title') {
      if (this.input.padButtonPressed(0)) {
        this.audio.resume();
        if (this.panels.isOpen) this.panels.activateFocused();
        else if (this.titleEl.contains(document.activeElement)) (document.activeElement as HTMLElement).click();
        handled = true;
      }
      if (this.input.padButtonPressed(1) && this.panels.isOpen) {
        this.panels.back();
        handled = true;
      }
    }
    // Menu presses belong to the menu; they must not also become an attack, a dodge or a world interaction.
    if (handled) this.input.consumePad();
  }

  /** Arrow keys move focus between menu items (Tab and Space are left to the browser for focus and activation). */
  private onUiKey(e: KeyboardEvent) {
    if (e.defaultPrevented) return;
    if (this.worldPaused) {
      if (this.worldBuildFailed && !this.loadingScreen && e.code === 'Tab') {
        e.preventDefault();
        this.rebuildRetry?.focus();
      }
      return;
    }
    if (!(this.mode === 'title' || this.panels.isOpen)) return;
    if (this.input.captureNext) return;
    // The open panel's own key (Tab for the journal by default) reaches Input so it toggles the panel shut instead of
    // moving focus (A71).
    const own = this.panelKind === 'journal' || this.panelKind === 'map' || this.panelKind === 'inventory' ? this.panelKind : null;
    if (this.mode === 'play' && own && this.settings.bindings[own].includes(e.code)) return;
    if (this.panels.trapTab(e)) return;
    const el = document.activeElement as HTMLElement | null;
    // The map consumes its arrows/+/- locally; capture-phase menu navigation must not steal those keys first.
    if (el?.matches('.map-wrap canvas')) return;
    if (el?.closest('[role="tablist"]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.code)) return;
    const isRange = el instanceof HTMLInputElement && el.type === 'range';
    const isSelect = el instanceof HTMLSelectElement;
    const vertical = e.code === 'ArrowDown' || e.code === 'ArrowUp';
    const horizontal = e.code === 'ArrowLeft' || e.code === 'ArrowRight';
    if (!vertical && !horizontal) return;
    if (isSelect) return; // arrows change the option natively
    if (isRange && horizontal) return; // arrows adjust the slider natively
    e.preventDefault();
    e.stopPropagation();
    const step = e.code === 'ArrowDown' || e.code === 'ArrowRight' ? 1 : -1;
    if (this.panels.isOpen) this.panels.navigate(horizontal ? step : 0, vertical ? step : 0);
    else {
      const items = [...this.titleEl.querySelectorAll<HTMLElement>('[data-nav]')];
      const i = items.indexOf(el as HTMLElement);
      items[(i + step + items.length) % items.length]?.focus();
    }
    this.audio.uiMove();
  }

  private onPadNavigate(dx: number, dy: number) {
    if (this.worldPaused) {
      if (this.worldBuildFailed && this.loadingScreen) this.loadingScreen.navigate(dx, dy);
      else this.rebuildRetry?.focus();
      return;
    }
    const focused = document.activeElement as HTMLElement | null;
    if (dx !== 0 && dy === 0 && this.panels.isOpen && focused) {
      if (focused instanceof HTMLInputElement && focused.type === 'range') {
        const step = Number(focused.step) || 1;
        focused.value = String(Math.max(Number(focused.min), Math.min(Number(focused.max), Number(focused.value) + dx * step)));
        focused.dispatchEvent(new Event('input', { bubbles: true }));
        this.audio.uiMove();
        return;
      }
      if (focused instanceof HTMLSelectElement) {
        const n = focused.options.length;
        focused.selectedIndex = (focused.selectedIndex + dx + n) % n;
        focused.dispatchEvent(new Event('change', { bubbles: true }));
        this.audio.uiMove();
        return;
      }
    }
    if (this.panels.isOpen) this.panels.navigate(dx, dy);
    else if (this.mode === 'title') {
      const items = [...this.titleEl.querySelectorAll<HTMLElement>('[data-nav]')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (dy || dx) + items.length) % items.length]?.focus();
    }
    this.audio.uiMove();
  }

  private wantLock() {
    if (this.mode !== 'play' || this.overlay !== 'none' || this.worldPaused) return;
    this.wantPlayLock = true;
    this.input.requestPointerLock();
  }

  private releaseLock() {
    this.wantPlayLock = false;
    this.lockingOut = true;
    this.input.exitPointerLock();
    setTimeout(() => (this.lockingOut = false), 100);
  }

  private onPointerLockChange() {
    // A browser may finish an earlier asynchronous request after a modal opens.
    if (this.input.locked && (!this.wantPlayLock || this.mode !== 'play' || this.overlay !== 'none' || this.worldPaused)) {
      this.releaseLock();
      return;
    }
    // Escape while locked exits the lock without a key event; treat it as a request to pause.
    if (!document.pointerLockElement && this.mode === 'play' && this.overlay === 'none' && !this.lockingOut && this.wantPlayLock) {
      this.wantPlayLock = false;
      this.openPause();
    }
  }

  private onPanelsClosed() {
    this.panelKind = 'none';
    this.mapCanvas = null;
    if (this.worldPaused) {
      this.titleEl.inert = this.hud.el.inert = true;
      this.input.uiOpen = true;
      return;
    }
    this.titleEl.inert = false;
    this.input.uiOpen = this.mode !== 'play';
    this.hud.el.inert = this.mode !== 'play';
    if (this.mode === 'title') this.focusTitle();
    if (this.mode === 'play') {
      this.input.uiOpen = false;
      this.wantLock();
    }
  }

  /* ================================ panels ================================ */

  panelCtx(): PanelCtx {
    return {
      game: this.game,
      settings: this.settings,
      saves: this.saves,
      input: this.input,
      host: this.panels,
      toast: (t, k) => this.hud.toast(t, k),
      playerNear: { sluice: false },
      actions: this.panelActions(),
    };
  }

  private panelActions(): PanelActions {
    return {
      resume: () => this.panels.closeAll(),
      save: (slot) => this.saveTo(slot),
      load: (slot) => this.loadSlot(slot),
      newGame: () => this.startNew(),
      quitToTitle: () => this.quitToTitle(),
      useItem: (item) => this.useInventoryItem(item),
      assignQuickSlot: (slot, item) => this.assignQuickSlot(slot, item),
      swapQuickSlots: (from, to) => this.swapQuickSlots(from, to),
      equipWeapon: (item) => this.equipWeapon(item),
      brace: () => this.beginBrace(),
      force: () => this.doForce(),
      commit: (a) => this.doCommit(a),
      applySettings: (reload) => this.applySettings(reload),
      closeAll: () => this.panels.closeAll(),
    };
  }

  private openPause() {
    if (this.worldPaused) return;
    this.panelKind = 'pause';
    this.panels.push(pauseMenu(this.panelCtx()), { narrow: true });
  }

  private togglePanel(kind: 'journal' | 'inventory' | 'map') {
    if (this.worldPaused) return;
    if (this.panelKind === kind && this.panels.isOpen) {
      this.panels.closeAll();
      this.audio.panel(kind, false);
      return;
    }
    if (this.panels.isOpen) this.panels.closeAll();
    this.panelKind = kind;
    this.audio.panel(kind);
    if (kind === 'journal') this.panels.push(journalPanel(this.panelCtx()));
    else if (kind === 'inventory') this.panels.push(inventoryPanel(this.panelCtx()));
    else {
      const { wrap, canvas } = this.mapView.element();
      this.mapCanvas = canvas;
      const close = h('button', { class: 'btn', 'data-nav': true, onClick: () => this.panels.back() }, S('menu.close'));
      this.panels.push(h('div', { class: 'game-record' }, h('h1', {}, S('map.title')), wrap, h('div', { class: 'row', style: { marginTop: '10px' } }, close)));
      this.renderMap();
    }
  }

  private renderMap() {
    if (!this.mapCanvas) return;
    const hint = nextHint(this.game.state);
    this.mapView.render(this.mapCanvas, { state: this.game.state, terrain: this.world.terrain, player: { x: this.player.x, z: this.player.z, yaw: this.player.yaw }, hintPlace: hint.place, guidance: this.settings.guidance, time: this.world.time, reducedMotion: this.settings.reducedMotion });
  }

  openSluice() {
    this.panelKind = 'sluice';
    this.audio.interact();
    this.panels.push(sluicePanel(this.panelCtx()), { refresh: () => sluicePanel(this.panelCtx()) });
  }

  openNotice() {
    this.panelKind = 'notice';
    this.panels.push(noticePanel(this.panelCtx()), { narrow: true });
  }

  openHuntingNotes() {
    this.panelKind = 'other';
    this.panels.push(huntingPanel(this.panelCtx()), { narrow: true });
  }

  /** The saddled deer, the one animal that can be ridden (A70). */
  static readonly MOUNT_ID = '1005232412';

  mountDeer() {
    if (this.mode !== 'play' || this.overlay !== 'none' || this.worldPaused || this.player.mount || !this.player.alive) return;
    if (this.player.mountMove) return;
    const at = this.world.animals?.mount(App.MOUNT_ID);
    if (!at) return;
    // He walks to the deer's side and swings up (A71); the deer is held still meanwhile.
    if (this.player.beginMount(App.MOUNT_ID, at.seat, at, { colliders: this.world.colliders })) this.audio.pickup();
  }

  /** Step down beside the deer (A71); where that cannot be done he is put down at once. */
  dismount() {
    if (!this.player.mount) return;
    const id = this.player.mount.id;
    if (this.player.beginDismount(this.playerContext(false))) return;
    this.world.animals?.ride(id, null);
    this.ridden = null;
  }

  /** Put down at once: deep water, a fall, death, the deer gone (A70). */
  private forceDismount() {
    const id = this.player.mount?.id ?? this.player.mountMove?.id;
    this.player.dismount(this.playerContext(false));
    if (id) this.world.animals?.ride(id, null);
    this.ridden = null;
  }

  /** Whether the camera should ride high: seated, or swinging up or down (A71). */
  private get riding(): boolean {
    return this.player.mount !== null || (this.player.mountMove !== null && this.player.mountMove.kind !== 'approach');
  }

  /** A load made in the saddle puts him back in it once the deer is here (A71). */
  private pendingMount: { id: string; x: number; z: number } | null = null;

  /** The deer carries its rider where he steers; deep water, a fall or death puts him down (A70). */
  private ridden: string | null = null;
  private carryRider() {
    const animals = this.world.animals;
    // Loaded in the saddle: the deer is brought under him as soon as it has arrived (A71).
    if (this.pendingMount) {
      const pending = this.pendingMount, at = animals?.mount(pending.id);
      // Walked off before the deer arrived, he stays afoot.
      if (this.player.mount || this.player.mountMove || !this.player.alive || this.player.swimming ||
        Math.hypot(this.player.x - pending.x, this.player.z - pending.z) > 1) this.pendingMount = null;
      else if (at) {
        this.player.mountUp(pending.id, at.seat, this.player.x, this.player.y, this.player.z, this.player.yaw);
        this.pendingMount = null;
      }
    }
    // Getting up or down, the deer stands still where it is (A71).
    const move = this.player.mountMove;
    if (move) {
      if (!animals?.mount(move.id)) { this.player.cancelMount({ terrain: this.world.terrain }); if (this.ridden) animals?.ride(this.ridden, null); this.ridden = null; return; }
      this.ridden = move.id;
      animals.ride(move.id, { x: move.deer.x, z: move.deer.z, yaw: move.deer.yaw, speed: 0 });
      this.player.setMountGait(null);
      return;
    }
    const mount = this.player.mount;
    // Taken out of the saddle any other way (a load, a respawn, a teleport), the deer is let go too (A70).
    if (!mount) { if (this.ridden) { animals?.ride(this.ridden, null); this.ridden = null; } return; }
    // No deer under him (the animals not yet arrived after a rebuild): he gets down.
    if (!this.player.alive || this.player.swimming || this.player.state !== 'free' || !animals?.mount(mount.id)) { this.forceDismount(); return; }
    this.ridden = mount.id;
    animals.ride(mount.id, { x: this.player.x, z: this.player.z, yaw: this.player.yaw, speed: this.player.rideSpeed });
    // The saddle rises with the deer's stride, and its hooves sound on the ground underfoot (A71).
    const gait = animals.rideGait(mount.id);
    this.player.setMountGait(gait?.phase ?? null);
    for (let i = 0; i < (gait?.footfalls ?? 0); i++) this.audio.hoof(this.player.surface, gait!.gait === 'Run');
  }

  restockArrows() {
    if (this.mode !== 'play' || this.overlay !== 'none' || this.worldPaused) return;
    this.game.setPlayerTransform(this.player.x, this.player.y, this.player.z, this.player.yaw);
    const result = this.game.dispatch({ t: 'restockArrows' });
    if (!result.ok) this.hud.toast(S(`hunting.${result.reason}`, restockParams(this.game.state)), 'bad');
    else this.audio.pickup();
  }

  sellGameMeat() {
    if (this.mode !== 'play' || this.overlay !== 'none' || this.worldPaused || !this.noThreatNear()) return;
    this.game.setPlayerTransform(this.player.x, this.player.y, this.player.z, this.player.yaw);
    const result = this.game.dispatch({ t: 'sellGameMeat' });
    if (!result.ok) this.hud.toast(S(`hunting.${result.reason}`), 'bad');
    else this.audio.pickup();
  }

  /* ========================= silent observation ========================= */

  /**
   * Interacting with a person: they speak their next exchange with the player (A53), still without a dialogue window
   * or a reply to pick (A27). The observation is recorded either way, and shown when they have nothing to say.
   */
  observeNpc(npc: NpcActor) {
    const observation = this.game.observeNpc(npc.id);
    const where = () => {
      const p = npc.headPosition;
      return { x: p.x, y: p.y, z: p.z };
    };
    // While they speak they stop, turn to the player and talk with their hands (NpcActor.talking).
    // Only an exchange that starts turns them to the player; one held in a scene keeps facing their partner (A70).
    if (this.speech.talk(npc.id, where, this.game.state)) npc.faceTo = null;
    else if (observation.ok) this.hud.toast(S(observation.key));
  }

  /** Inspection text is nonblocking; its evidence and personal observations remain in the journal. */
  private showObservation(text: string) {
    this.hud.toast(text, 'evidence');
  }

  /* ============================= interactions ============================= */

  private updateInteraction() {
    const p = this.player, physics = this.world.physics;
    if (p.state !== 'free') { physics.release(); this.hud.setPrompt(null); return; }
    const prop = physics.holding ? null : physics.candidate(p, this.cam.yaw);
    if (this.input.pressed('grab')) {
      if (physics.holding) physics.release();
      else if (prop && physics.grab(prop.id)) this.audio.prop('grab');
    }
    if (physics.holding) {
      if (this.input.pressed('throw')) { physics.throw(this.cam.yaw, this.cam.pitch); this.audio.prop('throw'); }
      else {
        this.target = null;
        this.hud.setPrompt(`${this.input.label('grab', codeLabel)} / ${this.input.label('throw', codeLabel)}`, 'Drop / throw held object');
        return;
      }
    }
    const best = chooseInteractable(this.interactables, p, this.cam.yaw, this.world.terrain, this.world.colliders, (from, to) => physics.occludedByProp(from, to));
    this.target = best;
    if (best) {
      this.hud.setPrompt(this.input.label('interact', codeLabel), best.prompt());
      if (this.input.pressed('interact')) { this.audio.interact(); best.act(); }
    } else if (prop) this.hud.setPrompt(this.input.label('grab', codeLabel), `Lift ${prop.name.toLowerCase()}`);
    else this.hud.setPrompt(null);
  }

  noThreatNear(): boolean {
    for (const e of this.enemies) {
      if (e.alive && e.engaged && Math.hypot(e.x - this.player.x, e.z - this.player.z) < 14) return false;
    }
    return true;
  }

  inspect(pointId: string) {
    const pt = INSPECT_POINTS[pointId];
    if (!pt) return;
    const r = this.game.dispatch({ t: 'inspect', pointId });
    if (!r.ok) {
      this.hud.toast(S('toast.nothing'));
      return;
    }
    if (pointId === 'noticeboard') {
      this.openNotice();
      return;
    }
    this.showObservation(S(pt.noticeKey));
    this.speech.hero(`inspect.${pointId}` as HeroCue, { delay: 0.8 });
  }

  pickup(id: string, item: ItemId, qty: number) {
    const r = this.game.dispatch({ t: 'pickup', pickupId: id, item, qty });
    if (!r.ok) return;
    this.audio.pickup(item);
    this.worldDirty = true;
    if (id === 'quarry_brace') this.hud.toast(S('toast.brace.taken'));
    if (id === 'side_path_cache') this.hud.toast(S('toast.cache'));
    if (id === 'wreck_blade') this.hud.toast(S('toast.blade'));
  }

  pullLever() {
    const r = this.game.dispatch({ t: 'openShortcut' });
    if (!r.ok) return;
    this.audio.worldEvent('lever', '[The trail gate opens]');
    this.hud.toast(S('toast.shortcut'), 'good');
    this.worldDirty = true;
    this.world.syncStatic(this.game.state, false);
    this.world.nav.ensureFresh();
  }

  tryArchiveDoor() {
    const s = this.game.state;
    if (s.facts.archive_access_lost === true) {
      this.hud.toast(S('toast.archive.withdrawn'), 'bad');
      return;
    }
    let cmd: Command | null = null;
    if ((s.inventory.archive_key ?? 0) > 0) cmd = { t: 'archiveAccess', method: 'borrowed_key' };
    else if (hasFact(s, 'edda_permission')) cmd = { t: 'archiveAccess', method: 'permission' };
    if (!cmd) {
      this.hud.toast(S('toast.archive.locked'));
      return;
    }
    const r = this.game.dispatch(cmd);
    if (r.ok) {
      this.hud.toast(S(cmd.t === 'archiveAccess' && cmd.method === 'borrowed_key' ? 'toast.unlocked.key' : 'toast.archive.open'), 'good');
      this.audio.worldEvent('door', '[The archive door opens]');
      this.world.syncStatic(this.game.state, false);
    } else this.hud.toast(S('toast.archive.withdrawn'), 'bad');
  }

  /** Who could plausibly have seen the player at this spot: awake, close, with a clear line of sight. */
  observersAt(x: number, z: number): NpcId[] {
    const out: NpcId[] = [];
    for (const n of this.npcs) {
      // Asleep in their beds, they see nothing (A70).
      if (n.hidden || n.asleep || !this.game.state.npcs[n.id].available) continue;
      if (n.id !== 'shrine_warden' && n.id !== 'spring_steward') continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d > 15) continue;
      const ignore = new Set<string>();
      if (!this.world.colliders.segmentBlocked(n.x, n.z, x, z, ignore)) out.push(n.id);
    }
    return out;
  }

  forceShutter() {
    const seenBy = this.observersAt(this.player.x, this.player.z);
    const r = this.game.dispatch({ t: 'archiveAccess', method: 'trespass', observedBy: seenBy });
    if (!r.ok) {
      this.hud.toast(S(r.reason === 'sealed' ? 'toast.archive.sealed' : 'toast.nothing'));
      return;
    }
    this.audio.worldEvent('shutter', '[The archive shutter is forced open]');
    this.hud.toast(S('toast.archive.forced'));
    this.world.syncStatic(this.game.state, false);
    // A witness cue the player can act on: the observer calls out.
    const w = this.npcs.find((n) => seenBy.includes(n.id));
    if (w?.id === 'shrine_warden') this.bark(w, 'tolan.bark.hey');
    else if (w) this.bubbleState.set(w.id, { text: S('toast.warden.hey'), until: performance.now() + 3600 });
  }

  readLedger() {
    const r = this.game.dispatch({ t: 'readLedger' });
    if (!r.ok) return;
    this.audio.journal();
    this.showObservation(S('narr.ledger'));
  }

  performRite() {
    const s = this.game.state;
    if (!hasFact(s, 'rite_taught') || (s.inventory.votive_reed ?? 0) < 1) {
      this.hud.toast(S('toast.rite.need'));
      return;
    }
    this.player.beginChannel(S('prompt.rite'), 3.0, () => {
      const r = this.game.dispatch({ t: 'performRite' });
      if (r.ok) {
        this.world.playRite();
        this.audio.rite();
        this.hud.toast(S('toast.rite.done', { min: 45 }), 'good');
      }
    });
  }

  checkResult() {
    const r = this.game.dispatch({ t: 'settle', via: 'observation' });
    if (!r.ok) {
      if (r.reason === 'still_applying') this.hud.toast(S('toast.applying'));
      return;
    }
  }

  private beginBrace() {
    this.panels.closeAll();
    this.player.beginChannel(S('sluice.brace.working'), 2.8, () => {
      const r = this.game.dispatch({ t: 'stabilizeGate' });
      if (!r.ok) {
        this.hud.toast(S(`toast.need.${r.reason.replace('need_', '')}`), 'bad');
        return;
      }
      this.audio.worldEvent('sluice', '[The sluice brace locks into place]');
      this.world.syncStatic(this.game.state, false);
      const events = r.events;
      if (events.some((e) => e.t === 'surge')) {
        this.audio.waterSurge();
        this.player.shake = 0.6;
        this.hud.toast(S('toast.surge'), 'bad');
      } else this.hud.toast(S('toast.calm'), 'good');
      this.hud.toast(S('toast.gate.stable'), 'good');
    });
  }

  private doForce() {
    this.panels.closeAll();
    const r = this.game.dispatch({ t: 'forceGate', observedBy: [] });
    if (!r.ok) return;
    this.audio.worldEvent('sluice_jam', '[The sluice jams hard against its frame]');
    this.player.shake = 0.4;
    this.hud.toast(S('toast.gate.jammed'), 'bad');
    this.world.syncStatic(this.game.state, false);
  }

  private doCommit(a: Allocation) {
    const r = this.game.dispatch({ t: 'commitAllocation', allocation: a });
    if (!r.ok) {
      this.hud.toast(S('toast.nothing'));
      return;
    }
    this.panels.closeAll();
    this.audio.waterSurge();
    this.world.syncStatic(this.game.state, false);
    if (a !== 'rotation') this.hud.toast(S('toast.nowitness'));
    this.hud.toast(S(`sluice.alloc.${a}.gain`), 'good');
  }

  private inventoryActionAllowed() {
    return this.mode === 'play' && !this.worldPaused && this.player.alive;
  }

  private assignQuickSlot(slot: number, item: ItemId | null) {
    if (!this.inventoryActionAllowed()) return;
    const result = this.game.dispatch({ t: 'assignQuickSlot', slot, item });
    if (result.ok) this.audio.uiConfirm();
  }

  private swapQuickSlots(from: number, to: number) {
    if (!this.inventoryActionAllowed()) return;
    const result = this.game.dispatch({ t: 'swapQuickSlots', from, to });
    if (result.ok) this.audio.uiConfirm();
  }

  private activateQuickSlot(slot: number) {
    if (!this.inventoryActionAllowed() || this.overlay !== 'none' || !Number.isInteger(slot) || slot < 0 || slot >= 10) return;
    const item = this.game.state.quickSlots[slot];
    if (!item || (this.game.state.inventory[item] ?? 0) <= 0) return;
    this.input.consumePad();
    if (itemAction(item) === 'equip') this.equipWeapon(item);
    else if (itemAction(item) === 'consume') this.useInventoryItem(item);
  }

  private equipWeapon(item: ItemId | null) {
    if (!this.inventoryActionAllowed()) return;
    const previous = this.game.state.equippedWeapon;
    const result = this.game.dispatch({ t: 'equipWeapon', item });
    if (!result.ok) return;
    // Actual equipment events synchronize once. Re-selecting a held blade must preserve its current action.
    if (previous === item && item !== null) this.player.readyWeapon(this.game);
    else if (previous !== item) this.audio.equip(item !== null);
    this.audio.uiConfirm();
  }

  private useInventoryItem(item: ItemId) {
    if (!this.inventoryActionAllowed()) return;
    const before = this.game.state.player.health;
    const result = this.game.dispatch({ t: 'useItem', item });
    if (result.ok) {
      const healed = Math.round(this.game.state.player.health - before);
      this.hud.toast(item === 'poultice' ? S('toast.poultice') : `${S(ITEMS[item].nameKey)} · +${healed} health`, 'good');
      this.audio.consume(item);
    } else if (result.reason === 'already_healthy') this.hud.toast(S('toast.noheal'));
    else if (result.reason === 'missing_item') this.hud.toast(item === 'poultice' ? S('toast.nopoultice') : `${S(ITEMS[item].nameKey)} is no longer carried.`);
  }

  usePoultice() { this.useInventoryItem('poultice'); }

  /* =============================== game events =============================== */

  private onGameEvents(events: GameEvent[]) {
    this.worldDirty = true;
    for (const e of events) {
      switch (e.t) {
        case 'equipment':
          this.inventoryNotesChanged = true;
          this.input.clearToggle('block');
          this.player.syncEquipment(this.game, e.item !== null);
          this.hunting.controls(0, false);
          break;
        case 'quickSlots':
        case 'mapMarker':
          this.inventoryNotesChanged = true;
          break;
        case 'evidence':
          this.hud.toast(S(`toast.evidence.${e.via}`, { name: S(`evidence.${e.id}`) }), 'evidence');
          this.audio.journal();
          break;
        case 'phase':
          if (e.phase === 'settled') {
            this.hud.toast(S('toast.settled'), 'good');
            this.ringBell(true);
            this.speech.hero('settled', { delay: 2 });
          } else this.audio.quest();
          break;
        case 'grant':
          for (const [id, qty] of Object.entries(e.items) as [ItemId, number][]) this.hud.toast(S('toast.item.gain', { qty, name: S(ITEMS[id].nameKey) }), 'good');
          this.audio.pickup(Object.keys(e.items)[0] as ItemId | undefined);
          break;
        case 'item':
          if (e.delta > 0) this.hud.toast(S('toast.item.gain', { qty: e.delta, name: S(ITEMS[e.id].nameKey) }), 'good');
          if (e.delta > 0) this.speech.hero(e.id === 'rusted_sword' ? 'blade' : (`item.${e.id}` as HeroCue), { delay: 0.6 });
          else if (e.id !== 'sluice_brace' && e.id !== 'votive_reed' && e.id !== 'arrow') this.hud.toast(S('toast.item.lose', { qty: -e.delta, name: S(ITEMS[e.id].nameKey) }));
          break;
        case 'toast':
          if (e.key.startsWith('hunting.')) this.hud.toast(S(e.key, e.params));
          break;
        case 'wildlifeReturned':
          // Game has come back to the woods, out of sight (A70).
          this.world.animals?.syncHunting(this.game.state.hunting);
          break;
        case 'skill':
          this.hud.toast(S('toast.skill', { name: S(`skill.${e.id}`) }), 'good');
          this.audio.quest();
          break;
        case 'place':
          this.hud.toast(S('toast.place', { name: S(`place.${e.id}`) }), 'evidence');
          this.audio.discover(e.id);
          this.speech.hero(`place.${e.id}` as HeroCue, { delay: 1.2 });
          // Discovering somewhere new moves the respawn point there.
          this.markCheckpoint();
          break;
        case 'shortcut':
          this.speech.hero('shortcut', { delay: 1 });
          break;
        case 'rite':
          this.speech.hero('rite', { delay: 2 });
          break;
        case 'gate':
          if (e.gate === 'stabilized' || e.gate === 'jammed') this.speech.hero(`gate.${e.gate}`, { delay: 1 });
          break;
        case 'worker_rescued':
          this.speech.hero('rescued', { delay: 2.5 });
          this.hud.toast(S(e.method === 'shortcut' ? 'toast.shortcut.rescued' : 'toast.rescued'), 'good');
          this.audio.quest();
          break;
        case 'autosave':
          this.autosave(e.reason);
          break;
        default:
          break;
      }
    }
  }

  /* ================================= saving ================================= */

  private stamp() {
    this.game.setPlayerTransform(this.player.x, this.player.y, this.player.z, this.player.yaw);
    // Saved in the saddle, a load puts him back in it (A71); getting up or down saves him afoot.
    // A rider loaded in the saddle whose deer has not arrived yet is still riding it (A71).
    this.game.state.player.mount = this.player.mount?.id ?? this.pendingMount?.id ?? null;
    this.game.state.physicalObjects = this.world.physics.snapshot().map(({ id, position, rotation }) => ({ id, position, rotation }));
  }

  saveTo(slot: SlotId): PanelSaveResult {
    if (this.worldPaused || this.mode !== 'play' || !this.world || this.worldDisposed) {
      return { ok: false, message: S('menu.saveUnavailable') };
    }
    this.stamp();
    const r = this.saves.save(slot, this.game.state);
    if (r.ok) this.hud.toast(S('menu.saved', { slot: S(`menu.slot.${slot}`) }), 'good');
    else this.hud.toast(S('menu.savefailed', { reason: r.message }), 'bad');
    return r;
  }

  /** The respawn point follows the player, but never to where a living enemy would meet him again (A70). */
  private markCheckpoint() {
    const p = this.player;
    if (this.enemies.some(e => e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 18)) return;
    this.checkpoint = { x: p.x, y: p.y, z: p.z, yaw: p.yaw };
  }

  private autosave(reason: string) {
    if (this.mode !== 'play' || this.worldPaused) return;
    this.stamp();
    const r = this.saves.save('auto', this.game.state);
    if (r.ok) {
      this.markCheckpoint();
      this.hud.toast(S('menu.saved', { slot: S('menu.slot.auto') }));
    } else this.hud.toast(S('menu.savefailed', { reason: r.message }), 'bad');
    void reason;
  }

  /** A brand-new run that has done nothing yet must not replace an earlier autosave. */
  private hasProgress(): boolean {
    const s = this.game.state;
    // Loose provisions and deliberate binding/pin edits are progress before the investigation or timed autosave.
    return s.quest.phase !== 'unseen'
      || Object.keys(s.evidence).length > 0
      || Object.keys(s.grants).length > 0
      || Object.entries(s.locationChanges).some(([key, value]) => key.startsWith('pickup:') && value === 'taken')
      || this.inventoryNotesChanged
      || s.quickSlots.some((item) => item !== null)
      || s.equippedWeapon !== null
      || Object.keys(s.hunting).length > 0
      || s.mapMarker !== null
      || s.playSeconds > 90;
  }

  private autosaveQuiet() {
    // Backgrounding can happen while the old graphics/physics world has been
    // disposed and its replacement is still loading. Never snapshot that gap.
    if (this.mode !== 'play' || this.worldPaused || !this.hasProgress()) return;
    this.stamp();
    this.saves.save('auto', this.game.state);
  }

  loadSlot(slot: SlotId) {
    if (this.worldPaused) return;
    const r = this.saves.load(slot);
    if (!r.ok) {
      this.hud.toast(S('menu.loadfailed', { reason: r.message }), 'bad');
      if (this.mode === 'title') this.panels.push(h('div', {}, h('h1', {}, S('menu.load')), h('p', {}, S('menu.loadfailed', { reason: r.message })), h('div', { class: 'row' }, h('button', { class: 'btn', 'data-nav': true, onClick: () => this.panels.back() }, S('menu.back')))), { narrow: true });
      return;
    }
    if (!this.world) {
      this.requestInitialJourney(r.state, { recovered: r.recovered }, () => {
        this.beginPlay({ recovered: r.recovered });
        this.hud.toast(S('menu.loaded'));
      });
      return;
    }
    this.game.replaceState(r.state);
    this.beginPlay({ recovered: r.recovered });
    this.hud.toast(S('menu.loaded'));
  }

  /* ============================== per-frame parts ============================== */

  private actorContext(): ActorContext {
    return {
      terrain: this.world.terrain,
      colliders: this.world.colliders,
      wildlifeContacts: this.world.animals.contacts,
      nav: this.world.nav,
      state: this.game.state,
      hour: hourOfDay(this.game.state.clock + this.clockAcc),
      player: { x: this.player.x, z: this.player.z, y: this.player.y },
      reducedMotion: this.settings.reducedMotion,
      onBark: (a, text) => this.mode === 'play' && this.settings.barks && this.bark(a, text),
      // A fight wakes the sleepers near it (A70).
      alarms: this.enemies.filter(en => en.alive && en.engaged).map(en => ({ x: en.x, z: en.z })),
    };
  }

  private updateActors(dt: number, hour: number) {
    const ctx = this.actorContext();
    ctx.hour = hour;
    const contacts = this.npcs.map(n => this.residentContact(n));
    ctx.residentContacts = [...contacts, ...this.enemies.map(e => this.enemyContact(e))];
    for (let i = 0; i < this.npcs.length; i++) {
      const n = this.npcs[i]!;
      n.update(dt, ctx);
      // Later residents see this frame's resolved stance, including a newly arrived person.
      Object.assign(contacts[i]!, this.residentContact(n));
    }
  }

  private residentContact(n: NpcActor): CircleCollider {
    return { id: `person:${n.id}`, kind: 'circle', x: n.x, z: n.z, r: .35,
      active: n.solid && this.game.state.npcs[n.id].available, minY: n.y, maxY: n.y + n.rig.height };
  }

  private enemyContact(e: EnemyActor): CircleCollider {
    return { id: `enemy:${e.id}`, kind: 'circle', x: e.x, z: e.z, r: e.radius,
      active: e.alive, minY: e.y, maxY: e.y + e.rig.height };
  }

  /** Two people near each other may talk between themselves when the player comes close enough to overhear. */
  private overhear(hour: number) {
    const state = this.game.state;
    const day = clockDay(state.clock);
    for (const scene of SCENES) {
      if (!inHours(hour, scene.hours) || !evalAll(state, scene.when)) continue;
      const [a, b] = scene.cast.map((id) => this.npcs.find((n) => n.id === id));
      if (!a || !b || a.hidden || b.hidden || a.asleep || b.asleep || !state.npcs[a.id].available || !state.npcs[b.id].available) continue;
      // Only two people at their places talk between themselves: neither is stopped and turned about mid-route (A69).
      if (a.underway || b.underway) continue;
      if (Math.hypot(a.x - b.x, a.z - b.z) > 22) continue;
      if (Math.hypot(this.player.x - (a.x + b.x) / 2, this.player.z - (a.z + b.z) / 2) > 16) continue;
      const where = (id: NpcId) => {
        const p = (id === a.id ? a : b).headPosition;
        return { x: p.x, y: p.y, z: p.z };
      };
      if (this.speech.scene(scene, day, where)) {
        a.faceTo = b;
        b.faceTo = a;
        return;
      }
    }
  }

  /** Stops all speech and its words over people's heads (a load, a panel, death, the title) (A70). */
  private clearSpeech() {
    this.speech.clear();
    this.bubbleState?.clear();
  }

  /** A remark (a line in voice.ts), voiced from where the person stands, with its words above their head. */
  bark(a: NpcActor, line: string): boolean {
    if (a.def.approachGreeting && this.audio.speechPlaybackPending) return false;
    const text = VOICE_LINES[line]?.text;
    if (!text || this.speech.busyFor(a.id) > 0) return false;
    // Heard from where they are as they say it: a remark made on the way walks on with them (A70).
    const seconds = this.speech.remark(a.id, line, () => { const p = a.headPosition; return { x: p.x, y: p.y, z: p.z }; });
    if (seconds <= 0) return false;
    this.bubbleState.set(a.id, { text: shown(text), until: performance.now() + Math.max(3600, seconds * 1000 + 800) });
    return true;
  }

  private playerContext(controllable: boolean) {
    return {
      terrain: this.world.terrain,
      colliders: this.world.colliders,
      physics: this.world.physics,
      water: this.world.water,
      input: this.input,
      settings: this.settings,
      game: this.game,
      audio: this.audio,
      enemies: this.enemies,
      npcs: this.npcs,
      wildlifeContacts: this.world.animals.contacts,
      viewYaw: this.cam.yaw,
      controllable: controllable && this.overlay === 'none',
      onHitEnemy: (e: EnemyActor, killed: boolean, heavy: boolean) => {
        this.hitStop = heavy ? 0.07 : 0.04;
        if (killed) this.onEnemyDefeated(e);
      },
      onHurt: (damage: number, blocked: boolean) => {
        this.vignetteLevel = blocked ? 0.25 : Math.min(1, 0.45 + damage / 40);
      },
      onDeath: () => this.onPlayerDeath(),
      onBoundary: () => this.hud.toast(S('toast.boundary')),
    };
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const enemyContacts = this.enemies.map(e => this.enemyContact(e));
    const ctx: EnemyContext = {
      terrain: this.world.terrain,
      colliders: this.world.colliders,
      nav: this.world.nav,
      contacts: [...this.world.animals.contacts, ...this.npcs.map(n => this.residentContact(n)), ...enemyContacts,
        { id: 'player', kind: 'circle', x: p.x, z: p.z, r: .32, active: p.alive, minY: p.y, maxY: p.y + 1.8 }],
      player: { x: p.x, z: p.z, y: p.y, alive: p.alive, invulnerable: p.invulnerable },
      reducedMotion: this.settings.reducedMotion,
      strikePlayer: (e, dmg, heavy) => p.receiveHit(dmg, heavy, e, this.playerContext(true)),
      onGrowl: (e) => {
        const at = { x: e.x, y: e.y + 1.2, z: e.z };
        if (e.spawn.kind === 'thornback') {
          this.audio.growl(at);
          this.speech.hero('beast', { delay: 0.7 });
        }
        else this.audio.shout(at);
      },
      time: this.world.time,
    };
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!;
      if (!(this.game.state.defeated[e.id] && !e.alive && e.fade <= 0)) e.update(dt, ctx);
      Object.assign(enemyContacts[i]!, this.enemyContact(e));
    }
  }

  private onEnemyDefeated(e: EnemyActor) {
    this.game.dispatch({ t: 'defeat', id: e.id });
    // The fight is won when nobody else is still on the player.
    if (!this.enemies.some((o) => o !== e && o.alive && o.engaged)) this.audio.victory();
    if (e.id === 'cut_creature') {
      this.hud.toast(S('toast.cleared'), 'good');
      this.speech.hero('victory', { delay: 0.8 });
    }
  }

  private onPlayerDeath() {
    this.hunting.reset();
    this.audio.setWildlifeActive(false);
    this.clearSpeech();
    this.world.physics.release();
    this.audio.death();
    this.mode = 'dead';
    this.hud.showFade(true, S('hud.fallen.title'), S('hud.fallen.body'));
    this.deathRemaining = 3.6;
    this.input.reset();
  }

  private respawn() {
    if (this.mode !== 'dead') return;
    this.game.dispatch({ t: 'healPlayer', amount: 100 });
    const cp = this.safePosition(this.checkpoint.x, this.checkpoint.z, this.checkpoint.y);
    this.player.setPosition(cp.x, cp.z, this.checkpoint.yaw, this.world.terrain, cp.y);
    this.player.stamina = 100;
    for (const e of this.enemies) e.reset(this.world);
    this.hud.showFade(false);
    this.mode = 'play';
    this.cam.yaw = this.checkpoint.yaw;
    this.cam.reset();
    this.hitStop = 0;
    this.autosaveTimer = 90; // the countdown restarts with the life, as it does with a load (A71)
    this.input.reset();
    this.speech.hero('respawn', { delay: 1, again: 1 });
    // Escape or leaving the window during the fall could not pause a dead player; it pauses now, rather than the world
    // running on unattended and uncaptured (A70).
    const unfocused = typeof document.hasFocus === 'function' && !document.hasFocus();
    if (!this.bench.active && (unfocused || (this.wantPlayLock && !this.input.locked))) this.openPause();
  }

  private checkDiscoveries() {
    const s = this.game.state;
    for (const [id, p] of Object.entries(PLACES) as [PlaceId, { x: number; z: number; r: number }][]) {
      if (s.discovered[id]) continue;
      if (Math.hypot(this.player.x - p.x, this.player.z - p.z) < p.r) this.game.dispatch({ t: 'discover', place: id });
    }
  }

  /* ======================= the bell and other ambient life ======================= */

  private updateBell(dt: number, playing: boolean) {
    if (!playing) return;
    const v = this.world.view;
    this.bellClock -= dt;
    if (this.bellClock <= 0) {
      if (v.bellMode === 'drought') this.ringBell(false);
      this.bellClock = v.bellMode === 'drought' ? 42 : 9999;
    }
  }

  ringBell(bright: boolean) {
    this.world.ringBell();
    const pos = this.world.bellPosition;
    const d = Math.hypot(this.player.x - pos.x, this.player.z - pos.z);
    const gain = Math.max(0, 1 - d / 220);
    const times = bright ? 3 : 2;
    const at = { x: pos.x, y: pos.y + 3.5, z: pos.z };
    for (let i = 0; i < times; i++) setTimeout(() => this.audio.bell(gain, bright, at, i), i * (bright ? 600 : 1400));
    if (gain > 0.15) this.audio.caption(S(bright ? 'toast.caption.bell.allclear' : 'toast.caption.bell'));
  }

  private audioUpdate(dt: number, camPos: THREE.Vector3, hour: number) {
    const v = this.world.view;
    const w = this.world.waterProximity(camPos.x, camPos.z);
    const millD = Math.hypot(camPos.x + 14, camPos.z + 8);
    const quarryD = Math.hypot(camPos.x - 92, camPos.z + 26);
    const indoors = this.world.underRoof(camPos.x, camPos.y, camPos.z);
    this.audio.update(dt, {
      nightness: this.world.sky.state.nightness,
      waterProximity: w,
      flow: v.flow.main,
      millNear: Math.max(0, 1 - millD / 40),
      millTurning: v.millTurning,
      // Higher ground is windier; each gust that crosses the grass and the crowns is heard as it passes.
      windAmount: Math.min(1, (0.3 + camPos.y / 60) * (0.62 + 0.7 * Math.min(1, this.world.grassWind.pushAt(camPos.x, camPos.z) / (REALM_WIND.steady + REALM_WIND.gust)))),
      quarryNear: Math.max(0, 1 - quarryD / 60),
      quarryWorking: v.quarryState === 'working' || v.quarryState === 'night_shift',
      time: this.audioClock,
      underRoof: indoors,
      seaProximity: Math.exp(-Math.max(0, camPos.x - coastX(camPos.z)) / 95),
      windTone: windTone(camPos.x, camPos.z),
    });
    const forward = this.cam.camera.getWorldDirection(this.listenerForward);
    const p = this.player;
    this.audio.updateWorld(dt, {
      mode: this.mode === 'dead' ? 'dead' : this.mode === 'play' && this.overlay === 'none' ? 'play' : 'paused',
      listener: { x: camPos.x, y: camPos.y, z: camPos.z, fx: forward.x, fy: forward.y, fz: forward.z },
      player: { x: p.x, y: p.y, z: p.z, exhausted: p.exhausted, health: this.game.state.player.health / Math.max(1, this.game.state.player.maxHealth) },
      world: {
        hour,
        nightness: this.world.sky.state.nightness,
        flows: v.flow,
        millTurning: v.millTurning,
        quarryWorking: v.quarryState === 'working' || v.quarryState === 'night_shift',
      },
      indoors,
      threat: threatFrom(this.enemies, p.x, p.z),
      npcs: this.npcs,
      enemies: this.enemies,
      props: this.world.physics.motions(),
      terrain: this.world.terrain,
      speech: this.speechSoon,
      water: this.world.water.soundState(camPos.x, camPos.y, camPos.z, dt),
    });
  }

  /* ==================================== HUD ==================================== */

  private project(v: THREE.Vector3): { x: number; y: number; on: boolean } {
    const p = v.clone().project(this.cam.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, on: p.z >= -1 && p.z <= 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 };
  }

  private updateHud(dt: number) {
    if (this.mode === 'title') return;
    const s = this.game.state;
    const hint = nextHint(s);
    const obj = this.settings.guidance ? S(huntingHint(s) ?? hint.key, restockParams(s)) : null;
    this.hud.update({
      health: s.player.health,
      maxHealth: s.player.maxHealth,
      // In the saddle the bar shows the deer's gallop stamina (A71).
      stamina: this.player.mount ? this.player.mountStamina : this.player.stamina,
      exhausted: this.player.mount ? this.player.mountSpent : this.player.exhausted,
      coin: s.inventory.coin ?? 0,
      quickSlots: s.quickSlots,
      inventory: s.inventory,
      equippedWeapon: s.equippedWeapon,
      // Day and time from the same moment, so the day turns over with the clock at midnight.
      timeText: S('hud.time', { n: clockDay(s.clock + this.clockAcc) + 1, time: formatClock(s.clock + this.clockAcc) }),
      objective: obj,
      fps: this.settings.showFps ? S('hud.fps', { fps: Math.round(this.fpsSmooth), ms: (1000 / Math.max(1, this.fpsSmooth)).toFixed(1) }) : null,
      blocking: this.player.blocking,
      heading: this.cam.yaw,
      accessKeys: { inventory: this.input.label('inventory', codeLabel), journal: this.input.label('journal', codeLabel), map: this.input.label('map', codeLabel) },
    });
    // Ambient remarks and nameplates
    const now = performance.now();
    const bubbles = [];
    for (const [id, b] of this.bubbleState) {
      if (b.until < now) {
        this.bubbleState.delete(id);
        continue;
      }
      const npc = this.npcs.find((n) => n.id === id);
      if (!npc || npc.hidden) continue;
      const pr = this.project(npc.headPosition);
      if (pr.on) bubbles.push({ id, x: pr.x, y: pr.y - 6, text: b.text });
    }
    this.hud.setBubbles(bubbles);
    const tags = [];
    if (this.target && this.target.id.startsWith('npc:') && this.overlay === 'none') {
      const npc = this.npcs.find((n) => `npc:${n.id}` === this.target!.id);
      if (npc) {
        const pr = this.project(npc.headPosition);
        if (pr.on) tags.push({ id: npc.id, x: pr.x, y: pr.y - 22, text: NPCS[npc.id].name });
      }
    }
    let threat: string | null = null;
    for (const e of this.enemies) {
      if (!e.alive || !e.engaged) continue;
      const pr = this.project(e.headPosition);
      if (pr.on) tags.push({ id: e.id, x: pr.x, y: pr.y - 6, text: e.name, frac: e.hp / e.maxHp });
      if (e.telegraphing) threat = S('hud.threat');
    }
    this.hud.setTags(tags);
    this.hud.setThreat(threat);
    this.vignetteLevel = Math.max(0, this.vignetteLevel - dt * 1.8);
    this.hud.setVignette(this.settings.reducedMotion ? this.vignetteLevel * 0.5 : this.vignetteLevel);
    void this.threatUntil;
    void this.lastActiveNpcTag;
    void this.lastHint;
  }

  /* ================================== debug ================================== */

  private recordFrame(dt: number) {
    const ms = dt * 1000;
    this.frameTimes.push(ms);
    if (this.frameTimes.length > 900) this.frameTimes.shift();
    this.fpsSmooth += (1 / Math.max(dt, 0.0005) - this.fpsSmooth) * 0.05;
    if (this.bench.active) this.bench.frames.push(ms);
  }

  frameStats() {
    const a = [...this.frameTimes].sort((x, y) => x - y);
    const q = (p: number) => a[Math.min(a.length - 1, Math.floor(a.length * p))] ?? 0;
    return { frames: a.length, median: q(0.5), p95: q(0.95), p99: q(0.99), max: a[a.length - 1] ?? 0 };
  }

  toggleDebug() {
    if (!this.world || this.worldPaused) return;
    const on = this.debugEl.style.display === 'none';
    this.debugEl.style.display = on ? '' : 'none';
    if (on) this.buildDebug();
  }

  private buildDebug() {
    clear(this.debugEl);
    const btn = (label: string, fn: () => void) => h('button', { class: 'btn', onClick: fn }, label);
    const place = (id: PlaceId) => btn(S(`place.${id}`), () => this.teleport(id));
    this.debugEl.append(
      h('h2', {}, S('debug.title')),
      h('p', { class: 'muted' }, S('debug.note')),
      this.debugPre,
      h('h2', {}, 'Teleport'),
      h('div', { class: 'pillrow' }, (Object.keys(PLACES) as PlaceId[]).map(place)),
      h('h2', {}, 'Authored test conditions'),
      h('div', { class: 'pillrow' },
        btn('Take repair kit', () => this.debugKit()),
        btn('Reveal all evidence', () => this.debugEvidence()),
        btn('Grant all consents', () => this.debugConsents()),
        btn('Brace gate now', () => this.debugBrace()),
        btn('Time → dawn', () => this.debugTime(6)),
        btn('Time → noon', () => this.debugTime(12)),
        btn('Time → night', () => this.debugTime(22)),
        btn('Toggle Mara absent', () => this.debugToggleNpc('rillford_reeve')),
        btn('Toggle Edda absent', () => this.debugToggleNpc('spring_steward')),
        btn('Toggle Darin absent', () => this.debugToggleNpc('quarry_foreman')),
        btn('Toggle Ila absent', () => this.debugToggleNpc('maintenance_worker')),
        btn('Heal + stamina', () => this.debugHeal()),
      ),
      h('h2', {}, 'Menu score timing'),
      h('p', { class: 'small' }, 'Seeks the actual menu song for doorway, wisp and loop review; has no effect in gameplay.'),
      h('div', { class: 'pillrow' }, ...[28, 30, 33, 60, 75, 110, 205, 211].map((time) => btn(`Score → ${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`, () => this.audio.seekMenuMusic(time)))),
      h('h2', {}, 'Benchmark'),
      h('p', { class: 'muted' }, new URLSearchParams(location.search).get('review') === 'water' && new URLSearchParams(location.search).has('shot')
        ? 'Runs a 12 s shoreline camera review up to 5.85 m/s, retaining reflected land and shallow water in view. Reports frame times for this device and quality preset.'
        : 'Runs a fixed camera route from the landing through the woodland and town (about 72 s) and reports median/95th/99th percentile frame times for this device, renderer and quality preset.'),
      h('div', { class: 'pillrow' }, btn('Run benchmark route', () => this.startBenchmark()), btn('Copy report', () => navigator.clipboard?.writeText(this.debugPre.textContent ?? ''))),
    );
  }

  private updateDebug(dt: number) {
    if (!this.world || this.debugEl.style.display === 'none') return;
    this.debugTimer -= dt;
    if (this.debugTimer > 0) return;
    this.debugTimer = 0.4;
    const info = this.renderer.info;
    const st = this.frameStats();
    const s = this.game.state;
    const audio = this.audio.diagnostics;
    const hero = this.player.rig.hero?.diagnostics;
    const lines = [
      `frames ${st.frames}  median ${st.median.toFixed(1)} ms  p95 ${st.p95.toFixed(1)}  p99 ${st.p99.toFixed(1)}  max ${st.max.toFixed(1)}`,
      `draw calls ${info.render.calls}  triangles ${info.render.triangles}  geometries ${info.memory.geometries}  textures ${info.memory.textures}`,
      `modules: ${this.world.modules.map((m) => `${m.name} ${JSON.stringify(m.module.stats?.() ?? {})}`).join(' | ')}  build ${this.world.buildStats.ms.toFixed(0)} ms`,
      `build ${GAME_VERSION} rev ${REVISION}  quality ${this.settings.quality}  dpr ${this.renderer.getPixelRatio()}  ${window.innerWidth}x${window.innerHeight}`,
      `audio ${audio.state}  voices ${audio.voices}  ${audio.sampleRate} Hz  device-reported base buffer ${audio.baseLatency === null ? 'unavailable' : `${(audio.baseLatency * 1000).toFixed(1)} ms`}`,
      `menu score ${audio.music.state}  ${audio.music.currentTime.toFixed(1)} / ${Number.isFinite(audio.music.duration) ? audio.music.duration.toFixed(1) : 'loading'} s`,
      audio.world ? `world sound ${audio.world.banksReady ? 'ready' : 'loading'}  voices ${audio.world.voices}  beds ${audio.world.beds}  calls ${audio.world.emitted}  dropped ${audio.world.dropped}  errors ${audio.world.decodeErrors}  score ${audio.world.score.phase} ${audio.world.score.piece ?? audio.world.score.loop ?? '-'}  inn ${audio.world.score.song ?? '-'}` : 'world sound not started',
      `menu ships ${this.menuScene.stats.ships}  visit ${this.menuScene.trafficState.seed.toString(16)}  ${this.menuScene.trafficState.elapsed.toFixed(1)} s`,
      `menu grove ${this.menuScene.stats.wisps} of ${this.menuScene.grove.count} spirits drawn  sim ${this.menuScene.grove.stats.steps} steps  score ${this.menuScene.awakeningState.time.toFixed(2)} s  door ${(this.menuScene.doorOpening * 100).toFixed(0)}%  audible ${this.audio.menuMusicPlayback.playing} gain ${this.audio.menuMusicPlayback.gain.toFixed(3)}`,
      `player ${this.player.x.toFixed(1)}, ${this.player.y.toFixed(1)}, ${this.player.z.toFixed(1)}  hp ${s.player.health}  clock ${formatClock(s.clock)} day ${clockDay(s.clock) + 1}`,
      hero ? `hero ${hero.activeClip}  phase ${hero.phase.toFixed(3)}  cycle ${hero.cycleMetres.toFixed(3)} m  resolved speed ${this.player.lastMoveSpeed.toFixed(2)} m/s  grounded ${hero.grounded}` : 'hero provisional rig',
      `phase ${s.quest.phase}  gate ${s.quest.gate}  alloc ${s.quest.allocation ?? '-'}  entry ${s.quest.entry ?? '-'}`,
      `evidence ${EVIDENCE_IDS.filter((e) => s.evidence[e]).join(', ') || '-'}`,
      `facts ${Object.keys(s.facts).sort().join(', ') || '-'}`,
      `defeated ${Object.keys(s.defeated).join(', ') || '-'}  pending reports ${s.offenses.pending.length}  known ${s.offenses.known.length}`,
      this.bench.result ? `\nBENCHMARK\n${this.bench.result}` : '',
    ];
    this.debugPre.textContent = lines.join('\n');
  }

  teleport(id: PlaceId) {
    const p = PLACES[id];
    const c = this.world.nav.nearestOpen(p.x, p.z, 12);
    const pos = c ? this.world.nav.cellCenter(c.i, c.j) : { x: p.x, z: p.z };
    this.player.setPosition(pos.x, pos.z, this.player.yaw, this.world.terrain);
    this.cam.reset();
    this.cam.follow(1, pos.x, this.player.y, pos.z, this.world.terrain, this.world.colliders, true, 0);
  }

  private debugKit() {
    this.game.dispatch({ t: 'pickup', pickupId: 'wreck_blade', item: 'rusted_sword', qty: 1 });
    this.game.dispatch({ t: 'pickup', pickupId: 'quarry_brace', item: 'sluice_brace', qty: 1 });
    this.game.dispatch({ t: 'pickup', pickupId: 'quarry_wrench', item: 'gate_wrench', qty: 1 });
    this.worldDirty = true;
  }

  private debugEvidence() {
    for (const p of ['dry_channel', 'spring_sediment', 'town_diversion', 'quarry_seep', 'sluice_crack']) this.game.dispatch({ t: 'inspect', pointId: p });
    this.worldDirty = true;
  }

  private debugConsents() {
    for (const k of ['consent_mara', 'consent_edda', 'consent_darin']) this.game.dispatch({ t: 'setFact', key: k, value: true });
  }

  private debugBrace() {
    this.debugKit();
    this.debugEvidence();
    this.game.dispatch({ t: 'stabilizeGate' });
    this.worldDirty = true;
  }

  private debugTime(hour: number) {
    const s = this.game.state;
    const day = Math.floor(s.clock / 1440);
    const target = day * 1440 + hour * 60;
    this.game.tickClock(target > s.clock ? target - s.clock : target + 1440 - s.clock);
    for (const n of this.npcs) n.snapToGoal(this.actorContext());
  }

  private debugToggleNpc(npc: NpcId) {
    const avail = this.game.state.npcs[npc].available;
    this.game.dispatch(avail ? { t: 'setUnavailable', npc, cause: 'debug' } : { t: 'setAvailable', npc });
  }

  private debugHeal() {
    this.game.dispatch({ t: 'healPlayer', amount: 100 });
    this.player.stamina = 100;
  }

  private startBenchmark() {
    const T = this.world.terrain;
    const H = (x: number, z: number, up: number) => new THREE.Vector3(x, T.heightAt(x, z) + up, z);
    // Query-only water review reuses the native F3 benchmark button. Its
    // 23.4 m / 6 s smooth segment reaches the authored 5.85 m/s running speed
    // while keeping the reflected coast in view, without synthetic key events.
    const waterReview = new URLSearchParams(location.search).has('shot')
      && new URLSearchParams(location.search).get('review') === 'water';
    const route: { p: THREE.Vector3; look: THREE.Vector3 }[] = waterReview ? [
      { p: H(-268, 27, 2.6), look: new THREE.Vector3(-334, 5, 108) },
      { p: H(-268, 50.4, 2.6), look: new THREE.Vector3(-334, 5, 108) },
      { p: H(-268, 27, 2.6), look: new THREE.Vector3(-334, 5, 108) },
    ] : [
      { p: H(SPAWN.x, SPAWN.z, 3), look: H(-243, 22, 2) },
      { p: H(-224, 22, 2.6), look: H(-202, 12, 3) },
      { p: H(-178, 12, 2.6), look: H(-150, 24, 3) },
      { p: H(-128, 22, 3), look: H(-90, 18, 2) },
      { p: H(-60, 16, 2.5), look: H(0, 8, 2) },
      { p: H(-8, 20, 2.2), look: H(10, 4, 2) },
      { p: H(24, -10, 2.5), look: H(6, -50, 2) },
      { p: H(0, -52, 2.5), look: H(-12, -90, 4) },
      { p: H(-6, -80, 3), look: H(-26, -104, 5) },
      { p: H(30, 6, 3), look: H(80, -20, 3) },
      { p: H(80, -12, 3), look: H(96, -32, 4) },
      { p: H(70, 30, 3), look: H(30, 12, 2) },
      { p: H(-70, 30, 12), look: H(20, -30, 4) },
    ];
    this.cam.mode = 'bench';
    this.cam.benchPath = route;
    this.cam.benchT = 0;
    this.bench = { active: true, frames: [], startedAt: performance.now(), result: null };
    this.panels.closeAll();
    this.debugEl.style.display = 'none';
  }

  private stepBenchmark(dt: number) {
    const done = this.cam.bench(dt);
    if (done) {
      this.cam.mode = 'follow';
      const a = [...this.bench.frames].sort((x, y) => x - y);
      const q = (p: number) => a[Math.min(a.length - 1, Math.floor(a.length * p))] ?? 0;
      const gl = this.renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'unknown (renderer info not exposed)';
      const info = this.renderer.info;
      this.bench.result = [
        `date ${new Date().toISOString()}`,
        `build ${GAME_VERSION} rev ${REVISION}  quality ${this.settings.quality}  viewport ${window.innerWidth}x${window.innerHeight} @${this.renderer.getPixelRatio()}x`,
        `gpu ${gpu}`,
        `ua ${navigator.userAgent}`,
        `game hour ${formatClock(this.game.state.clock)}  phase ${this.game.state.quest.phase} (not pinned during the run)`,
        `frames ${a.length}  median ${q(0.5).toFixed(2)} ms  p95 ${q(0.95).toFixed(2)} ms  p99 ${q(0.99).toFixed(2)} ms  worst ${(a[a.length - 1] ?? 0).toFixed(1)} ms`,
        `last-frame draw calls ${info.render.calls}  triangles ${info.render.triangles}`,
        'Frame times are wall-clock intervals between animation frames, recorded uncapped; they are limited by the display refresh rate.',
      ].join('\n');
      this.bench.active = false;
      this.debugEl.style.display = '';
      this.buildDebug();
    }
  }
}

void evalAll;
void evalCond;
void worldView;
void SLOT_IDS;
void SLUICE;
void RITE_ALTAR;
export type { WorldState };

/** The reason a build failed, short enough for the failure screen's small print. */
function failureDetail(error: unknown): string | undefined {
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const line = text.split('\n')[0]!.trim();
  return line ? (line.length > 180 ? `${line.slice(0, 177)}…` : line) : undefined;
}
