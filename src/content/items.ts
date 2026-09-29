import type { ItemId } from '../game/types';

export interface ItemDef {
  id: ItemId;
  nameKey: string;
  descKey: string;
  kind: 'currency' | 'tool' | 'quest' | 'consumable' | 'clothing';
}

export const ITEMS: Record<ItemId, ItemDef> = {
  coin: { id: 'coin', nameKey: 'item.coin', descKey: 'item.coin.desc', kind: 'currency' },
  sluice_brace: { id: 'sluice_brace', nameKey: 'item.sluice_brace', descKey: 'item.sluice_brace.desc', kind: 'quest' },
  gate_wrench: { id: 'gate_wrench', nameKey: 'item.gate_wrench', descKey: 'item.gate_wrench.desc', kind: 'tool' },
  archive_key: { id: 'archive_key', nameKey: 'item.archive_key', descKey: 'item.archive_key.desc', kind: 'quest' },
  votive_reed: { id: 'votive_reed', nameKey: 'item.votive_reed', descKey: 'item.votive_reed.desc', kind: 'quest' },
  poultice: { id: 'poultice', nameKey: 'item.poultice', descKey: 'item.poultice.desc', kind: 'consumable' },
  league_sash: { id: 'league_sash', nameKey: 'item.league_sash', descKey: 'item.league_sash.desc', kind: 'clothing' },
  contract_band: { id: 'contract_band', nameKey: 'item.contract_band', descKey: 'item.contract_band.desc', kind: 'clothing' },
  witness_cord: { id: 'witness_cord', nameKey: 'item.witness_cord', descKey: 'item.witness_cord.desc', kind: 'clothing' },
};

/** Ordering for the small inventory panel. */
export const ITEM_ORDER: ItemId[] = ['coin', 'poultice', 'sluice_brace', 'gate_wrench', 'votive_reed', 'archive_key', 'league_sash', 'contract_band', 'witness_cord'];
