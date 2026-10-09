import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeBytePointer } from '../../src/gothic3/native-pointer-geometry';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeEngineCrtPlatformServices, NativeWin32HeapCapability } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const fact = <T>(result: NativeValue<T>): T => { if (!result.known) throw new Error(result.reason); return result.value; };
const services = (pointerCodec: 'absent' | 'owned-bijection' = 'absent', extra: Partial<NativeEngineCrtPlatformServices> = {}): NativeEngineCrtPlatformServices => ({
  tlsValues: new Map(), kernel32Available: true, pointerCodec, fiberLocalStorage: true,
  processHeap: true, osVersion: { platform: 2, major: 6, minor: 1, build: 0xabcd }, ...extra,
});

function selected(platform = new NativeRuntimePlatform({ engineCrtServices: services() }), pointerCodec: 'absent' | 'owned-bijection' = 'absent') {
  const errno = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4), freed: false });
  const crt = NativeGameCrtOwner.forPlatform({ platform, errnoSlot: () => known(errno) });
  crt.physical.crtOsFields.writeUnsigned(0, 2);
  crt.physical.crtOsFields.writeUnsigned(12, 6);
  if (pointerCodec === 'owned-bijection') {
    const encodedNull = fact(crt.encodePointer(null));
    if (encodedNull === null) throw new Error('Selected EncodePointer(NULL) capability required for the owned pointer profile');
    crt.physical.sectionInitializer.pointer<object>(0).set(encodedNull);
  }
  fact(crt.initHeap());
  fact(crt.initLocks());
  return { platform, crt, errno };
}

function section(crt: NativeGameCrtOwner, id: number) {
  return crt.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).get();
}

describe('source-owned Game CRT exit-table prefix', () => {
  it('registers the PE-verified static shutdown callback as owned data without invoking it', () => {
    const { crt } = selected(), exit = NativeGameExitTable.forCrt(crt);
    expect(fact(exit.initialize())).toBe(0);
    const callback = fact(exit.callbackForMethod('staticFiniWalker'));
    expect(callback).toMatchObject({ module: 'Game', label: 'staticFiniWalker', entry: '20473801' });
    expect(fact(exit.callbackForMethod('staticFiniWalker'))).toBe(callback);
    expect(fact(exit.atexit(callback))).toBe(0);
    const state = exit.snapshot();
    expect(state.callbackCells).toHaveLength(1);
    expect(state.traversalOwned).toBe(false);
    expect(state.tableAllocations).toHaveLength(1);
    const begin = fact(crt.decodePointer(crt.imageStorage('crtExitBegin').pointer<object>(0).get())) as NativeBytePointer;
    const end = fact(crt.decodePointer(crt.imageStorage('crtExitEnd').pointer<object>(0).get())) as NativeBytePointer;
    expect(end.offset - begin.offset).toBe(4);
    expect(fact(crt.decodePointer(begin.fields.pointer<object>(begin.offset).get()))).toBe(callback);
  });

  it('shares one inert exit-table facade per canonical Game owner', () => {
    const { crt } = selected();
    const a = NativeGameExitTable.forCrt(crt), b = NativeGameExitTable.forCrt(crt);
    expect(a).toBe(b);
    expect(a.snapshot()).toMatchObject({ boundary: null, active: false, tableAllocations: [], callbackCells: [], traversalOwned: false });
    expect(crt.imageStorage('crtExitBegin')).not.toBe(crt.imageStorage('crtExitEnd'));
  });

  it('reproduces the cold initializer in allocation/codec/two-global/first-cell order', () => {
    const { crt } = selected(), exit = NativeGameExitTable.forCrt(crt);
    expect(exit.initialize()).toEqual(known(0));
    const state = exit.snapshot(), backing = state.tableAllocations[0]!;
    expect(backing.bytes).toEqual(new Uint8Array(128));
    expect(backing.knownMask).toEqual(new Uint8Array(128).fill(255));
    const beginEncoded = crt.imageStorage('crtExitBegin').pointer<object>(0).get();
    const endEncoded = crt.imageStorage('crtExitEnd').pointer<object>(0).get();
    expect(beginEncoded).not.toBeNull(); expect(endEncoded).toBe(beginEncoded);
    const begin = fact(crt.decodePointer(beginEncoded));
    expect(begin).toMatchObject({ fields: expect.any(NativeHeapObjectViews), offset: 0 });
    expect(state.trace.indexOf('callocCrt204683ce(32,4).attempt')).toBeLessThan(state.trace.indexOf('EncodePointer20467d64.initial-begin-and-end.attempt'));
    expect(state.trace.indexOf('EncodePointer20467d64.initial-begin-and-end.return')).toBeLessThan(state.trace.indexOf('crtExitBegin207d2b80.store'));
    expect(state.trace.indexOf('crtExitBegin207d2b80.store')).toBeLessThan(state.trace.indexOf('crtExitEnd207d2b7c.store'));
    expect(state.trace.indexOf('crtExitEnd207d2b7c.store')).toBeLessThan(state.trace.indexOf('onexitColdInitializer20463763.first-cell-zero'));
    expect(crt.imageStorage('attachCount').readUnsigned(0)).toBe(0);
  });

  it('does not add an initializer once-guard or release a prior allocation', () => {
    const { crt } = selected(), exit = NativeGameExitTable.forCrt(crt);
    expect(fact(exit.initialize())).toBe(0);
    const first = crt.imageStorage('crtExitBegin').pointer<object>(0).get();
    expect(fact(exit.initialize())).toBe(0);
    const second = crt.imageStorage('crtExitBegin').pointer<object>(0).get();
    expect(second).not.toBe(first);
    expect(exit.snapshot().tableAllocations).toHaveLength(2);
    expect(exit.snapshot().tableAllocations.every(backing => !backing.freed)).toBe(true);
  });

  it('retains a calloc allocation and blocks replay when EncodePointer is unowned', () => {
    const platform = new NativeRuntimePlatform({ engineCrtServices: services('owned-bijection') });
    const { crt } = selected(platform, 'owned-bijection'), exit = NativeGameExitTable.forCrt(crt);
    crt.physical.crtOsFields.writeUnsigned(12, 5);
    const first = exit.initialize();
    expect(first.known).toBe(false);
    expect(exit.snapshot().tableAllocations).toHaveLength(1);
    expect(exit.snapshot().trace).not.toContain('crtExitBegin207d2b80.store');
    expect(exit.initialize()).toEqual(first);
    expect(exit.snapshot().tableAllocations).toHaveLength(1);
  });

  it('stores encoded NULL globals before returning 24 on allocation failure', () => {
    class NoBlocks extends NativeRuntimePlatform {
      override win32HeapAlloc(_heap: NativeWin32HeapCapability, _flags: 0 | 8, _bytes: number): NativeValue<NativeMemoryBacking | null> {
        return known(null);
      }
    }
    const { crt } = selected(new NoBlocks({ engineCrtServices: services('owned-bijection') }), 'owned-bijection'), exit = NativeGameExitTable.forCrt(crt);
    expect(exit.initialize()).toEqual(known(24));
    const encodedNull = crt.imageStorage('crtExitBegin').pointer<object>(0).get();
    expect(encodedNull).not.toBeNull();
    expect(crt.imageStorage('crtExitEnd').pointer<object>(0).get()).toBe(encodedNull);
    expect(fact(crt.decodePointer(encodedNull))).toBeNull();
    expect(exit.snapshot().tableAllocations).toEqual([]);
    expect(exit.snapshot().trace).not.toContain('onexitColdInitializer20463763.first-cell-zero');
  });

  it('requires the actual initializer before registration and retains the unknown decoded-zero prefix', () => {
    const { crt, platform } = selected(new NativeRuntimePlatform({ engineCrtServices: services('owned-bijection') }), 'owned-bijection'), exit = NativeGameExitTable.forCrt(crt);
    const callback = fact(exit.callbackForMethod('crtAttach'));
    const result = exit.atexit(callback);
    expect(result.known).toBe(false);
    expect(exit.snapshot().tableAllocations).toEqual([]);
    expect(exit.snapshot().callbackCells).toEqual([]);
    expect(exit.snapshot().trace).toContain('onexitLock820466415.return');
    expect(section(crt, 8)).not.toBeNull();
    const lock = section(crt, 8)!;
    expect(platform.snapshot().physicalSections.find(entry => entry.fields === lock)?.depth).toBe(1);
    expect(exit.atexit(callback)).toEqual(result);
  });

  it('does not synthesize a table from cold zero globals when pointer wrappers take the identity path', () => {
    const { crt, platform, errno } = selected(), exit = NativeGameExitTable.forCrt(crt);
    const callback = fact(exit.callbackForMethod('crtAttach'));
    const result = exit.atexit(callback);
    expect(result.known).toBe(false);
    expect(errno.readUnsigned(0)).toBe(22);
    expect(exit.snapshot().tableAllocations).toEqual([]);
    expect(exit.snapshot().callbackCells).toEqual([]);
    expect(crt.snapshot().trace.at(-1)).toContain('invalidParameter2046a20a(0,0,0,0,0) after msize(NULL)');
    const lock = section(crt, 8)!;
    expect(platform.snapshot().physicalSections.find(entry => entry.fields === lock)?.depth).toBe(1);
  });

  it('calls the real selected HeapSize once per accepted append and preserves physical encoded cells', () => {
    class ObserveHeapSize extends NativeRuntimePlatform {
      readonly sizes: NativeBytePointer[] = [];
      override win32HeapSize(heap: NativeWin32HeapCapability | null, flags: 0, pointer: NativeBytePointer): NativeValue<number> {
        this.sizes.push(pointer);
        return super.win32HeapSize(heap, flags, pointer);
      }
    }
    const platform = new ObserveHeapSize({ engineCrtServices: services('owned-bijection') }), { crt } = selected(platform, 'owned-bijection');
    const exit = NativeGameExitTable.forCrt(crt), callback = fact(exit.callbackForMethod('crtAttach'));
    expect(fact(exit.initialize())).toBe(0);
    for (let i = 0; i < 32; i++) expect(fact(exit.atexit(callback))).toBe(0);
    expect(platform.sizes).toHaveLength(32);
    expect(new Set(platform.sizes).size).toBe(1);
    expect(fact(crt.byteGeometry().resolveNativePointer(platform.sizes[0]!)).offset).toBe(0);
    expect(exit.snapshot().callbackCells).toHaveLength(32);
    const backing = exit.snapshot().tableAllocations[0]!;
    const fields = new NativeHeapObjectViews(backing);
    for (let i = 0; i < 32; i++) {
      const encoded = fields.pointer<object>(i * 4).get();
      expect(encoded).not.toBeNull(); expect(fact(crt.decodePointer(encoded))).toBe(callback);
    }
    const begin = fact(crt.decodePointer(crt.imageStorage('crtExitBegin').pointer<object>(0).get()));
    const end = fact(crt.decodePointer(crt.imageStorage('crtExitEnd').pointer<object>(0).get()));
    expect(begin).toMatchObject({ offset: 0 }); expect(end).toMatchObject({ offset: 128 });
    expect(platform.snapshot().physicalSections.find(entry => entry.fields === section(crt, 8))?.depth).toBe(0);
  });

  it('stores a NULL callback and advances the end before atexit returns -1', () => {
    const { crt, platform } = selected(new NativeRuntimePlatform({ engineCrtServices: services('owned-bijection') }), 'owned-bijection'), exit = NativeGameExitTable.forCrt(crt);
    fact(exit.initialize());
    expect(exit.atexit(null)).toEqual(known(-1));
    const backing = exit.snapshot().tableAllocations[0]!, encoded = new NativeHeapObjectViews(backing).pointer<object>(0).get();
    expect(encoded).not.toBeNull(); expect(fact(crt.decodePointer(encoded))).toBeNull();
    const end = fact(crt.decodePointer(crt.imageStorage('crtExitEnd').pointer<object>(0).get()));
    expect(end).toMatchObject({ offset: 4 });
    expect(platform.snapshot().physicalSections.find(entry => entry.fields === section(crt, 8))?.depth).toBe(0);
  });

  it('relocates the exit table on the first registration beyond 128 bytes', () => {
    class ObserveHeapSize extends NativeRuntimePlatform {
      calls = 0;
      override win32HeapSize(heap: NativeWin32HeapCapability | null, flags: 0, pointer: NativeBytePointer): NativeValue<number> {
        this.calls++;
        return super.win32HeapSize(heap, flags, pointer);
      }
    }
    const platform = new ObserveHeapSize({ engineCrtServices: services('owned-bijection') }), { crt } = selected(platform, 'owned-bijection');
    const exit = NativeGameExitTable.forCrt(crt), callback = fact(exit.callbackForMethod('crtAttach'));
    fact(exit.initialize());
    for (let i = 0; i < 32; i++) fact(exit.atexit(callback));
    const overflow = exit.atexit(callback);
    expect(fact(overflow)).toBe(0);
    expect(platform.calls).toBe(33);
    expect(exit.snapshot().callbackCells).toHaveLength(33);
    const allocations = exit.snapshot().tableAllocations;
    expect(allocations.map(backing => [backing.bytes.length,backing.freed])).toEqual([[128,true],[256,false]]);
    const begin = fact(crt.decodePointer(crt.imageStorage('crtExitBegin').pointer<object>(0).get())) as NativeBytePointer;
    const end = fact(crt.decodePointer(crt.imageStorage('crtExitEnd').pointer<object>(0).get())) as NativeBytePointer;
    expect(begin.fields.backing).toBe(allocations[1]);
    expect(end.fields.backing).toBe(allocations[1]);
    expect(end.offset).toBe(132);
    for (let index=0;index<33;index++)
      expect(fact(crt.decodePointer(begin.fields.pointer<object>(index*4).get()))).toBe(callback);
    expect(exit.snapshot().trace).toContain('reallocCrt20468416.attempt(256)');
    expect(platform.snapshot().physicalSections.find(entry => entry.fields === section(crt, 8))?.depth).toBe(0);
    expect(fact(exit.atexit(callback))).toBe(0);
  });

  it('matches Game msize NULL error order and retains its unowned invalid-parameter boundary', () => {
    const { crt, errno } = selected();
    const result = crt.msize(null);
    expect(result.known).toBe(false);
    expect(errno.readUnsigned(0)).toBe(22);
    expect(crt.snapshot().trace).toContain('errno.store22');
    expect(crt.snapshot().trace.at(-1)).toContain('invalidParameter2046a20a');
  });

  it('preserves the held lock4 prefix while the Game small-block msize body is unowned', () => {
    const { crt, platform } = selected(), backing = fact(crt.malloc(16))!;
    crt.physical.heapSelector.writeUnsigned(0, 3);
    const result = crt.msize({ fields: new NativeHeapObjectViews(backing), offset: 0 });
    expect(result.known).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining('20476d1c') });
    expect(platform.snapshot().physicalSections.find(entry => entry.fields === section(crt, 4))?.depth).toBe(1);
  });

  it('reports Win32 HeapSize capacity only for the exact live allocation base and heap', () => {
    const { crt, platform } = selected(), backing = fact(crt.malloc(48))!;
    const heap = crt.snapshot().heaps[0]!, pointer = { fields: new NativeHeapObjectViews(backing), offset: 0 };
    expect(platform.win32HeapSize(heap, 0, pointer)).toEqual(known(48));
    const wrong = fact(platform.createWin32Heap({}, 0, 4096, 0));
    expect(platform.win32HeapSize(wrong, 0, pointer)).toEqual(known(0xffffffff));
    const unowned = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4), freed: false });
    expect(platform.win32HeapSize(heap, 0, { fields: unowned, offset: 0 }).known).toBe(false);
    fact(crt.free(backing));
    expect(platform.win32HeapSize(heap, 0, pointer)).toEqual(known(0xffffffff));
  });
});
