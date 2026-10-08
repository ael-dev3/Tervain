import { expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import { NativeGameArenaStatusClassName } from '../../src/gothic3/native-game-arena-status-class-name';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeArenaHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';

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

it('reaches the original template demangler and preserves the unfinished source prefix', () => {
  const f = fixture();
  const result = f.className.get();
  expect(result.known).toBe(false);
  if (result.known) throw new Error('Template demangler unexpectedly completed; extend this receipt to verify the actual name and cleanup');
  expect(result.reason).toContain('Unowned getZName template grammar');
  expect(f.className.fields.readUnsigned(8)).toBe(3);
  expect(f.className.snapshot().registeredCallback).toBeNull();
  expect(f.className.snapshot().name).toBeNull();
  expect(f.exit.snapshot().callbackCells).toHaveLength(0);
  const trace = f.className.snapshot().trace;
  expect(f.className.get()).toEqual(result);
  expect(f.className.snapshot().trace).toEqual(trace);
  expect(f.className.fields.pointer<NativeHeapObjectViews>(4).get()).toBeNull();
});
