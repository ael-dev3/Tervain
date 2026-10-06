/** Original ProcessScript and WAIT, operating on the existing SPU's live state.
 * No native binaries are executed. This module does not invent script bodies,
 * audio effects or a captured native FPU/application state. */
import rulesText from '../../assets/gothic3/instructions/runtime-rules.json?raw';
import { NativeScriptProcessingUnit } from './script-routine';
import type { NativeAIStateFrame, NativeRoutineEntity, NativeRoutineHost, NativeRoutineProperties,
  NativeRoutineResult, NativeSPUSchedulerAccess, NativeSPUSchedulerStorage, NativeSPUState } from './script-routine';

const rules = JSON.parse(rulesText) as { schema: string; gameSha256: string; waitPointer: string;
  epsilon: number; millisecondsPerSecond: number; callbackForceMilliseconds: number };
if (rules.schema !== 'gothic3-native-instructions-rules-v1' ||
    rules.gameSha256 !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.waitPointer !== '2002d3b2' || rules.epsilon !== 9.999999747378752e-06 ||
    rules.millisecondsPerSecond !== 1000 || rules.callbackForceMilliseconds !== 2000) {
  throw new Error('Original SPU instruction receipt differs');
}
export const ORIGINAL_WAIT_POINTER = '2002d3b2';
export type NativeSPUPrecision = 24 | 53 | 64;
export interface NativeSPUArithmeticProfile {
  precisionBits: NativeSPUPrecision;
  rounding: 'nearest-even';
  capturedNativeEnvironment: false;
}
export interface NativeWaitDescriptor {
  /** Original descriptor entity proxy +78; distinct from Self/Other/Target. */
  entity: string | null;
  milliseconds: number;
}
export interface NativeSPUFrameCounters {
  timestamp: number; calledTask: number; calledState: number;
  maxTask: number; maxState: number; currentTask: number; currentState: number;
}
const isU32 = (v: number): boolean => Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
const isByte = (v: number): boolean => Number.isInteger(v) && v >= 0 && v <= 255;
const storedFloat = (v: number): boolean => Number.isFinite(v) && Object.is(v, Math.fround(v));

/** Shared static counters across all SPUs, not one budget per actor. */
export class NativeSPUFrameSchedule {
  private values: NativeSPUFrameCounters;
  private epoch = 0;
  constructor(seed: NativeSPUFrameCounters) {
    if (!seed || Object.keys(seed).sort().join(',') !== 'calledState,calledTask,currentState,currentTask,maxState,maxTask,timestamp' ||
        !Object.values(seed).every(isU32)) throw new Error('Explicit native frame-counter state is required');
    this.values = { ...seed };
  }
  /** PE loader zero-fill state, before the first sSetNewFrame, not a live capture. */
  static fromOriginalLoader(): NativeSPUFrameSchedule {
    return new NativeSPUFrameSchedule({ timestamp: 0, calledTask: 0, calledState: 0,
      maxTask: 0, maxState: 0, currentTask: 0, currentState: 0 });
  }
  snapshot(): Readonly<NativeSPUFrameCounters> & { revision: number } { return { ...this.values, revision: this.epoch }; }
  /** 20367a80: unsigned division by 20, then source-ordered resets. */
  newFrame(timestamp: number): void {
    if (!isU32(timestamp)) throw new Error('Native frame timestamp must be uint32');
    this.values.timestamp = timestamp;
    this.values.maxTask = (Math.floor(this.values.currentTask / 20) + 1) >>> 0;
    this.values.calledTask = 0; this.values.calledState = 0;
    this.values.maxState = this.values.currentState;
    this.values.currentTask = 0; this.values.currentState = 0; this.epoch++;
  }
  /** Scheduler-owned source ADD operations, retaining unsigned wrap. */
  increment(key: 'calledTask' | 'currentTask' | 'currentState', access: NativeSPUSchedulerAccess,
    spu: NativeScriptProcessingUnit): void {
    if (!['calledTask', 'currentTask', 'currentState'].includes(key) || !spu.ownsSchedulerAccess(access)) {
      throw new Error('Invalid, expired or cross-instance global counter capability');
    }
    access.snapshot(); // Reject a blocked scope before mutating the shared counters.
    this.values[key] = (this.values[key] + 1) >>> 0; this.epoch++;
    access.record({ operation: 'global-' + key, value: this.values[key] });
  }
}

interface Binary { coefficient: bigint; exponent: number; negativeZero?: boolean }
const view = new DataView(new ArrayBuffer(8));
function binary(value: number): Binary {
  if (!Number.isFinite(value)) throw new Error('Nonfinite x87 exception domain is unsupported');
  view.setFloat64(0, value, true); const bits = view.getBigUint64(0, true);
  const exponent = Number((bits >> 52n) & 0x7ffn), sign = (bits >> 63n) !== 0n;
  const fraction = bits & ((1n << 52n) - 1n), c = exponent ? (1n << 52n) | fraction : fraction;
  return { coefficient: sign ? -c : c, exponent: exponent ? exponent - 1075 : -1074,
    negativeZero: c === 0n && sign };
}
const abs = (v: bigint): bigint => v < 0n ? -v : v;
const length = (v: bigint): number => v === 0n ? 0 : v.toString(2).length;
function quotient(n: bigint, d: bigint): bigint {
  const q = n / d, r = (n % d) * 2n;
  return r > d || (r === d && (q & 1n) === 1n) ? q + 1n : q;
}
function round(v: Binary, p: number, minimumExponent = -20000): Binary {
  if (v.coefficient === 0n) return v;
  const a = abs(v.coefficient), shift = Math.max(0, length(a) - p, minimumExponent - v.exponent);
  const c = shift ? quotient(a, 1n << BigInt(shift)) : a;
  return { coefficient: v.coefficient < 0n ? -c : c, exponent: v.exponent + shift,
    negativeZero: c === 0n && v.coefficient < 0n };
}
function add(a: Binary, b: Binary, p: NativeSPUPrecision): Binary {
  const e = Math.min(a.exponent, b.exponent);
  const c = (a.coefficient << BigInt(a.exponent - e)) + (b.coefficient << BigInt(b.exponent - e));
  return round({ coefficient: c, exponent: e,
    negativeZero: c === 0n && a.negativeZero === true && b.negativeZero === true }, p);
}
function multiply(a: Binary, b: Binary, p: NativeSPUPrecision): Binary {
  const c = a.coefficient * b.coefficient;
  return round({ coefficient: c, exponent: a.exponent + b.exponent,
    negativeZero: c === 0n && ((a.coefficient < 0n || a.negativeZero === true) !== (b.coefficient < 0n || b.negativeZero === true)) }, p);
}
function divide(a: Binary, b: Binary, p: NativeSPUPrecision): Binary {
  if (b.coefficient === 0n) throw new Error('Native division by zero is unsupported');
  if (a.coefficient === 0n) return { coefficient: 0n, exponent: 0, negativeZero: a.negativeZero };
  const n = abs(a.coefficient), d = abs(b.coefficient);
  let logarithm = length(n) - length(d);
  if (logarithm >= 0 ? n < (d << BigInt(logarithm)) : (n << BigInt(-logarithm)) < d) logarithm--;
  const shift = p - 1 - logarithm;
  const c = shift >= 0 ? quotient(n << BigInt(shift), d) : quotient(n, d << BigInt(-shift));
  return { coefficient: (a.coefficient < 0n) !== (b.coefficient < 0n) ? -c : c,
    exponent: a.exponent - b.exponent - shift };
}
function f32(v: Binary): number {
  const r = round(v, 24, -149);
  if (r.coefficient === 0n) return r.negativeZero ? -0 : 0;
  const result = Math.fround(Number(r.coefficient) * 2 ** r.exponent);
  if (!Number.isFinite(result)) throw new Error('Native float32 overflow is outside the supported finite profile');
  return result;
}

export interface NativeProxyEntitySeed {
  entity: string;
  /** All 20 original GetID bytes as lowercase hex; assignment copies the
   * first16 and resets the trailing DWORD. */
  nativeId: string;
  /** Null: no lazily created internal. Otherwise includes the live owner's reference and all proxy references. */
  references: number | null;
}
interface ProxySlot { nativeId: string | 'unknown'; entity: string | null }
/** Concrete bounded port of SetEntity/Query/AddReference/Release. It models
 * native IDs and reference lifetimes; no heap addresses are invented. Entity
 * destruction, reference-count overflow and unknown external references are
 * outside this explicitly selected live-owner registry profile. */
export class NativeInstructionProxyRegistry {
  readonly profile = 'complete-known-references-live-entity-owners' as const;
  private entities = new Map<string, NativeProxyEntitySeed>();
  private bindings = new Map<NativeScriptProcessingUnit, Record<'instructionEntity' | 'instructionTarget', ProxySlot>>();
  constructor(entities: readonly NativeProxyEntitySeed[]) {
    for (const entity of entities) {
      if (typeof entity.entity !== 'string' || !/^[0-9a-f]{40}$/.test(entity.nativeId) ||
          this.entities.has(entity.entity) || [...this.entities.values()].some(e => e.nativeId.slice(0, 32) === entity.nativeId.slice(0, 32)) ||
          (entity.references !== null && (!isU32(entity.references) || entity.references < 1))) throw new Error('Invalid complete native proxy registry seed');
      this.entities.set(entity.entity, { ...entity });
    }
  }
  snapshot(): readonly Readonly<NativeProxyEntitySeed>[] { return [...this.entities.values()].map(e => ({ ...e })); }
  proxySnapshot(spu: NativeScriptProcessingUnit): Readonly<Record<'instructionEntity' | 'instructionTarget', Readonly<ProxySlot>>> | null {
    const slots = this.bindings.get(spu); return slots ? structuredClone(slots) : null;
  }
  private binding(spu: NativeScriptProcessingUnit, seed: NativeSPUSchedulerStorage): Record<'instructionEntity' | 'instructionTarget', ProxySlot> {
    if (this.bindings.has(spu)) throw new Error('Instruction proxies are already bound');
    const slots = {} as Record<'instructionEntity' | 'instructionTarget', ProxySlot>;
    for (const key of ['instructionEntity', 'instructionTarget'] as const) {
      const id = seed[key], entity = id === null ? null : this.entities.get(id);
      if (id !== null && (!entity || entity.references === null)) throw new Error('Existing instruction proxy lacks proven identity/reference state');
      // A source supplied live internal identifies the entity, but does not
      // establish the proxy ID's trailing cache DWORD. Retain that unknown.
      slots[key] = { nativeId: id === null ? '0000000000000000000000000000000000000000' : 'unknown', entity: id };
    }
    const held = new Map<string, number>();
    for (const b of [...this.bindings.values(), slots]) for (const s of Object.values(b)) if (s.entity !== null) held.set(s.entity, (held.get(s.entity) ?? 0) + 1);
    for (const [id, count] of held) if (this.entities.get(id)!.references! < count + 1) throw new Error('Proxy seed omits its live entity-owner reference');
    return slots;
  }
  validateBinding(spu: NativeScriptProcessingUnit, seed: NativeSPUSchedulerStorage): void {
    this.binding(spu, seed);
  }
  bind(spu: NativeScriptProcessingUnit, seed: NativeSPUSchedulerStorage): void {
    this.bindings.set(spu, this.binding(spu, seed));
  }
  /** Bounded GetEntity/Query profile: every nonnull slot already owns a live
   * internal reference; every null slot has the source zero PropertyID. No
   * missing EntityAdmin lookup or lazy nonzero-ID resolution is simulated. */
  get(spu: NativeScriptProcessingUnit, key: 'instructionEntity' | 'instructionTarget',
    access: NativeSPUSchedulerAccess): string | null {
    if (!spu.ownsSchedulerAccess(access)) throw new Error('Expired or cross-instance native proxy capability');
    const slot = this.bindings.get(spu)?.[key];
    if (!slot || slot.entity !== access.storage()[key]) throw new Error('Instruction proxy reference binding differs');
    if (slot.entity !== null) {
      const entity = this.entities.get(slot.entity);
      if (!entity || entity.references === null || entity.references < 2) throw new Error('Instruction proxy lacks a live retained internal');
    } else if (slot.nativeId !== '0000000000000000000000000000000000000000') {
      throw new Error('Lazy nonzero PropertyID resolution requires actual EntityAdmin');
    }
    return slot.entity;
  }
  set(spu: NativeScriptProcessingUnit, key: 'instructionEntity' | 'instructionTarget', id: string | null,
    access: NativeSPUSchedulerAccess): void {
    if (!spu.ownsSchedulerAccess(access)) throw new Error('Expired or cross-instance native proxy capability');
    const slot = this.bindings.get(spu)?.[key];
    if (!slot || slot.entity !== access.storage()[key]) throw new Error('Instruction proxy reference binding differs');
    const entity = id === null ? null : this.entities.get(id);
    if (id !== null && !entity) throw new Error('WAIT descriptor entity has no source identity');
    // Nonnull SetEntity copies the new ID before releasing the old internal.
    if (entity) {
      slot.nativeId = entity.nativeId.slice(0, 32) + '00000000';
      access.record({ operation: key + '-copy-id', value: slot.nativeId });
    }
    if (slot.entity !== null) {
      const old = this.entities.get(slot.entity)!;
      if (old.references === null || old.references <= 1) throw new Error('Proxy deletion/entity lifetime is outside the live-owner profile');
      old.references--; access.record({ operation: key + '-release-reference', entity: old.entity, value: old.references });
    }
    slot.entity = null; access.writeStorage(key, null);
    if (entity) {
      if (entity.references === null) {
        entity.references = 1; access.record({ operation: 'create-entity-proxy-internal', entity: entity.entity, value: 1 });
      }
      if (entity.references === 0xffffffff) throw new Error('Native proxy reference overflow is outside the live-owner profile');
      entity.references = (entity.references + 1) >>> 0;
      access.record({ operation: key + '-add-reference', entity: entity.entity, value: entity.references });
      slot.entity = entity.entity; access.writeStorage(key, entity.entity);
    } else {
      slot.nativeId = '0000000000000000000000000000000000000000';
      access.record({ operation: key + '-destroy-id', value: slot.nativeId });
    }
  }
}

export interface NativeScriptBody {
  /** Evidence identifies the compiled body being ported; unknown registration is never success. */
  source: { moduleSha256: string; entry: string };
  invoke(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): number;
}
export interface NativeInstructionBody {
  source: NativeScriptBody['source'];
  invoke(argument: null, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess, abort: boolean): number;
}
export interface NativeInstructionHost {
  /** Original EntityAdmin.IsProcessingEnabled, distinct from application +270. */
  entityProcessingEnabled?: () => boolean;
  script?: (kind: 'state' | 'function' | 'callback', name: string) => NativeScriptBody | null;
  instruction?: (pointer: string) => NativeInstructionBody | null;
  updateNonNullAudioChannel?: NativeScriptBody;
}
export interface NativeApplicationFrame {
  /** Original virtual application+270 result; selected browser policy is explicit. */
  processingEnabled: boolean;
  /** Engine30063340 loads this stored float32 directly. No dt clamp is added. */
  scaledSeconds: number;
}
function succeeded(result: NativeRoutineResult): void { if (!result.supported) throw new Error(result.reason); }
function bodyReturn(body: NativeScriptBody, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): number {
  if (!spu.ownsSchedulerAccess(access)) throw new Error('Expired or cross-instance native script capability');
  if (!/^[0-9a-f]{64}$/.test(body.source.moduleSha256) || !/^[0-9a-f]{8}$/.test(body.source.entry)) throw new Error('Unidentified native script body');
  const value = body.invoke(spu, access);
  if (!isByte(value)) throw new Error('Native script handler must return its AL byte');
  return value;
}

/** Useful scheduler: original WAIT runs, timers advance, callbacks are budgeted,
 * and source-registered frame handlers execute. Missing handlers retain the
 * already-applied ordered prefix and block this SPU rather than simulate it. */
export class NativeInstructionScheduler {
  readonly arithmetic: Readonly<NativeSPUArithmeticProfile>;
  private processing = false;
  constructor(readonly spu: NativeScriptProcessingUnit, storage: NativeSPUSchedulerStorage,
    readonly frames: NativeSPUFrameSchedule, arithmetic: NativeSPUArithmeticProfile,
    private readonly proxies: NativeInstructionProxyRegistry, private readonly host: NativeInstructionHost = {}) {
    if (![24, 53, 64].includes(arithmetic.precisionBits) || arithmetic.rounding !== 'nearest-even' ||
        arithmetic.capturedNativeEnvironment !== false) throw new Error('Explicit finite x87 precision profile is required');
    this.arithmetic = Object.freeze({ precisionBits: arithmetic.precisionBits,
      rounding: arithmetic.rounding, capturedNativeEnvironment: arithmetic.capturedNativeEnvironment });
    const state = spu.snapshot();
    if (spu.schedulerSnapshot() !== null || spu.failure() !== null ||
        ![state.taskMilliseconds, state.stateMilliseconds, ...state.frames.map(f => f.timeMilliseconds)].every(storedFloat)) {
      throw new Error('Scheduler requires an unbound usable SPU with stored native float32 fields');
    }
    proxies.validateBinding(spu, storage);
    succeeded(spu.initializeScheduler(storage)); proxies.bind(spu, storage);
  }
  /** Ordinary constructor/Invalidate defaults, not a loaded savegame. Self is
   * initially None; caller must bind a real owner before the daily-routine path. */
  static fromOriginalFactory(routineHost: NativeRoutineHost, frames: NativeSPUFrameSchedule,
    arithmetic: NativeSPUArithmeticProfile, proxies: NativeInstructionProxyRegistry,
    host: NativeInstructionHost = {}): NativeInstructionScheduler {
    const frame = (): NativeAIStateFrame => ({ position: 0, script: '', begin: true,
      object: null, callback: '', timeMilliseconds: 1000 });
    const seed: NativeSPUState = { self: null, frames: Array.from({ length: 5 }, frame), frameCount: 1,
      task: '', localCallback: '', taskMilliseconds: 0, stateMilliseconds: 0,
      detectingTask: false, detectedTask: '', activeInstruction: null };
    const scheduler = new NativeInstructionScheduler(new NativeScriptProcessingUnit(seed, routineHost), {
      waitElapsedMilliseconds: 0, waitDurationMilliseconds: null, instructionEntity: null,
      instructionTarget: null, taskCallbackMilliseconds: null, localCallbackMilliseconds: null,
      localTimeScale: 1, lastFrameTimestamp: 0, audioChannel: null,
    }, frames, arithmetic, proxies, host);
    // Actual2036c270 constructor descriptor stores and2036bf90 Invalidate.
    // +158/+15c/+164 are not initialized by either recovered body.
    succeeded(scheduler.spu.initializeAnimation({ completedByte: 0, visualAnimation: null, name: '',
      waitForFadeByte: null, phaseMode: null, phaseFinishedByte: null,
      motionDescriptor: { fadeIn: Math.fround(.3), mode: 0, playSpeed: 1,
        loops: 0xffffffff, weight: 1, fadeOut: 0, blendMode: 1 } }));
    return scheduler;
  }
  wait(argument: NativeWaitDescriptor | null, abort = false): NativeRoutineResult {
    return this.spu.dispatchScheduler(access => this.waitInternal(access, argument, abort));
  }
  /** Source-supported adapter for the existing FullStop/AIStopWait dispatch. */
  abortHandler(pointer: string): ((argument: null, spu: NativeScriptProcessingUnit, abort: true) => boolean) | null {
    if (pointer !== ORIGINAL_WAIT_POINTER) return null;
    return (_argument, spu, abort) => {
      if (spu !== this.spu || abort !== true) throw new Error('WAIT abort adapter belongs to another SPU');
      const result = this.wait(null, true); succeeded(result);
      return result.supported && result.nativeReturnValue === 1;
    };
  }
  setLocalTimeScale(value: number): NativeRoutineResult {
    return this.spu.dispatchScheduler(access => { access.writeStorage('localTimeScale', f32(binary(value))); return null; });
  }
  /** null represents the native null-storage CString sentinel. An allocated
   * empty CString is represented by '', and still initializes the timer. */
  setTaskCallback(name: string | null): NativeRoutineResult {
    return this.spu.dispatchScheduler(access => {
      if (name !== null && typeof name !== 'string') throw new Error('Invalid task callback');
      access.writeTaskCallback(name ?? '');
      if (name !== null) access.writeStorage('taskCallbackMilliseconds', 1000);
      return null;
    });
  }
  setLocalCallback(name: string | null): NativeRoutineResult {
    return this.spu.dispatchScheduler(access => {
      if (name !== null && typeof name !== 'string') throw new Error('Invalid local callback');
      access.writeFrame(this.top(access).index, 'callback', name ?? '');
      if (name !== null) access.writeStorage('localCallbackMilliseconds', 100);
      return null;
    });
  }
  private waitInternal(access: NativeSPUSchedulerAccess, argument: NativeWaitDescriptor | null, abort: boolean): 0 | 1 {
    if (typeof abort !== 'boolean') throw new Error('WAIT abort requires the selected native 0/1 boolean profile');
    const p = this.arithmetic.precisionBits;
    if (!abort && argument !== null) {
      if (!isU32(argument.milliseconds) || (argument.entity !== null && typeof argument.entity !== 'string')) throw new Error('WAIT needs the original entity/u32-millisecond descriptor');
      access.writeStorage('waitElapsedMilliseconds', 0);
      const signed = argument.milliseconds | 0;
      const duration = signed < 0 ? add(binary(signed), binary(4294967296), p) : binary(signed);
      access.writeStorage('waitDurationMilliseconds', f32(duration));
      this.proxies.set(this.spu, 'instructionEntity', argument.entity, access);
    }
    if (!abort) {
      const storage = access.storage();
      if (storage.waitDurationMilliseconds === null) throw new Error('WAIT target bytes were not initialized by a descriptor');
      if (storage.waitDurationMilliseconds > storage.waitElapsedMilliseconds) {
        succeeded(this.spu.setActiveInstruction(ORIGINAL_WAIT_POINTER)); return 0;
      }
    }
    this.proxies.set(this.spu, 'instructionEntity', null, access);
    this.proxies.set(this.spu, 'instructionTarget', null, access);
    succeeded(this.spu.setActiveInstruction(null)); return 1;
  }
  private top(access: NativeSPUSchedulerAccess): { index: number; frame: NativeAIStateFrame } {
    const state = access.snapshot(), index = state.frameCount - 1, frame = state.frames[index];
    if (index < 0 || !frame) throw new Error('Native top-frame read is outside allocated live state');
    return { index, frame };
  }
  private script(kind: 'state' | 'function' | 'callback', name: string, access: NativeSPUSchedulerAccess): number {
    if (!this.host.entityProcessingEnabled) throw new Error('EntityAdmin processing gate is unresolved');
    const enabled = this.host.entityProcessingEnabled();
    if (typeof enabled !== 'boolean') throw new Error('Invalid EntityAdmin processing result');
    if (!enabled) return 0;
    const body = this.host.script?.(kind, name);
    if (!body) throw new Error('Compiled ' + kind + ' handler is unresolved: ' + name);
    access.record({ operation: 'script-' + kind, value: name });
    const result = bodyReturn(body, this.spu, access);
    if (kind === 'function') {
      if (result === 1) { access.removeFrame(access.snapshot().frameCount - 1); return 1; }
      return 0;
    }
    return result;
  }
  private localCallback(access: NativeSPUSchedulerAccess): void {
    const name = this.top(access).frame.callback;
    if (name !== '') { this.script('callback', name, access); this.frames.increment('currentState', access, this.spu); }
  }
  private taskCallback(access: NativeSPUSchedulerAccess, entity: NativeRoutineEntity | null, properties: NativeRoutineProperties | null): void {
    const state = access.snapshot(); if (state.localCallback === '') return;
    const elapsed = access.storage().taskCallbackMilliseconds;
    if (elapsed === null) throw new Error('Task callback timer was not initialized by its setter/read');
    const counters = this.frames.snapshot();
    if (elapsed >= 1000 && (counters.maxTask > counters.calledTask || elapsed >= 2000)) {
      this.script('callback', state.localCallback, access);
      access.writeStorage('taskCallbackMilliseconds', 0);
      this.frames.increment('calledTask', access, this.spu); this.frames.increment('currentTask', access, this.spu); return;
    }
    // The accumulation branch dereferences the captured PS, with no null guard.
    if (!entity || !properties || !storedFloat(properties.TaskTime)) throw new Error('Task callback accumulation needs its captured ScriptRoutine PS/TaskTime');
    const p = this.arithmetic.precisionBits;
    const previousMs = multiply(binary(properties.TaskTime), binary(1000), p);
    const difference = add(binary(access.snapshot().taskMilliseconds), { ...previousMs, coefficient: -previousMs.coefficient,
      negativeZero: previousMs.coefficient === 0n && previousMs.negativeZero !== true }, p);
    access.writeStorage('taskCallbackMilliseconds', f32(add(difference, binary(elapsed), p)));
    this.frames.increment('currentTask', access, this.spu);
  }
  private updateTimes(access: NativeSPUSchedulerAccess, entity: NativeRoutineEntity | null, properties: NativeRoutineProperties | null): void {
    if (!entity || !properties) return;
    // FDIV(1000) and float32 store occur before each EnterEx. StateTime is
    // read only after the complete TaskTime notification chain.
    const task = f32(divide(binary(access.snapshot().taskMilliseconds), binary(1000), this.arithmetic.precisionBits));
    access.writeProperty(entity, properties, 'TaskTime', task);
    const state = f32(divide(binary(access.snapshot().stateMilliseconds), binary(1000), this.arithmetic.precisionBits));
    access.writeProperty(entity, properties, 'StateTime', state);
  }
  private updateChannel(access: NativeSPUSchedulerAccess): void {
    if (access.storage().audioChannel === null) return;
    if (!this.host.updateNonNullAudioChannel) throw new Error('Nonnull SPU audio channel effects are unresolved');
    bodyReturn(this.host.updateNonNullAudioChannel, this.spu, access);
  }
  process(frame: NativeApplicationFrame): NativeRoutineResult {
    return this.spu.dispatchScheduler(access => {
      if (this.processing) throw new Error('Reentrant ProcessScript is outside the supported profile');
      this.processing = true;
      try {
      if (typeof frame.processingEnabled !== 'boolean') throw new Error('Application processing gate is unresolved');
      if (!frame.processingEnabled) return 1;
      if (!storedFloat(frame.scaledSeconds)) throw new Error('Application scaled frame seconds must be the stored finite float32');
      const p = this.arithmetic.precisionBits, scale = access.storage().localTimeScale;
      const seconds = f32(multiply(binary(frame.scaledSeconds), binary(rules.epsilon > scale ? rules.epsilon : scale), p));
      const milliseconds = multiply(binary(seconds), binary(1000), p);
      access.writeMilliseconds('task', f32(add(binary(access.snapshot().taskMilliseconds), milliseconds, p)));
      access.writeMilliseconds('state', f32(add(binary(access.snapshot().stateMilliseconds), milliseconds, p)));
      access.writeStorage('waitElapsedMilliseconds', f32(add(milliseconds, binary(access.storage().waitElapsedMilliseconds), p)));
      let entity: NativeRoutineEntity | null = null, properties: NativeRoutineProperties | null = null;
      if (access.resolveSelf() !== null) {
        // Original GetEntity is repeated before dereferencing the owner.
        entity = access.resolveSelf();
        if (!entity) throw new Error('Self disappeared between native owner reads');
        properties = entity.properties;
        if (properties && access.snapshot().task !== properties.CurrentTask) succeeded(this.spu.setTask(properties.CurrentTask));
      }
      const pointer = access.snapshot().activeInstruction;
      access.writeStorage('lastFrameTimestamp', this.frames.snapshot().timestamp);
      if (pointer !== null) {
        if (pointer === ORIGINAL_WAIT_POINTER) this.waitInternal(access, null, false);
        else {
          const body = this.host.instruction?.(pointer);
          if (!body) throw new Error('Active compiled instruction is unresolved: ' + pointer);
          access.record({ operation: 'poll-instruction', value: pointer });
          if (!/^[0-9a-f]{64}$/.test(body.source.moduleSha256) || !/^[0-9a-f]{8}$/.test(body.source.entry)) throw new Error('Unidentified native instruction body');
          const value = body.invoke(null, this.spu, access, false);
          if (!isByte(value)) throw new Error('Native instruction handler must return its AL byte');
          // ProcessScript ignores AL and rereads the active pointer below.
        }
        if (access.snapshot().activeInstruction !== null) {
          this.localCallback(access); this.taskCallback(access, entity, properties);
          this.updateTimes(access, entity, properties); return 1; // No UpdateChannel on this path.
        }
      }
      let handled = false;
      while (access.snapshot().frameCount > 0) {
        const top = this.top(access); if (top.frame.script === '') break;
        if (top.frame.begin) {
          const wasPositive = top.frame.position >= 1;
          if (entity && properties) access.writeProperty(entity, properties, 'CurrentBreakBlock', top.frame.position);
          let result = this.script('state', this.top(access).frame.script, access);
          if (result === 1) {
            access.writeFrame(this.top(access).index, 'position', 0);
            if (wasPositive) {
              this.updateTimes(access, entity, properties);
              if (entity && properties) access.writeProperty(entity, properties, 'CurrentBreakBlock', this.top(access).frame.position);
              result = this.script('state', this.top(access).frame.script, access);
              if (result === 1) access.writeFrame(this.top(access).index, 'position', 0);
            }
          }
          if (result !== 1) this.localCallback(access);
          this.taskCallback(access, entity, properties); handled = true; break;
        }
        if (this.script('function', top.frame.script, access) === 0) {
          this.localCallback(access); this.taskCallback(access, entity, properties); handled = true; break;
        }
      }
      if (!handled) succeeded(this.spu.detectDailyRoutineTask(false));
      this.updateTimes(access, entity, properties); this.updateChannel(access); return 1;
      } finally { this.processing = false; }
    });
  }
}
