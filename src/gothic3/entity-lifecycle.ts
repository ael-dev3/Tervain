/** Original entity/property ownership and stored-identity lifecycle.
 *
 * An original source definition is not a resident or processing entity. These
 * operations retain actual object/value-store identity and native callback
 * order. Full reflection construction, class-specific reads, template patching,
 * PVS/cache-in and physics are explicit dependencies. No renderer membership is
 * used. Numeric stores reconstruct JS uint32/float32, not captured x87 behavior.
 */
import rulesText from '../../assets/gothic3/entity-lifecycle/runtime-rules.json?raw';
import manifestText from '../../assets/gothic3/entity-lifecycle/manifest.json?raw';
import type { NativeValue } from './dialogue';
import { OriginalEnclaveProxy, OriginalPropertyOwner } from './native-properties';
import type { OriginalPropertyOwnerKind } from './native-properties';
import type { NativeNavigationPath } from './navigation-scene';
import { invertNativeNavigationMatrix } from './navigation-scene';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>;
  propertyOwnerOffset: number; propertyAddedBeforeAppend: boolean; propertyIDEqualityBytes: number;
  propertyTypes: Record<string, number>;
  navPath: { vtable: string; inheritedNotifications: boolean; currentReadVersion: number } };
if (rules.schema !== 'gothic3-entity-lifecycle-rules-v1' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.propertyOwnerOffset !== 0x0c || rules.propertyAddedBeforeAppend !== true ||
    rules.propertyIDEqualityBytes !== 16 || rules.navPath.vtable !== '2068f414' ||
    rules.navPath.inheritedNotifications !== true || rules.navPath.currentReadVersion !== 39) {
  throw new Error('Unsupported original entity-lifecycle receipt');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function uint(value: number, bits = 32): number {
  if (!Number.isInteger(value) || value < 0 || value > (bits === 32 ? 0xffffffff : 2 ** bits - 1)) {
    throw new TypeError('Expected native uint' + bits);
  }
  return value;
}
function id(value: string): string {
  if (!/^[a-f0-9]{40}$/.test(value)) throw new TypeError('Expected 20 original PropertyID bytes');
  return value;
}
function key(value: string): string { return id(value).slice(0, 32); }
export function nativeEntityIdValid(value: string): boolean { return !/^0{32}$/.test(key(value)); }
/** Only literal GetPropertySetType returns audited for these concrete classes.
 * A missing class requires its actual getter/factory; no inferred ordinal. */
export function nativeLifecyclePropertyType(className: string): NativeValue<number> {
  const value = rules.propertyTypes[className];
  return value !== undefined && Number.isInteger(value) && value >= 0 && value <= 127
    ? known(value) : missing('Unaudited native property-set type for ' + className);
}
function fact<T>(value: NativeValue<T>, name: string): T {
  if (!value.known) throw new Error(name + ': ' + value.reason);
  return value.value;
}
export type NativeLifecycleResult<T> =
  | { outcome: 'complete'; value: T; applied: readonly string[]; attempted: readonly string[] }
  | { outcome: 'unsupported' | 'partial'; value: null; required: string;
      applied: readonly string[]; attempted: readonly string[] };
class Operation {
  readonly applied: string[] = [];
  readonly attempted: string[] = [];
  constructor(private readonly guard: () => void) {}
  callback<T>(label: string, body: () => NativeValue<T>): T {
    // Unknown/throwing callbacks can have already applied a native prefix.
    this.guard(); this.attempted.push(label);
    const response = body(); this.guard();
    const result = fact(response, label);
    this.applied.push(label);
    return result;
  }
  write(label: string, body: () => void): void {
    this.guard(); body(); this.applied.push(label); this.guard();
  }
}
/** Blocking after a partial prefix is an integration guard, not a native reset.
 * Reconstruct a fresh detached state/host if rollback and replay are required. */
class LifecycleGuard {
  private active = false;
  private reentrantAttempt = false;
  private blocked: string | null = null;
  failure(): string | null { return this.blocked; }
  protected run<T>(body: (op: Operation) => T): NativeLifecycleResult<T> {
    const op = new Operation(() => {
      if (this.reentrantAttempt) throw new Error('A callback attempted unsupported reentrant lifecycle mutation.');
    });
    if (this.active) this.reentrantAttempt = true;
    if (this.active || this.blocked) return { outcome: 'unsupported', value: null,
      required: this.blocked ?? 'Reentrant lifecycle operation is unsupported.', applied: [], attempted: [] };
    this.active = true;
    this.reentrantAttempt = false;
    try {
      const value = body(op);
      if (this.reentrantAttempt) throw new Error('A callback attempted unsupported reentrant lifecycle mutation.');
      return { outcome: 'complete', value,
        applied: Object.freeze(op.applied), attempted: Object.freeze(op.attempted) };
    }
    catch (error) {
      const required = error instanceof Error ? error.message : String(error);
      const partial = op.applied.length > 0 || op.attempted.length > 0;
      if (partial) this.blocked = required;
      return { outcome: partial ? 'partial' : 'unsupported', value: null, required,
        applied: Object.freeze(op.applied), attempted: Object.freeze(op.attempted) };
    } finally { this.active = false; }
  }
}

/** Constructor masks preserve uninitialized backing bits. Never substitute a
 * zero-filled complete flag word for the original masked constructor writes. */
export interface NativeMaskedWord { value: number; knownMask: number }
function maskedWrite(word: NativeMaskedWord, mask: number, value: number): void {
  uint(word.value); uint(word.knownMask); uint(mask); uint(value);
  word.value = ((word.value & ~mask) | (value & mask)) >>> 0;
  word.knownMask = (word.knownMask | mask) >>> 0;
}
function maskedBit(word: NativeMaskedWord, mask: number): NativeValue<boolean> {
  return (word.knownMask & mask) === mask ? known((word.value & mask) === mask)
    : missing('Entity flag mask0x' + mask.toString(16) + ' has no proven backing bits.');
}

/** One actual pointer identity, sharing the parent's existing property owner.
 * Supplying a constructor ID means supplying the CreateRandom result; it is
 * not a serialized-ID shortcut. Random generation/allocation are not ported. */
export class NativeLiveEntity {
  propertyId20: string;
  referenceWord = 1; // SharedBase10001d07, high-bit validity is separate from Node.IsValid.
  /** The fresh custom gCEntity constructor has no reflective wrapper. A later
   * wrapper attachment must use its actual Add/ReleaseReference implementation. */
  propertyObjectReference: NativePropertyObjectReference | null = null;
  readonly flags: NativeMaskedWord = { value: 0, knownMask: 0 };
  readonly propertySets: NativeLivePropertySet<object>[] = [];
  readonly propertyTypeBits = new Uint32Array(4);
  propertyArraySorted = true;
  readonly children: NativeLiveEntity[] = [];
  parent: NativeLiveEntity | null = null;
  context: NativeDynamicGraphContext | null = null;
  frustumEntity: NativeLiveEntity | null = null;
  propertySortProfile: 'default' | 'entity-property-set' = 'default';
  /** A host value, not a browser radius or source enabled flag. */
  sourceReadStage: 'constructor' | 'node-id-read' | 'entity-read-complete' = 'constructor';
  private constructorFlags: 'entity-pending' | 'entity-final-pending' |
    'dynamic-pending' | 'dynamic-final-pending' | 'complete' = 'entity-pending';
  constructor(readonly identity: string, readonly propertyOwner: OriginalPropertyOwner,
    constructorId20: string, initialization: 'complete' | 'deferred-source-construction' = 'complete') {
    if (!identity || !['eCEntity', 'eCSpatialEntity', 'eCDynamicEntity', 'gCEntity'].includes(propertyOwner.kind)) {
      throw new TypeError('An audited concrete entity owner and pointer identity are required.');
    }
    this.propertyId20 = id(constructorId20);
    if (initialization === 'complete') {
      this.initializeEntityConstructorFlags();
      this.completeEntityConstructorFlags();
      if (this.kind === 'eCDynamicEntity' || this.kind === 'gCEntity') {
        this.initializeDynamicConstructorFlags(); this.completeDynamicConstructorFlags();
      }
    }
  }
  /** Deferred construction uses the same physical flags after the original
   * frustum timestamp call. Existing callers retain the completed defaults. */
  initializeEntityConstructorFlags(): void {
    if (this.constructorFlags !== 'entity-pending') throw new Error('Entity constructor flags already applied');
    // Engine304b2a30: ANDc003d838/OR1828 before embedded matrix/box clears.
    maskedWrite(this.flags, (~0xc003d838 | 0x1828) >>> 0, 0x1828);
    this.constructorFlags = 'entity-final-pending';
  }
  completeEntityConstructorFlags(): void {
    if (this.constructorFlags !== 'entity-final-pending') throw new Error('Entity constructor flag tail outside source stage');
    // Original render-priority clear follows the name CString clear.
    maskedWrite(this.flags, 0x3c000, 0);
    if (this.kind === 'eCSpatialEntity') maskedWrite(this.flags, 0x7c, 0x2c);
    this.constructorFlags = this.kind === 'eCDynamicEntity' || this.kind === 'gCEntity'
      ? 'dynamic-pending' : 'complete';
  }
  initializeDynamicConstructorFlags(): void {
    if (this.constructorFlags !== 'dynamic-pending') throw new Error('Dynamic constructor flags outside source stage');
    maskedWrite(this.flags, 0x3c, 0x2c);
    this.constructorFlags = 'dynamic-final-pending';
  }
  completeDynamicConstructorFlags(): void {
    if (this.constructorFlags !== 'dynamic-final-pending') throw new Error('Dynamic constructor flag tail outside source stage');
    maskedWrite(this.flags, 0x800000, 0x800000);
    this.constructorFlags = 'complete';
  }
  get kind(): OriginalPropertyOwnerKind { return this.propertyOwner.kind; }
  /** gCEntity inherits eCNode::IsValid: any of its first four ID DWORDs nonzero. */
  isValid(): boolean { return nativeEntityIdValid(this.propertyId20); }
  /** Exact Create chain subset (no cache-in or world activation): reference
   * high bit, frustum backpointer, property-sort comparator, return1. */
  create(): 1 {
    if (this.constructorFlags !== 'complete') throw new Error('Create requires completed original constructor flags');
    if (this.kind === 'eCSpatialEntity') throw new Error('The spatial Create override is outside the proved dynamic/base Create chain.');
    this.referenceWord = (uint(this.referenceWord) | 0x80000000) >>> 0;
    this.frustumEntity = this;
    this.propertySortProfile = 'entity-property-set';
    return 1;
  }
  setKnownFlags(word: number): void { this.flags.value = uint(word); this.flags.knownMask = 0xffffffff; }
}

/** SceneAdmin registered-entity table operations; source candidates are never registered
 * by constructing this table. Synchronization is browser single-threaded; the
 * original critical-section/multithread scheduling is not reconstructed. */
export class NativeSceneEntityRegistry extends LifecycleGuard {
  private readonly registered = new Map<string, NativeLiveEntity>();
  register(entity: NativeLiveEntity | null): NativeLifecycleResult<boolean> {
    return this.run((op) => {
      if (entity === null) return false;
      if (!entity.isValid()) op.write('virtual Create (return ignored)', () => { entity.create(); });
      op.write('SceneAdmin.registered[ID]=entity', () => { this.registered.set(key(entity.propertyId20), entity); });
      return true;
    });
  }
  unregister(entity: NativeLiveEntity | null): NativeLifecycleResult<boolean> {
    return this.run((op) => {
      if (entity === null) return false;
      // Native erases the key, even if a different object overwrote that ID.
      const result = this.registered.delete(key(entity.propertyId20));
      if (result) op.applied.push('SceneAdmin.registered.erase(ID)');
      return result;
    });
  }
  /** Engine30020347: u16 version consumed, unregister, ID stream read, register.
   * readId is a stream boundary and may fail after unregister has happened. */
  readNodeIdentity(entity: NativeLiveEntity, nodeVersion: number,
    readId: () => NativeValue<string>): NativeLifecycleResult<1> {
    return this.run((op) => {
      uint(nodeVersion, 16); // Original Node.Read does not reject its version.
      op.write('Node.Read unregister old ID', () => { this.registered.delete(key(entity.propertyId20)); });
      const serialized = op.callback('Node.Read serialized PropertyID', readId);
      // SharedBase operator>> consumes20 bytes but preserves only first16 and
      // zeros the trailing cache DWORD. The source candidate retains raw20.
      op.write('Node.Read ID.copy16/clear trailing DWORD', () => {
        entity.propertyId20 = id(serialized).slice(0, 32) + '00000000';
      });
      if (!entity.isValid()) op.write('RegisterEntity virtual Create (return ignored)', () => { entity.create(); });
      op.write('Node.Read register new ID', () => { this.registered.set(key(entity.propertyId20), entity); });
      entity.sourceReadStage = 'node-id-read';
      return 1;
    });
  }
  /** Exact first table only; absence is NOT a complete SceneAdmin.GetEntity miss. */
  findRegistered(id20: string): NativeLiveEntity | null { return this.registered.get(key(id20)) ?? null; }
  /** Engine30020356: hint0 registered→spatial→template, hint1 spatial→template,
   * hint2 template; all other hints returnnull. Missing lower-table hosts stay
   * unknown; they cannot become an empty live proxy merely because not loaded. */
  getEntity(id20: string, hint: number, host: NativeSceneLookupHost): NativeValue<NativeLiveEntity | null> {
    key(id20);
    if (!Number.isInteger(hint)) throw new TypeError('Expected native entity-type hint.');
    if (hint === 0) { const entity = this.findRegistered(id20); if (entity) return known(entity); }
    if (hint === 0 || hint === 1) {
      const spatial = host.findSpatial(id20);
      if (!spatial.known || spatial.value !== null) return spatial;
    } else if (hint !== 2) return known(null);
    return host.findTemplate(id20);
  }
}
export interface NativeSceneLookupHost {
  findSpatial(id20: string): NativeValue<NativeLiveEntity | null>;
  findTemplate(id20: string): NativeValue<NativeLiveEntity | null>;
}

export interface NativePropertyOwnerStorage {
  read(): NativeLiveEntity | null;
  /** Exact backing assignment, not a property notification or a copied owner. */
  write(entity: NativeLiveEntity | null): void;
}
export interface NativePropertyObjectReference {
  getReferenceCount(): NativeValue<number>;
  addReference(): NativeValue<number>;
  releaseReference(): NativeValue<number>;
}
export interface NativePropertyCallbacks {
  added(set: NativeLivePropertySet<object>): NativeValue<void>;
  removed(set: NativeLivePropertySet<object>): NativeValue<void>;
  postRead(set: NativeLivePropertySet<object>): NativeValue<void>;
}
/** Exact value storage can be OriginalEntityPropertySet.values, an area object,
 * or another proven physical PS store. No copying/replacement happens here. */
export class NativeLivePropertySet<P extends object> {
  referenceWord = 1;
  readonly baseFlags: NativeMaskedWord = { value: 1, knownMask: 0x0f };
  constructor(readonly identity: string, readonly className: string, readonly propertyType: number,
    readonly values: P, readonly owner: NativePropertyOwnerStorage,
    public wrapper: NativePropertyObjectReference | null,
    readonly callbacks: NativePropertyCallbacks, readonly processable: () => NativeValue<boolean>,
    /** Concrete virtual override must perform its own inherited raw assignment
     * before any class-specific effects, preserving a failed callback prefix. */
    readonly setEntityOverride?: (entity: NativeLiveEntity | null) => NativeValue<void>) {
    if (!identity || !className || className.includes('\0') || propertyType < 0 || propertyType > 127) {
      throw new TypeError('Original pointer/class/PS type0..127 required.');
    }
    uint(propertyType);
  }
  setEntity(entity: NativeLiveEntity | null): NativeValue<void> {
    if (this.setEntityOverride) return this.setEntityOverride(entity);
    this.owner.write(entity); return known(undefined);
  }
  /** Base bCObjectRefBase validity only. A class-specific override must remain
   * its actual callback; NavPath's pinned slot inherits this exact profile. */
  isValid(): boolean { return (uint(this.referenceWord) & 0x80000000) !== 0; }
  /** Engine base Create only; derived defaults/notifications are not implied. */
  createBase(): 1 { this.referenceWord = (uint(this.referenceWord) | 0x80000000) >>> 0; return 1; }
  /** Engine3000df8a consumes its own u16/base bool. This is NOT automatically
   * called by Navigation/NavPath.Read, which consume only their derived tail. */
  readBase(version: number, serializedValid?: boolean): 1 {
    uint(version, 16);
    if (version > 1 && typeof serializedValid !== 'boolean') throw new TypeError('Base Read needs its serialized bool.');
    maskedWrite(this.baseFlags, 1, version > 1 ? Number(serializedValid) : 1);
    return 1;
  }
}
export interface NativeEntityPropertyHost {
  /** Native virtual OnReadContent, potentially loading previously absent data. */
  onReadContent(entity: NativeLiveEntity): NativeValue<void>;
  cacheOut(entity: NativeLiveEntity, recursive: false, destroy: false): NativeValue<void>;
  pvsAddNewEntity(entity: NativeLiveEntity): NativeValue<void>;
  /** Exact internal proxy SetEntity(null)/reload/ReleaseReference/clear tail. */
  releaseEntityProxyInternal(entity: NativeLiveEntity): NativeValue<void>;
}
/** Concrete eCNode.OnReadContent is empty for the audited four entity classes.
 * Template/resource subclasses with different vtables are excluded by kind. */
export function nativeEntityOnReadContent(entity: NativeLiveEntity): NativeValue<void> {
  return ['eCEntity', 'eCSpatialEntity', 'eCDynamicEntity', 'gCEntity'].includes(entity.kind)
    ? known(undefined) : missing('Unaudited OnReadContent virtual receiver.');
}
/** Current ReadV83 uses unsorted AddPropertySet(false). Sorted insertion uses
 * a comparator and is an explicit unsupported profile here. Callback attempts
 * block automatic replay after a partial prefix. */
export class NativeEntityPropertyLifecycle extends LifecycleGuard {
  constructor(readonly host: NativeEntityPropertyHost) { super(); }
  add(entity: NativeLiveEntity, set: NativeLivePropertySet<object> | null,
    sort = false): NativeLifecycleResult<boolean> {
    return this.run((op) => {
      if (set === null) return false;
      if (set.wrapper === null) {
        throw new Error('Native GE_MESSAGEF_WARN for a missing PS property object is not ported; false cannot skip its observer boundary.');
      }
      if (typeof sort !== 'boolean') throw new TypeError('Expected native sort bool.');
      if (set.propertyType === 0 || set.propertyType === 4) {
        throw new Error('Native name→AccessorCreator→GetPropertySetType lookup for PS types0/4 is not implemented.');
      }
      // Native GetPropertySet invokes OnReadContent before searching.
      op.callback('GetPropertySet.OnReadContent', () => this.host.onReadContent(entity));
      const bucket = set.propertyType >> 5;
      const present = (entity.propertyTypeBits[bucket]! & (1 << (set.propertyType & 31))) !== 0;
      const duplicate = present && this.searchType(entity, set.propertyType, op) !== null;
      if (duplicate) return false;
      if (set.owner.read() !== null) throw new Error('Native fatal: PS is already owned by another entity.');
      if (sort) throw new Error('Sorted AddPropertySet(true) comparator/insertion not implemented.');
      const cached = fact(maskedBit(entity.flags, 0x100), 'Entity cached flag');
      if (cached) op.callback('CacheOut(false,false)', () => this.host.cacheOut(entity, false, false));
      op.callback('PS.SetEntity(owner)', () => set.setEntity(entity));
      op.callback('PS.OnPropertySetAdded', () => set.callbacks.added(set));
      // Native re-fetches wrapper after OnAdded, and again before AddReference.
      if (set.wrapper !== null) op.callback('PS.wrapper.AddReference', () => {
        const wrapper = set.wrapper;
        return wrapper ? wrapper.addReference() : missing('OnAdded invalidated the reloaded wrapper.');
      });
      if (entity.propertySets.length >= 0xffff) throw new Error('Native uint16 PS array overflow is unsupported.');
      op.write('entity.propertySets.append', () => {
        if (entity.propertySets.length !== 0) entity.propertyArraySorted = false;
        entity.propertySets.push(set);
      });
      op.write('entity.propertyTypeBits.set', () => {
        const bucket = set.propertyType >> 5;
        entity.propertyTypeBits[bucket] = (entity.propertyTypeBits[bucket]! | (1 << (set.propertyType & 31))) >>> 0;
      });
      if (!fact(maskedBit(entity.flags, 0x4000000), 'Entity processable-PS flag')) {
        const processable = op.callback('PS.IsProcessable', () => set.processable());
        op.write('entity.flags processable-PS', () => maskedWrite(entity.flags, 0x4000000, processable ? 0x4000000 : 0));
      }
      if (cached) op.callback('PVS.AddNewEntity', () => this.host.pvsAddNewEntity(entity));
      op.write('entity.Modified read', () => { entity.propertyOwner.modified(); });
      op.callback('ReleaseEntityProxyInternal', () => this.host.releaseEntityProxyInternal(entity));
      return true;
    });
  }
  private searchType(entity: NativeLiveEntity, type: number, op: Operation): NativeLivePropertySet<object> | null {
    if (!entity.propertyArraySorted) {
      if (entity.propertySortProfile !== 'entity-property-set') {
        throw new Error('Native Create has not installed its property-type comparator.');
      }
      // Original insertion sort can fall through to CRT qsort. For distinct
      // types its final pointer order is unambiguous. Equal-type qsort ordering
      // remains unsupported; do not invent a stable native equal-key order.
      const types = new Set(entity.propertySets.map((p) => p.propertyType));
      if (types.size !== entity.propertySets.length) throw new Error('Native equal-type sort/CRT qsort order requires its original implementation.');
      op.write('SearchForEntity.sort unique property types', () => {
        entity.propertySets.sort((a, b) => a.propertyType - b.propertyType);
        entity.propertyArraySorted = true;
      });
    }
    const list = entity.propertySets;
    if (!list.length) return null;
    let low = 0, high = list.length - 1;
    let middle = Math.trunc(high / 2), difference = type - list[middle]!.propertyType;
    while (low < high) {
      if (difference <= 0) {
        if (difference === 0) return list[middle]!;
        high = middle - 1;
      } else low = middle + 1;
      middle = Math.trunc((high + low) / 2);
      const candidate = list[middle];
      if (!candidate) throw new Error('Native binary-search index left its PS array.');
      difference = type - candidate.propertyType;
    }
    return difference === 0 ? list[middle]! : null;
  }
  getPropertySet(entity: NativeLiveEntity, type: number): NativeLifecycleResult<NativeLivePropertySet<object> | null> {
    return this.run((op) => {
      uint(type); if (type > 127) throw new TypeError('Supported PS bitset domain is0..127.');
      op.callback('GetPropertySet.OnReadContent', () => this.host.onReadContent(entity));
      return (entity.propertyTypeBits[type >> 5]! & (1 << (type & 31))) === 0 ? null : this.searchType(entity, type, op);
    });
  }
  private removeAt(entity: NativeLiveEntity, index: number, op: Operation): boolean {
    op.callback('RemoveAt.OnReadContent', () => this.host.onReadContent(entity));
    if (!Number.isInteger(index) || index < -0x80000000 || index > 0x7fffffff) throw new TypeError('Expected native int index.');
    const nativeIndex = index & 0xffff;
    if (index === -1 || nativeIndex >= entity.propertySets.length) return false;
    op.callback('GetPropertySetAt.OnReadContent', () => this.host.onReadContent(entity));
    const set = entity.propertySets[nativeIndex];
    if (!set) throw new Error('OnReadContent invalidated the indexed native PS.');
    const cached = fact(maskedBit(entity.flags, 0x100), 'Entity cached flag');
    if (cached) op.callback('CacheOut(false,false)', () => this.host.cacheOut(entity, false, false));
    op.callback('PS.OnPropertySetRemoved', () => set.callbacks.removed(set));
    op.callback('PS.SetEntity(null)', () => set.setEntity(null));
    if (entity.propertySets.length !== 0) op.write('entity.propertySets.eraseAt', () => {
      entity.propertyArraySorted = false;
      entity.propertySets.splice(nativeIndex, 1);
    });
    op.write('entity.propertyTypeBits.clear', () => {
      const bucket = set.propertyType >> 5;
      entity.propertyTypeBits[bucket] = (entity.propertyTypeBits[bucket]! & ~(1 << (set.propertyType & 31))) >>> 0;
    });
    if (set.wrapper !== null) op.callback('PS.wrapper.ReleaseReference', () => {
      const wrapper = set.wrapper;
      return wrapper ? wrapper.releaseReference() : missing('Native reloaded property wrapper is unavailable.');
    });
    // Native does not recompute0x4000000 when removing one property set.
    if (cached) op.callback('PVS.AddNewEntity', () => this.host.pvsAddNewEntity(entity));
    op.write('entity.Modified read', () => { entity.propertyOwner.modified(); });
    op.callback('ReleaseEntityProxyInternal', () => this.host.releaseEntityProxyInternal(entity));
    return true;
  }
  remove(entity: NativeLiveEntity, index: number): NativeLifecycleResult<boolean> {
    return this.run((op) => this.removeAt(entity, index, op));
  }
  removeAll(entity: NativeLiveEntity): NativeLifecycleResult<void> {
    return this.run((op) => {
      op.callback('RemoveAll.OnReadContent', () => this.host.onReadContent(entity));
      // Native captures count once and traverses backwards; read callbacks may change count.
      for (let i = entity.propertySets.length - 1; i >= 0; i--) {
        op.callback('RemoveAll.loop.OnReadContent', () => this.host.onReadContent(entity));
        if (i < entity.propertySets.length) this.removeAt(entity, i, op);
      }
      op.write('RemoveAll.clear processable-PS/count', () => {
        maskedWrite(entity.flags, 0x4000000, 0); entity.propertySets.length = 0;
      });
    });
  }
  /** eCDynamicEntity.OnPostRead: GetCount/GetAt/reloaded GetCount in ascending
   * order. Individual classes keep their real OnPostRead callbacks. */
  postRead(entity: NativeLiveEntity): NativeLifecycleResult<void> {
    return this.run((op) => {
      op.callback('PostRead.GetCount.OnReadContent', () => this.host.onReadContent(entity));
      let count = entity.propertySets.length;
      for (let i = 0; i < count; i++) {
        op.callback('PostRead.GetAt.OnReadContent', () => this.host.onReadContent(entity));
        const set = entity.propertySets[i];
        if (!set) throw new Error('Native PostRead indexed PS is unavailable.');
        op.callback('PS.OnPostRead[' + i + ']', () => set.callbacks.postRead(set));
        op.callback('PostRead.GetCount.OnReadContent', () => this.host.onReadContent(entity));
        count = entity.propertySets.length;
      }
    });
  }
}

/** Original map NavPath array uses pointer identity, reverse duplicate search,
 * append on register, stable erase of last match on deregister. */
export class NativeNavPathRegistry {
  private readonly paths: NativeLivePropertySet<object>[] = [];
  get registered(): readonly NativeLivePropertySet<object>[] { return Object.freeze([...this.paths]); }
  register(set: NativeLivePropertySet<object>): 0 | 1 {
    if (set.className !== 'gCNavPath_PS') throw new TypeError('Expected NavPath PS.');
    if (this.paths.lastIndexOf(set) >= 0) return 0;
    this.paths.push(set); return 1;
  }
  deregister(set: NativeLivePropertySet<object>): 0 | 1 {
    const index = this.paths.lastIndexOf(set);
    if (index < 0) return 0;
    this.paths.splice(index, 1); return 1;
  }
}
/** Source-pinned inherited notifications for gCNavPath_PS only. Both outer and
 * inherited inner callbacks re-read owner.Modified, then returntrue. Binding
 * uses the exact area storage retained by NativeStoredNavigationScene. */
export class OriginalNavPathBindings {
  private readonly sets = new WeakMap<NativeNavigationPath, NativeLivePropertySet<object>>();
  bind(path: NativeNavigationPath, set: NativeLivePropertySet<object>): void {
    if (set.className !== 'gCNavPath_PS' || set.values !== path || path.kind !== 'path') {
      throw new TypeError('Bind the actual NavPath value storage and live PS identity.');
    }
    const existing = this.sets.get(path);
    if (existing && existing !== set) throw new Error('One NavPath store cannot identify two native PS objects.');
    this.sets.set(path, set);
  }
  readonly notifyPathProperty = (path: NativeNavigationPath, property: string,
    phase: 'enter' | 'exit', propagated: false): NativeValue<true> => {
    const set = this.sets.get(path);
    if (!set) return missing('NavPath is not bound to an actual live property set.');
    if (typeof property !== 'string' || property.includes('\0') ||
        (phase !== 'enter' && phase !== 'exit') || propagated !== false) {
      return missing('Invalid native NavPath notification arguments.');
    }
    try {
      set.owner.read()?.propertyOwner.modified(); // Engine outer Notify.
      set.owner.read()?.propertyOwner.modified(); // Engine inherited OnNotify.
      return known(true); // SharedBase10008805/100027de.
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  };
}

export interface NativeNavPathLifecycleHost {
  /** Exact stable embedded physical matrix storage, mutable in place for the
   * entity's lifetime. A copied/frozen serialized snapshot does not satisfy
   * this contract: CalcPathHeights later reads the current owner matrix. */
  worldMatrix(entity: NativeLiveEntity): NativeValue<NativeNavigationPath['worldMatrix']>;
  isTemplate(entity: NativeLiveEntity | null): NativeValue<boolean>;
}
export interface NativeNavPathTransientState {
  readonly path: NativeNavigationPath;
  readonly dynamicCollisionCircles: object[];
  /** Same eCEntityProxy implementation; the existing class name reflects its
   * first NPC use, not a different ID/reference algorithm. */
  readonly ownerProxy: OriginalEnclaveProxy;
  /** Raw object+0xb8 byte; GameReset sets it but does not clear height caches. */
  dirtyByteB8: 0 | 1;
  fields: { readonly '0xbc': number; readonly '0xc0': number; readonly '0xc4': number;
    '0x10c': number; '0x110': number; '0xc8': number };
}
/** Only constructor/Invalidate transient fields, following Game20298600 and
 *20005358. Reflective Point/Radius/margins are separate serialized values. */
export function createNativeNavPathTransientState(path: NativeNavigationPath): NativeNavPathTransientState {
  if (path.kind !== 'path' || path.heights !== null) {
    throw new Error('Fresh constructor state requires an uncomputed native NavPath cache.');
  }
  // Query storage's null representation means constructor mean0/max-1/min-1.
  // These readers alias its actual cache and cannot become a second stale copy.
  return { path, dynamicCollisionCircles: [], ownerProxy: OriginalEnclaveProxy.fromConstructor(), dirtyByteB8: 1,
    fields: { get '0xbc'() { return path.heights?.mean ?? 0; },
      get '0xc0'() { return path.heights?.maxOffset ?? -1; },
      get '0xc4'() { return path.heights?.minOffset ?? -1; },
      '0x10c': 0, '0x110': 0, '0xc8': 0 } };
}
/** Current native NavPath read profile39: u16 consumed, no legacy migration.
 * GameReset clears DCC pointers/owner proxy and marks path-height dirty. Unknown
 * lower versions keep the precise legacy read/post-read dependency explicit. */
export function nativeNavPathCallbacks(transient: NativeNavPathTransientState, version: number,
  registry: NativeNavPathRegistry, host: NativeNavPathLifecycleHost): NativePropertyCallbacks {
  const path = transient.path;
  uint(version, 16);
  const validate = (set: NativeLivePropertySet<object>): void => {
    if (set.className !== 'gCNavPath_PS' || set.values !== path || path.kind !== 'path') {
      throw new TypeError('Use the exact live gCNavPath_PS value store for its callbacks.');
    }
  };
  const added = (set: NativeLivePropertySet<object>): NativeValue<void> => {
    try {
      validate(set);
      if (!fact(host.isTemplate(set.owner.read()), 'template RTTI')) registry.register(set);
      if (set.owner.read() !== null) {
        const entity = set.owner.read(); // Native GetEntity is called again.
        if (!entity) throw new Error('NavPath owner changed during GetEntity.');
        const matrix = fact(host.worldMatrix(entity), 'NavPath owner physical world matrix');
        // Native stores its inverse here and re-reads the embedded owner matrix
        // on height calculation. Alias that exact backing storage in the query
        // adapter; an in-place entity transform update stays visible there.
        path.worldMatrix = matrix;
        path.inverseWorldMatrix = invertNativeNavigationMatrix(matrix);
      }
      return known(undefined); // Engine OnPropertySetAdded is empty.
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  };
  return { added,
    removed(set) {
      try {
        validate(set);
        if (!fact(host.isTemplate(set.owner.read()), 'template RTTI')) registry.deregister(set);
        return known(undefined); // Engine OnPropertySetRemoved is empty.
      } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
    },
    postRead(set) {
      if (version !== 39) return missing('Native NavPath read/post-read legacy version' + version + ' is not ported.');
      try {
        validate(set);
        transient.dynamicCollisionCircles.length = 0;
        transient.dirtyByteB8 = 1;
        // GameReset202983f0 leaves object+bc/c0/c4 unchanged. GetZone's
        // CalcAbsHeightDiff recomputes only uninitialized/negative caches.
        transient.ownerProxy.clearEntityPointer(() => {});
        return known(undefined); // Engine base OnPostRead is empty.
      } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
    } };
}

/** Context state models loaded graph ownership only, not PVS residency or ROI.
 * Enabled is separately serialized at native ContextBase byte+0x41. */
export interface NativeDynamicGraphContext {
  readonly identity: string;
  enabled: boolean;
  nodeCount: number;
  graph: NativeLiveEntity | null;
}
export interface NativeEntityFinalReleaseHost {
  /** Virtual deleting destructor(0) followed by MemoryAdmin.DeleteObject.
   * Destruction includes scene/PS/proxy/child lifetime; it is not a Map.delete. */
  destroyAndDelete(entity: NativeLiveEntity): NativeValue<void>;
}
/** Fresh dynamic graph topology follows Node.AttachChild/SetContext and
 * ContextBase.SetGraph. Existing-parent MoveToNode and spatial-context overrides
 * stay explicit. A graph is loaded ownership, not enabled PVS residency. */
export class NativeDynamicGraphLifecycle extends LifecycleGuard {
  constructor(readonly host: NativeEntityFinalReleaseHost) { super(); }
  private addReference(entity: NativeLiveEntity, op: Operation): number {
    if (entity.propertyObjectReference !== null) {
      return op.callback('entity.wrapper.AddReference', () => entity.propertyObjectReference!.addReference());
    }
    op.write('entity.RefWord increment low31', () => {
      const word = uint(entity.referenceWord);
      entity.referenceWord = ((word & 0x80000000) | ((word + 1) & 0x7fffffff)) >>> 0;
    });
    return entity.referenceWord & 0x7fffffff;
  }
  private releaseReference(entity: NativeLiveEntity, op: Operation): number {
    const wrapper = entity.propertyObjectReference;
    if (wrapper !== null && op.callback('entity.wrapper.GetReferenceCount', () => wrapper.getReferenceCount()) !== 0) {
      // Original reloads the wrapper after its count getter.
      return op.callback('entity.wrapper.ReleaseReference', () => {
        const current = entity.propertyObjectReference;
        return current ? current.releaseReference() : missing('Reference-count observer invalidated the wrapper.');
      });
    }
    const word = uint(entity.referenceWord);
    if ((word & 0x7fffffff) > 1) {
      op.write('entity.RefWord decrement low31', () => {
        entity.referenceWord = ((word & 0x80000000) | ((word - 1) & 0x7fffffff)) >>> 0;
      });
      return entity.referenceWord & 0x7fffffff;
    }
    op.write('entity.RefWord clear low31', () => { entity.referenceWord = (word & 0x80000000) >>> 0; });
    op.callback('entity deleting destructor/DeleteObject', () => this.host.destroyAndDelete(entity));
    return 0;
  }
  private setContext(entity: NativeLiveEntity, context: NativeDynamicGraphContext | null, op: Operation,
    visited = new Set<NativeLiveEntity>()): void {
    if (entity.kind === 'eCSpatialEntity') throw new Error('Spatial SetContext override is not the dynamic Node profile.');
    if (visited.has(entity)) throw new Error('Cyclic native graph traversal is unsupported.');
    visited.add(entity);
    if (context === null) {
      const old = entity.context;
      if (old !== null) op.write('old context.nodeCount--', () => { old.nodeCount = (old.nodeCount - 1) | 0; });
    } else if (context !== entity.context) {
      // Native does not decrement a different old nonnull context in this branch.
      op.write('new context.nodeCount++', () => { context.nodeCount = (context.nodeCount + 1) | 0; });
    }
    op.write('node.context=argument', () => { entity.context = context; });
    for (let i = 0; i < entity.children.length; i++) this.setContext(entity.children[i]!, context, op, visited);
    visited.delete(entity);
  }
  attachFreshChild(parent: NativeLiveEntity, child: NativeLiveEntity | null): NativeLifecycleResult<number> {
    return this.run((op) => {
      if (child === null) return -1;
      if (child.parent !== null) throw new Error('Node.MoveToNode for an existing parent is not ported.');
      if (child === parent || parent.kind === 'eCSpatialEntity' || child.kind === 'eCSpatialEntity') {
        throw new Error('Use the proved fresh dynamic graph profile.');
      }
      if (parent.children.length >= 0xffff) throw new Error('Native uint16 child-array overflow is unsupported.');
      op.write('child.parent=parent', () => { child.parent = parent; });
      this.setContext(child, parent.context, op);
      this.addReference(child, op);
      op.write('parent.children.append', () => { parent.children.push(child); });
      return parent.children.length - 1;
    });
  }
  setGraph(context: NativeDynamicGraphContext, graph: NativeLiveEntity | null): NativeLifecycleResult<void> {
    return this.run((op) => {
      if (graph !== null) this.addReference(graph, op);
      const old = context.graph;
      if (old !== null) {
        this.releaseReference(old, op);
        op.write('context.graph=null', () => { context.graph = null; });
      }
      if (graph !== null) this.setContext(graph, context, op);
      op.write('context.graph=argument', () => { context.graph = graph; });
    });
  }
  releaseReadTemporary(entity: NativeLiveEntity): NativeLifecycleResult<number> {
    return this.run((op) => this.releaseReference(entity, op));
  }
}

export interface NativeLifecycleSourceCandidate {
  readonly key: string; readonly index: number; readonly name: string; readonly guid: string;
  readonly creator: string | null; readonly sourceFileIndex: number; readonly sourceClass: 'gCEntity';
  readonly live: false; readonly nativeHeader: Readonly<Record<string, unknown>>;
  readonly flags: readonly number[]; readonly worldMatrix: readonly number[];
  readonly propertySets: readonly { name: string; version: number;
    properties: readonly Readonly<Record<string, unknown>>[]; tail: Readonly<Record<string, unknown>> }[];
}
export interface NativeLifecycleSourceDocument {
  readonly schema: 'gothic3-entity-lifecycle-source-candidates-v1'; readonly world: 'G3_World_01';
  readonly sourceCandidatesAreLiveEntities: false;
  readonly entities: readonly NativeLifecycleSourceCandidate[];
  readonly files: readonly { source: Readonly<Record<string, unknown>>;
    context: { version: 83; enabled: boolean; sourceEntityCount: number; graphRootIndex: number | null;
      layerEntityType: 0 | 1; nativeClass: 'gCEntity'; factoryProof: Readonly<Record<string, unknown>> };
    parents: readonly (readonly [number, number])[]; selectedEntityCount: number;
    fullContextInstantiationSupportedByThisSelection: false }[];
}
const sourceManifest = JSON.parse(manifestText) as { schema: string; inputs: Record<string, string>;
  sourceCandidates: ResourceReceipt & { path: string }; sourceCandidatesAreLiveEntities: false };
if (sourceManifest.schema !== 'gothic3-entity-lifecycle-manifest-v1' ||
    Object.entries(rules.inputs).some(([name, value]) => sourceManifest.inputs[name] !== value) ||
    sourceManifest.sourceCandidatesAreLiveEntities !== false ||
    sourceManifest.sourceCandidates.path !== 'source-candidates.json.gz') {
  throw new Error('Unsupported original lifecycle source receipt');
}
function frozen<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(frozen); Object.freeze(value);
  }
  return value;
}
/** Hash-verified saved candidates only. No constructor, Read/OnPostRead,
 * template patch, scene registration or context enable is invoked by loading. */
export async function loadNativeEntityLifecycleSources(): Promise<NativeLifecycleSourceDocument> {
  const source = await readNativeResource<NativeLifecycleSourceDocument>(
    'entity-lifecycle/' + sourceManifest.sourceCandidates.path, sourceManifest.sourceCandidates,
    { maximumDecodedBytes: 32 * 1024 * 1024 });
  if (source.schema !== 'gothic3-entity-lifecycle-source-candidates-v1' || source.world !== 'G3_World_01' ||
      source.sourceCandidatesAreLiveEntities !== false) throw new Error('Unsupported lifecycle source schema');
  for (const entity of source.entities) {
    id(entity.guid);
    if (entity.live !== false || entity.sourceClass !== 'gCEntity' || !Number.isInteger(entity.sourceFileIndex) ||
        entity.sourceFileIndex < 0 || entity.sourceFileIndex >= source.files.length) {
      throw new Error('Invalid original lifecycle candidate');
    }
  }
  return frozen(source);
}
