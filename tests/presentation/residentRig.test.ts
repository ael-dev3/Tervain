import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMeshyNpcRig, type ResidentMotionSource } from '../../src/presentation/meshynpcs';
import { poseRig, type Pose } from '../../src/presentation/characters';
import { parseResidentRig, RESIDENT_JOINTS, RESIDENT_RIG_PROFILE } from '../../src/presentation/npc/residentRig';
import { HERO_SWIM_CLIPS } from '../../src/presentation/hero/swim';
import { KEEP_REST, MOTION_CLIPS, residentClipNames, residentMotionLibrary, retargetClip } from '../../src/presentation/npc/residentMotion';
import { residentRestPose } from '../../src/presentation/npc/residentRig';
import { loadResident, loadResidentMotion, loadResidentRigData, residentManifest, residentMesh } from './residentFixtures';

const file = (path: string) => readFileSync(new URL(`../../public/models/npcs/${path}`, import.meta.url));
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** Every vertex of a skinned mesh as drawn now (linear blending: the bind pose is the same under both blends). */
function skinned(mesh: THREE.SkinnedMesh): Float32Array {
  mesh.updateMatrixWorld(true);
  mesh.skeleton.update();
  const position = mesh.geometry.getAttribute('position'), out = new Float32Array(position.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    mesh.applyBoneTransform(i, v);
    v.toArray(out, i * 3);
  }
  return out;
}

async function residentWithMotion(id: string, overrides: Partial<ResidentMotionSource> = {}) {
  const { source, entry } = await loadResident(id);
  const data = await loadResidentRigData(id);
  const library = residentMotionLibrary(await loadResidentMotion());
  const motion: ResidentMotionSource = { data, library, build: 'man', seed: 7, fighter: false, ...overrides };
  return { rig: createMeshyNpcRig(source, entry, 1, 'none', undefined, {}, motion), entry, data };
}

describe('the residents\' own rigs (A65)', () => {
  it('ships a checked rig for every resident model and the motion library the manifest names', () => {
    const glbJson = (bytes: Buffer) => JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    for (const asset of residentManifest.assets) {
      expect(asset.rig, asset.id).toBeDefined();
      const bytes = file(asset.rig!.file);
      expect(bytes.length, asset.id).toBe(asset.rig!.bytes);
      expect(sha256(bytes), asset.id).toBe(asset.rig!.sha256);
      const data = parseResidentRig(JSON.parse(bytes.toString('utf8')));
      expect(data.modelSha256, asset.id).toBe(asset.sha256);
      // One weight set per vertex of the model it was made for.
      const model = glbJson(file(asset.file));
      const mesh = model.nodes.find((node: { skin?: number; mesh?: number }) => node.skin !== undefined && node.mesh !== undefined);
      expect(data.vertices, asset.id).toBe(model.accessors[model.meshes[mesh.mesh].primitives[0].attributes.POSITION].count);
    }
    const library = file(residentManifest.motion!.file);
    expect(library.length).toBe(residentManifest.motion!.bytes);
    expect(sha256(library)).toBe(residentManifest.motion!.sha256);
    const record = JSON.parse(file('motion/clips.json').toString('utf8'));
    expect(record.sha256).toBe(residentManifest.motion!.sha256);
    const names = glbJson(library).animations.map((animation: { name: string }) => animation.name).sort();
    expect(record.clips.map((clip: { name: string }) => clip.name).sort()).toEqual(names);
    // The library holds exactly the clips the residents and the wanderer's swim ask for.
    expect(names).toEqual([...residentClipNames(), ...Object.values(HERO_SWIM_CLIPS)].sort());
  });

  it('rejects rig files that do not fit a model', () => {
    const good = JSON.parse(file(residentManifest.assets[0]!.rig!.file).toString('utf8'));
    expect(() => parseResidentRig({ ...good, profile: 'other' })).toThrow(/incompatible/);
    expect(() => parseResidentRig({ ...good, bones: good.bones.slice(1) })).toThrow(/wrong joints/);
    expect(() => parseResidentRig({ ...good, model: { ...good.model, vertices: good.model.vertices + 1 } })).toThrow(/does not cover/);
    const weights = Buffer.from(good.skin.weights, 'base64');
    weights[0] = (weights[0]! + 1) % 256;
    expect(() => parseResidentRig({ ...good, skin: { ...good.skin, weights: weights.toString('base64') } })).toThrow(/unnormalized/);
    expect(good.profile).toBe(RESIDENT_RIG_PROFILE);
    expect(good.bones.map((bone: { name: string }) => bone.name)).toEqual([...RESIDENT_JOINTS]);
  });

  it('binds each model exactly as it was authored', async () => {
    for (const id of ['ash-recorder', 'rillford-reeve', 'caravan-master']) {
      const { source } = await loadResident(id);
      const before = skinned(residentMesh(source.scene));
      const { rig } = await residentWithMotion(id);
      expect(rig.resident, id).toBeDefined();
      const mesh = residentMesh(rig.root);
      expect(mesh.skeleton.bones.map(bone => bone.name)).toEqual([...RESIDENT_JOINTS]);
      // Before any pose: the new skeleton stands where the model was bound.
      mesh.skeleton.pose();
      const after = skinned(mesh);
      let worst = 0;
      for (let i = 0; i < before.length; i++) worst = Math.max(worst, Math.abs(before[i]! - after[i]!));
      expect(worst, id).toBeLessThan(1e-4);
    }
  }, 60_000);

  it('retargets the reference rest: body and legs onto the target\'s own rest, arms along the reference\'s', async () => {
    const library = residentMotionLibrary(await loadResidentMotion());
    const { rig } = await residentWithMotion('rillford-reeve');
    const bones = (rig.resident as unknown as { bones: Parameters<typeof residentRestPose>[0] }).bones;
    const target = residentRestPose(bones);
    // A clip that holds every joint of the reference rig at its rest.
    const tracks = [...library.rest].flatMap(([joint, { position, quaternion }]) => [
      new THREE.QuaternionKeyframeTrack(`${joint}.quaternion`, [0, 1], [...quaternion.toArray(), ...quaternion.toArray()]),
      ...(joint === 'Hips' ? [new THREE.VectorKeyframeTrack('Hips.position', [0, 1], [...position.toArray(), ...position.toArray()])] : []),
    ]);
    const baked = retargetClip(new THREE.AnimationClip('rest', 1, tracks), library.rest, target);
    for (const track of baked.clip.tracks) {
      const [joint, property] = track.name.split('.') as [(typeof RESIDENT_JOINTS)[number], string];
      const rest = target.get(joint)!;
      if (property === 'quaternion' && KEEP_REST.has(joint)) {
        expect(Math.abs(new THREE.Quaternion().fromArray(track.values, 0).dot(rest.quaternion)), joint).toBeGreaterThan(1 - 1e-5);
      } else if (property === 'position') {
        expect(new THREE.Vector3().fromArray(track.values, 0).distanceTo(rest.position), joint).toBeLessThan(1e-4);
      }
    }
    // Posed by that clip, each arm segment points as the reference's does.
    const chain = (rest: Map<string, { position: THREE.Vector3; quaternion: THREE.Quaternion }>, clip?: THREE.AnimationClip) => {
      const root = new THREE.Group(), made = new Map<string, THREE.Bone>();
      const parents: Record<string, string | null> = { Hips: null, Spine02: 'Hips', Spine01: 'Spine02', Spine: 'Spine01',
        RightShoulder: 'Spine', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm' };
      for (const [joint, parent] of Object.entries(parents)) {
        const bone = new THREE.Bone();
        bone.name = joint;
        bone.position.copy(rest.get(joint)!.position);
        bone.quaternion.copy(rest.get(joint)!.quaternion);
        (parent ? made.get(parent)! : root).add(bone);
        made.set(joint, bone);
      }
      if (clip) { const mixer = new THREE.AnimationMixer(root); mixer.clipAction(clip).play(); mixer.update(0); }
      root.updateMatrixWorld(true);
      const at = (joint: string) => made.get(joint)!.getWorldPosition(new THREE.Vector3());
      return [at('RightForeArm').sub(at('RightArm')).normalize(), at('RightHand').sub(at('RightForeArm')).normalize()];
    };
    const reference = chain(library.rest), posed = chain(target, baked.clip);
    for (let i = 0; i < 2; i++) expect(posed[i]!.dot(reference[i]!)).toBeGreaterThan(1 - 1e-4);
  }, 60_000);

  it('advances a walk only by the metres travelled, and plays it at the measured pace', async () => {
    const { rig } = await residentWithMotion('estate-steward');
    const pose = (travel: number): Pose => ({ mode: 'walk', speed: 0.8, time: 0, t: 0, amp: 1, travel });
    poseRig(rig, pose(0.05), 1 / 30);
    const motion = rig.resident!;
    const phase = () => (motion as unknown as { phase: number }).phase;
    const start = phase();
    for (let i = 0; i < 10; i++) poseRig(rig, pose(0), 1 / 30);
    expect(phase()).toBe(start);
    const clip = (motion as unknown as { clips: Map<string, { cycleMetres: number }> }).clips.get(MOTION_CLIPS.walk.man)!;
    expect(clip.cycleMetres).toBeGreaterThan(1);
    poseRig(rig, pose(clip.cycleMetres / 4), 1 / 30);
    expect(((phase() - start) % 1 + 1) % 1).toBeCloseTo(0.25, 5);
    expect(motion.leading).toBe(MOTION_CLIPS.walk.man);
  }, 60_000);

  it('seats a seated clip on the real seat, whatever chair it was made on', async () => {
    const { rig } = await residentWithMotion('ash-recorder', { work: 'writing' });
    const mesh = residentMesh(rig.root);
    const pose: Pose = { mode: 'sit', speed: 0, time: 0, t: 0, amp: 1, seated: true, seatHeight: 0.55 };
    for (let i = 0; i < 300; i++) poseRig(rig, pose, 1 / 30);
    // The lowest of the surface the hips and thighs carry rests on the seat.
    rig.root.updateMatrixWorld(true);
    mesh.skeleton.update();
    const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
    const carriers = new Set(['Hips', 'LeftUpLeg', 'RightUpLeg'].map(name => mesh.skeleton.bones.findIndex(bone => bone.name === name)));
    const heights: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < index.count; i++) {
      let w = 0;
      for (let s = 0; s < 4; s++) if (carriers.has(index.getComponent(i, s))) w += weight.getComponent(i, s);
      if (w < 0.6) continue;
      mesh.getVertexPosition(i, v);
      v.applyMatrix4(mesh.matrixWorld);
      heights.push(v.y);
    }
    heights.sort((a, b) => a - b);
    expect(heights[Math.floor(heights.length * 0.01)]!).toBeCloseTo(0.55, 1);
  }, 60_000);

  it('shows a trade\'s tools only while working', async () => {
    const { rig } = await residentWithMotion('quarry-hand', { work: 'stonework' });
    const tools = rig.npc!.work!.props;
    expect(tools.length).toBe(2);
    const at = (mode: Pose['mode']) => { poseRig(rig, { mode, speed: 0, time: 0, t: 0, amp: 1, workGesture: 'stonework' }, 1 / 30); return tools.map(tool => tool.visible); };
    expect(at('work')).toEqual([true, true]);
    expect(at('idle')).toEqual([false, false]);
    expect(rig.root.userData.meshyNpc.triangles).toBeLessThanOrEqual(50_000);
  }, 60_000);

  it('keeps the procedural poser when no rig is given', async () => {
    const { source, entry } = await loadResident('keeper');
    const rig = createMeshyNpcRig(source, entry);
    expect(rig.resident).toBeUndefined();
    expect(rig.root.userData.meshyNpc.animation).toBe('derived-game-poser');
  }, 60_000);
});
