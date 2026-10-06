import type { AnimalSoundSpecies } from '../animalAudio';
import type { V2 } from '../../world/layout';
import type { AnimalId } from '../../game/hunting';

export interface AnimalDefinition {
  id: AnimalId;
  species: AnimalSoundSpecies;
  /** Files delivered by the owner's asset pipeline; never substitute another variant. */
  file: string | null;
  home: V2;
  yaw: number;
  wanderRadius: number;
  radius: number;
  length: number;
  width: number;
  walkSpeed: number;
  runSpeed: number;
  alertDistance: number;
  domestic: boolean;
  grazes: boolean;
}

const traits = {
  bear: { radius: .72, length: 2.25, width: .9, walkSpeed: .8, runSpeed: 3.4, alertDistance: 10, domestic: false, grazes: false },
  lion: { radius: .65, length: 2.5, width: .75, walkSpeed: 1, runSpeed: 4, alertDistance: 12, domestic: false, grazes: false },
  tiger: { radius: .65, length: 2.6, width: .8, walkSpeed: .95, runSpeed: 4, alertDistance: 12, domestic: false, grazes: false },
  wolf: { radius: .42, length: 1.4, width: .45, walkSpeed: 1, runSpeed: 4, alertDistance: 11, domestic: false, grazes: false },
  cat: { radius: .22, length: .62, width: .22, walkSpeed: .42, runSpeed: 2.3, alertDistance: 2.5, domestic: true, grazes: false },
  dog: { radius: .34, length: 1, width: .36, walkSpeed: .7, runSpeed: 3, alertDistance: 2.5, domestic: true, grazes: false },
  boar: { radius: .5, length: 1.55, width: .62, walkSpeed: .65, runSpeed: 3.2, alertDistance: 8, domestic: false, grazes: true },
  stag: { radius: .5, length: 1.85, width: .55, walkSpeed: .9, runSpeed: 4.5, alertDistance: 16, domestic: false, grazes: true },
  deer: { radius: .42, length: 1.65, width: .45, walkSpeed: .8, runSpeed: 4.2, alertDistance: 14, domestic: false, grazes: true },
} satisfies Record<AnimalSoundSpecies, Omit<AnimalDefinition, 'id' | 'species' | 'file' | 'home' | 'yaw' | 'wanderRadius'>>;

const animal = (id: AnimalId, species: AnimalSoundSpecies, x: number, z: number, yaw: number, wanderRadius: number, available = true): AnimalDefinition => ({
  id, species, file: available ? `models/animals/${id}.glb` : null, home: { x, z }, yaw, wanderRadius, ...traits[species],
});

/** One authored individual per variant. Woodland game flanks the hunter's trail; animals stay off its walking strip. */
export const ANIMALS: readonly AnimalDefinition[] = [
  animal('bear-a', 'bear', -188, -66, 1.1, 12),
  animal('lion', 'lion', -112, 84, -.9, 9),
  animal('bear-b', 'bear', -153, 85, -.6, 11),
  animal('tiger', 'tiger', -215, -78, .5, 10),
  animal('wolf-a', 'wolf', -198, -31, 1.3, 11),
  animal('wolf-b', 'wolf', -176, -81, .2, 12),
  animal('wolf-c', 'wolf', -147, -58, -.7, 10),
  animal('cat-a', 'cat', -95, 32, .8, 4),
  animal('dog-a', 'dog', -87, 38, -.9, 5),
  animal('dog-b', 'dog', 6, 29, 1.7, 6),
  // This cat is seated; preserve its native posture while it watches and calls.
  { ...animal('cat-b', 'cat', -17, 28, .4, 0), walkSpeed: 0, runSpeed: 0, alertDistance: 0 },
  animal('boar-a', 'boar', -219, 49, 2, 10),
  animal('boar-b', 'boar', -129, 48, -1, 9),
  animal('stag', 'stag', -158, -17, .9, 10),
  animal('deer-mount', 'deer', -174, 5, 1.6, 8),
  animal('cat-c', 'cat', 20, 39, -2.1, 4),
  // Reserved variant awaiting its source asset.
  animal('boar-c', 'boar', -205, 75, .6, 10, false),
  animal('deer-a', 'deer', -222, 3, 2.2, 9),
  animal('deer-b', 'deer', -202, 35, -.4, 8),
];

export type AnimalInspection = { kind: 'individual'; id: string; clip: string | null } | { kind: 'lineup'; page: number; clip: string | null };

/** Query-only review controls; unknown IDs never select a replacement. */
export function animalInspectionQuery(query: URLSearchParams): AnimalInspection | null {
  const id = query.get('animal');
  const clip = query.get('animalClip');
  if (id && ANIMALS.some((definition) => definition.id === id)) return { kind: 'individual', id, clip };
  if (query.get('lineup') === 'animals') {
    const page = Number(query.get('animalPage') ?? 0);
    return { kind: 'lineup', page: Number.isFinite(page) ? Math.max(0, Math.min(3, Math.floor(page))) : 0, clip };
  }
  return null;
}
