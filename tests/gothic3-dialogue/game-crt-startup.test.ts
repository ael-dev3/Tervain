import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeCrtBootstrap } from '../../src/gothic3/native-crt-bootstrap';
import { NativeCrtThreadStartup } from '../../src/gothic3/native-crt-thread-startup';
import { NativeEngineCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { admitGameCrtStartupSource } from '../../src/gothic3/native-game-crt-startup-source';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeEngineCrtPlatformServices, NativeWin32HeapCapability } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const fact = <T>(value: NativeValue<T>): T => { if (!value.known) throw new Error(value.reason); return value.value; };
const serviceProfile = (extra: Partial<NativeEngineCrtPlatformServices> = {}): NativeEngineCrtPlatformServices => ({
  tlsValues: new Map(), kernel32Available: true, pointerCodec: 'absent', fiberLocalStorage: true,
  processHeap: true, osVersion: { platform: 2, major: 6, minor: 1, build: 0xabcd },
  entropy: { systemTimeAsFileTime: () => known({ low: 0x10203040, high: 0xabcdef12 }),
    currentProcessId: () => known(0x1234), currentThreadId: () => known(0x5678), tickCount: () => known(0x99887766),
    performanceCounter: () => known({ success: true, low: 0x66667777, high: 0x13579abc }) }, ...extra,
});
function selected(platform = new NativeRuntimePlatform({ engineCrtServices: serviceProfile() })) {
  let bootstrap: NativeCrtBootstrap;
  const host = { platform, errnoSlot: () => bootstrap.thread.errnoSlot(), getLastError: () => platform.getWin32LastError() };
  const crt = NativeGameCrtOwner.forPlatform(host);
  bootstrap = NativeCrtBootstrap.forCrt(crt); return { host, crt, bootstrap, thread: bootstrap.thread, platform };
}
function attached(platform?: NativeRuntimePlatform) {
  const result = selected(platform); const attach = result.bootstrap.processAttach();
  expect(attach.known).toBe(false);
  if (!attach.known) expect(attach.reason).toContain('GetCommandLineA IAT207d7ca0 at204678b9');
  expect(result.thread.snapshot().phase).toBe('ready'); return result;
}

describe('Game CRT startup owns actual Game globals and selected call paths', () => {
  it('keeps one Game owner/bootstrap per platform and shares physical image aliases', () => {
    const { host, crt, bootstrap, thread } = selected(new NativeRuntimePlatform());
    expect(NativeGameCrtOwner.forPlatform(host)).toBe(crt);
    expect(NativeCrtBootstrap.forCrt(crt)).toBe(bootstrap);
    expect(bootstrap.physical.securityCookie).toBe(crt.imageStorage('securityCookie'));
    expect(thread.physical.procedureSlots).toBe(crt.imageStorage('procedureSlots'));
    expect(thread.physical.mbcRefCounter.backing).toBe(crt.imageStorage('mbcRefCounter').backing);
    expect(thread.physical.mbcRefCounter.bytes.byteOffset).toBe(thread.physical.mbcObject.bytes.byteOffset);
    const other = new NativeCrtThreadStartup({ crt, initPointers: () => known(undefined) });
    expect(other.physical).toBe(thread.physical);
    expect(other.snapshot().destructor).toBe(thread.snapshot().destructor);
    expect(other.snapshot().tlsFallbackAllocator).toBe(thread.snapshot().tlsFallbackAllocator);
    expect(thread.snapshot().destructor.owner).toBe(crt.identity);
  });
  it('retains cold Game locale addresses, uninitialized indices and original exit function bytes', () => {
    const { crt, bootstrap, thread } = selected(new NativeRuntimePlatform());
    expect(crt.module).toBe('Game');
    expect(thread.physical.currentLocale.readUnsigned(0)).toBe(0x207b2b50);
    expect(thread.physical.defaultLocale.readUnsigned(0xd4)).toBe(0x207b33c8);
    expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(1);
    expect([...crt.physical.crtTlsIndexes.dwordArray(0, 2)]).toEqual([0xffffffff, 0xffffffff]);
    expect(crt.physical.pointerInitialization.exitFunction.readUnsigned(0)).toBe(0x20466779);
    expect(() => crt.physical.pointerInitialization.exitFunction.pointer<object>(0).get()).toThrow();
    expect(bootstrap.physical.preCInitializerTable.bytes).toEqual(new Uint8Array(256));
    expect(bootstrap.physical.attachCount.readUnsigned(0)).toBe(0);
    expect(thread.snapshot().phase).toBe('cold');
  });
  it('rejects incomplete or wrong-module startup receipts and preserves the complete attach hash', () => {
    const { crt } = selected(); const source = crt.sourceProfile.bootstrapRules;
    expect(() => admitGameCrtStartupSource(source, ['crtAttach', 'terminatePointerTarget'])).not.toThrow();
    const changed = JSON.parse(JSON.stringify(source));
    changed.methods.crtAttach.bodyInstructionBytesSha256 = 'partial';
    expect(() => admitGameCrtStartupSource(changed, ['crtAttach'])).toThrow('Game CRT startup');
    const engine = new NativeEngineCrtOwner({ platform: new NativeRuntimePlatform() });
    expect(() => admitGameCrtStartupSource(engine.sourceProfile.bootstrapRules, ['crtAttach'])).toThrow();
  });
  it('retains the cookie frame prefix on a missing actual writer and prevents replay', () => {
    const { bootstrap } = selected(new NativeRuntimePlatform());
    const result = bootstrap.entry(null, 1, null); expect(result.known).toBe(false);
    expect(bootstrap.snapshot().trace).toContain('cookie.read20476a9f');
    expect(bootstrap.snapshot().cookieFrame!.knownMask).toEqual(Uint8Array.from([...new Uint8Array(8), ...new Uint8Array(8).fill(255)]));
    expect(bootstrap.snapshot().cookieFrame!.backing.freed).toBe(false);
    const trace = bootstrap.snapshot().trace;
    expect(bootstrap.entry(null, 1, null)).toEqual(result); expect(bootstrap.snapshot().trace).toEqual(trace);
  });
  it.each([0, 0x1234, 0xbb40e64e])('preserves cookie special branch for actual entropy %s', input => {
    const { bootstrap } = selected(new NativeRuntimePlatform({ engineCrtServices: serviceProfile({ entropy: {
      systemTimeAsFileTime: () => known({ low: input, high: 0 }), currentProcessId: () => known(0),
      currentThreadId: () => known(0), tickCount: () => known(0),
      performanceCounter: () => known({ success: false, low: 0, high: 0 }),
    } }) }));
    fact(bootstrap.initializeSecurityCookie());
    const expected = input === 0xbb40e64e ? 0xbb40e64f : (input | (input << 16)) >>> 0;
    expect(bootstrap.physical.securityCookie.readUnsigned(0)).toBe(expected);
    expect(bootstrap.physical.securityCookieComplement.readUnsigned(0)).toBe((~expected) >>> 0);
    expect(bootstrap.snapshot().trace).toContain('cookie.store20476b1a');
    expect(bootstrap.snapshot().cookieFrame!.backing.freed).toBe(true);
  });
  it('reads the existing cookie before frame stores and stops on unknown output masks', () => {
    const { bootstrap } = selected(); bootstrap.physical.securityCookie.knownMask.fill(0);
    expect(bootstrap.initializeSecurityCookie().known).toBe(false);
    expect(bootstrap.snapshot().cookieFrame!.knownMask).toEqual(new Uint8Array(16));
    const { bootstrap: untouched } = selected(new NativeRuntimePlatform({ engineCrtServices: serviceProfile({ entropy: {
      systemTimeAsFileTime: () => known({ low: 1, high: 2 }), currentProcessId: () => known(3),
      currentThreadId: () => known(4), tickCount: () => known(5), performanceCounter: () => known({ success: false }),
    } }) }));
    expect(untouched.initializeSecurityCookie().known).toBe(false);
    expect(untouched.physical.securityCookie.readUnsigned(0)).toBe(0xbb40e64e);
    expect(untouched.snapshot().cookieFrame!.backing.freed).toBe(false);
  });
  it('returns zero for cold process detach without initializing Game globals', () => {
    const { crt, bootstrap, thread } = selected();
    expect(bootstrap.entry(null, 0, null)).toEqual(known(0));
    expect(crt.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(thread.snapshot().phase).toBe('cold'); expect(bootstrap.snapshot().cookieFrame).toBeNull();
  });
  it('uses Game store order, encoded source procedures and the actual first unresolved call', () => {
    const { crt, bootstrap, platform, thread } = attached(new NativeRuntimePlatform({ engineCrtServices: serviceProfile({ pointerCodec: 'owned-bijection' }) }));
    expect([...crt.physical.crtOsFields.dwordArray(0, 5)]).toEqual([2, 0x2bcd, 0x601, 6, 1]);
    expect(bootstrap.snapshot().trace.filter(step => step.startsWith('os.'))).toEqual([
      'os.platform.store2046786b', 'os.version.store2046787c', 'os.major.store20467882',
      'os.minor.store20467887', 'os.build.store2046788d',
    ]);
    expect(bootstrap.snapshot().trace.filter(step => step.startsWith('preCInit204737dd.read'))).toHaveLength(64);
    expect(bootstrap.snapshot().trace.at(-1)).toBe('GetCommandLineA IAT207d7ca0 at204678b9.boundary');
    expect(bootstrap.snapshot().terminateTarget.address).toBe('2047396b');
    expect(bootstrap.snapshot().exitTarget.address).toBe('20466779');
    expect(bootstrap.snapshot().terminateTarget.owner).toBe(crt.identity);
    expect(fact(crt.decodePointer(crt.physical.pointerInitialization.terminateHandler.pointer<object>(0).get()))).toBe(bootstrap.snapshot().terminateTarget);
    expect(fact(crt.decodePointer(crt.physical.pointerInitialization.exitFunction.pointer<object>(0).get()))).toBe(bootstrap.snapshot().exitTarget);
    expect(bootstrap.snapshot().versionRecord!.backing.freed).toBe(true);
    expect(bootstrap.physical.attachCount.readUnsigned(0)).toBe(0);
    expect(thread.snapshot().phase).toBe('ready'); expect(platform.snapshot().physicalSections).toHaveLength(14);
    const before = bootstrap.snapshot().trace; bootstrap.processAttach(); expect(bootstrap.snapshot().trace).toEqual(before);
  });
  it('uses the exact zeroed532-byte PTD and physical locale/errno aliases', () => {
    const { crt, thread } = attached(); const ptd = fact(thread.getPtdNoExit())!;
    expect(ptd.bytes.length).toBe(532); expect(ptd.readUnsigned(0)).toBe(0x5678); expect(ptd.readUnsigned(4)).toBe(0xffffffff);
    expect(ptd.pointer<object>(0x5c).get()).toBe(thread.physical.exceptionData);
    expect(ptd.pointer<object>(0x68).get()).toBe(thread.physical.mbcObject);
    expect(ptd.pointer<object>(0x6c).get()).toBe(thread.physical.defaultLocale);
    expect(thread.physical.mbcRefCounter.readUnsigned(0)).toBe(1);
    expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(2);
    expect(thread.physical.timeLocale.readUnsigned(0xb4)).toBe(1);
    const errno = fact(thread.errnoSlot()); expect(errno.backing).toBe(ptd.backing);
    expect(errno.bytes.byteOffset - ptd.bytes.byteOffset).toBe(8); errno.writeUnsigned(0, 12); expect(ptd.readUnsigned(8)).toBe(12);
    expect(crt.snapshot().trace).toContain('HeapAlloc(532,8)');
    expect(thread.snapshot().trace).toContain('localStorageAlloc(destructor20468043)');
  });
  it.each([false, true])('retains separate Engine/Game heap, TLS, locale and destructor state with FLS=%s', fls => {
    const platform = new NativeRuntimePlatform({ engineCrtServices: serviceProfile({ fiberLocalStorage: fls }) });
    const { crt: game, thread: gameThread } = selected(platform);
    const engine = new NativeEngineCrtOwner({ platform }); const engineBootstrap = NativeCrtBootstrap.forCrt(engine);
    expect(gameThread.snapshot().destructor).not.toBe(engineBootstrap.thread.snapshot().destructor);
    expect(engineBootstrap.processAttach().known).toBe(false);
    expect(game.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(gameThread.physical.defaultLocale.readUnsigned(0)).toBe(1);
    expect(gameThread.snapshot().phase).toBe('cold');
    const gameBootstrap = NativeCrtBootstrap.forCrt(game); expect(gameBootstrap.processAttach().known).toBe(false);
    const ep = fact(engineBootstrap.thread.getPtdNoExit())!, gp = fact(gameThread.getPtdNoExit())!;
    if (!fls) {
      const ea = fact(engine.decodePointer(engineBootstrap.thread.physical.procedureSlots.pointer<object>(0).get())) as { address: string; owner: object };
      const ga = fact(game.decodePointer(gameThread.physical.procedureSlots.pointer<object>(0).get())) as { address: string; owner: object };
      expect(ga).not.toBe(ea); expect(ga.address).toBe('20467e49'); expect(ea.address).toBe('3067df49');
      expect(ga.owner).toBe(game.identity); expect(ea.owner).toBe(engine.identity);
    }
    expect(gp.backing).not.toBe(ep.backing); expect(game.physical.heapHandle.pointer<object>(0).get()).not.toBe(engine.physical.heapHandle.pointer<object>(0).get());
    expect(game.physical.crtTlsIndexes.readUnsigned(0)).not.toBe(engine.physical.crtTlsIndexes.readUnsigned(0));
    fact(gameThread.freePtd()); expect(gp.backing.freed).toBe(true); expect(ep.backing.freed).toBe(false);
    expect(gameThread.physical.defaultLocale.readUnsigned(0)).toBe(1);
    expect(engineBootstrap.thread.physical.defaultLocale.readUnsigned(0)).toBe(2);
    fact(gameThread.terminate()); expect(engineBootstrap.thread.snapshot().phase).toBe('ready');
  });
  it('invokes the retained Game FLS destructor before terminating locks', () => {
    const { thread, platform } = attached(); const ptd = fact(thread.getPtdNoExit())!;
    fact(thread.terminate()); expect(ptd.backing.freed).toBe(true);
    expect(thread.physical.mbcRefCounter.readUnsigned(0)).toBe(0);
    expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(1);
    expect(platform.snapshot().physicalSections.every(section => section.deleted)).toBe(true);
    expect(thread.snapshot().trace).toContain('unlockFreePtdMbc2046814f');
    expect(thread.snapshot().trace).toContain('unlockFreePtdLocale2046815b');
  });
  it('preserves known FALSE version-free output without discarding the record', () => {
    class KeepVersion extends NativeRuntimePlatform {
      override win32HeapFree(heap: NativeWin32HeapCapability, flags: 0, backing: NativeMemoryBacking): NativeValue<boolean> {
        return backing.bytes.length === 148 ? known(false) : super.win32HeapFree(heap, flags, backing);
      }
    }
    const { crt, bootstrap } = attached(new KeepVersion({ engineCrtServices: serviceProfile() }));
    expect(bootstrap.snapshot().versionRecord!.backing.freed).toBe(false);
    expect(crt.physical.crtOsFields.readUnsigned(12)).toBe(6);
  });
  it('preserves a failed version writer frame before any Game OS globals change', () => {
    class PartialVersion extends NativeRuntimePlatform {
      override getVersionExA(fields: NativeHeapObjectViews): NativeValue<boolean> {
        fields.writeUnsigned(4, 6); return known(true);
      }
    }
    const { crt, bootstrap } = selected(new PartialVersion({ engineCrtServices: serviceProfile() }));
    const result = bootstrap.processAttach(); expect(result.known).toBe(false);
    expect(bootstrap.snapshot().versionRecord!.readUnsigned(4)).toBe(6);
    expect(bootstrap.snapshot().versionRecord!.backing.freed).toBe(false);
    expect([...crt.physical.crtOsFields.bytes]).toEqual([...new Uint8Array(20)]);
    const trace = bootstrap.snapshot().trace; bootstrap.processAttach(); expect(bootstrap.snapshot().trace).toEqual(trace);
  });
  it('returns zero and destroys only the Game heap when the MT module query is known NULL', () => {
    const { crt, bootstrap } = selected(new NativeRuntimePlatform({ engineCrtServices: serviceProfile({ kernel32Available: false }) }));
    expect(bootstrap.processAttach()).toEqual(known(0));
    expect(crt.snapshot().heapTerminated).toBe(true); expect(crt.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(bootstrap.snapshot().trace.slice(-5)).toEqual(['mtInit204681d9.attempt', 'mtInit204681d9',
      'heapTerm20476a1f.attempt', 'heapTerm20476a1f', 'crtAttach.return0']);
  });
  it('retains the actual getter index when TLS publication returns FALSE', () => {
    class RejectGetter extends NativeRuntimePlatform {
      override tlsSetValue(_index: number, _value: object | null): NativeValue<boolean> { return known(false); }
    }
    const { crt, bootstrap, thread } = selected(new RejectGetter({ engineCrtServices: serviceProfile() }));
    expect(bootstrap.processAttach()).toEqual(known(0));
    expect(crt.physical.crtTlsIndexes.readUnsigned(4)).not.toBe(0xffffffff);
    expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
    expect(thread.snapshot().records).toHaveLength(0); expect(thread.snapshot().phase).toBe('null');
    expect(thread.snapshot().trace).not.toContain('initPointers204667a8.attempt');
  });
  it('preserves callback reentry after the actual getter store and blocks its suffix', () => {
    let reenter: (() => void) | undefined;
    class ReentrantGetter extends NativeRuntimePlatform {
      override tlsSetValue(index: number, value: object | null): NativeValue<boolean> {
        const result = super.tlsSetValue(index, value); reenter?.(); return result;
      }
    }
    const { bootstrap, thread, crt, platform } = selected(new ReentrantGetter({ engineCrtServices: serviceProfile() }));
    reenter = () => { expect(thread.initialize().known).toBe(false); };
    expect(bootstrap.processAttach().known).toBe(false);
    expect(thread.snapshot().boundary).toContain('Reentrant Game __mtInit204681d9');
    expect(fact(platform.tlsGetValue(crt.physical.crtTlsIndexes.readUnsigned(4)))).toBe(thread.physical.procedureSlots.pointer<object>(4).get());
    expect(thread.snapshot().trace).not.toContain('initPointers204667a8.attempt');
    expect(platform.snapshot().physicalSections).toHaveLength(0);
    const trace = thread.snapshot().trace; thread.initialize(); expect(thread.snapshot().trace).toEqual(trace);
  });
  it('cleans original indices/locks after calloc NULL without inventing a PTD', () => {
    class FailPtdAllocation extends NativeRuntimePlatform {
      override win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null> {
        return bytes === 532 ? known(null) : super.win32HeapAlloc(heap, flags, bytes);
      }
    }
    const { crt, bootstrap, thread, platform } = selected(new FailPtdAllocation({ engineCrtServices: serviceProfile() }));
    expect(bootstrap.processAttach()).toEqual(known(0));
    expect(thread.snapshot().records).toHaveLength(0);
    expect([...crt.physical.crtTlsIndexes.dwordArray(0, 2)]).toEqual([0xffffffff, 0xffffffff]);
    expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(1);
    expect(platform.snapshot().physicalSections.every(section => section.deleted)).toBe(true);
    expect(crt.snapshot().heapTerminated).toBe(true);
  });
  it('keeps a held lock, published PTD and applied counter prefix when Interlocked becomes unowned', () => {
    class UnknownLocaleIncrement extends NativeRuntimePlatform {
      override interlockedCounter(fields: NativeHeapObjectViews, delta: 1 | -1): NativeValue<number> {
        const value = super.interlockedCounter(fields, delta);
        return value.known && delta === 1 && value.value === 2 ? { known: false, reason: 'Counter output unowned after actual write' } : value;
      }
    }
    const { bootstrap, thread, platform } = selected(new UnknownLocaleIncrement({ engineCrtServices: serviceProfile() }));
    expect(bootstrap.processAttach().known).toBe(false);
    expect(thread.snapshot().records).toHaveLength(1);
    const ptd = thread.snapshot().records[0]!;
    expect(ptd.pointer<object>(0x6c).get()).toBe(thread.physical.defaultLocale);
    expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(2);
    expect(thread.physical.mbcRefCounter.readUnsigned(0)).toBe(1);
    expect(platform.snapshot().physicalSections.some(section => section.depth === 1)).toBe(true);
    expect(ptd.backing.freed).toBe(false);
    const trace = thread.snapshot().trace; thread.initialize(); expect(thread.snapshot().trace).toEqual(trace);
  });
});
