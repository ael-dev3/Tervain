/** Original first Arena property initializer. Its retained prefix does not
 * certify completion of Create, registration, __cinit or NPC activation. */
import type { NativeValue } from './dialogue';
import { NativeGameCrtOwner } from './native-game-crt';
import { NativeGameArenaType } from './native-game-arena-type';
import { NativeHeapCString } from './native-heap-cstring';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeMemoryAdmin } from './native-memory-admin';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativePropertyTypeConstruction } from './native-property-type-construction';
import { admitGameArenaStatusSource } from './native-game-arena-status-source';

const owners = new WeakMap<NativeGameCrtOwner, NativeGameArenaStatusProperty>();
const token = Object.freeze({});
function fact<T>(result: NativeValue<T>): T {
  if (!result.known) throw new Error(result.reason);
  return result.value;
}
export class NativeGameArenaStatusProperty {
  readonly fields: NativeHeapObjectViews;
  #temporary: NativeHeapCString | null = null;
  #base: NativePropertyTypeConstruction | null = null;
  #arena: NativeGameArenaType;
  #active = false;
  #boundary: string | null = null;
  #trace: string[] = [];
  private constructor(readonly crt: NativeGameCrtOwner, private readonly memory: NativeMemoryAdmin, proof: object) {
    if (proof !== token || NativeGameCrtOwner.forPlatform(crt.host) !== crt) throw new Error('Canonical Game owner required');
    admitGameArenaStatusSource();
    this.#arena = NativeGameArenaType.forCrt(crt,memory);
    this.fields = crt.imageStorage('arenaStatusDescriptor');
    const receipt = crt.sourceProfile.heapRules.methods['arenaStatus.statusInitializer'];
    if (receipt?.entry !== '204b1dd0' || receipt.body !== '204b1dd0' || this.fields.bytes.length !== 36) {
      throw new Error('Original first Arena initializer and descriptor required');
    }
    const ctor = crt.sourceProfile.heapRules.imports?.Game?.find(row => row.iatVA === '0x207d8794');
    if (ctor?.module !== 'SharedBase.dll' || ctor.name !== '??0bCPropertyTypeBase@@IAE@ABVbCString@@W4bEPropertyType@@@Z') {
      throw new Error('Original SharedBase property constructor import differs');
    }
    for (const key of ['crt','memory','fields'] as const) Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
  }
  static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameArenaStatusProperty {
    const old=owners.get(crt);
    if(old) {if(old.memory!==memory)throw new Error('Status property cannot change its SharedBase heap');return old;}
    const owner=new NativeGameArenaStatusProperty(crt,memory,token);owners.set(crt,owner);return owner;
  }
  initialize():NativeValue<void> {
    if(this.#boundary)return {known:false,reason:this.#boundary};
    if(this.#active) {this.#boundary='Reentrant first Arena property initializer';return {known:false,reason:this.#boundary};}
    this.#active=true;
    try {
      if(this.crt.imageStorage('arenaStatusDescriptor')!==this.fields)throw new Error('Actual Game descriptor storage required');
      const temporarySlot=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:false});
      this.#temporary=NativeHeapCString.beginTextConstruction(this.memory,temporarySlot);
      fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.crt.host.platform as NativeRuntimePlatform,
        this.crt,'arenaStatusLiteral',0,7));
      fact(this.#temporary.constructText({fields:this.crt.imageStorage('arenaStatusLiteral'),offset:0}));
      if(this.#boundary)throw new Error(this.#boundary);
      this.#trace.push('204b1dda.Status.textConstructor');
      const base=new NativeHeapObjectViews(this.fields.backing,this.fields.bytes.byteOffset-this.fields.backing.bytes.byteOffset,24);
      this.#base=fact(NativePropertyTypeConstruction.construct(this.memory,base,{name:this.#temporary,propertyType:2}));
      if(this.#boundary)throw new Error(this.#boundary);
      this.#trace.push('204b1dec.propertyBaseConstructor');
      this.fields.writeUnsigned(0,0x20659aec);
      this.#trace.push('204b1df2.derivedVtable');
      const arena=fact(this.#arena.get());
      if(this.#boundary)throw new Error(this.#boundary);
      this.fields.pointer<NativeHeapObjectViews>(24).set(arena);
      this.fields.writeUnsigned(28,20);
      this.fields.pointer(32).set(null);
      this.#trace.push('204b1e15.ownerOffsetAndDefaultStored');
      throw new Error('Unowned first Arena property Create call at 204b1e1f');
    } catch(error) {
      this.#boundary ??= error instanceof Error ? error.message : String(error);
      return {known:false,reason:this.#boundary};
    } finally {this.#active=false;}
  }
  snapshot() {return Object.freeze({boundary:this.#boundary,temporaryName:this.#temporary,
    baseConstructed:this.#base!==null,trace:Object.freeze([...this.#trace]),
    initializerReturned:false,propertyRegistered:false,wholeCrtTraversalCompleted:false});}
}
