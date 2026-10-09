import type { V2 } from '../../world/layout';
import { CARAVAN_ANIMAL_REST } from '../../world/caravanAnimal';

export const ANIMAL_TRIANGLE_LIMIT = 50_000;
export type AnimalSpecies = 'tiger' | 'lion' | 'bear' | 'wolf' | 'cat' | 'dog' | 'boar' | 'deer';
export type AnimalClip = 'Idle' | 'Walk' | 'Run' | 'Alert' | 'Call' | 'Graze' | 'Groom' | 'Sleep';
export type AnimalHabitat = 'settlement' | 'caravan-rest' | 'woodland' | 'deepwood' | 'rocky-woodland' | 'warm-woodland';
export interface AnimalDefinition {
  readonly id: string;
  readonly species: AnimalSpecies;
  readonly file: string;
  readonly habitat: AnimalHabitat;
  readonly home: V2;
  readonly roam: number;
  readonly seated?: boolean;
  /** Domesticated animals watch nearby travellers instead of fleeing from them. */
  readonly tame?: boolean;
  readonly homeYaw?: number;
}

const entry = (species: AnimalSpecies, id: string, habitat: AnimalHabitat, x: number, z: number, roam: number, seated = false): AnimalDefinition => ({
  id, species, file: `${species}-${id}.glb`, habitat, home: { x, z }, roam, ...(seated ? { seated: true } : {}),
});

/** All supplied animals have a persistent home, including on the lowest presentation preset.
 * Homes flank travelled routes; the eastern ochre woods are the warmer habitat for the two big cats. */
export const ANIMALS: readonly AnimalDefinition[] = [
  entry('tiger', '1005232739', 'warm-woodland', 107, 22, 19),
  entry('lion', '1005232726', 'warm-woodland', 112, 51, 19),
  entry('bear', '1005170943', 'rocky-woodland', -180, -57, 17),
  entry('bear', '1005232657', 'rocky-woodland', -149, -62, 17),
  entry('wolf', '1005232644', 'deepwood', -175, 5, 16),
  entry('wolf', '1005232637', 'deepwood', -166, 37, 16),
  entry('wolf', '1005232631', 'deepwood', -190, 25, 16),
  entry('cat', '1005232619', 'settlement', -83, 37, 7),
  entry('cat', '1005232608', 'settlement', -98, 54, 0, true),
  entry('cat', '1005232556', 'settlement', -10, 27, 7),
  entry('dog', '1005232529', 'settlement', -87, 20, 9),
  entry('dog', '1005232511', 'settlement', 0, 15, 9),
  entry('boar', '1005232450', 'woodland', -205, -7, 13),
  entry('boar', '1005232442', 'woodland', -188, -19, 13),
  entry('boar', '1005174818', 'woodland', -157, 55, 14),
  entry('deer', '1005232424', 'woodland', -218, 44, 12),
  { ...entry('deer', '1005232412', 'caravan-rest', CARAVAN_ANIMAL_REST.x, CARAVAN_ANIMAL_REST.z, 0), tame: true, homeYaw: CARAVAN_ANIMAL_REST.yaw },
  entry('deer', '1005232351', 'woodland', -146, 28, 16),
  entry('deer', '1005232341', 'woodland', -119, 28, 16),
];

/** In-place clips are driven by real resolved travel, so an animal meeting a trunk cannot keep running in place. */
export const ANIMAL_SPEEDS: Record<AnimalSpecies, { walk: number; run: number; notice: number; flee: number }> = {
  tiger: { walk: 1.1, run: 3.8, notice: 13, flee: 6 },
  lion: { walk: 1.05, run: 3.4, notice: 13, flee: 6 },
  bear: { walk: 0.8, run: 2.2, notice: 14, flee: 7 },
  wolf: { walk: 1.2, run: 3.5, notice: 14, flee: 8 },
  cat: { walk: 0.55, run: 1.8, notice: 4.5, flee: 2 },
  dog: { walk: 1, run: 2.6, notice: 5, flee: 2.8 },
  boar: { walk: 0.75, run: 2, notice: 12, flee: 6 },
  deer: { walk: 1.15, run: 3.5, notice: 16, flee: 10 },
};

/**
 * How each kind meets the hunter (A70). Predators hold their ground, watching, until he comes within `holdUntil` of their
 * flee distance; herd and pack animals carry an alarm to their own kind within `herd` metres, so a shot scatters a group.
 */
export const ANIMAL_TEMPERAMENT: Record<AnimalSpecies, { holdUntil: number; herd: number }> = {
  tiger: { holdUntil: 0.55, herd: 0 }, lion: { holdUntil: 0.55, herd: 0 }, bear: { holdUntil: 0.6, herd: 0 },
  wolf: { holdUntil: 0.65, herd: 35 }, cat: { holdUntil: 1, herd: 0 }, dog: { holdUntil: 1, herd: 0 },
  boar: { holdUntil: 1, herd: 18 }, deer: { holdUntil: 1, herd: 24 },
};

export function requiredAnimalClips(definition: AnimalDefinition): readonly AnimalClip[] {
  if (definition.seated) return ['Idle', 'Alert', 'Call', 'Groom', 'Sleep'];
  return definition.species === 'deer' || definition.species === 'boar'
    ? ['Idle', 'Walk', 'Run', 'Alert', 'Call', 'Graze'] : ['Idle', 'Walk', 'Run', 'Alert', 'Call'];
}
