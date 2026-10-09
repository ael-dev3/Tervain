import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeMemoryAdmin} from './native-memory-admin';
import type {NativeMemoryAllocation} from './native-memory-admin';
import {NativeHeapCString} from './native-heap-cstring';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {admitArenaEnumSource,arenaEnumInstructions,arenaEnumSharedInstructions} from './native-game-arena-enum-source';
const owners=new WeakMap<NativeGameCrtOwner,NativeGameArenaEnum>();
function fact<T>(result:NativeValue<T>):T{if(!result.known)throw new Error(result.reason);return result.value;}

/** Selected original first enum initializer. Unsupported construction retains
 * actual prior string, scratch write and allocation; it cannot be replayed. */
export class NativeGameArenaEnum {
 #boundary:string|null=null;
 #entered=false;
 #temporary:NativeHeapCString|null=null;
 #allocation:NativeMemoryAllocation|null=null;
 #trace:string[]=[];
 private constructor(readonly crt:NativeGameCrtOwner,private readonly memory:NativeMemoryAdmin){}
 static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameArenaEnum{
  const old=owners.get(crt);if(old){if(old.memory!==memory)throw new Error('Actual retained enum heap required');return old;}
  if(!(crt.host.platform instanceof NativeRuntimePlatform)||!NativeMemoryAdmin.isForPlatform(memory,crt.host.platform))throw new Error('Same-platform enum heap required');
  const owner=new NativeGameArenaEnum(crt,memory);owners.set(crt,owner);return owner;
 }
 initialize():NativeValue<void>{
  if(this.#boundary)return {known:false,reason:this.#boundary};
  if(this.#entered)return {known:false,reason:'Original enum initializer cannot replay'};
  this.#entered=true;
  try{
   admitArenaEnumSource();
   const method=arenaEnumInstructions.find(row=>row.label==='arenaEnumValueConstructor');
   if(method?.bodyVA!=='0x20071e60'||method.instructions.find(row=>row.va==='20071e68')?.instruction!=='PUSH 0xc')
    throw new Error('Original enum constructor source required');
   const platform=this.crt.host.platform as NativeRuntimePlatform;
   fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(platform,this.crt,'statusNoneName',0,19));
   const slot=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:false});
   this.#temporary=NativeHeapCString.beginTextConstruction(this.memory,slot);
   fact(this.#temporary.constructText({fields:this.crt.imageStorage('statusNoneName'),offset:0}));
   this.#trace.push('204b1e7a.enumName.construct');
   const descriptor=this.crt.imageStorage('arenaStatusDescriptor');
   if(descriptor.readUnsigned(0)!==0x20659aec)throw new Error('Actual constructed Status descriptor required');
   fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(platform,this.crt,'enumValueScratch',0,4));
   this.crt.imageStorage('enumValueScratch').writeUnsigned(0,0);
   this.#trace.push('20071e6c.enumValueScratch.store0');
   this.#allocation=fact(this.memory.newObject(12,0x46));
   this.#trace.push('20071e71.enumValue.allocate12');
   if(!this.#allocation)throw new Error('Unowned enum NULL-value insertion at 20071eb3');
   const fields=new NativeHeapObjectViews(this.#allocation,0,12);
   fields.writeUnsigned(0,0x20659c74);
   this.#trace.push('20071e83.enumValue.vtable');
   const baseSource=arenaEnumSharedInstructions[0];
   if(baseSource?.bodyVA!=='0x1004a1c0'||baseSource.instructions.map(row=>row.bytes).join('')!=='8bc1c7001c7e0e10c3')
    throw new Error('Original bCObjectBase constructor required');
   // EDI is the actual +4 subobject. The three-instruction SharedBase body
   // returns this receiver after storing its original base vtable.
   const base=new NativeHeapObjectViews(this.#allocation,4,8);
   base.writeUnsigned(0,0x100e7e1c);
   this.#trace.push('1004a1c8.enumBaseConstructor.return');
   base.writeUnsigned(0,0x2065902c);
   const value=this.crt.imageStorage('enumValueScratch').readUnsigned(0);
   base.writeUnsigned(4,value);
   this.#trace.push('20071ea8.enumValue.store0');
   throw new Error('Unowned enum shared-name registries at 20071eab -> 200719a0');
  }catch(error){this.#boundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,temporary:this.#temporary,allocation:this.#allocation,
  trace:Object.freeze([...this.#trace]),initializerReturned:false,valueInserted:false});}
}
