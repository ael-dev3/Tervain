import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMeshyNpcRig, type ResidentMotionSource } from '../../src/presentation/meshynpcs';
import { poseRig, type Pose } from '../../src/presentation/characters';
import { parseResidentRig, RESIDENT_JOINTS, RESIDENT_RIG_PROFILE } from '../../src/presentation/npc/residentRig';
import { HERO_SWIM_CLIPS } from '../../src/presentation/hero/swim';
import { CENTRED_CLIPS, KEEP_REST, MOTION_CLIPS, residentClipNames, residentMotionLibrary, retargetClip } from '../../src/presentation/npc/residentMotion';
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

  it('seats a seated clip on the real seat, whatever chair it was made on, with the feet on the floor (A69)', async () => {
    const { rig } = await residentWithMotion('ash-recorder', { work: 'writing' });
    const mesh = residentMesh(rig.root);
    const pose: Pose = { mode: 'sit', speed: 0, time: 0, t: 0, amp: 1, seated: true, seatHeight: 0.55 };
    for (let i = 0; i < 300; i++) poseRig(rig, pose, 1 / 30);
    // The surface the hips and thighs carry rests on the bench's plank (0.42 m deep, its middle 4 cm behind the seat's
    // place): over the plank it neither sinks into it nor hovers above it. On a bench higher than the clip's chair the
    // thighs slope down past its front edge to the feet, which reach the floor rather than dangling.
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
      if (v.z > -0.25 && v.z < 0.17) heights.push(v.y);
    }
    heights.sort((a, b) => a - b);
    expect(Math.abs(heights[Math.floor(heights.length * 0.005)]! - 0.55)).toBeLessThan(0.04);
    for (const foot of ['LeftFoot', 'RightFoot']) {
      expect(mesh.skeleton.bones.find(bone => bone.name === foot)!.getWorldPosition(v).y, foot).toBeLessThan(0.22);
    }
  }, 60_000);

  it('stands the talking and idle clips on the actor\'s own spot, facing the actor\'s way (A69)', async () => {
    const library = residentMotionLibrary(await loadResidentMotion());
    const parents: Record<string, string | null> = { Hips: null, Spine02: 'Hips', Spine01: 'Spine02', Spine: 'Spine01', neck: 'Spine', Head: 'neck',
      head_end: 'Head', headfront: 'Head', LeftShoulder: 'Spine', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
      RightShoulder: 'Spine', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm', LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg',
      LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot', RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot' };
    // Where the hips stand off their rest on average, and which way the chest (shoulder line) and the face turn.
    const placement = (clip: THREE.AnimationClip) => {
      const root = new THREE.Group(), bones = new Map<string, THREE.Bone>();
      for (const joint of RESIDENT_JOINTS) {
        const bone = new THREE.Bone();
        bone.name = joint;
        bone.position.copy(library.rest.get(joint)!.position); bone.quaternion.copy(library.rest.get(joint)!.quaternion);
        bones.set(joint, bone);
      }
      for (const joint of RESIDENT_JOINTS) (parents[joint] ? bones.get(parents[joint]!)! : root).add(bones.get(joint)!);
      const at = (joint: string) => bones.get(joint)!.getWorldPosition(new THREE.Vector3());
      const face = () => Math.atan2(at('headfront').x - at('Head').x, at('headfront').z - at('Head').z);
      const chest = () => { const v = at('RightArm').sub(at('LeftArm')); return Math.atan2(-v.z, v.x); };
      root.updateMatrixWorld(true);
      const rest = { hips: at('Hips'), face: face(), chest: chest() };
      const mixer = new THREE.AnimationMixer(root), action = mixer.clipAction(clip).play();
      let offset = 0, turn = 0;
      const frames = 60;
      for (let f = 0; f < frames; f++) {
        action.time = (f / (frames - 1)) * clip.duration; mixer.update(0); root.updateMatrixWorld(true);
        const hips = at('Hips');
        offset += Math.hypot(hips.x - rest.hips.x, hips.z - rest.hips.z) / frames;
        turn += (Math.atan2(Math.sin(face() - rest.face), Math.cos(face() - rest.face)) + Math.atan2(Math.sin(chest() - rest.chest), Math.cos(chest() - rest.chest))) / 2 / frames;
      }
      return { offset, turn: Math.abs(turn) * 180 / Math.PI };
    };
    const chat = library.clips.get('talk.chat')!;
    // As authored, the chat stands half a metre aside, its chest and face turned 35-50° away.
    const authored = placement(retargetClip(chat, library.rest, library.rest).clip);
    expect(authored.offset).toBeGreaterThan(0.3);
    expect(authored.turn).toBeGreaterThan(25);
    for (const name of CENTRED_CLIPS) {
      const centred = placement(retargetClip(library.clips.get(name)!, library.rest, library.rest, false, true).clip);
      expect(centred.turn, name).toBeLessThan(4);
      expect(centred.offset, name).toBeLessThan(0.12);
    }
  }, 60_000);

  it('sits down from in front of a bench and gets up there: no sliding, never afloat, the seat on the plank (A69)', async () => {
    const { rig } = await residentWithMotion('maintenance-worker');
    const motion = rig.resident!, mesh = residentMesh(rig.root);
    const back = motion.seatApproach(0.55);
    expect(back).toBeGreaterThan(0.3);
    expect(back).toBeLessThan(0.7);
    expect(motion.standUpSeconds).toBeGreaterThan(2);
    expect(motion.standUpSeconds).toBeLessThan(3.5);
    const hips = mesh.skeleton.bones.find(bone => bone.name === 'Hips')!, v = new THREE.Vector3();
    const where = () => { rig.root.updateMatrixWorld(true); return hips.getWorldPosition(v).clone(); };
    const pose = (mode: Pose['mode'], seated: boolean): Pose => ({ mode, speed: 0, time: 0, t: 0, amp: 1, seated, seatHeight: 0.55, seatBack: back });
    for (let i = 0; i < 30; i++) poseRig(rig, pose('idle', false), 1 / 30);
    const standing = where(), upright = hips.position.y;
    let lowest = Infinity;
    for (let i = 0; i < 180; i++) {
      poseRig(rig, pose('sit', true), 1 / 30);
      const at = where();
      lowest = Math.min(lowest, at.y);
      // Getting down begins where they stood (the clip shifts its weight a little before it pushes the hips back), and
      // while they are on their feet the body is on the ground, not lifted toward the seat's height.
      if (i < 45) expect(Math.abs(at.z - standing.z), `frame ${i}`).toBeLessThan(0.1);
      if (hips.position.y > upright - 0.02) expect(rig.body.position.y, `frame ${i}`).toBeLessThan(0.03);
    }
    expect(lowest).toBeLessThan(standing.y - 0.12);
    // Seated, the hips are over the bench's plank, which spans 0.42 m about a line 4 cm behind the seat's place.
    const seated = where();
    expect(seated.z).toBeGreaterThan(-0.25 - back);
    expect(seated.z).toBeLessThan(0.17 - back);
    for (let i = 0; i < 180; i++) poseRig(rig, pose('idle', false), 1 / 30);
    expect(Math.abs(where().z - standing.z)).toBeLessThan(0.1);
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
