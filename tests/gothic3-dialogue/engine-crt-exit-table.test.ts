import {expect,it,vi} from 'vitest';
import {NativeEngineExitTable} from '../../src/gothic3/native-engine-crt-exit-table';
import {NativeEngineCrtOwner,NativeGameCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import type {NativeBytePointer} from '../../src/gothic3/native-pointer-geometry';
import type {NativeValue} from '../../src/gothic3/dialogue';
const known=<T>(value:T):NativeValue<T>=>({known:true,value});
const fact=<T>(result:NativeValue<T>):T=>{if(!result.known)throw new Error(result.reason);return result.value;};
function fixture(codec:'absent'|'owned-bijection'='absent') {
  const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:codec}});
  const crt=new NativeEngineCrtOwner({platform});
  // Explicit test OS selection; production initialization must recover these facts.
  crt.physical.crtOsFields.writeUnsigned(0,2);crt.physical.crtOsFields.writeUnsigned(12,6);
  if(codec==='owned-bijection')crt.physical.sectionInitializer.pointer(0).set(fact(crt.encodePointer(null)));
  fact(crt.initHeap());fact(crt.initLocks());return {crt,platform};
}
it('initializes the original Engine exit globals through its own CRT heap and codec',()=>{
  const {crt}=fixture('owned-bijection'),owner=NativeEngineExitTable.forCrt(crt);
  expect(NativeEngineExitTable.forCrt(crt)).toBe(owner);
  expect(owner.begin.readUnsigned(0)).toBe(0);expect(owner.end.readUnsigned(0)).toBe(0);
  expect(fact(owner.initialize())).toBe(0);
  const state=owner.snapshot(),allocation=state.allocation!;
  expect(allocation.bytes.length).toBeGreaterThanOrEqual(128);expect(allocation.freed).toBe(false);
  expect([...allocation.bytes.subarray(0,128)]).toEqual(Array(128).fill(0));
  expect([...allocation.knownMask.subarray(0,128)]).toEqual(Array(128).fill(255));
  const encoded=owner.begin.pointer<object>(0).get();expect(encoded).not.toBe(state.pointer);
  expect(owner.end.pointer(0).get()).toBe(encoded);
  const decoded=fact(crt.decodePointer(encoded)) as NativeBytePointer;
  expect(decoded).toBe(state.pointer);expect(decoded.fields.backing).toBe(allocation);expect(decoded.offset).toBe(0);
  expect([...owner.begin.knownMask]).toEqual(Array(4).fill(0));
  expect(fact(owner.initialize())).toBe(0);expect(owner.snapshot().allocation).not.toBe(allocation);expect(allocation.freed).toBe(false);
  expect(owner.snapshot().trace.filter(row=>row==='30671530.calloc.return')).toHaveLength(2);
  expect(state.registrationOwned).toBe('within-current-capacity');expect(state.traversalOwned).toBe(false);
});
it('retains the original NULL-allocation result and encoded globals',()=>{
  const {crt,platform}=fixture();vi.spyOn(platform,'win32HeapAlloc').mockReturnValue(known(null));
  const owner=NativeEngineExitTable.forCrt(crt);expect(fact(owner.initialize())).toBe(24);
  expect(owner.snapshot().allocation).toBe(null);expect(owner.snapshot().completed).toBe(true);
  expect(owner.begin.pointer(0).get()).toBe(null);expect(owner.end.pointer(0).get()).toBe(null);
  expect(fact(owner.initialize())).toBe(24);
});
it('stops before storing exit pointers when the actual codec fails without reallocating',()=>{
  const {crt}=fixture();vi.spyOn(crt,'encodePointer').mockReturnValue({known:false,reason:'test codec unavailable'});
  const owner=NativeEngineExitTable.forCrt(crt);expect(owner.initialize().known).toBe(false);
  const state=owner.snapshot();expect(state.allocation).not.toBe(null);expect(state.completed).toBe(false);
  expect(owner.begin.readUnsigned(0)).toBe(0);expect(owner.end.readUnsigned(0)).toBe(0);
  expect(owner.initialize().known).toBe(false);expect(owner.snapshot().allocation).toBe(state.allocation);
  expect(owner.snapshot().trace).toEqual(state.trace);
});
it('rejects a Game CRT owner',()=>{
  const platform=new NativeRuntimePlatform();
  const game=NativeGameCrtOwner.forPlatform({platform});
  expect(()=>NativeEngineExitTable.forCrt(game as unknown as NativeEngineCrtOwner)).toThrow('Actual Engine CRT owner required');
});

it('registers an encoded shutdown callback under Engine lock8 without invoking it',()=>{
 const {crt}=fixture('owned-bijection'),owner=NativeEngineExitTable.forCrt(crt);
 fact(owner.initialize());const callback=owner.moduleShutdownCallback();
 expect(owner.moduleShutdownCallback()).toBe(callback);expect(fact(owner.atexit(callback))).toBe(0);
 const state=owner.snapshot(),encoded=state.pointer!.fields.pointer<object>(0).get();
 expect(encoded).not.toBe(callback);expect(fact(crt.decodePointer(encoded))).toBe(callback);
 expect(state.callbackCells).toEqual([{allocation:state.allocation,offset:0,callback}]);
 const end=fact(crt.decodePointer(owner.end.pointer<object>(0).get())) as NativeBytePointer;
 expect(end.fields).toBe(state.pointer!.fields);expect(end.offset).toBe(4);
 expect(state.trace.slice(-4)).toEqual(['3067cfe8.lock8','3067150b.callback.store','30671517.end.store','3067cff1.unlock8']);
});
it('rejects a foreign callback before taking a lock or writing a cell',()=>{
 const first=NativeEngineExitTable.forCrt(fixture().crt),second=NativeEngineExitTable.forCrt(fixture().crt);
 fact(first.initialize());const before=first.snapshot();
 expect(first.atexit(second.moduleShutdownCallback()).known).toBe(false);
 expect(first.snapshot().trace).toEqual(before.trace);expect(first.snapshot().callbackCells).toEqual([]);
});
it('preserves the full initial table at the actual growth frontier',()=>{
 const owner=NativeEngineExitTable.forCrt(fixture().crt);fact(owner.initialize());const callback=owner.moduleShutdownCallback();
 for(let i=0;i<32;i++)expect(fact(owner.atexit(callback))).toBe(0);
 expect(owner.atexit(callback).known).toBe(false);
 expect(owner.snapshot().boundary).toContain('growth3067ca49');expect(owner.snapshot().callbackCells).toHaveLength(32);
});
