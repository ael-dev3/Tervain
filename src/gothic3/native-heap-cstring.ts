import rules from '../../assets/gothic3/npc-heap/runtime-rules.json';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin, NativeMemoryAllocation } from './native-memory-admin';

type CStringData = { readonly allocation: NativeMemoryAllocation; readonly characterOffset: 8 };
const dataOwners = new WeakMap<object, NativeMemoryAdmin>();
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const source = rules as unknown as { schema: string; inputs: { SharedBase: string };
  methods: Record<string, { entry: string; body: string }>; constBytes: { emptyCStringText: { address: string; raw: string } } };
const assertSource = () => {
  const methods = { cstringDefaultConstructor: '10012d20', cstringAlloc: '10013240', cstringRealloc: '10013e70',
    cstringSetText: '10014560', cstringSetShared: '10014640', cstringAssign: '10015430',
    cstringRelease: '10013700', cstringDestructor: '10012250', cstringClear: '100149b0',
    cstringIsEmpty: '100131f0', cstringGetText: '10013210', cstringHash: '10087ad0' };
  if (source.schema !== 'gothic3-npc-heap-rules-v1' || source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      Object.entries(methods).some(([name, body]) => source.methods[name]?.body !== body) ||
      source.constBytes.emptyCStringText.address !== '100e5e3c' || source.constBytes.emptyCStringText.raw !== '00') throw new Error('Original CString source receipt differs');
};

/** Original bCString state over an actual four-byte object slot. Character
 * holders are MemoryAdmin allocations with an eight-byte prefix. Browser text
 * is produced only by reading owned bytes; it never replaces native ownership. */
export class NativeHeapCString {
  readonly slot: NativeHeapObjectViews;
  private destroyed = false;
  private blocked: string | null = null;
  private readonly trace: string[] = [];
  constructor(private readonly memory: NativeMemoryAdmin, slot?: NativeHeapObjectViews) {
    assertSource();
    this.slot = slot ?? new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4), freed: false });
    if (this.slot.bytes.length !== 4) throw new Error('Actual four-byte bCString object slot required');
    this.slot.pointer<CStringData>(0).set(null);
    this.trace.push('cstring-default-constructor:10012d20');
  }
  private execute<T>(body: () => NativeValue<T>): NativeValue<T> {
    if (this.blocked) return unknown(this.blocked);
    if (this.destroyed) return unknown('CString object lifetime has ended');
    try {
      const result = body();
      if (!result.known) { this.blocked = result.reason; this.trace.push('blocked:' + result.reason); }
      return result;
    } catch (error) {
      this.blocked = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.blocked); return unknown(this.blocked);
    }
  }
  private data(): CStringData | null {
    const value = this.slot.pointer<CStringData>(0).get();
    if (value && (value.characterOffset !== 8 || dataOwners.get(value) !== this.memory || value.allocation.freed || value.allocation.region.freed)) throw new Error('CString data pointer has no live same-heap holder capability');
    return value;
  }
  private fields(data: CStringData): NativeHeapObjectViews { return new NativeHeapObjectViews(data.allocation); }
  private length(data: CStringData): number {
    const length = this.fields(data).readUnsigned(0) | 0;
    if (length < 0 || length + 9 > data.allocation.capacity) throw new Error('CString negative/static or out-of-holder length is outside the admitted profile');
    return length;
  }
  private terminator(data: CStringData, length: number) {
    this.fields(data).writeUnsigned(8 + length, 0, 1);
  }
  private decrement(data: CStringData): NativeValue<void> {
    const fields = this.fields(data), references = (fields.readUnsigned(4, 2) - 1) & 0xffff;
    fields.writeUnsigned(4, references, 2); this.trace.push(`cstring-decrement:${references}`);
    if (references === 0) {
      const instance = this.memory.getInstance(); if (!instance.known) return instance;
      const freed = this.memory.free(data.allocation); if (!freed.known) return freed;
      this.trace.push('cstring-free-holder');
    }
    return known(undefined);
  }
  private releaseCurrent(): NativeValue<void> {
    const data = this.data();
    if (data) {
      const released = this.decrement(data); if (!released.known) return released;
      this.slot.pointer<CStringData>(0).set(null);
    }
    return known(undefined);
  }
  private alloc(length: number): NativeValue<void> {
    if (length === 0) { this.slot.pointer<CStringData>(0).set(null); return known(undefined); }
    const instance = this.memory.getInstance(); if (!instance.known) return instance;
    const allocated = this.memory.malloc(length + 9); if (!allocated.known) return allocated;
    if (!allocated.value) return unknown('Native CString Malloc NULL reaches unowned holder dereference/failure behavior');
    const fields = new NativeHeapObjectViews(allocated.value);
    fields.writeUnsigned(0, length); fields.writeUnsigned(4, 1, 2);
    const data: CStringData = Object.freeze({ allocation: allocated.value, characterOffset: 8 });
    dataOwners.set(data, this.memory); this.slot.pointer<CStringData>(0).set(data); this.terminator(data, length);
    this.trace.push(`cstring-alloc:${length + 9}`); return known(undefined);
  }
  private realloc(length: number): NativeValue<void> {
    const old = this.data();
    if (old) {
      const fields = this.fields(old);
      // The native test uses old LENGTH, not the allocation's spare capacity.
      if (fields.readUnsigned(4, 2) < 2 && length <= this.length(old)) {
        fields.writeUnsigned(0, length); this.terminator(old, length);
        this.trace.push(`cstring-realloc-in-place:${length}`); return known(undefined);
      }
      const released = this.releaseCurrent(); if (!released.known) return released;
    }
    return this.alloc(length);
  }
  private asciiTerminated(input: Uint8Array): NativeValue<Uint8Array> {
    const terminator = input.indexOf(0);
    if (terminator < 0) return unknown('CString strlen requires an owned NUL-terminated source input');
    const bytes = input.subarray(0, terminator);
    if (bytes.some(byte => byte >= 128)) return unknown('Native non-ASCII CString input is outside the admitted byte profile');
    return known(bytes);
  }
  /** SetText(char const*) 10005fec->10014560, including native strlen and Realloc. */
  setTextBytes(input: Uint8Array): NativeValue<void> {
    return this.execute(() => {
      const admitted = this.asciiTerminated(input); if (!admitted.known) return admitted;
      const bytes = admitted.value, resized = this.realloc(bytes.length); if (!resized.known) return resized;
      if (bytes.length !== 0) {
        const data = this.data()!;
        data.allocation.bytes.set(bytes, 8); data.allocation.knownMask.fill(255, 8, 8 + bytes.length);
      }
      this.trace.push('cstring-set-text:10014560'); return known(undefined);
    });
  }
  /** An explicit source Alloc(length)+copy bridge for an already decoded ASCII
   * input. This does not claim the full native indexed-string table bootstrap. */
  allocateTextBytes(input: Uint8Array): NativeValue<void> {
    return this.execute(() => {
      if (input.some(byte => byte === 0 || byte >= 128)) return unknown('Selected CString source bridge requires exact non-NUL ASCII bytes');
      if (this.data() !== null) return unknown('Source CString Alloc bridge requires a fresh NULL slot');
      const allocated = this.alloc(input.length); if (!allocated.known) return allocated;
      if (input.length) {
        const data = this.data()!;
        data.allocation.bytes.set(input, 8); data.allocation.knownMask.fill(255, 8, 8 + input.length);
      }
      this.trace.push('cstring-source-byte-copy'); return known(undefined);
    });
  }
  /** operator= -> SetText(bCString const&), source ushort sharing semantics. */
  assign(sourceString: NativeHeapCString): NativeValue<void> {
    return this.execute(() => {
      if (!(sourceString instanceof NativeHeapCString) || sourceString.memory !== this.memory || sourceString.destroyed || sourceString.blocked) return unknown('CString assignment requires a live same-heap source owner');
      let sourceData = sourceString.data();
      if (sourceData && this.length(sourceData) !== 0) {
        const old = this.data();
        if (old === sourceData) return known(undefined);
        if (old) { const released = this.releaseCurrent(); if (!released.known) return released; sourceData = sourceString.data()!; }
        this.slot.pointer<CStringData>(0).set(sourceData);
        const fields = this.fields(sourceData), references = (fields.readUnsigned(4, 2) + 1) & 0xffff;
        fields.writeUnsigned(4, references, 2); this.trace.push(`cstring-share:${references}`); return known(undefined);
      }
      const old = this.data();
      if (old) {
        const fields = this.fields(old);
        if (fields.readUnsigned(4, 2) < 2 && this.length(old) >= 0) {
          fields.writeUnsigned(0, 0); this.terminator(old, 0); this.trace.push('cstring-share-empty-reuse'); return known(undefined);
        }
        const released = this.decrement(old); if (!released.known) return released;
      }
      this.slot.pointer<CStringData>(0).set(null); return known(undefined);
    });
  }
  /** Clear returns without changing an allocated holder whose length is0. */
  clear(): NativeValue<void> {
    return this.execute(() => {
      const data = this.data();
      if (data && this.length(data) !== 0) {
        const released = this.decrement(data); if (!released.known) return released;
        this.slot.pointer<CStringData>(0).set(null);
      }
      this.trace.push('cstring-clear:100149b0'); return known(undefined);
    });
  }
  release(): NativeValue<void> {
    return this.execute(() => { const result = this.releaseCurrent(); if (result.known) this.trace.push('cstring-release:10013700'); return result; });
  }
  /** Destructor does not clear the physical object pointer slot. */
  destroy(): NativeValue<void> {
    return this.execute(() => {
      const data = this.data();
      if (data) { const released = this.decrement(data); if (!released.known) return released; }
      this.destroyed = true; this.trace.push('cstring-destructor-stale-slot:10012250'); return known(undefined);
    });
  }
  isEmpty(): NativeValue<boolean> { return this.execute(() => { const data = this.data(); return known(data === null || this.length(data) === 0); }); }
  textBytes(): NativeValue<Uint8Array> {
    return this.execute(() => {
      const data = this.data(); if (data === null) return known(new Uint8Array());
      const length = this.length(data), fields = this.fields(data);
      if (fields.readUnsigned(8 + length, 1) !== 0 || data.allocation.knownMask.subarray(8, 8 + length).some(mask => mask !== 255)) return unknown('CString character bytes/terminator are not owned and known');
      const bytes = data.allocation.bytes.subarray(8, 8 + length);
      if (bytes.some(byte => byte >= 128 || byte === 0)) return unknown('CString characters are outside the selected non-NUL ASCII profile');
      return known(bytes.slice());
    });
  }
  text(): NativeValue<string> {
    const bytes = this.textBytes(); return bytes.known ? known(new TextDecoder().decode(bytes.value)) : bytes;
  }
  hash(): NativeValue<number> {
    const bytes = this.textBytes(); if (!bytes.known) return bytes;
    // Source MOVSX sign-extends char; selected bytes are ASCII. DWORD wraps.
    let value = 0; for (const byte of bytes.value) value = (Math.imul(value, 33) + byte) >>> 0;
    return known(value);
  }
  snapshot() {
    // Diagnostics deliberately preserve the destructor's stale pointer bits;
    // no field read follows an ended CString lifetime.
    const data = this.slot.pointer<CStringData>(0).get();
    return { destroyed: this.destroyed, blockedReason: this.blocked, data,
      allocation: data?.allocation ?? null, pointerBytes: [...this.slot.bytes], pointerMask: [...this.slot.knownMask], trace: [...this.trace] };
  }
}
