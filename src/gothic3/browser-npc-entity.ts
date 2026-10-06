/** Retained original gCEntity construction and source-ordered read for Ardea.
 * The first Navigation factory's real default-creator prefix is retained at
 * the unowned ErrorAdmin singleton boundary. Registry identity does not imply NPC attachment,
 * graph membership, cache residency, processing range or script activation.
 */
import manifestText from '../../assets/gothic3/npc-entity/manifest.json?raw';
import type { NativeValue } from './dialogue';
import { NativeOriginalEntityFactory, browserEntityGuidService, connectConstructorMatrixIdentity } from './entity-construction';
import type { NativeEntityConstructionAllocation, NativeEntityConstructionResult } from './entity-construction';
import type { OriginalControlReader } from './control-reading';
import { NativeEntityPropertyLifecycle, NativeLivePropertySet, NativeSceneEntityRegistry, nativeEntityOnReadContent } from './entity-lifecycle';
import type { NativeLiveEntity, NativeLifecycleResult, NativeSceneLookupHost } from './entity-lifecycle';
import { NativeEntityByteInput, NativeEntityV83Reader } from './entity-reading';
import type { NativeEntityReadData } from './entity-reading';
import { NativeOriginalDynamicEntityReader, connectOriginalEntityRead } from './entity-loading';
import type { NativeDynamicEntityReadResult } from './entity-loading';
import { NativeEntitySetters, NativeSceneNameRegistry } from './entity-setters';
import { NativeReflectionController } from './entity-reflection';
import { createNativeNavigationFactory } from './navigation-reading';
import type { OriginalNavigationProperties } from './navigation-reading';
import { NativeNavigationLifecycle, NativeNavigationRegistry, createNativeNavigationState } from './navigation-runtime';
import type { NativeNavigationEntity, NativeNavigationLifecycleHost, NativeNavigationState } from './navigation-runtime';
import { monotonicClockMilliseconds } from './world-clock';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const selectedIds = [
  '0c3ad5c499a37e479901ef8b1a19877900000000',
  'ef1adbed209ec647b20ebc9fc989642500000000',
  '81630a69bab9c44b9df46b76df0ac7b100000000',
] as const;
const propertyOrder = ['gCNavigation_PS', 'eCRigidBody_PS', 'eCCollisionShape_PS', 'gCCharacterMovement_PS',
  'gCNPC_PS', 'gCInventory_PS', 'gCScriptRoutine_PS', 'gCInteraction_PS', 'gCDamage_PS',
  'gCDamageReceiver_PS', 'gCFocus_PS', 'gCDialog_PS', 'eCIlluminated_PS', 'gCParty_PS',
  'gCEffect_PS', 'eCVisualAnimation_PS'];

export interface BrowserNpcEntitySourceRecord {
  readonly key: string; readonly name: string; readonly entityIndex: number;
  readonly guid: string; readonly creatorGuid: string;
  readonly sourceOffset: number; readonly endSourceOffset: number; readonly byteLength: number;
  readonly raw: string; readonly sha256: string;
  readonly versions: { readonly outer: 64; readonly dynamic: 83; readonly entity: 83; readonly node: 1 };
  readonly nodeStream: { readonly relativeOffset: 27; readonly sourceOffset: number;
    readonly byteLength: 22; readonly raw: string; readonly sha256: string; readonly guidRelativeOffset: 2 };
  readonly propertySets: readonly { readonly index: number; readonly name: string;
    readonly sourceOffset: number; readonly endSourceOffset: number; readonly byteLength: number;
    readonly serializedRaw: string; readonly serializedSha256: string;
    readonly outerVersion: number; readonly accessorSourceOffset: number;
    readonly accessorEndSourceOffset: number; readonly accessorByteLength: number }[];
}
export interface BrowserNpcEntitySources {
  readonly schema: 'gothic3-npc-entity-source-v1';
  readonly source: { readonly path: string; readonly sha256: string; readonly bytes: number };
  readonly strings: readonly string[];
  /** Original full graph metadata; the other entities' contents are absent.
   * This is source evidence, never a NativeDynamicGraphContext capability. */
  readonly context: { readonly fullEntityContentsIncluded: false;
    readonly selectedEntityIndices: readonly number[]; readonly [key: string]: unknown };
  readonly entities: readonly BrowserNpcEntitySourceRecord[];
}
const admitted = new WeakMap<BrowserNpcEntitySourceRecord, BrowserNpcEntitySources>();
function hexBytes(raw: string, size: number): Uint8Array {
  if (raw.length !== size * 2 || !/^[0-9a-f]+$/.test(raw)) throw new Error('Exact original record bytes required');
  return Uint8Array.from(raw.match(/../g)!, value => parseInt(value, 16));
}
function freeze(value: unknown): void {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
}
/** Resource SHA covers the complete original indexed strings, full selected
 * records and context metadata before any source record becomes admissible. */
export async function loadBrowserNpcEntitySources(): Promise<BrowserNpcEntitySources> {
  const manifest = JSON.parse(manifestText) as { schema: string; records: ResourceReceipt & { path: string } };
  const receipt = manifest.records;
  if (manifest.schema !== 'gothic3-npc-entity-manifest-v1' || receipt?.path !== 'gameplay/npc-entity/bandit-records.json.gz') {
    throw new Error('Selected bandit resource receipt missing');
  }
  const document = await readNativeResource<BrowserNpcEntitySources>(receipt.path, receipt,
    { maximumDecodedBytes: 16 * 1024 * 1024 });
  if (document.schema !== 'gothic3-npc-entity-source-v1' ||
      document.source.sha256 !== '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938' ||
      document.source.bytes !== 80176690 || document.strings.length !== 6069 ||
      document.context.fullEntityContentsIncluded !== false || document.entities.length !== 3) {
    throw new Error('Selected original NPC source profile differs');
  }
  for (const [index, record] of document.entities.entries()) {
    if (record.guid !== selectedIds[index] || record.byteLength !== 6544 ||
        record.endSourceOffset - record.sourceOffset !== record.byteLength ||
        record.versions.outer !== 64 || record.versions.dynamic !== 83 ||
        record.versions.entity !== 83 || record.versions.node !== 1 ||
        record.nodeStream.relativeOffset !== 27 || record.nodeStream.byteLength !== 22 ||
        record.nodeStream.sourceOffset !== record.sourceOffset + 27 || record.nodeStream.guidRelativeOffset !== 2 ||
        record.nodeStream.raw !== record.raw.slice(54, 98) || record.raw.slice(58, 98) !== record.guid ||
        record.propertySets.length !== propertyOrder.length ||
        record.propertySets.some((set, i) => set.index !== i || set.name !== propertyOrder[i] ||
          set.outerVersion !== parseInt(set.serializedRaw.slice(2, 4) + set.serializedRaw.slice(0, 2), 16) ||
          set.endSourceOffset - set.sourceOffset !== set.byteLength ||
          set.serializedRaw !== record.raw.slice((set.sourceOffset - record.sourceOffset) * 2,
            (set.endSourceOffset - record.sourceOffset) * 2))) {
      throw new Error('Selected NPC record or original property order differs');
    }
    hexBytes(record.raw, record.byteLength);
  }
  freeze(document);
  for (const record of document.entities) admitted.set(record, document);
  return document;
}

export interface BrowserNpcEntityServices {
  /** Actual selected browser entropy and monotonic timer services. */
  readonly crypto: Pick<Crypto, 'randomUUID'>;
  readonly now: () => number;
  /** OriginalControlReader's actual lazy SharedBase cache and CRT registration. */
  readonly control: Pick<OriginalControlReader, 'matrixIdentity'>;
  readonly registry?: NativeSceneEntityRegistry;
  readonly names?: NativeSceneNameRegistry;
  /** Same live owned SceneAdmin field used at every constructor call. */
  readonly constructionCounter134?: { value: number };
  /** Unported lower tables remain unknown, even when a source catalog has no
   * match. Callers can connect actual owned spatial/template lookup services. */
  readonly lookup?: NativeSceneLookupHost;
  /** A later attachment prerequisite after ErrorAdmin/default creation is
   * owned: native current application/module/session service. The menu started
   * flag is not this getter. Missing service retains that OnAdded prefix. */
  readonly applicationMode270EqualsOne?: NativeNavigationLifecycleHost['applicationMode270EqualsOne'];
  readonly findZoneAt?: NativeNavigationLifecycleHost['findZoneAt'];
}
export interface BrowserNpcEntityPreparation {
  readonly source: BrowserNpcEntitySourceRecord;
  readonly sourceContext: BrowserNpcEntitySources['context'];
  readonly construction: NativeEntityConstructionResult;
  /** Only a fully constructed object is exposed. It may have a partial read. */
  readonly allocation: NativeEntityConstructionAllocation | null;
  readonly read: NativeDynamicEntityReadResult | null;
  readonly consumedBytes: number;
  readonly reflection: NativeReflectionController | null;
  readonly propertyAttachments: readonly NativeLifecycleResult<boolean>[];
  readonly navigation: OriginalNavigationProperties | null;
  readonly boundary: string;
  readonly worldResident: false;
}

/** One real constructor registry; readers/reflection guards are per entity so
 * one retained partial read cannot poison the other source actors' creation. */
export class BrowserNpcEntityRuntime {
  readonly registry: NativeSceneEntityRegistry;
  readonly names: NativeSceneNameRegistry;
  readonly navigationRegistry = new NativeNavigationRegistry();
  readonly constructionCounter134: { value: number };
  readonly factory: NativeOriginalEntityFactory;
  private readonly prepared = new Map<string, BrowserNpcEntityPreparation>();
  private readonly timestamps;
  private active = false;

  constructor(readonly services: BrowserNpcEntityServices) {
    this.registry = services.registry ?? new NativeSceneEntityRegistry();
    this.names = services.names ?? new NativeSceneNameRegistry();
    this.constructionCounter134 = services.constructionCounter134 ?? { value: 0 };
    this.timestamps = monotonicClockMilliseconds(services.now);
    const sceneAdmin = { registry: this.registry, constructionCounter134: this.constructionCounter134 };
    this.factory = new NativeOriginalEntityFactory('browser-ardea-native-entities', {
      guid: browserEntityGuidService(services.crypto), timestamps: this.timestamps,
      matrixIdentity: connectConstructorMatrixIdentity(services.control), sceneAdmin: () => known(sceneAdmin),
    });
  }

  /** First16-byte native equality, followed by the actual lookup host. */
  resolve(id20: string, hint = 0): NativeValue<NativeLiveEntity | null> {
    return this.registry.getEntity(id20, hint, this.services.lookup ?? {
      findSpatial: () => missing('Live spatial entity table is not owned by this partial NPC profile'),
      findTemplate: () => missing('Live template entity table is not owned by this partial NPC profile'),
    });
  }
  /** A retained original owner, not a claim that its gCNPC_PS was attached. */
  getOwner(sourceId20: string): NativeLiveEntity | null {
    const owner = this.registry.findRegistered(sourceId20);
    return owner && [...this.prepared.values()].some(row => row.allocation?.data.entity === owner) ? owner : null;
  }

  prepare(source: BrowserNpcEntitySourceRecord): BrowserNpcEntityPreparation {
    const document = admitted.get(source);
    if (!document) throw new Error('Use the hash-verified selected NPC source record');
    const previous = this.prepared.get(source.guid.slice(0, 32)); if (previous) return previous;
    if (this.active) throw new Error('Reentrant NPC construction/read is unsupported');
    this.active = true;
    try {
      const construction = this.factory.create();
      if (!construction.supported) {
        const result: BrowserNpcEntityPreparation = Object.freeze({ source, sourceContext: document.context,
          construction, allocation: null, read: null, consumedBytes: 0, reflection: null,
          propertyAttachments: Object.freeze([]), navigation: null, boundary: construction.reason, worldResident: false });
        this.prepared.set(source.guid.slice(0, 32), result); return result;
      }
      const allocation = construction.target;
      const dataFor = (entity: NativeLiveEntity): NativeValue<NativeEntityReadData> => this.factory.dataFor(entity);
      const properties = new NativeEntityPropertyLifecycle({
        onReadContent: nativeEntityOnReadContent,
        cacheOut: () => missing('Original cached entity CacheOut prerequisite is not connected'),
        pvsAddNewEntity: () => missing('Original PVS ownership prerequisite is not connected'),
        releaseEntityProxyInternal: entity => {
          const data = dataFor(entity); if (!data.known) return data;
          // Constructor really writes this pointer slot to NULL. Do not skip
          // the original ReleaseReference tail for a later non-NULL pointer.
          return data.value.numeric.get(0x18c) === 0 ? known(undefined) :
            missing('Actual non-NULL entity proxy slot18c release is not connected');
        },
      });
      const setters = new NativeEntitySetters({
        child: (data, index) => {
          const child = data.entity.children[index]; return child ? dataFor(child) : known(null);
        },
        collisionShape: (data, selector) => {
          const set = properties.getPropertySet(data.entity, selector);
          if (set.outcome !== 'complete') return missing(set.required);
          return set.value === null ? known(null) : missing('Actual attached CollisionShape setter capability is not connected');
        },
        physicalObject: data => data.numeric.get(0x30) === 0 ? known(null) :
          missing('Actual non-NULL physic object setter capability is not connected'),
        modified: data => known(data.entity.propertyOwner.modified()),
        entityProcessingChanged: () => missing('Actual EntityAdmin processing-range ownership is not connected'),
      }, this.names);
      const reflection = new NativeReflectionController(allocation.data.entity.identity + ':reflection', {
        timestamps: this.timestamps, precision: 53,
        isInPanicState: () => missing('Original ErrorAdmin.GetInstance/Create and IsInPanicState require the owned singleton, MemoryAdmin/MessageAdmin callbacks and nonempty shutdown service'),
      });
      const owners = new WeakMap<NativeLiveEntity, NativeNavigationEntity>();
      const reverseOwners = new WeakMap<NativeNavigationEntity, NativeLiveEntity>();
      const physicalStates = new WeakMap<NativeNavigationState, OriginalNavigationProperties>();
      const ownerView = (owner: NativeLiveEntity): NativeValue<NativeNavigationEntity> => {
        const data = dataFor(owner); if (!data.known) return data;
        let view = owners.get(owner);
        if (!view) {
          view = Object.freeze({ get id() { return owner.propertyId20; } });
          owners.set(owner, view); reverseOwners.set(view, owner);
        }
        return known(view);
      };
      const liveOwner = (view: NativeNavigationEntity): NativeValue<NativeLiveEntity> => {
        const owner = reverseOwners.get(view); return owner ? known(owner) : missing('Actual Navigation owner view is not retained');
      };
      const navigationLifecycle = new NativeNavigationLifecycle(this.navigationRegistry, {
        applicationMode270EqualsOne: () => this.services.applicationMode270EqualsOne?.() ??
          missing('gCGameApp virtual270 requires the initialized application and owned ModuleAdmin/session cache'),
        isTemplate: view => {
          const owner = liveOwner(view); if (!owner.known) return owner;
          // This pointer came from the actual gCEntity factory's final vtable,
          // not from a name/GUID assertion about a source candidate.
          return dataFor(owner.value).known ? known(false) : missing('Actual gCEntity RTTI owner missing');
        },
        worldPositionRef: view => {
          const owner = liveOwner(view); if (!owner.known) return owner;
          const data = dataFor(owner.value); if (!data.known) return data;
          return known({ read: () => known([data.value.arrays.worldMatrix[12]!,
            data.value.arrays.worldMatrix[13]!, data.value.arrays.worldMatrix[14]!] as const) });
        },
        findZoneAt: (...args) => this.services.findZoneAt?.(...args) ??
          missing('Compiled navigation query requires actual owned area proxy resolution'),
        notifyProperty: (state, phase, name, propagated) => {
          const physical = physicalStates.get(state);
          return physical ? reflection.value(() => physical.notify(phase, name, propagated)) : missing('Actual Navigation physical property storage missing');
        },
        // Audited inherited Engine30481830 is a literal RET, rather than an
        // invented success callback for the concrete Navigation lifecycle.
        propertySetBaseCallback: state => physicalStates.has(state) ? known(undefined) : missing('Actual base callback receiver missing'),
        findCharacterMovementPS: () => missing('Original movement processing capability is not connected'),
        characterControlMode: () => missing('Original routine mode capability is not connected'),
      });
      const navigationFactory = createNativeNavigationFactory({
        allocateNavigation: identity => known({ state: createNativeNavigationState(identity), wishes: { wishedMovementMode: 0 } }),
        coCreateGuid: scratch => this.factory.host.guid.coCreateGuid({ bytes: scratch.bytes,
          knownMask: scratch.knownMask, valid: false, destroyed: scratch.destroyed }),
        ownerView, lifecycle: navigationLifecycle,
        postRead: () => missing('Original Navigation GameReset and proxy PostRead are not connected'),
      });
      const registered = reflection.registerFactory(navigationFactory);
      if (!registered.known) throw new Error(registered.reason);
      const attachments: NativeLifecycleResult<boolean>[] = [];
      const readHost = connectOriginalEntityRead({ setters, properties, reflection,
        diagnostics: {
          warningNewerVersion: () => missing('Original version warning ErrorAdmin call is not connected'),
          fatalInvalidSentinel: () => missing('Original sentinel fatal ErrorAdmin call is not connected'),
        },
        pureScalingX: () => missing('Original GetPureScaling/CRT math is not connected'),
      });
      readHost.addPropertySet = (data, object, sort) => {
        for (const row of reflection.allocations()) {
          const value = navigationFactory.properties(row.wrapper);
          if (value.known) physicalStates.set(value.value.state, value.value);
        }
        if (object !== null && !(object instanceof NativeLivePropertySet)) {
          return missing('Reloaded AddPropertySet receiver is not a concrete physical PS');
        }
        const result = properties.add(data.entity, object, sort);
        attachments.push(result);
        return result.outcome === 'complete' ? known(result.value) : missing(result.required);
      };
      const input = new NativeEntityByteInput(hexBytes(source.raw, source.byteLength), document.strings);
      const reader = new NativeOriginalDynamicEntityReader(new NativeEntityV83Reader(readHost, this.registry), {
        isEntityPatchingEnabled: () => missing('Actual current entity patching service is not connected'),
        patchWithTemplate: () => missing('Original owned template patch application is not connected'),
      });
      const read = reader.read(allocation, input);
      let navigation: OriginalNavigationProperties | null = null;
      for (const row of reflection.allocations()) {
        const value = navigationFactory.properties(row.wrapper); if (value.known) { navigation = value.value; break; }
      }
      const result: BrowserNpcEntityPreparation = Object.freeze({ source, sourceContext: document.context,
        construction, allocation, read, consumedBytes: input.cursor(), reflection,
        propertyAttachments: Object.freeze(attachments), navigation,
        boundary: read.supported ? 'Graph attachment/cache/processing-range activation has not run' : read.reason,
        worldResident: false });
      this.prepared.set(source.guid.slice(0, 32), result); return result;
    } finally { this.active = false; }
  }
}
