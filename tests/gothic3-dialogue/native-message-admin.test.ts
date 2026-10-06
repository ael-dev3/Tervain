import { describe, expect, it } from 'vitest';
import { NativeMessageAdminModule } from '../../src/gothic3/native-message-admin';
import type { NativeMessageAdminHost } from '../../src/gothic3/native-message-admin';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeMemoryAdmin } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryBacking, NativeMemoryPlatform, NativeMemoryRegion } from '../../src/gothic3/native-memory-admin';
import type { NativeMessageCallback, NativeMessageCallbackArguments } from '../../src/gothic3/native-message-admin';
import { createNativeRuntimeAdminOwner, NativeRuntimeDiagnostics, NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });

/** These prefix cases never fabricate a native heap: allocations are either an
 * explicit unknown prerequisite or the source-permitted NULL return. Complete
 * startup cases below use the concrete native MemoryAdmin when connected. */
function prefixHost() {
  const calls: string[] = [];
  const sections: { address: string; owner: object; deleted: boolean }[] = [];
  const host: NativeMessageAdminHost = {
    memory: {
      getInstance: () => unknown('Unowned native MemoryAdmin'),
      newObject: (size, tag) => { calls.push('new.' + size + '.' + tag); return unknown('Unowned native MemHeap pool'); },
      realloc: () => unknown('Unowned native backing Realloc'),
      free: () => unknown('Unowned native backing Free'),
      deleteObject: () => unknown('Unowned native holder DeleteObject'),
    },
    initializeCriticalSection: (address, owner) => {
      const section = { address, owner, deleted: false }; sections.push(section); calls.push('section.' + address);
      return known(section);
    },
    deleteCriticalSection: section => {
      const actual = sections.find(value => value === section);
      if (!actual || actual.deleted) return unknown('Actual live section required');
      actual.deleted = true; return known(undefined);
    },
    registerShutdown: () => unknown('No source shutdown registration reached in this prefix'),
    getErrorAdminForMessageBootstrap: () => { calls.push('error.bootstrap'); return unknown('Unowned ErrorAdmin'); },
    diagnostics: {
      findWindow: () => unknown('No diagnostic observation reached'),
      fopen: () => unknown('No diagnostic observation reached'),
    },
  };
  return { host, calls, sections };
}

describe('source SharedBase MessageAdmin retained cold prefix', () => {
  it('owns the exact cold singleton extents with original PE zero-fill masks', () => {
    const { host } = prefixHost();
    const module = new NativeMessageAdminModule(host);
    for (const storage of [module.storage, module.guard, module.spy, module.spyGuard,
      module.spie, module.spieGuard, module.spieEnabled]) {
      expect(storage.bytes.every(value => value === 0)).toBe(true);
      expect(storage.knownMask.every(value => value === 255)).toBe(true);
    }
    expect(module.storage.bytes).toHaveLength(32);
    expect(module.spy.bytes).toHaveLength(32);
    expect(module.spie.bytes).toHaveLength(28);
    expect(module.spie.uint(24)).toBe(0); // INVALID_SOCKET is a source getter write, not a cold-image seed.
    expect(module.snapshot().phase).toBe('cold');
  });

  it('writes the lazy guard before the first unresolved critical-section service', () => {
    const { host, calls } = prefixHost();
    host.initializeCriticalSection = () => { calls.push('section.unowned'); return unknown('CS service unavailable'); };
    const module = new NativeMessageAdminModule(host);
    const first = module.getInstance();
    expect(first).toEqual(unknown('MessageAdmin.InitializeCriticalSection: CS service unavailable'));
    expect(module.guard.uint(0)).toBe(1);
    expect(module.storage.uint(28)).toBe(0); // source filter initialization comes after CS.
    expect(module.storage.knownMask.every(value => value === 255)).toBe(true);
    expect(module.getInstance()).toEqual(first);
    expect(calls).toEqual(['section.unowned']);
    expect(module.spyGuard.uint(0)).toBe(0);
  });

  it('retains actual section ownership, filter1 and NULL holder at the native heap boundary', () => {
    const { host, calls, sections } = prefixHost();
    const module = new NativeMessageAdminModule(host);
    const first = module.getInstance();
    expect(first).toEqual(unknown('MessageAdmin.Create holder allocation: Unowned native MemHeap pool'));
    expect(module.guard.uint(0)).toBe(1);
    expect(module.storage.uint(0)).toBe(0);
    expect(module.storage.uint(28)).toBe(1);
    expect(module.storage.knownMask.slice(4, 28).every(value => value === 0)).toBe(true);
    expect(sections).toEqual([{ address: '10197d70', owner: module.storage, deleted: false }]);
    expect(calls).toEqual(['section.10197d70', 'new.12.227']);
    expect(module.snapshot().holder).toBe(null);
    expect(module.snapshot().count).toBe(0);
    expect(module.getInstance()).toEqual(first);
    expect(calls).toHaveLength(2);
  });

  it('does execute ErrorAdmin bootstrap even when the native new returned NULL', () => {
    const { host, calls } = prefixHost();
    host.memory.newObject = (size, tag) => { calls.push('new.' + size + '.' + tag); return known(null); };
    const module = new NativeMessageAdminModule(host);
    expect(module.getInstance()).toEqual(unknown('MessageAdmin.Create ErrorAdmin bootstrap: Unowned ErrorAdmin'));
    expect(calls).toEqual(['section.10197d70', 'new.12.227', 'error.bootstrap']);
    expect(module.snapshot().trace).toEqual(['message.guard', 'message.holder.create']);
    expect(module.snapshot().holder).toBe(null);
    expect(module.spyGuard.uint(0)).toBe(0);
  });

  it('source guard reentry returns the same in-progress owner only before a blocked dependency', () => {
    const { host, calls } = prefixHost();
    host.memory.newObject = () => known(null);
    let module: NativeMessageAdminModule;
    host.getErrorAdminForMessageBootstrap = () => {
      expect(module.getInstance()).toEqual(known(module));
      calls.push('source.bootstrap.reentry'); return unknown('Error continuation unavailable');
    };
    module = new NativeMessageAdminModule(host);
    const stopped = module.getInstance();
    expect(stopped.known).toBe(false);
    expect(module.getInstance()).toEqual(stopped);
    expect(calls).toEqual(['section.10197d70', 'source.bootstrap.reentry']);
  });

  it('NULL holder remains an actual attachment boundary rather than an empty success registry', () => {
    const { host, calls } = prefixHost();
    const actualError = {};
    host.memory.newObject = () => known(null);
    host.getErrorAdminForMessageBootstrap = () => known(actualError);
    const module = new NativeMessageAdminModule(host);
    const result = module.getInstance();
    expect(result).toEqual(unknown('Source RegisterCallback dereferences a NULL callback holder'));
    expect(module.spyGuard.uint(0)).toBe(1);
    expect(module.spy.uint(24)).toBe(0);
    expect(module.spy.uint(28)).toBe(0);
    expect(module.spieGuard.uint(0)).toBe(0);
    expect(module.snapshot().spyPhase).toBe('blocked');
    expect(calls).toEqual(['section.10197d70', 'section.101ab11c']);
    expect(module.registerCallback(module.spyCallback, 1, module.spy)).toEqual(result);
  });
});

/** Concrete selected allocation/lock/window/file platform. JS buffers replace
 * VirtualAlloc/CRT primitives; NativeMemoryAdmin still executes the native pool
 * metadata, bitmap, region ordering, Realloc and Free algorithms. */
function integratedHost() {
  const regions: NativeMemoryRegion[] = [];
  const crt: NativeMemoryBacking[] = [];
  const sections = new Map<string, { address: string; owner: object; deleted: boolean; depth: number }>();
  const pending: { address: string; owner: object; execute: () => NativeValue<void> }[] = [];
  const observations: string[] = [];
  const windows = new Map<string, object>();
  const files = new Map<string, object>();
  const initialize = (address: string, owner: object) => {
    if (sections.has(address)) return unknown('Platform section already exists');
    const section = { address, owner, deleted: false, depth: 0 }; sections.set(address, section); return known(section);
  };
  const register = (address: string, owner: object, execute: () => NativeValue<void>) => {
    pending.push({ address, owner, execute }); return known(0);
  };
  const platform: NativeMemoryPlatform = {
    virtualAlloc: (bytes, type, protect) => {
      if (type !== 0x103000 || protect !== 4) return unknown('Selected VirtualAlloc profile differs');
      const region: NativeMemoryRegion = { identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes).fill(255), freed: false };
      regions.push(region); return known(region);
    },
    crtNew: bytes => {
      const backing: NativeMemoryBacking = { identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes), freed: false };
      crt.push(backing); return known(backing);
    },
    crtFree: backing => {
      if (!crt.includes(backing) || backing.freed) return unknown('Actual live CRT allocation required');
      backing.freed = true; return known(undefined);
    },
    compareRegions: (a, b) => {
      const ai = regions.indexOf(a), bi = regions.indexOf(b);
      return ai < 0 || bi < 0 ? unknown('Actual retained region ordering required') : known(ai - bi);
    },
    initializeCriticalSection: (address, owner, spin) => {
      if (spin !== 1000) return unknown('Native heap spin count differs');
      const section = initialize(address, owner); return section.known ? known(1) : section;
    },
    enterCriticalSection: (address, owner) => {
      const section = sections.get(address);
      if (!section || section.owner !== owner || section.deleted) return unknown('Actual heap critical section required');
      section.depth++; return known(undefined);
    },
    leaveCriticalSection: (address, owner) => {
      const section = sections.get(address);
      if (!section || section.owner !== owner || section.deleted || section.depth !== 1) return unknown('Actual entered heap section required');
      section.depth--; return known(undefined);
    },
    registerShutdown: register,
    // A nonempty default CString would need a real owner. NativeMemoryAdmin
    // admits the source cold NULL branch internally, without this callback.
    clearDefaultCString: () => unknown('Default CString lifetime not supplied by this Message test fixture'),
  };
  const memory = new NativeMemoryAdmin(platform);
  const bootstrapOwner = {};
  const host: NativeMessageAdminHost = {
    memory, initializeCriticalSection: initialize,
    deleteCriticalSection: capability => {
      const section = [...sections.values()].find(value => value === capability);
      if (!section || section.deleted || section.depth !== 0) return unknown('Actual live nonentered section required');
      section.deleted = true; return known(undefined);
    },
    registerShutdown: register,
    getErrorAdminForMessageBootstrap: () => known(bootstrapOwner),
    diagnostics: {
      findWindow: (className, title) => { observations.push('window.' + className + '.' + title); return known(windows.get(title) ?? null); },
      fopen: (path, mode) => { observations.push('file.' + path + '.' + mode); return known(files.get(path) ?? null); },
    },
  };
  return { host, memory, regions, sections, pending, observations, windows, files, bootstrapOwner };
}
const callback = (address: string): NativeMessageCallback => ({ address, invoke: () => unknown('Unported test callback body') });
const messageArgs: Omit<NativeMessageCallbackArguments, 'userData' | 'priority'> = {
  type: 3, message: 'Source diagnostic', description: null, sourceFile: null, line: 0,
};
const uint = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at, true);

describe('source MessageAdmin callback ownership with actual native MemoryAdmin', () => {
  it('completes disabled diagnostics startup, retains physical callback storage and registers source shutdown order', () => {
    const { host, memory, observations, pending, regions } = integratedHost();
    const module = new NativeMessageAdminModule(host);
    expect(module.getInstance()).toEqual(known(module));
    const snapshot = module.snapshot();
    expect(snapshot.phase).toBe('ready');
    expect(snapshot.spyPhase).toBe('ready'); expect(snapshot.spiePhase).toBe('ready');
    expect(snapshot.count).toBe(1); expect(snapshot.capacity).toBe(9);
    expect(snapshot.holder?.requestedBytes).toBe(12); expect(snapshot.holder?.capacity).toBe(12);
    expect(snapshot.backing?.requestedBytes).toBe(108); expect(snapshot.backing?.capacity).toBe(112);
    expect(regions).toContain(snapshot.holder?.region); expect(regions).toContain(snapshot.backing?.region);
    const holder = snapshot.holder!, backing = snapshot.backing!;
    expect(holder.bytes.buffer).toBe(holder.region.bytes.buffer);
    expect(backing.bytes.buffer).toBe(backing.region.bytes.buffer);
    expect(uint(holder.bytes, 4)).toBe(1); expect(uint(holder.bytes, 8)).toBe(9);
    expect(holder.knownMask.slice(0, 4)).toEqual(new Uint8Array(4));
    expect(uint(backing.bytes, 0)).toBe(0x10008c06);
    expect(backing.knownMask.slice(0, 4)).toEqual(new Uint8Array(4).fill(255));
    expect(backing.knownMask.slice(4, 8)).toEqual(new Uint8Array(4));
    expect(uint(backing.bytes, 8)).toBe(1);
    expect(snapshot.callbacks[0]?.userData).toBe(module.spy);
    expect(module.spie.uint(24)).toBe(0xffffffff);
    expect(module.spieEnabled.bytes[0]).toBe(0);
    expect(observations).toEqual(['window.null.[zSpy]', 'file.zSpie.txt.r']);
    expect(pending.map(entry => entry.address)).toEqual(['100e2710', '100e2890', '100e2830', '100e27d0']);
    expect(memory.snapshot().blockedReason).toBe(null);
    expect(module.getInstance()).toEqual(known(module));
    expect(pending).toHaveLength(4); expect(observations).toHaveLength(2);
  });

  it('executes exact disabled callback prefixes, with enabled logging still explicit unknown', () => {
    const { host } = integratedHost();
    const module = new NativeMessageAdminModule(host);
    expect(module.getInstance().known).toBe(true);
    expect(module.invokeRegistered('10008c06', messageArgs)).toEqual(known(false));
    expect(module.spieCallback.invoke({ ...messageArgs, userData: module.spie, priority: 1 })).toEqual(known(true));
    expect(module.invokeRegistered('10005722', messageArgs).known).toBe(false); // source disabled branch did not register Spie.
    module.spieEnabled.bytes[0] = 1;
    expect(module.spieCallback.invoke({ ...messageArgs, userData: module.spie, priority: 1 }))
      .toEqual(unknown('Spie callback active bCString/packet formatting and socket send path is unported'));
    expect(module.spieCallback.invoke({ ...messageArgs, message: null, userData: module.spie, priority: 1 })).toEqual(known(false));
  });

  it('registers source records without reordered priorities and rejects a duplicate callback address', () => {
    const { host } = integratedHost();
    const module = new NativeMessageAdminModule(host); expect(module.getInstance().known).toBe(true);
    const owner = {}, first = callback('12345678'), second = callback('12345679');
    expect(module.registerCallback(first, 8, owner)).toEqual(known(1));
    expect(module.registerCallback(second, 2, null)).toEqual(known(1));
    expect(module.registerCallback(callback('12345678'), 99, {})).toEqual(known(0));
    const snapshot = module.snapshot(), backing = snapshot.backing!;
    expect(snapshot.count).toBe(3); expect(snapshot.capacity).toBe(9);
    expect(snapshot.callbacks.map(record => [record.callback.address, record.priority])).toEqual([
      ['10008c06', 1], ['12345678', 8], ['12345679', 2],
    ]);
    expect(snapshot.callbacks[1]?.userData).toBe(owner);
    expect(uint(backing.bytes, 12)).toBe(0x12345678); expect(uint(backing.bytes, 20)).toBe(8);
    expect(backing.knownMask.slice(16, 20)).toEqual(new Uint8Array(4));
    expect(uint(backing.bytes, 28)).toBe(0); expect(backing.knownMask.slice(28, 32)).toEqual(new Uint8Array(4).fill(255));
  });

  it('performs native tail memmove including masks and leaves the old final tail untouched', () => {
    const { host } = integratedHost();
    const module = new NativeMessageAdminModule(host); expect(module.getInstance().known).toBe(true);
    const a = callback('12345678'), b = callback('12345679'), bOwner = {};
    expect(module.registerCallback(a, 8, null)).toEqual(known(1));
    expect(module.registerCallback(b, 2, bOwner)).toEqual(known(1));
    const backing = module.snapshot().backing!, tail = backing.bytes.slice(24, 36), tailMask = backing.knownMask.slice(24, 36);
    expect(module.unregisterCallback(a)).toEqual(known(1));
    expect(module.snapshot().count).toBe(2); expect(module.snapshot().capacity).toBe(9);
    expect(backing.bytes.slice(12, 24)).toEqual(tail);
    expect(backing.knownMask.slice(12, 24)).toEqual(tailMask);
    expect(backing.bytes.slice(24, 36)).toEqual(tail);
    expect(module.snapshot().callbacks[1]?.callback).toBe(b);
    expect(module.snapshot().callbacks[1]?.userData).toBe(bOwner);
    expect(module.unregisterCallback(a)).toEqual(known(0));
  });

  it('executes the source MessageBox warning before rejecting any subsequent callback after priority0', () => {
    const { host } = integratedHost();
    const warnings: unknown[][] = [];
    host.diagnostics.messageBox = (...args) => { warnings.push(args); return known(6); };
    const module = new NativeMessageAdminModule(host); expect(module.getInstance().known).toBe(true);
    const zero = callback('12345678');
    expect(module.registerCallback(zero, 0, null)).toEqual(known(1));
    expect(module.registerCallback(callback('12345679'), 1, null)).toEqual(known(0));
    expect(warnings).toEqual([['100e7d70', 'bCMessageAdmin::RegisterCallback', 0x30]]);
    expect(module.snapshot().count).toBe(2);
    expect(module.registerCallback(zero, 1, null)).toEqual(known(0));
    expect(warnings).toHaveLength(1); // duplicate check precedes priority0 warning.
  });

  it('runs nonempty Message→Spie→Spy callbacks over their same owners and keeps lazy guards', () => {
    const { host, pending, sections } = integratedHost();
    const module = new NativeMessageAdminModule(host); expect(module.getInstance().known).toBe(true);
    const { holder, backing } = module.snapshot();
    const shutdown = pending.slice(1).reverse();
    expect(shutdown.map(entry => entry.address)).toEqual(['100e27d0', '100e2830', '100e2890']);
    for (const entry of shutdown) expect(entry.execute()).toEqual(known(undefined));
    expect(holder?.freed).toBe(true); expect(backing?.freed).toBe(true);
    expect(module.snapshot().holder).toBe(null); expect(module.snapshot().backing).toBe(null);
    expect(module.snapshot().count).toBe(0); expect(module.snapshot().capacity).toBe(0);
    expect(module.guard.uint(0)).toBe(1); expect(module.spyGuard.uint(0)).toBe(1); expect(module.spieGuard.uint(0)).toBe(1);
    expect(module.storage.uint(0)).toBe(0); expect(module.storage.uint(28)).toBe(1);
    expect(module.spie.uint(24)).toBe(0xffffffff); expect(module.spy.uint(24)).toBe(0); expect(module.spy.uint(28)).toBe(0);
    for (const address of ['10197d70', '10197dc0', '101ab11c']) expect(sections.get(address)?.deleted).toBe(true);
    expect(module.snapshot().trace.slice(-4)).toEqual(['message.array.delete', 'message.shutdown', 'spie.shutdown', 'spy.shutdown']);
    expect(pending[0]?.execute()).toEqual(known(undefined)); // source cold default CString is NULL.
  });

  it('retains the actual first Spy record at an unresolved window observation and never retries it', () => {
    const { host, pending, observations } = integratedHost();
    host.diagnostics.findWindow = () => { observations.push('window.unknown'); return unknown('Window registry unavailable'); };
    const module = new NativeMessageAdminModule(host);
    const stopped = module.getInstance();
    expect(stopped).toEqual(unknown('Spy.FindWindowA: Window registry unavailable'));
    expect(module.snapshot().count).toBe(1); expect(module.snapshot().capacity).toBe(9);
    expect(module.snapshot().spyPhase).toBe('blocked'); expect(module.snapshot().spiePhase).toBe('cold');
    expect(module.spy.uint(24)).toBe(0); expect(module.spy.uint(28)).toBe(0);
    expect(pending.map(entry => entry.address)).toEqual(['100e2710']);
    expect(module.getInstance()).toEqual(stopped); expect(observations).toEqual(['window.unknown']);
  });

  it('allows an actual registered Spy shutdown to erase its partial source record after later Spie startup blocks', () => {
    const { host, pending, sections } = integratedHost();
    host.diagnostics.fopen = () => unknown('File registry unavailable');
    const module = new NativeMessageAdminModule(host);
    const stopped = module.getInstance();
    expect(stopped).toEqual(unknown('Spie.fopen: File registry unavailable'));
    expect(pending.map(entry => entry.address)).toEqual(['100e2710', '100e2890']);
    expect(module.snapshot().count).toBe(1);
    expect(pending[1]?.execute()).toEqual(known(undefined));
    expect(module.snapshot().count).toBe(0);
    expect(module.snapshot().holder?.freed).toBe(false); // Message's final shutdown was never registered.
    expect(sections.get('101ab11c')?.deleted).toBe(true);
    expect(sections.get('10197dc0')?.deleted).toBe(false); // Spie blocked before _atexit.
    expect(module.getInstance()).toEqual(stopped);
    expect(module.unregisterCallback(module.spyCallback)).toEqual(stopped);
  });
});

describe('MessageAdmin actual shared ErrorAdmin bootstrap connection', () => {
  it('retains source Error-first recursion, callback identity and full reverse shutdown', () => {
    const owner = createNativeRuntimeAdminOwner();
    expect(owner.error.getInstance()).toEqual(known(owner.error));
    const snapshot = owner.message.snapshot();
    expect(snapshot.phase).toBe('ready'); expect(snapshot.count).toBe(2);
    expect(snapshot.callbacks.map(record => record.callback.address)).toEqual(['10008c06', '10002df6']);
    expect(snapshot.callbacks[1]?.callback).toBe(owner.error.callback);
    expect(snapshot.callbacks[1]?.userData).toBe(owner.error);
    expect(owner.message.invokeRegistered('10008c06', messageArgs)).toEqual(known(false));
    expect(owner.message.invokeRegistered('10002df6', messageArgs)).toEqual(known(true));
    expect(owner.error.isInPanicState()).toEqual(known(false));
    expect(owner.platform.snapshot().pending.map(entry => entry.address)).toEqual([
      '100e2710', '100e2890', '100e2830', '100e27d0', '100e2770',
    ]);
    expect(owner.dispose()).toEqual(known(undefined));
    expect(owner.platform.snapshot().executed.map(entry => entry.address)).toEqual([
      '100e2770', '100e27d0', '100e2830', '100e2890', '100e2710',
    ]);
    expect(owner.message.snapshot().holder).toBe(null);
    expect(owner.message.snapshot().count).toBe(0);
    expect(owner.dispose()).toEqual(known(undefined));
    expect(owner.platform.snapshot().executed).toHaveLength(5);
  });

  it('also preserves source Message-first recursion and its different shutdown order', () => {
    const owner = createNativeRuntimeAdminOwner();
    expect(owner.message.getInstance()).toEqual(known(owner.message));
    expect(owner.error.getInstance()).toEqual(known(owner.error));
    expect(owner.message.snapshot().callbacks.map(record => record.callback.address)).toEqual(['10002df6', '10008c06']);
    expect(owner.platform.snapshot().pending.map(entry => entry.address)).toEqual([
      '100e2710', '100e2770', '100e2890', '100e2830', '100e27d0',
    ]);
    expect(owner.dispose()).toEqual(known(undefined));
    expect(owner.platform.snapshot().executed.map(entry => entry.address)).toEqual([
      '100e27d0', '100e2830', '100e2890', '100e2770', '100e2710',
    ]);
    expect(owner.message.guard.uint(0)).toBe(1);
  });

  it('permits only the actually registered Error callback owner to erase a partial Message array for shutdown', () => {
    const platform = new NativeRuntimePlatform({ diagnostics: new NativeRuntimeDiagnostics({
      files: new Map([['zSpie.txt', new Uint8Array()]]),
    }) });
    const owner = createNativeRuntimeAdminOwner(platform);
    const stopped = owner.message.getInstance();
    expect(stopped).toEqual(unknown('Spie.WSAStartup is unowned'));
    expect(owner.error.getInstance()).toEqual(known(owner.error));
    expect(owner.message.snapshot().callbacks.map(record => record.callback.address)).toEqual([
      '10002df6', '10008c06', '10005722',
    ]);
    expect(owner.message.unregisterForErrorShutdown(owner.error.callback, {})).toEqual(
      unknown('Actual registered ErrorAdmin callback and owner required for shutdown'));
    expect(owner.message.unregisterForErrorShutdown(callback('10002df6'), owner.error).known).toBe(false);
    expect(owner.message.snapshot().count).toBe(3);
    expect(owner.message.unregisterForErrorShutdown(owner.error.callback, owner.error)).toEqual(known(1));
    expect(owner.message.snapshot().callbacks.map(record => record.callback.address)).toEqual(['10008c06', '10005722']);
    expect(owner.message.unregisterForErrorShutdown(owner.error.callback, owner.error)).toEqual(known(0));
    expect(owner.message.getInstance()).toEqual(stopped);
    expect(owner.message.unregisterCallback(owner.error.callback)).toEqual(stopped);
  });

  it('retains actual Error shutdown identity after the source Message callback freed the entire array', () => {
    const owner = createNativeRuntimeAdminOwner();
    expect(owner.message.getInstance()).toEqual(known(owner.message));
    expect(owner.message.shutdownMessage()).toEqual(known(undefined));
    expect(owner.message.unregisterForErrorShutdown(owner.error.callback, owner.error)).toEqual(known(0));
    expect(owner.message.unregisterForErrorShutdown(owner.error.callback, {}).known).toBe(false);
  });
});
