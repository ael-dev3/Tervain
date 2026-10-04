import { describe, expect, it, vi } from 'vitest';
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
    world: { physics: { snapshot: () => [] } },
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
  it('quiet-saves a new provision, binding and pin before the first periodic save', () => {
    const { app } = session();
    app.game.dispatch({ t: 'pickup', pickupId: 'strand_apple', item: 'shore_apple', qty: 1 });
    app.game.dispatch({ t: 'assignQuickSlot', slot: 2, item: 'shore_apple' });
    app.game.dispatch({ t: 'setMapMarker', marker: { x: -230, z: 21 } });
    app.quitToTitle();
    const loaded = app.saves.load('auto'); expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.playSeconds).toBe(20);
    expect(loaded.state.inventory.shore_apple).toBe(1);
    expect(loaded.state.locationChanges['pickup:strand_apple']).toBe('taken');
    expect(loaded.state.quickSlots[2]).toBe('shore_apple');
    expect(loaded.state.mapMarker).toEqual({ x: -230, z: 21 });
  });
  it('quiet-saves a deliberately cleared pin even when no other arrival progress exists', () => {
    const { app } = session();
    app.game.state.mapMarker = { x: -230, z: 21 };
    app.game.dispatch({ t: 'setMapMarker', marker: null });
    Reflect.apply(Reflect.get(App.prototype, 'onGameEvents'), app, [[{ t: 'mapMarker', marker: null }]]);
    app.quitToTitle();
    const loaded = app.saves.load('auto'); expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.playSeconds).toBe(20);
    expect(loaded.state.mapMarker).toBeNull();
  });

});

describe('autosaving across graphics replacement', () => {
  it.each(['worldBuilding', 'worldBuildFailed', 'qualityReload'] as const)(
    'keeps the last durable save while %s prevents use of the physical world',
    (pause) => {
      const { app, memory, original } = session();
      app.game.addPlaySeconds(120);
      const retiredSnapshot = vi.fn(() => { throw new Error('Retired physical world'); });
      Reflect.set(app, 'world', { physics: { snapshot: retiredSnapshot } });
      Reflect.set(app, pause, pause === 'qualityReload' ? Promise.resolve() : true);

      // Both the visibility/pagehide path and a pending gameplay autosave must
      // preserve the previous save rather than read disposed bodies.
      Reflect.apply(Reflect.get(App.prototype, 'autosaveQuiet'), app, []);
      Reflect.apply(Reflect.get(App.prototype, 'autosave'), app, ['pending event']);

      expect(retiredSnapshot).not.toHaveBeenCalled();
      expect(memory.get('tervain:save:auto:cur')).toBe(original);

      Reflect.set(app, pause, pause === 'qualityReload' ? null : false);
      Reflect.set(app, 'world', { physics: { snapshot: () => [] } });
      Reflect.apply(Reflect.get(App.prototype, 'autosaveQuiet'), app, []);
      const resumed = app.saves.load('auto');
      expect(resumed.ok).toBe(true);
      if (resumed.ok) expect(resumed.state.playSeconds).toBe(140);
    },
  );
});
