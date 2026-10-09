/** Original FreePoint type getter prefix, bound to the retained Game CRT. */
import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeMemoryAdmin} from './native-memory-admin';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativePropertyObjectConstruction} from './native-property-object-construction';
import {admitGameFreePointSource,freePointImageReceipt} from './native-game-freepoint-source';
import {NativeGameFreePointClassName} from './native-game-freepoint-class-name';
import {NativePropertySingleton} from './native-property-singleton';
import {NativePropertyTypeTable} from './native-property-type-table';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {NativeGameExitTable} from './native-game-crt-exit-table';
import type {NativeGameCrtCallback} from './native-game-crt-exit-table';
import type {NativeMemoryAllocation} from './native-memory-admin';
import registration from '../../assets/gothic3/property-registration-lifecycle/source.json';

const owners=new WeakMap<NativeGameCrtOwner,NativeGameFreePointType>();
const token=Object.freeze({});
export class NativeGameFreePointType {
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
 #boundary:string|null=null;
 #entered=false;
 #trace:string[]=[];
 private constructor(readonly crt:NativeGameCrtOwner,private readonly memory:NativeMemoryAdmin,grant:object){
  if(grant!==token||crt.module!=='Game'||NativeGameCrtOwner.forPlatform(crt.host)!==crt||
   !NativeMemoryAdmin.prototype.usesPlatform.call(memory,crt.host.platform))throw new Error('Canonical Game CRT and same-platform heap required for FreePoint type');
  admitGameFreePointSource();
  const receipt=freePointImageReceipt('freePointTypeAndGuard');
  if(receipt.address!=='207b5088'||receipt.bytes!==64)throw new Error('Original FreePoint type storage differs');
  for(const [iat,name] of [['207d870c','??0bCPropertyObjectTypeBase@@IAE@_N@Z'],
   ['207d8710','??0bCPropertyObjectFactory@@QAE@ABVbCString@@@Z'],
   ['207d8868','?GetInstance@bCPropertyObjectSingleton@@SGAAV1@XZ'],
   ['207d8714','?RegisterTemplate@bCPropertyObjectSingleton@@QAE_NPBVbCPropertyObjectTypeBase@@@Z']]){
   const imported=crt.sourceProfile.heapRules.imports?.Game?.find(row=>row.iatVA==='0x'+iat);
   if(!imported||imported.module!=='SharedBase.dll'||imported.name!==name||imported.ordinal!==null)
    throw new Error('Original FreePoint type import differs: '+iat);
  }
  this.storage=crt.imageStorage('freePointTypeAndGuard');
  const begin=this.storage.bytes.byteOffset-this.storage.backing.bytes.byteOffset;
  this.fields=new NativeHeapObjectViews(this.storage.backing,begin,60);
  this.base=new NativeHeapObjectViews(this.storage.backing,begin,24);
  for(const key of ['crt','memory','storage','fields','base'] as const)Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
 }
 static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameFreePointType{
  const prior=owners.get(crt);
  if(prior){if(prior.memory!==memory)throw new Error('FreePoint type cannot change its retained heap');return prior;}
  const owner=new NativeGameFreePointType(crt,memory,token);owners.set(crt,owner);return owner;
 }
 get():NativeValue<NativeHeapObjectViews>{
  if(this.#boundary)return {known:false,reason:this.#boundary};
  try{
   admitGameFreePointSource();
   if(owners.get(this.crt)!==this||this.crt.imageStorage('freePointTypeAndGuard')!==this.storage||
    !NativeMemoryAdmin.prototype.usesPlatform.call(this.memory,this.crt.host.platform))throw new Error('Actual retained FreePoint type storage and heap required');
   const guard=this.storage.maskedWord(60,4);
   if((guard.knownMask&1)===0)throw new Error('Actual FreePoint type guard bit is unknown');
   if(this.#returned){if(!(guard.value&1))throw new Error('Returned FreePoint type requires retained guard');return {known:true,value:this.fields};}
   // A set guard is not proof that the interrupted constructor has returned.
   if(this.#entered||(guard.value&1)!==0)throw new Error('FreePoint type construction cannot replay or adopt an unowned guard');
   this.#entered=true;guard.value=(guard.value|1)>>>0;guard.knownMask=(guard.knownMask|1)>>>0;
   this.#trace.push('200732ed.type.guard1');
   const base=NativePropertyObjectConstruction.construct(this.memory,this.base,{kind:'objectType',flag:1});
   if(!base.known)throw new Error(base.reason);
   this.#baseOwner=base.value;this.#trace.push('200732f9.SharedBase.propertyTypeBase.return');
   this.fields.writeUnsigned(0,0x20659f94);this.#trace.push('200732ff.type.vtable20659f94');
   const name=NativeGameFreePointClassName.forCrt(this.crt,this.memory).get();
   if(!name.known)throw new Error(name.reason);
   this.#trace.push('20073309.className.return');
   const begin=this.storage.bytes.byteOffset-this.storage.backing.bytes.byteOffset;
   const factory=NativePropertyObjectConstruction.construct(this.memory,new NativeHeapObjectViews(this.storage.backing,begin+24,24),{kind:'namedFactory',name:name.value});
   if(!factory.known)throw new Error(factory.reason);
   this.#factoryOwner=factory.value;this.#trace.push('20073314.namedFactory.return');
   const platform=this.crt.host.platform;
   if(!(platform instanceof NativeRuntimePlatform))throw new Error('Original FreePoint registration requires its runtime platform');
   const selected=NativePropertySingleton.forPlatform(platform,this.memory);if(!selected.known)throw new Error(selected.reason);
   const instance=selected.value.get();if(!instance.known)throw new Error(instance.reason);
   if(instance.value!==selected.value.ranges.object)throw new Error('Actual retained property singleton required');
   this.#trace.push('2007331f.propertySingleton.return');
   const method=registration.methods.registerType;
   if(registration.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'||
    method.entryVA!=='0x1000191f'||method.bodyVA!=='0x100904d0'||method.bodyInstructionBytesSha256!=='0c455f701cd98d32fc6c2ee4e95b08504e9bd9de2c95313b66f70a5be3bb5a20')throw new Error('Original SharedBase RegisterTemplate source differs');
   const allocation=this.memory.newObject(4,0xed);if(!allocation.known)throw new Error(allocation.reason);
   this.#wrapper=allocation.value;
   if(this.#wrapper)new NativeHeapObjectViews(this.#wrapper,0,4).pointer(0).set(this.fields);
   if(this.fields.readUnsigned(0)!==0x20659f94||this.crt.imageStorage('freePointTypeVtable').readUnsigned(0)!==0x20018b42)
    throw new Error('Original FreePoint registration virtual class-name slot differs');
   const virtualName=NativeGameFreePointClassName.forCrt(this.crt,this.memory).get();if(!virtualName.known)throw new Error(virtualName.reason);
   const table=selected.value.table();if(!table.known)throw new Error(table.reason);
   const index=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:false});
   const slot=NativePropertyTypeTable.prototype.getOrInsertSlot.call(table.value,virtualName.value,index);if(!slot.known)throw new Error(slot.reason);
   this.#slot=slot.value;this.#slot.pointer(0).set(this.#wrapper);
   this.#registered=true;this.#trace.push('20073327.RegisterTemplate.return1');
   const exit=NativeGameExitTable.forCrt(this.crt),callback=exit.callbackForMethod('freePointTypeCleanup');
   if(!callback.known)throw new Error(callback.reason);
   const registered=exit.atexit(callback.value);if(!registered.known)throw new Error(registered.reason);
   if(registered.value===0)this.#callback=callback.value;
   this.#trace.push('20073332.cleanup.registered-result'+registered.value);
   this.#returned=true;this.#trace.push('2007333f.typeGetter.return');return {known:true,value:this.fields};
  }catch(error){this.#boundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,entered:this.#entered,baseConstructed:this.#baseOwner!==null,factoryConstructed:this.#factoryOwner!==null,
  initializerReturned:false,getterReturned:this.#returned,registered:this.#registered,wrapper:this.#wrapper,slot:this.#slot,callback:this.#callback,trace:Object.freeze([...this.#trace])});}
}
