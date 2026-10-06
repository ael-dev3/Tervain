import type { NativeQuest } from './catalog';

export enum QuestStatus {
  Open = 0, Running = 1, Success = 2, Failed = 3,
  Obsolete = 4, Cancelled = 5, Lost = 6, Won = 7,
}

export interface NativeClock { years: number; days: number; hours: number }
export interface QuestLogPair { version: number; speakerKey: string; textKey: string }
export interface QuestState {
  status: QuestStatus;
  counters: number[];
  startedAt: NativeClock | null;
  logKeys: string[];
  /** Original paired localization IDs; empty speaker keys are significant. */
  logPairs?: QuestLogPair[];
}

export type QuestEffect =
  | { type: 'experienceScript'; requestedAmount: number; self: 'world'; other: 'player' }
  | { type: 'politicalFame'; alignment: number; amount: number }
  | { type: 'enclaveFame'; name: string; amount: number }
  | { type: 'attributeBase'; id: string; amount: number }
  | { type: 'arenaStatus'; arena: string; running: boolean }
  | { type: 'afterArdeaTutorial'; tutorial: 8; textKey: 'TUT_AfterFight' };

export interface QuestHost {
  /** Native Running requires an available world entity and world time. */
  clock(): NativeClock | null;
  /** Apply all effects together, or return why this runtime cannot support them. */
  apply(effects: readonly QuestEffect[]): { applied: true } | { applied: false; reason: string };
  changed(quest: NativeQuest, previous: QuestStatus, state: Readonly<QuestState>): void;
}

export type QuestResult = { kind: 'applied' } | { kind: 'rejected' | 'unsupported'; reason: string };
export type NativeQuestSuccessEffects =
  | { supported: true; effects: readonly QuestEffect[] }
  | { supported: false; reason: string };

/** Resolve the exact effect order used by gCQuest_PS::SetStatus on Success/Won. */
export function nativeQuestSuccessEffects(quest: NativeQuest): NativeQuestSuccessEffects {
  const rewards = quest.rewards;
  if (rewards.experience === null || rewards.political?.amount === null ||
      rewards.enclave?.amount === null || rewards.attribute?.amount === null) {
    return { supported: false, reason: 'Native reward fields are unresolved.' };
  }
  const effects: QuestEffect[] = [];
  if (rewards.political && rewards.political.amount !== null && rewards.political.amount > 0) {
    if (rewards.political.alignment === null) return { supported: false, reason: 'Political alignment is unresolved.' };
    effects.push({ type: 'politicalFame', alignment: rewards.political.alignment, amount: rewards.political.amount });
  }
  if (rewards.attribute?.id && rewards.attribute.amount !== null) {
    effects.push({ type: 'attributeBase', id: rewards.attribute.id, amount: rewards.attribute.amount });
  }
  if (rewards.enclave && rewards.enclave.amount !== null && rewards.enclave.amount > 0) {
    effects.push({ type: 'enclaveFame', name: rewards.enclave.name, amount: rewards.enclave.amount });
  }
  if (rewards.experience !== 0) {
    effects.push({ type: 'experienceScript', requestedAmount: rewards.experience, self: 'world', other: 'player' });
  }
  if (quest.id.toLowerCase() === 'ardea_revolution') {
    effects.push({ type: 'afterArdeaTutorial', tutorial: 8, textKey: 'TUT_AfterFight' });
  }
  return { supported: true, effects };
}

/**
 * Native transition rules: Game.dll gCQuest_PS::SetStatus 0x2001a519;
 * manager RunQuest 0x20007306, SucceedQuest 0x2001e72c, CloseQuest 0x20028358.
 * The caller supplies actual state. Factory defaults do not establish a new game.
 * Host effects still need native player/arena/tutorial implementations before
 * this kernel can be enabled for ordinary play.
 */
export class NativeQuests {
  private readonly definitions: Map<string, NativeQuest>;
  private readonly states = new Map<string, QuestState>();

  constructor(quests: readonly NativeQuest[], private readonly host: QuestHost) {
    this.definitions = new Map(quests.map((quest) => [quest.id, quest]));
  }

  seed(id: string, state: QuestState): void {
    const quest = this.definitions.get(id);
    if (!quest || !Number.isInteger(state.status) || state.status < 0 || state.status > 7 ||
        state.counters.length !== quest.deliveryTargets.length ||
        !state.counters.every((counter) => Number.isInteger(counter) && counter >= 0)) {
      throw new Error('Invalid source quest state: ' + id);
    }
    this.states.set(id, structuredClone(state));
  }

  state(id: string): Readonly<QuestState> | undefined {
    const state = this.states.get(id);
    return state ? structuredClone(state) : undefined;
  }

  /** Native gCInfo_PS::OnEndInfo appends Say localization pairs to an
   * associated quest for its supported condition types. */
  appendDialogueLogPairs(id: string, pairs: readonly QuestLogPair[]): QuestResult {
    if (pairs.length === 0) return { kind: 'applied' };
    const quest = this.definitions.get(id);
    const state = this.states.get(id);
    if (!quest || !state) return { kind: 'unsupported', reason: 'Original quest state has not been seeded: ' + id };
    if (pairs.some((pair) => !Number.isInteger(pair.version) || pair.version < 0 || pair.version > 0xffff ||
        typeof pair.speakerKey !== 'string' || typeof pair.textKey !== 'string' || pair.speakerKey.includes('\0') || pair.textKey.includes('\0'))) {
      return { kind: 'unsupported', reason: 'Native dialogue log localization pair is malformed.' };
    }
    state.logPairs ??= [];
    state.logPairs.push(...pairs.map((pair) => ({ ...pair })));
    state.logKeys.push(...pairs.map((pair) => pair.textKey).filter(Boolean));
    this.host.changed(quest, state.status, structuredClone(state));
    return { kind: 'applied' };
  }

  /** Native gCInfo_PS::OnEndInfo callback for the bounded dialogue conditions.
   * Condition 6 runs an Open quest, 11 closes a Running quest, and 21 restarts
   * a Lost quest. Condition 2 has no quest/log effect. Say localization pairs
   * are appended for 3/6/11/19; the native callback does not append them for
   * 21. Callers preflight the original condition before dialogue starts. */
  onEndInfo(id: string, conditionType: number, pairs: readonly QuestLogPair[]): QuestResult {
    if (conditionType === 19 && !id) {
      return { kind: 'unsupported', reason: 'Native condition 19 requires an associated quest.' };
    }
    if (conditionType === 6 || conditionType === 11 || conditionType === 21) {
      if (!id) return { kind: 'unsupported', reason: 'Native quest callback requires an associated quest.' };
      const transition = conditionType === 6 ? this.run(id) : conditionType === 11 ? this.close(id)
        : this.setStatus(id, QuestStatus.Running);
      if (transition.kind !== 'applied') return transition;
    } else if (conditionType !== 2 && conditionType !== 3 && conditionType !== 19) {
      return { kind: 'unsupported', reason: 'Native OnEndInfo condition is not in the connected profile: ' + conditionType };
    }
    if ((conditionType === 3 || conditionType === 6 || conditionType === 11 || conditionType === 19) && id) {
      return this.appendDialogueLogPairs(id, pairs);
    }
    return { kind: 'applied' };
  }

  run(id: string): QuestResult {
    if (this.states.get(id)?.status !== QuestStatus.Open) return { kind: 'rejected', reason: 'RunQuest requires an existing Open quest.' };
    return this.setStatus(id, QuestStatus.Running);
  }

  succeed(id: string): QuestResult {
    const status = this.states.get(id)?.status;
    if (status !== QuestStatus.Open && status !== QuestStatus.Running) return { kind: 'rejected', reason: 'SucceedQuest requires an Open or Running quest.' };
    return this.setStatus(id, QuestStatus.Success);
  }

  close(id: string): QuestResult {
    return this.setStatus(id, this.states.get(id)?.status === QuestStatus.Open ? QuestStatus.Obsolete : QuestStatus.Cancelled);
  }

  prerequisitesFinished(id: string): boolean | null {
    const quest = this.definitions.get(id);
    if (!quest) return null;
    for (const prerequisite of quest.prereqs) {
      // Native 0x20008008 warns and continues when a named quest is absent.
      if (!this.definitions.has(prerequisite)) continue;
      const status = this.states.get(prerequisite)?.status;
      if (status === undefined) return null;
      if (status === QuestStatus.Open || status === QuestStatus.Running || status === QuestStatus.Lost) return false;
    }
    return true;
  }

  setStatus(id: string, target: QuestStatus): QuestResult {
    const quest = this.definitions.get(id);
    const state = this.states.get(id);
    if (!quest || !state) return { kind: 'unsupported', reason: 'Original quest state has not been seeded: ' + id };
    const previous = state.status;
    const allowed = target === QuestStatus.Running ? previous === QuestStatus.Open || previous === QuestStatus.Lost
      : target === QuestStatus.Success || target === QuestStatus.Won || target === QuestStatus.Failed ? previous === QuestStatus.Open || previous === QuestStatus.Running
      : target === QuestStatus.Obsolete ? previous === QuestStatus.Open
      : target === QuestStatus.Cancelled || target === QuestStatus.Lost ? previous === QuestStatus.Running
      : false;
    if (!allowed) return { kind: 'rejected', reason: 'Native quest transition rejects ' + previous + ' → ' + target };
    let startedAt = state.startedAt;
    if (target === QuestStatus.Running) {
      startedAt = this.host.clock();
      if (!startedAt) return { kind: 'unsupported', reason: 'Native world clock is unavailable.' };
    }
    const effects: QuestEffect[] = [];
    if (target === QuestStatus.Success || target === QuestStatus.Won) {
      const planned = nativeQuestSuccessEffects(quest);
      if (!planned.supported) return { kind: 'unsupported', reason: planned.reason };
      effects.push(...planned.effects);
      // JobSuccess is serialized but not consumed by this build's SetStatus.
    }
    if (quest.numericType === 5 || quest.numericType === 12) effects.push({ type: 'arenaStatus', arena: quest.destination, running: target === QuestStatus.Running });
    const result = this.host.apply(effects);
    if (!result.applied) return { kind: 'unsupported', reason: result.reason };
    state.status = target;
    state.startedAt = startedAt;
    this.host.changed(quest, previous, structuredClone(state));
    return { kind: 'applied' };
  }
}
