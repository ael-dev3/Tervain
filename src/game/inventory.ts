import { hotbarEligible, isItemId, itemAction } from '../content/items';
import { QUICK_SLOT_COUNT, type ItemId, type QuickSlot } from './types';

export function validQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function validQuickSlot(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < QUICK_SLOT_COUNT;
}

/** Bad save entries cannot introduce unknown items, negative stacks or fractional/overflow quantities. */
export function normalizeInventory(raw: Record<string, unknown>): Partial<Record<ItemId, number>> {
  const inventory: Partial<Record<ItemId, number>> = {};
  for (const [id, quantity] of Object.entries(raw)) {
    if (isItemId(id) && validQuantity(quantity)) inventory[id] = quantity;
  }
  return inventory;
}

export function normalizeQuickSlots(raw: unknown): QuickSlot[] {
  const seen = new Set<ItemId>();
  return Array.from({ length: QUICK_SLOT_COUNT }, (_, index) => {
    const item: unknown = Array.isArray(raw) ? raw[index] : null;
    if (!isItemId(item) || !hotbarEligible(item) || seen.has(item)) return null;
    seen.add(item);
    // Preserve a depleted binding; it never supplies ownership or a usable stack.
    return item;
  });
}

export function normalizeEquippedWeapon(raw: unknown, inventory: Partial<Record<ItemId, number>>): ItemId | null {
  return isItemId(raw) && itemAction(raw) === 'equip' && (inventory[raw] ?? 0) > 0 ? raw : null;
}
