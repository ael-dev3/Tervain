/** Installed Inventory factory and current Hero physical read. The retained
 * serialized stacks, slots and proxy allocations are not a startup projection,
 * activated equipment, item entities or a resident world property set. */
import rulesText from '../../assets/gothic3/inventory-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyCallbacks, NativePropertyObjectReference } from './entity-lifecycle';
import type { OriginalProxyInternalReference } from './native-properties';
import { NativeReflectionWrapper, loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionAccessor,
  NativeReflectionNativeObject } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';

const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; nativeBytes: number;
  getVersion: number; propertyType: number; nativeVtable: string; slotNativeVtable: string;
  fields: Record<'gCInventory_PS' | 'gCInventorySlot', readonly NativeReflectionField[]>;
  sourceHero: { index: number; packetSha256: string }; sources: Record<string, string> };
if (rules.schema !== 'gothic3-inventory-reading-rules-v1' || rules.nativeBytes !== 232 || rules.getVersion !== 9 || rules.propertyType !== 31 ||
    rules.nativeVtable !== '2067cfac' || rules.slotNativeVtable !== '2065c42c' || rules.sourceHero.index !== 7 ||
    rules.fields.gCInventory_PS.map(field => field.nativeOffset).join(',') !== '24,25,28,32,36,40,44' ||
    rules.fields.gCInventorySlot.map(field => field.nativeOffset).join(',') !== '12,24,52' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original Inventory receipt differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, operation: string): T { if (!value.known) throw new Error(operation + ': ' + value.reason); return value.value; }
function uint(value: number): number { if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original uint32 required'); return value; }
function hex(bytes: Uint8Array): string { return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''); }

/** Unknown backing bytes have mask0. Numeric pointer addresses are not invented:
 * each non-NULL pointer names the retained capability in its owning object. */
export class NativeInventoryBytes {
  readonly bytes: Uint8Array; readonly knownMask: Uint8Array; private readonly view: DataView;
  revision = 0;
  constructor(readonly size: number) {
    if (!Number.isInteger(size) || size < 1) throw new Error('Actual native allocation size required');
    this.bytes = new Uint8Array(size); this.knownMask = new Uint8Array(size); this.view = new DataView(this.bytes.buffer);
  }
  private range(at: number, length: number): void { if (!Number.isInteger(at) || !Number.isInteger(length) || at < 0 || length < 0 || at + length > this.size) throw new Error('Original Inventory byte range differs'); }
  has(at: number, length: number): boolean { this.range(at, length); return this.knownMask.subarray(at, at + length).every(mask => mask === 255); }
  byte(at: number): number { if (!this.has(at, 1)) throw new Error('Unknown original Inventory byte'); return this.view.getUint8(at); }
  uint(at: number): number { if (!this.has(at, 4)) throw new Error('Unknown original Inventory DWORD'); return this.view.getUint32(at, true); }
  writeByte(at: number, value: number): void { this.range(at, 1); if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Original byte required'); this.view.setUint8(at, value); this.knownMask[at] = 255; this.revision++; }
  writeUint(at: number, value: number): void { this.range(at, 4); this.view.setUint32(at, uint(value), true); this.knownMask.fill(255, at, at + 4); this.revision++; }
  unknownPointer(at: number): void { this.range(at, 4); this.knownMask.fill(0, at, at + 4); this.revision++; }
}

export interface NativeInventoryReadingHost {
  /** Exact current mutable Game DWORD207b5f2c. Constructor reads it before its
   * zero temporary; descriptor default reads it again before PostInit zero. */
  slotDefault: NativeMaskedWord;
  /** Actual diagnostics, not silent successful logging substitutes. */
  warning?(kind: 'stack-version' | 'slot-version' | 'missing-slots' | 'patch-owner' | 'patch-no-owner', value?: number | string): NativeValue<void>;
  ownerName?(owner: NativeLiveEntity): NativeValue<string>;
  /** Needed only when an already-owned template ID is replaced. Current fresh
   * Hero reads allocate two IDs without deleting a prior allocation. */
  deleteTemplateId?(allocation: OriginalInventoryPropertyID): NativeValue<void>;
}

/** A real owned20B template-proxy allocation. Template pointer-presence validity
 * differs from the embedded EntityProxy's first16B GUID validity. */
export class OriginalInventoryPropertyID {
  readonly bytes = new Uint8Array(20); destroyed = false; deleted = false;
  constructor(readonly identity: string) { if (!identity) throw new Error('Actual PropertyID allocation identity required'); }
}
export class OriginalInventoryTemplateProxy {
  cachedTemplate: object | null = null;
  propertyId: OriginalInventoryPropertyID | null = null;
  readonly nativeVtable = 0x3087c124;
  hasPropertyIdPointer(): boolean { return this.propertyId !== null; }
}
/** One embedded20B ID plus one cached internal-reference capability. Mutation
 * is owned by the reader so callbacks are checked before subsequent writes. */
export class OriginalInventoryEntityProxy {
  id20 = '0000000000000000000000000000000000000000';
  internal: OriginalProxyInternalReference | null = null;
  propertyID(): string { if (!/^[a-f0-9]{40}$/.test(this.id20)) throw new Error('Actual embedded20B PropertyID required'); return this.id20; }
}

/** Same physical slot-list header+backing. Resize may replace the allocation;
 * Clear retains it, and source count/capacity remain in the PS byte store. */
export class OriginalInventorySlotList {
  allocation: (OriginalInventorySlot | null | undefined)[] | null = null;
  allocationEpoch = 0;
  constructor(readonly storage: NativeInventoryBytes) {}
  get count(): number { return this.storage.uint(0x44) | 0; }
  get capacity(): number { return this.storage.uint(0x48) | 0; }
  slot(index: number): OriginalInventorySlot | null {
    if (!Number.isInteger(index) || index < 0 || index >= this.count || !this.allocation) throw new Error('Original live slot index required');
    const slot = this.allocation[index]; if (slot === undefined) throw new Error('Unknown physical slot pointer'); return slot;
  }
}
export class OriginalInventoryStackList {
  /** A concrete nonempty stack factory/reader is required before adding a
   * pointer. This current fresh allocation has NULL backing and count0. */
  allocation: object[] | null = null;
  listener: object | null = null;
  constructor(readonly storage: NativeInventoryBytes) {}
  get count(): number { return this.storage.uint(0x34) | 0; }
  get capacity(): number { return this.storage.uint(0x38) | 0; }
}

export class OriginalInventoryProperties {
  readonly storage = new NativeInventoryBytes(232); readonly nativeVtables = new Map<number, number>();
  readonly strings = new Map<number, { pointer: null; text: '' }>();
  readonly proxies = new Map<number, OriginalInventoryEntityProxy>();
  readonly slots = new OriginalInventorySlotList(this.storage); readonly stacks = new OriginalInventoryStackList(this.storage);
  readonly listeners: object[] = []; owner: NativeLiveEntity | null = null;
  readonly base: NativeLivePropertySet<OriginalInventoryProperties>;
  lastReadReturnByte: 0 | 1 | null = null;
  constructor(readonly reflectionWrapper: NativeReflectionWrapper, readonly reader: OriginalInventoryReader) {
    const empty = (set: NativeLivePropertySet<object>): NativeValue<void> => set === this.base ? known(undefined) : unknown('Actual Inventory callback receiver required');
    const callbacks: NativePropertyCallbacks = { added: empty, removed: empty, postRead: set => set === this.base ? reader.postRead(this) : unknown('Actual Inventory postRead receiver required') };
    this.base = new NativeLivePropertySet(reflectionWrapper.identity + ':native', 'gCInventory_PS', 31, this,
      { read: () => this.owner, write: entity => { this.owner = entity; } }, null, callbacks, () => known(false));
  }
  exact(attached = true): void {
    const wrapper = this.reflectionWrapper, allocation = wrapper.controller.allocations().find(value => value.wrapper === wrapper);
    if (wrapper.deleted || allocation?.propertySet !== this.base || this.base.values !== this ||
        (attached && (wrapper.native !== this.base || this.base.wrapper !== wrapper || this.nativeVtables.get(0) !== 0x2067cfac))) throw new Error('Exact retained original Inventory allocation required');
  }
  get generatedPlunder(): boolean { this.exact(); return this.storage.byte(0x18) !== 0; }
  get generatedTrade(): boolean { this.exact(); return this.storage.byte(0x19) !== 0; }
  treasureSet(index: 1 | 2 | 3 | 4 | 5): string { this.exact(); const value = this.strings.get(0x18 + index * 4); if (!value) throw new Error('Uninitialized original CString'); return value.text; }
}

export class OriginalInventorySlot implements NativeReflectionNativeObject<OriginalInventorySlot> {
  readonly identity: string; readonly className = 'gCInventorySlot'; readonly values = this;
  referenceWord = 1; wrapper: NativePropertyObjectReference | null = null;
  readonly storage = new NativeInventoryBytes(60); readonly nativeVtables = new Map<number, number>();
  template: OriginalInventoryTemplateProxy | null = null; item: OriginalInventoryEntityProxy | null = null;
  constructor(readonly reflectionWrapper: NativeReflectionWrapper, readonly reader: OriginalInventoryReader) { this.identity = reflectionWrapper.identity + ':native'; }
  exact(attached = true): void {
    const wrapper = this.reflectionWrapper, allocation = wrapper.controller.allocations().find(value => value.wrapper === wrapper);
    if (wrapper.deleted || allocation?.nativeObject !== this || this.values !== this ||
        (attached && (wrapper.native !== this || this.wrapper !== wrapper || this.nativeVtables.get(0) !== 0x2065c42c))) throw new Error('Exact retained original InventorySlot required');
  }
  get slot(): number { this.exact(); return this.storage.uint(0x38) | 0; }
}

/** Factory pair shares one controller, while scoped Inventory and nested Slot
 * operations are distinct native receivers. Same-receiver callback reentry is
 * rejected immediately with its retained prefix, never silently replayed. */
export class OriginalInventoryReader {
  readonly factory: NativeReflectionFactory; readonly slotFactory: NativeReflectionFactory;
  private readonly retained = new WeakMap<NativeReflectionWrapper, OriginalInventoryProperties>();
  private readonly retainedSlots = new WeakMap<NativeReflectionWrapper, OriginalInventorySlot>();
  private active: 'inventory' | 'slot' | null = null; private nestedAttempt = false; private idAllocation = 0;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeInventoryReadingHost) {
    const fields = (className: 'gCInventory_PS' | 'gCInventorySlot'): readonly NativeReflectionField[] => Object.freeze(rules.fields[className].map(field => Object.freeze({ ...field })));
    const root = Object.freeze({ className: 'gCInventory_PS', baseClassName: 'eCEntityPropertySet', fields: fields('gCInventory_PS') });
    const slotRoot = Object.freeze({ className: 'gCInventorySlot', baseClassName: null, fields: fields('gCInventorySlot') });
    this.factory = { root, nativeCategory: 'entity-property-set', cloneRoot: current => current === controller ? this.run('inventory', () => this.construct()) : unknown('Same original controller required'),
      read: (wrapper, input) => this.run('inventory', () => this.read(wrapper, input)), getVersion: wrapper => { const result = this.properties(wrapper); return result.known ? known(9) : result; } };
    this.slotFactory = { root: slotRoot, nativeCategory: 'non-property-set', cloneRoot: current => current === controller ? this.run('slot', () => this.constructSlot()) : unknown('Same original controller required'),
      read: (wrapper, input) => this.run('slot', () => this.readSlot(wrapper, input)), getVersion: wrapper => { const result = this.slotProperties(wrapper); return result.known ? known(1) : result; } };
    fact(controller.registerFactory(this.factory), 'Original Inventory factory registration'); fact(controller.registerFactory(this.slotFactory), 'Original InventorySlot factory registration');
  }
  private guard(): void { const required = this.controller.receipt().required; if (required !== null) throw new Error(required); if (this.nestedAttempt) throw new Error('Reentrant Inventory receiver mutation attempted'); }
  private run<T>(kind: 'inventory' | 'slot', body: () => T): NativeValue<T> {
    const previous = this.active;
    if (previous === kind || (previous === 'slot' && kind === 'inventory')) { this.nestedAttempt = true; return unknown('Reentrant Inventory receiver mutation unsupported'); }
    if (previous === null) this.nestedAttempt = false;
    this.active = kind;
    try { return this.controller.value(() => { this.guard(); const result = body(); this.guard(); return result; }); } finally { this.active = previous; }
  }
  private write(operation: string, source: string, body?: () => void): void { this.guard(); body?.(); this.controller.write(operation, source); this.guard(); }
  private effect<T>(operation: string, source: string, body: () => NativeValue<T> | undefined): T { this.guard(); const value = this.controller.effect(operation, source, body); this.guard(); return value; }
  properties(wrapper: NativeReflectionWrapper): NativeValue<OriginalInventoryProperties> { return this.lookup(wrapper, true); }
  retainedProperties(wrapper: NativeReflectionWrapper): NativeValue<OriginalInventoryProperties> { return this.lookup(wrapper, false); }
  private lookup(wrapper: NativeReflectionWrapper, attached: boolean): NativeValue<OriginalInventoryProperties> { const value = this.retained.get(wrapper); if (!value) return unknown('Actual Inventory wrapper required'); try { value.exact(attached); return known(value); } catch (error) { return unknown(String(error)); } }
  slotProperties(wrapper: NativeReflectionWrapper): NativeValue<OriginalInventorySlot> { const value = this.retainedSlots.get(wrapper); if (!value) return unknown('Actual InventorySlot wrapper required'); try { value.exact(); return known(value); } catch (error) { return unknown(String(error)); } }
  private actual(wrapper: NativeReflectionWrapper): OriginalInventoryProperties { return fact(this.properties(wrapper), 'Original Inventory receiver'); }
  private defaultSlot(): number { if (uint(this.host.slotDefault.knownMask) !== 0xffffffff) throw new Error('Current native Game Slot default DWORD207b5f2c is unknown'); return uint(this.host.slotDefault.value); }
  private field(factory: NativeReflectionFactory, field: NativeReflectionField): void { if (!factory.root.fields.includes(field)) throw new Error('Exact source descriptor required'); }
  private emptyCString(value: OriginalInventoryProperties, offset: number): void {
    value.exact(); const slot = value.strings.get(offset);
    if (!slot || slot.pointer !== null || slot.text !== '' || !value.storage.has(offset, 4) || value.storage.uint(offset) !== 0) {
      throw new Error('Actual current physicallyNULL CString destination/known pointer bytes required');
    }
  }
  private notify(value: OriginalInventoryProperties | OriginalInventorySlot, phase: 'enter' | 'exit', name: string): void {
    value.exact();
    if (value instanceof OriginalInventoryProperties) {
      const owner = value.base.owner.read(); if (owner !== null) this.write('outer owner.Modified pure read', 'Engine:NotifyEx', () => { owner.propertyOwner.modified(); });
      const current = value.base.owner.read(); if (current !== null) this.write('inner owner.Modified pure read', 'Engine:OnNotifyEx', () => { current.propertyOwner.modified(); });
    }
    this.write('inherited propagated ' + phase + ' returns true: ' + name, 'SharedBase:' + (phase === 'enter' ? '10001186' : '10005a65'));
  }
  private resizeSlots(value: OriginalInventoryProperties, requested: number, extra: number): void {
    const list = value.slots, oldCapacity = list.capacity;
    if (!Number.isInteger(requested) || requested < 0 || requested > 0x1fffffff) throw new Error('Selected finite positive source SlotList allocation domain required');
    if (oldCapacity >= requested) return;
    let growth = extra;
    if (growth < 1) { growth = extra === 0 ? Math.max(8, Math.min(1024, oldCapacity >> 3)) : 0; }
    const capacity = requested + growth;
    if (capacity > 0x1fffffff || list.count < 0 || list.count > oldCapacity) throw new Error('Original signed SlotList allocation extent unsupported');
    const previous = list.allocation, next = new Array<OriginalInventorySlot | null | undefined>(capacity);
    if (previous !== null) for (let index = 0; index < oldCapacity; index++) next[index] = previous[index];
    this.write('successful moving Realloc and backing-pointer assignment', 'Game:201ce5e0', () => { list.allocation = next; list.allocationEpoch++; value.storage.unknownPointer(0x40); });
    this.write('source memset begins at oldCount for newCapacity-oldCapacity pointers', 'Game:201ce5e0', () => { next.fill(null, list.count, list.count + capacity - oldCapacity); });
    this.write('SlotList capacity after memset', 'Game:201ce5e0', () => value.storage.writeUint(0x48, capacity));
  }
  private releaseSlot(slot: OriginalInventorySlot): void { slot.exact(); const wrapper = slot.wrapper; if (!wrapper) throw new Error('Unwrapped native Slot last-reference path unresolved'); this.effect('native Slot ReleaseReference forwards current wrapper', 'SharedBase:1004a400', () => wrapper.releaseReference()); }
  private clearSlots(value: OriginalInventoryProperties): void {
    const list = value.slots;
    if (list.count < 0) throw new Error('Corrupt negative native SlotList count is outside safe source profile');
    while (list.count !== 0) {
      const index = list.count - 1, slot = list.slot(index);
      if (slot !== null) {
        this.releaseSlot(slot);
        // Native re-reads count after its release/clear prefix, conditionally
        // memmoves/decrements using the saved index. This selected last-cell
        // branch requires unchanged count; it never invents unconditional pop
        // semantics when an actual destructor changed the list.
        if (list.count !== index + 1 || !list.allocation || index >= list.capacity) throw new Error('SlotList ReleaseReference changed saved-index/count branch; live memmove path required');
        this.write('SlotList released last pointer clear', 'Game:201ce7d0', () => { list.allocation![index] = null; });
      }
      if (list.count !== index + 1) throw new Error('Original SlotList saved-index/live-count conditional tail requires unchanged count');
      this.write('SlotList last count decrement (no trailing memmove)', 'Game:201ce7d0', () => value.storage.writeUint(0x44, list.count - 1));
    }
  }
  private initMissingSlots(value: OriginalInventoryProperties): void {
    this.resizeSlots(value, 19, 0); this.write('SlotList source count19', 'Game:201ce910', () => value.storage.writeUint(0x44, 19));
    for (let index = 0; index < 19; index++) {
      const slot = value.slots.slot(index);
      if (slot !== null && !slot.template?.hasPropertyIdPointer()) {
        const reread = value.slots.slot(index); if (reread !== null) { this.releaseSlot(reread); this.write('invalid template-ID-pointer slot clear', 'Game:201ce910', () => { value.slots.allocation![index] = null; }); }
      }
    }
  }
  private clearProxy(proxy: OriginalInventoryEntityProxy, source: string): void {
    const internal = proxy.internal;
    if (internal !== null) {
      this.effect('captured proxy internal ReleaseReference', source, () => internal.releaseReference());
      this.write('released proxy internal clear', source, () => { proxy.internal = null; });
    }
    this.write('proxy internal unconditional clear', source, () => { proxy.internal = null; });
    this.write('embedded PropertyID Destroy zero20', source, () => { proxy.id20 = '0000000000000000000000000000000000000000'; });
  }
  private construct(): NativeReflectionWrapper {
    const wrapper = this.controller.allocateWrapper(this.factory, rules.sources.allocate!), value = new OriginalInventoryProperties(wrapper, this);
    this.retained.set(wrapper, value); this.controller.retainNative(wrapper, value.base);
    this.write('inherited ObjectRefBase/EntityPropertySet constructor physical capabilities', 'Game:201a9116');
    this.write('Inventory primary and embedded listener vtables', 'Game:201a912c', () => { value.nativeVtables.set(0, 0x2067cfac); value.nativeVtables.set(0x14, 0x2067cf90); value.storage.unknownPointer(0); value.storage.unknownPointer(0x14); });
    for (const at of [0x1c, 0x20, 0x24, 0x28, 0x2c]) this.write('CString constructor NULL', 'Game:201a9139', () => { value.strings.set(at, { pointer: null, text: '' }); value.storage.writeUint(at, 0); });
    for (const at of [0x30, 0x34, 0x38, 0x3c]) this.write('stack-list constructor DWORD zero', 'Game:201cf930', () => value.storage.writeUint(at, 0));
    for (const at of [0x40, 0x44, 0x48]) this.write('slot-list constructor DWORD zero', 'Game:201cecc0', () => value.storage.writeUint(at, 0));
    this.initMissingSlots(value);
    for (const at of [0x4c, 0x50, 0x54]) this.write('listener array constructor DWORD zero', 'Game:201a916c', () => value.storage.writeUint(at, 0));
    for (const at of [0x58, 0x74, 0x90, 0xac, 0xc8]) this.write('EntityProxy constructor', 'Engine:304c45a0', () => { value.proxies.set(at, new OriginalInventoryEntityProxy()); value.storage.unknownPointer(at); });
    for (const at of [0x58, 0x74, 0x90]) this.clearProxy(value.proxies.get(at)!, 'Engine:304c43a0');
    this.clearSlots(value); this.write('ClearDefaultItems clears actual slotList+40; backing retained', 'Game:201adbe0');
    value.base.createBase(); this.write('fresh Inventory.Create inherited high-bit validity/return1', 'Game:201a8e60');
    this.controller.setAllocationPhase(wrapper, 'created'); this.controller.attachConstructedNative(wrapper, value.base, rules.sources.attach!, 'Game:201abac0');
    this.controller.initializeProperties(wrapper, field => this.controller.value(() => {
      this.guard(); value.exact(); this.field(this.factory, field);
      if (field.typeName === 'bool') this.write('descriptor bool default0', field.defaultInitializer!, () => value.storage.writeByte(field.nativeOffset, 0));
      else { this.emptyCString(value, field.nativeOffset); this.write('CString.Clear existingNULL branch', field.defaultInitializer!); }
    }), () => this.controller.value(() => { this.guard(); this.write('inherited PostInitializeProperties returns1', 'SharedBase:1004a4d0'); }), 'SharedBase:1004a4d0');
    return wrapper;
  }
  private constructSlot(): NativeReflectionWrapper {
    const wrapper = this.controller.allocateWrapper(this.slotFactory, rules.sources.slotAllocate!), value = new OriginalInventorySlot(wrapper, this);
    this.retainedSlots.set(wrapper, value); this.controller.retainObject(wrapper, value);
    this.write('InventorySlot ObjectRefBase constructor same ref/wrapper storage', 'Game:201c14f8');
    this.write('InventorySlot leaf native vtable', 'Game:201c1501', () => { value.nativeVtables.set(0, 0x2065c42c); value.storage.unknownPointer(0); });
    this.write('TemplateProxy constructor NULL owned-ID and cached pointers', 'Engine:304c7270', () => { value.template = new OriginalInventoryTemplateProxy(); value.storage.unknownPointer(0xc); });
    this.write('EntityProxy constructor embedded zero ID/NULL internal', 'Engine:304c45a0', () => { value.item = new OriginalInventoryEntityProxy(); value.storage.unknownPointer(0x18); });
    this.write('Slot enum ObjectBase/leaf vtable', 'Game:201c1523', () => { value.nativeVtables.set(0x34, 0x2065c204); value.storage.unknownPointer(0x34); });
    this.write('constructor reads actual current Slot default global', 'Game:201c1532', () => value.storage.writeUint(0x38, this.defaultSlot()));
    this.slotZeroTemporary(value, 'Game:201c1553');
    this.write('inherited Slot.Create high-bit validity', 'SharedBase:1004a4b0', () => { value.referenceWord = (value.referenceWord | 0x80000000) >>> 0; });
    this.controller.setAllocationPhase(wrapper, 'created'); this.controller.attachConstructedNative(wrapper, value, 'Game:201c1f90', 'Game:201c3d90');
    this.controller.initializeProperties(wrapper, field => this.controller.value(() => {
      this.guard(); value.exact(); this.field(this.slotFactory, field);
      if (field.name === 'Template') {
        const proxy = value.template; if (!proxy || proxy.propertyId !== null || proxy.cachedTemplate !== null) throw new Error('Fresh NULL Template default assignment profile required');
        this.write('temporary NULL TemplateProxy ctor/captured assignment', field.defaultInitializer!, () => { proxy.cachedTemplate = null; proxy.propertyId = null; });
        this.write('temporary TemplateProxy destructor NULL branch', field.defaultInitializer!);
      }
      else if (field.name === 'Item') this.write('Item descriptor default only validates member receiver; no reset', field.defaultInitializer!);
      else if (field.name === 'Slot') this.write('Slot enum virtual18 default reads current module DWORD', field.defaultInitializer!, () => value.storage.writeUint(0x38, this.defaultSlot()));
      else throw new Error('Unexamined InventorySlot default');
    }), () => this.controller.value(() => { this.guard(); this.slotZeroTemporary(value, 'Game:201c10b0'); }), 'Game:201c10b0');
    return wrapper;
  }
  private slotZeroTemporary(value: OriginalInventorySlot, source: string): void {
    if (value.nativeVtables.get(0x34) !== 0x2065c204) throw new Error('Actual captured Slot enum assignment virtual required');
    this.write('ObjectBase temporary ctor/enum vtable/value0', source);
    this.write('captured enum virtual1c source assignment', source, () => value.storage.writeUint(0x38, 0));
    this.write('temporary ObjectBase destructor', source);
  }
  private readEntityProxy(proxy: OriginalInventoryEntityProxy, input: NativeEntityByteInput): void {
    input.u16(); const present = input.bool(); this.write('EntityProxy version/present read', 'Engine:304c4410');
    if (present) {
      const id = input.propertyID().slice(0, 32) + '00000000'; this.write('PropertyID temporary raw16/read trailing DWORD/clear cache', 'SharedBase:10092a00');
      if (proxy.propertyID().slice(0, 32) !== id.slice(0, 32)) {
        this.write('embedded ID assignment copies16/clears cache BEFORE release', 'Engine:304c4410', () => { proxy.id20 = id; });
        const internal = proxy.internal;
        if (internal !== null) {
          this.effect('captured unequal-ID cached internal ReleaseReference', 'Engine:304c4410', () => internal.releaseReference());
          this.write('unequal-ID internal clear after actual release', 'Engine:304c4410', () => { proxy.internal = null; });
        }
      }
      this.write('PropertyID temporary destructor zero20', 'SharedBase:10092ac0');
    } else this.clearProxy(proxy, 'Engine:304c4410');
  }
  private readTemplateProxy(proxy: OriginalInventoryTemplateProxy, input: NativeEntityByteInput): void {
    input.u16(); const present = input.bool(); this.write('TemplateProxy version/present read', 'Engine:304c7520');
    if (!present) { this.write('TemplateProxy absent branch retains existing ID/cache', 'Engine:304c7520'); return; }
    const id = input.propertyID(); this.write('PropertyID temporary raw16/read trailing DWORD', 'SharedBase:10092a00');
    const old = proxy.propertyId;
    if (old !== null) {
      this.write('old owned PropertyID destructor zero20', 'SharedBase:10092ac0', () => { old.bytes.fill(0); old.destroyed = true; });
      this.effect('MemoryAdmin.DeleteObject old template ID', 'Engine:304c73d0', () => this.host.deleteTemplateId?.(old));
      this.write('old owned template ID pointer clear', 'Engine:304c73d0', () => { old.deleted = true; proxy.propertyId = null; });
    }
    this.write('template cached pointer/owned ID pointer reset', 'Engine:304c73d0', () => { proxy.cachedTemplate = null; proxy.propertyId = null; });
    const allocation = new OriginalInventoryPropertyID(this.controller.identity + ':template-id:' + ++this.idAllocation);
    this.write('successful new20/tag147 PropertyID ctor/owned pointer assignment', 'Engine:304c73d0', () => { proxy.propertyId = allocation; });
    this.write('PropertyID assignment copies16/clears trailingDWORD', 'SharedBase:10001f05', () => { allocation.bytes.set(Uint8Array.from(id.slice(0, 32).match(/../g)!, part => parseInt(part, 16))); });
    this.write('temporary PropertyID destructor zero20', 'SharedBase:10092ac0');
  }
  private readSlot(wrapper: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    fact(this.slotProperties(wrapper), 'Original Slot receiver');
    return this.controller.readWrapperProperties(wrapper, input, { wrapperSource: rules.sources.slotRead!, dataSource: rules.sources.slotDataRead!,
      readField: (field, stream) => this.controller.value(() => {
        this.guard(); this.field(this.slotFactory, field); stream.u16(); stream.u32();
        let destination = fact(this.slotProperties(wrapper), 'Original Slot enter receiver'); this.notify(destination, 'enter', field.name);
        destination = fact(this.slotProperties(wrapper), 'Original Slot descriptor receiver');
        if (field.name === 'Template') { if (!destination.template) throw new Error('Actual Template proxy required'); this.readTemplateProxy(destination.template, stream); }
        else if (field.name === 'Item') { if (!destination.item) throw new Error('Actual Item proxy required'); this.readEntityProxy(destination.item, stream); }
        else if (field.name === 'Slot') { stream.u16(); this.write('same physical Slot enum DWORD stream read', field.reader, () => destination.storage.writeUint(0x38, stream.u32())); }
        else throw new Error('Unexamined Slot field');
        this.notify(fact(this.slotProperties(wrapper), 'Original Slot exit receiver'), 'exit', field.name);
      }), readNative: stream => this.controller.value(() => { this.guard(); stream.u16(); this.write('inherited ObjectRefBase.Read one ushort/return1/no Slot tail', 'SharedBase:1004a560'); }) });
  }
  private readSlots(value: OriginalInventoryProperties, input: NativeEntityByteInput): void {
    this.clearSlots(value); const version = input.u16(); this.write('SlotList version read', 'Game:201ce970');
    if (version === 1) {
      const count = input.u32() | 0; this.resizeSlots(value, count, Number(count !== 0) - 1);
      this.write('SlotList read signed count before object iteration', 'Game:201ce970', () => value.storage.writeUint(0x44, count >>> 0));
      for (let index = 0; index < count; index++) {
        const accessor = this.effect('nested source accessor construction/read', 'Game:201ce970', () => this.controller.readAccessor(input));
        const native = fact(accessor.nativeObject(), 'actual accessor native pointer');
        if (native !== null) {
          if (!(native instanceof OriginalInventorySlot)) throw new Error('Unexamined actual RTTI InventorySlot cast for another concrete object');
          native.exact(); if (native.reader !== this || !native.template) throw new Error('Same reader/live template proxy required');
          if (native.template.hasPropertyIdPointer()) {
            const owner = native.wrapper; if (!owner) throw new Error('Actual wrapper-backed Slot AddReference required');
            this.effect('native Slot AddReference forwards wrapper', 'SharedBase:1004a3d0', () => owner.addReference());
            this.write('retained same Slot pointer after AddReference', 'Game:201ce970', () => { value.slots.allocation![index] = native; });
          } else this.write('invalid template pointer slot clear', 'Game:201ce970', () => { value.slots.allocation![index] = null; });
        }
        this.effect('nested accessor destructor after slot pointer write', 'Game:201ce970', () => accessor.destroy());
      }
    } else this.effect('original SlotList unknown-version warning', 'Game:201ce970', () => this.host.warning?.('slot-version', version));
    if (value.slots.count < 19) { this.effect('original missing slots warning', 'Game:201ce970', () => this.host.warning?.('missing-slots')); this.initMissingSlots(value); }
  }
  private readStacks(value: OriginalInventoryProperties, input: NativeEntityByteInput): void {
    if (value.stacks.count !== 0) throw new Error('Nonempty stack-list Delete/OnStackDelete/ref-release service required');
    const version = input.u16(); this.write('stack-list version read', 'Game:201cff00');
    if (version === 1) { const count = input.u32() | 0; this.write('stack-list signed serialized count', 'Game:201cff00'); if (count > 0) throw new Error('Actual gCInventoryStack factory/read required before first stack accessor'); }
    else this.effect('original StackList unknown-version warning', 'Game:201cff00', () => this.host.warning?.('stack-version', version));
    this.write('DeleteInvalidStacks captured count0 loop returns', 'Game:201cf410');
  }
  private read(wrapper: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    this.actual(wrapper);
    return this.controller.readWrapperProperties(wrapper, input, { wrapperSource: rules.sources.wrapperRead!, dataSource: rules.sources.dataRead!,
      readField: (field, stream) => this.controller.value(() => {
        this.guard(); this.field(this.factory, field); stream.u16(); stream.u32(); this.notify(this.actual(wrapper), 'enter', field.name);
        const destination = this.actual(wrapper);
        if (field.typeName === 'bool') this.write('same physical Inventory bool payload', field.reader, () => destination.storage.writeByte(field.nativeOffset, Number(stream.bool())));
        else {
          const text = stream.string(); if (text !== '') throw new Error('Nonempty native CString allocation/refcount path required');
          this.emptyCString(destination, field.nativeOffset);
          this.write('same physicallyNULL CString empty stream assignment branch', 'SharedBase:10014640', () => destination.storage.writeUint(field.nativeOffset, 0));
        }
        this.notify(this.actual(wrapper), 'exit', field.name);
      }), readNative: stream => this.controller.value(() => {
        this.guard(); const destination = this.actual(wrapper); this.write('native Read patch flag0 before version read', 'Game:201ad690', () => destination.storage.writeByte(0xe4, 0));
        const version = stream.u16(); this.write('Inventory native version' + version, 'Game:201ad690');
        if (version > 9) { destination.lastReadReturnByte = 0; this.write('native Read unknown high version returns0 (caller ignores it)', 'Game:201ad690'); return; }
        if (version > 2 && version < 9) throw new Error('Original Inventory legacy readerV' + version + ' required');
        if (version === 9) { this.readStacks(destination, stream); this.readSlots(destination, stream); for (const at of [0x58, 0x74, 0x90, 0xac, 0xc8]) { const proxy = destination.proxies.get(at); if (!proxy) throw new Error('Actual retained cached proxy required'); this.readEntityProxy(proxy, stream); } }
        destination.lastReadReturnByte = 1; this.write('native Read current helper return1, outer return1', 'Game:201ad690');
      }) });
  }
  postRead(value: OriginalInventoryProperties): NativeValue<void> {
    return this.run('inventory', () => {
      value.exact(); if (value.reader !== this) throw new Error('Same original Inventory receiver required');
      if (value.storage.byte(0xe4) === 0) { this.write('OnPostRead patch flag0 branch returns without services', 'Game:201ad620'); return; }
      this.write('captured owner virtual and patch flag clear BEFORE owner read', 'Game:201ad620', () => value.storage.writeByte(0xe4, 0));
      const owner = value.base.owner.read();
      if (owner !== null) { const name = this.effect('captured owner.GetName', 'Game:201ad620', () => this.host.ownerName?.(owner)); this.effect('actual patch-owner warning', 'Game:201ad620', () => this.host.warning?.('patch-owner', name)); this.write('captured owner timestamp DWORD130 zero', 'Game:201ad620', () => { owner.propertyOwner.modifiedWord = 0; }); }
      else this.effect('actual unavailable-owner MessageAdmin event', 'Game:201ad620', () => this.host.warning?.('patch-no-owner'));
    });
  }
}

export async function readOriginalHeroInventory(reader: OriginalInventoryReader): Promise<NativeValue<{
  accessor: NativeReflectionAccessor; properties: OriginalInventoryProperties; input: NativeEntityByteInput; outerVersion: 9; worldResident: false;
}>> {
  const document = await loadOriginalReflectionSerialized(), packet = originalReflectionPropertyInput(document, 'PC_Hero', 7);
  if (packet.outerVersion !== 9 || packet.source.nativeReadVersion !== 9 || packet.source.className !== 'gCInventory_PS' ||
      packet.source.serializedSha256 !== rules.sourceHero.packetSha256) return unknown('Original Hero Inventory packet differs');
  const accessor = reader.controller.readAccessor(packet.input); if (!accessor.known) return accessor;
  const wrapper = accessor.value.instance; if (!wrapper) return unknown('Original Inventory wrapperNULL');
  const properties = reader.properties(wrapper); if (!properties.known) return properties;
  return known({ accessor: accessor.value, properties: properties.value, input: packet.input, outerVersion: 9, worldResident: false });
}

/** Source identity bytes are exposed for inspection without resolving template
 * or item entities. Presence alone never activates equipped visuals/stats. */
export function originalInventorySlotIds(slot: OriginalInventorySlot): { templateId20: string | null; itemId20: string } {
  slot.exact(); if (!slot.template || !slot.item) throw new Error('Actual original slot proxies required');
  return { templateId20: slot.template.propertyId === null ? null : hex(slot.template.propertyId.bytes), itemId20: slot.item.propertyID() };
}
