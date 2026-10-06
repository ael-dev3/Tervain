/** Physical original gCClock_PS properties, notifications and ordered consumers.
 * Full reflective construction/entity scheduling and native weather/music/ambient
 * services remain host boundaries. No absent service is inferred from a browser. */
import rulesText from '../../assets/gothic3/clock-properties/runtime-rules.json?raw';
import manifestText from '../../assets/gothic3/clock-properties/manifest.json?raw';
import type { NativeValue } from './dialogue';
import { OriginalPropertyOwner } from './native-properties';
import type { NativeSessionClock } from './session-runtime';
import { NativeWorldClock, nativeClockCalendarDate, nativeClockPublishedCalendar,
  nativeClockDayTime, nativeClockWeatherDayTime } from './world-clock';
import type { NativeCalendar, NativeClockPrecision, NativeClockTimestampSource,
  NativeClockTransition, NativeTimeAndDate } from './world-clock';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>;
  vtable: string; propertyOffsets: Record<string, number>; daysPerYear: number; secondsPerDay: number;
  musicStringsBase: string; ambientDayTime: number[]; propertyType: number };
if (rules.schema !== 'gothic3-clock-properties-rules-v1' || rules.vtable !== '206858fc' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.secondsPerDay !== 86400 || rules.daysPerYear !== 365 || rules.musicStringsBase !== '207bd478' ||
    rules.ambientDayTime.join(',') !== '0,1,2,3' || rules.propertyOffsets.Hour !== 0x1c) {
  throw new Error('Original Clock_PS property receipt differs.');
}
export interface OriginalClockValues {
  /** Native ulong getters/setters reinterpret the serialized long DWORDs. */
  Year: number; Day: number; Hour: number; Minute: number; Second: number; Factor: number;
}
export interface OriginalClockBaseStorage { referenceWord: number }
export interface OriginalClockTrace {
  operation: string; source: string; property?: string | null;
  value?: number | boolean | string | null;
}
export type OriginalClockResult<T> =
  | { supported: true; nativeReturnValue: T; trace: readonly OriginalClockTrace[];
      applied: readonly OriginalClockTrace[]; attempted: readonly OriginalClockTrace[] }
  | { supported: false; nativeReturnValue: null; reason: string; partial: boolean;
      trace: readonly OriginalClockTrace[]; applied: readonly OriginalClockTrace[];
      attempted: readonly OriginalClockTrace[] };
/** Actual captured module capabilities. A getter may prove null; an absent host
 * method means unknown. Implementations must perform the source subcall effects
 * on this exact captured object, without resolving a replacement by name/ID. */
export interface OriginalClockConsumerHost {
  weatherAdmin?(): NativeValue<object | null>;
  weatherCurrentDayTime?(admin: object, days: number): NativeValue<void>;
  ambientModule?(): NativeValue<object | null>;
  musicModule?(): NativeValue<object | null>;
  /** Exact live global bCString reference, not an invented day/night label. */
  musicDayTime?(module: object, argument: { address: string; tableIndex: 0 | 1 | 2 | 3 }): NativeValue<void>;
  ambientDayTime?(module: object, value: 0 | 1 | 2 | 3): NativeValue<void>;
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function fact<T>(value: NativeValue<T> | undefined, name: string): T {
  if (!value?.known) throw new Error(name + ': ' + (value?.reason ?? 'original dependency is unresolved'));
  return value.value;
}
function u32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new TypeError(name + ' requires uint32.');
  return value;
}
function f32(value: number, name: string): number {
  if (!Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new TypeError(name + ' requires finite stored float32.');
  return value;
}
function validate(values: OriginalClockValues): void {
  for (const key of ['Year', 'Day', 'Hour', 'Minute', 'Second'] as const) u32(values[key], key);
  f32(values.Factor, 'Factor');
}
interface Journal { trace: OriginalClockTrace[]; applied: OriginalClockTrace[]; attempted: OriginalClockTrace[] }
const setters = { Year: '2002357e', Day: '2000f9bb', Hour: '2002b094', Minute: '2002c5a2',
  Second: '20032097', Factor: '2002bfdf' } as const;
const physicalClocks = new WeakMap<OriginalClockValues, OriginalClockProperties>();

/** The original weather setter is one direct float32 write at admin+0x30.
 * This wraps an actual supplied admin field; it neither locates nor constructs
 * a weather module, sequencer, renderer or initialized engine application. */
export class OriginalClockWeatherAdmin {
  constructor(readonly identity: string, readonly storage: { currentDayTime: number }) {
    if (!identity) throw new TypeError('Actual weather admin identity required.');
    f32(storage.currentDayTime, 'Weather currentDayTime');
  }
  setCurrentDayTime(value: number): NativeValue<void> {
    try { this.storage.currentDayTime = f32(value, 'Weather currentDayTime'); return known(undefined); }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }
}

/** One physical property object, owner slot, bSTimeAndDate scratch object and
 * lower bCClock instance. Calendar accessors alias values; no mirror survives
 * a Set/Adjust/Pause/Resume/advancing read. Base storage may be an existing
 * NativeLivePropertySet, retaining that exact referenceWord field. */
export class OriginalClockProperties {
  readonly kind = 'gCClock_PS' as const;
  readonly scratch: NativeTimeAndDate = { years: 0, days: 0, seconds: 0 };
  private readonly journals: Journal[] = [];
  private blocked: string | null = null;
  private processing = false;
  readonly calendarView: NativeCalendar;
  constructor(readonly identity: string, readonly values: OriginalClockValues,
    public owner: OriginalPropertyOwner | null, readonly clock: NativeWorldClock,
    readonly base: OriginalClockBaseStorage = { referenceWord: 1 },
    private readonly consumers: OriginalClockConsumerHost = {}) {
    if (!identity) throw new TypeError('Actual Clock_PS identity is required.');
    if (physicalClocks.has(values)) throw new Error('This physical Clock_PS value storage is already bound.');
    validate(values); u32(base.referenceWord, 'Clock_PS reference word');
    this.calendarView = {
      get year() { return values.Year; }, set year(value) { values.Year = value; },
      get day() { return values.Day; }, set day(value) { values.Day = value; },
      get hour() { return values.Hour; }, set hour(value) { values.Hour = value; },
      get minute() { return values.Minute; }, set minute(value) { values.Minute = value; },
      get second() { return values.Second; }, set second(value) { values.Second = value; },
    };
    clock.bindPublishedCalendar(this.calendarView);
    physicalClocks.set(values, this);
  }
  /** Proven constructor plus PostInitializeProperties. The embedded bCClock
   * factor remains1 until Read/nonpropagated Exit adjusts it to property12. */
  static fromPostInitializedConstructor(identity: string, owner: OriginalPropertyOwner | null,
    timestamps: NativeClockTimestampSource, precision: NativeClockPrecision,
    consumers: OriginalClockConsumerHost = {}, base?: OriginalClockBaseStorage): OriginalClockProperties {
    const clock = new NativeWorldClock(timestamps, precision);
    const result = clock.set({ years: 0, days: 0, seconds: 0 });
    if (result.kind !== 'applied') throw new Error(result.reason);
    return new OriginalClockProperties(identity, { Year: 0, Day: 0, Hour: 0, Minute: 0, Second: 0, Factor: 12 },
      owner, clock, base, consumers);
  }
  failure(): string | null { return this.blocked; }
  getYear(): number { return u32(this.values.Year, 'Year'); }
  getDay(): number { return u32(this.values.Day, 'Day'); }
  getHour(): number { return u32(this.values.Hour, 'Hour'); }
  getMinute(): number { return u32(this.values.Minute, 'Minute'); }
  getSecond(): number { return u32(this.values.Second, 'Second'); }
  getFactor(): number { return f32(this.values.Factor, 'Factor'); }
  isProcessable(): true { return true; }
  propertySetType(): 32 { return 32; }
  private emit(row: OriginalClockTrace, kind: 'read' | 'write' | 'attempt' = 'read'): void {
    for (const journal of this.journals) {
      journal.trace.push({ ...row });
      if (kind === 'write') journal.applied.push({ ...row });
      if (kind === 'attempt') journal.attempted.push({ ...row });
    }
  }
  private run<T>(body: () => T): OriginalClockResult<T> {
    const journal: Journal = { trace: [], applied: [], attempted: [] };
    if (this.blocked) return { supported: false, nativeReturnValue: null, reason: this.blocked,
      partial: false, ...journal };
    this.journals.push(journal);
    try {
      const nativeReturnValue = body();
      if (this.blocked) throw new Error(this.blocked);
      return { supported: true, nativeReturnValue, ...journal };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const partial = journal.applied.length > 0 || journal.attempted.length > 0;
      if (partial) this.blocked = reason;
      return { supported: false, nativeReturnValue: null, reason, partial, ...journal };
    } finally { this.journals.pop(); }
  }
  private arithmetic<T>(operation: string, source: string, call: () => NativeClockTransition<T>): T {
    this.emit({ operation, source }, 'attempt');
    const result = call();
    if (result.kind !== 'applied') throw new Error(operation + ': ' + result.reason);
    this.emit({ operation, source }, 'write');
    return result.value;
  }
  private host<T>(operation: string, source: string, call: () => NativeValue<T> | undefined): T {
    this.emit({ operation, source }, 'attempt');
    const value = fact(call(), operation);
    if (this.blocked) throw new Error(this.blocked);
    this.emit({ operation, source }, 'write');
    return value;
  }
  private ownerRead(phase: 'enter' | 'exit', property: string | null): void {
    const owner = this.owner; // Both Engine bodies re-read the actual owner slot.
    if (owner) this.emit({ operation: 'owner.Modified read ' + phase, source: 'Engine:3003544f',
      property, value: owner.modified() });
  }
  private notifyInternal(phase: 'enter' | 'exit', property: string | null, propagated: boolean, outer: boolean): true {
    if ((phase !== 'enter' && phase !== 'exit') ||
        (property !== null && (typeof property !== 'string' || property.includes('\0'))) || typeof propagated !== 'boolean') {
      throw new TypeError('Original notification arguments required.');
    }
    if (outer) {
      this.ownerRead(phase, property);
      this.emit({ operation: 'virtual OnNotify ' + phase, source: phase === 'enter' ? 'Engine:3003b5bb' : 'Engine:3001a091', property });
    }
    if (phase === 'exit' && !propagated) {
      // Native writes scratch seconds first, then Day, then Year, and passes
      // that same scratch object to Set. Factor is re-read only after Set.
      const seconds = nativeClockCalendarDate({ year: 0, day: 0,
        hour: u32(this.values.Hour, 'Hour'), minute: u32(this.values.Minute, 'Minute'),
        second: u32(this.values.Second, 'Second') }, this.clock.precisionBits).seconds;
      this.scratch.seconds = seconds;
      this.emit({ operation: 'scratch.seconds write', source: 'Game:20007090', property, value: seconds }, 'write');
      this.scratch.days = u32(this.values.Day, 'Day');
      this.emit({ operation: 'scratch.days write', source: 'Game:20007090', property, value: this.scratch.days }, 'write');
      this.scratch.years = u32(this.values.Year, 'Year');
      this.emit({ operation: 'scratch.years write', source: 'Game:20007090', property, value: this.scratch.years }, 'write');
      this.arithmetic('bCClock.Set', 'SharedBase:1000849a', () => this.clock.set(this.scratch));
      this.arithmetic('bCClock.Adjust', 'SharedBase:100040ca', () => this.clock.adjust({
        factor: f32(this.values.Factor, 'Factor'), secondsPerDay: 86400, daysPerYear: 365 }));
    }
    this.ownerRead(phase, property);
    this.emit({ operation: 'SharedBase OnNotify return', source: phase === 'enter' ? 'SharedBase:10008805' : 'SharedBase:100027de',
      property, value: true });
    return true;
  }
  notify(phase: 'enter' | 'exit', property: string | null, propagated = false): OriginalClockResult<true> {
    return this.run(() => this.notifyInternal(phase, property, propagated, true));
  }
  onNotify(phase: 'enter' | 'exit', property: string | null, propagated = false): OriginalClockResult<true> {
    return this.run(() => this.notifyInternal(phase, property, propagated, false));
  }
  /** Derived Clock_PS.Read consumes only its u16 then direct OnNotifyExit(NULL,false).
   * Reflective property decoding and inherited base reading are caller work. */
  read(version: number): OriginalClockResult<1> {
    return this.run(() => {
      if (!Number.isInteger(version) || version < 0 || version > 0xffff) throw new TypeError('Clock Read version is uint16.');
      this.emit({ operation: 'Clock.Read u16 consumed', source: 'Game:20023e7a', value: version });
      this.notifyInternal('exit', null, false, false); return 1;
    });
  }
  private setter(property: keyof OriginalClockValues, value: number): OriginalClockResult<null> {
    return this.run(() => {
      if (property === 'Factor') f32(value, 'Factor'); else u32(value, property);
      this.notifyInternal('enter', property, false, true);
      this.values[property] = value;
      this.emit({ operation: 'property write', source: 'Game:' + setters[property], property, value }, 'write');
      this.notifyInternal('exit', property, false, true); return null;
    });
  }
  setYear(value: number): OriginalClockResult<null> { return this.setter('Year', value); }
  setDay(value: number): OriginalClockResult<null> { return this.setter('Day', value); }
  setHour(value: number): OriginalClockResult<null> { return this.setter('Hour', value); }
  setMinute(value: number): OriginalClockResult<null> { return this.setter('Minute', value); }
  setSecond(value: number): OriginalClockResult<null> { return this.setter('Second', value); }
  setFactor(value: number): OriginalClockResult<null> { return this.setter('Factor', value); }
  pause(): OriginalClockResult<null> {
    return this.run(() => { this.arithmetic('bCClock.Pause', 'SharedBase:10001b40', () => this.clock.pause()); return null; });
  }
  resume(): OriginalClockResult<null> {
    return this.run(() => { this.arithmetic('bCClock.Resume', 'SharedBase:100057f9', () => this.clock.resume()); return null; });
  }
  isPaused(): boolean { return this.clock.isPaused(); }
  isValid(): boolean { return (u32(this.base.referenceWord, 'Clock_PS reference word') & 0x80000000) !== 0; }
  create(): OriginalClockResult<1> {
    return this.run(() => {
      if (!this.isValid()) {
        this.arithmetic('bCClock.Pause', 'SharedBase:10001b40', () => this.clock.pause());
        this.base.referenceWord = (this.base.referenceWord | 0x80000000) >>> 0;
        this.emit({ operation: 'base.Create reference highbit', source: 'Engine:3003b863', value: this.base.referenceWord }, 'write');
      }
      return 1;
    });
  }
  postInitializeProperties(): OriginalClockResult<1> {
    return this.run(() => {
      for (const [property, value] of [['Year', 0], ['Day', 0], ['Hour', 0], ['Minute', 0],
        ['Second', 0], ['Factor', 12]] as const) {
        this.values[property] = value;
        this.emit({ operation: 'PostInitialize property write', source: 'Game:200187fa', property, value }, 'write');
      }
      this.emit({ operation: 'base.PostInitialize return', source: 'SharedBase:100076f8', value: 1 });
      return 1;
    });
  }
  invalidate(): OriginalClockResult<null> {
    return this.run(() => {
      for (const property of ['seconds', 'days', 'years'] as const) {
        this.scratch[property] = 0;
        this.emit({ operation: 'Invalidate scratch write', source: 'Game:20026049', property, value: 0 }, 'write');
      }
      this.arithmetic('bCClock.Set', 'SharedBase:1000849a', () => this.clock.set(this.scratch));
      return null;
    });
  }
  preProcess(): OriginalClockResult<null> { return this.run(() => null); }
  /** Publication has no Notify calls. Weather runs before daytime comparison;
   * on change, Ambient is captured before Music, then Music runs before Ambient.
   * All captured date/daytime arguments survive consumer reentrant setters. */
  process(): OriginalClockResult<null> {
    return this.run(() => {
      if (this.processing) {
        this.blocked = 'Reentrant Clock_PS.OnProcess is outside this profile.';
        throw new Error(this.blocked);
      }
      this.processing = true;
      try {
        this.emit({ operation: 'base.OnProcess empty', source: 'Engine:3002a25c' });
        const date = this.arithmetic('bCClock.GetTimeAndDate', 'SharedBase:10008670', () => this.clock.getTimeAndDate());
        Object.assign(this.scratch, date);
        this.emit({ operation: 'scratch time/date copy', source: 'Game:20025a13' }, 'write');
        const calendar = nativeClockPublishedCalendar(date);
        const previous = nativeClockDayTime(u32(this.values.Hour, 'old Hour'));
        const current = nativeClockDayTime(calendar.hour);
        for (const [property, value] of [['Year', calendar.year], ['Day', calendar.day], ['Hour', calendar.hour],
          ['Minute', calendar.minute], ['Second', calendar.second]] as const) {
          this.values[property] = value;
          this.emit({ operation: 'process property publication', source: 'Game:20025a13', property, value }, 'write');
        }
        //202082dd..2020831e computes this storedfloat before the admin lookup,
        //even when the original admin pointer will turn out to be null.
        const weatherTime = nativeClockWeatherDayTime(date, this.clock.precisionBits);
        const weather = this.host('GetWeatherAdmin', 'Game:2000d8af', () => this.consumers.weatherAdmin?.());
        if (weather !== null) this.host('Weather.SetCurrentDayTime', 'Engine:3004070f',
          () => this.consumers.weatherCurrentDayTime?.(weather, weatherTime));
        if (previous !== current) {
          const ambient = this.host('GetAmbientModule', 'Game:20017b4d', () => this.consumers.ambientModule?.());
          const music = this.host('GetMusicModule', 'Game:2002f8a1', () => this.consumers.musicModule?.());
          if (music !== null) this.host('Music.SetDayTime', 'Game:200268dc', () => this.consumers.musicDayTime?.(music,
            { tableIndex: current, address: (0x207bd478 + current * 4).toString(16) }));
          if (ambient !== null) this.host('Ambient.SetDayTime', 'Game:20022b15',
            () => this.consumers.ambientDayTime?.(ambient, current));
        }
        return null;
      } finally { this.processing = false; }
    });
  }
  sessionAdapter(): NativeSessionClock {
    const value = (result: OriginalClockResult<null>): NativeValue<void> => result.supported
      ? known(undefined) : { known: false, reason: result.reason };
    return { setHour: hour => value(this.setHour(hour)), setFactor: factor => value(this.setFactor(factor)),
      pause: () => value(this.pause()), resume: () => value(this.resume()) };
  }
}

export interface OriginalClockSeed {
  schema: 'gothic3-original-clock-property-seed-v1'; phase: 'serialized-before-derived-Clock-Read';
  entity: { key: string; name: 'World_MCP'; guid20: string };
  values: OriginalClockValues; derivedReadVersion: number;
  source: { archive: string; path: string; sha256: string; propertySetSourceOffset: number };
}
const manifest = JSON.parse(manifestText) as { schema: string; seed: ResourceReceipt & { path: string } };
if (manifest.schema !== 'gothic3-clock-properties-manifest-v1' || manifest.seed.path !== 'serialized-clock.json') {
  throw new Error('Original Clock_PS seed receipt differs.');
}
const loadedSeeds = new WeakSet<OriginalClockSeed>();
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export async function loadOriginalClockSeed(): Promise<OriginalClockSeed> {
  const seed = await readNativeResource<OriginalClockSeed>('clock-properties/' + manifest.seed.path, manifest.seed);
  if (seed.schema !== 'gothic3-original-clock-property-seed-v1' || seed.phase !== 'serialized-before-derived-Clock-Read' ||
      seed.entity.name !== 'World_MCP' || seed.entity.key !== 'world-2419:1' ||
      seed.entity.guid20 !== '7d1ccbd0bc24884d8fcb75ce15a713c700000000') throw new Error('Unsupported original loaded Clock_PS.');
  validate(seed.values);
  if (seed.derivedReadVersion !== 1 || seed.source.sha256 !== '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938' ||
      seed.source.propertySetSourceOffset !== 1121) throw new Error('Unsupported original Clock_PS serialization.');
  loadedSeeds.add(seed); return freeze(seed);
}
/** Bind a previously decoded actual entity PS store after matching the verified
 * seed, and run its derived Read. No separate calendar or values copy is made. */
export function bindOriginalClockProperties(seed: OriginalClockSeed, identity: string,
  values: OriginalClockValues, owner: OriginalPropertyOwner | null,
  timestamps: NativeClockTimestampSource, precision: NativeClockPrecision,
  consumers: OriginalClockConsumerHost = {}, base?: OriginalClockBaseStorage): OriginalClockProperties {
  if (!loadedSeeds.has(seed)) throw new Error('Use the hash-verified original Clock_PS seed.');
  for (const key of ['Year', 'Day', 'Hour', 'Minute', 'Second', 'Factor'] as const) {
    if (!Object.is(values[key], seed.values[key])) throw new Error('Actual Clock_PS values differ from its original loaded seed: ' + key);
  }
  const clock = new NativeWorldClock(timestamps, precision);
  const result = clock.set({ years: 0, days: 0, seconds: 0 });
  if (result.kind !== 'applied') throw new Error(result.reason);
  const properties = new OriginalClockProperties(identity, values, owner, clock, base, consumers);
  const read = properties.read(seed.derivedReadVersion);
  if (!read.supported) throw new Error(read.reason);
  return properties;
}
/** Clone the immutable decoded seed once into actual PS value storage. This
 * runs the derived Clock.Read hook, not a complete reflective entity load. */
export function createOriginalClockProperties(seed: OriginalClockSeed, identity: string,
  owner: OriginalPropertyOwner | null, timestamps: NativeClockTimestampSource, precision: NativeClockPrecision,
  consumers: OriginalClockConsumerHost = {}, base?: OriginalClockBaseStorage): OriginalClockProperties {
  return bindOriginalClockProperties(seed, identity, { ...seed.values }, owner,
    timestamps, precision, consumers, base);
}
