import * as THREE from 'three';
import { NPCS } from './content/npcs';
import { S } from './content/strings';
import { CLOCK_RATE } from './game/constants';
import { Game } from './game/game';
import { getNode } from './game/dialogue';
import { nextHint } from './game/hints';
import { INSPECT_POINTS } from './content/inspect';
import { ITEMS } from './content/items';
import { hasFact, hourOfDay, evalAll, createInitialState, formatClock, clockDay, evalCond } from './game/state';
import { EVIDENCE_IDS, type Allocation, type Command, type GameEvent, type ItemId, type NpcId, type PlaceId, type WorldState } from './game/types';
import { worldView } from './game/worldView';
import { Input } from './platform/input';
import { FrameClock } from './platform/frameTiming';
import { codeLabel, loadSettings } from './platform/settings';
import { BrowserStore, SaveStore, SLOT_IDS, type SlotId } from './platform/storage';
import { ENEMY_SPAWNS, PLACES, SPAWN, SLUICE, RITE_ALTAR, type V2 } from './world/layout';
import { coastX } from './world/coast';
import { EnemyActor, NpcActor, type ActorContext, type EnemyContext } from './presentation/actors';
import { AudioEngine } from './presentation/audio';
import { CameraRig } from './presentation/cameraRig';
import { Grade } from './presentation/grade';
import { buildInteractables, type Interactable } from './presentation/interactions';
import { Player } from './presentation/player';
import { Hud } from './presentation/ui/hud';
import { DialogueView, type DlgChoice } from './presentation/ui/dialogueView';
import { MapView } from './presentation/ui/map';
import { PanelHost, aboutPanel, controlsPanel, describeMissing, inventoryPanel, journalPanel, noticePanel, pauseMenu, settingsPanel, sluicePanel, slotsPanel, type PanelActions, type PanelCtx } from './presentation/ui/panels';
import { h, clear } from './presentation/ui/dom';
import { createMenuScreen } from './presentation/ui/menuView';
import { installMenuMaterials } from './presentation/ui/menuMaterials';
import { AssetLibrary } from './presentation/assets/library';
import { ALL_NEEDS } from './presentation/assets/needs';
import { setRigShadow } from './presentation/characters';
import { WorldScene } from './presentation/world';
import { MenuScene } from './presentation/menuScene';
import { disposeSceneResources } from './presentation/disposeScene';
import { GAME_VERSION } from './version';

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
  world!: WorldScene;
  private menuScene!: MenuScene;
  library: AssetLibrary = AssetLibrary.empty();
  cam = new CameraRig();
  player = new Player();
  npcs: NpcActor[] = [];
  enemies: EnemyActor[] = [];
  hud = new Hud();
  dialogue = new DialogueView();
  panels = new PanelHost();
  mapView = new MapView();
  interactables: Interactable[] = [];
  target: Interactable | null = null;

  mode: Mode = 'loading';
  private titleEl!: HTMLElement;
  private loadingEl!: HTMLElement;
  private debugEl!: HTMLElement;
  private debugPre!: HTMLElement;
  private mapCanvas: HTMLCanvasElement | null = null;
  private panelKind: 'none' | 'pause' | 'journal' | 'inventory' | 'map' | 'notice' | 'sluice' | 'other' = 'none';
  private dlgNpc: NpcActor | null = null;
  private dlgNode = '';
  private dlgNarrator = false;
  private frameClock = new FrameClock();
  private worldBuilding = false;
  private clockAcc = 0;
  private worldDirty = true;
  private bellClock = 4;
  private checkpoint = { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw };
  private pendingOpening = 0;
  private hitStop = 0;
  private frameTimes: number[] = [];
  private fpsSmooth = 60;
  private debugTimer = 0;
  private bench: { active: boolean; frames: number[]; startedAt: number; result: string | null } = { active: false, frames: [], startedAt: 0, result: null };
  private lockingOut = false;
  private lastHint = '';
  /** Monotonic seconds for ambient audio scheduling; unlike world time it survives a world rebuild. */
  private audioClock = 0;
  private archiveWasOccupied = false;
  private autosaveTimer = 90;
  private bubbleState = new Map<string, { text: string; until: number }>();
  private threatUntil = 0;
  private vignetteLevel = 0;
  private wantPlayLock = false;
  private lastActiveNpcTag = '';
  captionsEnabled = true;

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
    this.loadingEl.textContent = S('menu.loading');

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    } catch {
      this.loadingEl.textContent = S('menu.webgl');
      return;
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.grade = new Grade(this.renderer, { msaa: this.settings.quality !== 'low' });
    this.menuScene = new MenuScene({ quality: this.settings.quality });
    this.applyPixelRatio();
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    // Let the loading text paint before the (synchronous) valley build.
    await new Promise((r) => setTimeout(r, 30));
    // The 0.0.x scene is built from primitives and generated textures; the shared-model library is only opened when a module asks for a model.
    if (ALL_NEEDS.length > 0) {
      try {
        this.library = await AssetLibrary.open();
      } catch (e) {
        console.warn('shared assets unavailable; using procedural art', e);
      }
    }
    await this.buildWorld();

    this.audio.onCaption = (t) => this.settings.captions && this.hud.caption(t);
    this.game.subscribe((ev) => this.onGameEvents(ev));
    this.dialogue.onChoose = (i) => this.onDialogueChoose(i);
    this.dialogue.onExit = () => this.endDialogue();
    this.input.onNavigate = (dx, dy) => this.onPadNavigate(dx, dy);

    document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    const first = () => {
      this.audio.resume();
    };
    window.addEventListener('pointerdown', first, { once: false });
    window.addEventListener('keydown', first, { once: false });
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
      this.input.consumePad();
      this.input.endFrame();
      if (hidden) this.autosaveQuiet();
    });

    this.enterTitle();
    this.loadingEl.classList.add('off');
    this.applyShotParams();
    this.frameClock.setHidden(document.visibilityState === 'hidden');
    this.audio.setPageHidden(document.visibilityState === 'hidden');
    this.frameClock.tick(performance.now());
    requestAnimationFrame((t) => this.frame(t));
    (window as unknown as { tervain: App }).tervain = this;
  }

  /**
   * Developer aid: `?shot=1&place=rillford&yaw=0.6&pitch=0.3&dist=12&hour=11&hud=0` starts a new game, frames a
   * view, settles the world, and sets document.title to READY so tools/shot.mjs can capture it headlessly.
   */
  private applyShotParams() {
    const q = new URLSearchParams(location.search);
    if (!q.has('shot')) return;
    const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
    this.startNew();
    this.pendingOpening = -1;
    this.game.state.npcs.caravan_master.met = true;
    const place = q.get('place') as PlaceId | null;
    if (q.has('x') && q.has('z')) this.player.setPosition(num('x', 0), num('z', 0), num('face', 0), this.world.terrain);
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
      else if (name === 'water') this.world.water.group.visible = false;
      else if (name === 'sea') this.world.sea.group.visible = false;
      else if (name === 'actors') for (const a of [...this.npcs.map((n) => n.rig.root), ...this.enemies.map((e) => e.rig.root), this.player.group]) a.visible = false;
    }
    if (q.get('hud') === '0') this.hud.show(false);
    // Look-development controls are intentionally query-only: each post effect can be isolated in a repeatable shot.
    const controls = ['saturation', 'contrast', 'vignette', 'grain', 'chromatic'] as const;
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
    this.loadingEl = h('div', { class: 'loading' }, S('menu.loading'));
    this.titleEl = h('div', { class: 'title' });
    this.debugPre = h('pre', { class: 'debug' });
    this.debugEl = h('div', { class: 'panel surface-paper', style: { position: 'absolute', right: '12px', top: '90px', width: 'min(420px, 92vw)', maxHeight: '80vh', overflow: 'auto', display: 'none', pointerEvents: 'auto', zIndex: '5' } });
    this.uiRoot.append(this.hud.el, this.dialogue.el, this.titleEl, this.panels.el, this.debugEl, this.loadingEl);
    this.panels.onEmpty = () => this.onPanelsClosed();
    this.panels.onChange = () => {
      // A pending rebind never outlives the screen it was started on.
      this.input.captureNext = null;
      this.titleEl.inert = this.panels.isOpen;
      this.syncMenuHudVisibility();
    };
    this.panels.onOpen = () => {
      this.titleEl.inert = true;
      this.input.uiOpen = true;
      this.releaseLock();
    };
  }

  private async buildWorld() {
    this.worldBuilding = true;
    try {
      // Shared flora caches must be released before replacement assets are constructed.
      if (this.world) this.disposeWorld();
      this.world = await WorldScene.create(this.game.state, this.settings, this.library, (p) => {
        this.loadingEl.textContent = `${S('menu.loading')} ${p.loaded}/${p.total}`;
      });
      this.world.scene.add(this.player.group);
      this.applyQualityToRenderer();
      // Actors
      this.npcs = Object.values(NPCS).map((d) => new NpcActor(d));
      for (const n of this.npcs) this.world.scene.add(n.rig.root);
      this.enemies = ENEMY_SPAWNS.map((s) => new EnemyActor(s));
      for (const e of this.enemies) this.world.scene.add(e.rig.root);
      this.interactables = buildInteractables(this);
      this.syncWorldFromState(true);
    } finally {
      this.worldBuilding = false;
    }
  }

  private disposeWorld() {
    const scene = this.world.scene;
    // This rig persists across quality/world rebuilds and keeps its GPU resources.
    scene.remove(this.player.group);
    disposeSceneResources(scene, () => this.world.dispose(), [this.player.group]);
  }

  private applyQualityToRenderer() {
    const q = this.settings.quality;
    this.renderer.shadowMap.enabled = q !== 'low';
    this.grade.setMsaa(q !== 'low');
    this.grade.bloom = q !== 'low';
    this.applyPixelRatio();
  }

  private applyPixelRatio() {
    const q = this.settings.quality;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? Math.min(dpr, 1) : q === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2));
  }

  private onResize() {
    const w = window.innerWidth;
    const h2 = window.innerHeight;
    this.applyPixelRatio();
    this.renderer.setSize(w, h2, false);
    const dpr = this.renderer.getPixelRatio();
    this.grade.setSize(w * dpr, h2 * dpr);
    this.cam.setAspect(w / h2);
    this.menuScene.resize(w, h2);
  }

  /* ============================== settings ============================== */

  applyUiSettings() {
    const s = this.settings;
    document.documentElement.style.setProperty('--ui-scale', String(s.textScale));
    document.body.classList.toggle('high-contrast', s.highContrast);
    document.body.classList.toggle('reduce-effects', s.reduceEffects);
    document.body.classList.toggle('reduced-motion', s.reducedMotion);
    this.audio.applySettings();
    if (this.world) this.world.sky.brightness = s.brightness;
  }

  applySettings(reload = false) {
    this.applyUiSettings();
    if (reload && this.renderer) {
      const before = { x: this.player.x, z: this.player.z, yaw: this.player.yaw };
      this.loadingEl.classList.remove('off');
      // The menu vigil follows the graphics preset too (it is on screen while Settings is open).
      if (this.menuScene.quality !== this.settings.quality) {
        this.menuScene.dispose();
        this.menuScene = new MenuScene({ quality: this.settings.quality });
        this.menuScene.resize(window.innerWidth, window.innerHeight);
      }
      void this.buildWorld().then(() => {
        this.player.setPosition(before.x, before.z, before.yaw, this.world.terrain);
        this.world.scene.add(this.player.group);
        this.loadingEl.classList.add('off');
      });
    }
  }

  /* =========================== mode transitions ========================== */

  get overlay(): 'none' | 'dialogue' | 'panel' {
    if (this.dialogue.open) return 'dialogue';
    if (this.panels.isOpen) return 'panel';
    return 'none';
  }

  private enterTitle() {
    this.mode = 'title';
    this.hud.show(false);
    this.dialogue.hide();
    this.panels.closeAll();
    this.input.uiOpen = true;
    this.releaseLock();
    this.buildTitle();
    this.titleEl.classList.add('on');
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
    this.titleEl.append(createMenuScreen({ menu, subtitle: S('menu.affiliation'), version: GAME_VERSION, variant: 'title' }));
    this.focusTitle();
  }

  private focusTitle() {
    (this.titleEl.querySelector('[data-nav]') as HTMLElement | null)?.focus();
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
    this.game.replaceState(createInitialState('slot-1'));
    this.beginPlay(null);
    this.pendingOpening = 1.4;
  }

  private beginPlay(fromLoad: { recovered: null | 'previous' | 'temporary' } | null) {
    this.titleEl.classList.remove('on');
    this.panels.closeAll();
    this.dialogue.hide();
    this.mode = 'play';
    this.hud.show(true);
    this.syncMenuHudVisibility();
    this.hud.showFade(false);
    this.input.uiOpen = false;
    this.clockAcc = 0;
    this.syncWorldFromState(true);
    const p = this.game.state.player;
    const safe = this.safePosition(p.x, p.z);
    const fresh = fromLoad === null;
    const start = fresh ? { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw } : { x: safe.x, z: safe.z, yaw: p.yaw };
    this.player.setPosition(start.x, start.z, start.yaw, this.world.terrain);
    this.cam.yaw = start.yaw + Math.PI * 0.0;
    this.cam.pitch = 0.3;
    this.checkpoint = { ...start };
    this.game.setPlayerTransform(this.player.x, this.player.y, this.player.z, this.player.yaw);
    this.bellClock = 3;
    if (fromLoad?.recovered) this.hud.toast(S(`menu.recovered.${fromLoad.recovered}`));
    if (this.settings.reducedMotion) this.hud.setVignette(0);
    this.wantLock();
  }

  /** Player positions that are no longer standable (geometry changed between builds) fall back to a safe place. */
  private safePosition(x: number, z: number): V2 {
    const ok = this.world.terrain.walkable(x, z) && !this.world.colliders.blocked(x, z, 0.45);
    if (ok) return { x, z };
    const cell = this.world.nav.nearestOpen(x, z, 10);
    if (cell) return this.world.nav.cellCenter(cell.i, cell.j);
    return { x: SPAWN.x, z: SPAWN.z };
  }

  quitToTitle() {
    this.autosaveQuiet();
    this.enterTitle();
  }

  private syncWorldFromState(snap: boolean) {
    this.world.syncStatic(this.game.state, snap);
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

  private frame(now: number) {
    const frame = this.frameClock.tick(now);
    if (frame && !this.worldBuilding) {
      const { interval, dt } = frame;
      this.lastFrameDt = dt;
      if (interval < 5) this.recordFrame(interval);
      this.audioClock += dt;
      try {
        this.step(dt);
      } catch (e) {
        console.error(e);
      }
    } else if (document.visibilityState !== 'hidden' && !this.worldBuilding) {
      // Baseline a held controller after returning; its old press must not become an attack.
      this.input.poll(0);
    }
    this.input.consumePad();
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  private step(dt: number) {
    this.input.poll(dt);
    const state = this.game.state;
    if (this.worldDirty) {
      this.world.syncStatic(state, false);
      this.worldDirty = false;
    }

    if (this.mode === 'loading') return;
    const overlayAtStart = this.overlay;
    this.handleGlobalInput();

    // The frame in which an overlay closes stays paused, so the press that closed it cannot also act in the world.
    const playing = this.mode === 'play' && this.overlay === 'none' && overlayAtStart === 'none';
    if (this.bench.active) this.stepBenchmark(dt);

    if (this.menuBackgroundActive) {
      // The menu is a separate cosmetic courtyard. No coast, patrols, or game clock run beneath it.
      this.menuScene.update(dt, this.settings.reducedMotion);
      // An open headland: wind, and the sea breaking somewhere below. Only the existing procedural beds play.
      this.audio.update(dt, { nightness: 0.3, waterProximity: 0, seaProximity: 0.32, flow: 0,
        millNear: 0, millTurning: false, windAmount: 0.6, quarryNear: 0,
        quarryWorking: false, time: this.audioClock, underRoof: false });
      this.render();
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
    if (playing || this.overlay === 'dialogue') {
      const look = this.input.look(dt);
      if (playing) this.cam.applyLook(look.yaw, look.pitch, this.input.zoom());
    }

    if (playing && this.pendingOpening > 0) {
      this.pendingOpening -= dt;
      if (this.pendingOpening <= 0) {
        const joss = this.npcs.find((n) => n.id === 'caravan_master');
        if (joss && !this.game.state.npcs.caravan_master.met) this.startDialogue(joss);
      }
    }

    // Simulation
    const hitStopped = this.hitStop > 0;
    if (playing && hitStopped) this.hitStop -= dt;
    if (playing && this.mode === 'play' && !hitStopped) {
      this.player.update(dt, this.playerContext(true));
      this.updateEnemies(dt);
      this.checkDiscoveries();
    } else if (this.mode === 'dead') {
      this.player.update(dt, this.playerContext(false));
      this.updateEnemies(dt * 0.25);
    }
    // Reading freezes controller/action timers and patrol routes as well as the world clock.
    if (playing) this.updateActors(dt, hour);

    // Interaction
    if (playing) this.updateInteraction();
    else this.hud.setPrompt(null);

    // Channelled action progress
    const ch = this.player.channel;
    this.hud.setChannel(ch ? ch.label : null, ch ? ch.t / ch.dur : 0);
    this.world.setWheelTurning(ch ? 3 : 0);

    // Bell in the drought
    this.updateBell(dt, playing);

    // Camera follow
    if (this.cam.mode === 'follow' && !this.bench.active) {
      const sitting = 0;
      this.cam.follow(dt, this.player.x, this.player.y, this.player.z, this.world.terrain, this.world.colliders, this.settings.reducedMotion, this.player.shake, 1.55 + sitting);
    }

    // World presentation
    this.world.update(dt, state, new THREE.Vector3(this.player.x, this.player.y, this.player.z), this.settings, hour, this.cam.camera);
    this.updateRigShadows();
    this.audioUpdate(dt, this.cam.camera.position, hour);

    this.updateHud(dt);
    if (this.panelKind === 'map' && this.mapCanvas) this.renderMap();
    this.updateDebug(dt);
    this.render();
  }

  /** People beyond a short distance stop casting shadows; the shadow map only covers the near ground anyway. */
  private updateRigShadows() {
    const c = this.cam.camera.position;
    for (const a of [...this.npcs, ...this.enemies]) {
      const p = a.rig.root.position;
      setRigShadow(a.rig, (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < 55 * 55);
    }
  }

  private render() {
    if (this.menuBackgroundActive) {
      this.menuScene.prepare(this.renderer);
      this.renderer.toneMappingExposure = 1.05 * this.settings.brightness;
      if (!this.worldLook) this.worldLook = this.grade.getLook();
      this.grade.setLook({ ...App.MENU_LOOK, night: 0 });
      this.grade.render(this.menuScene.scene, this.menuScene.camera, this.settings.reducedMotion ? 0 : this.lastFrameDt);
      return;
    }
    this.renderer.toneMappingExposure = 1.22;
    if (this.worldLook) {
      this.grade.setLook(this.worldLook);
      this.worldLook = null;
    }
    this.grade.setLook({ night: this.world.sky.state.nightness });
    this.grade.render(this.world.scene, this.cam.camera, this.lastFrameDt, this.world.waterRenderInputs(this.settings));
  }

  /** The menu's picture is rougher than play: an old painted backdrop, grainy and darkened at the edges. */
  private static readonly MENU_LOOK = { saturation: 0.9, contrast: 1.07, vignette: 0.3, grain: 0.03, chromatic: 0.0012 };
  private worldLook: ReturnType<Grade['getLook']> | null = null;

  private get menuBackgroundActive() {
    return this.mode === 'title' || (this.panelKind === 'pause' && this.panels.isOpen);
  }

  private syncMenuHudVisibility() {
    // Nested pause forms retain the courtyard even though the top panel is now paper.
    this.hud.el.classList.toggle('menu-hidden', this.menuBackgroundActive);
  }

  /* ============================== input glue ============================== */

  private handleGlobalInput() {
    const inp = this.input;
    if (this.mode === 'title') {
      if (inp.pressed('pause') && this.panels.isOpen) this.panels.back();
      this.handleMenuPad();
      return;
    }
    if (inp.pressed('pause')) {
      if (this.overlay === 'dialogue') this.endDialogue();
      else if (this.panels.isOpen) this.panels.back();
      else if (this.mode === 'play') this.openPause();
    }
    this.handleMenuPad();
    if (this.mode !== 'play') return;
    if (this.overlay !== 'dialogue') {
      // Tab, M and I only toggle their own panel; inside another panel Tab is ordinary focus movement.
      const open = this.panels.isOpen;
      const padBusy = inp.device === 'gamepad' && open;
      if (inp.pressed('journal') && !padBusy && (!open || this.panelKind === 'journal')) this.togglePanel('journal');
      if (inp.pressed('map') && (!open || this.panelKind === 'map')) this.togglePanel('map');
      if (inp.pressed('inventory') && !padBusy && (!open || this.panelKind === 'inventory')) this.togglePanel('inventory');
    }
    if (this.overlay === 'none') {
      if (inp.pressed('quicksave')) this.saveTo('quick');
      if (inp.pressed('quickload')) this.loadSlot('quick');
      if (inp.pressed('heal')) this.usePoultice();
    }
    if (this.input.pressedKey('Backquote') || this.input.pressedKey('F3')) this.toggleDebug();
  }

  private handleMenuPad() {
    // Gamepad confirm/back inside dialogue and panels.
    let handled = false;
    if (this.overlay === 'dialogue') {
      if (this.input.padButtonPressed(0)) {
        this.dialogue.confirmFocused();
        handled = true;
      }
      if (this.input.padButtonPressed(1)) {
        this.endDialogue();
        handled = true;
      }
    } else if (this.panels.isOpen || this.mode === 'title') {
      if (this.input.padButtonPressed(0)) {
        if (this.panels.isOpen) this.panels.activateFocused();
        else if (this.titleEl.contains(document.activeElement)) (document.activeElement as HTMLElement).click();
        handled = true;
      }
      if (this.input.padButtonPressed(1) && this.panels.isOpen) {
        this.panels.back();
        handled = true;
      }
    }
    // Menu presses belong to the menu; they must not also become an attack, a dodge or a new conversation.
    if (handled) this.input.consumePad();
  }

  /** Arrow keys move focus between menu items (Tab and Space are left to the browser for focus and activation). */
  private onUiKey(e: KeyboardEvent) {
    if (this.dialogue.open) return;
    if (!(this.mode === 'title' || this.panels.isOpen)) return;
    if (this.input.captureNext) return;
    // Preserve the bound Tab toggle for a directly opened record panel. Nested menus use Tab for focus.
    const record = this.panelKind;
    if (e.code === 'Tab' && this.panels.depth === 1 && (record === 'journal' || record === 'map' || record === 'inventory') && this.settings.bindings[record].includes(e.code)) {
      e.preventDefault();
      return;
    }
    if (this.panels.trapTab(e)) return;
    const el = document.activeElement as HTMLElement | null;
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
    if (this.panels.isOpen) this.panels.navigate(0, step);
    else {
      const items = [...this.titleEl.querySelectorAll<HTMLElement>('[data-nav]')];
      const i = items.indexOf(el as HTMLElement);
      items[(i + step + items.length) % items.length]?.focus();
    }
    this.audio.uiMove();
  }

  private onPadNavigate(dx: number, dy: number) {
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
    if (this.overlay === 'dialogue') this.dialogue.navigate(dy !== 0 ? dy : dx);
    else if (this.panels.isOpen) this.panels.navigate(dx, dy);
    else if (this.mode === 'title') {
      const items = [...this.titleEl.querySelectorAll<HTMLElement>('[data-nav]')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (dy || dx) + items.length) % items.length]?.focus();
    }
    this.audio.uiMove();
  }

  private wantLock() {
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
    // Escape while locked exits the lock without a key event; treat it as a request to pause.
    if (!document.pointerLockElement && this.mode === 'play' && this.overlay === 'none' && !this.lockingOut && this.wantPlayLock) {
      this.wantPlayLock = false;
      this.openPause();
    }
  }

  private onPanelsClosed() {
    this.titleEl.inert = false;
    this.panelKind = 'none';
    this.mapCanvas = null;
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
      save: (slot) => {
        this.saveTo(slot);
        this.panels.replaceTop(slotsPanel(this.panelCtx(), 'save'));
      },
      load: (slot) => this.loadSlot(slot),
      newGame: () => this.startNew(),
      quitToTitle: () => this.quitToTitle(),
      useItem: (item) => {
        if (item === 'poultice') this.usePoultice();
        this.panels.replaceTop(inventoryPanel(this.panelCtx()));
      },
      brace: () => this.beginBrace(),
      force: () => this.doForce(),
      commit: (a) => this.doCommit(a),
      applySettings: (reload) => this.applySettings(reload),
      closeAll: () => this.panels.closeAll(),
    };
  }

  private openPause() {
    this.panelKind = 'pause';
    this.panels.push(pauseMenu(this.panelCtx()), { narrow: true });
  }

  private togglePanel(kind: 'journal' | 'inventory' | 'map') {
    if (this.panelKind === kind && this.panels.isOpen) {
      this.panels.closeAll();
      return;
    }
    if (this.panels.isOpen) this.panels.closeAll();
    this.panelKind = kind;
    this.audio.journal();
    if (kind === 'journal') this.panels.push(journalPanel(this.panelCtx()));
    else if (kind === 'inventory') this.panels.push(inventoryPanel(this.panelCtx()));
    else {
      const { wrap, canvas } = this.mapView.element();
      this.mapCanvas = canvas;
      const close = h('button', { class: 'btn', 'data-nav': true, onClick: () => this.panels.back() }, S('menu.close'));
      this.panels.push(h('div', {}, h('h1', {}, S('map.title')), wrap, h('div', { class: 'row', style: { marginTop: '10px' } }, close)));
      this.renderMap();
    }
  }

  private renderMap() {
    if (!this.mapCanvas) return;
    const hint = nextHint(this.game.state);
    this.mapView.render(this.mapCanvas, { state: this.game.state, terrain: this.world.terrain, player: { x: this.player.x, z: this.player.z, yaw: this.player.yaw }, hintPlace: hint.place, guidance: this.settings.guidance, time: this.world.time });
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

  /* ============================= dialogue ============================== */

  startDialogue(npc: NpcActor) {
    const node = this.game.entryNode(npc.id);
    if (!node) return;
    this.dlgNpc = npc;
    npc.talking = true;
    this.dlgNarrator = false;
    this.input.uiOpen = true;
    this.releaseLock();
    this.audio.interact();
    this.showNode(node);
  }

  private showNarration(text: string, name = '') {
    this.dlgNpc = null;
    this.dlgNarrator = true;
    this.dlgNode = '__narration';
    this.input.uiOpen = true;
    this.releaseLock();
    this.dialogue.show({ name, title: '', text, choices: [{ index: 0, label: S('dlg.continue'), locked: false, reasons: [] }] });
  }

  private showNode(nodeId: string) {
    this.dlgNode = nodeId;
    this.game.showNode(nodeId);
    const node = getNode(nodeId);
    if (!node) {
      this.endDialogue();
      return;
    }
    const state = this.game.state;
    const speaker = node.speaker === 'narrator' ? null : NPCS[node.speaker];
    const choices: DlgChoice[] = this.game.choices(nodeId).map((v) => ({
      index: v.index,
      label: S(v.choice.text),
      intent: v.choice.intent,
      locked: v.locked,
      reasons: v.locked ? describeMissing(v.missing, state) : [],
    }));
    this.dialogue.show({ name: speaker?.name ?? '', title: speaker ? S(speaker.titleKey) : '', text: S(node.text), choices });
    this.worldDirty = true;
  }

  private onDialogueChoose(index: number) {
    if (this.dlgNarrator) {
      this.endDialogue();
      return;
    }
    const r = this.game.choose(this.dlgNode, index);
    if (!r.ok) {
      this.hud.toast(S('dlg.failed', { reason: r.reason }), 'bad');
      this.showNode(this.dlgNode);
      return;
    }
    this.audio.uiConfirm();
    if (r.next === 'end') this.endDialogue();
    else this.showNode(r.next);
  }

  endDialogue() {
    this.dialogue.hide();
    if (this.dlgNpc) this.dlgNpc.talking = false;
    this.dlgNpc = null;
    this.dlgNarrator = false;
    if (this.mode === 'play') {
      this.input.uiOpen = false;
      this.wantLock();
    }
    this.worldDirty = true;
  }

  /* ============================= interactions ============================= */

  private updateInteraction() {
    const p = this.player;
    const f = p.facing;
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of this.interactables) {
      if (!it.enabled()) continue;
      const pos = it.pos();
      const dx = pos.x - p.x;
      const dz = pos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > it.r) continue;
      const facing = d < 1.4 ? 1 : (dx * f.x + dz * f.z) / (d || 1);
      // Also accept what the camera is looking toward, so it works while backing away.
      const cf = Math.sin(this.cam.yaw) * dx + Math.cos(this.cam.yaw) * dz;
      if (facing < 0.05 && cf / (d || 1) < 0.2) continue;
      const score = d + (it.priority ?? 0) * 2;
      if (score < bestScore) {
        best = it;
        bestScore = score;
      }
    }
    this.target = best;
    if (best && p.state === 'free') {
      this.hud.setPrompt(this.input.label('interact', codeLabel), best.prompt());
      if (this.input.pressed('interact')) {
        this.audio.interact();
        best.act();
      }
    } else this.hud.setPrompt(null);
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
    this.showNarration(S(pt.noticeKey), S('prompt.inspect'));
  }

  pickup(id: string, item: ItemId, qty: number) {
    const r = this.game.dispatch({ t: 'pickup', pickupId: id, item, qty });
    if (!r.ok) return;
    this.audio.pickup();
    this.worldDirty = true;
    if (id === 'quarry_brace') this.hud.toast(S('toast.brace.taken'));
    if (id === 'side_path_cache') this.hud.toast(S('toast.cache'));
    if (id === 'wreck_blade') this.hud.toast(S('toast.blade'));
  }

  pullLever() {
    const r = this.game.dispatch({ t: 'openShortcut' });
    if (!r.ok) return;
    this.audio.gateCreak('[The trail gate opens]');
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
      this.audio.gateCreak('[The archive door opens]');
      this.world.syncStatic(this.game.state, false);
    } else this.hud.toast(S('toast.archive.withdrawn'), 'bad');
  }

  /** Who could plausibly have seen the player at this spot: awake, close, with a clear line of sight. */
  observersAt(x: number, z: number): NpcId[] {
    const out: NpcId[] = [];
    for (const n of this.npcs) {
      if (n.hidden || !this.game.state.npcs[n.id].available) continue;
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
    this.audio.gateCreak('[The archive shutter is forced open]');
    this.hud.toast(S('toast.archive.forced'));
    this.world.syncStatic(this.game.state, false);
    // A witness cue the player can act on: the observer calls out.
    const w = this.npcs.find((n) => seenBy.includes(n.id));
    if (w) this.bark(w, S('toast.warden.hey'));
  }

  readLedger() {
    const r = this.game.dispatch({ t: 'readLedger' });
    if (!r.ok) return;
    this.audio.journal();
    this.showNarration(S('narr.ledger'), S('prompt.ledger'));
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
      this.audio.gateCreak('[The sluice brace locks into place]');
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
    this.audio.gateCreak('[The sluice jams hard against its frame]');
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

  usePoultice() {
    const r = this.game.dispatch({ t: 'useItem', item: 'poultice' });
    if (r.ok) {
      this.hud.toast(S('toast.poultice'), 'good');
      this.audio.pickup();
    } else if (r.reason === 'already_healthy') this.hud.toast(S('toast.noheal'));
    else this.hud.toast(S('toast.nopoultice'));
  }

  /* =============================== game events =============================== */

  private onGameEvents(events: GameEvent[]) {
    this.worldDirty = true;
    for (const e of events) {
      switch (e.t) {
        case 'evidence':
          this.hud.toast(S(`toast.evidence.${e.via}`, { name: S(`evidence.${e.id}`) }), 'evidence');
          this.audio.journal();
          break;
        case 'phase':
          if (e.phase === 'settled') {
            this.hud.toast(S('toast.settled'), 'good');
            this.ringBell(true);
          }
          break;
        case 'grant':
          for (const [id, qty] of Object.entries(e.items) as [ItemId, number][]) this.hud.toast(S('toast.item.gain', { qty, name: S(ITEMS[id].nameKey) }), 'good');
          this.audio.pickup();
          break;
        case 'item':
          if (e.delta > 0) this.hud.toast(S('toast.item.gain', { qty: e.delta, name: S(ITEMS[e.id].nameKey) }), 'good');
          else if (e.id !== 'sluice_brace' && e.id !== 'votive_reed') this.hud.toast(S('toast.item.lose', { qty: -e.delta, name: S(ITEMS[e.id].nameKey) }));
          break;
        case 'skill':
          this.hud.toast(S('toast.skill', { name: S(`skill.${e.id}`) }), 'good');
          break;
        case 'place':
          this.hud.toast(S('toast.place', { name: S(`place.${e.id}`) }), 'evidence');
          // Discovering somewhere new moves the respawn point there.
          this.checkpoint = { x: this.player.x, z: this.player.z, yaw: this.player.yaw };
          break;
        case 'worker_rescued':
          this.hud.toast(S(e.method === 'shortcut' ? 'toast.shortcut.rescued' : 'toast.rescued'), 'good');
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
  }

  saveTo(slot: SlotId) {
    if (this.mode !== 'play') return;
    this.stamp();
    const r = this.saves.save(slot, this.game.state);
    if (r.ok) this.hud.toast(S('menu.saved', { slot: S(`menu.slot.${slot}`) }), 'good');
    else this.hud.toast(S('menu.savefailed', { reason: r.message }), 'bad');
  }

  private autosave(reason: string) {
    if (this.mode !== 'play') return;
    this.stamp();
    const r = this.saves.save('auto', this.game.state);
    if (r.ok) {
      this.checkpoint = { x: this.player.x, z: this.player.z, yaw: this.player.yaw };
      this.hud.toast(S('menu.saved', { slot: S('menu.slot.auto') }));
    } else this.hud.toast(S('menu.savefailed', { reason: r.message }), 'bad');
    void reason;
  }

  /** A brand-new run that has done nothing yet must not replace an earlier autosave. */
  private hasProgress(): boolean {
    const s = this.game.state;
    return s.quest.phase !== 'unseen' || Object.keys(s.evidence).length > 0 || Object.keys(s.grants).length > 0 || s.playSeconds > 90;
  }

  private autosaveQuiet() {
    if (this.mode !== 'play' || !this.hasProgress()) return;
    this.stamp();
    this.saves.save('auto', this.game.state);
  }

  loadSlot(slot: SlotId) {
    const r = this.saves.load(slot);
    if (!r.ok) {
      this.hud.toast(S('menu.loadfailed', { reason: r.message }), 'bad');
      if (this.mode === 'title') this.panels.push(h('div', {}, h('h1', {}, S('menu.load')), h('p', {}, S('menu.loadfailed', { reason: r.message })), h('div', { class: 'row' }, h('button', { class: 'btn', 'data-nav': true, onClick: () => this.panels.back() }, S('menu.back')))), { narrow: true });
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
      nav: this.world.nav,
      state: this.game.state,
      hour: hourOfDay(this.game.state.clock + this.clockAcc),
      player: { x: this.player.x, z: this.player.z, y: this.player.y },
      reducedMotion: this.settings.reducedMotion,
      onBark: (a, text) => this.mode === 'play' && this.settings.barks && this.bark(a, text),
    };
  }

  private updateActors(dt: number, hour: number) {
    const ctx = this.actorContext();
    ctx.hour = hour;
    for (const n of this.npcs) n.update(dt, ctx);
  }

  bark(a: NpcActor, text: string) {
    this.bubbleState.set(a.id, { text, until: performance.now() + 3600 });
  }

  private playerContext(controllable: boolean) {
    return {
      terrain: this.world.terrain,
      colliders: this.world.colliders,
      input: this.input,
      settings: this.settings,
      game: this.game,
      audio: this.audio,
      enemies: this.enemies,
      npcs: this.npcs,
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
    const ctx: EnemyContext = {
      terrain: this.world.terrain,
      colliders: this.world.colliders,
      player: { x: p.x, z: p.z, y: p.y, alive: p.alive, invulnerable: p.invulnerable },
      reducedMotion: this.settings.reducedMotion,
      strikePlayer: (e, dmg, heavy) => p.receiveHit(dmg, heavy, e, this.playerContext(true)),
      onGrowl: (e) => {
        if (e.spawn.kind === 'thornback') this.audio.growl();
        else this.audio.hit('block');
      },
      time: this.world.time,
    };
    for (const e of this.enemies) if (!(this.game.state.defeated[e.id] && !e.alive && e.fade <= 0)) e.update(dt, ctx);
  }

  private onEnemyDefeated(e: EnemyActor) {
    this.game.dispatch({ t: 'defeat', id: e.id });
    if (e.id === 'cut_creature') this.hud.toast(S('toast.cleared'), 'good');
  }

  private onPlayerDeath() {
    this.mode = 'dead';
    this.hud.showFade(true, S('hud.fallen.title'), S('hud.fallen.body'));
    setTimeout(() => this.respawn(), 3600);
  }

  private respawn() {
    if (this.mode !== 'dead') return;
    this.game.dispatch({ t: 'healPlayer', amount: 100 });
    const cp = this.safePosition(this.checkpoint.x, this.checkpoint.z);
    this.player.setPosition(cp.x, cp.z, this.checkpoint.yaw, this.world.terrain);
    this.player.stamina = 100;
    for (const e of this.enemies) e.reset(this.world);
    this.hud.showFade(false);
    this.mode = 'play';
    this.cam.yaw = this.checkpoint.yaw;
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
    for (let i = 0; i < times; i++) setTimeout(() => this.audio.bell(gain, bright), i * (bright ? 600 : 1400));
    if (gain > 0.15) this.audio.caption(S(bright ? 'toast.caption.bell.allclear' : 'toast.caption.bell'));
  }

  private audioUpdate(dt: number, camPos: THREE.Vector3, hour: number) {
    const v = this.world.view;
    const w = this.world.waterProximity(camPos.x, camPos.z);
    const millD = Math.hypot(camPos.x + 14, camPos.z + 8);
    const quarryD = Math.hypot(camPos.x - 92, camPos.z + 26);
    this.audio.update(dt, {
      nightness: this.world.sky.state.nightness,
      waterProximity: w,
      flow: v.flow.main,
      millNear: Math.max(0, 1 - millD / 40),
      millTurning: v.millTurning,
      windAmount: Math.min(1, 0.3 + camPos.y / 60),
      quarryNear: Math.max(0, 1 - quarryD / 60),
      quarryWorking: v.quarryState === 'working' || v.quarryState === 'night_shift',
      time: this.audioClock,
      underRoof: this.world.insideArchive(camPos.x, camPos.z),
      seaProximity: Math.exp(-Math.max(0, camPos.x - coastX(camPos.z)) / 95),
    });
    void hour;
  }

  /* ==================================== HUD ==================================== */

  private project(v: THREE.Vector3): { x: number; y: number; on: boolean } {
    const p = v.clone().project(this.cam.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, on: p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 };
  }

  private updateHud(dt: number) {
    if (this.mode === 'title') return;
    const s = this.game.state;
    const hint = nextHint(s);
    const obj = this.settings.guidance ? S(hint.key) : null;
    this.hud.update({
      health: s.player.health,
      maxHealth: s.player.maxHealth,
      stamina: this.player.stamina,
      exhausted: this.player.exhausted,
      coin: s.inventory.coin ?? 0,
      poultice: s.inventory.poultice ?? 0,
      timeText: S('hud.time', { n: clockDay(s.clock) + 1, time: formatClock(s.clock + this.clockAcc) }),
      objective: obj,
      fps: this.settings.showFps ? S('hud.fps', { fps: Math.round(this.fpsSmooth), ms: (1000 / Math.max(1, this.fpsSmooth)).toFixed(1) }) : null,
      blocking: this.player.blocking,
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
      h('h2', {}, 'Benchmark'),
      h('p', { class: 'muted' }, 'Runs a fixed camera route (about 55 s) and reports median/95th/99th percentile frame times for this device, renderer and quality preset.'),
      h('div', { class: 'pillrow' }, btn('Run benchmark route', () => this.startBenchmark()), btn('Copy report', () => navigator.clipboard?.writeText(this.debugPre.textContent ?? ''))),
    );
  }

  private updateDebug(dt: number) {
    if (this.debugEl.style.display === 'none') return;
    this.debugTimer -= dt;
    if (this.debugTimer > 0) return;
    this.debugTimer = 0.4;
    const info = this.renderer.info;
    const st = this.frameStats();
    const s = this.game.state;
    const lines = [
      `frames ${st.frames}  median ${st.median.toFixed(1)} ms  p95 ${st.p95.toFixed(1)}  p99 ${st.p99.toFixed(1)}  max ${st.max.toFixed(1)}`,
      `draw calls ${info.render.calls}  triangles ${info.render.triangles}  geometries ${info.memory.geometries}  textures ${info.memory.textures}`,
      `modules: ${this.world.modules.map((m) => `${m.name} ${JSON.stringify(m.module.stats?.() ?? {})}`).join(' | ')}  build ${this.world.buildStats.ms.toFixed(0)} ms`,
      `build ${GAME_VERSION} rev ${REVISION}  quality ${this.settings.quality}  dpr ${this.renderer.getPixelRatio()}  ${window.innerWidth}x${window.innerHeight}`,
      `player ${this.player.x.toFixed(1)}, ${this.player.z.toFixed(1)}  hp ${s.player.health}  clock ${formatClock(s.clock)} day ${clockDay(s.clock) + 1}`,
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
    const route: { p: THREE.Vector3; look: THREE.Vector3 }[] = [
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
