import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeGameExitTable} from './native-game-crt-exit-table';
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
 #nameEntry:NativeMemoryAllocation|null=null;
 #entryName:NativeHeapCString|null=null;
 #bucket:number|null=null;
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
   const guard=this.crt.imageStorage('enumNameRegistryGuard');
   fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(platform,this.crt,'enumNameRegistryGuard',0,4));
   if((guard.readUnsigned(0)&1)!==0)throw new Error('Unowned preexisting enum name registry at 200719cd');
   guard.writeUnsigned(0,guard.readUnsigned(0)|1);
   this.#trace.push('200719b0.enumNameRegistry.guard1');
   const registry=this.crt.imageStorage('enumNameRegistry');
   fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(platform,this.crt,'enumNameRegistry',0,16));
   for(const offset of [0,4,8,12])registry.writeUnsigned(offset,0);
   this.#trace.push('200711bb.enumNameRegistry.zeroFields');
   // Original reserve(43,0) chooses minimum growth eight from capacity zero:
   // 51 DWORDs, with all bytes cleared before publishing capacity.
   const buckets=fact(this.memory.realloc(null,204));
   registry.pointer(0).set(buckets);
   if(!buckets)throw new Error('Original enum registry memset dereferences NULL at 2006e96d');
   const bucketFields=new NativeHeapObjectViews(buckets,0,204);
   for(let offset=0;offset<204;offset+=4)bucketFields.writeUnsigned(offset,0);
   registry.writeUnsigned(8,51);
   registry.writeUnsigned(4,43);
   this.#trace.push('200711e6.enumNameRegistry.constructor.return');
   const exit=NativeGameExitTable.forCrt(this.crt);
   const callback=fact(exit.callbackForMethod('enumNameRegistryCleanup'));
   const registered=fact(exit.atexit(callback));
   this.#trace.push(registered===0?'200719c5.enumNameRegistry.cleanupRegistered':'200719c5.enumNameRegistry.cleanupReturnMinusOne');
   const hash=fact(this.#temporary.hash()),bucket=hash%registry.readUnsigned(4);
   this.#bucket=bucket;
   const bucketSlot=new NativeHeapObjectViews(buckets,bucket*4,4);
   if(bucketSlot.readUnsigned(0)!==0)throw new Error('Unowned nonempty enum name bucket comparison at 2006f6d4');
   this.#trace.push('2006f6e6.enumName.findAbsent');
   this.#nameEntry=fact(this.memory.newObject(16,0x199));
   if(!this.#nameEntry)throw new Error('Original enum name assignment reaches NULL entry at 2007090e');
   const entryFields=new NativeHeapObjectViews(this.#nameEntry,0,16);
   this.#entryName=new NativeHeapCString(this.memory,new NativeHeapObjectViews(this.#nameEntry,0,4));
   entryFields.writeUnsigned(4,0x100e7e1c);
   entryFields.writeUnsigned(4,0x2065902c);
   entryFields.writeUnsigned(8,this.crt.imageStorage('enumValueScratch').readUnsigned(0));
   fact(this.#entryName.assign(this.#temporary));
   entryFields.pointer(12).set(null);
   bucketSlot.pointer(0).set(this.#nameEntry);
   registry.writeUnsigned(12,(registry.readUnsigned(12)+1)>>>0);
   this.#trace.push('2007092f.enumName.lookupReturnActualSubobject');
   throw new Error('Unowned enum value virtual assignment at 200719e8 (name registry lookup returned)');
  }catch(error){this.#boundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,temporary:this.#temporary,allocation:this.#allocation,
  nameEntry:this.#nameEntry,entryName:this.#entryName,bucket:this.#bucket,
  trace:Object.freeze([...this.#trace]),initializerReturned:false,valueInserted:false});}
}
