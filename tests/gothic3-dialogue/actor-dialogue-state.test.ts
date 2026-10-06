import { describe, expect, it } from 'vitest';
import { loadSceneActorDialogSources, NativeArdeaActorDialogState } from '../../src/gothic3/actor-dialogue-state';
import type { SourceArdeaActor } from '../../src/gothic3/actor-dialogue-state';
import { NativeQuests, QuestStatus } from '../../src/gothic3/quest-state';
import type { NativeQuest, NativeSource } from '../../src/gothic3/catalog';
import type { NativeEntityIndex, NativeEntityRecord, NativeSourceFile } from '../../src/gothic3/native-data';
import type { ScenePerson } from '../../src/gothic3/types';

const guid = '0123456789abcdef0123456789abcdef01234567';
const secondGuid = '1123456789abcdef0123456789abcdef01234567';
const sourceActor = (talkedToPlayer = false, tradeEnabled = false, partyEnabled = false,
  teachEnabled = false, actorGuid = guid, name = 'Diego', pickedPocket = false): SourceArdeaActor => ({ name, guid: actorGuid,
  propertySets: [
    { name: 'gCNPC_PS', properties: [] },
    { name: 'gCDialog_PS', properties: [
      { name: 'TalkedToPlayer', status: 'decoded', value: talkedToPlayer },
      { name: 'TradeEnabled', status: 'decoded', value: tradeEnabled },
      { name: 'PartyEnabled', status: 'decoded', value: partyEnabled },
      { name: 'TeachEnabled', status: 'decoded', value: teachEnabled },
      { name: 'PickedPocket', status: 'decoded', value: pickedPocket },
    ] },
  ],
});

const actorPath = 'G3_World_01/Myrtana/Ardea_City/Ardea_NPC.lrentdat';
const actorSource: NativeSource = { archive: 'G3_World_01.pak', path: actorPath, sha256: 'b'.repeat(64),
  selection: 'test', layers: [] };
const actorPerson: ScenePerson = { id: guid, name: 'Guard', position: [0, 0, 0],
  source: actorSource.archive + ' :: ' + actorPath + ' # entity 4' };
const actorRecord = (id = guid, name = 'Guard'): NativeEntityRecord => ({ key: 'guard-key', index: 4, name, guid: id,
  creator: null, flags: [], worldMatrix: [], propertySets: [
    { name: 'gCNPC_PS', version: 1, values: {} },
    { name: 'gCDialog_PS', version: 1, values: { TalkedToPlayer: false, TradeEnabled: true,
      PartyEnabled: false, TeachEnabled: false, PickedPocket: false } },
  ] });
const actorIndex: NativeEntityIndex = { key: 'guard-key', name: 'Guard', guid, creator: null, file: 3,
  entityIndex: 4, propertySets: ['gCNPC_PS', 'gCDialog_PS'], hasGameplay: true, position: [0, 0, 0],
  dataChunk: 'guard.json' };
const actorFile: NativeSourceFile = { index: 3, source: actorSource, entities: 1, gameplayEntities: 1 };

function actorWorld(indexRow = actorIndex, record = actorRecord(), file = actorFile) {
  return {
    sourceByPath: async () => ({ kind: 'found' as const, value: file }),
    entityIndex: async () => [indexRow],
    entity: async () => ({ kind: 'found' as const, value: record }),
  };
}

describe('visible Ardea actor source resolution', () => {
  it('loads dialog flags only from the exact indexed source identity', async () => {
    const result = await loadSceneActorDialogSources([actorPerson], actorWorld());
    expect(result.actors).toMatchObject([{ name: 'Guard', guid, propertySets: [
      { name: 'gCNPC_PS' }, { name: 'gCDialog_PS', properties: [
        { name: 'TalkedToPlayer', status: 'decoded', value: false },
        { name: 'TradeEnabled', status: 'decoded', value: true },
        { name: 'PartyEnabled', status: 'decoded', value: false },
        { name: 'TeachEnabled', status: 'decoded', value: false },
        { name: 'PickedPocket', status: 'decoded', value: false },
      ] },
    ] }]);
    expect(result.sourceFiles).toEqual([{ archive: actorSource.archive, path: actorPath, sha256: actorSource.sha256 }]);
  });

  it('rejects a name match whose indexed entity number or archive differs', async () => {
    await expect(loadSceneActorDialogSources([actorPerson], actorWorld({ ...actorIndex, entityIndex: 5 })))
      .rejects.toThrow(/exact native entity-index row/);
    await expect(loadSceneActorDialogSources([actorPerson], actorWorld({ ...actorIndex, name: 'Other' })))
      .rejects.toThrow(/exact native entity-index row/);
    await expect(loadSceneActorDialogSources([actorPerson], actorWorld({ ...actorIndex, guid: secondGuid })))
      .rejects.toThrow(/exact native entity-index row/);
    await expect(loadSceneActorDialogSources([actorPerson], actorWorld(actorIndex, actorRecord(secondGuid, 'Other'))))
      .rejects.toThrow(/Loaded scene actor identity differs/);
    await expect(loadSceneActorDialogSources([actorPerson], actorWorld(actorIndex, actorRecord(), {
      ...actorFile, source: { ...actorSource, archive: 'other.pak' },
    }))).rejects.toThrow(/archive\/path identity differs/);
  });

  it('allows repeated display names when their native identities differ', () => {
    const state = new NativeArdeaActorDialogState([sourceActor(false, false, false, false, guid, 'Guard'),
      sourceActor(false, true, false, false, secondGuid, 'Guard')]);
    expect(state.dialog({ id: secondGuid, name: 'Guard' })).toMatchObject({
      known: true, value: { tradeEnabled: true },
    });
  });

  it('keeps source defaults for scene actors absent from a legacy save roster', () => {
    const state = new NativeArdeaActorDialogState([sourceActor(), sourceActor(false, true, false, false, secondGuid, 'Guard')]);
    state.restoreEnabledDialogActorIds('TradeEnabled', [guid], new Set([guid]));
    expect(state.dialogFlag({ id: guid, name: 'Diego' }, 'TradeEnabled')).toEqual({ known: true, value: true });
    expect(state.dialogFlag({ id: secondGuid, name: 'Guard' }, 'TradeEnabled')).toEqual({ known: true, value: true });
  });
});

describe('native Ardea actor dialog state', () => {
  it('marks TalkedToPlayer only when a begun InfoManager is ended', () => {
    const state = new NativeArdeaActorDialogState([sourceActor()]);
    const entity = { id: guid, name: 'Diego' };
    expect(state.dialog(entity)).toEqual({ known: true, value: { hasNpc: true, hasDialog: true,
      talkedToPlayer: false, pickedPocket: false, tradeEnabled: false, partyEnabled: false, teachEnabled: false } });
    expect(state.endInfoManager(entity)).toBeUndefined();
    expect(state.dialog(entity)).toEqual({ known: true, value: { hasNpc: true, hasDialog: true,
      talkedToPlayer: false, pickedPocket: false, tradeEnabled: false, partyEnabled: false, teachEnabled: false } });
    expect(state.beginInfoManager(entity)).toEqual({ known: true, value: true });
    state.endInfoManager(entity);
    expect(state.dialog(entity)).toEqual({ known: true, value: { hasNpc: true, hasDialog: true,
      talkedToPlayer: true, pickedPocket: false, tradeEnabled: false, partyEnabled: false, teachEnabled: false } });
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

  it('sets and saves Dialog.PickedPocket against the source actor identity', () => {
    const entity = { id: guid, name: 'Diego' };
    const state = new NativeArdeaActorDialogState([sourceActor()]);
    expect(state.dialog(entity)).toMatchObject({ known: true, value: { pickedPocket: false } });
    expect(state.setPickedPocket(entity, true)).toEqual({ known: true, value: true });
    expect(state.dialog(entity)).toMatchObject({ known: true, value: { pickedPocket: true } });
    const restored = new NativeArdeaActorDialogState([sourceActor()]);
    restored.restorePickedPocketIds(state.currentPickedPocketIds());
    expect(restored.dialog(entity)).toMatchObject({ known: true, value: { pickedPocket: true } });
    restored.restorePickedPocketIds([]);
    expect(restored.dialog(entity)).toMatchObject({ known: true, value: { pickedPocket: false } });
    expect(() => restored.restorePickedPocketIds([guid, guid])).toThrow(/invalid or duplicate/);
  });

  it('keeps source PickedPocket defaults for actors outside a legacy roster', () => {
    const sourcePicked = new NativeArdeaActorDialogState([sourceActor(false, false, false, false, guid, 'Diego', true),
      sourceActor(false, false, false, false, secondGuid, 'Guard', false)]);
    sourcePicked.restorePickedPocketIds([], new Set([guid]));
    expect(sourcePicked.dialog({ id: guid, name: 'Diego' })).toMatchObject({ known: true, value: { pickedPocket: false } });
    expect(sourcePicked.dialog({ id: secondGuid, name: 'Guard' })).toMatchObject({ known: true, value: { pickedPocket: false } });
    sourcePicked.restorePickedPocketIds([], new Set());
    expect(sourcePicked.dialog({ id: guid, name: 'Diego' })).toMatchObject({ known: true, value: { pickedPocket: true } });
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
