import type * as THREE from 'three';
import { NativeMotionPlayer } from './native-motion';
import { readNativeResource, type ResourceReceipt } from './resource';

/** Source-backed naming, resource selection, descriptors and isolated clocks.
 * These APIs operate on live property storage supplied by their caller. They
 * do not make serialized NPCs resident or implement the EMFX actor/layer graph.
 * f32 stores are reconstructed in JS; this is not captured x87 equivalence.
 */
export const NATIVE_ANIMATION_MANIFEST: ResourceReceipt = Object.freeze({ bytes: 1315, sha256: '2202ec5dd1e92fa624111866bc0a96e0e5ab6e86b496e3b7a6ba7f458eb6621b' });
const F32 = Math.fround;
const UINT_MAX = 0xffffffff;
type Tables = Record<'actions' | 'phases' | 'poses' | 'aniStates' | 'useTypes' | 'overlays' | 'directions', readonly string[]>;
interface Rules { schema: string; tables: Tables; standardAniFadeTime: number; }
interface Manifest { schema: string; rules: ResourceReceipt & { path: string }; catalog: ResourceReceipt & { path: string };
  heroMotions: ResourceReceipt & { path: string }; rig: ResourceReceipt & { path: string }; }
export interface NativeMotionResource {
  readonly filename: string; readonly alias: string; readonly logicalPath: string;
  readonly archive: string; readonly studyPath: string; readonly bytes: number; readonly sha256: string;
}
interface Catalog { schema: string; resources: NativeMotionResource[]; }
const verifiedDocuments = new WeakSet<object>();
export interface NativeAnimationName {
  skeleton: string; aniState: number; useTypeA: number; useTypeB: number; pose: number;
  action: number; phase: number; overlay: number; direction: number; variation?: number;
  actionString?: string;
}
/** Exact aliases of real gCNPC_PS fields, not a detached actor snapshot. */
export interface NativeAnimationNpc {
  primaryPose: number; // +194
  secondaryPose: number; // +198
  forceNextPose: number; // +1a4 (this getter does not clear it)
}

function integer(value: number, context: string): number {
  if (!Number.isSafeInteger(value)) throw new Error('Invalid native animation integer: ' + context);
  return value;
}
function nonnegative(value: number, context: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid native animation number: ' + context);
  return value;
}
function key(value: string): string {
  if (typeof value !== 'string' || /[^\x20-\x7e]/.test(value)) {
    throw new Error('Native animation ANSI case conversion is unproved for non-ASCII text');
  }
  return value.toUpperCase();
}
function enumText(table: readonly string[], value: number, context: string): string {
  integer(value, context);
  const text = table[value];
  if (text === undefined) throw new Error('Native animation enum outside proven domain: ' + context);
  return text;
}
function portablePath(path: string, prefix: string): string {
  if (!path.startsWith(prefix) || path.includes('..') || path.includes('\\')) throw new Error('Invalid native animation resource path');
  return path.slice('public/gothic3/'.length);
}

/** Game202f8ee0's actual EAX result (the recovered C return type is misleading). */
export function getNativePrimaryPoseExt(npc: NativeAnimationNpc, action: number, phase: number): number {
  integer(action, 'action'); integer(phase, 'phase');
  for (const n of [npc.primaryPose, npc.secondaryPose, npc.forceNextPose]) {
    if (!Number.isInteger(n) || n < 0 || n >= 25) throw new Error('NPC pose lies outside proven native table');
  }
  if (npc.forceNextPose !== 0) {
    npc.primaryPose = npc.forceNextPose; npc.secondaryPose = npc.forceNextPose;
  }
  let pose = 1;
  if ([1, 3, 4, 5, 22, 23, 24, 25].includes(action) && phase === 3) pose = npc.primaryPose;
  else {
    if ([2, 6, 10, 14, 18].includes(npc.primaryPose)) pose = 2;
    else if ([3, 7, 11, 15, 19].includes(npc.primaryPose)) pose = 3;
    else if ([4, 8, 12, 16, 20].includes(npc.primaryPose)) pose = 4;
  }
  if ([1, 2, 3, 4, 5, 13, 14, 15, 22, 23, 24, 25, 119].includes(action) ||
      (action === 53 && (phase === 12 || phase === 15))) return pose;
  if (pose === 3) pose = 1;
  else if (pose === 4) pose = 2;
  npc.primaryPose = pose;
  return pose;
}

/** Script1002f9e0: the name.Contains(Slombat) result is discarded by native code. */
export function fixNativeAniDirection(action: number, phase: number, aniState: number,
    navigationPresent: boolean, direction: number): number {
  [action, phase, aniState, direction].forEach((n) => integer(n, 'direction context'));
  if (typeof navigationPresent !== 'boolean') throw new Error('Navigation presence must be explicit');
  const retain = ([1, 9, 10, 11, 12].includes(action) && phase === 3) ||
    [29, 30, 32, 33, 34, 35, 80, 98].includes(action) || aniState === 10 || (aniState >= 16 && aniState <= 21);
  return navigationPresent && retain && direction >= 2 && direction <= 4 ? direction : 1;
}

/** Resource query's SplitPath30046add, followed by cache305c9680's percent
 * recipe and retained extension. Direct arbitrary file-cache comparisons are
 * not exposed (names without percent compare their complete cache text).
 */
export function nativeMotionAlias(filename: string): string {
  const basename = filename.replace(/\\/g, '/').split('/').at(-1)!;
  const extension = basename.lastIndexOf('.');
  if (extension < 0) return basename.split('%', 1)[0]!;
  return basename.slice(0, extension).split('%', 1)[0]! + basename.slice(extension);
}

export class OriginalAnimationLibrary {
  readonly resources: readonly NativeMotionResource[];
  readonly standardAniFadeTime: number;
  private readonly byAlias = new Map<string, NativeMotionResource[]>();
  private readonly variationMax = new Map<string, number>();
  private readonly missed = new Set<string>();
  constructor(private readonly rules: Rules, catalog: Catalog) {
    if (!verifiedDocuments.has(rules) || !verifiedDocuments.has(catalog)) {
      throw new Error('Original animation library requires hash-verified source documents');
    }
    if (rules.schema !== 'gothic3-native-animation-rules-v1' ||
        catalog.schema !== 'gothic3-native-animation-resource-catalog-v1') throw new Error('Unsupported native animation document');
    const counts = { actions: 138, phases: 28, poses: 25, aniStates: 30, useTypes: 57, overlays: 3, directions: 9 };
    for (const [name, count] of Object.entries(counts)) {
      const table = rules.tables[name as keyof Tables];
      if (!Array.isArray(table) || table.length !== count || table.some((s) => typeof s !== 'string')) {
        throw new Error('Invalid original animation table: ' + name);
      }
      Object.freeze(table);
    }
    Object.freeze(rules.tables); Object.freeze(rules);
    this.standardAniFadeTime = nonnegative(rules.standardAniFadeTime, 'standard fade');
    this.resources = Object.freeze(catalog.resources.map((r) => {
      if (r.alias !== nativeMotionAlias(r.filename) || !Number.isSafeInteger(r.bytes) || r.bytes < 1 ||
          !/^[0-9a-f]{64}$/.test(r.sha256)) throw new Error('Invalid native motion catalog entry');
      const resource = Object.freeze({ ...r });
      const alias = key(r.alias);
      const list = this.byAlias.get(alias) ?? [];
      list.push(resource); this.byAlias.set(alias, list);
      return resource;
    }));
  }
  /** Pure formatting after actual PS getters resolved their live values. */
  name(values: NativeAnimationName): string {
    key(values.skeleton);
    if (!values.skeleton || values.skeleton.includes('_')) throw new Error('Skeleton must be the native first actor word');
    const t = this.rules.tables;
    const variation = integer(values.variation ?? 0, 'variation');
    if (variation < -0x80000000 || variation > 0x7fffffff) throw new Error('Variation exceeds native signed integer');
    const action = values.actionString || enumText(t.actions, values.action, 'action');
    key(action);
    return [values.skeleton, enumText(t.aniStates, values.aniState, 'aniState'),
      enumText(t.useTypes, values.useTypeA, 'useTypeA'), enumText(t.useTypes, values.useTypeB, 'useTypeB'),
      enumText(t.poses, values.pose, 'pose'), action, enumText(t.phases, values.phase, 'phase'),
      enumText(t.overlays, values.overlay, 'overlay'), enumText(t.directions, values.direction, 'direction'),
      variation > 0 ? String(variation).padStart(2, '0') : '00'].join('_') + '_';
  }
  getAni(values: Omit<NativeAnimationName, 'pose' | 'direction'> & {
      npc: NativeAnimationNpc; navigationPresent: boolean; navigationDirection: number }): string {
    // Callers own source-exact PS lookup/owner lifetime. These are actual stores.
    const pose = getNativePrimaryPoseExt(values.npc, values.action, values.phase);
    const direction = fixNativeAniDirection(values.action, values.phase, values.aniState,
      values.navigationPresent, values.navigationDirection);
    return this.name({ ...values, pose, direction });
  }
  query(filename: string): NativeMotionResource | null {
    const choices = this.byAlias.get(key(nativeMotionAlias(filename)));
    if (choices && choices.length > 1) throw new Error('Original duplicate file-cache alias needs native resolution: ' + filename);
    return choices?.[0] ?? null;
  }
  isMissed(filename: string): boolean { return this.missed.has(key(filename)); }
  addMissing(filename: string): void { this.missed.add(key(filename)); }
  setAniVariationMax(filename: string): void {
    const percent = filename.indexOf('%');
    if (percent <= 0) return;
    const prefix = key(filename.slice(0, percent));
    if (this.variationMax.has(prefix)) return;
    const word = filename.split('_')[11] ?? '';
    const number = /^[+-]?\d+/.exec(word);
    this.variationMax.set(prefix, (number ? Number(number[0]) : 0) & 0xff);
  }
  getAniVariation(name: string, crtRand?: () => number): string {
    const maximum = this.variationMax.get(key(name));
    if (maximum === undefined || name.length < 4) return name;
    if (!crtRand) throw new Error('Original animation variation requires shared CRT rand state');
    const random = integer(crtRand(), 'CRT rand');
    if (random < 0 || random > 32767) throw new Error('CRT rand outside original return domain');
    const value = (random % (maximum + 1)) & 0xff;
    // Native switch uses '9' also when tens is greater than eight.
    const digits = String(Math.min(9, Math.trunc(value / 10))) + String(value % 10);
    return name.slice(0, -3) + digits + name.slice(-1);
  }
  /** Game203685b0's ordered variation/original/third-word-None fallback.
   * Resolves catalog identity only. ResourceAdmin cache/refcounts/load callbacks
   * remain required when the caller instantiates a live engine motion resource.
   */
  resolvePlayAni(name: string, crtRand?: () => number): { resource: NativeMotionResource | null; requested: string; attempts: string[] } {
    const attempts: string[] = [];
    let candidate = this.getAniVariation(name, crtRand) + '.xmot';
    for (let stage = 0; stage < 3; stage++) {
      attempts.push(candidate);
      const resource = this.isMissed(candidate) ? null : this.query(candidate);
      if (resource) return { resource, requested: candidate, attempts };
      this.addMissing(candidate);
      if (stage === 0) candidate = name + '.xmot';
      else if (stage === 1) {
        const words = candidate.split('_');
        if (words.length < 3) throw new Error('Native third-word fallback requires a structured animation name');
        words[2] = 'None'; candidate = words.join('_');
      }
    }
    return { resource: null, requested: candidate, attempts };
  }
}

export interface NativeWrapperMotionDescriptor {
  fadeIn: number; mode: 0 | 1 | 2; playSpeed: number; loops: number;
  weight: number; fadeOut: number; blendMode: 1 | 2;
}
export function defaultNativeMotionDescriptor(): NativeWrapperMotionDescriptor {
  return { fadeIn: F32(.3), mode: 0, playSpeed: 1, loops: UINT_MAX, weight: 1, fadeOut: 0, blendMode: 1 };
}
export interface NativePlayAniArguments<E> {
  self: E | null; other: E | null; name: string; duration: number;
  reverseByte: number; playSpeed: number; waitForFadeByte: number; overlayByte: number;
}
function checkPlayAniDuration(duration: number): void {
  integer(duration, 'PlayAni duration');
  if (duration < -0x80000000 || duration > UINT_MAX) throw new Error('PlayAni duration exceeds 32-bit storage');
}
function checkPlayAniArguments<E>(args: NativePlayAniArguments<E>): void {
  checkPlayAniDuration(args.duration);
  for (const byte of [args.reverseByte, args.waitForFadeByte, args.overlayByte]) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new Error('Invalid PlayAni flag byte');
  }
    if (!Number.isFinite(F32(args.playSpeed))) throw new Error('Invalid PlayAni speed');
  key(args.name);
}
export function nativePlayAniDescriptor<E>(args: NativePlayAniArguments<E>, resolvedName = args.name): {
    phaseMode: 0 | 1; motionType: 0 | 4; descriptor: NativeWrapperMotionDescriptor; waitMilliseconds: number } {
  checkPlayAniArguments(args);
  const phaseMode = args.overlayByte === 1 || args.name.includes('_O_') ? 1 : 0;
  let fadeIn = 0, fadeOut = 0;
  if (phaseMode !== 0) {
    if (resolvedName.includes('_Begin_')) {
      if (args.reverseByte !== 0) fadeOut = F32(.1); else fadeIn = F32(.1);
    } else if (resolvedName.includes('_End_')) {
      if (args.reverseByte === 0) fadeOut = F32(.1); else fadeIn = F32(.1);
    }
  }
  return { phaseMode, motionType: phaseMode ? 4 : 0,
    descriptor: { fadeIn, mode: args.reverseByte ? 1 : 0, playSpeed: F32(args.playSpeed),
      loops: (args.duration >>> 0) === 0 ? 2 : UINT_MAX, weight: 1, fadeOut, blendMode: 1 },
    // Native IMUL wraps before unsigned conversion to float.
    waitMilliseconds: F32(Math.imul(args.duration, 1000) >>> 0) };
}

/** These fields must alias the SAME physical SPU used by its scheduler.
 * Constructor/Invalidate defaults for the descriptor, name, cached Visual and
 * completed byte are recovered in the SPU factory. Offsets+158/+15c/+164 remain
 * uninitialized there; their live facade rejects reads until source writes them.
 */
export interface NativePlayAniStorage<V> {
  waitElapsedMilliseconds: number; // +98
  waitDurationMilliseconds: number; // +9c
  completedByte: number; // +94
  activeInstruction: string | null; // +74
  visualAnimation: V | null; // +130
  /** Stable embedded +134..14c field facade. Never a descriptor snapshot. */
  motionDescriptor: NativeEmbeddedMotionDescriptor;
  name: string; // +150
  waitForFadeByte: number | null; // +158 (Invalidate does not initialize it)
  phaseMode: number; // +15c
  phaseFinishedByte: number; // +164
}
export interface NativeEmbeddedMotionDescriptor {
  fadeIn: number | null; // +134 f32
  mode: 0 | 1 | 2 | null; // +138 int32
  playSpeed: number | null; // +13c f32
  loops: number | null; // +140 uint32
  weight: number | null; // +144 f32
  fadeOut: number | null; // +148 f32
  blendMode: 1 | 2 | null; // +14c int32
}
export type NativeAnimationKnown<T> = { known: true; value: T } | { known: false; reason: string };
export interface NativePlayAniHost<E, V, M> {
  /** Source203685b0, including resource refs/fades/layers/descriptor writes.
   * Naming/catalog/descriptor helpers above remove those pure subcall gaps;
   * declaring this known requires the remaining actor/property operations.
   */
  start(args: NativePlayAniArguments<E>, state: NativePlayAniStorage<V>): NativeAnimationKnown<boolean>;
  /** Source2036a1d0, including actor playing checks and Begin state scripts. */
  loop(state: NativePlayAniStorage<V>): NativeAnimationKnown<void>;
  getInstructionEntity(): NativeAnimationKnown<E | null>;
  getNpc(entity: E): NativeAnimationKnown<boolean>;
  getMovement(entity: E): NativeAnimationKnown<M | null>;
  enableMovementFromSPU(movement: M, enable: true): NativeAnimationKnown<void>;
  stopAtLoopEnd(visual: V, motionType: 0 | 4 | 5): NativeAnimationKnown<void>;
  setMotionOwner(visual: V | null, motionType: 0 | 4 | 5, owner: 2 | 7 | 8): NativeAnimationKnown<void>;
  clearEntityPointer(proxy: 'instructionEntity' | 'instructionTarget'): NativeAnimationKnown<void>;
}
export type NativePlayAniResult =
  | { supported: true; nativeReturnValue: 0 | 1; trace: readonly string[] }
  | { supported: false; partial: boolean; reason: string; trace: readonly string[] };

/** Actual sAIPlayAniInstr2036b8f0 continuation/abort/cleanup conductor.
 * Missing/failed native host callbacks retain the applied prefix and block
 * this instance; no automatic replay is allowed after an unknown callback.
 */
export class NativePlayAniInstruction<E, V, M> {
  private active = false;
  private blocked: string | null = null;
  constructor(readonly state: NativePlayAniStorage<V>, private readonly host: NativePlayAniHost<E, V, M>) {}
  invoke(args: NativePlayAniArguments<E> | null, abortByte: number): NativePlayAniResult {
    if (this.active) { this.blocked = 'Reentrant native PlayAni instruction'; return { supported: false, partial: true, reason: this.blocked, trace: [] }; }
    if (this.blocked) return { supported: false, partial: false, reason: this.blocked, trace: [] };
    const trace: string[] = [];
    const s = this.state;
    const check = () => { if (this.blocked) throw new Error(this.blocked); };
    const call = <T>(name: string, callback: () => NativeAnimationKnown<T>): T => {
      // A callback can perform a native prefix before failure, so an attempted
      // boundary always counts as partial and is recorded before invocation.
      trace.push('call:' + name);
      const result = callback(); check();
      if (!result.known) throw new Error(result.reason);
      return result.value;
    };
    const write = <K extends keyof NativePlayAniStorage<V>>(field: K, value: NativePlayAniStorage<V>[K]) => {
      trace.push('write:' + field); s[field] = value; check();
    };
    const motionType = (): 0 | 4 | 5 => s.phaseMode === 1 ? 4 : s.phaseMode === 2 ? 5 : 0;
    this.active = true;
    try {
      if (!Number.isInteger(abortByte) || abortByte < 0 || abortByte > 255) throw new Error('Invalid PlayAni abort byte');
      // The abort branch does not dereference args. With null Self the native
      // non-abort branch reads only duration before proceeding to cleanup.
      if (abortByte !== 1 && args !== null) {
        checkPlayAniDuration(args.duration);
        if (args.self !== null) checkPlayAniArguments(args);
      }
      if (abortByte === 1) {
        const visual = s.visualAnimation;
        if (visual !== null) call('StopAtLoopEnd', () => this.host.stopAtLoopEnd(visual, motionType()));
      } else {
        if (args === null) call('sAIPlayAniItlLoop', () => this.host.loop(s));
        else {
          write('waitElapsedMilliseconds', 0);
          write('waitDurationMilliseconds', F32(Math.imul(args.duration, 1000) >>> 0));
          if (args.self !== null) {
            if (!call('sAIPlayAniStart', () => this.host.start(args, s))) {
              return { supported: true, nativeReturnValue: 1, trace: Object.freeze(trace) };
            }
            write('phaseFinishedByte', 0); write('completedByte', 0);
          } else return this.cleanup(abortByte, trace, call, write, motionType);
        }
        if (!Number.isInteger(s.completedByte) || s.completedByte < 0 || s.completedByte > 255) {
          throw new Error('SPU completed byte was not initialized by actual native lifecycle');
        }
        if (s.completedByte === 0) {
          write('activeInstruction', '2001c76f');
          return { supported: true, nativeReturnValue: 0, trace: Object.freeze(trace) };
        }
      }
      return this.cleanup(abortByte, trace, call, write, motionType);
    } catch (error) {
      this.blocked = String(error instanceof Error ? error.message : error);
      return { supported: false, partial: trace.length > 0, reason: this.blocked, trace: Object.freeze(trace) };
    } finally { this.active = false; }
  }
  private cleanup(abortByte: number, trace: string[],
      call: <T>(name: string, callback: () => NativeAnimationKnown<T>) => T,
      write: <K extends keyof NativePlayAniStorage<V>>(field: K, value: NativePlayAniStorage<V>[K]) => void,
      motionType: () => 0 | 4 | 5): NativePlayAniResult {
    if (call('GetEntity:presence', () => this.host.getInstructionEntity()) !== null) {
      const npcOwner = call('GetEntity:NPC', () => this.host.getInstructionEntity());
      if (npcOwner === null) throw new Error('Native PlayAni NPC dereference lost its live entity');
      if (call('GetPropertySet:0x1e', () => this.host.getNpc(npcOwner))) {
        const movementOwner = call('GetEntity:Movement', () => this.host.getInstructionEntity());
        if (movementOwner === null) throw new Error('Native PlayAni movement dereference lost its live entity');
        const movement = call('GetPropertySet:0x15', () => this.host.getMovement(movementOwner));
        if (movement !== null) call('EnableMovementFromSPU', () => this.host.enableMovementFromSPU(movement, true));
      }
    }
    const type = motionType();
    const owner = type === 0 ? (abortByte === 1 ? 8 : 7) : 2;
    call('SetMotionOwner', () => this.host.setMotionOwner(this.state.visualAnimation, type, owner));
    write('name', ''); write('visualAnimation', null);
    call('instructionEntity.SetEntity(NULL)', () => this.host.clearEntityPointer('instructionEntity'));
    call('instructionTarget.SetEntity(NULL)', () => this.host.clearEntityPointer('instructionTarget'));
    write('activeInstruction', null);
    return { supported: true, nativeReturnValue: 1, trace: Object.freeze(trace) };
  }
}

/** Original EMFX forward time storage (3064c600), isolated from actor layering.
 * Loop count starts at one, wraps strictly after duration and increments once
 * even if a single large delta crosses several periods. StopAtLoopEnd's byte54
 * lock and actor membership check are caller capabilities, not assumed here.
 */
export class NativeForwardMotionClock {
  time = 0; previousDelta = 0; currentLoop = 1; maximumLoops: number; playSpeed: number;
  constructor(readonly duration: number, descriptor: NativeWrapperMotionDescriptor) {
    nonnegative(duration, 'duration');
    if (!Number.isFinite(F32(duration))) throw new Error('Duration exceeds native float storage');
    if (descriptor.mode !== 0) throw new Error('Backward/pingpong native play modes need their own recovered update');
    const loops = integer(descriptor.loops, 'loops');
    if (loops < 0 || (loops > 0x7fffffff && loops !== UINT_MAX)) throw new Error('Unsupported native loop count');
    this.maximumLoops = loops >>> 0;
    this.playSpeed = F32(descriptor.playSpeed);
    if (!Number.isFinite(this.playSpeed)) throw new Error('Invalid forward play speed');
  }
  advance(frameSeconds: number): number {
    nonnegative(frameSeconds, 'motion frame seconds');
    const duration = F32(this.duration) || F32(1e-5);
    const delta = this.playSpeed * frameSeconds;
    let time = this.time + delta;
    if (!Number.isFinite(time)) throw new Error('Native forward time exceeds supported finite domain');
    if (this.maximumLoops === UINT_MAX) {
      if (time > duration) { this.currentLoop = (this.currentLoop + 1) | 0; time %= duration; }
      if (time < 0) time = ((time % duration) + duration) % duration;
    } else {
      if (time > duration) {
        if (this.currentLoop + 1 < this.maximumLoops) { this.currentLoop = (this.currentLoop + 1) | 0; time %= duration; }
        else { this.currentLoop = this.maximumLoops; time = duration; }
      }
      if (time < 0) time = 0;
    }
    this.time = time; this.previousDelta = delta; return time;
  }
  stopAtLoopEnd(validActorMotion: boolean, lockedByte54: number): void {
    if (typeof validActorMotion !== 'boolean' || !Number.isInteger(lockedByte54) || lockedByte54 < 0 || lockedByte54 > 255) {
      throw new Error('StopAtLoopEnd requires actual actor membership and lock byte');
    }
    if (!validActorMotion) throw new Error('Native wrapper discards invalid motion pointer; owner must remove it');
    if ((this.maximumLoops === UINT_MAX || this.currentLoop < this.maximumLoops) && lockedByte54 === 0) {
      this.maximumLoops = (this.currentLoop + 1) >>> 0;
    }
  }
  sample(player: NativeMotionPlayer): void {
    if (player.duration !== this.duration) throw new Error('Clock and actual native clip duration differ');
    player.sampleAt(this.time);
  }
}

export interface NativeLocomotionBlend {
  resource: NativeMotionResource; weight: number; playSpeed: number; velocityCmPerSecond: number;
}
/** Game20211230's speed suffix. Signed decimal/exponent is a bounded GetFloat
 * text profile; malformed/non-finite source strings remain unsupported. */
export function nativeMotionSpeed(filename: string): number {
  const percent = filename.indexOf('%');
  if (percent < 0) return 0;
  const tail = filename.slice(percent);
  const position = tail.indexOf('_', tail.indexOf('_', tail.indexOf('_') + 1) + 1);
  if (position < 0) throw new Error('Native motion speed token missing');
  const match = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(tail.slice(position + 1));
  if (!match) throw new Error('Native motion speed GetFloat profile unsupported');
  return F32(Number(match[0]));
}
/** Source helpers20216730/20216c80. Query must implement actual20211e00 /
 * 20211650 cache and live NPC/Inventory/Routine context; this function does not
 * fabricate cache membership. The caller applies the original diagonal
 * combiner, synchronized layer timing and footstep effects separately. */
export function selectNativeLocomotionAxis(speedCmPerSecond: number, direction: 1 | 2 | 3 | 4,
    query: (phase: 8 | 9 | 10 | 12, direction: 1 | 2 | 3 | 4) => NativeMotionResource | null): NativeLocomotionBlend[] {
  const speed = F32(nonnegative(speedCmPerSecond, 'locomotion speed'));
  if (!Number.isFinite(speed)) throw new Error('Locomotion speed exceeds native float storage');
  if (![1, 2, 3, 4].includes(direction)) throw new Error('Invalid native locomotion direction');
  const walk = query(8, direction);
  if (!walk) return [];
  const walkSpeed = nativeMotionSpeed(walk.filename);
  if (!(walkSpeed > 0)) throw new Error('Native walk resource has unsupported zero/negative speed');
  const part = (resource: NativeMotionResource, weight: number, rate = 1): NativeLocomotionBlend =>
    ({ resource, weight: F32(weight), playSpeed: F32(rate), velocityCmPerSecond: nativeMotionSpeed(resource.filename) });
  const mix = (a: NativeMotionResource, b: NativeMotionResource, value: number): NativeLocomotionBlend[] => {
    const alpha = Math.max(0, Math.min(1, F32(value)));
    return [part(a, F32(1 - alpha)), part(b, alpha)];
  };
  if (speed < walkSpeed) {
    const stand = query(12, 1);
    const alpha = Math.max(0, Math.min(1, F32(speed / walkSpeed)));
    // Preserve native helper slot order: walk first, Stand second. Zero-weight
    // entries also survive because slot identity affects later layer binding.
    return stand ? [part(walk, alpha), part(stand, F32(1 - alpha))] : [part(walk, 1)];
  }
  if (speed === walkSpeed) return [part(walk, 1)];
  const run = query(9, direction);
  if (!run) return [part(walk, 1, speed / walkSpeed)];
  const runSpeed = nativeMotionSpeed(run.filename);
  if (!(runSpeed > walkSpeed)) throw new Error('Native run resource speed outside monotonic helper profile');
  if (speed < runSpeed) return mix(walk, run, (speed - walkSpeed) / (runSpeed - walkSpeed));
  const sprint = query(10, direction);
  if (!sprint) return [part(run, 1, speed / runSpeed)];
  const sprintSpeed = nativeMotionSpeed(sprint.filename);
  if (!(sprintSpeed > runSpeed)) throw new Error('Native sprint speed outside monotonic helper profile');
  if (speed < sprintSpeed) {
    const alpha = Math.max(0, Math.min(1, F32((speed - runSpeed) / (sprintSpeed - runSpeed))));
    return [part(sprint, alpha), part(run, F32(1 - alpha))];
  }
  return [part(sprint, 1, speed / sprintSpeed)];
}

export async function loadOriginalAnimationLibrary(): Promise<{ library: OriginalAnimationLibrary;
    loadHeroPlayer(root: THREE.Group): Promise<NativeMotionPlayer> }> {
  const manifest = await readNativeResource<Manifest>('animation-state/manifest.json', NATIVE_ANIMATION_MANIFEST);
  if (manifest.schema !== 'gothic3-native-animation-state-manifest-v1') throw new Error('Invalid animation manifest');
  const [rules, catalog] = await Promise.all([
    readNativeResource<Rules>(portablePath(manifest.rules.path, 'public/gothic3/animation-state/'), manifest.rules),
    readNativeResource<Catalog>(portablePath(manifest.catalog.path, 'public/gothic3/animation-state/'), manifest.catalog),
  ]);
  verifiedDocuments.add(rules); verifiedDocuments.add(catalog);
  const library = new OriginalAnimationLibrary(rules, catalog);
  return { library, async loadHeroPlayer(root) {
    // Root must be the source Hero cleaned rig in bind pose when constructed;
    // existing Inspector and gameplay must not both write it in one frame.
    const motions = await readNativeResource<unknown>(portablePath(manifest.heroMotions.path,
      'public/gothic3/animation-state/'), manifest.heroMotions, { maximumDecodedBytes: 32 * 1024 * 1024 });
    return new NativeMotionPlayer(root, motions);
  } };
}
