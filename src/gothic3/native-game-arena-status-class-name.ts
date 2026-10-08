/** Game's Arena Status container type-name singleton, bound to the original Game
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
const owners = new WeakMap<NativeGameCrtOwner, NativeGameArenaStatusClassName>();

function fact<T>(result: NativeValue<T>, operation: string): T {
  if (!result.known) throw new Error(operation + ': ' + result.reason);
  return result.value;
}

function importReceipt(crt: NativeGameCrtOwner, iatVA: string, name: string): void {
  const receipt = crt.sourceProfile.heapRules.imports?.Game?.find(entry => entry.iatVA === '0x' + iatVA);
  if (!receipt || receipt.module !== 'SharedBase.dll' || receipt.name !== name || receipt.ordinal !== null) {
    throw new Error('Original Game-to-SharedBase import receipt differs: ' + iatVA);
  }
}

/** The class has three physical source fields: bCString at +0, previous
 * initializer result at +4, and its two-bit initialized guard at +8. */
export class NativeGameArenaStatusClassName {
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
    const receipt = crt.sourceProfile.heapRules.methods['arenaStatus.statusVirtualSlot0c'];
    if (receipt?.entry !== '2000185c' || receipt.body !== '2006e520' ||
        receipt.bodyInstructionBytesSha256 !== '3ee0cc58d73385f85e2d7bcb383f6882420b2ef039788373549262fc23f6ec11') {
      throw new Error('Original Status name virtual dispatch differs');
    }
    const cache = nativeGameImageReceipt('arenaStatusClassName');
    const result = nativeGameImageReceipt('arenaStatusInitializerResult');
    if (cache.address !== '207b4f58' || cache.bytes !== 12 || result.address !== '207b5020' || result.bytes !== 4) {
      throw new Error('Original Status name cache storage differs');
    }
    importReceipt(crt, '207d8830', '?UnMangle@bCClassNameBase@@SG?AVbCString@@PBD@Z');
    importReceipt(crt, '207d8834', '??1bCString@@QAE@XZ');
    this.fields = crt.imageStorage('arenaStatusClassName');
    this.initializerResult = crt.imageStorage('arenaStatusInitializerResult');
    this.typeInfo = nativeGameTypeInfoForCrt(crt, 'arenaStatus');
    this.exit = NativeGameExitTable.forCrt(crt);
    for (const key of ['crt','memory','fields','initializerResult','typeInfo','exit'] as const) {
      Object.defineProperty(this,key,{ value:this[key],writable:false,configurable:false });
    }
  }

  /** One static cache and one SharedBase heap owner per canonical Game module. */
  static forCrt(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin): NativeGameArenaStatusClassName {
    const existing = owners.get(crt);
    if (existing) {
      if (existing.memory !== memory) throw new Error('Arena class-name singleton cannot change its SharedBase MemoryAdmin');
      return existing;
    }
    const owner = new NativeGameArenaStatusClassName(crt, memory, constructionToken);
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
      if (this.crt.imageStorage('arenaStatusClassName') !== this.fields ||
          this.crt.imageStorage('arenaStatusInitializerResult') !== this.initializerResult ||
          !NativeMemoryAdmin.prototype.usesPlatform.call(this.memory,this.crt.host.platform)) {
        throw new Error('Actual retained Arena module storage and SharedBase heap required');
      }
      // The native code loads the prior pointer before it sets guard bit 1.
      let flags = this.fields.readUnsigned(8);
      if ((flags & 1) === 0) {
        const prior = this.initializerResult.pointer<NativeHeapObjectViews>(0).get();
        this.fields.writeUnsigned(8, flags | 1);
        this.fields.pointer<NativeHeapObjectViews>(4).set(prior);
        flags |= 1; this.trace.push('Game.ArenaStatus.guard1.copy-prior');
      }
      // Guard bit 2 is stored before calling Game type_info::Name.
      if ((flags & 2) === 0) {
        flags |= 2; this.fields.writeUnsigned(8, flags); this.trace.push('Game.ArenaStatus.guard2');
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
        const callback = this.call('Game._atexit.callback-capability', () => this.exit.callbackForMethod('arenaStatusClassNameDestructor'));
        const registration = this.call('Game._atexit', () => this.exit.atexit(callback));
        if (registration === 0) this.registeredCallback = callback;
        else this.trace.push('Game.ArenaStatus._atexit.return-minus-one');
        this.trace.push('Game.ArenaStatus.class-name-complete');
      }
      if (!this.name) throw new Error('Existing Arena guard requires its retained SharedBase CString owner');
      return known(this.name);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
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
    this.trace.push('Game.arenaStatusClassNameDestructor20549920.IAT207d8834');
    const result = this.name.destroy();
    if (result.known) this.destroyed = true;
    else this.boundary = result.reason;
    return result;
  }

  snapshot() { return Object.freeze({ boundary: this.boundary, destroyed: this.destroyed,
    name: this.name, registeredCallback: this.registeredCallback, trace: Object.freeze([...this.trace]) }); }
}
