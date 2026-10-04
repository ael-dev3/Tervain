import { assetUrl } from './assets';

export interface NativeSource {
  archive: string;
  path: string;
  sha256: string;
  selection: string;
  layers: string[];
}

export interface NativeQuest {
  id: string;
  numericType: number | null;
  prereqs: string[];
  deliveryTargets: { entity: string; amount: number | null; initialCounter: number | null }[];
  destination: string;
  folder: string;
  logTopic: string;
  logText: string;
  runningTime: { years: number | null; days: number | null; hours: number | null };
  rewards: {
    experience: number | null;
    political: { alignment: number | null; amount: number | null } | null;
    enclave: { name: string; amount: number | null } | null;
    job: { code: number | null; amount: number | null } | null;
    attribute: { id: string; amount: number | null } | null;
  };
  source: NativeSource;
  issues: string[];
}

export interface NativeCommand {
  index: number;
  command: string;
  entity1: string;
  entity2: string;
  id1: string;
  id2: string;
  text: string;
}

export interface NativeInfo {
  id: string;
  sortId: number | null;
  owner: string;
  parent: string;
  quest: string;
  conditionType: number | null;
  type: number | null;
  given: boolean | null;
  permanent: boolean | null;
  clearChildren: boolean | null;
  goldCost: number | null;
  folder: string;
  conditions: {
    ownerNearEntity: string;
    playerKnows: string[];
    itemContainer: string;
    items: { id: string; amount: number | null }[];
    secondaryNPCs: { entity: string; state: number | null }[];
    playerSkills: { isPerk: boolean | null; index: number | null; value: number | null }[];
    namedPlayerSkills: unknown[];
  };
  teach: { isPerk: boolean | null; index: number | null; value: number | null; skill: string; attribute: string; attributeValue: number | null };
  commands: NativeCommand[];
  source: NativeSource;
  issues: string[];
}

interface CatalogManifest {
  schema: string;
  urls: { quests: string; infos: string; enums: string; commands: string; runtimeQuests?: string; runtimeInfos?: string };
  runtime?: { quests: string; infos: string };
  localization: { currentLanguage: string; files: { language: string; url: string; count: number }[] };
  counts: { quests: number; infos: number; commandLines: number };
  outputs: { path: string; bytes: number; sha256: string }[];
}

export interface NativeEnums {
  infoConditionType: Record<string, string>;
  infoType: Record<string, string>;
  questStatus: Record<string, string>;
}

export interface LocalizationEntry { text: string; stageDirection: string }

/** Source records are loaded on demand; this class executes no dialogue. */
export class NativeCatalog {
  quests: NativeQuest[] = [];
  infos: NativeInfo[] = [];
  enums: NativeEnums = { infoConditionType: {}, infoType: {}, questStatus: {} };
  language = 'English';
  private manifest: CatalogManifest | null = null;
  private pending: Promise<void> | null = null;
  private readonly texts = new Map<string, Record<string, LocalizationEntry>>();

  get languages(): string[] { return this.manifest?.localization.files.map((entry) => entry.language) ?? []; }

  load(): Promise<void> {
    if (!this.pending) this.pending = this.readCatalog().catch((error: unknown) => { this.pending = null; throw error; });
    return this.pending;
  }

  private async readCatalog(): Promise<void> {
    const response = await fetch(assetUrl('gameplay/manifest.json'));
    if (!response.ok) throw new Error('Gameplay manifest HTTP ' + response.status);
    this.manifest = await response.json() as CatalogManifest;
    if (this.manifest.schema !== 'gothic3-gameplay-v1') throw new Error('Unsupported gameplay schema');
    const urls = this.manifest.runtime ?? { quests: this.manifest.urls.runtimeQuests ?? this.manifest.urls.quests, infos: this.manifest.urls.runtimeInfos ?? this.manifest.urls.infos };
    const [quests, infos, enums] = await Promise.all([
      this.read<NativeQuest[]>(urls.quests),
      this.read<NativeInfo[]>(urls.infos),
      this.read<NativeEnums>(this.manifest.urls.enums),
    ]);
    if (!Array.isArray(quests) || quests.length !== this.manifest.counts.quests ||
        !Array.isArray(infos) || infos.length !== this.manifest.counts.infos) {
      throw new Error('Gameplay catalog counts differ from the source manifest');
    }
    const questIds = new Set<string>();
    for (const quest of quests) {
      if (!quest.id || questIds.has(quest.id) || !Array.isArray(quest.deliveryTargets)) throw new Error('Invalid or duplicate native quest');
      questIds.add(quest.id);
    }
    const infoIds = new Set<string>();
    for (const info of infos) {
      if (!info.id || infoIds.has(info.id) || !Array.isArray(info.commands)) throw new Error('Invalid or duplicate native info');
      infoIds.add(info.id);
    }
    this.quests = quests;
    this.infos = infos;
    this.enums = enums;
    await this.setLanguage(this.language);
  }

  private async read<T>(path: string): Promise<T> {
    const expected = this.manifest?.outputs.find((entry) => entry.path === path);
    if (!expected) throw new Error('Gameplay output not listed: ' + path);
    const response = await fetch(assetUrl('gameplay/' + path));
    if (!response.ok) throw new Error(path + ' HTTP ' + response.status);
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== expected.bytes) throw new Error('Gameplay output size differs: ' + path);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== expected.sha256) throw new Error('Gameplay output hash differs: ' + path);
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  }

  async setLanguage(language: string): Promise<void> {
    const entry = this.manifest?.localization.files.find((candidate) => candidate.language === language);
    if (!entry) throw new Error('Original language not present: ' + language);
    if (!this.texts.has(language)) this.texts.set(language, await this.read<Record<string, LocalizationEntry>>(entry.url));
    this.language = language;
  }

  text(key: string): string {
    const entry = this.texts.get(this.language)?.[key];
    return entry ? entry.text : '[' + key + ']';
  }

  entry(key: string): LocalizationEntry | undefined { return this.texts.get(this.language)?.[key]; }

  forOwner(name: string): NativeInfo[] {
    return this.infos.filter((info) => info.owner === name).sort((a, b) => (a.sortId ?? 0) - (b.sortId ?? 0) || a.id.localeCompare(b.id));
  }
}
