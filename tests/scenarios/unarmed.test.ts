import { describe, expect, it } from 'vitest';
import { nextHint } from '../../src/game/hints';
import { ARMED_START_REVISIONS, CONTENT_REVISION } from '../../src/game/types';
import { MemoryStore, SaveStore, checksum } from '../../src/platform/storage';
import { must, newGame } from './helpers';

const takeBlade = { t: 'pickup', pickupId: 'wreck_blade', item: 'rusted_sword', qty: 1 } as const;

describe('the wanderer arrives unarmed', () => {
  it('starts with nothing to fight with, and the first guidance points at the wreck on the strand', () => {
    const g = newGame();
    expect(g.state.inventory.rusted_sword ?? 0).toBe(0);
    expect(nextHint(g.state)).toEqual({ key: 'hint.search_wreck', place: null });
  });

  it('takes the blade from the wreck once; the guidance moves on to the woodland track', () => {
    const g = newGame();
    must(g, takeBlade);
    expect(g.state.inventory.rusted_sword).toBe(1);
    expect(nextHint(g.state).key).toBe('hint.find_woodland_track');
    expect(g.dispatch(takeBlade)).toMatchObject({ ok: false });
    expect(g.state.inventory.rusted_sword).toBe(1);
  });

  it('does not keep sending someone who has already walked on back for it', () => {
    const g = newGame();
    g.state.discovered.deepwood = true;
    expect(nextHint(g.state).key).toBe('hint.follow_woodland_track');
    g.state.discovered.rillford = true;
    expect(nextHint(g.state).key).toBe('hint.look_around');
  });
});

describe('saves from before the unarmed start', () => {
  const store = () => {
    const mem = new MemoryStore();
    let t = 1000;
    return { mem, saves: new SaveStore(mem, () => ++t) };
  };
  /** Write a save as an older build would have: its content revision and no blade in the inventory. */
  const writeAs = (mem: MemoryStore, saves: SaveStore, revision: string) => {
    saves.save('slot-1', newGame().state);
    const key = 'tervain:save:slot-1:cur';
    const env = JSON.parse(mem.get(key)!);
    env.state.contentRevision = revision;
    env.contentRevision = revision;
    delete env.state.inventory.rusted_sword;
    env.checksum = checksum(JSON.stringify(env.state));
    mem.set(key, JSON.stringify(env));
  };

  it.each(['bellwether-proto-0.0.4', 'deepwood-proto-0.0.5'])('keeps a %s player armed: the blade is theirs and the wreck is already searched', (revision) => {
    expect(ARMED_START_REVISIONS).toContain(revision);
    const { mem, saves } = store();
    writeAs(mem, saves, revision);
    const r = saves.load('slot-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.inventory.rusted_sword).toBe(1);
    expect(r.state.locationChanges['pickup:wreck_blade']).toBe('taken');
    expect(nextHint(r.state).key).toBe('hint.find_woodland_track');
  });

  it('leaves a current save exactly as it was', () => {
    expect(ARMED_START_REVISIONS).not.toContain(CONTENT_REVISION);
    const { mem, saves } = store();
    writeAs(mem, saves, CONTENT_REVISION);
    const r = saves.load('slot-1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.inventory.rusted_sword ?? 0).toBe(0);
    expect(r.state.locationChanges['pickup:wreck_blade']).toBeUndefined();
  });
});
