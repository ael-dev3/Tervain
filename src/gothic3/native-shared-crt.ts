/** Original SharedBase CRT process-attach version/heap prefix.
 * This owns distinct SharedBase images and selected locks/thread-index setup;
 * PTD allocation, initialization and full attach remain pending. */
import {NativeSharedStaticTls} from './native-shared-static-tls';
import {NativeSharedModuleImage} from './native-shared-module-image';
import {NativeX86ThreadStack} from './native-x86-thread-stack';
import {NativeSharedVersionResource} from './native-shared-version-resource';
import {NativeSharedVersionModule} from './native-shared-version-module';
import dllEntrySource from '../../assets/gothic3/shared-dll-entry-source/source.json';
import initializerSource from '../../assets/gothic3/shared-initializer-source/source.json';
import {sharedInitializerHeader} from './native-shared-initializer-instructions';
import {NativeSharedCrtSecurityCookie} from './native-shared-crt-security-cookie';
import source from '../../assets/gothic3/shared-crt-bootstrap/source.json';
import {NativeRuntimePlatform,NativeWin32PlatformException} from './native-runtime-platform';
import type {NativeCrtLocalProcedure,NativeCrtLocalAllocProcedure,NativeCrtLocalGetProcedure,NativeCrtLocalSetProcedure,NativeCrtThreadDestructor,NativeWin32HeapCapability} from './native-runtime-platform';
import type {NativeWin32ModuleCapability} from './native-runtime-platform';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeMemoryBacking,NativeMemoryRegion} from './native-memory-admin';
import type {NativeBytePointer} from './native-pointer-geometry';
import type {NativeStandardIoCallGrant,NativeStandardIoResult} from './native-win32-standard-io';
import type {NativeStartupInfoCallGrant} from './native-win32-startup-io';
import type {NativeWin32ProcessInputEndpoints} from './native-win32-process-inputs';
import type {NativeArgvNlsCallGrant} from './native-win32-argv-nls';
import type {NativeValue} from './dialogue';
import type {NativeWin32CreateFileArguments,NativeWin32FileHandle} from './native-win32-file-system';
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedCrtOwner>();
const token=Object.freeze({});
export interface NativeSharedDllModuleHooks {
 readonly imports:Readonly<Record<string,Readonly<{slot:NativeHeapObjectViews;procedure:object}>>>;
 readonly procedureName:NativeHeapObjectViews;
 acquire(filename:string):object;
 lookup(module:object,name:string):null;
 release(module:object):number;
}
export interface NativeSharedInitializerImports {
 readonly getModuleHandleA:object;readonly getProcAddress:object;readonly tlsGetValue:object;
 calloc(count:number,size:number,errorOutput:number,caller:string):NativeHeapObjectViews|null;
 descriptorBlock():NativeHeapObjectViews;
 descriptorHandle(fields:NativeHeapObjectViews,offset:number):number|object;
 encodeAllocation(procedure:object,fields:NativeHeapObjectViews,offset:number):object|null;
 getTls(index:number):object|null;
 getPtd(procedure:object,index:number):NativeHeapObjectViews|null;
 getCodec(record:NativeHeapObjectViews,direction?:'EncodePointer'|'DecodePointer'):object|null;
 decodePointer(procedure:object,encoded:object):Readonly<{fields:NativeHeapObjectViews;offset:number}>|number;
 readonly crtHeapFreeProcedure:object;
 crtHeapFree(heap:object,flags:number,fields:NativeHeapObjectViews,offset:number):number;
 readonly crtHeapAllocProcedure:object;
 crtHeapAlloc(heap:object,flags:number,size:number):NativeHeapObjectViews|null;
 readonly poolVirtualAllocProcedure:object;
 poolVirtualAlloc(address:number,size:number,type:number,protect:number):NativeHeapObjectViews|null;
 proveDisjointInitializerCopy(destination:NativeBytePointer,input:NativeBytePointer,bytes:number):void;
 comparePoolPointers(left:NativeBytePointer,right:NativeBytePointer):number;
 releasePoolSlot(pointer:NativeBytePointer):void;
 validatePoolRegion(region:NativeHeapObjectViews,offset:number,capacity:12|16|24|112|1792):void;
 retainVariablePoolSlot(region:NativeHeapObjectViews,offset:number):NativeHeapObjectViews;
 retainPoolSlot(region:NativeHeapObjectViews,offset:number,capacity:12|16|24|112|1792):NativeHeapObjectViews;
 readonly memorySectionInitializeProcedure:object;
 readonly memorySectionEnterProcedure:object;
 readonly memorySectionLeaveProcedure:object;
 memorySectionInitialize(fields:NativeHeapObjectViews,offset:number,spin:number):number;
 memorySectionLock(fields:NativeHeapObjectViews,offset:number,enter:boolean):void;
 readonly spyFindWindowProcedure:object;
 spyFindWindow(className:number,title:string):object|null;
 readonly initializeSectionProcedure:object;
 versionLogTls():Readonly<{index:NativeHeapObjectViews;vector:NativeHeapObjectViews;block:NativeHeapObjectViews}>;
 messageSectionLock(fields:NativeHeapObjectViews,offset:number,enter:boolean):void;
 initializeSection(fields:NativeHeapObjectViews,offset:number):void;
 readonly heapSizeProcedure:object;
 heapSize(heap:object,flags:number,fields:NativeHeapObjectViews,offset:number):number;
 exitLock(id:number,enter:boolean):void;
 crtSection(id:number):NativeHeapObjectViews|null;
 crtSectionLock(fields:NativeHeapObjectViews,offset:number,enter:boolean):void;
 readonly spieCreateFileProcedure:object;
 readonly spieGetLastErrorProcedure:object;
 readonly spieSetLastErrorProcedure:object;
 readonly spieGetFileTypeProcedure:object;
 readonly spieCloseHandleProcedure:object;
 closeFileHandle(handle:object):number;
 createFile(filename:NativeBytePointer,input:Omit<NativeWin32CreateFileArguments,'filename'>):number|NativeWin32FileHandle;
 getFileType(handle:object):number;
 getLastError():number;
 setLastError(value:number):void;
 sectionCachePointer():object|null;
 decodeSectionInitializer(procedure:object,encoded:object):object|number;
 initializeDescriptorSection(procedure:object|null,fields:NativeHeapObjectViews,offset:number,spin:number|null):number;
 descriptorSectionLock(fields:NativeHeapObjectViews,offset:number,enter:boolean):void;
 initializeCrtSection(fields:NativeHeapObjectViews,offset:number,spin:number):number;
 encodeCode(procedure:object,address:number):object|null;
 validateEncodedCode(value:object):void;
 getModule(name:string):object|null;
 getProcedure(module:object,name:string):object|null;
 queryFeature(procedure:object,feature:number):number;
}
const methods={
 setEnvp:['0x100c092a','7c2d07a7f3b191ba69dd4ae6f947cd3dc7f23e55095cf3548f27d7fe6b34b3a6'],
 strlen:['0x100b2a80','5044fc769fb26ae1772d18e3e1ef5ffc16757c910207278cab8d90af3557a7f0'],
 strcpySafe:['0x100c0e29','072c90f28588fa285fda7ae5b513826ba5e71baaa93f8351afa39d8f5922426f'],

 isMultibyteLead:['0x100d1fc7','c72bbffd29d5605c4fac60b6c88eda65790f24bdc8bfc6bcdc38e78db36ef00b'],
 isMultibyteType:['0x100d1e09','4ad795259740726e21455eb487aea9fb78912a414f61ea4bbc0fc1729173e609'],

 setArgv:['0x100c0ba7','80b2958c1c57afe10d2e32a43a80ffa7169fb32e37522244507590e91877944a'],
 parseCommandLine:['0x100c0a0f','213abb20960bc81f74f897ab905dcfcc2a66888b684f12d68019beb603c4890f'],
 sehProlog4:['0x100aeb68','e30b4c04dfd938e926cd434bb13e5723dad104657d993b990f465d72e19a7cc7'],
 sehEpilog4:['0x100aebad','39142b8d79823b8b3c0dd534ee99caf6c8cce4347b7608cfc004a14c873f7411'],
 releaseSetMultibyteLock:['0x100b181b','37157c0a418a5217571725d0769ee7f3276a6c8429d6b2bcfc6da2940a15ee00'],
 freeTemporary:['0x100b4d0f','cd661264860944049f4e6d20120d2260e73af51f1ee18316def6543d55d30dc0'],
 checkSecurityCookie:['0x100b01c8','95d8dafba9ee99a083dc36fbcd513a0f9b4d9d4fc39b6c056f167a164bdfabcd'],
 stackProbe:['0x100a8430','f8675b4976f7b8efc0bd917aebab734d11ca90222d20bcd2a166ce9914ed2b6e'],
 allocaProbe16:['0x100ce300','c53e03f0b5d9e6f9a66c4203349f5bd29f84aa23939e32c33134a87fe54bdc53'],
 setMultibyteCase:['0x100b11fd','a8876b24b4cbadce33680092957a78c2edc69cfb26e1cc716e7673f00bdd0a51'],
 getStringTypeA:['0x100c703f','3a3fa19276bfbefbb1d4c78a869673bf26311b6f1e1fb6f99d43f29acf2065b0'],
 getStringTypeAStat:['0x100c6e87','b8590c434cc67ca317fff377165cccede734662c2b781825c69ca4a7c457ae85'],

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
const images={environmentVector:['102f644c',4,'00000000'],environmentInitialized:['102f8570',4,'00000000'],argumentCount:['102f6440',4,'00000000'],argumentVector:['102f6444',4,'00000000'],moduleNameBuffer:['102f6ae8',261,'000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'],programName:['102f645c',4,'00000000'],multibyteTypeTable:['10141080',257,'0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001010101010101010101010101010101010101010101010101010000000000000202020202020202020202020202020202020202020202020202000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'],multibyteCaseTable:['10141188',256,'00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006162636465666768696a6b6c6d6e6f707172737475767778797a0000000000004142434445464748494a4b4c4d4e4f505152535455565758595a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'],multibytePublishedFields:['102f6914',24,'000000000000000000000000000000000000000000000000'],setMultibyteScopeTable:['100f8be0',28,'feffffff00000000ccffffff00000000feffffff000000001b180b10'],localeMapMode:['102f6950',4,'00000000'],stringTypeMode:['102f6f74',4,'00000000'],emptyWideString:['100e5e64',2,'0000'],multibyteCodePageTable:['10141290',240,'a4030000608279822100000000000000a6df000000000000a1a5000000000000819fe0fc00000000407e80fc00000000a8030000c1a3daa320000000000000000000000000000000000000000000000081fe00000000000040fe000000000000b5030000c1a3daa320000000000000000000000000000000000000000000000081fe00000000000041fe000000000000b6030000cfa2e4a21a00e5a2e8a25b000000000000000000000000000000000081fe000000000000407ea1fe000000005105000051da5eda20005fda6ada32000000000000000000000000000000000081d3d8dee0f90000317e81fe00000000'],systemCodePageSelected:['102f6910',4,'00000000'],initialMultibyte:['10140e60',544,'00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000101010101010101010101010101010101010101010101010101000000000000020202020202020202020202020202020202020202020202020200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006162636465666768696a6b6c6d6e6f707172737475767778797a0000000000004142434445464748494a4b4c4d4e4f505152535455565758595a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'],multibytePointer:['10141288',4,'600e1410'],threadLocaleMask:['10141384',4,'feffffff'],multibyteInitialized:['102f8588',4,'00000000'],ioHandleCount:['102f7068',4,'00000000'],ioBlocks:['102f70c0',256,'00'.repeat(256)],memcpySseFlag:['102f854c',4,'00000000'],memcpyForwardDwords:['100a7b08',32,'6b7b0a10587b0a10507b0a10487b0a10407b0a10387b0a10307b0a10287b0a10'],memcpyForwardTail:['100a7b74',16,'847b0a108c7b0a10987b0a10ac7b0a10'],environmentMode:['102f6bf0',4,'00000000'],commandLinePointer:['102f8564',4,'00000000'],environmentPointer:['102f6490',4,'00000000'],rtcInitializers:['100f7cec',256,'00'.repeat(256)],exceptionActionsAnchor:['10140b50',4,'050000c0'],multibyteRefcount:['10140e60',4,'00000000'],initialLocale:['10141390',216,'0100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000088131410000000000000000000000000881314100000000000000000000000008813141000000000000000000000000088131410000000000000000000000000881314100000000000000000000000000100000001000000000000000000000000000000a01b14100000000000000000382e0f10c0320f1040340f10e01a1410'],initialTimeLocale:['10141ae0',184,'68360f1064360f1060360f105c360f1058360f1054360f1050360f1048360f1040360f1038360f102c360f1020360f1018360f100c360f1008360f1004360f1000360f10fc350f10f8350f10f4350f10f0350f10ec350f10e8350f10e4350f10e0350f10dc350f10d4350f10c8350f10c0350f10b8350f10f8350f10b0350f10a8350f10a0350f1094350f108c350f1080350f1074350f1070350f106c350f1060350f104c350f1040350f10090400000100000000000000'],localeCSentinel:['10141388',4,'43000000'],localePointer:['10141468',4,'90131410'],allocationRetryDelay:['102f64b4',4,'00000000'],newMode:['102f6ad0',4,'00000000'],osFields:['102f642c',20,'00'.repeat(20)],heapHandle:['102f6ac8',4,'00000000'],heapSelection:['102f8530',4,'00000000'],
 tlsGetterIndex:['10140b48',4,'ffffffff'],threadDataIndex:['10140b44',4,'ffffffff'],procedureSlots:['102f64a4',16,'00'.repeat(16)],
 pointer6ac4:['102f6ac4',4,'00000000'],pointer6ac0:['102f6ac0',4,'00000000'],pointer64a0:['102f64a0',4,'00000000'],
 pointer690c:['102f690c',4,'00000000'],pointer6abc:['102f6abc',4,'00000000'],signalPointers:['102f6aa8',16,'00'.repeat(16)],
 ehHook:['102f64b8',4,'00000000'],exitPointer:['10140a60',4,'b7a70a10'],lockTable:['101414b8',288,"000000000100000000000000010000000000000000000000000000000100000000000000010000000000000000000000000000000100000000000000010000000000000001000000000000000000000000000000010000000000000000000000000000000100000000000000010000000000000001000000000000000000000000000000010000000000000001000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"],staticSections:['102f6958',336,'00'.repeat(336)]} as const;
type Image=keyof typeof images;
type SharedNlsKind='GetModuleFileNameA'|'GetACP'|'IsValidCodePage'|'GetCPInfo'|'GetStringTypeW'|'MultiByteToWideChar'|'LCMapStringW'|'WideCharToMultiByte';
type MappingStage='enter'|'probe'|'convertQuery'|'inputAllocate'|'convertFill'|'mapQuery'|'outputAllocate'|'mapFill'|'narrow'|'return';
type MappingState={stage:MappingStage;flags:number;localeId:number;codePage:number;input:NativeHeapObjectViews;output:NativeHeapObjectViews;wideInput:NativeHeapObjectViews|null;wideOutput:NativeHeapObjectViews|null;count:number;result:number|null;locale:NativeHeapObjectViews};
type LocalStorage={backing:NativeMemoryBacking;bytes:Uint8Array;masks:Uint8Array;backingBytes:Uint8Array;backingMasks:Uint8Array;view:DataView};
type CaseState={info:NativeHeapObjectViews;input:NativeHeapObjectViews;types:NativeHeapObjectViews;lower:NativeHeapObjectViews;upper:NativeHeapObjectViews;probe:NativeHeapObjectViews;wideCount:number|null;stack:NativeX86ThreadStack|null;wideTemporary:NativeHeapObjectViews|null};
function physical(size:number){return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(size),knownMask:new Uint8Array(size),freed:false});}
export interface NativeSharedDllResourceQuery {readonly slot:NativeHeapObjectViews;readonly procedure:object;readonly query:(input:NativeBytePointer,path:string,site:'1004c330'|'1004c3a0')=>Readonly<{result:number;pointer:NativeBytePointer;length:number}>;}
export class NativeSharedCrtOwner {
 readonly identity=Object.freeze({});
 #images=new Map<Image,{fields:NativeHeapObjectViews;bytes:Uint8Array;masks:Uint8Array}>();
 #ptd:NativeHeapObjectViews|null=null;
 #localeUpdate:NativeHeapObjectViews|null=null;
 #codePage:number|null=null;
 #multibyteAllocation:NativeHeapObjectViews|null=null;
 #nlsPending:{call:NativeArgvNlsCallGrant;kind:SharedNlsKind;scalar:number;fields:NativeHeapObjectViews|null;input:NativeHeapObjectViews|null;count:number;flags:number;procedure:object|null}|null=null;
 #cpInfo:NativeHeapObjectViews|null=null;
 #locals=new WeakMap<NativeHeapObjectViews,LocalStorage>();
 #caseState:CaseState|null=null;
 #argvCall:object|null=null;
 #argvStack:NativeX86ThreadStack|null=null;
 #argvStage:'enter'|'multibyte'|'module'|'parse'|'allocate'|'fill'|'return'|'environment'='enter';
 #argvInput:NativeBytePointer|null=null;
 #argvAllocation:NativeHeapObjectViews|null=null;
 #argvReturned:number|null=null;
 #setMultibyteCall:object|null=null;
 #setMultibyteStack:NativeX86ThreadStack|null=null;
 #setMultibyteStage:'enter'|'ptd'|'multibyte'|'codepage'|'allocate'|'configuration'|'installation'|'return'='enter';
 #setMultibyteOld:NativeHeapObjectViews|null=null;
 #publishedMultibyte:NativeHeapObjectViews|null=null;
 #counterPending:{call:object;role:'oldPtd'|'candidatePtd'|'oldGlobal'|'candidateGlobal';fields:NativeHeapObjectViews;record:NativeHeapObjectViews;delta:1|-1;before:number}|null=null;
 #configurationCall:object|null=null;
 #configurationStack:NativeX86ThreadStack|null=null;
 #configurationFields:NativeHeapObjectViews|null=null;
 #configurationStage:'enter'|'body'|'case'|'return'='enter';
 #configurationInput=0;
 #caseCall:object|null=null;
 #caseFields:NativeHeapObjectViews|null=null;
 #caseStage:'enter'|'classification'|'lower'|'upper'|'tables'|'return'='enter';
 #mappingState:MappingState|null=null;
 #stackCall:object|null=null;
 #stackStage:'enter'|'allocate'='enter';
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
 #environmentVector:NativeHeapObjectViews|null=null;
 #initializerImages:Readonly<Record<string,NativeHeapObjectViews>>;
 #initializerActive=false;
 #initializerImports:Readonly<NativeSharedInitializerImports>;
 readonly #initializerCodePointers=new Map<number,object>();
 readonly #initializerEncodedPointers=new WeakSet<object>();
 readonly #initializerDecodedPointers=new WeakMap<object,{original:object;fields:NativeHeapObjectViews;offset:number}|{original:object;address:number}>();
 readonly #initializerAllocationPointers=new Map<NativeHeapObjectViews,Map<number,object>>();
 #exitLockHeld=false;
 #memoryHeapSectionHeld=false;
 readonly #poolRegions=new Set<NativeHeapObjectViews>();
 readonly #variablePoolSlots=new Map<NativeHeapObjectViews,Readonly<{region:NativeHeapObjectViews;offset:number;capacity:number}>>();
 readonly #poolSlots=new Map<NativeHeapObjectViews,Readonly<{region:NativeHeapObjectViews;offset:number;capacity:12|16|24|112|1792}>>();
 readonly #initializerAllocations=new Set<NativeHeapObjectViews>();
 #environmentStrings:NativeHeapObjectViews[]=[];
 #setEnvpReturned:number|null=null;
 #version:NativeHeapObjectViews|null=null;
 #versionAllocation:NativeMemoryBacking|null=null;
 #heap:NativeWin32HeapCapability|null=null;
 #heapReturned:number|null=null;
 #attachReturned:number|null=null;
 #boundary:string|null=null;
 #active=false;
 #dllCall:object|null=null;
 #dllImages:Readonly<{guard:NativeHeapObjectViews;object:NativeHeapObjectViews;moduleName:NativeHeapObjectViews}>|null=null;
 #dllBoundary:string|null=null;
 #dllReturned:number|null=null;
 #dllInitializerAttempted=false;
 #dllVersionAttempted=false;
 #dllFilenameAttempted=false;
 #dllModuleAttempted=false;
 #dllResourceAttempted=false;
 #dllResourceSizeAttempted=false;
 #dllMemoryAdminAttempted=false;
 #dllMallocAttempted=false;
 #dllInfoAttempted=false;
 #dllLanguageAttempted=false;
 #dllLanguageMemoryAttempted=false;
 #dllLanguageMallocAttempted=false;
 #dllLanguageInfoAttempted=false;
 #dllLanguageFormatAttempted=false;
 #dllLanguageOutputAttempted=false;
 #dllTranslationAttempted=false;
 #dllTranslatedOutputAttempted=false;
 #dllFileVersionAttempted=false;
 #dllResourceQuery:Readonly<NativeSharedDllResourceQuery>|null=null;
 #dllFormatImages:Readonly<Record<string,NativeHeapObjectViews>>={};
 #dllLanguageFormatImages:Readonly<{output:NativeHeapObjectViews;translation:NativeHeapObjectViews}>|null=null;
 #dllResourceInfo:Readonly<{slot:NativeHeapObjectViews;procedure:object;initialize:(filename:string,handle:number,size:number,output:NativeBytePointer,site:'1004c504'|'1004c301')=>number}>|null=null;
 #dllMallocCall:object|null=null;
 #dllResourceSize:Readonly<{slot:NativeHeapObjectViews;procedure:object;outcome:(filename:string,site:'1004c4d5'|'1004c2d8')=>Readonly<{size:number;handle:number}>}>|null=null;
 #dllModuleHooks:Readonly<NativeSharedDllModuleHooks>|null=null;
 #dllModuleOwner:NativeSharedVersionModule|null=null;
 #dllLstrcpy:Readonly<{slot:NativeHeapObjectViews;procedure:object}>|null=null;
 #mtReturned:number|null=null;
 #locksReturned:number|null=null;
 #sections:NativeHeapObjectViews[]=[];
 #messageSectionHeld=false;
 readonly #crtSections=new Map<number,NativeHeapObjectViews>();
 #crtDynamicSection:number|null=null;
 #descriptorSectionCache:object|null=null;
 #descriptorSectionProcedure:object|null=null;
 readonly #descriptorSectionViews=new Map<number,NativeHeapObjectViews>();
  readonly #descriptorHeldSections=new Set<number>();
  #fileCloseCall:Readonly<{grant:object;handle:object}>|null=null;
  #fileOpenCall:Readonly<{grant:object;input:NativeWin32CreateFileArguments}>|null=null;
 readonly #crtHeldSections=new Set<NativeHeapObjectViews>();
 readonly #crtSectionViews=new WeakMap<NativeHeapObjectViews,NativeHeapObjectViews>();
 #sectionFallback:Readonly<{address:string;owner:object;invoke(fields:NativeHeapObjectViews):NativeValue<boolean>}>;
 #pointersReturned=false;
 #code:Readonly<Record<'terminate'|'exit',Readonly<{owner:object;address:string;bodyInstructionBytesSha256:string}>>>;
 #tlsFallback:NativeCrtLocalAllocProcedure & {readonly address:string;readonly owner:object};
 #threadDestructor:NativeCrtThreadDestructor;
 #trace:string[]=[];
 private constructor(private readonly platform:NativeRuntimePlatform,proof:object){
  if(proof!==token)throw new Error('Canonical SharedBase CRT owner required');
  if(source.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214')throw new Error('Original SharedBase module required');
  if(source.methods.dllMainCrtStartup.bodyInstructionBytesSha256!=='50213d0253c2f6d47c546dcf19cbd7e0840adaa6b272863b2da2e75b2992a4a1')throw new Error('Original SharedBase CRT caller source required');
  for(const [label,[body,hash]] of Object.entries(methods)){
   const receipt=source.methods[label as keyof typeof methods];
   if(receipt.bodyVA!==body||receipt.bodyInstructionBytesSha256!==hash)throw new Error('Original SharedBase CRT source differs: '+label);
  }
  const initializerPins={cinit:'41b51da16ad44681b0fb71a91e74220b1b07a950bcbd5eb4cb42c3ee734ca9c9',isNonwritableInCurrentImage:'462da4b095774681355bd3587154086dc78eeec9382a0a02431e62ee6d4d94ea',validateImageHeader:'9a53b7881f3d303824b2fcb04c9a07c71b06cbe26fc450a72ae33fdd691fec72',findImageSection:'f175fc56ebd0e0eff6cda2a6bcc51b203877c16815a774a2028210e06d400fcd',floatingPointHook_0:'1848ebfbb128800da687bc581cbdb51239a4aab6adebf1b4c388adfd45b56f83',installFloatConversions:'cc47e8cff37040f521877a82e784eb77338abb386334619659e3833fe2aca964',initializeFloatConversions:'25fa0404b9d6b9701e34ab3110a8260e3ae77229c6e4690ae38a6f4dfb31b6ac'};
  if(initializerSource.sharedBaseSha256!==source.sharedBaseSha256||initializerSource.imageHeader.raw!==sharedInitializerHeader.raw||initializerSource.imageHeader.sha256!=='c7ce61ba6cf382ccf9417ec15d15b55e36f9766a73cc3a8dda440879f735d6d3')throw new Error('Original SharedBase initializer image header required');
  for(const [label,hash] of Object.entries(initializerPins))if((initializerSource.methods as Record<string,{bodyInstructionBytesSha256:string}>)[label]?.bodyInstructionBytesSha256!==hash)throw new Error('Original SharedBase initializer source differs: '+label);
  const initializerImages:Record<string,NativeHeapObjectViews>={};
  for(const [address,raw] of [['10000000',sharedInitializerHeader.raw],['100ed568','fe780a10'],['10141480','9fdf0c10'.repeat(10)],['102f6424','00000000']]){
   const fields=this.#retainLocal(raw!.length/2);for(let offset=0;offset<fields.bytes.length;offset++)fields.writeUnsigned(offset,parseInt(raw!.slice(offset*2,offset*2+2),16),1);initializerImages[address!]=fields;
  }
  const crtHeapFreeProcedure=Object.freeze({owner:this.identity,name:'CRT.HeapFree'});
  const poolVirtualAllocProcedure=Object.freeze({owner:this.identity,name:'VirtualAlloc'}),crtHeapAllocProcedure=Object.freeze({owner:this.identity,name:'CRT.HeapAlloc'});
  const spyFindWindowProcedure=Object.freeze({owner:this.identity,name:'SpyAdmin.FindWindowA'});
  const spieCreateFileProcedure=Object.freeze({owner:this.identity,name:'CreateFileA'});
  const spieCloseHandleProcedure=Object.freeze({owner:this.identity,name:'CloseHandle'});
  const spieGetLastErrorProcedure=Object.freeze({owner:this.identity,name:'GetLastError'}),spieSetLastErrorProcedure=Object.freeze({owner:this.identity,name:'SetLastError'}),spieGetFileTypeProcedure=Object.freeze({owner:this.identity,name:'GetFileType'});
  const getModuleHandleA=Object.freeze({owner:this.identity,name:'GetModuleHandleA'}),getProcAddress=Object.freeze({owner:this.identity,name:'GetProcAddress'}),tlsGetValue=Object.freeze({owner:this.identity,name:'TlsGetValue'}),heapSizeProcedure=Object.freeze({owner:this.identity,name:'HeapSize'}),initializeSectionProcedure=Object.freeze({owner:this.identity,name:'InitializeCriticalSection'}),memorySectionInitializeProcedure=Object.freeze({owner:this.identity,name:'MemoryHeap.InitializeCriticalSectionAndSpinCount'}),memorySectionEnterProcedure=Object.freeze({owner:this.identity,name:'MemoryHeap.EnterCriticalSection'}),memorySectionLeaveProcedure=Object.freeze({owner:this.identity,name:'MemoryHeap.LeaveCriticalSection'});
  this.#initializerImports=Object.freeze({spieCreateFileProcedure,spieGetLastErrorProcedure,spieSetLastErrorProcedure,spieGetFileTypeProcedure,spieCloseHandleProcedure,
   closeFileHandle:(handle:object):number=>{
    if(!this.#active||!this.#initializerActive||!this.#dllCall||this.#dllBoundary!=='Original SharedBase SpieAdmin fclose pending at 1004b208'||this.#fileCloseCall||!this.#descriptorHeldSections.has(180)||!this.#crtSections.get(19)||!this.#crtHeldSections.has(this.#crtSections.get(19)!)||this.#initializerImports.descriptorBlock().pointer(168).get()!==handle||(this.#ioBlock!.readUnsigned(172,1)&1)!==1||this.#ioBlock!.readUnsigned(176)!==1||!NativeRuntimePlatform.ownsFileHandle(this.platform,handle))throw new Error('Actual locked original file-close HANDLE required');
    const grant=Object.freeze({});this.#fileCloseCall=Object.freeze({grant,handle});try{return this.#call('100bf665.CloseHandle',()=>NativeRuntimePlatform.closeSharedFileForPlatform(this.platform,grant));}finally{this.#fileCloseCall=null;}
   },
   createFile:(filename:NativeBytePointer,input:Omit<NativeWin32CreateFileArguments,'filename'>):number|NativeWin32FileHandle=>{
    if(!this.#active||!this.#initializerActive||!this.#dllCall||this.#dllBoundary!=='Original SharedBase CreateFileA return pending at 100d1372'||this.#fileOpenCall||filename.fields!==this.#dllFormatImages['100e8088']||filename.offset!==0||input.access!==0x80000000||input.share!==3||input.disposition!==3||input.attributes!==0x80||input.template!==0||input.security.length!==12||input.security.descriptor!==0||input.security.inherit!==1||!this.#descriptorHeldSections.has(180)||!this.#crtSections.get(19)||!this.#crtHeldSections.has(this.#crtSections.get(19)!)||this.#initializerImports.descriptorBlock().readUnsigned(168)!==0xffffffff||this.#ioBlock?.readUnsigned(172,1)!==1||this.#ioBlock.readUnsigned(176)!==1)throw new Error('Actual locked original CreateFileA arguments required');
    this.#requireLocal(filename.fields);let text='',terminated=false;for(let i=0;i<filename.fields.bytes.length;i++){const byte=filename.fields.readUnsigned(i,1);if(byte===0){terminated=true;break;}text+=String.fromCharCode(byte);}if(!terminated)throw new Error('Actual owned filename terminator required');
    const grant=Object.freeze({});this.#fileOpenCall=Object.freeze({grant,input:Object.freeze({...input,security:Object.freeze({...input.security}),filename:text})});
    try{return this.#call('100d1372.CreateFileA',()=>NativeRuntimePlatform.createSharedFileForPlatform(this.platform,grant)).handle;}finally{this.#fileOpenCall=null;}
   },
   getFileType:(handle:object):number=>{if(!this.#active||!this.#initializerActive||!this.#dllCall||this.#dllBoundary!=='Original SharedBase CreateFileA return pending at 100d1372')throw new Error('Actual original opened-file type call required');return this.#call('100d13ec.GetFileType',()=>NativeRuntimePlatform.fileTypeForPlatform(this.platform,handle));},
   getLastError:():number=>{if(!this.#active||!this.#initializerActive||!this.#dllCall)throw new Error('Actual original CRT last-error call required');return this.#call('SharedBase.GetLastError',()=>NativeRuntimePlatform.prototype.getWin32LastError.call(this.platform));},
   setLastError:(value:number):void=>{if(!this.#active||!this.#initializerActive||!this.#dllCall)throw new Error('Actual original CRT last-error restore required');this.#call('SharedBase.SetLastError',()=>NativeRuntimePlatform.prototype.setWin32LastError.call(this.platform,value));},
   spyFindWindowProcedure,spyFindWindow:(className:number,title:string):object|null=>{if(!this.#active||!this.#initializerActive||className!==0||title!=='[zSpy]')throw new Error('Actual SpyAdmin window query required');return this.#call('1004b83d.FindWindowA',()=>NativeRuntimePlatform.diagnosticWindowForPlatform(this.platform,null,title));},crtHeapFreeProcedure,crtHeapAllocProcedure,poolVirtualAllocProcedure,getModuleHandleA,getProcAddress,tlsGetValue,heapSizeProcedure,initializeSectionProcedure,memorySectionInitializeProcedure,memorySectionEnterProcedure,memorySectionLeaveProcedure,
   memorySectionInitialize:(fields:NativeHeapObjectViews,offset:number,spin:number):number=>{if(!this.#active||!this.#initializerActive||fields!==this.#initializerImages['10189a18']||offset!==0||spin!==1000)throw new Error('Actual original MemoryAdmin heap section arguments required');this.#requireLocal(fields);return this.#call('1003d449.InitializeCriticalSectionAndSpinCount',()=>this.platform.initializePhysicalMemoryHeapCriticalSection(fields,this.identity,1000))?1:0;},
   memorySectionLock:(fields:NativeHeapObjectViews,offset:number,enter:boolean):void=>{if(!this.#active||!this.#initializerActive||fields!==this.#initializerImages['10189a18']||offset!==0||enter===this.#memoryHeapSectionHeld)throw new Error('Actual original MemoryAdmin heap section transition required');this.#requireLocal(fields);this.#call(enter?'1003d463.EnterCriticalSection':'1003d48a.LeaveCriticalSection',()=>enter?this.platform.enterPhysicalCriticalSection(fields,this.identity):this.platform.leavePhysicalCriticalSection(fields,this.identity));this.#memoryHeapSectionHeld=enter;},
   versionLogTls:()=>{
    if(!this.#active||!this.#initializerActive||!this.#dllCall||this.#messageSectionHeld||!['Original SharedBase DLL version log pending at 100a15ed','Original SharedBase DLL version formatting pending at 10049871'].includes(this.#dllBoundary??''))throw new Error('Actual pending version logger TLS read required');
    const owner=NativeSharedStaticTls.forPlatform(this.platform);if(!owner.known)throw new Error(owner.reason);
    const loaded=owner.value.loadSharedBase();if(!loaded.known)throw new Error(loaded.reason);
    const operands=owner.value.instructionOperands();if(!operands.known)throw new Error(operands.reason);
    for(const fields of Object.values(operands.value)){if(!this.#locals.has(fields))this.#locals.set(fields,{backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:fields.backing.bytes,backingMasks:fields.backing.knownMask,view:fields.view});this.#requireLocal(fields);}
    return operands.value;
   },
   messageSectionLock:(fields:NativeHeapObjectViews,offset:number,enter:boolean):void=>{if(!this.#active||!this.#initializerActive||!this.#dllCall||(!['Original SharedBase MessageAdmin initialization log pending at 1004980f','Original SharedBase version MessageAdmin log pending at 10049894'].includes(this.#dllBoundary??'')&&(enter||this.#dllBoundary!=='Original SharedBase SpyAdmin log callback pending at 100494db'))||fields!==this.#dllFormatImages['10197d6c']||offset!==4||enter===this.#messageSectionHeld)throw new Error('Actual original MessageAdmin section transition required');this.#requireLocal(fields);const section=new NativeHeapObjectViews(fields.backing,fields.bytes.byteOffset-fields.backing.bytes.byteOffset+4,24);this.#call(enter?'10049528.EnterCriticalSection':'1004956b.LeaveCriticalSection',()=>enter?this.platform.enterPhysicalCriticalSection(section,this.identity):this.platform.leavePhysicalCriticalSection(section,this.identity));this.#messageSectionHeld=enter;},
   initializeSection:(fields:NativeHeapObjectViews,offset:number):void=>{const message=fields===this.#dllFormatImages['10197d6c']&&offset===4,error=fields===this.#dllFormatImages['10142a58']&&offset===8,spy=fields===this.#dllFormatImages['101ab11c']&&offset===0,spie=fields===this.#dllFormatImages['10197dc0']&&offset===0;if(!this.#active||!this.#initializerActive||!message&&!error&&!spy&&!spie&&(fields!==this.#initializerImages['10197da0']||offset!==0))throw new Error('Actual original static critical-section storage required');this.#requireLocal(fields);const section=message||error||spy||spie?new NativeHeapObjectViews(fields.backing,fields.bytes.byteOffset-fields.backing.bytes.byteOffset+offset,24):fields;this.#call(spie?'1004afa8.InitializeCriticalSection':spy?'1004b498.InitializeCriticalSection':error?'10021978.InitializeCriticalSection':message?'10049775.InitializeCriticalSection':'100e1455.InitializeCriticalSection',()=>this.platform.initializePhysicalCriticalSectionWithoutSpin(section,this.identity));},
   calloc:(count:number,size:number,errorOutput:number,caller:string):NativeHeapObjectViews|null=>{
    const valid=caller==='100a726a'?count===32:(caller==='100bef27'||caller==='100bef40')&&count===this.#initializerImages['102f8500']!.readUnsigned(0)&&count>=20&&(caller!=='100bef40'||count===20);
    if(!valid||size!==4||errorOutput!==0)throw new Error('Actual original initializer calloc arguments and caller required');
    const fields=this.#callocCrt(count,size,false);if(fields){this.#initializerAllocations.add(fields);this.#locals.set(fields,{backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:fields.backing.bytes,backingMasks:fields.backing.knownMask,view:fields.view});}return fields;
   },
   descriptorBlock:():NativeHeapObjectViews=>{
    if(!this.#active||!this.#initializerActive||!this.#ioBlock||NativeHeapObjectViews.prototype.pointer.call(this.imageStorage('ioBlocks'),0).get()!==this.#ioBlock)throw new Error('Actual initialized SharedBase descriptor block required');
    const proof=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,{fields:this.#ioBlock,offset:0},1792);if(!proof.known)throw new Error(proof.reason);return this.#ioBlock;
   },
   descriptorHandle:(fields:NativeHeapObjectViews,offset:number):number|object=>{
    if(this.#initializerImports.descriptorBlock()!==fields||![0,56,112].includes(offset))throw new Error('Actual source standard-descriptor HANDLE field required');
    const bits=NativeHeapObjectViews.prototype.maskedWord.call(fields,offset);if(bits.knownMask===0xffffffff){if(![0,0xffffffff,0xfffffffe].includes(bits.value))throw new Error('Numerical HANDLE lacks owned platform identity');return bits.value;}
    const handle=NativeHeapObjectViews.prototype.pointer.call(fields,offset).get() as object|null,proof=handle?NativeRuntimePlatform.standardIoCapabilityForPlatform(this.platform,handle):null;if(!proof?.known||proof.value!=='handle')throw new Error('Canonical same-platform descriptor HANDLE required');return handle!;
   },
   encodeAllocation:(procedure:object,fields:NativeHeapObjectViews,offset:number):object|null=>{
    if(!this.#initializerAllocations.has(fields)||!this.#heap)throw new Error('Actual initializer allocation pointer required');
    const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap,this.identity,{fields,offset},0);if(!span.known)throw new Error(span.reason);
    const proof=NativeRuntimePlatform.canonicalPointerCodecForPlatform(this.platform,procedure,'EncodePointer');if(!proof.known)throw new Error(proof.reason);
    let pointers=this.#initializerAllocationPointers.get(fields);if(!pointers){pointers=new Map();this.#initializerAllocationPointers.set(fields,pointers);}let original=pointers.get(offset);if(!original){original=offset===0?fields:Object.freeze({fields,offset});pointers.set(offset,original);}
    const encoded=this.#call('100ae2dd.EncodePointer',()=>proof.value.invoke(original!));if(encoded){this.#initializerEncodedPointers.add(encoded);this.#initializerDecodedPointers.set(encoded,{original,fields,offset});}return encoded;
   },
   decodePointer:(procedure:object,encoded:object):Readonly<{fields:NativeHeapObjectViews;offset:number}>|number=>{
    const proof=NativeRuntimePlatform.canonicalPointerCodecForPlatform(this.platform,procedure,'DecodePointer');if(!proof.known)throw new Error(proof.reason);
    const record=this.#initializerDecodedPointers.get(encoded);if(!record||!this.#initializerEncodedPointers.has(encoded))throw new Error('Actual retained initializer encoded pointer required');
    const decoded=this.#call('100ae354.DecodePointer',()=>proof.value.invoke(encoded));if(decoded!==record.original)throw new Error('Actual initializer pointer decode identity required');
    if('address' in record)return record.address;
    const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,{fields:record.fields,offset:record.offset},0);if(!span.known)throw new Error(span.reason);return Object.freeze({fields:record.fields,offset:record.offset});
   },
   crtHeapFree:(heap:object,flags:number,fields:NativeHeapObjectViews,offset:number):number=>{
    if(!this.#active||!this.#initializerActive||heap!==this.#heap||flags!==0||offset!==0||!this.#initializerAllocations.has(fields))throw new Error('Actual initializer CRT HeapFree arguments required');
    this.#requireLocal(fields);const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,{fields,offset},fields.bytes.length);if(!span.known)throw new Error(span.reason);
    return this.#call('100aaa0c.HeapFree',()=>this.platform.win32HeapFree(this.#heap!,0,fields.backing))?1:0;
   },
   crtHeapAlloc:(heap:object,flags:number,size:number):NativeHeapObjectViews|null=>{
    if(!this.#active||!this.#initializerActive||heap!==this.#heap||flags!==0||!Number.isInteger(size)||size<1||size>0xffffffe0)throw new Error('Actual pool descriptor CRT HeapAlloc arguments required');
    const backing=this.#call('100aab6e.HeapAlloc',()=>NativeRuntimePlatform.heapAllocForSharedInitializer(this.platform,this.#heap!,this.identity,size));if(!backing)return null;
    const fields=new NativeHeapObjectViews(backing);this.#locals.set(fields,{backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:backing.bytes,backingMasks:backing.knownMask,view:fields.view});this.#initializerAllocations.add(fields);return fields;
   },
   poolVirtualAlloc:(address:number,size:number,type:number,protect:number):NativeHeapObjectViews|null=>{
    if(!this.#active||!this.#initializerActive||address!==0||![0x700000,0x400000,0xc2000,0x102000,0xc0000,0x70000].includes(size)||type!==0x103000||protect!==4)throw new Error('Original SharedBase pool VirtualAlloc arguments required');
    const region=this.#call(size===0x700000?'10048654.VirtualAlloc':size===0x400000?'1003d237.VirtualAlloc':size===0xc2000?'10047ed4.VirtualAlloc':size===0x102000?'10047f74.VirtualAlloc':size===0xc0000?'100480b4.VirtualAlloc':'10049054.VirtualAlloc',()=>NativeRuntimePlatform.virtualAllocForSharedInitializer(this.platform,size));if(!region)return null;
    const proof=NativeRuntimePlatform.canonicalVirtualRegionForPlatform(this.platform,region,size);if(!proof.known)throw new Error(proof.reason);
    const fields=new NativeHeapObjectViews(region,0,size);this.#locals.set(fields,{backing:region,bytes:fields.bytes,masks:fields.knownMask,backingBytes:region.bytes,backingMasks:region.knownMask,view:fields.view});this.#poolRegions.add(fields);return fields;
   },
   proveDisjointInitializerCopy:(destination:NativeBytePointer,input:NativeBytePointer,bytes:number):void=>{
    if(!this.#active||!this.#initializerActive||!Number.isInteger(bytes)||bytes<0||bytes>0xffffffff||!this.#poolSlots.has(destination.fields)||(!Object.values(this.#initializerImages).includes(input.fields)&&!this.#initializerAllocations.has(input.fields)))throw new Error('Actual initializer image/heap-to-pool-slot copy relation required');
    this.#requireLocal(destination.fields);this.#requireLocal(input.fields);if(this.#initializerAllocations.has(input.fields)){const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,input,bytes);if(!span.known)throw new Error(span.reason);}
    for(const pointer of [destination,input])if(!Number.isInteger(pointer.offset)||pointer.offset<0||pointer.offset+bytes>pointer.fields.bytes.length)throw new Error('Contained original initializer copy spans required');
    if(destination.fields.backing===input.fields.backing||destination.fields.bytes.buffer===input.fields.bytes.buffer)throw new Error('Distinct original image and owned pool-slot spans required');
   },
   releasePoolSlot:(pointer:NativeBytePointer):void=>{
    if(!this.#active||!this.#initializerActive||!this.#memoryHeapSectionHeld||pointer.offset!==0)throw new Error('Actual locked original pool release required');const slot=this.#poolSlots.get(pointer.fields);if(!slot||slot.capacity!==1792)throw new Error('Actual retained language slot required');this.#requireLocal(slot.region);const index=(slot.offset-16)/slot.capacity;if(!(slot.region.readUnsigned(0x6f910+Math.floor(index/32)*4)&(1<<(index&31))))throw new Error('Original bitmap release stores required');this.#poolSlots.delete(pointer.fields);this.#locals.delete(pointer.fields);
   },
   comparePoolPointers:(left:NativeBytePointer,right:NativeBytePointer):number=>{
    if(!this.#active||!this.#initializerActive)throw new Error('Actual active initializer pool comparison required');
    const normalize=(pointer:NativeBytePointer)=>{if(!Number.isInteger(pointer.offset)||pointer.offset<0||pointer.offset>pointer.fields.bytes.length)throw new Error('Actual contained original pool pointers required');this.#requireLocal(pointer.fields);const slot=this.#poolSlots.get(pointer.fields);if(slot)return {fields:slot.region,offset:slot.offset+pointer.offset};if(!this.#poolRegions.has(pointer.fields))throw new Error('Actual original pool region or live slot required');return pointer;};
    const a=normalize(left),b=normalize(right),order=this.#call('1003c67e.poolRegionOrder',()=>this.platform.compareRegions(a.fields.backing as NativeMemoryRegion,b.fields.backing as NativeMemoryRegion));return order||Math.sign(a.offset-b.offset);
   },
   validatePoolRegion:(region:NativeHeapObjectViews,offset:number,capacity:12|16|24|112|1792):void=>{
    if(!this.#active||!this.#initializerActive||!this.#poolRegions.has(region)||offset!==0||![12,16,24,112,1792].includes(capacity)||region.bytes.length!==(capacity===112?0x700000:capacity===12?0xc2000:capacity===16?0x102000:capacity===24?0xc0000:0x70000))throw new Error('Actual original bitmap pool receiver required');this.#requireLocal(region);const geometry=this.#initializerImages[capacity===112?'100e7b00':capacity===12?'100e7aa0':capacity===16?'100e7aa8':capacity===24?'100e7ab8':'100e7b80']!;if(geometry.readUnsigned(0)!==capacity||geometry.readUnsigned(4)!==(capacity===112?65462:capacity===12?65534:capacity===16?65535:capacity===24?0x7f55:255))throw new Error('Live original bitmap pool geometry required');
   },
   retainVariablePoolSlot:(region:NativeHeapObjectViews,offset:number):NativeHeapObjectViews=>{
    if(!this.#active||!this.#initializerActive||!this.#memoryHeapSectionHeld||!this.#poolRegions.has(region)||region.bytes.length!==0x400000||!Number.isInteger(offset)||offset<16||(offset-16)%1024)throw new Error('Actual variable-pool allocation return required');this.#requireLocal(region);const header=offset-16,units=region.readUnsigned(header+8),capacity=units*1024-16;if(units<1||units>4096||offset+capacity>region.bytes.length||region.readUnsigned(header+12)!==1)throw new Error('Original allocated variable-pool block header required');for(const slot of this.#variablePoolSlots.values())if(slot.region===region&&slot.offset===offset)throw new Error('Fresh original variable-pool block required');const fields=new NativeHeapObjectViews(region.backing,offset,capacity);this.#locals.set(fields,{backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:fields.backing.bytes,backingMasks:fields.backing.knownMask,view:fields.view});this.#variablePoolSlots.set(fields,Object.freeze({region,offset,capacity}));return fields;
   },
   retainPoolSlot:(region:NativeHeapObjectViews,offset:number,capacity:12|16|24|112|1792):NativeHeapObjectViews=>{
    this.#initializerImports.validatePoolRegion(region,0,capacity);const count=capacity===112?65462:capacity===12?65534:capacity===16?65535:capacity===24?0x7f55:255,bitmapBase=capacity===112?0x6fdfb0:capacity===12?0xbfff8:capacity===16?0x100000:capacity===24?0xbf008:0x6f910;
    if(!Number.isInteger(offset)||offset<16||offset+capacity>16+capacity*count||(offset-16)%capacity)throw new Error('Actual source-selected bitmap pool slot required');
    const index=(offset-16)/capacity,bitmap=region.readUnsigned(bitmapBase+Math.floor(index/32)*4);if(bitmap&(1<<(index&31)))throw new Error('Original bitmap slot claim required');
    for(const slot of this.#poolSlots.values())if(slot.region===region&&slot.offset===offset)throw new Error('Fresh original pool slot return required');
    const fields=new NativeHeapObjectViews(region.backing,offset,capacity);this.#locals.set(fields,{backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:fields.backing.bytes,backingMasks:fields.backing.knownMask,view:fields.view});this.#poolSlots.set(fields,Object.freeze({region,offset,capacity}));return fields;
   },
   heapSize:(heap:object,flags:number,fields:NativeHeapObjectViews,offset:number):number=>{
    if(heap!==this.#heap||flags!==0||offset!==0||!this.#initializerAllocations.has(fields))throw new Error('Actual original initializer HeapSize arguments required');
    const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,{fields,offset},fields.bytes.length);if(!span.known)throw new Error(span.reason);return this.#call('100b1158.HeapSize',()=>this.platform.win32HeapSize(this.#heap!,0,{fields,offset}));
   },
   crtSection:(id:number):NativeHeapObjectViews|null=>{
    if(!this.#active||!this.#initializerActive||!([5,10,14].includes(id)||this.#dllCall!==null&&([1,19].includes(id)&&['Original SharedBase CRT stream acquisition pending at 100bfd6f','Original SharedBase CreateFileA return pending at 100d1372','Original SharedBase SpieAdmin fclose pending at 1004b208'].includes(this.#dllBoundary??'')||id===11&&['Original SharedBase CRT descriptor allocation pending at 100d0d8d','Original SharedBase descriptor section initialization pending at 100bbf27'].includes(this.#dllBoundary??''))))throw new Error('Actual admitted CRT section table slot required');const value=this.imageStorage('lockTable').pointer<NativeHeapObjectViews|{fields:NativeHeapObjectViews;offset:number}>(id*8).get();if(value===null){if(this.#crtSections.has(id))throw new Error('Actual retained CRT section table pointer required');if(id===5||id===19||id===11){if(this.#crtDynamicSection!==null&&this.#crtDynamicSection!==id)throw new Error('Actual single pending CRT section request required');this.#crtDynamicSection=id;}return null;}const fields=value instanceof NativeHeapObjectViews?value:value.offset===0?value.fields:null;if(!fields||this.#crtSections.get(id)!==fields)throw new Error('Actual retained CRT section table pointer required');return fields;
   },
   crtSectionLock:(fields:NativeHeapObjectViews,offset:number,enter:boolean):void=>{
    const id=Array.from(this.#crtSections).find(([,section])=>section===fields)?.[0];if(!this.#active||!this.#initializerActive||offset!==0||id===undefined||![1,5,10,11,14,19].includes(id)||this.#initializerImports.crtSection(id)!==fields||enter===this.#crtHeldSections.has(fields))throw new Error('Actual retained CRT section transition required');
    this.#call(enter?'100bb8ba.EnterCriticalSection':'100bb7af.LeaveCriticalSection',()=>enter?this.platform.enterPhysicalCriticalSection(this.#crtSectionViews.get(fields)??fields,this.identity):this.platform.leavePhysicalCriticalSection(this.#crtSectionViews.get(fields)??fields,this.identity));if(enter)this.#crtHeldSections.add(fields);else this.#crtHeldSections.delete(fields);
   },
   sectionCachePointer:():object|null=>{
    if(!this.#active||!this.#initializerActive||!this.#dllCall||!['Original SharedBase descriptor section initialization pending at 100bbf27','Original SharedBase CreateFileA return pending at 100d1372','Original SharedBase SpieAdmin fclose pending at 1004b208'].includes(this.#dllBoundary??''))throw new Error('Actual descriptor section cache continuation required');
    const value=this.imageStorage('pointer6ac0').pointer<object>(0).get();
    if(value!==this.#descriptorSectionCache)throw new Error('Actual retained descriptor initializer cache identity required');
    if(value===null)return null;
    const proof=NativeRuntimePlatform.standardIoCapabilityForPlatform(this.platform,value);
    if(value!==this.#sectionFallback&&(!proof.known||!['encoded','section'].includes(proof.value)))throw new Error('Actual same-platform descriptor initializer cache required');
    if(value===this.#sectionFallback||proof.known&&proof.value==='section')this.#descriptorSectionProcedure=value;
    return value;
   },
   decodeSectionInitializer:(procedure:object,encoded:object):object|number=>{
    if(this.#initializerImports.sectionCachePointer()!==encoded)throw new Error('Actual cached section decoder argument required');
    const proof=NativeRuntimePlatform.canonicalPointerCodecForPlatform(this.platform,procedure,'DecodePointer');if(!proof.known)throw new Error(proof.reason);
    const decoded=this.#call('100ae354.DecodePointer',()=>proof.value.invoke(encoded));
    if(decoded===this.#sectionFallback){this.#descriptorSectionProcedure=decoded;return 0x100bbf17;}
    const capability=decoded?NativeRuntimePlatform.standardIoCapabilityForPlatform(this.platform,decoded):null;
    if(!decoded||!capability?.known||capability.value!=='section')throw new Error('Actual decoded descriptor section procedure required');
    this.#descriptorSectionProcedure=decoded;return decoded;
   },
   initializeDescriptorSection:(procedure:object|null,fields:NativeHeapObjectViews,offset:number,spin:number|null):number=>{
    this.#initializerImports.sectionCachePointer();
    const block=this.#initializerImports.descriptorBlock(),record=offset-12;
    if(fields!==block||record<0||record%56!==0||record>=1792||fields.readUnsigned(record+8)!==0||(fields.readUnsigned(record+4,1)&1)!==0||this.#descriptorSectionViews.has(offset)||![10,11,19].every(id=>{const section=this.#crtSections.get(id);return section&&this.#crtHeldSections.has(section);}))throw new Error('Actual locked uninitialized descriptor section storage required');
    const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,{fields,offset},24);if(!span.known)throw new Error(span.reason);this.#requireLocal(fields);
    const section=new NativeHeapObjectViews(fields.backing,fields.bytes.byteOffset-fields.backing.bytes.byteOffset+offset,24);let initialized:boolean;
    if(procedure===null){if(spin!==null||this.#descriptorSectionProcedure!==this.#sectionFallback)throw new Error('Actual original descriptor fallback initializer required');this.#call('100bbf1b.InitializeCriticalSection',()=>this.platform.initializePhysicalCriticalSectionWithoutSpin(section,this.identity));initialized=true;}
    else {const proof=NativeRuntimePlatform.standardIoCapabilityForPlatform(this.platform,procedure);if(spin!==4000||procedure!==this.#descriptorSectionProcedure||!proof.known||proof.value!=='section')throw new Error('Actual decoded descriptor spin initializer required');initialized=this.#call('100bbfa6.InitializeCriticalSectionAndSpinCount',()=> (procedure as {invoke:(fields:NativeHeapObjectViews,owner:object,spin:4000)=>NativeValue<boolean>}).invoke(section,this.identity,4000));}
    if(initialized){this.#descriptorSectionViews.set(offset,section);this.#sections.push(section);}return initialized?1:0;
   },
   descriptorSectionLock:(fields:NativeHeapObjectViews,offset:number,enter:boolean):void=>{
    this.#initializerImports.sectionCachePointer();const section=this.#descriptorSectionViews.get(offset),record=offset-12;
    if(fields!==this.#initializerImports.descriptorBlock()||!section||record<0||record%56!==0||fields.readUnsigned(record+8)!==1||enter===this.#descriptorHeldSections.has(offset))throw new Error('Actual initialized descriptor section transition required');this.#requireLocal(fields);
    this.#call(enter?'100d0e42.EnterCriticalSection':'100d0e4f.LeaveCriticalSection',()=>enter?this.platform.enterPhysicalCriticalSection(section,this.identity):this.platform.leavePhysicalCriticalSection(section,this.identity));if(enter)this.#descriptorHeldSections.add(offset);else this.#descriptorHeldSections.delete(offset);
   },
   initializeCrtSection:(fields:NativeHeapObjectViews,offset:number,spin:number):number=>{
    const id=this.#crtDynamicSection,lock=this.#crtSections.get(10);if(!this.#active||!this.#initializerActive||offset!==0||spin!==4000||fields.bytes.length!==(this.imageStorage('heapSelection').readUnsigned(0)===1?24:32)||!this.#initializerAllocations.has(fields)||!lock||!this.#crtHeldSections.has(lock)||id===null||![5,11,19].includes(id)||this.#crtSections.has(id))throw new Error('Actual lock-ten protected CRT section allocation required');
    const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,{fields,offset:0},24);if(!span.known)throw new Error(span.reason);this.#requireLocal(fields);const section=fields.bytes.length===24?fields:new NativeHeapObjectViews(fields.backing,fields.bytes.byteOffset-fields.backing.bytes.byteOffset,24);const initialized=this.#initializeSection(section);if(initialized){this.#crtSectionViews.set(fields,section);this.#crtSections.set(id!,fields);this.#crtDynamicSection=null;this.#sections.push(section);}return initialized?1:0;
   },
   exitLock:(id:number,enter:boolean):void=>{
    if(id!==8||!this.#active||!this.#initializerActive||enter===this.#exitLockHeld)throw new Error('Actual exit-table lock8 transition required');
    const section=this.imageStorage('lockTable').pointer<NativeHeapObjectViews>(8*8).get();if(!section)throw new Error('Actual retained exit-table lock8 required');
    this.#call(enter?'100aa455.lock8':'100aa45e.unlock8',()=>enter?this.platform.enterPhysicalCriticalSection(section,this.identity):this.platform.leavePhysicalCriticalSection(section,this.identity));this.#exitLockHeld=enter;
   },
   getTls:(index:number):object|null=>this.#call('SharedBase.initializer.TlsGetValue',()=>this.platform.tlsGetValue(index)),
   getPtd:(procedure:object,index:number):NativeHeapObjectViews|null=>{
    if(!this.platform.ownsLocalStorageProcedure(procedure as NativeCrtLocalProcedure)||(procedure as NativeCrtLocalProcedure).kind!=='get')throw new Error('Actual same-platform initializer PTD getter required');
    const record=this.#call('100ae2a1.getPTD',()=> (procedure as NativeCrtLocalGetProcedure).invoke(index));
    if(record===null)return null;if(record!==this.#ptd||!this.#heap)throw new Error('Actual installed SharedBase initializer PTD required');
    const proof=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap,this.identity,{fields:record as NativeHeapObjectViews,offset:0},532);if(!proof.known)throw new Error(proof.reason);return record as NativeHeapObjectViews;
   },
   getCodec:(record:NativeHeapObjectViews,direction:'EncodePointer'|'DecodePointer'='EncodePointer'):object|null=>{
    if(record!==this.#ptd||!this.#heap)throw new Error('Actual retained initializer PTD codec slot required');
    const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap,this.identity,{fields:record,offset:0},532);if(!span.known)throw new Error(span.reason);
    const procedure=NativeHeapObjectViews.prototype.pointer.call(record,direction==='EncodePointer'?0x1f8:0x1fc).get();if(procedure===null)return null;
    const proof=NativeRuntimePlatform.canonicalPointerCodecForPlatform(this.platform,procedure,direction);if(!proof.known)throw new Error(proof.reason);return proof.value;
   },
   encodeCode:(procedure:object,address:number):object|null=>{
    const proof=NativeRuntimePlatform.canonicalPointerCodecForPlatform(this.platform,procedure,'EncodePointer');if(!proof.known)throw new Error(proof.reason);
    if(address===0){const encoded=this.#call('100ae2dd.EncodePointer(NULL)',()=>proof.value.invoke(null));if(encoded)this.#initializerEncodedPointers.add(encoded);return encoded;}
    const errorShutdown=address===0x100e2770&&this.#active&&this.#initializerActive&&this.#dllCall!==null&&this.#dllBoundary==='Original SharedBase ErrorAdmin termination registration pending at 100a72d0'&&dllEntrySource.coldImages.some(row=>row.label==='dllErrorShutdownSource'&&row.address==='100e2770'&&row.size===22&&row.bytes==='b9582a1410e84a0bf2ff68602a1410ff15f8952f10c3');
    const spyShutdown=address===0x100e2890&&this.#active&&this.#initializerActive&&this.#dllCall!==null&&this.#dllBoundary==='Original SharedBase SpyAdmin termination registration pending at 100a72d0'&&dllEntrySource.coldImages.some(row=>row.label==='dllSpyShutdownSource'&&row.address==='100e2890'&&row.size===41&&row.bytes==='33c068068c0010a338b11a10a334b11a10e80e60f2ff8bc8e874f3f1ff681cb11a10ff15f8952f10c3');
    const spieShutdown=address===0x100e2830&&this.#active&&this.#initializerActive&&this.#dllCall!==null&&this.#dllBoundary==="Original SharedBase SpieAdmin termination registration pending at 1004afc7"&&dllEntrySource.coldImages.some(row=>row.label==="dllSpieShutdownCallback"&&row.address==="100e2830"&&row.size===71&&row.bytes==="51a1d87d191083f8ff74146a006a018d4c240b5150c644241301e89d2fffff6822570010e85b60f2ff8bc8e8c1f3f1ff68c07d1910c705d87d1910ffffffffff15f8952f1059c3");
    const messageShutdown=address===0x100e27d0&&this.#active&&this.#initializerActive&&this.#dllCall!==null&&this.#dllBoundary==="Original SharedBase MessageAdmin termination registration pending at 100497a8"&&dllEntrySource.coldImages.some(row=>row.label==="dllMessageShutdownCallback"&&row.address==="100e27d0"&&row.size===51&&row.bytes==="833d6c7d191000740a686c7d1910e8c003f2ff68707d1910c705887d191001000000c7056c7d191000000000ff15f8952f10c3");
    if(!errorShutdown&&!spyShutdown&&!spieShutdown&&!messageShutdown&&![0x100cdf9f,0x100b43e6,0x100b3a8b,0x100b3a49,0x100b3a7d,0x100b39f3,0x100b4360,0x100b3a09,0x100b3973,0x100b3902,0x100bb8e7,0x100e30f0,0x100e26d0,0x100e2810,0x100e2930,0x100e2940,0x100e2950,0x100e2960,0x100e2a00,0x100e2a10,0x100e2710,0x100e2b40,0x100e2f20,0x100079ff,0x10005f65,0x100e30b0,0x100e3110,0x100e3100].includes(address))throw new Error('Original installed conversion address required');
    let pointer=this.#initializerCodePointers.get(address);if(!pointer){pointer=Object.freeze({owner:this.identity,originalCodeAddress:address});this.#initializerCodePointers.set(address,pointer);}
    const encoded=this.#call('100ae2dd.EncodePointer',()=>proof.value.invoke(pointer!));if(encoded){this.#initializerEncodedPointers.add(encoded);this.#initializerDecodedPointers.set(encoded,{original:pointer!,address});}return encoded;
   },
   validateEncodedCode:(value:object):void=>{const active=NativeRuntimePlatform.requireActivePlatform(this.platform);if(!active.known)throw new Error(active.reason);if(!this.#initializerEncodedPointers.has(value))throw new Error('Actual retained initializer encoded code pointer required');},
   getModule:(name:string):object|null=>{if(name!=='KERNEL32')throw new Error('Unowned SharedBase processor module name');return this.#call('100b4490.GetModuleHandleA',()=>this.platform.getWin32ModuleHandle('KERNEL32'));},
   getProcedure:(module:object,name:string):object|null=>{
    if(name!=='IsProcessorFeaturePresent')throw new Error('Unowned SharedBase processor procedure name');
    const procedure=this.#call('100b44a0.GetProcAddress',()=>this.platform.getWin32Procedure(module as NativeWin32ModuleCapability,'IsProcessorFeaturePresent'));
    if(procedure){const proof=NativeRuntimePlatform.canonicalProcessorFeatureProcedureForPlatform(this.platform,procedure);if(!proof.known)throw new Error(proof.reason);}return procedure;
   },
   queryFeature:(procedure:object,feature:number):number=>{const proof=NativeRuntimePlatform.canonicalProcessorFeatureProcedureForPlatform(this.platform,procedure);if(!proof.known)throw new Error(proof.reason);return this.#call('100b44ac.IsProcessorFeaturePresent',()=>proof.value.invoke(feature));},
  });
  for(const [address,capability] of [['102f9768',getModuleHandleA],['102f9648',getProcAddress],['102f97b8',tlsGetValue]] as const){const fields=this.#retainLocal(4);fields.pointer<object>(0).set(capability);initializerImages[address]=fields;}
  for(const label of ['processorModuleName','processorProcedureName'] as const){const receipt=initializerSource.coldGlobals[label],expected=label==='processorModuleName'?'4b45524e454c333200':'497350726f636573736f724665617475726550726573656e7400',address=label==='processorModuleName'?'100ede4c':'100ede30';if(receipt.raw!==expected||receipt.address!==address||receipt.bytes!==expected.length/2)throw new Error('Original SharedBase processor literal required');const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(expected.slice(offset*2,offset*2+2),16),1);initializerImages[address]=fields;}
  for(const [label,hash] of [['queryFloatDivisionErratum','56f7a0aab3783275f87815c6ae4bc7f5b4f251270bc3df4fbbdbc01cedcb1fdf'],['queryFloatDivisionFallback','55bb8b73819ffceb78e0502d2c0278fc3220e77b3dd09347bbc3b3fa89d345b4']] as const)if(initializerSource.methods[label].bodyInstructionBytesSha256!==hash)throw new Error('Original SharedBase processor query source differs');
  for(const label of ['pointerModuleName','pointerEncodeProcedureName'] as const){
   const receipt=initializerSource.coldGlobals[label],expected=label==='pointerModuleName'?'4b45524e454c33322e444c4c00':'456e636f6465506f696e74657200',address=label==='pointerModuleName'?'100ed284':'100ed6d0';
   if(receipt.raw!==expected||receipt.address!==address||receipt.bytes!==expected.length/2)throw new Error('Original SharedBase pointer codec literal required');
   const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(expected.slice(offset*2,offset*2+2),16),1);initializerImages[address]=fields;
  }
  for(const [label,hash] of [['inittermError','8026cc99de5f0f5083710e0c1f52beb27aede69826b267d12e8ccbe42ca3ca60'],['errorInitializers_65','c6eb1fd55abd5b344fb7dff57bb56f34681bc1f9f06ca73819ef44c54396d85c']] as const)if(initializerSource.methods[label].bodyInstructionBytesSha256!==hash)throw new Error('Original SharedBase error initializer source differs');
  const errorTable=initializerSource.tables.errorInitializers,expectedErrorTable=new Uint8Array(540),errorView=new DataView(expectedErrorTable.buffer);
  for(const [index,address] of [[65,0x100a7265],[66,0x100b1854],[67,0x100b4b6b],[68,0x100bef05],[69,0x100ce0f5]])errorView.setUint32(index!*4,address!,true);
  if(errorTable.address!=='100e545c'||errorTable.endExclusive!=='100e5678'||errorTable.raw!==Array.from(expectedErrorTable,byte=>byte.toString(16).padStart(2,'0')).join(''))throw new Error('Original SharedBase error table required');
  const errorFields=this.#retainLocal(540);for(let offset=0;offset<540;offset++)errorFields.writeUnsigned(offset,expectedErrorTable[offset]!,1);initializerImages['100e545c']=errorFields;
  for(const [address,receipt] of [['102f8580',initializerSource.coldGlobals.exitTableBegin],['102f8584',initializerSource.coldGlobals.exitTableEnd]] as const){if(receipt.address!==address||receipt.raw!=='00000000')throw new Error('Original exit-table cold pointers required');const fields=this.#retainLocal(4);fields.writeUnsigned(0,0);initializerImages[address]=fields;}
  for(const [label,hash] of [['crtAttachCaller','fb9938487a8147193a6a4196153cd242c37dd72d999f4bda0d5f7f094cbe66ee'],['memoryMalloc','d97007fcb58bd7d0b0c6ec9c49f58763fba8bdfb6127c9078ddf1159fc8af676'],['memoryGetInstance','79302e58eb88b69239f60db781967e6c265bf12fff7f5da8f5efcdb022e9a454'],['rootTextConstructor','1bb0b6450709549da4589f055cb6f9780becea05ea8cefcd75e37701a22d0be5'],['rootTextAlloc','dc8a43b75e1dccffc84e53f09fff8d1d25e6ce0e0485cfa4722de0f09887fd04'],['voidInitializers_140','837a64198333fc5e77d785301ac1c0f1285ca76822c789ccc9e761b27974c80a'],['voidInitializers_132','fe95f9b100333ef62ca804d288a0db74d3c72240b197fa4b92481e1be29d1e03'],['voidInitializers_133','3a8bbbb5e59111b2df50d4fd356f03df4e2866cc9c9e74b6f3334e12f6e10cbc'],['voidInitializers_134','fd72a3123e1d6c42f4d79fe06d1841a89544d70f4e3263167797a4746a49946e'],['voidInitializers_135','d9fd82f3b2b5c122b85e6e93481942cf70b4eee1a67a48352faa18f188612dda'],['voidInitializers_136','bb01ec59a78689b28bce086c2ff88c2ba9dd59c600c82be3ffe95421cb1b4873'],['voidInitializers_138','f239b3fa9cc4ca5928e95878082d2eac06d6701091e806868b882da8fa17e6d0'],['voidInitializers_139','c16b4a6413c855061bd6b7de7fba045a721d3549bc7a2d287710e1260251d9d8'],['voidInitializers_131','ad0c8a7003225c1dd2ee6356553c97c7610e462753932b48778b913c4a10e4a1'],['voidInitializers_65','6a66a5c4f90d32bb3510a9a7a3312be9cb639e3d4cb8ce8bdccabc01b4015ea6'],['voidInitializers_130','36f9f9e0d7a2af50f31f2898751447963815f5412d7dda6cb776a3f603534cfd'],['errorInitializers_66','66630cd5e2a2dabb3bb968676d31a841924538d3637d71f3fd2fcfae81b546c6'],['errorInitializers_67','34be7ac135e12e6cdb6e84ad62183cc4988c5b678be68e3dd509e953cd6389fc'],['errorInitializers_68','3ac4a0ea067a030fc5629a20f0bd02c49cd0f11c3ef7dd4d1b5fe8c6d0b8d81d'],['errorInitializers_69','115a89c537ebd18abb73b44317428e298f4a289e07527a3152bb0423bfb0b944'],['atexit','09942fe4905f48be972c0e6824f517bcc0cde802100baff5d8a61369ddad30b6'],['onexit','05bf4d6c05b1556037b0068bb08a4a3719045fe6ea11bcf6c8305109bee2fb02'],['appendExitCallback','000574553c6745e72a5a959e12357deecac178f6cabf3d5d0cb6406ff45dbda9'],['decodePointer','680d5ea020292968a6b3e1cb9782e9988c4d9a1d90340f077c9cc0f3a0fed274'],['allocationSize','b628afba8232a0da550759b843715392b69f4ebcc560e5e914dc63fbdfc8e1fd'],['lockExitTable','a3996d6008e3f4e8b3f27d19f629256b5a4b1b56c180d9d370ea86184ab0f045'],['unlockExitTable','ff8245faf6bfe880af7314a45baf278b71fc40c18ece668512874fe4bb80d58f'],['releaseExitTable','6845047bd057027a1b466990d58ea838a092f57e1fde31eed94c452060be9203'],['queryProcessorFeature','7c1f30fb684460922c4035c3a9b38257e68f1e1bffabc8ee035bb1230bc4fe0d'],['processorFeatureProbe','36b1797c63b48cf3f67e2cd754be28debe26814a69902e045ee6feedfed5652c'],['exceptionFrameEnter','e30b4c04dfd938e926cd434bb13e5723dad104657d993b990f465d72e19a7cc7'],['exceptionFrameLeave','39142b8d79823b8b3c0dd534ee99caf6c8cce4347b7608cfc004a14c873f7411']] as const)if(initializerSource.methods[label].bodyInstructionBytesSha256!==hash)throw new Error('Original SharedBase processor initializer source differs');
  const processorFlag=initializerSource.coldGlobals.processorFeature;if(processorFlag.address!=='102f853c'||processorFlag.raw!=='00000000')throw new Error('Original processor feature flag required');const processorFields=this.#retainLocal(4);processorFields.writeUnsigned(0,0);initializerImages['102f853c']=processorFields;
  const scope=initializerSource.coldGlobals.processorProbeScope,scopeRaw='feffffff00000000d4ffffff00000000feffffff62e00c107ee00c10';
  if(scope.address!=='100f8ec0'||scope.bytes!==28||scope.raw!==scopeRaw)throw new Error('Original processor-probe scope receipt required');
  const scopeFields=this.#retainLocal(28);for(let offset=0;offset<28;offset++)scopeFields.writeUnsigned(offset,parseInt(scopeRaw.slice(offset*2,offset*2+2),16),1);initializerImages['100f8ec0']=scopeFields;
  const expectedFiles=new Uint8Array(640),fileWords=new DataView(expectedFiles.buffer);
  for(const [offset,value] of [[0,0x102f7500],[8,0x102f7500],[12,0x101],[24,4096],[44,2],[48,1],[76,2],[80,2]])fileWords.setUint32(offset!,value!,true);
  const expectedFileRaw=Array.from(expectedFiles,byte=>byte.toString(16).padStart(2,'0')).join('');
  for(const [label,address,length] of [['stdioCount','102f8500',4],['stdioVector','102f71c0',4],['stdioFiles','10141790',640]] as const){
   const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.bytes!==length||(label==='stdioFiles'?receipt.raw!==expectedFileRaw||receipt.sha256!=='f2a2cf29c97d8939530c43bb672a5b8097ce8fdb131e92ef721a7d85e477e9f3':receipt.raw!=='00000000'))throw new Error('Original stdio initializer image required');
   const fields=this.#retainLocal(length);for(let offset=0;offset<length;offset++)fields.writeUnsigned(offset,parseInt(receipt.raw.slice(offset*2,offset*2+2),16),1);initializerImages[address]=fields;
  }
  for(const [label,address,raw] of [['onexitScope','100f8630','feffffff00000000d4ffffff00000000feffffff00000000ca720a10'],['allocationSizeScope','100f8ba0','feffffff00000000d0ffffff00000000feffffff0000000068110b10'],['pointerDecodeProcedureName','100ed6e0','4465636f6465506f696e74657200'],['heapSizeImportSlot','102f9678','c09d2f00']] as const){
   const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw||receipt.bytes!==raw.length/2)throw new Error('Original onexit dependency image required');const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);if(label==='heapSizeImportSlot')fields.pointer(0).set(heapSizeProcedure);initializerImages[address]=fields;
  }
  for(const [label,address,raw] of [['staticCriticalSection','10197da0','000000000000000000000000000000000000000000000000'],['initializeSectionImportSlot','102f95f4','349b2f00']] as const){const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw||receipt.bytes!==raw.length/2)throw new Error('Original static section dependency receipt required');const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);if(label==='initializeSectionImportSlot')fields.pointer(0).set(initializeSectionProcedure);initializerImages[address]=fields;}
  for(const [label,address] of [['staticValueSource','100ebb28'],['staticValueDestination','101ab150']] as const){const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.bytes!==16||receipt.raw!=='00'.repeat(16))throw new Error('Original static-value copy receipt required');const fields=this.#retainLocal(16);for(let offset=0;offset<16;offset++)fields.writeUnsigned(offset,0,1);initializerImages[address]=fields;}
  const rootLiteral=initializerSource.coldGlobals.rootTextLiteral;if(rootLiteral.address!=='100e9b5c'||rootLiteral.raw!=='526f6f7400'||rootLiteral.bytes!==5)throw new Error('Original Root text literal required');const rootFields=this.#retainLocal(5);for(let offset=0;offset<5;offset++)rootFields.writeUnsigned(offset,parseInt(rootLiteral.raw.slice(offset*2,offset*2+2),16),1);initializerImages['100e9b5c']=rootFields;
  for(const [label,entry,body,raw] of [['memoryGetInstance','10002aae','10020bf0','e93de10100'],['rootTextConstructor','10003ba7','100135f0','e944fa0000'],['rootTextAlloc','10007d65','10013240','e9d6b40000']] as const){const chain=initializerSource.methods[label].entryChain;if(chain.length!==1||chain[0]!.va!==entry||chain[0]!.targetVA!==body||chain[0]!.bytes!==raw)throw new Error('Original Root text entry thunk required');}
  const memoryState=initializerSource.coldGlobals.memoryAdminState;if(memoryState.address!=='10142798'||memoryState.bytes!==16||memoryState.raw!=='00'.repeat(16))throw new Error('Original MemoryAdmin static state required');const memoryFields=this.#retainLocal(16);for(let offset=0;offset<16;offset++)memoryFields.writeUnsigned(offset,0,1);initializerImages['10142798']=memoryFields;
  for(const [label,address,raw,procedure] of [['memoryMallocScope','100f8318','ffffffffa5d40310afd40310',null],['memoryHeapSection','10189a18','00'.repeat(24),null],['memoryHeapSectionInitialized','102fb000','00',null],['memoryHeapSectionInitializeImport','102f966c','7e9d2f00',memorySectionInitializeProcedure],['memoryHeapSectionEnterImport','102f9604','a09b2f00',memorySectionEnterProcedure],['memoryHeapSectionLeaveImport','102f9608','b89b2f00',memorySectionLeaveProcedure]] as const){const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw||receipt.bytes!==raw.length/2)throw new Error('Original MemoryAdmin Malloc dependency receipt required');const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);if(procedure)fields.pointer(0).set(procedure);initializerImages[address]=fields;}
  for(const [label,entry,body,raw,hash] of [
   ['pool112Dispatch','10003102','100485f0','e9e9540400','ae08f33a0b0f57ae64dbceba2d1251cc62f4162d5c56f5114ada6679d2d975cf'],
   ['pool112Initialize','10001951','100467f0','e99a4e0400','7c4477d8ff4b3a77c47be87c82e89734554f71d89a819080b217ab8680f0dab9'],
   ['pool112Allocate','10005731','1003e820','e9ea900300','7118b5f86e0f261ef751bd535848bb1449aecd61d07f18011fdb4ff52484ce3c'],
   ['pool12Dispatch','100028f6','10047e70','e975550400','f6b5a85ab066edbe8d754a90b821e4345fe83a20702ef4b749879c21cbf4be59'],
   ['pool12Initialize','10004683','10045cb0','e928160400','3f472523c024fe0fa5c3a3d9cfd944f37877f8e742dcde94b3c22dad7e5be436'],
   ['pool12Allocate','10006a19','1003dfe0','e9c2750300','3ae0d1d1017f5afc32bfaf793e552d6c9fb354f1902e90199ce6c748a45b7597'],
   ['heapAllocate','10001028','1003d2f0','e9c3c20300','81a87d3f55464496b395c0d896cf0bf6e3d9386e1312f40effb2dcb0f29debf0'],
   ['pool16Dispatch','10002d97','10047f10','e974510400','ca60809dbb386056b7f7b05993e45ac896079a37e28034dfc0ad840583c60e03'],
  ] as const){const method=initializerSource.methods[label],chain=method.entryChain;if(method.bodyInstructionBytesSha256!==hash||chain.length!==1||chain[0]!.va!==entry||chain[0]!.bytes!==raw||chain[0]!.targetVA!==body)throw new Error('Original lower heap/pool source required');}
  const poolRanges=[
   [0,0x10008698],[5,0x10006a14],[9,0x100028f6],[13,0x10002d97],[17,0x10002aa9],[21,0x10004214],[25,0x10005966],[29,0x10008152],
   [33,0x100031d4],[41,0x1000617c],[49,0x1000196a],[57,0x10006dac],[65,0x10004002],[81,0x10007315],[97,0x10003102],[113,0x1000690b],
   [129,0x10005fc9],[161,0x10006be5],[193,0x100070c7],[225,0x10004c2d],[257,0x100077a7],[321,0x10006eec],[385,0x10003012],[449,0x10007662],
   [513,0x10005448],[641,0x10006b9f],[769,0x10004b1f],[897,0x10004d13],[1025,0x1000719e],[1281,0x1000647e],[1537,0x10007be9],[1793,0x1000460b],
   [2049,0x1000830f],[2561,0x100024d2],[3073,0x10002e7d],[3585,0x1000536c],
  ];
  const table=initializerSource.coldGlobals.heapDispatchTable,tableFields=this.#retainLocal(4097*4);
  if(table.address!=='102fb050'||table.bytes!==4097*4||table.raw.length!==4097*8)throw new Error('Original heap dispatch table required');
  for(let range=0;range<poolRanges.length;range++)for(let index=poolRanges[range]![0]!;index<(poolRanges[range+1]?.[0]??4097);index++){
   const expected=poolRanges[range]![1]!,offset=index*4,raw=table.raw.slice(offset*2,offset*2+8),value=parseInt(raw.match(/../g)!.reverse().join(''),16);
   if(value!==expected)throw new Error('Original heap dispatch table slot required');tableFields.writeUnsigned(offset,value);
  }
  initializerImages['102fb050']=tableFields;
  for(const [label,address,raw] of [['pool16State','102ffd58','00'.repeat(12)],['poolVirtualAllocImport','102f9680','da9d2f00']] as const){
   const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw||receipt.bytes!==raw.length/2)throw new Error('Original pool dependency receipt required');
   const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);if(label==='poolVirtualAllocImport')fields.pointer(0).set(poolVirtualAllocProcedure);initializerImages[address]=fields;
  }
  for(const [label,address,raw] of [['pool16Descriptor','102ffef0','00000000'],['poolDescriptorList','102fb004','00000000'],['poolHeapAllocImport','102f9684','ea9d2f00']] as const){
   const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw||receipt.bytes!==raw.length/2)throw new Error('Original pool descriptor dependency required');const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);if(label==='poolHeapAllocImport')fields.pointer(0).set(crtHeapAllocProcedure);initializerImages[address]=fields;
  }
  for(const [label,hash] of [['crtOperatorNew','3cf0637b4a6ec05fe2a843ef56071ae4e1142a1aec075e0234556d46c4ff5197'],['crtMalloc','70262c4e3e41925b21175c516dbef31313d2260ef97767a9a6676779eedf7a08'],['pool16Initialize','2581efd22be28d3f60729e79fa46125e7f0b4c4bd711d68ca0ad2bfdf9e7777d']] as const)if(initializerSource.methods[label].bodyInstructionBytesSha256!==hash)throw new Error('Original pool descriptor constructor source required');
  for(const [label,hash] of [['memset','9ef7f32cb2a542225e41f61960817c9c8c8cee8cf8d798402dee12226c520968'],['heapAddPointerArea','628281f022bbb0687d9d32d6028e19adfd8cc072c4ddda696d363ede1b166ba5']] as const)if(initializerSource.methods[label].bodyInstructionBytesSha256!==hash)throw new Error('Original bitmap/area registration source required');
  if(initializerSource.methods.pool16Allocate.bodyInstructionBytesSha256!=='ac1587863d6014b6666d859f2f1d81eb2879152e6297a3860bad25e62e4cf324')throw new Error('Original pool bitmap allocator source required');const slotChain=initializerSource.methods.pool16Allocate.entryChain;if(slotChain.length!==1||slotChain[0]!.va!=='1000605a'||slotChain[0]!.targetVA!=='1003e090'||slotChain[0]!.bytes!=='e931800300')throw new Error('Original pool bitmap allocator thunk required');
  for(const [label,hash] of [['crtLock','3d74be3e3b5df76a33034414a8a1a7b8aba7962697d3aa7790c470b0e2fbde78'],['crtUnlock','bd77ef3907ee26a8a910d5015f4abc9206e55d072e8d12350b7dd7d59709012f'],['initializeCriticalSection','f73b38791ad720df5bc93afb51a63f39e6f0b3f93553464dd7b1e7fbdd27d5f5']] as const)if(initializerSource.methods[label].bodyInstructionBytesSha256!==hash)throw new Error('Original CRT section source required');
  for(const [label,address,raw] of [
   ['className142State','102f47e4','00'.repeat(12)],['className142Published','102f48bc','00000000'],
   ['crtAttachCount','102f648c','00000000'],['emptyString144','102f48e8','00000000'],['className143State','102f47f0','00'.repeat(12)],['className143Published','102f48b8','00000000'],
   ['className142TypeInfo','10140148','64d50e10000000002e3f415662434f62736f6c657465436c6173734040000000'],
   ['className143TypeInfo','1013f1a8','64d50e10000000002e3f415662434f626a656374526566426173654040000000'],
   ['typeInfoNode','102f6484','00'.repeat(8)],
   ['typeInfoNameScope','100f8b20','feffffff00000000d4ffffff00000000feffffff00000000eb090b10'],
   ['sharedUnDNameScope','100f8e80','feffffff000000005cffffff00000000feffffff00000000dc610c10'],
   ['crtInitializeLockScope','100f8c98','feffffff00000000d4ffffff00000000feffffff0000000089b80b10'],
   ['sharedDemanglerHeap','102f6f1c','00'.repeat(60)],
   ['demanglerClassKeyword','100f2b10','636c6173732000'],
   ['classNameSeparator','100e6f44','2000'],
   ['pool112State','102ffddc','00'.repeat(12)],['pool112Descriptor','102fff1c','00'.repeat(4)],['pool112Geometry','100e7b00','70000000b6ff0000'],
   ['pool12State','102ffd4c','00'.repeat(12)],['pool12Descriptor','102ffeec','00'.repeat(4)],['pool12Geometry','100e7aa0','0c000000feff0000'],
   ['pool24State','102ffd70','00'.repeat(12)],
   ['pool24Descriptor','102ffef8','00'.repeat(4)],
   ['pool24Geometry','100e7ab8','18000000557f0000'],
   ['crtFreeScope','100f8670','feffffff00000000d4ffffff00000000feffffff00000000faa90a10'],
   ['demanglerIndirectVtable','100f299c','e3220c10f2220c1001230c10'],
   ['demanglerTextVtable','100f29bc','9c1d0c10a0220c10b2220c10'],
   ['demanglerTemplatePrefix','100f2ad8','74656d706c6174652d706172616d657465722d00'],
   ['demanglerGenericPrefix','100f2ac8','67656e657269632d747970652d00'],
   ['demanglerScopeSeparator','100f2aec','3a3a00'],
  ] as const){const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw||receipt.bytes!==raw.length/2)throw new Error('Original SharedBase class-name image required');const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);initializerImages[address]=fields;}
  for(const [label,address,raw] of [['underscoreRootLiteral','100ea340','5f526f6f7400'],['underscoreRootString','102f47d0','00000000']] as const){const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw||receipt.bytes!==raw.length/2)throw new Error('Original underscore Root initializer bytes required');const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);initializerImages[address]=fields;}
  const rootStatic=initializerSource.coldGlobals.rootStaticObject;if(rootStatic.address!=='102f4618'||rootStatic.bytes!==40||rootStatic.raw!=='00'.repeat(40))throw new Error('Original Root static object bytes required');const rootStaticFields=this.#retainLocal(40);rootStaticFields.bytes.fill(0);rootStaticFields.knownMask.fill(255);initializerImages['102f4618']=rootStaticFields;
  if(initializerSource.methods.memcpy.bodyInstructionBytesSha256!=='ada0fafd69940490a3c1ac706772420ce32760254cc28aff588c401ed09f1c44')throw new Error('Original SharedBase initializer memcpy source required');
  for(const [label,address,raw] of [['memcpyForwardDwords','100a7b08','6b7b0a10587b0a10507b0a10487b0a10407b0a10387b0a10307b0a10287b0a10'],['memcpyForwardTail','100a7b74','847b0a108c7b0a10987b0a10ac7b0a10']] as const){const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw||receipt.bytes!==raw.length/2)throw new Error('Original initializer memcpy dispatch bytes required');const fields=this.#retainLocal(receipt.bytes);for(let offset=0;offset<receipt.bytes;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);initializerImages[address]=fields;}
  for(const [label,hash] of [['pool1792Dispatch','3d58e290e25a0050ce25e335317c7cc96f0e482e0e36bba7699ffe633855670a'],['pool1792Initialize','1a883d8dae8cf11f85a1b8cfd0eff36b4796edd86066c6c703c3b10700d0b142'],['pool1792Allocate','7de11414ebcc3562183438855a5b58027768aa4d0c45e94f6e9a408b8566eaae']] as const)if(initializerSource.methods[label].bodyInstructionBytesSha256!==hash)throw new Error('Original version-buffer pool source required');
  for(const [label,address,raw] of [['pool1792State','102ffe9c','00'.repeat(12)],['pool1792Descriptor','102fff5c','00'.repeat(4)],['pool1792Geometry','100e7b80','00070000ff000000']] as const){const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.raw!==raw)throw new Error('Original version-buffer pool storage required');const fields=this.#retainLocal(raw.length/2);for(let i=0;i<fields.bytes.length;i++)fields.writeUnsigned(i,parseInt(raw.slice(i*2,i*2+2),16),1);initializerImages[address]=fields;}
  const geometry=initializerSource.coldGlobals.pool16Geometry;if(geometry.address!=='100e7aa8'||geometry.bytes!==8||geometry.raw!=='10000000ffff0000')throw new Error('Original 16-byte pool geometry required');const geometryFields=this.#retainLocal(8);for(let offset=0;offset<8;offset++)geometryFields.writeUnsigned(offset,parseInt(geometry.raw.slice(offset*2,offset*2+2),16),1);initializerImages['100e7aa8']=geometryFields;
  const areaChain=initializerSource.methods.heapAddPointerArea.entryChain;if(areaChain.length!==1||areaChain[0]!.va!=='100012e4'||areaChain[0]!.targetVA!=='1003c650'||areaChain[0]!.bytes!=='e967b30300')throw new Error('Original pointer-area registration thunk required');
  for(const [label,address,length] of [['heapPointerAreaCount','102fb030',4],['heapPointerAreas','10149a18',0x40000]] as const){const receipt=initializerSource.coldGlobals[label];if(receipt.address!==address||receipt.bytes!==length||receipt.raw!=='00'.repeat(length))throw new Error('Original heap pointer-area storage required');const fields=this.#retainLocal(length);fields.bytes.fill(0);fields.knownMask.fill(255);initializerImages[address]=fields;}
  const descriptorChain=initializerSource.methods.pool16Initialize.entryChain;if(descriptorChain.length!==1||descriptorChain[0]!.va!=='100061cc'||descriptorChain[0]!.targetVA!=='10045da0'||descriptorChain[0]!.bytes!=='e9cffb0300')throw new Error('Original pool descriptor initializer thunk required');
  const heapImport=initializerSource.coldGlobals.poolHeapAllocImport.importEntry;if(heapImport.iatVA!=='0x102f9684'||heapImport.module!=='KERNEL32.dll'||heapImport.name!=='HeapAlloc')throw new Error('Original pool descriptor HeapAlloc import required');
  const poolImport=initializerSource.coldGlobals.poolVirtualAllocImport.importEntry;if(poolImport.iatVA!=='0x102f9680'||poolImport.module!=='KERNEL32.dll'||poolImport.name!=='VirtualAlloc')throw new Error('Original pool VirtualAlloc import required');
  const mallocChain=initializerSource.methods.memoryMalloc.entryChain;for(const [index,address,raw,target] of [[0,'10003cd8','e923ce0100','10020b00'],[1,'10020b00','e93c69feff','10007441'],[2,'10007441','e9ca5f0300','1003d410']] as const){if(mallocChain.length!==3||mallocChain[index]!.va!==address||mallocChain[index]!.bytes!==raw||mallocChain[index]!.targetVA!==target)throw new Error('Original MemoryAdmin Malloc entry chain required');}
  const voidBytes=new Uint8Array(856),voidView=new DataView(voidBytes.buffer);
  for(const [index,address] of [[65,0x100e1660],[130,0x100e1440],[131,0x100e1450],[132,0x100e1470],[133,0x100e14b0],[134,0x100e14c0],[135,0x100e14d0],[136,0x100e14e0],[138,0x100e14f0],[139,0x100e1500],[140,0x100e1510],[141,0x100e15d0],[142,0x100e1600],[143,0x100e1610],[144,0x100e1630],[145,0x100e1670],[146,0x100e1680]])voidView.setUint32(index!*4,address!,true);
  if(initializerSource.tables.voidInitializers.raw!==Array.from(voidBytes,byte=>byte.toString(16).padStart(2,'0')).join('')||initializerSource.tables.dynamicTlsHook.raw!=='00000000')throw new Error('Original void/TLS initializer images required');
  const voidFields=this.#retainLocal(856);for(let offset=0;offset<856;offset++)voidFields.writeUnsigned(offset,voidBytes[offset]!,1);initializerImages['100e5000']=voidFields;const dynamicTls=this.#retainLocal(4);dynamicTls.writeUnsigned(0,0);initializerImages['102f858c']=dynamicTls;
  const freeReceipt=initializerSource.coldGlobals.crtHeapFreeImport;if(freeReceipt.address!=='102f9674'||freeReceipt.raw!=='b49d2f00'||freeReceipt.bytes!==4)throw new Error('Original CRT HeapFree import receipt required');const freeFields=this.#retainLocal(4);freeFields.pointer(0).set(crtHeapFreeProcedure);initializerImages['102f9674']=freeFields;
  this.#initializerImages=Object.freeze(initializerImages);
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
 #retainLocal(size:number):NativeHeapObjectViews {
  const fields=physical(size);this.#locals.set(fields,{backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:fields.backing.bytes,backingMasks:fields.backing.knownMask,view:fields.view});return fields;
 }
 #requireLocal(fields:NativeHeapObjectViews):void {
  const root=this.#locals.get(fields);
  const variable=this.#variablePoolSlots.get(fields);if(variable){this.#requireLocal(variable.region);if(variable.region.readUnsigned(variable.offset-8)*1024-16!==variable.capacity||variable.region.readUnsigned(variable.offset-4)!==1)throw new Error('Live original variable-pool block claim required');}
  const slot=this.#poolSlots.get(fields);if(slot){this.#requireLocal(slot.region);const index=(slot.offset-16)/slot.capacity,bitmapBase=slot.capacity===112?0x6fdfb0:slot.capacity===12?0xbfff8:slot.capacity===16?0x100000:slot.capacity===24?0xbf008:0x6f910;if(slot.region.readUnsigned(bitmapBase+Math.floor(index/32)*4)&(1<<(index&31)))throw new Error('Live original bitmap slot claim required');}
  if(this.#poolRegions.has(fields)){const proof=NativeRuntimePlatform.canonicalVirtualRegionForPlatform(this.platform,fields.backing,fields.bytes.length);if(!proof.known)throw new Error(proof.reason);}
  if(!root||fields.backing!==root.backing||root.backing.freed||fields.bytes!==root.bytes||fields.knownMask!==root.masks||fields.view!==root.view||root.backing.bytes!==root.backingBytes||root.backing.knownMask!==root.backingMasks||fields.view.buffer!==root.bytes.buffer||fields.view.byteOffset!==root.bytes.byteOffset||fields.view.byteLength!==root.bytes.length)throw new Error('Actual retained SharedBase local storage required');
 }
 static sharedStackArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{stage:'enter'|'allocate';input:NativeHeapObjectViews;types:NativeHeapObjectViews;codePage:number;count:number;cookie:number;locale:NativeHeapObjectViews}>> {
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
  const owner=owners.get(platform),item=owner?owner.#caseState:null;
  if(!owner||!owner.#active||owner.#stackCall!==call||!item||!owner.#multibyteAllocation)return {known:false,reason:'Actual pending SharedBase stack call required'};
  try{owner.#requireLocal(item.input);owner.#requireLocal(item.types);if(!owner.#localeUpdate)throw new Error('Actual SharedBase locale-update caller required');owner.#requireLocal(owner.#localeUpdate);const cookie=NativeSharedCrtSecurityCookie.forPlatform(platform).readCookie();if(!cookie.known)return cookie;
   return {known:true,value:{stage:owner.#stackStage,input:item.input,types:item.types,codePage:owner.#multibyteAllocation.readUnsigned(4),count:item.wideCount??256,cookie:cookie.value,locale:owner.#localeUpdate!}};
  }catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static argvStackArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{stage:'enter'|'multibyte'|'module'|'parse'|'allocate'|'fill'|'return'|'environment';initialized:number;module:NativeHeapObjectViews;input:NativeBytePointer|null;allocation:NativeHeapObjectViews|null;result:number|null;argc:NativeHeapObjectViews;argv:NativeHeapObjectViews;retryDelay:number;envPointer:NativeHeapObjectViews;envVector:NativeHeapObjectViews;envInitialized:NativeHeapObjectViews;mbInitialized:NativeHeapObjectViews}>>{
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const owner=owners.get(platform);if(!owner||!owner.#active||owner.#argvCall!==call)return {known:false,reason:'Actual pending SharedBase setargv required'};
  try{return {known:true,value:{stage:owner.#argvStage,initialized:owner.imageStorage('multibyteInitialized').readUnsigned(0),module:owner.imageStorage('moduleNameBuffer'),input:owner.#argvInput,allocation:owner.#argvAllocation,result:owner.#argvReturned,argc:owner.imageStorage('argumentCount'),argv:owner.imageStorage('argumentVector'),retryDelay:owner.imageStorage('allocationRetryDelay').readUnsigned(0),envPointer:owner.imageStorage('environmentPointer'),envVector:owner.imageStorage('environmentVector'),envInitialized:owner.imageStorage('environmentInitialized'),mbInitialized:owner.imageStorage('multibyteInitialized')}};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static dllEntryStackArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{guard:NativeHeapObjectViews;object:NativeHeapObjectViews;moduleName:NativeHeapObjectViews;memoryAdmin:NativeHeapObjectViews;lstrcpy:Readonly<{slot:NativeHeapObjectViews;procedure:object}>|null;modules:Readonly<NativeSharedDllModuleHooks>|null;resourceInfo:Readonly<{slot:NativeHeapObjectViews;procedure:object;initialize:(filename:string,handle:number,size:number,output:NativeBytePointer,site:'1004c504'|'1004c301')=>number}>|null;resourceQuery:Readonly<NativeSharedDllResourceQuery>|null;format:Readonly<{output:NativeHeapObjectViews;translation:NativeHeapObjectViews}>|null;resourceSize:Readonly<{slot:NativeHeapObjectViews;procedure:object;outcome:(filename:string,site:'1004c4d5'|'1004c2d8')=>Readonly<{size:number;handle:number}>}>|null}>>{
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const owner=owners.get(platform);
  if(!owner||!owner.#active||owner.#dllCall!==call||owner.#attachReturned!==1||!owner.#dllImages)return {known:false,reason:'Actual pending SharedBase DLL entry required'};
  try{if(owner.#dllResourceQuery){owner.#requireLocal(owner.#dllResourceQuery.slot);if(owner.#dllResourceQuery.slot.pointer(0).get()!==owner.#dllResourceQuery.procedure)throw new Error('Canonical version query import binding required');}if(owner.#dllLanguageFormatImages)for(const fields of Object.values(owner.#dllLanguageFormatImages))owner.#requireLocal(fields);owner.#requireLocal(owner.#dllImages.guard);owner.#requireLocal(owner.#dllImages.object);owner.#requireLocal(owner.#dllImages.moduleName);if(owner.#dllLstrcpy){owner.#requireLocal(owner.#dllLstrcpy.slot);if(owner.#dllLstrcpy.slot.pointer(0).get()!==owner.#dllLstrcpy.procedure)throw new Error('Canonical DLL lstrcpyA import binding required');}if(owner.#dllModuleHooks){owner.#requireLocal(owner.#dllModuleHooks.procedureName);for(const binding of Object.values(owner.#dllModuleHooks.imports)){owner.#requireLocal(binding.slot);if(binding.slot.pointer(0).get()!==binding.procedure)throw new Error('Canonical DLL module import binding required');}}if(owner.#dllResourceSize){owner.#requireLocal(owner.#dllResourceSize.slot);if(owner.#dllResourceSize.slot.pointer(0).get()!==owner.#dllResourceSize.procedure)throw new Error('Canonical version size import binding required');}if(owner.#dllResourceInfo){owner.#requireLocal(owner.#dllResourceInfo.slot);if(owner.#dllResourceInfo.slot.pointer(0).get()!==owner.#dllResourceInfo.procedure)throw new Error('Canonical version info import binding required');}const memoryAdmin=owner.#initializerImages['10142798'];if(!memoryAdmin)throw new Error('Actual initialized MemoryAdmin state required');owner.#requireLocal(memoryAdmin);return {known:true,value:{...owner.#dllImages,memoryAdmin,lstrcpy:owner.#dllLstrcpy,modules:owner.#dllModuleHooks,resourceSize:owner.#dllResourceSize,resourceInfo:owner.#dllResourceInfo,format:owner.#dllLanguageFormatImages,resourceQuery:owner.#dllResourceQuery}};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static fileCloseArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<object>{
  const owner=owners.get(platform);if(!owner||!owner.#active||!owner.#initializerActive||!owner.#dllCall||owner.#fileCloseCall?.grant!==call||owner.#dllBoundary!=='Original SharedBase SpieAdmin fclose pending at 1004b208')return {known:false,reason:'Actual current SharedBase CloseHandle invocation required'};
  return {known:true,value:owner.#fileCloseCall.handle};
 }
 static fileOpenArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<NativeWin32CreateFileArguments>{
  const owner=owners.get(platform);if(!owner||!owner.#active||!owner.#initializerActive||!owner.#dllCall||owner.#fileOpenCall?.grant!==call||owner.#dllBoundary!=='Original SharedBase CreateFileA return pending at 100d1372')return {known:false,reason:'Actual current SharedBase CreateFileA invocation required'};
  return {known:true,value:owner.#fileOpenCall.input};
 }
 static initializerStackArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{images:Readonly<Record<string,NativeHeapObjectViews>>;cookie:NativeHeapObjectViews;imports:Readonly<NativeSharedInitializerImports>;formatPtd:()=>NativeHeapObjectViews}>>{
  const owner=owners.get(platform);if(!owner)return {known:false,reason:'Actual SharedBase owner required'};
  if(owner.#dllMallocCall===call){const dll=NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(platform,call);if(!dll.known)return dll;}else{const proof=NativeSharedCrtOwner.argvStackArgumentsForPlatform(platform,call);if(!proof.known)return proof;if(proof.value.stage!=='environment')return {known:false,reason:'Actual pending SharedBase initializer required'};}
  if(!owner.#initializerActive)return {known:false,reason:'Actual pending SharedBase initializer required'};
  try{for(const fields of Object.values(owner.#initializerImages))owner.#requireLocal(fields);const cookie=NativeSharedCrtSecurityCookie.forPlatform(platform);const read=cookie.readCookie();if(!read.known)return read;return {known:true,value:{images:Object.freeze({...owner.#initializerImages,...owner.#dllFormatImages,'10140b48':owner.imageStorage('tlsGetterIndex'),'10140b44':owner.imageStorage('threadDataIndex'),'102f64b4':owner.imageStorage('allocationRetryDelay'),'102f8588':owner.imageStorage('multibyteInitialized'),'102f70c0':owner.imageStorage('ioBlocks'),'102f854c':owner.imageStorage('memcpySseFlag'),'102f6ad0':owner.imageStorage('newMode'),'102f8530':owner.imageStorage('heapSelection'),'102f6ac8':owner.imageStorage('heapHandle'),'101414b8':owner.imageStorage('lockTable')}),cookie:cookie.fields,imports:owner.#initializerImports,formatPtd:()=>{if(!owner.#active||owner.#dllMallocCall!==call)throw new Error('Actual DLL format PTD call required');return owner.#getPtdLowerWarm();}}};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static versionResourcePoolSpanForPlatform(platform:NativeRuntimePlatform,pointer:NativeBytePointer,bytes:number):NativeValue<boolean>{
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const owner=owners.get(platform);if(!owner||!Array.from(owner.#poolRegions).some(region=>region.backing===pointer.fields.backing))return {known:true,value:false};
  try{const slot=owner.#poolSlots.get(pointer.fields);if(!slot)throw new Error('Canonical retained pool slot required for version resource access');owner.#requireLocal(pointer.fields);if(!Number.isSafeInteger(pointer.offset)||pointer.offset<0||!Number.isSafeInteger(bytes)||bytes<0||pointer.offset+bytes>slot.capacity)throw new Error('Contained version resource pool-slot span required');return {known:true,value:true};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static dllMallocLocalStorageForPlatform(platform:NativeRuntimePlatform,call:object,fields:NativeHeapObjectViews):NativeValue<void>{
  const proof=NativeSharedCrtOwner.initializerStackArgumentsForPlatform(platform,call);if(!proof.known)return proof;const owner=owners.get(platform)!;if(owner.#dllMallocCall!==call)return {known:false,reason:'Actual DLL allocator storage grant required'};
  try{if(fields===owner.#ptd||fields===owner.#multibyteAllocation){const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,owner.#heap!,owner.identity,{fields,offset:0},fields===owner.#ptd?532:544);if(!span.known)return span;}else if(fields===proof.value.cookie){const cookie=NativeSharedCrtSecurityCookie.forPlatform(platform).readCookie();if(!cookie.known)return cookie;}else if(!Object.values(proof.value.images).includes(fields)){owner.#requireLocal(fields);if(owner.#initializerAllocations.has(fields)){const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,owner.#heap!,owner.identity,{fields,offset:0},fields.bytes.length);if(!span.known)return span;}}else if(Object.values(owner.#initializerImages).includes(fields))owner.#requireLocal(fields);if(fields.backing.freed)throw new Error('Actual live DLL allocator storage required');return {known:true,value:undefined};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static argvLocalStorageForPlatform(platform:NativeRuntimePlatform,call:object,fields:NativeHeapObjectViews):NativeValue<void>{
  const proof=NativeSharedCrtOwner.argvStackArgumentsForPlatform(platform,call);if(!proof.known)return proof;const owner=owners.get(platform)!;
  try{
   if(owner.#initializerAllocations.has(fields)||fields===owner.#ioBlock||fields===owner.#ptd||fields===owner.#multibyteAllocation||fields===owner.#argvAllocation||fields===owner.#environmentAllocation||fields===owner.#environmentVector||owner.#environmentStrings.includes(fields)){
    const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,owner.#heap!,owner.identity,{fields,offset:0},fields===owner.#ptd?532:fields===owner.#multibyteAllocation?544:fields.bytes.length);if(!span.known)return span;
   }else if(owner.#initializerActive&&fields===NativeSharedCrtSecurityCookie.forPlatform(platform).fields){const cookie=NativeSharedCrtSecurityCookie.forPlatform(platform).readCookie();if(!cookie.known)return cookie;}
   else if(![proof.value.module,proof.value.envPointer,proof.value.envVector,proof.value.envInitialized,proof.value.mbInitialized,owner.imageStorage('tlsGetterIndex'),owner.imageStorage('threadDataIndex'),owner.imageStorage('allocationRetryDelay'),owner.imageStorage('ioBlocks'),owner.imageStorage('memcpySseFlag'),owner.imageStorage('heapSelection'),owner.imageStorage('heapHandle'),owner.imageStorage('newMode'),owner.imageStorage('lockTable'),...owner.#sections].includes(fields))owner.#requireLocal(fields);
   if(fields.backing.freed||fields.bytes.buffer!==fields.backing.bytes.buffer||fields.knownMask.buffer!==fields.backing.knownMask.buffer||fields.view.buffer!==fields.bytes.buffer||fields.view.byteOffset!==fields.bytes.byteOffset||fields.view.byteLength!==fields.bytes.length)throw new Error('Actual SharedBase argv/environment storage required');return {known:true,value:undefined};
  }catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}

 }
 static setMultibyteStackArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{stage:'enter'|'ptd'|'multibyte'|'codepage'|'allocate'|'configuration'|'installation'|'return';ptd:NativeHeapObjectViews|null;old:NativeHeapObjectViews|null;candidate:NativeHeapObjectViews|null;cookie:number;scope:NativeHeapObjectViews;initial:NativeHeapObjectViews;global:NativeHeapObjectViews;mask:number;published:NativeHeapObjectViews;types:NativeHeapObjectViews;cases:NativeHeapObjectViews}>>{
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const owner=owners.get(platform);
  if(!owner||!owner.#active||owner.#setMultibyteCall!==call)return {known:false,reason:'Actual pending SharedBase setmbcp required'};
  const cookie=NativeSharedCrtSecurityCookie.forPlatform(platform).readCookie();if(!cookie.known)return cookie;
  try{const scope=owner.imageStorage('setMultibyteScopeTable');for(const [index,value] of [0xfffffffe,0,0xffffffcc,0,0xfffffffe,0,0x100b181b].entries())if(scope.readUnsigned(index*4)!==value)throw new Error('Original setmbcp scope table required');return {known:true,value:{stage:owner.#setMultibyteStage,ptd:owner.#ptd,old:owner.#setMultibyteOld,candidate:owner.#multibyteAllocation,cookie:cookie.value,scope,initial:owner.imageStorage('initialMultibyte'),global:owner.#globalMultibyte(),mask:owner.imageStorage('threadLocaleMask').readUnsigned(0),published:owner.imageStorage('multibytePublishedFields'),types:owner.imageStorage('multibyteTypeTable'),cases:owner.imageStorage('multibyteCaseTable')}};}
  catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static interlockedArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{role:'oldPtd'|'candidatePtd'|'oldGlobal'|'candidateGlobal';fields:NativeHeapObjectViews;record:NativeHeapObjectViews;delta:1|-1;before:number}>>{
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const owner=owners.get(platform),pending=owner?owner.#counterPending:null;if(!owner||!owner.#active||!pending||pending.call!==call||!owner.#setMultibyteCall)return {known:false,reason:'Actual pending SharedBase interlocked call required'};
  try{if(pending.record!==owner.imageStorage('initialMultibyte')){const proof=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,owner.#heap!,owner.identity,{fields:pending.record,offset:0},544);if(!proof.known)return proof;}return {known:true,value:{...pending}};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static configurationStackArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{stage:'enter'|'body'|'case'|'return';fields:NativeHeapObjectViews;input:number;cookie:number;table:NativeHeapObjectViews}>>{
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const owner=owners.get(platform);
  if(!owner||!owner.#active||owner.#configurationCall!==call||!owner.#configurationFields||owner.#configurationFields!==owner.#multibyteAllocation)return {known:false,reason:'Actual pending SharedBase configuration required'};
  const cookie=NativeSharedCrtSecurityCookie.forPlatform(platform).readCookie();if(!cookie.known)return cookie;
  return {known:true,value:{stage:owner.#configurationStage,fields:owner.#configurationFields,input:owner.#configurationInput,cookie:cookie.value,table:owner.imageStorage('multibyteCodePageTable')}};
 }
 static caseStackArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<{stage:'enter'|'classification'|'lower'|'upper'|'tables'|'return';fields:NativeHeapObjectViews;cookie:number;state:CaseState|null}>>{
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;const owner=owners.get(platform);
  if(!owner||!owner.#active||owner.#caseCall!==call||!owner.#caseFields||owner.#caseFields!==owner.#multibyteAllocation)return {known:false,reason:'Actual pending SharedBase case helper required'};
  const cookie=NativeSharedCrtSecurityCookie.forPlatform(platform).readCookie();if(!cookie.known)return cookie;
  return {known:true,value:{stage:owner.#caseStage,fields:owner.#caseFields,cookie:cookie.value,state:owner.#caseState?Object.freeze({...owner.#caseState}):null}};
 }
 static sharedMemsetSelectionForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<number>{
  const proof=NativeSharedCrtOwner.sharedStackArgumentsForPlatform(platform,call);if(!proof.known)return proof;
  try{return {known:true,value:owners.get(platform)!.imageStorage('memcpySseFlag').readUnsigned(0)};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static mappingStackArgumentsForPlatform(platform:NativeRuntimePlatform,call:object):NativeValue<Readonly<MappingState&{cookie:number}>>{
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
  const owner=owners.get(platform),item=owner?owner.#mappingState:null;
  if(!owner||!owner.#active||owner.#stackCall!==call||!item)return {known:false,reason:'Actual pending SharedBase mapping call required'};
  try{for(const fields of [item.input,item.output,item.locale])owner.#requireLocal(fields);const cookie=NativeSharedCrtSecurityCookie.forPlatform(platform).readCookie();if(!cookie.known)return cookie;return {known:true,value:{...item,cookie:cookie.value}};}catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
 }
 static nlsArgumentsForPlatform(platform:NativeRuntimePlatform,call:NativeArgvNlsCallGrant):NativeValue<Readonly<{kind:SharedNlsKind;scalar:number;fields:NativeHeapObjectViews|null;input:NativeHeapObjectViews|null;count:number;flags:number;procedure:object|null}>> {
  const active=NativeRuntimePlatform.requireActivePlatform(platform);if(!active.known)return active;
  const owner=owners.get(platform),pending=owner?owner.#nlsPending:null;
  if(!owner||!owner.#active||!pending||pending.call!==call)return {known:false,reason:'Actual pending SharedBase NLS call required'};
  try{
   if(pending.kind==='GetModuleFileNameA'){
    const procedure=NativeRuntimePlatform.argvProcedureForPlatform(platform,'GetModuleFileNameA');if(!procedure.known)return procedure;
    if(!owner.#argvCall||owner.#argvStage!=='module'||pending.fields!==owner.imageStorage('moduleNameBuffer')||pending.scalar!==0||pending.count!==260||pending.input!==null||pending.flags!==0||pending.procedure!==procedure.value)throw new Error('Actual SharedBase module filename ABI required');return {known:true,value:pending};
   }
   const mapping=owner.#mappingState;
   if(mapping&&owner.#stackCall){
    const stage=mapping.stage;
    const valid=stage==='probe'?pending.kind==='LCMapStringW'&&pending.scalar===0&&pending.flags===0x100&&pending.input===owner.imageStorage('emptyWideString')&&pending.count===1&&pending.fields===null:
     stage==='convertQuery'||stage==='convertFill'?pending.kind==='MultiByteToWideChar'&&pending.scalar===mapping.codePage&&pending.flags===1&&pending.input===mapping.input&&pending.count===256&&pending.fields===(stage==='convertQuery'?null:mapping.wideInput):
     stage==='mapQuery'||stage==='mapFill'?pending.kind==='LCMapStringW'&&pending.scalar===mapping.localeId&&pending.flags===mapping.flags&&pending.input===mapping.wideInput&&pending.count===256&&pending.fields===(stage==='mapQuery'?null:mapping.wideOutput):
     stage==='narrow'?pending.kind==='WideCharToMultiByte'&&pending.scalar===mapping.codePage&&pending.flags===0&&pending.input===mapping.wideOutput&&pending.count===256&&pending.fields===mapping.output:false;
    if(!valid)throw new Error('Actual source-stage mapping NLS arguments required');
    for(const fields of [pending.fields,pending.input])if(fields&&fields!==owner.imageStorage('emptyWideString'))owner.#requireLocal(fields);
    return {known:true,value:pending};
   }
   const item=owner.#caseState;
   if(pending.fields){owner.#requireLocal(pending.fields);if(pending.kind==='GetCPInfo'&&(pending.fields!==owner.#cpInfo||pending.fields.bytes.length!==20))throw new Error('Actual CPInfo local required');
    if(pending.kind==='GetStringTypeW'&&!(pending.fields===item?.probe&&pending.count===1&&pending.fields.bytes.length===4)&&!(pending.fields===item?.types&&pending.count===256&&pending.fields.bytes.length===512))throw new Error('Actual Unicode classification output required');
    if(pending.kind==='MultiByteToWideChar'&&(pending.fields!==item?.wideTemporary||pending.fields.bytes.length!==512))throw new Error('Actual wide conversion destination required');}
   if(pending.input){if(pending.kind==='GetStringTypeW'){
     if(pending.scalar!==1||!(pending.input===owner.imageStorage('emptyWideString')&&pending.count===1&&pending.fields===item?.probe)&&!(pending.input===item?.wideTemporary&&pending.count===256&&pending.fields===item?.types))throw new Error('Actual original Unicode classification input required');
     if(pending.count===256)owner.#requireLocal(pending.input);
    }else{owner.#requireLocal(pending.input);if(pending.input!==item?.input||pending.count!==256||pending.flags!==1)throw new Error('Actual original case-repertoire conversion required');}}
   return {known:true,value:pending};
  }catch(error){return {known:false,reason:error instanceof Error?error.message:String(error)};}
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
   this.#sections.push(fields);this.#crtSections.set(id,fields);
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
 #callocCrt(count:number,size:number,wrapperRetry=true):NativeHeapObjectViews|null {
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
  if(wrapperRetry&&this.imageStorage('allocationRetryDelay').readUnsigned(0)!==0)throw new Error('Unowned SharedBase calloc Sleep retry at 100aef35');
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
 #mallocCrt(size:number,wrapperRetry=true):NativeHeapObjectViews|null {
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
   if(wrapperRetry&&this.imageStorage('allocationRetryDelay').readUnsigned(0)!==0)throw new Error('Unowned SharedBase malloc Sleep retry at 100aeeed');
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
 #globalMultibyte():NativeHeapObjectViews{
  const pointer=this.imageStorage('multibytePointer');if(this.#publishedMultibyte){if(pointer.pointer<NativeHeapObjectViews>(0).get()!==this.#publishedMultibyte)throw new Error('Actual installed SharedBase global multibyte pointer required');return this.#publishedMultibyte;}
  if(pointer.readUnsigned(0)!==0x10140e60)throw new Error('Unowned SharedBase changed global multibyte pointer');return this.imageStorage('initialMultibyte');
 }
 #exchangeMultibyteCounter(role:'oldPtd'|'candidatePtd'|'oldGlobal'|'candidateGlobal',record:NativeHeapObjectViews,delta:1|-1):number{
  const fields=new NativeHeapObjectViews(record.backing,record.bytes.byteOffset-record.backing.bytes.byteOffset,4),call=Object.freeze({});this.#counterPending={call,role,record,fields,delta,before:fields.readUnsigned(0)};
  try{this.#call('setmbcp.counterCall.'+role,()=>NativeX86ThreadStack.bindSharedSetMultibyteCounter(this.#setMultibyteStack!,this.#setMultibyteCall!,call));const result=this.#call('setmbcp.interlocked.'+role,()=>NativeRuntimePlatform.invokeSharedInterlockedCounter(this.platform,call));this.#call('setmbcp.counterReturn.'+role,()=>NativeX86ThreadStack.finishSharedSetMultibyteCounter(this.#setMultibyteStack!,this.#setMultibyteCall!,call,result));return result.value;}finally{this.#counterPending=null;}
 }
 #installMultibyteCandidate():void{
  const candidate=this.#multibyteAllocation!,old=this.#setMultibyteOld!,ptd=this.#ptd!;
  this.#exchangeMultibyteCounter('oldPtd',old,-1);this.#exchangeMultibyteCounter('candidatePtd',candidate,1);
  if((ptd.readUnsigned(0x70,1)&2)===0&&(this.imageStorage('threadLocaleMask').readUnsigned(0,1)&1)===0){
   const section=this.imageStorage('lockTable').pointer<NativeHeapObjectViews>(13*8).get();if(!section)throw new Error('Actual setmbcp lock13 required');
   this.#call('100b1770.lock13',()=>this.platform.enterPhysicalCriticalSection(section,this.identity));this.#call('100b1775.lockReturn',()=>NativeX86ThreadStack.finishSharedSetMultibyteLock(this.#setMultibyteStack!,this.#setMultibyteCall!));
   this.#call('100b17e1.publication',()=>NativeX86ThreadStack.finishSharedSetMultibytePublication(this.#setMultibyteStack!,this.#setMultibyteCall!));
   const oldGlobal=this.#globalMultibyte();this.#exchangeMultibyteCounter('oldGlobal',oldGlobal,-1);this.imageStorage('multibytePointer').pointer<NativeHeapObjectViews>(0).set(candidate);this.#publishedMultibyte=candidate;this.#trace.push('100b1804.publishMultibytePointer');this.#exchangeMultibyteCounter('candidateGlobal',candidate,1);
   this.#call('100b181d.unlock13',()=>this.platform.leavePhysicalCriticalSection(section,this.identity));this.#call('100b1823.unlockReturn',()=>NativeX86ThreadStack.finishSharedSetMultibyteUnlock(this.#setMultibyteStack!,this.#setMultibyteCall!));
  }
  this.#setMultibyteStage='return';this.#call('100b1853.setmbcpReturn',()=>NativeX86ThreadStack.returnSharedSetMultibyteFrame(this.#setMultibyteStack!,this.#setMultibyteCall!));this.#setMultibyteCall=null;this.#trace.push('100b16ba.setMultibyteCodePage.return0');
 }
 #updateMultibyteWarm():NativeHeapObjectViews {
  const ptd=this.#getPtdLowerWarm();
  let mb=ptd.pointer<NativeHeapObjectViews>(0x68).get();
  if((ptd.readUnsigned(0x70)&this.imageStorage('threadLocaleMask').readUnsigned(0))===0||ptd.pointer(0x6c).get()===null){
   const section=this.imageStorage('lockTable').pointer<NativeHeapObjectViews>(13*8).get();if(!section)throw new Error('Unowned SharedBase dynamic multibyte lock');
   this.#call('updateMultibyte.lock13',()=>this.platform.enterPhysicalCriticalSection(section,this.identity));
   const global=this.#globalMultibyte();
   if(mb!==global)throw new Error('Unowned SharedBase multibyte reference exchange');
   this.#call('100b1422.unlock13',()=>this.platform.leavePhysicalCriticalSection(section,this.identity));mb=global;
  }
  if(mb===null)throw new Error('Unowned SharedBase multibyte fatal error');
  this.#trace.push('100b1387.updateMultibyte.return');return mb;
 }
 #initializeLocaleUpdate(destination?:NativeHeapObjectViews,publish=true):NativeHeapObjectViews {
  const local=destination??this.#retainLocal(16);if(destination)this.#requireLocal(destination);if(publish)this.#localeUpdate=local;local.writeUnsigned(12,0,1);
  const ptd=this.#getPtdLowerWarm();local.pointer<NativeHeapObjectViews>(8).set(ptd);
  const locale=ptd.pointer<NativeHeapObjectViews>(0x6c).get(),mb=ptd.pointer<NativeHeapObjectViews>(0x68).get();
  local.pointer<NativeHeapObjectViews>(0).set(locale);local.pointer<NativeHeapObjectViews>(4).set(mb);
  const mask=this.imageStorage('threadLocaleMask').readUnsigned(0);
  if((locale!==this.imageStorage('initialLocale')||this.imageStorage('localePointer').readUnsigned(0)!==0x10141390)&&(ptd.readUnsigned(0x70)&mask)===0)throw new Error('Unowned SharedBase locale reference exchange at 100a74ed');
  if((mb!==this.#globalMultibyte())&&(ptd.readUnsigned(0x70)&mask)===0)local.pointer<NativeHeapObjectViews>(4).set(this.#updateMultibyteWarm());
  if((ptd.readUnsigned(0x70,1)&2)===0){ptd.writeUnsigned(0x70,ptd.readUnsigned(0x70)|2);local.writeUnsigned(12,1,1);}
  this.#trace.push('100a74b6.localeUpdate.return');return local;
 }
 #nlsScalar(kind:SharedNlsKind,scalar=0,fields:NativeHeapObjectViews|null=null,input:NativeHeapObjectViews|null=null,count=0,flags=0,procedure:object|null=null):number {
  const endpoints=this.platform.argvNlsEndpoints;if(!endpoints)throw new Error('Actual SharedBase '+kind+' NLS endpoints required');
  const proof=NativeRuntimePlatform.canonicalArgvNlsEndpointsForPlatform(this.platform,endpoints);if(!proof.known)throw new Error(proof.reason);
  const call=Object.freeze({identity:Object.freeze({})});this.#nlsPending={call,kind,scalar,fields,input,count,flags,procedure};
  try{
   if(kind==='GetModuleFileNameA')this.#call('100c0bd1.moduleNameCall',()=>NativeX86ThreadStack.beginSharedArgvModuleName(this.#argvStack!,this.#argvCall!,call));
   else if(this.#caseCall&&kind==='GetCPInfo')this.#call('100b1221.caseCPInfoCall',()=>NativeX86ThreadStack.beginSharedCaseCpInfo(this.#caseState!.stack!,this.#caseCall!,call));
   else if(this.#configurationCall&&this.#configurationStage==='body'&&(kind==='IsValidCodePage'||kind==='GetCPInfo'))this.#call('configuration.NLS.call',()=>NativeX86ThreadStack.beginSharedConfigurationImport(this.#configurationStack!,this.#configurationCall!,call));
   else if(this.#mappingState&&this.#stackCall)this.#call('SharedBase.NLS.mapStackCall',()=>NativeX86ThreadStack.beginSharedMappingImport(this.#caseState!.stack!,this.#stackCall!,call));
   else if(this.#stackCall&&this.#caseState?.stack&&(kind==='GetStringTypeW'||kind==='MultiByteToWideChar'))this.#call('SharedBase.NLS.stackCall',()=>NativeX86ThreadStack.beginSharedStringTypeImport(this.#caseState!.stack!,this.#stackCall!,call));
   const result=this.#call('SharedBase.'+kind,()=>endpoints.invoke(call));
   const actual=this.#call(kind+'.normalReturn',()=>NativeRuntimePlatform.canonicalArgvNlsNormalReturnForPlatform(this.platform,call));
   if(result!==actual||result.kind!=='scalar')throw new Error('Actual SharedBase NLS scalar return required');
   if(kind==='GetModuleFileNameA')this.#call('100c0bd7.moduleNameReturn',()=>NativeX86ThreadStack.finishSharedArgvModuleName(this.#argvStack!,this.#argvCall!,call,result.value));
   else if(this.#caseCall&&kind==='GetCPInfo')this.#call('100b1227.caseCPInfoReturn',()=>NativeX86ThreadStack.finishSharedCaseCpInfo(this.#caseState!.stack!,this.#caseCall!,call,result.value));
   else if(this.#configurationCall&&this.#configurationStage==='body'&&(kind==='IsValidCodePage'||kind==='GetCPInfo'))this.#call('configuration.NLS.return',()=>NativeX86ThreadStack.finishSharedConfigurationImport(this.#configurationStack!,this.#configurationCall!,call,result.value));
   else if(this.#mappingState&&this.#stackCall)this.#call('SharedBase.NLS.mapStackReturn',()=>NativeX86ThreadStack.finishSharedMappingImport(this.#caseState!.stack!,this.#stackCall!,call,result.value));
   else if(this.#stackCall&&this.#caseState?.stack&&(kind==='GetStringTypeW'||kind==='MultiByteToWideChar'))this.#call('SharedBase.NLS.stackReturn',()=>NativeX86ThreadStack.finishSharedStringTypeImport(this.#caseState!.stack!,this.#stackCall!,call,result.value));
   return result.value;
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
  if(NativeRuntimePlatform.threadStackSelectionForPlatform(this.platform).known){
   this.#configurationCall=Object.freeze({});this.#configurationFields=fields;this.#configurationInput=input;this.#configurationStage='enter';
   const entered=this.#call('100b1718.configurationFrame',()=>NativeX86ThreadStack.beginSharedConfigurationFrame(this.platform,this.#configurationCall!));this.#configurationStack=entered.stack;this.#cpInfo=this.#retainStackLocal(entered.info);
  }
  const codePage=this.#getSystemCodePage(input);
  if(this.#configurationCall){this.#configurationStage='body';this.#call('100b14c3.configurationCodePage',()=>NativeX86ThreadStack.finishSharedConfigurationCodePage(this.#configurationStack!,this.#configurationCall!,codePage));}
  if(codePage===0)throw new Error('Unowned SharedBase setSBCS at 100b14d0');
  const table=this.imageStorage('multibyteCodePageTable');
  for(let offset=0;offset<240;offset+=48){if(this.#configurationCall)this.#call('100b14e1.configurationTableCompare',()=>NativeX86ThreadStack.compareSharedConfigurationCodePage(this.#configurationStack!,this.#configurationCall!,offset));this.#trace.push('configureMultibyte.tableCompare.'+offset);if(table.readUnsigned(offset)===codePage)throw new Error('Unowned SharedBase built-in DBCS setup');}
  if(codePage===65000||codePage===65001)throw new Error('Unowned SharedBase invalid-codepage return/cookie check');
  if(this.#nlsScalar('IsValidCodePage',codePage&0xffff)===0)throw new Error('Unowned SharedBase invalid-codepage return/cookie check');
  const info=this.#configurationCall?this.#cpInfo!:this.#retainLocal(20);this.#cpInfo=info;
  if(this.#nlsScalar('GetCPInfo',codePage,info)===0)throw new Error('Unowned SharedBase CPInfo failure fallback');
  if(this.#configurationCall)this.#call('100b1541.configurationMemset',()=>NativeX86ThreadStack.beginSharedConfigurationMemset(this.#configurationStack!,this.#configurationCall!));
  const pointer={fields,offset:0x1c},geometry=this.#call('memset.geometry',()=>this.platform.resolveNativePointer(pointer));
  const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,pointer,257);if(!span.known)throw new Error(span.reason);
  if(this.imageStorage('memcpySseFlag').readUnsigned(0)!==0)throw new Error('Unowned SharedBase SSE memset');
  let offset=0,remaining=257;
  for(let lead=(-geometry.modulo4)&3;lead>0;lead--){fields.writeUnsigned(0x1c+offset++,0,1);remaining--;this.#trace.push('memset.alignByte');}
  const words=remaining>>>2;remaining&=3;
  const df=this.#call('memset.readDF',()=>NativeRuntimePlatform.readNativeDirectionFlag(this.platform));if(df!==0)throw new Error('Unowned SharedBase reverse memset');
  for(let i=0;i<words;i++){fields.writeUnsigned(0x1c+offset,0);offset+=4;this.#trace.push('100a79df.REP_STOSD');}
  for(let i=0;i<remaining;i++){fields.writeUnsigned(0x1c+offset++,0,1);this.#trace.push('memset.tailByte');}
  if(this.#configurationCall)this.#call('100b1549.configurationMemsetReturn',()=>NativeX86ThreadStack.finishSharedConfigurationMemset(this.#configurationStack!,this.#configurationCall!));
  fields.writeUnsigned(4,codePage);fields.writeUnsigned(12,0);
  if(info.readUnsigned(0)>1)throw new Error('Unowned SharedBase general DBCS lead-byte setup');
  fields.writeUnsigned(8,0);
  const storesDf=this.#call('100b165b.readDF',()=>NativeRuntimePlatform.readNativeDirectionFlag(this.platform));if(storesDf!==0)throw new Error('Unowned SharedBase reverse multibyte information stores');
  for(const at of [16,20,24])fields.writeUnsigned(at,0);
  if(this.#configurationCall){this.#configurationStage='case';this.#call('100b1612.configurationCase',()=>NativeX86ThreadStack.prepareSharedConfigurationCase(this.#configurationStack!,this.#configurationCall!));}
  this.#initializeCasePrefix(fields);
  if(this.#configurationCall){this.#configurationStage='return';this.#call('100b167d.configurationReturn',()=>NativeX86ThreadStack.returnSharedConfigurationFrame(this.#configurationStack!,this.#configurationCall!));this.#configurationCall=null;this.#locals.delete(info);}
  if(!this.#setMultibyteCall)throw new Error('Unowned SharedBase setmbcp SEH caller frame at 100b171d');
 }
 #initializeCasePrefix(fields:NativeHeapObjectViews):void {
  let info=this.#retainLocal(20),input=this.#retainLocal(256),types=this.#retainLocal(512),lower=this.#retainLocal(256),upper=this.#retainLocal(256);const probe=this.#retainLocal(4);
  this.#caseState={info,input,types,lower,upper,probe,wideCount:null,stack:null,wideTemporary:null};this.#cpInfo=info;
  const selected=NativeRuntimePlatform.threadStackSelectionForPlatform(this.platform);
  if(selected.known){
   this.#caseCall=Object.freeze({});this.#caseFields=fields;this.#caseStage='enter';const entered=this.#call('100b1614.caseFrame',()=>NativeX86ThreadStack.beginSharedCaseFrame(this.platform,this.#caseCall!));
   ({info,input,types,lower,upper}=entered);this.#caseState={info,input,types,lower,upper,probe,wideCount:null,stack:entered.stack,wideTemporary:null};this.#cpInfo=info;
   for(const fields of [info,input,types,lower,upper])this.#retainStackLocal(fields);
  }
  if(this.#nlsScalar('GetCPInfo',fields.readUnsigned(4),info)===0)throw new Error('Unowned SharedBase ASCII case fallback');
  for(let index=0;index<256;index++){input.writeUnsigned(index,index,1);this.#trace.push('100b1236.caseInputByte');}
  input.writeUnsigned(0,32,1);
  if(info.readUnsigned(6,1)!==0)throw new Error('Unowned SharedBase case lead-byte replacement');
  this.#caseStage='classification';const classificationLocale=this.#caseCall?this.#beginCaseWrapperLocale():this.#initializeLocaleUpdate();this.#trace.push('100c703f.getStringTypeA.enterStat');
  if(selected.known){
   this.#stackCall=Object.freeze({});this.#stackStage='enter';
   const entered=this.#call('100c7068.stackFrame',()=>NativeX86ThreadStack.beginSharedStringTypeFrame(this.platform,this.#stackCall!));
   this.#caseState.stack=entered.stack;this.#caseState.probe=entered.probe;
   const fields=entered.probe;this.#locals.set(fields,{backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:fields.backing.bytes,backingMasks:fields.backing.knownMask,view:fields.view});
  }
  const mode=this.imageStorage('stringTypeMode');
  if(mode.readUnsigned(0)===0){
   const result=this.#nlsScalar('GetStringTypeW',1,this.#caseState.probe,this.imageStorage('emptyWideString'),1);
   if(result!==0)mode.writeUnsigned(0,1);
   else {if(this.#call('100c6ec6.GetLastError',()=>this.platform.getWin32LastError())===120)mode.writeUnsigned(0,2);}
  }
  if(mode.readUnsigned(0)!==1)throw new Error('Unowned SharedBase ANSI string-type fallback');
  if(this.#caseState.stack)this.#call('100c6efd.clearProbe',()=>NativeX86ThreadStack.clearSharedStringTypeProbe(this.#caseState!.stack!,this.#stackCall!));else probe.writeUnsigned(0,0);
  const procedure=this.#call('100c6f0a.MultiByteToWideCharImport',()=>NativeRuntimePlatform.argvProcedureForPlatform(this.platform,'MultiByteToWideChar'));
  const count=this.#nlsScalar('MultiByteToWideChar',fields.readUnsigned(4),null,input,256,1,procedure);this.#caseState.wideCount=count;
  if(count===0)throw new Error('Unowned SharedBase string-type conversion-query failure return/cookie check');
  if(count>0x7ffffff0||count*2+8>1024)throw new Error('Unowned SharedBase string-type wide heap allocation');
  if(!this.#caseState.stack)throw new Error('Unowned SharedBase aligned temporary stack allocation at 100c6f4c -> 100ce300');
  this.#stackStage='allocate';this.#caseState.wideTemporary=this.#call('100c6f4c.alloca16',()=>NativeX86ThreadStack.allocateSharedStringTypeTemporary(this.#caseState!.stack!,this.#stackCall!));
  this.#call('100c6f80.memset',()=>NativeX86ThreadStack.clearSharedStringTypeTemporary(this.#caseState!.stack!,this.#stackCall!));
  const wide=this.#caseState.wideTemporary;
  this.#locals.set(wide,{backing:wide.backing,bytes:wide.bytes,masks:wide.knownMask,backingBytes:wide.backing.bytes,backingMasks:wide.backing.knownMask,view:wide.view});
  const filled=this.#nlsScalar('MultiByteToWideChar',fields.readUnsigned(4),wide,input,256,1,procedure);
  if(filled===0)throw new Error('Unowned SharedBase conversion-fill failure cleanup');
  const classified=this.#nlsScalar('GetStringTypeW',1,types,wide,filled);
  const returned=this.#call('100c703e.classificationReturn',()=>NativeX86ThreadStack.returnSharedStringTypeFrame(this.#caseState!.stack!,this.#stackCall!));
  if(returned!==classified)throw new Error('Actual SharedBase classification result required');
  this.#locals.delete(wide);this.#locals.delete(this.#caseState.probe);this.#stackCall=null;
  if(classificationLocale.readUnsigned(12,1)!==0){const ptd=classificationLocale.pointer<NativeHeapObjectViews>(8).get();if(!ptd)throw new Error('Actual classification caller PTD required');ptd.writeUnsigned(0x70,ptd.readUnsigned(0x70)&~2);this.#trace.push('100c7076.classificationLocale.restore');}
  this.#trace.push('100c703f.getStringTypeA.return');
  if(this.#caseCall)this.#call('100c707e.classificationWrapperReturn',()=>NativeX86ThreadStack.finishSharedCaseWrapper(this.#caseState!.stack!,this.#caseCall!));
  this.#mapCase(fields,0x100,lower);this.#mapCase(fields,0x200,upper);
  this.#caseStage='tables';
  for(let index=0;index<256;index++){
   this.#call('100b12e2.caseTableEntry',()=>NativeX86ThreadStack.writeSharedCaseTableEntry(this.#caseState!.stack!,this.#caseCall!,index));this.#trace.push('100b12e2.caseTableByte');
  }
  if(!this.#caseCall)throw new Error('Actual enclosing SharedBase case frame required');
  this.#caseStage='return';this.#call('100b1386.caseReturn',()=>NativeX86ThreadStack.returnSharedCaseFrame(this.#caseState!.stack!,this.#caseCall!));
  for(const fields of [info,input,types,lower,upper])this.#locals.delete(fields);this.#caseCall=null;this.#trace.push('100b11fd.caseHelper.return');
 }
 #retainStackLocal(fields:NativeHeapObjectViews):NativeHeapObjectViews{
  this.#locals.set(fields,{backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:fields.backing.bytes,backingMasks:fields.backing.knownMask,view:fields.view});return fields;
 }
 #beginCaseWrapperLocale():NativeHeapObjectViews{
  const local=this.#retainStackLocal(this.#call('caseWrapper.enter',()=>NativeX86ThreadStack.beginSharedCaseWrapper(this.#caseState!.stack!,this.#caseCall!)));
  this.#initializeLocaleUpdate(local);this.#call('100a7535.localeUpdateReturn',()=>NativeX86ThreadStack.finishSharedCaseLocale(this.#caseState!.stack!,this.#caseCall!));return local;
 }
 #mapCase(fields:NativeHeapObjectViews,flags:number,output:NativeHeapObjectViews):void{
  this.#caseStage=flags===0x100?'lower':'upper';const locale=this.#caseCall?this.#beginCaseWrapperLocale():this.#initializeLocaleUpdate(),item=this.#caseState!,state:MappingState={stage:'enter',flags,localeId:fields.readUnsigned(12),codePage:fields.readUnsigned(4),input:item.input,output,wideInput:null,wideOutput:null,count:256,result:null,locale};
  this.#mappingState=state;this.#stackCall=Object.freeze({});
  this.#call('100b5112.mappingFrame',()=>NativeX86ThreadStack.beginSharedMappingFrame(item.stack!,this.#stackCall!));
  const mode=this.imageStorage('localeMapMode');
  if(mode.readUnsigned(0)===0){state.stage='probe';const probe=this.#nlsScalar('LCMapStringW',0,null,this.imageStorage('emptyWideString'),1,0x100);if(probe!==0)mode.writeUnsigned(0,1);else if(this.#call('100b4d86.GetLastError',()=>this.platform.getWin32LastError())===120)mode.writeUnsigned(0,2);}
  if(mode.readUnsigned(0)!==1)throw new Error('Unowned SharedBase ANSI case mapping fallback');
  // Original positive input scan retains 256: source byte zero was replaced by space.
  for(let index=0;index<256;index++){if(state.input.readUnsigned(index,1)===0)throw new Error('Unowned shortened SharedBase case input');this.#trace.push('100b4da7.mappingInputByte');}
  const convert=this.#call('100b4df1.MultiByteToWideCharImport',()=>NativeRuntimePlatform.argvProcedureForPlatform(this.platform,'MultiByteToWideChar'));
  state.stage='convertQuery';state.count=this.#nlsScalar('MultiByteToWideChar',state.codePage,null,state.input,256,1,convert);if(state.count!==256)throw new Error('Unowned SharedBase mapping conversion-query count');
  const retain=(view:NativeHeapObjectViews)=>{this.#locals.set(view,{backing:view.backing,bytes:view.bytes,masks:view.knownMask,backingBytes:view.backing.bytes,backingMasks:view.backing.knownMask,view:view.view});return view;};
  state.stage='inputAllocate';state.wideInput=retain(this.#call('100b4e37.alloca16',()=>NativeX86ThreadStack.allocateSharedMappingTemporary(item.stack!,this.#stackCall!)));
  state.stage='convertFill';if(this.#nlsScalar('MultiByteToWideChar',state.codePage,state.wideInput,state.input,256,1,convert)!==256)throw new Error('Unowned SharedBase mapping conversion-fill failure');
  const map=this.#call('100b4e88.LCMapStringWImport',()=>NativeRuntimePlatform.argvProcedureForPlatform(this.platform,'LCMapStringW'));
  state.stage='mapQuery';state.count=this.#nlsScalar('LCMapStringW',state.localeId,null,state.wideInput,256,flags,map);if(state.count!==256)throw new Error('Unowned SharedBase mapping query count');
  state.stage='outputAllocate';state.wideOutput=retain(this.#call('100b4ef5.alloca16',()=>NativeX86ThreadStack.allocateSharedMappingTemporary(item.stack!,this.#stackCall!)));
  state.stage='mapFill';if(this.#nlsScalar('LCMapStringW',state.localeId,state.wideOutput,state.wideInput,256,flags,map)!==256)throw new Error('Unowned SharedBase mapping fill failure');
  state.stage='narrow';state.result=this.#nlsScalar('WideCharToMultiByte',state.codePage,output,state.wideOutput,256,0);if(state.result!==256)throw new Error('Unowned SharedBase mapping narrow failure');
  state.stage='return';const returned=this.#call('100b50e5.mappingReturn',()=>NativeX86ThreadStack.returnSharedMappingFrame(item.stack!,this.#stackCall!));if(returned!==state.result)throw new Error('Actual mapping return required');
  this.#locals.delete(state.wideInput);this.#locals.delete(state.wideOutput);this.#stackCall=null;
  if(locale.readUnsigned(12,1)!==0){const ptd=locale.pointer<NativeHeapObjectViews>(8).get();if(!ptd)throw new Error('Actual mapping caller PTD required');ptd.writeUnsigned(0x70,ptd.readUnsigned(0x70)&~2);this.#trace.push('100b5123.mappingLocale.restore');}
  this.#trace.push('100b50e6.caseMap.return.'+flags);
  if(this.#caseCall)this.#call('100b5128.mappingWrapperReturn',()=>NativeX86ThreadStack.finishSharedCaseWrapper(item.stack!,this.#caseCall!));
 }
 #initializeArgumentsPrefix():number {
  if(NativeRuntimePlatform.threadStackSelectionForPlatform(this.platform).known){this.#argvCall=Object.freeze({});this.#argvStage='enter';this.#argvStack=this.#call('100adb46.setargvFrame',()=>NativeX86ThreadStack.beginSharedArgvFrame(this.platform,this.#argvCall!));this.#argvStage='multibyte';}
  if(this.imageStorage('multibyteInitialized').readUnsigned(0)===0){
   this.#trace.push('100b185f.setMultibyteCodePage(-3)');
   if(NativeRuntimePlatform.threadStackSelectionForPlatform(this.platform).known){this.#setMultibyteCall=Object.freeze({});this.#setMultibyteStage='enter';this.#setMultibyteStack=this.#call('100b185f.setmbcpFrame',()=>NativeX86ThreadStack.beginSharedSetMultibyteFrame(this.platform,this.#setMultibyteCall!));}
   this.#getPtdLowerWarm();if(this.#setMultibyteCall){this.#setMultibyteStage='ptd';this.#call('100b16cf.setmbcpPtd',()=>NativeX86ThreadStack.finishSharedSetMultibytePtd(this.#setMultibyteStack!,this.#setMultibyteCall!));}
   const mb=this.#updateMultibyteWarm();this.#setMultibyteOld=mb;if(this.#setMultibyteCall){this.#setMultibyteStage='multibyte';this.#call('100b16d9.setmbcpMultibyte',()=>NativeX86ThreadStack.finishSharedSetMultibyteWarmup(this.#setMultibyteStack!,this.#setMultibyteCall!));}
   const codePage=this.#getSystemCodePage();if(this.#setMultibyteCall){this.#setMultibyteStage='codepage';this.#call('100b16e4.setmbcpCodePage',()=>NativeX86ThreadStack.finishSharedSetMultibyteCodePage(this.#setMultibyteStack!,this.#setMultibyteCall!,codePage));}

   if(codePage!==mb.readUnsigned(4)){
    const allocated=this.#mallocCrt(544);this.#multibyteAllocation=allocated;
    if(this.#setMultibyteCall){this.#setMultibyteStage='allocate';this.#call('100b16fa.setmbcpAllocation',()=>NativeX86ThreadStack.finishSharedSetMultibyteAllocation(this.#setMultibyteStack!,this.#setMultibyteCall!));}
    if(allocated!==null){
     const df=this.#call('100b170f.readDF',()=>NativeRuntimePlatform.readNativeDirectionFlag(this.platform));
     if(df!==0)throw new Error('Unowned SharedBase reverse multibyte REP MOVSD');
     for(let offset=0;offset<544;offset+=4){allocated.writeUnsigned(offset,mb.readUnsigned(offset));this.#trace.push('100b170f.REP_MOVSD');}
     allocated.writeUnsigned(0,0);if(this.#setMultibyteCall){this.#setMultibyteStage='configuration';this.#call('100b1714.setmbcpConfiguration',()=>NativeX86ThreadStack.prepareSharedSetMultibyteConfiguration(this.#setMultibyteStack!,this.#setMultibyteCall!));}this.#configureMultibytePrefix(allocated,codePage);
     if(this.#setMultibyteCall){this.#setMultibyteStage='installation';this.#call('100b1730.setmbcpInstallation',()=>NativeX86ThreadStack.beginSharedSetMultibyteInstallation(this.#setMultibyteStack!,this.#setMultibyteCall!));this.#installMultibyteCandidate();}
    }
    if(allocated===null)this.#trace.push('100b16ba.setMultibyteCodePage.return-1');
   }else this.#trace.push('100b16ba.setMultibyteCodePage.return0');
   this.imageStorage('multibyteInitialized').writeUnsigned(0,1);
  }
  if(!this.#argvCall)throw new Error('Actual SharedBase setargv frame required');
  this.#argvStage='module';this.#call('100c0bbf.multibyteReturn',()=>NativeX86ThreadStack.finishSharedArgvMultibyte(this.#argvStack!,this.#argvCall!));
  const module=this.imageStorage('moduleNameBuffer');module.writeUnsigned(260,0,1);const procedure=this.#call('GetModuleFileNameA.procedure',()=>NativeRuntimePlatform.argvProcedureForPlatform(this.platform,'GetModuleFileNameA'));this.#nlsScalar('GetModuleFileNameA',0,module,null,260,0,procedure);
  const program=Object.freeze({fields:module,offset:0});this.imageStorage('programName').pointer<NativeBytePointer>(0).set(program);
  const command=this.imageStorage('commandLinePointer').pointer<NativeBytePointer>(0).get();this.#argvInput=command&&this.#call('100c0be6.commandFirstByte',()=>NativeRuntimePlatform.readProcessInputUnsigned(this.platform,command,0,1))!==0?command:program;
  const initializeLocale=(fields:NativeHeapObjectViews)=>{
   this.#locals.set(fields,{backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:fields.backing.bytes,backingMasks:fields.backing.knownMask,view:fields.view});this.#initializeLocaleUpdate(fields,false);
  };
  this.#argvStage='parse';this.#call('100c0bfc.parseQuery',()=>NativeX86ThreadStack.beginSharedArgvParseQuery(this.#argvStack!,this.#argvCall!));this.#call('100c0a0f.parseQueryBody',()=>NativeX86ThreadStack.runSharedArgvParseQuery(this.#argvStack!,this.#argvCall!,initializeLocale));
  this.#argvStage='allocate';const bytes=this.#call('100aeed0.argvMallocFrame',()=>NativeX86ThreadStack.beginSharedArgvAllocation(this.#argvStack!,this.#argvCall!));this.#argvAllocation=this.#mallocCrt(bytes,false);
  const allocated=this.#call('100c0c28.argvMallocReturn',()=>NativeX86ThreadStack.finishSharedArgvAllocation(this.#argvStack!,this.#argvCall!));
  if(allocated){this.#argvStage='fill';this.#call('100c0c3d.parseFill',()=>NativeX86ThreadStack.beginSharedArgvParseFill(this.#argvStack!,this.#argvCall!));this.#call('100c0a0f.parseFillBody',()=>NativeX86ThreadStack.runSharedArgvParseFill(this.#argvStack!,this.#argvCall!,initializeLocale));}
  this.#argvStage='return';this.#argvReturned=this.#call('100c0c5f.setargvReturn',()=>NativeX86ThreadStack.returnSharedArgvFrame(this.#argvStack!,this.#argvCall!));return this.#argvReturned;

 }
 #initializeEnvironmentVector():number{
  this.#argvStage='environment';
  this.#setEnvpReturned=this.#call('100c092a.setenvpBody',()=>NativeX86ThreadStack.runSharedEnvironment(this.#argvStack!,this.#argvCall!,{
   calloc:(site,count,size)=>{
    const fields=this.#callocCrt(count,size);if(site==='100c096a')this.#environmentVector=fields;else if(site==='100c0998'){if(fields)this.#environmentStrings.push(fields);}else throw new Error('Unowned SharedBase environment allocation site');return fields;
   },
   free:pointer=>{
    if(pointer.offset!==0||(pointer.fields!==this.#environmentAllocation&&pointer.fields!==this.#environmentVector))throw new Error('Actual SharedBase environment free argument required');
    const span=NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(this.platform,this.#heap!,this.identity,pointer,pointer.fields.bytes.length);if(!span.known)throw new Error(span.reason);
    const freed=this.#call('setenvp.free.HeapFree',()=>this.platform.win32HeapFree(this.#heap!,0,pointer.fields.backing));if(!freed)throw new Error('Unowned SharedBase free errno mapping after HeapFree failure');
   },
  }));return this.#setEnvpReturned;
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
  this.#locals.set(this.#ioBlock,{backing:this.#ioBlock.backing,bytes:this.#ioBlock.bytes,masks:this.#ioBlock.knownMask,backingBytes:this.#ioBlock.backing.bytes,backingMasks:this.#ioBlock.backing.knownMask,view:this.#ioBlock.view});
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
   if(this.#initializeArgumentsPrefix()<0)throw new Error('Unowned SharedBase attach cleanup at 100adb6f');this.#call('100adb4f.setenvpCall',()=>NativeX86ThreadStack.beginSharedArgvEnvironment(this.#argvStack!,this.#argvCall!));if(this.#initializeEnvironmentVector()<0)throw new Error('Unowned SharedBase attach cleanup after setenvp at 100adb6f');this.#call('100adb5a.cinitCall',()=>NativeX86ThreadStack.beginSharedEnvironmentInitializers(this.#argvStack!,this.#argvCall!));this.#initializerActive=true;const returned=this.#call('100aa632.cinitBody',()=>NativeX86ThreadStack.runSharedInitializers(this.#argvStack!,this.#argvCall!));if(returned!==1)throw new Error('Original SharedBase CRT success return required');this.#attachReturned=returned;return {known:true,value:returned};
  }catch(error){this.#boundary??=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
  finally{this.#stackCall=null;this.#caseCall=null;this.#configurationCall=null;this.#setMultibyteCall=null;this.#argvCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllEntryPrefix():NativeValue<number>{
  if(this.#dllReturned!==null)return {known:true,value:this.#dllReturned};
  if(this.#dllBoundary)return {known:false,reason:this.#dllBoundary};
  if(this.#active||this.#attachReturned!==1||!this.#argvStack)return {known:false,reason:'Actual completed SharedBase CRT helper required before DLL entry'};
  try{
   const method=dllEntrySource.methods.find(item=>item.label==='sharedDllMain');
   if(dllEntrySource.inputSha256!==source.sharedBaseSha256||method?.bodyInstructionBytesSha256!=='c265cdb865a6c031f014ef57a5dc2a4e0354fd7f0dd9396b20925cf1737f6bab'||method.entryChain[0]?.bytes!=='e9b58b0900')throw new Error('Original SharedBase DLL entry source required');
   if(!this.#dllImages){const retained:Record<string,NativeHeapObjectViews>={};for(const [label,address] of [['dllInitializerGuard','102f48f0'],['dllInitializerObject','102f48ec']] as const){const receipt=dllEntrySource.coldImages.find(item=>item.label===label);if(receipt?.address!==address||receipt.bytes!=='00000000'||receipt.size!==4)throw new Error('Original cold DLL entry image required');const fields=this.#retainLocal(4);fields.writeUnsigned(0,0);retained[label]=fields;}const literal=dllEntrySource.coldImages.find(item=>item.label==='moduleName');if(literal?.address!=='100ebb14'||literal.bytes!=='736861726564626173652e646c6c00'||literal.size!==15)throw new Error('Original DLL version filename required');const moduleName=this.#retainLocal(15);for(let i=0;i<15;i++)moduleName.writeUnsigned(i,parseInt(literal.bytes.slice(i*2,i*2+2),16),1);this.#dllImages=Object.freeze({guard:retained.dllInitializerGuard!,object:retained.dllInitializerObject!,moduleName});}
   this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.runSharedDllEntryPrefix(this.#argvStack,this.#dllCall);
   if(result.known)this.#dllReturned=result.value;else this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 processDllInitializerPrefix():NativeValue<number>{
  if(this.#dllInitializerAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL initializer attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase DLL initializer pending at 10006645'||!this.#argvStack||!this.#dllImages)return {known:false,reason:'Actual pending DLL initializer call required'};
  this.#dllInitializerAttempted=true;
  try{
   const method=dllEntrySource.methods.find(item=>item.label==='sharedDllMainInitializer');if(method?.bodyInstructionBytesSha256!=='fab52ae52dd9781880acc72b282debbc8cebc903af2905bab60364fe5418882e'||method.entryChain[0]?.bytes!=='e946af0900')throw new Error('Original DLL initializer source required');
   this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.runSharedDllInitializerPrefix(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 processDllVersionQueryPrefix():NativeValue<number>{
  if(this.#dllVersionAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL version attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase DLL version query pending at 10008058'||!this.#argvStack||!this.#dllImages)return {known:false,reason:'Actual pending DLL version query required'};
  this.#dllVersionAttempted=true;
  try{
   const method=dllEntrySource.methods.find(item=>item.label==='dllVersionQuery');if(method?.bodyInstructionBytesSha256!=='edca895eb4ea4497983a7936f81f1c905e445a2158674f5b21e265f664575d98'||method.entryChain[0]?.bytes!=='e923450400')throw new Error('Original DLL version query source required');
   const receipt=dllEntrySource.imports.find(item=>item.iatVA==='0x102f96b0');if(receipt?.module!=='KERNEL32.dll'||receipt.name!=='lstrcpyA')throw new Error('Original DLL filename-copy import required');
   const procedure=Object.freeze({owner:this.identity,name:'lstrcpyA'}),slot=this.#retainLocal(4);slot.pointer(0).set(procedure);this.#dllLstrcpy=Object.freeze({slot,procedure});
   this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.runSharedDllVersionQueryPrefix(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 processDllFilenameCopy():NativeValue<number>{
  if(this.#dllFilenameAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL filename-copy attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase lstrcpyA pending at 1004c59f'||!this.#argvStack||!this.#dllLstrcpy)return {known:false,reason:'Actual pending DLL filename-copy import required'};
  this.#dllFilenameAttempted=true;
  try{this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.finishSharedDllFilenameCopy(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;}
  catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 processDllSpieFclose():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase SpieAdmin fclose pending at 1004b208')return {known:false,reason:this.#dllBoundary??'Actual pending original fclose required'};
  try{
   for(const [label,hash] of Object.entries({"dllSpieFclose": "a8eacde5a2c72f47d211974c86bad3b51e0c0ec209ab5cad22d36fe7d8d802c4", "dllSpieFcloseNoLock": "68ab2550ffaab8360ea0c924c51336d7a9ee19f6cec4f171d6c39bf22912c1dc", "dllSpieFcloseLock": "9ec5a6f0757fd9e243801bdbd262e1cc60f6ae000823c4e095a42781ea1dc7fe", "dllSpieFcloseCleanup": "5535dd41f5bf4e3af7c1718ab6fa1394330f5bc27914b171df5f053c4cefc6a5", "dllSpieFlushStream": "701aecf7f2e737b9a18598bd49964d413f496fc6b6bab12128906516cbac4cee", "dllSpieFreeStreamBuffer": "c847a2a28b89e763f91f60a496cf1e1d9671940ffbd6208118c0081d316601bd", "dllSpieStreamDescriptor": "e754c8dc34507956ba04a79a598953785578a86abe9e9e60358674ea00080cf9", "dllSpieClose": "a81accba11518376ebd46c37759fa5a5ece41318a910320cd94ba2a922b9ef42", "dllSpieCloseDescriptor": "d103185d7033dbe19dd5ec87946ecb6d53280686633e016e78e01b28e22bdaef", "dllSpieDescriptorHandle": "dc291bf6a309f9c7436ae3caa0898f5fcb6e32f000e01a9a07b102e248dc5ffd", "dllSpieClearDescriptorHandle": "83cbf6507e9e916196217eb9544b0f0c4cc985c1df0c9fa96259715332d7b3fd", "dllSpieLockDescriptor": "4d663c6cbe37a9978294789bf1f25f14e5f1e3dddedb79f2ea26601541d174dc", "dllSpieCloseCleanup": "7c10cfd4939605e743dff54a0e5058b2f835ffbf13690fcf0d0bbadff8bf1c1d"}))if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original fclose dependency source required');
   const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};
   for(const [address,raw] of Object.entries({"100f86d0": "feffffff00000000d4ffffff00000000feffffff00000000b2c80a10", "100f8d98": "feffffff00000000d0ffffff00000000feffffff0000000071f70b10", "100f8fa0": "feffffff00000000d4ffffff00000000feffffff000000005d0d0d10"})){const receipt=dllEntrySource.coldImages.find(row=>row.address===address);if(!receipt||receipt.size!==28||receipt.bytes!==raw)throw new Error('Original fclose scope bytes required');if(!retained[address]){const fields=this.#retainLocal(28);for(let i=0;i<28;i++)fields.writeUnsigned(i,parseInt(raw.slice(i*2,i*2+2),16),1);retained[address]=fields;}}
   const enabled=dllEntrySource.coldImages.find(row=>row.label==='dllSpieEnabled');if(!enabled||enabled.address!=='10197dbc'||enabled.size!==1||enabled.bytes!=='00')throw new Error('Original SpieAdmin enabled state required');if(!retained[enabled.address]){const fields=this.#retainLocal(1);fields.writeUnsigned(0,0,1);retained[enabled.address]=fields;}
   const receipt=dllEntrySource.imports.find(row=>row.iatVA==='0x102f95e8');if(!receipt||receipt.module!=='KERNEL32.dll'||receipt.name!=='CloseHandle')throw new Error('Original CloseHandle import receipt required');
   if(!retained['102f95e8']){const fields=this.#retainLocal(4);fields.pointer<object>(0).set(this.#initializerImports.spieCloseHandleProcedure);retained['102f95e8']=fields;}
   this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-spie-fclose');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSpieCreateFile():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase CreateFileA return pending at 100d1372')return {known:false,reason:this.#dllBoundary??'Actual pending original CreateFileA required'};
  try{
   for(const [label,hash] of Object.entries({"dllSpieUnlockFile":"946ba8fdf39e5d66ab45abcea3e8e81005ee7ad2b7e6b3c390f543d28f58d2a3","dllSpieFopenCleanup":"96bf77eb069773d18cf3ec2a403a030290edef4e4fad56c23ae89a824a7e57b2","dllSpieOpenCleanup":"a27407f19847dec3a9becdac5af36c76888f38f0f2a709f7bef4c6f92d05af68","dllSpieMapWin32Error": "fa7c4ff8482dc481c034bcd928c04fc975c424b3c07688dcf6ff0207e0f36b98", "dllSpieDosErrno": "332893a77e1127ad602a9e43a4f7e893fdfc2c3b5d7e3d0eff651c579c66b2fb", "dllSpieErrorToErrno": "cde234062cefe63e2cbd7ec2bb34e9be1de8c24c896042dfb740b4d1bf08d2f6", "dllSpiePtdLower": "1887dade0a77296429fcade67c66dcf45022ddf923c828447a8d306aa865773d", "dllSpiePtdProvider": "4abdc2792dd07d9b9a335efbc64d066396a8035bf668fa9f806a8537ae72020e", "dllSpieUnlockDescriptor": "25edc02aa332b861d47a6b21041d5fe6a274421048b17b52899bbb96aa452ef3", "dllSpieSetDescriptorHandle": "627a1b90c178267b6dfb3210fa8c8ae77ef175d585c9110f7427764c1a86a26f"}))if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original file-open result and cleanup source required');
   const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages,'102f7068':this.imageStorage('ioHandleCount')};
   for(const label of ['dllSpieErrorMap','dllSpieApplicationType']){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.size!==(label==='dllSpieErrorMap'?360:4)||receipt.address!==(label==='dllSpieErrorMap'?'10140bd8':'102f649c')||receipt.bytes!==(label==='dllSpieErrorMap'?"0100000016000000020000000200000003000000020000000400000018000000050000000d0000000600000009000000070000000c000000080000000c000000090000000c0000000a000000070000000b000000080000000c000000160000000d000000160000000f00000002000000100000000d00000011000000120000001200000002000000210000000d0000003500000002000000410000000d00000043000000020000005000000011000000520000000d000000530000000d0000005700000016000000590000000b0000006c0000000d0000006d00000020000000700000001c00000072000000090000000600000016000000800000000a000000810000000a00000082000000090000008300000016000000840000000d00000091000000290000009e0000000d000000a100000002000000a40000000b000000a70000000d000000b700000011000000ce00000002000000d70000000b000000180700000c000000":'00000000'))throw new Error('Original file-open static state required');if(!retained[receipt.address]){const fields=this.#retainLocal(receipt.size);for(let i=0;i<receipt.size;i++)fields.writeUnsigned(i,parseInt(receipt.bytes.slice(i*2,i*2+2),16),1);retained[receipt.address]=fields;}}
   for(const [address,name,procedure] of [['102f9780','GetLastError',this.#initializerImports.spieGetLastErrorProcedure],['102f977c','SetLastError',this.#initializerImports.spieSetLastErrorProcedure],['102f96bc','GetFileType',this.#initializerImports.spieGetFileTypeProcedure]] as const){const receipt=dllEntrySource.imports.find(row=>row.iatVA==='0x'+address);if(!receipt||receipt.module!=='KERNEL32.dll'||receipt.name!==name)throw new Error('Original file-open platform import receipt required');if(!retained[address]){const fields=this.#retainLocal(4);fields.pointer<object>(0).set(procedure);retained[address]=fields;}}
   this.#dllFormatImages=Object.freeze(retained);
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-spie-create-file');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSpieInitDescriptorSection():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase descriptor section initialization pending at 100bbf27')return {known:false,reason:this.#dllBoundary??'Actual pending descriptor section initialization required'};
  try{
   for(const [label,hash] of Object.entries({"dllSpieInitDescriptorSection": "f73b38791ad720df5bc93afb51a63f39e6f0b3f93553464dd7b1e7fbdd27d5f5", "dllSpieFallbackDescriptorSection": "d52356eb1c51d45fa27441a08bc7fadd57a2f9a2ceea101dd7072a0a5678e542"}))if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original descriptor section initializer source required');
   const receipt=dllEntrySource.coldImages.find(row=>row.label==='dllSpieDescriptorSectionScope'),raw='feffffff00000000ccffffff00000000feffffffadbf0b10c4bf0b10';if(!receipt||receipt.address!=='100f8d18'||receipt.size!==28||receipt.bytes!==raw)throw new Error('Original descriptor section scope required');
   const fileImport=dllEntrySource.imports.find(row=>row.iatVA==='0x102f9660');if(!fileImport||fileImport.module!=='KERNEL32.dll'||fileImport.name!=='CreateFileA')throw new Error('Original descriptor CreateFileA import required');
   const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages,'102f6ac0':this.imageStorage('pointer6ac0')};if(!retained['100f8d18']){const fields=this.#retainLocal(28);for(let i=0;i<28;i++)fields.writeUnsigned(i,parseInt(raw.slice(i*2,i*2+2),16),1);retained['100f8d18']=fields;}if(!retained['102f9660']){const fields=this.#retainLocal(4);fields.pointer<object>(0).set(this.#initializerImports.spieCreateFileProcedure);retained['102f9660']=fields;}this.#dllFormatImages=Object.freeze(retained);
   this.#descriptorSectionCache=this.imageStorage('pointer6ac0').pointer<object>(0).get();this.#descriptorSectionProcedure=null;
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-spie-init-descriptor-section');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSpieAllocateDescriptor():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase CRT descriptor allocation pending at 100d0d8d')return {known:false,reason:this.#dllBoundary??'Actual pending CRT descriptor allocation required'};
  try{
   for(const [label,hash] of Object.entries({"dllSpieAllocateDescriptor": "c49ca2cee177354f0c891a38dde5621a0fcaaf4c05fb521bc046f1265720d29a", "dllSpieDescriptorUnlockInit": "e327f6b34b4d7a0c7be3f20ac0a23fc8aa5cdbd06f13d18273a4eb3f59daa630", "dllSpieDescriptorUnlockTable": "b55e98739f9a142ec7afc55323257603f4f53015fadb4caa0710791cb68a35ac"}))if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original CRT descriptor source required');
   const receipt=dllEntrySource.coldImages.find(row=>row.label==='dllSpieDescriptorScope'),raw='feffffff00000000c8ffffff00000000feffffff00000000230f0d10';
   if(!receipt||receipt.address!=='100f8fc0'||receipt.size!==28||receipt.bytes!==raw)throw new Error('Original CRT descriptor scope image required');
   if(!this.#dllFormatImages['100f8fc0']){const fields=this.#retainLocal(28);for(let i=0;i<28;i++)fields.writeUnsigned(i,parseInt(raw.slice(i*2,i*2+2),16),1);this.#dllFormatImages=Object.freeze({...this.#dllFormatImages,'100f8fc0':fields});}
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-spie-allocate-descriptor');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSpieSharedOpen():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase CRT shared file-open pending at 100d1a2d')return {known:false,reason:this.#dllBoundary??'Actual pending CRT shared file-open required'};
  try{
   for(const [label,hash] of Object.entries({"dllSpieSharedOpen": "4bdb796fd6071478876f7b84259bc1759b10712ddbe9ac6a60f251a3287fd594", "dllSpieOpenDispatch": "b175b1e3de2cf658ddd42fac9d56567421a1bf3ff55bc5decdae45a69fe93fa6", "dllSpieOpenCore": "f99f7d19ace7f0cb43876c88d5e12c2697cce6df5e0c417c4db58da0a9c75404", "dllSpieFileModeGet": "20f2e5d8e994dbf755884848317fd004249656dc31e6e93f854f3f7b5ce733af", "dllSpiePlatformGet": "cc5b7331299d47cd8f5d5cb850aa67581d71d5bd370b6aeba4f41feed3edf68d"}))if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original CRT shared file-open source required');
   const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages,'102f642c':this.imageStorage('osFields')};
   for(const [label,address,size,raw] of [['dllSpieSharedOpenScope','100f9048',28,'feffffff00000000ccffffff00000000feffffff00000000ca190d10'],['dllSpieDefaultFileMode','102f7048',4,'00000000']] as const){
    const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||receipt.size!==size||receipt.bytes!==raw)throw new Error('Original CRT shared file-open cold image required');
    if(!retained[address]){const fields=this.#retainLocal(size);for(let i=0;i<size;i++)fields.writeUnsigned(i,parseInt(raw.slice(i*2,i*2+2),16),1);retained[address]=fields;}
   }
   this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-spie-shared-open');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSpieAcquireStream():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase CRT stream acquisition pending at 100bfd6f')return {known:false,reason:this.#dllBoundary??'Actual pending CRT stream acquisition required'};
  try{for(const [label,hash] of Object.entries({"dllSpieAcquireStream": "2ebf426d5c285b6bc0581e118f18b007559e0b1b3cdc21e622cf2d5c0a78452d", "dllSpieOpenStream": "7a14a37389613ecd6d88096728ec9e7a0dee6a0977bcce6b133b9a933d3ab6f8", "dllSpieLockFile": "773eff6a380c4e8f06f3afa641892ccbae136dd7929ebc08f1a399151bb6da53", "dllSpieStreamUnlock": "1518afa1b4db94973a2dc6478075d261d710ca8773c4c2d5459966c9b3630821"})){if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original CRT stream source required');}const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};for(const [label,address,size,raw] of [['dllSpieStreamScope','100f8e20',28,'feffffff00000000d0ffffff00000000feffffff0000000093fe0b10'],['dllSpieCommitMode','102f6f88',4,'00000000'],['dllSpieOpenedFileCount','102f6ad4',4,'00000000']] as const){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||receipt.size!==size||receipt.bytes!==raw)throw new Error('Original CRT stream cold image required');if(!retained[address]){const fields=this.#retainLocal(size);for(let i=0;i<size;i++)fields.writeUnsigned(i,parseInt(raw.slice(i*2,i*2+2),16),1);retained[address]=fields;}}this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-spie-acquire-stream');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageSpieStartup():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase SpieAdmin getter pending at 10001334')return {known:false,reason:this.#dllBoundary??'Actual pending SpieAdmin getter required'};
  try{for(const [label,hash] of Object.entries({"dllMessageSpieGet": "14ff0bab5aff875376d96e0721fb426399c1beb471520b74bd7569e14de69cf1", "dllMessageSpieCreate": "4cad27aa8534302f1cdbf084690ab187c086e8b79f91f03f60240026d132c31d", "dllSpieFopen": "642e2c2db07c596280a886eb3549a162bfceae12fe766393bbd41f04e507f468", "dllSpieOpenFile": "e750109fcb0e3553342726718f4bc737e5b20ec7b8ccd4e40536ab267d2db9cf"})){if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original SpieAdmin source required');}const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};for(const [label,address,size,raw] of [['dllSpieState','10197dc0',28,'00'.repeat(28)],['dllSpieGuard','10197de4',4,'00000000'],['dllSpieFilename','100e8088',10,'7a537069652e74787400'],['dllSpieFileMode','100e8094',2,'7200'],['dllSpieOpenFileScope','100f8730',28,'feffffff00000000d4ffffff00000000feffffff0000000089cc0a10']] as const){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||receipt.size!==size||receipt.bytes!==raw)throw new Error('Original SpieAdmin cold image required');if(!retained[address]){const fields=this.#retainLocal(size);for(let i=0;i<size;i++)fields.writeUnsigned(i,parseInt(raw.slice(i*2,i*2+2),16),1);retained[address]=fields;}}this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-spie-startup');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSpieTerminate():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=="Original SharedBase SpieAdmin termination registration pending at 1004afc7")return {known:false,reason:this.#dllBoundary??'Actual pending shutdown registration required'};
  try{const receipt=dllEntrySource.coldImages.find(row=>row.label==="dllSpieShutdownCallback");if(!receipt||receipt.address!=="100e2830"||receipt.size!==71||receipt.bytes!=="51a1d87d191083f8ff74146a006a018d4c240b5150c644241301e89d2fffff6822570010e85b60f2ff8bc8e8c1f3f1ff68c07d1910c705d87d1910ffffffffff15f8952f1059c3")throw new Error('Original shutdown registration callback bytes required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,"dll-spie-terminate");if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageTerminate():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=="Original SharedBase MessageAdmin termination registration pending at 100497a8")return {known:false,reason:this.#dllBoundary??'Actual pending shutdown registration required'};
  try{const receipt=dllEntrySource.coldImages.find(row=>row.label==="dllMessageShutdownCallback");if(!receipt||receipt.address!=="100e27d0"||receipt.size!==51||receipt.bytes!=="833d6c7d191000740a686c7d1910e8c003f2ff68707d1910c705887d191001000000c7056c7d191000000000ff15f8952f10c3")throw new Error('Original shutdown registration callback bytes required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,"dll-message-terminate");if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageSpyTerminate():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase SpyAdmin termination registration pending at 100a72d0')return {known:false,reason:this.#dllBoundary??'Actual pending SpyAdmin termination registration required'};
  try{this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-spy-terminate');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageSpyCreate():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase SpyAdmin construction pending at 100089e5')return {known:false,reason:this.#dllBoundary??'Actual pending SpyAdmin constructor required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllMessageSpyCreate')?.bodyInstructionBytesSha256!=='cdc312dbfd49131fc862e9157120f3737d3fa2a58c1f98b6a14798eefe21579d')throw new Error('Original SpyAdmin constructor source required');const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};const title=dllEntrySource.coldImages.find(row=>row.label==='dllSpyWindowTitle');if(!title||title.address!=='100e8114'||title.bytes!=='5b7a5370795d00')throw new Error('Original SpyAdmin window title required');const literal=this.#retainLocal(7);for(let i=0;i<7;i++)literal.writeUnsigned(i,parseInt(title.bytes.slice(i*2,i*2+2),16),1);retained['100e8114']=literal;const imported=dllEntrySource.imports.find(row=>row.iatVA==='0x102f98b4');if(imported?.name!=='FindWindowA'||imported.module!=='USER32.dll')throw new Error('Original SpyAdmin window import required');const slot=this.#retainLocal(4);slot.pointer(0).set(this.#initializerImports.spyFindWindowProcedure);retained['102f98b4']=slot;this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-spy-create');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageSpyGet():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase SpyAdmin getter pending at 10008b11')return {known:false,reason:this.#dllBoundary??'Actual pending SpyAdmin getter required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllMessageSpyGet')?.bodyInstructionBytesSha256!=='a84a8918b5ec4d8aae1a2256de9eb9c5ba93cc1c25e3ceea40c9b74232d5af21')throw new Error('Original SpyAdmin getter source required');const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};for(const [label,address,size] of [['dllSpyState','101ab11c',32],['dllSpyGuard','101ab144',4]] as const){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||receipt.size!==size||receipt.bytes!=='00'.repeat(size))throw new Error('Original SpyAdmin cold image required');if(!retained[address]){const fields=this.#retainLocal(size);for(let offset=0;offset<size;offset++)fields.writeUnsigned(offset,0,1);retained[address]=fields;}}this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-spy-get');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageErrorTerminate():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase ErrorAdmin termination registration pending at 100a72d0')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin termination registration required'};
  try{const receipt=dllEntrySource.coldImages.find(row=>row.label==='dllErrorShutdownSource');if(!receipt||receipt.address!=='100e2770'||receipt.size!==22||receipt.bytes!=='b9582a1410e84a0bf2ff68602a1410ff15f8952f10c3')throw new Error('Original ErrorAdmin shutdown source required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-error-terminate');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllErrorLogFormatting():NativeValue<number>{
  if(this.#active||!this.#argvStack||!this.#messageSectionHeld||this.#dllBoundary!=='Original SharedBase ErrorAdmin log formatting pending at 10022632')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin log allocation required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllErrorMessageCallback')?.bodyInstructionBytesSha256!=="4096e3eb10be742a8aa99e4ac1ff0982a43d031cdaf89771fef4263ffa906243")throw new Error('Original ErrorAdmin log callback bytes required');const receipt=dllEntrySource.coldImages.find(row=>row.label==='dllErrorFormatSource');if(!receipt||receipt.address!=='100e7104'||receipt.bytes!=='25732c205a3a232564202d3e202725732700')throw new Error('Original ErrorAdmin format bytes required');const retained=this.#dllFormatImages['100e7104'];if(retained){this.#requireLocal(retained);for(let offset=0;offset<receipt.size;offset++)if(retained.readUnsigned(offset,1)!==parseInt(receipt.bytes.slice(offset*2,offset*2+2),16))throw new Error('Actual retained original ErrorAdmin format bytes required');}else{const fields=this.#retainLocal(receipt.size);for(let offset=0;offset<receipt.size;offset++)fields.writeUnsigned(offset,parseInt(receipt.bytes.slice(offset*2,offset*2+2),16),1);this.#dllFormatImages=Object.freeze({...this.#dllFormatImages,'100e7104':fields});}this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-error-log-formatting');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllErrorLogInsertion():NativeValue<number>{
  if(this.#active||!this.#argvStack||!this.#messageSectionHeld||this.#dllBoundary!=='Original SharedBase ErrorAdmin log insertion pending at 10022680')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin log allocation required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllErrorMessageCallback')?.bodyInstructionBytesSha256!=="4096e3eb10be742a8aa99e4ac1ff0982a43d031cdaf89771fef4263ffa906243")throw new Error('Original ErrorAdmin log callback bytes required');const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};for(const [label,address] of [['dllErrorLogScratch','10143ef8'],['dllErrorLogDiscard','10144028']] as const){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||receipt.size!==250||receipt.bytes!=='00'.repeat(250))throw new Error('Original ErrorAdmin ring scratch bytes required');if(!retained[address]){const image=NativeSharedModuleImage.forPlatform(this.platform);if(!image.known)throw new Error(image.reason);const acquired=image.value.errorLogScratch(label);if(!acquired.known)throw new Error(acquired.reason);const fields=acquired.value,backing=fields.backing;this.#locals.set(fields,{backing,bytes:fields.bytes,masks:fields.knownMask,backingBytes:backing.bytes,backingMasks:backing.knownMask,view:fields.view});retained[address]=fields;}}this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-error-log-insertion');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllVersionLogFormatting():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#messageSectionHeld||this.#dllBoundary!=='Original SharedBase DLL version formatting pending at 10049871')return {known:false,reason:this.#dllBoundary??'Actual pending DLL version formatter required'};
  try{
   if(dllEntrySource.methods.find(row=>row.label==='dllVersionVsprintfCore')?.bodyInstructionBytesSha256!=='01a8e501079dfbac7738c12afe584792b8ec8feecdbcac4a70a16d3077ac389e')throw new Error('Original version formatter bytes required');
   const receipt=dllEntrySource.coldImages.find(row=>row.label==='versionFormat'),raw='476f7468696333202852454c454153452920536861726564626173653a2020436f6d70696c6576657273696f6e3a2025642e25642e25642020285265762e202564290000000000000000000000000000';
   if(!receipt||receipt.address!=='100eba68'||receipt.size!==80||receipt.bytes!==raw)throw new Error('Original DLL version format required');
   if(!this.#dllFormatImages[receipt.address]){const fields=this.#retainLocal(receipt.size);for(let i=0;i<receipt.size;i++)fields.writeUnsigned(i,parseInt(raw.slice(i*2,i*2+2),16),1);this.#dllFormatImages=Object.freeze({...this.#dllFormatImages,[receipt.address]:fields});}
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-version-log-formatting');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllVersionLogTls():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#messageSectionHeld||this.#dllBoundary!=='Original SharedBase DLL version log pending at 100a15ed')return {known:false,reason:this.#dllBoundary??'Actual pending DLL version logger required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllLogVersion')?.bodyInstructionBytesSha256!=='c8c9e92a7f25fe38456199d61cedbcaac9c39e8db26e2a6b9529fe5599d2316b')throw new Error('Original version logger bytes required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-version-log-tls');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSpyLogCallback():NativeValue<number>{
  if(this.#active||!this.#argvStack||!this.#messageSectionHeld||this.#dllBoundary!=='Original SharedBase SpyAdmin log callback pending at 100494db')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin log allocation required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllSpyMessageCallback')?.bodyInstructionBytesSha256!=="bf793a2070bbadd380eaf64eaabf03dd332ced20540f85cad5637129980c4814")throw new Error('Original SpyAdmin callback bytes required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-spy-log-callback');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllErrorLogAllocation():NativeValue<number>{
  if(this.#active||!this.#argvStack||!this.#messageSectionHeld||this.#dllBoundary!=='Original SharedBase ErrorAdmin log allocation pending at 10022613')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin log allocation required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllErrorMessageCallback')?.bodyInstructionBytesSha256!=="4096e3eb10be742a8aa99e4ac1ff0982a43d031cdaf89771fef4263ffa906243")throw new Error('Original ErrorAdmin log callback bytes required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-error-log-allocation');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllErrorLogCallback():NativeValue<number>{
  if(this.#active||!this.#argvStack||!this.#messageSectionHeld||this.#dllBoundary!=='Original SharedBase ErrorAdmin log callback pending at 100494db')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin logger callback required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllErrorMessageCallback')?.bodyInstructionBytesSha256!=="4096e3eb10be742a8aa99e4ac1ff0982a43d031cdaf89771fef4263ffa906243")throw new Error('Original ErrorAdmin log callback bytes required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-error-log-callback');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageLog():NativeValue<number>{
  if(this.#active||!this.#argvStack||!['Original SharedBase MessageAdmin initialization log pending at 1004980f','Original SharedBase version MessageAdmin log pending at 10049894'].includes(this.#dllBoundary??''))return {known:false,reason:this.#dllBoundary??'Actual pending original log submission required'};
  try{for(const [label,hash] of Object.entries({"dllLogSubmit": "7401716b5a0dd3a5cd86ab316949606758774ca9753ed58ddb65a80b3fef1df5", "dllLogDispatch": "f35fbf5c98f3545ee0ee373b3d99d95baf789f55adb75f110a4f55cf3dff23b4"}))if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original logger submission and dispatch source required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-log');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSpieRegister():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase SpieAdmin callback registration pending at 1004b226')return {known:false,reason:this.#dllBoundary??'Actual pending SpieAdmin callback registration required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllMessageRegister')?.bodyInstructionBytesSha256!=='4be20dc87cc964adfa7cfa563b44f9f1532a616c8356890527e487afd6777a69')throw new Error('Original MessageAdmin callback source required');if(dllEntrySource.methods.find(row=>row.label==='dllMessageReserve')?.bodyInstructionBytesSha256!=='73b609166cecc4aa9a10a3745508a9310d974c86345588fad544207b8242771d')throw new Error('Original MessageAdmin callback source required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-spie-register');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageErrorRegister():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase ErrorAdmin callback registration pending at 10007cac')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin callback registration required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllMessageRegister')?.bodyInstructionBytesSha256!=='4be20dc87cc964adfa7cfa563b44f9f1532a616c8356890527e487afd6777a69')throw new Error('Original MessageAdmin callback source required');if(dllEntrySource.methods.find(row=>row.label==='dllMessageReserve')?.bodyInstructionBytesSha256!=='73b609166cecc4aa9a10a3745508a9310d974c86345588fad544207b8242771d')throw new Error('Original MessageAdmin callback source required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-error-register');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageErrorBuffer():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase ErrorAdmin buffer allocation pending at 10004133')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin buffer allocation required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllErrorBufferMalloc')?.bodyInstructionBytesSha256!=='135f2bbb1c7962ce6da1081d7c71f4533f38fee8e74e49d9b83250e78d9dc75e')throw new Error('Original variable-pool source required');if(dllEntrySource.methods.find(row=>row.label==='dllErrorBufferHeapAllocate')?.bodyInstructionBytesSha256!=='e447d575bf8850ff28e23daad6f292d728c00bba796d73cfb63f0e76c8d97d96')throw new Error('Original variable-pool source required');if(dllEntrySource.methods.find(row=>row.label==='dllLargePoolDispatch')?.bodyInstructionBytesSha256!=='334a0d88b9613311eb45d6986debdbe290fbc089ad6911afc23b5fc4684d5a92')throw new Error('Original variable-pool source required');if(dllEntrySource.methods.find(row=>row.label==='dllLargePoolInitialize')?.bodyInstructionBytesSha256!=='14b0ae59456c636b302e67b3148a77b94156d417f095404db476db5aa5c12e17')throw new Error('Original variable-pool source required');const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};for(const [label,address,size,raw] of [['dllErrorBufferScope','100f8338',12,'ffffffff39d9031043d90310'],['dllLargePoolBins','10144214',0x4004,'00'.repeat(0x4004)],['dllLargePoolRegionFirst','10148218',4,'00000000'],['dllLargePoolRegionCount','102fb04c',4,'00000000']] as const){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||receipt.size!==size||receipt.bytes!==raw)throw new Error('Original variable-pool cold image required');if(!retained[address]){const fields=this.#retainLocal(size);for(let offset=0;offset<size;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);retained[address]=fields;}}this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-error-buffer');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageErrorCreate():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase ErrorAdmin construction pending at 10001db1')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin constructor required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllErrorCreate')?.bodyInstructionBytesSha256!=='8cd73bbf50ca3f2e7e3d2ad88c675acd8e3ce7d9c67f0a56249845e28371f1ad')throw new Error('Original ErrorAdmin construction source required');if(dllEntrySource.methods.find(row=>row.label==='dllErrorInvalidate')?.bodyInstructionBytesSha256!=='7c9c02fe1d2e0fde523c38c86e1f1cd675a7ef9bf27c890bce6e0142d291deec')throw new Error('Original ErrorAdmin construction source required');if(dllEntrySource.methods.find(row=>row.label==='dllMessageRemove')?.bodyInstructionBytesSha256!=='e45d31295928c36bd4124178cdaa82d5bf2f118d028f0ebf2d615f00cd34e5f2')throw new Error('Original ErrorAdmin construction source required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-error-create');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageErrorGet():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase MessageAdmin ErrorAdmin initialization pending at 10006c1c')return {known:false,reason:this.#dllBoundary??'Actual pending ErrorAdmin getter required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='dllMessageErrorGet')?.bodyInstructionBytesSha256!=='8d05f078501985b05ac39828d04d2e19bee5e312340f6286f1b3e3b1a3ed8ead')throw new Error('Original ErrorAdmin getter source required');const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};for(const [label,address,size] of [['dllErrorState','10142a58',44],['dllErrorGuard','10142a8c',4]] as const){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||receipt.size!==size||receipt.bytes!=='00'.repeat(size))throw new Error('Original ErrorAdmin cold image required');if(!retained[address]){const fields=this.#retainLocal(size);fields.bytes.fill(0);fields.knownMask.fill(255);retained[address]=fields;}}this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-error-get');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageHolder():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase MessageAdmin holder allocation pending at 100010e1')return {known:false,reason:this.#dllBoundary??'Actual pending MessageAdmin holder allocation required'};
  try{this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-holder');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMessageCreate():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase MessageAdmin critical-section initialization pending at 10049775')return {known:false,reason:this.#dllBoundary??'Actual pending MessageAdmin section initialization required'};
  try{this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-message-create');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllSeparatorPrefix():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase DLL separator logging pending at 1000840e')return {known:false,reason:this.#dllBoundary??'Actual pending DLL separator logger required'};
  try{
   const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages};for(const [label,address,raw] of [['dllMessageState','10197d6c','00'.repeat(32)],['dllMessageGuard','10197d94','00000000'],['separator','100ebab8',null],['dllLogSourceFile','100e7df8','2e5c6b65726e656c5c67655f6d6573736167652e63707000']] as const){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||raw!==null&&receipt.bytes!==raw)throw new Error('Original DLL logging image required');if(!retained[address]){const fields=this.#retainLocal(receipt.size);for(let offset=0;offset<receipt.size;offset++)fields.writeUnsigned(offset,parseInt(receipt.bytes.slice(offset*2,offset*2+2),16),1);retained[address]=fields;}}
   if(dllEntrySource.methods.find(row=>row.label==='dllLogMessage')?.bodyInstructionBytesSha256!=='9e789d649b2c759724d59dd26db01b4bf14f888443a1610f8360983ce0b8fed0')throw new Error('Original MessageAdmin getter source required');this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-separator-logging');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllVersionFree():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase outer version buffer Free pending at 10002112')return {known:false,reason:this.#dllBoundary??'Actual pending outer version buffer Free required'};
  try{this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-version-free');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllVersionInteger():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase first version integer conversion pending at 100a7942')return {known:false,reason:this.#dllBoundary??'Actual pending version integer conversion required'};
  try{for(const [label,hash] of [["versionStrtok","79830db82e9b2f3516cddc92759789678362fee7728b7a91c2dfb50ec744fc43"],["versionAtoi","4a89600ac4a811c213657672a3b8df46e3ecabb7eeb422e273539a8976410392"],["versionStrtol","1424e3b371cef24dade24945596344d54217f3862382cec2f05b60d11c97be9d"],["versionIntegerScanner","1f1de4563d5c7866a5df81523b725cac7b1224872622aa31ddc7be7706798e51"]] as const)if(dllEntrySource.methods.find(row=>row.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original version integer parser source required');const retained:Record<string,NativeHeapObjectViews>={...this.#dllFormatImages,'10140e60':this.imageStorage('initialMultibyte')};for(const [label,address,raw] of [['versionLocaleChanged','102f692c','00000000'],['versionInitialLocalePair','10141470','90131410600e1410']] as const){const receipt=dllEntrySource.coldImages.find(row=>row.label===label);if(!receipt||receipt.address!==address||receipt.bytes!==raw)throw new Error('Original version locale image required');if(!retained[address]){const fields=this.#retainLocal(receipt.size);for(let offset=0;offset<receipt.size;offset++)fields.writeUnsigned(offset,parseInt(raw.slice(offset*2,offset*2+2),16),1);retained[address]=fields;}}this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-version-integer');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllVersionToken():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase version tokenizer pending at 100acd00')return {known:false,reason:this.#dllBoundary??'Actual pending version tokenizer required'};
  try{if(dllEntrySource.methods.find(row=>row.label==='versionStrtok')?.bodyInstructionBytesSha256!=='79830db82e9b2f3516cddc92759789678362fee7728b7a91c2dfb50ec744fc43')throw new Error('Original version strtok source required');this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-version-token');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllLanguageReturn():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase language cleanup returned at 1004c3f5')return {known:false,reason:this.#dllBoundary??'Actual completed language cleanup required'};
  try{const receipt=dllEntrySource.coldImages.find(row=>row.label==='versionDelimiter');if(!receipt||receipt.address!=='100e820c'||receipt.bytes!=='2c00')throw new Error('Original version delimiter required');const fields=this.#retainLocal(receipt.size);for(let offset=0;offset<receipt.size;offset++)fields.writeUnsigned(offset,parseInt(receipt.bytes.slice(offset*2,offset*2+2),16),1);this.#dllFormatImages=Object.freeze({...this.#dllFormatImages,'100e820c':fields});this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-language-return');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllLanguageFree():NativeValue<number>{
  if(this.#active||!this.#argvStack||this.#dllBoundary!=='Original SharedBase language buffer Free pending at 10002112')return {known:false,reason:this.#dllBoundary??'Actual pending language buffer Free required'};
  try{
   const receipt=dllEntrySource.coldImages.find(row=>row.label==='versionMemoryFreeScope');if(!receipt||receipt.address!=='100f82e8'||receipt.size!==12||receipt.bytes!=='ffffffffdecb0310e8cb0310')throw new Error('Original MemoryAdmin Free scope required');
   const scope=this.#retainLocal(12);for(let offset=0;offset<12;offset++)scope.writeUnsigned(offset,parseInt(receipt.bytes.slice(offset*2,offset*2+2),16),1);this.#dllFormatImages=Object.freeze({...this.#dllFormatImages,'100f82e8':scope});
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-language-free');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllFileVersionQuery():NativeValue<number>{
  if(this.#dllFileVersionAttempted)return {known:false,reason:this.#dllBoundary??'Retained FileVersion query attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase FileVersion resource query pending at 100d55d6'||!this.#argvStack||!this.#dllResourceQuery)return {known:false,reason:'Actual pending FileVersion query required'};
  this.#dllFileVersionAttempted=true;
  try{this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const returned=NativeX86ThreadStack.finishSharedDllTranslationQuery(this.#argvStack,this.#dllCall,'fileVersion');const result=returned.known?NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-language-version-copy'):returned;if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllTranslatedOutput():NativeValue<number>{
  if(this.#dllTranslatedOutputAttempted)return {known:false,reason:this.#dllBoundary??'Retained translated output attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase translated query formatter pending at 100aa234'||!this.#argvStack||!this.#dllResourceQuery)return {known:false,reason:'Actual pending translated formatter required'};
  this.#dllTranslatedOutputAttempted=true;
  try{
   const pins={"outputUnsignedDivide":"106b501e819fc91bbe63e9d1399d58966a0ad64e9db30078334ccdf21f01fdf8","outputPad":"f2a20142414876bfd7fb62ec898d3553b0cffeadbb8bb0599db761b2598e3612","outputString":"819d17b60a924294ef34c8d753acba515b9ab58e6235551795c9ab0a61e79710"};for(const [label,hash] of Object.entries(pins))if(dllEntrySource.methods.find(m=>m.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original hexadecimal output dependency required: '+label);
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-language-translated-output');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllTranslationQuery():NativeValue<number>{
  if(this.#dllTranslationAttempted)return {known:false,reason:this.#dllBoundary??'Retained translation query attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase translation resource query pending at 100d55d6'||!this.#argvStack||!this.#dllLanguageFormatImages)return {known:false,reason:'Actual pending translation resource query required'};
  this.#dllTranslationAttempted=true;
  try{
   const receipt=dllEntrySource.versionImportThunks.find(i=>i.address==='100d55d6');if(receipt?.bytes!=='ff25f4982f10'||receipt.import.iatVA!=='0x102f98f4'||receipt.import.module!=='VERSION.dll'||receipt.import.name!=='VerQueryValueA')throw new Error('Original version query import thunk required');
   const literal=dllEntrySource.coldImages.find(i=>i.label==='translatedVersionQuery');if(literal?.address!=='100e81b4'||literal.size!==45||literal.bytes!=='5c537472696e6746696c65496e666f5c253032582530325825303258253032585c46696c6556657273696f6e00')throw new Error('Original translated version query format required');
   const format=this.#retainLocal(literal.size);for(let i=0;i<literal.size;i++)format.writeUnsigned(i,parseInt(literal.bytes.slice(i*2,i*2+2),16),1);this.#dllFormatImages=Object.freeze({...this.#dllFormatImages,'100e81b4':format});
   const selected=NativeSharedVersionResource.forPlatform(this.platform,'recorded-sharedbase-ansi-version-buffer');if(!selected.known)throw new Error(selected.reason);
   const slot=this.#retainLocal(4),procedure=Object.freeze({owner:this.identity,name:'VerQueryValueA'});slot.pointer(0).set(procedure);
   this.#dllResourceQuery=Object.freeze({slot,procedure,query:(input:NativeBytePointer,path:string,site:'1004c330'|'1004c3a0')=>{if(!this.#active||!this.#initializerActive||!['1004c330','1004c3a0'].includes(site))throw new Error('Actual version resource query caller required');return this.#call(site+'.VerQueryValueA',()=>selected.value.query(input,path));}});
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const returned=NativeX86ThreadStack.finishSharedDllTranslationQuery(this.#argvStack,this.#dllCall);
   const result=returned.known?NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-language-translation'):returned;if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllLanguageOutput():NativeValue<number>{
  if(this.#dllLanguageOutputAttempted)return {known:false,reason:this.#dllBoundary??'Retained language output attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase query output engine pending at 100b5355'||!this.#argvStack||!this.#dllLanguageFormatImages)return {known:false,reason:'Actual pending query output engine required'};
  this.#dllLanguageOutputAttempted=true;
  try{
   const pins={formattedOutputEngine:'b4cea1685c86d396c8b2298308b5b521c8185f73d5c2d9eda5a92aa7c9ef686b',outputLocale:'afbb832a9811913fd67febefb9e9a53acafe8103a68bc6032044e6d7c6a6daf8',outputIsLeadByte:'f85592fe25afe268c840c8ab60d57c989dcd3f6714327f59eeca3a6ead8c24fb',outputByte:'c2d5b4179300d20e53435764e394c5c711e7132d68cee2b08bc9c1aab9eafc4e'};
   for(const [label,hash] of Object.entries(pins))if(dllEntrySource.methods.find(m=>m.label===label)?.bodyInstructionBytesSha256!==hash)throw new Error('Original language output dependency required: '+label);
   const retained:Record<string,NativeHeapObjectViews>={'101ab190':this.#dllLanguageFormatImages.output,'100e81ec':this.#dllLanguageFormatImages.translation,'10141390':this.imageStorage('initialLocale'),'10141468':this.imageStorage('localePointer'),'10141288':this.imageStorage('multibytePointer'),'10141384':this.imageStorage('threadLocaleMask')};
   const imagePins:Readonly<Record<string,Readonly<{address:string;size:number;bytes:string}>>>={"formatStateTables":{"address":"100ede50","size":160,"bytes":"454c33320000000028006e0075006c006c00290000000000286e756c6c290000060000060001000010000306000602100445454505050505053530005000000000282038505807080037303057500700002020080000000008606860606060000078707878787808070800000700080808000008000800070800000053797374656d46756e6374696f6e30333600000041445641504933322e444c4c00000000"},"formatDispatchTable":{"address":"100b5cc9","size":32,"bytes":"97560b10fe540b1019550b1068550b10a2550b10aa550b10e1550b10d9560b10"},"outputCtypeTable":{"address":"100f2e38","size":512,"bytes":"2000200020002000200020002000200020002800280028002800280020002000200020002000200020002000200020002000200020002000200020002000200048001000100010001000100010001000100010001000100010001000100010008400840084008400840084008400840084008400100010001000100010001000100081008100810081008100810001000100010001000100010001000100010001000100010001000100010001000100010001000100100010001000100010001000820082008200820082008200020002000200020002000200020002000200020002000200020002000200020002000200020002001000100010001000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"}};
   for(const label of ['formatStateTables','formatDispatchTable','outputCtypeTable']){const image=dllEntrySource.coldImages.find(i=>i.label===label);const pin=imagePins[label]!;if(!image||image.address!==pin.address||image.size!==pin.size||image.bytes!==pin.bytes)throw new Error('Original output scanner image required');const fields=this.#retainLocal(image.size);for(let i=0;i<image.size;i++)fields.writeUnsigned(i,parseInt(image.bytes.slice(i*2,i*2+2),16),1);retained[image.address]=fields;}
   this.#dllFormatImages=Object.freeze(retained);this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-language-output');if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllLanguageFormatPrefix():NativeValue<number>{
  if(this.#dllLanguageFormatAttempted)return {known:false,reason:this.#dllBoundary??'Retained language formatter attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase translation query string pending at 1004c30e'||!this.#argvStack)return {known:false,reason:'Actual initialized language buffer required'};
  this.#dllLanguageFormatAttempted=true;
  try{
   const helper=dllEntrySource.methods.find(item=>item.label==='versionQuerySprintf');
   if(helper?.bodyVA!=='0x100aa234'||helper.bodyInstructionBytesSha256!=='a96f4cf6be32e6178010236ee2379696d02700c2e7592e84a8c9143ac494887a')throw new Error('Original language query formatted-output helper required');
   const output=dllEntrySource.coldImages.find(item=>item.label==='versionQueryOutput'),literal=dllEntrySource.coldImages.find(item=>item.label==='translationQuery');
   if(output?.address!=='101ab190'||output.size!==256||output.bytes!=='00'.repeat(256)||literal?.address!=='100e81ec'||literal.size!==25||literal.bytes!=='5c56617246696c65496e666f5c5472616e736c6174696f6e00')throw new Error('Original language query output and literal images required');
   const destination=this.#retainLocal(256),translation=this.#retainLocal(literal.size);
   for(let i=0;i<256;i++)destination.writeUnsigned(i,0,1);
   for(let i=0;i<literal.size;i++)translation.writeUnsigned(i,parseInt(literal.bytes.slice(i*2,i*2+2),16),1);
   this.#dllLanguageFormatImages=Object.freeze({output:destination,translation});
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;
   const result=NativeX86ThreadStack.runSharedDllLanguageFormatPrefix(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllLanguageInfo():NativeValue<number>{
  if(this.#dllLanguageInfoAttempted)return {known:false,reason:this.#dllBoundary??'Retained language info attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase language buffer allocation ready at 1004c2f7'||!this.#argvStack||!this.#dllResourceInfo)return {known:false,reason:'Actual returned language buffer allocation required'};this.#dllLanguageInfoAttempted=true;
  try{this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedDllVersionInfo(this.#argvStack,this.#dllCall,'language');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllLanguageMalloc():NativeValue<number>{
  if(this.#dllLanguageMallocAttempted)return {known:false,reason:this.#dllBoundary??'Retained language malloc attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase language buffer Malloc pending at 10003cd8'||!this.#argvStack)return {known:false,reason:'Actual pending language buffer malloc required'};this.#dllLanguageMallocAttempted=true;
  try{this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-language-malloc');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllLanguagePrefix():NativeValue<number>{
  if(this.#dllLanguageAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL language attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase version language query pending at 10002d42'||!this.#argvStack||!this.#dllResourceSize)return {known:false,reason:'Actual pending version language query required'};
  this.#dllLanguageAttempted=true;
  try{const source=dllEntrySource.methods.find(item=>item.label==='dllVersionResourceLanguage');if(source?.bodyInstructionBytesSha256!=='41fc327e57103ed3c3597cc99f69eb05290738ca522ff8819dc5d056899fbfab'||source.entryChain[0]?.bytes!=='e979950400')throw new Error('Original version language helper required');this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.runSharedDllLanguagePrefix(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;}
  catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 processDllLanguageMemoryAdmin():NativeValue<number>{
  if(this.#dllLanguageMemoryAttempted)return {known:false,reason:this.#dllBoundary??'Retained language MemoryAdmin attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase language buffer MemoryAdmin pending at 10002aae'||!this.#argvStack)return {known:false,reason:'Actual pending language MemoryAdmin call required'};this.#dllLanguageMemoryAttempted=true;
  try{this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.runSharedDllMemoryAdmin(this.#argvStack,this.#dllCall,'language');if(!result.known)this.#dllBoundary=result.reason;return result;}catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}finally{this.#dllCall=null;this.#active=false;}
 }
 processDllVersionInfo():NativeValue<number>{
  if(this.#dllInfoAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL version info attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase version buffer initialized allocation pending at 1004c4f6 at 1004c4f6'||!this.#argvStack||!this.#dllResourceSize)return {known:false,reason:'Actual returned version buffer allocation required'};
  this.#dllInfoAttempted=true;
  try{
   const selected=NativeSharedVersionResource.forPlatform(this.platform,'recorded-sharedbase-ansi-version-buffer');if(!selected.known)throw new Error(selected.reason);const receipt=dllEntrySource.versionImportThunks.find(item=>item.address==='100d55dc');if(receipt?.bytes!=='ff25ec982f10'||receipt.import.iatVA!=='0x102f98ec'||receipt.import.module!=='VERSION.dll'||receipt.import.name!=='GetFileVersionInfoA')throw new Error('Original version info import thunk required');
   const slot=this.#retainLocal(4),procedure=Object.freeze({owner:this.identity,name:'GetFileVersionInfoA'});slot.pointer(0).set(procedure);this.#dllResourceInfo=Object.freeze({slot,procedure,initialize:(filename:string,handle:number,size:number,output:NativeBytePointer,site:'1004c504'|'1004c301')=>{if(!this.#active||!['1004c504','1004c301'].includes(site))throw new Error('Actual selected version info import caller required');return this.#call(site+'.GetFileVersionInfoA',()=>selected.value.initialize(filename,handle,size,output));}});
   this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedDllVersionInfo(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllVersionMalloc():NativeValue<number>{
  if(this.#dllMallocAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL malloc attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase version buffer Malloc pending at 10003cd8'||!this.#argvStack)return {known:false,reason:'Actual pending version buffer malloc required'};
  this.#dllMallocAttempted=true;
  try{this.#active=true;this.#initializerActive=true;this.#dllCall=Object.freeze({});this.#dllMallocCall=this.#dllCall;const result=NativeX86ThreadStack.runSharedInitializers(this.#argvStack,this.#dllCall,'dll-version-malloc');if(!result.known)this.#dllBoundary=result.reason;return result;}
  catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllMallocCall=null;this.#dllCall=null;this.#initializerActive=false;this.#active=false;}
 }
 processDllMemoryAdmin():NativeValue<number>{
  if(this.#dllMemoryAdminAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL MemoryAdmin attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase version buffer MemoryAdmin pending at 10002aae'||!this.#argvStack)return {known:false,reason:'Actual pending version buffer MemoryAdmin call required'};
  this.#dllMemoryAdminAttempted=true;
  try{
   const receipt=initializerSource.methods.memoryGetInstance;if(receipt.bodyInstructionBytesSha256!=='79302e58eb88b69239f60db781967e6c265bf12fff7f5da8f5efcdb022e9a454'||receipt.entryChain[0]?.bytes!=='e93de10100')throw new Error('Original MemoryAdmin singleton source required');
   this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.runSharedDllMemoryAdmin(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 processDllResourceSize(profile:'recorded-sharedbase-ansi-version-buffer'):NativeValue<number>{
  if(this.#dllResourceSizeAttempted)return {known:false,reason:this.#dllBoundary??'Retained version size attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase GetFileVersionInfoSizeA pending at 100d55e2'||!this.#argvStack)return {known:false,reason:'Actual pending version size import required'};
  if(profile!=='recorded-sharedbase-ansi-version-buffer')return {known:false,reason:'Explicit recorded ANSI version selection required'};
  this.#dllResourceSizeAttempted=true;
  try{
   const selected=NativeSharedVersionResource.forPlatform(this.platform,profile);if(!selected.known)throw new Error(selected.reason);
   const receipt=dllEntrySource.versionImportThunks.find(item=>item.address==='100d55e2');if(receipt?.bytes!=='ff25f0982f10'||receipt.import.module!=='VERSION.dll'||receipt.import.name!=='GetFileVersionInfoSizeA'||receipt.import.iatVA!=='0x102f98f0')throw new Error('Original version size import thunk required');
   const slot=this.#retainLocal(4),procedure=Object.freeze({owner:this.identity,name:'GetFileVersionInfoSizeA'});slot.pointer(0).set(procedure);this.#dllResourceSize=Object.freeze({slot,procedure,outcome:(filename:string,site:'1004c4d5'|'1004c2d8')=>{if(!this.#active||!['1004c4d5','1004c2d8'].includes(site))throw new Error('Actual selected version size import caller required');return this.#call(site+'.GetFileVersionInfoSizeA',()=>selected.value.sizeOutcome(filename));}});
   this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.finishSharedDllResourceSize(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 processDllResourceFallbackPrefix():NativeValue<number>{
  if(this.#dllResourceAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL resource attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase version resource fallback pending at 1004c62e'||!this.#argvStack||!this.#dllLstrcpy||!this.#dllModuleOwner)return {known:false,reason:'Actual returned DLL module imports required'};
  this.#dllResourceAttempted=true;
  try{
   const source=dllEntrySource.methods.find(item=>item.label==='dllVersionResourceFallback');if(source?.bodyInstructionBytesSha256!=='0093a34033c17068c54d97aa512a7eb15cd7b3bbc3a717118f0cfe60ee49a05e'||source.entryChain[0]?.bytes!=='e9389c0400'||source.entryChain[0]?.targetVA!=='1004c4c0')throw new Error('Original DLL version-resource fallback required');
   const module=this.#dllModuleOwner.snapshot();if(module.additionalReferences!==0||!module.currentImageRetained)throw new Error('Actual balanced current-module lookup required');
   this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.runSharedDllResourceFallbackPrefix(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 processDllModuleLookup(profile:Readonly<{selection:'current-sharedbase-version-query';missingExportLastError:127;successLastError:'preserve'}>):NativeValue<number>{
  if(this.#dllModuleAttempted)return {known:false,reason:this.#dllBoundary??'Retained DLL module attempt required'};
  if(this.#active||this.#dllBoundary!=='Original SharedBase LoadLibraryA binding pending at 1004c5a6'||!this.#argvStack)return {known:false,reason:'Actual pending DLL library load required'};
  const selection=profile?.selection,missingExportLastError=profile?.missingExportLastError,successLastError=profile?.successLastError;
  if(selection!=='current-sharedbase-version-query'||missingExportLastError!==127||successLastError!=='preserve')return {known:false,reason:'Explicit current-module import outcome selection required'};
  this.#dllModuleAttempted=true;
  try{
   const selected=NativeSharedVersionModule.forPlatform(this.platform,selection);if(!selected.known)throw new Error(selected.reason);this.#dllModuleOwner=selected.value;
   const bindings:Record<string,Readonly<{slot:NativeHeapObjectViews;procedure:object}>>={};for(const [address,name] of [['102f9640','LoadLibraryA'],['102f9648','GetProcAddress'],['102f9644','FreeLibrary']] as const){const receipt=dllEntrySource.imports.find(item=>item.iatVA==='0x'+address);if(receipt?.module!=='KERNEL32.dll'||receipt.name!==name)throw new Error('Original DLL module import required');const slot=this.#retainLocal(4),procedure=Object.freeze({owner:this.identity,name});slot.pointer(0).set(procedure);bindings[address]=Object.freeze({slot,procedure});}
   const literal=dllEntrySource.coldImages.find(item=>item.label==='procedureName');if(literal?.address!=='100e8210'||literal.bytes!=='446c6c47657456657273696f6e00')throw new Error('Original version export name required');const procedureName=this.#retainLocal(14);for(let i=0;i<14;i++)procedureName.writeUnsigned(i,parseInt(literal.bytes.slice(i*2,i*2+2),16),1);
   const module=this.#dllModuleOwner;this.#dllModuleHooks=Object.freeze({imports:Object.freeze(bindings),procedureName,
    acquire:(filename:string):object=>this.#call('1004c5a6.LoadLibraryA',()=>module.acquire(filename)),
    lookup:(handle:object,name:string):null=>{const result=this.#call('1004c5b8.GetProcAddress',()=>module.lookupVersionExport(handle,name));this.#call('DllVersion.GetProcAddress.LastError',()=>this.platform.setWin32LastError(missingExportLastError));return result;},
    release:(handle:object):number=>this.#call('1004c624.FreeLibrary',()=>module.release(handle))});
   this.#active=true;this.#dllCall=Object.freeze({});const result=NativeX86ThreadStack.runSharedDllModuleLookup(this.#argvStack,this.#dllCall);if(!result.known)this.#dllBoundary=result.reason;return result;
  }catch(error){this.#dllBoundary=error instanceof Error?error.message:String(error);return {known:false,reason:this.#dllBoundary};}
  finally{this.#dllCall=null;this.#active=false;}
 }
 snapshot(){return Object.freeze({messageSectionHeld:this.#messageSectionHeld,descriptorHeldSectionOffsets:Object.freeze([...this.#descriptorHeldSections]),crtHeldSectionIds:Object.freeze(Array.from(this.#crtSections).filter(([,fields])=>this.#crtHeldSections.has(fields)).map(([id])=>id)),dllFormatImages:this.#dllFormatImages,variablePoolSlots:Object.freeze(Array.from(this.#variablePoolSlots,([fields,slot])=>Object.freeze({fields,...slot}))),poolSlots:Object.freeze(Array.from(this.#poolSlots,([fields,slot])=>Object.freeze({fields,...slot}))),memoryHeapSectionHeld:this.#memoryHeapSectionHeld,exitLockHeld:this.#exitLockHeld,initializerImages:this.#initializerImages,poolRegions:Object.freeze([...this.#poolRegions]),initializerAllocations:Object.freeze([...this.#initializerAllocations]),argvInput:this.#argvInput,argvAllocation:this.#argvAllocation,argvReturned:this.#argvReturned,environmentVector:this.#environmentVector,environmentStrings:Object.freeze([...this.#environmentStrings]),setEnvpReturned:this.#setEnvpReturned,mappingState:this.#mappingState?Object.freeze({...this.#mappingState}):null,boundary:this.#boundary,localeUpdate:this.#localeUpdate,multibyteAllocation:this.#multibyteAllocation,cpInfo:this.#cpInfo,caseState:this.#caseState?Object.freeze({...this.#caseState}):null,codePage:this.#codePage,startupInfo:this.#startupInfo,ioBlock:this.#ioBlock,ioReturned:this.#ioReturned,versionAllocation:this.#versionAllocation,
  ptd:this.#ptd,ptdInstalled:this.#ptdInstalled,ptdInitialized:this.#ptdInitialized,rtcReturned:this.#rtcReturned,environmentInput:this.#environmentInput,environmentAllocation:this.#environmentAllocation,environmentReturned:this.#environmentReturned,heap:this.#heap,heapReturned:this.#heapReturned,attachReturned:this.#attachReturned,mtReturned:this.#mtReturned,locksReturned:this.#locksReturned,sections:Object.freeze([...this.#sections]),pointersReturned:this.#pointersReturned,
  trace:Object.freeze([...this.#trace]),dllEntryImages:this.#dllImages,dllLanguageFormatImages:this.#dllLanguageFormatImages,dllLstrcpyImport:this.#dllLstrcpy,dllResourceInfoImport:this.#dllResourceInfo,dllResourceQueryImport:this.#dllResourceQuery,dllResourceSizeImport:this.#dllResourceSize,dllModuleImports:this.#dllModuleHooks?.imports??null,dllModuleState:this.#dllModuleOwner?.snapshot()??null,dllEntryBoundary:this.#dllBoundary,dllEntryReturned:this.#dllReturned,dllEntryExecuted:this.#dllReturned!==null,wholeCrtTraversalCompleted:false});}
}
