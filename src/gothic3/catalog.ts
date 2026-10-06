import { gameplayResources } from './native-data';
import type { NativeGameplayManifest } from './native-data';

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
  /** Original Info Npc field used by gCInfo_PS::OnDelivery. */
  npc?: string;
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

export interface NativeEnums {
  infoConditionType: Record<string, string>;
  infoType: Record<string, string>;
  questStatus: Record<string, string>;
}

interface NativeCommandDocument {
  native: { module: string; inputSha256: string; lookup: { va: string }; dispatcher: { va: string };
    entries: { name: string; opcode: number }[] };
}

export interface LocalizationEntry { text: string; stageDirection: string }

/** Source records are loaded on demand; this class executes no dialogue. */
export class NativeCatalog {
  quests: NativeQuest[] = [];
  infos: NativeInfo[] = [];
  enums: NativeEnums = { infoConditionType: {}, infoType: {}, questStatus: {} };
  language = 'English';
  private manifest: NativeGameplayManifest | null = null;
  private pending: Promise<void> | null = null;
  private readonly texts = new Map<string, Record<string, LocalizationEntry>>();
  private commandNames: ReadonlySet<string> | null = null;

  get languages(): string[] { return this.manifest?.localization.files.map((entry) => entry.language) ?? []; }

  load(): Promise<void> {
    if (!this.pending) this.pending = this.readCatalog().catch((error: unknown) => { this.pending = null; throw error; });
    return this.pending;
  }

  private async readCatalog(): Promise<void> {
    this.manifest = await gameplayResources.manifest();
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
    return gameplayResources.read<T>(path);
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

  /** Exact installed Script_Game command table used to keep unported native commands blocked. */
  async nativeCommandNames(): Promise<ReadonlySet<string>> {
    await this.load();
    if (this.commandNames) return new Set(this.commandNames);
    if (!this.manifest) throw new Error('Original gameplay manifest is unavailable.');
    const document = await this.read<NativeCommandDocument>(this.manifest.urls.commands);
    const native = document?.native;
    if (native?.module !== 'scripts/Script_Game.dll' ||
        native.inputSha256 !== '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1' ||
        native.lookup?.va !== '0x100db360' || native.dispatcher?.va !== '0x100dbb80' ||
        !Array.isArray(native.entries) || native.entries.length !== 54) {
      throw new Error('Original Script_Game command table receipt differs.');
    }
    const names = new Set<string>();
    const opcodes = new Set<number>();
    for (const entry of native.entries) {
      if (!entry || typeof entry.name !== 'string' || !entry.name ||
          !Number.isInteger(entry.opcode) || entry.opcode < 0 || entry.opcode > 53 ||
          names.has(entry.name.toLowerCase()) || opcodes.has(entry.opcode)) {
        throw new Error('Original Script_Game command table has an invalid or duplicate entry.');
      }
      names.add(entry.name.toLowerCase());
      opcodes.add(entry.opcode);
    }
    this.commandNames = names;
    return new Set(names);
  }

  forOwner(name: string): NativeInfo[] {
    return this.infos.filter((info) => info.owner === name).sort((a, b) => (a.sortId ?? 0) - (b.sortId ?? 0) || a.id.localeCompare(b.id));
  }
}
