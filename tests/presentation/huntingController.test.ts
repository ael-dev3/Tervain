import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import { animalLoot, SKINNING_SECONDS, type AnimalId } from '../../src/game/hunting';
import { defaultSettings } from '../../src/platform/settings';
import { HuntingController } from '../../src/presentation/huntingController';
import type { AnimalArrowHit } from '../../src/presentation/animals/hunting/hit';
import { S } from '../../src/content/strings';

const fixtures: { controller: HuntingController }[] = [];
afterEach(() => { for (const item of fixtures.splice(0)) item.controller.arrows.dispose(); });

/** Geometric contact planes stand in for posed mesh triangles and collision scenery. */
function rayPlane(origin: { x: number; y: number; z: number }, direction: THREE.Vector3, limit: number, z: number) {
  if (Math.abs(direction.z) < 1e-9) return null;
  const distance = (z - origin.z) / direction.z;
  if (distance < 0 || distance > limit) return null;
  return { point: new THREE.Vector3(origin.x, origin.y, origin.z).addScaledVector(direction, distance), distance };
}

function fixture() {
  const game = new Game();
  game.state.inventory.hunting_bow = 1;
  game.state.inventory.arrow = 24;
  game.state.inventory.skinning_knife = 1;
  game.state.equippedWeapon = 'hunting_bow';
  const corpse = { x: -188, y: 4, z: -60 };
  const mutable = {
    allowed: true, held: false, aimHeld: false, attackPressed: false, skinPressed: false,
    animal: true, zone: 'head' as AnimalArrowHit['zone'], id: 'bear-a' as AnimalId,
    cover: [] as number[], muzzleAvailable: true,
    frame: { ready: true, target: { x: corpse.x, y: 4.4, z: corpse.z }, stance: { x: corpse.x, y: 4, z: -61 } } as
      { ready: boolean; target: { x: number; y: number; z: number }; stance: { x: number; y: number; z: number } } | null,
  };
  const channel: { done: (() => void) | null; cancel: (() => void) | null } = { done: null, cancel: null };
  const player = {
    x: corpse.x, y: 4, z: -68, yaw: 0, alive: true, grounded: true, swimming: false, state: 'free',
    bowAiming: false, skinningProgress: null as number | null,
    bowEquipped: vi.fn((current: Game) => current.state.equippedWeapon === 'hunting_bow'),
    setBowAim: vi.fn((aim: unknown) => { player.bowAiming = !!aim; }),
    releaseBow: vi.fn(() => mutable.muzzleAvailable
      ? { origin: new THREE.Vector3(player.x, player.y + 1.25, player.z + .4), direction: new THREE.Vector3(0, 0, 1) }
      : null),
    beginSkinning: vi.fn((_x: number, _z: number, _duration: number, done: () => void, cancel?: () => void, _height?: number) => {
      if (player.state !== 'free') return false;
      channel.done = done; channel.cancel = cancel ?? null;
      player.state = 'channel'; player.skinningProgress = 0;
      return true;
    }),
    cancelSkinning: vi.fn(() => {
      if (channel.done === null) return;
      const cancel = channel.cancel;
      channel.done = channel.cancel = null;
      player.state = 'free'; player.skinningProgress = null;
      cancel?.();
    }),
  };
  game.setPlayerTransform(player.x, player.y, player.z, player.yaw);
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 200);
  camera.position.set(player.x, player.y + 2, player.z - 3);
  camera.lookAt(corpse.x, corpse.y + 1, corpse.z);
  camera.updateMatrixWorld();
  const cam = { camera, yaw: 0, pitch: 0, setAiming: vi.fn() };
  const input = {
    bowMode: false,
    isDown: vi.fn((action: string) => action === 'attack' ? mutable.held : action === 'block' ? mutable.aimHeld : false),
    pressed: vi.fn((action: string) => action === 'attack' ? mutable.attackPressed : action === 'skin' ? mutable.skinPressed : false),
    label: vi.fn((action: string) => action),
  };
  const audio = { huntingSound: vi.fn(), stopHuntingSounds: vi.fn() };
  const hud = { toast: vi.fn(), setHunting: vi.fn() };
  const animals = {
    alertShot: vi.fn(), showArrowImpact: vi.fn(), syncHunting: vi.fn(),
    traceArrow: vi.fn((origin: THREE.Vector3, direction: THREE.Vector3, limit: number): AnimalArrowHit | null => {
      if (!mutable.animal) return null;
      const hit = rayPlane(origin, direction, limit, corpse.z);
      return hit ? { ...hit, id: mutable.id, zone: mutable.zone, position: { ...corpse }, yaw: .3 } : null;
    }),
    nearestCarcass: vi.fn(() => game.state.hunting[mutable.id]?.status === 'dead'
      ? { id: mutable.id, species: 'bear', position: corpse, yaw: .3, distance: 1 } : null),
    skinningFrame: vi.fn(() => mutable.frame),
  };
  const physics = {
    holding: false,
    traceProjectile: vi.fn((from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) => {
      const direction = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
      const distance = direction.length();
      if (distance < 1e-9) return null;
      direction.normalize();
      return mutable.cover.map((z) => rayPlane(from, direction, distance, z))
        .filter((hit): hit is NonNullable<typeof hit> => !!hit).sort((a, b) => a.distance - b.distance)[0] ?? null;
    }),
  };
  const world = { scene: new THREE.Scene(), animals, physics };
  const host = { game, player, cam, input, audio, hud, world, settings: defaultSettings() };
  const controller = new HuntingController(host as unknown as ConstructorParameters<typeof HuntingController>[0], () => mutable.allowed);
  const dispatch = vi.spyOn(game, 'dispatch');
  const item = { game, player, cam, input, audio, hud, world, mutable, controller, dispatch, corpse, channel,
    completeSkinning: () => {
      const done = channel.done;
      channel.done = channel.cancel = null;
      player.state = 'free'; player.skinningProgress = null;
      done?.();
    } };
  fixtures.push(item);
  return item;
}

function beginDraw(item: ReturnType<typeof fixture>, dt = .35) {
  item.mutable.held = item.mutable.attackPressed = true;
  item.controller.controls(dt, true);
  item.mutable.attackPressed = false;
}
function release(item: ReturnType<typeof fixture>) {
  item.mutable.held = false;
  item.controller.controls(0, true);
  item.controller.afterWorld(0, true);
}
function shootToImpact(item: ReturnType<typeof fixture>) {
  beginDraw(item); release(item); item.controller.afterWorld(.25, true);
}
function prepareCarcass(item: ReturnType<typeof fixture>) {
  item.game.dispatch({ t: 'hitAnimal', hit: { id: item.mutable.id, zone: 'head', position: item.corpse, yaw: .3 } });
  item.player.z = -61;
  item.game.setPlayerTransform(item.player.x, item.player.y, item.player.z, item.player.yaw);
  item.dispatch.mockClear();
}

describe('hunting controller command integration', () => {
  it('fires a completed attack tap between frames once, with one arrow and one eventual impact', () => {
    const item = fixture();
    const launch = vi.spyOn(item.controller.arrows, 'launch');
    // Input preserves the press edge when mouseup/key-up arrives before the next rendered frame.
    item.mutable.attackPressed = true;
    item.mutable.held = false;
    item.controller.controls(1 / 60, true);
    expect(item.controller.isDrawing).toBe(false);
    expect(item.game.state.inventory.arrow).toBe(24);
    expect(item.player.bowAiming).toBe(true);
    item.controller.afterWorld(0, true);
    item.controller.afterWorld(0, true);
    expect(item.game.state.inventory.arrow).toBe(23);
    expect(item.controller.arrows.activeCount).toBe(1);
    expect(launch).toHaveBeenCalledExactlyOnceWith(expect.any(THREE.Vector3), expect.any(THREE.Vector3), 65);
    item.mutable.attackPressed = false;
    item.controller.controls(1 / 60, true);
    item.controller.afterWorld(.25, true);
    item.controller.controls(1 / 60, true);
    item.controller.afterWorld(.25, true);
    expect(item.dispatch.mock.calls.filter(([command]) => command.t === 'fireBow')).toHaveLength(1);
    expect(item.dispatch.mock.calls.filter(([command]) => command.t === 'hitAnimal')).toHaveLength(1);
    expect(item.audio.huntingSound.mock.calls.filter(([kind]) => kind === 'bow_release')).toHaveLength(1);
    expect(item.game.state.hunting['bear-a']?.status).toBe('dead');
  });

  it('retains held aim draw behavior when attack was held before aiming', () => {
    const item = fixture(); item.mutable.held = true;
    item.controller.controls(.1, true);
    expect(item.controller.isDrawing).toBe(false);
    item.mutable.aimHeld = true;
    item.controller.controls(.35, true);
    expect(item.controller.isDrawing).toBe(true);
    expect(item.controller.drawFraction).toBeCloseTo(.5);
    expect(item.game.state.inventory.arrow).toBe(24);
    release(item);
    expect(item.game.state.inventory.arrow).toBe(23);
  });

  it('does not draw, play draw audio or zoom the camera while swimming', () => {
    const item = fixture(); item.player.swimming = true;
    item.mutable.held = item.mutable.attackPressed = item.mutable.aimHeld = true;
    item.controller.controls(.35, true);
    item.controller.afterWorld(.25, true);
    expect(item.controller.isDrawing).toBe(false);
    expect(item.player.setBowAim).toHaveBeenLastCalledWith(null);
    expect(item.cam.setAiming).toHaveBeenLastCalledWith(false);
    expect(item.audio.huntingSound).not.toHaveBeenCalled();
    expect(item.game.state.inventory.arrow).toBe(24);
    expect(item.controller.arrows.activeCount).toBe(0);
  });

  it.each(['drawing', 'release queued'] as const)('entering deep water cancels a %s bow before release without a delayed shot', (phase) => {
    const item = fixture(); beginDraw(item);
    if (phase === 'release queued') {
      item.mutable.held = false;
      item.controller.controls(0, true);
    }
    // Swimming starts in player.update, between hunting controls and afterWorld.
    item.player.swimming = true;
    item.controller.afterWorld(.25, true);
    expect(item.controller.isDrawing).toBe(false);
    expect(item.cam.setAiming).toHaveBeenLastCalledWith(false);
    expect(item.audio.stopHuntingSounds).toHaveBeenCalledWith('bow_draw');
    expect(item.player.releaseBow).not.toHaveBeenCalled();
    expect(item.game.state.inventory.arrow).toBe(24);
    item.player.swimming = false;
    item.mutable.held = item.mutable.attackPressed = false;
    item.controller.controls(.1, true);
    item.controller.afterWorld(.25, true);
    expect(item.controller.arrows.activeCount).toBe(0);
    expect(item.dispatch.mock.calls.some(([command]) => command.t === 'fireBow')).toBe(false);
  });

  it('keeps an already launched arrow flying when the player enters deep water', () => {
    const item = fixture(); beginDraw(item); release(item);
    item.player.swimming = true;
    item.controller.afterWorld(.25, true);
    expect(item.game.state.hunting['bear-a']?.status).toBe('dead');
    expect(item.game.state.inventory.arrow).toBe(23);
    expect(item.dispatch.mock.calls.filter(([command]) => command.t === 'fireBow')).toHaveLength(1);
  });

  it('charges without spending ammo, then spends one arrow at release and damages only at swept contact', () => {
    const item = fixture();
    beginDraw(item);
    expect(item.controller.isDrawing).toBe(true);
    expect(item.controller.drawFraction).toBeCloseTo(.5);
    expect(item.game.state.inventory.arrow).toBe(24);
    expect(item.game.state.hunting).toEqual({});
    release(item);
    expect(item.game.state.inventory.arrow).toBe(23);
    expect(item.game.state.hunting).toEqual({});
    expect(item.controller.arrows.activeCount).toBe(1);
    item.controller.afterWorld(.01, true);
    expect(item.game.state.hunting).toEqual({});
    item.controller.afterWorld(.25, true);
    expect(item.game.state.hunting['bear-a']).toMatchObject({ status: 'dead', headshot: true });
    expect(item.game.state.inventory.arrow).toBe(23);
    expect(item.dispatch.mock.calls.filter(([command]) => command.t === 'fireBow')).toHaveLength(1);
    expect(item.dispatch.mock.calls.filter(([command]) => command.t === 'hitAnimal')).toHaveLength(1);
    item.controller.afterWorld(1, true);
    expect(item.dispatch.mock.calls.filter(([command]) => command.t === 'hitAnimal')).toHaveLength(1);
    expect(item.world.animals.showArrowImpact).toHaveBeenCalledOnce();
  });

  it('requires two actual body impacts, while the first leaves a durable wound and grants no loot', () => {
    const item = fixture();
    item.mutable.zone = 'body';
    shootToImpact(item);
    expect(item.game.state.hunting['bear-a']).toMatchObject({ status: 'injured', bodyHits: 1, headshot: false });
    expect(item.game.state.inventory.animal_hide ?? 0).toBe(0);
    shootToImpact(item);
    expect(item.game.state.hunting['bear-a']).toMatchObject({ status: 'dead', bodyHits: 2, headshot: false });
    expect(item.game.state.inventory.arrow).toBe(22);
  });

  it('an antler contact stops the arrow without injuring or killing the stag', () => {
    const item = fixture();
    item.mutable.zone = null; item.mutable.id = 'stag';
    shootToImpact(item);
    expect(item.game.state.hunting).toEqual({});
    expect(item.game.state.inventory.arrow).toBe(23);
    expect(item.controller.arrows.activeCount).toBe(0);
    expect(item.world.animals.showArrowImpact).toHaveBeenCalledOnce();
    expect(item.audio.huntingSound).toHaveBeenCalledWith('arrow_ground', expect.any(THREE.Vector3), expect.any(Object));
    expect(item.audio.huntingSound.mock.calls.some(([kind]) => kind === 'arrow_flesh')).toBe(false);
  });

  it.each([-64, -60])('cover at z=%s wins before or tied with the animal and never damages through it', (cover) => {
    const item = fixture(); item.mutable.cover = [cover];
    shootToImpact(item);
    expect(item.game.state.hunting).toEqual({});
    expect(item.game.state.inventory.arrow).toBe(23);
    expect(item.world.animals.showArrowImpact).not.toHaveBeenCalled();
    expect(item.controller.arrows.lodgedCount).toBe(1);
  });

  it('an animal closer than scenery receives the impact, while cover between torso and bow tip blocks immediately', () => {
    const clear = fixture(); clear.mutable.cover = [-58];
    shootToImpact(clear);
    expect(clear.game.state.hunting['bear-a']?.status).toBe('dead');
    const blocked = fixture(); blocked.mutable.cover = [-67.8];
    shootToImpact(blocked);
    expect(blocked.game.state.hunting).toEqual({});
    expect(blocked.game.state.inventory.arrow).toBe(23);
    expect(blocked.controller.arrows.activeCount).toBe(0);
    expect(blocked.audio.huntingSound.mock.calls.filter(([kind]) => kind === 'arrow_ground')).toHaveLength(1);
  });

  it.each(['pause', 'hidden', 'menu', 'equipment'] as const)('cancels an unreleased draw on %s without ammo or a late shot', (cause) => {
    const item = fixture(); beginDraw(item);
    if (cause === 'hidden' || cause === 'menu') item.mutable.allowed = false;
    if (cause === 'equipment') item.game.state.equippedWeapon = null;
    item.mutable.held = false;
    item.controller.controls(.1, cause !== 'pause');
    item.controller.afterWorld(.25, cause !== 'pause');
    expect(item.controller.isDrawing).toBe(false);
    expect(item.controller.arrows.activeCount).toBe(0);
    expect(item.game.state.inventory.arrow).toBe(24);
    expect(item.game.state.hunting).toEqual({});
    item.mutable.allowed = true;
    item.game.state.equippedWeapon = 'hunting_bow';
    item.controller.controls(.1, true); item.controller.afterWorld(.25, true);
    expect(item.game.state.inventory.arrow).toBe(24);
  });

  it('cannot spend ammunition without a real arrow-tip release pose or after an equipment change before release', () => {
    const unavailable = fixture(); unavailable.mutable.muzzleAvailable = false;
    beginDraw(unavailable); release(unavailable);
    expect(unavailable.game.state.inventory.arrow).toBe(24);
    expect(unavailable.controller.arrows.activeCount).toBe(0);
    const switched = fixture(); beginDraw(switched);
    switched.mutable.held = false; switched.controller.controls(0, true);
    switched.game.state.equippedWeapon = null;
    switched.controller.afterWorld(.25, true);
    expect(switched.game.state.inventory.arrow).toBe(24);
    expect(switched.controller.arrows.activeCount).toBe(0);
  });

  it('a launched arrow freezes while paused, can land after a weapon switch, and reset removes every transient flight', () => {
    const item = fixture(); beginDraw(item); release(item);
    item.controller.afterWorld(2, false);
    expect(item.controller.arrows.activeCount).toBe(1);
    expect(item.game.state.hunting).toEqual({});
    item.game.state.equippedWeapon = null;
    item.controller.afterWorld(.25, true);
    expect(item.game.state.hunting['bear-a']?.status).toBe('dead');
    item.game.state.equippedWeapon = 'hunting_bow';
    item.mutable.animal = false;
    beginDraw(item); release(item);
    expect(item.controller.arrows.activeCount).toBe(1);
    item.controller.reset();
    expect(item.controller.arrows.activeCount).toBe(0);
    expect(item.controller.arrows.lodgedCount).toBe(0);
    const before = structuredClone(item.game.state);
    item.controller.afterWorld(1, true);
    expect(item.game.state).toEqual(before);
    expect(item.audio.stopHuntingSounds).toHaveBeenCalledWith();
  });
});

describe('skinning controller command integration', () => {
  it('offers the skinning instructions when a grounded player can reach a settled carcass', () => {
    const item = fixture(); prepareCarcass(item);
    item.controller.updateHud();
    expect(item.hud.setHunting).toHaveBeenLastCalledWith(expect.objectContaining({
      canSkin: true, skinUnavailable: undefined,
    }));
    item.controller.skin();
    expect(item.player.beginSkinning).toHaveBeenCalledOnce();
  });

  it.each([
    ['airborne', 'hunting.skin_need_footing'], ['swimming', 'hunting.skin_need_footing'],
    ['held object', 'hunting.skin_put_down'], ['drawing', 'hunting.skin_release_bow'],
    ['busy', 'hunting.skin_busy'], ['collapse', 'hunting.skin_wait'],
    ['cover', 'hunting.skin_blocked'], ['distance', 'hunting.too_far'], ['knife', 'hunting.need_knife'],
  ] as const)('the HUD and Skin action explain the same unavailable prerequisite for %s', (cause, key) => {
    const item = fixture(); prepareCarcass(item);
    if (cause === 'airborne') item.player.grounded = false;
    if (cause === 'swimming') item.player.swimming = true;
    if (cause === 'held object') item.world.physics.holding = true;
    if (cause === 'drawing') beginDraw(item);
    if (cause === 'busy') item.player.state = 'attack';
    if (cause === 'collapse') item.mutable.frame!.ready = false;
    if (cause === 'cover') item.mutable.cover = [-60.5];
    if (cause === 'distance') item.mutable.frame!.stance.z += .41;
    if (cause === 'knife') item.game.state.inventory.skinning_knife = 0;
    item.controller.updateHud();
    expect(item.hud.setHunting).toHaveBeenLastCalledWith(expect.objectContaining({
      canSkin: false, skinUnavailable: S(key),
    }));
    item.controller.skin();
    expect(item.hud.toast).toHaveBeenLastCalledWith(S(key), cause === 'knife' ? 'bad' : undefined);
    expect(item.player.beginSkinning).not.toHaveBeenCalled();
    expect(item.game.state.inventory.animal_hide ?? 0).toBe(0);
  });

  it('channels against the real ready carcass target and grants species loot only once after completion', () => {
    const item = fixture(); prepareCarcass(item);
    item.controller.skin();
    expect(item.player.beginSkinning).toHaveBeenCalledWith(item.corpse.x, item.corpse.z, SKINNING_SECONDS,
      expect.any(Function), expect.any(Function), 4.4);
    expect(item.game.state.inventory.animal_hide ?? 0).toBe(0);
    expect(item.game.state.hunting['bear-a']?.status).toBe('dead');
    const lateCallback = item.channel.done!;
    item.completeSkinning();
    expect(item.game.state.inventory).toMatchObject(animalLoot('bear-a'));
    expect(item.game.state.hunting['bear-a']?.status).toBe('skinned');
    lateCallback(); item.controller.skin();
    expect(item.dispatch.mock.calls.filter(([command]) => command.t === 'skinAnimal')).toHaveLength(1);
    expect(item.game.state.inventory).toMatchObject(animalLoot('bear-a'));
    expect(item.audio.huntingSound.mock.calls.filter(([kind]) => kind === 'skinning_complete')).toHaveLength(1);
  });

  it.each(['missing mesh', 'collapse', 'distance', 'knife', 'cover', 'busy', 'held object', 'inactive'] as const)(
    'cannot start harvesting with %s', (cause) => {
      const item = fixture(); prepareCarcass(item);
      if (cause === 'missing mesh') item.mutable.frame = null;
      if (cause === 'collapse') item.mutable.frame!.ready = false;
      if (cause === 'distance') item.mutable.frame!.stance.z += .41;
      if (cause === 'knife') item.game.state.inventory.skinning_knife = 0;
      if (cause === 'cover') item.mutable.cover = [-60.5];
      if (cause === 'busy') item.player.state = 'attack';
      if (cause === 'held object') item.world.physics.holding = true;
      if (cause === 'inactive') item.mutable.allowed = false;
      item.controller.skin();
      expect(item.player.beginSkinning).not.toHaveBeenCalled();
      expect(item.game.state.inventory.animal_hide ?? 0).toBe(0);
      expect(item.game.state.hunting['bear-a']?.status).toBe('dead');
    });

  it.each(['pause', 'moved', 'airborne', 'swimming', 'knife', 'cover', 'cancel button', 'reset'] as const)(
    'cancels a skinning channel on %s and gives no partial loot', (cause) => {
      const item = fixture(); prepareCarcass(item); item.controller.skin();
      if (cause === 'moved') item.player.z -= .5;
      if (cause === 'airborne') item.player.grounded = false;
      if (cause === 'swimming') item.player.swimming = true;
      if (cause === 'knife') item.game.state.inventory.skinning_knife = 0;
      if (cause === 'cover') item.mutable.cover = [-60.5];
      if (cause === 'cancel button') item.controller.skin();
      else if (cause === 'reset') item.controller.reset();
      else item.controller.controls(.1, cause !== 'pause');
      item.completeSkinning();
      expect(item.game.state.inventory.animal_hide ?? 0).toBe(0);
      expect(item.game.state.inventory.raw_meat ?? 0).toBe(0);
      expect(item.game.state.hunting['bear-a']?.status).toBe('dead');
      expect(item.dispatch.mock.calls.some(([command]) => command.t === 'skinAnimal')).toBe(false);
      expect(item.audio.stopHuntingSounds).toHaveBeenCalledWith('skinning');
    });

  it('rechecks line of sight and active gameplay at the completion callback before sending a harvest command', () => {
    for (const cause of ['cover', 'inactive'] as const) {
      const item = fixture(); prepareCarcass(item); item.controller.skin();
      if (cause === 'cover') item.mutable.cover = [-60.5];
      else item.mutable.allowed = false;
      item.completeSkinning();
      expect(item.dispatch.mock.calls.some(([command]) => command.t === 'skinAnimal')).toBe(false);
      expect(item.game.state.inventory.animal_hide ?? 0).toBe(0);
      expect(item.game.state.hunting['bear-a']?.status).toBe('dead');
    }
  });

  it('restores the transient bow input mode and hides interaction HUD while gameplay is inactive', () => {
    const item = fixture();
    item.controller.syncInputMode();
    expect(item.input.bowMode).toBe(true);
    item.game.state.equippedWeapon = null;
    item.controller.syncInputMode();
    expect(item.input.bowMode).toBe(false);
    item.mutable.allowed = false;
    item.controller.updateHud();
    expect(item.hud.setHunting).toHaveBeenCalledWith(null);
  });
});
