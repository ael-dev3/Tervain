import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeEngineCrtOwner, NativeModuleCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import type { NativeModuleCrtHost } from '../../src/gothic3/native-engine-crt-locks';
import { createNativeGameCrtOwner, NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { nativeGameImagePins, nativeGameImageReceipt } from '../../src/gothic3/native-game-crt-profile';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform, NativeWin32PlatformException } from '../../src/gothic3/native-runtime-platform';
import type { NativeWin32HeapCapability } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const fact = <T>(result: NativeValue<T>): T => { if (!result.known) throw new Error(result.reason); return result.value; };
const storage = (bytes: number, masks = 0) => new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes).fill(masks), freed: false });
const services = () => ({ tlsValues: new Map<number, object>(), kernel32Available: true, pointerCodec: 'absent' as const });
function selected(platform = new NativeRuntimePlatform({ engineCrtServices: services() }), extra: Partial<NativeModuleCrtHost> = {}) {
  const errno = storage(4); let errnoCalls = 0;
  const host = { platform, errnoSlot: () => { errnoCalls++; return known(errno); }, ...extra };
  const crt = NativeGameCrtOwner.forPlatform(host);
  // Deliberate selected fixture facts; constructors retain the original cold OS bytes.
  crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
  fact(crt.initHeap()); fact(crt.initLocks()); return { host, crt, platform, errno, errnoCalls: () => errnoCalls };
}
const section = (crt: NativeModuleCrtOwner, id: number) => crt.physical.lockTable.pointer<NativeHeapObjectViews>(id * 8).get();

describe('canonical source-admitted Game CRT heap and lock owner', () => {
  it('retains one owner and callback configuration per selected platform', () => {
    const platform = new NativeRuntimePlatform(), errno = storage(4), callback = () => known(errno);
    const host = { platform, errnoSlot: callback }, crt = NativeGameCrtOwner.forPlatform(host);
    expect(createNativeGameCrtOwner(host)).toBe(crt);
    expect(NativeGameCrtOwner.forPlatform({ ...host })).toBe(crt);
    expect(() => NativeGameCrtOwner.forPlatform({ platform })).toThrow('Conflicting services');
    expect(() => NativeGameCrtOwner.forPlatform({ ...host, errnoSlot: () => known(errno) })).toThrow('Conflicting services');
    expect(NativeGameCrtOwner.forPlatform({ platform: new NativeRuntimePlatform() })).not.toBe(crt);
    expect(Object.isFrozen(crt.host)).toBe(true);
    expect(Reflect.set(crt.host, 'errnoSlot', () => known(errno))).toBe(false);
    expect(Reflect.set(crt, 'host', { platform })).toBe(false);
    host.errnoSlot = () => known(errno);
    expect(crt.host.errnoSlot).toBe(callback);
    expect(() => NativeGameCrtOwner.forPlatform(host)).toThrow('Conflicting services');
  });
  it('blocks direct, reflected and external-subclass Game construction and immutable source changes', () => {
    const host = { platform: new NativeRuntimePlatform() }, crt = NativeGameCrtOwner.forPlatform(host);
    expect(() => Reflect.construct(NativeGameCrtOwner, [host])).toThrow('admitted CRT module facade');
    expect(() => Reflect.construct(NativeGameCrtOwner, [host, {}])).toThrow('admitted CRT module facade');
    expect(() => Reflect.construct(NativeModuleCrtOwner, [host, 'Game', {}])).toThrow('admitted CRT module facade');
    class External extends NativeModuleCrtOwner { constructor() { super(host, 'Game', {}); } }
    expect(() => new External()).toThrow('admitted CRT module facade');
    expect(() => Reflect.construct(NativeEngineCrtOwner, [host], External)).toThrow('admitted CRT module facade');
    for (const label of ['module', 'sourceProfile'] as const) {
      expect(Object.getOwnPropertyDescriptor(crt, label)).toMatchObject({ writable: false, configurable: false });
      expect(Reflect.set(crt, label, 'Engine')).toBe(false);
      expect(() => Object.defineProperty(crt, label, { value: 'Engine' })).toThrow();
    }
    expect(crt.module).toBe('Game'); expect(Object.isFrozen(crt.sourceProfile)).toBe(true);
    expect(Object.isFrozen(crt.sourceProfile.heapRules.methods.heapInit)).toBe(true);
    expect(Reflect.set(crt.sourceProfile.heapRules.inputs, 'Game', 'wrong')).toBe(false);
    expect(crt.sourceProfile.heapRules).toBe(crt.sourceProfile.bootstrapRules);
    expect(crt.sourceProfile.bootstrapRules.methods.crtAttach!.entry).toBe('204677e4');
  });
  it('validates every admitted image address, raw bytes, hash, mask and scope independently', () => {
    const crt = NativeGameCrtOwner.forPlatform({ platform: new NativeRuntimePlatform() });
    for (const [label, [group, address, bytes, raw, hash]] of Object.entries(nativeGameImagePins)) {
      const receipt = nativeGameImageReceipt(label), fields = crt.imageStorage(label);
      expect(receipt.address).toBe(address); expect(fields.bytes.length).toBe(bytes);
      expect(Buffer.from(fields.bytes).toString('hex')).toBe(raw);
      expect(createHash('sha256').update(fields.bytes).digest('hex')).toBe(hash);
      expect(fields.knownMask).toEqual(new Uint8Array(bytes).fill(255));
      expect(receipt.liveValueCaptured).toBe(false);
      expect(receipt.scope).toBe(group === 'coldGlobals' ? 'cold-original-image' : 'original-file-backed-constant');
      expect(crt.imageStorage(label)).toBe(fields);
    }
    expect(() => crt.imageStorage('callerInventedStorage')).toThrow('independent source admission');
    expect(crt.imageStorage('sectionInitializer')).toBe(crt.physical.sectionInitializer);
    expect(crt.physical.pointerInitialization.sectionInitializer).toBe(crt.physical.sectionInitializer);
    const mbc = crt.imageStorage('mbcObject'), counter = crt.imageStorage('mbcRefCounter');
    expect(counter.backing).toBe(mbc.backing); counter.writeUnsigned(0, 3); expect(mbc.readUnsigned(0)).toBe(3);
    const time = crt.imageStorage('timeLocale'), timeCounter = crt.imageStorage('timeLocaleRefCounter');
    expect(timeCounter.backing).toBe(time.backing); timeCounter.writeUnsigned(0, 4); expect(time.readUnsigned(0xb4)).toBe(4);
  });
  it('keeps Engine and Game source profiles, cold objects, heaps and physical locks distinct on one platform', () => {
    const platform = new NativeRuntimePlatform({ engineCrtServices: services() }), { crt: game } = selected(platform);
    const engine = new NativeEngineCrtOwner({ platform });
    expect(engine.module).toBe('Engine'); expect(game.identity).not.toBe(engine.identity);
    expect(engine.sourceProfile.heapRules).not.toBe(engine.sourceProfile.bootstrapRules);
    expect(engine.sourceProfile.heapRules.inputs.Engine).toBeDefined(); expect(game.sourceProfile.heapRules.inputs.Engine).toBeUndefined();
    expect(engine.physical.crtOsFields.readUnsigned(0)).toBe(0);
    for (const label of ['heapHandle', 'lockTable', 'staticSections', 'crtTypeInfoList', 'crtTlsIndexes'] as const) expect(game.physical[label].backing).not.toBe(engine.physical[label].backing);
    engine.physical.crtOsFields.writeUnsigned(0, 2); engine.physical.crtOsFields.writeUnsigned(12, 6);
    fact(engine.initHeap()); fact(engine.initLocks());
    expect(platform.snapshot().winHeaps.map(entry => entry.capability.owner)).toEqual([game.identity, engine.identity]);
    const gameHeap = game.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).get()!, engineHeap = engine.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).get()!;
    expect(gameHeap).not.toBe(engineHeap);
    const engineBacking = fact(engine.malloc(24))!;
    expect(platform.win32HeapFree(gameHeap, 0, engineBacking).known).toBe(false); expect(engineBacking.freed).toBe(false);
    expect(platform.enterPhysicalCriticalSection(section(engine, 14)!, game.identity).known).toBe(false);
    game.physical.heapHandle.pointer<NativeWin32HeapCapability>(0).set(engineHeap);
    const result = game.malloc(24); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('same-owner Game CRT heap');
  });
  it('publishes the actual heap before the Game OS failure and stores errno22 without invented handler effects', () => {
    const platform = new NativeRuntimePlatform(), errno = storage(4), crt = NativeGameCrtOwner.forPlatform({ platform, errnoSlot: () => known(errno) });
    expect(crt.snapshot().heapPhase).toBe('cold'); expect(crt.snapshot().locksPhase).toBe('cold');
    expect([...crt.physical.crtTlsIndexes.dwordArray(0, 2)]).toEqual([0xffffffff, 0xffffffff]);
    const result = crt.initHeap(); expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('invalidParameter2046a20a');
    expect(errno.readUnsigned(0)).toBe(22); expect(crt.physical.heapSelector.readUnsigned(0)).toBe(0);
    expect(crt.physical.heapHandle.pointer<object>(0).get()).toBe(platform.snapshot().winHeaps[0]!.capability);
    expect(crt.snapshot().trace).toEqual(['HeapCreate.attempt', 'HeapCreate', 'heapHandle.publish', 'getOsPlatform2046645f', '__errno2046a282.attempt', '__errno2046a282', 'errno.store22', 'invalidParameter2046a20a after getOsPlatform failure.boundary']);
    const before = crt.snapshot().trace; expect(crt.initHeap().known).toBe(false); expect(crt.snapshot().trace).toEqual(before);
    expect(platform.snapshot().winHeaps).toHaveLength(1);
  });
  it('retains a known-null HeapCreate once, before any OS access or readiness', () => {
    class NullHeap extends NativeRuntimePlatform { calls = 0; override createWin32Heap(): NativeValue<NativeWin32HeapCapability | null> { this.calls++; return known(null); } }
    const platform = new NullHeap(), crt = NativeGameCrtOwner.forPlatform({ platform });
    expect(crt.initHeap()).toEqual(known(0)); expect(crt.initHeap()).toEqual(known(0)); expect(platform.calls).toBe(1);
    expect(crt.snapshot().heapPhase).toBe('null'); expect(crt.snapshot().trace).toEqual(['HeapCreate.attempt', 'HeapCreate', 'heapHandle.publish']);
  });
  it('retains static publication before unknown TLS resolution and never replays the prefix', () => {
    const platform = new NativeRuntimePlatform(), crt = NativeGameCrtOwner.forPlatform({ platform });
    expect(crt.initLocks().known).toBe(false); expect(section(crt, 0)).toBeInstanceOf(NativeHeapObjectViews); expect(section(crt, 1)).toBeNull();
    expect(platform.snapshot().physicalSections).toHaveLength(0);
    expect(crt.snapshot().trace).toEqual(['lock0.static.publish', 'lock0.initialize4000', 'decodePointer20467ddb', 'TlsGetValue(4294967295).attempt']);
    const before = crt.snapshot().trace; expect(crt.initLocks().known).toBe(false); expect(crt.snapshot().trace).toEqual(before);
  });
  it('publishes all fourteen Game section aliases before actual initialization in native flag order', () => {
    let crt: NativeGameCrtOwner; const observed: number[] = [];
    class Observe extends NativeRuntimePlatform {
      override initializePhysicalCriticalSection(fields: NativeHeapObjectViews, owner: object, count: 4000): NativeValue<boolean> {
        const id = Array.from({ length: 36 }, (_, i) => i).find(i => section(crt, i) === fields)!;
        expect(fields.backing).toBe(crt.imageStorage('crtStaticSections').backing);
        expect(fields.bytes.byteOffset - crt.physical.staticSections.bytes.byteOffset).toBe(observed.length * 24);
        expect(owner).toBe(crt.identity); observed.push(id); return super.initializePhysicalCriticalSection(fields, owner, count);
      }
    }
    const platform = new Observe({ engineCrtServices: services() }); crt = NativeGameCrtOwner.forPlatform({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
    expect(crt.initLocks()).toEqual(known(1)); expect(observed).toEqual([0, 1, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 17, 18]);
    expect(crt.physical.staticSections.knownMask).toEqual(new Uint8Array(336));
    expect(crt.snapshot().trace.filter(step => step === 'decodePointer20467ddb')).toHaveLength(14);
    expect(crt.snapshot().trace.some(step => /30[0-9a-f]{6}/.test(step))).toBe(false);
  });
  it('uses the source fallback procedure label and records its actual no-spin effect', () => {
    const platform = new NativeRuntimePlatform({ engineCrtServices: { ...services(), kernel32Available: false } }), { crt } = selected(platform);
    expect(crt.snapshot().trace.filter(step => step === 'InitializeCriticalSection fallback204741b7')).toHaveLength(14);
    expect(platform.snapshot().physicalSections.every(entry => entry.spinCount === null)).toBe(true);
  });
  it('requires a real encoded NULL, then retains the decoded and cached Game section resolver', () => {
    const platform = new NativeRuntimePlatform({ engineCrtServices: { ...services(), pointerCodec: 'owned-bijection' } });
    const crt = NativeGameCrtOwner.forPlatform({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
    const encodedNull = fact(crt.encodePointer(null)); expect(encodedNull).not.toBeNull();
    crt.physical.sectionInitializer.pointer<object>(0).set(encodedNull); fact(crt.initLocks());
    const encoded = crt.physical.sectionInitializer.pointer<object>(0).get();
    expect(encoded).not.toBeNull(); expect(fact(crt.decodePointer(encoded))).toMatchObject({ name: 'InitializeCriticalSectionAndSpinCount' });
    expect(crt.physical.sectionInitializer.knownMask).toEqual(new Uint8Array(4));
    const coldPlatform = new NativeRuntimePlatform({ engineCrtServices: { ...services(), pointerCodec: 'owned-bijection' } }), cold = NativeGameCrtOwner.forPlatform({ platform: coldPlatform });
    cold.physical.crtOsFields.writeUnsigned(0, 2); cold.physical.crtOsFields.writeUnsigned(12, 6);
    expect(cold.initLocks().known).toBe(false); expect(coldPlatform.snapshot().physicalSections).toHaveLength(0);
  });
  it('translates only the admitted OOM SEH filter and handler after actual SetLastError', () => {
    class Oom extends NativeRuntimePlatform { override initializePhysicalCriticalSection(): NativeValue<boolean> { throw new NativeWin32PlatformException(0xc0000017); } }
    const platform = new Oom({ engineCrtServices: services() }), crt = NativeGameCrtOwner.forPlatform({ platform });
    crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
    expect(crt.initLocks()).toEqual(known(0)); expect(section(crt, 0)).toBeNull();
    expect(crt.snapshot().trace).toContain('initCritSecExceptionFilter2047424d(0xc0000017)');
    expect(crt.snapshot().trace).toContain('initCritSecExceptionHandler20474264.return0');
    expect(platform.getWin32LastError()).toEqual(known(8));
  });
  it('uses the same Game heap for mode1 malloc/calloc and forwards actual allocator geometry', () => {
    const { crt, platform } = selected(), malloc = fact(crt.malloc(0))!, calloc = fact(crt.callocCrt(3, 7))!;
    expect(malloc.bytes.length).toBe(1); expect(malloc.knownMask).toEqual(new Uint8Array(1));
    expect(calloc.bytes).toEqual(new Uint8Array(21)); expect(calloc.knownMask).toEqual(new Uint8Array(21).fill(255));
    const pointer = { fields: new NativeHeapObjectViews(calloc), offset: 3 }, geometry = fact(crt.byteGeometry().resolveNativePointer(pointer));
    expect(geometry.canonicalBacking).toBe(calloc); expect(geometry.modulo4).toBe(3);
    expect(crt.byteGeometry().resolveNativePointer({ fields: storage(21), offset: 0 }).known).toBe(false);
    expect(platform.crtFree(malloc).known).toBe(false); fact(crt.free(malloc)); expect(malloc.freed).toBe(true);
    fact(crt.free(calloc)); expect(crt.byteGeometry().resolveNativePointer(pointer).known).toBe(true);
    expect(() => pointer.fields.readUnsigned(0)).toThrow('freed');
  });
  it('uses Game207d0a94 wait and Game207d14e0 new mode, including original double errno stores', () => {
    class Retry extends NativeRuntimePlatform { calls = 0; override win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null> { return ++this.calls < 3 ? known(null) : super.win32HeapAlloc(heap, flags, bytes); } }
    const sleeps: number[] = [], { crt, errnoCalls } = selected(new Retry({ engineCrtServices: services() }), { sleep: ms => { sleeps.push(ms); return known(undefined); } });
    expect(crt.imageStorage('crtMallocRetry')).toBe(crt.physical.mallocWait); expect(crt.imageStorage('newMode')).toBe(crt.physical.newMode);
    crt.physical.mallocWait.writeUnsigned(0, 2000); expect(fact(crt.mallocCrt(24))!.bytes.length).toBe(24);
    expect(sleeps).toEqual([0, 1000]); expect(errnoCalls()).toBe(4);
    class NewRetry extends NativeRuntimePlatform { calls = 0; override win32HeapAlloc(heap: NativeWin32HeapCapability, flags: 0 | 8, bytes: number): NativeValue<NativeMemoryBacking | null> { return ++this.calls === 1 ? known(null) : super.win32HeapAlloc(heap, flags, bytes); } }
    let handlers = 0;
    const retry = selected(new NewRetry({ engineCrtServices: services() }), { callNewHandler: bytes => { expect(bytes).toBe(24); handlers++; return known(1); } });
    retry.crt.physical.newMode.writeUnsigned(0, 1); fact(retry.crt.malloc(24)); expect(handlers).toBe(1); expect(retry.errnoCalls()).toBe(0);
    expect(retry.crt.snapshot().trace).toContain('callNewHandler204742dd');
  });
  it('allocates dynamic sections under Game lock10 and deletes/free them before static sections', () => {
    const { crt, platform } = selected(); fact(crt.ensureLock(5)); fact(crt.ensureLock(9)); const fifth = section(crt, 5)!;
    expect(fifth.backing).toBe(crt.snapshot().allocations[0]); expect(fifth.knownMask).toEqual(new Uint8Array(24));
    const trace = crt.snapshot().trace; expect(trace.indexOf('lock10.enter')).toBeLessThan(trace.indexOf('lock5.dynamic.publish'));
    expect(trace.indexOf('lock5.dynamic.publish')).toBeLessThan(trace.indexOf('lock10.leave'));
    fact(crt.lock(5)); fact(crt.unlock(5)); fact(crt.terminateLocks()); expect(fifth.backing.freed).toBe(true);
    expect(crt.snapshot().trace.filter(step => /^lock\d+\.delete$/.test(step)).slice(0, 3)).toEqual(['lock5.delete', 'lock9.delete', 'lock0.delete']);
    expect(section(crt, 5)).toBeNull(); expect(section(crt, 14)).not.toBeNull();
    expect(platform.snapshot().physicalSections.every(entry => entry.deleted)).toBe(true);
    fact(crt.terminateHeap()); expect(platform.snapshot().winHeaps[0]!.destroyed).toBe(true); expect(crt.initHeap().known).toBe(false);
  });
  it('retains applied free effects without replay and retains reentrant HeapCreate before publication', () => {
    class FreeGate extends NativeRuntimePlatform { calls = 0; override win32HeapFree(heap: NativeWin32HeapCapability, flags: 0, backing: NativeMemoryBacking): NativeValue<boolean> { this.calls++; fact(super.win32HeapFree(heap, flags, backing)); return { known: false, reason: 'Unowned post-free result' }; } }
    const platform = new FreeGate({ engineCrtServices: services() }), { crt } = selected(platform), backing = fact(crt.malloc(24))!;
    expect(crt.free(backing).known).toBe(false); expect(backing.freed).toBe(true); expect(crt.free(backing).known).toBe(false); expect(platform.calls).toBe(1);
    let reentrant: NativeGameCrtOwner;
    class Reenter extends NativeRuntimePlatform { override createWin32Heap(owner: object, options: 0 | 1, initial: 4096, maximum: 0): NativeValue<NativeWin32HeapCapability | null> { const heap = super.createWin32Heap(owner, options, initial, maximum); expect(reentrant.initHeap().known).toBe(false); return heap; } }
    const reenter = new Reenter(); reentrant = NativeGameCrtOwner.forPlatform({ platform: reenter });
    expect(reentrant.initHeap().known).toBe(false); expect(reentrant.snapshot().heaps).toHaveLength(1); expect(reentrant.physical.heapHandle.pointer<object>(0).get()).toBeNull();
    expect(reentrant.snapshot().trace).toEqual(['HeapCreate.attempt']); expect(reentrant.initHeap().known).toBe(false); expect(reenter.snapshot().winHeaps).toHaveLength(1);
  });
});
