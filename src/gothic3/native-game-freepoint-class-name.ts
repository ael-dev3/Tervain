/** Both original FreePoint callers share the existing static class-name owner. */
import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeMemoryAdmin} from './native-memory-admin';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativeHeapCString} from './native-heap-cstring';
import {NativeGameClassName} from './native-game-class-name-family';
import {gameClassNameSpec} from './native-game-class-name-family-source';
import {admitGameFreePointSource} from './native-game-freepoint-source';

const owners=new WeakMap<NativeGameCrtOwner,NativeGameFreePointClassName>();
const token=Object.freeze({});
export class NativeGameFreePointClassName {
 readonly fields:NativeHeapObjectViews;
 readonly input:NativeHeapObjectViews;
 readonly #owner:NativeGameClassName;
 private constructor(readonly crt:NativeGameCrtOwner,private readonly memory:NativeMemoryAdmin,grant:object){
  if(grant!==token||NativeGameCrtOwner.forPlatform(crt.host)!==crt||!NativeMemoryAdmin.prototype.usesPlatform.call(memory,crt.host.platform))
   throw new Error('Canonical Game CRT and same-platform heap required for FreePoint class name');
  admitGameFreePointSource();
  const spec=gameClassNameSpec('204b23c0');
  if(!spec||spec.getter!=='20017d78'||spec.getterBody!=='20073120'||spec.destructorEntry!=='2002ec53'||spec.destructorBody!=='20549b60')
   throw new Error('Actual original FreePoint class-name specification required');
  this.#owner=NativeGameClassName.forSpec(crt,memory,spec);
  this.fields=this.#owner.fields;this.input=this.#owner.initializerResult;
  const aliases:readonly (readonly [NativeHeapObjectViews,NativeHeapObjectViews])[]=[[this.fields,crt.imageStorage('freePointClassNameAndCache')],
   [this.input,crt.imageStorage('freePointClassNameInput')],
   [crt.imageStorage(spec.labels.descriptor),crt.imageStorage('freePointTypeInfoDescriptor')]];
  for(const [original,alias] of aliases){
   if(original.backing!==alias.backing||original.bytes.byteOffset!==alias.bytes.byteOffset||original.bytes.length!==alias.bytes.length)
    throw new Error('Actual same physical FreePoint image aliases required');
  }
  for(const key of ['crt','memory','fields','input'] as const)Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
 }
 static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameFreePointClassName{
  const old=owners.get(crt);if(old){if(old.memory!==memory)throw new Error('FreePoint class name cannot change its retained heap');return old;}
  const owner=new NativeGameFreePointClassName(crt,memory,token);owners.set(crt,owner);return owner;
 }
 get():NativeValue<NativeHeapCString>{admitGameFreePointSource();return NativeGameClassName.prototype.get.call(this.#owner);}
 snapshot(){return this.#owner.snapshot();}
}
