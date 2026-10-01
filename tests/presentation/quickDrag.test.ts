import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/game/state';
import type { ItemId } from '../../src/game/types';
import { quickDragMoved, quickDropOperation } from '../../src/presentation/ui/quickDrag';

describe('pointer hotbar drop decisions', () => {
  it('keeps normal clicks and small diagonal pointer jitter below the six CSS-pixel drag threshold', () => {
    expect(quickDragMoved(100, 200, 100, 200)).toBe(false);
    expect(quickDragMoved(100, 200, 105.9, 200)).toBe(false);
    expect(quickDragMoved(100, 200, 104, 204)).toBe(false);
    expect(quickDragMoved(100, 200, 106, 200)).toBe(true);
    expect(quickDragMoved(100, 200, 104, 205)).toBe(true);
    expect(quickDragMoved(100, 200, 94, 200)).toBe(true);
    expect(quickDragMoved(100, 200, NaN, 206)).toBe(false);
  });

  it('assigns a carried item to a valid numbered slot without touching any carried quantity or binding', () => {
    const state = createInitialState();
    state.inventory.shore_apple = 3;
    const before = structuredClone(state);
    expect(quickDropOperation({ item: 'shore_apple', from: null }, 9, state.quickSlots, state.inventory)).toEqual({ t: 'assign', slot: 9, item: 'shore_apple' });
    expect(state).toEqual(before);
  });

  it('reorders a depleted binding, ignores the same slot, and rejects an origin changed during the drag', () => {
    const state = createInitialState();
    state.quickSlots[3] = 'bread'; state.inventory.bread = 0;
    expect(quickDropOperation({ item: 'bread', from: 3 }, 6, state.quickSlots, state.inventory)).toEqual({ t: 'swap', from: 3, to: 6 });
    expect(quickDropOperation({ item: 'bread', from: 3 }, 3, state.quickSlots, state.inventory)).toBeNull();
    state.quickSlots[3] = 'rusted_sword';
    expect(quickDropOperation({ item: 'bread', from: 3 }, 6, state.quickSlots, state.inventory)).toBeNull();
  });

  it('rejects depleted inventory, unsupported actions, invalid drop targets and forged slot origins', () => {
    const state = createInitialState();
    state.inventory = { bread: 0, archive_key: 1, coin: 5 };
    for (const item of ['bread', 'archive_key', 'coin'] as ItemId[]) expect(quickDropOperation({ item, from: null }, 0, state.quickSlots, state.inventory)).toBeNull();
    state.inventory.bread = 2;
    for (const slot of [-1, 10, .5, NaN, Infinity]) expect(quickDropOperation({ item: 'bread', from: null }, slot, state.quickSlots, state.inventory)).toBeNull();
    for (const from of [-1, 10, .5, NaN]) expect(quickDropOperation({ item: 'bread', from }, 0, state.quickSlots, state.inventory)).toBeNull();
    expect(quickDropOperation({ item: 'invented_spell' as ItemId, from: null }, 0, state.quickSlots, state.inventory)).toBeNull();
  });
});
