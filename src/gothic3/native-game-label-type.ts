import {NativePropertySingleton} from './native-property-singleton';
import {NativePropertyTypeTable} from './native-property-type-table';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {NativeGameExitTable} from './native-game-crt-exit-table';
import type {NativeGameCrtCallback} from './native-game-crt-exit-table';
import type {NativeMemoryAllocation} from './native-memory-admin';
import registration from '../../assets/gothic3/property-registration-lifecycle/source.json';
/** Original Label type construction prefix on the retained Game image. */
import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeMemoryAdmin} from './native-memory-admin';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativeGameLabelClassName} from './native-game-label-class-name';
import {NativePropertyObjectConstruction} from './native-property-object-construction';
import {admitGameLabelSource,labelImageReceipt} from './native-game-label-source';

const owners=new WeakMap<NativeGameCrtOwner,NativeGameLabelType>();
const token=Object.freeze({});
export class NativeGameLabelType {
 readonly storage:NativeHeapObjectViews;
 readonly fields:NativeHeapObjectViews;
 readonly base:NativeHeapObjectViews;
 #baseOwner:NativePropertyObjectConstruction|null=null;
 #factoryOwner:NativePropertyObjectConstruction|null=null;
 #wrapper:NativeMemoryAllocation|null=null;
 #slot:NativeHeapObjectViews|null=null;
 #callback:NativeGameCrtCallback|null=null;
 #registered=false;
 #returned=false;
 #entered=false;
 #boundary:string|null=null;
 private constructor(readonly crt:NativeGameCrtOwner,private readonly memory:NativeMemoryAdmin,grant:object){
  if(grant!==token||NativeGameCrtOwner.forPlatform(crt.host)!==crt||
   !NativeMemoryAdmin.prototype.usesPlatform.call(memory,crt.host.platform))throw new Error('Canonical Game CRT and same-platform heap required for Label type');
  admitGameLabelSource();
  const receipt=labelImageReceipt('labelTypeAndGuard');
  if(receipt.address!=='207b5138'||receipt.bytes!==64)throw new Error('Original Label type storage differs');
  const imported=crt.sourceProfile.heapRules.imports?.Game?.find(row=>row.iatVA==='0x207d870c');
  if(!imported||imported.module!=='SharedBase.dll'||imported.name!=='??0bCPropertyObjectTypeBase@@IAE@_N@Z'||imported.ordinal!==null)
   throw new Error('Original Label type-base constructor import differs');
  this.storage=crt.imageStorage('labelTypeAndGuard');
  const begin=this.storage.bytes.byteOffset-this.storage.backing.bytes.byteOffset;
  this.fields=new NativeHeapObjectViews(this.storage.backing,begin,60);
  this.base=new NativeHeapObjectViews(this.storage.backing,begin,24);
  for(const key of ['crt','memory','storage','fields','base'] as const)Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
 }
 static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameLabelType {
  const prior=owners.get(crt);if(prior){if(prior.memory!==memory)throw new Error('Label type cannot change its retained heap');return prior;}
  const owner=new NativeGameLabelType(crt,memory,token);owners.set(crt,owner);return owner;
 }
 get():NativeValue<NativeHeapObjectViews>{
  if(this.#boundary)return {known:false,reason:this.#boundary};
  try{
   admitGameLabelSource();
   if(owners.get(this.crt)!==this||this.crt.imageStorage('labelTypeAndGuard')!==this.storage)
    throw new Error('Actual retained Label type owner required');
   const guard=this.storage.maskedWord(60,4);
   if((guard.knownMask&1)===0)throw new Error('Actual Label guard bit is unknown');
   if(this.#returned){if(!(guard.value&1))throw new Error('Returned Label type requires retained guard');return {known:true,value:this.fields};}
   if(this.#entered||(guard.value&1)!==0)throw new Error('Interrupted Label construction cannot replay or adopt an unowned guard');
   this.#entered=true;guard.value=(guard.value|1)>>>0;guard.knownMask=(guard.knownMask|1)>>>0;
   const base=NativePropertyObjectConstruction.construct(this.memory,this.base,{kind:'objectType',flag:1});
   if(!base.known)throw new Error(base.reason);
   this.#baseOwner=base.value;this.fields.writeUnsigned(0,0x2065a384);
   const name=NativeGameLabelClassName.forCrt(this.crt,this.memory).get();if(!name.known)throw new Error(name.reason);
   const begin=this.storage.bytes.byteOffset-this.storage.backing.bytes.byteOffset;
   const factory=NativePropertyObjectConstruction.construct(this.memory,new NativeHeapObjectViews(this.storage.backing,begin+24,24),{kind:'namedFactory',name:name.value});
   if(!factory.known)throw new Error(factory.reason);
   this.#factoryOwner=factory.value;
   const platform=this.crt.host.platform;
   if(!(platform instanceof NativeRuntimePlatform))throw new Error('Original Label registration requires its runtime platform');
   const selected=NativePropertySingleton.forPlatform(platform,this.memory);if(!selected.known)throw new Error(selected.reason);
   const instance=selected.value.get();if(!instance.known)throw new Error(instance.reason);
   if(instance.value!==selected.value.ranges.object)throw new Error('Actual retained property singleton required');
   const method=registration.methods.registerType;
   if(registration.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'||
    method.entryVA!=='0x1000191f'||method.bodyVA!=='0x100904d0'||method.bodyInstructionBytesSha256!=='0c455f701cd98d32fc6c2ee4e95b08504e9bd9de2c95313b66f70a5be3bb5a20')throw new Error('Original SharedBase RegisterTemplate source differs');
   const allocation=this.memory.newObject(4,0xed);if(!allocation.known)throw new Error(allocation.reason);
   this.#wrapper=allocation.value;
   if(this.#wrapper)new NativeHeapObjectViews(this.#wrapper,0,4).pointer(0).set(this.fields);
   if(this.fields.readUnsigned(0)!==0x2065a384||this.crt.imageStorage('labelTypeVtable').readUnsigned(0)!==0x20004bb0)
    throw new Error('Original Label registration virtual class-name slot differs');
   const virtualName=NativeGameLabelClassName.forCrt(this.crt,this.memory).get();if(!virtualName.known)throw new Error(virtualName.reason);
   const table=selected.value.table();if(!table.known)throw new Error(table.reason);
   const index=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:false});
   const slot=NativePropertyTypeTable.prototype.getOrInsertSlot.call(table.value,virtualName.value,index);if(!slot.known)throw new Error(slot.reason);
   this.#slot=slot.value;this.#slot.pointer(0).set(this.#wrapper);this.#registered=true;
   const exit=NativeGameExitTable.forCrt(this.crt),callback=exit.callbackForMethod('labelTypeCleanup');
   if(!callback.known)throw new Error(callback.reason);
   const registered=exit.atexit(callback.value);if(!registered.known)throw new Error(registered.reason);
   if(registered.value===0)this.#callback=callback.value;
   this.#returned=true;return {known:true,value:this.fields};
  }catch(error){this.#boundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,entered:this.#entered,baseConstructed:this.#baseOwner!==null,factoryConstructed:this.#factoryOwner!==null,getterReturned:this.#returned,registered:this.#registered,wrapper:this.#wrapper,slot:this.#slot,callback:this.#callback});}
}
