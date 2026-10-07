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

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const token = Object.freeze({});
export type NativeX86Register = 'EAX' | 'EBX' | 'ECX' | 'EDX' | 'ESI' | 'EDI' | 'EBP' | 'ESP';
const registers: readonly NativeX86Register[] = ['EAX', 'EBX', 'ECX', 'EDX', 'ESI', 'EDI', 'EBP', 'ESP'];
export interface NativeX86Word32 { readonly identity: object; }
type WordRecord = Readonly<{ value: number; mask: number; provenance?:
  Readonly<{ kind: 'stack'; offset: number }> |
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
const graphs = new WeakMap<NativeRuntimePlatform, NativeX86ThreadStack>();
const retirements = new WeakMap<NativeX86ThreadStack, () => void>();
const startupCalls = new WeakMap<NativeStartupInfoCallGrant, StartupCall>();
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
  readonly #bank = physical(36);
  readonly #words = new WeakMap<NativeX86Word32, WordRecord>();
  readonly #slots = new Map<NativeHeapObjectViews, Map<number, Slot>>();
  readonly #images = new Map<string, NativeX86Word32>();
  readonly #imageReads = new Map<NativeHeapObjectViews, Map<number, Slot>>();
  readonly #storage = new WeakMap<NativeHeapObjectViews, PhysicalProof>();
  readonly #startupViews = new Map<number, NativeHeapObjectViews>();
  readonly #calls: { site: string; returnWord: NativeX86Word32; position: number; returned: boolean }[] = [];
  #startupGrant: NativeStartupInfoCallGrant | null = null;
  #startupInfoCallPushed = false;
  #startupInfoWriterCalled = false;
  #startupInfoWriterReturned = false;
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
    const crt = this.#binding!.crt, selected = NativeModuleCrtOwner.canonicalImageForOwner(crt, 'ioInitEH4Scope');
    if (!selected.known || selected.value !== fields) throw new Error('Actual same-Game ioInit scope image required');
    const receipt = nativeGameImageReceipt('ioInitEH4Scope');
    if (receipt.address !== address || address !== '206e8e90' || receipt.bytes !== 28) throw new Error('Exact admitted ioInit EH4 scope required');
    const proof = NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, crt, 'ioInitEH4Scope', 0, 28);
    if (!proof.known) throw new Error(proof.reason);
    const old = this.#images.get(address);
    if (old && this.#record(old).provenance?.kind === 'source' && (this.#record(old).provenance as { fields?: NativeHeapObjectViews }).fields !== fields) throw new Error('Retained source-image capability cannot replace its canonical view');
    if (!old) this.#images.set(address, this.#mint(0, 0, { kind: 'source', type: 'image', address, fields }));
  }); }
  requireSourceAddress(controller: object, word: NativeX86Word32, type: 'code' | 'image', address: string): NativeValue<void> { return this.#run(controller, () => {
    const record = this.#record(word); if (record.provenance?.kind !== 'source' || record.provenance.type !== type || record.provenance.address !== address) throw new Error('Actual expected source continuation capability required');
  }); }
  add(controller: object, word: NativeX86Word32, displacement: number): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    if (!Number.isSafeInteger(displacement)) throw new Error('Exact signed relative stack displacement required');
    const offset = this.#address(word) + displacement;
    if (offset < 0 || offset > this.#stack.bytes.length) throw new Error('Opaque relative stack address exceeds reservation');
    return this.#mint(0, 0, { kind: 'stack', offset });
  }); }
  subtract(controller: object, left: NativeX86Word32, right: NativeX86Word32): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const operand = this.#record(right); if (operand.mask !== 0xffffffff) throw new Error('Current known source stack subtraction operand required');
    const offset = this.#address(left) - operand.value;
    if (offset < 0 || offset > this.#stack.bytes.length) throw new Error('Current stack subtraction exceeds owned reservation');
    return this.#mint(0, 0, { kind: 'stack', offset });
  }); }
  xor(controller: object, left: NativeX86Word32, right: NativeX86Word32): NativeValue<NativeX86Word32> { return this.#run(controller, () => {
    const a = this.#record(left), b = this.#record(right);
    if (left === right) return this.#mint(0, 0xffffffff);
    const same = (x: NativeX86Word32, y: NativeX86Word32) => x === y || (this.#record(x).mask === 0xffffffff && this.#record(y).mask === 0xffffffff && this.#record(x).value === this.#record(y).value);
    if (a.provenance?.kind === 'xor' && same(a.provenance.right, right)) return a.provenance.left;
    if (b.provenance?.kind === 'xor' && same(b.provenance.right, left)) return b.provenance.left;
    return this.#mint(a.value ^ b.value, a.mask & b.mask, { kind: 'xor', left, right });
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
      registers: Object.freeze(cells), fs0: cell(32), currentPc: this.#currentPc ? describe(this.#currentPc) : null,
      calls: Object.freeze(this.#calls.map(call => Object.freeze({ site: call.site, returnWord: describe(call.returnWord), position: call.position, returned: call.returned }))), trace: Object.freeze(this.#trace.slice()),
      startupInfoCallPushed: this.#startupInfoCallPushed, startupInfoWriterCalled: this.#startupInfoWriterCalled,
      startupInfoWriterReturned: this.#startupInfoWriterReturned,
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
