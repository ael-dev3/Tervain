/** Installed Script_Game death states and Kill/Defeat task boundaries.
 * Scheduling only installs a state. Its body executes on the existing SPU
 * scheduler later. Engine dependencies are mandatory, ordered capabilities;
 * an unknown operation retains its applied prefix and prevents replay.
 */
import { isNativeHumanoid, planNativeNpcDefeatXp } from './combat';
import type { NativeActorCombatState, NativeDefeatCredit, NativeDefeatEffect,
  NativeKnowledge, NativePlayerProgress } from './combat';
import type { NativeInstructionHost, NativeInstructionScheduler, NativeScriptBody } from './script-instructions';
import type { NativeRoutineResult, NativeScriptProcessingUnit, NativeSPUSchedulerAccess } from './script-routine';

const SHA = '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1';
export type NativeNpcDeathEvent = 'kill' | 'defeat';
export type NativeNpcDeathState = 'ZS_RagDollDead' | 'ZS_Dead' | 'ZS_Unconscious';
const STATES: Readonly<Record<NativeNpcDeathState, string>> = {
  ZS_RagDollDead: '100285c0', ZS_Dead: '100292e0', ZS_Unconscious: '100369b0',
};
const LABELS = {
  ZS_RagDollDead: { mask: '102213f0', counter: '102213ec', labels: ['102213e8'] },
  ZS_Dead: { mask: '10221414', counter: '10221410', labels: ['1022140c', '10221408'] },
  ZS_Unconscious: { mask: '102217b0', counter: '102217ac', labels: ['102217a8', '102217a4'] },
} as const;

export interface NativeNpcDeathActor {
  readonly combat: NativeActorCombatState;
  /** Live Routine_PS.AIMode, independently of source serialized defaults. */
  readonly aiMode: NativeKnowledge<number>;
}
type ScriptCall = 'ResetAll' | 'ResetInteraction' | 'RemoveNonCombatItems' | 'DropHandItems'
  | 'NotifyEnclave' | 'SetCurrentDestinationPoint' | 'CleanUpPlunderInv';
const HELPERS: Readonly<Record<ScriptCall, string>> = {
  ResetAll: '10031280', ResetInteraction: '10031680', RemoveNonCombatItems: '10031970',
  DropHandItems: '10031790', NotifyEnclave: '100755e0', SetCurrentDestinationPoint: '100c9560',
  CleanUpPlunderInv: '10027960',
};

/** Compound operations retain a named native body boundary, never an implicit
 * browser no-op. Their host must implement the whole selected native branch
 * or return unknown. All identifiers are resolved entity identities, not names. */
export type NativeNpcDeathOperation =
  | { readonly kind: 'last-fight-timestamp'; readonly victimId: string }
  | { readonly kind: 'stop-effect'; readonly victimId: string; readonly immediate: true }
  | { readonly kind: 'disable-status-effects'; readonly victimId: string; readonly mask: 4 }
  | { readonly kind: 'native-script'; readonly name: ScriptCall; readonly body: string;
      readonly selfId: string; readonly otherId: string | null; readonly argument: 0 }
  | { readonly kind: 'npc-property'; readonly victimId: string;
      readonly property: 'AIMode' | 'CanBePushedWhileIdle' | 'LastFightAgainstPlayer'; readonly value: number | false;
      readonly onlyIfCredited?: true }
  | { readonly kind: 'player-control-flag'; readonly victimId: string; readonly value: false; readonly helper: '10009520' }
  | { readonly kind: 'kill-party-cleanup'; readonly victimId: string }
  | { readonly kind: 'combat-state-cleanup'; readonly victimId: string; readonly attackerId: string; readonly helper: '10010130' }
  | { readonly kind: 'defeat-social-before-event'; readonly victimId: string; readonly attackerId: string }
  | { readonly kind: 'quest-event'; readonly name: 'OnNPCKilled' | 'OnNPCDefeated'; readonly victimId: string }
  | { readonly kind: 'talchef-routines'; readonly victimId: string }
  | { readonly kind: 'defeat-xp'; readonly event: NativeNpcDeathEvent; readonly victimId: string; readonly attackerId: string }
  | { readonly kind: 'xp-effect'; readonly effect: NativeDefeatEffect }
  | { readonly kind: 'set-hit-points'; readonly victimId: string; readonly value: 0; readonly helper: '10045b20' }
  | { readonly kind: 'ragdoll-before-kill'; readonly victimId: string; readonly branch: 'humanoid-svm';
      readonly svm: 'DEAD'; readonly category: 2; readonly timeGlobal: '10220e8c' }
  | { readonly kind: 'ragdoll-before-kill'; readonly victimId: string; readonly branch: 'creature-effect' }
  | { readonly kind: 'movement-mode'; readonly victimId: string; readonly value: 14 }
  | { readonly kind: 'ragdoll-after-kill'; readonly victimId: string }
  | { readonly kind: 'force-next-pose'; readonly victimId: string; readonly value: 1 }
  | { readonly kind: 'animation-direction'; readonly victimId: string; readonly value: 1 }
  | { readonly kind: 'routine-property'; readonly victimId: string; readonly property: 'Action' | 'AniState'; readonly value: number }
  | { readonly kind: 'say-down'; readonly victimId: string; readonly attackerId: string }
  | { readonly kind: 'ai-die'; readonly victimId: string; readonly attackerId: string }
  | { readonly kind: 'combat-move'; readonly victimId: string; readonly attackerId: string; readonly action: 30 }
  | { readonly kind: 'set-state'; readonly victimId: string; readonly name: 'ZS_RagDollDead_Loop' | 'ZS_Dead_Loop' | 'ZS_Unconscious_Loop' }
  | { readonly kind: 'set-task'; readonly victimId: string; readonly name: NativeNpcDeathState }
  | { readonly kind: 'set-task-time'; readonly victimId: string; readonly value: 0 };

export interface NativeNpcDeathTaskPlan {
  readonly event: NativeNpcDeathEvent;
  readonly attackerId: string;
  readonly victimId: string;
  readonly operations: readonly NativeNpcDeathOperation[];
  readonly source: { readonly moduleSha256: string; readonly entry: string };
}
export interface NativeNpcDeathXpContext {
  readonly credit: Omit<NativeDefeatCredit, 'taskAccepted'>;
  readonly player: NativePlayerProgress;
}
export interface NativeNpcDeathHost {
  actor(id: string): NativeKnowledge<NativeNpcDeathActor | null>;
  playerId(): NativeKnowledge<string>;
  /** Side-effect-free capability/branch check. Execution checks one operation
   * at a time; callers can explicitly request a complete preflight instead. */
  preflight(operation: NativeNpcDeathOperation, spu: NativeScriptProcessingUnit): NativeKnowledge<void>;
  /** ai-die/combat-move must return the actual AL byte and own any frame or
   * active instruction writes. A missing animation runner is not completion. */
  engine(operation: NativeNpcDeathOperation, spu: NativeScriptProcessingUnit,
    access: NativeSPUSchedulerAccess): NativeKnowledge<number | void>;
  questEvent(name: 'OnNPCKilled' | 'OnNPCDefeated', victimId: string,
    spu: NativeScriptProcessingUnit): NativeKnowledge<void>;
  /** Called after the quest event. Manager callbacks may have awarded XP or
   * changed credit state, so no earlier player snapshot is reused for rewards. */
  defeatXpContext(attackerId: string, victimId: string,
    spu: NativeScriptProcessingUnit): NativeKnowledge<NativeNpcDeathXpContext>;
  xpEffect(effect: NativeDefeatEffect, spu: NativeScriptProcessingUnit,
    access: NativeSPUSchedulerAccess): NativeKnowledge<void>;
}
export type NativeNpcDeathPreflight =
  | { readonly supported: true; readonly operations: readonly NativeNpcDeathOperation[] }
  | { readonly supported: false; readonly operations: readonly NativeNpcDeathOperation[];
      readonly required: NativeNpcDeathOperation | null; readonly reason: string };
export interface NativeNpcDeathExecution {
  readonly outcome: 'complete' | 'unsupported' | 'partial' | 'blocked';
  readonly applied: readonly NativeNpcDeathOperation[];
  readonly attempted: readonly NativeNpcDeathOperation[];
  readonly required: NativeNpcDeathOperation | null;
  readonly reason: string | null;
  readonly beforeRevision: number;
  readonly afterRevision: number;
}

function fact<T>(value: NativeKnowledge<T>, operation: string): T {
  if (value.status !== 'known' || !value.source) {
    throw new Error(operation + ': ' + (value.status === 'unknown' ? value.reason : 'source receipt missing'));
  }
  return value.value;
}
function int32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new Error(name + ' requires signed32 state');
  return value;
}
function success(result: NativeRoutineResult): void { if (!result.supported) throw new Error(result.reason); }
function call(name: ScriptCall, selfId: string, otherId: string | null = null): NativeNpcDeathOperation {
  return { kind: 'native-script', name, body: HELPERS[name], selfId, otherId, argument: 0 };
}
function beforeRagdollKill(victim: NativeActorCombatState): NativeNpcDeathOperation {
  int32(victim.species, 'native victim Species');
  return isNativeHumanoid(victim.species)
    ? { kind: 'ragdoll-before-kill', victimId: victim.id, branch: 'humanoid-svm', svm: 'DEAD', category: 2, timeGlobal: '10220e8c' }
    : { kind: 'ragdoll-before-kill', victimId: victim.id, branch: 'creature-effect' };
}

/** Static call order only. XP stays a dynamic boundary to preserve quest reward
 * ordering. Original Kill/Defeat Self=attacker, Other=victim; GiveXP reverses
 * these roles. Player game-over and unresolved None attacker semantics remain
 * outside this NPC profile. */
export function planNativeNpcDeathTask(event: NativeNpcDeathEvent, attackerId: string,
  victim: Pick<NativeActorCombatState, 'id' | 'name' | 'isPlayer'>, playerId: string): NativeNpcDeathTaskPlan {
  if (!['kill', 'defeat'].includes(event) || !attackerId || !victim.id || !playerId) throw new Error('Resolved native death task operands required');
  if (victim.isPlayer) throw new Error('Player death/game-over is outside the NPC death profile');
  const id = victim.id, operations: NativeNpcDeathOperation[] = [];
  if (event === 'kill') operations.push({ kind: 'last-fight-timestamp', victimId: id });
  else operations.push({ kind: 'disable-status-effects', victimId: id, mask: 4 });
  operations.push({ kind: 'stop-effect', victimId: id, immediate: true },
    ...(['ResetAll', 'ResetInteraction', 'RemoveNonCombatItems', 'DropHandItems'] as const).map(name => call(name, id)),
    { kind: 'npc-property', victimId: id, property: 'AIMode', value: event === 'kill' ? 9 : 8 },
    { kind: 'player-control-flag', victimId: id, value: false, helper: '10009520' },
    { kind: 'npc-property', victimId: id, property: 'CanBePushedWhileIdle', value: false });
  if (event === 'kill') operations.push({ kind: 'kill-party-cleanup', victimId: id });
  operations.push({ kind: 'combat-state-cleanup', victimId: id, attackerId, helper: '10010130' });
  if (event === 'defeat') operations.push({ kind: 'defeat-social-before-event', victimId: id, attackerId });
  operations.push({ kind: 'quest-event', name: event === 'kill' ? 'OnNPCKilled' : 'OnNPCDefeated', victimId: id });
  if (event === 'kill' && victim.name === 'Talchef') operations.push({ kind: 'talchef-routines', victimId: id });
  operations.push({ kind: 'defeat-xp', event, victimId: id, attackerId });
  if (event === 'kill') operations.push(call('NotifyEnclave', playerId, id));
  else operations.push({ kind: 'npc-property', victimId: id, property: 'LastFightAgainstPlayer', value: 1, onlyIfCredited: true });
  operations.push(call('SetCurrentDestinationPoint', id), call('CleanUpPlunderInv', id));
  return { event, attackerId, victimId: id, operations,
    source: { moduleSha256: SHA, entry: event === 'kill' ? '10027e70' : '100362f0' } };
}

/** Lazy label globals are shared across all actors for one Script_Game module.
 * Loaded sessions must supply their retained globals; fresh factory uses the
 * original loader's zero-initialized globals, not peractor phase defaults. */
export class NativeNpcDeathGlobals {
  private readonly values: Map<string, number>;
  constructor(seed: Readonly<Record<string, number>>) {
    this.values = new Map(Object.entries(seed).map(([address, value]) => {
      if (!/^[0-9a-f]{8}$/.test(address)) throw new Error('Invalid native death global address');
      if (address === '10220e8c') {
        if (!Number.isFinite(value) || !Object.is(Math.fround(value), value)) throw new Error('SVM timestamp requires stored float32');
        return [address, value];
      }
      return [address, int32(value, address)];
    }));
  }
  static fromOriginalLoader(): NativeNpcDeathGlobals {
    const seed: Record<string, number> = {};
    for (const group of Object.values(LABELS)) for (const address of [group.mask, group.counter, ...group.labels]) seed[address] = 0;
    seed['10220e8c'] = 0;
    return new NativeNpcDeathGlobals(seed);
  }
  snapshot(): Readonly<Record<string, number>> { return Object.freeze(Object.fromEntries(this.values)); }
  svmTimestamp(): number {
    const value = this.values.get('10220e8c');
    if (value === undefined) throw new Error('Original SVM DEAD timestamp global is unknown');
    return value;
  }
  /**1000db70 stores GetPlayingTime before StartSaySVM. A selected native SVM
   * host uses this same retained module global, including its failure prefix. */
  recordSvmTimestamp(value: number, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    if (!spu.ownsSchedulerAccess(access)) throw new Error('Stale SVM timestamp capability');
    if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) throw new Error('Finite SVM playing time required');
    this.values.set('10220e8c', Math.fround(value));
    access.record({ operation: 'death-global-10220e8c', value: Math.fround(value) });
  }
  label(state: NativeNpcDeathState, index: number, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): number {
    if (!spu.ownsSchedulerAccess(access)) throw new Error('Stale native death label binding');
    const group = LABELS[state], address = group.labels[index];
    if (!address || index < 0 || !Number.isInteger(index)) throw new Error('Unproved native death label');
    const get = (key: string): number => {
      const value = this.values.get(key); if (value === undefined) throw new Error('Native death global unknown: ' + key); return value;
    };
    const bit = 1 << index;
    if ((get(group.mask) & bit) === 0) {
      this.values.set(group.mask, get(group.mask) | bit);
      access.record({ operation: 'death-global-' + group.mask, value: get(group.mask) });
      this.values.set(address, get(group.counter));
      access.record({ operation: 'death-global-' + address, value: get(address) });
      this.values.set(group.counter, (get(group.counter) + 1) | 0);
      access.record({ operation: 'death-global-' + group.counter, value: get(group.counter) });
    }
    return get(address);
  }
}

export class NativeNpcDeathLifecycle {
  private scheduler: NativeInstructionScheduler | null = null;
  private blocked: string | null = null;
  private active = false;
  private applied: NativeNpcDeathOperation[] = [];
  private attempted: NativeNpcDeathOperation[] = [];
  private required: NativeNpcDeathOperation | null = null;
  private receipt: NativeNpcDeathExecution | null = null;
  constructor(private readonly host: NativeNpcDeathHost, readonly globals: NativeNpcDeathGlobals) {}
  bind(scheduler: NativeInstructionScheduler): void {
    if (this.scheduler) throw new Error('Native death lifecycle is already bound');
    this.scheduler = scheduler;
  }
  executionSnapshot(): NativeNpcDeathExecution | null { return this.receipt === null ? null : structuredClone(this.receipt); }
  failure(): string | null { return this.blocked; }
  private bound(spu: NativeScriptProcessingUnit, access?: NativeSPUSchedulerAccess): void {
    if (this.scheduler?.spu !== spu || (access && !spu.ownsSchedulerAccess(access))) throw new Error('Unbound/stale/cross-SPU native death adapter');
  }
  private actor(id: string): NativeNpcDeathActor {
    const actor = fact(this.host.actor(id), 'native death actor');
    if (!actor || actor.combat.id !== id) throw new Error('Actual native death actor instance required: ' + id);
    return actor;
  }
  private attacker(victim: NativeNpcDeathActor): string {
    const value = fact(victim.combat.currentAttackerId, 'victim CurrentAttacker');
    if (value === null) throw new Error('None CurrentAttacker requires unresolved native party/proxy semantics');
    this.actor(value); return value;
  }
  private mode(id: string): number { return int32(fact(this.actor(id).aiMode, 'live Routine AIMode'), 'AIMode'); }
  private plan(event: NativeNpcDeathEvent, attackerId: string, victimId: string): NativeNpcDeathTaskPlan {
    this.actor(attackerId);
    return planNativeNpcDeathTask(event, attackerId, this.actor(victimId).combat, fact(this.host.playerId(), 'native player identity'));
  }
  /** Optional whole-plan capability query. The ordinary executor gates each
   * operation immediately before use and preserves an applied native prefix. */
  preflightTask(event: NativeNpcDeathEvent, attackerId: string, victimId: string): NativeNpcDeathPreflight {
    let operations: readonly NativeNpcDeathOperation[] = [], required: NativeNpcDeathOperation | null = null;
    try {
      if (!this.scheduler) throw new Error('Native death lifecycle is unbound');
      operations = this.plan(event, attackerId, victimId).operations;
      for (const operation of operations) { required = operation; fact(this.host.preflight(operation, this.scheduler.spu), operation.kind); }
      return { supported: true, operations };
    } catch (error) { return { supported: false, operations, required, reason: error instanceof Error ? error.message : String(error) }; }
  }
  /** Optional complete admission query for a fresh state branch. This does
   * not execute or advance labels. Resumed frames still execute their own
   * native phase guards and per-operation capability checks. */
  preflightState(name: NativeNpcDeathState, victimId: string): NativeNpcDeathPreflight {
    const operations: NativeNpcDeathOperation[] = [];
    let required: NativeNpcDeathOperation | null = null;
    try {
      if (!this.scheduler || !Object.hasOwn(STATES, name)) throw new Error('Bound native death state required');
      const victim = this.actor(victimId), id = victim.combat.id;
      if (victim.combat.isPlayer) throw new Error('Player death state profile is unresolved');
      const mode = this.mode(id);
      if (name === 'ZS_RagDollDead') operations.push({ kind: 'set-hit-points', victimId: id, value: 0, helper: '10045b20' });
      if (name === 'ZS_RagDollDead' && mode === 8) operations.push({ kind: 'set-task', victimId: id, name: 'ZS_Dead' });
      else if (name === 'ZS_Dead' && mode === 9) operations.push(
        { kind: 'force-next-pose', victimId: id, value: 1 }, { kind: 'animation-direction', victimId: id, value: 1 },
        { kind: 'routine-property', victimId: id, property: 'AniState', value: 19 }, { kind: 'set-state', victimId: id, name: 'ZS_Dead_Loop' });
      else {
        const attackerId = this.attacker(victim);
        if (name === 'ZS_RagDollDead') operations.push(beforeRagdollKill(victim.combat));
        operations.push(...this.plan(name === 'ZS_Unconscious' ? 'defeat' : 'kill', attackerId, id).operations);
        if (name === 'ZS_RagDollDead') operations.push({ kind: 'movement-mode', victimId: id, value: 14 },
          { kind: 'ragdoll-after-kill', victimId: id }, { kind: 'set-state', victimId: id, name: 'ZS_RagDollDead_Loop' });
        else if (name === 'ZS_Dead') operations.push({ kind: 'set-hit-points', victimId: id, value: 0, helper: '10045b20' },
          { kind: 'ai-die', victimId: id, attackerId }, { kind: 'set-state', victimId: id, name: 'ZS_Dead_Loop' });
        else operations.push({ kind: 'say-down', victimId: id, attackerId },
          { kind: 'routine-property', victimId: id, property: 'Action', value: 0 },
          { kind: 'routine-property', victimId: id, property: 'AniState', value: 2 },
          { kind: 'force-next-pose', victimId: id, value: 1 }, { kind: 'combat-move', victimId: id, attackerId, action: 30 },
          { kind: 'routine-property', victimId: id, property: 'AniState', value: 17 },
          { kind: 'set-task-time', victimId: id, value: 0 }, { kind: 'set-state', victimId: id, name: 'ZS_Unconscious_Loop' });
      }
      for (const operation of operations) { required = operation; fact(this.host.preflight(operation, this.scheduler.spu), operation.kind); }
      return { supported: true, operations };
    } catch (error) { return { supported: false, operations, required, reason: error instanceof Error ? error.message : String(error) }; }
  }
  private perform(operation: NativeNpcDeathOperation, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): number | void {
    this.required = operation; this.attempted.push(operation);
    fact(this.host.preflight(operation, spu), 'native death capability ' + operation.kind);
    access.record({ operation: 'death-call', value: operation.kind });
    let value: number | void = undefined;
    if (operation.kind === 'quest-event') value = fact(this.host.questEvent(operation.name, operation.victimId, spu), operation.name);
    else if (operation.kind === 'xp-effect') value = fact(this.host.xpEffect(operation.effect, spu, access), 'native defeat XP effect');
    else if (operation.kind === 'set-state') { success(spu.setState(operation.name)); }
    else if (operation.kind === 'set-task') { success(spu.setTask(operation.name)); }
    else if (operation.kind === 'set-task-time') { success(spu.setTime('task', operation.value)); }
    else value = fact(this.host.engine(operation, spu, access), 'native death ' + operation.kind);
    if ((operation.kind === 'ai-die' || operation.kind === 'combat-move') && value !== 0 && value !== 1) throw new Error(operation.kind + ' requires its actual AL return');
    this.applied.push(operation); this.required = null;
    access.record({ operation: 'death-return', value: operation.kind });
    return value;
  }
  private xp(operation: Extract<NativeNpcDeathOperation, { kind: 'defeat-xp' }>, spu: NativeScriptProcessingUnit,
    access: NativeSPUSchedulerAccess): boolean {
    this.required = operation; this.attempted.push(operation);
    fact(this.host.preflight(operation, spu), 'native defeat XP capability');
    const context = fact(this.host.defeatXpContext(operation.attackerId, operation.victimId, spu), 'post-quest defeat XP context');
    if (context.credit.creditedActorId !== operation.attackerId || context.credit.playerId !== fact(this.host.playerId(), 'player identity')) {
      throw new Error('Defeat credit context changed native Self/player identities');
    }
    const plan = planNativeNpcDefeatXp(this.actor(operation.victimId).combat, operation.event,
      { ...context.credit, taskAccepted: { status: 'known', value: true, source: 'Script_Game:executing-' + (operation.event === 'kill' ? '10027e70' : '100362f0') } }, context.player);
    if (plan.status !== 'resolved') throw new Error(plan.reason);
    const effects = plan.value.effects.filter(effect => effect.type !== 'setAiMode' && effect.type !== 'questCallback' &&
      !(effect.type === 'nativeBoundary' && ['defeatTaskPreModeCleanup', 'defeatTaskPostModeCleanup', 'defeatTaskAfterCreditCleanup'].includes(effect.operation)));
    for (const effect of effects) this.perform({ kind: 'xp-effect', effect }, spu, access);
    this.applied.push(operation); this.required = null;
    return plan.value.eligibleCredit;
  }
  private task(event: NativeNpcDeathEvent, attackerId: string, victimId: string,
    spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): void {
    let credited = false;
    for (const operation of this.plan(event, attackerId, victimId).operations) {
      if (operation.kind === 'defeat-xp') credited = this.xp(operation, spu, access);
      else if (operation.kind !== 'npc-property' || !operation.onlyIfCredited || credited) this.perform(operation, spu, access);
    }
  }
  private execution<T extends 0 | 1 | null>(spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess, invoke: () => T): T {
    this.bound(spu, access);
    if (this.active) throw new Error('Reentrant native death lifecycle is unsupported');
    const beforeRevision = spu.revision();
    if (this.blocked) {
      this.receipt = { outcome: 'blocked', applied: [], attempted: [], required: null, reason: this.blocked,
        beforeRevision, afterRevision: beforeRevision };
      throw new Error(this.blocked);
    }
    this.active = true; this.applied = []; this.attempted = []; this.required = null;
    try {
      const result = invoke();
      this.receipt = { outcome: 'complete', applied: [...this.applied], attempted: [...this.attempted], required: null, reason: null,
        beforeRevision, afterRevision: spu.revision() }; return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error), partial = this.applied.length > 0 || spu.revision() !== beforeRevision;
      if (partial) this.blocked = reason;
      this.receipt = { outcome: partial ? 'partial' : 'unsupported', applied: [...this.applied], attempted: [...this.attempted],
        required: this.required, reason, beforeRevision, afterRevision: spu.revision() };
      throw error;
    } finally { this.active = false; }
  }
  /** Direct source function invocation, not evidence that SetTask executed.
   * Scheduled states call this same ordered task implementation internally. */
  runTask(event: NativeNpcDeathEvent, attackerId: string, victimId: string): NativeNpcDeathExecution {
    if (!this.scheduler) throw new Error('Native death lifecycle is unbound');
    const spu = this.scheduler.spu;
    let invoked = false;
    const result = spu.dispatchScheduler(access => { invoked = true; return this.execution(spu, access, () => {
      this.task(event, attackerId, victimId, spu, access); return 1;
    }); });
    if (!invoked && !result.supported) this.receipt = { outcome: 'blocked', applied: [], attempted: [], required: null,
      reason: result.reason, beforeRevision: result.beforeRevision, afterRevision: result.afterRevision };
    return this.executionSnapshot()!;
  }
  /** Supported state names all pass Script PSRoutine's frozen-task exceptions.
   * This schedules through the actual embedded SPU and emits no quest event. */
  schedule(name: NativeNpcDeathState): NativeRoutineResult {
    if (!this.scheduler) throw new Error('Native death lifecycle is unbound');
    if (!(name in STATES)) throw new Error('Unproved native death state registration');
    const spu = this.scheduler.spu;
    return spu.dispatchScheduler(access => this.execution(spu, access, () => {
      const id = access.snapshot().self; if (id === null || !access.resolveSelf()?.properties) throw new Error('Resolved death state owner/Routine PS required');
      this.perform({ kind: 'set-task', victimId: id, name }, spu, access); return null;
    }));
  }
  private step(state: NativeNpcDeathState, index: number, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): boolean {
    const label = this.globals.label(state, index, spu, access), snapshot = access.snapshot(), top = snapshot.frameCount - 1;
    const frame = snapshot.frames[top]; if (!frame || top < 0) throw new Error('Native death state top frame missing');
    if (frame.position > label) return false;
    access.writeFrame(top, 'position', (label + 1) | 0); return true;
  }
  private state(name: NativeNpcDeathState, spu: NativeScriptProcessingUnit, access: NativeSPUSchedulerAccess): 0 | 1 {
    const id = access.snapshot().self; if (id === null) throw new Error('Native death state Self is None');
    const victim = this.actor(id); if (victim.combat.isPlayer) throw new Error('Player death state profile is unresolved');
    if (name === 'ZS_RagDollDead') {
      if (this.step(name, 0, spu, access)) {
        this.perform({ kind: 'set-hit-points', victimId: id, value: 0, helper: '10045b20' }, spu, access);
        if (this.mode(id) === 8) { this.perform({ kind: 'set-task', victimId: id, name: 'ZS_Dead' }, spu, access); return 1; }
        this.perform(beforeRagdollKill(this.actor(id).combat), spu, access);
        const attackerId = this.attacker(this.actor(id));
        this.task('kill', attackerId, id, spu, access);
        this.perform({ kind: 'movement-mode', victimId: id, value: 14 }, spu, access);
        this.perform({ kind: 'ragdoll-after-kill', victimId: id }, spu, access);
        this.perform({ kind: 'set-state', victimId: id, name: 'ZS_RagDollDead_Loop' }, spu, access);
      }
      return 1;
    }
    if (name === 'ZS_Dead') {
      if (this.step(name, 0, spu, access)) {
        if (this.mode(id) === 9) {
          this.perform({ kind: 'force-next-pose', victimId: id, value: 1 }, spu, access);
          this.perform({ kind: 'animation-direction', victimId: id, value: 1 }, spu, access);
          this.perform({ kind: 'routine-property', victimId: id, property: 'AniState', value: 19 }, spu, access);
          this.perform({ kind: 'set-state', victimId: id, name: 'ZS_Dead_Loop' }, spu, access); return 1;
        }
        const attackerId = this.attacker(this.actor(id));
        this.task('kill', attackerId, id, spu, access);
        this.perform({ kind: 'set-hit-points', victimId: id, value: 0, helper: '10045b20' }, spu, access);
        if (this.perform({ kind: 'ai-die', victimId: id, attackerId }, spu, access) === 0) return 0;
      }
      if (this.step(name, 1, spu, access)) this.perform({ kind: 'set-state', victimId: id, name: 'ZS_Dead_Loop' }, spu, access);
      return 1;
    }
    if (this.step(name, 0, spu, access)) {
      const attackerId = this.attacker(this.actor(id));
      this.task('defeat', attackerId, id, spu, access);
      this.perform({ kind: 'say-down', victimId: id, attackerId }, spu, access);
      this.perform({ kind: 'routine-property', victimId: id, property: 'Action', value: 0 }, spu, access);
      this.perform({ kind: 'routine-property', victimId: id, property: 'AniState', value: 2 }, spu, access);
      this.perform({ kind: 'force-next-pose', victimId: id, value: 1 }, spu, access);
      if (this.perform({ kind: 'combat-move', victimId: id, attackerId, action: 30 }, spu, access) === 0) return 0;
    }
    if (this.step(name, 1, spu, access)) {
      this.perform({ kind: 'routine-property', victimId: id, property: 'AniState', value: 17 }, spu, access);
      this.perform({ kind: 'set-task-time', victimId: id, value: 0 }, spu, access);
      this.perform({ kind: 'set-state', victimId: id, name: 'ZS_Unconscious_Loop' }, spu, access);
    }
    return 1;
  }
  readonly body: NonNullable<NativeInstructionHost['script']> = (kind, name) => {
    if (kind !== 'state' || !Object.hasOwn(STATES, name)) return null;
    const state = name as NativeNpcDeathState;
    return { source: { moduleSha256: SHA, entry: STATES[state] }, invoke: (spu, access) =>
      this.execution(spu, access, () => this.state(state, spu, access)) } satisfies NativeScriptBody;
  };
}
