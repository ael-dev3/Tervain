/** Original reflective accessor/factory and concrete detached Clock_PS reading.
 * The selected successful-allocation model preserves masked uninitialized bits.
 * A constructed/read property set is not an entity or a resident world member.
 * Other constructors, obsolete readers and last-reference deletion stay explicit.
 */
import rulesText from '../../assets/gothic3/entity-reflection/runtime-rules.json?raw';
import manifestText from '../../assets/gothic3/entity-reflection/manifest.json?raw';
import type { NativeValue } from './dialogue';
import { NativeEntityByteInput } from './entity-reading';
import type { NativeEntityReadAccessor } from './entity-reading';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeLiveEntity, NativeMaskedWord, NativePropertyCallbacks, NativePropertyObjectReference } from './entity-lifecycle';
import { OriginalClockProperties } from './clock-properties';
import type { OriginalClockValues, OriginalClockConsumerHost, OriginalClockResult } from './clock-properties';
import { NativeWorldClock } from './world-clock';
import type { NativeClockPrecision, NativeClockTimestampSource } from './world-clock';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

interface ClockField { name: keyof OriginalClockValues; nativeOffset: number; typeName: 'long' | 'float'; registrar: string; reader: string }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>; clockVersion: number;
  clockPropertyType: number; clockWrapperVtable: string; clockFields: ClockField[]; inheritedEntityPropertyTableEmpty: boolean };
if (rules.schema !== 'gothic3-entity-reflection-rules-v1' || rules.clockVersion !== 1 ||
    rules.clockPropertyType !== 32 || rules.clockWrapperVtable !== '20685bc4' ||
    rules.clockFields.map(value => value.name).join(',') !== 'Year,Day,Hour,Minute,Second,Factor' ||
    rules.clockFields.map(value => value.nativeOffset).join(',') !== '20,24,28,32,36,40' ||
    rules.inheritedEntityPropertyTableEmpty !== true ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') throw new Error('Original reflection receipt differs.');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, name: string): T {
  if (!value.known) throw new Error(name + ': ' + value.reason); return value.value;
}
function word(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new TypeError('Original uint32 required.'); return value;
}
function ascii(value: string): string {
  if (!/^[\x20-\x7e]*$/.test(value)) throw new Error('Only audited ASCII original class/property names are supported.'); return value;
}
export interface NativeReflectionTrace { operation: string; source: string; cursor?: number; value?: string | number | boolean }
export interface NativeReflectionReceipt { trace: readonly NativeReflectionTrace[]; applied: readonly string[]; attempted: readonly string[];
  partial: boolean; required: string | null; worldResident: false }
export interface NativeReflectionClockHost {
  timestamps: NativeClockTimestampSource; precision: NativeClockPrecision;
  consumers?: OriginalClockConsumerHost;
  /** Source creator destruction asks the actual ErrorAdmin panic state. */
  isInPanicState(): NativeValue<boolean>;
  /** Exact source destructor(arg0), followed independently by DeleteObject.
   * No missing destructor/allocation service is inferred to be effect free. */
  deletingDestructor?(wrapper: NativeReflectionWrapper, argument: 0): NativeValue<void>;
  deleteObject?(wrapper: NativeReflectionWrapper): NativeValue<void>;
}
export interface NativeReflectionRoot {
  readonly className: string; readonly baseClassName: string | null;
  readonly fields: readonly ClockField[];
}
export interface NativeReflectionFactory {
  readonly root: NativeReflectionRoot;
  /** Execute original concrete Clone including constructor/Create/defaults.
   * Supplied factories must return the exact live wrapper, never a record. */
  cloneRoot(controller: NativeReflectionController): NativeValue<NativeReflectionWrapper>;
}
export interface NativeReflectionAllocation {
  readonly wrapper: NativeReflectionWrapper;
  propertySet: NativeLivePropertySet<object> | null;
  lowerClock: NativeWorldClock | null;
  phase: 'wrapper' | 'native-constructor' | 'created' | 'attached' | 'initialized' | 'read';
  readonly initializedFields: Set<keyof OriginalClockValues>;
  readonly worldResident: false;
}

/** Physical wrapper capability; NativeLivePropertySet.wrapper holds this object.
 * Reference mask0x07fffff8 is a separate24bit count from native PS's31bit count. */
export class NativeReflectionWrapper implements NativePropertyObjectReference {
  readonly flags: NativeMaskedWord = { value: 10, knownMask: 0x07ffffff };
  native: NativeLivePropertySet<object> | null = null;
  clockProperties: OriginalClockProperties | null = null;
  deleted = false;
  constructor(readonly identity: string, readonly factory: NativeReflectionFactory,
    readonly controller: NativeReflectionController) {
    if (!identity) throw new TypeError('Actual reflection allocation identity required.');
  }
  getReferenceCount(): NativeValue<number> { return this.deleted ? unknown('Deleted native wrapper') : known((word(this.flags.value) >>> 3) & 0xffffff); }
  addReference(): NativeValue<number> {
    return this.controller.value(() => {
      if (this.deleted) throw new Error('Deleted native wrapper');
      const current = word(this.flags.value);
      this.flags.value = (((((current & 0xfffffff8) + 8) ^ current) & 0x07fffff8) ^ current) >>> 0;
      this.controller.write('wrapper.AddReference', 'SharedBase:10004b74');
      return (this.flags.value >>> 3) & 0xffffff;
    });
  }
  releaseReference(): NativeValue<number> {
    return this.controller.value(() => {
      if (this.deleted) throw new Error('Deleted native wrapper');
      const current = word(this.flags.value);
      if (((current >>> 3) & 0xffffff) > 1) {
        this.flags.value = (((((current >>> 3) * 8 - 8) ^ current) & 0x07fffff8) ^ current) >>> 0;
        this.controller.write('wrapper.ReleaseReference decrement', 'SharedBase:10006636');
        return (this.flags.value >>> 3) & 0xffffff;
      }
      // Clear happens before destructor. This irreversible prefix is retained
      // if the real destructor or memory admin boundary remains unresolved.
      this.flags.value = (current & 0xf8000007) >>> 0;
      this.controller.write('wrapper.ReleaseReference clear count', 'SharedBase:10006636');
      this.controller.effect('captured deleting destructor(arg0)', 'SharedBase:10006636',
        () => this.controller.clockHost.deletingDestructor?.(this, 0));
      this.controller.effect('MemoryAdmin.DeleteObject', 'SharedBase:10006636',
        () => this.controller.clockHost.deleteObject?.(this));
      this.deleted = true; this.controller.write('wrapper deleted capability', 'SharedBase:10006636'); return 0;
    });
  }
  /** Normal wrapper.Read consumes size, but never skips to that claimed end. */
  read(input: NativeEntityByteInput): NativeValue<number> {
    return this.controller.value(() => this.controller.readClockWrapper(this, input));
  }
}

/** Same two source pointer slots: root and instance. IsValid uses root only. */
export class NativeReflectionAccessor implements NativeEntityReadAccessor {
  root: NativeReflectionRoot | null = null;
  instance: NativeReflectionWrapper | null = null;
  private destroyed = false;
  constructor(readonly controller: NativeReflectionController) {}
  setInstance(incoming: NativeReflectionWrapper | null): void {
    if (this.destroyed) throw new Error('Destroyed accessor');
    if (incoming) fact(incoming.addReference(), 'incoming wrapper AddReference');
    const old = this.instance;
    if (old) { fact(old.releaseReference(), 'old wrapper ReleaseReference'); this.instance = null;
      this.controller.write('accessor old instance clear', 'SharedBase:10002455'); }
    if (incoming && this.root === null) this.root = incoming.factory.root;
    this.instance = incoming; this.controller.write('accessor instance assignment', 'SharedBase:10002455');
  }
  isValidByte(): NativeValue<number> { return this.destroyed ? unknown('Destroyed accessor') : known(Number(this.root !== null)); }
  nativeObject(): NativeValue<object | null> { return this.destroyed ? unknown('Destroyed accessor') : known(this.instance?.native ?? null); }
  className(): NativeValue<string> { return this.destroyed || !this.root ? unknown('SharedBase:1000156e obsolete/null root branch is unresolved') : known(this.root.className); }
  destroy(): NativeValue<void> {
    return this.controller.value(() => {
      if (this.destroyed) throw new Error('Accessor destructor already ran');
      const current = this.instance;
      if (current) { fact(current.releaseReference(), 'accessor destructor ReleaseReference'); this.instance = null;
        this.controller.write('accessor destructor conditional clear', 'SharedBase:100025d6'); }
      this.instance = null; this.controller.write('accessor destructor final clear', 'SharedBase:100025d6');
      this.destroyed = true;
    });
  }
}

class PropertyIterator {
  readonly accessor: NativeReflectionAccessor;
  index = 0;
  constructor(readonly wrapper: NativeReflectionWrapper, accessor?: NativeReflectionAccessor) {
    const controller = wrapper.controller;
    if (accessor) { this.accessor = accessor; return; }
    // Creator→temporary accessor→iterator copy→temporary destruction.
    const temporary = new NativeReflectionAccessor(controller); temporary.setInstance(wrapper);
    this.accessor = new NativeReflectionAccessor(controller); this.accessor.setInstance(temporary.instance);
    this.accessor.root = temporary.root; fact(temporary.destroy(), 'property iterator temporary destruction');
  }
  field(): ClockField | null { return this.accessor.root?.fields[this.index] ?? null; }
  advance(): void {
    this.index = (this.index + 1) >>> 0;
    this.wrapper.controller.write('property iterator increment', 'SharedBase:100043fe');
    const root = this.accessor.root;
    if (!root) throw new Error('Native iterator null-root dereference is outside the selected profile.');
    if (this.index >= root.fields.length) {
      this.index = 0;
      const saved = this.accessor.instance;
      if (saved) fact(saved.addReference(), 'iterator saved instance reference');
      const base = this.wrapper.controller.resolveRoot(root.baseClassName);
      this.accessor.setInstance(null); this.accessor.root = base;
      this.wrapper.controller.write('iterator base root assignment', 'SharedBase:10006861');
      if (base) this.accessor.setInstance(saved);
      if (saved) fact(saved.releaseReference(), 'iterator saved reference release');
    }
  }
  destroy(): void { fact(this.accessor.destroy(), 'property iterator destruction'); }
}

/** An actual selected Clock factory plus inherited empty root view. Additional
 * families require their original live factory implementations. Unknown lookup
 * does not prove an absent class and cannot silently take ReadSkipObject. */
export class NativeReflectionController {
  private readonly factories = new Map<string, NativeReflectionFactory>();
  private readonly roots = new Map<string, NativeReflectionRoot>();
  private readonly trace: NativeReflectionTrace[] = [];
  private readonly applied: string[] = [];
  private readonly attempted: string[] = [];
  private readonly heap: NativeReflectionAllocation[] = [];
  private blocked: string | null = null;
  private allocation = 0;
  constructor(readonly identity: string, readonly clockHost: NativeReflectionClockHost) {
    if (!identity) throw new TypeError('Reflection controller identity required.');
    const inherited: NativeReflectionRoot = Object.freeze({ className: 'eCEntityPropertySet', baseClassName: 'bCObjectRefBase', fields: Object.freeze([]) });
    this.roots.set(inherited.className, inherited);
    const root: NativeReflectionRoot = Object.freeze({ className: 'gCClock_PS', baseClassName: 'eCEntityPropertySet',
      fields: Object.freeze(rules.clockFields.map(value => Object.freeze({ ...value }))) });
    const factory: NativeReflectionFactory = { root, cloneRoot: controller => controller.value(() => controller.constructClock(factory)) };
    fact(this.registerFactory(factory), 'Clock factory registration');
  }
  receipt(): NativeReflectionReceipt { return { trace: this.trace.slice(), applied: this.applied.slice(), attempted: this.attempted.slice(),
    partial: this.blocked !== null && (this.applied.length > 0 || this.attempted.length > 0), required: this.blocked, worldResident: false }; }
  /** Actual retained allocations, including a stopped constructor prefix. Their
   * physical capabilities stay alive; allocation alone does not certify Read. */
  allocations(): readonly NativeReflectionAllocation[] { return this.heap.slice(); }
  value<T>(body: () => T): NativeValue<T> {
    if (this.blocked) return unknown(this.blocked);
    try { const value = body(); if (this.blocked) throw new Error(this.blocked); return known(value); }
    catch (error) { this.blocked = error instanceof Error ? error.message : String(error); return unknown(this.blocked); }
  }
  write(operation: string, source: string): void { this.trace.push({ operation, source }); this.applied.push(operation); }
  private read(operation: string, source: string, input: NativeEntityByteInput, value: string | number | boolean): void {
    this.trace.push({ operation, source, cursor: input.cursor(), value });
  }
  effect<T>(operation: string, source: string, call: () => NativeValue<T> | undefined): T {
    this.attempted.push(operation); this.trace.push({ operation, source });
    const value = call(); if (!value) throw new Error(operation + ': original native boundary is unresolved');
    const result = fact(value, operation); if (this.blocked) throw new Error(this.blocked); this.applied.push(operation); return result;
  }
  private clockResult<T>(label: string, call: () => OriginalClockResult<T>): T {
    return this.effect(label, 'Game:gCClock_PS', () => {
      const result = call(); return result.supported ? known(result.nativeReturnValue) : unknown(result.reason);
    });
  }
  registerFactory(factory: NativeReflectionFactory): NativeValue<void> {
    return this.value(() => {
      const name = ascii(factory.root.className);
      if (!name) throw new Error('An original nonempty class name is required.');
      if (this.factories.has(name)) throw new Error('Duplicate native root replacement/fatal branch is unresolved.');
      this.factories.set(name, factory); this.roots.set(name, factory.root);
      this.write('registered concrete class factory ' + name, 'SharedBase:1000191f');
    });
  }
  resolveRoot(name: string | null): NativeReflectionRoot | null {
    if (name === null) return null;
    const result = this.roots.get(ascii(name));
    if (!result) throw new Error('SharedBase:100085e9 actual inherited root lookup unresolved for ' + name); return result;
  }
  private constructClock(factory: NativeReflectionFactory): NativeReflectionWrapper {
    const wrapper = new NativeReflectionWrapper(this.identity + ':wrapper:' + ++this.allocation, factory, this);
    const allocation: NativeReflectionAllocation = { wrapper, propertySet: null, lowerClock: null,
      phase: 'wrapper', initializedFields: new Set(), worldResident: false };
    this.heap.push(allocation);
    this.write('wrapper successful allocation/base constructor/nonroot flag/type', 'Game:2020b0e0');
    // The native constructor leaves property fields uninitialized. Only the
    // following descriptor defaults and PostInitialize initialize them.
    const values = {} as OriginalClockValues;
    let owner: NativeLiveEntity | null = null;
    let properties: OriginalClockProperties | null = null;
    const empty = (candidate: NativeLivePropertySet<object>): NativeValue<void> => candidate === set && wrapper.native === set
      ? known(undefined) : unknown('Actual live Clock_PS callback receiver required');
    // Clock vtable+138/+13c/+12c resolve to the three original Engine RET
    // bodies. These callbacks add no invented observer or cleanup effects.
    const callbacks: NativePropertyCallbacks = { added: empty, removed: empty, postRead: empty };
    const set: NativeLivePropertySet<OriginalClockValues> = new NativeLivePropertySet(wrapper.identity + ':native', 'gCClock_PS', 32, values,
      { read: () => owner, write: entity => { owner = entity; if (properties) properties.owner = entity?.propertyOwner ?? null; } },
      null, callbacks, () => known(true));
    const clock = new NativeWorldClock(this.clockHost.timestamps, this.clockHost.precision);
    allocation.propertySet = set; allocation.lowerClock = clock; allocation.phase = 'native-constructor';
    this.write('native Clock allocation/base constructor/scratch zero', 'Game:20208160');
    this.effect('native constructor bCClock.Set zero date', 'Game:20208160', () => {
      const result = clock.set({ years: 0, days: 0, seconds: 0 }); return result.kind === 'applied' ? known(undefined) : unknown(result.reason);
    });
    this.effect('native Clock.Create Pause', 'Game:20007130', () => {
      const result = clock.pause(); return result.kind === 'applied' ? known(undefined) : unknown(result.reason);
    });
    set.createBase(); this.write('native base.Create valid high bit', 'Engine:3003b863');
    allocation.phase = 'created';
    // New native object begins with one31bit reference. Attach increments2;
    // clearing its wrapper around ReleaseVirtualReference consumes the initial
    // reference and restores wrapper ownership, leaving native refcount1.
    set.referenceWord = ((set.referenceWord & 0x80000000) | 2) >>> 0;
    this.write('native AddVirtualReference before attach', 'SharedBase:10004ea3');
    set.wrapper = wrapper; wrapper.native = set;
    this.write('SetPropertyObject and wrapper native assignment', 'Game:20208560');
    const saved = set.wrapper; set.wrapper = null;
    this.write('native temporary wrapper clear', 'Game:20208970');
    set.referenceWord = ((set.referenceWord & 0x80000000) | 1) >>> 0;
    this.write('native initial ReleaseVirtualReference', 'SharedBase:1000235b');
    set.wrapper = saved; this.write('native original wrapper restore', 'Game:20208970');
    allocation.phase = 'attached';
    // RegisterPropertyObject(nonroot) returns true without adding to the root
    // array; it does not create a second live root or entity membership.
    this.trace.push({ operation: 'factory RegisterPropertyObject nonroot return', source: 'SharedBase:10006db6', value: true });
    fact(wrapper.addReference(), 'default creator construction');
    const iterator = new PropertyIterator(wrapper);
    for (let field = iterator.field(); field !== null; field = iterator.field()) {
      values[field.name] = 0; this.write('descriptor default zero ' + field.name, field.name === 'Factor' ? 'Game:2020ad40' : 'Game:2020a4b0');
      allocation.initializedFields.add(field.name);
      iterator.advance();
    }
    properties = new OriginalClockProperties(set.identity, values, null, clock, set, this.clockHost.consumers);
    wrapper.clockProperties = properties;
    this.clockResult('PostInitializeProperties', () => properties!.postInitializeProperties());
    allocation.phase = 'initialized';
    iterator.destroy();
    const panic = this.effect('creator ErrorAdmin.IsInPanicState', 'SharedBase:10007356', () => this.clockHost.isInPanicState());
    if (!panic) fact(wrapper.releaseReference(), 'default creator destructor');
    return wrapper;
  }
  readAccessor(input: NativeEntityByteInput): NativeValue<NativeReflectionAccessor> {
    return this.value(() => {
      const accessor = new NativeReflectionAccessor(this);
      const version = input.u16(); this.read('accessor version', 'SharedBase:100052f9', input, version);
      const present = input.bool(); this.read('accessor present', 'SharedBase:100052f9', input, present);
      if (!present) return accessor;
      const singletonVersion = input.u16(); this.read('singleton version', 'SharedBase:1000437c', input, singletonVersion);
      const newPresent = input.bool(); this.read('singleton present', 'SharedBase:1000437c', input, newPresent);
      if (!newPresent) return accessor;
      const name = ascii(input.string()); this.read('class name', 'SharedBase:1000437c', input, name);
      const factory = this.factories.get(name);
      if (!factory) throw new Error('SharedBase:10090c90 registered factory lookup unresolved for ' + name + '; ReadSkipObject is not inferred');
      this.read('factory version', 'SharedBase:1000393b', input, input.u16());
      this.read('factory bool', 'SharedBase:1000393b', input, input.bool());
      this.read('factory trailing version', 'SharedBase:1000393b', input, input.u16());
      const wrapper = this.effect('root Clone', 'SharedBase:1000393b', () => factory.cloneRoot(this));
      this.effect('wrapper virtual Read', 'SharedBase:1000393b', () => wrapper.read(input));
      accessor.setInstance(wrapper);
      fact(wrapper.releaseReference(), 'factory initial reference balance');
      return accessor;
    });
  }
  readClockWrapper(wrapper: NativeReflectionWrapper, input: NativeEntityByteInput): number {
    if (wrapper.factory.root.className !== 'gCClock_PS' || !wrapper.clockProperties || !wrapper.native) throw new Error('Actual constructed Clock wrapper required.');
    const objectVersion = input.u16(); this.read('wrapper object version', 'SharedBase:10003ed6', input, objectVersion);
    this.read('wrapper declared size; normal branch does not seek', 'Game:202095d0', input, input.u32());
    if (objectVersion === 1) this.read('legacy object name', 'SharedBase:10002f68', input, input.string());
    if (objectVersion <= 81) this.read('legacy property ID20', 'SharedBase:10002f68', input, input.propertyID());
    const propertyVersion = input.u16(); this.read('property table version', 'Game:2020b3d0', input, propertyVersion);
    if (propertyVersion === 0) throw new Error('Game:2020b3d0 CallFatalError property version0 boundary');
    fact(wrapper.addReference(), 'read creator construction');
    const iterator = new PropertyIterator(wrapper);
    const count = input.u32() | 0; this.read('signed property count', 'Game:2020b3d0', input, count);
    let fast = true;
    for (let index = 0; index < count; index++) {
      const name = ascii(input.string()); const type = propertyVersion > 29 ? ascii(input.string()) : null;
      let field: ClockField | null = null;
      if (fast) { field = iterator.field(); if ((field?.name ?? '') !== name) fast = false; iterator.advance(); }
      if (!fast) {
        // Original named accessor owns temporary references throughout lookup.
        const named = new PropertyIterator(wrapper);
        const resolving = new NativeReflectionAccessor(this);
        resolving.setInstance(named.accessor.instance); resolving.root = named.accessor.root;
        const search = new PropertyIterator(wrapper, resolving);
        while (search.field()?.name !== name) {
          if (resolving.root === null || resolving.root.baseClassName === null) break;
          search.advance(); // Empty inherited tables still traverse actual roots.
        }
        field = search.field();
        if (field) { named.accessor.setInstance(resolving.instance); named.accessor.root = resolving.root;
          named.index = search.index; }
        fact(resolving.destroy(), 'named property resolve temporary destruction');
        named.destroy();
      }
      if (!field || (type !== null && type !== field.typeName)) throw new Error('Game:2020b530 obsolete property/critical-section reader unresolved for ' + name);
      this.read('property reader version', 'SharedBase:10005d35', input, input.u16());
      this.read('property payload declared size; scalar reader consumes4', field.reader, input, input.u32());
      // Source performs a null test, then re-reads GetNativeObject for each
      // captured notification receiver. Storage itself is resolved after Enter.
      if (wrapper.native !== null) {
        const captured = wrapper.clockProperties;
        if (!captured || captured.base !== wrapper.native || captured.values !== wrapper.native.values) throw new Error('Clock native notification capability unavailable or replaced');
        this.clockResult('propagated NotifyEnter ' + name, () => captured.notify('enter', name, true));
      }
      const destination = wrapper.native;
      if (!destination || destination.className !== 'gCClock_PS' || !wrapper.clockProperties || destination.values !== wrapper.clockProperties.values) throw new Error('Scalar destination GetNativeObject is unavailable or replaced');
      const value = field.typeName === 'float' ? input.f32() : input.u32();
      (destination.values as OriginalClockValues)[field.name] = value;
      this.write('serialized scalar write ' + name, field.reader);
      if (wrapper.native !== null) {
        const captured = wrapper.clockProperties;
        if (!captured || captured.base !== wrapper.native || captured.values !== wrapper.native.values) throw new Error('Clock native exit capability unavailable or replaced');
        this.clockResult('propagated NotifyExit ' + name, () => captured.notify('exit', name, true));
      }
    }
    const properties = wrapper.clockProperties;
    if (!wrapper.native || !properties || properties.base !== wrapper.native || properties.values !== wrapper.native.values) throw new Error('Game:2020b3d0 null/replaced native recreation boundary unresolved');
    const derivedVersion = input.u16(); this.read('native derived Clock.Read version', 'Game:20023e7a', input, derivedVersion);
    this.clockResult('derived Clock.Read calendar Set/Adjust', () => properties.read(derivedVersion));
    iterator.destroy();
    const panic = this.effect('read creator ErrorAdmin.IsInPanicState', 'SharedBase:10007356', () => this.clockHost.isInPanicState());
    if (!panic) fact(wrapper.releaseReference(), 'read creator destructor');
    const allocation = this.heap.find(value => value.wrapper === wrapper);
    if (allocation) allocation.phase = 'read';
    return objectVersion;
  }
  castPropertySet(object: object | null): NativeValue<NativeLivePropertySet<object> | null> {
    return object === null ? known(null) : object instanceof NativeLivePropertySet ? known(object) : unknown('Original dynamic_cast source capability unresolved');
  }
  propertySetVersion(set: NativeLivePropertySet<object>): NativeValue<number> {
    return set.className === 'gCClock_PS' && set.wrapper instanceof NativeReflectionWrapper && set.wrapper.native === set ? known(1) : unknown('Actual concrete PS virtual GetVersion unresolved');
  }
  clock(set: NativeLivePropertySet<object>): NativeValue<OriginalClockProperties> {
    const wrapper = set.wrapper;
    return wrapper instanceof NativeReflectionWrapper && wrapper.native === set && wrapper.clockProperties ? known(wrapper.clockProperties) : unknown('Actual physical Clock capability required');
  }
}

export interface OriginalReflectionSerializedSet { className: string; outerVersion: number; nativeReadVersion: number;
  sourceOffset: number; serializedRaw: string; serializedSha256: string; worldResident: false }
export interface OriginalReflectionSerializedDocument { schema: 'gothic3-entity-reflection-serialized-v1'; phase: 'serialized-candidates';
  worldResident: false; strings: readonly string[]; entities: readonly { name: string; propertySets: readonly OriginalReflectionSerializedSet[] }[] }
const manifest = JSON.parse(manifestText) as { schema: string; outputs: (ResourceReceipt & { path: string })[] };
const loaded = new WeakSet<OriginalReflectionSerializedDocument>();
export async function loadOriginalReflectionSerialized(): Promise<OriginalReflectionSerializedDocument> {
  if (manifest.schema !== 'gothic3-entity-reflection-manifest-v1') throw new Error('Reflection manifest differs');
  const receipt = manifest.outputs.find(value => value.path === 'serialized-candidates.json');
  if (!receipt) throw new Error('Reflection serialized receipt missing');
  const document = await readNativeResource<OriginalReflectionSerializedDocument>('entity-reflection/' + receipt.path, receipt);
  if (document.schema !== 'gothic3-entity-reflection-serialized-v1' || document.phase !== 'serialized-candidates' ||
      document.worldResident !== false || document.entities.map(value => value.name).join(',') !== 'World_MCP,PC_Hero' ||
      document.entities[0]!.propertySets.length !== 13 || document.entities[1]!.propertySets.length !== 19) throw new Error('Original serialized focus differs');
  const freeze = (value: unknown): void => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); } };
  freeze(document); loaded.add(document); return document;
}
/** Supply this input immediately after ReadV83 has consumed outerVersion.
 * The outer sentinel remains in the input for its original caller to consume. */
export function originalReflectionPropertyInput(document: OriginalReflectionSerializedDocument,
  entityName: 'World_MCP' | 'PC_Hero', index: number): { outerVersion: number; input: NativeEntityByteInput; source: OriginalReflectionSerializedSet } {
  if (!loaded.has(document)) throw new Error('Use the hash-verified serialized reflection document');
  if (!Number.isInteger(index) || index < 0) throw new TypeError('Original property-set index required');
  const source = document.entities.find(value => value.name === entityName)?.propertySets[index];
  if (!source || !/^(?:[0-9a-f]{2})+$/.test(source.serializedRaw)) throw new Error('Original serialized PS bytes missing');
  const bytes = Uint8Array.from(source.serializedRaw.match(/../g)!, value => parseInt(value, 16));
  const input = new NativeEntityByteInput(bytes, document.strings);
  if (input.u16() !== source.outerVersion) throw new Error('Original outer PS version differs');
  return { outerVersion: source.outerVersion, input, source };
}
