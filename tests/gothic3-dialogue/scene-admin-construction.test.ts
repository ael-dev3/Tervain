import { describe, expect, it, vi } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryAllocation } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeSceneAdminConstruction } from '../../src/gothic3/native-scene-admin';
import type { NativeSceneAdminConstructionHost, NativeConstructedSceneAdmin } from '../../src/gothic3/native-scene-admin';
import { NativeLiveEntity } from '../../src/gothic3/entity-lifecycle';
import { OriginalPropertyOwner } from '../../src/gothic3/native-properties';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function fact<T>(value: NativeValue<T>): T { if (!value.known) throw new Error(value.reason); return value.value; }
function fixture(options: { section?: boolean; globals?: boolean; module?: boolean; registeredSection?: boolean; seedUnknown?: boolean } = {}) {
  const platform = new NativeRuntimePlatform();
  const memory = new NativeMemoryAdmin(platform, { extensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension] });
  const events: string[] = []; let spinCount = 0, depth = 0;
  const globalViews = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(12), knownMask: new Uint8Array(12), freed: false });
  globalViews.writeUnsigned(0, 69); globalViews.writeUnsigned(8, 73);
  const name = new NativeHeapCString(memory, new NativeHeapObjectViews(globalViews.backing, 4, 4));
  const host: NativeSceneAdminConstructionHost = {
    memory,
    registeredSection: options.registeredSection === false ? undefined : {
      sourceAddress: '30af24f4', identity: {},
      acquire() { events.push('registered.enter'); depth++; return known(undefined); },
      release() { events.push('registered.leave'); depth--; return known(undefined); },
    },
    entitySection: options.section === false ? undefined : {
      sourceAddress: '30af23d0', identity: {},
      setSpinCount(value) { events.push('entity.spin.' + value); spinCount = value; return known(undefined); },
    },
    globals: options.globals === false ? undefined : { sourceAddress: '30adcd28', views: globalViews, name },
    getModuleAdmin: options.module === false ? undefined : () => {
      events.push('module.get');
      return known({ identity: {}, vtableRegistrationSlot: 0x74,
        registerSceneComponent(scene: NativeConstructedSceneAdmin) {
          events.push('module.register');
          expect(scene.views.readUnsigned(0)).toBe(0x3087c7dc);
          return known(undefined);
        },
      });
    },
  };
  const owner = new NativeSceneAdminConstruction(host);
  const allocate = memory.newObject.bind(memory);
  const newObject = vi.spyOn(memory, 'newObject').mockImplementation((bytes, tag) => {
    events.push('new.' + bytes + '.' + tag);
    const result = allocate(bytes, tag);
    if (options.seedUnknown && bytes === 348 && result.known && result.value) {
      result.value.bytes.fill(0xa5); result.value.knownMask.fill(0);
    }
    return result;
  });
  const reallocate = memory.realloc.bind(memory);
  const realloc = vi.spyOn(memory, 'realloc').mockImplementation((old, bytes) => {
    events.push('realloc.' + bytes); return reallocate(old, bytes);
  });
  return { owner, memory, platform, host, name, globalViews, events, newObject, realloc,
    spinCount: () => spinCount, depth: () => depth };
}

describe('physical selected SceneAdmin construction', () => {
  it('requests 348/tag 0xc4 and builds five physical 204B maps in embedded order before EntityAdmin', () => {
    const f = fixture(), scene = fact(f.owner.construct())!;
    expect(scene.allocation).toMatchObject({ requestedBytes: 348, capacity: 384, freed: false });
    expect(f.newObject).toHaveBeenCalledExactlyOnceWith(348, 0xc4);
    expect(f.realloc).toHaveBeenCalledTimes(5);
    expect(f.events).toEqual(['new.348.196', ...Array(5).fill('realloc.204'), 'entity.spin.4000', 'module.get', 'module.register']);
    expect(scene.maps.map(map => map.offset)).toEqual([0x14, 0x24, 0x34, 0x44, 0x54]);
    for (const map of scene.maps) {
      expect(map.backing).toMatchObject({ requestedBytes: 204, capacity: 224 });
      expect(map.holder.pointer(0).get()).toBe(map.backing);
      expect(scene.views.pointer(map.offset).get()).toBe(map.backing);
      expect([map.holder.readUnsigned(4), map.holder.readUnsigned(8), map.holder.readUnsigned(12)]).toEqual([43, 51, 0]);
      expect([...map.backing!.bytes.subarray(0, 204)]).toEqual(Array(204).fill(0));
    }
    expect(new Set(scene.maps.map(map => map.backing)).size).toBe(5);
    expect(f.spinCount()).toBe(4000); expect(f.depth()).toBe(0);
    expect(f.owner.snapshot().phase).toBe('ready'); expect(f.owner.snapshot().retainedAllocations).toHaveLength(6);
    expect(fact(f.owner.construct())).toBe(scene); expect(f.newObject).toHaveBeenCalledTimes(1); expect(f.realloc).toHaveBeenCalledTimes(5);
  });

  it('preserves base vtable/store order and narrow untouched fields over unknown reused heap bytes', () => {
    const f = fixture({ seedUnknown: true }), scene = fact(f.owner.construct())!, fields = scene.views;
    expect(fields.readUnsigned(0)).toBe(0x3087c7dc); expect(fields.pointer(4).get()).toBeNull(); expect(fields.readUnsigned(8)).toBe(1);
    expect([fields.readUnsigned(12, 1), fields.readUnsigned(16, 1), fields.readUnsigned(17, 1)]).toEqual([1, 1, 1]);
    for (const field of [13, 14, 15, 18, 19, 0x65, 0x66, 0x67, 0x68 + 0xc6, 0x68 + 0xc7]) {
      expect(fields.bytes[field]).toBe(0xa5); expect(fields.knownMask[field]).toBe(0);
    }
    const entity = new NativeHeapObjectViews(scene.allocation, 0x68, 0xc8);
    expect(entity.readUnsigned(0)).toBe(0x3087c154);
    expect([...entity.bytes.subarray(0x30, 0x40)]).toEqual(Array(16).fill(0xa5));
    expect([...entity.knownMask.subarray(0x30, 0x40)]).toEqual(Array(16).fill(0));
    expect([...entity.bytes.subarray(0x44, 0x84)]).toEqual(Array(64).fill(0xa5));
    expect([...entity.knownMask.subarray(0x44, 0x84)]).toEqual(Array(64).fill(0));
    expect(entity.readUnsigned(0x98)).toBe(0x04800008); expect(entity.readUnsigned(0x9c)).toBe(0x42);
    const trace = f.owner.snapshot().trace;
    expect(trace.indexOf('base.ObjectBase.1004a1c0')).toBeLessThan(trace.indexOf('base.ObjectRefBase.1004a5a0'));
    expect(trace.indexOf('base.ObjectRefBase.1004a5a0')).toBeLessThan(trace.indexOf('base.InputReceiver.30103020'));
    expect(trace.indexOf('base.InputReceiver.30103020')).toBeLessThan(trace.indexOf('base.EngineComponent.30100fe0'));
  });

  it('retains allocator zero facts in no-op fields and aliases registered nodes at actual SceneAdmin+14', () => {
    const f = fixture(), scene = fact(f.owner.construct())!;
    expect(scene.views.readUnsigned(0x68 + 0x30)).toBe(0); // Fresh VirtualAlloc fact, not a sphere constructor store.
    const registered = scene.registeredTable;
    expect(registered.holder).toBe(scene.maps[0]!.holder);
    const entity = new NativeLiveEntity('selected', OriginalPropertyOwner.fromConstructor('selected', 'gCEntity'), '0800000000000000000000000000000000000000');
    fact(registered.register(entity));
    expect(scene.views.readUnsigned(0x14 + 12)).toBe(1);
    expect(fact(registered.lookup(entity.propertyId20))).toBe(entity);
    fact(registered.unregister(entity));
    expect(scene.views.readUnsigned(0x14 + 12)).toBe(0); expect(f.depth()).toBe(0);
  });

  it('constructs tables before requiring the registration section at its first mutation', () => {
    const f = fixture({ registeredSection: false }), scene = fact(f.owner.construct())!;
    expect(scene.registeredTable.snapshot().phase).toBe('ready');
    const entity = new NativeLiveEntity('section-gate', OriginalPropertyOwner.fromConstructor('section-gate', 'gCEntity'), '00'.repeat(20));
    expect(scene.registeredTable.register(entity)).toMatchObject({ known: false, reason: expect.stringContaining('section30af24f4') });
    expect(scene.views.readUnsigned(0x20)).toBe(0); expect(f.newObject).toHaveBeenCalledTimes(1);
  });

  it('defers even the supplied registered-section getter until a source table mutation', () => {
    const f = fixture(); let reads = 0;
    Object.defineProperty(f.host, 'registeredSection', { get() { reads++; throw new Error('Actual registered section capability unavailable'); } });
    const scene = fact(f.owner.construct())!;
    expect(reads).toBe(0); expect(scene.maps).toHaveLength(5);
    const entity = new NativeLiveEntity('getter-gate', OriginalPropertyOwner.fromConstructor('getter-gate', 'gCEntity'), '00'.repeat(20));
    expect(scene.registeredTable.register(entity)).toMatchObject({ known: false, reason: expect.stringContaining('registered section capability') });
    expect(reads).toBe(1); expect(scene.views.readUnsigned(0x20)).toBe(0);
  });

  it('stops on the initialized EntityAdmin section after all five maps and Create prefix, preserving the tail', () => {
    const f = fixture({ section: false, seedUnknown: true });
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('section30af23d0') });
    const state = f.owner.snapshot(), fields = state.owner!.views;
    expect(state.maps).toHaveLength(5); expect(state.retainedAllocations).toHaveLength(6);
    expect(fields.readUnsigned(0x68 + 0x98)).toBe(0x04800008);
    expect(fields.knownMask[0x138]).toBe(0); expect(fields.knownMask[0x64]).toBe(0);
    expect(f.globalViews.readUnsigned(0)).toBe(69); expect(f.globalViews.readUnsigned(8)).toBe(73);
    const trace = state.trace;
    expect(f.owner.construct()).toMatchObject({ known: false });
    expect(f.owner.snapshot().trace).toEqual(trace); expect(f.realloc).toHaveBeenCalledTimes(5);
  });

  it('retains an external spin effect when the host reports an unknown result', () => {
    const f = fixture({ seedUnknown: true }); let applied = 0;
    f.host.entitySection!.setSpinCount = value => { applied = value; return { known: false, reason: 'Platform result unavailable after effect' }; };
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('result unavailable') });
    expect(applied).toBe(4000); expect(f.owner.snapshot().owner!.views.knownMask[0x138]).toBe(0);
    expect(f.owner.construct()).toMatchObject({ known: false }); expect(applied).toBe(4000);
  });

  it('evaluates the global gate after array zero and BYTE64, before global reset or box Invalidate', () => {
    const f = fixture({ globals: false, seedUnknown: true });
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('globals30adcd28') });
    const fields = f.owner.snapshot().owner!.views;
    expect([fields.readUnsigned(0x138), fields.readUnsigned(0x13c), fields.readUnsigned(0x140)]).toEqual([0, 0, 0]);
    expect(fields.readUnsigned(0x64, 1)).toBe(0);
    expect(fields.knownMask[0x130]).toBe(0); expect(fields.knownMask[0x144]).toBe(0);
    expect(f.globalViews.readUnsigned(8)).toBe(73); expect(f.events).not.toContain('module.get');
  });

  it('clears an existing global CString and retains ordered global/box stores before the Module gate', () => {
    const f = fixture({ module: false, seedUnknown: true });
    fact(f.name.setTextBytes(new TextEncoder().encode('original-scene-name\0')));
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('ModuleAdminGetInstance') });
    expect(f.globalViews.readUnsigned(8)).toBe(0); expect(f.globalViews.readUnsigned(0)).toBe(1);
    expect(fact(f.name.text())).toBe('');
    const fields = f.owner.snapshot().owner!.views;
    expect([fields.readUnsigned(0x130), fields.readUnsigned(0x134)]).toEqual([0, 0]);
    expect([fields.readFloat(0x144), fields.readFloat(0x148), fields.readFloat(0x14c)]).toEqual(Array(3).fill(3.4028234663852886e38));
    expect([fields.readFloat(0x150), fields.readFloat(0x154), fields.readFloat(0x158)]).toEqual(Array(3).fill(-3.4028234663852886e38));
    const trace = f.owner.snapshot().trace;
    expect(trace.indexOf('scene.global30adcd30.zero')).toBeLessThan(trace.indexOf('scene.global30adcd28.one'));
    expect(trace.indexOf('scene.global30adcd28.one')).toBeLessThan(trace.indexOf('scene.globalCString30adcd2c.Clear'));
  });

  it('rejects an unaliased global CString while preserving the supplied owner', () => {
    const f = fixture();
    Object.assign(f.host, { globals: { sourceAddress: '30adcd28', views: f.globalViews, name: new NativeHeapCString(f.memory) } });
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('aliased') });
    expect(f.globalViews.readUnsigned(8)).toBe(73); expect(f.events).not.toContain('module.get');
  });

  it('rejects same global bytes and masks when the CString slot has a different canonical owner', () => {
    const f = fixture({ seedUnknown: true });
    const disconnected = new NativeHeapObjectViews({ identity: {}, bytes: f.globalViews.bytes,
      knownMask: f.globalViews.knownMask, freed: false }, 4, 4);
    Object.assign(f.host, { globals: { sourceAddress: '30adcd28', views: f.globalViews,
      name: new NativeHeapCString(f.memory, disconnected) } });
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('aliased') });
    const fields = f.owner.snapshot().owner!.views;
    expect([fields.readUnsigned(0x138), fields.readUnsigned(0x13c), fields.readUnsigned(0x140)]).toEqual([0, 0, 0]);
    expect(fields.readUnsigned(0x64, 1)).toBe(0); expect(fields.knownMask[0x130]).toBe(0);
    expect(f.globalViews.readUnsigned(0)).toBe(69); expect(f.globalViews.readUnsigned(8)).toBe(73);
    expect(f.events).not.toContain('module.get');
  });

  it('rejects a detached CString mask buffer even when bytes and canonical owner match', () => {
    const f = fixture({ seedUnknown: true });
    const disconnected = new NativeHeapObjectViews({ identity: f.globalViews.backing.identity,
      bytes: f.globalViews.bytes, knownMask: new Uint8Array(12), freed: false }, 4, 4);
    Object.assign(f.host, { globals: { sourceAddress: '30adcd28', views: f.globalViews,
      name: new NativeHeapCString(f.memory, disconnected) } });
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('aliased') });
    const fields = f.owner.snapshot().owner!.views;
    expect(fields.readUnsigned(0x138)).toBe(0); expect(fields.readUnsigned(0x64, 1)).toBe(0);
    expect(fields.knownMask[0x130]).toBe(0); expect(fields.knownMask[0x144]).toBe(0);
    expect(f.globalViews.readUnsigned(0)).toBe(69); expect(f.globalViews.readUnsigned(8)).toBe(73);
    expect(f.events).not.toContain('module.get');
  });

  it('keeps global reset stores when the CString Clear service blocks before box and module effects', () => {
    const f = fixture({ seedUnknown: true });
    vi.spyOn(f.name, 'clear').mockReturnValue({ known: false, reason: 'Selected global CString owner failed after its retained prefix' });
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('global CString owner failed') });
    expect(f.globalViews.readUnsigned(8)).toBe(0); expect(f.globalViews.readUnsigned(0)).toBe(1);
    expect(f.owner.snapshot().owner!.views.knownMask[0x130]).toBe(0);
    expect(f.owner.snapshot().owner!.views.knownMask[0x144]).toBe(0);
    expect(f.events).not.toContain('module.get');
    f.owner.construct(); expect(f.name.clear).toHaveBeenCalledTimes(1);
  });

  it('returns a NULL allocation before constructor stores, map allocations or startup calls', () => {
    const f = fixture(); f.newObject.mockReturnValue(known(null));
    expect(f.owner.construct()).toEqual(known(null)); expect(f.owner.snapshot().phase).toBe('null');
    expect(f.owner.snapshot().owner).toBeNull(); expect(f.realloc).not.toHaveBeenCalled();
    expect(fact(f.owner.construct())).toBeNull(); expect(f.newObject).toHaveBeenCalledTimes(1);
  });

  it('keeps first map NULL publication and stops before subsequent constructors', () => {
    const f = fixture({ seedUnknown: true }); f.realloc.mockReturnValueOnce(known(null));
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('NULL') });
    const state = f.owner.snapshot(), fields = state.owner!.views;
    expect(state.maps).toHaveLength(1); expect(state.maps[0]!.backing).toBeNull();
    expect(fields.pointer(0x14).get()).toBeNull(); expect(fields.readUnsigned(0x1c)).toBe(0);
    expect(fields.knownMask[0x24]).toBe(0); expect(f.realloc).toHaveBeenCalledTimes(1);
  });

  it('keeps later map NULL publication and earlier owned tables at the failed map', () => {
    const f = fixture({ seedUnknown: true });
    // Capture the real implementation before replacing the existing spy.
    const original = f.realloc.getMockImplementation()!; let calls = 0;
    f.realloc.mockImplementation((old, bytes) => ++calls === 3 ? known(null) : original(old, bytes));
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('+34') });
    const state = f.owner.snapshot();
    expect(state.maps.map(map => map.offset)).toEqual([0x14, 0x24, 0x34]);
    expect(state.maps[0]!.backing).not.toBeNull(); expect(state.maps[1]!.backing).not.toBeNull();
    expect(state.owner!.views.pointer(0x34).get()).toBeNull(); expect(state.owner!.views.knownMask[0x44]).toBe(0);
    expect(f.realloc).toHaveBeenCalledTimes(3); expect(f.events).not.toContain('entity.spin.4000');
  });

  it('stops reentrant callbacks at the applied allocation before following stores', () => {
    const f = fixture({ seedUnknown: true }), original = f.newObject.getMockImplementation()!;
    f.newObject.mockImplementation((bytes, tag) => {
      const result = original(bytes, tag); expect(f.owner.construct()).toMatchObject({ known: false }); return result;
    });
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('reentrant') });
    const state = f.owner.snapshot(); expect(state.allocation).not.toBeNull(); expect(state.owner).toBeNull();
    expect([...state.allocation!.knownMask.subarray(0, 20)]).toEqual(Array(20).fill(0));
    expect(f.owner.construct()).toMatchObject({ known: false }); expect(f.newObject).toHaveBeenCalledTimes(1);
  });

  it('stops reentry inside the first map memory callback before Realloc and following writes', () => {
    const f = fixture({ seedUnknown: true }), get = f.memory.getInstance.bind(f.memory); let calls = 0;
    vi.spyOn(f.memory, 'getInstance').mockImplementation(() => {
      const result = get();
      // newObject firstcallsGetInstance; selectedfirstmapcallsitafterbase.
      if (++calls === 2) expect(f.owner.construct()).toMatchObject({ known: false });
      return result;
    });
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('reentrant') });
    expect(f.owner.snapshot().owner!.views.pointer(0x14).get()).toBeNull();
    expect(f.realloc).not.toHaveBeenCalled(); expect(f.owner.snapshot().owner!.views.knownMask[0x24]).toBe(0);
  });

  it('keeps the section effect from reentry and stops all source tail stores', () => {
    const f = fixture({ seedUnknown: true }); let count = 0;
    f.host.entitySection!.setSpinCount = () => { count++; f.owner.construct(); return known(undefined); };
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('reentrant') });
    expect(count).toBe(1); expect(f.owner.snapshot().owner!.views.knownMask[0x138]).toBe(0);
    expect(f.owner.construct()).toMatchObject({ known: false }); expect(count).toBe(1);
  });

  it('latches Module NULL dereference and registration failure after the physical prefix', () => {
    const f = fixture(); f.host.getModuleAdmin = () => known(null);
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('NULL ModuleAdmin') });
    expect(f.owner.snapshot().owner!.views.readUnsigned(0x138)).toBe(0);
    const failing = fixture(); let registrations = 0;
    failing.host.getModuleAdmin = () => known({ identity: {}, vtableRegistrationSlot: 0x74,
      registerSceneComponent() { registrations++; return { known: false, reason: 'Module vtable service unowned after selected effect' }; } });
    expect(failing.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('Module vtable') });
    expect(failing.owner.construct()).toMatchObject({ known: false }); expect(registrations).toBe(1);
  });

  it('rejects retained field access after the Scene allocation is freed', () => {
    const f = fixture(), scene = fact(f.owner.construct())!, cached = scene.views.maskedWord(0x64, 1);
    fact(f.memory.deleteObject(scene.allocation));
    expect(() => scene.views.readUnsigned(0)).toThrow('freed'); expect(() => cached.value).toThrow('freed');
    expect(f.owner.construct()).toMatchObject({ known: false, reason: expect.stringContaining('lifetime') });
    expect(f.newObject).toHaveBeenCalledTimes(1);
  });

  it('rejects freed map backing during table lookup while the Scene allocation stays live', () => {
    const f = fixture(), scene = fact(f.owner.construct())!, backing = scene.maps[0]!.backing as NativeMemoryAllocation;
    fact(f.memory.deleteObject(backing));
    expect(scene.allocation.freed).toBe(false);
    expect(scene.registeredTable.lookup('00'.repeat(20))).toMatchObject({ known: false, reason: expect.stringContaining('freed') });
  });
});
