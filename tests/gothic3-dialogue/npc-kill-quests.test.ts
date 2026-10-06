import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NativeInfo, NativeQuest, NativeSource } from '../../src/gothic3/catalog';
import { NativeQuests, QuestStatus, type QuestEffect } from '../../src/gothic3/quest-state';
import { loadNativeHeroPlayerMemory } from '../../src/gothic3/hero-property-runtime';
import { NativeQuestRuntime } from '../../src/gothic3/quest-runtime';

const assetRoot = resolve(process.cwd(), 'public/gothic3');
const pagesBase = '/Tervain/gothic3/';

async function readLocalAsset(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  const marker = url.pathname.indexOf(pagesBase);
  if (marker < 0) return new Response('Unexpected asset route', { status: 404 });
  const path = resolve(assetRoot, decodeURIComponent(url.pathname.slice(marker + pagesBase.length)));
  if (!path.startsWith(assetRoot)) return new Response('Invalid asset path', { status: 400 });
  try { return new Response(await readFile(path), { status: 200 }); }
  catch { return new Response('Missing test asset: ' + url.pathname, { status: 404 }); }
}

const source: NativeSource = {
  archive: 'Quests.pak', path: 'G3_World_01/test.quest', sha256: 'a'.repeat(64), selection: 'test', layers: [],
};

function definition(id: string, numericType: number, targets: readonly { entity: string; amount: number | null }[]): NativeQuest {
  return {
    id, numericType, prereqs: [],
    deliveryTargets: targets.map((target) => ({ ...target, initialCounter: 0 })),
    destination: '', folder: '', logTopic: '', logText: '',
    runningTime: { years: null, days: null, hours: null },
    rewards: { experience: 0, political: null, enclave: null, job: null, attribute: null },
    source, issues: [],
  };
}

function manager(definitions: readonly NativeQuest[], statuses: readonly QuestStatus[], counters?: readonly number[][]) {
  const changed: string[] = [];
  const quests = new NativeQuests(definitions, { clock: () => ({ years: 0, days: 0, hours: 12 }),
    apply: () => ({ applied: true }), changed: (quest) => changed.push(quest.id) });
  definitions.forEach((quest, index) => quests.seed(quest.id, { status: statuses[index]!,
    counters: counters?.[index] ?? quest.deliveryTargets.map(() => 0), startedAt: null, logKeys: [], logPairs: [] }));
  return { quests, changed };
}

describe('bounded native NPC kill-objective callback', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('increments partial exact type-2 NPC objectives in Open, Running and Lost quests', () => {
    const definitions = [
      definition('Kill_Open', 2, [{ entity: 'Orc_Scout', amount: 1 }, { entity: 'Wolf', amount: 2 }]),
      definition('Kill_Running', 2, [{ entity: 'Orc_Scout', amount: 3 }]),
      definition('Kill_Lost', 2, [{ entity: 'Orc_Scout', amount: 2 }]),
      definition('Deliver_Item', 1, [{ entity: 'Orc_Scout', amount: 1 }]),
      definition('Already_Successful', 2, [{ entity: 'Orc_Scout', amount: 1 }]),
    ];
    const { quests, changed } = manager(definitions, [QuestStatus.Open, QuestStatus.Running, QuestStatus.Lost,
      QuestStatus.Running, QuestStatus.Success]);

    const result = quests.recordNpcKilled('Orc_Scout');

    expect(result).toEqual({ kind: 'applied', progress: [
      { questId: 'Kill_Open', entity: 'Orc_Scout', counter: 1, amount: 1 },
      { questId: 'Kill_Running', entity: 'Orc_Scout', counter: 1, amount: 3 },
      { questId: 'Kill_Lost', entity: 'Orc_Scout', counter: 1, amount: 2 },
    ] });
    expect(quests.state('Kill_Open')).toMatchObject({ status: QuestStatus.Open, counters: [1, 0] });
    expect(quests.state('Kill_Running')).toMatchObject({ status: QuestStatus.Running, counters: [1] });
    expect(quests.state('Kill_Lost')).toMatchObject({ status: QuestStatus.Lost, counters: [1] });
    expect(quests.state('Deliver_Item')?.counters).toEqual([0]);
    expect(quests.state('Already_Successful')?.counters).toEqual([0]);
    expect(changed).toEqual(['Kill_Open', 'Kill_Running', 'Kill_Lost']);
  });

  it('uses exact entity names and ignores PC_Hero', () => {
    const quest = definition('Kill_Wolf', 2, [{ entity: 'Wolf', amount: 1 }]);
    const { quests } = manager([quest], [QuestStatus.Running]);

    expect(quests.recordNpcKilled('wolf')).toEqual({ kind: 'applied', progress: [] });
    expect(quests.recordNpcKilled('PC_Hero')).toEqual({ kind: 'applied', progress: [] });
    expect(quests.state('Kill_Wolf')?.counters).toEqual([0]);
  });

  it('preflights unresolved amounts before changing any quest', () => {
    const good = definition('Kill_Good', 2, [{ entity: 'Wolf', amount: 2 }]);
    const unresolved = definition('Kill_Unknown', 2, [{ entity: 'Wolf', amount: null }]);
    const { quests } = manager([good, unresolved], [QuestStatus.Running, QuestStatus.Open]);

    expect(quests.recordNpcKilled('Wolf')).toMatchObject({ kind: 'unsupported', reason: /amount is unresolved/ });
    expect(quests.state('Kill_Good')?.counters).toEqual([0]);
    expect(quests.state('Kill_Unknown')?.counters).toEqual([0]);

    const otherTargetUnknown = definition('Kill_OtherTargetUnknown', 2,
      [{ entity: 'Wolf', amount: 1 }, { entity: 'Orc', amount: null }]);
    const unknown = manager([otherTargetUnknown], [QuestStatus.Running]).quests;
    expect(unknown.planNpcKilled('Wolf')).toMatchObject({ kind: 'unsupported', reason: /amount is unresolved/ });
    expect(unknown.state(otherTargetUnknown.id)?.counters).toEqual([0, 0]);
  });

  it.each([2, 3, 4])('automatically succeeds native type-%i objectives after the final matching kill', (numericType) => {
    const quest = definition('Kill_Complete', numericType, [{ entity: 'Wolf', amount: 1 }, { entity: 'Orc', amount: 1 }]);
    const { quests } = manager([quest], [QuestStatus.Open]);

    expect(quests.recordNpcKilled('Wolf').kind).toBe('applied');
    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Open, counters: [1, 0] });
    expect(quests.recordNpcKilled('Orc').kind).toBe('applied');
    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Success, counters: [1, 1] });
    expect(quests.recordNpcKilled('Orc')).toEqual({ kind: 'applied', progress: [] });
  });

  it('increments every duplicate matching target before the shared completion check', () => {
    const quest = definition('Kill_DuplicateTargets', 2, [{ entity: 'Wolf', amount: 1 }, { entity: 'Wolf', amount: 2 }]);
    const { quests } = manager([quest], [QuestStatus.Running]);

    expect(quests.recordNpcKilled('Wolf')).toEqual({ kind: 'applied', progress: [
      { questId: quest.id, entity: 'Wolf', counter: 1, amount: 1 },
      { questId: quest.id, entity: 'Wolf', counter: 1, amount: 2 },
    ] });
    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Running, counters: [1, 1] });
    expect(quests.recordNpcKilled('Wolf').kind).toBe('applied');
    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Success, counters: [2, 2] });
  });

  it('retains Lost status after its counters satisfy the objective because SetStatus rejects Success', () => {
    const quest = definition('Kill_LostComplete', 2, [{ entity: 'Wolf', amount: 1 }]);
    const { quests } = manager([quest], [QuestStatus.Lost]);

    expect(quests.planNpcKilled('Wolf')).toMatchObject({ kind: 'planned',
      updates: [{ questId: quest.id, complete: false, effects: [], counters: [1] }] });
    expect(quests.recordNpcKilled('Wolf').kind).toBe('applied');
    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Lost, counters: [1] });
    expect(quests.checkDeliveryEntitiesStatus(quest.id)).toMatchObject({ kind: 'rejected' });
  });

  it('uses native wrapping32-bit counter bits and unsigned comparisons', () => {
    const quest = definition('Kill_Wrapping', 2, [{ entity: 'Wolf', amount: 0xffffffff }]);
    const crossingSign = manager([quest], [QuestStatus.Running], [[0x7fffffff]]).quests;
    expect(crossingSign.recordNpcKilled('Wolf')).toEqual({ kind: 'applied', progress: [
      { questId: quest.id, entity: 'Wolf', counter: 0x80000000, amount: 0xffffffff },
    ] });
    expect(crossingSign.state(quest.id)).toMatchObject({ status: QuestStatus.Running, counters: [0x80000000] });

    const wrapping = manager([quest], [QuestStatus.Running], [[0xffffffff]]).quests;
    expect(wrapping.recordNpcKilled('Wolf').kind).toBe('applied');
    expect(wrapping.state(quest.id)).toMatchObject({ status: QuestStatus.Running, counters: [0] });

    const unsignedAmount = definition('Kill_HighAmount', 2, [{ entity: 'Wolf', amount: 0x80000000 }]);
    const complete = manager([unsignedAmount], [QuestStatus.Running], [[0x7fffffff]]).quests;
    expect(complete.recordNpcKilled('Wolf').kind).toBe('applied');
    expect(complete.state(unsignedAmount.id)).toMatchObject({ status: QuestStatus.Success, counters: [0x80000000] });
  });

  it('projects rewards and every matching quest before applying any host effect or mutation', () => {
    const first = definition('Kill_First', 2, [{ entity: 'Wolf', amount: 1 }]);
    first.rewards = { experience: 100, political: { alignment: 2, amount: 3 }, enclave: null,
      job: null, attribute: { id: 'STR', amount: 1 } };
    const second = definition('Kill_Second', 3, [{ entity: 'Wolf', amount: 1 }]);
    second.rewards = { ...second.rewards, experience: 50 };
    const effects: QuestEffect[][] = [];
    const quests = new NativeQuests([first, second], { clock: () => null,
      apply: (batch) => { effects.push([...batch]); return { applied: true }; }, changed: () => {} });
    for (const quest of [first, second]) quests.seed(quest.id,
      { status: QuestStatus.Running, counters: [0], startedAt: null, logKeys: [] });

    const planned = quests.planNpcKilled('Wolf');
    expect(planned).toMatchObject({ kind: 'planned', updates: [
      { questId: first.id, complete: true, effects: [
        { type: 'politicalFame', alignment: 2, amount: 3 },
        { type: 'attributeBase', id: 'STR', amount: 1 },
        { type: 'experienceScript', requestedAmount: 100, self: 'world', other: 'player' },
      ] },
      { questId: second.id, complete: true,
        effects: [{ type: 'experienceScript', requestedAmount: 50, self: 'world', other: 'player' }] },
    ] });
    expect(quests.state(first.id)?.counters).toEqual([0]);
    expect(quests.state(second.id)?.counters).toEqual([0]);
    expect(effects).toEqual([]);
    expect(quests.recordNpcKilled('Wolf').kind).toBe('applied');
    expect(effects).toEqual([planned.kind === 'planned' ? planned.updates.flatMap((update) => update.effects) : []]);
    expect(quests.state(first.id)?.status).toBe(QuestStatus.Success);
    expect(quests.state(second.id)?.status).toBe(QuestStatus.Success);
  });

  it('keeps all counters unchanged if the projected native rewards are unavailable', () => {
    const quest = definition('Kill_UnsupportedReward', 2, [{ entity: 'Wolf', amount: 1 }]);
    quest.rewards = { ...quest.rewards, experience: 100 };
    const quests = new NativeQuests([quest], { clock: () => null,
      apply: () => ({ applied: false, reason: 'Native XP host is unavailable.' }), changed: () => {} });
    quests.seed(quest.id, { status: QuestStatus.Running, counters: [0], startedAt: null, logKeys: [] });

    expect(quests.recordNpcKilled('Wolf')).toEqual({ kind: 'unsupported', reason: 'Native XP host is unavailable.' });
    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Running, counters: [0] });
  });

  it('uses the checker type map, empty-array completion and type-12 Won status', () => {
    const allowed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12].map((type) => definition('Complete_' + type, type, []));
    const excluded = definition('NoCompletion_9', 9, []);
    const { quests } = manager([...allowed, excluded], [...allowed, excluded].map(() => QuestStatus.Open));
    for (const quest of allowed) {
      expect(quests.checkDeliveryEntitiesStatus(quest.id)).toEqual({ kind: 'applied' });
      expect(quests.state(quest.id)?.status).toBe(quest.numericType === 12 ? QuestStatus.Won : QuestStatus.Success);
    }
    expect(quests.checkDeliveryEntitiesStatus(excluded.id)).toEqual({ kind: 'applied' });
    expect(quests.state(excluded.id)?.status).toBe(QuestStatus.Open);
  });

  it('updates the source Jack_KillBandits objective and persists its counter through quest save restore', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);

    const runtime = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory());
    const quest = runtime.definitions.find((definition) => definition.id === 'Jack_KillBandits');
    expect(quest).toMatchObject({ numericType: 2,
      source: { path: 'G3_World_01/Jack_KillBandits_quest_G3_World_01.quest' } });
    expect(quest?.deliveryTargets.map((target) => target.entity)).toEqual([
      'Ardea_OutNovice_01', 'Ardea_OutNovice_02', 'Ardea_OutNovice_03',
    ]);
    expect(runtime.quests.state('Jack_KillBandits')).toMatchObject({ status: QuestStatus.Open, counters: [0, 0, 0] });

    const result = runtime.recordNpcKilled('Ardea_OutNovice_01');
    expect(result).toEqual({ kind: 'applied', progress: [
      { questId: 'Jack_KillBandits', entity: 'Ardea_OutNovice_01', counter: 1, amount: 1 },
    ] });
    const save = runtime.saveData();
    expect(save.quests.Jack_KillBandits).toMatchObject({ status: QuestStatus.Open, counters: [1, 0, 0] });

    const restored = await NativeQuestRuntime.restore(save, await loadNativeHeroPlayerMemory());
    expect(restored.quests.state('Jack_KillBandits')).toMatchObject({ status: QuestStatus.Open, counters: [1, 0, 0] });
  }, 30_000);

  it('completes the original Jack objectives, awards its native quest XP once and restores Success', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);
    const player = await loadNativeHeroPlayerMemory();
    const runtime = await NativeQuestRuntime.newGame(player);
    const xpBefore = player.memory.getXP();
    expect(runtime.quests.run('Jack_KillBandits').kind).toBe('applied');

    for (const name of ['Ardea_OutNovice_01', 'Ardea_OutNovice_02']) {
      expect(runtime.recordNpcKilled(name).kind).toBe('applied');
      expect(runtime.quests.state('Jack_KillBandits')?.status).toBe(QuestStatus.Running);
    }
    const planned = runtime.quests.planNpcKilled('Ardea_OutNovice_03');
    expect(planned).toMatchObject({ kind: 'planned', updates: [{ questId: 'Jack_KillBandits',
      complete: true, effects: [{ type: 'experienceScript', requestedAmount: 100, self: 'world', other: 'player' }] }] });
    expect(player.memory.getXP()).toBe(xpBefore);
    expect(runtime.recordNpcKilled('Ardea_OutNovice_03').kind).toBe('applied');
    expect(runtime.quests.state('Jack_KillBandits')).toMatchObject({ status: QuestStatus.Success, counters: [1, 1, 1] });
    expect(player.memory.getXP()).toBe(xpBefore + 500);
    expect(runtime.recordNpcKilled('Ardea_OutNovice_03')).toEqual({ kind: 'applied', progress: [] });
    expect(player.memory.getXP()).toBe(xpBefore + 500);

    const restoredPlayer = await loadNativeHeroPlayerMemory();
    const restored = await NativeQuestRuntime.restore(runtime.saveData(), restoredPlayer);
    expect(restored.quests.state('Jack_KillBandits')).toMatchObject({ status: QuestStatus.Success, counters: [1, 1, 1] });
    expect(restoredPlayer.memory.getXP()).toBe(xpBefore + 500);
  }, 30_000);

  it('starts Jack_KillBandits through its source event and condition-5/6 dialogue chain', async () => {
    vi.stubGlobal('location', { href: 'https://ael-dev3.github.io/Tervain/gothic3/index.html' });
    vi.stubGlobal('fetch', readLocalAsset);

    const runtime = await NativeQuestRuntime.newGame(await loadNativeHeroPlayerMemory());
    const infos = JSON.parse(await readFile(resolve(assetRoot, 'gameplay/runtime/infos.json'), 'utf8')) as NativeInfo[];
    const sourceInfo = (id: string): NativeInfo => {
      const info = infos.find((candidate) => candidate.id === id);
      if (!info) throw new Error('Missing source Info ' + id);
      return info;
    };
    const firstConversation = sourceInfo('BPANKRATZ31460');
    const knownTower = firstConversation.commands.find((command) => command.command === 'SetGameEvent')?.id1;
    expect(knownTower).toBe('Jack_NiceTower');
    runtime.gameEvents.set(knownTower!);
    expect(runtime.quests.onEndInfo(firstConversation.quest, firstConversation.conditionType!, [])).toEqual({ kind: 'applied' });

    const report = sourceInfo('BPANKRATZ31461');
    expect(report).toMatchObject({ owner: 'Jack', conditionType: 5, quest: 'Jack_KillBandits',
      conditions: { playerKnows: ['Jack_NiceTower'] } });
    const banditsLocated = report.commands.find((command) => command.command === 'SetGameEvent')?.id1;
    expect(banditsLocated).toBe('Jack_BanditsThrere');
    runtime.gameEvents.set(banditsLocated!);
    expect(runtime.quests.onEndInfo(report.quest, report.conditionType!, [])).toEqual({ kind: 'applied' });
    expect(runtime.quests.state('Jack_KillBandits')?.status).toBe(QuestStatus.Open);

    const accept = sourceInfo('BPANKRATZ31462');
    expect(accept).toMatchObject({ owner: 'Jack', conditionType: 6, quest: 'Jack_KillBandits',
      conditions: { playerKnows: ['Jack_BanditsThrere'] } });
    expect(runtime.gameEvents.isSet(accept.conditions.playerKnows[0]!)).toBe(true);
    expect(runtime.quests.onEndInfo(accept.quest, accept.conditionType!, [])).toEqual({ kind: 'applied' });
    expect(runtime.quests.state('Jack_KillBandits')?.status).toBe(QuestStatus.Running);

    const save = runtime.saveData();
    expect(save.gameEvents).toContain('Jack_BanditsThrere');
    const restored = await NativeQuestRuntime.restore(save, await loadNativeHeroPlayerMemory());
    expect(restored.gameEvents.isSet('Jack_BanditsThrere')).toBe(true);
    expect(restored.quests.state('Jack_KillBandits')?.status).toBe(QuestStatus.Running);
  }, 30_000);
});
