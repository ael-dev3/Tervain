import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app';
import { Game } from '../../src/game/game';
import type { ItemId } from '../../src/game/types';

/** Exercise the actual App routes and real command state, without constructing a browser or renderer. */
function fixture() {
  const game = new Game();
  game.state.inventory = { coin: 6, rusted_sword: 1, bread: 2, poultice: 1 };
  game.state.player.health = 40;
  const app = Object.assign(Object.create(App.prototype) as object, {
    game, mode: 'play', worldBuilding: false, worldBuildFailed: false, qualityReload: null,
    hunting: { controls: vi.fn() },
    panels: { isOpen: false }, player: { alive: true, syncEquipment: vi.fn(), readyWeapon: vi.fn() },
    hud: { toast: vi.fn() }, audio: { uiConfirm: vi.fn(), pickup: vi.fn(), consume: vi.fn(), equip: vi.fn() },
    input: { consumePad: vi.fn(), clearToggle: vi.fn() },
  });
  game.subscribe((events) => Reflect.apply(Reflect.get(App.prototype, 'onGameEvents'), app, [events]));
  const call = (method: string, ...args: unknown[]) => Reflect.apply(Reflect.get(App.prototype, method), app, args);
  return { app, game, call };
}

describe('actual App hotbar and inventory routes', () => {
  it('starts with ten empty slots and refuses empty, depleted and invalid activation', () => {
    const { app, game, call } = fixture();
    expect(game.state.quickSlots).toEqual(Array(10).fill(null));
    const initial = structuredClone(game.state);
    for (const slot of [0, 9, -1, 10, .5, NaN, Infinity]) call('activateQuickSlot', slot);
    expect(game.state).toEqual(initial);
    call('assignQuickSlot', 0, 'bread');
    game.state.inventory.bread = 0;
    const depleted = structuredClone(game.state);
    call('activateQuickSlot', 0);
    expect(game.state).toEqual(depleted);
    expect(app.input.consumePad).not.toHaveBeenCalled();
    expect(app.player.syncEquipment).not.toHaveBeenCalled();
    expect(app.audio.consume).not.toHaveBeenCalled();
    expect(app.audio.equip).not.toHaveBeenCalled();
  });

  it('equips a weapon from a numbered slot without consuming it or healing the player', () => {
    const { app, game, call } = fixture();
    call('assignQuickSlot', 9, 'rusted_sword');
    call('activateQuickSlot', 9);
    expect(game.state.equippedWeapon).toBe('rusted_sword');
    expect(game.state.inventory.rusted_sword).toBe(1);
    expect(game.state.player.health).toBe(40);
    expect(app.player.syncEquipment).toHaveBeenCalledWith(game, true);
    expect(app.input.clearToggle).toHaveBeenCalledWith('block');
    expect(app.input.consumePad).toHaveBeenCalledOnce();
    expect(app.audio.consume).not.toHaveBeenCalled();
    expect(app.audio.equip.mock.calls).toEqual([[true]]);
  });

  it('consumes exactly one carried unit per activation and retains the depleted binding', () => {
    const { app, game, call } = fixture();
    call('assignQuickSlot', 2, 'bread');
    call('activateQuickSlot', 2);
    expect(game.state.inventory.bread).toBe(1);
    expect(game.state.player.health).toBe(56);
    call('activateQuickSlot', 2);
    expect(game.state.inventory.bread).toBe(0);
    expect(game.state.player.health).toBe(72);
    expect(game.state.quickSlots[2]).toBe('bread');
    call('activateQuickSlot', 2);
    expect(game.state.player.health).toBe(72);
    expect(app.audio.consume.mock.calls).toEqual([['bread'], ['bread']]);
    expect(app.player.syncEquipment).not.toHaveBeenCalled();
  });

  it('does not spend a remedy at full health, including the existing poultice action', () => {
    const { app, game, call } = fixture();
    game.state.player.health = game.state.player.maxHealth;
    call('assignQuickSlot', 0, 'bread');
    call('activateQuickSlot', 0); call('usePoultice');
    expect(game.state.inventory.bread).toBe(2);
    expect(game.state.inventory.poultice).toBe(1);
    expect(app.audio.consume).not.toHaveBeenCalled();
    expect(app.hud.toast).toHaveBeenCalledTimes(2);
  });

  it('blocks world hotbar activation during a modal while keeping intentional inventory actions usable', () => {
    const { app, game, call } = fixture();
    call('assignQuickSlot', 0, 'bread');
    app.panels.isOpen = true;
    call('activateQuickSlot', 0);
    expect(game.state.inventory.bread).toBe(2);
    expect(app.input.consumePad).not.toHaveBeenCalled();
    call('useInventoryItem', 'bread');
    call('equipWeapon', 'rusted_sword');
    call('assignQuickSlot', 1, 'rusted_sword');
    expect(game.state.inventory.bread).toBe(1);
    expect(game.state.player.health).toBe(56);
    expect(game.state.equippedWeapon).toBe('rusted_sword');
    expect(game.state.quickSlots[1]).toBe('rusted_sword');
  });

  it.each(['title', 'building', 'failed', 'reload', 'dead'] as const)('blocks every inventory mutation when %s owns play', (guard) => {
    const { app, game, call } = fixture();
    call('assignQuickSlot', 0, 'bread');
    app.audio.uiConfirm.mockClear();
    if (guard === 'title') app.mode = 'title';
    if (guard === 'building') app.worldBuilding = true;
    if (guard === 'failed') app.worldBuildFailed = true;
    if (guard === 'reload') Reflect.set(app, 'qualityReload', Promise.resolve());
    if (guard === 'dead') app.player.alive = false;
    const before = structuredClone(game.state);
    call('activateQuickSlot', 0); call('assignQuickSlot', 3, 'rusted_sword');
    call('swapQuickSlots', 0, 3); call('equipWeapon', 'rusted_sword');
    call('useInventoryItem', 'bread'); call('usePoultice');
    expect(game.state).toEqual(before);
    expect(app.input.consumePad).not.toHaveBeenCalled();
    expect(app.player.syncEquipment).not.toHaveBeenCalled();
    expect(app.audio.uiConfirm).not.toHaveBeenCalled();
    expect(app.audio.consume).not.toHaveBeenCalled();
    expect(app.audio.equip).not.toHaveBeenCalled();
  });

  it('moves duplicate assignments, swaps occupied slots atomically and clears bindings without changing inventory', () => {
    const { game, call } = fixture();
    const inventory = { ...game.state.inventory };
    call('assignQuickSlot', 0, 'bread'); call('assignQuickSlot', 4, 'bread');
    expect(game.state.quickSlots[0]).toBeNull();
    expect(game.state.quickSlots.filter((item) => item === 'bread')).toHaveLength(1);
    call('assignQuickSlot', 7, 'rusted_sword'); call('swapQuickSlots', 4, 7);
    expect(game.state.quickSlots[4]).toBe('rusted_sword');
    expect(game.state.quickSlots[7]).toBe('bread');
    const slots = [...game.state.quickSlots];
    call('swapQuickSlots', 7, 7); expect(game.state.quickSlots).toEqual(slots);
    call('assignQuickSlot', 4, null); expect(game.state.quickSlots[4]).toBeNull();
    expect(game.state.inventory).toEqual(inventory);
  });

  it('refreshes equipped geometry on successful equip and unequip, never on rejected ownership/type', () => {
    const { app, game, call } = fixture();
    call('equipWeapon', 'rusted_sword'); call('equipWeapon', null);
    expect(game.state.equippedWeapon).toBeNull();
    expect(app.player.syncEquipment.mock.calls).toEqual([[game, true], [game, false]]);
    expect(app.input.clearToggle).toHaveBeenCalledTimes(2);
    call('equipWeapon', 'bread' satisfies ItemId);
    game.state.inventory.rusted_sword = 0; call('equipWeapon', 'rusted_sword');
    expect(app.player.syncEquipment).toHaveBeenCalledTimes(2);
    expect(app.audio.uiConfirm).toHaveBeenCalledTimes(2);
    // The blade is drawn, then put away; rejected requests make no sound.
    expect(app.audio.equip.mock.calls).toEqual([[true], [false]]);
  });
  it('readies an already equipped weapon without repeating geometry sync or clearing a current guard', () => {
    const { app, call } = fixture();
    call('assignQuickSlot', 0, 'rusted_sword'); call('activateQuickSlot', 0);
    app.player.syncEquipment.mockClear(); app.input.clearToggle.mockClear();
    call('activateQuickSlot', 0);
    expect(app.player.readyWeapon).toHaveBeenCalledOnce();
    expect(app.player.syncEquipment).not.toHaveBeenCalled();
    expect(app.input.clearToggle).not.toHaveBeenCalled();
  });

});
