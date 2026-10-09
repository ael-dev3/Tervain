import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/game/state';
import { ARROW_QUIVER_CAPACITY } from '../../src/game/hunting';
import { reviveState } from '../../src/platform/storage';

const save = (edit: (raw: Record<string, any>) => void) => {
  const raw = structuredClone(createInitialState('slot-1')) as unknown as Record<string, any>;
  edit(raw);
  return reviveState(raw);
};

describe('a damaged or hand-edited save (A72)', () => {
  it('is refused with a quest phase or gate state the game never writes', () => {
    expect(save((r) => { r.quest.phase = 'bogus'; })).toBeNull();
    expect(save((r) => { r.quest.gate = 'melted'; })).toBeNull();
  });

  it('drops an unknown allocation and a bad play time', () => {
    const s = save((r) => { r.quest.allocation = 'everyone'; r.playSeconds = 'long'; })!;
    expect(s.quest.allocation).toBeNull();
    expect(s.playSeconds).toBe(0);
  });

  it('keeps offences as lists, so the clock can advance', () => {
    const s = save((r) => { r.offenses = { pending: 'x', known: [null, { offense: 'gate_forced', knownTo: [], atClock: 1 }] }; })!;
    expect(s.offenses.pending).toEqual([]);
    expect(s.offenses.known).toHaveLength(1);
  });

  it('keeps each resident field only when it has its own type', () => {
    const s = save((r) => { const id = Object.keys(r.npcs)[0]!; r.npcs[id] = { available: 'yes', trust: 'high', met: true, cause: 7 }; })!;
    const n = Object.values(s.npcs)[0]!;
    expect(typeof n.available).toBe('boolean');
    expect(typeof n.trust).toBe('number');
    expect(n.met).toBe(true);
    expect(n.cause === null || typeof n.cause === 'string').toBe(true);
  });

  it('never holds more arrows than the quiver takes', () => {
    const s = save((r) => { r.inventory.arrow = 500; })!;
    expect(s.inventory.arrow).toBe(ARROW_QUIVER_CAPACITY);
  });
});
