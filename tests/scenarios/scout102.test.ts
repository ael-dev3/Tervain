import { describe, expect, it } from 'vitest';
import { S } from '../../src/content/strings';
import { Game } from '../../src/game/game';
import { nextHint } from '../../src/game/hints';
import { createInitialState } from '../../src/game/state';
import { MemoryStore, SaveStore, reviveState } from '../../src/platform/storage';
import { slotLabel } from '../../src/presentation/ui/panels';

describe('ninth scout fixes: the jammed gate\'s hint (A102)', () => {
  it('leads to the brace and the crack before telling him to brace the gate', () => {
    const g = new Game();
    const s = g.state;
    s.quest.phase = 'investigating';
    s.discovered.rillford = true;
    s.quest.gate = 'jammed';
    expect(nextHint(s)).toEqual({ key: 'hint.get_brace', place: 'quarry' });
    s.inventory.sluice_brace = 1; s.inventory.gate_wrench = 1;
    expect(nextHint(s).key).toBe('hint.see_sluice');
    s.evidence.cracked_sluice = { via: 'observed', source: 'sluice', atClock: 0 };
    expect(nextHint(s).key).toBe('hint.jammed');
  });
});

describe('ninth scout fixes: what a save may carry (A102)', () => {
  const raw = (edit: (s: Record<string, any>) => void) => {
    const s = JSON.parse(JSON.stringify(createInitialState('slot-1'))) as Record<string, any>;
    edit(s);
    return reviveState(s)!;
  };

  it('resets quest fields of the wrong type rather than loading them', () => {
    const s = raw((s) => { s.quest.entry = 7; s.quest.committedAtClock = '0'; s.quest.witnesses = 'x'; s.quest.reactions = null; s.quest.maintainer = 3; });
    expect([s.quest.entry, s.quest.committedAtClock, s.quest.witnesses, s.quest.reactions, s.quest.maintainer]).toEqual([null, null, [], [], null]);
  });

  it('keeps trust within the game\'s bounds, and the clock at or after the first day', () => {
    const s = raw((s) => { s.npcs.spring_steward.trust = 99; s.npcs.mill_reeve && (s.npcs.mill_reeve.trust = -40); s.clock = -500; });
    expect(s.npcs.spring_steward.trust).toBe(5);
    expect(s.clock).toBe(0);
  });

  it('keeps only whole evidence records and won encounters', () => {
    const s = raw((s) => {
      s.evidence = { worker_testimony: 5, dry_channel: null, cracked_sluice: { via: 'observed', source: 'sluice', atClock: 3 }, made_up: { via: 'observed', source: 'x', atClock: 1 } };
      s.defeated = { cut_creature: false, ford_bandit_a: true };
    });
    expect(Object.keys(s.evidence)).toEqual(['cracked_sluice']);
    expect(s.defeated).toEqual({ ford_bandit_a: true });
  });
});

describe('ninth scout fixes: recovering a damaged save (A102)', () => {
  it('returns the newer verified copy of an interrupted write, not the older backup', () => {
    let now = 1000;
    const mem = new MemoryStore(), store = new SaveStore(mem, () => now);
    const older = createInitialState('slot-1'); older.playSeconds = 0;
    store.save('slot-1', older);
    now = 2000;
    const newer = createInitialState('slot-1'); newer.playSeconds = 999;
    store.save('slot-1', newer);
    // The write of `cur` was cut short after `tmp` was verified and `prev` kept.
    const keys = [...(mem as unknown as { m: Map<string, string> }).m.keys()];
    const cur = keys.find((k) => k.endsWith('slot-1:cur'))!, prevKey = cur.replace(':cur', ':prev'), tmpKey = cur.replace(':cur', ':tmp');
    const text = mem.get(cur)!;
    mem.set(tmpKey, text);
    // `prev` holds the older save, as `save()` keeps it.
    const backup = new MemoryStore();
    new SaveStore(backup, () => 1000).save('slot-1', older);
    mem.set(prevKey, backup.get(cur)!);
    mem.set(cur, text.slice(0, 40));
    const r = store.load('slot-1');
    expect(r.ok && r.state.playSeconds).toBe(999);
    expect(r.ok && r.recovered).toBe('temporary');
    // The list says the slot was recovered, not only the load.
    expect(slotLabel(r, 'slot-1').meta).toContain(S('menu.recovered.slot.temporary'));
  });
});
