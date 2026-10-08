import { expect,it } from 'vitest';
import { NativeMemoryAdmin,nativeArenaHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeValue } from '../../src/gothic3/dialogue';
function value<T>(result:NativeValue<T>):T { if(!result.known)throw new Error(result.reason);return result.value; }
it('uses original 20-byte pool geometry for requests 17 through 20 and reuses an actual freed slot', () => {
 const memory=new NativeMemoryAdmin(new NativeRuntimePlatform(),{extensions:[nativeArenaHeapExtension]});
 const allocations=[17,18,19,20].map(bytes=>value(memory.newObject(bytes,0xed))!);
 expect(allocations.map(a=>a.capacity)).toEqual([20,20,20,20]);
 expect(allocations.map(a=>a.offset)).toEqual([16,36,56,76]);
 expect(allocations[0]!.region.bytes.length).toBe(0x142000);
 const bitmap=new DataView(allocations[0]!.region.bytes.buffer);
 expect(bitmap.getUint32(0x13fffc,true)).toBe(0xfffffff0);
 expect(bitmap.getUint32(0x141ff8,true)).toBe(0x7fffffff);
 const old=allocations[1]!;value(memory.deleteObject(old));
 const reused=value(memory.newObject(19,0xed))!;
 expect(reused.region).toBe(old.region);expect(reused.offset).toBe(old.offset);
 expect(old.freed).toBe(true);
 value(memory.deleteObject(reused));
});
