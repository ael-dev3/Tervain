import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ANIMAL_IDS, ANIMAL_MODEL_IDS, HUNTABLE_ANIMAL_IDS, type AnimalId, type AnimalHuntRecord } from '../../src/game/hunting';
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

const terrain = { heightAt: () => 0, walkable: () => true, carveAt: () => 0, seaDepth: () => 0, deckAt: () => null,
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
