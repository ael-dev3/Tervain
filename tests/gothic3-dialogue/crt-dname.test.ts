import { describe, expect, it } from 'vitest';
import rules from '../../assets/gothic3/crt-undname/runtime-rules.json';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeCrtDNameFactory, NativeCrtReplicator, NativeCrtScratchArena } from '../../src/gothic3/native-crt-dname';
import type { NativeCrtBytePointer, NativeCrtScratchHost } from '../../src/gothic3/native-crt-dname';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
function backing(bytes: number, mask = 0): NativeMemoryBacking {
  return { identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes).fill(mask), freed: false };
}
function fields(bytes: number): NativeHeapObjectViews { return new NativeHeapObjectViews(backing(bytes)); }
function input(bytes: string | number[]): NativeCrtBytePointer {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : Uint8Array.from(bytes);
  const result = fields(raw.length); result.bytes.set(raw); result.knownMask.fill(255); return { fields: result, offset: 0 };
}
function text(pointer: NativeCrtBytePointer): string {
  const result: number[] = [];
  for (let index = pointer.offset; index < pointer.fields.bytes.length; index++) {
    const byte = pointer.fields.readUnsigned(index, 1); if (!byte) return String.fromCharCode(...result); result.push(byte);
  }
  throw new Error('NUL required');
}
/** Explicit external CRT callbacks exercise the physical graph independently.
 * CRT initialization, its OS heap and the full demangler are tested separately. */
function fixture(options: { malloc?: (bytes: number, count: number) => NativeValue<NativeMemoryBacking | null>;
  free?: (allocation: NativeMemoryBacking) => NativeValue<void>; checkpoint?: (operation: string) => void } = {}) {
  const allocations: NativeMemoryBacking[] = [], calls: string[] = []; let count = 0;
  const host: NativeCrtScratchHost = {
    crtMalloc: bytes => {
      calls.push('malloc:' + bytes); count++;
      const result = options.malloc?.(bytes, count) ?? known(backing(bytes));
      if (result.known && result.value) allocations.push(result.value); return result;
    },
    crtFree: allocation => { calls.push('free:' + allocation.bytes.length);
      if (options.free) return options.free(allocation); allocation.freed = true; return known(undefined); },
  };
  const globals = fields(60);
  globals.pointer<object>(0).set(host.crtMalloc); globals.pointer<object>(4).set(host.crtFree);
  // ___unDName's recovered order is remaining, first, tail.
  globals.writeUnsigned(16, 0); globals.pointer<NativeMemoryBacking>(8).set(null); globals.pointer<NativeMemoryBacking>(12).set(null);
  const arena = new NativeCrtScratchArena(host, { fields: globals, checkpoint: options.checkpoint });
  const factory = new NativeCrtDNameFactory(arena);
  return { host, globals, arena, factory, allocations, calls };
}

describe('Engine CRT retained scratch arena and DName graph', () => {
  it('uses the real downward arena slices and independent24B output for the selected152B graph', () => {
    const f = fixture(), stack = fields(120);
    const first = new NativeCrtReplicator(f.factory, new NativeHeapObjectViews(stack.backing, 0, 60));
    const second = new NativeCrtReplicator(f.factory, new NativeHeapObjectViews(stack.backing, 60, 60));
    value(first.construct()); value(second.construct());
    const keyword = input([...Uint8Array.from(rules.constBytes.classKeyword.raw.match(/../g)!, hex => parseInt(hex, 16))]);
    const left = value(f.factory.fromBytes(keyword));
    const right = value(f.factory.fromBytes(input('eCSceneAdmin\0')));
    value(second.append(right));
    const combined = value(f.factory.plus(left, right));
    expect(combined.length()).toBe(18); expect(combined.getLastChar()).toBe(0x6e);
    const output = value(f.arena.allocate(combined.length() + 1, true))!;
    const pointer = value(combined.writeString({ fields: output.fields, offset: 0 }, 19))!;
    expect(text(pointer)).toBe('class eCSceneAdmin');
    expect(output.backing).not.toBe(f.arena.snapshot().blocks[0]);
    expect(f.calls).toEqual(['malloc:4104', 'malloc:24']);
    expect(f.globals.readUnsigned(16)).toBe(3944);
    const slices = f.arena.snapshot().slices.slice(0, -1);
    expect(slices.map(slice => slice.requestedBytes)).toEqual([16, 16, 16, 16, 16, 6, 16, 12, 8, 12, 8]);
    expect(slices.map(slice => slice.offset)).toEqual([4084, 4068, 4052, 4036, 4020, 4012, 3996, 3980, 3972, 3956, 3948]);
    expect(slices.reduce((sum, slice) => sum + slice.roundedBytes, 0)).toBe(152);
    expect(combined.head!.kind).toBe('indirect'); expect(combined.head!.next).toBe(right.head);
    expect(combined.head!.fields.pointer<object>(8).get()).not.toBe(left);
    expect(value(second.get(0)).head).toBe(right.head); expect(second.fields.readUnsigned(0)).toBe(0);
    value(f.arena.cleanup());
    expect(f.globals.pointer<object>(8).get()).toBe(null); expect(f.globals.pointer<object>(12).get()).toBe(null);
    expect(f.globals.readUnsigned(16)).toBe(3944); expect(output.backing.freed).toBe(false);
    expect(text(pointer)).toBe('class eCSceneAdmin'); expect(() => combined.length()).toThrow('freed');
    expect(() => slices[0]!.fields.readUnsigned(0)).toThrow('freed');
  });

  it('rounds zero and wrapped requests exactly while rejecting oversized scratch requests', () => {
    const f = fixture(); const zero = value(f.arena.allocate(0))!;
    expect(zero.roundedBytes).toBe(8); expect(zero.offset).toBe(4092);
    expect(value(f.arena.allocate(4097))).toBe(null); expect(f.calls).toEqual(['malloc:4104']);
    expect(value(f.arena.allocate(0xffffffff))!.roundedBytes).toBe(8);
    expect(value(f.arena.allocate(0, true))!.roundedBytes).toBe(0); expect(f.calls.at(-1)).toBe('malloc:0');
  });

  it('keeps a known failed block allocation retryable without changing manager fields', () => {
    const f = fixture({ malloc: (bytes, count) => count === 1 ? known(null) : known(backing(bytes)) });
    expect(value(f.arena.allocate(16))).toBe(null);
    expect(f.globals.pointer<object>(8).get()).toBe(null); expect(f.globals.readUnsigned(16)).toBe(0);
    const slice = value(f.arena.allocate(16))!; expect(slice.offset).toBe(4084);
    expect(f.calls).toEqual(['malloc:4104', 'malloc:4104']);
  });

  it('follows block links, unlinks before free, sets final tail NULL and retains remaining', () => {
    let f: ReturnType<typeof fixture>; const freed: NativeMemoryBacking[] = [];
    f = fixture({ free: block => {
      expect(f.globals.pointer<NativeMemoryBacking>(12).get()).toBe(block);
      expect(f.globals.pointer<NativeMemoryBacking>(8).get()).not.toBe(block);
      freed.push(block); block.freed = true; return known(undefined);
    } });
    value(f.arena.allocate(4096)); value(f.arena.allocate(8));
    const blocks = f.arena.snapshot().blocks;
    expect(new NativeHeapObjectViews(blocks[0]!).pointer<object>(0).get()).toBe(blocks[1]);
    value(f.arena.cleanup()); expect(freed).toEqual(blocks);
    expect(f.globals.pointer<object>(12).get()).toBe(null); expect(f.globals.readUnsigned(16)).toBe(4088);
  });

  it('does not unlink blocks when the physical free callback is NULL', () => {
    const f = fixture(); value(f.arena.allocate(8)); f.globals.pointer<object>(4).set(null);
    const block = f.globals.pointer<object>(8).get(); value(f.arena.cleanup());
    expect(f.globals.pointer<object>(8).get()).toBe(block); expect(f.globals.pointer<object>(12).get()).toBe(block);
    expect(f.allocations[0]!.freed).toBe(false);
  });

  it('stops an unknown free at the source unlink prefix and does not replay it', () => {
    const f = fixture({ free: () => ({ known: false, reason: 'unowned free continuation' }) });
    value(f.arena.allocate(4096)); value(f.arena.allocate(8)); const blocks = f.arena.snapshot().blocks;
    const result = f.arena.cleanup(); expect(result.known).toBe(false);
    expect(f.globals.pointer<object>(8).get()).toBe(blocks[1]); expect(f.globals.pointer<object>(12).get()).toBe(blocks[0]);
    expect(f.calls.filter(call => call.startsWith('free'))).toHaveLength(1);
    expect(f.arena.cleanup()).toEqual(result); expect(f.calls.filter(call => call.startsWith('free'))).toHaveLength(1);
  });

  it('retains an allocation callback effect but publishes no block after reentry', () => {
    let f: ReturnType<typeof fixture>;
    f = fixture({ malloc: bytes => {
      expect(f.arena.allocate(8).known).toBe(false); return known(backing(bytes));
    } });
    expect(f.arena.allocate(16).known).toBe(false); expect(f.arena.snapshot().allocations).toHaveLength(1);
    expect(f.arena.snapshot().blocks).toHaveLength(0); expect(f.globals.pointer<object>(8).get()).toBe(null);
    expect(f.globals.readUnsigned(16)).toBe(0); expect(f.calls).toEqual(['malloc:4104']);
  });

  it('stops graph reentry before post-allocation node stores', () => {
    let f: ReturnType<typeof fixture>;
    f = fixture({ malloc: bytes => {
      expect(f.factory.fromBytes(input('nested\0')).known).toBe(false); return known(backing(bytes));
    } });
    expect(f.factory.fromBytes(input('outer\0')).known).toBe(false);
    const slice = f.arena.snapshot().slices[0]!;
    expect(slice.fields.knownMask.every(mask => mask === 0)).toBe(true);
    expect(f.globals.readUnsigned(16)).toBe(4080); // Arena return prefix happened; graph guard prevented constructor.
  });

  it('preserves masked high bits and the different copy/assignment flag masks', () => {
    const f = fixture(), fromFields = fields(8), copyFields = fields(8), assignFields = fields(8);
    fromFields.writeUnsigned(4, 0xabcd5fff); const from = value(f.factory.fromChar(65, fromFields));
    from.fields.writeUnsigned(4, 0xabcd5ab0);
    copyFields.writeUnsigned(4, 0x12345fff); const copy = value(f.factory.copy(from, copyFields));
    expect(copy.fields.readUnsigned(4)).toBe(0x12345ab0);
    assignFields.writeUnsigned(4, 0x98765000); const assigned = value(f.factory.empty(assignFields));
    assigned.fields.writeUnsigned(4, 0x98765700); value(f.factory.assign(assigned, from));
    expect(assigned.fields.readUnsigned(4)).toBe(0x98765fb0);
    const unknownHigh = value(f.factory.fromChar(66));
    expect(unknownHigh.fields.maskedWord(4).knownMask).toBe(0xfff);
    expect(() => unknownHigh.fields.readUnsigned(4)).toThrow('unowned');
    expect(unknownHigh.status).toBe(0); expect(unknownHigh.head!.fields.knownMask.slice(9).every(mask => mask === 0)).toBe(true);
  });

  it('keeps nonzero text length with a NULL payload when the payload allocation fails', () => {
    const f = fixture({ malloc: (bytes, count) => count === 2 ? known(null) : known(backing(bytes)) });
    value(f.arena.allocate(4000)); const record = value(f.factory.fromBytes(input('x'.repeat(100) + '\0')));
    expect(record.status).toBe(0); expect(record.head!.fields.readUnsigned(12)).toBe(100);
    expect(record.head!.fields.pointer<object>(8).get()).toBe(null); expect(record.length()).toBe(100);
    expect(() => record.getLastChar()).toThrow('NULL payload');
    const output = fields(104); value(record.writeString({ fields: output, offset: 0 }, 101));
    expect(output.readUnsigned(0, 1)).toBe(0); expect(output.knownMask[1]).toBe(0);
    expect(value(f.arena.allocate(8))).not.toBe(null); // Failed allocation did not poison the manager.
  });

  it('leaves Replicator count unchanged on record allocation failure and permits a retry', () => {
    const f = fixture({ malloc: (bytes, count) => count === 2 ? known(null) : known(backing(bytes)) });
    const rep = new NativeCrtReplicator(f.factory, fields(60)); value(rep.construct());
    const record = value(f.factory.fromBytes(input('name\0'))); value(f.arena.allocate(4040));
    expect(f.globals.readUnsigned(16)).toBe(0); value(rep.append(record)); expect(rep.fields.readUnsigned(0)).toBe(0xffffffff);
    value(rep.append(record)); expect(rep.fields.readUnsigned(0)).toBe(0); expect(value(rep.get(0)).head).toBe(record.head);
    expect(value(rep.get(1)).status).toBe(1); expect(value(rep.get(10)).status).toBe(3);
  });

  it('returns an indirect clone with NULL reference when its second allocation fails', () => {
    const f = fixture({ malloc: (bytes, count) => count === 2 ? known(null) : known(backing(bytes)) });
    const left = value(f.factory.fromChar(65)), right = value(f.factory.fromChar(66)); value(f.arena.allocate(4048));
    const result = value(f.factory.plus(left, right));
    expect(result.head!.kind).toBe('indirect'); expect(result.head!.fields.pointer<object>(8).get()).toBe(null);
    expect(result.head!.next).toBe(right.head); expect(result.status).toBe(0); expect(result.length()).toBe(1);
    const output = fields(8); expect(text(value(result.writeString({ fields: output, offset: 0 }, 2))!)).toBe('B');
  });

  it('uses actual status nodes, truncated text, and source validity/last-character rules', () => {
    const f = fixture(); const record = value(f.factory.status(2));
    expect(record.status).toBe(0); expect(record.isValid()).toBe(true); expect(record.length()).toBe(4);
    expect(record.getLastChar()).toBe(32); const output = fields(8);
    expect(text(value(record.writeString({ fields: output, offset: 0 }, 5))!)).toBe(' ?? ');
    value(f.factory.assignStatus(record, 3)); expect(record.isEmpty()).toBe(true); expect(record.status).toBe(3);
    value(f.factory.assignStatus(record, 1)); expect(record.status).toBe(3);
    expect(value(f.factory.fromPointer(record)).length()).toBe(0);
  });

  it('writes each physical graph node and the terminator before a later unowned pointer stops traversal', () => {
    const f = fixture(); const record = value(f.factory.fromChar(65));
    const node = record.head!; node.fields.writeUnsigned(4, 0x1234); const output = fields(8);
    const result = record.writeString({ fields: output, offset: 0 }, 7); expect(result.known).toBe(false);
    expect(output.readUnsigned(0, 1)).toBe(65); expect(output.knownMask[1]).toBe(0);
  });

  it('rejects forged node virtuals and cycles without flattening them into JavaScript strings', () => {
    const f = fixture(); const record = value(f.factory.fromChar(65)); record.head!.fields.writeUnsigned(0, 1);
    expect(() => record.length()).toThrow('virtual table');
    const g = fixture(), cyclic = value(g.factory.fromChar(66)); cyclic.head!.fields.pointer<object>(4).set(cyclic.head);
    expect(() => cyclic.length()).toThrow('Cyclic');
  });

  it('retains cursor advancement and validates identifier bytes from the delimited constructor', () => {
    const f = fixture(); let pointer: NativeCrtBytePointer | null = input('name@tail\0');
    const cursor = { get: () => pointer, set: (next: NativeCrtBytePointer | null) => { pointer = next; } };
    const record = value(f.factory.fromDelimited(cursor, 64, () => 0x2800));
    expect(record.length()).toBe(4); expect(record.status).toBe(0); expect(pointer!.offset).toBe(5);
    const g = fixture(); let invalid: NativeCrtBytePointer | null = input('ab!rest\0');
    const bad = value(g.factory.fromDelimited({ get: () => invalid, set: next => { invalid = next; } }, 64, () => 0));
    expect(bad.status).toBe(1); expect(bad.head).toBe(null); expect(invalid!.offset).toBe(2);
    expect(g.arena.snapshot().allocations).toHaveLength(0);
  });

  it('permits source high-byte identifiers and flags, preserving truncation at the actual NUL', () => {
    for (const [bytes, flags, length, status] of [
      [[0x80, 0xfe, 64, 0], 0, 2, 0], [[255, 64, 0], 0, 0, 1],
      [[255, 64, 0], 0x10000, 1, 0], [[65, 66, 0], 0, 2, 2], [[0], 0, 0, 2], [[64, 0], 0, 0, 0],
    ] as const) {
      const f = fixture(); let pointer: NativeCrtBytePointer | null = input([...bytes]);
      const record = value(f.factory.fromDelimited({ get: () => pointer, set: next => { pointer = next; } }, 64, () => flags));
      expect(record.length()).toBe(length); expect(record.status).toBe(status);
    }
  });

  it('does not prefill payload padding or destination bytes beyond the native copied prefix', () => {
    const f = fixture(); const record = value(f.factory.fromBytes(input('abc\0'))), payload = record.head!.fields.pointer<{ fields: NativeHeapObjectViews }>(8).get()!;
    expect([...payload.fields.knownMask]).toEqual([255, 255, 255, 0, 0, 0, 0, 0]);
    const output = fields(8); value(record.writeString({ fields: output, offset: 0 }, 2));
    expect([...output.bytes.slice(0, 3)]).toEqual([97, 98, 0]); expect(output.knownMask[3]).toBe(0);
  });

  it('assigns text through the source mask and doPchar rather than rebuilding an occupied record', () => {
    const f = fixture(); const destination = value(f.factory.empty());
    destination.fields.writeUnsigned(4, 0xabcd5ff0);
    value(f.factory.assignText(destination, input('text\0')));
    expect(destination.fields.readUnsigned(4)).toBe(0xabcd5700); expect(destination.length()).toBe(4);
    const allocations = f.arena.snapshot().slices.length;
    value(f.factory.assignText(destination, input('replacement\0')));
    expect(destination.head).toBe(null); expect(destination.status).toBe(3);
    expect(f.arena.snapshot().slices).toHaveLength(allocations);
  });

  it('does not dispatch a node virtual when zero remaining bytes makes the source write only NUL', () => {
    const f = fixture(); const record = value(f.factory.fromChar(65)); record.head!.fields.writeUnsigned(0, 1);
    const destination = fields(8); const result = record.writeString({ fields: destination, offset: 0 }, 0);
    expect(result.known).toBe(true); expect(destination.readUnsigned(0, 1)).toBe(0);
  });

  it('retains the free callback lifetime effect and unlinked prefix when cleanup reenters', () => {
    let f: ReturnType<typeof fixture>;
    f = fixture({ free: block => {
      expect(f.arena.cleanup().known).toBe(false); block.freed = true; return known(undefined);
    } });
    value(f.arena.allocate(4096)); value(f.arena.allocate(8)); const blocks = f.arena.snapshot().blocks;
    expect(f.arena.cleanup().known).toBe(false); expect(blocks[0]!.freed).toBe(true); expect(blocks[1]!.freed).toBe(false);
    expect(f.globals.pointer<object>(8).get()).toBe(blocks[1]); expect(f.globals.pointer<object>(12).get()).toBe(blocks[0]);
    expect(f.calls.filter(call => call.startsWith('free'))).toHaveLength(1);
  });

  it('leaves the graph constructor status prefix and arena fields at an unknown allocation boundary', () => {
    const f = fixture({ malloc: () => ({ known: false, reason: 'CRT malloc branch is unowned' }) }), storage = fields(8);
    const result = f.factory.status(1, storage); expect(result.known).toBe(false);
    expect(storage.maskedWord(4).knownMask).toBe(15); expect(storage.maskedWord(4).value & 15).toBe(1);
    expect(storage.knownMask.slice(0, 4).every(mask => mask === 0)).toBe(true);
    expect(f.globals.readUnsigned(16)).toBe(0); expect(f.globals.pointer<object>(8).get()).toBe(null);
    expect(f.factory.status(1).known).toBe(false); expect(f.calls).toEqual(['malloc:4104']);
  });

  it('continues after an owned void free returns without ending a failed HeapFree lifetime', () => {
    const f = fixture({ free: () => known(undefined) });
    value(f.arena.allocate(4096)); value(f.arena.allocate(8)); value(f.arena.cleanup());
    expect(f.arena.snapshot().blocks.every(block => !block.freed)).toBe(true);
    expect(f.calls.filter(call => call.startsWith('free'))).toHaveLength(2);
    expect(f.globals.pointer<object>(8).get()).toBe(null); expect(f.globals.pointer<object>(12).get()).toBe(null);
    expect(f.globals.readUnsigned(16)).toBe(4088);
  });
});
