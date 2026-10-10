/** Both original AIHelperAdmin callers share the existing static class-name owner. */
import type {NativeValue} from './dialogue';
import {NativeGameCrtOwner} from './native-game-crt';
import {NativeMemoryAdmin} from './native-memory-admin';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativeHeapCString} from './native-heap-cstring';
import {NativeGameClassName} from './native-game-class-name-family';
import {gameClassNameSpec} from './native-game-class-name-family-source';
import {admitGameAIHelperAdminSource} from './native-game-ai-helper-admin-source';

const owners=new WeakMap<NativeGameCrtOwner,NativeGameAIHelperAdminClassName>();
const token=Object.freeze({});
export class NativeGameAIHelperAdminClassName {
 readonly fields:NativeHeapObjectViews;
 readonly input:NativeHeapObjectViews;
 readonly #owner:NativeGameClassName;
 private constructor(readonly crt:NativeGameCrtOwner,private readonly memory:NativeMemoryAdmin,grant:object){
  if(grant!==token||NativeGameCrtOwner.forPlatform(crt.host)!==crt||!NativeMemoryAdmin.prototype.usesPlatform.call(memory,crt.host.platform))
   throw new Error('Canonical Game CRT and same-platform heap required for AIHelperAdmin class name');
  admitGameAIHelperAdminSource();
  const spec=gameClassNameSpec('204b2970');
  if(!spec||spec.getter!=='200191f0'||spec.getterBody!=='20077150'||spec.destructorEntry!=='20029c94'||spec.destructorBody!=='20549d40')
   throw new Error('Actual original AIHelperAdmin class-name specification required');
  this.#owner=NativeGameClassName.forSpec(crt,memory,spec);
  this.fields=this.#owner.fields;this.input=this.#owner.initializerResult;
  const aliases:readonly (readonly [NativeHeapObjectViews,NativeHeapObjectViews])[]=[[this.fields,crt.imageStorage('aiHelperAdminClassNameAndCache')],
   [this.input,crt.imageStorage('aiHelperAdminClassNameInput')],
   [crt.imageStorage(spec.labels.descriptor),crt.imageStorage('aiHelperAdminTypeInfoDescriptor')]];
  for(const [original,alias] of aliases){
   if(original.backing!==alias.backing||original.bytes.byteOffset!==alias.bytes.byteOffset||original.bytes.length!==alias.bytes.length)
    throw new Error('Actual same physical AIHelperAdmin image aliases required');
  }
  for(const key of ['crt','memory','fields','input'] as const)Object.defineProperty(this,key,{value:this[key],writable:false,configurable:false});
 }
 static forCrt(crt:NativeGameCrtOwner,memory:NativeMemoryAdmin):NativeGameAIHelperAdminClassName{
  const old=owners.get(crt);if(old){if(old.memory!==memory)throw new Error('AIHelperAdmin class name cannot change its retained heap');return old;}
  const owner=new NativeGameAIHelperAdminClassName(crt,memory,token);owners.set(crt,owner);return owner;
 }
 get():NativeValue<NativeHeapCString>{admitGameAIHelperAdminSource();return NativeGameClassName.prototype.get.call(this.#owner);}
 snapshot(){return this.#owner.snapshot();}
}
