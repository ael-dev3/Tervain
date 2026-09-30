import { beforeAll, describe, expect, it } from 'vitest';
import { createFloraPopulation, selectFloraPopulation, registerFloraColliders, floraLod, type FloraTree } from '../../src/presentation/floraPopulation';
import { buildTreeVariant } from '../../src/presentation/treeGen';
import { Exclusions, TREE_SWAY_ENABLED, TREE_SWAY_MULTIPLIER } from '../../src/presentation/vegetation';
import { Colliders, buildStaticColliders } from '../../src/world/colliders';
import { ANCHORS, BUILDINGS, ROADS, SPAWN, SLUICE, RITE_ALTAR, SHORTCUT, PICKUP_LOCATIONS, type V2 } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { Terrain } from '../../src/world/terrain';
import { NPC_LIST } from '../../src/content/npcs';
import type { Quality } from '../../src/presentation/context';

const presets: Quality[] = ['low', 'medium', 'high'];
let terrain: Terrain;
let exclusions: Exclusions;
let population: FloraTree[];

beforeAll(() => {
  terrain = new Terrain();
  exclusions = new Exclusions(terrain);
  population = createFloraPopulation(terrain, exclusions);
});

describe('canonical flora population', () => {
  it('generates identical world positions and obstacle identities from stable inputs', () => {
    expect(createFloraPopulation(terrain, exclusions)).toEqual(population);
    const obstacles = population.filter((tree) => tree.radius > 0);
    expect(obstacles.length).toBeGreaterThan(100);
    expect(new Set(obstacles.map((tree) => tree.collisionId)).size).toBe(obstacles.length);
    expect(population.filter((tree) => tree.sp === 'shrub').every((tree) => tree.radius === 0 && tree.collisionId === null)).toBe(true);
  });

  it('retains every blocking tree on all graphics presets while thinning only decorative detail', () => {
    const plans = presets.map((quality) => selectFloraPopulation(population, quality));
    for (const plan of plans) {
      expect(plan.obstacles).toEqual(plans[2]!.obstacles);
      expect(plan.obstacles.every((tree) => plan.trees.includes(tree))).toBe(true);
    }
    expect(plans[0]!.trees.length).toBeLessThan(plans[1]!.trees.length);
    expect(plans[1]!.trees.length).toBeLessThan(plans[2]!.trees.length);
    expect(plans[0]!.trees.every((tree) => plans[1]!.trees.includes(tree))).toBe(true);
    expect(plans[1]!.trees.every((tree) => plans[2]!.trees.includes(tree))).toBe(true);
    // The high preset preserves the authored population; quality cannot create extra obstacles.
    expect(plans[2]!.trees).toEqual(population);
  });

  it('registers exactly the same movement obstacles for low, medium, and high', () => {
    const collections = presets.map((quality) => {
      const plan = selectFloraPopulation(population, quality);
      const colliders = new Colliders();
      registerFloraColliders(plan.obstacles, colliders);
      return colliders;
    });
    for (const colliders of collections) {
      expect(colliders.all).toEqual(collections[2]!.all);
      for (const tree of population.filter((tree) => tree.radius > 0)) {
        expect(colliders.blocked(tree.x, tree.z, 0.55)).toBe(true);
      }
    }
  });

  it('keeps paths, schedule anchors, the strand spawn, and interaction approaches clear of trunks', () => {
    const trunks = new Colliders();
    registerFloraColliders(population, trunks);
    const points = [SPAWN, ...Object.values(ANCHORS), SLUICE.control, SHORTCUT.lever, ...PICKUP_LOCATIONS];
    expect(points.filter((point) => trunks.blocked(point.x, point.z, 0.55))).toEqual([]);
    const blockedRoads: string[] = [];
    for (const [roadIndex, road] of ROADS.entries()) {
      for (let i = 0; i < road.points.length - 1; i++) {
        const start = road.points[i]!;
        const end = road.points[i + 1]!;
        const steps = Math.ceil(Math.hypot(end.x - start.x, end.z - start.z) / 0.75);
        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          if (trunks.blocked(start.x + (end.x - start.x) * t, start.z + (end.z - start.z) * t, 0.55)) blockedRoads.push(`${roadIndex}:${i}:${step}`);
        }
      }
    }
    expect(blockedRoads).toEqual([]);
    const overlaps: string[] = [];
    for (const tree of population.filter((tree) => tree.radius > 0)) {
      for (const building of BUILDINGS) {
        const dx = tree.x - building.x;
        const dz = tree.z - building.z;
        const lx = dx * Math.cos(building.yaw) - dz * Math.sin(building.yaw);
        const lz = dx * Math.sin(building.yaw) + dz * Math.cos(building.yaw);
        if (Math.abs(lx) < building.w / 2 + tree.radius && Math.abs(lz) < building.d / 2 + tree.radius) overlaps.push(`${tree.collisionId}:${building.id}`);
      }
    }
    expect(overlaps, 'blocking trunks must stay outside house shells').toEqual([]);
  });

  it('preserves core routes and scheduled NPC transitions with the actual tree colliders installed', () => {
    const colliders = buildStaticColliders();
    registerFloraColliders(population, colliders);
    const nav = new NavGrid(terrain, colliders);
    const routes: [string, V2, V2][] = [
      ['strand to village', SPAWN, ANCHORS.village_square!],
      ['strand to lighthouse', SPAWN, ANCHORS.lantern_door!],
      ['village to sluice', ANCHORS.village_square!, SLUICE.control],
      ['sluice to shrine', SLUICE.control, { x: RITE_ALTAR.x, z: RITE_ALTAR.z + 2.4 }],
      ['village to quarry', ANCHORS.village_square!, ANCHORS.quarry_yard!],
      ['quarry to maintenance lever', ANCHORS.quarry_yard!, SHORTCUT.lever],
      ['quarry to ledge', ANCHORS.quarry_yard!, ANCHORS.cut_ledge!],
      ['village to ford', ANCHORS.village_square!, ANCHORS.ford_camp!],
    ];
    for (const npc of NPC_LIST) {
      const anchors = npc.schedule.map((entry) => entry.anchor);
      for (let i = 0; i < anchors.length; i++) {
        const start = anchors[i]!;
        const end = anchors[(i + 1) % anchors.length]!;
        if (start !== end) routes.push([`${npc.id}: ${start} to ${end}`, ANCHORS[start]!, ANCHORS[end]!]);
      }
      for (const override of npc.overrides ?? []) {
        routes.push([`${npc.id}: override ${override.anchor}`, ANCHORS[anchors[0]!]!, ANCHORS[override.anchor]!]);
      }
    }
    expect(routes.filter(([, start, end]) => !nav.findPath(start, end)).map(([name]) => name)).toEqual([]);
  });

  it('uses visible trunk-and-branch geometry for low-preset obstacles at player distances', () => {
    expect(floraLod('low', 0)).toBe(1);
    expect(floraLod('low', 30)).toBe(1);
    expect(floraLod('low', 90)).toBe(2);
    const low = selectFloraPopulation(population, 'low');
    const variants = new Set(low.obstacles.map((tree) => `${tree.sp}:${tree.v}`));
    for (const key of variants) {
      const representative = low.obstacles.find((tree) => `${tree.sp}:${tree.v}` === key)!;
      const model = buildTreeVariant(representative.sp, representative.v + 1);
      const nearTrunk = model.lods[floraLod('low', 10)].wood;
      expect(nearTrunk, `${key} must include a trunk in the low preset`).not.toBeNull();
      expect(nearTrunk!.getAttribute('position').count).toBeGreaterThan(12);
      nearTrunk!.computeBoundingBox();
      expect(nearTrunk!.boundingBox!.min.y).toBeLessThanOrEqual(0);
      expect(nearTrunk!.boundingBox!.max.y).toBeGreaterThan(1);
      for (const lod of model.lods) {
        lod.wood?.dispose();
        lod.leaf?.dispose();
      }
    }
    expect(TREE_SWAY_ENABLED).toBe(false);
    expect(TREE_SWAY_MULTIPLIER).toBe(0);
  });
});
