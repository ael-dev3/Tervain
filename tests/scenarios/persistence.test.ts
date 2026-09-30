import { describe, expect, it } from 'vitest';
import { APPLY_DELAY_MIN } from '../../src/game/constants';
import { CONTENT_REVISION, SAVE_FORMAT_VERSION } from '../../src/game/types';
import { Game } from '../../src/game/game';
import { MemoryStore, SaveStore, checksum } from '../../src/platform/storage';
import { investigate, must, newGame, takeKit } from './helpers';

const fresh = () => {
  const mem = new MemoryStore();
  let t = 1000;
  return { mem, saves: new SaveStore(mem, () => ++t) };
};

describe('save envelope and recovery', () => {
  it('round-trips the full world state', () => {
    const { saves } = fresh();
    const g = newGame();
    investigate(g);
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    expect(saves.save('slot-1', g.state)).toEqual({ ok: true });
    const r = saves.load('slot-1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state).toEqual(g.state);
      expect(r.summary.phase).toBe('decision_ready');
    }
  });

  it('keeps the previous save and recovers from a corrupted current save', () => {
    const { mem, saves } = fresh();
    const g = newGame();
    must(g, { t: 'inspect', pointId: 'dry_channel' });
    saves.save('slot-1', g.state);
    must(g, { t: 'inspect', pointId: 'spring_sediment' });
    saves.save('slot-1', g.state);
    // Truncate the current save the way an interrupted write might.
    const key = mem.keys().find((k) => k.endsWith(':slot-1:cur'))!;
    mem.set(key, mem.get(key)!.slice(0, 200));
    const r = saves.load('slot-1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.recovered).toBe('previous');
      expect(r.state.evidence.dry_channel).toBeDefined();
      expect(r.state.evidence.reduced_spring_flow).toBeUndefined();
    }
  });

  it('distinguishes missing, corrupt and incompatible saves', () => {
    const { mem, saves } = fresh();
    expect(saves.load('slot-2')).toMatchObject({ ok: false, kind: 'missing' });
    mem.set('tervain:save:slot-2:cur', 'not json');
    expect(saves.load('slot-2')).toMatchObject({ ok: false, kind: 'corrupt' });
    const state = JSON.stringify(newGame().state);
    mem.set(
      'tervain:save:slot-3:cur',
      JSON.stringify({ magic: 'tervain-save', saveFormatVersion: 999, checksum: checksum(state), state: JSON.parse(state) }),
    );
    expect(saves.load('slot-3')).toMatchObject({ ok: false, kind: 'incompatible' });
  });

  it('rejects a tampered payload and oversized data', () => {
    const { mem, saves } = fresh();
    saves.save('slot-1', newGame().state);
    const key = 'tervain:save:slot-1:cur';
    mem.set(key, mem.get(key)!.replaceAll('"phase":"unseen"', '"phase":"settled"'));
    expect(saves.load('slot-1')).toMatchObject({ ok: false, kind: 'corrupt' });
    mem.set('tervain:save:slot-2:cur', 'x'.repeat(600 * 1024));
    expect(saves.load('slot-2')).toMatchObject({ ok: false, kind: 'corrupt' });
  });

  it('fills fields added by later builds from defaults', () => {
    const { mem, saves } = fresh();
    const g = newGame();
    saves.save('slot-1', g.state);
    const env = JSON.parse(mem.get('tervain:save:slot-1:cur')!);
    delete env.state.discovered;
    delete env.state.skills;
    env.checksum = checksum(JSON.stringify(env.state));
    mem.set('tervain:save:slot-1:cur', JSON.stringify(env));
    const r = saves.load('slot-1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.skills).toEqual([]);
  });

  it('loads a format-1 0.0.4 save without imposing the new amnesiac opening or erasing prior progress', () => {
    const { mem, saves } = fresh();
    const g = newGame();
    investigate(g);
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    g.state.npcs.rillford_reeve.met = true;
    g.state.npcs.rillford_reeve.trust = 2;
    g.state.facts.edda_permission = true;
    g.state.locationChanges.archive_door = 'open';
    g.state.player = { x: 20, y: 1.2, z: 8, yaw: 0.7, health: 73, maxHealth: 100 };
    // The previous build used format 1 and did not contain an arrival_amnesia fact.
    delete g.state.facts.arrival_amnesia;
    g.state.contentRevision = 'bellwether-proto-0.0.4';
    saves.save('slot-1', g.state);
    const env = JSON.parse(mem.get('tervain:save:slot-1:cur')!);
    env.gameBuild = 'prototype-0.0.4';
    env.contentRevision = 'bellwether-proto-0.0.4';
    env.saveFormatVersion = 1;
    env.checksum = checksum(JSON.stringify(env.state));
    mem.set('tervain:save:slot-1:cur', JSON.stringify(env));
    const result = saves.load('slot-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(SAVE_FORMAT_VERSION).toBe(1);
    expect(result.summary.gameBuild).toBe('prototype-0.0.4');
    expect(result.state.contentRevision).toBe(CONTENT_REVISION);
    expect(result.state.facts.arrival_amnesia).toBeUndefined();
    expect(result.state.player).toEqual(g.state.player);
    expect(result.state.quest).toEqual(g.state.quest);
    expect(result.state.evidence).toEqual(g.state.evidence);
    expect(result.state.inventory).toEqual(g.state.inventory);
    expect(result.state.npcs.rillford_reeve).toEqual(g.state.npcs.rillford_reeve);
    expect(result.state.locationChanges.archive_door).toBe('open');
    expect(result.state.facts.edda_permission).toBe(true);
  });

  it('latest() picks the most recently written slot', () => {
    const { saves } = fresh();
    const g = newGame();
    saves.save('slot-1', g.state);
    must(g, { t: 'inspect', pointId: 'dry_channel' });
    saves.save('quick', g.state);
    expect(saves.latest()?.slot).toBe('quick');
  });
});

describe('persistent state across reload', () => {
  const reload = (g: Game) => {
    const { saves } = fresh();
    saves.save('slot-1', g.state);
    const r = saves.load('slot-1');
    if (!r.ok) throw new Error('load failed');
    return new Game(r.state);
  };

  it('a reload before commitment keeps the gate repaired and never re-awards the kit', () => {
    const g = newGame();
    investigate(g);
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    const g2 = reload(g);
    expect(g2.state.quest.gate).toBe('stabilized');
    expect(g2.dispatch({ t: 'pickup', pickupId: 'quarry_brace', item: 'sluice_brace', qty: 1 })).toMatchObject({ ok: false });
    expect(g2.state.inventory.sluice_brace).toBe(0);
  });

  it('a reload after settling keeps the outcome and the once-only reward', () => {
    const g = newGame();
    investigate(g);
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    must(g, { t: 'commitAllocation', allocation: 'quarry' });
    g.tickClock(APPLY_DELAY_MIN + 1);
    must(g, { t: 'settle', via: 'test' });
    const coin = g.state.inventory.coin;
    const g2 = reload(g);
    expect(g2.state.quest.phase).toBe('settled');
    expect(g2.state.quest.allocation).toBe('quarry');
    expect(g2.dispatch({ t: 'settle', via: 'again' })).toMatchObject({ ok: false });
    expect(g2.state.inventory.coin).toBe(coin);
  });

  it('a defeated encounter stays defeated', () => {
    const g = newGame();
    must(g, { t: 'defeat', id: 'cut_creature' });
    expect(reload(g).state.defeated.cut_creature).toBe(true);
  });
});

describe('review fixes: save handling', () => {
  it('a reload while committed keeps the arrangement and still lets it settle once', () => {
    const { saves } = fresh();
    const g = newGame();
    investigate(g);
    takeKit(g);
    must(g, { t: 'stabilizeGate' });
    must(g, { t: 'commitAllocation', allocation: 'rillford' });
    saves.save('slot-1', g.state);
    const r = saves.load('slot-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const g2 = new Game(r.state);
    expect(g2.state.quest.phase).toBe('committed');
    g2.tickClock(APPLY_DELAY_MIN + 1);
    must(g2, { t: 'settle', via: 'test' });
    expect(g2.dispatch({ t: 'settle', via: 'again' })).toMatchObject({ ok: false });
  });

  it('a corrupt current save never replaces the good previous save', () => {
    const { mem, saves } = fresh();
    const g = newGame();
    must(g, { t: 'inspect', pointId: 'dry_channel' });
    saves.save('slot-1', g.state);
    must(g, { t: 'inspect', pointId: 'spring_sediment' });
    saves.save('slot-1', g.state);
    const cur = 'tervain:save:slot-1:cur';
    mem.set(cur, mem.get(cur)!.slice(0, 120));
    // Saving again must not copy the damaged file over the previous good one.
    saves.save('slot-1', g.state);
    const prev = saves.load('slot-1');
    expect(prev.ok).toBe(true);
    if (prev.ok) expect(prev.state.evidence.reduced_spring_flow).toBeDefined();
    // The previous copy is still the first good write, not the damaged file.
    const prevRaw = JSON.parse(mem.get('tervain:save:slot-1:prev')!);
    expect(prevRaw.state.evidence.dry_channel).toBeDefined();
    expect(prevRaw.state.evidence.reduced_spring_flow).toBeUndefined();
  });
});
