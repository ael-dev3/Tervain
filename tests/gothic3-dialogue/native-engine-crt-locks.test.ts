import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeEngineCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import type { NativeEngineCrtHost } from '../../src/gothic3/native-engine-crt-locks';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform, NativeWin32PlatformException } from '../../src/gothic3/native-runtime-platform';
import type { NativeWin32HeapCapability } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const fact = <T>(value: NativeValue<T>): T => { if (!value.known) throw new Error(value.reason); return value.value; };
const storage = (bytes: number, masks = 0) => new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes),
  knownMask: new Uint8Array(bytes).fill(masks), freed: false });
const services = { tlsValues: new Map<number, object>(), kernel32Available: true, pointerCodec: 'absent' as const };
/** Explicit OS/platform fixture. Production constructors do not seed NT facts. */
function selected(platform = new NativeRuntimePlatform({ engineCrtServices: services }), extra: Partial<NativeEngineCrtHost> = {}) {
  const errno = storage(4); let errnoCalls = 0;
  const crt = new NativeEngineCrtOwner({ platform, errnoSlot: () => { errnoCalls++; return known(errno); }, ...extra });
  crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
  fact(crt.initHeap(1)); fact(crt.initLocks());
  return { crt, platform, errno, errnoCalls: () => errnoCalls };
}
const section = (crt: NativeEngineCrtOwner, id: number) => crt.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).get();

describe('physical Engine CRT heap and lock-table owner', () => {
  it('keeps cold OS/TLS/list fields and publishes the heap before the unowned OS accessor gate', () => {
    const platform = new NativeRuntimePlatform(), crt = new NativeEngineCrtOwner({ platform });
    expect(crt.physical.crtOsFields.bytes.every(byte => byte === 0)).toBe(true);
    expect(crt.physical.crtTypeInfoList.bytes).toEqual(new Uint8Array(8));
    expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
    expect(crt.physical.crtTlsIndexes.readUnsigned(4)).toBe(0xffffffff);
    expect(crt.initHeap().known).toBe(false);
    expect(crt.physical.heapHandle.pointer<object>(0).get()).toBe(platform.snapshot().winHeaps[0]!.capability);
    expect(crt.physical.heapHandle.knownMask).toEqual(new Uint8Array(4));
    expect(crt.physical.heapSelector.readUnsigned(0)).toBe(0);
    expect(crt.snapshot().trace).toEqual(['HeapCreate.attempt', 'HeapCreate', 'heapHandle.publish', 'getOsPlatform3067d032', '__errno306783df.attempt']);
    expect(crt.initHeap().known).toBe(false);
    expect(platform.snapshot().winHeaps).toHaveLength(1);
  });
  it('writes errno22 to an actual slot then stops at the source invalid-parameter branch', () => {
    const errno = storage(4), crt = new NativeEngineCrtOwner({ platform: new NativeRuntimePlatform(), errnoSlot: () => known(errno) });
    const result = crt.initHeap(); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('invalidParameter30674d58');
    expect(errno.readUnsigned(0)).toBe(22);
    expect(crt.physical.heapSelector.readUnsigned(0)).toBe(0);
  });
  it('stores selector3 before the explicit small-block heap initializer gate', () => {
    const crt = new NativeEngineCrtOwner({ platform: new NativeRuntimePlatform() });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 4);
    expect(crt.initHeap(0).known).toBe(false);
    expect(crt.physical.heapSelector.readUnsigned(0)).toBe(3);
    expect(crt.snapshot().heaps).toHaveLength(1);
    expect(crt.snapshot().trace.at(-1)).toContain('smallBlockHeapInit3068347a(1016)');
  });
  it('retains known-null HeapCreate and does not consult OS fields or replay the allocation', () => {
    class NullHeap extends NativeRuntimePlatform {
      calls = 0;
      override createWin32Heap(): NativeValue<NativeWin32HeapCapability | null> { this.calls++; return known(null); }
    }
    const platform = new NullHeap(), crt = new NativeEngineCrtOwner({ platform });
    expect(crt.initHeap()).toEqual(known(0)); expect(crt.initHeap()).toEqual(known(0));
    expect(platform.calls).toBe(1); expect(crt.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(crt.snapshot().trace).toEqual(['HeapCreate.attempt', 'HeapCreate', 'heapHandle.publish']);
  });
  it('publishes each static physical alias before initialization in exact source flag order', () => {
    const observed: number[] = []; let crt: NativeEngineCrtOwner;
    class Observe extends NativeRuntimePlatform {
      override initializePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object, spinCount: 4000): NativeValue<boolean> {
        const id = Array.from({ length: 36 }, (_, i) => i).find(i => section(crt, i) === fields)!;
        expect(fields.bytes.buffer).toBe(crt.physical.staticSections.bytes.buffer);
        expect(fields.knownMask.buffer).toBe(crt.physical.staticSections.knownMask.buffer);
        expect(fields.bytes.byteOffset - crt.physical.staticSections.bytes.byteOffset).toBe(observed.length * 24);
        expect(spinCount).toBe(4000); observed.push(id); return super.initializePhysicalCriticalSection(fields, owner, spinCount);
      }
    }
    const platform = new Observe({ engineCrtServices: services }); crt = new NativeEngineCrtOwner({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
    expect(crt.initLocks()).toEqual(known(1));
    expect(observed).toEqual([0, 1, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 17, 18]);
    expect(platform.snapshot().physicalSections.every(entry => entry.owner === crt.identity && entry.spinCount === 4000)).toBe(true);
    expect(crt.physical.staticSections.knownMask.every(mask => mask === 0)).toBe(true);
    expect(crt.physical.lockTable.readUnsigned(5 * 8 + 4)).toBe(0);
    expect(crt.physical.lockTable.knownMask.subarray(5 * 8, 5 * 8 + 4)).toEqual(new Uint8Array(4).fill(255));
    expect(crt.physical.lockTable.knownMask.subarray(10 * 8, 10 * 8 + 4)).toEqual(new Uint8Array(4));
    const trace = crt.snapshot().trace;
    expect(trace.filter(entry => entry === 'GetProcAddress(InitializeCriticalSectionAndSpinCount)')).toHaveLength(1);
    expect(trace.filter(entry => entry === 'sectionInitializer.cache')).toHaveLength(1);
    expect(trace.filter(entry => entry === 'decodePointer3067dedb')).toHaveLength(14);
  });
  it('preserves first static pointer publication before unavailable wrapper TLS capability', () => {
    const platform = new NativeRuntimePlatform(), crt = new NativeEngineCrtOwner({ platform });
    expect(crt.initLocks().known).toBe(false); expect(section(crt, 0)).toBeInstanceOf(NativeHeapObjectViews);
    expect(section(crt, 1)).toBeNull(); expect(platform.snapshot().physicalSections).toHaveLength(0);
    expect(crt.snapshot().trace).toEqual(['lock0.static.publish', 'lock0.initialize4000', 'decodePointer3067dedb', 'TlsGetValue(4294967295).attempt']);
    const before = crt.snapshot().trace; expect(crt.initLocks().known).toBe(false); expect(crt.snapshot().trace).toEqual(before);
  });
  it('clears only the failed static pointer and preserves earlier initialized sections', () => {
    class FailThird extends NativeRuntimePlatform {
      calls = 0;
      override initializePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object, count: 4000): NativeValue<boolean> {
        return ++this.calls === 3 ? known(false) : super.initializePhysicalCriticalSection(fields, owner, count);
      }
    }
    const platform = new FailThird({ engineCrtServices: services }), crt = new NativeEngineCrtOwner({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
    expect(crt.initLocks()).toEqual(known(0)); expect(crt.initLocks()).toEqual(known(0));
    expect(section(crt, 0)).not.toBeNull(); expect(section(crt, 1)).not.toBeNull(); expect(section(crt, 3)).toBeNull(); expect(section(crt, 4)).toBeNull();
    expect(crt.physical.lockTable.knownMask.subarray(24, 28)).toEqual(new Uint8Array(4).fill(255));
    expect(platform.snapshot().physicalSections).toHaveLength(2); expect(platform.calls).toBe(3);
  });
  it('uses actual owned encoded pointer capabilities and rejects raw cold zero as encoded NULL', () => {
    const platform = new NativeRuntimePlatform({ engineCrtServices: { ...services, pointerCodec: 'owned-bijection' } });
    const cold = new NativeEngineCrtOwner({ platform });
    cold.physical.crtOsFields.writeUnsigned(0, 2); cold.physical.crtOsFields.writeUnsigned(12, 6);
    expect(cold.initLocks().known).toBe(false); expect(platform.snapshot().physicalSections).toHaveLength(0);
    const fresh = new NativeEngineCrtOwner({ platform });
    fresh.physical.crtOsFields.writeUnsigned(0, 2); fresh.physical.crtOsFields.writeUnsigned(12, 6);
    const module = fact(platform.getWin32ModuleHandle('KERNEL32.DLL'))!;
    const encode = fact(platform.getWin32Procedure(module, 'EncodePointer'))!;
    fresh.physical.sectionInitializer.pointer<object>(0).set(fact(encode.invoke(null)));
    expect(fresh.initLocks()).toEqual(known(1));
    expect(fresh.physical.sectionInitializer.knownMask).toEqual(new Uint8Array(4));
    expect(fresh.snapshot().trace.filter(entry => entry === 'EncodePointer')).toHaveLength(1);
    expect(fresh.snapshot().trace.filter(entry => entry === 'DecodePointer')).toHaveLength(14);
  });
  it('follows missing module/procedure fallback without inventing spin-count application', () => {
    const platform = new NativeRuntimePlatform({ engineCrtServices: { ...services, kernel32Available: false } });
    const crt = new NativeEngineCrtOwner({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
    expect(crt.initLocks()).toEqual(known(1));
    expect(platform.snapshot().physicalSections.every(entry => entry.spinCount === null)).toBe(true);
    expect(crt.snapshot().trace.filter(entry => entry === 'InitializeCriticalSection fallback30696474')).toHaveLength(14);
    expect(crt.snapshot().trace.some(entry => entry.startsWith('GetProcAddress'))).toBe(false);
  });
  it('gates the lower-major process PE scan after actual TLS/module/accessor prefix', () => {
    const crt = new NativeEngineCrtOwner({ platform: new NativeRuntimePlatform({ engineCrtServices: services }) });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 5);
    expect(crt.initHeap()).toEqual(known(1)); expect(crt.initLocks().known).toBe(false);
    expect(crt.snapshot().trace.slice(-5)).toEqual(['GetModuleHandleA(KERNEL32.DLL).attempt', 'GetModuleHandleA(KERNEL32.DLL)',
      'pointerEncodingAvailability3067ddf8', 'getWinMajor3067d0e1', 'GetModuleHandleA(NULL) / physical process PE .mixcrt scan3067ddf8.boundary']);
  });
  it('translates only the source-selected OOM exception to initialization failure', () => {
    class Oom extends NativeRuntimePlatform {
      override initializePhysicalCriticalSection(): NativeValue<boolean> { throw new NativeWin32PlatformException(0xc0000017); }
    }
    const platform = new Oom({ engineCrtServices: services }), crt = new NativeEngineCrtOwner({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
    expect(crt.initLocks()).toEqual(known(0)); expect(section(crt, 0)).toBeNull();
    expect(crt.snapshot().trace).toContain('initCritSecExceptionHandler30696521.return0');
    expect(platform.getWin32LastError()).toEqual(known(8));
    expect(crt.snapshot().trace.indexOf('SetLastError(8)')).toBeLessThan(crt.snapshot().trace.indexOf('lock0.static.clear'));
    class Other extends NativeRuntimePlatform {
      override initializePhysicalCriticalSection(): NativeValue<boolean> { throw new NativeWin32PlatformException(0xc0000005); }
    }
    const other = new NativeEngineCrtOwner({ platform: new Other({ engineCrtServices: services }) });
    other.physical.crtOsFields.writeUnsigned(0, 2); other.physical.crtOsFields.writeUnsigned(12, 6);
    expect(other.initLocks().known).toBe(false); expect(section(other, 0)).not.toBeNull();
  });
  it('allocates dynamic lock5 under static lock10 and shares same owner with lock14', () => {
    const { crt, platform } = selected(); const initial = platform.snapshot().physicalSections.length;
    expect(crt.ensureLock(5)).toEqual(known(1)); const fields = section(crt, 5)!;
    expect(fields.bytes.length).toBe(24); expect(fields.knownMask).toEqual(new Uint8Array(24));
    expect(fields.backing).toBe(crt.snapshot().allocations[0]);
    expect(platform.snapshot().physicalSections).toHaveLength(initial + 1);
    expect(platform.snapshot().physicalSections.at(-1)!.owner).toBe(crt.identity);
    expect(crt.ensureLock(5)).toEqual(known(1)); expect(crt.snapshot().allocations).toHaveLength(1);
    fact(crt.lock(5)); fact(crt.lock(5)); fact(crt.lock(14));
    expect(platform.snapshot().physicalSections.find(entry => entry.fields === fields)!.depth).toBe(2);
    fact(crt.unlock(5)); fact(crt.unlock(5)); fact(crt.unlock(14));
    expect(platform.snapshot().physicalSections.every(entry => entry.depth === 0)).toBe(true);
    const trace = crt.snapshot().trace;
    expect(trace.indexOf('lock10.enter')).toBeLessThan(trace.indexOf('lock5.dynamic.publish'));
    expect(trace.indexOf('lock5.dynamic.publish')).toBeLessThan(trace.indexOf('lock10.leave'));
  });
  it('keeps the missing-heap fatal boundary before ensureLock existing-pointer fast path', () => {
    const platform = new NativeRuntimePlatform({ engineCrtServices: services }), crt = new NativeEngineCrtOwner({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6); fact(crt.initLocks());
    expect(crt.ensureLock(14).known).toBe(false);
    expect(crt.snapshot().allocations).toHaveLength(0);
    expect(crt.snapshot().trace.at(-1)).toContain('__FF_MSGBANNER3067e8e6');
  });
  it('returns null dynamic allocation only after all three source errno accessor stores', () => {
    class FailAlloc extends NativeRuntimePlatform {
      override win32HeapAlloc(): NativeValue<NativeMemoryBacking | null> { return known(null); }
    }
    const { crt, errno, errnoCalls, platform } = selected(new FailAlloc({ engineCrtServices: services }));
    expect(crt.ensureLock(5)).toEqual(known(0)); expect(errno.readUnsigned(0)).toBe(12); expect(errnoCalls()).toBe(3);
    expect(section(crt, 5)).toBeNull(); expect(platform.snapshot().physicalSections.find(entry => entry.fields === section(crt, 10))!.depth).toBe(0);
  });
  it('frees failed dynamic initialization then stores errno12 and unlocks10 before returning0', () => {
    class FailDynamic extends NativeRuntimePlatform {
      override initializePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object, count: 4000): NativeValue<boolean> {
        return fields.knownMask.every(mask => mask === 0) ? known(false) : super.initializePhysicalCriticalSection(fields, owner, count);
      }
    }
    const { crt, errno, platform } = selected(new FailDynamic({ engineCrtServices: services }));
    expect(crt.ensureLock(5)).toEqual(known(0)); expect(section(crt, 5)).toBeNull();
    expect(crt.snapshot().allocations[0]!.freed).toBe(true); expect(errno.readUnsigned(0)).toBe(12);
    const trace = crt.snapshot().trace;
    expect(trace.lastIndexOf('HeapFree')).toBeLessThan(trace.lastIndexOf('errno.store12'));
    expect(trace.lastIndexOf('errno.store12')).toBeLessThan(trace.lastIndexOf('lock10.leave'));
    expect(platform.snapshot().physicalSections.every(entry => entry.depth === 0)).toBe(true);
  });
  it('preserves the freed allocation and held lock10 when the post-free errno gate is unknown', () => {
    class FailDynamic extends NativeRuntimePlatform {
      override initializePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object, count: 4000): NativeValue<boolean> {
        return fields.knownMask.every(mask => mask === 0) ? known(false) : super.initializePhysicalCriticalSection(fields, owner, count);
      }
    }
    const platform = new FailDynamic({ engineCrtServices: services }), crt = new NativeEngineCrtOwner({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6); fact(crt.initHeap()); fact(crt.initLocks());
    expect(crt.ensureLock(5).known).toBe(false); expect(crt.snapshot().allocations[0]!.freed).toBe(true);
    expect(platform.snapshot().physicalSections.find(entry => entry.fields === section(crt, 10))!.depth).toBe(1);
    const before = crt.snapshot().trace; expect(crt.ensureLock(5).known).toBe(false); expect(crt.snapshot().trace).toEqual(before);
    fact(crt.unlock(10));
  });
  it('frees the race-losing24-byte allocation without reinitializing the published section', () => {
    let crt: NativeEngineCrtOwner; let fired = false;
    class Race extends NativeRuntimePlatform {
      override enterPhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object): NativeValue<void> {
        const entered = super.enterPhysicalCriticalSection(fields, owner);
        if (entered.known && fields === section(crt, 10) && !fired) { fired = true; expect(crt.ensureLock(5)).toEqual(known(1)); }
        return entered;
      }
    }
    const fixture = selected(new Race({ engineCrtServices: services })); crt = fixture.crt;
    expect(crt.ensureLock(5)).toEqual(known(1));
    expect(crt.snapshot().allocations.map(backing => backing.freed)).toEqual([true, false]);
    expect(section(crt, 5)!.backing).toBe(crt.snapshot().allocations[1]);
    expect(crt.snapshot().trace).toContain('lock5.race.free');
    expect(fixture.platform.snapshot().physicalSections).toHaveLength(15);
    expect(fixture.platform.snapshot().physicalSections.every(entry => entry.depth === 0)).toBe(true);
  });
  it('uses the source malloc-zero request and owns heap allocation/free/destruction lifetimes', () => {
    const { crt, platform } = selected(); const backing = fact(crt.malloc(0))!;
    expect(backing.bytes.length).toBe(1); expect(backing.knownMask).toEqual(new Uint8Array(1));
    expect(platform.crtFree(backing).known).toBe(false);
    expect(crt.free({ ...backing }).known).toBe(false); expect(backing.freed).toBe(false);
    fact(crt.free(backing)); expect(backing.freed).toBe(true);
    fact(crt.terminateHeap()); expect(crt.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(platform.snapshot().winHeaps[0]!.destroyed).toBe(true); expect(crt.initHeap().known).toBe(false);
  });
  it('preserves new-handler retries and mallocCrt Sleep0/1000 source sequence', () => {
    class Retry extends NativeRuntimePlatform {
      attempts = 0;
      override win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0, bytes: number): NativeValue<NativeMemoryBacking | null> {
        return ++this.attempts < 3 ? known(null) : super.win32HeapAlloc(heap, flags, bytes);
      }
    }
    const sleeps: number[] = [], platform = new Retry({ engineCrtServices: services });
    const { crt, errnoCalls } = selected(platform, { sleep: ms => { sleeps.push(ms); return known(undefined); } });
    crt.physical.mallocWait.writeUnsigned(0, 2000);
    expect(fact(crt.mallocCrt(24))!.bytes.length).toBe(24); expect(sleeps).toEqual([0, 1000]); expect(errnoCalls()).toBe(4);
    class NewRetry extends NativeRuntimePlatform {
      attempts = 0;
      override win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0, bytes: number): NativeValue<NativeMemoryBacking | null> {
        return ++this.attempts === 1 ? known(null) : super.win32HeapAlloc(heap, flags, bytes);
      }
    }
    let handlers = 0;
    const retry = selected(new NewRetry({ engineCrtServices: services }), { callNewHandler: bytes => { expect(bytes).toBe(24); handlers++; return known(1); } });
    retry.crt.physical.newMode.writeUnsigned(0, 1);
    expect(fact(retry.crt.malloc(24))!.bytes.length).toBe(24); expect(handlers).toBe(1); expect(retry.errnoCalls()).toBe(0);
  });
  it('gates the oversize new-handler call before heap access and errno', () => {
    const crt = new NativeEngineCrtOwner({ platform: new NativeRuntimePlatform() });
    expect(crt.malloc(0xffffffe1).known).toBe(false);
    expect(crt.snapshot().trace).toEqual(['callNewHandler306824b9.attempt']);
  });
  it('obtains errno before GetLastError and maps failure without claiming the backing was freed', () => {
    class FailFree extends NativeRuntimePlatform {
      override win32HeapFree(): NativeValue<boolean> { return known(false); }
    }
    const { crt, errno } = selected(new FailFree({ engineCrtServices: services }), { getLastError: () => known(5), mapOsError: code => { expect(code).toBe(5); return known(13); } });
    const backing = fact(crt.malloc(24))!; expect(crt.free(backing)).toEqual(known(undefined)); expect(backing.freed).toBe(false);
    expect(errno.readUnsigned(0)).toBe(13);
    expect(crt.snapshot().trace.slice(-7)).toEqual(['__errno306783df.attempt', '__errno306783df', 'GetLastError.attempt', 'GetLastError',
      'osErrorToErrno306783a4.attempt', 'osErrorToErrno306783a4', 'errno.store13']);
  });
  it('terminates dynamic sections before statics, clears dynamic slots and retains static pointers', () => {
    const { crt, platform } = selected(); fact(crt.ensureLock(5)); fact(crt.ensureLock(9));
    const fifth = section(crt, 5), ninth = section(crt, 9), before = [...crt.physical.lockTable.knownMask];
    expect(crt.terminateLocks()).toEqual(known(undefined));
    expect(section(crt, 5)).toBeNull(); expect(section(crt, 9)).toBeNull();
    for (const id of [5, 9]) before.fill(255, id * 8, id * 8 + 4);
    expect([...crt.physical.lockTable.knownMask]).toEqual(before);
    expect(section(crt, 14)).not.toBeNull();
    expect(fifth!.backing.freed).toBe(true); expect(ninth!.backing.freed).toBe(true);
    expect(platform.snapshot().physicalSections.every(entry => entry.deleted)).toBe(true);
    expect(crt.snapshot().trace.filter(entry => /^lock\d+\.delete$/.test(entry))).toEqual([
      'lock5.delete', 'lock9.delete', 'lock0.delete', 'lock1.delete', 'lock3.delete', 'lock4.delete', 'lock6.delete', 'lock7.delete',
      'lock8.delete', 'lock10.delete', 'lock12.delete', 'lock13.delete', 'lock14.delete', 'lock16.delete', 'lock17.delete', 'lock18.delete']);
    const trace = crt.snapshot().trace; fact(crt.terminateLocks()); expect(crt.snapshot().trace).toEqual(trace);
    expect(crt.initLocks().known).toBe(false); expect(crt.lock(14).known).toBe(false);
  });
  it('rejects detached section owners, copied canonical backing, masks and ended lifetimes', () => {
    const { crt, platform } = selected(); const fields = section(crt, 10)!;
    expect(platform.enterPhysicalCriticalSection(fields, {}).known).toBe(false);
    const alias = new NativeHeapObjectViews(fields.backing, fields.bytes.byteOffset - fields.backing.bytes.byteOffset, 24);
    fact(platform.enterPhysicalCriticalSection(alias, crt.identity)); fact(platform.leavePhysicalCriticalSection(fields, crt.identity));
    const copied = new NativeHeapObjectViews({ ...fields.backing }, fields.bytes.byteOffset - fields.backing.bytes.byteOffset, 24);
    expect(platform.enterPhysicalCriticalSection(copied, crt.identity).known).toBe(false);
    const detached = new NativeHeapObjectViews({ ...fields.backing, knownMask: fields.backing.knownMask.slice() }, fields.bytes.byteOffset - fields.backing.bytes.byteOffset, 24);
    expect(platform.enterPhysicalCriticalSection(detached, crt.identity).known).toBe(false);
    fact(crt.ensureLock(5)); const dynamic = section(crt, 5)!;
    fact(crt.free(dynamic.backing as NativeMemoryBacking));
    expect(platform.enterPhysicalCriticalSection(dynamic, crt.identity).known).toBe(false);
  });
  it('requires canonical initialization rather than zero bytes, numeric pointers or a disconnected identity', () => {
    const platform = new NativeRuntimePlatform(), fields = storage(24, 255), owner = {};
    expect(platform.enterPhysicalCriticalSection(fields, owner).known).toBe(false);
    expect(platform.initializePhysicalCriticalSection(storage(23), owner, 4000).known).toBe(false);
    expect(platform.initializePhysicalCriticalSection(fields, owner, 1000 as 4000).known).toBe(false);
    fact(platform.initializePhysicalCriticalSection(fields, owner, 4000));
    expect(fields.knownMask).toEqual(new Uint8Array(24));
    const disconnected = new NativeHeapObjectViews({ ...fields.backing, identity: {} });
    expect(platform.initializePhysicalCriticalSection(disconnected, owner, 4000).known).toBe(false);
    expect(platform.enterPhysicalCriticalSection(disconnected, owner).known).toBe(false);
    const slot = storage(4, 255); slot.writeUnsigned(0, 0x30af75a0);
    expect(() => slot.pointer<object>(0).get()).toThrow('no owned browser capability');
  });
  it('terminates an actual dynamic section alias using its retained original heap backing', () => {
    const { crt } = selected(); fact(crt.ensureLock(5)); const fields = section(crt, 5)!;
    const alias = new NativeHeapObjectViews(fields.backing, 0, 24);
    crt.physical.lockTable.pointer<NativeHeapObjectViews>(5 * 8).set(alias);
    fact(crt.terminateLocks()); expect(fields.backing.freed).toBe(true); expect(section(crt, 5)).toBeNull();
  });
  it('preserves cached procedure and static publication before an unowned OOM last-error gate', () => {
    class LastErrorGate extends NativeRuntimePlatform {
      override initializePhysicalCriticalSection(): NativeValue<boolean> { throw new NativeWin32PlatformException(0xc0000017); }
      override setWin32LastError(): NativeValue<void> { return { known: false, reason: 'Unowned selected last-error writer' }; }
    }
    const crt = new NativeEngineCrtOwner({ platform: new LastErrorGate({ engineCrtServices: services }) });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
    expect(crt.initLocks().known).toBe(false); expect(section(crt, 0)).not.toBeNull();
    expect(crt.physical.sectionInitializer.pointer<object>(0).get()).not.toBeNull();
    expect(crt.snapshot().trace.at(-1)).toBe('SetLastError(8).attempt');
    const before = crt.snapshot().trace; expect(crt.initLocks().known).toBe(false); expect(crt.snapshot().trace).toEqual(before);
  });
  it('keeps applied HeapFree effects and prevents replay through another cleanup call', () => {
    class FreeGate extends NativeRuntimePlatform {
      calls = 0;
      override win32HeapFree(heap: NativeWin32HeapCapability, flags: 0, backing: NativeMemoryBacking): NativeValue<boolean> {
        this.calls++; fact(super.win32HeapFree(heap, flags, backing)); return { known: false, reason: 'Unowned post-free result' };
      }
    }
    const platform = new FreeGate({ engineCrtServices: services }), { crt } = selected(platform);
    const backing = fact(crt.malloc(24))!;
    expect(crt.free(backing).known).toBe(false); expect(backing.freed).toBe(true);
    expect(crt.free(backing).known).toBe(false); expect(platform.calls).toBe(1);
    expect(crt.free(null)).toEqual(known(undefined));
  });
  it('retains returned HeapCreate capability if initialization reenters and blocks the remaining stores', () => {
    let crt: NativeEngineCrtOwner;
    class Reenter extends NativeRuntimePlatform {
      override createWin32Heap(owner: object, options: 0 | 1, initial: 4096, maximum: 0): NativeValue<NativeWin32HeapCapability | null> {
        const heap = super.createWin32Heap(owner, options, initial, maximum);
        expect(crt.initHeap().known).toBe(false); return heap;
      }
    }
    const platform = new Reenter(); crt = new NativeEngineCrtOwner({ platform });
    expect(crt.initHeap().known).toBe(false); expect(crt.snapshot().heaps).toHaveLength(1);
    expect(crt.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(crt.snapshot().trace).toEqual(['HeapCreate.attempt']);
    expect(crt.initHeap().known).toBe(false); expect(platform.snapshot().winHeaps).toHaveLength(1);
  });
});
