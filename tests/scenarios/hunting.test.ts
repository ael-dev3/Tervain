import { describe, expect, it } from 'vitest';
import { Game } from '../../src/game/game';
import {
  ANIMAL_IDS, ANIMAL_MODEL_IDS, HUNTABLE_ANIMAL_IDS, PROTECTED_ANIMAL_IDS, animalLoot, ARROW_QUIVER_CAPACITY, HUNTER_SUPPLY_POSITION,
  huntingHint, normalizeHunting, SKINNING_REACH, type AnimalHit, type AnimalHuntRecord, type AnimalId,
} from '../../src/game/hunting';
import { createInitialState } from '../../src/game/state';
import type { Command, ItemId } from '../../src/game/types';
import { MemoryStore, reviveState, SaveStore } from '../../src/platform/storage';
import { PICKUP_LOCATIONS } from '../../src/world/layout';

const position = { x: -188, y: 4, z: -66 };
const hit = (id: AnimalId = 'bear-a', zone: AnimalHit['zone'] = 'body'): AnimalHit => ({ id, zone, position: { ...position }, yaw: .7 });
function armed(arrows = 24): Game {
  const game = new Game();
  game.state.inventory.hunting_bow = 1;
  game.state.inventory.arrow = arrows;
  game.state.inventory.skinning_knife = 1;
  game.state.equippedWeapon = 'hunting_bow';
  game.setPlayerTransform(position.x, position.y, position.z + 2, 0);
  return game;
}
function reject(game: Game, command: Command, reason: string) {
  const before = structuredClone(game.state);
  expect(game.dispatch(command)).toEqual({ ok: false, reason });
  expect(game.state).toEqual(before);
}
function reload(game: Game): Game {
  const saves = new SaveStore(new MemoryStore());
  expect(saves.save('slot-1', game.state).ok).toBe(true);
  const loaded = saves.load('slot-1');
  if (!loaded.ok) throw new Error('Hunting save failed to reload');
  return new Game(loaded.state);
}

describe('bow hunting and durable harvests', () => {
  it.each(HUNTABLE_ANIMAL_IDS)('one head hit kills %s, including every woodland variant identity', (id) => {
    const game = armed();
    expect(game.dispatch({ t: 'fireBow', hit: hit(id, 'head') }).ok).toBe(true);
    expect(game.state.hunting[id]).toMatchObject({ status: 'dead', bodyHits: 0, headshot: true, position });
    expect(game.state.inventory.arrow).toBe(23);
  });

  it.each(HUNTABLE_ANIMAL_IDS)('two body hits kill %s and a save preserves the first wound', (id) => {
    let game = armed();
    expect(game.dispatch({ t: 'fireBow', hit: hit(id) }).ok).toBe(true);
    expect(game.state.hunting[id]).toMatchObject({ status: 'injured', bodyHits: 1, headshot: false });
    expect(game.state.inventory.animal_hide ?? 0).toBe(0);
    game = reload(game);
    expect(game.dispatch({ t: 'fireBow', hit: hit(id) }).ok).toBe(true);
    expect(game.state.hunting[id]).toMatchObject({ status: 'dead', bodyHits: 2, headshot: false });
    expect(game.state.inventory.arrow).toBe(22);
  });

  it('an arrow miss spends one arrow, and a failed release spends none', () => {
    const game = armed(1);
    expect(game.dispatch({ t: 'fireBow' })).toMatchObject({ ok: true, events: [{ t: 'item', id: 'arrow', delta: -1 }, { t: 'bowShot', hit: null }] });
    expect(game.state.inventory.arrow).toBe(0);
    reject(game, { t: 'fireBow' }, 'need_arrow');
    game.state.inventory.arrow = 2;
    game.state.equippedWeapon = null;
    reject(game, { t: 'fireBow' }, 'need_bow');
    game.state.equippedWeapon = 'hunting_bow';
    game.state.player.health = 0;
    reject(game, { t: 'fireBow' }, 'player_dead');
  });

  it('keeps five pets and the saddled companion peaceful through impacts, skinning and old save records', () => {
    for (const id of ANIMAL_IDS.filter(id => !HUNTABLE_ANIMAL_IDS.includes(id))) {
      const game = armed();
      reject(game, { t: 'fireBow', hit: hit(id, 'head') }, 'invalid_animal_hit');
      reject(game, { t: 'hitAnimal', hit: hit(id) }, 'invalid_animal_hit');
      reject(game, { t: 'skinAnimal', id }, 'peaceful_animal');
      expect(normalizeHunting({ [id]: { status: 'dead', bodyHits: 0, headshot: true, position, yaw: 0, atClock: 500 } })).toEqual({});
      expect(animalLoot(id)).toEqual({ animal_hide: 0, raw_meat: 0 });
    }
    expect(PROTECTED_ANIMAL_IDS).toHaveLength(6);
    expect(PROTECTED_ANIMAL_IDS).toContain('deer-mount');
    expect(HUNTABLE_ANIMAL_IDS).toHaveLength(13);
    expect(HUNTABLE_ANIMAL_IDS.filter(id => id === 'stag' || id.startsWith('deer'))).toEqual(['stag', 'deer-a', 'deer-b']);
    expect(new Set(Object.values(ANIMAL_MODEL_IDS)).size).toBe(19);
    expect(ANIMAL_MODEL_IDS['boar-c']).toBe('1005174818');
  });

  it('a launched arrow impacts after switching weapons without charging ammo twice', () => {
    const game = armed();
    expect(game.dispatch({ t: 'fireBow' }).ok).toBe(true);
    expect(game.dispatch({ t: 'equipWeapon', item: null }).ok).toBe(true);
    expect(game.dispatch({ t: 'hitAnimal', hit: hit('wolf-a', 'head') }).ok).toBe(true);
    expect(game.state.inventory.arrow).toBe(23);
    expect(game.state.hunting['wolf-a']?.status).toBe('dead');
    expect(game.dispatch({ t: 'hitAnimal', hit: { ...hit('wolf-a', 'head'), position: { x: -130, y: 5, z: -20 } } })).toEqual({ ok: true, events: [] });
    expect(game.state.hunting['wolf-a']?.position).toEqual(position);
  });

  it('rejects unknown IDs, bogus zones and non-finite or out-of-world hit poses', () => {
    const game = armed();
    for (const invalid of [
      { ...hit(), id: 'replacement_boar' }, { ...hit(), id: '__proto__' }, { ...hit(), zone: 'tail' },
      { ...hit(), yaw: Infinity }, { ...hit(), position: { ...position, x: NaN } },
      { ...hit(), position: { ...position, y: 1000 } }, { ...hit(), position: { ...position, z: 1000 } },
    ]) {
      reject(game, { t: 'fireBow', hit: invalid as AnimalHit }, 'invalid_animal_hit');
      reject(game, { t: 'hitAnimal', hit: invalid as AnimalHit }, 'invalid_animal_hit');
    }
  });

  it('a wounded animal can still die from its next head hit', () => {
    const game = armed();
    game.dispatch({ t: 'fireBow', hit: hit() });
    game.dispatch({ t: 'fireBow', hit: hit('bear-a', 'head') });
    expect(game.state.hunting['bear-a']).toMatchObject({ status: 'dead', bodyHits: 1, headshot: true });
  });

  it('a corpse stays fixed through reload, and skin completion gives species loot once', () => {
    let game = armed();
    game.dispatch({ t: 'fireBow', hit: hit('boar-b', 'head') });
    const corpse = structuredClone(game.state.hunting['boar-b']);
    game = reload(game);
    expect(game.state.hunting['boar-b']).toEqual(corpse);
    // A cancelled presentation action has no durable command or partial reward.
    expect(game.state.inventory.raw_meat ?? 0).toBe(0);
    expect(game.state.inventory.animal_hide ?? 0).toBe(0);
    expect(game.dispatch({ t: 'skinAnimal', id: 'boar-b' })).toMatchObject({ ok: true });
    expect(game.state.inventory).toMatchObject(animalLoot('boar-b'));
    expect(game.state.hunting['boar-b']?.status).toBe('skinned');
    game = reload(game);
    reject(game, { t: 'skinAnimal', id: 'boar-b' }, 'already_skinned');
    const harvested = structuredClone(game.state.hunting['boar-b']);
    game.dispatch({ t: 'fireBow', hit: hit('boar-b', 'head') });
    expect(game.state.hunting['boar-b']).toEqual(harvested);
    expect(game.state.inventory).toMatchObject(animalLoot('boar-b'));
  });

  it('rechecks living status, knife, range and player health on completed skinning', () => {
    const game = armed();
    reject(game, { t: 'skinAnimal', id: 'bear-a' }, 'animal_alive');
    game.dispatch({ t: 'fireBow', hit: hit() });
    reject(game, { t: 'skinAnimal', id: 'bear-a' }, 'animal_alive');
    game.dispatch({ t: 'fireBow', hit: hit() });
    game.state.inventory.skinning_knife = 0;
    reject(game, { t: 'skinAnimal', id: 'bear-a' }, 'need_knife');
    game.state.inventory.skinning_knife = 1;
    game.state.player.z = position.z + SKINNING_REACH + .01;
    reject(game, { t: 'skinAnimal', id: 'bear-a' }, 'too_far');
    game.state.player.z = position.z;
    game.state.player.y = position.y + 2.01;
    reject(game, { t: 'skinAnimal', id: 'bear-a' }, 'too_far');
    game.state.player.y = position.y;
    game.state.player.health = 0;
    reject(game, { t: 'skinAnimal', id: 'bear-a' }, 'player_dead');
  });

  it('a stack overflow cannot mark a corpse harvested or grant a partial reward', () => {
    const game = armed();
    game.dispatch({ t: 'fireBow', hit: hit('deer-a', 'head') });
    game.state.inventory.raw_meat = Number.MAX_SAFE_INTEGER;
    reject(game, { t: 'skinAnimal', id: 'deer-a' }, 'invalid_quantity');
    expect(game.state.hunting['deer-a']?.status).toBe('dead');
    expect(game.state.inventory.animal_hide ?? 0).toBe(0);
  });

  it('keeps the unarmed arrival, supplies real gear once, and bounds the hide-to-arrow loop', () => {
    const game = new Game();
    expect(game.state.equippedWeapon).toBeNull();
    expect(game.state.inventory.hunting_bow).toBeUndefined();
    expect(game.state.inventory.arrow).toBeUndefined();
    const supplies = PICKUP_LOCATIONS.filter((point) => ['hunter_bow', 'hunter_knife', 'hunter_arrows'].includes(point.id));
    expect(supplies).toHaveLength(3);
    for (const point of supplies) {
      const cmd: Command = { t: 'pickup', pickupId: point.id, item: point.item, qty: point.qty };
      expect(game.dispatch(cmd).ok).toBe(true);
      reject(game, cmd, 'already_taken');
    }
    expect(game.state.inventory).toMatchObject({ hunting_bow: 1, skinning_knife: 1, arrow: 24 });
    expect(game.state.equippedWeapon).toBeNull();
    game.state.inventory.animal_hide = 2;
    reject(game, { t: 'restockArrows' }, 'too_far');
    game.setPlayerTransform(HUNTER_SUPPLY_POSITION.x, 0, HUNTER_SUPPLY_POSITION.z, 0);
    expect(game.dispatch({ t: 'restockArrows' }).ok).toBe(true);
    expect(game.state.inventory).toMatchObject({ arrow: 30, animal_hide: 1 });
    game.state.inventory.arrow = ARROW_QUIVER_CAPACITY;
    reject(game, { t: 'restockArrows' }, 'arrow_quiver_full');
    game.state.inventory.arrow = 0;
    game.state.inventory.animal_hide = 0;
    reject(game, { t: 'restockArrows' }, 'need_hide');
  });

  it('bow ownership and quick-slot assignment use the existing equipment and inventory rules', () => {
    const game = armed();
    expect(game.dispatch({ t: 'assignQuickSlot', slot: 0, item: 'hunting_bow' }).ok).toBe(true);
    for (const item of ['arrow', 'skinning_knife', 'raw_meat', 'animal_hide'] as ItemId[]) {
      reject(game, { t: 'assignQuickSlot', slot: 1, item }, 'not_usable');
    }
    const loaded = reload(game);
    expect(loaded.state.equippedWeapon).toBe('hunting_bow');
    expect(loaded.state.quickSlots[0]).toBe('hunting_bow');
  });
});

describe('format-1 hunting save migration and sanitization', () => {
  it.each(['injured', 'dead', 'skinned'] as const)('revives an erroneously %s saddled mount while preserving wild hunting and the rest of the save', status => {
    const game = armed();
    game.state.hunting['deer-a'] = { status: 'injured', bodyHits: 1, headshot: false, position, yaw: 0, atClock: 501 };
    game.state.hunting['deer-mount'] = {
      status, bodyHits: status === 'injured' ? 1 : 2, headshot: false,
      position: { x: -212, y: 2, z: 18 }, yaw: 1, atClock: 500,
    };
    const before = structuredClone(game.state), restored = reload(game);
    expect(restored.state.hunting).toEqual({ 'deer-a': before.hunting['deer-a'] });
    // Restoring a companion never removes unrelated earned items or gifts replacement supplies.
    expect(restored.state.inventory).toEqual(before.inventory);
    expect(restored.state.player).toEqual(before.player);
    expect(restored.state.quest).toEqual(before.quest);
    expect(restored.state.locationChanges).toEqual(before.locationChanges);
    reject(restored, { t: 'hitAnimal', hit: hit('deer-mount', 'head') }, 'invalid_animal_hit');
    reject(restored, { t: 'skinAnimal', id: 'deer-mount' }, 'peaceful_animal');
  });

  it('adds empty hunting records to old saves without gifting hunting equipment or changing quests', () => {
    const raw = structuredClone(createInitialState()) as unknown as Record<string, unknown>;
    delete raw.hunting;
    const revived = reviveState(raw)!;
    expect(revived.hunting).toEqual({});
    expect(revived.inventory).toEqual({ coin: 6 });
    expect(revived.equippedWeapon).toBeNull();
    expect(revived.quest).toEqual(raw.quest);
  });

  it('accepts at most known identities and strips engine or injected fields', () => {
    const valid: AnimalHuntRecord = { status: 'dead', bodyHits: 0, headshot: true, position, yaw: .7, atClock: 500 };
    const input = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`unknown-${i}`, valid]));
    input['bear-a'] = { ...valid, engineHandle: 123, position: { ...position, engineHandle: 456 } } as AnimalHuntRecord;
    input['boar-c'] = { ...valid, status: 'skinned' };
    const normalized = normalizeHunting(input);
    expect(Object.keys(normalized)).toEqual(['bear-a', 'boar-c']);
    expect(normalized['bear-a']).not.toHaveProperty('engineHandle');
    expect(normalized['bear-a']?.position).toEqual(position);
    expect(normalized['boar-c']?.status).toBe('skinned');
    expect(normalizeHunting(Object.create({ 'bear-a': valid }))).toEqual({});
  });

  it('discards malformed records, unsafe numbers and inconsistent lifecycles', () => {
    const valid = { status: 'dead', bodyHits: 0, headshot: true, position, yaw: .7, atClock: 500 };
    for (const value of [
      null, [], { ...valid, bodyHits: -1 }, { ...valid, bodyHits: 1.5 }, { ...valid, bodyHits: 3 },
      { ...valid, headshot: 'yes' }, { ...valid, headshot: false }, { ...valid, yaw: NaN },
      { ...valid, atClock: Infinity }, { ...valid, atClock: -1 }, { ...valid, status: 'alive' },
      { ...valid, position: { ...position, x: 5000 } }, { ...valid, position: { ...position, y: NaN } },
      { ...valid, position: Object.create(position) },
      { ...valid, status: 'injured', bodyHits: 2, headshot: false },
    ]) expect(normalizeHunting({ 'bear-a': value })).toEqual({});
    expect(normalizeHunting({ 'wolf-a': { ...valid, status: 'injured', bodyHits: 1, headshot: false } })['wolf-a']?.status).toBe('injured');
  });
});

describe('early woodland hunting objectives', () => {
  it('never treats a stale saddle-companion record as hunting progress or a corpse objective', () => {
    const game = new Game();
    game.state.hunting['deer-mount'] = { status: 'dead', bodyHits: 0, headshot: true, position, yaw: 0, atClock: 500 };
    expect(huntingHint(game.state)).toBeNull();
    game.state.discovered.deepwood = true;
    game.state.inventory.hunting_bow = 1; game.state.inventory.skinning_knife = 1; game.state.inventory.arrow = 24;
    game.state.equippedWeapon = 'hunting_bow';
    expect(huntingHint(game.state)).toBe('hunting.objective.hunt');
  });

  it('keeps the untouched beach objective until woodland discovery and yields to investigation', () => {
    const game = new Game();
    expect(huntingHint(game.state)).toBeNull();
    game.dispatch({ t: 'discover', place: 'deepwood' });
    expect(huntingHint(game.state)).toBe('hunting.objective.kit');
    game.dispatch({ t: 'discover', place: 'rillford' });
    expect(huntingHint(game.state)).toBeNull();
  });

  it('switches to hunting when real kit is taken and equipped before woodland discovery', () => {
    const game = new Game();
    expect(game.state.discovered.deepwood).toBeUndefined();
    expect(game.state.inventory).toEqual({ coin: 6 });
    expect(huntingHint(game.state)).toBeNull();
    for (const id of ['hunter_bow', 'hunter_knife', 'hunter_arrows']) {
      const point = PICKUP_LOCATIONS.find((value) => value.id === id)!;
      expect(game.dispatch({ t: 'pickup', pickupId: point.id, item: point.item, qty: point.qty }).ok).toBe(true);
      expect(huntingHint(game.state)).toBe(id === 'hunter_arrows' ? 'hunting.objective.equip' : 'hunting.objective.kit');
    }
    expect(game.state.discovered.deepwood).toBeUndefined();
    expect(game.dispatch({ t: 'equipWeapon', item: 'hunting_bow' }).ok).toBe(true);
    expect(huntingHint(game.state)).toBe('hunting.objective.hunt');
    game.dispatch({ t: 'discover', place: 'rillford' });
    expect(huntingHint(game.state)).toBeNull();
  });

  it('keeps existing hunting progress visible before woodland rediscovery', () => {
    const game = armed();
    game.dispatch({ t: 'fireBow', hit: hit('bear-a', 'head') });
    const resumed = reload(game);
    expect(resumed.state.discovered.deepwood).toBeUndefined();
    expect(huntingHint(resumed.state)).toBe('hunting.objective.skin');
    resumed.state.inventory.hunting_bow = 0;
    resumed.state.inventory.skinning_knife = 0;
    resumed.state.inventory.arrow = 0;
    expect(huntingHint(resumed.state)).toBe('hunting.objective.kit');
  });

  it('follows obtaining real supplies, equipping, hunting and completed harvesting', () => {
    const game = new Game();
    game.dispatch({ t: 'discover', place: 'deepwood' });
    for (const point of PICKUP_LOCATIONS.filter((value) => ['hunter_bow', 'hunter_knife', 'hunter_arrows'].includes(value.id))) {
      expect(game.dispatch({ t: 'pickup', pickupId: point.id, item: point.item, qty: point.qty }).ok).toBe(true);
    }
    expect(huntingHint(game.state)).toBe('hunting.objective.equip');
    game.dispatch({ t: 'equipWeapon', item: 'hunting_bow' });
    expect(huntingHint(game.state)).toBe('hunting.objective.hunt');
    game.dispatch({ t: 'fireBow', hit: hit('deer-b', 'body') });
    expect(huntingHint(game.state)).toBe('hunting.objective.hunt');
    game.dispatch({ t: 'fireBow', hit: hit('deer-b', 'head') });
    expect(huntingHint(game.state)).toBe('hunting.objective.skin');
    game.setPlayerTransform(position.x, position.y, position.z, 0);
    game.dispatch({ t: 'skinAnimal', id: 'deer-b' });
    expect(huntingHint(game.state)).toBe('hunting.objective.hunt');
  });

  it('prioritizes harvesting the last-arrow corpse and sends depleted ammunition to supplies', () => {
    const game = armed(1);
    game.state.discovered.deepwood = true;
    game.state.locationChanges['pickup:hunter_arrows'] = 'taken';
    game.dispatch({ t: 'fireBow', hit: hit('bear-a', 'head') });
    expect(huntingHint(game.state)).toBe('hunting.objective.skin');
    game.dispatch({ t: 'skinAnimal', id: 'bear-a' });
    expect(huntingHint(game.state)).toBe('hunting.objective.restock');
    delete game.state.locationChanges['pickup:hunter_arrows'];
    expect(huntingHint(game.state)).toBe('hunting.objective.kit');
  });

  it('stops suggesting new hunts after wild game is harvested while pets and the saddled companion remain alive', () => {
    const game = armed(0);
    game.state.discovered.deepwood = true;
    for (const id of HUNTABLE_ANIMAL_IDS) game.state.hunting[id] = { status: 'skinned', bodyHits: 0, headshot: true, position: { ...position }, yaw: 0, atClock: 500 };
    expect(huntingHint(game.state)).toBeNull();
    expect(game.state.hunting['deer-mount']).toBeUndefined();
  });
});
