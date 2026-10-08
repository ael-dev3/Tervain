/** Virtual SharedBase static TLS load for the retained logical thread.
 * This supplies loader state, not SharedBase CRT initialization or DLL attach. */
import source from '../../assets/gothic3/arena-property-registration/source.json';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeX86ThreadStackSelection} from './native-x86-thread-stack-profile';
import type {NativeValue} from './dialogue';
const expected = {
  "directoryAddress": "100f5e70",
  "directoryRaw": "00103010d416301080642f1080570e100000000000000000",
  "templateAddress": "10301000",
  "templateRaw": "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "templateSha256": "fe3205a643fb15a7423b7fd4f2c771117829595753659bec2a2fbbb009ecb0fd",
  "indexAddress": "102f6480",
  "callbacksAddress": "100e5780",
  "debugBufferOffset": 264,
  "loaderSlotAssigned": false
} as const;
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedStaticTls>();
const token=Object.freeze({});
function physical(bytes:number,known=false):NativeHeapObjectViews {
 return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(bytes),knownMask:new Uint8Array(bytes).fill(known?255:0),freed:false});
}
export class NativeSharedStaticTls {
 #loaded=false;
 #selection:Readonly<NativeX86ThreadStackSelection>;
 #index=physical(4);
 #teb=physical(48);
 #vector=physical(4);
 #block:NativeHeapObjectViews|null=null;
 #blockBytes:Uint8Array|null=null;
 #blockMasks:Uint8Array|null=null;
 private constructor(private readonly platform:NativeRuntimePlatform,selection:Readonly<NativeX86ThreadStackSelection>,proof:object) {
  if(proof!==token)throw new Error('Canonical static TLS loader required');
  if(source.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'||JSON.stringify(source.staticTls)!==JSON.stringify(expected))throw new Error('Original SharedBase TLS template differs');
  this.#selection=selection;
  Object.defineProperty(this,'platform',{value:platform,writable:false,configurable:false});
 }
 static forPlatform(platform:NativeRuntimePlatform):NativeValue<NativeSharedStaticTls> {
  const selection=NativeRuntimePlatform.threadStackSelectionForPlatform(platform);
  if(!selection.known)return selection;
  try {
   const existing=owners.get(platform);
   if(existing) {existing.#live();return {known:true,value:existing};}
   const owner=new NativeSharedStaticTls(platform,selection.value,token);owners.set(platform,owner);
   return {known:true,value:owner};
  }catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 #live():void {
  const selection=NativeRuntimePlatform.threadStackSelectionForPlatform(this.platform);
  if(!selection.known||selection.value!==this.#selection||NativeRuntimePlatform.threadStackLifetimeHasEnded(this.platform,this.#selection))throw new Error('Actual live same-thread TLS loader required');
 }
 /** This virtual loader's first static TLS module is SharedBase, assigned
  * slot zero. That is a declared VM load, not a captured Windows slot. */
 loadSharedBase():NativeValue<void> {
  try {
   this.#live();if(this.#loaded)return {known:true,value:undefined};
   const bytes=Uint8Array.from(expected.templateRaw.match(/../g)!,byte=>parseInt(byte,16));
   const block=physical(bytes.length,true);block.bytes.set(bytes);
   this.#block=block;
   this.#blockBytes=block.backing.bytes;this.#blockMasks=block.backing.knownMask;
   this.#vector.pointer<NativeHeapObjectViews>(0).set(block);
   this.#index.writeUnsigned(0,0);
   this.#teb.pointer<NativeHeapObjectViews>(44).set(this.#vector);
   this.#loaded=true;return {known:true,value:undefined};
  }catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 debugBuffer():NativeValue<NativeHeapObjectViews> {
  try {
   this.#live();if(!this.#loaded)throw new Error('SharedBase static TLS module has not loaded');
   const vector=this.#teb.pointer<NativeHeapObjectViews>(44).get();
   if(vector!==this.#vector)throw new Error('Actual retained FS:0x2c vector required');
   const index=this.#index.readUnsigned(0);
   const block=vector.pointer<NativeHeapObjectViews>(index*4).get();
   if(!block||block!==this.#block||block.backing.freed||block.backing.bytes!==this.#blockBytes||
     block.backing.knownMask!==this.#blockMasks||block.bytes.buffer!==block.backing.bytes.buffer||
     block.bytes.byteOffset!==block.backing.bytes.byteOffset||block.bytes.length!==expected.templateRaw.length/2)throw new Error('Actual retained SharedBase TLS block required');
   return {known:true,value:new NativeHeapObjectViews(block.backing,expected.debugBufferOffset,block.bytes.length-expected.debugBufferOffset)};
  }catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 snapshot(){return Object.freeze({loaded:this.#loaded,virtualLoaderSlot:this.#loaded?0:null,threadCapability:this.#selection.threadCapability,
  templateBytes:expected.templateRaw.length/2,sharedCrtInitialized:false,dllAttachExecuted:false});}
}
