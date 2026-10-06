/** Real detached eCCollisionShape_PS and its nested eCCollisionShape objects.
 * A reflected shape is bCObjectRefBase, never an entity property set. Physical
 * masks preserve uninitialized/global-unknown bits; loading does not create a
 * PhysX actor, scene registration, spatial membership or world residency.
 */
import rulesText from '../../assets/gothic3/collision-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyObjectReference } from './entity-lifecycle';
import { NativeReflectionWrapper } from './entity-reflection';
import type { NativeReflectionFactory, NativeReflectionField, NativeReflectionNativeObject,
  NativeReflectionRoot } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import type { NativeMovementCollision } from './movement-state';
import type { NativeEntityCollisionShape } from './entity-setters';

interface CollisionField extends NativeReflectionField { cppType: string }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>;
  fields: Record<string, CollisionField[]>; nativeVtables: Record<string, string> };
if (rules.schema !== 'gothic3-collision-reading-rules-v1' || rules.fields.eCCollisionShape_PS?.length !== 5 ||
    rules.fields.eCCollisionShape?.length !== 15 || rules.nativeVtables.psNative !== '30860f74' ||
    rules.nativeVtables.shapeNative !== '308212e4' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original collision reading evidence differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, operation: string): T { if (!value.known) throw new Error(operation + ': ' + value.reason); return value.value; }
function word(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Native uint32 required'); return value;
}
const enumType = (field: CollisionField): string | null => /^bTPropertyContainer<(.+)>_$/.exec(field.cppType)?.[1] ?? null;
const enumGlobals: Record<string, number> = { eECollisionGroup: 0x30ada2c0, eEPhysicRangeType: 0x30aec2e8,
  eECollisionShapeType: 0x30adab04, eEShapeGroup: 0x30ada2b8, eEShapeMaterial: 0x30ada2bc, eEShapeAABBAdapt: 0x30adab08 };
const enumVtables: Record<string, number> = { eECollisionGroup: 0x3081f4b4, eEPhysicRangeType: 0x30860a8c,
  eECollisionShapeType: 0x308211b4, eEShapeGroup: 0x3081f304, eEShapeMaterial: 0x3081f3dc, eEShapeAABBAdapt: 0x30821204 };

export interface NativeCollisionTemporaryCString { readonly identity: object; readonly text: string;
  compare(literal: 'DisableResponse' | 'Group' | 'Range'): NativeValue<number> }
export interface NativeCollisionPhysicObject { onActorChanged(): NativeValue<void> }
export interface NativeCollisionResponseBuffer { enableCollisionResponse(enabled: boolean): NativeValue<void> }
/** Same captured physical eCEntity receiver. Implementations read the live PS
 * registry and physics/cache state, never a serialized candidate or GUID lookup. */
export interface NativeCollisionOwner {
  readonly entity: NativeLiveEntity;
  hasPropertySet(selector: 48): NativeValue<boolean>;
  propertySet(selector: 13): NativeValue<object | null>;
  getPhysicObject(): NativeValue<NativeCollisionPhysicObject | null>;
  responseBuffer(): NativeValue<NativeCollisionResponseBuffer>;
  createPhysicObject(): NativeValue<void>;
  isCachedIn(): NativeValue<boolean>;
  name(): NativeValue<string>;
}
export interface NativeCollisionReadingHost {
  /** Actual live mutable enum-default DWORDs. Absent storage stays fully masked
   * until proven PostInitialize writes; zero is never inferred from absence. */
  enumDefaults?: Readonly<Record<string, NativeMaskedWord>>;
  ownerView?(owner: NativeLiveEntity): NativeValue<NativeCollisionOwner>;
  /** Native local exit constructs/comparisons/destruction are distinct source
   * boundaries. Reflective propagated exit does not invoke these services. */
  constructPropertyName?(name: string): NativeValue<NativeCollisionTemporaryCString>;
  destroyPropertyName?(name: NativeCollisionTemporaryCString): NativeValue<void>;
  warning?(kind: 'item-static-shape' | 'movable-triangle-mesh', name: string): NativeValue<void>;
}

/** Proven empty reflected PS metadata parent. Register once, before factories;
 * Shape's C++ bCObjectRefBase parent is the iterator's end sentinel (NULL).
 * these roots do not manufacture base constructors or support class cloning. */
export const collisionReflectionRoots: readonly NativeReflectionRoot[] = Object.freeze([
  Object.freeze({ className: 'eCCollisionShapeBase_PS', baseClassName: 'eCEntityPropertySet', fields: Object.freeze([]) }),
]);

class CollisionBytes {
  readonly bytes: Uint8Array;
  readonly knownMask: Uint8Array;
  readonly view: DataView;
  constructor(length: number) { this.bytes = new Uint8Array(length); this.knownMask = new Uint8Array(length); this.view = new DataView(this.bytes.buffer); }
  put(offset: number, value: Uint8Array, mask?: Uint8Array): void {
    this.bytes.set(value, offset); this.knownMask.set(mask ?? new Uint8Array(value.length).fill(0xff), offset);
  }
  u8(offset: number, value: number): void { if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Native uint8 required'); this.view.setUint8(offset, value); this.knownMask[offset] = 0xff; }
  u16(offset: number, value: number): void { if (!Number.isInteger(value) || value < 0 || value > 65535) throw new Error('Native uint16 required'); this.view.setUint16(offset, value, true); this.knownMask.fill(0xff, offset, offset + 2); }
  u32(offset: number, value: number): void { this.view.setUint32(offset, word(value), true); this.knownMask.fill(0xff, offset, offset + 4); }
  f32(offset: number, value: number): void { if (!Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new Error('Finite original float32 required'); this.view.setFloat32(offset, value, true); this.knownMask.fill(0xff, offset, offset + 4); }
  guard(offset: number, length: number): void { if (!this.knownMask.subarray(offset, offset + length).every(v => v === 0xff)) throw new Error('Original collision field bits remain unknown at+' + offset.toString(16)); }
  byte(offset: number): number { this.guard(offset, 1); return this.view.getUint8(offset); }
  short(offset: number): number { this.guard(offset, 2); return this.view.getUint16(offset, true); }
  dword(offset: number): number { this.guard(offset, 4); return this.view.getUint32(offset, true); }
  float(offset: number): number { this.guard(offset, 4); return this.view.getFloat32(offset, true); }
  rawFloats(offset: number, raw: Uint8Array): void {
    if (raw.byteLength % 4 !== 0) throw new Error('Whole original float32 payload required');
    // Native stream reads copy bytes; retain all IEEE payload bits without
    // performing arithmetic or inventing a finite-value validation callback.
    this.put(offset, raw);
  }
}

/** Actual embedded 8-byte bTPropertyContainer capability; value+4 aliases the
 * physical receiver storage. Constructor and virtual Create read the same
 * live enum-default store independently. */
export class NativeCollisionEnumeration {
  constructor(readonly typeName: string, readonly offset: number, readonly storage: CollisionBytes,
    private readonly host: NativeCollisionReadingHost) {
    storage.u32(offset, enumVtables[typeName]!); this.create();
  }
  create(): void {
    const defaults = this.host.enumDefaults;
    const descriptor = defaults ? Object.getOwnPropertyDescriptor(defaults, this.typeName) : undefined;
    if (descriptor && !('value' in descriptor)) throw new Error('Actual enum globals require ordinary mutable data storage');
    const source = descriptor?.value as NativeMaskedWord | undefined;
    if (source && ['value', 'knownMask'].some(name => !Object.getOwnPropertyDescriptor(source, name)?.hasOwnProperty('value'))) throw new Error('Actual enum DWORD/mask data storage required');
    const value = source ? { value: word(source.value), knownMask: word(source.knownMask) } : { value: 0, knownMask: 0 };
    const raw = new Uint8Array(4), mask = new Uint8Array(4);
    new DataView(raw.buffer).setUint32(0, value.value, true); new DataView(mask.buffer).setUint32(0, value.knownMask, true);
    this.storage.put(this.offset + 4, raw, mask);
  }
  get value(): number { return this.storage.dword(this.offset + 4); }
  set value(value: number) { this.storage.u32(this.offset + 4, value); }
  read(input: NativeEntityByteInput): void { input.u16(); this.storage.put(this.offset + 4, input.take(4)); }
}

abstract class OriginalCollisionObject {
  readonly numeric: CollisionBytes;
  readonly values = {} as Record<string, unknown> & { IgnoredByTraceRay: boolean; DisableCollision: boolean };
  readonly containers = new Map<string, NativeCollisionEnumeration>();
  constructor(readonly reflection: NativeReflectionWrapper, readonly host: NativeCollisionReadingHost,
    readonly fields: readonly CollisionField[], length: number) { this.numeric = new CollisionBytes(length); }
  get numericBytes(): Uint8Array { return this.numeric.bytes; }
  get knownMask(): Uint8Array { return this.numeric.knownMask; }
  protected fieldStorage(): void {
    for (const field of this.fields) {
      const type = enumType(field), offset = field.nativeOffset;
      if (type !== null) {
        const container = new NativeCollisionEnumeration(type, offset, this.numeric, this.host);
        this.containers.set(field.name, container); this.values[field.name] = container;
        this.reflection.controller.write('enum constructor copies masked live default ' + type + '@' + enumGlobals[type]!.toString(16), this.sourceConstructor());
      } else Object.defineProperty(this.values, field.name, { enumerable: true,
        get: () => field.cppType === 'bool' ? this.numeric.byte(offset) !== 0 : field.cppType === 'float' ? this.numeric.float(offset) : this.numeric.short(offset),
        set: value => {
          if (field.cppType === 'bool') { if (typeof value !== 'boolean') throw new Error('Canonical bool required'); this.numeric.u8(offset, Number(value)); }
          else if (field.cppType === 'float') this.numeric.f32(offset, value);
          else if (field.cppType === 'unsigned_short') this.numeric.u16(offset, value);
          else throw new Error('Unrecovered collision property datatype');
        } });
    }
  }
  private active = false;
  private nestedAttempt = false;
  protected guard(): void { if (this.nestedAttempt) throw new Error('Host attempted reentrant collision mutation'); }
  protected mutate<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.nestedAttempt = true; return this.reflection.controller.value(() => { throw new Error('Reentrant collision mutation unsupported'); }); }
    this.active = true; this.nestedAttempt = false;
    try { return this.reflection.controller.value(() => { this.guard(); const value = body(); this.guard(); return value; }); }
    finally { this.active = false; }
  }
  protected call<T>(operation: string, source: string, callback: () => NativeValue<T> | undefined): T {
    this.guard(); this.exact(); const value = this.reflection.controller.effect(operation, source, callback);
    this.guard(); this.exact(); return value;
  }
  notify(phase: 'enter' | 'exit', property: string, propagated: boolean): void {
    fact(this.mutate(() => this.notifyCore(phase, property, propagated)), 'Actual collision property notification');
  }
  protected abstract sourceConstructor(): string;
  abstract exact(): void;
  protected abstract notifyCore(phase: 'enter' | 'exit', property: string, propagated: boolean): void;
  assignDefault(field: NativeReflectionField): NativeValue<void> {
    return this.mutate(() => {
      this.exact(); const concrete = this.fields.find(value => value === field || value.name === field.name);
      if (!concrete) throw new Error('Actual registered collision descriptor required');
      const container = this.containers.get(concrete.name);
      if (container) container.create();
      else if (concrete.cppType === 'bool') this.numeric.u8(concrete.nativeOffset, 0);
      else if (concrete.cppType === 'float') this.numeric.f32(concrete.nativeOffset, 0);
      else if (concrete.cppType === 'unsigned_short') this.numeric.u16(concrete.nativeOffset, 0);
      else throw new Error('Original default initializer unresolved');
      this.reflection.controller.write('descriptor default ' + concrete.name, concrete.defaultInitializer!);
    });
  }
  readField(field: NativeReflectionField, input: NativeEntityByteInput): NativeValue<void> {
    return this.mutate(() => {
      const concrete = this.fields.find(value => value.name === field.name); if (!concrete) throw new Error('Actual collision descriptor required');
      input.u16(); input.u32(); this.notifyCore('enter', concrete.name, true);
      this.exact(); const container = this.containers.get(concrete.name);
      if (container) container.read(input);
      else if (concrete.cppType === 'bool') this.numeric.u8(concrete.nativeOffset, Number(input.bool()));
      else if (concrete.cppType === 'float') this.numeric.rawFloats(concrete.nativeOffset, input.take(4));
      else if (concrete.cppType === 'unsigned_short') this.numeric.u16(concrete.nativeOffset, input.u16());
      else throw new Error('Original collision property reader unresolved');
      this.reflection.controller.write('serialized field payload ' + concrete.name, concrete.reader); this.notifyCore('exit', concrete.name, true);
    });
  }
}

/** Actual bCCapsule payload at shape+74. Its height/radius are not initialized
 * by the native no-arg ctor; matrix and position ctor writes are explicit. */
export class OriginalCollisionCapsule {
  readonly numeric = new CollisionBytes(0x38);
  readonly transform = new Float32Array(this.numeric.bytes.buffer, 8, 9);
  readonly position = new Float32Array(this.numeric.bytes.buffer, 0x2c, 3);
  constructor() {
    for (const offset of [0xc, 0x10, 0x14, 0x1c, 0x20, 0x24, 0x2c, 0x30, 0x34]) this.numeric.f32(offset, 0);
    for (const offset of [8, 0x18, 0x28]) this.numeric.f32(offset, 1);
  }
  get height(): number { return this.numeric.float(0); }
  get radius(): number { return this.numeric.float(4); }
  read(input: NativeEntityByteInput): void { this.numeric.rawFloats(0, input.take(0x38)); }
}

export class OriginalCollisionShape extends OriginalCollisionObject implements NativeReflectionNativeObject<Record<string, unknown>> {
  readonly className = 'eCCollisionShape';
  readonly identity: string;
  private propertyObject: NativePropertyObjectReference | null = null;
  capsule: OriginalCollisionCapsule | null = null;
  readonly bounds = new Float32Array(this.numericBytes.buffer, 0x48, 6);
  readonly center = new Float32Array(this.numericBytes.buffer, 0x68, 3);
  constructor(wrapper: NativeReflectionWrapper, host: NativeCollisionReadingHost) {
    super(wrapper, host, rules.fields.eCCollisionShape!, 0x78); this.identity = wrapper.identity + ':native';
  }
  get referenceWord(): number { return this.numeric.dword(8); }
  set referenceWord(value: number) { this.numeric.u32(8, value); }
  get wrapper(): NativePropertyObjectReference | null { return this.propertyObject; }
  set wrapper(value: NativePropertyObjectReference | null) {
    this.propertyObject = value;
    if (value === null) this.numeric.u32(4, 0); else this.knownMask.fill(0, 4, 8);
  }
  protected sourceConstructor(): string { return 'Engine:3035acd0'; }
  initializeMembers(): void {
    if (this.containers.size !== 0 || this.reflection.native !== null) throw new Error('Fresh original collision constructor receiver required');
    this.numeric.u32(0, 0x308212e4); this.numeric.u32(4, 0); this.referenceWord = 1;
    this.fieldStorage(); this.numeric.u32(0x74, 0); this.numeric.u8(0x44, 0); this.numeric.u16(0x46, 0);
    this.numeric.u32(0x60, 0); this.numeric.u32(0x64, 0);
    for (let i = 0; i < 3; i++) { this.numeric.f32(0x48 + i * 4, 3.4028234663852886e38); this.numeric.f32(0x54 + i * 4, -3.4028234663852886e38); this.numeric.f32(0x68 + i * 4, 0); }
    this.numeric.u8(0x2d, 0); this.reflection.controller.write('actual RefBase/member constructors and Shape.Invalidate known writes', this.sourceConstructor());
  }
  exact(): void { if (this.reflection.native !== this || this.wrapper !== this.reflection || this.reflection.deleted) throw new Error('Actual retained non-PS collision shape required'); }
  protected notifyCore(phase: 'enter' | 'exit', property: string, propagated: boolean): void {
    this.exact(); this.reflection.controller.write('RefBase Notify ' + phase + '/inherited true ' + property + '/' + propagated,
      phase === 'enter' ? 'SharedBase:10001186' : 'SharedBase:10005a65');
  }
  postInitialize(): NativeValue<void> {
    return this.mutate(() => {
      this.exact(); this.containers.get('ShapeType')!.value = 0; this.containers.get('Group')!.value = 1;
      for (const offset of [0x2c, 0x38]) this.numeric.u8(offset, 0);
      this.numeric.u16(0x3a, 0);
      for (const offset of [0x2f, 0x30]) this.numeric.u8(offset, 0);
      this.numeric.f32(0x34, -1);
      this.containers.get('Material')!.value = 0; this.containers.get('ShapeAABBAdaptMode')!.value = 0;
      this.numeric.u8(0x2d, 0); this.numeric.u8(0x2e, 0); this.numeric.f32(0x40, 1);
      this.reflection.controller.write('Shape.PostInitialize original constant writes/enum CopyFrom', 'Engine:30359c10');
    });
  }
  readNative(input: NativeEntityByteInput): NativeValue<void> {
    return this.mutate(() => {
      this.exact(); const version = input.u16(); const type = this.containers.get('ShapeType')!.value;
      this.numeric.u16(0x3a, version); this.reflection.controller.write('Shape native version into+3a, captured type', 'Engine:3035a1a0');
      if (version < 74) throw new Error('Older collision shape payload/migration branch unresolved');
      if (type !== 4) throw new Error('Selected original Hero capsule branch required; other native shape payloads unresolved');
      this.capsule = new OriginalCollisionCapsule(); this.knownMask.fill(0, 0x74, 0x78);
      this.reflection.controller.write('actual56-byte capsule ctor and shape+74 pointer capability', 'SharedBase:10005a9c');
      this.capsule.read(input); this.reflection.controller.write('whole56-byte capsule payload', 'SharedBase:10007bad');
      input.u16(); this.reflection.controller.write('inherited RefBase.Read version only', 'SharedBase:100073ce');
      this.numeric.rawFloats(0x48, input.take(24)); this.reflection.controller.write('actual embedded Box raw24 read', 'SharedBase:10003111');
      this.numeric.rawFloats(0x68, input.take(12)); this.reflection.controller.write('actual embedded center Vector raw12 read', 'SharedBase:10004cc8');
    });
  }
  get group(): number { return this.containers.get('Group')!.value; }
  get rawByte2f(): number { return this.numeric.byte(0x2f); }
  get rawByte30(): number { return this.numeric.byte(0x30); }
  addReference(): void {
    const wrapper = this.wrapper;
    if (wrapper !== this.reflection || this.reflection.native !== this) throw new Error('Destroyed/replaced source shape wrapper');
    fact(this.reflection.addReference(), 'Shape virtual AddReference delegates actual attached wrapper');
  }
}

export class OriginalCollisionShapeArray {
  allocation: Array<OriginalCollisionShape | null> | null = null;
  constructor(private readonly owner: OriginalCollisionProperties, readonly offset: number) {}
  get count(): number { return this.owner.numeric.dword(this.offset + 4); }
  get capacity(): number { return this.owner.numeric.dword(this.offset + 8); }
  at(index: number): OriginalCollisionShape | null {
    word(index); if (index >= this.count) return null;
    if (!this.allocation || index >= this.allocation.length) throw new Error('Actual retained source shape-array backing required'); return this.allocation[index]!;
  }
  append(shape: OriginalCollisionShape): void {
    const count = this.count, capacity = this.capacity, next = (count + 1) >>> 0;
    if (next === 0 || next > 65536) throw new Error('Selected shape-array count profile exceeded');
    const controller = this.owner.reflection.controller;
    if (next > capacity) {
      const extra = Math.min(0x400, Math.max(8, capacity >> 3)), size = next + extra;
      const backing = Array<OriginalCollisionShape | null>(size).fill(null);
      if (this.allocation) for (let i = 0; i < count; i++) backing[i] = this.allocation[i]!;
      this.allocation = backing; this.owner.knownMask.fill(0, this.offset, this.offset + 4);
      controller.write('successful moving Realloc/pointer and newly initialized NULL array slots', 'Engine:3033c380');
      this.owner.numeric.u32(this.offset + 8, size); controller.write('shape array capacity', 'Engine:3033c380');
    } else for (let i = count; i < capacity; i++) this.allocation![i] = null;
    this.owner.numeric.u32(this.offset + 4, next); controller.write('shape array count before incoming AddReference', 'Engine:3033d2a0');
    shape.addReference();
    const current = this.allocation; if (!current || current[count] !== null) throw new Error('Reentrant overwritten shape-array slot release unresolved');
    current[count] = shape; controller.write('shape array exact pointer assignment after incoming reference', 'Engine:3033f140');
  }
}

export class OriginalCollisionProperties extends OriginalCollisionObject implements NativeMovementCollision, NativeEntityCollisionShape {
  base!: NativeLivePropertySet<Record<string, unknown>>;
  owner: NativeLiveEntity | null = null;
  readonly shapes = new OriginalCollisionShapeArray(this, 0x28);
  readonly proprietaryShapes = new OriginalCollisionShapeArray(this, 0x34);
  readonly readShapes: OriginalCollisionShape[] = [];
  constructor(wrapper: NativeReflectionWrapper, host: NativeCollisionReadingHost) { super(wrapper, host, rules.fields.eCCollisionShape_PS!, 0x4c); }
  get identity(): object { return this.base; }
  notifyEnter(property: 'IgnoredByTraceRay' | 'DisableCollision', propagated: false): NativeValue<void> {
    return this.mutate(() => this.notifyCore('enter', property, propagated));
  }
  notifyExit(property: 'IgnoredByTraceRay' | 'DisableCollision', propagated: false): NativeValue<void> {
    return this.mutate(() => this.notifyCore('exit', property, propagated));
  }
  clearTouchingShapes(): NativeValue<void> {
    return this.mutate(() => {
      this.exact(); this.numeric.u8(0x40, 0); this.reflection.controller.write('ClearTouchingShapes rawbyte40 clear', 'Engine:30337be0');
      const array = this.proprietaryShapes;
      for (let index = 0; index < array.count; index++) {
        const shape = array.at(index);
        if (shape) {
          this.call('ClearTouchingShapes actual shape ReleaseReference', 'Engine:3033d2a0', () => {
            if (shape.wrapper === null) return missing('Original terminal/nonwrapper native shape release/destruction unresolved');
            return shape.wrapper.releaseReference();
          });
          if (!array.allocation || index >= array.allocation.length) throw new Error('Actual proprietary backing disappeared after release');
          array.allocation[index] = null; this.reflection.controller.write('reread proprietary shape-array slot cleared after release', 'Engine:3033d2a0');
        }
      }
      this.numeric.u32(0x38, 0); this.reflection.controller.write('proprietary shape-array count zero after releases', 'Engine:3033d2a0');
    });
  }

  protected sourceConstructor(): string { return 'Engine:30337c50'; }
  initializeMembers(): void {
    if (this.containers.size !== 0 || this.reflection.native !== null) throw new Error('Fresh original collision constructor receiver required');
    this.numeric.u32(0, 0x30860f74); this.fieldStorage();
    for (const offset of [0x28, 0x2c, 0x30, 0x34, 0x38, 0x3c, 0x44, 0x48]) this.numeric.u32(offset, 0);
    this.numeric.u8(0x40, 0); this.reflection.controller.write('CollisionPS constructors and fresh NULL-array Invalidate', this.sourceConstructor());
  }
  exact(): void { if (this.reflection.native !== this.base || this.base.values !== this.values || this.base.wrapper !== this.reflection || this.reflection.deleted) throw new Error('Actual retained CollisionShape PS required'); }
  private ownerView(owner: NativeLiveEntity): NativeCollisionOwner {
    this.guard(); this.exact();
    const result = fact(this.host.ownerView?.(owner) ?? missing<NativeCollisionOwner>('Actual physical collision owner services unresolved'), 'Collision owner view');
    this.guard(); this.exact(); fact(this.reflection.controller.value(() => undefined), 'owner-view callback completion');
    if (result.entity !== owner) throw new Error('Captured physical entity pointer required'); return result;
  }
  protected notifyCore(phase: 'enter' | 'exit', property: string, propagated: boolean): void {
    this.exact(); const controller = this.reflection.controller;
    const owner = this.base.owner.read(); if (owner) { owner.propertyOwner.modified(); controller.write('outer NotifyEx owner.Modified read', phase === 'enter' ? 'Engine:3003b5bb' : 'Engine:3001a091'); }
    if (phase === 'exit' && propagated) { controller.write('Collision custom OnNotifyExit propagated immediate true', 'Engine:303363c0'); return; }
    if (phase === 'exit') {
      const captured = this.base.owner.read(); if (!captured) return;
      const compare = (literal: 'DisableResponse' | 'Group' | 'Range', beforeDestroy?: (equal: boolean) => boolean): boolean => {
        const temporary = this.call('local collision CString constructor(' + property + ')', 'Engine:303363c0',
          () => this.host.constructPropertyName?.(property));
        if (!temporary.identity || temporary.text !== property) throw new Error('Actual captured collision property-name CString required');
        const result = this.call('captured CString.Compare(' + literal + ')', 'Engine:303363c0', () => temporary.compare(literal));
        if (!Number.isInteger(result) || result < -0x80000000 || result > 0x7fffffff) throw new Error('Native signed32 CString comparison required');
        const equal = beforeDestroy ? beforeDestroy(result === 0) : result === 0;
        this.call('captured temporary collision CString destructor', 'Engine:303363c0', () => this.host.destroyPropertyName?.(temporary));
        return equal;
      };
      if (compare('DisableResponse')) {
        const enabled = this.numeric.byte(0x25) === 0;
        const current = this.base.owner.read(); if (!current) throw new Error('Reread collision response entity is NULL');
        const buffer = this.call('GetBuffer captured owner', 'Engine:303363c0', () => this.ownerView(current).responseBuffer());
        this.call('EnableCollisionResponse captured buffer', 'Engine:303363c0', () => buffer.enableCollisionResponse(enabled));
      } else if (compare('Group', equal => {
        const owner = this.base.owner.read();
        return equal && owner !== null && this.call('Group GetPhysicObject before CString destructor', 'Engine:303363c0', () => this.ownerView(owner).getPhysicObject()) !== null;
      })) {
        const again = this.base.owner.read(); if (!again) throw new Error('Group owner reread NULL');
        const physic = this.call('Group GetPhysicObject after CString destructor', 'Engine:303363c0', () => this.ownerView(again).getPhysicObject());
        if (!physic) throw new Error('Group physics reread NULL');
        this.call('OnActorChanged actual physics object', 'Engine:303363c0', () => physic.onActorChanged());
      } else if (compare('Range', equal => {
        const owner = this.base.owner.read();
        return equal && owner !== null && this.call('Range GetPhysicObject before CString destructor', 'Engine:303363c0', () => this.ownerView(owner).getPhysicObject()) === null;
      })) {
        let create = false;
        if (this.containers.get('Range')!.value === 2) {
          const cachedOwner = this.base.owner.read(); if (!cachedOwner) throw new Error('Range cached owner reread NULL');
          create = this.call('Range IsCachedIn', 'Engine:303363c0', () => this.ownerView(cachedOwner).isCachedIn());
        }
        if (!create) create = this.containers.get('Range')!.value === 0;
        if (create) {
          const again = this.base.owner.read(); if (!again) throw new Error('Range owner reread NULL');
          this.call('Range CreatePhysicObject', 'Engine:303363c0', () => this.ownerView(again).createPhysicObject());
        }
      }
    }
    const inheritedOwner = this.base.owner.read();
    if (inheritedOwner) { inheritedOwner.propertyOwner.modified(); controller.write('inherited OnNotify owner.Modified read', phase === 'enter' ? 'Engine:3002ad10' : 'Engine:30037ca4'); }
    controller.write('SharedBase inherited OnNotify true', phase === 'enter' ? 'Engine:3002ad10' : 'Engine:30037ca4');
  }
  postInitialize(): NativeValue<void> {
    return this.mutate(() => {
      this.exact(); this.reflection.controller.write('inherited CollisionBase/RefBase PostInitialize true', 'Engine:303412c0');
      this.containers.get('Group')!.value = 1;
      for (const offset of [0x24, 0x25, 0x26]) this.numeric.u8(offset, 0);
      this.containers.get('Range')!.value = 1; this.reflection.controller.write('CollisionPS PostInitialize Group1/bools0/Range1', 'Engine:303365a0');
    });
  }
  readNative(input: NativeEntityByteInput): NativeValue<void> {
    return this.mutate(() => {
      this.exact(); const version = input.u16(), count = input.u32();
      this.reflection.controller.write('CollisionPS native version/count consumed', 'Engine:30338710');
      if (count > 65536) throw new Error('Selected bounded shape-count profile exceeded');
      for (let index = 0; index < count; index++) {
        const accessor = this.call('real nested shape accessor', 'Engine:30338710', () => this.reflection.controller.readAccessor(input));
        const object = fact(accessor.nativeObject(), 'nested GetNativeObject');
        if (!(object instanceof OriginalCollisionShape)) throw new Error('Actual native eCCollisionShape object required');
        object.exact(); this.readShapes.push(object);
        const ignored = (object.numeric.short(0x3a) < 30 && object.containers.get('ShapeType')!.value !== 1) || object.numeric.byte(0x38) === 1;
        const group = this.containers.get('Group')!.value; object.numeric.u8(0x44, 0);
        this.reflection.controller.write('captured nested shape+44 clear before append decision', 'Engine:30338710');
        if (!ignored && group !== 12) this.shapes.append(object);
        this.call('source nested accessor destruction', 'Engine:30338710', () => accessor.destroy());
      }
      if (version < 63) throw new Error('CollisionPS legacy extra accessor/obsolete bool tail unresolved');
    });
  }
  postRead(): NativeValue<void> {
    return this.mutate(() => {
      this.exact();
      if (this.containers.get('Range')!.value === 0) {
        const owner = this.base.owner.read(); if (!owner) throw new Error('Actual PostRead owner required for CreatePhysicObject');
        this.call('PostRead range0 CreatePhysicObject', 'Engine:30336cc0', () => this.ownerView(owner).createPhysicObject());
      }
      const itemOwner = this.base.owner.read(); if (!itemOwner) throw new Error('Actual PostRead owner required for HasPS48');
      const item = this.call('PostRead HasPropertySet48', 'Engine:30336cc0', () => this.ownerView(itemOwner).hasPropertySet(48));
      const rbOwner = this.base.owner.read();
      if (!rbOwner || !this.call('PostRead virtual GetPS13', 'Engine:30336cc0', () => this.ownerView(rbOwner).propertySet(13))) return;
      let triangle = false;
      for (let index = this.shapes.count - 1; index >= 0; index--) {
        let shape = this.shapes.at(index); if (!shape) throw new Error('Original PostRead shape pointer NULL');
        if (shape.containers.get('ShapeType')!.value === 1) triangle = true;
        if (item) {
          if (this.containers.get('Group')!.value === 2) { this.containers.get('Group')!.value = 1; this.reflection.controller.write('PostRead item PS Group CopyFrom1', 'Engine:30336cc0'); }
          if (shape.group === 1) {
            const owner = this.base.owner.read(); if (!owner) throw new Error('Item warning owner NULL');
            const name = this.call('PostRead item GetName', 'Engine:30336cc0', () => this.ownerView(owner).name());
            this.call('original item static collision warning', 'Engine:30336cc0', () => this.host.warning?.('item-static-shape', name));
            shape = this.shapes.at(index); if (!shape) throw new Error('Reread item shape NULL');
            shape.notify('enter', 'Group', false); shape.containers.get('Group')!.value = 2; this.reflection.controller.write('PostRead captured item shape Group CopyFrom2', 'Engine:30336cc0'); shape.notify('exit', 'Group', false);
          }
          shape = this.shapes.at(index); if (!shape) throw new Error('Reread material shape NULL');
          if (shape.containers.get('Material')!.value === 0) { shape.notify('enter', 'Material', false); shape.containers.get('Material')!.value = 1; this.reflection.controller.write('PostRead captured shape Material CopyFrom1', 'Engine:30336cc0'); shape.notify('exit', 'Material', false); }
          shape = this.shapes.at(index); if (!shape) throw new Error('Reread AABB shape NULL');
          shape.notify('enter', 'AdaptToAABB', false); shape.numeric.u8(0x3c, 0); this.reflection.controller.write('PostRead captured shape rawbyte3c clear', 'Engine:30336cc0'); shape.notify('exit', 'AdaptToAABB', false);
        }
      }
      if (triangle) {
        const owner = this.base.owner.read(); if (!owner) throw new Error('Triangle warning owner NULL');
        const name = this.call('PostRead triangle GetName', 'Engine:30336cc0', () => this.ownerView(owner).name());
        this.call('original movable triangle mesh warning', 'Engine:30336cc0', () => this.host.warning?.('movable-triangle-mesh', name));
      }
    });
  }
}

export interface NativeCollisionFactories {
  readonly collisionFactory: NativeReflectionFactory;
  readonly shapeFactory: NativeReflectionFactory;
  collision(wrapper: NativeReflectionWrapper): NativeValue<OriginalCollisionProperties>;
  shape(wrapper: NativeReflectionWrapper): NativeValue<OriginalCollisionShape>;
}
export function createNativeCollisionFactories(host: NativeCollisionReadingHost): NativeCollisionFactories {
  const activeClasses = new Set<string>();
  const run = <T>(controller: NativeReflectionWrapper['controller'], className: string, body: () => T): NativeValue<T> => {
    if (activeClasses.has(className)) return controller.value(() => { throw new Error('Reentrant collision factory/read unsupported for ' + className); });
    activeClasses.add(className);
    try { return controller.value(body); } finally { activeClasses.delete(className); }
  };
  const collisions = new WeakMap<NativeReflectionWrapper, OriginalCollisionProperties>();
  const shapes = new WeakMap<NativeReflectionWrapper, OriginalCollisionShape>();
  const root = (className: string, baseClassName: string | null): NativeReflectionRoot => Object.freeze({ className, baseClassName,
    fields: Object.freeze(rules.fields[className]!.map(field => Object.freeze({ ...field }))) });
  const collision = (wrapper: NativeReflectionWrapper): OriginalCollisionProperties => { const value = collisions.get(wrapper); if (!value) throw new Error('Actual collision allocation required'); return value; };
  const shape = (wrapper: NativeReflectionWrapper): OriginalCollisionShape => { const value = shapes.get(wrapper); if (!value) throw new Error('Actual shape allocation required'); return value; };
  const collisionFactory: NativeReflectionFactory = {
    root: root('eCCollisionShape_PS', 'eCCollisionShapeBase_PS'),
    getVersion: wrapper => wrapper.controller.value(() => { collision(wrapper).exact(); return 63; }),
    cloneRoot: controller => run(controller, 'eCCollisionShape_PS', () => {
      const wrapper = controller.allocateWrapper(collisionFactory, 'Engine:3033fd00');
      const value = new OriginalCollisionProperties(wrapper, host); collisions.set(wrapper, value);
      const base = new NativeLivePropertySet(wrapper.identity + ':native', 'eCCollisionShape_PS', 14, value.values,
        { read: () => value.owner, write: owner => { value.owner = owner; if (owner === null) value.numeric.u32(0xc, 0); else value.knownMask.fill(0, 0xc, 0x10); } }, null,
        { added: candidate => controller.value(() => { value.exact(); if (candidate !== value.base) throw new Error('Actual added receiver required'); }),
          removed: candidate => controller.value(() => { value.exact(); if (candidate !== value.base) throw new Error('Actual removed receiver required'); }),
          postRead: candidate => candidate === value.base ? value.postRead() : missing('Actual CollisionPS PostRead receiver required') }, () => known(false));
      value.numeric.u32(4, 0); value.numeric.u32(8, 1); value.numeric.u32(0xc, 0);
      value.numeric.view.setUint8(0x10, 1); value.knownMask[0x10] = 0x0f;
      let attached: NativePropertyObjectReference | null = null;
      Object.defineProperty(base, 'referenceWord', { get: () => value.numeric.dword(8), set: word => value.numeric.u32(8, word) });
      Object.defineProperty(base, 'wrapper', { get: () => attached, set: object => { attached = object;
        if (object === null) value.numeric.u32(4, 0); else value.knownMask.fill(0, 4, 8); } });
      Object.defineProperties(base.baseFlags, {
        value: { get: () => value.numeric.view.getUint8(0x10), set: bits => { value.numeric.view.setUint8(0x10, word(bits) & 255); } },
        knownMask: { get: () => value.knownMask[0x10], set: mask => { value.knownMask[0x10] = word(mask) & 255; } },
      });
      value.base = base; controller.retainNative(wrapper, base); controller.write('actual CollisionBase/EntityPS constructor', 'Engine:30341360');
      value.initializeMembers(); base.createBase(); controller.write('CollisionPS.Create inherited Create, literal1', 'Engine:30336370');
      controller.setAllocationPhase(wrapper, 'created'); controller.attachConstructedNative(wrapper, base, 'Engine:3033b6d0', 'Engine:3033f6d0');
      controller.initializeProperties(wrapper, field => value.assignDefault(field), () => value.postInitialize(), 'Engine:303365a0'); return wrapper;
    }),
    read: (wrapper, input) => run(wrapper.controller, 'eCCollisionShape_PS', () => wrapper.controller.readWrapperProperties(wrapper, input,
      { wrapperSource: 'Engine:3033c790', dataSource: 'Engine:303404e0', readField: (field, stream) => collision(wrapper).readField(field, stream),
        readNative: stream => collision(wrapper).readNative(stream) })),
  };
  const shapeFactory: NativeReflectionFactory = {
    nativeCategory: 'non-property-set', root: root('eCCollisionShape', null),
    getVersion: wrapper => wrapper.controller.value(() => { shape(wrapper).exact(); return 74; }),
    cloneRoot: controller => run(controller, 'eCCollisionShape', () => {
      const wrapper = controller.allocateWrapper(shapeFactory, 'Engine:30362770'), value = new OriginalCollisionShape(wrapper, host);
      shapes.set(wrapper, value); value.initializeMembers(); controller.retainObject(wrapper, value);
      value.referenceWord = (value.referenceWord | 0x80000000) >>> 0; controller.write('Shape.Create inherited RefBase validity bit; return1', 'Engine:30359a50');
      controller.setAllocationPhase(wrapper, 'created'); controller.attachConstructedNative(wrapper, value, 'Engine:3035b900', 'Engine:3035ddd0');
      controller.initializeProperties(wrapper, field => value.assignDefault(field), () => value.postInitialize(), 'Engine:30359c10'); return wrapper;
    }),
    read: (wrapper, input) => run(wrapper.controller, 'eCCollisionShape', () => wrapper.controller.readWrapperProperties(wrapper, input,
      { wrapperSource: 'Engine:3035cdf0', dataSource: 'Engine:303639b0', readField: (field, stream) => shape(wrapper).readField(field, stream),
        readNative: stream => shape(wrapper).readNative(stream) })),
  };
  return { collisionFactory, shapeFactory,
    collision: wrapper => collisions.has(wrapper) ? known(collision(wrapper)) : missing('Actual retained collision capability missing'),
    shape: wrapper => shapes.has(wrapper) ? known(shape(wrapper)) : missing('Actual retained shape capability missing') };
}
