import { HUNTER_SUPPLY, WORLD } from '../world/layout';
import type { WorldState } from './types';

/** Stable individual identities, shared by durable rules and the wildlife renderer. */
export const ANIMAL_IDS = [
  'bear-a', 'lion', 'bear-b', 'tiger', 'wolf-a', 'wolf-b', 'wolf-c',
  'cat-a', 'dog-a', 'dog-b', 'cat-b', 'boar-a', 'boar-b', 'stag',
  'deer-mount', 'cat-c', 'boar-c', 'deer-a', 'deer-b',
] as const;
export type AnimalId = typeof ANIMAL_IDS[number];
/** Save identities stay stable while the renderer retains all nineteen supplied models. */
export const ANIMAL_MODEL_IDS = {
  'bear-a': '1005170943', lion: '1005232726', 'bear-b': '1005232657', tiger: '1005232739',
  'wolf-a': '1005232644', 'wolf-b': '1005232637', 'wolf-c': '1005232631',
  'cat-a': '1005232619', 'dog-a': '1005232529', 'dog-b': '1005232511', 'cat-b': '1005232608',
  'boar-a': '1005232442', 'boar-b': '1005232450', stag: '1005232424', 'deer-mount': '1005232412',
  'cat-c': '1005232556', 'boar-c': '1005174818', 'deer-a': '1005232351', 'deer-b': '1005232341',
} as const satisfies Record<AnimalId, string>;
export type AnimalSpecies = 'bear' | 'lion' | 'tiger' | 'wolf' | 'cat' | 'dog' | 'boar' | 'stag' | 'deer';
export const ANIMAL_SPECIES: Record<AnimalId, AnimalSpecies> = {
  'bear-a': 'bear', lion: 'lion', 'bear-b': 'bear', tiger: 'tiger',
  'wolf-a': 'wolf', 'wolf-b': 'wolf', 'wolf-c': 'wolf',
  'cat-a': 'cat', 'dog-a': 'dog', 'dog-b': 'dog', 'cat-b': 'cat',
  'boar-a': 'boar', 'boar-b': 'boar', stag: 'stag', 'deer-mount': 'deer',
  'cat-c': 'cat', 'boar-c': 'boar', 'deer-a': 'deer', 'deer-b': 'deer',
};
/** Pets and the saddled caravan companion are never targets, objectives or harvests.
 * Individual protection is explicit: the other three deer remain wild game. */
export const PROTECTED_ANIMAL_IDS = ['cat-a', 'dog-a', 'dog-b', 'cat-b', 'deer-mount', 'cat-c'] as const satisfies readonly AnimalId[];
export const HUNTABLE_ANIMAL_IDS: readonly AnimalId[] = ANIMAL_IDS.filter(id =>
  !(PROTECTED_ANIMAL_IDS as readonly AnimalId[]).includes(id));

export interface AnimalPosition { x: number; y: number; z: number }
export interface AnimalHit {
  id: AnimalId;
  zone: 'head' | 'body';
  /** The animal root pose at impact, rather than the arrow surface contact point. */
  position: AnimalPosition;
  yaw: number;
}
export interface AnimalHuntRecord {
  status: 'injured' | 'dead' | 'skinned';
  bodyHits: 0 | 1 | 2;
  headshot: boolean;
  /** Last impact pose for injuries, fixed corpse pose after death. */
  position: AnimalPosition;
  yaw: number;
  atClock: number;
}
export type HuntingState = Partial<Record<AnimalId, AnimalHuntRecord>>;

export const HUNTING_ARROW_RANGE = 65;
export const SKINNING_REACH = 2.8;
export const SKINNING_SECONDS = 3.2;
export const ARROW_RESTOCK_AMOUNT = 6;
export const ARROW_QUIVER_CAPACITY = 40;
export const HUNTER_MEAT_PRICE = 2;
export const HUNTER_SUPPLY_POSITION = HUNTER_SUPPLY;

/**
 * The range refills (A70). A taken animal's kind comes back to its range after these in-game hours, an unskinned carcass
 * is gone after CARCASS_HOURS, and a wound heals after WOUND_HOURS. Nothing returns within WILDLIFE_RETURN_DISTANCE of
 * the hunter, so no animal appears before his eyes; pets and the mount never die, so never return.
 */
export const WILDLIFE_RETURN_HOURS: Record<AnimalSpecies, number> = {
  deer: 20, stag: 30, boar: 26, wolf: 36, bear: 72, lion: 72, tiger: 72, cat: Infinity, dog: Infinity,
};
export const CARCASS_HOURS = 30, WOUND_HOURS = 6, WILDLIFE_RETURN_DISTANCE = 70;

/** The hunter's standing grows with the game he takes (A70): Rowan pays more, trades more arrows, and skinning quickens. */
export const HUNTER_RANKS = [
  { taken: 0, key: 'novice', skinning: 1, meat: HUNTER_MEAT_PRICE, arrows: ARROW_RESTOCK_AMOUNT },
  { taken: 3, key: 'tracker', skinning: 0.85, meat: HUNTER_MEAT_PRICE + 1, arrows: ARROW_RESTOCK_AMOUNT + 2 },
  { taken: 8, key: 'hunter', skinning: 0.72, meat: HUNTER_MEAT_PRICE + 2, arrows: ARROW_RESTOCK_AMOUNT + 3 },
  { taken: 15, key: 'master', skinning: 0.6, meat: HUNTER_MEAT_PRICE + 3, arrows: ARROW_RESTOCK_AMOUNT + 4 },
] as const;
export type HunterRank = typeof HUNTER_RANKS[number];

/** Animals taken over the whole game, by kind; kept when their kind returns. */
export interface HuntTally { taken: number; species: Partial<Record<AnimalSpecies, number>> }

export function hunterRank(tally: HuntTally | undefined): HunterRank {
  let rank: HunterRank = HUNTER_RANKS[0];
  for (const r of HUNTER_RANKS) if ((tally?.taken ?? 0) >= r.taken) rank = r;
  return rank;
}

export function skinningSeconds(tally: HuntTally | undefined): number {
  return SKINNING_SECONDS * hunterRank(tally).skinning;
}

export function normalizeHuntTally(raw: unknown): HuntTally {
  const tally: HuntTally = { taken: 0, species: {} };
  if (!object(raw)) return tally;
  const count = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e6 ? v : 0);
  if (object(raw.species)) for (const species of Object.keys(MEAT_YIELD) as AnimalSpecies[]) {
    const n = count(raw.species[species]);
    if (n) tally.species[species] = n;
  }
  tally.taken = Math.max(count(raw.taken), Object.values(tally.species).reduce((a, b) => a + (b ?? 0), 0));
  return tally;
}

/**
 * Let the range refill: clear records whose time has come, away from the hunter (A70). Returns the ids that came back;
 * the wildlife renderer restores an animal whose record is gone to its home.
 */
export function returnWildlife(s: WorldState): AnimalId[] {
  const back: AnimalId[] = [];
  for (const id of HUNTABLE_ANIMAL_IDS) {
    const record = s.hunting[id];
    if (!record) continue;
    const hours = (s.clock - record.atClock) / 60;
    const due = record.status === 'injured' ? WOUND_HOURS
      : record.status === 'dead' ? Math.max(CARCASS_HOURS, WILDLIFE_RETURN_HOURS[ANIMAL_SPECIES[id]])
      : WILDLIFE_RETURN_HOURS[ANIMAL_SPECIES[id]];
    if (!(hours >= due)) continue;
    if (Math.hypot(s.player.x - record.position.x, s.player.z - record.position.z) < WILDLIFE_RETURN_DISTANCE) continue;
    delete s.hunting[id];
    back.push(id);
  }
  return back;
}

/** Rowan's trade is a working service, available while he is awake at camp. */
export function hunterTradingOpen(s: WorldState): boolean {
  const hour = ((s.clock % 1440) + 1440) % 1440 / 60;
  return hour >= 6 && hour < 22 && s.npcs.trail_hunter.available;
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function isAnimalId(value: unknown): value is AnimalId {
  return typeof value === 'string' && (ANIMAL_IDS as readonly string[]).includes(value);
}
export function isHuntableAnimalId(value: unknown): value is AnimalId {
  return isAnimalId(value) && HUNTABLE_ANIMAL_IDS.includes(value);
}
export function validAnimalPosition(value: unknown): value is AnimalPosition {
  return object(value) && ['x', 'y', 'z'].every((key) => Object.hasOwn(value, key))
    && finite(value.x) && finite(value.y) && finite(value.z)
    && value.x >= WORLD.minX && value.x <= WORLD.maxX
    && value.z >= WORLD.minZ && value.z <= WORLD.maxZ && value.y >= -50 && value.y <= 120;
}
export function validAnimalHit(value: unknown): value is AnimalHit {
  return object(value) && ['id', 'zone', 'position', 'yaw'].every((key) => Object.hasOwn(value, key))
    && isHuntableAnimalId(value.id) && (value.zone === 'head' || value.zone === 'body')
    && validAnimalPosition(value.position) && finite(value.yaw) && Math.abs(value.yaw) <= 1e6;
}
export function normalizeAnimalYaw(yaw: number): number {
  return ((yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

/** Missing older-save records mean living wildlife. Records for protected companions are
 * discarded, reviving mounts accidentally wounded or harvested in the original 0.0.13 build. */
export function normalizeHunting(raw: unknown): HuntingState {
  if (!object(raw)) return {};
  const hunting: HuntingState = {};
  for (const id of HUNTABLE_ANIMAL_IDS) {
    if (!Object.hasOwn(raw, id)) continue;
    const value = raw[id];
    if (!object(value) || !validAnimalPosition(value.position) || !finite(value.yaw) || Math.abs(value.yaw) > 1e6
      || !finite(value.atClock) || value.atClock < 0 || value.atClock > 1e9
      || typeof value.headshot !== 'boolean' || !Number.isInteger(value.bodyHits)
      || (value.bodyHits !== 0 && value.bodyHits !== 1 && value.bodyHits !== 2)) continue;
    if (value.status !== 'injured' && value.status !== 'dead' && value.status !== 'skinned') continue;
    if (value.status === 'injured' ? value.bodyHits !== 1 || value.headshot : !value.headshot && value.bodyHits !== 2) continue;
    hunting[id] = {
      status: value.status, bodyHits: value.bodyHits, headshot: value.headshot,
      position: { x: value.position.x, y: value.position.y, z: value.position.z },
      yaw: normalizeAnimalYaw(value.yaw), atClock: value.atClock,
    };
  }
  return hunting;
}

const MEAT_YIELD: Record<AnimalSpecies, number> = { bear: 4, lion: 3, tiger: 3, wolf: 2, cat: 1, dog: 2, boar: 4, stag: 4, deer: 3 };
export function animalLoot(id: AnimalId): { animal_hide: number; raw_meat: number } {
  if (!isHuntableAnimalId(id)) return { animal_hide: 0, raw_meat: 0 };
  return { animal_hide: 1, raw_meat: MEAT_YIELD[ANIMAL_SPECIES[id]] };
}

/** Hunting guides the early woodland arrival while the water investigation retains its own objectives. */
export function huntingHint(s: WorldState): string | null {
  if (s.quest.phase !== 'unseen') return null;
  const hasKit = (['hunting_bow', 'skinning_knife', 'arrow'] as const).some((id) => (s.inventory[id] ?? 0) > 0);
  const hasHunt = HUNTABLE_ANIMAL_IDS.some((id) => s.hunting[id] !== undefined);
  if (!s.discovered.deepwood && !hasKit && !hasHunt) return null;
  if (HUNTABLE_ANIMAL_IDS.every((id) => s.hunting[id]?.status === 'skinned')) return null;
  if ((s.inventory.hunting_bow ?? 0) < 1 || (s.inventory.skinning_knife ?? 0) < 1) return 'hunting.objective.kit';
  if (HUNTABLE_ANIMAL_IDS.some((id) => s.hunting[id]?.status === 'dead')) return 'hunting.objective.skin';
  if ((s.inventory.arrow ?? 0) < 1) {
    return s.locationChanges['pickup:hunter_arrows'] === 'taken' ? 'hunting.objective.restock' : 'hunting.objective.kit';
  }
  if (s.equippedWeapon !== 'hunting_bow') return 'hunting.objective.equip';
  return 'hunting.objective.hunt';
}
