/** Browser session quest state, seeded from the original new-world records.
 * The audited OnGameStartUp RunQuest is applied after seeding. This does not
 * replace the other Script_Game startup callbacks or native quest services. */
import questReceiptText from '../../assets/gothic3/dialogue/initial-quests-output.json?raw';
import { gameplayResources } from './native-data';
import type { NativeInfo, NativeQuest } from './catalog';
import { QuestStatus, NativeQuests, nativeQuestSuccessEffects } from './quest-state';
import type { NativeClock, NativeNpcKilledResult, NativeQuestAreaEnteredResult, QuestEffect, QuestState } from './quest-state';
import { readNativeResource } from './resource';
import { loadOriginalWorldClock, monotonicClockMilliseconds } from './world-clock';
import type { NativeCalendar, NativeClockProcess, NativeWorldClock } from './world-clock';
import { planNativeGiveXp, planNativeGiveXpSequence } from './combat';
import type { NativeCombatSkills, NativeDefeatEffect, NativeGiveXpPlan, NativePlayerProgress } from './combat';
import { loadOriginalPlayerProgressSeed } from './initial-state';
import type { OriginalPlayerProgressSeed } from './initial-state';
import { NativeGameEvents } from './game-events';
import { loadSceneActorDialogSources, NativeArdeaActorDialogState } from './actor-dialogue-state';
import type { SceneActorDialogSources, SourceArdeaActor } from './actor-dialogue-state';
import type { ScenePerson } from './types';
import type { NativeValue } from './dialogue';
import type { NativeHeroPlayerMemory } from './hero-property-runtime';
import { loadBrowserInfoState } from './info-state';
import type { InfoProviderId, NativeInfoState } from './info-state';
import { NativeWorldData, sourceProperty } from './native-data';
import { createNativeStartingInventory, inventoryTemplatesFromSeed, NativeInventory } from './inventory';
import type { InventoryTemplate, NativeInventorySnapshot } from './inventory';
import { loadNativeInventoryTemplate } from './npc-combat-runtime';
import type { NativeGeneratedPickpocketStack } from './native-treasure-sets';

interface NativeQuestSessionSources {
  readonly initialQuestStates: string;
  readonly questDefinitions: string;
  readonly worldClock: string;
  readonly ardeaPeople?: string;
  /** Source hashes and exact identities of the visible Ardea actors. */
  readonly sceneActors?: string;
  readonly heroPlayerMemory?: string;
  readonly heroNpcProperties?: string;
  readonly infoProvider?: InfoProviderId;
  /** Source initialized-player record used to seed retained Hero progression state. */
  readonly initializedPlayer?: string;
  /** Hash-checked intrinsic stack facts used while inventory writes remain disconnected. */
  readonly initialInventory?: string;
}

interface InitialQuestRow extends QuestState { id: string }
interface InitialQuestDocument {
  schema: 'gothic3-initial-quests-v1';
  scope: 'original-world-state-before-OnGameStartUp';
  questCount: number;
  quests: InitialQuestRow[];
  startup: { explicitQuestRuns: string[]; applied: boolean; unimplemented: string[] };
}

interface InitialQuestReceipt {
  schema: 'gothic3-initial-quests-output-v1';
  output: { path: 'initial-quests.json'; bytes: number; sha256: string };
  questCount: number;
}

export type NativeNpcXpScalar =
  | { readonly type: 'setPlayerXp'; readonly value: number; readonly delta: number }
  | { readonly type: 'setPlayerLevel'; readonly value: number }
  | { readonly type: 'setPlayerLp'; readonly value: number; readonly delta: 10 | 1 };
export interface NativeNpcXpScalarPrefix {
  readonly schema: 'gothic3-native-npc-xp-scalar-prefix-v1';
  readonly requestedAmount: number;
  readonly scalars: readonly NativeNpcXpScalar[];
}
export type NativeHeroProgressAward = number | NativeNpcXpScalarPrefix;

export interface NativeQuestSessionSave {
  readonly schema: 'gothic3-quest-session-save-v1';
  readonly sources: NativeQuestSessionSources;
  readonly clock: { readonly years: number; readonly days: number; readonly seconds: number };
  readonly quests: Readonly<Record<string, QuestState>>;
  /** Optional only for migration from sessions saved before this service existed. */
  readonly gameEvents?: readonly string[];
  /** Optional only for migration from sessions saved before native dialogue execution. */
  readonly givenInfoIds?: readonly string[];
  /** Positive TalkedToPlayer flags from ended browser InfoManager sessions. */
  readonly talkedToArdeaActors?: readonly string[];
  /** Current source-backed Dialog.PickedPocket flags in the Ardea session. */
  readonly pickedPocketArdeaActors?: readonly string[];
  /** Current source-backed Dialog.TradeEnabled flags in the Ardea session. */
  readonly tradeEnabledArdeaActors?: readonly string[];
  /** Current source-backed Dialog.PartyEnabled and TeachEnabled flags. */
  readonly partyEnabledArdeaActors?: readonly string[];
  readonly teachEnabledArdeaActors?: readonly string[];
  /** Source-backed GiveXP calls replayed into Hero PlayerMemory and gCNPC_PS. */
  readonly heroProgress?: { readonly xp: number; readonly level: number; readonly lpAttribs: number;
    readonly awards: readonly NativeHeroProgressAward[] };
  /** Quest success rewards retained in Hero PoliticalFame and attribute storage. */
  readonly heroQuestRewards?: NativeHeroQuestRewardState;
  /** Current Hero HP state, restored through the original PlayerMemory setters. */
  readonly heroVitals?: NativeHeroVitals;
  /** Legacy browser consumable overlay; restored into intrinsic inventory once. New saves use an empty list. */
  readonly consumedItems?: readonly { readonly templateGuid20: string; readonly amount: number }[];
  /** Mutable Hero stack state, including source-resolved items received from NPCs. */
  readonly heroInventory?: NativeInventorySnapshot;
}

export interface NativeHeroQuestRewardState {
  readonly politicalFame: readonly number[];
  readonly attributeBaseValues: Readonly<Record<string, number>>;
}

export interface NativeHeroVitals {
  readonly hitPoints: number;
  readonly hitPointsMax: number;
}

interface QuestSourceBundle {
  definitions: NativeQuest[];
  initial: InitialQuestDocument;
  clock: NativeWorldClock;
  ardeaActors: readonly SourceArdeaActor[];
  heroProgress: OriginalPlayerProgressSeed;
  sources: Omit<NativeQuestSessionSources, 'heroPlayerMemory'>;
}

interface LoadedActorDialogState {
  readonly state: NativeArdeaActorDialogState;
  readonly sceneActors: string | null;
  readonly legacyActorIds: ReadonlySet<string>;
  readonly preBanditScene: { readonly identity: string; readonly actorIds: ReadonlySet<string> } | null;
}

/** The sole audited scene expansion: the three original Jack_KillBandits targets
 * added to the existing 67 actors. Their source file was already in that scene. */
const JACK_BANDIT_SCENE_SOURCE = Object.freeze({
  archive: 'Projects_compiled.p00',
  path: 'G3_World_01/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}/SysDyn_{9A103CC2-4190-4DB3-9618-0419E5445AAD}.lrentdat',
  sha256: '28f7273b3d54415b84445651a3dfa962c1ff158e9183deba81ba47e4d5d57938',
});
const JACK_BANDIT_SCENE_ACTORS = Object.freeze([
  { id: '0c3ad5c499a37e479901ef8b1a19877900000000', name: 'Ardea_OutNovice_01', entityIndex: 22138 },
  { id: 'ef1adbed209ec647b20ebc9fc989642500000000', name: 'Ardea_OutNovice_02', entityIndex: 22141 },
  { id: '81630a69bab9c44b9df46b76df0ac7b100000000', name: 'Ardea_OutNovice_03', entityIndex: 22144 },
]);

function sceneActorIdentity(source: SceneActorDialogSources, actors = source.actors): string {
  return JSON.stringify({
    files: source.sourceFiles,
    actors: actors.map((actor) => [actor.guid.toLowerCase(), actor.name]).sort(([a], [b]) =>
      String(a).localeCompare(String(b))),
  });
}

async function loadActorDialogState(source: QuestSourceBundle, people?: readonly ScenePerson[]): Promise<LoadedActorDialogState> {
  const merged = new Map(source.ardeaActors.map((actor) => [actor.guid.toLowerCase(), actor]));
  const legacyActorIds = new Set(merged.keys());
  let sceneActors: SceneActorDialogSources | null = null;
  if (people) {
    sceneActors = await loadSceneActorDialogSources(people);
    for (const actor of sceneActors.actors) {
      const id = actor.guid.toLowerCase();
      const prior = merged.get(id);
      if (prior && prior.name !== actor.name) throw new Error('Scene actor name differs from the initial source record: ' + actor.name);
      merged.set(id, actor);
    }
  }
  const identity = sceneActors ? sceneActorIdentity(sceneActors) : null;
  let preBanditScene: LoadedActorDialogState['preBanditScene'] = null;
  if (people && sceneActors?.actors.length === 70 && sceneActors.sourceFiles.some((file) =>
    file.archive === JACK_BANDIT_SCENE_SOURCE.archive && file.path === JACK_BANDIT_SCENE_SOURCE.path &&
    file.sha256 === JACK_BANDIT_SCENE_SOURCE.sha256) && JACK_BANDIT_SCENE_ACTORS.every((target) =>
    people.some((person) => person.id.toLowerCase() === target.id && person.name === target.name &&
      person.source === `${JACK_BANDIT_SCENE_SOURCE.archive} :: ${JACK_BANDIT_SCENE_SOURCE.path} # entity ${target.entityIndex}`))) {
    const addedIds = new Set(JACK_BANDIT_SCENE_ACTORS.map((actor) => actor.id));
    const previousActors = sceneActors.actors.filter((actor) => !addedIds.has(actor.guid.toLowerCase()));
    // Retain the complete old file receipts and exact ID/name list. No general
    // subset migration is allowed for renamed, removed or unrelated new actors.
    preBanditScene = { identity: sceneActorIdentity(sceneActors, previousActors),
      actorIds: new Set([...legacyActorIds, ...previousActors.map((actor) => actor.guid.toLowerCase())]) };
  }
  return { state: new NativeArdeaActorDialogState([...merged.values()]), sceneActors: identity, legacyActorIds, preBanditScene };
}

function sourceQuestReceipt(): InitialQuestReceipt {
  const receipt = JSON.parse(questReceiptText) as Partial<InitialQuestReceipt>;
  if (receipt.schema !== 'gothic3-initial-quests-output-v1' || receipt.questCount !== 641 ||
      receipt.output?.path !== 'initial-quests.json' || receipt.output.bytes !== 475077 ||
      receipt.output.sha256 !== '1ad6940998af6119a833ef27f5e0ea46687610e52bec2640d21ad4635b81e518') {
    throw new Error('Original initial-quest source receipt differs.');
  }
  return receipt as InitialQuestReceipt;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function uint32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0xffffffff;
}

function nonnegativeInt32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0x7fffffff;
}

function signedInt32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= -0x80000000 && (value as number) <= 0x7fffffff;
}

function sourceRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readUniqueSourceProperty(entity: import('./native-data').NativeEntityRecord,
  setName: string, property: string): unknown {
  const result = sourceProperty(entity, setName, property);
  if (result.kind !== 'found') throw new Error(result.kind === 'missing'
    ? result.reason : `Source property ${setName}.${property} is ambiguous.`);
  return result.value;
}

function nativeEnum(value: unknown, label: string): number {
  const raw = sourceRecord(value) ? value.value : value;
  if (!signedInt32(raw)) throw new Error(`Source ${label} is not a resolved native signed integer.`);
  return raw;
}

function restoreConsumedItems(value: unknown, seed: OriginalPlayerProgressSeed): Map<string, number> {
  if (value === undefined) return new Map();
  if (!Array.isArray(value)) throw new Error('Browser save has invalid consumed-item state.');
  const amounts = new Map<string, number>();
  for (const entry of value) {
    if (!sourceRecord(entry) || typeof entry.templateGuid20 !== 'string' ||
        !/^[a-f0-9]{40}$/.test(entry.templateGuid20) || !nonnegativeInt32(entry.amount) || entry.amount < 1 ||
        amounts.has(entry.templateGuid20)) throw new Error('Browser save has an invalid consumed-item entry.');
    const stack = seed.inventory.find((candidate) => candidate.templateGuid20 === entry.templateGuid20);
    if (!stack || entry.amount > stack.amount) throw new Error('Browser save consumes more items than the source starting stack.');
    amounts.set(entry.templateGuid20, entry.amount);
  }
  return amounts;
}

function newHeroInventory(seed: OriginalPlayerProgressSeed): NativeInventory {
  const starting = createNativeStartingInventory(seed.initializedPlayer, { observers: [] });
  if (starting.status !== 'applied' || starting.completedAssurances !== seed.inventory.length) {
    throw new Error('Original Hero starting inventory could not be replayed: ' + (starting.reason ?? starting.status));
  }
  return starting.inventory;
}

function restoreHeroInventory(value: unknown, seed: OriginalPlayerProgressSeed): NativeInventory {
  if (value === undefined) return newHeroInventory(seed);
  if (!record(value)) throw new Error('Browser save has invalid Hero inventory state.');
  try {
    return NativeInventory.fromSnapshot(inventoryTemplatesFromSeed(seed.initializedPlayer),
      value as unknown as NativeInventorySnapshot, { observers: [] });
  } catch (error) {
    throw new Error('Browser save Hero inventory could not be restored: ' + (error instanceof Error ? error.message : String(error)));
  }
}

function questRewardAttributeTags(definitions: readonly NativeQuest[]): string[] {
  return [...new Set(definitions.map((quest) => quest.rewards.attribute?.id ?? '').filter(Boolean))].sort();
}

function readHeroVitals(player: NativeHeroPlayerMemory): NativeHeroVitals {
  const hitPoints = player.memory.getValue('HP');
  const hitPointsMax = player.memory.getMaximum('HP');
  if (!nonnegativeInt32(hitPoints) || !nonnegativeInt32(hitPointsMax) || hitPointsMax < 1 || hitPoints > hitPointsMax) {
    throw new Error('Retained Hero HP attribute is outside the initialized native range.');
  }
  return Object.freeze({ hitPoints, hitPointsMax });
}

function validSavedQuestState(value: unknown): value is QuestState {
  if (!record(value) || !Number.isInteger(value.status) || (value.status as number) < 0 ||
      (value.status as number) > 7 || !Array.isArray(value.counters) ||
      !value.counters.every((counter) => Number.isInteger(counter) && counter >= 0 && counter <= 0xffffffff) ||
      !Array.isArray(value.logKeys) || !value.logKeys.every((key) => typeof key === 'string')) return false;
  if (value.startedAt !== null && (!record(value.startedAt) || !uint32(value.startedAt.years) ||
      !uint32(value.startedAt.days) || !uint32(value.startedAt.hours))) return false;
  if (value.logPairs !== undefined && (!Array.isArray(value.logPairs) || !value.logPairs.every((pair) =>
      record(pair) && typeof pair.version === 'number' && Number.isInteger(pair.version) && pair.version >= 0 && pair.version <= 0xffff &&
      typeof pair.speakerKey === 'string' && typeof pair.textKey === 'string'))) return false;
  return true;
}

function npcXpScalars(before: NativePlayerProgress, plan: NativeGiveXpPlan): NativeNpcXpScalar[] {
  const scalars: NativeNpcXpScalar[] = [{ type: 'setPlayerXp', value: plan.progress.xp, delta: plan.awardedAmount }];
  if (plan.progress.levelUp) {
    scalars.push({ type: 'setPlayerLevel', value: plan.progress.level },
      { type: 'setPlayerLp', value: before.lp + 10, delta: 10 });
    if (plan.progress.lp - before.lp === 11) scalars.push({ type: 'setPlayerLp', value: plan.progress.lp, delta: 1 });
  }
  return scalars;
}

function applyNpcXpScalar(progress: NativePlayerProgress, scalar: NativeNpcXpScalar): NativePlayerProgress {
  return { ...progress, ...(scalar.type === 'setPlayerXp' ? { xp: scalar.value }
    : scalar.type === 'setPlayerLevel' ? { level: scalar.value } : { lp: scalar.value }) };
}

function sameNpcXpScalar(value: unknown, expected: NativeNpcXpScalar): value is NativeNpcXpScalar {
  return record(value) && Object.keys(value).sort().join(',') === Object.keys(expected).sort().join(',') &&
    Object.entries(expected).every(([key, operand]) => value[key] === operand);
}

/** A prefix retains exactly the ordered property writes that happened. It does
 * not resume GiveXP, invoke observers, or replay the corresponding NPC event. */
function replayHeroAwardHistory(initial: NativePlayerProgress, awards: unknown): {
  progress: NativePlayerProgress; history: NativeHeroProgressAward[];
} {
  if (!Array.isArray(awards) || awards.length > 327_680) throw new Error('Browser save has invalid native GiveXP award history.');
  let progress = initial;
  const history: NativeHeroProgressAward[] = [];
  for (const award of awards) {
    if (nonnegativeInt32(award)) {
      const plan = planNativeGiveXp(progress, award);
      if (plan.status === 'unsupported') throw new Error('Saved Hero progression cannot be replayed: ' + plan.reason);
      progress = { ...progress, ...plan.value.progress };
      history.push(award);
      continue;
    }
    if (!record(award) || Object.keys(award).sort().join(',') !== 'requestedAmount,scalars,schema' ||
        award.schema !== 'gothic3-native-npc-xp-scalar-prefix-v1' || !nonnegativeInt32(award.requestedAmount) ||
        award.requestedAmount === 0 || !Array.isArray(award.scalars)) {
      throw new Error('Browser save has invalid NPC XP scalar prefix.');
    }
    const plan = planNativeGiveXp(progress, award.requestedAmount);
    if (plan.status === 'unsupported') throw new Error('Saved NPC XP prefix cannot be replayed: ' + plan.reason);
    const expected = npcXpScalars(progress, plan.value);
    // Completed writes use the existing numeric receipt. Objects identify a
    // genuinely incomplete scalar prefix, including an XP-only level-up.
    if (award.scalars.length < 1 || award.scalars.length >= expected.length ||
        !award.scalars.every((scalar, index) => sameNpcXpScalar(scalar, expected[index]!))) {
      throw new Error('Saved NPC XP scalars are not an exact incomplete native prefix.');
    }
    const scalars = award.scalars as NativeNpcXpScalar[];
    for (const scalar of scalars) progress = applyNpcXpScalar(progress, scalar);
    history.push({ schema: 'gothic3-native-npc-xp-scalar-prefix-v1', requestedAmount: award.requestedAmount,
      scalars: structuredClone(scalars) });
  }
  return { progress, history };
}

async function loadQuestSourceBundle(): Promise<QuestSourceBundle> {
  const receipt = sourceQuestReceipt();
  const manifest = await gameplayResources.manifest();
  const questPath = manifest.runtime?.quests ?? manifest.urls.runtimeQuests ?? manifest.urls.quests;
  const worldClockPath = manifest.initial.worldClock;
  const ardeaPeoplePath = manifest.initial.people;
  if (typeof worldClockPath !== 'string' || typeof ardeaPeoplePath !== 'string') {
    throw new Error('Original world clock or Ardea actor source path is missing from the gameplay manifest.');
  }
  const questReceipt = manifest.outputs.find((entry) => entry.path === questPath);
  const clockReceipt = manifest.outputs.find((entry) => entry.path === worldClockPath);
  const ardeaPeopleReceipt = manifest.outputs.find((entry) => entry.path === ardeaPeoplePath);
  if (!questReceipt || !clockReceipt || !ardeaPeopleReceipt || manifest.counts.quests !== receipt.questCount) {
    throw new Error('Original quest, clock or Ardea actor source receipts are missing from the gameplay manifest.');
  }
  const [definitions, initial, clock, ardeaPeople, heroProgress] = await Promise.all([
    gameplayResources.read<NativeQuest[]>(questPath),
    readNativeResource<InitialQuestDocument>('dialogue/' + receipt.output.path, receipt.output),
    loadOriginalWorldClock(monotonicClockMilliseconds(() => performance.now()), 24),
    gameplayResources.read<SourceArdeaActor[]>(ardeaPeoplePath),
    loadOriginalPlayerProgressSeed(),
  ]);
  if (!Array.isArray(definitions) || definitions.length !== receipt.questCount || !Array.isArray(ardeaPeople) ||
      initial.schema !== 'gothic3-initial-quests-v1' || initial.scope !== 'original-world-state-before-OnGameStartUp' ||
      initial.questCount !== receipt.questCount || initial.quests.length !== receipt.questCount ||
      initial.startup.applied !== false || !initial.startup.explicitQuestRuns.includes('Xardas_FindXardas') ||
      !initial.startup.unimplemented.length) {
    throw new Error('Original quest definitions, fresh-world seed and startup receipt do not agree.');
  }
  return { definitions, initial, clock, ardeaActors: Object.freeze(ardeaPeople), heroProgress,
    sources: { initialQuestStates: receipt.output.sha256, questDefinitions: questReceipt.sha256,
      worldClock: clockReceipt.sha256, ardeaPeople: ardeaPeopleReceipt.sha256, initializedPlayer: heroProgress.source.sha256,
      initialInventory: heroProgress.inventorySource.sha256 } };
}

function seedQuestStates(runtime: NativeQuestRuntime, rows: readonly InitialQuestRow[] | Readonly<Record<string, QuestState>>): void {
  const definitions = new Set(runtime.definitions.map((quest) => quest.id));
  const entries = Array.isArray(rows) ? rows.map((state) => [state.id, state] as const) : Object.entries(rows);
  if (entries.length !== definitions.size) throw new Error('Quest save does not contain every source state.');
  const seen = new Set<string>();
  for (const [id, state] of entries) {
    if (!definitions.has(id) || seen.has(id) || !validSavedQuestState(state)) {
      throw new Error('Quest save has an invalid, duplicate or unknown state: ' + id);
    }
    seen.add(id);
    runtime.quests.seed(id, state);
  }
  if (seen.size !== definitions.size) throw new Error('Quest save does not match the source definitions.');
}

export interface QuestSessionRow {
  readonly definition: NativeQuest;
  readonly state: Readonly<QuestState>;
}

/** One mutable quest manager and original-seeded game clock for the browser session. */
export class NativeQuestRuntime {
  readonly quests: NativeQuests;
  readonly gameEvents: NativeGameEvents;
  readonly infoState: NativeInfoState;
  readonly actorDialogs: NativeArdeaActorDialogState;
  private readonly listeners = new Set<() => void>();
  private tickFailure: string | null = null;
  private heroAwardHistory: NativeHeroProgressAward[] = [];
  private pendingNpcXp: { readonly historyIndex: number; readonly expected: readonly NativeNpcXpScalar[];
    progress: NativePlayerProgress } | null = null;
  private readonly world: NativeWorldData;
  readonly heroInventory: NativeInventory;

  private constructor(readonly definitions: readonly NativeQuest[], readonly clock: NativeWorldClock,
    private readonly sources: NativeQuestSessionSources, initialGameEvents: readonly string[], infoState: NativeInfoState,
    actorDialogs: NativeArdeaActorDialogState, private readonly player: NativeHeroPlayerMemory,
    private readonly heroProgressSeed: OriginalPlayerProgressSeed, heroInventory: NativeInventory, awardHistory: readonly NativeHeroProgressAward[] = [],
    consumedItems: ReadonlyMap<string, number> = new Map(), world: NativeWorldData = new NativeWorldData()) {
    this.heroAwardHistory = structuredClone([...awardHistory]);
    this.heroInventory = heroInventory;
    // Older saves retained the full inventory and subtracted this overlay only
    // for display. Migrate it once so later transfers and item use see the same
    // amount as the UI. New saves contain the reduced stacks and no overlay.
    for (const [guid, amount] of consumedItems) {
      const source = heroProgressSeed.inventory.find((stack) => stack.templateGuid20 === guid);
      if (!source) throw new Error('Legacy consumed item has no source starting stack.');
      const index = heroInventory.findStackIndex(guid, 1, source.quality >>> 0);
      const consumed = heroInventory.consumeBrowserStack(index, amount);
      if (consumed.status !== 'applied') throw new Error('Legacy consumed-item overlay could not be migrated: ' + consumed.reason);
    }
    this.world = world;
    this.quests = new NativeQuests(definitions, {
      clock: () => clock.questClock(),
      apply: (effects) => this.applyQuestEffects(effects),
      changed: () => { for (const listener of this.listeners) listener(); },
    });
    this.gameEvents = new NativeGameEvents(initialGameEvents);
    this.infoState = infoState;
    this.actorDialogs = actorDialogs;
  }

  /** Load verified source records and apply the one audited startup quest run. */
  static async newGame(player: NativeHeroPlayerMemory, scenePeople?: readonly ScenePerson[]): Promise<NativeQuestRuntime> {
    const [source, infoState] = await Promise.all([loadQuestSourceBundle(), loadBrowserInfoState()]);
    const actorDialogs = await loadActorDialogState(source, scenePeople);
    const { definitions, initial, clock, heroProgress } = source;
    if (player.memory.getXP() !== heroProgress.xp || player.memory.getLPAttribs() !== heroProgress.lpAttribs ||
        player.npc.values.Level !== heroProgress.level) {
      throw new Error('Live Hero PlayerMemory does not match the verified new-game progress seed.');
    }
    const clockState = clock.snapshot();
    if (clockState.calendar.year !== 0 || clockState.calendar.day !== 0 || clockState.calendar.hour !== 12 ||
        clockState.calendar.minute !== 0 || clockState.calendar.second !== 0 || clockState.adjustment.factor !== 12 ||
        clockState.adjustment.secondsPerDay !== 86400 || clockState.adjustment.daysPerYear !== 365 || !clockState.paused) {
      throw new Error('Original new-world clock seed is not the audited noon/factor-12 state.');
    }
    const runtimeSources: NativeQuestSessionSources = { ...source.sources,
      ...(actorDialogs.sceneActors ? { sceneActors: actorDialogs.sceneActors } : {}), heroPlayerMemory: player.source.sha256,
      heroNpcProperties: player.npcSource.sha256, infoProvider: infoState.providerId };
    const runtime = new NativeQuestRuntime(definitions, clock, runtimeSources, player.gameEvents, infoState,
      actorDialogs.state, player, heroProgress, newHeroInventory(heroProgress));
    seedQuestStates(runtime, initial.quests);

    const firstQuest = runtime.quests.run('Xardas_FindXardas');
    if (firstQuest.kind !== 'applied' || runtime.quests.state('Xardas_FindXardas')?.status !== QuestStatus.Running ||
        runtime.quests.state('Xardas_FindXardas')?.startedAt?.hours !== 12) {
      throw new Error('The source-audited Xardas_FindXardas startup transition did not apply at noon.');
    }
    const adjusted = clock.adjust({ factor: 12, secondsPerDay: 86400, daysPerYear: 365 });
    if (adjusted.kind !== 'applied') throw new Error('Original session clock setup failed: ' + adjusted.reason);
    const resumed = clock.resume();
    if (resumed.kind !== 'applied') throw new Error('Original session clock resume failed: ' + resumed.reason);
    return runtime;
  }

  /** Restore only a browser save tied to these exact source receipts. */
  static async restore(raw: unknown, player: NativeHeroPlayerMemory,
    scenePeople?: readonly ScenePerson[]): Promise<NativeQuestRuntime> {
    if (!record(raw) || raw.schema !== 'gothic3-quest-session-save-v1' || !record(raw.sources) ||
        !record(raw.clock) || !record(raw.quests)) throw new Error('Unsupported Gothic 3 browser save.');
    const [source, infoState] = await Promise.all([loadQuestSourceBundle(), loadBrowserInfoState()]);
    const actorDialogs = await loadActorDialogState(source, scenePeople);
    if (raw.sources.initialQuestStates !== source.sources.initialQuestStates ||
        raw.sources.questDefinitions !== source.sources.questDefinitions || raw.sources.worldClock !== source.sources.worldClock) {
      throw new Error('Browser save belongs to different Gothic 3 source data.');
    }
    if (raw.sources.initialInventory !== undefined && raw.sources.initialInventory !== source.sources.initialInventory) {
      throw new Error('Browser save belongs to different Gothic 3 starting inventory data.');
    }
    if (raw.sources.heroPlayerMemory !== undefined && raw.sources.heroPlayerMemory !== player.source.sha256) {
      throw new Error('Browser save belongs to different Gothic 3 Hero PlayerMemory data.');
    }
    if (raw.sources.heroNpcProperties !== undefined && raw.sources.heroNpcProperties !== player.npcSource.sha256) {
      throw new Error('Browser save belongs to different Gothic 3 Hero NPC property data.');
    }
    if (raw.sources.ardeaPeople !== undefined && raw.sources.ardeaPeople !== source.sources.ardeaPeople) {
      throw new Error('Browser save belongs to different Ardea NPC source properties.');
    }
    const migratedPreBanditScene = typeof raw.sources.sceneActors === 'string' &&
      raw.sources.sceneActors === actorDialogs.preBanditScene?.identity;
    if (raw.sources.sceneActors !== undefined &&
        (typeof raw.sources.sceneActors !== 'string' ||
          (raw.sources.sceneActors !== actorDialogs.sceneActors && !migratedPreBanditScene))) {
      throw new Error('Browser save belongs to different Ardea scene actor records.');
    }
    if (raw.sources.initializedPlayer !== undefined && raw.sources.initializedPlayer !== source.sources.initializedPlayer) {
      throw new Error('Browser save belongs to different initialized Hero progress data.');
    }
    if (raw.sources.infoProvider !== undefined && raw.sources.infoProvider !== infoState.providerId) {
      throw new Error('Browser save belongs to a different Gothic 3 InfoManager source provider.');
    }
    if (!uint32(raw.clock.years) || !uint32(raw.clock.days) || typeof raw.clock.seconds !== 'number' ||
        !Number.isFinite(raw.clock.seconds) || raw.clock.seconds < 0 || raw.clock.seconds >= 86400) {
      throw new Error('Browser save has an invalid world clock.');
    }
    const savedEvents = raw.gameEvents === undefined ? player.gameEvents : raw.gameEvents;
    if (!Array.isArray(savedEvents) || !savedEvents.every((event) => typeof event === 'string' && !event.includes('\0'))) {
      throw new Error('Browser save has invalid PlayerKnows game events.');
    }
    if (raw.givenInfoIds !== undefined) {
      if (!Array.isArray(raw.givenInfoIds)) throw new Error('Browser save has invalid InfoManager Given IDs.');
      infoState.restoreGivenIds(raw.givenInfoIds);
    }
    if (raw.talkedToArdeaActors !== undefined &&
        (!Array.isArray(raw.talkedToArdeaActors) || !raw.talkedToArdeaActors.every((id) => typeof id === 'string'))) {
      throw new Error('Browser save has invalid Ardea NPC dialogue flags.');
    }
    if (raw.pickedPocketArdeaActors !== undefined &&
        (!Array.isArray(raw.pickedPocketArdeaActors) || !raw.pickedPocketArdeaActors.every((id) => typeof id === 'string'))) {
      throw new Error('Browser save has invalid Ardea NPC PickedPocket flags.');
    }
    if (raw.tradeEnabledArdeaActors !== undefined &&
        (!Array.isArray(raw.tradeEnabledArdeaActors) || !raw.tradeEnabledArdeaActors.every((id) => typeof id === 'string'))) {
      throw new Error('Browser save has invalid Ardea NPC trade flags.');
    }
    if (raw.partyEnabledArdeaActors !== undefined &&
        (!Array.isArray(raw.partyEnabledArdeaActors) || !raw.partyEnabledArdeaActors.every((id) => typeof id === 'string'))) {
      throw new Error('Browser save has invalid Ardea NPC party flags.');
    }
    if (raw.teachEnabledArdeaActors !== undefined &&
        (!Array.isArray(raw.teachEnabledArdeaActors) || !raw.teachEnabledArdeaActors.every((id) => typeof id === 'string'))) {
      throw new Error('Browser save has invalid Ardea NPC teaching flags.');
    }
    if (migratedPreBanditScene) {
      for (const field of ['talkedToArdeaActors', 'pickedPocketArdeaActors', 'tradeEnabledArdeaActors',
        'partyEnabledArdeaActors', 'teachEnabledArdeaActors'] as const) {
        const ids = raw[field] as string[] | undefined;
        if (ids?.some((id) => !actorDialogs.preBanditScene!.actorIds.has(id.toLowerCase()))) {
          throw new Error('Browser save contains dialogue flags outside its original Ardea scene actor records.');
        }
      }
    }
    const { heroProgress } = source;
    if (player.memory.getXP() !== heroProgress.xp || player.memory.getLPAttribs() !== heroProgress.lpAttribs ||
        player.npc.values.Level !== heroProgress.level) {
      throw new Error('Live Hero PlayerMemory/NPC properties do not match the verified restore seed.');
    }
    let restoredHeroProgress = { xp: heroProgress.xp, level: heroProgress.level, lpAttribs: heroProgress.lpAttribs };
    let restoredHeroVitals: NativeHeroVitals | null = null;
    if (raw.heroVitals !== undefined) {
      if (!record(raw.heroVitals) || !nonnegativeInt32(raw.heroVitals.hitPoints) ||
          !nonnegativeInt32(raw.heroVitals.hitPointsMax) || raw.heroVitals.hitPointsMax < 1 ||
          raw.heroVitals.hitPoints > raw.heroVitals.hitPointsMax) {
        throw new Error('Browser save has invalid Hero hit point state.');
      }
      restoredHeroVitals = Object.freeze({ hitPoints: raw.heroVitals.hitPoints,
        hitPointsMax: raw.heroVitals.hitPointsMax });
    }
    let restoredAwardHistory: NativeHeroProgressAward[] = [];
    if (raw.heroProgress !== undefined) {
      if (!record(raw.heroProgress) || !nonnegativeInt32(raw.heroProgress.xp) ||
          !nonnegativeInt32(raw.heroProgress.level) || !nonnegativeInt32(raw.heroProgress.lpAttribs))
        throw new Error('Browser save has invalid Hero progress values.');
      const initialProgress: NativePlayerProgress = { xp: heroProgress.xp, level: heroProgress.level,
        lp: heroProgress.lpAttribs, learnPerkActive: heroProgress.learnPerkActive };
      if (raw.heroProgress.awards !== undefined) {
        const replay = replayHeroAwardHistory(initialProgress, raw.heroProgress.awards);
        const final = replay.progress;
        if (final.xp !== raw.heroProgress.xp || final.level !== raw.heroProgress.level || final.lp !== raw.heroProgress.lpAttribs) {
          throw new Error('Saved Hero progress differs from its source-backed GiveXP history.');
        }
        restoredHeroProgress = { xp: final.xp, level: final.level, lpAttribs: final.lp };
        restoredAwardHistory = replay.history;
      } else {
        // Earlier sessions only accepted below-threshold awards, so their
        // aggregate XP delta can be replayed as one equivalent call.
        if (raw.heroProgress.level !== heroProgress.level || raw.heroProgress.lpAttribs !== heroProgress.lpAttribs) {
          throw new Error('Legacy Hero save contains unsupported level or learning-point changes.');
        }
        const delta = raw.heroProgress.xp - heroProgress.xp;
        if (delta < 0 || delta % 5 !== 0) throw new Error('Saved Hero XP cannot be derived from supported native GiveXP awards.');
        const plan = planNativeGiveXp(initialProgress, delta / 5);
        if (plan.status === 'unsupported' || plan.value.progress.levelUp || plan.value.progress.xp !== raw.heroProgress.xp) {
          throw new Error(plan.status === 'unsupported' ? plan.reason : 'Legacy Hero save crosses an unsupported level-up.');
        }
        restoredHeroProgress = { xp: plan.value.progress.xp, level: plan.value.progress.level, lpAttribs: plan.value.progress.lp };
        if (delta > 0) restoredAwardHistory = [delta / 5];
      }
    }
    let restoredHeroQuestRewards: NativeHeroQuestRewardState | null = null;
    if (raw.heroQuestRewards !== undefined) {
      const expectedTags = questRewardAttributeTags(source.definitions);
      if (!record(raw.heroQuestRewards)) throw new Error('Browser save has invalid Hero quest reward state.');
      const rewards = raw.heroQuestRewards;
      const attributeBaseValues = rewards.attributeBaseValues;
      if (!Array.isArray(rewards.politicalFame) || rewards.politicalFame.length !== 9 ||
          !rewards.politicalFame.every(signedInt32) || !record(attributeBaseValues) ||
          Object.keys(attributeBaseValues).sort().join('\0') !== expectedTags.join('\0') ||
          !expectedTags.every((tag) => signedInt32(attributeBaseValues[tag]))) {
        throw new Error('Browser save has invalid Hero quest reward state.');
      }
      restoredHeroQuestRewards = {
        politicalFame: [...rewards.politicalFame],
        attributeBaseValues: Object.fromEntries(expectedTags.map((tag) => [tag, attributeBaseValues[tag] as number])),
      };
    }
    const runtimeSources: NativeQuestSessionSources = { ...source.sources,
      ...(actorDialogs.sceneActors ? { sceneActors: actorDialogs.sceneActors } : {}), heroPlayerMemory: player.source.sha256,
      heroNpcProperties: player.npcSource.sha256, infoProvider: infoState.providerId };
    const consumedItems = restoreConsumedItems(raw.consumedItems, heroProgress);
    const heroInventory = restoreHeroInventory(raw.heroInventory, heroProgress);
    const runtime = new NativeQuestRuntime(source.definitions, source.clock, runtimeSources, savedEvents, infoState,
      actorDialogs.state, player, heroProgress, heroInventory, restoredAwardHistory, consumedItems);
    if (raw.talkedToArdeaActors !== undefined) runtime.actorDialogs.restoreTalkedToPlayerIds(raw.talkedToArdeaActors as string[]);
    const legacyActorScope = migratedPreBanditScene ? actorDialogs.preBanditScene!.actorIds
      : raw.sources.sceneActors === undefined && actorDialogs.sceneActors ? actorDialogs.legacyActorIds : undefined;
    if (raw.pickedPocketArdeaActors !== undefined) runtime.actorDialogs.restorePickedPocketIds(
      raw.pickedPocketArdeaActors as string[], legacyActorScope);
    if (raw.tradeEnabledArdeaActors !== undefined) runtime.actorDialogs.restoreEnabledDialogActorIds('TradeEnabled',
      raw.tradeEnabledArdeaActors as string[], legacyActorScope);
    if (raw.partyEnabledArdeaActors !== undefined) runtime.actorDialogs.restoreEnabledDialogActorIds('PartyEnabled',
      raw.partyEnabledArdeaActors as string[], legacyActorScope);
    if (raw.teachEnabledArdeaActors !== undefined) runtime.actorDialogs.restoreEnabledDialogActorIds('TeachEnabled',
      raw.teachEnabledArdeaActors as string[], legacyActorScope);
    seedQuestStates(runtime, raw.quests as Record<string, QuestState>);
    const set = runtime.clock.set({ years: raw.clock.years, days: raw.clock.days, seconds: raw.clock.seconds });
    if (set.kind !== 'applied') throw new Error('Saved world time cannot be restored: ' + set.reason);
    const adjusted = runtime.clock.adjust({ factor: 12, secondsPerDay: 86400, daysPerYear: 365 });
    if (adjusted.kind !== 'applied') throw new Error('Saved world clock setup failed: ' + adjusted.reason);
    const published = runtime.clock.process();
    if (published.kind !== 'applied') throw new Error('Saved world clock could not publish its calendar: ' + published.reason);
    const resumed = runtime.clock.resume();
    if (resumed.kind !== 'applied') throw new Error('Saved world clock could not resume: ' + resumed.reason);
    if (restoredHeroProgress.xp !== heroProgress.xp) {
      const restored = player.memory.setXP(restoredHeroProgress.xp);
      if (!restored.supported) throw new Error('Saved Hero XP could not be restored through the native PlayerMemory setter: ' + restored.reason);
    }
    if (restoredHeroProgress.level !== heroProgress.level) {
      const restored = player.npc.setLevel(restoredHeroProgress.level);
      if (!restored.known) throw new Error('Saved Hero level could not be restored through the retained Hero NPC property: ' + restored.reason);
    }
    if (restoredHeroProgress.lpAttribs !== heroProgress.lpAttribs) {
      const restored = player.memory.setLPAttribs(restoredHeroProgress.lpAttribs);
      if (!restored.supported) throw new Error('Saved Hero learning points could not be restored through PlayerMemory: ' + restored.reason);
    }
    if (restoredHeroVitals) {
      const maximum = player.memory.applyStartupStat('SetHitPointsMax', restoredHeroVitals.hitPointsMax);
      if (!maximum.supported) throw new Error('Saved Hero HP maximum could not be restored through PlayerMemory: ' + maximum.reason);
      const current = player.memory.applyStartupStat('SetHitPoints', restoredHeroVitals.hitPoints);
      if (!current.supported) throw new Error('Saved Hero HP could not be restored through PlayerMemory: ' + current.reason);
    }
    if (restoredHeroQuestRewards) {
      for (const [tag, value] of Object.entries(restoredHeroQuestRewards.attributeBaseValues)) {
        const restored = player.memory.setBaseValue(tag, value);
        if (!restored.supported || restored.nativeReturnValue !== true) {
          throw new Error('Saved Hero quest attribute could not be restored through PlayerMemory: ' + tag +
            (restored.supported ? '' : ' (' + restored.reason + ')'));
        }
      }
      for (const [alignment, value] of restoredHeroQuestRewards.politicalFame.entries()) {
        const restored = player.memory.setPoliticalFame(alignment, value);
        if (!restored.supported) throw new Error('Saved PoliticalFame could not be restored through PlayerMemory: ' + restored.reason);
      }
    }
    return runtime;
  }

  advance(): { readonly applied: true; readonly value: NativeClockProcess } | { readonly applied: false; readonly reason: string } {
    if (this.tickFailure) return { applied: false, reason: this.tickFailure };
    const tick = this.clock.process();
    if (tick.kind !== 'applied') {
      this.tickFailure = tick.reason;
      return { applied: false, reason: tick.reason };
    }
    return { applied: true, value: tick.value };
  }

  currentClock(): NativeClock { return this.clock.questClock(); }
  currentWorldCalendar(): NativeCalendar { return this.clock.calendar(); }
  clockError(): string | null { return this.tickFailure; }
  beginInfoManager(entity: { id: string; name: string }): NativeValue<true> { return this.actorDialogs.beginInfoManager(entity); }
  endInfoManager(entity: { id: string; name: string }): void { this.actorDialogs.endInfoManager(entity); }

  canAwardExperienceScript(requestedAmount: number): NativeValue<true> {
    return this.canAwardExperienceScripts([requestedAmount]);
  }

  /** Script_Game::SetHitPoints for the retained, valid Hero PlayerMemory path. */
  setHeroHitPoints(requested: number): NativeValue<number> {
    if (!Number.isInteger(requested) || requested < -0x80000000 || requested > 0x7fffffff) {
      return { known: false, reason: 'Native SetHitPoints requires a signed32-bit operand.' };
    }
    const result = this.player.memory.applyStartupStat('SetHitPoints', requested);
    if (!result.supported) return { known: false, reason: result.reason };
    try {
      const vitals = readHeroVitals(this.player);
      for (const listener of this.listeners) listener();
      return { known: true, value: vitals.hitPoints };
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  heroVitals(): NativeHeroVitals { return readHeroVitals(this.player); }

  /** Current source-seeded Hero stack amount for dialogue predicates. */
  heroItemStackAmount(entity: { readonly id: string; readonly name: string }, templateName: string): NativeValue<number | null> {
    if (entity.id !== 'PC_Hero' || entity.name !== 'PC_Hero') {
      return { known: false, reason: 'Only the hash-checked PC_Hero starting inventory is connected to dialogue predicates.' };
    }
    if (!templateName) return { known: false, reason: 'Native conditional item template name is empty.' };
    const matching = this.heroProgressSeed.inventory.filter((stack) => stack.templateName === templateName);
    if (matching.length > 1) return { known: false, reason: 'Native starting inventory contains an ambiguous template name: ' + templateName };
    const sourceStack = matching[0];
    const template = sourceStack ? this.heroInventory.template(sourceStack.templateGuid20) : this.heroInventory.templateByName(templateName);
    if (!template) return { known: true, value: null };
    const index = this.heroInventory.findStackIndex(template.guid20, 0, 0, -1);
    const stack = this.heroInventory.getStack(index);
    return { known: true, value: stack ? stack.amount : null };
  }

  heroInventoryStacks(): readonly OriginalPlayerProgressSeed['inventory'][number][] {
    const sourceStacks = new Map(this.heroProgressSeed.inventory.map((stack) => [stack.templateGuid20, stack]));
    return this.heroInventory.snapshot().stacks.map((stack) => {
      const template = this.heroInventory.template(stack.templateGuid20);
      const sourceSeed = sourceStacks.get(stack.templateGuid20);
      const source = sourceSeed?.templateSource ?? (template?.source && typeof template.source === 'object'
        ? template.source as { readonly path: string; readonly sha256: string } : null);
      if (!template || !source || typeof source.path !== 'string' || typeof source.sha256 !== 'string') {
        throw new Error('Hero inventory display needs a source-resolved template for ' + stack.templateName + '.');
      }
      return { index: stack.index, templateName: stack.templateName, templateGuid20: stack.templateGuid20,
        amount: stack.amount, quality: stack.quality,
        quickSlot: stack.quickSlot < 0 ? null : stack.quickSlot, hotKeyUnsigned: sourceSeed?.hotKeyUnsigned ?? 0,
        learned: stack.learned, activationCount: stack.activationCount,
        templateSource: { path: source.path, sha256: source.sha256 } };
    });
  }

  /** PlayerMemory::GetTheft reads the live THF attribute value. */
  heroTheft(): NativeValue<number> {
    const theft = this.player.memory.getAttribute('THF');
    if (!theft) return { known: false, reason: 'Hero PlayerMemory has no source-backed THF attribute.' };
    try { return { known: true, value: theft.getValue() }; }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }

  /** Apply the source-generated distribution-7 CreateItems arguments to the
   * retained Hero inventory after every selected template has been verified. */
  async receiveNativePickpocketLoot(stacks: readonly NativeGeneratedPickpocketStack[]): Promise<NativeValue<
    readonly { readonly templateName: string; readonly amount: number; readonly quality: number }[]>> {
    if (!stacks.length) return { known: true, value: Object.freeze([]) };
    const capability = this.heroInventory.capability();
    if (capability.status !== 'supported') return { known: false, reason: capability.reason };
    const requested = new Map<string, NativeGeneratedPickpocketStack>();
    for (const stack of stacks) {
      if (!/^[a-f0-9]{40}$/.test(stack.itemGuid20) || !stack.itemName ||
          !/^[a-f0-9]{64}$/.test(stack.itemSourceSha256) || !stack.itemSourcePath ||
          !Number.isInteger(stack.amount) || stack.amount < 1 || stack.amount > 0x7fffffff ||
          !Number.isInteger(stack.creationQuality) || stack.creationQuality < -0x80000000 ||
          stack.creationQuality > 0x7fffffff) {
        return { known: false, reason: 'Generated PickPocket stack arguments are outside the native domains.' };
      }
      const previous = requested.get(stack.itemGuid20);
      if (previous && (previous.itemName !== stack.itemName || previous.itemSourcePath !== stack.itemSourcePath ||
          previous.itemSourceSha256 !== stack.itemSourceSha256)) {
        return { known: false, reason: 'PickPocket loot gives one template GUID conflicting source identities.' };
      }
      requested.set(stack.itemGuid20, stack);
    }
    try {
      const templates = await Promise.all([...requested.values()].map((stack) => loadNativeInventoryTemplate(this.world,
        stack.itemGuid20, { name: stack.itemName, sourcePath: stack.itemSourcePath,
          sourceSha256: stack.itemSourceSha256 })));
      for (const template of templates) this.heroInventory.registerTemplate(template);
      const receipts: { templateName: string; amount: number; quality: number }[] = [];
      for (const stack of stacks) {
        const quality = stack.creationQuality >>> 0;
        const created = this.heroInventory.createItems(stack.itemGuid20, quality, stack.amount);
        if (created.status !== 'applied') {
          return { known: false, reason: 'PickPocket CreateItems stopped after ' + receipts.length + ' stack(s): ' + created.reason };
        }
        receipts.push({ templateName: stack.itemName, amount: stack.amount, quality });
      }
      this.inventoryChanged();
      return { known: true, value: Object.freeze(receipts.map((entry) => Object.freeze(entry))) };
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Prove that the exact transfer participants and template cannot reach a
   * source quest delivery counter before allowing the native notification to
   * be represented as absent. Potential matches stay unavailable. */
  canNotifyItemTransferWithoutQuestEffect(donorName: string, recipientName: string,
    template: InventoryTemplate): NativeValue<true> {
    if (!donorName || !recipientName || !template.name) {
      return { known: false, reason: 'Native item quest callback participants or template are unresolved.' };
    }
    const participants = new Set([donorName, recipientName]);
    const matches = this.definitions.filter((quest) => (quest.numericType === 0 || quest.numericType === 11) &&
      participants.has(quest.destination) && quest.deliveryTargets.some((target) => target.entity === template.name));
    if (matches.length) return { known: false, reason: 'Native item transfer may update quest delivery counters: ' +
      matches.map((quest) => quest.id).join(', ') };
    return { known: true, value: true };
  }

  sourceQuestDefinitionsSha256(): string { return this.sources.questDefinitions; }

  inventoryChanged(): void { for (const listener of this.listeners) listener(); }

  /** New-game skill flags from the same source inventory seed as Hero progress.
   * A learned skill has no browser training writer yet, so unresolved or later
   * mutable skill states are not inferred from item presence. */
  heroCombatSkills(): NativeCombatSkills { return this.heroProgressSeed.combatSkills; }

  /** Exact serialized PC_Hero profile plus its current retained NPC level. */
  heroNpcCombatProfile(): NativeValue<OriginalPlayerProgressSeed['npcCombatProfile']> {
    try {
      const currentLevel = this.player.npc.values.Level;
      if (!Number.isInteger(currentLevel) || (currentLevel as number) < 0 || (currentLevel as number) > 0xffffffff) {
        return { known: false, reason: 'The retained Hero NPC level is outside its native unsigned range.' };
      }
      return { known: true, value: Object.freeze({ ...this.heroProgressSeed.npcCombatProfile,
        rawLevel: currentLevel as number }) };
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Browser item-use slice backed by the original potion template and
   * PlayerMemory::ApplyMod. The native PS_QuickUse task, drink animation and
   * inventory observer callbacks remain separate integration work. */
  async useHealthPotion(): Promise<NativeValue<{ readonly hitPointsBefore: number; readonly hitPointsAfter: number;
    readonly amountRemaining: number }>> {
    const stacks = this.heroProgressSeed.inventory.filter((stack) => stack.templateName === 'It_Potion_Health');
    if (stacks.length !== 1) return { known: false, reason: 'The hash-checked Hero seed does not resolve one health-potion stack.' };
    const stack = stacks[0]!;
    if (this.heroInventory.findStackIndex(stack.templateGuid20) < 0) {
      return { known: false, reason: 'No health potions remain in the current Hero inventory.' };
    }
    try {
      const template = await this.world.templateByNameInSource('It_Potion_Health',
        'Items/Items/Items_Story/Potions_Story_It_Potion_Health.tple');
      if (template.kind !== 'found' || template.value.guid !== stack.templateGuid20 ||
          template.value.source?.sha256 !== '07bcebba29ed8178d3e733aac0bbfeea61a050300798eb69f964dbf7cb3c1c58') {
        return { known: false, reason: template.kind === 'found'
          ? 'Health-potion template identity or source hash differs.'
          : template.kind === 'missing' ? template.reason : 'Health-potion template name is ambiguous.' };
      }
      const entity = await this.world.template(template.value);
      if (entity.kind !== 'found' || entity.value.guid !== stack.templateGuid20) {
        return { known: false, reason: entity.kind === 'found' ? 'Health-potion payload identity differs.'
          : entity.kind === 'missing' ? entity.reason : 'Health-potion template payload is ambiguous.' };
      }
      const useType = nativeEnum(readUniqueSourceProperty(entity.value, 'gCInteraction_PS', 'UseType'), 'UseType');
      const tag = readUniqueSourceProperty(entity.value, 'gCItem_PS', 'ModAttrib1Tag');
      const operation = nativeEnum(readUniqueSourceProperty(entity.value, 'gCItem_PS', 'ModAttrib1Op'), 'ModAttrib1Op');
      const amount = nativeEnum(readUniqueSourceProperty(entity.value, 'gCItem_PS', 'ModAttrib1Value'), 'ModAttrib1Value');
      const scriptUse = readUniqueSourceProperty(entity.value, 'gCInteraction_PS', 'ScriptUseFunc');
      if (useType !== 16 || tag !== 'HP' || operation !== 2 || amount !== 50 || scriptUse !== '') {
        return { known: false, reason: 'Health-potion use properties differ from the audited HP +50% source record.' };
      }
      // Source reads above can yield while another use/transfer changes this
      // inventory. Resolve the current stack after the last await and preflight
      // its browser-owned reduction before applying the native HP modifier.
      const currentIndex = this.heroInventory.findStackIndex(stack.templateGuid20);
      const consumption = this.heroInventory.canConsumeBrowserStack(currentIndex, 1);
      if (consumption.status !== 'supported') return { known: false, reason: consumption.reason };
      const before = this.player.memory.getValue('HP');
      const maximum = this.player.memory.getMaximum('HP');
      const applied = this.player.memory.applyMod(tag, amount, operation);
      if (!applied.supported) return { known: false, reason: applied.reason };
      const after = this.player.memory.getValue('HP');
      if (after < before || after > maximum) return { known: false, reason: 'Native ApplyMod produced an unexpected Hero HP value.' };
      const consumed = this.heroInventory.consumeBrowserStack(currentIndex, 1);
      if (consumed.status !== 'applied') return { known: false,
        reason: 'The potion HP modifier applied, but browser inventory consumption stopped: ' + consumed.reason };
      const remaining = this.heroInventory.snapshot().stacks.filter((entry) => entry.templateGuid20 === stack.templateGuid20)
        .reduce((total, entry) => total + entry.amount, 0);
      for (const listener of this.listeners) listener();
      return { known: true, value: { hitPointsBefore: before, hitPointsAfter: after, amountRemaining: remaining } };
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  canAwardExperienceScripts(requestedAmounts: readonly number[]): NativeValue<true> {
    try {
      const plan = planNativeGiveXpSequence(this.playerProgress(), requestedAmounts);
      if (plan.status === 'unsupported') return { known: false, reason: plan.reason };
      return { known: true, value: true };
    } catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }

  awardExperienceScript(requestedAmount: number): NativeValue<NativeGiveXpPlan> {
    const capability = this.canAwardExperienceScript(requestedAmount);
    if (!capability.known) return capability;
    const plan = planNativeGiveXp(this.playerProgress(), requestedAmount);
    if (plan.status === 'unsupported') return { known: false, reason: plan.reason };
    const written = this.player.memory.setXP(plan.value.progress.xp);
    if (!written.supported) return { known: false,
      reason: 'Native PlayerMemory XP setter stopped' + (written.partial ? ' after partial work' : '') + ': ' + written.reason };
    if (plan.value.progress.levelUp) {
      const level = this.player.npc.setLevel(plan.value.progress.level);
      if (!level.known) return { known: false, reason: 'GiveXP stopped after XP while writing retained Hero NPC Level: ' + level.reason };
      const lp = this.player.memory.setLPAttribs(plan.value.progress.lp);
      if (!lp.supported) return { known: false, reason: 'GiveXP stopped after XP/Level while writing Hero LPAttribs: ' + lp.reason };
    }
    this.heroAwardHistory.push(requestedAmount);
    this.pendingNpcXp = null;
    for (const listener of this.listeners) listener();
    return { known: true, value: plan.value };
  }

  /** Read after the death task's quest event. A quest reward may already have
   * changed XP, level or skill bases during that synchronous callback. */
  nativePlayerProgress(): NativePlayerProgress { return this.playerProgress(); }

  /** Scalar portion of NPC GiveXP (Self=victim, Other=Hero). Its amount is
   * already calculated by the native defeat planner, unlike world GiveXP's
   * requested amount. Presentation and victim flags belong to the task host.
   * Every default NPC award is a multiple of five, so the existing save replay
   * stores the equivalent arithmetic operand or its ordered scalar prefix;
   * loading does not repeat a quest or death event. */
  applyNpcDefeatProgressEffect(effect: NativeDefeatEffect): NativeValue<void> {
    try {
      if (!['setPlayerXp', 'setPlayerLevel', 'setPlayerLp'].includes(effect.type)) {
        return { known: false, reason: 'NPC progress host received a non-scalar defeat effect.' };
      }
      if (!('playerId' in effect) || effect.playerId !== this.heroProgressSeed.npcCombatProfile.id) {
        return { known: false, reason: 'NPC defeat progress does not target the retained Hero.' };
      }
      if (effect.type === 'setPlayerXp') {
        if (!nonnegativeInt32(effect.delta) || effect.delta === 0 || effect.delta % 5 !== 0 ||
            effect.value !== this.player.memory.getXP() + effect.delta) {
          return { known: false, reason: 'NPC defeat XP is stale or outside the replayable native default-XP profile.' };
        }
        const before = this.playerProgress(), replay = planNativeGiveXp(before, effect.delta / 5);
        if (replay.status === 'unsupported') return { known: false, reason: replay.reason };
        if (replay.value.progress.xp !== effect.value) return { known: false, reason: 'NPC defeat XP replay differs.' };
        const result = this.player.memory.setXP(effect.value);
        if (this.player.memory.getXP() === effect.value) {
          const prefix: NativeNpcXpScalarPrefix = { schema: 'gothic3-native-npc-xp-scalar-prefix-v1',
            requestedAmount: effect.delta / 5, scalars: [] };
          this.heroAwardHistory.push(prefix);
          this.pendingNpcXp = { historyIndex: this.heroAwardHistory.length - 1,
            expected: npcXpScalars(before, replay.value), progress: before };
          this.recordNpcXpScalar({ type: 'setPlayerXp', value: effect.value, delta: effect.delta });
        }
        if (!result.supported) return { known: false, reason: result.reason };
      } else if (effect.type === 'setPlayerLevel') {
        const scalar: NativeNpcXpScalar = { type: 'setPlayerLevel', value: effect.value };
        this.requireNpcXpScalar(scalar);
        const result = this.player.npc.setLevel(effect.value);
        if (this.player.npc.values.Level === effect.value) this.recordNpcXpScalar(scalar);
        if (!result.known) return result;
      } else if (effect.type === 'setPlayerLp') {
        if (effect.delta !== 10 && effect.delta !== 1) return { known: false, reason: 'NPC defeat LP transition is stale.' };
        const scalar: NativeNpcXpScalar = { type: 'setPlayerLp', value: effect.value, delta: effect.delta };
        this.requireNpcXpScalar(scalar);
        const result = this.player.memory.setLPAttribs(effect.value);
        if (this.player.memory.getLPAttribs() === effect.value) this.recordNpcXpScalar(scalar);
        if (!result.supported) return { known: false, reason: result.reason };
      }
      for (const listener of this.listeners) listener();
      return { known: true, value: undefined };
    } catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }

  private requireNpcXpScalar(scalar: NativeNpcXpScalar): void {
    const pending = this.pendingNpcXp, live = this.playerProgress();
    const prefix = pending ? this.heroAwardHistory[pending.historyIndex] : undefined;
    if (!pending || typeof prefix !== 'object' || live.xp !== pending.progress.xp ||
        live.level !== pending.progress.level || live.lp !== pending.progress.lp ||
        !sameNpcXpScalar(scalar, pending.expected[prefix.scalars.length]!)) {
      throw new Error('NPC XP scalar is missing its active ordered prefix, out of order or stale.');
    }
  }

  private recordNpcXpScalar(scalar: NativeNpcXpScalar): void {
    const pending = this.pendingNpcXp;
    if (!pending) throw new Error('NPC XP scalar has no owned prefix.');
    const prefix = this.heroAwardHistory[pending.historyIndex];
    if (typeof prefix !== 'object' || !sameNpcXpScalar(scalar, pending.expected[prefix.scalars.length]!)) {
      throw new Error('NPC XP scalar is outside its expected ordered prefix.');
    }
    const scalars = [...prefix.scalars, scalar];
    pending.progress = applyNpcXpScalar(pending.progress, scalar);
    if (scalars.length === pending.expected.length) {
      this.heroAwardHistory[pending.historyIndex] = prefix.requestedAmount;
      this.pendingNpcXp = null;
    } else this.heroAwardHistory[pending.historyIndex] = { ...prefix, scalars };
  }

  canApplyQuestEffects(effects: readonly QuestEffect[]): NativeValue<true> {
    const experience: number[] = [];
    try {
      for (const effect of effects) {
        switch (effect.type) {
          case 'politicalFame': {
            if (!Number.isInteger(effect.alignment) || effect.alignment < 0 || effect.alignment >= 9 ||
                !Number.isInteger(effect.amount) || effect.amount <= 0 || effect.amount > 0x7fffffff) {
              return { known: false, reason: 'Native PoliticalFame reward alignment/amount is outside its supported range.' };
            }
            if (this.player.memory.politicalFameValues()[effect.alignment] === undefined) {
              return { known: false, reason: 'Native PoliticalFame array entry is unavailable.' };
            }
            break;
          }
          case 'attributeBase': {
            if (!effect.id || !Number.isInteger(effect.amount) || effect.amount < -0x80000000 || effect.amount > 0x7fffffff ||
                !this.player.memory.getAttribute(effect.id)) {
              return { known: false, reason: 'Native quest attribute reward does not resolve to a Hero PlayerMemory attribute.' };
            }
            if (!Number.isInteger(this.player.memory.getBaseValue(effect.id))) {
              return { known: false, reason: 'Native quest attribute base value is unavailable: ' + effect.id };
            }
            break;
          }
          case 'experienceScript': experience.push(effect.requestedAmount); break;
          default:
            return { known: false, reason: 'Native quest reward service is not connected: ' + effect.type };
        }
      }
      return experience.length === 0 ? { known: true, value: true } : this.canAwardExperienceScripts(experience);
    } catch (error) {
      return { known: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  canSucceedQuest(id: string, precedingExperienceAwards: readonly number[] = []): NativeValue<true> {
    const quest = this.definitions.find((definition) => definition.id === id);
    if (!quest) return { known: false, reason: 'Native quest definition is not in the loaded source: ' + id };
    if (quest.numericType === 5 || quest.numericType === 12) {
      return { known: false, reason: 'Arena quest status notifications are not connected: ' + id };
    }
    const planned = nativeQuestSuccessEffects(quest);
    if (!planned.supported) return { known: false, reason: planned.reason };
    const experience = planned.effects.filter((effect) => effect.type === 'experienceScript')
      .map((effect) => effect.requestedAmount);
    const otherEffects = planned.effects.filter((effect) => effect.type !== 'experienceScript');
    const preflight = this.canApplyQuestEffects(otherEffects);
    if (!preflight.known) return preflight;
    return experience.length === 0 && precedingExperienceAwards.length === 0
      ? { known: true, value: true }
      : this.canAwardExperienceScripts([...precedingExperienceAwards, ...experience]);
  }

  /** Preflight the bounded condition-8 OnDelivery callback before its first
   * Say line advances the native script index to one. */
  canDeliverFromInfo(info: NativeInfo, precedingExperienceAwards: readonly number[] = []): NativeValue<true> {
    if (info.conditionType !== 8 || !info.quest || !info.owner || !info.npc || info.npc !== info.owner) {
      return { known: false, reason: 'Native Info delivery identity is incomplete or inconsistent.' };
    }
    const definition = this.definitions.find((quest) => quest.id === info.quest);
    if (!definition) return { known: false, reason: 'Native delivery quest is not in the loaded source: ' + info.quest };
    if (definition.numericType !== 1 && definition.numericType !== 4) {
      return { known: false, reason: 'Native Info delivery supports only quest types 1/4.' };
    }
    if (definition.deliveryTargets.some((target) => target.amount === null || !Number.isInteger(target.amount) ||
        target.amount < 0 || target.amount > 0xffffffff)) {
      return { known: false, reason: 'Native quest delivery amount is unresolved: ' + info.quest };
    }
    const state = this.quests.state(info.quest);
    if (!state) return { known: false, reason: 'Native delivery quest state is not seeded: ' + info.quest };
    if (state.status !== QuestStatus.Running) {
      return { known: false, reason: 'Native Info delivery requires a Running quest.' };
    }
    const targetIndex = definition.deliveryTargets.findIndex((target) => target.entity === info.npc);
    if (targetIndex < 0) return { known: true, value: true };
    const completes = definition.deliveryTargets.every((target, index) => target.amount !== null &&
      (index === targetIndex ? (state.counters[index]! + 1) >>> 0 : state.counters[index]!) >= target.amount);
    return completes ? this.canSucceedQuest(info.quest, precedingExperienceAwards) : { known: true, value: true };
  }

  deliverFromInfo(info: NativeInfo, precedingExperienceAwards: readonly number[] = []): NativeValue<true> {
    const capability = this.canDeliverFromInfo(info, precedingExperienceAwards);
    if (!capability.known) return capability;
    const result = this.quests.deliverToEntity(info.quest, info.npc!);
    return result.kind === 'applied' ? { known: true, value: true }
      : { known: false, reason: result.reason };
  }

  /** Resolve all rewards before a browser lethal hit changes its actor. Native
   * OnNPCKilled checks completion after exact-name type-2/3/4 counter updates. */
  canRecordNpcKilled(entityName: string): NativeValue<true> {
    const plan = this.quests.planNpcKilled(entityName);
    if (plan.kind === 'unsupported') return { known: false, reason: plan.reason };
    return this.canApplyQuestEffects(plan.updates.flatMap((update) => update.effects));
  }

  /** Dispatches source counter updates and their native completion rewards. */
  recordNpcKilled(entityName: string): NativeNpcKilledResult {
    const capability = this.canRecordNpcKilled(entityName);
    if (!capability.known) return { kind: 'unsupported', reason: capability.reason };
    return this.quests.recordNpcKilled(entityName);
  }

  /** Route a source-resolved Hero area entry into the native quest manager. */
  enterArea(entityName: string, areaName: string): NativeQuestAreaEnteredResult {
    return this.quests.enterArea(entityName, areaName);
  }

  private heroQuestRewardState(): NativeHeroQuestRewardState {
    const attributeBaseValues: Record<string, number> = {};
    for (const tag of questRewardAttributeTags(this.definitions)) {
      if (!this.player.memory.getAttribute(tag)) throw new Error('Original quest reward attribute is unavailable: ' + tag);
      attributeBaseValues[tag] = this.player.memory.getBaseValue(tag);
    }
    return { politicalFame: [...this.player.memory.politicalFameValues()], attributeBaseValues };
  }

  saveData(): NativeQuestSessionSave {
    const time = this.clock.snapshot().timeAndDate;
    const quests: Record<string, QuestState> = {};
    for (const definition of this.definitions) {
      const state = this.quests.state(definition.id);
      if (!state) throw new Error('Cannot save missing quest state: ' + definition.id);
      quests[definition.id] = state;
    }
    return { schema: 'gothic3-quest-session-save-v1', sources: { ...this.sources },
      clock: { years: time.years, days: time.days, seconds: time.seconds }, quests,
      gameEvents: this.gameEvents.snapshot(), givenInfoIds: this.infoState.currentGivenIds(),
      talkedToArdeaActors: this.actorDialogs.currentTalkedToPlayerIds(),
      pickedPocketArdeaActors: this.actorDialogs.currentPickedPocketIds(),
      tradeEnabledArdeaActors: this.actorDialogs.currentTradeEnabledIds(),
      partyEnabledArdeaActors: this.actorDialogs.currentEnabledDialogActorIds('PartyEnabled'),
      teachEnabledArdeaActors: this.actorDialogs.currentEnabledDialogActorIds('TeachEnabled'),
      heroProgress: { xp: this.player.memory.getXP(), level: this.player.npc.values.Level as number,
        lpAttribs: this.player.memory.getLPAttribs(), awards: structuredClone(this.heroAwardHistory) },
      heroQuestRewards: this.heroQuestRewardState(),
      heroVitals: readHeroVitals(this.player),
      consumedItems: [],
      heroInventory: this.heroInventory.snapshot() };
  }

  private playerProgress(): NativePlayerProgress {
    return { xp: this.player.memory.getXP(), level: this.player.npc.values.Level as number,
      lp: this.player.memory.getLPAttribs(), learnPerkActive: this.heroProgressSeed.learnPerkActive };
  }

  private applyQuestEffects(effects: readonly QuestEffect[]): { applied: true } | { applied: false; reason: string } {
    if (effects.length === 0) return { applied: true };
    const preflight = this.canApplyQuestEffects(effects);
    if (!preflight.known) return { applied: false, reason: preflight.reason };
    for (const effect of effects) {
      if (effect.type === 'politicalFame') {
        const result = this.player.memory.addPoliticalFame(effect.alignment, effect.amount);
        if (!result.supported) return { applied: false, reason: 'PoliticalFame reward stopped: ' + result.reason };
      } else if (effect.type === 'attributeBase') {
        const base = this.player.memory.getBaseValue(effect.id);
        const result = this.player.memory.setBaseValue(effect.id, (base + effect.amount) | 0);
        if (!result.supported || result.nativeReturnValue !== true) {
          return { applied: false, reason: 'Attribute reward stopped for ' + effect.id +
            (result.supported ? '' : ': ' + result.reason) };
        }
      } else if (effect.type === 'experienceScript') {
        const result = this.awardExperienceScript(effect.requestedAmount);
        if (!result.known) return { applied: false, reason: result.reason };
      } else {
        return { applied: false, reason: 'Native quest reward service is not connected: ' + effect.type };
      }
    }
    return { applied: true };
  }

  rows(): QuestSessionRow[] {
    return this.definitions.map((definition) => {
      const state = this.quests.state(definition.id);
      if (!state) throw new Error('Seeded quest state disappeared: ' + definition.id);
      return { definition, state };
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export function nativeQuestStatusName(status: QuestStatus): string {
  return QuestStatus[status] ?? 'Unknown';
}
