/** Original property-registration Debug call through TLS and vsprintf FILE setup.
 * The formatter has not returned; no text, terminator or message dispatch is fabricated. */
import source from '../../assets/gothic3/arena-property-registration/source.json';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {NativeSharedStaticTls} from './native-shared-static-tls';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeBytePointer} from './native-pointer-geometry';
import type {NativeValue} from './dialogue';
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedMessageDebug>();
const token=Object.freeze({});
const formatText="bCPropertyObjectTypeBase::RegisterPropertyTemplate - property '%s' with valuetype '%s' added.";
const methods={
 messageDebug:['0x100498f0','bda592836d1f962248869c3ba7f90be5fee5271a962293633012d3a075d43dfc'],
 messageVsprintf:['0x100a7f27','db7e7cdf21e7945d6831d7a24d9741dfed758ceb6034933bda953d4ece2e7b26'],
 messageVsprintfCore:['0x100a7eab','01a8e501079dfbac7738c12afe584792b8ec8feecdbcac4a70a16d3077ac389e'],
 messageOutputFormatter:['0x100b5355','b4cea1685c86d396c8b2298308b5b521c8185f73d5c2d9eda5a92aa7c9ef686b'],
} as const;
function physical(size:number){return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(size),knownMask:new Uint8Array(size),freed:false});}
function fact<T>(result:NativeValue<T>):T {if(!result.known)throw new Error(result.reason);return result.value;}
export class NativeSharedMessageDebug {
 #boundary:string|null=null;
 #file:NativeHeapObjectViews|null=null;
 #arguments:NativeHeapObjectViews|null=null;
 #buffer:NativeHeapObjectViews|null=null;
 #format:NativeBytePointer;
 #trace:string[]=[];
 private constructor(private readonly platform:NativeRuntimePlatform,proof:object){
  if(proof!==token)throw new Error('Canonical SharedBase diagnostic owner required');
  if(source.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214')throw new Error('Original SharedBase module required');
  for(const [label,[body,hash]] of Object.entries(methods)){
   const receipt=source.methods[label as keyof typeof methods];
   if(receipt.bodyVA!==body||receipt.bodyInstructionBytesSha256!==hash)throw new Error('Original diagnostic method differs: '+label);
  }
  if(source.registrationDebugFormat.address!=='100e9f40'||source.registrationDebugFormat.text!==formatText)throw new Error('Original registration format required');
  const fields=physical(formatText.length+1);
  for(let index=0;index<formatText.length;index++)fields.writeUnsigned(index,formatText.charCodeAt(index),1);
  fields.writeUnsigned(formatText.length,0,1);this.#format=Object.freeze({fields,offset:0});
  Object.defineProperty(this,'platform',{value:platform,writable:false,configurable:false});
 }
 static forPlatform(platform:NativeRuntimePlatform):NativeSharedMessageDebug {
  const old=owners.get(platform);if(old)return old;
  const owner=new NativeSharedMessageDebug(platform,token);owners.set(platform,owner);return owner;
 }
 registerProperty(propertyName:NativeBytePointer,typeName:NativeBytePointer):NativeValue<void>{
  if(this.#boundary)return {known:false,reason:this.#boundary};
  try{
   const tls=fact(NativeSharedStaticTls.forPlatform(this.platform));
   this.#buffer=fact(NativeSharedStaticTls.prototype.debugBuffer.call(tls));
   this.#trace.push('100498f0.loadThreadTlsBuffer');
   // Original cdecl argument order is property text, then type text. These
   // are retained pointer capabilities, not copies of their string values.
   this.#arguments=physical(8);
   this.#arguments.pointer<NativeBytePointer>(0).set(propertyName);
   this.#arguments.pointer<NativeBytePointer>(4).set(typeName);
   this.#trace.push('1004990a.retainActualVarargs');
   this.#trace.push('100a7f27.forwardWithNullLocale');
   this.#file=physical(32);
   const destination=Object.freeze({fields:this.#buffer,offset:0});
   this.#file.pointer<NativeBytePointer>(8).set(destination);
   this.#file.pointer<NativeBytePointer>(0).set(destination);
   this.#file.writeUnsigned(4,0x7fffffff);
   this.#file.writeUnsigned(12,0x42);
   this.#trace.push('100a7eff.callOutputFormatter');
   // _output_l first needs its own cookie/stack and SharedBase LocaleUpdate
   // /PTD owners. Its captured source is not an executable owner yet.
   throw new Error('Unowned SharedBase output formatter at 100b5355 called from 100a7eff');
  }catch(error){this.#boundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,file:this.#file,arguments:this.#arguments,
  buffer:this.#buffer,format:this.#format,locale:null,trace:Object.freeze([...this.#trace]),
  formatterReturned:false,terminatorWritten:false,messageDispatched:false,debugReturned:false});}
}
