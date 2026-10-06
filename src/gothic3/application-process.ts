/** Original application render-tail timing and concrete entity/PS processing.
 * The host must supply actual resident objects and the native ordered range
 * array. Rendered/source candidates are not registration or range membership.
 * Arithmetic selects an explicit x87 precision/nearest-even profile; no native
 * control word, Win32 timer, scheduler, graphics driver or SEH is captured. */
import rulesText from '../../assets/gothic3/application-process/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { OriginalClockProperties } from './clock-properties';
import type { NativeScriptProcessingUnit, NativeRoutineResult } from './script-routine';
import type { NativeInstructionScheduler, NativeApplicationFrame } from './script-instructions';

const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>;
  constants: Record<string, number>; entityAdmin: { processingEnabledOffset: number } };
if (rules.schema !== 'gothic3-native-application-process-rules-v1' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.constants.smoothFrameWeightDivisor !== 0.12500000186264515 ||
    rules.constants.elapsedEpsilon !== Math.fround(1e-5) ||
    rules.constants.millisecondsPerSecond !== 1000 || rules.entityAdmin.processingEnabledOffset !== 0x88) {
  throw new Error('Unsupported application processing source receipt');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unsupported = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function uint(value: number, bits = 32): number {
  if (!Number.isInteger(value) || value < 0 || value > (bits === 32 ? 0xffffffff : 2 ** bits - 1)) {
    throw new Error('Expected native uint' + bits);
  }
  return value;
}
function stored(value: number): number {
  if (!Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new Error('Expected finite stored float32');
  return value;
}
function bool(value: boolean): boolean {
  if (typeof value !== 'boolean') throw new Error('Expected native bool');
  return value;
}
export type NativeApplicationProcessResult<T> =
  | { outcome: 'complete'; value: T; applied: readonly string[]; attempted: readonly string[] }
  | { outcome: 'unsupported' | 'partial'; value: null; required: string; applied: readonly string[]; attempted: readonly string[] };
class Operation {
  readonly applied: string[] = [];
  readonly attempted: string[] = [];
  constructor(private readonly check: () => void) {}
  call<T>(label: string, fn: () => NativeValue<T>): T {
    // A callback can apply a prefix before reporting unknown or throwing.
    this.attempted.push(label);
    const result = fn();
    this.check();
    if (!result.known) throw new Error(label + ': ' + result.reason);
    this.applied.push(label); return result.value;
  }
  write(label: string, fn: () => void): void { fn(); this.applied.push(label); }
}
class Guard {
  private active = false;
  private reentered = false;
  private blocked: string | null = null;
  failure(): string | null { return this.blocked; }
  protected run<T>(fn: (op: Operation) => T): NativeApplicationProcessResult<T> {
    const op = new Operation(() => {
      if (this.reentered) throw new Error('A callback attempted reentrant processing.');
    });
    if (this.active) this.reentered = true;
    if (this.active || this.blocked) return { outcome: 'unsupported', value: null, applied: [], attempted: [],
      required: this.blocked ?? 'Reentrant processing is outside the selected live-object profile.' };
    this.active = true; this.reentered = false;
    try {
      const value = fn(op);
      if (this.reentered) throw new Error('A callback attempted reentrant processing.');
      return { outcome: 'complete', value, applied: Object.freeze(op.applied), attempted: Object.freeze(op.attempted) };
    } catch (error) {
      const required = error instanceof Error ? error.message : String(error);
      const partial = op.applied.length !== 0 || op.attempted.length !== 0;
      if (partial) this.blocked = required;
      return { outcome: partial ? 'partial' : 'unsupported', value: null, required,
        applied: Object.freeze(op.applied), attempted: Object.freeze(op.attempted) };
    } finally { this.active = false; }
  }
}
/** A partial prefix cannot be automatically replayed. Reconstruct detached
 * state/hosts explicitly if rollback is needed; this guard is not a native reset. */
function value<T>(result: NativeApplicationProcessResult<T>): NativeValue<T> {
  return result.outcome === 'complete' ? known(result.value) : unsupported(result.required);
}

export type NativeApplicationPrecision = 24 | 53 | 64;
export interface NativeApplicationArithmetic {
  precisionBits: NativeApplicationPrecision;
  rounding: 'nearest-even'; capturedNativeEnvironment: false;
}
function precision(profile: NativeApplicationArithmetic): NativeApplicationPrecision {
  if (![24, 53, 64].includes(profile.precisionBits) || profile.rounding !== 'nearest-even' ||
      profile.capturedNativeEnvironment !== false) throw new Error('Explicit uncaptured x87 profile required');
  return profile.precisionBits;
}
interface Binary { coefficient: bigint; exponent: number; negativeZero?: boolean }
const bitsView = new DataView(new ArrayBuffer(8));
function binary(v: number): Binary {
  if (!Number.isFinite(v)) throw new Error('Nonfinite x87 exception domain is unsupported');
  bitsView.setFloat64(0, v, true); const bits = bitsView.getBigUint64(0, true);
  const e = Number((bits >> 52n) & 0x7ffn), sign = (bits >> 63n) !== 0n;
  const fraction = bits & ((1n << 52n) - 1n), c = e ? (1n << 52n) | fraction : fraction;
  return { coefficient: sign ? -c : c, exponent: e ? e - 1075 : -1074, negativeZero: c === 0n && sign };
}
const abs = (n: bigint): bigint => n < 0n ? -n : n;
const length = (n: bigint): number => n === 0n ? 0 : n.toString(2).length;
function quotient(n: bigint, d: bigint): bigint {
  const q = n / d, twice = (n % d) * 2n;
  return twice > d || (twice === d && (q & 1n) === 1n) ? q + 1n : q;
}
function round(v: Binary, p: number, minimumExponent = -20000): Binary {
  if (v.coefficient === 0n) return v;
  const a = abs(v.coefficient), shift = Math.max(0, length(a) - p, minimumExponent - v.exponent);
  const c = shift ? quotient(a, 1n << BigInt(shift)) : a;
  return { coefficient: v.coefficient < 0n ? -c : c, exponent: v.exponent + shift,
    negativeZero: c === 0n && v.coefficient < 0n };
}
function add(a: Binary, b: Binary, p: NativeApplicationPrecision): Binary {
  const e = Math.min(a.exponent, b.exponent);
  const c = (a.coefficient << BigInt(a.exponent - e)) + (b.coefficient << BigInt(b.exponent - e));
  return round({ coefficient: c, exponent: e, negativeZero: c === 0n && a.negativeZero === true && b.negativeZero === true }, p);
}
function negate(a: Binary): Binary {
  return { ...a, coefficient: -a.coefficient, negativeZero: a.coefficient === 0n && a.negativeZero !== true };
}
function multiply(a: Binary, b: Binary, p: NativeApplicationPrecision): Binary {
  const c = a.coefficient * b.coefficient;
  return round({ coefficient: c, exponent: a.exponent + b.exponent,
    negativeZero: c === 0n && ((a.coefficient < 0n || a.negativeZero === true) !== (b.coefficient < 0n || b.negativeZero === true)) }, p);
}
function divide(a: Binary, b: Binary, p: NativeApplicationPrecision): Binary {
  if (b.coefficient === 0n) throw new Error('Native zero-divisor/nonfinite reciprocal domain is unsupported');
  if (a.coefficient === 0n) return { coefficient: 0n, exponent: 0,
    negativeZero: (a.negativeZero === true) !== (b.coefficient < 0n) };
  const n = abs(a.coefficient), d = abs(b.coefficient); let logarithm = length(n) - length(d);
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
  if (!Number.isFinite(result)) throw new Error('Native float32 overflow is unsupported');
  return result;
}
function sleepInteger(difference: number): number {
  const b = binary(stored(difference)), c = b.exponent >= 0 ? b.coefficient << BigInt(b.exponent)
    : quotient(abs(b.coefficient), 1n << BigInt(-b.exponent));
  if (b.coefficient < 0n || c > 0x7fffffffn) throw new Error('Sleep FISTP signed32 exception domain is unsupported');
  return Number(c);
}

export interface NativeApplicationTimestampHost {
  /** Actual bCTimer::GetTimeStamp call boundary. A browser selection must
   * identify its monotonic uint32 millisecond source, not supply RAF dt. */
  timestamp(): NativeValue<number>;
}
/** SharedBase100085b7 constructor,100032bf GetTime,1000130c Reset and10006d2a
 * Resume. Public fields are the same physical timer state, never a second dt. */
export class NativeApplicationTimer extends Guard {
  factor = 1; lastTimestamp = 0; accumulated = 0; pending = 0; pausedByte = 1;
  private readonly arithmetic: NativeApplicationPrecision;
  constructor(readonly timestamps: NativeApplicationTimestampHost, profile: NativeApplicationArithmetic) {
    super(); this.arithmetic = precision(profile);
  }
  resume(): NativeValue<void> {
    return value(this.run(op => {
      if (uint(this.pausedByte, 8) === 1) {
        const stamp = uint(op.call('timer.Resume.GetTimeStamp', () => this.timestamps.timestamp()));
        op.write('timer.lastTimestamp', () => { this.lastTimestamp = stamp; });
        op.write('timer.pausedByte=0', () => { this.pausedByte = 0; });
      }
    }));
  }
  getTime(): NativeValue<number> {
    return value(this.run(op => {
      if (uint(this.pausedByte, 8) === 0) {
        const stamp = uint(op.call('timer.GetTime.GetTimeStamp', () => this.timestamps.timestamp()));
        const delta = (stamp - uint(this.lastTimestamp)) >>> 0;
        const p = this.arithmetic;
        // FILD signed32 plus 2^32 reconstructs the same unsigned delta.
        const deltaValue = delta < 0x80000000 ? binary(delta) : add(binary(delta - 0x100000000), binary(0x100000000), p);
        op.write('timer.lastTimestamp', () => { this.lastTimestamp = stamp; });
        const pending = f32(add(multiply(deltaValue, binary(stored(this.factor)), p), binary(stored(this.pending)), p));
        op.write('timer.pending', () => { this.pending = pending; });
      }
      const total = f32(add(binary(stored(this.pending)), binary(stored(this.accumulated)), this.arithmetic));
      op.write('timer.pending=0', () => { this.pending = 0; });
      op.write('timer.accumulated', () => { this.accumulated = total; });
      return this.accumulated;
    }));
  }
  reset(): NativeValue<void> {
    return value(this.run(op => {
      op.write('timer.accumulated=0', () => { this.accumulated = 0; });
      op.write('timer.pending=0', () => { this.pending = 0; });
      if (uint(this.pausedByte, 8) === 0) {
        op.write('timer.pausedByte=1', () => { this.pausedByte = 1; });
        const stamp = uint(op.call('timer.Reset.GetTimeStamp', () => this.timestamps.timestamp()));
        op.write('timer.lastTimestamp', () => { this.lastTimestamp = stamp; });
        op.write('timer.pausedByte=0', () => { this.pausedByte = 0; });
      }
    }));
  }
}
/** Structural binding to the exact NativeGameApplication object. */
export interface NativeApplicationTimingFields {
  frameCounter: number; frameSeconds: number; scaledSeconds: number;
  pausedByte: number; pauseOverrideByte: number;
  isGameRunning(): number;
}
export interface NativeApplicationTickHost extends NativeApplicationTimestampHost {
  timer: { getTime(): NativeValue<number>; reset(): NativeValue<void> };
  warnDuplicateTimerUpdate(): NativeValue<void>;
  /** The selected host scheduling effect must complete at this call boundary.
   * Browser asynchronous Sleep is a remaining adapter dependency. */
  sleep(milliseconds: number): NativeValue<void>;
}
export interface NativeApplicationTickSnapshot {
  timestamp: number; timestampFloat: number; lastUpdatedCounter: number;
  frameMilliseconds: number; smoothedMilliseconds: number; scaledMilliseconds: number; rawFPS: number;
  previousFrameMilliseconds: number; previousFrameSeconds: number;
  previousScaledMilliseconds: number; previousScaledSeconds: number;
  reciprocalFrameMilliseconds: number; reciprocalFrameSeconds: number;
  reciprocalScaledMilliseconds: number; reciprocalScaledSeconds: number;
}
export class NativeApplicationTiming extends Guard {
  timeScale = 1; smoothByte = 0; fixedMilliseconds = -1; singleStepMilliseconds = -1;
  minimumMilliseconds = -1; maximumMilliseconds = -1;
  readonly state: NativeApplicationTickSnapshot = {
    timestamp: 0, timestampFloat: 0, lastUpdatedCounter: 0xffffffff,
    frameMilliseconds: 0, smoothedMilliseconds: 0, scaledMilliseconds: 0, rawFPS: 0,
    previousFrameMilliseconds: 0, previousFrameSeconds: 0, previousScaledMilliseconds: 0, previousScaledSeconds: 0,
    reciprocalFrameMilliseconds: 0, reciprocalFrameSeconds: 0, reciprocalScaledMilliseconds: 0, reciprocalScaledSeconds: 0,
  };
  private readonly p: NativeApplicationPrecision;
  constructor(readonly application: NativeApplicationTimingFields, readonly host: NativeApplicationTickHost,
    profile: NativeApplicationArithmetic) {
    super(); this.p = precision(profile);
    if (uint(application.frameCounter) !== 0 || stored(application.frameSeconds) !== 0 || stored(application.scaledSeconds) !== 0) {
      throw new Error('Bind timing during actual application construction; already-running timer state requires a source-backed restore path.');
    }
  }
  setFixedFrameTimeSingleStep(milliseconds: number): void {
    if (this.failure()) throw new Error(this.failure()!);
    stored(milliseconds);
    if (uint(this.application.pauseOverrideByte, 8) === 1 || uint(this.application.pausedByte, 8) === 0) {
      this.application.pausedByte = 1;
    }
    this.singleStepMilliseconds = milliseconds; this.application.pauseOverrideByte = 1;
  }
  /** Call ONLY when DoRender reaches Engine300647b0 after OnPostRender and
   * final fogging disable. Renderer early returns do not publish timer values.
   * There is no pause/warmup dt multiplication in this function. */
  updateAfterSuccessfulRenderTail(): NativeApplicationProcessResult<'updated' | 'duplicate-skipped'> {
    return this.run(op => {
      const a = this.application, s = this.state, p = this.p;
      const stamp = uint(op.call('UpdateTick.GetTimeStamp', () => this.host.timestamp()));
      op.write('application.timestamp+510', () => { s.timestamp = stamp; });
      // Original CMP AL,1, rather than a generic nonzero test.
      if (uint(op.call('UpdateTick.IsGameRunning+270', () => known(a.isGameRunning())), 8) === 1 &&
          uint(s.lastUpdatedCounter) === uint(a.frameCounter)) {
        op.call('UpdateTick.duplicate-warning', () => this.host.warnDuplicateTimerUpdate()); return 'duplicate-skipped';
      }
      op.write('application.previous-times', () => {
        s.previousFrameMilliseconds = stored(s.frameMilliseconds); s.previousFrameSeconds = stored(a.frameSeconds);
        s.previousScaledMilliseconds = stored(s.scaledMilliseconds); s.previousScaledSeconds = stored(a.scaledSeconds);
      });
      let elapsed = stored(op.call('timer.GetTime', () => this.host.timer.getTime()));
      op.call('timer.Reset', () => this.host.timer.reset());
      if (elapsed <= 0) elapsed = Math.fround(1e-5);
      op.write('application.rawFPS+4d4', () => { s.rawFPS = f32(divide(binary(1000), binary(elapsed), p)); });
      if (uint(this.smoothByte, 8) === 1) {
        const old = stored(s.frameMilliseconds), prior = stored(s.smoothedMilliseconds);
        const difference = f32(add(binary(old), negate(binary(prior)), p));
        const delta = f32(divide(multiply(binary(difference), binary(difference), p), binary(100000), p));
        const ratio = divide(add(multiply(binary(delta), binary(4), p), binary(1), p), add(binary(delta), binary(1), p), p);
        // Original double@30819608 is 000000040000c03f, not exact0.125.
        const oldWeight = f32(divide(binary(old), binary(0.12500000186264515), p));
        const weight = f32(multiply(ratio, binary(oldWeight), p));
        const numerator = f32(add(multiply(binary(weight), binary(elapsed), p), binary(prior), p));
        const result = f32(divide(binary(numerator), add(binary(weight), binary(1), p), p));
        op.write('RelaxTick.smooth+4dc', () => { s.smoothedMilliseconds = result; });
      } else op.write('RelaxTick.raw+4dc', () => { s.smoothedMilliseconds = elapsed; });
      op.write('RelaxTick.frame+4d8', () => { s.frameMilliseconds = s.smoothedMilliseconds; });
      if (s.frameMilliseconds === 0) op.write('UpdateTick.zero-epsilon', () => { s.frameMilliseconds = Math.fround(1e-5); });
      const fixed = stored(this.fixedMilliseconds);
      if (fixed > 0 || stored(this.singleStepMilliseconds) > 0) {
        if (fixed <= 0) op.write('UpdateTick.consume-single-step', () => {
          s.frameMilliseconds = stored(this.singleStepMilliseconds); this.singleStepMilliseconds = -1;
        });
        else if (fixed <= s.frameMilliseconds) op.write('UpdateTick.fixed', () => { s.frameMilliseconds = stored(this.fixedMilliseconds); });
        else {
          const difference = f32(add(binary(fixed), negate(binary(stored(s.frameMilliseconds))), p));
          op.call('UpdateTick.fixed-Sleep', () => this.host.sleep(sleepInteger(difference)));
          op.write('UpdateTick.fixed-after-Sleep', () => { s.frameMilliseconds = stored(this.fixedMilliseconds); });
        }
      } else {
        const maximum = stored(this.maximumMilliseconds);
        op.write('UpdateTick.pauseOverride+532=0', () => { a.pauseOverrideByte = 0; });
        if (maximum > 0 && maximum < s.frameMilliseconds) op.write('UpdateTick.maximum', () => { s.frameMilliseconds = maximum; });
        const minimum = stored(this.minimumMilliseconds);
        if (minimum > 0 && s.frameMilliseconds < minimum) {
          const difference = f32(add(binary(minimum), negate(binary(stored(s.frameMilliseconds))), p));
          op.call('UpdateTick.minimum-Sleep', () => this.host.sleep(sleepInteger(difference)));
          op.write('UpdateTick.minimum-after-Sleep', () => { s.frameMilliseconds = stored(this.minimumMilliseconds); });
        }
      }
      const timestamp = uint(s.timestamp);
      const nativeUnsigned = timestamp < 0x80000000 ? binary(timestamp)
        : add(binary(timestamp - 0x100000000), binary(0x100000000), p);
      op.write('application.timestamp-float+514', () => { s.timestampFloat = f32(nativeUnsigned); });
      op.write('application.lastUpdatedCounter+51c', () => { s.lastUpdatedCounter = uint(a.frameCounter); });
      const ms = stored(s.frameMilliseconds);
      const seconds = f32(divide(binary(ms), binary(1000), p));
      op.write('application.frameSeconds+4e0', () => { a.frameSeconds = seconds; });
      const scaledMs = f32(multiply(binary(stored(this.timeScale)), binary(ms), p));
      op.write('application.scaledMilliseconds+4e4', () => { s.scaledMilliseconds = scaledMs; });
      const scaledSeconds = f32(divide(binary(scaledMs), binary(1000), p));
      op.write('application.scaledSeconds+4e8', () => { a.scaledSeconds = scaledSeconds; });
      op.write('application.reciprocal-frameMs+4ec', () => { s.reciprocalFrameMilliseconds = f32(divide(binary(1), binary(ms), p)); });
      const reciprocalSeconds = f32(divide(binary(1), binary(seconds), p));
      op.write('application.reciprocal-frameSec+4f0', () => { s.reciprocalFrameSeconds = reciprocalSeconds; });
      // The original deliberately stores this same reciprocal at+4f4.
      op.write('application.reciprocal-scaledMs+4f4', () => { s.reciprocalScaledMilliseconds = reciprocalSeconds; });
      op.write('application.reciprocal-scaledSec+4f8', () => { s.reciprocalScaledSeconds = f32(divide(binary(1), binary(scaledSeconds), p)); });
      return 'updated';
    });
  }
}
/** Concrete GameApp virtual+2c4 -> imported EMPTY Engine OnProcess. */
export function nativeConcreteGameAppOnProcess(): NativeValue<void> { return known(undefined); }

export type NativeEntityPhase = 'pre' | 'process' | 'post';
export interface NativeProcessingPropertySet {
  canBePaused(): NativeValue<boolean>;
  getDecayState(): NativeValue<number>;
  onPreProcess(): NativeValue<void>; onProcess(): NativeValue<void>; onPostProcess(): NativeValue<void>;
}
export interface NativeEntityProcessingHost<E extends object, P extends NativeProcessingPropertySet, C extends object, H extends object> {
  /** Must select the actual concrete virtual dispatch, including inherited
   * gCEntity slots. An unexamined subclass override must return unknown. */
  virtualProfile(entity: E): NativeValue<'base-entity' | 'dynamic-entity'>;
  flag(entity: E, mask: 0x2 | 0x8 | 0x80 | 0x800000): NativeValue<boolean>;
  isKilled(entity: E): NativeValue<number>;
  currentContext(entity: E): NativeValue<C | null>; contextEnabled(context: C): NativeValue<boolean>;
  childCount(entity: E): NativeValue<number>; childAt(entity: E, index: number): NativeValue<E>;
  /** Both getters execute the actual virtual OnReadContent BEFORE reading the
   * current physical count/pointer. Plain serialized array access is not this
   * call. The returned pointer must remain the captured object across callbacks. */
  propertyCount(entity: E): NativeValue<number>; propertyAt(entity: E, index: number): NativeValue<P | null>;
  physicObject(entity: E): NativeValue<H | null>; processPhysicObject(object: H): NativeValue<void>;
  kill(entity: E): NativeValue<void>;
  addReference(entity: E): NativeValue<void>; releaseReference(entity: E): NativeValue<void>;
}
/** EntityAdmin physical+88 processing flag and+aa/+ac ordered range array.
 * Invalidate sets enabled=0. Range updates are required before dispatch and
 * have their own callback effects; disabling processing does not skip them. */
export interface NativeEntityAdminProcessState<E extends object> {
  enabledByte: number; processingEntities: E[]; profileTicks: number;
}
/** Actual Engine3003125f setter; no residency or range array is created. */
export function nativeEnableEntityAdminProcessing<E extends object>(state: NativeEntityAdminProcessState<E>, enabled: boolean): void {
  state.enabledByte = bool(enabled) ? 1 : 0;
}
export interface NativeEntityAdminRangeHost<E extends object> extends NativeApplicationTimestampHost {
  /** Original camera/ROI/PVS/hysteresis/dirty queues, Exit before Enter. Must
   * update this same physical state, not replace it with renderer membership. */
  updateProcessingRanges(state: NativeEntityAdminProcessState<E>): NativeValue<void>;
}
export interface NativeProcessingApplication { isPaused(ignored: false): number }
export class NativeEntityProcessing<E extends object, P extends NativeProcessingPropertySet, C extends object, H extends object> extends Guard {
  constructor(readonly application: () => NativeValue<NativeProcessingApplication>,
    readonly host: NativeEntityProcessingHost<E, P, C, H>) { super(); }
  private count(n: number): number { return uint(n, 16); }
  private property(entity: E, index: number, label: string, op: Operation): P {
    const set = op.call(label, () => this.host.propertyAt(entity, index));
    if (set === null) throw new Error('Null property set at an original unguarded virtual dispatch; pointer destruction is unsupported.');
    return set;
  }
  private propertyPhase(entity: E, phase: NativeEntityPhase, op: Operation): void {
    const host = this.host;
    let allDecayed = false;
    if (phase === 'process') {
      if (op.call('Entity.GetPhysicObject.test', () => host.physicObject(entity)) !== null) {
        const object = op.call('Entity.GetPhysicObject.capture', () => host.physicObject(entity));
        if (object === null) throw new Error('PhysicObject disappeared before native unguarded Process');
        op.call('PhysicObject.Process', () => host.processPhysicObject(object));
      }
      allDecayed = this.count(op.call('Entity.GetPropertySetCount.decay', () => host.propertyCount(entity))) !== 0;
    }
    let count = this.count(op.call('Entity.GetPropertySetCount', () => host.propertyCount(entity)));
    for (let index = 0; index < count; index++) {
      // OnProcess captures its PS before the application pause getter. Pre/Post
      // capture their invocation PS only after the pause/CanBePaused calls.
      const captured = phase === 'process' ? this.property(entity, index, 'PS.capture', op) : null;
      const application = op.call('Application.GetInstance', () => this.application());
      const paused = uint(op.call('Application.IsPaused(false)', () => known(application.isPaused(false))), 8) !== 0;
      let process = true;
      if (paused) {
        const gate = this.property(entity, index, 'PS.pause-gate.capture', op);
        process = !bool(op.call('PS.CanBePaused+70', () => gate.canBePaused()));
      }
      if (process) {
        const set = captured ?? this.property(entity, index, 'PS.invoke.capture', op);
        op.call('PS.On' + phase + 'Process', () => phase === 'pre' ? set.onPreProcess()
          : phase === 'post' ? set.onPostProcess() : set.onProcess());
      }
      if (captured !== null && uint(op.call('PS.GetDecayState+ec', () => captured.getDecayState())) < 2) allDecayed = false;
      count = this.count(op.call('Entity.GetPropertySetCount.reload', () => host.propertyCount(entity)));
    }
    if (phase === 'process' && allDecayed) op.call('Entity.Kill', () => host.kill(entity));
  }
  private entityPhase(entity: E, phase: NativeEntityPhase, recursive: boolean, op: Operation, ancestors: Set<E>): void {
    if (ancestors.has(entity)) throw new Error('Cyclic native graph/destruction is outside the live profile');
    if (bool(op.call('Entity.processing-disabled', () => this.host.flag(entity, 0x2)))) return;
    const profile = op.call('Entity.virtual-profile', () => this.host.virtualProfile(entity));
    if (profile === 'dynamic-entity') this.propertyPhase(entity, phase, op);
    else if (profile !== 'base-entity') throw new Error('Unexamined entity virtual override');
    // eCEntity's three base virtual phases are empty.
    if (recursive) {
      ancestors.add(entity);
      let count = this.count(op.call('Entity.children-count', () => this.host.childCount(entity)));
      for (let index = 0; index < count; index++) {
        const child = op.call('Entity.GetChildAt', () => this.host.childAt(entity, index));
        this.entityPhase(child, phase, true, op, ancestors);
        count = this.count(op.call('Entity.children-count.reload', () => this.host.childCount(entity)));
      }
      ancestors.delete(entity);
    }
  }
  processEntityPhase(entity: E, phase: NativeEntityPhase, recursive = false): NativeApplicationProcessResult<void> {
    return this.run(op => {
      if (!['pre', 'process', 'post'].includes(phase)) throw new Error('Invalid processing phase');
      this.entityPhase(entity, phase, bool(recursive), op, new Set());
    });
  }
  /** Complete supported EntityAdmin tail. Camera/PVS range construction stays
   * a required original host boundary. Exceptions stop with retained references
   * as a partial prefix, not fabricated successful cleanup or automatic replay. */
  processAdmin(state: NativeEntityAdminProcessState<E>, range: NativeEntityAdminRangeHost<E>): NativeApplicationProcessResult<void> {
    return this.run(op => {
      const start = uint(op.call('EntityAdmin.profile-start', () => range.timestamp()));
      op.write('EntityAdmin.profileTicks=start', () => { state.profileTicks = start; });
      op.call('EntityAdmin.native-range-update', () => range.updateProcessingRanges(state));
      if (uint(state.enabledByte, 8) === 1) {
        const count = this.count(state.processingEntities.length);
        if (count === 0xffff) throw new Error('Native small-array allocation overflow profile unsupported');
        const snapshot = state.processingEntities.slice();
        for (const entity of snapshot) op.call('Entity.AddReference+20', () => this.host.addReference(entity));
        for (const entity of snapshot) {
          if (!bool(op.call('Entity.dynamic-flag', () => this.host.flag(entity, 0x800000))) ||
              !bool(op.call('Entity.range-entered', () => this.host.flag(entity, 0x80)))) continue;
          if (uint(op.call('Entity.IsKilled', () => this.host.isKilled(entity)), 8) === 1 ||
              !bool(op.call('Entity.IsEnabled', () => this.host.flag(entity, 0x8)))) continue;
          const context = op.call('Entity.GetCurrentContext', () => this.host.currentContext(entity));
          if (context === null) throw new Error('Null context at native unguarded IsEnabled boundary');
          if (!bool(op.call('Context.IsEnabled', () => this.host.contextEnabled(context)))) continue;
          for (const phase of ['pre', 'process', 'post'] as const) this.entityPhase(entity, phase, false, op, new Set());
        }
        for (const entity of snapshot) op.call('Entity.ReleaseReference+24', () => this.host.releaseReference(entity));
      }
      const end = uint(op.call('EntityAdmin.profile-end', () => range.timestamp()));
      op.write('EntityAdmin.profileTicks=delta', () => { state.profileTicks = (end - uint(state.profileTicks)) >>> 0; });
    });
  }
}

/** Scheduling adapter for the exact physical clock module. Its process()
 * already performs scratch/calendar stores and the source consumer captures
 * and notifications. No second clock or calendar publication is introduced. */
export class NativeClockProcessing extends Guard implements NativeProcessingPropertySet {
  constructor(readonly clock: OriginalClockProperties,
    readonly decayState: () => NativeValue<number>) {
    super(); if (!(clock instanceof OriginalClockProperties)) throw new Error('Actual physical Clock_PS capability required');
  }
  canBePaused(): NativeValue<boolean> { return known(true); }
  /** Base+ec reads actual PS flag bits1..3, not a fabricated Alive default. */
  getDecayState(): NativeValue<number> { return this.decayState(); }
  onPreProcess(): NativeValue<void> { return known(undefined); }
  onPostProcess(): NativeValue<void> { return known(undefined); }
  onProcess(): NativeValue<void> {
    return value(this.run(op => {
      op.call('Clock.physical-OnProcess', () => {
        const result = this.clock.process();
        return result.supported ? known(undefined) : unsupported(result.reason);
      });
    }));
  }
}
export interface NativeRoutineProcessingHost extends NativeApplicationTimestampHost {
  /** Resolve the virtual GetEntity pointer to the same actual SPU registry ID;
   * null remains null. Do not substitute a source name or rendered NPC. */
  ownerId(): NativeValue<string | null>;
  applicationFrame(): NativeValue<NativeApplicationFrame>;
  scriptAdmin(): NativeValue<{ profileTicks: number }>;
  decayState(): NativeValue<number>;
}
function routineValue(result: NativeRoutineResult): NativeValue<void> {
  return result.supported ? known(undefined) : unsupported(result.reason);
}
export class NativeRoutineProcessing extends Guard implements NativeProcessingPropertySet {
  constructor(readonly spu: NativeScriptProcessingUnit, readonly scheduler: NativeInstructionScheduler,
    readonly host: NativeRoutineProcessingHost) {
    super(); if (scheduler.spu !== spu) throw new Error('Scheduler must use this exact property-set embedded SPU');
  }
  canBePaused(): NativeValue<boolean> { return known(true); }
  getDecayState(): NativeValue<number> { return this.host.decayState(); }
  onPostProcess(): NativeValue<void> { return known(undefined); }
  onPreProcess(): NativeValue<void> {
    return value(this.run(op => {
      const owner = op.call('Routine.Pre.GetEntity', () => this.host.ownerId());
      op.call('Routine.Pre.SetSelfEntity', () => routineValue(this.spu.setSelfEntity(owner)));
    }));
  }
  onProcess(): NativeValue<void> {
    return value(this.run(op => {
      const start = uint(op.call('Routine.profile-start', () => this.host.timestamp()));
      const owner = op.call('Routine.Process.GetEntity', () => this.host.ownerId());
      op.call('Routine.Process.SetSelfEntity', () => routineValue(this.spu.setSelfEntity(owner)));
      const frame = op.call('Routine.application-frame', () => this.host.applicationFrame());
      op.call('Routine.ProcessScript', () => routineValue(this.scheduler.process(frame)));
      const end = uint(op.call('Routine.profile-end', () => this.host.timestamp()));
      const admin = op.call('Routine.ScriptAdmin', () => this.host.scriptAdmin());
      op.write('ScriptAdmin.AddProfileTicks+204', () => { admin.profileTicks = (uint(admin.profileTicks) + ((end - start) >>> 0)) >>> 0; });
    }));
  }
}
