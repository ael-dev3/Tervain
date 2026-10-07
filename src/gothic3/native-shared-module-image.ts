/** Canonical selected SharedBase image fragments. They retain the original
 * byte/mask identities; separately allocated fragments are never enlarged or
 * copied into a replacement image. This does not consolidate MemoryAdmin's
 * other cold ranges or execute the Shared CRT initializer tables. */
import guidStartupRulesText from '../../assets/gothic3/script-admin-startup/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeBytePointer } from './native-pointer-geometry';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { admitNativeSharedGuidNullSource, nativeSharedImageReceipt } from './native-shared-guid-null-profile';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
const sharedBase = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214';
const constructionToken = Object.freeze({});
type CStringLabel = 'emptyCStringText' | 'guidEmptyLiteral';
type GuidImageLabel = 'guidNullSourceLiteral' | 'guidNullPayload' | 'cppInitializers' | 'cInitializers';
interface ImageRange {
  readonly address: number; readonly length: number; readonly label: GuidImageLabel | CStringLabel;
  readonly backing: NativeMemoryBacking; readonly identity: object;
  readonly bytes: Uint8Array; readonly masks: Uint8Array;
  readonly byteBuffer: ArrayBufferLike; readonly maskBuffer: ArrayBufferLike;
  readonly byteOffset: number; readonly maskOffset: number;
  readonly fields: NativeHeapObjectViews;
  registered: boolean;
}
interface ViewProof {
  readonly range: ImageRange; readonly begin: number; readonly length: number;
  readonly bytes: Uint8Array; readonly masks: Uint8Array; readonly view: DataView;
}
export interface NativeSharedGuidNullRanges {
  readonly source: NativeHeapObjectViews; readonly payload: NativeHeapObjectViews;
  readonly cppInitializers: NativeHeapObjectViews; readonly cInitializers: NativeHeapObjectViews;
  readonly slot: NativeHeapObjectViews;
}
interface ImageState {
  readonly platform: NativeRuntimePlatform;
  readonly ranges: Map<number, ImageRange>;
  readonly views: Map<string, NativeHeapObjectViews>;
  readonly proofs: WeakMap<NativeHeapObjectViews, ViewProof>;
  readonly cstrings: Map<CStringLabel, NativeBytePointer>;
  guidRanges?: NativeSharedGuidNullRanges;
}
// Public objects and caller-shaped receipts cannot replace these authorities.
const images = new WeakMap<NativeRuntimePlatform, NativeSharedModuleImage>();
const states = new WeakMap<NativeSharedModuleImage, ImageState>();
const cstringSource = JSON.parse(guidStartupRulesText) as {
  schema: string; inputs: { SharedBase: string };
  constBytes: Record<string, { module: string; address: string; bytes: number; raw: string; sha256: string }>;
};
const rangeKey = (address: number, bytes: number): string => address.toString(16) + ':' + bytes;
function parseSpan(address: string, length: number): number {
  if (!/^[0-9a-f]{8}$/.test(address) || !Number.isSafeInteger(length) || length <= 0 ||
      Number.parseInt(address, 16) + length > 0x100000000) {
    throw new Error('Exact selected SharedBase uint32 image span required');
  }
  return Number.parseInt(address, 16);
}
function stateFor(image: NativeSharedModuleImage, platform?: NativeRuntimePlatform): ImageState {
  const state = states.get(image);
  if (!state || images.get(state.platform) !== image ||
      !NativeRuntimePlatform.isRetainedPlatform(state.platform) || (platform && platform !== state.platform)) {
    throw new Error('Actual retained SharedBase image for this platform required');
  }
  const lifetime = state.platform.canonicalSharedModuleImageLifetime();
  if (!lifetime.known) throw new Error(lifetime.reason);
  return state;
}
function retainedView(state: ImageState, fields: NativeHeapObjectViews, requireRegistered: boolean): ViewProof {
  const proof = state.proofs.get(fields), range = proof?.range;
  if (!proof || !range || state.ranges.get(range.address) !== range ||
      (requireRegistered && !range.registered) || fields.backing !== range.backing ||
      range.backing.identity !== range.identity || range.backing.freed ||
      range.backing.bytes !== range.bytes || range.backing.knownMask !== range.masks ||
      range.bytes.length !== range.length || range.masks.length !== range.length ||
      range.bytes.buffer !== range.byteBuffer || range.masks.buffer !== range.maskBuffer ||
      range.bytes.byteOffset !== range.byteOffset || range.masks.byteOffset !== range.maskOffset ||
      fields.bytes !== proof.bytes || fields.knownMask !== proof.masks || fields.view !== proof.view ||
      proof.begin < 0 || proof.begin + proof.length > range.length ||
      fields.bytes.length !== proof.length || fields.knownMask.length !== proof.length ||
      fields.bytes.buffer !== range.byteBuffer || fields.knownMask.buffer !== range.maskBuffer ||
      fields.bytes.byteOffset !== range.byteOffset + proof.begin ||
      fields.knownMask.byteOffset !== range.maskOffset + proof.begin ||
      fields.view.buffer !== range.byteBuffer || fields.view.byteOffset !== range.byteOffset + proof.begin ||
      fields.view.byteLength !== proof.length) {
    throw new Error('Retained SharedBase backing/view identity or live span differs');
  }
  return proof;
}
function recordView(state: ImageState, range: ImageRange, begin: number, length: number): NativeHeapObjectViews {
  const key = rangeKey(range.address + begin, length), existing = state.views.get(key);
  if (existing) { retainedView(state, existing, false); return existing; }
  const fields = begin === 0 && length === range.length ? range.fields : new NativeHeapObjectViews(range.backing, begin, length);
  state.views.set(key, fields);
  state.proofs.set(fields, Object.freeze({ range, begin, length,
    bytes: fields.bytes, masks: fields.knownMask, view: fields.view }));
  return fields;
}

export class NativeSharedModuleImage {
  private constructor(platform: NativeRuntimePlatform, token: object) {
    if (token !== constructionToken || !NativeRuntimePlatform.isRetainedPlatform(platform)) {
      throw new Error('Actual constructed RuntimePlatform required for a SharedBase image');
    }
    states.set(this, { platform, ranges: new Map(), views: new Map(), proofs: new WeakMap(), cstrings: new Map() });
  }
  /** Called by the actual RuntimePlatform constructor after its admission.
   * Establishing authority allocates no image fragments. */
  static establishForPlatform(platform: NativeRuntimePlatform): NativeSharedModuleImage {
    if (!NativeRuntimePlatform.isRetainedPlatform(platform)) throw new Error('Actual constructed RuntimePlatform required');
    const existing = images.get(platform); if (existing) return existing;
    const image = new NativeSharedModuleImage(platform, constructionToken);
    images.set(platform, image); return image;
  }
  static forPlatform(platform: NativeRuntimePlatform): NativeValue<NativeSharedModuleImage> {
    try {
      const image = images.get(platform);
      if (!image) throw new Error('Actual platform-established SharedBase image required');
      stateFor(image, platform); return known(image);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  /** Registration proof for RuntimePlatform. The caller cannot admit its own
   * backing: only a view minted inside this image's private span registry passes. */
  static canonicalBackingForPlatform(image: NativeSharedModuleImage, platform: NativeRuntimePlatform,
    fields: NativeHeapObjectViews): NativeValue<NativeMemoryBacking> {
    try { const state = stateFor(image, platform); return known(retainedView(state, fields, false).range.backing); }
    catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  static canonicalViewForPlatform(image: NativeSharedModuleImage, platform: NativeRuntimePlatform,
    fields: NativeHeapObjectViews): NativeValue<void> {
    try {
      const state = stateFor(image, platform), proof = retainedView(state, fields, true);
      const geometry = platform.resolveNativePointer({ fields, offset: 0 });
      if (!geometry.known) throw new Error(geometry.reason);
      if (geometry.value.canonicalBacking !== proof.range.backing || geometry.value.offset !== proof.begin ||
          geometry.value.canonicalCapacity !== proof.range.length) throw new Error('Retained SharedBase platform geometry differs');
      return known(undefined);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  #acquire(label: GuidImageLabel | CStringLabel, receipt: {
    address: string; bytes: number; raw: string; knownMask: string;
  }): NativeHeapObjectViews {
    const state = stateFor(this), address = parseSpan(receipt.address, receipt.bytes);
    const containing = [...state.ranges.values()].find(range => address >= range.address && address + receipt.bytes <= range.address + range.length);
    if (containing) {
      if (!containing.registered) throw new Error('SharedBase fragment registration has not completed');
      // Current bytes/masks are retained. A cold receipt never reseeds a live range.
      const fields = recordView(state, containing, address - containing.address, receipt.bytes);
      const admitted = NativeSharedModuleImage.canonicalViewForPlatform(this, state.platform, fields);
      if (!admitted.known) throw new Error(admitted.reason); return fields;
    }
    if ([...state.ranges.values()].some(range => address < range.address + range.length && address + receipt.bytes > range.address)) {
      throw new Error('SharedBase wider or partial-overlap image fragments require segmented resolution; copying retained storage is unowned');
    }
    if (!/^(?:[0-9a-f]{2})+$/.test(receipt.raw) || !/^(?:[0-9a-f]{2})+$/.test(receipt.knownMask) ||
        receipt.raw.length !== receipt.bytes * 2 || receipt.knownMask.length !== receipt.bytes * 2) {
      throw new Error('Exact admitted SharedBase cold bytes and masks required');
    }
    const bytes = Uint8Array.from(receipt.raw.match(/../g)!, value => Number.parseInt(value, 16));
    const masks = Uint8Array.from(receipt.knownMask.match(/../g)!, value => Number.parseInt(value, 16));
    const backing: NativeMemoryBacking = { identity: Object.freeze({}), bytes, knownMask: masks, freed: false };
    const range: ImageRange = { address, length: receipt.bytes, label, backing, identity: backing.identity,
      bytes, masks, byteBuffer: bytes.buffer, maskBuffer: masks.buffer,
      byteOffset: bytes.byteOffset, maskOffset: masks.byteOffset,
      fields: new NativeHeapObjectViews(backing), registered: false };
    state.ranges.set(address, range);
    const fields = recordView(state, range, 0, range.length);
    const mapped = state.platform.registerCanonicalSharedModuleImage(this, fields);
    if (!mapped.known) throw new Error(mapped.reason);
    range.registered = true; return fields;
  }
  /** Existing fragments can yield contained aliases only. A request spanning
   * independently allocated fragments stays unknown; no synthetic copy occurs. */
  resolve(addressText: string, bytes: number): NativeValue<NativeHeapObjectViews> {
    try {
      const state = stateFor(this), address = parseSpan(addressText, bytes);
      const range = [...state.ranges.values()].find(candidate => address >= candidate.address && address + bytes <= candidate.address + candidate.length);
      if (!range) {
        if ([...state.ranges.values()].some(candidate => address < candidate.address + candidate.length && address + bytes > candidate.address)) {
          throw new Error('SharedBase requested span overlaps retained fragments without one contiguous canonical backing');
        }
        throw new Error('Selected SharedBase image span has not been source-admitted and acquired');
      }
      const fields = recordView(state, range, address - range.address, bytes);
      const admitted = NativeSharedModuleImage.canonicalViewForPlatform(this, state.platform, fields);
      if (!admitted.known) throw new Error(admitted.reason); return known(fields);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  guidNullRanges(): NativeValue<NativeSharedGuidNullRanges> {
    try {
      const state = stateFor(this);
      if (state.guidRanges) {
        for (const fields of Object.values(state.guidRanges)) {
          const admitted = NativeSharedModuleImage.canonicalViewForPlatform(this, state.platform, fields);
          if (!admitted.known) throw new Error(admitted.reason);
        }
        return known(state.guidRanges);
      }
      admitNativeSharedGuidNullSource();
      const source = this.#acquire('guidNullSourceLiteral', nativeSharedImageReceipt('guidNullSourceLiteral'));
      const payload = this.#acquire('guidNullPayload', nativeSharedImageReceipt('guidNullPayload'));
      const cppInitializers = this.#acquire('cppInitializers', nativeSharedImageReceipt('cppInitializers'));
      const cInitializers = this.#acquire('cInitializers', nativeSharedImageReceipt('cInitializers'));
      const selected = nativeSharedImageReceipt('guidNullInitializerSlot');
      if (selected.address !== '100e5210' || selected.bytes !== 4) throw new Error('Original SharedBase GUID initializer slot differs');
      const slot = this.resolve(selected.address, selected.bytes);
      if (!slot.known) throw new Error(slot.reason);
      // The selected slot is a physical subview of the complete214-slot table.
      if (slot.value.backing !== cppInitializers.backing ||
          slot.value.bytes.byteOffset !== cppInitializers.bytes.byteOffset + 528 ||
          slot.value.knownMask.byteOffset !== cppInitializers.knownMask.byteOffset + 528) {
        throw new Error('Selected SharedBase GUID slot must alias the canonical C++ table');
      }
      state.guidRanges = Object.freeze({ source, payload, cppInitializers, cInitializers, slot: slot.value });
      return known(state.guidRanges);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  /** Both registry-first and CString-first callers acquire the same authority. */
  cstringLiteralPointer(label: CStringLabel): NativeValue<NativeBytePointer> {
    try {
      const state = stateFor(this);
      const [address, raw, sha256] = label === 'emptyCStringText' ?
        ['100e5e3c', '00', '6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d'] :
        ['100e5e10', '7b7d00', '68e9e86b6926cc2b37df96b5e61bb8cabdab276272bb73f6767e420c3ead0663'];
      const receipt = cstringSource.constBytes[label], bytes = raw.length / 2;
      if (cstringSource.schema !== 'gothic3-script-admin-startup-rules-v1' || cstringSource.inputs.SharedBase !== sharedBase ||
          receipt?.module !== 'SharedBase' || receipt.address !== address || receipt.bytes !== bytes || receipt.raw !== raw || receipt.sha256 !== sha256) {
        throw new Error('Selected original SharedBase CString literal receipt differs');
      }
      const previous = state.cstrings.get(label);
      if (previous) {
        const admitted = NativeSharedModuleImage.canonicalViewForPlatform(this, state.platform, previous.fields);
        if (!admitted.known) throw new Error(admitted.reason);
        if (previous.offset !== 0) throw new Error('Retained SharedBase CString image pointer offset differs');
        return known(previous);
      }
      const fields = this.#acquire(label, { address, bytes, raw, knownMask: 'ff'.repeat(bytes) });
      const pointer = Object.freeze({ fields, offset: 0 }); state.cstrings.set(label, pointer); return known(pointer);
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
  }
  snapshot() {
    const state = states.get(this);
    if (!state || images.get(state.platform) !== this) throw new Error('Actual retained SharedBase image required');
    return Object.freeze({ module: 'SharedBase', inputSha256: sharedBase,
      ranges: Object.freeze([...state.ranges.values()].map(range => Object.freeze({ label: range.label,
        address: range.address.toString(16).padStart(8, '0'), bytes: range.length,
        fields: range.fields, registered: range.registered, lifetimeEnded: range.backing.freed }))),
      wholeSharedImageMapped: false, wholeInitializerTablesExecuted: false });
  }
}
