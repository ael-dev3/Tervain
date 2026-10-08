import {expect,it} from 'vitest';
import {NativeSharedCrtSecurityCookie} from '../../src/gothic3/native-shared-crt-security-cookie';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeGameCrtOwner} from '../../src/gothic3/native-game-crt';
import type {NativeValue} from '../../src/gothic3/dialogue';
const known=<T>(value:T):NativeValue<T>=>({known:true,value});
function fixture(mixed:number,counter:{success:boolean;low?:number;high?:number}={success:true,low:0,high:0}){
 const calls:string[]=[];
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,entropy:{
   systemTimeAsFileTime:()=>{calls.push('time');return known({low:mixed,high:0});},
   currentProcessId:()=>{calls.push('process');return known(0);},
   currentThreadId:()=>{calls.push('thread');return known(0);},
   tickCount:()=>{calls.push('tick');return known(0);},
   performanceCounter:()=>{calls.push('counter');return known(counter);},
  }}});
 return {platform,calls,owner:NativeSharedCrtSecurityCookie.forPlatform(platform)};
}
it('owns the original SharedBase cookie independently and follows entropy order and warm guard',()=>{
 const f=fixture(0x12345678),game=NativeGameCrtOwner.forPlatform({platform:f.platform,errnoSlot:()=>({known:false,reason:'not initialized'})});
 expect(f.owner.fields.readUnsigned(0)).toBe(0xbb40e64e);
 expect(f.owner.initialize().known).toBe(true);
 expect(f.calls).toEqual(['time','process','thread','tick','counter']);
 expect(f.owner.fields.readUnsigned(0)).toBe(0x12345678);expect(f.owner.fields.readUnsigned(4)).toBe(0xedcba987);
 expect(game.imageStorage('securityCookie').readUnsigned(0)).toBe(0xbb40e64e);
 expect(NativeSharedCrtSecurityCookie.forPlatform(f.platform)).toBe(f.owner);
 f.owner.fields.writeUnsigned(4,0);expect(f.owner.initialize().known).toBe(true);
 expect(f.calls).toHaveLength(5);expect(f.owner.fields.readUnsigned(4)).toBe(0xedcba987);
 expect(f.owner.snapshot().sharedCrtAttachReturned).toBe(false);
});
it('follows the default collision and low high-word adjustment branches, including zero',()=>{
 for(const [input,output] of [[0xbb40e64e,0xbb40e64f],[0x1234,0x12341234],[0,0]]){
  const f=fixture(input!);expect(f.owner.initialize().known).toBe(true);
  expect(f.owner.fields.readUnsigned(0)).toBe(output);expect(f.owner.fields.readUnsigned(4)).toBe((~output!)>>>0);
 }
});
it('ignores the counter BOOL when output DWORDs are actually written',()=>{
 const f=fixture(0x12340000,{success:false,low:0x12,high:0x34});
 expect(f.owner.initialize().known).toBe(true);expect(f.owner.fields.readUnsigned(0)).toBe(0x12340026);
});
it('preserves unknown counter outputs and refuses to replay the consumed entropy prefix',()=>{
 const f=fixture(0x12340000,{success:false});const result=f.owner.initialize();
 expect(result.known).toBe(false);expect(f.owner.fields.readUnsigned(0)).toBe(0xbb40e64e);
 expect(f.owner.fields.readUnsigned(4)).toBe(0x44bf19b1);
 expect(f.owner.snapshot().returned).toBe(false);expect([...f.owner.snapshot().counter!.knownMask]).toEqual(new Array(8).fill(0));
 expect(f.owner.initialize()).toEqual(result);expect(f.calls).toHaveLength(5);
});
it('rejects a missing entropy provider before changing the original cookie',()=>{
 const owner=NativeSharedCrtSecurityCookie.forPlatform(new NativeRuntimePlatform());
 expect(owner.initialize().known).toBe(false);expect(owner.fields.readUnsigned(0)).toBe(0xbb40e64e);
 expect(owner.snapshot().trace).toEqual(['100c0dca.GetSystemTimeAsFileTime']);
});
