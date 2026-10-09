import { APPLY_DELAY_MIN } from './constants';
import { SPAWN } from '../world/layout';
import {
  CONTENT_REVISION,
  NPC_IDS,
  QUICK_SLOT_COUNT,
  SAVE_FORMAT_VERSION,
  type Cond,
  type FactValue,
  type ItemId,
  type NpcId,
  type NpcState,
  type QuestPhase,
  PHASE_ORDER,
  type WorldState,
} from './types';

/** Arrival is the first morning: 07:30 of day 0. */
export const START_CLOCK = 7 * 60 + 30;
export const MINUTES_PER_DAY = 24 * 60;

export function createInitialState(slotId = 'slot-1'): WorldState {
  const npcs = {} as Record<NpcId, NpcState>;
  for (const id of NPC_IDS) npcs[id] = { available: true, cause: null, trust: 0, met: false };
  return {
    saveFormatVersion: SAVE_FORMAT_VERSION,
    contentRevision: CONTENT_REVISION,
    slotId,
    clock: START_CLOCK,
    playSeconds: 0,
    quest: {
      phase: 'unseen',
      gate: 'damaged',
      allocation: null,
      repairRequired: false,
      entry: null,
      witnesses: [],
      maintainer: null,
      committedAtClock: null,
      settledAtClock: null,
      reactions: [],
    },
    evidence: {},
    // The opening remembers no identity or passage; legacy saves retain their own facts.
    facts: { arrival_amnesia: true },
    grants: {},
    inventory: { coin: 6 },
    quickSlots: Array.from({ length: QUICK_SLOT_COUNT }, () => null),
    physicalObjects: [],
    equippedWeapon: null,
    mapMarker: null,
    skills: [],
    npcs,
    offenses: { pending: [], known: [] },
    defeated: {},
    hunting: {},
    huntTally: { taken: 0, species: {} },
    discovered: {},
    locationChanges: {},
    // The renderer refines height; authored position and facing share the world landing source.
    player: { ...SPAWN, y: 0, health: 100, maxHealth: 100 },
  };
}

export function cloneState(s: WorldState): WorldState {
  return structuredClone(s);
}

export function phaseIndex(p: QuestPhase): number {
  return PHASE_ORDER.indexOf(p);
}

export function phaseAtLeast(s: WorldState, p: QuestPhase): boolean {
  return phaseIndex(s.quest.phase) >= phaseIndex(p);
}

export function getFact(s: WorldState, key: string): FactValue | undefined {
  return s.facts[key];
}

export function hasFact(s: WorldState, key: string): boolean {
  const v = s.facts[key];
  return v !== undefined && v !== false && v !== 0 && v !== '';
}

export function itemCount(s: WorldState, id: ItemId): number {
  return s.inventory[id] ?? 0;
}

export function clockDay(clock: number): number {
  return Math.floor(clock / MINUTES_PER_DAY);
}

/** Hour of day as a float, 0..24. */
export function hourOfDay(clock: number): number {
  return ((clock % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY / 60;
}

export function isDaytime(clock: number): boolean {
  const h = hourOfDay(clock);
  return h >= 6 && h < 19;
}

export function formatClock(clock: number): string {
  // Whole minutes, so an exact minute is never shown as the one before it (07:31 was 07:30 in floating point).
  const t = ((Math.floor(clock) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ---------- Condition evaluation (pure checks over known state) ---------- */

export function evalCond(s: WorldState, c: Cond): boolean {
  switch (c.t) {
    case 'fact': {
      if (c.is === undefined) return hasFact(s, c.key);
      return s.facts[c.key] === c.is;
    }
    case 'evidence':
      return s.evidence[c.id] !== undefined;
    case 'phase': {
      const cur = phaseIndex(s.quest.phase);
      if (c.is !== undefined) return s.quest.phase === c.is;
      if (c.atLeast !== undefined && cur < phaseIndex(c.atLeast)) return false;
      if (c.below !== undefined && cur >= phaseIndex(c.below)) return false;
      return true;
    }
    case 'gate':
      return s.quest.gate === c.is;
    case 'item':
      return itemCount(s, c.id) >= (c.min ?? 1);
    case 'trust':
      return s.npcs[c.npc].trust >= c.min;
    case 'alloc':
      return s.quest.allocation === c.is;
    case 'avail':
      return s.npcs[c.npc].available === (c.is ?? true);
    case 'skill':
      return s.skills.includes(c.id);
    case 'met':
      return s.npcs[c.npc].met;
    case 'consent':
      return hasFact(s, `consent_${c.party}`);
    case 'defeated':
      return s.defeated[c.id] === true;
    case 'anyDefeated':
      return Object.keys(s.defeated).length > 0;
    case 'applied':
      return s.quest.committedAtClock !== null && s.clock >= s.quest.committedAtClock + APPLY_DELAY_MIN;
    case 'grant':
      return s.grants[c.id] === true;
    case 'not':
      return !evalCond(s, c.c);
    case 'all':
      return c.c.every((x) => evalCond(s, x));
    case 'any':
      return c.c.some((x) => evalCond(s, x));
  }
}

export function evalAll(s: WorldState, conds: Cond[] | undefined): boolean {
  if (!conds || conds.length === 0) return true;
  return conds.every((c) => evalCond(s, c));
}
