/** Concrete notification chain for the audited original property-set classes.
 *
 * Engine Notify* calls owner.Modified, SharedBase dispatches OnNotify*, and
 * the inherited Engine OnNotify* calls owner.Modified again before returning
 * SharedBase's true. Modified reads DWORD+0x130; it does not mark an entity dirty.
 * NPC Enclave changes additionally update the cached enclave entity proxy.
 * This module does not install a generic callback for unexamined PS classes.
 */
import rulesText from '../../assets/gothic3/properties/runtime-rules.json?raw';
import type { NativeRoutineHost, NativeRoutineProperties } from './script-routine';
import type { NativeValue } from './dialogue';

const rules = JSON.parse(rulesText) as {
  schema: string; inputs: Record<string, string>; modifiedWordOffset: number;
  ownerOffset: number; dispatchOffsets: readonly number[];
  defaultModifiedWord: number; profiles: Record<string, { customExit: string | null }>;
  propertyID: { storageBytes: number; equalityBytes: number; assignmentCopiesBytes: number;
    assignmentClearsTrailingDWORD: boolean };
};
if (rules.schema !== 'gothic3-native-properties-rules-v1' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.modifiedWordOffset !== 0x130 || rules.ownerOffset !== 0x0c ||
    rules.dispatchOffsets.join(',') !== '76,80' || rules.defaultModifiedWord !== 0xffffffff ||
    rules.profiles.gCScriptRoutine_PS?.customExit !== null ||
    rules.profiles.gCPlayerMemory_PS?.customExit !== null ||
    rules.profiles.gCNPC_PS?.customExit !== 'Enclave proxy SetEntity unless propagated' ||
    rules.propertyID.storageBytes !== 20 || rules.propertyID.equalityBytes !== 16 ||
    rules.propertyID.assignmentCopiesBytes !== 16 || rules.propertyID.assignmentClearsTrailingDWORD !== true) {
  throw new Error('Original property notification rule receipt differs');
}

export type OriginalPropertyOwnerKind = 'eCEntity' | 'eCSpatialEntity' | 'eCDynamicEntity' | 'gCEntity';
export type OriginalPropertySetKind = 'gCScriptRoutine_PS' | 'gCPlayerMemory_PS' | 'gCNPC_PS';
export type OriginalPropertyPhase = 'enter' | 'exit';
export interface OriginalPropertyTrace {
  operation: 'owner-modified-read' | 'virtual-on-notify' | 'proxy-id-copy' |
    'proxy-release-reference' | 'proxy-internal-clear' | 'proxy-id-destroy' | 'shared-base-return';
  phase: OriginalPropertyPhase;
  property: string;
  owner?: string;
  value?: number | string | boolean | null;
}
export type OriginalPropertyResult =
  | { supported: true; nativeReturnValue: true; trace: readonly OriginalPropertyTrace[] }
  | { supported: false; nativeReturnValue: null; reason: string;
      /** Proxy release callbacks can already have changed external objects. */
      partial: boolean; trace: readonly OriginalPropertyTrace[] };

function unsigned32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(name + ' requires an original uint32 value');
  }
  return value;
}
function propertyID(value: string): string {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new TypeError('Expected 20 original PropertyID bytes as lowercase hex');
  return value;
}

/** The notification-relevant subset of an actual original entity object.
 * A constructor seed is not a loaded entity or complete entity lifecycle. */
export class OriginalPropertyOwner {
  readonly kind: OriginalPropertyOwnerKind;
  modifiedWord: number;
  constructor(readonly identity: string, kind: OriginalPropertyOwnerKind, modifiedWord: number) {
    if (!identity || !['eCEntity', 'eCSpatialEntity', 'eCDynamicEntity', 'gCEntity'].includes(kind)) {
      throw new TypeError('An audited original entity identity and concrete class are required');
    }
    this.kind = kind;
    this.modifiedWord = unsigned32(modifiedWord, 'eCEntity DWORD+0x130');
  }
  static fromConstructor(identity: string, kind: OriginalPropertyOwnerKind): OriginalPropertyOwner {
    return new OriginalPropertyOwner(identity, kind, 0xffffffff);
  }
  modified(): number { return unsigned32(this.modifiedWord, 'live eCEntity DWORD+0x130'); }
}

export interface OriginalProxyInternalReference {
  readonly identity: string;
  /** Real eCEntityProxyInternal::ReleaseReference, including final destruction.
   * An unknown return may expose effects already applied by the callback. */
  releaseReference(): NativeValue<void>;
}
/** Native eCEntityProxy keeps its internal ref only while its ID is unchanged. */
export class OriginalEnclaveProxy {
  private id: string;
  internal: OriginalProxyInternalReference | null;
  constructor(id: string, internal: OriginalProxyInternalReference | null) {
    this.id = propertyID(id);
    this.internal = internal;
  }
  static fromConstructor(): OriginalEnclaveProxy {
    return new OriginalEnclaveProxy('0000000000000000000000000000000000000000', null);
  }
  propertyID(): string { return this.id; }
  /** Exact Entity*-NULL overload, Engine30017e77 ->304c43a0, unlike the
   * PropertyID overload below: release first, clear internal pointer, then
   * SharedBase100059ed Destroy all20 ID bytes. An unknown release preserves
   * the already-attempted prefix and does not proceed to pointer/ID clearing.
   * New source pins reside in the entity-lifecycle receipt; historical
   * property receipts continue to describe their earlier source checkpoint. */
  clearEntityPointer(emit: (operation: OriginalPropertyTrace['operation'], value?: string | null) => void): void {
    const internal = this.internal;
    if (internal !== null) {
      emit('proxy-release-reference', internal.identity);
      const result = internal.releaseReference();
      if (!result.known) throw new Error('Entity-pointer proxy ReleaseReference: ' + result.reason);
      this.internal = null;
      emit('proxy-internal-clear', null);
    }
    this.internal = null; // Native also storesnull unconditionally after this branch.
    emit('proxy-internal-clear', null);
    this.id = '0000000000000000000000000000000000000000';
    emit('proxy-id-destroy', this.id);
  }
  /** ID assignment precedes reference release. Equal IDs leave cached refs intact. */
  setEntity(id: string, emit: (operation: OriginalPropertyTrace['operation'], value?: string | null) => void): void {
    propertyID(id);
    // bCPropertyID equality compares four DWORDs; its trailing cache DWORD is ignored.
    if (id.slice(0, 32) === this.id.slice(0, 32)) return;
    // Assignment copies those four DWORDs and zeroes the trailing cache DWORD.
    this.id = id.slice(0, 32) + '00000000';
    emit('proxy-id-copy', this.id);
    const internal = this.internal;
    if (internal !== null) {
      emit('proxy-release-reference', internal.identity);
      const result = internal.releaseReference();
      if (!result.known) throw new Error('Enclave proxy ReleaseReference: ' + result.reason);
      this.internal = null;
      emit('proxy-internal-clear', null);
    }
  }
}

/** Represents the exact PS pointer and its value storage, including captured
 * receivers retained across Enter/Exit callbacks by the original setters. */
export class OriginalEntityPropertySet<P extends object> {
  private blocked: string | null = null;
  constructor(readonly identity: string, readonly kind: OriginalPropertySetKind,
    readonly values: P, public owner: OriginalPropertyOwner | null,
    readonly npcEnclaveProxy: OriginalEnclaveProxy | null = null) {
    if (!identity || !['gCScriptRoutine_PS', 'gCPlayerMemory_PS', 'gCNPC_PS'].includes(kind) ||
        (kind === 'gCNPC_PS') !== (npcEnclaveProxy !== null)) {
      throw new TypeError('Supply the audited property-set class and its original NPC proxy when required');
    }
  }
  failure(): string | null { return this.blocked; }

  /** Original NotifyPropertyValueChanged*Ex. Values are written by the setter. */
  notify(phase: OriginalPropertyPhase, property: string, propagated: boolean): OriginalPropertyResult {
    return this.run(phase, property, propagated, true);
  }
  /** Original virtual OnNotify* entry, without an additional outer Notify*. */
  onNotify(phase: OriginalPropertyPhase, property: string, propagated: boolean): OriginalPropertyResult {
    return this.run(phase, property, propagated, false);
  }
  private run(phase: OriginalPropertyPhase, property: string, propagated: boolean,
    outer: boolean): OriginalPropertyResult {
    const trace: OriginalPropertyTrace[] = [];
    let mutated = false;
    const emit = (operation: OriginalPropertyTrace['operation'], value?: string | null): void => {
      trace.push({ operation, phase, property, value });
      if (operation === 'proxy-id-copy' || operation === 'proxy-release-reference') mutated = true;
    };
    try {
      if (this.blocked) throw new Error(this.blocked);
      if ((phase !== 'enter' && phase !== 'exit') || typeof property !== 'string' ||
          property.includes('\0') || typeof propagated !== 'boolean') {
        throw new TypeError('An original property name, phase and propagation flag are required');
      }
      const readOwner = (): void => {
        // Both Engine bodies re-read PS.owner; no cached owner pointer is reused.
        const owner = this.owner;
        if (owner !== null) trace.push({ operation: 'owner-modified-read', phase, property,
          owner: owner.identity, value: owner.modified() });
      };
      if (outer) {
        readOwner();
        trace.push({ operation: 'virtual-on-notify', phase, property,
          value: phase === 'enter' ? 0x4c : 0x50 });
      }
      if (this.kind === 'gCNPC_PS' && phase === 'exit' && !propagated && property === 'Enclave') {
        const enclave = (this.values as { Enclave?: unknown }).Enclave;
        if (typeof enclave !== 'string') throw new TypeError('NPC Enclave must be its original 20-byte PropertyID');
        this.npcEnclaveProxy!.setEntity(enclave, emit);
      }
      readOwner();
      trace.push({ operation: 'shared-base-return', phase, property, value: true });
      return { supported: true, nativeReturnValue: true, trace };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (mutated) this.blocked = reason;
      return { supported: false, nativeReturnValue: null, reason, partial: mutated, trace };
    }
  }
}

/** A concrete hook for NativeScriptProcessingUnit. The key is captured value
 * storage identity, so replacing Self.properties does not redirect a setter. */
export class OriginalRoutinePropertyBindings {
  private readonly sets = new WeakMap<NativeRoutineProperties, OriginalEntityPropertySet<NativeRoutineProperties>>();
  bind(set: OriginalEntityPropertySet<NativeRoutineProperties>): void {
    if (set.kind !== 'gCScriptRoutine_PS') throw new TypeError('Expected original ScriptRoutine PS');
    const old = this.sets.get(set.values);
    if (old && old !== set) throw new Error('One native value store cannot identify two property-set objects');
    this.sets.set(set.values, set);
  }
  readonly hook: NonNullable<NativeRoutineHost['propertyHook']> = (phase, _entity, properties, property, propagated) => {
    const set = this.sets.get(properties);
    if (!set) throw new Error('Captured ScriptRoutine property-set pointer is not bound');
    const result = set.notify(phase, property, propagated);
    if (!result.supported) throw new Error(result.reason);
  };
}
