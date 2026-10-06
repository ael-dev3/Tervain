/** Actual detached CharacterMovement factory, defaults and current reading.
 * Numeric storage is the SAME NativeMovementBytes consumed by Hero scripts.
 * Source pointers have retained identity sidecars, not fabricated JS addresses.
 * Successful allocation is the selected profile; unknown bytes remain unknown.
 * No construction/read operation establishes entity addition or world residency.
 */
import rulesText from '../../assets/gothic3/movement-reading/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeCharacterMovement, NativeMovementBytes } from './movement-state';
import type { NativeMovementServices, NativeMovementOwner, NativeMovementPointers, NativeMovementRigidBody,
  NativeMovementCollision, NativeMovementSensor } from './movement-state';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativePropertyCallbacks } from './entity-lifecycle';
import { NativeReflectionWrapper, loadOriginalReflectionSerialized, originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionController, NativeReflectionFactory, NativeReflectionField, NativeReflectionRoot,
  NativeReflectionAccessor } from './entity-reflection';
import type { NativeEntityByteInput } from './entity-reading';
import { OriginalEnclaveProxy } from './native-properties';

interface SourceOperation { kind: string; sourceVA?: string; offset?: string; receiverOffset?: string;
  bytes?: number; value?: number | string; role?: string; mask?: number; knownValueBits?: number;
  knownMask?: number; coordinates?: number[]; values?: number[]; symbol?: string }
interface SourceProgram { stage: string; body: string; operations: SourceOperation[] }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; nativeVersion: number; getVersion: number;
  propertyType: number; nativeVtable: string; wrapperVtable: string; fields: NativeReflectionField[];
  programs: SourceProgram[]; helperPrograms: Record<string, SourceOperation[]>;
  sourceHero: { propertySetIndex: number; packetSha256: string; outerVersion: number; nativeReadVersion: number } };
if (rules.schema !== 'gothic3-movement-reading-rules-v1' || rules.nativeVersion !== 76 || rules.getVersion !== 77 || rules.propertyType !== 21 ||
    rules.nativeVtable !== '20687e8c' || rules.wrapperVtable !== '206879c4' || rules.fields.length !== 36 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.programs.map(program => program.stage).join(',') !== 'constructor,invalidate,postInitialize') {
  throw new Error('Original CharacterMovement reader receipt differs');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, operation: string): T {
  if (!value.known) throw new Error(operation + ': ' + value.reason); return value.value;
}
function uint(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original uint32 required'); return value;
}
function offset(value: string | undefined): number {
  if (!value || !/^0x[0-9a-f]+$/i.test(value)) throw new Error('Audited physical offset required'); return parseInt(value, 16);
}
/** Captured native Application receiver. GetTotalTime reads its current DWORD
 * +510; it is not a timer tick, world date, wall clock or scaled frame seconds. */
export interface NativeMovementApplication { readonly identity: object; totalTime(): NativeValue<number> }
export interface NativeMovementTemporaryCString { readonly identity: object; readonly text: 'gCEffectModule' }
export interface NativeMovementModuleAdmin {
  /** Actual initialized admin or fully executed lazy singleton construction.
   * Original FindModule scans forward and returns the first matching entry. */
  findModule(name: NativeMovementTemporaryCString): NativeValue<object | null>;
}
export interface NativeMovementEffectModule {
  readonly identity: object;
  readonly virtuals: { system(receiver: NativeMovementEffectModule): NativeValue<object | null> };
}
/** Installed gCEffectModule vtable206667a4+bc→201153e0 is only the physical
 * system-pointer+14 read. Supplying this object does not register a module or
 * infer a loaded module's pointer from its fresh-constructor NULL default. */
export class OriginalMovementEffectModule implements NativeMovementEffectModule {
  readonly identity: object = this;
  readonly virtuals = Object.freeze({ system: (receiver: NativeMovementEffectModule): NativeValue<object | null> =>
    receiver instanceof OriginalMovementEffectModule ? known(receiver.systemPointer) : unknown('Captured installed effect module receiver required') });
  constructor(public systemPointer: object | null) {}
}
export interface NativeMovementReadingHost {
  readonly movementServices: NativeMovementServices;
  applicationInstance(): NativeValue<NativeMovementApplication | null>;
  /** These preserve temporary CString construction/destruction ownership at
   * their source locations. No unimplemented pool allocation is a no-op. */
  constructEffectModuleName(): NativeValue<NativeMovementTemporaryCString>;
  destroyEffectModuleName(name: NativeMovementTemporaryCString): NativeValue<void>;
  moduleAdminInstance(): NativeValue<NativeMovementModuleAdmin>;
  castEffectModule(candidate: object | null): NativeValue<NativeMovementEffectModule | null>;
  /** Same actual physical owner pointer, never a GUID/catalog lookup. */
  ownerView?(owner: NativeLiveEntity, access: boolean): NativeValue<NativeMovementOwner>;
}

/** Pointer slots and native metadata are identities. Byte-backed numeric reads
 * reject their nonnumeric bits. A NULL pointer has proven all-zero bytes. */
export class OriginalMovementAllocation {
  readonly storage = new NativeMovementBytes(new Uint8Array(0x3dc), new Uint8Array(0x3dc));
  readonly proxies = new Map<number, OriginalEnclaveProxy>();
  readonly nativeVtables = new Map<number, number>();
  private readonly pointerSlots = new Map<number, object | null>();
  readonly movement: NativeCharacterMovement;
  readonly base: NativeLivePropertySet<NativeCharacterMovement>;
  owner: NativeLiveEntity | null = null;
  private stringConstructed = false;
  private effectName: string | null = null;
  constructor(readonly wrapper: NativeReflectionWrapper, readonly reader: OriginalMovementReader) {
    const pointer = <T extends object>(at: number): T | null => {
      if (!this.pointerSlots.has(at)) throw new Error('Uninitialized native pointer+' + at.toString(16));
      return this.pointerSlots.get(at) as T | null;
    };
    const pointers: NativeMovementPointers = {
      get rigidBody() { return pointer<NativeMovementRigidBody>(0x170); }, set rigidBody(value: NativeMovementRigidBody | null) { allocation.pointer(0x170, value); },
      get collision() { return pointer<NativeMovementCollision>(0x174); }, set collision(value: NativeMovementCollision | null) { allocation.pointer(0x174, value); },
      get sensor() { return pointer<NativeMovementSensor>(0x178); }, set sensor(value: NativeMovementSensor | null) { allocation.pointer(0x178, value); },
      get effectName() { return allocation.effectName; }, set effectName(value) {
        allocation.effectName = value;
        if (value === '') allocation.pointer(0x3d8, null);
        else allocation.invalidateNumeric(0x3d8, 4);
      },
    };
    const allocation = this;
    // Preserve every existing service's receiver. Only owner resolves the
    // concrete PS's independently reread physical +c pointer.
    const services = new Proxy(reader.host.movementServices, { get(target, property) {
      if (property === 'owner') return (access: boolean): NativeValue<NativeMovementOwner | null> => {
        const current = allocation.base.owner.read();
        return current === null ? known(null) : reader.host.ownerView?.(current, access) ?? unknown('Concrete physical owner movement view unresolved');
      };
      const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
    this.movement = new NativeCharacterMovement(this.storage, pointers, services);
    const empty = (candidate: NativeLivePropertySet<object>): NativeValue<void> => candidate === this.base
      ? known(undefined) : unknown('Actual CharacterMovement callback receiver required');
    const callbacks: NativePropertyCallbacks = { added: empty, removed: empty,
      postRead: candidate => candidate === this.base ? reader.postRead(this) : unknown('Actual CharacterMovement PostRead receiver required') };
    this.base = new NativeLivePropertySet(wrapper.identity + ':native', 'gCCharacterMovement_PS', 21, this.movement,
      { read: () => this.owner, write: value => { this.owner = value; } }, null, callbacks, () => known(true));
  }
  /** Actual observed slot value; absent means source has not initialized it. */
  pointerAt(at: number): NativeValue<object | null> {
    return this.pointerSlots.has(at) ? known(this.pointerSlots.get(at)!) : unknown('Uninitialized movement pointer+' + at.toString(16));
  }
  private invalidateNumeric(at: number, bytes: number): void {
    this.storage.knownBytes.fill(0, at, at + bytes); this.storage.knownBitMasks.fill(0, at, at + bytes); this.storage.revision++;
  }
  pointer(at: number, value: object | null): void {
    if (!Number.isInteger(at) || at < 0 || at + 4 > 0x3dc) throw new Error('Pointer offset outside actual movement allocation');
    this.pointerSlots.set(at, value);
    if (value === null) this.storage.writeInt(at, 0); else this.invalidateNumeric(at, 4);
  }
  exact(attached = true): void {
    const slot = this.wrapper.controller.allocations().find(value => value.wrapper === this.wrapper);
    if (this.wrapper.deleted || slot?.propertySet !== this.base || this.base.values !== this.movement ||
        (attached && (this.wrapper.native !== this.base || this.base.wrapper !== this.wrapper))) {
      throw new Error('Exact retained CharacterMovement wrapper/PS/value-store identity required');
    }
  }
  /** Original zero-field defaults/physical writes. Numeric pointer fields are
   * never reinterpreted as handles or relocated source PE addresses. */
  storeInteger(at: number, bytes: number, value: number): void {
    uint(value);
    if (![1, 2, 4].includes(bytes) || !Number.isInteger(at) || at < 0 || at + bytes > 0x3dc || value >= 2 ** (bytes * 8)) {
      throw new Error('Native integer store range/width differs');
    }
    if (bytes === 4 && [0, 0x268, 0x2ac].includes(at)) { this.nativeVtables.set(at, value); this.invalidateNumeric(at, 4); }
    else if (at < 0x14) {
      if (at === 8 && bytes === 4) this.base.referenceWord = value;
      else if (at === 4 && bytes === 4 && value === 0) this.base.wrapper = null;
      else if (at === 0xc && bytes === 4 && value === 0) this.base.owner.write(null);
      else throw new Error('Unexamined native base metadata write');
    }
    else if (bytes === 4 && [0x170, 0x174, 0x178, 0x27c, 0x2a8, 0x2b0, 0x2b4, 0x2b8,
      0x2f8, 0x304, 0x310, 0x3a8, 0x3b0].includes(at)) {
      if (value !== 0) throw new Error('Numeric nonNULL pointer cannot become a browser identity'); this.pointer(at, null);
    } else if (bytes === 4) this.storage.writeInt(at, value | 0);
    else if (bytes === 1) this.storage.writeByte(at, value);
    else if (bytes === 2) { if (value > 65535) throw new Error('Original uint16 required');
      this.storage.writeByte(at, value & 255); this.storage.writeByte(at + 1, value >>> 8); }
    else throw new Error('Unexamined native store width');
  }
  constructProxy(at: number): void {
    if (this.proxies.has(at)) throw new Error('Repeated proxy construction unsupported');
    const proxy = OriginalEnclaveProxy.fromConstructor(); this.proxies.set(at, proxy);
    this.nativeVtables.set(at, 0x3087bff4); this.invalidateNumeric(at, 4); this.pointer(at + 4, null);
    for (let index = 0; index < 20; index++) this.storage.writeByte(at + 8 + index, 0);
  }
  clearProxy(at: number): void {
    const proxy = this.proxies.get(at); if (!proxy) throw new Error('Actual constructor proxy missing');
    proxy.clearEntityPointer(operation => { this.reader.guard(); this.wrapper.controller.write(operation, 'Engine:304c43a0'); });
    this.pointer(at + 4, null); for (let index = 0; index < 20; index++) this.storage.writeByte(at + 8 + index, 0);
  }
  constructString(): void {
    if (this.stringConstructed) throw new Error('Repeated embedded CString construction');
    this.stringConstructed = true; this.pointer(0x3d8, null); this.effectName = '';
  }
  clearString(): void {
    if (!this.stringConstructed || fact(this.pointerAt(0x3d8), 'CString pointer') !== null) throw new Error('Existing CString.Clear pool/refcount/header path unresolved');
    // Fresh source pointer is NULL: Clear returns without a write.
    this.reader.note('embedded CString.Clear NULL return', 'SharedBase:100149b0');
  }
}

/** Bound concrete factory. Synchronous callbacks may inspect state; mutating
 * this reader reentrantly is outside the selected stable-allocation profile.
 * A stopped prefix stays retained and the reflection controller blocks replay. */
export class OriginalMovementReader {
  readonly factory: NativeReflectionFactory;
  private readonly byWrapper = new WeakMap<NativeReflectionWrapper, OriginalMovementAllocation>();
  private active = false;
  private nestedAttempt = false;
  constructor(readonly controller: NativeReflectionController, readonly host: NativeMovementReadingHost) {
    // Fresh builtin metadata. Original obsolete/type-mismatch readers can
    // append legacy descriptors later; those paths are outside this profile.
    const base: NativeReflectionRoot = Object.freeze({ className: 'gCMovementBase_PS', baseClassName: 'eCEntityPropertySet', fields: Object.freeze([]) });
    fact(controller.registerRoot(base), 'MovementBase original metadata registration');
    const root: NativeReflectionRoot = Object.freeze({ className: 'gCCharacterMovement_PS', baseClassName: base.className,
      fields: Object.freeze(rules.fields.map(field => Object.freeze({ ...field,
        defaultInitializer: field.typeName === 'bool' ? 'Game:20234ea0' : 'Game:20235730' }))) });
    this.factory = { root, cloneRoot: current => current === controller ? this.run(() => this.construct()) : unknown('Actual reflection controller required'),
      read: (wrapper, input) => this.run(() => this.read(wrapper, input)),
      getVersion: wrapper => { const allocation = this.byWrapper.get(wrapper);
        return allocation && wrapper.native === allocation.base && allocation.base.values === allocation.movement && !wrapper.deleted
          ? known(77) : unknown('Actual concrete CharacterMovement GetVersion receiver required'); } };
    fact(controller.registerFactory(this.factory), 'CharacterMovement concrete factory registration');
  }
  guard(): void { if (this.nestedAttempt) throw new Error('Host attempted reentrant movement reading mutation'); }
  note(operation: string, source: string): void { this.guard(); this.controller.write(operation, source); this.guard(); }
  private run<T>(body: () => T): NativeValue<T> {
    if (this.active) { this.nestedAttempt = true; return unknown('Reentrant movement reading operation unsupported'); }
    this.active = true; this.nestedAttempt = false;
    try { return this.controller.value(() => { this.guard(); const result = body(); this.guard(); return result; }); }
    finally { this.active = false; }
  }
  private call<T>(operation: string, source: string, callback: () => NativeValue<T>): T {
    this.guard(); const result = this.controller.effect(operation, source, callback); this.guard(); return result;
  }
  allocation(wrapper: NativeReflectionWrapper): NativeValue<OriginalMovementAllocation> {
    const allocation = this.byWrapper.get(wrapper);
    if (!allocation) return unknown('Actual CharacterMovement allocation required');
    try { allocation.exact(); return known(allocation); } catch (error) { return unknown(String(error)); }
  }
  /** Diagnostic retained prefix, including a constructor stopped before attach.
   * The returned movement still rejects its uninitialized field reads. This
   * neither certifies a completed Read nor supplies world membership. */
  retainedAllocation(wrapper: NativeReflectionWrapper): NativeValue<OriginalMovementAllocation> {
    const allocation = this.byWrapper.get(wrapper);
    if (!allocation) return unknown('Actual retained CharacterMovement allocation required');
    try { allocation.exact(false); return known(allocation); } catch (error) { return unknown(String(error)); }
  }
  private construct(): NativeReflectionWrapper {
    const wrapper = this.controller.allocateWrapper(this.factory, 'Game:20236520/20235d30');
    const allocation = new OriginalMovementAllocation(wrapper, this); this.byWrapper.set(wrapper, allocation);
    this.controller.retainNative(wrapper, allocation.base);
    this.program(allocation, 'constructor');
    allocation.base.createBase(); this.note('CharacterMovement.Create inherited valid bit/return1', 'Game:20223210/SharedBase:1004a4b8');
    this.controller.setAllocationPhase(wrapper, 'created');
    this.controller.attachConstructedNative(wrapper, allocation.base, 'Game:20232c00', 'Game:20235d30');
    this.controller.initializeProperties(wrapper, field => this.controller.value(() => {
      this.guard(); allocation.exact(); this.field(field);
      allocation.storeInteger(field.nativeOffset, field.typeName === 'bool' ? 1 : 4, 0);
      this.note('physical descriptor default0 ' + field.name, field.defaultInitializer!);
    }), () => this.controller.value(() => this.program(allocation, 'postInitialize')), 'Game:20223090');
    return wrapper;
  }
  private field(field: NativeReflectionField): void {
    if (!this.factory.root.fields.includes(field) || !['bool', 'float'].includes(field.typeName)) throw new Error('Actual original bool/float descriptor required');
  }
  private program(allocation: OriginalMovementAllocation, stage: string): void {
    const program = rules.programs.find(value => value.stage === stage); if (!program) throw new Error('Unexamined constructor stage');
    for (const operation of program.operations) this.operation(allocation, operation, 0, 'Game:' + operation.sourceVA);
  }
  private helper(allocation: OriginalMovementAllocation, role: string, receiver: number): void {
    if (role === 'CharacterMovementInvalidate') { this.program(allocation, 'invalidate'); return; }
    const program = rules.helperPrograms[role]; if (!program) throw new Error('Unexamined constructor helper ' + role);
    // These helpers have live ordered reads that cannot be represented by a
    // static numeric default. Execute their examined bodies below.
    if (role === 'CharacterAnimationReset') { this.animationReset(allocation, program, receiver); return; }
    if (role === 'CharacterEffectReset') { this.effectReset(allocation, receiver); return; }
    if (role === 'OwnedPointerArrayReset') {
      if (fact(allocation.pointerAt(receiver), 'owned array backing pointer') !== null) throw new Error('Nonnull owned array virtual releases/free unresolved');
      this.note('owned array NULL return; count/capacity untouched', 'Game:20233ee3'); return;
    }
    for (const operation of program) this.operation(allocation, operation, receiver,
      (role.startsWith('Object') ? 'SharedBase:' : role === 'MovementBaseConstructor' && operation.sourceVA?.startsWith('0x30') ? 'Engine:' : 'Game:') + (operation.sourceVA ?? operation.role));
  }
  private operation(allocation: OriginalMovementAllocation, operation: SourceOperation, receiver: number, source: string): void {
    this.guard();
    switch (operation.kind) {
      case 'integerStore': allocation.storeInteger(receiver + offset(operation.offset), operation.bytes!, Number(operation.value)); break;
      case 'float32Store': allocation.storage.writeFloat(receiver + offset(operation.offset), Number(operation.value)); break;
      case 'maskedOr': allocation.storage.writeMaskedByte(receiver + offset(operation.offset), operation.mask!, operation.knownValueBits!); break;
      case 'maskedAssign':
        if (receiver !== 0 || offset(operation.offset) !== 0x10) throw new Error('Unexamined masked base field');
        allocation.base.baseFlags.value = (allocation.base.baseFlags.value & ~operation.knownMask!) | operation.knownValueBits!;
        allocation.base.baseFlags.knownMask |= operation.knownMask!; break;
      case 'identityPointerStore': if (operation.value !== 'this') throw new Error('Unexamined identity store');
        allocation.pointer(receiver + offset(operation.offset), allocation.movement); break;
      case 'mathDefaultConstructor': break; // Source-proven RET: no component stores.
      case 'entityProxyDefaultConstructor': allocation.constructProxy(receiver + offset(operation.receiverOffset)); break;
      case 'entityProxySetNull': allocation.clearProxy(receiver + offset(operation.receiverOffset)); break;
      case 'cstringDefaultConstructor': allocation.constructString(); break;
      case 'cstringClear': allocation.clearString(); break;
      case 'vectorClear': allocation.storage.writeVector(receiver + offset(operation.receiverOffset), [0, 0, 0]); break;
      case 'quaternionClear': allocation.storage.writeQuaternion(receiver + offset(operation.receiverOffset), [0, 0, 0, 1]); break;
      case 'matrixClear': allocation.storage.writeMatrix(receiver + offset(operation.receiverOffset), Array(16).fill(0)); break;
      case 'vectorSetCoordinates': allocation.storage.writeVector(receiver + offset(operation.receiverOffset), [0, 1, 0]); break;
      case 'call':
        if (!operation.role && operation.symbol?.includes('PostInitializeProperties')) break; // Audited inherited RET/success.
        if (!operation.role) throw new Error('Unexamined source helper call');
        this.helper(allocation, operation.role, receiver + (operation.receiverOffset ? offset(operation.receiverOffset) : 0)); break;
      default: throw new Error('Unimplemented native operation ' + operation.kind);
    }
    this.note(operation.kind + ' ' + (operation.offset ?? operation.receiverOffset ?? operation.role ?? operation.symbol), source);
  }
  private animationReset(allocation: OriginalMovementAllocation, program: SourceOperation[], receiver: number): void {
    let totalTime: number | null = null;
    let application: NativeMovementApplication | null = null;
    for (const operation of program) {
      const source = 'Game:' + operation.sourceVA;
      if (operation.kind === 'applicationGetInstance') {
        application = this.call('Application.GetInstance captured receiver', source, () => this.host.applicationInstance());
      } else if (operation.kind === 'applicationGetTotalTime') {
        if (application === null) throw new Error('Original Application.GetTotalTime NULL dereference outside selected profile');
        const captured = application; totalTime = uint(this.call('captured Application.GetTotalTime DWORD+510', source, () => captured.totalTime()));
      } else if (operation.kind === 'derivedValueStore') {
        if (totalTime === null) throw new Error('Actual sampled TotalTime required');
        allocation.storeInteger(receiver + offset(operation.offset), 4, totalTime); this.note('sampled Application TotalTime store', source);
      } else if (operation.kind === 'conditionalOwnedAnimationRelease') {
        if (fact(allocation.pointerAt(receiver + 0x40), 'owned animation pointer') !== null) throw new Error('Nonnull animation ref decrement/unlink/destructor/DeleteObject unresolved');
        this.note('NULL animation release branch bypassed', source);
      } else this.operation(allocation, operation, receiver, source);
    }
  }
  private effectReset(allocation: OriginalMovementAllocation, receiver: number): void {
    allocation.pointer(receiver + 4, null); this.note('effect owning movement pointer NULL', 'Game:2021725d');
    const scratch = this.call('temporary CString(gCEffectModule) construction', 'Game:20217264', () => this.host.constructEffectModuleName());
    if (scratch.text !== 'gCEffectModule' || !scratch.identity) throw new Error('Actual captured effect-module name CString required');
    const admin = this.call('ModuleAdmin.GetInstance including initialization when needed', 'Game:2021727d', () => this.host.moduleAdminInstance());
    const candidate = this.call('captured ModuleAdmin.FindModule forward first match', 'Game:20217285', () => admin.findModule(scratch));
    const module = this.call('RTTI EngineComponentBase→EffectModuleBase cast', 'Game:2021728c', () => this.host.castEffectModule(candidate));
    allocation.pointer(receiver + 8, module); this.note('effect module pointer store', 'Game:20217298');
    this.call('temporary CString destruction', 'Game:2021729b', () => this.host.destroyEffectModuleName(scratch));
    const current = fact(allocation.pointerAt(receiver + 8), 'reread stored effect module') as NativeMovementEffectModule | null;
    const system = current === null ? null : this.call('captured effect-module virtual+bc', 'Game:202172b0', () => {
      const functionPointer = current.virtuals.system; return functionPointer(current);
    });
    allocation.pointer(receiver + 0xc, system); this.note('effect-system pointer store or source NULL', 'Game:202172b0');
  }
  private actual(wrapper: NativeReflectionWrapper): OriginalMovementAllocation {
    const allocation = this.byWrapper.get(wrapper); if (!allocation) throw new Error('Actual retained Movement wrapper required');
    allocation.exact(); return allocation;
  }
  private notify(allocation: OriginalMovementAllocation, phase: 'enter' | 'exit', name: string): void {
    allocation.exact();
    const first = allocation.base.owner.read(); if (first !== null) {
      first.propertyOwner.modified(); this.note('outer owner.Modified pure read ' + phase, 'Engine:NotifyEx');
    }
    this.note('captured Movement OnNotify ' + phase + '(propagated=true) ' + name, phase === 'enter' ? 'Engine:OnNotifyEnterEx' : 'Game:20227cd0');
    if (phase === 'enter') {
      const second = allocation.base.owner.read(); if (second !== null) {
        second.propertyOwner.modified(); this.note('inherited inner owner.Modified pure read enter', 'Engine:OnNotifyEnterEx');
      }
      this.note('SharedBase inherited OnNotifyEnter true', 'SharedBase:OnNotifyPropertyValueChangedEnterEx');
    } else this.note('Movement propagated=true immediate return1', 'Game:20227cd0');
  }
  private read(wrapper: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    this.actual(wrapper);
    return this.controller.readWrapperProperties(wrapper, input, { wrapperSource: 'Game:20233e10', dataSource: 'Game:202365a0',
      readField: (field, stream) => this.controller.value(() => {
        this.guard(); this.field(field); stream.u16(); stream.u32(); // Descriptor version/declaredsize: no seek.
        this.note('descriptor version/declared size consumed ' + field.name, 'Game:' + field.reader);
        let allocation = this.actual(wrapper); this.notify(allocation, 'enter', field.name);
        allocation = this.actual(wrapper); // Source getter resolves destination AFTER Enter.
        if (field.typeName === 'bool') allocation.storage.writeByte(field.nativeOffset, Number(stream.bool()));
        else allocation.storage.writeFloat(field.nativeOffset, stream.f32());
        this.note('descriptor physical payload store ' + field.name, 'Game:' + field.reader);
        this.notify(this.actual(wrapper), 'exit', field.name);
      }),
      readNative: stream => this.controller.value(() => {
        this.guard(); this.actual(wrapper); const version = stream.u16();
        this.note('CharacterMovement native Read u16 version ' + version, 'Game:2022aa62');
        if (version < 76) throw new Error('Original CharacterMovement legacy native payload/migration/Invalidate path unresolved');
        this.note('native version>=76 returns1 without legacy tail/reset', 'Game:2022aa6d/2022aea0');
      }) });
  }
  /** Called through the SAME physical PS's original OnPostRead virtual. This
   * does not add it to an entity; owner assignment belongs to native lifecycle. */
  postRead(allocation: OriginalMovementAllocation): NativeValue<void> {
    return this.run(() => {
      allocation.exact(); this.note('inherited Engine OnPostRead RET', 'Game:202243e3');
      this.helper(allocation, 'CharacterAnimationReset', 0x268);
      this.helper(allocation, 'CharacterEffectReset', 0x2ac);
      allocation.pointer(0x27c, allocation.movement); this.note('animation movement self pointer', 'Game:202243ff');
      allocation.pointer(0x2b0, allocation.movement); this.note('effect movement self pointer', 'Game:20224405');
    });
  }
}

/** Hash-verified original packet convenience. Leaves DEADC0DE for its actual
 * ReadV83 caller; no AddPropertySet/PostRead/registration/activation occurs. */
export async function readOriginalHeroMovement(reader: OriginalMovementReader): Promise<NativeValue<{
  accessor: NativeReflectionAccessor; allocation: OriginalMovementAllocation; input: NativeEntityByteInput;
  outerVersion: 76; worldResident: false;
}>> {
  const document = await loadOriginalReflectionSerialized();
  const packet = originalReflectionPropertyInput(document, 'PC_Hero', rules.sourceHero.propertySetIndex);
  if (packet.outerVersion !== 76 || packet.source.nativeReadVersion !== 76 ||
      packet.source.className !== 'gCCharacterMovement_PS' || packet.source.serializedSha256 !== rules.sourceHero.packetSha256) {
    return unknown('Original Hero movement source packet differs');
  }
  const value = reader.controller.readAccessor(packet.input); if (!value.known) return value;
  const wrapper = value.value.instance; if (wrapper === null) return unknown('Original Hero Movement accessor is NULL');
  const allocation = reader.allocation(wrapper); if (!allocation.known) return allocation;
  return known({ accessor: value.value, allocation: allocation.value, input: packet.input, outerVersion: 76, worldResident: false });
}
