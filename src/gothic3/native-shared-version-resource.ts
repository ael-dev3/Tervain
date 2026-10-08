/** Explicit recorded Windows VERSION.dll selection for the original SharedBase file.
 * Import call-frame integration remains pending. No host API is called here. */
import observation from '../../assets/gothic3/shared-dll-entry-source/windows-version-api-observation.json';
import {NativeSharedCrtOwner} from './native-shared-crt';
import {NativeRuntimePlatform} from './native-runtime-platform';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeBytePointer} from './native-pointer-geometry';
import type {NativeValue} from './dialogue';
const selection='recorded-sharedbase-ansi-version-buffer' as const;
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedVersionResource>();
const token=Object.freeze({});
const decode=(hex:string)=>Uint8Array.from(hex.match(/../g)!.map(pair=>parseInt(pair,16)));
interface VersionBuffer {readonly pointer:NativeBytePointer;readonly backing:object;readonly offset:number;readonly expected:Uint8Array;readonly next:number;}
export class NativeSharedVersionResource {
 readonly #initial=decode(observation.initialBufferBytes);
 readonly #queries=observation.queries.map(query=>({...query,changedBytes:query.changedBytes.map(change=>({...change}))}));
 readonly #buffers=new WeakMap<object,Map<number,VersionBuffer>>();
 private constructor(private readonly platform:NativeRuntimePlatform,key:object){if(key!==token)throw new Error('Canonical version resource owner required');}
 static forPlatform(platform:NativeRuntimePlatform,profile:typeof selection):NativeValue<NativeSharedVersionResource>{
  const live=NativeRuntimePlatform.requireActivePlatform(platform);if(!live.known)return live;
  if(profile!==selection)return {known:false,reason:'Explicit recorded ANSI version selection required'};
  let owner=owners.get(platform);if(!owner){owner=new NativeSharedVersionResource(platform,token);owners.set(platform,owner);}return {known:true,value:owner};
 }
 #access(pointer:NativeBytePointer,bytes:number):void{
  if(owners.get(this.platform)!==this)throw new Error('Actual version resource owner required');
  const access=NativeRuntimePlatform.canonicalNativePointerAccessForPlatform(this.platform,pointer,0,bytes);if(!access.known)throw new Error(access.reason);const slot=NativeSharedCrtOwner.versionResourcePoolSpanForPlatform(this.platform,pointer,bytes);if(!slot.known)throw new Error(slot.reason);
 }
 #failure(error:unknown):NativeValue<never>{return {known:false,reason:error instanceof Error?error.message:String(error)};}
 sizeOutcome(filename:string):NativeValue<Readonly<{size:number;handle:number}>>{
  try{const active=NativeRuntimePlatform.requireActivePlatform(this.platform);if(!active.known)throw new Error(active.reason);if(owners.get(this.platform)!==this)throw new Error('Actual version resource owner required');if(filename!=='sharedbase.dll')throw new Error('Original SharedBase version filename required');if(observation.inputSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'||observation.size!==this.#initial.length||observation.handle!==0)throw new Error('Recorded version size outcome required');return {known:true,value:Object.freeze({size:observation.size,handle:observation.handle})};}catch(error){return this.#failure(error);}
 }
 size(filename:string,handle:NativeBytePointer):NativeValue<number>{
  try{const outcome=this.sizeOutcome(filename);if(!outcome.known)throw new Error(outcome.reason);this.#access(handle,4);NativeHeapObjectViews.prototype.writeUnsigned.call(handle.fields,handle.offset,outcome.value.handle);return {known:true,value:outcome.value.size};}catch(error){return this.#failure(error);}
 }
 initialize(filename:string,handle:number,size:number,output:NativeBytePointer):NativeValue<number>{
  try{
   if(filename!=='sharedbase.dll'||handle!==0||size!==this.#initial.length)throw new Error('Recorded SharedBase version initialization ABI required');
   this.#access(output,size);
   const geometry=this.platform.resolveNativePointer(output);if(!geometry.known)throw new Error(geometry.reason);
   const pointer=Object.freeze({fields:output.fields,offset:output.offset});
   for(let i=0;i<size;i++)NativeHeapObjectViews.prototype.writeUnsigned.call(pointer.fields,pointer.offset+i,this.#initial[i]!,1);
   let buffers=this.#buffers.get(geometry.value.canonicalBacking);if(!buffers){buffers=new Map();this.#buffers.set(geometry.value.canonicalBacking,buffers);}
   buffers.set(geometry.value.offset,{pointer,backing:geometry.value.canonicalBacking,offset:geometry.value.offset,expected:this.#initial.slice(),next:0});
   return {known:true,value:1};
  }catch(error){return this.#failure(error);}
 }
 query(input:NativeBytePointer,path:string):NativeValue<Readonly<{result:number;pointer:NativeBytePointer;length:number}>>{
  try{
   this.#access(input,this.#initial.length);
   const geometry=this.platform.resolveNativePointer(input);if(!geometry.known)throw new Error(geometry.reason);
   const buffers=this.#buffers.get(geometry.value.canonicalBacking),buffer=buffers?.get(geometry.value.offset);if(!buffers||!buffer)throw new Error('Actual retained version allocation and base required');
   for(let i=0;i<buffer.expected.length;i++)if(NativeHeapObjectViews.prototype.readUnsigned.call(input.fields,input.offset+i,1)!==buffer.expected[i])throw new Error('Prepared version bytes changed outside the selected API');
   const index=this.#queries.findIndex(query=>query.query===path);
   if(index<0||index!==buffer.next)throw new Error('Recorded version query order required');
   const query=this.#queries[index]!;
   for(const change of query.changedBytes){if(buffer.expected[change.offset]!==change.before)throw new Error('Recorded version mutation precondition required');}
   for(const change of query.changedBytes){NativeHeapObjectViews.prototype.writeUnsigned.call(input.fields,input.offset+change.offset,change.after,1);buffer.expected[change.offset]=change.after;}
   buffers.set(buffer.offset,{...buffer,next:buffer.next+1});
   return {known:true,value:Object.freeze({result:query.result,pointer:Object.freeze({fields:input.fields,offset:input.offset+query.offset}),length:query.length})};
  }catch(error){return this.#failure(error);}
 }
}
