import {NativeSharedStaticTls} from '../../src/gothic3/native-shared-static-tls';
import {NativeSharedMessageDebug} from '../../src/gothic3/native-shared-message-debug';
import type {NativeBytePointer} from '../../src/gothic3/native-pointer-geometry';
import { expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import { NativeGameArenaType } from '../../src/gothic3/native-game-arena-type';
import { NativeGameArenaStatusProperty } from '../../src/gothic3/native-game-arena-status-property';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeArenaHeapExtension, nativeSceneStartupHeapExtension, nativePropertyHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform, createBrowserNpcRuntimeAdminOwner } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }

function fixture(initializeExit = true, sourceMemory?:NativeMemoryAdmin, useNpcPool=false, loadTls=false) {
  const platform = new NativeRuntimePlatform({ engineCrtServices: {
    ...(loadTls?{threadStack:{threadCapability:{},reservationBytes:4096,addressModel:'opaque-relative' as const,initialRegisters:'unknown' as const,initialFs0:'unknown' as const}}:{}),
    tlsValues: new Map<number, object>(), kernel32Available: true, pointerCodec: 'owned-bijection',
    fiberLocalStorage: true, processHeap: true, osVersion: { platform: 2, major: 6, minor: 1, build: 0xabcd },
  } });
  if(loadTls)value(value(NativeSharedStaticTls.forPlatform(platform)).loadSharedBase());
  const errno = new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4).fill(255), freed: false });
  const crt = NativeGameCrtOwner.forPlatform({ platform, errnoSlot: () => known(errno) });
  crt.physical.crtOsFields.writeUnsigned(0, 2); crt.physical.crtOsFields.writeUnsigned(12, 6);
  const encodedNull = value(crt.encodePointer(null));
  if (encodedNull === null) throw new Error('Owned Game CRT encoded NULL required');
  crt.physical.sectionInitializer.pointer<object>(0).set(encodedNull);
  value(crt.initHeap()); value(crt.initLocks());
  const exit = NativeGameExitTable.forCrt(crt);
  if (initializeExit) value(exit.initialize());
  const memory = sourceMemory ?? (useNpcPool ? createBrowserNpcRuntimeAdminOwner(platform).memory : new NativeMemoryAdmin(platform, { extensions: [nativeSceneStartupHeapExtension,nativeArenaHeapExtension,nativePropertyHeapExtension] }));
  const owner = NativeGameArenaStatusProperty.forCrt(crt, memory);
  return { platform, crt, exit, memory, owner };
}

it('constructs the actual first Arena Status descriptor through its cold Create and unregister lookup',()=>{
 const f=fixture(true,undefined,true);const result=f.owner.initialize();expect(result.known).toBe(false);
 if(result.known)throw new Error('Create unexpectedly completed');
 expect(result.reason).toContain('10088191');
 expect(f.owner.fields).toBe(f.crt.imageStorage('arenaStatusDescriptor'));
 expect(f.owner.fields.readUnsigned(0)).toBe(0x20659aec);
 expect(f.owner.fields.readUnsigned(16)).toBe(2);
 expect(f.owner.fields.readUnsigned(20,1)).toBe(0);
 expect(f.owner.fields.readUnsigned(28)).toBe(20);
 expect(f.owner.fields.pointer<NativeHeapObjectViews>(24).get()).toBe(NativeGameArenaType.forCrt(f.crt,f.memory).fields);
 expect(f.owner.fields.pointer(32).get()).toBeNull();
 expect(value(f.owner.snapshot().temporaryName!.text())).toBe('Status');
 expect(f.owner.snapshot().baseConstructed).toBe(true);
 expect(f.owner.snapshot().createCompleted).toBe(true);
 expect(f.owner.snapshot().trace).toContain('10087ea7.compareActualTypeNames');
 expect(f.owner.snapshot().trace).toContain('10087fcc.unregisterAbsent.return0');
 expect(f.owner.snapshot().initializerReturned).toBe(false);
 expect(f.owner.snapshot().propertyRegistered).toBe(false);
 expect(f.owner.snapshot().descriptorStored).toBe(true);
 const arena=NativeGameArenaType.forCrt(f.crt,f.memory).fields;
 expect(arena.readUnsigned(12)).toBe(1);expect(arena.readUnsigned(16)).toBe(9);
 const array=arena.pointer<{identity:object;bytes:Uint8Array;knownMask:Uint8Array;freed:boolean}>(8).get()!;
 expect(new NativeHeapObjectViews(array,0,4).pointer(0).get()).toBe(f.owner.fields);
 expect(value(f.owner.snapshot().diagnosticNames!.propertyName.text())).toBe('Status');
 expect(value(f.owner.snapshot().diagnosticNames!.typeName.text())).toBe('bTPropertyContainer<enum gEArenaStatus>');
 const trace=f.owner.snapshot().trace;expect(f.owner.initialize()).toEqual(result);expect(f.owner.snapshot().trace).toEqual(trace);
 expect(f.exit.snapshot().callbackCells).toHaveLength(3);
});
it('preserves Create completion when the property-array allocation pool is unavailable',()=>{
 const f=fixture();const result=f.owner.initialize();expect(result.known).toBe(false);
 if(result.known)throw new Error('Missing pool unexpectedly returned');
 expect(result.reason).toContain('36 bytes');
 expect(f.owner.snapshot().createCompleted).toBe(true);
 expect(f.owner.snapshot().descriptorStored).toBe(false);
 const type=NativeGameArenaType.forCrt(f.crt,f.memory).fields;
 expect(type.readUnsigned(12)).toBe(0);expect(type.readUnsigned(16)).toBe(0);
 expect(type.pointer(8).get()).toBeNull();
 const trace=f.owner.snapshot().trace;expect(f.owner.initialize()).toEqual(result);
 expect(f.owner.snapshot().trace).toEqual(trace);
});

it('connects actual Status registration to loaded TLS and retains the original vsprintf FILE prefix',()=>{
 const f=fixture(true,undefined,true,true);
 const result=f.owner.initialize();expect(result.known).toBe(false);
 if(result.known)throw new Error('Unowned formatter unexpectedly returned');
 expect(result.reason).toContain('100a7eff');expect(result.reason).toContain('100b5355');
 const diagnostic=NativeSharedMessageDebug.forPlatform(f.platform),state=diagnostic.snapshot();
 const file=state.file!;
 expect(file.bytes.length).toBe(32);
 expect(file.readUnsigned(4)).toBe(0x7fffffff);expect(file.readUnsigned(12)).toBe(0x42);
 const destination=file.pointer<NativeBytePointer>(0).get()!;
 expect(file.pointer(8).get()).toBe(destination);expect(destination.fields).toBe(state.buffer);
 expect(destination.offset).toBe(0);expect(state.buffer!.bytes.length).toBe(0x6d4-0x108);
 expect(state.buffer!.bytes.every(byte=>byte===0)).toBe(true);
 expect([...file.knownMask.slice(16)]).toEqual(new Array(16).fill(0));
 const names=f.owner.snapshot().diagnosticNames!;
 const property=state.arguments!.pointer<NativeBytePointer>(0).get()!;
 const type=state.arguments!.pointer<NativeBytePointer>(4).get()!;
 expect(property.fields.readUnsigned(property.offset,1)).toBe('S'.charCodeAt(0));
 expect(type.fields.readUnsigned(type.offset,1)).toBe('b'.charCodeAt(0));
 expect(value(names.propertyName.text())).toBe('Status');
 expect(state.locale).toBeNull();expect(state.formatterReturned).toBe(false);
 expect(state.terminatorWritten).toBe(false);expect(state.messageDispatched).toBe(false);
 expect(state.trace).toEqual(['100498f0.loadThreadTlsBuffer','1004990a.retainActualVarargs','100a7f27.forwardWithNullLocale','100a7eff.callOutputFormatter']);
 expect(f.owner.initialize()).toEqual(result);expect(diagnostic.snapshot().file).toBe(file);
 expect(f.owner.snapshot().initializerReturned).toBe(false);
});
