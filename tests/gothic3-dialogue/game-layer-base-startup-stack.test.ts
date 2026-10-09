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

function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fixture(textPool = true) {
  const platform = createBrowserGameCrtPlatform({
    processInputs: browserGameProcessInputs,
    threadStack: { reservationBytes: 4096, pageAlignment: 'virtual-page-4096', cpu: nativeVirtualX86CpuSelection },
    startupIo: browserGameStartupIoInputs, standardIo: browserGameStandardIoInputs, argvNls: browserGameArgvNlsInputs,
    setEnvp: { physicalGameHeapCapacity: 'round-eight-unknown-padding', heapFree: { outcome: 'success' } },
  });
  const memory = new NativeMemoryAdmin(platform, { extensions: textPool
    ? [nativeNpcHeapExtension, nativeSceneStartupHeapExtension] : [nativeSceneStartupHeapExtension] });
  const stack = fact(NativeX86ThreadStack.forPlatform(platform));
  const game = fact(createBrowserGameCrtStartup(platform, memory));
  return { platform, memory, stack, game };
}

describe('first Game C++ initializer on the retained browser stack', () => {
  it('rejects a caller-shaped or foreign heap before constructing the Game startup graph', () => {
    const f = fixture();
    const other = fixture();
    expect(createBrowserGameCrtStartup(other.platform, f.memory).known).toBe(false);
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
    expect(f.game.attachProgress.nextBoundary).toEqual({ name: 'indirectSourceCall', address: '20466654', target: '204b11c0' });
    const owner = NativeGameLayerBaseClassName.forCrt(f.game.crt, f.memory);
    expect(fact(fact(owner.get()).text())).toBe('eCProcessibleElement');
    expect(owner.fields.readUnsigned(8)).toBe(3);
    const published = owner.initializerResult.pointer<{ fields: unknown; offset: number }>(0).get();
    expect(published?.fields).toBe(owner.fields);
    expect(published?.offset).toBe(0);
    const calls = f.stack.snapshot().calls;
    expect(calls.find(call => call.site === '20466654')).toMatchObject({ returned: true });
    expect(calls.find(call => call.site === '204b11b0')).toMatchObject({ returned: true });
    expect(calls.filter(call => !call.returned).map(call => call.site)).toEqual(['204678f2']);
    const effects = f.game.attachProgress.setEnvpProgress!.effects.map(effect => effect.pc);
    for (const address of ['204b11b0', '204b11b5', '204b11ba']) expect(effects).toContain(address);
    const exit = NativeGameExitTable.forCrt(f.game.crt);
    expect(exit.snapshot().callbackCells).toHaveLength(2);
    expect(owner.snapshot().registeredCallback).toMatchObject({ entry: '20034649', label: 'layerBaseClassNameDestructor' });
    const before = f.game.bootstrap.attachProgress();
    expect(fact(createBrowserGameCrtStartup(f.platform, f.memory))).toBe(f.game);
    expect(fact(createBrowserGameCrtStartup(f.platform))).toBe(f.game);
    f.game.bootstrap.processAttach();
    expect(f.game.bootstrap.attachProgress()).toEqual(before);
    expect(exit.snapshot().callbackCells).toHaveLength(2);
    const replacement = new NativeMemoryAdmin(f.platform, { extensions: [nativeNpcHeapExtension] });
    expect(createBrowserGameCrtStartup(f.platform, replacement).known).toBe(false);
    expect(f.game.crt.imageStorage('scriptAdminClassName').readUnsigned(8)).toBe(0);
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
