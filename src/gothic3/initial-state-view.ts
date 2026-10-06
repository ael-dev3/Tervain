import { loadOriginalInitialState } from './initial-state';
import type { OriginalInitialState } from './initial-state';
import { loadOriginalIntrinsicInventory } from './inventory-source';
import type { IntrinsicInventoryDocument } from './inventory-source';
import { loadNativeStartupDocument } from './startup';
import type { NativeStartupDocument } from './startup';
import { QuestStatus } from './quest-state';

function text(parent: HTMLElement, value: string, tag = 'p', className?: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function section(parent: HTMLElement, title: string, open = false): HTMLDetailsElement {
  const details = document.createElement('details');
  details.open = open;
  text(details, title, 'summary');
  parent.append(details);
  return details;
}

function callbackLabel(callback: unknown): string {
  if (typeof callback === 'string') return callback;
  if (callback && typeof callback === 'object' && 'call' in callback && typeof callback.call === 'string') {
    return callback.call;
  }
  return JSON.stringify(callback) ?? 'Unresolved original callback';
}

function startupOperationLabel(operation: Readonly<Record<string, unknown>>): string {
  const target = typeof operation.entity === 'string' ? operation.entity + ': ' : '';
  switch (operation.kind) {
    case 'resetEntityCaches': return 'Reset the script entity caches';
    case 'setPlayerChapter': return 'Hero Chapter = ' + operation.value;
    case 'repairDoorTranslation': return target + 'adjust door height by ' + operation.deltaYcm + ' cm';
    case 'repairNpcAlignment': case 'setEnclaveAlignment': return target + 'PoliticalAlignment = ' + operation.alignment;
    case 'setNavigationRoutine': return target + 'routine ' + operation.routine;
    case 'setEnclaveRaid': return target + 'Raid = ' + operation.value;
    case 'setEnclaveRevolution': return target + 'Revolution = ' + operation.value;
    case 'notifyEnclave': return 'NotifyEnclave(' + operation.self + ', ' + operation.other + ', event ' + operation.event + ')';
    case 'runQuest': return 'RunQuest ' + operation.quest;
    case 'setExitRoiScript': return target + 'ExitROIScript = ' + operation.script;
    case 'setPlayerStat': return 'Hero ' + operation.setter + '(' + operation.value + ')';
    case 'setPlayerLearningPointsAttributes': return 'Hero attribute LP = ' + operation.value;
    case 'inventoryPopulate': return 'InventoryPopulate(Hero, None, ' + operation.argument + ')';
    default: return JSON.stringify(operation);
  }
}

function render(view: HTMLElement, state: OriginalInitialState, intrinsic: IntrinsicInventoryDocument,
  startup: NativeStartupDocument): void {
  text(view, 'Original player state', 'h3');
  text(view, 'Source state with partial player startup. Quest startup and remaining native callbacks have not been applied.');
  const stats = state.player.stats;
  text(view, 'HP ' + stats.hitPoints.current + '/' + stats.hitPoints.max +
    ' · MP ' + stats.manaPoints.current + '/' + stats.manaPoints.max +
    ' · SP ' + stats.staminaPoints.current + '/' + stats.staminaPoints.max);
  text(view, 'Serialized Level ' + state.view.level + ' · XP ' + state.view.xp +
    ' · Attribute LP ' + state.view.learningPointsAttributes + ' · Perk LP ' + state.view.learningPointsPerks +
    ' · Chapter ' + state.view.chapter);
  const calendar = state.clock.calendar;
  const time = [calendar.hour, calendar.minute, calendar.second].map((value) => String(value).padStart(2, '0')).join(':');
  text(view, 'Original clock: year ' + calendar.year + ', day ' + calendar.day + ', ' + time +
    ' · factor ' + state.clock.factor + '. Elapsed time is not running in this view.');
  text(view, 'Player game events: ' + (state.view.playerGameEvents.join(', ') || 'none in the initialized source seed') + '.');

  const infoSnapshot = state.infos.snapshot();
  const infoState = section(view, infoSnapshot.records.length + ' original dialogue states');
  text(infoState, 'Fresh-world INI profile: ' + infoSnapshot.records.filter((record) => record.currentGiven).length +
    ' Given=true · ' + infoSnapshot.records.filter((record) => record.permanent).length +
    ' stored Permanent=true. This is before startup, with no native save restored.');
  text(infoState, 'The latest compiled-info archive entry deletes the older catalog. The native loader falls back to source INIs for this profile.');
  text(infoState, 'Dialogue eligibility, derived permanence and command execution need their remaining runtime services. Inspecting these states changes no Given flag.');
  for (const note of infoSnapshot.unapplied) text(infoState, note, 'p', 'record-meta');

  const pending = section(view, 'Pending startup', true);
  const recipe = section(pending, 'Original startup order');
  text(recipe, 'OnInit resets ' + startup.onInitHelpers.length + ' script helpers before OnGameStartUp. These are source instructions; this inspector does not execute them.');
  const operations = document.createElement('ol');
  recipe.append(operations);
  for (const operation of startup.startupOperations) text(operations, startupOperationLabel(operation), 'li');
  text(recipe, 'Ardea enters its raid before RunQuest. Completing this callback also requires the later session, NPC task and ROI lifecycle.');
  const xardas = state.quests.state('Xardas_FindXardas');
  text(pending, 'Xardas_FindXardas: ' + (xardas?.status === QuestStatus.Open ? 'Open' : 'unexpected source status') +
    '. The original startup RunQuest has not been applied.');
  const callbacks = document.createElement('ul');
  pending.append(callbacks);
  for (const callback of state.pendingStartup.callbacks) text(callbacks, callbackLabel(callback), 'li');
  for (const note of state.pendingStartup.notes) text(pending, note, 'p', 'record-meta');

  const equipment = section(view, state.view.equipment.length + ' serialized equipment slots');
  for (const item of state.view.equipment) {
    text(equipment, item.templateName + ' · original slot ' + item.slotIndex, 'p');
    text(equipment, 'Template ' + item.templateGuid20 + ' · item ' + item.itemGuid20, 'p', 'source');
  }

  const inventory = section(view, state.view.inventory.length + ' original inventory assurances');
  text(inventory, 'Amounts, qualities and hotkeys come from the original startup assurances. Intrinsic stack creation leaves 116 Learned=false and explicitly sets five true. External inventory observers and later physical equipping remain unapplied.');
  const list = document.createElement('ul');
  inventory.append(list);
  for (const stack of intrinsic.stacks) {
    text(list, stack.templateName + ' × ' + stack.amount + ' · quality ' + stack.quality +
      (stack.quickSlot === null ? '' : ' · quickslot ' + stack.quickSlot) +
      ' · intrinsic Learned ' + stack.intrinsicLearned, 'li');
  }
  for (const limitation of intrinsic.limitations) text(inventory, limitation, 'p', 'record-meta');

  const questSeed = section(view, state.questDocument.questCount + ' original quest states');
  text(questSeed, state.questDocument.runtimePacketCount + ' compiled runtime packets and four fresh factory/INI records. All are Open, with zero delivery counters and activation times before startup.');
  for (const quest of state.questDocument.quests) {
    for (const pair of quest.logPairs) {
      text(questSeed, 'Original journal pair: ' + quest.id + ' · speaker ' + JSON.stringify(pair.speakerKey) +
        ' · text key ' + pair.textKey, 'p', 'record-meta');
    }
  }
  text(view, state.player.player.source.archive + ' · ' + state.player.player.source.path +
    ' · SHA-256 ' + state.player.player.source.sha256, 'p', 'source');
}

/** Read-only source inspection. No quest runs, grants, clock ticks or inventory actions. */
export async function showOriginalPlayerState(parent: HTMLElement): Promise<void> {
  const view = document.createElement('section');
  parent.append(view);
  text(view, 'Reading original player and quest state…');
  try {
    const state = await loadOriginalInitialState();
    const [intrinsic, startup] = await Promise.all([loadOriginalIntrinsicInventory(state.player), loadNativeStartupDocument()]);
    if (!view.isConnected) return;
    view.replaceChildren();
    render(view, state, intrinsic, startup);
  } catch (error) {
    if (view.isConnected) {
      view.replaceChildren();
      text(view, 'Original player state could not load: ' + String(error), 'p', 'warnings');
    }
  }
}
