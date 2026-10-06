import { assetUrl } from './assets';
import type { NativeSource } from './catalog';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

export interface NativeOutput extends ResourceReceipt { path: string }
export interface NativeGameplayManifest {
  schema: 'gothic3-gameplay-v1';
  urls: { quests: string; infos: string; enums: string; commands: string; runtimeQuests?: string; runtimeInfos?: string };
  runtime?: { quests: string; infos: string };
  world: { index: string; files: string; errors: string };
  templates: { index: string; files: string; errors: string };
  initial: Record<string, string>;
  localization: { currentLanguage: string; files: { language: string; url: string; count: number }[] };
  counts: { quests: number; infos: number; commandLines: number };
  outputs: NativeOutput[];
}

interface CachedResource {
  promise: Promise<unknown>;
  decodedBytes: number;
  complete: boolean;
}

/** Shared verified reads. Eviction drops source JSON, never active game state. */
export class NativeGameplayResources {
  private pending: Promise<NativeGameplayManifest> | null = null;
  private receipts = new Map<string, NativeOutput>();
  private readonly cache = new Map<string, CachedResource>();
  private heldBytes = 0;

  constructor(private readonly budgetBytes = 32 * 1024 * 1024) {}

  manifest(): Promise<NativeGameplayManifest> {
    if (!this.pending) this.pending = this.readManifest().catch((error: unknown) => {
      this.pending = null;
      throw error;
    });
    return this.pending;
  }

  private async readManifest(): Promise<NativeGameplayManifest> {
    const response = await fetch(assetUrl('gameplay/manifest.json'), { cache: 'no-cache' });
    if (!response.ok) throw new Error('Gameplay manifest HTTP ' + response.status);
    const manifest = await response.json() as NativeGameplayManifest;
    if (manifest.schema !== 'gothic3-gameplay-v1' || !Array.isArray(manifest.outputs) ||
        !manifest.world || !manifest.templates || !manifest.initial || !manifest.localization) {
      throw new Error('Unsupported native gameplay manifest');
    }
    const receipts = new Map<string, NativeOutput>();
    for (const entry of manifest.outputs) {
      if (!/^[A-Za-z0-9_/-]+\.json(?:\.gz)?$/.test(entry.path) || entry.path.includes('..') ||
          receipts.has(entry.path) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 ||
          !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('Invalid native output receipt');
      receipts.set(entry.path, entry);
    }
    this.receipts = receipts;
    return manifest;
  }

  async read<T>(path: string): Promise<T> {
    await this.manifest();
    const receipt = this.receipts.get(path);
    if (!receipt) throw new Error('Native output is not listed: ' + path);
    const previous = this.cache.get(path);
    if (previous) {
      // Insertion order is the least-recently-used order.
      this.cache.delete(path);
      this.cache.set(path, previous);
      return await previous.promise as T;
    }
    const entry: CachedResource = {
      promise: Promise.resolve(null),
      decodedBytes: receipt.uncompressedBytes ?? receipt.bytes,
      complete: false,
    };
    entry.promise = readNativeResource<T>('gameplay/' + path, receipt).then((value) => {
      if (this.cache.get(path) === entry) {
        entry.complete = true;
        this.heldBytes += entry.decodedBytes;
        this.trim();
      }
      return value;
    }).catch((error: unknown) => {
      if (this.cache.get(path) === entry) this.cache.delete(path);
      throw error;
    });
    this.cache.set(path, entry);
    return await entry.promise as T;
  }

  private trim(): void {
    for (const [path, entry] of this.cache) {
      if (this.heldBytes <= this.budgetBytes) break;
      if (!entry.complete) continue;
      this.cache.delete(path);
      this.heldBytes -= entry.decodedBytes;
    }
  }

  get retainedDecodedBytes(): number { return this.heldBytes; }
}

export const gameplayResources = new NativeGameplayResources();

export interface NativePropertySet {
  name: string;
  version: number;
  values: Record<string, unknown>;
  unknownProperties?: { name: string; type: string; status: string }[];
  duplicateProperties?: { name: string; value: unknown }[];
  tail?: { status: string; value?: unknown; raw?: string };
}

export interface NativeEntityRecord {
  key: string | null;
  index: number;
  name: string;
  guid: string | null;
  creator: string | null;
  flags: number[];
  worldMatrix: number[];
  propertySets: NativePropertySet[];
  templateHeader?: { helperParent: boolean; deleted: boolean; refTemplate: unknown };
}

export interface NativeEntityIndex {
  key: string;
  name: string;
  guid: string | null;
  creator: string | null;
  file: number;
  entityIndex: number;
  propertySets: string[];
  hasGameplay: boolean;
  position: [number, number, number]; // Original centimetres and original axes.
  dataChunk?: string;
}

export interface NativeSourceFile {
  index: number;
  url?: string;
  source: NativeSource;
  entities?: number;
  gameplayEntities?: number;
  error?: string;
}

interface NativeChunk extends ResourceReceipt { url: string; entities?: number; headers?: number }
interface NativeTemplateFile {
  readonly index: number;
  readonly source: NativeSource;
  readonly url?: string;
  readonly headers?: number;
  readonly status?: string;
}
interface WorldSourceDescriptor {
  schema: 'gothic3-entity-chunks-v1';
  source: NativeSource;
  entityCount: number;
  parents: [number, number][];
  chunks: NativeChunk[];
  indexChunks: NativeChunk[];
}

export interface NativeTemplateIndex {
  file: number;
  header: number;
  name: string;
  guid: string | null;
  refTemplate: unknown;
  helperParent: boolean;
  propertySets: string[];
  dataChunk: string;
  /** Attached only by exact source-path resolution, never name-only lookup. */
  source?: NativeSource;
}

export type SourceLookup<T> =
  | { kind: 'found'; value: T }
  | { kind: 'missing'; reason: string }
  | { kind: 'ambiguous'; candidates: readonly T[] };

function chooseUnique<T>(candidates: readonly T[], label: string): SourceLookup<T> {
  if (!candidates.length) return { kind: 'missing', reason: 'No source match: ' + label };
  if (candidates.length > 1) return { kind: 'ambiguous', candidates };
  return { kind: 'found', value: candidates[0]! };
}

/** Source access does not activate sectors, clone templates or execute callbacks. */
export class NativeWorldData {
  private filesPending: Promise<readonly NativeSourceFile[]> | null = null;
  private templatesPending: Promise<readonly NativeTemplateIndex[]> | null = null;
  private templateFilesPending: Promise<readonly NativeTemplateFile[]> | null = null;

  constructor(readonly resources = gameplayResources) {}

  sourceFiles(): Promise<readonly NativeSourceFile[]> {
    if (!this.filesPending) this.filesPending = this.readSourceFiles().catch((error: unknown) => {
      this.filesPending = null;
      throw error;
    });
    return this.filesPending;
  }

  private async readSourceFiles(): Promise<readonly NativeSourceFile[]> {
    const manifest = await this.resources.manifest();
    const files = await this.resources.read<NativeSourceFile[]>(manifest.world.files);
    if (!Array.isArray(files) || new Set(files.map((file) => file.index)).size !== files.length ||
        files.some((file) => !Number.isSafeInteger(file.index) || file.index < 0 || !file.source?.path)) {
      throw new Error('Invalid native world file directory');
    }
    return files;
  }

  async sourceByPath(path: string): Promise<SourceLookup<NativeSourceFile>> {
    return chooseUnique((await this.sourceFiles()).filter((file) => file.source.path === path), path);
  }

  private async descriptor(index: number): Promise<WorldSourceDescriptor> {
    const file = (await this.sourceFiles()).find((candidate) => candidate.index === index);
    if (!file?.url) throw new Error('Native world source is undecoded or absent: ' + index);
    const descriptor = await this.resources.read<WorldSourceDescriptor>(file.url);
    if (descriptor.schema !== 'gothic3-entity-chunks-v1' || descriptor.source.sha256 !== file.source.sha256 ||
        !Array.isArray(descriptor.chunks) || !Array.isArray(descriptor.indexChunks)) {
      throw new Error('Native world descriptor differs: ' + index);
    }
    return descriptor;
  }

  async entityIndex(index: number): Promise<readonly NativeEntityIndex[]> {
    const source = await this.descriptor(index);
    const entities: NativeEntityIndex[] = [];
    // Bound concurrent decoded chunks; unrelated sources are not eagerly fetched.
    for (const chunk of source.indexChunks) {
      const document = await this.resources.read<{ entities: NativeEntityIndex[] }>(chunk.url);
      if (!Array.isArray(document.entities) || document.entities.length !== chunk.entities ||
          document.entities.some((entity) => entity.file !== index || !entity.key)) {
        throw new Error('Native entity index differs: ' + chunk.url);
      }
      entities.push(...document.entities);
    }
    const file = (await this.sourceFiles()).find((candidate) => candidate.index === index)!;
    if (entities.length !== file.entities) throw new Error('Native entity count differs: ' + index);
    return entities;
  }

  /** Resolve original PropertyID references inside one source file. Native
   * bCPropertyID equality compares its first 16 bytes; the final DWORD is a
   * cache and is not part of the key. Keep only requested rows while scanning
   * the source's bounded index chunks. */
  async entitiesByPropertyIds(index: number, propertyIds: readonly string[]): Promise<ReadonlyMap<string, readonly NativeEntityIndex[]>> {
    if (!Number.isSafeInteger(index) || index < 0 || !Array.isArray(propertyIds) ||
        propertyIds.some((value) => typeof value !== 'string' || !/^[a-f0-9]{40}$/i.test(value))) {
      throw new Error('Native entity lookup requires a source index and 20-byte PropertyIDs.');
    }
    const requested = new Set(propertyIds.map((value) => value.slice(0, 32).toLowerCase()));
    const matches = new Map<string, NativeEntityIndex[]>();
    for (const prefix of requested) matches.set(prefix, []);
    if (!requested.size) return matches;
    const source = await this.descriptor(index);
    let entityCount = 0;
    for (const chunk of source.indexChunks) {
      const document = await this.resources.read<{ entities: NativeEntityIndex[] }>(chunk.url);
      if (!Array.isArray(document.entities) || document.entities.length !== chunk.entities ||
          document.entities.some((entity) => entity.file !== index || !entity.key ||
            (entity.guid !== null && !/^[a-f0-9]{40}$/i.test(entity.guid)))) {
        throw new Error('Native entity index differs: ' + chunk.url);
      }
      entityCount += document.entities.length;
      for (const entity of document.entities) {
        if (!entity.guid) continue;
        const prefix = entity.guid.slice(0, 32).toLowerCase();
        matches.get(prefix)?.push(entity);
      }
    }
    const file = (await this.sourceFiles()).find((candidate) => candidate.index === index);
    if (!file?.entities || entityCount !== file.entities) throw new Error('Native entity count differs: ' + index);
    return new Map([...matches].map(([prefix, rows]) => [prefix, Object.freeze(rows.slice())]));
  }

  /** Search one selected native file's hash-checked index chunks without
   * decoding unrelated full property-set payloads. Multiple names are kept as
   * multiple matches because native entity lookup may be ambiguous. */
  async entitiesNamed(index: number, names: readonly string[]): Promise<ReadonlyMap<string, readonly NativeEntityIndex[]>> {
    const requested = new Set(names);
    if (names.some((name) => typeof name !== 'string' || name.length === 0) || requested.size !== names.length) {
      throw new Error('Native entity-name query must contain unique nonempty names');
    }
    const source = await this.descriptor(index);
    const matches = new Map<string, NativeEntityIndex[]>();
    for (const name of names) matches.set(name, []);
    let entityCount = 0;
    for (const chunk of source.indexChunks) {
      const document = await this.resources.read<{ entities: NativeEntityIndex[] }>(chunk.url);
      if (!Array.isArray(document.entities) || document.entities.length !== chunk.entities ||
          document.entities.some((entity) => entity.file !== index || !entity.key)) {
        throw new Error('Native entity index differs: ' + chunk.url);
      }
      entityCount += document.entities.length;
      for (const entity of document.entities) {
        if (requested.has(entity.name)) matches.get(entity.name)!.push(entity);
      }
    }
    const file = (await this.sourceFiles()).find((candidate) => candidate.index === index);
    if (!file?.entities || entityCount !== file.entities) throw new Error('Native entity count differs: ' + index);
    return matches;
  }

  async entity(record: NativeEntityIndex): Promise<SourceLookup<NativeEntityRecord>> {
    if (!record.dataChunk) return { kind: 'missing', reason: 'Selected gameplay properties are absent: ' + record.key };
    const document = await this.resources.read<{ entities: NativeEntityRecord[] }>(record.dataChunk);
    if (!Array.isArray(document.entities)) throw new Error('Native entity chunk is invalid: ' + record.dataChunk);
    return chooseUnique(document.entities.filter((entity) => entity.key === record.key && entity.guid === record.guid), record.key);
  }

  templateIndex(): Promise<readonly NativeTemplateIndex[]> {
    if (!this.templatesPending) this.templatesPending = this.readTemplateIndex().catch((error: unknown) => {
      this.templatesPending = null;
      throw error;
    });
    return this.templatesPending;
  }

  private async readTemplateIndex(): Promise<readonly NativeTemplateIndex[]> {
    const manifest = await this.resources.manifest();
    const index = await this.resources.read<{ schema: string; headerCount: number; chunks: NativeChunk[] }>(manifest.templates.index);
    if (index.schema !== 'gothic3-template-index-chunks-v1' || !Array.isArray(index.chunks)) throw new Error('Unsupported template index');
    const headers: NativeTemplateIndex[] = [];
    for (const chunk of index.chunks) {
      const document = await this.resources.read<{ headers: NativeTemplateIndex[] }>(chunk.url);
      if (!Array.isArray(document.headers) || document.headers.length !== chunk.headers) throw new Error('Template index chunk differs');
      headers.push(...document.headers);
    }
    if (headers.length !== index.headerCount || new Set(headers.map((header) => header.file + ':' + header.header)).size !== headers.length) {
      throw new Error('Template index count or identities differ');
    }
    return headers;
  }

  async templateByGuid(guid: string): Promise<SourceLookup<NativeTemplateIndex>> {
    // All 20 source bytes participate; do not strip the suffix or invent aliases.
    return chooseUnique((await this.templateIndex()).filter((header) => header.guid === guid), guid);
  }

  async templateByGuidWithSource(guid: string): Promise<SourceLookup<NativeTemplateIndex>> {
    return this.attachTemplateSource(await this.templateByGuid(guid));
  }

  async templateByName(name: string, includeHelpers = false): Promise<SourceLookup<NativeTemplateIndex>> {
    return chooseUnique((await this.templateIndex()).filter((header) => header.name === name && (includeHelpers || !header.helperParent)), name);
  }

  async templateByNameWithSource(name: string, includeHelpers = false): Promise<SourceLookup<NativeTemplateIndex>> {
    return this.attachTemplateSource(await this.templateByName(name, includeHelpers));
  }

  private async attachTemplateSource(lookup: SourceLookup<NativeTemplateIndex>): Promise<SourceLookup<NativeTemplateIndex>> {
    if (lookup.kind !== 'found') return lookup;
    if (!this.templateFilesPending) this.templateFilesPending = this.readTemplateFiles().catch((error: unknown) => {
      this.templateFilesPending = null;
      throw error;
    });
    const files = (await this.templateFilesPending).filter((file) => file.index === lookup.value.file);
    if (!files.length) return { kind: 'missing', reason: 'Native template source file is absent: ' + lookup.value.file };
    if (files.length > 1) return { kind: 'ambiguous', candidates: files.map((file) => ({ ...lookup.value, source: file.source })) };
    return { kind: 'found', value: { ...lookup.value, source: files[0]!.source } };
  }

  /** Resolve a named template only inside one exact logical source path.
   * Duplicate names can include deleted placeholders from _deleted paths, so
   * name-only lookup remains ambiguous instead of guessing which file wins. */
  async templateByNameInSource(name: string, sourcePath: string,
    includeHelpers = false): Promise<SourceLookup<NativeTemplateIndex>> {
    if (!name || !sourcePath) return { kind: 'missing', reason: 'Native template lookup needs a name and exact source path.' };
    if (!this.templateFilesPending) this.templateFilesPending = this.readTemplateFiles().catch((error: unknown) => {
      this.templateFilesPending = null;
      throw error;
    });
    const files = await this.templateFilesPending;
    const matchingFiles = files.filter((file) => file.source.path === sourcePath);
    if (!matchingFiles.length) return { kind: 'missing', reason: 'No native template source matches: ' + sourcePath };
    if (matchingFiles.length !== 1) return { kind: 'missing', reason: `Native template path ${sourcePath} resolves to ${matchingFiles.length} source files.` };
    const fileIndexes = new Set(matchingFiles.map((file) => file.index));
    const selected = chooseUnique((await this.templateIndex()).filter((header) => fileIndexes.has(header.file) &&
      header.name === name && (includeHelpers || !header.helperParent)), name + ' in ' + sourcePath);
    return selected.kind === 'found'
      ? { kind: 'found', value: { ...selected.value, source: matchingFiles[0]!.source } }
      : selected;
  }

  private async readTemplateFiles(): Promise<readonly NativeTemplateFile[]> {
    const manifest = await this.resources.manifest();
    const files = await this.resources.read<NativeTemplateFile[]>(manifest.templates.files);
    if (!Array.isArray(files) || new Set(files.map((file) => file.index)).size !== files.length ||
        files.some((file) => !Number.isSafeInteger(file.index) || file.index < 0 || !file.source?.path ||
          !/^[a-f0-9]{64}$/i.test(file.source.sha256))) {
      throw new Error('Invalid native template file directory');
    }
    return files;
  }

  async template(record: NativeTemplateIndex): Promise<SourceLookup<NativeEntityRecord>> {
    const document = await this.resources.read<{ entities: NativeEntityRecord[] }>(record.dataChunk);
    if (!Array.isArray(document.entities)) throw new Error('Native template chunk is invalid');
    return chooseUnique(document.entities.filter((entity) => entity.index === record.header && entity.guid === record.guid), record.name);
  }
}

/** Ambiguous sets/properties stay unresolved rather than selecting a first row. */
export function sourceProperty(entity: NativeEntityRecord, setName: string, property: string): SourceLookup<unknown> {
  const sets = entity.propertySets.filter((set) => set.name === setName);
  if (!sets.length) return { kind: 'missing', reason: 'Source property set is absent: ' + setName };
  if (sets.length > 1) return { kind: 'ambiguous', candidates: sets.map((set) => set.values[property]) };
  const set = sets[0]!;
  if (set.unknownProperties?.some((entry) => entry.name === property)) return { kind: 'missing', reason: 'Source property is undecoded: ' + property };
  if (!Object.hasOwn(set.values, property)) return { kind: 'missing', reason: 'Source property is absent: ' + property };
  const values = [set.values[property], ...(set.duplicateProperties ?? []).filter((entry) => entry.name === property).map((entry) => entry.value)];
  // Repeated identical scalar writes have the same result in any order. Keep
  // differing values and compound records unresolved until read order is proved.
  if (values.length > 1) {
    const scalar = values[0] === null || ['string', 'number', 'boolean'].includes(typeof values[0]);
    if (!scalar || values.some((value) => !Object.is(value, values[0]))) return { kind: 'ambiguous', candidates: values };
  }
  return { kind: 'found', value: values[0] };
}
