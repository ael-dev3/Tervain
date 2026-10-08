import { expect, it } from 'vitest';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativePropertyHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeValue } from '../../src/gothic3/dialogue';
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
it('uses original four-byte slots for zero through four-byte requests and reuses freed storage', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativePropertyHeapExtension] });
  const allocations = [0, 1, 2, 3, 4].map(bytes => value(memory.newObject(bytes, 0xed))!);
  expect(allocations.map(a => a.capacity)).toEqual([4, 4, 4, 4, 4]);
  expect(allocations.map(a => a.offset)).toEqual([16, 20, 24, 28, 32]);
  const freed = allocations[2]!; value(memory.deleteObject(freed));
  const reused = value(memory.newObject(4, 0xed))!;
  expect(reused.region).toBe(freed.region); expect(reused.offset).toBe(freed.offset);
  expect(freed.freed).toBe(true);
});
it('preserves a wrapper pointer through a real moving reallocation into the twelve-byte pool', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), {
    extensions: [nativePropertyHeapExtension, nativeNpcHeapExtension],
  });
  const wrapper = value(memory.newObject(4, 0xed))!, type = {};
  new NativeHeapObjectViews(wrapper).pointer(0).set(type);
  const moved = value(memory.realloc(wrapper, 12))!;
  expect(moved).not.toBe(wrapper); expect(wrapper.freed).toBe(true);
  expect(new NativeHeapObjectViews(moved).pointer(0).get()).toBe(type);
  value(memory.deleteObject(moved)); expect(moved.freed).toBe(true);
});
