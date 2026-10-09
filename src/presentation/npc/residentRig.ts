import * as THREE from 'three';
import { FINGER_JOINTS, FINGER_SIDES, RELAXED_CURL, ResidentFingers, fingerBindJoints, type FingerJoint, type ResidentFingerPlan } from './residentFingers';

/**
 * Each resident's own humanoid rig (A65): the 24-joint skeleton and skin weights that Meshy's automatic rigger fitted to
 * the prepared model, stored beside it in `models/npcs/rigs/<id>.json` (tools/meshy-rig/extract-rig.mjs). The prepared
 * GLB keeps its eleven-joint skin for the measurements that read it (surface priors, covered layers); on load the
 * actor's skeleton is replaced by this one, bound to the model exactly as authored.
 */
export const RESIDENT_RIG_PROFILE = 'meshy-auto-rig-v1';

export const RESIDENT_JOINTS = [
  'Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'head_end', 'headfront',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
] as const;
export type ResidentJoint = (typeof RESIDENT_JOINTS)[number];
export type ResidentBones = Record<ResidentJoint, THREE.Bone>;

export interface ResidentRigBone {
  name: ResidentJoint;
  parent: number;
  /** Bind pose in the model's space (metres): where the joint is and how it is turned. */
  position: [number, number, number];
  quaternion: [number, number, number, number];
}

export interface ResidentRigData {
  vertices: number;
  modelSha256: string;
  bones: ResidentRigBone[];
  /** Four joint indices and four weights (bytes summing to 255) per vertex of the prepared model. */
  joints: Uint8Array;
  weights: Uint8Array;
}

function decodeBase64(text: string): Uint8Array {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Validate a rig file before any of it touches a model. */
export function parseResidentRig(value: unknown): ResidentRigData {
  const rig = value as {
    schema?: number; profile?: string; model?: { sha256?: string; vertices?: number };
    bones?: ResidentRigBone[]; skin?: { joints?: string; weights?: string };
  } | null;
  if (!rig || rig.schema !== 1 || rig.profile !== RESIDENT_RIG_PROFILE || !rig.model || !Array.isArray(rig.bones) || !rig.skin) {
    throw new Error('A resident rig file is incompatible.');
  }
  const vertices = rig.model.vertices;
  if (!Number.isSafeInteger(vertices) || vertices! <= 0 || typeof rig.model.sha256 !== 'string') throw new Error('A resident rig file has no model identity.');
  if (rig.bones.length !== RESIDENT_JOINTS.length) throw new Error('A resident rig file has the wrong joints.');
  rig.bones.forEach((bone, i) => {
    if (bone.name !== RESIDENT_JOINTS[i] || !Number.isInteger(bone.parent) || bone.parent >= i || bone.parent < -1
      || bone.position?.length !== 3 || bone.quaternion?.length !== 4 || ![...bone.position, ...bone.quaternion].every(Number.isFinite)) {
      throw new Error(`A resident rig file has an invalid joint ${i}.`);
    }
  });
  const joints = decodeBase64(rig.skin.joints ?? ''), weights = decodeBase64(rig.skin.weights ?? '');
  if (joints.length !== vertices! * 4 || weights.length !== vertices! * 4) throw new Error('A resident rig file does not cover its model.');
  for (let v = 0; v < vertices!; v++) {
    let total = 0;
    for (let s = 0; s < 4; s++) {
      if (joints[v * 4 + s]! >= RESIDENT_JOINTS.length) throw new Error('A resident rig file names a joint it does not have.');
      total += weights[v * 4 + s]!;
    }
    if (total !== 255) throw new Error('A resident rig file has unnormalized weights.');
  }
  return { vertices: vertices!, modelSha256: rig.model.sha256, bones: rig.bones, joints, weights };
}

/** The skin attributes of one rig, made once and shared by every actor's geometry of that model. */
const attributes = new WeakMap<ResidentRigData | ResidentFingerPlan, { index: THREE.BufferAttribute; weight: THREE.BufferAttribute }>();
function skinAttributes(data: ResidentRigData, fingers?: ResidentFingerPlan) {
  let known = attributes.get(fingers ?? data);
  if (!known) {
    if (fingers) known = { index: new THREE.Uint16BufferAttribute(fingers.joints, 4), weight: new THREE.Float32BufferAttribute(fingers.weights, 4) };
    else {
      const weight = new Float32Array(data.weights.length);
      for (let i = 0; i < weight.length; i++) weight[i] = data.weights[i]! / 255;
      known = { index: new THREE.Uint16BufferAttribute(Uint16Array.from(data.joints), 4), weight: new THREE.Float32BufferAttribute(weight, 4) };
    }
    attributes.set(fingers ?? data, known);
  }
  return known;
}

/**
 * Give a cloned resident its own rig: new bones under a fresh armature beside the mesh, the rig's weights, and a bind
 * that leaves the model exactly as authored. The previous skeleton is detached and its texture released. The mesh must
 * be the prepared model the rig was made for (same vertex count; the catalog checks the file hash). With a finger plan
 * (A72) the hands' finger chains follow the rig's joints in the skeleton and the plan's weights replace the rig's.
 */
export function installResidentRig(mesh: THREE.SkinnedMesh, data: ResidentRigData, fingerPlan?: ResidentFingerPlan): { bones: ResidentBones; armature: THREE.Group; fingers: ResidentFingers | null } {
  const geometry = mesh.geometry;
  if (geometry.getAttribute('position').count !== data.vertices) throw new Error('A resident rig does not match its model.');
  const parent = mesh.parent;
  if (!parent) throw new Error('A resident mesh must be in its scene before rigging.');
  const old = mesh.skeleton;
  const oldRoots = new Set(old.bones.filter(bone => !old.bones.includes(bone.parent as THREE.Bone)));
  for (const root of oldRoots) root.removeFromParent();
  old.dispose();

  const armature = new THREE.Group();
  armature.name = 'Resident rig';
  parent.add(armature);
  const bones = {} as ResidentBones;
  const list: THREE.Bone[] = [];
  const world: THREE.Matrix4[] = [];
  const unit = new THREE.Vector3(1, 1, 1), m = new THREE.Matrix4(), local = new THREE.Matrix4();
  for (const spec of data.bones) {
    const bone = new THREE.Bone();
    bone.name = spec.name;
    const w = new THREE.Matrix4().compose(new THREE.Vector3(...spec.position), new THREE.Quaternion(...spec.quaternion).normalize(), unit);
    world.push(w);
    // Joints keep the bind placement relative to their parent (the armature for the hips).
    local.copy(spec.parent < 0 ? w : m.copy(world[spec.parent]!).invert().multiply(w));
    local.decompose(bone.position, bone.quaternion, bone.scale);
    (spec.parent < 0 ? armature : list[spec.parent]!).add(bone);
    list.push(bone);
    bones[spec.name] = bone;
  }
  let fingers: ResidentFingers | null = null;
  if (fingerPlan) {
    const named = new Map<string, THREE.Bone>(list.map(bone => [bone.name, bone]));
    const fingerBones = {} as Record<FingerJoint, THREE.Bone>;
    const placed = new Map<string, THREE.Matrix4>(data.bones.map((spec, i) => [spec.name, world[i]!]));
    for (const spec of fingerBindJoints(fingerPlan, data)) {
      const bone = new THREE.Bone();
      bone.name = spec.name;
      const w = new THREE.Matrix4().compose(new THREE.Vector3(...spec.position), new THREE.Quaternion(...spec.quaternion).normalize(), unit);
      local.copy(m.copy(placed.get(spec.parent)!).invert().multiply(w));
      local.decompose(bone.position, bone.quaternion, bone.scale);
      named.get(spec.parent)!.add(bone);
      named.set(spec.name, bone);
      placed.set(spec.name, w);
      list.push(bone);
      fingerBones[spec.name] = bone;
    }
    if (list.length !== RESIDENT_JOINTS.length + FINGER_JOINTS.length) throw new Error('A resident hand has the wrong finger joints.');
    fingers = new ResidentFingers(fingerBones, fingerPlan, data);
  }
  const { index, weight } = skinAttributes(data, fingerPlan);
  geometry.setAttribute('skinIndex', index);
  geometry.setAttribute('skinWeight', weight);
  armature.updateMatrixWorld(true);
  mesh.updateMatrixWorld(true);
  // The skeleton's inverse binds come from the joints where they stand now: the model's authored pose.
  const skeleton = new THREE.Skeleton(list);
  mesh.bind(skeleton, mesh.matrixWorld);
  if (fingers) for (const side of FINGER_SIDES) fingers.set(side, RELAXED_CURL);
  return { bones, armature, fingers };
}

/** The bind pose of a rig's joints (local to their parents), for retargeting. */
export function residentRestPose(bones: ResidentBones): Map<ResidentJoint, { position: THREE.Vector3; quaternion: THREE.Quaternion }> {
  return new Map(RESIDENT_JOINTS.map(name => [name, { position: bones[name].position.clone(), quaternion: bones[name].quaternion.clone() }]));
}
