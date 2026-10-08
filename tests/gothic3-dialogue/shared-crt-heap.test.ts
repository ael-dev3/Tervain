import {nativeVirtualX86CpuSelection, retainNativeX86ThreadStackSelection} from '../../src/gothic3/native-x86-thread-stack-profile';
import type {NativeX86CpuSelection} from '../../src/gothic3/native-x86-thread-stack-profile';
import type {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import {NativeX86ThreadStack} from '../../src/gothic3/native-x86-thread-stack';
import sharedCrtSource from '../../assets/gothic3/shared-crt-bootstrap/source.json';
import {nativeVirtualCp1252ArgvNlsSelection} from '../../src/gothic3/native-win32-argv-nls';
import {expect,it} from 'vitest';
import {NativeSharedCrtOwner} from '../../src/gothic3/native-shared-crt';
import {NativeRuntimePlatform,NativeWin32PlatformException} from '../../src/gothic3/native-runtime-platform';
import {NativeGameCrtOwner} from '../../src/gothic3/native-game-crt';
import type {NativeWin32HeapCapability} from '../../src/gothic3/native-runtime-platform';
function fixture(version:{platform:number;major:number;minor:number;build:number}|null={platform:2,major:6,minor:1,build:0xabcd}){
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:version}});
 return {platform,owner:NativeSharedCrtOwner.forPlatform(platform)};
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


function argumentFixture(ownLocale=1,selected=true,sse=false,stack:'aligned'|'opaque'|false=false,stackBytes=4096,commandBytes:readonly number[]=[0],environmentWide:readonly number[]|null=[0,0],environmentAnsi:readonly number[]|null=null,processor:{export?:boolean;erratum?:boolean;cpu?:NativeX86CpuSelection}={export:true,erratum:false}){
 let owner:NativeSharedCrtOwner;
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',processorFeatureProcedure:processor.export,floatingPointPrecisionErratum:processor.erratum,fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:42},entropy:{currentThreadId:()=>{owner.snapshot().ptd!.writeUnsigned(0x70,ownLocale);if(sse)owner.imageStorage('memcpySseFlag').writeUnsigned(0,1);return {known:true,value:9};}},processInputs:{acpCodePage:1252,conversionCoverage:'ascii-explicit-positive-count',initialDirectionFlag:0,commandLineA:{kind:'buffer',bytes:commandBytes},environmentW:environmentWide?{kind:'buffer',bytes:environmentWide}:{kind:'null'},environmentA:environmentAnsi?{kind:'buffer',bytes:environmentAnsi}:{kind:'null'}},startupIo:{startupInfoA:{outcome:'normal',writes:[{offset:50,width:2,value:0,knownMask:65535}]}},standardIo:{standardHandles:[{id:-10,result:'valid',fileType:2},{id:-11,result:'valid',fileType:3},{id:-12,result:'null',fileType:0}],setHandleCount:{result:0},sectionInitialization:'owned-registration'},threadStack:stack?{threadCapability:{},reservationBytes:stackBytes,addressModel:'opaque-relative',initialRegisters:'unknown',initialFs0:'unknown',pageAlignment:stack==='aligned'?'virtual-page-4096':undefined,cpu:processor.cpu}:undefined,argvNls:selected?{...nativeVirtualCp1252ArgvNlsSelection,lastError:{GetACP:88}}:undefined}});
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
 const state=stack.snapshot();expect(state.sharedFrame!.requestedBytes).toBe(520);expect(state.sharedFrame!.allocatedBytes).toBe(532);expect(state.sharedFrame!.probedPages).toEqual([]);expect(state.sharedFrame!.temporary).toBe(temp);expect(state.calls.filter(c=>c.site==='100c6f4c')).toHaveLength(1);expect(state.calls.find(c=>c.site==='100c6f4c')!.returned).toBe(true);
 expect(state.trace.filter(v=>v==='100a79df.REP_STOSD')).toHaveLength(128);expect(state.calls.find(c=>c.site==='100c6f80')!.returned).toBe(true);
 const reverse=new Map(nativeVirtualCp1252ArgvNlsSelection.reverse),candidate=owner.snapshot().multibyteAllocation!;
 for(let index=0;index<256;index++){const byte=index===0?32:index,type=nativeVirtualCp1252ArgvNlsSelection.ctype1[byte]!;expect(item.types.readUnsigned(index*2,2)).toBe(type);expect(item.lower.readUnsigned(index,1)).toBe(reverse.get(nativeVirtualCp1252ArgvNlsSelection.lower[byte]!));expect(item.upper.readUnsigned(index,1)).toBe(reverse.get(nativeVirtualCp1252ArgvNlsSelection.upper[byte]!));expect(candidate.readUnsigned(0x1d+index,1)).toBe(type&1?0x10:type&2?0x20:0);expect(candidate.readUnsigned(0x11d+index,1)).toBe(type&1?item.lower.readUnsigned(index,1):type&2?item.upper.readUnsigned(index,1):0);}
 expect(item.types.knownMask.every(mask=>mask===255)).toBe(true);expect(item.lower.knownMask.every(mask=>mask===255)).toBe(true);expect(item.upper.knownMask.every(mask=>mask===255)).toBe(true);
 expect(state.mappingFrames).toHaveLength(2);for(const frame of state.mappingFrames){expect(frame.returned).toBe(true);expect(frame.allocations.map(row=>row.allocated)).toEqual([528,528]);expect(frame.allocations.map(row=>row.requested)).toEqual([520,520]);for(const fields of [frame.input!,frame.output!]){expect(fields.backing).toBe(temp.backing);const at=fields.bytes.byteOffset-fields.backing.bytes.byteOffset;expect(at%16).toBe(8);if(frame===state.mappingFrames[1])expect(new DataView(fields.backing.bytes.buffer,fields.backing.bytes.byteOffset).getUint32(at-8,true)).toBe(0xcccc);}}
 const argv=state.sharedArgvFrame!;expect(argv.ebp).toBe(4088);expect(argv.moduleReturned).toBe(true);expect(argv.multibytePending).toBe(false);expect(argv.parsePending).toBe(false);expect(argv.parserReturned).toBe(true);expect(argv.leadCalls).toBe(12);expect(argv.argumentCount.bytes.byteOffset-argv.argumentCount.backing.bytes.byteOffset).toBe(argv.ebp-8);expect(argv.byteCount.bytes.byteOffset-argv.byteCount.backing.bytes.byteOffset).toBe(argv.ebp-12);expect(argv.queryCounts).toEqual({count:2,bytes:12});expect(argv.fillCounts).toEqual({count:2,bytes:12});const module=owner.imageStorage('moduleNameBuffer');expect(Array.from(module.bytes.slice(0,12))).toEqual([71,111,116,104,105,99,51,46,101,120,101,0]);expect(module.readUnsigned(260,1)).toBe(0);expect(owner.snapshot().argvInput!.fields).toBe(module);expect(owner.imageStorage('programName').pointer<{fields:object;offset:number}>(0).get()).toEqual({fields:module,offset:0});expect(owner.imageStorage('argumentCount').readUnsigned(0)).toBe(1);expect(owner.imageStorage('argumentVector').pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!.fields).toBe(owner.snapshot().argvAllocation);expect(state.calls.find(call=>call.site==='100c0bd1')!.returned).toBe(true);expect(state.calls.find(call=>call.site==='100c0bba')!.returned).toBe(true);
 const parent=state.setMultibyteFrame!;expect(parent.ebp).toBe(4048);expect(parent.pendingInstallation).toBe(false);expect(parent.returned).toBe(true);expect(parent.global).toBe(true);expect(parent.counterCursor).toBe(4);expect(parent.scopeAtReturn).toMatchObject({provenance:{kind:'xor',left:{provenance:{kind:'source',type:'image',address:'100f8be0'}},right:{value:0xbb40e64e,knownMask:0xffffffff}}});expect(parent.cookieAtReturn).toMatchObject({provenance:{kind:'xor',left:{value:0xbb40e64e,knownMask:0xffffffff},right:{provenance:{kind:'stack',offset:parent.ebp}}}});expect(parent.oldFs).toMatchObject({knownMask:0});expect(owner.imageStorage('initialMultibyte').readUnsigned(0)).toBe(0xffffffff);expect(owner.snapshot().multibyteAllocation!.readUnsigned(0)).toBe(2);expect(state.fs0).toMatchObject({word:{knownMask:0}});expect(state.registers.EBP).toMatchObject({word:{provenance:{kind:'stack',offset:4060}}});expect(state.calls.find(call=>call.site==='100b16c1')!.returned).toBe(true);expect(state.trace).toContain('100aeb68.setmbcpSehProlog');
 const configuration=state.configurationFrame!;expect(configuration.returned).toBe(true);expect(configuration.ebp).toBe(3980);expect(configuration.codePage).toBe(1252);expect(configuration.info.bytes.byteOffset-configuration.info.backing.bytes.byteOffset).toBe(configuration.ebp-24);expect(configuration.info.readUnsigned(0)).toBe(1);expect(state.trace.filter(row=>row.startsWith('100b14e1.configurationTableCompare.'))).toHaveLength(5);expect(state.trace).toContain('100b1549.configurationMemsetReturn');expect(state.registers.EBX).toMatchObject({word:{knownMask:0}});expect(state.currentPc).toMatchObject({provenance:{kind:'source',address:'100ce0a8'}});expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(1);expect(owner.imageStorage('multibytePointer').pointer(0).get()).toBe(candidate);
 const published=owner.imageStorage('multibytePublishedFields');for(const [at,from] of [[12,4],[16,8],[20,12]] as const)expect(published.readUnsigned(at)).toBe(candidate.readUnsigned(from));for(let i=0;i<5;i++)expect(published.readUnsigned(i*2,2)).toBe(candidate.readUnsigned(16+i*2,2));for(let i=0;i<257;i++)expect(owner.imageStorage('multibyteTypeTable').readUnsigned(i,1)).toBe(candidate.readUnsigned(28+i,1));for(let i=0;i<256;i++)expect(owner.imageStorage('multibyteCaseTable').readUnsigned(i,1)).toBe(candidate.readUnsigned(285+i,1));expect(state.trace.filter(row=>row.startsWith('setmbcp.publish.'))).toHaveLength(518);for(const site of ['100b1730','100b1755','100b1770','100b17e7','100b180b','100b1814','100b181d','100b184e','100b185f'])expect(state.calls.find(call=>call.site===site)!.returned).toBe(true);
 const enclosing=state.caseFrame!;expect(enclosing.originalEbp).toBe(configuration.ebp-52);expect(enclosing.returned).toBe(true);expect(enclosing.deferredBytes).toBe(0);expect(enclosing.tableIndex).toBe(256);expect(state.trace.filter(row=>row==='100b12e2.sourceCaseTableByte')).toHaveLength(256);expect(state.registers.EAX).toMatchObject({word:{value:0,knownMask:0xffffffff}});expect(enclosing.originalEbp-enclosing.ebp).toBe(0x49c);for(const [fields,relative] of [[item.info,-0x7c],[item.types,-0x68],[item.upper,0x198],[item.lower,0x298],[item.input,0x398]] as const){expect(fields.backing).toBe(temp.backing);expect(fields.bytes.byteOffset-fields.backing.bytes.byteOffset).toBe(enclosing.ebp+relative);}
 for(const site of ['100b1718','100b14be','100b1516','100b1529','100b1541','100b1677','100b1614','100b1221','100b1293','100b12b3','100b12d8','100c704b','100b50f2','100b137a'])expect(state.calls.find(call=>call.site===site)!.returned).toBe(true);expect(state.trace).toContain('100b12b8.ADD ESP68');expect(state.trace).toContain('100b12dd.ADD ESP36');
 expect(state.mappingFrames[1]!.input!.readUnsigned(256,2)).toBe(0x20ac);expect(owner.imageStorage('localeMapMode').readUnsigned(0)).toBe(1);expect(state.calls.filter(call=>call.site==='100b4d74')).toHaveLength(1);expect(owner.snapshot().trace.filter(item=>item==='100b12e2.caseTableByte')).toHaveLength(256);
 expect(state.phase).toBe('blocked');expect(state.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);expect(state.calls.find(c=>c.site==='100c6f95')).toBeDefined();expect(state.calls.find(c=>c.site==='100c6fa3')).toBeDefined();expect(state.calls.find(c=>c.site==='100c6fad')).toBeDefined();expect(state.calls.find(c=>c.site==='100c7038')).toBeDefined();expect(state.trace).toContain('100b4d0f.stackMarker.noHeapFree');expect(state.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4028}}});
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
  const state=owner.snapshot(),stack=state.caseState!.stack!;expect(stack.snapshot().phase).toBe('blocked');expect(state.ptd!.readUnsigned(0x70)).toBe(ownLocale);expect(state.localeUpdate!.readUnsigned(12,1)).toBe(ownLocale&2?0:1);expect(state.ptd!.pointer(104).get()).toBe(state.multibyteAllocation);expect(state.multibyteAllocation!.readUnsigned(0)).toBe(ownLocale&2?1:2);expect(owner.imageStorage('initialMultibyte').readUnsigned(0)).toBe(ownLocale&2?0:0xffffffff);expect(stack.snapshot().setMultibyteFrame!.global).toBe((ownLocale&2)===0);expect(stack.snapshot().calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);
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
 const {owner,platform}=argumentFixture(0,true,false,'aligned');owner.imageStorage('threadLocaleMask').writeUnsigned(0,0xffffffff);const beforeTypes=Array.from(owner.imageStorage('multibyteTypeTable').bytes),beforeCases=Array.from(owner.imageStorage('multibyteCaseTable').bytes);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('multibyte reference exchange');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.ptd!.pointer(104).get()).toBe(state.multibyteAllocation);expect(state.multibyteAllocation!.readUnsigned(0)).toBe(1);expect(owner.imageStorage('initialMultibyte').readUnsigned(0)).toBe(0);expect(owner.imageStorage('multibytePointer').readUnsigned(0)).toBe(0x10140e60);expect(Array.from(owner.imageStorage('multibyteTypeTable').bytes)).toEqual(beforeTypes);expect(Array.from(owner.imageStorage('multibyteCaseTable').bytes)).toEqual(beforeCases);expect(stack.setMultibyteFrame!.global).toBe(false);expect(stack.setMultibyteFrame!.counterCursor).toBe(2);expect(stack.calls.some(call=>call.site==='100b1770')).toBe(false);expect(stack.phase).toBe('blocked');expect(stack.sharedArgvFrame!.parserReturned).toBe(false);expect(stack.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb46','100c0bfc','100c0a62','100d1fd1','100d1e15']);expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(1);expect(NativeRuntimePlatform.invokeSharedInterlockedCounter(platform,{}).known).toBe(false);expect(NativeRuntimePlatform.canonicalSharedInterlockedReturn(platform,{}).known).toBe(false);expect(state.multibyteAllocation!.readUnsigned(0)).toBe(1);
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
 expect(state.registers.EAX).toMatchObject({word:{value:0,knownMask:0xffffffff}});expect(state.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);
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
 expect(stack.phase).toBe('returned');expect(stack.registers.EAX).toMatchObject({word:{value:0xffffffff,knownMask:0xffffffff}});expect(stack.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4096}}});expect(stack.calls.every(call=>call.returned)).toBe(true);expect(stack.calls.some(call=>call.site==='100c0c3d')).toBe(false);expect(owner.processAttach()).toEqual(result);
});
it('retains the malloc wrapper Sleep call after its translated lower failure',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);owner.imageStorage('allocationRetryDelay').writeUnsigned(0,1000);
 platform.win32HeapAlloc=(heap,flags,bytes)=>flags===0&&bytes===20?{known:true,value:null}:allocate(heap,flags,bytes);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aeeed');
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(stack.phase).toBe('blocked');expect(stack.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb46','100c0c23','100aeeed']);expect(stack.calls.find(call=>call.site==='100aeed8')!.returned).toBe(true);expect(state.argvReturned).toBe(null);expect(state.ptd!.readUnsigned(8)).toBe(12);expect(stack.sharedArgvFrame!.fillReturned).toBe(false);expect(owner.processAttach()).toEqual(result);
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
 expect(stack.snapshot().calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);expect(stack.snapshot().calls.find(call=>call.site==='100adb4f')!.returned).toBe(true);expect(NativeX86ThreadStack.runSharedEnvironment(stack,{}, {calloc:()=>{throw new Error('Forged calloc');},free:()=>{throw new Error('Forged free');}}).known).toBe(false);expect(NativeX86ThreadStack.beginSharedEnvironmentInitializers(stack,{}).known).toBe(false);expect(stack.snapshot().phase).toBe('blocked');expect(owner.processAttach()).toEqual(result);
});
it('preserves high ANSI environment bytes through the original strcpy_s path',()=>{
 const input=[65,61,128,255,0,0],{owner}=argumentFixture(1,true,false,'aligned',4096,[0],null,input);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot();expect(readEnvironment(state.environmentVector!,1)).toEqual(['A='+String.fromCharCode(128,255)]);expect(Array.from(state.environmentStrings[0]!.bytes)).toEqual(input.slice(0,-1));expect(state.environmentAllocation!.backing.freed).toBe(true);
});
it('returns setenvp -1 for NULL environment input without allocation or publication',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],null,null),result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100adb6f');
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot(),frame=stack.sharedEnvironmentFrame!;expect(state.setEnvpReturned).toBe(-1);expect(frame.result).toBe(-1);expect(frame.callocCalls).toBe(0);expect(frame.strlenCalls).toBe(0);expect(frame.freeCalls).toBe(0);expect(state.environmentVector).toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(0);expect(stack.phase).toBe('returned');expect(stack.calls.every(call=>call.returned)).toBe(true);expect(owner.processAttach()).toEqual(result);
});
it('preserves the environment block when vector calloc fails',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,bytes)=>flags===8&&bytes===4?{known:true,value:null}:allocate(heap,flags,bytes);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100adb6f');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.setEnvpReturned).toBe(-1);expect(state.environmentVector).toBe(null);expect(state.environmentAllocation!.backing.freed).toBe(false);expect(owner.imageStorage('environmentVector').pointer(0).get()).toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(0);expect(state.ptd!.readUnsigned(8)).toBe(0);expect(stack.calls.every(call=>call.returned)).toBe(true);expect(owner.processAttach()).toEqual(result);
});
it('frees only the vector after a later environment string allocation fails',()=>{
 const wide=Array.from('A=B\0C=D\0\0').flatMap(char=>[char.charCodeAt(0),0]),{owner,platform}=argumentFixture(1,true,false,'aligned',4096,[0],wide),allocate=platform.win32HeapAlloc.bind(platform);let strings=0;
 platform.win32HeapAlloc=(heap,flags,bytes)=>flags===8&&bytes===4&&++strings===2?{known:true,value:null}:allocate(heap,flags,bytes);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100adb6f');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.setEnvpReturned).toBe(-1);expect(state.environmentVector!.backing.freed).toBe(true);expect(state.environmentAllocation!.backing.freed).toBe(false);expect(state.environmentStrings).toHaveLength(1);expect(state.environmentStrings[0]!.backing.freed).toBe(false);expect(Array.from(state.environmentStrings[0]!.bytes)).toEqual([65,61,66,0]);expect(owner.imageStorage('environmentVector').pointer(0).get()).toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(0);expect(stack.sharedEnvironmentFrame!.freeCalls).toBe(1);expect(stack.phase).toBe('returned');expect(owner.processAttach()).toEqual(result);
});
it('retains copied environment output before unowned HeapFree failure mapping',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),free=platform.win32HeapFree.bind(platform);platform.win32HeapFree=(heap,flags,backing)=>backing===owner.snapshot().environmentAllocation?.backing?{known:true,value:false}:free(heap,flags,backing);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('free errno mapping');const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.setEnvpReturned).toBe(null);expect(state.environmentVector!.backing.freed).toBe(false);expect(state.environmentAllocation!.backing.freed).toBe(false);expect(owner.imageStorage('environmentPointer').pointer(0).get()).not.toBe(null);expect(owner.imageStorage('environmentInitialized').readUnsigned(0)).toBe(0);expect(stack.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb4f','100c09d0']);expect(stack.phase).toBe('blocked');expect(owner.processAttach()).toEqual(result);
});
function readEnvironment(vector:NativeHeapObjectViews,count:number):string[]{
 return Array.from({length:count},(_,index)=>{const pointer=vector.pointer<{fields:NativeHeapObjectViews;offset:number}>(index*4).get()!;expect(pointer.offset).toBe(0);let text='';for(let offset=0;;offset++){const byte=pointer.fields.readUnsigned(offset,1);if(byte===0)return text;text+=String.fromCharCode(byte);}});
}
it('executes cinit image validation, restores FS and installs conversion code addresses before the division query',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned');const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot(),stack=state.caseState!.stack!,snapshot=stack.snapshot(),frame=snapshot.sharedInitializerFrame!;
 expect(frame.entryEsp).toBe(4088);expect(frame.ownershipReturned).toBe(1);expect(frame.fsRestored).toBe(true);expect(frame.conversionInstalled).toBe(true);expect(frame.operations).toBeGreaterThan(100);
 expect(Array.from({length:10},(_,index)=>state.initializerImages['10141480']!.pointer(index*4).get())).toEqual(expect.arrayContaining(Array.from({length:10},()=>expect.any(Object))));expect(state.initializerImages['10141480']!.pointer(0).get()).toBe(state.initializerImages['10141480']!.pointer(20).get());
 expect(state.initializerImages['102f6424']!.readUnsigned(0)).toBe(0);
 for(const site of ['100aa640','100ae93f','100ae959','100a78fe'])expect(snapshot.calls.find(call=>call.site===site)!.returned).toBe(true);
 expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4028}}});
 expect(NativeSharedCrtOwner.initializerStackArgumentsForPlatform(platform,{}).known).toBe(false);expect(NativeX86ThreadStack.runSharedInitializers(stack,{}).known).toBe(false);expect(stack.snapshot().sharedInitializerFrame!.operations).toBe(frame.operations);expect(owner.processAttach()).toEqual(result);
});
it.each(['dos','nt','optional','sections','writable'] as const)('follows the original cinit ownership rejection for %s header state',mode=>{
 const {owner}=argumentFixture(1,true,false,'aligned'),header=owner.snapshot().initializerImages['10000000']!,nt=header.readUnsigned(0x3c);
 if(mode==='dos')header.writeUnsigned(0,0,2);else if(mode==='nt')header.writeUnsigned(nt,0);else if(mode==='optional')header.writeUnsigned(nt+24,0,2);else if(mode==='sections')header.writeUnsigned(nt+6,0,2);else {const sections=nt+24+header.readUnsigned(nt+20,2);header.writeUnsigned(sections+40+36,0xc0000040);}
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot(),frame=snapshot.sharedInitializerFrame!;expect(frame.ownershipReturned).toBe(0);expect(frame.fsRestored).toBe(true);expect(frame.conversionInstalled).toBe(false);expect(state.initializerImages['10141480']!.pointer(0).get()).not.toBeNull();expect(snapshot.calls.some(call=>call.site==='100aa64e')).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);expect(owner.processAttach()).toEqual(result);
});
it('skips a live NULL floating-point hook and retains the actual conversion encoding call',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['100ed568']!.writeUnsigned(0,0);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.ownershipReturned).toBeNull();expect(snapshot.sharedInitializerFrame!.conversionInstalled).toBe(false);expect(snapshot.calls.some(call=>call.site==='100aa640')).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);
});
it('retains an unowned live hook target after actual image ownership validation',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['100ed568']!.writeUnsigned(0,0x1000dead);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa64e -> 1000dead');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.ownershipReturned).toBe(1);expect(snapshot.sharedInitializerFrame!.fsRestored).toBe(true);expect(snapshot.sharedInitializerFrame!.conversionInstalled).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa64e']);expect(owner.processAttach()).toEqual(result);
});
it('keeps the unresolved image-check frame when a live header relation exceeds its owned span',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['10000000']!.writeUnsigned(0x3c,0x1000);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ae891');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.ownershipReturned).toBeNull();expect(snapshot.sharedInitializerFrame!.fsRestored).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa640','100ae93f']);expect(owner.processAttach()).toEqual(result);
});
it.each([false,true])('returns the original division query and publishes virtual erratum %s through FNCLEX and the hook return',erratum=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100ce0a8');
 const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot(),frame=snapshot.sharedInitializerFrame!;expect(frame.divisionQueryResult).toBe(erratum?1:0);expect([frame.moduleCalls,frame.procedureCalls,frame.featureCalls]).toEqual([1,1,1]);expect(state.initializerImages['102f6424']!.readUnsigned(0)).toBe(erratum?1:0);expect(snapshot.registers.EAX).toMatchObject({word:{value:0,knownMask:0xffffffff}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4028}}});
 for(const site of ['100a7903','100b4490','100b44a0','100b44ac'])expect(snapshot.calls.find(call=>call.site===site)!.returned).toBe(true);
 expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);expect(snapshot.x87Status).toMatchObject({word:{value:0,knownMask:0x80ff}});expect(snapshot.calls.find(call=>call.site==='100aa64e')!.returned).toBe(true);expect(snapshot.trace).toContain('100a791b.sharedInitializer.RET');expect(snapshot.trace).not.toContain('100b44af.sharedInitializer.JMP');expect(snapshot.calls.some(call=>call.site==='100a7914')).toBe(false);expect(platform.getWin32LastError()).toEqual({known:true,value:0});expect(owner.processAttach()).toEqual(result);
});
it('retains the actual feature call when the virtual processor result is absent',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Explicit virtual floating-point precision erratum');
 const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot(),frame=snapshot.sharedInitializerFrame!;expect(frame.divisionQueryResult).toBeNull();expect([frame.moduleCalls,frame.procedureCalls,frame.featureCalls]).toEqual([1,1,1]);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa64e','100a7903','100b44ac']);expect(state.initializerImages['102f6424']!.readUnsigned(0)).toBe(0);expect(snapshot.trace).not.toContain('100a790d.sharedInitializer.MOV');expect(owner.processAttach()).toEqual(result);
});
it('follows a missing processor export into the original x87 fallback frame',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:false,erratum:false});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('FLD');expect(result.reason).toContain('100b4455');
 const snapshot=owner.snapshot().caseState!.stack!.snapshot(),frame=snapshot.sharedInitializerFrame!;expect([frame.moduleCalls,frame.procedureCalls,frame.featureCalls]).toEqual([1,1,0]);expect(frame.divisionQueryResult).toBeNull();expect(snapshot.trace).toContain('100b44af.sharedInitializer.JMP');expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4048}}});expect(snapshot.registers.EBP).toMatchObject({word:{provenance:{kind:'stack',offset:4072}}});expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa64e','100a7903']);expect(owner.processAttach()).toEqual(result);
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
 for(const site of ['100b4413','100ae288','100ae29f','100ae2a1','100ae2dd']){const calls=snapshot.calls.filter(call=>call.site===site);expect(calls).toHaveLength(site==='100b4413'?10:11);expect(calls.every(call=>call.returned)).toBe(true);}
 expect(snapshot.calls.find(call=>call.site==='100aa655')!.returned).toBe(true);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);
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
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('same-platform pointer codec');expect(result.reason).toContain('100ae2a7');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.find(call=>call.site==='100ae2a1')!.returned).toBe(true);expect(snapshot.calls.some(call=>call.site==='100ae2dd')).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa655','100b4413']);expect(owner.processAttach()).toEqual(result);
});
it('rejects a forged original TLS import slot before procedure dispatch',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['102f97b8']!.pointer(0).set({});const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('initializer import slot');expect(result.reason).toContain('100ae282');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.some(call=>call.site==='100ae288')).toBe(false);expect(owner.processAttach()).toEqual(result);
});

it('retains the original fallback module call when the cached TLS getter is NULL',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),get=platform.tlsGetValue.bind(platform);platform.tlsGetValue=index=>owner.snapshot().trace.at(-1)==='SharedBase.initializer.TlsGetValue'?{known:true,value:null}:get(index);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100ae2b4');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.find(call=>call.site==='100ae288')!.returned).toBe(true);expect(snapshot.calls.some(call=>call.site==='100ae2a1')).toBe(false);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa655','100b4413','100ae2b4']);expect(owner.processAttach()).toEqual(result);
});
it('retains a pending TLS query when its actual platform endpoint is unknown',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),get=platform.tlsGetValue.bind(platform);platform.tlsGetValue=index=>owner.snapshot().trace.at(-1)==='SharedBase.initializer.TlsGetValue'?{known:false,reason:'Selected initializer TLS query unavailable'}:get(index);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('TLS query unavailable');expect(result.reason).toContain('100ae288');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa655','100b4413','100ae288']);expect(owner.snapshot().initializerImages['10141480']!.readUnsigned(0)).toBe(0x100b43e6);expect(owner.processAttach()).toEqual(result);
});

it('allocates, encodes and publishes the first exit table before the next error callback',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned');const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100ce0a8');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();
 expect(snapshot.trace.filter(row=>row==='100aa48a.sharedInitializer.MOV')).toHaveLength(68);const callbacks=snapshot.calls.filter(call=>call.site==='100aa490');expect(callbacks).toHaveLength(3);expect(callbacks.map(call=>call.returned)).toEqual([true,true,false]);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b4b72']);expect(snapshot.registers.ESI).toMatchObject({word:{provenance:{kind:'shared-local',offset:268}}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4028}}});
 const allocation=state.initializerAllocations[0]!;expect(state.initializerAllocations).toHaveLength(1);expect(allocation.bytes.length).toBe(128);expect(allocation.bytes.every(byte=>byte===0)).toBe(true);expect(allocation.knownMask.every(mask=>mask===255)).toBe(true);expect(allocation.backing.freed).toBe(false);
 const begin=state.initializerImages['102f8580']!.pointer<object>(0).get(),end=state.initializerImages['102f8584']!.pointer<object>(0).get();expect(begin).not.toBeNull();expect(end).toBe(begin);const module=platform.getWin32ModuleHandle('KERNEL32.DLL');if(!module.known||!module.value)throw new Error('Module missing');const codec=platform.getWin32Procedure(module.value,'DecodePointer');if(!codec.known||!codec.value)throw new Error('Codec missing');expect(codec.value.invoke(begin)).toEqual({known:true,value:allocation});
 for(const site of ['100a726a','100aef1e','100a7272'])expect(snapshot.calls.find(call=>call.site===site)!.returned).toBe(true);expect(snapshot.sharedInitializerFrame!.initializerResult).toBeNull();expect(owner.processAttach()).toEqual(result);
});
it('returns the all-NULL error table and stops decoding the uninitialized exit table',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned'),table=owner.snapshot().initializerImages['100e545c']!;for(let offset=0;offset<table.bytes.length;offset+=4)table.writeUnsigned(offset,0);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('Actual initializer encoded argument required at 100ae354');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace.filter(row=>row==='100aa48a.sharedInitializer.MOV')).toHaveLength(135);expect(snapshot.calls.some(call=>call.site==='100aa490')).toBe(false);expect(snapshot.calls.find(call=>call.site==='100aa664')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100ae354')!.returned).toBe(false);expect(owner.processAttach()).toEqual(result);
});
it('retains an unowned live error callback without dispatching it or advancing the table',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['100e545c']!.writeUnsigned(0,0x1000dead);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100aa490 -> 1000dead');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace.filter(row=>row==='100aa48a.sharedInitializer.MOV')).toHaveLength(1);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490']);expect(snapshot.registers.ESI).toMatchObject({word:{provenance:{kind:'shared-local'}}});expect(snapshot.calls.some(call=>call.site==='100a726a')).toBe(false);expect(owner.processAttach()).toEqual(result);
});

it('publishes encoded NULL and returns initializer error 24 after exit-table allocation failure',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===128?{known:true,value:null}:allocate(heap,flags,size);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('initializer result 24');expect(result.reason).toContain('100adb5f');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(state.initializerAllocations).toHaveLength(0);expect(snapshot.sharedInitializerFrame!.initializerResult).toBe(24);expect(snapshot.registers.EAX).toMatchObject({word:{value:24,knownMask:0xffffffff}});expect(snapshot.calls.every(call=>call.returned)).toBe(true);expect(snapshot.calls.filter(call=>call.site==='100aa490')).toHaveLength(1);
 const begin=state.initializerImages['102f8580']!.pointer<object>(0).get();expect(begin).not.toBeNull();expect(state.initializerImages['102f8584']!.pointer(0).get()).toBe(begin);const module=platform.getWin32ModuleHandle('KERNEL32.DLL');if(!module.known||!module.value)throw new Error('Module missing');const codec=platform.getWin32Procedure(module.value,'DecodePointer');if(!codec.known||!codec.value)throw new Error('Codec missing');expect(codec.value.invoke(begin)).toEqual({known:true,value:null});expect(snapshot.trace.filter(row=>row==='100aa48a.sharedInitializer.MOV')).toHaveLength(66);expect(owner.processAttach()).toEqual(result);
});
it('retains the calloc wrapper before its unowned positive Sleep retry',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);owner.imageStorage('allocationRetryDelay').writeUnsigned(0,1);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===128?{known:true,value:null}:allocate(heap,flags,size);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100aef35');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(snapshot.calls.find(call=>call.site==='100aef1e')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100a726a')!.returned).toBe(false);expect(snapshot.calls.some(call=>call.site==='100a7272')).toBe(false);expect(state.initializerImages['102f8580']!.readUnsigned(0)).toBe(0);expect(state.initializerAllocations).toHaveLength(0);expect(owner.processAttach()).toEqual(result);
});
it('retains original exit-table calloc when its actual heap endpoint is unknown',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===128?{known:false,reason:'Exit-table heap allocation unavailable'}:allocate(heap,flags,size);
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('Exit-table heap allocation unavailable');expect(result.reason).toContain('100aef1e');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100a726a','100aef1e']);expect(state.initializerAllocations).toHaveLength(0);expect(state.initializerImages['102f8580']!.readUnsigned(0)).toBe(0);expect(owner.processAttach()).toEqual(result);
});

it('returns the initialized multibyte callback and enters original processor-probe stack storage',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned');owner.snapshot().initializerImages['102f853c']!.writeUnsigned(0,17);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('PUSHFD');expect(result.reason).toContain('100ce0a8');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();
 expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(1);expect(snapshot.trace).not.toContain('100b185f.sharedInitializer.CALL');expect(snapshot.trace).toContain('100b186f.sharedInitializer.XOR');expect(snapshot.trace).toContain('100b1871.sharedInitializer.RET');expect(snapshot.calls.filter(call=>call.site==='100aa490').map(call=>call.returned)).toEqual([true,true,false]);expect(state.initializerImages['102f853c']!.readUnsigned(0)).toBe(0);expect(snapshot.registers.EBP).toMatchObject({word:{provenance:{kind:'stack',offset:4060}}});expect(snapshot.registers.ESP).toMatchObject({word:{provenance:{kind:'stack',offset:4028}}});
 const stack=Uint8Array.from(snapshot.stack.bytes!),view=new DataView(stack.buffer);for(const offset of [4056,4048,4052])expect(view.getUint32(offset,true)).toBe(0);expect(snapshot.trace).not.toContain('100ce0bd.sharedInitializer.CPUID');expect(snapshot.calls.find(call=>call.site==='100b4b72')!.returned).toBe(false);expect(owner.processAttach()).toEqual(result);
});
it('retains original multibyte initialization call if its live initialized flag is cleared',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned'),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===8&&size===128)owner.imageStorage('multibyteInitialized').writeUnsigned(0,0);return result;};
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');expect(result.reason).toContain('100b185f -> 100b16ba');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(owner.imageStorage('multibyteInitialized').readUnsigned(0)).toBe(0);expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100b185f']);expect(snapshot.calls.some(call=>call.site==='100b4b72')).toBe(false);expect(snapshot.trace).not.toContain('100b1865.sharedInitializer.MOV');expect(owner.processAttach()).toEqual(result);
});

it('executes the original ID toggle, CPUID leaves and normal SIMD probe frame',()=>{
 const {owner,platform}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu:nativeVirtualX86CpuSelection});
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Full attach returned');
 expect(result.reason).toContain('100aa692 -> 100e1450');const snapshot=owner.snapshot().caseState!.stack!.snapshot();
 expect(snapshot.trace).toContain('100ce0bd.sharedInitializer.CPUID');expect(snapshot.trace).toContain('100ce0d0.sharedInitializer.CPUID');expect(snapshot.trace).toContain('100ce055.sharedInitializer.MOVAPD');
 expect(snapshot.calls.find(call=>call.site==='100ce04c')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100ce08f')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100b4b72')!.returned).toBe(true);
 expect(owner.snapshot().initializerImages['102f853c']!.readUnsigned(0)).toBe(1);expect(platform.getWin32LastError()).toEqual({known:true,value:0});expect(snapshot.xmm.knownMask.every(mask=>mask===0)).toBe(true);expect(snapshot.processorSimdFrame!.returned).toBe(true);expect(owner.processAttach()).toEqual(result);
});
for(const cpu of [
 {...nativeVirtualX86CpuSelection,idBitWritable:false},
 {...nativeVirtualX86CpuSelection,initialEflags:0x200202,idBitWritable:false},
 {...nativeVirtualX86CpuSelection,cpuidLeaf1:[0x600,0,0,0] as const},
])it('follows original no-CPUID or no-SSE2 return without a SIMD call',()=>{
 const {owner}=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu});const result=owner.processAttach();expect(result.known).toBe(false);
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
 const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa692 -> 100e1450');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace.filter(row=>row==='100ce055.sharedInitializer.MOVAPD')).toHaveLength(3);expect(snapshot.calls.filter(call=>call.site==='100ce08f').map(call=>call.returned)).toEqual([true,true,true]);expect(snapshot.processorSimdFrame!.returned).toBe(true);
});

function stdioFixture(count=0){const f=argumentFixture(1,true,false,'aligned',4096,[0],[0,0],null,{export:true,erratum:false,cpu:nativeVirtualX86CpuSelection});f.owner.snapshot().initializerImages['102f8500']!.writeUnsigned(0,count);return f;}
for(const [requested,count] of [[0,512],[1,20],[19,20],[20,20],[33,33],[0x80000000,20],[0xffffffff,20]] as const)it(`initializes original FILE vector for signed requested count ${requested}`,()=>{
 const {owner}=stdioFixture(requested),result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa692 -> 100e1450');const state=owner.snapshot(),images=state.initializerImages,files=images['10141790']!,vector=images['102f71c0']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;
 expect(images['102f8500']!.readUnsigned(0)).toBe(count);expect(vector.offset).toBe(0);expect(vector.fields.bytes.length).toBe(count*4);expect(state.initializerAllocations).toContain(vector.fields);
 for(let index=0;index<20;index++){const entry=vector.fields.pointer<{fields:NativeHeapObjectViews;offset:number}>(index*4).get()!;expect(entry.fields).toBe(files);expect(entry.offset).toBe(index*32);}expect([...vector.fields.bytes.slice(80)]).toEqual(Array(count*4-80).fill(0));expect([...vector.fields.knownMask.slice(80)]).toEqual(Array(count*4-80).fill(255));
 expect(files.readUnsigned(16)).toBe(0);expect(files.readUnsigned(48)).toBe(1);expect(files.readUnsigned(80)).toBe(0xfffffffe);expect(files.readUnsigned(12)).toBe(257);expect(owner.imageStorage('memcpySseFlag').readUnsigned(0)).toBe(1);const snapshot=state.caseState!.stack!.snapshot();expect(snapshot.trace.filter(row=>row==='100bef63.sharedInitializer.MOV')).toHaveLength(20);expect(snapshot.trace.filter(row=>row==='100bef93.sharedInitializer.MOV')).toHaveLength(3);expect(snapshot.calls.filter(call=>call.site==='100aa490').map(call=>call.returned)).toEqual([true,true,true,true,true]);expect(snapshot.trace.filter(row=>row==='100ce055.sharedInitializer.MOVAPD')).toHaveLength(2);expect(owner.processAttach()).toEqual(result);
});
it('follows original stdio fallback allocation of twenty entries after the large allocation fails',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===2048?{known:true,value:null}:allocate(heap,flags,size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa692 -> 100e1450');expect(owner.snapshot().initializerImages['102f8500']!.readUnsigned(0)).toBe(20);const vector=owner.snapshot().initializerImages['102f71c0']!.pointer<{fields:NativeHeapObjectViews;offset:number}>(0).get()!;expect(vector.fields.bytes.length).toBe(80);const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.find(call=>call.site==='100bef27')!.returned).toBe(true);expect(snapshot.calls.find(call=>call.site==='100bef40')!.returned).toBe(true);
});
it('returns cinit failure 26 through the original stdio double-allocation failure branch',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&(size===2048||size===80)?{known:true,value:null}:allocate(heap,flags,size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('initializer result 26');const state=owner.snapshot(),snapshot=state.caseState!.stack!.snapshot();expect(snapshot.sharedInitializerFrame!.initializerResult).toBe(26);expect(state.initializerImages['102f71c0']!.readUnsigned(0)).toBe(0);expect(state.initializerImages['102f8500']!.readUnsigned(0)).toBe(20);expect(owner.imageStorage('memcpySseFlag').readUnsigned(0)).toBe(0);expect(snapshot.trace).not.toContain('100bef63.sharedInitializer.MOV');expect(snapshot.trace).not.toContain('100ce0f5.sharedInitializer.CALL');expect(owner.processAttach()).toEqual(result);
});
it('retains the original stdio calloc lower call when its heap result is unknown',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>flags===8&&size===2048?{known:false,reason:'stdio allocation unavailable'}:allocate(heap,flags,size);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('stdio allocation unavailable');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100bef27','100aef1e']);expect(owner.snapshot().initializerImages['102f71c0']!.readUnsigned(0)).toBe(0);
});
it('rejects a foreign descriptor block before using its HANDLE records',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===8&&size===2048)owner.imageStorage('ioBlocks').pointer(0).set(owner.snapshot().ptd!);return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('initialized SharedBase descriptor block');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.trace).not.toContain('100bef93.sharedInitializer.MOV');expect(owner.imageStorage('memcpySseFlag').readUnsigned(0)).toBe(0);
});

it('uses the original invalid, detached and NULL descriptor branches',()=>{
 for(const handle of [0xffffffff,0xfffffffe,0]){
  const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===8&&size===2048)owner.snapshot().ioBlock!.writeUnsigned(0,handle);return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa692 -> 100e1450');expect(owner.snapshot().initializerImages['10141790']!.readUnsigned(16)).toBe(0xfffffffe);
 }
});
it('rejects copied or invented HANDLE identities at the original descriptor read',()=>{
 for(const handle of [7,{identity:{}}]){
  const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{const result=allocate(heap,flags,size);if(flags===8&&size===2048){const fields=owner.snapshot().ioBlock!;if(typeof handle==='number')fields.writeUnsigned(0,handle);else fields.pointer(0).set(handle);}return result;};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('HANDLE');expect(result.reason).toContain('100bef93');expect(owner.imageStorage('memcpySseFlag').readUnsigned(0)).toBe(0);expect(owner.snapshot().initializerImages['10141790']!.readUnsigned(16)).toBe(0);expect(owner.processAttach()).toEqual(result);
 }
});
it('retains positive stdio calloc retry before original Sleep and before fallback allocation',()=>{
 const {owner,platform}=stdioFixture(),allocate=platform.win32HeapAlloc.bind(platform);platform.win32HeapAlloc=(heap,flags,size)=>{if(flags===8&&size===2048){owner.imageStorage('allocationRetryDelay').writeUnsigned(0,5);return {known:true,value:null};}return allocate(heap,flags,size);};const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aef35');const snapshot=owner.snapshot().caseState!.stack!.snapshot();expect(snapshot.calls.filter(call=>!call.returned).map(call=>call.site)).toEqual(['100adb5a','100aa664','100aa490','100bef27']);expect(snapshot.currentPc).toMatchObject({provenance:{kind:'source',address:'100aef35'}});expect(snapshot.calls.some(call=>call.site==='100bef40')).toBe(false);expect(owner.snapshot().initializerImages['102f71c0']!.readUnsigned(0)).toBe(0);
});
it('retains the original calloc overflow branch for a positive oversized FILE count',()=>{
 const {owner}=stdioFixture(0x7fffffff);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('calloc overflow');expect(result.reason).toContain('100aef1e');expect(owner.snapshot().initializerImages['102f71c0']!.readUnsigned(0)).toBe(0);expect(owner.processAttach()).toEqual(result);
});


it('registers the original RTC callback and restores both normal exit-registration frames',()=>{
 const {owner,platform}=stdioFixture();const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa692 -> 100e1450');
 const state=owner.snapshot(),stack=state.caseState!.stack!.snapshot();expect(state.exitLockHeld).toBe(false);
 for(const site of ['100aa676','100a72d4','100a72ac','100a71e6','100b1158','100a72c4','100b1162'])expect(stack.calls.find(call=>call.site===site)!.returned).toBe(true);
 expect(stack.initializerSehFrames).toEqual([{site:'100a729b',entered:true,returned:true},{site:'100b10dd',entered:true,returned:true}]);
 const decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');expect(decoder.known).toBe(true);if(!decoder.known)throw new Error(decoder.reason);
 const begin=decoder.value.invoke(state.initializerImages['102f8584']!.pointer(0).get()!);const end=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);expect(begin.known).toBe(true);expect(end.known).toBe(true);if(!begin.known||!end.known)throw new Error('Exit pointers not decoded');
 const cursor=end.value as {fields:NativeHeapObjectViews;offset:number};expect(cursor.fields).toBe(begin.value);expect(cursor.offset).toBe(12);
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
 const {owner,platform}=stdioFixture();const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa692 -> 100e1450');const state=owner.snapshot();
 const decoder=NativeRuntimePlatform.canonicalPointerCodecForPlatform(platform,state.ptd!.pointer(0x1fc).get()!,'DecodePointer');if(!decoder.known)throw new Error(decoder.reason);const end=decoder.value.invoke(state.initializerImages['102f8580']!.pointer(0).get()!);if(!end.known)throw new Error(end.reason);const cursor=end.value as {fields:NativeHeapObjectViews;offset:number};expect(cursor.offset).toBe(12);
 const addresses=[];for(let offset=0;offset<12;offset+=4){const callback=decoder.value.invoke(cursor.fields.pointer(offset).get()!);if(!callback.known)throw new Error(callback.reason);addresses.push((callback.value as {originalCodeAddress:number}).originalCodeAddress);}expect(addresses).toEqual([0x100bb8e7,0x100e30f0,0x100e26d0]);expect(state.exitLockHeld).toBe(false);const stack=state.caseState!.stack!.snapshot();expect(stack.calls.filter(call=>call.site==='100a729b').map(call=>call.returned)).toEqual([true,true,true]);expect(stack.calls.filter(call=>call.site==='100b10dd').map(call=>call.returned)).toEqual([true,true,true]);
});

it('skips an all-NULL void table and returns original cinit without claiming full attach',()=>{
 const {owner}=stdioFixture();const table=owner.snapshot().initializerImages['100e5000']!;for(let offset=0;offset<table.bytes.length;offset+=4)table.writeUnsigned(offset,0);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('Unowned SharedBase attach continuation after initializer result 0');const stack=owner.snapshot().caseState!.stack!.snapshot();expect(stack.sharedInitializerFrame!.initializerResult).toBe(0);expect(stack.trace.filter(row=>row==='100aa68c.sharedInitializer.MOV')).toHaveLength(214);expect(stack.calls.some(call=>call.site==='100aa692')).toBe(false);expect(owner.snapshot().attachReturned).toBeNull();
});
it('retains the original unknown void callback boundary after RTC registration',()=>{
 const {owner}=stdioFixture();owner.snapshot().initializerImages['100e5000']!.writeUnsigned(0,0x1000dead);const result=owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach returned');expect(result.reason).toContain('100aa692 -> 1000dead');expect(owner.snapshot().exitLockHeld).toBe(false);
});
