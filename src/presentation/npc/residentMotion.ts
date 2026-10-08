import * as THREE from 'three';
import type { Mode, Pose } from '../characters';
import type { WorkGesture } from '../npcStyle';
import { RESIDENT_JOINTS, type ResidentBones, type ResidentJoint, type ResidentRigData } from './residentRig';

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
  seat?: { y: number; z: number };
  /** For a walk or run: metres the figure covers in one cycle at its natural pace (0 for a clip that stays put). */
  cycleMetres: number;
  /** Lowest point of the hips across the clip relative to rest, metres (how far a sitting clip drops). */
  hipsDrop: number;
  /** Where the hips stand on average (model x, z) — a seated clip's seat lies here. */
  hipsAt: [number, number];
}

/**
 * Bake a library clip onto a target rig. `inPlace` removes a locomotion clip's forward drift (the game moves the actor)
 * and measures the pace it implied; clips made in place are measured from the planted foot instead.
 */
export function retargetClip(clip: THREE.AnimationClip, library: RestPose, target: RestPose, inPlace = false): RetargetedClip {
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
  }
  // The pace a locomotion clip implies: its drift over the clip (removed), or for a clip made in place, how fast the
  // planted foot slides back under the body.
  const drift = rawHips[frames - 1]!.clone().sub(rawHips[0]!);
  drift.y = 0;
  let cycleMetres = 0;
  if (inPlace) cycleMetres = drift.length() * scale;
  let lowest = Infinity, sumX = 0, sumZ = 0;
  for (let f = 0; f < frames; f++) {
    const p = rawHips[f]!.clone();
    if (inPlace) p.addScaledVector(drift, -times[f]! / duration);
    const out = p.sub(sourceHips).multiplyScalar(scale).add(targetHips);
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
 * the hips and thighs carry is skinned on the CPU, and its lowest points give the seat's height and how far forward it
 * lies. Each clip sits on a chair of its own height and depth; the controller moves the body so this seat rests on the
 * resident's actual one.
 */
export function measureSeat(clip: RetargetedClip, rest: RestPose, data: ResidentRigData, position: THREE.BufferAttribute): { y: number; z: number } {
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
  const heights: number[] = [], depths: number[] = [];
  for (const at of [0.3, 0.5, 0.7]) {
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
  }
  mixer.uncacheRoot(root);
  heights.sort((a, b) => a - b);
  depths.sort((a, b) => a - b);
  return { y: heights[1]!, z: depths[1]! };
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
 * Where a resident's seat contact rests relative to where they stand at a bench, metres forward: the bench's middle
 * lies 4 cm behind a seated resident's place (world/layout.ts), and the buttocks rest a little behind it.
 */
const SEAT_CENTRE = -0.07;

const FADE = 0.35, FIGHT_FADE = 0.12, IDLE_TURN = 9;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
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
}

/** The calmer conversation gestures and accents, for figures whose arms carry a garment. */
const CALM_TALK = ['talk.chat', 'talk.listen'];
const CALM_ACCENTS = ['idle.look.short', 'idle.look.long', 'idle.clasped'];
const ARM_JOINTS: ResidentJoint[] = ['LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'];

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
  private seatedBlend = 0;
  private transition: { name: string; started: number } | null = null;
  private wasSeated = false;
  private deadClock = 0;
  private accent: { name: string; until: number } | null = null;
  private readonly lift = new THREE.Vector2();

  private readonly armRest: Map<ResidentJoint, THREE.Quaternion>;

  constructor(private readonly scene: THREE.Group, private readonly body: THREE.Group, private readonly bones: ResidentBones,
    private readonly clips: ResidentClips, private readonly options: ResidentMotionOptions) {
    this.mixer = new THREE.AnimationMixer(scene);
    this.armRest = new Map(ARM_JOINTS.map(joint => [joint, bones[joint].quaternion.clone()]));
  }

  /** The clip currently leading the pose, for diagnostics and the lab. */
  get leading(): string { return this.current; }

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

  /** How far to move the body so a seated clip's own seat rests on a seat `seatHeight` high, centred over the real one. */
  private seatOffset(seatHeight: number, clip: RetargetedClip): { y: number; z: number } {
    if (clip.seat) return { y: seatHeight - clip.seat.y, z: SEAT_CENTRE - clip.seat.z };
    // Unmeasured: the clip's lowest hips less the depth from hip joint to the seat of the trousers.
    const restHips = this.bones.Hips.position.y;
    return { y: seatHeight - (restHips - clip.hipsDrop - this.options.seatDepth), z: 0 };
  }

  pose(p: Pose, dt: number): void {
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

    // A seated clip sits on a seat of its own height and depth: move the body so its seat rests on the real one.
    const sitClip = this.clips.get(MOTION_CLIPS.sit[build]) ?? leading?.clip;
    const seatClip = seated && leading?.clip.seat ? leading.clip : sitClip;
    this.seatedBlend += ((seated ? 1 : 0) - this.seatedBlend) * (1 - Math.exp(-step * 6));
    const lift = seatClip ? this.seatOffset(seatHeight, seatClip) : { y: 0, z: 0 };
    // Easing between seats (a seated idle to seated talk) rather than jumping.
    this.lift.x += (lift.y - this.lift.x) * (1 - Math.exp(-step * 5));
    this.lift.y += (lift.z - this.lift.y) * (1 - Math.exp(-step * 5));
    this.body.position.set(0, this.seatedBlend * this.lift.x, this.seatedBlend * this.lift.y);
    this.body.rotation.set(0, 0, 0);
    this.wasSeated = seated && this.transition?.name !== MOTION_CLIPS.sitUp;
    this.lastMode = mode;
    this.scene.updateMatrixWorld(true);
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
