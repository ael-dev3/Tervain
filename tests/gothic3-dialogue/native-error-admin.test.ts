import { describe, expect, it } from 'vitest';
import { NativeErrorAdminModule } from '../../src/gothic3/native-error-admin';
import { createNativeRuntimeAdminOwner, NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeValue } from '../../src/gothic3/dialogue';

const fact = <T>(value: NativeValue<T>): T => { if (!value.known) throw new Error(value.reason); return value.value; };
const word = (bytes: Uint8Array, at: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at, true);
function text(bytes: Uint8Array): string { const end = bytes.indexOf(0); return String.fromCharCode(...bytes.subarray(0, end < 0 ? bytes.length : end)); }

describe('source-owned shared ErrorAdmin', () => {
  it('executes recursive Message bootstrap, actual heap allocations and retained callback before a nonpanic read', () => {
    const owner = createNativeRuntimeAdminOwner();
    expect(owner.error.isInPanicState()).toEqual({ known: true, value: false });
    expect(owner.error.getInstance()).toEqual({ known: true, value: owner.error });
    expect(owner.message.getInstance()).toEqual({ known: true, value: owner.message });
    const snapshot = owner.error.snapshot();
    expect(snapshot.phase).toBe('ready');
    expect(snapshot.trace).toContain('error.message.bootstrap.alias');
    expect(snapshot.history?.storage.bytes.length).toBe(20);
    expect(snapshot.history?.data?.requestedBytes).toBe(12500);
    expect(snapshot.history?.data?.bytes.buffer).toBe(snapshot.history?.data?.region.bytes.buffer);
    expect(word(snapshot.history!.storage.bytes, 4)).toBe(50);
    expect(snapshot.history!.storage.knownMask.slice(0, 4)).toEqual(new Uint8Array(4));
    expect(snapshot.callbacks?.storage.bytes.length).toBe(12);
    expect(snapshot.callbacks2?.storage.bytes.length).toBe(12);
    expect(owner.error.storage.knownMask.slice(8, 32)).toEqual(new Uint8Array(24));
    expect(owner.message.snapshot().callbacks.map(record => [record.callback.address, record.userData, record.priority]))
      .toEqual([['10008c06', owner.message.spy, 1], ['10002df6', owner.error, 1]]);
    expect(owner.platform.snapshot().pending.map(entry => entry.address))
      .toEqual(['100e2710', '100e2890', '100e2830', '100e27d0', '100e2770']);
  });

  it('sets the native guard before a blocked section initialization and never replays the prefix', () => {
    const platform = new NativeRuntimePlatform();
    const owner = createNativeRuntimeAdminOwner(platform);
    const calls: string[] = [];
    const error = new NativeErrorAdminModule({ memory: owner.memory, crtNew: bytes => platform.crtNew(bytes),
      crtMalloc: bytes => platform.crtMalloc(bytes), crtFree: backing => platform.crtFree(backing),
      initializeCriticalSection: address => { calls.push(address); return { known: false, reason: 'Actual section is unavailable' }; },
      deleteCriticalSection: section => platform.deleteCriticalSection(section),
      registerShutdown: (address, owner_, callback) => platform.registerShutdown(address, owner_, callback),
      messageAdmin: () => owner.message.getInstance() });
    expect(error.isInPanicState()).toEqual({ known: false, reason: 'ErrorAdmin.InitializeCriticalSection: Actual section is unavailable' });
    expect(error.guard.uint(0)).toBe(1);
    const snapshot = error.snapshot();
    expect(snapshot.phase).toBe('blocked');
    expect(error.getInstanceForMessageBootstrap().known).toBe(false);
    expect(error.isInPanicState().known).toBe(false);
    expect(calls).toEqual(['10142a60']);
    expect(error.snapshot()).toEqual(snapshot);
  });

  it('rejects an external panic read during the permitted pointer-only recursive bootstrap', () => {
    const owner = createNativeRuntimeAdminOwner();
    const original = owner.message.getInstance.bind(owner.message);
    const seen: NativeValue<boolean>[] = [];
    owner.message.getInstance = () => { seen.push(owner.error.isInPanicState()); return original(); };
    expect(owner.error.getInstance().known).toBe(true);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(value => !value.known)).toBe(true);
    expect(owner.error.isInPanicState()).toEqual({ known: true, value: false });
  });

  it('implements the exact byte==1 panic checks with native short-circuit order', () => {
    const owner = createNativeRuntimeAdminOwner(); fact(owner.error.getInstance());
    owner.error.storage.bytes[4] = 2; owner.error.storage.bytes[5] = 2;
    expect(owner.error.isInPanicState()).toEqual({ known: true, value: false });
    owner.error.storage.bytes[4] = 1; owner.error.storage.knownMask[5] = 0;
    expect(owner.error.isInPanicState()).toEqual({ known: true, value: true });
    owner.error.storage.bytes[4] = 0;
    expect(owner.error.isInPanicState().known).toBe(false);
    owner.error.storage.knownMask[5] = 255; owner.error.storage.bytes[5] = 1;
    expect(owner.error.isInPanicState()).toEqual({ known: true, value: true });
  });

  it('executes all four exact source formats into retained CRT bytes and the physical history ring', () => {
    const owner = createNativeRuntimeAdminOwner(); fact(owner.error.getInstance());
    for (const [description, sourceFile, line, expected] of [
      [null, null, 0, 'Message '], ['Detail', null, 0, 'Message, Desc:Detail '],
      [null, 'File.cpp', 7, "Message, Z:#7 -> 'File.cpp'"],
      ['Detail', 'File.cpp', 0xffffffff, "Message, Desc:Detail, Z:#-1 -> 'File.cpp'"],
    ] as const) {
      expect(owner.message.invokeRegistered('10002df6', { type: 8, message: 'Message', description, sourceFile, line }))
        .toEqual({ known: true, value: true });
      expect(text(owner.error.pushScratch.bytes)).toBe(expected);
    }
    const history = owner.error.snapshot().history!;
    expect(word(history.storage.bytes, 12)).toBe(4);
    expect(text(history.data!.bytes.subarray(750, 1000))).toBe("Message, Desc:Detail, Z:#-1 -> 'File.cpp'");
    const mallocs = owner.platform.snapshot().allocations.filter(entry => entry.kind === 'crt-malloc');
    expect(mallocs).toHaveLength(4);
    expect(mallocs.every(entry => entry.backing.freed)).toBe(true);
    expect(text(mallocs[3]!.backing.bytes)).toBe("Message, Desc:Detail, Z:#-1 -> 'File.cpp'");
  });

  it('checks NULL/wrong callback userdata in the original order and truncates at the native NUL', () => {
    const owner = createNativeRuntimeAdminOwner();
    const args = { type: 0, message: 'A\0ignored', description: null, sourceFile: null, line: 0, priority: 1 };
    expect(owner.error.callback.invoke({ ...args, userData: null })).toEqual({ known: true, value: false });
    expect(owner.error.snapshot().phase).toBe('cold');
    expect(owner.error.callback.invoke({ ...args, userData: {} })).toEqual({ known: true, value: false });
    expect(owner.error.snapshot().phase).toBe('ready');
    expect(owner.error.callback.invoke({ ...args, userData: owner.error })).toEqual({ known: true, value: true });
    expect(text(owner.error.pushScratch.bytes)).toBe('A ');
    expect(owner.error.callback.invoke({ ...args, message: null, userData: owner.error })).toEqual({ known: true, value: false });
  });

  it('pops the oldest entry on full ring and retains exact 249-byte strncpy plus terminal zero', () => {
    const owner = createNativeRuntimeAdminOwner(); fact(owner.error.getInstance());
    for (let index = 0; index < 50; index++) fact(owner.error.addHistory('Entry' + index));
    const history = owner.error.snapshot().history!;
    expect(history.storage.bytes[16]).toBe(1);
    expect(word(history.storage.bytes, 8)).toBe(0);
    expect(word(history.storage.bytes, 12)).toBe(0);
    fact(owner.error.addHistory('x'.repeat(300)));
    expect(text(owner.error.popScratch.bytes)).toBe('Entry0');
    expect(text(owner.error.pushScratch.bytes)).toBe('x'.repeat(249));
    expect(owner.error.pushScratch.bytes[249]).toBe(0);
    expect(word(history.storage.bytes, 8)).toBe(1);
    expect(word(history.storage.bytes, 12)).toBe(1);
    expect(history.storage.bytes[16]).toBe(1);
    expect(text(history.data!.bytes.subarray(0, 250))).toBe('x'.repeat(249));
  });

  it('leaves unowned encoding explicit without an invented callback success', () => {
    const owner = createNativeRuntimeAdminOwner(); fact(owner.error.getInstance());
    const result = owner.message.invokeRegistered('10002df6', { type: 0, message: 'é', description: null, sourceFile: null, line: 0 });
    expect(result).toEqual({ known: false, reason: 'Original ErrorAdmin non-ASCII C-string encoding is unowned' });
    expect(word(owner.error.snapshot().history!.storage.bytes, 12)).toBe(0);
    expect(owner.platform.snapshot().allocations.filter(entry => entry.kind === 'crt-malloc')).toEqual([]);
  });

  it('retains the source pop/memset prefix before an unsupported strncpy encoding boundary', () => {
    const owner = createNativeRuntimeAdminOwner(); fact(owner.error.getInstance());
    for (let index = 0; index < 50; index++) fact(owner.error.addHistory('Entry' + index));
    expect(text(owner.error.pushScratch.bytes)).toBe('Entry49');
    expect(owner.error.addHistory('é')).toEqual({ known: false, reason: 'Original ErrorAdmin non-ASCII C-string encoding is unowned' });
    const history = owner.error.snapshot().history!;
    expect(text(owner.error.popScratch.bytes)).toBe('Entry0');
    expect(owner.error.pushScratch.bytes.every(value => value === 0)).toBe(true);
    expect(owner.error.pushScratch.knownMask.every(value => value === 255)).toBe(true);
    expect(word(history.storage.bytes, 8)).toBe(1);
    expect(word(history.storage.bytes, 12)).toBe(0);
    expect(history.storage.bytes[16]).toBe(0);
  });

  it('latches failed teardown after actual frees and never supplies a ready panic flag or replays cleanup', () => {
    const owner = createNativeRuntimeAdminOwner(); fact(owner.error.getInstance());
    const history = owner.error.snapshot().history!, data = history.data!;
    const original = owner.platform.crtFree.bind(owner.platform);
    let blockedCalls = 0;
    owner.platform.crtFree = backing => {
      if (backing === owner.error.snapshot().callbacks?.storage) {
        blockedCalls++; return { known: false, reason: 'Actual callback holder free is unavailable' };
      }
      return original(backing);
    };
    expect(owner.error.shutdown()).toEqual({ known: false, reason: 'Actual callback holder free is unavailable' });
    expect(data.freed).toBe(true);
    expect(history.storage.freed).toBe(true);
    expect(owner.error.snapshot().phase).toBe('blocked');
    expect(owner.error.isInPanicState().known).toBe(false);
    expect(owner.error.shutdown().known).toBe(false);
    expect(blockedCalls).toBe(1);
  });

  it('executes nonempty Error shutdown before Message shutdown and frees actual holder/history storage', () => {
    const owner = createNativeRuntimeAdminOwner(); fact(owner.error.getInstance());
    fact(owner.error.addHistory('retained'));
    const history = owner.error.snapshot().history!, data = history.data!, callbacks = owner.error.snapshot().callbacks!, callbacks2 = owner.error.snapshot().callbacks2!;
    fact(owner.dispose());
    expect(owner.platform.snapshot().executed.map(entry => entry.address))
      .toEqual(['100e2770', '100e27d0', '100e2830', '100e2890', '100e2710']);
    expect([history.storage.freed, data.freed, callbacks.storage.freed, callbacks2.storage.freed]).toEqual([true, true, true, true]);
    expect(owner.error.snapshot().phase).toBe('disposed');
    expect(owner.error.storage.uint(32)).toBe(0);
    expect(owner.error.isInPanicState().known).toBe(false);
    expect(owner.message.snapshot().holder).toBeNull();
    const before = owner.platform.snapshot().executed;
    expect(owner.dispose()).toEqual({ known: true, value: undefined });
    expect(owner.platform.snapshot().executed).toEqual(before);
  });

  it('cleans the actual registered Error owner after later Message startup blocks without exposing a ready Message getter', () => {
    const platform = new NativeRuntimePlatform();
    platform.diagnostics.fopen = () => ({ known: false, reason: 'Actual diagnostic query is unavailable' });
    const owner = createNativeRuntimeAdminOwner(platform);
    expect(owner.message.getInstance().known).toBe(false);
    expect(owner.message.snapshot().phase).toBe('blocked');
    expect(owner.error.snapshot().phase).toBe('ready');
    const history = owner.error.snapshot().history!, data = history.data!;
    expect(owner.message.snapshot().callbacks.map(record => record.callback.address)).toEqual(['10002df6', '10008c06']);
    fact(owner.dispose());
    expect(owner.error.snapshot().phase).toBe('disposed');
    expect([history.storage.freed, data.freed]).toEqual([true, true]);
    expect(owner.message.snapshot().callbacks).toEqual([]);
    expect(owner.message.getInstance().known).toBe(false);
    expect(owner.platform.snapshot().executed.map(entry => entry.address)).toEqual(['100e2890', '100e2770', '100e2710']);
  });
});
