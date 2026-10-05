import * as THREE from 'three';

/** Evidence for the isolated native clip sampler, from the local Engine.dll.
 *
 * MotionPart construction 3064ebd0/3064ecb0 installs the quaternion-specific
 * LinearQuaternionInterpolator, not the generic four-component interpolator.
 * 300f0090 packs raw float q * 32767 by truncation (30672060) into signed shorts.
 * 3064e8d0 decodes shorts using the stored double 3.0518509447574615e-5;
 * 3064e790 shortest-sign component-lerps them. 30663630 blends the motion layer
 * with the underlying/bind layer via 30663190, then 30663330 normalizes q before
 * 30651810 writes the node and 30642aa0 builds its local matrix.
 * 3064fab0 uses the native MotionPart pose for missing P/R/S key channels.
 *
 * This player implements one full-weight clip, with inspector repetition.
 * Original multi-layer masks, fades/additive blends, repositioning passes and
 * frame-effect dispatch belong to their respective game systems. JS float
 * storage steps are rounded to f32; this is not an x87 instruction emulator.
 */
export const NATIVE_MOTION_EVIDENCE = Object.freeze({
  module: 'Engine.dll',
  sha256: 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3',
  packing: '300f0090 -> 30672060: truncate(rawFloat * 32767), signed int16',
  decodeConstantAddress: '30822a80',
  decodeConstantBytes: '000000002000003f',
  rotation: '3064e8d0 -> 3064e790: shortest-sign component lerp',
  normalization: '30663630 -> 30663190 -> 30663330: normalize layer result',
  poseFallback: '3064fab0: native MotionPart pose for absent keys',
  scope: 'one full-weight native clip; original gameplay blending/repositioning/effects are separate',
});

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];
type Channel = 'P' | 'R' | 'S';
interface Track {
  type: Channel;
  times: Float32Array;
  values: Float32Array;
  width: 3 | 4;
}
interface Pose {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}
interface MotionPart {
  name: string;
  pose: Pose;
  tracks: Partial<Record<Channel, Track>>;
}
interface Motion {
  name: string;
  duration: number;
  parts: Map<string, MotionPart>;
}
interface BoneBinding {
  name: string;
  bone: THREE.Object3D;
  bindPosition: THREE.Vector3;
  bindQuaternion: THREE.Quaternion;
  bindScale: THREE.Vector3;
}

const F32 = Math.fround;
// Exact widened float32 constant stored by this local original Engine build.
const SHORT_TO_FLOAT = 3.0518509447574615e-5;

function record(value: unknown, context: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid native motion ' + context);
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) throw new Error('Invalid native motion list: ' + context);
  return value;
}

function text(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error('Invalid native motion name: ' + context);
  return value;
}

function finite(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid native motion number: ' + context);
  return value;
}

function vector(value: unknown, width: 3, context: string): Vec3;
function vector(value: unknown, width: 4, context: string): Quat;
function vector(value: unknown, width: 3 | 4, context: string): Vec3 | Quat {
  const data = list(value, context);
  if (data.length !== width) throw new Error('Invalid native motion vector: ' + context);
  return data.map((v) => finite(v, context)) as Vec3 | Quat;
}

function position(value: Vec3): Vec3 {
  return [value[0] / 100, value[1] / 100, -value[2] / 100];
}

function quaternion(value: Quat): Quat {
  // Native row->column transposition has already cancelled raw conjugation.
  // Reflect Z, without normalizing before original int16 packing.
  return [-value[0], -value[1], value[2], value[3]];
}

function packQuaternion(value: Quat): Quat {
  const decoded = value.map((component) => {
    const packed = Math.trunc(component * 32767);
    if (packed < -32768 || packed > 32767) throw new Error('Native quaternion exceeds signed-short packing range');
    return F32(packed * SHORT_TO_FLOAT);
  }) as Quat;
  return quaternion(decoded);
}

function readPose(value: unknown, context: string): Pose {
  const source = record(value, context);
  const p = vector(source.position, 3, context + '.position');
  const q = vector(source.rotation, 4, context + '.rotation');
  const s = vector(source.scale, 3, context + '.scale');
  const lengthSquared = q.reduce((sum, x) => sum + x * x, 0);
  // Original fallback pose quaternions need not already be unit. The native
  // final motion-layer normalization also applies to them (one source leg pose
  // has squared-length error ~0.0038). Reject degeneracy, not this valid input.
  if (lengthSquared <= 1e-12 || s.some((x) => Math.abs(x - 1) > 1e-4)) {
    throw new Error('Unsupported degenerate/scaled native motion pose: ' + context);
  }
  return { position: position(p), rotation: quaternion(q), scale: s };
}

function readTrack(value: unknown, context: string): Track {
  const source = record(value, context);
  if (source.interpolation !== 'L') throw new Error('Unsupported native interpolation: ' + context);
  if (source.type !== 'P' && source.type !== 'R' && source.type !== 'S') {
    throw new Error('Unknown native motion channel: ' + context);
  }
  const type = source.type;
  const width = type === 'R' ? 4 : 3;
  const keys = list(source.keys, context + '.keys');
  const times = new Float32Array(keys.length);
  const values = new Float32Array(keys.length * width);
  let previous = -Infinity;
  keys.forEach((key, index) => {
    const sourceKey = record(key, context + '.key');
    const time = finite(sourceKey.time, context + '.time');
    if (time < 0 || time <= previous) throw new Error('Invalid native motion key order: ' + context);
    previous = time;
    times[index] = time;
    let v: Vec3 | Quat;
    if (type === 'R') {
      const q = vector(sourceKey.value, 4, context + '.quaternion');
      if (Math.abs(q.reduce((sum, x) => sum + x * x, 0) - 1) > 1e-3) {
        throw new Error('Non-unit native source quaternion: ' + context);
      }
      v = packQuaternion(q);
    } else {
      v = vector(sourceKey.value, 3, context + '.vector');
      if (type === 'P') {
        // Native translation interpolation happens in centimetres; keep raw
        // native values here and convert after the f32 sampling storage step.
      } else if (v.some((x) => Math.abs(x - 1) > 1e-4)) {
        throw new Error('Unsupported non-unit animated scale: ' + context);
      }
    }
    values.set(v, index * width);
  });
  // KeyTrack initialization shifts a positive first timestamp to zero. The
  // currently exported originals start at zero, so no source time is changed.
  if (times.length && times[0] !== 0) throw new Error('Native positive-first-key normalization needs an explicit export profile');
  return { type, times, values, width };
}

function readMotions(raw: unknown): { names: string[]; motions: Map<string, Motion> } {
  const source = record(raw, 'document');
  if (source.version !== 1 || source.nativeUnits !== 'centimetres') throw new Error('Unsupported native motion document');
  const names = list(source.sharedCleanedRig, 'sharedCleanedRig').map((node) => text(record(node, 'rig node').name, 'rig node'));
  if (new Set(names).size !== names.length) throw new Error('Duplicate native rig name');
  const rigNames = new Set(names);
  const motions = new Map<string, Motion>();
  for (const value of list(source.motions, 'motions')) {
    const motion = record(value, 'motion');
    const name = text(motion.name, 'motion');
    if (motions.has(name)) throw new Error('Duplicate native clip: ' + name);
    const decoded = record(motion.decoded, name + '.decoded');
    const audit = record(decoded.audit, name + '.audit');
    const duration = finite(audit.duration, name + '.duration');
    if (duration <= 0) throw new Error('Invalid native motion duration: ' + name);
    const parts = new Map<string, MotionPart>();
    for (const partValue of list(decoded.parts, name + '.parts')) {
      const part = record(partValue, name + '.part');
      const partName = text(part.name, name + '.part');
      // These originals also contain authoring helpers / other actor objects,
      // including deliberately scaled dummies. Their raw metadata is retained;
      // native matching does not attach them to nonexistent Hero nodes.
      if (!rigNames.has(partName)) continue;
      if (parts.has(partName)) throw new Error('Duplicate native motion part: ' + partName);
      const tracks: Partial<Record<Channel, Track>> = {};
      for (const trackValue of list(part.tracks, name + '.' + partName + '.tracks')) {
        const track = readTrack(trackValue, name + '.' + partName);
        if (tracks[track.type]) throw new Error('Duplicate native motion channel: ' + partName);
        if (track.times.length && track.times[track.times.length - 1]! > duration) {
          throw new Error('Native key exceeds clip duration: ' + partName);
        }
        tracks[track.type] = track;
      }
      // The serialized XMOT bindPose fields are evidence only. Original update
      // uses this valid pose fallback; inverse skin binds originate in XACT.
      parts.set(partName, { name: partName, pose: readPose(part.pose, name + '.' + partName), tracks });
    }
    motions.set(name, { name, duration, parts });
  }
  return { names, motions };
}

/** Binary-search original timed keys; native quaternion LINEAR is sign-aware lerp. */
function sample(track: Track, seconds: number, target: Vec3 | Quat): void {
  const { times, values, width } = track;
  if (times.length === 0) throw new Error('Empty keyed native track cannot be sampled');
  let before = 0;
  let after = times.length - 1;
  if (seconds <= times[0]!) after = 0;
  else if (seconds >= times[after]!) before = after;
  else {
    while (after - before > 1) {
      const middle = (before + after) >>> 1;
      if (times[middle]! <= seconds) before = middle;
      else after = middle;
    }
  }
  let alpha = before === after ? 0 : F32((F32(seconds) - times[before]!) / (times[after]! - times[before]!));
  const beta = F32(1 - alpha);
  if (track.type === 'R') {
    let dot = 0;
    for (let k = 0; k < 4; k++) dot += values[before * width + k]! * values[after * width + k]!;
    if (F32(dot) < 0) alpha = -alpha;
  }
  for (let k = 0; k < width; k++) {
    target[k] = F32(values[before * width + k]! * beta + values[after * width + k]! * alpha);
  }
}

function normalizeQuaternion(value: Quat): void {
  // Native 30663330 stores squared length, sqrt, reciprocal, then each output
  // component as float. This deliberately does not slerp.
  const square = F32(value[0] ** 2 + value[1] ** 2 + value[2] ** 2 + value[3] ** 2);
  const length = F32(Math.sqrt(square));
  if (!Number.isFinite(length) || length <= 1e-10) throw new Error('Degenerate native sampled quaternion');
  const reciprocal = F32(1 / length);
  for (let k = 0; k < 4; k++) value[k] = F32(value[k]! * reciprocal);
}

/** One original full-weight clip on an already decoded native Hero skeleton. */
export class NativeMotionPlayer {
  readonly clipNames: readonly string[];
  readonly evidence = NATIVE_MOTION_EVIDENCE;
  playing = false;
  private readonly bindings: BoneBinding[];
  private readonly motions: Map<string, Motion>;
  private selected: Motion | null = null;
  private time = 0;
  private readonly p: Vec3 = [0, 0, 0];
  private readonly q: Quat = [0, 0, 0, 1];
  private readonly s: Vec3 = [1, 1, 1];

  constructor(readonly root: THREE.Group, raw: unknown) {
    const parsed = readMotions(raw);
    this.motions = parsed.motions;
    this.clipNames = Object.freeze([...this.motions.keys()]);
    this.bindings = parsed.names.map((name) => {
      const bone = root.getObjectByName(name);
      if (!(bone instanceof THREE.Bone)) throw new Error('Native animated bone is missing: ' + name);
      return { name, bone, bindPosition: bone.position.clone(), bindQuaternion: bone.quaternion.clone(), bindScale: bone.scale.clone() };
    });
  }

  get clipName(): string | null { return this.selected?.name ?? null; }

  /** Native clip extent. Gameplay owns time, loop-count and stopping policy. */
  get duration(): number | null { return this.selected?.duration ?? null; }

  /** Sample an explicit finite clip time without the inspector's modulo loop.
   * Original sparse channels use their MotionPart pose and keyed channels
   * clamp at their own first/last keys. This does not advance or stop playback.
   */
  sampleAt(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid native animation time');
    if (!this.selected) throw new Error('No native clip selected for explicit sampling');
    this.apply(this.selected, seconds);
  }

  select(name: string | null): void {
    const motion = name === null ? null : this.motions.get(name);
    if (name !== null && !motion) throw new Error('Native clip is missing: ' + name);
    this.selected = motion ?? null;
    this.time = 0;
    this.playing = this.selected !== null;
    this.resetBind();
    if (this.selected) this.apply(this.selected, 0);
  }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid native animation delta');
    if (!this.playing || !this.selected) return;
    this.time = (this.time + seconds) % this.selected.duration;
    this.apply(this.selected, this.time);
  }

  private resetBind(): void {
    for (const { bone, bindPosition, bindQuaternion, bindScale } of this.bindings) {
      bone.position.copy(bindPosition);
      bone.quaternion.copy(bindQuaternion);
      bone.scale.copy(bindScale);
    }
    this.root.updateMatrixWorld(true);
  }

  private apply(motion: Motion, seconds: number): void {
    for (const binding of this.bindings) {
      const part = motion.parts.get(binding.name);
      if (!part) {
        binding.bone.position.copy(binding.bindPosition);
        binding.bone.quaternion.copy(binding.bindQuaternion);
        binding.bone.scale.copy(binding.bindScale);
        continue;
      }
      const pTrack = part.tracks.P;
      if (pTrack?.times.length) {
        sample(pTrack, seconds, this.p);
        this.p[0] /= 100; this.p[1] /= 100; this.p[2] /= -100;
      } else for (let k = 0; k < 3; k++) this.p[k] = part.pose.position[k]!;
      const qTrack = part.tracks.R;
      if (qTrack?.times.length) sample(qTrack, seconds, this.q);
      else for (let k = 0; k < 4; k++) this.q[k] = part.pose.rotation[k]!;
      normalizeQuaternion(this.q);
      const sTrack = part.tracks.S;
      if (sTrack?.times.length) sample(sTrack, seconds, this.s);
      else for (let k = 0; k < 3; k++) this.s[k] = part.pose.scale[k]!;
      binding.bone.position.set(this.p[0], this.p[1], this.p[2]);
      binding.bone.quaternion.set(this.q[0], this.q[1], this.q[2], this.q[3]);
      binding.bone.scale.set(this.s[0], this.s[1], this.s[2]);
    }
    this.root.updateMatrixWorld(true);
  }
}
