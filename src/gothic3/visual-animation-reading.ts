/** Original VisualAnimation/Cloth factories over retained physical stores.
 * Reading an actor filename never promotes an inspector rig to a native actor.
 * Missing ownership/archive/array services stop at their original call sites. */
import rulesText from '../../assets/gothic3/visual-animation-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyObjectReference } from './entity-lifecycle';
import { loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionWrapper,
  NativeReflectionNativeObject, NativeReflectionAccessor } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';

type VisualClass = 'eCVisualAnimation_PS' | 'eCSpringAndDamperEffector' | 'eCEffector';
interface ClassRules { constructor: string; rootRegistrar: string; nativeVtable: string; wrapperVtable: string; fields: NativeReflectionField[] }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; classes: Record<VisualClass, ClassRules>;
  hero: { serializedSha256: string }; cloth: { fields: { name: string; typeName: string; fieldVersion: number; raw: string }[] } };
if (rules.schema !== 'gothic3-visual-animation-reading-rules-v1' || rules.classes.eCVisualAnimation_PS.nativeVtable !== '30820394' ||
    rules.classes.eCSpringAndDamperEffector.nativeVtable !== '30818ae4' || rules.classes.eCVisualAnimation_PS.fields.length !== 31 ||
    rules.classes.eCSpringAndDamperEffector.fields.length !== 9 || rules.classes.eCEffector.fields.length !== 4 ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original VisualAnimation source profile differs');
const permission = Symbol('source-internal VisualAnimation construction/read');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(v: NativeValue<T>, operation: string): T { if (!v.known) throw new Error(operation + ': ' + v.reason); return v.value; }
function word(v: number): number { if (!Number.isInteger(v) || v < 0 || v > 0xffffffff) throw new Error('Original uint32 storage required'); return v; }
function rawWord(v: number): Uint8Array { const a = new Uint8Array(4); new DataView(a.buffer).setUint32(0, word(v), true); return a; }
function rawFloat(v: number): Uint8Array { if (!Number.isFinite(v) || !Object.is(v, Math.fround(v))) throw new Error('Finite stored float32 required'); const a = new Uint8Array(4); new DataView(a.buffer).setFloat32(0, v, true); return a; }
function signed(v: number): number { if (!Number.isInteger(v) || v < -0x80000000 || v > 0x7fffffff) throw new Error('Signed32 storage required'); return v; }
function byte(v: number): number { if (!Number.isInteger(v) || v < 0 || v > 255) throw new Error('Byte storage required'); return v; }
function pointerAlias(s: NativeVisualBytes, at: number, value: object | null): void {
  if (value === null) { if (s.uint(at) !== 0) throw new Error('NULL pointer capability differs from physical slot'); }
  else if (s.knownMask.subarray(at, at + 4).length !== 4 || s.knownMask.subarray(at, at + 4).some(v => v !== 0)) throw new Error('Retained pointer capability differs from physical mask');
}

/** One actual allocation; unknown native address/padding bits have mask0. */
export class NativeVisualBytes {
  private readonly ownBytes: Uint8Array; private readonly ownMask: Uint8Array;
  constructor(length: number, private readonly guard: () => void, private readonly backing?: () => NativeVisualArrayMemory, private readonly backingOffset = 0) { this.ownBytes = new Uint8Array(length); this.ownMask = new Uint8Array(length); }
  private memory(): NativeVisualArrayMemory | undefined { const a = this.backing?.(); if (a && (a.freed || a.bytes.length !== a.knownMask.length || this.backingOffset + this.ownBytes.length > a.bytes.length)) throw new Error('Freed/truncated native array storage'); return a; }
  get bytes(): Uint8Array { const a = this.memory(); return a ? a.bytes.subarray(this.backingOffset, this.backingOffset + this.ownBytes.length) : this.ownBytes; }
  get knownMask(): Uint8Array { const a = this.memory(); return a ? a.knownMask.subarray(this.backingOffset, this.backingOffset + this.ownMask.length) : this.ownMask; }
  private get view(): DataView { const a = this.bytes; return new DataView(a.buffer, a.byteOffset, a.byteLength); }
  private range(at: number, length: number): void { if (!Number.isInteger(at) || !Number.isInteger(length) || at < 0 || length < 0 || at + length > this.bytes.length) throw new Error('Visual physical storage bounds differ'); }
  raw(at: number, length: number): Uint8Array { this.range(at, length); if (this.knownMask.subarray(at, at + length).some(v => v !== 255)) throw new Error('Uninitialized Visual bytes+' + at.toString(16)); return this.bytes.slice(at, at + length); }
  uint(at: number): number { this.raw(at, 4); return this.view.getUint32(at, true); }
  byte(at: number): number { return this.raw(at, 1)[0]!; }
  float(at: number): number { this.raw(at, 4); return this.view.getFloat32(at, true); }
  write(at: number, raw: Uint8Array, masks?: Uint8Array): void { this.guard(); this.range(at, raw.length); if (masks && masks.length !== raw.length) throw new Error('Visual physical mask length differs'); this.bytes.set(raw, at); if (masks) this.knownMask.set(masks, at); else this.knownMask.fill(255, at, at + raw.length); this.guard(); }
  put(at: number, v: number): void { this.write(at, rawWord(v)); }
  pointer(at: number, value: object | null): void { if (value === null) this.put(at, 0); else this.write(at, new Uint8Array(4), new Uint8Array(4)); }
  validate(): void { this.guard(); }
}
export interface NativeVisualCStringAllocation { readonly identity: object; readonly text: string; readonly length: number; referenceCount: number; freed: boolean }
/** NULL and an allocated empty CString remain distinct physical states. */
export class NativeVisualCStringSlot {
  private current: NativeVisualCStringAllocation | null | undefined;
  constructor(readonly nativeOffset: number, readonly storage: NativeVisualBytes, readonly reader: OriginalVisualAnimationReader) {}
  get pointer(): NativeVisualCStringAllocation | null { this.reader.guard(); this.storage.validate(); if (this.current === undefined) throw new Error('Visual CString is not constructed'); pointerAlias(this.storage, this.nativeOffset, this.current); return this.current; }
  set pointer(value: NativeVisualCStringAllocation | null) {
    this.reader.guard(); this.storage.validate(); if (value && (!value.identity || typeof value.text !== 'string' || value.length !== value.text.length ||
      !Number.isInteger(value.referenceCount) || value.referenceCount < 0 || value.referenceCount > 65535 || value.freed)) throw new Error('Actual live owned CString data required');
    this.current = value; this.storage.pointer(this.nativeOffset, value); this.reader.guard();
  }
  get text(): string { const p = this.pointer; if (p?.freed) throw new Error('Visual CString points to freed data'); return p?.text ?? ''; }
  isEmpty(): boolean { return this.pointer === null || this.pointer.length === 0; }
}
export interface NativeVisualProxyReference { readonly identity: object; releaseReference(): NativeValue<void> }
/** Embedded proxy28B, used by the cloth and the actual Visual look target. */
export class NativeVisualEntityProxy {
  private current: NativeVisualProxyReference | null | undefined;
  constructor(readonly offset: number, readonly storage: NativeVisualBytes, readonly reader: OriginalVisualAnimationReader) {}
  get internal(): NativeVisualProxyReference | null { this.reader.guard(); this.storage.validate(); if (this.current === undefined) throw new Error('Visual proxy is not constructed'); pointerAlias(this.storage, this.offset + 4, this.current); return this.current; }
  set internal(value: NativeVisualProxyReference | null) { this.reader.guard(); this.storage.validate(); if (value && (!value.identity || typeof value.releaseReference !== 'function')) throw new Error('Actual proxy reference capability required'); this.current = value; this.storage.pointer(this.offset + 4, value); this.reader.guard(); }
  get propertyId20(): string { this.storage.validate(); if (this.storage.uint(this.offset) !== 0x3087bff4) throw new Error('Actual proxy leaf dispatch required'); return [...this.storage.raw(this.offset + 8, 20)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  set propertyId20(value: string) { this.reader.guard(); if (!/^[0-9a-f]{40}$/.test(value)) throw new Error('Actual20B proxy ID required'); this.storage.write(this.offset + 8, Uint8Array.from(value.match(/../g)!.map(v => parseInt(v, 16)))); }
  construct(secret: symbol): void { if (secret !== permission || this.current !== undefined) throw new Error('Fresh source proxy construction required'); this.storage.put(this.offset, 0x3087bff4); this.storage.write(this.offset + 8, new Uint8Array(20)); this.internal = null; this.storage.write(this.offset + 8, new Uint8Array(20)); this.reader.note('PropertyID ctor/internalNULL/Destroy', 'Engine:304c45a0'); }
}
/** Actual storage returned by the required original allocator adapter. No
 * numerical heap pointer is inferred from an object/TypedArray identity. */
export interface NativeVisualArrayMemory { readonly identity: object; readonly bytes: Uint8Array; readonly knownMask: Uint8Array; freed: boolean }
/** Actual retained resource virtual+24 capability; a motion catalogue record
 * alone does not establish this live engine object or its ownership. */
export interface NativeVisualMotionResource { readonly identity: object; releaseReference(): NativeValue<void> }
export interface NativeVisualReadingHost {
  currentEnum?(name: 'BoneShapeGroup' | 'BoneShapeMaterial' | 'SkeletonShapeGroup', sourceGlobal: string): NativeValue<NativeMaskedWord>;
  /** Execute indexed bCIStream CString Read/SetText against the actual data
   * buffer/refcount. Consume exactly one ushort; NULL and allocated-empty
   * source buffers cannot be collapsed into equal JavaScript text. */
  readCString?(destination: NativeVisualCStringSlot, input: NativeEntityByteInput): NativeValue<void>;
  freeCString?(captured: NativeVisualCStringAllocation): NativeValue<void>;
  freeArray?(captured: NativeVisualArrayMemory, source: string): NativeValue<void>;
  reallocArray?(capturedOld: NativeVisualArrayMemory | null, bytes: number, source: string): NativeValue<NativeVisualArrayMemory | null>;
  allocateLoD?(bytes: 44, tag: 0x19c | 0x3eb | 0x3fe | 0x406, factory: OriginalVisualAnimationFactory): NativeValue<NativeVisualArrayMemory | null>;
  deleteLoD?(captured: OriginalVisualAnimationLoD): NativeValue<void>;
  setActorNull?(captured: OriginalVisualAnimationLoD): NativeValue<void>;
  /** Original300bf0d0 archive/proprietary-or-native lookup and owned filename
   * assignment, NOT loading a mesh into an inspector or inventing an actor. */
  setActorFileName?(captured: OriginalVisualAnimationLoD, source: NativeVisualCStringSlot): NativeValue<boolean>;
  /** Subsequent world/cache/actor services, required only when source reaches
   * the actual nonNULL actor/attachment/state branches. */
  destroyActorInstance?(factory: OriginalVisualAnimationFactory): NativeValue<void>;
  createActorInstance?(factory: OriginalVisualAnimationFactory): NativeValue<void>;
  clearAttachments?(properties: OriginalVisualAnimationProperties): NativeValue<void>;
  /** Full original temporary-CString/CompareFast/local cache/filename prefix.
   * Required only for propagated=false; propagated reads skip this branch. */
  localNotifyExitPrefix?(properties: OriginalVisualAnimationProperties, property: string): NativeValue<void>;
  /** Nonzero serialized attachments reach new(120,tag0x76a), concrete ctor,
   * Read, then array resize/append. This boundary must perform those operations
   * on the same PS, rather than silently accepting an attachment count. */
  readAttachments?(properties: OriginalVisualAnimationProperties, input: NativeEntityByteInput, count: number, version: 64): NativeValue<void>;
  processVisual?(properties: OriginalVisualAnimationProperties, originalEntry: string): NativeValue<void>;
}
export class OriginalVisualAnimationLoD {
  readonly storage: NativeVisualBytes; readonly fileName: NativeVisualCStringSlot; private dead = false;
  private actorResource: object | null = null;
  get destroyed(): boolean { return this.dead; }
  markDeleted(secret: symbol): void { if (secret !== permission) throw new Error('Actual deleting service completion required'); this.dead = true; }
  get resource(): object | null { this.exact(); pointerAlias(this.storage, 8, this.actorResource); return this.actorResource; }
  set resource(value: object | null) { this.exact(); this.actorResource = value; this.storage.pointer(8, value); }
  constructor(readonly factory: OriginalVisualAnimationFactory, readonly allocationTag: number, readonly allocation: NativeVisualArrayMemory) {
    if (!allocation.identity || allocation.freed || allocation.bytes.length !== 44 || allocation.knownMask.length !== 44) throw new Error('Actual successful LoD44B allocation required');
    const reader = factory.properties.reader; this.storage = new NativeVisualBytes(44, () => { reader.guard(); factory.properties.exact(false); if (this.destroyed) throw new Error('Destroyed actual LoD'); }, () => allocation);
    this.fileName = new NativeVisualCStringSlot(4, this.storage, reader);
    this.storage.put(0, 0x100e7e1c); reader.note('LoD bCObjectBase constructor', 'Engine:300bee20');
    this.storage.put(0, 0x30820214);
    this.fileName.pointer = null;
    for (const at of [0x14, 0x18, 0x1c, 0xc, 8]) this.storage.put(at, 0);
    this.storage.write(0x10, new Uint8Array([0]));
    this.storage.pointer(0x20, factory); reader.note('LoD ctor NULL resource/arrays and SAME factory owner', 'Engine:300bee20');
  }
  exact(): void { this.factory.properties.reader.guard(); this.factory.properties.exact(false); if (this.dead || this.storage.uint(0) !== 0x30820214) throw new Error('Actual live LoD/vtable required'); pointerAlias(this.storage, 0x20, this.factory); }
  set materialSwitch(value: number) { this.exact(); this.storage.put(0x24, signed(value) >>> 0); }
  get materialSwitch(): number { this.exact(); return this.storage.uint(0x24) | 0; }
}
/** Factory +94 is an embedded physical region of the SAME PS allocation. */
export class OriginalVisualAnimationFactory {
  private mainValue: OriginalVisualAnimationLoD | null = null; private facialValue: OriginalVisualAnimationLoD | null = null;
  private actorValue: object | null = null;
  get main(): OriginalVisualAnimationLoD | null { this.properties.reader.guard(); this.properties.exact(false); pointerAlias(this.properties.storage, 0x9c, this.mainValue); if (this.mainValue) this.mainValue.exact(); return this.mainValue; }
  set main(value: OriginalVisualAnimationLoD | null) { this.properties.reader.guard(); this.properties.exact(false); if (value) { if (value.factory !== this) throw new Error('Same-factory LoD required'); value.exact(); } this.mainValue = value; this.properties.storage.pointer(0x9c, value); }
  get facial(): OriginalVisualAnimationLoD | null { this.properties.reader.guard(); this.properties.exact(false); pointerAlias(this.properties.storage, 0xa0, this.facialValue); if (this.facialValue) this.facialValue.exact(); return this.facialValue; }
  set facial(value: OriginalVisualAnimationLoD | null) { this.properties.reader.guard(); this.properties.exact(false); if (value) { if (value.factory !== this) throw new Error('Same-factory LoD required'); value.exact(); } this.facialValue = value; this.properties.storage.pointer(0xa0, value); }
  get actorInstance(): object | null { this.properties.reader.guard(); this.properties.exact(false); pointerAlias(this.properties.storage, 0x98, this.actorValue); return this.actorValue; }
  set actorInstance(value: object | null) { this.properties.reader.guard(); this.properties.exact(false); this.actorValue = value; this.properties.storage.pointer(0x98, value); }
  readonly parts: OriginalVisualPartRecord[] = [];
  private partMemoryValue: NativeVisualArrayMemory | null = null;
  get partMemory(): NativeVisualArrayMemory | null { this.properties.reader.guard(); this.properties.exact(false); pointerAlias(this.properties.storage, 0xa4, this.partMemoryValue); return this.partMemoryValue; }
  set partMemory(value: NativeVisualArrayMemory | null) { this.properties.reader.guard(); this.properties.exact(false); if (value && (!value.identity || value.freed || value.bytes.length !== value.knownMask.length)) throw new Error('Actual live part allocation required'); this.partMemoryValue = value; this.properties.storage.pointer(0xa4, value); }
  get partCapacity(): number { this.properties.reader.guard(); this.properties.exact(false); return this.properties.storage.uint(0xac) | 0; }
  set partCapacity(value: number) { this.properties.storage.put(0xac, word(value)); }
  get partCount(): number { this.properties.reader.guard(); this.properties.exact(false); return this.properties.storage.uint(0xa8) | 0; }
  set partCount(value: number) { this.properties.storage.put(0xa8, word(value)); }
  constructor(readonly properties: OriginalVisualAnimationProperties) {}
  construct(secret: symbol): void { if (secret !== permission) throw new Error('Source-internal factory constructor required'); const s = this.properties.storage;
    for (const at of [0x10, 0x14, 0x18, 0x20, 0x24, 0x28]) s.put(0x94 + at, 0);
    s.put(0xc0, 0xffffffff); s.put(0x9c, 0); s.put(0xa0, 0); s.put(0x98, 0); s.write(0xb0, new Uint8Array([0]));
    this.properties.reader.note('embedded factory ordered constructor stores', 'Engine:300bce40'); }
}
export class OriginalVisualPartRecord {
  readonly storage: NativeVisualBytes; readonly name: NativeVisualCStringSlot;
  private mainValue: OriginalVisualAnimationLoD | null = null; private facialValue: OriginalVisualAnimationLoD | null = null;
  constructor(readonly index: number, readonly factory: OriginalVisualAnimationFactory) {
    const r = factory.properties.reader; this.storage = new NativeVisualBytes(16, () => { r.guard(); factory.properties.exact(false); }, () => { if (!factory.partMemory) throw new Error('Actual part backing memory required'); return factory.partMemory; }, index * 16);
    this.name = new NativeVisualCStringSlot(0, this.storage, r); this.name.pointer = null; this.main = null; this.facial = null; this.visibleByte = 1;
  }
  get main(): OriginalVisualAnimationLoD | null { this.storage.validate(); pointerAlias(this.storage, 4, this.mainValue); if (this.mainValue) this.mainValue.exact(); return this.mainValue; }
  set main(value: OriginalVisualAnimationLoD | null) { this.storage.validate(); if (value) { if (value.factory !== this.factory) throw new Error('Same-factory part LoD required'); value.exact(); } this.mainValue = value; this.storage.pointer(4, value); }
  get facial(): OriginalVisualAnimationLoD | null { this.storage.validate(); pointerAlias(this.storage, 8, this.facialValue); if (this.facialValue) this.facialValue.exact(); return this.facialValue; }
  set facial(value: OriginalVisualAnimationLoD | null) { this.storage.validate(); if (value) { if (value.factory !== this.factory) throw new Error('Same-factory facial part LoD required'); value.exact(); } this.facialValue = value; this.storage.pointer(8, value); }
  get visibleByte(): number { this.storage.validate(); return this.storage.byte(12); }
  set visibleByte(value: number) { this.storage.write(12, new Uint8Array([byte(value)])); }
}
/** Motion slots are the native12B resource/CString/owner records, not the
 * unrelated seven-field SPU PlayAni descriptor. Existing animation hosts must
 * retain this same record/resource identity when resolving motions. */
export class OriginalVisualMotionRecord {
  readonly storage: NativeVisualBytes; readonly fileName: NativeVisualCStringSlot; private resourceValue: NativeVisualMotionResource | null = null;
  constructor(readonly index: number, readonly properties: OriginalVisualAnimationProperties) {
    const r = properties.reader; this.storage = new NativeVisualBytes(12, () => { r.guard(); properties.exact(false); }, () => { if (!properties.motionMemory) throw new Error('Actual motion backing memory required'); return properties.motionMemory; }, index * 12);
    this.fileName = new NativeVisualCStringSlot(4, this.storage, r); this.construct(permission);
  }
  construct(secret: symbol): void { if (secret !== permission) throw new Error('Source internal motion reconstruction required'); this.fileName.pointer = null; this.resource = null; this.owner = 2; }
  get resource(): NativeVisualMotionResource | null { this.storage.validate(); pointerAlias(this.storage, 0, this.resourceValue); return this.resourceValue; }
  set resource(value: NativeVisualMotionResource | null) { this.storage.validate(); if (value && (!value.identity || typeof value.releaseReference !== 'function')) throw new Error('Actual motion resource release capability required'); this.resourceValue = value; this.storage.pointer(0, value); }
  get owner(): number { this.storage.validate(); return this.storage.uint(8); }
  set owner(value: number) { this.storage.put(8, value); }
}
export class OriginalClothEffector implements NativeReflectionNativeObject<Record<string, unknown>> {
  readonly className = 'eCSpringAndDamperEffector'; readonly identity: string; readonly storage: NativeVisualBytes;
  readonly values: Record<string, unknown> = {}; readonly proxies = new Map<number, NativeVisualEntityProxy>();
  private propertyObject: NativePropertyObjectReference | null = null; private constructing = true;
  constructor(readonly wrapperObject: NativeReflectionWrapper, readonly reader: OriginalVisualAnimationReader) {
    this.identity = wrapperObject.identity + ':native'; this.storage = new NativeVisualBytes(128, () => { reader.guard(); this.exact(false); });
    for (const field of [...rules.classes.eCSpringAndDamperEffector.fields, ...rules.classes.eCEffector.fields]) Object.defineProperty(this.values, field.name, { enumerable: true,
      get: () => { this.exact(); if (field.typeName === 'eCEntityProxy') return this.proxies.get(field.nativeOffset)!; if (field.typeName === 'bCVector') return [this.storage.float(field.nativeOffset), this.storage.float(field.nativeOffset + 4), this.storage.float(field.nativeOffset + 8)]; return this.storage.float(field.nativeOffset); },
      set: value => { reader.guard(); this.exact(); if (field.typeName !== 'float' || typeof value !== 'number') throw new Error('Retain actual proxy/vector storage'); this.storage.write(field.nativeOffset, rawFloat(value)); } });
  }
  get referenceWord(): number { return this.storage.uint(8); }
  set referenceWord(value: number) { this.storage.put(8, value); }
  get wrapper(): NativePropertyObjectReference | null { this.reader.guard(); pointerAlias(this.storage, 4, this.propertyObject); return this.propertyObject; }
  set wrapper(value: NativePropertyObjectReference | null) { this.reader.guard(); this.exact(false); if (value !== null && value !== this.wrapperObject) throw new Error('Same Cloth wrapper or NULL required'); this.propertyObject = value; this.storage.pointer(4, value); }
  finishConstructor(secret: symbol): void { if (secret !== permission || !this.constructing || this.storage.uint(0) !== 0x30818ae4) throw new Error('Actual Cloth leaf constructor required'); this.constructing = false; }
  exact(attached = true): void { const allocation = this.reader.controller.allocations().find(a => a.wrapper === this.wrapperObject);
    if (this.wrapperObject.deleted || !allocation || (allocation.nativeObject !== this && !(allocation.nativeObject === null && !attached && this.reader.isFresh(this))) || (!this.constructing && this.storage.uint(0) !== 0x30818ae4) || (attached && (this.wrapperObject.native !== this || this.wrapper !== this.wrapperObject || this.storage.uint(0) !== 0x30818ae4))) throw new Error('Same retained actual ClothEffector required'); }
}
export class OriginalVisualAnimationProperties {
  readonly storage: NativeVisualBytes; readonly values: Record<string, unknown> = {}; readonly base: NativeLivePropertySet<Record<string, unknown>>;
  readonly strings = new Map<number, NativeVisualCStringSlot>(); readonly factory: OriginalVisualAnimationFactory;
  readonly lookTarget: NativeVisualEntityProxy; private embeddedCloth: NativeReflectionWrapper | null = null;
  private motionMemoryValue: NativeVisualArrayMemory | null = null; readonly motionRecords: OriginalVisualMotionRecord[] = [];
  get clothWrapper(): NativeReflectionWrapper | null { this.reader.guard(); this.exact(false); if (this.embeddedCloth) { if (this.storage.uint(0x80) !== 0x3081fa2c || this.embeddedCloth.factory !== this.reader.clothFactory || this.embeddedCloth.embeddedIn?.parent !== this.wrapper || this.embeddedCloth.embeddedIn.nativeOffset !== 0x80) throw new Error('Same embedded Cloth wrapper required'); pointerAlias(this.storage, 0x8c, this.reader.clothFactory); } return this.embeddedCloth; }
  installCloth(w: NativeReflectionWrapper, secret: symbol): void { if (secret !== permission || this.embeddedCloth !== null || w.embeddedIn?.parent !== this.wrapper || w.embeddedIn.nativeOffset !== 0x80) throw new Error('Fresh same embedded Cloth slot required'); this.embeddedCloth = w; }
  get motionMemory(): NativeVisualArrayMemory | null { this.reader.guard(); this.exact(false); pointerAlias(this.storage, 0xe8, this.motionMemoryValue); return this.motionMemoryValue; }
  set motionMemory(value: NativeVisualArrayMemory | null) { this.reader.guard(); this.exact(false); if (value && (!value.identity || value.freed || value.bytes.length !== value.knownMask.length)) throw new Error('Actual live motion allocation required'); this.motionMemoryValue = value; this.storage.pointer(0xe8, value); }
  get motionCount(): number { this.reader.guard(); this.exact(false); return this.storage.uint(0xec) | 0; }
  set motionCount(value: number) { this.storage.put(0xec, word(value)); }
  get motionCapacity(): number { this.reader.guard(); this.exact(false); return this.storage.uint(0xf0) | 0; }
  set motionCapacity(value: number) { this.storage.put(0xf0, word(value)); }
  private owner: NativeLiveEntity | null = null; private propertyObject: NativePropertyObjectReference | null = null; private constructing = true;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalVisualAnimationReader) {
    this.storage = new NativeVisualBytes(424, () => { reader.guard(); this.exact(false); }); this.factory = new OriginalVisualAnimationFactory(this);
    this.lookTarget = new NativeVisualEntityProxy(0x158, this.storage, reader);
    for (const field of rules.classes.eCVisualAnimation_PS.fields) Object.defineProperty(this.values, field.name, { enumerable: true,
      get: () => { this.exact(); if (field.typeName === 'bCAnimationResourceString') return this.strings.get(field.nativeOffset)!.text;
        if (field.name === 'ClothEffector') return this.clothWrapper?.native ?? null;
        if (field.typeName.startsWith('bTPropertyContainer<')) return this.storage.uint(field.nativeOffset + 4) | 0;
        return field.typeName === 'bool' ? this.storage.byte(field.nativeOffset) !== 0 : field.typeName === 'int' ? this.storage.uint(field.nativeOffset) | 0 : this.storage.float(field.nativeOffset); },
      set: value => { reader.guard(); this.exact(); if (field.typeName === 'bool' && typeof value === 'boolean') this.storage.write(field.nativeOffset, new Uint8Array([Number(value)]));
        else if (field.typeName === 'float' && typeof value === 'number') this.storage.write(field.nativeOffset, rawFloat(value));
        else if ((field.typeName === 'int' || field.typeName.startsWith('bTPropertyContainer<')) && typeof value === 'number' && Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff) this.storage.put(field.nativeOffset + (field.typeName === 'int' ? 0 : 4), value >>> 0);
        else throw new Error('Use actual owned string/cloth capability; direct field write profile differs'); } });
    const empty = (source: string) => (set: NativeLivePropertySet<object>): NativeValue<void> => reader.controller.value(() => { reader.guard(); this.exact(); if (set !== this.base) throw new Error('Actual Visual lifecycle receiver required'); reader.note('actual inherited lifecycle RET', source); });
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', 'eCVisualAnimation_PS', 100, this.values,
      { read: () => { reader.guard(); pointerAlias(this.storage, 0xc, this.owner); return this.owner; }, write: value => { reader.guard(); this.exact(false); this.owner = value; this.storage.pointer(0xc, value); } }, null,
      { added: empty('Engine:30481830'), removed: empty('Engine:30481840'), postRead: empty('Engine:304818a0') }, () => reader.controller.value(() => { reader.guard(); this.exact(); reader.note('actual IsProcessable MOV AL,1', 'Engine:3009db20'); return true; }));
    Object.defineProperty(this.base, 'referenceWord', { get: () => this.storage.uint(8), set: v => this.storage.put(8, v) });
    Object.defineProperty(this.base, 'wrapper', { get: () => { reader.guard(); pointerAlias(this.storage, 4, this.propertyObject); return this.propertyObject; }, set: v => { reader.guard(); this.exact(false); if (v !== null && v !== this.wrapper) throw new Error('Same Visual wrapper or NULL required'); this.propertyObject = v; this.storage.pointer(4, v); } });
    Object.defineProperties(this.base.baseFlags, { value: { get: () => this.storage.bytes[0x10]!, set: v => { reader.guard(); this.exact(false); this.storage.write(0x10, new Uint8Array([byte(v)]), this.storage.knownMask.slice(0x10, 0x11)); } },
      knownMask: { get: () => this.storage.knownMask[0x10]!, set: v => { reader.guard(); this.exact(false); this.storage.write(0x10, this.storage.bytes.slice(0x10, 0x11), new Uint8Array([byte(v)])); } } });
  }
  finishConstructor(secret: symbol): void { if (secret !== permission || !this.constructing || this.storage.uint(0) !== 0x30820394) throw new Error('Actual Visual leaf constructor required'); this.constructing = false; }
  exact(attached = true): void { const slot = this.reader.controller.allocations().find(a => a.wrapper === this.wrapper);
    if (this.wrapper.deleted || !slot || (slot.propertySet !== this.base && !(slot.nativeObject === null && !attached && this.reader.isFresh(this))) || this.base.values !== this.values || (!this.constructing && this.storage.uint(0) !== 0x30820394) || (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper || this.storage.uint(0) !== 0x30820394))) throw new Error('Same actual retained VisualAnimation allocation required'); }
  motion(index: number): OriginalVisualMotionRecord { this.reader.guard(); this.exact(); if (!Number.isInteger(index) || index < 0 || index >= this.motionCount) throw new Error('Actual live native motion index required'); return this.motionRecords[index]!; }
  process(): NativeValue<void> { return this.reader.run('visual', () => { this.exact(); this.reader.effect('actual live Visual OnProcess service', 'Engine:30021b9d', () => this.reader.host.processVisual?.(this, 'Engine:30021b9d')); }); }
}

export class OriginalVisualAnimationReader {
  readonly factory: NativeReflectionFactory; readonly clothFactory: NativeReflectionFactory;
  private readonly visuals = new WeakMap<NativeReflectionWrapper, OriginalVisualAnimationProperties>();
  private readonly cloths = new WeakMap<NativeReflectionWrapper, OriginalClothEffector>();
  private readonly lodAllocations = new WeakSet<object>();
  private readonly active = new Set<'visual' | 'cloth'>(); private failedReentry = false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeVisualReadingHost) {
    fact(controller.registerRoot({ className: 'eCEffector', baseClassName: null, fields: rules.classes.eCEffector.fields }), 'actual Effector metadata root');
    this.clothFactory = { root: { className: 'eCSpringAndDamperEffector', baseClassName: 'eCEffector', fields: rules.classes.eCSpringAndDamperEffector.fields }, nativeCategory: 'non-property-set',
      cloneRoot: c => c === controller ? this.run('cloth', () => this.constructCloth()) : unknown('Same controller required'),
      getVersion: w => controller.value(() => { this.guard(); this.actualCloth(w).exact(); return 62; }), read: (w, input) => this.run('cloth', () => this.readCloth(w, input)) };
    this.factory = { root: { className: 'eCVisualAnimation_PS', baseClassName: 'eCEntityPropertySet', fields: rules.classes.eCVisualAnimation_PS.fields }, nativeCategory: 'entity-property-set',
      cloneRoot: c => c === controller ? this.run('visual', () => this.constructVisual()) : unknown('Same controller required'),
      getVersion: w => controller.value(() => { this.guard(); this.actual(w).exact(); return 64; }), read: (w, input) => this.run('visual', () => this.readVisual(w, input)) };
    fact(controller.registerFactory(this.clothFactory), 'actual ClothEffector factory'); fact(controller.registerFactory(this.factory), 'actual VisualAnimation factory');
  }
  guard(): void { if (this.failedReentry) throw new Error('Reentrant Visual/Cloth mutation is blocked'); const required = this.controller.receipt().required; if (required !== null) throw new Error(required); }
  run<T>(kind: 'visual' | 'cloth', body: () => T, secret?: symbol): NativeValue<T> { if (this.active.has(kind) || (this.active.size !== 0 && secret !== permission)) { this.failedReentry = true; return this.controller.value(() => { throw new Error('Public reentrant Visual/Cloth operation; only source-internal nested Cloth is supported'); }); }
    this.active.add(kind); try { return this.controller.value(() => { this.guard(); const v = body(); this.guard(); return v; }); } finally { this.active.delete(kind); } }
  note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  effect<T>(operation: string, source: string, body: () => NativeValue<T> | undefined): T { this.guard(); const v = this.controller.effect(operation, source, body); this.guard(); return v; }
  properties(wrapper: NativeReflectionWrapper, attached = true): NativeValue<OriginalVisualAnimationProperties> { const v = this.visuals.get(wrapper); if (!v) return unknown('Actual Visual wrapper required'); try { this.guard(); v.exact(attached); return known(v); } catch (e) { return unknown(String(e)); } }
  clothProperties(wrapper: NativeReflectionWrapper, attached = true): NativeValue<OriginalClothEffector> { const v = this.cloths.get(wrapper); if (!v) return unknown('Actual Cloth wrapper required'); try { this.guard(); v.exact(attached); return known(v); } catch (e) { return unknown(String(e)); } }
  private actual(w: NativeReflectionWrapper): OriginalVisualAnimationProperties { return fact(this.properties(w), 'current Visual native receiver'); }
  private actualCloth(w: NativeReflectionWrapper): OriginalClothEffector { return fact(this.clothProperties(w), 'current Cloth native receiver'); }
  isFresh(value: OriginalVisualAnimationProperties | OriginalClothEffector): boolean { return value instanceof OriginalVisualAnimationProperties ? this.visuals.get(value.wrapper) === value : this.cloths.get(value.wrapperObject) === value; }
  private string(slot: NativeVisualCStringSlot, input: NativeEntityByteInput): void {
    this.guard(); const before = input.cursor(); const index = input.bytes[before]! | (input.bytes[before + 1]! << 8), text = input.strings[index];
    if (before + 2 > input.end || typeof text !== 'string') throw new Error('Original indexed CString source buffer is absent');
    // Text is only a postcondition, never a substitute for the source buffer's
    // ushort ownership/refcount and allocated-empty distinction.
    slot.pointer;
    this.effect('actual indexed CString Read/SetText data ownership', 'SharedBase:10015430', () => this.host.readCString?.(slot, input));
    if (input.cursor() !== before + 2 || slot.text !== text) throw new Error('Indexed CString service did not consume/store the original source');
  }
  private clearString(slot: NativeVisualCStringSlot): void { this.guard(); const p = slot.pointer; if (p === null || p.length === 0) { this.note('CString.Clear preserves NULL/allocated empty', 'SharedBase:100149b0'); return; }
    const captured = slot.storage.bytes;
    p.referenceCount = (p.referenceCount - 1) & 65535; this.note('captured CString ushort decrement', 'SharedBase:100149b0');
    if (p.referenceCount === 0) { this.effect('actual owned CString Free', 'SharedBase:100149b0', () => this.host.freeCString?.(p)); this.sameStorage(slot.storage, captured); if (!p.freed) throw new Error('CString Free did not end captured data lifetime'); } slot.pointer = null; this.note('Clear nonempty CString pointerNULL', 'SharedBase:100149b0'); }
  private destroyString(slot: NativeVisualCStringSlot): void {
    const p = slot.pointer, captured = slot.storage.bytes;
    if (p !== null) { p.referenceCount = (p.referenceCount - 1) & 65535; this.note('CString destructor captured ushort decrement, including allocated empty', 'SharedBase:10012250');
      if (p.referenceCount === 0) { this.effect('CString destructor actual data Free', 'SharedBase:10012250', () => this.host.freeCString?.(p)); this.sameStorage(slot.storage, captured); if (!p.freed) throw new Error('CString destructor Free did not end lifetime'); } }
    // The selected temporary/allocation profile ends this pointer slot's old
    // lifetime. Native destructors do not write NULL; record reconstruction does.
    this.note('CString destructor completed', 'SharedBase:10012250');
  }
  private sameStorage(storage: NativeVisualBytes, captured: Uint8Array): void { this.guard(); storage.validate(); const current = storage.bytes; if (current.buffer !== captured.buffer || current.byteOffset !== captured.byteOffset || current.length !== captured.length) throw new Error('Captured native pointer invalidated by array relocation/lifetime callback'); }
  private readProxy(proxy: NativeVisualEntityProxy, input: NativeEntityByteInput): void { input.u16(); const present = input.bool();
    if (present) { const source = input.propertyID().slice(0, 32) + '00000000'; if (source.slice(0, 32) !== proxy.propertyId20.slice(0, 32)) { proxy.propertyId20 = source; const ref = proxy.internal; if (ref) this.effect('captured old proxy ReleaseReference after ID copy', 'Engine:304c4410', () => ref.releaseReference()); proxy.internal = null; } }
    else { const ref = proxy.internal; if (ref) this.effect('captured old proxy ReleaseReference before NULL/Destroy', 'Engine:304c4410', () => ref.releaseReference()); proxy.internal = null; proxy.propertyId20 = '0'.repeat(40); }
    this.note('actual EntityProxy Read', 'Engine:304c4410'); }
  private constructCloth(existing?: NativeReflectionWrapper): NativeReflectionWrapper {
    const w = existing ?? this.controller.allocateWrapper(this.clothFactory, 'Engine:30037187'); const v = new OriginalClothEffector(w, this); this.cloths.set(w, v);
    v.storage.put(0, 0x100e7e1c); v.storage.put(4, 0); v.storage.put(0, 0x100e7eac); v.storage.put(8, 1); this.controller.retainObject(w, v);
    v.storage.put(0, 0x3081895c); this.note('actual Effector base constructor', 'Engine:303850a0');
    for (const at of [0xc, 0x28]) { const proxy = new NativeVisualEntityProxy(at, v.storage, this); v.proxies.set(at, proxy); proxy.construct(permission); }
    this.note('two Effector vectors default constructors leave bytes unknown', 'SharedBase:10024b70'); v.storage.put(0, 0x30818ae4); this.note('Spring leaf constructor vtable', 'Engine:30388300');
    v.finishConstructor(permission);
    v.referenceWord = (v.referenceWord | 0x80000000) >>> 0; this.note('Spring.Createâ†’Effector.Createâ†’RefBase.Create valid bit', 'Engine:303882f0');
    this.controller.setAllocationPhase(w, 'created'); this.controller.attachConstructedNative(w, v, 'Engine:300aa8b0', 'Engine:300ae170');
    this.controller.initializeProperties(w, field => this.controller.value(() => { this.guard(); v.exact();
      if (field.typeName === 'float') v.storage.put(field.nativeOffset, 0);
      else if (field.typeName === 'bCVector') v.storage.write(field.nativeOffset, new Uint8Array(12));
      else if (field.typeName !== 'eCEntityProxy') throw new Error('Unproved Cloth descriptor default');
      this.note('actual same Cloth descriptor default ' + field.name, field.defaultInitializer!);
    }), () => this.controller.value(() => { this.guard(); v.exact();
      for (const [at, raw] of [[0x60,0],[0x64,0x40000000],[0x5c,0x3dcccccd],[0x68,0x3f800000],[0x70,0x3dcccccd],[0x74,0x3dcccccd],[0x6c,0x40800000],[0x78,0x3e800000],[0x7c,0x3e800000]]) v.storage.put(at!, raw!);
      this.note('ordered Spring PostInitialize stores', 'Engine:30388280');
    }), 'Engine:30388280'); return w;
  }
  private readCloth(w: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    this.actualCloth(w); return this.controller.readWrapperProperties(w, input, { wrapperSource: 'Engine:30043711', dataSource: 'Engine:300b9ed0',
      readField: (field, stream) => this.controller.value(() => { this.guard(); stream.u16(); stream.u32(); this.actualCloth(w); this.note('nonPS NotifyEnter inherited literaltrue', 'SharedBase:10001186');
        const v = this.actualCloth(w);
        if (field.typeName === 'float') v.storage.write(field.nativeOffset, stream.take(4));
        else if (field.typeName === 'bCVector') v.storage.write(field.nativeOffset, stream.take(12));
        else if (field.typeName === 'eCEntityProxy') this.readProxy(v.proxies.get(field.nativeOffset)!, stream);
        else throw new Error('Unproved Cloth field'); this.actualCloth(w); this.note('nonPS NotifyExit inherited literaltrue', 'SharedBase:10005a65'); }),
      readNative: stream => this.controller.value(() => { this.guard(); this.actualCloth(w); const spring = stream.u16(); this.note('Spring.Read version', 'Engine:30388370'); if (spring !== 62) throw new Error('Selected Spring native version62 required');
        const effector = stream.u16(); this.note('Effector.Read version', 'Engine:30385150'); if (effector !== 39) throw new Error('Selected Effector native version39 required');
        const base = stream.u16(); this.note('RefBase.Read version only', 'SharedBase:100073ce'); if (base !== 1) throw new Error('Selected RefBase version1 required'); }) });
  }
  private enumInit(v: OriginalVisualAnimationProperties, name: 'BoneShapeGroup' | 'BoneShapeMaterial' | 'SkeletonShapeGroup', at: number, vt: number, global: string): void {
    v.storage.put(at, 0x100e7e1c); this.note('enum bCObjectBase constructor vtable store', 'SharedBase:1004a1c2');
    v.storage.put(at, vt); const value = this.effect('current mutable module enum default ' + name, 'Engine:300a5330', () => this.host.currentEnum?.(name, global));
    v.storage.write(at + 4, rawWord(value.value), rawWord(value.knownMask)); this.note('enum leaf/current global store', 'Engine:300a5330');
  }
  private enumDefault(v: OriginalVisualAnimationProperties, field: NativeReflectionField): void {
    const info = this.enumInfo(field.name); if (v.storage.uint(field.nativeOffset) !== info.vt) throw new Error('Original enum default virtual+18 receiver differs');
    const value = this.effect('enum leaf default virtual+18 current mutable module global', field.defaultInitializer!, () => this.host.currentEnum?.(info.name, info.global));
    v.storage.write(field.nativeOffset + 4, rawWord(value.value), rawWord(value.knownMask));
  }
  private enumInfo(name: string): { name: 'BoneShapeGroup' | 'BoneShapeMaterial' | 'SkeletonShapeGroup'; vt: number; global: string } {
    if (name === 'BoneShapeGroup') return { name, vt: 0x3081f304, global: '30ada2b8' };
    if (name === 'BoneShapeMaterial') return { name, vt: 0x3081f3dc, global: '30ada2bc' };
    if (name === 'SkeletonShapeGroup') return { name, vt: 0x3081f4b4, global: '30ada2c0' };
    throw new Error('Unproved enum field');
  }
  private bindCloth(v: OriginalVisualAnimationProperties): NativeReflectionWrapper {
    const w = this.controller.allocateEmbeddedWrapper(this.clothFactory, 'Engine:300a5330', v.wrapper, 0x80);
    // Bind before native Create/defaults. These four fields occupy the SAME
    // parent+80 wrapper, never a detached replacement or a copied flags object.
    v.storage.put(0x80, 0x3081fa2c); v.storage.write(0x84, rawWord(14), rawWord(0x07ffffff)); v.storage.put(0x88, 0); v.storage.pointer(0x8c, this.clothFactory);
    let native: NativeReflectionNativeObject | null = null;
    Object.defineProperties(w.flags, { value: { get: () => { this.guard(); return new DataView(v.storage.bytes.buffer, v.storage.bytes.byteOffset).getUint32(0x84, true); }, set: (n: number) => { this.guard(); v.storage.write(0x84, rawWord(n), v.storage.knownMask.slice(0x84, 0x88)); } },
      knownMask: { get: () => { this.guard(); return new DataView(v.storage.knownMask.buffer, v.storage.knownMask.byteOffset).getUint32(0x84, true); }, set: (n: number) => { this.guard(); v.storage.write(0x84, v.storage.bytes.slice(0x84, 0x88), rawWord(n)); } } });
    Object.defineProperty(w, 'native', { get: () => { this.guard(); pointerAlias(v.storage, 0x88, native); return native; }, set: (n: NativeReflectionNativeObject | null) => { this.guard(); v.exact(false); if (n !== null && n !== this.cloths.get(w)) throw new Error('Same retained embedded Cloth native required'); native = n; v.storage.pointer(0x88, n); } });
    v.installCloth(w, permission); this.note('embedded wrapper flags/native/type aliases bound to same parent', 'Engine:300a5330');
    return fact(this.run('cloth', () => this.constructCloth(w), permission), 'embedded Cloth actual Create/defaults');
  }
  private constructVisual(): NativeReflectionWrapper {
    const w = this.controller.allocateWrapper(this.factory, 'Engine:300ba240'); const v = new OriginalVisualAnimationProperties(w, this); this.visuals.set(w, v);
    const s = v.storage;
    s.put(0, 0x100e7e1c); s.put(4, 0); s.put(0, 0x100e7eac); s.put(8, 1);
    this.controller.retainNative(w, v.base); s.write(0x10, new Uint8Array([1]), new Uint8Array([15])); s.put(0, 0x30875d8c); v.base.owner.write(null); s.put(0, 0x30820394); v.finishConstructor(permission);
    this.note('base PS/RefBase ctor then Visual leaf vtable', 'Engine:300a5330');
    const makeString = (at: number) => { const slot = new NativeVisualCStringSlot(at, s, this); v.strings.set(at, slot); slot.pointer = null; this.note('CString constructor NULL slot+' + at.toString(16), 'SharedBase:10012d20'); };
    makeString(0x14); makeString(0x18);
    this.enumInit(v, 'BoneShapeGroup', 0x5c, 0x3081f304, '30ada2b8'); this.enumInit(v, 'BoneShapeMaterial', 0x64, 0x3081f3dc, '30ada2bc'); this.enumInit(v, 'SkeletonShapeGroup', 0x6c, 0x3081f4b4, '30ada2c0');
    this.bindCloth(v); v.factory.construct(permission);
    for (const at of [0xc4,0xc8,0xcc,0xd0,0xd4,0xd8,0xdc,0xe0,0xe4,0xe8,0xec,0xf0]) s.put(at, 0);
    this.note('Box default constructor RET leaves bytes unknown', 'SharedBase:1000782e');
    for (const at of [0x10c,0x110,0x114,0x120,0x124,0x128,0x138,0x13c,0x140]) s.put(at, 0);
    makeString(0x144); makeString(0x148); v.lookTarget.construct(permission); makeString(0x174); makeString(0x184);
    for (const at of [0x18c,0x190,0x194]) s.put(at, 0);
    this.invalidateFresh(v);
    v.base.referenceWord = (v.base.referenceWord | 0x80000000) >>> 0; this.note('Visual.Create basePS/RefBase valid bit', 'Engine:3009f820');
    this.createFactory(v.factory); this.reserveMotions(v, 8, 0); v.motionCount = 8; this.note('Visual.Create motion count8 after reserve', 'Engine:3009f820');
    this.controller.setAllocationPhase(w, 'created'); this.controller.attachConstructedNative(w, v.base, 'Engine:300aaac0', 'Engine:300ba240');
    this.controller.initializeProperties(w, field => this.controller.value(() => { const receiver = this.actual(w);
      if (field.typeName === 'bCAnimationResourceString') this.clearString(receiver.strings.get(field.nativeOffset)!);
      else if (field.typeName.startsWith('bTPropertyContainer<')) this.enumDefault(receiver, field);
      else if (field.name === 'ClothEffector') { const embedded = receiver.clothWrapper; if (!embedded || embedded.native !== this.actualCloth(embedded)) throw new Error('Same embedded Cloth member required'); }
      else if (field.typeName === 'bool') receiver.storage.write(field.nativeOffset, new Uint8Array([0]));
      else if (field.typeName === 'int') receiver.storage.put(field.nativeOffset, 0xffffffff);
      else if (field.typeName === 'float') receiver.storage.put(field.nativeOffset, 0);
      else throw new Error('Unproved Visual descriptor default');
      this.note('actual descriptor default ' + field.name, field.defaultInitializer!);
    }), () => this.controller.value(() => this.postInitializeVisual(this.actual(w))), 'Engine:3009dc50');
    return w;
  }
  private invalidateFresh(v: OriginalVisualAnimationProperties): void {
    const s = v.storage; const box = new Uint8Array(24); const dv = new DataView(box.buffer); for (let i = 0; i < 6; i++) dv.setFloat32(i * 4, i < 3 ? -1 : 1, true); s.write(0xf4, box);
    this.note('stack Vector0/Box.SetBox extent1/vector destructor RET', 'Engine:300a4f30');
    s.write(0x118, new Uint8Array([0])); s.write(0x119, new Uint8Array([0])); this.clearString(v.strings.get(0x144)!); this.clearString(v.strings.get(0x148)!);
    s.put(0x14c, 0xbf800000); s.put(0x11c, 0); s.write(0x12c, new Uint8Array([0])); s.write(0x178, new Uint8Array([0])); s.put(0x134, 0); s.put(0x130, 0);
    s.write(0x151, new Uint8Array([0])); s.write(0x179, new Uint8Array([0])); s.put(0x1a4, 0); s.write(0x17a, new Uint8Array([0])); s.write(0x17b, new Uint8Array([0])); s.put(0x17c, 0); s.put(0x188, 0x3f800000);
    if (s.uint(0x138) !== 0) throw new Error('Fresh Invalidate optional array NULL profile required before destructor/Free');
    s.put(0x1a0, 0); s.put(0x198, 0); s.write(0x19c, new Uint8Array(2)); s.put(0x180, 0xbf34bc6a); this.note('ordered Visual Invalidate fresh NULL array branch', 'Engine:300a4f30');
  }
  private postInitializeVisual(v: OriginalVisualAnimationProperties): void {
    this.note('base RefBase PostInitialize ignored return', 'SharedBase:100076f8');
    for (const [at, value] of [[0x1c,0],[0x1d,0],[0x1e,0],[0x1f,1],[0x20,1]]) v.storage.write(at!, new Uint8Array([value!]));
    const temporary = new NativeVisualBytes(8, () => this.guard());
    for (const [name, at, value] of [['BoneShapeGroup',0x5c,2],['BoneShapeMaterial',0x64,10],['SkeletonShapeGroup',0x6c,2]] as const) {
      const info = this.enumInfo(name); temporary.put(0, 0x100e7e1c); this.note('reused8B enum temporary base constructor', 'SharedBase:1004a1c2'); temporary.put(0, info.vt); temporary.put(4, value);
      if (v.storage.uint(at) !== info.vt) throw new Error('Enum virtual+1c assignment receiver differs'); v.storage.write(at + 4, temporary.raw(4, 4)); this.note('enum leaf virtual+1c copies SAME temporary value', 'Engine:3009dc50');
      temporary.put(0, 0x100e7e1c); this.note('enum temporary leaf/base destructor', 'SharedBase:10049fe0');
    }
    for (const [at, raw] of [[0x2c,0x3f000000],[0x30,0x3f000000],[0x44,0x3f000000],[0x48,0x3dcccccd],[0x58,0x3e4ccccd],[0x50,0x469ca400],[0x38,0x42c80000],[0x54,0x3a83126f]]) v.storage.put(at!, raw!);
    v.storage.write(0x34, new Uint8Array([0])); v.storage.put(0x3c, 0x3f4ccccd);
    for (const [at, value] of [[0x40,1],[0x4c,1],[0x7c,0],[0x21,0]]) v.storage.write(at!, new Uint8Array([value!]));
    v.storage.put(0x24, 0x7f7fffff); v.storage.put(0x28, 0x7f7fffff); v.storage.write(0x7d, new Uint8Array([1])); v.storage.write(0x74, new Uint8Array([1])); v.storage.put(0x90, 0); v.storage.put(0x78, 0x3f800000);
    this.note('ordered Visual PostInitialize stores', 'Engine:3009dc50');
  }
  private allocateArray(old: NativeVisualArrayMemory | null, bytes: number, source: string): NativeVisualArrayMemory {
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > 0x7fffffff || (old && (old.freed || old.bytes.length !== old.knownMask.length))) throw new Error('Original live array/positive int32 allocation profile required');
    const oldBytes = old?.bytes.slice(), oldMasks = old?.knownMask.slice();
    const next = this.effect('actual MemoryAdmin.Realloc bytes=' + bytes, source, () => this.host.reallocArray?.(old, bytes, source));
    if (!next || !next.identity || next.freed || next.bytes.length !== bytes || next.knownMask.length !== bytes) throw new Error('Selected successful Realloc exact physical allocation required');
    if (oldBytes && oldMasks) { const n = Math.min(oldBytes.length, bytes); for (let i = 0; i < n; i++) if (next.knownMask[i] !== oldMasks[i] || ((next.bytes[i]! ^ oldBytes[i]!) & oldMasks[i]!) !== 0) throw new Error('Realloc did not preserve captured known old bytes'); }
    return next;
  }
  private setActorNull(lod: OriginalVisualAnimationLoD): void {
    lod.exact();
    // These live branches contain original render hook/cast/array/resource
    // virtual calls. A real service executes them; NULL is handled concretely.
    if (lod.storage.uint(0xc) !== 0 || lod.storage.uint(0x14) !== 0 || lod.resource !== null) {
      this.effect('actual SetActor(NULL) populated render/resource services', 'Engine:3000b811', () => this.host.setActorNull?.(lod)); lod.exact();
      if (lod.resource !== null || lod.storage.uint(0xc) !== 0 || lod.storage.uint(0x14) !== 0) throw new Error('LoD Destroy service did not clear actual resource/render storage');
    } else { lod.storage.put(0xc, 0); this.note('NULL render hook/NULL RTTI cast/NULL array branch', 'Engine:30026afd'); lod.storage.write(0x10, new Uint8Array([0])); lod.resource = null; this.note('SetActor(NULL) old resourceNULL branch', 'Engine:3000b811'); }
  }
  private destroyLoD(lod: OriginalVisualAnimationLoD): void {
    this.setActorNull(lod); this.clearString(lod.fileName); lod.storage.put(0xc, 0); lod.resource = null; lod.storage.write(0x10, new Uint8Array([0])); this.note('actual LoD Destroy final stores', 'Engine:3001c0cb');
  }
  private releaseLoD(lod: OriginalVisualAnimationLoD): void {
    lod.exact(); this.effect('LoD virtual+24â†’base ReleaseReferenceâ†’virtual+38(arg0) then DeleteObject', 'SharedBase:1004a1e0', () => this.host.deleteLoD?.(lod));
    // The service includes the real destructor and deallocation, including
    // owned CString and populated resources. Mark only after known completion.
    lod.markDeleted(permission); this.note('captured LoD allocation lifetime ended', 'SharedBase:1004a1e0');
  }
  private destroyFactory(f: OriginalVisualAnimationFactory): void {
    const v = f.properties; v.exact(false);
    if (f.actorInstance !== null) { this.effect('actual DestroyActorInstance', 'Engine:300bcd20', () => this.host.destroyActorInstance?.(f)); if (f.actorInstance !== null) throw new Error('Actor instance not destroyed by actual service'); }
    else {
      if (f.main !== null) this.setActorNull(f.main);
      for (let i = 0; i < f.partCount; i++) { const memory = f.partMemory, part = f.parts[i]; if (!part?.main) throw new Error('Native DestroyActorInstance part main NULL dereference is outside profile'); this.setActorNull(part.main); if (f.partMemory !== memory || f.parts[i] !== part) throw new Error('Selected DestroyActorInstance current part backing is stable across callbacks'); if (part.facial !== null) this.setActorNull(part.facial); }
      if (v.storage.uint(0xb4) !== 0) throw new Error('DestroyActorInstance populated additional-array Free requires actual ownership service');
      this.note('DestroyActorInstance actorNULL: main/parts ReleaseResources then additional-arrayNULL', 'Engine:300bc660');
    }
    if (f.main !== null) { const old = f.main; this.releaseLoD(old); f.main = null; }
    if (f.facial !== null) { const old = f.facial; this.releaseLoD(old); f.facial = null; }
    for (let i = 0; i < f.partCount; i++) { const part = f.parts[i]; if (!part) throw new Error('Actual constructed part required');
      if (part.main !== null) { const old = part.main; this.releaseLoD(old); if (f.parts[i] !== part) throw new Error('Replaced captured part after LoD release'); part.main = null; }
      if (part.facial !== null) { const old = part.facial; this.releaseLoD(old); if (f.parts[i] !== part) throw new Error('Replaced captured part after LoD release'); part.facial = null; } }
    if (f.partMemory !== null) {
      const capturedMemory = f.partMemory, count = f.partCapacity; for (let i = 0; i < count; i++) { const record = f.parts[i]; if (!record) throw new Error('Actual capacity CString record required'); this.destroyString(record.name); if (f.partMemory !== capturedMemory || f.parts[i] !== record) throw new Error('Captured capacity CString pointer invalidated by callback'); }
      const memory = f.partMemory; this.effect('actual factory parts MemoryAdmin.Free', 'Engine:300bcd20', () => this.host.freeArray?.(memory, 'Engine:300bcd20')); if (!memory.freed) throw new Error('Parts Free did not end captured allocation');
      f.partMemory = null; f.partCount = 0; f.partCapacity = 0; f.parts.length = 0;
    }
    f.main = null; f.facial = null; f.actorInstance = null; v.storage.write(0xb0, new Uint8Array([0])); this.note('ordered Factory.Destroy complete', 'Engine:300bcd20');
  }
  private newLoD(f: OriginalVisualAnimationFactory, tag: 0x19c | 0x3eb | 0x3fe | 0x406, source: string): OriginalVisualAnimationLoD {
    const allocation = this.effect('actual new44 allocation/tag' + tag.toString(16), source, () => this.host.allocateLoD?.(44, tag, f));
    if (!allocation) throw new Error('Selected successful LoD allocation profile: native NULL branch dereferences virtual method');
    if (this.lodAllocations.has(allocation.identity) || allocation.knownMask.some(value => value !== 0)) throw new Error('Fresh distinct LoD allocation lifetime/uninitialized-mask profile required'); this.lodAllocations.add(allocation.identity);
    return new OriginalVisualAnimationLoD(f, tag, allocation);
  }
  private createFactory(f: OriginalVisualAnimationFactory): void { this.destroyFactory(f); f.main = this.newLoD(f, 0x19c, 'Engine:300bcdf0'); this.note('new44/tag19c/ctor/main pointer before virtual Create', 'Engine:300bcdf0'); this.destroyLoD(f.main); this.note('LoD.Create virtual Destroy then return1', 'Engine:300bed00'); }
  private reserveMotions(v: OriginalVisualAnimationProperties, requested: number, growth: 0 | -1): void {
    if (!Number.isInteger(requested) || requested < 0 || requested > 0x7fffffff / 12) throw new Error('Supported int32 motion allocation extent required');
    const oldCapacity = v.motionCapacity;
    if (requested !== 0 && oldCapacity < requested) {
      const capacity = requested + (growth === 0 ? Math.max(8, Math.min(0x400, oldCapacity >> 3)) : 0);
      const count = v.motionCount; const memory = this.allocateArray(v.motionMemory, capacity * 12, 'Engine:' + (growth === 0 ? '300ab6b0' : '300ae4c0')); v.motionMemory = memory;
      if (v.motionCapacity !== oldCapacity || v.motionCount !== count) throw new Error('Selected allocator preserves motion header until original following stores');
      this.constructMotions(v, oldCapacity, capacity - oldCapacity); v.motionCapacity = capacity;
    }
  }
  private constructMotions(v: OriginalVisualAnimationProperties, start: number, count: number): void {
    const memory = v.motionMemory; if (!memory || memory.freed || (start + count) * 12 > memory.bytes.length) throw new Error('Actual motion constructor backing required');
    memory.bytes.fill(0, start * 12, (start + count) * 12); memory.knownMask.fill(255, start * 12, (start + count) * 12); this.note('motion contiguous memset before each record constructor', 'Engine:300ab630');
    for (let i = start; i < start + count; i++) { const old = v.motionRecords[i]; if (old) old.construct(permission); else v.motionRecords[i] = new OriginalVisualMotionRecord(i, v); }
    this.note('motion CStringNULL/resourceNULL/Clear/owner2 records', 'Engine:300ab630');
  }
  private destroyMotion(record: OriginalVisualMotionRecord): void {
    const memory = record.properties.motionMemory, count = record.properties.motionCount, capacity = record.properties.motionCapacity, old = record.resource;
    const retained = () => { if (record.properties.motionMemory !== memory || record.properties.motionRecords[record.index] !== record || record.properties.motionCount !== count || record.properties.motionCapacity !== capacity) throw new Error('Captured motion record pointer/header invalidated by callback'); };
    if (old) { this.effect('motion old resource virtual+24', 'Engine:300ae3f0', () => old.releaseReference()); retained(); record.resource = null; }
    this.clearString(record.fileName); retained(); this.destroyString(record.fileName); retained(); this.note('motion record resource/CString ordered destructor', 'Engine:300ae3f0');
  }
  private readMotions(v: OriginalVisualAnimationProperties, input: NativeEntityByteInput): void {
    input.u8(); const count = input.u32(); this.reserveMotions(v, count, -1);
    const oldCount = v.motionCount;
    if (count < oldCount) { for (let i = count; i < oldCount; i++) this.destroyMotion(v.motionRecords[i]!); if (v.motionCount !== oldCount) throw new Error('Selected motion shrink live count remains unchanged across destructors'); this.constructMotions(v, count, v.motionCount - count); }
    v.motionCount = count; this.note('native motion count store before filename reads', 'Engine:300ae4c0');
    for (let i = 0; i < v.motionCount; i++) { const record = v.motionRecords[i]; if (!record) throw new Error('Actual retained motion record required'); const memory = v.motionMemory;
      this.string(record.fileName, input); if (v.motionMemory !== memory || v.motionRecords[i] !== record) throw new Error('Captured motion record/allocation replacement is unsupported');
      const old = record.resource; if (old) { this.effect('motion Read old resource virtual+24 AFTER filename', 'Engine:300ae4c0', () => old.releaseReference()); if (v.motionMemory !== memory || v.motionRecords[i] !== record) throw new Error('Captured motion allocation changed during release'); record.resource = null; } }
  }
  private readLoD(lod: OriginalVisualAnimationLoD, input: NativeEntityByteInput): void {
    lod.exact(); const version = input.u16(); this.destroyLoD(lod);
    if (version !== 4) throw new Error('Only installed current LoD native version4 path examined');
    const temporaryStorage = new NativeVisualBytes(4, () => this.guard()), name = new NativeVisualCStringSlot(0, temporaryStorage, this); name.pointer = null; this.note('LoD.Read stack CString constructor', 'Engine:300bf290');
    this.string(name, input);
    if (!name.isEmpty()) { this.effect('actual SetActorFileName archive/owned actor lookup; bool ignored', 'Engine:300bf0d0', () => this.host.setActorFileName?.(lod, name)); lod.exact(); }
    this.destroyString(name); lod.exact(); lod.storage.write(0x24, input.take(4)); this.note('LoD version4 material int32 after temporary destructor', 'Engine:300bf290');
  }
  private reserveParts(f: OriginalVisualAnimationFactory, requested: number): void {
    const oldCapacity = f.partCapacity;
    if (!Number.isInteger(requested) || requested < 1 || requested > 0x7fffffff / 16) throw new Error('Supported current factory part allocation extent required');
    if (oldCapacity < requested) { const count = f.partCount; const memory = this.allocateArray(f.partMemory, requested * 16, 'Engine:300be190'); f.partMemory = memory;
      if (f.partCapacity !== oldCapacity || f.partCount !== count) throw new Error('Selected allocator preserves part header until original following stores');
      memory.bytes.fill(0, oldCapacity * 16); memory.knownMask.fill(255, oldCapacity * 16); this.note('parts increment=-1: exact requested capacity and new-region memset', 'Engine:300bdf60');
      for (let i = oldCapacity; i < requested; i++) f.parts[i] = new OriginalVisualPartRecord(i, f); f.partCapacity = requested;
    }
  }
  private readFactory(f: OriginalVisualAnimationFactory, input: NativeEntityByteInput): void {
    this.createFactory(f); const version = input.u16(); const main = f.main; if (!main) throw new Error('Actual successful main LoD allocation required'); this.readLoD(main, input);
    if (version !== 5) throw new Error('Only installed current Factory native version5 path examined');
    if (input.bool()) { f.facial = this.newLoD(f, 0x3eb, 'Engine:300bd440'); this.readLoD(f.facial, input); }
    const count = input.u32();
    for (let i = 0; i < count; i++) { const requested = f.partCount + 1; this.reserveParts(f, requested);
      if (f.partCount >= requested) throw new Error('Changed live part-count shrink/destructor branch requires further native services');
      f.partCount = requested; const part = f.parts[requested - 1]; if (!part) throw new Error('Actual newly constructed part required'); const memory = f.partMemory;
      this.string(part.name, input); if (f.partMemory !== memory || f.parts[requested - 1] !== part) throw new Error('Captured part allocation changed during CString read');
      part.main = this.newLoD(f, 0x3fe, 'Engine:300bd440'); this.readLoD(part.main, input);
      if (f.partMemory !== memory) throw new Error('Captured part pointer invalidated by LoD read');
      if (input.bool()) { part.facial = this.newLoD(f, 0x406, 'Engine:300bd440'); this.readLoD(part.facial, input); }
      if (f.partMemory !== memory) throw new Error('Captured part pointer invalidated by facial LoD read'); part.visibleByte = Number(input.bool());
      this.note('current factory part Read complete', 'Engine:300bd440'); }
  }
  private notify(v: OriginalVisualAnimationProperties, phase: 'enter' | 'exit', property: string, propagated = true): void {
    v.exact(); v.base.owner.read()?.propertyOwner.modified(); this.note('outer Notify owner.Modified pureDWORD130 read', 'Engine:' + (phase === 'enter' ? '30481b20' : '30481b50'));
    if (phase === 'exit') {
      if (!propagated) this.effect('local NotifyExit temporary strings/filename/cache prefix', 'Engine:300a4550', () => this.host.localNotifyExitPrefix?.(v, property));
      const material = v.storage.uint(0x90) | 0, main = v.factory.main; if (!main) throw new Error('Native NotifyExit main LoD NULL dereference'); main.materialSwitch = material;
      if (v.factory.facial !== null) { const currentMaterial = v.storage.uint(0x90) | 0, currentFacial = v.factory.facial; if (!currentFacial) throw new Error('Reread facial becameNULL'); currentFacial.materialSwitch = currentMaterial; }
      this.note('NotifyExit captures main material; facial material/getter reread', 'Engine:300a4550');
    }
    v.base.owner.read()?.propertyOwner.modified(); this.note('inherited OnNotify current owner.Modified reread/literaltrue', 'Engine:' + (phase === 'enter' ? '30481ac0' : '30481af0'));
  }
  notifyProperty(w: NativeReflectionWrapper, phase: 'enter' | 'exit', property: string, propagated: boolean): NativeValue<void> { return this.run('visual', () => this.notify(this.actual(w), phase, property, propagated)); }
  private readVisual(w: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    this.actual(w); return this.controller.readWrapperProperties(w, input, { wrapperSource: 'Engine:3003bd54', dataSource: 'Engine:30016527',
      readField: (field, stream) => this.controller.value(() => {
        this.guard(); stream.u16(); stream.u32(); this.notify(this.actual(w), 'enter', field.name);
        // Enter can invoke an owner observer. Resolve the physical receiver only
        // afterwards; the original descriptor resolves again before Exit.
        const v = this.actual(w);
        if (field.typeName === 'bCAnimationResourceString') this.string(v.strings.get(field.nativeOffset)!, stream);
        else if (field.name === 'ClothEffector') { const embedded = v.clothWrapper; if (!embedded || embedded.native !== this.actualCloth(embedded) || embedded.factory !== this.clothFactory) throw new Error('Actual same embedded Cloth descriptor required'); fact(this.run('cloth', () => this.readCloth(embedded, stream), permission), 'embedded wrapper source-internal virtual Read'); }
        else if (field.typeName.startsWith('bTPropertyContainer<')) { const info = this.enumInfo(field.name); if (v.storage.uint(field.nativeOffset) !== info.vt) throw new Error('Enum virtual Read receiver differs'); stream.u16(); v.storage.write(field.nativeOffset + 4, stream.take(4)); }
        else if (field.typeName === 'bool') v.storage.write(field.nativeOffset, new Uint8Array([Number(stream.bool())]));
        else if (field.typeName === 'float' || field.typeName === 'int') v.storage.write(field.nativeOffset, stream.take(4));
        else throw new Error('Unproved Visual descriptor Read');
        this.notify(this.actual(w), 'exit', field.name);
      }), readNative: stream => this.controller.value(() => {
        const v = this.actual(w), version = stream.u16(); this.note('native Visual version read', 'Engine:300a2ec0');
        this.readFactory(v.factory, stream); if (version !== 64) throw new Error('Only installed current Hero Visual native version64 path examined');
        this.readMotions(v, stream); if (!v.strings.get(0x14)!.isEmpty()) {
          const main = v.factory.main; if (!main) throw new Error('Actual main LoD required before SetMain filename'); this.effect('Factory.SetMainActorFileName actual archive/resource; bool ignored', 'Engine:30020f81', () => this.host.setActorFileName?.(main, v.strings.get(0x14)!));
          if (v.factory.actorInstance !== null) this.effect('SetMain filename current actor nonNULL recreation', 'Engine:30020f81', () => this.host.createActorInstance?.(v.factory));
        }
        this.clearAttachments(v); const count = stream.u32(); if (count !== 0) this.effect('nonzero current attachments new120/tag76a/Read/resize/append', 'Engine:300a2ec0', () => this.host.readAttachments?.(v, stream, count, 64));
        v.storage.write(0xf4, stream.take(24)); this.note('raw Box24 one virtual Read', 'Engine:300a2ec0'); const baseVersion = stream.u16(); if (baseVersion !== 2) throw new Error('Selected base PS native version2 required');
        const enabled = Number(stream.bool()); const value = v.base.baseFlags.value, mask = v.base.baseFlags.knownMask;
        v.storage.write(0x10, new Uint8Array([(value & ~1) | enabled]), new Uint8Array([mask | 1])); this.note('base PS Read sets only enabled bit0', 'Engine:304816b0');
      }) });
  }
  private clearAttachments(v: OriginalVisualAnimationProperties): void {
    if (v.storage.uint(0xc4) === 0 && v.storage.uint(0xc8) === 0) { this.note('ClearAttachments actual zero-count/NULL-array branch', 'Engine:3000669a'); return; }
    this.effect('actual populated ClearAttachments attachment/resource lifetimes', 'Engine:3000669a', () => this.host.clearAttachments?.(v));
  }
}

export async function readOriginalHeroVisualAnimation(reader: OriginalVisualAnimationReader): Promise<NativeValue<{
  accessor: NativeReflectionAccessor; properties: OriginalVisualAnimationProperties; input: NativeEntityByteInput; outerVersion: 64; worldResident: false
}>> {
  const document = await loadOriginalReflectionSerialized(), packet = originalReflectionPropertyInput(document, 'PC_Hero', 18);
  if (packet.outerVersion !== 64 || packet.source.className !== 'eCVisualAnimation_PS' || packet.source.serializedSha256 !== rules.hero.serializedSha256) return unknown('Original Hero Visual packet differs');
  const accessor = reader.controller.readAccessor(packet.input); if (!accessor.known) return accessor; const wrapper = accessor.value.instance; if (!wrapper) return unknown('Original Visual wrapperNULL');
  const properties = reader.properties(wrapper); if (!properties.known) return properties; return known({ accessor: accessor.value, properties: properties.value, input: packet.input, outerVersion: 64, worldResident: false });
}
