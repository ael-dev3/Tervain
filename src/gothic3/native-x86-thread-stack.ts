/** Retained virtual x86 stack/register/FS state. Numerical addresses stay
 * unknown; private relative-address and expression capabilities own relations. */
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { nativeGameImageReceipt } from './native-game-crt-profile';
import { NativeGameCrtIoInit } from './native-game-crt-ioinit';
import type { NativeX86ThreadStackSelection } from './native-x86-thread-stack-profile';
import type { NativeStartupInfoCallGrant } from './native-win32-startup-io';
import type { NativeWin32HeapCapability } from './native-runtime-platform';
import type { NativeBytePointer } from './native-pointer-geometry';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const token = Object.freeze({});
export type NativeX86Register = 'EAX' | 'EBX' | 'ECX' | 'EDX' | 'ESI' | 'EDI' | 'EBP' | 'ESP';
const registers: readonly NativeX86Register[] = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP'];
export interface NativeX86Word32 { readonly identity: object; }
export interface NativeHeapAllocCallGrant { readonly identity: object; }
export type NativeX86Condition = 'z' | 'nz' | 'be' | 'a' | 'c';
type Width = 1 | 2 | 4;
interface Allocation { readonly fields: NativeHeapObjectViews; readonly heap: NativeWin32HeapCapability; readonly crt: NativeModuleCrtOwner; }
type WordRecord = Readonly<{ value: number; mask: number; provenance?:
  Readonly<{ kind: 'stack'; offset: number }> |
  Readonly<{ kind: 'heap'; heap: NativeWin32HeapCapability }> |
  Readonly<{ kind: 'allocation'; allocation: Allocation; offset: number; pointer: NativeBytePointer }> |
  Readonly<{ kind: 'source'; type: 'code' | 'image'; address: string; fields?: NativeHeapObjectViews }> |
  Readonly<{ kind: 'xor'; left: NativeX86Word32; right: NativeX86Word32 }> }>;
interface Slot { readonly word: NativeX86Word32; readonly bytes: readonly number[]; readonly masks: readonly number[]; }
interface Binding { readonly crt: NativeModuleCrtOwner; readonly owner: NativeGameCrtIoInit; readonly controller: object; }
interface PhysicalProof { readonly backing: NativeMemoryBacking; readonly identity: object; readonly rootBytes: Uint8Array;
  readonly rootMasks: Uint8Array; readonly bytes: Uint8Array; readonly masks: Uint8Array; readonly view: DataView; readonly length: number; }
interface StartupCall {
  readonly stack: NativeX86ThreadStack; readonly controller: object; readonly fields: NativeHeapObjectViews;
  readonly offset: number; readonly argument: NativeX86Word32; readonly position: number;
  readonly returnWord: NativeX86Word32; phase: 'pending' | 'returned';
}
interface HeapCall {
  readonly stack: NativeX86ThreadStack; readonly controller: object; readonly crt: NativeModuleCrtOwner;
  readonly heap: NativeWin32HeapCapability; readonly heapWord: NativeX86Word32;
  readonly flagsWord: NativeX86Word32; readonly bytesWord: NativeX86Word32;
  readonly bytes: number; readonly position: number; readonly frame: number; readonly returnWord: NativeX86Word32;
  phase: 'pending' | 'returned';
}
const graphs = new WeakMap<NativeRuntimePlatform, NativeX86ThreadStack>();
const retirements = new WeakMap<NativeX86ThreadStack, () => void>();
const startupCalls = new WeakMap<NativeStartupInfoCallGrant, StartupCall>();
const heapCalls = new WeakMap<NativeHeapAllocCallGrant, HeapCall>();
const constructionToken = token;
function physical(bytes: number): NativeHeapObjectViews {
  const backing: NativeMemoryBacking = { identity: Object.freeze({}), bytes: new Uint8Array(bytes), knownMask: new Uint8Array(bytes), freed: false };
  Object.defineProperties(backing, { identity: { writable: false, configurable: false }, bytes: { writable: false, configurable: false },
    knownMask: { writable: false, configurable: false }, freed: { writable: true, configurable: false } });
  const fields = new NativeHeapObjectViews(backing);
  Object.freeze(fields.view); Object.preventExtensions(fields.bytes); Object.preventExtensions(fields.knownMask); Object.freeze(fields);
  return fields;
}
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); } catch { return 'Virtual x86 state escaped without an owned reason'; }
}

export class NativeX86ThreadStack {
  readonly #platform: NativeRuntimePlatform;
  readonly #selection: Readonly<NativeX86ThreadStackSelection>;
  readonly #stack: NativeHeapObjectViews;
  // Only arithmetic flags are owned here. The separately retained Runtime DF
  // remains its declared logical-thread state; no full numerical EFLAGS seed.
  readonly #bank = physical(40);
  readonly #words = new WeakMap<NativeX86Word32, WordRecord>();
  readonly #slots = new Map<NativeHeapObjectViews, Map<number, Slot>>();
  readonly #images = new Map<string, NativeX86Word32>();
  readonly #imageReads = new Map<NativeHeapObjectViews, Map<number, Slot>>();
  readonly #storage = new WeakMap<NativeHeapObjectViews, PhysicalProof>();
  readonly #startupViews = new Map<number, NativeHeapObjectViews>();
  readonly #nativePointers = new WeakMap<object, NativeX86Word32>();
  readonly #calls: { site: string; returnWord: NativeX86Word32; position: number; returned: boolean }[] = [];
  #startupGrant: NativeStartupInfoCallGrant | null = null;
  #startupInfoCallPushed = false;
  #startupInfoWriterCalled = false;
  #startupInfoWriterReturned = false;
  #heapGrant: NativeHeapAllocCallGrant | null = null;
  #heapAllocCallPushed = false;
  #heapAllocCalled = false;
  #heapAllocReturned = false;
  #heapAllocBlockAllocated = false;
  #binding: Binding | null = null;
  #phase: 'cold' | 'running' | 'blocked' | 'retired' = 'cold';
  #boundary: string | null = null;
  #executing = false;
  #currentPc: NativeX86Word32 | null = null;
  readonly #trace: string[] = [];
  private constructor(platform: NativeRuntimePlatform, selection: Readonly<NativeX86ThreadStackSelection>, admitted: object) {
    if (admitted !== constructionToken || new.target !== NativeX86ThreadStack) throw new Error('Private actual x86 thread-stack construction required');
    this.#platform = platform; this.#selection = selection; this.#stack = physical(selection.reservationBytes);
    for (const fields of [this.#stack, this.#bank]) this.#storage.set(fields, Object.freeze({
      backing: fields.backing as NativeMemoryBacking, identity: fields.backing.identity,
      rootBytes: fields.backing.bytes, rootMasks: fields.backing.knownMask, bytes: fields.bytes,
      masks: fields.knownMask, view: fields.view, length: fields.bytes.length,
    }));
    for (const name of registers) this.#store(this.#bank, registers.indexOf(name) * 4,
      name === 'ESP' ? this.#mint(0, 0, { kind: 'stack', offset: selection.reservationBytes }) : this.#mint(0, 0));
    this.#store(this.#bank, 32, this.#mint(0, 0));
    this.#store(this.#bank, 36, this.#mint(0, 0));
    retirements.set(this, () => {
      this.#phase = 'retired'; this.#boundary ??= 'Actual logical-thread stack lifetime ended';
      this.#stack.backing.freed = true; this.#bank.backing.freed = true;
    }); Object.freeze(this);
  }
  static forPlatform(platform: NativeRuntimePlatform): NativeValue<NativeX86ThreadStack> {
    const selected = NativeRuntimePlatform.threadStackSelectionForPlatform(platform); if (!selected.known) return selected;
    const retained = graphs.get(platform);
    if (retained) return retained.#selection === selected.value && retained.#phase !== 'blocked' && retained.#phase !== 'retired'
      ? known(retained) : unknown(retained.#boundary ?? 'Retained x86 graph cannot be replaced or restarted');
    try { const graph = new NativeX86ThreadStack(platform, selected.value, constructionToken); graphs.set(platform, graph); return known(graph); }
    catch (error) { return unknown(reason(error)); }
  }
  static bindForIoOwner(stack: NativeX86ThreadStack, crt: NativeModuleCrtOwner, owner: NativeGameCrtIoInit,
    controller: object): NativeValue<void> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || !stack || graphs.get(crt.host.platform as NativeRuntimePlatform) !== stack) return unknown('Actual selected same-platform x86 graph required');
    const proof = NativeGameCrtIoInit.canonicalControllerForCrt(owner, crt, controller, 'bind'); if (!proof.known) return proof;
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game' || crt.host.platform !== stack.#platform || stack.#phase !== 'cold') {
      return unknown('Actual cold same-Game x86 controller binding required');
    }
    const selected = NativeRuntimePlatform.threadStackSelectionForPlatform(stack.#platform);
    if (!selected.known || selected.value !== stack.#selection) return unknown('Actual live selected x86 thread state required');
    if (stack.#binding) return stack.#binding.owner === owner && stack.#binding.crt === crt && stack.#binding.controller === controller
      ? known(undefined) : unknown('Retained x86 controller cannot rebind');
    stack.#binding = Object.freeze({ crt, owner, controller }); return known(undefined);
  }
  static canonicalStartupInfoCallForPlatform(platform: NativeRuntimePlatform,
    grant: NativeStartupInfoCallGrant): NativeValue<void> {
    const invocation = NativeRuntimePlatform.canonicalStartupInfoInvocationForPlatform(platform, grant);
    if (!invocation.known) return invocation;
    const call = startupCalls.get(grant);
    if (!call || graphs.get(platform) !== call.stack) return unknown('Actual same-platform privately minted startup call required');
    try { call.stack.#startupProof(grant, call); return known(undefined); }
    catch (error) { return unknown(reason(error)); }
  }
  static heapAllocArgumentsForPlatform(platform: NativeRuntimePlatform, grant: NativeHeapAllocCallGrant): NativeValue<Readonly<{
    crt: NativeModuleCrtOwner; heap: NativeWin32HeapCapability; flags: 8; bytes: number;
  }>> {
    const active = NativeRuntimePlatform.canonicalHeapAllocInvocationForPlatform(platform, grant); if (!active.known) return active;
    const call = heapCalls.get(grant);
    if (!call || graphs.get(platform) !== call.stack) return unknown('Actual private same-platform HeapAlloc call required');
    try { call.stack.#heapProof(grant, call); return known(Object.freeze({ crt: call.crt, heap: call.heap, flags: 8, bytes: call.bytes })); }
    catch (error) { return unknown(reason(error)); }
  }
  /** Only the Runtime's exact currently executing endpoint may write the
   * privately resolved frame. This never exposes its alias or controller. */
  static writeStartupInfoForCall(platform: NativeRuntimePlatform, grant: NativeStartupInfoCallGrant,
    offset: number, width: 1 | 2 | 4, value: number, mask: number): NativeValue<void> {
    const admitted = NativeX86ThreadStack.canonicalStartupInfoCallForPlatform(platform, grant); if (!admitted.known) return admitted;
    const call = startupCalls.get(grant)!;
    try {
      const maximum = width === 4 ? 0xffffffff : width === 2 ? 0xffff : 0xff;
      if (![1, 2, 4].includes(width) || !Number.isSafeInteger(offset) || offset < 0 || offset + width > 68 ||
          !Number.isInteger(value) || value < 0 || value > maximum || !Number.isInteger(mask) || mask < 0 || mask > maximum) {
        throw new Error('Actual bounded STARTUPINFOA byte/word/dword masked store required');
      }
      if (offset < 0x38 && offset + width > 0x34 &&
          (offset !== 0x34 || width !== 4 || value !== 0 || mask !== 0xffffffff)) {
        throw new Error('STARTUPINFOA non-NULL reserved pointer has no owned block capability');
      }
      const stack = call.stack, position = call.offset + offset;
      stack.#physical(stack.#stack); stack.#physical(stack.#bank);
      const slots = stack.#slots.get(stack.#stack);
      if (slots) for (const begin of slots.keys()) if (begin < position + width && begin + 4 > position) slots.delete(begin);
      const current = NativeHeapObjectViews.prototype.maskedWord.call(stack.#stack, position, width);
      current.value = value; current.knownMask = mask;
      stack.#startupProof(grant, call); return known(undefined);
    } catch (error) { return unknown(reason(error)); }
  }
  #startupProof(grant: NativeStartupInfoCallGrant, call: StartupCall): void {
    this.#check(call.controller);
    const binding = this.#binding!, actual = NativeGameCrtIoInit.canonicalStartupInfoCallForCrt(binding.owner, binding.crt, call.controller);
    if (!actual.known) throw new Error(actual.reason);
    const top = this.#calls.at(-1), argument = this.#load(this.#stack, call.position + 4);
    if (!this.#executing || this.#startupGrant !== grant || call.phase !== 'pending' || call.stack !== this ||
        call.fields !== actual.value || this.#startupViews.get(call.offset) !== call.fields ||
        call.position !== call.offset - 0x18 ||
        this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position ||
        this.#address(this.#load(this.#bank, this.#reg('EBP'))) - 0x64 !== call.offset ||
        argument !== call.argument || this.#address(argument) !== call.offset ||
        !top || top.returned || top.site !== '20474314' || top.position !== call.position || top.returnWord !== call.returnWord ||
        this.#load(this.#stack, call.position) !== call.returnWord ||
        call.fields.backing !== this.#stack.backing || call.fields.bytes.buffer !== this.#stack.bytes.buffer ||
        call.fields.bytes.byteOffset !== this.#stack.bytes.byteOffset + call.offset || call.fields.bytes.length !== 68 ||
        call.fields.knownMask.buffer !== this.#stack.knownMask.buffer ||
        call.fields.knownMask.byteOffset !== this.#stack.knownMask.byteOffset + call.offset || call.fields.knownMask.length !== 68) {
      throw new Error('Actual pending GetStartupInfoA call/current argument/private frame alias required');
    }
  }
  #heapProof(grant: NativeHeapAllocCallGrant, call: HeapCall): void {
    this.#check(call.controller);
    const binding = this.#binding!, site = NativeGameCrtIoInit.canonicalHeapAllocCallForCrt(binding.owner, binding.crt, call.controller);
    if (!site.known) throw new Error(site.reason);
    const top = this.#calls.at(-1), currentHeap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(call.crt, this.#platform);
    if (!currentHeap.known) throw new Error(currentHeap.reason);
    if (!this.#executing || this.#heapGrant !== grant || call.stack !== this || call.phase !== 'pending' || binding.crt !== call.crt ||
        currentHeap.value !== call.heap || this.#address(this.#load(this.#bank, this.#reg('EBP'))) !== call.frame ||
        this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position || call.position !== call.frame - 0x3c ||
        this.#load(this.#stack, call.position + 4) !== call.heapWord || this.#load(this.#stack, call.position + 8) !== call.flagsWord ||
        this.#load(this.#stack, call.position + 12) !== call.bytesWord || this.#numeric(call.flagsWord, 4) !== 8 ||
        this.#numeric(call.bytesWord, 4) !== call.bytes || this.#numeric(this.#load(this.#bank, this.#reg('ESI')), 4) !== call.bytes ||
        !top || top.returned || top.site !== '20477ce8' || top.position !== call.position || top.returnWord !== call.returnWord ||
        this.#load(this.#stack, call.position) !== call.returnWord) throw new Error('Actual nested HeapAlloc frame/current arguments/pending return required');
    const incoming = [...this.#calls].reverse().find(entry => !entry.returned && entry.site === '204683dc');
    const outer = [...this.#calls].reverse().find(entry => !entry.returned && entry.site === '20474327');
    if (!incoming || !outer || incoming.position !== call.frame + 4 || outer.position !== call.frame + 0x1c ||
        this.#load(this.#stack, call.frame + 4) !== incoming.returnWord ||
        this.#load(this.#stack, outer.position) !== outer.returnWord ||
        this.#record(call.heapWord).provenance?.kind !== 'heap' ||
        (this.#record(call.heapWord).provenance as { heap: NativeWin32HeapCapability }).heap !== call.heap ||
        this.#address(this.#load(this.#bank, 32)) !== call.frame - 0x10) {
      throw new Error('Actual nested calloc call and FS registration required');
    }
  }
  #controllerProof(controller: object, mode: 'invoke' | 'retain' = 'invoke'): void {
    const binding = this.#binding;
    if (!binding || binding.controller !== controller || graphs.get(this.#platform) !== this) throw new Error('Actual private bound x86 controller required');
    const proof = NativeGameCrtIoInit.canonicalControllerForCrt(binding.owner, binding.crt, controller, mode);
    if (!proof.known) throw new Error(proof.reason);
    if (mode === 'retain') return;
    const selection = NativeRuntimePlatform.threadStackSelectionForPlatform(this.#platform);
    if (!selection.known || selection.value !== this.#selection) throw new Error('Actual active same-logical-thread x86 lifetime required');
  }
  #check(controller: object): void {
    this.#controllerProof(controller);
    if (this.#phase !== 'running') throw new Error(this.#boundary ?? 'Retained x86 graph is not executing');
    this.#physical(this.#stack); this.#physical(this.#bank);
  }
  #physical(fields: NativeHeapObjectViews): void {
    const proof = this.#storage.get(fields);
    try {
      if (!proof || fields.backing !== proof.backing || proof.backing.freed || proof.backing.identity !== proof.identity ||
          proof.backing.bytes !== proof.rootBytes || proof.backing.knownMask !== proof.rootMasks || fields.bytes !== proof.bytes ||
          fields.knownMask !== proof.masks || fields.view !== proof.view || fields.bytes.length !== proof.length ||
          fields.knownMask.length !== proof.length || proof.rootBytes.length !== proof.length || proof.rootMasks.length !== proof.length ||
          fields.bytes.buffer !== proof.rootBytes.buffer || fields.bytes.byteOffset !== proof.rootBytes.byteOffset ||
          fields.knownMask.buffer !== proof.rootMasks.buffer || fields.knownMask.byteOffset !== proof.rootMasks.byteOffset ||
          Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')!.get!.call(fields.view) !== fields.bytes.buffer ||
          Object.getOwnPropertyDescriptor(DataView.prototype, 'byteOffset')!.get!.call(fields.view) !== fields.bytes.byteOffset ||
          Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength')!.get!.call(fields.view) !== proof.length) {
        throw new Error('Actual live retained x86 physical stack/register storage required');
      }
    } catch (error) { this.#phase = 'blocked'; this.#boundary ??= reason(error); throw error; }
  }
  #run<T>(controller: object, body: () => T): NativeValue<T> {
    try { this.#check(controller); } catch (error) { return unknown(reason(error)); }
    try {
      if (this.#executing) { this.#phase = 'blocked'; throw new Error('Reentry into retained x86 operation cannot replay'); }
      this.#executing = true;
      try { const value = body(); this.#check(controller); return known(value); }
      finally { this.#executing = false; }
    } catch (error) { this.#boundary ??= reason(error); this.#phase = 'blocked'; return unknown(this.#boundary); }
  }
  #mint(value: number, mask: number, provenance?: WordRecord['provenance']): NativeX86Word32 {
    const word = Object.freeze({ identity: Object.freeze({}) });
    this.#words.set(word, Object.freeze({ value: value >>> 0, mask: mask >>> 0, provenance: provenance && Object.freeze(provenance) })); return word;
  }
  #record(word: NativeX86Word32): WordRecord {
    const record = this.#words.get(word); if (!record) throw new Error('Actual same-graph retained x86 word required'); return record;
  }
  #maximum(width: Width): number {
    if (![1, 2, 4].includes(width)) throw new Error('Actual x86 BYTE/WORD/DWORD width required');
    return width === 4 ? 0xffffffff : width === 2 ? 0xffff : 0xff;
  }
  #numeric(word: NativeX86Word32, width: Width): number {
    const record = this.#record(word), maximum = this.#maximum(width);
    if (((record.mask & maximum) >>> 0) !== maximum) throw new Error('Current known x86 operand bits required');
    return (record.value & maximum) >>> 0;
  }
  #allocationLive(allocation: Allocation, offset: number, bytes: number): void {
    if (allocation.crt !== this.#binding!.crt || !Number.isSafeInteger(offset) || offset < 0 || offset + bytes > allocation.fields.bytes.length) {
      throw new Error('Actual contained same-Game allocation relation required');
    }
    const heap = NativeModuleCrtOwner.canonicalGameHeapForAllocation(allocation.crt, this.#platform,
      Object.freeze({ fields: allocation.fields, offset }));
    if (!heap.known || heap.value !== allocation.heap) throw new Error(heap.known ? 'Current Game allocation heap changed' : heap.reason);
    const access = NativeRuntimePlatform.canonicalGameHeapDestination(this.#platform, allocation.crt,
      Object.freeze({ fields: allocation.fields, offset }), bytes);
    if (!access.known) throw new Error(access.reason);
  }
  #allocationWord(allocation: Allocation, offset: number): NativeX86Word32 {
    this.#allocationLive(allocation, offset, 0);
    const pointer = Object.freeze({ fields: allocation.fields, offset });
    const word = this.#mint(0, 0, { kind: 'allocation', allocation, offset, pointer }); this.#nativePointers.set(pointer, word); return word;
  }
  #memory(address: NativeX86Word32, width: Width): { fields: NativeHeapObjectViews; offset: number } {
    const provenance = this.#record(address).provenance;
    if (provenance?.kind === 'stack') {
      this.#physical(this.#stack);
      if (provenance.offset < 0 || provenance.offset + width > this.#stack.bytes.length) throw new Error('Current contained stack access required');
      return { fields: this.#stack, offset: provenance.offset };
    }
    if (provenance?.kind === 'allocation') {
      this.#allocationLive(provenance.allocation, provenance.offset, width);
      return { fields: provenance.allocation.fields, offset: provenance.offset };
    }
    throw new Error('Actual owned stack/allocation address required for memory access');
  }
  #invalidate(fields: NativeHeapObjectViews, offset: number, width: Width): void {
    const slots = this.#slots.get(fields);
    if (slots) for (const position of slots.keys()) if (position < offset + width && position + 4 > offset) slots.delete(position);
    const cells = this.#imageReads.get(fields);
    if (cells) for (const position of cells.keys()) if (position < offset + width && position + 4 > offset) cells.delete(position);
  }
  #liveWord(word: NativeX86Word32): WordRecord {
    const record = this.#record(word), p = record.provenance;
    if (p?.kind === 'allocation') this.#allocationLive(p.allocation, p.offset, 0);
    if (p?.kind === 'heap') {
      const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(this.#binding!.crt, this.#platform);
      if (!heap.known || heap.value !== p.heap) throw new Error(heap.known ? 'Current heap word differs from its actual Game heap' : heap.reason);
    }
    return record;
  }
  #flags(value: number, mask: number): void { this.#store(this.#bank, 36, this.#mint(value & 0x8d5, mask & 0x8d5)); }
  #logicalFlags(value: number, mask: number, width: Width): void {
    const maximum = this.#maximum(width), sign = width === 4 ? 0x80000000 : width === 2 ? 0x8000 : 0x80;
    const bits = value & maximum, knownBits = mask & maximum;
    let flags = 0, known = 0x801;
    if (((knownBits & bits) >>> 0) !== 0) known |= 0x40;
    else if ((knownBits >>> 0) === maximum) { known |= 0x40; flags |= 0x40; }
    if ((knownBits & sign) !== 0) { known |= 0x80; if ((bits & sign) !== 0) flags |= 0x80; }
    if ((knownBits & 255) === 255) { known |= 4; if (this.#parity(bits & 255)) flags |= 4; }
    this.#flags(flags, known);
  }
  #parity(byte: number): boolean { let bits = 0; for (let i = 0; i < 8; i++) bits += (byte >>> i) & 1; return bits % 2 === 0; }
  #arithmeticFlags(a: number, b: number, result: number, width: Width, subtract: boolean, carry = 0): void {
    const maximum = this.#maximum(width), sign = width === 4 ? 0x80000000 : width === 2 ? 0x8000 : 0x80;
    const cf = subtract ? BigInt(a) < BigInt(b) + BigInt(carry) : BigInt(a) + BigInt(b) + BigInt(carry) > BigInt(maximum);
    const of = subtract ? ((a ^ b) & (a ^ result) & sign) !== 0 : ((~(a ^ b)) & (a ^ result) & sign) !== 0;
    this.#flags((cf ? 1 : 0) | (this.#parity(result & 255) ? 4 : 0) | (((a ^ b ^ result) & 16) ? 16 : 0) |
      (result === 0 ? 0x40 : 0) | ((result & sign) ? 0x80 : 0) | (of ? 0x800 : 0), 0x8d5);
  }
  #offsetWord(word: NativeX86Word32, displacement: number): NativeX86Word32 {
    const p = this.#liveWord(word).provenance;
    if (!Number.isSafeInteger(displacement)) throw new Error('Exact signed owned pointer displacement required');
    if (p?.kind === 'allocation') return this.#allocationWord(p.allocation, p.offset + displacement);
    if (p?.kind !== 'stack') throw new Error('Actual owned stack/allocation pointer arithmetic required');
    const offset = p.offset + displacement;
    if (offset < 0 || offset > this.#stack.bytes.length) throw new Error('Opaque relative stack address exceeds reservation');
    return this.#mint(0, 0, { kind: 'stack', offset });
  }
  #store(fields: NativeHeapObjectViews, offset: number, word: NativeX86Word32): void {
    const record = this.#record(word);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + 4 > fields.bytes.length) throw new Error('Owned physical x86 DWORD store outside reservation');
    let slots = this.#slots.get(fields); if (!slots) { slots = new Map(); this.#slots.set(fields, slots); }
    for (const position of slots.keys()) if (position < offset + 4 && position + 4 > offset) slots.delete(position);
    const physicalWord = NativeHeapObjectViews.prototype.maskedWord.call(fields, offset);
    physicalWord.value = record.value; physicalWord.knownMask = record.mask;
    slots.set(offset, Object.freeze({ word, bytes: Object.freeze(Array.from(fields.bytes.subarray(offset, offset + 4))),
      masks: Object.freeze(Array.from(fields.knownMask.subarray(offset, offset + 4))) }));
  }
  #load(fields: NativeHeapObjectViews, offset: number): NativeX86Word32 {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset + 4 > fields.bytes.length) throw new Error('Owned physical x86 DWORD load outside reservation');
    const slot = this.#slots.get(fields)?.get(offset);
    if (slot) {
      if (slot.bytes.some((byte, index) => byte !== fields.bytes[offset + index]) || slot.masks.some((mask, index) => mask !== fields.knownMask[offset + index])) {
        this.#slots.get(fields)!.delete(offset); throw new Error('Retained x86 expression slot changed outside its actual store');
      }
      return slot.word;
    }
    const word = NativeHeapObjectViews.prototype.maskedWord.call(fields, offset); return this.#mint(word.value, word.knownMask);
  }
  #reg(name: NativeX86Register): number {
    const index = registers.indexOf(name); if (index < 0) throw new Error('Actual admitted x86 register required'); return index * 4;
  }
  #address(word: NativeX86Word32): number {
    const record = this.#record(word); if (record.provenance?.kind !== 'stack') throw new Error('Actual opaque relative stack address required');
    return record.provenance.offset;
  }
  #push(word: NativeX86Word32): void {
    const esp = this.#load(this.#bank, this.#reg('ESP')), offset = this.#address(esp) - 4;
    this.#store(this.#stack, offset, word); this.#store(this.#bank, this.#reg('ESP'), this.#mint(0, 0, { kind: 'stack', offset }));
  }
  #source(type: 'code' | 'image', address: string): NativeX86Word32 {
    if ((type !== 'code' && type !== 'image') || !/^[0-9a-f]{8}$/.test(address)) throw new Error('Admitted source-address metadata required');
    if (type === 'image') { const image = this.#images.get(address); if (!image) throw new Error('Actual registered same-Game source image required'); return image; }
    return this.#mint(0, 0, { kind: 'source', type, address });
  }
  #call(site: string, returnAddress: string): void {
    const returnWord = this.#source('code', returnAddress); this.#push(returnWord);
    this.#calls.push({ site, returnWord, position: this.#address(this.#load(this.#bank, this.#reg('ESP'))), returned: false });
    this.#trace.push('CALL ' + site + ' return ' + returnAddress);
  }
  #ret(): NativeX86Word32 {
    const esp = this.#address(this.#load(this.#bank, this.#reg('ESP'))), word = this.#load(this.#stack, esp);
    const call = [...this.#calls].reverse().find(entry => !entry.returned);
    if (!call || call.returnWord !== word) throw new Error('Actual owned source CALL/RET continuation required');
    this.#store(this.#bank, this.#reg('ESP'), this.#mint(0, 0, { kind: 'stack', offset: esp + 4 }));
    call.returned = true; this.#currentPc = word; return word;
  }
  beginIoCall(controller: object): NativeValue<void> {
    try { this.#controllerProof(controller); } catch (error) { return unknown(reason(error)); }
    try {
      if (this.#phase !== 'cold') throw new Error(this.#boundary ?? 'Actual ioInit CALL cannot restart');
      this.#phase = 'running'; return this.#run(controller, () => this.#call('204678ce', '204678d3'));
    } catch (error) { this.#boundary ??= reason(error); this.#phase = 'blocked'; return unknown(this.#boundary); }
  }
  register(controller: object, name: NativeX86Register): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#load(this.#bank, this.#reg(name))); }
  setRegister(controller: object, name: NativeX86Register, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => this.#store(this.#bank, this.#reg(name), word)); }
  immediate(controller: object, value: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual source uint32 immediate required'); return this.#mint(value, 0xffffffff);
  }); }
  readGameImageWord(controller: object, label: string, offset: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const crt = this.#binding!.crt, selected = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!selected.known) throw new Error(selected.reason);
    const proof = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, 4);
    if (!proof.known) throw new Error(proof.reason);
    const fields = selected.value;
    let cells = this.#imageReads.get(fields); if (!cells) { cells = new Map(); this.#imageReads.set(fields, cells); }
    const old = cells.get(offset);
    if (old && old.bytes.every((byte, index) => byte === fields.bytes[offset + index]) &&
        old.masks.every((mask, index) => mask === fields.knownMask[offset + index])) return old.word;
    const current = NativeHeapObjectViews.prototype.maskedWord.call(fields, offset), word = this.#mint(current.value, current.knownMask);
    cells.set(offset, Object.freeze({ word, bytes: Object.freeze(Array.from(fields.bytes.subarray(offset, offset + 4))),
      masks: Object.freeze(Array.from(fields.knownMask.subarray(offset, offset + 4))) })); return word;
  }); }
  sourceAddress(controller: object, type: 'code' | 'image', address: string): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#source(type, address)); }
  registerSourceImage(controller: object, address: string, fields: NativeHeapObjectViews): NativeValue<void> { return this.#run(controller, () => {
    const label = address === '206e8e90' ? 'ioInitEH4Scope' : address === '206e8f98' ? 'callocEH4Scope' : null;
    if (!label) throw new Error('Only the exact admitted ioInit/calloc EH4 scopes are owned');
    const crt = this.#binding!.crt, selected = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!selected.known || selected.value !== fields) throw new Error('Actual same-Game canonical scope image required');
    const receipt = nativeGameImageReceipt(label);
    if (receipt.address !== address || receipt.bytes !== 28) throw new Error('Exact admitted EH4 scope receipt required');
    const proof = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, 0, 28);
    if (!proof.known) throw new Error(proof.reason);
    const old = this.#images.get(address);
    if (old && this.#record(old).provenance?.kind === 'source' && (this.#record(old).provenance as { fields?: NativeHeapObjectViews }).fields !== fields) throw new Error('Retained source-image capability cannot replace its canonical view');
    if (!old) this.#images.set(address, this.#mint(0, 0, { kind: 'source', type: 'image', address, fields }));
  }); }
  readGameImagePointer(controller: object, label: string, offset = 0): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const crt = this.#binding!.crt, image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!image.known) throw new Error(image.reason);
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, 4);
    if (!access.known) throw new Error(access.reason);
    const pointer = NativeHeapObjectViews.prototype.pointer.call(image.value, offset).get();
    if (pointer === null) return this.#mint(0, 0xffffffff);
    if (label === 'crtHeapHandle' && offset === 0) {
      const heap = NativeModuleCrtOwner.canonicalGameHeapHandleForPlatform(crt, this.#platform);
      if (!heap.known || heap.value !== pointer) throw new Error(heap.known ? 'Actual current Game heap image pointer required' : heap.reason);
      return this.#mint(0, 0, { kind: 'heap', heap: heap.value });
    }
    const word = this.#nativePointers.get(pointer);
    if (!word || this.#liveWord(word).provenance?.kind !== 'allocation') throw new Error('Current image pointer lacks an actual returned allocation capability');
    return word;
  }); }
  storeGameImageWord(controller: object, label: string, offset: number, word: NativeX86Word32, width: Width = 4): NativeValue<void> { return this.#run(controller, () => {
    const maximum = this.#maximum(width), crt = this.#binding!.crt, image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label);
    if (!image.known) throw new Error(image.reason);
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, width);
    if (!access.known) throw new Error(access.reason);
    this.#invalidate(image.value, offset, width); const record = this.#record(word), field = NativeHeapObjectViews.prototype.maskedWord.call(image.value, offset, width);
    field.value = (record.value & maximum) >>> 0; field.knownMask = (record.mask & maximum) >>> 0;
  }); }
  storeGameImagePointer(controller: object, label: string, offset: number, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => {
    const crt = this.#binding!.crt, image = NativeModuleCrtOwner.canonicalImageForOwner(crt, label), record = this.#liveWord(word);
    if (!image.known) throw new Error(image.reason);
    const access = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, label, offset, 4);
    if (!access.known) throw new Error(access.reason);
    const p = record.provenance;
    if (p?.kind !== 'allocation' && !(record.mask === 0xffffffff && record.value === 0)) throw new Error('Actual allocation or known NULL required for canonical image pointer store');
    this.#invalidate(image.value, offset, 4);
    NativeHeapObjectViews.prototype.pointer.call(image.value, offset).set(p?.kind === 'allocation' ? p.pointer : null);
  }); }
  requireSourceAddress(controller: object, word: NativeX86Word32, type: 'code' | 'image', address: string): NativeValue<void> { return this.#run(controller, () => {
    const record = this.#record(word); if (record.provenance?.kind !== 'source' || record.provenance.type !== type || record.provenance.address !== address) throw new Error('Actual expected source continuation capability required');
  }); }
  add(controller: object, word: NativeX86Word32, displacement: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    return this.#offsetWord(word, displacement);
  }); }
  subtract(controller: object, left: NativeX86Word32, right: NativeX86Word32): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const operand = this.#record(right); if (operand.mask !== 0xffffffff) throw new Error('Current known source stack subtraction operand required');
    const offset = this.#address(left) - operand.value;
    if (offset < 0 || offset > this.#stack.bytes.length) throw new Error('Current stack subtraction exceeds owned reservation');
    this.#flags(0, 0);
    return this.#mint(0, 0, { kind: 'stack', offset });
  }); }
  xor(controller: object, left: NativeX86Word32, right: NativeX86Word32): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const a = this.#record(left), b = this.#record(right);
    if (left === right) { this.#logicalFlags(0, 0xffffffff, 4); return this.#mint(0, 0xffffffff); }
    const same = (x: NativeX86Word32, y: NativeX86Word32) => x === y || (this.#record(x).mask === 0xffffffff && this.#record(y).mask === 0xffffffff && this.#record(x).value === this.#record(y).value);
    if (a.provenance?.kind === 'xor' && same(a.provenance.right, right)) { const r = this.#record(a.provenance.left); this.#logicalFlags(r.value, r.mask, 4); return a.provenance.left; }
    if (b.provenance?.kind === 'xor' && same(b.provenance.right, left)) { const r = this.#record(b.provenance.left); this.#logicalFlags(r.value, r.mask, 4); return b.provenance.left; }
    this.#logicalFlags(a.value ^ b.value, a.mask & b.mask, 4);
    return this.#mint(a.value ^ b.value, a.mask & b.mask, { kind: 'xor', left, right });
  }); }
  compare(controller: object, left: NativeX86Word32, right: NativeX86Word32, width: Width = 4): NativeValue<void> { return this.#run(controller, () => {
    const a = this.#liveWord(left), b = this.#liveWord(right), maximum = this.#maximum(width), p = a.provenance, q = b.provenance;
    if (width === 4 && p?.kind === 'allocation' && q?.kind === 'allocation' && p.allocation === q.allocation) {
      this.#flags((p.offset < q.offset ? 1 : 0) | (p.offset === q.offset ? 0x40 : 0), 0x41); return;
    }
    if (width === 4 && p?.kind === 'stack' && q?.kind === 'stack') {
      this.#flags((p.offset < q.offset ? 1 : 0) | (p.offset === q.offset ? 0x40 : 0), 0x41); return;
    }
    const pointer = (r: WordRecord) => r.provenance?.kind === 'allocation' || r.provenance?.kind === 'heap';
    const zero = (r: WordRecord) => r.mask === 0xffffffff && r.value === 0;
    if (width === 4 && pointer(a) && zero(b)) { this.#flags(0, 0x41); return; }
    if (width === 4 && zero(a) && pointer(b)) { this.#flags(1, 0x41); return; }
    if (((a.mask & maximum) >>> 0) !== maximum || ((b.mask & maximum) >>> 0) !== maximum) {
      const unequal = ((a.value ^ b.value) & a.mask & b.mask & maximum) !== 0;
      this.#flags(0, unequal ? 0x40 : 0); return;
    }
    const av = (a.value & maximum) >>> 0, bv = (b.value & maximum) >>> 0;
    this.#arithmeticFlags(av, bv, ((av - bv) & maximum) >>> 0, width, true);
  }); }
  test(controller: object, left: NativeX86Word32, right: NativeX86Word32, width: Width = 4): NativeValue<void> { return this.#run(controller, () => {
    const a = this.#liveWord(left), b = this.#liveWord(right);
    if (width === 4 && left === right && (a.provenance?.kind === 'allocation' || a.provenance?.kind === 'heap')) { this.#flags(0, 0x841); return; }
    const mask = (a.mask & b.mask) | ((~a.value) & a.mask) | ((~b.value) & b.mask);
    this.#logicalFlags(a.value & b.value, mask, width);
  }); }
  condition(controller: object, condition: NativeX86Condition): NativeValue<boolean> { return this.#run(controller, () => {
    const flags = this.#record(this.#load(this.#bank, 36)), required = condition === 'be' || condition === 'a' ? 0x41 : condition === 'c' ? 1 : 0x40;
    if (!['z', 'nz', 'be', 'a', 'c'].includes(condition) || (flags.mask & required) !== required) throw new Error('Current known consumed x86 branch flags required');
    const z = (flags.value & 0x40) !== 0, c = (flags.value & 1) !== 0;
    return condition === 'z' ? z : condition === 'nz' ? !z : condition === 'be' ? c || z : condition === 'a' ? !c && !z : c;
  }); }
  alu(controller: object, op: 'add' | 'sub' | 'sbb' | 'imul' | 'or' | 'and', left: NativeX86Word32, right: NativeX86Word32,
    width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const a = this.#liveWord(left), b = this.#liveWord(right), maximum = this.#maximum(width);
    if (op === 'or' || op === 'and') {
      const value = op === 'or' ? a.value | b.value : a.value & b.value;
      const mask = op === 'or' ? (a.mask & b.mask) | (a.value & a.mask) | (b.value & b.mask)
        : (a.mask & b.mask) | ((~a.value) & a.mask) | ((~b.value) & b.mask);
      this.#logicalFlags(value, mask, width); return this.#mint(value & maximum, mask & maximum);
    }
    if (width === 4 && (op === 'add' || op === 'sub')) {
      const pointer = a.provenance?.kind === 'allocation' || a.provenance?.kind === 'stack';
      const reverse = op === 'add' && (b.provenance?.kind === 'allocation' || b.provenance?.kind === 'stack');
      if (pointer || reverse) {
        const amount = this.#numeric(pointer ? right : left, 4);
        if (amount > 0x7fffffff) throw new Error('Owned pointer addition covers contained positive scalar displacement');
        const result = this.#offsetWord(pointer ? left : right, op === 'sub' ? -amount : amount);
        this.#flags(0, 0); return result;
      }
    }
    const av = this.#numeric(left, width), bv = this.#numeric(right, width);
    if (op === 'imul') {
      if (width !== 4) throw new Error('Selected source IMUL requires DWORD operands');
      const product = BigInt(av | 0) * BigInt(bv | 0), low = Number(BigInt.asUintN(32, product));
      const overflow = product !== BigInt.asIntN(32, product); this.#flags(overflow ? 0x801 : 0, 0x801); return this.#mint(low, 0xffffffff);
    }
    let carry = 0;
    if (op === 'sbb') { const flags = this.#record(this.#load(this.#bank, 36)); if (!(flags.mask & 1)) throw new Error('Current known CF required by SBB'); carry = flags.value & 1; }
    if (!['add', 'sub', 'sbb'].includes(op)) throw new Error('Actual selected x86 ALU operation required');
    const subtract = op !== 'add', value = ((subtract ? av - bv - carry : av + bv) & maximum) >>> 0;
    this.#arithmeticFlags(av, bv, value, width, subtract, carry); return this.#mint(value, maximum);
  }); }
  increment(controller: object, word: NativeX86Word32, width: Width = 4): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const maximum = this.#maximum(width), before = this.#record(this.#load(this.#bank, 36)), value = this.#numeric(word, width), result = ((value + 1) & maximum) >>> 0;
    this.#arithmeticFlags(value, 1, result, width, false);
    const after = this.#record(this.#load(this.#bank, 36)); this.#flags((after.value & ~1) | (before.value & 1), (after.mask & ~1) | (before.mask & 1));
    return this.#mint(result, maximum);
  }); }
  divideUnsigned(controller: object, divisor: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => {
    const d = this.#numeric(divisor, 4), high = this.#numeric(this.#load(this.#bank, this.#reg('EDX')), 4), low = this.#numeric(this.#load(this.#bank, this.#reg('EAX')), 4);
    if (d === 0) throw new Error('Actual DIV zero divisor requires an unowned native exception');
    const numerator = (BigInt(high) << 32n) | BigInt(low), quotient = numerator / BigInt(d);
    if (quotient > 0xffffffffn) throw new Error('Actual DIV quotient overflow requires an unowned native exception');
    this.#store(this.#bank, this.#reg('EAX'), this.#mint(Number(quotient), 0xffffffff));
    this.#store(this.#bank, this.#reg('EDX'), this.#mint(Number(numerator % BigInt(d)), 0xffffffff)); this.#flags(0, 0);
  }); }
  loadWidth(controller: object, address: NativeX86Word32, width: Width): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    this.#maximum(width); const memory = this.#memory(address, width);
    if (width === 4 && memory.fields === this.#stack) return this.#load(memory.fields, memory.offset);
    const word = NativeHeapObjectViews.prototype.maskedWord.call(memory.fields, memory.offset, width); return this.#mint(word.value, word.knownMask);
  }); }
  storeWidth(controller: object, address: NativeX86Word32, word: NativeX86Word32, width: Width): NativeValue<void> { return this.#run(controller, () => {
    const maximum = this.#maximum(width), memory = this.#memory(address, width), record = this.#record(word);
    if (width === 4 && memory.fields === this.#stack) { this.#store(memory.fields, memory.offset, word); return; }
    this.#invalidate(memory.fields, memory.offset, width);
    const field = NativeHeapObjectViews.prototype.maskedWord.call(memory.fields, memory.offset, width);
    field.value = (record.value & maximum) >>> 0; field.knownMask = (record.mask & maximum) >>> 0;
  }); }
  load(controller: object, address: NativeX86Word32): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#load(this.#stack, this.#address(address))); }
  store(controller: object, address: NativeX86Word32, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => this.#store(this.#stack, this.#address(address), word)); }
  push(controller: object, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => this.#push(word)); }
  pop(controller: object, name: NativeX86Register): NativeValue<void> { return this.#run(controller, () => {
    const esp = this.#address(this.#load(this.#bank, this.#reg('ESP'))), word = this.#load(this.#stack, esp);
    this.#store(this.#bank, this.#reg(name), word);
    if (name !== 'ESP') this.#store(this.#bank, this.#reg('ESP'), this.#mint(0, 0, { kind: 'stack', offset: esp + 4 }));
  }); }
  call(controller: object, site: string, returnAddress: string): NativeValue<void> { return this.#run(controller, () => this.#call(site, returnAddress)); }
  ret(controller: object): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#ret()); }
  /** Fixed original import site; the caller cannot supply a grant, source PC,
   * argument view, endpoint implementation or a completed return snapshot. */
  invokeStartupInfoA(controller: object): NativeValue<void> { return this.#run(controller, () => {
    const endpoints = this.#platform.startupIoEndpoints;
    if (!endpoints) throw new Error('GetStartupInfoA20474314 requires an actual selected Runtime writer');
    const endpointProof = NativeRuntimePlatform.canonicalStartupIoEndpointsForPlatform(this.#platform, endpoints);
    if (!endpointProof.known) throw new Error(endpointProof.reason);
    const binding = this.#binding!, actual = NativeGameCrtIoInit.canonicalStartupInfoCallForCrt(binding.owner, binding.crt, controller);
    if (!actual.known) throw new Error(actual.reason);
    if (this.#startupGrant) throw new Error('Retained startup import cannot replay');
    const argumentPosition = this.#address(this.#load(this.#bank, this.#reg('ESP'))), argument = this.#load(this.#stack, argumentPosition);
    const ebp = this.#address(this.#load(this.#bank, this.#reg('EBP'))), offset = ebp - 0x64, fields = this.#startupViews.get(offset);
    if (!fields || fields !== actual.value || this.#address(argument) !== offset || argumentPosition !== ebp - 0x78) throw new Error('Current startup argument must resolve to its exact private68-byte frame alias');
    this.#call('20474314', '2047431a'); this.#startupInfoCallPushed = true;
    const top = this.#calls.at(-1)!, grant = Object.freeze({ identity: Object.freeze({}) });
    const call: StartupCall = { stack: this, controller, fields, offset, argument,
      position: top.position, returnWord: top.returnWord, phase: 'pending' };
    this.#startupGrant = grant; startupCalls.set(grant, call); this.#startupInfoWriterCalled = true;
    const result = endpoints.getStartupInfoA(grant); if (!result.known) throw new Error(result.reason);
    const returned = NativeRuntimePlatform.canonicalStartupInfoNormalReturnForPlatform(this.#platform, grant);
    if (!returned.known) throw new Error(returned.reason);
    this.#startupProof(grant, call);
    // Explicit virtual ABI, not observed Windows registers: the void import
    // supplies no known volatile bits. Callee-saved registers/FS stay retained.
    for (const name of ['EAX', 'ECX', 'EDX'] as const) this.#store(this.#bank, this.#reg(name), this.#mint(0, 0));
    this.#flags(0, 0);
    const continuation = this.#load(this.#stack, call.position), record = this.#record(continuation);
    if (record.provenance?.kind !== 'source' || record.provenance.type !== 'code' || record.provenance.address !== '2047431a') throw new Error('Actual startup stdcall continuation required');
    if (this.#address(this.#load(this.#bank, this.#reg('ESP'))) !== call.position ||
        call.position + 4 !== argumentPosition || this.#load(this.#stack, argumentPosition) !== argument ||
        call.position + 8 > this.#stack.bytes.length) throw new Error('Actual startup stdcall argument cleanup required');
    // The declared RET4 consumes the return and argument in one owned ESP
    // transition. Unknown outcomes never reach this normal-return operation.
    this.#store(this.#bank, this.#reg('ESP'), this.#mint(0, 0, { kind: 'stack', offset: call.position + 8 }));
    top.returned = true; this.#currentPc = continuation;
    call.phase = 'returned'; this.#startupInfoWriterReturned = true;
  }); }
  invokeHeapAlloc(controller: object): NativeValue<void> { return this.#run(controller, () => {
    const binding = this.#binding!, site = NativeGameCrtIoInit.canonicalHeapAllocCallForCrt(binding.owner, binding.crt, controller);
    if (!site.known) throw new Error(site.reason);
    const endpoint = this.#platform.heapAllocEndpoint;
    if (!endpoint) throw new Error('Actual selected HeapAlloc endpoint is absent at20477ce8');
    const endpointProof = NativeRuntimePlatform.canonicalHeapAllocEndpointForPlatform(this.#platform, endpoint);
    if (!endpointProof.known) throw new Error(endpointProof.reason);
    const frame = this.#address(this.#load(this.#bank, this.#reg('EBP'))), argument = this.#address(this.#load(this.#bank, this.#reg('ESP')));
    if (argument !== frame - 0x38) throw new Error('Actual nested HeapAlloc argument geometry required');
    const heapWord = this.#load(this.#stack, argument), flagsWord = this.#load(this.#stack, argument + 4), bytesWord = this.#load(this.#stack, argument + 8);
    const p = this.#liveWord(heapWord).provenance, bytes = this.#numeric(bytesWord, 4);
    if (p?.kind !== 'heap' || this.#numeric(flagsWord, 4) !== 8) throw new Error('Actual current HeapAlloc handle/zeroing flags required');
    this.#call('20477ce8', '20477cee'); this.#heapAllocCallPushed = true;
    const top = this.#calls.at(-1)!, grant: NativeHeapAllocCallGrant = Object.freeze({ identity: Object.freeze({}) });
    const call: HeapCall = { stack: this, controller, crt: binding.crt, heap: p.heap, heapWord, flagsWord, bytesWord, bytes,
      frame, position: top.position, returnWord: top.returnWord, phase: 'pending' };
    heapCalls.set(grant, call); this.#heapGrant = grant; this.#heapProof(grant, call);
    this.#heapAllocCalled = true;
    let result: NativeValue<NativeMemoryBacking | null>;
    try { result = endpoint(grant); }
    finally {
      const effect = NativeRuntimePlatform.heapAllocEffectForPlatform(this.#platform, grant);
      if (effect.known && effect.value !== null) this.#heapAllocBlockAllocated = true;
    }
    if (!result.known) throw new Error(result.reason);
    const normal = NativeRuntimePlatform.canonicalHeapAllocNormalReturnForPlatform(this.#platform, grant);
    if (!normal.known || normal.value !== result.value) throw new Error(normal.known ? 'Actual normal HeapAlloc result identity changed' : normal.reason);
    this.#heapProof(grant, call);
    let word: NativeX86Word32;
    if (result.value === null) word = this.#mint(0, 0xffffffff);
    else {
      const fields = new NativeHeapObjectViews(result.value); Object.freeze(fields.view); Object.freeze(fields);
      const allocation = Object.freeze({ fields, heap: call.heap, crt: call.crt });
      this.#allocationLive(allocation, 0, bytes);
      if (fields.bytes.length !== bytes || fields.bytes.some(byte => byte !== 0) || fields.knownMask.some(mask => mask !== 255)) {
        throw new Error('Actual exact zeroed HeapAlloc result/masks required');
      }
      word = this.#allocationWord(allocation, 0);
    }
    this.#store(this.#bank, this.#reg('EAX'), word);
    for (const name of ['ECX', 'EDX'] as const) this.#store(this.#bank, this.#reg(name), this.#mint(0, 0));
    this.#flags(0, 0); this.#heapProof(grant, call);
    // One normal stdcall12 return transition. No unknown outcome consumes any
    // argument/return or unwinds the nested/outer FS registrations.
    this.#store(this.#bank, this.#reg('ESP'), this.#mint(0, 0, { kind: 'stack', offset: call.position + 16 }));
    top.returned = true; call.phase = 'returned'; this.#currentPc = call.returnWord; this.#heapAllocReturned = true; this.#heapGrant = null;
  }); }
  readFs0(controller: object): NativeValue<NativeX86Word32> { return this.#run(controller, () => this.#load(this.#bank, 32)); }
  writeFs0(controller: object, word: NativeX86Word32): NativeValue<void> { return this.#run(controller, () => this.#store(this.#bank, 32, word)); }
  startupInfoView(controller: object, ebp: NativeX86Word32): NativeValue<NativeHeapObjectViews> { return this.#run(controller, () => {
    const offset = this.#address(ebp) - 0x64;
    if (offset < 0 || offset + 68 > this.#stack.bytes.length) throw new Error('Actual frame STARTUPINFOA alias outside stack reservation');
    const retained = this.#startupViews.get(offset); if (retained) return retained;
    const fields = new NativeHeapObjectViews(this.#stack.backing, offset, 68);
    Object.freeze(fields.view); Object.preventExtensions(fields.bytes); Object.preventExtensions(fields.knownMask); Object.freeze(fields);
    this.#startupViews.set(offset, fields); return fields;
  }); }
  suspendUnknown(controller: object, boundary: string): NativeValue<void> {
    try {
      this.#controllerProof(controller, 'retain'); this.#boundary ??= boundary;
      if (this.#phase !== 'retired') this.#phase = 'blocked'; return known(undefined);
    }
    catch (error) { return unknown(reason(error)); }
  }
  snapshot() {
    const describe = (word: NativeX86Word32): object => {
      const record = this.#words.get(word)!;
      const provenance = record.provenance;
      return Object.freeze({ value: record.value, knownMask: record.mask, provenance: provenance?.kind === 'source'
        ? Object.freeze({ kind: provenance.kind, type: provenance.type, address: provenance.address })
        : provenance?.kind === 'stack' ? Object.freeze({ kind: provenance.kind, offset: provenance.offset })
          : provenance?.kind === 'heap' ? Object.freeze({ kind: provenance.kind })
            : provenance?.kind === 'allocation' ? Object.freeze({ kind: provenance.kind, offset: provenance.offset, capacity: provenance.allocation.fields.bytes.length })
          : provenance?.kind === 'xor' ? Object.freeze({ kind: provenance.kind, left: describe(provenance.left), right: describe(provenance.right) }) : null });
    };
    const cell = (offset: number) => {
      const slot = this.#slots.get(this.#bank)?.get(offset);
      return !slot || slot.bytes.some((byte, index) => byte !== this.#bank.bytes[offset + index]) ||
        slot.masks.some((mask, index) => mask !== this.#bank.knownMask[offset + index])
        ? Object.freeze({ changed: true }) : Object.freeze({ changed: false, word: describe(slot.word) });
    };
    const cells = Object.fromEntries(registers.map(name => [name, cell(this.#reg(name))]));
    const copy = (bytes: Uint8Array) => { try { return Object.freeze(Array.from(bytes)); } catch { return null; } };
    return Object.freeze({ phase: this.#phase, boundary: this.#boundary, thread: this.#selection.threadCapability,
      stack: Object.freeze({ bytes: copy(this.#stack.bytes), knownMask: copy(this.#stack.knownMask), freed: this.#stack.backing.freed }),
      registers: Object.freeze(cells), fs0: cell(32), arithmeticFlags: cell(36), currentPc: this.#currentPc ? describe(this.#currentPc) : null,
      calls: Object.freeze(this.#calls.map(call => Object.freeze({ site: call.site, returnWord: describe(call.returnWord), position: call.position, returned: call.returned }))), trace: Object.freeze(this.#trace.slice()),
      startupInfoCallPushed: this.#startupInfoCallPushed, startupInfoWriterCalled: this.#startupInfoWriterCalled,
      startupInfoWriterReturned: this.#startupInfoWriterReturned,
      heapAllocCallPushed: this.#heapAllocCallPushed, heapAllocCalled: this.#heapAllocCalled,
      heapAllocReturned: this.#heapAllocReturned, heapAllocBlockAllocated: this.#heapAllocBlockAllocated,
      numericalRuntimeAddressesProvided: false, nativeSehDispatchExecuted: false });
  }
}

/** Runtime's private terminal transition is required; this cannot retire a
 * live selected thread or replace its retained controller. No bytes reset. */
export function retireNativeX86ThreadStackForPlatform(platform: NativeRuntimePlatform,
  selection: Readonly<NativeX86ThreadStackSelection>): void {
  if (!NativeRuntimePlatform.threadStackLifetimeHasEnded(platform, selection)) return;
  const graph = graphs.get(platform); if (graph) retirements.get(graph)!();
}
