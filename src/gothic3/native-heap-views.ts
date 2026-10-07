import type { NativeMaskedWord } from './entity-lifecycle';
import type { NativeMemoryAllocation, NativeMemoryBacking } from './native-memory-admin';

type Width = 1 | 2 | 4;
type Backing = NativeMemoryBacking | NativeMemoryAllocation;
type PointerSlot = { value: object; bytes: number[]; masks: number[] };
const pointers = new WeakMap<object, Map<number, PointerSlot>>();
const unsigned = (value: number, width: Width): void => {
  if (!Number.isInteger(value) || value < 0 || value > (width === 4 ? 0xffffffff : 2 ** (width * 8) - 1)) {
    throw new Error('Native unsigned field outside its physical width');
  }
};

/** Field views over the SAME retained heap bytes. Creating a view performs no
 * stores. Browser pointer capabilities have no fabricated x86 address: NULL
 * is DWORD0, while a non-NULL capability keeps an opaque numerical DWORD. */
export class NativeHeapObjectViews {
  readonly bytes: Uint8Array;
  readonly knownMask: Uint8Array;
  readonly view: DataView;
  private readonly pointerIdentity: object;
  private readonly pointerBegin: number;
  constructor(readonly backing: Backing, begin = 0, length = backing.bytes.length - begin) {
    if (!Number.isSafeInteger(begin) || !Number.isSafeInteger(length) || begin < 0 || length < 0 ||
        begin + length > backing.bytes.length || backing.knownMask.length !== backing.bytes.length) {
      throw new Error('Physical native object view outside retained backing');
    }
    this.bytes = backing.bytes.subarray(begin, begin + length);
    this.knownMask = backing.knownMask.subarray(begin, begin + length);
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.length);
    this.pointerIdentity = 'region' in backing ? backing.region.identity : backing.identity;
    this.pointerBegin = ('region' in backing ? backing.offset : 0) + begin;
  }
  private range(offset: number, length: number): void {
    if (this.backing.freed || ('region' in this.backing && this.backing.region.freed)) {
      throw new Error('Native field accessed after its backing was freed');
    }
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > this.bytes.length) {
      throw new Error('Native field outside its retained physical object');
    }
  }
  private requireKnown(offset: number, length: number): void {
    this.range(offset, length);
    if (this.knownMask.subarray(offset, offset + length).some(mask => mask !== 255)) {
      throw new Error('Native field contains unowned backing bits at +' + offset.toString(16));
    }
  }
  private invalidatePointers(offset: number, length: number): void {
    const slots = pointers.get(this.pointerIdentity);
    if (slots) for (const position of slots.keys()) {
      if (position < this.pointerBegin + offset + length && position + 4 > this.pointerBegin + offset) slots.delete(position);
    }
  }
  private rawUnsigned(offset: number, width: Width): number {
    this.range(offset, width);
    return width === 1 ? this.view.getUint8(offset) : width === 2 ? this.view.getUint16(offset, true) : this.view.getUint32(offset, true);
  }
  private rawWriteUnsigned(offset: number, value: number, width: Width): void {
    this.range(offset, width); unsigned(value, width); this.invalidatePointers(offset, width);
    if (width === 1) this.view.setUint8(offset, value);
    else if (width === 2) this.view.setUint16(offset, value, true);
    else this.view.setUint32(offset, value, true);
  }
  readUnsigned(offset: number, width: Width = 4): number {
    this.requireKnown(offset, width); return this.rawUnsigned(offset, width);
  }
  writeUnsigned(offset: number, value: number, width: Width = 4): void {
    this.rawWriteUnsigned(offset, value, width); this.knownMask.fill(255, offset, offset + width);
  }
  /** Allocation moves copy opaque pointer words as well as their physical bits.
   * Only complete, unchanged source slots carry capabilities. Partial words
   * remain raw masked bytes. This is not a pointer lookup from numerical bits. */
  copyAllocationBytesFrom(source: NativeHeapObjectViews, bytes: number): void {
    this.range(0, bytes); source.range(0, bytes);
    if (this.pointerIdentity === source.pointerIdentity && this.pointerBegin !== source.pointerBegin &&
        this.pointerBegin < source.pointerBegin + bytes && source.pointerBegin < this.pointerBegin + bytes) {
      throw new Error('Allocation copy requires nonoverlapping retained source and destination');
    }
    const carried = [...(pointers.get(source.pointerIdentity)?.entries() ?? [])]
      .filter(([position, slot]) => position >= source.pointerBegin && position + 4 <= source.pointerBegin + bytes &&
        slot.bytes.every((byte, i) => byte === source.bytes[position - source.pointerBegin + i]) &&
        slot.masks.every((mask, i) => mask === source.knownMask[position - source.pointerBegin + i]))
      .map(([position, slot]) => ({ offset: position - source.pointerBegin,
        value: slot.value, bytes: [...slot.bytes], masks: [...slot.masks] }));
    const data = source.bytes.slice(0, bytes), masks = source.knownMask.slice(0, bytes);
    this.invalidatePointers(0, bytes);
    this.bytes.set(data); this.knownMask.set(masks);
    if (carried.length) {
      let slots = pointers.get(this.pointerIdentity);
      if (!slots) { slots = new Map(); pointers.set(this.pointerIdentity, slots); }
      for (const slot of carried) slots.set(this.pointerBegin + slot.offset,
        { value: slot.value, bytes: slot.bytes, masks: slot.masks });
    }
  }
  readFloat(offset: number): number {
    this.requireKnown(offset, 4); return this.view.getFloat32(offset, true);
  }
  writeFloat(offset: number, value: number): void {
    this.range(offset, 4);
    if (!Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new Error('Selected finite native float32 field required');
    this.invalidatePointers(offset, 4); this.view.setFloat32(offset, value, true); this.knownMask.fill(255, offset, offset + 4);
  }
  maskedWord(offset: number, width: Width = 4): NativeMaskedWord {
    this.range(offset, width);
    const maskView = new DataView(this.knownMask.buffer, this.knownMask.byteOffset, this.knownMask.length);
    const owner = this;
    return {
      get value() { return owner.rawUnsigned(offset, width); },
      set value(value: number) { owner.rawWriteUnsigned(offset, value, width); },
      get knownMask() {
        owner.range(offset, width);
        return width === 1 ? maskView.getUint8(offset) : width === 2 ? maskView.getUint16(offset, true) : maskView.getUint32(offset, true);
      },
      set knownMask(value: number) {
        owner.range(offset, width); unsigned(value, width); owner.invalidatePointers(offset, width);
        if (width === 1) maskView.setUint8(offset, value);
        else if (width === 2) maskView.setUint16(offset, value, true);
        else maskView.setUint32(offset, value, true);
      },
    };
  }
  pointer<T extends object>(offset: number): { get(): T | null; set(value: T | null): void } {
    this.range(offset, 4);
    const position = this.pointerBegin + offset;
    return {
      get: () => {
        this.range(offset, 4);
        const slot = pointers.get(this.pointerIdentity)?.get(position);
        if (slot) {
          if (slot.bytes.some((byte, i) => byte !== this.bytes[offset + i]) || slot.masks.some((mask, i) => mask !== this.knownMask[offset + i])) {
            throw new Error('Native pointer slot backing changed outside its owned capability store');
          }
          return slot.value as T;
        }
        if (this.readUnsigned(offset) === 0) return null;
        throw new Error('Non-NULL numerical native pointer has no owned browser capability');
      },
      set: value => {
        this.range(offset, 4); this.invalidatePointers(offset, 4);
        if (value === null) { this.writeUnsigned(offset, 0); return; }
        if (typeof value !== 'object' && typeof value !== 'function') throw new Error('Actual native pointer capability required');
        this.knownMask.fill(0, offset, offset + 4);
        let slots = pointers.get(this.pointerIdentity);
        if (!slots) { slots = new Map(); pointers.set(this.pointerIdentity, slots); }
        slots.set(position, { value, bytes: [...this.bytes.subarray(offset, offset + 4)], masks: [...this.knownMask.subarray(offset, offset + 4)] });
      },
    };
  }
  propertyId(offset: number): { get(): string; set(value: string): void } {
    this.range(offset, 20);
    return {
      get: () => {
        this.requireKnown(offset, 20);
        return [...this.bytes.subarray(offset, offset + 20)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      },
      set: value => {
        this.range(offset, 20);
        if (!/^[0-9a-f]{40}$/.test(value)) throw new Error('Actual twenty native PropertyID bytes required');
        this.invalidatePointers(offset, 20);
        this.bytes.set(Uint8Array.from(value.match(/../g)!, byte => Number.parseInt(byte, 16)), offset);
        this.knownMask.fill(255, offset, offset + 20);
      },
    };
  }
  floatArray(offset: number, count: number): number[] {
    this.range(offset, count * 4);
    const values = new Array<number>(count);
    for (let index = 0; index < count; index++) Object.defineProperty(values, String(index), {
      enumerable: true, configurable: false,
      get: () => this.readFloat(offset + index * 4), set: (value: number) => this.writeFloat(offset + index * 4, value),
    });
    return values;
  }
  dwordArray(offset: number, count: number): Uint32Array {
    this.range(offset, count * 4);
    if ((this.bytes.byteOffset + offset) % 4 !== 0) throw new Error('Physical native DWORD array must be aligned');
    const values = new Uint32Array(this.bytes.buffer, this.bytes.byteOffset + offset, count);
    const owner = this;
    const proxy: Uint32Array = new Proxy(values, {
      get: (target, key) => {
        if (typeof key === 'string' && /^(?:0|[1-9][0-9]*)$/.test(key)) {
          const index = Number(key); return index < count ? this.readUnsigned(offset + index * 4) : undefined;
        }
        if (key === 'fill') return (value: number, start = 0, end = count) => {
          unsigned(value, 4);
          const first = start < 0 ? Math.max(0, count + start) : Math.min(count, start);
          const last = end < 0 ? Math.max(0, count + end) : Math.min(count, end);
          if (!Number.isInteger(first) || !Number.isInteger(last)) throw new Error('Integer native array fill range required');
          for (let i = first; i < last; i++) this.writeUnsigned(offset + i * 4, value);
          return proxy;
        };
        if (key === 'set') return (input: ArrayLike<number>, start = 0) => {
          if (!Number.isInteger(start) || start < 0 || start + input.length > count) throw new Error('Native DWORD array set outside retained storage');
          const copy = Array.from(input);
          copy.forEach((value, i) => this.writeUnsigned(offset + (start + i) * 4, value));
        };
        if (key === 'subarray') return (start = 0, end = count) => {
          const first = start < 0 ? Math.max(0, count + start) : Math.min(count, start);
          const last = end < 0 ? Math.max(0, count + end) : Math.min(count, end);
          return this.dwordArray(offset + first * 4, Math.max(0, last - first));
        };
        if (key === Symbol.iterator || key === 'values') return function* (this: unknown) {
          for (let i = 0; i < count; i++) yield owner.readUnsigned(offset + i * 4);
        };
        if (key === 'entries') return function* (this: unknown) {
          for (let i = 0; i < count; i++) yield [i, owner.readUnsigned(offset + i * 4)] as const;
        };
        if (key === 'keys') return function* (this: unknown) {
          for (let i = 0; i < count; i++) { owner.range(offset + i * 4, 4); yield i; }
        };
        if (key === 'forEach') return (callback: (value: number, index: number, array: Uint32Array) => void, thisArg?: unknown) => {
          for (let i = 0; i < count; i++) callback.call(thisArg, this.readUnsigned(offset + i * 4), i, proxy);
        };
        if (key === 'slice') return (start = 0, end = count) => Uint32Array.from([...this.dwordArray(offset, count)]).slice(start, end);
        if (key === 'at') return (index: number) => {
          const position = index < 0 ? count + index : index;
          return Number.isInteger(position) && position >= 0 && position < count ? this.readUnsigned(offset + position * 4) : undefined;
        };
        const value: unknown = Reflect.get(target, key, target);
        if (key === 'constructor') return value;
        if (typeof value === 'function') return () => { throw new Error('Unaudited native DWORD array method ' + String(key)); };
        return value;
      },
      set: (_target, key, value: unknown) => {
        if (typeof key !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(key) || Number(key) >= count || typeof value !== 'number') {
          throw new Error('Native DWORD array index outside retained storage');
        }
        this.writeUnsigned(offset + Number(key) * 4, value); return true;
      },
    });
    return proxy;
  }
}
