import { expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import { NativeGameArenaStatusClassName } from '../../src/gothic3/native-game-arena-status-class-name';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeArenaHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeCrtUndName } from '../../src/gothic3/native-crt-undname';
import type { NativeCrtBytePointer } from '../../src/gothic3/native-crt-dname';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fixture(initializeExit = true, sourceMemory?:NativeMemoryAdmin) {
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
  const memory = sourceMemory ?? new NativeMemoryAdmin(platform, { extensions: [nativeSceneStartupHeapExtension,nativeArenaHeapExtension] });
  const className = NativeGameArenaStatusClassName.forCrt(crt, memory);
  return { platform, crt, exit, memory, className };
}

it('constructs the original Status container name, restores local tables and owns cleanup', () => {
  const f = fixture();
  const result = value(f.className.get());
  expect(value(result.text())).toBe('bTPropertyContainer<enum gEArenaStatus>');
  expect(f.className.fields.readUnsigned(8)).toBe(3);
  const callback = f.className.snapshot().registeredCallback!;
  expect(callback.entry).toBe('200064f1');
  expect(f.exit.snapshot().callbackCells).toHaveLength(1);
  const demangler = new NativeCrtUndName(f.crt);
  expect(demangler.fields.readUnsigned(57,1)).toBe(0);
  const cursor = demangler.fields.pointer<NativeCrtBytePointer>(32).get()!;
  expect(cursor.fields.readUnsigned(cursor.offset,1)).toBe(0);
  expect(value(f.className.get())).toBe(result);
  value(f.className.invokeRegisteredDestructor(callback));
  expect(result.text().known).toBe(false);
  expect(f.className.get().known).toBe(false);
  expect(f.exit.snapshot().traversalOwned).toBe(false);
});
it('retains the constructed Status CString when the later exit registration is unavailable', () => {
  const f = fixture(false);
  const result = f.className.get();
  expect(result.known).toBe(false);
  const name = f.className.snapshot().name!;
  expect(value(name.text())).toBe('bTPropertyContainer<enum gEArenaStatus>');
  expect(f.className.fields.readUnsigned(8)).toBe(3);
  expect(f.className.snapshot().registeredCallback).toBeNull();
  const trace = f.className.snapshot().trace;
  expect(f.className.get()).toEqual(result);
  expect(f.className.snapshot().trace).toEqual(trace);
});
it('keeps Status and Arena caches independent and copies the actual prior pointer once', () => {
  const f = fixture();
  const prior = f.crt.imageStorage('arenaClassName');
  f.className.initializerResult.pointer<NativeHeapObjectViews>(0).set(prior);
  const name = value(f.className.get());
  expect(f.className.fields.pointer<NativeHeapObjectViews>(4).get()).toBe(prior);
  f.className.initializerResult.pointer<NativeHeapObjectViews>(0).set(null);
  expect(value(f.className.get())).toBe(name);
  expect(f.className.fields.pointer<NativeHeapObjectViews>(4).get()).toBe(prior);
  expect(prior.readUnsigned(8)).toBe(0);
  expect(f.className.snapshot().registeredCallback?.entry).toBe('200064f1');
});
it('does not invent a retained Status name from manually pre-set guard bits', () => {
  const f = fixture();
  f.className.fields.writeUnsigned(8,3);
  expect(f.className.get().known).toBe(false);
  expect(f.className.snapshot().name).toBeNull();
  expect(f.exit.snapshot().callbackCells).toHaveLength(0);
});
