import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeSceneAdminLookup, NativeSceneClassName, NativeSceneTypeInfoName } from '../../src/gothic3/native-scene-startup';
import type { NativeSceneTypeInfoHost } from '../../src/gothic3/native-scene-startup';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function text(backing: NativeMemoryBacking): string {
  const view = new NativeHeapObjectViews(backing); const bytes: number[] = [];
  for (let offset = 0; offset < backing.bytes.length; offset++) {
    const byte = view.readUnsigned(offset, 1); if (byte === 0) return String.fromCharCode(...bytes); bytes.push(byte);
  }
  throw new Error('NUL required');
}
/** The supplied demangler is an explicit selected external helper for these
 * orchestration cases; these cases do not prove ___unDName implementation. */
function fixture(overrides: Partial<NativeSceneTypeInfoHost> = {}) {
  const platform = new NativeRuntimePlatform();
  const memory = new NativeMemoryAdmin(platform, { extensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension] });
  const calls: string[] = []; let depth = 0;
  const host: NativeSceneTypeInfoHost = {
    undname: (input, flags) => {
      calls.push('undname'); expect(flags).toBe(0x2800);
      expect(input.offset).toBe(9);
      expect(String.fromCharCode(...input.fields.bytes.subarray(input.offset))).toBe('?AVeCSceneAdmin@@\0');
      const backing = value(platform.crtMalloc(22))!;
      const bytes = new TextEncoder().encode('class eCSceneAdmin   \0');
      backing.bytes.set(bytes); backing.knownMask.fill(255, 0, bytes.length);
      return known(backing);
    },
    crtMalloc: bytes => { calls.push('malloc:' + bytes); return platform.crtMalloc(bytes); },
    crtFree: backing => { calls.push('free:' + backing.bytes.length); return platform.crtFree(backing); },
    lock: id => { expect(id).toBe(14); calls.push('lock'); depth++; return known(undefined); },
    unlock: id => { expect(id).toBe(14); calls.push('unlock'); depth--; return known(undefined); },
    ...overrides,
  };
  const typeInfo = new NativeSceneTypeInfoName(host);
  const name = new NativeSceneClassName({ memory, typeInfo,
    registerShutdown: (address, owner, execute) => { calls.push('atexit:' + address); return platform.registerShutdown(address, owner, execute); } });
  return { platform, memory, typeInfo, name, calls, depth: () => depth };
}

describe('original SceneAdmin class-name startup', () => {
  it('stops at the unowned demangler without fabricating a CRT name or CString', () => {
    const f = fixture({ undname: undefined }); const result = f.name.get();
    expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('CRT.___unDName3069b26b');
    expect(f.name.fields.readUnsigned(8)).toBe(3);
    expect(f.name.fields.readUnsigned(0)).toBe(0); expect(f.name.fields.readUnsigned(4)).toBe(0);
    expect(f.typeInfo.descriptor.readUnsigned(4)).toBe(0); expect(f.typeInfo.list.readUnsigned(4)).toBe(0);
    expect(f.typeInfo.snapshot().held).toBe(false); expect(f.calls).toEqual([]);
    expect(f.memory.snapshot().trace).toEqual([]); expect(f.name.get()).toEqual(result);
  });

  it('owns the CRT cache/list and uses a distinct shared-heap21B CString holder', () => {
    const f = fixture(); const name = value(f.name.get());
    expect(value(name.text())).toBe('eCSceneAdmin');
    const cached = f.typeInfo.descriptor.pointer<NativeMemoryBacking>(4).get()!;
    expect(text(cached)).toBe('class eCSceneAdmin'); expect(cached.bytes.length).toBe(19);
    const node = f.typeInfo.list.pointer<NativeMemoryBacking>(4).get()!;
    const links = new NativeHeapObjectViews(node);
    expect(links.pointer<NativeMemoryBacking>(0).get()).toBe(cached);
    expect(links.pointer<NativeMemoryBacking>(4).get()).toBe(null);
    expect(f.calls).toEqual(['undname', 'lock', 'malloc:8', 'malloc:19', 'free:22', 'unlock', 'atexit:300184df']);
    expect(f.depth()).toBe(0); expect(f.typeInfo.snapshot().held).toBe(false);
    expect(name.snapshot().data?.allocation.requestedBytes).toBe(21);
    expect(name.snapshot().data?.allocation.capacity).toBe(24);
    const count = f.calls.length;
    expect(value(f.name.get())).toBe(name); expect(value(f.typeInfo.getName())).toBe(cached);
    expect(f.calls).toHaveLength(count);
    expect(f.name.fields.pointer<NativeHeapObjectViews>(4).get()).toBe(null);
    value(f.name.initializeCachedClassName());
    expect(f.name.initializerResult.pointer<NativeHeapObjectViews>(0).get()).toBe(name.slot);
    value(f.platform.dispose());
    expect(name.text().known).toBe(false); expect(cached.freed).toBe(false); // separate CRT-list teardown is not claimed.
    expect(f.name.snapshot().destroyed).toBe(true);
    const ended = f.name.get(); expect(ended.known).toBe(false);
    if (!ended.known) expect(ended.reason).toContain('class-name lifetime has ended');
    expect(f.name.initializeCachedClassName().known).toBe(false);
    expect(f.name.fields.readUnsigned(8)).toBe(3);
    expect(f.name.initializerResult.pointer<NativeHeapObjectViews>(0).get()).toBe(name.slot);
  });

  it('reads the prior initializer pointer before storing the first guard bit', () => {
    const f = fixture();
    f.name.initializerResult.pointer<NativeHeapObjectViews>(0).set(f.typeInfo.descriptor);
    f.name.initializerResult.bytes[0] = f.name.initializerResult.bytes[0]! ^ 1; // unavailable retained pointer capability.
    const result = f.name.get(); expect(result.known).toBe(false);
    expect(f.name.fields.readUnsigned(8)).toBe(0);
    expect(f.name.fields.readUnsigned(4)).toBe(0); expect(f.name.fields.readUnsigned(0)).toBe(0);
    expect(f.calls).toEqual([]); expect(f.memory.snapshot().trace).toEqual([]);
    expect(f.name.get()).toEqual(result);
  });

  it('latches reentry from CString heap services before registering the class-name shutdown callback', () => {
    const f = fixture(), register = f.platform.registerShutdown.bind(f.platform);
    let nested: NativeValue<unknown> | null = null;
    f.platform.registerShutdown = (address, owner, execute) => {
      if (address === '100e2710') nested = f.name.get();
      return register(address, owner, execute);
    };
    const result = f.name.get(); expect(result.known).toBe(false);
    expect(nested).toMatchObject({ known: false });
    if (!result.known) expect(result.reason).toContain('reentrant class-name initialization');
    // The earlier CString constructor completed its owned allocation prefix.
    const name = f.name.snapshot().name!, holder = name.snapshot().allocation!;
    expect(holder.requestedBytes).toBe(21); expect(holder.freed).toBe(false);
    expect(value(name.text())).toBe('eCSceneAdmin');
    expect(f.name.fields.readUnsigned(8)).toBe(3);
    expect(f.platform.snapshot().pending.map(entry => entry.address)).toEqual(['100e2710']);
    expect(f.calls).not.toContain('atexit:300184df');
    const calls = [...f.calls]; expect(f.name.get()).toEqual(result); expect(f.calls).toEqual(calls);
  });

  it('latches an attempted shutdown during registration while retaining the callback and constructed CString prefix', () => {
    const f = fixture(); let shutdownAttempt: NativeValue<void> | null = null;
    const name = new NativeSceneClassName({ memory: f.memory, typeInfo: f.typeInfo,
      registerShutdown: (address, owner, execute) => {
        shutdownAttempt = execute();
        return f.platform.registerShutdown(address, owner, execute);
      } });
    const result = name.get(); expect(result.known).toBe(false);
    expect(shutdownAttempt).toEqual({ known: false, reason: 'Class-name shutdown during startup is unowned' });
    if (!result.known) expect(result.reason).toContain('reentrant class-name initialization');
    const holder = name.snapshot().name!.snapshot().allocation!;
    expect(holder.freed).toBe(false); expect(name.snapshot().destroyed).toBe(false);
    expect(name.fields.readUnsigned(8)).toBe(3);
    expect(f.platform.snapshot().pending.map(entry => entry.address)).toEqual(['100e2710', '300184df']);
    value(f.platform.dispose());
    expect(holder.freed).toBe(true); expect(name.snapshot().destroyed).toBe(true);
    expect(name.get().known).toBe(false);
  });

  it('retains a failed shutdown Free prefix and rejects later class-name use', () => {
    const f = fixture(), name = value(f.name.get()), holder = name.snapshot().allocation!;
    f.platform.leaveCriticalSection = () => unknown('Class-name heap release outcome unavailable');
    const disposed = f.platform.dispose(); expect(disposed.known).toBe(false);
    expect(holder.freed).toBe(true);
    expect(f.name.snapshot().destroyed).toBe(false);
    expect(f.name.snapshot().boundary).toContain('Class-name heap release outcome unavailable');
    const later = f.name.get(); expect(later.known).toBe(false);
    if (!later.known) expect(later.reason).toContain('Class-name heap release outcome unavailable');
    expect(f.memory.snapshot().criticalSectionEntered).toBe(true);
    expect(f.platform.snapshot().phase).toBe('blocked');
  });

  it('returns NULL after failed CRT node allocation and still releases scratch and lock', () => {
    const f = fixture({ crtMalloc: () => known(null) });
    expect(value(f.typeInfo.getName())).toBe(null);
    expect(f.typeInfo.list.readUnsigned(4)).toBe(0); expect(f.typeInfo.descriptor.readUnsigned(4)).toBe(0);
    expect(f.calls).toEqual(['undname', 'lock', 'free:22', 'unlock']); expect(f.depth()).toBe(0);
  });

  it('publishes NULL destination before freeing the unlinked8B node on name allocation failure', () => {
    let call = 0; const allocated: NativeMemoryBacking[] = [];
    const f = fixture({ crtMalloc: bytes => {
      call++; if (call === 2) return known(null);
      const backing = { identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes), freed: false };
      allocated.push(backing); return known(backing);
    }, crtFree: backing => { backing.freed = true; return known(undefined); } });
    expect(value(f.typeInfo.getName())).toBe(null); expect(allocated[0]!.freed).toBe(true);
    expect(f.typeInfo.descriptor.readUnsigned(4)).toBe(0); expect(f.typeInfo.list.readUnsigned(4)).toBe(0);
    expect(f.typeInfo.snapshot().nodes).toEqual(allocated); expect(f.depth()).toBe(0);
  });

  it('a NULL demangler result never acquires the lock or supplies an UnMangle success', () => {
    const f = fixture({ undname: () => known(null) });
    const result = f.name.get(); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('UnMangle._strstr dereferences NULL');
    expect(f.name.fields.readUnsigned(8)).toBe(3); expect(f.calls).toEqual([]);
    expect(f.typeInfo.snapshot().held).toBe(false); expect(f.name.snapshot().name).toBe(null);
  });

  it('retains an uncertain lock acquisition and does not replay the partial helper', () => {
    const f = fixture({ lock: () => unknown('CRT lock outcome unavailable') });
    const result = f.name.get(); expect(result.known).toBe(false);
    expect(f.typeInfo.snapshot().held).toBe(null); expect(f.calls).toEqual(['undname']);
    expect(f.typeInfo.descriptor.readUnsigned(4)).toBe(0);
    expect(f.name.get()).toEqual(result); expect(f.calls).toEqual(['undname']);
  });

  it('retains a published CRT cache and uncertain release without treating startup as complete', () => {
    const f = fixture({ unlock: () => unknown('CRT unlock outcome unavailable') });
    const result = f.typeInfo.getName(); expect(result.known).toBe(false);
    expect(f.typeInfo.snapshot().held).toBe(null);
    expect(text(f.typeInfo.descriptor.pointer<NativeMemoryBacking>(4).get()!)).toBe('class eCSceneAdmin');
    const calls = [...f.calls]; expect(f.typeInfo.getName()).toEqual(result); expect(f.calls).toEqual(calls);
  });

  it('latches a reentrant helper attempt before later allocation and publication', () => {
    let reenter: () => NativeValue<NativeMemoryBacking | null>;
    const f = fixture({ undname: () => { expect(reenter().known).toBe(false); return known(null); } });
    reenter = () => f.typeInfo.getName(); const result = f.typeInfo.getName();
    expect(result.known).toBe(false); expect(f.typeInfo.descriptor.readUnsigned(4)).toBe(0);
    expect(f.typeInfo.snapshot().trace).not.toContain('crt.lock.14.attempt');
    expect(f.typeInfo.getName()).toEqual(result);
  });
});

describe('SceneAdmin.GetInstance is a cached module lookup', () => {
  function lookup(result: object | null = {}) {
    const f = fixture(); const module = {}; const calls: string[] = [];
    const lookup = new NativeSceneAdminLookup({ className: f.name,
      moduleAdmin: () => { calls.push('module'); return known(module); },
      findModule: (owner, name) => { expect(owner).toBe(module); expect(value(name.text())).toBe('eCSceneAdmin'); calls.push('find'); return known(result); },
      dynamicCast: (component, from, to) => { expect(from).toBe('eCEngineComponentBase'); expect(to).toBe('eCSceneAdmin'); calls.push('cast'); return known(component); } });
    return { ...f, lookup, moduleCalls: calls };
  }

  it('requires application byte EXACTLY1 and does no startup work for0or2', () => {
    const f = lookup(); expect(value(f.lookup.getInstance())).toBe(null);
    f.lookup.applicationInitialized.writeUnsigned(0, 2, 1);
    expect(value(f.lookup.getInstance())).toBe(null);
    expect(f.lookup.fields.readUnsigned(4)).toBe(0); expect(f.moduleCalls).toEqual([]); expect(f.calls).toEqual([]);
  });

  it('finds and caches an existing component without constructing another SceneAdmin', () => {
    const component = {}; const f = lookup(component);
    f.lookup.applicationInitialized.writeUnsigned(0, 1, 1); // explicit selected external application state.
    expect(value(f.lookup.getInstance())).toBe(component);
    expect(f.lookup.fields.readUnsigned(4)).toBe(1); expect(f.lookup.fields.pointer(0).get()).toBe(component);
    expect(f.moduleCalls).toEqual(['module', 'find', 'cast']); expect(value(f.lookup.getInstance())).toBe(component);
    expect(f.moduleCalls).toEqual(['module', 'find', 'cast']);
    expect(f.memory.snapshot().trace).not.toContain('tagged-new:348:196');
    f.lookup.applicationInitialized.writeUnsigned(0, 0, 1);
    expect(value(f.lookup.getInstance())).toBe(null); expect(f.lookup.fields.pointer(0).get()).toBe(component);
  });

  it('caches NULL results too and does not silently repeat module discovery', () => {
    const f = lookup(null); f.lookup.applicationInitialized.writeUnsigned(0, 1, 1);
    expect(value(f.lookup.getInstance())).toBe(null); expect(value(f.lookup.getInstance())).toBe(null);
    expect(f.moduleCalls).toEqual(['module', 'find', 'cast']); expect(f.lookup.fields.readUnsigned(4)).toBe(1);
    expect(f.lookup.fields.readUnsigned(0)).toBe(0);
  });

  it('retains the set lookup guard and failed dependency without replaying it', () => {
    const f = fixture({ undname: undefined }); let modules = 0;
    const lookup = new NativeSceneAdminLookup({ className: f.name,
      moduleAdmin: () => { modules++; return known({}); }, findModule: () => known(null), dynamicCast: () => known(null) });
    lookup.applicationInitialized.writeUnsigned(0, 1, 1);
    const result = lookup.getInstance(); expect(result.known).toBe(false);
    expect(lookup.fields.readUnsigned(4)).toBe(1); expect(lookup.fields.readUnsigned(0)).toBe(0);
    expect(lookup.getInstance()).toEqual(result); expect(modules).toBe(0);
  });
});
