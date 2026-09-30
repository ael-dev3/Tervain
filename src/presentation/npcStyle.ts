import type { NpcId } from '../game/types';
import type { HairCut } from './human/head';
import type { BeardStyle, Build } from './human/headShape';

export type HairStyle = HairCut;
export type WorkGesture = 'general' | 'mending' | 'measuring' | 'ledger' | 'writing' | 'stonework' | 'baking' | 'guard';

export interface NpcStyle {
  /** Stable face seed, deliberately independent of clothing colours and accessories. */
  faceSeed: number;
  /**
   * Body build (proposal). Women and men follow the pronouns the docs and dialogue already use; where the docs say nothing,
   * the build is 'neutral' until the owner decides.
   */
  build: Build;
  hair: HairStyle;
  beard: BeardStyle;
  age: number;
  work: WorkGesture;
}

/** Small authored details stop a wardrobe change from silently changing who a character is. */
export const NPC_STYLES: Readonly<Record<NpcId, NpcStyle>> = {
  caravan_master: { faceSeed: 1103, build: 'man', hair: 'tied', beard: 'full', age: 0.54, work: 'ledger' },
  rillford_reeve: { faceSeed: 2207, build: 'woman', hair: 'long', beard: 'none', age: 0.38, work: 'measuring' },
  spring_steward: { faceSeed: 3301, build: 'woman', hair: 'bun', beard: 'none', age: 0.82, work: 'measuring' },
  quarry_foreman: { faceSeed: 4409, build: 'man', hair: 'cropped', beard: 'short', age: 0.63, work: 'ledger' },
  maintenance_worker: { faceSeed: 5519, build: 'woman', hair: 'long', beard: 'none', age: 0.3, work: 'mending' },
  estate_steward: { faceSeed: 6619, build: 'man', hair: 'short', beard: 'goatee', age: 0.72, work: 'ledger' },
  ash_recorder: { faceSeed: 7723, build: 'neutral', hair: 'tied', beard: 'none', age: 0.58, work: 'writing' },
  shrine_warden: { faceSeed: 8837, build: 'man', hair: 'cropped', beard: 'full', age: 0.78, work: 'guard' },
  mill_hand: { faceSeed: 9941, build: 'neutral', hair: 'tied', beard: 'none', age: 0.34, work: 'measuring' },
  quarry_hand: { faceSeed: 10009, build: 'man', hair: 'short', beard: 'short', age: 0.46, work: 'stonework' },
  village_baker: { faceSeed: 10111, build: 'neutral', hair: 'long', beard: 'none', age: 0.5, work: 'baking' },
};

export function npcStyle(id: NpcId): NpcStyle {
  return NPC_STYLES[id];
}
