/** Reflected gCAttribute/gCStat constructors and descriptor reads over the
 * same OriginalNativeAttribute consumed by startup, HUD and combat. Original
 * allocation/CString/deletion boundaries require actual owned capabilities. */
import rulesText from '../../assets/gothic3/attribute-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import type { NativeEntityByteInput } from './entity-reading';
import type { NativePropertyObjectReference } from './entity-lifecycle';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField,
  NativeReflectionNativeObject, NativeReflectionWrapper } from './entity-reflection';
import { OriginalNativeAttribute } from './player-properties';
import type { OriginalAttributeValues, OriginalPlayerPropertyResult } from './player-properties';

type AttributeClass = 'gCAttribute' | 'gCStat';
interface AttributeClassRules {
  nativeBytes: 24 | 32; nativeVtable: string; wrapperVtable: string;
  baseClassName: string | null; fields: NativeReflectionField[];
}
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>;
  classes: Record<AttributeClass, AttributeClassRules> };
if (rules.schema !== 'gothic3-attribute-reading-rules-v1' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.classes.gCAttribute.nativeBytes !== 24 || rules.classes.gCStat.nativeBytes !== 32 ||
    rules.classes.gCAttribute.nativeVtable !== '2065da7c' || rules.classes.gCStat.nativeVtable !== '2065db4c' ||
    rules.classes.gCAttribute.wrapperVtable !== '206a2d94' || rules.classes.gCStat.wrapperVtable !== '206a3164' ||
    rules.classes.gCAttribute.baseClassName !== null || rules.classes.gCStat.baseClassName !== 'gCAttribute') {
  throw new Error('Original reflected Attribute/Stat source profile differs');
}
const expectedFields = {
  gCAttribute: [['Tag', 0xc, 'bCString', 'Game:20399d80', 'Game:20399b20'],
    ['Modifier', 0x10, 'int', 'Game:2039a610', 'Game:2039a3c0'],
    ['Value', 0x14, 'int', 'Game:2039a610', 'Game:2039a3c0']],
  gCStat: [['BaseMaximum', 0x18, 'int', 'Game:2039d2e0', 'Game:2039d090'],
    ['MaximumModifier', 0x1c, 'int', 'Game:2039d2e0', 'Game:2039d090']],
} as const;
for (const kind of ['gCAttribute', 'gCStat'] as const) {
  const actual = rules.classes[kind].fields, expected = expectedFields[kind];
  if (actual.length !== expected.length || expected.some(([name, offset, type, reader, initializer], i) => {
    const f = actual[i]; return !f || f.name !== name || f.nativeOffset !== offset || f.typeName !== type ||
      f.reader !== reader || f.defaultInitializer !== initializer;
  })) throw new Error('Original registered Attribute/Stat descriptor order differs');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, operation: string): T { if (!value.known) throw new Error(operation + ': ' + value.reason); return value.value; }
function word(value: number): number { if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual uint32 storage required'); return value; }
function rawWord(value: number): Uint8Array { const a = new Uint8Array(4); new DataView(a.buffer).setUint32(0, word(value), true); return a; }
function signed(value: number): number { if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new Error('Actual int32 field required'); return value; }

/** Actual allocator capability. Typed-array identity is never a heap address. */
export interface NativeAttributeAllocation {
  readonly identity: object; readonly bytes: Uint8Array; readonly knownMask: Uint8Array; freed: boolean;
}
export class NativeAttributeBytes {
  constructor(readonly allocation: NativeAttributeAllocation, readonly length: number, private readonly guard: () => void) {}
  private memory(): void {
    if (this.allocation.freed || this.allocation.bytes.length !== this.length || this.allocation.knownMask.length !== this.length) throw new Error('Actual Attribute allocation lifetime/extent differs');
  }
  get bytes(): Uint8Array { this.memory(); return this.allocation.bytes; }
  get knownMask(): Uint8Array { this.memory(); return this.allocation.knownMask; }
  private range(at: number, n: number): void { this.memory(); if (!Number.isInteger(at) || !Number.isInteger(n) || at < 0 || n < 0 || at + n > this.length) throw new Error('Actual Attribute storage bounds differ'); }
  raw(at: number, n: number): Uint8Array { this.guard(); this.range(at, n); if (this.knownMask.subarray(at, at + n).some(v => v !== 255)) throw new Error('Uninitialized Attribute bytes+' + at.toString(16)); return this.bytes.slice(at, at + n); }
  uint(at: number): number { const a = this.raw(at, 4); return new DataView(a.buffer).getUint32(0, true); }
  write(at: number, bytes: Uint8Array, masks?: Uint8Array): void { this.guard(); this.range(at, bytes.length); if (masks && masks.length !== bytes.length) throw new Error('Actual Attribute mask length differs'); this.bytes.set(bytes, at); if (masks) this.knownMask.set(masks, at); else this.knownMask.fill(255, at, at + bytes.length); this.guard(); }
  put(at: number, value: number): void { this.write(at, rawWord(value)); }
  pointer(at: number, value: object | null): void { if (value === null) this.put(at, 0); else this.write(at, new Uint8Array(4), new Uint8Array(4)); }
  alias(at: number, value: object | null): void { this.guard(); this.range(at, 4); if (value === null ? this.uint(at) !== 0 : this.knownMask.subarray(at, at + 4).some(v => v !== 0)) throw new Error('Attribute physical pointer slot differs from its retained capability'); }
}
export interface NativeAttributeCStringAllocation {
  readonly identity: object; readonly text: string; readonly length: number; referenceCount: number; freed: boolean;
}
export interface NativeAttributeCStringSource { readonly pointer: NativeAttributeCStringAllocation | null; readonly text: string }
export class NativeAttributeCStringSlot implements NativeAttributeCStringSource {
  private current: NativeAttributeCStringAllocation | null | undefined;
  constructor(readonly nativeOffset: number, readonly storage: NativeAttributeBytes, readonly reader: OriginalAttributeReader) {}
  get pointer(): NativeAttributeCStringAllocation | null {
    this.reader.guard(); if (this.current === undefined) throw new Error('Attribute CString is not constructed');
    this.storage.alias(this.nativeOffset, this.current); if (this.current?.freed) throw new Error('Attribute CString points to ended data lifetime'); return this.current;
  }
  set pointer(value: NativeAttributeCStringAllocation | null) {
    this.reader.guard(); if (value && (!value.identity || typeof value.text !== 'string' || value.length !== value.text.length || value.freed ||
      !Number.isInteger(value.referenceCount) || value.referenceCount < 0 || value.referenceCount > 65535)) throw new Error('Actual owned CString allocation required');
    this.current = value; this.storage.pointer(this.nativeOffset, value); this.reader.guard();
  }
  get text(): string { return this.pointer?.text ?? ''; }
}
export interface NativeAttributeReadingHost {
  allocateWrapper?(bytes: 16, tag: 0x190, kind: AttributeClass): NativeValue<NativeAttributeAllocation | null>;
  allocateNative?(bytes: 24 | 32, tag: 0xc4, kind: AttributeClass, wrapper: NativeReflectionWrapper): NativeValue<NativeAttributeAllocation | null>;
  /** Exact SetText/assignment ownership services, preserving NULL versus an
   * allocated empty source. Read consumes exactly one indexed ushort. */
  assignCStringText?(destination: NativeAttributeCStringSlot, text: string): NativeValue<void>;
  assignCString?(destination: NativeAttributeCStringSlot, source: NativeAttributeCStringSource): NativeValue<void>;
  readCString?(destination: NativeAttributeCStringSlot, input: NativeEntityByteInput): NativeValue<void>;
  freeCString?(captured: NativeAttributeCStringAllocation): NativeValue<void>;
  warning?(message: string, source: string): NativeValue<void>;
  deletingNative?(captured: OriginalNativeAttribute, argument: 0): NativeValue<void>;
  freeNative?(captured: NativeAttributeAllocation): NativeValue<void>;
}
interface AttributeState {
  readonly wrapper: NativeReflectionWrapper; readonly wrapperStorage: NativeAttributeBytes;
  readonly storage: NativeAttributeBytes; readonly tag: NativeAttributeCStringSlot;
  readonly native: OriginalNativeAttribute; nativeWrapper: NativePropertyObjectReference | null;
  constructing: boolean;
}

export class OriginalAttributeReader {
  readonly attributeFactory: NativeReflectionFactory; readonly statFactory: NativeReflectionFactory;
  private readonly states = new Map<NativeReflectionWrapper, AttributeState>();
  private readonly allocations = new Set<object>();
  private readonly heap: NativeAttributeAllocation[] = [];
  private active = false; private reentry = false; private hostDepth = 0;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeAttributeReadingHost) {
    const make = (kind: AttributeClass): NativeReflectionFactory => ({
      root: { className: kind, baseClassName: rules.classes[kind].baseClassName, fields: rules.classes[kind].fields },
      nativeCategory: 'non-property-set',
      cloneRoot: c => c === controller ? this.run(() => this.construct(kind)) : unknown('Same Attribute reflection controller required'),
      getVersion: w => controller.value(() => { this.exact(w); return 1; }),
      read: (w, input) => this.run(() => this.read(w, input)),
    });
    this.attributeFactory = make('gCAttribute'); this.statFactory = make('gCStat');
    fact(controller.registerFactory(this.attributeFactory), 'actual gCAttribute factory');
    fact(controller.registerFactory(this.statFactory), 'actual gCStat factory');
  }
  guard(): void { if (this.reentry) throw new Error('Reentrant Attribute mutation is blocked'); const required = this.controller.receipt().required; if (required !== null) throw new Error(required); }
  private run<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.reentry = true; return this.controller.value(() => { throw new Error('Public reentrant Attribute operation is outside the original selected profile'); }); }
    this.active = true; try { return this.controller.value(() => { this.guard(); const value = body(); this.guard(); return value; }); } finally { this.active = false; }
  }
  private note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  private effect<T>(operation: string, source: string, call: () => NativeValue<T> | undefined): T {
    this.guard(); const value = this.controller.effect(operation, source, () => {
      this.hostDepth++; try { return call(); } finally { this.hostDepth--; }
    }); this.guard(); return value;
  }
  private runtimeGuard(state: AttributeState): void {
    if (this.hostDepth !== 0) { this.reentry = true; throw new Error('Native Attribute consumer access during an ownership callback is outside the selected profile'); }
    this.validateState(state);
  }
  private fresh(memory: NativeAttributeAllocation | null, length: number): NativeAttributeAllocation {
    if (!memory || !memory.identity || memory.freed || memory.bytes.length !== length || memory.knownMask.length !== length ||
      memory.knownMask.some(v => v !== 0) || this.allocations.has(memory.identity)) throw new Error('Selected successful fresh exact Attribute allocation/uninitialized mask required');
    if (this.heap.some(old => !old.freed && old.bytes.buffer === memory.bytes.buffer &&
      old.bytes.byteOffset < memory.bytes.byteOffset + length && memory.bytes.byteOffset < old.bytes.byteOffset + old.bytes.length)) throw new Error('Fresh native Attribute allocation overlaps an actual retained allocation');
    this.allocations.add(memory.identity); this.heap.push(memory); return memory;
  }
  /** Retained physical allocations remain inspectable after a stopped prefix;
   * operational field/CString access still requires the live guard. */
  retainedAllocations(): readonly NativeAttributeAllocation[] { return this.heap.slice(); }
  private factory(kind: AttributeClass): NativeReflectionFactory { return kind === 'gCAttribute' ? this.attributeFactory : this.statFactory; }
  private validateState(state: AttributeState): void {
    this.guard(); if (state.wrapper.deleted || this.states.get(state.wrapper) !== state || state.storage.allocation.freed || state.wrapperStorage.allocation.freed) throw new Error('Same live Attribute allocation required');
    if (Object.getPrototypeOf(state.native) !== OriginalNativeAttribute.prototype ||
      state.wrapperStorage.uint(0) !== parseInt(rules.classes[state.native.kind].wrapperVtable, 16)) throw new Error('Original concrete Attribute instance/wrapper dispatch required');
    const masks = state.wrapperStorage.knownMask, bytes = state.wrapperStorage.bytes,
      mask = new DataView(masks.buffer, masks.byteOffset).getUint32(4, true), flags = new DataView(bytes.buffer, bytes.byteOffset).getUint32(4, true);
    if (mask !== 0x07ffffff || (flags & 7) !== 2) throw new Error('Actual Attribute wrapper count/root/embedded flag profile required');
    state.wrapperStorage.alias(0xc, state.wrapper.factory);
    const retained = this.controller.allocations().find(a => a.wrapper === state.wrapper);
    if (!retained || (retained.nativeObject !== state.native && !(state.constructing && retained.nativeObject === null))) throw new Error('Same retained OriginalNativeAttribute required');
    if (['attached', 'initialized', 'read'].includes(retained.phase) &&
      (state.wrapper.native !== state.native || state.nativeWrapper !== state.wrapper)) throw new Error('Actual attached Attribute pointer relation changed outside a source lifetime operation');
    if (['attached', 'initialized', 'read'].includes(retained.phase) && ((flags >>> 3) & 0xffffff) !== 0 &&
      state.storage.uint(8) !== 0x80000001) throw new Error('Attached native Attribute physical count1/created bit differs from delegated wrapper ownership');
    state.storage.alias(4, state.nativeWrapper);
    if (!state.constructing && state.storage.uint(0) !== parseInt(rules.classes[state.native.kind].nativeVtable, 16)) throw new Error('Actual original Attribute leaf vtable required');
  }
  private exact(wrapper: NativeReflectionWrapper): AttributeState {
    this.guard(); const state = this.states.get(wrapper); if (!state || wrapper.factory !== this.factory(state.native.kind)) throw new Error('Actual registered Attribute/Stat wrapper required');
    this.validateState(state); if (state.constructing || wrapper.native !== state.native || state.nativeWrapper !== wrapper) throw new Error('Actual same attached Attribute native object required'); return state;
  }
  private stateFor(native: OriginalNativeAttribute): AttributeState {
    const state = [...this.states.values()].find(s => s.native === native); if (!state) throw new Error('Actual retained Attribute capability required'); this.validateState(state); return state;
  }
  attribute(wrapper: NativeReflectionWrapper): NativeValue<OriginalNativeAttribute> {
    const cast = this.controller.value(() => {
      this.guard();
      if (wrapper.controller === this.controller && wrapper.factory !== this.attributeFactory && wrapper.factory !== this.statFactory &&
        wrapper.factory.nativeCategory !== undefined && !wrapper.deleted && this.controller.allocations().some(a => a.wrapper === wrapper && a.nativeObject === wrapper.native && a.nativeObject !== null)) return null;
      return this.exact(wrapper).native;
    });
    return cast.known ? cast.value === null ? unknown('Actual known other concrete class fails gCAttribute RTTI cast') : known(cast.value) : cast;
  }
  storage(native: OriginalNativeAttribute): NativeValue<NativeAttributeBytes> { return this.controller.value(() => this.stateFor(native).storage); }
  tag(native: OriginalNativeAttribute): NativeValue<NativeAttributeCStringSlot> { return this.controller.value(() => this.stateFor(native).tag); }
  private notification(result: OriginalPlayerPropertyResult<null>): void {
    for (const t of result.trace) this.note(t.operation + ' ' + (t.field ?? '') + (t.value === undefined ? '' : '=' + t.value), t.source);
    if (!result.supported) throw new Error(result.reason);
  }
  private text(slot: NativeAttributeCStringSlot, text: string): void {
    this.effect('actual CString char-pointer assignment/SetText ownership', 'SharedBase:10006479', () => this.host.assignCStringText?.(slot, text));
    if (slot.text !== text) throw new Error('CString assignment did not store original text');
  }
  private clear(slot: NativeAttributeCStringSlot): void {
    const old = slot.pointer; if (old === null || old.length === 0) { this.note('CString.Clear preserves NULL/allocated-empty', 'SharedBase:100149b0'); return; }
    old.referenceCount = (old.referenceCount - 1) & 65535; this.note('CString.Clear captured ushort decrement', 'SharedBase:100149b0');
    if (old.referenceCount === 0) { this.effect('actual CString data Free', 'SharedBase:100149b0', () => this.host.freeCString?.(old)); if (!old.freed) throw new Error('CString Free did not end actual captured lifetime'); }
    slot.pointer = null; this.note('CString.Clear nonempty pointerNULL', 'SharedBase:100149b0');
  }
  private defaults(state: AttributeState, stat: boolean): void {
    const dispatch = stat ? 0x2065db4c : 0x2065da7c;
    if (state.storage.uint(0) !== dispatch) throw new Error('Actual ApplyDefaults leaf dispatch required');
    if (stat) { state.storage.put(0x18, 100); state.storage.put(0x1c, 0); this.note('Stat.ApplyDefaults own100/0 before inherited defaults', 'Game:2039aea0'); }
    this.text(state.tag, ''); this.validateState(state); if (state.storage.uint(0) !== dispatch) throw new Error('Captured ApplyDefaults receiver dispatch changed during CString callback');
    state.storage.put(0x14, 100); state.storage.put(0x10, 0); this.note('Attribute.ApplyDefaults Tagempty Value100 Modifier0', 'Game:20013ed5');
  }
  private bindWrapper(wrapper: NativeReflectionWrapper, storage: NativeAttributeBytes, kind: AttributeClass): void {
    let native: NativeReflectionNativeObject | null = null;
    Object.defineProperty(wrapper, 'native', { get: () => { this.guard(); storage.alias(8, native); return native; }, set: (value: NativeReflectionNativeObject | null) => {
      this.guard(); if (value !== null && this.states.get(wrapper)?.native !== value) throw new Error('Same retained Attribute wrapper native required'); native = value; storage.pointer(8, value);
    } });
    Object.defineProperties(wrapper.flags, { value: { get: () => { this.guard(); const a = storage.bytes; return new DataView(a.buffer, a.byteOffset).getUint32(4, true); }, set: (v: number) => { storage.write(4, rawWord(v), storage.knownMask.slice(4, 8)); } },
      knownMask: { get: () => { this.guard(); const a = storage.knownMask; return new DataView(a.buffer, a.byteOffset).getUint32(4, true); }, set: (v: number) => { storage.write(4, storage.bytes.slice(4, 8), rawWord(v)); } } });
    storage.write(4, rawWord(0), rawWord(0x07fffff8));
    storage.put(0, 0x100ea224); storage.write(4, rawWord(10), rawWord(0x07ffffff)); this.note('wrapper base ctor staged count mask/reference1/nonroot flags', 'SharedBase:10089290');
    storage.pointer(8, null); storage.put(0, parseInt(rules.classes[kind].wrapperVtable, 16)); storage.pointer(0xc, wrapper.factory);
    this.note('wrapper16B original vtable/flags/nonroot/nativeNULL/type capability', kind === 'gCAttribute' ? 'Game:2039a790' : 'Game:2039d460');
  }
  private construct(kind: AttributeClass): NativeReflectionWrapper {
    const wrapperSource = kind === 'gCAttribute' ? 'Game:2039a790' : 'Game:2039d460';
    const wrapperMemory = this.fresh(this.effect('actual new16/tag190 wrapper', wrapperSource, () => this.host.allocateWrapper?.(16, 0x190, kind)), 16);
    const wrapper = this.controller.allocateWrapper(this.factory(kind), wrapperSource), wrapperStorage = new NativeAttributeBytes(wrapperMemory, 16, () => { this.guard(); if (wrapper.deleted) throw new Error('Ended Attribute wrapper lifetime'); });
    this.bindWrapper(wrapper, wrapperStorage, kind);
    const bytes = rules.classes[kind].nativeBytes, allocator = kind === 'gCAttribute' ? 'Game:203980f0' : 'Game:2039b680';
    const memory = this.fresh(this.effect('actual new' + bytes + '/tagc4 native', allocator, () => this.host.allocateNative?.(bytes, 0xc4, kind, wrapper)), bytes);
    const storage = new NativeAttributeBytes(memory, bytes, () => this.guard()), tag = new NativeAttributeCStringSlot(0xc, storage, this);
    let state: AttributeState;
    const values = {} as OriginalAttributeValues;
    Object.defineProperty(values, 'Tag', { enumerable: true, get: () => { this.runtimeGuard(state); return tag.text; }, set: (value: string) => { this.runtimeGuard(state); if (typeof value !== 'string') throw new Error('Actual Tag text required'); this.text(tag, value); this.runtimeGuard(state); } });
    const fields = kind === 'gCStat' ? [...rules.classes.gCAttribute.fields, ...rules.classes.gCStat.fields] : rules.classes.gCAttribute.fields;
    for (const field of fields.filter(f => f.typeName === 'int')) Object.defineProperty(values, field.name, { enumerable: true,
      get: () => { this.runtimeGuard(state); return storage.uint(field.nativeOffset) | 0; },
      set: (value: number) => { this.runtimeGuard(state); storage.put(field.nativeOffset, signed(value) >>> 0); this.runtimeGuard(state); } });
    const native = new OriginalNativeAttribute(wrapper.identity + ':native', kind, values, { warning: (message, source) => this.controller.value(() => {
      this.effect('actual Attribute warning', source, () => this.host.warning?.(message, source));
    }) }, {
      guard: () => this.runtimeGuard(state), readReferenceWord: () => storage.uint(8), writeReferenceWord: value => storage.put(8, value),
      readWrapper: () => { storage.alias(4, state.nativeWrapper); return state.nativeWrapper; },
      writeWrapper: value => { if (value !== null && value !== wrapper) throw new Error('Same native Attribute wrapper required'); state.nativeWrapper = value; storage.pointer(4, value); },
    });
    Object.freeze(values); Object.freeze(native);
    state = { wrapper, wrapperStorage, storage, tag, native, nativeWrapper: null, constructing: true }; this.states.set(wrapper, state);
    storage.put(0, 0x100e7e1c); storage.put(4, 0); storage.put(0, 0x100e7eac); storage.put(8, 1);
    this.controller.retainObject(wrapper, native); this.note('staged RefBase ctor wrapperNULL/reference1 on same object', 'SharedBase:10001d07');
    storage.put(0, 0x2065da7c); tag.pointer = null; this.note('Attribute leaf/CStringNULL before virtual ApplyDefaults', 'Game:20397cd0'); this.defaults(state, false);
    if (kind === 'gCStat') { storage.put(0, 0x2065db4c); this.note('Stat leaf after completed Attribute base constructor', 'Game:2039b270'); this.defaults(state, true); }
    state.constructing = false; native.referenceWord = (native.referenceWord | 0x80000000) >>> 0; this.note('virtual SharedBase.Create returns1 and sets created bit31', 'SharedBase:100079fa');
    this.controller.setAllocationPhase(wrapper, 'created'); this.controller.attachConstructedNative(wrapper, native, kind === 'gCAttribute' ? 'Game:20397e60' : 'Game:2039b400', allocator);
    this.controller.initializeProperties(wrapper, field => this.controller.value(() => {
      const current = this.exact(wrapper); if (field.typeName === 'bCString') this.clear(current.tag); else current.storage.put(field.nativeOffset, 0xffffffff);
      this.note('actual descriptor default ' + field.name + ' without notification', field.defaultInitializer!);
    }), () => this.controller.value(() => { const current = this.exact(wrapper); this.defaults(current, kind === 'gCStat'); this.note('PostInitialize virtual ApplyDefaults', 'Game:20397ca0'); }), kind === 'gCAttribute' ? 'Game:20398b00' : 'Game:2039c070');
    return wrapper;
  }
  private indexedString(slot: NativeAttributeCStringSlot, input: NativeEntityByteInput): void {
    const before = input.cursor(), index = before + 2 <= input.end ? new DataView(input.bytes.buffer, input.bytes.byteOffset + before, 2).getUint16(0, true) : -1, text = input.strings[index];
    if (typeof text !== 'string') throw new Error('Original indexed Attribute CString source is absent');
    this.effect('actual indexed CString Read/SetText ownership', 'SharedBase:10015430', () => this.host.readCString?.(slot, input));
    if (input.cursor() !== before + 2 || slot.text !== text) throw new Error('Attribute CString service did not consume/store exact indexed source');
  }
  private read(wrapper: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    const kind = this.exact(wrapper).native.kind;
    return this.controller.readWrapperProperties(wrapper, input, {
      wrapperSource: kind === 'gCAttribute' ? 'Game:20398c90' : 'Game:2039c210', dataSource: kind === 'gCAttribute' ? 'Game:2039aa80' : 'Game:2039d680',
      readField: (field, stream) => this.controller.value(() => {
        stream.u16(); stream.u32(); this.notification(this.exact(wrapper).native.notifyReflectedProperty('enter', field.name));
        const current = this.exact(wrapper); // descriptor resolves native after Enter
        if (field.typeName === 'bCString') this.indexedString(current.tag, stream); else if (field.typeName === 'int') current.storage.write(field.nativeOffset, stream.take(4)); else throw new Error('Unproved Attribute descriptor payload');
        this.notification(this.exact(wrapper).native.notifyReflectedProperty('exit', field.name)); // receiver reread before Exit
      }),
      readNative: stream => this.controller.value(() => { this.exact(wrapper); stream.u16(); this.note('SharedBase.Read consumes native version only; returns1', 'SharedBase:100073ce'); }),
    });
  }
  private addReference(native: OriginalNativeAttribute): number {
    this.stateFor(native); const wrapper = native.wrapper;
    if (wrapper !== null) { this.note('native AddReference delegates current wrapper virtual+30', 'SharedBase:100022d4'); return fact(wrapper.addReference(), 'actual native wrapper AddReference'); }
    const current = native.referenceWord; native.referenceWord = (((current + 1 ^ current) & 0x7fffffff) ^ current) >>> 0;
    this.note('native AddReference physical31-bit count increment', 'SharedBase:100022d4'); return native.referenceWord & 0x7fffffff;
  }
  nativeAddReference(native: OriginalNativeAttribute): NativeValue<number> { return this.run(() => this.addReference(native)); }
  nativeReleaseReference(native: OriginalNativeAttribute): NativeValue<number> {
    return this.run(() => {
      const state = this.stateFor(native), wrapper = native.wrapper;
      if (wrapper !== null && fact(wrapper.getReferenceCount(), 'actual wrapper count') !== 0) {
        this.note('native ReleaseReference delegates live wrapper virtual+34', 'SharedBase:1000551a');
        this.hostDepth++; try { return fact(wrapper.releaseReference(), 'actual native wrapper ReleaseReference'); } finally { this.hostDepth--; }
      }
      const current = native.referenceWord;
      if ((current & 0x7fffffff) > 1) { native.referenceWord = (((current - 1 ^ current) & 0x7fffffff) ^ current) >>> 0; this.note('native ReleaseReference physical31-bit decrement', 'SharedBase:1000551a'); return native.referenceWord & 0x7fffffff; }
      native.referenceWord = (current & 0x80000000) >>> 0; this.note('native last reference clear before captured destructor', 'SharedBase:1000551a');
      this.effect('actual native deleting destructor arg0', 'SharedBase:1000551a', () => this.host.deletingNative?.(native, 0));
      this.effect('actual native MemoryAdmin.DeleteObject', 'SharedBase:1000551a', () => this.host.freeNative?.(state.storage.allocation));
      if (!state.storage.allocation.freed) throw new Error('Native DeleteObject did not end captured allocation lifetime'); return 0;
    });
  }
  /**20320af0/20320b80 temporary creator already contains QueryNewObject's
   * returned pointer. SetInstance therefore adds and releases that same wrapper. */
  create(kind: AttributeClass): NativeValue<OriginalNativeAttribute> {
    return this.run(() => {
      if (kind !== 'gCAttribute' && kind !== 'gCStat') throw new Error('Actual native Attribute/Stat class required');
      const source = kind === 'gCAttribute' ? 'Game:20320af0' : 'Game:20320b80', wrapper = this.construct(kind);
      this.note('QueryNewObject returns actual root Clone into temporary creator', source);
      fact(wrapper.addReference(), 'creator SetInstance incoming'); fact(wrapper.releaseReference(), 'creator SetInstance captured same old pointer'); this.note('creator SetInstance same pointer add/release/assignment', 'SharedBase:1000574f');
      const native = this.exact(wrapper).native; this.addReference(native); const returned = this.exact(wrapper).native;
      const panic = this.effect('create helper ErrorAdmin.IsInPanicState', 'SharedBase:10007356', () => this.controller.clockHost.isInPanicState());
      if (!panic) fact(wrapper.releaseReference(), 'create helper creator destructor'); this.note('create helper returns same native capability', source); return returned;
    });
  }
  setTag(native: OriginalNativeAttribute, source: NativeAttributeCStringSource): NativeValue<void> {
    return this.run(() => {
      const state = this.stateFor(native); this.notification(native.notifyTag('enter'));
      const captured = source.pointer, text = source.text; this.effect('actual CString reference assignment for SetTag', 'SharedBase:10004638', () => this.host.assignCString?.(state.tag, source));
      this.stateFor(native); if (source.pointer !== captured || source.text !== text || state.tag.text !== text) throw new Error('SetTag actual source/destination assignment differs');
      this.notification(native.notifyTag('exit')); this.note('SetTag false notification/CString assignment/Cap complete', 'Game:200111b7');
    });
  }
}
