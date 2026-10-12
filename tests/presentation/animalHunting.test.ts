import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ANIMAL_IDS, ANIMAL_MODEL_IDS, HUNTABLE_ANIMAL_IDS, SKINNING_REACH, WILDLIFE_RETURN_DISTANCE, returnWildlife, type AnimalId, type AnimalHuntRecord } from '../../src/game/hunting';
import { buildAnimals, type AnimalCallEvent } from '../../src/presentation/animals';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import { AnimalArrowSurface } from '../../src/presentation/animals/hunting/hit';
import { AnimalImpactEffects } from '../../src/presentation/animals/hunting/impact';
import type { FrameContext } from '../../src/presentation/context';
import { createInitialState } from '../../src/game/state';
import { worldView } from '../../src/game/worldView';
import { Colliders } from '../../src/world/colliders';
import type { Terrain } from '../../src/world/terrain';
import { animalFixture } from './animalFixture';

const terrain = { heightAt: () => 0, groundAt: () => 0, walkable: () => true, carveAt: () => 0, seaDepth: () => 0, deckAt: () => null,
  normalAt: (_x: number, _z: number, out: [number, number, number]) => { out[0] = 0; out[1] = 1; out[2] = 0; return out; } } as unknown as Terrain;
function frame(): FrameContext {
  return { camera: new THREE.PerspectiveCamera(), focus: new THREE.Vector3(150, 0, 22), time: 0, nightness: 0,
    sunDir: new THREE.Vector3(0, 1, 0), reducedMotion: false, hour: 12, view: worldView(createInitialState()), quality: 'high', wildlifeActive: true };
}
function fixture() {
  const source = animalFixture(3), skin = source.scene.children.find(object => (object as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
  const chest = new THREE.Bone(); chest.name = 'chest'; chest.position.set(0, .3, .15); skin.skeleton.bones[0]!.add(chest);
  skin.bind(new THREE.Skeleton([...skin.skeleton.bones, chest])); source.scene.updateMatrixWorld(true);
  return source;
}
function record(status: AnimalHuntRecord['status'], pose: { x: number; y: number; z: number; yaw: number }): AnimalHuntRecord {
  return { status, bodyHits: status === 'injured' ? 1 : 2, headshot: false, position: { x: pose.x, y: pose.y, z: pose.z }, yaw: pose.yaw, atClock: 1 };
}
const tiger = ANIMALS.find(animal => animal.species === 'tiger')!;

describe('hunting through the existing nineteen animal controllers', () => {
  it('maps every durable identity once, including all three boars, while pets and the saddled companion stay peaceful', () => {
    expect(ANIMAL_IDS).toHaveLength(19); expect(new Set(Object.values(ANIMAL_MODEL_IDS)).size).toBe(19);
    expect(new Set(Object.values(ANIMAL_MODEL_IDS))).toEqual(new Set(ANIMALS.map(animal => animal.id)));
    expect(ANIMAL_MODEL_IDS['boar-a']).toBe('1005232442'); expect(ANIMAL_MODEL_IDS['boar-c']).toBe('1005174818'); expect(HUNTABLE_ANIMAL_IDS).toHaveLength(13);
    const cat = ANIMALS.find(animal => animal.seated)!, module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, new Map([[cat.id, fixture()]]), [cat], () => {});
    const pose = module.snapshot()[0]!;
    module.syncHunting({ 'cat-b': record('dead', pose) }, true);
    expect(module.nearestCarcass(pose)).toBeNull(); expect(module.snapshot()[0]!.visible).toBe(true);
    expect(module.traceArrow(new THREE.Vector3(pose.x, .3, pose.z + 3), new THREE.Vector3(0, 0, -1), 6)).toBeNull(); module.dispose?.();
  });

  it('stands the ridden mount on a deck over a stream bed, level, as its rider stands, and leaves it there (A86 scout)', () => {
    const mount = ANIMALS.find(animal => animal.id === ANIMAL_MODEL_IDS['deer-mount'])!;
    // A footbridge: planks at 0.75 over a stream bed at -0.55, for x 33-42.
    const onDeck = (x: number) => x >= 33 && x <= 42;
    const bridge = { ...terrain, heightAt: (x: number) => onDeck(x) ? -0.55 : 0, groundAt: (x: number) => onDeck(x) ? 0.75 : 0,
      normalAt: (_x: number, _z: number, out: [number, number, number]) => { out[0] = 0.6; out[1] = 0.8; out[2] = 0; return out; } } as unknown as Terrain;
    const module = buildAnimals({ terrain: bridge, colliders: new Colliders(), quality: 'low' }, new Map([[mount.id, fixture()]]), [mount], () => {});
    const root = module.group.getObjectByName(`deer / ${mount.id}`)!, input = frame();
    // The rider is here (beyond 90 m away, a mount left out of its rest is led home).
    input.focus.set(36, 0, 22);
    // Ridden on open ground first, beside the bridge.
    module.ride(mount.id, { x: 30, z: 20, yaw: Math.PI / 2, speed: 1 });
    for (let k = 0; k < 30; k++) module.update(1 / 30, input);
    const off = module.snapshot()[0]!;
    module.ride(mount.id, { x: 36.6, z: 20, yaw: Math.PI / 2, speed: 1 });
    for (let k = 0; k < 30; k++) module.update(1 / 30, input);
    const on = module.snapshot()[0]!;
    expect(on.x).toBeCloseTo(36.6, 5);
    // On the planks it stands well above where it stood beside the bridge, not 0.55 m under it.
    expect(on.y - off.y).toBeGreaterThan(0.5);
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(root.quaternion).y).toBeGreaterThan(0.999);
    // Let go on the bridge, it stays on the planks.
    module.ride(mount.id, null);
    for (let k = 0; k < 30; k++) module.update(1 / 30, input);
    expect(module.snapshot()[0]!.y - off.y).toBeGreaterThan(0.5);
    module.dispose?.();
  });

  it('ignores stale mount wounds, corpses and arrow effects, and calmly watches visitors at the inland caravan rest', () => {
    const mount = ANIMALS.find(animal => animal.id === ANIMAL_MODEL_IDS['deer-mount'])!;
    expect(mount.tame).toBe(true); expect(mount.habitat).toBe('caravan-rest'); expect(mount.roam).toBe(0);
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, new Map([[mount.id, fixture()]]), [mount], () => {});
    const pose = module.snapshot()[0]!, root = module.group.getObjectByName(`deer / ${mount.id}`)!, input = frame();
    input.focus.set(pose.x + 2, pose.y, pose.z);
    for (const status of ['injured', 'dead', 'skinned'] as const) {
      module.syncHunting({ 'deer-mount': record(status, pose) }, true);
      expect(module.snapshot()[0]!.visible).toBe(true);
      expect(module.snapshot()[0]!.state).not.toBe('Dead');
      expect(module.nearestCarcass(pose)).toBeNull(); expect(module.skinningFrame('deer-mount', pose)).toBeNull();
      expect(module.traceArrow(new THREE.Vector3(pose.x, .3, pose.z + 3), new THREE.Vector3(0, 0, -1), 6)).toBeNull();
      module.showArrowImpact({ id: 'deer-mount', zone: 'head', point: { x: pose.x, y: .3, z: pose.z }, distance: 1,
        position: { x: pose.x, y: pose.y, z: pose.z }, yaw: pose.yaw }, new THREE.Vector3(0, 0, -1));
      expect(root.getObjectByName('embedded hunting arrow')).toBeUndefined();
      expect(module.group.getObjectByName('carcass stain:deer-mount')).toBeUndefined();
      module.alertShot(pose); module.update(.1, input);
      expect(module.snapshot()[0]!.state).not.toBe('Run');
    }
    for (let k = 0; k < 600; k++) {
      module.update(.1, input);
      const after = module.snapshot()[0]!;
      expect(after.state).not.toBe('Run'); expect(after.visible).toBe(true);
      expect(Math.hypot(after.x - pose.x, after.z - pose.z)).toBeLessThanOrEqual(mount.roam + .01);
    }
    expect(module.contacts).toHaveLength(1); expect(module.physicalActors).toHaveLength(1);
    module.dispose?.();
  });

  it('settles a returning animal at the place in its range farthest from the hunter (A96 scout)', () => {
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, new Map([[tiger.id, fixture()]]), [tiger], () => {});
    const home = module.snapshot()[0]!;
    for (const side of [0, 1, 2, 3]) {
      const a = side * Math.PI / 2, hunter = new THREE.Vector3(home.x + Math.sin(a) * 30, 0, home.z + Math.cos(a) * 30), input = { ...frame(), focus: hunter };
      module.update(.05, input);
      module.syncHunting({ tiger: record('injured', home) });
      module.syncHunting({});
      const back = module.snapshot()[0]!;
      // Never nearer him than its home spot.
      expect(Math.hypot(back.x - hunter.x, back.z - hunter.z), `side ${side}`).toBeGreaterThanOrEqual(30 - 1e-6);
    }
    module.dispose?.();
  });

  it.each(['injured', 'dead', 'skinned'] as const)('waits to return an expired %s animal until its new site is far from the hunter', status => {
    const boar = ANIMALS.find(animal => animal.id === ANIMAL_MODEL_IDS['boar-a'])!;
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, new Map([[boar.id, fixture()]]), [boar], () => {});
    try {
      const home = module.snapshot()[0]!;
      // A legal roam position, with the hunter 70.1 m away on the home side. Every return candidate (<= .7 roam)
      // is still within 70 m of the hunter, even though the durable expiry check passes at the old carcass.
      const taken = { ...home, x: home.x + .9 * boar.roam };
      const hunter = { x: taken.x - WILDLIFE_RETURN_DISTANCE - .1, z: taken.z };
      const state = createInitialState(); state.player.x = hunter.x; state.player.z = hunter.z; state.clock = 100 * 60;
      state.hunting['boar-a'] = record(status, taken);
      module.syncHunting(state.hunting, false, hunter);
      expect(returnWildlife(state)).toEqual(['boar-a']);
      module.syncHunting(state.hunting, false, hunter);
      const waiting = module.snapshot()[0]!;
      expect(waiting.visible, `returned ${Math.hypot(waiting.x - hunter.x, waiting.z - hunter.z).toFixed(3)} m from hunter`).toBe(false);
      expect(waiting.state).toBe('Returning');
      expect(module.contacts).toEqual([]); expect(module.physicalActors).toEqual([]);
      const ray = vi.spyOn(AnimalArrowSurface.prototype, 'trace');
      expect(module.traceArrow(new THREE.Vector3(waiting.x, .3, waiting.z + 3), new THREE.Vector3(0, 0, -1), 6)).toBeNull();
      expect(ray).not.toHaveBeenCalled(); ray.mockRestore();
      module.alertShot(waiting);
      const input = { ...frame(), focus: new THREE.Vector3(hunter.x, 0, hunter.z) };
      for (let i = 0; i < 120; i++) module.update(1 / 60, input);
      expect(module.snapshot()[0]!).toEqual(waiting);
      // A later frame supplies a new hunter position. No further domain record change is needed to retry.
      input.focus.set(home.x - 110, 0, home.z);
      module.setRunning(false); for (let i = 0; i < 20; i++) module.update(.1, input);
      expect(module.snapshot()[0]!.visible).toBe(false);
      module.setRunning(true); for (let i = 0; i < 20; i++) module.update(.1, input);
      const back = module.snapshot()[0]!;
      expect(back.visible).toBe(true); expect(back.state).not.toBe('Returning');
      expect(Math.hypot(back.x - input.focus.x, back.z - input.focus.z)).toBeGreaterThanOrEqual(WILDLIFE_RETURN_DISTANCE);
      expect(module.contacts).toHaveLength(1); expect(module.physicalActors).toHaveLength(1);
    } finally { module.dispose?.(); }
  });

  it('rejects a close fallback when terrain or cover blocks every sampled distant return site', () => {
    const boar = ANIMALS.find(animal => animal.id === ANIMAL_MODEL_IDS['boar-a'])!, colliders = new Colliders();
    // The animal navigation index copies the static cover at construction.
    colliders.add({ id: 'return-site-cover', kind: 'box', x: boar.home.x + 20, z: boar.home.z, hw: 17, hd: 30, yaw: 0, active: true });
    const module = buildAnimals({ terrain, colliders, quality: 'low' }, new Map([[boar.id, fixture()]]), [boar], () => {});
    try {
      const home = module.snapshot()[0]!, hunter = { x: home.x - 65, z: home.z };
      // The theoretical range reaches beyond 70 m, but an obstacle covers that part of it.
      module.syncHunting({ 'boar-a': record('skinned', { ...home, x: home.x + .9 * boar.roam }) }, false, hunter);
      module.syncHunting({}, false, hunter);
      const input = { ...frame(), focus: new THREE.Vector3(hunter.x, 0, hunter.z) };
      for (let i = 0; i < 120; i++) module.update(1 / 60, input);
      expect(module.snapshot()[0]!.visible).toBe(false); expect(module.contacts).toEqual([]);
      // Loading a fresh living state resets the pending return, rather than carrying the previous world's wait.
      module.syncHunting({}, true, hunter);
      expect(module.snapshot()[0]!.visible).toBe(true); expect(module.contacts).toHaveLength(1);
    } finally { module.dispose?.(); }
  });

  it('keeps the knife stance within skinning reach from every side, however far the body reaches (A96 scout)', () => {
    // A body far wider than it is long, as a stag's antlers spread past its chest.
    const wide = fixture();
    wide.scene.traverse(object => { const mesh = object as THREE.SkinnedMesh; if (mesh.isSkinnedMesh) mesh.geometry.scale(9, 1, 1); });
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'high' }, new Map([[tiger.id, wide]]), [tiger], () => {});
    for (let k = 0; k < 4; k++) module.update(.1, frame());
    const pose = module.snapshot()[0]!, at = pose;
    module.syncHunting({ tiger: record('dead', at) });
    for (let k = 0; k < 20; k++) module.update(.1, frame());
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, from = { x: pose.x + Math.sin(a) * 4, z: pose.z + Math.cos(a) * 4 };
      const stance = module.skinningFrame('tiger', from)!.stance;
      expect(Math.hypot(stance.x - at.x, stance.z - at.z), `side ${k}`).toBeLessThanOrEqual(SKINNING_REACH - 0.45 + 1e-6);
      expect(module.nearestCarcass(stance)?.id, `side ${k}`).toBe('tiger');
    }
    module.dispose?.();
  });

  it('starts collapse from the current animated pose, grounds every final surface, and offers an accessible chest knife stance', () => {
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'high' }, new Map([[tiger.id, fixture()]]), [tiger], () => {});
    for (let k = 0; k < 4; k++) module.update(.1, frame());
    const pose = module.snapshot()[0]!, root = module.group.getObjectByName(`tiger / ${tiger.id}`)!, head = root.getObjectByName('head')!;
    const rotation = head.quaternion.clone(), rootRotation = root.quaternion.clone(), height = root.position.y;
    expect(Math.abs(rotation.y)).toBeGreaterThan(.01);
    module.syncHunting({ tiger: record('dead', pose) });
    expect(module.snapshot()[0]!.state).toBe('Dead');
    expect(head.quaternion.angleTo(rotation)).toBeLessThan(1e-6); expect(root.quaternion.angleTo(rootRotation)).toBeLessThan(1e-6); expect(root.position.y).toBeCloseTo(height);
    let knife = module.skinningFrame('tiger', { x: pose.x + 1, z: pose.z }); expect(knife?.ready).toBe(false);
    for (let k = 0; k < 15; k++) module.update(.1, frame());
    knife = module.skinningFrame('tiger', { x: pose.x + 1, z: pose.z }); expect(knife?.ready).toBe(true);
    expect(root.getObjectByName('chest')!.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3().copy(knife!.target))).toBeLessThan(1e-6);
    const contact = new Colliders().resolve(knife!.stance.x, knife!.stance.z, .3, undefined, { minY: 0, maxY: 1.8 }, module.contacts); expect(contact.hit).toBe(false);
    root.traverse(object => {
      const mesh = object as THREE.SkinnedMesh; if (!mesh.isSkinnedMesh) return;
      for (let vertex = 0; vertex < mesh.geometry.getAttribute('position').count; vertex++) expect(mesh.getVertexPosition(vertex, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).y).toBeGreaterThanOrEqual(.0059);
    });
    const stable = root.quaternion.clone(), stableHeight = root.position.y;
    for (let k = 0; k < 20; k++) module.update(.1, frame());
    expect(root.quaternion.angleTo(stable)).toBeLessThan(1e-6); expect(root.position.y).toBeCloseTo(stableHeight);
    expect(module.nearestCarcass(pose)?.id).toBe('tiger'); module.dispose?.();
  });

  it('shares the exact corpse scan budget, stops calls after death, removes harvested contacts, and restores nineteen assets in place', () => {
    const definitions = ANIMALS.filter(animal => animal.species === 'tiger' || animal.species === 'lion'), calls: AnimalCallEvent[] = [];
    const sources = new Map(definitions.map(animal => [animal.id, animalFixture(24)]));
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, sources, definitions, event => calls.push(event));
    const snapshots = module.snapshot(), records = Object.fromEntries(snapshots.map(pose => [pose.species as AnimalId, record('dead', pose)]));
    const spies: ReturnType<typeof vi.spyOn>[] = []; module.group.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) spies.push(vi.spyOn(object as THREE.SkinnedMesh, 'getVertexPosition')); });
    module.syncHunting(records, true); spies.forEach(spy => spy.mockClear());
    module.update(.1, frame());
    expect(spies.reduce((sum, spy) => sum + spy.mock.calls.length, 0)).toBeLessThanOrEqual(2048 + definitions.length * 48);
    for (let k = 0; k < 1000; k++) module.update(.1, frame()); expect(calls).toEqual([]);
    const meshes: THREE.SkinnedMesh[] = []; module.group.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(object as THREE.SkinnedMesh); });
    const geometries = meshes.map(mesh => mesh.geometry);
    module.syncHunting(Object.fromEntries(snapshots.map(pose => [pose.species as AnimalId, record('skinned', pose)])));
    expect(module.snapshot().every(pose => !pose.visible)).toBe(true); expect(module.contacts).toEqual([]); expect(module.physicalActors).toEqual([]);
    expect(module.nearestCarcass(snapshots[0]!)).toBeNull();
    module.syncHunting({}, true); expect(module.snapshot().every(pose => pose.visible)).toBe(true); expect(module.contacts).toHaveLength(2);
    expect(meshes.map(mesh => mesh.geometry)).toEqual(geometries); module.dispose?.(); spies.forEach(spy => spy.mockRestore());
  });

  it('freezes hits, collapse, shot alarms and gesture events while paused', () => {
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, new Map([[tiger.id, fixture()]]), [tiger], () => {}), pose = module.snapshot()[0]!;
    module.syncHunting({ tiger: record('dead', pose) }); module.setRunning(false);
    const before = module.snapshot(); for (let k = 0; k < 100; k++) module.update(.1, frame());
    module.alertShot(pose); expect(module.snapshot()).toEqual(before); expect(module.skinningFrame('tiger', pose)?.ready).toBe(false);
    expect(module.traceArrow(new THREE.Vector3(pose.x, .3, pose.z + 4), new THREE.Vector3(0, 0, -1), 8)).toBeNull();
    module.setRunning(true); for (let k = 0; k < 20; k++) module.update(.1, frame()); expect(module.skinningFrame('tiger', pose)?.ready).toBe(true); module.dispose?.();
  });
});

describe('posed triangle arrow contacts', () => {
  it('follows actual bone deformation, separates body/skull/antler hits, and ignores broad-bound empty air', () => {
    const source = fixture(), mesh = source.scene.children.find(object => (object as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -.3, 0, -.5, .3, 0, -.5, 0, .6, -.5,
      -.15, 1, .65, .15, 1, .65, 0, 1.3, .65,
      -.06, 1.55, .8, .06, 1.55, .8, 0, 1.7, .8,
    ], 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from({ length: 9 }, (_, index) => [index < 3 ? 0 : 2, 0, 0, 0]).flat(), 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(Array.from({ length: 9 }, () => [1, 0, 0, 0]).flat(), 4));
    mesh.geometry = geometry; (mesh.material as THREE.Material).side = THREE.DoubleSide; geometry.computeBoundingSphere(); mesh.boundingSphere = geometry.boundingSphere!.clone(); mesh.boundingSphere.radius += 2;
    const surface = new AnimalArrowSurface({ id: 'stag', species: 'deer' }, source.scene), direction = new THREE.Vector3(0, 0, -1);
    expect(surface.trace(new THREE.Vector3(0, .3, 3), direction, 5)?.zone).toBe('body');
    expect(surface.trace(new THREE.Vector3(0, 1.1, 3), direction, 5)?.zone).toBe('head');
    expect(surface.trace(new THREE.Vector3(0, 1.6, 3), direction, 5)?.zone).toBeNull();
    expect(surface.trace(new THREE.Vector3(.4, .8, 3), direction, 5)).toBeNull();
    mesh.skeleton.bones[2]!.position.z = .35; source.scene.updateMatrixWorld(true); mesh.skeleton.update();
    const hit = surface.trace(new THREE.Vector3(0, 1.1, 3), direction, 5)!; expect(hit.zone).toBe('head'); expect(hit.point.z).toBeCloseTo(1);
    const root = new THREE.Group(); root.add(source.scene); root.updateMatrixWorld(true);
    const effects = new AnimalImpactEffects(terrain);
    effects.impact({ scene: source.scene, root }, { ...hit, id: 'stag', position: { x: 0, y: 0, z: 0 }, yaw: 0 }, direction);
    expect(mesh.skeleton.bones[2]!.getObjectByName('embedded hunting arrow')).toBeTruthy();
    effects.setReduced(true); expect(effects.stats().droplets).toBe(0); effects.dispose(); expect(mesh.skeleton.bones[2]!.getObjectByName('embedded hunting arrow')).toBeUndefined();
  });
});

describe('eighth scout fixes: wounded flight and a load\'s settling (A101)', () => {
  it('sends a wounded animal away from the hunter it faces, not along its own facing toward him', () => {
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, new Map([[tiger.id, fixture()]]), [tiger], () => {});
    const home = module.snapshot()[0]!;
    const hunter = new THREE.Vector3(home.x + 12, 0, home.z), input = { ...frame(), focus: hunter };
    module.update(.05, input);
    // Struck while facing the archer.
    module.syncHunting({ tiger: record('injured', { ...home, yaw: Math.PI / 2 }) });
    const before = Math.hypot(home.x - hunter.x, home.z - hunter.z);
    for (let i = 0; i < 40; i++) module.update(.05, input);
    const after = module.snapshot()[0]!;
    expect(Math.hypot(after.x - hunter.x, after.z - hunter.z)).toBeGreaterThan(before);
    module.dispose?.();
  });

  it('settles animals on a load away from where the hunter arrives, not where he stood before it', () => {
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, new Map([[tiger.id, fixture()]]), [tiger], () => {});
    const home = module.snapshot()[0]!;
    for (const side of [0, 1, 2, 3]) {
      // Last seen far off; the load sets him down 30 m from the animal's home.
      module.update(.05, { ...frame(), focus: new THREE.Vector3(home.x + 400, 0, home.z + 400) });
      module.syncHunting({ tiger: record('injured', home) });
      const a = side * Math.PI / 2, arrival = { x: home.x + Math.sin(a) * 30, z: home.z + Math.cos(a) * 30 };
      module.syncHunting({}, true, arrival);
      const back = module.snapshot()[0]!;
      expect(Math.hypot(back.x - arrival.x, back.z - arrival.z), `side ${side}`).toBeGreaterThanOrEqual(30 - 1e-6);
    }
    module.dispose?.();
  });
});
