import type { NativeCommand, NativeInfo, NativeQuest } from './catalog';
import { QuestStatus } from './quest-state';

/** A missing entity is a native lookup result; an unloaded entity is unknown. */
export type NativeValue<T> = { known: true; value: T } | { known: false; reason: string };
export type InfoAvailability =
  | { kind: 'available' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'unknown'; reason: string };
export interface DialogueEntity { id: string; name: string }
export interface DialogueParticipants {
  player: DialogueEntity;
  /** StartInfoManager normalizes A to the player when B is the player. */
  a: DialogueEntity;
  b: DialogueEntity;
}
export interface DialogueRoles extends DialogueParticipants {
  self: DialogueEntity;
  other: DialogueEntity;
  npc: DialogueEntity;
}
export interface NativeActorCondition {
  hasNpc: boolean;
  dead: boolean;
  wounded: boolean;
  hasDialog: boolean;
  talkedToPlayer: boolean;
}
export interface NativeActorDialogCondition {
  hasNpc: boolean;
  hasDialog: boolean;
  talkedToPlayer: boolean;
}

/** Callers supply runtime facts; source lookup alone does not establish them. */
export interface DialogueFacts {
  entity(name: string): NativeValue<DialogueEntity | null>;
  given(info: NativeInfo): NativeValue<boolean>;
  quest(name: string): NativeValue<{ definition: NativeQuest; status: QuestStatus } | null>;
  /** Native adjusted distance: world distance *0.25 for NPC targets, *1 otherwise; missing=99999. */
  ownerDistance(info: NativeInfo, targetName: string): NativeValue<number>;
  playerKnows(event: string): NativeValue<boolean>;
  /** Native FindStack returns one matching stack, not a sum of all stacks. */
  itemStackAmount(entity: DialogueEntity, templateName: string): NativeValue<number | null>;
  actor(entity: DialogueEntity): NativeValue<NativeActorCondition>;
  actorDialog(entity: DialogueEntity): NativeValue<NativeActorDialogCondition>;
  dialogFlag(entity: DialogueEntity, field: 'TradeEnabled' | 'PartyEnabled' | 'TeachEnabled'): NativeValue<boolean | null>;
  /** Handles each unported native condition explicitly. No default true. */
  condition(info: NativeInfo, roles: DialogueRoles): InfoAvailability;
}

const available = (): { kind: 'available' } => ({ kind: 'available' });
const unavailable = (reason: string): { kind: 'unavailable'; reason: string } => ({ kind: 'unavailable', reason });
const unknown = (reason: string): { kind: 'unknown'; reason: string } => ({ kind: 'unknown', reason });
const sameEntity = (a: DialogueEntity, b: DialogueEntity): boolean => a.id === b.id;

/** Game.dll scales NPC-target distances by 0.25 and other world distances by 1.
 * Positions are in browser metres; the native condition compares centimetres. */
export function nativeAdjustedOwnerDistance(ownerPosition: readonly number[], targetPosition: readonly number[],
  targetIsNpc: boolean): NativeValue<number> {
  if (ownerPosition.length !== 3 || targetPosition.length !== 3 ||
      !ownerPosition.every(Number.isFinite) || !targetPosition.every(Number.isFinite)) {
    return { known: false, reason: 'Native distance position is malformed.' };
  }
  return { known: true, value: Math.hypot(ownerPosition[0]! - targetPosition[0]!,
    ownerPosition[1]! - targetPosition[1]!, ownerPosition[2]! - targetPosition[2]!) * (targetIsNpc ? 25 : 100) };
}

export function nativeDialogueRoles(info: NativeInfo, input: DialogueParticipants): DialogueRoles {
  const participants = sameEntity(input.b, input.player) ? { ...input, a: input.b, b: input.a } : input;
  // Native GetCurrentSelf compares Owner with B's name using string equality.
  const ownerIsB = info.owner === participants.b.name;
  return { ...participants, self: ownerIsB ? participants.b : participants.a,
    other: ownerIsB ? participants.a : participants.b,
    npc: sameEntity(participants.a, participants.player) ? participants.b : participants.a };
}

/** FindEntityFromString aliases are case insensitive, native scene names are not rewritten. */
export function resolveDialogueEntity(name: string, roles: DialogueRoles, facts: DialogueFacts): NativeValue<DialogueEntity | null> {
  switch (name.toLowerCase()) {
    case 'player': return { known: true, value: roles.player };
    case 'npc': return { known: true, value: roles.npc };
    case 'self': case 'owner': case '<owner>': return { known: true, value: roles.self };
    case 'other': return { known: true, value: roles.other };
    default: return facts.entity(name);
  }
}

export function resolveCommandEntities(command: NativeCommand, roles: DialogueRoles, facts: DialogueFacts):
  NativeValue<{ entity1: DialogueEntity | null; entity2: DialogueEntity | null }> {
  const first = resolveDialogueEntity(command.entity1, roles, facts);
  if (!first.known) return first;
  // Empty Entity2 chooses the opposite role of resolved Entity1, not always NPC.
  const second = resolveDialogueEntity(command.entity2 ||
    (first.value && sameEntity(first.value, roles.self) ? 'other' : 'self'), roles, facts);
  if (!second.known) return second;
  return { known: true, value: { entity1: first.value, entity2: second.value } };
}

export function isFinalQuestStatus(status: QuestStatus): boolean {
  return status !== QuestStatus.Open && status !== QuestStatus.Running && status !== QuestStatus.Lost;
}

/** Derived IsPermanent is broader than the serialized Permanent field. */
export function nativeInfoIsPermanent(info: NativeInfo, roles: DialogueRoles, resolvedOwner: DialogueEntity): boolean {
  // Fresh omitted Permanent=false is byte-proven; null still describes source absence.
  return info.type === 0 || info.type === 4 || info.conditionType === 9 ||
    info.conditionType === 51 || info.conditionType === 52 || info.permanent === true ||
    sameEntity(resolvedOwner, roles.player);
}

/** Game.dll IsAvailable/AreConditionsFulfilled. Unported predicates stay unknown. */
export function nativeInfoAvailability(info: NativeInfo, participants: DialogueParticipants, facts: DialogueFacts,
  infos: readonly NativeInfo[], evaluating: ReadonlySet<string> = new Set()): InfoAvailability {
  if (evaluating.has(info.id)) return unknown('Cyclic native parent-info availability: ' + info.id);
  if (info.conditionType === null || info.type === null) return unknown('Info numeric fields have not been initialized: ' + info.id);
  const roles = nativeDialogueRoles(info, participants);
  const given = facts.given(info);
  if (!given.known) return unknown(given.reason);
  if (given.value && info.conditionType !== 51) return unavailable('Info is already Given.');
  const owner = facts.entity(info.owner);
  if (!owner.known) return unknown(owner.reason);
  if (!owner.value) return unavailable('Native Owner entity does not resolve.');
  let quest: { definition: NativeQuest; status: QuestStatus } | null = null;
  if (info.quest) {
    const value = facts.quest(info.quest);
    if (!value.known) return unknown(value.reason);
    if (!value.value) return unavailable('Native Quest name does not resolve.');
    quest = value.value;
  }
  if (info.conditions.ownerNearEntity) {
    const distance = facts.ownerDistance(info, info.conditions.ownerNearEntity);
    if (!distance.known) return unknown(distance.reason);
    if (distance.value > 500) return unavailable('Native adjusted owner-to-entity distance exceeds 500 (' +
      distance.value.toFixed(1) + ' / 500).');
  }
  switch (info.conditionType) {
    case 2: {
      // Hello only consumes the owner's Dialog property and TalkedToPlayer
      // flag. Death/wound state belongs to the separate secondary-NPC tests.
      const actor = facts.actorDialog(owner.value);
      if (!actor.known) return unknown(actor.reason);
      if (!actor.value.hasDialog || actor.value.talkedToPlayer) return unavailable('Hello requires an untalked-to owner with Dialog property set.');
      break;
    }
    case 5: case 6: {
      if (!quest || quest.status !== QuestStatus.Open) return unavailable('Open/Activator requires an Open quest.');
      for (const name of quest.definition.prereqs) {
        const prerequisite = facts.quest(name);
        if (!prerequisite.known) return unknown(prerequisite.reason);
        // Native warns and continues when a prerequisite name is absent.
        if (prerequisite.value && !isFinalQuestStatus(prerequisite.value.status)) return unavailable('Prerequisite quest is not in a final state: ' + name);
      }
      if (quest.definition.numericType === null || quest.definition.numericType === 5) {
        const arena = facts.condition(info, roles);
        if (arena.kind !== 'available') return arena;
      }
      break;
    }
    case 7: case 11:
      if (!quest || quest.status !== QuestStatus.Running) return unavailable('Condition requires a Running quest.');
      break;
    case 8: {
      if (!quest || quest.status !== QuestStatus.Running) return unavailable('Delivery requires a Running quest.');
      const condition = facts.condition(info, roles);
      if (condition.kind !== 'available') return condition;
      break;
    }
    case 10: case 12: case 13: case 20: case 21: case 22: {
      const wanted = info.conditionType === 10 ? QuestStatus.Success : info.conditionType === 12 ? QuestStatus.Failed
        : info.conditionType === 13 ? QuestStatus.Cancelled : info.conditionType === 22 ? QuestStatus.Won : QuestStatus.Lost;
      if (!quest || quest.status !== wanted) return unavailable('Quest status does not match the original condition.');
      break;
    }
    case 17: {
      const flag = facts.dialogFlag(owner.value, 'TradeEnabled');
      if (!flag.known) return unknown(flag.reason);
      if (flag.value !== true) return unavailable('Trade requires owner Dialog.TradeEnabled.');
      break;
    }
    case 19:
      if (!quest || isFinalQuestStatus(quest.status)) return unavailable('Ready requires a quest outside its final state.');
      break;
    // These conditions have no extra switch branch in AreConditionsFulfilled.
    // 24/25 still require reputation gates before native Execute can start.
    case 3: case 24: case 25: case 50: case 51: case 52: break;
    default: {
      const condition = facts.condition(info, roles);
      if (condition.kind !== 'available') return condition;
    }
  }
  const container = facts.entity(info.conditions.itemContainer);
  if (!container.known && info.conditions.items.length) return unknown(container.reason);
  // Native skips CondItems when the named container does not resolve.
  if (container.known && container.value) {
    for (const item of info.conditions.items) {
      if (item.amount === null) return unknown('Conditional item amount is unresolved.');
      const amount = facts.itemStackAmount(container.value, item.id);
      if (!amount.known) return unknown(amount.reason);
      if (amount.value === null || amount.value < item.amount) return unavailable('Conditional item stack is insufficient: ' + item.id);
    }
  }
  for (const event of info.conditions.playerKnows) {
    const knows = facts.playerKnows(event);
    if (!knows.known) return unknown(knows.reason);
    if (!knows.value) return unavailable('Player does not know native game event: ' + event);
  }
  for (const secondary of info.conditions.secondaryNPCs) {
    if (secondary.state === null) return unknown('Secondary NPC numeric condition is unresolved.');
    const entity = facts.entity(secondary.entity);
    if (!entity.known) return unknown(entity.reason);
    if (!entity.value) {
      if (secondary.state < 2 || secondary.state === 5) return unavailable('Required secondary NPC does not resolve.');
      // Native breaks the entire secondary-NPC loop for this missing-entity case.
      break;
    }
    if (secondary.state === 4 || secondary.state === 5) {
      const actor = facts.actorDialog(entity.value);
      if (!actor.known) return unknown(actor.reason);
      if (!actor.value.hasNpc) return unavailable('Secondary entity has no native NPC property set.');
      if (secondary.state === 4 && (!actor.value.hasDialog || !actor.value.talkedToPlayer)) {
        return unavailable('Secondary NPC has not ended a dialog with the player.');
      }
      if (secondary.state === 5 && (!actor.value.hasDialog || actor.value.talkedToPlayer)) {
        return unavailable('Secondary NPC does not meet the original not-talked state condition.');
      }
    } else {
      const actor = facts.actor(entity.value);
      if (!actor.known) return unknown(actor.reason);
      if (!actor.value.hasNpc) return unavailable('Secondary entity has no native NPC property set.');
      const value = actor.value;
      if ((secondary.state === 0 && value.dead) || (secondary.state === 1 && (value.dead || value.wounded)) ||
          (secondary.state === 2 && !value.wounded) || (secondary.state === 3 && !value.dead)) {
        return unavailable('Secondary NPC does not meet the original state condition.');
      }
    }
  }
  if (info.conditions.playerSkills.length || info.conditions.namedPlayerSkills.length) {
    return unknown('Conditional skill serialization requires an independently mapped native consumer.');
  }
  if (info.type === 4) {
    const nested = new Set(evaluating).add(info.id);
    let pending: string | undefined;
    for (const child of infos) {
      if (child.parent !== info.id || child.conditionType === 52) continue;
      const result = nativeInfoAvailability(child, participants, facts, infos, nested);
      if (result.kind === 'available') return result;
      if (result.kind === 'unknown') pending = result.reason;
    }
    return pending ? unknown(pending) : unavailable('Parent has no available child other than Back.');
  }
  return available();
}

export type DialogueOperation =
  | { kind: 'say'; mode: 'info' | 'comment'; speaker: DialogueEntity | null; listener: DialogueEntity | null; textKey: string; sourceIndex: number }
  | { kind: 'gameEvent'; event: string; set: boolean; target: DialogueEntity; sourceIndex: number }
  | { kind: 'quest'; operation: 'run' | 'close' | 'succeed'; quest: string; sourceIndex: number }
  | { kind: 'experienceScript'; self: null; other: DialogueEntity; requestedAmount: number; sourceIndex: number }
  | { kind: 'give'; donor: DialogueEntity | null; recipient: DialogueEntity | null; template: string; quality: 0; amount: number; sourceIndex: number }
  | { kind: 'dialogFlag'; entity: DialogueEntity | null; field: 'TradeEnabled' | 'PartyEnabled' | 'TeachEnabled'; value: boolean; sourceIndex: number }
  | { kind: 'end'; sourceIndex: number }
  | { kind: 'back'; sourceIndex: number }
  | { kind: 'unknownNativeCommand'; command: string; sourceIndex: number };
export interface DialogueExecutionPlan {
  info: NativeInfo;
  roles: DialogueRoles;
  operations: DialogueOperation[];
  markGivenOnStart: boolean;
  /** Advance the original script index, skipping Description, before checking index==1. */
  deliveryCallback: { native: 'Game.dll::0x20035175'; whenNextNativeIndex: 1 } | null;
  endCallback: { native: 'Game.dll::0x20007d1f'; conditionType: number; quest: string };
}
export type DialoguePlanResult = { kind: 'ready'; plan: DialogueExecutionPlan } | { kind: 'unavailable' | 'unknown'; reason: string };

export interface DialogueCommandHost {
  integer(value: string): NativeValue<number>;
  booleanOperand(value: string): NativeValue<boolean>;
  /** Reports native Execute guards, including gold cost and condition-specific gates. */
  startGuards(info: NativeInfo, roles: DialogueRoles): InfoAvailability;
  capability(operation: DialogueOperation, precedingOperations?: readonly DialogueOperation[]): NativeValue<true>;
  lifecycleCapability(plan: DialogueExecutionPlan): NativeValue<true>;
  /** Re-read runtime predicates before starting a previously prepared plan. */
  currentAvailability(plan: DialogueExecutionPlan): InfoAvailability;
  /** Accept actual script start; never called until every capability is supported. */
  start(plan: DialogueExecutionPlan): Promise<NativeValue<boolean>>;
  markGiven(info: NativeInfo): void;
  /** nativeRejected means the native primitive returned false; dispatch still advances. */
  execute(operation: DialogueOperation): Promise<{ kind: 'completed' | 'nativeRejected' } | { kind: 'unknown'; reason: string }>;
  delivery(plan: DialogueExecutionPlan): Promise<NativeValue<true>>;
  finish(plan: DialogueExecutionPlan): Promise<NativeValue<true>>;
}

/** Preflight has no effects and never consumes unsupported Info records. */
export function planNativeDialogue(info: NativeInfo, participants: DialogueParticipants, facts: DialogueFacts,
  infos: readonly NativeInfo[], host: DialogueCommandHost, nativeCommandNames: ReadonlySet<string>): DialoguePlanResult {
  if (info.issues.length) return unknown('Original INI parser anomalies need native-consumer review: ' + info.id);
  const eligibility = nativeInfoAvailability(info, participants, facts, infos);
  if (eligibility.kind !== 'available') return eligibility;
  const roles = nativeDialogueRoles(info, participants);
  const guards = host.startGuards(info, roles);
  if (guards.kind !== 'available') return guards;
  const owner = facts.entity(info.owner);
  if (!owner.known) return unknown(owner.reason);
  if (!owner.value) return unavailable('Native Owner entity does not resolve.');
  const knownCommands = new Set([...nativeCommandNames].map((name) => name.toLowerCase()));
  const operations: DialogueOperation[] = [];
  for (const command of info.commands) {
    if (command.command.toLowerCase() === 'description') continue;
    const sourceIndex = command.index;
    let operation: DialogueOperation;
    switch (command.command.toLowerCase()) {
      case 'say': case 'give': case 'settradeenabled': case 'setpartyenabled': case 'setteachenabled': {
        const entities = resolveCommandEntities(command, roles, facts);
        if (!entities.known) return unknown(entities.reason);
        const { entity1, entity2 } = entities.value;
        if (command.command.toLowerCase() === 'say') operation = { kind: 'say', mode: info.type === 5 ? 'comment' : 'info', speaker: entity1, listener: entity2, textKey: command.text, sourceIndex };
        else if (command.command.toLowerCase() === 'give') {
          const amount = host.integer(command.id2);
          if (!amount.known) return unknown(amount.reason);
          operation = { kind: 'give', donor: entity1, recipient: entity2, template: command.id1, quality: 0, amount: amount.value, sourceIndex };
        } else {
          const flag = host.booleanOperand(command.id1);
          if (!flag.known) return unknown(flag.reason);
          const field = command.command.toLowerCase() === 'settradeenabled' ? 'TradeEnabled'
            : command.command.toLowerCase() === 'setpartyenabled' ? 'PartyEnabled' : 'TeachEnabled';
          operation = { kind: 'dialogFlag', entity: entity1, field, value: flag.value, sourceIndex };
        }
        break;
      }
      case 'givexp': {
        const amount = host.integer(command.id1);
        if (!amount.known) return unknown(amount.reason);
        operation = { kind: 'experienceScript', self: null, other: roles.player, requestedAmount: amount.value, sourceIndex };
        break;
      }
      case 'setgameevent': case 'cleargameevent':
        operation = { kind: 'gameEvent', event: command.id1, set: command.command.toLowerCase() === 'setgameevent', target: roles.player, sourceIndex }; break;
      case 'runquest': case 'closequest': case 'succeedquest':
        operation = { kind: 'quest', operation: command.command.toLowerCase() === 'runquest' ? 'run' : command.command.toLowerCase() === 'closequest' ? 'close' : 'succeed', quest: command.id1, sourceIndex }; break;
      case 'end': operation = { kind: 'end', sourceIndex }; break;
      case 'back': operation = { kind: 'back', sourceIndex }; break;
      default:
        if (!command.command) return unknown('Native empty-command handling depends on entity/routine warning state.');
        if (knownCommands.has(command.command.toLowerCase())) return unknown('Original native command is not ported: ' + command.command);
        // Original SuccessQuest typo takes this native warning/advance path.
        operation = { kind: 'unknownNativeCommand', command: command.command, sourceIndex };
    }
    const capability = host.capability(operation, operations);
    if (!capability.known) return unknown(capability.reason);
    operations.push(operation);
  }
  const plan: DialogueExecutionPlan = { info, roles, operations,
    markGivenOnStart: !nativeInfoIsPermanent(info, roles, owner.value),
    deliveryCallback: info.conditionType === 8 || info.conditionType === 9 ? { native: 'Game.dll::0x20035175', whenNextNativeIndex: 1 } : null,
    endCallback: { native: 'Game.dll::0x20007d1f', conditionType: info.conditionType!, quest: info.quest } };
  const lifecycle = host.lifecycleCapability(plan);
  return lifecycle.known ? { kind: 'ready', plan } : unknown(lifecycle.reason);
}

/** Host owns asynchronous Say completion and native inventory/quest/UI effects. */
export async function executeNativeDialogue(plan: DialogueExecutionPlan, host: DialogueCommandHost): Promise<NativeValue<true>> {
  // Recheck capabilities before start: a planning result does not reserve state.
  for (const operation of plan.operations) {
    const capability = host.capability(operation);
    if (!capability.known) return capability;
  }
  const lifecycle = host.lifecycleCapability(plan);
  if (!lifecycle.known) return lifecycle;
  const eligibility = host.currentAvailability(plan);
  if (eligibility.kind !== 'available') return { known: false, reason: eligibility.reason };
  const guards = host.startGuards(plan.info, plan.roles);
  if (guards.kind !== 'available') return { known: false, reason: guards.reason };
  const started = await host.start(plan);
  if (!started.known) return started;
  if (!started.value) return { known: false, reason: 'Native InfoScript start was not accepted.' };
  if (plan.markGivenOnStart) host.markGiven(plan.info);
  for (const operation of plan.operations) {
    const result = await host.execute(operation);
    if (result.kind === 'unknown') return { known: false, reason: result.reason };
    let nextIndex = operation.sourceIndex + 1;
    while (plan.info.commands[nextIndex]?.command.toLowerCase() === 'description') nextIndex++;
    if (plan.deliveryCallback && nextIndex === 1) {
      const delivered = await host.delivery(plan);
      if (!delivered.known) return delivered;
    }
  }
  return host.finish(plan);
}
