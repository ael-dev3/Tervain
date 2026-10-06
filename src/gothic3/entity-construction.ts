/** Installed custom gCEntity allocation, constructor, Create and registration.
 * Partial allocations keep their source writes. No renderer/world membership
 * or serialized entity snapshot stands in for this constructor.
 */
import rulesText from '../../assets/gothic3/entity-construction/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeLiveEntity } from './entity-lifecycle';
import type { NativeMaskedWord, NativeSceneEntityRegistry } from './entity-lifecycle';
import { NativeEntityReadData } from './entity-reading';
import type { NativeDynamicEntityReadStorage } from './entity-loading';
import type { NativeEntitySetters } from './entity-setters';
import type { OriginalControlReader } from './control-reading';
import { OriginalPropertyOwner } from './native-properties';
import type { NativeClockTimestampSource } from './world-clock';

const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>;
  allocation: { bytes: number; secondArgument: number }; worldResident: false };
if (rules.schema !== 'gothic3-entity-construction-rules-v1' || rules.allocation.bytes !== 0x1c0 ||
    rules.allocation.secondArgument !== 0x170 || rules.worldResident !== false ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') {
  throw new Error('Original entity constructor receipt differs');
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const ZERO_ID = '0'.repeat(40), F32_MAX = 3.4028234663852886e38;
function u32(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Original DWORD required');
  return value;
}

/** bCGuid constructor initializes only validity byte+10. GUID bytes have no
 * known value until the external generator actually writes them. Padding is
 * deliberately absent. The native HRESULT is ignored by CreateRandom. */
export interface NativeEntityGuidTemporary {
  readonly bytes: Uint8Array; readonly knownMask: Uint8Array;
  valid: boolean; destroyed: boolean;
}
export interface NativeEntityGuidService {
  readonly profile: 'selected-platform-GUID16-service';
  coCreateGuid(temporary: NativeEntityGuidTemporary): NativeValue<number>;
}
/** Browser replacement for the external Windows GUID service. This preserves
 * native GUID field byte order, not the installed OS generation algorithm. */
export function browserEntityGuidService(platform: Pick<Crypto, 'randomUUID'>): NativeEntityGuidService {
  return { profile: 'selected-platform-GUID16-service', coCreateGuid(temporary) {
    try {
      const uuid = platform.randomUUID().toLowerCase();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)) {
        return missing('Browser UUID service returned an invalid GUID');
      }
      const canonical = Uint8Array.from(uuid.replaceAll('-', '').match(/../g)!, value => parseInt(value, 16));
      const order = [3, 2, 1, 0, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13, 14, 15];
      for (let i = 0; i < 16; i++) { temporary.bytes[i] = canonical[order[i]!]!; temporary.knownMask[i] = 0xff; }
      return known(0);
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  } };
}

export interface NativeEntityConstructionSceneAdmin {
  /** Same live SceneAdmin DWORD+134, not a counter captured at factory start. */
  readonly constructionCounter134: { value: number };
  readonly registry: NativeSceneEntityRegistry;
}
export interface NativeEntityConstructionHost {
  readonly guid: NativeEntityGuidService;
  readonly timestamps: NativeClockTimestampSource;
  /** Actual SharedBase.GetIdentity module state. It may initialize its lazy
   * cache; each constructor invocation requests its current pointer again. */
  matrixIdentity(): NativeValue<readonly number[]>;
  /** Actual singleton getter at each native call site. The factory performs
   * two separate reads if the first result is non-NULL. */
  sceneAdmin(): NativeValue<NativeEntityConstructionSceneAdmin | null>;
}
export interface NativeEntityConstructionTrace {
  operation: string; source: string; state: 'attempted' | 'applied'; value?: number | string | null;
}
export interface NativeEntityConstructionAllocation extends NativeDynamicEntityReadStorage {
  readonly guidTemporary: NativeEntityGuidTemporary;
  /** Current contents of uninitialized holders are not source facts. Only
   * named initialized fields/flag masks may be consumed before completion. */
  readonly initializedFields: Set<string>;
  phase: 'node' | 'entity' | 'dynamic' | 'constructed' | 'created' | 'factory-complete';
  vtableClass: 'bCObjectRefBase' | 'eCNode' | 'eCEntity' | 'eCDynamicEntity' | 'gCEntity';
}
export type NativeEntityConstructionResult =
  | { supported: true; target: NativeEntityConstructionAllocation;
      trace: readonly NativeEntityConstructionTrace[]; worldResident: false }
  | { supported: false; reason: string; partial: NativeEntityConstructionDiagnostic | null;
      trace: readonly NativeEntityConstructionTrace[]; worldResident: false };
export interface NativeEntityConstructionDiagnostic {
  readonly identity: string; readonly phase: NativeEntityConstructionAllocation['phase'];
  readonly vtableClass: NativeEntityConstructionAllocation['vtableClass'];
  readonly initializedFields: readonly string[];
  readonly flags: Readonly<NativeMaskedWord>;
  readonly dynamicFlags: Readonly<NativeMaskedWord>;
  readonly guidBytes: readonly (number | null)[];
  readonly knownNumericFields: readonly (readonly [number, number])[];
  readonly propertyId20?: string; readonly creatorId20?: string; readonly modifiedWord?: number;
}
/** Diagnostic copies expose known writes without leaking a partially
 * constructed entity capability or an uninitialized owner's Modified call. */
function diagnostic(target: NativeEntityConstructionAllocation): NativeEntityConstructionDiagnostic {
  return Object.freeze({ identity: target.data.entity.identity, phase: target.phase, vtableClass: target.vtableClass,
    initializedFields: Object.freeze([...target.initializedFields]),
    flags: Object.freeze({ ...target.data.entity.flags }), dynamicFlags: Object.freeze({ ...target.flags1bc }),
    guidBytes: Object.freeze([...target.guidTemporary.bytes].map((value, i) => target.guidTemporary.knownMask[i] === 0xff ? value : null)),
    knownNumericFields: Object.freeze([...target.data.numeric].map(row => Object.freeze(row))),
    ...(target.initializedFields.has('propertyId20') ? { propertyId20: target.data.entity.propertyId20 } : {}),
    ...(target.initializedFields.has('creator') ? { creatorId20: target.creator.propertyId20 } : {}),
    ...(target.initializedFields.has('owner modifiedWord DWORD130') ? { modifiedWord: target.data.entity.propertyOwner.modifiedWord } : {}),
  });
}

export class NativeOriginalEntityFactory {
  private active = false;
  private blocked: string | null = null;
  private nextIdentity = 0;
  private readonly allocations: NativeEntityConstructionAllocation[] = [];
  private readonly rows: NativeEntityConstructionTrace[] = [];
  constructor(readonly identity: string, readonly host: NativeEntityConstructionHost) {
    if (!identity || host.guid.profile !== 'selected-platform-GUID16-service' ||
        host.timestamps.profile !== 'selected-host-monotonic-u32-milliseconds') {
      throw new Error('Explicit GUID and timer platform services required');
    }
  }
  /** Retained heap for diagnosis, including a blocked constructor's prefix.
   * Completion is proved by phase, not allocation/registry presence. */
  heap(): readonly NativeEntityConstructionDiagnostic[] { return Object.freeze(this.allocations.map(diagnostic)); }
  failure(): string | null { return this.blocked; }
  dataFor(entity: NativeLiveEntity): NativeValue<NativeEntityReadData> {
    const allocation = this.allocations.find(value => value.data.entity === entity);
    return allocation && ['constructed', 'created', 'factory-complete'].includes(allocation.phase)
      ? known(allocation.data) : missing('Actual completed constructor and retained entity data required');
  }
  create(): NativeEntityConstructionResult {
    if (this.active) this.blocked = 'Nested construction outside selected successful-allocation profile';
    const fail = (partial: NativeEntityConstructionAllocation | null): NativeEntityConstructionResult => ({
      supported: false, reason: this.blocked!, partial: partial ? diagnostic(partial) : null,
      trace: this.rows.slice(), worldResident: false,
    });
    if (this.blocked) return fail(this.allocations.at(-1) ?? null);
    let target: NativeEntityConstructionAllocation | null = null;
    const record = (operation: string, source: string, state: NativeEntityConstructionTrace['state'],
      value?: NativeEntityConstructionTrace['value']): void => { this.rows.push({ operation, source, state, value }); };
    const write = (field: string, source: string, body: () => void, value?: NativeEntityConstructionTrace['value']): void => {
      if (this.blocked) throw new Error(this.blocked);
      body(); target!.initializedFields.add(field); record(field, source, 'applied', value);
      if (this.blocked) throw new Error(this.blocked);
    };
    const call = <T>(operation: string, source: string, body: () => NativeValue<T>): T => {
      if (this.blocked) throw new Error(this.blocked);
      record(operation, source, 'attempted'); const result = body();
      if (this.blocked) throw new Error(this.blocked);
      if (!result.known) throw new Error(operation + ': ' + result.reason);
      record(operation, source, 'applied'); return result.value;
    };
    this.active = true;
    try {
      const entityIdentity = this.identity + ':entity:' + ++this.nextIdentity;
      const owner = OriginalPropertyOwner.fromConstructor(entityIdentity, 'gCEntity');
      const entity = new NativeLiveEntity(entityIdentity, owner, ZERO_ID, 'deferred-source-construction');
      const data = new NativeEntityReadData(entity, { worldMatrix: new Array(16), localMatrix: new Array(16),
        treeBox: new Array(6), localBox: new Array(6), worldBox: new Array(6),
        worldSphere: new Array(4), localSphere: new Array(4) }, '');
      target = { data, creator: { propertyId20: ZERO_ID }, flags1bc: { value: 0, knownMask: 0 },
        guidTemporary: { bytes: new Uint8Array(16), knownMask: new Uint8Array(16), valid: false, destroyed: false },
        initializedFields: new Set(), phase: 'node', vtableClass: 'bCObjectRefBase' };
      this.allocations.push(target);
      const current = target, temporary = target.guidTemporary;
      record('successful native allocation: new(1c0,170)', 'Game:201d4cb0', 'applied', 0x1c0);
      write('propertyObjectReference', 'SharedBase:10001d07', () => { entity.propertyObjectReference = null; }, null);
      record('RefBase vtable', 'SharedBase:1004a5ba', 'applied');
      write('referenceWord', 'SharedBase:10001d07', () => { entity.referenceWord = 1; }, 1);
      target.vtableClass = 'eCNode'; record('Node vtable', 'Engine:304808d0', 'applied');
      write('child array capacity/count/backing', 'Engine:304808d0', () => { entity.children.length = 0; }, 0);
      write('propertyId20', 'SharedBase:10092aa0', () => { entity.propertyId20 = ZERO_ID; }, ZERO_ID);
      write('temporary GUID validity', 'SharedBase:10012980', () => { temporary.valid = false; }, 0);
      call('CoCreateGuid into actual temporary16 (HRESULT ignored)', 'SharedBase:10012570', () => this.host.guid.coCreateGuid(temporary));
      write('temporary GUID validity', 'SharedBase:10012570', () => { temporary.valid = true; }, 1);
      if (temporary.knownMask.length !== 16 || temporary.bytes.length !== 16 || temporary.knownMask.some(byte => byte !== 0xff)) {
        throw new Error('External GUID service did not establish every original GUID byte');
      }
      record('bCGuid.GetGuid returns same temporary pointer', 'SharedBase:10012470', 'applied');
      const generatedId = [...temporary.bytes].map(byte => byte.toString(16).padStart(2, '0')).join('') + '00000000';
      write('propertyId20', 'SharedBase:10092760', () => { entity.propertyId20 = generatedId; }, generatedId);
      write('temporary GUID destructor RET', 'SharedBase:10012440', () => { temporary.destroyed = true; });
      write('parent', 'Engine:30480902', () => { entity.parent = null; }, null);
      write('DWORD2c', 'Engine:30480905', () => { data.numeric.set(0x2c, 0); }, 0);
      target.phase = 'entity'; target.vtableClass = 'eCEntity';
      record('embedded math constructors have no stores', 'Engine:304b67c0', 'applied');
      write('name CString constructor', 'Engine:304b67c0', () => { data.name = ''; }, '');
      write('property array capacity/count/backing', 'Engine:304b67c0', () => { entity.propertySets.length = 0; }, 0);
      write('property array default comparator/sorted', 'Engine:304b67c0', () => {
        entity.propertyArraySorted = true; entity.propertySortProfile = 'default';
      });
      for (const [offset, value] of [[0x16c, 0], [0x170, 0], [0x174, 0], [0x178, 0]] as const) {
        write('frustum field0x' + offset.toString(16), 'Engine:30399070', () => { data.numeric.set(offset, value); }, value);
      }
      write('frustum entity pointer', 'Engine:30399070', () => { entity.frustumEntity = null; }, null);
      for (const [offset, value] of [[0x15c, 0], [0x14c, 0], [0x150, 1], [0x160, 0], [0x164, 0],
        [0x168, 0xffffffff], [0x17c, 0], [0x180, 0], [0x188, 0], [0x154, 1], [0x184, 0]] as const) {
        write('frustum field0x' + offset.toString(16), 'Engine:30399070', () => { data.numeric.set(offset, value); }, value);
      }
      const stamp = call('frustum bCTimer.GetTimeStamp', 'Engine:303990bc', () => known(u32(this.host.timestamps.readMilliseconds())));
      write('frustum field0x15c', 'Engine:30399070', () => { data.numeric.set(0x15c, stamp); }, stamp);
      write('property type bits', 'Engine:304b2a30', () => { entity.propertyTypeBits.fill(0); }, 0);
      write('physical object pointer DWORD30', 'Engine:304b2a30', () => { data.numeric.set(0x30, 0); }, 0);
      write('entity initial flag mask', 'Engine:304b2a30', () => { entity.initializeEntityConstructorFlags(); });
      for (const field of ['worldMatrix', 'localMatrix'] as const) {
        const identity = call('bCMatrix.GetIdentity for ' + field, 'SharedBase:10032010', () => this.host.matrixIdentity());
        if (identity.length !== 16) throw new Error('Actual identity matrix pointer requires sixteen native fields');
        for (let i = 0; i < 16; i++) {
          const value = identity[i]!;
          if (!Number.isFinite(value) || !Object.is(value, Math.fround(value))) throw new Error('Selected finite float32 matrix profile required');
          write(field + ':' + i, 'SharedBase:10032010', () => { data.arrays[field][i] = value; }, value);
        }
      }
      for (const field of ['localBox', 'worldBox', 'treeBox'] as const) {
        write(field, 'SharedBase:1002a8a0', () => { data.arrays[field].splice(0, 6, F32_MAX, F32_MAX, F32_MAX, -F32_MAX, -F32_MAX, -F32_MAX); });
      }
      for (const field of ['worldSphere', 'localSphere'] as const) {
        write(field, 'SharedBase:10036c70', () => { data.arrays[field].splice(0, 4, -F32_MAX, 0, 0, 0); });
      }
      write('name CString clear', 'SharedBase:100149b0', () => { data.name = ''; }, '');
      write('entity render-priority mask', 'Engine:304b2a30', () => { entity.completeEntityConstructorFlags(); });
      for (const [offset, value] of [[0x38, 0], [0x190, 0], [0x18c, 0], [0x34, 1], [0x128, 1], [0x12c, 1]] as const) {
        write('entity field0x' + offset.toString(16), 'Engine:304b2a30', () => { data.numeric.set(offset, value); }, value);
      }
      // DWORD130 has one physical store, already used by ReadV83/notifications.
      write('owner modifiedWord DWORD130', 'Engine:304b2a30', () => { owner.modifiedWord = 0xffffffff; }, 0xffffffff);
      write('entity field0x134', 'Engine:304b2a30', () => { data.numeric.set(0x134, 1); }, 1);
      target.phase = 'dynamic'; target.vtableClass = 'eCDynamicEntity';
      write('creator', 'SharedBase:10092aa0', () => { current.creator.propertyId20 = ZERO_ID; }, ZERO_ID);
      const dynamicWord = (mask: number): void => write('dynamic flags1bc mask' + mask.toString(16), 'Engine:304be7f0', () => {
        const flags: NativeMaskedWord = current.flags1bc;
        flags.value &= ~mask; flags.knownMask = (flags.knownMask | mask) & 0xffff;
      });
      dynamicWord(0xf0);
      write('dynamic enable flag mask', 'Engine:304be7f0', () => { entity.initializeDynamicConstructorFlags(); });
      dynamicWord(0xff00); dynamicWord(0x0f);
      write('context', 'Engine:304be7f0', () => { entity.context = null; }, null);
      write('creator Destroy', 'SharedBase:10092880', () => { current.creator.propertyId20 = ZERO_ID; }, ZERO_ID);
      write('dynamic kind flag mask', 'Engine:304be7f0', () => { entity.completeDynamicConstructorFlags(); });
      const constructorAdmin = call('constructor SceneAdmin getter', 'Engine:30009a2a', () => this.host.sceneAdmin());
      if (constructorAdmin === null) throw new Error('Original dynamic constructor dereferences its SceneAdmin; NULL has no supported success path');
      const counter = u32(constructorAdmin.constructionCounter134.value);
      write('live SceneAdmin DWORD134 increment', 'Engine:304be7f0', () => {
        constructorAdmin.constructionCounter134.value = (counter + 1) >>> 0;
      }, (counter + 1) >>> 0);
      target.vtableClass = 'gCEntity'; target.phase = 'constructed';
      record('Game final vtable', 'Game:2012bdc0', 'applied');
      write('virtual gCEntity.Create', 'Game:201d4cd9', () => { entity.create(); target!.phase = 'created'; }, 1);
      const firstAdmin = call('factory SceneAdmin getter for NULL check', 'Game:201d4cdb', () => this.host.sceneAdmin());
      if (firstAdmin !== null) {
        const secondAdmin = call('factory fresh SceneAdmin getter for registration', 'Game:201d4ce5', () => this.host.sceneAdmin());
        if (secondAdmin === null) throw new Error('Original second SceneAdmin getter dereferences its result; NULL is unresolved');
        call('RegisterEntity generated constructor ID', 'Game:201d4cec', () => {
          const result = secondAdmin.registry.register(entity);
          return result.outcome === 'complete' ? known(result.value) : missing(result.required);
        });
      }
      target.phase = 'factory-complete'; return { supported: true, target, trace: this.rows.slice(), worldResident: false };
    } catch (error) {
      this.blocked = error instanceof Error ? error.message : String(error); return fail(target);
    } finally { this.active = false; }
  }
}

/** Share Control's actual SharedBase cache with the entity constructor. The
 * sixteen getters read its current physical bytes at each original copy step;
 * this is a pointer view rather than an earlier matrix-value snapshot. */
export function connectConstructorMatrixIdentity(control: Pick<OriginalControlReader, 'matrixIdentity'>):
  NativeEntityConstructionHost['matrixIdentity'] {
  return () => {
    const result = control.matrixIdentity();
    if (!result.known) return result;
    const pointer = result.value, fields = new Array<number>(16);
    for (let i = 0; i < 16; i++) Object.defineProperty(fields, String(i), {
      enumerable: true, get: () => pointer.float(i * 4),
    });
    return known(Object.freeze(fields));
  };
}
/** Concrete Control.SetEntity callback over the same constructed entity. The
 * existing setter handles flags, actual child traversal and process callbacks. */
export function connectConstructedControlSetEntity(factory: NativeOriginalEntityFactory, setters: NativeEntitySetters):
  (incoming: NativeLiveEntity, disabled: false) => NativeValue<void> {
  return (incoming, disabled) => {
    const data = factory.dataFor(incoming);
    if (!data.known) return data;
    const result = setters.execute(data.value, 'DisableProcessing', disabled);
    return result.supported ? known(undefined) : missing(result.reason);
  };
}
