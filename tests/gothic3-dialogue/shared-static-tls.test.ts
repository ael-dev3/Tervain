import {expect,it} from 'vitest';
import {NativeSharedStaticTls} from '../../src/gothic3/native-shared-static-tls';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
function platform() {
 return new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,
  pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,
  threadStack:{threadCapability:{},reservationBytes:4096,addressModel:'opaque-relative',initialRegisters:'unknown',initialFs0:'unknown'}}});
}
function value<T>(result:{known:true;value:T}|{known:false;reason:string}):T {if(!result.known)throw new Error(result.reason);return result.value;}
it('loads the original SharedBase TLS template for the actual selected virtual thread',()=>{
 const p=platform(),owner=value(NativeSharedStaticTls.forPlatform(p));
 expect(owner.debugBuffer().known).toBe(false);
 value(owner.loadSharedBase());const buffer=value(owner.debugBuffer());
 expect(buffer.bytes.length).toBe(0x6d4-0x108);
 expect(buffer.bytes.byteOffset-buffer.backing.bytes.byteOffset).toBe(0x108);
 expect(owner.snapshot().virtualLoaderSlot).toBe(0);
 expect(owner.snapshot().sharedCrtInitialized).toBe(false);
 expect(owner.snapshot().dllAttachExecuted).toBe(false);
 buffer.writeUnsigned(0,0x41,1);
 value(owner.loadSharedBase());expect(value(owner.debugBuffer()).readUnsigned(0,1)).toBe(0x41);
 expect(value(NativeSharedStaticTls.forPlatform(p))).toBe(owner);
});
it('rejects a missing thread and keeps separate logical-thread TLS blocks',()=>{
 expect(NativeSharedStaticTls.forPlatform(new NativeRuntimePlatform()).known).toBe(false);
 const a=value(NativeSharedStaticTls.forPlatform(platform())),b=value(NativeSharedStaticTls.forPlatform(platform()));
 value(a.loadSharedBase());value(b.loadSharedBase());
 const left=value(a.debugBuffer()),right=value(b.debugBuffer());
 expect(left.backing.identity).not.toBe(right.backing.identity);
 left.writeUnsigned(0,0x61,1);expect(right.readUnsigned(0,1)).toBe(0);
});
