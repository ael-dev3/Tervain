/** Concrete original PlayerMemory allocation, defaults and current Read.
 * Its startup/session/HUD consumer retains the same physical scalar storage,
 * attribute objects and Map through DestroyAttributes and replacement reads.
 * Native buckets/chains retain their independent original traversal order.
 */
import rulesText from '../../assets/gothic3/player-memory-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyObjectReference } from './entity-lifecycle';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionWrapper } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import { OriginalEntityPropertySet } from './native-properties';
import type { OriginalPropertyOwner } from './native-properties';
import { OriginalPlayerMemory } from './player-properties';
import type { OriginalPlayerMemoryValues, OriginalNativeAttribute } from './player-properties';
import type { OriginalAttributeReader, NativeAttributeAllocation, NativeAttributeCStringAllocation, NativeAttributeCStringSource } from './attribute-reading';
import { originalCStringByteHash } from './cstring-hash';

interface PlayerMemoryField extends NativeReflectionField { default?: string }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; nativeBytes: number;
  propertyType: number; nativeVersion: number; allocationTag: number; fields: PlayerMemoryField[];
  nativeObjectVersion: number;
  wrapperVtable: string; sources: { clone: string; create: string; wrapperRead: string; dataRead: string } };
if (rules.schema !== 'gothic3-player-memory-reading-rules-v1' || rules.nativeBytes !== 184 ||
    rules.propertyType !== 60 || rules.nativeVersion !== 5 || rules.nativeObjectVersion !== 6 || rules.allocationTag !== 196 || rules.fields.length !== 25 ||
    rules.wrapperVtable !== '20697d2c' || !rules.sources || rules.sources.clone !== 'Game:20328880' ||
    rules.sources.create !== 'Game:2031d4a0' || rules.sources.wrapperRead !== 'Game:20320970' || rules.sources.dataRead !== 'Game:20328200' ||
    rules.fields.map(field => field.name).join(',') !== 'HideTips,PlayerKnows,PoliticalFame,PoliticalSuspectComment,PoliticalCrimeCount,PoliticalPlayerCrime,XP,LPAttribs,LPPerks,SecondsTransformRemain,SecondsMistRemain,LastWeaponConfig,LastSpell,BookOfFlood,BookOfRhobar,BookOfZuben,DuskToDawnStartHour,Chapter,TutorialFlags,TalkedToDiego,TalkedToGorn,TalkedToMilten,TalkedToLester,TimeStampStart,IsConsumingItem' ||
    rules.fields.map(field => field.nativeOffset).join(',') !== '20,24,36,48,60,72,84,88,92,124,128,96,104,132,136,140,144,148,152,156,157,158,159,160,164' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original PlayerMemory reading evidence differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const permission = Symbol('actual PlayerMemory native operation');
function fact<T>(value: NativeValue<T>, label: string): T { if (!value.known) throw new Error(label + ': ' + value.reason); return value.value; }
function uint(value: number, max = 0xffffffff): number {
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error('Actual original unsigned PlayerMemory value required'); return value;
}
function allocation(value: NativeAttributeAllocation | null, bytes: number, label: string): NativeAttributeAllocation {
  if (value === null) throw new Error(label + ': native NULL allocation/fatal or dereference branch is unresolved');
  if (!value.identity || value.freed || value.bytes.length !== bytes || value.knownMask.length !== bytes) throw new Error(label + ': actual allocation extent required');
  return value;
}
function hex(bytes: Uint8Array): string { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''); }

/** Actual CString character allocation starts at GetText and includes the
 * physical terminator. Its known mask preserves uncertain native bytes. */
export interface NativePlayerMemoryCStringAllocation extends NativeAttributeCStringAllocation {
  readonly characterBytes: Uint8Array; readonly characterKnownMask: Uint8Array;
}
export interface NativePlayerMemoryGuidScratch { readonly bytes: Uint8Array; readonly knownMask: Uint8Array; destroyed: boolean }
export interface NativePlayerMemoryUnicodeString {
  readonly identity: object; readonly slot: NativeAttributeAllocation;
  /** Actual Malloc block: DWORD ref/length/capacity, then UTF16 characters.
   * Its pointer is the original data-at+12 capability, not an invented address. */
  readonly pointer: NativeAttributeAllocation | null; destroyed: boolean;
}
export interface NativePlayerMemoryLocalizationEntry { readonly text: NativePlayerMemoryUnicodeString; readonly description: NativePlayerMemoryUnicodeString }
export interface NativePlayerMemoryReadingHost {
  allocateWrapper?(bytes: 16, tag: 0x190): NativeValue<NativeAttributeAllocation | null>;
  allocateNative?(bytes: 184, tag: 0xc4, wrapper: NativeReflectionWrapper): NativeValue<NativeAttributeAllocation | null>;
  allocateNode?(bytes: 12, tag: 0x199): NativeValue<NativeAttributeAllocation | null>;
  /** Actual MemoryAdmin.Realloc retains old bytes and returns its real backing. */
  realloc?(current: NativeAttributeAllocation | null, bytes: number): NativeValue<NativeAttributeAllocation | null>;
  free?(captured: NativeAttributeAllocation): NativeValue<void>;
  deleteNode?(captured: NativeAttributeAllocation): NativeValue<void>;
  enumDefault?(global: '207c1578'): NativeValue<{ value: number; knownMask: number }>;
  coCreateGuid?(scratch: NativePlayerMemoryGuidScratch): NativeValue<number>;
  readCString?(destination: NativePlayerMemoryCStringSlot, input: NativeEntityByteInput): NativeValue<void>;
  constructCString?(destination: NativePlayerMemoryCStringSlot, text: string): NativeValue<void>;
  assignCString?(destination: NativePlayerMemoryCStringSlot, source: NativeAttributeCStringSource): NativeValue<void>;
  concatenateCString?(destination: NativePlayerMemoryCStringSlot, prefix: string, source: NativeAttributeCStringSource): NativeValue<void>;
  freeCString?(captured: NativePlayerMemoryCStringAllocation): NativeValue<void>;
  allocateUnicode?(bytes: 16): NativeValue<NativeAttributeAllocation | null>;
  localizationAdmin?(): NativeValue<object>;
  reserveString?(admin: object, key: NativeAttributeCStringSource, entry: NativePlayerMemoryLocalizationEntry): NativeValue<boolean>;
  warning?(format: string, args: readonly (string | number)[], source: string): NativeValue<void>;
  info?(level: 5, format: string, args: readonly string[], source: string): NativeValue<void>;
}

/** One original pointer slot; writing the capability does not manufacture a
 * numeric native address. NULL is proven0; nonNULL address bits stay unknown. */
export class NativePlayerMemoryCStringSlot implements NativeAttributeCStringSource {
  private current: NativePlayerMemoryCStringAllocation | null = null;
  private destroyed = false;
  constructor(public backing: NativeAttributeAllocation, readonly nativeOffset: number,
    readonly reader: OriginalPlayerMemoryReader) { this.constructNull(); }
  constructNull(): void {
    this.reader.guard(); if (this.current !== null && !this.destroyed) throw new Error('CString construction requires fresh/ended slot');
    this.current = null; this.destroyed = false;
    this.backing.bytes.fill(0, this.nativeOffset, this.nativeOffset + 4); this.backing.knownMask.fill(255, this.nativeOffset, this.nativeOffset + 4);
  }
  get pointer(): NativePlayerMemoryCStringAllocation | null { if (this.destroyed) throw new Error('Ended original CString object lifetime'); return this.current; }
  set pointer(value: NativePlayerMemoryCStringAllocation | null) {
    this.reader.guard(); if (this.destroyed) throw new Error('Ended original CString object lifetime'); if (value !== null) this.valid(value);
    this.current = value;
    if (value === null) this.constructNull(); else this.backing.knownMask.fill(0, this.nativeOffset, this.nativeOffset + 4);
    this.reader.note('captured CString pointer assignment', 'SharedBase:1001ee90');
  }
  private valid(value: NativePlayerMemoryCStringAllocation): void {
    if (value.freed || !value.identity || value.length !== value.text.length || !Number.isInteger(value.length) || value.length < 0 ||
        !Number.isInteger(value.referenceCount) || value.referenceCount < 0 || value.referenceCount > 65535 ||
        !(value.characterBytes instanceof Uint8Array) || value.characterBytes.length < value.length + 1 ||
        value.characterKnownMask.length !== value.characterBytes.length) throw new Error('Actual live CString character allocation required');
  }
  get text(): string { const value = this.pointer; if (value === null) return ''; this.valid(value); return value.text; }
  hash(): number { const value = this.pointer; if (value === null) return originalCStringByteHash(null); this.valid(value); return originalCStringByteHash(value.characterBytes, value.characterKnownMask); }
  equals(other: NativeAttributeCStringSource): boolean {
    const left = this.pointer, right = other.pointer as NativePlayerMemoryCStringAllocation | null;
    // CString operator== distinguishes NULL from an allocated empty string
    // before its stored-length and byte comparison, even though both hash0.
    if (left === null) return right === null;
    if (right === null) return false;
    this.valid(left); this.valid(right); if (left.length !== right.length) return false;
    for (let index = 0; index <= left.length; index++) {
      if (left.characterKnownMask[index] !== 255 || right.characterKnownMask[index] !== 255) throw new Error('Unknown native CString comparison byte');
      const byte = left.characterBytes[index]!; if (byte !== right.characterBytes[index]) return false; if (byte === 0) return true;
    }
    throw new Error('Actual CString comparison requires physical terminator');
  }
  relocate(backing: NativeAttributeAllocation): void { this.reader.guard(); this.backing = backing; }
  destroy(): void {
    this.reader.guard(); if (this.destroyed) throw new Error('CString destructor already ran'); const captured = this.current;
    if (captured !== null) {
      this.valid(captured); captured.referenceCount = (captured.referenceCount - 1) & 65535;
      this.reader.note('CString destructor captured ushort reference decrement', 'SharedBase:100060c3');
      if (captured.referenceCount === 0) { this.reader.call('CString destructor MemoryAdmin.Free', 'SharedBase:100060c3', () => this.reader.host.freeCString?.(captured)); if (!captured.freed) throw new Error('Actual CString Free must end captured character allocation lifetime'); }
    }
    // The original destructor never clears the pointer slot. Array shrink
    // follows it with a separate fresh constructor; local/node objects end.
    this.destroyed = true; this.reader.note('CString object lifetime ended; original pointer bits retained', 'SharedBase:100060c3');
  }
}

export class NativePlayerMemoryArray {
  allocation: NativeAttributeAllocation | null = null;
  readonly strings: NativePlayerMemoryCStringSlot[] = [];
  constructor(readonly properties: OriginalPlayerMemoryProperties, readonly nativeOffset: number,
    readonly kind: 'long' | 'bool' | 'CString') {}
  get count(): number { return this.properties.dword(this.nativeOffset + 4) | 0; }
  set count(value: number) { this.properties.putWord(this.nativeOffset + 4, uint(value)); }
  get capacity(): number { return this.properties.dword(this.nativeOffset + 8) | 0; }
  set capacity(value: number) { this.properties.putWord(this.nativeOffset + 8, uint(value)); }
  get stride(): number { return this.kind === 'bool' ? 1 : 4; }
  get items(): readonly (number | boolean | string)[] {
    const result: (number | boolean | string)[] = [];
    for (let index = 0; index < this.count; index++) result.push(this.get(index)); return result;
  }
  get(index: number): number | boolean | string {
    if (!Number.isInteger(index) || index < 0 || index >= this.count || this.count > this.capacity || !this.allocation || this.allocation.freed) throw new Error('Actual PlayerMemory array element required');
    if (this.kind === 'CString') return this.strings[index]!.text;
    const offset = index * this.stride; if (!this.allocation.knownMask.subarray(offset, offset + this.stride).every(byte => byte === 255)) throw new Error('Unknown PlayerMemory array element bytes');
    return this.kind === 'bool' ? this.allocation.bytes[offset] !== 0 : new DataView(this.allocation.bytes.buffer, this.allocation.bytes.byteOffset).getInt32(offset, true);
  }
  /** gCQuest_PS::SetStatus writes PoliticalFame[index] += amount directly to
   * the retained bTValArray<long> backing. It does not Notify the property set. */
  addPoliticalFame(index: number, amount: number): number {
    this.properties.reader.runtimeGuard();
    if (this.kind !== 'long' || !Number.isInteger(index) || index < 0 || index >= this.count ||
        this.count !== 9 || !Number.isInteger(amount) || amount < -0x80000000 || amount > 0x7fffffff) {
      throw new Error('Original nine-entry PoliticalFame array and signed32 operands are required.');
    }
    const current = this.get(index);
    if (typeof current !== 'number' || !this.allocation || this.allocation.freed) throw new Error('Known live PoliticalFame long element is required.');
    const next = (current + amount) | 0;
    const offset = index * 4;
    this.properties.reader.note('gCQuest_PS::SetStatus PoliticalFame[' + index + '] += ' + amount, 'Game:20336ff0');
    new DataView(this.allocation.bytes.buffer, this.allocation.bytes.byteOffset).setInt32(offset, next, true);
    this.allocation.knownMask.fill(255, offset, offset + 4);
    return next;
  }
}
export interface NativePlayerMemoryNode { readonly allocation: NativeAttributeAllocation; readonly key: NativePlayerMemoryCStringSlot;
  value: OriginalNativeAttribute | null; next: NativePlayerMemoryNode | null }

export class OriginalPlayerMemoryProperties {
  readonly numericBytes: Uint8Array; readonly knownMask: Uint8Array; private readonly view: DataView;
  readonly values = {} as OriginalPlayerMemoryValues;
  readonly base: NativeLivePropertySet<OriginalPlayerMemoryValues>;
  readonly notifications: OriginalEntityPropertySet<OriginalPlayerMemoryValues>;
  readonly attributes = new Map<string, OriginalNativeAttribute | null>();
  readonly arrays = new Map<number, NativePlayerMemoryArray>();
  readonly guidScratch: NativePlayerMemoryGuidScratch[] = [];
  bucketAllocation: NativeAttributeAllocation | null = null;
  readonly buckets: (NativePlayerMemoryNode | null)[] = [];
  private owner: NativeLiveEntity | null = null;
  private propertyObject: NativePropertyObjectReference | null = null;
  private consumer: OriginalPlayerMemory | null = null;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalPlayerMemoryReader,
    readonly allocation: NativeAttributeAllocation, readonly wrapperAllocation: NativeAttributeAllocation) {
    this.numericBytes = allocation.bytes; this.knownMask = allocation.knownMask;
    this.view = new DataView(this.numericBytes.buffer, this.numericBytes.byteOffset, this.numericBytes.byteLength);
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', 'gCPlayerMemory_PS', 60, this.values,
      { read: () => this.owner, write: entity => { this.reader.guard(); this.owner = entity; this.pointerBits(0xc, entity); } }, null,
      { added: set => this.emptyCallback(set, 'Engine:30481830'), removed: set => this.emptyCallback(set, 'Engine:30481840'),
        postRead: set => this.reader.run(() => { this.exact(); if (set !== this.base) throw new Error('Same physical PlayerMemory PostRead required'); this.reader.postReadInternal(this, permission); }) }, () => known(true));
    Object.defineProperty(this.base, 'referenceWord', { get: () => this.dword(8), set: value => this.putWord(8, value) });
    Object.defineProperty(this.base, 'wrapper', { get: () => this.propertyObject, set: value => { this.propertyObject = value; this.pointerBits(4, value); } });
    Object.defineProperties(this.base.baseFlags, {
      value: { get: () => this.numericBytes[0x10]!, set: value => { this.reader.guard(); this.numericBytes[0x10] = uint(value, 255); } },
      knownMask: { get: () => this.knownMask[0x10]!, set: value => { this.reader.guard(); this.knownMask[0x10] = uint(value, 255); } },
    });
    this.notifications = new OriginalEntityPropertySet(this.base.identity, 'gCPlayerMemory_PS', this.values, null);
    Object.defineProperty(this.notifications, 'owner', { get: () => this.base.owner.read()?.propertyOwner ?? null,
      set: (_value: OriginalPropertyOwner | null) => { throw new Error('Notifications follow the actual retained EntityPS.owner slot'); } });
    for (const field of rules.fields) this.bindField(field);
  }
  private emptyCallback(set: NativeLivePropertySet<object>, source: string): NativeValue<void> {
    return this.reader.run(() => { this.exact(); if (set !== this.base) throw new Error('Same physical PlayerMemory callback required'); this.reader.note('inherited callback RET', source); });
  }
  get memory(): OriginalPlayerMemory { this.reader.runtimeGuard(); this.exact(); if (this.consumer === null) throw new Error('Actual PlayerMemory defaults/PostInitialize have not completed'); return this.consumer; }
  initializeConsumer(token: symbol): void { if (token !== permission || this.consumer !== null) throw new Error('Actual one-time PlayerMemory consumer binding required'); this.consumer = new OriginalPlayerMemory(this.notifications, this.attributes); }
  exact(attached = true): void {
    const retained = this.reader.controller.allocations().find(value => value.wrapper === this.wrapper);
    if (this.allocation.freed || this.wrapperAllocation.freed || this.wrapper.deleted || retained?.nativeObject !== this.base ||
        this.base.values !== this.values || (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper)) ||
        this.wrapper.factory !== this.reader.factory || this.dword(0) !== 0x2069845c) throw new Error('Same live original PlayerMemory physical allocation required');
    const bytes = new DataView(this.wrapperAllocation.bytes.buffer, this.wrapperAllocation.bytes.byteOffset, 16);
    const mask = new DataView(this.wrapperAllocation.knownMask.buffer, this.wrapperAllocation.knownMask.byteOffset, 16);
    if (mask.getUint32(0, true) !== 0xffffffff || bytes.getUint32(0, true) !== 0x20697d2c ||
        mask.getUint32(4, true) !== 0x07ffffff || (bytes.getUint32(4, true) & 7) !== 2 || mask.getUint32(0xc, true) !== 0) throw new Error('Actual PlayerMemory wrapper leaf/flags/root/type capability required');
  }
  require(offset: number, size: number): void {
    if (!this.knownMask.subarray(offset, offset + size).every(byte => byte === 255)) throw new Error('PlayerMemory field bytes unknown+' + offset.toString(16));
  }
  dword(offset: number): number { this.require(offset, 4); return this.view.getUint32(offset, true); }
  putWord(offset: number, value: number): void { this.reader.guard(); this.view.setUint32(offset, uint(value), true); this.knownMask.fill(255, offset, offset + 4); }
  putByte(offset: number, value: number): void { this.reader.guard(); this.numericBytes[offset] = uint(value, 255); this.knownMask[offset] = 255; }
  raw(offset: number, bytes: Uint8Array, mask?: Uint8Array): void {
    this.reader.guard(); if (offset < 0 || offset + bytes.length > 184 || mask && mask.length !== bytes.length) throw new Error('Actual PlayerMemory write bounds required');
    this.numericBytes.set(bytes, offset); if (mask) this.knownMask.set(mask, offset); else this.knownMask.fill(255, offset, offset + bytes.length);
  }
  pointerBits(offset: number, capability: object | null): void { this.reader.guard(); if (capability === null) this.putWord(offset, 0); else this.knownMask.fill(0, offset, offset + 4); }
  private bindField(field: PlayerMemoryField): void {
    const offset = field.nativeOffset;
    if (field.typeName.startsWith('bTObjArray<') || field.typeName.startsWith('bTValArray<')) {
      const array = new NativePlayerMemoryArray(this, offset, field.typeName.includes('bCString') ? 'CString' : field.typeName.includes('bool') ? 'bool' : 'long');
      this.arrays.set(offset, array); Object.defineProperty(this.values, field.name, { enumerable: true, get: () => array }); return;
    }
    Object.defineProperty(this.values, field.name, { enumerable: true, get: () => {
      this.reader.runtimeGuard();
      if (field.typeName === 'bool') { this.require(offset, 1); return this.numericBytes[offset] !== 0; }
      if (field.typeName === 'float') { this.require(offset, 4); return this.view.getFloat32(offset, true); }
      if (field.typeName === 'bCPropertyID') { this.require(offset, 20); return { rawGuid20: hex(this.numericBytes.subarray(offset, offset + 20)), referenceKind: 'unspecified' }; }
      if (field.typeName.startsWith('bTPropertyContainer<')) return { value: this.dword(offset + 4) };
      return field.typeName === 'long' && field.name !== 'TutorialFlags' ? this.dword(offset) | 0 : this.dword(offset);
    }, set: (value: unknown) => {
      this.reader.runtimeGuard();
      if (field.typeName === 'bool' && typeof value === 'boolean') this.putByte(offset, Number(value));
      else if (field.typeName === 'float' && typeof value === 'number' && Number.isFinite(value) && Object.is(value, Math.fround(value))) { this.view.setFloat32(offset, value, true); this.knownMask.fill(255, offset, offset + 4); }
      else if (typeof value === 'number' && Number.isInteger(value) && (field.typeName === 'long' && field.name !== 'TutorialFlags' ? value >= -0x80000000 && value <= 0x7fffffff : value >= 0 && value <= 0xffffffff)) this.putWord(offset, value >>> 0);
      else throw new Error('Actual PlayerMemory scalar assignment required: ' + field.name);
    } });
  }
}

export class OriginalPlayerMemoryReader {
  readonly factory: NativeReflectionFactory;
  private readonly retained = new WeakMap<NativeReflectionWrapper, OriginalPlayerMemoryProperties>();
  private active = false; private reentered = false; private hostDepth = 0;
  constructor(readonly controller: NativeReflectionController, readonly attributeReader: OriginalAttributeReader,
    readonly host: NativePlayerMemoryReadingHost) {
    if (attributeReader.controller !== controller) throw new Error('PlayerMemory and Attribute factories require same original controller');
    const root = Object.freeze({ className: 'gCPlayerMemory_PS', baseClassName: 'eCEntityPropertySet', fields: Object.freeze(rules.fields.map(field => Object.freeze({ ...field }))) });
    this.factory = { root, nativeCategory: 'entity-property-set', cloneRoot: current => current === controller ? this.run(() => this.construct()) : unknown('Same original controller required'),
      read: (wrapper, input) => this.run(() => this.read(wrapper, input)), getVersion: wrapper => { const result = this.properties(wrapper); return result.known ? known(6) : result; } };
    fact(controller.registerFactory(this.factory), 'PlayerMemory concrete factory registration');
  }
  guard(): void { const required = this.controller.receipt().required; if (required !== null) throw new Error(required); if (this.reentered) throw new Error('Reentrant PlayerMemory mutation attempted'); }
  runtimeGuard(): void { this.guard(); if (this.hostDepth !== 0) { this.reentered = true; throw new Error('PlayerMemory consumer used during an unresolved native service callback'); } }
  run<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.reentered = true; return unknown('Reentrant original PlayerMemory operation unsupported'); }
    this.active = true; this.reentered = false;
    try { return this.controller.value(() => { this.guard(); const value = body(); this.guard(); return value; }); } finally { this.active = false; }
  }
  note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  call<T>(operation: string, source: string, fn: () => NativeValue<T> | undefined): T {
    this.guard(); const value = this.controller.effect(operation, source, () => { this.hostDepth++; try { return fn(); } finally { this.hostDepth--; } }); this.guard(); return value;
  }
  properties(wrapper: NativeReflectionWrapper, attached = true): NativeValue<OriginalPlayerMemoryProperties> {
    const value = this.retained.get(wrapper); if (!value) return unknown('Actual retained PlayerMemory wrapper required');
    try { value.exact(attached); return known(value); } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  playerMemory(wrapper: NativeReflectionWrapper): NativeValue<OriginalPlayerMemory> {
    const value = this.properties(wrapper); if (!value.known) return value;
    try { return known(value.value.memory); } catch (error) { return unknown(String(error)); }
  }
  private actual(wrapper: NativeReflectionWrapper): OriginalPlayerMemoryProperties { return fact(this.properties(wrapper), 'PlayerMemory receiver'); }
  private enumDefault(value: OriginalPlayerMemoryProperties): void {
    const result = this.call('current mutable WeaponConfig default DWORD', 'Game:2031ea10', () => this.host.enumDefault?.('207c1578'));
    const data = new Uint8Array(4), mask = new Uint8Array(4); new DataView(data.buffer).setUint32(0, uint(result.value), true); new DataView(mask.buffer).setUint32(0, uint(result.knownMask), true);
    value.raw(0x64, data, mask);
  }
  private construct(): NativeReflectionWrapper {
    const wrapperMemory = allocation(this.call('MemoryAdmin.New wrapper16/tag190', rules.sources.clone, () => this.host.allocateWrapper?.(16, 0x190)), 16, 'PlayerMemory wrapper');
    const wrapper = this.controller.allocateWrapper(this.factory, rules.sources.clone);
    const wrapperView = new DataView(wrapperMemory.bytes.buffer, wrapperMemory.bytes.byteOffset, 16);
    const wrapperMask = new DataView(wrapperMemory.knownMask.buffer, wrapperMemory.knownMask.byteOffset, 16);
    wrapperView.setUint32(0, parseInt(rules.wrapperVtable, 16), true); wrapperMask.setUint32(0, 0xffffffff, true);
    wrapperView.setUint32(4, (wrapperView.getUint32(4, true) & 0xf8000000) | 10, true); wrapperMask.setUint32(4, 0x07ffffff, true);
    wrapperView.setUint32(8, 0, true); wrapperMask.setUint32(8, 0xffffffff, true); wrapperMask.setUint32(0xc, 0, true);
    Object.defineProperties(wrapper.flags, {
      value: { get: () => wrapperView.getUint32(4, true), set: (word: number) => { this.guard(); wrapperView.setUint32(4, uint(word), true); } },
      knownMask: { get: () => wrapperMask.getUint32(4, true), set: (word: number) => { this.guard(); wrapperMask.setUint32(4, uint(word), true); } },
    });
    let native: NativeLivePropertySet<object> | null = null;
    Object.defineProperty(wrapper, 'native', { get: () => { this.guard(); return native; }, set: (candidate: NativeLivePropertySet<object> | null) => {
      this.guard(); if (candidate !== null && this.retained.get(wrapper)?.base !== candidate) throw new Error('Actual retained PlayerMemory wrapper native required');
      native = candidate; if (candidate === null) { wrapperView.setUint32(8, 0, true); wrapperMask.setUint32(8, 0xffffffff, true); } else wrapperMask.setUint32(8, 0, true);
    } });
    const nativeMemory = allocation(this.call('MemoryAdmin.New PlayerMemory184/tagc4', 'Game:20327f10', () => this.host.allocateNative?.(184, 0xc4, wrapper)), 184, 'PlayerMemory native');
    const value = new OriginalPlayerMemoryProperties(wrapper, this, nativeMemory, wrapperMemory);
    // The native constructor establishes its reference count before the
    // controller retains/inspects the completed native object.
    value.putWord(0, 0x2069845c); value.putWord(4, 0); value.putWord(8, 1); value.putWord(0xc, 0);
    this.retained.set(wrapper, value); this.controller.retainNative(wrapper, value.base);
    value.numericBytes[0x10] = ((value.numericBytes[0x10]! & 0xf0) | 1); value.knownMask[0x10] = (value.knownMask[0x10]! | 0x0f);
    for (let offset = 0x18; offset <= 0x50; offset += 4) value.putWord(offset, 0);
    value.putWord(0x60, 0x20697bc4); this.enumDefault(value); value.raw(0x68, new Uint8Array(20));
    this.note('fresh native ctor base/arrays/WeaponConfig/PropertyID', 'Game:2031e9c0');
    for (const offset of [0xa8, 0xac, 0xb0, 0xb4]) value.putWord(offset, 0);
    this.reserveBuckets(value); this.note('hash constructor43 zero buckets', 'Game:20327550');
    if (!value.base.isValid()) {
      this.politicalArraysNine(value); value.base.createBase(); this.note('PlayerMemory.Create inherited base validity after political arrays', 'Engine:3003b863');
    }
    this.note('PlayerMemory.Create IsValid AL==1 gate and literal1', rules.sources.create);
    this.controller.setAllocationPhase(wrapper, 'created'); this.controller.attachConstructedNative(wrapper, value.base, 'Game:2031f540', 'Game:20327f10');
    this.controller.initializeProperties(wrapper, field => this.controller.value(() => this.assignDefault(value, field)), () => this.controller.value(() => this.postInitialize(value)), 'Game:2031e3c0');
    return wrapper;
  }
  private descriptor(field: NativeReflectionField): PlayerMemoryField {
    const current = this.factory.root.fields.find(value => value === field);
    if (!current) throw new Error('Actual registered original PlayerMemory descriptor required'); return current;
  }
  private assignDefault(value: OriginalPlayerMemoryProperties, field: NativeReflectionField): void {
    value.exact(); const descriptor = this.descriptor(field), offset = descriptor.nativeOffset;
    if (descriptor.typeName === 'bool') value.putByte(offset, 0);
    else if (descriptor.typeName === 'long' || descriptor.typeName === 'float' || descriptor.typeName === 'unsigned_long') value.putWord(offset, 0);
    else if (descriptor.typeName.startsWith('bTPropertyContainer<')) this.enumDefault(value);
    else if (descriptor.typeName === 'bCPropertyID') {
      const scratch: NativePlayerMemoryGuidScratch = { bytes: new Uint8Array(20), knownMask: new Uint8Array(20), destroyed: false }; scratch.knownMask[16] = 255; value.guidScratch.push(scratch);
      this.note('temporary Guid ctor validity byte0 only', 'SharedBase:100063c5');
      this.call('CoCreateGuid captured scratch; ignored HRESULT', 'SharedBase:10012570', () => this.host.coCreateGuid?.(scratch));
      scratch.bytes[16] = 1; scratch.knownMask[16] = 255; value.raw(offset, scratch.bytes.subarray(0, 16), scratch.knownMask.subarray(0, 16)); value.putWord(offset + 16, 0);
      scratch.destroyed = true; this.note('PropertyID.CreateRandom copy16/cache0 and Guid destructor RET', 'SharedBase:10092760');
    } else if (value.arrays.has(offset)) {
      // Original defaults resolve the destination address only. Create has
      // already reserved/count9 political arrays; their content survives.
      const array = value.arrays.get(offset)!;
      if (array.count < 0 || array.capacity < array.count || (array.capacity > 0 && (!array.allocation || array.allocation.freed))) throw new Error('Actual array default destination required');
    } else throw new Error('Unaudited PlayerMemory default: ' + descriptor.name);
    this.note('descriptor default ' + descriptor.name, descriptor.defaultInitializer ?? descriptor.default ?? descriptor.reader);
  }
  private postInitialize(value: OriginalPlayerMemoryProperties): void {
    value.exact(); this.note('inherited PostInitialize literal1', 'SharedBase:100076f8');
    value.putByte(0x14, 0);
    for (let offset = 0x7c; offset <= 0x98; offset += 4) value.putWord(offset, 0);
    for (let offset = 0x9c; offset <= 0x9f; offset++) value.putByte(offset, 0);
    value.putWord(0xa0, 0); value.putByte(0xa4, 0); this.note('PostInitialize transient fields zero', 'Game:2031e3c0');
    value.initializeConsumer(permission); this.createAttributes(value);
  }
  private resizeArray(array: NativePlayerMemoryArray, requested: number, growth: boolean): void {
    const oldCapacity = array.capacity, oldCount = array.count, stride = array.stride;
    if (!Number.isInteger(requested) || requested < 0 || requested > Math.floor(0x7fffffff / stride) || oldCount < 0 || oldCount > oldCapacity) throw new Error('Selected finite original array allocation extent required');
    if (oldCapacity >= requested) return;
    const capacity = requested + (growth ? Math.max(8, Math.min(1024, oldCapacity >> 3)) : 0);
    const next = allocation(this.call('array MemoryAdmin.Realloc captured backing', 'Game:' + (array.kind === 'CString' ? '2028f890' : array.kind === 'bool' ? '20321430' : '201237e0'), () => this.host.realloc?.(array.allocation, capacity * stride)), capacity * stride, 'PlayerMemory array');
    array.allocation = next; array.properties.pointerBits(array.nativeOffset, next);
    if (array.kind === 'CString') {
      for (let index = oldCapacity; index < capacity; index++) array.strings[index] = new NativePlayerMemoryCStringSlot(next, index * 4, this);
      // Existing CString objects survive moving Realloc; their slots bind the
      // new physical backing without releasing their original allocations.
      for (let index = 0; index < oldCapacity; index++) array.strings[index]!.relocate(next);
    } else {
      const begin = oldCount * stride, end = begin + (capacity - oldCapacity) * stride;
      next.bytes.fill(0, begin, end); next.knownMask.fill(255, begin, end);
    }
    array.capacity = capacity; this.note('array capacity after original zero/construct range', 'Game:array reserve');
  }
  private readArray(array: NativePlayerMemoryArray, input: NativeEntityByteInput): void {
    input.u8(); const count = input.u32(); this.resizeArray(array, count, false);
    if (array.kind === 'CString' && count < array.count) for (let index = count; index < array.count; index++) { array.strings[index]!.destroy(); array.strings[index]!.constructNull(); }
    array.count = count;
    if (array.kind === 'CString') for (let index = 0; index < array.count; index++) this.indexedString(array.strings[index]!, input);
    else if (count !== 0) {
      const destination = array.allocation; if (!destination || destination.freed) throw new Error('Actual bulk array backing required');
      const bytes = input.take(count * array.stride); destination.bytes.set(bytes); destination.knownMask.fill(255, 0, bytes.length);
    }
    this.note('current array count/elements consumed', 'Game:' + (array.kind === 'CString' ? '2028f890' : array.kind === 'bool' ? '20321430' : '201237e0'));
  }
  private notify(value: OriginalPlayerMemoryProperties, phase: 'enter' | 'exit', name: string): void {
    value.exact(); const result = value.notifications.notify(phase, name, true);
    for (const item of result.trace) this.note(item.operation + ' ' + name, phase === 'enter' ? 'Engine:3003b5bb' : 'Engine:3001a091');
    if (!result.supported) throw new Error(result.reason);
  }
  private readField(wrapper: NativeReflectionWrapper, field: NativeReflectionField, input: NativeEntityByteInput): void {
    const descriptor = this.descriptor(field), version = input.u16(); input.u32(); this.note('descriptor version/size consumed without seek: ' + field.name, descriptor.reader);
    if (wrapper.native !== null) this.notify(this.actual(wrapper), 'enter', field.name);
    const value = this.actual(wrapper), offset = descriptor.nativeOffset;
    if (value.arrays.has(offset)) { if (version >= 30) this.readArray(value.arrays.get(offset)!, input); }
    else if (descriptor.typeName === 'bool') value.putByte(offset, input.u8());
    else if (descriptor.typeName === 'long' || descriptor.typeName === 'float' || descriptor.typeName === 'unsigned_long') value.raw(offset, input.take(4));
    else if (descriptor.typeName.startsWith('bTPropertyContainer<')) { input.u16(); value.raw(offset + 4, input.take(4)); }
    else if (descriptor.typeName === 'bCPropertyID') { const data = input.take(20); value.raw(offset, data.subarray(0, 16)); value.putWord(offset + 16, 0); }
    else throw new Error('Unaudited PlayerMemory descriptor reader');
    this.note('actual descriptor payload write ' + field.name, descriptor.reader);
    if (wrapper.native !== null) this.notify(this.actual(wrapper), 'exit', field.name);
  }
  private read(wrapper: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    this.actual(wrapper);
    return this.controller.readWrapperProperties(wrapper, input, { wrapperSource: rules.sources.wrapperRead, dataSource: rules.sources.dataRead,
      readField: (field, stream) => this.controller.value(() => this.readField(wrapper, field, stream)),
      readNative: stream => this.controller.value(() => { const value = this.actual(wrapper), version = stream.u16(); this.note('derived PlayerMemory.Read version', 'Game:2031ea60');
        if (version > 4) this.readAttributes(value, stream);
        else if (version > 2) throw new Error('Game:2031ea60 requires actual legacy ReadAttributesV' + version + ' implementation');
        this.note('derived Read returns literal1; no inherited Read', 'Game:2031ea60'); }), });
  }
  private reserveBuckets(value: OriginalPlayerMemoryProperties): void {
    const oldCapacity = value.dword(0xb0), oldCount = value.dword(0xac), required = 43;
    if (oldCapacity < required) {
      const capacity = required + Math.max(8, Math.min(1024, oldCapacity >> 3));
      const next = allocation(this.call('hash MemoryAdmin.Realloc43/growth0', 'Game:203205f0', () => this.host.realloc?.(value.bucketAllocation, capacity * 4)), capacity * 4, 'PlayerMemory hash');
      value.bucketAllocation = next; value.pointerBits(0xa8, next); next.bytes.fill(0, oldCount * 4, (oldCount + capacity - oldCapacity) * 4); next.knownMask.fill(255, oldCount * 4, (oldCount + capacity - oldCapacity) * 4); value.putWord(0xb0, capacity);
    }
    value.putWord(0xac, 43); value.buckets.length = 43; value.buckets.fill(null);
    if (!value.bucketAllocation) throw new Error('Actual hash bucket allocation required'); value.bucketAllocation.bytes.fill(0, 0, 172); value.bucketAllocation.knownMask.fill(255, 0, 172);
  }
  private bucket(value: OriginalPlayerMemoryProperties, key: NativePlayerMemoryCStringSlot): number { const size = value.dword(0xac); if (size === 0 || size !== value.buckets.length) throw new Error('Actual nonzero current original hash bucket count required'); return key.hash() % size; }
  private find(value: OriginalPlayerMemoryProperties, key: NativePlayerMemoryCStringSlot, bucket: number): NativePlayerMemoryNode | null {
    for (let node = value.buckets[bucket] ?? null; node !== null; node = node.next) { if (node.allocation.freed) throw new Error('Freed hash node'); if (key.equals(node.key)) return node; } return null;
  }
  private node(value: OriginalPlayerMemoryProperties, key: NativePlayerMemoryCStringSlot): NativePlayerMemoryNode {
    const bucket = this.bucket(value, key), existing = this.find(value, key, bucket); if (existing !== null) return existing;
    const storage = allocation(this.call('hash node new12/tag199', 'Game:2031e863', () => this.host.allocateNode?.(12, 0x199)), 12, 'PlayerMemory hash node');
    const copied = new NativePlayerMemoryCStringSlot(storage, 0, this); this.call('hash key CString assignment', 'Game:20321560', () => this.host.assignCString?.(copied, key));
    const next = value.buckets[bucket] ?? null, node: NativePlayerMemoryNode = { allocation: storage, key: copied, value: null, next };
    // Value4 is uninitialized until source assignment. Source sets next8,
    // bucket head and count before the later value store.
    if (next === null) { storage.bytes.fill(0, 8, 12); storage.knownMask.fill(255, 8, 12); } else storage.knownMask.fill(0, 8, 12);
    value.buckets[bucket] = node; value.bucketAllocation!.knownMask.fill(0, bucket * 4, bucket * 4 + 4); value.putWord(0xb4, (value.dword(0xb4) + 1) >>> 0);
    this.note('hash copied key/head next/count insert', 'Game:20321560'); return node;
  }
  private store(value: OriginalPlayerMemoryProperties, node: NativePlayerMemoryNode, attribute: OriginalNativeAttribute | null): void {
    node.value = attribute; if (attribute === null) { node.allocation.bytes.fill(0, 4, 8); node.allocation.knownMask.fill(255, 4, 8); } else node.allocation.knownMask.fill(0, 4, 8);
    value.attributes.set(node.key.text, attribute); this.note('same native node/store and consumer Map assignment', 'Game:2031e8a4');
  }
  private destroyAttributes(value: OriginalPlayerMemoryProperties): void {
    value.exact();
    for (let bucket = 0; bucket < value.dword(0xac); bucket++) for (let node = value.buckets[bucket] ?? null; node !== null; node = node.next) {
      if (node.value !== null) { const captured = node.value; this.call('native Attribute virtual24 ReleaseReference', 'Game:2031e5d0', () => this.attributeReader.nativeReleaseReference(captured)); this.store(value, node, null); }
    }
    for (let bucket = 0; bucket < value.dword(0xac); bucket++) {
      let node = value.buckets[bucket] ?? null;
      while (node !== null) { const saved = node.next; node.key.destroy(); this.call('hash MemoryAdmin.DeleteObject captured node', 'Game:20327490', () => this.host.deleteNode?.(node!.allocation)); if (!node.allocation.freed) throw new Error('Actual node DeleteObject must end captured allocation lifetime'); node = saved; }
    }
    const captured = value.bucketAllocation;
    if (captured !== null) { this.call('hash MemoryAdmin.Free captured bucket backing', 'Game:20327490', () => this.host.free?.(captured)); if (!captured.freed) throw new Error('Actual hash Free must end captured allocation lifetime'); value.bucketAllocation = null; value.putWord(0xa8, 0); value.putWord(0xac, 0); value.putWord(0xb0, 0); }
    value.putWord(0xb4, 0); value.attributes.clear(); this.reserveBuckets(value); this.note('DestroyAttributes reconstructs same empty hash and consumer Map', 'Game:20327490');
  }
  private temporaryCString(text: string | null): NativePlayerMemoryCStringSlot {
    // A local native4-byte pointer slot is stack storage; its character heap
    // allocation, copies and destruction remain actual CString services.
    const storage: NativeAttributeAllocation = { identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4), freed: false };
    const slot = new NativePlayerMemoryCStringSlot(storage, 0, this);
    if (text !== null) {
      this.call('local CString constructor literal', 'Game:2031e140', () => this.host.constructCString?.(slot, text));
      if (slot.text !== text) throw new Error('Actual CString literal constructor did not store original source');
    }
    return slot;
  }
  private indexedString(slot: NativePlayerMemoryCStringSlot, input: NativeEntityByteInput): void {
    const before = input.cursor();
    const index = before + 2 <= input.end ? new DataView(input.bytes.buffer, input.bytes.byteOffset + before, 2).getUint16(0, true) : -1;
    const expected = input.strings[index]; if (typeof expected !== 'string') throw new Error('Original indexed PlayerMemory CString source absent');
    this.call('stream Read actual owned CString', 'SharedBase:10015430', () => this.host.readCString?.(slot, input));
    if (input.cursor() !== before + 2 || slot.text !== expected) throw new Error('PlayerMemory CString service did not consume/store exact indexed source');
  }
  private warning(format: string, args: readonly (string | number)[], source: string): void { this.call('GE_MESSAGEF_WARN', source, () => this.host.warning?.(format, args, source)); }
  private unicodeSlot(pointer: NativeAttributeAllocation | null): NativePlayerMemoryUnicodeString {
    const slot: NativeAttributeAllocation = { identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4), freed: false };
    if (pointer === null) slot.knownMask.fill(255);
    return { identity: {}, slot, pointer, destroyed: false };
  }
  private unicodeSpace(): NativePlayerMemoryUnicodeString {
    const block = allocation(this.call('Unicode literal space MemoryAdmin.Malloc16', 'SharedBase:1000648d', () => this.host.allocateUnicode?.(16)), 16, 'original Unicode space');
    const view = new DataView(block.bytes.buffer, block.bytes.byteOffset, 16);
    view.setInt32(0, 1, true); view.setInt32(4, 1, true); view.setInt32(8, 1, true); view.setUint16(14, 0, true);
    block.knownMask.fill(255, 0, 12); block.knownMask.fill(255, 14, 16);
    // This selected original literal is the single basic space character.
    // Its mbstowcs conversion is U+0020 in each original C locale; no general
    // codepage conversion or copied installation text is introduced here.
    view.setUint16(12, 0x20, true); block.knownMask.fill(255, 12, 14);
    this.note('Unicode space header1/1/1 and wchar space/NUL', 'SharedBase:1000648d'); return this.unicodeSlot(block);
  }
  private unicodeCopy(source: NativePlayerMemoryUnicodeString): NativePlayerMemoryUnicodeString {
    if (source.destroyed || source.slot.freed) throw new Error('Actual live Unicode copy source required');
    const block = source.pointer;
    if (block === null) { this.note('Unicode copy NULL branch', 'SharedBase:10007b6c'); return this.unicodeSlot(null); }
    if (block.freed || !block.knownMask.subarray(0, 4).every(byte => byte === 255)) throw new Error('Actual Unicode header reference bytes required');
    const view = new DataView(block.bytes.buffer, block.bytes.byteOffset, block.bytes.length), references = view.getInt32(0, true);
    if (references <= 0) throw new Error('Selected original Unicode copy needs positive shared reference count');
    view.setInt32(0, references + 1, true); this.note('Unicode copy same character allocation/DWORD reference increment', 'SharedBase:10007b6c'); return this.unicodeSlot(block);
  }
  private destroyUnicode(value: NativePlayerMemoryUnicodeString): void {
    if (value.destroyed || value.slot.freed) throw new Error('Actual live Unicode destructor receiver required');
    const block = value.pointer;
    if (block !== null) {
      if (block.freed || !block.knownMask.subarray(0, 4).every(byte => byte === 255)) throw new Error('Actual Unicode destructor reference bytes required');
      const view = new DataView(block.bytes.buffer, block.bytes.byteOffset, block.bytes.length), next = (view.getInt32(0, true) - 1) | 0;
      view.setInt32(0, next, true); this.note('Unicode destructor captured DWORD reference decrement', 'SharedBase:10001848');
      if (next < 1) { this.call('Unicode destructor actual MemoryAdmin.Free block', 'SharedBase:10001848', () => this.host.free?.(block)); if (!block.freed) throw new Error('Actual Unicode Free must end captured allocation lifetime'); }
    }
    value.destroyed = true; this.note('Unicode destructor ends object without clearing pointer slot', 'SharedBase:10001848');
  }
  private localize(key: NativePlayerMemoryCStringSlot, stat: boolean): void {
    for (const [index, prefix] of ['ATTRIB_', 'ATTRIBDESC_', 'ATTRIBTAG_'].entries()) {
      const space = this.unicodeSpace(), text = this.unicodeCopy(space), description = this.unicodeSlot(null);
      this.note('temporary Unicode default constructor NULL slot', 'SharedBase:1000656e');
      const name = this.temporaryCString(null); this.call('operator+ CString localization key', 'Game:2031db70', () => this.host.concatenateCString?.(name, prefix, key));
      const admin = this.call('eCLocAdmin.GetInstance actual singleton', 'Engine:3002959b', () => this.host.localizationAdmin?.());
      this.call('eCLocAdmin.ReserveString actual entry', 'Game:' + ((stat ? [0x2031de62, 0x2031decd, 0x2031df32] : [0x2031dc62, 0x2031dccd, 0x2031dd32])[index]!).toString(16), () => this.host.reserveString?.(admin, name, { text, description }));
      name.destroy();
      for (const temporary of [description, text, space]) this.destroyUnicode(temporary);
    }
  }
  private createAttribute(value: OriginalPlayerMemoryProperties, key: NativePlayerMemoryCStringSlot, stat: boolean): boolean {
    const source = stat ? 'Game:2031dd70' : 'Game:2031db70';
    const existing = this.find(value, key, this.bucket(value, key));
    if (existing !== null) {
      const current = this.node(value, key).value;
      if (current !== null) {
        const reread = this.node(value, key).value;
        if (reread === null) throw new Error('Source attribute receiver changed during lookup');
        const actualTag = fact(this.attributeReader.tag(reread), 'actual native Attribute Tag CString');
        if (key.equals(actualTag)) return false; // CreateStat does not require Stat RTTI.
        const warningReceiver = this.node(value, key).value;
        if (warningReceiver === null) throw new Error('Source mismatching-tag warning receiver became NULL');
        this.warning('gCPlayerMemory_PS::' + (stat ? 'CreateStat' : 'CreateAttrib') + ' -> Detected attrib with mismatching tag: %s -> %s. Forcing re-creation.', [key.text, warningReceiver.values.Tag], source);
      }
    }
    const attribute = this.call('QueryNewObject/creator/native AddReference/GetNative/creator destruction', stat ? 'Game:20320b80' : 'Game:20320af0', () => this.attributeReader.create(stat ? 'gCStat' : 'gCAttribute'));
    this.call('Tag false NotifyEnter/CString assignment/NotifyExit', source, () => this.attributeReader.setTag(attribute, key));
    this.store(value, this.node(value, key), attribute); this.localize(key, stat); return true;
  }
  private createAttributes(value: OriginalPlayerMemoryProperties): number {
    const order = ['SP', 'MP', 'HP', 'PROT_LIGHTNING', 'PROT_ICE', 'PROT_FIRE', 'PROT_MISSILE', 'PROT_IMPACT', 'PROT_BLADE', 'ALC', 'THF', 'SMT', 'INT', 'DEX', 'STR'];
    const keys = new Map<string, NativePlayerMemoryCStringSlot>();
    for (const tag of [...order].reverse()) keys.set(tag, this.temporaryCString(tag));
    let created = 0; for (const [index, tag] of order.entries()) created += Number(this.createAttribute(value, keys.get(tag)!, index < 3));
    for (const tag of order) keys.get(tag)!.destroy(); this.note('CreateAttributes original15 order and CString lifetimes', 'Game:2031e140'); return created;
  }
  private readAttributes(value: OriginalPlayerMemoryProperties, input: NativeEntityByteInput): void {
    this.destroyAttributes(value); const count = input.u32() | 0; this.note('ReadAttributes signed count', 'Game:2031e700');
    for (let index = 0; index < count; index++) {
      const key = this.temporaryCString(null); this.indexedString(key, input);
      if (this.find(value, key, this.bucket(value, key)) !== null) this.warning('gCPlayerMemory_PS::ReadAttributes -> Detected multiple entries for attrib: %s.', [key.text], 'Game:2031e700');
      const accessor = this.call('actual Attribute accessor.Read', 'Game:2031e700', () => this.controller.readAccessor(input));
      const object = fact(accessor.nativeObject(), 'Attribute accessor GetNativeObject');
      let attribute: OriginalNativeAttribute | null = null;
      if (accessor.instance !== null && object !== null) {
        if (accessor.instance.factory === this.attributeReader.attributeFactory || accessor.instance.factory === this.attributeReader.statFactory) {
          attribute = fact(this.attributeReader.attribute(accessor.instance), 'actual Attribute/Stat RTTI cast');
          if (attribute !== object) throw new Error('RTTI Attribute cast must retain exact accessor native pointer');
        } else if (!this.controller.allocations().some(item => item.nativeObject === object && item.wrapper.factory.nativeCategory === 'entity-property-set')) {
          throw new Error('Actual original Attribute RTTI result unresolved for foreign reflected object');
        }
      }
      if (attribute === null) this.warning('gCPlayerMemory_PS::ReadAttributes -> Detected invalid attrib: %s.', [key.text], 'Game:2031e700');
      this.store(value, this.node(value, key), attribute);
      if (attribute !== null) this.call('nonnull Attribute native virtual20 AddReference before accessor destruction', 'Game:2031e8b4', () => this.attributeReader.nativeAddReference(attribute));
      // Source prepares piVar5[3] for INFO even following a failed RTTI cast.
      if (attribute === null) throw new Error('Game:2031e8b6 original INFO argument preparation dereferences NULL invalid attribute');
      const tag = attribute.values.Tag;
      this.call('GE_MESSAGEF_INFO level5 current key and Tag', 'Game:2031e8c6', () => this.host.info?.(5, 'gCPlayerMemory_PS::ReadAttributes -> Read attribute: %s [%s].', [key.text, tag], 'Game:2031e8c6'));
      this.call('actual accessor destructor after native reference/log', 'Game:2031e700', () => accessor.destroy()); key.destroy();
    }
    const created = this.createAttributes(value); if (created > 0) this.warning('gCPlayerMemory_PS::ReadAttributes -> Created %d missing/broken attributes.', [created], 'Game:2031e700');
    this.note('ReadAttributes returns literal1', 'Game:2031e700');
  }
  postReadInternal(value: OriginalPlayerMemoryProperties, token: symbol): void {
    if (token !== permission) throw new Error('Actual guarded native PlayerMemory PostRead required'); value.exact();
    this.politicalArraysNine(value); this.note('OnPostRead political array9 order', 'Game:2031d510');
    this.note('OnPostRead inherited callback RET', 'Engine:304818a0');
  }
  private politicalArraysNine(value: OriginalPlayerMemoryProperties): void {
    for (const offset of [0x24, 0x30, 0x48, 0x3c]) { const array = value.arrays.get(offset)!; this.resizeArray(array, 9, true); array.count = 9; this.note('reserve9/growth0 and count9', array.kind === 'bool' ? 'Game:200ae420' : 'Game:20064480'); }
  }
}
