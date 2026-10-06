import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeMemoryAdmin, nativeNpcHeapExtension, nativeSceneStartupHeapExtension } from '../../src/gothic3/native-memory-admin';
import type { NativeMemoryAllocation } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';

function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function fixture(text = 'eCSceneAdmin') {
  const platform = new NativeRuntimePlatform();
  const memory = new NativeMemoryAdmin(platform, { extensions: [nativeNpcHeapExtension, nativeSceneStartupHeapExtension] });
  const heap = value(platform.createWin32Heap({}, 1, 4096, 0))!;
  const source = value(platform.win32HeapAlloc(heap, 0, text.length + 1))!;
  const sourceFields = new NativeHeapObjectViews(source);
  for (let at = 0; at < text.length; at++) sourceFields.writeUnsigned(at, text.charCodeAt(at), 1);
  sourceFields.writeUnsigned(text.length, 0, 1);
  const slot = new NativeHeapObjectViews({ identity: {}, bytes: Uint8Array.from([0x92, 0xab, 0xcd, 0xef]),
    knownMask: Uint8Array.from([255, 0, 255, 0]), freed: false });
  const name = NativeHeapCString.beginTextConstruction(memory, slot);
  return { platform, memory, source, sourceFields, slot, name, input: { fields: sourceFields, offset: 0 } };
}

describe('original fresh CString text constructor', () => {
  it('never treats a pending NULL slot as a completed empty assignment source, including during allocation', () => {
    const f = fixture(); f.slot.writeUnsigned(0, 0);
    const destination = new NativeHeapCString(f.memory), callbackDestination = new NativeHeapCString(f.memory);
    expect(destination.assign(f.name).known).toBe(false);
    expect(destination.slot.readUnsigned(0)).toBe(0); expect(f.memory.snapshot().trace).toEqual([]);
    const malloc = f.memory.malloc.bind(f.memory);
    f.memory.malloc = bytes => { expect(callbackDestination.assign(f.name).known).toBe(false); return malloc(bytes); };
    value(f.name.constructText(f.input)); expect(value(f.name.text())).toBe('eCSceneAdmin');
    expect(callbackDestination.slot.readUnsigned(0)).toBe(0);
  });

  it('performs no destination read/NULL store before allocation, then owns the actual holder and stale destruction slot', () => {
    const f = fixture(), malloc = f.memory.malloc.bind(f.memory);
    const before = [...f.slot.bytes], masks = [...f.slot.knownMask];
    expect(f.name.snapshot()).toMatchObject({ construction: 'pending', pointerReadable: false, data: null });
    expect(f.name.text().known).toBe(false);
    f.memory.malloc = bytes => {
      expect([...f.slot.bytes]).toEqual(before); expect([...f.slot.knownMask]).toEqual(masks);
      expect(f.name.snapshot().pointerReadable).toBe(false); return malloc(bytes);
    };
    value(f.name.constructText(f.input));
    expect(value(f.name.text())).toBe('eCSceneAdmin');
    const snapshot = f.name.snapshot(), holder = snapshot.allocation!, fields = new NativeHeapObjectViews(holder);
    expect(snapshot.construction).toBe('complete'); expect(snapshot.pointerReadable).toBe(true);
    expect(holder.requestedBytes).toBe(21); expect(holder.capacity).toBe(24);
    expect(fields.readUnsigned(0)).toBe(12); expect(fields.readUnsigned(4, 2)).toBe(1);
    expect(fields.readUnsigned(20, 1)).toBe(0);
    expect(snapshot.trace.some(item => /default-constructor|set-text|realloc|release/.test(item))).toBe(false);
    const pointerBytes = [...f.slot.bytes], pointerMasks = [...f.slot.knownMask];
    value(f.name.destroy()); expect(holder.freed).toBe(true);
    expect([...f.slot.bytes]).toEqual(pointerBytes); expect([...f.slot.knownMask]).toEqual(pointerMasks);
    expect(f.name.snapshot().data?.allocation).toBe(holder);
  });

  it.each(['NULL', 'empty'])('stores exactly NULL for %s input without heap services', kind => {
    const f = fixture(''); value(f.name.constructText(kind === 'NULL' ? null : f.input));
    expect(f.slot.readUnsigned(0)).toBe(0); expect([...f.slot.knownMask]).toEqual([255, 255, 255, 255]);
    expect(f.memory.snapshot().trace).toEqual([]); expect(f.name.snapshot().allocation).toBe(null);
    expect(value(f.name.text())).toBe('');
  });

  it('an unreadable strlen byte retains the initial slot and never reaches MemoryAdmin', () => {
    const f = fixture(); f.source.knownMask[3] = 0;
    const bytes = [...f.slot.bytes], masks = [...f.slot.knownMask];
    const result = f.name.constructText(f.input); expect(result.known).toBe(false);
    expect([...f.slot.bytes]).toEqual(bytes); expect([...f.slot.knownMask]).toEqual(masks);
    expect(f.memory.snapshot().trace).toEqual([]); expect(f.name.snapshot().construction).toBe('failed');
    expect(f.name.constructText(f.input)).toEqual(result);
  });

  it.each(['instance', 'malloc', 'NULL'])('retains the slot across %s failure and never replays construction', mode => {
    const f = fixture(); const before = [...f.slot.bytes], masks = [...f.slot.knownMask]; let calls = 0;
    if (mode === 'instance') f.memory.getInstance = () => { calls++; return { known: false, reason: 'instance partial' }; };
    else f.memory.malloc = () => { calls++; return mode === 'NULL' ? { known: true, value: null } : { known: false, reason: 'malloc partial' }; };
    const result = f.name.constructText(f.input); expect(result.known).toBe(false);
    expect([...f.slot.bytes]).toEqual(before); expect([...f.slot.knownMask]).toEqual(masks);
    expect(f.name.snapshot().constructionAllocation).toBe(null);
    expect(f.name.constructText(f.input)).toEqual(result); expect(calls).toBe(1);
  });

  it('stores the holder length/refcount before a receiver destroyed during Malloc, without copying or terminator storage', () => {
    const f = fixture(), malloc = f.memory.malloc.bind(f.memory); let holder: NativeMemoryAllocation | null = null;
    f.memory.malloc = bytes => {
      const result = malloc(bytes); holder = value(result);
      holder!.bytes.fill(0x6c); holder!.knownMask.fill(0);
      f.slot.backing.freed = true; return result;
    };
    expect(f.name.constructText(f.input).known).toBe(false);
    const fields = new NativeHeapObjectViews(holder!);
    expect(fields.readUnsigned(0)).toBe(12); expect(fields.readUnsigned(4, 2)).toBe(1);
    expect(holder!.bytes[20]).toBe(0x6c); expect(holder!.knownMask[20]).toBe(0);
    expect([...holder!.bytes.subarray(6, 8)]).toEqual([0x6c, 0x6c]);
    expect([...holder!.knownMask.subarray(6, 8)]).toEqual([0, 0]);
    expect(f.name.snapshot().pointerReadable).toBe(false);
    expect(f.name.snapshot().constructionAllocation).toBe(holder);
  });

  it('stops at the first holder store if Malloc returns an already destroyed backing', () => {
    const f = fixture(), malloc = f.memory.malloc.bind(f.memory), before = [...f.slot.bytes];
    f.memory.malloc = bytes => { const result = malloc(bytes); value(result)!.freed = true; return result; };
    expect(f.name.constructText(f.input).known).toBe(false);
    expect([...f.slot.bytes]).toEqual(before);
    expect(f.name.snapshot().constructionAllocation?.knownMask[0]).toBe(255); // original zero-filled pool remains untouched.
  });

  it('copies changed source bytes using the length measured before Malloc', () => {
    const f = fixture(), malloc = f.memory.malloc.bind(f.memory);
    f.memory.malloc = bytes => { f.sourceFields.writeUnsigned(0, 0, 1); f.sourceFields.writeUnsigned(1, 0x5a, 1); return malloc(bytes); };
    value(f.name.constructText(f.input));
    const holder = f.name.snapshot().allocation!;
    expect(new NativeHeapObjectViews(holder).readUnsigned(0)).toBe(12);
    expect([...holder.bytes.subarray(8, 10)]).toEqual([0, 0x5a]);
    expect(holder.bytes[20]).toBe(0); expect(f.name.text().known).toBe(false);
  });

  it('copies unknown masks after allocation without inventing known text or changing the untouched header bytes', () => {
    const f = fixture(), malloc = f.memory.malloc.bind(f.memory);
    f.memory.malloc = bytes => {
      const result = malloc(bytes), holder = value(result)!;
      holder.bytes[6] = 0xa7; holder.bytes[7] = 0xe2; holder.knownMask[6] = 0; holder.knownMask[7] = 0x0f;
      f.source.knownMask[5] = 0x03; return result;
    };
    value(f.name.constructText(f.input)); const holder = f.name.snapshot().allocation!;
    expect(holder.knownMask[13]).toBe(0x03); expect(f.name.text().known).toBe(false);
    expect([...holder.bytes.subarray(6, 8)]).toEqual([0xa7, 0xe2]);
    expect([...holder.knownMask.subarray(6, 8)]).toEqual([0, 0x0f]);
    expect(f.name.snapshot().construction).toBe('complete');
  });

  it('retains allocation/pointer/terminator if source lifetime ends during allocation, before the first copy load', () => {
    const f = fixture(), malloc = f.memory.malloc.bind(f.memory);
    f.memory.malloc = bytes => { const result = malloc(bytes); f.source.freed = true; return result; };
    const result = f.name.constructText(f.input); expect(result.known).toBe(false);
    const holder = f.name.snapshot().allocation!;
    expect(new NativeHeapObjectViews(holder).readUnsigned(0)).toBe(12);
    expect(holder.bytes[20]).toBe(0); expect(holder.bytes.subarray(8, 20).every(byte => byte === 0)).toBe(true);
    expect(f.name.snapshot().construction).toBe('failed'); expect(f.name.constructText(f.input)).toEqual(result);
  });

  it('retains the first complete DWORD copy if the following source load fails', () => {
    const f = fixture(), malloc = f.memory.malloc.bind(f.memory);
    const read = f.sourceFields.maskedWord.bind(f.sourceFields);
    f.memory.malloc = bytes => {
      f.sourceFields.maskedWord = (offset, width = 4) => {
        if (offset === 4) throw new Error('second DWORD unavailable'); return read(offset, width);
      };
      return malloc(bytes);
    };
    const result = f.name.constructText(f.input); expect(result.known).toBe(false);
    const holder = f.name.snapshot().allocation!;
    expect([...holder.bytes.subarray(8, 12)]).toEqual([...f.source.bytes.subarray(0, 4)]);
    expect(holder.bytes.subarray(12, 20).every(byte => byte === 0)).toBe(true);
    expect(f.name.snapshot().construction).toBe('failed'); expect(f.name.constructText(f.input)).toEqual(result);
  });

  it('keeps an unknown geometry boundary after Alloc rather than replacing its copy with a byte snapshot', () => {
    const f = fixture(); f.platform.resolveNativePointer = () => ({ known: false, reason: 'geometry unavailable' });
    const result = f.name.constructText(f.input); expect(result.known).toBe(false);
    expect(f.name.snapshot().allocation?.requestedBytes).toBe(21);
    expect(f.name.snapshot().trace).not.toContain('cstring-text-constructor-copy:100135f0');
    expect(f.name.constructText(f.input)).toEqual(result);
  });

  it('stops after the lower allocation prefix when the same constructor reenters', () => {
    const f = fixture(), malloc = f.memory.malloc.bind(f.memory); let nested: NativeValue<void> | null = null;
    f.memory.malloc = bytes => { nested = f.name.constructText(f.input); return malloc(bytes); };
    const before = [...f.slot.bytes], result = f.name.constructText(f.input);
    expect(result.known).toBe(false); expect(nested).toMatchObject({ known: false });
    expect([...f.slot.bytes]).toEqual(before); expect(f.name.snapshot().construction).toBe('failed');
    expect(f.name.constructText(f.input)).toEqual(result);
  });
});
