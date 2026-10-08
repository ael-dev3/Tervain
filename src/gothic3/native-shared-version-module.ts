/** Selected current SharedBase module reference for its version query.
 * Tracks additional library references; it does not execute DLL attach/detach. */
import source from '../../assets/gothic3/shared-dll-entry-source/source.json';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {NativeSharedModuleImage} from './native-shared-module-image';
import type {NativeValue} from './dialogue';
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedVersionModule>();
const token=Object.freeze({});
export interface NativeSharedVersionModuleCapability {readonly identity:object;readonly owner:object;readonly name:'sharedbase.dll';}
export class NativeSharedVersionModule {
 readonly #identity=Object.freeze({});
 readonly #module:NativeSharedVersionModuleCapability=Object.freeze({identity:Object.freeze({}),owner:this.#identity,name:'sharedbase.dll'});
 #references=0;
 private constructor(private readonly platform:NativeRuntimePlatform,private readonly image:NativeSharedModuleImage,key:object){
  if(key!==token||source.inputSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'||source.versionExportLookup.name!=='DllGetVersion'||source.versionExportLookup.namedExportCount!==4805||source.versionExportLookup.namesSha256!=='6b148aaa9c93214d7a989ed261f0655e4af05ed72cd19bd7c8ef9d5b2b307810'||source.versionExportLookup.matches.length!==0)throw new Error('Original current SharedBase export evidence required');
 }
 static forPlatform(platform:NativeRuntimePlatform,profile:'current-sharedbase-version-query'):NativeValue<NativeSharedVersionModule>{
  try{const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;if(profile!=='current-sharedbase-version-query')throw new Error('Explicit current-module version-query selection required');const image=NativeSharedModuleImage.forPlatform(platform);if(!image.known)return image;let owner=owners.get(platform);if(!owner){owner=new NativeSharedVersionModule(platform,image.value,token);owners.set(platform,owner);}return {known:true,value:owner};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 #live(module?:object):void{
  const active=NativeRuntimePlatform.requireActivePlatform(this.platform);if(!active.known)throw new Error(active.reason);const image=NativeSharedModuleImage.forPlatform(this.platform);if(!image.known||image.value!==this.image||owners.get(this.platform)!==this)throw new Error('Actual live current SharedBase module required');if(module!==undefined&&module!==this.#module)throw new Error('Canonical same-platform SharedBase module capability required');
 }
 #failure(error:unknown):NativeValue<never>{return {known:false,reason:error instanceof Error?error.message:String(error)};}
 acquire(filename:string):NativeValue<NativeSharedVersionModuleCapability>{
  try{this.#live();if(filename!=='sharedbase.dll')throw new Error('Original current-module filename required');if(this.#references===0xffffffff)throw new Error('Owned library reference extent exceeded');this.#references++;return {known:true,value:this.#module};}catch(error){return this.#failure(error);}
 }
 lookupVersionExport(module:object,name:string):NativeValue<null>{
  try{this.#live(module);if(name!=='DllGetVersion')throw new Error('Captured version export lookup required');return {known:true,value:null};}catch(error){return this.#failure(error);}
 }
 release(module:object):NativeValue<number>{
  try{this.#live(module);if(this.#references===0)throw new Error('Actual additional library reference required before release');this.#references--;return {known:true,value:1};}catch(error){return this.#failure(error);}
 }
 snapshot(){const active=NativeRuntimePlatform.requireActivePlatform(this.platform),image=NativeSharedModuleImage.forPlatform(this.platform);return Object.freeze({additionalReferences:this.#references,currentImageRetained:active.known&&image.known&&image.value===this.image,attachExecuted:false});}
}
