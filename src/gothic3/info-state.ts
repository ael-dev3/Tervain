import outputReceiptText from '../../assets/gothic3/info-state/output-receipt.json?raw';
import type { NativeInfo } from './catalog';
import type { NativeValue } from './dialogue';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

export type InfoProviderId = 'ini' | 'compiled-pak' | 'compiled-p00';
export interface InfoStaticSource {
  archive: string;
  path: string;
  sha256: string;
  selection: string;
  lines?: { Name: number | null; InfoGiven: number | null; Permanent: number | null };
}
export interface InfoInitialRecord {
  id: string;
  sourceIndex: number;
  sourceGiven: boolean | null;
  given: boolean;
  givenInitialization: 'explicit-ini' | 'fresh-factory-default' | 'compiled-static-property';
  sourcePermanent: boolean | null;
  /** Stored native property only; derived IsPermanent also depends on type/condition/owner. */
  permanent: boolean;
  permanentInitialization: 'explicit-ini' | 'fresh-factory-default' | 'compiled-static-property';
  objectOffset?: number;
  objectEnd?: number;
  flagOffsets?: { InfoGiven: number; Permanent: number };
}
export interface OriginalInfoProvider {
  schema: 'gothic3-info-provider-v1';
  id: InfoProviderId;
  kind: 'fresh-factory-and-INI' | 'historical-compiled-static';
  infoCount: number;
  sources: InfoStaticSource[];
  records: InfoInitialRecord[];
  audit: { effectiveGivenTrue: number; effectivePermanentTrue: number; [key: string]: unknown };
}
interface ProviderReceipt extends ResourceReceipt {
  path: string;
  id: InfoProviderId;
  infoCount: number;
  kind: OriginalInfoProvider['kind'];
}
export interface OriginalInfoDocument {
  schema: 'gothic3-initial-info-state-v1';
  scope: 'ordinary-world-read-before-OnGameStartUp';
  worldManager: { archive: string; path: string; sha256: string; entityKey: string;
    classVersion: number; runtimeTailBytes: number; ordinaryReadRuntimePacketCount: number;
    values: Record<string, unknown>; [key: string]: unknown };
  providers: ProviderReceipt[];
  staticSelection: { selectedProvider: null; status: 'context-required'; rules: string[]; [key: string]: unknown };
  browserProfile: { id: 'fresh-original-G3_World_01-INI'; worldName: 'G3_World_01';
    entityPatchingEnabled: true; compiledProjectFolder: true; compiledInfoLookup: 'missing'; noInfosSkip: false;
    nativeRuntimeCaptured: false; assumptions: string[]; scope: string; [key: string]: unknown };
  unapplied: string[];
  [key: string]: unknown;
}
interface InfoOutputReceipt {
  schema: 'gothic3-info-state-output-v1';
  output: ResourceReceipt & { path: string };
  providers: ProviderReceipt[];
}
export interface InitialInfoReadContext {
  worldName: NativeValue<string>;
  entityPatchingEnabled: NativeValue<boolean>;
  compiledProjectFolder: NativeValue<boolean>;
  compiledInfoLookup: NativeValue<'missing' | 'compiled-pak' | 'compiled-p00' | 'other'>;
  /** The original loader checks the command-line substring noinfos. */
  noInfosSkip: NativeValue<boolean>;
}
export type InitialInfoResolution =
  | { kind: 'provider'; provider: InfoProviderId; route: string }
  | { kind: 'unknown'; reason: string };
export interface InfoStateSnapshot {
  provider: InfoProviderId;
  scope: 'ordinary-world-read-before-OnGameStartUp';
  route: string;
  valid: boolean;
  invalidatedReason: string | null;
  unapplied: string[];
  records: (InfoInitialRecord & { source: InfoStaticSource; currentGiven: boolean })[];
}

const receipt = JSON.parse(outputReceiptText) as InfoOutputReceipt;
const sha256 = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const optionalBoolean = (value: unknown): value is boolean | null => value === null || typeof value === 'boolean';
const providerIds: readonly InfoProviderId[] = ['ini', 'compiled-pak', 'compiled-p00'];
let documentPending: Promise<OriginalInfoDocument> | null = null;
const providerPending = new Map<InfoProviderId, Promise<OriginalInfoProvider>>();

function validateDocument(document: OriginalInfoDocument): void {
  if (receipt.schema !== 'gothic3-info-state-output-v1' || document.schema !== 'gothic3-initial-info-state-v1' ||
      document.scope !== 'ordinary-world-read-before-OnGameStartUp' || document.worldManager?.entityKey !== 'world-2419:1' ||
      document.worldManager.classVersion !== 4 || document.worldManager.runtimeTailBytes !== 0 ||
      document.worldManager.ordinaryReadRuntimePacketCount !== 0 || !sha256(document.worldManager.sha256) ||
      document.staticSelection?.status !== 'context-required' || document.staticSelection.selectedProvider !== null ||
      !Array.isArray(document.providers) || document.providers.length !== 3 ||
      !Array.isArray(document.unapplied) || !document.unapplied.every((item) => typeof item === 'string')) {
    throw new Error('Invalid original InfoManager state document');
  }
  const ids = new Set<InfoProviderId>();
  for (const provider of document.providers) {
    const frozen = receipt.providers.find((candidate) => candidate.id === provider.id);
    if (!providerIds.includes(provider.id) || ids.has(provider.id) || !frozen ||
        provider.path !== frozen.path || provider.bytes !== frozen.bytes || provider.sha256 !== frozen.sha256 ||
        provider.infoCount !== frozen.infoCount || provider.kind !== frozen.kind) throw new Error('Invalid original info provider receipt');
    ids.add(provider.id);
  }
  const profile = document.browserProfile;
  if (!profile || profile.id !== 'fresh-original-G3_World_01-INI' || profile.worldName !== 'G3_World_01' ||
      profile.entityPatchingEnabled !== true || profile.compiledProjectFolder !== true ||
      profile.compiledInfoLookup !== 'missing' || profile.noInfosSkip !== false || profile.nativeRuntimeCaptured !== false ||
      !Array.isArray(profile.assumptions) || !profile.assumptions.every((item) => typeof item === 'string')) {
    throw new Error('Invalid explicit browser InfoManager profile');
  }
}

/** Verified source metadata. This does not select an active native session. */
export async function loadOriginalInfoDocument(): Promise<OriginalInfoDocument> {
  if (!documentPending) documentPending = readNativeResource<OriginalInfoDocument>(receipt.output.path, receipt.output)
    .then((document) => { validateDocument(document); return document; })
    .catch((error: unknown) => { documentPending = null; throw error; });
  return structuredClone(await documentPending);
}

/** Historical providers are separate snapshots, never merged with current INIs. */
export async function loadOriginalInfoProvider(id: InfoProviderId): Promise<OriginalInfoProvider> {
  let pending = providerPending.get(id);
  if (!pending) {
    pending = (async () => {
      const document = await loadOriginalInfoDocument();
      const providerReceipt = document.providers.find((candidate) => candidate.id === id);
      if (!providerReceipt) throw new Error('Original info provider is absent: ' + id);
      const provider = await readNativeResource<OriginalInfoProvider>(providerReceipt.path, providerReceipt);
      if (provider.schema !== 'gothic3-info-provider-v1' || provider.id !== id || provider.kind !== providerReceipt.kind ||
          provider.infoCount !== providerReceipt.infoCount || !Array.isArray(provider.records) ||
          provider.records.length !== provider.infoCount || !Array.isArray(provider.sources)) throw new Error('Invalid original info provider: ' + id);
      for (const source of provider.sources) {
        if (!source || !source.archive || !source.path || !sha256(source.sha256) || typeof source.selection !== 'string') {
          throw new Error('Invalid original info source: ' + id);
        }
      }
      const names = new Set<string>();
      let given = 0; let permanent = 0;
      for (const record of provider.records) {
        if (!record.id || names.has(record.id) || !integer(record.sourceIndex) || !provider.sources[record.sourceIndex] ||
            !optionalBoolean(record.sourceGiven) || !optionalBoolean(record.sourcePermanent) ||
            typeof record.given !== 'boolean' || typeof record.permanent !== 'boolean' ||
            record.given !== (record.sourceGiven ?? false) || record.permanent !== (record.sourcePermanent ?? false) ||
            (record.sourceGiven === null ? record.givenInitialization !== 'fresh-factory-default' :
              record.givenInitialization !== (id === 'ini' ? 'explicit-ini' : 'compiled-static-property')) ||
            (record.sourcePermanent === null ? record.permanentInitialization !== 'fresh-factory-default' :
              record.permanentInitialization !== (id === 'ini' ? 'explicit-ini' : 'compiled-static-property'))) {
          throw new Error('Invalid original info initialization: ' + record.id);
        }
        names.add(record.id); given += Number(record.given); permanent += Number(record.permanent);
      }
      if (provider.audit?.effectiveGivenTrue !== given || provider.audit?.effectivePermanentTrue !== permanent) {
        throw new Error('Original info flags differ from audited counts');
      }
      return provider;
    })().catch((error: unknown) => { providerPending.delete(id); throw error; });
    providerPending.set(id, pending);
  }
  return structuredClone(await pending);
}

/** The two compiled-project branches join when compiled lookup is known missing. */
export function resolveInitialInfoProvider(context: InitialInfoReadContext): InitialInfoResolution {
  if (!context.worldName.known) return { kind: 'unknown', reason: context.worldName.reason };
  if (context.worldName.value !== 'G3_World_01') return { kind: 'unknown', reason: 'This source state covers G3_World_01 only.' };
  if (!context.entityPatchingEnabled.known) return { kind: 'unknown', reason: context.entityPatchingEnabled.reason };
  if (!context.entityPatchingEnabled.value) return { kind: 'unknown', reason: 'Patching-disabled Read does not establish this fresh static table.' };
  const compiled = context.compiledProjectFolder;
  const lookup = context.compiledInfoLookup;
  if (compiled.known && compiled.value && lookup.known && (lookup.value === 'compiled-pak' || lookup.value === 'compiled-p00')) {
    return { kind: 'provider', provider: lookup.value, route: 'Original compiled static property-object read; historical provider membership retained.' };
  }
  if (!((compiled.known && !compiled.value) || (lookup.known && lookup.value === 'missing'))) {
    return { kind: 'unknown', reason: 'Compiled provider success/failure is not established for this initial read.' };
  }
  if (!context.noInfosSkip.known) return { kind: 'unknown', reason: context.noInfosSkip.reason };
  if (context.noInfosSkip.value) return { kind: 'unknown', reason: 'Native noinfos option suppresses the INI loader; this catalog is not its runtime table.' };
  return { kind: 'provider', provider: 'ini', route: 'Fresh native INI instances; compiled flag false or compiled lookup known missing.' };
}

/** A source seed plus the supported accepted-script Given store, not a save/session simulator. */
export class NativeInfoState {
  private readonly records = new Map<string, InfoInitialRecord>();
  private readonly current = new Map<string, boolean>();
  private invalidatedReason: string | null = null;

  private constructor(private readonly provider: OriginalInfoProvider, private readonly route: string,
    private readonly unapplied: string[]) {
    for (const record of provider.records) { this.records.set(record.id, record); this.current.set(record.id, record.given); }
  }

  static async fromInitialRead(document: OriginalInfoDocument, context: InitialInfoReadContext): Promise<NativeValue<NativeInfoState>> {
    validateDocument(document);
    const selected = resolveInitialInfoProvider(context);
    if (selected.kind === 'unknown') return { known: false, reason: selected.reason };
    const provider = await loadOriginalInfoProvider(selected.provider);
    return { known: true, value: new NativeInfoState(provider, selected.route, [...document.unapplied]) };
  }

  get providerId(): InfoProviderId { return this.provider.id; }

  source(id: string): (InfoInitialRecord & { source: InfoStaticSource }) | undefined {
    const record = this.records.get(id);
    const source = record ? this.provider.sources[record.sourceIndex] : undefined;
    return record && source ? structuredClone({ ...record, source }) : undefined;
  }

  /** Exact source identity prevents historical Given flags from leaking into different INIs. */
  given(info: NativeInfo): NativeValue<boolean> {
    if (this.invalidatedReason) return { known: false, reason: this.invalidatedReason };
    const record = this.records.get(info.id);
    if (!record) return { known: false, reason: 'Info does not belong to this original provider: ' + info.id };
    const source = this.provider.sources[record.sourceIndex];
    if (!source) return { known: false, reason: 'Original info source is absent: ' + info.id };
    if (info.source.sha256 !== source.sha256 || info.source.archive !== source.archive || info.source.path !== source.path) {
      return { known: false, reason: 'Info definition differs from this provider source: ' + info.id };
    }
    return { known: true, value: this.current.get(info.id)! };
  }

  /** Call only from an accepted native execution plan whose permanence gates permit Given. */
  markGiven(info: NativeInfo): void {
    const value = this.given(info);
    if (!value.known) throw new Error(value.reason);
    this.current.set(info.id, true);
  }

  /** Browser-session delta for the native Given bits; source defaults are loaded separately. */
  currentGivenIds(): readonly string[] {
    if (this.invalidatedReason) throw new Error(this.invalidatedReason);
    return [...this.current].filter(([, given]) => given).map(([id]) => id).sort();
  }

  /** Restore only IDs present in this exact source provider. */
  restoreGivenIds(ids: readonly string[]): void {
    if (this.invalidatedReason) throw new Error(this.invalidatedReason);
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) {
      throw new Error('Browser save has invalid or duplicate InfoManager Given IDs.');
    }
    for (const id of ids) {
      if (!this.records.has(id)) throw new Error('Browser save refers to an Info absent from this source provider: ' + id);
    }
    for (const id of ids) this.current.set(id, true);
  }

  /** Unsupported callbacks/restores must invalidate facts, never reset them to defaults. */
  invalidateForUnsupportedRestore(reason: string): void {
    if (!reason.trim()) throw new Error('Info state invalidation needs a reason');
    this.invalidatedReason = reason;
  }

  snapshot(): InfoStateSnapshot {
    return { provider: this.provider.id, scope: 'ordinary-world-read-before-OnGameStartUp', route: this.route,
      valid: this.invalidatedReason === null, invalidatedReason: this.invalidatedReason, unapplied: [...this.unapplied],
      records: [...this.records.values()].map((record) => {
        const source = this.provider.sources[record.sourceIndex];
        if (!source) throw new Error('Original info source is absent: ' + record.id);
        return structuredClone({ ...record, source, currentGiven: this.current.get(record.id)! });
      }) };
  }
}

/** Explicit browser fresh-world profile. This is not a captured native game's state. */
export async function loadBrowserInfoState(): Promise<NativeInfoState> {
  const document = await loadOriginalInfoDocument();
  const profile = document.browserProfile;
  const result = await NativeInfoState.fromInitialRead(document, {
    worldName: { known: true, value: profile.worldName },
    entityPatchingEnabled: { known: true, value: profile.entityPatchingEnabled },
    compiledProjectFolder: { known: true, value: profile.compiledProjectFolder },
    compiledInfoLookup: { known: true, value: profile.compiledInfoLookup },
    noInfosSkip: { known: true, value: profile.noInfosSkip },
  });
  if (!result.known) throw new Error(result.reason);
  return result.value;
}
