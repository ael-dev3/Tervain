import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { createBrowserGameCrtPlatform } from '../../src/gothic3/browser-game-crt-platform';
import { createBrowserGameCrtStartup } from '../../src/gothic3/browser-game-crt-startup';
import { browserGameProcessInputs } from '../../src/gothic3/browser-game-process-inputs';
import { browserGameStartupIoInputs } from '../../src/gothic3/browser-game-startup-io-inputs';
import { browserGameStandardIoInputs } from '../../src/gothic3/browser-game-standard-io-inputs';
import { browserGameArgvNlsInputs } from '../../src/gothic3/browser-game-argv-nls-inputs';
import { nativeVirtualX86CpuSelection } from '../../src/gothic3/native-x86-thread-stack-profile';
import { NativeX86ThreadStack } from '../../src/gothic3/native-x86-thread-stack';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import { NativeGameLayerBaseClassName } from '../../src/gothic3/native-game-layer-base-class-name';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
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
function fixture(textPool = true, objectRefPool = true) {
  const platform = platformFixture();
  const memory = new NativeMemoryAdmin(platform, { extensions: [
    ...(textPool ? [nativeNpcHeapExtension] : []),
    ...(objectRefPool ? [nativeSceneStartupHeapExtension] : []),
  ] });
  const stack = fact(NativeX86ThreadStack.forPlatform(platform));
  const game = fact(createBrowserGameCrtStartup(platform, memory));
  return { platform, memory, stack, game };
}

describe('original Game C++ class-name initializers on the retained browser stack', () => {
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
