import { beforeAll, describe, expect, it } from 'vitest';
import { createFloraPopulation, FLORA_EDIT_INFLUENCE, FLORA_TRUNK_GAP, type FloraTree } from '../../src/presentation/floraPopulation';
import { Exclusions } from '../../src/presentation/vegetation';
import { Terrain } from '../../src/world/terrain';
import { deepwoodCover, FOREST_OPENINGS, forestOpeningCover } from '../../src/world/forest';

let terrain: Terrain, exclusions: Exclusions, population: FloraTree[];
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
beforeAll(() => {
  terrain = new Terrain();
  exclusions = new Exclusions(terrain);
  population = createFloraPopulation(terrain, exclusions);
});

describe('cohesive woodland placement', () => {
  it('retains safe trunk separation across cells, satellites and every authoring pass', () => {
    const trunks = population.filter(tree => tree.radius > 0);
    const conflicts: string[] = [];
    for (let i = 0; i < trunks.length; i++) for (let j = i + 1; j < trunks.length; j++) {
      const a = trunks[i]!, b = trunks[j]!;
      if (distance(a, b) < a.radius + b.radius + FLORA_TRUNK_GAP - 1e-8) conflicts.push(`${a.collisionId}/${b.collisionId}`);
    }
    expect(conflicts).toEqual([]);
  });

  it('groups actual nearest neighbours by species beyond an independent global mixture', () => {
    const trees = population.filter(tree => tree.radius > 0 && tree.age !== 'sapling' && deepwoodCover(tree.x, tree.z) > 0.8);
    expect(trees.length).toBeGreaterThan(150);
    const counts = new Map<string, number>();
    let matching = 0;
    for (const tree of trees) {
      counts.set(tree.sp, (counts.get(tree.sp) ?? 0) + 1);
      let nearest: FloraTree | undefined, nearestDistance = Infinity;
      for (const other of trees) {
        if (other === tree) continue;
        const d = distance(tree, other);
        if (d < nearestDistance) { nearest = other; nearestDistance = d; }
      }
      if (nearest?.sp === tree.sp) matching++;
    }
    const independent = [...counts.values()].reduce((sum, count) => sum + (count / trees.length) ** 2, 0);
    expect(matching / trees.length).toBeGreaterThan(independent + 0.15);
    // Avoid obtaining a high match score by filling the entire forest with one species.
    expect(counts.size).toBeGreaterThanOrEqual(3);
    expect(Math.max(...counts.values()) / trees.length).toBeLessThan(0.65);
  });

  it('keeps all distant transforms, appearance and obstacle identities unchanged after local exclusions', () => {
    const targets = population.filter(tree => tree.radius > 0 && deepwoodCover(tree.x, tree.z) > 0.8);
    for (const target of [targets[0]!, targets[Math.floor(targets.length / 2)]!, targets[targets.length - 1]!]) {
      const changed = createFloraPopulation(terrain, {
        blocked: (x, z, pad) => exclusions.blocked(x, z, pad) || Math.hypot(x - target.x, z - target.z) < 1,
      });
      expect(changed.some(tree => tree.collisionId === target.collisionId)).toBe(false);
      const far = (trees: FloraTree[]) => trees.filter(tree => distance(tree, target) > FLORA_EDIT_INFLUENCE);
      expect(far(changed)).toEqual(far(population));
    }
  });

  it('retains named light pockets with gradual shoulders and several age cohorts', () => {
    for (const opening of FOREST_OPENINGS) {
      expect(deepwoodCover(opening.x, opening.z)).toBeGreaterThan(0.5);
      expect(forestOpeningCover(opening.x, opening.z)).toBeLessThan(0.2);
      expect(forestOpeningCover(opening.x + opening.rx * 1.5, opening.z)).toBeGreaterThan(0.85);
    }
    const cohorts = new Set(population.filter(tree => tree.radius > 0).map(tree => tree.age));
    expect(cohorts).toEqual(new Set(['veteran', 'mature', 'young', 'sapling']));
    for (const sp of ['oak', 'pine', 'fir']) {
      const scales = population.filter(tree => tree.sp === sp && tree.radius > 0).map(tree => tree.s);
      expect(Math.max(...scales) / Math.min(...scales)).toBeGreaterThan(2.5);
    }
  });
});
