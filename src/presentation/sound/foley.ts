import type { ItemId } from '../../game/types';
import type { WorkGesture } from '../npcStyle';
import type { ClipId } from './clips';

/**
 * What the world sounds like when something happens: pure tables from game facts to clips, kept apart from playback so
 * they can be checked without a browser. Levels are linear gains applied on top of each clip's prepared loudness.
 */

export type SurfaceKind = 'grass' | 'road' | 'stone' | 'water' | 'deck' | 'sand';

export interface Cue {
  clip: ClipId;
  gain: number;
  /** Playback-rate spread around 1 (0.04 = ±4 %): small pitch differences between repetitions. */
  pitch?: number;
  /** Part of the clip to play, in seconds (for clips that hold more than one action). */
  from?: number;
  to?: number;
  /** Delay after the triggering moment, in seconds. */
  delay?: number;
  /** A particular take (for tuned sets such as a peal of bells), instead of a random one. */
  variant?: number;
}

const STEP: Record<SurfaceKind, ClipId> = {
  grass: 'step.grass',
  road: 'step.dirt',
  stone: 'step.stone',
  water: 'step.water',
  deck: 'step.wood',
  sand: 'step.sand',
};

/** A footfall for a surface; a run strikes harder and quicker. Loose roads mix in gravel now and then. */
export function stepCue(surface: SurfaceKind, running: boolean, random: () => number = Math.random): Cue {
  let clip = STEP[surface];
  if (surface === 'road' && random() < 0.35) clip = 'step.gravel';
  if (running && (surface === 'grass' || surface === 'road')) clip = 'step.run';
  return { clip, gain: running ? 0.45 : 0.3, pitch: running ? 0.05 : 0.035 };
}

/** Landing after a jump or a drop, by the downward speed at contact (metres per second). */
export function landCues(surface: SurfaceKind, fallSpeed: number): Cue[] {
  const hard = Math.min(1, Math.max(0, (fallSpeed - 3) / 6));
  const cues: Cue[] = [{ clip: 'land', gain: 0.25 + 0.55 * hard, pitch: 0.04 }];
  if (surface === 'water') cues.push({ clip: 'step.water', gain: 0.7, pitch: 0.06 });
  else cues.push({ ...stepCue(surface, true), gain: 0.4 });
  return cues;
}

/** Picking something up: the object itself, and the satchel it goes into. */
export function pickupCues(item: ItemId): Cue[] {
  const bag: Cue = { clip: 'item.cloth', gain: 0.32, pitch: 0.05, from: 0, to: 0.9, delay: 0.18 };
  switch (item) {
    case 'coin':
      return [{ clip: 'item.coins', gain: 0.5, pitch: 0.04 }];
    case 'rusted_sword':
      return [{ clip: 'item.metal', gain: 0.55, pitch: 0.03 }, { clip: 'item.sword.sheathe', gain: 0.45, delay: 0.45 }];
    case 'gate_wrench':
    case 'iron_scrap':
    case 'archive_key':
      return [{ clip: 'item.metal', gain: 0.5, pitch: 0.06 }, bag];
    case 'skinning_knife':
      return [{ clip: 'item.metal', gain: 0.35, pitch: 0.04 }, bag];
    case 'hunting_bow':
    case 'arrow':
      // Handling wood and the quiver stays separate from drawing or firing a bow.
      return [{ clip: 'wood.lift', gain: item === 'arrow' ? 0.2 : 0.3, pitch: 0.04 }, bag];
    case 'sluice_brace':
      return [{ clip: 'wood.lift', gain: 0.55, pitch: 0.04 }];
    case 'votive_reed':
    case 'healing_herb':
    case 'field_mushroom':
      return [{ clip: 'item.herb', gain: 0.5, pitch: 0.06, from: 0, to: 1.6 }, bag];
    case 'shore_apple':
    case 'bread':
    case 'raw_meat':
      return [{ clip: 'item.satchel', gain: 0.4, pitch: 0.04, from: 0.6, to: 2.0 }];
    case 'poultice':
      return [{ clip: 'item.satchel', gain: 0.4, pitch: 0.04, from: 0.6, to: 2.0 }];
    case 'league_sash':
    case 'contract_band':
    case 'witness_cord':
    case 'animal_hide':
      return [{ clip: 'item.cloth', gain: 0.5, pitch: 0.05 }];
  }
}

/** Eating, chewing or applying a remedy. */
export function consumeCues(item: ItemId): Cue[] {
  switch (item) {
    case 'poultice':
      return [{ clip: 'item.poultice', gain: 0.55 }];
    case 'healing_herb':
      return [{ clip: 'item.herb', gain: 0.4, from: 1.6, to: 3.6 }, { clip: 'item.eat', gain: 0.45, from: 2.4, to: 4.5, delay: 0.5 }];
    default:
      return [{ clip: 'item.eat', gain: 0.55, pitch: 0.03 }];
  }
}

export const EQUIP: Cue = { clip: 'item.sword.draw', gain: 0.5, pitch: 0.03 };
export const UNEQUIP: Cue = { clip: 'item.sword.sheathe', gain: 0.5, pitch: 0.03 };
export const SATCHEL_OPEN: Cue = { clip: 'item.satchel', gain: 0.38, from: 0, to: 1.5 };
export const SATCHEL_CLOSE: Cue = { clip: 'item.satchel', gain: 0.32, from: 2.7 };
export const PAGE: Cue = { clip: 'item.page', gain: 0.42, pitch: 0.06 };
export const MAP_OPEN: Cue = { clip: 'item.map', gain: 0.42, pitch: 0.03 };

/** The world's moving parts. */
export type WorldAction = 'door' | 'gate' | 'shutter' | 'lever' | 'sluice' | 'sluice_jam' | 'surge' | 'rite';

export function worldCues(action: WorldAction): Cue[] {
  switch (action) {
    case 'door':
      return [{ clip: 'door.open', gain: 0.6, pitch: 0.03 }];
    case 'gate':
      return [{ clip: 'gate', gain: 0.65, pitch: 0.03 }];
    case 'shutter':
      return [{ clip: 'shutter.break', gain: 0.75 }];
    case 'lever':
      return [{ clip: 'lever', gain: 0.65 }, { clip: 'gate', gain: 0.5, delay: 0.9 }];
    case 'sluice':
      return [{ clip: 'sluice', gain: 0.7 }];
    case 'sluice_jam':
      return [{ clip: 'sluice', gain: 0.7, from: 0, to: 2.4, pitch: 0.02 }, { clip: 'wood.impact', gain: 0.55, delay: 1.9 }];
    case 'surge':
      return [{ clip: 'water.surge', gain: 0.7 }];
    case 'rite':
      // The crafted singing bowls and rising water answer beneath the recorded rite.
      return [{ clip: 'rite', gain: 0.5 }, { clip: 'rite.bowl', gain: 0.55, delay: 0.25 }];
  }
}

/**
 * The town bell, cast on D like the score: the drought bell is two strikes of the great bell, the all-clear a peal of
 * three smaller bells rung high to low. `index` is the strike's place in its sequence.
 */
export function bellCue(bright: boolean, index: number): Cue {
  return bright ? { clip: 'bell.peal', gain: 0.75, variant: index % 3 } : { clip: 'bell.town', gain: 0.85, variant: index % 2 };
}

/** Combat contacts. */
export function swingCue(heavy: boolean): Cue {
  return heavy ? { clip: 'swing.heavy', gain: 0.55, pitch: 0.06 } : { clip: 'swing', gain: 0.45, pitch: 0.06 };
}

export function hitCue(kind: 'flesh' | 'block' | 'perfect', armed: boolean): Cue {
  if (kind === 'perfect') return { clip: 'hit.parry', gain: 0.65, pitch: 0.03 };
  if (kind === 'block') return { clip: armed ? 'hit.block' : 'hit.punch', gain: 0.6, pitch: 0.05 };
  return { clip: armed ? 'hit.flesh' : 'hit.punch', gain: 0.65, pitch: 0.05 };
}

/** What a resident's work sounds like, by the gesture their animation shows (and a few personal trades). */
export interface WorkSound {
  clip: ClipId;
  /** Seconds between one stroke and the next. */
  every: [number, number];
  /** Strokes in a burst before a longer pause, and that pause. */
  burst?: [number, number];
  rest?: [number, number];
  gain: number;
}

const WORK: Record<WorkGesture, WorkSound | null> = {
  general: { clip: 'work.sweep', every: [0.9, 1.4], burst: [3, 6], rest: [5, 12], gain: 0.3 },
  mending: { clip: 'work.hammer', every: [0.55, 0.9], burst: [3, 7], rest: [3, 9], gain: 0.38 },
  measuring: { clip: 'item.page', every: [7, 14], gain: 0.22 },
  ledger: { clip: 'item.page', every: [8, 16], gain: 0.22 },
  writing: { clip: 'work.quill', every: [6, 11], gain: 0.28 },
  stonework: { clip: 'work.chisel', every: [0.45, 0.8], burst: [4, 9], rest: [2, 7], gain: 0.42 },
  baking: { clip: 'work.knead', every: [5, 9], gain: 0.32 },
  guard: null,
};

const TRADE: Partial<Record<string, WorkSound>> = {
  spring_steward: { clip: 'work.bucket', every: [16, 30], gain: 0.34 },
  mill_hand: { clip: 'work.sack', every: [10, 22], gain: 0.36 },
  maintenance_worker: { clip: 'work.saw', every: [7, 13], gain: 0.32 },
};

export function workSound(npc: string, gesture: WorkGesture): WorkSound | null {
  return TRADE[npc] ?? WORK[gesture];
}
