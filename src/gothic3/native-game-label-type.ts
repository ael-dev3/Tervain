/** Original Label type construction prefix on the retained Game image. */
import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeMemoryAdmin} from './native-memory-admin';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativePropertyObjectConstruction} from './native-property-object-construction';
import {admitGameLabelSource,labelImageReceipt} from './native-game-label-source';

const owners=new WeakMap<NativeGameCrtOwner,NativeGameLabelType>();
const token=Object.freeze({});
export class NativeGameLabelType {
 readonly storage:NativeHeapObjectViews;
 readonly fields:NativeHeapObjectViews;
 readonly base:NativeHeapObjectViews;
 #baseOwner:NativePropertyObjectConstruction|null=null;
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
   if(this.#entered||(guard.value&1)!==0)throw new Error('Interrupted Label construction cannot replay or adopt an unowned guard');
   this.#entered=true;guard.value=(guard.value|1)>>>0;guard.knownMask=(guard.knownMask|1)>>>0;
   const base=NativePropertyObjectConstruction.construct(this.memory,this.base,{kind:'objectType',flag:1});
   if(!base.known)throw new Error(base.reason);
   this.#baseOwner=base.value;this.fields.writeUnsigned(0,0x2065a384);
   throw new Error('Original Label class-name CALL is not yet admitted at 200752b9 -> 200340d6');
  }catch(error){this.#boundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,entered:this.#entered,baseConstructed:this.#baseOwner!==null,getterReturned:false});}
}
