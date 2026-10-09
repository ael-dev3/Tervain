/** Translate the verified static class-name pattern with separate native owners. */
import type { NativeValue } from './dialogue';
import { NativeGameCrtOwner } from './native-game-crt';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeGameExitTable, type NativeGameCrtCallback } from './native-game-crt-exit-table';
import { nativeGameTypeInfoForCrt, type NativeGameTypeInfoTarget } from './native-crt-undname';
import { findNativeSpace } from './native-byte-string';
import { isGameClassNameSpec, type GameClassNameSpec } from './native-game-class-name-family-source';
import { NativeGameLayerBaseClassName } from './native-game-layer-base-class-name';
import { NativeGameNavigationClassName } from './native-game-navigation-class-name';
import { NativeGameScriptAdminClassName } from './native-game-script-admin-class-name';
import { NativeGameArenaClassName } from './native-game-arena-class-name';
import { NativeGameArenaStatusClassName } from './native-game-arena-status-class-name';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
const owners = new WeakMap<NativeGameCrtOwner, Map<GameClassNameSpec, NativeGameClassName>>();
const token = Object.freeze({});

export class NativeGameClassName {
  readonly fields: NativeHeapObjectViews;
  readonly initializerResult: NativeHeapObjectViews;
  #name: NativeHeapCString | null = null;
  #callback: NativeGameCrtCallback | null = null;
  #boundary: string | null = null;
  #active = false;
  #destroyed = false;
  #trace: string[] = [];
  private constructor(readonly crt: NativeGameCrtOwner, readonly memory: NativeMemoryAdmin,
    readonly spec: GameClassNameSpec, grant: object) {
    if (grant !== token || !isGameClassNameSpec(spec) || spec.legacyOwner ||
        !NativeModuleCrtOwner.isConstructedOwner(crt) || NativeGameCrtOwner.forPlatform(crt.host) !== crt ||
        !NativeMemoryAdmin.isForPlatform(memory, crt.host.platform as NativeRuntimePlatform)) {
      throw new Error('Canonical Game class-name source, CRT and same-platform MemoryAdmin required');
    }
    const methods = crt.sourceProfile.heapRules.methods;
    for (const [label, entry, body, hash, chain] of [
      [spec.labels.getter,spec.getter,spec.getterBody,spec.getterHash,spec.getterChain],
      [spec.labels.destructor,spec.destructorEntry,spec.destructorBody,spec.destructorHash,spec.destructorChain],
    ] as const) {
      const method = methods[label] as typeof methods[string] & { entryChain?: typeof chain };
      if (!method || method.module !== 'Game' || method.entry !== entry || method.body !== body ||
          method.bodyInstructionBytesSha256 !== hash || JSON.stringify(method.entryChain) !== JSON.stringify(chain)) {
        throw new Error('Original Game class-name method receipt differs: '+label);
      }
    }
    this.fields = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt,spec.labels.cache));
    this.initializerResult = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt,spec.labels.result));
    if (this.fields.bytes.length !== 12 || this.initializerResult.bytes.length !== 4) throw new Error('Original class-name field geometry required');
    for (const key of ['crt','memory','spec','fields','initializerResult'] as const)
      Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
  }
  static forSpec(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin, spec: GameClassNameSpec): NativeGameClassName {
    if (!isGameClassNameSpec(spec) || spec.legacyOwner) throw new Error('Actual nonlegacy Game class-name specification required');
    let map = owners.get(crt); if (!map) { map = new Map(); owners.set(crt,map); }
    const existing = map.get(spec);
    if (existing) {
      if (existing.memory !== memory) throw new Error('Game class-name singleton cannot replace its MemoryAdmin');
      return existing;
    }
    const owner = new NativeGameClassName(crt,memory,spec,token); map.set(spec,owner); return owner;
  }
  #checked<T>(result: NativeValue<T>): T {
    const value = fact(result); if (this.#boundary) throw new Error(this.#boundary); return value;
  }
  get(): NativeValue<NativeHeapCString> {
    if (this.#active) { this.#boundary ??= 'Unsupported Game class-name reentry'; return unknown(this.#boundary); }
    if (this.#boundary) return unknown(this.#boundary);
    if (this.#destroyed) return unknown('Original Game class-name lifetime has ended');
    this.#active = true;
    try {
      if (fact(NativeModuleCrtOwner.canonicalImageForOwner(this.crt,this.spec.labels.cache)) !== this.fields ||
          fact(NativeModuleCrtOwner.canonicalImageForOwner(this.crt,this.spec.labels.result)) !== this.initializerResult ||
          !NativeMemoryAdmin.isForPlatform(this.memory,this.crt.host.platform as NativeRuntimePlatform)) throw new Error('Actual retained Game class-name fields and heap required');
      let flags = this.fields.readUnsigned(8);
      if (!(flags & 1)) {
        const prior = this.initializerResult.pointer(0).get();
        this.fields.writeUnsigned(8,flags | 1); this.fields.pointer(4).set(prior);
        flags |= 1; this.#trace.push('guard1.copy-prior');
      }
      if (!(flags & 2)) {
        this.fields.writeUnsigned(8,flags | 2); this.#trace.push('guard2');
        const typeInfo = nativeGameTypeInfoForCrt(this.crt,this.spec.typeTarget as NativeGameTypeInfoTarget);
        const typeName = this.#checked(typeInfo.getName());
        if (!typeName) throw new Error('Original class-name UnMangle dereferences NULL');
        const input = { fields: new NativeHeapObjectViews(typeName), offset: 0 };
        const space = this.#checked(findNativeSpace(this.memory.byteGeometry(),input));
        const selected = space ? { fields: space.fields, offset: space.offset + 1 } : input;
        const offset = this.fields.bytes.byteOffset - this.fields.backing.bytes.byteOffset;
        this.#name = NativeHeapCString.beginTextConstruction(this.memory,new NativeHeapObjectViews(this.fields.backing,offset,4));
        this.#checked(this.#name.constructText(selected));
        if (this.#boundary) throw new Error(this.#boundary);
        const exit = NativeGameExitTable.forCrt(this.crt);
        const callback = this.#checked(exit.callbackForMethod(this.spec.labels.destructor));
        if (this.#checked(exit.atexit(callback)) === 0) this.#callback = callback;
        this.#trace.push('name-complete');
      }
      if (!this.#name) throw new Error('Warm original Game class-name guard requires its retained CString owner');
      return known(this.#name);
    } catch (error) {
      this.#boundary ??= error instanceof Error ? error.message : String(error);
      this.#trace.push('blocked:'+this.#boundary); return unknown(this.#boundary);
    } finally { this.#active = false; }
  }
  invokeRegisteredDestructor(callback: NativeGameCrtCallback): NativeValue<void> {
    if (!this.#callback || callback !== this.#callback || this.#active || this.#destroyed || !this.#name)
      return unknown('Actual registered Game class-name destructor and retained CString required');
    const result = this.#name.destroy();
    if (result.known) this.#destroyed = true; else this.#boundary = result.reason;
    return result;
  }
  snapshot() { return Object.freeze({ name:this.#name,callback:this.#callback,boundary:this.#boundary,
    destroyed:this.#destroyed,trace:Object.freeze([...this.#trace]) }); }
}

/** Reuse established owners for the six overlapping native static caches. */
export function getGameClassName(crt: NativeGameCrtOwner, memory: NativeMemoryAdmin,
  spec: GameClassNameSpec): NativeValue<{ readonly fields: NativeHeapObjectViews; readonly name: NativeHeapCString }> {
  if (!isGameClassNameSpec(spec)) return unknown('Original Game class-name specification identity required');
  const alias = spec.legacyOwner;
  const owner = alias === 'layerBase' ? NativeGameLayerBaseClassName.forCrt(crt,memory)
    : alias === 'objectRef' ? NativeGameLayerBaseClassName.forObjectRefCrt(crt,memory)
    : alias === 'navigation' ? NativeGameNavigationClassName.forCrt(crt,memory)
    : alias === 'scriptAdmin' ? NativeGameScriptAdminClassName.forCrt(crt,memory)
    : alias === 'arena' ? NativeGameArenaClassName.forCrt(crt,memory)
    : alias === 'arenaStatus' ? NativeGameArenaStatusClassName.forCrt(crt,memory)
    : NativeGameClassName.forSpec(crt,memory,spec);
  const get = alias === 'layerBase' || alias === 'objectRef' ? NativeGameLayerBaseClassName.prototype.get
    : alias === 'navigation' ? NativeGameNavigationClassName.prototype.get
    : alias === 'scriptAdmin' ? NativeGameScriptAdminClassName.prototype.get
    : alias === 'arena' ? NativeGameArenaClassName.prototype.get
    : alias === 'arenaStatus' ? NativeGameArenaStatusClassName.prototype.get : NativeGameClassName.prototype.get;
  const name = Reflect.apply(get,owner,[]) as NativeValue<NativeHeapCString>;
  return name.known ? known({fields:owner.fields,name:name.value}) : name;
}
