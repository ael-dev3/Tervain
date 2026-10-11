import { describe, expect, it, vi } from 'vitest';
import type { NativeQuest, NativeSource } from '../../src/gothic3/catalog';
import { executeNativeDialogue } from '../../src/gothic3/dialogue';
import type { DialogueCommandHost, DialogueExecutionPlan } from '../../src/gothic3/dialogue';
import { NativeQuests, QuestStatus } from '../../src/gothic3/quest-state';

const source: NativeSource = { archive: 'test', path: 'test', sha256: 'a'.repeat(64), selection: 'test', layers: [] };

describe('failed quest and dialogue steps leave no trace (A92)', () => {
  it('does not count a delivery whose completion could not be applied, however often it is retried', () => {
    const quest: NativeQuest = { id: 'Q', numericType: 1, prereqs: [], deliveryTargets: [{ entity: 'N', amount: 1, initialCounter: 0 }],
      destination: '', folder: '', logTopic: '', logText: '', runningTime: { years: null, days: null, hours: null },
      rewards: { experience: 100, political: null, enclave: null, job: null, attribute: null }, source, issues: [] };
    const changed = vi.fn();
    const quests = new NativeQuests([quest], { clock: () => null, apply: () => ({ applied: false, reason: 'no experience setter' }), changed });
    quests.seed('Q', { status: QuestStatus.Running, counters: [0], startedAt: null, logKeys: [], logPairs: [] });
    expect(quests.deliverToEntity('Q', 'N').kind).toBe('unsupported');
    expect(quests.deliverToEntity('Q', 'N').kind).toBe('unsupported');
    expect(quests.state('Q')!.counters).toEqual([0]);
    expect(changed).not.toHaveBeenCalled();
  });

  it('rechecks each command before start with the commands before it, as planning did', async () => {
    const op = (i: number) => ({ kind: 'say', sourceIndex: i }) as unknown as DialogueExecutionPlan['operations'][number];
    const operations = [op(0), op(1), op(2)];
    const capability = vi.fn(() => ({ known: true as const, value: true as const }));
    const host = { capability, lifecycleCapability: () => ({ known: false as const, reason: 'stop here' }) } as unknown as DialogueCommandHost;
    const result = await executeNativeDialogue({ operations } as unknown as DialogueExecutionPlan, host);
    expect(result).toEqual({ known: false, reason: 'stop here' });
    expect(capability.mock.calls.map((c) => (c as unknown[])[1])).toEqual([[], [operations[0]], [operations[0], operations[1]]]);
  });
});
