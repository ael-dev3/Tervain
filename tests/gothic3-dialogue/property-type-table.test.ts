import { expect, it } from 'vitest';
import { NativePropertyTypeTable } from '../../src/gothic3/native-property-type-table';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativePropertyHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeValue } from '../../src/gothic3/dialogue';
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fields(bytes: number) {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes),
    knownMask: new Uint8Array(bytes), freed: false });
}
function fixture(count = 2) {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension, nativePropertyHeapExtension] });
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
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension, nativePropertyHeapExtension] });
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

it('clears collision nodes and wrappers, releases shared names, and recreates original buckets', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension, nativePropertyHeapExtension] });
  const view = fields(16), index = fields(4), table = value(NativePropertyTypeTable.construct(memory, view));
  const a = new NativeHeapCString(memory), b = new NativeHeapCString(memory);
  value(a.allocateTextBytes(new TextEncoder().encode('a')));
  value(b.allocateTextBytes(new TextEncoder().encode('a')));
  const slot = value(table.getOrInsertSlot(a, index));
  const wrapper = value(memory.newObject(4, 0xed))!; slot.pointer(0).set(wrapper);
  const buckets = view.pointer<import('../../src/gothic3/native-memory-admin').NativeMemoryAllocation>(0).get()!;
  const keyHolder = a.snapshot().allocation!;
  expect(new NativeHeapObjectViews(keyHolder).readUnsigned(4, 2)).toBe(2);
  value(table.clear());
  expect(wrapper.freed).toBe(true); expect(slot.backing.freed).toBe(true); expect(buckets.freed).toBe(true);
  expect(new NativeHeapObjectViews(keyHolder).readUnsigned(4, 2)).toBe(1);
  expect(view.readUnsigned(4)).toBe(43); expect(view.readUnsigned(8)).toBe(51); expect(view.readUnsigned(12)).toBe(0);
  expect(value(table.findSlot(b, index))).toBeNull();
  expect(() => slot.pointer(0).get()).toThrow('freed');
  value(table.clear()); expect(view.readUnsigned(4)).toBe(43);
});

it('stops on an unowned value pointer before releasing its key or node and cannot replay', () => {
  const memory = new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension, nativePropertyHeapExtension] });
  const view = fields(16), index = fields(4), table = value(NativePropertyTypeTable.construct(memory, view));
  const name = new NativeHeapCString(memory); value(name.allocateTextBytes(new TextEncoder().encode('gCArena_PS')));
  const slot = value(table.getOrInsertSlot(name, index)), unknownWrapper = {};
  slot.pointer(0).set(unknownWrapper);
  const holder = name.snapshot().allocation!;
  expect(table.clear().known).toBe(false);
  expect(slot.backing.freed).toBe(false); expect(slot.pointer(0).get()).toBe(unknownWrapper);
  expect(new NativeHeapObjectViews(holder).readUnsigned(4, 2)).toBe(2);
  expect(view.readUnsigned(12)).toBe(1);
  slot.pointer(0).set(null);
  expect(table.clear().known).toBe(false);
});

it("preserves the map destruction helper's omission of value deletion", () => {
  const { memory, text, index } = fixture(), view = fields(16);
  const table = value(NativePropertyTypeTable.construct(memory, view));
  const slot = value(table.getOrInsertSlot(text('gCArena_PS'), index));
  const wrapper = value(memory.newObject(4, 0xed))!; slot.pointer(0).set(wrapper);
  value(table.resetForDestruction());
  expect(slot.backing.freed).toBe(true); expect(wrapper.freed).toBe(false);
  expect(view.readUnsigned(4)).toBe(43); expect(view.readUnsigned(12)).toBe(0);
  value(memory.deleteObject(wrapper));
});
