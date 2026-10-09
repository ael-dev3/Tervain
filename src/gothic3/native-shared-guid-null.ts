/** One selected original SharedBase C++ initializer over the platform's
 * retained module bytes. Entering this body establishes no CRT traversal. */
import type { NativeValue } from './dialogue';
import type { NativeHeapObjectViews } from './native-heap-views';
import type { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeSharedModuleImage } from './native-shared-module-image';
import { NativeSharedCrtOwner } from './native-shared-crt';
import { admitNativeSharedGuidNullSource, nativeSharedGuidNullSource } from './native-shared-guid-null-profile';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const constructionToken = Object.freeze({});
const owners = new WeakMap<NativeRuntimePlatform, NativeSharedGuidNull>();

interface GuidNullRanges {
  readonly source: NativeHeapObjectViews;
  readonly payload: NativeHeapObjectViews;
  readonly cppInitializers: NativeHeapObjectViews;
  readonly cInitializers: NativeHeapObjectViews;
  readonly slot: NativeHeapObjectViews;
}
type Phase = 'not-invoked' | 'invoking' | 'blocked' | 'completed';

function errorReason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); }
  catch { return 'Selected Shared GUIDNull operation escaped without an owned error description'; }
}

/** The private per-platform registry admits the owner. A cold zero receipt or
 * a caller-shaped sixteen-byte view cannot supply the live GUIDNull service. */
export class NativeSharedGuidNull {
  readonly sourceProfile = nativeSharedGuidNullSource();
  #phase: Phase = 'not-invoked';
  #executionOrigin: 'selected-body' | 'returned-crt' = 'selected-body';
  #boundary: string | null = null;
  #interruption: string | null = null;
  #currentInstruction: string | null = null;
  readonly #reachedInstructions: string[] = [];
  readonly #trace: string[] = [];

  readonly #platform: NativeRuntimePlatform;
  readonly #image: NativeSharedModuleImage;
  readonly #ranges: GuidNullRanges;

  private constructor(platform: NativeRuntimePlatform, image: NativeSharedModuleImage,
    ranges: GuidNullRanges, token: object) {
    if (token !== constructionToken) throw new Error('Canonical Shared GUIDNull construction required');
    admitNativeSharedGuidNullSource();
    this.#platform = platform;
    this.#image = image;
    this.#ranges = ranges;
    this.#requireRanges();
    Object.defineProperty(this, 'sourceProfile', { value: this.sourceProfile, writable: false, configurable: false });
  }

  static forPlatform(platform: NativeRuntimePlatform): NativeValue<NativeSharedGuidNull> {
    try {
      const existing = owners.get(platform);
      if (existing) { existing.#requireRanges(); return known(existing); }
      admitNativeSharedGuidNullSource();
      const image = NativeSharedModuleImage.forPlatform(platform);
      if (!image.known) return image;
      const ranges = image.value.guidNullRanges();
      if (!ranges.known) return ranges;
      const owner = new NativeSharedGuidNull(platform, image.value, Object.freeze({ ...ranges.value }), constructionToken);
      owners.set(platform, owner);
      return known(owner);
    } catch (error) { return unknown(errorReason(error)); }
  }

  /** The actual retained owner and the exact platform must agree. This entry
   * lets a Game startup host attach the service without trusting a shape. */
  static canonicalPayloadForPlatform(owner: NativeSharedGuidNull,
    platform: NativeRuntimePlatform): NativeValue<NativeHeapObjectViews> {
    if (!owner || owners.get(platform) !== owner || owner.#platform !== platform) {
      return unknown('Actual canonical Shared GUIDNull owner for this platform required');
    }
    return owner.#retainedPayload();
  }
  /** Publish the service after its body executed in the actual CRT traversal;
   * do not replay stores or infer completion from a zero payload. */
  adoptReturnedCrtExecution():NativeValue<void>{
    if(owners.get(this.#platform)!==this||this.#phase!=='not-invoked')
      return unknown('One cold canonical GUID service required for CRT adoption');
    const payload=NativeSharedCrtOwner.completedGuidPayloadForPlatform(this.#platform);
    if(!payload.known)return payload;
    if(payload.value!==this.#ranges.payload)return unknown('Actual same-image CRT GUID payload required');
    try{this.#requireRanges();this.#executionOrigin='returned-crt';this.#phase='completed';
      this.#trace.push('100e1470.adoptReturnedCrtExecution');return known(undefined);
    }catch(error){return unknown(errorReason(error));}
  }

  #requireView(fields: NativeHeapObjectViews): void {
    const admitted = NativeSharedModuleImage.canonicalViewForPlatform(this.#image, this.#platform, fields);
    if (!admitted.known) throw new Error(admitted.reason);
    if (this.#interruption) throw new Error(this.#interruption);
  }

  #requireRanges(): void {
    for (const fields of [this.#ranges.source, this.#ranges.payload, this.#ranges.cppInitializers,
      this.#ranges.cInitializers, this.#ranges.slot]) this.#requireView(fields);
    const { source, payload, cppInitializers, cInitializers, slot } = this.#ranges;
    if (source.bytes.length !== 16 || payload.bytes.length !== 16 || cppInitializers.bytes.length !== 856 ||
        cInitializers.bytes.length !== 540 || slot.bytes.length !== 4 ||
        slot.backing !== cppInitializers.backing ||
        slot.bytes.buffer !== cppInitializers.bytes.buffer ||
        slot.bytes.byteOffset !== cppInitializers.bytes.byteOffset + 528 ||
        slot.knownMask.buffer !== cppInitializers.knownMask.buffer ||
        slot.knownMask.byteOffset !== cppInitializers.knownMask.byteOffset + 528) {
      throw new Error('Actual Shared GUIDNull source, payload and complete table alias required');
    }
  }

  #load(address: string, offset: number): number {
    this.#currentInstruction = address;
    this.#trace.push(address + '.load.attempt');
    this.#requireView(this.#ranges.source);
    const value = this.#ranges.source.readUnsigned(offset);
    this.#reachedInstructions.push(address);
    this.#trace.push(address + '.load.return');
    this.#requireView(this.#ranges.source);
    return value;
  }

  #store(address: string, offset: number, value: number): void {
    this.#currentInstruction = address;
    this.#trace.push(address + '.store.attempt');
    this.#requireView(this.#ranges.payload);
    this.#ranges.payload.writeUnsigned(offset, value);
    this.#reachedInstructions.push(address);
    this.#trace.push(address + '.store.return');
    this.#requireView(this.#ranges.payload);
  }

  /** Dispatch this one callback through its CURRENT physical slot. The native
   * body has no initialization guard. These phases record bounded browser
   * execution; they never write a fabricated guard into the original image. */
  invokeInitializer(): NativeValue<void> {
    if (this.#phase === 'invoking') {
      this.#interruption = 'Selected Shared GUIDNull initializer reentry is unowned';
      return unknown(this.#interruption);
    }
    if (this.#phase === 'blocked') return unknown(this.#boundary ?? 'Selected Shared GUIDNull initializer is blocked');
    if (this.#phase === 'completed') return unknown('Repeated selected Shared GUIDNull static construction is unowned');
    if (owners.get(this.#platform) !== this) return unknown('Actual canonical Shared GUIDNull owner required');
    this.#phase = 'invoking';
    this.#interruption = null;
    try {
      this.#requireRanges();
      this.#currentInstruction = '100e5210';
      this.#trace.push('SharedBase.initializer-slot100e5210.read.attempt');
      const target = this.#ranges.slot.readUnsigned(0);
      this.#requireView(this.#ranges.slot);
      if (target !== 0x100e1470) throw new Error('Current selected Shared GUIDNull initializer slot target is unowned');
      this.#trace.push('SharedBase.initializer-slot100e5210.target100e1470');
      // Preserve the actual registers and instruction order. In particular,
      // source+12 is reached only AFTER the first destination DWORD store.
      let eax = this.#load('100e1470', 0);
      const ecx = this.#load('100e1475', 4);
      const edx = this.#load('100e147b', 8);
      this.#store('100e1481', 0, eax);
      eax = this.#load('100e1486', 12);
      this.#store('100e148b', 4, ecx);
      this.#store('100e1491', 8, edx);
      this.#store('100e1497', 12, eax);
      this.#currentInstruction = '100e149c';
      this.#requireRanges();
      this.#reachedInstructions.push('100e149c');
      this.#trace.push('100e149c.return');
      this.#phase = 'completed';
      return known(undefined);
    } catch (error) {
      // Every applied store remains in its actual backing, including a store
      // whose lower physical access escaped before reporting completion.
      this.#boundary = errorReason(error);
      this.#phase = 'blocked';
      this.#trace.push('blocked:' + this.#boundary);
      return unknown(this.#boundary);
    }
  }

  /** Return the SAME mutable raw sixteen-byte payload only after this body
   * actually reached RET. Later writes and unknown masks remain unchanged.
   * GetNullGuid's separate twenty-byte object is not this module global. */
  guidNullPayload(): NativeValue<NativeHeapObjectViews> { return this.#retainedPayload(); }

  #retainedPayload(): NativeValue<NativeHeapObjectViews> {
    if (owners.get(this.#platform) !== this) return unknown('Actual canonical Shared GUIDNull owner required');
    if (this.#phase !== 'completed') return unknown(this.#boundary ?? 'Selected Shared GUIDNull initializer has not completed');
    try {
      this.#requireView(this.#ranges.payload);
      return known(this.#ranges.payload);
    } catch (error) { return unknown(errorReason(error)); }
  }

  snapshot() {
    const payload = this.#retainedPayload();
    return Object.freeze({ module: 'SharedBase' as const, phase: this.#phase, boundary: this.#boundary,executionOrigin:this.#executionOrigin,
      currentInstruction: this.#currentInstruction, reachedInstructions: Object.freeze([...this.#reachedInstructions]),
      trace: Object.freeze([...this.#trace]),
      selectedInitializer: Object.freeze({ entry: '100e1470', table: '100e5000-100e5358',
        slot: '100e5210', index: 132, nonNullOrdinal: 4, precedingNonNullCallbacks: 3 }),
      selectedBodyExecuted: this.#phase === 'completed', payloadAvailable: payload.known,
      payloadBoundary: payload.known ? null : payload.reason,
      wholeTableExecuted: false, priorCallbacksExecuted: false, cCallbacksExecuted: false,
      crtTraversalCompleted: false, sharedModuleAttachCompleted: false, nativeModuleInstantiated: false,
      nativeGuardPresent: false, destructorRegistered: false, selectedBodyCallsDestructor: false });
  }
}
