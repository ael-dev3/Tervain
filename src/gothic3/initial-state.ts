import questReceiptText from '../../assets/gothic3/dialogue/initial-quests-output.json?raw';
import { assetUrl } from './assets';
import type { NativeQuest, NativeSource } from './catalog';
import type { NativeCombatPerk, NativeCombatSkills, NativeKnowledge } from './combat';
import { gameplayResources } from './native-data';
import { NativeQuests, QuestStatus } from './quest-state';
import { loadBrowserInfoState } from './info-state';
import type { NativeInfoState } from './info-state';
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

interface NativeStartingInventoryDocument {
  schema: 'gothic3-native-starting-inventory-v1';
  schemaVersion: 1;
  sourceSeed: { url: string; sha256: string; bytes: number };
  scope: 'intrinsic-stack-state-before-external-inventory-observers-and-later-startup-equipping';
  stacks: readonly { index: number; templateName: string; templateGuid20: string; amount: number;
    quality: number; quickSlot: number | null; hotKeyUnsigned: number; activationCount: number; intrinsicLearned: boolean;
    stackType: number; linkedSlot: number; externalObserverEffects: string;
    templateSource: { path: string; sha256: string };
    learnedOperation: 'preserve' | 'setTrue'; startupOperation: { finalBoolean: boolean } }[];
}
interface NativeInventoryManifest {
  schema: 'gothic3-native-inventory-manifest-v1';
  schemaVersion: 1;
  startingInventory: 'starting-inventory.json';
  inputs: readonly { module: string; sha256: string }[];
  outputs: readonly ({ url: string } & ResourceReceipt)[];
}
export interface OriginalInitialState {
  scope: 'source-state-with-partial-player-startup-and-unapplied-quest-startup';
  player: InitializedPlayerSeed;
  clock: InitialWorldClock;
  questDocument: InitialQuestDocument;
  /** Seeded state only. The default host rejects all attempted effects. */
  quests: NativeQuests;
  /** Explicit fresh-world INI profile, before startup; not a restored save. */
  infos: NativeInfoState;
  view: { xp: number; learningPointsAttributes: number; learningPointsPerks: number; chapter: number;
    level: number; playerGameEvents: string[]; inventory: InitializedInventoryStack[]; equipment: InitializedEquipment[] };
  pendingStartup: { explicitQuestRuns: string[]; callbacks: unknown[]; notes: string[] };
}

const signedInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
const unsignedInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4294967295;
const guid20 = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function serializedEnumValue(value: unknown, enumName: string): number {
  if (value === null || typeof value !== 'object' || !('enum' in value) || !('version' in value) || !('value' in value) ||
      value.enum !== enumName || value.version !== 1 || !unsignedInteger(value.value)) {
    throw new Error('Unresolved serialized Hero NPC enum ' + enumName);
  }
  return value.value;
}

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
  if (!unsignedInteger(player.serialized.npc.Level) || !unsignedInteger(player.serialized.npc.LevelMax) ||
      !unsignedInteger(player.serialized.npc.StatusEffects)) {
    throw new Error('Unresolved original player NPC combat fields');
  }
  serializedEnumValue(player.serialized.npc.Species, 'gESpecies');
  serializedEnumValue(player.serialized.npc.Type, 'gENPCType');
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

export interface OriginalPlayerProgressSeed {
  /** Full validated source record used to build a mutable Hero inventory. */
  readonly initializedPlayer: InitializedPlayerSeed;
  readonly source: { readonly path: string; readonly sha256: string };
  readonly inventorySource: { readonly path: string; readonly sha256: string };
  readonly inventory: readonly { readonly index: number; readonly templateName: string; readonly templateGuid20: string;
    readonly amount: number; readonly quality: number; readonly quickSlot: number | null; readonly hotKeyUnsigned: number;
    readonly learned: boolean; readonly activationCount: number;
    readonly templateSource: { readonly path: string; readonly sha256: string } }[];
  /** Only skills whose fresh-stack and startup operations prove inactivity are
   * exposed as known. A present skill item alone does not imply activation. */
  readonly combatSkills: NativeCombatSkills;
  /** Source-decoded pre-start fields used to construct the Hero combat actor. */
  readonly npcCombatProfile: {
    readonly id: string;
    readonly name: string;
    readonly rawLevel: number;
    readonly rawLevelMax: number;
    readonly species: number;
    readonly npcType: number;
    readonly politicalAlignment: number;
    readonly statusEffects: number;
    readonly source: { readonly path: string; readonly sha256: string };
  };
  readonly xp: number;
  readonly lpAttribs: number;
  readonly level: number;
  readonly learnPerkActive:
    | { readonly status: 'known'; readonly value: boolean; readonly source: string }
    | { readonly status: 'unknown'; readonly reason: string };
}

const COMBAT_SKILL_STACKS: readonly { readonly perk: NativeCombatPerk; readonly item: string; readonly index: number }[] = [
  { perk: 'Perk_1H_2', item: 'It_Perk_1H_2', index: 94 },
  { perk: 'Perk_1H_3', item: 'It_Perk_1H_3', index: 95 },
  { perk: 'Perk_OrcSlayer', item: 'It_Perk_Orcslayer', index: 98 },
  { perk: 'Perk_Shield_2', item: 'It_Perk_Shield_2', index: 106 },
  { perk: 'Perk_LightArmor', item: 'It_Perk_LightArmor', index: 74 },
  { perk: 'Perk_HeavyArmor', item: 'It_Perk_HeavyArmor', index: 92 },
  { perk: 'Perk_Learn', item: 'It_Perk_Learn', index: 75 },
];

function sourceBackedInitialCombatSkills(
  initialized: InitializedPlayerSeed,
  starting: NativeStartingInventoryDocument,
  inventory: OriginalPlayerProgressSeed['inventory'],
  inventorySource: OriginalPlayerProgressSeed['inventorySource'],
): NativeCombatSkills {
  const skills: Partial<Record<NativeCombatPerk, NativeKnowledge<boolean>>> = {};
  for (const profile of COMBAT_SKILL_STACKS) {
    const seed = initialized.inventory.stacks[profile.index];
    const stack = starting.stacks[profile.index];
    const runtime = inventory[profile.index];
    if (!seed || !stack || !runtime || seed.index !== profile.index || stack.index !== profile.index ||
        runtime.index !== profile.index || seed.templateName !== profile.item || stack.templateName !== profile.item ||
        runtime.templateName !== profile.item || seed.templateGuid20 !== stack.templateGuid20 ||
        runtime.templateGuid20 !== stack.templateGuid20 || stack.activationCount !== 0 ||
        seed.nativeNewStackDefaultLearned !== false || stack.intrinsicLearned !== false ||
        stack.learnedOperation !== 'preserve' || stack.startupOperation.finalBoolean !== false || runtime.learned !== false) {
      skills[profile.perk] = Object.freeze({ status: 'unknown',
        reason: `The new-game ${profile.item} stack does not prove an inactive combat skill.` });
      continue;
    }
    const source = stack.templateSource;
    if (!source || typeof source.path !== 'string' || typeof source.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(source.sha256)) {
      skills[profile.perk] = Object.freeze({ status: 'unknown', reason: `The ${profile.item} source receipt is unavailable.` });
      continue;
    }
    const rawDefinition = initialized.templateDefinitions[stack.templateGuid20];
    const definition = rawDefinition && typeof rawDefinition === 'object'
      ? rawDefinition as { name?: unknown; source?: { path?: unknown; sha256?: unknown } } : null;
    if (!definition || definition.name !== profile.item || definition.source?.path !== source.path ||
        definition.source?.sha256 !== source.sha256) {
      skills[profile.perk] = Object.freeze({ status: 'unknown',
        reason: `The ${profile.item} source differs from its initialized template definition.` });
      continue;
    }
    skills[profile.perk] = Object.freeze({ status: 'known', value: false,
      source: `${inventorySource.path}@${inventorySource.sha256}#stacks[${profile.index}]:${source.path}@${source.sha256};fresh Learned=false;ActivationCount=0` });
  }
  return Object.freeze(skills);
}

/** Read only the hash-checked startup record needed to seed Hero progression.
 * This remains serialized pre-OnGameStartUp state, not an activated live NPC. */
export async function loadOriginalPlayerProgressSeed(): Promise<OriginalPlayerProgressSeed> {
  const manifest = await gameplayResources.manifest();
  const path = manifest.initial.initializedPlayer;
  if (typeof path !== 'string' || path.length === 0) throw new Error('Original initialized Hero source path is unavailable.');
  const receipt = manifest.outputs.find((entry) => entry.path === path);
  if (!receipt || !hash(receipt.sha256)) throw new Error('Original initialized Hero source receipt is unavailable.');
  const player = await gameplayResources.read<InitializedPlayerSeed>(path);
  validatePlayer(player);
  const learnStacks = player.inventory.stacks.filter((stack) => stack.templateName === 'It_Perk_Learn');
  if (learnStacks.length !== 1 || learnStacks[0]?.index !== 75) throw new Error('Original Perk_Learn inventory stack identity differs.');
  const inventoryResponse = await fetch(assetUrl('inventory/manifest.json'), { cache: 'no-cache' });
  if (!inventoryResponse.ok) throw new Error('Native starting-inventory manifest HTTP ' + inventoryResponse.status);
  const inventoryManifest = await inventoryResponse.json() as NativeInventoryManifest;
  const expectedInputs = new Map([
    ['Game', 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f'],
    ['Script', '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08'],
    ['SharedBase', '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'],
  ]);
  if (inventoryManifest.schema !== 'gothic3-native-inventory-manifest-v1' || inventoryManifest.schemaVersion !== 1 ||
      inventoryManifest.startingInventory !== 'starting-inventory.json' || inventoryManifest.inputs.length !== expectedInputs.size ||
      inventoryManifest.inputs.some((input) => expectedInputs.get(input.module) !== input.sha256)) {
    throw new Error('Native starting-inventory evidence profile differs from the installed Hero source build.');
  }
  const startingReceipt = inventoryManifest.outputs.find((output) => output.url === inventoryManifest.startingInventory);
  if (!startingReceipt) throw new Error('Hash-checked starting-inventory output receipt is unavailable.');
  const startingInventory = await readNativeResource<NativeStartingInventoryDocument>(
    'inventory/' + inventoryManifest.startingInventory, startingReceipt);
  const learnStack = startingInventory.stacks.find((stack) => stack.templateName === 'It_Perk_Learn');
  const initializedLearnStack = learnStacks[0]!;
  const startup = initializedLearnStack.startupOperation as { finalBoolean?: unknown } | undefined;
  if (startingInventory.schema !== 'gothic3-native-starting-inventory-v1' || startingInventory.schemaVersion !== 1 ||
      startingInventory.scope !== 'intrinsic-stack-state-before-external-inventory-observers-and-later-startup-equipping' ||
      startingInventory.sourceSeed.sha256 !== receipt.sha256 || startingInventory.sourceSeed.bytes !== receipt.bytes ||
      startingInventory.stacks.length !== 121 || !learnStack || learnStack.index !== 75 ||
      learnStack.activationCount !== 0 || learnStack.intrinsicLearned !== false || learnStack.learnedOperation !== 'preserve' ||
      learnStack.startupOperation.finalBoolean !== false || initializedLearnStack.nativeNewStackDefaultLearned !== false ||
      initializedLearnStack.learned !== null || initializedLearnStack.learnedOperation !== 'preserve' || startup?.finalBoolean !== false) {
    throw new Error('Original Perk_Learn stack state cannot be proven from the empty-list startup and inventory receipts.');
  }
  const inventory = startingInventory.stacks.map((stack, index) => {
    const initialized = player.inventory.stacks[index];
    if (!initialized || stack.index !== index || initialized.index !== index ||
        stack.templateName !== initialized.templateName || stack.templateGuid20 !== initialized.templateGuid20 ||
        stack.amount !== initialized.amount || stack.quality !== initialized.quality ||
        stack.quickSlot !== initialized.quickSlot || stack.hotKeyUnsigned !== initialized.hotKeyUnsigned ||
        stack.intrinsicLearned !== (initialized.learnedOperation === 'setTrue') ||
        stack.activationCount !== 0 || stack.stackType !== 0 || stack.linkedSlot !== 0 ||
        stack.externalObserverEffects !== 'requires-complete-runtime-observer-registry') {
      throw new Error('Original starting inventory facts differ from initialized player stack ' + index + '.');
    }
    return Object.freeze({ index, templateName: stack.templateName, templateGuid20: stack.templateGuid20,
      amount: stack.amount, quality: stack.quality, quickSlot: stack.quickSlot, learned: stack.intrinsicLearned,
      hotKeyUnsigned: stack.hotKeyUnsigned, activationCount: stack.activationCount,
      templateSource: Object.freeze({ path: stack.templateSource.path, sha256: stack.templateSource.sha256 }) });
  });
  if (inventory.length !== 121 || new Set(inventory.map((stack) => stack.templateName)).size !== inventory.length) {
    throw new Error('Original starting inventory does not have 121 uniquely named source stacks.');
  }
  const learnPerkActive = Object.freeze({ status: 'known' as const,
    value: learnStack.intrinsicLearned || learnStack.activationCount > 0,
    source: 'inventory/starting-inventory.json#stacks[75]+Game:201ae890+Script_Game:100628c0' });
  const combatSkills = sourceBackedInitialCombatSkills(player, startingInventory, inventory,
    { path: 'inventory/' + inventoryManifest.startingInventory, sha256: startingReceipt.sha256 });
  const serializedNpc = player.serialized.npc;
  const npcCombatProfile = Object.freeze({ id: player.player.guid, name: player.player.name,
    rawLevel: serializedNpc.Level as number, rawLevelMax: serializedNpc.LevelMax as number,
    species: serializedEnumValue(serializedNpc.Species, 'gESpecies'),
    npcType: serializedEnumValue(serializedNpc.Type, 'gENPCType'),
    politicalAlignment: serializedEnumValue(serializedNpc.PoliticalAlignment, 'gEPoliticalAlignment'),
    statusEffects: serializedNpc.StatusEffects as number,
    source: Object.freeze({ path: player.player.source.path, sha256: player.player.source.sha256 }),
  });
  return Object.freeze({ initializedPlayer: player, source: Object.freeze({ path, sha256: receipt.sha256 }),
    inventorySource: Object.freeze({ path: 'inventory/' + inventoryManifest.startingInventory, sha256: startingReceipt.sha256 }),
    inventory: Object.freeze(inventory), combatSkills, npcCombatProfile, xp: player.memory.XP,
    lpAttribs: player.memory.LPAttribs, level: player.serialized.npc.Level as number, learnPerkActive: Object.freeze(learnPerkActive) });
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
  const [sourcePlayer, sourceClock, definitions, sourceQuests, infos] = await Promise.all([
    gameplayResources.read<InitializedPlayerSeed>(playerPath), gameplayResources.read<InitialWorldClock>(clockPath),
    gameplayResources.read<NativeQuest[]>(questPath), readNativeResource<InitialQuestDocument>('dialogue/' + receipt.output.path, receipt.output),
    loadBrowserInfoState(),
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
  return { scope: 'source-state-with-partial-player-startup-and-unapplied-quest-startup', player, clock, questDocument, quests, infos,
    view: { xp: player.memory.XP, learningPointsAttributes: player.memory.LPAttribs, learningPointsPerks: player.memory.LPPerks,
      chapter: player.memory.Chapter, level: player.serialized.npc.Level as number,
      playerGameEvents: [...player.memory.PlayerKnows.items], inventory: player.inventory.stacks, equipment: player.inventory.equipment },
    pendingStartup: { explicitQuestRuns: [...questDocument.startup.explicitQuestRuns],
      callbacks: [...player.unsupportedCallbacks, ...questDocument.startup.unimplemented],
      notes: [...player.limitations, 'The player seed applies only proven stat/inventory startup effects; quest state is before OnGameStartUp.',
        'Xardas_FindXardas remains Open until the native startup order is implemented.', questDocument.startup.evidenceLimit] } };
}
