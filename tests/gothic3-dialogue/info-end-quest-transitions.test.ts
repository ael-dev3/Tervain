import { describe, expect, it } from 'vitest';
import type { NativeQuest, NativeSource } from '../../src/gothic3/catalog';
import { NativeQuests, QuestStatus, nativeInfoAppendsQuestSayPairs } from '../../src/gothic3/quest-state';

const source: NativeSource = { archive: 'test', path: 'test.quest', sha256: 'a'.repeat(64), selection: 'test', layers: [] };
const definition: NativeQuest = { id: 'Ardea_InfoEnd', numericType: 1, prereqs: [], deliveryTargets: [], destination: '',
  folder: '', logTopic: '', logText: '', runningTime: { years: null, days: null, hours: null },
  rewards: { experience: 0, political: null, enclave: null, job: null, attribute: null }, source, issues: [] };
const pair = { version: 1, speakerKey: 'FO_It_Diego', textKey: 'INFO_DIEGO' };
const startTime = { years: 1, days: 2, hours: 3 };

function makeQuests(status: QuestStatus) {
  const changed: Array<{ previous: QuestStatus; status: QuestStatus; logKeys: string[] }> = [];
  const quests = new NativeQuests([definition], { clock: () => ({ ...startTime }), apply: () => ({ applied: true }),
    changed: (_quest, previous, state) => changed.push({ previous, status: state.status, logKeys: [...state.logKeys] }) });
  quests.seed(definition.id, { status, counters: [], startedAt: null, logKeys: [], logPairs: [] });
  return { quests, changed };
}

describe('native OnEndInfo quest callbacks', () => {
  it('starts an Open quest and then appends its Say localization pair for condition 6', () => {
    const { quests, changed } = makeQuests(QuestStatus.Open);

    expect(quests.onEndInfo(definition.id, 6, [pair])).toEqual({ kind: 'applied' });
    expect(quests.state(definition.id)).toMatchObject({ status: QuestStatus.Running, startedAt: startTime,
      logKeys: ['INFO_DIEGO'], logPairs: [pair] });
    expect(changed).toEqual([
      { previous: QuestStatus.Open, status: QuestStatus.Running, logKeys: [] },
      { previous: QuestStatus.Running, status: QuestStatus.Running, logKeys: ['INFO_DIEGO'] },
    ]);
  });

  it.each([
    [4, QuestStatus.Running], [5, QuestStatus.Open], [7, QuestStatus.Running],
    [8, QuestStatus.Running], [10, QuestStatus.Success],
  ])('appends Say pairs without changing quest status for condition %i', (condition, status) => {
    const { quests, changed } = makeQuests(status);

    expect(quests.onEndInfo(definition.id, condition, [pair])).toEqual({ kind: 'applied' });
    expect(quests.state(definition.id)).toMatchObject({ status, logKeys: ['INFO_DIEGO'], logPairs: [pair] });
    expect(changed).toEqual([{ previous: status, status, logKeys: ['INFO_DIEGO'] }]);
  });

  it('matches every native common-tail Say-log condition guard', () => {
    const guarded = Array.from({ length: 53 }, (_, condition) => condition).filter(nativeInfoAppendsQuestSayPairs);
    expect(guarded).toEqual([3, 4, 5, 6, 7, 8, 10, 11, 19]);
  });

  it('cancels a Running quest and appends its Say pair for condition 11', () => {
    const { quests } = makeQuests(QuestStatus.Running);

    expect(quests.onEndInfo(definition.id, 11, [pair])).toEqual({ kind: 'applied' });
    expect(quests.state(definition.id)).toMatchObject({ status: QuestStatus.Cancelled, logKeys: ['INFO_DIEGO'] });
  });

  it('restarts a Lost quest for condition 21 without writing a quest log pair', () => {
    const { quests } = makeQuests(QuestStatus.Lost);

    expect(quests.onEndInfo(definition.id, 21, [pair])).toEqual({ kind: 'applied' });
    expect(quests.state(definition.id)).toMatchObject({ status: QuestStatus.Running, startedAt: startTime,
      logKeys: [], logPairs: [] });
  });

  it('still appends a log when native SetStatus rejects a stale condition-6 transition', () => {
    const { quests } = makeQuests(QuestStatus.Running);

    expect(quests.onEndInfo(definition.id, 6, [pair])).toEqual({ kind: 'applied' });
    expect(quests.state(definition.id)).toMatchObject({ status: QuestStatus.Running,
      logKeys: ['INFO_DIEGO'], logPairs: [pair] });
  });

  it('does not require a quest for condition 3, but does for condition 19', () => {
    const { quests } = makeQuests(QuestStatus.Open);

    expect(quests.onEndInfo('', 3, [pair])).toEqual({ kind: 'applied' });
    expect(quests.onEndInfo('', 19, [pair])).toMatchObject({ kind: 'unsupported' });
    expect(quests.state(definition.id)).toMatchObject({ status: QuestStatus.Open, logKeys: [] });
  });
});
