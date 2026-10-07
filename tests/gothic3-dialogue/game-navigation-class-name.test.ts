import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import { NativeGameNavigationClassName } from '../../src/gothic3/native-game-navigation-class-name';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
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

function fixture(initializeExit = true) {
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
  const memory = new NativeMemoryAdmin(platform, { extensions: [nativeSceneStartupHeapExtension] });
  const className = NativeGameNavigationClassName.forCrt(crt, memory);
  return { platform, crt, exit, memory, className };
}

describe('Game gCNavigation_PS class-name startup', () => {
  it('runs the Game RTTI cache, SharedBase text construction, atexit registration and selected initializer', () => {
    const f = fixture(), prior = f.crt.imageStorage('navigationTypeInfoDescriptor');
    f.className.initializerResult.pointer<NativeHeapObjectViews>(0).set(prior);

    value(f.className.initializeCachedClassName());
    const name = value(f.className.get());
    expect(value(name.text())).toBe('gCNavigation_PS');
    expect(f.className.fields.readUnsigned(8)).toBe(3);
    expect(f.className.fields.pointer<NativeHeapObjectViews>(4).get()).toBe(prior);
    expect(f.className.initializerResult.pointer<NativeHeapObjectViews>(0).get()).toBe(f.className.fields);
    expect(f.crt.imageStorage('navigationTypeInfoDescriptor').pointer<NativeMemoryBacking>(4).get()).not.toBeNull();
    expect(name.slot.backing.identity).toBe(f.className.fields.backing.identity);
    expect(name.snapshot().allocation).toMatchObject({ requestedBytes: 24, capacity: 24 });
    expect(f.className.snapshot().registeredCallback).toMatchObject({ module: 'Game', entry: '20003904', label: 'navigationClassNameDestructor' });
    expect(f.exit.snapshot().callbackCells).toHaveLength(1);
    expect(f.exit.snapshot().traversalOwned).toBe(false);

    const trace = f.className.snapshot().trace;
    expect(trace.indexOf('Game.Navigation.guard1.copy-prior')).toBeLessThan(trace.indexOf('Game.Navigation.guard2'));
    expect(trace.indexOf('Game.Navigation.guard2')).toBeLessThan(trace.indexOf('Game.type_info.Name'));
    expect(f.className.snapshot().trace).toContain('Game.Navigation.initializer204b1840.publish207b4ea8');

    const callback = f.className.snapshot().registeredCallback!;
    value(f.className.invokeRegisteredDestructor(callback));
    expect(f.className.snapshot().destroyed).toBe(true);
    expect(name.text().known).toBe(false);
    expect(f.exit.snapshot().traversalOwned).toBe(false); // registration stores data; no callback invocation is inferred.
  });

  it('uses Game _strlen DWORD loads and a mask-aware final candidate before trimming', () => {
    const f = fixture(), typeInfo = nativeGameTypeInfoForCrt(f.crt);
    const freed: NativeMemoryBacking[] = [], release = f.crt.free.bind(f.crt);
    f.crt.free = backing => { if (backing) freed.push(backing); return release(backing); };
    const cached = value(typeInfo.getName());
    expect(text(cached!)).toBe('class gCNavigation_PS');
    expect(typeInfo.snapshot().trace).toContain('Game._strlen.candidate-reread+14');
    expect(typeInfo.snapshot().trace).toContain('Game._strlen.return21');
    expect(typeInfo.snapshot().boundary).toBe(null);
    const expected = new TextEncoder().encode('class gCNavigation_PS\0');
    const temporary = freed.find(backing => backing.bytes.length === 24 &&
      backing.bytes.subarray(0, expected.length).every((byte, index) => byte === expected[index]));
    expect(temporary).toBeDefined();
    expect([...temporary!.knownMask.subarray(0, expected.length)]).toEqual(new Array(expected.length).fill(255));
    expect([...temporary!.knownMask.subarray(expected.length, 24)]).toEqual([0, 0]);
  });

  it('retains guard and Shared CString allocation when the actual Game exit table is still cold', () => {
    const f = fixture(false), result = f.className.get();
    expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('Game._atexit');
    expect(f.className.fields.readUnsigned(8)).toBe(3);
    expect(f.className.fields.pointer<object>(0).get()).not.toBeNull();
    expect(f.className.snapshot().name).not.toBeNull();
    expect(f.exit.snapshot().callbackCells).toEqual([]);
    expect(f.className.get()).toEqual(result);
  });

  it('keeps one canonical class cache bound to one SharedBase MemoryAdmin', () => {
    const f = fixture();
    expect(NativeGameNavigationClassName.forCrt(f.crt, f.memory)).toBe(f.className);
    expect(() => NativeGameNavigationClassName.forCrt(f.crt, new NativeMemoryAdmin(f.platform,
      { extensions: [nativeSceneStartupHeapExtension] }))).toThrow('cannot change its SharedBase MemoryAdmin');
  });
});
