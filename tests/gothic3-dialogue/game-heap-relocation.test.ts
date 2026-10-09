import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';

function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fixture() {
  const platform = new NativeRuntimePlatform();
  const heap = fact(platform.createWin32Heap({}, 0, 4096, 0))!;
  const backing = fact(platform.win32HeapAlloc(heap, 0, 12))!;
  const fields = new NativeHeapObjectViews(backing);
  return { platform, heap, backing, fields };
}
describe('explicit virtual heap relocation', () => {
  it('moves callback capabilities and masks without initializing the extension', () => {
    const f = fixture(), callback = Object.freeze({});
    f.fields.pointer(0).set(callback); f.fields.writeUnsigned(4, 0x12345678);
    f.backing.bytes[8] = 0xab;
    const masks = f.backing.knownMask.slice(), bytes = f.backing.bytes.slice();
    const moved = fact(f.platform.win32HeapReAlloc(f.heap, 0, {fields:f.fields,offset:0}, 24,
      'move-preserve-unknown-extension'))!;
    const fields = new NativeHeapObjectViews(moved);
    expect(fields.pointer(0).get()).toBe(callback);
    expect(moved.bytes.slice(0,12)).toEqual(bytes);
    expect(moved.knownMask.slice(0,12)).toEqual(masks);
    expect([...moved.knownMask.slice(12)]).toEqual(Array(12).fill(0));
    expect(f.backing.freed).toBe(true);
    expect(() => f.fields.pointer(0).get()).toThrow('freed');
    expect(fact(f.platform.win32HeapSize(f.heap,0,{fields,offset:0}))).toBe(24);
  });
  it('rejects interior, foreign and freed allocations before changing storage', () => {
    const f = fixture(), foreign = fact(f.platform.createWin32Heap({},0,4096,0))!;
    for (const [heap, offset] of [[f.heap,4],[foreign,0]] as const)
      expect(f.platform.win32HeapReAlloc(heap,0,{fields:f.fields,offset},24,
        'move-preserve-unknown-extension').known).toBe(false);
    expect(f.backing.freed).toBe(false);
    fact(f.platform.win32HeapFree(f.heap,0,f.backing));
    expect(f.platform.win32HeapReAlloc(f.heap,0,{fields:f.fields,offset:0},24,
      'move-preserve-unknown-extension').known).toBe(false);
  });
  it('shrinks without carrying a partial pointer capability', () => {
    const f = fixture(); f.fields.pointer(8).set({});
    const moved = fact(f.platform.win32HeapReAlloc(f.heap,0,{fields:f.fields,offset:0},10,
      'move-preserve-unknown-extension'))!;
    expect(moved.bytes.length).toBe(10);
    expect(moved.knownMask[8]).toBe(0);
    expect(moved.knownMask[9]).toBe(0);
  });
  it('keeps the original allocation live when growth exceeds the selected profile', () => {
    const platform = new NativeRuntimePlatform({maximumAllocationBytes:16});
    const heap = fact(platform.createWin32Heap({},0,4096,0))!;
    const backing = fact(platform.win32HeapAlloc(heap,0,12))!;
    const fields = new NativeHeapObjectViews(backing), callback = {};
    fields.pointer(0).set(callback);
    const result = platform.win32HeapReAlloc(heap,0,{fields,offset:0},24,
      'move-preserve-unknown-extension');
    expect(result).toMatchObject({known:false,reason:expect.stringContaining('bounded platform profile')});
    expect(backing.freed).toBe(false);
    expect(fields.pointer(0).get()).toBe(callback);
    expect(fact(platform.win32HeapSize(heap,0,{fields,offset:0}))).toBe(12);
  });
});
