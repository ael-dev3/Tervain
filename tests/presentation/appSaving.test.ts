import { describe, expect, it } from 'vitest';
import { App } from '../../src/app';
import { Game } from '../../src/game/game';
import { WRECK_BLADE_PICKUP } from '../../src/game/types';
import { MemoryStore, SaveStore } from '../../src/platform/storage';

// Exercise the real exit/save path without constructing the browser's renderer or title UI.
type SavingApp = Pick<App, 'game' | 'saves' | 'mode' | 'quitToTitle'> & {
  player: Pick<App['player'], 'x' | 'y' | 'z' | 'yaw'>;
  enterTitle: () => void;
};

function session() {
  const memory = new MemoryStore();
  let time = 1000;
  const saves = new SaveStore(memory, () => ++time);
  const previous = new Game();
  previous.addPlaySeconds(300);
  saves.save('auto', previous.state);
  const original = memory.get('tervain:save:auto:cur');
  const game = new Game();
  game.addPlaySeconds(20);
  const app: SavingApp = Object.assign(Object.create(App.prototype), {
    game,
    saves,
    mode: 'play',
    player: { ...game.state.player },
    enterTitle: () => { app.mode = 'title'; },
  });
  return { app, memory, original };
}

describe('quiet autosaving when leaving the arrival strand', () => {
  it('persists the first blade and its taken marker when quitting before the 90-second interval', () => {
    const { app } = session();
    expect(app.game.dispatch({ t: 'pickup', pickupId: WRECK_BLADE_PICKUP, item: 'rusted_sword', qty: 1 }).ok).toBe(true);
    // Nothing else in the opening has advanced the water dispute or awarded quest progress.
    expect(app.game.state.quest.phase).toBe('unseen');
    expect(app.game.state.evidence).toEqual({});
    expect(app.game.state.grants).toEqual({});

    app.quitToTitle();

    expect(app.mode).toBe('title');
    const loaded = app.saves.load('auto');
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.playSeconds).toBe(20);
    expect(loaded.state.inventory.rusted_sword).toBe(1);
    expect(loaded.state.locationChanges[`pickup:${WRECK_BLADE_PICKUP}`]).toBe('taken');
    const resumed = new Game(loaded.state);
    expect(resumed.dispatch({ t: 'pickup', pickupId: WRECK_BLADE_PICKUP, item: 'rusted_sword', qty: 1 })).toMatchObject({ ok: false });
  });

  it('preserves the previous autosave when quitting a new run that has collected nothing', () => {
    const { app, memory, original } = session();

    app.quitToTitle();

    expect(app.mode).toBe('title');
    expect(memory.get('tervain:save:auto:cur')).toBe(original);
    const loaded = app.saves.load('auto');
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.playSeconds).toBe(300);
    expect(loaded.state.inventory.rusted_sword ?? 0).toBe(0);
  });
});
