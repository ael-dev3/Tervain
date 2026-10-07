import { expect, it } from 'vitest';
import { NativePropertyObjectConstruction } from '../../src/gothic3/native-property-object-construction';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import type { NativeValue } from '../../src/gothic3/dialogue';

function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fields() {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(24).fill(0xaa),
    knownMask: new Uint8Array(24), freed: false });
}
it('changes only flag bit zero and leaves unknown padding untouched', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform()), view = fields();
  value(NativePropertyObjectConstruction.construct(memory, view, { kind: 'objectType', flag: 255 }));
  expect(view.readUnsigned(0)).toBe(0x100e9d6c);
  expect(view.pointer(4).get()).toBeNull(); expect(view.pointer(8).get()).toBeNull();
  expect(view.readUnsigned(12)).toBe(0); expect(view.readUnsigned(16)).toBe(0);
  expect(view.maskedWord(20, 1).value).toBe(0xab);
  expect(view.maskedWord(20, 1).knownMask).toBe(1);
  expect([...view.bytes.slice(21)]).toEqual([0xaa, 0xaa, 0xaa]);
  expect([...view.knownMask.slice(21)]).toEqual([0, 0, 0]);
  expect(NativePropertyObjectConstruction.construct(memory, view, { kind: 'objectType', flag: 0 }).known).toBe(false);
});
it('writes the factory WORD without initializing adjacent padding and copies its name owner', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform()), view = fields();
  const name = new NativeHeapCString(memory);
  value(NativePropertyObjectConstruction.construct(memory, view, { kind: 'namedFactory', name }));
  expect(view.readUnsigned(0)).toBe(0x100ea9c4);
  expect(view.pointer(4).get()).toBeNull(); expect(view.pointer(20).get()).toBeNull();
  expect(view.readUnsigned(16, 2)).toBe(1);
  expect([...view.bytes.slice(18, 20)]).toEqual([0xaa, 0xaa]);
  expect([...view.knownMask.slice(18, 20)]).toEqual([0, 0]);
});
