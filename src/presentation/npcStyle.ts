import type { NpcId } from '../game/types';

export type HairStyle = 'short' | 'long' | 'tied' | 'bald';
export type WorkGesture = 'general' | 'mending' | 'measuring' | 'ledger' | 'writing' | 'stonework' | 'baking' | 'guard';

export interface NpcStyle {
  /** Stable face seed, deliberately independent of clothing colours and accessories. */
  faceSeed: number;
  hair: HairStyle;
  beard: boolean;
  age: number;
  work: WorkGesture;
}

/** Small authored details stop a wardrobe change from silently changing who a character is. */
export const NPC_STYLES: Readonly<Record<NpcId, NpcStyle>> = {
  caravan_master: { faceSeed: 1103, hair: 'tied', beard: true, age: 0.54, work: 'ledger' },
  rillford_reeve: { faceSeed: 2207, hair: 'long', beard: false, age: 0.38, work: 'measuring' },
  spring_steward: { faceSeed: 3301, hair: 'tied', beard: false, age: 0.82, work: 'measuring' },
  quarry_foreman: { faceSeed: 4409, hair: 'short', beard: true, age: 0.63, work: 'ledger' },
  maintenance_worker: { faceSeed: 5519, hair: 'long', beard: false, age: 0.3, work: 'mending' },
  estate_steward: { faceSeed: 6619, hair: 'short', beard: true, age: 0.72, work: 'ledger' },
  ash_recorder: { faceSeed: 7723, hair: 'tied', beard: false, age: 0.58, work: 'writing' },
  shrine_warden: { faceSeed: 8837, hair: 'short', beard: true, age: 0.78, work: 'guard' },
  mill_hand: { faceSeed: 9941, hair: 'tied', beard: false, age: 0.34, work: 'measuring' },
  quarry_hand: { faceSeed: 10009, hair: 'short', beard: true, age: 0.46, work: 'stonework' },
  village_baker: { faceSeed: 10111, hair: 'long', beard: false, age: 0.5, work: 'baking' },
};

export function npcStyle(id: NpcId): NpcStyle {
  return NPC_STYLES[id];
}
