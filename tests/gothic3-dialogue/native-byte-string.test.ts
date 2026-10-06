import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import { copyNativeBytesScalar, findNativeSpace } from '../../src/gothic3/native-byte-string';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeMemoryBacking } from '../../src/gothic3/native-memory-admin';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';

const fact = <T>(result: NativeValue<T>): T => { if (!result.known) throw new Error(result.reason); return result.value; };
function fixture(bytes = 64) {
  const platform = new NativeRuntimePlatform(), heap = fact(platform.createWin32Heap({}, 0, 4096, 0))!;
  const backing = fact(platform.win32HeapAlloc(heap, 0, bytes))!;
  backing.knownMask.fill(255);
  return { platform, heap, backing };
}
class ObservedViews extends NativeHeapObjectViews {
  constructor(backing: NativeMemoryBacking, private readonly label: string, private readonly accesses: string[], begin = 0,
    length = backing.bytes.length - begin) { super(backing, begin, length); }
  override readUnsigned(offset: number, width: 1 | 2 | 4 = 4): number {
    this.accesses.push(`${this.label}:${offset}:${width}`); return super.readUnsigned(offset, width);
  }
  override maskedWord(offset: number, width: 1 | 2 | 4 = 4) {
    this.accesses.push(`${this.label}:${offset}:${width}`); return super.maskedWord(offset, width);
  }
}

describe('source-owned UnMangle space search', () => {
  it('reads and rereads the candidate DWORD instead of scanning a terminated snapshot', () => {
    const { platform, backing } = fixture(19), accesses: string[] = [];
    backing.bytes.set(new TextEncoder().encode('class eCSceneAdmin\0'));
    const fields = new ObservedViews(backing, 'read', accesses);
    expect(fact(findNativeSpace(platform, { fields, offset: 0 }))).toEqual({ fields, offset: 5 });
    expect(accesses).toEqual(['read:0:4', 'read:4:4', 'read:4:4']);
  });
  it('peels bytes according to the owned native pointer residue before DWORD reads', () => {
    const { platform, backing } = fixture(12), accesses: string[] = [];
    backing.bytes.set(new TextEncoder().encode('xabc foo\0'));
    const fields = new ObservedViews(backing, 'read', accesses);
    expect(fact(findNativeSpace(platform, { fields, offset: 1 }))).toEqual({ fields, offset: 4 });
    expect(accesses).toEqual(['read:1:1', 'read:2:1', 'read:3:1', 'read:4:4', 'read:4:4']);
  });
  it('uses the reread candidate bytes if the backing changes after detection', () => {
    const { platform, backing } = fixture(4);
    backing.bytes.set([0x20, 65, 66, 0]);
    const fields = new NativeHeapObjectViews(backing), read = fields.readUnsigned.bind(fields);
    let reads = 0;
    fields.readUnsigned = (offset, width) => {
      const result = read(offset, width);
      if (++reads === 1) backing.bytes.set([65, 0x20, 66, 0]);
      return result;
    };
    expect(fact(findNativeSpace(platform, { fields, offset: 0 }))).toEqual({ fields, offset: 1 });
    expect(reads).toBe(2);
  });
  it('checks NUL before a later space in the same candidate DWORD', () => {
    const { platform, backing } = fixture(4);
    backing.bytes.set([0, 0x20, 0x80, 255]);
    expect(fact(findNativeSpace(platform, { fields: new NativeHeapObjectViews(backing), offset: 0 }))).toBeNull();
  });
  it('preserves DWORD overreads beyond NUL and rejects unretained or unknown padding', () => {
    const short = fixture(1), accesses: string[] = [];
    const fields = new ObservedViews(short.backing, 'read', accesses);
    expect(findNativeSpace(short.platform, { fields, offset: 0 }).known).toBe(false);
    expect(accesses).toEqual(['read:0:4']);
    const masked = fixture(4); masked.backing.knownMask[3] = 0;
    expect(findNativeSpace(masked.platform, { fields: new NativeHeapObjectViews(masked.backing), offset: 0 }).known).toBe(false);
  });
  it('handles high-bit byte lanes using the original wrapped DWORD detector', () => {
    const { platform, backing } = fixture(8);
    for (const byte of [1, 0x7e, 0x7f, 0x80, 0x81, 0xfe, 0xff]) {
      backing.bytes.set([byte, byte, byte, byte, byte, 0x20, 0, byte]);
      const fields = new NativeHeapObjectViews(backing);
      expect(fact(findNativeSpace(platform, { fields, offset: 0 }))).toEqual({ fields, offset: 5 });
      backing.bytes[5] = byte;
      expect(fact(findNativeSpace(platform, { fields, offset: 0 }))).toBeNull();
    }
  });
});

describe('source-ordered scalar memcpy', () => {
  it('copies an aligned twelve-byte name as ascending DWORD load/store pairs', () => {
    const { platform, backing } = fixture(32), accesses: string[] = [];
    backing.bytes.set(new TextEncoder().encode('eCSceneAdmin'));
    const input = new ObservedViews(backing, 'load', accesses, 0, 12);
    const destination = new ObservedViews(backing, 'store', accesses, 16, 12);
    expect(copyNativeBytesScalar(platform, { fields: destination, offset: 0 }, { fields: input, offset: 0 }, 12).known).toBe(true);
    expect(accesses).toEqual(['load:0:4', 'store:0:4', 'load:4:4', 'store:4:4', 'load:8:4', 'store:8:4']);
    expect([...destination.bytes]).toEqual([...input.bytes]);
  });
  it('copies source masks per unit without converting unknown characters to known bytes', () => {
    const { platform, backing } = fixture(32);
    backing.bytes.set([1, 2, 3, 4, 5, 6, 7, 8]); backing.knownMask[5] = 0x7f;
    const input = { fields: new NativeHeapObjectViews(backing, 0, 8), offset: 0 };
    const destination = { fields: new NativeHeapObjectViews(backing, 16, 8), offset: 0 };
    fact(copyNativeBytesScalar(platform, destination, input, 8));
    expect([...destination.fields.bytes]).toEqual([...input.fields.bytes]);
    expect([...destination.fields.knownMask]).toEqual([...input.fields.knownMask]);
    expect(destination.fields.knownMask[5]).toBe(0x7f);
  });
  it('retains the completed DWORD prefix when the next source load is outside its view', () => {
    const { platform, backing } = fixture(32), accesses: string[] = [];
    backing.bytes.set([1, 2, 3, 4]);
    const input = new ObservedViews(backing, 'load', accesses, 0, 4);
    const destination = new ObservedViews(backing, 'store', accesses, 16, 12);
    expect(copyNativeBytesScalar(platform, { fields: destination, offset: 0 }, { fields: input, offset: 0 }, 12).known).toBe(false);
    expect([...destination.bytes.subarray(0, 4)]).toEqual([1, 2, 3, 4]);
    expect(accesses).toEqual(['load:0:4', 'store:0:4', 'load:4:4']);
  });
  it('loads the next source DWORD before failing its destination store', () => {
    const { platform, backing } = fixture(32), accesses: string[] = [];
    backing.bytes.set([1, 2, 3, 4, 5, 6, 7, 8]);
    const input = new ObservedViews(backing, 'load', accesses, 0, 12);
    const destination = new ObservedViews(backing, 'store', accesses, 16, 4);
    expect(copyNativeBytesScalar(platform, { fields: destination, offset: 0 }, { fields: input, offset: 0 }, 12).known).toBe(false);
    expect(accesses).toEqual(['load:0:4', 'store:0:4', 'load:4:4', 'store:4:4']);
  });
  it('checks source lifetime at its load and destination lifetime at its later store', () => {
    const platform = new NativeRuntimePlatform(), heap = fact(platform.createWin32Heap({}, 0, 4096, 0))!;
    const inputBacking = fact(platform.win32HeapAlloc(heap, 0, 4))!, targetBacking = fact(platform.win32HeapAlloc(heap, 0, 4))!;
    const accesses: string[] = [], input = new ObservedViews(inputBacking, 'load', accesses), target = new ObservedViews(targetBacking, 'store', accesses);
    fact(platform.win32HeapFree(heap, 0, targetBacking));
    expect(copyNativeBytesScalar(platform, { fields: target, offset: 0 }, { fields: input, offset: 0 }, 4).known).toBe(false);
    expect(accesses).toEqual(['load:0:4', 'store:0:4']);
    accesses.length = 0;
    fact(platform.win32HeapFree(heap, 0, inputBacking));
    expect(copyNativeBytesScalar(platform, { fields: target, offset: 0 }, { fields: input, offset: 0 }, 4).known).toBe(false);
    expect(accesses).toEqual(['load:0:4']);
  });
  it('peels forward bytes before ascending DWORDs and byte remainder', () => {
    const { platform, backing } = fixture(48), accesses: string[] = [];
    backing.bytes.set(Array.from({ length: 12 }, (_, i) => i + 1));
    const input = new ObservedViews(backing, 'load', accesses, 0, 12), target = new ObservedViews(backing, 'store', accesses, 17, 12);
    fact(copyNativeBytesScalar(platform, { fields: target, offset: 0 }, { fields: input, offset: 0 }, 12));
    expect(accesses).toEqual(['load:0:1', 'store:0:1', 'load:1:1', 'store:1:1', 'load:2:1', 'store:2:1',
      'load:3:4', 'store:3:4', 'load:7:4', 'store:7:4', 'load:11:1', 'store:11:1']);
    expect([...target.bytes]).toEqual([...input.bytes]);
  });
  it('copies overlapping ranges backward with source-ordered trailing peel and units', () => {
    const { platform, backing } = fixture(32), accesses: string[] = [];
    backing.bytes.set(Array.from({ length: 32 }, (_, i) => i));
    const expected = backing.bytes.slice(); expected.copyWithin(1, 0, 12);
    const input = new ObservedViews(backing, 'load', accesses), target = new ObservedViews(backing, 'store', accesses);
    fact(copyNativeBytesScalar(platform, { fields: target, offset: 1 }, { fields: input, offset: 0 }, 12));
    expect(backing.bytes).toEqual(expected);
    expect(accesses).toEqual(['load:11:1', 'store:12:1', 'load:7:4', 'store:8:4', 'load:3:4', 'store:4:4',
      'load:2:1', 'store:3:1', 'load:1:1', 'store:2:1', 'load:0:1', 'store:1:1']);
  });
  it('retains a descending DWORD suffix when the next source load fails', () => {
    const { platform, backing } = fixture(32), accesses: string[] = [];
    backing.bytes.set(Array.from({ length: 32 }, (_, i) => i));
    const input = new ObservedViews(backing, 'load', accesses), target = new ObservedViews(backing, 'store', accesses);
    const read = input.maskedWord.bind(input);
    input.maskedWord = (offset, width) => { if (offset === 4) { accesses.push(`load:${offset}:${width}`); throw new Error('Second descending source load unowned'); } return read(offset, width); };
    expect(copyNativeBytesScalar(platform, { fields: target, offset: 4 }, { fields: input, offset: 0 }, 12).known).toBe(false);
    expect([...backing.bytes.subarray(12, 16)]).toEqual([8, 9, 10, 11]);
    expect(accesses).toEqual(['load:8:4', 'store:12:4', 'load:4:4']);
  });
  it('gates forward CPU dispatch before peels while backward sizes bypass it', () => {
    const { platform, backing } = fixture(768), accesses: string[] = [];
    backing.bytes.set(Array.from({ length: 768 }, (_, i) => i & 255));
    const input = new ObservedViews(backing, 'load', accesses), target = new ObservedViews(backing, 'store', accesses);
    expect(copyNativeBytesScalar(platform, { fields: target, offset: 401 }, { fields: input, offset: 0 }, 256)).toEqual({ known: false,
      reason: 'memcpy100a7a28 requires actual SharedBase CRT CPU global102f854c and vector capability' });
    expect(accesses).toEqual([]);
    const expected = backing.bytes.slice(); expected.copyWithin(1, 0, 260);
    fact(copyNativeBytesScalar(platform, { fields: target, offset: 1 }, { fields: input, offset: 0 }, 260));
    expect(backing.bytes).toEqual(expected);
    expect(accesses.slice(0, 4)).toEqual(['load:259:1', 'store:260:1', 'load:255:4', 'store:256:4']);
  });
  it('performs no memory accesses for zero bytes even after both lifetimes ended', () => {
    const { platform, heap, backing } = fixture(4), accesses: string[] = [];
    const fields = new ObservedViews(backing, 'read', accesses);
    fact(platform.win32HeapFree(heap, 0, backing));
    fact(copyNativeBytesScalar(platform, { fields, offset: 0 }, { fields, offset: 0 }, 0));
    expect(accesses).toEqual([]);
  });
});
