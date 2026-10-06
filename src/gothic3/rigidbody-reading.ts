/** Installed original RigidBody factory and current serialized Hero reading.
 * Detached construction/read is not physics registration or world residency.
 * The movement facade's flags and StartVelocity alias this same physical store.
 * Unknown constructor bytes remain unknown. Native addresses are not JS handles.
 */
import rulesText from '../../assets/gothic3/rigidbody-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeOriginalRigidBody, nativeRigidBodyLinearVelocity } from './movement-state';
import type { NativeMovementVector, NativePendingPhysicsBuffer, NativeOriginalRigidBodyHost } from './movement-state';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyCallbacks } from './entity-lifecycle';
import { NativeReflectionWrapper, loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField,
  NativeReflectionRoot, NativeReflectionAccessor } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';

interface Operation { kind: string; sourceVA: string; offset?: number; value?: number; bytes?: number;
  receiverOffset?: number; role?: string; field?: string; values?: readonly number[]; module?: string; readSource?: { va: string } }
interface Program { stage: string; module: string; body: string; operations: readonly Operation[] }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; propertyType: number;
  getVersion: number; baseGetVersion: number; nativeBytes: number; nativeVtable: string; wrapperVtable: string;
  fields: readonly NativeReflectionField[]; baseField: NativeReflectionField; programs: readonly Program[];
  sourceHero: { index: number; packetSha256: string } };
if (rules.schema !== 'gothic3-rigidbody-reading-rules-v1' || rules.propertyType !== 13 || rules.getVersion !== 65 ||
    rules.baseGetVersion !== 2 || rules.nativeBytes !== 248 || rules.nativeVtable !== '3085ffcc' || rules.fields.length !== 13 ||
    rules.wrapperVtable !== '30860244' ||
    rules.baseField.name !== 'PhysicsEnabled' || rules.baseField.nativeOffset !== 20 || rules.baseField.typeName !== 'bool' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original RigidBody reading receipt differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, operation: string): T {
  if (!value.known) throw new Error(operation + ': ' + value.reason); return value.value;
}
function uint(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original uint32 required'); return value;
}
function finite32(value: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new Error('Finite binary32 field profile required'); return Math.fround(value);
}
export class NativeRigidBodyBytes {
  readonly bytes = new Uint8Array(rules.nativeBytes);
  readonly knownMask = new Uint8Array(rules.nativeBytes);
  private readonly view = new DataView(this.bytes.buffer);
  revision = 0;
  has(at: number, size: number): boolean {
    return Number.isInteger(at) && Number.isInteger(size) && at >= 0 && size >= 0 && at + size <= this.bytes.length &&
      this.knownMask.subarray(at, at + size).every(value => value === 255);
  }
  private range(at: number, size: number): void {
    if (!Number.isInteger(at) || !Number.isInteger(size) || at < 0 || size < 0 || at + size > this.bytes.length) throw new Error('Original RigidBody byte range differs');
  }
  private require(at: number, size: number): void { if (!this.has(at, size)) throw new Error('Unknown RigidBody bytes+' + at.toString(16)); }
  private changed(at: number, size: number): void { this.knownMask.fill(255, at, at + size); this.revision++; }
  byte(at: number): number { this.require(at, 1); return this.view.getUint8(at); }
  uint(at: number): number { this.require(at, 4); return this.view.getUint32(at, true); }
  float(at: number): number { this.require(at, 4); return finite32(this.view.getFloat32(at, true)); }
  vector(at: number): NativeMovementVector { return [this.float(at), this.float(at + 4), this.float(at + 8)]; }
  raw(at: number, size: number): Uint8Array { this.require(at, size); return this.bytes.slice(at, at + size); }
  writeByte(at: number, value: number): void {
    this.range(at, 1); if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Original byte required');
    this.view.setUint8(at, value); this.changed(at, 1);
  }
  writeUint(at: number, value: number): void { this.range(at, 4); this.view.setUint32(at, uint(value), true); this.changed(at, 4); }
  writeFloat(at: number, value: number): void { this.range(at, 4); this.view.setFloat32(at, finite32(value), true); this.changed(at, 4); }
  writeRaw(at: number, value: Uint8Array): void { this.range(at, value.length); this.bytes.set(value, at); this.changed(at, value.length); }
  writeVector(at: number, value: NativeMovementVector): void {
    this.range(at, 12); const fields = value.map(finite32); fields.forEach((field, index) => this.view.setFloat32(at + index * 4, field, true)); this.changed(at, 12);
  }
  writeQuaternion(at: number, value: readonly number[]): void {
    this.range(at, 16); if (value.length !== 4) throw new Error('Original quaternion requires four fields');
    const fields = value.map(finite32); fields.forEach((field, index) => this.view.setFloat32(at + index * 4, field, true)); this.changed(at, 16);
  }
  invalidateNumericPointer(at: number): void { this.range(at, 4); this.knownMask.fill(0, at, at + 4); this.revision++; }
}
export interface NativeRigidBodyTemporaryCString { readonly identity: object; readonly text: string;
  compare(literal: 'TotalMass' | 'BodyFlag'): NativeValue<number> }
export interface NativeRigidBodyTemporaryQuaternion { readonly identity: object; readonly raw: Uint8Array }
export interface NativeRigidBodyReadingHost {
  /** The constructor reads the CURRENT enum-default DWORD30aebf38. The PE's
   * cold zero-fill value is not evidence of a captured running native value. */
  bodyFlagDefault(): NativeValue<number>;
  /** Original GetBuffer must use its actual owner/global scene selection and
   * allocation/lifetime effects. No fresh pending buffer is inferred. */
  pendingBuffer?(owner: NativeLiveEntity): NativeValue<NativePendingPhysicsBuffer>;
  physicsSceneEnabledByte?(): NativeValue<number>;
  actorLinearVelocity?(actor: object): NativeValue<NativeMovementVector>;
  /** Needed only for local=false custom exit notifications. Propagated=true
   * reflective reading skips this entire original custom callback branch. */
  constructPropertyName?(name: 'StartVelocity'): NativeValue<NativeRigidBodyTemporaryCString>;
  destroyPropertyName?(name: NativeRigidBodyTemporaryCString): NativeValue<void>;
  /** Original OnAdded uses actual eCEntity -> eCTemplateEntity RTTI. Non-NULL
   * means this same owner's template base; object kind/name is not a cast. */
  templateOwner?(owner: NativeLiveEntity | null): NativeValue<NativeLiveEntity | null>;
  worldPosition?(owner: NativeLiveEntity): NativeValue<NativeMovementVector>;
  worldRotation?(owner: NativeLiveEntity): NativeValue<NativeRigidBodyTemporaryQuaternion>;
}

export class OriginalRigidBodyProperties {
  readonly storage = new NativeRigidBodyBytes();
  readonly nativeVtables = new Map<number, number>();
  readonly pointers = new Map<number, object | null>();
  owner: NativeLiveEntity | null = null;
  readonly base: NativeLivePropertySet<OriginalRigidBodyProperties>;
  private facade: NativeOriginalRigidBody | null = null;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalRigidBodyReader) {
    const empty = (candidate: NativeLivePropertySet<object>): NativeValue<void> => candidate === this.base
      ? known(undefined) : unknown('Actual concrete RigidBody callback receiver required');
    const callbacks: NativePropertyCallbacks = {
      added: candidate => candidate === this.base ? reader.onAdded(this) : unknown('Actual concrete RigidBody callback receiver required'),
      removed: empty, postRead: empty,
    };
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', 'eCRigidBody_PS', 13, this,
      { read: () => this.owner, write: value => { this.owner = value; } }, null, callbacks, () => known(false));
  }
  exact(attached = true): void {
    const allocation = this.wrapper.controller.allocations().find(value => value.wrapper === this.wrapper);
    if (this.wrapper.deleted || allocation?.propertySet !== this.base || this.base.values !== this ||
        (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper ||
          this.nativeVtables.get(0) !== 0x3085ffcc || this.nativeVtables.get(0x78) !== 0x3085fe0c))) throw new Error('Exact retained RigidBody allocation/wrapper/original vtables/physical value store required');
  }
  rigidBody(): NativeValue<NativeOriginalRigidBody> {
    try { this.exact(); return this.facade ? known(this.facade) : unknown('Actual original constructor has not initialized the rigid-body facade'); }
    catch (error) { return unknown(String(error)); }
  }
  bindMovementFacade(): void {
    if (this.facade !== null) throw new Error('RigidBody facade is already bound');
    // Instantiate only after the original enum constructor's real global read.
    // Nullable vector is the existing facade's explicit uninitialized state.
    const flags = this.storage.uint(0x7c), start = this.storage.has(0x1c, 12) ? this.storage.vector(0x1c) : null;
    const self = this;
    const host: NativeOriginalRigidBodyHost = {
      ownerRangeEntered: () => self.reader.liveOwnerRange(self),
      getBuffer: () => self.reader.pendingBuffer(self),
      notifyStartVelocity: (phase, localByte) => localByte === 0 ? self.reader.localVelocityNotification(self, phase) : unknown('Original local=false notification required'),
      linearVelocity: () => nativeRigidBodyLinearVelocity({
        ownerProcessingRangeEntered: () => self.reader.liveOwnerRange(self),
        actor: () => self.pointers.has(0xf4) ? known(self.pointers.get(0xf4)!) : unknown('Unknown original actor+f4 pointer'),
        sceneEnabledByte: () => self.reader.host.physicsSceneEnabledByte?.() ?? unknown('Actual current physics-scene byte+14 unresolved'),
        actorVelocity: actor => self.reader.host.actorLinearVelocity?.(actor) ?? unknown('Captured NxActor virtual+dc unresolved'),
      }, () => {
        try { return known(self.storage.vector(0x1c)); } catch (error) { return unknown(String(error)); }
      }),
    };
    const facade = new NativeOriginalRigidBody(flags, start, host);
    Object.defineProperties(facade, {
      bodyFlags: { enumerable: true, configurable: false, get: () => { self.exact(); return self.storage.uint(0x7c); },
        set: (value: number) => { self.exact(); self.storage.writeUint(0x7c, value); } },
      startVelocity: { enumerable: true, configurable: false, get: () => { self.exact(); return self.storage.has(0x1c, 12) ? self.storage.vector(0x1c) : null; },
        set: (value: NativeMovementVector | null) => { self.exact(); if (value === null) throw new Error('No source write of unknown StartVelocity is implied'); self.storage.writeVector(0x1c, value); } },
    });
    this.facade = facade;
  }
  pointer(at: number, value: object | null): void {
    if (!Number.isInteger(at) || at < 0 || at + 4 > rules.nativeBytes) throw new Error('Original pointer field range differs');
    this.pointers.set(at, value); if (value === null) this.storage.writeUint(at, 0); else this.storage.invalidateNumericPointer(at);
  }
  storeInteger(at: number, size: number, value: number): void {
    uint(value);
    if (at === 0 || at === 0x78) { this.nativeVtables.set(at, value); this.storage.invalidateNumericPointer(at); }
    else if (at === 4 && size === 4 && value === 0) this.base.wrapper = null;
    else if (at === 8 && size === 4) this.base.referenceWord = value;
    else if (at === 0xc && size === 4 && value === 0) this.base.owner.write(null);
    else if (at === 0xf4 && size === 4 && value === 0) this.pointer(at, null);
    else if (size === 1) this.storage.writeByte(at, value);
    else if (size === 4) this.storage.writeUint(at, value);
    else throw new Error('Unexamined original integer field width');
  }
}

export class OriginalRigidBodyReader {
  readonly factory: NativeReflectionFactory;
  private readonly byWrapper = new WeakMap<NativeReflectionWrapper, OriginalRigidBodyProperties>();
  private active = false;
  private nestedAttempt = false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeRigidBodyReadingHost) {
    const base: NativeReflectionRoot = Object.freeze({ className: 'eCRigidBodyBase_PS', baseClassName: 'eCEntityPropertySet',
      fields: Object.freeze([Object.freeze({ ...rules.baseField })]) });
    fact(controller.registerRoot(base), 'Original RigidBodyBase metadata registration');
    const root: NativeReflectionRoot = Object.freeze({ className: 'eCRigidBody_PS', baseClassName: base.className,
      fields: Object.freeze(rules.fields.map(field => Object.freeze({ ...field }))) });
    this.factory = { root, nativeCategory: 'entity-property-set', cloneRoot: current => current === controller ? this.run(() => this.construct()) : unknown('Actual reflection controller required'),
      read: (wrapper, input) => this.run(() => this.read(wrapper, input)),
      getVersion: wrapper => {
        const properties = this.byWrapper.get(wrapper);
        if (!properties) return unknown('Actual installed RigidBody GetVersion receiver required');
        try { properties.exact(); return known(65); } catch (error) { return unknown(String(error)); }
      } };
    fact(controller.registerFactory(this.factory), 'Original concrete RigidBody factory registration');
  }
  private guard(): void { if (this.nestedAttempt) throw new Error('Host attempted reentrant RigidBody reading mutation'); }
  private run<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.nestedAttempt = true; return unknown('Reentrant RigidBody reading mutation unsupported'); }
    this.active = true; this.nestedAttempt = false;
    try { return this.controller.value(() => { this.guard(); const value = body(); this.guard(); return value; }); }
    finally { this.active = false; }
  }
  private note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  private call<T>(operation: string, source: string, callback: () => NativeValue<T>): T {
    this.guard(); const value = this.controller.effect(operation, source, callback); this.guard(); return value;
  }
  properties(wrapper: NativeReflectionWrapper): NativeValue<OriginalRigidBodyProperties> { return this.lookup(wrapper, true); }
  retainedProperties(wrapper: NativeReflectionWrapper): NativeValue<OriginalRigidBodyProperties> { return this.lookup(wrapper, false); }
  private lookup(wrapper: NativeReflectionWrapper, attached: boolean): NativeValue<OriginalRigidBodyProperties> {
    const properties = this.byWrapper.get(wrapper); if (!properties) return unknown('Actual retained RigidBody wrapper required');
    try { properties.exact(attached); return known(properties); } catch (error) { return unknown(String(error)); }
  }
  private actual(wrapper: NativeReflectionWrapper): OriginalRigidBodyProperties { return fact(this.properties(wrapper), 'Actual RigidBody receiver'); }
  private construct(): NativeReflectionWrapper {
    const wrapper = this.controller.allocateWrapper(this.factory, 'Engine:RigidBody Clone/30330a20');
    const properties = new OriginalRigidBodyProperties(wrapper, this); this.byWrapper.set(wrapper, properties);
    this.controller.retainNative(wrapper, properties.base);
    this.program(properties, 'constructor'); properties.bindMovementFacade();
    this.note('movement facade aliases actual known enum payload and nullable constructor vector', 'Engine:3032e900');
    properties.base.createBase(); this.note('RigidBody.Create inherited high validity bit/return1', 'Engine:3032de80');
    this.controller.setAllocationPhase(wrapper, 'created');
    this.controller.attachConstructedNative(wrapper, properties.base, 'Engine:3032f5d0', 'Engine:30330a20');
    this.controller.initializeProperties(wrapper, field => this.controller.value(() => {
      this.guard(); properties.exact(); this.field(field);
      if (field.typeName === 'float') properties.storage.writeFloat(field.nativeOffset, 0);
      else if (field.typeName === 'bool') properties.storage.writeByte(field.nativeOffset, 0);
      else if (field.typeName === 'bCVector') properties.storage.writeVector(field.nativeOffset, [0, 0, 0]);
      else if (field.name === 'BodyFlag') properties.storage.writeUint(field.nativeOffset + 4,
        uint(this.call('container default virtual+18 reads actual enum default', field.defaultInitializer!, () => this.host.bodyFlagDefault())));
      else throw new Error('Unexamined default descriptor type');
      this.note('physical descriptor default ' + field.name, field.defaultInitializer!);
    }), () => this.controller.value(() => this.program(properties, 'postInitialize')), 'Engine:3032e810');
    return wrapper;
  }
  private field(field: NativeReflectionField): void {
    const base = this.controller.resolveRoot('eCRigidBodyBase_PS');
    if (!this.factory.root.fields.includes(field) && !base?.fields.includes(field)) throw new Error('Actual original RigidBody descriptor required');
  }
  private program(properties: OriginalRigidBodyProperties, stage: string): void {
    const program = rules.programs.find(value => value.stage === stage); if (!program) throw new Error('Unexamined source stage ' + stage);
    let capturedContainerAssignment = false;
    for (const operation of program.operations) {
      this.guard(); const source = (operation.module ?? program.module) + ':' + operation.sourceVA;
      switch (operation.kind) {
        case 'integerStore': properties.storeInteger(operation.offset!, operation.bytes!, operation.value!); break;
        case 'float32Store': properties.storage.writeFloat(operation.offset!, operation.value!); break;
        case 'maskedAssign':
          if (operation.offset !== 0x10) throw new Error('Unexamined masked base flag field');
          properties.base.baseFlags.value = (properties.base.baseFlags.value & ~0x0f) | 1; properties.base.baseFlags.knownMask |= 0x0f; break;
        case 'mathDefaultConstructor': break; // Audited native no-op, bytes stay unknown.
        case 'vectorClear': properties.storage.writeVector(operation.receiverOffset!, [0, 0, 0]); break;
        case 'quaternionClear': properties.storage.writeQuaternion(operation.receiverOffset!, [0, 0, 0, 1]); break;
        case 'enumDefaultRead': properties.storage.writeUint(0x7c, uint(this.call('constructor enum-default DWORD30aebf38',
          (operation.module ?? program.module) + ':' + operation.readSource!.va.replace('0x', ''), () => this.host.bodyFlagDefault()))); break;
        case 'captureContainerAssignment':
          if (operation.offset !== 0x78 || properties.nativeVtables.get(0x78) !== 0x3085fe0c) throw new Error('Actual captured original container assignment vtable required');
          capturedContainerAssignment = true; break;
        case 'containerZeroAssignment':
          if (!capturedContainerAssignment) throw new Error('Actual prior captured container assignment required');
          properties.storage.writeUint(0x7c, 0); break;
        case 'sourceStackTemporary': break; // Audited stack vtable/value writes and base destructor: no persistent object effect.
        case 'call':
          if (operation.role === 'invalidate') this.program(properties, 'invalidate');
          else if (operation.role === 'baseConstructor') this.program(properties, 'baseConstructor');
          else if (operation.role === 'basePostInitialize') this.program(properties, 'basePostInitialize');
          else if (operation.role !== 'sourceNoOp') throw new Error('Unexamined source helper call ' + operation.role);
          break;
        default: throw new Error('Unimplemented original RigidBody operation ' + operation.kind);
      }
      this.note(operation.kind + ' ' + (operation.offset ?? operation.receiverOffset ?? operation.role ?? ''), source);
    }
  }
  private notify(properties: OriginalRigidBodyProperties, phase: 'enter' | 'exit', name: string, propagated: boolean): void {
    properties.exact();
    const owner = properties.base.owner.read(); if (owner !== null) { owner.propertyOwner.modified(); this.note('outer owner.Modified pure read ' + phase, 'Engine:NotifyEx'); }
    this.note('captured RigidBody OnNotify ' + phase + ' propagated=' + propagated + ' ' + name,
      phase === 'enter' ? 'Engine:OnNotifyEnterEx' : 'Engine:3032e610');
    if (phase === 'exit' && propagated) { this.note('propagated=true custom Exit immediate return1', 'Engine:3032e610'); return; }
    if (phase === 'exit') {
      const current = properties.base.owner.read();
      if (current === null) { this.note('custom Exit actual ownerNULL return1', 'Engine:3032e610'); return; }
      if (name !== 'StartVelocity') throw new Error('Unexamined local custom mass/flag notification');
      for (const literal of ['TotalMass', 'BodyFlag'] as const) {
        const temporary: NativeRigidBodyTemporaryCString = this.call<NativeRigidBodyTemporaryCString>('local Exit temporary CString(' + name + ')', 'Engine:3032e610',
          () => this.host.constructPropertyName?.('StartVelocity') ?? unknown('Actual CString ownership service unresolved'));
        if (temporary.text !== name || !temporary.identity) throw new Error('Actual captured property-name CString required');
        const comparison = this.call<number>('captured CString.Compare(' + literal + ')', 'Engine:3032e610', () => temporary.compare(literal));
        this.call('temporary property-name CString destructor', 'Engine:3032e610',
          () => this.host.destroyPropertyName?.(temporary) ?? unknown('Actual CString destruction service unresolved'));
        if (!Number.isInteger(comparison) || comparison < -0x80000000 || comparison > 0x7fffffff || comparison === 0) {
          throw new Error('Original ASCII StartVelocity differs from both custom-handler names');
        }
      }
    }
    const second = properties.base.owner.read(); if (second !== null) { second.propertyOwner.modified(); this.note('inherited inner owner.Modified pure read ' + phase, 'Engine:OnNotifyEx'); }
    this.note('SharedBase inherited OnNotify true', 'Engine:OnNotifyEx');
  }
  liveOwnerRange(properties: OriginalRigidBodyProperties): NativeValue<number> {
    try {
      properties.exact(); const owner = properties.base.owner.read(); if (owner === null) throw new Error('Original owner/range NULL dereference outside selected profile');
      if ((uint(owner.flags.knownMask) & 0x80) !== 0x80) throw new Error('Actual processing-range flag0x80 is unknown');
      return known((uint(owner.flags.value) >>> 7) & 1);
    } catch (error) { return unknown(String(error)); }
  }
  pendingBuffer(properties: OriginalRigidBodyProperties): NativeValue<NativePendingPhysicsBuffer> {
    try {
      properties.exact(); const owner = properties.base.owner.read(); if (owner === null) throw new Error('Original GetBuffer ownerNULL path requires actual scene service');
      return this.host.pendingBuffer?.(owner) ?? unknown('Original GetBuffer lookup/creation/lifetime service unresolved');
    } catch (error) { return unknown(String(error)); }
  }
  localVelocityNotification(properties: OriginalRigidBodyProperties, phase: 'enter' | 'exit'): NativeValue<void> {
    return this.run(() => this.notify(properties, phase, 'StartVelocity', false));
  }
  onAdded(properties: OriginalRigidBodyProperties): NativeValue<void> {
    return this.run(() => {
      properties.exact();
      const owner = properties.base.owner.read();
      this.note('OnAdded first actual GetEntity read', 'Engine:3032dab9');
      const template = this.call<NativeLiveEntity | null>('eCEntity -> eCTemplateEntity dynamic_cast', 'Engine:3032dabc',
        () => this.host.templateOwner?.(owner) ?? unknown('Actual template RTTI cast service unresolved'));
      if (template !== null) {
        if (template !== owner) throw new Error('Selected same-owner template base cast profile required');
        this.note('template owner branch returns without transform/base hook', 'Engine:3032dac6'); return;
      }
      const positionOwner = properties.base.owner.read();
      this.note('OnAdded second actual GetEntity read', 'Engine:3032dadb');
      if (positionOwner === null) throw new Error('Original NULL position-owner dereference outside selected profile');
      const position = this.call<NativeMovementVector>('actual owner.GetWorldPosition', 'Engine:3032dadf',
        () => this.host.worldPosition?.(positionOwner) ?? unknown('Actual world position service unresolved'));
      properties.storage.writeVector(0x9c, position); this.note('Vector assignment into physical pose+9c', 'Engine:3032dae7');
      const rotationOwner = properties.base.owner.read();
      this.note('OnAdded third actual GetEntity read', 'Engine:3032daf9');
      if (rotationOwner === null) throw new Error('Original NULL rotation-owner dereference outside selected profile');
      const rotation = this.call<NativeRigidBodyTemporaryQuaternion>('actual owner.GetWorldRotation temporary', 'Engine:3032dafd',
        () => this.host.worldRotation?.(rotationOwner) ?? unknown('Actual world rotation/temporary ownership service unresolved'));
      if (!rotation.identity || rotation.raw.length !== 16) throw new Error('Actual four-DWORD temporary Quaternion required');
      for (let index = 0; index < 4; index++) {
        properties.storage.writeRaw(0xa8 + index * 4, rotation.raw.slice(index * 4, index * 4 + 4));
        this.note('captured temporary Quaternion DWORD copy+' + index * 4, 'Engine:' + ['3032db04', '3032db0d', '3032db16', '3032db23'][index]);
      }
      this.note('actual temporary Quaternion destructor10025c10 literalRET', 'Engine:3032db29');
      properties.storage.writeVector(0xb8, properties.storage.vector(0x9c)); this.note('finite binary32 Vector assignment+9c -> +b8', 'Engine:3032db38');
      for (let index = 0; index < 4; index++) {
        properties.storage.writeRaw(0xc4 + index * 4, properties.storage.raw(0xa8 + index * 4, 4));
        this.note('physical Quaternion pose DWORD copy+' + index * 4, 'Engine:' + ['3032db47', '3032db4c', '3032db52', '3032db59'][index]);
      }
      this.note('actual inherited OnAdded no-op tail', 'Engine:3032db63');
    });
  }
  private readVector(properties: OriginalRigidBodyProperties, stream: NativeEntityByteInput, at: number, source: string): void {
    // Source operator<< reads/writes each component before the next stream read.
    for (let index = 0; index < 3; index++) {
      properties.storage.writeFloat(at + index * 4, stream.f32());
      this.note('stream physical vector component+' + (at + index * 4).toString(16), source);
    }
  }
  private read(wrapper: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    this.actual(wrapper);
    return this.controller.readWrapperProperties(wrapper, input, { wrapperSource: 'Engine:303300f0', dataSource: 'Engine:30332d20',
      readField: (field, stream) => this.controller.value(() => {
        this.guard(); this.field(field); stream.u16(); stream.u32();
        this.note('descriptor version/size consumed without seeking ' + field.name, 'Engine:' + field.reader);
        this.notify(this.actual(wrapper), 'enter', field.name, true); const destination = this.actual(wrapper);
        if (field.typeName === 'bool') destination.storage.writeByte(field.nativeOffset, Number(stream.bool()));
        else if (field.typeName === 'float') destination.storage.writeFloat(field.nativeOffset, stream.f32());
        else if (field.typeName === 'bCVector') this.readVector(destination, stream, field.nativeOffset, 'Engine:' + field.reader);
        else if (field.name === 'BodyFlag') {
          const version = stream.u16(); this.note('BodyFlag native container Read version ' + version, 'Engine:BodyFlag::Read');
          destination.storage.writeUint(field.nativeOffset + 4, stream.u32());
        } else throw new Error('Unexamined descriptor payload reader');
        this.note('same physical descriptor payload write ' + field.name, 'Engine:' + field.reader);
        this.notify(this.actual(wrapper), 'exit', field.name, true);
      }), readNative: stream => this.controller.value(() => {
        this.guard(); const destination = this.actual(wrapper), version = stream.u16();
        this.note('native RigidBody Read version ' + version, 'Engine:3032dec0');
        const bool = (at: number): void => { destination.storage.writeByte(at, Number(stream.bool())); this.note('native tail bool+' + at.toString(16), 'Engine:3032dec0'); };
        if (version >= 40) { bool(0x80); bool(0x82); }
        if (version >= 41) bool(0x83);
        if (version >= 51) for (const at of [0x84, 0x90]) {
          this.readVector(destination, stream, at, 'Engine:3032dec0');
        }
        if (version >= 55) for (const at of [0xb8, 0x9c]) {
          destination.storage.writeRaw(at, stream.take(28)); this.note('native raw28-byte pose+' + at.toString(16), 'Engine:3032dec0');
        }
        if (version >= 65) bool(0x81);
        this.note('native Read returns1; no base reader/reset', 'Engine:3032dec0');
      }) });
  }
}

/** Original verified packet only. Leaves the outer sentinel; no Add, PostRead,
 * scene insertion or physics creation occurs through this convenience call. */
export async function readOriginalHeroRigidBody(reader: OriginalRigidBodyReader): Promise<NativeValue<{
  accessor: NativeReflectionAccessor; properties: OriginalRigidBodyProperties; input: NativeEntityByteInput;
  outerVersion: 65; worldResident: false;
}>> {
  const document = await loadOriginalReflectionSerialized(); const packet = originalReflectionPropertyInput(document, 'PC_Hero', rules.sourceHero.index);
  if (packet.outerVersion !== 65 || packet.source.nativeReadVersion !== 65 || packet.source.className !== 'eCRigidBody_PS' ||
      packet.source.serializedSha256 !== rules.sourceHero.packetSha256) return unknown('Original Hero RigidBody packet differs');
  const accessor = reader.controller.readAccessor(packet.input); if (!accessor.known) return accessor;
  const wrapper = accessor.value.instance; if (wrapper === null) return unknown('Original Hero RigidBody accessorNULL');
  const properties = reader.properties(wrapper); if (!properties.known) return properties;
  return known({ accessor: accessor.value, properties: properties.value, input: packet.input, outerVersion: 65, worldResident: false });
}
