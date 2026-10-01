import { ITEM_ORDER, ITEMS } from '../../content/items';
import type { ItemId, WorldState } from '../../game/types';

/** Clamp unreliable/empty resource input before it reaches CSS or an accessible progress value. */
export function resourceFraction(value: number, maximum: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0) return 0;
  return Math.max(0, Math.min(1, value / maximum));
}

export const INVENTORY_GROUPS = ['all', 'weapon', 'tool', 'quest', 'consumable', 'clothing', 'material'] as const;
export type InventoryGroup = typeof INVENTORY_GROUPS[number];
export function inventoryItems(state: Pick<WorldState, 'inventory'>, group: InventoryGroup = 'all'): ItemId[] {
  // Coins have their own purse readout rather than pretending to be usable equipment.
  return ITEM_ORDER.filter((id) => id !== 'coin' && (state.inventory[id] ?? 0) > 0 && (group === 'all' || ITEMS[id].kind === group));
}

export const QUICK_SLOT_COUNT = 10;
export const QUICK_DRAG_TYPE = 'application/x-tervain-quick-item';
export interface QuickDrag { item: ItemId; from: number | null }
export function quickSlotLabel(slot: number): string { return String((slot + 1) % QUICK_SLOT_COUNT); }
export function quickSlotFromCode(code: string): number | null {
  const match = /^(?:Digit|Numpad)([0-9])$/.exec(code);
  return match ? (Number(match[1]) + 9) % QUICK_SLOT_COUNT : null;
}
/** Reject foreign, malformed and stale-looking drag payloads before sending a game command. */
export function decodeQuickDrag(raw: string): QuickDrag | null {
  if (raw.length > 256) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const { item, from } = value as Record<string, unknown>;
    if (typeof item !== 'string' || !Object.hasOwn(ITEMS, item)) return null;
    if (from !== null && !(typeof from === 'number' && Number.isInteger(from) && from >= 0 && from < QUICK_SLOT_COUNT)) return null;
    return { item: item as ItemId, from: from as number | null };
  } catch { return null; }
}

export interface FocusRect { left: number; top: number; width: number; height: number }
/** Nearest cell in the requested direction. No wrap across a row into an unrelated column. */
export function directionalCell(rects: FocusRect[], current: number, dx: number, dy: number): number | null {
  const origin = rects[current];
  if (!origin || (dx === 0 && dy === 0)) return null;
  const horizontal = dx !== 0;
  const sign = Math.sign(horizontal ? dx : dy);
  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height / 2;
  let best: number | null = null;
  let bestScore = Infinity;
  rects.forEach((r, i) => {
    if (i === current) return;
    const x = r.left + r.width / 2 - ox;
    const y = r.top + r.height / 2 - oy;
    const forward = (horizontal ? x : y) * sign;
    const lateral = Math.abs(horizontal ? y : x);
    if (forward <= 1 || lateral > forward * 1.25 + 1) return;
    // Prefer the same row/column even when the next cell's painted width differs.
    const score = forward + lateral * 4;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}
