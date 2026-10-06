import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeCrtBootstrap } from '../../src/gothic3/native-crt-bootstrap';
import { NativeCrtThreadStartup } from '../../src/gothic3/native-crt-thread-startup';
import { NativeEngineCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeEngineCrtPlatformServices, NativeWin32HeapCapability } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const fact = <T>(value: NativeValue<T>): T => { if (!value.known) throw new Error(value.reason); return value.value; };
const services: NativeEngineCrtPlatformServices = { tlsValues: new Map(), kernel32Available: true,
  pointerCodec: 'absent', entropy: { currentThreadId: () => known(123) } };
/** Explicit NT/major6 fixture; production constructors retain original zeros. */
function fixture(platform = new NativeRuntimePlatform({ engineCrtServices: services }), callback?: (crt: NativeEngineCrtOwner) => NativeValue<void>) {
  let thread: NativeCrtThreadStartup;
  const crt = new NativeEngineCrtOwner({ platform, errnoSlot: () => thread.errnoSlot() });
  crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6); fact(crt.initHeap());
  thread = callback ? new NativeCrtThreadStartup({ crt, initPointers: () => callback(crt) }) : NativeCrtBootstrap.forCrt(crt).thread;
  return { crt, platform, thread };
}
function ready(platform?: NativeRuntimePlatform) { const result = fixture(platform); expect(result.thread.initialize()).toEqual(known(1)); return result; }

describe('source-owned Engine MT and PTD startup', () => {
  it('retains source cold bytes and canonical counter aliases without claiming ready indices', () => {
    const crt = new NativeEngineCrtOwner({ platform: new NativeRuntimePlatform() });
    const thread = new NativeCrtThreadStartup({ crt, initPointers: () => known(undefined) });
    expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff); expect(crt.physical.crtTlsIndexes.readUnsigned(4)).toBe(0xffffffff);
    expect(thread.physical.currentLocale.readUnsigned(0)).toBe(0x30ad5100);
    expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(1);
    expect(thread.physical.fallbackErrors.readUnsigned(0)).toBe(12); expect(thread.physical.fallbackErrors.readUnsigned(4)).toBe(8);
    expect(thread.physical.mbcRefCounter.backing).toBe(thread.physical.mbcObject.backing);
    expect(thread.physical.exceptionData.bytes.length).toBe(120);
    expect(thread.initialize().known).toBe(false); expect(thread.snapshot().phase).toBe('blocked');
    expect(thread.physical.procedureSlots.bytes.every(byte => byte === 0)).toBe(true);
  });
  it('publishes unencoded getter before initPointers, encodes all four globals before locks and publishes PTD before init', () => {
    let seen = false;
    const { crt, platform, thread } = fixture(undefined, crt => {
      const index = crt.physical.crtTlsIndexes.readUnsigned(4);
      expect(fact(platform.tlsGetValue(index))).toBe(platform.tlsProcedures.get);
      expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
      seen = true; return NativeCrtBootstrap.forCrt(crt).initializePointers();
    });
    expect(thread.initialize()).toEqual(known(1)); expect(seen).toBe(true);
    const trace = thread.snapshot().trace;
    expect(trace.filter(value => /procedure\.slot\d+\.fallback$/.test(value))).toEqual(['procedure.slot4.fallback', 'procedure.slot0.fallback', 'procedure.slot8.fallback', 'procedure.slot12.fallback']);
    expect(trace.filter(value => /procedure\.slot\d+\.encode$/.test(value))).toEqual(['procedure.slot0.encode', 'procedure.slot4.encode', 'procedure.slot8.encode', 'procedure.slot12.encode']);
    expect(trace.indexOf('ptd.publish')).toBeLessThan(trace.indexOf('ptd.exceptionAndSeed.store'));
    expect(trace.indexOf('procedure.slot12.encode')).toBeLessThan(trace.indexOf('mtInitLocks30683218.attempt'));
    expect(crt.physical.pointerInitialization.sectionInitializer).toBe(crt.physical.sectionInitializer);
  });
  it('uses zeroed532-byte allocation and exact fields/counters then returns the physical errno alias', () => {
    const { crt, thread } = ready(); const ptd = fact(thread.getPtdNoExit())!;
    expect(ptd.bytes.length).toBe(532); expect(ptd.readUnsigned(0)).toBe(123); expect(ptd.readUnsigned(4)).toBe(0xffffffff);
    expect(ptd.readUnsigned(8)).toBe(0); expect(ptd.readUnsigned(0x14)).toBe(1); expect(ptd.readUnsigned(0x70)).toBe(1);
    expect(ptd.readUnsigned(0xc8, 1)).toBe(0x43); expect(ptd.readUnsigned(0x14b, 1)).toBe(0x43);
    expect(ptd.pointer<object>(0x5c).get()).toBe(thread.physical.exceptionData); expect(ptd.pointer<object>(0x68).get()).toBe(thread.physical.mbcObject);
    expect(ptd.pointer<object>(0x6c).get()).toBe(thread.physical.defaultLocale);
    expect(thread.physical.mbcRefCounter.readUnsigned(0)).toBe(1); expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(2); expect(thread.physical.timeLocale.readUnsigned(0xb4)).toBe(1);
    const errno = fact(thread.errnoSlot()); expect(errno.backing).toBe(ptd.backing); expect(errno.bytes.byteOffset - ptd.bytes.byteOffset).toBe(8); errno.writeUnsigned(0, 12); expect(ptd.readUnsigned(8)).toBe(12);
    expect(crt.snapshot().trace).toContain('HeapAlloc(532,8)');
    expect(ptd.knownMask.subarray(0x1f8, 0x200)).toEqual(new Uint8Array(8).fill(255));
  });
  it('shares phase/global owners across helpers and never replays successful initialization', () => {
    const { crt, thread, platform } = ready(); let calls = 0;
    const other = new NativeCrtThreadStartup({ crt, initPointers: () => { calls++; return known(undefined); } });
    const before = platform.snapshot().allocations.length;
    expect(other.physical).toBe(thread.physical); expect(other.initialize()).toEqual(known(1)); expect(calls).toBe(0); expect(platform.snapshot().allocations.length).toBe(before);
  });
  it('retains known scalar getter allocation before FALSE publication and does not run cleanup or replay', () => {
    class FailSet extends NativeRuntimePlatform { override tlsSetValue(): NativeValue<boolean> { return known(false); } }
    const { crt, thread, platform } = fixture(new FailSet({ engineCrtServices: services }));
    expect(thread.initialize()).toEqual(known(0)); const index = crt.physical.crtTlsIndexes.readUnsigned(4); expect(index).not.toBe(0xffffffff);
    expect(thread.snapshot().trace).not.toContain('initPointers3067d37b.attempt'); expect(thread.snapshot().trace).not.toContain('mtTerm.failure.attempt');
    expect(thread.initialize()).toEqual(known(0)); expect(fact(platform.tlsFree(index))).toBe(true);
  });
  it('stores FFFFFFFF returned by first TlsAlloc and returns0 without cleanup', () => {
    class NoTls extends NativeRuntimePlatform { calls = 0; override tlsAlloc(): NativeValue<number> { this.calls++; return known(0xffffffff); } }
    const platform = new NoTls({ engineCrtServices: services }); const { crt, thread } = fixture(platform);
    expect(thread.initialize()).toEqual(known(0)); expect(crt.physical.crtTlsIndexes.readUnsigned(4)).toBe(0xffffffff); expect(platform.calls).toBe(1);
    expect(thread.snapshot().trace).not.toContain('mtTerm.failure.attempt'); expect(thread.initialize()).toEqual(known(0)); expect(platform.calls).toBe(1);
  });
  it('retains callback prefix on missing initPointers and never replays it through another helper', () => {
    let calls = 0; const { crt, thread } = fixture(undefined, () => { calls++; return { known: false, reason: 'fixture missing callback' }; });
    expect(thread.initialize().known).toBe(false); expect(crt.physical.crtTlsIndexes.readUnsigned(4)).not.toBe(0xffffffff);
    expect(thread.physical.procedureSlots.pointer<object>(4).get()).not.toBeNull(); expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
    const other = new NativeCrtThreadStartup({ crt, initPointers: () => known(undefined) }); expect(other.initialize().known).toBe(false); expect(calls).toBe(1);
  });
  it('latches shared reentry and preserves getter publication without later global/lock effects', () => {
    let thread: NativeCrtThreadStartup; const result = fixture(undefined, () => { expect(thread.initialize().known).toBe(false); return known(undefined); }); thread = result.thread;
    expect(thread.initialize().known).toBe(false); expect(thread.snapshot().boundary).toContain('Reentrant');
    expect(thread.snapshot().trace).not.toContain('procedure.slot0.encode'); expect(result.crt.physical.staticSections.knownMask.every(mask => mask === 255)).toBe(true);
  });
  it('calloc NULL failure cleans source indices/locks without calling errno or fabricating PTD', () => {
    class NullPtd extends NativeRuntimePlatform { override win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null> { return bytes === 532 ? known(null) : super.win32HeapAlloc(heap, flags, bytes); } }
    const { crt, thread } = fixture(new NullPtd({ engineCrtServices: services }));
    expect(thread.initialize()).toEqual(known(0)); expect(thread.snapshot().records).toHaveLength(0); expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff); expect(crt.physical.crtTlsIndexes.readUnsigned(4)).toBe(0xffffffff);
    expect(crt.snapshot().trace).not.toContain('__errno306783df.attempt'); expect(crt.snapshot().locksTerminated).toBe(true);
  });
  it('source PTD setter FALSE cleans indices and locks while retaining the unpublished calloc allocation', () => {
    class FailPtd extends NativeRuntimePlatform { override tlsSetValue(index: number, value: object | null): NativeValue<boolean> { return value instanceof NativeHeapObjectViews ? known(false) : super.tlsSetValue(index, value); } }
    const { crt, thread } = fixture(new FailPtd({ engineCrtServices: services })); expect(thread.initialize()).toEqual(known(0));
    expect(thread.snapshot().records).toHaveLength(1); expect(thread.snapshot().records[0]!.backing.freed).toBe(false); expect(thread.snapshot().records[0]!.bytes.every(byte => byte === 0)).toBe(true);
    expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff); expect(crt.snapshot().locksTerminated).toBe(true);
  });
  it('restores actual LastError while returning existing PTD without allocation', () => {
    const { thread, platform } = ready(); const before = thread.snapshot().records.length;
    fact(platform.setWin32LastError(0x12345678)); expect(fact(thread.getPtdNoExit())).toBe(thread.snapshot().records[0]);
    expect(fact(platform.getWin32LastError())).toBe(0x12345678); expect(thread.snapshot().records).toHaveLength(before);
  });
  it('clears PTD/getter slots and decrements physical counters then frees in source order', () => {
    const { crt, thread, platform } = ready(); const ptd = thread.snapshot().records[0]!;
    expect(thread.freePtd()).toEqual(known(undefined)); expect(ptd.backing.freed).toBe(true);
    expect(thread.physical.mbcRefCounter.readUnsigned(0)).toBe(0); expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(1); expect(thread.physical.timeLocale.readUnsigned(0xb4)).toBe(0);
    expect(fact(platform.tlsGetValue(crt.physical.crtTlsIndexes.readUnsigned(4)))).toBeNull();
    const trace = thread.snapshot().trace; expect(trace.indexOf('localStorageSet.clearPtd')).toBeLessThan(trace.indexOf('freePtdCallback.attempt'));
    expect(trace.indexOf('unlockFreePtdMbc3067e24f')).toBeLessThan(trace.indexOf('lock12.freePtd.attempt')); expect(trace.indexOf('unlockFreePtdLocale3067e25b')).toBeLessThan(trace.indexOf('free.ptd.attempt'));
  });
  it('uses canonical aliases when comparing the static MBC/locale/exception pointers during cleanup', () => {
    const { thread } = ready(); const ptd = thread.snapshot().records[0]!;
    ptd.pointer<object>(0x68).set(new NativeHeapObjectViews(thread.physical.mbcObject.backing));
    ptd.pointer<object>(0x6c).set(new NativeHeapObjectViews(thread.physical.defaultLocale.backing));
    ptd.pointer<object>(0x5c).set(new NativeHeapObjectViews(thread.physical.exceptionData.backing));
    expect(thread.freePtd()).toEqual(known(undefined)); expect(ptd.backing.freed).toBe(true); expect(thread.physical.mbcObject.backing.freed).toBe(false); expect(thread.physical.defaultLocale.backing.freed).toBe(false);
  });
  it('uses owned FLS exports/encoded procedures and invokes retained destructor before lock termination', () => {
    const { crt, thread } = ready(new NativeRuntimePlatform({ engineCrtServices: { ...services, fiberLocalStorage: true, pointerCodec: 'owned-bijection' } }));
    const ptd = fact(thread.getPtdNoExit())!; expect(thread.snapshot().trace.some(value => value.endsWith('.fallback'))).toBe(false);
    expect(ptd.pointer<object>(0x1f8).get()).not.toBeNull(); const token = fact(crt.encodePointer(ptd)); expect(fact(crt.decodePointer(token))).toBe(ptd);
    expect(thread.terminate()).toEqual(known(undefined)); expect(ptd.backing.freed).toBe(true); expect(crt.snapshot().locksTerminated).toBe(true); expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
    expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(1); expect(thread.initialize().known).toBe(false);
  });
  it('keeps TLS fallback termination distinct from per-thread destructor cleanup', () => {
    const { crt, thread } = ready(); const ptd = thread.snapshot().records[0]!;
    expect(thread.terminate()).toEqual(known(undefined)); expect(ptd.backing.freed).toBe(false); expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
    expect(thread.terminate()).toEqual(known(undefined)); expect(thread.snapshot().trace.filter(value => value === 'localStorageFree.attempt')).toHaveLength(1);
  });
  it('does not repeat physical counter decrements through a PTD alias after unresolved final free', () => {
    class StopFree extends NativeRuntimePlatform {
      calls = 0;
      override win32HeapFree(heap: NativeWin32HeapCapability, flags: 0, backing: NativeMemoryBacking): NativeValue<boolean> {
        if (backing.bytes.length === 532) { this.calls++; return { known: false, reason: 'fixture final free boundary' }; }
        return super.win32HeapFree(heap, flags, backing);
      }
    }
    const platform = new StopFree({ engineCrtServices: services }); const { thread } = ready(platform); const ptd = thread.snapshot().records[0]!;
    expect(thread.freePtdCallback(ptd).known).toBe(false);
    expect(thread.physical.mbcRefCounter.readUnsigned(0)).toBe(0); expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(1); expect(thread.physical.timeLocale.readUnsigned(0xb4)).toBe(0);
    expect(thread.freePtdCallback(new NativeHeapObjectViews(ptd.backing)).known).toBe(false);
    expect(thread.physical.mbcRefCounter.readUnsigned(0)).toBe(0); expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(1); expect(thread.physical.timeLocale.readUnsigned(0xb4)).toBe(0); expect(platform.calls).toBe(1);
  });
  it('shares active destructor identity across aliases and retains the first counter effect on reentry', () => {
    let thread: NativeCrtThreadStartup | undefined; let reentered = false;
    class Reenter extends NativeRuntimePlatform {
      override interlockedCounter(fields: NativeHeapObjectViews, delta: 1 | -1): NativeValue<number> {
        const result = super.interlockedCounter(fields, delta);
        if (delta === -1 && !reentered && thread) { reentered = true; expect(thread.freePtdCallback(new NativeHeapObjectViews(thread.snapshot().records[0]!.backing)).known).toBe(false); }
        return result;
      }
    }
    const result = ready(new Reenter({ engineCrtServices: services })); thread = result.thread;
    expect(thread.freePtdCallback(thread.snapshot().records[0]!).known).toBe(false); expect(reentered).toBe(true);
    expect(thread.physical.mbcRefCounter.readUnsigned(0)).toBe(0); expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(2); expect(thread.physical.timeLocale.readUnsigned(0xb4)).toBe(1);
    expect(thread.snapshot().boundary).toContain('Reentrant');
    expect(result.platform.snapshot().physicalSections.find(section => section.fields === result.crt.physical.lockTable.pointer<NativeHeapObjectViews>(13 * 8).get())!.depth).toBe(1);
  });
  it('retains a held lock and applied locale increment when its Interlocked result is unowned', () => {
    let thread: NativeCrtThreadStartup;
    class StopLocale extends NativeRuntimePlatform {
      override interlockedCounter(fields: NativeHeapObjectViews, delta: 1 | -1): NativeValue<number> {
        const result = super.interlockedCounter(fields, delta);
        if (fields.backing === thread.physical.defaultLocale.backing) return { known: false, reason: 'fixture locale counter return unowned' };
        return result;
      }
    }
    const result = fixture(new StopLocale({ engineCrtServices: services })); thread = result.thread;
    expect(thread.initialize().known).toBe(false); expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(2); expect(thread.physical.timeLocale.readUnsigned(0xb4)).toBe(0);
    expect(result.platform.snapshot().physicalSections.find(section => section.fields === result.crt.physical.lockTable.pointer<NativeHeapObjectViews>(12 * 8).get())!.depth).toBe(1);
    expect(thread.snapshot().trace).not.toContain('unlockInitPtd3067e0ab.attempt'); expect(thread.initialize().known).toBe(false); expect(thread.physical.defaultLocale.readUnsigned(0)).toBe(2);
  });
  it('increments owned category counters while comparing a canonical sentinel alias as equal', () => {
    const words = (value: number) => { const fields = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4), freed: false }); fields.writeUnsigned(0, value); return fields; };
    const narrow = words(7), wide = words(11), ignored = words(19), text = words(0x41);
    let thread: NativeCrtThreadStartup;
    const result = fixture(undefined, crt => {
      thread.physical.defaultLocale.pointer<object>(0x48).set(text); thread.physical.defaultLocale.pointer<object>(0x50).set(narrow);
      thread.physical.defaultLocale.pointer<object>(0x4c).set(text); thread.physical.defaultLocale.pointer<object>(0x54).set(wide);
      thread.physical.defaultLocale.pointer<object>(0x58).set(new NativeHeapObjectViews(thread.physical.localeSentinel.backing)); thread.physical.defaultLocale.pointer<object>(0x60).set(ignored);
      return NativeCrtBootstrap.forCrt(crt).initializePointers();
    }); thread = result.thread;
    expect(thread.initialize()).toEqual(known(1)); expect(narrow.readUnsigned(0)).toBe(8); expect(wide.readUnsigned(0)).toBe(12); expect(ignored.readUnsigned(0)).toBe(19);
    expect(thread.freePtd()).toEqual(known(undefined)); expect(narrow.readUnsigned(0)).toBe(7); expect(wide.readUnsigned(0)).toBe(11); expect(ignored.readUnsigned(0)).toBe(19);
  });
  it('gates an interior MBC free after decrement while retaining base allocation and heldlock', () => {
    const { crt, thread, platform } = ready(); const ptd = thread.snapshot().records[0]!, backing = fact(crt.callocCrt(1, 548))!;
    const mbc = new NativeHeapObjectViews(backing, 4, 544); mbc.writeUnsigned(0, 1); ptd.pointer<object>(0x68).set(mbc);
    expect(thread.freePtdCallback(ptd).known).toBe(false); expect(mbc.readUnsigned(0)).toBe(0); expect(backing.freed).toBe(false);
    expect(platform.snapshot().physicalSections.find(section => section.fields === crt.physical.lockTable.pointer<NativeHeapObjectViews>(13 * 8).get())!.depth).toBe(1);
    expect(thread.snapshot().trace).not.toContain('unlockFreePtdMbc3067e24f.attempt'); expect(thread.freePtdCallback(new NativeHeapObjectViews(ptd.backing)).known).toBe(false); expect(mbc.readUnsigned(0)).toBe(0);
  });
  it('rereads the PTD publication index after calloc callbacks while preserving the initial lookup argument', () => {
    const { crt, thread, platform } = ready(); const oldIndex = crt.physical.crtTlsIndexes.readUnsigned(0), nextIndex = fact(platform.tlsAlloc());
    fact(platform.tlsSetValue(oldIndex, null)); const allocate = crt.callocCrt.bind(crt);
    crt.callocCrt = (count, size) => { const result = allocate(count, size); crt.physical.crtTlsIndexes.writeUnsigned(0, nextIndex); return result; };
    const ptd = fact(thread.getPtdNoExit())!; expect(fact(platform.tlsGetValue(oldIndex))).toBeNull(); expect(fact(platform.tlsGetValue(nextIndex))).toBe(ptd); expect(thread.snapshot().records).toHaveLength(2);
  });
  it('rereads the initial MT PTD publication index after calloc rather than the allocator result', () => {
    const { crt, thread, platform } = fixture(); const nextIndex = fact(platform.tlsAlloc()), allocate = crt.callocCrt.bind(crt);
    crt.callocCrt = (count, size) => { const result = allocate(count, size); crt.physical.crtTlsIndexes.writeUnsigned(0, nextIndex); return result; };
    expect(thread.initialize()).toEqual(known(1)); expect(fact(platform.tlsGetValue(nextIndex))).toBe(thread.snapshot().records[0]);
  });
  it('rereads getter TLS index after destructor callbacks before clearing that slot', () => {
    const { crt, thread, platform } = ready(); const oldIndex = crt.physical.crtTlsIndexes.readUnsigned(4), nextIndex = fact(platform.tlsAlloc());
    fact(platform.tlsSetValue(nextIndex, platform.tlsProcedures.get)); const destroy = thread.freePtdCallback.bind(thread);
    thread.freePtdCallback = record => { const result = destroy(record); crt.physical.crtTlsIndexes.writeUnsigned(4, nextIndex); return result; };
    expect(thread.freePtd()).toEqual(known(undefined)); expect(fact(platform.tlsGetValue(oldIndex))).toBe(platform.tlsProcedures.get); expect(fact(platform.tlsGetValue(nextIndex))).toBeNull();
  });
});
