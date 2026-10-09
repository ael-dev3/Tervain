/** Original FreePoint class-name cache and its same-Game RTTI name. */
import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeMemoryAdmin} from './native-memory-admin';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativeHeapCString} from './native-heap-cstring';
import {nativeGameTypeInfoForCrt} from './native-crt-undname';
import {findNativeSpace} from './native-byte-string';
import {NativeGameExitTable} from './native-game-crt-exit-table';
import type {NativeGameCrtCallback} from './native-game-crt-exit-table';
import {admitGameFreePointSource} from './native-game-freepoint-source';

const owners=new WeakMap<NativeGameCrtOwner,NativeGameFreePointClassName>();
const token=Object.freeze({});
function fact<T>(value:NativeValue<T>):T{if(!value.known)throw new Error(value.reason);return value.value;}
export class NativeGameFreePointClassName {
 readonly fields:NativeHeapObjectViews;
 readonly input:NativeHeapObjectViews;
 #name:NativeHeapCString|null=null;
 #callback:NativeGameCrtCallback|null=null;
 #boundary:string|null=null;
 #active=false;
 #trace:string[]=[];
 private constructor(readonly crt:NativeGameCrtOwner,private readonly memory:NativeMemoryAdmin,grant:object){
  if(grant!==token||NativeGameCrtOwner.forPlatform(crt.host)!==crt||!NativeMemoryAdmin.prototype.usesPlatform.call(memory,crt.host.platform))
   throw new Error('Canonical Game CRT and same-platform heap required for FreePoint class name');
  admitGameFreePointSource();
  this.fields=crt.imageStorage('freePointClassNameAndCache');this.input=crt.imageStorage('freePointClassNameInput');
  for(const [iat,name] of [['207d8830','?UnMangle@bCClassNameBase@@SG?AVbCString@@PBD@Z'],['207d8834','??1bCString@@QAE@XZ']]){
   const imported=crt.sourceProfile.heapRules.imports?.Game?.find(row=>row.iatVA==='0x'+iat);
   if(!imported||imported.module!=='SharedBase.dll'||imported.name!==name||imported.ordinal!==null)throw new Error('Original FreePoint class-name import differs');
  }
  for(const key of ['crt','memory','fields','input'] as const)Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
 }
 static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameFreePointClassName{
  const old=owners.get(crt);if(old){if(old.memory!==memory)throw new Error('FreePoint class name cannot change its retained heap');return old;}
  const owner=new NativeGameFreePointClassName(crt,memory,token);owners.set(crt,owner);return owner;
 }
 get():NativeValue<NativeHeapCString>{
  if(this.#boundary)return {known:false,reason:this.#boundary};
  if(this.#active){this.#boundary='FreePoint class-name construction cannot reenter';return {known:false,reason:this.#boundary};}
  this.#active=true;
  try{
   admitGameFreePointSource();
   if(owners.get(this.crt)!==this||this.crt.imageStorage('freePointClassNameAndCache')!==this.fields||this.crt.imageStorage('freePointClassNameInput')!==this.input)
    throw new Error('Actual retained FreePoint class-name image required');
   let flags=this.fields.readUnsigned(8);
   if(!(flags&1)){
    const prior=this.input.pointer<NativeHeapObjectViews>(0).get();
    flags=(flags|1)>>>0;this.fields.writeUnsigned(8,flags);this.fields.pointer(4).set(prior);this.#trace.push('20073132.guard1.copy-prior');
   }
   if(!(flags&2)){
    flags=(flags|2)>>>0;this.fields.writeUnsigned(8,flags);this.#trace.push('2007314e.guard2');
    const name=fact(nativeGameTypeInfoForCrt(this.crt,'freePoint').getName());
    if(!name)throw new Error('FreePoint UnMangle requires non-NULL original type_info name');
    const input={fields:new NativeHeapObjectViews(name),offset:0};
    const space=fact(findNativeSpace(this.memory.byteGeometry(),input));
    const selected=space?{fields:space.fields,offset:space.offset+1}:input;
    const begin=this.fields.bytes.byteOffset-this.fields.backing.bytes.byteOffset;
    this.#name=NativeHeapCString.beginTextConstruction(this.memory,new NativeHeapObjectViews(this.fields.backing,begin,4));
    fact(this.#name.constructText(selected));this.#trace.push('2007315e.UnMangle.return');
    const exit=NativeGameExitTable.forCrt(this.crt),callback=fact(exit.callbackForMethod('freePointClassNameCleanup'));
    const result=fact(exit.atexit(callback));if(result===0)this.#callback=callback;
    this.#trace.push('20073169.cleanup.registered-result'+result);
   }
   if(this.#boundary)throw new Error(this.#boundary);
   if(!this.#name)throw new Error('FreePoint class-name guard requires its retained CString owner');
   this.#trace.push('20073176.className.return');return {known:true,value:this.#name};
  }catch(error){this.#boundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
  finally{this.#active=false;}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,name:this.#name,callback:this.#callback,trace:Object.freeze([...this.#trace])});}
}
