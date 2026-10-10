import {NativeSharedStaticTls} from '../../src/gothic3/native-shared-static-tls';
import type {NativeWin32FileSystemSelection} from '../../src/gothic3/native-win32-file-system';
import {NativeSharedVersionResource} from '../../src/gothic3/native-shared-version-resource';
import {NativeSharedModuleImage} from '../../src/gothic3/native-shared-module-image';
import versionObservation from '../../assets/gothic3/shared-dll-entry-source/windows-version-api-observation.json';
import {nativeVirtualX86CpuSelection, retainNativeX86ThreadStackSelection} from '../../src/gothic3/native-x86-thread-stack-profile';
import type {NativeX86CpuSelection} from '../../src/gothic3/native-x86-thread-stack-profile';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import {NativeX86ThreadStack} from '../../src/gothic3/native-x86-thread-stack';
import dllEntrySource from '../../assets/gothic3/shared-dll-entry-source/source.json';
import sharedCrtSource from '../../assets/gothic3/shared-crt-bootstrap/source.json';
import {nativeVirtualCp1252ArgvNlsSelection} from '../../src/gothic3/native-win32-argv-nls';
import {expect,it} from 'vitest';
import {NativeSharedCrtOwner} from '../../src/gothic3/native-shared-crt';
import {NativeRuntimePlatform,NativeRuntimeDiagnostics,NativeWin32PlatformException} from '../../src/gothic3/native-runtime-platform';
import {NativeGameCrtOwner} from '../../src/gothic3/native-game-crt';
import type {NativeWin32HeapCapability} from '../../src/gothic3/native-runtime-platform';
function fixture(version:{platform:number;major:number;minor:number;build:number}|null={platform:2,major:6,minor:1,build:0xabcd}){
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:version}});
 return {platform,owner:NativeSharedCrtOwner.forPlatform(platform)};
}


function inspectOutputBeforeFree(owner:NativeSharedCrtOwner,platform:NativeRuntimePlatform,inspect:()=>void):()=>boolean{
 const free=platform.win32HeapFree.bind(platform);let observed=false;
 platform.win32HeapFree=(heap,flags,backing)=>{const output=owner.snapshot().initializerImages['102f6f1c']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get();if(!observed&&output?.fields.backing===backing){observed=true;inspect();}return free(heap,flags,backing);};
 return ()=>observed;
}
function inspectScratchBeforeFree(owner:NativeSharedCrtOwner,platform:NativeRuntimePlatform,inspect:()=>void):()=>boolean{
 const free=platform.win32HeapFree.bind(platform);let observed=false;
 platform.win32HeapFree=(heap,flags,backing)=>{if(!observed&&owner.snapshot().initializerAllocations.some(fields=>fields.backing===backing&&fields.bytes.length===4104)){observed=true;inspect();}return free(heap,flags,backing);};
 return ()=>observed;
}
it('rejects changed cleanup and cookie-check receipts before constructing SharedBase CRT state',()=>{
 for(const key of ['freeTemporary','checkSecurityCookie'] as const){
  const receipt=sharedCrtSource.methods[key],saved=receipt.bodyInstructionBytesSha256;
  try{receipt.bodyInstructionBytesSha256='00'.repeat(32);expect(()=>fixture()).toThrow('Original SharedBase CRT source differs: '+key);}
  finally{receipt.bodyInstructionBytesSha256=saved;}
 }
 expect(()=>fixture()).not.toThrow();
});
it('stores the original OS fields and owns a distinct SharedBase heap before the mtinit call',()=>{
 const f=fixture(),game=NativeGameCrtOwner.forPlatform({platform:f.platform,errnoSlot:()=>({known:false,reason:'not initialized'})});
 const result=f.owner.processAttach();expect(result.known).toBe(false);
 if(result.known)throw new Error('Thread initialization unexpectedly returned');
 expect(result.reason).toContain('thread ID service');
 const os=f.owner.imageStorage('osFields');
 expect([0,4,8,12,16].map(offset=>os.readUnsigned(offset))).toEqual([2,0x2bcd,0x601,6,1]);
 expect(game.physical.crtOsFields.readUnsigned(0)).toBe(0);
 const state=f.owner.snapshot();expect(state.heapReturned).toBe(1);expect(state.attachReturned).toBeNull();
 expect(state.versionAllocation!.freed).toBe(true);
 expect(state.heap!.owner).toBe(f.owner.identity);
 expect(f.owner.imageStorage('heapHandle').pointer<NativeWin32HeapCapability>(0).get()).toBe(state.heap);
 expect(f.owner.imageStorage('heapSelection').readUnsigned(0)).toBe(1);
 expect(state.trace.slice(0,12)).toEqual(['100ada6d.GetProcessHeap','100ada70.HeapAlloc(0,148)','100ada86.GetVersionExA',
  '100adab9.GetProcessHeap','100adabc.HeapFree','100adad3.publishOsFields','100bc0cb.HeapCreate(0,4096,0)',
  '100bc0d3.publishHeapHandle','100aa49d.getOsPlatform.return0','100aa54c.getWinMajor.return0',
  '100bc0e5.storeHeapSelection','100adb09.callMtInit']);
 expect(f.owner.processAttach()).toEqual(result);expect(f.owner.snapshot().heap).toBe(state.heap);
 expect(NativeSharedCrtOwner.forPlatform(f.platform)).toBe(f.owner);
});
it('returns the original attach failure after version failure and frees its temporary allocation',()=>{
 const f=fixture(null);expect(f.owner.processAttach()).toEqual({known:true,value:0});
 expect(f.owner.snapshot().versionAllocation!.freed).toBe(true);
 expect(f.owner.snapshot().heap).toBeNull();expect(f.owner.imageStorage('osFields').bytes.every(byte=>byte===0)).toBe(true);
 expect(f.owner.snapshot().trace.slice(-2)).toEqual(['100ada93.GetProcessHeap','100ada96.HeapFree']);
});
it('preserves the source mode3 branch and non-NT build bit instead of inventing small-block initialization',()=>{
 const f=fixture({platform:1,major:4,minor:0,build:123});const result=f.owner.processAttach();
 expect(result.known).toBe(false);if(result.known)throw new Error('Small-block heap unexpectedly initialized');
 expect(result.reason).toContain('100bc231');expect(f.owner.imageStorage('heapSelection').readUnsigned(0)).toBe(3);
 expect(f.owner.imageStorage('osFields').readUnsigned(4)).toBe(0x8000|123);
 expect(f.owner.snapshot().heapReturned).toBeNull();expect(f.owner.snapshot().heap).not.toBeNull();
 expect(f.owner.snapshot().trace).not.toContain('100adb09.callMtInit');
});
it('retains the allocated version buffer when the version provider has not returned',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true}});
 const owner=NativeSharedCrtOwner.forPlatform(platform),result=owner.processAttach();
 expect(result.known).toBe(false);const allocation=owner.snapshot().versionAllocation!;
 expect(allocation.freed).toBe(false);expect(allocation.bytes.length).toBe(148);
 expect([...allocation.knownMask.slice(0,4)]).toEqual([255,255,255,255]);
 expect(allocation.knownMask.slice(4).every(mask=>mask===0)).toBe(true);
 expect(owner.processAttach()).toEqual(result);expect(owner.snapshot().versionAllocation).toBe(allocation);
});

function decode(platform:NativeRuntimePlatform,pointer:object|null):object|null {
 const module=platform.getWin32ModuleHandle('KERNEL32.DLL');if(!module.known||module.value===null)throw new Error('Missing module');
 const procedure=platform.getWin32Procedure(module.value,'DecodePointer');if(!procedure.known||procedure.value===null)throw new Error('Missing decoder');
 const result=procedure.value.invoke(pointer);if(!result.known)throw new Error(result.reason);return result.value;
}
it('keeps the actual unencoded FLS getter in TLS while encoding its procedure slots',()=>{
 const f=fixture();expect(f.owner.processAttach().known).toBe(false);
 const slots=f.owner.imageStorage('procedureSlots');
 expect([0,4,8,12].map(offset=>(decode(f.platform,slots.pointer<object>(offset).get()) as {name:string}).name)).toEqual(['FlsAlloc','FlsGetValue','FlsSetValue','FlsFree']);
 const index=f.owner.imageStorage('tlsGetterIndex').readUnsigned(0);
 const actual=f.platform.tlsGetValue(index);expect(actual.known).toBe(true);
 if(!actual.known)throw new Error(actual.reason);
 expect(actual.value).toBe(decode(f.platform,slots.pointer<object>(4).get()));
 expect(actual.value).not.toBe(slots.pointer(4).get());
 expect(f.owner.imageStorage('threadDataIndex').readUnsigned(0)).not.toBe(0xffffffff);
 expect(f.owner.snapshot().mtReturned).toBeNull();expect(f.owner.snapshot().pointersReturned).toBe(true);
 expect(f.owner.snapshot().trace.slice(-1)).toEqual(['100ae859.GetCurrentThreadId']);
});
it('encodes the original TLS fallback when FLS exports are absent',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'owned-bijection',fiberLocalStorage:false,processHeap:true,osVersion:{platform:2,major:6,minor:0,build:1}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);expect(owner.processAttach().known).toBe(false);
 const slots=owner.imageStorage('procedureSlots');
 expect(decode(platform,slots.pointer<object>(4).get())).toBe(platform.tlsProcedures.get);
 expect(decode(platform,slots.pointer<object>(8).get())).toBe(platform.tlsProcedures.set);
 expect(decode(platform,slots.pointer<object>(12).get())).toBe(platform.tlsProcedures.free);
 const allocator=decode(platform,slots.pointer<object>(0).get()) as {address:string;owner:object};
 expect(allocator.address).toBe('100ae360');expect(allocator.owner).toBe(owner.identity);
 const cached=platform.tlsGetValue(owner.imageStorage('tlsGetterIndex').readUnsigned(0));
 expect(cached.known&&cached.value===platform.tlsProcedures.get).toBe(true);
 expect(owner.imageStorage('threadDataIndex').readUnsigned(0)).not.toBe(0xffffffff);
});
it('initializes every original pointer slot in source order with encoded NULL and original code identities',()=>{
 const f=fixture();expect(f.owner.processAttach().known).toBe(false);
 const encodedNull=f.owner.imageStorage('pointer6ac4').pointer<object>(0).get();expect(encodedNull).not.toBeNull();
 expect(decode(f.platform,encodedNull)).toBeNull();
 for(const label of ['pointer64a0','pointer690c','pointer6abc'] as const)expect(f.owner.imageStorage(label).pointer(0).get()).toBe(encodedNull);
 for(const offset of [0,4,8,12])expect(f.owner.imageStorage('signalPointers').pointer(offset).get()).toBe(encodedNull);
 const terminate=decode(f.platform,f.owner.imageStorage('ehHook').pointer<object>(0).get()) as {address:string;owner:object};
 const exit=decode(f.platform,f.owner.imageStorage('exitPointer').pointer<object>(0).get()) as {address:string;owner:object};
 expect(terminate.address).toBe('100b01d7');expect(exit.address).toBe('100aa7b7');
 expect(terminate.owner).toBe(f.owner.identity);expect(exit.owner).toBe(f.owner.identity);
 expect(f.owner.snapshot().trace.filter(label=>label.startsWith('initPointers.store.')||['100bb90b.signalPointers.store','100ae9bb.noop.return','100b0265.storeTerminate','100aa82b.storeExit','100aa831.initPointers.return'].includes(label))).toEqual([
  'initPointers.store.pointer6ac4','initPointers.store.pointer6ac0','initPointers.store.pointer64a0','initPointers.store.pointer690c','initPointers.store.pointer6abc',
  '100bb90b.signalPointers.store','100ae9bb.noop.return','100b0265.storeTerminate','100aa82b.storeExit','100aa831.initPointers.return']);
});
it('preserves the original identity branch when the pointer export is absent',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'absent',fiberLocalStorage:false,processHeap:true,osVersion:{platform:2,major:6,minor:0,build:1}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);expect(owner.processAttach().known).toBe(false);
 expect(owner.snapshot().pointersReturned).toBe(true);expect(owner.imageStorage('pointer6ac4').pointer(0).get()).toBeNull();
 expect(owner.imageStorage('procedureSlots').pointer(4).get()).toBe(platform.tlsProcedures.get);
 expect((owner.imageStorage('exitPointer').pointer<{address:string}>(0).get()!).address).toBe('100aa7b7');
});
it('retains the getter-cache prefix before the unowned pre-Vista main-image scan',()=>{
 const f=fixture({platform:2,major:5,minor:1,build:0});const result=f.owner.processAttach();
 expect(result.known).toBe(false);if(result.known)throw new Error('Missing image scan returned');
 expect(result.reason).toContain('.mixcrt');expect(f.owner.snapshot().pointersReturned).toBe(false);
 expect(f.owner.imageStorage('pointer6ac4').pointer(0).get()).toBeNull();
 const index=f.owner.imageStorage('tlsGetterIndex').readUnsigned(0);expect(index).not.toBe(0xffffffff);
 const getter=f.platform.tlsGetValue(index);expect(getter.known&&getter.value!==null).toBe(true);
});
it('rejects a structurally forged Runtime platform before admitting CRT images',()=>{
 expect(()=>NativeSharedCrtOwner.forPlatform(Object.create(NativeRuntimePlatform.prototype))).toThrow('Actual');
});

it('initializes all fourteen actual SharedBase static sections and caches one source initializer',()=>{
 const f=fixture();expect(f.owner.processAttach().known).toBe(false);
 const state=f.owner.snapshot();expect(state.locksReturned).toBe(1);expect(state.sections).toHaveLength(14);
 const ids=[0,1,3,4,6,7,8,10,12,13,14,16,17,18];
 ids.forEach((id,index)=>{
  const fields=state.sections[index]!;expect(f.owner.imageStorage('lockTable').pointer(id*8).get()).toBe(fields);
  expect(fields.bytes.byteOffset-f.owner.imageStorage('staticSections').bytes.byteOffset).toBe(index*24);
  expect(f.platform.enterPhysicalCriticalSection(fields,f.owner.identity).known).toBe(true);
  expect(f.platform.leavePhysicalCriticalSection(fields,f.owner.identity).known).toBe(true);
 });
 expect(state.trace.filter(label=>label==='section.GetProcAddress')).toHaveLength(1);
 expect((decode(f.platform,f.owner.imageStorage('pointer6ac0').pointer<object>(0).get()) as {name:string}).name).toBe('InitializeCriticalSectionAndSpinCount');
 expect(f.owner.imageStorage('threadDataIndex').readUnsigned(0)).not.toBe(0xffffffff);
});

it('preserves preceding sections and clears only the failed lock after the original allocation exception',()=>{
 const f=fixture(),initialize=f.platform.initializePhysicalCriticalSection.bind(f.platform);let calls=0;
 f.platform.initializePhysicalCriticalSection=(fields,owner,spin)=>{
  if(++calls===3)throw new NativeWin32PlatformException(0xc0000017);
  return initialize(fields,owner,spin);
 };
 const result=f.owner.processAttach();expect(result.known).toBe(false);
 if(result.known)throw new Error('Missing teardown returned');expect(result.reason).toContain('__mtterm');
 expect(f.owner.snapshot().locksReturned).toBe(0);expect(f.owner.snapshot().sections).toHaveLength(2);
 expect(f.owner.imageStorage('lockTable').pointer(3*8).get()).toBeNull();
 expect(f.owner.imageStorage('lockTable').pointer(0).get()).toBe(f.owner.snapshot().sections[0]);
 expect(f.platform.getWin32LastError()).toEqual({known:true,value:8});
 expect(f.owner.processAttach()).toEqual(result);expect(calls).toBe(3);
});
it('uses the original no-spin fallback when the spin initializer export is absent',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,sectionSpinProcedure:false,osVersion:{platform:2,major:6,minor:0,build:1}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);expect(owner.processAttach().known).toBe(false);
 expect(owner.snapshot().locksReturned).toBe(1);expect(owner.snapshot().sections).toHaveLength(14);
 const fallback=decode(platform,owner.imageStorage('pointer6ac0').pointer<object>(0).get()) as {address:string;owner:object};
 expect(fallback.address).toBe('100bbf17');expect(fallback.owner).toBe(owner.identity);
 expect(platform.enterPhysicalCriticalSection(owner.snapshot().sections[0]!,owner.identity).known).toBe(true);
 expect(platform.leavePhysicalCriticalSection(owner.snapshot().sections[0]!,owner.identity).known).toBe(true);
});

it('allocates the original SharedBase thread index with its canonical destructor and rejects forged callbacks',()=>{
 const f=fixture();const result=f.owner.processAttach();expect(result.known).toBe(false);
 const index=f.owner.imageStorage('threadDataIndex').readUnsigned(0);expect(index).not.toBe(0xffffffff);
 const module=f.platform.getWin32ModuleHandle('KERNEL32.DLL');if(!module.known||module.value===null)throw new Error('Missing module');
 const alloc=f.platform.getWin32Procedure(module.value,'FlsAlloc');if(!alloc.known||!alloc.value||alloc.value.name!=='FlsAlloc')throw new Error('Missing allocator');
 expect(alloc.value.invoke({address:'100ae55a',invoke:()=>({known:true,value:undefined})}).known).toBe(false);
 expect(f.owner.snapshot().trace).toContain('100ae81b.storeThreadIndex');
 expect(f.owner.processAttach()).toEqual(result);
});

it('installs and initializes the actual 532-byte PTD before requiring a thread ID',()=>{
 const f=fixture();const result=f.owner.processAttach();expect(result.known).toBe(false);
 const state=f.owner.snapshot();expect(state.ptdInstalled).toBe(true);expect(state.ptd).not.toBeNull();
 const ptd=state.ptd!;expect(ptd.bytes.length).toBe(532);expect(state.ptdInitialized).toBe(true);expect(ptd.readUnsigned(0x14)).toBe(1);expect(ptd.readUnsigned(0xc8,1)).toBe(0x43);expect(ptd.knownMask.slice(0,8).every(b=>b===255)).toBe(true);
 const module=f.platform.getWin32ModuleHandle('KERNEL32.DLL');if(!module.known||!module.value)throw new Error('Missing module');
 const getter=f.platform.getWin32Procedure(module.value,'FlsGetValue');if(!getter.known||!getter.value||getter.value.name!=='FlsGetValue')throw new Error('Missing getter');
 const stored=getter.value.invoke(f.owner.imageStorage('threadDataIndex').readUnsigned(0));expect(stored.known&&stored.value===ptd).toBe(true);
 expect(state.mtReturned).toBeNull();expect(ptd.backing.freed).toBe(false);
});

it('returns original mtinit after actual thread ID and increments independent locale references',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>({known:true,value:77})}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);const result=owner.processAttach();expect(result.known).toBe(false);
 const state=owner.snapshot();expect(state.rtcReturned).toBe(true);expect(state.trace.filter(label=>label.startsWith('rtc.skipNull')).length).toBe(64);expect(state.mtReturned).toBe(1);expect(state.ptdInitialized).toBe(true);
 expect(state.ptd!.readUnsigned(0)).toBe(77);expect(state.ptd!.readUnsigned(4)).toBe(0xffffffff);
 expect(owner.imageStorage('multibyteRefcount').readUnsigned(0)).toBe(1);
 expect(owner.imageStorage('initialLocale').readUnsigned(0)).toBe(2);
 expect(owner.imageStorage('initialTimeLocale').readUnsigned(0xb4)).toBe(1);
 const lock=owner.imageStorage('lockTable').pointer<any>(12*8).get();expect(platform.enterPhysicalCriticalSection(lock,owner.identity).known).toBe(true);expect(platform.leavePhysicalCriticalSection(lock,owner.identity).known).toBe(true);
 const repeated=owner.processAttach();expect(repeated).toEqual(result);expect(owner.imageStorage('initialLocale').readUnsigned(0)).toBe(2);
});

it('stores the actual retained process command-line pointer in independent SharedBase storage',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>({known:true,value:9})},processInputs:{acpCodePage:1252,conversionCoverage:'ascii-explicit-positive-count',initialDirectionFlag:0,commandLineA:{kind:'buffer',bytes:[71,51,0]}}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach unexpectedly complete');expect(result.reason).toContain('environment-w acquisition');
 const command=platform.processInputEndpoints!.getCommandLineA();expect(command.known&&command.value===owner.imageStorage('commandLinePointer').pointer<object>(0).get()).toBe(true);
 expect(owner.imageStorage('environmentPointer').readUnsigned(0)).toBe(0);expect(owner.snapshot().attachReturned).toBeNull();expect(owner.processAttach()).toEqual(result);
});

function environmentFixture(failure?:'query'|'fill'){
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>({known:true,value:9})},processInputs:{acpCodePage:1252,conversionCoverage:'ascii-explicit-positive-count',initialDirectionFlag:0,commandLineA:{kind:'buffer',bytes:[71,51,0]},environmentW:{kind:'buffer',bytes:[65,0,61,0,66,0,0,0,0,0]},conversionFailure:failure?{[failure]:{result:0}}:undefined}}});return {platform,owner:NativeSharedCrtOwner.forPlatform(platform)};
}
it('converts and retains independent SharedBase environment while releasing the exact wide OS block',()=>{
 const f=environmentFixture();const result=f.owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach complete');expect(result.reason).toContain('startup-info writer');
 const state=f.owner.snapshot();expect(state.environmentReturned).toBe(true);expect(state.environmentAllocation!.bytes).toEqual(new Uint8Array([65,61,66,0,0]));
 expect(state.environmentInput!.fields.backing.freed).toBe(true);expect(state.environmentAllocation!.backing.freed).toBe(false);
 const pointer=f.owner.imageStorage('environmentPointer').pointer<any>(0).get();expect(pointer.fields).toBe(state.environmentAllocation);expect(f.owner.imageStorage('environmentMode').readUnsigned(0)).toBe(1);
 expect(f.owner.processAttach()).toEqual(result);
});
it.each(['query','fill'] as const)('releases wide input after original %s conversion failure',failure=>{
 const f=environmentFixture(failure);f.owner.processAttach();const state=f.owner.snapshot();expect(state.environmentReturned).toBe(true);expect(state.environmentInput!.fields.backing.freed).toBe(true);
 expect(f.owner.imageStorage('environmentPointer').pointer(0).get()).toBeNull();
 if(failure==='query')expect(state.environmentAllocation).toBeNull();else expect(state.environmentAllocation!.backing.freed).toBe(true);
});

it('writes original SharedBase errno twice and releases wide input when malloc returns NULL',()=>{
 const f=environmentFixture();const allocate=f.platform.win32HeapAlloc.bind(f.platform);
 f.platform.win32HeapAlloc=(heap,flags,bytes)=>{if(flags===0&&bytes===5){f.platform.setWin32LastError(55);return {known:true,value:null};}return allocate(heap,flags,bytes);};
 f.owner.processAttach();const state=f.owner.snapshot();expect(state.environmentReturned).toBe(true);expect(state.environmentAllocation).toBeNull();
 expect(state.environmentInput!.fields.backing.freed).toBe(true);expect(state.ptd!.readUnsigned(8)).toBe(12);
 expect(state.trace.filter(label=>label==='100ae4cd.GetLastError').length).toBe(2);expect(state.trace.filter(label=>label==='100ae537.SetLastError').length).toBe(2);
 expect(f.owner.imageStorage('environmentPointer').pointer(0).get()).toBeNull();expect(f.platform.getWin32LastError()).toEqual({known:true,value:55});
});
it('retains the original allocation-failure prefix before unowned Sleep retry',()=>{
 const f=environmentFixture();f.owner.imageStorage('allocationRetryDelay').writeUnsigned(0,1000);const allocate=f.platform.win32HeapAlloc.bind(f.platform);
 f.platform.win32HeapAlloc=(heap,flags,bytes)=>flags===0&&bytes===5?{known:true,value:null}:allocate(heap,flags,bytes);
 const result=f.owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Retry completed');expect(result.reason).toContain('100aeeed');
 const state=f.owner.snapshot();expect(state.ptd!.readUnsigned(8)).toBe(12);expect(state.environmentInput!.fields.backing.freed).toBe(false);expect(state.environmentReturned).toBe(false);expect(f.owner.processAttach()).toEqual(result);
});

it.each([1,2,3,4,5,7,8,31,32,33,260])('copies %i ANSI bytes with original DWORD/tail widths and releases OS input',size=>{
 const data=size===1?[0]:[...Array(size-2).fill(129),0,0];
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>({known:true,value:9})},processInputs:{acpCodePage:1252,conversionCoverage:'ascii-explicit-positive-count',initialDirectionFlag:0,commandLineA:{kind:'buffer',bytes:[0]},environmentW:{kind:'null',lastError:120},environmentA:{kind:'buffer',bytes:data}}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);owner.processAttach();const state=owner.snapshot();expect(state.environmentReturned).toBe(true);
 // For a leading NULL the source's length is one byte, including a two-NULL input.
 const copied=data[0]===0?[0]:data;expect(state.environmentAllocation!.bytes).toEqual(new Uint8Array(copied));expect(state.environmentInput!.fields.backing.freed).toBe(true);
 expect(owner.imageStorage('environmentMode').readUnsigned(0)).toBe(2);
 const dwords=Math.floor(copied.length/4),tail=copied.length&3;expect(state.trace.filter(label=>label.startsWith('memcpy.load4.')).length).toBe(dwords);expect(state.trace.filter(label=>label.startsWith('memcpy.load1.')).length).toBe(tail);
});

it('retains ANSI input and allocation before an unowned original DWORD dispatch target',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>({known:true,value:9})},processInputs:{acpCodePage:1252,conversionCoverage:'ascii-explicit-positive-count',initialDirectionFlag:0,commandLineA:{kind:'buffer',bytes:[0]},environmentW:{kind:'null',lastError:120},environmentA:{kind:'buffer',bytes:[65,61,66,0,0]}}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);owner.imageStorage('memcpyForwardDwords').writeUnsigned(4,0x12345678);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Dispatch complete');expect(result.reason).toContain('DWORD dispatch');
 const state=owner.snapshot();expect(state.environmentReturned).toBe(false);expect(state.environmentInput!.fields.backing.freed).toBe(false);expect(state.environmentAllocation!.backing.freed).toBe(false);expect(owner.processAttach()).toEqual(result);
});

it('runs the actual SharedBase startup writer before allocating and initializing 32 descriptor records',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>({known:true,value:9})},processInputs:{acpCodePage:1252,conversionCoverage:'ascii-explicit-positive-count',initialDirectionFlag:0,commandLineA:{kind:'buffer',bytes:[0]},environmentW:{kind:'buffer',bytes:[0,0]}},startupIo:{startupInfoA:{outcome:'normal',writes:[{offset:50,width:2,value:0,knownMask:65535}]}}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);owner.processAttach();const state=owner.snapshot();expect(state.ioBlock!.bytes.length).toBe(1792);expect(owner.imageStorage('ioHandleCount').readUnsigned(0)).toBe(32);
 for(let i=0;i<32;i++){const offset=i*56;expect(state.ioBlock!.readUnsigned(offset)).toBe(0xffffffff);expect(state.ioBlock!.readUnsigned(offset+5,1)).toBe(10);expect(state.ioBlock!.readUnsigned(offset+8)).toBe(0);}
 expect(state.startupInfo!.knownMask[0]).toBe(0);expect(state.startupInfo!.readUnsigned(50,2)).toBe(0);expect(state.ioBlock!.readUnsigned(4,1)).toBe(0x81);
 expect(platform.startupIoEndpoints!.getStartupInfoA({identity:{}}).known).toBe(false);
});

it('completes original SharedBase standard descriptors with actual HANDLE and section capabilities',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>({known:true,value:9})},processInputs:{acpCodePage:1252,conversionCoverage:'ascii-explicit-positive-count',initialDirectionFlag:0,commandLineA:{kind:'buffer',bytes:[0]},environmentW:{kind:'buffer',bytes:[0,0]}},startupIo:{startupInfoA:{outcome:'normal',writes:[{offset:50,width:2,value:0,knownMask:65535}]}},standardIo:{standardHandles:[{id:-10,result:'valid',fileType:2},{id:-11,result:'valid',fileType:3},{id:-12,result:'null',fileType:0}],setHandleCount:{result:0},sectionInitialization:'owned-registration'}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach complete');expect(result.reason).toContain('GetACP NLS endpoints');
 const state=owner.snapshot(),block=state.ioBlock!;expect(state.ioReturned).toBe(0);expect(block.readUnsigned(4,1)).toBe(0xc1);expect(block.readUnsigned(60,1)).toBe(0x89);expect(block.readUnsigned(116,1)).toBe(0xc1);
 expect(block.readUnsigned(112)).toBe(0xfffffffe);expect(block.readUnsigned(8)).toBe(1);expect(block.readUnsigned(64)).toBe(1);expect(block.readUnsigned(120)).toBe(0);
 expect(platform.standardIoEndpoints!.invoke({identity:{}}).known).toBe(false);
});

it('owns the original 544-byte multibyte root and aliases its refcount field',()=>{
 const f=fixture();const root=f.owner.imageStorage('initialMultibyte'),ref=f.owner.imageStorage('multibyteRefcount');expect(root.bytes.length).toBe(544);expect(ref.bytes.length).toBe(4);expect(ref.backing).toBe(root.backing);
 f.owner.processAttach();expect(root.readUnsigned(0)).toBe(1);expect(ref.readUnsigned(0)).toBe(1);expect(f.owner.snapshot().ptd!.pointer(0x68).get()).toBe(root);
});


function argumentFixture(ownLocale=1,selected=true,sse=false,stack:'aligned'|'opaque'|false=false,stackBytes=4096,commandBytes:readonly number[]=[0],environmentWide:readonly number[]|null=[0,0],environmentAnsi:readonly number[]|null=null,processor:{export?:boolean;erratum?:boolean;cpu?:NativeX86CpuSelection;diagnostics?:NativeRuntimeDiagnostics;sectionSpin?:boolean;fileSystem?:NativeWin32FileSystemSelection}={export:true,erratum:false}){
 let owner:NativeSharedCrtOwner;
 const platform=new NativeRuntimePlatform({diagnostics:processor.diagnostics,engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',sectionSpinProcedure:processor.sectionSpin,fileSystem:processor.fileSystem,processorFeatureProcedure:processor.export,floatingPointPrecisionErratum:processor.erratum,fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>{owner.snapshot().ptd!.writeUnsigned(0x70,ownLocale);if(sse)owner.imageStorage('memcpySseFlag').writeUnsigned(0,1);return {known:true,value:9};}},processInputs:{acpCodePage:1252,conversionCoverage:'ascii-explicit-positive-count',initialDirectionFlag:0,commandLineA:{kind:'buffer',bytes:commandBytes},environmentW:environmentWide?{kind:'buffer',bytes:environmentWide}:{kind:'null'},environmentA:environmentAnsi?{kind:'buffer',bytes:environmentAnsi}:{kind:'null'}},startupIo:{startupInfoA:{outcome:'normal',writes:[{offset:50,width:2,value:0,knownMask:65535}]}},standardIo:{standardHandles:[{id:-10,result:'valid',fileType:2},{id:-11,result:'valid',fileType:3},{id:-12,result:'null',fileType:0}],setHandleCount:{result:0},sectionInitialization:'owned-registration'},threadStack:stack?{threadCapability:{},reservationBytes:stackBytes,addressModel:'opaque-relative',initialRegisters:'unknown',initialFs0:'unknown',pageAlignment:stack==='aligned'?'virtual-page-4096':undefined,cpu:processor.cpu}:undefined,argvNls:selected?{...nativeVirtualCp1252ArgvNlsSelection,lastError:{GetACP:88}}:undefined}});
 owner=NativeSharedCrtOwner.forPlatform(platform);return {platform,owner};
}
for(const ownLocale of [1,3])it(`uses actual SharedBase GetACP and preserves original locale flag ownership ${ownLocale}`,()=>{
 const {owner,platform}=argumentFixture(ownLocale);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach unexpected');expect(result.reason).toContain('100ce300');
 const state=owner.snapshot(),local=state.localeUpdate!;expect(local.pointer(0).get()).toBe(owner.imageStorage('initialLocale'));expect(local.pointer(4).get()).toBe(owner.imageStorage('initialMultibyte'));expect(local.pointer(8).get()).toBe(state.ptd);expect(local.readUnsigned(12,1)).toBe(ownLocale===1?1:0);expect(local.knownMask[13]).toBe(0);expect(state.ptd!.readUnsigned(0x70)).toBe(3);expect(state.codePage).toBe(1252);expect(platform.getWin32LastError()).toEqual({known:true,value:88});
 expect(owner.imageStorage('systemCodePageSelected').readUnsigned(0)).toBe(0);expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(0);
 const allocated=state.multibyteAllocation!,root=owner.imageStorage('initialMultibyte');expect(allocated.bytes.length).toBe(544);expect(allocated.backing).not.toBe(root.backing);expect(allocated.readUnsigned(0)).toBe(0);expect(allocated.readUnsigned(4)).toBe(1252);expect(allocated.readUnsigned(8)).toBe(0);expect(allocated.readUnsigned(12)).toBe(0);expect([...allocated.bytes.slice(16,285)]).toEqual(Array(269).fill(0));expect(allocated.bytes.slice(285)).toEqual(root.bytes.slice(285));expect(state.cpInfo!.readUnsigned(0)).toBe(1);expect(state.cpInfo!.readUnsigned(4,1)).toBe(63);expect(state.cpInfo!.knownMask[18]).toBe(0);expect(state.trace.filter(v=>v==='100a79df.REP_STOSD')).toHaveLength(64);expect(root.readUnsigned(0)).toBe(1);expect(state.ptd!.pointer(0x68).get()).toBe(root);expect(state.trace.filter(v=>v==='100b170f.REP_MOVSD')).toHaveLength(136);
 expect(platform.argvNlsEndpoints!.invoke({identity:{}}).known).toBe(false);expect(owner.processAttach()).toEqual(result);expect(owner.snapshot().multibyteAllocation).toBe(allocated);
});
it('retains locale flag and selected-codepage prefix when SharedBase GetACP is unavailable',()=>{
 const {owner}=argumentFixture(1,false);const result=owner.processAttach();expect(result.known).toBe(false);const state=owner.snapshot();expect(state.ptd!.readUnsigned(0x70)).toBe(3);expect(state.localeUpdate!.readUnsigned(12,1)).toBe(1);expect(owner.imageStorage('systemCodePageSelected').readUnsigned(0)).toBe(1);expect(state.codePage).toBe(null);expect(state.multibyteAllocation).toBe(null);
});

it('retains CPInfo and the copied candidate before unowned original SSE memset',()=>{
 const {owner}=argumentFixture(1,true,true);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('SSE memset');
 const state=owner.snapshot(),candidate=state.multibyteAllocation!,root=owner.imageStorage('initialMultibyte');expect(state.cpInfo!.readUnsigned(0)).toBe(1);expect(state.cpInfo!.knownMask[18]).toBe(0);expect(candidate.readUnsigned(0)).toBe(0);expect(candidate.bytes.slice(4)).toEqual(root.bytes.slice(4));expect(state.ptd!.pointer(0x68).get()).toBe(root);expect(state.ptd!.readUnsigned(0x70)).toBe(1);expect(owner.imageStorage('systemCodePageSelected').readUnsigned(0)).toBe(0);expect(state.trace.filter(v=>v.startsWith('configureMultibyte.tableCompare.'))).toHaveLength(5);expect(state.trace.filter(v=>v==='100a79df.REP_STOSD')).toHaveLength(0);expect(owner.processAttach()).toEqual(result);
});

it('prepares original SharedBase case repertoire and follows the Unicode classification probe and query',()=>{
 const {owner,platform}=argumentFixture();const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce300');
 const state=owner.snapshot(),item=state.caseState!;expect(item.wideCount).toBe(256);expect(item.input.readUnsigned(0,1)).toBe(32);for(let index=1;index<256;index++)expect(item.input.readUnsigned(index,1)).toBe(index);expect([...item.input.knownMask]).toEqual(Array(256).fill(255));
 expect(item.info.readUnsigned(0)).toBe(1);expect(item.info.readUnsigned(6,1)).toBe(0);expect(item.info.knownMask[18]).toBe(0);expect(item.probe.readUnsigned(0)).toBe(0);
 for(const fields of [item.types,item.lower,item.upper])expect([...fields.knownMask]).toEqual(Array(fields.bytes.length).fill(0));
 expect(owner.imageStorage('stringTypeMode').readUnsigned(0)).toBe(1);expect(state.ptd!.readUnsigned(0x70)).toBe(3);expect(state.ptd!.pointer(0x68).get()).toBe(owner.imageStorage('initialMultibyte'));expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(0);
 expect(state.trace.filter(v=>v==='100b1236.caseInputByte')).toHaveLength(256);expect(state.trace.filter(v=>v==='SharedBase.GetStringTypeW')).toHaveLength(1);expect(state.trace.filter(v=>v==='SharedBase.MultiByteToWideChar')).toHaveLength(1);expect(platform.argvNlsEndpoints!.invoke({identity:{}}).known).toBe(false);expect(owner.processAttach()).toEqual(result);expect(owner.snapshot().caseState!.input).toBe(item.input);
});

it('allocates SharedBase wide temporary within the enclosing setargv stack with relocated return and marker',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned');const denied=NativeX86ThreadStack.beginSharedStringTypeFrame(platform,{});expect(denied.known).toBe(false);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const item=owner.snapshot().caseState!,stack=item.stack!,temp=item.wideTemporary!;expect(temp.bytes.length).toBe(512);expect(temp.backing).toBe(item.probe.backing);expect(temp.backing.freed).toBe(false);
 const offset=temp.bytes.byteOffset-temp.backing.bytes.byteOffset;expect(offset%16).toBe(8);
 const state=stack.snapshot();expect(state.sharedFrame!.requestedBytes).toBe(520);expect(state.sharedFrame!.allocatedBytes).toBe(528);expect(state.sharedFrame!.probedPages).toEqual([]);expect(state.sharedFrame!.temporary).toBe(temp);expect(state.calls.filter(c=>c.site==='100c6f4c')).toHaveLength(1);expect(state.calls.find(c=>c.site==='100c6f4c')!.returned).toBe(true);
 expect(state.trace.filter(v=>v==='100a79df.REP_STOSD')).toHaveLength(128);expect(state.calls.find(c=>c.site==='100c6f80')!.returned).toBe(true);
 const reverse=new Map(nativeVirtualCp1252ArgvNlsSelection.reverse),candidate=owner.snapshot().multibyteAllocation!;
 for(let index=0;index<256;index++){const byte=index===0?32:index,type=nativeVirtualCp1252ArgvNlsSelection.ctype1[byte]!;expect(item.types.readUnsigned(index*2,2)).toBe(type);expect(item.lower.readUnsigned(index,1)).toBe(reverse.get(nativeVirtualCp1252ArgvNlsSelection.lower[byte]!));expect(item.upper.readUnsigned(index,1)).toBe(reverse.get(nativeVirtualCp1252ArgvNlsSelection.upper[byte]!));expect(candidate.readUnsigned(0x1d+index,1)).toBe(type&1?0x10:type&2?0x20:0);expect(candidate.readUnsigned(0x11d+index,1)).toBe(type&1?item.lower.readUnsigned(index,1):type&2?item.upper.readUnsigned(index,1):0);}
 expect(item.types.knownMask.every(mask=>mask===255)).toBe(true);expect(item.lower.knownMask.every(mask=>mask===255)).toBe(true);expect(item.upper.knownMask.every(mask=>mask===255)).toBe(true);
 expect(state.mappingFrames).toHaveLength(2);for(const frame of state.mappingFrames){expect(frame.returned).toBe(true);expect(frame.allocations.map(row=>row.allocated)).toEqual([524,528]);expect(frame.allocations.map(row=>row.requested)).toEqual([520,520]);for(const fields of [frame.input!,frame.output!]){expect(fields.backing).toBe(temp.backing);const at=fields.bytes.byteOffset-fields.backing.bytes.byteOffset;expect(at%16).toBe(8);if(frame===state.mappingFrames[1])expect(new DataView(fields.backing.bytes.buffer,fields.backing.bytes.byteOffset).getUint32(at-8,true)).toBe(0xcccc);}}
 const argv=state.sharedArgvFrame!;expect(argv.ebp).toBe(state.sharedCrtCallerFrame!.ebp-24);expect(argv.moduleReturned).toBe(true);expect(argv.multibytePending).toBe(false);expect(argv.parsePending).toBe(false);expect(argv.parserReturned).toBe(true);expect(argv.leadCalls).toBe(12);expect(argv.argumentCount.bytes.byteOffset-argv.argumentCount.backing.bytes.byteOffset).toBe(argv.ebp-8);expect(argv.byteCount.bytes.byteOffset-argv.byteCount.backing.bytes.byteOffset).toBe(argv.ebp-12);expect(argv.queryCounts).toEqual({count:2,bytes:12});expect(argv.fillCounts).toEqual({count:2,bytes:12});const module=owner.imageStorage('moduleNameBuffer');expect(Array.from(module.bytes.slice(0,12))).toEqual([71,111,116,104,105,99,51,46,101,120,101,0]);expect(module.readUnsigned(260,1)).toBe(0);expect(owner.snapshot().argvInput!.fields).toBe(module);expect(owner.imageStorage('programName').pointer<{fields:object;offset:number}>(0).get()).toEqual({fields:module,offset:0});expect(owner.imageStorage('argumentCount').readUnsigned(0)).toBe(1);expect(owner.imageStorage('argumentVector').pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields).toBe(owner.snapshot().argvAllocation);expect(state.calls.find(call=>call.site==='100c0bd1')!.returned).toBe(true);expect(state.calls.find(call=>call.site==='100c0bba')!.returned).toBe(true);
 const parent=state.setMultibyteFrame!;expect(parent.ebp).toBe(argv.ebp-40);expect(parent.pendingInstallation).toBe(false);expect(parent.returned).toBe(true);expect(parent.global).toBe(true);expect(parent.counterCursor).toBe(4);expect(parent.scopeAtReturn).toMatchObject({provenance:{kind:'xor',left:{provenance:{kind:'source',type:'image',address:'100f8be0'}},right:{value:0xbb40e64e,knownMask:0xffffffff}}});expect(parent.cookieAtReturn).toMatchObject({provenance:{kind:'xor',left:{value:0xbb40e64e,knownMask:0xffffffff},right:{provenance:{kind:'stack',offset:parent.ebp}}}});expect(parent.oldFs).toMatchObject({knownMask:0});expect(owner.imageStorage('initialMultibyte').readUnsigned(0)).toBe(0xffffffff);expect(owner.snapshot().multibyteAllocation!.readUnsigned(0)).toBe(2);expect(state.fs0).toMatchObject({word:{knownMask:0}});expect(state.registers.EBP).toMatchObject({word:{provenance:{kind:'stack',offset:4024}}});expect(state.calls.find(call=>call.site==='100b16c1')!.returned).toBe(true);expect(state.trace).toContain('100aeb68.setmbcpSehProlog');
 const configuration=state.configurationFrame!;expect(configuration.returned).toBe(true);expect(configuration.ebp).toBe(parent.ebp-68);expect(configuration.codePage).toBe(1252);expect(configuration.info.bytes.byteOffset-configuration.info.backing.bytes.byteOffset).toBe(configuration.ebp-24);expect(configuration.info.readUnsigned(0)).toBe(1);expect(state.trace.filter(row=>row.startsWith('100b14e1.configurationTableCompare.'))).toHaveLength(5);expect(state.trace).toContain('100b1549.configurationMemsetReturn');expect(state.registers.EBX).toMatchObject({word:{knownMask:0}});expect(state.currentPc).toMatchObject({provenance:{kind:'source',address:'100ce0a8'}});expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(1);expect(owner.imageStorage('multibytePointer').pointer(0).get()).toBe(candidate);
 const published=owner.imageStorage('multibytePublishedFields');for(const [at,from] of [[12,4],[16,8],[20,12]] as const)expect(published.readUnsigned(at)).toBe(candidate.readUnsigned(from));for(let i=0;i<5;i++)expect(published.readUnsigned(i*2,2)).toBe(candidate.readUnsigned(16+i*2,2));for(let i=0;i<257;i++)expect(owner.imageStorage('multibyteTypeTable').readUnsigned(i,1)).toBe(candidate.readUnsigned(28+i,1));for(let i=0;i<256;i++)expect(owner.imageStorage('multibyteCaseTable').readUnsigned(i,1)).toBe(candidate.readUnsigned(285+i,1));expect(state.trace.filter(row=>row.startsWith('setmbcp.publish.'))).toHaveLength(518);for(const site of ['100b1730','100b1755','100b1770','100b17e7','100b180b','100b1814','100b181d','100b184e','100b185f'])expect(state.calls.find(call=>call.site===site)!.returned).toBe(true);
 const enclosing=state.caseFrame!;expect(enclosing.originalEbp).toBe(configuration.ebp-52);expect(enclosing.returned).toBe(true);expect(enclosing.deferredBytes).toBe(0);expect(enclosing.tableIndex).toBe(256);expect(state.trace.filter(row=>row==='100b12e2.sourceCaseTableByte')).toHaveLength(256);expect(state.registers.EAX).toMatchObject({word:{value:0,knownMask:0xffffffff}});expect(enclosing.originalEbp-enclosing.ebp).toBe(0x49c);for(const [fields,relative] of [[item.info,-0x7c],[item.types,-0x68],[item.upper,0x198],[item.lower,0x298],[item.input,0x398]] as const){expect(fields.backing).toBe(temp.backing);expect(fields.bytes.byteOffset-fields.backing.bytes.byteOffset).toBe(enclosing.ebp+relative);}
 for(const site of ['100b1718','100b14be','100b1516','100b1529','100b1541','100b1677','100b1614','100b1221','100b1293','100b12b3','100b12d8','100c704b','100b50f2','100b137a'])expect(state.calls.find(call=>call.site===site)!.returned).toBe(true);expect(state.trace).toContain('100b12b8.ADD ESP68');expect(state.trace).toContain('100b12dd.ADD ESP36');
 expect(state.mappingFrames[1]!.input!.readUnsigned(256,2)).toBe(0x20ac);expect(owner.imageStorage('localeMapMode').readUnsigned(0)).toBe(1);expect(state.calls.filter(call=>call.site==='100b4d74')).toHaveLength(1);expect(owner.snapshot().trace.filter(item=>item==='100b12e2.caseTableByte')).toHaveLength(256);
 expect(state.phase).toBe('blocked');expect(state.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);expect(state.calls.find(c=>c.site==='100c6f95')).toBeDefined();expect(state.calls.find(c=>c.site==='100c6fa3')).toBeDefined();expect(state.calls.find(c=>c.site==='100c6fad')).toBeDefined();expect(state.calls.find(c=>c.site==='100c7038')).toBeDefined();expect(state.trace).toContain('100b4d0f.stackMarker.noHeapFree');expect(state.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:3992}}});
 expect(NativeX86ThreadStack.clearSharedStringTypeTemporary(stack,{}).known).toBe(false);expect(stack.snapshot().phase).toBe(state.phase);
 expect(()=>item.probe.readUnsigned(0)).toThrow();expect(item.wideCount).toBe(256);expect(owner.snapshot().ptd!.readUnsigned(0x70)).toBe(1);expect(owner.snapshot().ptd!.pointer(0x68).get()).toBe(candidate);expect(NativeX86ThreadStack.allocateSharedStringTypeTemporary(stack,{}).known).toBe(false);expect(stack.snapshot().phase).toBe(state.phase);expect(owner.processAttach()).toEqual(result);expect(owner.snapshot().caseState!.wideTemporary).toBe(temp);
});
it('retains the SharedBase helper frame and allocation call before unknown stack alignment',()=>{
 const {owner}=argumentFixture(1,true,false,'opaque');const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('low-bit geometry');
 const item=owner.snapshot().caseState!,state=item.stack!.snapshot();expect(item.wideCount).toBe(256);expect(item.wideTemporary).toBe(null);expect(state.phase).toBe('blocked');expect(state.sharedFrame!.requestedBytes).toBe(520);expect(state.sharedFrame!.allocatedBytes).toBe(null);expect(state.calls.find(c=>c.site==='100c6f4c')!.returned).toBe(false);expect(owner.processAttach()).toEqual(result);
});
it('restores classification locale ownership before entering the next case-map scope',()=>{
 for(const ownLocale of [0,1,3]){
  const {owner,platform}=argumentFixture(ownLocale,true,false,'aligned');const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
  const state=owner.snapshot(),stack=state.caseState!.stack!;expect(stack.snapshot().phase).toBe('blocked');expect(state.ptd!.readUnsigned(0x70)).toBe(ownLocale);expect(state.localeUpdate!.readUnsigned(12,1)).toBe(ownLocale&2?0:1);expect(state.ptd!.pointer(104).get()).toBe(state.multibyteAllocation);expect(state.multibyteAllocation!.readUnsigned(0)).toBe(ownLocale&2?1:2);expect(owner.imageStorage('initialMultibyte').readUnsigned(0)).toBe(ownLocale&2?0:0xffffffff);expect(stack.snapshot().setMultibyteFrame!.global).toBe((ownLocale&2)===0);expect(stack.snapshot().calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);
  expect(state.trace.filter(item=>item==='100b5123.mappingLocale.restore')).toHaveLength(ownLocale&2?0:2);
  expect(NativeX86ThreadStack.returnSharedMappingFrame(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedMappingFrame(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.allocateSharedMappingTemporary(stack,{}).known).toBe(false);
  expect(state.trace.filter(item=>item==='100c7076.classificationLocale.restore')).toHaveLength(ownLocale&2?0:1);
  expect(NativeX86ThreadStack.returnSharedStringTypeFrame(stack,{}).known).toBe(false);expect(stack.snapshot().phase).toBe('blocked');expect(NativeSharedCrtOwner.sharedStackArgumentsForPlatform(platform,{}).known).toBe(false);
  expect(NativeX86ThreadStack.returnSharedCaseFrame(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedCaseWrapper(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.finishSharedCaseWrapper(stack,{}).known).toBe(false);expect(stack.snapshot().phase).toBe('blocked');expect(NativeSharedCrtOwner.caseStackArgumentsForPlatform(platform,{}).known).toBe(false);
  expect(NativeX86ThreadStack.beginSharedSetMultibyteFrame(platform,{}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedSetMultibyteInstallation(stack,{}).known).toBe(false);expect(NativeSharedCrtOwner.setMultibyteStackArgumentsForPlatform(platform,{}).known).toBe(false);
  expect(NativeX86ThreadStack.returnSharedConfigurationFrame(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedConfigurationFrame(platform,{}).known).toBe(false);expect(NativeSharedCrtOwner.configurationStackArgumentsForPlatform(platform,{}).known).toBe(false);expect(stack.snapshot().phase).toBe('blocked');
  expect(NativeX86ThreadStack.writeSharedCaseTableEntry(stack,{},0).known).toBe(false);expect(stack.snapshot().phase).toBe('blocked');
 }
});
it('rejects incompatible page geometry before constructing a mapping-capable thread',()=>{
 expect(()=>argumentFixture(1,true,false,'aligned',1024)).toThrow('Declared opaque-relative');
});

it('rejects changed setmbcp helper receipts before admitting SharedBase runtime state',()=>{
 for(const label of ['sehProlog4','sehEpilog4','releaseSetMultibyteLock'] as const){const receipt=sharedCrtSource.methods[label],original=receipt.bodyInstructionBytesSha256;try{receipt.bodyInstructionBytesSha256='0'.repeat(64);expect(()=>argumentFixture()).toThrow('Original SharedBase CRT source differs: '+label);}finally{receipt.bodyInstructionBytesSha256=original;}}
 expect(()=>argumentFixture()).not.toThrow();
});
it('rejects an altered live setmbcp scope before entering the logical-thread frame',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned');owner.imageStorage('setMultibyteScopeTable').writeUnsigned(24,0);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Original setmbcp scope table required');expect(owner.snapshot().caseState).toBe(null);expect(owner.snapshot().multibyteAllocation).toBe(null);expect(owner.processAttach()).toEqual(result);expect(NativeSharedCrtOwner.setMultibyteStackArgumentsForPlatform(platform,{}).known).toBe(false);
});

it('honors the global locale mask when retaining a PTD-only multibyte candidate',()=>{
 const {owner,platform}=argumentFixture(0,true,false,'aligned');owner.imageStorage('threadLocaleMask').writeUnsigned(0,0xffffffff);const beforeTypes=Array.from(owner.imageStorage('multibyteTypeTable').bytes),beforeCases=Array.from(owner.imageStorage('multibyteCaseTable').bytes);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('multibyte reference exchange');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.ptd!.pointer(104).get()).toBe(state.multibyteAllocation);expect(state.multibyteAllocation!.readUnsigned(0)).toBe(1);expect(owner.imageStorage('initialMultibyte').readUnsigned(0)).toBe(0);expect(owner.imageStorage('multibytePointer').readUnsigned(0)).toBe(0x10140e60);expect(Array.from(owner.imageStorage('multibyteTypeTable').bytes)).toEqual(beforeTypes);expect(Array.from(owner.imageStorage('multibyteCaseTable').bytes)).toEqual(beforeCases);expect(stack.setMultibyteFrame!.global).toBe(false);expect(stack.setMultibyteFrame!.counterCursor).toBe(2);expect(stack.calls.some(call=>call.site==='100b1770')).toBe(false);expect(stack.phase).toBe('blocked');expect(stack.sharedArgvFrame!.parserReturned).toBe(false);expect(stack.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb46','100c0bfc','100c0a62','100d1fd1','100d1e15']);expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(1);expect(NativeRuntimePlatform.invokeSharedInterlockedCounter(platform,{}).known).toBe(false);expect(NativeRuntimePlatform.canonicalSharedInterlockedReturn(platform,{}).known).toBe(false);expect(state.multibyteAllocation!.readUnsigned(0)).toBe(1);
});

it('selects the actual nonempty command line while retaining the module program-name pointer',()=>{
 const command=[34,71,111,116,104,105,99,51,46,101,120,101,34,32,45,100,101,98,117,103,0];const {owner,platform}=argumentFixture(1,true,false,'aligned',4096,command);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');const state=owner.snapshot(),input=owner.imageStorage('commandLinePointer').pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(state.argvInput).toBe(input);expect(Array.from(input.fields.bytes)).toEqual(command);expect(owner.imageStorage('programName').pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields).toBe(owner.imageStorage('moduleNameBuffer'));const stack=state.caseState!.stack!;expect(stack.snapshot().sharedArgvFrame!.parsePending).toBe(false);expect(stack.snapshot().sharedArgvFrame!.queryCounts).toEqual({count:3,bytes:19});expect(stack.snapshot().sharedArgvFrame!.fillCounts).toEqual({count:3,bytes:19});expect(NativeX86ThreadStack.beginSharedArgvParseQuery(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedArgvFrame(platform,{}).known).toBe(false);expect(NativeSharedCrtOwner.argvStackArgumentsForPlatform(platform,{}).known).toBe(false);expect(stack.snapshot().phase).toBe('blocked');expect(owner.processAttach()).toEqual(result);
});

it.each([
 ['G3',2,3,['G3']], ['""',2,1,['']], [' G3',3,4,['','G3']], ['"G3"',2,3,['G3']], ['G3 one two',4,11,['G3','one','two']],
 ['G3 "one two"',3,11,['G3','one two']], ['G3 ""',3,4,['G3','']], ['G3   one\ttwo  ',4,11,['G3','one','two']],
 ['G3 "unterminated',3,16,['G3','unterminated']], ['"C:\\Program Files\\Gothic3.exe" -debug',3,36,['C:\\Program Files\\Gothic3.exe','-debug']],
 ['G3 a\\\\"b',3,7,['G3','a\\b']], ['G3 a\\\\\\"b',3,8,['G3','a\\"b']], ['G3 "a""b"',3,7,['G3','a"b']],
] as const)('counts and fills original SharedBase argv for %s',(command,count,bytes,expected)=>{
 const input=[...command].map(char=>char.charCodeAt(0)).concat(0),{owner,platform}=argumentFixture(1,true,false,'aligned',4096,input);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const stack=owner.snapshot().caseState!.stack!,state=stack.snapshot(),frame=state.sharedArgvFrame!;
 expect(frame.parserReturned).toBe(true);expect(frame.parsePending).toBe(false);expect(frame.queryCounts).toEqual({count,bytes});expect(frame.fillCounts).toEqual({count,bytes});
 expect(state.registers.EAX).toMatchObject({word:{value:0,knownMask:0xffffffff}});expect(state.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);
 expect(state.calls.find(call=>call.site==='100c0bfc')!.returned).toBe(true);expect(state.calls.filter(call=>call.site==='100d1e15').every(call=>call.returned)).toBe(true);expect(owner.snapshot().ptd!.readUnsigned(0x70)).toBe(1);
 expect(owner.imageStorage('argumentCount').readUnsigned(0)).toBe(count-1);expect(owner.imageStorage('argumentVector').pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields).toBe(owner.snapshot().argvAllocation);
 const allocation=owner.snapshot().argvAllocation!;expect(allocation.bytes.length).toBe(count*4+bytes);expect(frame.queryCounts).toEqual({count,bytes});expect(frame.fillReturned).toBe(true);expect(frame.returned).toBe(true);expect(frame.result).toBe(0);expect(frame.environmentPending).toBe(false);
 expect(NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,owner.imageStorage('heapHandle').pointer<NativeWin32HeapCapability>(0).get()!,owner.identity,{fields:allocation,offset:0},allocation.bytes.length).known).toBe(true);expect(readArgv(allocation,count-1)).toEqual(expected);expect(allocation.pointer((count-1)*4).get()).toBe(null);expect(Array.from(allocation.knownMask.slice(count*4))).toEqual(Array(bytes).fill(255));
 expect(NativeX86ThreadStack.runSharedArgvParseQuery(stack,{},()=>{throw new Error('Forged callback invoked');}).known).toBe(false);expect(NativeSharedCrtOwner.argvLocalStorageForPlatform(platform,{},frame.argumentCount).known).toBe(false);expect(NativeX86ThreadStack.beginSharedArgvAllocation(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.finishSharedArgvAllocation(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedArgvParseFill(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.runSharedArgvParseFill(stack,{},()=>{throw new Error('Forged fill callback');}).known).toBe(false);expect(NativeX86ThreadStack.returnSharedArgvFrame(stack,{}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedArgvEnvironment(stack,{}).known).toBe(false);expect(stack.snapshot().phase).toBe('blocked');expect(owner.processAttach()).toEqual(result);
});
it('counts all high CP1252 bytes through original signed lead-byte calls',()=>{
 const command=[71,51,32,...Array.from({length:128},(_,i)=>i+128),0],{owner}=argumentFixture(0,true,false,'aligned',4096,command);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const frame=owner.snapshot().caseState!.stack!.snapshot().sharedArgvFrame!;expect(frame.queryCounts).toEqual({count:3,bytes:132});expect(frame.fillCounts).toEqual({count:3,bytes:132});expect(frame.leadCalls).toBe(131);expect(frame.fillLeadCalls).toBe(131);expect(readArgv(owner.snapshot().argvAllocation!,2)).toEqual(['G3',String.fromCharCode(...Array.from({length:128},(_,i)=>i+128))]);expect(owner.snapshot().ptd!.readUnsigned(0x70)).toBe(0);
});

function readArgv(allocation:NativeHeapObjectViews,count:number):string[]{
 return Array.from({length:count},(_,index)=>{
  const pointer=allocation.pointer<{fields:NativeHeapObjectViews;offset:number}>(index*4).get()!;expect(pointer.fields).toBe(allocation);expect(pointer.offset).toBeGreaterThanOrEqual((count+1)*4);
  let text='';for(let offset=pointer.offset;;offset++){const byte=allocation.readUnsigned(offset,1);if(byte===0)return text;text+=String.fromCharCode(byte);}
 });
}

it('returns original setargv -1 and errno 12 when its allocation fails',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);
 platform.win32HeapAlloc=(heap,flags,bytes)=>{if(flags===0&&bytes===20){platform.setWin32LastError(55);return {known:true,value:null};}return allocate(heap,flags,bytes);};
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100adb6f');
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),frame=stack.sharedArgvFrame!;expect(state.argvAllocation).toBe(null);expect(state.argvReturned).toBe(-1);expect(frame.result).toBe(-1);expect(frame.returned).toBe(true);expect(frame.parserReturned).toBe(true);expect(frame.allocationReturned).toBe(true);expect(frame.fillReturned).toBe(false);expect(frame.environmentPending).toBe(false);
 expect(state.ptd!.readUnsigned(8)).toBe(12);expect(platform.getWin32LastError()).toEqual({known:true,value:55});expect(owner.imageStorage('argumentCount').readUnsigned(0)).toBe(0);expect(owner.imageStorage('argumentVector').pointer(0).get()).toBe(null);
 expect(stack.phase).toBe('returned');expect(stack.registers.EAX).toMatchObject({word:{value:0xffffffff,knownMask:0xffffffff}});expect(stack.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4060}}});expect(stack.calls.filter(call=>call.site!=='100adc79').every(call=>call.returned)).toBe(true);expect(stack.calls.some(call=>call.site==='100c0c3d')).toBe(false);expect(owner.processAttach()).toEqual(result);
});
it('retains the malloc wrapper Sleep call after its translated lower failure',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);owner.imageStorage('allocationRetryDelay').writeUnsigned(0,1000);
 platform.win32HeapAlloc=(heap,flags,bytes)=>flags===0&&bytes===20?{known:true,value:null}:allocate(heap,flags,bytes);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aeeed');
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.phase).toBe('blocked');expect(stack.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb46','100c0c23','100aeeed']);expect(stack.calls.find(call=>call.site==='100aeed8')!.returned).toBe(true);expect(state.argvReturned).toBe(null);expect(state.ptd!.readUnsigned(8)).toBe(12);expect(stack.sharedArgvFrame!.fillReturned).toBe(false);expect(owner.processAttach()).toEqual(result);
});

it.each([
 [[],[]],
 [['=C:=C:\\G3','A=B','PATH=C:\\G3'],['A=B','PATH=C:\\G3']],
 [['=C:=C:\\G3','=D:=D:\\G3'],[]],
 [['A=1','A=2','NOEQUAL','Z='],['A=1','A=2','NOEQUAL','Z=']],
 [['X=with spaces','TAB=a\tb','EQ=a=b'],['X=with spaces','TAB=a\tb','EQ=a=b']],
] as const)('builds original SharedBase environment vector from %j',(entries,expected)=>{
 const block=(entries.join('\0')+'\0\0'),wide=Array.from(block).flatMap(char=>[char.charCodeAt(0),0]);
 const {owner,platform}=argumentFixture(1,true,false,'aligned',4096,[0],wide);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot(),stack=state.caseState!.stack!,frame=stack.snapshot().sharedEnvironmentFrame!,vector=state.environmentVector!;
 expect(state.setEnvpReturned).toBe(0);expect(frame.returned).toBe(true);expect(frame.result).toBe(0);expect(frame.initializersPending).toBe(true);expect(frame.strlenCalls).toBe(entries.length*2);expect(frame.callocCalls).toBe(expected.length+1);expect(frame.freeCalls).toBe(1);
 expect(vector.bytes.length).toBe((expected.length+1)*4);expect(state.environmentStrings).toHaveLength(expected.length);expect(readEnvironment(vector,expected.length)).toEqual(expected);expect(vector.pointer(expected.length*4).get()).toBe(null);
 expect(owner.imageStorage('environmentVector').pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()).toEqual({fields:vector,offset:0});expect(owner.imageStorage('environmentPointer').pointer(0).get()).toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(1);expect(state.environmentAllocation!.backing.freed).toBe(true);expect(vector.backing.freed).toBe(false);
 for(const [index,string] of state.environmentStrings.entries()){expect(vector.pointer<{fields:NativeHeapObjectViews;offset:number}>(index*4).get()!.fields).toBe(string);expect(string.bytes.length).toBe(expected[index]!.length+1);expect(string.knownMask.every(mask=>mask===255)).toBe(true);expect(string.backing.freed).toBe(false);expect(NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,state.heap!,owner.identity,{fields:string,offset:0},string.bytes.length).known).toBe(true);}
 expect(stack.snapshot().calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);expect(stack.snapshot().calls.find(call=>call.site==='100adb4f')!.returned).toBe(true);expect(NativeX86ThreadStack.runSharedEnvironment(stack,{}, {calloc:()=>{throw new Error('Forged calloc');},free:()=>{throw new Error('Forged free');}}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedEnvironmentInitializers(stack,{}).known).toBe(false);expect(stack.snapshot().phase).toBe('blocked');expect(owner.processAttach()).toEqual(result);
});
it('preserves high ANSI environment bytes through the original strcpy_s path',()=>{
 const input=[65,61,128,255,0,0],{owner}=argumentFixture(1,true,false,'aligned',4096,[0],null,input);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot();expect(readEnvironment(state.environmentVector!,1)).toEqual(['A='+String.fromCharCode(128,255)]);expect(Array.from(state.environmentStrings[0]!.bytes)).toEqual(input.slice(0,-1));expect(state.environmentAllocation!.backing.freed).toBe(true);
});
it('returns setenvp -1 for NULL environment input without allocation or publication',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],null,null),result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100adb6f');
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),frame=stack.sharedEnvironmentFrame!;expect(state.setEnvpReturned).toBe(-1);expect(frame.result).toBe(-1);expect(frame.callocCalls).toBe(0);expect(frame.strlenCalls).toBe(0);expect(frame.freeCalls).toBe(0);expect(state.environmentVector).toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(0);expect(stack.phase).toBe('returned');expect(stack.calls.filter(call=>call.site!=='100adc79').every(call=>call.returned)).toBe(true);expect(owner.processAttach()).toEqual(result);
});
it('preserves the environment block when vector calloc fails',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,bytes)=>flags===8&&bytes===4?{known:true,value:null}:allocate(heap,flags,bytes);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100adb6f');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.setEnvpReturned).toBe(-1);expect(state.environmentVector).toBe(null);expect(state.environmentAllocation!.backing.freed).toBe(false);expect(owner.imageStorage('environmentVector').pointer(0).get()).toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(0);expect(state.ptd!.readUnsigned(8)).toBe(0);expect(stack.calls.filter(call=>call.site!=='100adc79').every(call=>call.returned)).toBe(true);expect(owner.processAttach()).toEqual(result);
});
it('frees only the vector after a later environment string allocation fails',()=>{
 const wide=Array.from('A=B\0C=D\0\0').flatMap(char=>[char.charCodeAt(0),0]),{owner,platform}=argumentFixture(1,true,false,'aligned',4096,[0],wide),allocate=platform.win32HeapAlloc.bind(platform);let strings=0;
 platform.win32HeapAlloc=(heap,flags,bytes)=>flags===8&&bytes===4&&++strings===2?{known:true,value:null}:allocate(heap,flags,bytes);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100adb6f');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.setEnvpReturned).toBe(-1);expect(state.environmentVector!.backing.freed).toBe(true);expect(state.environmentAllocation!.backing.freed).toBe(false);expect(state.environmentStrings).toHaveLength(1);expect(state.environmentStrings[0]!.backing.freed).toBe(false);expect(Array.from(state.environmentStrings[0]!.bytes)).toEqual([65,61,66,0]);expect(owner.imageStorage('environmentVector').pointer(0).get()).toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(0);expect(stack.sharedEnvironmentFrame!.freeCalls).toBe(1);expect(stack.phase).toBe('returned');expect(owner.processAttach()).toEqual(result);
});
it('retains copied environment output before unowned HeapFree failure mapping',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),free=platform.win32HeapFree.bind(platform);platform.win32HeapFree=(heap,flags,backing)=>backing===owner.snapshot().environmentAllocation?.backing?{known:true,value:false}:free(heap,flags,backing);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('free errno mapping');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.setEnvpReturned).toBe(null);expect(state.environmentVector!.backing.freed).toBe(false);expect(state.environmentAllocation!.backing.freed).toBe(false);expect(owner.imageStorage('environmentPointer').pointer(0).get()).not.toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(0);expect(stack.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb4f','100c09d0']);expect(stack.phase).toBe('blocked');expect(owner.processAttach()).toEqual(result);
});
function readEnvironment(vector:NativeHeapObjectViews,count:number):string[]{
 return Array.from({length:count},(_,index)=>{const pointer=vector.pointer<{fields:NativeHeapObjectViews;offset:number}>(index*4).get()!;expect(pointer.offset).toBe(0);let text='';for(let offset=0;;offset++){const byte=pointer.fields.readUnsigned(offset,1);if(byte===0)return text;text+=String.fromCharCode(byte);}});
}
it('executes cinit image validation, restores FS and installs conversion code addresses before the division query',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned');const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot(),stack=state.caseState!.stack!,snapshot=stack.snapshot(),frame=snapshot.sharedInitializerFrame!;
 expect(frame.entryEsp).toBe(snapshot.sharedCrtCallerFrame!.entryEsp-44);expect(frame.ownershipReturned).toBe(1);expect(frame.fsRestored).toBe(true);expect(frame.conversionInstalled).toBe(true);expect(frame.operations).toBeGreaterThan(100);
 expect(Array.from({length:10},(_,index)=>state.initializerImages['10141480']!.pointer(index*4).get())).toEqual(expect.arrayContaining(Array.from({length:10},()=>expect.any(Object))));expect(state.initializerImages['10141480']!.pointer(0).get()).toBe(state.initializerImages['10141480']!.pointer(20).get());
 expect(state.initializerImages['102f6424']!.readUnsigned(0)).toBe(0);
 for(const site of ['100aa640','100ae93f','100ae959','100a78fe'])expect(snapshot.calls.find(call=>call.site===site)!.returned).toBe(true);
 expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:3992}}});
 expect(NativeSharedCrtOwner.initializerStackArgumentsForPlatform(platform,{}).known).toBe(false);expect(NativeX86ThreadStack.runSharedInitializers(stack,{}).known).toBe(false);expect(stack.snapshot().sharedInitializerFrame!.operations).toBe(frame.operations);expect(owner.processAttach()).toEqual(result);
});
it.each(['dos','nt','optional','sections','writable'] as const)('follows the original cinit ownership rejection for %s header state',mode=>{
 const {owner}=argumentFixture(1,true,false,'aligned'),header=owner.snapshot().initializerImages['10000000']!,nt=header.readUnsigned(0x3c);
 if(mode==='dos')header.writeUnsigned(0,0,2);else if(mode==='nt')header.writeUnsigned(nt,0);else if(mode==='optional')header.writeUnsigned(nt+24,0,2);else if(mode==='sections')header.writeUnsigned(nt+6,0,2);else {const sections=nt+24+header.readUnsigned(nt+20,2);header.writeUnsigned(sections+40+36,0xc0000040);}
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot(),frame=snapshot.sharedInitializerFrame!;expect(frame.ownershipReturned).toBe(0);expect(frame.fsRestored).toBe(true);expect(frame.conversionInstalled).toBe(false);expect(state.initializerImages['10141480']!.pointer(0).get()).not.toBeNull();expect(snapshot.calls.some(call=>call.site==='100aa64e')).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);expect(owner.processAttach()).toEqual(result);
});
it('skips a live NULL floating-point hook and retains the actual conversion encoding call',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['100ed568']!.writeUnsigned(0,0);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.ownershipReturned).toBeNull();expect(snapshot.sharedInitializerFrame!.conversionInstalled).toBe(false);expect(snapshot.calls.some(call=>call.site==='100aa640')).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);
});
it('retains an unowned live hook target after actual image ownership validation',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['100ed568']!.writeUnsigned(0,0x1000dead);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa64e -> 1000dead');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.ownershipReturned).toBe(1);expect(snapshot.sharedInitializerFrame!.fsRestored).toBe(true);expect(snapshot.sharedInitializerFrame!.conversionInstalled).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa64e']);expect(owner.processAttach()).toEqual(result);
});
it('keeps the unresolved image-check frame when a live header relation exceeds its owned span',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['10000000']!.writeUnsigned(0x3c,0x1000);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ae891');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.ownershipReturned).toBeNull();expect(snapshot.sharedInitializerFrame!.fsRestored).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa640','100ae93f']);expect(owner.processAttach()).toEqual(result);
});
it.each([false,true])('returns the original division query and publishes virtual erratum %s through FNCLEX and the hook return',erratum=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot(),frame=snapshot.sharedInitializerFrame!;expect(frame.divisionQueryResult).toBe(erratum?1:0);expect([frame.moduleCalls,frame.procedureCalls,frame.featureCalls]).toEqual([1,1,1]);expect(state.initializerImages['102f6424']!.readUnsigned(0)).toBe(erratum?1:0);expect(snapshot.registers.EAX).toMatchObject({word:{value:0,knownMask:0xffffffff}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:3992}}});
 for(const site of ['100a7903','100b4490','100b44a0','100b44ac'])expect(snapshot.calls.find(call=>call.site===site)!.returned).toBe(true);
 expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);expect(snapshot.x87Status).toMatchObject({word:{value:0,knownMask:0x80ff}});expect(snapshot.calls.find(call=>call.site==='100aa64e')!.returned).toBe(true);expect(snapshot.trace).toContain('100a791b.sharedInitializer.RET');expect(snapshot.trace).not.toContain('100b44af.sharedInitializer.JMP');expect(snapshot.calls.some(call=>call.site==='100a7914')).toBe(false);expect(platform.getWin32LastError()).toEqual({known:true,value:0});expect(owner.processAttach()).toEqual(result);
});
it('retains the actual feature call when the virtual processor result is absent',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Explicit virtual floating-point precision erratum');
 const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot(),frame=snapshot.sharedInitializerFrame!;expect(frame.divisionQueryResult).toBeNull();expect([frame.moduleCalls,frame.procedureCalls,frame.featureCalls]).toEqual([1,1,1]);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa64e','100a7903','100b44ac']);expect(state.initializerImages['102f6424']!.readUnsigned(0)).toBe(0);expect(snapshot.trace).not.toContain('100a790d.sharedInitializer.MOV');expect(owner.processAttach()).toEqual(result);
});
it('follows a missing processor export into the original x87 fallback frame',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:false,erratum:false});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('FLD');expect(result.reason).toContain('100b4455');
 const snapshot=owner.snapshot().caseState!.stack!.snapshot(),frame=snapshot.sharedInitializerFrame!;expect([frame.moduleCalls,frame.procedureCalls,frame.featureCalls]).toEqual([1,1,0]);expect(frame.divisionQueryResult).toBeNull();expect(snapshot.trace).toContain('100b44af.sharedInitializer.JMP');expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4012}}});expect(snapshot.registers.EBP).toMatchObject({word:{provenance:{kind:'stack',offset:4036}}});expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa64e','100a7903']);expect(owner.processAttach()).toEqual(result);
});
it('follows a NULL module result into the same x87 fallback without a procedure lookup',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),get=platform.getWin32ModuleHandle.bind(platform);platform.getWin32ModuleHandle=name=>name==='KERNEL32'?{known:true,value:null}:get(name);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100b4455');
 const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect([snapshot.sharedInitializerFrame!.moduleCalls,snapshot.sharedInitializerFrame!.procedureCalls,snapshot.sharedInitializerFrame!.featureCalls]).toEqual([1,0,0]);expect(snapshot.calls.some(call=>call.site==='100b44a0')).toBe(false);expect(snapshot.calls.find(call=>call.site==='100b4490')!.returned).toBe(true);expect(owner.processAttach()).toEqual(result);
});
it.each(['102f9768','102f9648'])('rejects a forged processor import in actual slot %s',slot=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages[slot]!.pointer(0).set({name:slot==='102f9768'?'GetModuleHandleA':'GetProcAddress'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual retained SharedBase initializer import slot');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.featureCalls).toBe(0);expect(snapshot.sharedInitializerFrame!.divisionQueryResult).toBeNull();expect(owner.processAttach()).toEqual(result);
});

it('encodes ten conversion pointers through actual cached PTD calls and preserves duplicate identity',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned');const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot(),table=state.initializerImages['10141480']!;
 for(const site of ['100b4413','100ae288','100ae29f','100ae2a1','100ae2dd']){const calls=snapshot.calls.filter(call=>call.site===site);expect(calls).toHaveLength(site==='100b4413'?10:11);expect(calls.filter(call=>call.site!=='100adc79').every(call=>call.returned)).toBe(true);}
 expect(snapshot.calls.find(call=>call.site==='100aa655')!.returned).toBe(true);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);
 const module=platform.getWin32ModuleHandle('KERNEL32.DLL');if(!module.known||!module.value)throw new Error('Module missing');const decode=platform.getWin32Procedure(module.value,'DecodePointer');if(!decode.known||!decode.value)throw new Error('Decode missing');
 const expected=[0x100b43e6,0x100b3a8b,0x100b3a49,0x100b3a7d,0x100b39f3,0x100b43e6,0x100b4360,0x100b3a09,0x100b3973,0x100b3902];
 for(let index=0;index<10;index++){const encoded=table.pointer<object>(index*4).get()!;expect(encoded).not.toBeNull();const decoded=decode.value.invoke(encoded);expect(decoded.known).toBe(true);if(!decoded.known)throw new Error(decoded.reason);expect(decoded.value).toMatchObject({owner:owner.identity,originalCodeAddress:expected[index]});}
 expect(table.pointer(0).get()).toBe(table.pointer(20).get());expect(new Set(Array.from({length:10},(_,index)=>table.pointer(index*4).get())).size).toBe(9);expect(platform.getWin32LastError()).toEqual({known:true,value:0});expect(owner.processAttach()).toEqual(result);
});
it('returns original conversion DWORDs when the actual cached codec slot is NULL',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),thread=platform.getCurrentThreadId.bind(platform);platform.getCurrentThreadId=()=>{const result=thread();owner.snapshot().ptd!.pointer(0x1f8).set(null);return result;};
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100ce0a8');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(state.initializerImages['10141480']!.readUnsigned(0)).toBe(0x100b43e6);expect(snapshot.calls.filter(call=>call.site==='100b4413')).toHaveLength(10);expect(snapshot.calls.some(call=>call.site==='100ae2dd')).toBe(false);expect(snapshot.calls.find(call=>call.site==='100aa655')!.returned).toBe(true);
});
it('rejects a copied cached EncodePointer capability at the actual PTD slot read',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),thread=platform.getCurrentThreadId.bind(platform);platform.getCurrentThreadId=()=>{const result=thread(),ptd=owner.snapshot().ptd!,codec=ptd.pointer<object>(0x1f8).get()!;ptd.pointer(0x1f8).set({...codec});return result;};
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('same-platform pointer codec');expect(result.reason).toContain('100ae2a7');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.find(call=>call.site==='100ae2a1')!.returned).toBe(true);expect(snapshot.calls.some(call=>call.site==='100ae2dd')).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa655','100b4413']);expect(owner.processAttach()).toEqual(result);
});
it('rejects a forged original TLS import slot before procedure dispatch',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['102f97b8']!.pointer(0).set({});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('initializer import slot');expect(result.reason).toContain('100ae282');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.some(call=>call.site==='100ae288')).toBe(false);expect(owner.processAttach()).toEqual(result);
});

it('retains the original fallback module call when the cached TLS getter is NULL',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),get=platform.tlsGetValue.bind(platform);platform.tlsGetValue=index=>owner.snapshot().trace.at(-1)==='SharedBase.initializer.TlsGetValue'?{known:true,value:null}:get(index);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100ae2b4');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.find(call=>call.site==='100ae288')!.returned).toBe(true);expect(snapshot.calls.some(call=>call.site==='100ae2a1')).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa655','100b4413','100ae2b4']);expect(owner.processAttach()).toEqual(result);
});
it('retains a pending TLS query when its actual platform endpoint is unknown',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),get=platform.tlsGetValue.bind(platform);platform.tlsGetValue=index=>owner.snapshot().trace.at(-1)==='SharedBase.initializer.TlsGetValue'?{known:false,reason:'Selected initializer TLS query unavailable'}:get(index);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('TLS query unavailable');expect(result.reason).toContain('100ae288');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa655','100b4413','100ae288']);expect(owner.snapshot().initializerImages['10141480']!.readUnsigned(0)).toBe(0x100b43e6);expect(owner.processAttach()).toEqual(result);
});

it('allocates, encodes and publishes the first exit table before the next error callback',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned');const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100ce0a8');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();
 expect(snapshot.trace.filter(row=>row==='100aa48a.sharedInitializer.MOV')).toHaveLength(68);const callbacks=snapshot.calls.filter(call=>call.site==='100aa490');expect(callbacks).toHaveLength(3);expect(callbacks.map(call=>call.returned)).toEqual([true,true,false]);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b4b72']);expect(snapshot.registers.ESI).toMatchObject({word:{provenance:{kind:'shared-local',offset:268}}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:3992}}});
 const allocation=state.initializerAllocations[0]!;expect(state.initializerAllocations).toHaveLength(1);expect(allocation.bytes.length).toBe(128);expect(allocation.bytes.every(byte=>byte===0)).toBe(true);expect(allocation.knownMask.every(mask=>mask===255)).toBe(true);expect(allocation.backing.freed).toBe(false);
 const begin=state.initializerImages['102f8580']!.pointer<object>(0).get(),end=state.initializerImages['102f8584']!.pointer<object>(0).get();expect(begin).not.toBeNull();expect(end).toBe(begin);const module=platform.getWin32ModuleHandle('KERNEL32.DLL');if(!module.known||!module.value)throw new Error('Module missing');const codec=platform.getWin32Procedure(module.value,'DecodePointer');if(!codec.known||!codec.value)throw new Error('Codec missing');expect(codec.value.invoke(begin)).toEqual({known:true,value:allocation});
 for(const site of ['100a726a','100aef1e','100a7272'])expect(snapshot.calls.find(call=>call.site===site)!.returned).toBe(true);expect(snapshot.sharedInitializerFrame!.initializerResult).toBeNull();expect(owner.processAttach()).toEqual(result);
});
it('returns the all-NULL error table and stops decoding the uninitialized exit table',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned'),table=owner.snapshot().initializerImages['100e545c']!;for(let offset=0;offset<table.bytes.length;offset+=4)table.writeUnsigned(offset,0);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('Actual initializer encoded argument required at 100ae354');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace.filter(row=>row==='100aa48a.sharedInitializer.MOV')).toHaveLength(135);expect(snapshot.calls.some(call=>call.site==='100aa490')).toBe(false);expect(snapshot.calls.find(call=>call.site==='100aa664')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100ae354')!.returned).toBe(false);expect(owner.processAttach()).toEqual(result);
});
it('retains an unowned live error callback without dispatching it or advancing the table',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['100e545c']!.writeUnsigned(0,0x1000dead);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100aa490 -> 1000dead');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace.filter(row=>row==='100aa48a.sharedInitializer.MOV')).toHaveLength(1);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490']);expect(snapshot.registers.ESI).toMatchObject({word:{provenance:{kind:'shared-local'}}});expect(snapshot.calls.some(call=>call.site==='100a726a')).toBe(false);expect(owner.processAttach()).toEqual(result);
});

it('publishes encoded NULL and returns initializer error 24 after exit-table allocation failure',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===128?{known:true,value:null}:allocate(heap,flags,size);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('initializer result 24');expect(result.reason).toContain('100adb5f');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(state.initializerAllocations).toHaveLength(0);expect(snapshot.sharedInitializerFrame!.initializerResult).toBe(24);expect(snapshot.registers.EAX).toMatchObject({word:{value:24,knownMask:0xffffffff}});expect(snapshot.calls.filter(call=>call.site!=='100adc79').every(call=>call.returned)).toBe(true);expect(snapshot.calls.filter(call=>call.site==='100aa490')).toHaveLength(1);
 const begin=state.initializerImages['102f8580']!.pointer<object>(0).get();expect(begin).not.toBeNull();expect(state.initializerImages['102f8584']!.pointer(0).get()).toBe(begin);const module=platform.getWin32ModuleHandle('KERNEL32.DLL');if(!module.known||!module.value)throw new Error('Module missing');const codec=platform.getWin32Procedure(module.value,'DecodePointer');if(!codec.known||!codec.value)throw new Error('Codec missing');expect(codec.value.invoke(begin)).toEqual({known:true,value:null});expect(snapshot.trace.filter(row=>row==='100aa48a.sharedInitializer.MOV')).toHaveLength(66);expect(owner.processAttach()).toEqual(result);
});
it('retains the calloc wrapper before its unowned positive Sleep retry',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);owner.imageStorage('allocationRetryDelay').writeUnsigned(0,1);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===128?{known:true,value:null}:allocate(heap,flags,size);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100aef35');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(snapshot.calls.find(call=>call.site==='100aef1e')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100a726a')!.returned).toBe(false);expect(snapshot.calls.some(call=>call.site==='100a7272')).toBe(false);expect(state.initializerImages['102f8580']!.readUnsigned(0)).toBe(0);expect(state.initializerAllocations).toHaveLength(0);expect(owner.processAttach()).toEqual(result);
});
it('retains original exit-table calloc when its actual heap endpoint is unknown',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===128?{known:false,reason:'Exit-table heap allocation unavailable'}:allocate(heap,flags,size);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('Exit-table heap allocation unavailable');expect(result.reason).toContain('100aef1e');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100a726a','100aef1e']);expect(state.initializerAllocations).toHaveLength(0);expect(state.initializerImages['102f8580']!.readUnsigned(0)).toBe(0);expect(owner.processAttach()).toEqual(result);
});

it('returns the initialized multibyte callback and enters original processor-probe stack storage',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['102f853c']!.writeUnsigned(0,17);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('PUSHFD');expect(result.reason).toContain('100ce0a8');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();
 expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(1);expect(snapshot.trace).not.toContain('100b185f.sharedInitializer.CALL');expect(snapshot.trace).toContain('100b186f.sharedInitializer.XOR');expect(snapshot.trace).toContain('100b1871.sharedInitializer.RET');expect(snapshot.calls.filter(call=>call.site==='100aa490').map(call=>call.returned)).toEqual([true,true,false]);expect(state.initializerImages['102f853c']!.readUnsigned(0)).toBe(0);expect(snapshot.registers.EBP).toMatchObject({word:{provenance:{kind:'stack',offset:4024}}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:3992}}});
 const stack=Uint8Array.from(snapshot.stack.bytes!),view=new DataView(stack.buffer);for(const offset of [4056,4048,4052])expect(view.getUint32(offset,true)).toBe(0);expect(snapshot.trace).not.toContain('100ce0bd.sharedInitializer.CPUID');expect(snapshot.calls.find(call=>call.site==='100b4b72')!.returned).toBe(false);expect(owner.processAttach()).toEqual(result);
});
it('retains original multibyte initialization call if its live initialized flag is cleared',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===8&&size===128)owner.imageStorage('multibyteInitialized').writeUnsigned(0,0);return result;};
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100b185f -> 100b16ba');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(0);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100b185f']);expect(snapshot.calls.some(call=>call.site==='100b4b72')).toBe(false);expect(snapshot.trace).not.toContain('100b1865.sharedInitializer.MOV');expect(owner.processAttach()).toEqual(result);
});

it('executes the original ID toggle, CPUID leaves and normal SIMD probe frame',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu:nativeVirtualX86CpuSelection});
 const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const snapshot=owner.snapshot().caseState!.stack!.snapshot();
 expect(snapshot.trace).toContain('100ce0bd.sharedInitializer.CPUID');expect(snapshot.trace).toContain('100ce0d0.sharedInitializer.CPUID');expect(snapshot.trace).toContain('100ce055.sharedInitializer.MOVAPD');
 expect(snapshot.calls.find(call=>call.site==='100ce04c')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100ce08f')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100b4b72')!.returned).toBe(true);
 expect(owner.snapshot().initializerImages['102f853c']!.readUnsigned(0)).toBe(1);expect(platform.getWin32LastError()).toEqual({known:true,value:0});expect(snapshot.xmm.knownMask.slice(16).every(mask=>mask===0)).toBe(true);expect(snapshot.processorSimdFrame!.returned).toBe(true);expect(owner.processAttach()).toEqual(result);
});
for(const cpu of [
 {...nativeVirtualX86CpuSelection,idBitWritable:false},
 {...nativeVirtualX86CpuSelection,initialEflags:0x200202,idBitWritable:false},
 {...nativeVirtualX86CpuSelection,cpuidLeaf1:[0x600,0,0,0] as const},
])it('follows original no-CPUID or no-SSE2 return without a SIMD call',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu});const result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace).not.toContain('100ce055.sharedInitializer.MOVAPD');expect(snapshot.calls.find(call=>call.site==='100b4b72')!.returned).toBe(true);expect(owner.snapshot().initializerImages['102f853c']!.readUnsigned(0)).toBe(0);
 expect(snapshot.trace.includes('100ce0bd.sharedInitializer.CPUID')).toBe(cpu.idBitWritable);
});
it('retains missing CPUID evidence and SIMD exception paths before inventing results',()=>{
 for(const cpu of [{...nativeVirtualX86CpuSelection,cpuidLeaf1:undefined},{...nativeVirtualX86CpuSelection,sse2Execution:'illegal-instruction' as const}]){
  const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain(cpu.cpuidLeaf1?'exception dispatch':'CPUID leaf 1');
  expect(owner.snapshot().initializerImages['102f853c']!.readUnsigned(0)).toBe(0);expect(owner.processAttach()).toEqual(result);
 }
});
it('copies and freezes virtual CPU tuples and rejects malformed flag profiles',()=>{
 const leaf=[1,2,3,4] as [number,number,number,number],input={...nativeVirtualX86CpuSelection,cpuidLeaf0:leaf};
 const selected=retainNativeX86ThreadStackSelection({threadCapability:{},reservationBytes:4096,addressModel:'opaque-relative',initialRegisters:'unknown',initialFs0:'unknown',cpu:input});leaf[0]=99;expect(selected.cpu!.cpuidLeaf0![0]).toBe(1);expect(Object.isFrozen(selected.cpu!.cpuidLeaf0)).toBe(true);
 expect(()=>retainNativeX86ThreadStackSelection({...selected,cpu:{...input,cpuidLeaf0:Array(4) as [number,number,number,number]}})).toThrow('CPUID DWORDs');
 for(const initialEflags of [0,0x302,0x3202,0x20202,0xffffffff])expect(()=>retainNativeX86ThreadStackSelection({...selected,cpu:{...input,initialEflags}})).toThrow('EFLAGS');
});

it('rejects changed live SIMD scope bytes before executing the frame helper',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu:nativeVirtualX86CpuSelection});owner.snapshot().initializerImages['100f8ec0']!.writeUnsigned(20,0);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('live processor SIMD scope');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace).not.toContain('100aeb68.sharedInitializer.PUSH');expect(owner.snapshot().initializerImages['102f853c']!.readUnsigned(0)).toBe(0);
});

it('restores an initially set ID bit before CPUID while retaining original unknown AF',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu:{...nativeVirtualX86CpuSelection,initialEflags:0x200202,cpuidLeaf0:undefined}});
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('CPUID leaf 0');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.eflags).toMatchObject({word:{value:0x200246,knownMask:0xffffffef}});expect(snapshot.trace).not.toContain('100ce0d0.sharedInitializer.CPUID');
});

it('reenters the processor probe with a fresh normal EH frame after its prior return',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu:nativeVirtualX86CpuSelection});owner.snapshot().initializerImages['100e545c']!.writeUnsigned(68*4,0x100b4b6b);
 const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace.filter(row=>row==='100ce055.sharedInitializer.MOVAPD')).toHaveLength(3);expect(snapshot.calls.filter(call=>call.site==='100ce08f').map(call=>call.returned)).toEqual([true,true,true]);expect(snapshot.processorSimdFrame!.returned).toBe(true);
});

function stdioFixture(count=0,diagnostics?:NativeRuntimeDiagnostics,sectionSpin?:boolean,fileSystem?:NativeWin32FileSystemSelection){const f=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu:nativeVirtualX86CpuSelection,diagnostics,sectionSpin,fileSystem});f.owner.snapshot().initializerImages['102f8500']!.writeUnsigned(0,count);return f;}
function descriptorPending(owner:NativeSharedCrtOwner){return owner.snapshot().caseState?.stack?.snapshot().calls.some(call=>call.site==='100aab6e'&&!call.returned)??false;}
for(const [requested,count] of [[0,512],[1,20],[19,20],[20,20],[33,33],[0x80000000,20],[0xffffffff,20]] as const)it(`initializes original FILE vector for signed requested count ${requested}`,()=>{
 const {owner}=stdioFixture(requested),result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),images=state.initializerImages,files=images['10141790']!,vector=images['102f71c0']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;
 expect(images['102f8500']!.readUnsigned(0)).toBe(count);expect(vector.offset).toBe(0);expect(vector.fields.bytes.length).toBe(count*4);expect(state.initializerAllocations).toContain(vector.fields);
 for(let index=0;index<20;index++){const entry=vector.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(index*4).get()!;expect(entry.fields).toBe(files);expect(entry.offset).toBe(index*32);}expect([...vector.fields.bytes.slice(80)]).toEqual(Array(count*4-80).fill(0));expect([...vector.fields.knownMask.slice(80)]).toEqual(Array(count*4-80).fill(255));
 expect(files.readUnsigned(16)).toBe(0);expect(files.readUnsigned(48)).toBe(1);expect(files.readUnsigned(80)).toBe(0xfffffffe);expect(files.readUnsigned(12)).toBe(257);expect(owner.imageStorage('memcpySseFlag').readUnsigned(0)).toBe(1);const snapshot=state.caseState!.stack!.snapshot();expect(snapshot.trace.filter(row=>row==='100bef63.sharedInitializer.MOV')).toHaveLength(20);expect(snapshot.trace.filter(row=>row==='100bef93.sharedInitializer.MOV')).toHaveLength(3);expect(snapshot.calls.filter(call=>call.site==='100aa490').map(call=>call.returned)).toEqual([true,true,true,true,true]);expect(snapshot.trace.filter(row=>row==='100ce055.sharedInitializer.MOVAPD')).toHaveLength(2);expect(owner.processAttach()).toEqual(result);
});
it('follows original stdio fallback allocation of twenty entries after the large allocation fails',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===2048?{known:true,value:null}:allocate(heap,flags,size);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(owner.snapshot().initializerImages['102f8500']!.readUnsigned(0)).toBe(20);const vector=owner.snapshot().initializerImages['102f71c0']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(vector.fields.bytes.length).toBe(80);const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.find(call=>call.site==='100bef27')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100bef40')!.returned).toBe(true);
});
it('returns cinit failure 26 through the original stdio double-allocation failure branch',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&(size===2048||size===80)?{known:true,value:null}:allocate(heap,flags,size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('initializer result 26');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.initializerResult).toBe(26);expect(state.initializerImages['102f71c0']!.readUnsigned(0)).toBe(0);expect(state.initializerImages['102f8500']!.readUnsigned(0)).toBe(20);expect(owner.imageStorage('memcpySseFlag').readUnsigned(0)).toBe(0);expect(snapshot.trace).not.toContain('100bef63.sharedInitializer.MOV');expect(snapshot.trace).not.toContain('100ce0f5.sharedInitializer.CALL');expect(owner.processAttach()).toEqual(result);
});
it('retains the original stdio calloc lower call when its heap result is unknown',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===2048?{known:false,reason:'stdio allocation unavailable'}:allocate(heap,flags,size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('stdio allocation unavailable');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100bef27','100aef1e']);expect(owner.snapshot().initializerImages['102f71c0']!.readUnsigned(0)).toBe(0);
});
it('rejects a foreign descriptor block before using its HANDLE records',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===8&&size===2048)owner.imageStorage('ioBlocks').pointer(0).set(owner.snapshot().ptd!);return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('initialized SharedBase descriptor block');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace).not.toContain('100bef93.sharedInitializer.MOV');expect(owner.imageStorage('memcpySseFlag').readUnsigned(0)).toBe(0);
});

it('uses the original invalid, detached and NULL descriptor branches',()=>{
 for(const handle of [0xffffffff,0xfffffffe,0]){
  const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===8&&size===2048)owner.snapshot().ioBlock!.writeUnsigned(0,handle);return result;};const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(owner.snapshot().initializerImages['10141790']!.readUnsigned(16)).toBe(0xfffffffe);
 }
});
it('rejects copied or invented HANDLE identities at the original descriptor read',()=>{
 for(const handle of [7,{identity:{}}]){
  const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===8&&size===2048){const fields=owner.snapshot().ioBlock!;if(typeof handle==='number')fields.writeUnsigned(0,handle);else fields.pointer(0).set(handle);}return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('HANDLE');expect(result.reason).toContain('100bef93');expect(owner.imageStorage('memcpySseFlag').readUnsigned(0)).toBe(0);expect(owner.snapshot().initializerImages['10141790']!.readUnsigned(16)).toBe(0);expect(owner.processAttach()).toEqual(result);
 }
});
it('retains positive stdio calloc retry before original Sleep and before fallback allocation',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{if(flags===8&&size===2048){owner.imageStorage('allocationRetryDelay').writeUnsigned(0,5);return {known:true,value:null};}return allocate(heap,flags,size);};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aef35');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adc79','100adb5a','100aa664','100aa490','100bef27']);expect(snapshot.currentPc).toMatchObject({provenance:{kind:'source',address:'100aef35'}});expect(snapshot.calls.some(call=>call.site==='100bef40')).toBe(false);expect(owner.snapshot().initializerImages['102f71c0']!.readUnsigned(0)).toBe(0);
});
it('retains the original calloc overflow branch for a positive oversized FILE count',()=>{
 const {owner}=stdioFixture(0x7fffffff);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('calloc overflow');expect(result.reason).toContain('100aef1e');expect(owner.snapshot().initializerImages['102f71c0']!.readUnsigned(0)).toBe(0);expect(owner.processAttach()).toEqual(result);
});


it('registers the original RTC callback and restores both normal exit-registration frames',()=>{
 const {owner,platform}=stdioFixture();const result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.exitLockHeld).toBe(false);
 for(const site of ['100aa676','100a72d4','100a72ac','100a71e6','100b1158','100a72c4','100b1162'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);
 expect(stack.initializerSehFrames).toEqual([{site:'100a729b',entered:true,returned:true},{site:'100b10dd',entered:true,returned:true},{site:'100b0909',entered:true,returned:true},{site:'100c614c',entered:true,returned:true},{site:'100bb7d6',entered:true,returned:true},{site:'100aa9ab',entered:true,returned:true}]);
 const decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');expect(decoder.known).toBe(true);if(!decoder.known)throw new Error(decoder.reason);
 const begin=decoder.value.invoke(state.initializerImages['102f8584']!.pointer(0).get()!);const end=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);expect(begin.known).toBe(true);expect(end.known).toBe(true);if(!begin.known||!end.known)throw new Error('Exit pointers not decoded');
 const cursor=end.value as {fields:NativeHeapObjectViews;offset:number};expect(cursor.fields).toBe(begin.value);expect(cursor.offset).toBe(72);
 const callback=decoder.value.invoke(cursor.fields.pointer(0).get()!);expect(callback.known).toBe(true);expect(cursor.fields.bytes.length).toBe(128);
});

for(const address of ['100f8630','100f8ba0'])it('rejects changed original exit-registration scope '+address,()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages[address]!.writeUnsigned(0,0);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Original live initializer SEH scope required');expect(owner.snapshot().exitLockHeld).toBe(address==='100f8ba0');
});
it('retains the allocation-size frame and lock when HeapSize is unavailable',()=>{
 const {owner,platform}=stdioFixture();platform.win32HeapSize=()=>({known:false,reason:'HeapSize endpoint unavailable'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('HeapSize endpoint unavailable');const state=owner.snapshot();expect(state.exitLockHeld).toBe(true);expect(state.caseState!.stack!.snapshot().calls.find(call=>call.site==='100b1158')!.returned).toBe(false);
});
it('rejects a replaced HeapSize import identity before invoking it',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['102f9678']!.pointer(0).set(Object.freeze({name:'HeapSize'}));const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('HeapSize');expect(owner.snapshot().exitLockHeld).toBe(true);
});


it('registers RTC and both leading void-table callbacks in original slot order',()=>{
 const {owner,platform}=stdioFixture();const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot();
 const decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');if(!decoder.known)throw new Error(decoder.reason);const end=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);if(!end.known)throw new Error(end.reason);const cursor=end.value as {fields:NativeHeapObjectViews;offset:number};expect(cursor.offset).toBe(72);
 const addresses=[];for(let offset=0;offset<72;offset+=4){const callback=decoder.value.invoke(cursor.fields.pointer(offset).get()!);if(!callback.known)throw new Error(callback.reason);addresses.push((callback.value as {originalCodeAddress:number}).originalCodeAddress);}expect(addresses).toEqual([0x100bb8e7,0x100e30f0,0x100e26d0,0x100e2810,0x100e2930,0x100e2940,0x100e2950,0x100e2960,0x100e2a00,0x100e2a10,0x100e2710,0x100e2b40,0x100e2f20,0x100079ff,0x10005f65,0x100e30b0,0x100e3110,0x100e3100]);expect(state.exitLockHeld).toBe(false);const stack=state.caseState!.stack!.snapshot();expect(stack.calls.filter(call=>call.site==='100a729b').map(call=>call.returned)).toEqual(Array(18).fill(true));expect(stack.calls.filter(call=>call.site==='100b10dd').map(call=>call.returned)).toEqual(Array(18).fill(true));
});

it('skips an all-NULL void table and returns original cinit without claiming full attach',()=>{
 const {owner}=stdioFixture();const table=owner.snapshot().initializerImages['100e5000']!;for(let offset=0;offset<table.bytes.length;offset+=4)table.writeUnsigned(offset,0);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.sharedInitializerFrame!.initializerResult).toBe(0);expect(stack.trace.filter(row=>row==='100aa68c.sharedInitializer.MOV')).toHaveLength(214);expect(stack.calls.some(call=>call.site==='100aa692')).toBe(false);expect(owner.snapshot().attachReturned).toBe(1);
});
it('retains the original unknown void callback boundary after RTC registration',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100e5000']!.writeUnsigned(0,0x1000dead);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa692 -> 1000dead');expect(owner.snapshot().exitLockHeld).toBe(false);
});


it('initializes the canonical original static critical section and retains opaque Win32 stores',()=>{
 const {owner,platform}=stdioFixture();const fields=owner.snapshot().initializerImages['10197da0']!;expect(fields.bytes.length).toBe(24);expect(fields.knownMask.every(mask=>mask===255)).toBe(true);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(fields.knownMask.every(mask=>mask===0)).toBe(true);expect(platform.enterPhysicalCriticalSection(fields,owner.identity)).toEqual({known:true,value:undefined});expect(platform.leavePhysicalCriticalSection(fields,owner.identity)).toEqual({known:true,value:undefined});expect(platform.enterPhysicalCriticalSection(fields,{}).known).toBe(false);const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100e1455')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='100e1460')!.returned).toBe(true);
});
it('preserves the original static section CALL when its endpoint is unavailable',()=>{
 const {owner,platform}=stdioFixture();const fields=owner.snapshot().initializerImages['10197da0']!,initialize=platform.initializePhysicalCriticalSectionWithoutSpin.bind(platform);platform.initializePhysicalCriticalSectionWithoutSpin=(section,sectionOwner)=>section===fields?{known:false,reason:'Static section initialization unavailable'}:initialize(section,sectionOwner);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Static section initialization unavailable');const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100e1455')!.returned).toBe(false);expect(stack.calls.some(call=>call.site==='100e1460')).toBe(false);expect(fields.knownMask.every(mask=>mask===255)).toBe(true);
});
it('rejects a foreign InitializeCriticalSection import identity',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['102f95f4']!.pointer(0).set({name:'InitializeCriticalSection'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual initializer InitializeCriticalSection import slot required');expect(owner.snapshot().caseState!.stack!.snapshot().calls.some(call=>call.site==='100e1460')).toBe(false);
});


it('copies four live static-value DWORDs through the original MOV sequence',()=>{
 const {owner}=stdioFixture();const images=owner.snapshot().initializerImages,source=images['100ebb28']!,destination=images['101ab150']!;const values=[0x12345678,0x80000000,0xffffffff,0x7fffffff];values.forEach((value,index)=>source.writeUnsigned(index*4,value));const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(values.map((_,index)=>destination.readUnsigned(index*4))).toEqual(values);const stack=owner.snapshot().caseState!.stack!.snapshot();for(const address of ['100e1470','100e1475','100e147b','100e1481','100e1486','100e148b','100e1491','100e1497'])expect(stack.trace).toContain(address+'.sharedInitializer.MOV');
});
it('preserves unknown bits when copying the original static value',()=>{
 const {owner}=stdioFixture();const images=owner.snapshot().initializerImages,source=images['100ebb28']!,destination=images['101ab150']!;for(let index=0;index<16;index++){source.bytes[index]=index*13;source.knownMask[index]=index%2?0xf0:0x0f;}const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(Array.from(destination.bytes)).toEqual(Array.from(source.bytes));expect(Array.from(destination.knownMask)).toEqual(Array.from(source.knownMask));
});


it('executes Root strlen, allocation and payload copy before publishing the static object',()=>{
 const {owner}=stdioFixture();const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.trace.filter(row=>row==='10013610.sharedInitializer.MOV')).toHaveLength(43);expect(stack.calls.find(call=>call.site==='1003d304')!.returned).toBe(true);expect(owner.snapshot().poolSlots[0]!.fields.readUnsigned(0)).toBe(4);expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(stack.calls.find(call=>call.site==='100e151a')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='10013623')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='10013257')!.returned).toBe(true);expect(owner.snapshot().exitLockHeld).toBe(false);
});
it('uses the live Root source terminator when determining CString allocation length',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100e9b5c']!.writeUnsigned(1,0,1);expect(owner.processAttach()).toEqual({known:true,value:1});const state=owner.snapshot(),slot=state.poolSlots[0]!;expect(slot.capacity).toBe(12);expect(slot.fields.readUnsigned(0)).toBe(1);expect(Array.from(slot.fields.bytes.slice(8,10))).toEqual([82,0]);expect(state.caseState!.stack!.snapshot().calls.find(call=>call.site==='1001325e')!.returned).toBe(true);
});
it('returns the original empty-text constructor with stdcall cleanup before the next missing image store',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100e9b5c']!.writeUnsigned(0,0,1);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.trace).toContain('10013648.sharedInitializer.RET');expect(stack.calls.find(call=>call.site==='100e151a')!.returned).toBe(true);expect(stack.calls.filter(call=>call.site==='10013623')).toHaveLength(3);expect(stack.calls.filter(call=>call.site==='10013257')).toHaveLength(3);expect(stack.trace).toContain('100e1526.sharedInitializer.MOV');
});


it('initializes original MemoryAdmin flags and returns the owned singleton pointer to Malloc',()=>{
 const {owner,platform}=stdioFixture();const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),fields=state.initializerImages['10142798']!;expect(Array.from(fields.bytes)).toEqual([0,0,0,0,1,1,0,0,0,1,0,0,1,0,0,0]);const stack=state.caseState!.stack!.snapshot();expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(stack.calls.find(call=>call.site==='10020c2c')!.returned).toBe(true);expect(state.exitLockHeld).toBe(false);
 const decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');if(!decoder.known)throw new Error(decoder.reason);const end=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);if(!end.known)throw new Error(end.reason);const cursor=end.value as {fields:NativeHeapObjectViews;offset:number};expect(cursor.offset).toBe(72);const callback=decoder.value.invoke(cursor.fields.pointer(40).get()!);if(!callback.known)throw new Error(callback.reason);expect((callback.value as {originalCodeAddress:number}).originalCodeAddress).toBe(0x100e2710);
});
it('uses an already-set MemoryAdmin guard without registering shutdown again',()=>{
 const {owner,platform}=stdioFixture();const fields=owner.snapshot().initializerImages['10142798']!;fields.writeUnsigned(12,0x80000001);fields.writeUnsigned(4,0x11223344);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(fields.readUnsigned(12)).toBe(0x80000001);expect(fields.readUnsigned(4)).toBe(0x11223344);expect(owner.snapshot().caseState!.stack!.snapshot().calls.some(call=>call.site==='10020c2c')).toBe(false);const state=owner.snapshot(),decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');if(!decoder.known)throw new Error(decoder.reason);const end=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);if(!end.known)throw new Error(end.reason);expect((end.value as {offset:number}).offset).toBe(68);
});
it('preserves adjacent MemoryAdmin bytes on the original AL stores and initialized-flag branch',()=>{
 const {owner}=stdioFixture();const fields=owner.snapshot().initializerImages['10142798']!;fields.writeUnsigned(4,0x55443322);fields.writeUnsigned(8,0x99887766);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(Array.from(fields.bytes.slice(4,12))).toEqual([0x22,0x33,0x44,0x55,0,1,0x88,0x99]);expect(fields.readUnsigned(12)).toBe(1);
});

it('preserves unknown upper guard bits when setting the original MemoryAdmin registration bit',()=>{
 const {owner}=stdioFixture();const fields=owner.snapshot().initializerImages['10142798']!;for(let offset=13;offset<16;offset++)fields.knownMask[offset]=0;const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(fields.maskedWord(12)).toMatchObject({value:1,knownMask:255});
});


it('initializes the original Malloc section at spin1000 and releases it after source allocation return',()=>{
 const {owner,platform}=stdioFixture();const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),fields=state.initializerImages['10189a18']!,section=platform.snapshot().physicalSections.find(section=>section.fields===fields)!;expect(section.owner).toBe(owner.identity);expect(section.spinCount).toBe(1000);expect(section.depth).toBe(0);expect(state.memoryHeapSectionHeld).toBe(false);expect(state.initializerImages['102fb000']!.readUnsigned(0,1)).toBe(1);expect(fields.knownMask.every(mask=>mask===0)).toBe(true);const stack=state.caseState!.stack!.snapshot();expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(stack.calls.find(call=>call.site==='1003d449')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='1003d463')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='1003d48a')!.returned).toBe(true);
});
it('rejects changed live Malloc scope bytes before entering the original frame',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100f8318']!.writeUnsigned(0,0);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Original live MemoryAdmin Malloc scope required');expect(owner.snapshot().caseState!.stack!.snapshot().memoryMallocFrame).toBeNull();expect(owner.snapshot().memoryHeapSectionHeld).toBe(false);
});
it('retains the Malloc frame when InitializeCriticalSectionAndSpinCount is unavailable',()=>{
 const {owner,platform}=stdioFixture();platform.initializePhysicalMemoryHeapCriticalSection=()=>({known:false,reason:'Heap spin initializer unavailable'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Heap spin initializer unavailable');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.memoryMallocFrame).toEqual({entered:true,returned:false});expect(stack.calls.find(call=>call.site==='1003d449')!.returned).toBe(false);expect(stack.calls.some(call=>call.site==='1003d463')).toBe(false);expect(state.memoryHeapSectionHeld).toBe(false);expect(state.initializerImages['102fb000']!.readUnsigned(0,1)).toBe(0);
});
it('follows the original failed-spin-initialization branch without inventing an entered section',()=>{
 const {owner,platform}=stdioFixture();platform.initializePhysicalMemoryHeapCriticalSection=()=>({known:true,value:false});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual original MemoryAdmin heap section transition required');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='1003d449')!.returned).toBe(true);expect(stack.calls.some(call=>call.site==='1003d463')).toBe(false);expect(state.memoryHeapSectionHeld).toBe(false);expect(state.initializerImages['102fb000']!.readUnsigned(0,1)).toBe(0);
});
it('rejects a set heap-section flag without canonical initialized storage',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['102fb000']!.writeUnsigned(0,1,1);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('canonical initialized physical critical-section owner');const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.calls.some(call=>call.site==='1003d449')).toBe(false);expect(stack.calls.find(call=>call.site==='1003d463')!.returned).toBe(false);expect(owner.snapshot().memoryHeapSectionHeld).toBe(false);
});
it('rejects a foreign heap-section Initialize import at the original Malloc read',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['102f966c']!.pointer(0).set({name:'InitializeCriticalSectionAndSpinCount'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual MemoryAdmin critical-section import slot required');expect(owner.snapshot().memoryHeapSectionHeld).toBe(false);
});

it('dispatches thirteen bytes through the original 16-byte pool and owns its VirtualAlloc region',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.virtualAlloc.bind(platform),requests:number[][]=[];let virtualArgs:number[]=[];
 platform.virtualAlloc=(size,type,protect)=>{requests.push([size,type,protect]);const stack=owner.snapshot().caseState!.stack!.snapshot(),call=stack.calls.find(call=>call.site==='10047f74')!,view=new DataView(Uint8Array.from(stack.stack.bytes!).buffer);if(size===0x102000)virtualArgs=[4,8,12,16].map(offset=>view.getUint32(call.position+offset,true));return allocate(size,type,protect);};
 const result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 expect(requests).toEqual([[0x102000,0x103000,4],[0xc0000,0x103000,4]]);
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),pool=state.initializerImages['102ffd58']!;
 expect([pool.readUnsigned(0),pool.readUnsigned(8)]).toEqual([2,2]);
 const virtual=platform.snapshot().allocations.filter(entry=>entry.kind==='virtual');expect(virtual).toHaveLength(2);
 const region=virtual[0]!.backing;expect(region.bytes.length).toBe(0x102000);expect(region.bytes.subarray(48,0x100000).every(byte=>byte===0)).toBe(true);expect(region.bytes.subarray(0x100004,0x101fff).every(byte=>byte===255)).toBe(true);expect(region.bytes[0x101fff]).toBe(127);expect(region.knownMask.every(mask=>mask===255)).toBe(true);
 expect(NativeRuntimePlatform.canonicalVirtualRegionForPlatform(platform,region,0x102000)).toEqual({known:true,value:undefined});
 const published=state.initializerImages['102f4618']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(published.fields).toBe(state.poolSlots[0]!.fields);expect(published.offset).toBe(8);
 const fields=state.poolRegions[0]!;expect(state.poolRegions).toHaveLength(2);expect(fields.backing).toBe(region);
 const call=stack.calls.find(call=>call.site==='10047f74')!;expect(call.returned).toBe(true);
 expect(virtualArgs).toEqual([0,0x102000,0x103000,4]);expect(stack.calls.find(child=>child.site==='10047f7c')!.position-call.position).toBe(16);
 expect(stack.calls.find(call=>call.site==='10047f7c')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='1003d474')!.returned).toBe(true);expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(state.memoryHeapSectionHeld).toBe(false);
 const geometry=platform.resolveNativePointer({fields,offset:0});expect(geometry.known).toBe(true);if(geometry.known){expect(geometry.value.canonicalBacking).toBe(region);expect(geometry.value.canonicalCapacity).toBe(0x102000);expect(geometry.value.modulo4).toBe(0);}
});
it('retains the pending original pool CALL when VirtualAlloc is unavailable',()=>{
 const {owner,platform}=stdioFixture();platform.virtualAlloc=()=>({known:false,reason:'Pool reservation unavailable'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Pool reservation unavailable');
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='10047f74')!.returned).toBe(false);expect(stack.calls.some(call=>call.site==='10047f7c')).toBe(false);expect(state.memoryHeapSectionHeld).toBe(true);expect(state.initializerImages['102ffd58']!.readUnsigned(0)).toBe(1);
});
it('follows original NULL VirtualAlloc fallback through the next pool dispatch slot',()=>{
 const {owner,platform}=stdioFixture();platform.virtualAlloc=()=>({known:true,value:null});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('10002aa9');
 const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.trace).toContain('10047f86.sharedInitializer.JMP');expect(stack.calls.find(call=>call.site==='10047f74')!.returned).toBe(true);expect(stack.calls.some(call=>call.site==='10047f7c')).toBe(false);expect(stack.registers.ESI).toMatchObject({word:{value:13,knownMask:0xffffffff}});expect(owner.snapshot().memoryHeapSectionHeld).toBe(true);
});
it('rejects a foreign VirtualAlloc import before calling an endpoint',()=>{
 const {owner,platform}=stdioFixture();owner.snapshot().initializerImages['102f9680']!.pointer(0).set({name:'VirtualAlloc'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual pool VirtualAlloc import slot required');expect(platform.snapshot().allocations.some(entry=>entry.kind==='virtual')).toBe(false);
});
it('rejects an allocated CRT buffer returned as a pool virtual region',()=>{
 const {owner,platform}=stdioFixture();platform.virtualAlloc=size=>platform.crtNew(size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual live same-platform VirtualAlloc region required');expect(owner.snapshot().caseState!.stack!.snapshot().calls.find(call=>call.site==='10047f74')!.returned).toBe(false);
});
it('rejects a virtual region from a different platform',()=>{
 const {owner,platform}=stdioFixture(),other=stdioFixture().platform;platform.virtualAlloc=(size,type,protect)=>other.virtualAlloc(size,type,protect);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual live same-platform VirtualAlloc region required');
});
it('rejects a changed dispatch to the bitmap allocator without its owned pool receiver',()=>{
 const {owner,platform}=stdioFixture();owner.snapshot().initializerImages['102fb050']!.writeUnsigned(13*4,0x1000605a);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual original bitmap pool receiver required');expect(platform.snapshot().allocations.some(entry=>entry.kind==='virtual')).toBe(false);expect(owner.snapshot().initializerImages['102ffd58']!.readUnsigned(0)).toBe(0);
});
for(const [count,peak,nextPeak] of [[5,10,10],[10,5,12]])it(`publishes pool count and follows the original peak branch from ${count}/${peak}`,()=>{
 const {owner}=stdioFixture(),pool=owner.snapshot().initializerImages['102ffd58']!;pool.writeUnsigned(0,count!);pool.writeUnsigned(8,peak!);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(pool.readUnsigned(0)).toBe(count!+2);expect(pool.readUnsigned(8)).toBe(nextPeak);
});

it('rejects a freed pool virtual region before granting a live pointer',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.virtualAlloc.bind(platform);platform.virtualAlloc=(size,type,protect)=>{const result=allocate(size,type,protect);if(result.known&&result.value)result.value.freed=true;return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual live same-platform VirtualAlloc region required');expect(owner.snapshot().poolRegions).toHaveLength(0);
});
it('rejects replaced virtual backing bytes against the private allocation geometry',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.virtualAlloc.bind(platform);platform.virtualAlloc=(size,type,protect)=>{const result=allocate(size,type,protect);if(result.known&&result.value)Object.defineProperty(result.value,'bytes',{value:new Uint8Array(size)});return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual live same-platform VirtualAlloc region required');expect(owner.snapshot().poolRegions).toHaveLength(0);
});

it('rejects an earlier same-platform virtual region returned for the current reservation',()=>{
 const {owner,platform}=stdioFixture(),prior=platform.virtualAlloc(0x102000,0x103000,4);if(!prior.known||!prior.value)throw new Error('Missing earlier allocation');platform.virtualAlloc=()=>prior;const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Fresh region from the current pool VirtualAlloc invocation required');expect(owner.snapshot().poolRegions).toHaveLength(0);expect(owner.snapshot().caseState!.stack!.snapshot().calls.find(call=>call.site==='10047f74')!.returned).toBe(false);
});

it('constructs the original 20-byte pool descriptor through live CRT new and malloc',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform),requests:{heap:NativeWin32HeapCapability;flags:number;size:number}[]=[];
 platform.win32HeapAlloc=(heap,flags,size)=>{if(flags===0&&size===20&&descriptorPending(owner))requests.push({heap,flags,size});return allocate(heap,flags,size);};
 const result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),descriptor=state.initializerImages['102ffef0']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!,head=state.initializerImages['102fb004']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;
 expect(head.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields).toBe(descriptor.fields);expect(descriptor.offset).toBe(0);expect(head.offset).toBe(0);expect(descriptor.fields.bytes.length).toBe(20);expect(requests).toEqual([{heap:state.heap!,flags:0,size:20},{heap:state.heap!,flags:0,size:20}]);
 expect([0,4,8,12,16].map(offset=>descriptor.fields.readUnsigned(offset))).toEqual([0,0x10008855,0x10006640,0x100013e3,0x10007b9e]);expect(descriptor.fields.knownMask.every(mask=>mask===255)).toBe(true);
 expect(NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,state.heap!,owner.identity,{fields:descriptor.fields,offset:0},20)).toEqual({known:true,value:undefined});expect(state.initializerAllocations.includes(descriptor.fields)).toBe(true);
 const stack=state.caseState!.stack!.snapshot();for(const site of ['10045db5','100aabea','100aab6e'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);
 expect(stack.trace).toContain('100aabf4.sharedInitializer.LEAVE');expect(stack.trace).toContain('10045def.sharedInitializer.XCHG.LOCK');expect(state.memoryHeapSectionHeld).toBe(false);expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});
 expect(stack.calls.find(call=>call.site==='10045e1e')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='10045e55')!.returned).toBe(true);
 expect(state.poolRegions[0]!.readUnsigned(8)).toBe(2);expect(state.poolRegions[0]!.readUnsigned(12)).toBe(0);expect(state.poolRegions[0]!.bytes.subarray(0x100004,0x101fff).every(byte=>byte===255)).toBe(true);expect(state.poolRegions[0]!.readUnsigned(0x101ffc)).toBe(0x7fffffff);
});
it('retains descriptor allocation CALL when the actual CRT HeapAlloc is unavailable',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===0&&size===20&&descriptorPending(owner)?{known:false,reason:'Descriptor heap allocation unavailable'}:allocate(heap,flags,size);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Descriptor heap allocation unavailable');const state=owner.snapshot();expect(state.initializerImages['102ffef0']!.readUnsigned(0)).toBe(0);expect(state.initializerImages['102fb004']!.readUnsigned(0)).toBe(0);expect(state.caseState!.stack!.snapshot().calls.find(call=>call.site==='100aab6e')!.returned).toBe(false);expect(state.poolRegions).toHaveLength(1);expect(state.memoryHeapSectionHeld).toBe(true);
});
it('retains original errno boundary after NULL CRT HeapAlloc without fabricating a descriptor',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===0&&size===20&&descriptorPending(owner)?{known:true,value:null}:allocate(heap,flags,size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aab8e -> 100aedd1');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100aab6e')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='10045db5')!.returned).toBe(false);expect(state.initializerImages['102ffef0']!.readUnsigned(0)).toBe(0);expect(stack.trace).not.toContain('10045def.sharedInitializer.XCHG.LOCK');
});
it('rejects a changed descriptor HeapAlloc import at its original read',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['102f9684']!.pointer(0).set({name:'HeapAlloc'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual pool HeapAlloc import slot required');expect(owner.snapshot().initializerImages['102ffef0']!.readUnsigned(0)).toBe(0);
});
it('rejects an earlier same-heap descriptor allocation returned for the current CALL',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);let prior:ReturnType<typeof allocate>|null=null;
 platform.win32HeapAlloc=(heap,flags,size)=>{if(flags===8&&size===128)prior=allocate(heap,0,20);return flags===0&&size===20&&descriptorPending(owner)?prior!:allocate(heap,flags,size);};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Fresh descriptor from the current HeapAlloc invocation required');expect(owner.snapshot().initializerImages['102ffef0']!.readUnsigned(0)).toBe(0);
});
it('rejects a CRT new backing returned as the native descriptor HeapAlloc block',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===0&&size===20&&descriptorPending(owner)?platform.crtNew(20):allocate(heap,flags,size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Win32 heap required');expect(owner.snapshot().initializerImages['102ffef0']!.readUnsigned(0)).toBe(0);
});

it('preserves original sixteen-byte rounding when the live CRT heap selection takes its general branch',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.virtualAlloc.bind(platform);platform.virtualAlloc=(size,type,protect)=>{owner.imageStorage('heapSelection').writeUnsigned(0,2);return allocate(size,type,protect);};const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const descriptor=owner.snapshot().initializerImages['102ffef0']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields;expect(descriptor.bytes.length).toBe(32);expect(descriptor.knownMask.subarray(0,20).every(mask=>mask===255)).toBe(true);expect(descriptor.knownMask.subarray(20).every(mask=>mask===0)).toBe(true);
});
it('stops at the actual small-block helper when the live CRT heap selection is three',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.virtualAlloc.bind(platform);platform.virtualAlloc=(size,type,protect)=>{owner.imageStorage('heapSelection').writeUnsigned(0,3);return allocate(size,type,protect);};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aab4f -> 100aaa32');expect(owner.snapshot().initializerImages['102ffef0']!.readUnsigned(0)).toBe(0);
});

it('retains the general normalized CRT HeapAlloc size domain in the shared platform bridge',()=>{
 const {owner,platform}=stdioFixture();owner.processAttach();const heap=owner.snapshot().heap!;
 for(const size of [1,17,48]){const result=NativeRuntimePlatform.heapAllocForSharedInitializer(platform,heap,owner.identity,size);expect(result.known).toBe(true);if(!result.known||!result.value)throw new Error('Missing owned general CRT block');expect(result.value.bytes.length).toBe(size);expect(result.value.knownMask.every(mask=>mask===0)).toBe(true);}
 for(const size of [0,-1,1.5,0xffffffe1]){const result=NativeRuntimePlatform.heapAllocForSharedInitializer(platform,heap,owner.identity,size);expect(result.known).toBe(false);}
});

for(const [flags,size] of [[8,20],[0,24]] as const)it(`rejects descriptor backing with actual lower HeapAlloc flags/size ${flags}/${size}`,()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,requestFlags,requestSize)=>descriptorPending(owner)?allocate(heap,flags,size):allocate(heap,requestFlags,requestSize);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual CRT HeapAlloc flags and request receipt required');expect(owner.snapshot().initializerImages['102ffef0']!.readUnsigned(0)).toBe(0);expect(owner.snapshot().caseState!.stack!.snapshot().calls.find(call=>call.site==='100aab6e')!.returned).toBe(false);
});

it('registers the actual cold pool payload range and descriptor in original static storage',()=>{
 const {owner}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),region=state.poolRegions[0]!,areas=state.initializerImages['10149a18']!,count=state.initializerImages['102fb030']!,descriptor=state.initializerImages['102ffef0']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;
 expect(count.readUnsigned(0)).toBe(2);
 for(const [offset,expectedOffset] of [[0,16],[4,0x100000],[8,0]]){const pointer=areas.pointer<{fields:NativeHeapObjectViews;offset:number}>(offset!).get()!;expect(pointer.fields).toBe(region);expect(pointer.offset).toBe(expectedOffset);}
 const registered=areas.pointer<{fields:NativeHeapObjectViews;offset:number}>(12).get()!;expect(registered.fields).toBe(descriptor.fields);expect(registered.offset).toBe(0);
 const head=state.initializerImages['102ffd58']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!;expect(head.fields).toBe(region);expect(head.offset).toBe(0);expect(region.readUnsigned(0)).toBe(0);
 expect(areas.bytes.subarray(32).every(byte=>byte===0)).toBe(true);expect(areas.knownMask.subarray(32).every(mask=>mask===255)).toBe(true);
 const stack=state.caseState!.stack!.snapshot();expect(stack.trace).toContain('1003c6f8.sharedInitializer.RET');expect(stack.calls.find(call=>call.site==='10045e55')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='10047f57')!.returned).toBe(true);expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(state.memoryHeapSectionHeld).toBe(false);
});
it('fills exactly the original 8192-byte bitmap and clears its final reserved bit',()=>{
 const {owner}=stdioFixture();owner.processAttach();const region=owner.snapshot().poolRegions[0]!,stack=owner.snapshot().caseState!.stack!.snapshot();
 expect(region.bytes.subarray(48,0x100000).every(byte=>byte===0)).toBe(true);expect(region.knownMask.every(mask=>mask===255)).toBe(true);
 expect(region.readUnsigned(0x100000)).toBe(0xfffffffc);for(let offset=0x100004;offset<0x101ffc;offset+=4)expect(region.readUnsigned(offset)).toBe(0xffffffff);expect(region.readUnsigned(0x101ffc)).toBe(0x7fffffff);
 expect(stack.trace).toContain('100a79df.sharedInitializer.STOSD.REP');expect(stack.trace).toContain('100a79f3.sharedInitializer.POP');expect(stack.trace).toContain('100a79f4.sharedInitializer.RET');expect(stack.trace).not.toContain('100a79a7.sharedInitializer.JMP');expect(stack.trace).not.toContain('100a79bd.sharedInitializer.MOV');
});
it('uses private canonical alignment even when public pointer resolution is replaced',()=>{
 const {owner,platform}=stdioFixture();const result=owner.processAttach();platform.resolveNativePointer=()=>({known:false,reason:'Public geometry unavailable'});expect(result).toEqual({known:true,value:1});const fields=owner.snapshot().poolRegions[0]!;
 for(const offset of [0,1,2,3,0x100000])expect(NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform(platform,{fields,offset})).toEqual({known:true,value:offset&3});
});
it('rejects foreign virtual pointer alignment without borrowing its backing proof',()=>{
 const {platform}=stdioFixture(),other=stdioFixture(),allocation=other.platform.virtualAlloc(0x102000,0x103000,4);expect(allocation.known).toBe(true);if(!allocation.known||!allocation.value)throw new Error('Missing foreign region');
 const fields=new NativeHeapObjectViews(allocation.value);expect(NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform(platform,{fields,offset:0}).known).toBe(false);expect(NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform(other.platform,{fields,offset:0})).toEqual({known:true,value:0});allocation.value.freed=true;expect(NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform(other.platform,{fields,offset:0}).known).toBe(false);
});

it('preserves the actual reverse direction of original REP stores when the logical thread DF is set',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);let injected=false;
 platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===0&&size===20&&descriptorPending(owner)){expect(NativeRuntimePlatform.writeNativeDirectionFlag(platform,1).known).toBe(true);injected=true;}return result;};
 const result=owner.processAttach();expect(injected).toBe(true);expect(result).toEqual({known:true,value:1});const region=owner.snapshot().poolRegions[0]!;
 expect(region.bytes.subarray(48,0xfe004).every(byte=>byte===0)).toBe(true);expect(region.bytes.subarray(0xfe004,0x100000).every(byte=>byte===255)).toBe(true);expect(region.bytes.subarray(0x100004,0x101ffc).every(byte=>byte===0)).toBe(true);expect(region.readUnsigned(0x101ffc)).toBe(0x7fffffff);expect(NativeRuntimePlatform.readNativeDirectionFlag(platform)).toEqual({known:true,value:0});
});

it('returns the claimed first pool slot as a bounded view of the original virtual region',()=>{
 const {owner,platform}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),slot=state.poolSlots[0]!;expect(state.poolSlots).toHaveLength(4);expect(slot.region).toBe(state.poolRegions[0]);expect(slot.offset).toBe(16);expect(slot.capacity).toBe(16);expect(slot.fields.backing).toBe(slot.region.backing);expect(slot.fields.bytes.byteOffset-slot.region.bytes.byteOffset).toBe(16);expect(slot.fields.bytes.length).toBe(16);expect(()=>slot.fields.readUnsigned(16,1)).toThrow('outside');
 expect(slot.region.readUnsigned(8)).toBe(2);expect(slot.region.readUnsigned(12)).toBe(0);expect(slot.region.readUnsigned(0x100000)).toBe(0xfffffffc);
 expect(slot.fields.readUnsigned(0)).toBe(4);expect(slot.fields.readUnsigned(4,2)).toBe(1);expect(slot.fields.readUnsigned(12,1)).toBe(0);expect(Array.from(slot.fields.bytes.subarray(8,12))).toEqual([82,111,111,116]);
 const stack=state.caseState!.stack!.snapshot();expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(state.memoryHeapSectionHeld).toBe(false);expect(platform.snapshot().physicalSections.find(section=>section.fields===state.initializerImages['10189a18'])!.depth).toBe(0);
 for(const site of ['10047f57','1003d304','1003d474','1003d48a','1001325e','10013623'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='1001362d')!.returned).toBe(true);
 for(const instruction of ['1003e0a3.sharedInitializer.PUSHAD','1003e0b6.sharedInitializer.INC.LOCK','1003e0c7.sharedInitializer.CLD','1003e0c8.sharedInitializer.SCASD.REPE','1003e0d5.sharedInitializer.BSF','1003e0da.sharedInitializer.BTR.LOCK','1003e10c.sharedInitializer.POPAD'])expect(stack.trace).toContain(instruction);
 expect(NativeRuntimePlatform.readNativeDirectionFlag(platform)).toEqual({known:true,value:0});
});
for(const [offset,value] of [[0,32],[4,0]])it(`rejects changed live pool geometry at field ${offset} before claiming a slot`,()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100e7aa8']!.writeUnsigned(offset!,value!);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Live original bitmap pool geometry required');const state=owner.snapshot();expect(state.poolSlots).toHaveLength(0);expect(state.poolRegions[0]!.readUnsigned(8)).toBe(0);expect(state.poolRegions[0]!.readUnsigned(0x100000)).toBe(0xffffffff);expect(state.memoryHeapSectionHeld).toBe(true);expect(state.caseState!.stack!.snapshot().memoryMallocFrame).toEqual({entered:true,returned:false});
});

it('preserves the original thirteen-byte Malloc argument until its lower allocation returns',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.virtualAlloc.bind(platform);let requested:number|undefined;
 platform.virtualAlloc=(size,type,protect)=>{const snapshot=owner.snapshot().caseState!.stack!.snapshot(),call=snapshot.calls.find(call=>call.site==='1001325e')!;if(size===0x102000)requested=new DataView(Uint8Array.from(snapshot.stack.bytes!).buffer).getUint32(call.position+4,true);return allocate(size,type,protect);};
 owner.processAttach();expect(requested).toBe(13);expect(owner.snapshot().poolSlots[0]!.capacity).toBe(16);
});

for(const length of [4])it(`copies ${length} live Root bytes through the original scalar dispatch and returns its constructor`,()=>{
 const {owner}=stdioFixture();if(length<4)owner.snapshot().initializerImages['100e9b5c']!.writeUnsigned(length,0,1);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),slot=state.poolSlots[0]!,fields=slot.fields,root=state.initializerImages['102f4618']!,pointer=root.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;
 expect(fields.readUnsigned(0)).toBe(length);expect(fields.readUnsigned(4,2)).toBe(1);expect(Array.from(fields.bytes.subarray(8,8+length))).toEqual([82,111,111,116].slice(0,length));expect(fields.readUnsigned(8+length,1)).toBe(0);expect(fields.bytes.subarray(9+length).every(byte=>byte===0)).toBe(true);
 expect(pointer.fields).toBe(fields);expect(pointer.offset).toBe(8);expect(root.bytes.subarray(4).every(byte=>byte===0)).toBe(true);expect(root.knownMask.subarray(4).every(mask=>mask===255)).toBe(true);
 const stack=state.caseState!.stack!.snapshot();for(const site of ['1001362d','100e151a','100e1599'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);
 expect(stack.calls.find(call=>call.site==='100e1599')!.position).toBe(stack.calls.find(call=>call.site==='100e151a')!.position);expect(stack.trace).toContain('10013632.sharedInitializer.ADD');expect(stack.trace).toContain('100e15a1.sharedInitializer.RET');expect(stack.trace).toContain('100a7a14-100a7a20.disjointMemcpyControlJoin');expect(stack.trace).not.toContain('100a7a16.sharedInitializer.JBE');expect(stack.trace).not.toContain('100a7a18.sharedInitializer.CMP');
 const tail=['100a7b8c','100a7b98','100a7bac','100a7b84'][length-1]!;expect(stack.trace).toContain(tail+'.sharedInitializer.MOV');expect(stack.trace).toContain('100e152d.sharedInitializer.ADD');expect(stack.trace).toContain('100e1575.sharedInitializer.ADD');expect(stack.trace).toContain('100e1535.sharedInitializer.XORPS');expect(stack.trace).toContain('100e1567.sharedInitializer.MOVSS');
 expect(stack.xmm.bytes.slice(0,16)).toEqual(Array(16).fill(0));expect(stack.xmm.knownMask.slice(0,16)).toEqual(Array(16).fill(255));expect(state.memoryHeapSectionHeld).toBe(false);expect(state.exitLockHeld).toBe(false);
});
it('encodes and appends Root shutdown without executing its body',()=>{
 const {owner,platform}=stdioFixture();owner.processAttach();const state=owner.snapshot(),decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');if(!decoder.known)throw new Error(decoder.reason);
 const end=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);if(!end.known)throw new Error(end.reason);const cursor=end.value as {fields:NativeHeapObjectViews;offset:number};expect(cursor.offset).toBe(72);expect(cursor.fields.bytes.length).toBe(128);
 const decoded=decoder.value.invoke(cursor.fields.pointer(44).get()!);if(!decoded.known)throw new Error(decoded.reason);expect((decoded.value as {originalCodeAddress:number}).originalCodeAddress).toBe(0x100e2b40);expect(state.caseState!.stack!.snapshot().trace.some(row=>row.startsWith('100e2b40.'))).toBe(false);
});
it('proves the original disjoint copy without trusting a replacement public direction method',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);let injected=false;platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===0&&size===20&&descriptorPending(owner)){platform.proveNativeCopyDirection=()=>({known:true,value:'backward'});injected=true;}return result;};
 const result=owner.processAttach();expect(injected).toBe(true);expect(result).toEqual({known:true,value:1});expect(Array.from(owner.snapshot().poolSlots[0]!.fields.bytes.subarray(8,12))).toEqual([82,111,111,116]);
});

for(const length of [1,2,3])it(`uses the original 12-byte pool for a shortened Root of length ${length}`,()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100e9b5c']!.writeUnsigned(length,0,1);expect(owner.processAttach()).toEqual({known:true,value:1});const state=owner.snapshot(),slot=state.poolSlots[0]!;expect(slot.capacity).toBe(12);expect(slot.fields.readUnsigned(0)).toBe(length);expect(Array.from(slot.fields.bytes.slice(8,9+length))).toEqual([...new TextEncoder().encode('Root'.slice(0,length)),0]);expect(state.memoryHeapSectionHeld).toBe(false);expect(state.caseState!.stack!.snapshot().calls.some(call=>call.site==='1001362d'&&call.returned)).toBe(true);
});

it('preserves adjacent slot padding while balancing the original sixteen-bit CString reference count',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);let injected=false;platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===0&&size===20&&descriptorPending(owner)){owner.snapshot().poolRegions[0]!.writeUnsigned(22,0xabcd,2);injected=true;}return result;};
 const result=owner.processAttach();expect(injected).toBe(true);expect(result).toEqual({known:true,value:1});const fields=owner.snapshot().poolSlots[0]!.fields;expect(fields.readUnsigned(4,2)).toBe(1);expect(fields.readUnsigned(6,2)).toBe(0xabcd);expect(Array.from(fields.bytes.subarray(8,12))).toEqual([82,111,111,116]);
});

it('constructs _Root in a second owned slot and returns initializer 141',()=>{
 const {owner,platform}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),first=state.poolSlots[0]!,second=state.poolSlots[1]!;expect(state.poolSlots).toHaveLength(4);expect(state.poolRegions).toHaveLength(2);expect(second.offset).toBe(32);expect(second.capacity).toBe(16);expect(second.region).toBe(first.region);expect(second.fields.backing).toBe(first.fields.backing);expect(second.fields).not.toBe(first.fields);
 expect(second.fields.readUnsigned(0)).toBe(5);expect(second.fields.readUnsigned(4,2)).toBe(1);expect(Array.from(second.fields.bytes.subarray(8))).toEqual([95,82,111,111,116,0,0,0]);expect(first.fields.readUnsigned(4,2)).toBe(1);
 const pointer=state.initializerImages['102f47d0']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(pointer.fields).toBe(second.fields);expect(pointer.offset).toBe(8);
 const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100e15da')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='100e15e4')!.returned).toBe(true);expect(stack.trace).toContain('100e15ea.sharedInitializer.RET');expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(state.memoryHeapSectionHeld).toBe(false);expect(platform.snapshot().allocations.filter(entry=>entry.kind==='virtual')).toHaveLength(2);
});

it('executes initializer 142 getter guards and retains original type-info name call',()=>{
 const {owner}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),fields=state.initializerImages['102f47e4']!;expect(fields.pointer(0).get()).not.toBeNull();expect(fields.readUnsigned(4)).toBe(0);expect(fields.readUnsigned(8)).toBe(3);expect(state.initializerImages['102f48bc']!.pointer(0).get()).not.toBeNull();expect(state.initializerImages['10140148']!.pointer(4).get()).not.toBeNull();
 const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100e1600')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='1008e933')!.returned).toBe(true);expect(stack.trace).toContain('1008e917.sharedInitializer.MOV');expect(stack.trace).toContain('1008e92e.sharedInitializer.MOV');expect(stack.calls.find(call=>call.site==='1008e93e')!.returned).toBe(true);expect(owner.processAttach()).toEqual(result);
});

it('preserves the first class-name guard and cached published copy when already initialized',()=>{
 const {owner}=stdioFixture(),fields=owner.snapshot().initializerImages['102f47e4']!;fields.writeUnsigned(8,1);fields.writeUnsigned(4,0x12345678);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(fields.readUnsigned(8)).toBe(3);expect(fields.readUnsigned(4)).toBe(0x12345678);expect(owner.snapshot().caseState!.stack!.snapshot().trace).not.toContain('1008e917.sharedInitializer.MOV');
});

it('retains the actual type-info exception frame at the native demangler boundary',()=>{
 const {owner}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.initializerSehFrames).toContainEqual({site:'100b0909',entered:true,returned:true});expect(stack.calls.find(call=>call.site==='100b0909')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='100a709e')!.returned).toBe(true);expect(stack.trace).toContain('100b0913.sharedInitializer.CMP');expect(stack.trace).toContain('100b092c.sharedInitializer.LEA');expect(state.initializerImages['10140148']!.pointer(4).get()).not.toBeNull();expect(state.initializerImages['102f6484']!.bytes.every(byte=>byte===0)).toBe(true);
});
it('rejects changed type-info scope bytes before entering the original exception frame',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100f8b20']!.writeUnsigned(24,0,1);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Original live initializer SEH scope required');const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.initializerSehFrames.some(frame=>frame.site==='100b0909')).toBe(false);expect(stack.calls.find(call=>call.site==='100b0909')!.returned).toBe(false);expect(stack.trace).not.toContain('100b0913.sharedInitializer.CMP');
});

it('enters the native demangler frame while retaining its outer type-info frame',()=>{
 const {owner}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.initializerSehFrames).toContainEqual({site:'100b0909',entered:true,returned:true});expect(stack.initializerSehFrames).toContainEqual({site:'100c614c',entered:true,returned:true});expect(stack.calls.find(call=>call.site==='100c614c')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='100b0931')!.returned).toBe(true);expect(stack.trace).toContain('100c6151.sharedInitializer.MOV');expect(stack.calls.find(call=>call.site==='100aeed8')!.returned).toBe(true);expect(stack.trace).toContain('100c6154.sharedInitializer.XOR');expect(owner.processAttach()).toEqual(result);
});
it('rejects a changed nested demangler scope while preserving the entered outer frame',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100f8e80']!.writeUnsigned(24,0,1);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Original live initializer SEH scope required');const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.initializerSehFrames).toContainEqual({site:'100b0909',entered:true,returned:false});expect(stack.initializerSehFrames.some(frame=>frame.site==='100c614c')).toBe(false);expect(stack.calls.find(call=>call.site==='100c614c')!.returned).toBe(false);expect(stack.trace).not.toContain('100c6151.sharedInitializer.MOV');
});

it('initializes and publishes CRT lock five through original malloc and lock-ten protection',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform),requests:{heap:NativeWin32HeapCapability;flags:number;size:number}[]=[];platform.win32HeapAlloc=(heap,flags,size)=>{if(flags===0&&size===24)requests.push({heap,flags,size});return allocate(heap,flags,size);};const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),fields=state.initializerAllocations.find(fields=>fields.bytes.length===24)!;expect(fields).toBeDefined();expect(requests).toEqual(Array(3).fill({heap:state.heap!,flags:0,size:24}));expect(fields.backing.freed).toBe(false);expect(fields.knownMask.every(mask=>mask===0)).toBe(true);expect(NativeRuntimePlatform.canonicalOwnedWin32HeapAllocationSpan(platform,state.heap!,owner.identity,{fields,offset:0},24)).toEqual({known:true,value:undefined});const published=owner.imageStorage('lockTable').pointer<{fields:NativeHeapObjectViews;offset:number}>(5*8).get()!;expect(published.fields).toBe(fields);expect(published.offset).toBe(0);const stack=state.caseState!.stack!.snapshot();expect(stack.initializerSehFrames).toContainEqual({site:'100bb7d6',entered:true,returned:true});expect(stack.calls.find(call=>call.site==='100bb817')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='100aeed8')!.returned).toBe(true);expect(stack.trace).toContain('100aef0f.sharedInitializer.RET');
});
it('retains lock-five allocation failure at the actual heap call without publishing a section',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===0&&size===24?{known:false,reason:'Lock five heap allocation unavailable'}:allocate(heap,flags,size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Lock five heap allocation unavailable');expect(owner.imageStorage('lockTable').pointer(5*8).get()).toBeNull();const state=owner.snapshot();expect(state.initializerAllocations.some(fields=>fields.bytes.length===24)).toBe(false);const stack=state.caseState!.stack!.snapshot();expect(stack.initializerSehFrames).toContainEqual({site:'100bb7d6',entered:true,returned:false});expect(stack.calls.find(call=>call.site==='100bb817')!.returned).toBe(false);expect(stack.calls.some(call=>call.site==='100bb834')).toBe(false);
});

it('publishes initialized CRT lock five, releases lock ten and enters the demangler lock',()=>{
 const {owner,platform}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),table=owner.imageStorage('lockTable'),pointer=table.pointer<{fields:NativeHeapObjectViews;offset:number}>(5*8).get()!,ten=table.pointer<NativeHeapObjectViews>(10*8).get()!;expect(pointer.offset).toBe(0);expect(state.initializerAllocations.includes(pointer.fields)).toBe(true);const sections=platform.snapshot().physicalSections;expect(sections.find(section=>section.fields===pointer.fields)).toMatchObject({owner:owner.identity,spinCount:4000,depth:0});expect(sections.find(section=>section.fields===ten)!.depth).toBe(0);expect(state.sections.includes(pointer.fields)).toBe(true);const scratch=state.initializerImages['102f6f1c']!,block=state.initializerAllocations.find(fields=>fields.bytes.length===4104)!;expect(block).toBeDefined();expect(scratch.readUnsigned(0)).toBe(0x100aaaf6);expect(scratch.readUnsigned(4)).toBe(0x100aa9a4);for(const offset of [8,12])expect(scratch.pointer(offset).get()).toBeNull();expect(block.backing.freed).toBe(true);expect(scratch.readUnsigned(16)).toBe(3944);const stack=state.caseState!.stack!.snapshot();expect(stack.initializerSehFrames).toContainEqual({site:'100bb7d6',entered:true,returned:true});for(const site of ['100bb834','100bb847','100bb88b','100bb883','100c6160','100c616c'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(stack.trace).toContain('100bb869.sharedInitializer.MOV');
});
it('uses a bounded section view of the original rounded heap allocation',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.virtualAlloc.bind(platform);platform.virtualAlloc=(size,type,protect)=>{owner.imageStorage('heapSelection').writeUnsigned(0,2);return allocate(size,type,protect);};const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const pointer=owner.imageStorage('lockTable').pointer<{fields:NativeHeapObjectViews;offset:number}>(5*8).get()!,section=platform.snapshot().physicalSections.find(section=>section.fields.backing===pointer.fields.backing)!;expect(pointer.fields.bytes.length).toBe(32);expect(section.fields.bytes.length).toBe(24);expect(section.fields.bytes.byteOffset).toBe(pointer.fields.bytes.byteOffset);expect(section.fields.backing).toBe(pointer.fields.backing);expect(section.depth).toBe(0);expect(pointer.fields.knownMask.subarray(24).every(mask=>mask===0)).toBe(true);
});
it('retains lock-ten protection and an unpublished section on failed CRT initialization',()=>{
 const {owner,platform}=stdioFixture(),initialize=platform.initializePhysicalCriticalSection.bind(platform);platform.initializePhysicalCriticalSection=(fields,sectionOwner,spin)=>owner.snapshot().initializerAllocations.some(allocated=>allocated.backing===fields.backing&&allocated.bytes.length===24)?{known:true,value:false}:initialize(fields,sectionOwner,spin);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100bb859 -> 100aedd1');const table=owner.imageStorage('lockTable');expect(table.pointer(5*8).get()).toBeNull();const ten=table.pointer<NativeHeapObjectViews>(10*8).get()!;expect(platform.snapshot().physicalSections.find(section=>section.fields===ten)!.depth).toBe(1);expect(owner.snapshot().caseState!.stack!.snapshot().initializerSehFrames).toContainEqual({site:'100bb7d6',entered:true,returned:false});
});
it('rejects a forged CRT lock-ten table pointer before entering its section',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===0&&size===24)owner.imageStorage('lockTable').pointer(10*8).set({name:'forged CRT section'});return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual retained CRT section table pointer required');expect(owner.imageStorage('lockTable').pointer(5*8).get()).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().calls.some(call=>call.site==='100bb847')).toBe(false);
});

it('rejects a cleared retained CRT lock-ten slot without initializing a different lock',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===0&&size===24)owner.imageStorage('lockTable').pointer(10*8).set(null);return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual retained CRT section table pointer required');expect(owner.imageStorage('lockTable').pointer(5*8).get()).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().calls.some(call=>call.site==='100bb847')).toBe(false);
});

 it('constructs four demangler scratch nodes on the original CRT heap',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform),requests:{heap:NativeWin32HeapCapability;flags:number;size:number}[]=[];
 platform.win32HeapAlloc=(heap,flags,size)=>{if(size===4104)requests.push({heap,flags,size});return allocate(heap,flags,size);};
 const observed=inspectScratchBeforeFree(owner,platform,()=>{
 const state=owner.snapshot(),block=state.initializerAllocations.find(fields=>fields.bytes.length===4104)!;
 expect(requests.length).toBe(1);expect(requests[0]!.heap).toBe(state.heap);expect(requests[0]!.flags).toBe(0);expect(block.backing.freed).toBe(false);expect(block.readUnsigned(0)).toBe(0);
 for(const [index,offset] of [4084,4068,4052,4036].entries()){expect(block.readUnsigned(offset)).toBe(0x100f29ac);expect(block.readUnsigned(offset+4)).toBe(0);expect(block.readUnsigned(offset+8)).toBe(index%2===0?3:1);expect(block.readUnsigned(offset+12)).toBe(0);}
 const scratch=state.initializerImages['102f6f1c']!,first=scratch.pointer<{fields:NativeHeapObjectViews;offset:number}>(20).get()!,second=scratch.pointer<{fields:NativeHeapObjectViews;offset:number}>(24).get()!;
 expect(first.fields).toBe(second.fields);expect(second.offset-first.offset).toBe(60);expect(first.fields.readUnsigned(first.offset)).toBe(0xffffffff);expect(second.fields.readUnsigned(second.offset)).toBe(0);
 for(const [base,nodeOffsets] of [[first.offset,[4084,4068]],[second.offset,[4052,4036]]] as const){for(const [index,tableOffset] of [44,52].entries()){const link=first.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(base+tableOffset).get()!;expect(link.fields).toBe(block);expect(link.offset).toBe(nodeOffsets[index]);const flags=first.fields.maskedWord(base+tableOffset+4);expect(flags.value&0xfff).toBe(index===0?3:1);expect(flags.knownMask&0xfff).toBe(0xfff);}}
 const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100c61aa')!.returned).toBe(true);expect(scratch.readUnsigned(48)).toBe(0x2800);expect(scratch.readUnsigned(56,1)).toBe(0);
 });const result=owner.processAttach();expect(observed()).toBe(true);expect(result).toEqual({known:true,value:1});
 });

it('retains a failed demangler scratch allocation without publishing a block',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);
 platform.win32HeapAlloc=(heap,flags,size)=>size===4104?{known:false,reason:'Demangler scratch heap unavailable'}:allocate(heap,flags,size);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Demangler scratch heap unavailable');
 const state=owner.snapshot(),scratch=state.initializerImages['102f6f1c']!;expect(scratch.pointer(8).get()).toBeNull();expect(scratch.pointer(12).get()).toBeNull();expect(scratch.readUnsigned(16)).toBe(0);expect(state.initializerAllocations.some(fields=>fields.bytes.length===4104)).toBe(false);
 const pointer=owner.imageStorage('lockTable').pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!;expect(platform.snapshot().physicalSections.find(section=>section.fields===pointer.fields)!.depth).toBe(1);
 const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100c61aa')!.returned).toBe(false);expect(stack.initializerSehFrames).toContainEqual({site:'100c614c',entered:true,returned:false});
});

it('advances the original type-name cursor into data-type grammar with its frames active',()=>{
 const {owner}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),scratch=state.initializerImages['102f6f1c']!,initial=scratch.pointer<{fields:NativeHeapObjectViews;offset:number}>(36).get()!,cursor=scratch.pointer<{fields:NativeHeapObjectViews;offset:number}>(32).get()!;
 expect(cursor.fields).toBe(initial.fields);expect(cursor.offset).toBe(initial.offset+20);expect(initial.fields.readUnsigned(initial.offset,1)).toBe(0x3f);expect(cursor.fields.readUnsigned(cursor.offset,1)).toBe(0);expect(Array.from(state.initializerImages['100f2b10']!.bytes)).toEqual([99,108,97,115,115,32,0]);expect(scratch.readUnsigned(48)).toBe(0x2800);
 const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100c61b5')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='100c5f79')!.returned).toBe(true);for(const site of ['100c6759','100c67d5','100c5bb1','100c29f5','100c2a09'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(stack.trace).toContain('100c1bfd.sharedInitializer.XOR');expect(stack.trace).toContain('100c1cf7.sharedInitializer.POP');expect(stack.initializerSehFrames).toContainEqual({site:'100c614c',entered:true,returned:true});
});

it('owns the class keyword text node and its exact six-byte copy in the live scratch block',()=>{
 const {owner,platform}=stdioFixture();
 const observed=inspectScratchBeforeFree(owner,platform,()=>{
 const state=owner.snapshot(),block=state.initializerAllocations.find(fields=>fields.bytes.length===4104)!;
 expect(block.pointer<{fields:NativeHeapObjectViews;offset:number}>(4020).get()).toEqual({fields:state.initializerImages['100f29bc'],offset:0});expect(block.readUnsigned(4024)).toBe(0);expect(block.readUnsigned(4032)).toBe(6);
 const text=block.pointer<{fields:NativeHeapObjectViews;offset:number}>(4028).get()!;expect(text.fields).toBe(block);expect(text.offset).toBe(4012);expect(Array.from(block.bytes.subarray(4012,4018))).toEqual([99,108,97,115,115,32]);expect(Array.from(block.knownMask.subarray(4012,4020))).toEqual([255,255,255,255,255,255,0,0]);expect(state.initializerImages['102f6f1c']!.readUnsigned(16)).toBe(3944);
 const stack=state.caseState!.stack!.snapshot();for(const site of ['100c455a','100c2905','100c2545','100c2276','100c2289'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(stack.trace.filter(row=>row==='100c1e22.sharedInitializer.MOV')).toHaveLength(42);expect(block.backing.freed).toBe(false);
 });const result=owner.processAttach();expect(observed()).toBe(true);expect(result).toEqual({known:true,value:1});
});

it('owns the parsed identifier and its second-replicator entry after the original cookie return',()=>{
 const {owner,platform}=stdioFixture();
 const observed=inspectScratchBeforeFree(owner,platform,()=>{
 const state=owner.snapshot(),block=state.initializerAllocations.find(fields=>fields.bytes.length===4104)!,scratch=state.initializerImages['102f6f1c']!;
 expect(block.pointer<{fields:NativeHeapObjectViews;offset:number}>(3996).get()).toEqual({fields:state.initializerImages['100f29bc'],offset:0});expect(block.readUnsigned(4000)).toBe(0);expect(block.readUnsigned(4008)).toBe(15);const text=block.pointer<{fields:NativeHeapObjectViews;offset:number}>(4004).get()!;expect(text.fields).toBe(block);expect(text.offset).toBe(3980);expect(new TextDecoder().decode(block.bytes.subarray(3980,3995))).toBe('bCObsoleteClass');expect(Array.from(block.knownMask.subarray(3980,3996))).toEqual([...Array(15).fill(255),0]);
 const second=scratch.pointer<{fields:NativeHeapObjectViews;offset:number}>(24).get()!;expect(second.fields.readUnsigned(second.offset)).toBe(0);const entry=second.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(second.offset+4).get()!;expect(entry.fields).toBe(block);expect(entry.offset).toBe(3972);const node=block.pointer<{fields:NativeHeapObjectViews;offset:number}>(3972).get()!;expect(node.fields).toBe(block);expect(node.offset).toBe(3996);expect(block.maskedWord(3976).knownMask&0xfff).toBe(0xfff);expect(block.maskedWord(3976).value&0xfff).toBe(0);
 const stack=state.caseState!.stack!.snapshot();for(const site of ['100c457a','100c43dc','100c437b','100c43a0','100c43ba'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(stack.trace).toContain('100b01d0.sharedInitializer.RET');expect(scratch.readUnsigned(16)).toBe(3944);
 });const result=owner.processAttach();expect(observed()).toBe(true);expect(result).toEqual({known:true,value:1});
});

it('links the keyword and identifier through the original indirect node before output length',()=>{
 const {owner,platform}=stdioFixture();
 const observed=inspectScratchBeforeFree(owner,platform,()=>{
 const state=owner.snapshot(),block=state.initializerAllocations.find(fields=>fields.bytes.length===4104)!;
 expect(block.pointer<{fields:NativeHeapObjectViews;offset:number}>(3956).get()).toEqual({fields:state.initializerImages['100f299c'],offset:0});const next=block.pointer<{fields:NativeHeapObjectViews;offset:number}>(3960).get()!,indirect=block.pointer<{fields:NativeHeapObjectViews;offset:number}>(3964).get()!;expect(next.fields).toBe(block);expect(next.offset).toBe(3996);expect(indirect.fields).toBe(block);expect(indirect.offset).toBe(3948);const keyword=block.pointer<{fields:NativeHeapObjectViews;offset:number}>(3948).get()!;expect(keyword.fields).toBe(block);expect(keyword.offset).toBe(4020);expect(block.maskedWord(3952).knownMask&0xfff).toBe(0xfff);expect(block.maskedWord(3952).value&0xfff).toBe(0);
 const keywordText=block.pointer<{fields:NativeHeapObjectViews;offset:number}>(keyword.offset+8).get()!,identifierText=block.pointer<{fields:NativeHeapObjectViews;offset:number}>(next.offset+8).get()!;expect(new TextDecoder().decode(block.bytes.subarray(keywordText.offset,keywordText.offset+block.readUnsigned(keyword.offset+12)))+new TextDecoder().decode(block.bytes.subarray(identifierText.offset,identifierText.offset+block.readUnsigned(next.offset+12)))).toBe('class bCObsoleteClass');expect(block.pointer(next.offset+4).get()).toBeNull();expect(block.pointer(keyword.offset+4).get()).toBeNull();
 const stack=state.caseState!.stack!.snapshot();for(const site of ['100c4587','100c2816','100c222e','100c2825','100c6647','100c677a','100c51f3','100c5f16','100c5f20','100c5f58'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(state.initializerImages['102f6f1c']!.readUnsigned(48)).toBe(0x2800);
 });const result=owner.processAttach();expect(observed()).toBe(true);expect(result).toEqual({known:true,value:1});
});

it('calculates the original class-name graph length and retains its output allocation',()=>{
 const {owner,platform}=stdioFixture();const observed=inspectOutputBeforeFree(owner,platform,()=>{
 const state=owner.snapshot(),heap=state.initializerImages['102f6f1c']!,output=heap.pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!;
 expect(heap.readUnsigned(44)).toBe(22);expect(output.offset).toBe(0);expect(output.fields.bytes.length).toBe(24);expect(state.initializerAllocations.includes(output.fields)).toBe(true);expect(new TextDecoder().decode(output.fields.bytes.subarray(0,21))).toBe('class bCObsoleteClass');expect(output.fields.readUnsigned(21,1)).toBe(0);expect(Array.from(output.fields.knownMask)).toEqual([...Array(22).fill(255),0,0]);expect(output.fields.backing.freed).toBe(false);
 const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100c5f79')!.returned).toBe(true);expect(stack.calls.filter(call=>call.site==='100c2000')).toHaveLength(4);expect(stack.calls.filter(call=>call.site==='100c2000').every(call=>call.returned)).toBe(true);expect(stack.trace).toContain('100c22ea.sharedInitializer.JMP');expect(stack.trace).toContain('100c1d9c.sharedInitializer.MOV');expect(stack.calls.find(call=>call.site==='100c5f8b')!.returned).toBe(true);
 });const result=owner.processAttach();expect(observed()).toBe(true);expect(result).toEqual({known:true,value:1});
});

for(const offset of [0,4,8])it('rejects changed original demangler vtable bytes at slot '+offset,()=>{
 const {owner}=stdioFixture(),table=owner.snapshot().initializerImages['100f299c']!;table.writeUnsigned(offset,0x100c1d9c);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Original demangler vtable bytes required');expect(result.reason).toContain('100c2000');expect(owner.snapshot().initializerImages['102f6f1c']!.pointer(40).get()).toBeNull();
});

it('serializes the original class name through original virtual string callbacks',()=>{
 const {owner}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),output=state.initializerImages['102f6f1c']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!,stack=state.caseState!.stack!.snapshot();
 expect(Array.from(output.fields.bytes.subarray(0,22))).toEqual([...new TextEncoder().encode('class bCObjectRefBase'),0]);expect(output.fields.knownMask.subarray(22).every(mask=>mask===0)).toBe(true);
 expect(stack.calls.filter(call=>call.site==='100c2093')).toHaveLength(6);expect(stack.calls.filter(call=>call.site==='100c20ab')).toHaveLength(6);for(const site of ['100c5fa5','100c61b5'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);for(const call of stack.calls.filter(call=>call.site==='100c20ab'))expect(call.returned).toBe(true);
 expect(stack.trace).toContain('100c209f.sharedInitializer.JNS');expect(stack.trace).toContain('100c2316.sharedInitializer.JMP');expect(stack.trace.filter(row=>row==='100c1e22.sharedInitializer.MOV')).toHaveLength(84);expect(state.initializerAllocations.find(fields=>fields.bytes.length===4104)!.backing.freed).toBe(true);
});

for(const tableAddress of ['100f299c','100f29bc'])it('rejects a changed virtual output callback after length returns: '+tableAddress,()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);let small=0,changed=false;
 platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===0&&size===24&&++small===2){owner.snapshot().initializerImages[tableAddress]!.writeUnsigned(8,0x100c1d9c);changed=true;}return result;};
 const result=owner.processAttach();expect(changed).toBe(true);expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Original demangler vtable bytes required');const state=owner.snapshot(),output=state.initializerImages['102f6f1c']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!;expect(output.fields.knownMask.every(mask=>mask===0)).toBe(true);expect(state.caseState!.stack!.snapshot().calls.find(call=>call.site==='100c5f79')!.returned).toBe(true);
});

it('frees both original scratch allocations once and restores the normal demangler frames',()=>{
 const {owner,platform}=stdioFixture(),free=platform.win32HeapFree.bind(platform),freed:object[]=[];
 platform.win32HeapFree=(heap,flags,backing)=>{if(backing.bytes.length===4104){expect(heap).toBe(owner.snapshot().heap);expect(flags).toBe(0);freed.push(backing);}return free(heap,flags,backing);};
 const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),block=state.initializerAllocations.find(fields=>fields.bytes.length===4104)!,scratch=state.initializerImages['102f6f1c']!,output=scratch.pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!;
 const blocks=state.initializerAllocations.filter(fields=>fields.bytes.length===4104);expect(freed).toHaveLength(2);expect(freed[0]).toBe(blocks[0]!.backing);expect(freed[1]).toBe(blocks[1]!.backing);expect(blocks[1]!.backing.freed).toBe(true);expect(block.backing.freed).toBe(true);expect(()=>block.readUnsigned(0)).toThrow('freed');expect(output.fields.backing.freed).toBe(true);expect(new TextDecoder().decode(output.fields.bytes.subarray(0,21))).toBe('class bCObjectRefBase');for(const offset of [8,12])expect(scratch.pointer(offset).get()).toBeNull();
 const section=owner.imageStorage('lockTable').pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!,stack=state.caseState!.stack!.snapshot();expect(platform.snapshot().physicalSections.find(row=>row.fields===section.fields)!.depth).toBe(0);for(const site of ['100c614c','100aa9ab'])expect(stack.initializerSehFrames).toContainEqual({site,entered:true,returned:true});expect(stack.initializerSehFrames).toContainEqual({site:'100b0909',entered:true,returned:true});for(const site of ['100c61c2','100c14f3','100aaa0c','100c61ce','100c61de','100c61d6','100b0931'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);
});
it('rejects a forged CRT HeapFree import before freeing scratch',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['102f9674']!.pointer(0).set({name:'forged free'});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual CRT HeapFree import slot required');expect(owner.snapshot().initializerAllocations.find(fields=>fields.bytes.length===4104)!.backing.freed).toBe(false);
});
it('retains free failure and its exception frame before original errno mapping',()=>{
 const {owner,platform}=stdioFixture(),free=platform.win32HeapFree.bind(platform);let attempted=0;platform.win32HeapFree=(heap,flags,backing)=>{if(backing.bytes.length===4104){attempted++;return {known:true,value:false};}return free(heap,flags,backing);};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aaa16 -> 100aedd1');expect(attempted).toBe(1);const state=owner.snapshot();expect(state.initializerAllocations.find(fields=>fields.bytes.length===4104)!.backing.freed).toBe(false);expect(state.caseState!.stack!.snapshot().initializerSehFrames).toContainEqual({site:'100aa9ab',entered:true,returned:false});const section=owner.imageStorage('lockTable').pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!;expect(platform.snapshot().physicalSections.find(row=>row.fields===section.fields)!.depth).toBe(1);
});

it('publishes the original type-info name and cache-list node under lock fourteen',()=>{
 const {owner,platform}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),type=state.initializerImages['10140148']!,name=type.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!,head=state.initializerImages['102f6484']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!,node=head.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!;
 expect(name.offset).toBe(0);expect(name.fields.bytes.length).toBe(22);expect(name.fields.backing.freed).toBe(false);expect(Array.from(name.fields.bytes)).toEqual([...new TextEncoder().encode('class bCObsoleteClass'),0]);expect(name.fields.knownMask.every(mask=>mask===255)).toBe(true);expect(node.fields.bytes.length).toBe(8);expect(node.offset).toBe(0);expect(node.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields).toBe(name.fields);expect(node.fields.pointer(4).get()).toBeNull();expect(state.initializerAllocations.includes(name.fields)).toBe(true);expect(state.initializerAllocations.includes(node.fields)).toBe(true);
 const stack=state.caseState!.stack!.snapshot();for(const site of ['100b0948','100b0966','100b0998','100b09dd','100b09f0','100b09e5','100a709e','1008e933'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(stack.trace).toContain('100b2acf.sharedInitializer.TEST');expect(stack.trace).toContain('100b2af7.sharedInitializer.LEA');expect(stack.trace).toContain('100b09c1.sharedInitializer.MOV');const lock=owner.imageStorage('lockTable').pointer<NativeHeapObjectViews>(14*8).get()!;expect(platform.snapshot().physicalSections.find(row=>row.fields===lock)!.depth).toBe(0);
});
it('rejects a forged type-info cache lock before publishing the cached name',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);let small=0;platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===0&&size===24&&++small===2)owner.imageStorage('lockTable').pointer(14*8).set({name:'forged cache lock'});return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Actual retained CRT section table pointer required');expect(owner.snapshot().initializerImages['10140148']!.pointer(4).get()).toBeNull();
});

for(const hiddenPadding of [0,0xff])it('calculates the type-info length without choosing unknown padding: '+hiddenPadding,()=>{
 const {owner,platform}=stdioFixture();inspectScratchBeforeFree(owner,platform,()=>{const output=owner.snapshot().initializerImages['102f6f1c']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!.fields;output.bytes[22]=hiddenPadding;output.bytes[23]=hiddenPadding;expect(output.knownMask[22]).toBe(0);expect(output.knownMask[23]).toBe(0);});
 const result=owner.processAttach();expect(result).toEqual({known:true,value:1});const cached=owner.snapshot().initializerImages['10140148']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!.fields;expect(Array.from(cached.bytes)).toEqual([...new TextEncoder().encode('class bCObsoleteClass'),0]);
});
it('stops at an ambiguous original strlen candidate when the known terminator is removed',()=>{
 const {owner,platform}=stdioFixture();inspectScratchBeforeFree(owner,platform,()=>owner.snapshot().initializerImages['102f6f1c']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(40).get()!.fields.writeUnsigned(21,0x41,1));const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('SharedBase original strlen candidate remains ambiguous');expect(result.reason).toContain('100b2ac1');expect(owner.snapshot().initializerImages['10140148']!.pointer(4).get()).toBeNull();
});


it('constructs the original class name in a claimed 24-byte pool slot and publishes initializer 142',()=>{
 const {owner,platform}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});
 const state=owner.snapshot(),slot=state.poolSlots.find(item=>item.capacity===24)!;expect(slot).toBeDefined();expect(slot.offset).toBe(16);expect(slot.region.bytes.length).toBe(0xc0000);expect(slot.region.readUnsigned(8)).toBe(2);expect(slot.region.readUnsigned(0xbf008)).toBe(0xfffffffc);expect(slot.fields.readUnsigned(0)).toBe(15);expect(slot.fields.readUnsigned(4)).toBe(1);expect(Array.from(slot.fields.bytes.slice(8))).toEqual([...new TextEncoder().encode('bCObsoleteClass'),0]);
 const text=state.initializerImages['102f47e4']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(text.fields).toBe(slot.fields);expect(text.offset).toBe(8);const published=state.initializerImages['102f48bc']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(published.fields).toBe(state.initializerImages['102f47e4']);expect(published.offset).toBe(0);expect(state.initializerImages['102fb030']!.readUnsigned(0)).toBe(2);
 const stack=state.caseState!.stack!.snapshot();for(const site of ['1008e93e','1008e948','100e1600'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(platform.compareRegions(state.poolRegions[0]!.backing as Parameters<typeof platform.compareRegions>[0],slot.region.backing as Parameters<typeof platform.compareRegions>[1])).toEqual({known:true,value:-1});
});


it('constructs bCObjectRefBase in the second 24-byte slot and links its real type-info cache node',()=>{
 const {owner}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),slots=state.poolSlots.filter(slot=>slot.capacity===24);expect(slots).toHaveLength(2);const slot=slots[1]!;expect(slot.region).toBe(slots[0]!.region);expect(slot.offset).toBe(40);expect(slot.region.readUnsigned(8)).toBe(2);expect(slot.region.readUnsigned(0xbf008)).toBe(0xfffffffc);expect(slot.fields.readUnsigned(0)).toBe(15);expect(slot.fields.readUnsigned(4,2)).toBe(1);expect(Array.from(slot.fields.bytes.slice(8))).toEqual([...new TextEncoder().encode('bCObjectRefBase'),0]);
 const object=state.initializerImages['102f47f0']!,text=object.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!,published=state.initializerImages['102f48b8']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(text.fields).toBe(slot.fields);expect(text.offset).toBe(8);expect(published.fields).toBe(object);expect(published.offset).toBe(0);expect(object.readUnsigned(8)).toBe(3);
 const cached=state.initializerImages['1013f1a8']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!,node=state.initializerImages['102f6484']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!;expect(Array.from(cached.fields.bytes)).toEqual([...new TextEncoder().encode('class bCObjectRefBase'),0]);expect(node.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields).toBe(cached.fields);const previous=node.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!;expect(previous.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields).toBe(state.initializerImages['10140148']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(4).get()!.fields);
 const stack=state.caseState!.stack!.snapshot();for(const site of ['100e1610','1008e9a3','1008e9ae','1008e9b8'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(stack.trace).toContain('100c21a6.sharedInitializer.OR');
});


it('returns zero from the complete original SharedBase initializer table after its final callbacks',()=>{
 const {owner,platform}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.sharedInitializerFrame!.initializerResult).toBe(0);expect(state.attachReturned).toBe(1);expect(state.initializerImages['102f48e8']!.readUnsigned(0)).toBe(0);for(const site of ['100e1635','100e163f','100e1675','100e1685']){expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);}expect(stack.calls.find(call=>call.site==='100adb5a')!.returned).toBe(true);expect(stack.trace).toContain('100aa6c3.sharedInitializer.RET');
 const decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');if(!decoder.known)throw new Error(decoder.reason);const decoded=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);if(!decoded.known)throw new Error(decoded.reason);const end=decoded.value as {fields:NativeHeapObjectViews;offset:number};expect(end.offset).toBe(72);for(const [index,address] of [0x100e30b0,0x100e3110,0x100e3100].entries()){const callback=decoder.value.invoke(end.fields.pointer(60+index*4).get()!);if(!callback.known)throw new Error(callback.reason);expect((callback.value as {originalCodeAddress:number}).originalCodeAddress).toBe(address);expect(stack.trace.some(row=>row.startsWith(address.toString(16)+'.'))).toBe(false);}
});


for(const initial of [0,7,0xffffffff])it('executes the original successful CRT caller count increment from '+initial,()=>{
 const {owner}=stdioFixture(),count=owner.snapshot().initializerImages['102f648c']!;count.writeUnsigned(0,initial);const result=owner.processAttach();expect(result).toEqual({known:true,value:1});expect(count.readUnsigned(0)).toBe((initial+1)>>>0);expect(owner.snapshot().attachReturned).toBe(1);const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.sharedInitializerFrame!.initializerResult).toBe(0);expect(stack.registers.EAX).toMatchObject({word:{value:1,knownMask:0xffffffff}});for(const instruction of ['100adb5f.sharedInitializer.TEST','100adb61.sharedInitializer.POP','100adb64.sharedInitializer.INC','100adb6a.sharedInitializer.JMP','100adc1d.sharedInitializer.INC'])expect(stack.trace).toContain(instruction);expect(owner.processAttach()).toEqual(result);expect(count.readUnsigned(0)).toBe((initial+1)>>>0);
});


it('returns one from SharedBase CRT attach after restoring its retained logical caller frame',()=>{
 const {owner}=stdioFixture(),result=owner.processAttach();expect(result).toEqual({known:true,value:1});const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.attachReturned).toBe(1);expect(state.boundary).toBeNull();expect(state.initializerImages['102f648c']!.readUnsigned(0)).toBe(1);expect(stack.sharedInitializerFrame!.initializerResult).toBe(0);expect(stack.sharedCrtCallerFrame!.returned).toBe(true);expect(stack.phase).toBe('returned');expect(stack.calls.find(call=>call.site==='100adc79')!.returned).toBe(true);expect(stack.trace).toContain('100adc22.sharedInitializer.RET');expect(owner.processAttach()).toEqual(result);expect(state.initializerImages['102f648c']!.readUnsigned(0)).toBe(1);
});


it('rejects a changed original CRT caller receipt before constructing its logical frame',()=>{
 const receipt=sharedCrtSource.methods.dllMainCrtStartup,saved=receipt.bodyInstructionBytesSha256;try{receipt.bodyInstructionBytesSha256='00'.repeat(32);expect(()=>fixture()).toThrow('Original SharedBase CRT caller source required');}finally{receipt.bodyInstructionBytesSha256=saved;}
});


it('rejects changed saved CRT caller storage through the actual stack alias',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.virtualAlloc.bind(platform);let changed=false;platform.virtualAlloc=(size,type,protect)=>{if(!changed){const stack=owner.snapshot().caseState!.stack!.snapshot(),frame=stack.sharedCrtCallerFrame!,backing=stack.sharedArgvFrame!.argumentCount.backing;backing.bytes[frame.ebp-8]=backing.bytes[frame.ebp-8]!^1;backing.knownMask[frame.ebp-8]=255;changed=true;}return allocate(size,type,protect);};const result=owner.processAttach();expect(changed).toBe(true);expect(result.known).toBe(false);if(result.known)throw new Error('Forged caller returned');expect(result.reason).toContain('Retained x86 expression slot changed outside its actual store');expect(result.reason).toContain('100adc20');expect(owner.snapshot().attachReturned).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().sharedCrtCallerFrame!.returned).toBe(false);
});

it('executes the original DLL entry guard and retains its pending initializer call',()=>{
 const {owner}=stdioFixture();expect(owner.processAttach()).toEqual({known:true,value:1});const result=owner.processDllEntryPrefix();expect(result).toEqual({known:false,reason:'Original SharedBase DLL initializer pending at 10006645'});
 const state=owner.snapshot();expect(state.dllEntryImages!.guard.readUnsigned(0)).toBe(1);expect(state.dllEntryImages!.object.readUnsigned(0)).toBe(0);expect(state.dllEntryExecuted).toBe(false);expect(state.dllEntryReturned).toBeNull();
 const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='100adc8c')!.returned).toBe(false);expect(stack.calls.find(call=>call.site==='100a1645')!.returned).toBe(false);expect(stack.trace).toContain('100a1639.OR dword ptr [0x102f48f0],0x1');
 const calls=stack.calls.length;expect(owner.processDllEntryPrefix()).toEqual(result);expect(state.caseState!.stack!.snapshot().calls).toHaveLength(calls);
});
it('requires actual CRT success before DLL entry and rejects a fabricated caller proof',()=>{
 const {owner,platform}=stdioFixture();expect(owner.processDllEntryPrefix().known).toBe(false);expect(owner.snapshot().dllEntryImages).toBeNull();expect(NativeSharedCrtOwner.dllEntryStackArgumentsForPlatform(platform,{}).known).toBe(false);
});

it('retains original DLL initializer version outputs and their real stack argument pointers',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();const result=owner.processDllInitializerPrefix();expect(result).toEqual({known:false,reason:'Original SharedBase DLL version query pending at 10008058'});
 const stack=owner.snapshot().caseState!.stack!.snapshot(),frame=stack.sharedDllInitializerFrame!;expect(frame.outputs).toHaveLength(4);expect(frame.outputs.map(fields=>fields.readUnsigned(0))).toEqual([0,0,0,0]);
 expect(frame.outputs.map(fields=>fields.bytes.byteOffset-fields.backing.bytes.byteOffset)).toEqual([4,8,12,16].map(offset=>frame.entryEsp-offset));expect(frame.outputs.every(fields=>fields.backing===stack.sharedArgvFrame!.argumentCount.backing)).toBe(true);
 expect(frame.moduleName).toBe(owner.snapshot().dllEntryImages!.moduleName);expect(String.fromCharCode(...frame.moduleName.bytes)).toBe('sharedbase.dll\0');expect(stack.calls.find(call=>call.site==='100a15c1')!.returned).toBe(false);expect(stack.trace).toContain('100a15c1.CALL 0x10008058');
 const calls=stack.calls.length;expect(owner.processDllInitializerPrefix()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(owner.snapshot().dllEntryExecuted).toBe(false);
});
it('rejects changed initializer return storage through the actual stack alias',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();const stack=owner.snapshot().caseState!.stack!.snapshot(),call=stack.calls.find(call=>call.site==='100a1645')!,backing=stack.sharedArgvFrame!.argumentCount.backing;
 backing.bytes[call.position]=backing.bytes[call.position]!^1;backing.knownMask[call.position]=255;const result=owner.processDllInitializerPrefix();expect(result.known).toBe(false);if(result.known)throw new Error('corrupt return admitted');expect(result.reason).toContain('changed outside its actual store');expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllInitializerFrame).toBeNull();
});

it('rejects changed DLL initializer evidence before constructing its local frame',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();const method=dllEntrySource.methods.find(item=>item.label==='sharedDllMainInitializer')!,hash=method.bodyInstructionBytesSha256;
 try{method.bodyInstructionBytesSha256='00'.repeat(32);expect(owner.processDllInitializerPrefix()).toEqual({known:false,reason:'Original DLL initializer source required'});expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllInitializerFrame).toBeNull();}finally{method.bodyInstructionBytesSha256=hash;}
});

it('retains the original version filename-copy import and its actual local buffer',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();const result=owner.processDllVersionQueryPrefix();expect(result).toEqual({known:false,reason:'Original SharedBase lstrcpyA pending at 1004c59f'});
 const stack=owner.snapshot().caseState!.stack!.snapshot(),frame=stack.sharedDllVersionFrame!;expect(frame.copyPending).toBe(true);expect(frame.filename.bytes.length).toBe(260);expect(frame.filename.backing).toBe(stack.sharedArgvFrame!.argumentCount.backing);expect(frame.filename.bytes.byteOffset-frame.filename.backing.bytes.byteOffset).toBe(frame.entryEsp-260);expect(frame.source).toBe(owner.snapshot().dllEntryImages!.moduleName);
 expect(stack.registers.EBP).toMatchObject({word:{knownMask:0,provenance:{kind:'platform',category:'DllLstrcpyA'}}});expect(stack.registers.EAX).toMatchObject({word:{knownMask:4095,provenance:{kind:'stack',offset:frame.entryEsp-260}}});expect(owner.snapshot().dllLstrcpyImport!.slot.pointer(0).get()).toBe(owner.snapshot().dllLstrcpyImport!.procedure);expect(stack.calls.find(call=>call.site==='1004c59f')!.returned).toBe(false);expect(stack.trace).toContain('1004c59f.CALL EBP');expect(owner.snapshot().dllEntryExecuted).toBe(false);
 const calls=stack.calls.length;expect(owner.processDllVersionQueryPrefix()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
});
it('requires the original pending version query before constructing its frame',()=>{
 const {owner}=stdioFixture();expect(owner.processDllVersionQueryPrefix()).toEqual({known:false,reason:'Actual pending DLL version query required'});expect(owner.snapshot().dllLstrcpyImport).toBeNull();
});

it('rejects changed original filename-copy import evidence before version frame entry',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();const receipt=dllEntrySource.imports.find(item=>item.iatVA==='0x102f96b0')!,name=receipt.name;
 try{receipt.name='OtherProcedure';expect(owner.processDllVersionQueryPrefix()).toEqual({known:false,reason:'Original DLL filename-copy import required'});expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllVersionFrame).toBeNull();expect(owner.snapshot().dllLstrcpyImport).toBeNull();}finally{receipt.name=name;}
});
it('rejects changed version-query return storage before saving its registers',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();const stack=owner.snapshot().caseState!.stack!.snapshot(),call=stack.calls.find(call=>call.site==='100a15c1')!,backing=stack.sharedArgvFrame!.argumentCount.backing;
 backing.bytes[call.position]=backing.bytes[call.position]!^1;backing.knownMask[call.position]=255;const result=owner.processDllVersionQueryPrefix();expect(result.known).toBe(false);if(result.known)throw new Error('corrupt query return admitted');expect(result.reason).toContain('changed outside its actual store');expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllVersionFrame).toBeNull();
});

it('copies the actual DLL filename into its local buffer and returns through the import frame',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();const result=owner.processDllFilenameCopy();expect(result).toEqual({known:false,reason:'Original SharedBase LoadLibraryA binding pending at 1004c5a6'});
 const stack=owner.snapshot().caseState!.stack!.snapshot(),frame=stack.sharedDllVersionFrame!;expect(String.fromCharCode(...frame.filename.bytes.slice(0,15))).toBe('sharedbase.dll\0');expect(Array.from(frame.filename.knownMask.slice(0,15))).toEqual(Array(15).fill(255));expect(frame.copyPending).toBe(false);expect(stack.calls.find(call=>call.site==='1004c59f')!.returned).toBe(true);expect(stack.trace).toContain('1004c59f.lstrcpyANormalReturn');expect(stack.registers.EAX).toMatchObject({word:{provenance:{kind:'stack',offset:frame.entryEsp-260}}});expect(stack.registers.ECX).toMatchObject({word:{provenance:{kind:'stack',offset:frame.entryEsp-260}}});
 const calls=stack.calls.length;expect(owner.processDllFilenameCopy()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(owner.snapshot().dllEntryExecuted).toBe(false);
});

it('rejects a changed filename-copy import slot before modifying the destination',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();const stack=owner.snapshot().caseState!.stack!.snapshot(),before=Array.from(stack.sharedDllVersionFrame!.filename.bytes);owner.snapshot().dllLstrcpyImport!.slot.pointer(0).set({});
 expect(owner.processDllFilenameCopy()).toEqual({known:false,reason:'Canonical DLL lstrcpyA import binding required'});expect(Array.from(stack.sharedDllVersionFrame!.filename.bytes)).toEqual(before);expect(owner.snapshot().caseState!.stack!.snapshot().calls.find(call=>call.site==='1004c59f')!.returned).toBe(false);
});
it('retains applied filename bytes when the owned source has no terminator',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();const literal=owner.snapshot().dllEntryImages!.moduleName;literal.writeUnsigned(14,65,1);expect(owner.processDllFilenameCopy()).toEqual({known:false,reason:'Owned filename-copy terminator required'});
 const stack=owner.snapshot().caseState!.stack!.snapshot();expect(String.fromCharCode(...stack.sharedDllVersionFrame!.filename.bytes.slice(0,15))).toBe('sharedbase.dllA');expect(stack.sharedDllVersionFrame!.copyPending).toBe(true);expect(stack.calls.find(call=>call.site==='1004c59f')!.returned).toBe(false);
});

it('returns through the original module imports and follows the absent export resource branch',()=>{
 const {owner,platform}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();owner.processDllFilenameCopy();const profile={selection:'current-sharedbase-version-query',missingExportLastError:127,successLastError:'preserve'} as const;
 const result=owner.processDllModuleLookup(profile);expect(result).toEqual({known:false,reason:'Original SharedBase version resource fallback pending at 1004c62e'});expect(owner.snapshot().dllModuleState).toEqual({additionalReferences:0,currentImageRetained:true,attachExecuted:false});expect(platform.getWin32LastError()).toEqual({known:true,value:127});
 const stack=owner.snapshot().caseState!.stack!.snapshot();for(const site of ['1004c5a6','1004c5b8','1004c624'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='100a15c1')!.returned).toBe(false);expect(stack.trace).toContain('1004c621.XOR BL,BL');expect(stack.trace).toContain('1004c62c.JNZ 0x1004c670');expect(owner.snapshot().dllEntryExecuted).toBe(false);
 const calls=stack.calls.length;expect(owner.processDllModuleLookup(profile)).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(owner.snapshot().dllModuleState!.additionalReferences).toBe(0);
});
it('requires explicit module import outcomes before binding the pending library load',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();owner.processDllFilenameCopy();const result=owner.processDllModuleLookup({selection:'current-sharedbase-version-query',missingExportLastError:0,successLastError:'preserve'} as never);expect(result).toEqual({known:false,reason:'Explicit current-module import outcome selection required'});expect(owner.snapshot().dllModuleImports).toBeNull();
});

it('rejects a changed copied module filename without acquiring a library reference',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();owner.processDllFilenameCopy();owner.snapshot().caseState!.stack!.snapshot().sharedDllVersionFrame!.filename.writeUnsigned(0,88,1);
 expect(owner.processDllModuleLookup({selection:'current-sharedbase-version-query',missingExportLastError:127,successLastError:'preserve'})).toEqual({known:false,reason:'Original current-module filename required'});expect(owner.snapshot().dllModuleState!.additionalReferences).toBe(0);expect(owner.snapshot().caseState!.stack!.snapshot().calls.find(call=>call.site==='1004c5a6')!.returned).toBe(false);
});
it('rejects changed version export evidence before executing the module import',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();owner.processDllFilenameCopy();const original=dllEntrySource.versionExportLookup.namesSha256;
 try{dllEntrySource.versionExportLookup.namesSha256='00'.repeat(32);expect(owner.processDllModuleLookup({selection:'current-sharedbase-version-query',missingExportLastError:127,successLastError:'preserve'})).toEqual({known:false,reason:'Original current SharedBase export evidence required'});expect(owner.snapshot().dllModuleImports).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().calls.some(call=>call.site==='1004c5a6')).toBe(false);}finally{dllEntrySource.versionExportLookup.namesSha256=original;}
});

it('retains original resource fallback arguments and zeroed handle on the version-query stack',()=>{
 const {owner}=stdioFixture();owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();owner.processDllFilenameCopy();owner.processDllModuleLookup({selection:'current-sharedbase-version-query',missingExportLastError:127,successLastError:'preserve'});
 const result=owner.processDllResourceFallbackPrefix();expect(result).toEqual({known:false,reason:'Original SharedBase GetFileVersionInfoSizeA pending at 100d55e2'});const stack=owner.snapshot().caseState!.stack!.snapshot(),resource=stack.sharedDllResourceFrame!;expect(resource.handle.readUnsigned(0)).toBe(0);expect(resource.handle.backing).toBe(stack.sharedDllVersionFrame!.filename.backing);expect(stack.calls.find(call=>call.site==='1004c634')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='1004c65b')!.returned).toBe(false);expect(stack.calls.at(-1)!.site).toBe('1004c4d5');expect(stack.calls.at(-1)!.returned).toBe(false);expect(stack.trace).toContain('10002883.JMP 0x1004c4c0');expect(owner.snapshot().dllModuleState!.additionalReferences).toBe(0);
 const calls=stack.calls.length;expect(owner.processDllResourceFallbackPrefix()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(owner.snapshot().dllEntryExecuted).toBe(false);
});

function resourceSizeFixture(input?:ReturnType<typeof stdioFixture>){const fixture=(input??stdioFixture()),{owner}=fixture;owner.processAttach();owner.processDllEntryPrefix();owner.processDllInitializerPrefix();owner.processDllVersionQueryPrefix();owner.processDllFilenameCopy();owner.processDllModuleLookup({selection:'current-sharedbase-version-query',missingExportLastError:127,successLastError:'preserve'});owner.processDllResourceFallbackPrefix();return fixture;}
it('returns recorded version size through the original thunk and retains the MemoryAdmin caller',()=>{
 const {owner}=resourceSizeFixture();const result=owner.processDllResourceSize('recorded-sharedbase-ansi-version-buffer');expect(result).toEqual({known:false,reason:'Original SharedBase version buffer MemoryAdmin pending at 10002aae'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.sharedDllResourceFrame!.handle.readUnsigned(0)).toBe(0);expect(stack.calls.find(call=>call.site==='1004c4d5')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c4ea');expect(stack.calls.at(-1)!.returned).toBe(false);expect(stack.trace).toContain('100d55e2.JMP dword ptr [0x102f98f0]');expect(stack.trace).toContain('1004c4de.JNZ 0x1004c4e8');const calls=stack.calls.length;expect(owner.processDllResourceSize('recorded-sharedbase-ansi-version-buffer')).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
});
it('rejects a changed original version size thunk before applying the import result',()=>{
 const {owner}=resourceSizeFixture();const thunk=dllEntrySource.versionImportThunks.find(item=>item.address==='100d55e2')!,saved=thunk.bytes;try{thunk.bytes='000000000000';expect(owner.processDllResourceSize('recorded-sharedbase-ansi-version-buffer')).toEqual({known:false,reason:'Original version size import thunk required'});expect(owner.snapshot().dllResourceSizeImport).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().calls.find(call=>call.site==='1004c4d5')!.returned).toBe(false);}finally{thunk.bytes=saved;}
});
it('rejects a changed version size return word before its handle output is written',()=>{
 const {owner}=resourceSizeFixture(),stack=owner.snapshot().caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;const fields=new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4);fields.writeUnsigned(0,0);stack.sharedDllResourceFrame!.handle.writeUnsigned(0,99);expect(owner.processDllResourceSize('recorded-sharedbase-ansi-version-buffer')).toEqual({known:false,reason:'Retained x86 expression slot changed outside its actual store'});expect(stack.sharedDllResourceFrame!.handle.readUnsigned(0)).toBe(99);expect(owner.snapshot().caseState!.stack!.snapshot().calls.at(-1)!.returned).toBe(false);
});

it('returns the actual initialized MemoryAdmin singleton to the version buffer malloc caller',()=>{
 const {owner}=resourceSizeFixture();owner.processDllResourceSize('recorded-sharedbase-ansi-version-buffer');const result=owner.processDllMemoryAdmin();expect(result).toEqual({known:false,reason:'Original SharedBase version buffer Malloc pending at 10003cd8'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='1004c4ea')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c4f1');expect(stack.calls.at(-1)!.returned).toBe(false);expect(stack.trace).toContain('10020c34.dllMemoryAdmin.MOV EAX,0x101427a0');expect(owner.snapshot().dllEntryExecuted).toBe(false);const calls=stack.calls.length;expect(owner.processDllMemoryAdmin()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
});

it('returns an original 1792-byte pool slot for the version buffer and restores malloc',()=>{
 const {owner}=resourceSizeFixture();owner.processDllResourceSize('recorded-sharedbase-ansi-version-buffer');owner.processDllMemoryAdmin();const result=owner.processDllVersionMalloc();expect(result).toEqual({known:false,reason:'Original SharedBase version buffer initialized allocation pending at 1004c4f6 at 1004c4f6'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(stack.sharedDllResourceFrame!.buffer!.fields.bytes.length).toBe(1792);expect(stack.calls.find(call=>call.site==='1004c4f1')!.returned).toBe(true);expect(owner.snapshot().memoryHeapSectionHeld).toBe(false);const buffer=stack.sharedDllResourceFrame!.buffer!,slot=owner.snapshot().poolSlots.find(row=>row.fields===buffer.fields)!;expect(slot.capacity).toBe(1792);expect(slot.offset).toBe(16);expect(slot.region.bytes.length).toBe(0x70000);expect(slot.region.readUnsigned(8)).toBe(1);expect(slot.region.readUnsigned(0x6f910)).toBe(0xfffffffe);expect(owner.snapshot().initializerImages['102ffe9c']!.readUnsigned(0)).toBe(1);const calls=stack.calls.length;expect(owner.processDllVersionMalloc()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
});

function versionInfoFixture(input?:ReturnType<typeof stdioFixture>){const fixture=resourceSizeFixture(input),{owner}=fixture;owner.processDllResourceSize('recorded-sharedbase-ansi-version-buffer');owner.processDllMemoryAdmin();owner.processDllVersionMalloc();return fixture;}
it('fills the claimed version pool slot through the original info import and retains the language call',()=>{
 const {owner}=versionInfoFixture(),before=owner.snapshot().caseState!.stack!.snapshot().sharedDllResourceFrame!.buffer!,tail=before.fields.bytes.slice(before.offset+1740);const result=owner.processDllVersionInfo();expect(result).toEqual({known:false,reason:'Original SharedBase version language query pending at 10002d42'});const stack=owner.snapshot().caseState!.stack!.snapshot(),frame=stack.sharedDllResourceFrame!;expect(frame.infoFilled).toBe(true);expect(frame.buffer!.fields).toBe(before.fields);expect(frame.buffer!.fields.bytes.slice(frame.buffer!.offset,frame.buffer!.offset+1740)).toEqual(Uint8Array.from(Buffer.from(versionObservation.initialBufferBytes,'hex')));expect(frame.buffer!.fields.bytes.slice(frame.buffer!.offset+1740)).toEqual(tail);expect(stack.calls.find(call=>call.site==='1004c504')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c525');expect(stack.calls.at(-1)!.returned).toBe(false);expect(stack.trace).toContain('100d55dc.JMP dword ptr [0x102f98ec]');const calls=stack.calls.length;expect(owner.processDllVersionInfo()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(owner.snapshot().memoryHeapSectionHeld).toBe(false);
});
it('rejects a released version pool slot before the resource import changes its bytes',()=>{
 const {owner}=versionInfoFixture(),buffer=owner.snapshot().caseState!.stack!.snapshot().sharedDllResourceFrame!.buffer!,slot=owner.snapshot().poolSlots.find(row=>row.fields===buffer.fields)!;buffer.fields.writeUnsigned(0,170,1);slot.region.writeUnsigned(0x6f910,(slot.region.readUnsigned(0x6f910)|1)>>>0);expect(owner.processDllVersionInfo()).toEqual({known:false,reason:'Live original bitmap slot claim required'});expect(buffer.fields.readUnsigned(0,1)).toBe(170);expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllResourceFrame!.infoFilled).not.toBe(true);
});

it('rejects a reconstructed alias of a retained pool slot at the version API boundary',()=>{
 const {owner,platform}=versionInfoFixture(),buffer=owner.snapshot().caseState!.stack!.snapshot().sharedDllResourceFrame!.buffer!,alias=new NativeHeapObjectViews(buffer.fields.backing,buffer.fields.bytes.byteOffset-buffer.fields.backing.bytes.byteOffset,1792),service=NativeSharedVersionResource.forPlatform(platform,'recorded-sharedbase-ansi-version-buffer');expect(service.known).toBe(true);if(!service.known)throw new Error(service.reason);buffer.fields.writeUnsigned(0,170,1);expect(service.value.initialize('sharedbase.dll',0,1740,{fields:alias,offset:0})).toEqual({known:false,reason:'Canonical retained pool slot required for version resource access'});expect(buffer.fields.readUnsigned(0,1)).toBe(170);
});

it('retains the original language size frame and its distinct MemoryAdmin call',()=>{
 const {owner}=versionInfoFixture();owner.processDllVersionInfo();const result=owner.processDllLanguagePrefix();expect(result).toEqual({known:false,reason:'Original SharedBase language buffer MemoryAdmin pending at 10002aae'});let stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.sharedDllLanguageFrame!.handle.readUnsigned(0)).toBe(0);expect(stack.sharedDllLanguageFrame!.handle.backing).toBe(stack.sharedDllResourceFrame!.handle.backing);expect(stack.calls.find(call=>call.site==='1004c2d8')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c2eb');expect(stack.calls.at(-1)!.returned).toBe(false);const calls=stack.calls.length;expect(owner.processDllLanguagePrefix()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(owner.snapshot().trace).toContain('1004c2d8.GetFileVersionInfoSizeA');
 expect(owner.processDllLanguageMemoryAdmin()).toEqual({known:false,reason:'Original SharedBase language buffer Malloc pending at 10003cd8'});stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.calls.find(call=>call.site==='1004c2eb')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c2f2');expect(stack.calls.at(-1)!.returned).toBe(false);
});

it('allocates a distinct nested language slot and restores the original malloc frame',()=>{
 const {owner}=versionInfoFixture();owner.processDllVersionInfo();const outer=owner.snapshot().caseState!.stack!.snapshot().sharedDllResourceFrame!.buffer!,bytes=outer.fields.bytes.slice();owner.processDllLanguagePrefix();owner.processDllLanguageMemoryAdmin();const result=owner.processDllLanguageMalloc();expect(result).toEqual({known:false,reason:'Original SharedBase language buffer allocation ready at 1004c2f7'});const stack=owner.snapshot().caseState!.stack!.snapshot(),inner=stack.sharedDllLanguageFrame!.buffer!,slots=owner.snapshot().poolSlots.filter(row=>row.capacity===1792);expect(inner.fields).not.toBe(outer.fields);expect(inner.fields.backing).toBe(outer.fields.backing);expect(inner.fields.bytes.length).toBe(1792);expect(slots.map(row=>row.offset)).toEqual([16,1808]);expect(outer.fields.bytes).toEqual(bytes);expect(slots[0]!.region.readUnsigned(0x6f910)).toBe(0xfffffffc);expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(owner.snapshot().memoryHeapSectionHeld).toBe(false);expect(stack.calls.find(call=>call.site==='1004c2f2')!.returned).toBe(true);const calls=stack.calls.length;expect(owner.processDllLanguageMalloc()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
});

it('rejects changed language evidence before constructing its nested stack frame',()=>{
 const {owner}=versionInfoFixture();owner.processDllVersionInfo();const source=dllEntrySource.methods.find(item=>item.label==='dllVersionResourceLanguage')!,saved=source.bodyInstructionBytesSha256;try{source.bodyInstructionBytesSha256='00'.repeat(32);expect(owner.processDllLanguagePrefix()).toEqual({known:false,reason:'Original version language helper required'});expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().calls.at(-1)!.site).toBe('1004c525');}finally{source.bodyInstructionBytesSha256=saved;}
});
it('rejects a corrupted language return word before its filename argument is overwritten',()=>{
 const {owner}=versionInfoFixture();owner.processDllVersionInfo();const stack=owner.snapshot().caseState!.stack!.snapshot(),call=stack.calls.at(-1)!,fields=new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4);fields.writeUnsigned(0,0);const result=owner.processDllLanguagePrefix();expect(result.known).toBe(false);if(!result.known)expect(result.reason).toMatch(/expression slot|language return word/);expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().calls.at(-1)!.returned).toBe(false);
});

function languageInfoFixture(input?:ReturnType<typeof stdioFixture>){const fixture=versionInfoFixture(input),{owner}=fixture;owner.processDllVersionInfo();owner.processDllLanguagePrefix();owner.processDllLanguageMemoryAdmin();owner.processDllLanguageMalloc();return fixture;}
it('fills the original nested language slot independently of the outer version allocation',()=>{
 const {owner}=languageInfoFixture(),before=owner.snapshot().caseState!.stack!.snapshot(),outer=before.sharedDllResourceFrame!.buffer!,inner=before.sharedDllLanguageFrame!.buffer!,outerBytes=outer.fields.bytes.slice(),tail=inner.fields.bytes.slice(1740);const result=owner.processDllLanguageInfo();expect(result).toEqual({known:false,reason:'Original SharedBase translation query string pending at 1004c30e'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.sharedDllLanguageFrame!.infoFilled).toBe(true);expect(inner.fields.bytes.slice(0,1740)).toEqual(Uint8Array.from(Buffer.from(versionObservation.initialBufferBytes,'hex')));expect(inner.fields.bytes.slice(1740)).toEqual(tail);expect(outer.fields.bytes).toEqual(outerBytes);expect(stack.calls.find(call=>call.site==='1004c301')!.returned).toBe(true);expect(owner.snapshot().trace).toContain('1004c301.GetFileVersionInfoA');const calls=stack.calls.length;expect(owner.processDllLanguageInfo()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(owner.snapshot().memoryHeapSectionHeld).toBe(false);
});

it('rejects a released nested language slot before the second version info import writes bytes',()=>{
 const {owner}=languageInfoFixture(),inner=owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame!.buffer!,slot=owner.snapshot().poolSlots.find(row=>row.fields===inner.fields)!;inner.fields.writeUnsigned(0,170,1);slot.region.writeUnsigned(0x6f910,(slot.region.readUnsigned(0x6f910)|2)>>>0);expect(owner.processDllLanguageInfo()).toEqual({known:false,reason:'Live original bitmap slot claim required'});expect(inner.fields.readUnsigned(0,1)).toBe(170);expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame!.infoFilled).not.toBe(true);
});
it('rejects a damaged nested handle before the second version info import changes its buffer',()=>{
 const {owner}=languageInfoFixture(),frame=owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame!,inner=frame.buffer!;inner.fields.writeUnsigned(0,170,1);frame.handle.writeUnsigned(0,99);const result=owner.processDllLanguageInfo();expect(result.known).toBe(false);if(!result.known)expect(result.reason).toMatch(/expression slot|stack arguments/);expect(inner.fields.readUnsigned(0,1)).toBe(170);expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame!.infoFilled).not.toBe(true);
});


function languageFormatFixture(input?:ReturnType<typeof stdioFixture>){const fixture=languageInfoFixture(input);fixture.owner.processDllLanguageInfo();return fixture;}
it('builds the original sprintf stream and retains its actual output-engine call',()=>{
 const {owner}=languageFormatFixture(),before=owner.snapshot().caseState!.stack!.snapshot(),innerBytes=before.sharedDllLanguageFrame!.buffer!.fields.bytes.slice(),outerBytes=before.sharedDllResourceFrame!.buffer!.fields.bytes.slice();
 const result=owner.processDllLanguageFormatPrefix();expect(result).toEqual({known:false,reason:'Original SharedBase query output engine pending at 100b5355'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),frame=stack.sharedDllFormatFrame!,images=state.dllLanguageFormatImages!;
 expect(frame.output).toBe(images.output);expect(frame.format).toBe(images.translation);expect(frame.output.bytes).toEqual(new Uint8Array(256));expect(Buffer.from(frame.format.bytes).toString('ascii')).toBe('\\VarFileInfo\\Translation\0');
 expect(frame.stream.backing).toBe(stack.sharedDllLanguageFrame!.handle.backing);expect(frame.stream.readUnsigned(4)).toBe(0x7fffffff);expect(frame.stream.readUnsigned(12)).toBe(0x42);expect(frame.varargs).toBe(frame.ebp+16);expect(frame.entryEsp).toBe(frame.ebp+4);
 expect(stack.calls.find(call=>call.site==='1004c318')!.returned).toBe(false);expect(stack.calls.at(-1)!.site).toBe('100aa287');expect(stack.calls.at(-1)!.returned).toBe(false);
 expect(stack.trace).toContain('100aa275.LEA EAX,[EBP + -0x20]');expect(stack.sharedDllLanguageFrame!.buffer!.fields.bytes).toEqual(innerBytes);expect(stack.sharedDllResourceFrame!.buffer!.fields.bytes).toEqual(outerBytes);
 const calls=stack.calls.length;expect(owner.processDllLanguageFormatPrefix()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(state.memoryHeapSectionHeld).toBe(false);
});
it('rejects a changed sprintf body before creating its output images or stack frame',()=>{
 const {owner}=languageFormatFixture(),method=dllEntrySource.methods.find(item=>item.label==='versionQuerySprintf')!,saved=method.bodyInstructionBytesSha256;
 try{method.bodyInstructionBytesSha256='00'.repeat(32);expect(owner.processDllLanguageFormatPrefix()).toEqual({known:false,reason:'Original language query formatted-output helper required'});expect(owner.snapshot().dllLanguageFormatImages).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllFormatFrame).toBeNull();}finally{method.bodyInstructionBytesSha256=saved;}
});
it('rejects a released nested slot before entering the formatted-output helper',()=>{
 const {owner}=languageFormatFixture(),inner=owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame!.buffer!,slot=owner.snapshot().poolSlots.find(row=>row.fields===inner.fields)!;slot.region.writeUnsigned(0x6f910,(slot.region.readUnsigned(0x6f910)|2)>>>0);
 expect(owner.processDllLanguageFormatPrefix()).toEqual({known:false,reason:'Live original bitmap slot claim required'});expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllFormatFrame).toBeNull();expect(owner.snapshot().dllLanguageFormatImages!.output.bytes).toEqual(new Uint8Array(256));
});


it('executes the original output scanner and byte writer to produce the translation query',()=>{
 const {owner}=languageFormatFixture();owner.processDllLanguageFormatPrefix();const ptdFlags=owner.snapshot().ptd!.readUnsigned(0x70),before=owner.snapshot().caseState!.stack!.snapshot(),outer=before.sharedDllResourceFrame!.buffer!.fields.bytes.slice(),inner=before.sharedDllLanguageFrame!.buffer!.fields.bytes.slice();
 const result=owner.processDllLanguageOutput();expect(result).toEqual({known:false,reason:'Original SharedBase translation resource query pending at 100d55d6'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),frame=stack.sharedDllFormatFrame!;
 expect(Buffer.from(frame.output.bytes.slice(0,25)).toString('ascii')).toBe('\\VarFileInfo\\Translation\0');expect(frame.output.bytes.slice(25)).toEqual(new Uint8Array(231));expect(frame.stream.readUnsigned(4)).toBe(0x7fffffff-25);
 expect(stack.calls.find(call=>call.site==='100aa287')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='1004c318')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c330');expect(stack.calls.at(-1)!.returned).toBe(false);
 expect(state.ptd!.readUnsigned(0x70)).toBe(ptdFlags);expect(stack.trace).toContain('100b5289.sharedInitializer.TEST');expect(stack.trace).toContain('100b54f7.sharedInitializer.JMP');expect(stack.sharedDllResourceFrame!.buffer!.fields.bytes).toEqual(outer);expect(stack.sharedDllLanguageFrame!.buffer!.fields.bytes).toEqual(inner);
 const calls=stack.calls.length;expect(owner.processDllLanguageOutput()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(state.memoryHeapSectionHeld).toBe(false);
});


it('rejects changed format scanner bytes before the output engine writes the query',()=>{
 const {owner}=languageFormatFixture();owner.processDllLanguageFormatPrefix();const image=dllEntrySource.coldImages.find(i=>i.label==='formatStateTables')!,saved=image.bytes;
 try{image.bytes='00'.repeat(image.size);expect(owner.processDllLanguageOutput()).toEqual({known:false,reason:'Original output scanner image required'});expect(owner.snapshot().dllLanguageFormatImages!.output.bytes).toEqual(new Uint8Array(256));expect(owner.snapshot().caseState!.stack!.snapshot().calls.at(-1)!.site).toBe('100aa287');}finally{image.bytes=saved;}
});
it('rejects a damaged stream count before emitting any query bytes',()=>{
 const {owner}=languageFormatFixture();owner.processDllLanguageFormatPrefix();owner.snapshot().caseState!.stack!.snapshot().sharedDllFormatFrame!.stream.writeUnsigned(4,0);const result=owner.processDllLanguageOutput();expect(result.known).toBe(false);if(!result.known)expect(result.reason).toMatch(/expression slot|stream arguments/);expect(owner.snapshot().dllLanguageFormatImages!.output.bytes).toEqual(new Uint8Array(256));
});


function translationQueryFixture(input?:ReturnType<typeof stdioFixture>){const fixture=languageFormatFixture(input);fixture.owner.processDllLanguageFormatPrefix();fixture.owner.processDllLanguageOutput();return fixture;}
it('returns the translation alias through original stack outputs and builds real hexadecimal format arguments',()=>{
 const {owner}=translationQueryFixture(),before=owner.snapshot().caseState!.stack!.snapshot(),inner=before.sharedDllLanguageFrame!.buffer!,innerBytes=inner.fields.bytes.slice(),outerBytes=before.sharedDllResourceFrame!.buffer!.fields.bytes.slice();
 const result=owner.processDllTranslationQuery();expect(result).toEqual({known:false,reason:'Original SharedBase translated query formatter pending at 100aa234'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),translation=stack.sharedDllTranslationFrame!;
 expect(translation.pointer.fields).toBe(inner.fields);expect(translation.pointer.offset).toBe(inner.offset+864);expect(translation.length).toBe(4);expect(translation.query).toBe('\\VarFileInfo\\Translation');expect(inner.fields.readUnsigned(translation.pointer.offset)).toBe(0x04b00000);
 expect(stack.sharedDllLanguageFrame!.handle.readUnsigned(0)).toBe(4);expect(stack.sharedDllResourceFrame!.handle.readUnsigned(0)).toBe(0);expect(inner.fields.bytes).toEqual(innerBytes);expect(stack.sharedDllResourceFrame!.buffer!.fields.bytes).toEqual(outerBytes);
 expect(stack.calls.find(call=>call.site==='1004c330')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c36a');expect(stack.calls.at(-1)!.returned).toBe(false);
 const call=stack.calls.at(-1)!,args=new NativeHeapObjectViews(stack.sharedDllLanguageFrame!.handle.backing,call.position+12,16);expect([0,4,8,12].map(offset=>args.readUnsigned(offset))).toEqual([0,0,4,0xb0]);expect(state.trace).toContain('1004c330.VerQueryValueA');expect(stack.trace).toContain('100d55d6.JMP dword ptr [0x102f98f4]');
 const calls=stack.calls.length;expect(owner.processDllTranslationQuery()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
});
it('rejects a released translation buffer before publishing pointer or length outputs',()=>{
 const {owner}=translationQueryFixture(),inner=owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame!.buffer!,slot=owner.snapshot().poolSlots.find(row=>row.fields===inner.fields)!;slot.region.writeUnsigned(0x6f910,(slot.region.readUnsigned(0x6f910)|2)>>>0);expect(owner.processDllTranslationQuery()).toEqual({known:false,reason:'Live original bitmap slot claim required'});expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllTranslationFrame).toBeNull();expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllLanguageFrame!.handle.readUnsigned(0)).toBe(0);
});
it('rejects an altered translation query without completing the import or changing resource bytes',()=>{
 const {owner}=translationQueryFixture(),before=owner.snapshot().caseState!.stack!.snapshot(),inner=before.sharedDllLanguageFrame!.buffer!.fields,bytes=inner.bytes.slice();owner.snapshot().dllLanguageFormatImages!.output.writeUnsigned(0,88,1);expect(owner.processDllTranslationQuery()).toEqual({known:false,reason:'Recorded version query order required'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.sharedDllTranslationFrame).toBeNull();expect(stack.calls.at(-1)!.site).toBe('1004c330');expect(stack.calls.at(-1)!.returned).toBe(false);expect(inner.bytes).toEqual(bytes);expect(stack.sharedDllLanguageFrame!.handle.readUnsigned(0)).toBe(0);
});


it('uses the original unsigned divide and padding helpers to format the translated version query',()=>{
 const {owner}=translationQueryFixture();owner.processDllTranslationQuery();const before=owner.snapshot().caseState!.stack!.snapshot(),inner=before.sharedDllLanguageFrame!.buffer!.fields.bytes.slice(),outer=before.sharedDllResourceFrame!.buffer!.fields.bytes.slice(),flags=owner.snapshot().ptd!.readUnsigned(0x70);const result=owner.processDllTranslatedOutput();expect(result).toEqual({known:false,reason:'Original SharedBase FileVersion resource query pending at 100d55d6'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(Buffer.from(stack.sharedDllFormatFrame!.output.bytes).toString('ascii').split('\0')[0]).toBe('\\StringFileInfo\\000004B0\\FileVersion');expect(stack.calls.find(call=>call.site==='1004c36a')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c3a0');expect(stack.calls.at(-1)!.returned).toBe(false);expect(stack.trace).toContain('100cdfc3.sharedInitializer.DIV');expect(stack.trace).toContain('100b52c7.sharedInitializer.MOV');expect(stack.sharedDllLanguageFrame!.buffer!.fields.bytes).toEqual(inner);expect(stack.sharedDllResourceFrame!.buffer!.fields.bytes).toEqual(outer);expect(state.ptd!.readUnsigned(0x70)).toBe(flags);const calls=stack.calls.length;expect(owner.processDllTranslatedOutput()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
});


it('rejects changed unsigned divide evidence before overwriting the translation query',()=>{
 const {owner}=translationQueryFixture();owner.processDllTranslationQuery();const output=owner.snapshot().dllLanguageFormatImages!.output,bytes=output.bytes.slice(),method=dllEntrySource.methods.find(m=>m.label==='outputUnsignedDivide')!,saved=method.bodyInstructionBytesSha256;
 try{method.bodyInstructionBytesSha256='00'.repeat(32);expect(owner.processDllTranslatedOutput()).toEqual({known:false,reason:'Original hexadecimal output dependency required: outputUnsignedDivide'});expect(output.bytes).toEqual(bytes);expect(owner.snapshot().caseState!.stack!.snapshot().calls.at(-1)!.returned).toBe(false);}finally{method.bodyInstructionBytesSha256=saved;}
});


function fileVersionQueryFixture(input?:ReturnType<typeof stdioFixture>){const fixture=translationQueryFixture(input);fixture.owner.processDllTranslationQuery();fixture.owner.processDllTranslatedOutput();return fixture;}
it('returns the original FileVersion alias and copies its text through the actual pointer-difference loop',()=>{
 const {owner}=fileVersionQueryFixture(),before=owner.snapshot().caseState!.stack!.snapshot(),outer=before.sharedDllResourceFrame!.buffer!.fields.bytes.slice(),tail=before.sharedDllFormatFrame!.output.bytes.slice(17);
 const result=owner.processDllFileVersionQuery();expect(result).toEqual({known:false,reason:'Original SharedBase language buffer Free pending at 10002112'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),frame=stack.sharedDllFileVersionFrame!,inner=stack.sharedDllLanguageFrame!.buffer!;
 expect(frame.pointer.fields).toBe(inner.fields);expect(frame.pointer.offset).toBe(inner.offset+1200);expect(frame.length).toBe(17);expect(frame.query).toBe('\\StringFileInfo\\000004B0\\FileVersion');expect(Buffer.from(inner.fields.bytes.slice(frame.pointer.offset,frame.pointer.offset+17)).toString('ascii')).toBe('1, 60, 25931, 29\0');
 expect(Buffer.from(stack.sharedDllFormatFrame!.output.bytes.slice(0,17)).toString('ascii')).toBe('1, 60, 25931, 29\0');expect(stack.sharedDllFormatFrame!.output.bytes.slice(17)).toEqual(tail);expect(stack.sharedDllLanguageFrame!.handle.readUnsigned(0)).toBe(17);expect(stack.sharedDllResourceFrame!.buffer!.fields.bytes).toEqual(outer);
 expect(stack.calls.find(call=>call.site==='1004c3a0')!.returned).toBe(true);expect(stack.calls.find(call=>call.site==='1004c3e9')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c3f0');expect(stack.calls.at(-1)!.returned).toBe(false);expect(stack.trace.filter(row=>row==='1004c3c2.sharedInitializer.MOV')).toHaveLength(17);expect(state.trace).toContain('1004c3a0.VerQueryValueA');expect(state.memoryHeapSectionHeld).toBe(false);
 const calls=stack.calls.length;expect(owner.processDllFileVersionQuery()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('rejects a released FileVersion query slot before applying the ANSI resource mutations',()=>{
 const {owner}=fileVersionQueryFixture(),before=owner.snapshot().caseState!.stack!.snapshot(),inner=before.sharedDllLanguageFrame!.buffer!.fields,bytes=inner.bytes.slice(),output=before.sharedDllFormatFrame!.output.bytes.slice(),slot=owner.snapshot().poolSlots.find(row=>row.fields===inner)!;slot.region.writeUnsigned(0x6f910,(slot.region.readUnsigned(0x6f910)|2)>>>0);
 expect(owner.processDllFileVersionQuery()).toEqual({known:false,reason:'Live original bitmap slot claim required'});expect(inner.bytes).toEqual(bytes);expect(owner.snapshot().dllLanguageFormatImages!.output.bytes).toEqual(output);expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllFileVersionFrame).toBeNull();
},30_000);
it('rejects an altered FileVersion query before returning its pointer or copying text',()=>{
 const {owner}=fileVersionQueryFixture(),before=owner.snapshot().caseState!.stack!.snapshot(),inner=before.sharedDllLanguageFrame!.buffer!.fields,bytes=inner.bytes.slice();owner.snapshot().dllLanguageFormatImages!.output.writeUnsigned(0,88,1);
 expect(owner.processDllFileVersionQuery()).toEqual({known:false,reason:'Recorded version query order required'});expect(inner.bytes).toEqual(bytes);const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.sharedDllFileVersionFrame).toBeNull();expect(stack.calls.at(-1)!.site).toBe('1004c3a0');expect(stack.calls.at(-1)!.returned).toBe(false);expect(stack.sharedDllLanguageFrame!.handle.readUnsigned(0)).toBe(4);
},30_000);


it('enters original MemoryAdmin Free and selects the actual language pool descriptor',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();const result=owner.processDllLanguageFree();
 expect(result).toEqual({known:false,reason:'Original SharedBase language cleanup returned at 1004c3f5'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.memoryHeapSectionHeld).toBe(false);expect(stack.trace).toContain('1003c700.sharedInitializer.MOV');expect(stack.trace).toContain('10045638.sharedInitializer.BTS.LOCK');expect(state.poolSlots.some(row=>row.fields===stack.sharedDllLanguageFrame!.buffer!.fields)).toBe(false);
},30_000);


it('releases only the inner language slot and preserves the outer version buffer',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();const before=owner.snapshot(),stack=before.caseState!.stack!.snapshot(),inner=stack.sharedDllLanguageFrame!.buffer!,outer=stack.sharedDllResourceFrame!.buffer!,outerBytes=outer.fields.bytes.slice(),slot=before.poolSlots.find(row=>row.fields===inner.fields)!,poolLive=slot.region.readUnsigned(8),globalLive=before.initializerImages['102ffe9c']!.readUnsigned(0);
 owner.processDllLanguageFree();const after=owner.snapshot();expect(slot.region.readUnsigned(0x6f910)).toBe(0xfffffffe);expect(slot.region.readUnsigned(8)).toBe(poolLive-1);expect(after.initializerImages['102ffe9c']!.readUnsigned(0)).toBe(globalLive-1);expect(outer.fields.bytes).toEqual(outerBytes);expect(after.poolSlots.some(row=>row.fields===outer.fields)).toBe(true);expect(after.poolSlots.some(row=>row.fields===inner.fields)).toBe(false);expect(after.memoryHeapSectionHeld).toBe(false);
 const calls=after.caseState!.stack!.snapshot().calls.length;owner.processDllLanguageFree();expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('rejects an already released language bitmap before entering Free',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();const state=owner.snapshot(),inner=state.caseState!.stack!.snapshot().sharedDllLanguageFrame!.buffer!,slot=state.poolSlots.find(row=>row.fields===inner.fields)!;slot.region.writeUnsigned(0x6f910,(slot.region.readUnsigned(0x6f910)|2)>>>0);const calls=state.caseState!.stack!.snapshot().calls.length;const result=owner.processDllLanguageFree();expect(result.known).toBe(false);if(!result.known)expect(result.reason).toMatch(/bitmap slot claim/);expect(owner.snapshot().memoryHeapSectionHeld).toBe(false);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);


it('returns the original language helper and passes its real output into version parsing',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();const result=owner.processDllLanguageReturn();expect(result).toEqual({known:false,reason:'Original SharedBase version tokenizer pending at 100acd00'});const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(row=>row.site==='1004c525')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c42a');expect(stack.trace).toContain('1004c420.sharedInitializer.MOV');expect(Buffer.from(state.dllLanguageFormatImages!.output.bytes.slice(0,17)).toString('ascii')).toBe('1, 60, 25931, 29\0');expect(state.memoryHeapSectionHeld).toBe(false);
},30_000);


it('executes original strtok and retains the first version token in actual thread storage',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();const result=owner.processDllVersionToken();expect(result).toEqual({known:false,reason:'Original SharedBase first version integer conversion pending at 100a7942'});const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.dllLanguageFormatImages!.output.bytes[1]).toBe(0);expect(Buffer.from(state.dllLanguageFormatImages!.output.bytes.slice(2,17)).toString('ascii')).toBe(' 60, 25931, 29\0');expect(stack.calls.find(row=>row.site==='1004c42a')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004c43c');expect(stack.trace).toContain('100acda6.sharedInitializer.MOV');
},30_000);


it('rejects changed tokenizer evidence before modifying the version buffer',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();const before=owner.snapshot().dllLanguageFormatImages!.output.bytes.slice(),method=dllEntrySource.methods.find(row=>row.label==='versionStrtok')!,hash=method.bodyInstructionBytesSha256;try{method.bodyInstructionBytesSha256='00'.repeat(32);expect(owner.processDllVersionToken()).toEqual({known:false,reason:'Original version strtok source required'});expect(owner.snapshot().dllLanguageFormatImages!.output.bytes).toEqual(before);}finally{method.bodyInstructionBytesSha256=hash;}
},30_000);


it('executes original integer conversion and writes the first actual version output',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();const result=owner.processDllVersionInteger();expect(result).toEqual({known:false,reason:'Original SharedBase outer version buffer Free pending at 10002112'});const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.sharedDllInitializerFrame!.outputs.map(fields=>fields.readUnsigned(0))).toEqual([1,60,25931,29]);expect(stack.calls.find(row=>row.site==='1004c43c')!.returned).toBe(true);expect(stack.trace).toContain('100b4645.sharedInitializer.IMUL');
},30_000);


it('rejects changed integer parser evidence before publishing any version component',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();const method=dllEntrySource.methods.find(row=>row.label==='versionIntegerScanner')!,hash=method.bodyInstructionBytesSha256;try{method.bodyInstructionBytesSha256='00'.repeat(32);expect(owner.processDllVersionInteger()).toEqual({known:false,reason:'Original version integer parser source required'});expect(owner.snapshot().caseState!.stack!.snapshot().sharedDllInitializerFrame!.outputs.map(fields=>fields.readUnsigned(0))).toEqual([0,0,0,0]);}finally{method.bodyInstructionBytesSha256=hash;}
},30_000);


it('releases the outer version buffer and returns the original query to DLL initialization',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();const result=owner.processDllVersionFree();expect(result).toEqual({known:false,reason:'Original SharedBase DLL separator logging pending at 1000840e'});const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.sharedDllInitializerFrame!.outputs.map(fields=>fields.readUnsigned(0))).toEqual([1,60,25931,29]);expect(stack.calls.find(row=>row.site==='100a15c1')!.returned).toBe(true);expect(state.memoryHeapSectionHeld).toBe(false);
},30_000);


it('releases both version slots while retaining parsed output and the pool region',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();const original=owner.snapshot(),originalStack=original.caseState!.stack!.snapshot(),outer=originalStack.sharedDllResourceFrame!.buffer!,inner=originalStack.sharedDllLanguageFrame!.buffer!,region=original.poolSlots.find(row=>row.fields===outer.fields)!.region,count=region.readUnsigned(8);owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();const state=owner.snapshot();expect(region.readUnsigned(0x6f910)).toBe(0xffffffff);expect(region.readUnsigned(8)).toBe(count-2);expect(state.poolSlots.some(row=>row.fields===inner.fields||row.fields===outer.fields)).toBe(false);expect(state.poolRegions.includes(region)).toBe(true);expect(state.memoryHeapSectionHeld).toBe(false);const calls=state.caseState!.stack!.snapshot().calls.length;owner.processDllVersionFree();expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);


it('enters the original separator logger and retains MessageAdmin construction at its actual import',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();const result=owner.processDllSeparatorPrefix();expect(result).toEqual({known:false,reason:'Original SharedBase MessageAdmin critical-section initialization pending at 10049775'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.trace).toContain('10049769.sharedInitializer.OR');expect(stack.calls.at(-1)!.site).toBe('10049775');expect(stack.calls.at(-1)!.returned).toBe(false);expect(stack.sharedDllInitializerFrame!.outputs.map(fields=>fields.readUnsigned(0))).toEqual([1,60,25931,29]);
},30_000);


it('initializes the actual MessageAdmin section and enters its original holder construction',()=>{
 const {owner,platform}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();const result=owner.processDllMessageCreate();expect(result).toEqual({known:false,reason:'Original SharedBase MessageAdmin holder allocation pending at 100010e1'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.calls.find(row=>row.site==='10049775')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('10049612');expect(stack.trace).toContain('10049605.sharedInitializer.MOV');expect(platform.snapshot().physicalSections.some(row=>row.position===4&&row.spinCount===null)).toBe(true);
},30_000);


it('allocates the MessageAdmin holder through the actual common Malloc and bitmap pool',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();const old=new Set(owner.snapshot().poolSlots.map(row=>row.fields));const result=owner.processDllMessageHolder();expect(result).toEqual({known:false,reason:'Original SharedBase MessageAdmin ErrorAdmin initialization pending at 10006c1c'});const state=owner.snapshot(),slots=state.poolSlots.filter(row=>!old.has(row.fields));expect(slots).toHaveLength(1);expect(slots[0]!.capacity).toBe(12);expect(slots[0]!.offset).toBe(16);expect(slots[0]!.region.bytes.length).toBe(0xc2000);expect(slots[0]!.region.readUnsigned(8)).toBe(1);expect(slots[0]!.region.readUnsigned(0xbfff8)).toBe(0xfffffffe);expect(slots[0]!.region.readUnsigned(0xc1ff4)).toBe(0x3fffffff);expect(state.initializerImages['102ffd4c']!.readUnsigned(0)).toBe(1);expect(slots[0]!.fields.bytes.length).toBe(12);expect(slots[0]!.fields.bytes.slice(0,12)).toEqual(new Uint8Array(12));expect(state.memoryHeapSectionHeld).toBe(false);expect(state.caseState!.stack!.snapshot().calls.find(row=>row.site==='10020c8a')!.returned).toBe(true);
},30_000);

it('executes the original ErrorAdmin getter and initializes its own physical section',()=>{
 const {owner,platform}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();const before=platform.snapshot().physicalSections.length,result=owner.processDllMessageErrorGet();expect(result).toEqual({known:false,reason:'Original SharedBase ErrorAdmin construction pending at 10001db1'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.calls.find(row=>row.site==='10021978')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('100219a3');expect(platform.snapshot().physicalSections).toHaveLength(before+1);expect(platform.snapshot().physicalSections.some(row=>row.position===8&&row.spinCount===null)).toBe(true);expect(stack.trace).toContain('1002196d.sharedInitializer.OR');expect(stack.trace).toContain('10021999.sharedInitializer.MOV');const count=stack.calls.length;expect(owner.processDllMessageErrorGet()).toEqual(result);expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(count);
},30_000);

it('executes ErrorAdmin cold invalidation and allocates its original buffer holder',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();const result=owner.processDllMessageErrorCreate();expect(result).toEqual({known:false,reason:'Original SharedBase ErrorAdmin buffer allocation pending at 10004133'});const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.calls.find(row=>row.site==='10022765')!.returned).toBe(true);expect(stack.calls.find(row=>row.site==='1002274b')!.returned).toBe(true);expect(stack.calls.find(row=>row.site==='1002277f')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('100227a8');
},30_000);

it('allocates the original ErrorAdmin buffer through the variable-size pool and returns its frame',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();const result=owner.processDllMessageErrorBuffer();expect(result).toEqual({known:false,reason:'Original SharedBase ErrorAdmin callback registration pending at 10007cac'});const state=owner.snapshot(),slot=state.variablePoolSlots[0]!;expect(state.variablePoolSlots).toHaveLength(1);expect(slot.offset).toBe(16);expect(slot.capacity).toBe(13296);expect(slot.region.bytes.length).toBe(0x400000);expect(slot.region.readUnsigned(8)).toBe(13);expect(slot.region.readUnsigned(12)).toBe(1);expect(slot.region.readUnsigned(0x3408)).toBe(4083);expect(slot.region.readUnsigned(0x340c)).toBe(0);expect(state.memoryHeapSectionHeld).toBe(false);const stack=state.caseState!.stack!.snapshot();expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});expect(stack.calls.find(row=>row.site==='100227a8')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('10022814');
},30_000);

it('registers the original ErrorAdmin callback using its real handler array and returns the constructor',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();const result=owner.processDllMessageErrorRegister();expect(result).toEqual({known:false,reason:'Original SharedBase ErrorAdmin termination registration pending at 100a72d0'});const state=owner.snapshot(),slot=state.poolSlots.find(row=>row.capacity===112)!;expect(slot).toBeDefined();expect(slot.offset).toBe(16);expect(slot.region.bytes.length).toBe(0x700000);expect(slot.region.readUnsigned(0x6fdfb0)).toBe(0xfffffffe);expect(slot.fields.readUnsigned(0)).toBe(0x10002df6);expect(slot.fields.readUnsigned(8)).toBe(1);expect(slot.fields.bytes.slice(12,108)).toEqual(new Uint8Array(96));expect(state.memoryHeapSectionHeld).toBe(false);const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(row=>row.site==='10022814')!.returned).toBe(true);expect(stack.calls.find(row=>row.site==='100219a3')!.returned).toBe(true);expect(stack.calls.find(row=>row.site==='10049dd2')!.returned).toBe(true);expect(stack.memoryMallocFrame).toEqual({entered:true,returned:true});
},30_000);

it('registers the original ErrorAdmin shutdown and returns to MessageAdmin before SpyAdmin',()=>{
 const {owner,platform}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();const result=owner.processDllMessageErrorTerminate();expect(result).toEqual({known:false,reason:'Original SharedBase SpyAdmin getter pending at 10008b11'});const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(row=>row.site==='100219ad')!.returned).toBe(true);expect(stack.calls.find(row=>row.site==='10049794')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('10049799');expect(state.exitLockHeld).toBe(false);expect(stack.trace.some(row=>row.startsWith('100e2770.'))).toBe(false);const decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');if(!decoder.known)throw new Error(decoder.reason);const decodedEnd=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);if(!decodedEnd.known)throw new Error(decodedEnd.reason);const cursor=decodedEnd.value as {fields:NativeHeapObjectViews;offset:number};expect(cursor.offset).toBe(76);const callback=decoder.value.invoke(cursor.fields.pointer(72).get()!);if(!callback.known)throw new Error(callback.reason);expect((callback.value as {originalCodeAddress:number}).originalCodeAddress).toBe(0x100e2770);
},30_000);

it('executes the original SpyAdmin cold getter through its owned section and constructor call',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();expect(owner.processDllMessageSpyGet()).toEqual({known:false,reason:'Original SharedBase SpyAdmin construction pending at 100089e5'});const state=owner.snapshot();const images=state.dllFormatImages;expect(images['101ab144']!.readUnsigned(0)).toBe(1);expect(images['101ab11c']!.readUnsigned(24)).toBe(0);expect(images['101ab11c']!.readUnsigned(28)).toBe(0);const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(row=>row.site==='1004b498')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('1004b4af');expect(owner.processDllMessageSpyGet()).toEqual({known:false,reason:'Original SharedBase SpyAdmin construction pending at 100089e5'});
},30_000);

it('executes SpyAdmin handler registration and the declared empty diagnostic window query',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();expect(owner.processDllMessageSpyCreate()).toEqual({known:false,reason:'Original SharedBase SpyAdmin termination registration pending at 100a72d0'});const state=owner.snapshot();expect(state.dllFormatImages['101ab11c']!.readUnsigned(24)).toBe(0);expect(state.caseState!.stack!.snapshot().calls.find(row=>row.site==='1004b83d')!.returned).toBe(true);expect(state.trace).toContain('1004b83d.FindWindowA');const holderPointer=state.dllFormatImages['10197d6c']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(holderPointer.offset).toBe(0);const holder=holderPointer.fields;expect(holder.readUnsigned(4)).toBe(2);expect(holder.readUnsigned(8)).toBe(9);const recordsPointer=holder.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(recordsPointer.offset).toBe(0);const records=recordsPointer.fields;expect(records.readUnsigned(0)).toBe(0x10002df6);expect(records.readUnsigned(12)).toBe(0x10008c06);const context=records.pointer<{fields:NativeHeapObjectViews;offset:number}>(16).get()!;expect(context.fields).toBe(state.dllFormatImages['101ab11c']);expect(context.offset).toBe(0);expect(owner.processDllMessageSpyTerminate()).toEqual({known:false,reason:'Original SharedBase SpieAdmin getter pending at 10001334'});expect(owner.snapshot().caseState!.stack!.snapshot().calls.find(row=>row.site==='1004b4b9')!.returned).toBe(true);expect(owner.snapshot().caseState!.stack!.snapshot().trace.some(row=>row.startsWith('100e2890.'))).toBe(false);expect(records.readUnsigned(20)).toBe(1);
},30_000);

it('retains a selected non-NULL zSpy window and follows the original positive branch',()=>{const window=Object.freeze({});
 const {owner}=fileVersionQueryFixture(stdioFixture(0,new NativeRuntimeDiagnostics({windows:new Map([['[zSpy]',window]])})));owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();const result=owner.processDllMessageSpyCreate();expect(result.known).toBe(false);if(result.known)throw new Error('Unimplemented diagnostic message API should remain pending');expect(result.reason).toContain('1004b855');expect(owner.snapshot().dllFormatImages['101ab11c']!.pointer(24).get()).toBe(window);const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.trace.some(row=>row.startsWith('1004b8cc.'))).toBe(false);expect(stack.calls.find(row=>row.site==='1004b83d')!.returned).toBe(true);},30_000);

it('executes SpieAdmin construction and original fopen validation on the retained CRT stack',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();expect(owner.processDllMessageSpieStartup()).toEqual({known:false,reason:'Original SharedBase CRT stream acquisition pending at 100bfd6f'});const state=owner.snapshot();expect(state.dllFormatImages['10197de4']!.readUnsigned(0)).toBe(1);expect(state.dllFormatImages['10197dc0']!.readUnsigned(24)).toBe(0xffffffff);const stack=state.caseState!.stack!.snapshot();expect(stack.calls.find(row=>row.site==='1004afa8')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('100acc23');expect(stack.trace.some(row=>row.startsWith('100acbe7.sharedInitializer.SETNZ'))).toBe(true);expect(stack.trace.some(row=>row.startsWith('100acc1c.sharedInitializer.SETNZ'))).toBe(true);expect(owner.processDllSpieAcquireStream()).toEqual({known:false,reason:'Original SharedBase CRT shared file-open pending at 100d1a2d'});const after=owner.snapshot();expect(after.crtHeldSectionIds).toEqual([19]);const files=after.initializerImages['10141790']!;expect(files.readUnsigned(96+12)).toBe(0x8000);expect(files.readUnsigned(96+16)).toBe(0xffffffff);expect(after.dllFormatImages['102f6ad4']!.readUnsigned(0)).toBe(0);const resumed=after.caseState!.stack!.snapshot();expect(resumed.calls.find(row=>row.site==='100acc23')!.returned).toBe(true);expect(resumed.calls.at(-1)!.site).toBe('100bfd3a');},30_000);

it('rejects a corrupted fopen-to-stream return word before claiming a FILE slot',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();const before=owner.snapshot(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;const fields=new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4);fields.writeUnsigned(0,0);const result=owner.processDllSpieAcquireStream();expect(result.known).toBe(false);if(result.known)throw new Error('Corrupted stream call should be rejected');expect(result.reason).toMatch(/stream acquisition frame|expression slot/);expect(owner.snapshot().crtHeldSectionIds).toEqual([]);expect(before.initializerImages['10141790']!.readUnsigned(96+12)).toBe(0);expect(owner.imageStorage('lockTable').pointer(19*8).get()).toBe(null);},30_000);


it('executes original CRT shared file-open validation and flags before descriptor allocation',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();owner.processDllSpieAcquireStream();
 expect(owner.processDllSpieSharedOpen()).toEqual({known:false,reason:'Original SharedBase CRT descriptor allocation pending at 100d0d8d'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();
 expect(state.crtHeldSectionIds).toEqual([19]);expect(state.initializerImages['10141790']!.readUnsigned(96+16)).toBe(0xffffffff);
 expect(stack.calls.find(row=>row.site==='100d115f')!.returned).toBe(true);
 expect(stack.calls.find(row=>row.site==='100d117a')!.returned).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('100d1329');
 expect(state.dllFormatImages['102f642c']).toBe(owner.imageStorage('osFields'));
 const ebp=(stack.registers.EBP as {word:{provenance:{kind:string;offset:number}}}).word.provenance;
 expect(ebp.kind).toBe('stack');
 const locals=new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,ebp.offset-0x34,0x34);
 expect(locals.readUnsigned(0x34-8)).toBe(0x80000000);
 expect(locals.readUnsigned(0x34-0x10)).toBe(3);
 expect(locals.readUnsigned(0x34-0x14)).toBe(3);
 expect(locals.readUnsigned(0x34-0xc)).toBe(0x80);
 expect(stack.trace.some(row=>row.startsWith('100d1949.sharedInitializer.SETNZ'))).toBe(true);
 expect(stack.trace.some(row=>row.startsWith('100d12bf.'))).toBe(true);
},30_000);


it('rejects a damaged shared file-open return word without reserving a descriptor',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();owner.processDllSpieAcquireStream();
 const before=owner.snapshot(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
 const result=owner.processDllSpieSharedOpen();expect(result.known).toBe(false);
 if(result.known)throw new Error('Damaged shared-open return must be rejected');
 expect(result.reason).toMatch(/shared file-open frame|expression slot/);
 expect(owner.snapshot().crtHeldSectionIds).toEqual([19]);
 expect(owner.snapshot().caseState!.stack!.snapshot().calls.some(row=>row.site==='100d1329')).toBe(false);
 expect(before.initializerImages['10141790']!.readUnsigned(96+16)).toBe(0xffffffff);
},30_000);


it('executes original descriptor scanning and locks before initializing its owned section',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();owner.processDllSpieAcquireStream();
owner.processDllSpieSharedOpen();
 expect(owner.processDllSpieAllocateDescriptor()).toEqual({known:false,reason:'Original SharedBase descriptor section initialization pending at 100bbf27'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),block=state.ioBlock!;
 expect(state.crtHeldSectionIds.toSorted()).toEqual([10,11,19]);
 expect(block.readUnsigned(168)).toBe(0xffffffff);expect(block.readUnsigned(172,1)).toBe(0);expect(block.readUnsigned(176)).toBe(0);
 expect(stack.calls.find(row=>row.site==='100d0da4')!.returned).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('100d0e1c');
 expect(state.initializerImages['10141790']!.readUnsigned(96+16)).toBe(0xffffffff);
},30_000);


it('rejects a damaged descriptor allocator return word before constructing lock eleven',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();owner.processDllSpieAcquireStream();
owner.processDllSpieSharedOpen();

 const before=owner.snapshot(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
 const result=owner.processDllSpieAllocateDescriptor();expect(result.known).toBe(false);
 if(result.known)throw new Error('Damaged descriptor allocator call must be rejected');
 expect(result.reason).toMatch(/descriptor allocation frame|expression slot/);
 expect(owner.snapshot().crtHeldSectionIds).toEqual([19]);
 expect(owner.imageStorage('lockTable').pointer(11*8).get()).toBe(null);
 expect(before.ioBlock!.readUnsigned(172,1)).toBe(0);expect(before.ioBlock!.readUnsigned(176)).toBe(0);
},30_000);


it('executes the original cached descriptor section initializer and returns to CreateFileA',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();owner.processDllSpieAcquireStream();
owner.processDllSpieSharedOpen();
owner.processDllSpieAllocateDescriptor();
 expect(owner.processDllSpieInitDescriptorSection()).toEqual({known:false,reason:'Original SharedBase CreateFileA return pending at 100d1372'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),block=state.ioBlock!;
 expect(state.crtHeldSectionIds).toEqual([19]);expect(state.descriptorHeldSectionOffsets).toEqual([180]);
 expect(block.readUnsigned(168)).toBe(0xffffffff);expect(block.readUnsigned(172,1)).toBe(1);expect(block.readUnsigned(176)).toBe(1);
 expect(stack.calls.find(row=>row.site==='100bbfa6')!.returned).toBe(true);
 expect(stack.calls.find(row=>row.site==='100d0e1c')!.returned).toBe(true);
 expect(stack.calls.find(row=>row.site==='100d1329')!.returned).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('100d1372');
 const call=stack.calls.at(-1)!,argumentsView=new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,32);
 expect(argumentsView.readUnsigned(8)).toBe(0x80000000);expect(argumentsView.readUnsigned(12)).toBe(3);
 expect(argumentsView.readUnsigned(20)).toBe(3);expect(argumentsView.readUnsigned(24)).toBe(0x80);expect(argumentsView.readUnsigned(28)).toBe(0);
 const ebp=(stack.registers.EBP as {word:{provenance:{offset:number}}}).word.provenance.offset;
 const security=new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,ebp-0x34,12);
 expect(security.readUnsigned(0)).toBe(12);expect(security.readUnsigned(4)).toBe(0);expect(security.readUnsigned(8)).toBe(1);
 expect(stack.trace.some(row=>row.startsWith('100d0e83.sharedInitializer.IDIV'))).toBe(true);
 expect(state.initializerImages['10141790']!.readUnsigned(96+16)).toBe(0xffffffff);
},30_000);


it('executes the original descriptor fallback initializer when the spin procedure is absent',()=>{
 const {owner}=fileVersionQueryFixture(stdioFixture(0,undefined,false));owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();owner.processDllSpieAcquireStream();
owner.processDllSpieSharedOpen();
owner.processDllSpieAllocateDescriptor();

 expect(owner.processDllSpieInitDescriptorSection()).toEqual({known:false,reason:'Original SharedBase CreateFileA return pending at 100d1372'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();
 expect(state.trace).toContain('100bbf1b.InitializeCriticalSection');
 expect(stack.calls.find(row=>row.site==='100bbf1b')!.returned).toBe(true);
 expect(state.crtHeldSectionIds).toEqual([19]);expect(state.descriptorHeldSectionOffsets).toEqual([180]);
 expect(state.ioBlock!.readUnsigned(172,1)).toBe(1);expect(state.ioBlock!.readUnsigned(176)).toBe(1);
},30_000);

it('rejects a foreign section cache before initializing descriptor storage',()=>{
 const {owner}=fileVersionQueryFixture();owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();owner.processDllSpieAcquireStream();
owner.processDllSpieSharedOpen();
owner.processDllSpieAllocateDescriptor();

 const before=owner.snapshot();owner.imageStorage('pointer6ac0').pointer<object>(0).set(Object.freeze({}));
 const result=owner.processDllSpieInitDescriptorSection();expect(result.known).toBe(false);
 if(result.known)throw new Error('Foreign section cache must be rejected');
 expect(result.reason).toContain('same-platform descriptor initializer cache');
 expect(owner.snapshot().crtHeldSectionIds.toSorted()).toEqual([10,11,19]);expect(owner.snapshot().descriptorHeldSectionOffsets).toEqual([]);
 expect(before.ioBlock!.readUnsigned(172,1)).toBe(0);expect(before.ioBlock!.readUnsigned(176)).toBe(0);
},30_000);

function originalFileOpenFixture(fileSystem?:NativeWin32FileSystemSelection){
 const {owner,platform}=fileVersionQueryFixture(stdioFixture(0,undefined,undefined,fileSystem));owner.processDllFileVersionQuery();owner.processDllLanguageFree();owner.processDllLanguageReturn();owner.processDllVersionToken();owner.processDllVersionInteger();owner.processDllVersionFree();owner.processDllSeparatorPrefix();owner.processDllMessageCreate();owner.processDllMessageHolder();owner.processDllMessageErrorGet();owner.processDllMessageErrorCreate();owner.processDllMessageErrorBuffer();owner.processDllMessageErrorRegister();owner.processDllMessageErrorTerminate();owner.processDllMessageSpyGet();owner.processDllMessageSpyCreate();owner.processDllMessageSpyTerminate();owner.processDllMessageSpieStartup();owner.processDllSpieAcquireStream();
owner.processDllSpieSharedOpen();
owner.processDllSpieAllocateDescriptor();

 owner.processDllSpieInitDescriptorSection();return {owner,platform};
}

function originalVersionLogFixture(){
 const fixture=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]}),{owner}=fixture;
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();owner.processDllErrorLogInsertion();owner.processDllSpyLogCallback();
 return fixture;
}
it.each([0,4])('rejects damaged final separator frame at +%s before the third logger submission',displacement=>{
  const {owner}=originalVersionLogFixture();owner.processDllVersionLogTls();owner.processDllVersionLogFormatting();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();owner.processDllErrorLogInsertion();owner.processDllSpyLogCallback();
  const before=owner.snapshot(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
  new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position+displacement,4).writeUnsigned(0,0);
  const result=owner.processDllSeparatorPrefix();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged final separator accepted');expect(result.reason).toMatch(/original DLL separator frame|expression slot/);
  const after=owner.snapshot();expect(after.messageSectionHeld).toBe(false);expect(after.dllEntryReturned).toBeNull();expect(after.trace.filter(row=>row==='10049528.EnterCriticalSection')).toHaveLength(2);
},30_000);
it('returns from original direct SharedBase DLL entry after its final separator',()=>{
 const {owner}=originalVersionLogFixture();owner.processDllVersionLogTls();owner.processDllVersionLogFormatting();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();owner.processDllErrorLogInsertion();owner.processDllSpyLogCallback();
 expect(owner.processDllSeparatorPrefix()).toEqual({known:false,reason:'Original SharedBase MessageAdmin initialization log pending at 1004980f'});
 owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();owner.processDllErrorLogInsertion();
 expect(owner.processDllSpyLogCallback()).toEqual({known:true,value:1});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();
 expect(state.dllEntryReturned).toBe(1);expect(state.dllEntryExecuted).toBe(true);expect(state.dllEntryBoundary).toBeNull();expect(state.wholeCrtTraversalCompleted).toBe(false);expect(state.messageSectionHeld).toBe(false);
 expect(stack.phase).toBe('returned');expect(stack.boundary).toBeNull();
 for(const site of ['100a15fc','100a1645','100adc8c'])expect(stack.calls.findLast(row=>row.site===site)!.returned).toBe(true);
 expect(stack.trace).toContain('100a1607.sharedInitializer.RET');expect(stack.trace).toContain('100a164f.sharedInitializer.RET');
 expect(stack.trace.some(row=>row.startsWith('100adc91.sharedInitializer.'))).toBe(false);
 const ring=state.dllFormatImages['10142a58']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(32).get()!.fields;expect(ring.readUnsigned(12)).toBe(3);
 expect(state.trace.filter(row=>row==='1004956b.LeaveCriticalSection')).toHaveLength(3);
 const calls=stack.calls.length;expect(owner.processDllEntryPrefix()).toEqual({known:true,value:1});expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('dispatches the actual version message and returns through original callback cleanup',()=>{
 const {owner}=originalVersionLogFixture(),format=owner.snapshot().dllFormatImages['100e7104']!;owner.processDllVersionLogTls();owner.processDllVersionLogFormatting();
 expect(owner.processDllMessageLog()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log callback pending at 100494db'});
 expect(owner.snapshot().messageSectionHeld).toBe(true);
 owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();
 const temporary=owner.snapshot().caseState!.stack!.snapshot().sharedDllFormatFrame!.output;
 expect(owner.processDllErrorLogInsertion()).toEqual({known:false,reason:'Original SharedBase SpyAdmin log callback pending at 100494db'});
 expect(owner.processDllSpyLogCallback()).toEqual({known:false,reason:'Original SharedBase final separator log pending at 100a15fc'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),ringPointer=state.dllFormatImages['10142a58']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(32).get()!,ring=ringPointer.fields;
 expect(state.messageSectionHeld).toBe(false);expect(state.trace.filter(row=>row==='1004956b.LeaveCriticalSection')).toHaveLength(2);
 expect(state.dllFormatImages['100e7104']).toBe(format);expect(temporary.backing.freed).toBe(true);
 expect(ring.readUnsigned(8)).toBe(0);expect(ring.readUnsigned(12)).toBe(2);
 const records=ring.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields;
 const first=new TextDecoder().decode(records.bytes.slice(0,250)).split('\0')[0]!,second=new TextDecoder().decode(records.bytes.slice(250,500)).split('\0')[0]!;
 expect(first.startsWith('-'.repeat(75))).toBe(true);
 expect(second).toBe("Gothic3 (RELEASE) Sharedbase:  Compileversion: 1.60.25931  (Rev. 29), Z:#472 -> '.\\kernel\\ge_message.cpp'");
 for(const site of ['10049871','10049894','100494db','1004956b','100a15ed'])expect(stack.calls.findLast(row=>row.site===site)!.returned).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('100a15fc');expect(stack.calls.at(-1)!.returned).toBe(false);
 const count=stack.calls.length;expect(owner.processDllMessageLog()).toEqual({known:false,reason:'Original SharedBase final separator log pending at 100a15fc'});expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(count);
},30_000);
it('rejects a changed retained ErrorAdmin format on the second message',()=>{
 const {owner}=originalVersionLogFixture();owner.processDllVersionLogTls();owner.processDllVersionLogFormatting();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();
 const state=owner.snapshot(),format=state.dllFormatImages['100e7104']!,ring=state.dllFormatImages['10142a58']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(32).get()!.fields;
 format.writeUnsigned(0,0x41,1);
 expect(owner.processDllErrorLogFormatting()).toEqual({known:false,reason:'Actual retained original ErrorAdmin format bytes required'});
 expect(owner.snapshot().messageSectionHeld).toBe(true);expect(ring.readUnsigned(12)).toBe(1);expect(owner.snapshot().dllFormatImages['100e7104']).toBe(format);expect(format.readUnsigned(0,1)).toBe(0x41);
},30_000);
it('rejects damaged version submission frames before entering MessageAdmin section',()=>{
 for(const displacement of [0,8]){
  const {owner}=originalVersionLogFixture();owner.processDllVersionLogTls();owner.processDllVersionLogFormatting();
  const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
  new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position+displacement,4).writeUnsigned(0,0);
  const result=owner.processDllMessageLog();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged version submission accepted');expect(result.reason).toMatch(/logger submission frame|version log TLS message|expression slot/);
  expect(owner.snapshot().messageSectionHeld).toBe(false);expect(owner.snapshot().trace.filter(row=>row==='10049528.EnterCriticalSection')).toHaveLength(1);
 }
},30_000);
it('executes original DLL version formatting into the actual TLS buffer',()=>{
 const {owner,platform}=originalVersionLogFixture();owner.processDllVersionLogTls();
 const selected=NativeSharedStaticTls.forPlatform(platform);if(!selected.known)throw new Error(selected.reason);
 const buffer=selected.value.debugBuffer();if(!buffer.known)throw new Error(buffer.reason);
 expect(owner.processDllVersionLogFormatting()).toEqual({known:false,reason:'Original SharedBase version MessageAdmin log pending at 10049894'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();
 const text=new TextDecoder().decode(buffer.value.bytes).split('\0')[0]!;
 expect(stack.sharedDllInitializerFrame!.outputs.map(fields=>fields.readUnsigned(0))).toEqual([1,60,25931,29]);
 expect(text).toBe('Gothic3 (RELEASE) Sharedbase:  Compileversion: 1.60.25931  (Rev. 29)');
 expect(buffer.value.knownMask.slice(0,text.length+1).every(mask=>mask===255)).toBe(true);
 expect(state.messageSectionHeld).toBe(false);expect(stack.calls.findLast(row=>row.site==='10049871')!.returned).toBe(true);expect(stack.calls.findLast(row=>row.site==='100a7eff')!.returned).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('10049894');expect(stack.calls.at(-1)!.returned).toBe(false);
},30_000);
it.each([0,4,8])('rejects damaged version formatter arguments at +%i before changing the TLS buffer',displacement=>{
  const {owner,platform}=originalVersionLogFixture();owner.processDllVersionLogTls();
  const selected=NativeSharedStaticTls.forPlatform(platform);if(!selected.known)throw new Error(selected.reason);const buffer=selected.value.debugBuffer();if(!buffer.known)throw new Error(buffer.reason);
  const bytes=buffer.value.bytes.slice(),state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
  new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position+displacement,4).writeUnsigned(0,0);
  const result=owner.processDllVersionLogFormatting();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged formatter accepted');expect(result.reason).toMatch(/version formatter return frame|expression slot/);
  expect(buffer.value.bytes).toEqual(bytes);expect(owner.snapshot().messageSectionHeld).toBe(false);expect(owner.snapshot().caseState!.stack!.snapshot().trace.some(row=>row.startsWith('100a7eab.'))).toBe(false);
},30_000);
it('executes original version logger TLS reads and retains its formatter frame',()=>{
 const {owner,platform}=originalVersionLogFixture();
 const selected=NativeSharedStaticTls.forPlatform(platform);if(!selected.known)throw new Error(selected.reason);const loaded=selected.value.loadSharedBase();if(!loaded.known)throw new Error(loaded.reason);const buffer=selected.value.debugBuffer();if(!buffer.known)throw new Error(buffer.reason);buffer.value.writeUnsigned(0,0x61,1);
 expect(owner.processDllVersionLogTls()).toEqual({known:false,reason:'Original SharedBase DLL version formatting pending at 10049871'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();
 expect(state.messageSectionHeld).toBe(false);
 for(const address of ['10049850','10049857','1004985c','10049860'])expect(stack.trace.some(row=>row.startsWith(address+'.'))).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('10049871');expect(stack.calls.at(-1)!.returned).toBe(false);
 expect(buffer.value.readUnsigned(0,1)).toBe(0x61);expect(selected.value.snapshot().virtualLoaderSlot).toBe(0);
 const count=stack.calls.length;expect(owner.processDllVersionLogTls()).toEqual({known:false,reason:'Original SharedBase DLL version formatting pending at 10049871'});expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(count);
},30_000);
it('rejects a damaged original version logger return before TLS access',()=>{
 const {owner}=originalVersionLogFixture(),state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
 const result=owner.processDllVersionLogTls();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged logger frame accepted');expect(result.reason).toMatch(/version logger return frame|expression slot/);
 expect(owner.snapshot().caseState!.stack!.snapshot().trace.some(row=>row.startsWith('10049850.'))).toBe(false);
},30_000);
it('executes original absent-window SpyAdmin callback and releases the logger section',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();owner.processDllErrorLogInsertion();
 const before=owner.snapshot(),message=before.dllFormatImages['10197d6c']!,spy=before.dllFormatImages['101ab11c']!;
 expect(spy.readUnsigned(24)).toBe(0);expect(before.messageSectionHeld).toBe(true);
 expect(owner.processDllSpyLogCallback()).toEqual({known:false,reason:'Original SharedBase DLL version log pending at 100a15ed'});
 const after=owner.snapshot(),stack=after.caseState!.stack!.snapshot();expect(after.messageSectionHeld).toBe(false);
 expect(platform.snapshot().physicalSections.find(row=>row.canonicalBacking===message.backing&&row.position===message.bytes.byteOffset-message.backing.bytes.byteOffset+4)!.depth).toBe(0);
 for(const site of ['100494db','10049559','1004956b','1004980f','100a15cd'])expect(stack.calls.findLast(row=>row.site===site)!.returned).toBe(true);
 expect(after.trace.filter(row=>row==='1004956b.LeaveCriticalSection')).toHaveLength(1);expect(stack.trace).toContain('1004b7bb.sharedInitializer.RET');
 expect(stack.trace).toContain('1004b535.sharedInitializer.CMP');expect(stack.trace.some(row=>row.startsWith('1004b542.'))).toBe(false);
 expect(after.initializerAllocations).toHaveLength(before.initializerAllocations.length);expect(stack.trace.some(row=>row.startsWith('1004b553.'))).toBe(false);
 const calls=stack.calls.length;expect(owner.processDllSpyLogCallback()).toEqual({known:false,reason:'Original SharedBase DLL version log pending at 100a15ed'});expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('rejects damaged SpyAdmin callback return and context before releasing MessageAdmin section',()=>{
 for(const displacement of [0,16]){
  const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
  owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();owner.processDllErrorLogInsertion();
  const before=owner.snapshot(),spy=before.dllFormatImages['101ab11c']!,bytes=spy.bytes.slice(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
  new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position+displacement,4).writeUnsigned(0,0);
  const result=owner.processDllSpyLogCallback();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged SpyAdmin callback accepted');expect(result.reason).toMatch(/SpyAdmin callback return frame|expression slot/);
  expect(owner.snapshot().messageSectionHeld).toBe(true);expect(spy.bytes).toEqual(bytes);expect(owner.snapshot().trace.filter(row=>row==='1004956b.LeaveCriticalSection')).toHaveLength(0);
 }
},30_000);
it('executes original ErrorAdmin full-ring overwrite with wrapped cursors',()=>{
 const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();
 const before=owner.snapshot(),buffer=before.initializerAllocations.at(-1)!,holder=before.dllFormatImages['10142a58']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(32).get()!.fields,records=holder.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields;
 expect(holder.readUnsigned(4)).toBe(50);records.bytes.fill(92);records.knownMask.fill(255);const preserved=records.bytes.slice(0,49*250),old=records.bytes.slice(49*250,50*250);
 holder.writeUnsigned(8,49);holder.writeUnsigned(12,49);holder.writeUnsigned(16,1,1);
 expect(owner.processDllErrorLogInsertion()).toEqual({known:false,reason:'Original SharedBase SpyAdmin log callback pending at 100494db'});
 expect(holder.readUnsigned(8)).toBe(0);expect(holder.readUnsigned(12)).toBe(0);expect(holder.readUnsigned(16,1)).toBe(1);expect(records.bytes.slice(0,49*250)).toEqual(preserved);
 const after=owner.snapshot();expect(after.dllFormatImages['10144028']!.bytes).toEqual(old);expect(records.bytes.slice(49*250,50*250)).toEqual(after.dllFormatImages['10143ef8']!.bytes);expect(buffer.backing.freed).toBe(true);expect(after.messageSectionHeld).toBe(true);
 expect(after.caseState!.stack!.snapshot().calls.findLast(row=>row.site==='1002250e')!.returned).toBe(true);
},30_000);
it('rejects damaged ErrorAdmin insertion return and input before changing the ring',()=>{
 for(const displacement of [0,4]){
  const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
  owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();
  const before=owner.snapshot(),buffer=before.initializerAllocations.at(-1)!,holder=before.dllFormatImages['10142a58']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(32).get()!.fields,records=holder.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields,bytes=records.bytes.slice(),masks=records.knownMask.slice(),state=holder.bytes.slice(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
  new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position+displacement,4).writeUnsigned(0,0);
  const result=owner.processDllErrorLogInsertion();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged insertion accepted');expect(result.reason).toMatch(/insertion return frame|expression slot/);
  expect(records.bytes).toEqual(bytes);expect(records.knownMask).toEqual(masks);expect(holder.bytes).toEqual(state);expect(buffer.backing.freed).toBe(false);expect(owner.snapshot().messageSectionHeld).toBe(true);
 }
},30_000);
it('executes original ErrorAdmin ring insertion and frees its formatting allocation',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();owner.processDllErrorLogFormatting();
 const before=owner.snapshot(),buffer=before.initializerAllocations.at(-1)!,holder=before.dllFormatImages['10142a58']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(32).get()!.fields,records=holder.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields;
 expect(owner.processDllErrorLogInsertion()).toEqual({known:false,reason:'Original SharedBase SpyAdmin log callback pending at 100494db'});
 const expected=new Uint8Array(250);expected.set(new TextEncoder().encode('-'.repeat(75)+", Z:#472 -> '.\\kernel\\ge_message.cpp'"));
 expect(records.bytes.slice(0,250)).toEqual(expected);expect(records.knownMask.slice(0,250)).toEqual(new Uint8Array(250).fill(255));
 expect(holder.readUnsigned(8)).toBe(0);expect(holder.readUnsigned(12)).toBe(1);expect(holder.readUnsigned(16,1)).toBe(0);expect(buffer.backing.freed).toBe(true);
 const after=owner.snapshot(),stack=after.caseState!.stack!.snapshot();expect(after.messageSectionHeld).toBe(true);
 for(const site of ['10022680','1002251f','1002252f','1002253f','10022686'])expect(stack.calls.findLast(row=>row.site===site)!.returned).toBe(true);
 expect(stack.calls.find(row=>row.site==='100494db')!.returned).toBe(true);expect(stack.trace).toContain('10023423.sharedInitializer.MOVSW');
 const image=NativeSharedModuleImage.forPlatform(platform);if(!image.known)throw new Error(image.reason);const scratch=image.value.errorLogScratch('dllErrorLogScratch');if(!scratch.known)throw new Error(scratch.reason);
 expect(scratch.value).toBe(after.dllFormatImages['10143ef8']);expect(scratch.value.bytes[0]).toBe(45);expect(NativeRuntimePlatform.canonicalNativePointerModulo4ForPlatform(platform,{fields:scratch.value,offset:1})).toEqual({known:true,value:1});
 const calls=stack.calls.length;expect(owner.processDllErrorLogInsertion()).toEqual({known:false,reason:'Original SharedBase SpyAdmin log callback pending at 100494db'});expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('executes original ErrorAdmin sprintf against its actual callback arguments',()=>{
 const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();
 const before=owner.snapshot(),buffer=before.initializerAllocations.at(-1)!;
 expect(owner.processDllErrorLogFormatting()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log insertion pending at 10022680'});
 const expected='-'.repeat(75)+", Z:#472 -> '.\\kernel\\ge_message.cpp'",bytes=new TextEncoder().encode(expected+'\0');
 expect(buffer.bytes.slice(0,bytes.length)).toEqual(bytes);expect(buffer.knownMask.slice(0,bytes.length)).toEqual(new Uint8Array(bytes.length).fill(255));
 const after=owner.snapshot(),stack=after.caseState!.stack!.snapshot();expect(after.messageSectionHeld).toBe(true);
 expect(after.initializerAllocations).toHaveLength(before.initializerAllocations.length);expect(stack.calls.find(row=>row.site==='10022632')!.returned).toBe(true);expect(stack.calls.findLast(row=>row.site==='100aa287')!.returned).toBe(true);
 const calls=stack.calls.length;expect(owner.processDllErrorLogFormatting()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log insertion pending at 10022680'});expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('rejects damaged ErrorAdmin sprintf return, output and format before writing its buffer',()=>{
 for(const displacement of [0,4,8]){
 const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();owner.processDllErrorLogAllocation();
 const before=owner.snapshot(),buffer=before.initializerAllocations.at(-1)!,bytes=buffer.bytes.slice(),masks=buffer.knownMask.slice(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position+displacement,4).writeUnsigned(0,0);
 const result=owner.processDllErrorLogFormatting();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged sprintf return accepted');expect(result.reason).toMatch(/sprintf return frame|expression slot/);
 expect(buffer.bytes).toEqual(bytes);expect(buffer.knownMask).toEqual(masks);expect(owner.snapshot().messageSectionHeld).toBe(true);
 }
},30_000);
it('executes original ErrorAdmin malloc and passes its owned buffer to sprintf',()=>{
 const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();
 const before=owner.snapshot(),request=0x200+before.dllFormatImages['100ebab8']!.bytes.length-1+before.dllFormatImages['100e7df8']!.bytes.length-1;
 expect(owner.processDllErrorLogAllocation()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log formatting pending at 10022632'});
 const after=owner.snapshot(),stack=after.caseState!.stack!.snapshot();
 expect(after.initializerAllocations).toHaveLength(before.initializerAllocations.length+1);
 expect(after.initializerAllocations.at(-1)!.bytes.length).toBe(request);
 expect(stack.calls.find(row=>row.site==='10022613')!.returned).toBe(true);
 expect(stack.trace).toContain('100aab6e.sharedInitializer.CALL');
 expect(stack.calls.at(-1)!.site).toBe('10022632');expect(after.messageSectionHeld).toBe(true);
 const calls=stack.calls.length;expect(owner.processDllErrorLogAllocation()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log formatting pending at 10022632'});
 expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('rejects damaged ErrorAdmin malloc return and request before allocating',()=>{
 for(const displacement of [0,4]){
  const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
  owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();owner.processDllErrorLogCallback();
  const before=owner.snapshot(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
  new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position+displacement,4).writeUnsigned(0,0);
  const result=owner.processDllErrorLogAllocation();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged malloc accepted');expect(result.reason).toMatch(/malloc return frame|expression slot/);
  expect(owner.snapshot().initializerAllocations).toHaveLength(before.initializerAllocations.length);expect(owner.snapshot().messageSectionHeld).toBe(true);
 }
},30_000);
it('rejects a damaged ErrorAdmin callback return before scanning or allocating',()=>{
 const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();
 const before=owner.snapshot(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
 const result=owner.processDllErrorLogCallback();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged callback return accepted');expect(result.reason).toMatch(/callback return frame|expression slot/);
 expect(owner.snapshot().messageSectionHeld).toBe(true);expect(owner.snapshot().initializerAllocations).toHaveLength(before.initializerAllocations.length);
},30_000);
it('executes original ErrorAdmin callback string scans before allocating its log buffer',()=>{
 const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();owner.processDllMessageLog();
 expect(owner.processDllErrorLogCallback()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log allocation pending at 10022613'});
 expect(owner.snapshot().messageSectionHeld).toBe(true);
 expect(owner.snapshot().caseState!.stack!.snapshot().calls.at(-1)!.site).toBe('10022613');
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();
 const expected=0x200+state.dllFormatImages['100ebab8']!.bytes.length-1+state.dllFormatImages['100e7df8']!.bytes.length-1;
 expect(stack.registers.EAX).toMatchObject({word:{value:expected,knownMask:0xffffffff}});
 expect(stack.calls.find(row=>row.site==='1002259f')!.returned).toBe(true);
 expect(stack.trace).toContain('100225c0.sharedInitializer.MOV');expect(stack.trace).toContain('10022600.sharedInitializer.MOV');
 const calls=stack.calls.length;expect(owner.processDllErrorLogCallback()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log allocation pending at 10022613'});
 expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('executes original MessageAdmin log dispatch under its actual section',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();
 expect(owner.processDllMessageLog()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log callback pending at 100494db'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();
 expect(state.messageSectionHeld).toBe(true);expect(state.exitLockHeld).toBe(false);
 expect(stack.calls.find(row=>row.site==='10049528')!.returned).toBe(true);expect(stack.calls.at(-1)!.site).toBe('100494db');
 const message=state.dllFormatImages['10197d6c']!;
 expect(platform.snapshot().physicalSections.find(row=>row.canonicalBacking===message.backing&&row.position===message.bytes.byteOffset-message.backing.bytes.byteOffset+4)!.depth).toBe(1);
 const calls=stack.calls.length;expect(owner.processDllMessageLog()).toEqual({known:false,reason:'Original SharedBase ErrorAdmin log callback pending at 100494db'});
 expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);
},30_000);
it('rejects a damaged logger return before entering MessageAdmin section',()=>{
 const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();owner.processDllSpieTerminate();owner.processDllMessageTerminate();
 const stack=owner.snapshot().caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
 const result=owner.processDllMessageLog();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged logger return accepted');expect(result.reason).toMatch(/logger submission frame|expression slot/);
 expect(owner.snapshot().messageSectionHeld).toBe(false);
},30_000);
it('rejects damaged shutdown registration returns before appending exit callbacks',()=>{
 for(const message of [false,true]){
  const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
  owner.processDllSpieCreateFile();if(message)owner.processDllSpieTerminate();
  const before=owner.snapshot(),end=before.initializerImages['102f8580']!.pointer(0).get(),stack=before.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
  new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
  const result=message?owner.processDllMessageTerminate():owner.processDllSpieTerminate();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged shutdown return accepted');
  expect(result.reason).toMatch(/shutdown registration frame|expression slot/);
  expect(owner.snapshot().initializerImages['102f8580']!.pointer(0).get()).toBe(end);expect(owner.snapshot().exitLockHeld).toBe(false);
 }
},30_000);
it('registers original SpieAdmin and MessageAdmin shutdown after an absent diagnostic file',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 owner.processDllSpieCreateFile();
 expect(owner.processDllSpieTerminate()).toEqual({known:false,reason:'Original SharedBase MessageAdmin termination registration pending at 100497a8'});
 const state=owner.snapshot(),decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');
 if(!decoder.known)throw new Error(decoder.reason);
 const decodedEnd=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);if(!decodedEnd.known)throw new Error(decodedEnd.reason);
 const end=decodedEnd.value as {fields:NativeHeapObjectViews;offset:number};expect(end.offset).toBe(84);
 const spie=decoder.value.invoke(end.fields.pointer(80).get()!);if(!spie.known)throw new Error(spie.reason);
 expect((spie.value as {originalCodeAddress:number}).originalCodeAddress).toBe(0x100e2830);
 expect(owner.processDllMessageTerminate()).toEqual({known:false,reason:'Original SharedBase MessageAdmin initialization log pending at 1004980f'});
 const after=owner.snapshot(),last=decoder.value.invoke(after.initializerImages['102f8580']!.pointer(0).get()!);if(!last.known)throw new Error(last.reason);
 expect((last.value as {offset:number}).offset).toBe(88);
 const message=decoder.value.invoke(end.fields.pointer(84).get()!);if(!message.known)throw new Error(message.reason);
 expect((message.value as {originalCodeAddress:number}).originalCodeAddress).toBe(0x100e27d0);
 const stack=after.caseState!.stack!.snapshot();for(const site of ['1004afc7','1004979e','100497a8'])expect(stack.calls.find(row=>row.site===site)!.returned).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('1004980f');expect(after.exitLockHeld).toBe(false);
 expect(stack.trace.some(row=>row.startsWith('100e2830.')||row.startsWith('100e27d0.'))).toBe(false);
},30_000);
it('rejects a damaged SpieAdmin registration return without changing callbacks',()=>{
 const {owner}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[{path:'zSpie.txt',bytes:[65],readable:true}]});
 owner.processDllSpieCreateFile();owner.processDllSpieFclose();const state=owner.snapshot();
 const holder=state.dllFormatImages['10197d6c']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields;
 const records=holder.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields,bytes=records.bytes.slice();
 const stack=state.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
 const result=owner.processDllSpieRegister();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged registration return accepted');
 expect(result.reason).toMatch(/SpieAdmin callback registration frame|expression slot/);
 expect(holder.readUnsigned(4)).toBe(2);expect(records.bytes).toEqual(bytes);
},30_000);
it('registers the original SpieAdmin callback after closing its file',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[{path:'zSpie.txt',bytes:[65],readable:true}]});
 owner.processDllSpieCreateFile();owner.processDllSpieFclose();
 const before=owner.snapshot(),holder=before.dllFormatImages['10197d6c']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields;
 const records=holder.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields,oldRecords=records.bytes.slice(0,24);
 expect(owner.processDllSpieRegister()).toEqual({known:false,reason:'Original SharedBase SpieAdmin Winsock ordinal 115 pending at 1004b235'});
 expect(holder.readUnsigned(4)).toBe(3);expect(holder.readUnsigned(8)).toBe(9);
 expect(records.bytes.slice(0,24)).toEqual(oldRecords);expect(records.readUnsigned(24)).toBe(0x10005722);expect(records.readUnsigned(32)).toBe(1);
 const context=records.pointer<{fields:NativeHeapObjectViews;offset:number}>(28).get()!;
 expect(context.fields).toBe(owner.snapshot().dllFormatImages['10197dc0']);expect(context.offset).toBe(0);
 expect(platform.fileSystemSnapshot()!.openHandles).toHaveLength(0);
 expect(owner.snapshot().caseState!.stack!.snapshot().calls.find(row=>row.site==='1004b226')!.returned).toBe(true);
 expect(owner.snapshot().caseState!.stack!.snapshot().calls.at(-1)!.site).toBe('1004b235');
 const calls=owner.snapshot().caseState!.stack!.snapshot().calls.length;
 expect(owner.processDllSpieRegister()).toEqual({known:false,reason:'Original SharedBase SpieAdmin Winsock ordinal 115 pending at 1004b235'});
 expect(owner.snapshot().caseState!.stack!.snapshot().calls).toHaveLength(calls);expect(holder.readUnsigned(4)).toBe(3);
},30_000);
it('rejects a damaged fclose return word before retiring the file',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[{path:'zSpie.txt',bytes:[65],readable:true}]});
 owner.processDllSpieCreateFile();const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 const handle=platform.fileSystemSnapshot()!.openHandles[0]!.handle;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
 const result=owner.processDllSpieFclose();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged fclose return accepted');
 expect(result.reason).toMatch(/fclose return frame|expression slot/);
 expect(platform.fileSystemSnapshot()!.openHandles[0]!.handle).toBe(handle);
 expect(platform.fileSystemSnapshot()!.retiredHandleCount).toBe(0);
 expect(owner.snapshot().crtHeldSectionIds).toEqual([]);expect(owner.snapshot().descriptorHeldSectionOffsets).toEqual([]);
},30_000);
it('executes original fclose and retires its owned regular file',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[{path:'zSpie.txt',bytes:[65,10],readable:true}]});
 expect(owner.processDllSpieCreateFile()).toEqual({known:false,reason:'Original SharedBase SpieAdmin fclose pending at 1004b208'});
 const handle=platform.fileSystemSnapshot()!.openHandles[0]!.handle;
 const result=owner.processDllSpieFclose();
 expect(result).toEqual({known:false,reason:'Original SharedBase SpieAdmin callback registration pending at 1004b226'});
 expect(platform.fileSystemSnapshot()!.openHandles).toHaveLength(0);
 expect(NativeRuntimePlatform.ownsFileHandle(platform,handle)).toBe(false);
 expect(NativeRuntimePlatform.recognizesFileHandle(platform,handle)).toBe(true);
 expect(owner.snapshot().crtHeldSectionIds).toEqual([]);
 expect(owner.snapshot().descriptorHeldSectionOffsets).toEqual([]);
 expect(owner.snapshot().ioBlock!.readUnsigned(168)).toBe(0xffffffff);
 expect(owner.snapshot().ioBlock!.readUnsigned(172,1)).toBe(0);
 expect(owner.snapshot().initializerImages['10141790']!.readUnsigned(108)).toBe(0);
 expect(owner.snapshot().dllFormatImages['10197dbc']!.readUnsigned(0,1)).toBe(1);
 const calls=owner.snapshot().caseState!.stack!.snapshot().calls;
 for(const site of ['1004b208','100bf665','100d0d4e','100d0d86'])expect(calls.find(row=>row.site===site)!.returned).toBe(true);
 expect(calls.at(-1)!.site).toBe('1004b226');
},30_000);
it('executes the original file-open failure and maps its Win32 error',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[]});
 const result=owner.processDllSpieCreateFile();expect(result).toEqual({known:false,reason:'Original SharedBase SpieAdmin termination registration pending at 1004afc7'});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();
 expect(state.ptd!.readUnsigned(8)).toBe(2);expect(state.ptd!.readUnsigned(12)).toBe(2);
 expect(state.ioBlock!.readUnsigned(168)).toBe(0xffffffff);expect(state.ioBlock!.readUnsigned(172,1)).toBe(0);expect(state.ioBlock!.readUnsigned(176)).toBe(1);
 expect(state.crtHeldSectionIds).toEqual([]);expect(state.descriptorHeldSectionOffsets).toEqual([]);
 expect(state.initializerImages['10141790']!.readUnsigned(96+12)).toBe(0);expect(state.initializerImages['10141790']!.readUnsigned(96+16)).toBe(0xffffffff);
 expect(platform.getWin32LastError()).toEqual({known:true,value:2});expect(platform.fileSystemSnapshot()!.openHandles).toHaveLength(0);
 for(const site of ['100d1372','100d13d0','100d13d7','100aedf8','100aee04','100ae4db','100ae4e0','100d19b5','100d19f6','100d0d86','100acc7b','100bf064','1004b1f7','1004afbd'])expect(stack.calls.find(row=>row.site===site)!.returned).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('1004afc7');

},30_000);
it('opens an actual selected file and retains an owned handle',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[{path:'zSpie.txt',bytes:[65,10],readable:true}]});
 const result=owner.processDllSpieCreateFile();expect(result).toEqual({known:false,reason:'Original SharedBase SpieAdmin fclose pending at 1004b208'});
 const state=owner.snapshot(),files=platform.fileSystemSnapshot()!,stack=state.caseState!.stack!.snapshot();
 expect(files.openHandles).toHaveLength(1);const handle=files.openHandles[0]!.handle;
 expect(files.openHandles[0]!.path).toBe('c:/gothic3/zspie.txt');expect(files.openHandles[0]!.inherit).toBe(true);expect(files.openHandles[0]!.byteLength).toBe(2);
 expect(NativeRuntimePlatform.ownsFileHandle(platform,handle)).toBe(true);
 expect(state.ioBlock!.pointer(168).get()).toBe(handle);expect(state.ioBlock!.readUnsigned(172,1)).toBe(0x81);expect(state.ioBlock!.readUnsigned(176)).toBe(1);
 expect(state.crtHeldSectionIds).toEqual([]);expect(state.descriptorHeldSectionOffsets).toEqual([]);
 expect(state.initializerImages['10141790']!.readUnsigned(96+12)).toBe(1);expect(state.initializerImages['10141790']!.readUnsigned(96+16)).toBe(3);expect(state.dllFormatImages['102f6ad4']!.readUnsigned(0)).toBe(1);
 for(const site of ['100d1372','100d13ec','100d1453','100d19b5','100d19f6','100d0d86','100acc7b','100bf064','1004b1f7'])expect(stack.calls.find(row=>row.site===site)!.returned).toBe(true);
 expect(stack.calls.at(-1)!.site).toBe('1004b208');

},30_000);

it('maps denied file reads through the original errno table',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[{path:'zSpie.txt',bytes:[1],readable:false}]});
 expect(owner.processDllSpieCreateFile()).toEqual({known:false,reason:'Original SharedBase SpieAdmin termination registration pending at 1004afc7'});
 expect(owner.snapshot().ptd!.readUnsigned(8)).toBe(13);expect(owner.snapshot().ptd!.readUnsigned(12)).toBe(5);expect(platform.fileSystemSnapshot()!.openHandles).toHaveLength(0);
},30_000);
it('rejects a damaged original CreateFileA return word before opening a file',()=>{
 const {owner,platform}=originalFileOpenFixture({cwd:'C:/Gothic3',directories:['C:/','C:/Gothic3'],files:[{path:'zSpie.txt',bytes:[1],readable:true}]});
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),call=stack.calls.at(-1)!;
 new NativeHeapObjectViews(stack.sharedDllResourceFrame!.handle.backing,call.position,4).writeUnsigned(0,0);
 const result=owner.processDllSpieCreateFile();expect(result.known).toBe(false);if(result.known)throw new Error('Damaged return word accepted');expect(result.reason).toMatch(/CreateFileA return frame|expression slot/);
 expect(platform.fileSystemSnapshot()!.openHandles).toHaveLength(0);expect(state.ioBlock!.readUnsigned(168)).toBe(0xffffffff);expect(owner.snapshot().crtHeldSectionIds).toEqual([19]);expect(owner.snapshot().descriptorHeldSectionOffsets).toEqual([180]);
},30_000);
it('retains the file-open boundary when no filesystem is selected',()=>{
 const {owner,platform}=originalFileOpenFixture();const result=owner.processDllSpieCreateFile();expect(result.known).toBe(false);if(result.known)throw new Error('Undeclared filesystem accepted');expect(result.reason).toContain('Explicit owned virtual filesystem');
 expect(platform.fileSystemSnapshot()).toBe(null);expect(owner.snapshot().ioBlock!.readUnsigned(168)).toBe(0xffffffff);expect(owner.snapshot().descriptorHeldSectionOffsets).toEqual([180]);
},30_000);
