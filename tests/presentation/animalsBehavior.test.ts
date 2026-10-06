import { describe, expect, it } from 'vitest';
import { ANIMALS, animalInspectionQuery } from '../../src/presentation/animals/catalog';
import { AnimalMovement } from '../../src/presentation/animals/behavior';
import { animalCanStand, animalCanTravel } from '../../src/presentation/animals/navigation';
import { Colliders, buildStaticColliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { ARRIVAL_ROUTE } from '../../src/world/layout';
import { distToPolyline } from '../../src/world/terrain';

const flat = { heightAt: () => 0, walkable: () => true, carveAt: () => 0, seaDepth: () => 0 };
const wolf = ANIMALS.find((animal) => animal.id === 'wolf-a')!;
const isolated = { x: 140, z: -95 };

describe('animal habitats and navigation', () => {
  it('retains all nineteen distinct variant identities and explicitly reserves the unavailable source', () => {
    expect(ANIMALS).toHaveLength(19);
    expect(new Set(ANIMALS.map((animal) => animal.id)).size).toBe(19);
    expect(ANIMALS.filter((animal) => !animal.file).map((animal) => animal.id)).toEqual(['boar-c']);
    expect(ANIMALS.filter((animal) => animal.file)).toHaveLength(18);
    expect(ANIMALS.every((animal) => distToPolyline(animal.home.x, animal.home.z, ARRIVAL_ROUTE).d > 4)).toBe(true);
    expect(ANIMALS.find((animal) => animal.id === 'cat-b')!.walkSpeed).toBe(0);
  });

  it('rejects shallow water, steep terrain, road strips, and sweeps thin fences over the whole step', () => {
    const colliders = new Colliders();
    expect(animalCanStand(flat, colliders, isolated, wolf)).toBe(true);
    expect(animalCanStand({ ...flat, carveAt: () => .3 }, colliders, isolated, wolf)).toBe(false);
    expect(animalCanStand({ ...flat, seaDepth: () => .1 }, colliders, isolated, wolf)).toBe(false);
    expect(animalCanStand({ ...flat, walkable: () => false }, colliders, isolated, wolf)).toBe(false);
    expect(animalCanStand(flat, colliders, { x: -230, z: 25 }, wolf)).toBe(false);
    colliders.box('thin fence', 141, -95, .025, 3);
    expect(animalCanStand(flat, colliders, { x: 142, z: -95 }, wolf)).toBe(true);
    expect(animalCanTravel(flat, colliders, isolated, { x: 142, z: -95 }, wolf)).toBe(false);
  });

  it('wanders deterministically within a bounded habitat and flees a nearby visible player', () => {
    const colliders = new Colliders();
    const one = new AnimalMovement(wolf, isolated, flat, colliders);
    const two = new AnimalMovement(wolf, isolated, flat, colliders);
    for (let tick = 0; tick < 1200; tick++) {
      one.update(.05, { x: 180, z: -140 }, false);
      two.update(.05, { x: 180, z: -140 }, false);
      expect(Math.hypot(one.x - isolated.x, one.z - isolated.z)).toBeLessThanOrEqual(wolf.wanderRadius + .001);
    }
    expect({ x: one.x, z: one.z, behavior: one.behavior }).toEqual({ x: two.x, z: two.z, behavior: two.behavior });
    const frightened = new AnimalMovement(wolf, isolated, flat, colliders);
    const player = { x: isolated.x - 2, z: isolated.z };
    for (let tick = 0; tick < 70; tick++) frightened.update(.05, player, false);
    expect(frightened.x).toBeGreaterThan(isolated.x + 2);
    expect(Math.hypot(frightened.x - isolated.x, frightened.z - isolated.z)).toBeLessThanOrEqual(wolf.wanderRadius + 6);
  });

  it('keeps actual-world roaming animals on dry clear ground during repeated local decisions', () => {
    const terrain = new Terrain(), colliders = buildStaticColliders(terrain);
    const definition = ANIMALS.find((animal) => animal.id === 'deer-a')!;
    expect(animalCanStand(terrain, colliders, definition.home, definition)).toBe(true);
    const deer = new AnimalMovement(definition, definition.home, terrain, colliders);
    for (let tick = 0; tick < 1800; tick++) {
      deer.update(.05, { x: -250, z: 30 }, false);
      expect(animalCanStand(terrain, colliders, deer, definition)).toBe(true);
    }
  });

  it('keeps review controls query-only and never substitutes unknown or reserved variants', () => {
    expect(animalInspectionQuery(new URLSearchParams('animal=not-supplied'))).toBe(null);
    expect(animalInspectionQuery(new URLSearchParams('animal=boar-c'))).toEqual({ kind: 'individual', id: 'boar-c', clip: null });
    expect(animalInspectionQuery(new URLSearchParams('lineup=animals&animalPage=NaN'))).toEqual({ kind: 'lineup', page: 0, clip: null });
  });
});
