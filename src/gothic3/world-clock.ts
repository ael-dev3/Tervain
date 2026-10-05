/** Original bCClock arithmetic, with explicit host timer and FPU profiles. */
import receiptText from '../../assets/gothic3/clock/output-receipt.json?raw';
import { gameplayResources } from './native-data';
import type { NativeClock } from './quest-state';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

export type NativeClockPrecision = 24 | 53 | 64;
export interface NativeClockTimestampSource {
  readonly profile: 'selected-host-monotonic-u32-milliseconds';
  /** Monotonic millisecond counter modulo2^32; less than one wrap between related
   * reads. This selected timer is read-only with respect to clock/PS storage:
   * original bCTimer has no user callback or reentrant clock setter. */
  readMilliseconds(): number;
}
export interface NativeTimeAndDate { years: number; days: number; seconds: number }
export interface NativeCalendar { year: number; day: number; hour: number; minute: number; second: number }
export interface NativeClockAdjustment { factor: number; secondsPerDay: number; daysPerYear: number }
export interface NativeClockSourceSeed {
  schema: 'gothic3-world-clock-v1'; schemaVersion: 1;
  calendar: NativeCalendar; factor: number;
  adjustment: { secondsPerDay: number; daysPerYear: number };
  source: { sha256: string };
}
export interface NativeWorldClockSnapshot {
  revision: number;
  adjustment: Readonly<NativeClockAdjustment>;
  timeAndDate: Readonly<NativeTimeAndDate>;
  /** gCClock_PS property values, last published by Process or supplied by the source seed. */
  calendar: Readonly<NativeCalendar>;
  lastTimestamp: number; pendingSeconds: number; paused: boolean;
  arithmetic: { precisionBits: NativeClockPrecision; rounding: 'nearest-even'; capturedNativeEnvironment: false };
  timestampProfile: NativeClockTimestampSource['profile'];
}
export type NativeClockConsumer =
  | { kind: 'weatherCurrentDayTime'; days: number; when: 'if-weather-admin-exists' }
  | { kind: 'musicDayTime'; tableIndex: 0 | 1 | 2 | 3; when: 'if-music-module-exists' }
  | { kind: 'ambientDayTime'; value: 0 | 1 | 2 | 3; when: 'if-ambient-module-exists' };
export interface NativeClockProcess {
  timeAndDate: NativeTimeAndDate;
  calendar: NativeCalendar;
  timestampSamples: number[];
  previousDayTime: 0 | 1 | 2 | 3;
  dayTime: 0 | 1 | 2 | 3;
  /** Ordered native notifications. Advancing this clock does not execute these consumers. */
  consumers: NativeClockConsumer[];
}
export type NativeClockTransition<T> =
  | { kind: 'applied'; revision: number; value: T }
  | { kind: 'rejected' | 'unsupported'; revision: number; reason: string };
export interface NativeClockDocument {
  schema: 'gothic3-native-world-clock-v1'; schemaVersion: 1;
  sourceSeed: ResourceReceipt & { url: string };
  millisecondsToSeconds: number;
  arithmeticProfiles: { precisionBits: NativeClockPrecision[]; rounding: 'nearest-even';
    selectionRequired: true; capturedNativeControlWord: false };
  precision: string[]; unresolvedConsumers: string[];
  [key: string]: unknown;
}

// SharedBase.dll 0x100e8178: 000000e04d62503f. It is promoted float32(.001).
const MILLISECONDS_TO_SECONDS = 0.0010000000474974513;
const U32_PERIOD = 4294967296;
const signed64Min = -(1n << 63n);
const signed64MaxExclusive = 1n << 63n;
const isU32 = (value: number): boolean => Number.isInteger(value) && value >= 0 && value < U32_PERIOD;
const precisionValid = (value: number): value is NativeClockPrecision => value === 24 || value === 53 || value === 64;

/** Exact finite dyadic values let all three x87 precision profiles use the same operation order. */
interface Binary { coefficient: bigint; exponent: number; negativeZero?: boolean }
const floatBits = new DataView(new ArrayBuffer(8));
function binary(value: number): Binary {
  if (!Number.isFinite(value)) throw new Error('Nonfinite native floating-point operand is unsupported.');
  floatBits.setFloat64(0, value, true);
  const bits = floatBits.getBigUint64(0, true);
  const sign = (bits >> 63n) !== 0n;
  const rawExponent = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  const coefficient = rawExponent ? (1n << 52n) | fraction : fraction;
  return { coefficient: sign ? -coefficient : coefficient,
    exponent: rawExponent ? rawExponent - 1023 - 52 : -1074,
    negativeZero: coefficient === 0n && sign };
}
const magnitude = (value: bigint): bigint => value < 0n ? -value : value;
const bitLength = (value: bigint): number => value === 0n ? 0 : value.toString(2).length;
function roundedQuotient(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const twiceRemainder = (numerator % denominator) * 2n;
  return twiceRemainder > denominator || (twiceRemainder === denominator && (quotient & 1n) === 1n)
    ? quotient + 1n : quotient;
}
function rounded(value: Binary, precision: number, minimumExponent = -20000): Binary {
  if (value.coefficient === 0n) return value;
  const absolute = magnitude(value.coefficient);
  const shift = Math.max(0, bitLength(absolute) - precision, minimumExponent - value.exponent);
  const result = shift ? roundedQuotient(absolute, 1n << BigInt(shift)) : absolute;
  return { coefficient: value.coefficient < 0n ? -result : result, exponent: value.exponent + shift,
    negativeZero: result === 0n && value.coefficient < 0n };
}
function add(left: Binary, right: Binary, precision: NativeClockPrecision): Binary {
  const exponent = Math.min(left.exponent, right.exponent);
  const coefficient = (left.coefficient << BigInt(left.exponent - exponent)) +
    (right.coefficient << BigInt(right.exponent - exponent));
  return rounded({ coefficient, exponent,
    negativeZero: coefficient === 0n && left.negativeZero === true && right.negativeZero === true }, precision);
}
function multiply(left: Binary, right: Binary, precision: NativeClockPrecision): Binary {
  const coefficient = left.coefficient * right.coefficient;
  return rounded({ coefficient, exponent: left.exponent + right.exponent,
    negativeZero: coefficient === 0n &&
      ((left.coefficient < 0n || left.negativeZero === true) !== (right.coefficient < 0n || right.negativeZero === true)) }, precision);
}
function divide(left: Binary, right: Binary, precision: NativeClockPrecision): Binary {
  if (right.coefficient === 0n) throw new Error('Native floating-point division by zero is unsupported.');
  if (left.coefficient === 0n) return { coefficient: 0n, exponent: 0,
    negativeZero: (left.negativeZero === true) !== (right.coefficient < 0n) };
  const numerator = magnitude(left.coefficient), denominator = magnitude(right.coefficient);
  let logarithm = bitLength(numerator) - bitLength(denominator);
  if (logarithm >= 0 ? numerator < (denominator << BigInt(logarithm)) :
      (numerator << BigInt(-logarithm)) < denominator) logarithm--;
  const shift = precision - 1 - logarithm;
  const quotient = shift >= 0 ? roundedQuotient(numerator << BigInt(shift), denominator) :
    roundedQuotient(numerator, denominator << BigInt(-shift));
  return { coefficient: (left.coefficient < 0n) !== (right.coefficient < 0n) ? -quotient : quotient,
    exponent: left.exponent - right.exponent - shift };
}
function float32(value: Binary): number {
  const stored = rounded(value, 24, -149);
  if (stored.coefficient === 0n) return stored.negativeZero ? -0 : 0;
  const result = Math.fround(Number(stored.coefficient) * 2 ** stored.exponent);
  if (!Number.isFinite(result)) throw new Error('Native float32 overflow/nonfinite exception domain is unsupported.');
  return result;
}
function inputFloat32(value: number): number { return float32(binary(value)); }
function unsignedRegister(value: number, precision: NativeClockPrecision): Binary {
  const signed = value | 0;
  const result = binary(signed);
  // FILD loads int32 exactly. Only the negative half uses the rounded FADD bias.
  return signed < 0 ? add(result, binary(U32_PERIOD), precision) : result;
}
function fistpLow32(seconds: number): number {
  // A stored float32 is exactly representable in JS; truncation is therefore exact here.
  const truncated = BigInt(Math.trunc(seconds));
  if (truncated < signed64Min || truncated >= signed64MaxExclusive) {
    throw new Error('Native signed64 FISTP overflow/exception state is unsupported.');
  }
  return Number(BigInt.asUintN(32, truncated));
}
function validCalendar(calendar: NativeCalendar): boolean {
  return !!calendar && [calendar.year, calendar.day, calendar.hour, calendar.minute, calendar.second].every(isU32);
}
function calendarSeconds(calendar: NativeCalendar, precision: NativeClockPrecision): number {
  const value = (calendar.second + Math.imul((calendar.minute + Math.imul(calendar.hour, 60)) >>> 0, 60)) >>> 0;
  return float32(unsignedRegister(value, precision));
}
const dayTime = (hour: number): 0 | 1 | 2 | 3 => hour >= 22 ? 3 : hour >= 20 ? 2 : hour >= 8 ? 1 : hour >= 6 ? 0 : 3;

/** Source arithmetic helpers for the physical gCClock_PS adapter. They perform
 * no advancing read, property write or engine-consumer dispatch. */
export function nativeClockCalendarDate(calendar: NativeCalendar, precision: NativeClockPrecision): NativeTimeAndDate {
  if (!validCalendar(calendar) || !precisionValid(precision)) throw new Error('Known native calendar/precision required.');
  return { years: calendar.year, days: calendar.day, seconds: calendarSeconds(calendar, precision) };
}
export function nativeClockPublishedCalendar(date: NativeTimeAndDate): NativeCalendar {
  if (!isU32(date.years) || !isU32(date.days) || !Object.is(date.seconds, Math.fround(date.seconds))) {
    throw new Error('Native time/date storage required.');
  }
  const seconds = fistpLow32(date.seconds);
  return { year: date.years, day: date.days, hour: Math.floor(seconds / 3600),
    minute: Math.floor((seconds % 3600) / 60), second: seconds % 60 };
}
export function nativeClockDayTime(hour: number): 0 | 1 | 2 | 3 {
  if (!isU32(hour)) throw new Error('Native published Hour DWORD required.');
  return dayTime(hour);
}
export function nativeClockWeatherDayTime(date: NativeTimeAndDate, precision: NativeClockPrecision): number {
  if (!isU32(date.years) || !isU32(date.days) || !precisionValid(precision)) throw new Error('Native weather clock operands required.');
  const days = add(divide(binary(date.seconds), binary(86400), precision), unsignedRegister(date.days, precision), precision);
  return float32(add(multiply(unsignedRegister(date.years, precision), binary(365), precision), days, precision));
}

interface ClockState {
  adjustment: NativeClockAdjustment; timeAndDate: NativeTimeAndDate; calendar: NativeCalendar;
  lastTimestamp: number; pendingSeconds: number; paused: boolean;
}
function initialState(): ClockState {
  return { adjustment: { factor: 1, secondsPerDay: 86400, daysPerYear: 365 },
    timeAndDate: { years: 0, days: 0, seconds: 0 }, calendar: { year: 0, day: 0, hour: 0, minute: 0, second: 0 },
    lastTimestamp: 0, pendingSeconds: -1, paused: true };
}

/**
 * Mutable and revisioned. Every transition computes a detached draft before one commit.
 * Clock consumers/session scheduling are caller responsibilities; they do not disable arithmetic.
 * The selected nearest-even precision profile is explicit and is not a captured live native FPU state.
 */
export class NativeWorldClock {
  private state: ClockState = initialState();
  private revision = 0;
  private transitioning = false;
  private publishedCalendarBound = false;

  constructor(private readonly timestamps: NativeClockTimestampSource,
    readonly precisionBits: NativeClockPrecision) {
    if (timestamps.profile !== 'selected-host-monotonic-u32-milliseconds' ||
        typeof timestamps.readMilliseconds !== 'function' || !precisionValid(precisionBits)) {
      throw new Error('An explicit native clock timestamp/precision profile is required.');
    }
  }

  /** Ordinary world property read: Set(date), then Adjust(factor,86400,365), initially paused. */
  static fromSource(seed: NativeClockSourceSeed, timestamps: NativeClockTimestampSource,
    precisionBits: NativeClockPrecision): NativeWorldClock {
    if (seed.schema !== 'gothic3-world-clock-v1' || seed.schemaVersion !== 1 || !validCalendar(seed.calendar) ||
        !/^[a-f0-9]{64}$/.test(seed.source?.sha256 ?? '') || !isU32(seed.adjustment?.secondsPerDay) ||
        !isU32(seed.adjustment?.daysPerYear)) throw new Error('Invalid original clock source seed.');
    const clock = new NativeWorldClock(timestamps, precisionBits);
    clock.state.calendar = { ...seed.calendar };
    clock.state.timeAndDate = { years: seed.calendar.year, days: seed.calendar.day,
      seconds: calendarSeconds(seed.calendar, precisionBits) };
    clock.state.adjustment = { factor: inputFloat32(seed.factor), secondsPerDay: seed.adjustment.secondsPerDay,
      daysPerYear: seed.adjustment.daysPerYear };
    return clock;
  }

  snapshot(): NativeWorldClockSnapshot {
    return { revision: this.revision, adjustment: { ...this.state.adjustment },
      timeAndDate: this.timeAndDate(), calendar: this.calendar(), lastTimestamp: this.state.lastTimestamp,
      pendingSeconds: this.state.pendingSeconds, paused: this.state.paused,
      arithmetic: { precisionBits: this.precisionBits, rounding: 'nearest-even', capturedNativeEnvironment: false },
      timestampProfile: this.timestamps.profile };
  }
  /** No advancing native read. */
  timeAndDate(): NativeTimeAndDate { return { ...this.state.timeAndDate }; }
  /** Last gCClock_PS property publication, not a timer read. */
  calendar(): NativeCalendar { return { ...this.state.calendar }; }
  /** One physical gCClock_PS calendar view. Accessor-backed fields may alias
   * its actual Year/Day/Hour/Minute/Second storage. This binding never reads or
   * changes the lower bCClock date. Bind once before exposing the instance. */
  bindPublishedCalendar(calendar: NativeCalendar): void {
    if (this.transitioning || this.publishedCalendarBound || !validCalendar(calendar)) {
      throw new Error('Native published calendar is invalid, busy or already bound.');
    }
    this.state.calendar = calendar;
    this.publishedCalendarBound = true;
  }
  isPaused(): boolean { return this.state.paused; }
  /** SetStatus(Running) copies these property DWORDs, without minutes/seconds or another tick. */
  questClock(): NativeClock {
    return { years: this.state.calendar.year, days: this.state.calendar.day, hours: this.state.calendar.hour };
  }
  /** Native GetTimeStampInSeconds is seconds within the property day, not total lifetime seconds. */
  timestampInSeconds(): number {
    const calendar = this.state.calendar;
    return (calendar.second + Math.imul((calendar.minute + Math.imul(calendar.hour, 60)) >>> 0, 60)) >>> 0;
  }

  private commit<T>(expectedRevision: number, compute: (draft: ClockState) => T): NativeClockTransition<T> {
    if (this.transitioning) return { kind: 'rejected', revision: this.revision, reason: 'Reentrant native clock transition.' };
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== this.revision) {
      return { kind: 'rejected', revision: this.revision, reason: 'Native clock revision changed.' };
    }
    if (this.revision === Number.MAX_SAFE_INTEGER) return { kind: 'unsupported', revision: this.revision, reason: 'Clock revision capacity exhausted.' };
    const calendar = this.state.calendar, detachedCalendar = { ...calendar };
    const draft: ClockState = { ...this.state, adjustment: { ...this.state.adjustment },
      timeAndDate: { ...this.state.timeAndDate }, calendar: detachedCalendar };
    this.transitioning = true;
    try {
      const value = compute(draft);
      // Set/Adjust/Pause/Resume/GetTimeAndDate do not publish property DWORDs.
      // In particular, they must not restore a stale calendar snapshot after a
      // host timer read. Process alone replaces its calendar draft deliberately.
      if (draft.calendar !== detachedCalendar) Object.assign(calendar, draft.calendar);
      draft.calendar = calendar;
      this.state = draft;
      this.revision++;
      return { kind: 'applied', revision: this.revision, value };
    } catch (error) {
      return { kind: 'unsupported', revision: this.revision, reason: String(error) };
    } finally { this.transitioning = false; }
  }
  adjust(adjustment: NativeClockAdjustment, expectedRevision = this.revision): NativeClockTransition<NativeClockAdjustment> {
    return this.commit(expectedRevision, (draft) => {
      if (!isU32(adjustment.secondsPerDay) || !isU32(adjustment.daysPerYear)) throw new Error('Clock divisors must be native uint32 values.');
      draft.adjustment = { ...adjustment, factor: inputFloat32(adjustment.factor) };
      return { ...draft.adjustment };
    });
  }
  /** bCClock::Set; gCClock_PS published properties are intentionally not changed by this lower-level call. */
  set(date: NativeTimeAndDate, expectedRevision = this.revision): NativeClockTransition<NativeTimeAndDate> {
    return this.commit(expectedRevision, (draft) => {
      if (!isU32(date.years) || !isU32(date.days)) throw new Error('Clock years/days must be native uint32 values.');
      draft.timeAndDate = { years: date.years, days: date.days, seconds: inputFloat32(date.seconds) };
      draft.pendingSeconds = -1;
      return { ...draft.timeAndDate };
    });
  }
  pause(expectedRevision = this.revision): NativeClockTransition<boolean> {
    return this.commit(expectedRevision, (draft) => { draft.paused = true; draft.pendingSeconds = -1; return true; });
  }
  /** Native Resume clears only paused. It does not sample/reset the baseline by itself. */
  resume(expectedRevision = this.revision): NativeClockTransition<boolean> {
    return this.commit(expectedRevision, (draft) => { draft.paused = false; return false; });
  }
  private advance(draft: ClockState): { date: NativeTimeAndDate; samples: number[] } {
    const precision = this.precisionBits, samples: number[] = [];
    const sample = (): number => {
      const value = this.timestamps.readMilliseconds();
      if (!isU32(value)) throw new Error('Timestamp host did not return uint32 milliseconds.');
      samples.push(value);
      return value;
    };
    if (draft.pendingSeconds === -1) { draft.lastTimestamp = sample(); draft.pendingSeconds = 0; }
    if (!draft.paused) {
      const elapsed = (sample() - draft.lastTimestamp) >>> 0;
      const multiplied = multiply(unsignedRegister(elapsed, precision), binary(draft.adjustment.factor), precision);
      const delta = float32(multiply(multiplied, binary(MILLISECONDS_TO_SECONDS), precision));
      draft.pendingSeconds = float32(add(binary(delta), binary(draft.pendingSeconds), precision));
      draft.lastTimestamp = sample();
    }
    const date = draft.timeAndDate;
    date.seconds = float32(add(binary(date.seconds), binary(draft.pendingSeconds), precision));
    draft.pendingSeconds = 0;
    const secondsU32 = fistpLow32(date.seconds);
    const { secondsPerDay, daysPerYear } = draft.adjustment;
    if (secondsPerDay === 0 || daysPerYear === 0) throw new Error('Native unsigned calendar division by zero is unsupported.');
    const wholeDays = Math.floor(secondsU32 / secondsPerDay);
    const wholeDaySeconds = Math.imul(secondsPerDay, wholeDays) >>> 0;
    const accumulatedDays = (date.days + wholeDays) >>> 0;
    const wholeYears = Math.floor(accumulatedDays / daysPerYear);
    const subtraction = unsignedRegister(wholeDaySeconds, precision);
    date.seconds = float32(add(binary(date.seconds), { ...subtraction, coefficient: -subtraction.coefficient,
      negativeZero: subtraction.coefficient === 0n && subtraction.negativeZero !== true }, precision));
    date.years = (date.years + wholeYears) >>> 0;
    date.days = (accumulatedDays - Math.imul(daysPerYear, wholeYears)) >>> 0;
    return { date: { ...date }, samples };
  }
  /** The native read is an advancing operation; snapshot/timeAndDate/calendar are read-only. */
  getTimeAndDate(expectedRevision = this.revision): NativeClockTransition<NativeTimeAndDate> {
    return this.commit(expectedRevision, (draft) => this.advance(draft).date);
  }
  process(expectedRevision = this.revision): NativeClockTransition<NativeClockProcess> {
    return this.commit(expectedRevision, (draft) => {
      const { date, samples } = this.advance(draft);
      // Game20208266 reads the old published Hour after GetTimeAndDate.
      const previousDayTime = dayTime(this.state.calendar.hour);
      const seconds = fistpLow32(date.seconds);
      draft.calendar = { year: date.years, day: date.days, hour: Math.floor(seconds / 3600),
        minute: Math.floor((seconds % 3600) / 60), second: seconds % 60 };
      const nextDayTime = dayTime(draft.calendar.hour);
      // Game 0x202082dd..0x2020831e: seconds/86400 + day, then year*365 + that sum; float32 argument.
      const days = add(divide(binary(date.seconds), binary(86400), this.precisionBits),
        unsignedRegister(date.days, this.precisionBits), this.precisionBits);
      const weather = float32(add(multiply(unsignedRegister(date.years, this.precisionBits), binary(365), this.precisionBits),
        days, this.precisionBits));
      const consumers: NativeClockConsumer[] = [{ kind: 'weatherCurrentDayTime', days: weather, when: 'if-weather-admin-exists' }];
      if (previousDayTime !== nextDayTime) consumers.push(
        { kind: 'musicDayTime', tableIndex: nextDayTime, when: 'if-music-module-exists' },
        { kind: 'ambientDayTime', value: nextDayTime, when: 'if-ambient-module-exists' });
      return { timeAndDate: date, calendar: { ...draft.calendar }, timestampSamples: samples,
        previousDayTime, dayTime: nextDayTime, consumers };
    });
  }
}

/** Explicit browser timer selection. Backward time and invalid values reject; no dt clamp is added. */
export function monotonicClockMilliseconds(readNow: () => number): NativeClockTimestampSource {
  let previous = -Infinity;
  return { profile: 'selected-host-monotonic-u32-milliseconds', readMilliseconds: () => {
    const value = readNow();
    if (!Number.isFinite(value) || value < 0 || value < previous || !Number.isSafeInteger(Math.trunc(value))) {
      throw new Error('Clock host must supply finite, nonnegative, monotonic milliseconds.');
    }
    previous = value;
    return Math.trunc(value) % U32_PERIOD;
  } };
}

export async function loadNativeClockDocument(): Promise<NativeClockDocument> {
  const receipt = JSON.parse(receiptText) as { schema: string; nativeCodeExecuted: boolean;
    outputs: (ResourceReceipt & { url: string })[] };
  const output = receipt.outputs?.find((entry) => entry.url === 'native-clock.json');
  if (receipt.schema !== 'gothic3-native-clock-output-v1' || receipt.nativeCodeExecuted !== false || !output) {
    throw new Error('Invalid native clock output receipt.');
  }
  const document = await readNativeResource<NativeClockDocument>('clock/' + output.url, output);
  if (document.schema !== 'gothic3-native-world-clock-v1' || document.schemaVersion !== 1 ||
      document.millisecondsToSeconds !== MILLISECONDS_TO_SECONDS || document.arithmeticProfiles?.selectionRequired !== true ||
      document.arithmeticProfiles.capturedNativeControlWord !== false || document.arithmeticProfiles.rounding !== 'nearest-even') {
    throw new Error('Unsupported native clock document.');
  }
  return document;
}

/** Hash-check the separately preserved seed; do not capture a timer baseline or resume startup here. */
export async function loadOriginalWorldClock(timestamps: NativeClockTimestampSource,
  precisionBits: NativeClockPrecision): Promise<NativeWorldClock> {
  const document = await loadNativeClockDocument();
  const manifest = await gameplayResources.manifest();
  const path = manifest.initial.worldClock;
  const original = manifest.outputs.find((entry) => entry.path === path);
  if (!path || !original || 'gameplay/' + path !== document.sourceSeed.url ||
      original.bytes !== document.sourceSeed.bytes || original.sha256 !== document.sourceSeed.sha256) {
    throw new Error('Current gameplay seed differs from the clock source receipt.');
  }
  const seed = await gameplayResources.read<NativeClockSourceSeed>(path);
  return NativeWorldClock.fromSource(seed, timestamps, precisionBits);
}
