import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import type { NativeBytePointer } from '../../src/gothic3/native-pointer-geometry';
import { createBrowserGameCrtPlatform } from '../../src/gothic3/browser-game-crt-platform';
import { createBrowserGameCrtStartup } from '../../src/gothic3/browser-game-crt-startup';
import { browserGameProcessInputs } from '../../src/gothic3/browser-game-process-inputs';
import { browserGameStartupIoInputs } from '../../src/gothic3/browser-game-startup-io-inputs';
import { browserGameStandardIoInputs } from '../../src/gothic3/browser-game-standard-io-inputs';
import { browserGameArgvNlsInputs } from '../../src/gothic3/browser-game-argv-nls-inputs';
import { nativeVirtualX86CpuSelection } from '../../src/gothic3/native-x86-thread-stack-profile';
import { NativeX86ThreadStack } from '../../src/gothic3/native-x86-thread-stack';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension, nativeClassNameHeapExtension, nativePropertyHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeGameLayerBaseClassName } from '../../src/gothic3/native-game-layer-base-class-name';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import { NativeGameArenaType } from '../../src/gothic3/native-game-arena-type';
import { NativeGameArenaStatusProperty } from '../../src/gothic3/native-game-arena-status-property';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeSharedStaticTls } from '../../src/gothic3/native-shared-static-tls';
import { NativeSharedMessageDebug } from '../../src/gothic3/native-shared-message-debug';
import { NativePropertySingleton } from '../../src/gothic3/native-property-singleton';
import { NativeGameClassName } from '../../src/gothic3/native-game-class-name-family';
import { gameClassNameSpec, gameClassNameFamilySpecs } from '../../src/gothic3/native-game-class-name-family-source';

function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function platformFixture() {
  return createBrowserGameCrtPlatform({
    processInputs: browserGameProcessInputs,
    threadStack: { reservationBytes: 4096, pageAlignment: 'virtual-page-4096', cpu: nativeVirtualX86CpuSelection },
    startupIo: browserGameStartupIoInputs, standardIo: browserGameStandardIoInputs, argvNls: browserGameArgvNlsInputs,
    setEnvp: { physicalGameHeapCapacity: 'round-eight-unknown-padding', heapFree: { outcome: 'success' } },
  });
}
function fixture(textPool = true, objectRefPool = true, pointerPool = false) {
  const platform = platformFixture();
  const memory = new NativeMemoryAdmin(platform, { extensions: [
    ...(textPool ? [nativeNpcHeapExtension] : []),
    ...(objectRefPool ? [nativeSceneStartupHeapExtension] : []),
    ...(pointerPool ? [nativeClassNameHeapExtension,nativePropertyHeapExtension] : []),
  ] });
  const stack = fact(NativeX86ThreadStack.forPlatform(platform));
  const game = fact(createBrowserGameCrtStartup(platform, memory));
  return { platform, memory, stack, game };
}

describe('original Game C++ class-name initializers on the retained browser stack', () => {
  it('returns the pointer-template initializer through the original 56-byte pool', () => {
    const f = fixture(true, true, true);
    const pointerArray = NativeGameClassName.forSpec(f.game.crt,f.memory,gameClassNameSpec('204b1620')!);
    expect(fact(fact(pointerArray.get()).text())).toBe('bTRefPtrArray<class bCPropertyObjectBase *>');
    expect(fact(fact(NativeGameClassName.forSpec(f.game.crt,f.memory,gameClassNameSpec('204b17d0')!).get()).text()))
      .toBe('bTValArray<float>');
    expect(fact(fact(NativeGameClassName.forSpec(f.game.crt,f.memory,gameClassNameSpec('204b1cf0')!).get()).text()))
      .toBe('bTObjArray<struct gCQuest_PS::SLogEntry>');
    expect(fact(fact(NativeGameClassName.forSpec(f.game.crt,f.memory,gameClassNameSpec('204b1d50')!).get()).text()))
      .toBe('bTObjArray<class bTAutoPOSmartPtr<class gCQuest_PS> >');
    expect(f.stack.snapshot().calls.find(call => call.site === '204b1620')).toMatchObject({ returned: true });
    expect({ next: f.game.attachProgress.nextBoundary,
      reason: f.game.attachProgress.setEnvpProgress!.boundary,
      callbacks: NativeGameExitTable.forCrt(f.game.crt).snapshot().callbackCells.length }).toEqual({
        next: { address: '20466654', name: 'translatedCrtCall', target: '204b1dd0' },
        reason: 'Translated Arena Status initializer pending: Property registration Message.Debug at 10088191: Unowned SharedBase output formatter at 100b5355 called from 100a7eff', callbacks: 159,
      });
    const arenaRoot=f.game.crt.imageStorage('arenaRootWrapper');
    const arenaVtable=arenaRoot.pointer(0).get() as NativeBytePointer;
    expect(arenaVtable.fields).toBe(f.game.crt.imageStorage('arenaRootVtable'));
    expect(arenaVtable.offset).toBe(0);
    expect(arenaRoot.readUnsigned(4)).toBe(11);
    expect(arenaRoot.readUnsigned(8)).toBe(0);
    const arenaTypePointer=arenaRoot.pointer(12).get() as NativeBytePointer;
    expect(arenaTypePointer.fields).toBe(f.game.crt.imageStorage('arenaTypeAndGuard'));
    expect(arenaTypePointer.offset).toBe(0);
    expect(NativeGameArenaType.forCrt(f.game.crt,f.memory).snapshot()).toMatchObject({constructed:true,registered:true,boundary:null});
    expect(f.stack.snapshot().calls.find(call=>call.site==='204b1d75')).toMatchObject({returned:true});
    expect(f.stack.snapshot().calls.find(call=>call.site==='204b1d8f')).toMatchObject({returned:true});
    expect(f.stack.snapshot().calls.find(call=>call.site==='2006f97c')).toMatchObject({returned:true});
    for(const site of ['2006f985','2006f98d','2006f9ec','2006f9f4','200705c4'])
      expect(f.stack.snapshot().calls.find(call=>call.site===site)).toMatchObject({returned:true});
    expect(f.stack.snapshot().calls.find(call=>call.site==='200705d2')).toMatchObject({returned:true,
      returnWord:{provenance:{kind:'source',type:'code',address:'200705d4'}}});
    expect(f.game.crt.imageStorage('arenaRootTypeVtable').readUnsigned(12)).toBe(0x2002adfb);
    for(const site of ['1008d1a3','1008d1aa','1008d1b9','1008ddbb','1008ddc2','1008dddb','1008eb30','1008d257','200705d6','200705de','204b1daa'])
      expect(f.stack.snapshot().calls.find(call=>call.site===site)).toMatchObject({returned:true});
    const factory=NativeGameArenaType.forCrt(f.game.crt,f.memory).factory;
    const rootArray=factory.pointer(4).get() as NativeBytePointer;
    expect(rootArray.offset).toBe(0);
    expect(rootArray.fields.backing).toMatchObject({requestedBytes:36,capacity:40,freed:false});
    expect(factory.readUnsigned(8)).toBe(1);
    expect(factory.readUnsigned(12)).toBe(9);
    const registeredRoot=rootArray.fields.pointer(0).get() as NativeBytePointer;
    expect(registeredRoot.fields).toBe(arenaRoot);
    expect(registeredRoot.offset).toBe(0);
    expect(Array.from(rootArray.fields.bytes.subarray(4,36))).toEqual(Array(32).fill(0));
    expect(Array.from(rootArray.fields.knownMask.subarray(4,36))).toEqual(Array(32).fill(255));
    const singleton=fact(NativePropertySingleton.forPlatform(f.platform,f.memory));
    expect(singleton.ranges.object.readUnsigned(4,1)).toBe(1);
    expect(singleton.ranges.object.pointer(8).get()).toBeNull();
    expect(f.stack.snapshot().calls.find(call=>call.site==='204b1db4')).toMatchObject({returned:true});
    expect(f.stack.snapshot().calls.filter(call=>call.site==='20466654'&&call.returned)).toHaveLength(155);
    expect(f.stack.snapshot().calls.filter(call=>!call.returned).map(call=>call.site))
      .toEqual(['204678f2','20466654']);
    const status=NativeGameArenaStatusProperty.forCrt(f.game.crt,f.memory);
    expect(fact(NativeSharedStaticTls.forPlatform(f.platform)).snapshot()).toMatchObject({loaded:true,
      virtualLoaderSlot:0,sharedCrtInitialized:false,dllAttachExecuted:false});
    expect(status.snapshot()).toMatchObject({baseConstructed:true,createCompleted:true,descriptorStored:true,
      initializerReturned:false,propertyRegistered:false});
    expect(status.fields).toBe(f.game.crt.imageStorage('arenaStatusDescriptor'));
    expect(status.fields.pointer(24).get()).toBe(NativeGameArenaType.forCrt(f.game.crt,f.memory).fields);
    const arena=NativeGameArenaType.forCrt(f.game.crt,f.memory).fields;
    expect(arena.readUnsigned(12)).toBe(1);
    expect(arena.readUnsigned(16)).toBe(9);
    const properties=arena.pointer<{identity:object;bytes:Uint8Array;knownMask:Uint8Array;freed:boolean}>(8).get()!;
    expect(new NativeHeapObjectViews(properties,0,4).pointer(0).get()).toBe(status.fields);
    const diagnostic=NativeSharedMessageDebug.forPlatform(f.platform).snapshot();
    expect(diagnostic.file!.readUnsigned(4)).toBe(0x7fffffff);
    expect(diagnostic.file!.readUnsigned(12)).toBe(0x42);
    const destination=diagnostic.file!.pointer(0).get() as NativeBytePointer;
    expect(destination.fields).toBe(diagnostic.buffer);
    expect(destination.offset).toBe(0);
    expect(diagnostic).toMatchObject({formatterReturned:false,terminatorWritten:false,messageDispatched:false,debugReturned:false});
    const completed = gameClassNameFamilySpecs.filter(spec => spec.initializer >= '204b11b0' && spec.initializer < '204b1d70');
    expect(completed).toHaveLength(154);
    for (const spec of completed)
      expect(f.stack.snapshot().calls.find(call => call.site === spec.initializer)).toMatchObject({ returned: true });
  });
  it('rejects a caller-shaped or foreign heap before constructing the Game startup graph', () => {
    const f = fixture();
    const otherPlatform = platformFixture();
    expect(createBrowserGameCrtStartup(otherPlatform, f.memory)).toMatchObject({ known: false,
      reason: expect.stringContaining('same-platform') });
    const shaped = Object.create(NativeMemoryAdmin.prototype) as NativeMemoryAdmin;
    shaped.usesPlatform = () => true;
    expect(createBrowserGameCrtStartup(f.platform, shaped).known).toBe(false);
    const cold = createBrowserGameCrtPlatform({ processInputs: browserGameProcessInputs });
    expect(createBrowserGameCrtStartup(cold, f.memory)).toMatchObject({ known: false,
      reason: expect.stringContaining('same-platform') });
    expect(createBrowserGameCrtStartup(cold, shaped)).toMatchObject({ known: false,
      reason: expect.stringContaining('same-platform') });
    expect(f.game.crt.imageStorage('layerBaseClassName').readUnsigned(8)).toBe(3);
  });
  it('runs original CALL, static result store and RET before selecting the next original slot', () => {
    const f = fixture();
    const bool = NativeGameClassName.forSpec(f.game.crt,f.memory,gameClassNameSpec('204b11e0')!);
    expect(fact(fact(bool.get()).text())).toBe('bool');
    const pointerArray = NativeGameClassName.forSpec(f.game.crt,f.memory,gameClassNameSpec('204b1620')!);
    expect(pointerArray.get()).toMatchObject({ known: false,
      reason: 'Native simple-allocation table bucket for 52 bytes is not audited' });
    expect(f.game.attachProgress.nextBoundary).toEqual({ name: 'translatedCrtCall', address: '204b1620', target: '2000fed4' });
    expect(fact(fact(NativeGameClassName.forSpec(f.game.crt,f.memory,gameClassNameSpec('204b13a0')!).get()).text())).toBe('eCTriggerBase_PS');
    expect(fact(fact(NativeGameClassName.forSpec(f.game.crt,f.memory,gameClassNameSpec('204b1340')!).get()).text()))
      .toBe('bTPropertyObject<class eCMainCache,class bCObjectRefBase>');
    const owner = NativeGameLayerBaseClassName.forCrt(f.game.crt, f.memory);
    expect(fact(fact(owner.get()).text())).toBe('eCProcessibleElement');
    expect(owner.fields.readUnsigned(8)).toBe(3);
    const published = owner.initializerResult.pointer<{ fields: unknown; offset: number }>(0).get();
    expect(published?.fields).toBe(owner.fields);
    expect(published?.offset).toBe(0);
    const calls = f.stack.snapshot().calls;
    const completed = gameClassNameFamilySpecs.filter(spec => spec.initializer >= '204b11b0' && spec.initializer < '204b1620');
    expect(completed).toHaveLength(37);
    for (const {initializer} of completed) {
      expect(calls.find(call => call.site === initializer)).toMatchObject({ returned: true });
    }
    expect(() => NativeGameClassName.forSpec(f.game.crt, f.memory,
      { ...gameClassNameSpec('204b11e0')! })).toThrow('Actual nonlegacy');
    expect(calls.find(call => call.site === '20466654')).toMatchObject({ returned: true });
    expect(calls.find(call => call.site === '204b11b0')).toMatchObject({ returned: true });
    expect(calls.filter(call => !call.returned).map(call => call.site)).toEqual(['204678f2', '20466654', '204b1620']);
    const effects = f.game.attachProgress.setEnvpProgress!.effects.map(effect => effect.pc);
    for (const address of ['204b11b0', '204b11b5', '204b11ba']) expect(effects).toContain(address);
    const exit = NativeGameExitTable.forCrt(f.game.crt);
    expect(exit.snapshot().callbackCells).toHaveLength(38);
    expect(exit.snapshot().tableAllocations.map(backing => [backing.bytes.length,backing.freed]))
      .toEqual([[128,true],[256,false]]);
    expect(owner.snapshot().registeredCallback).toMatchObject({ entry: '20034649', label: 'layerBaseClassNameDestructor' });
    const before = f.game.bootstrap.attachProgress();
    expect(fact(createBrowserGameCrtStartup(f.platform, f.memory))).toBe(f.game);
    expect(fact(createBrowserGameCrtStartup(f.platform))).toBe(f.game);
    f.game.bootstrap.processAttach();
    expect(f.game.bootstrap.attachProgress()).toEqual(before);
    expect(exit.snapshot().callbackCells).toHaveLength(38);
    const replacement = new NativeMemoryAdmin(f.platform, { extensions: [nativeNpcHeapExtension] });
    expect(createBrowserGameCrtStartup(f.platform, replacement).known).toBe(false);
    expect(f.game.crt.imageStorage('scriptAdminClassName').readUnsigned(8)).toBe(3);
    const objectRef = NativeGameLayerBaseClassName.forObjectRefCrt(f.game.crt, f.memory);
    expect(fact(fact(objectRef.get()).text())).toBe('bCObjectRefBase');
    expect(objectRef.fields).not.toBe(owner.fields);
    expect(objectRef.fields.readUnsigned(8)).toBe(3);
    const objectRefResult = objectRef.initializerResult.pointer<{ fields: unknown; offset: number }>(0).get();
    expect(objectRefResult?.fields).toBe(objectRef.fields);
    expect(objectRefResult?.offset).toBe(0);
    for (const address of ['204b11c0', '204b11c5', '204b11ca']) expect(effects).toContain(address);
    expect(calls.find(call => call.site === '204b11c0')).toMatchObject({ returned: true });
    expect(objectRef.snapshot().registeredCallback).toMatchObject({ entry: '20007a81', label: 'objectRefClassNameDestructor' });
    expect(NativeGameLayerBaseClassName.forObjectRefCrt(f.game.crt, f.memory)).toBe(objectRef);
    expect(() => NativeGameLayerBaseClassName.forObjectRefCrt(f.game.crt, replacement)).toThrow(/MemoryAdmin/);
  });
  it('retains the second getter CALL and its guards when its own string pool is unavailable', () => {
    const f = fixture(true, false);
    expect(f.game.attachProgress.nextBoundary).toEqual({ name: 'translatedCrtCall', address: '204b11c0', target: '2002c9f8' });
    expect(f.game.attachProgress.setEnvpProgress!.boundary).toContain('24 bytes is not audited');
    expect(f.stack.snapshot().calls.filter(call => !call.returned).map(call => call.site))
      .toEqual(['204678f2', '20466654', '204b11c0']);
    expect(f.game.crt.imageStorage('objectRefClassName').readUnsigned(8)).toBe(3);
    expect(f.game.crt.imageStorage('objectRefInitializerResult').pointer(0).get()).toBeNull();
    expect(f.game.crt.imageStorage('objectRefTypeInfoDescriptor').pointer(4).get()).not.toBeNull();
    expect(NativeGameExitTable.forCrt(f.game.crt).snapshot().callbackCells).toHaveLength(2);
    const first = NativeGameLayerBaseClassName.forCrt(f.game.crt, f.memory);
    expect(fact(fact(first.get()).text())).toBe('eCProcessibleElement');
    const before = f.game.bootstrap.attachProgress();
    f.game.bootstrap.processAttach();
    expect(f.game.bootstrap.attachProgress()).toEqual(before);
  });
  it('retains both physical CALL frames and the completed prefix at a missing string allocation', () => {
    const f = fixture(false);
    expect(f.game.attachProgress.nextBoundary).toEqual({ name: 'translatedCrtCall', address: '204b11b0', target: '2000e8d6' });
    expect(f.game.attachProgress.setEnvpProgress!.boundary).toContain('29 bytes is not audited');
    expect(f.stack.snapshot().calls.filter(call => !call.returned).map(call => call.site))
      .toEqual(['204678f2', '20466654', '204b11b0']);
    expect(f.game.crt.imageStorage('layerBaseClassName').readUnsigned(8)).toBe(3);
    expect(f.game.crt.imageStorage('layerBaseInitializerResult').pointer(0).get()).toBeNull();
    expect(NativeGameExitTable.forCrt(f.game.crt).snapshot().callbackCells).toHaveLength(1);
    const effects = f.game.attachProgress.setEnvpProgress!.effects.map(effect => effect.pc);
    expect(effects).not.toContain('204b11b5');
    const before = f.game.bootstrap.attachProgress();
    f.game.bootstrap.processAttach();
    expect(f.game.bootstrap.attachProgress()).toEqual(before);
  });
});
