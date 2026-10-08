import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import { NativeGameArenaType } from '../../src/gothic3/native-game-arena-type';
import { NativePropertySingleton } from '../../src/gothic3/native-property-singleton';
import { NativeGameArenaClassName } from '../../src/gothic3/native-game-arena-class-name';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeArenaHeapExtension, nativeSceneStartupHeapExtension, nativePropertyHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform, createBrowserNpcRuntimeAdminOwner } from '../../src/gothic3/native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }

function fixture(initializeExit = true, sourceMemory?:NativeMemoryAdmin, useNpcPool=false) {
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
  const memory = sourceMemory ?? (useNpcPool ? createBrowserNpcRuntimeAdminOwner(platform).memory : new NativeMemoryAdmin(platform, { extensions: [nativeSceneStartupHeapExtension,nativeArenaHeapExtension,nativePropertyHeapExtension] }));
  const owner = NativeGameArenaType.forCrt(crt, memory);
  return { platform, crt, exit, memory, owner };
}

describe('Original Game Arena type singleton', () => {
 it('constructs the canonical base/factory, invokes the original virtual class name and registers the actual type pointer', () => {
  const f=fixture();
  for(const offset of [21,22,23,42,43,...Array.from({length:12},(_,i)=>48+i)]) {
   f.owner.storage.bytes[offset]=0xa5;f.owner.storage.knownMask[offset]=0;
  }
  const fields=value(f.owner.get());
  expect(fields).toBe(f.owner.fields);expect(fields.readUnsigned(0)).toBe(0x2065915c);
  expect(f.owner.storage.readUnsigned(60)).toBe(1);
  expect(f.owner.base.readUnsigned(20,1)).toBe(1);
  expect(f.owner.factory.readUnsigned(0)).toBe(0x100ea9c4);
  expect(f.owner.factory.readUnsigned(16,2)).toBe(1);
  for(const offset of [21,22,23,42,43,...Array.from({length:12},(_,i)=>48+i)]) {
   expect(f.owner.storage.bytes[offset]).toBe(0xa5);expect(f.owner.storage.knownMask[offset]).toBe(0);
  }
  const snapshot=f.owner.snapshot();
  expect(snapshot.constructed).toBe(true);expect(snapshot.registered).toBe(true);
  expect(snapshot.wrapper?.capacity).toBe(4);
  expect(new NativeHeapObjectViews(snapshot.wrapper!).pointer(0).get()).toBe(fields);
  expect(snapshot.slot!.pointer(0).get()).toBe(snapshot.wrapper);
  expect(snapshot.callback).toMatchObject({module:'Game',entry:'20549930',label:'arenaTypeCleanup'});
  const singleton=value(NativePropertySingleton.forPlatform(f.platform,f.memory)), table=value(singleton.table());
  expect(table.fields.readUnsigned(12)).toBe(1);
  const className=NativeGameArenaClassName.forCrt(f.crt,f.memory),name=value(className.get());
  const index=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4),freed:false});
  const found=value(table.findSlot(name,index))!;
  expect(found.pointer(0).get()).toBe(snapshot.wrapper);
  const data=name.snapshot().allocation!;
  expect(new DataView(data.bytes.buffer,data.bytes.byteOffset).getUint16(4,true)).toBe(3);
  expect(f.exit.snapshot().callbackCells.map(cell=>cell.callback?.entry)).toEqual(['2000951b','20549930']);
  const trace=snapshot.trace;
  expect(trace.indexOf('Game.Arena.type.guard1')).toBeLessThan(trace.indexOf('SharedBase.propertyTypeBase.construct'));
  expect(trace.indexOf('SharedBase.namedFactory.construct')).toBeLessThan(trace.indexOf('SharedBase.propertySingleton.GetInstance'));
  expect(trace.indexOf('SharedBase.taggedNew4.ed')).toBeLessThan(trace.indexOf('Game.Arena.virtualClassName2001d278'));
  expect(trace.indexOf('SharedBase.RegisterTemplate.return1')).toBeLessThan(trace.indexOf('Game.Arena.typeCleanup.atexit'));
  expect(value(f.owner.get())).toBe(fields);expect(f.exit.snapshot().callbackCells).toHaveLength(2);
  expect(table.fields.readUnsigned(12)).toBe(1);
  value(f.owner.invokeRegisteredCleanup(snapshot.callback!));
  expect(fields.readUnsigned(0)).toBe(0x100e9d6c);expect(f.owner.factory.readUnsigned(0)).toBe(0x100ea9c4);
  expect(new DataView(data.bytes.buffer,data.bytes.byteOffset).getUint16(4,true)).toBe(2);
  expect(f.owner.get().known).toBe(false);
  value(className.invokeRegisteredDestructor(className.snapshot().registeredCallback!));
  expect(new DataView(data.bytes.buffer,data.bytes.byteOffset).getUint16(4,true)).toBe(1);
  value(f.platform.dispose());
  expect(data.freed).toBe(true);expect(snapshot.wrapper!.freed).toBe(true);expect(snapshot.slot!.backing.freed).toBe(true);
 });
 it('registers through the actual browser NPC heap composition without a duplicate 20-byte extension', () => {
  const f=fixture(true,undefined,true);
  value(f.owner.get());expect(f.owner.snapshot().registered).toBe(true);
  expect(f.owner.snapshot().wrapper!.capacity).toBe(4);
 });
 it('loads the actual type vtable after wrapper allocation and retains the prefix at an altered dispatch target', () => {
  const f=fixture(),allocate=f.platform.virtualAlloc.bind(f.platform);
  f.platform.virtualAlloc=(bytes,kind,protection)=>{
   const result=allocate(bytes,kind,protection);
   if(bytes===0x42000)f.owner.fields.writeUnsigned(0,0xdeadbeef);
   return result;
  };
  const result=f.owner.get();expect(result.known).toBe(false);
  expect(f.owner.fields.readUnsigned(0)).toBe(0xdeadbeef);
  expect(f.owner.snapshot().wrapper).not.toBeNull();
  expect(new NativeHeapObjectViews(f.owner.snapshot().wrapper!).pointer(0).get()).toBe(f.owner.fields);
  expect(f.owner.snapshot().slot).toBeNull();expect(f.owner.snapshot().registered).toBe(false);
  expect(f.owner.snapshot().callback).toBeNull();expect(f.owner.get()).toEqual(result);
 });
 it('returns the physical warm address without promoting manually set guard bytes into constructor or registration ownership', () => {
  const f=fixture();f.owner.storage.writeUnsigned(60,1);
  expect(value(f.owner.get())).toBe(f.owner.fields);
  expect(f.owner.snapshot().constructed).toBe(false);expect(f.owner.snapshot().registered).toBe(false);
  expect(f.owner.snapshot().callback).toBeNull();expect(f.exit.snapshot().callbackCells).toHaveLength(0);
 });
 it('preserves completed construction when a missing registration pool stops the original prefix', () => {
  const platform=new NativeRuntimePlatform({engineCrtServices:{tlsValues:new Map(),kernel32Available:true,pointerCodec:'owned-bijection',fiberLocalStorage:true,processHeap:true,osVersion:{platform:2,major:6,minor:1,build:0xabcd}}});
  const errno=new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(4),knownMask:new Uint8Array(4).fill(255),freed:false});
  const crt=NativeGameCrtOwner.forPlatform({platform,errnoSlot:()=>known(errno)});
  crt.physical.crtOsFields.writeUnsigned(0,2);crt.physical.crtOsFields.writeUnsigned(12,6);
  crt.physical.sectionInitializer.pointer(0).set(value(crt.encodePointer(null)));
  value(crt.initHeap());value(crt.initLocks());value(NativeGameExitTable.forCrt(crt).initialize());
  const memory=new NativeMemoryAdmin(platform,{extensions:[nativeSceneStartupHeapExtension,nativeArenaHeapExtension]});
  const owner=NativeGameArenaType.forCrt(crt,memory),result=owner.get();
  expect(result.known).toBe(false);expect(owner.storage.readUnsigned(60)).toBe(1);
  expect(owner.factory.pointer(20).get()).not.toBeNull();expect(owner.fields.readUnsigned(0)).toBe(0x2065915c);
  expect(owner.snapshot().registered).toBe(false);expect(owner.snapshot().callback).toBeNull();
  const trace=owner.snapshot().trace;
  expect(owner.get()).toEqual(result);expect(owner.snapshot().trace).toEqual(trace);
 });
 it('rejects unknown guard knowledge, foreign heaps and forged constructor ownership', () => {
  const f=fixture();f.owner.storage.maskedWord(60).knownMask=0xfffffffe;
  expect(f.owner.get().known).toBe(false);expect(f.owner.fields.readUnsigned(0)).toBe(0);
  const other=fixture();expect(()=>NativeGameArenaType.forCrt(other.crt,f.memory)).toThrow(/heap/);
  const fake=Object.create(NativeMemoryAdmin.prototype) as NativeMemoryAdmin;fake.usesPlatform=()=>true;
  expect(()=>fixture(true,fake)).toThrow(/heap/);
 });
});
