import { describe, expect, it } from 'vitest';
import { NativeRuntimeDiagnostics, NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import type { NativeValue } from '../../src/gothic3/dialogue';
const fact = <T>(value: NativeValue<T>): T => { if (!value.known) throw new Error(value.reason); return value.value; };

describe('selected source admin platform capabilities', () => {
  it('owns actual CRT storage/masks/lifetime and rejects copied or double-freed capabilities', () => {
    const platform = new NativeRuntimePlatform();
    const backing = fact(platform.crtNew(20))!;
    expect(backing.knownMask).toEqual(new Uint8Array(20));
    backing.bytes[7] = 42; backing.knownMask[7] = 255;
    expect(platform.crtFree({ ...backing }).known).toBe(false);
    expect(platform.crtFree(backing)).toEqual({ known: true, value: undefined });
    expect(backing.freed).toBe(true);
    expect(backing.bytes[7]).toBe(42);
    expect(platform.crtFree(backing).known).toBe(false);
  });
  it('returns retained zero-filled VirtualAlloc regions and orders their real capabilities', () => {
    const platform = new NativeRuntimePlatform();
    const first = fact(platform.virtualAlloc(128, 0x103000, 4))!, second = fact(platform.virtualAlloc(128, 0x103000, 4))!;
    expect(first.knownMask.every(value => value === 255)).toBe(true);
    expect(first.bytes.every(value => value === 0)).toBe(true);
    expect(platform.compareRegions(first, second)).toEqual({ known: true, value: -1 });
    expect(platform.compareRegions(first, first)).toEqual({ known: true, value: 0 });
    expect(platform.compareRegions({ ...first }, second).known).toBe(false);
    expect(platform.crtFree(first).known).toBe(false);
  });
  it('owns section registration, entry depth and deletion', () => {
    const platform = new NativeRuntimePlatform(), owner = {};
    expect(platform.initializeCriticalSection('10189a18', owner, 1000)).toEqual({ known: true, value: 1 });
    expect(platform.enterCriticalSection('10189a18', {}).known).toBe(false);
    fact(platform.enterCriticalSection('10189a18', owner));
    const identity = platform.snapshot().sections[0]!.identity;
    expect(platform.deleteCriticalSection(identity).known).toBe(false);
    fact(platform.leaveCriticalSection('10189a18', owner));
    fact(platform.deleteCriticalSection(identity));
    expect(platform.enterCriticalSection('10189a18', owner).known).toBe(false);
    expect(platform.deleteCriticalSection(identity).known).toBe(false);
  });
  it('drains actual admitted callbacks once in reverse registration order and retains a blocked prefix', () => {
    const platform = new NativeRuntimePlatform(), seen: string[] = [];
    fact(platform.registerShutdown('100e2710', {}, () => { seen.push('memory'); return { known: true, value: undefined }; }));
    fact(platform.registerShutdown('100e2770', {}, () => { seen.push('error'); return { known: false, reason: 'Unowned deletion' }; }));
    expect(platform.dispose()).toEqual({ known: false, reason: 'Shutdown 100e2770: Unowned deletion' });
    expect(seen).toEqual(['error']);
    expect(platform.snapshot().pending.map(entry => entry.address)).toEqual(['100e2710']);
    expect(platform.dispose().known).toBe(false);
    expect(seen).toEqual(['error']);
    expect(platform.registerShutdown('100e2770', {}, () => ({ known: true, value: undefined })).known).toBe(false);
  });
  it('reads only scoped window/file registries and retains file handle closure', () => {
    const empty = new NativeRuntimeDiagnostics();
    expect(empty.findWindow(null, '[zSpy]')).toEqual({ known: true, value: null });
    expect(empty.fopen('zSpie.txt', 'r')).toEqual({ known: true, value: null });
    const window = {}, diagnostics = new NativeRuntimeDiagnostics({ windows: new Map([['[zSpy]', window]]),
      files: new Map([['zSpie.txt', new Uint8Array([1, 2])]]) });
    expect(diagnostics.findWindow(null, '[zSpy]')).toEqual({ known: true, value: window });
    const file = fact(diagnostics.fopen('zSpie.txt', 'r'))!;
    expect(diagnostics.fclose(file)).toEqual({ known: true, value: 0 });
    expect(diagnostics.fclose(file).known).toBe(false);
    expect(diagnostics.snapshot().handles).toEqual([{ path: 'zSpie.txt', closed: true }]);
  });
});
