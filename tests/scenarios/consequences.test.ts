import { describe, expect, it } from 'vitest';
import { REPORT_DELAY_MIN } from '../../src/game/constants';
import { pickEntryNode } from '../../src/game/dialogue';
import { worldView } from '../../src/game/worldView';
import { MemoryStore, SaveStore } from '../../src/platform/storage';
import { Game } from '../../src/game/game';
import { investigate, must, newGame, takeKit, talk } from './helpers';

describe('archive access and witnessed offenses', () => {
  it('permission opens the door and lets the player read the ledger', () => {
    const g = newGame();
    investigate(g);
    talk(g, 'spring_steward', ['edda_spring', 'edda_hub', 'edda_archive_yes', 'edda_hub']);
    talk(g, 'shrine_warden', ['harrow_hub', 'harrow_open', 'end']);
    expect(g.state.locationChanges.archive_door).toBe('open');
    must(g, { t: 'readLedger' });
    expect(g.state.evidence.rotation_ledger?.via).toBe('document');
  });

  it('a resident can lend a key, and the ledger is readable without theft', () => {
    const g = newGame();
    investigate(g);
    talk(g, 'shrine_warden', ['harrow_hub', 'harrow_key', 'end']);
    expect(g.state.inventory.archive_key).toBe(1);
    must(g, { t: 'readLedger' });
    expect(g.state.evidence.rotation_ledger).toBeDefined();
  });

  it('the ledger cannot be read while the archive is shut', () => {
    const g = newGame();
    expect(g.dispatch({ t: 'readLedger' })).toMatchObject({ ok: false, reason: 'archive_closed' });
  });

  it('an unobserved trespass leaves no report, no penalty, and the evidence still counts', () => {
    const g = newGame();
    must(g, { t: 'archiveAccess', method: 'trespass', observedBy: [] });
    must(g, { t: 'readLedger' });
    g.tickClock(600);
    expect(g.state.offenses.pending).toHaveLength(0);
    expect(g.state.offenses.known).toHaveLength(0);
    expect(g.state.facts.archive_access_lost).toBeUndefined();
    expect(g.state.npcs.spring_steward.trust).toBe(0);
  });

  it('a witnessed trespass reaches the steward only through a delayed report', () => {
    const g = newGame();
    must(g, { t: 'archiveAccess', method: 'trespass', observedBy: ['shrine_warden'] });
    expect(g.state.offenses.pending).toHaveLength(1);
    expect(g.state.facts.archive_access_lost).toBeUndefined();
    g.tickClock(REPORT_DELAY_MIN - 1);
    expect(g.state.facts.archive_access_lost).toBeUndefined();
    g.tickClock(2);
    expect(g.state.offenses.pending).toHaveLength(0);
    expect(g.state.offenses.known[0]?.knownTo).toEqual(['spring_steward']);
    expect(g.state.facts.archive_access_lost).toBe(true);
    expect(g.state.npcs.spring_steward.trust).toBe(-2);
    expect(g.state.locationChanges.archive_door).toBe('locked');
    // The steward brings it up the next time they speak.
    expect(pickEntryNode(g.state, 'spring_steward')).toBe('edda_caught');
  });

  it('a pending report survives save and load without spreading early', () => {
    const mem = new MemoryStore();
    const saves = new SaveStore(mem);
    const g = newGame();
    must(g, { t: 'archiveAccess', method: 'trespass', observedBy: ['shrine_warden'] });
    saves.save('slot-1', g.state);
    const r = saves.load('slot-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const g2 = new Game(r.state);
    expect(g2.state.offenses.pending).toHaveLength(1);
    expect(g2.state.facts.archive_access_lost).toBeUndefined();
    g2.tickClock(REPORT_DELAY_MIN + 1);
    expect(g2.state.facts.archive_access_lost).toBe(true);
  });

  it('withdrawn access cannot be reopened by permission or key', () => {
    const g = newGame();
    must(g, { t: 'archiveAccess', method: 'trespass', observedBy: ['spring_steward'] });
    expect(g.state.facts.archive_access_lost).toBe(true); // witness is the recipient: immediate
    g.state.facts.edda_permission = true;
    expect(g.dispatch({ t: 'archiveAccess', method: 'permission' })).toMatchObject({ ok: false, reason: 'access_withdrawn' });
  });
});

describe('rescue routes and absent principals', () => {
  it('Ila can be rescued by fighting or by the shortcut, not before either', () => {
    const g = newGame();
    expect(g.dispatch({ t: 'rescueWorker', method: 'fight' })).toMatchObject({ ok: false, reason: 'path_blocked' });
    expect(g.dispatch({ t: 'rescueWorker', method: 'shortcut' })).toMatchObject({ ok: false });
    must(g, { t: 'openShortcut' });
    // The gate gives her a way round the ledge; she leaves under her own power.
    expect(g.state.facts.ila_rescued).toBe(true);
    expect(g.state.facts.ila_method).toBe('shortcut');

    const f = newGame();
    must(f, { t: 'defeat', id: 'cut_creature' });
    talk(f, 'maintenance_worker', ['ila_free_fight', 'end']);
    expect(f.state.facts.ila_method).toBe('fight');
  });

  it('Ila\'s testimony gives the procedure and pays out once', () => {
    const g = newGame();
    must(g, { t: 'defeat', id: 'cut_creature' });
    talk(g, 'maintenance_worker', ['ila_free_fight', 'end']);
    talk(g, 'maintenance_worker', ['ila_hub']);
    expect(g.state.evidence.worker_testimony).toBeDefined();
    expect(g.state.evidence.reduced_spring_flow?.via).toBe('testimony');
    expect(g.state.inventory.poultice).toBe(2);
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    expect(g.state.facts.surge_hurt).toBeUndefined(); // procedure makes the operation safe
  });

  it('the inspection route stays open when Ila is unavailable', () => {
    const g = newGame();
    must(g, { t: 'setUnavailable', npc: 'maintenance_worker', cause: 'test' });
    investigate(g);
    takeKit(g);
    expect(g.dispatch({ t: 'stabilizeGate' }).ok).toBe(true);
    expect(g.dispatch({ t: 'rescueWorker', method: 'fight' })).toMatchObject({ ok: false, reason: 'worker_unavailable' });
    expect(pickEntryNode(g.state, 'maintenance_worker')).toBeNull();
  });

  it.each(['rillford_reeve', 'spring_steward', 'quarry_foreman'] as const)(
    'with %s unavailable an emergency allocation is still possible and gets a public statement',
    (npc) => {
      const g = newGame();
      investigate(g);
      takeKit(g);
      must(g, { t: 'stabilizeGate' });
      must(g, { t: 'setUnavailable', npc, cause: 'test' });
      must(g, { t: 'commitAllocation', allocation: 'quarry' });
      expect(g.state.facts.public_statement_posted).toBe(true);
      expect(worldView(g.state).noticeboard).toContain('board.public_statement');
      // Killing or losing a principal does not award their normal trust.
      expect(g.state.npcs[npc].trust).toBe(0);
    },
  );

  it('a rotation with an unavailable decision-maker records a caretaker witness', () => {
    const g = newGame();
    investigate(g);
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    must(g, { t: 'setUnavailable', npc: 'quarry_foreman', cause: 'test' });
    g.state.facts.consent_mara = true;
    g.state.facts.consent_edda = true;
    must(g, { t: 'commitAllocation', allocation: 'rotation' });
    expect(g.state.facts.rotation_caretaker_witness).toBe(true);
    expect(g.state.quest.witnesses).toEqual(['rillford_reeve', 'spring_steward']);
    // The caretaker acknowledges the result.
    expect(pickEntryNode(g.state, 'quarry_hand')).toBe('pell_caretaker');
  });
});

describe('out-of-order and repeated play', () => {
  it('visiting places out of order never breaks progression', () => {
    const g = newGame();
    must(g, { t: 'discover', place: 'quarry' });
    must(g, { t: 'inspect', pointId: 'sluice_crack' });
    must(g, { t: 'discover', place: 'rillford' });
    expect(g.state.quest.phase).toBe('investigating');
    expect(g.state.quest.entry).toBe('sluice');
  });

  it('repeated commitment attempts are rejected', () => {
    const g = newGame();
    investigate(g);
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    must(g, { t: 'commitAllocation', allocation: 'rillford' });
    expect(g.dispatch({ t: 'commitAllocation', allocation: 'quarry' })).toMatchObject({ ok: false, reason: 'already_committed' });
    expect(g.state.quest.allocation).toBe('rillford');
  });

  it('leaving a conversation mid-way changes nothing', () => {
    const g = newGame();
    const before = JSON.stringify(g.state);
    const node = pickEntryNode(g.state, 'rillford_reeve')!;
    g.showNode(node);
    expect(JSON.stringify(g.state)).toBe(before);
  });

  it('a jammed gate is a recoverable repair, and NPCs react to it once', () => {
    const g = newGame();
    investigate(g);
    must(g, { t: 'forceGate' });
    g.state.npcs.rillford_reeve.met = true;
    expect(pickEntryNode(g.state, 'rillford_reeve')).toBe('mara_jammed');
    talk(g, 'rillford_reeve', ['mara_hub']);
    expect(pickEntryNode(g.state, 'rillford_reeve')).toBe('mara_hub');
  });
});

describe('training', () => {
  it('costs ten coin unless the player has already proven themselves', () => {
    const paid = newGame();
    paid.state.inventory.coin = 12;
    talk(paid, 'shrine_warden', ['harrow_train', 'harrow_trained']);
    expect(paid.state.skills).toContain('steady_guard');
    expect(paid.state.inventory.coin).toBe(2);

    const proven = newGame();
    must(proven, { t: 'defeat', id: 'ford_bandit_a' });
    talk(proven, 'shrine_warden', ['harrow_train', 'harrow_trained']);
    expect(proven.state.inventory.coin).toBe(6);
    expect(proven.dispatch({ t: 'train', skill: 'steady_guard' })).toMatchObject({ ok: false });
  });

  it('cannot be bought without payment or competence', () => {
    const g = newGame();
    expect(g.dispatch({ t: 'train', skill: 'steady_guard' })).toMatchObject({ ok: false, reason: 'need_payment' });
  });
});
