import { describe, expect, it, vi } from 'vitest';
import { NativeCatalog } from '../../src/gothic3/catalog';
import type { NativeInfo, NativeQuest, NativeSource } from '../../src/gothic3/catalog';
import type { DialogueExecutionPlan, DialogueFacts } from '../../src/gothic3/dialogue';
import { BrowserDialogueHost } from '../../src/gothic3/live-dialogue';
import type { NativeQuestRuntime } from '../../src/gothic3/quest-runtime';
import { NativeQuests, QuestStatus } from '../../src/gothic3/quest-state';
import type { QuestEffect } from '../../src/gothic3/quest-state';
import type { ScenePerson } from '../../src/gothic3/types';

const source: NativeSource = { archive: 'test', path: 'test', sha256: 'a'.repeat(64), selection: 'test', layers: [] };
const owner: ScenePerson = { id: 'b'.repeat(40), name: 'Delivery_Npc', position: [0, 0, 0], source: 'test' };
const npc = { id: owner.id, name: owner.name };
const hero = { id: 'PC_Hero', name: 'PC_Hero' };

function deliveryHost(amount: number, unsupportedCompletion = false) {
  const quest: NativeQuest = { id: 'Delivery_Quest', numericType: 1, prereqs: [],
    deliveryTargets: [{ entity: owner.name, amount, initialCounter: 0 }], destination: '', folder: '',
    logTopic: '', logText: '', runningTime: { years: null, days: null, hours: null },
    rewards: { experience: 100, political: null, enclave: null, job: null, attribute: null }, source, issues: [] };
  const rewards: QuestEffect[][] = [];
  const quests = new NativeQuests([quest], { clock: () => null,
    apply: (effects) => { rewards.push([...effects]); return { applied: true }; }, changed: () => {} });
  quests.seed(quest.id, { status: QuestStatus.Running, counters: [0], startedAt: null, logKeys: [], logPairs: [] });
  // Model the runtime's Running-only preflight and its unsupported next
  // completion. The real counter mutation and OnEndInfo are NativeQuests.
  const canDeliver = vi.fn(() => {
    const state = quests.state(quest.id)!;
    if (state.status !== QuestStatus.Running) return { known: false as const, reason: 'Delivery requires Running.' };
    if (unsupportedCompletion && state.counters[0]! + 1 >= amount) {
      return { known: false as const, reason: 'The next completion reward is unsupported.' };
    }
    return { known: true as const, value: true as const };
  });
  const runtime = { definitions: [quest], quests, canDeliverFromInfo: canDeliver,
    deliverFromInfo: () => {
      const result = quests.deliverToEntity(quest.id, owner.name);
      return result.kind === 'applied' ? { known: true as const, value: true as const }
        : { known: false as const, reason: result.reason };
    } } as unknown as NativeQuestRuntime;
  const info: NativeInfo = { id: 'Delivery_Info', sortId: 0, owner: owner.name, npc: owner.name, parent: '',
    quest: quest.id, conditionType: 8, type: 3, given: false, permanent: false, clearChildren: false, goldCost: 0,
    folder: '', conditions: { ownerNearEntity: '', playerKnows: [], itemContainer: '', items: [], secondaryNPCs: [],
      playerSkills: [], namedPlayerSkills: [] },
    teach: { isPerk: false, index: 0, value: 0, skill: '', attribute: '', attributeValue: 0 },
    commands: [{ index: 0, command: 'Say', entity1: 'player', entity2: 'npc', id1: '', id2: '', text: 'INFO_DELIVERY' }],
    source, issues: [] };
  const plan: DialogueExecutionPlan = { info, roles: { player: hero, a: npc, b: hero, self: npc, other: hero, npc },
    operations: [{ kind: 'say', mode: 'info', speaker: hero, listener: npc, textKey: 'INFO_DELIVERY', sourceIndex: 0 }],
    markGivenOnStart: true, deliveryCallback: { native: 'Game.dll::0x20035175', whenNextNativeIndex: 1 },
    endCallback: { native: 'Game.dll::0x20007d1f', conditionType: 8, quest: quest.id } };
  // These callback phases do not read facts or render DOM elements.
  const host = new BrowserDialogueHost(runtime, new NativeCatalog(), {} as DialogueFacts, [info],
    new AbortController().signal, {} as HTMLElement, owner, null, null);
  return { quest, plan, host, quests, rewards, canDeliver };
}

describe('browser condition-8 delivery completion', () => {
  it('appends the OnEndInfo Say log after delivery has completed the quest without awarding it again', async () => {
    const { quest, plan, host, quests, rewards, canDeliver } = deliveryHost(1);
    expect(host.lifecycleCapability(plan)).toEqual({ known: true, value: true });
    expect(await host.delivery(plan)).toEqual({ known: true, value: true });
    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Success, counters: [1] });

    expect(await host.finish(plan)).toEqual({ known: true, value: true });
    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Success, counters: [1],
      logKeys: ['INFO_DELIVERY'], logPairs: [{ version: 1, speakerKey: 'FO_It_PC_Hero', textKey: 'INFO_DELIVERY' }] });
    expect(rewards).toEqual([[{ type: 'experienceScript', self: 'world', other: 'player', requestedAmount: 100 }]]);
    expect(canDeliver).toHaveBeenCalledTimes(1);
  });

  it('does not preflight a second delivery when this delivery left the quest Running', async () => {
    const { quest, plan, host, quests, rewards, canDeliver } = deliveryHost(2, true);
    expect(host.lifecycleCapability(plan)).toEqual({ known: true, value: true });
    expect(await host.delivery(plan)).toEqual({ known: true, value: true });
    expect(await host.finish(plan)).toEqual({ known: true, value: true });

    expect(quests.state(quest.id)).toMatchObject({ status: QuestStatus.Running, counters: [1], logKeys: ['INFO_DELIVERY'] });
    expect(rewards).toEqual([]);
    expect(canDeliver).toHaveBeenCalledTimes(1);
  });

  it('still refuses a mismatched native OnEndInfo identity after delivery', async () => {
    const { quest, plan, host, quests } = deliveryHost(1);
    expect(await host.delivery(plan)).toEqual({ known: true, value: true });
    const mismatched = { ...plan, endCallback: { ...plan.endCallback, quest: 'Another_Quest' } };
    expect(await host.finish(mismatched)).toMatchObject({ known: false, reason: /identity does not match/ });
    expect(quests.state(quest.id)?.logKeys).toEqual([]);
  });
});
