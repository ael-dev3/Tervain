import { describe, expect, it } from 'vitest';
import { createBrowserGameCrtPlatform } from '../../src/gothic3/browser-game-crt-platform';
import { createBrowserGameCrtStartup } from '../../src/gothic3/browser-game-crt-startup';
import { browserGameProcessInputs } from '../../src/gothic3/browser-game-process-inputs';
import { browserGameStartupIoInputs } from '../../src/gothic3/browser-game-startup-io-inputs';
import { browserGameStandardIoInputs } from '../../src/gothic3/browser-game-standard-io-inputs';
import { browserGameArgvNlsInputs } from '../../src/gothic3/browser-game-argv-nls-inputs';
import { NativeX86ThreadStack } from '../../src/gothic3/native-x86-thread-stack';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeGameCrtOwner, NativeModuleCrtOwner } from '../../src/gothic3/native-engine-crt-locks';
import { NativeCrtBootstrap } from '../../src/gothic3/native-crt-bootstrap';
import { NativeGameExitTable } from '../../src/gothic3/native-game-crt-exit-table';
import type { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';

function fact<T>(value: NativeValue<T>): T {
  if (!value.known) throw new Error(value.reason);
  return value.value;
}
function startup(selected = true, free: 'success' | 'false' | 'unknown' = 'success', environment?: string | null) {
  const bytes = environment == null ? null : Array.from(environment, character => character.charCodeAt(0));
  const platform = createBrowserGameCrtPlatform({
    processInputs: environment === null ? { ...browserGameProcessInputs,
      environmentA: { kind: 'null' }, environmentW: { kind: 'null' },
    } : bytes ? { ...browserGameProcessInputs,
      environmentA: { kind: 'buffer', bytes },
      environmentW: { kind: 'buffer', bytes: bytes.flatMap(byte => [byte, 0]) },
    } : browserGameProcessInputs,
    threadStack: { reservationBytes: 4096, pageAlignment: 'virtual-page-4096' },
    startupIo: browserGameStartupIoInputs,
    standardIo: browserGameStandardIoInputs,
    argvNls: browserGameArgvNlsInputs,
    ...(selected ? { setEnvp: { physicalGameHeapCapacity: 'round-eight-unknown-padding' as const,
      heapFree: { outcome: free } } } : {}),
  });
  const stack = fact(NativeX86ThreadStack.forPlatform(platform));
  return { platform, stack, game: fact(createBrowserGameCrtStartup(platform)) };
}

describe('Game environment startup through the actual browser CRT graph', () => {
  it('copies the current environment, releases its input, and prepares the next initializer argument', () => {
    const { platform, stack: retainedStack, game } = startup();
    const attach = game.attachProgress;
    expect(attach.setEnvpProgress?.boundary).toContain('not yet admitted at 20469f3a');
    expect(attach.ioResult).toBe(0);
    expect(attach.argvResult).toBe(0);
    expect(attach.setEnvpResult).toBe(0);
    expect(attach.nextBoundary).toEqual({ name: 'indirectSourceCall', address: '20466452', target: '20469f3a' });
    expect(attach.setEnvpProgress).toMatchObject({
      physicalGraphTransferred: true, envRetExecuted: true, envReturned: true,
      countingPassReturned: true, visibleCount: 1, arrayCallReturned: true,
      stringAllocationCallsReturned: 1, stringCopiesCompleted: 1, envpPublished: true,
      inputFreeReturned: true, inputReleased: true, environmentBlockCleared: true,
      terminalNullWritten: true, environmentAllocated: true, cinitArgumentPrepared: true,
      callerTestsCompleted: 1, wholeCrtTraversalCompleted: false,
      cinitCalled: true, mathProtectionCheckReturned: true,
      mathInitializerReturned: true, floatConversionInitializerReturned: true,
      floatPointerInitializerReturned: true,
      exitTableInitializerReturned: true,
    });
    const stack = retainedStack.snapshot();
    expect(stack.calls.filter(call => !call.returned).map(call => call.site)).toEqual(['204678f2', '20466626']);
    expect(stack.calls.filter(call => call.site === '20466452')).toHaveLength(1);
    expect(stack.calls.find(call => call.site === '20466452')).toMatchObject({ returned: true });
    const exitTable = NativeGameExitTable.forCrt(game.crt);
    const exitState = exitTable.snapshot();
    expect(exitState.tableAllocations).toHaveLength(1);
    const exitBacking = exitState.tableAllocations[0]!;
    expect(exitBacking.bytes.length).toBe(128);
    expect([...exitBacking.bytes]).toEqual(Array(128).fill(0));
    expect([...exitBacking.knownMask]).toEqual(Array(128).fill(255));
    const begin = game.crt.imageStorage('crtExitBegin').pointer<object>(0).get();
    const end = game.crt.imageStorage('crtExitEnd').pointer<object>(0).get();
    expect(begin).toBe(end);
    const exitPointer = fact(game.crt.decodePointer(begin)) as { fields: NativeHeapObjectViews; offset: number };
    expect(exitPointer.offset).toBe(0);
    expect(exitPointer.fields.backing).toBe(exitBacking);
    expect(exitState.callbackCells).toEqual([]);
    expect(stack.calls.find(call => call.site === '20466602')).toMatchObject({ returned: true });
    expect(stack.calls.find(call => call.site === '204738ef')).toMatchObject({ returned: true });
    expect(stack.calls.find(call => call.site === '20473909')).toMatchObject({ returned: true });
    for (const site of ['20466610', '20463917', '2046391c', '204696fb', '2046970b', '20469717']) {
      expect(stack.calls.find(call => call.site === site)).toMatchObject({ returned: true });
    }
    expect(stack.calls.some(call => call.site === '2046392d')).toBe(false);
    expect(stack.x87Status).toMatchObject({ word: { value: 0, knownMask: 0x80ff } });
    const conversionTable = fact(NativeModuleCrtOwner.canonicalImageForOwner(game.crt, 'cinitFloatPointerTable'));
    const encoded = Array.from({ length: 10 }, (_, index) => conversionTable.pointer<object>(index * 4).get());
    const decoded = encoded.map(value => fact(game.crt.decodePointer(value)) as { owner: object; originalCodeAddress: number });
    expect(decoded.map(value => value.originalCodeAddress)).toEqual([
      0x20469651, 0x20468cf6, 0x20468cb4, 0x20468ce8, 0x20468c5e,
      0x20469651, 0x204695cb, 0x20468c74, 0x20468bde, 0x20468b6d,
    ]);
    expect(decoded.every(value => value.owner === game.crt.identity)).toBe(true);
    expect(encoded[0]).toBe(encoded[5]);
    expect(decoded[0]).toBe(decoded[5]);
    expect([...conversionTable.knownMask]).toEqual(Array(40).fill(0));
    expect(stack.calls.filter(call => call.site === '2046967e')).toHaveLength(10);
    expect(stack.calls.filter(call => call.site === '2046967e').every(call => call.returned)).toBe(true);
    expect(stack.calls.find(call => call.site === '20466617')).toMatchObject({ returned: true });
    expect(fact(NativeModuleCrtOwner.canonicalImageForOwner(game.crt, 'cinitDivideErratum')).readUnsigned(0)).toBe(0);
    expect(stack.setEnvpCalls.map(call => ({ site: call.site, returned: call.returned, released: call.released })))
      .toEqual([
        { site: '20477ce8', returned: true, released: false },
        { site: '20477ce8', returned: true, released: false },
        { site: '20467cd2', returned: true, released: true },
      ]);
    const string = game.crt.snapshot().allocations.find(backing => !backing.freed &&
      backing.bytes.length === 24 && backing.bytes[0] === 'G'.charCodeAt(0));
    expect(string).toBeDefined();
    expect([...string!.bytes.subarray(0, 18)])
      .toEqual(Array.from('GOTHIC3_BROWSER=1\0', character => character.charCodeAt(0)));
    expect([...string!.knownMask.subarray(0, 18)]).toEqual(Array(18).fill(255));
    expect([...string!.knownMask.subarray(18)]).toEqual(Array(6).fill(0));
    expect(game.crt.snapshot().allocations.some(backing => backing.freed && backing.bytes.length === 24)).toBe(true);
    expect(fact(game.bootstrap.thread.getPtdNoExit())!.bytes.length).toBe(532);
    const before = game.bootstrap.attachProgress();
    expect(createBrowserGameCrtStartup(platform)).toEqual({ known: true, value: game });
    game.bootstrap.processAttach();
    expect(game.bootstrap.attachProgress()).toEqual(before);
    expect(exitTable.snapshot().tableAllocations).toHaveLength(1);
    expect(game.crt.imageStorage('crtExitBegin').pointer<object>(0).get()).toBe(begin);
  });

  it('preserves the earlier argv frontier when environment startup is not selected', () => {
    const { game } = startup(false);
    expect(game.attachProgress.argvResult).toBe(0);
    expect(game.attachProgress.setEnvpAdapterEntered).toBe(false);
    expect(game.attachProgress.setEnvpResult).toBeNull();
    expect(game.attachProgress.nextBoundary?.address).toBe('204678e7');
  });

  it.each([
    { environment: '\0\0', strings: [] },
    { environment: '=C:=C:\\work\0FIRST=1\0SECOND=two\0\0', strings: ['FIRST=1', 'SECOND=two'] },
  ])('derives the table and copies from current entries: $strings', ({ environment, strings }) => {
    const { game, stack } = startup(true, 'success', environment);
    expect(game.attachProgress.setEnvpResult).toBe(0);
    expect(game.attachProgress.setEnvpProgress).toMatchObject({
      visibleCount: strings.length, stringCopiesCompleted: strings.length,
      stringAllocationCallsReturned: strings.length, inputReleased: true,
      terminalNullWritten: true, cinitArgumentPrepared: true,
    });
    const imports = stack.snapshot().setEnvpCalls;
    expect(imports.filter(call => call.site === '20477ce8' && call.returned)).toHaveLength(strings.length + 1);
    for (const string of strings) {
      const expected = Array.from(string + '\0', character => character.charCodeAt(0));
      expect(game.crt.snapshot().allocations.some(backing => !backing.freed &&
        expected.every((byte, index) => backing.bytes[index] === byte && backing.knownMask[index] === 255))).toBe(true);
    }
  });

  it('returns minus one for a NULL input and reaches the original failure cleanup boundary', () => {
    const { game, stack } = startup(true, 'success', null);
    expect(game.attachProgress.setEnvpResult).toBe(-1);
    expect(game.attachProgress.nextBoundary).toEqual({ name: '__ioterm', address: '20467907', target: '2047453f' });
    expect(game.attachProgress.setEnvpProgress).toMatchObject({
      envRetExecuted: true, envReturned: true, inputReleased: false,
      envpPublished: false, cinitArgumentPrepared: false,
    });
    expect(stack.snapshot().setEnvpCalls).toEqual([]);
  });

  it.each(['false', 'unknown'] as const)('retains an interrupted %s free without clearing its input or fabricating a return', free => {
    const { game, stack } = startup(true, free);
    const attach = game.attachProgress;
    expect(attach.setEnvpResult).toBeNull();
    expect(attach.setEnvpProgress).toMatchObject({
      physicalGraphTransferred: true, stringCopiesCompleted: 1,
      envpPublished: true, inputReleased: false, environmentBlockCleared: false,
      envReturned: false, cinitArgumentPrepared: false,
    });
    expect(attach.nextBoundary?.address).toBe(free === 'false' ? '20467cdc' : '20467cd2');
    expect(stack.snapshot().setEnvpCalls.at(-1)).toMatchObject({
      site: '20467cd2', called: true, returned: free === 'false', released: false,
    });
    const before = stack.snapshot();
    game.bootstrap.processAttach();
    expect(stack.snapshot()).toEqual(before);
  });
});

describe('Original Game cinit PE protection check', () => {
  it('rejects a foreign cached Game pointer codec before invoking it', () => {
    const { game } = startup();
    const ptd = fact(game.bootstrap.thread.getPtdNoExit())!;
    let invoked = false;
    ptd.pointer<object>(0x1f8).set(Object.freeze({ name: 'EncodePointer', invoke: () => {
      invoked = true; return { known: true, value: Object.freeze({}) };
    } }));
    const result = game.crt.encodePointer(Object.freeze({}));
    expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('Actual same-platform pointer codec required');
    expect(invoked).toBe(false);
  });
  function attachWithImageChange(change: (headers: NativeHeapObjectViews, crt: NativeGameCrtOwner) => void) {
    const platform = createBrowserGameCrtPlatform({
      processInputs: browserGameProcessInputs,
      threadStack: { reservationBytes: 4096, pageAlignment: 'virtual-page-4096' },
      startupIo: browserGameStartupIoInputs, standardIo: browserGameStandardIoInputs,
      argvNls: browserGameArgvNlsInputs,
      setEnvp: { physicalGameHeapCapacity: 'round-eight-unknown-padding', heapFree: { outcome: 'success' } },
    });
    let bootstrap: NativeCrtBootstrap;
    const crt = NativeGameCrtOwner.forPlatform({ platform,
      errnoSlot: () => bootstrap.thread.errnoSlot(), getLastError: () => platform.getWin32LastError() });
    bootstrap = NativeCrtBootstrap.forCrt(crt);
    const stack = fact(NativeX86ThreadStack.forPlatform(platform));
    const headers = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'cinitPEHeaders'));
    change(headers, crt);
    NativeCrtBootstrap.processAttachForCrt(bootstrap, crt);
    return { bootstrap, headers, crt, stack };
  }

  it('uses the current MZ signature and follows the original zero-result branch', () => {
    const { bootstrap, headers, stack } = attachWithImageChange(fields => fields.writeUnsigned(0, 0, 2));
    expect(headers.view.getUint16(0, true)).toBe(0);
    expect(bootstrap.attachProgress().nextBoundary).toEqual({ name: 'indirectSourceCall', address: '20466452', target: '20469f3a' });
    expect(stack.snapshot().calls.find(call => call.site === '20466602')).toMatchObject({ returned: true });
    expect(stack.snapshot().calls.some(call => call.site === '20473909')).toBe(false);
    expect(stack.snapshot().calls.some(call => call.site === '20466610')).toBe(false);
  });

  it('reads the actual section characteristics instead of assuming readonly', () => {
    const { bootstrap, headers, stack } = attachWithImageChange(fields => {
      const nt = fields.view.getUint32(0x3c, true);
      const sections = nt + 24 + fields.view.getUint16(nt + 20, true);
      const count = fields.view.getUint16(nt + 6, true);
      let found = false;
      for (let index = 0; index < count; index++) {
        const section = sections + index * 40, begin = fields.view.getUint32(section + 12, true);
        const size = fields.view.getUint32(section + 8, true);
        if (0x6b638c >= begin && 0x6b638c < begin + size) {
          fields.writeUnsigned(section + 36, (fields.view.getUint32(section + 36, true) | 0x80000000) >>> 0);
          found = true;
        }
      }
      expect(found).toBe(true);
    });
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('20466452');
    expect(stack.snapshot().calls.find(call => call.site === '20473909')).toMatchObject({ returned: true });
    expect(headers.bytes.length).toBe(672);
  });

  it('stops on unknown signature bytes without reseeding the header or consuming its call', () => {
    const { bootstrap, headers, stack } = attachWithImageChange(fields => { fields.knownMask[0] = 0; });
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('20473839');
    expect(headers.knownMask[0]).toBe(0);
    expect(stack.snapshot().calls.find(call => call.site === '204738ef')).toMatchObject({ returned: false });
    const before = stack.snapshot();
    bootstrap.processAttach();
    expect(stack.snapshot()).toEqual(before);
  });

  it('rejects a changed math callback target before pushing its return or overwriting conversion pointers', () => {
    const { bootstrap, crt, stack } = attachWithImageChange((_headers, owner) => {
      fact(NativeModuleCrtOwner.canonicalImageForOwner(owner, 'cinitMathCallback')).writeUnsigned(0, 0x20463918);
    });
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('20466610');
    expect(bootstrap.attachProgress().setEnvpProgress?.boundary).toContain('Actual current original Game math callback target required');
    expect(stack.snapshot().calls.some(call => call.site === '20466610')).toBe(false);
    const table = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'cinitFloatPointerTable'));
    expect(Array.from({ length: 10 }, (_, index) => table.readUnsigned(index * 4))).toEqual(Array(10).fill(0x2047df3f));
    expect(fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'cinitMathCallback')).readUnsigned(0)).toBe(0x20463918);
  });

  it('keeps a partially unknown callback target unknown and leaves the math call unexecuted', () => {
    const { bootstrap, crt, stack } = attachWithImageChange((_headers, owner) => {
      fact(NativeModuleCrtOwner.canonicalImageForOwner(owner, 'cinitMathCallback')).knownMask[0] = 0;
    });
    // Known nonzero upper bytes prove the NULL check; the indirect target remains unknown.
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('20466610');
    expect(stack.snapshot().calls.some(call => call.site === '20466610')).toBe(false);
    expect(fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'cinitMathCallback')).knownMask[0]).toBe(0);
  });

  it('retains the first encoded slot when a later original conversion pointer was changed', () => {
    const { bootstrap, crt, stack } = attachWithImageChange((headers, owner) => {
      headers.writeUnsigned(0, 0, 2);
      fact(NativeModuleCrtOwner.canonicalImageForOwner(owner, 'cinitFloatPointerTable')).writeUnsigned(4, 0x20468cf6);
    });
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('2046967e');
    expect(bootstrap.attachProgress().setEnvpProgress?.boundary).toContain('Original current Game conversion code pointer required');
    const table = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'cinitFloatPointerTable'));
    expect(fact(crt.decodePointer(table.pointer<object>(0).get()))).toMatchObject({ originalCodeAddress: 0x2047df3f });
    expect(table.readUnsigned(4)).toBe(0x20468cf6);
    expect(stack.snapshot().calls.filter(call => call.site === '2046967e')).toHaveLength(1);
    expect(stack.snapshot().calls.find(call => call.site === '20466617')).toMatchObject({ returned: false });
  });

  it('does not encode unknown conversion bytes or replay the earlier completed slot', () => {
    const { bootstrap, crt, stack } = attachWithImageChange((headers, owner) => {
      headers.writeUnsigned(0, 0, 2);
      fact(NativeModuleCrtOwner.canonicalImageForOwner(owner, 'cinitFloatPointerTable')).knownMask[4] = 0;
    });
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('2046967e');
    const table = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'cinitFloatPointerTable'));
    const first = table.pointer<object>(0).get();
    expect(first).not.toBeNull();
    expect(table.knownMask[4]).toBe(0);
    expect(stack.snapshot().calls.filter(call => call.site === '2046967e')).toHaveLength(1);
    bootstrap.processAttach();
    expect(table.pointer<object>(0).get()).toBe(first);
    expect(stack.snapshot().calls.filter(call => call.site === '2046967e')).toHaveLength(1);
  });

  it('rejects a changed first C initializer before allocating the exit table', () => {
    const { bootstrap, crt, stack } = attachWithImageChange((_headers, owner) => {
      fact(NativeModuleCrtOwner.canonicalImageForOwner(owner, 'cinitCInitializerTable')).writeUnsigned(65 * 4, 0x20469f3a);
    });
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('20466452');
    expect(bootstrap.attachProgress().setEnvpProgress?.boundary).toContain('Original current Game C initializer slot target required');
    expect(stack.snapshot().calls.some(call => call.site === '20466452')).toBe(false);
    expect(NativeGameExitTable.forCrt(crt).snapshot().tableAllocations).toEqual([]);
  });

  it('stops at unknown leading null bytes before reaching any C initializer', () => {
    const { bootstrap, crt, stack } = attachWithImageChange((_headers, owner) => {
      fact(NativeModuleCrtOwner.canonicalImageForOwner(owner, 'cinitCInitializerTable')).knownMask[0] = 0;
    });
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('20466450');
    expect(stack.snapshot().calls.some(call => call.site === '20466452')).toBe(false);
    expect(NativeGameExitTable.forCrt(crt).snapshot().tableAllocations).toEqual([]);
    bootstrap.processAttach();
    expect(fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'cinitCInitializerTable')).knownMask[0]).toBe(0);
  });

  it('retains the first callback allocation when the second callback target was changed', () => {
    const { bootstrap, crt, stack } = attachWithImageChange((_headers, owner) => {
      fact(NativeModuleCrtOwner.canonicalImageForOwner(owner, 'cinitCInitializerTable')).writeUnsigned(66 * 4, 0x20463763);
    });
    expect(bootstrap.attachProgress().nextBoundary?.address).toBe('20466452');
    expect(bootstrap.attachProgress().setEnvpProgress?.boundary).toContain('Original current Game C initializer slot target required');
    const table = NativeGameExitTable.forCrt(crt);
    expect(table.snapshot().tableAllocations).toHaveLength(1);
    expect(stack.snapshot().calls.filter(call => call.site === '20466452')).toHaveLength(1);
    const begin = crt.imageStorage('crtExitBegin').pointer<object>(0).get();
    bootstrap.processAttach();
    expect(table.snapshot().tableAllocations).toHaveLength(1);
    expect(crt.imageStorage('crtExitBegin').pointer<object>(0).get()).toBe(begin);
  });
});
