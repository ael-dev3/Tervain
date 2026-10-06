import { describe, expect, it } from 'vitest';
import { NativeReflectionController } from '../../src/gothic3/entity-reflection';
import { createNativeNavigationFactory, OriginalNavigationProperties } from '../../src/gothic3/navigation-reading';
import { createNativeNavigationState } from '../../src/gothic3/navigation-runtime';
import { NativeMemoryAdmin } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeLiveEntity, NativeLivePropertySet } from '../../src/gothic3/entity-lifecycle';
import { OriginalPropertyOwner } from '../../src/gothic3/native-properties';
import { monotonicClockMilliseconds } from '../../src/gothic3/world-clock';
import type { NativeValue } from '../../src/gothic3/dialogue';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
const request = { bytes: 16, tag: 0x190, vtable: '2068e3ec' } as const;
function fixture(owned = true) {
  const platform = new NativeRuntimePlatform();
  const memory = new NativeMemoryAdmin(platform);
  const controller = new NativeReflectionController('navigation-heap-test', {
    timestamps: monotonicClockMilliseconds(() => 42), precision: 53,
    isInPanicState: () => unknown('Actual ErrorAdmin not attached to this isolated Navigation test'),
  }, owned ? { memory } : null);
  let facadeRequests = 0;
  const host = {
    allocateNavigation: (id: string) => { facadeRequests++; return known({ state: createNativeNavigationState(id), wishes: { wishedMovementMode: 4 } }); },
    coCreateGuid: (scratch: { bytes: Uint8Array; knownMask: Uint8Array }) => {
      scratch.bytes.fill(19, 0, 16); scratch.knownMask.fill(255, 0, 16); return known(0);
    },
    ownerView: (owner: NativeLiveEntity) => known({ id: owner.identity }),
  };
  const factory = createNativeNavigationFactory(host); value(controller.registerFactory(factory));
  return { controller, memory, platform, host, factory, facadeRequests: () => facadeRequests };
}

/** Isolated lower-level storage case. It deliberately does not claim Clone
 * crossed the unowned PropertyObjectType singleton gate. The688-byte pool
 * object is allocated directly to verify the reusable physical field adapter. */
function fieldFixture() {
  const context = fixture();
  const wrapper = context.controller.allocateWrapper(context.factory, 'Game:20292300', request);
  const backing = value(context.memory.newObject(688, 0xc4))!;
  const state = createNativeNavigationState('isolated-physical-navigation');
  const wishes = { wishedMovementMode: 4 };
  const properties = new OriginalNavigationProperties(wrapper, context.host, state, wishes, backing);
  const set = new NativeLivePropertySet(wrapper.identity + ':isolated-native', 'gCNavigation_PS', 5, properties.values,
    { read: () => properties.owner, write: owner => { properties.owner = owner; } }, null,
    { added: () => unknown('Source attachment not admitted'), removed: () => unknown('Source removal not admitted'),
      postRead: () => unknown('Source PostRead not admitted') }, () => known(false));
  properties.base = set; properties.bindPhysicalBase(set); properties.initializeMembers();
  return { ...context, wrapper, backing, state, wishes, properties, set };
}

describe('explicit Navigation shared native heap profile', () => {
  it('retains the actual wrapper16 prefix and stops at the unowned lazy type service before native688', () => {
    const { controller, memory, factory, facadeRequests } = fixture();
    const clone = factory.cloneRoot(controller);
    expect(clone.known).toBe(false);
    if (!clone.known) expect(clone.reason).toContain('Navigation.PropertyObjectType.GetInstance');
    expect(facadeRequests()).toBe(0);
    const allocation = controller.allocations()[0]!;
    expect(controller.allocations()).toHaveLength(1);
    expect(allocation.nativeBacking).toBe(null); expect(allocation.nativeObject).toBe(null);
    const wrapper = allocation.wrapper;
    expect(wrapper.backing?.requestedBytes).toBe(16); expect(wrapper.backing?.capacity).toBe(16);
    expect(wrapper.heapViews!.bytes.buffer).toBe(wrapper.backing!.region.bytes.buffer);
    expect(wrapper.heapViews!.readUnsigned(0)).toBe(0x2068e3ec);
    expect(wrapper.heapViews!.readUnsigned(8)).toBe(0);
    expect(wrapper.flags.value).toBe(10); expect(wrapper.flags.knownMask).toBe(0xffffffff);
    expect(memory.snapshot().trace).toContain('tagged-new:16:400');
    expect(memory.snapshot().trace).not.toContain('tagged-new:688:196');
    expect(factory.cloneRoot(controller)).toEqual(clone);
  });

  it('does not permit a lower caller to request native688 before the actual type getter', () => {
    const { controller, memory, factory } = fixture();
    const wrapper = controller.allocateWrapper(factory, 'Game:20292300', request);
    expect(() => controller.allocateNativeBacking(wrapper, 688, 0xc4, 'Game:20291510')).toThrow('Fresh audited Navigation');
    expect(memory.snapshot().trace).not.toContain('tagged-new:688:196');
  });

  it('preserves the default logical allocation profile and its masked vector bytes', () => {
    const { controller, factory, facadeRequests } = fixture(false);
    const clone = factory.cloneRoot(controller);
    expect(clone.known).toBe(false);
    if (!clone.known) expect(clone.reason).toContain('ErrorAdmin');
    expect(facadeRequests()).toBe(1);
    const allocation = controller.allocations()[0]!;
    const properties = value(factory.properties(allocation.wrapper));
    expect(allocation.wrapper.backing).toBe(null);
    expect(allocation.wrapper.flags.knownMask).toBe(0x07ffffff);
    expect(properties.backing).toBe(null);
    expect(properties.knownMask.slice(0x1ec, 0x1f8)).toEqual(new Uint8Array(12));
    properties.values.Routine = 'selected-logical-routine';
    expect(properties.values.Routine).toBe('selected-logical-routine');
    const array = properties.arrays.get('WorkingPoints')!;
    const logicalStorage = new Uint8Array(20); array.allocation = logicalStorage;
    expect(array.allocation).toBe(logicalStorage);
  });

  it('aliases native vectors, scalar flags and wished movement to the actual688-byte pool allocation', () => {
    const { backing, properties, state, wishes } = fieldFixture();
    expect(properties.numericBytes.buffer).toBe(backing.region.bytes.buffer);
    expect(properties.numericBytes.byteOffset).toBe(backing.bytes.byteOffset);
    expect(properties.knownMask.buffer).toBe(backing.region.knownMask.buffer);
    expect(properties.knownMask.every(mask => mask === 255)).toBe(true); // allocator's known zeros remain known.
    const view = new DataView(backing.bytes.buffer, backing.bytes.byteOffset, backing.bytes.byteLength);
    state.startPositionCm = [12, 24, 36];
    expect(view.getFloat32(0x14, true)).toBe(12); expect(view.getFloat32(0x1c, true)).toBe(36);
    view.setFloat32(0x18, 72, true); expect(state.startPositionCm[1]).toBe(72);
    wishes.wishedMovementMode = 9; expect(view.getUint32(0x218, true)).toBe(9);
    view.setUint32(0x218, 3, true); expect(wishes.wishedMovementMode).toBe(3);
    state.enabled = false; expect(view.getUint8(0x1e4)).toBe(0);
    expect(state.lastUseableNavigationPositionCm).toEqual(known([0, 0, 0]));
  });

  it('aliases inherited refcount and wrapper/owner pointer slots without inventing addresses', () => {
    const { backing, properties, set, wrapper } = fieldFixture();
    const heap = properties.heapViews!;
    expect(heap.readUnsigned(0)).toBe(0x2068e8b4);
    expect(heap.readUnsigned(8)).toBe(1); expect(set.referenceWord).toBe(1);
    set.createBase(); expect(heap.readUnsigned(8)).toBe(0x80000001);
    heap.writeUnsigned(8, 0x80000003); expect(set.referenceWord).toBe(0x80000003);
    set.wrapper = wrapper; expect(heap.pointer(4).get()).toBe(wrapper);
    expect(backing.knownMask.slice(4, 8)).toEqual(new Uint8Array(4));
    const owner = new NativeLiveEntity('isolated-owner', OriginalPropertyOwner.fromConstructor('isolated-owner', 'gCEntity'), '0'.repeat(40));
    set.owner.write(owner); expect(properties.owner).toBe(owner); expect(heap.pointer(0xc).get()).toBe(owner);
    expect(backing.knownMask.slice(0xc, 0x10)).toEqual(new Uint8Array(4));
    set.owner.write(null); expect(heap.readUnsigned(0xc)).toBe(0);
    expect(set.baseFlags.value).toBe(1); expect(set.baseFlags.knownMask).toBe(255);
  });

  it('keeps embedded proxy IDs and cached internal pointers in their original native slots', () => {
    const { properties } = fieldFixture();
    const heap = properties.heapViews!, proxy = properties.proxies.get('CurrentZoneEntityProxy')!;
    expect(heap.readUnsigned(0xac)).toBe(0x3087bff4);
    expect(heap.readUnsigned(0xb0)).toBe(0); expect(heap.propertyId(0xb4).get()).toBe('0'.repeat(40));
    const id = '12345678'.repeat(4) + '00000000';
    proxy.setEntity(id, () => undefined); expect(heap.propertyId(0xb4).get()).toBe(id);
    heap.propertyId(0xb4).set('abcdef12'.repeat(4) + '00000000');
    expect(proxy.propertyID()).toBe('abcdef12'.repeat(4) + '00000000');
    const reference = { identity: 'actual-test-proxy-ref', releaseReference: () => unknown('Release not admitted') };
    proxy.internal = reference; expect(heap.pointer(0xb0).get()).toBe(reference);
    expect(properties.knownMask.slice(0xb0, 0xb4)).toEqual(new Uint8Array(4));
  });

  it('keeps cached movement capabilities in the same physical pointer slots and detects raw corruption', () => {
    const { backing, properties, state } = fieldFixture();
    const heap = properties.heapViews!;
    const movement = { getGoalReached: () => unknown('Source movement unowned'),
      stopMovement: () => unknown('Source movement unowned'), resetIsProcessing: () => unknown('Source movement unowned') };
    state.characterMovement = movement;
    expect(heap.pointer(0x1e0).get()).toBe(movement); expect(state.characterMovement).toBe(movement);
    expect(backing.knownMask.slice(0x1e0, 0x1e4)).toEqual(new Uint8Array(4));
    const view = new DataView(backing.bytes.buffer, backing.bytes.byteOffset, backing.bytes.byteLength);
    view.setUint32(0x1e0, 123, true);
    expect(() => state.characterMovement).toThrow('backing changed');
    heap.writeUnsigned(0x1e0, 0); expect(state.characterMovement).toBe(null);
    const circle = { destroyCollisionCirclePSObject: () => unknown('Source DCC unowned'), setEnabled: () => unknown('Source DCC unowned') };
    heap.pointer(0x1dc).set(circle); expect(state.dynamicCollisionCircle).toBe(circle);
    state.dynamicCollisionCircle = null; expect(heap.readUnsigned(0x1dc)).toBe(0);
  });

  it('stops nonempty CString and array ownership before exposing logical content as physical facts', () => {
    const { properties } = fieldFixture();
    const heap = properties.heapViews!, array = properties.arrays.get('WorkingPoints')!;
    expect(properties.values.Routine).toBe(''); expect(array.allocation).toBe(null);
    expect(() => { properties.values.Routine = 'not-yet-owned'; }).toThrow('CString assignment/clear service');
    expect(() => { array.allocation = new Uint8Array(20); }).toThrow('array allocation/cleanup service');
    expect(properties.values.Routine).toBe(''); expect(array.allocation).toBe(null);
    expect(heap.readUnsigned(0x5c)).toBe(0); expect(heap.readUnsigned(0x60)).toBe(0);
    heap.pointer(0x5c).set({ identity: 'external-opaque-string' });
    expect(() => properties.values.Routine).toThrow('CString contents service');
    expect(() => { properties.values.Routine = ''; }).toThrow('CString assignment/clear service');
    heap.pointer(0x60).set({ identity: 'external-opaque-array' });
    expect(() => array.allocation).toThrow('array contents service');
    expect(() => { array.allocation = null; }).toThrow('array allocation/cleanup service');
  });

  it('rejects semantic field access after actual backing release', () => {
    const { backing, memory, state, properties, set } = fieldFixture();
    const vector = state.startPositionCm;
    expect(memory.free(backing)).toEqual(known(undefined));
    expect(() => set.referenceWord).toThrow('freed');
    expect(() => { state.enabled = false; }).toThrow('freed');
    expect(() => { state.fields['0x188'] = 1; }).toThrow('freed');
    expect(() => state.characterMovement).toThrow('freed');
    expect(() => properties.values.Routine).toThrow('freed');
    expect(() => properties.arrays.get('WorkingPoints')!.allocation).toThrow('freed');
    expect(() => vector[0]).toThrow('freed');
    expect(() => properties.proxies.get('CurrentZoneEntityProxy')!.propertyID()).toThrow('freed');
  });
});
