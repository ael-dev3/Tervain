/** Original eCProcessibleElement and bCObjectRefBase class-name singletons.
 * Each retains its own Game image cache, descriptor and callback, with the
 * same SharedBase MemoryAdmin used by native bCString. */
import type { NativeValue } from './dialogue';
import { NativeGameCrtOwner } from './native-game-crt';
import { NativeGameExitTable } from './native-game-crt-exit-table';
import type { NativeGameCrtCallback } from './native-game-crt-exit-table';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeMemoryAdmin } from './native-memory-admin';
import { findNativeSpace } from './native-byte-string';
import { nativeGameImageReceipt, admitNativeGameCrtSource } from './native-game-crt-profile';
import { nativeGameTypeInfoForCrt } from './native-crt-undname';
import type { NativeGameTypeInfoName } from './native-crt-undname';
import type { NativeRuntimePlatform } from './native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const constructionToken = Object.freeze({});
const owners = new WeakMap<NativeGameCrtOwner, NativeGameLayerBaseClassName>();
const objectRefOwners = new WeakMap<NativeGameCrtOwner, NativeGameLayerBaseClassName>();
const startupMemory = new WeakMap<NativeRuntimePlatform, NativeMemoryAdmin>();

/** Bind the existing browser heap before Game startup enters its first C++ call. */
export function bindNativeGameLayerBaseMemory(platform: NativeRuntimePlatform, memory: NativeMemoryAdmin): NativeValue<void> {
  if (!NativeMemoryAdmin.isForPlatform(memory, platform)) return unknown('Actual same-platform SharedBase MemoryAdmin required');
  const previous = startupMemory.get(platform);
  if (previous && previous !== memory) return unknown('Game startup cannot replace its retained SharedBase MemoryAdmin');
  startupMemory.set(platform, memory);
  return known(undefined);
}
export function nativeGameLayerBaseMemoryForCrt(crt: NativeGameCrtOwner): NativeValue<NativeMemoryAdmin> {
  const memory = startupMemory.get(crt.host.platform as NativeRuntimePlatform);
  return memory && NativeMemoryAdmin.isForPlatform(memory, crt.host.platform as NativeRuntimePlatform)
    ? known(memory) : unknown('Game C++ class-name startup requires its retained SharedBase MemoryAdmin');
}

function fact<T>(result: NativeValue<T>, operation: string): T {
  if (!result.known) throw new Error(operation + ': ' + result.reason);
  return result.value;
}

function method(crt: NativeGameCrtOwner, label: string, entry: string, body: string, hash: string,
  forwarding?: { readonly bytes: string; readonly target: string }): void {
  const receipt = crt.sourceProfile.heapRules.methods[label] as (typeof crt.sourceProfile.heapRules.methods[string] & {
    readonly entryChain?: readonly { readonly va: string; readonly bytes: string; readonly targetVA: string }[];
  }) | undefined;
  if (!receipt || receipt.module !== 'Game' || receipt.entry !== entry || receipt.body !== body ||
      receipt.bodyInstructionBytesSha256 !== hash) throw new Error('Original Game LayerBase method receipt differs: ' + label);
  if (forwarding) {
    const chain = receipt.entryChain;
    if (chain?.length !== 1 || chain[0]?.va !== entry || chain[0]?.bytes !== forwarding.bytes || chain[0]?.targetVA !== forwarding.target) {
      throw new Error('Original Game LayerBase forwarding entry differs: ' + label);
    }
  } else if (receipt.entry !== receipt.body || receipt.entryChain?.length) {
    throw new Error('Original Game LayerBase direct entry differs: ' + label);
  }
}

function importReceipt(crt: NativeGameCrtOwner, iatVA: string, name: string): void {
  const receipt = crt.sourceProfile.heapRules.imports?.Game?.find(entry => entry.iatVA === '0x' + iatVA);
  if (!receipt || receipt.module !== 'SharedBase.dll' || receipt.name !== name || receipt.ordinal !== null) {
    throw new Error('Original Game-to-SharedBase import receipt differs: ' + iatVA);
  }
}

/** The class has three physical source fields: bCString at +0, previous
 * initializer result at +4, and its two-bit initialized guard at +8. */
export class NativeGameLayerBaseClassName {
  readonly fields: NativeHeapObjectViews;
  readonly initializerResult: NativeHeapObjectViews;
  private readonly typeInfo: NativeGameTypeInfoName;
  private readonly exit: NativeGameExitTable;
  private name: NativeHeapCString | null = null;
  private registeredCallback: NativeGameCrtCallback | null = null;
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private destroyed = false;
  private readonly trace: string[] = [];

  private constructor(readonly crt: NativeGameCrtOwner, private readonly memory: NativeMemoryAdmin, token: object,
    private readonly target: 'layerBase' | 'objectRef' = 'layerBase') {
    if (token !== constructionToken || crt.module !== 'Game' || NativeGameCrtOwner.forPlatform(crt.host) !== crt) {
      throw new Error('Canonical source-admitted Game CRT owner required for class-name startup');
    }
    if (!NativeMemoryAdmin.prototype.usesPlatform.call(memory, crt.host.platform)) throw new Error('Class-name startup requires the Game platform SharedBase MemoryAdmin');
    admitNativeGameCrtSource();
    if (target === 'objectRef') {
      method(crt, 'objectRefClassName', '2002c9f8', '20047070', '060a6bfcc54247e8a3aa5284a3483be91a587fe25b7a88d8ce95fb2820e1d0f8',
        { bytes: 'e973a60100', target: '20047070' });
      method(crt, 'objectRefClassNameInitializer', '204b11c0', '204b11c0', 'b4b68426c719196907094a2384b7c47a7ad64f8f3b0bdf964a743108daa2eb4a');
      method(crt, 'objectRefClassNameDestructor', '20007a81', '20549170', '8cc43ebdc7f754d959b0231ff1019c30c0c24396a71d3f03827b97e58b0e2f4e',
        { bytes: 'e9ea165400', target: '20549170' });
    } else {
      method(crt, 'layerBaseClassName', '2000e8d6', '20047000', '397f8354b9dea8bdcd6605af2cd82b8c00c0abf97e5a06cba56b0e733e7a7ec2',
        { bytes: 'e925870300', target: '20047000' });
      method(crt, 'layerBaseClassNameInitializer', '204b11b0', '204b11b0', '9ef3a3702a68d5acc912a540b56a92930392f736c54362248a9ef0c2b76a29ff');
      method(crt, 'layerBaseClassNameDestructor', '20034649', '20549180', 'c90a8c5cb71d1c5a452241b572312562b7aee48b6f9020dac6ec432519ff388e',
        { bytes: 'e9324b5100', target: '20549180' });
    }
    const cache = nativeGameImageReceipt(target + 'ClassName');
    const result = nativeGameImageReceipt(target + 'InitializerResult');
    const initializer = nativeGameImageReceipt(target + 'InitializerSlot');
    const expected = target === 'layerBase' ? ['207b4580','207b4760','2056c104',0x204b11b0] as const
      : ['207b458c','207b471c','2056c108',0x204b11c0] as const;
    if (cache.address !== expected[0] || cache.bytes !== 12 || result.address !== expected[1] || result.bytes !== 4 ||
        initializer.address !== expected[2] || initializer.bytes !== 4 || crt.imageStorage(target + 'InitializerSlot').readUnsigned(0) !== expected[3]) {
      throw new Error('Original Game LayerBase cache and selected initializer storage differ');
    }
    importReceipt(crt, '207d8830', '?UnMangle@bCClassNameBase@@SG?AVbCString@@PBD@Z');
    importReceipt(crt, '207d8834', '??1bCString@@QAE@XZ');
    this.fields = crt.imageStorage(target + 'ClassName');
    this.initializerResult = crt.imageStorage(target + 'InitializerResult');
    this.typeInfo = nativeGameTypeInfoForCrt(crt, target);
    this.exit = NativeGameExitTable.forCrt(crt);
    for (const key of ['crt','memory','fields','initializerResult','typeInfo','exit','target'] as const) {
      Object.defineProperty(this,key,{ value:this[key],writable:false,configurable:false });
    }
  }

  /** One static cache and one SharedBase heap owner per canonical Game module. */
  static forCrt(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin): NativeGameLayerBaseClassName {
    const existing = owners.get(crt);
    if (existing) {
      if (existing.memory !== memory) throw new Error('LayerBase class-name singleton cannot change its SharedBase MemoryAdmin');
      return existing;
    }
    const owner = new NativeGameLayerBaseClassName(crt, memory, constructionToken);
    owners.set(crt, owner);
    return owner;
  }

  /** The second original initializer owns a separate static cache and descriptor. */
  static forObjectRefCrt(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin): NativeGameLayerBaseClassName {
    const existing = objectRefOwners.get(crt);
    if (existing) {
      if (existing.memory !== memory) throw new Error('ObjectRef class-name singleton cannot change its SharedBase MemoryAdmin');
      return existing;
    }
    const owner = new NativeGameLayerBaseClassName(crt, memory, constructionToken, 'objectRef');
    objectRefOwners.set(crt, owner);
    return owner;
  }

  private guard(): void {
    if (this.reentrant) throw new Error('Unsupported reentry into Game LayerBase class-name startup');
  }
  private call<T>(label: string, body: () => NativeValue<T>, retain?: (value: T) => void): T {
    this.guard(); this.trace.push(label + '.attempt');
    const result = body(); if (result.known) retain?.(result.value);
    this.guard(); const value = fact(result, label); this.trace.push(label); return value;
  }
  private stringSlot(): NativeHeapObjectViews {
    const offset = this.fields.bytes.byteOffset - this.fields.backing.bytes.byteOffset;
    return new NativeHeapObjectViews(this.fields.backing, offset, 4);
  }

  get(): NativeValue<NativeHeapCString> {
    if (this.active) { this.reentrant = true; return unknown('Game LayerBase class-name startup is already executing'); }
    if (this.destroyed) return unknown('Game LayerBase class-name lifetime has ended');
    if (this.boundary) return unknown(this.boundary);
    this.active = true; this.reentrant = false;
    try {
      if (this.crt.imageStorage(this.target + 'ClassName') !== this.fields ||
          this.crt.imageStorage(this.target + 'InitializerResult') !== this.initializerResult ||
          !NativeMemoryAdmin.prototype.usesPlatform.call(this.memory,this.crt.host.platform)) {
        throw new Error('Actual retained LayerBase module storage and SharedBase heap required');
      }
      // The native code loads the prior pointer before it sets guard bit 1.
      let flags = this.fields.readUnsigned(8);
      if ((flags & 1) === 0) {
        const prior = this.initializerResult.pointer<NativeHeapObjectViews>(0).get();
        this.fields.writeUnsigned(8, flags | 1);
        this.fields.pointer<NativeHeapObjectViews>(4).set(prior);
        flags |= 1; this.trace.push('Game.' + (this.target === 'layerBase' ? 'LayerBase' : 'ObjectRef') + '.guard1.copy-prior');
      }
      // Guard bit 2 is stored before calling Game type_info::Name.
      if ((flags & 2) === 0) {
        flags |= 2; this.fields.writeUnsigned(8, flags); this.trace.push('Game.' + (this.target === 'layerBase' ? 'LayerBase' : 'ObjectRef') + '.guard2');
        const typeName = this.call('Game.type_info.Name', () => this.typeInfo.getName());
        if (!typeName) throw new Error('Game LayerBase UnMangle dereferences a NULL type_info::Name result');
        const input = { fields: new NativeHeapObjectViews(typeName), offset: 0 };
        const firstSpace = this.call('SharedBase.UnMangle.strstr.IAT207d8830', () =>
          findNativeSpace(this.memory.byteGeometry(), input));
        const selected = firstSpace ? { fields: firstSpace.fields, offset: firstSpace.offset + 1 } : input;
        // The SharedBase text constructor owns the exact four-byte destination
        // before its first slot access; it uses this same MemoryAdmin.
        this.name = NativeHeapCString.beginTextConstruction(this.memory, this.stringSlot());
        this.call('SharedBase.bCString.text-constructor', () => this.name!.constructText(selected));
        const callback = this.call('Game._atexit.callback-capability', () => this.exit.callbackForMethod(this.target + 'ClassNameDestructor'));
        const registration = this.call('Game._atexit', () => this.exit.atexit(callback));
        if (registration === 0) this.registeredCallback = callback;
        else this.trace.push('Game.LayerBase._atexit.return-minus-one');
        this.trace.push('Game.' + (this.target === 'layerBase' ? 'LayerBase' : 'ObjectRef') + '.class-name-complete');
      }
      if (!this.name) throw new Error('Existing LayerBase guard requires its retained SharedBase CString owner');
      return known(this.name);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }

  /** Exact recovered selected C++ initializer body: call class-name and publish
   * the static object's address. This component method does not traverse the C++ initializer table. */
  initializeCachedClassName(): NativeValue<void> {
    const name = this.get(); if (!name.known) return name;
    try {
      this.initializerResult.pointer<NativeHeapObjectViews>(0).set(this.fields);
      this.trace.push(this.target === 'layerBase' ? 'Game.LayerBase.initializer204b11b0.publish207b4760'
        : 'Game.ObjectRef.initializer204b11c0.publish207b471c');
      return known(undefined);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    }
  }

  /** Entry for the registered Game callback after an external source dispatcher
   * selects it. The Game exit-table model stores callback capabilities only and
   * does not claim traversal or invoke this body itself. */
  invokeRegisteredDestructor(callback: NativeGameCrtCallback): NativeValue<void> {
    if (!this.registeredCallback || callback !== this.registeredCallback) {
      return unknown('Registered Game LayerBase destructor callback capability required');
    }
    if (this.active) { this.reentrant = true; return unknown('Game LayerBase destructor during class-name startup is unowned'); }
    if (this.destroyed) return unknown('Game LayerBase class-name lifetime has ended');
    if (!this.name) return unknown('Retained SharedBase LayerBase CString required by Game destructor');
    this.trace.push(this.target === 'layerBase' ? 'Game.layerBaseClassNameDestructor20549180.IAT207d8834'
      : 'Game.objectRefClassNameDestructor20549170.IAT207d8834');
    const result = this.name.destroy();
    if (result.known) this.destroyed = true;
    else this.boundary = result.reason;
    return result;
  }

  snapshot() { return Object.freeze({ boundary: this.boundary, destroyed: this.destroyed,
    name: this.name, registeredCallback: this.registeredCallback, trace: Object.freeze([...this.trace]) }); }
}
