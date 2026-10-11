import { describe, expect, it } from 'vitest';
import { NPCS } from '../../src/content/npcs';
import { S } from '../../src/content/strings';
import { Game } from '../../src/game/game';
import { resolveGoal } from '../../src/presentation/actors';

describe('third scout fixes: game rules and content (A94)', () => {
  it('frees Ila when the thornback falls, once, as the opened gate does', () => {
    const g = new Game();
    const events = g.dispatch({ t: 'defeat', id: 'cut_creature' });
    expect(g.state.facts.ila_rescued).toBe(true);
    expect(g.state.facts.ila_method).toBe('fight');
    expect(JSON.stringify(events)).toContain('worker_rescued');
    // The gate opened afterwards does not rescue her a second time.
    const trust = g.state.npcs.maintenance_worker.trust;
    g.dispatch({ t: 'openShortcut' });
    expect(g.state.facts.ila_method).toBe('fight');
    expect(g.state.npcs.maintenance_worker.trust).toBe(trust);
    // Other foes rescue nobody.
    const h = new Game();
    h.dispatch({ t: 'defeat', id: 'ford_bandit_a' });
    expect(h.state.facts.ila_rescued).toBeUndefined();
  });

  it('keeps Pell on the night crew from the rotation agreed onward, resting by day, with no gap', () => {
    for (const phase of ['committed', 'settled'] as const) {
      const g = new Game();
      g.state.quest.phase = phase;
      g.state.quest.allocation = 'rotation';
      for (let hour = 0; hour < 24; hour++) {
        const goal = resolveGoal(NPCS.quarry_hand, g.state, hour + 0.5);
        if (hour >= 18 || hour < 6) expect([phase, hour, goal.anchor, goal.activity]).toEqual([phase, hour, 'quarry_face', 'work']);
        else expect([phase, hour, goal.anchor, goal.activity]).toEqual([phase, hour, 'crew_bunks', 'rest']);
      }
    }
    // Without the rotation he keeps his day shift.
    const g = new Game();
    g.state.quest.phase = 'settled';
    g.state.quest.allocation = 'quarry';
    expect(resolveGoal(NPCS.quarry_hand, g.state, 12).activity).toBe('work');
    expect(resolveGoal(NPCS.quarry_hand, g.state, 23).activity).toBe('rest');
  });

  it('has words for every refusal the hunter trade and the gate can give', () => {
    for (const key of ['hunting.player_dead', 'hunting.invalid_quantity', 'toast.need.already_stable']) expect(S(key)).not.toBe(key);
  });
});
