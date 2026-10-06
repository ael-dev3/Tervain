import { describe, expect, it, vi } from 'vitest';
import { NativeOriginalEntityFactory } from '../../src/gothic3/entity-construction';
import type { NativeEntityConstructionHost, NativeEntityConstructionMemoryProfile } from '../../src/gothic3/entity-construction';
import { NativeSceneEntityRegistry } from '../../src/gothic3/entity-lifecycle';
import { NativeMemoryAdmin } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform, createNativeRuntimeAdminOwner } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { monotonicClockMilliseconds } from '../../src/gothic3/world-clock';
import type { NativeValue } from '../../src/gothic3/dialogue';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function fixture(memory = new NativeMemoryAdmin(new NativeRuntimePlatform()), extra: Partial<NativeEntityConstructionHost> = {},
  memoryExtra: Partial<NativeEntityConstructionMemoryProfile> = {}) {
  // Selected external SceneAdmin field capability, not a claim that its lazy
  // native constructor and five maps were bootstrapped. The factory's NULL
  // first getter branch skips its register call in these constructor tests.
  const sceneBacking = { identity: {}, bytes: new Uint8Array(0x138), knownMask: new Uint8Array(0x138).fill(255), freed: false };
  const sceneViews = new NativeHeapObjectViews(sceneBacking);
  const counter = { get value() { return sceneViews.readUnsigned(0x134); }, set value(value: number) { sceneViews.writeUnsigned(0x134, value); } };
  const guid = vi.fn((temporary: { bytes: Uint8Array; knownMask: Uint8Array }) => {
    temporary.bytes.set(Uint8Array.from({ length: 16 }, (_, i) => i + 1)); temporary.knownMask.fill(255); return known(0);
  });
  let sceneCalls = 0;
  const factory = new NativeOriginalEntityFactory('physical-constructor', {
    guid: { profile: 'selected-platform-GUID16-service', coCreateGuid: guid },
    timestamps: monotonicClockMilliseconds(() => 123), matrixIdentity: () => known(identity),
    sceneAdmin: () => ++sceneCalls === 1 ? known({ registry: new NativeSceneEntityRegistry(), constructionCounter134: counter }) : known(null),
    ...extra,
  }, { memory, defaultPropertyComparator: () => known({}), ...memoryExtra });
  return { factory, memory, guid, counter, sceneViews };
}
describe('selected original gCEntity constructor on the actual shared heap', () => {
  it('writes the same448-byte object and preserves zeroed VirtualAlloc facts', () => {
    const f = fixture(), result = f.factory.create();
    expect(result.supported).toBe(true); if (!result.supported) throw new Error(result.reason);
    const { target } = result, allocation = target.nativeAllocation!, views = target.heapFields!.views;
    expect(allocation.requestedBytes).toBe(448); expect(allocation.capacity).toBe(448);
    expect(views.bytes.buffer).toBe(allocation.region.bytes.buffer);
    expect(views.readUnsigned(0)).toBe(0x2066813c);
    expect(views.readUnsigned(8)).toBe(0x80000001); expect(views.readUnsigned(0x3c)).toBe(0x80182c);
    expect(target.data.entity.flags.knownMask).toBe(0xffffffff); expect(target.flags1bc.knownMask).toBe(0xffff);
    expect(views.readUnsigned(0x130)).toBe(0xffffffff); expect(f.counter.value).toBe(1);
    expect(views.readFloat(0x34)).toBe(1); expect(views.readFloat(0x150)).toBe(1);
    expect(views.readUnsigned(0x144)).toBe(0x30017323);
    expect(views.pointer(0x158).get()).toBe(target.data.entity); expect(views.pointer(0x138).get()).toBeNull();
    expect(views.propertyId(0x18).get()).toBe('0102030405060708090a0b0c0d0e0f1000000000');
    expect(views.propertyId(0x1a8).get()).toBe('0'.repeat(40));
    expect([...target.data.entity.propertyTypeBits]).toEqual([0, 0, 0, 0]);
    expect(views.bytes.subarray(0x1be, 0x1c0)).toEqual(new Uint8Array(2));
    expect(target.phase).toBe('factory-complete'); expect(result.worldResident).toBe(false);
    expect(f.factory.heap()[0]!.allocationProfile).toBe('shared-native-heap');
  });
  it('rereads physical scalars, arrays, flags, owner and IDs rather than mirrored values', () => {
    const f = fixture(), result = f.factory.create(); if (!result.supported) throw new Error(result.reason);
    const { target } = result, views = target.heapFields!.views;
    views.writeUnsigned(0x130, 17); expect(target.data.entity.propertyOwner.modified()).toBe(17);
    target.data.entity.referenceWord = 22; expect(views.readUnsigned(8)).toBe(22);
    views.writeFloat(0x34, 0.5); expect(target.data.numeric.get(0x34)).toBe(0.5);
    expect([...target.data.numeric].find(([offset]) => offset === 0x34)?.[1]).toBe(0.5);
    target.data.arrays.worldMatrix[2] = 7; expect(views.readFloat(0x48)).toBe(7);
    views.writeFloat(0x84, 9); expect(target.data.arrays.localMatrix[1]).toBe(9);
    target.data.entity.propertyTypeBits[2] = 13; expect(views.readUnsigned(0x19c)).toBe(13);
    target.flags1bc.value = 0x1234; expect(views.readUnsigned(0x1bc, 2)).toBe(0x1234);
    target.data.entity.propertyId20 = 'a'.repeat(40); expect(views.propertyId(0x18).get()).toBe('a'.repeat(40));
    expect(() => target.data.name = 'unowned').toThrow('CString');
    expect(() => target.data.entity.children.push(target.data.entity)).toThrow();
    expect(() => target.data.numeric.set(0x37, 0)).toThrow('Unaudited');
  });
  it('retains physical constructor stores before an unavailable imported comparator', () => {
    const f = fixture(undefined, {}, { defaultPropertyComparator: () => ({ known: false, reason: 'selected import link absent' }) });
    const result = f.factory.create(); expect(result.supported).toBe(false);
    if (result.supported) throw new Error('Expected blocked prefix');
    expect(result.reason).toContain('selected import link absent'); expect(result.partial!.phase).toBe('entity');
    expect(result.partial!.allocationProfile).toBe('shared-native-heap');
    const bytes = Uint8Array.from(result.partial!.backingBytes!), raw = new DataView(bytes.buffer);
    expect(raw.getUint32(0, true)).toBe(0x3087aa9c); expect(raw.getUint32(8, true)).toBe(1);
    expect(raw.getUint16(0x13c, true)).toBe(0); expect(raw.getUint32(0x140, true)).toBe(0);
    expect(result.partial!.initializedFields).not.toContain('frustum field0x15c');
    expect(f.guid).toHaveBeenCalledTimes(1); f.factory.create(); expect(f.guid).toHaveBeenCalledTimes(1);
    expect(f.memory.snapshot().pools.find(pool => pool.stride === 448)?.regions[0]?.used).toBe(1);
  });
  it('retains an external SceneAdmin getter boundary after the actual dynamic prefix', () => {
    const f = fixture(undefined, { sceneAdmin: () => ({ known: false, reason: 'full SceneAdmin startup unowned' }) });
    const result = f.factory.create(); expect(result.supported).toBe(false);
    if (result.supported) throw new Error('Expected blocked prefix');
    const views = new DataView(Uint8Array.from(result.partial!.backingBytes!).buffer);
    expect(views.getUint32(0, true)).toBe(0x3087b3ec); expect(views.getUint32(0x3c, true)).toBe(0x80182c);
    expect(views.getUint32(8, true)).toBe(1); expect(result.partial!.phase).toBe('dynamic');
    expect(result.reason).toContain('full SceneAdmin startup unowned');
  });
  it('shares the prior entity pool with the later runtime admin chain', () => {
    const admins = createNativeRuntimeAdminOwner(), f = fixture(admins.memory);
    const result = f.factory.create(); if (!result.supported) throw new Error(result.reason);
    expect(admins.error.getInstance().known).toBe(true);
    expect(admins.memory.snapshot().pools.find(pool => pool.stride === 448)?.regions[0]?.used).toBe(1);
    expect(admins.memory.snapshot().pointerAreaCount).toBe(3);
    expect(result.target.heapFields!.views.readUnsigned(0)).toBe(0x2066813c);
  });
});
