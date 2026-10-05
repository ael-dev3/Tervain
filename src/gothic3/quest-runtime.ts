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

function sourceQuestReceipt(): InitialQuestReceipt {
  const receipt = JSON.parse(questReceiptText) as Partial<InitialQuestReceipt>;
  if (receipt.schema !== 'gothic3-initial-quests-output-v1' || receipt.questCount !== 641 ||
      receipt.output?.path !== 'initial-quests.json' || receipt.output.bytes !== 475077 ||
      receipt.output.sha256 !== '1ad6940998af6119a833ef27f5e0ea46687610e52bec2640d21ad4635b81e518') {
    throw new Error('Original initial-quest source receipt differs.');
  }
  return receipt as InitialQuestReceipt;
}

export interface QuestSessionRow {
  readonly definition: NativeQuest;
  readonly state: Readonly<QuestState>;
}

/** One mutable quest manager and original-seeded game clock for the browser session. */
export class NativeQuestRuntime {
  readonly quests: NativeQuests;
  private readonly listeners = new Set<() => void>();
  private tickFailure: string | null = null;

  private constructor(readonly definitions: readonly NativeQuest[], readonly clock: NativeWorldClock) {
    this.quests = new NativeQuests(definitions, {
      clock: () => clock.questClock(),
      apply: (effects) => effects.length === 0
        ? { applied: true }
        : { applied: false, reason: 'This browser session has not implemented native quest reward/service handlers.' },
      changed: () => { for (const listener of this.listeners) listener(); },
    });
  }

  /** Load verified source records and apply the one audited startup quest run. */
  static async newGame(): Promise<NativeQuestRuntime> {
    const receipt = sourceQuestReceipt();
    const manifest = await gameplayResources.manifest();
    const questPath = manifest.runtime?.quests ?? manifest.urls.runtimeQuests ?? manifest.urls.quests;
    const [definitions, initial, clock] = await Promise.all([
      gameplayResources.read<NativeQuest[]>(questPath),
      readNativeResource<InitialQuestDocument>('dialogue/' + receipt.output.path, receipt.output),
      loadOriginalWorldClock(monotonicClockMilliseconds(() => performance.now()), 24),
    ]);
    if (manifest.counts.quests !== receipt.questCount || definitions.length !== receipt.questCount ||
        initial.schema !== 'gothic3-initial-quests-v1' || initial.scope !== 'original-world-state-before-OnGameStartUp' ||
        initial.questCount !== receipt.questCount || initial.quests.length !== receipt.questCount ||
        initial.startup.applied !== false || !initial.startup.explicitQuestRuns.includes('Xardas_FindXardas') ||
        !initial.startup.unimplemented.length) {
      throw new Error('Original quest definitions, fresh-world seed and startup receipt do not agree.');
    }
    const clockState = clock.snapshot();
    if (clockState.calendar.year !== 0 || clockState.calendar.day !== 0 || clockState.calendar.hour !== 12 ||
        clockState.calendar.minute !== 0 || clockState.calendar.second !== 0 || clockState.adjustment.factor !== 12 ||
        clockState.adjustment.secondsPerDay !== 86400 || clockState.adjustment.daysPerYear !== 365 || !clockState.paused) {
      throw new Error('Original new-world clock seed is not the audited noon/factor-12 state.');
    }
    const runtime = new NativeQuestRuntime(definitions, clock);
    const definitionIds = new Set(definitions.map((quest) => quest.id));
    const stateIds = new Set<string>();
    for (const source of initial.quests) {
      if (!definitionIds.has(source.id) || stateIds.has(source.id)) throw new Error('Initial quest state has an unknown or duplicate id: ' + source.id);
      stateIds.add(source.id);
      runtime.quests.seed(source.id, { status: source.status, counters: source.counters,
        startedAt: source.startedAt, logKeys: source.logKeys, logPairs: source.logPairs });
    }
    if (stateIds.size !== definitionIds.size) throw new Error('Initial quest state does not cover the source definitions.');

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
