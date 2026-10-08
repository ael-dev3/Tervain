/** Original SharedBase CRT process-attach version/heap prefix.
 * This owns distinct SharedBase images; lock/thread completion and full attach remain pending. */
import source from '../../assets/gothic3/shared-crt-bootstrap/source.json';
import {NativeRuntimePlatform,NativeWin32PlatformException} from './native-runtime-platform';
import type {NativeCrtLocalProcedure,NativeCrtLocalAllocProcedure,NativeWin32HeapCapability} from './native-runtime-platform';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeMemoryBacking} from './native-memory-admin';
import type {NativeValue} from './dialogue';
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedCrtOwner>();
const token=Object.freeze({});
const methods={
 mtInitLocks:['0x100bb704','5720caf2449822401c3095e9919b8b83e0b5a21ec83befb105adbf8a0d1450c5'],
 initCritSecAndSpinCount:['0x100bbf27','f73b38791ad720df5bc93afb51a63f39e6f0b3f93553464dd7b1e7fbdd27d5f5'],
 initCritSecFallback:['0x100bbf17','d52356eb1c51d45fa27441a08bc7fadd57a2f9a2ceea101dd7072a0a5678e542'],
 decodeThreadPointer:['0x100ae2f2','680d5ea020292968a6b3e1cb9782e9988c4d9a1d90340f077c9cc0f3a0fed274'],
 encodedNull:['0x100ae2e9','e58382981c7a36ba3f1066c370748dcc87e583c54e41f0a440673250d39cc7f3'],
 pointerEncodingAvailable:['0x100ae20f','ee8691088a2b99c01cbcbe5d12d7002b73798745febc6114c8e90c0d929b1541'],
 setPointer6ac4:['0x100bbfec','2d7ec32c107ce5f618f764497f2c4799c99305f0216df0be488496fb6890671b'],
 setPointer6ac0:['0x100bbf0d','325d9b307c83a70ff5d8a3c955b024cb07f1c58c3a71dab6773e1a9fd44e0e3f'],
 setPointer64a0:['0x100ae094','ee7e8e717fb533db1b8d8ed6fa044ab7a515a55457f2f20d16f3dda5a9863e96'],
 setPointer690c:['0x100b10cc','6970f4865602122586ff435e8475e3be4ea762ca947392dd07235f3734fe9a7a'],
 setPointer6abc:['0x100bbdff','87b942fc67bccffebc615945af84120cf1f9d17bf17caf1a1e72fdf32ecf4ba0'],
 initSignalPointers:['0x100bb90b','21c59ab0620539c88a1b8353e8b18b33c90c5014f086c6765bbd82384bd3dbc7'],
 initPointersNoop:['0x100ae9bb','ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e'],
 initEhHooks:['0x100b025a','ae34a8f1316607c403b294dfc407a0e8547cf70121a353e01ab881953e3f8ac1'],
 terminate:['0x100b01d7','d3271e90cb5faf6e2a7994d31327849393e7fbf184f41c3023b267fb99f5250a'],
 exit:['0x100aa7b7','56833d9b869d4a324b0aadced821b799bcf7f4b4cbc7324de29c74e4a8660b00'],
 initPointers:['0x100aa7e6','3322e001ea0f35bafbd64077e8480e5c09848511a9d523f36b81b4eb640fa29c'],
 encodeThreadPointer:['0x100ae27b','b6b1812877e62db1566f0bbb71b1b4abe1ee1147678b550ecf38ea29801175cc'],
 mtInit:['0x100ae6f0','7c03a67733aa37a6daae267a6f81926cddd385af1858d8e0a8a1fb072a0d0416'],
 crtAttach:['0x100ada4c','fb9938487a8147193a6a4196153cd242c37dd72d999f4bda0d5f7f094cbe66ee'],
 heapInit:['0x100bc0ba','17ed282bbb7b153398d0317b9ca46d7b6813206fe2adce25cb3a0a2f88502912'],
 heapSelect:['0x100bc05f','f530306586679e694dad366e72c54ab6bbb64539f559b0f06c805e0fe0fa1d5f'],
 getOsPlatform:['0x100aa49d','cc5b7331299d47cd8f5d5cb850aa67581d71d5bd370b6aeba4f41feed3edf68d'],
 getWinMajor:['0x100aa54c','c2d39a6b2e3a69dcf99941e96a2b991511307e2511a0c536100b091ab85aabde'],
} as const;
const images={osFields:['102f642c',20,'00'.repeat(20)],heapHandle:['102f6ac8',4,'00000000'],heapSelection:['102f8530',4,'00000000'],
 tlsGetterIndex:['10140b48',4,'ffffffff'],threadDataIndex:['10140b44',4,'ffffffff'],procedureSlots:['102f64a4',16,'00'.repeat(16)],
 pointer6ac4:['102f6ac4',4,'00000000'],pointer6ac0:['102f6ac0',4,'00000000'],pointer64a0:['102f64a0',4,'00000000'],
 pointer690c:['102f690c',4,'00000000'],pointer6abc:['102f6abc',4,'00000000'],signalPointers:['102f6aa8',16,'00'.repeat(16)],
 ehHook:['102f64b8',4,'00000000'],exitPointer:['10140a60',4,'b7a70a10'],lockTable:['101414b8',288,"000000000100000000000000010000000000000000000000000000000100000000000000010000000000000000000000000000000100000000000000010000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000010000000000000001000000000000000000000000000000010000000000000001000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],staticSections:['102f6958',336,'00'.repeat(336)]} as const;
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
 #mtReturned:number|null=null;
 #locksReturned:number|null=null;
 #sections:NativeHeapObjectViews[]=[];
 #sectionFallback:Readonly<{address:string;owner:object;invoke(fields:NativeHeapObjectViews):NativeValue<boolean>}>;
 #pointersReturned=false;
 #code:Readonly<Record<'terminate'|'exit',Readonly<{owner:object;address:string;bodyInstructionBytesSha256:string}>>>;
 #tlsFallback:NativeCrtLocalAllocProcedure & {readonly address:string;readonly owner:object};
 #trace:string[]=[];
 private constructor(private readonly platform:NativeRuntimePlatform,proof:object){
  if(proof!==token)throw new Error('Canonical SharedBase CRT owner required');
  if(source.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214')throw new Error('Original SharedBase module required');
  for(const [label,[body,hash]] of Object.entries(methods)){
   const receipt=source.methods[label as keyof typeof methods];
   if(receipt.bodyVA!==body||receipt.bodyInstructionBytesSha256!==hash)throw new Error('Original SharedBase CRT source differs: '+label);
  }
  const exception=source.sectionException;
  if(exception.filter.raw!=='8b45ec8b008b008945dc33c93d170000c00f94c18bc1c3'||exception.handler.raw!=='8b65e8817ddc170000c075086a08ff157c972f108365e000'||exception.scopeTable.raw!=='feffffff00000000ccffffff00000000feffffffadbf0b10c4bf0b10')throw new Error('Original section exception source required');
  this.#sectionFallback=Object.freeze({address:'100bbf17',owner:this.identity,invoke:(fields:NativeHeapObjectViews):NativeValue<boolean>=>{const result=this.platform.initializePhysicalCriticalSectionWithoutSpin(fields,this.identity);return result.known?{known:true,value:true}:result;}});
  this.#code=Object.freeze(Object.fromEntries((['terminate','exit'] as const).map(label=>[label,Object.freeze({owner:this.identity,address:methods[label][0].slice(2),bodyInstructionBytesSha256:methods[label][1]})])) as Record<'terminate'|'exit',{owner:object;address:string;bodyInstructionBytesSha256:string}>);
  if(source.tlsFallbackAllocator.address!=='100ae360'||source.tlsFallbackAllocator.raw!=='ff15bc972f10c20400'||source.tlsFallbackAllocator.sha256!=='89b9b895a59f0f75607ee74875f1460dbb6ce716198148ea6d6cf7c09320eff8')throw new Error('Original TLS fallback allocator required');
  this.#tlsFallback=Object.freeze({kind:'alloc',name:'TlsAlloc',address:'100ae360',owner:this.identity,invoke:()=>this.platform.tlsAlloc()});
  for(const label of Object.keys(images) as Image[]){
   const [address,size,raw]=images[label],receipt=source.coldGlobals[label];
   if(receipt.address!==address||receipt.bytes!==size||receipt.raw!==raw||receipt.knownMask!=='ff'.repeat(size)||receipt.liveValueCaptured||receipt.scope!=='cold-original-image')throw new Error('Original SharedBase image differs: '+label);
   const fields=physical(size);fields.bytes.set(Uint8Array.from(raw.match(/../g)!,byte=>parseInt(byte,16)));fields.knownMask.fill(255);
   this.#images.set(label,{fields,bytes:fields.backing.bytes,masks:fields.backing.knownMask});
  }
  Object.defineProperty(this,'identity',{value:this.identity,writable:false,configurable:false});
  Object.defineProperty(this,'platform',{value:platform,writable:false,configurable:false});
 }
 static forPlatform(platform:NativeRuntimePlatform):NativeSharedCrtOwner {
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)throw new Error(active.reason);
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
  const active=NativeRuntimePlatform.requireActivePlatform(this.platform);if(!active.known)throw new Error(active.reason);
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
  const proof=NativeRuntimePlatform.canonicalWin32HeapForOwner(this.platform,heap,this.identity);
  if(!proof.known)throw new Error(proof.reason);
  const mode=this.#selectHeap();this.imageStorage('heapSelection').writeUnsigned(0,mode);
  this.#trace.push('100bc0e5.storeHeapSelection');
  if(mode===3)throw new Error('Unowned original SharedBase small-block heap initializer at 100bc231(0x3f8)');
  this.#heapReturned=1;return 1;
 }
 #encodePointer(value:object|null):object|null {
  const cached=this.#call('100ae288.TlsGetValue',()=>this.platform.tlsGetValue(this.imageStorage('tlsGetterIndex').readUnsigned(0)));
  if(cached!==null&&this.imageStorage('threadDataIndex').readUnsigned(0)!==0xffffffff)throw new Error('Unowned SharedBase PTD EncodePointer cache path at 100ae28e');
  const module=this.#call('100ae2b4.GetModuleHandleA',()=>this.platform.getWin32ModuleHandle('KERNEL32.DLL'));
  if(module===null)return value;
  const os=this.imageStorage('osFields');
  if(os.readUnsigned(0)===0)throw new Error('Unowned SharedBase invalid getWinMajor at 100ae20f');
  const major=os.readUnsigned(12);
  if((major|0)<6)throw new Error('Unowned SharedBase main-image .mixcrt section scan at 100ae20f');
  this.#trace.push('100ae20f.available.return1');
  const procedure=this.#call('GetProcAddress(EncodePointer)',()=>this.platform.getWin32Procedure(module,'EncodePointer'));
  if(procedure===null)return value;
  if(procedure.name!=='EncodePointer')throw new Error('Actual EncodePointer capability required');
  return this.#call('100ae2dd.EncodePointer',()=>procedure.invoke(value));
 }
 #decodePointer(value:object|null):object|null {
  const cached=this.#call('100ae2ff.TlsGetValue',()=>this.platform.tlsGetValue(this.imageStorage('tlsGetterIndex').readUnsigned(0)));
  if(cached!==null&&this.imageStorage('threadDataIndex').readUnsigned(0)!==0xffffffff)throw new Error('Unowned SharedBase PTD DecodePointer cache path at 100ae305');
  const module=this.#call('100ae32b.GetModuleHandleA',()=>this.platform.getWin32ModuleHandle('KERNEL32.DLL'));
  if(module===null)return value;
  const os=this.imageStorage('osFields');
  if(os.readUnsigned(0)===0)throw new Error('Unowned SharedBase invalid getWinMajor at 100ae20f');
  const major=os.readUnsigned(12);
  if((major|0)<6)throw new Error('Unowned SharedBase main-image .mixcrt section scan at 100ae20f');
  this.#trace.push('100ae20f.available.return1');
  const procedure=this.#call('GetProcAddress(DecodePointer)',()=>this.platform.getWin32Procedure(module,'DecodePointer'));
  if(procedure===null)return value;
  if(procedure.name!=='DecodePointer')throw new Error('Actual DecodePointer capability required');
  return this.#call('100ae354.DecodePointer',()=>procedure.invoke(value));
 }
 #initializeSection(fields:NativeHeapObjectViews):boolean {
  let procedure=this.#decodePointer(this.imageStorage('pointer6ac0').pointer<object>(0).get());
  if(procedure===null){
   const os=this.imageStorage('osFields');if(os.readUnsigned(0)===0)throw new Error('Unowned SharedBase invalid OS getter in section resolver');
   if(os.readUnsigned(0)===1)procedure=this.#sectionFallback;
   else {
    const module=this.#call('section.GetModuleHandleA',()=>this.platform.getWin32ModuleHandle('kernel32.dll'));
    procedure=module===null?this.#sectionFallback:this.#call('section.GetProcAddress',()=>this.platform.getWin32Procedure(module,'InitializeCriticalSectionAndSpinCount'));
    if(procedure===null)procedure=this.#sectionFallback;
   }
   this.imageStorage('pointer6ac0').pointer<object>(0).set(this.#encodePointer(procedure));
   this.#trace.push('100bbf98.cacheSectionProcedure');
  }
  try{
   if(procedure===this.#sectionFallback)return this.#call('100bbf17.InitializeCriticalSection',()=>this.#sectionFallback.invoke(fields));
   const selected=procedure as {name?:string;invoke?:(fields:NativeHeapObjectViews,owner:object,spinCount:4000)=>NativeValue<boolean>};
   if(selected.name!=='InitializeCriticalSectionAndSpinCount'||typeof selected.invoke!=='function')throw new Error('Actual owned section initializer required');
   return this.#call('100bbfa6.InitializeCriticalSectionAndSpinCount',()=>selected.invoke!(fields,this.identity,4000));
  }catch(error){
   if(!(error instanceof NativeWin32PlatformException)||error.code!==0xc0000017)throw error;
   this.#call('100bbfc4.SetLastError(8)',()=>this.platform.setWin32LastError(8));
   this.#trace.push('sectionException.return0');return false;
  }
 }
 #initializeLocks():number {
  const table=this.imageStorage('lockTable'),sections=this.imageStorage('staticSections');let index=0;
  for(let id=0;id<36;id++)if(table.readUnsigned(id*8+4)===1){
   if(index*24+24>sections.bytes.length)throw new Error('Original static section storage exhausted');
   const fields=new NativeHeapObjectViews(sections.backing,index++*24,24);
   table.pointer<NativeHeapObjectViews>(id*8).set(fields);this.#trace.push('lock'+id+'.publishStatic');
   if(!this.#initializeSection(fields)){
    table.pointer(id*8).set(null);this.#locksReturned=0;this.#trace.push('lock'+id+'.clearFailed');return 0;
   }
   this.#sections.push(fields);
  }
  this.#locksReturned=1;this.#trace.push('100bb740.mtInitLocks.return1');return 1;
 }
 #initializePointers():void {
  const encodedNull=this.#encodePointer(null);
  for(const label of ['pointer6ac4','pointer6ac0','pointer64a0','pointer690c','pointer6abc'] as const){
   this.imageStorage(label).pointer<object>(0).set(encodedNull);this.#trace.push('initPointers.store.'+label);
  }
  const signals=this.imageStorage('signalPointers');
  for(const offset of [0,4,8,12])signals.pointer<object>(offset).set(encodedNull);
  this.#trace.push('100bb90b.signalPointers.store');
  this.#trace.push('100ae9bb.noop.return');
  const terminate=this.#encodePointer(this.#code.terminate);
  this.imageStorage('ehHook').pointer<object>(0).set(terminate);this.#trace.push('100b0265.storeTerminate');
  const exit=this.#encodePointer(this.#code.exit);
  this.imageStorage('exitPointer').pointer<object>(0).set(exit);this.#trace.push('100aa82b.storeExit');
  this.#pointersReturned=true;this.#trace.push('100aa831.initPointers.return');
 }
 #initializeThreads():number {
  const module=this.#call('100ae6f6.GetModuleHandleA',()=>this.platform.getWin32ModuleHandle('KERNEL32.DLL'));
  if(module===null)throw new Error('Unowned SharedBase __mtterm at 100ae3cf called from 100ae702');
  const slots=this.imageStorage('procedureSlots');
  for(const [offset,name] of [[0,'FlsAlloc'],[4,'FlsGetValue'],[8,'FlsSetValue'],[12,'FlsFree']] as const){
   const procedure=this.#call('GetProcAddress('+name+')',()=>this.platform.getWin32Procedure(module,name));
   if(procedure!==null&&(!this.platform.ownsLocalStorageProcedure(procedure)||procedure.name!==name))throw new Error('Actual same-platform FLS procedure required');
   slots.pointer<NativeCrtLocalProcedure>(offset).set(procedure);
   this.#trace.push('storeUnencodedProcedure'+offset);
  }
  if([0,4,8,12].some(offset=>slots.pointer( offset).get()===null)){
   const fallback=this.platform.tlsProcedures;
   for(const procedure of [fallback.get,fallback.set,fallback.free])if(!this.platform.ownsLocalStorageProcedure(procedure))throw new Error('Actual same-platform IAT TLS procedure required');
   // Preserve the original fallback publication order, including its own
   // source allocator wrapper rather than substituting an FLS procedure.
   for(const [offset,procedure] of [[4,fallback.get],[0,this.#tlsFallback],[8,fallback.set],[12,fallback.free]] as const){
    slots.pointer<object>(offset).set(procedure);this.#trace.push('storeTlsFallback'+offset);
   }
  }
  const index=this.#call('100ae78f.TlsAllocGetter',()=>this.platform.tlsAlloc());
  this.imageStorage('tlsGetterIndex').writeUnsigned(0,index);this.#trace.push('100ae798.storeGetterIndex');
  if(index===0xffffffff){this.#mtReturned=0;return 0;}
  const getter=slots.pointer<NativeCrtLocalProcedure>(4).get();
  if(!getter||getter.kind!=='get'||!this.platform.ownsLocalStorageProcedure(getter))throw new Error('Actual same-platform unencoded getter required');
  const stored=this.#call('100ae7aa.TlsSetValueGetter',()=>this.platform.tlsSetValue(index,getter));
  if(!stored){this.#mtReturned=0;return 0;}
  this.#trace.push('100ae7b4.callInitPointers');
  this.#initializePointers();
  for(const offset of [0,4,8,12]){
   const original=slots.pointer<object>(offset).get();
   slots.pointer<object>(offset).set(this.#encodePointer(original));this.#trace.push('mtInit.encodeProcedure'+offset);
  }
  this.#trace.push('100ae7fc.callMtInitLocks');
  if(this.#initializeLocks()===0)throw new Error('Unowned SharedBase __mtterm at 100ae3cf after lock initialization failure');
  throw new Error('Unowned SharedBase FLS/PTD allocation at 100ae805 after original lock initialization');
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
   const threadResult=this.#initializeThreads();
   if(threadResult===0)throw new Error('Unowned SharedBase heap termination at 100bc114 called from 100adb12');
   throw new Error('Unowned SharedBase attach continuation after __mtinit');
  }catch(error){this.#boundary??=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
  finally{this.#active=false;}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,versionAllocation:this.#versionAllocation,
  heap:this.#heap,heapReturned:this.#heapReturned,attachReturned:this.#attachReturned,mtReturned:this.#mtReturned,locksReturned:this.#locksReturned,sections:Object.freeze([...this.#sections]),pointersReturned:this.#pointersReturned,
  trace:Object.freeze([...this.#trace]),dllEntryExecuted:false,wholeCrtTraversalCompleted:false});}
}
