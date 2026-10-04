import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { createFloraPopulation, FLORA_EDIT_INFLUENCE, FLORA_TRUNK_GAP, registerFloraColliders, selectFloraPopulation, type FloraTree } from '../../src/presentation/floraPopulation';
import { createForestFloorPopulation } from '../../src/presentation/forestFloor';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { createPineForest, isPineSpecies, type PineForest } from '../../src/presentation/solitaryPine';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders, buildStaticColliders, type CircleCollider } from '../../src/world/colliders';
import { ANCHORS, PICKUP_LOCATIONS, RITE_ALTAR, ROADS, SHORTCUT, SLUICE, SPAWN, type V2 } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { Terrain, distToPolyline } from '../../src/world/terrain';
import { pineTemplates } from './pineFixture';

let forest: PineForest, terrain: Terrain, exclusions: Exclusions;
let legacy: FloraTree[], population: FloraTree[], trunks: Colliders;
const footprintFor = (tree: Readonly<FloraTree>, fallback: number) => isPineSpecies(tree.sp)
  ? forest.collisionRadius(tree.sp, tree.v + 1, tree.s) : fallback;

beforeAll(async () => {
  forest = createPineForest(await pineTemplates());
  terrain = new Terrain(); exclusions = new Exclusions(terrain);
  legacy = createFloraPopulation(terrain, exclusions);
  population = createFloraPopulation(terrain, exclusions, footprintFor);
  trunks = new Colliders(); registerFloraColliders(population, trunks);
});
afterAll(() => forest.dispose());

describe('source pine footprints in the regional forest composition', () => {
  it('keeps callback-free authoring and every surviving coordinate-keyed appearance unchanged', () => {
    expect(createFloraPopulation(terrain, exclusions, (_tree, fallback) => fallback)).toEqual(legacy);
    expect(createFloraPopulation(terrain, exclusions, footprintFor)).toEqual(population);
    const byId = new Map(legacy.filter((tree) => tree.collisionId).map((tree) => [tree.collisionId, tree]));
    let common = 0;
    for (const tree of population.filter((tree) => tree.radius > 0)) {
      const original = byId.get(tree.collisionId);
      if (!original) continue;
      const { radius: oldRadius, ...oldAppearance } = original;
      const { radius, ...appearance } = tree;
      expect(appearance).toEqual(oldAppearance); common++;
      if (!isPineSpecies(tree.sp)) expect(radius).toBe(oldRadius);
    }
    expect(common).toBeGreaterThan(100);
  });

  it('stores actual source wood footprints before exclusions and shares every obstacle across presets', () => {
    const circles = new Map((trunks.all as CircleCollider[]).map((circle) => [circle.id, circle]));
    const obstacles = population.filter((tree) => tree.radius > 0);
    expect(obstacles.length).toBeGreaterThan(100);
    expect(circles.size).toBe(obstacles.length);
    for (const tree of obstacles) {
      const circle = circles.get(tree.collisionId!)!;
      expect([circle.x, circle.z, circle.r]).toEqual([tree.x, tree.z, tree.radius]);
      if (isPineSpecies(tree.sp)) expect(tree.radius).toBe(forest.collisionRadius(tree.sp, tree.v + 1, tree.s));
      expect(exclusions.blocked(tree.x, tree.z, tree.radius + 0.55)).toBe(false);
    }
    for (const quality of ['low', 'medium', 'high'] as const) {
      const selected = selectFloraPopulation(population, quality), colliders = new Colliders();
      registerFloraColliders(selected.obstacles, colliders);
      expect(colliders.all).toEqual(trunks.all);
      expect(selected.obstacles.every((tree) => selected.trees.includes(tree))).toBe(true);
    }
  });

  it('separates all accepted source roots with symmetric claims spanning the required bucket radius', () => {
    const claims = population.map((tree) => ({ tree, radius: footprintFor(tree, tree.sp === 'shrub' ? 0.4 * tree.s : tree.radius) }));
    const conflicts: string[] = [];
    for (let i = 0; i < claims.length; i++) for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i]!, b = claims[j]!;
      if (Math.hypot(a.tree.x - b.tree.x, a.tree.z - b.tree.z) < a.radius + b.radius + FLORA_TRUNK_GAP - 1e-8) {
        conflicts.push(`${a.tree.x},${a.tree.z}/${b.tree.x},${b.tree.z}`);
      }
    }
    expect(conflicts).toEqual([]);
    const maximum = Math.max(...claims.map((claim) => claim.radius));
    // A one-bucket search misses some large horizon-root claims; the full reach remains local.
    expect(maximum * 2 + FLORA_TRUNK_GAP).toBeGreaterThan(8);
    expect(maximum * 2 + FLORA_TRUNK_GAP).toBeLessThan(FLORA_EDIT_INFLUENCE);
  });

  it('keeps continuous road centers and pickup/interaction approaches clear at .55m padding', () => {
    const conflicts: string[] = [];
    for (const tree of trunks.all as CircleCollider[]) for (const [index, road] of ROADS.entries()) {
      if (distToPolyline(tree.x, tree.z, road.points).d < tree.r + 0.55) conflicts.push(`${tree.id}:road:${index}`);
    }
    expect(conflicts).toEqual([]);
    const approaches = [SPAWN, ...Object.values(ANCHORS), SLUICE.control, SHORTCUT.lever, ...PICKUP_LOCATIONS];
    expect(approaches.filter((point) => trunks.blocked(point.x, point.z, 0.55))).toEqual([]);
  });

  it('places rocks and floor detail outside the stored source wood footprints', () => {
    const trees = population.filter((tree) => tree.radius > 0);
    const rocks = createScatterPopulation(terrain, exclusions, trees).filter((rock) => rock.radius > 0);
    const floor = createForestFloorPopulation(terrain, exclusions, population);
    expect(rocks.length).toBeGreaterThan(20); expect(floor.length).toBeGreaterThan(100);
    const conflicts: string[] = [];
    for (const rock of rocks) for (const tree of trees) {
      if (Math.hypot(rock.x - tree.x, rock.z - tree.z) < rock.radius + tree.radius + 0.35) conflicts.push(`${rock.collisionId}/${tree.collisionId}`);
    }
    for (const piece of floor) for (const tree of trees) {
      const reach = piece.kind === 'log' ? piece.scale * 1.7 + 0.25 : 0.24;
      if (Math.hypot(piece.x - tree.x, piece.z - tree.z) < tree.radius + reach) conflicts.push(`${piece.id}/${tree.collisionId}`);
    }
    expect(conflicts).toEqual([]);
  });

  it('connects all 32 core, scheduled and override routes with actual trees, rocks and static collision', () => {
    const colliders = buildStaticColliders(); registerFloraColliders(population, colliders);
    registerScatterColliders(createScatterPopulation(terrain, exclusions, population), colliders);
    const nav = new NavGrid(terrain, colliders, 0.55);
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
        const start = anchors[i]!, end = anchors[(i + 1) % anchors.length]!;
        if (start !== end) routes.push([`${npc.id}: ${start} to ${end}`, ANCHORS[start]!, ANCHORS[end]!]);
      }
      for (const override of npc.overrides ?? []) {
        routes.push([`${npc.id}: override ${override.anchor}`, ANCHORS[anchors[0]!]!, ANCHORS[override.anchor]!]);
      }
    }
    expect(routes).toHaveLength(32);
    expect(routes.filter(([, start, end]) => !nav.findPath(start, end)).map(([name]) => name)).toEqual([]);
  });
});
