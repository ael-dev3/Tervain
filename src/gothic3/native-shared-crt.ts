/** Original SharedBase CRT process-attach version/heap prefix.
 * This owns distinct SharedBase images; __mtinit and full attach remain pending. */
import source from '../../assets/gothic3/shared-crt-bootstrap/source.json';
import {NativeRuntimePlatform} from './native-runtime-platform';
import type {NativeWin32HeapCapability} from './native-runtime-platform';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeMemoryBacking} from './native-memory-admin';
import type {NativeValue} from './dialogue';
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedCrtOwner>();
const token=Object.freeze({});
const methods={
 crtAttach:['0x100ada4c','fb9938487a8147193a6a4196153cd242c37dd72d999f4bda0d5f7f094cbe66ee'],
 heapInit:['0x100bc0ba','17ed282bbb7b153398d0317b9ca46d7b6813206fe2adce25cb3a0a2f88502912'],
 heapSelect:['0x100bc05f','f530306586679e694dad366e72c54ab6bbb64539f559b0f06c805e0fe0fa1d5f'],
 getOsPlatform:['0x100aa49d','cc5b7331299d47cd8f5d5cb850aa67581d71d5bd370b6aeba4f41feed3edf68d'],
 getWinMajor:['0x100aa54c','c2d39a6b2e3a69dcf99941e96a2b991511307e2511a0c536100b091ab85aabde'],
} as const;
const images={osFields:['102f642c',20],heapHandle:['102f6ac8',4],heapSelection:['102f8530',4]} as const;
type Image=keyof typeof images;
function physical(size:number){return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(size),knownMask:new Uint8Array(size),freed:false});}
export class NativeSharedCrtOwner {
 readonly identity=Object.freeze({});
 #images=new Map<Image,{fields:NativeHeapObjectViews;bytes:Uint8Array;masks:Uint8Array}>();
 #version:NativeHeapObjectViews|null=null;
 #versionAllocation:NativeMemoryBacking|null=null;
 #heap:NativeWin32HeapCapability|null=null;
 #heapReturned:number|null=null;
 #attachReturned:number|null=null;
 #boundary:string|null=null;
 #active=false;
 #trace:string[]=[];
 private constructor(private readonly platform:NativeRuntimePlatform,proof:object){
  if(proof!==token)throw new Error('Canonical SharedBase CRT owner required');
  if(source.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214')throw new Error('Original SharedBase module required');
  for(const [label,[body,hash]] of Object.entries(methods)){
   const receipt=source.methods[label as keyof typeof methods];
   if(receipt.bodyVA!==body||receipt.bodyInstructionBytesSha256!==hash)throw new Error('Original SharedBase CRT source differs: '+label);
  }
  for(const label of Object.keys(images) as Image[]){
   const [address,size]=images[label],receipt=source.coldGlobals[label];
   if(receipt.address!==address||receipt.bytes!==size||receipt.raw!=='00'.repeat(size)||receipt.knownMask!=='ff'.repeat(size)||receipt.liveValueCaptured||receipt.scope!=='cold-original-image')throw new Error('Original SharedBase image differs: '+label);
   const fields=physical(size);fields.knownMask.fill(255);
   this.#images.set(label,{fields,bytes:fields.backing.bytes,masks:fields.backing.knownMask});
  }
  Object.defineProperty(this,'identity',{value:this.identity,writable:false,configurable:false});
  Object.defineProperty(this,'platform',{value:platform,writable:false,configurable:false});
 }
 static forPlatform(platform:NativeRuntimePlatform):NativeSharedCrtOwner {
  const old=owners.get(platform);if(old)return old;
  const owner=new NativeSharedCrtOwner(platform,token);owners.set(platform,owner);return owner;
 }
 imageStorage(label:Image):NativeHeapObjectViews {
  const image=this.#images.get(label);if(!image)throw new Error('Unknown SharedBase image');
  const {fields,bytes,masks}=image;
  if(fields.backing.freed||fields.backing.bytes!==bytes||fields.backing.knownMask!==masks||fields.bytes.buffer!==bytes.buffer||fields.bytes.byteOffset!==bytes.byteOffset||fields.bytes.length!==images[label][1]||fields.knownMask.buffer!==masks.buffer||fields.knownMask.byteOffset!==masks.byteOffset||fields.knownMask.length!==masks.length||!(fields.view instanceof DataView)||fields.view.buffer!==bytes.buffer||fields.view.byteOffset!==bytes.byteOffset||fields.view.byteLength!==bytes.length)throw new Error('Actual retained SharedBase image required');
  return fields;
 }
 #call<T>(label:string,invoke:()=>NativeValue<T>):T {
  this.#trace.push(label);const result=invoke();if(this.#boundary)throw new Error(this.#boundary);
  if(!result.known)throw new Error(result.reason);return result.value;
 }
 #selectHeap():number {
  const locals=physical(8);locals.writeUnsigned(0,0);locals.writeUnsigned(4,0);
  const os=this.imageStorage('osFields');
  if(os.readUnsigned(0)===0)throw new Error('Unowned SharedBase errno/invalid-parameter branch at 100aa49d');
  locals.writeUnsigned(0,os.readUnsigned(0));this.#trace.push('100aa49d.getOsPlatform.return0');
  if(os.readUnsigned(0)===0)throw new Error('Unowned SharedBase errno/invalid-parameter branch at 100aa54c');
  locals.writeUnsigned(4,os.readUnsigned(12));this.#trace.push('100aa54c.getWinMajor.return0');
  return locals.readUnsigned(0)===2&&locals.readUnsigned(4)>=5?1:3;
 }
 #initializeHeap():number {
  if(this.#heapReturned!==null)return this.#heapReturned;
  // __CRT_INIT pushes 1: HeapCreate options are therefore zero.
  const heap=this.#call('100bc0cb.HeapCreate(0,4096,0)',()=>this.platform.createWin32Heap(this.identity,0,4096,0));
  this.#heap=heap;this.imageStorage('heapHandle').pointer<NativeWin32HeapCapability>(0).set(heap);
  this.#trace.push('100bc0d3.publishHeapHandle');
  if(heap===null){this.#heapReturned=0;return 0;}
  if(heap.owner!==this.identity)throw new Error('Actual same-owner SharedBase heap required');
  const mode=this.#selectHeap();this.imageStorage('heapSelection').writeUnsigned(0,mode);
  this.#trace.push('100bc0e5.storeHeapSelection');
  if(mode===3)throw new Error('Unowned original SharedBase small-block heap initializer at 100bc231(0x3f8)');
  this.#heapReturned=1;return 1;
 }
 processAttach():NativeValue<number>{
  if(this.#boundary)return {known:false,reason:this.#boundary};
  if(this.#attachReturned!==null)return {known:true,value:this.#attachReturned};
  if(this.#active){this.#boundary='Reentrant SharedBase CRT process attach';return {known:false,reason:this.#boundary};}
  this.#active=true;
  try{
   const process=this.#call('100ada6d.GetProcessHeap',()=>this.platform.getProcessHeap());
   const allocation=this.#call('100ada70.HeapAlloc(0,148)',()=>this.platform.win32HeapAlloc(process,0,148));
   this.#versionAllocation=allocation;
   if(!allocation){this.#attachReturned=0;return {known:true,value:0};}
   this.#version=new NativeHeapObjectViews(allocation);this.#version.writeUnsigned(0,148);
   const version=this.#call('100ada86.GetVersionExA',()=>this.platform.getVersionExA(this.#version!));
   if(!version){
    const heap=this.#call('100ada93.GetProcessHeap',()=>this.platform.getProcessHeap());
    this.#call('100ada96.HeapFree',()=>this.platform.win32HeapFree(heap,0,allocation));
    this.#attachReturned=0;return {known:true,value:0};
   }
   const fields=this.#version;
   const platform=fields.readUnsigned(16),major=fields.readUnsigned(4),minor=fields.readUnsigned(8);
   let build=fields.readUnsigned(12)&0x7fff;
   const heap=this.#call('100adab9.GetProcessHeap',()=>this.platform.getProcessHeap());
   this.#call('100adabc.HeapFree',()=>this.platform.win32HeapFree(heap,0,allocation));
   if(platform!==2)build|=0x8000;
   const os=this.imageStorage('osFields');
   os.writeUnsigned(0,platform);os.writeUnsigned(8,((major<<8)+minor)>>>0);
   os.writeUnsigned(12,major);os.writeUnsigned(16,minor);os.writeUnsigned(4,build);
   this.#trace.push('100adad3.publishOsFields');
   const result=this.#initializeHeap();
   if(result===0){this.#attachReturned=0;return {known:true,value:0};}
   this.#trace.push('100adb09.callMtInit');
   throw new Error('Unowned SharedBase __mtinit at 100ae6f0 called from 100adb09');
  }catch(error){this.#boundary??=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
  finally{this.#active=false;}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,versionAllocation:this.#versionAllocation,
  heap:this.#heap,heapReturned:this.#heapReturned,attachReturned:this.#attachReturned,
  trace:Object.freeze([...this.#trace]),dllEntryExecuted:false,wholeCrtTraversalCompleted:false});}
}
