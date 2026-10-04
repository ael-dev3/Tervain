import questReceiptText from '../../assets/gothic3/dialogue/initial-quests-output.json?raw';
import type { NativeQuest, NativeSource } from './catalog';
import { gameplayResources } from './native-data';
import { NativeQuests, QuestStatus } from './quest-state';
import type { NativeClock, QuestHost, QuestLogPair } from './quest-state';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

export interface InitializedInventoryStack {
  index: number;
  templateName: string;
  templateGuid20: string;
  amount: number;
  quality: number;
  quickSlot: number | null;
  hotKeyUnsigned: number;
  learned: boolean | null;
  learnedStatus: string;
  learnedOperation: 'setTrue' | 'preserve';
  equipmentSlot: number | null;
  equipmentStatus: string;
  [key: string]: unknown;
}
export interface InitializedEquipment {
  slotIndex: number;
  slot: { enum: string; version: number; value: number; [key: string]: unknown };
  templateName: string;
  templateGuid20: string;
  itemGuid20: string;
  status: 'serialized-equipped-slot';
  [key: string]: unknown;
}
export interface InitializedPlayerSeed {
  schema: 'gothic3-initialized-player-v1';
  schemaVersion: 1;
  status: string;
  player: { name: string; key: string; guid: string; creator: string | null; source: NativeSource;
    sourceOffset: number; worldMatrix: number[]; localMatrix: number[] };
  stats: {
    hitPoints: { current: number; max: number; nativeTag: string };
    manaPoints: { current: number; max: number; nativeTag: string };
    staminaPoints: { current: number; max: number; nativeTag: string };
    attributes: Record<string, { class: string; values: Record<string, string | number>; [key: string]: unknown }>;
  };
  memory: Record<string, unknown> & { XP: number; LPAttribs: number; LPPerks: number; Chapter: number;
    PlayerKnows: { prefix: number; count: number; elementType: string; items: string[] } };
  inventory: { status: string; stacks: InitializedInventoryStack[]; equipment: InitializedEquipment[];
    serializedStackCount: number; assuranceCount: number; [key: string]: unknown };
  templateDefinitions: Record<string, unknown>;
  serialized: { npc: Record<string, unknown>; [key: string]: unknown };
  events: unknown[];
  nativeStartup: { explicitQuestRuns: string[]; otherCalls: unknown[]; [key: string]: unknown };
  unsupportedCallbacks: unknown[];
  limitations: string[];
  audit: { resolvedStartupTemplates: number; templateDefinitionCount: number; serializedEquipmentSlots: number;
    nativeLearnedTrue: number; unresolvedLearned: number; [key: string]: unknown };
  [key: string]: unknown;
}
export interface InitialWorldClock {
  schema: 'gothic3-world-clock-v1';
  schemaVersion: 1;
  status: string;
  selectedEntityKey: string;
  source: NativeSource;
  calendar: { year: number; day: number; hour: number; minute: number; second: number };
  factor: number;
  [key: string]: unknown;
}
export interface InitialQuestRecord {
  id: string;
  status: QuestStatus;
  counters: number[];
  startedAt: NativeClock;
  logKeys: string[];
  logPairs: (QuestLogPair & { speakerStringIndex?: number; textStringIndex?: number })[];
  definitionSource: NativeSource;
  initialization: { kind: 'compiled-runtime-overlay' | 'fresh-factory-and-INI';
    packetIndex?: number; packetVersion?: number; packetOffset?: number; packetLength?: number;
    packetSha256?: string; sourceId?: string; sourceSha256?: string; [key: string]: unknown };
}
export interface InitialQuestDocument {
  schema: 'gothic3-initial-quests-v1';
  scope: 'original-world-state-before-OnGameStartUp';
  questCount: number;
  runtimePacketCount: number;
  quests: InitialQuestRecord[];
  runtimeSource: { sha256: string; entityKey: string; runtimeTailOffset: number; runtimeTailBytes: number;
    runtimePacketCount: number; [key: string]: unknown };
  startup: { explicitQuestRuns: string[]; applied: false; order: string[]; evidenceLimit: string; unimplemented: string[] };
  [key: string]: unknown;
}
interface InitialQuestOutputReceipt {
  schema: 'gothic3-initial-quests-output-v1';
  output: ResourceReceipt & { path: string };
  questCount: number;
  runtimePacketCount: number;
  details: { path: string; sha256: string };
}
export interface OriginalInitialState {
  scope: 'source-state-with-partial-player-startup-and-unapplied-quest-startup';
  player: InitializedPlayerSeed;
  clock: InitialWorldClock;
  questDocument: InitialQuestDocument;
  /** Seeded state only. The default host rejects all attempted effects. */
  quests: NativeQuests;
  view: { xp: number; learningPointsAttributes: number; learningPointsPerks: number; chapter: number;
    level: number; playerGameEvents: string[]; inventory: InitializedInventoryStack[]; equipment: InitializedEquipment[] };
  pendingStartup: { explicitQuestRuns: string[]; callbacks: unknown[]; notes: string[] };
}

const signedInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
const unsignedInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4294967295;
const guid20 = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function validatePlayer(player: InitializedPlayerSeed): void {
  if (player.schema !== 'gothic3-initialized-player-v1' || player.schemaVersion !== 1 ||
      player.player?.name !== 'PC_Hero' || !guid20(player.player.guid) || !hash(player.player.source?.sha256) ||
      !Array.isArray(player.player.worldMatrix) || player.player.worldMatrix.length !== 16 ||
      !player.player.worldMatrix.every(Number.isFinite) || !Array.isArray(player.player.localMatrix) ||
      player.player.localMatrix.length !== 16 || !player.player.localMatrix.every(Number.isFinite) ||
      !player.memory || !player.serialized?.npc) {
    throw new Error('Invalid source player seed');
  }
  for (const key of ['XP', 'LPAttribs', 'LPPerks', 'Chapter'] as const) {
    if (!signedInteger(player.memory[key])) throw new Error('Unresolved source player-memory number: ' + key);
  }
  if (!unsignedInteger(player.serialized.npc.Level)) throw new Error('Unresolved original player NPC Level');
  const events = player.memory.PlayerKnows;
  if (!events || events.prefix !== 1 || events.elementType !== 'class bCString' ||
      !Array.isArray(events.items) || events.count !== events.items.length || events.items.some((event) => typeof event !== 'string')) {
    throw new Error('Invalid original player-memory game-event array');
  }
  for (const stat of [player.stats?.hitPoints, player.stats?.manaPoints, player.stats?.staminaPoints]) {
    if (!stat || !signedInteger(stat.current) || !signedInteger(stat.max)) throw new Error('Invalid initialized player stat');
  }
  if (!Array.isArray(player.inventory?.stacks) || player.inventory.stacks.length !== 121 ||
      player.inventory.assuranceCount !== player.inventory.stacks.length || player.inventory.serializedStackCount !== 0 ||
      !Array.isArray(player.inventory.equipment) || player.inventory.equipment.length !== 2 ||
      Object.keys(player.templateDefinitions ?? {}).length !== 123) throw new Error('Player inventory count differs from native assurance proof');
  const templates = new Set<string>();
  for (const [index, stack] of player.inventory.stacks.entries()) {
    if (stack.index !== index || !stack.templateName || templates.has(stack.templateGuid20) || !guid20(stack.templateGuid20) ||
        !unsignedInteger(stack.amount) || !unsignedInteger(stack.quality) || !unsignedInteger(stack.hotKeyUnsigned) ||
        (stack.quickSlot !== null && !unsignedInteger(stack.quickSlot)) ||
        (stack.learned !== null && typeof stack.learned !== 'boolean') || !player.templateDefinitions[stack.templateGuid20]) {
      throw new Error('Invalid native-assured inventory stack: ' + index);
    }
    templates.add(stack.templateGuid20);
  }
  const slots = new Set<number>();
  for (const equipment of player.inventory.equipment) {
    if (!unsignedInteger(equipment.slotIndex) || slots.has(equipment.slotIndex) || equipment.slot?.value !== equipment.slotIndex ||
        !guid20(equipment.templateGuid20) || !guid20(equipment.itemGuid20) || equipment.status !== 'serialized-equipped-slot' ||
        !player.templateDefinitions[equipment.templateGuid20]) throw new Error('Invalid original equipment slot');
    slots.add(equipment.slotIndex);
  }
  if (!Array.isArray(player.unsupportedCallbacks) || !Array.isArray(player.limitations) ||
      player.limitations.some((note) => typeof note !== 'string') ||
      !Array.isArray(player.nativeStartup?.explicitQuestRuns)) throw new Error('Player initialization scope is missing');
}

function validateClock(clock: InitialWorldClock, player: InitializedPlayerSeed): void {
  if (clock.schema !== 'gothic3-world-clock-v1' || clock.schemaVersion !== 1 ||
      clock.source?.sha256 !== player.player.source.sha256 || !clock.selectedEntityKey ||
      !Number.isFinite(clock.factor) || !clock.calendar ||
      !['year', 'day', 'hour', 'minute', 'second'].every((key) => unsignedInteger(clock.calendar[key as keyof typeof clock.calendar])) || clock.calendar.hour >= 24 ||
      clock.calendar.minute >= 60 || clock.calendar.second >= 60) throw new Error('Invalid source world clock');
}

function validateQuests(document: InitialQuestDocument, definitions: readonly NativeQuest[], receipt: InitialQuestOutputReceipt,
  clock: InitialWorldClock): void {
  if (receipt.schema !== 'gothic3-initial-quests-output-v1' || receipt.questCount !== 641 || receipt.runtimePacketCount !== 637 ||
      document.schema !== 'gothic3-initial-quests-v1' || document.scope !== 'original-world-state-before-OnGameStartUp' ||
      document.questCount !== receipt.questCount || document.runtimePacketCount !== receipt.runtimePacketCount ||
      !Array.isArray(document.quests) || document.quests.length !== definitions.length || definitions.length !== 641 ||
      document.runtimeSource?.sha256 !== clock.source.sha256 || document.runtimeSource.entityKey !== clock.selectedEntityKey ||
      document.runtimeSource.runtimePacketCount !== 637 ||
      !unsignedInteger(document.runtimeSource.runtimeTailOffset) || !unsignedInteger(document.runtimeSource.runtimeTailBytes) ||
      document.startup?.applied !== false || !Array.isArray(document.startup.explicitQuestRuns) ||
      !Array.isArray(document.startup.unimplemented) || document.startup.unimplemented.some((note) => typeof note !== 'string') ||
      typeof document.startup.evidenceLimit !== 'string') throw new Error('Invalid original quest initialization document');
  const originals = new Map(definitions.map((quest) => [quest.id, quest]));
  if (originals.size !== 641) throw new Error('Duplicate original quest definitions');
  const ids = new Set<string>();
  const packets = new Set<number>();
  let fresh = 0;
  for (const record of document.quests) {
    const definition = originals.get(record.id);
    if (!definition || ids.has(record.id) || record.definitionSource?.sha256 !== definition.source.sha256 ||
        record.status !== QuestStatus.Open || !Array.isArray(record.counters) ||
        record.counters.length !== definition.deliveryTargets.length || !record.counters.every((value) => value === 0) ||
        !record.startedAt || record.startedAt.years !== 0 || record.startedAt.days !== 0 || record.startedAt.hours !== 0 ||
        !Array.isArray(record.logKeys) || !record.logKeys.every((key) => typeof key === 'string') || !Array.isArray(record.logPairs)) {
      throw new Error('Original quest seed differs from source definition: ' + record.id);
    }
    ids.add(record.id);
    for (const pair of record.logPairs) {
      if (pair.version !== 1 || typeof pair.speakerKey !== 'string' || typeof pair.textKey !== 'string') throw new Error('Invalid original quest log pair');
    }
    if (JSON.stringify(record.logKeys) !== JSON.stringify(record.logPairs.map((pair) => pair.textKey).filter(Boolean))) {
      throw new Error('Original quest log keys lost pair information: ' + record.id);
    }
    const initial = record.initialization;
    if (!initial) throw new Error('Quest initialization route is missing');
    if (initial.kind === 'compiled-runtime-overlay') {
      if (!unsignedInteger(initial.packetIndex) || initial.packetIndex >= 637 || packets.has(initial.packetIndex) ||
          initial.packetVersion !== 3 || initial.sourceSha256 !== document.runtimeSource.sha256 ||
          !unsignedInteger(initial.packetOffset) || !unsignedInteger(initial.packetLength) || !hash(initial.packetSha256) ||
          initial.packetOffset < document.runtimeSource.runtimeTailOffset ||
          initial.packetOffset + initial.packetLength > document.runtimeSource.runtimeTailOffset + document.runtimeSource.runtimeTailBytes) {
        throw new Error('Invalid original quest runtime packet: ' + record.id);
      }
      packets.add(initial.packetIndex);
    } else if (initial.kind === 'fresh-factory-and-INI') {
      if (!['Mort_GuideFireAgain', 'Mort_GuideMineAgain', 'Mort_GuideWolfAgain', 'PC_Hero_inAlShedim'].includes(record.id)) {
        throw new Error('Unexpected source quest without compiled runtime packet');
      }
      fresh++;
    }
    else throw new Error('Unknown quest initialization route');
  }
  if (packets.size !== 637 || fresh !== 4 || ids.size !== 641 ||
      document.startup.explicitQuestRuns.length !== 1 || document.startup.explicitQuestRuns[0] !== 'Xardas_FindXardas' ||
      !ids.has('Xardas_FindXardas')) throw new Error('Quest startup coverage differs from original proof');
}

const sourceOnlyQuestHost: QuestHost = {
  clock: () => null,
  apply: () => ({ applied: false, reason: 'Source-state inspection has not applied complete native startup or gameplay callbacks.' }),
  changed: () => { throw new Error('Source-only quest state cannot execute gameplay changes.'); },
};

/** Loads verified source-backed state; performs no RunQuest or other startup callback. */
export async function loadOriginalInitialState(host: QuestHost = sourceOnlyQuestHost): Promise<OriginalInitialState> {
  const manifest = await gameplayResources.manifest();
  const playerPath = manifest.initial.initializedPlayer;
  const clockPath = manifest.initial.worldClock;
  const questPath = manifest.runtime?.quests ?? manifest.urls.runtimeQuests ?? manifest.urls.quests;
  if (!playerPath || !clockPath) throw new Error('Native initialized player/clock receipts are unavailable');
  const receipt = JSON.parse(questReceiptText) as InitialQuestOutputReceipt;
  if (receipt.schema !== 'gothic3-initial-quests-output-v1' || receipt.output?.path !== 'initial-quests.json') {
    throw new Error('Invalid separate initial-quest receipt');
  }
  const [sourcePlayer, sourceClock, definitions, sourceQuests] = await Promise.all([
    gameplayResources.read<InitializedPlayerSeed>(playerPath), gameplayResources.read<InitialWorldClock>(clockPath),
    gameplayResources.read<NativeQuest[]>(questPath), readNativeResource<InitialQuestDocument>('dialogue/' + receipt.output.path, receipt.output),
  ]);
  validatePlayer(sourcePlayer);
  validateClock(sourceClock, sourcePlayer);
  validateQuests(sourceQuests, definitions, receipt, sourceClock);
  // Cached transport records remain source records; each consumer receives its own state.
  const player = structuredClone(sourcePlayer);
  const clock = structuredClone(sourceClock);
  const questDocument = structuredClone(sourceQuests);
  const quests = new NativeQuests(structuredClone(definitions), host);
  for (const record of questDocument.quests) {
    quests.seed(record.id, { status: record.status, counters: record.counters, startedAt: record.startedAt,
      logKeys: record.logKeys, logPairs: record.logPairs });
  }
  return { scope: 'source-state-with-partial-player-startup-and-unapplied-quest-startup', player, clock, questDocument, quests,
    view: { xp: player.memory.XP, learningPointsAttributes: player.memory.LPAttribs, learningPointsPerks: player.memory.LPPerks,
      chapter: player.memory.Chapter, level: player.serialized.npc.Level as number,
      playerGameEvents: [...player.memory.PlayerKnows.items], inventory: player.inventory.stacks, equipment: player.inventory.equipment },
    pendingStartup: { explicitQuestRuns: [...questDocument.startup.explicitQuestRuns],
      callbacks: [...player.unsupportedCallbacks, ...questDocument.startup.unimplemented],
      notes: [...player.limitations, 'The player seed applies only proven stat/inventory startup effects; quest state is before OnGameStartUp.',
        'Xardas_FindXardas remains Open until the native startup order is implemented.', questDocument.startup.evidenceLimit] } };
}
