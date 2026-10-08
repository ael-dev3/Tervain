/** Game's gCArena_PS class-name singleton, bound to the original Game
 * image/CRT and the same SharedBase MemoryAdmin used by native bCString. */
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

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const constructionToken = Object.freeze({});
const owners = new WeakMap<NativeGameCrtOwner, NativeGameArenaClassName>();

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
      receipt.bodyInstructionBytesSha256 !== hash) throw new Error('Original Game Arena method receipt differs: ' + label);
  if (forwarding) {
    const chain = receipt.entryChain;
    if (chain?.length !== 1 || chain[0]?.va !== entry || chain[0]?.bytes !== forwarding.bytes || chain[0]?.targetVA !== forwarding.target) {
      throw new Error('Original Game Arena forwarding entry differs: ' + label);
    }
  } else if (receipt.entry !== receipt.body || receipt.entryChain?.length) {
    throw new Error('Original Game Arena direct entry differs: ' + label);
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
export class NativeGameArenaClassName {
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

  private constructor(readonly crt: NativeGameCrtOwner, private readonly memory: NativeMemoryAdmin, token: object) {
    if (token !== constructionToken || crt.module !== 'Game' || NativeGameCrtOwner.forPlatform(crt.host) !== crt) {
      throw new Error('Canonical source-admitted Game CRT owner required for Arena class-name startup');
    }
    if (!NativeMemoryAdmin.prototype.usesPlatform.call(memory, crt.host.platform)) throw new Error('Arena requires the Game platform SharedBase MemoryAdmin');
    admitNativeGameCrtSource();
    method(crt, 'arenaClassName', '20031fca', '2006e480', '55a8c9a4f0a32dfc23f04d807e610a005317846800ae9023cee39729e72db630',
      { bytes: 'e9b1c40300', target: '2006e480' });
    method(crt, 'arenaClassNameInitializer', '204b2110', '204b2110', '23e359f5089089bb0ebaf3d7480ed6ffcf86ec4af2169b9de50c1762f520d24d');
    method(crt, 'arenaClassNameDestructor', '2000951b', '20549960', '1be8eebe292854b737cea1276ff4108adab8b6ad15e7085bfbdf73a6d58ecfdb',
      { bytes: 'e940045400', target: '20549960' });
    const cache = nativeGameImageReceipt('arenaClassName');
    const result = nativeGameImageReceipt('arenaInitializerResult');
    const initializer = nativeGameImageReceipt('arenaInitializerSlot');
    if (cache.address !== '207b4f4c' || cache.bytes !== 12 || result.address !== '207b5024' || result.bytes !== 4 ||
        initializer.address !== '2056c628' || initializer.bytes !== 4 || crt.imageStorage('arenaInitializerSlot').readUnsigned(0) !== 0x204b2110) {
      throw new Error('Original Game Arena cache and selected initializer storage differ');
    }
    importReceipt(crt, '207d8830', '?UnMangle@bCClassNameBase@@SG?AVbCString@@PBD@Z');
    importReceipt(crt, '207d8834', '??1bCString@@QAE@XZ');
    this.fields = crt.imageStorage('arenaClassName');
    this.initializerResult = crt.imageStorage('arenaInitializerResult');
    this.typeInfo = nativeGameTypeInfoForCrt(crt, 'arena');
    this.exit = NativeGameExitTable.forCrt(crt);
    for (const key of ['crt','memory','fields','initializerResult','typeInfo','exit'] as const) {
      Object.defineProperty(this,key,{ value:this[key],writable:false,configurable:false });
    }
  }

  /** One static cache and one SharedBase heap owner per canonical Game module. */
  static forCrt(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin): NativeGameArenaClassName {
    const existing = owners.get(crt);
    if (existing) {
      if (existing.memory !== memory) throw new Error('Arena class-name singleton cannot change its SharedBase MemoryAdmin');
      return existing;
    }
    const owner = new NativeGameArenaClassName(crt, memory, constructionToken);
    owners.set(crt, owner);
    return owner;
  }

  private guard(): void {
    if (this.reentrant) throw new Error('Unsupported reentry into Game Arena class-name startup');
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
    if (this.active) { this.reentrant = true; return unknown('Game Arena class-name startup is already executing'); }
    if (this.destroyed) return unknown('Game Arena class-name lifetime has ended');
    if (this.boundary) return unknown(this.boundary);
    this.active = true; this.reentrant = false;
    try {
      if (this.crt.imageStorage('arenaClassName') !== this.fields ||
          this.crt.imageStorage('arenaInitializerResult') !== this.initializerResult ||
          !NativeMemoryAdmin.prototype.usesPlatform.call(this.memory,this.crt.host.platform)) {
        throw new Error('Actual retained Arena module storage and SharedBase heap required');
      }
      // The native code loads the prior pointer before it sets guard bit 1.
      let flags = this.fields.readUnsigned(8);
      if ((flags & 1) === 0) {
        const prior = this.initializerResult.pointer<NativeHeapObjectViews>(0).get();
        this.fields.writeUnsigned(8, flags | 1);
        this.fields.pointer<NativeHeapObjectViews>(4).set(prior);
        flags |= 1; this.trace.push('Game.Arena.guard1.copy-prior');
      }
      // Guard bit 2 is stored before calling Game type_info::Name.
      if ((flags & 2) === 0) {
        flags |= 2; this.fields.writeUnsigned(8, flags); this.trace.push('Game.Arena.guard2');
        const typeName = this.call('Game.type_info.Name', () => this.typeInfo.getName());
        if (!typeName) throw new Error('Game Arena UnMangle dereferences a NULL type_info::Name result');
        const input = { fields: new NativeHeapObjectViews(typeName), offset: 0 };
        const firstSpace = this.call('SharedBase.UnMangle.strstr.IAT207d8830', () =>
          findNativeSpace(this.memory.byteGeometry(), input));
        const selected = firstSpace ? { fields: firstSpace.fields, offset: firstSpace.offset + 1 } : input;
        // The SharedBase text constructor owns the exact four-byte destination
        // before its first slot access; it uses this same MemoryAdmin.
        this.name = NativeHeapCString.beginTextConstruction(this.memory, this.stringSlot());
        this.call('SharedBase.bCString.text-constructor', () => this.name!.constructText(selected));
        const callback = this.call('Game._atexit.callback-capability', () => this.exit.callbackForMethod('arenaClassNameDestructor'));
        const registration = this.call('Game._atexit', () => this.exit.atexit(callback));
        if (registration === 0) this.registeredCallback = callback;
        else this.trace.push('Game.Arena._atexit.return-minus-one');
        this.trace.push('Game.Arena.class-name-complete');
      }
      if (!this.name) throw new Error('Existing Arena guard requires its retained SharedBase CString owner');
      return known(this.name);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }

  /** Exact ASM-only selected C++ initializer body: call class-name and publish
   * the static object's address. This does not execute prior callbacks or the first Arena property initializer. */
  initializeCachedClassName(): NativeValue<void> {
    const name = this.get(); if (!name.known) return name;
    try {
      this.initializerResult.pointer<NativeHeapObjectViews>(0).set(this.fields);
      this.trace.push('Game.Arena.initializer204b2110.publish207b5024');
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
      return unknown('Registered Game Arena destructor callback capability required');
    }
    if (this.active) { this.reentrant = true; return unknown('Game Arena destructor during class-name startup is unowned'); }
    if (this.destroyed) return unknown('Game Arena class-name lifetime has ended');
    if (!this.name) return unknown('Retained SharedBase Arena CString required by Game destructor');
    this.trace.push('Game.arenaClassNameDestructor20549960.IAT207d8834');
    const result = this.name.destroy();
    if (result.known) this.destroyed = true;
    else this.boundary = result.reason;
    return result;
  }

  snapshot() { return Object.freeze({ boundary: this.boundary, destroyed: this.destroyed,
    name: this.name, registeredCallback: this.registeredCallback, trace: Object.freeze([...this.trace]) }); }
}
