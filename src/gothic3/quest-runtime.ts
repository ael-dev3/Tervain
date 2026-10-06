/** Browser session quest state, seeded from the original new-world records.
 * The audited OnGameStartUp RunQuest is applied after seeding. This does not
 * replace the other Script_Game startup callbacks or native quest services. */
import questReceiptText from '../../assets/gothic3/dialogue/initial-quests-output.json?raw';
import { gameplayResources } from './native-data';
import type { NativeQuest } from './catalog';
import { QuestStatus, NativeQuests, nativeQuestSuccessEffects } from './quest-state';
import type { NativeClock, QuestEffect, QuestState } from './quest-state';
import { readNativeResource } from './resource';
import { loadOriginalWorldClock, monotonicClockMilliseconds } from './world-clock';
import type { NativeCalendar, NativeClockProcess, NativeWorldClock } from './world-clock';
import { planNativeGiveXp, planNativeGiveXpSequence } from './combat';
import type { NativeGiveXpPlan, NativePlayerProgress } from './combat';
import { loadOriginalPlayerProgressSeed } from './initial-state';
import type { OriginalPlayerProgressSeed } from './initial-state';
import { NativeGameEvents } from './game-events';
import { NativeArdeaActorDialogState } from './actor-dialogue-state';
import type { SourceArdeaActor } from './actor-dialogue-state';
import type { NativeValue } from './dialogue';
import type { NativeHeroPlayerMemory } from './hero-property-runtime';
import { loadBrowserInfoState } from './info-state';
import type { InfoProviderId, NativeInfoState } from './info-state';

interface NativeQuestSessionSources {
  readonly initialQuestStates: string;
  readonly questDefinitions: string;
  readonly worldClock: string;
  readonly ardeaPeople?: string;
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
  /** Current source-backed Dialog.TradeEnabled flags in the Ardea session. */
  readonly tradeEnabledArdeaActors?: readonly string[];
  /** Current source-backed Dialog.PartyEnabled and TeachEnabled flags. */
  readonly partyEnabledArdeaActors?: readonly string[];
  readonly teachEnabledArdeaActors?: readonly string[];
  /** Source-backed GiveXP calls replayed into Hero PlayerMemory and gCNPC_PS. */
  readonly heroProgress?: { readonly xp: number; readonly level: number; readonly lpAttribs: number;
    readonly awards: readonly number[] };
  /** Quest success rewards retained in Hero PoliticalFame and attribute storage. */
  readonly heroQuestRewards?: NativeHeroQuestRewardState;
  /** Current Hero HP state, restored through the original PlayerMemory setters. */
  readonly heroVitals?: NativeHeroVitals;
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
  ardeaActors: NativeArdeaActorDialogState;
  heroProgress: OriginalPlayerProgressSeed;
  sources: Omit<NativeQuestSessionSources, 'heroPlayerMemory'>;
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
      !value.counters.every((counter) => Number.isInteger(counter) && counter >= 0 && counter <= 0x7fffffff) ||
      !Array.isArray(value.logKeys) || !value.logKeys.every((key) => typeof key === 'string')) return false;
  if (value.startedAt !== null && (!record(value.startedAt) || !uint32(value.startedAt.years) ||
      !uint32(value.startedAt.days) || !uint32(value.startedAt.hours))) return false;
  if (value.logPairs !== undefined && (!Array.isArray(value.logPairs) || !value.logPairs.every((pair) =>
      record(pair) && typeof pair.version === 'number' && Number.isInteger(pair.version) && pair.version >= 0 && pair.version <= 0xffff &&
      typeof pair.speakerKey === 'string' && typeof pair.textKey === 'string'))) return false;
  return true;
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
  return { definitions, initial, clock, ardeaActors: new NativeArdeaActorDialogState(ardeaPeople), heroProgress,
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
  private heroAwardHistory: number[] = [];

  private constructor(readonly definitions: readonly NativeQuest[], readonly clock: NativeWorldClock,
    private readonly sources: NativeQuestSessionSources, initialGameEvents: readonly string[], infoState: NativeInfoState,
    actorDialogs: NativeArdeaActorDialogState, private readonly player: NativeHeroPlayerMemory,
    private readonly heroProgressSeed: OriginalPlayerProgressSeed, awardHistory: readonly number[] = []) {
    this.heroAwardHistory = [...awardHistory];
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
  static async newGame(player: NativeHeroPlayerMemory): Promise<NativeQuestRuntime> {
    const [source, infoState] = await Promise.all([loadQuestSourceBundle(), loadBrowserInfoState()]);
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
    const runtimeSources: NativeQuestSessionSources = { ...source.sources, heroPlayerMemory: player.source.sha256,
      heroNpcProperties: player.npcSource.sha256, infoProvider: infoState.providerId };
    const runtime = new NativeQuestRuntime(definitions, clock, runtimeSources, player.gameEvents, infoState,
      source.ardeaActors, player, heroProgress);
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
  static async restore(raw: unknown, player: NativeHeroPlayerMemory): Promise<NativeQuestRuntime> {
    if (!record(raw) || raw.schema !== 'gothic3-quest-session-save-v1' || !record(raw.sources) ||
        !record(raw.clock) || !record(raw.quests)) throw new Error('Unsupported Gothic 3 browser save.');
    const [source, infoState] = await Promise.all([loadQuestSourceBundle(), loadBrowserInfoState()]);
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
    let restoredAwardHistory: number[] = [];
    if (raw.heroProgress !== undefined) {
      if (!record(raw.heroProgress) || !nonnegativeInt32(raw.heroProgress.xp) ||
          !nonnegativeInt32(raw.heroProgress.level) || !nonnegativeInt32(raw.heroProgress.lpAttribs))
        throw new Error('Browser save has invalid Hero progress values.');
      const initialProgress: NativePlayerProgress = { xp: heroProgress.xp, level: heroProgress.level,
        lp: heroProgress.lpAttribs, learnPerkActive: heroProgress.learnPerkActive };
      if (raw.heroProgress.awards !== undefined) {
        if (!Array.isArray(raw.heroProgress.awards) || !raw.heroProgress.awards.every(nonnegativeInt32)) {
          throw new Error('Browser save has invalid native GiveXP award history.');
        }
        const replay = planNativeGiveXpSequence(initialProgress, raw.heroProgress.awards as number[]);
        if (replay.status === 'unsupported') throw new Error('Saved Hero progression cannot be replayed: ' + replay.reason);
        const final = replay.value.progress;
        if (final.xp !== raw.heroProgress.xp || final.level !== raw.heroProgress.level || final.lp !== raw.heroProgress.lpAttribs) {
          throw new Error('Saved Hero progress differs from its source-backed GiveXP history.');
        }
        restoredHeroProgress = { xp: final.xp, level: final.level, lpAttribs: final.lp };
        restoredAwardHistory = [...raw.heroProgress.awards as number[]];
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
    const runtimeSources: NativeQuestSessionSources = { ...source.sources, heroPlayerMemory: player.source.sha256,
      heroNpcProperties: player.npcSource.sha256, infoProvider: infoState.providerId };
    const runtime = new NativeQuestRuntime(source.definitions, source.clock, runtimeSources, savedEvents, infoState,
      source.ardeaActors, player, heroProgress, restoredAwardHistory);
    if (raw.talkedToArdeaActors !== undefined) runtime.actorDialogs.restoreTalkedToPlayerIds(raw.talkedToArdeaActors as string[]);
    if (raw.tradeEnabledArdeaActors !== undefined) runtime.actorDialogs.restoreTradeEnabledIds(raw.tradeEnabledArdeaActors as string[]);
    if (raw.partyEnabledArdeaActors !== undefined) runtime.actorDialogs.restoreEnabledDialogActorIds('PartyEnabled', raw.partyEnabledArdeaActors as string[]);
    if (raw.teachEnabledArdeaActors !== undefined) runtime.actorDialogs.restoreEnabledDialogActorIds('TeachEnabled', raw.teachEnabledArdeaActors as string[]);
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

  /** Original source-seeded stack amount for current dialogue predicates.
   * This is an immutable startup snapshot until inventory mutation is connected. */
  heroItemStackAmount(entity: { readonly id: string; readonly name: string }, templateName: string): NativeValue<number | null> {
    if (entity.id !== 'PC_Hero' || entity.name !== 'PC_Hero') {
      return { known: false, reason: 'Only the hash-checked PC_Hero starting inventory is connected to dialogue predicates.' };
    }
    if (!templateName) return { known: false, reason: 'Native conditional item template name is empty.' };
    const matching = this.heroProgressSeed.inventory.filter((stack) => stack.templateName === templateName);
    if (matching.length > 1) return { known: false, reason: 'Native starting inventory contains an ambiguous template name: ' + templateName };
    return { known: true, value: matching[0]?.amount ?? null };
  }

  heroInventoryStacks(): readonly OriginalPlayerProgressSeed['inventory'][number][] {
    return this.heroProgressSeed.inventory.map((stack) => ({ ...stack }));
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
    for (const listener of this.listeners) listener();
    return { known: true, value: plan.value };
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
      tradeEnabledArdeaActors: this.actorDialogs.currentTradeEnabledIds(),
      partyEnabledArdeaActors: this.actorDialogs.currentEnabledDialogActorIds('PartyEnabled'),
      teachEnabledArdeaActors: this.actorDialogs.currentEnabledDialogActorIds('TeachEnabled'),
      heroProgress: { xp: this.player.memory.getXP(), level: this.player.npc.values.Level as number,
        lpAttribs: this.player.memory.getLPAttribs(), awards: [...this.heroAwardHistory] },
      heroQuestRewards: this.heroQuestRewardState(),
      heroVitals: readHeroVitals(this.player) };
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
