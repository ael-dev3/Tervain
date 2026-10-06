import { describe, expect, it } from 'vitest';
import { NativeArdeaActorDialogState } from '../../src/gothic3/actor-dialogue-state';
import type { SourceArdeaActor } from '../../src/gothic3/actor-dialogue-state';
import { NativeQuests, QuestStatus } from '../../src/gothic3/quest-state';
import type { NativeQuest, NativeSource } from '../../src/gothic3/catalog';

const guid = '0123456789abcdef0123456789abcdef01234567';
const sourceActor = (talkedToPlayer = false, tradeEnabled = false, partyEnabled = false,
  teachEnabled = false): SourceArdeaActor => ({ name: 'Diego', guid,
  propertySets: [
    { name: 'gCNPC_PS', properties: [] },
    { name: 'gCDialog_PS', properties: [
      { name: 'TalkedToPlayer', status: 'decoded', value: talkedToPlayer },
      { name: 'TradeEnabled', status: 'decoded', value: tradeEnabled },
      { name: 'PartyEnabled', status: 'decoded', value: partyEnabled },
      { name: 'TeachEnabled', status: 'decoded', value: teachEnabled },
    ] },
  ],
});

describe('native Ardea actor dialog state', () => {
  it('marks TalkedToPlayer only when a begun InfoManager is ended', () => {
    const state = new NativeArdeaActorDialogState([sourceActor()]);
    const entity = { id: guid, name: 'Diego' };
    expect(state.dialog(entity)).toEqual({ known: true, value: { hasNpc: true, hasDialog: true,
      talkedToPlayer: false, tradeEnabled: false, partyEnabled: false, teachEnabled: false } });
    expect(state.endInfoManager(entity)).toBeUndefined();
    expect(state.dialog(entity)).toEqual({ known: true, value: { hasNpc: true, hasDialog: true,
      talkedToPlayer: false, tradeEnabled: false, partyEnabled: false, teachEnabled: false } });
    expect(state.beginInfoManager(entity)).toEqual({ known: true, value: true });
    state.endInfoManager(entity);
    expect(state.dialog(entity)).toEqual({ known: true, value: { hasNpc: true, hasDialog: true,
      talkedToPlayer: true, tradeEnabled: false, partyEnabled: false, teachEnabled: false } });
    expect(state.currentTalkedToPlayerIds()).toEqual([guid]);
  });

  it('validates actor identity and restores only source-backed dialog actors', () => {
    const state = new NativeArdeaActorDialogState([sourceActor()]);
    expect(state.dialog({ id: guid, name: 'Milten' })).toMatchObject({ known: false });
    expect(() => state.restoreTalkedToPlayerIds(['f'.repeat(40)])).toThrow(/invalid or duplicate/);
    expect(() => state.restoreTalkedToPlayerIds([guid, guid])).toThrow(/invalid or duplicate/);
  });

  it('preserves a source-seeded true flag when restoring an empty positive-id list', () => {
    const state = new NativeArdeaActorDialogState([sourceActor(true)]);
    state.restoreTalkedToPlayerIds([]);
    expect(state.dialog({ id: guid, name: 'Diego' })).toMatchObject({ known: true, value: { talkedToPlayer: true } });
  });

  it('executes and restores source-backed Dialog.TradeEnabled changes', () => {
    const state = new NativeArdeaActorDialogState([sourceActor()]);
    const entity = { id: guid, name: 'Diego' };
    expect(state.dialogFlag(entity, 'TradeEnabled')).toEqual({ known: true, value: false });
    expect(state.setTradeEnabled(entity, true)).toEqual({ known: true, value: true });
    expect(state.dialogFlag(entity, 'TradeEnabled')).toEqual({ known: true, value: true });
    const save = state.currentTradeEnabledIds();
    expect(save).toEqual([guid]);
    const restored = new NativeArdeaActorDialogState([sourceActor()]);
    restored.restoreTradeEnabledIds(save);
    expect(restored.dialogFlag(entity, 'TradeEnabled')).toEqual({ known: true, value: true });
    restored.restoreTradeEnabledIds([]);
    expect(restored.dialogFlag(entity, 'TradeEnabled')).toEqual({ known: true, value: false });
    expect(() => restored.restoreTradeEnabledIds(['f'.repeat(40)] )).toThrow(/invalid or duplicate/);
  });

  it('executes and restores source-backed PartyEnabled and TeachEnabled flags', () => {
    const state = new NativeArdeaActorDialogState([sourceActor()]);
    const entity = { id: guid, name: 'Diego' };
    expect(state.dialogFlag(entity, 'PartyEnabled')).toEqual({ known: true, value: false });
    expect(state.dialogFlag(entity, 'TeachEnabled')).toEqual({ known: true, value: false });
    expect(state.setDialogFlag(entity, 'PartyEnabled', true)).toEqual({ known: true, value: true });
    expect(state.setDialogFlag(entity, 'TeachEnabled', true)).toEqual({ known: true, value: true });
    const party = state.currentEnabledDialogActorIds('PartyEnabled');
    const teaching = state.currentEnabledDialogActorIds('TeachEnabled');
    expect(party).toEqual([guid]);
    expect(teaching).toEqual([guid]);

    const restored = new NativeArdeaActorDialogState([sourceActor()]);
    restored.restoreEnabledDialogActorIds('PartyEnabled', party);
    restored.restoreEnabledDialogActorIds('TeachEnabled', teaching);
    expect(restored.dialogFlag(entity, 'PartyEnabled')).toEqual({ known: true, value: true });
    expect(restored.dialogFlag(entity, 'TeachEnabled')).toEqual({ known: true, value: true });
    restored.restoreEnabledDialogActorIds('PartyEnabled', []);
    restored.restoreEnabledDialogActorIds('TeachEnabled', []);
    expect(restored.dialogFlag(entity, 'PartyEnabled')).toEqual({ known: true, value: false });
    expect(restored.dialogFlag(entity, 'TeachEnabled')).toEqual({ known: true, value: false });
  });
});

const nativeSource: NativeSource = { archive: 'source', path: 'source.quest', sha256: 'a'.repeat(64), selection: 'test', layers: [] };
const quest: NativeQuest = { id: 'Ardea_Test', numericType: 1, prereqs: [], deliveryTargets: [], destination: '',
  folder: '', logTopic: '', logText: '', runningTime: { years: null, days: null, hours: null },
  rewards: { experience: 0, political: null, enclave: null, job: null, attribute: null }, source: nativeSource, issues: [] };

describe('native quest dialogue log pairs', () => {
  it('appends the source localization pair and matching journal key', () => {
    const changed: unknown[] = [];
    const quests = new NativeQuests([quest], { clock: () => null, apply: () => ({ applied: true }),
      changed: (_definition, _previous, state) => changed.push(state) });
    quests.seed(quest.id, { status: QuestStatus.Open, counters: [], startedAt: null,
      logKeys: [], logPairs: [] });
    expect(quests.appendDialogueLogPairs(quest.id, [{ version: 1, speakerKey: 'FO_It_Diego', textKey: 'INFO_DIEGO' }]))
      .toEqual({ kind: 'applied' });
    expect(quests.state(quest.id)).toMatchObject({ logKeys: ['INFO_DIEGO'],
      logPairs: [{ version: 1, speakerKey: 'FO_It_Diego', textKey: 'INFO_DIEGO' }] });
    expect(changed).toHaveLength(1);
  });
});
