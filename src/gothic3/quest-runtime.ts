/** Browser session quest state, seeded from the original new-world records.
 * The audited OnGameStartUp RunQuest is applied after seeding. This does not
 * replace the other Script_Game startup callbacks or native quest services. */
import questReceiptText from '../../assets/gothic3/dialogue/initial-quests-output.json?raw';
import { gameplayResources } from './native-data';
import type { NativeQuest } from './catalog';
import { QuestStatus, NativeQuests } from './quest-state';
import type { NativeClock, QuestState } from './quest-state';
import { readNativeResource } from './resource';
import { loadOriginalWorldClock, monotonicClockMilliseconds } from './world-clock';
import type { NativeCalendar, NativeClockProcess, NativeWorldClock } from './world-clock';
import { NativeGameEvents } from './game-events';
import type { NativeHeroPlayerMemory } from './hero-property-runtime';

interface NativeQuestSessionSources {
  readonly initialQuestStates: string;
  readonly questDefinitions: string;
  readonly worldClock: string;
  readonly heroPlayerMemory?: string;
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
}

interface QuestSourceBundle {
  definitions: NativeQuest[];
  initial: InitialQuestDocument;
  clock: NativeWorldClock;
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
  const questReceipt = manifest.outputs.find((entry) => entry.path === questPath);
  const clockReceipt = manifest.outputs.find((entry) => entry.path === worldClockPath);
  if (!questReceipt || !clockReceipt || manifest.counts.quests !== receipt.questCount) {
    throw new Error('Original quest or clock source receipts are missing from the gameplay manifest.');
  }
  const [definitions, initial, clock] = await Promise.all([
    gameplayResources.read<NativeQuest[]>(questPath),
    readNativeResource<InitialQuestDocument>('dialogue/' + receipt.output.path, receipt.output),
    loadOriginalWorldClock(monotonicClockMilliseconds(() => performance.now()), 24),
  ]);
  if (!Array.isArray(definitions) || definitions.length !== receipt.questCount ||
      initial.schema !== 'gothic3-initial-quests-v1' || initial.scope !== 'original-world-state-before-OnGameStartUp' ||
      initial.questCount !== receipt.questCount || initial.quests.length !== receipt.questCount ||
      initial.startup.applied !== false || !initial.startup.explicitQuestRuns.includes('Xardas_FindXardas') ||
      !initial.startup.unimplemented.length) {
    throw new Error('Original quest definitions, fresh-world seed and startup receipt do not agree.');
  }
  return { definitions, initial, clock,
    sources: { initialQuestStates: receipt.output.sha256, questDefinitions: questReceipt.sha256,
      worldClock: clockReceipt.sha256 } };
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
  private readonly listeners = new Set<() => void>();
  private tickFailure: string | null = null;

  private constructor(readonly definitions: readonly NativeQuest[], readonly clock: NativeWorldClock,
    private readonly sources: NativeQuestSessionSources, initialGameEvents: readonly string[]) {
    this.quests = new NativeQuests(definitions, {
      clock: () => clock.questClock(),
      apply: (effects) => effects.length === 0
        ? { applied: true }
        : { applied: false, reason: 'This browser session has not implemented native quest reward/service handlers.' },
      changed: () => { for (const listener of this.listeners) listener(); },
    });
    this.gameEvents = new NativeGameEvents(initialGameEvents);
  }

  /** Load verified source records and apply the one audited startup quest run. */
  static async newGame(player: Pick<NativeHeroPlayerMemory, 'source' | 'gameEvents'>): Promise<NativeQuestRuntime> {
    const source = await loadQuestSourceBundle();
    const { definitions, initial, clock } = source;
    const clockState = clock.snapshot();
    if (clockState.calendar.year !== 0 || clockState.calendar.day !== 0 || clockState.calendar.hour !== 12 ||
        clockState.calendar.minute !== 0 || clockState.calendar.second !== 0 || clockState.adjustment.factor !== 12 ||
        clockState.adjustment.secondsPerDay !== 86400 || clockState.adjustment.daysPerYear !== 365 || !clockState.paused) {
      throw new Error('Original new-world clock seed is not the audited noon/factor-12 state.');
    }
    const runtimeSources: NativeQuestSessionSources = { ...source.sources, heroPlayerMemory: player.source.sha256 };
    const runtime = new NativeQuestRuntime(definitions, clock, runtimeSources, player.gameEvents);
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
  static async restore(raw: unknown, player: Pick<NativeHeroPlayerMemory, 'source' | 'gameEvents'>): Promise<NativeQuestRuntime> {
    if (!record(raw) || raw.schema !== 'gothic3-quest-session-save-v1' || !record(raw.sources) ||
        !record(raw.clock) || !record(raw.quests)) throw new Error('Unsupported Gothic 3 browser save.');
    const source = await loadQuestSourceBundle();
    if (raw.sources.initialQuestStates !== source.sources.initialQuestStates ||
        raw.sources.questDefinitions !== source.sources.questDefinitions || raw.sources.worldClock !== source.sources.worldClock) {
      throw new Error('Browser save belongs to different Gothic 3 source data.');
    }
    if (raw.sources.heroPlayerMemory !== undefined && raw.sources.heroPlayerMemory !== player.source.sha256) {
      throw new Error('Browser save belongs to different Gothic 3 Hero PlayerMemory data.');
    }
    if (!uint32(raw.clock.years) || !uint32(raw.clock.days) || typeof raw.clock.seconds !== 'number' ||
        !Number.isFinite(raw.clock.seconds) || raw.clock.seconds < 0 || raw.clock.seconds >= 86400) {
      throw new Error('Browser save has an invalid world clock.');
    }
    const savedEvents = raw.gameEvents === undefined ? player.gameEvents : raw.gameEvents;
    if (!Array.isArray(savedEvents) || !savedEvents.every((event) => typeof event === 'string' && !event.includes('\0'))) {
      throw new Error('Browser save has invalid PlayerKnows game events.');
    }
    const runtimeSources: NativeQuestSessionSources = { ...source.sources, heroPlayerMemory: player.source.sha256 };
    const runtime = new NativeQuestRuntime(source.definitions, source.clock, runtimeSources, savedEvents);
    seedQuestStates(runtime, raw.quests as Record<string, QuestState>);
    const set = runtime.clock.set({ years: raw.clock.years, days: raw.clock.days, seconds: raw.clock.seconds });
    if (set.kind !== 'applied') throw new Error('Saved world time cannot be restored: ' + set.reason);
    const adjusted = runtime.clock.adjust({ factor: 12, secondsPerDay: 86400, daysPerYear: 365 });
    if (adjusted.kind !== 'applied') throw new Error('Saved world clock setup failed: ' + adjusted.reason);
    const published = runtime.clock.process();
    if (published.kind !== 'applied') throw new Error('Saved world clock could not publish its calendar: ' + published.reason);
    const resumed = runtime.clock.resume();
    if (resumed.kind !== 'applied') throw new Error('Saved world clock could not resume: ' + resumed.reason);
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
      gameEvents: this.gameEvents.snapshot() };
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
