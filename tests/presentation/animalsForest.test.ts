import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import { AnimalMovement } from '../../src/presentation/animals/behavior';
import { animalCanStand, findAnimalHome } from '../../src/presentation/animals/navigation';
import { createMeshyForest, type MeshyForest } from '../../src/presentation/meshyTrees';
import { createPineForest, type PineForest } from '../../src/presentation/solitaryPine';
import { createFloraPopulation, registerFloraColliders, selectFloraPopulation, type FloraTree } from '../../src/presentation/floraPopulation';
import { groundedTreeY, treeWoodCollisionRadius } from '../../src/presentation/treeGrounding';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { buildSourceRockPiles } from '../../src/presentation/sourceRockPile';
import { Exclusions } from '../../src/presentation/vegetation';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { defaultSettings } from '../../src/platform/settings';
import { Terrain } from '../../src/world/terrain';
import { buildStaticColliders, Colliders } from '../../src/world/colliders';
import { NavGrid } from '../../src/world/nav';
import { HUNTER_SUPPLY, SPAWN } from '../../src/world/layout';
import { pineTemplates } from './pineFixture';
import { meshyTreeTemplates } from './meshyTreeFixture';
import { rockPileTemplate } from './rockPileFixture';

let pine: PineForest, forest: MeshyForest, terrain: Terrain, colliders: Colliders, trees: FloraTree[];
let piles: ReturnType<typeof buildSourceRockPiles>;
beforeAll(async () => {
  const [custom, supplied, rocks] = await Promise.all([pineTemplates(), meshyTreeTemplates(), rockPileTemplate()]);
  pine = createPineForest(custom); forest = createMeshyForest(supplied); terrain = new Terrain(); colliders = buildStaticColliders(terrain);
  const exclusions = new Exclusions(terrain);
  const variantFor = (tree: Readonly<FloraTree>) => tree.sp === 'pine' ? pine.variant('pine', tree.v + 1) : forest.variant(tree.sp, tree.v, tree.assetId);
  trees = createFloraPopulation(terrain, exclusions, (tree, fallback) => tree.sp === 'pine'
    ? pine.collisionRadius('pine', tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
    : fallback > 0 ? treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : fallback,
    tree => groundedTreeY(terrain, tree, variantFor(tree)), undefined, tree => variantFor(tree).crownRadius * tree.s);
  registerFloraColliders(trees, colliders);
  registerScatterColliders(createScatterPopulation(terrain, exclusions, trees), colliders);
  piles = buildSourceRockPiles({ terrain, colliders, quality: 'low', excl: exclusions, library: AssetLibrary.empty(), settings: defaultSettings(),
    sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, rocks);
}, 30_000);
afterAll(() => { piles?.dispose?.(); forest?.dispose(); pine?.dispose(); });

describe('hunting habitats within the supplied source forest', () => {
  it('fits all supplied individuals against canonical tree/rock contacts shared by every graphics preset', () => {
    expect(trees.length).toBeGreaterThan(200); expect(colliders.rockMeshes.length).toBeGreaterThan(0);
    for (const quality of ['low', 'medium', 'high'] as const) {
      const selected = new Colliders(); registerFloraColliders(selectFloraPopulation(trees, quality).obstacles, selected);
      const canonical = new Colliders(); registerFloraColliders(trees, canonical);
      expect(selected.all).toEqual(canonical.all);
    }
    const nav = new NavGrid(terrain, colliders, .55);
    expect(nav.findPath(SPAWN, { x: HUNTER_SUPPLY.x - 2, z: HUNTER_SUPPLY.z })).not.toBeNull();
    for (const definition of ANIMALS.filter((animal) => animal.file)) {
      const home = findAnimalHome(terrain, colliders, definition);
      expect(home, `${definition.id} has a clear source-forest habitat`).not.toBeNull();
      expect(animalCanStand(terrain, colliders, home!, definition), `${definition.id} dry, clear, outside roads`).toBe(true);
      expect(nav.findPath(SPAWN, home!), `${definition.id} can be approached from the arrival route`).not.toBeNull();
    }
  });

  it('keeps actual roaming steps clear of the newest imported wood and accepted scatter obstacles', () => {
    for (const definition of ANIMALS.filter((animal) => animal.file && !animal.domestic)) {
      const home = findAnimalHome(terrain, colliders, definition)!;
      const movement = new AnimalMovement(definition, home, terrain, colliders);
      for (let frame = 0; frame < 900; frame++) {
        movement.update(.05, SPAWN, false);
        expect(animalCanStand(terrain, colliders, movement, definition), `${definition.id} source contacts frame ${frame}`).toBe(true);
      }
    }
  });
});
