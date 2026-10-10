import {expect,it,vi} from 'vitest';
import {NativeEngineCrtOwner,NativeGameCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeEngineCrtByteCopy} from '../../src/gothic3/native-engine-crt-byte-copy';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import type {NativeValue} from '../../src/gothic3/dialogue';
import {browserGameProcessInputs} from '../../src/gothic3/browser-game-process-inputs';
const fact=<T>(value:NativeValue<T>):T=>{if(!value.known)throw new Error(value.reason);return value.value;};
function fixture(platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent',processInputs:browserGameProcessInputs}})){
 const crt=new NativeEngineCrtOwner({platform});crt.physical.crtOsFields.writeUnsigned(0,2);crt.physical.crtOsFields.writeUnsigned(12,6);fact(crt.initHeap());
 const copy=fact(NativeEngineCrtByteCopy.forCrt(crt));
 const allocate=(bytes:number)=>{const backing=fact(crt.callocCrt(1,bytes));if(!backing)throw new Error('Actual copy allocation required');return new NativeHeapObjectViews(backing);};
 return {crt,platform,copy,allocate};
}
it.each([0,1,2,3])('copies every scalar count/alignment with destination residue %s',destinationOffset=>{
 const {crt,copy,allocate}=fixture();
 for(const sourceOffset of [0,1,2,3])for(const bytes of [0,1,2,3,4,5,7,8,9,15,16,19,31,32,33,63,64,65,255,256,259]){
  const source=allocate(bytes+8),target=allocate(bytes+8);
  for(let offset=0;offset<source.bytes.length;offset++)source.writeUnsigned(offset,(offset*13+7)&255,1);
  const input=Object.freeze({fields:source,offset:sourceOffset}),destination=Object.freeze({fields:target,offset:destinationOffset});
  expect(NativeEngineCrtByteCopy.copyForCrt(copy,crt,destination,input,bytes)).toEqual({known:true,value:destination});
  expect([...target.bytes.subarray(destinationOffset,destinationOffset+bytes)]).toEqual([...source.bytes.subarray(sourceOffset,sourceOffset+bytes)]);
  expect(copy.snapshot().invocations.at(-1)).toMatchObject({phase:'returned',bytesStored:bytes,direction:'forward'});
 }
});
it.each([1,2,3,4,7])('copies backward overlapping spans with displacement %s',delta=>{
 const {crt,copy,allocate}=fixture();
 for(const bytes of [1,2,3,4,5,7,8,9,19,31,32,33,65,259]){
  const fields=allocate(bytes+delta+8);for(let offset=0;offset<fields.bytes.length;offset++)fields.writeUnsigned(offset,(offset*7)&255,1);
  const expected=fields.bytes.slice();expected.copyWithin(delta,0,bytes);
  const destination=Object.freeze({fields,offset:delta});
  expect(NativeEngineCrtByteCopy.copyForCrt(copy,crt,destination,Object.freeze({fields,offset:0}),bytes).known).toBe(true);
  expect([...fields.bytes]).toEqual([...expected]);
  expect(fact(NativeRuntimePlatform.readNativeDirectionFlag(crt.host.platform as NativeRuntimePlatform))).toBe(0);
 }
});
it('preserves unknown source bit masks through scalar stores',()=>{
 const {crt,copy,allocate}=fixture(),source=allocate(9),target=allocate(9);
 source.bytes.fill(0xa5);source.knownMask.fill(0x0f);
 expect(NativeEngineCrtByteCopy.copyForCrt(copy,crt,{fields:target,offset:0},{fields:source,offset:0},9).known).toBe(true);
 expect([...target.bytes.subarray(0,9)]).toEqual(Array(9).fill(0xa5));expect([...target.knownMask.subarray(0,9)]).toEqual(Array(9).fill(0x0f));
});
it('retains completed DWORD stores when a later dispatch is changed and cannot replay',()=>{
 const {crt,copy,allocate}=fixture(),source=allocate(9),target=allocate(9),tail=fact(NativeEngineCrtByteCopy.imageForCrt(copy,crt,'forwardTail'));
 source.bytes.fill(0x33);target.bytes.fill(0xaa);const original=tail.readUnsigned(4);tail.writeUnsigned(4,0x2046405c);
 const result=NativeEngineCrtByteCopy.copyForCrt(copy,crt,{fields:target,offset:0},{fields:source,offset:0},9);expect(result.known).toBe(false);
 expect([...target.bytes.subarray(0,9)]).toEqual([...Array(8).fill(0x33),0xaa]);expect(copy.snapshot().invocations[0]).toMatchObject({phase:'blocked',bytesStored:8});
 tail.writeUnsigned(4,original);expect(NativeEngineCrtByteCopy.copyForCrt(copy,crt,{fields:target,offset:0},{fields:source,offset:0},9)).toEqual(result);
 expect(copy.snapshot().invocations).toHaveLength(1);
});
it('rejects foreign CRT owners, foreign platforms and released storage',()=>{
 const a=fixture(),b=fixture(),source=a.allocate(4),target=a.allocate(4);
 expect(NativeEngineCrtByteCopy.copyForCrt(a.copy,b.crt,{fields:target,offset:0},{fields:source,offset:0},4).known).toBe(false);
 expect(NativeEngineCrtByteCopy.forCrt(NativeGameCrtOwner.forPlatform({platform:a.platform})).known).toBe(false);
 const foreign=b.allocate(4);expect(NativeEngineCrtByteCopy.copyForCrt(a.copy,a.crt,{fields:target,offset:0},{fields:foreign,offset:0},4).known).toBe(false);
 const c=fixture(),freed=c.allocate(4);fact(c.crt.free(freed.backing));expect(NativeEngineCrtByteCopy.copyForCrt(c.copy,c.crt,{fields:c.allocate(4),offset:0},{fields:freed,offset:0},4).known).toBe(false);
});
it('allows actual other-CRT allocations on the same platform, as native memcpy does',()=>{
 const a=fixture(),b=fixture(a.platform),source=a.allocate(4),target=b.allocate(4);source.bytes.fill(0x77);
 expect(NativeEngineCrtByteCopy.copyForCrt(a.copy,a.crt,{fields:target,offset:0},{fields:source,offset:0},4).known).toBe(true);
 expect([...target.bytes.subarray(0,4)]).toEqual(Array(4).fill(0x77));
});
it('preserves a reentrant boundary before any transfer and cannot restart',()=>{
 const {crt,platform,copy,allocate}=fixture(),source=allocate(4),target=allocate(4),original=NativeRuntimePlatform.prototype.resolveNativePointer;
 const read=vi.spyOn(NativeRuntimePlatform.prototype,'resolveNativePointer').mockImplementation(function(this:NativeRuntimePlatform,pointer){
  expect(NativeEngineCrtByteCopy.copyForCrt(copy,crt,{fields:target,offset:0},{fields:source,offset:0},4).known).toBe(false);
  return original.call(this,pointer);
 });
 expect(NativeEngineCrtByteCopy.copyForCrt(copy,crt,{fields:target,offset:0},{fields:source,offset:0},4).known).toBe(false);read.mockRestore();
 expect(copy.snapshot().invocations[0]).toMatchObject({phase:'blocked',bytesStored:0});
 expect(NativeEngineCrtByteCopy.copyForCrt(copy,crt,{fields:target,offset:0},{fields:source,offset:0},4).known).toBe(false);
 expect(copy.snapshot().invocations).toHaveLength(1);expect(platform).toBe(crt.host.platform);
});
it('keeps the vector path explicit while copying provably unequal low alignment scalarly',()=>{
 const a=fixture(),source=a.allocate(260),target=a.allocate(260),flag=fact(NativeEngineCrtByteCopy.imageForCrt(a.copy,a.crt,'sse2Flag'));flag.writeUnsigned(0,1);
 source.bytes.fill(0x42);
 expect(NativeEngineCrtByteCopy.copyForCrt(a.copy,a.crt,{fields:target,offset:0},{fields:source,offset:1},256).known).toBe(true);
 expect([...target.bytes.subarray(0,256)]).toEqual(Array(256).fill(0x42));
 const b=fixture(),input=b.allocate(256),output=b.allocate(256);fact(NativeEngineCrtByteCopy.imageForCrt(b.copy,b.crt,'sse2Flag')).writeUnsigned(0,1);
 const result=NativeEngineCrtByteCopy.copyForCrt(b.copy,b.crt,{fields:output,offset:0},{fields:input,offset:0},256);
 expect(result.known).toBe(false);if(result.known)throw new Error('Vector owner remains unsupported');expect(result.reason).toContain('3067fda9');
 expect(b.copy.snapshot().invocations[0]).toMatchObject({phase:'blocked',bytesStored:0});
});
it('rejects replaced original image roots without recreating their bytes',()=>{
 const {crt,copy}=fixture(),tail=fact(NativeEngineCrtByteCopy.imageForCrt(copy,crt,'forwardTail'));
 Reflect.set(tail.backing,'bytes',tail.backing.bytes.slice());expect(NativeEngineCrtByteCopy.forCrt(crt).known).toBe(false);
 expect(NativeEngineCrtByteCopy.imageForCrt(copy,crt,'forwardTail').known).toBe(false);
});
