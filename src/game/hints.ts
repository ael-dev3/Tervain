import type { PlaceId, WorldState } from './types';

export interface Hint {
  key: string;
  place: PlaceId | null;
}

/**
 * Optional guidance. It names a next step and a rough place; it never reveals a
 * destination the player has not been told or found (an exploration setting can hide it).
 */
export function nextHint(s: WorldState): Hint {
  const q = s.quest;
  const has = (id: keyof WorldState['evidence']) => s.evidence[id] !== undefined;
  if (q.phase === 'settled') return { key: 'hint.settled', place: null };
  if (q.phase === 'committed') return { key: 'hint.check_result', place: 'rillford' };
  if (q.phase === 'decision_ready') return { key: 'hint.decide', place: 'sluice' };
  // The wanderer arrives with nothing: before the road inland, the wreck on the beach holds a blade.
  if (!s.discovered.rillford && q.phase === 'unseen' && (s.inventory.rusted_sword ?? 0) < 1 && s.locationChanges['pickup:wreck_blade'] !== 'taken') return { key: 'hint.search_wreck', place: 'shore' };
  if (!s.discovered.rillford && q.phase === 'unseen') return { key: 'hint.walk_to_rillford', place: 'rillford' };
  if (q.phase === 'unseen') return { key: 'hint.look_around', place: 'rillford' };
  if (q.gate === 'jammed') return { key: 'hint.jammed', place: 'sluice' };
  if (!has('dry_channel')) return { key: 'hint.see_dry_channel', place: 'rillford' };
  if (!has('reduced_spring_flow')) return { key: 'hint.see_spring', place: 'spring_shrine' };
  if (!has('cracked_sluice')) return { key: 'hint.see_sluice', place: 'sluice' };
  if (!has('diversion_and_seep')) return { key: 'hint.see_quarry', place: 'quarry' };
  const inv = s.inventory;
  if ((inv.sluice_brace ?? 0) < 1) return { key: 'hint.get_brace', place: 'quarry' };
  return { key: 'hint.stabilize', place: 'sluice' };
}
