/** Real detached CharacterSensor_PS construction and current native reading.
 * No serialized candidate is made resident by this factory. All live values,
 * references, movement pointer and vector views share one physical store. */
import rulesText from '../../assets/gothic3/sensor-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyObjectReference } from './entity-lifecycle';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionWrapper } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import type { NativeCharacterMovement, NativeMovementQuaternion, NativeMovementSensor, NativeMovementVector } from './movement-state';

const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; propertyType: number;
  getVersion: number; nativeBytes: number; nativeVtable: string; wrapperVtable: string; fields: unknown[] };
if (rules.schema !== 'gothic3-sensor-reading-rules-v1' || rules.propertyType !== 23 || rules.getVersion !== 2 ||
    rules.nativeBytes !== 96 || rules.nativeVtable !== '206884e4' || rules.wrapperVtable !== '2068872c' || rules.fields.length !== 0 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original Sensor source evidence differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const nativeReadPermission = Symbol('actual guarded Sensor native virtual Read');
function fact<T>(value: NativeValue<T>, operation: string): T { if (!value.known) throw new Error(operation + ': ' + value.reason); return value.value; }
function uint(value: number, maximum = 0xffffffff): number {
  if (!Number.isInteger(value) || value < 0 || value > maximum) throw new Error('Original unsigned field value required'); return value;
}
function vectorBytes(value: NativeMovementVector | NativeMovementQuaternion, length: 3 | 4): Uint8Array {
  if (value.length !== length) throw new Error('Actual Sensor float32 vector width required');
  const raw = new Uint8Array(length * 4), view = new DataView(raw.buffer);
  value.forEach((number, index) => { if (!Number.isFinite(number) || !Object.is(number, Math.fround(number))) throw new Error('Finite original float32 setter profile required'); view.setFloat32(index * 4, number, true); });
  return raw;
}
export interface NativeSensorReadingHost {
  /** Actual ProcessPlayerMovements receiver, including collision and control
   * services. No missing process body is inferred to be an empty callback. */
  processPlayerMovements?(sensor: OriginalSensorProperties): NativeValue<void>;
}
export class OriginalSensorProperties implements NativeMovementSensor {
  readonly numericBytes = new Uint8Array(0x60);
  readonly knownMask = new Uint8Array(0x60);
  private readonly view = new DataView(this.numericBytes.buffer);
  readonly base: NativeLivePropertySet<OriginalSensorProperties>;
  private owner: NativeLiveEntity | null = null;
  private propertyObject: NativePropertyObjectReference | null = null;
  private movementPointer: NativeCharacterMovement | null = null;
  private movementInitialized = false;
  private constructed = false;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalSensorReader) {
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', 'gCCharacterSensor_PS', 23, this,
      { read: () => this.owner, write: owner => { this.owner = owner; this.pointerBits(0xc, owner); } }, null,
      { added: candidate => this.callback(candidate, 'Engine:3002d713'), removed: candidate => this.callback(candidate, 'Engine:3000c0c7'),
        postRead: candidate => this.callback(candidate, 'Engine:3003d10e') }, () => known(false));
    Object.defineProperty(this.base, 'referenceWord', { get: () => this.dword(8), set: value => this.putWord(8, value) });
    Object.defineProperty(this.base, 'wrapper', { get: () => this.propertyObject, set: value => { this.propertyObject = value; this.pointerBits(4, value); } });
    Object.defineProperties(this.base.baseFlags, {
      value: { get: () => this.view.getUint8(0x10), set: value => this.view.setUint8(0x10, uint(value) & 255) },
      knownMask: { get: () => this.knownMask[0x10], set: value => { this.knownMask[0x10] = uint(value) & 255; } },
    });
  }
  private callback(candidate: NativeLivePropertySet<object>, source: string): NativeValue<void> {
    return this.reader.run(() => { this.exact(); if (candidate !== this.base) throw new Error('Actual Sensor lifecycle receiver required');
      this.reader.note('actual inherited empty Sensor lifecycle callback', source); });
  }
  private require(offset: number, size: number): void {
    if (!this.knownMask.subarray(offset, offset + size).every(value => value === 255)) throw new Error('Sensor field bits remain unknown+' + offset.toString(16));
  }
  private putWord(offset: number, value: number): void { this.view.setUint32(offset, uint(value), true); this.knownMask.fill(255, offset, offset + 4); }
  private dword(offset: number): number { this.require(offset, 4); return this.view.getUint32(offset, true); }
  private putByte(offset: number, value: number): void { this.view.setUint8(offset, uint(value, 255)); this.knownMask[offset] = 255; }
  private byte(offset: number): number { this.require(offset, 1); return this.view.getUint8(offset); }
  private raw(offset: number, bytes: Uint8Array): void { this.numericBytes.set(bytes, offset); this.knownMask.fill(255, offset, offset + bytes.length); }
  private pointerBits(offset: number, pointer: object | null): void { if (pointer === null) this.putWord(offset, 0); else this.knownMask.fill(0, offset, offset + 4); }
  private readVector(offset: number): NativeMovementVector { this.require(offset, 12); return [this.view.getFloat32(offset, true), this.view.getFloat32(offset + 4, true), this.view.getFloat32(offset + 8, true)]; }
  exact(attached = true): void {
    if (this.base.values !== this || this.base.className !== 'gCCharacterSensor_PS' || this.wrapper.deleted ||
        (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper))) throw new Error('Actual retained Sensor physical property set required');
  }
  construct(): void {
    this.exact(false); if (this.constructed) throw new Error('Fresh Sensor constructor receiver required');
    this.constructed = true; this.putWord(0, 0x206884e4); this.putWord(4, 0); this.putWord(8, 1); this.putWord(0xc, 0);
    this.view.setUint8(0x10, 1); this.knownMask[0x10] = 0x0f;
    this.reader.note('RefBase count1/NULL wrapper and EntityPS masked flags/NULL owner; concrete vtable', 'Game:20237a40');
    // Native no-argument vector/quaternion constructors make no data writes.
    this.reader.note('four embedded vector and quaternion no-data constructors', 'Game:20237a40');
    this.resetFields('Game:20237a40');
  }
  private resetFields(source: 'Game:20237a40' | 'Game:202376d0'): void {
    this.movementPointer = null; this.movementInitialized = true; this.putWord(0x3c, 0); this.reader.note('movement pointer+3c NULL', source);
    for (const offset of [0x41, 0x38, 0x39]) { this.putByte(offset, 1); this.reader.note('Sensor rawbyte+' + offset.toString(16) + '=1', source); }
    for (const offset of [0x14, 0x20, 0x2c, 0x44]) { this.raw(offset, new Uint8Array(12)); this.reader.note('embedded vector Clear+' + offset.toString(16), 'SharedBase:10005ae7'); }
    this.raw(0x50, vectorBytes([0, 0, 0, 1], 4)); this.reader.note('Quaternion.Clear XYZ0/W1 original constant', 'SharedBase:10025dc0');
    this.putByte(0x40, 0); this.reader.note('Sensor rawbyte40 clear', source);
  }
  invalidate(): NativeValue<void> {
    return this.reader.run(() => { this.exact(); this.resetFields('Game:202376d0'); });
  }
  readNative(input: NativeEntityByteInput): NativeValue<void> {
    return this.reader.run(() => fact(this.readNativeInternal(input, nativeReadPermission), 'Sensor native derived Read'));
  }
  /** Same derived virtual read inside the already guarded wrapper chain. */
  readNativeInternal(input: NativeEntityByteInput, permission: symbol): NativeValue<void> {
    return this.reader.controller.value(() => {
      if (permission !== nativeReadPermission) throw new Error('Actual guarded Sensor derived read capability required');
      this.reader.guard();
      this.exact(); const version = input.u16(); this.reader.note('derived Sensor.Read version consumed', 'Game:20236e30');
      if (version < 2) return;
      for (const offset of [0x14, 0x20, 0x2c]) { this.raw(offset, input.take(12)); this.reader.note('native Vector raw12 read+' + offset.toString(16), 'Game:20236e30'); }
      for (const offset of [0x38, 0x39, 0x40, 0x41]) { this.putByte(offset, Number(input.bool())); this.reader.note('native canonical bool read+' + offset.toString(16), 'Game:20236e30'); }
      this.raw(0x44, input.take(28)); this.reader.note('ONE native stream virtual Read28 at44: position12 and quaternion16', 'Game:20236e9b');
      this.reader.guard();
    });
  }
  get movement(): NativeCharacterMovement | null {
    if (!this.movementInitialized) throw new Error('Sensor movement pointer capability remains uninitialized');
    return this.movementPointer;
  }
  set movement(value: NativeCharacterMovement | null) {
    this.reader.guard(); this.exact(); this.movementPointer = value; this.movementInitialized = true; this.pointerBits(0x3c, value); this.reader.note('actual SetMovement_PS pointer+3c', 'Game:20236b60');
  }
  get position(): NativeMovementVector { return this.readVector(0x14); }
  set position(value: NativeMovementVector) { this.reader.guard(); this.exact(); this.raw(0x14, vectorBytes(value, 3)); }
  get previousPosition(): NativeMovementVector { return this.readVector(0x20); }
  get thirdPositionVector(): NativeMovementVector { return this.readVector(0x2c); }
  get goalPosition(): NativeMovementVector { return this.readVector(0x44); }
  get goalRotation(): NativeMovementQuaternion {
    this.require(0x50, 16); return [this.view.getFloat32(0x50, true), this.view.getFloat32(0x54, true), this.view.getFloat32(0x58, true), this.view.getFloat32(0x5c, true)];
  }
  set goalRotation(value: NativeMovementQuaternion) { this.reader.guard(); this.exact(); this.raw(0x50, vectorBytes(value, 4)); }
  get postProcessByte(): number { return this.byte(0x40); }
  set postProcessByte(value: number) {
    this.reader.guard(); this.exact(); if (value !== 0) throw new Error('Original Sensor.PostProcessMovements only clears byte40');
    this.putByte(0x40, 0); this.reader.note('actual PostProcessMovements rawbyte40 clear', 'Game:20236f40');
  }
  get processByte39(): number { return this.byte(0x39); }
  get processByte41(): number { return this.byte(0x41); }
  setGoalPosition(position: NativeMovementVector, changedByte: number): NativeValue<void> {
    return this.reader.run(() => {
      this.exact(); const bytes = vectorBytes(position, 3); uint(changedByte, 255);
      if (this.goalPosition.some((number, index) => number !== position[index])) {
        this.raw(0x44, bytes); this.reader.note('SetGoalPosition captured Vector assignment at44', 'Game:20236cbc');
        this.putByte(0x40, 1); this.reader.note('SetGoalPosition byte40=1', 'Game:20236cc5');
      }
      if (this.byte(0x39) === 0 || changedByte === 0 || this.byte(0x41) === 1) {
        this.raw(0x14, this.numericBytes.slice(0x44, 0x50)); this.reader.note('SetGoalPosition actual position copy44→14', 'Game:20236cda');
        this.raw(0x20, this.numericBytes.slice(0x14, 0x20)); this.reader.note('SetGoalPosition previous copy14→20', 'Game:20236ce6');
        this.putByte(0x41, 0); this.reader.note('SetGoalPosition byte41=0', 'Game:20236cf0');
      }
    });
  }
  process(): NativeValue<void> {
    return this.reader.run(() => { this.exact(); this.reader.call('actual Sensor.ProcessPlayerMovements body', 'Game:20023506', () => this.reader.host.processPlayerMovements?.(this)); });
  }
}
export class OriginalSensorReader {
  readonly factory: NativeReflectionFactory;
  private readonly retained = new WeakMap<NativeReflectionWrapper, OriginalSensorProperties>();
  private active = false;
  private nestedAttempt = false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeSensorReadingHost = {}) {
    this.factory = { nativeCategory: 'entity-property-set', root: Object.freeze({ className: 'gCCharacterSensor_PS', baseClassName: 'eCEntityPropertySet', fields: Object.freeze([]) }),
      cloneRoot: current => current === controller ? this.run(() => this.construct()) : missing('Actual Sensor reflection controller required'),
      getVersion: wrapper => controller.value(() => { this.actual(wrapper).exact(); return 2; }),
      read: (wrapper, input) => this.run(() => {
        const value = this.actual(wrapper); value.exact();
        return controller.readWrapperProperties(wrapper, input, { wrapperSource: 'Game:20005f1a', dataSource: 'Game:20012418',
          readField: () => missing('Original Sensor current field table is empty; obsolete descriptor handler unresolved'),
          readNative: stream => value.readNativeInternal(stream, nativeReadPermission) });
      }),
    };
    fact(controller.registerFactory(this.factory), 'Actual Sensor class factory registration');
  }
  guard(): void {
    if (this.nestedAttempt) throw new Error('Host attempted reentrant Sensor reading mutation');
    const required = this.controller.receipt().required; if (required !== null) throw new Error(required);
  }
  run<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.nestedAttempt = true; return this.controller.value(() => { throw new Error('Reentrant Sensor reading mutation unsupported'); }); }
    this.active = true; this.nestedAttempt = false;
    try { return this.controller.value(() => { this.guard(); const result = body(); this.guard(); return result; }); } finally { this.active = false; }
  }
  note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  call<T>(operation: string, source: string, callback: () => NativeValue<T> | undefined): T { this.guard(); const result = this.controller.effect(operation, source, callback); this.guard(); return result; }
  private actual(wrapper: NativeReflectionWrapper): OriginalSensorProperties {
    const value = this.retained.get(wrapper); if (!value) throw new Error('Actual retained Sensor allocation required'); return value;
  }
  properties(wrapper: NativeReflectionWrapper, attached = true): NativeValue<OriginalSensorProperties> {
    const value = this.retained.get(wrapper); if (!value) return missing('Actual retained Sensor allocation required');
    try { value.exact(attached); return known(value); } catch (error) { return missing(String(error)); }
  }
  private construct(): NativeReflectionWrapper {
    const wrapper = this.controller.allocateWrapper(this.factory, 'Game:2023a480'), value = new OriginalSensorProperties(wrapper, this);
    this.retained.set(wrapper, value); value.construct(); this.controller.retainNative(wrapper, value.base);
    value.base.createBase(); this.note('Sensor.Create inherited EntityPS/RefBase Create; literal1', 'Game:20236e00');
    this.controller.setAllocationPhase(wrapper, 'created'); this.controller.attachConstructedNative(wrapper, value.base, 'Game:20238b80', 'Game:202396e0');
    this.controller.initializeProperties(wrapper, () => missing('Empty native Sensor descriptor table'), () => {
      value.exact(); this.note('Sensor PostInitialize inherited RefBase literal1', 'Game:20236df0'); return known(undefined);
    }, 'Game:20236df0');
    return wrapper;
  }
}
