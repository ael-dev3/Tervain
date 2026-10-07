import { expect, it } from 'vitest';
import { NativePropertyTypeTable } from '../../src/gothic3/native-property-type-table';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativeMemoryAdmin, nativeNpcHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeValue } from '../../src/gothic3/dialogue';
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fields(bytes: number) {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes),
    knownMask: new Uint8Array(bytes), freed: false });
}
function fixture(count = 2) {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension] });
  const tableFields = fields(16), buckets = fields(count * 4), index = fields(4);
  for (let i = 0; i < count; i++) buckets.pointer(i * 4).set(null);
  tableFields.pointer(0).set(buckets); tableFields.writeUnsigned(4, count); tableFields.writeUnsigned(12, 0);
  const table = new NativePropertyTypeTable(tableFields, memory);
  const text = (name: string) => { const s = new NativeHeapCString(memory); value(s.allocateTextBytes(new TextEncoder().encode(name))); return s; };
  return { memory, table, tableFields, buckets, index, text };
}
it('links colliding original keys, retains allocator-provided value bytes, and returns existing storage', () => {
  const { table, tableFields, index, text } = fixture(), a = text('a'), c = text('c');
  const first = value(table.getOrInsertSlot(a, index));
  expect(index.readUnsigned(0)).toBe(1);
  // The selected allocator supplies zero bytes; insertion adds no value store.
  expect(first.pointer(0).get()).toBeNull();
  const one = {}, two = {}; first.pointer(0).set(one);
  const second = value(table.getOrInsertSlot(c, index)); second.pointer(0).set(two);
  expect(tableFields.readUnsigned(12)).toBe(2);
  expect(value(table.findSlot(a, index))!.pointer(0).get()).toBe(one);
  expect(value(table.findSlot(c, index))!.pointer(0).get()).toBe(two);
  expect(value(table.getOrInsertSlot(text('a'), index)).pointer(0).get()).toBe(one);
  expect(tableFields.readUnsigned(12)).toBe(2);
  expect(value(table.findSlot(text('e'), index))).toBeNull();
});
it('keeps the source divide-by-zero boundary and does not write the bucket output', () => {
  const { table, index, text } = fixture(0);
  expect(table.findSlot(text('a'), index).known).toBe(false);
  expect(() => index.readUnsigned(0)).toThrow();
  expect(table.findSlot(text('a'), index).known).toBe(false);
});

it('constructs the source 43-bucket table through its actual reserve allocation', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension] });
  const view = fields(16), index = fields(4);
  const table = value(NativePropertyTypeTable.construct(memory, view));
  expect(view.readUnsigned(4)).toBe(43); expect(view.readUnsigned(8)).toBe(51);
  expect(view.readUnsigned(12)).toBe(0);
  const name = new NativeHeapCString(memory); value(name.allocateTextBytes(new TextEncoder().encode('gCArena_PS')));
  const slot = value(table.getOrInsertSlot(name, index)), identity = {};
  slot.pointer(0).set(identity);
  expect(value(table.findSlot(name, index))!.pointer(0).get()).toBe(identity);
  expect(NativePropertyTypeTable.construct(memory, view).known).toBe(false);
  expect(view.readUnsigned(12)).toBe(1);
});
