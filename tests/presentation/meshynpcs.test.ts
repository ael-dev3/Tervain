import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { NPC_LIST } from '../../src/content/npcs';
import { poseRig, type Rig } from '../../src/presentation/characters';
import { NPC_SKIN_REPAIR_PROFILE } from '../../src/presentation/npc/skinRepair';
import { NpcActor, EnemyActor, resolveGoal, type ActorContext } from '../../src/presentation/actors';
import { BONES, type BoneName } from '../../src/presentation/human/skin';
import { Frame } from '../../src/presentation/human/frame';
import { disposeSceneResources } from '../../src/presentation/disposeScene';
import { ENEMY_SPAWNS } from '../../src/world/layout';
import { createInitialState } from '../../src/game/state';
import { Colliders } from '../../src/world/colliders';
import { createMeshyNpcRig, validateMeshyNpcAsset, validateMeshyNpcManifest, NPC_ROLES,
  MeshyNpcCatalog, type MeshyNpcEntry, type MeshyNpcManifest } from '../../src/presentation/meshynpcs';

const loader = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({ GLTFLoader: class { parseAsync = loader.parse; } }));

const PARENT: Record<BoneName, BoneName | null> = {
  hips: null, torso: 'hips', head: 'torso', armL: 'torso', elbowL: 'armL', armR: 'torso',
  elbowR: 'armR', legL: 'hips', kneeL: 'legL', legR: 'hips', kneeR: 'legR',
};
const entry: MeshyNpcEntry = { id: 'test-resident', file: 'test-resident.glb', triangles: 1, bytes: 20, sha256: '0'.repeat(64), height: 1.8 };

/** Small original CPU-only fixture: actual joints, inverse binds and arm-weighted triangles. */
function source() {
  const scene = new THREE.Group();
  const bones = {} as Record<BoneName, THREE.Bone>;
  const joints = new Frame('man', 1, 1).joints();
  for (const name of BONES) {
    const bone = new THREE.Bone(); bone.name = name; bones[name] = bone;
    const at = new THREE.Vector3(...joints[name]), parent = PARENT[name];
    if (parent) at.sub(new THREE.Vector3(...joints[parent]));
    bone.position.copy(at); (parent ? bones[parent] : scene).add(bone);
  }
  scene.updateMatrixWorld(true);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0.2, 1.12, 0, 0.2, 0.85, 0, 0.26, 1.1, 0], 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0], 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  geometry.computeVertexNormals();
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture, normalMap: texture });
  const mesh = new THREE.SkinnedMesh(geometry, material); scene.add(mesh);
  mesh.bind(new THREE.Skeleton(BONES.map(name => bones[name])));
  const asset = { scene, animations: [] } as unknown as GLTF;
  return { asset, bones, mesh, geometry, material, texture };
}

function manifest(): MeshyNpcManifest {
  return { schema: 1, maxTriangles: 50_000, assets: [{ ...entry }], roles: Object.fromEntries(NPC_ROLES.map(role => [role, entry.id])) };
}

/** Connected long-skirt panels, boot tips, a relaxed hand and a face: a small original deformation fixture. */
function skirtSource() {
  const f = source();
  const points = [
    -0.08, 0.2, 0.24, 0.08, 0.2, 0.24, -0.08, 0.6, 0.15, 0.08, 0.6, 0.15, -0.12, 0.85, 0.13, 0.12, 0.85, 0.13,
    -0.12, 0.04, 0.12, -0.15, 0.04, 0.16, -0.10, 0.05, 0.16,
    0.1, 1.6, 0.1, 0.12, 1.6, 0.1, 0.1, 1.62, 0.1,
    -0.28, 0.8, 0.13, -0.30, 0.8, 0.13, -0.28, 0.82, 0.13,
  ];
  const joints = [10, 8, 9, 7, 0, 0, 10, 10, 10, 2, 2, 2, 6, 6, 6];
  f.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  f.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(joints.flatMap(joint => [joint, 0, 0, 0]), 4));
  f.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(joints.flatMap(() => [1, 0, 0, 0]), 4));
  f.geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  f.geometry.computeVertexNormals();
  f.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(joints.flatMap((_, i) => [i / 15, 0.5]), 2));
  f.geometry.setAttribute('uv1', new THREE.Float32BufferAttribute(joints.flatMap((_, i) => [0.5, i / 15]), 2));
  f.geometry.setAttribute('tangent', new THREE.Float32BufferAttribute(joints.flatMap(() => [1, 0, 0, -1]), 4));
  return f;
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('budgeted Meshy NPC replacement and lifetime', () => {
  it('requires every named, ambient, hostile and menu role and stable assignments', () => {
    const complete = manifest();
    expect(validateMeshyNpcManifest(complete)).toBe(complete);
    delete complete.roles['ambient:fisher'];
    expect(() => validateMeshyNpcManifest(complete)).toThrow(/ambient:fisher/);
    complete.roles['ambient:fisher'] = 'unknown';
    expect(() => validateMeshyNpcManifest(complete)).toThrow(/ambient:fisher/);
  });

  it.each([
    { triangles: 50_001 }, { triangles: -1 }, { triangles: 3.5 }, { height: NaN }, { sha256: '' }, { file: '../outside.glb' }, { bytes: 1 }, { surfaceBake: 'unknown-bake' },
  ])('rejects unsafe or over-budget catalog data %j', invalid => {
    const value = manifest(); Object.assign(value.assets[0]!, invalid);
    expect(() => validateMeshyNpcManifest(value)).toThrow(/invalid entry/);
  });

  it('counts all complete mesh instances including an invisible copy', () => {
    const f = source();
    expect(validateMeshyNpcAsset(f.asset, entry)).toBe(1);
    const hidden = new THREE.Mesh(f.geometry, f.material); hidden.visible = false; f.asset.scene.add(hidden);
    expect(() => validateMeshyNpcAsset(f.asset, entry)).toThrow(/geometry does not match/);
    expect(validateMeshyNpcAsset(f.asset, { ...entry, triangles: 2 })).toBe(2);
  });

  it('rejects rigid dolls, incompatible bone axes, nonnormalised skinning and invented clips', () => {
    const rigid = source(); rigid.asset.scene.remove(rigid.mesh);
    rigid.asset.scene.add(new THREE.Mesh(rigid.geometry, rigid.material));
    expect(() => validateMeshyNpcAsset(rigid.asset, entry)).toThrow(/geometry does not match/);
    const rotated = source(); rotated.bones.armL.rotation.z = 0.5;
    expect(() => validateMeshyNpcAsset(rotated.asset, entry)).toThrow(/bind transform/);
    const badWeight = source(); badWeight.mesh.geometry.getAttribute('skinWeight').setX(0, 0.4);
    expect(() => validateMeshyNpcAsset(badWeight.asset, entry)).toThrow(/unnormalised/);
    const invented = source(); invented.asset.animations = [new THREE.AnimationClip('Walking', 1, [])];
    expect(() => validateMeshyNpcAsset(invented.asset, entry)).toThrow(/unexpected animation/);
  });

  it('animates actual skinned vertices and retains the controller-owned position, yaw and source geometry', () => {
    const f = source(), rig = createMeshyNpcRig(f.asset, entry, 1.06);
    rig.root.position.set(4, 2, 7); rig.root.rotation.y = 0.8;
    const mesh = rig.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
    rig.root.updateMatrixWorld(true); mesh.skeleton.update();
    const before = mesh.getVertexPosition(1, new THREE.Vector3());
    poseRig(rig, { mode: 'work', workGesture: 'stonework', speed: 0, time: 0.4, t: 0, amp: 1 }, 1);
    rig.root.updateMatrixWorld(true); mesh.skeleton.update();
    const after = mesh.getVertexPosition(1, new THREE.Vector3());
    expect(after.distanceTo(before)).toBeGreaterThan(0.02);
    expect(rig.root.position.toArray()).toEqual([4, 2, 7]); expect(rig.root.rotation.y).toBe(0.8);
    expect(rig.body.scale.toArray()).toEqual([1.06, 1.06, 1.06]);
    expect(f.bones.armL.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(Array.from(f.geometry.getAttribute('position').array)).toEqual(Array.from(mesh.geometry.getAttribute('position').array));
  });

  it('keeps a verified rebake basis on an owned clone and repairs only unflagged legacy templates', () => {
    const f = source();
    f.geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0.8, 0, 0.6, 0.8, 0, 0.6, 0.8, 0, 0.6], 3));
    f.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0], 2));
    f.geometry.setAttribute('tangent', new THREE.Float32BufferAttribute([0.6, 0, -0.8, -1, 0.6, 0, -0.8, -1, 0.6, 0, -0.8, -1], 4));
    const normalBytes = Array.from(f.geometry.getAttribute('normal').array), tangentBytes = Array.from(f.geometry.getAttribute('tangent').array);
    const rebaked = createMeshyNpcRig(f.asset, { ...entry, surfaceBake: 'geometry-only-v1' });
    const preserved = (rebaked.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh).geometry;
    expect(preserved).not.toBe(f.geometry);
    expect(Array.from(preserved.getAttribute('normal').array)).toEqual(normalBytes);
    expect(Array.from(preserved.getAttribute('tangent').array)).toEqual(tangentBytes);
    expect(preserved.userData.npcSurface).toBeUndefined();
    const legacy = createMeshyNpcRig(f.asset, entry);
    const repaired = (legacy.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh).geometry;
    expect(Array.from(repaired.getAttribute('normal').array)).not.toEqual(normalBytes);
    expect(repaired.userData.npcSurface).toMatchObject({ rebuiltTangents: true });
    expect(Array.from(f.geometry.getAttribute('normal').array)).toEqual(normalBytes);
    const value = manifest(); value.assets[0]!.surfaceBake = 'geometry-only-v1';
    expect(validateMeshyNpcManifest(value)).toBe(value);
  });

  it('keeps shared source pixels but owns geometry, skeleton, materials and texture GPU references across worlds', () => {
    const f = source(), first = createMeshyNpcRig(f.asset, entry), second = createMeshyNpcRig(f.asset, entry);
    const a = first.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
    const b = second.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
    const aMaterial = a.material as THREE.MeshStandardMaterial, bMaterial = b.material as THREE.MeshStandardMaterial;
    expect(a.geometry).not.toBe(b.geometry); expect(a.geometry).not.toBe(f.geometry);
    expect(a.skeleton).not.toBe(b.skeleton); expect(a.skeleton.bones[0]).not.toBe(b.skeleton.bones[0]);
    expect(aMaterial).not.toBe(bMaterial); expect(aMaterial.map).not.toBe(bMaterial.map); expect(aMaterial.map).not.toBe(f.texture);
    expect(aMaterial.map).toBe(aMaterial.normalMap); expect(aMaterial.map!.source).toBe(f.texture.source);
    const own = { geometry: vi.spyOn(a.geometry, 'dispose'), material: vi.spyOn(aMaterial, 'dispose'), texture: vi.spyOn(aMaterial.map!, 'dispose'), skeleton: vi.spyOn(a.skeleton, 'dispose') };
    const retained = [vi.spyOn(f.geometry, 'dispose'), vi.spyOn(f.material, 'dispose'), vi.spyOn(f.texture, 'dispose'), vi.spyOn(b.geometry, 'dispose'), vi.spyOn(bMaterial.map!, 'dispose')];
    const scene = new THREE.Scene(); scene.add(first.root); disposeSceneResources(scene, () => {});
    for (const call of Object.values(own)) expect(call).toHaveBeenCalledOnce();
    for (const call of retained) expect(call).not.toHaveBeenCalled();
    for (let frame = 0; frame < 60; frame++) poseRig(second, { mode: 'sit', speed: 0, time: 0.5, t: 0, amp: 1 }, 1 / 60);
    expect(second.legL.rotation.x).toBeLessThan(-1);
  });

  it('replaces appearance without changing NPC or hostile identities, schedules or combat budgets', () => {
    const f = source();
    for (const definition of NPC_LIST) {
      const rig = createMeshyNpcRig(f.asset, entry), actor = new NpcActor(definition, rig);
      expect(actor.rig).toBe(rig); expect(actor.id).toBe(definition.id); expect(actor.def).toBe(definition);
      rig.root.traverse(object => expect(object.userData.npc).toBe(definition.id));
    }
    for (const spawn of ENEMY_SPAWNS.filter(candidate => candidate.kind !== 'thornback')) {
      const rig = createMeshyNpcRig(f.asset, entry, 1, 'blade'), actor = new EnemyActor(spawn, rig);
      expect(actor.rig).toBe(rig); expect(actor.id).toBe(spawn.id); expect(actor.hp).toBe(55); expect(actor.radius).toBe(0.4);
      expect(rig.grip).toBe('blade'); rig.root.traverse(object => expect(object.userData.enemy).toBe(spawn.id));
    }
  });

  it('restores the existing blade/club and warden sheath on real moving bone sockets, including hidden pieces in the budget', () => {
    const f = source(), catalog = new MeshyNpcCatalog(manifest(), new Map([[entry.id, f.asset]]));
    const blade = catalog.create('enemy:ford_bandit_a', 1, 'blade');
    const club = catalog.create('enemy:ford_bandit_b', 1, 'blade');
    const warden = catalog.create('named:shrine_warden');
    expect(blade.weapon?.name).toBe('NPC / weathered arming sword');
    expect(blade.weapon?.visible).toBe(true); expect(blade.grip).toBe('blade');
    expect(blade.scabbard?.visible).toBe(true); expect(blade.sheathed?.visible).toBe(false);
    expect(club.weapon?.name).toBe('NPC / knotted club'); expect(club.weapon?.visible).toBe(true);
    expect(club.scabbard).toBeNull(); expect(club.shield).toBeNull();
    expect(warden.weapon?.visible).toBe(false); expect(warden.sheathed?.visible).toBe(true);
    expect(warden.grip).toBe('none');
    expect(blade.root.userData.meshyNpc.attachmentTriangles).toBe(980);
    expect(club.root.userData.meshyNpc.attachmentTriangles).toBe(434);
    expect(warden.root.userData.meshyNpc.triangles).toBe(981);
    const socket = blade.root.getObjectByName('NPC / right palm equipment socket')!;
    expect(socket.parent).toBe(blade.elbowR);
    blade.root.updateMatrixWorld(true); const before = socket.getWorldPosition(new THREE.Vector3());
    poseRig(blade, { mode: 'strike', speed: 0, time: 0.5, t: 0.8, amp: 1 }, 1);
    blade.root.updateMatrixWorld(true);
    expect(socket.getWorldPosition(new THREE.Vector3()).distanceTo(before)).toBeGreaterThan(0.1);
  });

  it('refuses an otherwise legal 50k model when carried equipment exceeds the complete actor cap', () => {
    const f = source(); f.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(50_000 * 3), 1));
    const full = { ...entry, triangles: 50_000 };
    expect(validateMeshyNpcAsset(f.asset, full)).toBe(50_000);
    expect(() => createMeshyNpcRig(f.asset, full, 1, 'blade')).toThrow(/after equipment/);
  });

  it('uses cached sole samples to remove small visual penetration without physical-root motion or frame accumulation', () => {
    const f = source();
    f.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0.1, -0.04, 0.08, 0.11, -0.04, 0.09, 0.12, -0.04, 0.1], 3));
    f.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([8, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0], 4));
    const rig = createMeshyNpcRig(f.asset, entry); rig.root.position.set(7, 3, -2);
    const idle = { mode: 'idle' as const, speed: 0, time: 0, t: 0, amp: 1 };
    poseRig(rig, idle, 1);
    const clearance = rig.body.position.y;
    expect(clearance).toBeGreaterThan(0.03); expect(clearance).toBeLessThanOrEqual(0.1);
    expect(rig.root.userData.meshyNpc.soleSamples).toBe(3);
    for (let frame = 0; frame < 10; frame++) poseRig(rig, idle, 1);
    expect(rig.body.position.y).toBeCloseTo(clearance, 5);
    expect(rig.root.position.toArray()).toEqual([7, 3, -2]);
    expect(rig.hips.position.y).toBeCloseTo(0.95, 6);
    expect(f.geometry.getAttribute('position').getY(0)).toBeCloseTo(-0.04, 6);
  });

  it.each(['rillford-reeve', 'fireside'])('fits %s continuous cloth instead of stretching the hem across two bent knees', id => {
    const f = skirtSource(), garmentEntry = { ...entry, id, triangles: 7, surfaceBake: 'geometry-only-v1' as const };
    const sourceAttributes = Object.fromEntries(Object.entries(f.geometry.attributes).map(([name, attribute]) => [name, Array.from(attribute.array)]));
    const generic = createMeshyNpcRig(f.asset, { ...garmentEntry, id: 'test-resident' });
    const fitted = createMeshyNpcRig(f.asset, garmentEntry);
    const a = generic.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
    const b = fitted.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
    const neutral = new THREE.Vector3(), original = new THREE.Vector3();
    fitted.root.updateMatrixWorld(true); b.skeleton.update();
    for (let vertex = 0; vertex < 15; vertex++) {
      b.getVertexPosition(vertex, neutral); original.fromBufferAttribute(f.geometry.getAttribute('position'), vertex);
      expect(neutral.distanceTo(original)).toBeLessThan(1e-6);
    }
    let oldStretch = 0, newStretch = 0;
    for (let phase = 0; phase < 8; phase++) {
      const pose = { mode: 'walk' as const, speed: 0.78, time: phase / 8, t: 0, amp: 1 };
      for (let frame = 0; frame < 90; frame++) { poseRig(generic, pose, 1 / 60); poseRig(fitted, pose, 1 / 60); }
      for (const rig of [generic, fitted]) { rig.root.updateMatrixWorld(true); (rig === generic ? a : b).skeleton.update(); }
      const width = (mesh: THREE.SkinnedMesh) => mesh.getVertexPosition(0, new THREE.Vector3()).distanceTo(mesh.getVertexPosition(1, new THREE.Vector3())) / 0.16;
      oldStretch = Math.max(oldStretch, width(a)); newStretch = Math.max(newStretch, width(b));
      expect(fitted.legL.rotation.x).toBeCloseTo(generic.legL.rotation.x, 8);
      expect(fitted.kneeL!.rotation.x).toBeCloseTo(generic.kneeL!.rotation.x, 8);
      expect(fitted.root.position.toArray()).toEqual([0, 0, 0]);
    }
    expect(oldStretch).toBeGreaterThan(3);
    expect(newStretch).toBeLessThan(oldStretch * 0.55);
    const ownWeights = b.geometry.getAttribute('skinWeight'), ownIndices = b.geometry.getAttribute('skinIndex');
    for (let vertex = 0; vertex < 15; vertex++) {
      let sum = 0;
      for (let slot = 0; slot < 4; slot++) {
        const weight = ownWeights.getComponent(vertex, slot); sum += weight;
        expect(Number.isFinite(weight) && weight >= 0 && weight <= 1).toBe(true);
        expect(ownIndices.getComponent(vertex, slot)).toBeLessThan(11);
      }
      expect(sum).toBeCloseTo(1, 6);
      if (vertex >= 6) for (const name of ['skinIndex', 'skinWeight']) {
        const own = b.geometry.getAttribute(name), original = f.geometry.getAttribute(name);
        for (let slot = 0; slot < 4; slot++) expect(own.getComponent(vertex, slot)).toBe(original.getComponent(vertex, slot));
      }
    }
    for (const name of ['position', 'normal', 'tangent', 'uv', 'uv1']) expect(Array.from(b.geometry.getAttribute(name).array)).toEqual(sourceAttributes[name]);
    for (const [name, original] of Object.entries(sourceAttributes)) expect(Array.from(f.geometry.getAttribute(name).array)).toEqual(original);
    expect(f.geometry.userData.npcGarment).toBeUndefined();
    expect(b.geometry.userData.npcGarment).toMatchObject({ profile: 'mara-long-skirt-v1' });
    expect(fitted.root.userData.meshyNpc.triangles).toBe(7);
    expect(fitted.root.userData.meshyNpc.soleSamples).toBeGreaterThanOrEqual(3);
    expect(fitted.root.userData.meshyNpc.soleSamples).toBeLessThanOrEqual(64);
    const sit = { mode: 'sit' as const, speed: 0, time: 0.4, t: 0, amp: 1 };
    for (let frame = 0; frame < 180; frame++) { poseRig(generic, sit, 1 / 60); poseRig(fitted, sit, 1 / 60); }
    for (const rig of [generic, fitted]) { rig.root.updateMatrixWorld(true); (rig === generic ? a : b).skeleton.update(); }
    for (let vertex = 0; vertex < 15; vertex++) {
      expect(a.getVertexPosition(vertex, new THREE.Vector3()).distanceTo(b.getVertexPosition(vertex, new THREE.Vector3()))).toBeLessThan(1e-6);
    }
    for (const mode of ['sit', 'work', 'dead'] as const) {
      poseRig(fitted, { mode, speed: 0, time: 0.4, t: 0.7, amp: 1 }, 0.2);
      fitted.root.updateMatrixWorld(true); b.skeleton.update();
      for (let vertex = 0; vertex < 15; vertex++) expect(b.getVertexPosition(vertex, new THREE.Vector3()).toArray().every(Number.isFinite)).toBe(true);
    }
  });

  it.each(['spring-steward', 'mill-hand', 'maintenance-worker', 'ford-bandit-a'])('keeps the Mara garment fit off %s: source skinning without the shared repair, that repair with it', id => {
    const f = skirtSource(), own = { ...entry, id, triangles: 7, surfaceBake: 'geometry-only-v1' as const };
    const skin = (rig: Rig) => rig.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
    const plain = skin(createMeshyNpcRig(f.asset, own, 1, 'none', undefined, { skinRepair: false }));
    for (const name of ['skinIndex', 'skinWeight']) expect(Array.from(plain.geometry.getAttribute(name).array)).toEqual(Array.from(f.geometry.getAttribute(name).array));
    expect(plain.geometry.userData.npcGarment).toBeUndefined();
    const repaired = skin(createMeshyNpcRig(f.asset, own));
    expect(repaired.geometry.userData.npcGarment).toBeUndefined();
    expect(repaired.geometry.userData.npcSkinRepair.profile).toBe(NPC_SKIN_REPAIR_PROFILE);
    for (const name of ['position', 'uv', 'uv1']) expect(Array.from(repaired.geometry.getAttribute(name).array)).toEqual(Array.from(f.geometry.getAttribute(name).array));
  });

  it('does not animate walking through a blocking contact, and preserves schedule hiding on the replacement rig', () => {
    const f = source(), rig = createMeshyNpcRig(f.asset, entry);
    const definition = NPC_LIST.find(candidate => candidate.id === 'shrine_warden')!;
    const actor = new NpcActor(definition, rig), state = createInitialState();
    const colliders = new Colliders();
    const move = vi.spyOn(colliders, 'move').mockImplementation((_x, _z) => ({ x: 0, z: 0, hit: true, normals: [] }));
    const ctx = { state, hour: 8, player: { x: 100, y: 0, z: 100 }, reducedMotion: false,
      terrain: { groundAt: () => 0.5, walkable: () => true }, colliders, nav: {}, onBark: vi.fn(),
    } as unknown as ActorContext;
    Reflect.set(actor, 'placed', true); actor.goal = resolveGoal(definition, state, ctx.hour);
    Reflect.set(actor, 'path', [{ x: 0, z: 5 }]);
    actor.update(0.1, ctx);
    expect(actor.mode).toBe('idle'); expect([actor.x, actor.z]).toEqual([0, 0]);
    expect(rig.root.position.toArray()).toEqual([0, 0.5, 0]);
    move.mockImplementation((x, z, dx, dz) => ({ x: x + dx, z: z + dz, hit: false, normals: [] }));
    actor.update(0.1, ctx);
    expect(actor.mode).toBe('walk'); expect(actor.z).toBeGreaterThan(0); expect(actor.z).toBeLessThan(.155);
    state.npcs[actor.id].available = false;
    actor.update(0.1, ctx);
    expect(actor.interactable).toBe(false); expect(rig.root.visible).toBe(false);
  });
});

function glb(): ArrayBuffer {
  const bytes = new ArrayBuffer(20), header = new DataView(bytes);
  header.setUint32(0, 0x46546c67, true); header.setUint32(4, 2, true); header.setUint32(8, 20, true);
  return bytes;
}

describe('Meshy resident transport, selective loading and retry', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let subject: typeof import('../../src/presentation/meshynpcs');
  beforeEach(async () => {
    vi.resetModules(); fetchMock.mockReset(); loader.parse.mockReset().mockResolvedValue(source().asset);
    vi.stubGlobal('fetch', fetchMock); vi.stubGlobal('document', { baseURI: 'https://example.test/Tervain/index.html' });
    vi.stubGlobal('crypto', { subtle: { digest: vi.fn(async () => new Uint8Array(32).buffer) } });
    vi.stubEnv('BASE_URL', './');
    subject = await import('../../src/presentation/meshynpcs');
  });

  it('loads only assigned models, shares concurrent requests and retains decoded CPU templates for rebuilds', async () => {
    const value = manifest(); value.assets.push({ ...entry, id: 'unused', file: 'unused.glb' });
    fetchMock.mockImplementation(async url => new Response(String(url).endsWith('manifest.json') ? JSON.stringify(value) : glb()));
    const progress = vi.fn(), sharedProgress = vi.fn(), a = subject.loadMeshyNpcCatalog(progress), b = subject.loadMeshyNpcCatalog(sharedProgress);
    expect(a).toBe(b);
    const catalog = await a;
    expect(fetchMock).toHaveBeenCalledTimes(2); expect(loader.parse).toHaveBeenCalledOnce();
    expect(loader.parse).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'https://example.test/Tervain/models/npcs/');
    expect(progress.mock.calls).toEqual([[0, 1], [1, 1]]);
    expect(sharedProgress.mock.calls).toEqual([[0, 1], [1, 1]]);
    expect(catalog.create('ambient:fisher').root).not.toBe(catalog.create('ambient:fisher').root);
    expect(subject.loadMeshyNpcCatalog()).toBe(a);
    const cachedProgress = vi.fn();
    expect(subject.loadMeshyNpcCatalog(cachedProgress)).toBe(a);
    expect(cachedProgress.mock.calls).toEqual([[1, 1]]);
    expect(() => catalog.create('unknown')).toThrow(/has not been prepared/);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('unused.glb'))).toBe(false);
  });

  it.each([
    { name: 'HTTP error', response: () => new Response('', { status: 503 }), message: /HTTP 503/ },
    { name: 'HTML fallback', response: () => new Response('<html>', { headers: { 'content-type': 'text/html' } }), message: /page instead/ },
    { name: 'truncated body', response: () => new Response(new ArrayBuffer(12)), message: /incomplete/ },
    { name: 'wrong GLB header', response: () => new Response(new ArrayBuffer(20)), message: /complete GLB/ },
  ])('keeps $name visible and lets loading Retry fetch the missing model again', async ({ response, message }) => {
    const value = manifest(); let fail = true;
    fetchMock.mockImplementation(async url => {
      if (String(url).endsWith('manifest.json')) return new Response(JSON.stringify(value));
      if (fail) { fail = false; return response(); }
      return new Response(glb());
    });
    const first = subject.loadMeshyNpcCatalog(); await expect(first).rejects.toThrow(message);
    expect(loader.parse).not.toHaveBeenCalled();
    const second = subject.loadMeshyNpcCatalog(); expect(second).not.toBe(first);
    await expect(second).resolves.toBeInstanceOf(subject.MeshyNpcCatalog);
    expect(fetchMock).toHaveBeenCalledTimes(3); expect(loader.parse).toHaveBeenCalledOnce();
  });

  it('fails a hash mismatch before parsing even when a download has the expected size', async () => {
    const value = manifest(); value.assets[0]!.sha256 = 'f'.repeat(64);
    fetchMock.mockImplementation(async url => new Response(String(url).endsWith('manifest.json') ? JSON.stringify(value) : glb()));
    await expect(subject.loadMeshyNpcCatalog()).rejects.toThrow(/integrity check/);
    expect(loader.parse).not.toHaveBeenCalled();
  });

  it('loads only the menu warden until the world is requested and shares its in-flight model with the full catalog', async () => {
    const value = manifest(); value.assets.push({ ...entry, id: 'warden', file: 'warden.glb' });
    value.roles['menu:warden'] = 'warden';
    let finishWarden!: (response: Response) => void;
    fetchMock.mockImplementation(async url => {
      if (String(url).endsWith('manifest.json')) return new Response(JSON.stringify(value));
      if (String(url).endsWith('warden.glb')) return new Promise(resolve => { finishWarden = resolve; });
      return new Response(glb());
    });
    const menuProgress = vi.fn(), menu = subject.loadMeshyNpcCatalog(menuProgress, ['menu:warden']);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith(entry.file))).toBe(false);
    const worldProgress = vi.fn(), world = subject.loadMeshyNpcCatalog(worldProgress);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('warden.glb'))).toHaveLength(1);
    finishWarden(new Response(glb()));
    const [menuCatalog, worldCatalog] = await Promise.all([menu, world]);
    expect(menuProgress.mock.calls).toEqual([[0, 1], [1, 1]]);
    expect(worldProgress.mock.calls[0]).toEqual([0, 2]); expect(worldProgress.mock.calls.at(-1)).toEqual([2, 2]);
    expect(menuCatalog.create('menu:warden').root.userData.meshyNpc.id).toBe('warden');
    expect(() => menuCatalog.create('ambient:fisher')).toThrow(/not been prepared/);
    expect(worldCatalog.create('ambient:fisher').root.userData.meshyNpc.id).toBe(entry.id);
    expect(loader.parse).toHaveBeenCalledTimes(2);
    expect(subject.loadMeshyNpcCatalog(undefined, ['menu:warden', 'menu:warden'])).toBe(menu);
    await subject.loadMeshyNpcCatalog(); expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects empty or unknown role selections before fetching and keeps valid menu loading available', async () => {
    await expect(subject.loadMeshyNpcCatalog(undefined, [])).rejects.toThrow(/requested resident roles/);
    await expect(subject.loadMeshyNpcCatalog(undefined, ['unknown'])).rejects.toThrow(/requested resident roles/);
    expect(fetchMock).not.toHaveBeenCalled();
    const value = manifest();
    fetchMock.mockImplementation(async url => new Response(String(url).endsWith('manifest.json') ? JSON.stringify(value) : glb()));
    await expect(subject.loadMeshyNpcCatalog(undefined, ['menu:warden'])).resolves.toBeInstanceOf(subject.MeshyNpcCatalog);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('releases failed menu/world selections together while retaining a successful sibling model for Retry', async () => {
    const value = manifest(); value.assets.push({ ...entry, id: 'warden', file: 'warden.glb' });
    value.roles['menu:warden'] = 'warden';
    let failing = true;
    fetchMock.mockImplementation(async url => {
      if (String(url).endsWith('manifest.json')) return new Response(JSON.stringify(value));
      if (String(url).endsWith('warden.glb') && failing) return new Response('', { status: 503 });
      return new Response(glb());
    });
    const menu = subject.loadMeshyNpcCatalog(undefined, ['menu:warden']), world = subject.loadMeshyNpcCatalog();
    await Promise.all([expect(menu).rejects.toThrow('HTTP 503'), expect(world).rejects.toThrow('HTTP 503')]);
    await vi.waitFor(() => expect(loader.parse).toHaveBeenCalledOnce());
    failing = false;
    const menuRetry = subject.loadMeshyNpcCatalog(undefined, ['menu:warden']), worldRetry = subject.loadMeshyNpcCatalog();
    expect(menuRetry).not.toBe(menu); expect(worldRetry).not.toBe(world);
    await Promise.all([menuRetry, worldRetry]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('manifest.json'))).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith(entry.file))).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('warden.glb'))).toHaveLength(2);
    expect(loader.parse).toHaveBeenCalledTimes(2);
  });

  it('late parallel downloads cannot replace the recovery UI after a sibling model failed', async () => {
    const value = manifest();
    for (const id of ['second', 'third']) value.assets.push({ ...entry, id, file: `${id}.glb` });
    value.roles[NPC_ROLES[1]!] = 'second'; value.roles[NPC_ROLES[2]!] = 'third';
    let finishSecond!: (response: Response) => void, finishThird!: (response: Response) => void;
    fetchMock.mockImplementation(async url => {
      if (String(url).endsWith('manifest.json')) return new Response(JSON.stringify(value));
      if (String(url).endsWith('second.glb')) return new Promise(resolve => { finishSecond = resolve; });
      if (String(url).endsWith('third.glb')) return new Promise(resolve => { finishThird = resolve; });
      return new Response('unavailable', { status: 503 });
    });
    const progress = vi.fn();
    await expect(subject.loadMeshyNpcCatalog(progress)).rejects.toThrow(/HTTP 503/);
    expect(progress.mock.calls).toEqual([[0, 3]]);
    finishSecond(new Response(glb())); finishThird(new Response(glb()));
    // Drain the real response-buffer/parser promise chain rather than advancing a made-up gameplay clock.
    await vi.waitFor(() => expect(loader.parse).toHaveBeenCalledTimes(2));
    expect(progress.mock.calls).toEqual([[0, 3]]);
  });
});
