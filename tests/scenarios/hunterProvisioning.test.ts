import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/game';
import { HUNTER_MEAT_PRICE, HUNTER_SUPPLY_POSITION, hunterTradingOpen } from '../../src/game/hunting';
import { buildJournal } from '../../src/game/journal';
import { MemoryStore, SaveStore } from '../../src/platform/storage';

const camp = () => {
  const game = new Game();
  game.setPlayerTransform(HUNTER_SUPPLY_POSITION.x, 1, HUNTER_SUPPLY_POSITION.z, 0);
  game.state.clock = 12 * 60;
  return game;
};
describe('Rowan’s provisions for Rillford', () => {
  it('pays for actual carried meat, records the delivery once, and persists it without advancing the water quest', () => {
    const game = camp(), quest = structuredClone(game.state.quest);
    game.state.inventory.raw_meat = 2; game.state.inventory.coin = 6;
    expect(game.dispatch({ t: 'sellGameMeat' })).toMatchObject({ ok: true, events: [
      { t: 'item', id: 'raw_meat', delta: -1 }, { t: 'item', id: 'coin', delta: HUNTER_MEAT_PRICE },
      { t: 'toast', key: 'hunting.meat_sold' }, { t: 'autosave', reason: 'game_meat_delivered' },
    ] });
    expect(game.state.inventory).toMatchObject({ raw_meat: 1, coin: 8 });
    expect(game.state.npcs.trail_hunter.met).toBe(true);
    expect(game.state.quest).toEqual(quest);
    expect(game.dispatch({ t: 'sellGameMeat' }).ok).toBe(true);
    expect(buildJournal(game.state).observed.filter(entry => entry.id === 'obs:game_provisions')).toHaveLength(1);
    const saves = new SaveStore(new MemoryStore());
    expect(saves.save('slot-1', game.state).ok).toBe(true);
    const loaded = saves.load('slot-1');
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.state.inventory).toMatchObject({ raw_meat: 0, coin: 10 });
      expect(loaded.state.facts.hunter_game_delivered).toBe(true);
      const restored = new Game(loaded.state), before = structuredClone(restored.state);
      expect(restored.dispatch({ t: 'sellGameMeat' })).toEqual({ ok: false, reason: 'need_meat' });
      expect(restored.state).toEqual(before);
    }
  });
  it.each(['far', 'dead', 'night', 'absent', 'overflow', 'bad_meat'] as const)('rejects %s trading atomically', scenario => {
    const game = camp(); game.state.inventory.raw_meat = 1;
    let reason = 'invalid_quantity';
    if (scenario === 'far') { game.state.player.x += 20; reason = 'too_far'; }
    if (scenario === 'dead') { game.state.player.health = 0; reason = 'player_dead'; }
    if (scenario === 'night') { game.state.clock = 23 * 60; reason = 'hunter_resting'; }
    if (scenario === 'absent') { game.state.npcs.trail_hunter.available = false; reason = 'hunter_resting'; }
    if (scenario === 'overflow') game.state.inventory.coin = Number.MAX_SAFE_INTEGER;
    if (scenario === 'bad_meat') game.state.inventory.raw_meat = Infinity;
    const before = structuredClone(game.state);
    expect(game.dispatch({ t: 'sellGameMeat' })).toEqual({ ok: false, reason });
    expect(game.state).toEqual(before);
  });
  it('keeps free supplies available while trades follow the supplier’s waking hours', () => {
    const game = camp(); game.state.inventory.animal_hide = 1;
    for (const [hour, open] of [[5.99, false], [6, true], [21.99, true], [22, false], [30, true]] as const) {
      game.state.clock = hour * 60;
      expect(hunterTradingOpen(game.state)).toBe(open);
    }
    game.state.clock = 23 * 60;
    const before = structuredClone(game.state);
    expect(game.dispatch({ t: 'restockArrows' })).toEqual({ ok: false, reason: 'hunter_resting' });
    expect(game.state).toEqual(before);
    expect(game.dispatch({ t: 'pickup', pickupId: 'hunter_bow', item: 'hunting_bow', qty: 1 }).ok).toBe(true);
  });
});
