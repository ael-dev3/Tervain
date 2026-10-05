/** Browser-owned memory and services for reading the captured Hero property set.
 * These are TypeScript replacements for the allocator/string/localization
 * boundaries; they do not create native addresses or run the installed code.
 */
import type { NativeValue } from './dialogue';
import { NativeReflectionController, loadOriginalReflectionSerialized,
  originalReflectionPropertyInput } from './entity-reflection';
import type { NativeReflectionWrapper } from './entity-reflection';
import { NativeEntityByteInput } from './entity-reading';
import type { NativeAttributeAllocation, NativeAttributeCStringAllocation,
  NativeAttributeCStringSource, NativeAttributeReadingHost } from './attribute-reading';
import { OriginalAttributeReader } from './attribute-reading';
import type { NativePlayerMemoryReadingHost, NativePlayerMemoryCStringAllocation,
  NativePlayerMemoryCStringSlot, NativePlayerMemoryGuidScratch,
  NativePlayerMemoryUnicodeString } from './player-memory-reading';
import { NativePlayerMemoryArray, OriginalPlayerMemoryReader } from './player-memory-reading';
import type { OriginalPlayerMemory } from './player-properties';
import type { NativeClockTimestampSource } from './world-clock';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });

const CP1252_SPECIAL = new Map<string, number>([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87],
  ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91],
  ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97], ['˜', 0x98],
  ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f],
]);

function encodeNativeCString(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    const codePoint = text.codePointAt(index)!;
    if (codePoint > 0xffff) throw new Error('Original bCString code-page profile does not accept supplementary Unicode characters');
    const code = CP1252_SPECIAL.get(character) ?? codePoint;
    if (code > 0xff) throw new Error('Original bCString code-page profile does not contain U+' + codePoint.toString(16));
    bytes[index] = code;
  }
  return bytes;
}

function decodeNativeUnicode(value: NativePlayerMemoryUnicodeString): string {
  const block = value.pointer;
  if (value.destroyed || value.slot.freed) throw new Error('Live original Unicode string required');
  if (block === null) return '';
  if (block.freed || block.bytes.length < 14 || block.knownMask.subarray(0, 12).some(mask => mask !== 255)) {
    throw new Error('Known original Unicode header and character allocation required');
  }
  const view = new DataView(block.bytes.buffer, block.bytes.byteOffset, block.bytes.byteLength);
  const length = view.getInt32(4, true);
  if (!Number.isInteger(length) || length < 0 || 12 + (length + 1) * 2 > block.bytes.length ||
      block.knownMask.subarray(12, 12 + (length + 1) * 2).some(mask => mask !== 255)) {
    throw new Error('Known original Unicode text extent required');
  }
  let text = '';
  for (let index = 0; index < length; index++) text += String.fromCharCode(view.getUint16(12 + index * 2, true));
  return text;
}

export interface NativeBrowserMemoryLog {
  readonly kind: 'warning' | 'info'; readonly source: string; readonly format: string;
  readonly args: readonly (string | number)[];
}
export interface NativeBrowserMemorySummary {
  readonly allocations: number; readonly liveAllocations: number;
  readonly liveCStringAllocations: number; readonly liveWrapperAllocations: number; readonly localizationEntries: number;
  readonly logs: readonly NativeBrowserMemoryLog[];
}

/** A bounded byte-array heap with explicit object lifetimes and unknown-byte
 * masks. Its identity tokens are capabilities, never emulated pointer values.
 */
export class NativeBrowserMemoryRuntime {
  private allocationIndex = 0;
  private readonly allocations = new Set<NativeAttributeAllocation>();
  private readonly cstrings = new WeakMap<object, NativeAttributeAllocation>();
  private readonly liveCstrings = new Set<NativePlayerMemoryCStringAllocation>();
  private readonly localization = new Map<string, { text: string; description: string }>();
  private readonly localizationAdmin = Object.freeze({ kind: 'browser-localization-replacement' });
  private readonly diagnostics: NativeBrowserMemoryLog[] = [];
  private controller: NativeReflectionController | null = null;
  private readonly wrapperBackings: NativeAttributeAllocation[] = [];

  private allocate(bytes: number): NativeAttributeAllocation {
    if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0x7fffffff) throw new RangeError('Finite browser allocation extent required');
    const allocation: NativeAttributeAllocation = {
      identity: Object.freeze({ allocation: ++this.allocationIndex }), bytes: new Uint8Array(bytes),
      knownMask: new Uint8Array(bytes), freed: false,
    };
    this.allocations.add(allocation); return allocation;
  }

  private release(captured: NativeAttributeAllocation): NativeValue<void> {
    if (!this.allocations.has(captured) || captured.freed) return unknown('Allocation is foreign or its lifetime already ended');
    captured.freed = true; return known(undefined);
  }

  private realloc(current: NativeAttributeAllocation | null, bytes: number): NativeValue<NativeAttributeAllocation | null> {
    try {
      if (current !== null && (!this.allocations.has(current) || current.freed)) throw new Error('Actual live MemoryAdmin backing required');
      const next = this.allocate(bytes);
      if (current !== null) {
        const copy = Math.min(current.bytes.length, bytes);
        next.bytes.set(current.bytes.subarray(0, copy));
        next.knownMask.set(current.knownMask.subarray(0, copy));
        current.freed = true;
      }
      return known(next);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }

  private newCString(text: string): NativeValue<NativePlayerMemoryCStringAllocation> {
    try {
      const encoded = encodeNativeCString(text), allocation = this.allocate(encoded.length + 1);
      allocation.bytes.set(encoded); allocation.bytes[encoded.length] = 0;
      allocation.knownMask.fill(255);
      const value: NativePlayerMemoryCStringAllocation = {
        identity: allocation.identity, text, length: encoded.length, referenceCount: 1, freed: false,
        characterBytes: allocation.bytes, characterKnownMask: allocation.knownMask,
      };
      this.cstrings.set(value.identity, allocation); this.liveCstrings.add(value);
      return known(value);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }

  private endCString(value: NativeAttributeCStringAllocation): NativeValue<void> {
    const allocation = this.cstrings.get(value.identity);
    if (!allocation || value.freed || allocation.freed) return unknown('Owned CString character allocation is absent or already freed');
    allocation.freed = true; this.liveCstrings.delete(value as NativePlayerMemoryCStringAllocation);
    (value as { freed: boolean }).freed = true;
    return known(undefined);
  }

  private releaseCString(value: NativeAttributeCStringAllocation): void {
    if (value.freed || !Number.isInteger(value.referenceCount) || value.referenceCount < 0) throw new Error('Live original CString reference required');
    value.referenceCount = (value.referenceCount - 1) & 0xffff;
    if (value.referenceCount === 0) {
      const freed = this.endCString(value);
      if (!freed.known) throw new Error(freed.reason);
    }
  }

  private setCString(destination: NativePlayerMemoryCStringSlot | Parameters<NonNullable<NativeAttributeReadingHost['assignCStringText']>>[0],
    text: string): NativeValue<void> {
    const made = this.newCString(text);
    if (!made.known) return made;
    const old = destination.pointer;
    destination.pointer = made.value;
    if (old !== null) this.releaseCString(old);
    return known(undefined);
  }

  private assignCString(destination: NativePlayerMemoryCStringSlot | Parameters<NonNullable<NativeAttributeReadingHost['assignCString']>>[0],
    source: NativeAttributeCStringSource): NativeValue<void> {
    const incoming = source.pointer;
    if (incoming !== null) {
      if (!this.cstrings.has(incoming.identity) || incoming.freed || incoming.referenceCount >= 0xffff) {
        return unknown('Same live browser-owned CString source required');
      }
      incoming.referenceCount = (incoming.referenceCount + 1) & 0xffff;
    }
    const old = destination.pointer;
    if (incoming && !('characterBytes' in incoming)) return unknown('Original CString source lacks character allocation bytes');
    destination.pointer = incoming as NativePlayerMemoryCStringAllocation | null;
    if (old !== null) this.releaseCString(old);
    return known(undefined);
  }

  private readCString(destination: NativePlayerMemoryCStringSlot | Parameters<NonNullable<NativeAttributeReadingHost['readCString']>>[0],
    input: NativeEntityByteInput): NativeValue<void> {
    try {
      const index = input.u16(), value = input.strings[index];
      if (typeof value !== 'string') throw new Error('Indexed source CString is absent');
      return this.setCString(destination, value);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }

  private appendLog(kind: NativeBrowserMemoryLog['kind'], source: string, format: string,
    args: readonly (string | number)[]): NativeValue<void> {
    this.diagnostics.push({ kind, source, format, args: args.slice() }); return known(undefined);
  }

  attributeHost(): NativeAttributeReadingHost {
    return {
      allocateWrapper: bytes => this.allocateWrapperResult(bytes),
      allocateNative: bytes => this.allocateResult(bytes),
      assignCStringText: (destination, text) => this.setCString(destination, text),
      assignCString: (destination, source) => this.assignCString(destination, source),
      readCString: (destination, input) => this.readCString(destination, input),
      freeCString: captured => this.endCString(captured),
      warning: (message, source) => this.appendLog('warning', source, message, []),
      deletingNative: () => known(undefined),
      freeNative: captured => this.release(captured),
    };
  }

  playerMemoryHost(): NativePlayerMemoryReadingHost {
    return {
      allocateWrapper: bytes => this.allocateWrapperResult(bytes),
      allocateNative: bytes => this.allocateResult(bytes),
      allocateNode: bytes => this.allocateResult(bytes),
      realloc: (current, bytes) => this.realloc(current, bytes),
      free: captured => this.release(captured),
      deleteNode: captured => this.release(captured),
      // The installed mutable enum global is not captured. A zero mask keeps
      // every bit unknown; serialized Hero data may initialize the field later.
      enumDefault: () => known({ value: 0, knownMask: 0 }),
      coCreateGuid: scratch => this.createGuid(scratch),
      readCString: (destination, input) => this.readCString(destination, input),
      constructCString: (destination, text) => this.setCString(destination, text),
      assignCString: (destination, source) => this.assignCString(destination, source),
      concatenateCString: (destination, prefix, source) => this.setCString(destination, prefix + source.text),
      freeCString: captured => this.endCString(captured),
      allocateUnicode: bytes => this.allocateResult(bytes),
      localizationAdmin: () => known(this.localizationAdmin),
      reserveString: (admin, key, entry) => {
        if (admin !== this.localizationAdmin) return unknown('Same browser-localized string table required');
        try {
          this.localization.set(key.text, { text: decodeNativeUnicode(entry.text), description: decodeNativeUnicode(entry.description) });
          return known(true);
        } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
      },
      warning: (format, args, source) => this.appendLog('warning', source, format, args),
      info: (level, format, args, source) => this.appendLog('info', source, format, [...args, level]),
    };
  }

  bindReflectionController(controller: NativeReflectionController): void {
    if (this.controller !== null) throw new Error('Browser memory runtime is already bound to a reflection controller');
    this.controller = controller;
  }

  reflectionHost(): {
    isInPanicState(): NativeValue<boolean>;
    deletingDestructor(wrapper: NativeReflectionWrapper, argument: 0): NativeValue<void>;
    deleteObject(wrapper: NativeReflectionWrapper): NativeValue<void>;
    timestamps: NativeClockTimestampSource; precision: 53;
  } {
    const timestamps: NativeClockTimestampSource = {
      profile: 'selected-host-monotonic-u32-milliseconds',
      readMilliseconds: () => Math.trunc(performance.now()) >>> 0,
    };
    return {
      timestamps, precision: 53,
      // This models a fresh browser host's own error state; it is not a capture
      // of Gothic 3's ErrorAdmin singleton or a claim about the native session.
      isInPanicState: () => known(false),
      deletingDestructor: wrapper => {
        if (wrapper.controller !== this.controller) return unknown('Same retained reflection controller required');
        return known(undefined);
      },
      deleteObject: wrapper => {
        if (wrapper.controller !== this.controller || wrapper.deleted) return unknown('Live wrapper from this controller required');
        const index = Number(/:wrapper:(\d+)$/.exec(wrapper.identity)?.[1]);
        const backing = Number.isSafeInteger(index) && index > 0 ? this.wrapperBackings[index - 1] : undefined;
        if (!backing || backing.freed) return unknown('Original wrapper allocation lifetime was not retained');
        return this.release(backing);
      },
    };
  }

  private allocateResult(bytes: number): NativeValue<NativeAttributeAllocation> {
    try { return known(this.allocate(bytes)); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }

  private allocateWrapperResult(bytes: number): NativeValue<NativeAttributeAllocation> {
    const result = this.allocateResult(bytes);
    if (result.known) this.wrapperBackings.push(result.value);
    return result;
  }

  private createGuid(scratch: NativePlayerMemoryGuidScratch): NativeValue<number> {
    try {
      if (scratch.bytes.length !== 20 || scratch.knownMask.length !== 20 || scratch.destroyed) throw new Error('Fresh original GUID scratch required');
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      // GUID struct fields use little-endian byte order for the first 4/2/2-byte fields.
      const order = [3, 2, 1, 0, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13, 14, 15];
      for (let index = 0; index < 16; index++) { scratch.bytes[index] = bytes[order[index]!]!; scratch.knownMask[index] = 255; }
      return known(0);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }

  summary(): NativeBrowserMemorySummary {
    let liveAllocations = 0;
    for (const allocation of this.allocations) if (!allocation.freed) liveAllocations++;
    return Object.freeze({ allocations: this.allocations.size, liveAllocations,
      liveCStringAllocations: this.liveCstrings.size,
      liveWrapperAllocations: this.wrapperBackings.filter(value => !value.freed).length,
      localizationEntries: this.localization.size,
      logs: Object.freeze(this.diagnostics.slice()) });
  }
}

export interface NativeHeroPlayerMemory {
  readonly memory: OriginalPlayerMemory;
  /** Retain the serialized accessor so its native wrapper/PS remain alive. */
  readonly accessor: import('./entity-reflection').NativeReflectionAccessor;
  readonly controller: NativeReflectionController;
  readonly source: { readonly sha256: string; readonly bytes: number; readonly propertySetIndex: 13 };
  readonly cursor: { readonly consumed: number; readonly total: number };
  /** Initial native PlayerKnows bCString entries from this same retained PS. */
  readonly gameEvents: readonly string[];
  readonly summary: NativeBrowserMemorySummary;
  readonly unresolved: readonly string[];
}

/** Read PC_Hero's actual serialized PlayerMemory accessor into the concrete
 * Attribute/Stat/PlayerMemory factories and retain that same consumer object.
 */
export async function loadNativeHeroPlayerMemory(): Promise<NativeHeroPlayerMemory> {
  const document = await loadOriginalReflectionSerialized();
  const packet = originalReflectionPropertyInput(document, 'PC_Hero', 13);
  if (packet.outerVersion !== 5 || packet.source.className !== 'gCPlayerMemory_PS' ||
      packet.source.serializedSha256 !== 'a87767e871bf6a1b83e91c58c13350db5b353bbedc0d440bc02b618b2b508135') {
    throw new Error('Captured Hero PlayerMemory packet differs from the reviewed source record');
  }

  const memoryHost = new NativeBrowserMemoryRuntime();
  const controller = new NativeReflectionController('browser-hero-player-memory', memoryHost.reflectionHost());
  memoryHost.bindReflectionController(controller);
  const attributes = new OriginalAttributeReader(controller, memoryHost.attributeHost());
  const playerMemory = new OriginalPlayerMemoryReader(controller, attributes, memoryHost.playerMemoryHost());
  const accessorValue = controller.readAccessor(packet.input);
  if (!accessorValue.known) {
    const trace = controller.receipt().trace.slice(-12).map(row => row.operation + ' @ ' + row.source).join(' → ');
    throw new Error('Original Hero PlayerMemory read stopped: ' + accessorValue.reason +
      (trace ? ' | last native steps: ' + trace : ''));
  }
  const accessor = accessorValue.value;
  if (accessor.instance === null || accessor.instance.factory !== playerMemory.factory) {
    throw new Error('Original Hero PlayerMemory accessor did not retain gCPlayerMemory_PS');
  }
  const memoryValue = playerMemory.playerMemory(accessor.instance);
  if (!memoryValue.known) throw new Error('Original Hero PlayerMemory storage is unavailable: ' + memoryValue.reason);
  const playerKnows = memoryValue.value.properties.values.PlayerKnows;
  if (!(playerKnows instanceof NativePlayerMemoryArray) || playerKnows.kind !== 'CString' ||
      !playerKnows.items.every((event) => typeof event === 'string')) {
    throw new Error('Original Hero PlayerKnows bCString array is not available.');
  }
  // Serialized property candidates retain the enclosing entity's four-byte
  // sentinel after the accessor. This packet loader is the caller that owns it.
  const sentinel = packet.input.u32();
  if (sentinel !== 0xdeadc0de) throw new Error('Original Hero PlayerMemory outer sentinel differs');
  if (packet.input.cursor() !== packet.input.end) {
    throw new Error('Original Hero PlayerMemory packet has unconsumed bytes: ' + packet.input.cursor() + '/' + packet.input.end);
  }
  const controllerReceipt = controller.receipt();
  return Object.freeze({ memory: memoryValue.value, accessor, controller,
    source: Object.freeze({ sha256: packet.source.serializedSha256, bytes: packet.source.serializedRaw.length / 2, propertySetIndex: 13 as const }),
    cursor: Object.freeze({ consumed: packet.input.cursor(), total: packet.input.end }),
    gameEvents: Object.freeze(playerKnows.items as string[]),
    summary: memoryHost.summary(), unresolved: Object.freeze(controllerReceipt.required ? [controllerReceipt.required] : []) });
}
