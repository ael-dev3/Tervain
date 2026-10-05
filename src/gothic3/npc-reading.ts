/** Concrete detached NPC construction/reading. All facades retain one physical
 * PS; serialized candidates do not become live entities through this reader. */
import rulesText from '../../assets/gothic3/npc-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyObjectReference } from './entity-lifecycle';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionWrapper } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import { OriginalEnclaveProxy, OriginalEntityPropertySet } from './native-properties';
import type { OriginalPropertyOwner, OriginalPropertyTrace, OriginalProxyInternalReference } from './native-properties';

interface NPCField extends NativeReflectionField { default: string; enum?: { vtable: string; global: string; valueOffset: number; nativeRead: string; nativeDefault: string } }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; propertyType: number;
  getVersion: number; nativeBytes: number; nativeVtable: string; wrapperVtable: string; fields: NPCField[] };
if (rules.schema !== 'gothic3-npc-reading-rules-v1' || rules.propertyType !== 30 || rules.getVersion !== 78 ||
    rules.nativeBytes !== 508 || rules.nativeVtable !== '2069668c' || rules.wrapperVtable !== '20695ac4' || rules.fields.length !== 43 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original NPC source evidence differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const nativeReadPermission = Symbol('actual guarded NPC native virtual Read');
function fact<T>(result: NativeValue<T>, label: string): T { if (!result.known) throw new Error(label + ': ' + result.reason); return result.value; }
function uint(value: number, maximum = 0xffffffff): number {
  if (!Number.isInteger(value) || value < 0 || value > maximum) throw new Error('Original unsigned NPC field value required'); return value;
}
function idBytes(value: string): Uint8Array {
  if (!/^[0-9a-f]{40}$/i.test(value)) throw new Error('Actual 20-byte NPC PropertyID required');
  return Uint8Array.from(value.match(/../g)!, byte => parseInt(byte, 16));
}
function hex(value: Uint8Array): string { return [...value].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
export interface NativeNPCMaskedWord { readonly value: number; readonly knownMask: number }
export interface NativeNPCGuidScratch { readonly bytes: Uint8Array; readonly knownMask: Uint8Array; destroyed: boolean }
/** The actual owned CString buffer, distinct from a NULL CString. A nonNULL
 * allocation of length0 remains nonNULL in original Clear. */
export interface NativeNPCCStringAllocation { readonly identity: object; readonly text: string; readonly length: number; referenceCount: number; freed: boolean }
export interface NativeNPCTemporaryCString { readonly identity: object; compare(literal: 'Enclave'): NativeValue<boolean> }
export interface NativeNPCReadingHost {
  /** Copy the CURRENT masked mutable global DWORD, never its cold PE value. */
  enumDefault?(globalAddress: string): NativeValue<NativeNPCMaskedWord>;
  coCreateGuid?(scratch: NativeNPCGuidScratch): NativeValue<number>;
  /** Actual selected stream virtual Read(CString*) including index, assignment,
   * ownership and allocation. This callback mutates the captured live slot. */
  readCString?(slot: NativeNPCCStringSlot, input: NativeEntityByteInput): NativeValue<void>;
  freeCString?(allocation: NativeNPCCStringAllocation): NativeValue<void>;
  constructPropertyName?(name: string): NativeValue<NativeNPCTemporaryCString>;
  destroyPropertyName?(name: NativeNPCTemporaryCString): NativeValue<void>;
  /** Full animation-backed remainder, after the proven pending-pose fast path.
   * Must mutate this same storage, preserving original animation dependencies. */
  trackCurrentPose?(properties: OriginalNPCProperties, capturedOwner: NativeLiveEntity): NativeValue<void>;
}
export class NativeNPCCStringSlot {
  private current: NativeNPCCStringAllocation | null = null;
  constructor(readonly nativeOffset: number, private readonly properties: OriginalNPCProperties) {}
  get pointer(): NativeNPCCStringAllocation | null { return this.current; }
  set pointer(value: NativeNPCCStringAllocation | null) {
    this.properties.reader.guard();
    if (value !== null && (value.freed || !value.identity || !Number.isInteger(value.length) || value.length < 0 ||
      value.length !== value.text.length || !Number.isInteger(value.referenceCount) || value.referenceCount < 0 || value.referenceCount > 65535)) throw new Error('Actual original CString allocation required');
    this.current = value; this.properties.pointerBits(this.nativeOffset, value);
    this.properties.reader.note('captured CString pointer assignment+' + this.nativeOffset.toString(16), 'SharedBase:1001ee90');
  }
  get text(): string {
    const value = this.current; if (value === null) return '';
    if (value.freed) throw new Error('NPC CString pointer refers to a freed allocation'); return value.text;
  }
  clear(): void {
    this.properties.reader.guard();
    const value = this.current;
    if (value === null || value.length === 0) return;
    if (value.freed) throw new Error('Actual live CString Clear allocation required');
    value.referenceCount = (uint(value.referenceCount, 65535) - 1) & 65535;
    this.properties.reader.note('CString.Clear captured ushort ref decrement', 'SharedBase:100149b0');
    if (value.referenceCount === 0) { this.properties.reader.call('CString.Clear MemoryAdmin.Free captured allocation', 'SharedBase:100149b0', () => this.properties.reader.host.freeCString?.(value)); value.freed = true; }
    this.current = null; this.properties.pointerBits(this.nativeOffset, null);
    this.properties.reader.note('CString.Clear pointer NULL after release', 'SharedBase:100149b0');
  }
}
export interface NativeNPCTeachingArray { readonly nativeOffset: number; readonly kind: 'CString' | 'TemplateEntityProxy';
  allocation: object | null; count: number; capacity: number }
/** Reuses the proven Enclave proxy semantics, while numeric slots and actual
 * cached-reference lifetime share this embedded proxy. ReleaseReference's
 * guard adapter captures the exact underlying receiver across host callbacks. */
export class NativeNPCEntityProxy extends OriginalEnclaveProxy {
  private actualInternal: OriginalProxyInternalReference | null = null;
  private guardedInternal: OriginalProxyInternalReference | null = null;
  constructor(readonly nativeOffset: number, private readonly properties: OriginalNPCProperties) {
    super('0000000000000000000000000000000000000000', null);
    // OriginalEnclaveProxy's ID member aliases the exact embedded native ID.
    Object.defineProperty(this, 'id', { get: () => { properties.require(nativeOffset + 8, 20); return hex(properties.numericBytes.subarray(nativeOffset + 8, nativeOffset + 28)); },
      set: (id: string) => { properties.raw(nativeOffset + 8, idBytes(id)); } });
    Object.defineProperty(this, 'internal', {
      get: () => this.guardedInternal,
      set: (reference: OriginalProxyInternalReference | null) => {
        this.properties.reader.guard();
        this.actualInternal = reference;
        this.guardedInternal = reference === null ? null : { identity: reference.identity,
          releaseReference: () => this.properties.reader.controller.value(() => {
            this.properties.reader.call('captured EntityProxyInternal.ReleaseReference', 'Engine:304c43a0', () => reference.releaseReference());
          }) };
        this.properties.pointerBits(nativeOffset + 4, reference);
      },
    });
  }
  get nativeInternal(): OriginalProxyInternalReference | null { return this.actualInternal; }
  private trace(operation: OriginalPropertyTrace['operation'], value: string | null | undefined,
    emit: (operation: OriginalPropertyTrace['operation'], value?: string | null) => void): void {
    this.properties.reader.guard();
    this.properties.reader.note(operation + ' embedded+' + this.nativeOffset.toString(16), 'Engine:304c43a0');
    emit(operation, value); this.properties.reader.guard();
  }
  override setEntity(id: string, emit: (operation: OriginalPropertyTrace['operation'], value?: string | null) => void = () => {}): void {
    this.properties.reader.guard(); super.setEntity(id, (operation, value) => this.trace(operation, value, emit)); this.properties.reader.guard();
  }
  override clearEntityPointer(emit: (operation: OriginalPropertyTrace['operation'], value?: string | null) => void = () => {}): void {
    this.properties.reader.guard(); super.clearEntityPointer((operation, value) => this.trace(operation, value, emit)); this.properties.reader.guard();
  }
}

export class OriginalNPCProperties {
  readonly numericBytes = new Uint8Array(0x1fc);
  readonly knownMask = new Uint8Array(0x1fc);
  private readonly view = new DataView(this.numericBytes.buffer);
  readonly values: Record<string, unknown> = {};
  readonly base: NativeLivePropertySet<Record<string, unknown>>;
  readonly notifications: OriginalEntityPropertySet<Record<string, unknown>>;
  readonly strings = new Map<number, NativeNPCCStringSlot>();
  readonly proxies = new Map<number, NativeNPCEntityProxy>();
  readonly arrays = new Map<number, NativeNPCTeachingArray>();
  readonly guidScratch: NativeNPCGuidScratch[] = [];
  readonly enclaveProxy: NativeNPCEntityProxy;
  private owner: NativeLiveEntity | null = null;
  private propertyObject: NativePropertyObjectReference | null = null;
  private constructed = false;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalNPCReader) {
    this.enclaveProxy = new NativeNPCEntityProxy(0x1c4, this); this.proxies.set(0x1c4, this.enclaveProxy);
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', 'gCNPC_PS', 30, this.values,
      { read: () => this.owner, write: owner => { this.reader.guard(); this.owner = owner; this.pointerBits(0xc, owner); } }, null,
      { added: candidate => this.emptyCallback(candidate, 'Engine:30481830'), removed: candidate => this.emptyCallback(candidate, 'Engine:30481840'),
        postRead: candidate => this.reader.run(() => { this.exact(); if (candidate !== this.base) throw new Error('Actual NPC PostRead receiver required'); this.postReadInternal(); }) }, () => known(true));
    Object.defineProperty(this.base, 'referenceWord', { get: () => this.dword(8), set: value => this.putWord(8, value) });
    Object.defineProperty(this.base, 'wrapper', { get: () => this.propertyObject, set: value => { this.reader.guard(); this.propertyObject = value; this.pointerBits(4, value); } });
    Object.defineProperties(this.base.baseFlags, {
      value: { get: () => this.view.getUint8(0x10), set: value => { this.reader.guard(); this.view.setUint8(0x10, uint(value, 255)); } },
      knownMask: { get: () => this.knownMask[0x10], set: value => { this.reader.guard(); this.knownMask[0x10] = uint(value, 255); } },
    });
    this.notifications = new OriginalEntityPropertySet(this.base.identity, 'gCNPC_PS', this.values, null, this.enclaveProxy);
    Object.defineProperty(this.notifications, 'owner', { get: () => this.owner?.propertyOwner ?? null,
      set: (_owner: OriginalPropertyOwner | null) => { throw new Error('NPC notifications owner follows actual physical EntityPS.owner'); } });
    for (const field of rules.fields) this.bindValue(field);
  }
  require(offset: number, size: number): void {
    if (!this.knownMask.subarray(offset, offset + size).every(value => value === 255)) throw new Error('NPC field bits remain unknown+' + offset.toString(16));
  }
  putWord(offset: number, value: number): void { this.reader.guard(); this.view.setUint32(offset, uint(value), true); this.knownMask.fill(255, offset, offset + 4); }
  dword(offset: number): number { this.require(offset, 4); return this.view.getUint32(offset, true); }
  raw(offset: number, bytes: Uint8Array, mask?: Uint8Array): void {
    this.reader.guard(); if (offset < 0 || offset + bytes.length > this.numericBytes.length || (mask && mask.length !== bytes.length)) throw new Error('Actual NPC physical write bounds required');
    this.numericBytes.set(bytes, offset); if (mask) this.knownMask.set(mask, offset); else this.knownMask.fill(255, offset, offset + bytes.length);
  }
  pointerBits(offset: number, pointer: object | null): void { this.reader.guard(); if (pointer === null) this.putWord(offset, 0); else this.knownMask.fill(0, offset, offset + 4); }
  private putByte(offset: number, value: number): void { this.reader.guard(); this.view.setUint8(offset, uint(value, 255)); this.knownMask[offset] = 255; }
  private bindValue(field: NPCField): void {
    const offset = field.nativeOffset;
    Object.defineProperty(this.values, field.name, { enumerable: true,
      get: () => {
        if (field.enum) return this.dword(offset + 4);
        if (field.typeName === 'bCString') { const slot = this.strings.get(offset); if (!slot) throw new Error('NPC CString not constructed'); return slot.text; }
        if (field.typeName === 'bCPropertyID') { this.require(offset, 20); return hex(this.numericBytes.subarray(offset, offset + 20)); }
        if (field.typeName === 'eCEntityProxy') { const proxy = this.proxies.get(offset); if (!proxy) throw new Error('NPC proxy not constructed'); return proxy; }
        if (field.typeName.startsWith('bTObjArray<')) { const array = this.arrays.get(offset); if (!array) throw new Error('NPC teaching array not constructed'); return array; }
        if (field.typeName === 'bool') { this.require(offset, 1); return this.view.getUint8(offset) !== 0; }
        if (field.typeName === 'float') { this.require(offset, 4); return this.view.getFloat32(offset, true); }
        if (field.typeName === 'int') { this.require(offset, 4); return this.view.getInt32(offset, true); }
        return this.dword(offset);
      },
      set: (value: unknown) => {
        this.reader.guard(); this.exact();
        if (field.enum || field.typeName === 'unsigned_long') this.putWord(offset + (field.enum ? 4 : 0), uint(value as number));
        else if (field.typeName === 'int') { if (!Number.isInteger(value) || (value as number) < -2147483648 || (value as number) > 2147483647) throw new Error('Actual NPC int32 required'); this.putWord(offset, (value as number) >>> 0); }
        else if (field.typeName === 'bool') { if (typeof value !== 'boolean') throw new Error('Actual NPC bool required'); this.putByte(offset, Number(value)); }
        else if (field.typeName === 'float') { if (typeof value !== 'number' || !Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new Error('Finite original float32 setter profile required'); this.view.setFloat32(offset, value, true); this.knownMask.fill(255, offset, offset + 4); }
        else if (field.typeName === 'bCPropertyID') { const bytes = idBytes(value as string); this.raw(offset, bytes.subarray(0, 16)); this.putWord(offset + 16, 0); }
        else throw new Error('NPC owned CString/proxy/array setters require their actual object service');
      },
    });
  }
  exact(attached = true): void {
    if (this.base.values !== this.values || this.notifications.values !== this.values || this.wrapper.deleted ||
      (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper))) throw new Error('Actual retained NPC physical PS required');
  }
  private emptyCallback(candidate: NativeLivePropertySet<object>, source: string): NativeValue<void> {
    return this.reader.run(() => { this.exact(); if (candidate !== this.base) throw new Error('Actual NPC lifecycle receiver required'); this.reader.note('actual inherited empty NPC lifecycle callback', source); });
  }
  private copyEnum(field: NPCField): void {
    const info = field.enum!;
    const bits = this.reader.host.enumDefault
      ? this.reader.call('copy CURRENT mutable enum default ' + info.global, info.nativeDefault, () => this.reader.host.enumDefault!(info.global))
      : { value: 0, knownMask: 0 };
    const value = uint(bits.value), mask = uint(bits.knownMask), raw = new Uint8Array(4), knownBits = new Uint8Array(4);
    new DataView(raw.buffer).setUint32(0, value, true); new DataView(knownBits.buffer).setUint32(0, mask, true);
    this.raw(info.valueOffset, raw, knownBits); this.reader.note('masked live enum copy ' + field.name, info.nativeDefault);
  }
  private constructString(offset: number): void {
    this.strings.set(offset, new NativeNPCCStringSlot(offset, this)); this.putWord(offset, 0); this.reader.note('CString constructor pointer NULL+' + offset.toString(16), 'SharedBase:10012d20');
  }
  private constructProxy(offset: number): void {
    const proxy = offset === 0x1c4 ? this.enclaveProxy : new NativeNPCEntityProxy(offset, this); this.proxies.set(offset, proxy);
    // Engine constructor vtable, internalNULL then actual PropertyID constructor.
    this.putWord(offset, 0x3087bff4); this.raw(offset + 8, new Uint8Array(20)); this.putWord(offset + 4, 0); this.raw(offset + 8, new Uint8Array(20));
    this.reader.note('actual embedded EntityProxy ctor+' + offset.toString(16), 'Engine:3001d7b9');
  }
  construct(): void {
    this.reader.guard();
    this.exact(false); if (this.constructed) throw new Error('Fresh NPC constructor receiver required'); this.constructed = true;
    this.putWord(0, 0x2069668c); this.putWord(4, 0); this.putWord(8, 1); this.putWord(0xc, 0); this.view.setUint8(0x10, 1); this.knownMask[0x10] = 15;
    this.reader.note('inherited RefBase/EntityPS constructor and actual NPC vtable', 'Game:202f9e80');
    // Retain the actual allocation once the base reference word exists, before
    // any mutable-global host capture can stop derived construction.
    this.reader.controller.retainNative(this.wrapper, this.base);
    for (const offset of [0x14, 0x18, 0x1c]) this.constructString(offset);
    for (const field of rules.fields.filter(field => field.enum && field.nativeOffset <= 0x48)) { this.putWord(field.nativeOffset, parseInt(field.enum!.vtable, 16)); this.copyEnum(field); }
    this.raw(0x50, new Uint8Array(20)); this.reader.note('Enclave PropertyID constructor zero20', 'Game:202f9e80');
    for (const field of rules.fields.filter(field => field.enum && field.nativeOffset >= 0x64 && field.nativeOffset <= 0x84)) { this.putWord(field.nativeOffset, parseInt(field.enum!.vtable, 16)); this.copyEnum(field); }
    for (const offset of [0x9c, 0xb8, 0xd4, 0xf0, 0x110]) this.constructProxy(offset);
    for (const field of rules.fields.filter(field => field.enum && field.nativeOffset >= 0x12c)) { this.putWord(field.nativeOffset, parseInt(field.enum!.vtable, 16)); this.copyEnum(field); }
    for (const [offset, kind] of [[0x140, 'CString'], [0x14c, 'TemplateEntityProxy']] as const) {
      let allocation: object | null = null;
      const array: NativeNPCTeachingArray = { nativeOffset: offset, kind, allocation: null, count: 0, capacity: 0 };
      Object.defineProperties(array, {
        allocation: { get: () => allocation, set: (value: object | null) => { this.reader.guard(); allocation = value; this.pointerBits(offset, value); } },
        count: { get: () => this.dword(offset + 4), set: (value: number) => this.putWord(offset + 4, value) },
        capacity: { get: () => this.dword(offset + 8), set: (value: number) => this.putWord(offset + 8, value) },
      });
      this.arrays.set(offset, array); this.raw(offset, new Uint8Array(12)); this.reader.note('real empty teaching ObjArray header+' + offset.toString(16), 'Game:202f9e80');
    }
    this.constructProxy(0x15c); this.constructString(0x178); this.constructString(0x1a0);
    for (const offset of [0x1a8, 0x1c4, 0x1e0]) this.constructProxy(offset);
    this.resetFields('Game:202f9e80');
  }
  private resetFields(source: string): void {
    for (const offset of [0x1a4, 0x158, 0x17c, 0x18c, 0x190, 0x180, 0x184, 0x188]) { this.putWord(offset, 0); this.reader.note('NPC derived reset DWORD+' + offset.toString(16), source); }
  }
  invalidate(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.resetFields('Game:202f8df0'); }); }
  gameReset(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.putWord(0x1a4, 0); this.reader.note('GameReset pending pose0', 'Game:202f8e30'); }); }
  assignDefault(field: NativeReflectionField): NativeValue<void> { return this.reader.run(() => fact(this.assignDefaultInternal(field, nativeReadPermission), 'NPC descriptor default')); }
  assignDefaultInternal(field: NativeReflectionField, permission: symbol): NativeValue<void> {
    return this.reader.controller.value(() => {
      if (permission !== nativeReadPermission) throw new Error('Actual guarded NPC descriptor default required');
      this.reader.guard(); this.exact(); const descriptor = this.descriptor(field), offset = descriptor.nativeOffset;
      if (descriptor.enum) this.copyEnum(descriptor);
      else if (descriptor.typeName === 'bCString') this.strings.get(offset)!.clear();
      else if (descriptor.typeName === 'bCPropertyID') {
        const scratch: NativeNPCGuidScratch = { bytes: new Uint8Array(20), knownMask: new Uint8Array(20), destroyed: false }; scratch.knownMask[16] = 255; this.guidScratch.push(scratch);
        this.reader.note('temporary Guid constructor validity byte0 only', 'SharedBase:100063c5');
        this.reader.call('CoCreateGuid captured scratch, HRESULT ignored', 'SharedBase:10012570', () => this.reader.host.coCreateGuid?.(scratch));
        scratch.bytes[16] = 1; scratch.knownMask[16] = 255; this.reader.note('Guid.Generate validity byte1', 'SharedBase:10012570');
        this.raw(offset, scratch.bytes.subarray(0, 16), scratch.knownMask.subarray(0, 16)); this.putWord(offset + 16, 0);
        this.reader.note('captured PropertyID CreateRandom copy16/cache0', 'SharedBase:10092760'); scratch.destroyed = true; this.reader.note('actual temporary Guid destructor RET', 'SharedBase:10092760');
      } else if (descriptor.typeName === 'bool') this.putByte(offset, 0);
      else if (descriptor.typeName === 'float' || descriptor.typeName === 'unsigned_long') this.putWord(offset, 0);
      else if (descriptor.typeName === 'int') this.putWord(offset, 0xffffffff);
      else if (descriptor.typeName !== 'eCEntityProxy' && !descriptor.typeName.startsWith('bTObjArray<')) throw new Error('Unresolved actual NPC default');
      this.reader.note('descriptor default ' + field.name, descriptor.default); this.reader.guard();
    });
  }
  private descriptor(field: NativeReflectionField): NPCField {
    const actual = rules.fields.find(candidate => candidate.name === field.name);
    if (!actual || actual.typeName !== field.typeName || actual.nativeOffset !== field.nativeOffset || actual.reader !== field.reader) throw new Error('Exact original NPC descriptor required'); return actual;
  }
  private propagatedNotify(phase: 'enter' | 'exit', field: string, propagated = true): void {
    const result = this.notifications.notify(phase, field, propagated);
    for (const item of result.trace) this.reader.note(item.operation + ' ' + field, phase === 'enter' ? 'Engine:3003b5bb' : 'Game:202f8d90');
    if (!result.supported) throw new Error(result.reason); this.reader.guard();
  }
  readField(field: NativeReflectionField, input: NativeEntityByteInput): NativeValue<void> { return this.reader.run(() => fact(this.readFieldInternal(field, input, nativeReadPermission), 'NPC descriptor reader')); }
  readFieldInternal(field: NativeReflectionField, input: NativeEntityByteInput, permission: symbol): NativeValue<void> {
    return this.reader.controller.value(() => {
      if (permission !== nativeReadPermission) throw new Error('Actual guarded NPC descriptor reader required');
      this.reader.guard(); this.exact(); const descriptor = this.descriptor(field), offset = descriptor.nativeOffset;
      const version = input.u16(); input.u32(); this.reader.note('descriptor version/size consumed; no forced seek ' + field.name, descriptor.reader);
      this.propagatedNotify('enter', field.name); this.exact();
      if (descriptor.enum) { input.u16(); this.raw(offset + 4, input.take(4)); }
      else if (descriptor.typeName === 'bCString') this.reader.call('actual indexed stream Read captured CString ' + field.name, 'SharedBase:1001ee90', () => this.reader.host.readCString?.(this.strings.get(offset)!, input));
      else if (descriptor.typeName === 'bCPropertyID') { const raw = input.take(20); this.raw(offset, raw.subarray(0, 16)); this.putWord(offset + 16, 0); }
      else if (descriptor.typeName === 'eCEntityProxy') {
        const proxy = this.proxies.get(offset)!; input.u16(); const present = input.bool();
        if (present) {
          this.reader.note('proxy Read temporary PropertyID constructor zero20', 'Engine:304c4410');
          const id = input.propertyID().slice(0, 32) + '00000000'; proxy.setEntity(id);
          this.reader.note('proxy Read temporary PropertyID destructor RET', 'Engine:304c4410');
        } else proxy.clearEntityPointer();
      } else if (descriptor.typeName.startsWith('bTObjArray<')) {
        if (version >= 30) {
          const array = this.arrays.get(offset)!; input.u8(); const count = input.u32();
          if (count !== 0 || array.count !== 0 || array.capacity !== 0 || array.allocation !== null) throw new Error('Actual nonempty/reused NPC teaching array allocation/destruction unresolved');
          array.count = 0; this.reader.note('real teaching array count0 read', descriptor.typeName.includes('bCString') ? 'Game:2028f890' : 'Game:2030bd70');
        }
      } else if (descriptor.typeName === 'bool') this.putByte(offset, Number(input.bool()));
      else if (['float', 'unsigned_long', 'int'].includes(descriptor.typeName)) this.raw(offset, input.take(4));
      else throw new Error('Actual NPC descriptor payload unresolved');
      this.reader.note('actual reflected payload ' + field.name, descriptor.reader); this.reader.guard(); this.exact(); this.propagatedNotify('exit', field.name);
    });
  }
  readNative(input: NativeEntityByteInput): NativeValue<void> { return this.reader.run(() => fact(this.readNativeInternal(input, nativeReadPermission), 'NPC derived Read')); }
  readNativeInternal(input: NativeEntityByteInput, permission: symbol): NativeValue<void> {
    return this.reader.controller.value(() => { if (permission !== nativeReadPermission) throw new Error('Actual guarded NPC derived Read required'); this.reader.guard(); this.exact();
      input.u16(); this.reader.note('NPC native Read version consumed, no version branch', 'Game:202f9940'); this.putWord(0x158, 0); this.reader.note('NPC native Read ManaUsed0', 'Game:202f9940'); });
  }
  private postReadInternal(): void {
    this.putWord(0x1a4, 0); this.reader.note('NPC PostRead pending pose0 BEFORE Enclave proxy update', 'Game:202f9ca0');
    const id = this.values.Enclave as string; this.enclaveProxy.setEntity(id); this.reader.note('NPC PostRead inherited RET', 'Engine:304818a0');
  }
  notify(phase: 'enter' | 'exit', property: string, propagated: boolean): NativeValue<void> {
    return this.reader.run(() => {
      this.exact(); if ((phase !== 'enter' && phase !== 'exit') || typeof propagated !== 'boolean' || typeof property !== 'string' || property.includes('\0')) throw new Error('Actual original NPC property notification arguments required');
      if (phase === 'enter' || propagated) { this.propagatedNotify(phase, property, propagated); return; }
      // Outer NotifyExit reads owner before calling this concrete virtual exit.
      const owner = this.owner; if (owner !== null) { owner.propertyOwner.modified(); this.reader.note('NotifyExit outer live owner Modified read', 'Engine:3001a091'); }
      const temporary = this.reader.call('local NPC OnNotifyExit temporary CString constructor', 'Game:202f8d90', () => this.reader.host.constructPropertyName?.(property));
      const equals = this.reader.call('local NPC temporary CString compare Enclave', 'Game:202f8d90', () => temporary.compare('Enclave'));
      this.reader.call('local NPC temporary CString destructor BEFORE proxy', 'Game:202f8d90', () => this.reader.host.destroyPropertyName?.(temporary));
      if (equals) this.enclaveProxy.setEntity(this.values.Enclave as string);
      // Same Engine inherited body; propagated is not read by that body.
      const inherited = this.notifications.onNotify('exit', property, true);
      for (const row of inherited.trace) this.reader.note(row.operation + ' inherited exit', 'Engine:30037ca4');
      if (!inherited.supported) throw new Error(inherited.reason);
    });
  }
  process(): NativeValue<void> {
    return this.reader.run(() => {
      this.exact(); this.reader.note('NPC OnProcess inherited actual RET', 'Engine:304818e0');
      const pending = this.dword(0x1a4);
      if (pending !== 0) {
        this.putWord(0x1a4, 0); this.reader.note('TrackCurrentPose captured pending clear', 'Game:202f90c0');
        this.putWord(0x194, pending); this.reader.note('TrackCurrentPose first pose write', 'Game:202f90c0');
        this.putWord(0x198, pending); this.reader.note('TrackCurrentPose second pose write', 'Game:202f90c0'); return;
      }
      const owner = this.owner; if (owner === null) throw new Error('TrackCurrentPose requires actual nonNULL owner before GetPropertySet100');
      this.reader.call('actual animation-backed TrackCurrentPose remainder', 'Game:202f90c0', () => this.reader.host.trackCurrentPose?.(this, owner));
    });
  }
}
export class OriginalNPCReader {
  readonly factory: NativeReflectionFactory;
  private readonly retained = new WeakMap<NativeReflectionWrapper, OriginalNPCProperties>();
  private active = false;
  private nestedAttempt = false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeNPCReadingHost = {}) {
    this.factory = { nativeCategory: 'entity-property-set', root: Object.freeze({ className: 'gCNPC_PS', baseClassName: 'eCEntityPropertySet', fields: Object.freeze(rules.fields.map(field => Object.freeze({ ...field }))) }),
      cloneRoot: current => current === controller ? this.run(() => this.construct()) : missing('Actual NPC reflection controller required'),
      getVersion: wrapper => controller.value(() => { this.actual(wrapper).exact(); return 78; }),
      read: (wrapper, input) => this.run(() => {
        const value = this.actual(wrapper); value.exact();
        return controller.readWrapperProperties(wrapper, input, { wrapperSource: 'Game:202feec0', dataSource: 'Game:20312d30',
          readField: (field, stream) => value.readFieldInternal(field, stream, nativeReadPermission), readNative: stream => value.readNativeInternal(stream, nativeReadPermission) });
      }),
    }; fact(controller.registerFactory(this.factory), 'Actual NPC factory registration');
  }
  guard(): void {
    if (this.nestedAttempt) throw new Error('Host attempted reentrant NPC mutation');
    const required = this.controller.receipt().required; if (required !== null) throw new Error(required);
  }
  run<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.nestedAttempt = true; return this.controller.value(() => { throw new Error('Reentrant NPC reading mutation unsupported'); }); }
    this.active = true; this.nestedAttempt = false;
    try { return this.controller.value(() => { this.guard(); const result = body(); this.guard(); return result; }); } finally { this.active = false; }
  }
  note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  call<T>(operation: string, source: string, callback: () => NativeValue<T> | undefined): T { this.guard(); const result = this.controller.effect(operation, source, callback); this.guard(); return result; }
  private actual(wrapper: NativeReflectionWrapper): OriginalNPCProperties { const value = this.retained.get(wrapper); if (!value) throw new Error('Actual retained NPC allocation required'); return value; }
  properties(wrapper: NativeReflectionWrapper, attached = true): NativeValue<OriginalNPCProperties> {
    const value = this.retained.get(wrapper); if (!value) return missing('Actual retained NPC allocation required');
    try { value.exact(attached); return known(value); } catch (error) { return missing(String(error)); }
  }
  private construct(): NativeReflectionWrapper {
    const wrapper = this.controller.allocateWrapper(this.factory, 'Game:203125f0'), value = new OriginalNPCProperties(wrapper, this);
    this.retained.set(wrapper, value); value.construct();
    if (!value.base.isValid()) value.base.createBase(); this.note('NPC.Create IsValid AL==1 gate; inherited Create/literal1', 'Game:202f8e80');
    this.controller.setAllocationPhase(wrapper, 'created'); this.controller.attachConstructedNative(wrapper, value.base, 'Game:202fb970', 'Game:2030eb30');
    this.controller.initializeProperties(wrapper, field => value.assignDefaultInternal(field, nativeReadPermission), () => { value.exact(); this.note('NPC PostInitialize inherited literal1', 'SharedBase:100076f8'); return known(undefined); }, 'Game:2030f1e0');
    return wrapper;
  }
}
