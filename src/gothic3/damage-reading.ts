/** Original Damage/Receiver factories, current Hero reads and one live store
 * for later combat consumers. No detached read creates world residency. */
import rulesText from '../../assets/gothic3/damage-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyObjectReference } from './entity-lifecycle';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionWrapper } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import { OriginalEnclaveProxy } from './native-properties';
import type { OriginalPropertyTrace, OriginalProxyInternalReference } from './native-properties';

export type OriginalDamageClass = 'gCDamage_PS' | 'gCDamageReceiver_PS';
interface DamageProfile {
  heroIndex: number; type: number; version: number; nativeBytes: number; nativeVtable: string; wrapperVtable: string;
  constructor: string; create: string; invalidate: string; postInitialize: string; nativeRead: string; root: string;
  clone: string; initialize: string; attach: string; defaults: string; wrapperRead: string; dataRead: string;
  enumOffset: number; enumVtable: string; enumGlobal: string; enumDispatch: Record<string, string>; dispatch: Record<string, string>;
  fields: NativeReflectionField[]; setters: Record<string, string>;
}
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; classes: Record<OriginalDamageClass, DamageProfile> };
if (rules.schema !== 'gothic3-damage-reading-rules-v1' || rules.classes.gCDamage_PS.type !== 51 || rules.classes.gCDamageReceiver_PS.type !== 52 ||
    rules.classes.gCDamage_PS.version !== 76 || rules.classes.gCDamageReceiver_PS.version !== 33 ||
    rules.classes.gCDamage_PS.nativeBytes !== 44 || rules.classes.gCDamageReceiver_PS.nativeBytes !== 84 ||
    rules.classes.gCDamage_PS.fields.length !== 5 || rules.classes.gCDamageReceiver_PS.fields.length !== 9 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original Damage source evidence differs');
for (const [className, profile] of Object.entries(rules.classes)) {
  const damage = className === 'gCDamage_PS';
  if (profile.nativeVtable !== (damage ? '2065ec34' : '2065f3e4') || profile.wrapperVtable !== (damage ? '2065edcc' : '2065f57c') ||
      profile.enumOffset !== (damage ? 0x14 : 0x2c) || profile.enumVtable !== '2065ea34' || profile.enumGlobal !== '207b62a4' ||
      Object.keys(profile.dispatch).length !== 19 || Object.keys(profile.enumDispatch).length !== 4 ||
      profile.fields.map(field => field.name).join(',') !== (damage ? 'DamageType,DamageAmount,DamageManaMultiplier,DamageHitMultiplier,ManaUsed' :
        'HitPoints,HitPointsMax,StaminaPoints,StaminaPointsMax,ManaPoints,ManaPointsMax,DamageType,DamageAmount,LastInflictor') ||
      profile.fields.map(field => field.nativeOffset).join(',') !== (damage ? '20,28,32,36,40' : '20,24,28,32,36,40,44,52,56')) throw new Error('Actual Damage dispatch/layout differs');
}
const permission = Symbol('actual guarded Damage factory/default/descriptor read');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(result: NativeValue<T>, operation: string): T { if (!result.known) throw new Error(operation + ': ' + result.reason); return result.value; }
function word(value: number): number { if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original Damage DWORD required'); return value; }
function source(map: Record<string, string>, key: string): string { const value = map[key]; if (!value) throw new Error('Required original Damage dispatch missing: ' + key); return value; }
function hex(bytes: Uint8Array): string { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
function id(value: string): Uint8Array {
  if (!/^[0-9a-f]{40}$/i.test(value)) throw new Error('Original 20-byte LastInflictor PropertyID required'); return Uint8Array.from(value.match(/../g)!, value => parseInt(value, 16));
}
export interface NativeDamageReadingHost {
  /** CURRENT mutable global207b62a4. Absent capture preserves unknown copied
   * bits; it never infers the live value from the PE's cold zero-fill. */
  enumDefault?(originalGlobal: '207b62a4'): NativeValue<{ value: number; knownMask: number }>;
}
export interface OriginalDamageEnumTemporary { readonly bytes: Uint8Array; readonly knownMask: Uint8Array; destroyed: boolean }
/** A captured native const-reference argument. Its contents are read AFTER
 * Enter, so owner callbacks can alter that same argument before the write. */
export interface NativeDamageScalarReference { read(): NativeValue<number> }
/** Original EntityProxy semantics with physical ID/cache/pointer aliases and
 * an exact captured-release guard, preserving the attempted failed prefix. */
export class OriginalDamageEntityProxy extends OriginalEnclaveProxy {
  private pointer: OriginalProxyInternalReference | null = null;
  private guardedPointer: OriginalProxyInternalReference | null = null;
  constructor(readonly nativeOffset: number, private readonly properties: OriginalDamageProperties) {
    super('0000000000000000000000000000000000000000', null);
    Object.defineProperty(this, 'id', { get: () => { properties.require(nativeOffset + 8, 20); return hex(properties.bytes.subarray(nativeOffset + 8, nativeOffset + 28)); },
      set: (value: string) => properties.raw(nativeOffset + 8, id(value)) });
    Object.defineProperty(this, 'internal', { get: () => this.guardedPointer,
      set: (value: OriginalProxyInternalReference | null) => {
        properties.reader.guard(); this.pointer = value;
        this.guardedPointer = value === null ? null : { identity: value.identity, releaseReference: () => properties.reader.controller.value(() => {
          properties.reader.call('captured LastInflictor proxy internal ReleaseReference', 'Engine:304c43a0', () => value.releaseReference());
        }) };
        properties.pointerBits(nativeOffset + 4, value);
      },
    });
  }
  get nativeInternal(): OriginalProxyInternalReference | null { return this.pointer; }
  private trace(operation: OriginalPropertyTrace['operation'], value: string | null | undefined,
    emit: (operation: OriginalPropertyTrace['operation'], value?: string | null) => void): void {
    this.properties.reader.note(operation + ' actual LastInflictor', 'Engine:304c43a0'); emit(operation, value); this.properties.reader.guard();
  }
  override setEntity(value: string, emit: (operation: OriginalPropertyTrace['operation'], value?: string | null) => void = () => {}): void {
    this.properties.reader.guard(); super.setEntity(value, (operation, value) => this.trace(operation, value, emit)); this.properties.reader.guard();
  }
  override clearEntityPointer(emit: (operation: OriginalPropertyTrace['operation'], value?: string | null) => void = () => {}): void {
    this.properties.reader.guard(); super.clearEntityPointer((operation, value) => this.trace(operation, value, emit)); this.properties.reader.guard();
  }
}
export class OriginalDamageProperties {
  readonly bytes: Uint8Array;
  readonly knownMask: Uint8Array;
  private readonly view: DataView;
  readonly values: Record<string, unknown> = {};
  readonly base: NativeLivePropertySet<Record<string, unknown>>;
  readonly lastInflictor: OriginalDamageEntityProxy | null;
  readonly temporaries: OriginalDamageEnumTemporary[] = [];
  private owner: NativeLiveEntity | null = null;
  private propertyObject: NativePropertyObjectReference | null = null;
  private constructed = false;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalDamageReader, readonly className: OriginalDamageClass) {
    const profile = this.profile; this.bytes = new Uint8Array(profile.nativeBytes); this.knownMask = new Uint8Array(profile.nativeBytes); this.view = new DataView(this.bytes.buffer);
    this.lastInflictor = className === 'gCDamageReceiver_PS' ? new OriginalDamageEntityProxy(0x38, this) : null;
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', className, profile.type, this.values,
      { read: () => this.owner, write: owner => { this.reader.guard(); this.owner = owner; this.pointerBits(0xc, owner); } }, null,
      { added: value => this.callback(value, 0x138), removed: value => this.callback(value, 0x13c), postRead: value => this.callback(value, 0x12c) },
      () => reader.controller.value(() => { reader.guard(); this.exact(); return false; }));
    Object.defineProperty(this.base, 'referenceWord', { get: () => this.unsigned(8), set: value => this.putWord(8, value) });
    Object.defineProperty(this.base, 'wrapper', { get: () => this.propertyObject, set: value => { this.reader.guard(); this.propertyObject = value; this.pointerBits(4, value); } });
    Object.defineProperties(this.base.baseFlags, {
      value: { get: () => this.view.getUint8(0x10), set: value => { this.reader.guard(); this.view.setUint8(0x10, word(value) & 255); } },
      knownMask: { get: () => this.knownMask[0x10], set: value => { this.reader.guard(); this.knownMask[0x10] = word(value) & 255; } },
    });
    for (const field of profile.fields) Object.defineProperty(this.values, field.name, { enumerable: true,
      get: () => {
        if (field.typeName === 'eCEntityProxy') return this.lastInflictor;
        const offset = field.nativeOffset + (field.name === 'DamageType' ? 4 : 0); this.require(offset, 4);
        return field.typeName === 'float' ? this.view.getFloat32(offset, true) : this.view.getInt32(offset, true);
      },
      set: (value: unknown) => {
        this.reader.guard(); this.exact(); if (typeof value !== 'number') throw new Error('Scalar Damage value requires numeric storage');
        this.storeScalar(field, value);
      },
    });
  }
  get profile(): DamageProfile { return rules.classes[this.className]; }
  private callback(value: NativeLivePropertySet<object>, offset: number): NativeValue<void> {
    return this.reader.run(() => { this.exact(); if (value !== this.base) throw new Error('Actual Damage lifecycle receiver required'); this.reader.note('actual inherited empty Damage lifecycle callback', source(this.profile.dispatch, String(offset))); });
  }
  exact(attached = true): void {
    const allocation = this.reader.controller.allocations().find(value => value.wrapper === this.wrapper);
    if (this.wrapper.deleted || this.base.values !== this.values || allocation?.propertySet !== this.base ||
      (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper))) throw new Error('Actual retained Damage physical property set required');
    if (this.unsigned(0) !== parseInt(this.profile.nativeVtable, 16) || this.unsigned(this.profile.enumOffset) !== parseInt(this.profile.enumVtable, 16)) throw new Error('Selected actual Damage/enum vtables required');
  }
  require(offset: number, length: number): void {
    if (!Number.isInteger(offset) || offset < 0 || offset + length > this.bytes.length || !this.knownMask.subarray(offset, offset + length).every(value => value === 255)) throw new Error('Original Damage bits remain unknown+' + offset.toString(16));
  }
  unsigned(offset: number): number { this.require(offset, 4); return this.view.getUint32(offset, true); }
  putWord(offset: number, value: number): void { this.reader.guard(); if (!Number.isInteger(offset) || offset < 0 || offset + 4 > this.bytes.length) throw new Error('Actual Damage write bounds required'); this.view.setUint32(offset, word(value), true); this.knownMask.fill(255, offset, offset + 4); }
  raw(offset: number, value: Uint8Array, mask?: Uint8Array): void {
    this.reader.guard(); if (!Number.isInteger(offset) || offset < 0 || offset + value.length > this.bytes.length || (mask && mask.length !== value.length)) throw new Error('Actual Damage raw write bounds required');
    this.bytes.set(value, offset); if (mask) this.knownMask.set(mask, offset); else this.knownMask.fill(255, offset, offset + value.length);
  }
  pointerBits(offset: number, value: object | null): void { this.reader.guard(); if (!Number.isInteger(offset) || offset < 0 || offset + 4 > this.bytes.length) throw new Error('Actual Damage pointer bounds required'); if (value === null) this.putWord(offset, 0); else this.knownMask.fill(0, offset, offset + 4); }
  private copyEnum(copySource: string): void {
    const bits = this.reader.host.enumDefault ? this.reader.call('capture current shared DamageType default', copySource,
      () => this.reader.host.enumDefault!('207b62a4')) : { value: 0, knownMask: 0 };
    const raw = new Uint8Array(4), mask = new Uint8Array(4);
    new DataView(raw.buffer).setUint32(0, word(bits.value), true); new DataView(mask.buffer).setUint32(0, word(bits.knownMask), true);
    this.raw(this.profile.enumOffset + 4, raw, mask); this.reader.note('copy masked current DamageType enum global', copySource);
  }
  construct(secret: symbol): void {
    this.reader.guard(); if (secret !== permission || this.constructed) throw new Error('Fresh guarded Damage constructor required'); this.constructed = true;
    this.putWord(0, 0x100e7e1c); this.putWord(4, 0); this.putWord(0, 0x100e7eac); this.putWord(8, 1);
    this.reader.controller.retainNative(this.wrapper, this.base);
    this.view.setUint8(0x10, 1); this.knownMask[0x10] = 15; this.putWord(0, 0x30875d8c); this.putWord(0xc, 0); this.putWord(0, parseInt(this.profile.nativeVtable, 16));
    this.reader.note('inherited RefBase/EntityPS ctor and real Damage vtable', 'Game:' + this.profile.constructor);
    this.putWord(this.profile.enumOffset, 0x100e7e1c); this.reader.note('embedded enum bCObjectBase constructor vtable', 'SharedBase:1004a1c0');
    this.putWord(this.profile.enumOffset, parseInt(this.profile.enumVtable, 16)); this.copyEnum('Game:' + this.profile.constructor);
    if (this.lastInflictor !== null) {
      this.putWord(0x38, 0x3087bff4); this.raw(0x40, new Uint8Array(20)); this.putWord(0x3c, 0); this.raw(0x40, new Uint8Array(20));
      this.reader.note('embedded LastInflictor ctor ID zero20/internalNULL/Destroy', 'Engine:304c45a0');
    }
  }
  defaultInternal(field: NativeReflectionField, secret: symbol): NativeValue<void> {
    return this.reader.controller.value(() => {
      this.reader.guard(); if (secret !== permission) throw new Error('Actual guarded Damage default required'); this.exact(); this.field(field);
      if (field.name === 'DamageType') this.copyEnum(source(this.profile.enumDispatch, '24'));
      else if (field.typeName === 'long' || field.typeName === 'float') this.putWord(field.nativeOffset, 0);
      else if (field.typeName === 'int') this.putWord(field.nativeOffset, 0xffffffff);
      else if (field.typeName !== 'eCEntityProxy') throw new Error('Actual Damage default unresolved');
      this.reader.note('source Damage descriptor default ' + field.name, field.defaultInitializer!);
    });
  }
  postInitialize(secret: symbol): NativeValue<void> {
    return this.reader.controller.value(() => {
      this.reader.guard(); if (secret !== permission) throw new Error('Actual guarded Damage PostInitialize required'); this.exact();
      this.reader.note('inherited RefBase.PostInitialize literal1', 'SharedBase:100076f8');
      const postSource = 'Game:' + this.profile.postInitialize;
      if (this.className === 'gCDamageReceiver_PS') {
        this.putWord(0x14, 1); this.reader.note('PostInitialize HitPoints1', postSource); this.putWord(0x18, 1); this.reader.note('PostInitialize HitPointsMax1', postSource); return;
      }
      this.putWord(0x1c, 10); this.reader.note('PostInitialize DamageAmount10', postSource);
      const temporary: OriginalDamageEnumTemporary = { bytes: new Uint8Array(8), knownMask: new Uint8Array(8), destroyed: false };
      this.temporaries.push(temporary); const view = new DataView(temporary.bytes.buffer);
      view.setUint32(0, 0x100e7e1c, true); temporary.knownMask.fill(255, 0, 4); this.reader.note('actual temporary enum bCObjectBase ctor vtable', 'SharedBase:1004a1c0');
      view.setUint32(0, parseInt(this.profile.enumVtable, 16), true); view.setUint32(4, 2, true); temporary.knownMask.fill(255);
      this.reader.note('actual temporary enum base ctor/vtable/value2', postSource);
      this.raw(0x18, temporary.bytes.subarray(4, 8)); this.reader.note('DamageType virtual CopyFrom same actual enum temporary', source(this.profile.enumDispatch, '28'));
      view.setUint32(0, parseInt(this.profile.enumVtable, 16), true); this.reader.note('temporary enum destructor restores enum vtable', postSource);
      view.setUint32(0, 0x100e7e1c, true); temporary.destroyed = true; this.reader.note('actual temporary base destructor writes base vtable', 'SharedBase:10049fe0');
      this.putWord(0x20, 0x3f800000); this.reader.note('PostInitialize ManaMultiplier1 original literal', postSource);
      this.putWord(0x28, 0); this.reader.note('PostInitialize ManaUsed0', postSource); this.putWord(0x24, 0x3f800000); this.reader.note('PostInitialize HitMultiplier1 original literal', postSource);
    });
  }
  private field(field: NativeReflectionField): void {
    if (!this.wrapper.factory.root.fields.includes(field)) throw new Error('Exact original Damage descriptor capability required');
  }
  private inheritedNotify(phase: 'enter' | 'exit', property: string, propagated: boolean): void {
    this.reader.guard();
    if ((phase !== 'enter' && phase !== 'exit') || typeof property !== 'string' || property.includes('\0') || typeof propagated !== 'boolean') throw new Error('Actual original notification arguments required');
    const outer = this.base.owner.read(); if (outer !== null) { outer.propertyOwner.modified(); this.reader.note('outer live owner Modified read ' + property, phase === 'enter' ? 'Engine:3003b5bb' : 'Engine:3001a091'); }
    if (this.unsigned(0) !== parseInt(this.profile.nativeVtable, 16)) throw new Error('Actual captured Damage OnNotify vtable changed');
    this.reader.note('actual virtual OnNotify ' + phase + ' ' + property, source(this.profile.dispatch, phase === 'enter' ? '76' : '80'));
    const inner = this.base.owner.read(); if (inner !== null) { inner.propertyOwner.modified(); this.reader.note('inherited live owner Modified reread ' + property, phase === 'enter' ? 'Engine:3002ad10' : 'Engine:30037ca4'); }
    this.reader.note('inherited SharedBase OnNotify literal1', phase === 'enter' ? 'Engine:3002ad10' : 'Engine:30037ca4');
  }
  notify(phase: 'enter' | 'exit', property: string, propagated: boolean): NativeValue<void> {
    return this.reader.run(() => { this.exact(); this.inheritedNotify(phase, property, propagated); });
  }
  private storeScalar(field: NativeReflectionField, value: number): void {
    if (field.typeName === 'eCEntityProxy') throw new Error('LastInflictor copy-assignment requires actual proxy reference ownership, not scalar storage');
    const offset = field.nativeOffset + (field.name === 'DamageType' ? 4 : 0);
    if (field.typeName === 'float') {
      if (!Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new Error('Finite original float32 setter profile required');
      this.view.setFloat32(offset, value, true); this.knownMask.fill(255, offset, offset + 4);
    } else {
      if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw new Error('Actual signed32 Damage field required'); this.putWord(offset, value >>> 0);
    }
  }
  /** Selected immutable incoming scalar profile of the native by-reference
   * setter. Use setScalarReference for actual mutable argument storage. */
  setScalar(property: string, value: number): NativeValue<void> {
    return this.setScalarReference(property, { read: () => known(value) });
  }
  /** Captured receiver and argument, Enter(false), read the CURRENT argument,
   * capture Exit dispatch, physical store, then Exit(false). */
  setScalarReference(property: string, argument: NativeDamageScalarReference): NativeValue<void> {
    return this.reader.run(() => {
      this.exact(); const field = this.wrapper.factory.root.fields.find(field => field.name === property);
      if (!field || field.name === 'DamageType' || field.typeName === 'eCEntityProxy') throw new Error('Actual exported native scalar Damage setter required');
      const setter = source(this.profile.setters, property);
      this.inheritedNotify('enter', property, false);
      const value = this.reader.call('read captured current native scalar argument ' + property, setter, () => argument.read());
      if (this.unsigned(0) !== parseInt(this.profile.nativeVtable, 16)) throw new Error('Actual captured Damage Exit vtable changed');
      this.storeScalar(field, value);
      this.reader.note('native scalar setter captured physical write ' + property, setter); this.inheritedNotify('exit', property, false);
    });
  }
  fieldRead(field: NativeReflectionField, input: NativeEntityByteInput, secret: symbol): NativeValue<void> {
    return this.reader.controller.value(() => {
      this.reader.guard(); if (secret !== permission) throw new Error('Actual guarded Damage descriptor read required'); this.exact(); this.field(field);
      input.u16(); input.u32(); this.reader.note('descriptor version/size consumed, no forced seek ' + field.name, field.reader);
      this.inheritedNotify('enter', field.name, true); this.exact();
      if (field.name === 'DamageType') { input.u16(); this.raw(field.nativeOffset + 4, input.take(4)); }
      else if (field.typeName === 'eCEntityProxy') {
        const proxy = this.lastInflictor!; input.u16(); const present = input.bool();
        if (present) { this.reader.note('actual temporary PropertyID constructor', 'Engine:304c4410'); proxy.setEntity(input.propertyID().slice(0, 32) + '00000000'); this.reader.note('actual temporary PropertyID destructor RET', 'Engine:304c4410'); }
        else proxy.clearEntityPointer();
      } else this.raw(field.nativeOffset, input.take(4));
      this.reader.note('actual scalar/enum/proxy reflected payload ' + field.name, field.reader); this.reader.guard(); this.exact(); this.inheritedNotify('exit', field.name, true);
    });
  }
  nativeRead(input: NativeEntityByteInput, secret: symbol): NativeValue<void> {
    return this.reader.controller.value(() => { this.reader.guard(); if (secret !== permission) throw new Error('Actual guarded Damage derived Read required'); this.exact(); input.u16(); this.reader.note('derived Read version only; return1', 'Game:' + this.profile.nativeRead); });
  }
  invalidate(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.reader.note('actual derived Invalidate RET', 'Game:' + this.profile.invalidate); }); }
  preProcess(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.reader.note('actual inherited PreProcess RET', source(this.profile.dispatch, '292')); }); }
  process(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.reader.note('actual process RET', source(this.profile.dispatch, '288')); }); }
  postProcess(): NativeValue<void> { return this.reader.run(() => { this.exact(); this.reader.note('actual inherited PostProcess RET', source(this.profile.dispatch, '296')); }); }
}
export class OriginalDamageReader {
  readonly damageFactory: NativeReflectionFactory;
  readonly receiverFactory: NativeReflectionFactory;
  private readonly retained = new WeakMap<NativeReflectionWrapper, OriginalDamageProperties>();
  private active = false;
  private nestedAttempt = false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeDamageReadingHost = {}) {
    this.damageFactory = this.factory('gCDamage_PS'); this.receiverFactory = this.factory('gCDamageReceiver_PS');
    fact(controller.registerFactory(this.damageFactory), 'Actual Damage factory registration'); fact(controller.registerFactory(this.receiverFactory), 'Actual DamageReceiver factory registration');
  }
  guard(): void { if (this.nestedAttempt) throw new Error('Reentrant Damage mutation attempted'); const required = this.controller.receipt().required; if (required !== null) throw new Error(required); }
  run<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.nestedAttempt = true; return this.controller.value(() => { throw new Error('Reentrant Damage factory/read/callback unsupported'); }); }
    this.active = true; this.nestedAttempt = false;
    try { return this.controller.value(() => { this.guard(); const result = body(); this.guard(); return result; }); } finally { this.active = false; }
  }
  note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  call<T>(operation: string, source: string, callback: () => NativeValue<T> | undefined): T { this.guard(); const result = this.controller.effect(operation, source, callback); this.guard(); return result; }
  properties(wrapper: NativeReflectionWrapper, attached = true): NativeValue<OriginalDamageProperties> {
    const value = this.retained.get(wrapper); if (!value) return missing('Actual retained Damage allocation required');
    try { value.exact(attached); return known(value); } catch (error) { return missing(String(error)); }
  }
  private actual(wrapper: NativeReflectionWrapper): OriginalDamageProperties { return fact(this.properties(wrapper), 'Actual Damage receiver'); }
  private factory(className: OriginalDamageClass): NativeReflectionFactory {
    const profile = rules.classes[className];
    const factory: NativeReflectionFactory = { nativeCategory: 'entity-property-set', root: Object.freeze({ className, baseClassName: 'eCEntityPropertySet', fields: Object.freeze(profile.fields.map(field => Object.freeze({ ...field }))) }),
      cloneRoot: current => current === this.controller ? this.run(() => {
        const wrapper = current.allocateWrapper(factory, 'Game:' + profile.clone), value = new OriginalDamageProperties(wrapper, this, className); this.retained.set(wrapper, value); value.construct(permission);
        if (!value.base.isValid()) value.base.createBase(); this.note('fresh Create IsValid AL==1 gate/inherited Create/return1', 'Game:' + profile.create);
        current.setAllocationPhase(wrapper, 'created'); current.attachConstructedNative(wrapper, value.base, 'Game:' + profile.attach, 'Game:' + profile.initialize);
        current.initializeProperties(wrapper, field => value.defaultInternal(field, permission), () => value.postInitialize(permission), 'Game:' + profile.defaults); return wrapper;
      }) : missing('Actual Damage reflection controller required'),
      getVersion: wrapper => this.controller.value(() => { this.actual(wrapper).exact(); return profile.version; }),
      read: (wrapper, input) => this.run(() => {
        const value = this.actual(wrapper); return this.controller.readWrapperProperties(wrapper, input, { wrapperSource: 'Game:' + profile.wrapperRead, dataSource: 'Game:' + profile.dataRead,
          readField: (field, stream) => value.fieldRead(field, stream, permission), readNative: stream => value.nativeRead(stream, permission) });
      }),
    }; return factory;
  }
}
