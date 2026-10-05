import type { NativeCatalog, NativeInfo } from './catalog';
import { executeNativeDialogue, nativeInfoAvailability, planNativeDialogue } from './dialogue';
import type { DialogueCommandHost, DialogueExecutionPlan, DialogueFacts, DialogueOperation,
  DialogueParticipants, InfoAvailability, NativeActorCondition, NativeActorDialogCondition, NativeValue } from './dialogue';
import type { NativeQuestRuntime } from './quest-runtime';
import { QuestStatus } from './quest-state';
import type { QuestLogPair } from './quest-state';
import type { ArdeaScene, ScenePerson } from './types';
import { NativeWorldData } from './native-data';
import type { NativeEntityIndex } from './native-data';

const PLAYER: Readonly<{ id: string; name: string }> = Object.freeze({ id: 'PC_Hero', name: 'PC_Hero' });
const available = (): InfoAvailability => ({ kind: 'available' });
const unknown = (reason: string): InfoAvailability => ({ kind: 'unknown', reason });
const nativeWorld = new NativeWorldData();

class ArdeaDialogueFacts implements DialogueFacts {
  constructor(private readonly owner: ScenePerson, private readonly people: readonly ScenePerson[],
    private readonly playerPosition: readonly number[], private readonly runtime: NativeQuestRuntime,
    private readonly locations: ReadonlyMap<string, readonly NativeEntityIndex[]>,
    private readonly origin: readonly [number, number, number], private readonly locationFailure: string | null) {}

  entity(name: string): NativeValue<{ id: string; name: string } | null> {
    if (name === '') return { known: true, value: null };
    if (name === PLAYER.name) return { known: true, value: PLAYER };
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
      target = this.playerPosition;
      targetIsNpc = true;
    } else {
      const people = this.people.filter((person) => person.name === targetName);
      if (people.length > 1) return { known: false, reason: 'Distance target is ambiguous in Ardea: ' + targetName };
      if (people.length === 1) {
        target = people[0]!.position;
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
    if (target.length !== 3 || this.owner.position.length !== 3 || !target.every(Number.isFinite) ||
        !this.owner.position.every(Number.isFinite)) return { known: false, reason: 'Native distance position is malformed.' };
    const ownerDelta = this.owner.position;
    const distanceMetres = Math.hypot(ownerDelta[0]! - target[0]!, ownerDelta[1]! - target[1]!, ownerDelta[2]! - target[2]!);
    // Game.dll multiplies NPC targets by .25 and other entities by 1.
    return { known: true, value: distanceMetres * (targetIsNpc ? 25 : 100) };
  }

  playerKnows(event: string): NativeValue<boolean> {
    try { return { known: true, value: this.runtime.gameEvents.isSet(event) }; }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }

  itemStackAmount(_entity: { id: string; name: string }, _templateName: string): NativeValue<number | null> {
    return { known: false, reason: 'Live player inventory stacks are not connected to dialogue predicates.' };
  }

  actor(_entity: { id: string; name: string }): NativeValue<NativeActorCondition> {
    return { known: false, reason: 'Native NPC death and wound state are not connected.' };
  }

  actorDialog(entity: { id: string; name: string }): NativeValue<NativeActorDialogCondition> {
    return this.runtime.actorDialogs.dialog(entity);
  }

  dialogFlag(_entity: { id: string; name: string }, field: 'TradeEnabled'): NativeValue<boolean | null> {
    return { known: false, reason: 'Live NPC Dialog.' + field + ' state is not connected.' };
  }

  condition(info: NativeInfo): InfoAvailability {
    return unknown('Native condition ' + info.conditionType + ' still needs its runtime facts.');
  }

  currentPlayerPosition(): readonly number[] { return this.playerPosition; }
}

class BrowserDialogueHost implements DialogueCommandHost {
  constructor(private readonly runtime: NativeQuestRuntime, private readonly catalog: NativeCatalog,
    private readonly facts: ArdeaDialogueFacts, private readonly infos: readonly NativeInfo[],
    private readonly signal: AbortSignal, private readonly output: HTMLElement) {}

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
      case 'quest': return this.questCapability(operation.quest, operation.operation, preceding);
      case 'end': return { known: true, value: true };
      case 'unknownNativeCommand': return { known: true, value: true };
      default: return { known: false, reason: 'Native dialogue operation is not connected: ' + operation.kind };
    }
  }

  lifecycleCapability(plan: DialogueExecutionPlan): NativeValue<true> {
    if (plan.deliveryCallback) return { known: false, reason: 'Original delivery callbacks are not connected.' };
    const condition = plan.info.conditionType;
    const supportsQuestLog = condition === 3 || condition === 19;
    if (!supportsQuestLog || (condition === 19 && plan.info.quest === '') || (plan.info.quest !== '' && !supportsQuestLog)) {
      return { known: false, reason: 'Only source-backed condition 3/19 completion paths without delivery callbacks are connected.' };
    }
    if (plan.info.quest && !this.runtime.definitions.some((quest) => quest.id === plan.info.quest)) {
      return { known: false, reason: 'Native OnEndInfo quest is not in the loaded source: ' + plan.info.quest };
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

  async delivery(_plan: DialogueExecutionPlan): Promise<NativeValue<true>> {
    return { known: false, reason: 'Original delivery callbacks are not connected.' };
  }

  async finish(plan: DialogueExecutionPlan): Promise<NativeValue<true>> {
    const lifecycle = this.lifecycleCapability(plan);
    if (!lifecycle.known) return lifecycle;
    if (plan.info.quest) {
      const pairs: QuestLogPair[] = plan.operations.flatMap((operation) => operation.kind === 'say'
        ? [{ version: 1, speakerKey: operation.speaker ? 'FO_It_' + operation.speaker.name : '', textKey: operation.textKey }]
        : []);
      const result = this.runtime.quests.appendDialogueLogPairs(plan.info.quest, pairs);
      if (result.kind !== 'applied') return { known: false, reason: result.reason };
    }
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
      const rewards = quest.rewards;
      if (rewards.experience === null || rewards.political?.amount === null ||
          rewards.enclave?.amount === null || rewards.attribute?.amount === null) {
        return { known: false, reason: 'Native quest reward fields are unresolved: ' + id };
      }
      if ((rewards.political?.amount ?? 0) !== 0 || (rewards.enclave?.amount ?? 0) !== 0 ||
          Boolean(rewards.attribute?.id && rewards.attribute.amount !== 0) || id.toLowerCase() === 'ardea_revolution') {
        return { known: false, reason: 'Native quest reward services are not connected: ' + id };
      }
      if (rewards.experience !== 0) return this.runtime.canAwardExperienceScripts(
        [...this.priorExperienceAwards(preceding), rewards.experience]);
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
  playerPosition: readonly number[], runtime: NativeQuestRuntime, catalog: NativeCatalog,
  spawnSource: Pick<NonNullable<ArdeaScene['spawnSource']>, 'path' | 'sha256'>,
  origin: readonly [number, number, number], signal: AbortSignal): Promise<void> {
  const intro = document.createElement('p');
  intro.textContent = 'Original English dialogue. Source predicates and supported game-event changes are live; voice, camera direction, NPC behavior and other native services are still being rebuilt.';
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
    const facts = new ArdeaDialogueFacts(owner, people, playerPosition, runtime, locations, origin, locationFailure);
    const host = new BrowserDialogueHost(runtime, catalog, facts, catalog.infos, signal, log);
    let notice: string | null = null;

    const render = (): void => {
      if (signal.aborted || !options.isConnected) return;
      options.replaceChildren();
      let readyCount = 0;
      const pending: { info: NativeInfo; reason: string }[] = [];
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
    };
    render();
  } catch (error) {
    if (signal.aborted || !parent.isConnected) return;
    status.textContent = 'Original dialogue could not be initialized: ' + (error instanceof Error ? error.message : String(error));
    status.classList.add('warnings');
  }
}
