/** Source-backed Engine I/O globals. Cold storage does not establish I/O execution. */
import type {NativeValue} from './dialogue';
import {NativeModuleCrtOwner} from './native-engine-crt-locks';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {NativeHeapObjectViews} from './native-heap-views';
import {engineIoImage} from './native-engine-io-source';
type Label='ioHandleCount'|'ioBlockPointers'|'ioSehScope';
const labels:readonly Label[]=Object.freeze(['ioHandleCount','ioBlockPointers','ioSehScope']);
const owners=new WeakMap<NativeModuleCrtOwner,NativeEngineIoImages>();
const token=Object.freeze({});
const fact=<T>(value:NativeValue<T>):T=>{if(!value.known)throw new Error(value.reason);return value.value;};
export class NativeEngineIoImages {
 readonly #crt:NativeModuleCrtOwner;
 readonly #platform:NativeRuntimePlatform;
 readonly #images=new Map<Label,Readonly<{fields:NativeHeapObjectViews;backing:NativeHeapObjectViews['backing'];bytes:Uint8Array;masks:Uint8Array;rootBytes:Uint8Array;rootMasks:Uint8Array;view:DataView;raw:string}>>();
 private constructor(crt:NativeModuleCrtOwner,grant:object){
  if(grant!==token||new.target!==NativeEngineIoImages||!NativeModuleCrtOwner.isConstructedOwner(crt)||crt.module!=='Engine'||!(crt.host.platform instanceof NativeRuntimePlatform))throw new Error('Actual constructed virtual Engine CRT required for I/O images');
  this.#crt=crt;this.#platform=crt.host.platform;fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
  for(const label of labels){
   const row=engineIoImage(label),bytes=Uint8Array.from(row.raw.match(/../g)!,value=>parseInt(value,16));
   if(bytes.length!==row.bytes)throw new Error('Original Engine I/O image extent required');
   const fields=new NativeHeapObjectViews({identity:Object.freeze({crt:crt.identity,address:row.address}),bytes,knownMask:new Uint8Array(row.bytes).fill(255),freed:false});Object.freeze(fields);
   this.#images.set(label,Object.freeze({fields,backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,rootBytes:fields.backing.bytes,rootMasks:fields.backing.knownMask,view:fields.view,raw:row.raw}));
  }
  Object.freeze(this);
 }
 static forCrt(crt:NativeModuleCrtOwner):NativeValue<NativeEngineIoImages>{
  try{const prior=owners.get(crt);if(prior){prior.#validate();return {known:true,value:prior};}
   const owner=new NativeEngineIoImages(crt,token);owners.set(crt,owner);return {known:true,value:owner};
  }catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 #validate(){
  if(!NativeModuleCrtOwner.isConstructedOwner(this.#crt)||this.#crt.module!=='Engine'||this.#crt.host.platform!==this.#platform)throw new Error('Retained Engine I/O image owner required');
  fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
  for(const label of labels){
   const proof=this.#images.get(label)!;engineIoImage(label);const fields=proof.fields;
   if(fields.backing!==proof.backing||fields.backing.freed||fields.bytes!==proof.bytes||fields.knownMask!==proof.masks||fields.view!==proof.view||fields.backing.bytes!==proof.rootBytes||fields.backing.knownMask!==proof.rootMasks||fields.bytes.buffer!==proof.rootBytes.buffer||fields.bytes.byteOffset!==proof.rootBytes.byteOffset||fields.knownMask.buffer!==proof.rootMasks.buffer||fields.knownMask.byteOffset!==proof.rootMasks.byteOffset||fields.bytes.buffer!==fields.view.buffer||fields.bytes.byteOffset!==fields.view.byteOffset||fields.bytes.length!==fields.view.byteLength)throw new Error('Original Engine I/O image storage changed');
   if(label==='ioSehScope')for(let offset=0;offset<fields.bytes.length;offset++)if(NativeHeapObjectViews.prototype.readUnsigned.call(fields,offset,1)!==parseInt(proof.raw.slice(offset*2,offset*2+2),16))throw new Error('Original Engine I/O scope bytes changed');
  }
 }
 static imageForCrt(owner:NativeEngineIoImages,crt:NativeModuleCrtOwner,label:Label):NativeValue<NativeHeapObjectViews>{
  try{if(owners.get(crt)!==owner||owner.#crt!==crt)throw new Error('Actual same-CRT Engine I/O images required');owner.#validate();const proof=owner.#images.get(label);if(!proof)throw new Error('Admitted Engine I/O image required');return {known:true,value:proof.fields};}
  catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
}
