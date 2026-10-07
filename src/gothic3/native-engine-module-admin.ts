import rules from '../../assets/gothic3/scene-startup/runtime-rules.json';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin, NativeMemoryAllocation, NativeMemoryBacking } from './native-memory-admin';

type NativeModuleAdminRules = {
  schema: string;
  inputs: { Engine: string; SharedBase: string };
  methods: Record<string, { module: string; entry: string; body: string; bodyInstructionBytesSha256: string }>;
  coldGlobals: Record<string, { address: string; bytes: number; raw: string; knownMask: string; sha256: string; module: string }>;
};
const source = rules as unknown as NativeModuleAdminRules;
const ENGINE_SHA = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3';
const SHARED_BASE_SHA = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214';
const methods = {
  moduleGetInstance: ['3002e9ec', '30088e90', 'da835e925f9e339350bdc77d6269529d490fd2c72eb0b86af299096b748c3228'],
  moduleFindModule: ['3001d11a', '30088af0', 'ab0e17c8519150f68b7d85b3159aab8de02ea9dbc5938d01523b7c9062a0ba2e'],
  moduleRegister: ['300164ff', '30088f60', 'ecaf62ef74e4d653f22a7e1b8d450263dca1a4d572d7659565d63c1d9dd4a15a'],
  moduleDestructor: ['3001bb30', '30088e10', '56c6929f25b36fbbe9ee5d0fa1f3d1a23b3b0da1b4cee4015e5197e6c0211e73'],
  moduleArrayGrow: ['3002f1b2', '30088240', '87f48dc977cab7b88fabed72900cbfe2f40d12c5930e0fadea46d17f310f9b29'],
  inputDispatcherConstructor: ['3003f026', '30087c80', '296e133ace92171cd8b8f0a817f8ab4625997c509f9c44c16894fd6be9d8cdf3'],
  inputDispatcherCreate: ['3000f5bf', '300877c0', 'ea72c300daabd9fce376834c5a2c23decc455e78a7ee88afc568224b8f37a6f9'],
  inputDispatcherRegister: ['3001ca21', '30087db0', '9de59010fa22c8b9844c466ecc14c2496f3a96a950c0647bde9bdffeb0d67672'],
  inputDispatcherDestroy: ['300235bf', '30087c00', 'd14ddbf9c2f92e33783a4dbe815fbfa11ebc42f42eb29771f3b59192ec796fb8'],
  inputDispatcherDestructor: ['300458fe', '30087d10', '04b80425f517c2c658b1e456fa07a6ff8d5753b37dee3e2e7dd072fa7f6d005c'],
  moduleShutdown: ['30797fc0', '30797fc0', '6fc17cee6034097d35d92d10abe9343ab168c51dfb4b3274e889c2e555fac634'],
  inputReceiverConstructor: ['30035a5d', '30103020', '3610a864ca1c4307409eef5033569430672ebf11b70962cd9afbe50e63a769b6'],
} as const;

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const moduleAdminVtable = Object.freeze({ module: 'Engine', address: '3081cdd4' });
const moduleArrayOffset = 0x34;
const moduleCountOffset = 0x38;
const moduleCapacityOffset = 0x3c;

function bytesFromHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/.test(value)) throw new Error('Exact cold Engine image bytes required');
  return Uint8Array.from(value.match(/../g) ?? [], byte => Number.parseInt(byte, 16));
}

function assertSource(): void {
  if (source.schema !== 'gothic3-scene-startup-rules-v1' || source.inputs.Engine !== ENGINE_SHA ||
      source.inputs.SharedBase !== SHARED_BASE_SHA ||
      Object.entries(methods).some(([name, [entry, body, hash]]) => source.methods[name]?.module !== 'Engine' ||
        source.methods[name]?.entry !== entry ||
        source.methods[name]?.body !== body || source.methods[name]?.bodyInstructionBytesSha256 !== hash)) {
    throw new Error('Original Engine ModuleAdmin source receipt differs');
  }
  const object = source.coldGlobals.moduleAdmin;
  const guard = source.coldGlobals.moduleAdminGuard;
  if (!object || object.address !== '30ad9e78' || object.bytes !== 84 || object.raw !== '00'.repeat(84) ||
      object.knownMask !== 'ff'.repeat(84) || object.sha256 !== '4fea5e6a3ec5f5474a26d858bc77b6d7bd3ab864ea02d988683fdc648602b248' ||
      object.module !== 'Engine' || !guard || guard.address !== '30ad9ecc' || guard.bytes !== 4 ||
      guard.raw !== '00000000' || guard.knownMask !== 'ffffffff' ||
      guard.sha256 !== 'df3f619804a92fdb4057192dc43dd748ea778adc52bc498ce80524c014b81119' || guard.module !== 'Engine') {
    throw new Error('Original Engine ModuleAdmin cold storage receipt differs');
  }
}

function coldStorage(name: 'moduleAdmin' | 'moduleAdminGuard'): NativeHeapObjectViews {
  const row = source.coldGlobals[name];
  if (!row) throw new Error('Missing original Engine cold storage receipt: ' + name);
  const backing: NativeMemoryBacking = { identity: Object.freeze({ name, address: row.address }),
    bytes: bytesFromHex(row.raw), knownMask: bytesFromHex(row.knownMask), freed: false };
  return new NativeHeapObjectViews(backing);
}

/** The actual eCModuleAdmin name object is Engine static image storage. The
 * lower eCInputDispatcher, class-name and atexit services remain explicit
 * owners; this class never substitutes a test registry for those services. */
export interface NativeEngineModuleClassName {
  isEmpty(): NativeValue<boolean>;
}

export interface NativeEngineModuleAdminHost<M extends object> {
  /** Exact Engine eCInputDispatcher and SharedBase base-object constructor path. */
  constructInputDispatcher(fields: NativeHeapObjectViews): NativeValue<void>;
  /** The explicit eCInputDispatcher::Create call in ModuleAdmin::GetInstance. */
  createInputDispatcher(fields: NativeHeapObjectViews): NativeValue<void>;
  /** Engine eCInputDispatcher::RegisterModule (30087db0), after list append. */
  registerInputModule(module: M): NativeValue<void>;
  /** The Engine destructor's dispatcher Destroy and C++ destructor calls. */
  destroyInputDispatcher(fields: NativeHeapObjectViews): NativeValue<void>;
  destructInputDispatcher(fields: NativeHeapObjectViews): NativeValue<void>;
  /** GetClassNameA plus bCString operator==, including their temporary owners. */
  moduleClassNameEquals(module: M, requestedName: NativeEngineModuleClassName): NativeValue<boolean>;
  registerShutdown(address: '30797fc0', owner: object, execute: () => NativeValue<void>): NativeValue<number>;
}

/** Engine 30088e90/30088af0/30088f60 owner. Registry storage is the original
 * 84-byte static object and its MemoryAdmin allocation. Lower dispatcher and
 * RTTI calls are required capabilities, so unknown results retain the exact
 * native prefix instead of pretending that registration succeeded. */
export class NativeEngineModuleAdmin<M extends object> {
  readonly fields: NativeHeapObjectViews;
  readonly guard: NativeHeapObjectViews;
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private initialized = false;
  private destroyed = false;
  private readonly trace: string[] = [];

  constructor(private readonly host: NativeEngineModuleAdminHost<M>,
    private readonly memory: Pick<NativeMemoryAdmin, 'realloc' | 'free'>) {
    assertSource();
    this.fields = coldStorage('moduleAdmin');
    this.guard = coldStorage('moduleAdminGuard');
  }

  private take<T>(value: NativeValue<T>, operation: string): T {
    if (!value.known) throw new Error(operation + ': ' + value.reason);
    return value.value;
  }

  private execute<T>(operation: string, body: () => NativeValue<T>): NativeValue<T> {
    if (this.boundary) return unknown(this.boundary);
    if (this.destroyed) return unknown('Engine ModuleAdmin lifetime has ended');
    if (this.active) { this.reentrant = true; return unknown('Engine ModuleAdmin is already executing'); }
    this.active = true;
    this.reentrant = false;
    try {
      const result = body();
      if (this.reentrant) throw new Error('Unsupported reentrant Engine ModuleAdmin callback');
      if (!result.known) throw new Error(result.reason);
      return result;
    } catch (error) {
      this.boundary = operation + ': ' + (error instanceof Error ? error.message : String(error));
      this.trace.push('blocked:' + this.boundary);
      return unknown(this.boundary);
    } finally { this.active = false; }
  }

  getInstance(): NativeValue<this> {
    // 30088e95/30088edf: the guard is set before the constructor, so a nested
    // getter returns the same static storage without completing initialization.
    if (this.active && !this.boundary && !this.destroyed && (this.guard.readUnsigned(0) & 1) !== 0) {
      return known(this);
    }
    return this.execute('ModuleAdmin.GetInstance30088e90', () => {
      if ((this.guard.readUnsigned(0) & 1) === 0) {
        this.guard.writeUnsigned(0, this.guard.readUnsigned(0) | 1);
        this.trace.push('moduleAdmin.guard');
        this.take(this.host.constructInputDispatcher(this.fields), 'eCInputDispatcher.ctor30087c80');
        if (this.reentrant) throw new Error('Unsupported reentrant input-dispatcher construction');
        this.fields.pointer<object>(0).set(moduleAdminVtable);
        this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).set(null);
        this.fields.writeUnsigned(moduleCountOffset, 0);
        this.fields.writeUnsigned(moduleCapacityOffset, 0);
        this.trace.push('moduleAdmin.vtable-and-registry-zero');
        this.take(this.host.createInputDispatcher(this.fields), 'eCInputDispatcher.Create300877c0');
        if (this.reentrant) throw new Error('Unsupported reentrant input-dispatcher Create');
        this.take(this.host.registerShutdown('30797fc0', this, () => this.shutdown()), 'atexit.ModuleAdmin30797fc0');
        if (this.reentrant) throw new Error('Unsupported reentrant ModuleAdmin atexit');
        this.initialized = true;
        this.trace.push('moduleAdmin.atexit');
      }
      return known(this);
    });
  }

  private readModules(count: number): M[] {
    const allocation = this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).get();
    if (count === 0) return [];
    if (!allocation) throw new Error('ModuleAdmin has a nonzero count with a NULL module array');
    const array = new NativeHeapObjectViews(allocation);
    const result: M[] = [];
    for (let index = 0; index < count; index++) {
      const module = array.pointer<M>(index * 4).get();
      if (!module) throw new Error('ModuleAdmin module pointer is NULL at index ' + index);
      result.push(module);
    }
    return result;
  }

  private readModuleSlot(index: number): M | null {
    const allocation = this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).get();
    if (!allocation) throw new Error('ModuleAdmin lookup dereferences a NULL module array');
    return new NativeHeapObjectViews(allocation).pointer<M>(index * 4).get();
  }

  findModule(name: NativeEngineModuleClassName): NativeValue<M | null> {
    return this.execute('ModuleAdmin.FindModule30088af0', () => {
      if (!this.initialized) throw new Error('ModuleAdmin.GetInstance must complete before FindModule');
      const empty = this.take(name.isEmpty(), 'bCString.IsEmpty');
      if (this.reentrant) throw new Error('Unsupported reentrant ModuleAdmin class-name query');
      if (empty) return known(null);
      let count = this.fields.readUnsigned(moduleCountOffset);
      if ((count | 0) <= 0) return known(null);
      let index = 0;
      do {
        if (index < count) {
          const module = this.readModuleSlot(index);
          if (!module) throw new Error('ModuleAdmin class-name accessor for a NULL module slot is not owned');
          const equal = this.take(this.host.moduleClassNameEquals(module, name), 'ModuleAdmin.GetClassNameA/operator==');
          if (this.reentrant) throw new Error('Unsupported reentrant ModuleAdmin class-name comparison');
          // 30088b63 reloads the current array and slot after accessor cleanup.
          if (equal) return known(this.readModuleSlot(index));
        }
        // 30088b4e reloads the count after each failed comparison. Later slots
        // are not read unless the source loop actually reaches them.
        count = this.fields.readUnsigned(moduleCountOffset);
        index = (index + 1) >>> 0;
      } while ((index | 0) < (count | 0));
      return known(null);
    });
  }

  private growModules(required: number): NativeValue<void> {
    const oldCapacity = this.fields.readUnsigned(moduleCapacityOffset);
    if ((oldCapacity | 0) >= (required | 0)) return known(undefined);
    if (oldCapacity > 0x7fffffff) return unknown('ModuleAdmin high-bit capacity growth is outside admitted backing ownership');
    const count = this.fields.readUnsigned(moduleCountOffset);
    const old = this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).get();
    const priorModules = this.readModules(count);
    const growth = Math.min(0x400, Math.max(8, oldCapacity >> 3));
    const newCapacity = required + growth;
    if (!Number.isSafeInteger(newCapacity) || newCapacity > 0x3fffffff) {
      return unknown('ModuleAdmin array growth exceeds the selected uint32 byte extent');
    }
    const resized = this.memory.realloc(old, newCapacity * 4);
    if (!resized.known) return resized;
    this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).set(resized.value);
    this.trace.push('moduleAdmin.array.realloc-store');
    if (!resized.value) return unknown('ModuleAdmin array-grow NULL reaches native memset dereference');
    const array = new NativeHeapObjectViews(resized.value);
    if (newCapacity * 4 > array.bytes.length) return unknown('ModuleAdmin realloc returned less than the requested pointer array');
    // Rebind copied opaque pointer capabilities after a moved browser backing;
    // this records no guessed 32-bit address and does not change copied bytes.
    for (let index = 0; index < priorModules.length; index++) array.pointer<M>(index * 4).set(priorModules[index]!);
    const clearStart = count;
    const clearSlots = newCapacity - oldCapacity;
    if (clearStart + clearSlots > newCapacity) return unknown('ModuleAdmin source memset exceeds its grown pointer array');
    for (let index = clearStart; index < clearStart + clearSlots; index++) array.writeUnsigned(index * 4, 0);
    this.trace.push('moduleAdmin.array.memset');
    this.fields.writeUnsigned(moduleCapacityOffset, newCapacity);
    this.trace.push('moduleAdmin.array.capacity');
    return known(undefined);
  }

  registerModule(module: M): NativeValue<1> {
    return this.execute('ModuleAdmin.RegisterModule30088f60', () => {
      if (!this.initialized) throw new Error('ModuleAdmin.GetInstance must complete before RegisterModule');
      if (module === null || (typeof module !== 'object' && typeof module !== 'function')) {
        throw new Error('Actual non-NULL Engine component capability required');
      }
      const count = this.fields.readUnsigned(moduleCountOffset);
      if (count > 0x7ffffffe) throw new Error('ModuleAdmin signed count overflow branch is not admitted');
      const allocation = this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).get();
      if (count !== 0 && !allocation) throw new Error('ModuleAdmin has a nonzero count with a NULL module array');
      if (allocation) {
        const array = new NativeHeapObjectViews(allocation);
        for (let index = count - 1; index >= 0; index--) {
          if (array.pointer<M>(index * 4).get() === module) return known(1 as const);
        }
      }
      const nextCount = count + 1;
      const grown = this.growModules(nextCount);
      if (!grown.known) return grown;
      this.fields.writeUnsigned(moduleCountOffset, nextCount);
      this.trace.push('moduleAdmin.array.count');
      const current = this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).get();
      if (!current) return unknown('ModuleAdmin append dereferences NULL module-array result');
      new NativeHeapObjectViews(current).pointer<M>(count * 4).set(module);
      this.trace.push('moduleAdmin.array.append');
      const registered = this.host.registerInputModule(module);
      if (!registered.known) return registered;
      if (this.reentrant) return unknown('Unsupported reentrant input-dispatcher RegisterModule');
      this.trace.push('moduleAdmin.inputDispatcher.register');
      return known(1 as const);
    });
  }

  private releaseModuleArray(): void {
    const allocation = this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).get();
    if (allocation) {
      this.take(this.memory.free(allocation), 'MemoryAdmin.Free module array');
      if (this.reentrant) throw new Error('Unsupported reentrant ModuleAdmin array release');
      this.fields.pointer<NativeMemoryAllocation>(moduleArrayOffset).set(null);
      this.fields.writeUnsigned(moduleCountOffset, 0);
      this.fields.writeUnsigned(moduleCapacityOffset, 0);
      this.trace.push('moduleAdmin.shutdown.array-free');
    }
  }

  private shutdown(): NativeValue<void> {
    return this.execute('ModuleAdmin.shutdown30797fc0', () => {
      this.fields.pointer<object>(0).set(moduleAdminVtable);
      this.trace.push('moduleAdmin.shutdown.vtable');
      this.releaseModuleArray();
      this.take(this.host.destroyInputDispatcher(this.fields), 'eCInputDispatcher.Destroy30087c00');
      if (this.reentrant) throw new Error('Unsupported reentrant input-dispatcher Destroy');
      this.trace.push('moduleAdmin.shutdown.dispatcher-destroy');
      // 30088e56 and 30088e6b each reread the array after Destroy and cleanup.
      this.releaseModuleArray();
      this.releaseModuleArray();
      this.take(this.host.destructInputDispatcher(this.fields), 'eCInputDispatcher.dtor30087d10');
      if (this.reentrant) throw new Error('Unsupported reentrant input-dispatcher destructor');
      this.destroyed = true;
      this.trace.push('moduleAdmin.shutdown.dispatcher-destructor');
      return known(undefined);
    });
  }

  snapshot() {
    return Object.freeze({ boundary: this.boundary, initialized: this.initialized, destroyed: this.destroyed,
      guard: this.guard.readUnsigned(0), moduleCount: this.fields.readUnsigned(moduleCountOffset),
      moduleCapacity: this.fields.readUnsigned(moduleCapacityOffset), modules: Object.freeze(this.readModules(this.fields.readUnsigned(moduleCountOffset))),
      trace: Object.freeze([...this.trace]) });
  }
}
