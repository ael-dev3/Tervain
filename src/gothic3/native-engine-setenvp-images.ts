/** Separate Engine envp globals; the existing environment block is not reseeded. */
import type {NativeValue} from './dialogue';
import {NativeModuleCrtOwner} from './native-engine-crt-locks';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {NativeHeapObjectViews} from './native-heap-views';
import {engineSetenvpImage} from './native-engine-setenvp-source';
type Label='environmentVector'|'environmentReady';
const owners=new WeakMap<NativeModuleCrtOwner,NativeEngineSetenvpImages>();
const token=Object.freeze({});
const viewBuffer=Object.getOwnPropertyDescriptor(DataView.prototype,'buffer')!.get!;
const viewOffset=Object.getOwnPropertyDescriptor(DataView.prototype,'byteOffset')!.get!;
const viewLength=Object.getOwnPropertyDescriptor(DataView.prototype,'byteLength')!.get!;
export class NativeEngineSetenvpImages {
 readonly #crt:NativeModuleCrtOwner;
 readonly #platform:NativeRuntimePlatform;
 readonly #images=new Map<Label,Readonly<{fields:NativeHeapObjectViews;backing:NativeHeapObjectViews['backing'];bytes:Uint8Array;masks:Uint8Array;rootBytes:Uint8Array;rootMasks:Uint8Array;view:DataView}>>();
 private constructor(crt:NativeModuleCrtOwner,grant:object){
  if(grant!==token||new.target!==NativeEngineSetenvpImages||!NativeModuleCrtOwner.isConstructedOwner(crt)||crt.module!=='Engine'||!(crt.host.platform instanceof NativeRuntimePlatform))throw new Error('Actual constructed Engine CRT required for envp globals');
  this.#crt=crt;this.#platform=crt.host.platform;
  for(const [label,address] of [['environmentVector','30af7118'],['environmentReady','30af7e6c']] as const){
   const row=engineSetenvpImage(label);if(row.address!==address||row.bytes!==4||row.raw!=='00000000')throw new Error('Original Engine envp cold global required');
   const fields=new NativeHeapObjectViews({identity:Object.freeze({crt:crt.identity,address}),bytes:new Uint8Array(4),knownMask:new Uint8Array(4).fill(255),freed:false});Object.freeze(fields);
   this.#images.set(label,Object.freeze({fields,backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,rootBytes:fields.backing.bytes,rootMasks:fields.backing.knownMask,view:fields.view}));
  }
  Object.freeze(this);
 }
 #validate(){
  if(!NativeModuleCrtOwner.isConstructedOwner(this.#crt)||this.#crt.module!=='Engine'||this.#crt.host.platform!==this.#platform)throw new Error('Retained Engine envp global owner required');
  const active=NativeRuntimePlatform.requireActivePlatform(this.#platform);if(!active.known)throw new Error(active.reason);
  for(const [label,p] of this.#images){engineSetenvpImage(label);const f=p.fields;
   if(f.backing!==p.backing||f.backing.freed||f.bytes!==p.bytes||f.knownMask!==p.masks||f.view!==p.view||f.backing.bytes!==p.rootBytes||f.backing.knownMask!==p.rootMasks||f.bytes.buffer!==p.rootBytes.buffer||f.bytes.byteOffset!==p.rootBytes.byteOffset||f.knownMask.buffer!==p.rootMasks.buffer||f.knownMask.byteOffset!==p.rootMasks.byteOffset||f.bytes.length!==4||f.knownMask.length!==4||viewBuffer.call(f.view)!==f.bytes.buffer||viewOffset.call(f.view)!==f.bytes.byteOffset||viewLength.call(f.view)!==4)throw new Error('Original Engine envp global storage changed');
  }
 }
 static forCrt(crt:NativeModuleCrtOwner):NativeValue<NativeEngineSetenvpImages>{try{let owner=owners.get(crt);if(!owner){owner=new NativeEngineSetenvpImages(crt,token);owners.set(crt,owner);}owner.#validate();return {known:true,value:owner};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}}
 static imageForCrt(owner:NativeEngineSetenvpImages,crt:NativeModuleCrtOwner,label:Label):NativeValue<NativeHeapObjectViews>{try{if(owners.get(crt)!==owner||owner.#crt!==crt)throw new Error('Actual same-Engine envp global owner required');owner.#validate();const image=owner.#images.get(label);if(!image)throw new Error('Admitted Engine envp global required');return {known:true,value:image.fields};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}}
}
