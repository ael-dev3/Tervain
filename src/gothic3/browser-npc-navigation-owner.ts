/** Selected browser application/module services around the original Navigation
 * query algorithms. Browser module allocation/lookup is an explicit lower
 * platform replacement; this does not complete native Windows startup, Session
 * construction, world loading, or NavZone/NavPath reflective construction. */
import ownerRulesText from '../../assets/gothic3/browser-navigation-owner/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeLiveEntity, NativeLivePropertySet, NativeNavPathRegistry,
  OriginalNavPathBindings, createNativeNavPathTransientState, nativeNavPathCallbacks } from './entity-lifecycle';
import type { NativeNavPathLifecycleHost, NativePropertyCallbacks } from './entity-lifecycle';
import { createNativeNavigationArea, invertNativeNavigationMatrix, loadNativeNavigationSceneSource,
  NativeStoredNavigationScene, navigationPropertyId } from './navigation-scene';
import type { NativeNavigationArea, NativeNavigationProxy, NativeNavigationSceneSource,
  NavigationSceneMutation } from './navigation-scene';
import type { NativeNavigationLifecycleHost } from './navigation-runtime';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const fact = <T>(result: NativeValue<T>): T => {
  if (!result.known) throw new Error(result.reason);
  return result.value;
};
const source = JSON.parse(ownerRulesText) as { schema: string; inputs: Record<string, string>;
  methods: Record<string, { body: string; bodyInstructionBytesSha256: string }>;
  coldGlobals: Record<string, { module: string; address: string; bytes: number; raw: string; knownMask: string }> };
if (source.schema !== 'gothic3-browser-navigation-owner-rules-v1' ||
    source.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3') {
  throw new Error('Browser Navigation owner source receipt differs');
}
for (const [label, body, sha] of [
  ['appGameRunning', '20051710', 'e613541d16d141f7df04dd7efb80cb4ab4d83c391ea8cf8385af34a01b194ca5'],
  ['cachedSession', '20066480', 'a87936b372291c6f560e8a9dbe109f98de3996282c4aefc9d9130c14b86a4f67'],
  ['sessionGameRunning', '20371fd0', 'b319c134539a39566e3b7c0268c357f31d683214f7fc85791566c5338aef518c'],
  ['sessionInvalidate', '20372740', 'f173d739f41c0db6d10bb9df96b5feb0f13d60a43703e1c7a14022fa4beb276f'],
  ['engineIsInitialized', '30063530', '0957d20696ad01212ca749d1642417851c3897ecc642bb7eec1e1e16f4a503c9'],
  ['zoneRegister', '202c64a0', '4f37d47129b9880d1a70b7caed37b1638f1b69bc8c8ea940a757abf879f5f874'],
  ['zoneDeregister', '202c3b30', 'fabc7767cd065c46c13cc14a499cb8feb0ef8bdd04bfa179a7987f3fb6e207df'],
  ['zoneOnAdded', '202a1390', '087ae4c47c415943717a3d6326ab8201ebfa4b46747a980a247bdbafbd08a435'],
  ['zoneOnRemoved', '202a1350', '97cf8552683567947788719de4443a94f8af9bcdc4038b3a9fd0c6ca72be28a4'],
  ['zonePropertyType', '2029f1d0', 'accecba762116532de10ac30681ff4b25ad91fe217568ec41c8ffd67b9ef2bcf'],
] as const) {
  if (source.methods[label]?.body !== body || source.methods[label]?.bodyInstructionBytesSha256 !== sha) {
    throw new Error('Browser Navigation method receipt differs: ' + label);
  }
}
function coldStorage(label: 'engineInitialized' | 'sessionCache'): NativeHeapObjectViews {
  const record = source.coldGlobals[label];
  const bytes = label === 'sessionCache' ? 8 : 1;
  if (!record || record.module !== (label === 'sessionCache' ? 'Game' : 'Engine') ||
      record.address !== (label === 'sessionCache' ? '207b4d58' : '30ad989c') || record.bytes !== bytes ||
      record.raw !== '00'.repeat(bytes) || record.knownMask !== 'ff'.repeat(bytes)) {
    throw new Error('Cold Navigation application storage differs: ' + label);
  }
  return storage(bytes, true);
}
function storage(bytes: number, cold = false): NativeHeapObjectViews {
  return new NativeHeapObjectViews({ identity: Object.freeze({}), bytes: new Uint8Array(bytes),
    knownMask: new Uint8Array(bytes).fill(cold ? 255 : 0), freed: false });
}
function byte(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Actual unsigned session/application byte required');
  return value;
}
function canonicalInitializedByte(fields: NativeHeapObjectViews): void {
  const backing = fields.backing;
  const base = 'region' in backing ? backing.region : backing;
  const begin = fields.bytes.byteOffset - backing.bytes.byteOffset;
  const position = ('region' in backing ? backing.offset : 0) + begin;
  if (!(fields instanceof NativeHeapObjectViews) || fields.bytes.length !== 1 || fields.knownMask.length !== 1 ||
      backing.freed || base.freed || begin < 0 || begin + 1 > backing.bytes.length || position < 0 ||
      position + 1 > base.bytes.length || fields.bytes.buffer !== base.bytes.buffer ||
      fields.bytes.byteOffset !== base.bytes.byteOffset + position || fields.knownMask.buffer !== base.knownMask.buffer ||
      fields.knownMask.byteOffset !== base.knownMask.byteOffset + position) {
    throw new Error('Canonical live Engine initialized byte and mask alias required');
  }
}

/** Retained lower browser session capability. Only the source mode field is
 * owned here; unknown surrounding bytes are not a reconstructed gCSession. */
export class BrowserSessionModeOwner {
  readonly profile = 'selected-browser-session-mode-storage' as const;
  readonly fields = storage(0xe9);
  private live = true;
  constructor(readonly application: BrowserNavigationApplicationOwner) {
    this.fields.writeUnsigned(0xe8, 0, 1); //20372773 Invalidate's mode store only.
  }
  readRunningByte(): NativeValue<number> {
    if (!this.live) return missing('Cached browser session allocation has been destroyed');
    try { return known(this.fields.readUnsigned(0xe8, 1)); }
    catch (error) { return missing(String(error)); }
  }
  /** Explicit lower browser lifecycle store, never a menu flag or assertion
   * that original Session.Start/Stop and their callbacks have completed. */
  writeRunningByte(value: number): NativeValue<void> {
    if (!this.live) return missing('Browser session allocation has been destroyed');
    try { this.fields.writeUnsigned(0xe8, byte(value), 1); return known(undefined); }
    catch (error) { return missing(String(error)); }
  }
  dispose(): void { this.live = false; this.fields.backing.freed = true; }
}

export interface BrowserNavigationApplicationOptions {
  /** Same retained Engine30ad989c byte as other application lookup owners.
   * Supplying a view aliases it; no store or readiness inference is performed. */
  readonly initializedByte?: NativeHeapObjectViews;
  /** Named lower browser ModuleAdmin/class-name/RTTI bridge. An unknown result
   * retains the source guard prefix and blocks a later cache-zero shortcut. */
  readonly resolveRegisteredSession?: () => NativeValue<BrowserSessionModeOwner | null>;
}
export class BrowserNavigationApplicationOwner {
  readonly profile = 'selected-browser-module-session-platform' as const;
  readonly physical: { readonly engineInitialized: NativeHeapObjectViews; readonly sessionCache: NativeHeapObjectViews };
  private readonly sessions: BrowserSessionModeOwner[] = [];
  private readonly allocations = new Set<BrowserSessionModeOwner>();
  private lookupFailure: string | null = null;
  private live = true;
  constructor(private readonly options: BrowserNavigationApplicationOptions = {}) {
    const initialized = options.initializedByte ?? coldStorage('engineInitialized');
    canonicalInitializedByte(initialized);
    this.physical = Object.freeze({ engineInitialized: initialized, sessionCache: coldStorage('sessionCache') });
  }
  createSessionModeOwner(): BrowserSessionModeOwner {
    if (!this.live) throw new Error('Browser application has been disposed');
    const session = new BrowserSessionModeOwner(this); this.allocations.add(session); return session;
  }
  registerSession(session: BrowserSessionModeOwner): NativeValue<void> {
    if (!this.live || !this.allocations.has(session) || !session.readRunningByte().known) {
      return missing('Actual live session allocation owned by this application required');
    }
    // Explicit lower registry capability; native accessor/RTTI startup is not
    // claimed. Lookup is forward/first-match, as ModuleAdmin30088af0.
    if (!this.sessions.includes(session)) this.sessions.push(session);
    return known(undefined);
  }
  removeSession(session: BrowserSessionModeOwner): NativeValue<void> {
    if (!this.live || !this.allocations.has(session)) return missing('Actual retained session allocation required');
    const index = this.sessions.lastIndexOf(session);
    if (index >= 0) this.sessions.splice(index, 1);
    // Source cached session pointer is nonowning and is NOT reset here.
    return known(undefined);
  }
  writeInitializedByte(value: number): NativeValue<void> {
    if (!this.live) return missing('Browser application has been disposed');
    try { this.physical.engineInitialized.writeUnsigned(0, byte(value), 1); return known(undefined); }
    catch (error) { return missing(String(error)); }
  }
  private cachedSession(): NativeValue<BrowserSessionModeOwner | null> {
    if (!this.live) return missing('Browser application has been disposed');
    if (this.lookupFailure) return missing(this.lookupFailure);
    try {
      if (this.physical.engineInitialized.readUnsigned(0, 1) !== 1) return known(null);
      const fields = this.physical.sessionCache;
      const guard = fields.readUnsigned(4);
      if ((guard & 1) === 0) {
        fields.writeUnsigned(4, (guard | 1) >>> 0); //before every lower lookup.
        const resolved = fact(this.options.resolveRegisteredSession?.() ?? known(this.sessions[0] ?? null));
        if (resolved !== null && (!this.allocations.has(resolved) || resolved.application !== this)) {
          throw new Error('Module lookup returned a session outside this actual application owner');
        }
        fields.pointer<BrowserSessionModeOwner>(0).set(resolved); //NULL is cached too.
      }
      const cached = fields.pointer<BrowserSessionModeOwner>(0).get();
      if (cached !== null && !this.allocations.has(cached)) throw new Error('Unowned cached session capability');
      return known(cached);
    } catch (error) {
      this.lookupFailure = error instanceof Error ? error.message : String(error);
      return missing(this.lookupFailure);
    }
  }
  readonly applicationMode270EqualsOne: NativeNavigationLifecycleHost['applicationMode270EqualsOne'] = () => {
    const first = this.cachedSession();
    if (!first.known) return first;
    if (first.value === null) return known(false);
    const second = this.cachedSession(); //2005171a invokes the getter again.
    if (!second.known) return second;
    if (second.value === null) return missing('Source second session lookup has no captured receiver');
    const running = second.value.readRunningByte();
    return running.known ? known(running.value === 1) : running;
  };
  dispose(): void {
    if (!this.live) return;
    this.live = false;
    for (const session of this.allocations) session.dispose();
    this.sessions.length = 0;
    this.physical.sessionCache.backing.freed = true;
    // A caller-supplied shared initialized view retains its separate owner.
    if (!this.options.initializedByte) this.physical.engineInitialized.backing.freed = true;
  }
}

export interface BrowserConstructedNavigationArea {
  readonly area: NativeNavigationArea;
  readonly propertySet: NativeLivePropertySet<object>;
  readonly entity: NativeLiveEntity;
  readonly host: BrowserConstructedNavigationAreaHost;
}
export interface BrowserConstructedNavigationAreaHost extends NativeNavPathLifecycleHost {
  /** Read-only actual factory/Create/Read/attachment and allocation-lifetime proof.
   * Mutable IDs, class strings and sourceReadStage metadata cannot supply it. */
  verifyConstructedArea(set: NativeLivePropertySet<object>, entity: NativeLiveEntity,
    area: NativeNavigationArea): NativeValue<void>;
}
export interface BrowserNavigationAreaLookupHost {
  /** Source eCPropertySetProxy::GetEntity and actual property-set lookup,
   * including SceneAdmin fallbacks, OnReadContent and allocation lifetimes.
   * Only a completed lookup may return NULL; unloaded source is unknown. */
  resolvePropertySet(proxy: NativeNavigationProxy): NativeValue<NativeLivePropertySet<object> | null>;
}
/** Owns area registration, exact source value identity and one stored scene.
 * Loading candidates is deliberately insufficient for live proxy resolution. */
export class BrowserNpcNavigationOwner {
  readonly scene: NativeStoredNavigationScene;
  private readonly paths = new NativeNavPathRegistry();
  private readonly pathBindings = new OriginalNavPathBindings();
  private readonly areas = new Map<string, NativeNavigationArea>();
  private readonly ownedAreas = new WeakSet<object>();
  private readonly admitted = new Map<NativeNavigationArea, BrowserConstructedNavigationArea>();
  private readonly zones: NativeLivePropertySet<object>[] = [];
  private readonly callbacks = new Map<NativeNavigationArea, NativePropertyCallbacks>();
  private readonly failures = new Map<BrowserConstructedNavigationArea, string>();
  private readonly released = new Set<BrowserConstructedNavigationArea>();
  private mutating = false;
  private reentrant = false;
  private live = true;
  constructor(readonly source: NativeNavigationSceneSource,
    readonly application = new BrowserNavigationApplicationOwner(),
    private readonly lookup?: BrowserNavigationAreaLookupHost) {
    this.scene = new NativeStoredNavigationScene(source, {
      resolve: proxy => this.resolve(proxy),
      notifyPathProperty: (...args) => this.live ? this.pathBindings.notifyPathProperty(...args)
        : missing('Browser Navigation owner has been disposed'),
    });
  }
  createArea(sourceKey: string): NativeValue<NativeNavigationArea> {
    if (!this.live) return missing('Browser Navigation owner has been disposed');
    const retained = this.areas.get(sourceKey);
    if (retained) return known(retained);
    const result = createNativeNavigationArea(this.source, sourceKey);
    if (result.known) { this.areas.set(sourceKey, result.value); this.ownedAreas.add(result.value); }
    return result;
  }
  /** Admit a caller's constructed/read area PS. This performs no factory,
   * constructor, serialized read, owner assignment or entity attachment. */
  admitConstructedArea(set: NativeLivePropertySet<object>, host: BrowserConstructedNavigationAreaHost): NativeValue<BrowserConstructedNavigationArea> {
    if (!this.live) return missing('Browser Navigation owner has been disposed');
    try {
      const area = this.ownedAreas.has(set.values) ? set.values as NativeNavigationArea : null;
      const entity = set.owner.read();
      if (!area || !(set instanceof NativeLivePropertySet) || !(entity instanceof NativeLiveEntity) ||
          set.className !== (area.kind === 'zone' ? 'gCNavZone_PS' : 'gCNavPath_PS') ||
          set.propertyType !== (area.kind === 'zone' ? 8 : 10) || !set.isValid() ||
          entity.sourceReadStage !== 'entity-read-complete' || !entity.propertySets.includes(set) ||
          navigationPropertyId(entity.propertyId20) !== area.id) {
        throw new Error('Actual constructed/read/attached source area entity and exact property-set value store required');
      }
      if (typeof host.verifyConstructedArea !== 'function') throw new Error('Actual source area construction/read/lifetime capability is missing');
      fact(host.verifyConstructedArea(set, entity, area));
      const existing = this.admitted.get(area);
      if (existing) {
        if (existing.propertySet !== set || existing.entity !== entity || existing.host !== host) {
          throw new Error('One area cannot alias two constructed live owners');
        }
        return known(existing);
      }
      const record = Object.freeze({ area, propertySet: set, entity, host });
      if (area.kind === 'path') {
        const transient = createNativeNavPathTransientState(area);
        this.pathBindings.bind(area, set);
        this.callbacks.set(area, nativeNavPathCallbacks(transient, 39, this.paths, host));
      } else this.callbacks.set(area, this.zoneCallbacks(record));
      this.admitted.set(area, record);
      return known(record);
    } catch (error) { return missing(error instanceof Error ? error.message : String(error)); }
  }
  private zoneCallbacks(record: BrowserConstructedNavigationArea): NativePropertyCallbacks {
    const { area, host } = record;
    return {
      added: set => {
        try {
          if (!fact(host.isTemplate(set.owner.read())) && this.zones.lastIndexOf(set) < 0) this.zones.push(set);
          if (set.owner.read() !== null) {
            const entity = set.owner.read();
            if (!entity) throw new Error('NavZone owner changed before captured matrix call');
            const matrix = fact(host.worldMatrix(entity));
            area.worldMatrix = matrix; area.inverseWorldMatrix = invertNativeNavigationMatrix(matrix);
          }
          return known(undefined); //source empty Engine base OnPropertySetAdded.
        } catch (error) { return missing(String(error)); }
      },
      removed: set => {
        try {
          if (!fact(host.isTemplate(set.owner.read()))) {
            const index = this.zones.lastIndexOf(set);
            if (index >= 0) this.zones.splice(index, 1);
          }
          return known(undefined); //source empty Engine base OnPropertySetRemoved.
        } catch (error) { return missing(String(error)); }
      },
      postRead: () => missing('NavZone read/post-read is a caller-owned source prerequisite'),
    };
  }
  private actual(record: BrowserConstructedNavigationArea): void {
    if (!this.live || this.released.has(record) || this.admitted.get(record.area) !== record || record.propertySet.owner.read() !== record.entity ||
        !record.entity.propertySets.includes(record.propertySet) || !record.propertySet.isValid() ||
        navigationPropertyId(record.entity.propertyId20) !== record.area.id) {
      throw new Error('Actual live constructed area capability required');
    }
    fact(record.host.verifyConstructedArea(record.propertySet, record.entity, record.area));
  }
  private mutateArea(record: BrowserConstructedNavigationArea, phase: 'added' | 'removed'): NativeValue<void> {
    if (this.mutating) { this.reentrant = true; return missing('Reentrant area lifecycle mutation is not owned'); }
    const failure = this.failures.get(record);
    if (failure) return missing(failure);
    try {
      this.mutating = true; this.reentrant = false;
      this.actual(record);
      if (this.reentrant) throw new Error('Construction/lifetime verification attempted recursive area mutation');
      const result = this.callbacks.get(record.area)![phase](record.propertySet);
      if (!result.known) throw new Error(result.reason);
      this.actual(record);
      if (this.reentrant) throw new Error('A source callback attempted unsupported reentrant area lifecycle mutation');
      return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (this.mutating) this.failures.set(record, reason); //retain registration/observer prefix; no replay.
      return missing(reason);
    } finally { this.mutating = false; }
  }
  registerArea(record: BrowserConstructedNavigationArea): NativeValue<void> { return this.mutateArea(record, 'added'); }
  deregisterArea(record: BrowserConstructedNavigationArea): NativeValue<void> {
    return this.mutateArea(record, 'removed');
  }
  /** Actual final-release admission supplied by the caller's destructor host.
   * This invalidates capability use; it does not execute native destruction. */
  releaseArea(record: BrowserConstructedNavigationArea): NativeValue<void> {
    if (this.mutating) { this.reentrant = true; return missing('Cannot release an area during its lifecycle callback'); }
    if (!this.live || this.admitted.get(record.area) !== record) return missing('Retained area allocation required');
    this.released.add(record); return known(undefined);
  }
  resolveAreaById(rawId: string): NativeValue<BrowserConstructedNavigationArea | null> {
    if (!this.live || this.mutating) return missing('Browser Navigation owner is disposed or an area mutation is in progress');
    try {
      const id = navigationPropertyId(rawId);
      if (id === null) return known(null); //actual invalid PropertyID.
      const proxy = this.source.query.proxies.find(value => navigationPropertyId(value.guid20) === id);
      if (!proxy) return missing('Original area proxy class and complete source lookup are not owned for this ID');
      return this.resolveRecord(proxy);
    } catch (error) { return missing(String(error)); }
  }
  private resolveRecord(proxy: NativeNavigationProxy): NativeValue<BrowserConstructedNavigationArea | null> {
    if (!this.live || this.mutating) return missing('Browser Navigation owner is disposed or an area mutation is in progress');
    if (navigationPropertyId(proxy.guid20) === null) return known(null);
    const resolved = this.lookup?.resolvePropertySet(proxy);
    if (!resolved) return missing('Actual SceneAdmin/property-set proxy lookup capability is missing');
    if (!resolved.known) return resolved;
    if (resolved.value === null) return known(null); //completed source lookup only.
    try {
      const record = [...this.admitted.values()].find(value => value.propertySet === resolved.value);
      if (!record) return missing('Actual resolved area PS has no constructed/read value-store admission');
      this.actual(record);
      if (record.area.id !== navigationPropertyId(proxy.guid20) || record.propertySet.className !== proxy.propertySet) {
        return missing('Source proxy returned a mismatched actual area PS/ID/class');
      }
      const failure = this.failures.get(record);
      return failure ? missing('Area lifecycle has a retained partial prefix: ' + failure) : known(record);
    } catch (error) { return missing(String(error)); }
  }
  private resolve(proxy: NativeNavigationProxy): NativeValue<NativeNavigationArea | null> {
    const result = this.resolveRecord(proxy);
    if (!result.known) return result;
    if (result.value === null) return known(null);
    if (proxy.propertySet !== result.value.propertySet.className) return missing('Source proxy property-set class does not match live area');
    return known(result.value.area);
  }
  bindStoredQueryProperties(): NavigationSceneMutation { return this.scene.bindQueryProperties(); }
  readonly applicationMode270EqualsOne = () => this.live ? this.application.applicationMode270EqualsOne()
    : missing<boolean>('Browser Navigation owner has been disposed');
  readonly findZoneAt: NativeNavigationLifecycleHost['findZoneAt'] = (...args) => this.live && !this.mutating ? this.scene.findZoneAt(...args)
    : missing('Browser Navigation owner is disposed or an area mutation is in progress');
  registeredAreas(): readonly BrowserConstructedNavigationArea[] {
    return Object.freeze([...this.admitted.values()].filter(record => record.area.kind === 'zone'
      ? this.zones.includes(record.propertySet) : this.paths.registered.includes(record.propertySet)));
  }
  dispose(): void {
    if (!this.live) return;
    this.live = false;
    // Lower owner lifetime is invalidated without claiming native PS virtual
    // destruction, proxy release, SceneAdmin erase or GameReset has completed.
    this.application.dispose();
  }
}
export async function loadBrowserNpcNavigationOwner(application?: BrowserNavigationApplicationOwner,
  lookup?: BrowserNavigationAreaLookupHost): Promise<BrowserNpcNavigationOwner> {
  return new BrowserNpcNavigationOwner(await loadNativeNavigationSceneSource(), application, lookup);
}
