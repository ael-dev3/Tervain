import { hasFact, isDaytime } from './state';
import type { Allocation, GateState, WorldState } from './types';

/**
 * Presentation-facing facts derived from durable state. World visuals derive from facts;
 * they are never the only proof that a choice occurred (quests-and-consequences.md).
 * Flow values are 0..1 targets; the renderer eases toward them.
 */
export interface WorldView {
  gate: GateState;
  allocation: Allocation | null;
  flow: {
    /** Water leaving the spring and wetland (never below the habitat minimum). */
    spring: number;
    /** Water on the main channel between the sluice and the village. */
    main: number;
    /** The household channel behind the mill. */
    village: number;
    /** The quarry cutting channel. */
    quarry: number;
  };
  millTurning: boolean;
  quarryState: 'stopped' | 'limited' | 'working' | 'night_shift';
  scheduleBoard: boolean;
  contractGuard: boolean;
  idleQuarryCrew: boolean;
  noticeboard: string[];
  rationing: 'severe' | 'moderate' | 'eased';
  archiveDoor: 'locked' | 'open';
  archiveShutter: 'closed' | 'forced' | 'sealed';
  shortcutOpen: boolean;
  bellMode: 'drought' | 'quiet' | 'allclear';
  /** Details a returning player can see; at least three per outcome. */
  visibleDetails: string[];
}

/** Minimum drinking and habitat flow every normal allocation preserves. */
export const MIN_HABITAT_FLOW = 0.28;

export function worldView(s: WorldState): WorldView {
  const alloc = s.quest.allocation;
  const committed = s.quest.phase === 'committed' || s.quest.phase === 'settled';
  const day = isDaytime(s.clock);
  const gate = s.quest.gate;

  let village = 0.1;
  let quarry = 0.3;
  let main = 0.32;
  if (gate === 'jammed') {
    village = 0.04;
    quarry = 0.18;
    main = 0.22;
  } else if (gate === 'stabilized') {
    village = 0.24;
    quarry = 0.22;
    main = 0.5;
  }
  let millTurning = false;
  let quarryState: WorldView['quarryState'] = 'stopped';
  let rationing: WorldView['rationing'] = gate === 'jammed' ? 'severe' : 'moderate';
  const details: string[] = [];

  if (committed && alloc) {
    if (alloc === 'rillford') {
      village = 0.85;
      quarry = 0.05;
      main = 0.9;
      millTurning = true;
      quarryState = 'stopped';
      rationing = 'eased';
      details.push('detail.channel_full', 'detail.mill_turning', 'detail.quarry_idle');
    } else if (alloc === 'quarry') {
      village = 0.14;
      quarry = 0.85;
      main = 0.9;
      quarryState = 'working';
      rationing = 'severe';
      details.push('detail.quarry_working', 'detail.mill_still_queue', 'detail.contract_guard');
    } else {
      village = day ? 0.62 : 0.14;
      quarry = day ? 0.14 : 0.62;
      main = 0.9;
      millTurning = day;
      quarryState = day ? 'stopped' : 'night_shift';
      rationing = 'moderate';
      details.push('detail.schedule_posted', 'detail.alternating_work', 'detail.tired_night_crew');
    }
  }

  const noticeboard: string[] = [];
  noticeboard.push('board.bell_drought');
  if (s.quest.gate === 'jammed') noticeboard.push('board.gate_jammed');
  if (s.quest.gate === 'stabilized' && !committed) noticeboard.push('board.gate_braced');
  if (committed && alloc) {
    noticeboard.push(`board.alloc_${alloc}`);
    if (hasFact(s, 'public_statement_posted')) noticeboard.push('board.public_statement');
    if (hasFact(s, 'public_account_misleading')) noticeboard.push('board.account_flood_only');
    else if (alloc === 'rotation') noticeboard.push('board.rotation_witnesses');
    if (hasFact(s, 'emergency_allocation')) noticeboard.push('board.emergency_expires');
  }

  return {
    gate,
    allocation: alloc,
    flow: { spring: Math.max(MIN_HABITAT_FLOW, gate === 'stabilized' ? 0.5 : 0.34), main, village, quarry },
    millTurning,
    quarryState,
    scheduleBoard: committed && alloc === 'rotation',
    contractGuard: committed && alloc === 'quarry',
    idleQuarryCrew: committed && alloc === 'rillford',
    noticeboard,
    rationing,
    archiveDoor: s.locationChanges.archive_door === 'open' ? 'open' : 'locked',
    archiveShutter: s.locationChanges.archive_shutter === 'forced' ? 'forced' : s.locationChanges.archive_shutter === 'sealed' ? 'sealed' : 'closed',
    shortcutOpen: s.locationChanges.shortcut === 'open',
    bellMode: s.quest.phase === 'settled' ? 'allclear' : committed ? 'quiet' : 'drought',
    visibleDetails: details,
  };
}
