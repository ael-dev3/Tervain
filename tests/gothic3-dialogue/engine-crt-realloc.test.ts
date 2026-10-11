import {expect,it,vi} from 'vitest';
import type {NativeValue} from '../../src/gothic3/dialogue';
import {NativeEngineCrtOwner,NativeModuleCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
const fact=<T>(v:NativeValue<T>):T=>{if(!v.known)throw new Error(v.reason);return v.value;};
function fixture(){
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent'}});
 const crt=new NativeEngineCrtOwner({platform});crt.physical.crtOsFields.writeUnsigned(0,2);crt.physical.crtOsFields.writeUnsigned(12,6);fact(crt.initHeap());
 const backing=fact(crt.mallocCrt(128));if(!backing)throw new Error('Original Engine allocation required');const fields=new NativeHeapObjectViews(backing);return {platform,crt,backing,fields,pointer:Object.freeze({fields,offset:0})};
}
it('moves Engine realloc storage with exact old bytes and masks and unknown extension',()=>{
 const {platform,crt,backing,fields,pointer}=fixture();fields.writeUnsigned(0,0x12345678);fields.knownMask.set([255,0,255,0],0);fields.writeUnsigned(124,0xabcdef01);
 const bytes=Array.from(backing.bytes),masks=Array.from(backing.knownMask);const moved=fact(crt.reallocCrt(pointer,256));if(!moved)throw new Error('Actual moved Engine allocation required');
 expect(moved).not.toBe(backing);expect(backing.freed).toBe(true);expect(moved.bytes.length).toBe(256);expect(Array.from(moved.bytes.slice(0,128))).toEqual(bytes);expect(Array.from(moved.knownMask.slice(0,128))).toEqual(masks);expect(Array.from(moved.knownMask.slice(128))).toEqual(Array(128).fill(0));
 const target={fields:new NativeHeapObjectViews(moved),offset:0};expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,target,256).known).toBe(true);expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,pointer,0).known).toBe(false);expect(fact(crt.msize(target))).toBe(256);
});
it('rejects foreign and interior Engine realloc pointers without releasing the source',()=>{
 const a=fixture(),b=fixture();expect(b.crt.reallocCrt(a.pointer,256).known).toBe(false);expect(a.crt.reallocCrt({fields:a.fields,offset:4},256).known).toBe(false);expect(a.backing.freed).toBe(false);
});
it('retains Engine realloc source storage when the platform operation is interrupted',()=>{
 const {crt,backing,pointer}=fixture();const bytes=Array.from(backing.bytes),masks=Array.from(backing.knownMask);const spy=vi.spyOn(NativeRuntimePlatform.prototype,'win32HeapReAlloc').mockImplementation(()=>{throw new Error('Interrupted original Engine HeapReAlloc capability');});let result;try{result=crt.reallocCrt(pointer,256);}finally{spy.mockRestore();}
 expect(result.known).toBe(false);expect(backing.freed).toBe(false);expect(Array.from(backing.bytes)).toEqual(bytes);expect(Array.from(backing.knownMask)).toEqual(masks);
});
it('releases original Engine storage for a zero-size realloc request',()=>{
 const {crt,backing,pointer}=fixture();expect(crt.reallocCrt(pointer,0)).toEqual({known:true,value:null});expect(backing.freed).toBe(true);
});
it('keeps the unsupported Engine small-block realloc branch pending',()=>{
 const {crt,backing,pointer}=fixture();crt.physical.heapSelector.writeUnsigned(0,3);const result=crt.reallocCrt(pointer,256);expect(result.known).toBe(false);if(!result.known)expect(result.reason).toContain('realloc30679200 small-block branch under lock4');expect(backing.freed).toBe(false);
});
