import { describe, expect, it } from 'vitest';
import { DIALOGUE_NODES } from '../../src/content/dialogue';
import { APPLY_DELAY_MIN, REWARD_COIN } from '../../src/game/constants';
import { buildJournal } from '../../src/game/journal';
import { Game } from '../../src/game/game';
import { worldView } from '../../src/game/worldView';
import { investigate, must, newGame, takeKit, talk } from './helpers';

function stabilized(game: Game) {
  investigate(game);
  takeKit(game);
  must(game, { t: 'stabilizeGate' });
}

describe('The Dry Bell: phases and entry points', () => {
  it('starts unseen and enters investigation from any recognized trigger', () => {
    for (const trigger of [
      () => (g: Game) => must(g, { t: 'discover', place: 'rillford' }),
      () => (g: Game) => must(g, { t: 'discover', place: 'sluice' }),
      () => (g: Game) => must(g, { t: 'inspect', pointId: 'dry_channel' }),
      () => (g: Game) => talk(g, 'quarry_hand', ['end']),
    ]) {
      const g = newGame();
      expect(g.state.quest.phase).toBe('unseen');
      trigger()(g);
      expect(g.state.quest.phase).toBe('investigating');
    }
  });

  it('reveals only the relevant lead in the journal', () => {
    const g = newGame();
    must(g, { t: 'inspect', pointId: 'dry_channel' });
    const j = buildJournal(g.state);
    expect(j.leadKey).toBe('journal.lead.dry_channel');
    expect(j.observed.map((e) => e.id)).toEqual(['ev:dry_channel']);
  });

  it('adds evidence once and keeps its first provenance', () => {
    const g = newGame();
    must(g, { t: 'observe', id: 'cracked_sluice', via: 'observed', source: 'a' });
    must(g, { t: 'observe', id: 'cracked_sluice', via: 'testimony', source: 'b' });
    expect(g.state.evidence.cracked_sluice?.source).toBe('a');
  });
});

describe('derived evidence and journal columns', () => {
  it('derives diversion_and_seep from seeing both channels or hearing both admissions', () => {
    const seen = newGame();
    must(seen, { t: 'inspect', pointId: 'town_diversion' });
    expect(seen.state.evidence.diversion_and_seep).toBeUndefined();
    must(seen, { t: 'inspect', pointId: 'quarry_seep' });
    expect(seen.state.evidence.diversion_and_seep?.via).toBe('derived');

    const heard = newGame();
    must(heard, { t: 'setFact', key: 'reeve_admits_diversion', value: true });
    must(heard, { t: 'setFact', key: 'foreman_admits_seep', value: true });
    expect(heard.state.evidence.diversion_and_seep).toBeDefined();
  });

  it('separates testimony from observation and shows a contradiction as a question', () => {
    const g = newGame();
    talk(g, 'quarry_foreman', ['darin_cause']);
    let j = buildJournal(g.state);
    expect(j.questions.map((q) => q.id)).toContain('q:spring');
    must(g, { t: 'inspect', pointId: 'spring_sediment' });
    j = buildJournal(g.state);
    expect(j.questions.map((q) => q.id)).not.toContain('q:spring');
    expect(j.concluded.map((c) => c.id)).toContain('c:sediment');
  });
});

describe('gate: stabilize, force, recover', () => {
  it('cannot stabilize without the kit or without understanding', () => {
    const g = newGame();
    expect(g.dispatch({ t: 'stabilizeGate' })).toMatchObject({ ok: false, reason: 'need_brace' });
    takeKit(g);
    expect(g.dispatch({ t: 'stabilizeGate' })).toMatchObject({ ok: false, reason: 'need_understanding' });
    must(g, { t: 'inspect', pointId: 'sluice_crack' });
    expect(g.dispatch({ t: 'stabilizeGate' }).ok).toBe(true);
  });

  it('consumes the brace exactly once, keeps the wrench, and reaches decision_ready', () => {
    const g = newGame();
    stabilized(g);
    expect(g.state.inventory.sluice_brace).toBe(0);
    expect(g.state.inventory.gate_wrench).toBe(1);
    expect(g.state.quest.gate).toBe('stabilized');
    expect(g.state.quest.phase).toBe('decision_ready');
    expect(g.dispatch({ t: 'stabilizeGate' })).toMatchObject({ ok: false });
  });

  it('a careful inspection alone works but the surge costs health; the rite or Ila\'s procedure avoids it', () => {
    const plain = newGame();
    stabilized(plain);
    expect(plain.state.facts.surge_hurt).toBe(true);
    expect(plain.state.player.health).toBeLessThan(100);

    const rite = newGame();
    investigate(rite);
    takeKit(rite);
    talk(rite, 'spring_steward', ['edda_spring', 'edda_hub']);
    must(rite, { t: 'setFact', key: 'rite_taught', value: true });
    rite.state.inventory.votive_reed = 1;
    must(rite, { t: 'performRite' });
    must(rite, { t: 'stabilizeGate' });
    expect(rite.state.facts.surge_hurt).toBeUndefined();
    expect(rite.state.player.health).toBe(100);
  });

  it('the rite calm expires', () => {
    const g = newGame();
    investigate(g);
    takeKit(g);
    must(g, { t: 'setFact', key: 'rite_taught', value: true });
    g.state.inventory.votive_reed = 1;
    must(g, { t: 'performRite' });
    g.tickClock(60);
    must(g, { t: 'stabilizeGate' });
    expect(g.state.facts.surge_hurt).toBe(true);
  });

  it('forcing the gate jams it, makes rationing worse, keeps the investigation, and is recoverable', () => {
    const g = newGame();
    investigate(g);
    const before = worldView(g.state).flow.village;
    must(g, { t: 'forceGate' });
    expect(g.state.quest.gate).toBe('jammed');
    expect(g.state.quest.repairRequired).toBe(true);
    expect(worldView(g.state).flow.village).toBeLessThan(before);
    expect(g.state.evidence.cracked_sluice).toBeDefined();
    expect(g.state.quest.phase).toBe('investigating');
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    expect(g.state.quest.gate).toBe('stabilized');
    expect(g.state.quest.repairRequired).toBe(false);
    expect(g.state.quest.phase).toBe('decision_ready');
  });

  it('cannot commit before safe control', () => {
    const g = newGame();
    investigate(g);
    expect(g.dispatch({ t: 'commitAllocation', allocation: 'rillford' })).toMatchObject({ ok: false });
  });
});

describe('allocations', () => {
  const settle = (g: Game) => {
    g.tickClock(APPLY_DELAY_MIN + 1);
    must(g, { t: 'settle', via: 'test' });
  };

  it.each(['rillford', 'quarry'] as const)('%s priority: reachable, emergency-flagged, visible and settles once', (alloc) => {
    const g = newGame();
    stabilized(g);
    must(g, { t: 'commitAllocation', allocation: alloc });
    expect(g.state.quest.phase).toBe('committed');
    expect(g.state.facts.emergency_allocation).toBe(true);
    const v = worldView(g.state);
    expect(v.visibleDetails.length).toBeGreaterThanOrEqual(3);
    expect(v.flow.spring).toBeGreaterThanOrEqual(0.28);
    expect(g.dispatch({ t: 'settle', via: 'test' })).toMatchObject({ ok: false, reason: 'still_applying' });
    settle(g);
    expect(g.state.quest.phase).toBe('settled');
    expect(g.state.inventory.coin).toBe(6 + REWARD_COIN);
    const cloth = alloc === 'rillford' ? 'league_sash' : 'contract_band';
    expect(g.state.inventory[cloth]).toBe(1);
    // A second settle does nothing: rewards occur once.
    expect(g.dispatch({ t: 'settle', via: 'again' })).toMatchObject({ ok: false });
    expect(g.state.inventory.coin).toBe(6 + REWARD_COIN);
    expect(g.state.facts.callback_quarry_contract).toBe(alloc);
  });

  it('rillford priority idles the quarry and turns the mill; quarry priority does the reverse', () => {
    const a = newGame();
    stabilized(a);
    must(a, { t: 'commitAllocation', allocation: 'rillford' });
    const va = worldView(a.state);
    expect(va.millTurning).toBe(true);
    expect(va.idleQuarryCrew).toBe(true);
    expect(va.flow.village).toBeGreaterThan(va.flow.quarry);

    const b = newGame();
    stabilized(b);
    must(b, { t: 'commitAllocation', allocation: 'quarry' });
    const vb = worldView(b.state);
    expect(vb.millTurning).toBe(false);
    expect(vb.contractGuard).toBe(true);
    expect(vb.flow.quarry).toBeGreaterThan(vb.flow.village);
  });

  it('rotation needs evidence of both needs and every available decision-maker\'s consent', () => {
    const g = newGame();
    stabilized(g);
    expect(g.dispatch({ t: 'commitAllocation', allocation: 'rotation' })).toMatchObject({ ok: false });
    expect(g.state.quest.phase).toBe('decision_ready');
  });

  it('a witnessed rotation via Mara, Darin (coin route, no ledger) and Edda works and alternates with the day', () => {
    const g = newGame();
    stabilized(g);
    g.state.inventory.coin = 20;
    talk(g, 'rillford_reeve', ['mara_cause', 'mara_directions', 'mara_hub', 'mara_rotation', 'mara_hub']);
    talk(g, 'spring_steward', ['edda_spring', 'edda_hub', 'edda_consent', 'edda_hub']);
    talk(g, 'quarry_foreman', ['darin_cause', 'darin_hub', 'darin_rotation_pay', 'darin_hub']);
    expect(g.state.inventory.coin).toBe(10);
    expect(g.state.facts.consent_darin).toBe(true);
    expect(g.state.facts.consent_mara).toBe(true);
    expect(g.state.facts.consent_edda).toBe(true);
    must(g, { t: 'commitAllocation', allocation: 'rotation' });
    expect(g.state.quest.witnesses).toHaveLength(3);
    expect(g.state.facts.emergency_allocation).toBeUndefined();
    g.state.clock = 12 * 60;
    const day = worldView(g.state);
    expect(day.scheduleBoard).toBe(true);
    expect(day.millTurning).toBe(true);
    g.state.clock = 22 * 60;
    const night = worldView(g.state);
    expect(night.millTurning).toBe(false);
    expect(night.quarryState).toBe('night_shift');
    expect(night.flow.quarry).toBeGreaterThan(night.flow.village);
  });

  it("the ledger makes Darin's consent free of the coin cost", () => {
    const g = newGame();
    stabilized(g);
    must(g, { t: 'observe', id: 'rotation_ledger', via: 'document', source: 'test' });
    talk(g, 'quarry_foreman', ['darin_cause', 'darin_hub', 'darin_rotation_ledger']);
    expect(g.state.facts.consent_darin).toBe(true);
    expect(g.state.inventory.coin).toBe(6);
  });

  it('humiliating the foreman blocks his consent until mediated', () => {
    const g = newGame();
    investigate(g);
    talk(g, 'quarry_foreman', ['darin_cause', 'darin_hub', 'darin_humiliate']);
    expect(g.state.facts.darin_humiliated).toBe(true);
    const node = 'darin_hub';
    const visible = g.choices(node).filter((c) => c.choice.next.startsWith('darin_rotation'));
    expect(visible).toHaveLength(0);
    talk(g, 'quarry_foreman', ['darin_mediate', 'darin_hub']);
    expect(g.state.facts.darin_humiliated).toBe(false);
  });

  it('keeps a paid bonus through a quarrel: reconciling restores his consent without paying again (A72)', () => {
    const g = newGame();
    stabilized(g);
    g.state.inventory.coin = 20;
    g.state.facts.saw_seep = true;
    talk(g, 'quarry_foreman', ['darin_cause', 'darin_hub', 'darin_rotation_pay', 'darin_hub']);
    expect(g.state.inventory.coin).toBe(10);
    talk(g, 'quarry_foreman', ['darin_humiliate']);
    expect(g.state.facts.consent_darin).toBe(false);
    talk(g, 'quarry_foreman', ['darin_mediate', 'darin_hub']);
    expect(g.state.facts.consent_darin).toBe(true);
    expect(g.state.inventory.coin).toBe(10);
  });

  it('hiding the ledger yields a misleading public account', () => {
    const g = newGame();
    stabilized(g);
    must(g, { t: 'observe', id: 'rotation_ledger', via: 'document', source: 'test' });
    talk(g, 'rillford_reeve', ['mara_cause', 'mara_directions', 'mara_hub', 'mara_hide']);
    must(g, { t: 'commitAllocation', allocation: 'quarry' });
    const v = worldView(g.state);
    expect(v.noticeboard).toContain('board.account_flood_only');
    expect(buildJournal(g.state).concluded.map((c) => c.id)).toContain('c:misleading');
  });
});

describe('one-time rewards and atomic effects', () => {
  it('repeating dialogue never duplicates a grant', () => {
    const g = newGame();
    investigate(g);
    talk(g, 'spring_steward', ['edda_spring', 'edda_hub', 'edda_rite', 'edda_hub']);
    expect(g.state.inventory.votive_reed).toBe(1);
    // Force the same choice again by clearing the fact that hides it.
    g.state.facts.rite_taught = false;
    talk(g, 'spring_steward', ['edda_rite']);
    expect(g.state.inventory.votive_reed).toBe(1);
  });

  it('a failing effect leaves the world untouched', () => {
    const g = newGame();
    investigate(g);
    g.state.inventory.coin = 4;
    // Reach the pay node with a rotation-ready position but only 4 coin: the choice is locked.
    const before = JSON.stringify(g.state);
    const node = 'darin_rotation_pay';
    const idx = g.choices(node).findIndex((c) => c.choice.next === 'darin_hub' && c.locked);
    expect(idx).toBeGreaterThanOrEqual(0);
    const r = g.choose(node, 0);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(g.state)).toBe(before);
  });

  it('effects are validated before commit: an inventory failure never half-applies', () => {
    DIALOGUE_NODES.test_atomic = {
      id: 'test_atomic',
      speaker: 'narrator',
      text: 'x',
      choices: [{ text: 'x', next: 'end', effects: [{ t: 'item', id: 'coin', delta: 5 }, { t: 'fact', key: 'half_applied' }, { t: 'item', id: 'coin', delta: -99 }] }],
    };
    const g = newGame();
    const before = JSON.stringify(g.state);
    const r = g.choose('test_atomic', 0);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(g.state)).toBe(before);
    delete DIALOGUE_NODES.test_atomic;
  });

  it('pickups occur once', () => {
    const g = newGame();
    takeKit(g);
    expect(g.dispatch({ t: 'pickup', pickupId: 'quarry_brace', item: 'sluice_brace', qty: 1 })).toMatchObject({ ok: false });
    expect(g.state.inventory.sluice_brace).toBe(1);
  });
});

describe('rotation settles once', () => {
  it('a witnessed rotation completes, pays once, and cannot be settled twice', () => {
    const g = newGame();
    stabilized(g);
    g.state.facts.consent_mara = true;
    g.state.facts.consent_edda = true;
    g.state.facts.consent_darin = true;
    must(g, { t: 'commitAllocation', allocation: 'rotation' });
    g.tickClock(APPLY_DELAY_MIN + 1);
    must(g, { t: 'settle', via: 'test' });
    expect(g.state.inventory.witness_cord).toBe(1);
    expect(g.state.inventory.coin).toBe(6 + REWARD_COIN);
    expect(g.dispatch({ t: 'settle', via: 'again' })).toMatchObject({ ok: false });
    expect(g.state.inventory.coin).toBe(6 + REWARD_COIN);
  });
});

describe('guidance toward the sluice repair (A71)', () => {
  it('keeps pointing at the quarry until both the brace and the wrench are carried', async () => {
    const { nextHint } = await import('../../src/game/hints');
    const game = newGame();
    must(game, { t: 'discover', place: 'rillford' });
    must(game, { t: 'discover', place: 'sluice' });
    investigate(game);
    must(game, { t: 'pickup', pickupId: 'quarry_brace', item: 'sluice_brace', qty: 1 });
    expect(nextHint(game.state)).toEqual({ key: 'hint.get_brace', place: 'quarry' });
    must(game, { t: 'pickup', pickupId: 'quarry_wrench', item: 'gate_wrench', qty: 1 });
    expect(nextHint(game.state)).toEqual({ key: 'hint.stabilize', place: 'sluice' });
  });
});
