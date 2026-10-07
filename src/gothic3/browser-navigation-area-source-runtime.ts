/** Materializes verified compiled world Navigation records as live TypeScript
 * scene owners, including static .node files and the registered dynamic layer.
 * The source executable's reflected constructors and full entity property-set
 * factories remain outside this browser loader; this adapter owns the identity
 * and gCNavZone/Path data used by the compiled map query. */
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeLiveEntity, NativeLivePropertySet, NativeSceneEntityRegistry } from './entity-lifecycle';
import type { NativePropertyCallbacks } from './entity-lifecycle';
import { OriginalPropertyOwner } from './native-properties';
import type { BrowserConstructedNavigationArea, BrowserConstructedNavigationAreaHost,
  BrowserNavigationAreaLookupHost, BrowserNpcNavigationOwner } from './browser-npc-navigation-owner';
import type { NativeNavigationArea, NativeNavigationDefinition, NativeNavigationProxy,
  NativeNavigationSceneSource } from './navigation-scene';
import { navigationPropertyId } from './navigation-scene';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const ZERO_ID = '0'.repeat(40);
type NavigationSourceReceipt = NativeNavigationSceneSource['definitions']['sources'][number] & {
  sourceProof?: { path: string; sha256: string; bytes: number; uncompressedSha256: string };
};
type NavigationDefinitionDocument = Omit<NativeNavigationSceneSource['definitions'], 'sources'> & {
  sourceCandidatesAreNotLiveRegistration?: boolean;
  unresolvedMapPropertyIds16?: string[];
  duplicateGuidCandidates?: Record<string, string[]>;
  sources: NavigationSourceReceipt[];
};

interface SourceAreaRecord {
  readonly definition: NativeNavigationDefinition;
  readonly area: NativeNavigationArea;
  readonly entity: NativeLiveEntity;
  readonly propertySet: NativeLivePropertySet<object>;
  readonly matrixStorage: NativeHeapObjectViews;
  readonly matrix: number[];
  readonly host: BrowserConstructedNavigationAreaHost;
  admission: BrowserConstructedNavigationArea | null;
  phase: 'created' | 'node-id-read' | 'property-read' | 'attached' | 'registered';
}

/** Lower browser scene loader for the 5,385 map-referenced area entities in
 * static and dynamic source groups. It loads each source group once, then
 * resolves proxies against the resulting owned property sets. */
export class BrowserNavigationAreaSourceRuntime implements BrowserNavigationAreaLookupHost {
  readonly profile = 'verified-browser-navigation-area-source' as const;
  readonly source: NativeNavigationSceneSource;
  readonly registry = new NativeSceneEntityRegistry();
  private readonly byId = new Map<string, NativeNavigationDefinition>();
  private readonly bySource = new Map<number, NativeNavigationDefinition[]>();
  private readonly bySet = new WeakMap<NativeLivePropertySet<object>, SourceAreaRecord>();
  private readonly byEntity = new WeakMap<NativeLiveEntity, SourceAreaRecord>();
  private readonly liveRecords = new Map<string, SourceAreaRecord>();
  private readonly loadedSources = new Set<number>();
  private readonly loadingSources = new Set<number>();
  private readonly failedSources = new Map<number, string>();
  private live = true;

  constructor(readonly navigation: BrowserNpcNavigationOwner) {
    this.source = navigation.source;
    this.validateSource();
    navigation.connectAreaLookupHost(this);
  }

  private validateSource(): void {
    const definitions = this.source.definitions as NavigationDefinitionDocument;
    if (definitions.schema !== 'gothic3-navigation-entity-definitions-v1' ||
        definitions.world !== 'G3_World_01' || definitions.sourceCandidatesAreNotLiveRegistration !== true ||
        definitions.unresolvedMapPropertyIds16?.length !== 0 ||
        Object.keys(definitions.duplicateGuidCandidates ?? {}).length !== 0 ||
        !definitions.entities.length || !definitions.sources.length) {
      throw new Error('Complete hash-verified static Navigation source candidate set required');
    }
    for (const [index, receipt] of definitions.sources.entries()) {
      const source = receipt.source;
      if (!source || source.family !== 'projects_compiled' ||
          !(source.path.endsWith('.node') || source.path.endsWith('.lrentdat')) ||
          !/^[a-f0-9]{64}$/.test(source.sha256) || receipt.registered !== true ||
          receipt.enabledByAnyRegistry !== true || !receipt.sectorIds.length ||
          !receipt.sourceProof || !/^[a-f0-9]{64}$/.test(receipt.sourceProof.sha256) ||
          !/^entity-sources\/[0-9]+\.json\.gz$/.test(receipt.sourceProof.path) ||
          !Number.isSafeInteger(receipt.sourceProof.bytes) || receipt.sourceProof.bytes < 1) {
        throw new Error('Static Navigation source membership receipt differs at source ' + index);
      }
    }
    for (const definition of definitions.entities) {
      if (!definition.key || !Number.isInteger(definition.sourceIndex) || definition.sourceIndex < 0 ||
          definition.sourceIndex >= definitions.sources.length ||
          !definitions.sources[definition.sourceIndex]) {
        throw new Error('Navigation entity source-index receipt differs');
      }
      const id = navigationPropertyId(definition.guid);
      if (!id || this.byId.has(id)) throw new Error('Navigation entity ID is empty or duplicated: ' + definition.key);
      if (definition.propertySets.length !== 1) throw new Error('Expected one selected Navigation property set: ' + definition.key);
      const propertySet = definition.propertySets[0]!;
      const kind = propertySet.name === 'gCNavZone_PS' ? 'zone' :
        propertySet.name === 'gCNavPath_PS' ? 'path' : null;
      if (!kind || propertySet.unknownProperties?.length || propertySet.duplicateProperties?.length) {
        throw new Error('Unsupported or ambiguous Navigation source property set: ' + definition.key);
      }
      this.byId.set(id, definition);
      const group = this.bySource.get(definition.sourceIndex) ?? [];
      group.push(definition); this.bySource.set(definition.sourceIndex, group);
    }
    for (const proxy of this.source.query.proxies) {
      const id = navigationPropertyId(proxy.guid20);
      if (id === null) continue; // The native invalid-ID proxy needs no lookup.
      const definition = this.byId.get(id);
      if (!definition) throw new Error('Compiled Navigation proxy has no source definition: ' + id);
      if (definition.propertySets[0]!.name !== proxy.propertySet) {
        throw new Error('Compiled Navigation proxy class differs from source: ' + id);
      }
    }
  }

  private sourceReady(sourceIndex: number): NativeValue<void> {
    if (!this.live) return missing('Static Navigation source runtime has been disposed');
    const failed = this.failedSources.get(sourceIndex);
    if (failed) return missing(failed);
    if (this.loadedSources.has(sourceIndex)) return known(undefined);
    if (this.loadingSources.has(sourceIndex)) return missing('Reentrant static Navigation source load is not supported');
    const definitions = this.bySource.get(sourceIndex);
    const receipt = this.source.definitions.sources[sourceIndex];
    if (!definitions?.length || !receipt) return missing('Registered static Navigation source group is absent');
    this.loadingSources.add(sourceIndex);
    try {
      for (const definition of definitions) this.materialize(definition);
      this.loadedSources.add(sourceIndex);
      return known(undefined);
    } catch (error) {
      const reason = 'Static Navigation source group ' + sourceIndex + ' stopped after its applied prefix: ' +
        (error instanceof Error ? error.message : String(error));
      this.failedSources.set(sourceIndex, reason);
      return missing(reason);
    } finally { this.loadingSources.delete(sourceIndex); }
  }

  private materialize(definition: NativeNavigationDefinition): SourceAreaRecord {
    const existing = this.liveRecords.get(definition.key);
    if (existing) return existing;
    const id = navigationPropertyId(definition.guid);
    if (!id || this.byId.get(id) !== definition) throw new Error('Unowned Navigation source identity');
    const propertyName = definition.propertySets[0]!.name;
    const propertyType = propertyName === 'gCNavZone_PS' ? 8 : 10;
    const areaResult = this.navigation.createArea(definition.key);
    if (!areaResult.known) throw new Error(areaResult.reason);
    const area = areaResult.value;
    if (area.id !== id || area.kind !== (propertyType === 8 ? 'zone' : 'path')) {
      throw new Error('Decoded Navigation value store differs from its source Node');
    }

    const sourcePath = this.source.definitions.sources[definition.sourceIndex]!.source.path;
    const entityKind = sourcePath.endsWith('.lrentdat') ? 'gCEntity' : 'eCEntity';
    const identity = 'browser-navigation-source:' + definition.key;
    const entity = new NativeLiveEntity(identity,
      OriginalPropertyOwner.fromConstructor(identity, entityKind), ZERO_ID);
    const registry = this.registry.register(entity);
    if (registry.outcome !== 'complete' || registry.value !== true) {
      throw new Error(registry.outcome === 'complete' ? 'Static source entity did not register' : registry.required);
    }
    const node = this.registry.readNodeIdentity(entity, 1, () => known(definition.guid));
    if (node.outcome !== 'complete' || node.value !== 1 || entity.propertyId20 !== id) {
      throw new Error(node.outcome === 'complete' ? 'Static source Node identity differs' : node.required);
    }

    const matrixStorage = new NativeHeapObjectViews({ identity: Object.freeze({}),
      bytes: new Uint8Array(16 * 4), knownMask: new Uint8Array(16 * 4), freed: false });
    definition.worldMatrix.forEach((value, index) => matrixStorage.writeFloat(index * 4, value));
    const matrix = matrixStorage.floatArray(0, 16);
    let owner: NativeLiveEntity | null = null;
    const callbacks: NativePropertyCallbacks = {
      added: () => missing('Use the admitted Navigation area lifecycle owner for registration'),
      removed: () => missing('Use the admitted Navigation area lifecycle owner for deregistration'),
      postRead: () => missing('Static Navigation full property-set post-read remains outside this loader'),
    };
    const set = new NativeLivePropertySet<object>(identity + ':' + propertyName,
      propertyName, propertyType, area, { read: () => owner, write: value => { owner = value; } },
      null, callbacks, () => missing('Static Navigation processability is not used by map queries'));
    set.createBase();
    // This browser-owned source owner contains exactly the map area PS.
    // It deliberately does not claim the original PE reflected wrapper or the
    // other property sets present on some source .node entities.
    const attached = set.setEntity(entity);
    if (!attached.known) throw new Error(attached.reason);
    entity.propertySets.push(set);
    entity.propertyTypeBits[propertyType >> 5] = (entity.propertyTypeBits[propertyType >> 5]! |
      (1 << (propertyType & 31))) >>> 0;
    entity.propertyArraySorted = true;
    entity.propertySortProfile = 'entity-property-set';

    const record: SourceAreaRecord = { definition, area, entity, propertySet: set,
      matrixStorage, matrix, host: null as unknown as BrowserConstructedNavigationAreaHost,
      admission: null, phase: 'property-read' };
    const host: BrowserConstructedNavigationAreaHost = {
      isTemplate: candidate => candidate === entity ? known(false) : missing('Static source entity identity differs'),
      worldMatrix: candidate => candidate === entity ? known(matrix) : missing('Static source world-matrix owner differs'),
      verifyConstructedArea: (candidateSet, candidateEntity, candidateArea) => {
        const isOwned = this.bySet.get(candidateSet) === record && this.byEntity.get(candidateEntity) === record &&
          candidateSet === set && candidateEntity === entity && candidateArea === area &&
          record.phase !== 'created' && record.phase !== 'node-id-read' &&
          entity.propertyId20 === id && this.registry.findRegistered(id) === entity &&
          set.isValid() && set.owner.read() === entity && entity.propertySets.includes(set) &&
          area.sourceKey === definition.key && area.id === id && area.kind === (propertyType === 8 ? 'zone' : 'path') &&
          matrix.length === 16 && matrixStorage.readFloat(48) === definition.worldMatrix[12];
        return isOwned ? known(undefined) : missing('Static Navigation source-owner construction/read/attachment proof differs');
      },
    };
    Object.assign(record, { host });
    record.phase = 'attached';
    this.bySet.set(set, record); this.byEntity.set(entity, record);
    this.liveRecords.set(definition.key, record);

    const admission = this.navigation.admitConstructedArea(set, host);
    if (!admission.known) throw new Error(admission.reason);
    record.admission = admission.value;
    const registered = this.navigation.registerArea(admission.value);
    if (!registered.known) throw new Error(registered.reason);
    record.phase = 'registered';
    return record;
  }

  resolvePropertySet(proxy: NativeNavigationProxy): NativeValue<NativeLivePropertySet<object> | null> {
    if (!this.live) return missing('Static Navigation source runtime has been disposed');
    try {
      const id = navigationPropertyId(proxy.guid20);
      if (id === null) return known(null);
      const definition = this.byId.get(id);
      if (!definition) return missing('Completed Navigation source catalog has no entity for proxy ID ' + id);
      if (definition.propertySets[0]!.name !== proxy.propertySet) {
        return missing('Compiled Navigation property-set proxy class differs from its source entity');
      }
      const loaded = this.sourceReady(definition.sourceIndex);
      if (!loaded.known) return loaded;
      const record = this.liveRecords.get(definition.key);
      if (!record || record.phase !== 'registered' || record.propertySet.className !== proxy.propertySet ||
          record.entity.propertyId20 !== id) {
        return missing('Static Navigation source entity did not complete its owned property-set registration');
      }
      const verified = record.host.verifyConstructedArea(record.propertySet, record.entity, record.area);
      return verified.known ? known(record.propertySet) : verified;
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  }

  /** Lower SceneAdmin ResolveEntity bridge for IDs in the complete registered
   * Navigation source catalog. An absent ID stays unknown because this loader
   * does not own the rest of the world's entity table. */
  resolveEntity(id20: string): NativeValue<NativeLiveEntity | null> {
    if (!this.live) return missing('Static Navigation source runtime has been disposed');
    try {
      const id = navigationPropertyId(id20);
      if (id === null) return known(null);
      const definition = this.byId.get(id);
      if (!definition) return missing('Navigation source catalog cannot resolve entity ID ' + id);
      const loaded = this.sourceReady(definition.sourceIndex);
      if (!loaded.known) return loaded;
      const record = this.liveRecords.get(definition.key);
      if (!record || record.phase !== 'registered' || record.entity.propertyId20 !== id ||
          this.registry.findRegistered(id) !== record.entity || !record.propertySet.isValid() ||
          record.propertySet.owner.read() !== record.entity) {
        return missing('Navigation source entity has no completed registered owner for ID ' + id);
      }
      return known(record.entity);
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  }

  hasPropertySet(entity: NativeLiveEntity, type: 8 | 10): NativeValue<number> {
    const record = this.byEntity.get(entity);
    if (!this.live || !record || this.liveRecords.get(record.definition.key) !== record ||
        record.phase !== 'registered' || this.registry.findRegistered(record.entity.propertyId20) !== entity) {
      return missing('Navigation source entity has no live exact property-set inventory');
    }
    return known(Number(record.propertySet.propertyType === type));
  }

  getPropertySet(entity: NativeLiveEntity, type: 6 | 8 | 10): NativeValue<object | null> {
    if (type === 6) return missing('Navigation source runtime does not own the actor DCC property set');
    const record = this.byEntity.get(entity);
    if (!this.live || !record || this.liveRecords.get(record.definition.key) !== record ||
        record.phase !== 'registered' || this.registry.findRegistered(record.entity.propertyId20) !== entity) {
      return missing('Navigation source entity has no live exact property-set inventory');
    }
    return record.propertySet.propertyType === type ? known(record.propertySet) : known(null);
  }

  getPropertyOwner(set: object): NativeValue<NativeLiveEntity | null> {
    const record = set instanceof NativeLivePropertySet ? this.bySet.get(set) : undefined;
    if (!this.live || !record || record.propertySet !== set || record.phase !== 'registered' ||
        !record.propertySet.isValid() || record.propertySet.owner.read() !== record.entity ||
        this.registry.findRegistered(record.entity.propertyId20) !== record.entity) {
      return missing('Navigation source property set has no live exact owner');
    }
    return known(record.entity);
  }

  /** Resolve a native spatial query result back to the exact source-registered
   * zone owner. A map ID without its live gCNavZone_PS owner is not a usable
   * destination name for Script_Game's OnEnterArea callback. */
  findZoneAtPositionCm(positionCm: readonly [number, number, number]):
    NativeValue<Readonly<{ id: string; name: string }> | null> {
    const selected = this.navigation.queryZoneIdAtPositionCm(positionCm);
    if (!selected.known) return selected;
    if (selected.value === null) return known(null);
    const definition = this.byId.get(selected.value);
    if (!definition || definition.propertySets[0]?.name !== 'gCNavZone_PS') {
      return missing('Native Navigation query selected an ID without an exact source zone definition: ' + selected.value);
    }
    const record = this.liveRecords.get(definition.key);
    if (!record || record.phase !== 'registered' || record.area.kind !== 'zone' ||
        record.area.id !== selected.value || record.area.name !== definition.name ||
        this.registry.findRegistered(selected.value) !== record.entity || !record.propertySet.isValid() ||
        record.propertySet.owner.read() !== record.entity) {
      return missing('Native Navigation query selected a zone without its completed registered source owner: ' + selected.value);
    }
    return known(Object.freeze({ id: record.area.id, name: record.area.name }));
  }

  sourceLoadSummary(): Readonly<{ loadedSources: number; failedSources: number; liveAreas: number }> {
    return Object.freeze({ loadedSources: this.loadedSources.size,
      failedSources: this.failedSources.size, liveAreas: this.liveRecords.size });
  }

  dispose(): void { this.live = false; this.liveRecords.clear(); this.bySource.clear(); this.byId.clear(); }
}
