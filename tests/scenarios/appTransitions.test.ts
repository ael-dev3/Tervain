import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app';
import { Game } from '../../src/game/game';
import { createInitialState } from '../../src/game/state';
import { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import { FrameClock } from '../../src/platform/frameTiming';
import { WorldScene } from '../../src/presentation/world';
import { MenuScene } from '../../src/presentation/menuScene';
import { track } from '../../src/presentation/human/sheetPool';
import { HuntingController } from '../../src/presentation/huntingController';
import { LoadingScreen } from '../../src/presentation/ui/loadingScreen';

const menuFailure = vi.hoisted(() => ({ next: false }));
const stagedActors = vi.hoisted(() => ({ roots: [] as unknown[] }));
const npcCatalog = vi.hoisted(() => ({ load: vi.fn() }));
const treeCatalog = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('../../src/presentation/meshyTrees', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/presentation/meshyTrees')>(), loadMeshyTrees: treeCatalog.load,
}));
vi.mock('../../src/presentation/meshynpcs', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/presentation/meshynpcs')>(), loadMeshyNpcCatalog: npcCatalog.load,
}));
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return { ...actual, WebGLRenderer: class {
    shadowMap = {};
    info = {};
    extensions = { has: () => false };
  } };
});
vi.mock('../../src/presentation/ui/menuMaterials', () => ({ installMenuMaterials: vi.fn() }));
vi.mock('../../src/presentation/actors', () => ({
  NpcActor: class {
    id: string; x = 0; y = 0; z = 0;
    rig = { root: new THREE.Group() };
    constructor(definition: { id: string }) {
      this.id = definition.id;
      this.rig.root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
      stagedActors.roots.push(this.rig.root);
    }
  },
  EnemyActor: class {
    rig = { root: new THREE.Group() };
    constructor() {
      this.rig.root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
      stagedActors.roots.push(this.rig.root);
    }
  },
}));
vi.mock('../../src/presentation/menuScene', () => ({
  MenuScene: class {
    quality: string;
    trafficState = { seed: 73, elapsed: 19 };
    awakeningState = { time: 49 };
    grove = {};
    dispose = vi.fn();
    resize = vi.fn();
    constructor(options: { quality: string }) {
      if (menuFailure.next) { menuFailure.next = false; throw new Error('menu allocation'); }
      this.quality = options.quality;
    }
  },
}));

class ElementFixture {
  inert = false;
  disabled = false;
  isConnected = true;
  style = { setProperty: vi.fn() };
  className = '';
  readonly attributes = new Map<string, string>();
  readonly children: (ElementFixture | string)[] = [];
  readonly listeners = new Map<string, (() => void)[]>();
  readonly classes = new Set<string>();
  readonly classList = {
    add: (...names: string[]) => names.forEach((name) => this.classes.add(name)),
    remove: (...names: string[]) => names.forEach((name) => this.classes.delete(name)),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, force: boolean) => force ? this.classes.add(name) : this.classes.delete(name),
  };
  private text = '';
  constructor(readonly tagName: string) {}
  set textContent(text: string) { this.text = text; this.children.length = 0; }
  get textContent(): string { return this.text + this.children.map((child) => typeof child === 'string' ? child : child.textContent).join(''); }
  get firstChild(): ElementFixture | string | null { return this.children[0] ?? null; }
  append(...children: (ElementFixture | string)[]) { this.children.push(...children); }
  removeChild(child: ElementFixture | string) { this.children.splice(this.children.indexOf(child), 1); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  addEventListener(name: string, fn: () => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], fn]); }
  contains(element: ElementFixture): boolean { return this === element || this.children.some((child) => typeof child !== 'string' && child.contains(element)); }
  closest(): null { return null; }
  focus() { Reflect.set(document, 'activeElement', this); }
  click() { for (const listener of this.listeners.get('click') ?? []) listener(); }
}

function fixture() {
  treeCatalog.load.mockResolvedValue(new Map());
  const listeners = new Map<string, ((event: Record<string, unknown>) => void)[]>();
  const document = {
    pointerLockElement: null as HTMLElement | null, exitPointerLock: vi.fn(),
    activeElement: null as ElementFixture | null, visibilityState: 'visible',
    createElement: (tag: string) => new ElementFixture(tag.toUpperCase()), addEventListener: vi.fn(),
  };
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', { addEventListener: (name: string, fn: (event: Record<string, unknown>) => void) => {
    listeners.set(name, [...(listeners.get(name) ?? []), fn]);
  } });
  vi.stubGlobal('navigator', { getGamepads: () => [] });
  const settings = defaultSettings();
  settings.toggleSprint = settings.toggleBlock = true;
  settings.bindings.block = ['KeyB'];
  const canvas = { requestPointerLock: vi.fn(), focus: vi.fn() } as unknown as HTMLCanvasElement;
  const input = new Input(canvas, () => settings);
  const key = (code: string, repeat = false, type = 'keydown') => {
    for (const listener of listeners.get(type) ?? []) listener({ code, repeat, target: { tagName: 'BODY' }, preventDefault() {} });
  };
  // Exercise App's actual lifecycle methods without starting a renderer or constructing another scene.
  const app = Object.assign(Object.create(App.prototype) as object, {
    mode: 'play', settings, input, canvas, game: new Game(createInitialState()),
    panels: { isOpen: false, closeAll: vi.fn(), el: new ElementFixture('DIV') },
    titleEl: new ElementFixture('DIV'), loadingEl: new ElementFixture('DIV'), debugEl: new ElementFixture('DIV'),
    hud: { el: { inert: true }, show: vi.fn(), showFade: vi.fn(), toast: vi.fn(), caption: vi.fn() },
    player: {
      x: 0, y: 0, z: 0, yaw: 0, alive: true, state: 'free', group: new THREE.Group(), setPosition: vi.fn(),
      channel: null as { kind?: 'skinning'; t: number; dur: number; cancelled?: () => void } | null,
      bowEquipped: vi.fn((game: Game) => game.state.equippedWeapon === 'hunting_bow' && (game.state.inventory.hunting_bow ?? 0) > 0),
      setBowAim: vi.fn(), cancelSkinning: vi.fn(),
    },
    cam: { reset: vi.fn(), setAiming: vi.fn(), yaw: 0, pitch: 0 }, world: { terrain: {}, physics: { holding: null, supportAt: vi.fn(() => null), reset: vi.fn(), restore: vi.fn(), release: vi.fn() } },
    syncMenuHudVisibility: vi.fn(), syncWorldFromState: vi.fn(),
    safePosition: (x: number, z: number, y = 0) => ({ x, z, y }),
    wantLock: vi.fn(), openPause: vi.fn(), speech: { clear: vi.fn() },
    audio: { pauseWorld: vi.fn(), setWildlifeActive: vi.fn(), stopHuntingSounds: vi.fn(), huntingSound: vi.fn() },
    wantPlayLock: false, lockingOut: false, worldBuilding: false, worldBuildFailed: false,
    worldDisposed: false, menuSceneDisposed: false, qualityReload: null, reloadAgain: false,
    bench: { active: false },
  });
  app.player.cancelSkinning.mockImplementation(() => {
    if (app.player.channel?.kind !== 'skinning') return;
    const channel = app.player.channel;
    app.player.channel = null; app.player.state = 'free'; channel.cancelled?.();
  });
  const hunting = new HuntingController(app as unknown as ConstructorParameters<typeof HuntingController>[0],
    () => app.mode === 'play' && !app.panels.isOpen && !app.worldBuilding && !app.worldBuildFailed && !app.qualityReload && document.visibilityState !== 'hidden');
  Reflect.set(app, 'hunting', hunting);
  Reflect.set(app, 'loadingScreen', new LoadingScreen(app.loadingEl as unknown as HTMLElement));
  vi.spyOn(hunting, 'controls'); vi.spyOn(hunting, 'reset');
  const call = (name: string, ...args: unknown[]) => Reflect.apply(Reflect.get(App.prototype, name), app, args);
  return { app, input, canvas, document, key, call, hunting };
}

function startHunting(f: ReturnType<typeof fixture>, action: 'draw' | 'release' | 'skinning') {
  Object.assign(f.app.game.state.inventory, { hunting_bow: 1, arrow: 6, skinning_knife: 1 });
  f.app.game.state.equippedWeapon = 'hunting_bow';
  if (action !== 'skinning') {
    f.key('KeyJ'); f.hunting.controls(.2, true);
    expect(f.hunting.isDrawing).toBe(true);
    if (action === 'release') {
      f.key('KeyJ', false, 'keyup'); f.hunting.controls(0, true);
      expect(f.hunting.isDrawing).toBe(false);
    }
  } else {
    f.app.player.state = 'channel';
    f.app.player.channel = { kind: 'skinning', t: .5, dur: 3.2, cancelled: vi.fn(() => f.app.audio.stopHuntingSounds('skinning')) };
  }
  f.app.audio.stopHuntingSounds.mockClear(); f.app.player.cancelSkinning.mockClear();
  vi.mocked(f.hunting.controls).mockClear(); vi.mocked(f.hunting.reset).mockClear();
  return structuredClone(f.app.game.state.inventory);
}

afterEach(() => { menuFailure.next = false; stagedActors.roots.length = 0; npcCatalog.load.mockReset(); treeCatalog.load.mockReset(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function rebuildFixture() {
  const f = fixture();
  const oldWorld = { scene: new THREE.Scene(), dispose: vi.fn(), terrain: {}, sky: { brightness: 1 }, syncStatic: vi.fn(), physics: { supportAt: vi.fn(() => null), snapshot: vi.fn(() => []), restore: vi.fn(), reset: vi.fn(), release: vi.fn() } };
  const nextWorld = () => ({ scene: new THREE.Scene(), dispose: vi.fn(), terrain: {}, sky: { brightness: 1 }, syncStatic: vi.fn(), physics: { supportAt: vi.fn(() => null), snapshot: vi.fn(() => []), restore: vi.fn(), reset: vi.fn(), release: vi.fn() } });
  Object.assign(f.app, {
    world: oldWorld, library: {}, menuScene: new MenuScene({ quality: f.app.settings.quality }), npcAssets: { create: () => undefined },
    applyUiSettings: vi.fn(), applyQualityToRenderer: vi.fn(), renderer: {},
    prepareWorldGraphics: vi.fn().mockResolvedValue(undefined), prepareMenuGraphics: vi.fn().mockResolvedValue(undefined),
    frameClock: new FrameClock(), frameTimes: [], audioClock: 0, worldDirty: true,
    hud: { ...f.app.hud, el: new ElementFixture('DIV') },
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.spyOn(console, 'error').mockImplementation(() => {});
  return { ...f, oldWorld, nextWorld };
}

async function finishReload(app: object) { await Reflect.get(app, 'qualityReload'); }

describe('actual application world transitions', () => {
  it('keeps residents uninstalled on download failure and installs the playable catalog once without rebuilding the menu', async () => {
    const { app, call } = rebuildFixture();
    Reflect.set(app, 'npcAssets', null);
    const previousMenu = Reflect.get(app, 'menuScene') as MenuScene;
    const models = { create: vi.fn(() => undefined) };
    const failure = new Error('Resident model download failed its integrity check.');
    npcCatalog.load.mockRejectedValueOnce(failure).mockResolvedValueOnce(models);
    await expect(call('prepareNpcAssets')).rejects.toBe(failure);
    expect(previousMenu.dispose).not.toHaveBeenCalled();
    expect(Reflect.get(app, 'npcAssets')).toBeNull();
    expect(Reflect.get(app, 'menuScene')).toBe(previousMenu);
    await call('prepareNpcAssets');
    expect(previousMenu.dispose).not.toHaveBeenCalled();
    expect(models.create).not.toHaveBeenCalled();
    expect(Reflect.get(app, 'npcAssets')).toBe(models);
    const installed = Reflect.get(app, 'menuScene');
    await call('prepareNpcAssets');
    expect(Reflect.get(app, 'menuScene')).toBe(installed);
    expect(npcCatalog.load).toHaveBeenCalledTimes(2);
    expect(treeCatalog.load).not.toHaveBeenCalled();
    expect(models.create).not.toHaveBeenCalled();
  });

  it('loads only the menu resident and grove, keeps the old menu on failure, and retries without loading the playable cast', async () => {
    const { app, call } = rebuildFixture();
    Reflect.set(app, 'npcAssets', null);
    const previousMenu = Reflect.get(app, 'menuScene') as MenuScene;
    const failure = new Error('Required grove texture could not be decoded.');
    const trees = new Map(), residents = { create: vi.fn(() => undefined) };
    treeCatalog.load.mockRejectedValueOnce(failure).mockResolvedValueOnce(trees);
    npcCatalog.load.mockResolvedValue(residents);
    await expect(call('prepareMenuAssets')).rejects.toBe(failure);
    expect(previousMenu.dispose).not.toHaveBeenCalled();
    expect(npcCatalog.load).toHaveBeenCalledExactlyOnceWith(undefined, ['menu:warden']);
    expect(Reflect.get(app, 'npcAssets')).toBeNull();
    expect(Reflect.get(app, 'treeTemplates')).toBeUndefined();
    await call('prepareMenuAssets');
    expect(Reflect.get(app, 'treeTemplates')).toBe(trees);
    expect(Reflect.get(app, 'npcAssets')).toBeNull();
    expect(Reflect.get(app, 'menuAssets')).toBe(residents);
    expect(previousMenu.dispose).toHaveBeenCalledOnce();
    expect(treeCatalog.load).toHaveBeenCalledTimes(2);
    expect(residents.create).toHaveBeenCalledExactlyOnceWith('menu:warden');
  });

  it('shares concurrent menu preparation so a first journey and menu recovery do not replace the backdrop twice', async () => {
    const { app, call } = rebuildFixture();
    const pending = deferred<{ create: ReturnType<typeof vi.fn> }>();
    const assets = { create: vi.fn(() => undefined) };
    npcCatalog.load.mockImplementation(() => pending.promise);
    const previousMenu = Reflect.get(app, 'menuScene') as MenuScene;
    const first = call('prepareMenuAssets') as Promise<void>;
    const duplicate = call('prepareMenuAssets') as Promise<void>;
    expect(duplicate).toBe(first);
    expect(npcCatalog.load).toHaveBeenCalledExactlyOnceWith(undefined, ['menu:warden']);
    expect(treeCatalog.load).toHaveBeenCalledOnce();
    pending.resolve(assets);
    await Promise.all([first, duplicate]);
    expect(previousMenu.dispose).toHaveBeenCalledOnce();
    expect(assets.create).toHaveBeenCalledExactlyOnceWith('menu:warden');
    expect(Reflect.get(app, 'menuLoad')).toBeNull();
  });

  it('waits for the replacement menu graphics when imported assets replace the scene during compilation', async () => {
    const { app, call } = rebuildFixture();
    Reflect.deleteProperty(app, 'prepareMenuGraphics');
    const first = deferred<void>(), second = deferred<void>();
    const oldMenu = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), prepare: vi.fn() };
    const replacement = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), prepare: vi.fn() };
    const compileAsync = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    Reflect.set(app, 'renderer', { compileAsync });
    Reflect.set(app, 'menuScene', oldMenu);
    Reflect.set(app, 'menuGraphicsReady', false);
    let finished = false;
    const preparation = (call('prepareMenuGraphics') as Promise<void>).then(() => { finished = true; });
    expect(compileAsync).toHaveBeenCalledWith(oldMenu.scene, oldMenu.camera);
    Reflect.set(app, 'menuScene', replacement);
    first.resolve();
    await vi.waitFor(() => expect(compileAsync).toHaveBeenCalledWith(replacement.scene, replacement.camera));
    expect(oldMenu.prepare).toHaveBeenCalledOnce();
    expect(replacement.prepare).toHaveBeenCalledOnce();
    expect(finished).toBe(false);
    expect(Reflect.get(app, 'menuGraphicsReady')).toBe(false);
    second.resolve(); await preparation;
    expect(finished).toBe(true);
    expect(Reflect.get(app, 'menuGraphicsReady')).toBe(true);
    expect(compileAsync).toHaveBeenCalledTimes(2);
  });

  it('resident download failure keeps a graphics rebuild paused and presents the existing Retry affordance', async () => {
    const { app, call, oldWorld } = rebuildFixture();
    Reflect.set(app, 'npcAssets', null);
    npcCatalog.load.mockRejectedValue(new Error('Resident models could not load (HTTP 503).'));
    const create = vi.spyOn(WorldScene, 'create');
    call('applySettings', true);
    await finishReload(app);
    expect(create).not.toHaveBeenCalled();
    expect(oldWorld.dispose).toHaveBeenCalledOnce();
    expect(Reflect.get(app, 'worldBuildFailed')).toBe(true);
    expect(app.loadingEl.textContent).toContain('Try again');
    expect(console.error).toHaveBeenCalledWith('Graphics rebuild failed', expect.objectContaining({ message: 'Resident models could not load (HTTP 503).' }));
    expect(app.titleEl.inert).toBe(true);
  });

  it('settles staged painters and releases their final textures when world construction fails', async () => {
    const { app, oldWorld, call } = rebuildFixture();
    const painting = deferred<void>();
    track(painting.promise);
    vi.spyOn(WorldScene, 'create').mockRejectedValueOnce(new Error('scene allocation'));
    const build = call('buildWorld') as Promise<void>;
    const failed = vi.fn();
    const observed = build.catch(failed);
    await Promise.resolve();
    expect(stagedActors.roots.length).toBeGreaterThan(0);
    expect(failed).not.toHaveBeenCalled();
    const mesh = (stagedActors.roots[0] as THREE.Group).children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const lateTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    const textureDisposed = vi.spyOn(lateTexture, 'dispose');
    const geometryDisposed = vi.spyOn(mesh.geometry, 'dispose');
    const materialDisposed = vi.spyOn(mesh.material, 'dispose');
    // A painter completes after the world rejected, but before its owning cast is released.
    mesh.material.map = lateTexture;
    painting.resolve();
    await observed;
    expect(failed).toHaveBeenCalledWith(expect.objectContaining({ message: 'scene allocation' }));
    expect(textureDisposed).toHaveBeenCalledOnce();
    expect(geometryDisposed).toHaveBeenCalledOnce();
    expect(materialDisposed).toHaveBeenCalledOnce();
    expect(oldWorld.dispose).toHaveBeenCalledOnce();
    expect(Reflect.get(app, 'worldBuildFailed')).toBe(true);
    expect(Reflect.get(app, 'worldBuilding')).toBe(false);
  });

  it('quickloading while already playing clears held movement, toggles and queued jump', () => {
    const { app, input, key, call } = fixture();
    key('KeyW'); key('ShiftLeft'); key('KeyB'); key('Space');
    expect(input.uiOpen).toBe(false);
    expect(input.move().y).toBe(1);
    expect(input.held('sprint')).toBe(true);
    expect(input.held('block')).toBe(true);
    expect(input.pressed('jump')).toBe(true);
    call('beginPlay', { recovered: null });
    expect(app.mode).toBe('play');
    expect(input.move().y).toBe(0);
    expect(input.held('sprint')).toBe(false);
    expect(input.held('block')).toBe(false);
    expect(input.pressed('jump')).toBe(false);
    key('KeyW', true); expect(input.move().y).toBe(0);
    key('KeyW', false, 'keyup'); key('KeyW'); expect(input.move().y).toBe(1);
    expect(app.cam.reset).toHaveBeenCalledOnce();
  });

  it('releases a late pointer-lock acquisition after a menu opens', () => {
    vi.useFakeTimers();
    const { app, input, canvas, document, call } = fixture();
    input.uiOpen = true;
    app.panels.isOpen = true;
    document.pointerLockElement = canvas;
    call('onPointerLockChange');
    expect(document.exitPointerLock).toHaveBeenCalledOnce();
    expect(Reflect.get(app, 'wantPlayLock')).toBe(false);
    expect(app.openPause).not.toHaveBeenCalled();
  });

  it('forwards the supported saved height when loading an upper floor', () => {
    const { app, call } = fixture();
    app.game.state.player.y = 26.2;
    const saved = { ...app.game.state.player };
    call('beginPlay', { recovered: null });
    expect(app.player.setPosition).toHaveBeenCalledWith(saved.x, saved.z, saved.yaw, app.world.terrain, 26.2);
  });

  it('restores saved prop support on the rig without offsetting its persistent parent on later loads', () => {
    const { app, call } = fixture();
    const root = new THREE.Group();
    app.player.group.add(root);
    Reflect.set(app.player, 'rig', { root });
    app.player.setPosition.mockImplementation((x: number, z: number, yaw: number, _terrain: unknown, feetY = 0) => {
      Object.assign(app.player, { x, y: feetY, z, yaw });
      root.position.set(x, feetY, z);
    });
    // Authored terrain placement resolves to the ground; the restored loose crate supplies the real saved top.
    Reflect.set(app, 'safePosition', (x: number, z: number) => ({ x, z, y: 0 }));
    const support = vi.fn<(_x: number, _z: number, _feetY: number) => number | null>(() => 2.64);
    Reflect.set(app.world.physics, 'supportAt', support);
    Object.assign(app.game.state.player, { x: 4, y: 2.66, z: 7, yaw: .3 });

    call('beginPlay', { recovered: null });
    expect(app.player.y).toBe(2.64);
    expect(root.getWorldPosition(new THREE.Vector3()).y).toBe(2.64);
    expect(app.player.group.position.y).toBe(0);
    expect(app.world.physics.restore).toHaveBeenCalledWith(app.game.state.physicalObjects);

    support.mockReturnValue(null);
    Object.assign(app.game.state.player, { x: 8, y: 0, z: 9 });
    call('beginPlay', { recovered: null });
    expect(app.player.y).toBe(0);
    expect(root.getWorldPosition(new THREE.Vector3()).y).toBe(0);
    expect(app.player.group.position.y).toBe(0);
  });

  it('cancels a pending speech chain when any world-pausing panel opens', () => {
    const { app, call } = fixture();
    Object.assign(app, { uiRoot: new ElementFixture('DIV'), mapView: {} });
    Object.assign(app.player, { vx: 3, vz: 4, lastMoveSpeed: 5 });
    call('buildShell');
    const opened = Reflect.get(app.panels, 'onOpen') as () => void;
    opened();
    expect(app.speech.clear).toHaveBeenCalledOnce();
    expect(app.player).toMatchObject({ vx: 0, vz: 0, lastMoveSpeed: 0 });
    expect(app.input.uiOpen).toBe(true);
  });

  it.each(['draw', 'release', 'skinning'] as const)('opening a panel cancels active %s without spending an arrow or granting loot', (action) => {
    const f = fixture();
    Object.assign(f.app, { uiRoot: new ElementFixture('DIV'), mapView: {} });
    f.call('buildShell');
    const inventory = startHunting(f, action);
    f.app.panels.isOpen = true;
    Reflect.get(f.app.panels, 'onOpen')();
    f.hunting.afterWorld(.2, false);
    f.app.panels.isOpen = false; f.input.uiOpen = false;
    f.hunting.afterWorld(.2, true);
    expect(f.hunting.controls).toHaveBeenCalledExactlyOnceWith(0, false);
    expect(f.hunting.isDrawing).toBe(false);
    expect(f.app.player.cancelSkinning).toHaveBeenCalledOnce();
    expect(f.app.player.channel).toBeNull();
    expect(f.app.audio.stopHuntingSounds).toHaveBeenCalledWith(action === 'skinning' ? 'skinning' : 'bow_draw');
    expect(f.app.audio.setWildlifeActive).toHaveBeenCalledExactlyOnceWith(false);
    expect(f.app.cam.setAiming).toHaveBeenLastCalledWith(false);
    expect(f.app.game.state.inventory).toEqual(inventory);
    expect(f.hunting.arrows.activeCount).toBe(0);
  });

  it.each(['draw', 'release', 'skinning'] as const)('a graphics pause resets active %s and its pending effects before any rebuilt frame', (action) => {
    const f = fixture(), inventory = startHunting(f, action);
    f.call('pauseForWorldBuild');
    f.hunting.afterWorld(.2, false);
    f.hunting.afterWorld(.2, true);
    expect(f.hunting.reset).toHaveBeenCalledOnce();
    expect(f.hunting.isDrawing).toBe(false);
    expect(f.app.player.channel).toBeNull();
    expect(f.app.audio.stopHuntingSounds).toHaveBeenCalledWith();
    expect(f.app.audio.setWildlifeActive).toHaveBeenCalledExactlyOnceWith(false);
    expect(f.app.audio.pauseWorld).toHaveBeenCalledOnce();
    expect(f.app.game.state.inventory).toEqual(inventory);
    expect(f.hunting.arrows.activeCount).toBe(0);
  });

  it('cancels a pending speech chain before the title or death transition', () => {
    const { app, call } = fixture();
    const death = vi.fn();
    Object.assign(app, { audio: { ...app.audio, death }, buildTitle: vi.fn(), focusTitle: vi.fn() });
    call('enterTitle');
    expect(app.speech.clear).toHaveBeenCalledOnce();
    expect(app.mode).toBe('title');
    app.mode = 'play';
    call('onPlayerDeath');
    expect(app.speech.clear).toHaveBeenCalledTimes(2);
    expect(death).toHaveBeenCalledOnce();
    expect(app.mode).toBe('dead');
  });

  it('does not request pointer lock from the title, a modal, or a world rebuild', () => {
    const { app, canvas, call } = fixture();
    app.mode = 'title'; call('wantLock');
    app.mode = 'play'; app.panels.isOpen = true; call('wantLock');
    app.panels.isOpen = false; Reflect.set(app, 'worldBuilding', true); call('wantLock');
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
    Reflect.set(app, 'worldBuilding', false); call('wantLock');
    expect(canvas.requestPointerLock).toHaveBeenCalledOnce();
  });

  it('keeps a rejected rebuild paused, then retries once without touching or disposing the old world again', async () => {
    const { app, input, canvas, key, call, oldWorld, nextWorld } = rebuildFixture();
    const movedProps = [{ id: 'loose_barrel_0', position: { x: 5, y: .5, z: 4 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }];
    Reflect.set(oldWorld.physics, 'snapshot', vi.fn(() => structuredClone(movedProps)));
    const first = deferred<WorldScene>();
    const retry = deferred<WorldScene>();
    const create = vi.spyOn(WorldScene, 'create').mockImplementationOnce(() => first.promise).mockImplementationOnce(() => retry.promise);
    app.player.x = 7; app.player.y = 26.2; app.player.z = 9;
    const channel = { t: 0.5, dur: 3 };
    Reflect.set(app.player, 'channel', channel);
    key('KeyW'); key('ShiftLeft'); key('Space');
    input.captureNext = vi.fn(); input.captureCancel = vi.fn();
    call('applySettings', true);
    expect(Reflect.get(app, 'audio').pauseWorld).toHaveBeenCalledOnce();
    expect(app.speech.clear).toHaveBeenCalledOnce();
    expect(oldWorld.dispose).toHaveBeenCalledOnce();
    expect(input.captureNext).toBeNull(); expect(input.captureCancel).toBeNull();
    expect(app.panels.el.inert).toBe(true);
    // This press began while construction was pending; it must not activate the newly shown Retry.
    vi.stubGlobal('navigator', { getGamepads: () => [{ connected: true, axes: [0, 0, 0, 0], buttons: [{ pressed: true, value: 1 }] }] });
    first.reject(new Error('scene allocation'));
    await finishReload(app);
    expect(Reflect.get(app, 'worldBuildFailed')).toBe(true);
    expect(app.loadingEl.classList.contains('off')).toBe(false);
    expect(app.loadingEl.attributes.get('role')).toBe('alertdialog');
    expect(app.loadingEl.textContent).toContain('Try again');
    expect(app.mode).toBe('play'); expect(input.uiOpen).toBe(true);
    const button = Reflect.get(app, 'rebuildRetry') as ElementFixture;
    expect(document.activeElement).toBe(button);
    const savedState = structuredClone(app.game.state);
    call('frame', 1000); call('frame', 1017); call('step', 1 / 60); call('render');
    call('startNew'); call('loadSlot', 'quick'); call('quitToTitle'); call('wantLock'); call('togglePanel', 'map'); call('onPanelsClosed');
    expect(oldWorld.syncStatic).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
    expect(app.game.state).toEqual(savedState);
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
    expect(input.uiOpen).toBe(true);
    // A failed scene stays silent without advancing gameplay or restarting its mix.
    expect(Reflect.get(app, 'audio').pauseWorld).toHaveBeenCalledOnce();

    button.click(); button.click();
    expect(Reflect.get(app, 'audio').pauseWorld).toHaveBeenCalledTimes(2);
    expect(app.speech.clear).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(oldWorld.dispose).toHaveBeenCalledOnce();
    const recovered = nextWorld();
    retry.resolve(recovered as unknown as WorldScene);
    await finishReload(app);
    expect(app.world).toBe(recovered);
    expect(oldWorld.physics.snapshot).toHaveBeenCalledOnce();
    expect(recovered.physics.restore).toHaveBeenCalledWith(movedProps);
    expect(Reflect.get(app, 'rebuildPropPoses')).toBeNull();
    expect(Reflect.get(app, 'worldBuildFailed')).toBe(false);
    expect(app.loadingEl.classList.contains('off')).toBe(true);
    expect(app.panels.el.inert).toBe(false); expect(input.uiOpen).toBe(false);
    expect(app.player).toMatchObject({ x: 7, y: 26.2, z: 9, channel });
    expect(input.move().y).toBe(0); expect(input.held('sprint')).toBe(false); expect(input.pressed('jump')).toBe(false);
    key('KeyW', true); expect(input.move().y).toBe(0);
    key('KeyW', false, 'keyup'); key('KeyW'); expect(input.move().y).toBe(1);
  });

  it('serializes overlapping quality changes and keeps the loader until the latest scene is ready', async () => {
    const { app, call, oldWorld, nextWorld } = rebuildFixture();
    const low = deferred<WorldScene>(), high = deferred<WorldScene>();
    const create = vi.spyOn(WorldScene, 'create').mockImplementationOnce(() => low.promise).mockImplementationOnce(() => high.promise);
    app.settings.quality = 'low'; call('applySettings', true);
    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
    app.settings.quality = 'high'; call('applySettings', true);
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]![1].quality).toBe('low');
    const intermediate = nextWorld(); low.resolve(intermediate as unknown as WorldScene);
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1]![1].quality).toBe('high');
    expect(oldWorld.dispose).toHaveBeenCalledOnce(); expect(intermediate.dispose).toHaveBeenCalledOnce();
    expect(app.loadingEl.classList.contains('off')).toBe(false);
    expect(app.input.uiOpen).toBe(true);
    call('step', 1 / 60); expect(intermediate.syncStatic).not.toHaveBeenCalled();
    const latest = nextWorld(); high.resolve(latest as unknown as WorldScene);
    await finishReload(app);
    expect(app.world).toBe(latest); expect(latest.dispose).not.toHaveBeenCalled();
    expect(app.loadingEl.classList.contains('off')).toBe(true);
  });

  it('recovers a failed menu replacement without disposing its old menu twice', async () => {
    const { app, call, oldWorld, nextWorld } = rebuildFixture();
    const oldMenu = Reflect.get(app, 'menuScene') as MenuScene;
    const create = vi.spyOn(WorldScene, 'create').mockResolvedValue(nextWorld() as unknown as WorldScene);
    menuFailure.next = true; app.settings.quality = 'low';
    call('applySettings', true); await finishReload(app);
    expect(oldMenu.dispose).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
    expect(oldWorld.dispose).not.toHaveBeenCalled();
    expect(Reflect.get(app, 'worldBuildFailed')).toBe(true);
    const retry = Reflect.get(app, 'rebuildRetry') as ElementFixture;
    retry.click(); await finishReload(app);
    expect(oldMenu.dispose).toHaveBeenCalledOnce(); expect(oldWorld.dispose).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce(); expect(Reflect.get(app, 'menuSceneDisposed')).toBe(false);
  });

  it('publishes an interactive title and its listeners before menu assets, then defers the world until Start', async () => {
    const { app, call, document, nextWorld } = rebuildFixture();
    Reflect.set(app, 'world', undefined);
    Reflect.set(app, 'mode', 'loading');
    const canvas = { addEventListener: vi.fn() };
    const audio = { ...app.audio, resume: vi.fn(), setPageHidden: vi.fn() };
    const menuReady = deferred<void>();
    Object.assign(app, {
      canvas, audio, buildShell: vi.fn(), prepareMainHero: vi.fn().mockResolvedValue(undefined), applyPixelRatio: vi.fn(), onResize: vi.fn(),
      enterTitle: vi.fn(() => Reflect.set(app, 'mode', 'title')), applyShotParams: vi.fn(),
      prepareMenuAssets: vi.fn(() => menuReady.promise), quietStart: true,
    });
    vi.stubGlobal('location', { search: '' });
    const first = deferred<WorldScene>(), retry = deferred<WorldScene>();
    const create = vi.spyOn(WorldScene, 'create').mockImplementationOnce(() => first.promise).mockImplementationOnce(() => retry.promise);
    const boot = call('init') as Promise<void>;
    await boot;
    expect(create).not.toHaveBeenCalled();
    expect(Reflect.get(app, 'prepareMainHero')).not.toHaveBeenCalled();
    expect(Reflect.get(app, 'prepareMenuAssets')).toHaveBeenCalledOnce();
    expect(app.mode).toBe('title');
    expect(Reflect.get(window, 'tervain')).toBe(app);
    expect(canvas.addEventListener).toHaveBeenCalledOnce();
    expect(document.addEventListener.mock.calls.map(([name]) => name)).toEqual(['pointerlockchange', 'keydown', 'visibilitychange']);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(app.loadingEl.classList.contains('off')).toBe(true);
    call('startNew');
    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(Reflect.get(app, 'initialJourneyLoading')).toBe(true);
    expect(app.input.uiOpen).toBe(true);
    first.reject(new Error('initial scene allocation'));
    await vi.waitFor(() => expect(Reflect.get(app, 'worldBuildFailed')).toBe(true));
    expect(app.loadingEl.textContent).toContain('Your journey could not begin.');
    expect(canvas.addEventListener).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    (Reflect.get(app, 'rebuildRetry') as ElementFixture).click();
    retry.resolve(nextWorld() as unknown as WorldScene);
    await Reflect.get(app, 'initialLoad');
    expect(create).toHaveBeenCalledTimes(2);
    expect(canvas.addEventListener).toHaveBeenCalledOnce();
    expect(document.addEventListener.mock.calls.map(([name]) => name)).toEqual(['pointerlockchange', 'keydown', 'visibilitychange']);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(app.mode).toBe('play');
    expect(app.loadingEl.classList.contains('off')).toBe(true);
    expect(Reflect.get(app, 'prepareWorldGraphics')).toHaveBeenCalledExactlyOnceWith(null);
    menuReady.resolve();
    const visibility = document.addEventListener.mock.calls.find(([name]) => name === 'visibilitychange')?.[1] as (() => void) | undefined;
    expect(visibility).toBeTypeOf('function');
    app.speech.clear.mockClear();
    Reflect.set(app, 'autosaveQuiet', vi.fn());
    document.visibilityState = 'hidden';
    visibility!();
    expect(app.speech.clear).toHaveBeenCalledOnce();
    expect(audio.setPageHidden).toHaveBeenLastCalledWith(true);
    document.visibilityState = 'visible';
    visibility!();
    expect(app.speech.clear).toHaveBeenCalledOnce();
  });

  it('keeps a chosen save through first-entry failure and retry, and exposes play only after its graphics finish', async () => {
    const { app, call, nextWorld } = rebuildFixture();
    Reflect.deleteProperty(app, 'world');
    app.mode = 'title';
    const chosen = createInitialState('slot-2');
    chosen.inventory.arrow = 9;
    chosen.inventory.skinning_knife = 1;
    chosen.clock += 100;
    Object.assign(chosen.player, { x: 12, y: 26.2, z: 34, yaw: .6 });
    const load = vi.fn(() => ({ ok: true, state: chosen, recovered: 'previous' }));
    Reflect.set(app, 'saves', { load });
    Reflect.set(app, 'prepareMainHero', vi.fn().mockResolvedValue(undefined));
    const first = deferred<WorldScene>(), retry = deferred<WorldScene>(), graphics = deferred<void>();
    const create = vi.spyOn(WorldScene, 'create').mockImplementationOnce(() => first.promise).mockImplementationOnce(() => retry.promise);
    Reflect.set(app, 'prepareWorldGraphics', vi.fn(() => graphics.promise));
    call('loadSlot', 'slot-2');
    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(app.game.state).toBe(chosen);
    expect(app.input.uiOpen).toBe(true);
    first.reject(new Error('First world allocation failed.'));
    await Reflect.get(app, 'initialLoad');
    expect(app.mode).toBe('title');
    expect(app.game.state).toBe(chosen);
    const selected = structuredClone(chosen);
    call('startNew'); call('loadSlot', 'quick'); call('step', 1 / 60);
    expect(app.game.state).toEqual(selected);
    expect(load).toHaveBeenCalledOnce();
    (Reflect.get(app, 'rebuildRetry') as ElementFixture).click();
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1]![0]).toBe(chosen);
    retry.resolve(nextWorld() as unknown as WorldScene);
    await vi.waitFor(() => expect(Reflect.get(app, 'prepareWorldGraphics')).toHaveBeenCalledWith({ recovered: 'previous' }));
    expect(app.mode).toBe('title');
    expect(app.input.uiOpen).toBe(true);
    expect(app.loadingEl.classList.contains('off')).toBe(false);
    graphics.resolve();
    await Reflect.get(app, 'initialLoad');
    expect(app.mode).toBe('play');
    expect(app.input.uiOpen).toBe(false);
    expect(app.game.state.inventory.arrow).toBe(9);
    expect(app.game.state.clock).toBe(chosen.clock);
    expect(app.player.setPosition).toHaveBeenCalledWith(12, 34, .6, app.world.terrain, 26.2);
    expect(app.hud.toast).toHaveBeenCalledWith('The latest write was damaged, so the previous save was restored.');
    expect(app.hud.toast).toHaveBeenCalledWith('Game loaded.');
  });

  it('Back after a first-entry graphics failure disposes the staged world and restores the prior title state', async () => {
    const { app, call, nextWorld } = rebuildFixture();
    Reflect.deleteProperty(app, 'world');
    app.mode = 'title';
    app.game.state.inventory.coin = 17;
    const prior = app.game.state;
    const selected = createInitialState('slot-2');
    selected.inventory.arrow = 19;
    Reflect.set(app, 'saves', { load: vi.fn(() => ({ ok: true, state: selected, recovered: null })) });
    Reflect.set(app, 'prepareMainHero', vi.fn().mockResolvedValue(undefined));
    Reflect.set(app, 'prepareWorldGraphics', vi.fn().mockRejectedValue(new Error('The first view could not compile.')));
    Reflect.set(app, 'buildTitle', vi.fn());
    Reflect.set(app, 'focusTitle', vi.fn());
    const staged = nextWorld();
    vi.spyOn(WorldScene, 'create').mockResolvedValue(staged as unknown as WorldScene);
    call('loadSlot', 'slot-2');
    await Reflect.get(app, 'initialLoad');
    expect(app.loadingEl.textContent).toContain('Your journey could not begin.');
    expect(app.game.state).toBe(selected);
    const screen = Reflect.get(app, 'loadingScreen') as LoadingScreen;
    screen.navigate(0, 1); screen.confirm();
    expect(staged.dispose).toHaveBeenCalledOnce();
    expect(Reflect.get(app, 'world')).toBeUndefined();
    expect(app.game.state).toBe(prior);
    expect(app.game.state.inventory.coin).toBe(17);
    expect(app.mode).toBe('title');
    expect(Reflect.get(app, 'worldBuildFailed')).toBe(false);
    expect(Reflect.get(app, 'initialJourneyLoading')).toBe(false);
    expect(app.loadingEl.classList.contains('off')).toBe(true);
    expect(app.titleEl.inert).toBe(false);
  });

  it('a repeated first-entry graphics failure keeps first-load recovery copy even after a world was allocated', async () => {
    const { app, call, nextWorld } = rebuildFixture();
    Reflect.deleteProperty(app, 'world');
    app.mode = 'title';
    Reflect.set(app, 'prepareMainHero', vi.fn().mockResolvedValue(undefined));
    Reflect.set(app, 'prepareWorldGraphics', vi.fn().mockRejectedValue(new Error('The first view could not compile.')));
    vi.spyOn(WorldScene, 'create').mockImplementation(async () => nextWorld() as unknown as WorldScene);
    call('startNew');
    await Reflect.get(app, 'initialLoad');
    expect(app.loadingEl.textContent).toContain('Your journey could not begin.');
    (Reflect.get(app, 'rebuildRetry') as ElementFixture).click();
    await Reflect.get(app, 'initialLoad');
    expect(app.loadingEl.textContent).toContain('Your journey could not begin.');
    expect(app.mode).toBe('title');
  });

  it('changes quality before first entry by rebuilding only the menu and waiting for its graphics', async () => {
    const { app, call, oldWorld } = rebuildFixture();
    Reflect.deleteProperty(app, 'world');
    app.mode = 'title';
    const graphics = deferred<void>();
    Reflect.set(app, 'prepareMenuGraphics', vi.fn(() => graphics.promise));
    const create = vi.spyOn(WorldScene, 'create');
    const oldMenu = Reflect.get(app, 'menuScene') as MenuScene;
    app.settings.quality = 'low';
    call('applySettings', true);
    expect(oldMenu.dispose).toHaveBeenCalledOnce();
    expect(Reflect.get(app, 'prepareMenuGraphics')).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(oldWorld.dispose).not.toHaveBeenCalled();
    expect(app.loadingEl.classList.contains('off')).toBe(false);
    graphics.resolve(); await finishReload(app);
    expect(app.mode).toBe('title');
    expect(Reflect.get(app, 'world')).toBeUndefined();
    expect(app.loadingEl.classList.contains('off')).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps a quality rebuild paused through graphics preparation after the replacement world exists', async () => {
    const { app, call, nextWorld } = rebuildFixture();
    const graphics = deferred<void>();
    Reflect.set(app, 'prepareWorldGraphics', vi.fn(() => graphics.promise));
    const replacement = nextWorld();
    vi.spyOn(WorldScene, 'create').mockResolvedValue(replacement as unknown as WorldScene);
    call('applySettings', true);
    await vi.waitFor(() => expect(Reflect.get(app, 'prepareWorldGraphics')).toHaveBeenCalledOnce());
    expect(app.world).toBe(replacement);
    expect(app.input.uiOpen).toBe(true);
    expect(app.panels.el.inert).toBe(true);
    expect(app.loadingEl.classList.contains('off')).toBe(false);
    const before = structuredClone(app.game.state);
    call('step', 1 / 60);
    expect(app.game.state).toEqual(before);
    expect(replacement.syncStatic).not.toHaveBeenCalled();
    graphics.resolve(); await finishReload(app);
    expect(app.input.uiOpen).toBe(false);
    expect(app.panels.el.inert).toBe(false);
    expect(app.loadingEl.classList.contains('off')).toBe(true);
  });

  it('the actual first-entry graphics path waits for shader compilation and a prepared paint before exposing play', async () => {
    const { app, call, nextWorld } = rebuildFixture();
    Reflect.deleteProperty(app, 'world');
    Reflect.deleteProperty(app, 'prepareWorldGraphics');
    app.mode = 'title';
    Reflect.set(app, 'quietStart', true);
    Reflect.set(app, 'prepareMainHero', vi.fn().mockResolvedValue(undefined));
    const staged = { ...nextWorld(), colliders: [], update: vi.fn() };
    Reflect.set(app, 'buildWorld', vi.fn(async () => Reflect.set(app, 'world', staged)));
    const compiled = deferred<void>();
    const compileAsync = vi.fn(() => compiled.promise);
    Reflect.set(app, 'renderer', { compileAsync, getContext: vi.fn(() => undefined) });
    const camera = new THREE.PerspectiveCamera();
    Object.assign(app.cam, { camera, follow: vi.fn() });
    const render = vi.fn();
    Reflect.set(app, 'renderWorld', render);
    const paints: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { paints.push(callback); return paints.length; }));
    call('startNew');
    await vi.waitFor(() => expect(compileAsync).toHaveBeenCalledWith(staged.scene, camera));
    expect(staged.update).toHaveBeenCalledWith(0, app.game.state, expect.any(THREE.Vector3), app.settings, expect.any(Number), camera, false);
    expect(render).not.toHaveBeenCalled();
    expect(app.mode).toBe('title');
    expect(app.input.uiOpen).toBe(true);
    compiled.resolve();
    await vi.waitFor(() => expect(render).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(paints).toHaveLength(1));
    expect(app.mode).toBe('title');
    expect(Reflect.get(app, 'initialJourneyLoading')).toBe(true);
    expect(app.loadingEl.classList.contains('off')).toBe(false);
    paints[0]!(1000);
    await Reflect.get(app, 'initialLoad');
    expect(app.mode).toBe('play');
    expect(app.input.uiOpen).toBe(false);
    expect(app.loadingEl.classList.contains('off')).toBe(true);
    expect(app.canvas.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
  });

  it.each([['26.2', 26.2], ['Infinity', undefined], ['bad', undefined]] as const)('passes only a finite shot feet hint (%s) to height-aware placement', (hint, expected) => {
    const { app, call } = rebuildFixture();
    vi.stubGlobal('location', { search: `?shot=1&x=12&z=34&feet=${hint}&settle=0` });
    Reflect.set(app, 'startNew', vi.fn()); Reflect.set(app, 'debugTime', vi.fn());
    call('applyShotParams');
    expect(app.player.setPosition).toHaveBeenCalledWith(12, 34, 0, app.world.terrain, expected);
  });
});


describe('map keyboard capture routing', () => {
  it('leaves focused map arrows for the chart while retaining the modal Tab trap', () => {
    const { app, document, call } = fixture();
    const trapTab = vi.fn(() => false), navigate = vi.fn();
    Object.assign(app.panels, { isOpen: true, trapTab, navigate });
    document.activeElement = { matches: (selector: string) => selector === '.map-wrap canvas' } as unknown as ElementFixture;
    const event = { code: 'ArrowRight', defaultPrevented: false, preventDefault: vi.fn(), stopPropagation: vi.fn() };
    call('onUiKey', event);
    expect(trapTab).toHaveBeenCalledWith(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    trapTab.mockReturnValue(true);
    call('onUiKey', { ...event, code: 'Tab' });
    expect(trapTab).toHaveBeenCalledTimes(2);
  });
});

describe('shell corrections (A70)', () => {
  it('prepares the replaced title backdrop after a world rebuild for another quality, so it draws again', async () => {
    const { app, call, nextWorld } = rebuildFixture();
    vi.spyOn(WorldScene, 'create').mockResolvedValue(nextWorld() as unknown as WorldScene);
    app.settings.quality = app.settings.quality === 'low' ? 'high' : 'low';
    call('applySettings', true);
    await finishReload(app);
    expect(Reflect.get(app, 'prepareWorldGraphics')).toHaveBeenCalledOnce();
    expect(Reflect.get(app, 'prepareMenuGraphics')).toHaveBeenCalledOnce();
  });

  it('resizes the render targets with the canvas when the quality preset changes the pixel ratio', () => {
    const { app, call } = fixture();
    vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 2, addEventListener: vi.fn() });
    let ratio = 2;
    const renderer = { shadowMap: { enabled: true }, setPixelRatio: vi.fn((r: number) => { ratio = r; }), getPixelRatio: () => ratio, setSize: vi.fn() };
    const grade = { setMsaa: vi.fn(), setSize: vi.fn(), bloom: true };
    Object.assign(app, { renderer, grade, cam: { ...app.cam, setAspect: vi.fn() }, menuSceneDisposed: true });
    app.settings.quality = 'low';
    call('applyQualityToRenderer');
    expect(grade.setSize).toHaveBeenLastCalledWith(1280, 720);
    app.settings.quality = 'high';
    call('applyQualityToRenderer');
    expect(grade.setSize).toHaveBeenLastCalledWith(2560, 1440);
  });

  it('pauses on respawn when the window lost focus or the capture during the fall', () => {
    const { app, call, document } = fixture();
    Object.assign(app, {
      mode: 'dead', checkpoint: { x: 0, y: 0, z: 0, yaw: 0 }, enemies: [], hitStop: 0,
      world: { ...app.world, terrain: {} }, player: { ...app.player, stamina: 0 },
      cam: { ...app.cam, reset: vi.fn() }, speech: { ...app.speech, hero: vi.fn() },
    });
    Object.assign(document, { hasFocus: () => false });
    call('respawn');
    expect(app.mode).toBe('play');
    expect(app.openPause).toHaveBeenCalledOnce();
    // Focused and still captured: back into play without a pause.
    const second = fixture();
    Object.assign(second.app, {
      mode: 'dead', checkpoint: { x: 0, y: 0, z: 0, yaw: 0 }, enemies: [], hitStop: 0, wantPlayLock: true,
      world: { ...second.app.world, terrain: {} }, player: { ...second.app.player, stamina: 0 },
      cam: { ...second.app.cam, reset: vi.fn() }, speech: { ...second.app.speech, hero: vi.fn() },
    });
    Object.assign(second.document, { hasFocus: () => true, pointerLockElement: second.canvas });
    Object.defineProperty(second.input, 'locked', { get: () => true });
    second.call('respawn');
    expect(second.app.openPause).not.toHaveBeenCalled();
  });
});

describe('slow frames (A70)', () => {
  it('catches a slow frame up in short steps, drawing only after the last and counting a press once', () => {
    const { app, call, key } = rebuildFixture();
    const steps: { dt: number; presenting: boolean; attack: boolean }[] = [];
    Reflect.set(app, 'step', vi.fn((dt: number) => {
      steps.push({ dt, presenting: Reflect.get(app, 'presenting') as boolean, attack: app.input.pressed('jump') });
    }));
    Reflect.set(app, 'worldPaused', false);
    call('frame', 1000);
    key(app.settings.bindings.jump[0]!);
    call('frame', 1100);
    expect(steps.map((s) => s.dt)).toEqual([0.05, 0.05]);
    expect(steps.map((s) => s.presenting)).toEqual([false, true]);
    expect(steps.map((s) => s.attack)).toEqual([true, false]);
    expect(Reflect.get(app, 'presenting')).toBe(true);
    // An ordinary frame is one step that draws.
    steps.length = 0;
    call('frame', 1116);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.presenting).toBe(true);
  });
});
