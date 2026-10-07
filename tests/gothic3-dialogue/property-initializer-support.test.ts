import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeNpcHeapExtension } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryAllocation } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativePropertyTypeConstruction } from '../../src/gothic3/native-property-type-construction';
import { NativePropertyTemplateArray } from '../../src/gothic3/native-property-template-array';

function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fixture() { return new NativeMemoryAdmin(new NativeRuntimePlatform(), { extensions: [nativeNpcHeapExtension] }); }
function fields(bytes: number, known = 0) {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes).fill(0x93),
    knownMask: new Uint8Array(bytes).fill(known), freed: false });
}
function text(memory: NativeMemoryAdmin, input: string) {
  const string = new NativeHeapCString(memory);
  value(string.allocateTextBytes(new TextEncoder().encode(input))); return string;
}
function heldEmpty(memory: NativeMemoryAdmin) {
  const string = text(memory, 'retained');
  value(string.setTextBytes(Uint8Array.of(0))); return string;
}

describe('property initializer support over original heap owners', () => {
  it('keeps pointer identity through a real moving pool reallocation and rejects the ended source', () => {
    const memory = fixture(), allocation = value(memory.newObject(12))!;
    const source = new NativeHeapObjectViews(allocation), pointer = {};
    source.pointer(0).set(pointer); source.writeUnsigned(4, 0x12345678);
    allocation.knownMask.fill(15, 8, 12);
    const bytes = allocation.bytes.slice(0, 12), masks = allocation.knownMask.slice(0, 12);
    const moved = value(memory.realloc(allocation, 36))!;
    expect(moved).not.toBe(allocation); expect(allocation.freed).toBe(true);
    const destination = new NativeHeapObjectViews(moved);
    expect(destination.pointer(0).get()).toBe(pointer);
    expect(destination.readUnsigned(4)).toBe(0x12345678);
    expect(moved.bytes.slice(0, 12)).toEqual(bytes); expect(moved.knownMask.slice(0, 12)).toEqual(masks);
    expect(() => source.pointer(0).get()).toThrow('freed');
  });
  it('does not turn partial or corrupted pointer-word copies into capabilities', () => {
    const source = fields(8), destination = fields(8), pointer = {};
    source.pointer(0).set(pointer); destination.pointer(0).set({});
    destination.copyAllocationBytesFrom(source, 3);
    expect(() => destination.pointer(0).get()).toThrow('unowned');
    destination.copyAllocationBytesFrom(source, 4);
    expect(destination.pointer(0).get()).toBe(pointer);
    source.bytes[0] = source.bytes[0]! ^ 1; destination.copyAllocationBytesFrom(source, 4);
    expect(() => destination.pointer(0).get()).toThrow('unowned');
  });
  it('retains allocated-empty strings and preserves constructor padding and aliases', () => {
    const memory = fixture(), empty = heldEmpty(memory), name = text(memory, 'HitPoints');
    const category = text(memory, 'Stats'), object = fields(24);
    const holder = empty.snapshot().allocation!;
    const owner = value(NativePropertyTypeConstruction.construct(memory, object,
      { name, propertyType: 7, named: { valueType: empty, category, flag: 1 } }));
    expect(new NativeHeapObjectViews(holder).readUnsigned(4, 2)).toBe(2);
    expect(object.readUnsigned(0)).toBe(0x100ea164); expect(object.readUnsigned(16)).toBe(7);
    expect(object.readUnsigned(20, 1)).toBe(1);
    expect([...object.bytes.slice(21)]).toEqual([0x93, 0x93, 0x93]);
    expect([...object.knownMask.slice(21)]).toEqual([0, 0, 0]);
    expect(owner.snapshot().retainedStringOwners).toBe(3);
    const alias = new NativeHeapObjectViews(object.backing);
    expect(NativePropertyTypeConstruction.construct(memory, alias, { name, propertyType: 0 }).known).toBe(false);
    value(empty.destroy()); expect(holder.freed).toBe(false);
  });
  it('distinguishes NULL from an allocated empty string and compares bytes case-sensitively', () => {
    const memory = fixture(), nil = new NativeHeapCString(memory), empty = heldEmpty(memory);
    expect(value(nil.equalsCString(empty))).toBe(0); expect(value(empty.equalsCString(nil))).toBe(0);
    expect(value(empty.equalsCString(heldEmpty(memory)))).toBe(1);
    const name = text(memory, 'gCNPC_PS');
    expect(value(name.equalsCString(text(memory, 'gCNPC_PS')))).toBe(1);
    expect(value(name.equalsCString(text(memory, 'gCNpc_PS')))).toBe(0);
  });
  it('grows the original array through real MemoryAdmin and preserves a stored property pointer', () => {
    const memory = fixture(), array = fields(12, 255);
    array.pointer(0).set(null); array.writeUnsigned(4, 0); array.writeUnsigned(8, 0);
    const owner = new NativePropertyTemplateArray(array, memory);
    value(owner.reserve(1, 0)); expect(array.readUnsigned(8)).toBe(9);
    const backing = array.pointer<NativeMemoryAllocation>(0).get()!;
    const property = {}; new NativeHeapObjectViews(backing).pointer(0).set(property);
    array.writeUnsigned(4, 9);
    value(owner.reserve(10, 0)); expect(array.readUnsigned(8)).toBe(18);
    const moved = array.pointer<NativeMemoryAllocation>(0).get()!;
    expect(new NativeHeapObjectViews(moved).pointer(0).get()).toBe(property);
    expect(new NativeHeapObjectViews(moved).readUnsigned(9 * 4)).toBe(0);
    expect(owner.snapshot().zeroFillBytes).toBe(72);
  });
  it('retains the array when singleton startup is unavailable and does not replay it', () => {
    const platform = new NativeRuntimePlatform(); let calls = 0;
    platform.registerShutdown = () => { calls++; return { known: false, reason: 'Selected shutdown registration unavailable' }; };
    const memory = new NativeMemoryAdmin(platform, { extensions: [nativeNpcHeapExtension] });
    const array = fields(12, 255);
    array.pointer(0).set(null); array.writeUnsigned(4, 0); array.writeUnsigned(8, 0);
    const before = array.bytes.slice(), masks = array.knownMask.slice();
    const owner = new NativePropertyTemplateArray(array, memory);
    expect(owner.reserve(1, 0).known).toBe(false);
    expect(array.bytes).toEqual(before); expect(array.knownMask).toEqual(masks);
    expect(owner.snapshot()).toMatchObject({ phase: 'blocked', reallocations: 0, zeroFillBytes: 0 });
    expect(owner.reserve(1, 0).known).toBe(false); expect(calls).toBe(1);
  });
});
