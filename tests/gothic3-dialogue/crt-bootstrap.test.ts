import {browserGameProcessInputs} from '../../src/gothic3/browser-game-process-inputs';
import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeCrtBootstrap } from '../../src/gothic3/native-crt-bootstrap';
import { NativeEngineIoImages } from '../../src/gothic3/native-engine-io-images';
import { NativeEngineCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeWin32HeapCapability } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const fact = <T>(value: NativeValue<T>): T => { if (!value.known) throw new Error(value.reason); return value.value; };
const entropy = {
  systemTimeAsFileTime: () => known({ low: 0x10203040, high: 0xabcdef12 }),
  currentProcessId: () => known(0x1234), currentThreadId: () => known(0x5678),
  tickCount: () => known(0x99887766), performanceCounter: () => known({ success: true, low: 0x66667777, high: 0x13579abc }),
};
const services = {
  tlsValues: new Map<number, object>(), kernel32Available: true, pointerCodec: 'absent' as const,
  fiberLocalStorage: true, processHeap: true, osVersion: { platform: 2, major: 6, minor: 1, build: 0xabcd }, entropy,
};
function selected(platform = new NativeRuntimePlatform({ engineCrtServices: services })) {
  let bootstrap: NativeCrtBootstrap;
  const crt = new NativeEngineCrtOwner({ platform, errnoSlot: () => bootstrap.thread.errnoSlot(),
    getLastError: () => platform.getWin32LastError() });
  bootstrap = NativeCrtBootstrap.forCrt(crt); return { platform, crt, bootstrap };
}
function cookieFrom(low: number, high: number, pid = 0, tid = 0, tick = 0, counterLow = 0, counterHigh = 0) {
  let value = (low ^ high ^ pid ^ tid ^ tick ^ counterLow ^ counterHigh) >>> 0;
  if (value === 0xbb40e64e) value = 0xbb40e64f;
  else if ((value & 0xffff0000) === 0) value = (value | (value << 16)) >>> 0;
  return value;
}

describe('ordinary Engine DLL attach prefix with actual CRT startup owners', () => {
  it('shares the full lifecycle, frames, procedure identities and thread owner for a CRT', () => {
    const { crt, bootstrap } = selected(new NativeRuntimePlatform());
    const result = bootstrap.processAttach(); expect(result.known).toBe(false);
    const second = NativeCrtBootstrap.forCrt(crt);
    expect(second).toBe(bootstrap); expect(second.physical).toBe(bootstrap.physical);
    expect(second.thread).toBe(bootstrap.thread); expect(second.snapshot().terminateTarget).toBe(bootstrap.snapshot().terminateTarget);
    const before = bootstrap.snapshot().trace; expect(second.processAttach()).toEqual(result);
    expect(second.snapshot().trace).toEqual(before);
  });
  it('keeps original cookie/complement and stops before a missing FILETIME writer without replay', () => {
    const { crt, bootstrap } = selected(new NativeRuntimePlatform());
    expect(bootstrap.physical.securityCookie.readUnsigned(0)).toBe(0xbb40e64e);
    expect(bootstrap.physical.securityCookieComplement.readUnsigned(0)).toBe(0x44bf19b1);
    const result = bootstrap.entry(null, 1, null);
    expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('GetSystemTimeAsFileTime');
    expect(bootstrap.snapshot().cookieFrame!.bytes.length).toBe(16);
    expect([...bootstrap.snapshot().cookieFrame!.knownMask]).toEqual([...new Uint8Array(8), ...new Uint8Array(8).fill(255)]);
    expect(bootstrap.snapshot().cookieFrame!.backing.freed).toBe(false);
    expect(crt.physical.crtOsFields.readUnsigned(0)).toBe(0);
    expect(crt.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    const before = bootstrap.snapshot().trace;
    expect(bootstrap.entry(null, 1, null)).toEqual(result); expect(bootstrap.snapshot().trace).toEqual(before);
  });
  it('uses owned entropy in exact call order and expires the actual cookie frame on return', () => {
    const { bootstrap } = selected();
    expect(bootstrap.initializeSecurityCookie()).toEqual(known(undefined));
    const cookie = cookieFrom(0x10203040, 0xabcdef12, 0x1234, 0x5678, 0x99887766, 0x66667777, 0x13579abc);
    expect(bootstrap.physical.securityCookie.readUnsigned(0)).toBe(cookie);
    expect(bootstrap.physical.securityCookieComplement.readUnsigned(0)).toBe((~cookie) >>> 0);
    expect(bootstrap.snapshot().trace.filter(step => step.endsWith('.attempt'))).toEqual([
      'GetSystemTimeAsFileTime.attempt', 'GetCurrentProcessId.attempt', 'GetCurrentThreadId.attempt',
      'GetTickCount.attempt', 'QueryPerformanceCounter.attempt',
    ]);
    expect(bootstrap.snapshot().cookieFrame!.backing.freed).toBe(true);
    expect(() => bootstrap.snapshot().cookieFrame!.readUnsigned(8)).toThrow('freed');
    const trace = bootstrap.snapshot().trace; fact(bootstrap.initializeSecurityCookie());
    expect(bootstrap.snapshot().trace).toEqual(trace);
  });
  it('reads the cookie before the local FILETIME zero stores', () => {
    const { bootstrap } = selected(); bootstrap.physical.securityCookie.knownMask.fill(0);
    expect(bootstrap.initializeSecurityCookie().known).toBe(false);
    expect(bootstrap.snapshot().cookieFrame!.knownMask).toEqual(new Uint8Array(16));
    expect(bootstrap.snapshot().trace).toEqual([]);
  });
  it('takes both original cookie special-value branches, including an exact zero result', () => {
    for (const input of [0xbb40e64e, 0x1234, 0]) {
      const platform = new NativeRuntimePlatform({ engineCrtServices: { ...services, entropy: {
        systemTimeAsFileTime: () => known({ low: input, high: 0 }), currentProcessId: () => known(0),
        currentThreadId: () => known(0), tickCount: () => known(0), performanceCounter: () => known({ success: true, low: 0, high: 0 }),
      } } });
      const { bootstrap } = selected(platform); fact(bootstrap.initializeSecurityCookie());
      expect(bootstrap.physical.securityCookie.readUnsigned(0)).toBe(cookieFrom(input, 0));
      expect(bootstrap.physical.securityCookieComplement.readUnsigned(0)).toBe((~cookieFrom(input, 0)) >>> 0);
    }
  });
  it('updates complement for an existing nondefault high-word cookie without entropy calls', () => {
    const { bootstrap } = selected(new NativeRuntimePlatform());
    bootstrap.physical.securityCookie.writeUnsigned(0, 0x12345678);
    fact(bootstrap.initializeSecurityCookie());
    expect(bootstrap.physical.securityCookie.readUnsigned(0)).toBe(0x12345678);
    expect(bootstrap.physical.securityCookieComplement.readUnsigned(0)).toBe(0xedcba987);
    expect(bootstrap.snapshot().trace.some(step => step.endsWith('.attempt'))).toBe(false);
    expect(bootstrap.snapshot().cookieFrame!.backing.freed).toBe(true);
  });
  it('ignores QueryPerformanceCounter BOOL but gates an untouched unknown output before cookie stores', () => {
    class FailedCounter extends NativeRuntimePlatform {
      override queryPerformanceCounter(): NativeValue<boolean> { return known(false); }
    }
    const { bootstrap } = selected(new FailedCounter({ engineCrtServices: services }));
    expect(bootstrap.initializeSecurityCookie().known).toBe(false);
    expect(bootstrap.physical.securityCookie.readUnsigned(0)).toBe(0xbb40e64e);
    expect(bootstrap.physical.securityCookieComplement.readUnsigned(0)).toBe(0x44bf19b1);
    expect(bootstrap.snapshot().cookieFrame!.backing.freed).toBe(false);
    expect([...bootstrap.snapshot().cookieFrame!.knownMask.subarray(0, 8)]).toEqual([...new Uint8Array(8)]);
    class WrittenFailedCounter extends NativeRuntimePlatform {
      override queryPerformanceCounter(fields: NativeHeapObjectViews): NativeValue<boolean> {
        fields.writeUnsigned(0, 1); fields.writeUnsigned(4, 2); return known(false);
      }
    }
    const written = selected(new WrittenFailedCounter({ engineCrtServices: services })).bootstrap;
    fact(written.initializeSecurityCookie());
    expect(written.physical.securityCookie.readUnsigned(0)).toBe(cookieFrom(0x10203040, 0xabcdef12, 0x1234, 0x5678, 0x99887766, 1, 2));
  });
  it('returns zero on cold process detach before cookie, OS or Engine DllMain work', () => {
    const { bootstrap } = selected(new NativeRuntimePlatform());
    expect(bootstrap.entry(null, 0, null)).toEqual(known(0));
    expect(bootstrap.snapshot().trace).toEqual(['entry3067744b.reason0', 'dllMainCrtStartup30677355', 'entry.return0']);
    expect(bootstrap.snapshot().cookieFrame).toBeNull(); expect(bootstrap.snapshot().versionRecord).toBeNull();
  });
  it('binds a completed entry result to its actual module, reason and reserved arguments', () => {
    const { bootstrap } = selected(new NativeRuntimePlatform());
    expect(bootstrap.entry(null, 0, null)).toEqual(known(0));
    const before = bootstrap.snapshot().trace;
    const changed = bootstrap.entry({}, 1, null); expect(changed.known).toBe(false);
    if (!changed.known) expect(changed.reason).toContain('separate owned frame');
    expect(bootstrap.entry(null, 0, null)).toEqual(known(0)); expect(bootstrap.snapshot().trace).toEqual(before);
    expect(bootstrap.snapshot().cookieFrame).toBeNull();
  });
  it('retains FILETIME callback writes but stops before subsequent calls after reentrant initialization fails', () => {
    let bootstrap: NativeCrtBootstrap;
    class RecursiveTime extends NativeRuntimePlatform {
      override getSystemTimeAsFileTime(fields: NativeHeapObjectViews): NativeValue<void> {
        expect(bootstrap.initializeSecurityCookie().known).toBe(false);
        fields.writeUnsigned(0, 0x11223344); fields.writeUnsigned(4, 0x55667788); return known(undefined);
      }
    }
    bootstrap = selected(new RecursiveTime({ engineCrtServices: services })).bootstrap;
    const result = bootstrap.initializeSecurityCookie(); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('cannot replay');
    const frame = bootstrap.snapshot().cookieFrame!;
    expect(frame.readUnsigned(8)).toBe(0x11223344); expect(frame.readUnsigned(12)).toBe(0x55667788);
    expect(frame.backing.freed).toBe(false); expect(bootstrap.physical.securityCookie.readUnsigned(0)).toBe(0xbb40e64e);
    expect(bootstrap.snapshot().trace.at(-1)).toBe('GetSystemTimeAsFileTime.attempt');
    const trace = bootstrap.snapshot().trace; expect(bootstrap.initializeSecurityCookie()).toEqual(result);
    expect(bootstrap.snapshot().trace).toEqual(trace);
  });
  it('preserves completed cookie stores before an unowned process heap gate', () => {
    const { bootstrap } = selected(new NativeRuntimePlatform({ engineCrtServices: { ...services, processHeap: undefined } }));
    const result = bootstrap.entry({}, 1, null); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('GetProcessHeap');
    expect(bootstrap.snapshot().cookiePhase).toBe('returned');
    expect(bootstrap.snapshot().trace.at(-1)).toBe('GetProcessHeap.attempt');
  });
  it('returns known zero on null process allocation before OS writes and thread setup', () => {
    class NullAllocation extends NativeRuntimePlatform {
      override win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null> {
        return bytes === 148 ? known(null) : super.win32HeapAlloc(heap, flags, bytes);
      }
    }
    const { bootstrap, crt } = selected(new NullAllocation({ engineCrtServices: services }));
    expect(bootstrap.processAttach()).toEqual(known(0)); expect(bootstrap.processAttach()).toEqual(known(0));
    expect(bootstrap.snapshot().versionRecord).toBeNull(); expect(crt.physical.crtOsFields.readUnsigned(0)).toBe(0);
    expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
    expect(bootstrap.snapshot().trace).toEqual(['GetProcessHeap.attempt', 'GetProcessHeap',
      'HeapAlloc(processHeap,0,148).attempt', 'HeapAlloc(processHeap,0,148)', 'crtAttach.return0']);
  });
  it('frees a failed version query record before returning zero, without publishing OS fields', () => {
    class NoVersion extends NativeRuntimePlatform {
      override getVersionExA(fields: NativeHeapObjectViews): NativeValue<boolean> {
        expect(fields.bytes.length).toBe(148); expect(fields.readUnsigned(0)).toBe(148);
        expect([...fields.knownMask.subarray(4)]).toEqual([...new Uint8Array(144)]); return known(false);
      }
    }
    const { bootstrap, crt } = selected(new NoVersion({ engineCrtServices: services }));
    expect(bootstrap.processAttach()).toEqual(known(0));
    expect(bootstrap.snapshot().versionRecord!.backing.freed).toBe(true);
    expect(crt.physical.crtOsFields.bytes).toEqual(new Uint8Array(20));
    expect(bootstrap.snapshot().trace.at(-2)).toBe('HeapFree(processHeap,0,OSVERSIONINFOA)');
  });
  it('returns zero on HeapCreate NULL after the exact OS publication prefix', () => {
    class NullHeap extends NativeRuntimePlatform {
      override createWin32Heap(): NativeValue<NativeWin32HeapCapability | null> { return known(null); }
    }
    const { bootstrap, crt } = selected(new NullHeap({ engineCrtServices: services }));
    expect(bootstrap.processAttach()).toEqual(known(0));
    expect([...crt.physical.crtOsFields.dwordArray(0, 5)]).toEqual([2, 0x2bcd, 0x601, 6, 1]);
    expect(crt.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
    expect(bootstrap.snapshot().trace.at(-2)).toBe('heapInit3068442b');
  });
  it('terminates the allocated CRT heap after a known-zero MT initialization result', () => {
    class NoTlsIndex extends NativeRuntimePlatform {
      override tlsAlloc(): NativeValue<number> { return known(0xffffffff); }
    }
    const { bootstrap, crt, platform } = selected(new NoTlsIndex({ engineCrtServices: services }));
    expect(bootstrap.processAttach()).toEqual(known(0));
    expect(crt.snapshot().heapTerminated).toBe(true); expect(crt.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(platform.snapshot().winHeaps.filter(heap => heap.destroyed)).toHaveLength(1);
    expect(crt.physical.crtTlsIndexes.readUnsigned(0)).toBe(0xffffffff);
    expect(crt.physical.crtTlsIndexes.readUnsigned(4)).toBe(0xffffffff);
    expect(bootstrap.snapshot().trace.slice(-5)).toEqual(['mtInit3067e2d9.attempt', 'mtInit3067e2d9',
      'heapTerm30684485.attempt', 'heapTerm30684485', 'crtAttach.return0']);
    const trace = bootstrap.snapshot().trace; expect(bootstrap.processAttach()).toEqual(known(0));
    expect(bootstrap.snapshot().trace).toEqual(trace);
  });
  it('ignores a known-false process HeapFree result and retains the leaked physical record', () => {
    class KeepVersion extends NativeRuntimePlatform {
      override win32HeapFree(heap: NativeWin32HeapCapability, flags: 0, backing: NativeMemoryBacking): NativeValue<boolean> {
        return backing.bytes.length === 148 ? known(false) : super.win32HeapFree(heap, flags, backing);
      }
    }
    const { bootstrap, crt } = selected(new KeepVersion({ engineCrtServices: services }));
    const result = bootstrap.processAttach(); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('GetCommandLineA');
    expect(bootstrap.snapshot().versionRecord!.backing.freed).toBe(false);
    expect([...crt.physical.crtOsFields.dwordArray(0, 5)]).toEqual([2, 0x2bcd, 0x601, 6, 1]);
  });
  it('uses actual OS record output, source store order, heap selector and MT initialization before command-line gate', () => {
    const { bootstrap, crt, platform } = selected();
    const module = Object.freeze({});
    const result = bootstrap.entry(module, 1, null); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('GetCommandLineA IAT30afc69c at30677251');
    expect(bootstrap.snapshot().versionRecord!.backing.freed).toBe(true);
    expect([...crt.physical.crtOsFields.dwordArray(0, 5)]).toEqual([2, 0x2bcd, 0x601, 6, 1]);
    expect(crt.physical.heapSelector.readUnsigned(0)).toBe(1);
    expect(crt.physical.crtTlsIndexes.readUnsigned(0)).not.toBe(0xffffffff);
    expect(crt.physical.crtTlsIndexes.readUnsigned(4)).not.toBe(0xffffffff);
    const ptd = fact(bootstrap.thread.getPtdNoExit())!;
    expect(ptd.bytes.length).toBe(532); expect(ptd.readUnsigned(0)).toBe(0x5678); expect(ptd.readUnsigned(4)).toBe(0xffffffff);
    expect(bootstrap.physical.attachCount.readUnsigned(0)).toBe(0);
    const trace = bootstrap.snapshot().trace;
    expect(trace.filter(step => step.startsWith('os.'))).toEqual(['os.platform.store30677203', 'os.version.store30677214',
      'os.major.store3067721a', 'os.minor.store3067721f', 'os.build.store30677225']);
    expect(trace.indexOf('HeapFree(processHeap,0,OSVERSIONINFOA)')).toBeLessThan(trace.indexOf('os.platform.store30677203'));
    expect(trace.filter(step => step.startsWith('preCInit3068e95d.read'))).toHaveLength(64);
    expect(trace.at(-1)).toBe('GetCommandLineA IAT30afc69c at30677251.boundary');
    expect(platform.snapshot().physicalSections).toHaveLength(14);
    const heapCount = platform.snapshot().winHeaps.length, before = bootstrap.snapshot().trace;
    expect(bootstrap.entry(module, 1, null)).toEqual(result); expect(bootstrap.snapshot().trace).toEqual(before);
    expect(platform.snapshot().winHeaps).toHaveLength(heapCount);
  });
  it('stores encoded NULL and source function capabilities in canonical pointer slots before locks', () => {
    const { bootstrap, crt, platform } = selected(new NativeRuntimePlatform({ engineCrtServices: { ...services, pointerCodec: 'owned-bijection' } }));
    const result = bootstrap.processAttach(); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('GetCommandLineA');
    const slots = crt.physical.pointerInitialization;
    expect(slots.sectionInitializer).toBe(crt.physical.sectionInitializer);
    for (const fields of [slots.newHandler, slots.invalidParameter, slots.exceptionFilter, slots.mathError]) {
      expect(fact(crt.decodePointer(fields.pointer<object>(0).get()))).toBeNull();
    }
    for (let offset = 0; offset < 16; offset += 4) expect(fact(crt.decodePointer(slots.winSignalPointers.pointer<object>(offset).get()))).toBeNull();
    expect(fact(crt.decodePointer(slots.terminateHandler.pointer<object>(0).get()))).toBe(bootstrap.snapshot().terminateTarget);
    expect(fact(crt.decodePointer(slots.exitFunction.pointer<object>(0).get()))).toBe(bootstrap.snapshot().exitTarget);
    expect(bootstrap.snapshot().terminateTarget.invoke().known).toBe(false); expect(bootstrap.snapshot().exitTarget.invoke().known).toBe(false);
    expect(platform.snapshot().physicalSections).toHaveLength(14);
    expect(bootstrap.snapshot().trace.indexOf('exitFunction.store3067d3c0')).toBeLessThan(bootstrap.snapshot().trace.indexOf('mtInit3067e2d9'));
  });
  it('retains the source non-NT build high bit before its small-block heap boundary', () => {
    const { bootstrap, crt } = selected(new NativeRuntimePlatform({ engineCrtServices: { ...services,
      osVersion: { platform: 1, major: 4, minor: 10, build: 0x12345678 } } }));
    expect(bootstrap.processAttach().known).toBe(false);
    expect([...crt.physical.crtOsFields.dwordArray(0, 5)]).toEqual([1, 0xd678, 0x40a, 4, 10]);
    expect(crt.physical.heapSelector.readUnsigned(0)).toBe(3);
  });
});

it('stores Engine command-line and converted environment pointers before the I/O call',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{...services,tlsValues:new Map(),processInputs:browserGameProcessInputs}});
 const {bootstrap}=selected(platform);const result=bootstrap.processAttach();
 expect(result.known).toBe(false);if(result.known)throw new Error('Engine attach remains unfinished');
 expect(result.reason).toContain('Engine ioInit306886ec at30677266');
 const progress=bootstrap.attachProgress();expect(progress.commandLineReturned).toBe(true);expect(progress.commandLineNonNull).toBe(true);
 const fields=progress.engineCommandLineStorage!,pointer=fields.pointer(0).get();expect(pointer).not.toBe(null);
 expect([...fields.knownMask]).toEqual(Array(4).fill(0));expect(progress.environmentReturned).toBe(true);
 expect(progress.engineEnvironmentStorage!.pointer(0).get()).toBe(progress.engineEnvironmentProgress!.output);
 const before=bootstrap.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.snapshot().trace).toEqual(before);
});
it('retains completed environment stores when changed I/O scope blocks the next call',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{...services,tlsValues:new Map(),processInputs:browserGameProcessInputs}});
 const {bootstrap,crt}=selected(platform),owner=bootstrap.attachProgress().engineIoImages!;
 const scope=fact(NativeEngineIoImages.imageForCrt(owner,crt,'ioSehScope'));
 scope.knownMask[0]=0;
 const result=bootstrap.processAttach();expect(result.known).toBe(false);
 if(result.known)throw new Error('Changed scope must block Engine I/O');
 expect(result.reason).toContain('Engine I/O image authority ioHandleCount');
 expect(result.reason).toContain('Native field contains unowned backing bits');
 const progress=bootstrap.attachProgress();expect(progress.environmentReturned).toBe(true);
 expect(progress.engineEnvironmentStorage!.pointer(0).get()).toBe(progress.engineEnvironmentProgress!.output);
 expect(progress.ioResult).toBe(null);expect(progress.ioProgress).toBe(null);
 const before=bootstrap.snapshot().trace;expect(bootstrap.processAttach()).toEqual(result);expect(bootstrap.snapshot().trace).toEqual(before);
 expect(scope.knownMask[0]).toBe(0);
});
it('stores the actual NULL Engine command-line result without skipping the next call',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{...services,tlsValues:new Map(),processInputs:{...browserGameProcessInputs,commandLineA:{kind:'null'}}}});
 const {bootstrap}=selected(platform);expect(bootstrap.processAttach().known).toBe(false);
 const progress=bootstrap.attachProgress();expect(progress.commandLineReturned).toBe(true);expect(progress.commandLineNonNull).toBe(false);
 expect(progress.engineCommandLineStorage!.pointer(0).get()).toBe(null);expect([...progress.engineCommandLineStorage!.knownMask]).toEqual(Array(4).fill(255));
 expect(progress.environmentReturned).toBe(true);expect(progress.nextBoundary).toMatchObject({address:'30677266',target:'306886ec'});
});
it('stores the actual NULL Engine environment result before reaching I/O',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{...services,tlsValues:new Map(),processInputs:{...browserGameProcessInputs,environmentW:{kind:'null',lastError:120},environmentA:{kind:'null'}}}});
 const {bootstrap}=selected(platform);const result=bootstrap.processAttach();expect(result.known).toBe(false);
 const progress=bootstrap.attachProgress();expect(progress.environmentReturned).toBe(true);expect(progress.environmentNonNull).toBe(false);
 expect(progress.engineEnvironmentStorage!.pointer(0).get()).toBe(null);expect([...progress.engineEnvironmentStorage!.knownMask]).toEqual(Array(4).fill(255));
 expect(progress.nextBoundary).toMatchObject({address:'30677266',target:'306886ec'});
});
it('stores the actual ANSI copy result before the pending Engine I/O call',()=>{
 const platform=new NativeRuntimePlatform({engineCrtServices:{...services,tlsValues:new Map(),processInputs:{...browserGameProcessInputs,environmentW:{kind:'null',lastError:120}}}});
 const {bootstrap}=selected(platform),result=bootstrap.processAttach();expect(result.known).toBe(false);
 if(result.known)throw new Error('Engine I/O is unfinished');expect(result.reason).toContain('Engine ioInit306886ec at30677266');
 const progress=bootstrap.attachProgress();expect(progress.environmentReturned).toBe(true);expect(progress.environmentNonNull).toBe(true);
 expect(progress.engineEnvironmentProgress).toMatchObject({mode:2,branch:'ansi',phase:'returned'});
 expect(progress.engineEnvironmentStorage!.pointer(0).get()).toBe(progress.engineEnvironmentProgress!.output);
 expect(progress.engineEnvironmentProgress!.input!.fields.backing.freed).toBe(true);
});
