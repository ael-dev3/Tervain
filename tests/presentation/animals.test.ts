import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAnimals, AnimalAnimation, validateAnimalTemplate, type AnimalCallEvent } from '../../src/presentation/animals';
import { ANIMALS, requiredAnimalClips } from '../../src/presentation/animals/catalog';
import { animalGroundAllowed, animalHabitatAllowed, animalRouteDistance, animalSegmentClear, findAnimalPath, findAnimalSite, type AnimalTerrain } from '../../src/presentation/animals/navigation';
import { buildStaticColliders, Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import type { FrameContext } from '../../src/presentation/context';
import { createInitialState } from '../../src/game/state';
import { worldView } from '../../src/game/worldView';
import { animalFixture } from './animalFixture';
import * as navigation from '../../src/presentation/animals/navigation';

const flat: AnimalTerrain = { heightAt: () => 0, walkable: () => true, carveAt: () => 0, seaDepth: () => 0, deckAt: () => null };
const dog = ANIMALS.find(animal => animal.id === '1005232511')!;
const home = { x: 0, z: 15 };
function frame(focus = new THREE.Vector3(0, 0, 21)): FrameContext {
  return { camera: new THREE.PerspectiveCamera(), focus, time: 0, nightness: 0, sunDir: new THREE.Vector3(0, 1, 0),
    reducedMotion: false, hour: 12, view: worldView(createInitialState()), quality: 'high' };
}
afterEach(() => vi.restoreAllMocks());

describe('peaceful animated land wildlife', () => {
  it('uses all nineteen unique source models, with the seated cat retaining seated gestures', () => {
    expect(ANIMALS).toHaveLength(19); expect(new Set(ANIMALS.map(animal => animal.id)).size).toBe(19);
    expect(ANIMALS.filter(animal => animal.species === 'cat')).toHaveLength(3);
    expect(ANIMALS.filter(animal => animal.species === 'deer')).toHaveLength(4);
    const seated = ANIMALS.find(animal => animal.seated)!;
    expect(seated.id).toBe('1005232608'); expect(seated.roam).toBe(0); expect(requiredAnimalClips(seated)).toEqual(['Idle', 'Alert', 'Call', 'Groom', 'Sleep']);
    expect(ANIMALS.filter(animal => animal.habitat === 'warm-woodland').map(animal => animal.species)).toEqual(['tiger', 'lion']);
  });

  it('rejects missing motion, unskinned art, malformed weights and complete models over 50k triangles', () => {
    const source = animalFixture(); expect(validateAnimalTemplate(source, dog).triangles).toBe(12);
    expect(() => validateAnimalTemplate({ ...source, animations: source.animations.filter(clip => clip.name !== 'Run') }, dog)).toThrow(/Run/);
    const scene = new THREE.Group(); scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    expect(() => validateAnimalTemplate({ scene, animations: source.animations }, dog)).toThrow(/skinned/);
    const skin = source.scene.children.find(object => (object as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
    const weights = skin.geometry.getAttribute('skinWeight'); weights.setX(0, 0.3);
    expect(() => validateAnimalTemplate(source, dog)).toThrow(/normalized/); weights.setX(0, 1);
    skin.geometry.index = new THREE.BufferAttribute(new Uint32Array(50_001 * 3), 1);
    expect(() => validateAnimalTemplate(source, dog)).toThrow(/50000/);
  });

  it('drives gait phase by actual resolved speed and crossfades real bone actions', () => {
    const source = animalFixture(), controller = new AnimalAnimation(source.scene, source.animations, 'dog');
    controller.transition('Walk'); controller.update(0.4, 1);
    const head = source.scene.getObjectByName('head')!, walked = head.quaternion.clone(); expect(Math.abs(walked.y)).toBeGreaterThan(0.02);
    controller.update(0.4, 0); expect(head.quaternion.angleTo(walked)).toBeCloseTo(0);
    controller.transition('Call'); controller.update(0.3, 0);
    expect(head.quaternion.angleTo(walked)).toBeGreaterThan(0.01);
    controller.dispose();
  });

  it('creates private skeletons and disposable resources without retiring cached source art', () => {
    const source = animalFixture(), terrain = new Terrain(), colliders = buildStaticColliders(terrain);
    const sourceSkin = source.scene.children.find(object => (object as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
    const sourceTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    (sourceSkin.material as THREE.MeshStandardMaterial).map = sourceTexture;
    const geometryDispose = vi.spyOn(sourceSkin.geometry, 'dispose'), materialDispose = vi.spyOn(sourceSkin.material as THREE.Material, 'dispose');
    const sourceTextureDispose = vi.spyOn(sourceTexture, 'dispose');
    const first = buildAnimals({ terrain, colliders, quality: 'high' }, new Map([[dog.id, source]]), [dog], () => {});
    const second = buildAnimals({ terrain, colliders, quality: 'low' }, new Map([[dog.id, source]]), [dog], () => {});
    const skins = [first, second].map(module => { let skin: THREE.SkinnedMesh | undefined; module.group.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) skin = object as THREE.SkinnedMesh; }); return skin!; });
    expect(skins[0]!.geometry).not.toBe(sourceSkin.geometry); expect(skins[0]!.skeleton).not.toBe(skins[1]!.skeleton);
    expect(skins[0]!.skeleton.bones[2]).not.toBe(sourceSkin.skeleton.bones[2]);
    const ownedGeometryDispose = vi.spyOn(skins[0]!.geometry, 'dispose'), ownedMaterialDispose = vi.spyOn(skins[0]!.material as THREE.Material, 'dispose');
    const texture = (skins[0]!.material as THREE.MeshStandardMaterial).map!, textureDispose = vi.spyOn(texture, 'dispose');
    expect(texture).not.toBe(sourceTexture); expect(texture.image).toBe(sourceTexture.image);
    skins[0]!.skeleton.computeBoneTexture(); const boneTextureDispose = vi.spyOn(skins[0]!.skeleton.boneTexture!, 'dispose');
    first.update(0.1, frame()); second.update(0.1, frame()); first.dispose?.(); first.dispose?.(); second.dispose?.();
    expect(ownedGeometryDispose).toHaveBeenCalledTimes(1); expect(ownedMaterialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1); expect(boneTextureDispose).toHaveBeenCalledTimes(1);
    expect(geometryDispose).not.toHaveBeenCalled(); expect(materialDispose).not.toHaveBeenCalled();
    expect(sourceTextureDispose).not.toHaveBeenCalled();
  });

  it('restores all nineteen on every public preset with correct shadows before the first live frame', () => {
    const templates = new Map(ANIMALS.map(definition => [definition.id, animalFixture()])), terrain = new Terrain(), colliders = buildStaticColliders(terrain);
    for (const quality of ['low', 'medium', 'high'] as const) {
      const module = buildAnimals({ terrain, colliders, quality }, templates, ANIMALS, () => {});
      const input = frame(new THREE.Vector3(1000, 50, -1000)); input.quality = quality; input.wildlifeActive = false;
      module.update(0.1, input);
      expect(module.snapshot()).toHaveLength(19); expect(module.snapshot().every(animal => animal.visible)).toBe(true);
      module.group.traverse(object => { if ((object as THREE.Mesh).isMesh) expect((object as THREE.Mesh).castShadow).toBe(quality !== 'low'); });
      input.wildlifeActive = true; module.update(0.1, input);
      expect(module.snapshot().every(animal => animal.visible)).toBe(true);
      module.dispose?.();
    }
  });

  it('freezes wildlife and gesture events while play is paused, then emits from the actual Call pose', () => {
    const source = animalFixture(), terrain = new Terrain(), colliders = buildStaticColliders(terrain), events: AnimalCallEvent[] = [];
    const module = buildAnimals({ terrain, colliders, quality: 'high' }, new Map([[dog.id, source]]), [dog], event => { events.push(event); expect(module.snapshot()[0]!.state).toBe('Call'); });
    const paused = frame(); paused.wildlifeActive = false; const before = module.snapshot();
    for (let k = 0; k < 1200; k++) module.update(0.1, paused);
    expect(module.snapshot()).toEqual(before); expect(events).toEqual([]);
    const playing = frame(new THREE.Vector3(0, 0, 30));
    for (let k = 0; k < 1600; k++) module.update(0.1, playing);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(event => event.id === dog.id && event.species === 'dog' && Number.isFinite(event.position.y))).toBe(true);
    expect(module.physicalActors).toHaveLength(1); expect(module.contacts[0]!.id).toBe(`animal:${dog.id}`);
    module.dispose?.();
  });

  it('keeps the supplied seated cat stationary through nearby player alerts and calls', () => {
    const definition = ANIMALS.find(animal => animal.seated)!, source = animalFixture(), terrain = new Terrain(), colliders = buildStaticColliders(terrain);
    const module = buildAnimals({ terrain, colliders, quality: 'low' }, new Map([[definition.id, source]]), [definition], () => {});
    const before = module.snapshot()[0]!, input = frame(new THREE.Vector3(before.x + 3, before.y, before.z));
    for (let k = 0; k < 1000; k++) module.update(0.1, input);
    const after = module.snapshot()[0]!; expect(after.x).toBe(before.x); expect(after.z).toBe(before.z); expect(['Run', 'Walk']).not.toContain(after.state);
    module.dispose?.();
  });

  it('lets predators hold their ground and packs scatter together (A70)', () => {
    const wolves = ANIMALS.filter(animal => animal.species === 'wolf'), source = animalFixture();
    const terrain = new Terrain(), colliders = buildStaticColliders(terrain);
    vi.spyOn(navigation, 'findAnimalPath').mockImplementation((_definition, _from, goal) => [goal]);
    const module = buildAnimals({ terrain, colliders, quality: 'low' }, new Map(wolves.map(w => [w.id, source])), wolves, () => {});
    const lead = module.snapshot()[0]!;
    // Inside the flee distance but beyond where a wolf gives way: it stands and watches.
    const watching = frame(new THREE.Vector3(lead.x + 6.2, lead.y, lead.z));
    for (let k = 0; k < 240; k++) module.update(1 / 60, watching);
    expect(module.snapshot()[0]!.state).toMatch(/Alert|Call/);
    expect(module.snapshot().every(w => w.state !== 'Run')).toBe(true);
    // Closer, it runs, and the pack within reach runs with it.
    const close = frame(new THREE.Vector3(lead.x + 2.5, lead.y, lead.z));
    for (let k = 0; k < 90; k++) module.update(1 / 60, close);
    const pack = module.snapshot().filter(w => Math.hypot(w.x - lead.x, w.z - lead.z) < 35);
    expect(pack.length).toBeGreaterThan(1);
    expect(pack.every(w => w.state === 'Run' || w.state === 'Walk')).toBe(true);
    module.dispose?.();
  });

  it('bounds blocked escape replanning and escapes once a dynamic obstruction clears', () => {
    const source = animalFixture(), terrain = new Terrain(), colliders = buildStaticColliders(terrain);
    let blocked = true;
    const planning = vi.spyOn(navigation, 'findAnimalPath').mockImplementation((_definition, _from, goal) => blocked ? null : [goal]);
    const module = buildAnimals({ terrain, colliders, quality: 'high' }, new Map([[dog.id, source]]), [dog], () => {}), start = module.snapshot()[0]!;
    const input = frame(new THREE.Vector3(start.x + 1.5, start.y, start.z));
    for (let k = 0; k < 60; k++) module.update(1 / 60, input);
    expect(planning.mock.calls.length).toBeLessThanOrEqual(20); expect(module.snapshot()[0]!.state).toBe('Alert');
    blocked = false;
    for (let k = 0; k < 120; k++) module.update(1 / 60, input);
    const end = module.snapshot()[0]!;
    expect(end.state).toBe('Run'); expect(Math.hypot(end.x - start.x, end.z - start.z)).toBeGreaterThan(0.3);
    module.dispose?.();
  });

  it('samples all four soles within 48 skin evaluations for a complete animal with multiple meshes', () => {
    const source = animalFixture(8), skin = source.scene.children.find(object => (object as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
    source.scene.add(skin.clone());
    const terrain = new Terrain(), module = buildAnimals({ terrain, colliders: buildStaticColliders(terrain), quality: 'low' }, new Map([[dog.id, source]]), [dog], () => {});
    const skins: THREE.SkinnedMesh[] = []; module.group.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) skins.push(object as THREE.SkinnedMesh); });
    const samples = skins.map(mesh => vi.spyOn(mesh, 'getVertexPosition'));
    module.update(0.1, frame(new THREE.Vector3(0, 0, 30)));
    expect(samples.reduce((sum, spy) => sum + spy.mock.calls.length, 0)).toBeLessThanOrEqual(48);
    const names = new Set<string>();
    samples.forEach((spy, index) => spy.mock.calls.forEach(([vertex]) => names.add(skins[index]!.skeleton.bones[skins[index]!.geometry.getAttribute('skinIndex').getX(vertex)]!.name)));
    expect(names).toEqual(new Set(['frontPawL', 'frontPawR', 'hindPawL', 'hindPawR']));
    module.dispose?.();
  });

  it('keeps a paw raised in the source pose in the contact set when its animation lands on higher soil', () => {
    const source = animalFixture(), skin = source.scene.children.find(object => (object as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
    const positions = skin.geometry.getAttribute('position'), joints = skin.geometry.getAttribute('skinIndex');
    const footJoint = skin.skeleton.bones.findIndex(bone => bone.name === 'frontPawL'); let vertexIndex = -1;
    for (let vertex = 0; vertex < positions.count; vertex++) if (joints.getX(vertex) === footJoint) { positions.setY(vertex, positions.getY(vertex) + 0.16); vertexIndex = vertex; }
    source.animations = source.animations.filter(clip => clip.name !== 'Graze');
    source.animations.find(clip => clip.name === 'Idle')!.tracks.push(new THREE.VectorKeyframeTrack('frontPawL.position', [0, 1, 2], [0, 0, 0, 0, -0.16, 0, 0, 0, 0]));
    let patch: THREE.Vector3 | undefined;
    const terrain = { ...flat, heightAt: (x: number, z: number) => patch && Math.hypot(x - patch.x, z - patch.z) < 0.1 ? 0.1 : 0,
      normalAt: (_x: number, _z: number, out: [number, number, number]) => { out[0] = 0; out[1] = 1; out[2] = 0; return out; } } as unknown as Terrain;
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, new Map([[dog.id, source]]), [dog], () => {}), start = module.snapshot()[0]!;
    patch = new THREE.Vector3(positions.getX(vertexIndex), 0, positions.getZ(vertexIndex)).applyAxisAngle(new THREE.Vector3(0, 1, 0), start.yaw).add(new THREE.Vector3(start.x, 0, start.z));
    for (let k = 0; k < 10; k++) module.update(0.1, frame(new THREE.Vector3(start.x, 0, start.z + 18)));
    let rendered: THREE.SkinnedMesh | undefined; module.group.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) rendered = object as THREE.SkinnedMesh; });
    rendered!.skeleton.update();
    const landed = rendered!.getVertexPosition(vertexIndex, new THREE.Vector3()).applyMatrix4(rendered!.matrixWorld);
    expect(landed.y).toBeGreaterThanOrEqual(0.099); expect(module.snapshot()[0]!.y).toBeGreaterThan(0.09);
    module.dispose?.();
  });
});

describe('animal navigation and habitats', () => {
  it('routes the full body around thin walls and validates every returned segment', () => {
    const colliders = new Colliders(); colliders.box('thin-wall', 2, 15, 0.045, 3);
    const path = findAnimalPath(dog, home, { x: 5, z: 15 }, home, 0.45, flat, colliders);
    expect(path).not.toBeNull(); expect(path!.length).toBeGreaterThan(1);
    let previous = home;
    for (const point of path!) { expect(animalSegmentClear(dog, previous, point, 0.45, flat, colliders, home, dog.roam)).toBe(true); previous = point; }
    expect(path!.some(point => point.z < 11.55 || point.z > 18.45)).toBe(true);
  });

  it('rejects a wet edge beneath the body and cannot plan across a river or out of its habitat leash', () => {
    const wet = { ...flat, carveAt: (x: number) => x > 1.3 && x < 2.1 ? 0.2 : 0 };
    expect(animalGroundAllowed(wet, { x: 0.9, z: 15 }, 0.6)).toBe(false);
    expect(findAnimalPath(dog, home, { x: 5, z: 15 }, home, 0.45, wet, new Colliders())).toBeNull();
    expect(findAnimalPath(dog, home, { x: 10, z: 15 }, home, 0.45, flat, new Colliders())).toBeNull();
  });

  it('uses the real animal height for dynamic contacts on separate floors', () => {
    const colliders = new Colliders(), actor = { id: 'person:balcony', kind: 'circle' as const, x: 2, z: 15, r: 0.5, active: true, minY: 1, maxY: 3 };
    expect(findAnimalPath(dog, home, { x: 4, z: 15 }, home, 0.45, flat, colliders, [actor], 0.4)).toEqual([{ x: 4, z: 15 }]);
    actor.minY = 0.1;
    const diverted = findAnimalPath(dog, home, { x: 4, z: 15 }, home, 0.45, flat, colliders, [actor], 0.4);
    expect(diverted).not.toBeNull(); expect(diverted!.length).toBeGreaterThan(1);
    let previous = home;
    for (const point of diverted!) { expect(animalSegmentClear(dog, previous, point, 0.45, flat, colliders, home, dog.roam, [actor], 0.4)).toBe(true); previous = point; }
  });

  it('places each supplied animal on dry route-visible soil in its intended live-world habitat', () => {
    const terrain = new Terrain(), colliders = buildStaticColliders(terrain), occupied: { x: number; z: number; radius: number }[] = [];
    const sites = ANIMALS.map(definition => { const site = findAnimalSite(definition, definition.species === 'cat' ? 0.6 : 1.2, terrain, colliders, occupied); occupied.push(site); return { definition, site }; });
    expect(sites).toHaveLength(19);
    for (const { definition, site } of sites) {
      expect(animalHabitatAllowed(definition, site), definition.id).toBe(true);
      expect(animalGroundAllowed(terrain, site, site.radius), definition.id).toBe(true);
      expect(colliders.blocked(site.x, site.z, site.radius), definition.id).toBe(false);
      expect(animalRouteDistance(site), definition.id).toBeLessThan(definition.habitat === 'rocky-woodland' ? 65 : 30);
    }
  });
});
