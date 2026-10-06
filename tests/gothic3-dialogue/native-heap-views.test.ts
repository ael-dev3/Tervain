import { describe, expect, it } from 'vitest';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeMemoryAdmin } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';

function backing(bytes = 64, known = 255): NativeMemoryBacking {
  return { identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes).fill(known), freed: false };
}
describe('actual retained native heap field views', () => {
  it('creates aliases without overwriting bytes or allocation masks', () => {
    const owner = backing(32, 0); owner.bytes.fill(0x93);
    const views = new NativeHeapObjectViews(owner);
    const word = views.maskedWord(4);
    expect(word.value).toBe(0x93939393); expect(word.knownMask).toBe(0);
    word.value = (word.value & ~15) >>> 0; word.knownMask |= 15;
    expect(owner.bytes[4]).toBe(0x90); expect(owner.knownMask[4]).toBe(15);
    expect(() => views.readUnsigned(4)).toThrow('unowned backing bits');
    const zero = new NativeHeapObjectViews(backing());
    expect(zero.maskedWord(4).knownMask).toBe(0xffffffff);
  });
  it('writes physical byte, WORD and float fields at their actual widths', () => {
    const owner = backing(); owner.bytes.fill(0x73);
    const views = new NativeHeapObjectViews(owner);
    views.writeUnsigned(0, 0, 1); views.writeUnsigned(4, 0, 2); views.writeFloat(8, 1);
    expect([...owner.bytes.subarray(0, 8)]).toEqual([0, 0x73, 0x73, 0x73, 0, 0, 0x73, 0x73]);
    expect([...owner.bytes.subarray(8, 12)]).toEqual([0, 0, 0x80, 0x3f]);
    expect(() => views.writeUnsigned(0, 256, 1)).toThrow();
    expect(() => views.writeFloat(8, 0.1)).toThrow();
  });
  it('shares opaque pointer capabilities across views and rejects raw corruption', () => {
    const owner = backing(), first = new NativeHeapObjectViews(owner), alias = new NativeHeapObjectViews(owner, 4, 16);
    const value = {}; first.pointer(8).set(value);
    expect(alias.pointer(4).get()).toBe(value);
    expect([...owner.knownMask.subarray(8, 12)]).toEqual([0, 0, 0, 0]);
    owner.bytes[8] = 99;
    expect(() => first.pointer(8).get()).toThrow('backing changed');
    alias.pointer(4).set(null);
    expect(first.pointer(8).get()).toBeNull(); expect(first.readUnsigned(8)).toBe(0);
    first.writeUnsigned(8, 1);
    expect(() => alias.pointer(4).get()).toThrow('no owned browser capability');
  });
  it('aliases actual PropertyID, embedded floats and DWORD arrays in both directions', () => {
    const owner = backing(128), views = new NativeHeapObjectViews(owner);
    const id = views.propertyId(0); id.set('0123456789abcdef0123456789abcdef11223344');
    expect(owner.bytes[16]).toBe(0x11); expect(id.get()).toBe('0123456789abcdef0123456789abcdef11223344');
    const floats = views.floatArray(24, 4); floats.splice(0, 4, 1, 2, 3, 4);
    views.view.setFloat32(28, 9, true); expect(floats[1]).toBe(9);
    const dwords = views.dwordArray(48, 4); expect(dwords.fill(0xffffffff)).toBe(dwords);
    dwords[1] = 3; views.view.setUint32(56, 7, true);
    expect([...dwords]).toEqual([0xffffffff, 3, 7, 0xffffffff]);
    dwords.subarray(1, 3).set([11, 12]); expect([...dwords]).toEqual([0xffffffff, 11, 12, 0xffffffff]);
    owner.knownMask[24] = 0; expect(() => floats[0]).toThrow('unowned');
    owner.knownMask[48] = 0; expect(() => dwords[0]).toThrow('unowned');
  });
  it('rejects freed or out-of-range field access', () => {
    const owner = backing(), views = new NativeHeapObjectViews(owner);
    expect(() => views.propertyId(48)).toThrow('outside');
    owner.freed = true;
    expect(() => views.readUnsigned(0)).toThrow('freed');
    expect(() => views.pointer(0)).toThrow('freed');
  });
  it('checks retained DWORD iterators and callback aliases at every read', () => {
    const owner = backing(), views = new NativeHeapObjectViews(owner), fields = views.dwordArray(0, 4);
    fields.fill(1);
    const iterator = fields.values(); expect(iterator.next().value).toBe(1);
    let callbackArray: Uint32Array | null = null;
    fields.forEach((_value, _index, array) => { callbackArray = array; });
    expect(callbackArray).toBe(fields);
    owner.freed = true;
    expect(() => iterator.next()).toThrow('freed');
    expect(() => callbackArray![0]).toThrow('freed');
  });
  it('uses one physical pointer slot through allocation and region views', () => {
    const memory = new NativeMemoryAdmin(new NativeRuntimePlatform()), result = memory.newObject(16, 0x190);
    if (!result.known || !result.value) throw new Error('Actual source heap allocation required');
    const allocation = result.value, first = new NativeHeapObjectViews(allocation);
    const region = new NativeHeapObjectViews(allocation.region, allocation.offset, allocation.capacity);
    const one = {}, two = {};
    first.pointer(8).set(one); expect(region.pointer(8).get()).toBe(one);
    region.pointer(8).set(two); expect(first.pointer(8).get()).toBe(two);
    region.writeUnsigned(8, 0); expect(first.pointer(8).get()).toBeNull();
  });
});
