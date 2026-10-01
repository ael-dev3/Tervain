import { describe, expect, it } from 'vitest';
import { hotbarEligible, itemAction, ITEMS } from '../../src/content/items';
import { hasString } from '../../src/content/strings';
import { applyEffect } from '../../src/game/commands';
import { Game } from '../../src/game/game';
import { MAP_MARKER_BOUNDS } from '../../src/game/map';
import { createInitialState } from '../../src/game/state';
import { QUICK_SLOT_COUNT, SAVE_FORMAT_VERSION, type Command, type Effect, type GameEvent, type ItemId, type SkillId } from '../../src/game/types';
import { MemoryStore, reviveState, SaveStore, checksum } from '../../src/platform/storage';

function take(game: Game, item: ItemId, qty = 1, pickupId: string = `test_${item}`) {
  expect(game.dispatch({ t: 'pickup', pickupId, item, qty }).ok).toBe(true);
}

function rejectsWithoutChanging(game: Game, cmd: Command, reason: string) {
  const before = structuredClone(game.state);
  expect(game.dispatch(cmd)).toEqual({ ok: false, reason });
  expect(game.state).toEqual(before);
}

describe('carried items and player-created hotbar bindings', () => {
  it('starts unarmed with ten empty slots, no dummy skills and no marker', () => {
    const game = new Game();
    expect(QUICK_SLOT_COUNT).toBe(10);
    expect(game.state.quickSlots).toEqual(Array(10).fill(null));
    expect(game.state.equippedWeapon).toBeNull();
    expect(game.state.mapMarker).toBeNull();
    expect(game.state.skills).toEqual([]);
    take(game, 'rusted_sword');
    expect(game.state.quickSlots).toEqual(Array(10).fill(null));
    expect(game.state.equippedWeapon).toBeNull();
  });

  it('takes each persistent pickup only once, even after saving and reloading', () => {
    const game = new Game();
    take(game, 'shore_apple', 2, 'coastal_apple_01');
    const saves = new SaveStore(new MemoryStore());
    expect(saves.save('slot-1', game.state).ok).toBe(true);
    const loaded = saves.load('slot-1');
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const resumed = new Game(loaded.state);
    rejectsWithoutChanging(resumed, { t: 'pickup', pickupId: 'coastal_apple_01', item: 'shore_apple', qty: 2 }, 'already_taken');
    expect(resumed.state.inventory.shore_apple).toBe(2);
  });

  it.each([-1, 0, 0.25, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects pickup quantity %s without marking it taken', (qty) => {
    rejectsWithoutChanging(new Game(), { t: 'pickup', pickupId: 'bad_apple', item: 'shore_apple', qty }, 'invalid_quantity');
  });

  it('rejects unknown items, unsafe identifiers and overflowing stack additions', () => {
    const game = new Game();
    rejectsWithoutChanging(game, { t: 'pickup', pickupId: 'unknown', item: 'fake_spell' as ItemId, qty: 1 }, 'unknown_item');
    rejectsWithoutChanging(game, { t: 'pickup', pickupId: '__proto__', item: 'bread', qty: 1 }, 'unknown_pickup');
    game.state.inventory.bread = Number.MAX_SAFE_INTEGER;
    rejectsWithoutChanging(game, { t: 'pickup', pickupId: 'extra_bread', item: 'bread', qty: 1 }, 'invalid_quantity');
  });

  it.each(['shore_apple', 'bread', 'healing_herb', 'field_mushroom', 'poultice'] as const)('%s heals its authored amount and consumes exactly one stack unit', (item) => {
    const game = new Game();
    take(game, item, 2);
    game.state.player.health = 10;
    expect(game.dispatch({ t: 'useItem', item })).toMatchObject({ ok: true, events: [{ t: 'item', id: item, delta: -1 }] });
    expect(game.state.player.health).toBe(10 + ITEMS[item].healAmount!);
    expect(game.state.inventory[item]).toBe(1);
    game.state.player.health = 99;
    expect(game.dispatch({ t: 'useItem', item }).ok).toBe(true);
    expect(game.state.player.health).toBe(100);
    expect(game.state.inventory[item]).toBe(0);
    rejectsWithoutChanging(game, { t: 'useItem', item }, 'missing_item');
  });

  it('refuses healing at full health without consuming food or a poultice', () => {
    const game = new Game();
    take(game, 'poultice');
    rejectsWithoutChanging(game, { t: 'useItem', item: 'poultice' }, 'already_healthy');
  });

  it.each(['coin', 'gate_wrench', 'archive_key', 'league_sash', 'iron_scrap', 'rusted_sword'] as const)('%s has no fake consume action', (item) => {
    const game = new Game();
    take(game, item);
    game.state.player.health = 10;
    rejectsWithoutChanging(game, { t: 'useItem', item }, 'not_usable');
    expect(itemAction(item)).toBe(item === 'rusted_sword' ? 'equip' : null);
    expect(hotbarEligible(item)).toBe(item === 'rusted_sword');
  });

  it('assigns, moves, replaces, swaps and clears bindings without moving carried quantities', () => {
    const game = new Game();
    take(game, 'bread', 3);
    take(game, 'rusted_sword');
    const inventory = structuredClone(game.state.inventory);
    expect(game.dispatch({ t: 'assignQuickSlot', slot: 0, item: 'bread' }).ok).toBe(true);
    expect(game.dispatch({ t: 'assignQuickSlot', slot: 9, item: 'bread' }).ok).toBe(true);
    expect(game.state.quickSlots[0]).toBeNull();
    expect(game.state.quickSlots[9]).toBe('bread');
    expect(game.dispatch({ t: 'assignQuickSlot', slot: 0, item: 'rusted_sword' }).ok).toBe(true);
    expect(game.dispatch({ t: 'swapQuickSlots', from: 0, to: 9 }).ok).toBe(true);
    expect(game.state.quickSlots[0]).toBe('bread');
    expect(game.state.quickSlots[9]).toBe('rusted_sword');
    expect(game.dispatch({ t: 'swapQuickSlots', from: 0, to: 0 })).toEqual({ ok: true, events: [] });
    expect(game.dispatch({ t: 'assignQuickSlot', slot: 0, item: 'rusted_sword' }).ok).toBe(true);
    expect(game.state.quickSlots[9]).toBeNull();
    expect(game.dispatch({ t: 'assignQuickSlot', slot: 0, item: null }).ok).toBe(true);
    expect(game.state.quickSlots).toEqual(Array(10).fill(null));
    expect(game.state.inventory).toEqual(inventory);
  });

  it.each([-1, 10, 1.5, NaN, Infinity])('rejects invalid slot %s for assignment and either end of a swap', (slot) => {
    const game = new Game();
    take(game, 'bread');
    rejectsWithoutChanging(game, { t: 'assignQuickSlot', slot, item: 'bread' }, 'invalid_slot');
    rejectsWithoutChanging(game, { t: 'swapQuickSlots', from: slot, to: 0 }, 'invalid_slot');
    rejectsWithoutChanging(game, { t: 'swapQuickSlots', from: 0, to: slot }, 'invalid_slot');
  });

  it('requires ownership and a real action when assigning or equipping', () => {
    const game = new Game();
    rejectsWithoutChanging(game, { t: 'assignQuickSlot', slot: 0, item: 'bread' }, 'missing_item');
    rejectsWithoutChanging(game, { t: 'equipWeapon', item: 'rusted_sword' }, 'missing_item');
    rejectsWithoutChanging(game, { t: 'assignQuickSlot', slot: 0, item: 'iron_scrap' }, 'not_usable');
    rejectsWithoutChanging(game, { t: 'equipWeapon', item: 'bread' }, 'not_weapon');
    rejectsWithoutChanging(game, { t: 'assignQuickSlot', slot: 0, item: 'steady_guard' as ItemId }, 'unknown_item');
    rejectsWithoutChanging(game, { t: 'equipWeapon', item: 'fake_spell' as ItemId }, 'unknown_item');
    take(game, 'rusted_sword');
    expect(game.dispatch({ t: 'equipWeapon', item: 'rusted_sword' })).toMatchObject({ ok: true, events: [{ t: 'equipment', item: 'rusted_sword' }] });
    expect(game.state.equippedWeapon).toBe('rusted_sword');
    expect(game.dispatch({ t: 'equipWeapon', item: null }).ok).toBe(true);
    expect(game.state.equippedWeapon).toBeNull();
    expect(game.state.inventory.rusted_sword).toBe(1);
  });

  it('rejects nonexistent training and non-finite healing/damage instead of inventing skills or corrupting health', () => {
    const game = new Game();
    rejectsWithoutChanging(game, { t: 'train', skill: 'fake_spell' as SkillId }, 'unknown_skill');
    rejectsWithoutChanging(game, { t: 'healPlayer', amount: NaN }, 'invalid_amount');
    rejectsWithoutChanging(game, { t: 'damagePlayer', amount: Infinity }, 'invalid_amount');
  });

  it('retains a depleted binding across reload and makes it usable when a new stack is acquired', () => {
    const game = new Game();
    take(game, 'bread');
    game.dispatch({ t: 'assignQuickSlot', slot: 2, item: 'bread' });
    game.state.player.health = 10;
    game.dispatch({ t: 'useItem', item: 'bread' });
    const saves = new SaveStore(new MemoryStore());
    saves.save('slot-1', game.state);
    const loaded = saves.load('slot-1');
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const resumed = new Game(loaded.state);
    expect(resumed.state.quickSlots[2]).toBe('bread');
    rejectsWithoutChanging(resumed, { t: 'useItem', item: 'bread' }, 'missing_item');
    take(resumed, 'bread', 1, 'second_bread');
    expect(resumed.dispatch({ t: 'useItem', item: 'bread' }).ok).toBe(true);
  });

  it('validates an entire authored grant before applying any of it and unequips a removed weapon', () => {
    const game = new Game();
    const before = structuredClone(game.state);
    const events: GameEvent[] = [];
    expect(applyEffect(game.state, { t: 'grant', id: 'bad_reward', items: { bread: 2, iron_scrap: -1 } }, events)).toBe('invalid_item');
    expect(game.state).toEqual(before);
    expect(events).toEqual([]);
    expect(applyEffect(game.state, { t: 'grant', id: 'unknown_reward', items: { fake_spell: 1 } } as Effect, events)).toBe('invalid_item');
    take(game, 'rusted_sword');
    game.dispatch({ t: 'equipWeapon', item: 'rusted_sword' });
    expect(applyEffect(game.state, { t: 'item', id: 'rusted_sword', delta: -1 }, events)).toBeNull();
    expect(game.state.equippedWeapon).toBeNull();
  });

  it('has resolvable original item descriptions and positive restoration on each offered consumable', () => {
    for (const def of Object.values(ITEMS)) {
      expect(hasString(def.nameKey)).toBe(true);
      expect(hasString(def.descKey)).toBe(true);
      if (def.kind === 'consumable') expect(def.healAmount).toBeGreaterThan(0);
    }
  });
});

describe('format-1 inventory, equipment, bindings and map continuity', () => {
  it('round-trips equipment, bindings, marker and taken pickup state without a format bump', () => {
    const game = new Game();
    take(game, 'rusted_sword');
    take(game, 'healing_herb', 2);
    game.dispatch({ t: 'equipWeapon', item: 'rusted_sword' });
    game.dispatch({ t: 'assignQuickSlot', slot: 0, item: 'rusted_sword' });
    game.dispatch({ t: 'assignQuickSlot', slot: 3, item: 'healing_herb' });
    game.dispatch({ t: 'setMapMarker', marker: { x: -130, z: 12 } });
    const saves = new SaveStore(new MemoryStore());
    saves.save('slot-1', game.state);
    const loaded = saves.load('slot-1');
    expect(SAVE_FORMAT_VERSION).toBe(1);
    expect(loaded.ok && loaded.state).toEqual(game.state);
  });

  it('migrates a real old envelope without equipment/hotbar/map fields and preserves acquired blade behavior', () => {
    const game = new Game();
    take(game, 'rusted_sword');
    const memory = new MemoryStore();
    const saves = new SaveStore(memory);
    saves.save('slot-1', game.state);
    const key = 'tervain:save:slot-1:cur';
    const envelope = JSON.parse(memory.get(key)!);
    delete envelope.state.quickSlots;
    delete envelope.state.equippedWeapon;
    delete envelope.state.mapMarker;
    envelope.checksum = checksum(JSON.stringify(envelope.state));
    memory.set(key, JSON.stringify(envelope));
    const loaded = saves.load('slot-1');
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.equippedWeapon).toBe('rusted_sword');
    expect(loaded.state.quickSlots).toEqual(Array(10).fill(null));
    expect(loaded.state.mapMarker).toBeNull();
  });

  it('preserves explicit unequip, rejects nonweapons/unowned equipment and starts an old unarmed save empty', () => {
    const raw = createInitialState();
    raw.inventory.rusted_sword = 1;
    expect(reviveState(raw)?.equippedWeapon).toBeNull();
    raw.equippedWeapon = 'bread';
    expect(reviveState(raw)?.equippedWeapon).toBeNull();
    raw.equippedWeapon = 'rusted_sword';
    raw.inventory.rusted_sword = 0;
    expect(reviveState(raw)?.equippedWeapon).toBeNull();
    const old = structuredClone(raw) as unknown as Record<string, unknown>;
    delete old.equippedWeapon;
    expect(reviveState(old)?.equippedWeapon).toBeNull();
  });

  it('normalizes unknown IDs, negative/fractional quantities, malformed slots and nonexistent skills safely', () => {
    const raw = {
      ...createInitialState(),
      inventory: { coin: 4, rusted_sword: -1, bread: 0, poultice: 1.5, shore_apple: 2, iron_scrap: Infinity, fake_spell: 8, field_mushroom: Number.MAX_SAFE_INTEGER + 1 },
      quickSlots: ['shore_apple', 'fake_spell', 'shore_apple', 'gate_wrench', 'steady_guard', 'bread', null, 1, 'iron_scrap', 'poultice', 'rusted_sword'],
      equippedWeapon: 'rusted_sword',
      skills: ['steady_guard', 'fake_spell', 'steady_guard'],
      mapMarker: { x: Infinity, z: 0 },
    };
    const restored = reviveState(raw)!;
    expect(restored.inventory).toEqual({ coin: 4, bread: 0, shore_apple: 2 });
    expect(restored.quickSlots).toEqual(['shore_apple', null, null, null, null, 'bread', null, null, null, 'poultice']);
    expect(restored.equippedWeapon).toBeNull();
    expect(restored.skills).toEqual(['steady_guard']);
    expect(restored.mapMarker).toBeNull();
    expect(reviveState({ ...raw, quickSlots: { 0: 'bread' } })?.quickSlots).toEqual(Array(10).fill(null));
    expect(reviveState({ ...raw, player: { ...raw.player, maxHealth: NaN } })?.player.maxHealth).toBe(100);
  });
});

describe('player notes on the world chart', () => {
  it('accepts the chart corners, copies the marker and clears it independently of travel', () => {
    const game = new Game();
    const marker: { x: number; z: number } = { x: MAP_MARKER_BOUNDS.minX, z: MAP_MARKER_BOUNDS.maxZ };
    expect(game.dispatch({ t: 'setMapMarker', marker }).ok).toBe(true);
    marker.x = 0;
    expect(game.state.mapMarker).toEqual({ x: -352, z: 168 });
    expect(game.dispatch({ t: 'setMapMarker', marker: { x: 168, z: -144 } }).ok).toBe(true);
    expect(game.dispatch({ t: 'setMapMarker', marker: null }).ok).toBe(true);
    expect(game.state.mapMarker).toBeNull();
    expect(game.state.discovered).toEqual({});
  });

  it.each([{ x: -353, z: 0 }, { x: 169, z: 0 }, { x: 0, z: -145 }, { x: 0, z: 169 }, { x: NaN, z: 0 }, { x: 0, z: Infinity }])('rejects invalid marker %s without changing notes', (marker) => {
    const game = new Game();
    game.dispatch({ t: 'setMapMarker', marker: { x: 0, z: 0 } });
    rejectsWithoutChanging(game, { t: 'setMapMarker', marker }, 'invalid_marker');
  });
});
