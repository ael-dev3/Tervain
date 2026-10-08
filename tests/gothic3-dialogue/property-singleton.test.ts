import { expect, it } from 'vitest';
import { NativePropertySingleton } from '../../src/gothic3/native-property-singleton';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativePropertyHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeValue } from '../../src/gothic3/dialogue';
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fixture() {
  const platform = new NativeRuntimePlatform(), memory = new NativeMemoryAdmin(platform, {
    extensions: [nativeNpcHeapExtension, nativePropertyHeapExtension],
  });
  return { platform, memory, owner: value(NativePropertySingleton.forPlatform(platform, memory)) };
}
it('constructs once in canonical storage and runs original cleanup before MemoryAdmin shutdown', () => {
  const { platform, memory, owner } = fixture();
  const fields = value(owner.get());
  expect(fields).toBe(owner.ranges.object); expect(owner.ranges.guard.readUnsigned(0)).toBe(1);
  expect(platform.snapshot().pending.map(entry => entry.address)).toEqual(['100e2710', '100e30a0']);
  expect(value(owner.get())).toBe(fields); expect(platform.snapshot().pending.length).toBe(2);
  const pending = platform.snapshot().pending.find(entry => entry.address === '100e30a0')!;
  expect(platform.registerShutdown(pending.address, pending.owner, pending.execute).known).toBe(false);
  const table = value(owner.table()), name = new NativeHeapCString(memory);
  value(name.allocateTextBytes(new TextEncoder().encode('gCArena_PS')));
  const index = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4), freed: false });
  const slot = value(table.getOrInsertSlot(name, index)), wrapper = value(memory.newObject(4, 0xed))!;
  slot.pointer(0).set(wrapper); value(name.destroy());
  value(platform.dispose());
  expect(platform.snapshot().executed.map(entry => entry.address)).toEqual(['100e30a0', '100e2710']);
  expect(wrapper.freed).toBe(true); expect(slot.backing.freed).toBe(true);
  // Diagnostic retained bytes preserve the source guard after module unload.
  expect(owner.ranges.guard.bytes[0]).toBe(1); expect(owner.ranges.guard.backing.freed).toBe(true);
  expect(owner.get().known).toBe(false); expect(owner.table().known).toBe(false);
});
it('warm return supplies an address without fabricating completed constructor ownership', () => {
  const { owner, platform } = fixture();
  owner.ranges.guard.writeUnsigned(0, 1);
  expect(value(owner.get())).toBe(owner.ranges.object);
  expect(owner.table().known).toBe(false); expect(platform.snapshot().pending.length).toBe(0);
});
it('retains an unknown guard boundary and rejects another heap or provider identity', () => {
  const { owner, memory, platform } = fixture();
  owner.ranges.guard.maskedWord(0).knownMask = 0xfffffffe;
  expect(owner.get().known).toBe(false);
  owner.ranges.guard.maskedWord(0).knownMask = 0xffffffff;
  expect(owner.get().known).toBe(false);
  expect(platform.snapshot().pending.length).toBe(0);
  const fake = Object.create(NativeMemoryAdmin.prototype);
  Object.defineProperty(fake, 'platform', { value: platform });
  expect(NativePropertySingleton.forPlatform(platform, fake).known).toBe(false);
  expect(platform.registerShutdown('100e30a0', {}, () => ({ known: true, value: undefined })).known).toBe(false);
  expect(NativePropertySingleton.forPlatform(new NativeRuntimePlatform(), memory).known).toBe(false);
  expect(NativePropertySingleton.forPlatform(platform, new NativeMemoryAdmin(platform)).known).toBe(false);
});
