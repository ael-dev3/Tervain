import { loadOriginalInitialState } from './initial-state';
import type { OriginalInitialState } from './initial-state';
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

function render(view: HTMLElement, state: OriginalInitialState): void {
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

  const pending = section(view, 'Pending startup', true);
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
  text(inventory, 'Amounts, qualities and hotkeys come from the recorded native startup assurances. Item-use and creation callbacks remain incomplete. Original template names are shown.');
  const list = document.createElement('ul');
  inventory.append(list);
  for (const stack of state.view.inventory) {
    text(list, stack.templateName + ' × ' + stack.amount + ' · quality ' + stack.quality +
      (stack.quickSlot === null ? '' : ' · quickslot ' + stack.quickSlot) +
      ' · learned ' + (stack.learned === null ? 'unresolved' : String(stack.learned)), 'li');
  }

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
    if (!view.isConnected) return;
    view.replaceChildren();
    render(view, state);
  } catch (error) {
    if (view.isConnected) {
      view.replaceChildren();
      text(view, 'Original player state could not load: ' + String(error), 'p', 'warnings');
    }
  }
}
