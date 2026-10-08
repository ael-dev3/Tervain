import {expect,it} from 'vitest';
import {NativeSharedCrtOwner} from '../../src/gothic3/native-shared-crt';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
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
 expect(result.reason).toContain('100ae7b4');expect(result.reason).toContain('100aa7e6');
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

it('publishes actual unencoded FLS getter in its allocated TLS cache before init_pointers',()=>{
 const f=fixture();expect(f.owner.processAttach().known).toBe(false);
 const slots=f.owner.imageStorage('procedureSlots');
 expect([0,4,8,12].map(offset=>slots.pointer<{name:string}>(offset).get()!.name)).toEqual(['FlsAlloc','FlsGetValue','FlsSetValue','FlsFree']);
 const index=f.owner.imageStorage('tlsGetterIndex').readUnsigned(0);
 const actual=f.platform.tlsGetValue(index);expect(actual.known).toBe(true);
 if(!actual.known)throw new Error(actual.reason);
 expect(actual.value).toBe(slots.pointer(4).get());
 expect(f.owner.imageStorage('threadDataIndex').readUnsigned(0)).toBe(0xffffffff);
 expect(f.owner.snapshot().mtReturned).toBeNull();
 expect(f.owner.snapshot().trace.slice(-1)).toEqual(['100ae7b4.callInitPointers']);
});
it('uses the original TLS fallback when FLS exports are absent',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'owned-bijection',fiberLocalStorage:false,processHeap:true,osVersion:{platform:2,major:6,minor:0,build:1}}});
 const owner=NativeSharedCrtOwner.forPlatform(platform);expect(owner.processAttach().known).toBe(false);
 const slots=owner.imageStorage('procedureSlots');
 expect(slots.pointer(4).get()).toBe(platform.tlsProcedures.get);
 expect(slots.pointer(8).get()).toBe(platform.tlsProcedures.set);
 expect(slots.pointer(12).get()).toBe(platform.tlsProcedures.free);
 const allocator=slots.pointer<{address:string;owner:object}>(0).get()!;
 expect(allocator.address).toBe('100ae360');expect(allocator.owner).toBe(owner.identity);
 const cached=platform.tlsGetValue(owner.imageStorage('tlsGetterIndex').readUnsigned(0));
 expect(cached.known&&cached.value===platform.tlsProcedures.get).toBe(true);
 expect(owner.imageStorage('threadDataIndex').readUnsigned(0)).toBe(0xffffffff);
});

it('rejects a structurally forged Runtime platform before admitting CRT images',()=>{
 expect(()=>NativeSharedCrtOwner.forPlatform(Object.create(NativeRuntimePlatform.prototype))).toThrow('Actual');
});
