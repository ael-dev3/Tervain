import type { NativeDifficulty } from './combat';
import type { BrowserArdeaNpcCombatRuntime } from './npc-combat-runtime';
import { resolveNativePickpocketAction } from './pickpocket';
import type { NativeQuestRuntime } from './quest-runtime';
import type { ScenePerson } from './types';

/** Browser action lifetime lives outside the NPC panel. A panel can close while
 * source reads are pending; reopening it must not start another theft against
 * the same actor before loot and PickedPocket commit together. */
export class BrowserPickpocketActions {
  private readonly pendingActors = new Set<string>();

  async attempt(person: ScenePerson, runtime: NativeQuestRuntime,
    npcs: BrowserArdeaNpcCombatRuntime, difficulty: NativeDifficulty): Promise<string> {
    const actorId = person.id.toLowerCase();
    if (this.pendingActors.has(actorId)) return 'PickPocket is already in progress for ' + person.name + '.';
    this.pendingActors.add(actorId);
    try { return await this.run(person, runtime, npcs, difficulty); }
    finally { this.pendingActors.delete(actorId); }
  }

  private async run(person: ScenePerson, runtime: NativeQuestRuntime,
    npcs: BrowserArdeaNpcCombatRuntime, difficulty: NativeDifficulty): Promise<string> {
    const target = { id: person.id, name: person.name };
    const dialog = runtime.actorDialogs.dialog(target);
    if (!dialog.known) return dialog.reason;
    if (!dialog.value.hasDialog) return person.name + ' has no source Dialog property.';
    if (dialog.value.pickedPocket) return person.name + ' is already marked PickedPocket.';

    const playerLevel = runtime.saveData().heroProgress?.level ?? 0;
    const actor = await npcs.initializeOnContact(person.id, playerLevel, difficulty);
    const theft = runtime.heroTheft();
    if (!theft.known) return 'PickPocket could not read the Hero Theft attribute: ' + theft.reason;
    const unresolvedPerk = (perk: string) => ({ status: 'unknown' as const,
      reason: perk + ' is not resolved from the live Hero skill inventory.' });
    const action = resolveNativePickpocketAction(actor.rawLevelMax, theft.value, {
      pickpocket2: unresolvedPerk('Perk_PickPocket_2'), pickpocket3: unresolvedPerk('Perk_PickPocket_3'),
    }, actor.treasureSetResolutions, (bound) => npcs.nextGameRandomNumber(bound),
    () => npcs.nextPickpocketRawRandom());
    if (action.status === 'blocked') return 'PickPocket requires ' + action.requiredPerk + ' (' + action.reason + '). No roll was drawn.';
    if (action.status === 'unsupported') return 'No PickPocket effect was applied: ' + action.reason;
    if (action.status === 'failed') return 'PickPocket failed · roll ' + action.attempt.roll + ' / 99, threshold ' +
      action.attempt.successThreshold + '. The original caught response and crime reaction are not connected.';

    const current = runtime.actorDialogs.dialog(target);
    if (!current.known || !current.value.hasDialog || current.value.pickedPocket) {
      return 'The target Dialog state changed during the attempt; no loot was applied.';
    }
    const received = await runtime.receiveNativePickpocketLoot(action.loot);
    if (!received.known) return 'PickPocket succeeded, but its source loot could not be applied: ' + received.reason;
    const marked = runtime.actorDialogs.setPickedPocket(target, true);
    if (!marked.known) return 'PickPocket loot was applied, but Dialog.PickedPocket could not be retained: ' + marked.reason;
    runtime.inventoryChanged();
    const loot = received.value.length ? received.value.map((stack) => stack.templateName + ' × ' + stack.amount).join(', ')
      : 'no distribution-7 items';
    const quest = runtime.quests.state('Ardea_Pocket');
    const questNote = quest?.status === 0
      ? ' Ardea_Pocket remains Open because its native PickedPocket listener/quest-start path is unresolved.' : '';
    return 'PickPocket succeeded · ' + loot + '. Hero inventory and PickedPocket state are saved with P.' + questNote;
  }
}
