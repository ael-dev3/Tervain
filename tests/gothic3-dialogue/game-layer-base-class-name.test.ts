import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import { NativeGameLayerBaseClassName } from '../../src/gothic3/native-game-layer-base-class-name';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { nativeGameTypeInfoForCrt } from '../../src/gothic3/native-crt-undname';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function text(backing: NativeMemoryBacking): string {
  const fields = new NativeHeapObjectViews(backing), bytes: number[] = [];
  for (let offset = 0; offset < fields.bytes.length; offset++) {
    const byte = fields.readUnsigned(offset, 1); if (byte === 0) return String.fromCharCode(...bytes); bytes.push(byte);
  }
  throw new Error('NUL required');
}

function fixture(initializeExit = true, sourceMemory?:NativeMemoryAdmin, includeTextPool = true) {
  const platform = new NativeRuntimePlatform({ engineCrtServices: {
    tlsValues: new Map<number, object>(), kernel32Available: true, pointerCodec: 'owned-bijection',
    fiberLocalStorage: true, processHeap: true, osVersion: { platform: 2, major: 6, minor: 1, build: 0xabcd },
  } });
  const errno = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4).fill(255), freed: false });
  const crt = NativeGameCrtOwner.forPlatform({ platform, errnoSlot: () => known(errno) });
  crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
  const encodedNull = value(crt.encodePointer(null));
  if (encodedNull === null) throw new Error('Owned Game CRT encoded NULL required');
  crt.physical.sectionInitializer.pointer<object>(0).set(encodedNull);
  value(crt.initHeap()); value(crt.initLocks());
  const exit = NativeGameExitTable.forCrt(crt);
  if (initializeExit) value(exit.initialize());
  const memory = sourceMemory ?? new NativeMemoryAdmin(platform, { extensions: includeTextPool
    ? [nativeSceneStartupHeapExtension, nativeNpcHeapExtension] : [nativeSceneStartupHeapExtension] });
  const className = NativeGameLayerBaseClassName.forCrt(crt, memory);
  return { platform, crt, exit, memory, className };
}

describe('Original Game LayerBase class-name startup', () => {
  it('retains original guard and RTTI effects at an unavailable 29-byte string allocation', () => {
    const f = fixture(true, undefined, false);
    const result = f.className.get();
    expect(result).toMatchObject({ known: false, reason: expect.stringContaining('29 bytes is not audited') });
    expect(f.className.fields.readUnsigned(8)).toBe(3);
    expect(f.className.fields.pointer<NativeMemoryBacking>(0).get()).toBeNull();
    expect(f.crt.imageStorage('layerBaseTypeInfoDescriptor').pointer<NativeMemoryBacking>(4).get()).not.toBeNull();
    expect(f.className.initializerResult.pointer<NativeHeapObjectViews>(0).get()).toBeNull();
    expect(f.exit.snapshot().callbackCells).toHaveLength(0);
    const trace = f.className.snapshot().trace;
    expect(f.className.get()).toEqual(result);
    expect(f.className.snapshot().trace).toEqual(trace);
  });
  it('constructs the cold RTTI name and registers the original cleanup before the later initializer publishes', () => {
    const f = fixture();
    expect(f.className.initializerResult.pointer<NativeHeapObjectViews>(0).get()).toBeNull();
    const name = value(f.className.get());
    expect(value(name.text())).toBe('eCProcessibleElement');
    expect(f.className.fields.readUnsigned(8)).toBe(3);
    expect(f.className.fields.pointer<NativeHeapObjectViews>(4).get()).toBeNull();
    expect(f.className.initializerResult.pointer<NativeHeapObjectViews>(0).get()).toBeNull();
    expect(text(value(nativeGameTypeInfoForCrt(f.crt,'layerBase').getName())!)).toBe('class eCProcessibleElement');
    expect(f.crt.imageStorage('layerBaseInitializerSlot').readUnsigned(0)).toBe(0x204b11b0);
    expect(f.className.snapshot().registeredCallback).toMatchObject({ module:'Game',entry:'20034649',label:'layerBaseClassNameDestructor' });
    expect(f.exit.snapshot().callbackCells).toHaveLength(1);
    value(f.className.initializeCachedClassName());
    expect(f.className.initializerResult.pointer<NativeHeapObjectViews>(0).get()).toBe(f.className.fields);
    expect(f.className.fields.pointer<NativeHeapObjectViews>(4).get()).toBeNull();
    expect(value(f.className.get())).toBe(name);
    expect(f.exit.snapshot().callbackCells).toHaveLength(1);
    const trace=f.className.snapshot().trace;
    expect(trace.indexOf('Game.LayerBase.guard1.copy-prior')).toBeLessThan(trace.indexOf('Game.LayerBase.guard2'));
    expect(trace.indexOf('Game.LayerBase.guard2')).toBeLessThan(trace.indexOf('Game.type_info.Name'));
    value(f.className.invokeRegisteredDestructor(f.className.snapshot().registeredCallback!));
    expect(name.text().known).toBe(false);
    expect(f.className.get().known).toBe(false);
    expect(f.exit.snapshot().traversalOwned).toBe(false);
  });
  it('retains the actual prior pointer once and keeps LayerBase and Navigation caches separate', () => {
    const f=fixture(), prior=f.crt.imageStorage('navigationTypeInfoDescriptor');
    f.className.initializerResult.pointer<NativeHeapObjectViews>(0).set(prior);
    value(f.className.get());
    expect(f.className.fields.pointer<NativeHeapObjectViews>(4).get()).toBe(prior);
    expect(f.crt.imageStorage('navigationClassName').readUnsigned(8)).toBe(0);
    expect(f.crt.imageStorage('navigationTypeInfoDescriptor').pointer<NativeMemoryBacking>(4).get()).toBeNull();
    expect(f.crt.imageStorage('layerBaseTypeInfoDescriptor').pointer<NativeMemoryBacking>(4).get()).not.toBeNull();
    f.className.initializerResult.pointer<NativeHeapObjectViews>(0).set(null);
    value(f.className.get());
    expect(f.className.fields.pointer<NativeHeapObjectViews>(4).get()).toBe(prior);
    expect(NativeGameLayerBaseClassName.forCrt(f.crt,f.memory)).toBe(f.className);
    const other=fixture();
    expect(() => NativeGameLayerBaseClassName.forCrt(other.crt,f.memory)).toThrow(/MemoryAdmin/);
    expect(() => fixture(true,f.memory)).toThrow(/platform/);
    const shaped=Object.create(NativeMemoryAdmin.prototype) as NativeMemoryAdmin;
    shaped.usesPlatform=()=>true;
    expect(() => fixture(true,shaped)).toThrow(/platform/);
  });
  it('preserves guard writes when an original dependency is unavailable and never replays the completed prefix', () => {
    const f=fixture(false);
    const result=f.className.get();
    expect(result.known).toBe(false);
    expect(f.className.fields.readUnsigned(8)).toBe(3);
    expect(f.className.fields.pointer<NativeMemoryBacking>(0).get()).not.toBeNull();
    expect(f.className.snapshot().registeredCallback).toBeNull();
    const trace=f.className.snapshot().trace;
    expect(f.className.get()).toEqual(result);
    expect(f.className.snapshot().trace).toEqual(trace);
    expect(f.className.initializerResult.pointer<NativeHeapObjectViews>(0).get()).toBeNull();
  });
  it('rejects a warm guard without a retained CString and unknown source guard bytes', () => {
    const f=fixture(); f.className.fields.writeUnsigned(8,3);
    expect(f.className.get().known).toBe(false);
    expect(f.exit.snapshot().callbackCells).toHaveLength(0);
    const other=fixture(); other.className.fields.knownMask[8]=0;
    expect(other.className.get().known).toBe(false);
    expect(other.className.fields.bytes[8]).toBe(0);
    expect(other.exit.snapshot().callbackCells).toHaveLength(0);
  });
});
