import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/game/state';
import { decodeQuickDrag, directionalCell, inventoryItems, quickSlotFromCode, quickSlotLabel, resourceFraction, type FocusRect } from '../../src/presentation/ui/uiModel';
import { MAP_H, MAP_W, mapHeading, mapX, mapZ, placeMapLabel } from '../../src/presentation/ui/mapProjection';

const cells: FocusRect[] = Array.from({ length: 7 }, (_, i) => ({ left: i % 3 * 100, top: Math.floor(i / 3) * 90, width: 80, height: 70 }));

describe('physical inventory navigation', () => {
  it('moves by actual row and column rather than treating Down as the next item', () => {
    expect(directionalCell(cells, 1, 0, 1)).toBe(4);
    expect(directionalCell(cells, 4, 0, -1)).toBe(1);
    expect(directionalCell(cells, 4, -1, 0)).toBe(3);
    expect(directionalCell(cells, 4, 1, 0)).toBe(5);
  });
  it('does not wrap a right edge into the beginning of the next row', () => {
    expect(directionalCell(cells, 2, 1, 0)).toBeNull();
    expect(directionalCell(cells, 3, -1, 0)).toBeNull();
    expect(directionalCell(cells, 6, 0, 1)).toBeNull();
  });
  it('supports an incomplete last row, unchanged column first and nearest diagonal second', () => {
    expect(directionalCell(cells, 3, 0, 1)).toBe(6);
    expect(directionalCell(cells, 4, 0, 1)).toBe(6);
    expect(directionalCell(cells, 5, 0, 1)).toBeNull();
  });
  it('exposes only carried items in a stable order and updates on consumption', () => {
    const state = createInitialState();
    state.inventory = { coin: 48, poultice: 2, archive_key: 1, rusted_sword: 1, gate_wrench: 0 };
    expect(inventoryItems(state)).toEqual(['rusted_sword', 'poultice', 'archive_key']);
    expect(inventoryItems(state, 'quest')).toEqual(['archive_key']);
    expect(inventoryItems(state, 'tool')).toEqual([]);
    state.inventory.poultice = 0;
    expect(inventoryItems(state, 'consumable')).toEqual([]);
  });
});

describe('native ten-slot assignment input', () => {
  it('maps the final zero key to slot ten, including the numeric keypad', () => {
    for (let slot = 0; slot < 10; slot++) {
      const label = quickSlotLabel(slot);
      expect(quickSlotFromCode(`Digit${label}`)).toBe(slot);
      expect(quickSlotFromCode(`Numpad${label}`)).toBe(slot);
    }
    expect(quickSlotFromCode('KeyI')).toBeNull();
    expect(quickSlotFromCode('Digit10')).toBeNull();
  });
  it('distinguishes an inventory binding from moving an existing slot without creating inventory', () => {
    expect(decodeQuickDrag('{"item":"bread","from":null}')).toEqual({ item: 'bread', from: null });
    expect(decodeQuickDrag('{"item":"rusted_sword","from":9}')).toEqual({ item: 'rusted_sword', from: 9 });
  });
  it('rejects foreign items, corrupt payloads and out-of-range or missing drag origins', () => {
    for (const raw of ['', 'not json', 'null', '[]', '{"item":"invented_spell","from":null}', '{"item":"__proto__","from":null}', '{"item":"bread"}', '{"item":"bread","from":-1}', '{"item":"bread","from":10}', '{"item":"bread","from":1.5}', '{"item":"bread","from":"0"}', ' '.repeat(257)]) expect(decodeQuickDrag(raw)).toBeNull();
  });
});

describe('resource readouts', () => {
  it('clamps depleted, overfilled and invalid values without emitting NaN CSS widths', () => {
    expect(resourceFraction(75, 100)).toBe(.75);
    expect(resourceFraction(0, 100)).toBe(0);
    expect(resourceFraction(-1, 100)).toBe(0);
    expect(resourceFraction(101, 100)).toBe(1);
    expect(resourceFraction(20, 0)).toBe(0);
    expect(resourceFraction(Infinity, 100)).toBe(0);
    expect(resourceFraction(20, NaN)).toBe(0);
  });
});

describe('north-up world map', () => {
  it('matches actual world movement at each cardinal facing', () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      // The painted arrow begins at (0,-1); canvas rotation maps it to sin/cos world forward.
      const angle = mapHeading(yaw);
      expect(Math.sin(angle)).toBeCloseTo(Math.sin(yaw));
      expect(-Math.cos(angle)).toBeCloseTo(Math.cos(yaw));
    }
    expect(mapX(10)).toBeGreaterThan(mapX(-10));
    expect(mapZ(-10)).toBeLessThan(mapZ(10));
  });
  it('keeps nearby shrine/archive annotations distinct and inside the sheet', () => {
    const first = placeMapLabel(700, 55, 120, []);
    const next = placeMapLabel(722, 55, 100, [first]);
    const overlap = first.x < next.x + next.width && first.x + first.width > next.x && first.y < next.y + next.height && first.y + first.height > next.y;
    expect(overlap).toBe(false);
    for (const label of [first, next, placeMapLabel(2, 1, 200, []), placeMapLabel(MAP_W - 1, MAP_H - 1, 160, [])]) {
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width).toBeLessThanOrEqual(MAP_W);
      expect(label.y + label.height).toBeLessThanOrEqual(MAP_H);
    }
  });
});
