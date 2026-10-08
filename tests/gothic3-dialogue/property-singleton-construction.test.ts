import { expect, it } from 'vitest';
import { NativePropertySingletonConstruction } from '../../src/gothic3/native-property-singleton-construction';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativePropertyHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import type { NativeValue } from '../../src/gothic3/dialogue';
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fields(bytes: number) {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes).fill(0x93),
    knownMask: new Uint8Array(bytes), freed: false });
}
it('performs the original table construction, clear and growth while preserving base padding', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension, nativePropertyHeapExtension] });
  const view = fields(28), owner = value(NativePropertySingletonConstruction.construct(memory, view));
  expect(view.readUnsigned(0)).toBe(0x100eb390); expect(view.readUnsigned(4, 1)).toBe(1);
  expect([...view.bytes.slice(5, 8)]).toEqual([0x93, 0x93, 0x93]);
  expect([...view.knownMask.slice(5, 8)]).toEqual([0, 0, 0]);
  expect(view.pointer(8).get()).toBeNull();
  expect(view.readUnsigned(16)).toBe(359); expect(view.readUnsigned(20)).toBe(367);
  expect(view.readUnsigned(24)).toBe(0);
  expect(memory.snapshot().trace.filter(event => event.startsWith('pool-count:'))).toEqual([
    'pool-count:224:1', 'pool-count:224:1', 'pool-count:1536:1',
  ]);
  const name = new NativeHeapCString(memory); value(name.allocateTextBytes(new TextEncoder().encode('gCArena_PS')));
  const index = fields(4), slot = value(owner.table.getOrInsertSlot(name, index));
  const wrapper = value(memory.newObject(4, 0xed))!; slot.pointer(0).set(wrapper);
  expect(value(owner.table.findSlot(name, index))!.pointer(0).get()).toBe(wrapper);
  expect(NativePropertySingletonConstruction.construct(memory, view).known).toBe(false);
  expect(view.readUnsigned(24)).toBe(1);
});

it('destroys the singleton through both table resets and the actual final storage free', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension, nativePropertyHeapExtension] });
  const view = fields(28), owner = value(NativePropertySingletonConstruction.construct(memory, view));
  const name = new NativeHeapCString(memory); value(name.allocateTextBytes(new TextEncoder().encode('gCArena_PS')));
  const index = fields(4), slot = value(owner.table.getOrInsertSlot(name, index));
  const wrapper = value(memory.newObject(4, 0xed))!; slot.pointer(0).set(wrapper);
  value(owner.destroy());
  expect(wrapper.freed).toBe(true); expect(slot.backing.freed).toBe(true);
  expect(owner.snapshot().phase).toBe('destroyed'); expect(view.pointer(12).get()).toBeNull();
  expect(view.readUnsigned(16)).toBe(0); expect(view.readUnsigned(20)).toBe(0); expect(view.readUnsigned(24)).toBe(0);
  expect(memory.snapshot().pools.find(pool => pool.stride === 224)!.count).toBe(0);
  expect(memory.snapshot().pools.find(pool => pool.stride === 1536)!.count).toBe(0);
  expect(owner.table.findSlot(name, index).known).toBe(false);
  expect(owner.destroy().known).toBe(false);
});
