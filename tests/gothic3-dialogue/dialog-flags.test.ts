import { describe, expect, it } from 'vitest';
import { planNativeDialogue } from '../../src/gothic3/dialogue';
import type { DialogueCommandHost, DialogueFacts } from '../../src/gothic3/dialogue';
import type { NativeInfo } from '../../src/gothic3/catalog';

const player = { id: 'player', name: 'PC_Hero' };
const npc = { id: '1'.repeat(40), name: 'Diego' };

function sourceInfo(command: string): NativeInfo {
  return { id: 'Ardea_FlagTest', sortId: 1, owner: npc.name, parent: '', quest: '',
    conditionType: 3, type: 1, given: false, permanent: false, clearChildren: false, goldCost: 0,
    folder: '', conditions: { ownerNearEntity: '', playerKnows: [], itemContainer: '', items: [],
      secondaryNPCs: [], playerSkills: [], namedPlayerSkills: [] },
    teach: { isPerk: null, index: null, value: null, skill: '', attribute: '', attributeValue: 0 },
    commands: [{ index: 0, command, entity1: 'self', entity2: '', id1: 'true', id2: '', text: '' }],
    source: { archive: 'source', path: 'test.info', sha256: 'a'.repeat(64), selection: 'test', layers: [] }, issues: [] };
}

const facts: DialogueFacts = {
  entity(name) { return name === npc.name ? { known: true, value: npc } : { known: true, value: null }; },
  given() { return { known: true, value: false }; },
  quest() { return { known: true, value: null }; },
  ownerDistance() { return { known: true, value: 0 }; },
  playerKnows() { return { known: true, value: false }; },
  itemStackAmount() { return { known: true, value: null }; },
  actor() { return { known: false, reason: 'unused actor fact' }; },
  actorDialog() { return { known: false, reason: 'unused dialog fact' }; },
  dialogFlag() { return { known: true, value: false }; },
  condition() { return { kind: 'available' }; },
};

const host: DialogueCommandHost = {
  integer(value) { const parsed = Number(value); return Number.isInteger(parsed) ? { known: true, value: parsed } : { known: false, reason: 'bad integer' }; },
  booleanOperand(value) { return value === 'true' || value === 'false'
    ? { known: true, value: value === 'true' } : { known: false, reason: 'bad bool' }; },
  startGuards() { return { kind: 'available' }; },
  capability() { return { known: true, value: true }; },
  lifecycleCapability() { return { known: true, value: true }; },
  currentAvailability() { return { kind: 'available' }; },
  async start() { return { known: true, value: true }; },
  markGiven() {},
  async execute() { return { kind: 'completed' }; },
  async delivery() { return { known: true, value: true }; },
  async finish() { return { known: true, value: true }; },
};

describe('source Ardea Dialog enable commands', () => {
  it.each([
    ['SetPartyEnabled', 'PartyEnabled'],
    ['SetTeachEnabled', 'TeachEnabled'],
  ] as const)('maps %s to its source Dialog property', (command, field) => {
    const info = sourceInfo(command);
    const result = planNativeDialogue(info, { player, a: player, b: npc }, facts, [info], host,
      new Set([command]));
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(result.plan.operations).toEqual([{ kind: 'dialogFlag', entity: npc, field, value: true, sourceIndex: 0 }]);
  });
});
