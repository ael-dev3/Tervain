/** Original Illuminated construction/read and its single physical light store.
 * Successful reflective reading is detached, not scene or render residency. */
import rulesText from '../../assets/gothic3/illuminated-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyObjectReference } from './entity-lifecycle';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionWrapper } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';

interface IlluminatedEnumProfile { offset: number; vtable: string; global: string; dispatch: Record<string, string> }
interface IlluminatedProfile {
  heroIndex: number; type: number; version: number; nativeBytes: number; nativeVtable: string; wrapperVtable: string;
  constructor: string; create: string; invalidate: string; postInitialize: string; nativeRead: string;
  clone: string; initialize: string; attach: string; defaults: string; wrapperRead: string; dataRead: string;
  fields: NativeReflectionField[]; enums: Record<'StaticIlluminated' | 'DirectionalShadowType', IlluminatedEnumProfile>; dispatch: Record<string, string>;
}
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; profile: IlluminatedProfile };
const profile = rules.profile;
if (rules.schema !== 'gothic3-illuminated-reading-rules-v1' || profile.type !== 74 || profile.version !== 8 || profile.nativeBytes !== 188 ||
    profile.nativeVtable !== '30844dc4' || profile.wrapperVtable !== '30844f5c' ||
    profile.fields.map(field => field.name).join(',') !== 'EnableDynamicLighting,EnableAmbient,StaticIlluminated,CastShadows,ReciveShadows,DirectionalShadowType,ReciveTreeShadows,CastStaticShadows,ReciveStaticShadows' ||
    profile.fields.map(field => field.nativeOffset).join(',') !== '20,21,24,32,33,36,44,45,46' ||
    profile.enums.StaticIlluminated.global !== '30ae1c48' || profile.enums.StaticIlluminated.vtable !== '30844b84' ||
    profile.enums.DirectionalShadowType.global !== '30ae1c4c' || profile.enums.DirectionalShadowType.vtable !== '30844c5c' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original Illuminated evidence differs');
const permission = Symbol('actual guarded Illuminated constructor/default/read');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(result: NativeValue<T>, name: string): T { if (!result.known) throw new Error(name + ': ' + result.reason); return result.value; }
function word(value: number): number { if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual Illuminated DWORD required'); return value; }
function dispatch(offset: number): string { const value = profile.dispatch[String(offset)]; if (!value) throw new Error('Actual Illuminated dispatch missing'); return value; }

/** The actual owner's stable embedded item at entity+14c. The native setter
 * writes its illuminationPS+34 slot, with no registration lookup by GUID. */
export interface NativeIlluminatedFrustumItem {
  readonly owner: NativeLiveEntity;
  illuminationPS: NativeLivePropertySet<object> | null;
}
export interface NativeIlluminationAdmin {
  getEffectedDynamicLights(properties: OriginalIlluminatedProperties): NativeValue<void>;
}
export interface NativeIlluminatedReadingHost {
  /** Current mutable enum globals, not the PE's cold zero-fill. */
  enumDefault?(address: '30ae1c48' | '30ae1c4c'): NativeValue<{ value: number; knownMask: number }>;
  frustumItem?(capturedOwner: NativeLiveEntity): NativeValue<NativeIlluminatedFrustumItem>;
  illuminationAdmin?(): NativeValue<NativeIlluminationAdmin>;
}
/** Opaque *actual* native capabilities. NonNULL lifetimes are deliberately
 * required at their first real light/shadow/render call, never guessed empty. */
export interface NativeIlluminatedPointer { readonly identity: string }

export class OriginalIlluminatedProperties {
  readonly bytes = new Uint8Array(188);
  readonly knownMask = new Uint8Array(188);
  private readonly view = new DataView(this.bytes.buffer);
  readonly shaderLightBytes = this.bytes.subarray(0x3c, 0xac);
  readonly shaderLightMask = this.knownMask.subarray(0x3c, 0xac);
  readonly values: Record<string, unknown> = {};
  readonly base: NativeLivePropertySet<Record<string, unknown>>;
  private owner: NativeLiveEntity | null = null;
  private propertyObject: NativePropertyObjectReference | null = null;
  private readonly pointers = new Map<number, NativeIlluminatedPointer | null>();
  private constructed = false;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalIlluminatedReader) {
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', 'eCIlluminated_PS', 74, this.values,
      { read: () => { this.assertPointer(0xc, this.owner); return this.owner; }, write: value => { reader.guard(); this.exact(false); this.owner = value; this.pointerBits(0xc, value); } }, null,
      { added: value => this.lifecycle(value, 'added'), removed: value => this.lifecycle(value, 'removed'), postRead: value => this.lifecycle(value, 'postRead') },
      () => reader.controller.value(() => { reader.guard(); this.exact(); return false; }));
    Object.defineProperty(this.base, 'referenceWord', { get: () => this.unsigned(8), set: value => this.putWord(8, value) });
    Object.defineProperty(this.base, 'wrapper', { get: () => { this.assertPointer(4, this.propertyObject); return this.propertyObject; }, set: value => {
      reader.guard(); this.exact(false); if (value !== null && value !== this.wrapper) throw new Error('Same retained Illuminated wrapper pointer required'); this.propertyObject = value; this.pointerBits(4, value);
    } });
    Object.defineProperties(this.base.baseFlags, {
      value: { get: () => this.view.getUint8(0x10), set: value => { reader.guard(); this.view.setUint8(0x10, word(value) & 255); } },
      knownMask: { get: () => this.knownMask[0x10], set: value => { reader.guard(); this.knownMask[0x10] = word(value) & 255; } },
    });
    for (const field of profile.fields) Object.defineProperty(this.values, field.name, { enumerable: true,
      get: () => { const offset = field.nativeOffset + (field.typeName === 'bool' ? 0 : 4); this.require(offset, field.typeName === 'bool' ? 1 : 4);
        return field.typeName === 'bool' ? this.view.getUint8(offset) !== 0 : this.view.getInt32(offset, true); },
      set: (value: unknown) => { reader.guard(); this.exact();
        if (field.typeName === 'bool') { if (typeof value !== 'boolean') throw new Error('Actual bool storage required'); this.putByte(field.nativeOffset, Number(value)); }
        else { if (typeof value !== 'number' || !Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw new Error('Actual signed enum storage required'); this.putWord(field.nativeOffset + 4, value >>> 0); }
      },
    });
  }
  exact(attached = true): void {
    this.reader.guard(); const allocation = this.reader.controller.allocations().find(value => value.wrapper === this.wrapper);
    if (this.wrapper.deleted || allocation?.propertySet !== this.base || this.base.values !== this.values ||
        (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper))) throw new Error('Stable retained Illuminated physical receiver required');
    if (this.unsigned(0) !== 0x30844dc4 || this.unsigned(0x18) !== 0x30844b84 || this.unsigned(0x24) !== 0x30844c5c) throw new Error('Actual Illuminated/enum vtables required');
  }
  private bounds(offset: number, length: number): void { if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(length) || length < 0 || offset + length > 188) throw new Error('Actual Illuminated storage bounds required'); }
  require(offset: number, length: number): void { this.bounds(offset, length); if (!this.knownMask.subarray(offset, offset + length).every(value => value === 255)) throw new Error('Illuminated native bits remain unknown+' + offset.toString(16)); }
  unsigned(offset: number): number { this.require(offset, 4); return this.view.getUint32(offset, true); }
  byte(offset: number): number { this.require(offset, 1); return this.view.getUint8(offset); }
  putByte(offset: number, value: number): void { this.reader.guard(); this.bounds(offset, 1); if (word(value) > 255) throw new Error('Actual BYTE required'); this.view.setUint8(offset, value); this.knownMask[offset] = 255; }
  putWord(offset: number, value: number): void { this.reader.guard(); this.bounds(offset, 4); this.view.setUint32(offset, word(value), true); this.knownMask.fill(255, offset, offset + 4); }
  raw(offset: number, value: Uint8Array, mask?: Uint8Array): void { this.reader.guard(); this.bounds(offset, value.length); if (mask && mask.length !== value.length) throw new Error('Actual raw mask length required'); this.bytes.set(value, offset); if (mask) this.knownMask.set(mask, offset); else this.knownMask.fill(255, offset, offset + value.length); }
  pointerBits(offset: number, value: object | null): void { this.reader.guard(); this.bounds(offset, 4); if (value === null) this.putWord(offset, 0); else this.knownMask.fill(0, offset, offset + 4); }
  private assertPointer(offset: number, value: object | null): void {
    this.bounds(offset, 4);
    if (value === null) { if (this.unsigned(offset) !== 0) throw new Error('Actual Illuminated NULL pointer/raw alias differs'); }
    else if (!this.knownMask.subarray(offset, offset + 4).every(mask => mask === 0)) throw new Error('Actual Illuminated nonNULL capability/unknown numeric pointer mask differs');
  }
  /** Exact physical pointer slot writes, for the native service that owns the
   * effects. This is not a substitute for SetLightSet/AddReference operations. */
  writePointerSlot(offset: 0x30 | 0x34 | 0xac | 0xb4, value: NativeIlluminatedPointer | null): void { this.reader.guard(); this.pointers.set(offset, value); this.pointerBits(offset, value); }
  pointerSlot(offset: 0x30 | 0x34 | 0xac | 0xb4): NativeIlluminatedPointer | null { if (!this.pointers.has(offset)) throw new Error('Actual pointer capability not initialized'); const value = this.pointers.get(offset)!; this.assertPointer(offset, value); return value; }
  get staticLightCount(): number { return this.byte(0x39); }
  get isOccludedByte(): number { return this.byte(0x38); }
  get queryState(): number { return this.unsigned(0xb0); }
  get needsUpdateByte(): number { return this.byte(0xb8); }
  private copyEnum(name: string, source: string): void {
    if (name !== 'StaticIlluminated' && name !== 'DirectionalShadowType') throw new Error('Actual enum container required'); const container = profile.enums[name];
    const bits = this.reader.host.enumDefault ? this.reader.call('capture current mutable ' + name + ' enum default', source,
      () => this.reader.host.enumDefault!(container.global as '30ae1c48' | '30ae1c4c')) : { value: 0, knownMask: 0 };
    const bytes = new Uint8Array(4), mask = new Uint8Array(4); new DataView(bytes.buffer).setUint32(0, word(bits.value), true); new DataView(mask.buffer).setUint32(0, word(bits.knownMask), true);
    this.raw(container.offset + 4, bytes, mask); this.reader.note('copy actual masked live enum ' + name, source);
  }
  construct(secret: symbol): void {
    this.reader.guard(); if (secret !== permission || this.constructed) throw new Error('Fresh guarded Illuminated construction required'); this.constructed = true;
    this.putWord(0, 0x100e7e1c); this.putWord(4, 0); this.putWord(0, 0x100e7eac); this.putWord(8, 1); this.reader.controller.retainNative(this.wrapper, this.base);
    this.view.setUint8(0x10, 1); this.knownMask[0x10] = 15; this.putWord(0, 0x30875d8c); this.putWord(0xc, 0); this.putWord(0, 0x30844dc4);
    this.reader.note('actual inherited ObjectBase/RefBase/EntityPS ctor', 'Engine:30222eb0');
    for (const name of ['StaticIlluminated', 'DirectionalShadowType'] as const) { const container = profile.enums[name]; this.putWord(container.offset, 0x100e7e1c); this.reader.note('embedded enum ObjectBase ctor vtable', 'SharedBase:1004a1c0'); this.putWord(container.offset, parseInt(container.vtable, 16)); this.copyEnum(name, 'Engine:30222eb0'); }
    for (let index = 0; index < 7; index++) this.reader.note('actual Vector4 constructor RET at+' + (0x3c + index * 16).toString(16), 'SharedBase:10023c20');
    this.writePointerSlot(0x34, null); this.writePointerSlot(0x30, null); this.putByte(0x38, 0); this.writePointerSlot(0xac, null);
    this.raw(0x3c, new Uint8Array(112)); this.reader.note('actual memset shader-light block112 zero', 'Engine:30671690');
    this.putByte(0x39, 0); this.writePointerSlot(0xb4, null); this.putWord(0xb0, 0); this.putByte(0xb8, 1); this.reader.note('actual constructor pointer/query/count/update stores', 'Engine:30222eb0');
  }
  defaultInternal(field: NativeReflectionField, secret: symbol): NativeValue<void> {
    return this.reader.controller.value(() => { this.reader.guard(); if (secret !== permission) throw new Error('Guarded Illuminated default required'); this.exact(); this.field(field);
      if (field.typeName === 'bool') this.putByte(field.nativeOffset, 0); else {
        if (field.name !== 'StaticIlluminated' && field.name !== 'DirectionalShadowType') throw new Error('Actual Illuminated enum default required');
        const source = profile.enums[field.name].dispatch['24']; if (!source) throw new Error('Actual enum Create dispatch required'); this.copyEnum(field.name, source);
      } this.reader.note('actual descriptor default ' + field.name, field.defaultInitializer!); });
  }
  postInitialize(secret: symbol): NativeValue<void> {
    return this.reader.controller.value(() => { this.reader.guard(); if (secret !== permission) throw new Error('Guarded Illuminated PostInitialize required'); this.exact();
      for (const [offset, value] of [[0x14, 1], [0x15, 1], [0x20, 1], [0x21, 1], [0x2c, 0], [0x2d, 1], [0x2e, 1]] as const) this.putByte(offset, value);
      this.reader.note('actual PostInitialize seven ordered bool stores/return1', 'Engine:30222a70'); });
  }
  private field(field: NativeReflectionField): void { if (!this.wrapper.factory.root.fields.includes(field)) throw new Error('Exact original descriptor capability required'); }
  private notification(phase: 'enter' | 'exit', property: string, propagated: boolean): void {
    this.reader.guard(); if ((phase !== 'enter' && phase !== 'exit') || typeof property !== 'string' || property.includes('\0') || typeof propagated !== 'boolean') throw new Error('Actual notification arguments required');
    const outer = this.base.owner.read(); if (outer !== null) { outer.propertyOwner.modified(); this.reader.note('outer actual live owner Modified', phase === 'enter' ? 'Engine:3003b5bb' : 'Engine:3001a091'); }
    if (this.unsigned(0) !== 0x30844dc4) throw new Error('Actual captured OnNotify dispatch changed');
    this.reader.note('actual virtual OnNotify ' + phase + ' ' + property, dispatch(phase === 'enter' ? 0x4c : 0x50));
    if (phase === 'exit' && this.base.owner.read() !== null && !propagated) {
      const admin = this.reader.call('IlluminationAdmin GetInstance', 'Engine:30223003', () => this.reader.host.illuminationAdmin?.());
      this.reader.call('captured Illuminated GetEffectedDynamicLights', 'Engine:3022300a', () => admin.getEffectedDynamicLights(this));
    }
    const inner = this.base.owner.read(); if (inner !== null) { inner.propertyOwner.modified(); this.reader.note('inherited live owner Modified reread', phase === 'enter' ? 'Engine:3002ad10' : 'Engine:30037ca4'); }
    this.reader.note('inherited SharedBase notification literal1', phase === 'enter' ? 'Engine:3002ad10' : 'Engine:30037ca4');
  }
  notify(phase: 'enter' | 'exit', property: string, propagated: boolean): NativeValue<void> { return this.reader.run(() => { this.exact(); this.notification(phase, property, propagated); }); }
  fieldRead(field: NativeReflectionField, input: NativeEntityByteInput, secret: symbol): NativeValue<void> {
    return this.reader.controller.value(() => { this.reader.guard(); if (secret !== permission) throw new Error('Guarded descriptor reader required'); this.exact(); this.field(field);
      input.u16(); input.u32(); this.reader.note('descriptor version/size consumed without forced seek ' + field.name, field.reader);
      this.notification('enter', field.name, true); this.exact();
      if (field.typeName === 'bool') this.putByte(field.nativeOffset, Number(input.bool())); else { input.u16(); this.raw(field.nativeOffset + 4, input.take(4)); }
      this.reader.note('actual reflective payload ' + field.name, field.reader); this.reader.guard(); this.exact(); this.notification('exit', field.name, true); });
  }
  nativeRead(input: NativeEntityByteInput, secret: symbol): NativeValue<void> {
    return this.reader.controller.value(() => { this.reader.guard(); if (secret !== permission) throw new Error('Guarded Illuminated native Read required'); this.exact();
      const version = input.u16(); this.reader.note('native Read version consumed', 'Engine:30222ca0');
      if (version < 8) throw new Error('Original Illuminated versions<8 color/vector temporary conversion services required at version branch');
      this.putByte(0x39, input.u8()); this.reader.note('Read static light count byte', 'Engine:30222ca0');
      this.raw(0x3c, input.take(112)); this.reader.note('ONE native stream bulk112 into same shader block', 'Engine:30222ca0');
      this.putByte(0x2e, this.byte(0x21)); this.putByte(0x2d, this.byte(0x20)); this.reader.note('Read ReciveStatic←Recive and CastStatic←Cast/return1', 'Engine:30222ca0'); });
  }
  private cacheOutInternal(): void {
    // SetDirectionalShadowMap(NULL): an existing map first clears its query.
    if (this.pointerSlot(0x34) !== null) {
      this.setQueryInternal(null);
      const captured = this.pointerSlot(0x34); if (captured === null) throw new Error('Original shadow NULL dereference after query callback');
      this.reader.call('captured shadow vtable+b8 RemoveObject with live owner', 'Engine:30223215', () => missing('Actual directional shadow RemoveObject/ReleaseReference services required'));
    }
    this.reader.note('SetDirectionalShadowMap NULL/NULL path returns', 'Engine:302231e0');
    if (this.pointerSlot(0xac) !== null) this.reader.call('captured LightSet GetEffectedDynamicLights', 'Engine:30223364', () => missing('Actual nonNULL LightSet array/light remove/refcount services required'));
    this.reader.note('SetLightSet NULL/NULL equality path returns', 'Engine:30223270');
  }
  private setQueryInternal(incoming: NativeIlluminatedPointer | null): void {
    const old = this.pointerSlot(0xb4);
    if (old !== null) this.reader.call('RenderSystemAdmin GetInstance with captured OCQuery', 'Engine:3022305f', () => missing('Actual render admin/occlusion processor/FreeOCQuery required'));
    if (incoming !== null) { this.writePointerSlot(0xb4, incoming); this.putWord(0xb0, 2); this.putByte(0x38, 0); this.reader.note('SetDSMOcclusionQuery incoming pointer/state2/occluded0', 'Engine:30223050'); return; }
    if (this.unsigned(0xb0) === 1 && this.pointerSlot(0x34) !== null) this.reader.call('captured directional shadow GetImage', 'Engine:302230a6', () => missing('Actual depth-map/image/RemoveOcclusionTestItem services required'));
    this.writePointerSlot(0xb4, null); this.putWord(0xb0, 0); this.putByte(0x38, 0); this.reader.note('SetDSMOcclusionQuery NULL/state0/occluded0', 'Engine:30223050');
  }
  setDSMOcclusionQuery(incoming: NativeIlluminatedPointer | null): NativeValue<void> { return this.reader.run(() => { this.exact(); this.setQueryInternal(incoming); }); }
  cacheIn(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.putByte(0xb8, 1); this.reader.note('OnCacheIn needsUpdate1', 'Engine:302229f0'); }); }
  cacheOut(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.cacheOutInternal(); }); }
  clearStaticLightData(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.raw(0x3c, new Uint8Array(112)); this.putByte(0x39, 0); this.reader.note('ClearStaticLightData memset112/count0', 'Engine:30222af0'); }); }
  invalidate(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.writePointerSlot(0xac, null); this.raw(0x3c, new Uint8Array(112)); this.putByte(0x39, 0); this.writePointerSlot(0xb4, null); this.putWord(0xb0, 0); this.putByte(0xb8, 1); this.reader.note('derived Invalidate exact ordered slots; preserves material/shadow/occluded', 'Engine:30222bd0'); }); }
  onUpdatedWorldMatrix(): NativeValue<void> { return this.reader.run(() => { this.exact(); if (this.pointerSlot(0xac) !== null) this.reader.call('captured LightSet GetEffectedDynamicLights', 'Engine:30222c5f', () => missing('Actual live LightSet array and each dynamic-light virtual180 required')); this.putByte(0xb8, 1); this.reader.note('OnUpdatedWorldMatrix needsUpdate1', 'Engine:30222c50'); }); }
  private bindFrustum(value: NativeLivePropertySet<object> | null, source: string): void {
    const owner = this.base.owner.read(); if (owner === null) throw new Error('Actual OnAdded/Removed owner dereference is NULL');
    const item = this.reader.call('GetFrustumElementItem captured owner+14c', source, () => this.reader.host.frustumItem?.(owner));
    if (item.owner !== owner) throw new Error('Actual captured owner embedded FrustumItem required');
    this.reader.call('SetIlluminationPS actual frustum+34 slot', 'Engine:30398d30', () => { item.illuminationPS = value; return known(undefined); });
  }
  private lifecycle(value: NativeLivePropertySet<object>, phase: 'added' | 'removed' | 'postRead'): NativeValue<void> {
    return this.reader.run(() => { this.exact(); if (value !== this.base) throw new Error('Actual Illuminated lifecycle receiver required');
      if (phase === 'postRead') { this.reader.note('inherited OnPostRead RET', dispatch(0x12c)); return; }
      if (phase === 'removed') { this.reader.note('virtual OnCacheOut captured PS', dispatch(0x118)); this.cacheOutInternal(); this.bindFrustum(null, 'Engine:30222a12'); }
      else this.bindFrustum(this.base, 'Engine:30222a24');
    });
  }
  preProcess(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.reader.note('inherited PreProcess RET', dispatch(0x124)); }); }
  process(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.reader.note('inherited Process RET', dispatch(0x120)); }); }
  postProcess(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.reader.note('inherited PostProcess RET', dispatch(0x128)); }); }
}
export class OriginalIlluminatedReader {
  readonly factory: NativeReflectionFactory;
  private readonly retained = new WeakMap<NativeReflectionWrapper, OriginalIlluminatedProperties>();
  private active = false;
  private nestedAttempt = false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeIlluminatedReadingHost = {}) {
    const factory: NativeReflectionFactory = { nativeCategory: 'entity-property-set', root: Object.freeze({ className: 'eCIlluminated_PS', baseClassName: 'eCEntityPropertySet', fields: Object.freeze(profile.fields.map(field => Object.freeze({ ...field }))) }),
      cloneRoot: current => current === controller ? this.run(() => {
        const wrapper = current.allocateWrapper(factory, 'Engine:' + profile.clone), value = new OriginalIlluminatedProperties(wrapper, this); this.retained.set(wrapper, value); value.construct(permission);
        if (!value.base.isValid()) value.base.createBase(); this.note('fresh Create exact IsValid AL1/inherited Create/return1', 'Engine:' + profile.create);
        current.setAllocationPhase(wrapper, 'created'); current.attachConstructedNative(wrapper, value.base, 'Engine:' + profile.attach, 'Engine:' + profile.initialize);
        current.initializeProperties(wrapper, field => value.defaultInternal(field, permission), () => value.postInitialize(permission), 'Engine:' + profile.defaults); return wrapper;
      }) : missing('Actual Illuminated reflection controller required'),
      getVersion: wrapper => controller.value(() => { this.actual(wrapper).exact(); return 8; }),
      read: (wrapper, input) => this.run(() => { const value = this.actual(wrapper); return controller.readWrapperProperties(wrapper, input, { wrapperSource: 'Engine:' + profile.wrapperRead, dataSource: 'Engine:' + profile.dataRead,
        readField: (field, stream) => value.fieldRead(field, stream, permission), readNative: stream => value.nativeRead(stream, permission) }); }),
    }; this.factory = factory; fact(controller.registerFactory(factory), 'Actual Illuminated factory registration');
  }
  guard(): void { if (this.nestedAttempt) throw new Error('Reentrant Illuminated mutation attempted'); const required = this.controller.receipt().required; if (required !== null) throw new Error(required); }
  run<T>(body: () => T): NativeValue<T> { if (this.active) { this.nestedAttempt = true; return this.controller.value(() => { throw new Error('Reentrant Illuminated factory/read/callback unsupported'); }); }
    this.active = true; this.nestedAttempt = false; try { return this.controller.value(() => { this.guard(); const value = body(); this.guard(); return value; }); } finally { this.active = false; } }
  note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  call<T>(operation: string, source: string, callback: () => NativeValue<T> | undefined): T { this.guard(); const value = this.controller.effect(operation, source, callback); this.guard(); return value; }
  properties(wrapper: NativeReflectionWrapper, attached = true): NativeValue<OriginalIlluminatedProperties> { const value = this.retained.get(wrapper); if (!value) return missing('Actual retained Illuminated allocation required'); try { value.exact(attached); return known(value); } catch (error) { return missing(String(error)); } }
  private actual(wrapper: NativeReflectionWrapper): OriginalIlluminatedProperties { return fact(this.properties(wrapper), 'Actual Illuminated receiver'); }
}
