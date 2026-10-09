/** Original FreePoint type getter prefix, bound to the retained Game CRT. */
import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeMemoryAdmin} from './native-memory-admin';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativePropertyObjectConstruction} from './native-property-object-construction';
import {admitGameFreePointSource,freePointImageReceipt} from './native-game-freepoint-source';
import {NativeGameFreePointClassName} from './native-game-freepoint-class-name';

const owners=new WeakMap<NativeGameCrtOwner,NativeGameFreePointType>();
const token=Object.freeze({});
export class NativeGameFreePointType {
 readonly storage:NativeHeapObjectViews;
 readonly fields:NativeHeapObjectViews;
 readonly base:NativeHeapObjectViews;
 #baseOwner:NativePropertyObjectConstruction|null=null;
 #factoryOwner:NativePropertyObjectConstruction|null=null;
 #boundary:string|null=null;
 #entered=false;
 #trace:string[]=[];
 private constructor(readonly crt:NativeGameCrtOwner,private readonly memory:NativeMemoryAdmin,grant:object){
  if(grant!==token||crt.module!=='Game'||NativeGameCrtOwner.forPlatform(crt.host)!==crt||
   !NativeMemoryAdmin.prototype.usesPlatform.call(memory,crt.host.platform))throw new Error('Canonical Game CRT and same-platform heap required for FreePoint type');
  admitGameFreePointSource();
  const receipt=freePointImageReceipt('freePointTypeAndGuard');
  if(receipt.address!=='207b5088'||receipt.bytes!==64)throw new Error('Original FreePoint type storage differs');
  const imported=crt.sourceProfile.heapRules.imports?.Game?.find(row=>row.iatVA==='0x207d870c');
  if(!imported||imported.module!=='SharedBase.dll'||imported.name!=='??0bCPropertyObjectTypeBase@@IAE@_N@Z'||imported.ordinal!==null)
   throw new Error('Original FreePoint property-type constructor import differs');
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
   throw new Error('Original FreePoint property singleton registration is not yet implemented at 2007331f');
  }catch(error){this.#boundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,entered:this.#entered,baseConstructed:this.#baseOwner!==null,factoryConstructed:this.#factoryOwner!==null,
  initializerReturned:false,registered:false,trace:Object.freeze([...this.#trace])});}
}
