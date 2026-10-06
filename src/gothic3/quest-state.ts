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
export interface NativeNpcKillObjectiveProgress {
  readonly questId: string;
  readonly entity: string;
  readonly counter: number;
  readonly amount: number;
}
export type NativeNpcKilledResult =
  | { readonly kind: 'applied'; readonly progress: readonly NativeNpcKillObjectiveProgress[] }
  | { readonly kind: 'unsupported'; readonly reason: string };
export interface NativeNpcKilledPlanUpdate {
  readonly questId: string;
  readonly counters: readonly number[];
  /** The native checker can request Success from Lost, but SetStatus rejects it. */
  readonly complete: boolean;
  readonly effects: readonly QuestEffect[];
}
export type NativeNpcKilledPlan =
  | { readonly kind: 'planned'; readonly progress: readonly NativeNpcKillObjectiveProgress[];
      readonly updates: readonly NativeNpcKilledPlanUpdate[] }
  | { readonly kind: 'unsupported'; readonly reason: string };
export type NativeQuestSuccessEffects =
  | { supported: true; effects: readonly QuestEffect[] }
  | { supported: false; reason: string };

/** Original OnEndInfo common-tail guards at Game:20439125..20439150. */
export function nativeInfoAppendsQuestSayPairs(conditionType: number): boolean {
  return [3, 4, 5, 6, 7, 8, 10, 11, 19].includes(conditionType);
}

const isUint32 = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
const completionQuestTypes = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]);

/** Store the native counter's 32 bits as a canonical unsigned JavaScript value.
 * Its native declaration is long; CheckDeliveryEntitiesStatus reads it unsigned. */
function completionTarget(quest: NativeQuest, state: Readonly<QuestState>):
  { supported: true; target: QuestStatus.Success | QuestStatus.Won | null } |
  { supported: false; reason: string } {
  if ((state.status !== QuestStatus.Open && state.status !== QuestStatus.Running && state.status !== QuestStatus.Lost) ||
      quest.numericType === null || !completionQuestTypes.has(quest.numericType)) return { supported: true, target: null };
  if (quest.deliveryTargets.some((target) => !isUint32(target.amount))) {
    return { supported: false, reason: 'Native quest delivery amount is unresolved or outside unsigned32 range: ' + quest.id };
  }
  if (state.counters.length !== quest.deliveryTargets.length || state.counters.some((counter) => !isUint32(counter))) {
    return { supported: false, reason: 'Native quest delivery counters are not initialized32-bit values: ' + quest.id };
  }
  if (quest.deliveryTargets.some((target, index) => state.counters[index]! < target.amount!)) {
    return { supported: true, target: null };
  }
  return { supported: true, target: quest.numericType === 12 ? QuestStatus.Won : QuestStatus.Success };
}

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
        !state.counters.every(isUint32)) {
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
   * a Lost quest. Conditions 5/7/8/10 leave quest status unchanged. Say pairs
   * are appended by the common tail for 3/4/5/6/7/8/10/11/19. Condition 4's
   * separate overtime availability predicate belongs to the dialogue host. */
  onEndInfo(id: string, conditionType: number, pairs: readonly QuestLogPair[]): QuestResult {
    if (conditionType === 19 && !id) {
      return { kind: 'unsupported', reason: 'Native condition 19 requires an associated quest.' };
    }
    if (conditionType === 6 || conditionType === 11 || conditionType === 21) {
      if (!id) return { kind: 'unsupported', reason: 'Native quest callback requires an associated quest.' };
      const transition = this.setStatus(id, conditionType === 11 ? QuestStatus.Cancelled : QuestStatus.Running);
      // Native OnEndInfo ignores SetStatus's bool return and continues to its
      // common Say-log tail. Unsupported host effects still prevent execution.
      if (transition.kind === 'unsupported') return transition;
    } else if (conditionType !== 2 && !nativeInfoAppendsQuestSayPairs(conditionType)) {
      return { kind: 'unsupported', reason: 'Native OnEndInfo condition is not in the connected profile: ' + conditionType };
    }
    if (nativeInfoAppendsQuestSayPairs(conditionType) && id) {
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

  /** gCInfo_PS::OnDelivery increments the first matching target for native
   * delivery quest types 1/4, then checks whether every target is satisfied. */
  deliverToEntity(id: string, entity: string): QuestResult {
    const quest = this.definitions.get(id);
    const state = this.states.get(id);
    if (!quest || !state) return { kind: 'unsupported', reason: 'Original quest state has not been seeded: ' + id };
    if (quest.numericType !== 1 && quest.numericType !== 4) {
      return { kind: 'unsupported', reason: 'Native Info delivery is connected only for quest types 1/4: ' + id };
    }
    if (quest.deliveryTargets.some((target) => !isUint32(target.amount))) {
      return { kind: 'unsupported', reason: 'Native quest delivery amount is unresolved: ' + id };
    }
    if (state.status !== QuestStatus.Running) {
      return { kind: 'rejected', reason: 'Native Info delivery requires a Running quest.' };
    }
    const index = quest.deliveryTargets.findIndex((target) => target.entity === entity);
    if (index < 0) return { kind: 'applied' };
    state.counters[index] = (state.counters[index]! + 1) >>> 0;
    const completion = completionTarget(quest, state);
    if (!completion.supported) return { kind: 'unsupported', reason: completion.reason };
    if (completion.target !== null) return this.setStatus(id, completion.target);
    this.host.changed(quest, state.status, structuredClone(state));
    return { kind: 'applied' };
  }

  /** Original checker type/status guards, unsigned comparisons and SetStatus call.
   * Lost may satisfy its counters, while SetStatus rejects Success/Won from Lost. */
  checkDeliveryEntitiesStatus(id: string): QuestResult {
    const quest = this.definitions.get(id);
    const state = this.states.get(id);
    if (!quest || !state) return { kind: 'unsupported', reason: 'Original quest state has not been seeded: ' + id };
    const completion = completionTarget(quest, state);
    if (!completion.supported) return { kind: 'unsupported', reason: completion.reason };
    return completion.target === null ? { kind: 'applied' } : this.setStatus(id, completion.target);
  }

  /** Project OnNPCKilled without changing counters, status or host rewards.
   * Game:203384f0 updates types2/3/4 and then invokes the shared checker.
   * The native event dispatcher and Kill/Defeat task acceptance are separate. */
  planNpcKilled(entity: string): NativeNpcKilledPlan {
    if (!entity || entity.includes('\0')) {
      return { kind: 'unsupported', reason: 'Native killed-entity name is empty or malformed.' };
    }
    if (entity === 'PC_Hero') return { kind: 'planned', progress: [], updates: [] };

    const updates: NativeNpcKilledPlanUpdate[] = [];
    const progress: NativeNpcKillObjectiveProgress[] = [];
    for (const quest of this.definitions.values()) {
      if (quest.numericType !== 2 && quest.numericType !== 3 && quest.numericType !== 4) continue;
      const state = this.states.get(quest.id);
      if (!state || (state.status !== QuestStatus.Open && state.status !== QuestStatus.Running &&
          state.status !== QuestStatus.Lost)) continue;
      const counters = [...state.counters];
      let changed = false;
      for (let index = 0; index < quest.deliveryTargets.length; index++) {
        const target = quest.deliveryTargets[index]!;
        if (target.entity !== entity) continue;
        if (!isUint32(target.amount)) {
          return { kind: 'unsupported', reason: 'Native kill objective amount is unresolved or outside unsigned32 range: ' + quest.id };
        }
        const before = counters[index];
        if (!isUint32(before)) {
          return { kind: 'unsupported', reason: 'Native kill objective counter is outside unsigned32 range: ' + quest.id };
        }
        counters[index] = (before + 1) >>> 0;
        changed = true;
        progress.push({ questId: quest.id, entity: target.entity, counter: counters[index]!, amount: target.amount });
      }
      if (!changed) continue;
      const completion = completionTarget(quest, { ...state, counters });
      if (!completion.supported) return { kind: 'unsupported', reason: completion.reason };
      const complete = completion.target !== null && state.status !== QuestStatus.Lost;
      let effects: readonly QuestEffect[] = [];
      if (complete) {
        const rewards = nativeQuestSuccessEffects(quest);
        if (!rewards.supported) return { kind: 'unsupported', reason: rewards.reason };
        effects = rewards.effects;
      }
      updates.push({ questId: quest.id, counters, complete, effects });
    }

    return { kind: 'planned', progress, updates };
  }

  /** Browser host preflights the complete reward batch before committing quest
   * state. This preserves supported final states and reward order; native
   * per-quest observer notifications interleave with effects and are unported. */
  recordNpcKilled(entity: string): NativeNpcKilledResult {
    const plan = this.planNpcKilled(entity);
    if (plan.kind === 'unsupported') return plan;
    const effects = plan.updates.flatMap((update) => update.effects);
    if (effects.length) {
      const applied = this.host.apply(effects);
      if (!applied.applied) return { kind: 'unsupported', reason: applied.reason };
    }
    for (const update of plan.updates) {
      const state = this.states.get(update.questId)!;
      const previous = state.status;
      state.counters = [...update.counters];
      if (update.complete) state.status = QuestStatus.Success;
      this.host.changed(this.definitions.get(update.questId)!, previous, structuredClone(state));
    }
    return { kind: 'applied', progress: plan.progress };
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
