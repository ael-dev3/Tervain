import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/game';
import {
  CARCASS_HOURS, HUNTER_RANKS, hunterRank, skinningSeconds, SKINNING_SECONDS, WILDLIFE_RETURN_DISTANCE, WILDLIFE_RETURN_HOURS,
  WOUND_HOURS, type AnimalHit, type AnimalId,
} from '../../src/game/hunting';
import { MemoryStore, SaveStore } from '../../src/platform/storage';

const position = { x: -188, y: 4, z: -66 };
const hit = (id: AnimalId, zone: AnimalHit['zone'] = 'head'): AnimalHit => ({ id, zone, position: { ...position }, yaw: 0.7 });
function hunter(): Game {
  const game = new Game();
  Object.assign(game.state.inventory, { hunting_bow: 1, arrow: 30, skinning_knife: 1 });
  game.state.equippedWeapon = 'hunting_bow';
  game.setPlayerTransform(position.x, position.y, position.z + 2, 0);
  return game;
}
const hours = (game: Game, h: number) => game.dispatch({ t: 'advanceClock', minutes: h * 60 });
const away = (game: Game) => game.setPlayerTransform(position.x + WILDLIFE_RETURN_DISTANCE + 10, position.y, position.z, 0);

describe('the range refills and the hunter rises (A70)', () => {
  it('brings a skinned deer back after its hours, but never in sight of the hunter', () => {
    const game = hunter();
    game.dispatch({ t: 'fireBow', hit: hit('deer-a') });
    expect(game.dispatch({ t: 'skinAnimal', id: 'deer-a' }).ok).toBe(true);
    hours(game, WILDLIFE_RETURN_HOURS.deer + 1);
    // Standing by the spot, nothing returns.
    expect(game.state.hunting['deer-a']?.status).toBe('skinned');
    away(game);
    const result = game.dispatch({ t: 'advanceClock', minutes: 1 });
    expect(result).toMatchObject({ ok: true, events: [{ t: 'wildlifeReturned', ids: ['deer-a'] }] });
    expect(game.state.hunting['deer-a']).toBeUndefined();
  });

  it('heals a wound, clears an unskinned carcass, and keeps big game away longer', () => {
    const game = hunter();
    game.dispatch({ t: 'fireBow', hit: hit('boar-a', 'body') });
    game.dispatch({ t: 'fireBow', hit: hit('bear-a') });
    away(game);
    hours(game, WOUND_HOURS + 0.1);
    expect(game.state.hunting['boar-a']).toBeUndefined();
    hours(game, CARCASS_HOURS);
    expect(game.state.hunting['bear-a']?.status).toBe('dead');
    hours(game, WILDLIFE_RETURN_HOURS.bear);
    expect(game.state.hunting['bear-a']).toBeUndefined();
  });

  it('raises the hunter through the ranks: better trades and quicker skinning, kept across a save', () => {
    let game = hunter();
    const prey: AnimalId[] = ['deer-a', 'deer-b', 'stag'];
    const events = prey.flatMap((id) => {
      game.dispatch({ t: 'fireBow', hit: hit(id) });
      const r = game.dispatch({ t: 'skinAnimal', id });
      return r.ok ? r.events : [];
    });
    expect(events).toContainEqual({ t: 'toast', key: 'hunting.rank.tracker' });
    expect(game.state.huntTally).toEqual({ taken: 3, species: { deer: 2, stag: 1 } });
    expect(hunterRank(game.state.huntTally)).toBe(HUNTER_RANKS[1]);
    expect(skinningSeconds(game.state.huntTally)).toBeLessThan(SKINNING_SECONDS);
    const saves = new SaveStore(new MemoryStore());
    saves.save('slot-1', game.state);
    const loaded = saves.load('slot-1');
    if (!loaded.ok) throw new Error('reload failed');
    game = new Game(loaded.state);
    expect(game.state.huntTally.taken).toBe(3);
  });

  it('reads an older save without a tally as a novice', () => {
    const saves = new SaveStore(new MemoryStore());
    const state = structuredClone(new Game().state) as unknown as Record<string, unknown>;
    delete state.huntTally;
    saves.save('slot-1', state as never);
    const loaded = saves.load('slot-1');
    expect(loaded.ok && loaded.state.huntTally).toEqual({ taken: 0, species: {} });
  });
});
