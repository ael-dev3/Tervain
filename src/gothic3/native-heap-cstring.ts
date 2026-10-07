import rules from '../../assets/gothic3/npc-heap/runtime-rules.json';
import textRules from '../../assets/gothic3/cstring-text-construction/runtime-rules.json';
import pointerRules from '../../assets/gothic3/script-admin-startup/runtime-rules.json';
import propertySource from '../../assets/gothic3/property-type-constructors/source.json';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryAdmin, NativeMemoryAllocation } from './native-memory-admin';
import type { NativeByteGeometryHost, NativeBytePointer } from './native-pointer-geometry';
import { copyNativeBytesScalar } from './native-byte-string';

type CStringData = { readonly allocation: NativeMemoryAllocation; readonly characterOffset: 8 };
const dataOwners = new WeakMap<object, NativeMemoryAdmin>();
const pendingTextConstruction = Symbol('Original CString text constructor destination');
const pendingPropertyCopy = Symbol('Original property constructor inline CString copy');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const source = rules as unknown as { schema: string; inputs: { SharedBase: string };
  methods: Record<string, { entry: string; body: string }>; constBytes: { emptyCStringText: { address: string; raw: string } } };
const pointerSource = pointerRules as unknown as { schema: string; inputs: { SharedBase: string };
  methods: Record<string, { module: string; entry: string; body: string; bodyRanges: string;
    instructionCount: number; bodyBytes: number; bodyInstructionBytesSha256: string;
    entryChain: readonly { va: string; bytes: string; targetVA: string }[] }>;
  constBytes: { emptyCStringText: { module: string; address: string; bytes: number; raw: string;
    knownMask: string; sha256: string; scope: string; liveValueCaptured: boolean } } };
const assertSource = () => {
  const methods = { cstringDefaultConstructor: '10012d20', cstringAlloc: '10013240', cstringRealloc: '10013e70',
    cstringSetText: '10014560', cstringSetShared: '10014640', cstringAssign: '10015430',
    cstringRelease: '10013700', cstringDestructor: '10012250', cstringClear: '100149b0',
    cstringIsEmpty: '100131f0', cstringGetText: '10013210', cstringHash: '10087ad0' };
  if (source.schema !== 'gothic3-npc-heap-rules-v1' || source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      Object.entries(methods).some(([name, body]) => source.methods[name]?.body !== body) ||
      source.constBytes.emptyCStringText.address !== '100e5e3c' || source.constBytes.emptyCStringText.raw !== '00') throw new Error('Original CString source receipt differs');
  if (textRules.schema !== 'gothic3-cstring-text-construction-rules-v1' ||
      textRules.inputs.SharedBase !== source.inputs.SharedBase ||
      textRules.methods.textConstructor.entry !== '10003ba7' || textRules.methods.textConstructor.body !== '100135f0' ||
      textRules.methods.textConstructor.bodyInstructionBytesSha256 !== '1bb0b6450709549da4589f055cb6f9780becea05ea8cefcd75e37701a22d0be5' ||
      textRules.methods.alloc.entry !== '10007d65' || textRules.methods.alloc.body !== '10013240' ||
      textRules.methods.alloc.bodyInstructionBytesSha256 !== 'dc8a43b75e1dccffc84e53f09fff8d1d25e6ce0e0485cfa4722de0f09887fd04') {
    throw new Error('Original CString text-construction source receipt differs');
  }
  if (pointerSource.schema !== 'gothic3-script-admin-startup-rules-v1' || pointerSource.inputs.SharedBase !== source.inputs.SharedBase) {
    throw new Error('Original CString pointer/comparison source receipt differs');
  }
  for (const [name, entry, body, extent, count, bytes, hash, thunk] of [
    ['cstringCompareText', '10004bfb', '100137c0', '100137c0-1001382b', 44, 108,
      '5baf83a596cd1b631027721bbad6cb2b985a163a1bba39911284eccea8d1f73c', 'e9c0eb0000'],
    ['cstringEqualsText', '10005ffb', '10013b70', '10013b70-10013b83', 7, 20,
      '5c55ddc9cc4029bf21bbabeaf91ce1aa682c2901db038ff74e745e6ff4fb5fed', 'e970db0000'],
    ['cstringGetText', '100044a3', '100134e0', '100134e0-100134eb', 5, 12,
      '2bc33b00ff34663e6950b5542c69eba0cb0f84303962aac9d3d9cc1988d1b705', 'e938f00000'],
  ] as const) {
    const method = pointerSource.methods[name], chain = method?.entryChain;
    if (method?.module !== 'SharedBase' || method.entry !== entry || method.body !== body ||
        method.bodyRanges !== extent || method.instructionCount !== count || method.bodyBytes !== bytes ||
        method.bodyInstructionBytesSha256 !== hash || chain?.length !== 1 ||
        chain[0]?.va !== entry || chain[0]?.bytes !== thunk || chain[0]?.targetVA !== body) {
      throw new Error('Original CString pointer/comparison method differs: ' + name);
    }
  }
  const empty = pointerSource.constBytes.emptyCStringText;
  if (empty.module !== 'SharedBase' || empty.address !== '100e5e3c' || empty.bytes !== 1 ||
      empty.raw !== '00' || empty.knownMask !== 'ff' ||
      empty.sha256 !== '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d' ||
      empty.scope !== 'original-file-backed-constant' || empty.liveValueCaptured !== false) {
    throw new Error('Original CString empty-text pointer receipt differs');
  }
};

/** Original bCString state over an actual four-byte object slot. Character
 * holders are MemoryAdmin allocations with an eight-byte prefix. Browser text
 * is produced only by reading owned bytes; it never replaces native ownership. */
export class NativeHeapCString {
  readonly slot: NativeHeapObjectViews;
  private destroyed = false;
  private blocked: string | null = null;
  private construction: 'pending' | 'complete' | 'failed';
  private constructingText = false;
  private constructionAllocation: NativeMemoryAllocation | null = null;
  private readonly trace: string[] = [];
  constructor(private readonly memory: NativeMemoryAdmin, slot?: NativeHeapObjectViews, token?: typeof pendingTextConstruction | typeof pendingPropertyCopy,
    private readonly interrupted?: () => string | null) {
    assertSource();
    if (token !== undefined && token !== pendingTextConstruction && token !== pendingPropertyCopy) throw new Error('Actual CString construction entry required');
    this.slot = slot ?? new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(4), knownMask: new Uint8Array(4), freed: false });
    if (this.slot.bytes.length !== 4) throw new Error('Actual four-byte bCString object slot required');
    this.construction = token !== undefined ? 'pending' : 'complete';
    if (this.construction === 'complete') {
      this.slot.pointer<CStringData>(0).set(null);
      this.trace.push('cstring-default-constructor:10012d20');
    }
  }
  /** Own the destination before the original text constructor begins. Creating
   * this view/owner performs no native slot read, NULL store or constructor. */
  static beginTextConstruction(memory: NativeMemoryAdmin, slot: NativeHeapObjectViews,
    interrupted?: () => string | null): NativeHeapCString {
    return new NativeHeapCString(memory, slot, pendingTextConstruction, interrupted);
  }
  /** Inline copies in the original property constructors store the current
   * pointer and increment its WORD reference count even for an empty holder.
   * Creating the destination owner performs no preliminary NULL store. */
  static copyForPropertyConstruction(source: NativeHeapCString, slot: NativeHeapObjectViews): NativeValue<NativeHeapCString> {
    if (!(source instanceof NativeHeapCString)) return unknown('Actual property CString source owner required');
    const destination = new NativeHeapCString(source.memory, slot, pendingPropertyCopy, source.interrupted);
    const result = source.execute(() => {
      const data = source.data();
      destination.slot.pointer<CStringData>(0).set(data);
      if (data) {
        const fields = source.fields(data), references = (fields.readUnsigned(4, 2) + 1) & 0xffff;
        fields.writeUnsigned(4, references, 2);
        destination.trace.push('property-inline-cstring-copy:' + references);
      }
      destination.construction = 'complete';
      return known(destination);
    });
    if (!result.known) { destination.construction = 'failed'; destination.blocked = result.reason; }
    return result;
  }
  /** Heap identity admission only; this performs no native field access. */
  usesMemoryAdmin(memory: NativeMemoryAdmin): boolean { return this.memory === memory; }
  private checkInterruption(): void {
    if (this.blocked) throw new Error(this.blocked);
    const reason = this.interrupted?.();
    if (reason) throw new Error(reason);
  }
  /** Geometry delegation can invoke an owning parent's callbacks. Stop at
   * that return before memcpy reaches another load or store. */
  private copyGeometry(): NativeByteGeometryHost {
    const geometry = this.memory.byteGeometry();
    return {
      resolveNativePointer: pointer => {
        this.checkInterruption();
        const result = geometry.resolveNativePointer(pointer);
        this.checkInterruption(); return result;
      },
      proveNativeCopyDirection: (destination, input, bytes) => {
        this.checkInterruption();
        const result = geometry.proveNativeCopyDirection(destination, input, bytes);
        this.checkInterruption(); return result;
      },
    };
  }
  private execute<T>(body: () => NativeValue<T>, textConstructor = false): NativeValue<T> {
    if (this.blocked) return unknown(this.blocked);
    if (this.destroyed) return unknown('CString object lifetime has ended');
    if (!textConstructor && this.construction !== 'complete') return unknown('CString text construction has not completed');
    try {
      this.checkInterruption();
      const result = body();
      this.checkInterruption();
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
  /** A native slot load can return an ended holder pointer. Its later actual
   * header/character access owns the lifetime and known-byte checks. */
  private retainedDataPointer(): CStringData | null {
    const value = this.slot.pointer<CStringData>(0).get();
    if (value && (value.characterOffset !== 8 || dataOwners.get(value) !== this.memory)) {
      throw new Error('CString character pointer has no same-heap holder capability');
    }
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
      const instance = this.memory.getInstance(); this.checkInterruption(); if (!instance.known) return instance;
      const freed = this.memory.free(data.allocation); this.checkInterruption(); if (!freed.known) return freed;
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
    const instance = this.memory.getInstance(); this.checkInterruption(); if (!instance.known) return instance;
    const allocated = this.memory.malloc(length + 9); this.checkInterruption(); if (!allocated.known) return allocated;
    if (!allocated.value) return unknown('Native CString Malloc NULL reaches unowned holder dereference/failure behavior');
    if (this.constructingText) this.constructionAllocation = allocated.value;
    const fields = new NativeHeapObjectViews(allocated.value);
    fields.writeUnsigned(0, length); fields.writeUnsigned(4, 1, 2);
    const data: CStringData = Object.freeze({ allocation: allocated.value, characterOffset: 8 });
    dataOwners.set(data, this.memory); this.slot.pointer<CStringData>(0).set(data); this.terminator(data, length);
    this.trace.push(`cstring-alloc:${length + 9}`); return known(undefined);
  }
  /** Text constructor10003ba7->100135f0. It scans the live source, calls Alloc
   * directly, reloads the character pointer and copies using the OLD length.
   * Allocation callbacks can change/free the source before that native copy. */
  constructText(input: NativeBytePointer | null): NativeValue<void> {
    if (this.constructingText) {
      this.blocked = 'CString text constructor is already executing';
      this.trace.push('blocked:' + this.blocked); return unknown(this.blocked);
    }
    if (this.blocked) return unknown(this.blocked);
    if (this.construction !== 'pending') return unknown('Fresh unconstructed CString destination required');
    this.constructingText = true;
    const result = this.execute(() => {
      if (input === null) {
        this.slot.pointer<CStringData>(0).set(null);
        this.trace.push('cstring-text-constructor-null:100135f0'); return known(undefined);
      }
      let length = 0;
      while (input.fields.readUnsigned(input.offset + length, 1) !== 0) length++;
      this.trace.push('cstring-text-constructor-strlen:' + length);
      if (length === 0) {
        this.slot.pointer<CStringData>(0).set(null);
        this.trace.push('cstring-text-constructor-empty:100135f0'); return known(undefined);
      }
      const allocated = this.alloc(length); if (!allocated.known) return allocated;
      // This is the source's receiver pointer reload. Holder access/lifetime
      // belongs to memcpy's later actual load/store, not an earlier precheck.
      const data = this.slot.pointer<CStringData>(0).get();
      if (!data || data.characterOffset !== 8 || dataOwners.get(data) !== this.memory) {
        return unknown('Actual freshly allocated CString character pointer required');
      }
      const copied = copyNativeBytesScalar(this.copyGeometry(),
        { fields: new NativeHeapObjectViews(data.allocation), offset: data.characterOffset }, input, length);
      this.checkInterruption();
      if (!copied.known) return copied;
      if (this.blocked) return unknown(this.blocked);
      this.trace.push('cstring-text-constructor-copy:100135f0'); return known(undefined);
    }, true);
    this.constructingText = false;
    this.construction = result.known ? 'complete' : 'failed';
    return result;
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
      if (!(sourceString instanceof NativeHeapCString) || sourceString.memory !== this.memory || sourceString.destroyed ||
          sourceString.blocked || sourceString.construction !== 'complete') return unknown('CString assignment requires a completed live same-heap source owner');
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
  /** Compare(char const*)10004bfb->100137c0. NULL/empty results and the
   * unsigned two-byte loop follow the actual loads, without text snapshots. */
  compareText(input: NativeBytePointer | null): NativeValue<number> {
    return this.execute(() => {
      const left = this.retainedDataPointer(); // Receiver slot100137c8.
      const result = (comparison: -1 | 0 | 1): NativeValue<number> => {
        this.trace.push('cstring-compare-text:100137c0'); return known(comparison);
      };
      if (input === null) {
        if (left === null) return result(1);
        // This branch reads only the DWORD at character pointer-8. The native
        // routine applies no length range, ASCII or terminator validation.
        return result(this.fields(left).readUnsigned(left.characterOffset - 8) === 0 ? 1 : 0);
      }
      if (left === null) return result(input.fields.readUnsigned(input.offset, 1) === 0 ? 0 : -1);
      //100137f6 reads right first. An empty right string never reads left data.
      if (input.fields.readUnsigned(input.offset, 1) === 0) return result(1);
      const fields = this.fields(left);
      let leftOffset: number = left.characterOffset, rightOffset = input.offset;
      for (;;) {
        let leftByte = fields.readUnsigned(leftOffset, 1);
        let rightByte = input.fields.readUnsigned(rightOffset, 1);
        if (leftByte !== rightByte) return result(leftByte < rightByte ? -1 : 1);
        if (leftByte === 0) return result(0);
        leftByte = fields.readUnsigned(leftOffset + 1, 1);
        rightByte = input.fields.readUnsigned(rightOffset + 1, 1);
        if (leftByte !== rightByte) return result(leftByte < rightByte ? -1 : 1);
        leftOffset += 2; rightOffset += 2;
        if (leftByte === 0) return result(0);
      }
    });
  }
  /** Equals10005ffb->10013b70 preserves Compare==0 as the native BOOL. */
  equalsText(input: NativeBytePointer | null): NativeValue<0 | 1> {
    return this.execute(() => {
      const comparison = this.compareText(input); if (!comparison.known) return comparison;
      this.trace.push('cstring-equals-text:10013b70');
      return known(comparison.value === 0 ? 1 : 0);
    });
  }
  /** Original CString-to-CString equality compares pointer NULLness first,
   * then stored lengths and two bytes per loop. NULL and an allocated empty
   * holder differ; text equality is not a substitute for this overload. */
  equalsCString(other: NativeHeapCString): NativeValue<0 | 1> {
    return this.execute(() => {
      const method = propertySource.methods.equalsCString;
      if (propertySource.sharedBaseSha256 !== source.inputs.SharedBase ||
          method.entryVA !== '0x10002eb9' || method.bodyVA !== '0x10011600' ||
          method.instructionCount !== 42 || method.bodyByteCount !== 107 ||
          method.bodyInstructionBytesSha256 !== '2f4155bfe9636a75c6510cd28b8b409a543c7135ebe0686d3ea7e9d51a83dacc') {
        return unknown('Original CString equality source differs');
      }
      if (!(other instanceof NativeHeapCString) || other.memory !== this.memory || other.destroyed ||
          other.blocked || other.construction !== 'complete') return unknown('Live completed same-heap CString argument required');
      const left = this.retainedDataPointer(), right = other.retainedDataPointer();
      if (!left) return known(right === null ? 1 : 0);
      if (!right) return known(0);
      const rightFields = other.fields(right), leftFields = this.fields(left);
      if (rightFields.readUnsigned(0) !== leftFields.readUnsigned(0)) return known(0);
      for (let offset = 8; ; offset += 2) {
        const first = leftFields.readUnsigned(offset, 1);
        if (first !== rightFields.readUnsigned(offset, 1)) return known(0);
        if (first === 0) return known(1);
        const second = leftFields.readUnsigned(offset + 1, 1);
        if (second !== rightFields.readUnsigned(offset + 1, 1)) return known(0);
        if (second === 0) return known(1);
      }
    });
  }
  /** GetText100044a3->100134e0 reloads the actual character pointer. It reads
   * neither holder bytes nor characters; NULL returns Shared static text. */
  getTextPointer(): NativeValue<NativeBytePointer> {
    return this.execute(() => {
      const data = this.retainedDataPointer();
      if (data === null) {
        const empty = this.memory.emptyCStringTextPointer(); if (!empty.known) return empty;
        this.trace.push('cstring-get-text:100134e0'); return empty;
      }
      this.trace.push('cstring-get-text:100134e0');
      return known(Object.freeze({ fields: this.fields(data), offset: data.characterOffset }));
    });
  }
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
    let data: CStringData | null = null, pointerReadable = true, pointerError: string | null = null;
    try { data = this.slot.pointer<CStringData>(0).get(); }
    catch (error) { pointerReadable = false; pointerError = error instanceof Error ? error.message : String(error); }
    return { destroyed: this.destroyed, blockedReason: this.blocked, construction: this.construction,
      constructionAllocation: this.constructionAllocation, pointerReadable, pointerError, data,
      allocation: data?.allocation ?? null, pointerBytes: [...this.slot.bytes], pointerMask: [...this.slot.knownMask], trace: [...this.trace] };
  }
}
