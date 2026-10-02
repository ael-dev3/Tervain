import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { App } from '../../src/app';
import { Game } from '../../src/game/game';
import { WRECK_BLADE_PICKUP } from '../../src/game/types';
import type { Rig } from '../../src/presentation/characters';
import { track } from '../../src/presentation/human/sheetPool';
import { Player } from '../../src/presentation/player';
import type { Terrain } from '../../src/world/terrain';

const heroMock = vi.hoisted(() => ({
  load: vi.fn<() => Promise<GLTF>>(),
  create: vi.fn<(asset: GLTF) => Rig>(),
}));
vi.mock('../../src/presentation/mainHero', () => ({ loadMainHero: heroMock.load }));
vi.mock('../../src/presentation/hero/rig', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/presentation/hero/rig')>(),
  createHeroRig: heroMock.create,
}));

const downloaded = { scene: { name: 'approved-hero' }, animations: [] } as unknown as GLTF;

// Real Player equipment handling and scene resource disposal are used below.
// Only its renderer/asset preparation is replaced with small CPU-only objects.
function smallRig(name: string) {
  const root = new THREE.Group(), body = new THREE.Group();
  root.name = name; root.add(body);
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const geometry = new THREE.BoxGeometry();
  body.add(new THREE.Mesh(geometry, material));
  const joint = () => { const object = new THREE.Group(); body.add(object); return object; };
  const rig: Rig = {
    root, body, hips: joint(), torso: joint(), head: joint(),
    armL: joint(), armR: joint(), legL: joint(), legR: joint(),
    weapon: joint(), scabbard: joint(), sheathed: joint(), shield: null,
    grip: 'none', sash: null, height: 1.899, hipY: 0.95,
    cur: {}, materials: [material], hitFlash: 0, kind: 'humanoid',
  };
  return { rig, texture, material, geometry };
}

type LifecycleApp = {
  player: Player;
  loadingEl: { textContent: string };
  mainHeroInstalled: boolean;
  prepareMainHero: () => Promise<void>;
};

function fixture() {
  const provisional = smallRig('provisional-player'), hero = smallRig('approved-player');
  const original = new Player(provisional.rig);
  const app: LifecycleApp = Object.assign(Object.create(App.prototype), {
    player: original,
    loadingEl: { textContent: '' },
    mainHeroInstalled: false,
  });
  const disposal = {
    texture: vi.spyOn(provisional.texture, 'dispose'),
    material: vi.spyOn(provisional.material, 'dispose'),
    geometry: vi.spyOn(provisional.geometry, 'dispose'),
    heroTexture: vi.spyOn(hero.texture, 'dispose'),
  };
  heroMock.load.mockResolvedValue(downloaded);
  heroMock.create.mockReturnValue(hero.rig);
  return { app, original, provisional, hero, disposal };
}

beforeEach(() => { heroMock.load.mockReset(); heroMock.create.mockReset(); });

describe('installing the approved hero without losing the player or pending sheet', () => {
  it('keeps the provisional player intact after a download rejection and allows Retry to install', async () => {
    const f = fixture(), networkError = new Error('hero download unavailable');
    heroMock.load.mockRejectedValueOnce(networkError);
    await expect(f.app.prepareMainHero()).rejects.toBe(networkError);
    expect(f.app.player).toBe(f.original);
    expect(f.app.mainHeroInstalled).toBe(false);
    expect(heroMock.create).not.toHaveBeenCalled();
    expect(f.disposal.texture).not.toHaveBeenCalled();
    expect(f.disposal.material).not.toHaveBeenCalled();
    expect(f.disposal.geometry).not.toHaveBeenCalled();

    await f.app.prepareMainHero();
    expect(heroMock.load).toHaveBeenCalledTimes(2);
    expect(heroMock.create).toHaveBeenCalledOnce();
    expect(heroMock.create).toHaveBeenCalledWith(downloaded);
    expect(f.app.player).not.toBe(f.original);
    expect(f.app.player.rig).toBe(f.hero.rig);
    expect(f.app.mainHeroInstalled).toBe(true);
    expect(f.disposal.texture).toHaveBeenCalledOnce();
    expect(f.disposal.geometry).toHaveBeenCalledOnce();
    expect(f.disposal.heroTexture).not.toHaveBeenCalled();
  });

  it('does not retire the procedural texture before tracked worker painting and sheet application finish', async () => {
    const f = fixture(), paintedTexture = new THREE.Texture();
    const events: string[] = [];
    const paintedDispose = vi.spyOn(paintedTexture, 'dispose').mockImplementation(() => { events.push('painted-texture-disposed'); });
    let finishWorker!: () => void, finishApplication!: () => void;
    const worker = track(new Promise<void>((resolve) => { finishWorker = resolve; }));
    const application = new Promise<void>((resolve) => { finishApplication = resolve; });
    const applied = track(worker.then(() => application).then(() => {
      // The real sheet pipeline replaces and retires the placeholder as it applies
      // the painted result. Its completion is tracked separately from the worker.
      f.provisional.texture.dispose();
      f.provisional.material.map = paintedTexture;
      events.push('sheet-applied');
    }));
    const installing = f.app.prepareMainHero();
    await Promise.resolve();
    expect(heroMock.create).toHaveBeenCalledOnce();
    expect(f.app.player).toBe(f.original);
    expect(f.app.mainHeroInstalled).toBe(false);
    expect(f.disposal.texture).not.toHaveBeenCalled();
    expect(f.disposal.geometry).not.toHaveBeenCalled();
    expect(paintedDispose).not.toHaveBeenCalled();

    finishWorker();
    await worker;
    expect(f.app.player).toBe(f.original);
    expect(f.disposal.geometry).not.toHaveBeenCalled();
    expect(paintedDispose).not.toHaveBeenCalled();

    finishApplication();
    await applied;
    await installing;
    expect(events).toEqual(['sheet-applied', 'painted-texture-disposed']);
    expect(f.app.player.rig).toBe(f.hero.rig);
    expect(f.app.mainHeroInstalled).toBe(true);
    expect(f.disposal.texture).toHaveBeenCalledOnce();
    expect(paintedDispose).toHaveBeenCalledOnce();
    expect(f.disposal.material).toHaveBeenCalledOnce();
    expect(f.disposal.geometry).toHaveBeenCalledOnce();
    expect(f.disposal.heroTexture).not.toHaveBeenCalled();
  });

  it('installs once and preserves the installed player’s position and equipped blade on later calls', async () => {
    const f = fixture();
    await f.app.prepareMainHero();
    const installed = f.app.player;
    const terrain = { groundAt: () => 3, supportAt: () => 3 } as unknown as Terrain;
    installed.setPosition(12, -8, 1.1, terrain);
    const game = new Game();
    expect(game.dispatch({ t: 'pickup', pickupId: WRECK_BLADE_PICKUP, item: 'rusted_sword', qty: 1 }).ok).toBe(true);
    expect(game.dispatch({ t: 'equipWeapon', item: 'rusted_sword' }).ok).toBe(true);
    installed.syncEquipment(game, true);
    expect(installed.drawn).toBe(true);
    expect(installed.rig.weapon!.visible).toBe(true);
    expect(installed.rig.sheathed!.visible).toBe(false);

    await f.app.prepareMainHero();
    await Promise.all([f.app.prepareMainHero(), f.app.prepareMainHero()]);
    expect(f.app.player).toBe(installed);
    expect([installed.x, installed.y, installed.z, installed.yaw]).toEqual([12, 3, -8, 1.1]);
    expect(installed.rig.root.position.toArray()).toEqual([12, 3, -8]);
    expect(installed.rig.root.rotation.y).toBe(1.1);
    expect(installed.drawn).toBe(true);
    expect(installed.rig.grip).toBe('blade');
    expect(installed.rig.weapon!.visible).toBe(true);
    expect(installed.rig.scabbard!.visible).toBe(true);
    expect(installed.rig.sheathed!.visible).toBe(false);
    expect(game.state.equippedWeapon).toBe('rusted_sword');
    expect(heroMock.load).toHaveBeenCalledOnce();
    expect(heroMock.create).toHaveBeenCalledOnce();
    expect(f.disposal.texture).toHaveBeenCalledOnce();
    expect(f.disposal.material).toHaveBeenCalledOnce();
    expect(f.disposal.geometry).toHaveBeenCalledOnce();
    expect(f.disposal.heroTexture).not.toHaveBeenCalled();
  });

  it('keeps the original player when rig construction rejects the asset and retries cleanly', async () => {
    const f = fixture(), incompatibleAsset = new Error('missing hand.R joint');
    heroMock.create.mockImplementationOnce(() => { throw incompatibleAsset; });
    await expect(f.app.prepareMainHero()).rejects.toBe(incompatibleAsset);
    expect(f.app.player).toBe(f.original);
    expect(f.app.mainHeroInstalled).toBe(false);
    expect(f.disposal.texture).not.toHaveBeenCalled();
    expect(f.disposal.geometry).not.toHaveBeenCalled();
    await f.app.prepareMainHero();
    expect(f.app.player.rig).toBe(f.hero.rig);
    expect(heroMock.create).toHaveBeenCalledTimes(2);
    expect(f.app.mainHeroInstalled).toBe(true);
  });
});
