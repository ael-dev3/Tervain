import { HUNTER_SUPPLY, WORLD } from '../world/layout';
import type { WorldState } from './types';

/** Stable individual identities, shared by durable rules and the wildlife renderer. */
export const ANIMAL_IDS = [
  'bear-a', 'lion', 'bear-b', 'tiger', 'wolf-a', 'wolf-b', 'wolf-c',
  'cat-a', 'dog-a', 'dog-b', 'cat-b', 'boar-a', 'boar-b', 'stag',
  'deer-mount', 'cat-c', 'boar-c', 'deer-a', 'deer-b',
] as const;
export type AnimalId = typeof ANIMAL_IDS[number];
export type AnimalSpecies = 'bear' | 'lion' | 'tiger' | 'wolf' | 'cat' | 'dog' | 'boar' | 'stag' | 'deer';
export const ANIMAL_SPECIES: Record<AnimalId, AnimalSpecies> = {
  'bear-a': 'bear', lion: 'lion', 'bear-b': 'bear', tiger: 'tiger',
  'wolf-a': 'wolf', 'wolf-b': 'wolf', 'wolf-c': 'wolf',
  'cat-a': 'cat', 'dog-a': 'dog', 'dog-b': 'dog', 'cat-b': 'cat',
  'boar-a': 'boar', 'boar-b': 'boar', stag: 'stag', 'deer-mount': 'deer',
  'cat-c': 'cat', 'boar-c': 'boar', 'deer-a': 'deer', 'deer-b': 'deer',
};

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
export const HUNTER_SUPPLY_POSITION = HUNTER_SUPPLY;

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function isAnimalId(value: unknown): value is AnimalId {
  return typeof value === 'string' && (ANIMAL_IDS as readonly string[]).includes(value);
}
export function validAnimalPosition(value: unknown): value is AnimalPosition {
  return object(value) && ['x', 'y', 'z'].every((key) => Object.hasOwn(value, key))
    && finite(value.x) && finite(value.y) && finite(value.z)
    && value.x >= WORLD.minX && value.x <= WORLD.maxX
    && value.z >= WORLD.minZ && value.z <= WORLD.maxZ && value.y >= -50 && value.y <= 120;
}
export function validAnimalHit(value: unknown): value is AnimalHit {
  return object(value) && ['id', 'zone', 'position', 'yaw'].every((key) => Object.hasOwn(value, key))
    && isAnimalId(value.id) && (value.zone === 'head' || value.zone === 'body')
    && validAnimalPosition(value.position) && finite(value.yaw) && Math.abs(value.yaw) <= 1e6;
}
export function normalizeAnimalYaw(yaw: number): number {
  return ((yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

/** Missing older-save records mean living wildlife; malformed entries cannot enter the renderer. */
export function normalizeHunting(raw: unknown): HuntingState {
  if (!object(raw)) return {};
  const hunting: HuntingState = {};
  for (const id of ANIMAL_IDS) {
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
  return { animal_hide: 1, raw_meat: MEAT_YIELD[ANIMAL_SPECIES[id]] };
}

/** Hunting guides the early woodland arrival while the water investigation retains its own objectives. */
export function huntingHint(s: WorldState): string | null {
  if (s.quest.phase !== 'unseen') return null;
  const hasKit = (['hunting_bow', 'skinning_knife', 'arrow'] as const).some((id) => (s.inventory[id] ?? 0) > 0);
  const hasHunt = ANIMAL_IDS.some((id) => s.hunting[id] !== undefined);
  if (!s.discovered.deepwood && !hasKit && !hasHunt) return null;
  if (ANIMAL_IDS.every((id) => s.hunting[id]?.status === 'skinned')) return null;
  if ((s.inventory.hunting_bow ?? 0) < 1 || (s.inventory.skinning_knife ?? 0) < 1) return 'hunting.objective.kit';
  if (ANIMAL_IDS.some((id) => s.hunting[id]?.status === 'dead')) return 'hunting.objective.skin';
  if ((s.inventory.arrow ?? 0) < 1) {
    return s.locationChanges['pickup:hunter_arrows'] === 'taken' ? 'hunting.objective.restock' : 'hunting.objective.kit';
  }
  if (s.equippedWeapon !== 'hunting_bow') return 'hunting.objective.equip';
  return 'hunting.objective.hunt';
}
