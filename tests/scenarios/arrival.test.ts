import { describe, expect, it } from 'vitest';
import { hasString } from '../../src/content/strings';
import { Game } from '../../src/game/game';
import { nextHint } from '../../src/game/hints';
import { buildJournal } from '../../src/game/journal';
import { NPC_IDS } from '../../src/game/types';
import { MemoryStore, SaveStore } from '../../src/platform/storage';
import { must } from './helpers';

describe('0.0.5 silent arrival', () => {
  it('starts with no remembered identity, testimony, acquaintances or water-dispute decision', () => {
    const g = new Game();
    expect(g.state.facts.arrival_amnesia).toBe(true);
    expect(g.state.quest).toMatchObject({ phase: 'unseen', entry: null, allocation: null, witnesses: [] });
    expect(g.state.evidence).toEqual({});
    expect(NPC_IDS.every((id) => !g.state.npcs[id].met)).toBe(true);
    expect(buildJournal(g.state)).toMatchObject({
      leadKey: 'journal.lead.arrival', statusKey: 'journal.status.arrival', reported: [],
    });
    // Guidance describes the visible landscape rather than disclosing an undiscovered town on the map.
    expect(nextHint(g.state)).toEqual({ key: 'hint.find_woodland_track', place: null });
  });

  it('records the hull and trail marker without starting a quest or inventing a voyage', () => {
    const g = new Game();
    must(g, { t: 'inspect', pointId: 'arrival_wreckage' });
    must(g, { t: 'inspect', pointId: 'templar_waymarker' });
    must(g, { t: 'inspect', pointId: 'arrival_wreckage' });
    const journal = buildJournal(g.state);
    expect(journal.observed.map((entry) => entry.id)).toEqual(['obs:arrival_wreckage', 'obs:templar_waymarker']);
    expect(journal.reported).toEqual([]);
    expect(g.state.quest.phase).toBe('unseen');
    expect(g.state.quest.entry).toBeNull();
    expect(g.state.facts.arrival_amnesia).toBe(true);
    expect(g.state.evidence).toEqual({});
  });

  it('lets the forest be discovered without choosing a dialogue reply or progressing the water dispute', () => {
    const g = new Game();
    must(g, { t: 'discover', place: 'shore' });
    must(g, { t: 'discover', place: 'deepwood' });
    expect(g.state.quest.phase).toBe('unseen');
    expect(nextHint(g.state)).toEqual({ key: 'hint.follow_woodland_track', place: null });
    expect(buildJournal(g.state).places.find((place) => place.id === 'deepwood')?.status).toBe('verified');
    expect(buildJournal(g.state).places.find((place) => place.id === 'rillford')?.status).toBe('unknown');
  });

  it('observing every available person neither marks them met nor executes a canned quest choice', () => {
    const g = new Game();
    const before = structuredClone(g.state);
    const events: unknown[] = [];
    g.subscribe((batch) => events.push(...batch));
    for (const id of NPC_IDS) {
      const result = g.observeNpc(id);
      expect(result.ok).toBe(true);
      if (result.ok) expect(hasString(result.key)).toBe(true);
    }
    expect(g.state).toEqual(before);
    expect(events).toEqual([]);
  });

  it('never describes an absent person as if they were present', () => {
    const g = new Game();
    must(g, { t: 'setUnavailable', npc: 'spring_steward', cause: 'away' });
    expect(g.observeNpc('spring_steward')).toEqual({ ok: false });
    expect(g.state.npcs.spring_steward.met).toBe(false);
  });

  it('persists amnesia and discovered environmental clues across a save and reload', () => {
    const g = new Game();
    must(g, { t: 'inspect', pointId: 'arrival_wreckage' });
    must(g, { t: 'inspect', pointId: 'templar_waymarker' });
    must(g, { t: 'discover', place: 'deepwood' });
    const saves = new SaveStore(new MemoryStore());
    expect(saves.save('slot-1', g.state)).toEqual({ ok: true });
    const loaded = saves.load('slot-1');
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const resumed = new Game(loaded.state);
    expect(resumed.state.facts).toMatchObject({
      arrival_amnesia: true, saw_arrival_wreckage: true, saw_templar_waymarker: true,
    });
    expect(resumed.state.quest.phase).toBe('unseen');
    expect(buildJournal(resumed.state)).toEqual(buildJournal(g.state));
    expect(nextHint(resumed.state)).toEqual({ key: 'hint.follow_woodland_track', place: null });
  });
});
