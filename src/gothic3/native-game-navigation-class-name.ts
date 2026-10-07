/** Game's gCNavigation_PS class-name singleton, bound to the original Game
 * image/CRT and the same SharedBase MemoryAdmin used by native bCString. */
import type { NativeValue } from './dialogue';
import { NativeGameCrtOwner } from './native-game-crt';
import { NativeGameExitTable } from './native-game-crt-exit-table';
import type { NativeGameCrtCallback } from './native-game-crt-exit-table';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin } from './native-memory-admin';
import { findNativeSpace } from './native-byte-string';
import { nativeGameImageReceipt, admitNativeGameCrtSource } from './native-game-crt-profile';
import { nativeGameTypeInfoForCrt } from './native-crt-undname';
import type { NativeGameTypeInfoName } from './native-crt-undname';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const constructionToken = Object.freeze({});
const owners = new WeakMap<NativeGameCrtOwner, NativeGameNavigationClassName>();

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
      receipt.bodyInstructionBytesSha256 !== hash) throw new Error('Original Game Navigation method receipt differs: ' + label);
  if (forwarding) {
    const chain = receipt.entryChain;
    if (chain?.length !== 1 || chain[0]?.va !== entry || chain[0]?.bytes !== forwarding.bytes || chain[0]?.targetVA !== forwarding.target) {
      throw new Error('Original Game Navigation forwarding entry differs: ' + label);
    }
  } else if (receipt.entry !== receipt.body || receipt.entryChain?.length) {
    throw new Error('Original Game Navigation direct entry differs: ' + label);
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
export class NativeGameNavigationClassName {
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
      throw new Error('Canonical source-admitted Game CRT owner required for Navigation class-name startup');
    }
    admitNativeGameCrtSource();
    method(crt, 'navigationClassName', '2001328c', '20061830', 'e70b96f89df16b06a6d40aac7f0c98cc28fa1d122e268a402b21fd6cbfe89c14',
      { bytes: 'e99fe50400', target: '20061830' });
    method(crt, 'navigationClassNameInitializer', '204b1840', '204b1840', 'b36a2fd4183316e86f0620bcddb7448b596ed86bbaee0f0a05e9af2d1dce47b4');
    method(crt, 'navigationClassNameDestructor', '20003904', '205496d0', '76ac978a7b1e8b7f104b23644088c9058ab16e59cf363bfbb9b04f1ab3d63d9d',
      { bytes: 'e9c75d5400', target: '205496d0' });
    const cache = nativeGameImageReceipt('navigationClassName');
    const result = nativeGameImageReceipt('navigationInitializerResult');
    const initializer = nativeGameImageReceipt('navigationInitializerSlot');
    if (cache.address !== '207b4964' || cache.bytes !== 12 || result.address !== '207b4ea8' || result.bytes !== 4 ||
        initializer.address !== '2056c220' || initializer.bytes !== 4 || crt.imageStorage('navigationInitializerSlot').readUnsigned(0) !== 0x204b1840) {
      throw new Error('Original Game Navigation cache and selected initializer storage differ');
    }
    importReceipt(crt, '207d8830', '?UnMangle@bCClassNameBase@@SG?AVbCString@@PBD@Z');
    importReceipt(crt, '207d8834', '??1bCString@@QAE@XZ');
    this.fields = crt.imageStorage('navigationClassName');
    this.initializerResult = crt.imageStorage('navigationInitializerResult');
    this.typeInfo = nativeGameTypeInfoForCrt(crt);
    this.exit = NativeGameExitTable.forCrt(crt);
  }

  /** One static cache and one SharedBase heap owner per canonical Game module. */
  static forCrt(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin): NativeGameNavigationClassName {
    const existing = owners.get(crt);
    if (existing) {
      if (existing.memory !== memory) throw new Error('Navigation class-name singleton cannot change its SharedBase MemoryAdmin');
      return existing;
    }
    const owner = new NativeGameNavigationClassName(crt, memory, constructionToken);
    owners.set(crt, owner);
    return owner;
  }

  private guard(): void {
    if (this.reentrant) throw new Error('Unsupported reentry into Game Navigation class-name startup');
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
    if (this.active) { this.reentrant = true; return unknown('Game Navigation class-name startup is already executing'); }
    if (this.destroyed) return unknown('Game Navigation class-name lifetime has ended');
    if (this.boundary) return unknown(this.boundary);
    this.active = true; this.reentrant = false;
    try {
      // The native code loads the prior pointer before it sets guard bit 1.
      let flags = this.fields.readUnsigned(8);
      if ((flags & 1) === 0) {
        const prior = this.initializerResult.pointer<NativeHeapObjectViews>(0).get();
        this.fields.writeUnsigned(8, flags | 1);
        this.fields.pointer<NativeHeapObjectViews>(4).set(prior);
        flags |= 1; this.trace.push('Game.Navigation.guard1.copy-prior');
      }
      // Guard bit 2 is stored before calling Game type_info::Name.
      if ((flags & 2) === 0) {
        flags |= 2; this.fields.writeUnsigned(8, flags); this.trace.push('Game.Navigation.guard2');
        const typeName = this.call('Game.type_info.Name', () => this.typeInfo.getName());
        if (!typeName) throw new Error('Game Navigation UnMangle dereferences a NULL type_info::Name result');
        const input = { fields: new NativeHeapObjectViews(typeName), offset: 0 };
        const firstSpace = this.call('SharedBase.UnMangle.strstr.IAT207d8830', () =>
          findNativeSpace(this.memory.byteGeometry(), input));
        const selected = firstSpace ? { fields: firstSpace.fields, offset: firstSpace.offset + 1 } : input;
        // The SharedBase text constructor owns the exact four-byte destination
        // before its first slot access; it uses this same MemoryAdmin.
        this.name = NativeHeapCString.beginTextConstruction(this.memory, this.stringSlot());
        this.call('SharedBase.bCString.text-constructor', () => this.name!.constructText(selected));
        const callback = this.call('Game._atexit.callback-capability', () => this.exit.callbackForMethod('navigationClassNameDestructor'));
        const registration = this.call('Game._atexit', () => this.exit.atexit(callback));
        if (registration === 0) this.registeredCallback = callback;
        else this.trace.push('Game.Navigation._atexit.return-minus-one');
        this.trace.push('Game.Navigation.class-name-complete');
      }
      if (!this.name) throw new Error('Existing Navigation guard requires its retained SharedBase CString owner');
      return known(this.name);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }

  /** Exact ASM-only selected C++ initializer body: call class-name and publish
   * the static object's address. This does not execute the 71 prior callbacks. */
  initializeCachedClassName(): NativeValue<void> {
    const name = this.get(); if (!name.known) return name;
    try {
      this.initializerResult.pointer<NativeHeapObjectViews>(0).set(this.fields);
      this.trace.push('Game.Navigation.initializer204b1840.publish207b4ea8');
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
      return unknown('Registered Game Navigation destructor callback capability required');
    }
    if (this.active) { this.reentrant = true; return unknown('Game Navigation destructor during class-name startup is unowned'); }
    if (this.destroyed) return unknown('Game Navigation class-name lifetime has ended');
    if (!this.name) return unknown('Retained SharedBase Navigation CString required by Game destructor');
    this.trace.push('Game.navigationClassNameDestructor205496d0.IAT207d8834');
    const result = this.name.destroy();
    if (result.known) this.destroyed = true;
    else this.boundary = result.reason;
    return result;
  }

  snapshot() { return Object.freeze({ boundary: this.boundary, destroyed: this.destroyed,
    name: this.name, registeredCallback: this.registeredCallback, trace: Object.freeze([...this.trace]) }); }
}
