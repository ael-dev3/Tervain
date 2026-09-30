import type { NpcId } from '../game/types';

/** Working original observations for the silent exploration patch, with no spoken replies. */
export const NPC_OBSERVATIONS: Record<NpcId, string> = {
  caravan_master: 'observe.caravan_master',
  rillford_reeve: 'observe.rillford_reeve',
  spring_steward: 'observe.spring_steward',
  quarry_foreman: 'observe.quarry_foreman',
  maintenance_worker: 'observe.maintenance_worker',
  estate_steward: 'observe.estate_steward',
  ash_recorder: 'observe.ash_recorder',
  shrine_warden: 'observe.shrine_warden',
  mill_hand: 'observe.mill_hand',
  quarry_hand: 'observe.quarry_hand',
  village_baker: 'observe.village_baker',
};
