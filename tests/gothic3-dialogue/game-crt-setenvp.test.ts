import { describe, expect, it } from 'vitest';
import { createBrowserGameCrtPlatform } from '../../src/gothic3/browser-game-crt-platform';
import { createBrowserGameCrtStartup } from '../../src/gothic3/browser-game-crt-startup';
import { browserGameProcessInputs } from '../../src/gothic3/browser-game-process-inputs';
import { browserGameStartupIoInputs } from '../../src/gothic3/browser-game-startup-io-inputs';
import { browserGameStandardIoInputs } from '../../src/gothic3/browser-game-standard-io-inputs';
import { browserGameArgvNlsInputs } from '../../src/gothic3/browser-game-argv-nls-inputs';
import { NativeX86ThreadStack } from '../../src/gothic3/native-x86-thread-stack';
import type { NativeValue } from '../../src/gothic3/dialogue';

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
    expect(attach.setEnvpProgress?.boundary).toContain('__cinit CALL at204678f2');
    expect(attach.ioResult).toBe(0);
    expect(attach.argvResult).toBe(0);
    expect(attach.setEnvpResult).toBe(0);
    expect(attach.nextBoundary).toEqual({ name: '__cinit', address: '204678f2', target: '204665f4' });
    expect(attach.setEnvpProgress).toMatchObject({
      physicalGraphTransferred: true, envRetExecuted: true, envReturned: true,
      countingPassReturned: true, visibleCount: 1, arrayCallReturned: true,
      stringAllocationCallsReturned: 1, stringCopiesCompleted: 1, envpPublished: true,
      inputFreeReturned: true, inputReleased: true, environmentBlockCleared: true,
      terminalNullWritten: true, environmentAllocated: true, cinitArgumentPrepared: true,
      callerTestsCompleted: 1, wholeCrtTraversalCompleted: false,
    });
    const stack = retainedStack.snapshot();
    expect(stack.calls.every(call => call.returned)).toBe(true);
    expect(stack.calls.some(call => call.site === '204678f2')).toBe(false);
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
