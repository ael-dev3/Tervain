/** Original SharedBase CRT process-attach version/heap prefix.
 * This owns distinct SharedBase images and selected locks/thread-index setup;
 * PTD allocation, initialization and full attach remain pending. */
import source from '../../assets/gothic3/shared-crt-bootstrap/source.json';
import {NativeRuntimePlatform,NativeWin32PlatformException} from './native-runtime-platform';
import type {NativeCrtLocalProcedure,NativeCrtLocalAllocProcedure,NativeCrtLocalGetProcedure,NativeCrtLocalSetProcedure,NativeCrtThreadDestructor,NativeWin32HeapCapability} from './native-runtime-platform';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeMemoryBacking} from './native-memory-admin';
import type {NativeBytePointer} from './native-pointer-geometry';
import type {NativeStandardIoCallGrant,NativeStandardIoResult} from './native-win32-standard-io';
import type {NativeStartupInfoCallGrant} from './native-win32-startup-io';
import type {NativeWin32ProcessInputEndpoints} from './native-win32-process-inputs';
import type {NativeArgvNlsCallGrant} from './native-win32-argv-nls';
import type {NativeValue} from './dialogue';
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedCrtOwner>();
const token=Object.freeze({});
const methods={
 configureMultibyteInfo:['0x100b14a5','d7d13157ac9043b6a0b7168e1d0543cd26ca242074db0b3d85c97a7bf2247729'],
 memset:['0x100a7980','9ef7f32cb2a542225e41f61960817c9c8c8cee8cf8d798402dee12226c520968'],
 localeUpdate:['0x100a74b6','afbb832a9811913fd67febefb9e9a53acafe8103a68bc6032044e6d7c6a6daf8'],
 getPerThreadData:['0x100ae542','f2662a20d6a5b27758faeac91878529d9fae2d5561d12ff0a4ccea827a465720'],
 updateThreadMultibyte:['0x100b1387','9274c592b33871195ff2f82d894f6c03be23ab53e461929537d634a25643ee0d'],
 releaseMultibyteLock:['0x100b1422','1ac39b3075e9e0914f122ff6c4f1c3d65954004fa9fa5f2ca59c18bfb2d67a26'],
 initMultibyteTable:['0x100b1854','66630cd5e2a2dabb3bb968676d31a841924538d3637d71f3fd2fcfae81b546c6'],
 setMultibyteCodePage:['0x100b16ba','89304945ee36d848372d9e921365d42131857981d3f25800448d2a59cca9407d'],
 getSystemCodePage:['0x100b142b','92dbf9af22767f0f2f27c3821986ec61f014b06e7b899241bfe140e72114c00f'],

 ioInit:['0x100bf165','5fc3d0c91e1861b89b12507adce6739546fc7fd1cc6863c2d30a53c5ca1109ad'],
 memcpy:['0x100a7a00','ada0fafd69940490a3c1ac706772420ce32760254cc28aff588c401ed09f1c44'],
 errno:['0x100aedd1','7fdd3947bb396eaf9c371f64fc91f7b8c30db450c7db3a8fa6ce2904748731f6'],
 getPerThreadDataLower:['0x100ae4cb','1887dade0a77296429fcade67c66dcf45022ddf923c828447a8d306aa865773d'],
 getThreadStorageProvider:['0x100ae384','4abdc2792dd07d9b9a335efbc64d066396a8035bf668fa9f806a8537ae72020e'],
 callNewHandler:['0x100bc03d','abdd56c493fb71672cc6b8737f39fd6fcffe98d0c7ddb786e8ab21377febf27e'],

 getEnvironmentStringsA:['0x100c0c60','70c54e85980de597fb4ce37e12e9bdaa8fcf69966c3196b9f7e4e66c068b32bc'],
 mallocCrt:['0x100aeed0','3f6ef57453c8e37b9df1ceeab6a3b6c85c82e2f1154926563e5fe068033dabf0'],
 malloc:['0x100aaaf6','70262c4e3e41925b21175c516dbef31313d2260ef97767a9a6676779eedf7a08'],
 free:['0x100aa9a4','7474b03ad23792b7631b8ff093c017b1e03f0ac21189a73b60a5368d8717f22e'],

 rtcInitialize:['0x100bb8c3','2e030b3c988c98e3f4a29768aae959e9c83cef2d3de4c5c2e4307712741ae0cb'],
 initializePerThreadData:['0x100ae40c','389ca2d7929849255385952d6420f73909f26797c647e920a1abf981ef61e139'],
 addLocaleRef:['0x100b19be','ecf1688872a9a80efc52921245e2dc2e1b193a244486ec1a9fa43aaf2f3a5b3a'],
 lock:['0x100bb892','3d74be3e3b5df76a33034414a8a1a7b8aba7962697d3aa7790c470b0e2fbde78'],
 unlock:['0x100bb7a2','bd77ef3907ee26a8a910d5015f4abc9206e55d072e8d12350b7dd7d59709012f'],
 releasePtdLocaleLock:['0x100ae4c2','a454091440d2c622c8eea05cba80a8e935b8434759bbd5f66a63de33d26884b9'],

 callocCrt:['0x100aef10','1e2daec524fa581a05bd1728174cf8d55cefe0fd1de4ad5bbb16a0f169c2a215'],
 callocImpl:['0x100c0e96','f3f407babf88e4cb3e57b9873906a6dc4e2810b6d22d9dad8ef2488d7a04d002'],
 freeThreadData:['0x100ae55a','280a74234816fdcb676d9d289f3d64427266c36f57af494a3fba0b7295c25345'],
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
const images={multibyteCodePageTable:['10141290',240,'a4030000608279822100000000000000a6df000000000000a1a5000000000000819fe0fc00000000407e80fc00000000a8030000c1a3daa320000000000000000000000000000000000000000000000081fe00000000000040fe000000000000b5030000c1a3daa320000000000000000000000000000000000000000000000081fe00000000000041fe000000000000b6030000cfa2e4a21a00e5a2e8a25b000000000000000000000000000000000081fe000000000000407ea1fe000000005105000051da5eda20005fda6ada32000000000000000000000000000000000081d3d8dee0f90000317e81fe00000000'],systemCodePageSelected:['102f6910',4,'00000000'],initialMultibyte:['10140e60',544,'00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000101010101010101010101010101010101010101010101010101000000000000020202020202020202020202020202020202020202020202020200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006162636465666768696a6b6c6d6e6f707172737475767778797a0000000000004142434445464748494a4b4c4d4e4f505152535455565758595a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'],multibytePointer:['10141288',4,'600e1410'],threadLocaleMask:['10141384',4,'feffffff'],multibyteInitialized:['102f8588',4,'00000000'],ioHandleCount:['102f7068',4,'00000000'],ioBlocks:['102f70c0',256,'00'.repeat(256)],memcpySseFlag:['102f854c',4,'00000000'],memcpyForwardDwords:['100a7b08',32,'6b7b0a10587b0a10507b0a10487b0a10407b0a10387b0a10307b0a10287b0a10'],memcpyForwardTail:['100a7b74',16,'847b0a108c7b0a10987b0a10ac7b0a10'],environmentMode:['102f6bf0',4,'00000000'],commandLinePointer:['102f8564',4,'00000000'],environmentPointer:['102f6490',4,'00000000'],rtcInitializers:['100f7cec',256,'00'.repeat(256)],exceptionActionsAnchor:['10140b50',4,'050000c0'],multibyteRefcount:['10140e60',4,'00000000'],initialLocale:['10141390',216,'0100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000088131410000000000000000000000000881314100000000000000000000000008813141000000000000000000000000088131410000000000000000000000000881314100000000000000000000000000100000001000000000000000000000000000000a01b14100000000000000000382e0f10c0320f1040340f10e01a1410'],initialTimeLocale:['10141ae0',184,'68360f1064360f1060360f105c360f1058360f1054360f1050360f1048360f1040360f1038360f102c360f1020360f1018360f100c360f1008360f1004360f1000360f10fc350f10f8350f10f4350f10f0350f10ec350f10e8350f10e4350f10e0350f10dc350f10d4350f10c8350f10c0350f10b8350f10f8350f10b0350f10a8350f10a0350f1094350f108c350f1080350f1074350f1070350f106c350f1060350f104c350f1040350f10090400000100000000000000'],localeCSentinel:['10141388',4,'43000000'],localePointer:['10141468',4,'90131410'],allocationRetryDelay:['102f64b4',4,'00000000'],newMode:['102f6ad0',4,'00000000'],osFields:['102f642c',20,'00'.repeat(20)],heapHandle:['102f6ac8',4,'00000000'],heapSelection:['102f8530',4,'00000000'],
 tlsGetterIndex:['10140b48',4,'ffffffff'],threadDataIndex:['10140b44',4,'ffffffff'],procedureSlots:['102f64a4',16,'00'.repeat(16)],
 pointer6ac4:['102f6ac4',4,'00000000'],pointer6ac0:['102f6ac0',4,'00000000'],pointer64a0:['102f64a0',4,'00000000'],
 pointer690c:['102f690c',4,'00000000'],pointer6abc:['102f6abc',4,'00000000'],signalPointers:['102f6aa8',16,'00'.repeat(16)],
 ehHook:['102f64b8',4,'00000000'],exitPointer:['10140a60',4,'b7a70a10'],lockTable:['101414b8',288,"000000000100000000000000010000000000000000000000000000000100000000000000010000000000000000000000000000000100000000000000010000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000010000000000000001000000000000000000000000000000010000000000000001000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],staticSections:['102f6958',336,'00'.repeat(336)]} as const;
type Image=keyof typeof images;
function physical(size:number){return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(size),knownMask:new Uint8Array(size),freed:false});}
export class NativeSharedCrtOwner {
 readonly identity=Object.freeze({});
 #images=new Map<Image,{fields:NativeHeapObjectViews;bytes:Uint8Array;masks:Uint8Array}>();
 #ptd:NativeHeapObjectViews|null=null;
 #localeUpdate:NativeHeapObjectViews|null=null;
 #codePage:number|null=null;
 #multibyteAllocation:NativeHeapObjectViews|null=null;
 #nlsPending:{call:NativeArgvNlsCallGrant;kind:'GetACP'|'IsValidCodePage'|'GetCPInfo';scalar:number;fields:NativeHeapObjectViews|null}|null=null;
 #cpInfo:NativeHeapObjectViews|null=null;
 #cpInfoStorage:{backing:NativeMemoryBacking;bytes:Uint8Array;masks:Uint8Array;backingBytes:Uint8Array;backingMasks:Uint8Array;view:DataView}|null=null;
 #ptdInstalled=false;
 #ptdInitialized=false;
 #startupInfo:NativeHeapObjectViews|null=null;
 #startupCall:NativeStartupInfoCallGrant|null=null;
 #ioBlock:NativeHeapObjectViews|null=null;
 #ioReturned:number|null=null;
 #stdPending:{call:NativeStandardIoCallGrant;kind:'GetStdHandle'|'GetFileType'|'SetHandleCount';scalar:number;object:object|null}|null=null;
 #rtcReturned=false;
 #environmentInput:NativeBytePointer|null=null;
 #environmentAllocation:NativeHeapObjectViews|null=null;
 #environmentReturned=false;
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
 #threadDestructor:NativeCrtThreadDestructor;
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
  this.#threadDestructor=Object.freeze({address:'100ae55a' as const,invoke:(value:object|null):NativeValue<void>=>{
   const active=NativeRuntimePlatform.requireActivePlatform(this.platform);if(!active.known)return active;
   return value===null?{known:true,value:undefined}:{known:false,reason:'Unowned SharedBase non-NULL PTD destruction at 100ae55a'};
  }});
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
  const mb=this.#images.get('initialMultibyte')!;
  if(mb.fields.bytes.slice(0,4).some((byte,index)=>byte!==this.#images.get('multibyteRefcount')!.fields.bytes[index]))throw new Error('Original multibyte refcount alias differs');
  this.#images.set('multibyteRefcount',{fields:new NativeHeapObjectViews(mb.fields.backing,0,4),bytes:mb.bytes,masks:mb.masks});
  Object.defineProperty(this,'identity',{value:this.identity,writable:false,configurable:false});
  Object.defineProperty(this,'platform',{value:platform,writable:false,configurable:false});
 }
 static nlsArgumentsForPlatform(platform:NativeRuntimePlatform,call:NativeArgvNlsCallGrant):NativeValue<Readonly<{kind:'GetACP'|'IsValidCodePage'|'GetCPInfo';scalar:number;fields:NativeHeapObjectViews|null}>> {
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
  const owner=owners.get(platform),pending=owner?owner.#nlsPending:null;
  if(!owner||!owner.#active||!pending||pending.call!==call)return {known:false,reason:'Actual pending SharedBase NLS call required'};
  if(pending.fields){
   const fields=pending.fields,root=owner.#cpInfoStorage;
   if(!root||fields!==owner.#cpInfo||fields.backing!==root.backing||root.backing.freed||fields.bytes!==root.bytes||fields.knownMask!==root.masks||fields.view!==root.view||root.backing.bytes!==root.backingBytes||root.backing.knownMask!==root.backingMasks||fields.bytes.length!==20||fields.knownMask.length!==20||fields.view.buffer!==root.bytes.buffer||fields.view.byteOffset!==root.bytes.byteOffset||fields.view.byteLength!==20)return {known:false,reason:'Actual retained SharedBase CPInfo local storage required'};
  }
  return {known:true,value:pending};
 }
 static standardIoArgumentsForPlatform(platform:NativeRuntimePlatform,call:NativeStandardIoCallGrant):NativeValue<Readonly<{kind:'GetStdHandle'|'GetFileType'|'SetHandleCount';scalar:number;object:object|null}>> {
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
  const owner=owners.get(platform),pending=owner?owner.#stdPending:null;
  if(!owner||!owner.#active||!pending||pending.call!==call)return {known:false,reason:'Actual pending SharedBase standard-I/O call required'};
  return {known:true,value:pending};
 }
 static canonicalStartupCallForPlatform(platform:NativeRuntimePlatform,call:NativeStartupInfoCallGrant):NativeValue<NativeHeapObjectViews> {
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
  const owner=owners.get(platform);
  if(!owner||!owner.#startupInfo||owner.#startupCall!==call||!owner.#active||owner.#startupInfo.backing.freed)return {known:false,reason:'Actual pending SharedBase startup-info call required'};
  return {known:true,value:owner.#startupInfo};
 }
 static canonicalEnvironmentDestinationForPlatform(platform:NativeRuntimePlatform,pointer:NativeBytePointer,bytes:number):NativeValue<void> {
  const owner=owners.get(platform);
  if(!owner||!owner.#environmentAllocation||pointer.fields!==owner.#environmentAllocation||pointer.offset!==0||!owner.#heap)return {known:false,reason:'Actual SharedBase environment destination required'};
  return NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,owner.#heap,owner.identity,pointer,bytes);
 }
 static canonicalThreadDestructorForPlatform(platform:NativeRuntimePlatform,callback:NativeCrtThreadDestructor):boolean {
  const owner=owners.get(platform);return owner!==undefined&&owner.#threadDestructor===callback;
 }
 static forPlatform(platform:NativeRuntimePlatform):NativeSharedCrtOwner {
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)throw new Error(active.reason);
  const old=owners.get(platform);if(old)return old;
  const owner=new NativeSharedCrtOwner(platform,token);owners.set(platform,owner);return owner;
 }
 imageStorage(label:Image):NativeHeapObjectViews {
  const image=this.#images.get(label);if(!image)throw new Error('Unknown SharedBase image');
  const {fields,bytes,masks}=image;
  if(fields.backing.freed||fields.backing.bytes!==bytes||fields.backing.knownMask!==masks||fields.bytes.buffer!==bytes.buffer||fields.bytes.byteOffset!==bytes.byteOffset||fields.bytes.length!==images[label][1]||fields.knownMask.buffer!==masks.buffer||fields.knownMask.byteOffset!==masks.byteOffset||fields.knownMask.length!==images[label][1]||!(fields.view instanceof DataView)||fields.view.buffer!==bytes.buffer||fields.view.byteOffset!==bytes.byteOffset||fields.view.byteLength!==fields.bytes.length)throw new Error('Actual retained SharedBase image required');
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
  if(cached!==null&&this.imageStorage('threadDataIndex').readUnsigned(0)!==0xffffffff){
   const getter=this.#call('100ae316.TlsGetValue',()=>this.platform.tlsGetValue(this.imageStorage('tlsGetterIndex').readUnsigned(0)));
   if(!getter||!this.platform.ownsLocalStorageProcedure(getter as NativeCrtLocalProcedure)||(getter as NativeCrtLocalProcedure).kind!=='get')throw new Error('Actual same-platform cached PTD getter required');
   const record=this.#call('100ae318.getPTD',()=> (getter as NativeCrtLocalGetProcedure).invoke(this.imageStorage('threadDataIndex').readUnsigned(0)));
   if(record!==null){
    if(record!==this.#ptd||!this.#ptd||this.#ptd.backing.freed)throw new Error('Actual retained SharedBase PTD required');
    const procedure=this.#ptd.pointer<object>(0x1fc).get();
    if(procedure===null)return value;
    const codec=procedure as {name?:string;invoke?:(value:object|null)=>NativeValue<object|null>};
    if(codec.name!=='DecodePointer'||typeof codec.invoke!=='function')throw new Error('Actual PTD DecodePointer procedure required');
    return this.#call('100ae354.DecodePointer',()=>codec.invoke!(value));
   }
  }
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
 #initializePtd():void {
  const ptd=this.#ptd;if(!ptd||!this.#ptdInstalled||ptd.backing.freed)throw new Error('Actual installed SharedBase PTD required');
  const module=this.#call('100ae41d.GetModuleHandleA',()=>this.platform.getWin32ModuleHandle('KERNEL32.DLL'));
  ptd.pointer<NativeHeapObjectViews>(0x5c).set(this.imageStorage('exceptionActionsAnchor'));ptd.writeUnsigned(0x14,1);
  if(module!==null){
   const os=this.imageStorage('osFields');if(os.readUnsigned(0)===0)throw new Error('Unowned SharedBase invalid OS getter in PTD initializer');
   if((os.readUnsigned(12)|0)<6)throw new Error('Unowned SharedBase .mixcrt scan in PTD initializer');
   for(const [offset,name] of [[0x1f8,'EncodePointer'],[0x1fc,'DecodePointer']] as const){
    const procedure=this.#call('PTD.GetProcAddress('+name+')',()=>this.platform.getWin32Procedure(module,name));
    if(procedure!==null&&procedure.name!==name)throw new Error('Actual original PTD codec required');ptd.pointer<object>(offset).set(procedure);
   }
  }
  ptd.writeUnsigned(0x70,1);ptd.writeUnsigned(0xc8,0x43,1);ptd.writeUnsigned(0x14b,0x43,1);
  const mb=this.imageStorage('initialMultibyte');ptd.pointer<NativeHeapObjectViews>(0x68).set(mb);
  this.#call('100ae483.InterlockedIncrement',()=>this.platform.interlockedCounter(this.imageStorage('multibyteRefcount'),1));
  const section=this.imageStorage('lockTable').pointer<NativeHeapObjectViews>(12*8).get();if(!section)throw new Error('Unowned SharedBase dynamic locale lock initialization');
  this.#call('100ae48b.lock12',()=>this.platform.enterPhysicalCriticalSection(section,this.identity));
  const locale=this.imageStorage('initialLocale');
  ptd.pointer<NativeHeapObjectViews>(0x6c).set(null);
  if(this.imageStorage('localePointer').readUnsigned(0)!==0x10141390)throw new Error('Unowned SharedBase changed global locale pointer');
  ptd.pointer<NativeHeapObjectViews>(0x6c).set(locale);
  this.#call('addLocaleRef.root',()=>this.platform.interlockedCounter(new NativeHeapObjectViews(locale.backing,0,4),1));
  for(const offset of [0xb0,0xb8,0xb4,0xc0])if(locale.readUnsigned(offset)!==0)throw new Error('Unowned SharedBase dynamic locale reference target');
  for(let offset=0x50;offset<0xb0;offset+=16){
   if(locale.readUnsigned(offset-8)!==0x10141388&&locale.readUnsigned(offset)!==0)throw new Error('Unowned SharedBase locale category reference');
   if(locale.readUnsigned(offset-4)!==0&&locale.readUnsigned(offset+4)!==0)throw new Error('Unowned SharedBase wide locale category reference');
  }
  if(locale.readUnsigned(0xd4)!==0x10141ae0)throw new Error('Unowned SharedBase time-locale reference target');
  const time=this.imageStorage('initialTimeLocale');
  this.#call('addLocaleRef.time',()=>this.platform.interlockedCounter(new NativeHeapObjectViews(time.backing,0xb4,4),1));
  this.#call('100ae4b7.unlock12',()=>this.platform.leavePhysicalCriticalSection(section,this.identity));
  this.#ptdInitialized=true;this.#trace.push('100ae40c.initializePtd.return');
 }
 #callocCrt(count:number,size:number):NativeHeapObjectViews|null {
  // Selected callers supply NULL error-output. Preserve the unsigned guard.
  if(!Number.isInteger(count)||!Number.isInteger(size)||count<0||size<0||count>0xffffffff||size>0xffffffff||(count!==0&&size>Math.floor(0xffffffe0/count)))throw new Error('Unowned SharedBase calloc overflow errno/invalid-parameter branch');
  const bytes=count*size||1;
  if(this.imageStorage('heapSelection').readUnsigned(0)!==1)throw new Error('Unowned SharedBase small-block calloc path');
  const heap=this.imageStorage('heapHandle').pointer<NativeWin32HeapCapability>(0).get();
  if(heap!==this.#heap||heap===null)throw new Error('Actual SharedBase calloc heap required');
  const proof=NativeRuntimePlatform.canonicalWin32HeapForOwner(this.platform,heap,this.identity);if(!proof.known)throw new Error(proof.reason);
  const allocation=this.#call('100c0f54.HeapAlloc(8,'+bytes+')',()=>this.platform.win32HeapAlloc(heap,8,bytes));
  if(allocation!==null){
   const fields=new NativeHeapObjectViews(allocation),span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,heap,this.identity,{fields,offset:0},bytes);
   if(!span.known)throw new Error(span.reason);return fields;
  }
  if(this.imageStorage('newMode').readUnsigned(0)!==0)throw new Error('Unowned SharedBase calloc new-handler retry at 100bc03d');
  if(this.imageStorage('allocationRetryDelay').readUnsigned(0)!==0)throw new Error('Unowned SharedBase calloc Sleep retry at 100aef35');
  return null;
 }
 #getPtdLowerWarm():NativeHeapObjectViews {
  const saved=this.#call('100ae4cd.GetLastError',()=>this.platform.getWin32LastError());
  const index=this.imageStorage('tlsGetterIndex').readUnsigned(0);
  let getter=this.#call('100ae38b.TlsGetValue',()=>this.platform.tlsGetValue(index));
  if(getter===null){
   getter=this.#decodePointer(this.imageStorage('procedureSlots').pointer<object>(4).get());
   this.#call('100ae3ac.TlsSetValue',()=>this.platform.tlsSetValue(index,getter));
  }
  if(!getter||!this.platform.ownsLocalStorageProcedure(getter as NativeCrtLocalProcedure)||(getter as NativeCrtLocalProcedure).kind!=='get')throw new Error('Actual SharedBase PTD getter required for errno');
  const record=this.#call('100ae4e0.getPTD',()=> (getter as NativeCrtLocalGetProcedure).invoke(this.imageStorage('threadDataIndex').readUnsigned(0)));
  if(record===null)throw new Error('Unowned SharedBase lazy PTD allocation in errno at 100ae4ef');
  if(record!==this.#ptd||!this.#ptd||this.#ptd.backing.freed)throw new Error('Actual installed SharedBase PTD required for errno');
  this.#call('100ae537.SetLastError',()=>this.platform.setWin32LastError(saved));
  return this.#ptd;
 }
 #errnoSlot():NativeHeapObjectViews {
  const ptd=this.#getPtdLowerWarm();return new NativeHeapObjectViews(ptd.backing,8,4);
 }
 #mallocCrt(size:number):NativeHeapObjectViews|null {
  if(!Number.isInteger(size)||size<0||size>0xffffffe0)throw new Error('Unowned SharedBase oversized malloc/new-handler branch');
  const heap=this.imageStorage('heapHandle').pointer<NativeWin32HeapCapability>(0).get();if(heap!==this.#heap||heap===null)throw new Error('Actual SharedBase malloc heap required');
  const proof=NativeRuntimePlatform.canonicalWin32HeapForOwner(this.platform,heap,this.identity);if(!proof.known)throw new Error(proof.reason);
  if(this.imageStorage('heapSelection').readUnsigned(0)!==1)throw new Error('Unowned SharedBase mode3 malloc');
  const memory=this.#call('100aab67.HeapAlloc(0)',()=>this.platform.win32HeapAlloc(heap,0,size===0?1:size));
  if(memory===null){
   if(this.imageStorage('newMode').readUnsigned(0)===0){this.#errnoSlot().writeUnsigned(0,12);this.#trace.push('malloc.errno12.first');}
   else {
    const handler=this.#decodePointer(this.imageStorage('pointer6ac4').pointer<object>(0).get());
    if(handler!==null)throw new Error('Unowned SharedBase non-NULL new-handler invocation at 100bc03d');
    this.#trace.push('100bc03d.callNewHandler.return0');
   }
   this.#errnoSlot().writeUnsigned(0,12);this.#trace.push('malloc.errno12.returnNull');
   if(this.imageStorage('allocationRetryDelay').readUnsigned(0)!==0)throw new Error('Unowned SharedBase malloc Sleep retry at 100aeeed');
   return null;
  }
  const fields=new NativeHeapObjectViews(memory),span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,heap,this.identity,{fields,offset:0},size===0?1:size);
  if(!span.known)throw new Error(span.reason);return fields;
 }
 #copyAnsiEnvironment(input:NativeBytePointer,output:NativeBytePointer,bytes:number):void {
  this.#call('memcpy.sourceGeometry',()=>this.platform.resolveNativePointer(input));
  const destination=this.#call('memcpy.destinationGeometry',()=>this.platform.resolveNativePointer(output));
  const direction=this.#call('memcpy.pointerComparison',()=>this.platform.proveNativeCopyDirection(output,input,bytes));
  if(direction!=='forward')throw new Error('Unowned SharedBase backward environment memcpy');
  if(bytes>=256&&this.imageStorage('memcpySseFlag').readUnsigned(0)!==0)throw new Error('Unowned SharedBase SSE memcpy selection');
  if(destination.modulo4!==0)throw new Error('Unowned SharedBase unaligned environment memcpy');
  const dwords=Math.floor(bytes/4),tail=bytes&3;
  if(dwords<8){
   const target=this.imageStorage('memcpyForwardDwords').readUnsigned(dwords*4);
   const admitted=[0x100a7b6b,0x100a7b58,0x100a7b50,0x100a7b48,0x100a7b40,0x100a7b38,0x100a7b30,0x100a7b28];
   if(target!==admitted[dwords])throw new Error('Original SharedBase DWORD dispatch target required');
   this.#trace.push('memcpy.dwordDispatch.'+target.toString(16));
  }else{
   const df=this.#call('memcpy.readDF',()=>NativeRuntimePlatform.readNativeDirectionFlag(this.platform));
   if(df!==0)throw new Error('Unowned SharedBase REP MOVSD with DF1');
   this.#trace.push('100a7a5a.repMovsd');
  }
  const transfer=(offset:number,width:1|4)=>{
   const src=Object.freeze({fields:input.fields,offset:input.offset+offset}),dst=Object.freeze({fields:output.fields,offset:output.offset+offset});
   const access=NativeRuntimePlatform.canonicalProcessInputSpanForPlatform(this.platform,src,width);if(!access.known)throw new Error(access.reason);
   const value=NativeHeapObjectViews.prototype.readUnsigned.call(src.fields,src.offset,width);this.#trace.push('memcpy.load'+width+'.'+offset);
   const store=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,dst,width);if(!store.known)throw new Error(store.reason);
   NativeHeapObjectViews.prototype.writeUnsigned.call(dst.fields,dst.offset,value,width);this.#trace.push('memcpy.store'+width+'.'+offset);
  };
  for(let word=0;word<dwords;word++)transfer(word*4,4);
  const target=this.imageStorage('memcpyForwardTail').readUnsigned(tail*4);
  if(target!==[0x100a7b84,0x100a7b8c,0x100a7b98,0x100a7bac][tail])throw new Error('Original SharedBase byte-tail dispatch target required');
  this.#trace.push('memcpy.tailDispatch.'+target.toString(16));
  for(let byte=0;byte<tail;byte++)transfer(dwords*4+byte,1);
  this.#trace.push('memcpy.returnDestination');
 }
 #readEnvironment(endpoints:NativeWin32ProcessInputEndpoints):NativeBytePointer|null {
  const state=this.imageStorage('environmentMode');let wide:NativeBytePointer|null=null;
  if(state.readUnsigned(0)===0){
   wide=this.#call('100c0c7c.GetEnvironmentStringsW',()=>endpoints.getEnvironmentStringsW());this.#environmentInput=wide;
   if(wide!==null)state.writeUnsigned(0,1);
   else if(this.#call('100c0c90.GetLastError',()=>this.platform.getWin32LastError())===120)state.writeUnsigned(0,2);
  }
  if(state.readUnsigned(0)!==1){
   if(state.readUnsigned(0)!==0&&state.readUnsigned(0)!==2){this.#environmentReturned=true;return null;}
   const ansi=this.#call('100c0d3e.GetEnvironmentStringsA',()=>endpoints.getEnvironmentStrings());this.#environmentInput=ansi;
   if(ansi===null){this.#environmentReturned=true;return null;}
   let offset=0;
   const byte=(at:number)=>this.#call('environment.readANSI',()=>NativeRuntimePlatform.readProcessInputUnsigned(this.platform,ansi,at,1));
   while(byte(offset)!==0){do{offset++;}while(byte(offset)!==0);offset++;}
   this.#environmentAllocation=this.#mallocCrt(offset+1);let result:NativeBytePointer|null=null;
   if(this.#environmentAllocation!==null){
    const output=Object.freeze({fields:this.#environmentAllocation,offset:0});
    this.#copyAnsiEnvironment(ansi,output,offset+1);result=output;
   }
   this.#call('100c0d86.FreeEnvironmentStringsA',()=>endpoints.freeEnvironmentStringsA(ansi));
   this.#environmentReturned=true;return result;
  }
  if(wide===null){wide=this.#call('100c0cb6.GetEnvironmentStringsW',()=>endpoints.getEnvironmentStringsW());this.#environmentInput=wide;if(wide===null){this.#environmentReturned=true;return null;}}
  const input=wide;let offset=0;
  const word=(at:number)=>this.#call('environment.readUTF16',()=>NativeRuntimePlatform.readProcessInputUnsigned(this.platform,input,at,2));
  while(word(offset)!==0){do{offset+=2;}while(word(offset)!==0);offset+=2;}
  const count=offset/2+1;
  const base={codePage:0 as const,flags:0 as const,input,inputCharacters:count,defaultCharacter:null,usedDefaultCharacter:null};
  const size=this.#call('100c0cf1.WideCharToMultiByte.query',()=>endpoints.wideCharToMultiByte({...base,output:null,outputBytes:0}));
  let result:NativeBytePointer|null=null;
  if(size!==0){
   this.#environmentAllocation=this.#mallocCrt(size);
   if(this.#environmentAllocation!==null){
    const output=Object.freeze({fields:this.#environmentAllocation,offset:0});
    const converted=this.#call('100c0d13.WideCharToMultiByte.fill',()=>endpoints.wideCharToMultiByte({...base,output,outputBytes:size}));
    if(converted!==0)result=output;
    else {
     const heap=this.#heap!;
     const freed=this.#call('100c0d1d.free.HeapFree',()=>this.platform.win32HeapFree(heap,0,this.#environmentAllocation!.backing));
     if(!freed)throw new Error('Unowned SharedBase free errno mapping after HeapFree failure');
    }
   }
  }
  this.#call('100c0d2c.FreeEnvironmentStringsW',()=>endpoints.freeEnvironmentStringsW(input));
  this.#environmentReturned=true;return result;
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
  const allocator=this.#decodePointer(slots.pointer<object>(0).get());
  if(allocator!==this.#tlsFallback&&(!allocator||!this.platform.ownsLocalStorageProcedure(allocator as NativeCrtLocalProcedure)||(allocator as NativeCrtLocalProcedure).kind!=='alloc'))throw new Error('Actual same-platform thread allocator required');
  const threadIndex=this.#call('100ae816.allocateThreadIndex',()=> (allocator as NativeCrtLocalAllocProcedure).invoke(this.#threadDestructor));
  this.imageStorage('threadDataIndex').writeUnsigned(0,threadIndex);this.#trace.push('100ae81b.storeThreadIndex');
  if(threadIndex===0xffffffff)throw new Error('Unowned SharedBase __mtterm after thread index allocation failure');
  this.#trace.push('100ae829.calloc(1,532)');this.#ptd=this.#callocCrt(1,0x214);
  if(this.#ptd===null)throw new Error('Unowned SharedBase __mtterm after PTD allocation failure');
  const setter=this.#decodePointer(slots.pointer<object>(8).get());
  if(!setter||!this.platform.ownsLocalStorageProcedure(setter as NativeCrtLocalProcedure)||(setter as NativeCrtLocalProcedure).kind!=='set')throw new Error('Actual same-platform PTD setter required');
  const installed=this.#call('100ae849.setPTD',()=> (setter as NativeCrtLocalSetProcedure).invoke(threadIndex,this.#ptd));
  if(!installed)throw new Error('Unowned SharedBase __mtterm after PTD installation failure');
  this.#ptdInstalled=true;
  this.#initializePtd();
  const thread=this.#call('100ae859.GetCurrentThreadId',()=>this.platform.getCurrentThreadId());
  this.#ptd.writeUnsigned(4,0xffffffff);this.#ptd.writeUnsigned(0,thread);
  this.#mtReturned=1;this.#trace.push('100ae867.mtInit.return1');return 1;
 }
 #updateMultibyteWarm():NativeHeapObjectViews {
  const ptd=this.#getPtdLowerWarm();
  let mb=ptd.pointer<NativeHeapObjectViews>(0x68).get();
  if((ptd.readUnsigned(0x70)&this.imageStorage('threadLocaleMask').readUnsigned(0))===0||ptd.pointer(0x6c).get()===null){
   const section=this.imageStorage('lockTable').pointer<NativeHeapObjectViews>(13*8).get();if(!section)throw new Error('Unowned SharedBase dynamic multibyte lock');
   this.#call('updateMultibyte.lock13',()=>this.platform.enterPhysicalCriticalSection(section,this.identity));
   if(this.imageStorage('multibytePointer').readUnsigned(0)!==0x10140e60)throw new Error('Unowned SharedBase changed global multibyte pointer');
   const global=this.imageStorage('initialMultibyte');
   if(mb!==global)throw new Error('Unowned SharedBase multibyte reference exchange');
   this.#call('100b1422.unlock13',()=>this.platform.leavePhysicalCriticalSection(section,this.identity));mb=global;
  }
  if(mb===null)throw new Error('Unowned SharedBase multibyte fatal error');
  this.#trace.push('100b1387.updateMultibyte.return');return mb;
 }
 #initializeLocaleUpdate():NativeHeapObjectViews {
  const local=physical(16);this.#localeUpdate=local;local.writeUnsigned(12,0,1);
  const ptd=this.#getPtdLowerWarm();local.pointer<NativeHeapObjectViews>(8).set(ptd);
  const locale=ptd.pointer<NativeHeapObjectViews>(0x6c).get(),mb=ptd.pointer<NativeHeapObjectViews>(0x68).get();
  local.pointer<NativeHeapObjectViews>(0).set(locale);local.pointer<NativeHeapObjectViews>(4).set(mb);
  const mask=this.imageStorage('threadLocaleMask').readUnsigned(0);
  if((locale!==this.imageStorage('initialLocale')||this.imageStorage('localePointer').readUnsigned(0)!==0x10141390)&&(ptd.readUnsigned(0x70)&mask)===0)throw new Error('Unowned SharedBase locale reference exchange at 100a74ed');
  if((mb!==this.imageStorage('initialMultibyte')||this.imageStorage('multibytePointer').readUnsigned(0)!==0x10140e60)&&(ptd.readUnsigned(0x70)&mask)===0)local.pointer<NativeHeapObjectViews>(4).set(this.#updateMultibyteWarm());
  if((ptd.readUnsigned(0x70,1)&2)===0){ptd.writeUnsigned(0x70,ptd.readUnsigned(0x70)|2);local.writeUnsigned(12,1,1);}
  this.#trace.push('100a74b6.localeUpdate.return');return local;
 }
 #nlsScalar(kind:'GetACP'|'IsValidCodePage'|'GetCPInfo',scalar=0,fields:NativeHeapObjectViews|null=null):number {
  const endpoints=this.platform.argvNlsEndpoints;if(!endpoints)throw new Error('Actual SharedBase '+kind+' NLS endpoints required');
  const proof=NativeRuntimePlatform.canonicalArgvNlsEndpointsForPlatform(this.platform,endpoints);if(!proof.known)throw new Error(proof.reason);
  const call=Object.freeze({identity:Object.freeze({})});this.#nlsPending={call,kind,scalar,fields};
  try{
   const result=this.#call('SharedBase.'+kind,()=>endpoints.invoke(call));
   const actual=this.#call(kind+'.normalReturn',()=>NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(this.platform,call));
   if(result!==actual||result.kind!=='scalar')throw new Error('Actual SharedBase NLS scalar return required');return result.value;
  }finally{this.#nlsPending=null;}
 }
 #getSystemCodePage(input=-3):number {
  const local=this.#initializeLocaleUpdate();this.imageStorage('systemCodePageSelected').writeUnsigned(0,0);
  let codePage:number;
  if(input===-3){this.imageStorage('systemCodePageSelected').writeUnsigned(0,1);codePage=this.#nlsScalar('GetACP');}
  else if(input>=0)codePage=input>>>0;
  else throw new Error('Unowned SharedBase alternate system-codepage selection');
  if(local.readUnsigned(12,1)!==0){const ptd=local.pointer<NativeHeapObjectViews>(8).get();if(ptd!==this.#ptd||!ptd)throw new Error('Actual locale-update PTD required');ptd.writeUnsigned(0x70,ptd.readUnsigned(0x70)&0xfffffffd);}
  this.#codePage=codePage;this.#trace.push('100b142b.getSystemCP.return');return codePage;
 }
 #configureMultibytePrefix(fields:NativeHeapObjectViews,input:number):void {
  const codePage=this.#getSystemCodePage(input);
  if(codePage===0)throw new Error('Unowned SharedBase setSBCS at 100b14d0');
  const table=this.imageStorage('multibyteCodePageTable');
  for(let offset=0;offset<240;offset+=48){this.#trace.push('configureMultibyte.tableCompare.'+offset);if(table.readUnsigned(offset)===codePage)throw new Error('Unowned SharedBase built-in DBCS setup');}
  if(codePage===65000||codePage===65001)throw new Error('Unowned SharedBase invalid-codepage return/cookie check');
  if(this.#nlsScalar('IsValidCodePage',codePage&0xffff)===0)throw new Error('Unowned SharedBase invalid-codepage return/cookie check');
  const info=physical(20);this.#cpInfo=info;this.#cpInfoStorage={backing:info.backing,bytes:info.bytes,masks:info.knownMask,backingBytes:info.backing.bytes,backingMasks:info.backing.knownMask,view:info.view};
  if(this.#nlsScalar('GetCPInfo',codePage,info)===0)throw new Error('Unowned SharedBase CPInfo failure fallback');
  const pointer={fields,offset:0x1c},geometry=this.#call('memset.geometry',()=>this.platform.resolveNativePointer(pointer));
  const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,pointer,257);if(!span.known)throw new Error(span.reason);
  if(this.imageStorage('memcpySseFlag').readUnsigned(0)!==0)throw new Error('Unowned SharedBase SSE memset');
  let offset=0,remaining=257;
  for(let lead=(-geometry.modulo4)&3;lead>0;lead--){fields.writeUnsigned(0x1c+offset++,0,1);remaining--;this.#trace.push('memset.alignByte');}
  const words=remaining>>>2;remaining&=3;
  const df=this.#call('memset.readDF',()=>NativeRuntimePlatform.readNativeDirectionFlag(this.platform));if(df!==0)throw new Error('Unowned SharedBase reverse memset');
  for(let i=0;i<words;i++){fields.writeUnsigned(0x1c+offset,0);offset+=4;this.#trace.push('100a79df.REP_STOSD');}
  for(let i=0;i<remaining;i++){fields.writeUnsigned(0x1c+offset++,0,1);this.#trace.push('memset.tailByte');}
  fields.writeUnsigned(4,codePage);fields.writeUnsigned(12,0);
  if(info.readUnsigned(0)>1)throw new Error('Unowned SharedBase general DBCS lead-byte setup');
  fields.writeUnsigned(8,0);
  const storesDf=this.#call('100b165b.readDF',()=>NativeRuntimePlatform.readNativeDirectionFlag(this.platform));if(storesDf!==0)throw new Error('Unowned SharedBase reverse multibyte information stores');
  for(const at of [16,20,24])fields.writeUnsigned(at,0);
  throw new Error('Unowned SharedBase single-byte case setup at 100b1614 -> 100b11fd');
 }
 #initializeArgumentsPrefix():void {
  if(this.imageStorage('multibyteInitialized').readUnsigned(0)===0){
   this.#trace.push('100b185f.setMultibyteCodePage(-3)');
   this.#getPtdLowerWarm();const mb=this.#updateMultibyteWarm(),codePage=this.#getSystemCodePage();
   if(codePage!==mb.readUnsigned(4)){
    const allocated=this.#mallocCrt(544);this.#multibyteAllocation=allocated;
    if(allocated!==null){
     const df=this.#call('100b170f.readDF',()=>NativeRuntimePlatform.readNativeDirectionFlag(this.platform));
     if(df!==0)throw new Error('Unowned SharedBase reverse multibyte REP MOVSD');
     for(let offset=0;offset<544;offset+=4){allocated.writeUnsigned(offset,mb.readUnsigned(offset));this.#trace.push('100b170f.REP_MOVSD');}
     allocated.writeUnsigned(0,0);this.#configureMultibytePrefix(allocated,codePage);
    }
    this.#trace.push('100b16ba.setMultibyteCodePage.return-1');
   }else this.#trace.push('100b16ba.setMultibyteCodePage.return0');
   this.imageStorage('multibyteInitialized').writeUnsigned(0,1);
  }
  throw new Error('Unowned SharedBase module filename acquisition at 100c0bd1');
 }
 #standardCall(kind:'GetStdHandle'|'GetFileType'|'SetHandleCount',scalar:number,object:object|null=null):NativeStandardIoResult {
  const endpoints=this.platform.standardIoEndpoints;if(!endpoints)throw new Error('Actual SharedBase standard-I/O endpoints required');
  const proof=NativeRuntimePlatform.canonicalStandardIoEndpointsForPlatform(this.platform,endpoints);if(!proof.known)throw new Error(proof.reason);
  const call=Object.freeze({identity:Object.freeze({})});this.#stdPending=Object.freeze({call,kind,scalar,object});
  try{return this.#call('SharedBase.'+kind,()=>endpoints.invoke(call));}finally{this.#stdPending=null;}
 }
 #initializeIoPrefix():number {
  const endpoints=this.platform.startupIoEndpoints;if(!endpoints)throw new Error('Actual SharedBase startup-info writer required at 100bf17a');
  this.#startupInfo=physical(68);const call=Object.freeze({identity:Object.freeze({})});this.#startupCall=call;
  try{this.#call('100bf17a.GetStartupInfoA',()=>endpoints.getStartupInfoA(call));}finally{this.#startupCall=null;}
  this.#ioBlock=this.#callocCrt(32,56);
  if(this.#ioBlock===null)throw new Error('Unowned SharedBase attach cleanup after I/O allocation failure');
  this.imageStorage('ioBlocks').pointer<NativeHeapObjectViews>(0).set(this.#ioBlock);this.imageStorage('ioHandleCount').writeUnsigned(0,32);
  for(let row=0;row<32;row++){
   const record=new NativeHeapObjectViews(this.#ioBlock.backing,row*56,56);
   record.writeUnsigned(4,0,1);record.writeUnsigned(0,0xffffffff);record.writeUnsigned(5,10,1);record.writeUnsigned(8,0);
   record.writeUnsigned(0x24,0,1);record.writeUnsigned(0x25,10,1);record.writeUnsigned(0x26,10,1);
  }
  const inherited=this.#startupInfo.readUnsigned(50,2);
  if(inherited!==0&&this.#startupInfo.readUnsigned(52)!==0)throw new Error('Unowned SharedBase inherited I/O handles at 100bf1dc');
  this.#trace.push('io.noInheritedHandles');
  for(let slot=0;slot<3;slot++){
   const record=new NativeHeapObjectViews(this.#ioBlock.backing,slot*56,56);
   record.writeUnsigned(4,0x81,1);
   const handle=this.#standardCall('GetStdHandle',(-10-slot)>>>0);
   let type=0;
   if(handle!==null&&handle!==0xffffffff){
    if(typeof handle!=='object')throw new Error('Actual platform HANDLE capability required');
    const capability=NativeRuntimePlatform.standardIoCapabilityForPlatform(this.platform,handle);if(!capability.known||capability.value!=='handle')throw new Error('Actual same-platform HANDLE required');
    const returned=this.#standardCall('GetFileType',0,handle);if(typeof returned!=='number')throw new Error('Actual DWORD file type required');type=returned;
   }
   if(handle===null||handle===0xffffffff||type===0){record.writeUnsigned(4,record.readUnsigned(4,1)|0x40,1);record.writeUnsigned(0,0xfffffffe);continue;}
   record.pointer<object>(0).set(handle as object);
   if((type&255)===2)record.writeUnsigned(4,record.readUnsigned(4,1)|0x40,1);
   else if((type&255)===3)record.writeUnsigned(4,record.readUnsigned(4,1)|8,1);
   const section=new NativeHeapObjectViews(this.#ioBlock.backing,slot*56+12,24);
   if(!this.#initializeSection(section)){this.#ioReturned=-1;return -1;}
   record.writeUnsigned(8,record.readUnsigned(8)+1);
  }
  this.#standardCall('SetHandleCount',this.imageStorage('ioHandleCount').readUnsigned(0));
  this.#ioReturned=0;this.#trace.push('100bf38a.ioInit.return0');return 0;
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
   const initializers=this.imageStorage('rtcInitializers');
   for(let offset=0;offset<256;offset+=4){
    const callback=initializers.readUnsigned(offset);
    if(callback!==0)throw new Error('Unowned SharedBase RTC initializer at '+callback.toString(16));
    this.#trace.push('rtc.skipNull'+offset);
   }
   this.#rtcReturned=true;this.#trace.push('100bb8e6.rtc.return');
   const endpoints=this.platform.processInputEndpoints;if(!endpoints)throw new Error('Actual SharedBase GetCommandLineA process-input service required at 100adb21');
   const proof=NativeRuntimePlatform.canonicalProcessInputEndpointsForPlatform(this.platform,endpoints);if(!proof.known)throw new Error(proof.reason);
   const command=this.#call('100adb21.GetCommandLineA',()=>endpoints.getCommandLineA());
   if(command!==null){const span=NativeRuntimePlatform.canonicalProcessInputSpanForPlatform(this.platform,command,0);if(!span.known)throw new Error(span.reason);}
   this.imageStorage('commandLinePointer').pointer<object>(0).set(command);this.#trace.push('100adb27.storeCommandLine');
   const environment=this.#readEnvironment(endpoints);
   this.imageStorage('environmentPointer').pointer<NativeBytePointer>(0).set(environment);this.#trace.push('100adb31.storeEnvironment');
   if(this.#initializeIoPrefix()<0)throw new Error('Unowned SharedBase attach cleanup after I/O initialization failure');
   this.#initializeArgumentsPrefix();throw new Error('Unowned SharedBase attach after arguments');
  }catch(error){this.#boundary??=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
  finally{this.#active=false;}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,localeUpdate:this.#localeUpdate,multibyteAllocation:this.#multibyteAllocation,cpInfo:this.#cpInfo,codePage:this.#codePage,startupInfo:this.#startupInfo,ioBlock:this.#ioBlock,ioReturned:this.#ioReturned,versionAllocation:this.#versionAllocation,
  ptd:this.#ptd,ptdInstalled:this.#ptdInstalled,ptdInitialized:this.#ptdInitialized,rtcReturned:this.#rtcReturned,environmentInput:this.#environmentInput,environmentAllocation:this.#environmentAllocation,environmentReturned:this.#environmentReturned,heap:this.#heap,heapReturned:this.#heapReturned,attachReturned:this.#attachReturned,mtReturned:this.#mtReturned,locksReturned:this.#locksReturned,sections:Object.freeze([...this.#sections]),pointersReturned:this.#pointersReturned,
  trace:Object.freeze([...this.#trace]),dllEntryExecuted:false,wholeCrtTraversalCompleted:false});}
}
