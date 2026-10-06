import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';

const fact = <T>(result: NativeValue<T>): T => { if (!result.known) throw new Error(result.reason); return result.value; };
const heap = (platform: NativeRuntimePlatform) => fact(platform.createWin32Heap({}, 0, 4096, 0))!;

describe('allocator-owned native pointer geometry', () => {
  it('mints geometry only for actual successful VirtualAlloc and HeapAlloc records', () => {
    const platform = new NativeRuntimePlatform();
    const virtual = fact(platform.virtualAlloc(64, 0x103000, 4))!;
    const win32 = fact(platform.win32HeapAlloc(heap(platform), 0, 19))!;
    expect(fact(platform.resolveNativePointer({ fields: new NativeHeapObjectViews(virtual), offset: 3 })).modulo4).toBe(3);
    expect(fact(platform.resolveNativePointer({ fields: new NativeHeapObjectViews(win32), offset: 5 })).modulo4).toBe(1);
    expect(win32.bytes.length).toBe(19);
    for (const generic of [fact(platform.crtMalloc(16))!, fact(platform.crtNew(16))!]) {
      expect(platform.resolveNativePointer({ fields: new NativeHeapObjectViews(generic), offset: 0 }).known).toBe(false);
    }
    const foreign = { identity: {}, bytes: new Uint8Array(64), knownMask: new Uint8Array(64), freed: false };
    expect(platform.resolveNativePointer({ fields: new NativeHeapObjectViews(foreign), offset: 0 }).known).toBe(false);
  });
  it('resolves actual pool allocation and subview offsets from the owned region', () => {
    const platform = new NativeRuntimePlatform();
    const memory = new NativeMemoryAdmin(platform, { extensions: [nativeSceneStartupHeapExtension] });
    fact(memory.getInstance());
    const allocation = fact(memory.malloc(21))!;
    expect(allocation.capacity).toBe(24);
    const fields = new NativeHeapObjectViews(allocation, 8, 13);
    const geometry = fact(platform.resolveNativePointer({ fields, offset: 4 }));
    expect(geometry.canonicalBacking).toBe(allocation.region);
    expect(geometry.offset).toBe(allocation.offset + 12);
    expect(geometry.modulo4).toBe(0);
    expect(geometry.allocationBegin).toBe(allocation.offset);
    expect(geometry.allocationEnd).toBe(allocation.offset + 24);
  });
  it('rejects copied canonical capabilities and malformed allocation aliases', () => {
    const platform = new NativeRuntimePlatform(), root = fact(platform.virtualAlloc(64, 0x103000, 4))!;
    expect(platform.resolveNativePointer({ fields: new NativeHeapObjectViews({ ...root }), offset: 0 }).known).toBe(false);
    const malformed = { identity: {}, region: root, offset: 8, capacity: 8, requestedBytes: 8,
      bytes: root.bytes.subarray(9, 17), knownMask: root.knownMask.subarray(8, 16), freed: false };
    expect(platform.resolveNativePointer({ fields: new NativeHeapObjectViews(malformed), offset: 0 }).known).toBe(false);
  });
  it('rejects replacement storage even when the outer allocation identity is retained', () => {
    const platform = new NativeRuntimePlatform(), root = fact(platform.virtualAlloc(64, 0x103000, 4))!;
    Object.defineProperty(root, 'bytes', { value: new Uint8Array(64) });
    expect(platform.resolveNativePointer({ fields: new NativeHeapObjectViews(root), offset: 0 })).toEqual({ known: false,
      reason: 'Native pointer canonical storage differs from its retained allocator proof' });
  });
  it('retains pointer geometry after free without performing a native access', () => {
    const platform = new NativeRuntimePlatform(), owner = heap(platform);
    const backing = fact(platform.win32HeapAlloc(owner, 0, 16))!, fields = new NativeHeapObjectViews(backing);
    fact(platform.win32HeapFree(owner, 0, backing));
    expect(platform.resolveNativePointer({ fields, offset: 4 }).known).toBe(true);
    expect(() => fields.readUnsigned(4)).toThrow(/freed/);
  });
  it('proves overlap direction from canonical offsets, including aliased views', () => {
    const platform = new NativeRuntimePlatform(), backing = fact(platform.virtualAlloc(64, 0x103000, 4))!;
    const input = { fields: new NativeHeapObjectViews(backing, 8, 16), offset: 0 };
    const target = { fields: new NativeHeapObjectViews(backing, 12, 16), offset: 0 };
    expect(fact(platform.proveNativeCopyDirection(target, input, 12))).toBe('backward');
    expect(fact(platform.proveNativeCopyDirection(input, target, 12))).toBe('forward');
    expect(fact(platform.proveNativeCopyDirection(input, input, 12))).toBe('forward');
    expect(platform.proveNativeCopyDirection(target, input, 100).known).toBe(false);
  });
  it('uses actual disjoint allocations without assigning pointer order or padding', () => {
    const platform = new NativeRuntimePlatform(), owner = heap(platform);
    const input = { fields: new NativeHeapObjectViews(fact(platform.win32HeapAlloc(owner, 0, 12))!), offset: 0 };
    const target = { fields: new NativeHeapObjectViews(fact(platform.win32HeapAlloc(owner, 0, 12))!), offset: 0 };
    expect(fact(platform.proveNativeCopyDirection(target, input, 12))).toBe('forward');
    expect(platform.proveNativeCopyDirection(target, input, 13)).toEqual({ known: false,
      reason: 'Distinct-root memcpy spans lack owned native nonoverlap/ordering proof' });
  });
});
