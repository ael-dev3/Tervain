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
 const f=environmentFixture();const result=f.owner.processAttach();expect(result.known).toBe(false);if(result.known)throw new Error('Attach complete');expect(result.reason).toContain('100bf165');
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
