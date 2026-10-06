import type { ItemId } from '../game/types';

export interface ItemDef {
  id: ItemId;
  nameKey: string;
  descKey: string;
  kind: 'currency' | 'tool' | 'quest' | 'consumable' | 'clothing' | 'weapon' | 'material';
  /** Consumable restoration is authored here, shared by commands and inventory descriptions. */
  healAmount?: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  coin: { id: 'coin', nameKey: 'item.coin', descKey: 'item.coin.desc', kind: 'currency' },
  rusted_sword: { id: 'rusted_sword', nameKey: 'item.rusted_sword', descKey: 'item.rusted_sword.desc', kind: 'weapon' },
  hunting_bow: { id: 'hunting_bow', nameKey: 'item.hunting_bow', descKey: 'item.hunting_bow.desc', kind: 'weapon' },
  arrow: { id: 'arrow', nameKey: 'item.arrow', descKey: 'item.arrow.desc', kind: 'material' },
  skinning_knife: { id: 'skinning_knife', nameKey: 'item.skinning_knife', descKey: 'item.skinning_knife.desc', kind: 'tool' },
  animal_hide: { id: 'animal_hide', nameKey: 'item.animal_hide', descKey: 'item.animal_hide.desc', kind: 'material' },
  raw_meat: { id: 'raw_meat', nameKey: 'item.raw_meat', descKey: 'item.raw_meat.desc', kind: 'material' },
  sluice_brace: { id: 'sluice_brace', nameKey: 'item.sluice_brace', descKey: 'item.sluice_brace.desc', kind: 'quest' },
  gate_wrench: { id: 'gate_wrench', nameKey: 'item.gate_wrench', descKey: 'item.gate_wrench.desc', kind: 'tool' },
  archive_key: { id: 'archive_key', nameKey: 'item.archive_key', descKey: 'item.archive_key.desc', kind: 'quest' },
  votive_reed: { id: 'votive_reed', nameKey: 'item.votive_reed', descKey: 'item.votive_reed.desc', kind: 'quest' },
  poultice: { id: 'poultice', nameKey: 'item.poultice', descKey: 'item.poultice.desc', kind: 'consumable', healAmount: 40 },
  shore_apple: { id: 'shore_apple', nameKey: 'item.shore_apple', descKey: 'item.shore_apple.desc', kind: 'consumable', healAmount: 8 },
  bread: { id: 'bread', nameKey: 'item.bread', descKey: 'item.bread.desc', kind: 'consumable', healAmount: 16 },
  healing_herb: { id: 'healing_herb', nameKey: 'item.healing_herb', descKey: 'item.healing_herb.desc', kind: 'consumable', healAmount: 24 },
  field_mushroom: { id: 'field_mushroom', nameKey: 'item.field_mushroom', descKey: 'item.field_mushroom.desc', kind: 'consumable', healAmount: 10 },
  iron_scrap: { id: 'iron_scrap', nameKey: 'item.iron_scrap', descKey: 'item.iron_scrap.desc', kind: 'material' },
  league_sash: { id: 'league_sash', nameKey: 'item.league_sash', descKey: 'item.league_sash.desc', kind: 'clothing' },
  contract_band: { id: 'contract_band', nameKey: 'item.contract_band', descKey: 'item.contract_band.desc', kind: 'clothing' },
  witness_cord: { id: 'witness_cord', nameKey: 'item.witness_cord', descKey: 'item.witness_cord.desc', kind: 'clothing' },
};

/** Ordering for the small inventory panel. */
export const ITEM_ORDER: ItemId[] = ['rusted_sword', 'hunting_bow', 'arrow', 'skinning_knife', 'animal_hide', 'raw_meat', 'coin', 'poultice', 'healing_herb', 'bread', 'shore_apple', 'field_mushroom', 'iron_scrap', 'sluice_brace', 'gate_wrench', 'votive_reed', 'archive_key', 'league_sash', 'contract_band', 'witness_cord'];

export function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && Object.hasOwn(ITEMS, value);
}

/** Only actions implemented by the game are offered; tools, materials and passive training are carried records. */
export function itemAction(item: ItemId): 'equip' | 'consume' | null {
  const def = ITEMS[item];
  if (def.kind === 'weapon') return 'equip';
  return def.kind === 'consumable' && (def.healAmount ?? 0) > 0 ? 'consume' : null;
}

export function hotbarEligible(item: ItemId): boolean {
  return itemAction(item) !== null;
}
