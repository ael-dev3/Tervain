import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ANIMAL_MODEL_IDS, HUNTABLE_ANIMAL_IDS, type AnimalHuntRecord } from '../../src/game/hunting';
import { buildAnimals } from '../../src/presentation/animals';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import { animalHabitatAllowed } from '../../src/presentation/animals/navigation';
import type { FrameContext } from '../../src/presentation/context';
import { createInitialState } from '../../src/game/state';
import { worldView } from '../../src/game/worldView';
import { Colliders } from '../../src/world/colliders';
import type { Terrain } from '../../src/world/terrain';
import { animalTemplates } from './animalFixture';
import { CARAVAN_ANIMAL_REST } from '../../src/world/caravanAnimal';

describe('source model hunting integration', () => {
  it('retains the real saddled 29-bone deer as a living, calm caravan mount through old save states and shots', async () => {
    const definition = ANIMALS.find(animal => animal.id === ANIMAL_MODEL_IDS['deer-mount'])!, templates = await animalTemplates([definition]);
    const terrain = { heightAt: () => 0, walkable: () => true, carveAt: () => 0, seaDepth: () => 0, deckAt: () => null,
      normalAt: (_x: number, _z: number, out: [number, number, number]) => { out[0] = 0; out[1] = 1; out[2] = 0; return out; } } as unknown as Terrain;
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, templates, [definition], () => {});
    try {
      const start = module.snapshot()[0]!, root = module.group.getObjectByName(`deer / ${definition.id}`)!;
      const skins: THREE.SkinnedMesh[] = []; root.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) skins.push(object as THREE.SkinnedMesh); });
      expect(skins.every(mesh => mesh.skeleton.bones.length === 29)).toBe(true);
      expect(HUNTABLE_ANIMAL_IDS).not.toContain('deer-mount'); expect(definition.tame).toBe(true);
      expect(Math.hypot(start.x - CARAVAN_ANIMAL_REST.x, start.z - CARAVAN_ANIMAL_REST.z)).toBeLessThanOrEqual(CARAVAN_ANIMAL_REST.radius);
      expect(definition.roam).toBe(0);
      const input: FrameContext = { camera: new THREE.PerspectiveCamera(), focus: new THREE.Vector3(start.x + 2.5, start.y, start.z), time: 0,
        nightness: 0, sunDir: new THREE.Vector3(0, 1, 0), reducedMotion: false, hour: 12, view: worldView(createInitialState()), quality: 'low', wildlifeActive: true };
      for (const status of ['injured', 'dead', 'skinned'] as const) {
        const record: AnimalHuntRecord = { status, bodyHits: status === 'injured' ? 1 : 2, headshot: false,
          position: { x: -212, y: 2, z: 18 }, yaw: 1, atClock: 500 };
        module.syncHunting({ 'deer-mount': record }, true);
        const pose = module.snapshot()[0]!;
        expect(pose.visible).toBe(true); expect(pose.x).toBeCloseTo(start.x); expect(pose.z).toBeCloseTo(start.z);
        expect(module.nearestCarcass(pose)).toBeNull(); expect(module.skinningFrame('deer-mount', pose)).toBeNull();
        root.updateMatrixWorld(true);
        const skull = root.getObjectByName('head')!.getWorldPosition(new THREE.Vector3()), lateral = new THREE.Vector3(1, 0, 0).applyQuaternion(root.quaternion);
        expect(module.traceArrow(skull.clone().addScaledVector(lateral, 3), lateral.clone().negate(), 6)).toBeNull();
        module.alertShot(pose);
        for (let k = 0; k < 100; k++) {
          module.update(.1, input); const current = module.snapshot()[0]!;
          expect(['Walk', 'Run']).not.toContain(current.state); expect(current.visible).toBe(true); expect(animalHabitatAllowed(definition, current)).toBe(true);
          expect(current.x).toBeCloseTo(start.x); expect(current.z).toBeCloseTo(start.z);
        }
        expect(module.group.getObjectByName('embedded hunting arrow')).toBeUndefined();
        expect(module.group.getObjectByName('carcass stain:deer-mount')).toBeUndefined();
      }
      expect(module.contacts).toHaveLength(1); expect(module.physicalActors).toHaveLength(1);
    } finally { module.dispose?.(); }
  }, 20_000);

  it.each(HUNTABLE_ANIMAL_IDS)('grounds the complete 29-bone %s carcass and restores its measured gait without replacing its model', async id => {
    const definition = ANIMALS.find(animal => animal.id === ANIMAL_MODEL_IDS[id])!, templates = await animalTemplates([definition]);
    const terrain = { heightAt: (x: number, z: number) => x * .04 + z * .03, walkable: () => true, carveAt: () => 0, seaDepth: () => 0, deckAt: () => null,
      normalAt: (_x: number, _z: number, out: [number, number, number]) => { const normal = new THREE.Vector3(-.04, 1, -.03).normalize(); out[0] = normal.x; out[1] = normal.y; out[2] = normal.z; return out; } } as unknown as Terrain;
    const module = buildAnimals({ terrain, colliders: new Colliders(), quality: 'low' }, templates, [definition], () => {});
    const input: FrameContext = { camera: new THREE.PerspectiveCamera(), focus: new THREE.Vector3(300, 0, 100), time: 0, nightness: 0, sunDir: new THREE.Vector3(0, 1, 0),
      reducedMotion: false, hour: 12, view: worldView(createInitialState()), quality: 'low', wildlifeActive: true };
    for (let k = 0; k < 4; k++) module.update(.1, input);
    const start = module.snapshot()[0]!, skins: THREE.SkinnedMesh[] = [];
    module.group.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) skins.push(object as THREE.SkinnedMesh); });
    expect(skins.every(mesh => mesh.skeleton.bones.length === 29)).toBe(true);
    const head = skins[0]!.skeleton.bones.find(bone => bone.name === 'head')!, headRotation = head.quaternion.clone();
    const root = module.group.getObjectByName(`${definition.species} / ${definition.id}`)!;
    const skull = head.getWorldPosition(new THREE.Vector3()), lateral = new THREE.Vector3(1, 0, 0).applyQuaternion(root.quaternion);
    const skullHit = module.traceArrow(skull.clone().addScaledVector(lateral, 3), lateral.clone().negate(), 6);
    expect(skullHit?.id).toBe(id); expect(skullHit?.zone).toBe('head');
    const record: AnimalHuntRecord = { status: 'dead', bodyHits: 2, headshot: false, position: { x: start.x, y: start.y, z: start.z }, yaw: start.yaw, atClock: 1 };
    module.syncHunting({ [id]: record }); expect(head.quaternion.angleTo(headRotation)).toBeLessThan(1e-6);
    let knife = module.skinningFrame(id, { x: start.x + 1, z: start.z });
    for (let k = 0; k < 300 && !knife?.ready; k++) { module.update(.1, input); knife = module.skinningFrame(id, { x: start.x + 1, z: start.z }); }
    expect(knife?.ready).toBe(true);
    const posed = new THREE.Vector3(); let lowest = Infinity;
    for (const mesh of skins) for (let vertex = 0; vertex < mesh.geometry.getAttribute('position').count; vertex++) {
      mesh.getVertexPosition(vertex, posed).applyMatrix4(mesh.matrixWorld); lowest = Math.min(lowest, posed.y - terrain.heightAt(posed.x, posed.z));
    }
    expect(lowest).toBeGreaterThanOrEqual(.0059); expect(lowest).toBeLessThan(.007);
    const chest = module.group.getObjectByName('chest')!.getWorldPosition(new THREE.Vector3()); expect(chest.distanceTo(new THREE.Vector3().copy(knife!.target))).toBeLessThan(1e-6);
    expect(new Colliders().resolve(knife!.stance.x, knife!.stance.z, .3, undefined, { minY: knife!.stance.y, maxY: knife!.stance.y + 1.8 }, module.contacts).hit).toBe(false);
    expect(module.nearestCarcass(knife!.stance)?.id).toBe(id);
    expect(module.traceArrow(chest.clone().add(new THREE.Vector3(3, 0, 0)), new THREE.Vector3(-1, 0, 0), 6)?.zone).toBeNull();
    const contact = module.contacts[0]!, physical = module.physicalActors[0]!;
    expect(contact.kind).toBe('box'); if (contact.kind === 'box') expect(physical.radius).toBeGreaterThanOrEqual(Math.hypot(contact.hw, contact.hd));
    expect(physical.y).toBe(contact.minY); expect(physical.y + physical.height).toBeGreaterThanOrEqual(contact.maxY!);
    const geometry = skins[0]!.geometry, stable = module.snapshot()[0]!;
    module.syncHunting({ [id]: record }); module.update(.1, input); expect(module.snapshot()[0]!.y).toBeCloseTo(stable.y);
    module.syncHunting({}, true); module.update(.1, input);
    expect(skins[0]!.geometry).toBe(geometry); expect(module.snapshot()[0]!.visible).toBe(true); expect(module.skinningFrame(id, start)).toBeNull();
    expect(module.contacts).toHaveLength(1); module.dispose?.();
  }, 20_000);
});
