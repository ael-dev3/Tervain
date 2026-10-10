import {expect,it,vi} from 'vitest';
import {NativeEngineCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import type {NativeValue} from '../../src/gothic3/dialogue';
const fact=<T>(result:NativeValue<T>):T=>{if(!result.known)throw new Error(result.reason);return result.value;};
function fixture(spin=true){
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',sectionSpinProcedure:spin}});
 const crt=new NativeEngineCrtOwner({platform});crt.physical.crtOsFields.writeUnsigned(0,2);crt.physical.crtOsFields.writeUnsigned(12,6);fact(crt.initHeap());
 const backing=fact(crt.callocCrt(32,56));if(!backing)throw new Error('Actual I/O-sized allocation required');
 const fields=new NativeHeapObjectViews(backing,12,24),pointer=Object.freeze({fields,offset:0});return {crt,platform,backing,fields,pointer};
}
it.each([true,false])('initializes the exact live Engine section with spin procedure=%s',spin=>{
 const {crt,platform,fields,pointer,backing}=fixture(spin),lower=vi.spyOn(platform,spin?'initializePhysicalCriticalSection':'initializePhysicalCriticalSectionWithoutSpin');
 expect(crt.initializeHeapCriticalSection(pointer)).toEqual({known:true,value:true});
 expect(lower).toHaveBeenCalledWith(...(spin?[fields,crt.identity,4000]:[fields,crt.identity]));
 expect([...backing.bytes.subarray(0,12)]).toEqual(Array(12).fill(0));expect([...backing.bytes.subarray(36,56)]).toEqual(Array(20).fill(0));
});
it('rejects foreign and released allocations before lower section initialization',()=>{
 const a=fixture(),b=fixture(),lower=vi.spyOn(a.platform,'initializePhysicalCriticalSection');
 expect(a.crt.initializeHeapCriticalSection(b.pointer).known).toBe(false);expect(lower).not.toHaveBeenCalled();
 const c=fixture();fact(c.crt.free(c.backing));expect(c.crt.initializeHeapCriticalSection(c.pointer).known).toBe(false);
});
it('rejects foreign cached procedures before invoking caller code',()=>{
 const {crt,pointer}=fixture(),invoke=vi.fn(()=>({known:true as const,value:true}));
 crt.physical.sectionInitializer.pointer(0).set(Object.freeze({identity:{},owner:crt.identity,name:'InitializeCriticalSectionAndSpinCount',invoke}));
 expect(crt.initializeHeapCriticalSection(pointer).known).toBe(false);expect(invoke).not.toHaveBeenCalled();
});
it('returns the actual lower false result without changing surrounding record bytes',()=>{
 const {crt,platform,pointer,backing}=fixture();vi.spyOn(platform,'initializePhysicalCriticalSection').mockReturnValue({known:true,value:false});
 expect(crt.initializeHeapCriticalSection(pointer)).toEqual({known:true,value:false});
 expect([...backing.bytes.subarray(0,56)]).toEqual(Array(56).fill(0));
});
it('rejects a backing released by the lower initializer after retaining its call',()=>{
 const {crt,platform,pointer,backing}=fixture();const lower=vi.spyOn(platform,'initializePhysicalCriticalSection').mockImplementation(()=>{
  fact(crt.free(backing));return {known:true,value:true};
 });
 expect(crt.initializeHeapCriticalSection(pointer).known).toBe(false);expect(backing.freed).toBe(true);
 expect(crt.initializeHeapCriticalSection(pointer).known).toBe(false);expect(lower).toHaveBeenCalledTimes(1);
});
it('retains a reentrant interruption and prevents replay',()=>{
 const {crt,platform,pointer}=fixture(),original=platform.initializePhysicalCriticalSection.bind(platform);
 const lower=vi.spyOn(platform,'initializePhysicalCriticalSection').mockImplementation((fields,owner,spin)=>{
  expect(crt.initializeHeapCriticalSection(pointer).known).toBe(false);return original(fields,owner,spin);
 });
 expect(crt.initializeHeapCriticalSection(pointer).known).toBe(false);expect(lower).toHaveBeenCalledTimes(1);
 expect(crt.initializeHeapCriticalSection(pointer).known).toBe(false);expect(lower).toHaveBeenCalledTimes(1);
});
