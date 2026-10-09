import * as THREE from 'three';
import type { Mode, Pose } from '../characters';
import type { WorkGesture } from '../npcStyle';
import { RESIDENT_JOINTS, type ResidentBones, type ResidentJoint, type ResidentRigData } from './residentRig';
import type { ToolPoints } from './residentProps';
import type { WorkSite } from './workSites';

/**
 * The residents' motion (A65): authored clips from Meshy's animation library and Meshy's text-to-motion, all made on
 * one reference rig (models/npcs/motion/residents.glb), retargeted onto each resident's own rig and played by a small
 * crossfading state machine that answers the game's poses: walking locked to the metres actually travelled, standing,
 * talking, sitting down on and getting up from the actual seat, working at each trade, and the bandits' fights.
 */
export const RESIDENT_MOTION_PROFILE = 'resident-motion-v1';

export type RestPose = Map<ResidentJoint, { position: THREE.Vector3; quaternion: THREE.Quaternion }>;
export interface ResidentMotionLibrary { rest: RestPose; clips: Map<string, THREE.AnimationClip> }

const PARENT: Record<ResidentJoint, ResidentJoint | null> = {
  Hips: null, Spine02: 'Hips', Spine01: 'Spine02', Spine: 'Spine01', neck: 'Spine', Head: 'neck', head_end: 'Head', headfront: 'Head',
  LeftShoulder: 'Spine', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
  RightShoulder: 'Spine', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm',
  LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot',
  RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot',
};
/** The joint each joint points at, for matching limb directions between rigs; tips follow their parent. */
const AIM: Partial<Record<ResidentJoint, ResidentJoint>> = {
  Hips: 'Spine02', Spine02: 'Spine01', Spine01: 'Spine', Spine: 'neck', neck: 'Head', Head: 'head_end',
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase',
};
const ANIMATED = RESIDENT_JOINTS.filter(joint => joint !== 'head_end' && joint !== 'headfront');
const FPS = 30;
/** The joints whose turn reads as which way a standing figure faces: the chest and the head. Models face +z. */
const FACING_JOINTS: readonly ResidentJoint[] = ['Spine', 'Head'];
const FORWARD = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);

/** The library's reference skeleton at rest and its clips, from the loaded motion GLB. */
export function residentMotionLibrary(gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }): ResidentMotionLibrary {
  const rest: RestPose = new Map();
  for (const joint of RESIDENT_JOINTS) {
    const node = gltf.scene.getObjectByName(joint);
    if (!node) throw new Error(`The resident motion library has no ${joint} joint.`);
    rest.set(joint, { position: node.position.clone(), quaternion: node.quaternion.clone() });
  }
  return { rest, clips: new Map(gltf.animations.map(clip => [clip.name, clip])) };
}

interface WorldRest { position: Map<ResidentJoint, THREE.Vector3>; rotation: Map<ResidentJoint, THREE.Quaternion> }
function worldRest(rest: RestPose): WorldRest {
  const position = new Map<ResidentJoint, THREE.Vector3>(), rotation = new Map<ResidentJoint, THREE.Quaternion>();
  for (const joint of RESIDENT_JOINTS) {
    const local = rest.get(joint)!, parent = PARENT[joint];
    if (!parent) { position.set(joint, local.position.clone()); rotation.set(joint, local.quaternion.clone()); continue; }
    const pr = rotation.get(parent)!;
    position.set(joint, local.position.clone().applyQuaternion(pr).add(position.get(parent)!));
    rotation.set(joint, pr.clone().multiply(local.quaternion));
  }
  return { position, rotation };
}

/**
 * Joints that keep the target's own rest and take only the clip's movement from it: the spine, neck and head (a hood or
 * a stoop places the head's marker differently on every model, so matching its direction would tip the head), the
 * shoulders, the legs (a figure keeps its own stance, which a long skirt is shaped around) and the feet (shoes sit at
 * their own angle).
 */
export const KEEP_REST = new Set<ResidentJoint>(['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftShoulder', 'RightShoulder',
  'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase']);

/**
 * Per-joint correction from the reference rig to a target rig. The arms point where the reference's point, so hands land
 * where a gesture or a tool puts them whatever the target's resting arms; the joints in {@link KEEP_REST} keep the
 * target's own rest and add the clip's movement to it.
 */
function corrections(source: WorldRest, target: WorldRest): Map<ResidentJoint, THREE.Quaternion> {
  const out = new Map<ResidentJoint, THREE.Quaternion>();
  const arc = new Map<ResidentJoint, THREE.Quaternion>();
  for (const joint of ANIMATED) {
    const aim = AIM[joint];
    let a: THREE.Quaternion;
    if (KEEP_REST.has(joint)) a = new THREE.Quaternion();
    else if (aim) {
      const from = source.position.get(aim)!.clone().sub(source.position.get(joint)!).normalize();
      const to = target.position.get(aim)!.clone().sub(target.position.get(joint)!).normalize();
      a = new THREE.Quaternion().setFromUnitVectors(from, to);
    } else a = arc.get(PARENT[joint]!)?.clone() ?? new THREE.Quaternion();
    arc.set(joint, a);
    // C = (A·S)⁻¹·T: the target's rest relative to the reference rest turned onto the target's limb.
    out.set(joint, a.clone().multiply(source.rotation.get(joint)!).invert().multiply(target.rotation.get(joint)!));
  }
  return out;
}

export interface RetargetedClip {
  clip: THREE.AnimationClip;
  /** For a seated clip on a given model: where its seat lies (the lowest point of the buttocks and thighs), model metres. */
  seat?: { x: number; y: number; z: number };
  /** For a walk or run: metres the figure covers in one cycle at its natural pace (0 for a clip that stays put). */
  cycleMetres: number;
  /** Lowest point of the hips across the clip relative to rest, metres (how far a sitting clip drops). */
  hipsDrop: number;
  /** Where the hips stand on average (model x, z) — a seated clip's seat lies here. */
  hipsAt: [number, number];
}

/**
 * Bake a library clip onto a target rig. `inPlace` removes a locomotion clip's forward drift (the game moves the actor)
 * and measures the pace it implied; clips made in place are measured from the planted foot instead. `centre` stands a
 * clip on the actor's own spot facing the actor's own way: some were made a step aside and turned half away (talk.chat
 * stands 0.5 m off with its chest and head 35-50° round), which put a resident beside where they stood, looking past
 * whomever they spoke to (A69).
 */
export function retargetClip(clip: THREE.AnimationClip, library: RestPose, target: RestPose, inPlace = false, centre = false): RetargetedClip {
  const source = worldRest(library), dest = worldRest(target);
  const correct = corrections(source, dest);
  const sourceHips = library.get('Hips')!.position, targetHips = target.get('Hips')!.position;
  const scale = targetHips.y / sourceHips.y;
  const rotations = new Map<ResidentJoint, THREE.Interpolant>();
  let hipsTrack: THREE.Interpolant | null = null;
  // Three's keyframe tracks carry an interpolant factory (slerp for quaternions) that its typings leave out.
  const interpolant = (track: THREE.KeyframeTrack) => (track as unknown as { createInterpolant(): THREE.Interpolant }).createInterpolant();
  for (const track of clip.tracks) {
    const [name, property] = track.name.split('.') as [ResidentJoint, string];
    if (property === 'quaternion' && (ANIMATED as readonly string[]).includes(name)) rotations.set(name, interpolant(track));
    else if (property === 'position' && name === 'Hips') hipsTrack = interpolant(track);
  }
  const duration = clip.duration;
  const frames = Math.max(2, Math.round(duration * FPS) + 1);
  const times = new Float32Array(frames);
  const quats = new Map(ANIMATED.map(joint => [joint, new Float32Array(frames * 4)]));
  const hips = new Float32Array(frames * 3);
  const rawHips: THREE.Vector3[] = [];
  const ws = new Map<ResidentJoint, THREE.Quaternion>(), wt = new Map<ResidentJoint, THREE.Quaternion>();
  const local = new THREE.Quaternion(), inv = new THREE.Quaternion();
  let heading = 0;
  for (let f = 0; f < frames; f++) {
    const t = Math.min(duration, f / FPS);
    times[f] = t;
    for (const joint of ANIMATED) {
      const interpolant = rotations.get(joint);
      if (interpolant) { const v = interpolant.evaluate(t); local.set(v[0]!, v[1]!, v[2]!, v[3]!).normalize(); }
      else local.copy(library.get(joint)!.quaternion);
      const parent = PARENT[joint];
      const w = (ws.get(joint) ?? new THREE.Quaternion()).copy(parent ? ws.get(parent)! : new THREE.Quaternion()).multiply(local);
      ws.set(joint, w);
      const target = (wt.get(joint) ?? new THREE.Quaternion()).copy(w).multiply(correct.get(joint)!);
      wt.set(joint, target);
      const out = parent ? inv.copy(wt.get(parent)!).invert().multiply(target) : target.clone();
      // Keep neighbouring frames in one hemisphere so interpolation between them takes the short way.
      const q = quats.get(joint)!;
      if (f && out.x * q[f * 4 - 4]! + out.y * q[f * 4 - 3]! + out.z * q[f * 4 - 2]! + out.w * q[f * 4 - 1]! < 0) out.set(-out.x, -out.y, -out.z, -out.w);
      q.set([out.x, out.y, out.z, out.w], f * 4);
    }
    const p = hipsTrack ? hipsTrack.evaluate(t) : [sourceHips.x, sourceHips.y, sourceHips.z];
    rawHips.push(new THREE.Vector3(p[0]!, p[1]!, p[2]!));
    // Which way the chest and the head face in this frame, against their rest: the way the figure reads as facing.
    if (centre) heading += FACING_JOINTS.reduce((sum, joint) => {
      const forward = FORWARD.clone().applyQuaternion(local.copy(wt.get(joint)!).multiply(inv.copy(dest.rotation.get(joint)!).invert()));
      return sum + Math.atan2(forward.x, forward.z);
    }, 0) / FACING_JOINTS.length / frames;
  }
  // The pace a locomotion clip implies: its drift over the clip (removed), or for a clip made in place, how fast the
  // planted foot slides back under the body.
  const drift = rawHips[frames - 1]!.clone().sub(rawHips[0]!);
  drift.y = 0;
  let cycleMetres = 0;
  if (inPlace) cycleMetres = drift.length() * scale;
  // A centred clip turns about the vertical by its mean facing, then stands its hips' mean over the rest's.
  const facing = new THREE.Quaternion().setFromAxisAngle(UP, centre ? -heading : 0);
  const shift = new THREE.Vector2();
  if (centre) {
    for (let f = 0; f < frames; f++) {
      const p = rawHips[f]!.clone().sub(sourceHips).multiplyScalar(scale).add(targetHips).applyQuaternion(facing);
      shift.x += p.x / frames; shift.y += p.z / frames;
    }
    shift.x -= targetHips.x; shift.y -= targetHips.z;
    const q = quats.get('Hips')!, turned = new THREE.Quaternion();
    for (let f = 0; f < frames; f++) {
      turned.fromArray(q, f * 4).premultiply(facing).toArray(q, f * 4);
    }
  }
  let lowest = Infinity, sumX = 0, sumZ = 0;
  for (let f = 0; f < frames; f++) {
    const p = rawHips[f]!.clone();
    if (inPlace) p.addScaledVector(drift, -times[f]! / duration);
    const out = p.sub(sourceHips).multiplyScalar(scale).add(targetHips).applyQuaternion(facing);
    out.x -= shift.x; out.z -= shift.y;
    hips.set([out.x, out.y, out.z], f * 3);
    lowest = Math.min(lowest, out.y);
    sumX += out.x; sumZ += out.z;
  }
  const tracks: THREE.KeyframeTrack[] = [new THREE.VectorKeyframeTrack('Hips.position', times, hips)];
  for (const joint of ANIMATED) tracks.push(new THREE.QuaternionKeyframeTrack(`${joint}.quaternion`, times, quats.get(joint)!));
  const baked = new THREE.AnimationClip(clip.name, duration, tracks);
  if (inPlace && cycleMetres < 0.05) cycleMetres = plantedFootCycle(baked, target);
  return { clip: baked, cycleMetres, hipsDrop: targetHips.y - lowest, hipsAt: [sumX / frames, sumZ / frames] };
}

/** For an in-place walk: how far the lower foot slides backward over one cycle (the distance a figure would cover). */
function plantedFootCycle(clip: THREE.AnimationClip, rest: RestPose): number {
  const root = new THREE.Group();
  const bones = new Map<ResidentJoint, THREE.Bone>();
  for (const joint of RESIDENT_JOINTS) {
    const bone = new THREE.Bone();
    bone.name = joint;
    bone.position.copy(rest.get(joint)!.position);
    bone.quaternion.copy(rest.get(joint)!.quaternion);
    (PARENT[joint] ? bones.get(PARENT[joint]!)! : root).add(bone);
    bones.set(joint, bone);
  }
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip).play();
  action.paused = true;
  const foot = (joint: ResidentJoint) => bones.get(joint)!.getWorldPosition(new THREE.Vector3());
  let travelled = 0, previous: THREE.Vector3[] | null = null;
  // Fine enough to follow each stance through: a coarse sampling misses the slide around each change of foot.
  const steps = Math.max(60, Math.round(clip.duration * 120));
  for (let i = 0; i <= steps; i++) {
    action.time = (clip.duration * i) / steps;
    mixer.update(0);
    root.updateMatrixWorld(true);
    const now = [foot('LeftFoot'), foot('RightFoot')];
    if (previous) {
      const lower = now[0]!.y < now[1]!.y ? 0 : 1;
      travelled += Math.max(0, previous[lower]!.z - now[lower]!.z);
    }
    previous = now;
  }
  mixer.uncacheRoot(root);
  return travelled;
}

/**
 * Where a seated clip sits on a model: the clip is posed at a few moments on a copy of the model's skeleton, the surface
 * the hips and thighs carry is skinned on the CPU, and its lowest points give the seat's height, how far forward it
 * lies and how far to the side. Each clip sits on a chair of its own height, depth and place; the controller moves the
 * body so this seat rests on the resident's actual one. `moments` are the fractions of the clip it is seated at.
 */
export function measureSeat(clip: RetargetedClip, rest: RestPose, data: ResidentRigData, position: THREE.BufferAttribute,
  moments: readonly number[] = [0.3, 0.5, 0.7]): { x: number; y: number; z: number } {
  const root = new THREE.Group();
  const bones = new Map<ResidentJoint, THREE.Bone>();
  for (const joint of RESIDENT_JOINTS) {
    const bone = new THREE.Bone();
    bone.name = joint;
    bone.position.copy(rest.get(joint)!.position);
    bone.quaternion.copy(rest.get(joint)!.quaternion);
    (PARENT[joint] ? bones.get(PARENT[joint]!)! : root).add(bone);
    bones.set(joint, bone);
  }
  root.updateMatrixWorld(true);
  const bindInverse = RESIDENT_JOINTS.map(joint => bones.get(joint)!.matrixWorld.clone().invert());
  // The seat's surface: carried mostly by the hips and thighs.
  const carriers = new Set(['Hips', 'LeftUpLeg', 'RightUpLeg'].map(joint => RESIDENT_JOINTS.indexOf(joint as ResidentJoint)));
  const candidates: number[] = [];
  for (let v = 0; v < data.vertices; v++) {
    let w = 0;
    for (let s = 0; s < 4; s++) if (carriers.has(data.joints[v * 4 + s]!)) w += data.weights[v * 4 + s]!;
    if (w >= 0.6 * 255) candidates.push(v);
  }
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip.clip).play();
  action.paused = true;
  const skin = RESIDENT_JOINTS.map(() => new THREE.Matrix4()), p = new THREE.Vector3(), q = new THREE.Vector3(), sum = new THREE.Vector3();
  const heights: number[] = [], depths: number[] = [], sides: number[] = [];
  for (const at of moments) {
    action.time = at * clip.clip.duration;
    mixer.update(0);
    root.updateMatrixWorld(true);
    RESIDENT_JOINTS.forEach((joint, j) => skin[j]!.multiplyMatrices(bones.get(joint)!.matrixWorld, bindInverse[j]!));
    const posed: THREE.Vector3[] = [];
    for (const v of candidates) {
      p.fromBufferAttribute(position, v);
      sum.set(0, 0, 0);
      for (let s = 0; s < 4; s++) {
        const w = data.weights[v * 4 + s]! / 255;
        if (w > 0) sum.addScaledVector(q.copy(p).applyMatrix4(skin[data.joints[v * 4 + s]!]!), w);
      }
      posed.push(sum.clone());
    }
    posed.sort((a, b) => a.y - b.y);
    // The seat: the lowest few centimetres of that surface.
    const low = posed[Math.min(posed.length - 1, Math.floor(posed.length * 0.01))]!.y;
    const patch = posed.filter(point => point.y <= low + 0.03);
    heights.push(low);
    depths.push(patch.reduce((total, point) => total + point.z, 0) / Math.max(1, patch.length));
    sides.push(patch.reduce((total, point) => total + point.x, 0) / Math.max(1, patch.length));
  }
  mixer.uncacheRoot(root);
  heights.sort((a, b) => a - b);
  depths.sort((a, b) => a - b);
  sides.sort((a, b) => a - b);
  return { x: sides[1]!, y: heights[1]!, z: depths[1]! };
}

/* ------------------------------------------------------------------------------------------------ the controller */

export type Build = 'man' | 'woman' | 'neutral';

/** The clips a resident's controller uses, already retargeted onto its rig. */
export type ResidentClips = Map<string, RetargetedClip>;

/** Library clips each kind of resident uses (names in models/npcs/motion/clips.json). */
export const MOTION_CLIPS = {
  walk: { man: 'walk.quick', woman: 'walk.woman', neutral: 'walk.quick' },
  run: 'run.2',
  idle: ['idle.3', 'idle.4', 'idle.6', 'idle.7', 'idle.12'],
  accents: ['idle.look.short', 'idle.look.long', 'idle.clasped', 'idle.stretch'],
  talk: ['talk.chat', 'talk.open', 'talk.right', 'talk.hip', 'talk.agree'],
  sit: { man: 'sit.idle.m', woman: 'sit.idle.f', neutral: 'sit.idle.m' },
  sitTalk: 'sit.talk',
  sitDown: 'sit.down',
  sitUp: 'sit.up',
  work: { writing: 'work.writing', ledger: 'work.ledger', measuring: 'work.measuring', stonework: 'work.stonework', mending: 'work.mending',
    provisioning: 'work.counter', baking: 'work.baking', guard: 'work.guard', general: 'work.collect' } satisfies Record<WorkGesture, string>,
  fight: { light: 'fight.attack', heavy: 'fight.charged', block: 'fight.parry', dodge: 'fight.dodge', hurt: 'fight.hit', dead: 'fight.dead' },
} as const;
/** Where each attack clip has its weapon highest and where the blow lands, as fractions of the clip (read from frames). */
const FIGHT_TIMING: Record<string, { raised: number; impact: number }> = {
  'fight.attack': { raised: 0.3, impact: 0.38 },
  'fight.charged': { raised: 0.35, impact: 0.45 },
};
/**
 * Walks and runs: their pace is measured (from their forward drift, which the game's own movement replaces, or for a
 * clip made in place from how fast the planted foot slides back), so a gait plays at the pace the actor really moves.
 */
export const LOCOMOTION = new Set<string>([...Object.values(MOTION_CLIPS.walk), MOTION_CLIPS.run]);
/** Work done sitting down: the clip sits on a seat of its own, which is matched to the resident's actual seat. */
const SEATED_WORK = new Set<WorkGesture>(['writing']);
/** Clips that sit: their seats are measured on each model (see {@link measureSeat}). */
export const SEATED_CLIPS = new Set<string>([MOTION_CLIPS.sit.man, MOTION_CLIPS.sit.woman, MOTION_CLIPS.sitTalk, MOTION_CLIPS.work.writing]);
/**
 * Where a resident's seat contact rests relative to their place at a bench, metres forward: the bench's middle lies 4 cm
 * behind a seated resident's place (world/layout.ts), and the buttocks rest a little behind it. A resident who stands
 * in front of the seat to sit down (the pose's `seatBack`) has it that much further behind them (A69).
 */
const SEAT_CENTRE = -0.07;
/**
 * The motion library's chairs are about this high (metres). On a higher seat a resident sits further forward, 2.4 times
 * the extra height up to 0.32 m, so the thighs slope down from near its front edge to feet on the floor rather than
 * through the plank, and their feet come down by that extra height to stand on the floor where the clip set them (A69).
 */
const CLIP_SEAT = 0.42, PERCH_PER_METRE = 2.4, PERCH_MOST = 0.32;

const FADE = 0.35, FIGHT_FADE = 0.12, IDLE_TURN = 9;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const _v0 = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _m3 = new THREE.Matrix3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3();
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _turn = new THREE.Quaternion();

/**
 * Two-joint reach in world space (A69): bend the middle joint until the chain's end lies as far from its root as the
 * target, then swing the chain at its root onto the target. The end keeps its world orientation.
 */
function reachTwoJoints(upper: THREE.Bone, lower: THREE.Bone, end: THREE.Bone, target: THREE.Vector3): void {
  const a = upper.getWorldPosition(_a), b = lower.getWorldPosition(_b), c = end.getWorldPosition(_c);
  const first = a.distanceTo(b), second = b.distanceTo(c);
  if (first < 1e-4 || second < 1e-4 || !upper.parent) return;
  const reach = THREE.MathUtils.clamp(target.distanceTo(a), Math.abs(first - second) + 1e-3, first + second - 1e-3);
  const ba = _v2.subVectors(a, b), bc = _v3.subVectors(c, b);
  const bend = ba.angleTo(bc);
  const wanted = Math.acos(THREE.MathUtils.clamp((first * first + second * second - reach * reach) / (2 * first * second), -1, 1));
  const qUpper = upper.getWorldQuaternion(_qa), qLower = lower.getWorldQuaternion(_qb), qEnd = end.getWorldQuaternion(_qc);
  const axis = _n.crossVectors(ba, bc);
  if (axis.lengthSq() > 1e-12) {
    // Turning about ba × bc opens the joint: the end swings away from the root.
    _turn.setFromAxisAngle(axis.normalize(), wanted - bend);
    qLower.premultiply(_turn);
    c.sub(b).applyQuaternion(_turn).add(b);
  }
  _turn.setFromUnitVectors(_v2.subVectors(c, a).normalize(), _v3.subVectors(target, a).normalize());
  qUpper.premultiply(_turn);
  qLower.premultiply(_turn);
  upper.quaternion.copy(upper.parent.getWorldQuaternion(_qp).invert().multiply(qUpper));
  lower.quaternion.copy(_qp.copy(qUpper).invert().multiply(qLower));
  end.quaternion.copy(_qp.copy(qLower).invert().multiply(qEnd));
  upper.updateMatrixWorld(true);
}
const fraction = (v: number) => ((v % 1) + 1) % 1;
const hash = (a: number, b: number) => {
  let h = Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

interface Playing { action: THREE.AnimationAction; clip: RetargetedClip; weight: number; target: number; time: number }

export interface ResidentMotionOptions {
  build: Build;
  /** Who they are: picks their idles and gestures. */
  seed: number;
  /** Bench height when a pose names none, metres. */
  defaultSeat: number;
  /** How far below the hip joint the seat of the trousers lies at rest, metres (measured from the body). */
  seatDepth: number;
  /**
   * A cape or other garment hangs between this figure's arms and body: the clips' arm movement is held this much (0..1)
   * nearer the arms' rest, and the gestures that lift the arms away from the body are left out.
   */
  garmentArms?: number;
  /** The hands' surfaces and the tools' working ends, for bringing them onto a work surface (A70). */
  contacts?: WorkContacts;
}

/** A hand's surface: the vertices that follow it; in its joint's frame, their middle, the way the fingers run and the palm faces (A70). */
export interface HandSurface { vertices: number[]; centre: THREE.Vector3; fingers: THREE.Vector3; palm: THREE.Vector3 }
/** The skinned body whose hand vertices touch, each hand's surface, and the tools' working ends. */
export interface WorkContacts { mesh: THREE.SkinnedMesh; hands: Partial<Record<Hand, HandSurface>>; tools: ToolPoints }
type Hand = 'LeftHand' | 'RightHand';
/** A work clip played alone, sampled in the actor's frame: each wrist, each hand's lowest point and each tool end (A70). */
type ContactTrack = Map<string, THREE.Vector3[]>;
/**
 * Work contacts (A70). A palm rests this far above a counter top; a hand stays on it until the clip lifts it this far
 * (with reduced motion, the lift scaled about the counter); a chisel stays on the face until the clip draws it back this
 * far; a rod's foot always stands on the ground.
 */
const PALM_REST = 0.004, LIFT_OFF = [0.28, 0.4] as const, DRAW_BACK = [0.12, 0.25] as const;
/** A planted rod keeps this much of the clip's lean. */
const ROD_LEAN = 0.3;
/** The hammer's face stops this short of the chisel's struck end (half its head's depth). */
const STRIKE_GAP = 0.012;
/** How far over the face the chisel's edge may wander from where it strikes (metres). */
const FACE_SPAN = 0.05;
const REACH_JOINTS: ResidentJoint[] = ['LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'];
const smooth = (v: number) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

/** The calmer conversation gestures and accents, for figures whose arms carry a garment. */
const CALM_TALK = ['talk.chat', 'talk.listen'];
const CALM_ACCENTS = ['idle.look.short', 'idle.look.long', 'idle.clasped'];
const ARM_JOINTS: ResidentJoint[] = ['LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'];
/**
 * Standing about and talking: baked centred on the actor's spot and turned to the actor's heading (see
 * {@link retargetClip}), so a resident talks to whom they face from where they stand (A69). Work keeps its authored
 * placement at its tools and surfaces, and fights their stances.
 */
export const CENTRED_CLIPS = new Set<string>([...MOTION_CLIPS.idle, ...MOTION_CLIPS.accents, ...MOTION_CLIPS.talk, ...CALM_TALK]);
/**
 * Getting down onto a seat and up off it: each is seated at one end, measured there (fractions of the clip), so the
 * body lands on and leaves the real seat where that clip's own seat lies rather than the seated idle's (A69).
 */
export const SEAT_MOMENTS: Readonly<Record<string, readonly number[]>> = {
  [MOTION_CLIPS.sitDown]: [0.86, 0.89, 0.92],
  [MOTION_CLIPS.sitUp]: [0.02, 0.08, 0.14],
};

/**
 * Plays a resident's clips for the game's poses. The game moves and turns the actor; this only animates the body under
 * it (the hips may move within the body, and a seated figure is lifted or lowered onto the real seat).
 */
export class ResidentMotion {
  readonly mixer: THREE.AnimationMixer;
  private readonly playing = new Map<string, Playing>();
  private current = '';
  private phase = 0;
  private clock = 0;
  private lastMode: Mode | null = null;
  private transition: { name: string; started: number } | null = null;
  private wasSeated = false;
  private deadClock = 0;
  private accent: { name: string; until: number } | null = null;
  /** Where the body stands off the actor's spot this frame: on a seat, each playing clip's own seat over the real one. */
  private readonly seatShift = new THREE.Vector3();
  /** The hip joint's height and depth standing at rest (model metres). */
  private readonly standingHips: number;
  private readonly standingHipsZ: number;
  /** For getting down and up: the hips' height through the clip, standing to seated. */
  private readonly seatCurves = new Map<RetargetedClip, { track: THREE.KeyframeTrack; top: number; bottom: number }>();

  private readonly armRest: Map<ResidentJoint, THREE.Quaternion>;
  /** Each work clip's contact samples (A70). */
  private readonly tracks = new Map<RetargetedClip, ContactTrack>();
  /** The arm joints' clip pose before the last reach, restored before the next (A70). */
  private readonly reached: [ResidentJoint, THREE.Quaternion][] = [];

  constructor(private readonly scene: THREE.Group, private readonly body: THREE.Group, private readonly bones: ResidentBones,
    private readonly clips: ResidentClips, private readonly options: ResidentMotionOptions) {
    this.mixer = new THREE.AnimationMixer(scene);
    this.armRest = new Map(ARM_JOINTS.map(joint => [joint, bones[joint].quaternion.clone()]));
    this.standingHips = bones.Hips.position.y;
    this.standingHipsZ = bones.Hips.position.z;
  }

  /** The clip currently leading the pose, for diagnostics and the lab. */
  get leading(): string { return this.current; }

  /**
   * Seconds from beginning to get up off a seat until the resident stands on their feet: the moment the clip's hips come
   * back to their standing height. The actor waits this long before walking away (A69).
   */
  get standUpSeconds(): number {
    const track = this.clips.get(MOTION_CLIPS.sitUp)?.clip.tracks.find(t => t.name === 'Hips.position');
    if (!track) return 0;
    const height = (frame: number) => track.values[frame * 3 + 1]!, frames = track.times.length;
    let lowest = 0;
    for (let frame = 1; frame < frames; frame++) if (height(frame) < height(lowest)) lowest = frame;
    const standing = height(frames - 1);
    for (let frame = lowest; frame < frames; frame++) if (height(frame) >= standing - 0.03) return track.times[frame]!;
    return track.times[frames - 1]!;
  }

  private use(name: string): Playing | null {
    const clip = this.clips.get(name);
    if (!clip) return null;
    let p = this.playing.get(name);
    if (!p) {
      const action = this.mixer.clipAction(clip.clip);
      action.play(); action.paused = true; action.setEffectiveWeight(0);
      p = { action, clip, weight: 0, target: 0, time: 0 };
      this.playing.set(name, p);
    }
    return p;
  }

  /** Make `name` the leading clip (fading the others out); `restart` begins it from the start. */
  private lead(name: string, restart = false, fade = FADE): Playing | null {
    const p = this.use(name);
    if (!p) return null;
    if (this.current !== name) {
      if (restart) p.time = 0;
      this.current = name;
      for (const [other, q] of this.playing) q.target = other === name ? 1 : 0;
      p.weight = Math.max(p.weight, fade <= 0 ? 1 : 0);
    }
    p.target = 1;
    return p;
  }

  /**
   * How far in front of a seat's place a resident stands to sit down on it, metres: where getting down onto it begins on
   * their feet, so they neither slide to it nor stand inside the bench, and get up again where they stood (A69).
   */
  seatApproach(seatHeight: number): number {
    const down = this.clips.get(MOTION_CLIPS.sitDown), seat = down ? this.seatOf(down) : null;
    const track = down?.clip.tracks.find(t => t.name === 'Hips.position');
    if (!seat || !track) return 0;
    return Math.max(0, track.values[2]! - this.standingHipsZ + SEAT_CENTRE + this.perch(seatHeight) - seat.z);
  }

  /** How much further forward than usual a resident sits on a seat this high (see {@link CLIP_SEAT}). */
  private perch(seatHeight: number): number {
    return Math.min(PERCH_MOST, Math.max(0, (seatHeight - CLIP_SEAT) * PERCH_PER_METRE));
  }

  /** Where a clip's own seat lies (model metres), for a clip that sits or gets down or up; null for one that stands. */
  private seatOf(clip: RetargetedClip): { x: number; y: number; z: number } | null {
    if (clip.seat) return clip.seat;
    if (!SEATED_CLIPS.has(clip.clip.name) && !SEAT_MOMENTS[clip.clip.name]) return null;
    // Unmeasured: the clip's lowest hips less the depth from hip joint to the seat of the trousers.
    return { x: 0, y: this.standingHips - clip.hipsDrop - this.options.seatDepth, z: 0 };
  }

  /** How far down on its seat a clip is at `time`: 1 for a seated clip; getting down or up, 0 standing .. 1 seated (A69). */
  private seatedness(clip: RetargetedClip, time: number): number {
    if (!SEAT_MOMENTS[clip.clip.name]) return 1;
    let curve = this.seatCurves.get(clip);
    if (!curve) {
      const track = clip.clip.tracks.find(t => t.name === 'Hips.position');
      if (!track) return 1;
      let top = -Infinity, bottom = Infinity;
      for (let i = 1; i < track.values.length; i += 3) { top = Math.max(top, track.values[i]!); bottom = Math.min(bottom, track.values[i]!); }
      curve = { track, top, bottom };
      this.seatCurves.set(clip, curve);
    }
    const { times, values } = curve.track, last = times.length - 1;
    const at = Math.min(last, Math.max(0, time / Math.max(1e-6, clip.clip.duration) * last));
    const i = Math.min(last - 1, Math.floor(at)), f = at - i;
    const height = values[i * 3 + 1]! + (values[(i + 1) * 3 + 1]! - values[i * 3 + 1]!) * f;
    return clamp01((curve.top - height) / Math.max(0.05, curve.top - curve.bottom));
  }

  /**
   * On a seat higher or lower than a clip's own, the body is lifted or lowered onto it; the feet stay on the floor where
   * the clip set them, the knees opening or folding to reach (two-joint reach in world space), the soles keeping their
   * angle (A69).
   */
  private plantFeet(lift: number): void {
    const parent = this.body.parent;
    if (!parent || Math.abs(lift) < 0.005) return;
    this.body.updateMatrixWorld(true);
    const down = _v0.set(0, -lift, 0).applyMatrix3(_m3.setFromMatrix4(parent.matrixWorld));
    for (const [upper, lower, end] of [['LeftUpLeg', 'LeftLeg', 'LeftFoot'], ['RightUpLeg', 'RightLeg', 'RightFoot']] as const) {
      reachTwoJoints(this.bones[upper], this.bones[lower], this.bones[end], this.bones[end].getWorldPosition(_v1).add(down));
    }
  }

  pose(p: Pose, dt: number): void {
    // The mixer writes a joint only when its clip value changes: give back the arms' clip pose before reaching anew (A70).
    for (const [joint, q] of this.reached) this.bones[joint].quaternion.copy(q);
    this.reached.length = 0;
    const step = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.25) : 0;
    this.clock += step;
    const mode = p.mode;
    const build = this.options.build;
    const seatHeight = p.seatHeight ?? this.options.defaultSeat;
    let seated = mode === 'sit' || (p.seated === true && (mode === 'talk' || mode === 'idle'));
    let leading: Playing | null = null;
    let fade = FADE;

    if (mode === 'dead') {
      if (this.lastMode !== 'dead') this.deadClock = 0;
      this.deadClock += step;
      leading = this.lead(MOTION_CLIPS.fight.dead, true, FIGHT_FADE);
      if (leading) leading.time = Math.min(this.deadClock, leading.clip.clip.duration);
      fade = FIGHT_FADE;
      seated = false;
    } else if (mode === 'walk' || mode === 'run') {
      const name = mode === 'run' ? MOTION_CLIPS.run : MOTION_CLIPS.walk[build];
      leading = this.lead(name);
      if (leading) {
        const metres = leading.clip.cycleMetres * (this.body.scale.y || 1);
        // Only resolved metres advance the gait: a blocked resident stands rather than walking in place.
        const travel = Number.isFinite(p.travel) ? Math.max(0, p.travel!) : 0;
        if (metres > 0.05) this.phase = fraction(this.phase + travel / metres);
        leading.time = this.phase * leading.clip.clip.duration;
      }
      seated = false;
    } else if (mode === 'telegraph' || mode === 'strike' || mode === 'attack_light' || mode === 'attack_heavy') {
      const heavy = mode === 'attack_heavy';
      leading = this.lead(heavy ? MOTION_CLIPS.fight.heavy : MOTION_CLIPS.fight.light, this.lastMode !== 'telegraph' && this.lastMode !== mode, FIGHT_FADE);
      if (leading) {
        // The game's wind-up plays the clip up to the weapon's highest point; its strike carries the blow home at its
        // middle (when the game deals the damage) and into the follow-through.
        const duration = leading.clip.clip.duration, timing = FIGHT_TIMING[this.current] ?? { raised: 0.32, impact: 0.39 };
        const t = clamp01(p.t);
        leading.time = duration * (mode === 'telegraph' ? t * timing.raised
          : mode === 'strike' ? timing.raised + t * 2 * (timing.impact - timing.raised) : t);
      }
      fade = FIGHT_FADE;
      seated = false;
    } else if (mode === 'hurt' || mode === 'dodge' || mode === 'block') {
      const name = mode === 'hurt' ? MOTION_CLIPS.fight.hurt : mode === 'dodge' ? MOTION_CLIPS.fight.dodge : MOTION_CLIPS.fight.block;
      leading = this.lead(name, this.lastMode !== mode, FIGHT_FADE);
      if (leading) leading.time = mode === 'block' ? Math.min(leading.clip.clip.duration * 0.5, leading.time + step) : clamp01(p.t) * leading.clip.clip.duration;
      fade = FIGHT_FADE;
      seated = false;
    } else if (mode === 'work') {
      const gesture = p.workGesture ?? 'general';
      seated = SEATED_WORK.has(gesture) || p.seated === true;
      leading = this.lead(MOTION_CLIPS.work[gesture]);
      if (leading && p.workSite && this.options.contacts) this.trackOf(leading);
      if (leading) leading.time = fraction((leading.time + step) / leading.clip.clip.duration) * leading.clip.clip.duration;
    } else if (seated) {
      // Sitting down: the transition plays once from a standing pose, then the seated idle or talk.
      if (!this.wasSeated && this.lastMode !== null && this.lastMode !== 'work') this.transition = { name: MOTION_CLIPS.sitDown, started: this.clock };
      const t = this.transition;
      const down = t && t.name === MOTION_CLIPS.sitDown ? this.clips.get(t.name) : null;
      if (down && this.clock - t!.started < down.clip.duration * 0.92) {
        leading = this.lead(t!.name, true);
        if (leading) leading.time = this.clock - t!.started;
      } else {
        this.transition = null;
        leading = this.lead(mode === 'talk' ? MOTION_CLIPS.sitTalk : MOTION_CLIPS.sit[build]);
        if (leading) leading.time = fraction((leading.time + step) / leading.clip.clip.duration) * leading.clip.clip.duration;
      }
    } else {
      // Standing: getting up first if they were sitting.
      if (this.wasSeated && this.clips.has(MOTION_CLIPS.sitUp)) this.transition = { name: MOTION_CLIPS.sitUp, started: this.clock };
      const t = this.transition;
      const up = t && t.name === MOTION_CLIPS.sitUp ? this.clips.get(t.name) : null;
      if (up && this.clock - t!.started < up.clip.duration * 0.85) {
        leading = this.lead(t!.name, true);
        if (leading) leading.time = this.clock - t!.started;
        seated = (this.clock - t!.started) < up.clip.duration * 0.35;
      } else {
        this.transition = null;
        const name = mode === 'talk' ? this.talkClip(p) : this.idleClip(p);
        leading = this.lead(name);
        if (leading) leading.time = fraction((leading.time + step) / leading.clip.clip.duration) * leading.clip.clip.duration;
      }
    }

    // Weights move toward their targets; the leading clip's fade sets the pace.
    const rate = step / Math.max(1e-3, fade);
    for (const [name, q] of this.playing) {
      q.weight = q.target > q.weight ? Math.min(q.target, q.weight + rate) : Math.max(q.target, q.weight - rate);
      if (q.weight <= 1e-3 && q.target === 0) {
        q.action.setEffectiveWeight(0); q.action.enabled = false;
        if (name !== this.current) continue;
      }
      q.action.enabled = true;
      q.action.setEffectiveWeight(q.weight);
      q.action.time = q.time = name === this.current && leading ? leading.time : q.time;
    }
    this.mixer.update(0);
    // A garment between the arms and the body is spared the clips' widest arm movements.
    const damping = this.options.garmentArms ?? 0;
    if (damping > 0) for (const joint of ARM_JOINTS) this.bones[joint].quaternion.slerp(this.armRest.get(joint)!, damping);

    // A seated clip sits on a seat of its own height, depth and place: move the body so its seat rests on the real one.
    // Each playing clip counts as the mixer weighs its pose, so the seat of the trousers stays on the bench while one
    // clip gives way to another, and getting down or up lifts the body only as far as its hips are down (A69).
    const back = Number.isFinite(p.seatBack) ? Math.max(0, p.seatBack!) : 0;
    const perch = this.perch(seatHeight);
    const shift = this.seatShift.set(0, 0, 0);
    let weights = 0;
    for (const q of this.playing.values()) {
      if (q.weight <= 1e-3) continue;
      weights += q.weight;
      const seat = this.seatOf(q.clip);
      if (!seat) continue;
      shift.x -= q.weight * seat.x;
      shift.y += q.weight * this.seatedness(q.clip, q.time) * (seatHeight - seat.y);
      shift.z += q.weight * (SEAT_CENTRE + perch - back - seat.z);
    }
    shift.divideScalar(Math.max(1, weights));
    this.body.position.copy(shift);
    this.body.rotation.set(0, 0, 0);
    this.plantFeet(shift.y);
    if (mode === 'work' && leading && p.workSite && this.options.contacts) this.reachSite(p, p.workGesture ?? 'general', p.workSite, leading);
    this.wasSeated = seated && this.transition?.name !== MOTION_CLIPS.sitUp;
    this.lastMode = mode;
    this.scene.updateMatrixWorld(true);
  }

  /** A contact point of the pose as it stands, in the actor's frame: a wrist, a hand's lowest point or a tool's end (A70). */
  private pointNow(name: string, out = new THREE.Vector3()): THREE.Vector3 {
    const frame = this.body.parent!, contacts = this.options.contacts!;
    if (name === 'LeftHand' || name === 'RightHand') out.setFromMatrixPosition(this.bones[name].matrixWorld);
    else if (name === 'lowL' || name === 'lowR') {
      // The hand's skin as drawn, not as a rigid hand: the wrist's vertices share the forearm's turn.
      const hand = name === 'lowL' ? 'LeftHand' : 'RightHand', surface = contacts.hands[hand], mesh = contacts.mesh;
      mesh.skeleton.update();
      let lowest = Infinity;
      for (const vertex of surface?.vertices ?? []) {
        mesh.localToWorld(mesh.getVertexPosition(vertex, _v0));
        _v1.copy(_v0); frame.worldToLocal(_v1);
        if (_v1.y < lowest) { lowest = _v1.y; out.copy(_v0); }
      }
    } else if (name === 'palmL' || name === 'palmR') {
      const hand = name === 'palmL' ? 'LeftHand' : 'RightHand';
      out.copy(contacts.hands[hand]?.centre ?? _v0.set(0, 0, 0)).applyMatrix4(this.bones[hand].matrixWorld);
    } else {
      const end = contacts.tools[name as keyof ToolPoints];
      if (!end) return out.set(NaN, NaN, NaN);
      end.tool.localToWorld(out.copy(end.point));
    }
    return frame.worldToLocal(out);
  }

  /** The contact points a work clip moves, sampled through the clip played alone (A70). */
  private trackOf(lead: Playing): ContactTrack {
    let track = this.tracks.get(lead.clip);
    if (track) return track;
    track = new Map();
    this.tracks.set(lead.clip, track);
    const names = ['LeftHand', 'RightHand', 'lowL', 'lowR', ...Object.keys(this.options.contacts!.tools)];
    for (const name of names) track.set(name, []);
    const saved = [...this.playing.values()].map(q => ({ q, enabled: q.action.enabled, weight: q.action.getEffectiveWeight(), time: q.action.time }));
    const bodyAt = this.body.position.clone(), bodyTurn = this.body.quaternion.clone();
    for (const q of this.playing.values()) { q.action.enabled = q === lead; q.action.setEffectiveWeight(q === lead ? 1 : 0); }
    this.body.position.set(0, 0, 0); this.body.quaternion.identity();
    const samples = Math.max(2, Math.ceil(lead.clip.clip.duration * 30)), damping = this.options.garmentArms ?? 0;
    for (let i = 0; i < samples; i++) {
      lead.action.time = (i / samples) * lead.clip.clip.duration;
      this.mixer.update(0);
      if (damping > 0) for (const joint of ARM_JOINTS) this.bones[joint].quaternion.slerp(this.armRest.get(joint)!, damping);
      this.body.updateMatrixWorld(true);
      for (const name of names) track.get(name)!.push(this.pointNow(name));
    }
    for (const { q, enabled, weight, time } of saved) { q.action.enabled = enabled; q.action.setEffectiveWeight(weight); q.action.time = time; }
    this.body.position.copy(bodyAt); this.body.quaternion.copy(bodyTurn);
    return track;
  }

  /** A clip sample's contact points at a clip time (nearest sample). */
  private sampleAt(track: ContactTrack, lead: Playing, name: string): THREE.Vector3 {
    const samples = track.get(name)!;
    return samples[Math.round(fraction(lead.time / lead.clip.clip.duration) * samples.length) % samples.length]!;
  }

  /** Turn a hand (world frame) by `turn`, `weight` of the way. */
  private turnHand(hand: Hand, turn: THREE.Quaternion, weight: number): void {
    if (weight <= 1e-4) return;
    const bone = this.bones[hand];
    const now = bone.getWorldQuaternion(_qa), target = _qb.copy(turn).multiply(now);
    now.slerp(target, Math.min(1, weight));
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(_qp).invert().multiply(now));
    bone.updateMatrixWorld(true);
  }

  /** Move a hand's wrist by `delta` (actor frame) with the arm's two joints, the hand keeping its turn. */
  private moveHand(hand: Hand, delta: THREE.Vector3): void {
    if (delta.lengthSq() < 1e-10) return;
    const side = hand === 'LeftHand' ? 'Left' : 'Right';
    const frame = this.body.parent!;
    // Its own vectors: the reach below uses the shared ones.
    const target = this.bones[hand].getWorldPosition(new THREE.Vector3()).add(delta.clone().transformDirection(frame.matrixWorld).multiplyScalar(delta.length()));
    reachTwoJoints(this.bones[`${side}Arm`], this.bones[`${side}ForeArm`], this.bones[hand], target);
  }

  /** A direction in the actor's frame, in the world. */
  private worldDirection(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    return out.set(x, y, z).transformDirection(this.body.parent!.matrixWorld);
  }

  /**
   * Bring the work clip's hands and tools onto the real surface (A70): palms onto the counter top, the chisel's edge onto
   * the quarry face with the hammer's face meeting its struck end where the clip's own blow lands, the rod's foot onto
   * the ground. Everything the clip does away from the surface is kept, moved with it; with reduced motion the clip's
   * movement is scaled about the contact. The work clip's weight fades the reach in and out.
   */
  private reachSite(p: Pose, gesture: WorkGesture, site: WorkSite, lead: Playing): void {
    const weight = lead.weight, contacts = this.options.contacts!, track = this.tracks.get(lead.clip);
    if (weight <= 1e-3 || !track) return;
    const amp = clamp01(p.amp);
    for (const joint of REACH_JOINTS) this.reached.push([joint, this.bones[joint].quaternion.clone()]);
    this.body.updateMatrixWorld(true);
    if (gesture === 'provisioning' && site.kind === 'counter') {
      const top = site.top + PALM_REST;
      for (const [hand, low, palm, inward] of [['LeftHand', 'lowL', 'palmL', -1], ['RightHand', 'lowR', 'palmR', 1]] as const) {
        const surface = contacts.hands[hand];
        if (!surface) continue;
        const rest = Math.min(...track.get(low)!.map(v => v.y));
        // Lifted this far above where the clip rests it; with reduced motion, less.
        const lift = (this.pointNow(low, _a).y - rest) * amp;
        const on = 1 - smooth((lift - LIFT_OFF[0]) / (LIFT_OFF[1] - LIFT_OFF[0]));
        // On the counter the hand lies flat: palm down, fingers ahead and a little inward.
        const fingers = this.worldDirection(inward * 0.2, -0.2, 1, _b).normalize(), down = this.worldDirection(0, -1, 0, _c);
        const local = new THREE.Matrix4().makeBasis(surface.fingers, surface.palm, _n.crossVectors(surface.fingers, surface.palm).normalize());
        down.sub(_v0.copy(fingers).multiplyScalar(down.dot(fingers))).normalize();
        const world = new THREE.Matrix4().makeBasis(fingers, down, _v1.crossVectors(fingers, down));
        const flat = _qc.setFromRotationMatrix(world.multiply(local.transpose()));
        this.turnHand(hand, _turn.copy(flat).multiply(this.bones[hand].getWorldQuaternion(_qp).invert()), on * weight);
        const lowest = this.pointNow(low, _a), centre = this.pointNow(palm, _v3.set(0, 0, 0)).clone();
        const x = THREE.MathUtils.clamp(centre.x, site.x0 + 0.06, site.x1 - 0.06), z = THREE.MathUtils.clamp(centre.z, site.z0 + 0.07, site.z1 - 0.06);
        const raised = lowest.y - rest;
        const y = on * (top - lowest.y) + (1 - on) * (top - rest - (1 - amp) * raised);
        const goal = new THREE.Vector3(centre.x + (x - centre.x) * weight, lowest.y + y * weight, centre.z + (z - centre.z) * weight);
        // The skin at the wrist follows the forearm too: a second reach settles what the first left.
        for (let pass = 0; pass < 3; pass++) {
          const under = this.pointNow(low, _a).y, middle = this.pointNow(palm, _v3);
          this.moveHand(hand, _v0.set(goal.x - middle.x, goal.y - under, goal.z - middle.z));
        }
      }
    } else if (gesture === 'stonework' && site.kind === 'face' && contacts.tools.chiselTip && contacts.tools.chiselButt) {
      const point = _a.fromArray(site.point).clone(), normal = _b.fromArray(site.normal).normalize().clone();
      const tips = track.get('chiselTip')!, butts = track.get('chiselButt')!;
      const reach = Math.max(...tips.map(t => t.z));
      // The clip's blow: where its hammer comes nearest the chisel's end while the chisel is held out.
      let strike = -1, face: 'hammerA' | 'hammerB' = 'hammerA', nearest = Infinity;
      for (const end of ['hammerA', 'hammerB'] as const) {
        const heads = track.get(end);
        if (!heads) continue;
        heads.forEach((head, i) => {
          if (reach - tips[i]!.z > DRAW_BACK[0]) return;
          const d = head.distanceTo(butts[i]!);
          if (d < nearest) { nearest = d; strike = i; face = end; }
        });
      }
      const tip0 = this.pointNow('chiselTip').clone(), butt0 = this.pointNow('chiselButt').clone();
      const head0 = contacts.tools[face] ? this.pointNow(face).clone() : null;
      const tipAtStrike = strike >= 0 ? tips[strike]! : this.sampleAt(track, lead, 'chiselTip');
      const on = 1 - smooth((reach - tip0.z - DRAW_BACK[0]) / (DRAW_BACK[1] - DRAW_BACK[0]));
      // The chisel points into the rock, a little downward.
      const into = this.worldDirection(-normal.x, -normal.y - 0.25, -normal.z, _c).normalize();
      const axis = this.worldDirection(tip0.x - butt0.x, tip0.y - butt0.y, tip0.z - butt0.z, _n).normalize();
      this.turnHand('LeftHand', _turn.setFromUnitVectors(axis, into), on * weight);
      // Its edge on the face where the clip holds it out, the clip's own motion kept (within the face while on it).
      const move = tip0.clone().sub(tipAtStrike).multiplyScalar(amp);
      // Kept to the flat of the face it is set to.
      const across = move.clone().sub(normal.clone().multiplyScalar(move.dot(normal))).clampLength(0, FACE_SPAN);
      const edge = point.clone().add(across.multiplyScalar(on).add(move.multiplyScalar(1 - on)));
      this.moveHand('LeftHand', edge.sub(this.pointNow('chiselTip')).multiplyScalar(weight));
      if (head0 && strike >= 0) {
        // The hammer: the clip's swing relative to the chisel's end, turned so its blow comes along the chisel's axis.
        const butt = this.pointNow('chiselButt').clone(), back = this.pointNow('chiselTip').clone().sub(butt).normalize().negate();
        const atStrike = track.get(face)![strike]!.clone().sub(butts[strike]!);
        const swing = head0.clone().sub(butt0).sub(atStrike).multiplyScalar(amp);
        const turn = new THREE.Quaternion().setFromUnitVectors(atStrike.clone().normalize(), back);
        const worldTurn = new THREE.Quaternion().setFromUnitVectors(this.worldDirection(atStrike.x, atStrike.y, atStrike.z, _v0).normalize(), this.worldDirection(back.x, back.y, back.z, _v1).normalize());
        this.turnHand('RightHand', worldTurn, weight);
        const target = butt.add(back.multiplyScalar(STRIKE_GAP)).add(swing.applyQuaternion(turn));
        this.moveHand('RightHand', target.sub(this.pointNow(face)).multiplyScalar(weight));
        // Square the face to the chisel's end as the blow comes in: the head's axis along the chisel's (A70).
        const other = face === 'hammerA' ? 'hammerB' : 'hammerA';
        if (contacts.tools[other]) {
          const into = this.pointNow('chiselTip').clone().sub(this.pointNow('chiselButt')).normalize();
          const at = this.pointNow(face).clone(), head = at.clone().sub(this.pointNow(other)).normalize();
          const near = smooth(1 - at.distanceTo(this.pointNow('chiselButt')) / 0.3) * weight;
          this.turnHand('RightHand', new THREE.Quaternion().setFromUnitVectors(this.worldDirection(head.x, head.y, head.z, _v0).normalize(),
            this.worldDirection(into.x, into.y, into.z, _v1).normalize()), near);
          this.moveHand('RightHand', at.sub(this.pointNow(face)));
        }
      }
    } else if (gesture === 'measuring' && site.kind === 'ground' && contacts.tools.rodFoot && contacts.tools.rodGrip) {
      // Stood up straighter than the clip leans it, then slid through the fist until its foot stands on the ground.
      const rod = contacts.tools.rodFoot.tool;
      rod.position.set(0, 0, 0);
      rod.updateMatrixWorld(true);
      const foot0 = this.pointNow('rodFoot').clone(), axis = this.pointNow('rodGrip').clone().sub(foot0).normalize();
      // A measuring rod always stands: where the clip swings it nearly flat at its loop, it is stood up all the same (A70).
      const upright = weight;
      const straight = _c.set(axis.x * ROD_LEAN, Math.max(axis.y, 0.5), axis.z * ROD_LEAN).normalize();
      this.turnHand('RightHand', _turn.setFromUnitVectors(this.worldDirection(axis.x, axis.y, axis.z, _a).normalize(), this.worldDirection(straight.x, straight.y, straight.z, _b).normalize()), upright);
      // The hand goes as far as the arm reaches; the rod slides the rest.
      const reached = this.pointNow('rodFoot', _a);
      this.moveHand('RightHand', _v0.set(0, (site.heightAt(reached.x, reached.z) - reached.y) * upright, 0));
      const foot = this.pointNow('rodFoot', _a), grip = this.pointNow('rodGrip', _b);
      const metres = foot.distanceTo(grip) / Math.max(1e-6, contacts.tools.rodFoot.point.distanceTo(contacts.tools.rodGrip.point));
      const along = grip.sub(foot).normalize();
      if (along.y > 0.2) {
        rod.position.y = (site.heightAt(foot.x, foot.z) - foot.y) * upright / along.y / metres;
        rod.updateMatrixWorld(true);
      }
    }
    this.body.updateMatrixWorld(true);
  }

  private idleClip(p: Pose): string {
    const seed = p.idle?.seed ?? this.options.seed;
    const base = MOTION_CLIPS.idle[Math.floor(hash(seed, 7) * MOTION_CLIPS.idle.length)]!;
    if (!p.idle) return base;
    // Every turn a resident may look about, clasp their hands or stretch, then settles back.
    const clock = p.idle.clock;
    if (this.accent && clock < this.accent.until && clock > this.accent.until - 30) return this.accent.name;
    this.accent = null;
    const turn = Math.floor(clock / IDLE_TURN);
    const roll = hash(seed, turn);
    if (roll < 0.34 * Math.min(1, p.amp)) {
      const accents = this.options.garmentArms ? CALM_ACCENTS : MOTION_CLIPS.accents;
      const name = accents[Math.floor(hash(seed + 1, turn) * accents.length)]!;
      const clip = this.clips.get(name);
      if (clip && (name !== 'idle.stretch' || hash(seed + 2, turn) < 0.3)) {
        this.accent = { name, until: clock + Math.min(clip.clip.duration, IDLE_TURN) };
        return name;
      }
    }
    return base;
  }

  private talkClip(p: Pose): string {
    const seed = p.idle?.seed ?? this.options.seed;
    const turn = Math.floor((p.idle?.clock ?? this.clock) / 6);
    const talk: readonly string[] = this.options.garmentArms ? CALM_TALK : MOTION_CLIPS.talk;
    return talk[Math.floor(hash(seed + 3, turn) * talk.length)]!;
  }
}

/** Which library clips must be retargeted for a resident (the rest are not loaded onto its rig). */
export function clipsFor(build: Build, work: WorkGesture | undefined, fighter: boolean): string[] {
  const names = new Set<string>([MOTION_CLIPS.walk[build], ...MOTION_CLIPS.idle, ...MOTION_CLIPS.accents, ...MOTION_CLIPS.talk, ...CALM_TALK,
    MOTION_CLIPS.sit[build], MOTION_CLIPS.sitTalk, MOTION_CLIPS.sitDown, MOTION_CLIPS.sitUp]);
  if (work) names.add(MOTION_CLIPS.work[work]);
  if (fighter) { names.add(MOTION_CLIPS.run); for (const name of Object.values(MOTION_CLIPS.fight)) names.add(name); }
  return [...names];
}

/** Every clip any resident uses: the library ships these and nothing else. */
export function residentClipNames(): string[] {
  const names = new Set<string>(Object.values(MOTION_CLIPS.work));
  for (const build of ['man', 'woman', 'neutral'] as const) for (const name of clipsFor(build, undefined, true)) names.add(name);
  return [...names].sort();
}
