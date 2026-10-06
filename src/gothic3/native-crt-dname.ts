/** Retained Engine CRT HeapManager/DName/Replicator primitives. These are the
 * selected physical graph operations, not a complete Microsoft demangler. */
import sourceText from '../../assets/gothic3/crt-undname/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function fact<T>(result: NativeValue<T>, operation: string): T {
  if (!result.known) throw new Error(operation + ': ' + result.reason);
  return result.value;
}
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function uint(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual native unsigned DWORD required');
}
function fresh(bytes: number): NativeHeapObjectViews {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes), freed: false });
}
function subview(fields: NativeHeapObjectViews, begin: number, length: number): NativeHeapObjectViews {
  if (begin < 0 || length < 0 || begin + length > fields.bytes.length) throw new Error('CRT subview outside its retained physical object');
  // Preserve backing identity and physical offset, including a caller's subview.
  const relative = fields.bytes.byteOffset - fields.backing.bytes.byteOffset;
  return new NativeHeapObjectViews(fields.backing, relative + begin, length);
}
interface SourceRange { address: string; bytes: number; raw: string }
interface SourceRules {
  schema: string; inputs: { Engine: string };
  constBytes: Record<string, SourceRange>;
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
}
const source = JSON.parse(sourceText) as SourceRules;
const entries: Record<string, readonly [string, string]> = {
  heapGetMemory: ['30696bf0', '5885ef8c4c2c11a760c1c5e5b72c81cdff4498c6c0f08dcc6bf4759577520076'],
  heapDestructor: ['30696606', '7240f5c4af9b71314832dede1b11ec12132e169829273dc80a516cf351961f34'],
  replicatorConstructor: ['306972b8', '10aa1a13d6a1a005ffb3959bdf9eeedf15e1ca58b9aaec8b0b204762e179dca6'],
  replicatorAppend: ['306972d6', 'e23b2baff71710fef3f17c195214bf88c727edc543ea8ddaf1fc12cd1b482c75'],
  replicatorLookup: ['30696e2d', 'e90ba5f876fa66cd09a0cc1e3dff93e458a8ae2fc1af918dfed70b3de8c19b1f'],
  dnameCopyConstructor: ['30696c93', '22eeb723a5ce45dfd1aa18fc0eac1e42f55c7056ea135450d9a86576200ec857'],
  dnameAssign: ['30696da9', '6092345761e20b79efe5f85cce1c7e3f599aab47d5ee82d240ed30c3c14bc0bf'],
  dnamePointerConstructor: ['30696ffb', '3d6d7656f2053e81460ee4e706c23afe627d8bf55b973c6df2e1be3a7239102e'],
  dnameStatusConstructor: ['30697051', 'bbce95d9c3fe1c33a20e763a9103c5fe543a8913ba978d62cda6446ec809e3a9'],
  dnameAssignStatus: ['30697237', 'be8d49c37bcd1549d1f3114d8bef973e293b488d123b2bc825c341a224c8883d'],
  dnameIsValid: ['306970b2', '96b22d177ed2a689f182acee9ce39a518b2f0e84a9291080864dbbfc209900ad'],
  dnameIsEmpty: ['306970c9', '090f282989d8b04187ed3e8fd62d8f990456f804741ff750a7d0c42fa50acb6c'],
  dnameLength: ['30697114', '0fe5d55f6f86a90523cc8f0556670ce586279a421c2d2686ac833d17dd0cf22e'],
  dnameGetString: ['30697171', 'c5e95141d6047f9c69c2b94ed990459372c66598753f6cc2b34a3e8cf850b644'],
  dnameCloneNode: ['3069731d', '294d9e288a2b84d3016bef9cd69efd7744de4aaa983888038946675365b4d3fc'],
  dnameTextNodeConstructor: ['30697364', '33d7ac0c54ed12da554b0f0187303c663c45f6aa642d518dd87a3472ab9e6903'],
  dnameIndirectNodeConstructor: ['30696ec9', '36455fc169400fdcbc45a9c4bcfad35e1f5e9dcff20c1c94c82473813b7e142b'],
  dnameTextNodeGetString: ['306973db', 'b9c6c4ce908f3b00ae5db5cec532266cd71288b2341ee043b9208ffab2648240'],
  dnameIndirectNodeLength: ['3069740c', '747076544dd68a9c3c9c8996b1583a7173480bdc8e3f390d85652048f412c284'],
  dnameIndirectNodeGetString: ['3069742a', '767bcbf8b079244670988ad0f16bbfc038c5828b8a443c7f7daf411abee88d32'],
  dnameDoPchar: ['3069760c', '14ff39f8d2f44247c299d7ffa88cf3d5bee62a238db4ede18b34da28d607b07b'],
  dnameCharConstructor: ['306976b2', '03b494be34cd2555f1dcb43badc71017867a9b3736e59ac9c366bbf5329073c5'],
  dnameTextConstructor: ['306976d8', 'b5ea63b3511900ff77580161bcfe26c89e8046b7d33d107687a9c291308cc1dd'],
  dnameDelimitedConstructor: ['30697709', 'b28a7979f8797f684584712d69fe13c6bf321b680c271447e95d3cb6accbc086'],
  dnameConcat: ['30697906', 'ad2472d219743788dec4e13650a0adec9101873ea40468a3bdd44dc446aa2e95'],
  dnamePointerConcat: ['30697968', 'e5cb7141176b76cf1f413c74f09e3906de4b015433a5ac4affcaa08aaecb02a2'],
  dnameAssignText: ['30697a0f', '497112b515454ee35aa2ecb02e759cd29b3e44aa74d6353f486b4f2e667c9887'],
  dnamePlus: ['30697b16', 'eae1aa310e597134ce69be74b6253365ae768313fe00d3037fc5360cdf1fc4ae'],
  dnameLastChar: ['30697139', '09585411a7dcbf80d194c6186ed230a1d69737aa6b8fffbf5b4994442c4500a3'],
  dnameConcatStatus: ['3069752b', '7fd5dc077cfd829437e70592606c4f5ac943ba22308f712967496a2c2e2f613a'],
  dnameNodeConcat: ['30696e63', 'a11ae770c8ade5fbf75502f3534d89fe9e721e9cacbd7709edc34a0d5e2eecde'],
  undStrncpy: ['30696f3c', '7778f334bcc5a59f32ecc12d663ac57a31e732a98e4b20d28849b48b6ccfee9d'],
  dnameStatusNodeConstructor: ['30696ef8', 'dd323b3c540365b1786c1964edc3eebcf1e4095d3ffd08b84aa2817ca04d7414'],
  dnameCharNodeLength: ['30696ea2', '194f81a127723ec366ff0b8410df190c0649a05808a94d5554d82de5af7f425b'],
  dnameCharNodeLastChar: ['30696ea6', '8a905797df24e4a1fe68a2f630971aa55b606cd6a92fed57303379d0f93a7a2d'],
  dnameCharNodeGetString: ['30696eaa', 'fa0056337c92666278e6c7abcd8865d37a30de6c4fd69098420aaf6355b8158f'],
  dnameTextNodeLength: ['30696ec5', '2e339cdc5de837ec151dbde90057caeabba18ac3ea32e7c2cffc8f95df41a6ff'],
  dnameTextNodeLastChar: ['306973c9', '38996d7d955cf4bc9a93b1c898cfd439cf057d2c230677d1bd2490d46ddac017'],
  dnameIndirectNodeLastChar: ['3069741b', 'f2c386e622c75c51e32bf72841e8b2591a235036f50a0bc27243ef3d5085f290'],
  dnameStatusNodeLength: ['30696f1d', '2e339cdc5de837ec151dbde90057caeabba18ac3ea32e7c2cffc8f95df41a6ff'],
  dnameStatusNodeLastChar: ['30696f21', '98243bf07e739751c43f4af9524f082a3baa83d05f90b778eb6687f5cba62a6c'],
  dnameStatusNodeGetString: ['30697447', '2ba077c833024726f34c1597141e08618c6e7206d5b964e952ada2603598ebf9'],
};
function admit(): void {
  if (source.schema !== 'gothic3-crt-undname-rules-v1' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3') {
    throw new Error('Original Engine CRT graph source input differs');
  }
  for (const [label, [entry, hash]] of Object.entries(entries)) {
    const method = source.methods[label];
    if (!method || method.entry !== entry || method.body !== entry || method.bodyInstructionBytesSha256 !== hash) {
      throw new Error('Original CRT graph method receipt differs: ' + label);
    }
  }
}
function constant(label: string, address: string, bytes: number): NativeHeapObjectViews {
  admit(); const range = source.constBytes[label];
  const raw: Record<string, string> = {
    charNodeVtable: 'a26e6930a66e6930aa6e6930', indirectNodeVtable: '0c7469301b7469302a746930',
    statusNodeVtable: '1d6f6930216f693047746930', textNodeVtable: 'c56e6930c9736930db736930',
    truncatedNameText: '203f3f2000',
  };
  if (!range || range.address !== address || range.bytes !== bytes || range.raw !== raw[label]) {
    throw new Error('Original CRT graph constant differs: ' + label);
  }
  return new NativeHeapObjectViews({ identity: {}, bytes: Uint8Array.from(range.raw.match(/../g)!, byte => parseInt(byte, 16)),
    knownMask: new Uint8Array(bytes).fill(255), freed: false });
}

export interface NativeCrtScratchHost {
  crtMalloc(bytes: number): NativeValue<NativeMemoryBacking | null>;
  crtFree(backing: NativeMemoryBacking): NativeValue<void>;
}
export interface NativeCrtBytePointer { readonly fields: NativeHeapObjectViews; readonly offset: number }
export interface NativeCrtByteCursor {
  get(): NativeCrtBytePointer | null;
  set(pointer: NativeCrtBytePointer | null): void;
}
export interface NativeCrtScratchSlice {
  readonly backing: NativeMemoryBacking;
  readonly offset: number;
  readonly requestedBytes: number;
  readonly roundedBytes: number;
  readonly fields: NativeHeapObjectViews;
}

/** Manager fields alias the first twenty bytes at30af7c54. Its callback and
 * zero stores belong to ___unDName; constructing this view performs no stores. */
export class NativeCrtScratchArena {
  readonly fields: NativeHeapObjectViews;
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private readonly blocks: NativeMemoryBacking[] = [];
  private readonly slices: NativeCrtScratchSlice[] = [];
  private readonly allocations: NativeMemoryBacking[] = [];
  constructor(private readonly host: NativeCrtScratchHost,
    private readonly options: { fields: NativeHeapObjectViews; checkpoint?: (operation: string) => void }) {
    admit(); this.fields = subview(options.fields, 0, 20);
  }
  check(operation: string): void {
    if (this.reentrant) throw new Error('Unsupported reentry into CRT scratch arena');
    if (this.boundary) throw new Error(this.boundary);
    this.options.checkpoint?.(operation);
    if (this.reentrant) throw new Error('Unsupported reentry into CRT scratch arena');
  }
  private run<T>(operation: string, body: () => T): NativeValue<T> {
    if (this.active) { this.reentrant = true; return unknown('CRT scratch arena is already executing'); }
    this.active = true;
    try { this.check(operation); return known(body()); }
    catch (error) { this.boundary ??= message(error); return unknown(this.boundary); }
    finally { this.active = false; }
  }
  private malloc(bytes: number): NativeMemoryBacking | null {
    const callback = this.fields.pointer<object>(0).get();
    if (callback !== this.host.crtMalloc) throw new Error('CRT scratch allocator callback is not owned');
    this.check('heapGetMemory.malloc.before');
    const result = this.host.crtMalloc(bytes);
    // Retain a returned capability before a post-call guard. No source stores
    // follow an unknown/reentrant callback, but its allocation has happened.
    if (result.known && result.value) this.allocations.push(result.value);
    this.check('heapGetMemory.malloc.after');
    const backing = fact(result, 'CRT scratch malloc');
    if (backing && (typeof backing.identity !== 'object' || backing.identity === null || backing.freed ||
        backing.bytes.length < bytes || backing.bytes.length !== backing.knownMask.length ||
        this.allocations.slice(0, -1).some(previous => previous === backing || previous.identity === backing.identity))) {
      throw new Error('Actual fresh CRT scratch allocation required');
    }
    return backing;
  }
  allocate(bytes: number, direct = false): NativeValue<NativeCrtScratchSlice | null> {
    return this.run('heapGetMemory', () => {
      uint(bytes); let rounded = ((bytes + 7) >>> 0) & 0xfffffff8; rounded >>>= 0;
      if (direct) {
        const backing = this.malloc(rounded);
        if (!backing) return null;
        const slice = { backing, offset: 0, requestedBytes: bytes, roundedBytes: rounded,
          fields: new NativeHeapObjectViews(backing, 0, rounded) };
        this.slices.push(slice); return slice;
      }
      if (!rounded) rounded = 8;
      const remaining = this.fields.readUnsigned(16);
      if (remaining < rounded) {
        if (rounded > 4096) return null;
        const backing = this.malloc(4104);
        if (!backing) return null;
        const block = new NativeHeapObjectViews(backing);
        block.pointer<NativeMemoryBacking>(0).set(null);
        const tail = this.fields.pointer<NativeMemoryBacking>(12).get();
        if (tail) new NativeHeapObjectViews(tail).pointer<NativeMemoryBacking>(0).set(backing);
        else this.fields.pointer<NativeMemoryBacking>(8).set(backing);
        this.fields.pointer<NativeMemoryBacking>(12).set(backing);
        this.fields.writeUnsigned(16, 4096 - rounded);
        this.blocks.push(backing);
      } else this.fields.writeUnsigned(16, remaining - rounded);
      const backing = this.fields.pointer<NativeMemoryBacking>(12).get();
      if (!backing || !this.blocks.includes(backing)) throw new Error('CRT scratch tail has no owned block capability');
      const offset = 4 + this.fields.readUnsigned(16);
      const slice = { backing, offset, requestedBytes: bytes, roundedBytes: rounded,
        fields: new NativeHeapObjectViews(backing, offset, rounded) };
      this.slices.push(slice); return slice;
    });
  }
  cleanup(): NativeValue<void> {
    return this.run('heapDestructor', () => {
      const callback = this.fields.pointer<object>(4).get();
      if (!callback) return;
      if (callback !== this.host.crtFree) throw new Error('CRT scratch free callback is not owned');
      const visited = new Set<NativeMemoryBacking>();
      for (;;) {
        const block = this.fields.pointer<NativeMemoryBacking>(8).get();
        this.fields.pointer<NativeMemoryBacking>(12).set(block);
        if (!block) return;
        if (visited.has(block) || !this.blocks.includes(block)) throw new Error('CRT scratch linked block is not owned');
        visited.add(block);
        const next = new NativeHeapObjectViews(block).pointer<NativeMemoryBacking>(0).get();
        this.fields.pointer<NativeMemoryBacking>(8).set(next);
        this.check('heapDestructor.free.before');
        const result = this.host.crtFree(block);
        this.check('heapDestructor.free.after');
        fact(result, 'CRT scratch free');
        // _free is void. An owned HeapFree failure may store errno and return
        // without ending this block's lifetime; HeapManager still continues.
      }
    });
  }
  snapshot(): { fields: NativeHeapObjectViews; blocks: readonly NativeMemoryBacking[];
    allocations: readonly NativeMemoryBacking[]; slices: readonly NativeCrtScratchSlice[]; boundary: string | null } {
    return { fields: this.fields, blocks: [...this.blocks], allocations: [...this.allocations],
      slices: [...this.slices], boundary: this.boundary };
  }
}

export type NativeCrtDNameNodeKind = 'char' | 'text' | 'indirect' | 'status';
export class NativeCrtDNameNode {
  constructor(readonly factory: NativeCrtDNameFactory, readonly kind: NativeCrtDNameNodeKind,
    readonly slice: NativeCrtScratchSlice) {}
  get fields(): NativeHeapObjectViews { return this.slice.fields; }
  get next(): NativeCrtDNameNode | null { return this.fields.pointer<NativeCrtDNameNode>(4).get(); }
}
export class NativeCrtDNameRecord {
  constructor(readonly factory: NativeCrtDNameFactory, readonly fields: NativeHeapObjectViews) {
    if (fields.bytes.length !== 8) throw new Error('Physical eight-byte DName record required');
  }
  get head(): NativeCrtDNameNode | null { return this.fields.pointer<NativeCrtDNameNode>(0).get(); }
  get status(): number {
    const word = this.fields.maskedWord(4);
    if ((word.knownMask & 15) !== 15) throw new Error('DName status nibble contains unowned bits');
    return (word.value << 28) >> 28;
  }
  isValid(): boolean { const status = this.status; return status === 0 || status === 2; }
  isEmpty(): boolean { return this.head === null || !this.isValid(); }
  length(): number { return this.factory.length(this); }
  getLastChar(): number { return this.factory.lastChar(this); }
  writeString(destination: NativeCrtBytePointer | null, maxBytes: number): NativeValue<NativeCrtBytePointer | null> {
    return this.factory.writeString(this, destination, maxBytes);
  }
}

/** Each method follows the selected source stores. Graph authority is retained
 * node/record pointer slots; metadata is used only to admit virtual dispatch. */
export class NativeCrtDNameFactory {
  private active = false;
  private boundary: string | null = null;
  private reentrant = false;
  private readonly nodes = new WeakSet<NativeCrtDNameNode>();
  private readonly records = new WeakSet<NativeCrtDNameRecord>();
  private readonly vtables: Record<NativeCrtDNameNodeKind, NativeHeapObjectViews> = {
    char: constant('charNodeVtable', '3089f28c', 12), indirect: constant('indirectNodeVtable', '3089f29c', 12),
    status: constant('statusNodeVtable', '3089f2ac', 12), text: constant('textNodeVtable', '3089f2bc', 12),
  };
  private readonly truncated = constant('truncatedNameText', '3089f2c8', 5);
  constructor(readonly arena: NativeCrtScratchArena) {}
  check(operation: string): void {
    if (this.reentrant) throw new Error('Unsupported reentry into CRT DName graph');
    if (this.boundary) throw new Error(this.boundary);
    this.arena.check(operation);
  }
  run<T>(operation: string, body: () => T): NativeValue<T> {
    if (this.active) { this.reentrant = true; return unknown('CRT DName graph is already executing'); }
    this.active = true;
    try { this.check(operation); return known(body()); }
    catch (error) { this.boundary ??= message(error); return unknown(this.boundary); }
    finally { this.active = false; }
  }
  private record(fields = fresh(8)): NativeCrtDNameRecord {
    const result = new NativeCrtDNameRecord(this, fields); this.records.add(result); return result;
  }
  private own(record: NativeCrtDNameRecord): void {
    this.check('DName.read');
    if (!this.records.has(record) || record.factory !== this) throw new Error('DName record has no owned physical capability');
  }
  private setBits(record: NativeCrtDNameRecord, mask: number, value: number): void {
    this.check('DName.store'); const word = record.fields.maskedWord(4);
    const oldMask = word.knownMask; word.value = ((word.value & ~mask) | (value & mask)) >>> 0;
    word.knownMask = (oldMask | mask) >>> 0;
  }
  private copyBits(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord, mask: number): void {
    this.check('DName.copyBits'); const to = target.fields.maskedWord(4), from = input.fields.maskedWord(4);
    const knownMask = ((to.knownMask & ~mask) | (from.knownMask & mask)) >>> 0;
    to.value = ((to.value & ~mask) | (from.value & mask)) >>> 0; to.knownMask = knownMask;
  }
  private head(record: NativeCrtDNameRecord, node: NativeCrtDNameNode | null): void {
    this.check('DName.head.store'); record.fields.pointer<NativeCrtDNameNode>(0).set(node);
  }
  private allocation(bytes: number): NativeCrtScratchSlice | null {
    const result = fact(this.arena.allocate(bytes), 'HeapManager.getMemory'); this.check('DName.allocation.after'); return result;
  }
  private node(kind: NativeCrtDNameNodeKind, slice: NativeCrtScratchSlice): NativeCrtDNameNode {
    const node = new NativeCrtDNameNode(this, kind, slice); this.nodes.add(node);
    node.fields.pointer<NativeCrtDNameNode>(4).set(null);
    node.fields.writeUnsigned(0, parseInt(source.constBytes[{ char: 'charNodeVtable', text: 'textNodeVtable',
      indirect: 'indirectNodeVtable', status: 'statusNodeVtable' }[kind]]!.address, 16));
    return node;
  }
  private statusNode(status: number): NativeCrtDNameNode | null {
    const slice = this.allocation(16); if (!slice) return null;
    const node = this.node('status', slice); node.fields.writeUnsigned(8, status >>> 0);
    node.fields.writeUnsigned(12, status === 2 ? 4 : 0); return node;
  }
  private indirectNode(slice: NativeCrtScratchSlice, record: NativeCrtDNameRecord | null): NativeCrtDNameNode {
    const node = this.node('indirect', slice);
    if (record && (record.status === 1 || record.status === 3)) record = null;
    node.fields.pointer<NativeCrtDNameRecord>(8).set(record); return node;
  }
  empty(fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('DName.empty', () => { const record = this.record(fields);
      this.setBits(record, 0xfff, 0); this.head(record, null); return record; });
  }
  status(status: number, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameStatusConstructor', () => this.statusRaw(status, fields));
  }
  private statusRaw(status: number, fields?: NativeHeapObjectViews): NativeCrtDNameRecord {
    const record = this.record(fields); this.setBits(record, 15, status === 1 || status === 3 ? status : 0);
    const node = this.statusNode(status); this.setBits(record, 0xff0, 0); this.head(record, node);
    if (!node) this.setBits(record, 12, 0), this.setBits(record, 3, 3);
    return record;
  }
  private strlen(input: NativeCrtBytePointer): number {
    let length = 0; while (input.fields.readUnsigned(input.offset + length, 1)) length++; return length;
  }
  private strncpy(input: NativeCrtBytePointer, destination: NativeCrtBytePointer, count: number): void {
    uint(count);
    for (let index = 0; index < count; index++) {
      this.check('undStrncpy.byte'); const byte = input.fields.readUnsigned(input.offset + index, 1);
      destination.fields.writeUnsigned(destination.offset + index, byte, 1); if (!byte) break;
    }
  }
  private doPchar(record: NativeCrtDNameRecord, input: NativeCrtBytePointer | null, length: number): void {
    uint(length); const status = record.status;
    if (status === 1 || status === 3) return;
    if (record.head) { this.assignStatusRaw(record, 3); return; }
    if (!input || !length) { this.setBits(record, 14, 0); this.setBits(record, 1, 1); return; }
    const slice = this.allocation(length === 1 ? 12 : 16);
    let node: NativeCrtDNameNode | null = null;
    if (slice) {
      if (length === 1) {
        // Source reads the input byte before the three constructor stores.
        const byte = input.fields.readUnsigned(input.offset, 1);
        node = this.node('char', slice); node.fields.writeUnsigned(8, byte, 1);
      } else {
        node = this.node('text', slice);
        const payload = this.allocation(length);
        node.fields.pointer<NativeCrtScratchSlice>(8).set(payload); node.fields.writeUnsigned(12, length);
        if (payload) this.strncpy(input, { fields: payload.fields, offset: 0 }, length);
      }
    }
    this.head(record, node); if (!node) this.setBits(record, 12, 0), this.setBits(record, 3, 3);
  }
  fromBytes(input: NativeCrtBytePointer | null, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameTextConstructor', () => { const record = this.record(fields);
      this.setBits(record, 0xfff, 0); this.head(record, null);
      if (input) this.doPchar(record, input, this.strlen(input)); return record; });
  }
  assignText(target: NativeCrtDNameRecord, input: NativeCrtBytePointer): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameAssignText', () => {
      this.own(target); this.setBits(target, 0x8f0, 0);
      this.doPchar(target, input, this.strlen(input)); return target;
    });
  }
  fromChar(byte: number, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameCharConstructor', () => {
      if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new Error('Actual unsigned native character byte required');
      const record = this.record(fields); this.head(record, null); this.setBits(record, 0xfff, 0);
      if (byte) { const input = fresh(1); input.writeUnsigned(0, byte, 1); this.doPchar(record, { fields: input, offset: 0 }, 1); }
      return record;
    });
  }
  fromDelimited(cursor: NativeCrtByteCursor, delimiter: number, readFlags: () => number,
    fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameDelimitedConstructor', () => {
      if (!Number.isInteger(delimiter) || delimiter < 0 || delimiter > 255) throw new Error('Actual native delimiter byte required');
      const record = this.record(fields); this.setBits(record, 0xfff, 0); this.head(record, null);
      const input = cursor.get();
      if (!input) { this.setBits(record, 14, 0); this.setBits(record, 1, 1); return record; }
      let pointer = input, length = 0, byte = pointer.fields.readUnsigned(pointer.offset, 1);
      if (!byte) { this.setBits(record, 13, 0); this.setBits(record, 2, 2); return record; }
      while (byte && byte !== delimiter) {
        const allowed = byte === 0x5f || byte === 0x24 || byte === 0x3c || byte === 0x3e || byte === 0x2d ||
          (byte >= 0x61 && byte <= 0x7a) || (byte >= 0x41 && byte <= 0x5a) || (byte >= 0x30 && byte <= 0x39) ||
          (byte >= 0x80 && byte <= 0xfe);
        if (!allowed && !(readFlags() & 0x10000)) {
          this.setBits(record, 14, 0); this.setBits(record, 1, 1); return record;
        }
        length++; pointer = { fields: pointer.fields, offset: pointer.offset + 1 };
        this.check('DName.cursor.store'); cursor.set(pointer); byte = pointer.fields.readUnsigned(pointer.offset, 1);
      }
      this.doPchar(record, input, length);
      pointer = cursor.get()!; byte = pointer.fields.readUnsigned(pointer.offset, 1);
      if (byte) {
        this.check('DName.cursor.store'); cursor.set({ fields: pointer.fields, offset: pointer.offset + 1 });
        if (byte === delimiter) this.setBits(record, 15, 0);
        else { this.head(record, null); this.setBits(record, 12, 0); this.setBits(record, 3, 3); }
      } else if (!record.status) { this.setBits(record, 13, 0); this.setBits(record, 2, 2); }
      return record;
    });
  }
  private copyRaw(input: NativeCrtDNameRecord, fields?: NativeHeapObjectViews): NativeCrtDNameRecord {
    this.own(input); const record = this.record(fields);
    for (const mask of [15, 16, 32, 64, 128]) this.copyBits(record, input, mask);
    this.head(record, input.head);
    for (const mask of [256, 512, 1024, 2048]) this.copyBits(record, input, mask);
    return record;
  }
  copy(input: NativeCrtDNameRecord, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameCopyConstructor', () => this.copyRaw(input, fields));
  }
  private assignRaw(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord): NativeCrtDNameRecord {
    this.own(target); this.own(input);
    if (target.isValid()) {
      for (const mask of [15, 16, 32, 64, 128, 2048]) this.copyBits(target, input, mask);
      this.head(target, input.head);
    }
    return target;
  }
  assign(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameAssign', () => this.assignRaw(target, input));
  }
  fromPointer(input: NativeCrtDNameRecord | null, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnamePointerConstructor', () => {
      if (input) this.own(input); const record = this.record(fields);
      if (input) { const slice = this.allocation(12); const node = slice ? this.indirectNode(slice, input) : null;
        this.head(record, node); this.setBits(record, 15, node ? 0 : 3); }
      else { this.setBits(record, 15, 0); this.head(record, null); }
      this.setBits(record, 0xff0, 0); return record;
    });
  }
  private clone(node: NativeCrtDNameNode): NativeCrtDNameNode | null {
    this.ownNode(node, false); const slice = this.allocation(12); if (!slice) return null;
    const recordSlice = this.allocation(8); let record: NativeCrtDNameRecord | null = null;
    if (recordSlice) { record = this.record(recordSlice.fields); this.setBits(record, 0xfff, 0); this.head(record, node); }
    return this.indirectNode(slice, record);
  }
  private ownNode(node: NativeCrtDNameNode, dispatch = true): void {
    this.check('DNameNode.virtual');
    if (!this.nodes.has(node) || node.factory !== this) throw new Error('CRT DName node is not owned');
    if (!dispatch) return;
    const address = parseInt(source.constBytes[{ char: 'charNodeVtable', text: 'textNodeVtable',
      indirect: 'indirectNodeVtable', status: 'statusNodeVtable' }[node.kind]]!.address, 16);
    if (node.fields.readUnsigned(0) !== address) throw new Error('CRT DName virtual table differs from retained source');
    // The actual three virtual function DWORDs are admitted source bytes.
    this.vtables[node.kind].readUnsigned(0);
  }
  private *chain(head: NativeCrtDNameNode | null): Generator<NativeCrtDNameNode> {
    const seen = new Set<NativeCrtDNameNode>();
    for (let node = head; node; node = node.next) {
      this.ownNode(node, false); if (seen.has(node)) throw new Error('Cyclic CRT DName node chain is unsupported');
      seen.add(node); yield node;
    }
  }
  private nodeAppend(target: NativeCrtDNameNode, input: NativeCrtDNameNode | null): void {
    if (!input) return;
    let last = target; for (const node of this.chain(target)) last = node;
    this.check('DNameNode.next.store'); last.fields.pointer<NativeCrtDNameNode>(4).set(input);
  }
  private assignStatusRaw(target: NativeCrtDNameRecord, status: number): NativeCrtDNameRecord {
    this.own(target);
    if (status === 1 || status === 3) { this.head(target, null); if (target.status !== 3) this.setBits(target, 15, status); }
    else if (target.isValid()) {
      this.setBits(target, 0x8f0, 0); const node = this.statusNode(status); this.head(target, node);
      if (!node) this.setBits(target, 12, 0), this.setBits(target, 3, 3);
    }
    return target;
  }
  assignStatus(target: NativeCrtDNameRecord, status: number): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameAssignStatus', () => this.assignStatusRaw(target, status));
  }
  private appendStatusRaw(target: NativeCrtDNameRecord, status: number): NativeCrtDNameRecord {
    this.own(target);
    if (target.isEmpty() || status === 1 || status === 3) return this.assignStatusRaw(target, status);
    const statusNode = this.statusNode(status);
    if (!statusNode) this.head(target, null);
    else { const node = this.clone(target.head!); this.head(target, node); if (node) this.nodeAppend(node, statusNode); }
    if (!target.head) this.setBits(target, 12, 0), this.setBits(target, 3, 3);
    return target;
  }
  appendStatus(target: NativeCrtDNameRecord, status: number): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameConcatStatus', () => this.appendStatusRaw(target, status));
  }
  private appendRaw(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord): NativeCrtDNameRecord {
    this.own(target); this.own(input);
    if (input.isEmpty()) return this.appendStatusRaw(target, input.status);
    if (target.isEmpty()) return this.assignRaw(target, input);
    const clone = this.clone(target.head!); this.head(target, clone);
    if (clone) this.nodeAppend(clone, input.head); else this.setBits(target, 12, 0), this.setBits(target, 3, 3);
    return target;
  }
  append(target: NativeCrtDNameRecord, input: NativeCrtDNameRecord): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnameConcat', () => this.appendRaw(target, input));
  }
  plus(left: NativeCrtDNameRecord, right: NativeCrtDNameRecord, fields?: NativeHeapObjectViews): NativeValue<NativeCrtDNameRecord> {
    return this.run('dnamePlus', () => {
      const result = this.copyRaw(left, fields);
      if (result.isEmpty()) return this.assignRaw(result, right);
      return right.isEmpty() ? this.appendStatusRaw(result, right.status) : this.appendRaw(result, right);
    });
  }
  private walk<T>(record: NativeCrtDNameRecord, visited: Set<NativeCrtDNameRecord>, body: () => T): T {
    this.own(record); if (visited.has(record)) throw new Error('Cyclic indirect CRT DName graph is unsupported');
    visited.add(record); try { return body(); } finally { visited.delete(record); }
  }
  private nodeLength(node: NativeCrtDNameNode, visited: Set<NativeCrtDNameRecord>): number {
    this.ownNode(node);
    if (node.kind === 'char') return 1;
    if (node.kind === 'text' || node.kind === 'status') return node.fields.readUnsigned(12) | 0;
    const record = node.fields.pointer<NativeCrtDNameRecord>(8).get(); return record ? this.lengthRaw(record, visited) : 0;
  }
  private lengthRaw(record: NativeCrtDNameRecord, visited: Set<NativeCrtDNameRecord>): number {
    return this.walk(record, visited, () => {
      if (record.isEmpty()) return 0; let sum = 0;
      for (const node of this.chain(record.head)) sum = (sum + this.nodeLength(node, visited)) | 0;
      return sum;
    });
  }
  length(record: NativeCrtDNameRecord): number { return this.lengthRaw(record, new Set()); }
  private lastRaw(record: NativeCrtDNameRecord, visited: Set<NativeCrtDNameRecord>): number {
    return this.walk(record, visited, () => {
      if (record.isEmpty()) return 0;
      let node: NativeCrtDNameNode | null = null;
      for (const item of this.chain(record.head)) if (this.nodeLength(item, visited) !== 0) node = item;
      if (!node) return 0;
      if (node.kind === 'char') return node.fields.readUnsigned(8, 1);
      if (node.kind === 'status') return node.fields.readUnsigned(8) === 2 ? 32 : 0;
      if (node.kind === 'indirect') { const ref = node.fields.pointer<NativeCrtDNameRecord>(8).get(); return ref ? this.lastRaw(ref, visited) : 0; }
      const length = node.fields.readUnsigned(12); if (!length) return 0;
      const payload = node.fields.pointer<NativeCrtScratchSlice>(8).get();
      if (!payload) throw new Error('Nonzero text-node length has NULL payload');
      return payload.fields.readUnsigned(length - 1, 1);
    });
  }
  lastChar(record: NativeCrtDNameRecord): number { return this.lastRaw(record, new Set()); }
  private nodeString(node: NativeCrtDNameNode, destination: NativeCrtBytePointer, count: number,
    visited: Set<NativeCrtDNameRecord>): NativeCrtBytePointer | null {
    this.ownNode(node); if (!count) return null;
    if (node.kind === 'char') { destination.fields.writeUnsigned(destination.offset, node.fields.readUnsigned(8, 1), 1); return destination; }
    if (node.kind === 'indirect') {
      const record = node.fields.pointer<NativeCrtDNameRecord>(8).get();
      return record ? this.stringRaw(record, destination, count, visited) : null;
    }
    count = Math.min(count, node.fields.readUnsigned(12) | 0);
    if (!count) return null;
    if (node.kind === 'status') {
      if (node.fields.readUnsigned(8) !== 2) return null;
      this.strncpy({ fields: this.truncated, offset: 0 }, destination, count); return destination;
    }
    const payload = node.fields.pointer<NativeCrtScratchSlice>(8).get(); if (!payload) return null;
    this.strncpy({ fields: payload.fields, offset: 0 }, destination, count); return destination;
  }
  private stringRaw(record: NativeCrtDNameRecord, destination: NativeCrtBytePointer | null, maxBytes: number,
    visited: Set<NativeCrtDNameRecord>): NativeCrtBytePointer | null {
    return this.walk(record, visited, () => {
      uint(maxBytes); let remaining = maxBytes, cursor = destination;
      if (!record.isEmpty()) {
        if (!destination) {
          remaining = (this.lengthRaw(record, new Set()) + 1) >>> 0;
          const slice = this.allocation(remaining); if (!slice) return null;
          destination = { fields: slice.fields, offset: 0 }; cursor = destination;
        }
        for (const node of this.chain(record.head)) {
          if ((remaining | 0) <= 0) break;
          let count = this.nodeLength(node, visited);
          if (count) {
            if (((remaining - count) | 0) < 0) count = remaining;
            if (this.nodeString(node, cursor!, count, visited)) {
              remaining = (remaining - count) >>> 0; cursor = { fields: cursor!.fields, offset: cursor!.offset + count };
            }
          }
        }
      } else if (!destination) return null;
      this.check('DName.getString.NUL'); cursor!.fields.writeUnsigned(cursor!.offset, 0, 1); return destination;
    });
  }
  writeString(record: NativeCrtDNameRecord, destination: NativeCrtBytePointer | null,
    maxBytes: number): NativeValue<NativeCrtBytePointer | null> {
    return this.run('dnameGetString', () => this.stringRaw(record, destination, maxBytes, new Set()));
  }
  /** Replicator calls this inside its own operation, following allocation then
   * copy-constructor source order without an extra stack allocation. */
  replicate(input: NativeCrtDNameRecord): NativeCrtDNameRecord | null {
    const slice = this.allocation(8); return slice ? this.copyRaw(input, slice.fields) : null;
  }
}

export class NativeCrtReplicator {
  readonly fields: NativeHeapObjectViews;
  private invalid: NativeCrtDNameRecord | null = null;
  private unavailable: NativeCrtDNameRecord | null = null;
  constructor(readonly factory: NativeCrtDNameFactory, fields: NativeHeapObjectViews) {
    this.fields = subview(fields, 0, 60);
  }
  construct(): NativeValue<void> {
    const invalid = this.factory.status(3, subview(this.fields, 44, 8));
    if (!invalid.known) return invalid; this.invalid = invalid.value;
    const unavailable = this.factory.status(1, subview(this.fields, 52, 8));
    if (!unavailable.known) return unavailable; this.unavailable = unavailable.value;
    return this.factory.run('replicatorConstructor.count', () => this.fields.writeUnsigned(0, 0xffffffff));
  }
  append(input: NativeCrtDNameRecord): NativeValue<void> {
    return this.factory.run('replicatorAppend', () => {
      if (this.fields.readUnsigned(0) !== 9 && !input.isEmpty()) {
        const record = this.factory.replicate(input);
        if (record) {
          const count = (this.fields.readUnsigned(0) + 1) >>> 0;
          this.fields.writeUnsigned(0, count); this.fields.pointer<NativeCrtDNameRecord>(4 + count * 4).set(record);
        }
      }
    });
  }
  get(index: number): NativeValue<NativeCrtDNameRecord> {
    return this.factory.run('replicatorLookup', () => {
      uint(index);
      if (!this.invalid || !this.unavailable) throw new Error('Replicator constructor prefix is incomplete');
      if (index >= 10) return this.invalid;
      const count = this.fields.readUnsigned(0);
      if (count === 0xffffffff || (count | 0) < index) return this.unavailable;
      const record = this.fields.pointer<NativeCrtDNameRecord>(4 + index * 4).get();
      if (!record) throw new Error('Replicator selected slot has NULL DName record'); return record;
    });
  }
}
