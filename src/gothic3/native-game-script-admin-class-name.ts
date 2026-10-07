/** Source-ordered Game.dll bTPropertyObjectType<gCScriptAdmin> class name.
 * This resolves the exact name used by ModuleAdmin.FindModule; it does not
 * construct or register a gCScriptAdmin component. */
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
const owners = new WeakMap<NativeGameCrtOwner, NativeGameScriptAdminClassName>();

function fact<T>(result: NativeValue<T>, operation: string): T {
  if (!result.known) throw new Error(operation + ': ' + result.reason);
  return result.value;
}

function method(crt: NativeGameCrtOwner, label: string, entry: string, body: string, hash: string,
  forwarding: { readonly bytes: string; readonly target: string }): void {
  const receipt = crt.sourceProfile.heapRules.methods[label] as (typeof crt.sourceProfile.heapRules.methods[string] & {
    readonly entryChain?: readonly { readonly va: string; readonly bytes: string; readonly targetVA: string }[];
  }) | undefined;
  if (!receipt || receipt.module !== 'Game' || receipt.entry !== entry || receipt.body !== body ||
      receipt.bodyInstructionBytesSha256 !== hash || receipt.entryChain?.length !== 1 ||
      receipt.entryChain[0]?.va !== entry || receipt.entryChain[0]?.bytes !== forwarding.bytes ||
      receipt.entryChain[0]?.targetVA !== forwarding.target) {
    throw new Error('Original Game ScriptAdmin class-name source receipt differs: ' + label);
  }
}

function importReceipt(crt: NativeGameCrtOwner, iatVA: string, name: string): void {
  const receipt = crt.sourceProfile.heapRules.imports?.Game?.find(entry => entry.iatVA === '0x' + iatVA);
  if (!receipt || receipt.module !== 'SharedBase.dll' || receipt.name !== name || receipt.ordinal !== null) {
    throw new Error('Original Game ScriptAdmin class-name import receipt differs: ' + iatVA);
  }
}

/** Three source fields: bCString at +0, prior initializer result at +4, and
 * the lazy two-bit initialization guard at +8. */
export class NativeGameScriptAdminClassName {
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
      throw new Error('Canonical source-admitted Game CRT owner required for ScriptAdmin class-name startup');
    }
    admitNativeGameCrtSource();
    method(crt, 'scriptAdminClassName', '20021346', '20060670', '3c4440f2743cd28ed0886dbd577e9044333c4944e2c86adb8506db84e3ae901d',
      { bytes: 'e925f30300', target: '20060670' });
    method(crt, 'scriptAdminClassNameDestructor', '20013971', '205491a0', '1ed845df3f543953ecc7b79bc1dde2f2842d2b80968c3c8938917635b1d4aa87',
      { bytes: 'e92a585300', target: '205491a0' });
    const cache = nativeGameImageReceipt('scriptAdminClassName');
    const result = nativeGameImageReceipt('scriptAdminInitializerResult');
    this.fields = crt.imageStorage('scriptAdminClassName');
    this.initializerResult = crt.imageStorage('scriptAdminInitializerResult');
    if (cache.address !== '207b47a0' || cache.bytes !== 12 || result.address !== '207b4f3c' || result.bytes !== 4 ||
        this.fields.bytes.length !== cache.bytes || this.initializerResult.bytes.length !== result.bytes) {
      throw new Error('Original Game ScriptAdmin class-name storage differs');
    }
    importReceipt(crt, '207d8830', '?UnMangle@bCClassNameBase@@SG?AVbCString@@PBD@Z');
    importReceipt(crt, '207d8834', '??1bCString@@QAE@XZ');
    this.typeInfo = nativeGameTypeInfoForCrt(crt, 'scriptAdmin');
    this.exit = NativeGameExitTable.forCrt(crt);
  }

  /** One class-name object and one SharedBase heap owner per Game CRT. */
  static forCrt(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin): NativeGameScriptAdminClassName {
    const existing = owners.get(crt);
    if (existing) {
      if (existing.memory !== memory) throw new Error('ScriptAdmin class-name singleton cannot change its SharedBase MemoryAdmin');
      return existing;
    }
    const owner = new NativeGameScriptAdminClassName(crt, memory, constructionToken);
    owners.set(crt, owner);
    return owner;
  }

  private guard(): void {
    if (this.reentrant) throw new Error('Unsupported reentry into Game ScriptAdmin class-name startup');
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

  /** bTPropertyObjectType<gCScriptAdmin,eCEngineComponentBase>::vfunction1 at
   * Game:20021346 -> 20060670. The Game CRT and SharedBase CString remain
   * separate owners, as in the installed module. */
  get(): NativeValue<NativeHeapCString> {
    if (this.active) { this.reentrant = true; return unknown('Game ScriptAdmin class-name startup is already executing'); }
    if (this.destroyed) return unknown('Game ScriptAdmin class-name lifetime has ended');
    if (this.boundary) return unknown(this.boundary);
    this.active = true; this.reentrant = false;
    try {
      // The getter reads the prior initializer result before setting guard bit 1.
      let flags = this.fields.readUnsigned(8);
      if ((flags & 1) === 0) {
        const prior = this.initializerResult.pointer<NativeHeapObjectViews>(0).get();
        this.fields.writeUnsigned(8, flags | 1);
        this.fields.pointer<NativeHeapObjectViews>(4).set(prior);
        flags |= 1; this.trace.push('Game.ScriptAdmin.guard1.copy-prior');
      }
      // Guard bit 2 is set before Game type_info::name and SharedBase UnMangle.
      if ((flags & 2) === 0) {
        flags |= 2; this.fields.writeUnsigned(8, flags); this.trace.push('Game.ScriptAdmin.guard2');
        const typeName = this.call('Game.type_info.Name', () => this.typeInfo.getName());
        if (!typeName) throw new Error('Game ScriptAdmin type_info::Name dereferences a NULL result');
        const input = { fields: new NativeHeapObjectViews(typeName), offset: 0 };
        const firstSpace = this.call('SharedBase.UnMangle.strstr.IAT207d8830', () =>
          findNativeSpace(this.memory.byteGeometry(), input));
        const selected = firstSpace ? { fields: firstSpace.fields, offset: firstSpace.offset + 1 } : input;
        this.name = NativeHeapCString.beginTextConstruction(this.memory, this.stringSlot());
        this.call('SharedBase.bCString.text-constructor', () => this.name!.constructText(selected));
        const callback = this.call('Game._atexit.callback-capability', () => this.exit.callbackForMethod('scriptAdminClassNameDestructor'));
        const registration = this.call('Game._atexit', () => this.exit.atexit(callback));
        if (registration === 0) this.registeredCallback = callback;
        else this.trace.push('Game.ScriptAdmin._atexit.return-minus-one');
        this.trace.push('Game.ScriptAdmin.class-name-complete');
      }
      if (!this.name) throw new Error('Existing ScriptAdmin guard requires its retained SharedBase CString owner');
      return known(this.name);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }

  /** The installed callback is a thunk to the exact SharedBase bCString dtor.
   * The Game exit table retains it but does not own callback traversal. */
  invokeRegisteredDestructor(callback: NativeGameCrtCallback): NativeValue<void> {
    if (!this.registeredCallback || callback !== this.registeredCallback) {
      return unknown('Registered Game ScriptAdmin class-name destructor callback required');
    }
    if (this.active) { this.reentrant = true; return unknown('ScriptAdmin class-name destruction during startup is unowned'); }
    if (this.destroyed) return unknown('Game ScriptAdmin class-name lifetime has ended');
    if (!this.name) return unknown('Retained SharedBase ScriptAdmin CString required by Game destructor');
    this.trace.push('Game.scriptAdminClassNameDestructor205491a0.IAT207d8834');
    const result = this.name.destroy();
    if (result.known) this.destroyed = true;
    else this.boundary = result.reason;
    return result;
  }

  snapshot() { return Object.freeze({ boundary: this.boundary, destroyed: this.destroyed,
    name: this.name, registeredCallback: this.registeredCallback, trace: Object.freeze([...this.trace]) }); }
}
