/** Installed CharacterControl concrete factory/current Hero read. Detached
 * construction is not world residency or native keyboard event dispatch. */
import rulesText from '../../assets/gothic3/control-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyCallbacks } from './entity-lifecycle';
import { NativeReflectionWrapper, loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionAccessor } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import type { NativePlayerWishedMovement, NativePlayerPressedEvent } from './player-state';

interface SourceOperation { kind: string; sourceVA: string; module: string; offset?: number; value?: number;
  bytes?: number; receiverOffset?: number; role?: string; global?: 'ControlFrameOfReference' | 'PressedKey' }
interface Program { stage: string; operations: readonly SourceOperation[] }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; nativeBytes: number;
  getVersion: number; propertyType: number; nativeVtable: string; wrapperVtable: string;
  fields: readonly NativeReflectionField[]; programs: readonly Program[]; matrixIdentityRaw: string;
  sourceHero: { index: number; packetSha256: string }; sources: { allocate: string; attach: string; wrapperRead: string; dataRead: string } };
if (rules.schema !== 'gothic3-control-reading-rules-v1' || rules.propertyType !== 22 || rules.getVersion !== 2 ||
    rules.nativeBytes !== 0xb0 || rules.nativeVtable !== '20686abc' || rules.fields.length !== 5 || rules.sourceHero.index !== 4 ||
    rules.wrapperVtable !== '20686c5c' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original CharacterControl receipt differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(result: NativeValue<T>, name: string): T { if (!result.known) throw new Error(name + ': ' + result.reason); return result.value; }
function uint(value: number): number { if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original uint32 required'); return value; }
function raw(value: string): Uint8Array { if (!/^(?:[0-9a-f]{2})+$/.test(value)) throw new Error('Original raw bytes required'); return Uint8Array.from(value.match(/../g)!, part => parseInt(part, 16)); }

export class NativeControlBytes {
  readonly bytes: Uint8Array; readonly knownMask: Uint8Array;
  private readonly view: DataView;
  revision = 0;
  constructor(readonly size: number = 0xb0) {
    if (!Number.isInteger(size) || size <= 0) throw new Error('Physical native byte allocation required');
    this.bytes = new Uint8Array(size); this.knownMask = new Uint8Array(size); this.view = new DataView(this.bytes.buffer);
  }
  private range(at: number, size: number): void {
    if (!Number.isInteger(at) || !Number.isInteger(size) || at < 0 || size < 0 || at + size > this.size) throw new Error('Native Control byte range differs');
  }
  has(at: number, size: number): boolean {
    this.range(at, size); return this.knownMask.subarray(at, at + size).every(mask => mask === 255);
  }
  private need(at: number, size: number): void { if (!this.has(at, size)) throw new Error('Unknown original Control bytes+' + at.toString(16)); }
  byte(at: number): number { this.need(at, 1); return this.view.getUint8(at); }
  uint(at: number): number { this.need(at, 4); return this.view.getUint32(at, true); }
  float(at: number): number { this.need(at, 4); const value = this.view.getFloat32(at, true); if (!Number.isFinite(value)) throw new Error('Finite binary32 profile required'); return value; }
  writeByte(at: number, value: number): void { this.range(at, 1); if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Native byte required'); this.view.setUint8(at, value); this.knownMask[at] = 255; this.revision++; }
  writeUint(at: number, value: number): void { this.range(at, 4); this.view.setUint32(at, uint(value), true); this.knownMask.fill(255, at, at + 4); this.revision++; }
  writeFloat(at: number, value: number): void { this.range(at, 4); if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new Error('Finite binary32 profile required'); this.view.setFloat32(at, Math.fround(value), true); this.knownMask.fill(255, at, at + 4); this.revision++; }
  writeRaw(at: number, values: Uint8Array, masks?: Uint8Array): void {
    this.range(at, values.length); if (masks && (masks.length !== values.length || masks.some(mask => mask !== 0 && mask !== 255))) throw new Error('Exact byte masks required');
    this.bytes.set(values, at); if (masks) this.knownMask.set(masks, at); else this.knownMask.fill(255, at, at + values.length); this.revision++;
  }
  unknownPointer(at: number): void { this.range(at, 4); this.knownMask.fill(0, at, at + 4); this.revision++; }
}

export interface NativeControlModuleSeed {
  frameDefault: NativeMaskedWord; keyDefault: NativeMaskedWord;
  identityGuard: NativeMaskedWord; identityBytes: Uint8Array; identityMasks: Uint8Array;
}
export interface NativeControlReadingHost {
  /** One retained Game/SharedBase module state across readers/clones. A cold
   * loader profile is explicitly distinct from a captured live native state. */
  module: OriginalControlModuleState;
  /** Source _atexit registration ATTEMPT, including real CRT effects. Native
   * return is ignored, so nonzero alone does not fail construction. */
  registerMatrixDestructor?(nativeAddress: '100e2910'): NativeValue<number>;
  disableProcessing?(incoming: NativeLiveEntity, disabled: false): NativeValue<void>;
}

/** Physical lazy Matrix.GetIdentity cache and current enum globals. Its cold
 * constructor follows source PE zero-fill; it never claims a running capture. */
export class OriginalControlModuleState {
  readonly frameDefault: NativeMaskedWord; readonly keyDefault: NativeMaskedWord;
  readonly identityGuard: NativeMaskedWord; readonly identity = new NativeControlBytes(64);
  constructor(seed: NativeControlModuleSeed) {
    this.frameDefault = { value: uint(seed.frameDefault.value), knownMask: uint(seed.frameDefault.knownMask) };
    this.keyDefault = { value: uint(seed.keyDefault.value), knownMask: uint(seed.keyDefault.knownMask) };
    this.identityGuard = { value: uint(seed.identityGuard.value), knownMask: uint(seed.identityGuard.knownMask) };
    if (seed.identityBytes.length !== 64) throw new Error('Actual shared MatrixIdentity cache requires64 bytes');
    this.identity.writeRaw(0, seed.identityBytes, seed.identityMasks);
  }
  static fromColdOriginalImage(): OriginalControlModuleState {
    return new OriginalControlModuleState({ frameDefault: { value: 0, knownMask: 0xffffffff }, keyDefault: { value: 0, knownMask: 0xffffffff },
      identityGuard: { value: 0, knownMask: 0xffffffff }, identityBytes: new Uint8Array(64), identityMasks: new Uint8Array(64).fill(255) });
  }
  enumDefault(name: 'ControlFrameOfReference' | 'PressedKey'): number {
    const store = name === 'PressedKey' ? this.keyDefault : this.frameDefault;
    if (uint(store.knownMask) !== 0xffffffff) throw new Error('Uncaptured current original enum-default DWORD ' + name); return uint(store.value);
  }
  getIdentity(read: OriginalControlReader): NativeControlBytes {
    read.requireMutationScope();
    if (read.host.module !== this) throw new Error('Same retained original module-state capability required');
    if ((uint(this.identityGuard.knownMask) & 1) !== 1) throw new Error('Original Matrix.GetIdentity guard bit is unknown');
    if ((uint(this.identityGuard.value) & 1) === 0) {
      this.identityGuard.value = (uint(this.identityGuard.value) | 1) >>> 0; this.identityGuard.knownMask = (uint(this.identityGuard.knownMask) | 1) >>> 0;
      read.write('MatrixIdentity global guard OR1 before cache writes', 'SharedBase:1004f431');
      const values = raw(rules.matrixIdentityRaw); if (values.length !== 64) throw new Error('Original MatrixIdentity constant table differs');
      const stores = rules.programs.find(program => program.stage === 'matrixIdentityGet')?.operations.filter(operation => operation.kind === 'copyOriginalConstantDWORDToCache');
      if (stores?.length !== 16) throw new Error('Original ordered MatrixIdentity stores differ');
      for (let index = 0; index < 16; index++) { this.identity.writeRaw(index * 4, values.slice(index * 4, index * 4 + 4)); read.write('MatrixIdentity source DWORD copy' + index, 'SharedBase:' + stores[index]!.sourceVA); }
      const result = read.effect<number>('original _atexit(Matrix destructor) attempt', 'SharedBase:1004f4f0',
        () => read.host.registerMatrixDestructor?.('100e2910') ?? unknown('Actual CRT matrix destructor registration unresolved'));
      if (!Number.isInteger(result) || result < -0x80000000 || result > 0x7fffffff) throw new Error('Native ignored CRT return must be signed32');
    }
    read.write('Matrix.GetIdentity returns same physical cache', 'SharedBase:1004f4f8'); return this.identity;
  }
}

export class OriginalControlProperties implements NativePlayerWishedMovement {
  readonly storage = new NativeControlBytes(); readonly nativeVtables = new Map<number, number>();
  owner: NativeLiveEntity | null = null;
  readonly base: NativeLivePropertySet<OriginalControlProperties>;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalControlReader) {
    const empty = (candidate: NativeLivePropertySet<object>): NativeValue<void> => candidate === this.base ? known(undefined) : unknown('Original Control callback receiver required');
    const callbacks: NativePropertyCallbacks = { added: empty, removed: empty, postRead: empty };
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', 'gCCharacterControl_PS', 22, this,
      { read: () => this.owner, write: incoming => { this.owner = incoming; } }, null, callbacks, () => known(false),
      incoming => reader.setEntity(this, incoming));
  }
  exact(attached = true): void {
    const allocation = this.wrapper.controller.allocations().find(value => value.wrapper === this.wrapper);
    if (this.wrapper.deleted || allocation?.propertySet !== this.base || this.base.values !== this ||
        (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper || this.nativeVtables.get(0) !== 0x20686abc ||
          this.nativeVtables.get(0x14) !== 0x206867cc || this.nativeVtables.get(0x1c) !== 0x206868a4))) throw new Error('Exact retained original Control allocation/store/vtables required');
  }
  get wishedMovementMode(): number { this.exact(); return this.storage.uint(0xac) | 0; }
  set wishedMovementMode(value: number) {
    fact(this.reader.setWishedMovement(this, value), 'Original same-store movement setter');
  }
  pressedEvent(): NativePlayerPressedEvent {
    const read = (at: number): NativeValue<number> => { try { this.exact(); return known(this.storage.byte(at)); } catch (error) { return unknown(String(error)); } };
    return { isPressed: () => read(0x24), isPressedBefore: () => read(0x25) };
  }
  storeInteger(at: number, size: number, value: number): void {
    if (at === 0 || at === 0x14 || at === 0x1c) { this.nativeVtables.set(at, uint(value)); this.storage.unknownPointer(at); }
    else if (at === 4 && size === 4 && value === 0) this.base.wrapper = null;
    else if (at === 8 && size === 4) this.base.referenceWord = uint(value);
    else if (at === 0xc && size === 4 && value === 0) this.owner = null;
    else if (size === 1) this.storage.writeByte(at, value);
    else if (size === 4) this.storage.writeUint(at, value);
    else throw new Error('Unexamined Control field width');
  }
}

export class OriginalControlReader {
  readonly factory: NativeReflectionFactory;
  private readonly retained = new WeakMap<NativeReflectionWrapper, OriginalControlProperties>();
  private active = false; private nestedAttempt = false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeControlReadingHost) {
    const root = Object.freeze({ className: 'gCCharacterControl_PS', baseClassName: 'eCEntityPropertySet', fields: Object.freeze(rules.fields.map(field => Object.freeze({ ...field }))) });
    this.factory = { root, nativeCategory: 'entity-property-set', cloneRoot: current => current === controller ? this.run(() => this.construct()) : unknown('Original same reflection controller required'),
      read: (wrapper, input) => this.run(() => this.read(wrapper, input)), getVersion: wrapper => {
        const value = this.properties(wrapper); return value.known ? known(2) : value;
      } };
    fact(controller.registerFactory(this.factory), 'Original CharacterControl factory registration');
  }
  private guard(): void {
    const required = this.controller.receipt().required; if (required !== null) throw new Error(required);
    if (this.nestedAttempt) throw new Error('Reentrant Control reader mutation attempted');
  }
  /** Internal shared-cache capability; callers use matrixIdentity(), which
   * establishes the same controller/reader operation scope. */
  requireMutationScope(): void { this.guard(); if (!this.active) throw new Error('Guarded original Control mutation scope required'); }
  private run<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.nestedAttempt = true; return unknown('Reentrant Control reader mutation unsupported'); }
    this.active = true; this.nestedAttempt = false;
    try { return this.controller.value(() => { this.guard(); const value = body(); this.guard(); return value; }); } finally { this.active = false; }
  }
  write(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  effect<T>(operation: string, source: string, callback: () => NativeValue<T>): T { this.guard(); const value = this.controller.effect(operation, source, callback); this.guard(); return value; }
  properties(wrapper: NativeReflectionWrapper): NativeValue<OriginalControlProperties> { return this.lookup(wrapper, true); }
  retainedProperties(wrapper: NativeReflectionWrapper): NativeValue<OriginalControlProperties> { return this.lookup(wrapper, false); }
  /** Same SharedBase global cache used before a Control clone as well as in its
   * constructor. Lazy CRT registration remains an ordered required service. */
  matrixIdentity(): NativeValue<NativeControlBytes> { return this.run(() => this.host.module.getIdentity(this)); }
  private lookup(wrapper: NativeReflectionWrapper, attached: boolean): NativeValue<OriginalControlProperties> {
    const value = this.retained.get(wrapper); if (!value) return unknown('Actual retained Control wrapper required');
    try { value.exact(attached); return known(value); } catch (error) { return unknown(String(error)); }
  }
  private actual(wrapper: NativeReflectionWrapper): OriginalControlProperties { return fact(this.properties(wrapper), 'Original Control receiver'); }
  private construct(): NativeReflectionWrapper {
    const wrapper = this.controller.allocateWrapper(this.factory, rules.sources.allocate), properties = new OriginalControlProperties(wrapper, this);
    this.retained.set(wrapper, properties); this.controller.retainNative(wrapper, properties.base);
    this.program(properties, 'constructor'); properties.base.createBase(); this.write('Control.Create inherited valid bit/return1', 'Game:20218290');
    this.controller.setAllocationPhase(wrapper, 'created'); this.controller.attachConstructedNative(wrapper, properties.base, rules.sources.attach, rules.sources.allocate);
    this.controller.initializeProperties(wrapper, field => this.controller.value(() => {
      this.guard(); properties.exact(); this.field(field);
      if (field.name === 'ControlFrameOfReference' || field.name === 'PressedKey') properties.storage.writeUint(field.nativeOffset + 4, this.host.module.enumDefault(field.name));
      else if (field.typeName === 'bool') properties.storage.writeByte(field.nativeOffset, 0);
      else if (field.typeName === 'long') properties.storage.writeUint(field.nativeOffset, 0);
      else throw new Error('Unexamined Control descriptor default');
      this.write('actual same descriptor default ' + field.name, field.defaultInitializer!);
    }), () => this.controller.value(() => this.program(properties, 'postInitialize')), 'Game:20218c80'); return wrapper;
  }
  private field(field: NativeReflectionField): void { if (!this.factory.root.fields.includes(field)) throw new Error('Exact original Control descriptor required'); }
  private program(properties: OriginalControlProperties, stage: string): void {
    const program = rules.programs.find(value => value.stage === stage); if (!program) throw new Error('Unexamined Control source stage ' + stage);
    const captured = new Set<number>(); let capturedMatrix: NativeControlBytes | null = null;
    for (const operation of program.operations) {
      this.guard(); properties.exact(false); const source = operation.module + ':' + operation.sourceVA;
      switch (operation.kind) {
        case 'integerStore': properties.storeInteger(operation.offset!, operation.bytes!, operation.value!); break;
        case 'float32Store': properties.storage.writeFloat(operation.offset!, operation.value!); break;
        case 'maskedAssign': properties.base.baseFlags.value = (properties.base.baseFlags.value & ~15) | 1; properties.base.baseFlags.knownMask |= 15; break;
        case 'mathDefaultConstructor': break;
        case 'enumDefaultRead': properties.storage.writeUint(operation.offset!, this.host.module.enumDefault(operation.global!)); break;
        case 'call': if (operation.role === 'baseConstructor' || operation.role === 'invalidate') this.program(properties, operation.role); else if (operation.role !== 'sourceNoOp') throw new Error('Unexamined Control helper ' + operation.role); break;
        case 'vectorClear': for (let index = 0; index < 3; index++) properties.storage.writeUint(operation.receiverOffset! + index * 4, 0); break;
        case 'captureMatrixIdentity': capturedMatrix = this.host.module.getIdentity(this); break;
        case 'assignMatrixRawDWORDs':
          if (!capturedMatrix) throw new Error('Actual prior captured SharedBase MatrixIdentity reference required');
          for (let index = 0; index < 16; index++) properties.storage.writeRaw(operation.receiverOffset! + index * 4,
            capturedMatrix.bytes.slice(index * 4, index * 4 + 4), capturedMatrix.knownMask.slice(index * 4, index * 4 + 4)); break;
        case 'captureContainerAssignment':
          if (![0x14, 0x1c].includes(operation.offset!) || properties.nativeVtables.get(operation.offset!) !== (operation.offset === 0x14 ? 0x206867cc : 0x206868a4)) throw new Error('Actual original container assignment vtable required'); captured.add(operation.offset!); break;
        case 'containerZeroAssignment': if (!captured.has(operation.offset!)) throw new Error('Actual prior container assignment capture required'); properties.storage.writeUint(operation.offset! + 4, 0); break;
        case 'sourceStackTemporary': break;
        default: throw new Error('Unimplemented source Control operation ' + operation.kind);
      }
      this.write(operation.kind + ' ' + (operation.offset ?? operation.receiverOffset ?? operation.role ?? ''), source);
    }
  }
  private notify(properties: OriginalControlProperties, phase: 'enter' | 'exit', name: string): void {
    properties.exact(); const owner = properties.base.owner.read(); if (owner !== null) { owner.propertyOwner.modified(); this.write('outer owner.Modified pure read ' + phase, 'Engine:NotifyEx'); }
    const second = properties.base.owner.read(); if (second !== null) { second.propertyOwner.modified(); this.write('inner owner.Modified pure read ' + phase, 'Engine:OnNotifyEx'); }
    this.write('inherited propagated notification returns true ' + name, 'Engine:OnNotifyEx');
  }
  setEntity(properties: OriginalControlProperties, incoming: NativeLiveEntity | null): NativeValue<void> {
    return this.run(() => {
      properties.exact(); properties.base.owner.write(incoming); this.write('inherited SetEntity physical owner assignment', 'Game:202181d0');
      if (incoming !== null) this.effect('captured incoming owner.DisableProcessing(false)', 'Game:202181d0',
        () => this.host.disableProcessing?.(incoming, false) ?? unknown('Actual original DisableProcessing service unresolved'));
    });
  }
  setWishedMovement(properties: OriginalControlProperties, value: number): NativeValue<void> {
    return this.run(() => {
      this.guard(); properties.exact();
      if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new Error('Original signed movement enum required');
      properties.storage.writeUint(0xac, value >>> 0);
      this.write('same physical wished movement DWORD+ac', 'Game:202182e0');
    });
  }
  private read(wrapper: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    this.actual(wrapper);
    return this.controller.readWrapperProperties(wrapper, input, { wrapperSource: rules.sources.wrapperRead, dataSource: rules.sources.dataRead,
      readField: (field, stream) => this.controller.value(() => {
        this.guard(); this.field(field); stream.u16(); stream.u32(); this.write('descriptor version/declared size consumed without seeking', field.reader);
        this.notify(this.actual(wrapper), 'enter', field.name); const destination = this.actual(wrapper);
        if (field.name === 'ControlFrameOfReference' || field.name === 'PressedKey') { stream.u16(); destination.storage.writeUint(field.nativeOffset + 4, stream.u32()); }
        else if (field.typeName === 'bool') destination.storage.writeByte(field.nativeOffset, Number(stream.bool()));
        else if (field.typeName === 'long') destination.storage.writeUint(field.nativeOffset, stream.u32());
        else throw new Error('Unexamined Control descriptor payload');
        this.write('same physical descriptor payload ' + field.name, field.reader); this.notify(this.actual(wrapper), 'exit', field.name);
      }), readNative: stream => this.controller.value(() => {
        this.guard(); const destination = this.actual(wrapper), version = stream.u16(); this.write('Control native version' + version, 'Game:20218d10');
        if (version >= 2) {
          for (const at of [0x2c, 0x30, 0x34, 0x38]) { destination.storage.writeFloat(at, stream.f32()); this.write('tail float+' + at.toString(16), 'Game:20218d10'); }
          for (const at of [0x3c, 0x40, 0x44, 0x48, 0x4c, 0x50]) { destination.storage.writeUint(at, stream.u32()); this.write('tail DWORD+' + at.toString(16), 'Game:20218d10'); }
          for (const at of [0x54, 0x55]) { destination.storage.writeByte(at, Number(stream.bool())); this.write('tail bool+' + at.toString(16), 'Game:20218d10'); }
          destination.storage.writeFloat(0x5c, stream.f32()); this.write('tail float+5c', 'Game:20218d10');
          destination.storage.writeRaw(0x60, stream.take(12)); this.write('tail ONE raw12-byte vector stream read', 'SharedBase:10025af0');
          destination.storage.writeRaw(0x6c, stream.take(64)); this.write('tail ONE raw64-byte matrix stream read', 'SharedBase:10029170');
        }
        this.write('native Read returns1 without baseRead/reset', 'Game:20218d10');
      }) });
  }
}

export async function readOriginalHeroControl(reader: OriginalControlReader): Promise<NativeValue<{
  accessor: NativeReflectionAccessor; properties: OriginalControlProperties; input: NativeEntityByteInput; outerVersion: 2; worldResident: false;
}>> {
  const document = await loadOriginalReflectionSerialized(), packet = originalReflectionPropertyInput(document, 'PC_Hero', 4);
  if (packet.outerVersion !== 2 || packet.source.nativeReadVersion !== 2 || packet.source.className !== 'gCCharacterControl_PS' ||
      packet.source.serializedSha256 !== rules.sourceHero.packetSha256) return unknown('Original Hero Control packet differs');
  const accessor = reader.controller.readAccessor(packet.input); if (!accessor.known) return accessor;
  const wrapper = accessor.value.instance; if (!wrapper) return unknown('Actual original Control wrapperNULL');
  const properties = reader.properties(wrapper); if (!properties.known) return properties;
  return known({ accessor: accessor.value, properties: properties.value, input: packet.input, outerVersion: 2, worldResident: false });
}
