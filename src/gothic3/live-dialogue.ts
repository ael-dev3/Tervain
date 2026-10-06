import type { NativeCatalog, NativeInfo } from './catalog';
import { executeNativeDialogue, nativeAdjustedOwnerDistance, nativeInfoAvailability, planNativeDialogue } from './dialogue';
import type { DialogueCommandHost, DialogueExecutionPlan, DialogueFacts, DialogueOperation,
  DialogueParticipants, InfoAvailability, NativeActorCondition, NativeActorDialogCondition, NativeValue } from './dialogue';
import type { NativeQuestRuntime } from './quest-runtime';
import { nativeInfoAppendsQuestSayPairs, QuestStatus } from './quest-state';
import type { QuestLogPair } from './quest-state';
import type { ArdeaScene, ScenePerson } from './types';
import { NativeWorldData } from './native-data';
import type { NativeEntityIndex } from './native-data';
import { executeNativeScriptGiveTransfer } from './inventory';
import type { InventoryTransferContext, NativeInventory } from './inventory';

export interface LiveDialoguePositions {
  person(person: ScenePerson): readonly number[];
  player(): readonly number[];
}

const PLAYER: Readonly<{ id: string; name: string }> = Object.freeze({ id: 'PC_Hero', name: 'PC_Hero' });
const available = (): InfoAvailability => ({ kind: 'available' });
const unknown = (reason: string): InfoAvailability => ({ kind: 'unknown', reason });
const nativeWorld = new NativeWorldData();

class ArdeaDialogueFacts implements DialogueFacts {
  constructor(private readonly owner: ScenePerson, private readonly people: readonly ScenePerson[],
    private readonly positions: LiveDialoguePositions, private readonly runtime: NativeQuestRuntime,
    private readonly locations: ReadonlyMap<string, readonly NativeEntityIndex[]>,
    private readonly origin: readonly [number, number, number], private readonly locationFailure: string | null) {}

  entity(name: string): NativeValue<{ id: string; name: string } | null> {
    if (name === '') return { known: true, value: null };
    if (name === PLAYER.name) return { known: true, value: PLAYER };
    if (name === this.owner.name) return { known: true, value: { id: this.owner.id, name: this.owner.name } };
    const matches = this.people.filter((person) => person.name === name);
    if (matches.length > 1) return { known: false, reason: 'Native entity name is ambiguous in the active Ardea scene: ' + name };
    const person = matches[0];
    if (person) return { known: true, value: { id: person.id, name: person.name } };
    const locations = this.locations.get(name);
    if (locations?.length === 1 && locations[0]!.guid) return { known: true, value: { id: locations[0]!.guid!, name } };
    if (locations && locations.length > 1) return { known: false, reason: 'Native helper entity name is ambiguous in the source file: ' + name };
    if (locations) return { known: true, value: null };
    if (this.locationFailure) return { known: false, reason: this.locationFailure };
    return { known: false, reason: 'Native entity is not resolved in the active Ardea scene or selected SysDyn source: ' + name };
  }

  given(info: NativeInfo): NativeValue<boolean> { return this.runtime.infoState.given(info); }

  quest(name: string): NativeValue<{ definition: import('./catalog').NativeQuest; status: QuestStatus } | null> {
    const definition = this.runtime.definitions.find((quest) => quest.id === name);
    if (!definition) return { known: true, value: null };
    const state = this.runtime.quests.state(name);
    return state ? { known: true, value: { definition, status: state.status } }
      : { known: false, reason: 'Native quest state is not seeded: ' + name };
  }

  ownerDistance(info: NativeInfo, targetName: string): NativeValue<number> {
    if (info.owner !== this.owner.name) return { known: false, reason: 'Owner distance requested outside the active NPC.' };
    let target: readonly number[];
    let targetIsNpc = false;
    if (targetName === PLAYER.name) {
      target = this.positions.player();
      targetIsNpc = true;
    } else if (targetName === this.owner.name) {
      target = this.positions.person(this.owner);
      targetIsNpc = true;
    } else {
      const people = this.people.filter((person) => person.name === targetName);
      if (people.length > 1) return { known: false, reason: 'Distance target is ambiguous in Ardea: ' + targetName };
      if (people.length === 1) {
        target = this.positions.person(people[0]!);
        targetIsNpc = true;
      } else {
        const locations = this.locations.get(targetName);
        if (!locations) return { known: false, reason: this.locationFailure ?? ('Native distance target is not resolved in the selected SysDyn source: ' + targetName) };
        if (locations.length === 0) return { known: true, value: 99999 };
        if (locations.length !== 1) return { known: false, reason: 'Native distance target is ambiguous in the selected SysDyn source: ' + targetName };
        const position = locations[0]!.position;
        if (!position || position.length !== 3 || !position.every(Number.isFinite)) {
          return { known: false, reason: 'Native source position is unresolved for ' + targetName };
        }
        // The world index stores native centimetres; convert its point using
        // the same origin/reflection as the rendered Ardea scene.
        target = [(position[0] - this.origin[0]) / 100, (position[1] - this.origin[1]) / 100,
          -(position[2] - this.origin[2]) / 100];
        targetIsNpc = locations[0]!.propertySets.includes('gCNPC_PS');
      }
    }
    return nativeAdjustedOwnerDistance(this.positions.person(this.owner), target, targetIsNpc);
  }

  playerKnows(event: string): NativeValue<boolean> {
    try { return { known: true, value: this.runtime.gameEvents.isSet(event) }; }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }

  itemStackAmount(entity: { id: string; name: string }, templateName: string): NativeValue<number | null> {
    return this.runtime.heroItemStackAmount(entity, templateName);
  }

  actor(_entity: { id: string; name: string }): NativeValue<NativeActorCondition> {
    return { known: false, reason: 'Native NPC death and wound state are not connected.' };
  }

  actorDialog(entity: { id: string; name: string }): NativeValue<NativeActorDialogCondition> {
    return this.runtime.actorDialogs.dialog(entity);
  }

  dialogFlag(entity: { id: string; name: string }, field: 'TradeEnabled' | 'PartyEnabled' | 'TeachEnabled'): NativeValue<boolean | null> {
    return this.runtime.actorDialogs.dialogFlag(entity, field);
  }

  condition(info: NativeInfo): InfoAvailability {
    if (info.conditionType === 8) {
      if (info.owner !== this.owner.name || info.npc !== this.owner.name) {
        return unknown('Native delivery NPC does not match the active Ardea dialogue owner.');
      }
      const result = this.runtime.canDeliverFromInfo(info);
      return result.known ? available() : unknown(result.reason);
    }
    return unknown('Native condition ' + info.conditionType + ' still needs its runtime facts.');
  }

  currentPlayerPosition(): readonly number[] { return this.positions.player(); }
}

export class BrowserDialogueHost implements DialogueCommandHost {
  constructor(private readonly runtime: NativeQuestRuntime, private readonly catalog: NativeCatalog,
    private readonly facts: DialogueFacts, private readonly infos: readonly NativeInfo[],
    private readonly signal: AbortSignal, private readonly output: HTMLElement, private readonly owner: ScenePerson,
    private readonly ownerInventory: NativeInventory | null, private readonly ownerInventoryFailure: string | null) {}

  integer(value: string): NativeValue<number> {
    if (!/^[+-]?\d+$/.test(value.trim())) return { known: false, reason: 'Native integer operand is unresolved: ' + value };
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= -0x80000000 && parsed <= 0x7fffffff
      ? { known: true, value: parsed } : { known: false, reason: 'Native integer operand is outside signed32 range.' };
  }

  booleanOperand(value: string): NativeValue<boolean> {
    if (value.toLowerCase() === 'true') return { known: true, value: true };
    if (value.toLowerCase() === 'false') return { known: true, value: false };
    return { known: false, reason: 'Native boolean operand is unresolved: ' + value };
  }

  startGuards(info: NativeInfo): InfoAvailability {
    if (info.goldCost === null) return unknown('Original Info GoldCost is unresolved.');
    if (info.goldCost !== 0) return unknown('Gold-cost dialogue needs the live inventory payment path.');
    if (info.conditionType === 24 || info.conditionType === 25) return unknown('Faction friendship start guards are not connected.');
    return available();
  }

  capability(operation: DialogueOperation, preceding: readonly DialogueOperation[] = []): NativeValue<true> {
    switch (operation.kind) {
      case 'say':
        return operation.speaker && operation.listener ? { known: true, value: true }
          : { known: false, reason: 'Native Say participant is unresolved.' };
      case 'gameEvent':
        return operation.target.id === PLAYER.id ? { known: true, value: true }
          : { known: false, reason: 'Only the retained Hero PlayerMemory event array is connected.' };
      case 'experienceScript':
        return operation.other.id === PLAYER.id
          ? this.runtime.canAwardExperienceScripts([...this.priorExperienceAwards(preceding), operation.requestedAmount])
          : { known: false, reason: 'Only source-backed GiveXP awards to PC_Hero are connected.' };
      case 'give': return this.giveCapability(operation);
      case 'dialogFlag': {
        if (!operation.entity) return { known: false, reason: 'Native Dialog.' + operation.field + ' target is unresolved.' };
        const state = this.runtime.actorDialogs.dialog(operation.entity);
        return state.known && state.value.hasDialog ? { known: true, value: true }
          : state.known ? { known: false, reason: 'Native Dialog.' + operation.field + ' target has no Dialog property set.' }
          : state;
      }
      case 'quest': return this.questCapability(operation.quest, operation.operation, preceding);
      case 'end': return { known: true, value: true };
      case 'unknownNativeCommand': return { known: true, value: true };
      default: return { known: false, reason: 'Native dialogue operation is not connected: ' + operation.kind };
    }
  }

  lifecycleCapability(plan: DialogueExecutionPlan): NativeValue<true> {
    const condition = plan.info.conditionType;
    if (plan.deliveryCallback) {
      if (plan.deliveryCallback.native !== 'Game.dll::0x20035175' ||
          plan.deliveryCallback.whenNextNativeIndex !== 1 || condition !== 8 ||
          plan.info.owner !== this.owner.name || plan.info.npc !== this.owner.name) {
        return { known: false, reason: 'Only the source-matched condition-8 NPC delivery callback is connected.' };
      }
      if (plan.operations.some((operation) => operation.kind === 'quest' && operation.quest === plan.info.quest &&
          operation.sourceIndex < plan.deliveryCallback!.whenNextNativeIndex)) {
        return { known: false, reason: 'A script command changes the delivery quest before its native callback.' };
      }
      const preceding = plan.operations.filter((operation) => operation.sourceIndex < plan.deliveryCallback!.whenNextNativeIndex);
      const capability = this.runtime.canDeliverFromInfo(plan.info, this.priorExperienceAwards(preceding));
      if (!capability.known) return capability;
    }
    return this.endCapability(plan);
  }

  private endCapability(plan: DialogueExecutionPlan): NativeValue<true> {
    const condition = plan.info.conditionType;
    if (plan.endCallback.native !== 'Game.dll::0x20007d1f' || plan.endCallback.conditionType !== condition ||
        plan.endCallback.quest !== plan.info.quest) {
      return { known: false, reason: 'Native OnEndInfo callback identity does not match the selected Info record.' };
    }
    const questTransition = condition === 6 || condition === 11 || condition === 21;
    if (![2, 3, 5, 6, 7, 8, 10, 11, 19, 21].includes(condition ?? -1) ||
        ((condition === 6 || condition === 7 || condition === 8 || condition === 10 || condition === 11 || condition === 19 || condition === 21) &&
          !plan.info.quest)) {
      return { known: false, reason: 'Only source-backed no-delivery conditions and the bounded condition-8 callback are connected.' };
    }
    if (plan.info.quest) {
      const definition = this.runtime.definitions.find((quest) => quest.id === plan.info.quest);
      if (!definition) return { known: false, reason: 'Native OnEndInfo quest is not in the loaded source: ' + plan.info.quest };
      if (questTransition) {
        const expectedStatus = condition === 6 ? QuestStatus.Open : condition === 11 ? QuestStatus.Running : QuestStatus.Lost;
        const state = this.runtime.quests.state(plan.info.quest);
        if (!state || state.status !== expectedStatus) {
          return { known: false, reason: 'Native OnEndInfo quest state no longer matches condition ' + condition + '.' };
        }
        if (plan.operations.some((operation) => operation.kind === 'quest' && operation.quest === plan.info.quest)) {
          return { known: false, reason: 'A script command also changes the OnEndInfo quest; its callback ordering is not connected.' };
        }
        const capability = this.questCapability(plan.info.quest, condition === 11 ? 'close' : 'run', plan.operations);
        if (!capability.known) return capability;
      }
    }
    return { known: true, value: true };
  }

  currentAvailability(plan: DialogueExecutionPlan): InfoAvailability {
    return nativeInfoAvailability(plan.info, plan.roles, this.facts, this.infos);
  }

  async start(plan: DialogueExecutionPlan): Promise<NativeValue<boolean>> {
    if (this.signal.aborted) return { known: false, reason: 'Dialogue panel closed before native script start.' };
    const started = this.runtime.beginInfoManager(plan.roles.npc);
    return started.known ? { known: true, value: true } : started;
  }

  markGiven(info: NativeInfo): void { this.runtime.infoState.markGiven(info); }

  async execute(operation: DialogueOperation): Promise<{ kind: 'completed' | 'nativeRejected' } | { kind: 'unknown'; reason: string }> {
    if (this.signal.aborted) return { kind: 'unknown', reason: 'Dialogue panel closed during native command execution.' };
    switch (operation.kind) {
      case 'say': return await this.say(operation);
      case 'gameEvent':
        if (operation.target.id !== PLAYER.id) return { kind: 'unknown', reason: 'Native game event target is not PC_Hero.' };
        if (operation.set) this.runtime.gameEvents.set(operation.event);
        else this.runtime.gameEvents.clear(operation.event);
        return { kind: 'completed' };
      case 'experienceScript': {
        if (operation.other.id !== PLAYER.id) return { kind: 'unknown', reason: 'Native GiveXP target is not PC_Hero.' };
        const award = this.runtime.awardExperienceScript(operation.requestedAmount);
        if (!award.known) return { kind: 'unknown', reason: award.reason };
        const message = document.createElement('p');
        message.className = 'gothic-xp-message';
        message.textContent = this.catalog.text('GO_XP') + ' + ' + award.value.awardedAmount;
        this.output.append(message);
        if (award.value.progress.levelUp) {
          const levelUp = document.createElement('p');
          levelUp.className = 'gothic-xp-message';
          levelUp.textContent = this.catalog.text('GO_LevelUp');
          this.output.append(levelUp);
        }
        this.output.scrollTop = this.output.scrollHeight;
        return { kind: 'completed' };
      }
      case 'give': return this.give(operation);
      case 'dialogFlag': {
        if (!operation.entity) return { kind: 'unknown', reason: 'Native Dialog.' + operation.field + ' target is unresolved.' };
        const result = this.runtime.actorDialogs.setDialogFlag(operation.entity, operation.field, operation.value);
        return result.known ? { kind: 'completed' } : { kind: 'unknown', reason: result.reason };
      }
      case 'quest': {
        const result = operation.operation === 'run' ? this.runtime.quests.run(operation.quest)
          : operation.operation === 'close' ? this.runtime.quests.close(operation.quest)
          : this.runtime.quests.succeed(operation.quest);
        if (result.kind === 'unsupported') return { kind: 'unknown', reason: result.reason };
        return result.kind === 'rejected' ? { kind: 'nativeRejected' } : { kind: 'completed' };
      }
      // The panel returns to its response list after the complete native script;
      // End therefore shares that manager-finish boundary in this host.
      case 'end': return { kind: 'completed' };
      case 'unknownNativeCommand': {
        const warning = document.createElement('p');
        warning.className = 'warnings';
        warning.textContent = 'Original dispatcher warning: command is not in the native command table and was advanced: ' + operation.command;
        this.output.append(warning);
        return { kind: 'completed' };
      }
      default: return { kind: 'unknown', reason: 'Native dialogue operation is not connected: ' + operation.kind };
    }
  }

  async delivery(plan: DialogueExecutionPlan): Promise<NativeValue<true>> {
    if (!plan.deliveryCallback || plan.deliveryCallback.whenNextNativeIndex !== 1) {
      return { known: false, reason: 'Native delivery callback index is unresolved.' };
    }
    const preceding = plan.operations.filter((operation) => operation.sourceIndex < plan.deliveryCallback!.whenNextNativeIndex);
    return this.runtime.deliverFromInfo(plan.info, this.priorExperienceAwards(preceding));
  }

  private inventoryFor(entity: { readonly id: string; readonly name: string }): NativeInventory | null {
    if (entity.id === PLAYER.id && entity.name === PLAYER.name) return this.runtime.heroInventory;
    if (entity.id.toLowerCase() === this.owner.id.toLowerCase() && entity.name === this.owner.name) return this.ownerInventory;
    return null;
  }

  private inventoryEntityGuid(entity: { readonly id: string; readonly name: string }): NativeValue<string> {
    // Dialogue roles use PC_Hero as a symbolic browser ID. Native inventory
    // notifications require the original20-byte source entity identity.
    if (entity.id === PLAYER.id && entity.name === PLAYER.name) {
      const profile = this.runtime.heroNpcCombatProfile();
      if (!profile.known) return profile;
      if (profile.value.name !== PLAYER.name || !/^[a-f0-9]{40}$/i.test(profile.value.id)) {
        return { known: false, reason: 'The retained Hero source entity GUID is unresolved.' };
      }
      return { known: true, value: profile.value.id.toLowerCase() };
    }
    if (entity.name !== this.owner.name || entity.id.toLowerCase() !== this.owner.id.toLowerCase() ||
        !/^[a-f0-9]{40}$/i.test(entity.id)) {
      return { known: false, reason: 'The active NPC source entity GUID is unresolved.' };
    }
    return { known: true, value: entity.id.toLowerCase() };
  }

  private giveCapability(operation: Extract<DialogueOperation, { kind: 'give' }>): NativeValue<true> {
    if (!operation.donor || !operation.recipient) return { known: false, reason: 'Native Give participant is unresolved.' };
    if (operation.amount < 1) return { known: false, reason: 'Only positive Script_Game Give amounts are connected.' };
    const heroToOwner = operation.donor.id === PLAYER.id && operation.recipient.id.toLowerCase() === this.owner.id.toLowerCase();
    const ownerToHero = operation.recipient.id === PLAYER.id && operation.donor.id.toLowerCase() === this.owner.id.toLowerCase();
    if (!heroToOwner && !ownerToHero) return { known: false, reason: 'Only transfers between PC_Hero and the active Ardea dialogue owner are connected.' };
    const donor = this.inventoryFor(operation.donor);
    const recipient = this.inventoryFor(operation.recipient);
    if (!donor || !recipient) return { known: false, reason: this.ownerInventoryFailure ?? 'The active Ardea NPC inventory is not initialized.' };
    const donorGuid = this.inventoryEntityGuid(operation.donor);
    if (!donorGuid.known) return donorGuid;
    const recipientGuid = this.inventoryEntityGuid(operation.recipient);
    if (!recipientGuid.known) return recipientGuid;
    if (operation.template !== 'It_Gold') return { known: false, reason: 'Only the source-resolved Ardea It_Gold Give path is connected.' };
    const template = donor.templateByName(operation.template);
    const source = template?.source as { readonly path?: unknown; readonly sha256?: unknown } | undefined;
    if (!template || template.guid20 !== '708696aa2b91a6409241715851931dd200000000' ||
        template.useType !== 0 || template.category !== 6 || template.missionItem !== false ||
        !template.itemPropertySetPresent || source?.path !== 'Items/Items/Items_World/Miscellaneous_World_It_Gold.tple' ||
        source.sha256 !== '39663f7bc86dc6c7e6148ae4ec94e156e299582ec0f48ee9d46c16d2b302786d') {
      return { known: false, reason: 'The It_Gold donor template does not match its source-pinned native identity.' };
    }
    const donorCapability = donor.capability();
    if (donorCapability.status !== 'supported') return { known: false, reason: donorCapability.reason };
    const recipientCapability = recipient.capability();
    if (recipientCapability.status !== 'supported') return { known: false, reason: recipientCapability.reason };
    return this.runtime.canNotifyItemTransferWithoutQuestEffect(operation.donor.name, operation.recipient.name, template);
  }

  private give(operation: Extract<DialogueOperation, { kind: 'give' }>): Promise<
    { kind: 'completed' | 'nativeRejected' } | { kind: 'unknown'; reason: string }> {
    const capability = this.giveCapability(operation);
    if (!capability.known) return Promise.resolve({ kind: 'unknown', reason: capability.reason });
    const donorEntity = operation.donor!;
    const recipientEntity = operation.recipient!;
    const donor = this.inventoryFor(donorEntity)!;
    const recipient = this.inventoryFor(recipientEntity)!;
    const donorGuid = this.inventoryEntityGuid(donorEntity);
    if (!donorGuid.known) return Promise.resolve({ kind: 'unknown', reason: donorGuid.reason });
    const recipientGuid = this.inventoryEntityGuid(recipientEntity);
    if (!recipientGuid.known) return Promise.resolve({ kind: 'unknown', reason: recipientGuid.reason });
    const template = donor.templateByName(operation.template)!;
    const notification = this.runtime.canNotifyItemTransferWithoutQuestEffect(donorEntity.name, recipientEntity.name, template);
    if (!notification.known) return Promise.resolve({ kind: 'unknown', reason: notification.reason });
    const context: InventoryTransferContext = {
      donorEntityGuid20: donorGuid.value,
      recipientEntityGuid20: recipientGuid.value,
      recipientIsPlayer: recipientEntity.id === PLAYER.id,
      questNotification: { status: 'known-absent',
        source: `Game.dll::gCQuest_PS::OnReceiveItem; ${this.runtime.definitions.length} source quest records (${this.runtime.sourceQuestDefinitionsSha256()}); participant/template delivery targets checked` },
    };
    const result = executeNativeScriptGiveTransfer(donor, recipient, template.guid20, operation.amount,
      donorEntity.id === PLAYER.id, context);
    if (result.status === 'unsupported') return Promise.resolve({ kind: 'unknown', reason: result.reason });
    if (result.status === 'rejected') return Promise.resolve({ kind: 'nativeRejected' });
    if (!result.value) return Promise.resolve({ kind: 'unknown', reason: 'Native Give completed without a transfer receipt.' });
    this.runtime.inventoryChanged();
    const message = document.createElement('p');
    message.className = 'gothic-xp-message';
    message.textContent = `${donorEntity.name} → ${recipientEntity.name} · ${result.value.transferAmount.toLocaleString()} gold`;
    this.output.append(message);
    this.output.scrollTop = this.output.scrollHeight;
    return Promise.resolve({ kind: 'completed' });
  }

  async finish(plan: DialogueExecutionPlan): Promise<NativeValue<true>> {
    // Delivery already ran when the native script index reached one. Its
    // counter and completion status must not be projected again at OnEndInfo.
    const lifecycle = this.endCapability(plan);
    if (!lifecycle.known) return lifecycle;
    const condition = plan.endCallback.conditionType;
    const pairs: QuestLogPair[] = nativeInfoAppendsQuestSayPairs(condition) ? plan.operations.flatMap((operation) => operation.kind === 'say'
        ? [{ version: 1, speakerKey: operation.speaker ? 'FO_It_' + operation.speaker.name : '', textKey: operation.textKey }]
        : []) : [];
    const result = this.runtime.quests.onEndInfo(plan.endCallback.quest, condition, pairs);
    if (result.kind !== 'applied') return { known: false, reason: result.reason };
    return { known: true, value: true };
  }

  private questCapability(id: string, operation: 'run' | 'close' | 'succeed',
      preceding: readonly DialogueOperation[] = []): NativeValue<true> {
    const quest = this.runtime.definitions.find((candidate) => candidate.id === id);
    if (!quest) return { known: false, reason: 'Native quest definition is not in the loaded source: ' + id };
    if (quest.numericType === 5 || quest.numericType === 12) {
      return { known: false, reason: 'Arena quest status notifications are not connected: ' + id };
    }
    if (operation === 'succeed') {
      return this.runtime.canSucceedQuest(id, this.priorExperienceAwards(preceding));
    }
    return { known: true, value: true };
  }

  private priorExperienceAwards(operations: readonly DialogueOperation[]): number[] {
    const amounts: number[] = [];
    for (const operation of operations) {
      if (operation.kind === 'experienceScript') amounts.push(operation.requestedAmount);
      else if (operation.kind === 'quest' && operation.operation === 'succeed') {
        const quest = this.runtime.definitions.find((candidate) => candidate.id === operation.quest);
        if (quest?.rewards.experience !== null && quest?.rewards.experience !== undefined && quest.rewards.experience !== 0) {
          amounts.push(quest.rewards.experience);
        }
      }
    }
    return amounts;
  }

  private say(operation: Extract<DialogueOperation, { kind: 'say' }>): Promise<{ kind: 'completed' } | { kind: 'unknown'; reason: string }> {
    const line = document.createElement('article');
    line.className = 'gothic-dialogue-line';
    const speaker = document.createElement('strong');
    speaker.textContent = operation.speaker?.id === PLAYER.id ? 'Nameless Hero' : operation.speaker?.name ?? 'Unknown speaker';
    const text = document.createElement('p');
    text.className = 'dialogue-line';
    text.textContent = this.catalog.text(operation.textKey);
    line.append(speaker, text);
    if (operation.mode === 'comment') line.dataset.mode = 'comment';
    this.output.append(line);
    this.output.scrollTop = this.output.scrollHeight;
    const next = document.createElement('button');
    next.textContent = 'Continue';
    next.className = 'dialogue-continue';
    this.output.append(next);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: { kind: 'completed' } | { kind: 'unknown'; reason: string }): void => {
        if (settled) return;
        settled = true;
        this.signal.removeEventListener('abort', abort);
        next.remove();
        resolve(result);
      };
      const abort = (): void => finish({ kind: 'unknown', reason: 'Dialogue panel closed before this line was continued.' });
      next.onclick = () => finish({ kind: 'completed' });
      this.signal.addEventListener('abort', abort, { once: true });
    });
  }
}

function infoLabel(info: NativeInfo, catalog: NativeCatalog, owner: ScenePerson): string {
  const playerPrompt = info.commands.find((command) => command.command.toLowerCase() === 'say' && command.entity1.toLowerCase() === 'player');
  if (playerPrompt) {
    const prompt = catalog.text(playerPrompt.text).trim();
    if (prompt) return prompt;
  }
  const description = info.commands.find((command) => command.command.toLowerCase() === 'description');
  if (description) {
    const label = catalog.text(description.text).trim();
    if (label) return label;
  }
  return info.type === 2 ? 'Hear ' + owner.name + '’s news' : 'Continue the conversation';
}

/** Execute only source records whose current predicates, commands and completion callback are all supported. */
export async function showLiveDialogue(parent: HTMLElement, owner: ScenePerson, people: readonly ScenePerson[],
  positions: LiveDialoguePositions, runtime: NativeQuestRuntime, catalog: NativeCatalog,
  spawnSource: Pick<NonNullable<ArdeaScene['spawnSource']>, 'path' | 'sha256'>,
  origin: readonly [number, number, number], signal: AbortSignal,
  resolveOwnerInventory?: () => Promise<NativeInventory | null>): Promise<void> {
  const intro = document.createElement('p');
  intro.textContent = 'Original English dialogue. Bounded source predicates, quest transitions and rewards, game events, trade flags and Hero XP are live; enclave rewards, arena updates, tutorial popups, voice, camera direction, NPC behavior, commerce and other native services are still being rebuilt.';
  parent.append(intro);
  const log = document.createElement('div');
  log.className = 'gothic-dialogue-log';
  parent.append(log);
  const status = document.createElement('p');
  status.className = 'record-meta';
  parent.append(status);
  const options = document.createElement('div');
  options.className = 'gothic-dialogue-options';
  parent.append(options);
  let busy = false;

  try {
    await catalog.load();
    const knownCommands = await catalog.nativeCommandNames();
    if (signal.aborted || !parent.isConnected) return;
    const peopleNames = new Set(people.map((person) => person.name));
    const candidates = catalog.forOwner(owner.name).filter((info) => !info.parent && info.type !== 4);
    let ownerInventory: NativeInventory | null = null;
    let ownerInventoryFailure: string | null = null;
    if (candidates.some((info) => info.commands.some((command) => command.command.toLowerCase() === 'give')) && resolveOwnerInventory) {
      try { ownerInventory = await resolveOwnerInventory(); }
      catch (error) { ownerInventoryFailure = error instanceof Error ? error.message : String(error); }
    }
    if (signal.aborted || !parent.isConnected) return;
    const entityNames = [...new Set(candidates.flatMap((info) => [
      info.conditions.ownerNearEntity,
      ...info.conditions.secondaryNPCs.map((secondary) => secondary.entity),
    ]).filter((name) => name !== '' && name !== PLAYER.name && !peopleNames.has(name)))];
    let locations: ReadonlyMap<string, readonly NativeEntityIndex[]> = new Map();
    let locationFailure: string | null = null;
    const source = await nativeWorld.sourceByPath(spawnSource.path);
    if (source.kind === 'found' && source.value.source.sha256 === spawnSource.sha256) {
      try { locations = await nativeWorld.entitiesNamed(source.value.index, entityNames); }
      catch (error) { locationFailure = 'Native SysDyn entity index could not be verified: ' + (error instanceof Error ? error.message : String(error)); }
    } else if (source.kind === 'found') {
      locationFailure = 'Native SysDyn source hash differs from the Ardea scene manifest.';
    } else if (source.kind === 'ambiguous') {
      locationFailure = 'Selected native SysDyn path is ambiguous in the gameplay source index.';
    } else {
      locationFailure = source.reason;
    }
    if (signal.aborted || !parent.isConnected) return;
    const player = PLAYER;
    const npc = { id: owner.id, name: owner.name };
    const participants: DialogueParticipants = { player, a: npc, b: player };
    const facts = new ArdeaDialogueFacts(owner, people, positions, runtime, locations, origin, locationFailure);
    const host = new BrowserDialogueHost(runtime, catalog, facts, catalog.infos, signal, log, owner,
      ownerInventory, ownerInventoryFailure);
    let notice: string | null = null;

    const render = (): void => {
      if (signal.aborted || !options.isConnected) return;
      options.replaceChildren();
      let readyCount = 0;
      const pending: { info: NativeInfo; reason: string }[] = [];
      const unmet: { info: NativeInfo; reason: string }[] = [];
      for (const info of candidates) {
        const result = planNativeDialogue(info, participants, facts, catalog.infos, host, knownCommands);
        if (result.kind === 'ready') {
          readyCount++;
          const button = document.createElement('button');
          button.textContent = infoLabel(info, catalog, owner);
          button.disabled = busy;
          button.onclick = () => {
            if (busy || signal.aborted) return;
            busy = true;
            notice = null;
            render();
            void executeNativeDialogue(result.plan, host).then((completed) => {
              busy = false;
              if (signal.aborted) return;
              notice = completed.known ? 'Dialogue record complete · ' + info.id
                : 'Dialogue stopped at an unsupported native boundary: ' + completed.reason;
              render();
            }).catch((error: unknown) => {
              busy = false;
              if (signal.aborted) return;
              notice = 'Dialogue error: ' + (error instanceof Error ? error.message : String(error));
              render();
            });
          };
          options.append(button);
        } else if (result.kind === 'unknown') pending.push({ info, reason: result.reason });
        else unmet.push({ info, reason: result.reason });
      }
      if (busy) status.textContent = 'Running a source dialogue…';
      else if (notice) status.textContent = notice;
      else if (readyCount === 0) status.textContent = 'No source dialogue is currently ready for ' + owner.name + '.';
      else status.textContent = readyCount + ' source response' + (readyCount === 1 ? '' : 's') + ' available.';
      if (pending.length) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = pending.length + ' other responses need native state not connected yet';
        details.append(summary);
        for (const entry of pending) {
          const row = document.createElement('p');
          row.textContent = entry.info.id + ' · ' + entry.reason;
          details.append(row);
        }
        options.append(details);
      }
      if (unmet.length) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = unmet.length + ' source responses have unmet conditions';
        details.append(summary);
        for (const entry of unmet) {
          const row = document.createElement('p');
          row.textContent = infoLabel(entry.info, catalog, owner) + ' · ' + entry.info.id + ' · ' + entry.reason;
          details.append(row);
        }
        options.append(details);
      }
    };
    render();
  } catch (error) {
    if (signal.aborted || !parent.isConnected) return;
    status.textContent = 'Original dialogue could not be initialized: ' + (error instanceof Error ? error.message : String(error));
    status.classList.add('warnings');
  }
}
