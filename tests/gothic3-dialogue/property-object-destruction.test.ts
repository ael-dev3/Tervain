import { expect,it } from 'vitest';
import { NativePropertyObjectConstruction } from '../../src/gothic3/native-property-object-construction';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import type { NativeValue } from '../../src/gothic3/dialogue';
function value<T>(result:NativeValue<T>):T {if(!result.known)throw new Error(result.reason);return result.value;}
function fields(){return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(24).fill(0xaa),knownMask:new Uint8Array(24),freed:false});}
it('clears the actual property pointer array twice and preserves untouched flag/padding',()=>{
 const memory=new NativeMemoryAdmin(new NativeRuntimePlatform()),view=fields();
 const owner=value(NativePropertyObjectConstruction.construct(memory,view,{kind:'objectType',flag:1}));
 const allocation=value(memory.newObject(12,0x169))!;
 const array=new NativeHeapObjectViews(allocation);
 for(let offset=0;offset<12;offset+=4)array.pointer(offset).set(null);
 view.pointer(8).set(allocation);view.writeUnsigned(12,3);view.writeUnsigned(16,3);
 const flag=[view.bytes[20],view.knownMask[20]];
 value(owner.destroy());
 expect(allocation.freed).toBe(true);expect(view.pointer(8).get()).toBeNull();
 expect(view.readUnsigned(12)).toBe(0);expect(view.readUnsigned(16)).toBe(0);
 expect([view.bytes[20],view.knownMask[20]]).toEqual(flag);
 expect([...view.bytes.slice(21)]).toEqual([0xaa,0xaa,0xaa]);
 expect(owner.destroy().known).toBe(false);
});
it('destroys the factory name first, frees its retained raw array and keeps the stale CString slot',()=>{
 const memory=new NativeMemoryAdmin(new NativeRuntimePlatform()),view=fields(),name=new NativeHeapCString(memory);
 value(name.allocateTextBytes(new TextEncoder().encode('abcdef')));
 const owner=value(NativePropertyObjectConstruction.construct(memory,view,{kind:'namedFactory',name}));
 const stringData=view.pointer(20).get();
 const data=name.snapshot().allocation!;
 expect(new DataView(data.bytes.buffer,data.bytes.byteOffset).getUint16(4,true)).toBe(2);
 const array=value(memory.newObject(12,0x169))!;
 view.pointer(4).set(array);view.writeUnsigned(8,0xface);view.writeUnsigned(12,3);
 value(owner.destroy());
 expect(new DataView(data.bytes.buffer,data.bytes.byteOffset).getUint16(4,true)).toBe(1);
 expect(view.pointer(20).get()).toBe(stringData);
 expect(array.freed).toBe(true);expect(view.pointer(4).get()).toBeNull();
 expect(view.readUnsigned(8)).toBe(0);expect(view.readUnsigned(12)).toBe(0);
 expect(view.readUnsigned(16,2)).toBe(1);
 value(name.destroy());expect(data.freed).toBe(true);
});
it('stops before an unowned property virtual destructor and retains its source prefix',()=>{
 const memory=new NativeMemoryAdmin(new NativeRuntimePlatform()),view=fields();
 const owner=value(NativePropertyObjectConstruction.construct(memory,view,{kind:'objectType',flag:0}));
 const allocation=value(memory.newObject(12,0x169))!;
 new NativeHeapObjectViews(allocation).pointer(0).set({});
 view.pointer(8).set(allocation);view.writeUnsigned(12,1);view.writeUnsigned(16,3);
 view.writeUnsigned(0,0x2065915c);
 const result=owner.destroy();expect(result.known).toBe(false);
 expect(view.readUnsigned(0)).toBe(0x100e9d6c);expect(allocation.freed).toBe(false);
 expect(view.pointer(8).get()).toBe(allocation);expect(view.readUnsigned(12)).toBe(1);
 expect(owner.destroy()).toEqual(result);
});
it('rejects forged constructor ownership and preserves source NULL-array stale metadata',()=>{
 const fake=Object.create(NativePropertyObjectConstruction.prototype) as NativePropertyObjectConstruction;
 expect(fake.destroy().known).toBe(false);
 const memory=new NativeMemoryAdmin(new NativeRuntimePlatform()),view=fields();
 const owner=value(NativePropertyObjectConstruction.construct(memory,view,{kind:'objectType',flag:0}));
 view.writeUnsigned(16,7);value(owner.destroy());
 expect(view.readUnsigned(16)).toBe(7);expect(view.pointer(8).get()).toBeNull();
});
