/** Original loose provisions, useful plants and salvage. Each world placement is durable and can be taken once. */
export const WORLD_PICKUP_ITEM_IDS = ['shore_apple', 'bread', 'healing_herb', 'field_mushroom', 'iron_scrap'] as const;
export type WorldPickupItem = typeof WORLD_PICKUP_ITEM_IDS[number];

export const WORLD_PICKUP_MODELS: Record<WorldPickupItem, { nameKey: string }> = {
  shore_apple: { nameKey: 'item.shore_apple' },
  bread: { nameKey: 'item.bread' },
  healing_herb: { nameKey: 'item.healing_herb' },
  field_mushroom: { nameKey: 'item.field_mushroom' },
  iron_scrap: { nameKey: 'item.iron_scrap' },
};

export function isWorldPickupItem(item: string): item is WorldPickupItem {
  return (WORLD_PICKUP_ITEM_IDS as readonly string[]).includes(item);
}
