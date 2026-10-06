/** Original PlayerMemory and gCAttribute/gCStat value storage.
 *
 * The loaded hero seed is the serialized, pre-OnGameStartUp record. Consumers
 * retain these same objects; a startup/HUD/combat view must not clone the map.
 * Attribute notifications use SharedBase and Cap, not an entity owner hook.
 * Equipment selection and inventory modifier enumeration remain their callers'
 * responsibility. This module implements the actual per-attribute effects.
 */
import manifestText from '../../assets/gothic3/player-properties/manifest.json?raw';
import { OriginalEntityPropertySet } from './native-properties';
import type { OriginalPropertyOwner, OriginalPropertyTrace } from './native-properties';
import type { NativeStartupStatSetter } from './startup';
import type { NativeSessionPlayerMemory } from './session-runtime';
import type { NativeValue } from './dialogue';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';
import type { NativePropertyObjectReference } from './entity-lifecycle';

const manifest = JSON.parse(manifestText) as {
  schema: string; allListedInstructionBytesMatchOriginalPE: boolean;
  hero: ResourceReceipt & { path: string }; rules: ResourceReceipt & { path: string };
};
if (manifest.schema !== 'gothic3-player-properties-manifest-v1' ||
    manifest.allListedInstructionBytesMatchOriginalPE !== true ||
    manifest.hero.path !== 'public/gothic3/player-properties/serialized-hero.json' ||
    manifest.rules.path !== 'public/gothic3/player-properties/runtime-rules.json') {
  throw new Error('Original player property receipt differs');
}

export interface OriginalPlayerMemoryValues extends Record<string, unknown> {
  Chapter: number; LPAttribs: number; LPPerks: number; XP: number; TutorialFlags: number;
}
export type OriginalAttributeValues =
  | { Tag: string; Modifier: number; Value: number }
  | { Tag: string; Modifier: number; Value: number; BaseMaximum: number; MaximumModifier: number };
export interface OriginalPlayerPropertyTrace {
  object: string;
  operation: 'read' | 'write' | 'notify-enter' | 'notify-exit' | 'on-notify-enter' |
    'on-notify-exit' | 'cap' | 'property-notification' | 'warning';
  field?: string; value?: number | string | boolean;
  propertyTrace?: readonly OriginalPropertyTrace[];
  source: string;
}
interface OriginalPoliticalFameArray {
  readonly kind: 'long';
  readonly count: number;
  get(index: number): number | boolean | string;
  addPoliticalFame(index: number, amount: number): number;
}
export type OriginalPlayerPropertyResult<T> =
  | { supported: true; nativeReturnValue: T; trace: readonly OriginalPlayerPropertyTrace[];
      applied: readonly OriginalPlayerPropertyTrace[]; attempted: readonly OriginalPlayerPropertyTrace[] }
  | { supported: false; nativeReturnValue: null; reason: string; partial: boolean;
      trace: readonly OriginalPlayerPropertyTrace[]; applied: readonly OriginalPlayerPropertyTrace[];
      attempted: readonly OriginalPlayerPropertyTrace[] };

/** This original warning function is required only for gCStat temp operation2.
 * An unknown/throw can have logged or performed reentrant effects already. */
export interface OriginalAttributeHost {
  warning(message: string, source: string): NativeValue<void>;
}
/** Source constructor binding to the actual retained RefBase/field storage.
 * Every access remains guarded across callbacks and allocation lifetimes. */
export interface OriginalAttributePhysicalBinding {
  guard(): void;
  readReferenceWord(): number;
  writeReferenceWord(value: number): void;
  readWrapper(): NativePropertyObjectReference | null;
  writeWrapper(value: NativePropertyObjectReference | null): void;
}

function int32(value: number, label: string): number {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new RangeError(label + ' requires an original int32');
  }
  return value;
}
function uint32(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(label + ' requires an original uint32');
  }
  return value;
}
const wrap = (value: number): number => value | 0;
const sum = (a: number, b: number): number => wrap(a + b);
const difference = (a: number, b: number): number => wrap(a - b);
const percent = (maximum: number, argument: number): number => Math.trunc(Math.imul(maximum, argument) / 100);

class Journal {
  readonly trace: OriginalPlayerPropertyTrace[] = [];
  readonly applied: OriginalPlayerPropertyTrace[] = [];
  readonly attempted: OriginalPlayerPropertyTrace[] = [];
  add(entry: OriginalPlayerPropertyTrace): void { this.trace.push(entry); }
  write(entry: OriginalPlayerPropertyTrace): void { this.add(entry); this.applied.push(entry); }
  attempt(entry: OriginalPlayerPropertyTrace): void { this.add(entry); this.attempted.push(entry); }
  finish<T>(operation: () => T): OriginalPlayerPropertyResult<T> {
    try { return { supported: true, nativeReturnValue: operation(), trace: this.trace,
      applied: this.applied, attempted: this.attempted }; }
    catch (error) { return { supported: false, nativeReturnValue: null,
      reason: error instanceof Error ? error.message : String(error),
      partial: this.applied.length > 0 || this.attempted.length > 0,
      trace: this.trace, applied: this.applied, attempted: this.attempted }; }
  }
}

/** One physical original attribute object, with its audited concrete vtable.
 * This intentionally exposes actual mutable storage, never a copied stats view.
 * Extending the class or replacing its virtual methods is outside this profile. */
export class OriginalNativeAttribute {
  private detachedReferenceWord = 1;
  private detachedWrapper: NativePropertyObjectReference | null = null;
  constructor(readonly identity: string, readonly kind: 'gCAttribute' | 'gCStat',
    readonly values: OriginalAttributeValues, private readonly host: OriginalAttributeHost | null = null,
    private readonly physical: OriginalAttributePhysicalBinding | null = null) {
    if (!identity || (!physical && typeof values.Tag !== 'string') || !['gCAttribute', 'gCStat'].includes(kind) ||
        (kind === 'gCStat') !== ('BaseMaximum' in values)) throw new TypeError('Supply the actual native attribute class and fields');
    if (!physical) {
      int32(values.Value, 'BaseValue'); int32(values.Modifier, 'Modifier');
      if ('BaseMaximum' in values) { int32(values.BaseMaximum, 'BaseMaximum'); int32(values.MaximumModifier, 'MaximumModifier'); }
    }
  }
  get className(): 'gCAttribute' | 'gCStat' { this.exact(); return this.kind; }
  get referenceWord(): number { this.exact(); return this.physical?.readReferenceWord() ?? this.detachedReferenceWord; }
  set referenceWord(value: number) { this.exact(); uint32(value, 'native reference word'); if (this.physical) this.physical.writeReferenceWord(value); else this.detachedReferenceWord = value; this.exact(); }
  get wrapper(): NativePropertyObjectReference | null { this.exact(); return this.physical?.readWrapper() ?? this.detachedWrapper; }
  set wrapper(value: NativePropertyObjectReference | null) { this.exact(); if (this.physical) this.physical.writeWrapper(value); else this.detachedWrapper = value; this.exact(); }
  private exact(): void { this.physical?.guard(); }
  /** gCAttribute ApplyDefaults; gCStat first initializes its own two fields. */
  static fromConstructor(identity: string, kind: 'gCAttribute' | 'gCStat', host: OriginalAttributeHost | null = null): OriginalNativeAttribute {
    return new OriginalNativeAttribute(identity, kind, kind === 'gCStat'
      ? { Tag: '', Modifier: 0, Value: 100, BaseMaximum: 100, MaximumModifier: 0 }
      : { Tag: '', Modifier: 0, Value: 100 }, host);
  }
  getValue(): number { this.exact(); return sum(int32(this.values.Value, 'live BaseValue'), int32(this.values.Modifier, 'live Modifier')); }
  getMaximum(): number {
    this.exact();
    return 'BaseMaximum' in this.values
      ? sum(int32(this.values.BaseMaximum, 'live BaseMaximum'), int32(this.values.MaximumModifier, 'live MaximumModifier'))
      : this.getValue();
  }
  getBaseValue(): number { this.exact(); return int32(this.values.Value, 'live BaseValue'); }
  getModifier(): number { this.exact(); return int32(this.values.Modifier, 'live Modifier'); }
  getBaseMaximum(): number | null { this.exact(); return 'BaseMaximum' in this.values ? int32(this.values.BaseMaximum, 'live BaseMaximum') : null; }
  getMaximumModifier(): number | null { this.exact(); return 'MaximumModifier' in this.values ? int32(this.values.MaximumModifier, 'live MaximumModifier') : null; }
  setValue(value: number): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => { this.value(int32(value, 'Value'), journal); return null; });
  }

  private read(field: 'Value' | 'Maximum', journal: Journal): number {
    const value = field === 'Value' ? this.getValue() : this.getMaximum();
    journal.add({ object: this.identity, operation: 'read', field, value,
      source: field === 'Value' ? 'Game:2001acee' : this.kind === 'gCStat' ? 'Game:20027c96' : 'Game:20019754' });
    return value;
  }
  private write(field: 'Value' | 'Modifier' | 'BaseMaximum' | 'MaximumModifier', value: number, journal: Journal, source: string): void {
    this.exact();
    int32(value, field);
    if (field === 'Value' || field === 'Modifier') this.values[field] = value;
    else if ('BaseMaximum' in this.values) this.values[field] = value;
    else throw new Error('Only original gCStat owns ' + field);
    journal.write({ object: this.identity, operation: 'write', field, value, source });
  }
  private notify(phase: 'enter' | 'exit', property: string, journal: Journal, propagated = false): void {
    this.exact();
    journal.add({ object: this.identity, operation: phase === 'enter' ? 'notify-enter' : 'notify-exit',
      field: property, value: propagated, source: phase === 'enter' ? 'SharedBase:10001186' : 'SharedBase:10005a65' });
    journal.add({ object: this.identity, operation: phase === 'enter' ? 'on-notify-enter' : 'on-notify-exit',
      field: property, value: propagated, source: phase === 'enter' ? 'SharedBase:10008805' : 'Game:2002e2b2' });
    if (phase === 'exit' && !propagated) this.cap(journal);
  }
  /** Descriptor virtual+38 uses its registered name and literal true. The
   * original Exit callback consequently skips Cap; setter false still caps. */
  notifyReflectedProperty(phase: 'enter' | 'exit', property: string): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => {
      if (!['Tag', 'Modifier', 'Value', ...(this.kind === 'gCStat' ? ['BaseMaximum', 'MaximumModifier'] : [])].includes(property)) throw new Error('Actual registered attribute descriptor required');
      this.notify(phase, property, journal, true); return null;
    });
  }
  notifyTag(phase: 'enter' | 'exit'): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => { this.notify(phase, 'Tag', journal); return null; });
  }
  /** SetValue adjusts the base by the live modifier, then invokes virtual Cap. */
  value(value: number, journal: Journal): void {
    this.exact();
    this.write('Value', difference(value, this.getModifier()), journal, 'Game:20397a70');
    this.cap(journal);
  }
  maximum(value: number, journal: Journal): void {
    this.exact();
    if (!('BaseMaximum' in this.values)) return; // original gCAttribute SetMaximum is empty
    this.read('Maximum', journal); // original discarded virtual GetMaximum call
    this.write('BaseMaximum', difference(value, int32(this.values.MaximumModifier, 'MaximumModifier')), journal, 'Game:2039aef0');
    this.cap(journal);
  }
  property(field: 'Value' | 'Modifier' | 'BaseMaximum' | 'MaximumModifier', value: number, journal: Journal, source?: string): void {
    this.exact();
    if ((field === 'BaseMaximum' || field === 'MaximumModifier') && this.kind !== 'gCStat') {
      throw new Error('Only original gCStat owns ' + field);
    }
    const name = field === 'Value' ? 'BaseValue' : field;
    this.notify('enter', name, journal);
    this.write(field, value, journal, source ?? (field === 'Value' ? 'Game:2031d7c0' : field === 'Modifier'
      ? 'Game:2031d720' : field === 'BaseMaximum' ? 'Game:20009ceb' : 'Game:20035efe'));
    this.notify('exit', name, journal);
  }
  cap(journal: Journal): void {
    this.exact();
    journal.add({ object: this.identity, operation: 'cap', source: this.kind === 'gCStat' ? 'Game:2039b1d0' : 'Game:200213a5' });
    if (this.kind === 'gCStat' && this.read('Maximum', journal) < 0) this.maximum(0, journal);
    const maximum = this.read('Maximum', journal), current = this.read('Value', journal);
    if (maximum < current) this.value(maximum, journal);
    else if (current < 0) this.value(0, journal);
  }
  /** Native permanent modifier operations, including the original op5 setter. */
  permanent(operation: number, argument: number, journal: Journal): boolean {
    this.exact();
    if (this.kind === 'gCStat') {
      let delta: number;
      switch (operation) {
        case 1:
          this.maximum(sum(this.read('Maximum', journal), argument), journal);
          this.value(sum(this.read('Value', journal), argument), journal); break;
        case 2:
          delta = percent(this.read('Maximum', journal), argument);
          this.value(sum(this.read('Value', journal), delta), journal); break;
        case 3:
          delta = percent(this.read('Maximum', journal), argument);
          this.maximum(sum(this.read('Maximum', journal), delta), journal);
          this.value(sum(this.read('Value', journal), delta), journal); break;
        case 5: {
          const old = this.read('Maximum', journal);
          delta = difference(argument, old);
          this.maximum(old, journal); // source writes OLD maximum, not argument
          if (delta > 0) this.value(sum(this.read('Value', journal), delta), journal);
          break;
        }
        case 6: this.value(percent(this.read('Maximum', journal), argument), journal); break;
        case 7: {
          const next = percent(this.read('Maximum', journal), argument);
          delta = difference(next, this.read('Maximum', journal));
          this.maximum(next, journal);
          if (delta > 0) this.value(sum(this.read('Value', journal), delta), journal);
          break;
        }
        case 8: this.value(this.read('Maximum', journal), journal); break;
      }
    }
    // The original stat body always returns the base implementation's boolean.
    if (operation === 0) { this.value(sum(this.read('Value', journal), argument), journal); return true; }
    if (operation === 4) { this.value(argument, journal); return true; }
    return false;
  }
  temporary(operation: number, argument: number, remove: boolean, journal: Journal): boolean {
    this.exact();
    if (this.kind === 'gCStat') {
      if (operation === 1) {
        if (!('BaseMaximum' in this.values)) throw new Error('Missing actual stat fields');
        this.write('MaximumModifier', remove ? difference(this.values.MaximumModifier, argument)
          : sum(this.values.MaximumModifier, argument), journal, remove ? 'Game:2039b150' : 'Game:2039b0d0');
        this.cap(journal);
      } else if (operation === 2) {
        const source = remove ? 'Game:2039b196' : 'Game:2039b116';
        const message = 'gCStat::' + (remove ? 'UnapplyTemp' : 'ApplyTemp') +
          ' -> EOp_AddPercentageToVal cannot be used as a modifier.';
        if (this.host === null) throw new Error(source + ': original warning host is unavailable');
        journal.attempt({ object: this.identity, operation: 'warning', value: message, source });
        const result = this.host.warning(message, source);
        if (!result.known) throw new Error(source + ': ' + result.reason);
        this.exact();
      } else if (operation === 3) {
        if (!('BaseMaximum' in this.values)) throw new Error('Missing actual stat fields');
        // The compiler divides the argument FIRST, then FILD/FIMUL BaseMaximum.
        // Exact IMUL signed-high, SAR5, add-sign correction from both bodies.
        const shifted = (BigInt(argument) * (remove ? -1374389535n : 1374389535n)) >> 37n;
        const quotient = Number(shifted + (shifted < 0n ? 1n : 0n));
        const product = BigInt(quotient) * BigInt(int32(this.values.BaseMaximum, 'BaseMaximum'));
        // Exact binary32 integers are also exact under either wider x87
        // precision and every rounding mode. Do not infer a live FPU control
        // word merely from the product fitting an integer register.
        if (product < -2147483648n || product > 2147483647n) {
          throw new Error('Game:20465320 needs live CPU conversion flag DWORD207d2b50 for an out-of-int32 product');
        }
        if (Math.fround(Number(product)) !== Number(product)) {
          throw new Error('Game:2039b107/2039b187 needs a live x87 precision/rounding profile for a non-binary32-exact integer product');
        }
        this.write('MaximumModifier', sum(this.values.MaximumModifier, Number(product)), journal,
          remove ? 'Game:2039b150' : 'Game:2039b0d0');
        this.cap(journal);
      }
    }
    if (operation !== 0) return false;
    this.write('Modifier', remove ? difference(this.getModifier(), argument) : sum(this.getModifier(), argument),
      journal, remove ? 'Game:2000f808' : 'Game:200259d2');
    this.cap(journal);
    return true;
  }
  setMaximum(value: number): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => { this.maximum(int32(value, 'Maximum'), journal); return null; });
  }
  setBaseValue(value: number): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => { this.property('Value', int32(value, 'BaseValue'), journal, 'Game:2001808e'); return null; });
  }
  setModifier(value: number): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => { this.property('Modifier', int32(value, 'Modifier'), journal, 'Game:20012693'); return null; });
  }
  setBaseMaximum(value: number): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => { this.property('BaseMaximum', int32(value, 'BaseMaximum'), journal); return null; });
  }
  setMaximumModifier(value: number): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => { this.property('MaximumModifier', int32(value, 'MaximumModifier'), journal); return null; });
  }
  applyPermanent(operation: number, argument: number): OriginalPlayerPropertyResult<boolean> {
    const journal = new Journal(); return journal.finish(() => this.permanent(int32(operation, 'Operation'), int32(argument, 'Argument'), journal));
  }
  applyTemporary(operation: number, argument: number): OriginalPlayerPropertyResult<boolean> {
    const journal = new Journal(); return journal.finish(() => this.temporary(int32(operation, 'Operation'), int32(argument, 'Argument'), false, journal));
  }
  unapplyTemporary(operation: number, argument: number): OriginalPlayerPropertyResult<boolean> {
    const journal = new Journal(); return journal.finish(() => this.temporary(int32(operation, 'Operation'), int32(argument, 'Argument'), true, journal));
  }
}

const STARTUP_TAGS: Record<NativeStartupStatSetter, { tag: string; maximum: boolean }> = {
  SetHitPointsMax: { tag: 'HP', maximum: true }, SetHitPoints: { tag: 'HP', maximum: false },
  SetManaPointsMax: { tag: 'MP', maximum: true }, SetManaPoints: { tag: 'MP', maximum: false },
  SetStaminaPointsMax: { tag: 'SP', maximum: true }, SetStaminaPoints: { tag: 'SP', maximum: false },
  SetStrength: { tag: 'STR', maximum: false }, SetDexterity: { tag: 'DEX', maximum: false },
  SetIntelligence: { tag: 'INT', maximum: false }, SetSmithing: { tag: 'SMT', maximum: false },
  SetTheft: { tag: 'THF', maximum: false }, SetAlchemy: { tag: 'ALC', maximum: false },
  SetProtectionBlades: { tag: 'PROT_BLADE', maximum: false }, SetProtectionImpact: { tag: 'PROT_IMPACT', maximum: false },
  SetProtectionMissile: { tag: 'PROT_MISSILE', maximum: false }, SetProtectionFire: { tag: 'PROT_FIRE', maximum: false },
  SetProtectionIce: { tag: 'PROT_ICE', maximum: false }, SetProtectionLightning: { tag: 'PROT_LIGHTNING', maximum: false },
};

/** The physical PlayerMemory PS and its original native attribute map. */
export class OriginalPlayerMemory {
  constructor(readonly properties: OriginalEntityPropertySet<OriginalPlayerMemoryValues>,
    readonly attributes: Map<string, OriginalNativeAttribute | null>) {
    if (properties.kind !== 'gCPlayerMemory_PS') throw new TypeError('Actual gCPlayerMemory_PS pointer required');
    for (const name of ['Chapter', 'LPAttribs', 'LPPerks', 'XP'] as const) int32(properties.values[name], name);
    uint32(properties.values.TutorialFlags, 'TutorialFlags');
  }
  getAttribute(tag: string): OriginalNativeAttribute | null { return this.attributes.get(tag) ?? null; }
  private politicalFameArray(): OriginalPoliticalFameArray {
    const array = this.properties.values.PoliticalFame as OriginalPoliticalFameArray | undefined;
    if (!array || array.kind !== 'long' || array.count !== 9) throw new Error('Retained nine-entry native PoliticalFame array is unavailable.');
    return array;
  }
  politicalFameValues(): readonly number[] {
    const array = this.politicalFameArray(), values: number[] = [];
    for (let index = 0; index < 9; index++) {
      const value = array.get(index);
      if (typeof value !== 'number') throw new Error('Known native PoliticalFame value is required.');
      values.push(int32(value, 'PoliticalFame'));
    }
    return values;
  }
  addPoliticalFame(alignment: number, amount: number): OriginalPlayerPropertyResult<number> {
    const journal = new Journal();
    return journal.finish(() => {
      if (!Number.isInteger(alignment) || alignment < 0 || alignment >= 9) throw new RangeError('Political alignment must select one of the nine native fame entries.');
      int32(amount, 'PoliticalFame reward');
      const array = this.politicalFameArray();
      const current = array.get(alignment);
      if (typeof current !== 'number') throw new Error('Known native PoliticalFame element is required.');
      const next = array.addPoliticalFame(alignment, amount);
      journal.write({ object: this.properties.identity, operation: 'write', field: 'PoliticalFame[' + alignment + ']', value: next, source: 'Game:20336ff0' });
      return next;
    });
  }
  setPoliticalFame(alignment: number, value: number): OriginalPlayerPropertyResult<number> {
    const journal = new Journal();
    return journal.finish(() => {
      int32(value, 'PoliticalFame save value');
      const current = this.politicalFameArray().get(alignment);
      if (typeof current !== 'number') throw new Error('Known native PoliticalFame element is required.');
      const result = this.addPoliticalFame(alignment, difference(value, current));
      if (!result.supported) throw new Error(result.reason);
      journal.write({ object: this.properties.identity, operation: 'write', field: 'PoliticalFame[' + alignment + ']', value: result.nativeReturnValue, source: 'browser save restore via Game:20336ff0' });
      return result.nativeReturnValue;
    });
  }
  getValue(tag: string): number { return this.getAttribute(tag)?.getValue() ?? 0; }
  getMaximum(tag: string): number { return this.getAttribute(tag)?.getMaximum() ?? 0; }
  getBaseValue(tag: string): number { return this.getAttribute(tag)?.getBaseValue() ?? 0; }
  getModifier(tag: string): number { return this.getAttribute(tag)?.getModifier() ?? 0; }
  getChapter(): number { return int32(this.properties.values.Chapter, 'live Chapter'); }
  getLPAttribs(): number { return int32(this.properties.values.LPAttribs, 'live LPAttribs'); }
  getLPPerks(): number { return int32(this.properties.values.LPPerks, 'live LPPerks'); }
  getXP(): number { return int32(this.properties.values.XP, 'live XP'); }
  getTutorialFlags(): number { return uint32(this.properties.values.TutorialFlags, 'live TutorialFlags'); }
  private scalar(field: 'Chapter' | 'LPAttribs' | 'LPPerks' | 'XP' | 'TutorialFlags', value: number): OriginalPlayerPropertyResult<null> {
    const journal = new Journal();
    return journal.finish(() => {
      if (field === 'TutorialFlags') uint32(value, field); else int32(value, field);
      const captured = this.properties;
      const source = 'Game:' + ({ Chapter: '20035c06', LPAttribs: '20032e98', LPPerks: '20034c70', XP: '20018241', TutorialFlags: '20029654' }[field]);
      for (const phase of ['enter', 'exit'] as const) {
        if (phase === 'exit') { captured.values[field] = value;
          journal.write({ object: captured.identity, operation: 'write', field, value, source }); }
        journal.attempt({ object: captured.identity, operation: 'property-notification', field, source });
        const result = captured.notify(phase, field, false);
        journal.add({ object: captured.identity, operation: 'property-notification', field, source, propertyTrace: result.trace });
        if (!result.supported) throw new Error(result.reason);
      }
      return null;
    });
  }
  setChapter(value: number): OriginalPlayerPropertyResult<null> { return this.scalar('Chapter', value); }
  setLPAttribs(value: number): OriginalPlayerPropertyResult<null> { return this.scalar('LPAttribs', value); }
  setLPPerks(value: number): OriginalPlayerPropertyResult<null> { return this.scalar('LPPerks', value); }
  setXP(value: number): OriginalPlayerPropertyResult<null> { return this.scalar('XP', value); }
  setTutorialFlags(value: number): OriginalPlayerPropertyResult<null> { return this.scalar('TutorialFlags', value); }
  /** EnableTutorial directly clears/sets mask bits without property Notify. */
  enableTutorial(mask: number, enable: boolean): OriginalPlayerPropertyResult<null> {
    const journal = new Journal(); return journal.finish(() => {
      uint32(mask, 'Tutorial mask');
      const flags = this.getTutorialFlags();
      this.properties.values.TutorialFlags = (enable ? flags & ~mask : flags | mask) >>> 0;
      journal.write({ object: this.properties.identity, operation: 'write', field: 'TutorialFlags',
        value: this.properties.values.TutorialFlags, source: 'Game:200061c7' });
      return null;
    });
  }
  isTutorialEnabled(mask: number): boolean { return uint32(mask, 'Tutorial mask') !== ((this.getTutorialFlags() & mask) >>> 0); }
  /** The session receives an adapter over this exact memory, with no mirror. */
  sessionAdapter(): NativeSessionPlayerMemory {
    return {
      isTutorialEnabled: (mask) => {
        try { return { known: true, value: this.isTutorialEnabled(mask) ? 1 : 0 }; }
        catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
      },
      enableTutorial: (mask, enabled) => {
        const result = this.enableTutorial(mask, enabled);
        return result.supported ? { known: true, value: undefined } : { known: false, reason: result.reason };
      },
    };
  }
  private change(tag: string, operation: 'value' | 'maximum' | 'base' | 'modifier' | 'add-value' | 'add-maximum' | 'add-base' | 'add-modifier', argument: number, journal: Journal): boolean {
    const attribute = this.getAttribute(tag); // capture this exact native attribute pointer
    if (attribute === null) return false;
    switch (operation) {
      case 'value': attribute.value(argument, journal); break;
      case 'maximum': attribute.maximum(argument, journal); break;
      case 'base': attribute.property('Value', argument, journal); break;
      case 'modifier': attribute.property('Modifier', argument, journal); break;
      case 'add-value': attribute.value(sum(attribute.getValue(), argument), journal); break;
      case 'add-maximum':
        attribute.maximum(sum(attribute.getMaximum(), argument), journal);
        attribute.value(sum(attribute.getValue(), argument), journal); break;
      case 'add-base': attribute.property('Value', sum(attribute.getBaseValue(), argument), journal); break;
      case 'add-modifier': attribute.property('Modifier', sum(attribute.getModifier(), argument), journal); break;
    }
    return true;
  }
  setValue(tag: string, value: number): OriginalPlayerPropertyResult<boolean> { const journal = new Journal(); return journal.finish(() => this.change(tag, 'value', int32(value, 'Value'), journal)); }
  setMaximum(tag: string, value: number): OriginalPlayerPropertyResult<boolean> { const journal = new Journal(); return journal.finish(() => this.change(tag, 'maximum', int32(value, 'Maximum'), journal)); }
  setBaseValue(tag: string, value: number): OriginalPlayerPropertyResult<boolean> { const journal = new Journal(); return journal.finish(() => this.change(tag, 'base', int32(value, 'BaseValue'), journal)); }
  setModifier(tag: string, value: number): OriginalPlayerPropertyResult<boolean> { const journal = new Journal(); return journal.finish(() => this.change(tag, 'modifier', int32(value, 'Modifier'), journal)); }
  addValue(tag: string, value: number): OriginalPlayerPropertyResult<boolean> { const journal = new Journal(); return journal.finish(() => this.change(tag, 'add-value', int32(value, 'Value'), journal)); }
  addMaximum(tag: string, value: number): OriginalPlayerPropertyResult<boolean> { const journal = new Journal(); return journal.finish(() => this.change(tag, 'add-maximum', int32(value, 'Maximum'), journal)); }
  addBaseValue(tag: string, value: number): OriginalPlayerPropertyResult<boolean> { const journal = new Journal(); return journal.finish(() => this.change(tag, 'add-base', int32(value, 'BaseValue'), journal)); }
  addModifier(tag: string, value: number): OriginalPlayerPropertyResult<boolean> { const journal = new Journal(); return journal.finish(() => this.change(tag, 'add-modifier', int32(value, 'Modifier'), journal)); }
  applyMod(tag: string, operation: number, argument: number): OriginalPlayerPropertyResult<boolean> {
    const journal = new Journal(); return journal.finish(() => {
      int32(operation, 'Operation'); int32(argument, 'Argument');
      return this.getAttribute(tag)?.temporary(operation, argument, false, journal) ?? false;
    });
  }
  unapplyMod(tag: string, operation: number, argument: number): OriginalPlayerPropertyResult<boolean> {
    const journal = new Journal(); return journal.finish(() => {
      int32(operation, 'Operation'); int32(argument, 'Argument');
      return this.getAttribute(tag)?.temporary(operation, argument, true, journal) ?? false;
    });
  }
  /** Script_Game setters for an already resolved valid PlayerMemory receiver.
   * Invalid/transformed player DamageReceiver branches are not this profile. */
  applyStartupStat(setter: NativeStartupStatSetter, value: number): OriginalPlayerPropertyResult<1> {
    const journal = new Journal(); return journal.finish(() => {
      int32(value, setter);
      const binding = STARTUP_TAGS[setter];
      if (!binding) throw new Error('Unknown original startup setter');
      const { tag, maximum } = binding;
      if (tag === 'HP' || tag === 'SP') {
        const current = this.getValue(tag), oldMaximum = this.getMaximum(tag);
        if (maximum) {
          this.change(tag, 'base', Math.max(0, current), journal);
          this.change(tag, 'maximum', value, journal);
        } else {
          let clamped = value < 1 ? 0 : value;
          if (oldMaximum < clamped) clamped = oldMaximum;
          this.change(tag, 'base', clamped, journal);
        }
      } else this.change(tag, maximum ? 'maximum' : 'base', value, journal);
      // Native wrappers ignore their native map setter's bool and return1.
      return 1;
    });
  }
}

export interface OriginalPlayerPropertySeed {
  schema: 'gothic3-original-player-property-seed-v1'; phase: 'serialized-before-OnGameStartUp';
  entity: { key: string; name: 'PC_Hero'; guid20: string };
  source: { archive: string; path: string; sha256: string; propertySetSourceOffset: number };
  memory: OriginalPlayerMemoryValues;
  attributes: readonly { key: string; kind: 'gCAttribute' | 'gCStat'; sourceOffset: number; values: OriginalAttributeValues }[];
  audit: { originalRecordBytesMatch: boolean; attributes: number; propertySetVersion: number };
}
const loadedSeeds = new WeakSet<OriginalPlayerPropertySeed>();

/** Hash-verified original loaded values. No startup effects have yet occurred. */
export async function loadOriginalPlayerPropertySeed(): Promise<OriginalPlayerPropertySeed> {
  const seed = await readNativeResource<OriginalPlayerPropertySeed>('player-properties/serialized-hero.json', manifest.hero);
  if (seed.schema !== 'gothic3-original-player-property-seed-v1' || seed.phase !== 'serialized-before-OnGameStartUp' ||
      seed.entity.name !== 'PC_Hero' || seed.entity.guid20 !== '054d6e4a5f059340bc5c2ca0cca6674500000000' ||
      seed.source.sha256 !== '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938' ||
      seed.audit.originalRecordBytesMatch !== true || seed.audit.propertySetVersion !== 5 ||
      seed.audit.attributes !== 15 || seed.attributes.length !== 15 || new Set(seed.attributes.map((entry) => entry.key)).size !== 15) {
    throw new Error('Original serialized hero property seed differs');
  }
  // Values are frozen source evidence; instantiate exactly once for each live PS.
  freezeSeed(seed); loadedSeeds.add(seed); return seed;
}
function freezeSeed(value: unknown): void {
  if (value && typeof value === 'object') { for (const item of Object.values(value)) freezeSeed(item); Object.freeze(value); }
}
const seededSets = new WeakSet<OriginalEntityPropertySet<OriginalPlayerMemoryValues>>();
/** Copies immutable loaded data once into actual native storage, then every
 * consumer shares the returned physical PS and attribute object identities. */
export function createOriginalPlayerMemory(seed: OriginalPlayerPropertySeed,
    identity: string, owner: OriginalPropertyOwner | null, host: OriginalAttributeHost | null = null): OriginalPlayerMemory {
  if (!loadedSeeds.has(seed)) throw new Error('A hash-verified original hero seed is required');
  const values = structuredClone(seed.memory);
  const ps = new OriginalEntityPropertySet(identity, 'gCPlayerMemory_PS', values, owner);
  return bindOriginalPlayerMemory(seed, ps, host);
}
/** Bind a previously allocated actual PS. It must still have the source seed's
 * values; do not overwrite an already changed or initialized physical object. */
export function bindOriginalPlayerMemory(seed: OriginalPlayerPropertySeed,
    ps: OriginalEntityPropertySet<OriginalPlayerMemoryValues>, host: OriginalAttributeHost | null = null): OriginalPlayerMemory {
  if (!loadedSeeds.has(seed) || seededSets.has(ps) || ps.kind !== 'gCPlayerMemory_PS' ||
      JSON.stringify(ps.values) !== JSON.stringify(seed.memory)) {
    throw new Error('Expected the one unbound physical PlayerMemory PS with its exact loaded seed values');
  }
  const attributes = new Map<string, OriginalNativeAttribute>();
  for (const entry of seed.attributes) attributes.set(entry.key, new OriginalNativeAttribute(
    ps.identity + '/attribute/' + entry.sourceOffset, entry.kind, structuredClone(entry.values), host));
  const memory = new OriginalPlayerMemory(ps, attributes); seededSets.add(ps); return memory;
}
