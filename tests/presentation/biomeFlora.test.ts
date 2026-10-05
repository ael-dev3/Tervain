import { beforeAll, describe, expect, it } from 'vitest';
import { createFloraPopulation, selectFloraPopulation, type FloraClaim, type FloraTree } from '../../src/presentation/floraPopulation';
import { Exclusions } from '../../src/presentation/vegetation';
import { biomeAt } from '../../src/world/biomes';
import { forestClearingDistance } from '../../src/world/forest';
import { DEEPWOOD, STRAND } from '../../src/world/layout';
import { shoreDistance } from '../../src/world/coast';
import { Terrain } from '../../src/world/terrain';

let terrain: Terrain, exclusions: Exclusions, population: FloraTree[];
beforeAll(() => {
  terrain = new Terrain(); exclusions = new Exclusions(terrain);
  population = createFloraPopulation(terrain, exclusions);
});

describe('source-tree biome population', () => {
  it('plants sparse original palm groves on both sheltered shoulders, keeping landing and logical variants stable', () => {
    const palms = population.filter(tree => tree.sp === 'palm');
    expect(palms.some(tree => tree.z < STRAND.z - 56)).toBe(true);
    expect(palms.some(tree => tree.z > STRAND.z + 56)).toBe(true);
    expect(new Set(palms.map(tree => tree.v)).size).toBe(3);
    for (const tree of palms) {
      expect(biomeAt(tree.x, tree.z).weights['sheltered-palms']).toBeGreaterThan(0.35);
      expect(shoreDistance(tree.x, tree.z)).toBeGreaterThanOrEqual(16);
      expect(Math.hypot(tree.x - STRAND.x, tree.z - STRAND.z)).toBeGreaterThanOrEqual(56 + tree.radius + 0.55);
      expect(tree.collisionId).toMatch(/^tree:palm:/);
      expect(tree.radius).toBeGreaterThan(0);
    }
    expect(palms.some(tree => shoreDistance(tree.x, tree.z) < DEEPWOOD.shoreClearance)).toBe(true);
    expect(selectFloraPopulation(population, 'low').obstacles.filter(tree => tree.sp === 'palm')).toEqual(palms);
  });

  it('selects warm supplied crowns before grounding and footprint callbacks and preserves the custom pine body', () => {
    const warm = population.filter(tree => tree.assetId === 'tree-1505');
    expect(warm.some(tree => tree.x > DEEPWOOD.maxX)).toBe(true);
    expect(warm.every(tree => tree.sp === 'oak' && biomeAt(tree.x, tree.z).weights['ochre-woodland'] > 0.42)).toBe(true);
    const pine = population.filter(tree => tree.sp === 'pine' && biomeAt(tree.x, tree.z).weights['pine-deepwood'] > 0.9);
    expect(pine.length).toBeGreaterThan(0);
    expect(pine.every(tree => tree.assetId === undefined)).toBe(true);
    const seen: FloraTree[] = [];
    createFloraPopulation(terrain, exclusions, (tree, fallback) => {
      if (tree.assetId) { expect(tree.y).toBe(terrain.heightAt(tree.x, tree.z) - 0.12); seen.push({ ...tree }); }
      return fallback;
    }, tree => terrain.heightAt(tree.x, tree.z) - 0.12);
    expect(seen.some(tree => tree.assetId === 'tree-1505')).toBe(true);
  });

  it('uses measured scaled crowns for clearing rejection without replacing canonical identity or accepting invalid bounds', () => {
    const claims: FloraClaim[] = [];
    const scaledCrown = (tree: Readonly<FloraTree>) => 8 * tree.s;
    const measured = createFloraPopulation(terrain, exclusions, undefined, undefined, claim => claims.push(claim), scaledCrown);
    expect(measured.length).toBeGreaterThan(100);
    expect(claims.some(claim => claim.outcome === 'clearing')).toBe(true);
    for (const tree of measured) expect(forestClearingDistance(tree.x, tree.z)).toBeGreaterThanOrEqual(scaledCrown(tree) + 0.5);
    expect(new Set(claims.map(claim => claim.key)).size).toBe(claims.length);
    expect(claims.filter(claim => claim.outcome === 'accepted').map(claim => claim.tree)).toEqual(measured);
    expect(createFloraPopulation(terrain, exclusions, undefined, undefined, undefined, () => 1e9)).toEqual([]);
    for (const radius of [-0.1, NaN, Infinity]) {
      expect(() => createFloraPopulation(terrain, exclusions, undefined, undefined, undefined, () => radius)).toThrow('Tree crown must be finite and nonnegative.');
    }
  });
});
