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
  style = {};
  className = '';
  readonly attributes = new Map<string, string>();
  readonly children: (ElementFixture | string)[] = [];
  readonly listeners = new Map<string, (() => void)[]>();
  readonly classes = new Set<string>();
  readonly classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
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
  const canvas = { requestPointerLock: vi.fn() } as unknown as HTMLCanvasElement;
  const input = new Input(canvas, () => settings);
  const key = (code: string, repeat = false, type = 'keydown') => {
    for (const listener of listeners.get(type) ?? []) listener({ code, repeat, target: { tagName: 'BODY' }, preventDefault() {} });
  };
  // Exercise App's actual lifecycle methods without starting a renderer or constructing another scene.
  const app = Object.assign(Object.create(App.prototype) as object, {
    mode: 'play', settings, input, game: new Game(createInitialState()),
    panels: { isOpen: false, closeAll: vi.fn(), el: new ElementFixture('DIV') },
    titleEl: new ElementFixture('DIV'), loadingEl: new ElementFixture('DIV'), debugEl: new ElementFixture('DIV'),
    hud: { el: { inert: true }, show: vi.fn(), showFade: vi.fn(), toast: vi.fn() },
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
  });
  app.player.cancelSkinning.mockImplementation(() => {
    if (app.player.channel?.kind !== 'skinning') return;
    const channel = app.player.channel;
    app.player.channel = null; app.player.state = 'free'; channel.cancelled?.();
  });
  const hunting = new HuntingController(app as unknown as ConstructorParameters<typeof HuntingController>[0],
    () => app.mode === 'play' && !app.panels.isOpen && !app.worldBuilding && !app.worldBuildFailed && !app.qualityReload && document.visibilityState !== 'hidden');
  Reflect.set(app, 'hunting', hunting);
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
    frameClock: new FrameClock(), frameTimes: [], audioClock: 0, worldDirty: true,
    hud: { ...f.app.hud, el: new ElementFixture('DIV') },
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.spyOn(console, 'error').mockImplementation(() => {});
  return { ...f, oldWorld, nextWorld };
}

async function finishReload(app: object) { await Reflect.get(app, 'qualityReload'); }

describe('actual application world transitions', () => {
  it('preserves the loading error and prior menu until resident preparation succeeds, then installs the set once', async () => {
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
    expect(previousMenu.dispose).toHaveBeenCalledOnce();
    expect(models.create).toHaveBeenCalledWith('menu:warden');
    expect(Reflect.get(app, 'npcAssets')).toBe(models);
    const installed = Reflect.get(app, 'menuScene');
    await call('prepareNpcAssets');
    expect(Reflect.get(app, 'menuScene')).toBe(installed);
    expect(npcCatalog.load).toHaveBeenCalledTimes(2);
    expect(treeCatalog.load).toHaveBeenCalledExactlyOnceWith(['tree-0208']);
    expect(models.create).toHaveBeenCalledOnce();
  });

  it('keeps the previous menu and residents uninstalled when the required grove download fails, then retries', async () => {
    const { app, call } = rebuildFixture();
    Reflect.set(app, 'npcAssets', null);
    const previousMenu = Reflect.get(app, 'menuScene') as MenuScene;
    const failure = new Error('Required grove texture could not be decoded.');
    const trees = new Map(), residents = { create: vi.fn(() => undefined) };
    treeCatalog.load.mockRejectedValueOnce(failure).mockResolvedValueOnce(trees);
    npcCatalog.load.mockResolvedValueOnce(residents);
    await expect(call('prepareNpcAssets')).rejects.toBe(failure);
    expect(previousMenu.dispose).not.toHaveBeenCalled();
    expect(npcCatalog.load).not.toHaveBeenCalled();
    expect(Reflect.get(app, 'treeTemplates')).toBeUndefined();
    await call('prepareNpcAssets');
    expect(Reflect.get(app, 'treeTemplates')).toBe(trees);
    expect(Reflect.get(app, 'npcAssets')).toBe(residents);
    expect(previousMenu.dispose).toHaveBeenCalledOnce();
    expect(treeCatalog.load).toHaveBeenCalledTimes(2);
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
    expect(app.loadingEl.textContent).toContain('Retry graphics');
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
    expect(app.loadingEl.textContent).toContain('Retry graphics');
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
    expect(create).toHaveBeenCalledTimes(2);
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
    expect(oldMenu.dispose).toHaveBeenCalledOnce(); expect(create).not.toHaveBeenCalled();
    expect(oldWorld.dispose).not.toHaveBeenCalled();
    expect(Reflect.get(app, 'worldBuildFailed')).toBe(true);
    const retry = Reflect.get(app, 'rebuildRetry') as ElementFixture;
    retry.click(); await finishReload(app);
    expect(oldMenu.dispose).toHaveBeenCalledOnce(); expect(oldWorld.dispose).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce(); expect(Reflect.get(app, 'menuSceneDisposed')).toBe(false);
  });

  it('keeps initial boot pending through failure and attaches its app listeners and RAF once after retry', async () => {
    const { app, call, document, nextWorld } = rebuildFixture();
    Reflect.set(app, 'world', undefined);
    Reflect.set(app, 'mode', 'loading');
    const canvas = { addEventListener: vi.fn() };
    const audio = { ...app.audio, resume: vi.fn(), setPageHidden: vi.fn() };
    Object.assign(app, {
      canvas, audio, buildShell: vi.fn(), prepareMainHero: vi.fn().mockResolvedValue(undefined), applyPixelRatio: vi.fn(), onResize: vi.fn(),
      enterTitle: vi.fn(() => Reflect.set(app, 'mode', 'title')), applyShotParams: vi.fn(),
    });
    vi.stubGlobal('location', { search: '' });
    const first = deferred<WorldScene>(), retry = deferred<WorldScene>();
    const create = vi.spyOn(WorldScene, 'create').mockImplementationOnce(() => first.promise).mockImplementationOnce(() => retry.promise);
    const boot = call('init') as Promise<void>;
    await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
    first.reject(new Error('initial scene allocation'));
    await vi.waitFor(() => expect(Reflect.get(app, 'worldBuildFailed')).toBe(true));
    expect(canvas.addEventListener).not.toHaveBeenCalled();
    expect(document.addEventListener).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    (Reflect.get(app, 'rebuildRetry') as ElementFixture).click();
    retry.resolve(nextWorld() as unknown as WorldScene);
    await boot;
    expect(create).toHaveBeenCalledTimes(2);
    expect(canvas.addEventListener).toHaveBeenCalledOnce();
    expect(document.addEventListener.mock.calls.map(([name]) => name)).toEqual(['pointerlockchange', 'keydown', 'visibilitychange']);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(app.mode).toBe('title');
    expect(app.loadingEl.classList.contains('off')).toBe(true);
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
