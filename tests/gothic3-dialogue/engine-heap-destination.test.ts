import {expect,it} from 'vitest';
import {NativeEngineCrtOwner,NativeModuleCrtOwner} from '../../src/gothic3/native-engine-crt-locks';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import type {NativeValue} from '../../src/gothic3/dialogue';
const fact=<T>(value:NativeValue<T>):T=>{if(!value.known)throw new Error(value.reason);return value.value;};
function fixture(){
 const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'absent'}});
 const crt=new NativeEngineCrtOwner({platform});
 crt.physical.crtOsFields.writeUnsigned(0,2);crt.physical.crtOsFields.writeUnsigned(12,6);fact(crt.initHeap());
 const backing=fact(crt.mallocCrt(19));if(!backing)throw new Error('Test allocation required');
 const pointer=Object.freeze({fields:new NativeHeapObjectViews(backing),offset:0});return {platform,crt,backing,pointer};
}
it('admits actual Engine allocator output and checks the current span',()=>{
 const {platform,crt,pointer,backing}=fixture();
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,pointer,19)).toEqual({known:true,value:undefined});
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,{fields:pointer.fields,offset:backing.bytes.length},1).known).toBe(false);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(crt,platform,pointer,-1).known).toBe(false);
});
it('rejects foreign CRT and platform identities and unregistered backing',()=>{
 const a=fixture(),b=fixture();
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(b.crt,a.platform,a.pointer,1).known).toBe(false);
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(a.crt,b.platform,a.pointer,1).known).toBe(false);
 const fake={fields:new NativeHeapObjectViews({identity:Object.freeze({}),bytes:new Uint8Array(19),knownMask:new Uint8Array(19).fill(255),freed:false}),offset:0};
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(a.crt,a.platform,fake,1).known).toBe(false);
});
it('rejects released allocation and an expired heap',()=>{
 const a=fixture();fact(a.crt.free(a.backing));
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(a.crt,a.platform,a.pointer,1).known).toBe(false);
 const b=fixture();fact(b.crt.terminateHeap());
 expect(NativeModuleCrtOwner.canonicalEngineHeapDestination(b.crt,b.platform,b.pointer,1).known).toBe(false);
});
