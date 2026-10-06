import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import { AnimalRig } from '../../src/presentation/animals/rig';
import { AnimalPopulation } from '../../src/presentation/animals/population';
import type { HuntingState } from '../../src/game/hunting';
import { Terrain } from '../../src/world/terrain';
import { Colliders } from '../../src/world/colliders';
import { nativeAnimalAsset } from './animalAssetFixture';

const FLAT = { heightAt: () => 2, walkable: () => true, carveAt: () => 0, seaDepth: () => 0 };
// Independent anatomical samples: expected skull height and middle torso station in source proportions.
const SAMPLE_HEIGHTS: Record<string, { head: number; body: number }> = {
  'bear-a': { head: .75, body: .64 }, 'bear-b': { head: .76, body: .62 }, lion: { head: .83, body: .52 }, tiger: { head: .76, body: .62 },
  'wolf-a': { head: .82, body: .51 }, 'wolf-b': { head: .79, body: .5 }, 'wolf-c': { head: .8, body: .58 },
  'cat-a': { head: .76, body: .48 }, 'cat-b': { head: .83, body: .38 }, 'cat-c': { head: .76, body: .5 },
  'dog-a': { head: .81, body: .51 }, 'dog-b': { head: .78, body: .43 }, 'boar-a': { head: .64, body: .6 }, 'boar-b': { head: .65, body: .56 },
  stag: { head: .7, body: .4 }, 'deer-mount': { head: .69, body: .4 }, 'deer-a': { head: .7, body: .4 }, 'deer-b': { head: .66, body: .4 },
};

describe('native animated animal arrow contact and carcass presentation', () => {
  for (const definition of ANIMALS.filter((animal) => animal.file)) it(`${definition.id}: rays hit flesh rather than an enclosing box and distinguish skull from torso`, async () => {
    const rig = new AnimalRig(definition, await nativeAnimalAsset(definition.id));
    rig.ground(FLAT, 0, 0, 0);
    const bounds = new THREE.Box3().setFromObject(rig.asset.scene), length = bounds.max.z - bounds.min.z;
    const profile = SAMPLE_HEIGHTS[definition.id]!;
    const hits: ('head' | 'body' | null)[] = [];
    for (const dy of [-.1, -.045, .005]) for (const station of [.08, .13, .18]) {
      const origin = new THREE.Vector3(bounds.max.x + 2, bounds.min.y + rig.height * (profile.head + dy), bounds.max.z - length * station);
      const hit = rig.arrowSurface.trace(origin, new THREE.Vector3(-1, 0, 0), 5);
      if (hit) { hits.push(hit.zone); expect(hit.distance).toBeGreaterThan(1); }
    }
    expect(hits, `${definition.id} sampled skull rays`).toContain('head');
    const body = rig.arrowSurface.trace(new THREE.Vector3(bounds.max.x + 2, bounds.min.y + rig.height * profile.body, bounds.min.z + length * .48), new THREE.Vector3(-1, 0, 0), 5);
    expect(body?.zone, `${definition.id} torso ray`).toBe('body');
    expect(rig.arrowSurface.trace(new THREE.Vector3(bounds.max.x + 2, bounds.max.y + 1, 0), new THREE.Vector3(-1, 0, 0), 5)).toBeNull();
    expect(rig.arrowSurface.trace(new THREE.Vector3(bounds.max.x + 2, bounds.min.y + rig.height * profile.body, 0), new THREE.Vector3(-1, 0, 0), .5)).toBeNull();
    rig.beginDeath(FLAT, 0, 0, 0, true);
    expect(rig.activeClip).toBe('Dead'); expect(rig.collapseComplete).toBe(true);
    expect(Math.abs(new THREE.Vector3(0, 1, 0).applyQuaternion(rig.root.quaternion).y)).toBeLessThan(.001);
    const corpse = new THREE.Box3().setFromObject(rig.asset.scene, true);
    expect(corpse.min.y).toBeGreaterThanOrEqual(2.0119); expect(corpse.max.y).toBeLessThan(5.5);
    rig.dispose();
  });

  it('a native stag antler blocks the arrow without becoming a lethal head/body hit', async () => {
    const rig = new AnimalRig(ANIMALS.find((animal) => animal.id === 'stag')!, await nativeAnimalAsset('stag'));
    rig.ground(FLAT, 0, 0, 0);
    const bounds = new THREE.Box3().setFromObject(rig.asset.scene), length = bounds.max.z - bounds.min.z;
    let antlerHits = 0;
    for (const height of [.84, .9, .96]) for (let station = .05; station <= .55; station += .025) {
      const hit = rig.arrowSurface.trace(new THREE.Vector3(bounds.max.x + 1, bounds.min.y + rig.height * height, bounds.max.z - length * station), new THREE.Vector3(-1, 0, 0), 5);
      if (hit) { expect(hit.zone).toBeNull(); antlerHits++; }
    }
    expect(antlerHits).toBeGreaterThan(2); rig.dispose();
  });

  for (const id of ['deer-a', 'wolf-b', 'cat-a']) it(`${id}: a skull triangle stays a head target after the native skeleton moves it`, async () => {
    const rig = new AnimalRig(ANIMALS.find((animal) => animal.id === id)!, await nativeAnimalAsset(id));
    rig.ground(FLAT, 0, 0, 0);
    const bounds = new THREE.Box3().setFromObject(rig.asset.scene), length = bounds.max.z - bounds.min.z, profile = SAMPLE_HEIGHTS[id]!;
    let contact: THREE.Intersection | null = null;
    const raycaster = new THREE.Raycaster();
    for (const dy of [-.1, -.045, .005]) for (const station of [.08, .13, .18]) {
      const origin = new THREE.Vector3(bounds.max.x + 2, bounds.min.y + rig.height * (profile.head + dy), bounds.max.z - length * station);
      if (rig.arrowSurface.trace(origin, new THREE.Vector3(-1, 0, 0), 5)?.zone !== 'head') continue;
      raycaster.set(origin, new THREE.Vector3(-1, 0, 0));
      contact = raycaster.intersectObject(rig.asset.scene, true)[0] ?? null;
      if (contact?.face) break;
    }
    expect(contact?.face).toBeDefined();
    const mesh = contact!.object as THREE.SkinnedMesh, face = contact!.face!;
    for (const clip of ['Walk', 'Call', ...(rig.clips.has('Graze') ? ['Graze'] : [])]) {
      rig.animate(.65, 'idle', 0, false, clip); rig.ground(FLAT, 20, -30, .6);
      const a = mesh.localToWorld(mesh.getVertexPosition(face.a, new THREE.Vector3()));
      const b = mesh.localToWorld(mesh.getVertexPosition(face.b, new THREE.Vector3()));
      const c = mesh.localToWorld(mesh.getVertexPosition(face.c, new THREE.Vector3()));
      const center = a.clone().add(b).add(c).multiplyScalar(1 / 3), normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      const hit = rig.arrowSurface.trace(center.clone().addScaledVector(normal, .02), normal.clone().negate(), .04);
      expect(hit?.zone, `${id} ${clip} posed skull surface`).toBe('head');
      expect(new THREE.Vector3(hit!.point.x, hit!.point.y, hit!.point.z).distanceTo(center)).toBeLessThan(.001);
    }
    rig.dispose();
  });

  for (const id of ['bear-a', 'tiger', 'deer-a', 'cat-a']) it(`${id}: accelerated contacts agree with Three's exhaustive animated triangle raycast`, async () => {
    const definition = ANIMALS.find((animal) => animal.id === id)!, rig = new AnimalRig(definition, await nativeAnimalAsset(id));
    const meshes: THREE.SkinnedMesh[] = [];
    rig.asset.scene.traverse((object) => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(object as THREE.SkinnedMesh); });
    const ray = new THREE.Raycaster();
    for (const clip of ['Idle', 'Walk', 'Run', 'Call', 'Dead']) {
      if (clip === 'Dead') rig.beginDeath(FLAT, 20, -30, .6, true);
      else { rig.animate(.63, 'idle', 0, false, clip); rig.ground(FLAT, 20, -30, .6); }
      const bounds = new THREE.Box3().setFromObject(rig.asset.scene, true), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
      for (let sample = 0; sample < 8; sample++) {
        const angle = sample * Math.PI / 4, target = center.clone().add(new THREE.Vector3(Math.sin(sample * 3) * size.x * .17, Math.cos(sample * 2) * size.y * .12, Math.cos(sample * 3) * size.z * .17));
        const origin = target.clone().add(new THREE.Vector3(Math.sin(angle) * 5, sample % 2 ? .7 : -.2, Math.cos(angle) * 5)), direction = target.clone().sub(origin).normalize();
        for (const mesh of meshes) (mesh as unknown as { boundingBox: THREE.Box3 | null }).boundingBox = null;
        ray.set(origin, direction); ray.near = 0; ray.far = 10;
        const exhaustive = ray.intersectObjects(meshes, false)[0] ?? null, accelerated = rig.arrowSurface.trace(origin, direction, 10);
        expect(!!accelerated, `${id} ${clip} radial ${sample}`).toBe(!!exhaustive);
        if (exhaustive && accelerated) {
          expect(Math.abs(accelerated.distance - exhaustive.distance)).toBeLessThan(.00001);
          expect(exhaustive.point.distanceTo(new THREE.Vector3(accelerated.point.x, accelerated.point.y, accelerated.point.z))).toBeLessThan(.00001);
        }
      }
    }
    rig.dispose();
  });

  it('short arrow segments reject distant models before deforming any vertices, and contacts deform only local skin cells', async () => {
    const rig = new AnimalRig(ANIMALS.find((animal) => animal.id === 'bear-a')!, await nativeAnimalAsset('bear-a'));
    rig.ground(FLAT, 0, 0, 0);
    let mesh!: THREE.SkinnedMesh;
    rig.asset.scene.traverse((object) => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) mesh = object as THREE.SkinnedMesh; });
    const sample = vi.spyOn(mesh, 'getVertexPosition'), origin = new THREE.Vector3(5, 2.65, 0), direction = new THREE.Vector3(-1, 0, 0);
    expect(rig.arrowSurface.trace(origin, direction, .55)).toBeNull(); expect(sample).not.toHaveBeenCalled();
    expect(rig.arrowSurface.trace(origin, direction, 10)).not.toBeNull(); const accelerated = sample.mock.calls.length;
    sample.mockClear(); (mesh as unknown as { boundingBox: THREE.Box3 | null }).boundingBox = null;
    new THREE.Raycaster(origin, direction, 0, 10).intersectObject(mesh);
    expect(accelerated).toBeLessThan(sample.mock.calls.length * .6);
    sample.mockRestore(); rig.dispose();
  });

  it('real skinned corpse surfaces remain above graded terrain and stop native gait motion', async () => {
    const rig = new AnimalRig(ANIMALS.find((animal) => animal.id === 'bear-a')!, await nativeAnimalAsset('bear-a'));
    const grade = { ...FLAT, heightAt: (x: number, z: number) => 2 + x * .12 - z * .07 };
    rig.animate(.37, 'walk', .8, false); rig.ground(grade, 20, -30, .6);
    const front = rig.asset.scene.getObjectByName('FrontLeftUpper')!;
    rig.beginDeath(grade, 20, -30, .6);
    const start = front.quaternion.clone();
    rig.updateDeath(.45, grade, 20, -30, .6); expect(front.quaternion.angleTo(start)).toBeGreaterThan(.01);
    rig.updateDeath(.45, grade, 20, -30, .6); expect(rig.collapseComplete).toBe(true);
    const pose = front.quaternion.clone(), position = rig.root.position.clone(), rotation = rig.root.quaternion.clone();
    rig.animate(1, 'flee', 3.4, false); rig.updateDeath(1, grade, 20, -30, .6);
    expect(front.quaternion.equals(pose)).toBe(true); expect(rig.root.position.equals(position)).toBe(true); expect(rig.root.quaternion.equals(rotation)).toBe(true);
    const point = new THREE.Vector3(); let clearance = Infinity;
    rig.asset.scene.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      for (let vertex = 0; vertex < mesh.geometry.attributes.position!.count; vertex++) {
        mesh.getVertexPosition(vertex, point); mesh.localToWorld(point);
        clearance = Math.min(clearance, point.y - grade.heightAt(point.x, point.z));
      }
    });
    expect(clearance).toBeGreaterThanOrEqual(.0119); expect(clearance).toBeLessThan(.014);
    rig.dispose();
  });

  for (const id of ['stag', 'deer-mount', 'deer-a', 'deer-b']) it(`${id}: resting antlered corpses support their torso close to the ground and preserve rigid crown edges`, async () => {
    const rig = new AnimalRig(ANIMALS.find((animal) => animal.id === id)!, await nativeAnimalAsset(id));
    rig.beginDeath(FLAT, 0, 0, 0, true);
    let torsoGap = Infinity, crownEdges = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    rig.asset.scene.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const position = mesh.geometry.attributes.position!, indices = mesh.geometry.index!, bounds = mesh.geometry.boundingBox!, size = bounds.getSize(new THREE.Vector3());
      for (let vertex = 0; vertex < position.count; vertex++) {
        const y = (position.getY(vertex) - bounds.min.y) / size.y, z = (position.getZ(vertex) - bounds.min.z) / size.z;
        if (y <= .35 || y >= .65 || z <= .35 || z >= .7) continue;
        mesh.getVertexPosition(vertex, a); mesh.localToWorld(a); torsoGap = Math.min(torsoGap, a.y - 2);
      }
      for (let triangle = 0; triangle < indices.count; triangle += 3) for (const [first, second] of [[0, 1], [1, 2], [2, 0]]) {
        const va = indices.getX(triangle + first!), vb = indices.getX(triangle + second!);
        if (position.getY(va) <= bounds.min.y + size.y * .83 || position.getY(vb) <= bounds.min.y + size.y * .83) continue;
        const rest = a.fromBufferAttribute(position, va).distanceTo(b.fromBufferAttribute(position, vb));
        if (rest < .0001) continue;
        mesh.getVertexPosition(va, a); mesh.localToWorld(a); mesh.getVertexPosition(vb, b); mesh.localToWorld(b);
        expect(Math.abs(a.distanceTo(b) - rest), `${id} rigid antler edge`).toBeLessThan(.001); crownEdges++;
      }
    });
    expect(crownEdges).toBeGreaterThan(100);
    expect(torsoGap, `${id} torso above floor; antlers must not suspend the body`).toBeLessThan(.1);
    expect(torsoGap).toBeGreaterThanOrEqual(.0119);
    rig.dispose();
  });

  it('restores dead/injured/skinned records correctly and retains carcass selection before lazy mesh decode', async () => {
    const terrain = new Terrain(), population = new AnimalPopulation(terrain, new Colliders(), 'low', { kind: 'individual', id: 'bear-a', clip: null }, () => nativeAnimalAsset('bear-a'));
    const home = population.inspectionFrame()!;
    const hunting: HuntingState = { 'bear-a': { status: 'dead', bodyHits: 2, headshot: false, position: { x: home.x, y: home.y, z: home.z }, yaw: .5, atClock: 490 } };
    population.syncHunting(hunting);
    expect(population.nearestCarcass({ x: home.x + 1, z: home.z })?.id).toBe('bear-a'); expect(population.stats().loaded).toBe(0);
    await population.preloadInspection();
    expect(population.diagnostics.find((animal) => animal.id === 'bear-a')?.clip).toBe('Dead');
    const knife = population.skinningFrame('bear-a', { x: home.x, z: home.z })!;
    expect(knife.ready).toBe(true);
    expect(Math.hypot(knife.stance.x - home.x, knife.stance.z - home.z)).toBeLessThan(2.8);
    expect(Math.hypot(knife.target.x - home.x, knife.target.z - home.z)).toBeGreaterThan(.3);
    population.setRunning(true);
    const corpseHit = population.traceArrow(new THREE.Vector3(knife.target.x + 3, knife.target.y, knife.target.z), new THREE.Vector3(-1, 0, 0), 6);
    expect(corpseHit?.id).toBe('bear-a'); expect(corpseHit?.zone).toBeNull();
    population.setRunning(false);
    population.syncHunting({ 'bear-a': { ...hunting['bear-a']!, status: 'injured', bodyHits: 1, atClock: 480 } });
    expect(population.stats().loaded).toBe(0); expect(population.stats().stains).toBe(0); expect(population.nearestCarcass({ x: home.x, z: home.z })).toBeNull();
    await population.preloadInspection();
    expect(population.diagnostics.find((animal) => animal.id === 'bear-a')?.clip).toBe('Idle');
    population.syncHunting(hunting);
    population.syncHunting({ 'bear-a': { ...hunting['bear-a']!, status: 'skinned' } });
    expect(population.stats().loaded).toBe(0); expect(population.nearestCarcass({ x: home.x, z: home.z })).toBeNull();
    population.syncHunting(hunting, true); await population.preloadInspection();
    expect(population.nearestCarcass({ x: home.x, z: home.z })?.id).toBe('bear-a'); expect(population.stats().loaded).toBe(1);
    expect(population.diagnostics.find((animal) => animal.id === 'bear-a')?.clip).toBe('Dead');
    population.syncHunting({}, true); expect(population.stats().stains).toBe(0); expect(population.stats().carcasses).toBe(0);
    population.dispose(); expect(population.group.children).toHaveLength(0);
  });

  it('bounds impact particles/arrows, honors reduced effects and pause, and releases shared arrow resources only with their owner', async () => {
    const population = new AnimalPopulation(new Terrain(), new Colliders(), 'low', { kind: 'individual', id: 'bear-a', clip: null }, () => nativeAnimalAsset('bear-a'));
    await population.preloadInspection(); population.setRunning(true);
    const animal = population.diagnostics.find((resident) => resident.id === 'bear-a')!, position = animal.position!;
    const hit = { id: 'bear-a' as const, zone: 'body' as const, position, point: { ...position, y: position.y + .8 }, yaw: .5, distance: 1 };
    for (let impact = 0; impact < 30; impact++) population.showArrowImpact(hit, new THREE.Vector3(0, 0, 1));
    expect(population.stats().droplets).toBeLessThanOrEqual(48); expect(population.stats().embeddedArrows).toBe(2);
    const arrow = population.group.getObjectByName('embedded hunting arrow')!, shaft = arrow.children[0] as THREE.Mesh, disposed = vi.fn();
    shaft.geometry.addEventListener('dispose', disposed);
    population.setReduceEffects(true); expect(population.stats().droplets).toBe(0);
    population.setReduceEffects(false); population.showArrowImpact({ ...hit, zone: null }, new THREE.Vector3(0, 0, 1));
    expect(population.stats().droplets).toBe(0);
    population.setRunning(false); population.showArrowImpact(hit, new THREE.Vector3(0, 0, 1)); expect(population.stats().droplets).toBe(0);
    population.syncHunting({ 'bear-a': { status: 'skinned', bodyHits: 2, headshot: false, position, yaw: .5, atClock: 490 } });
    expect(population.stats().loaded).toBe(0); expect(population.stats().embeddedArrows).toBe(0); expect(disposed).not.toHaveBeenCalled();
    population.dispose(); expect(disposed).toHaveBeenCalledOnce();
  });
});
