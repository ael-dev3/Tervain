import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMeshyForest, type MeshyForest } from '../../src/presentation/meshyTrees';
import { createPineForest, type PineForest } from '../../src/presentation/solitaryPine';
import { createFloraPopulation, registerFloraColliders, selectFloraPopulation, type FloraTree, type FloraClaim } from '../../src/presentation/floraPopulation';
import { groundedTreeY, treeWoodCollisionRadius } from '../../src/presentation/treeGrounding';
import { PlantedCrownIndex } from '../../src/presentation/plantedCrowns';
import { createForestFloorPopulation } from '../../src/presentation/forestFloor';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { Exclusions } from '../../src/presentation/vegetation';
import { NPC_LIST } from '../../src/content/npcs';
import { biomeAt } from '../../src/world/biomes';
import { forestClearingDistance } from '../../src/world/forest';
import { Terrain, distToPolyline } from '../../src/world/terrain';
import { Colliders, buildStaticColliders, type CircleCollider } from '../../src/world/colliders';
import { NavGrid } from '../../src/world/nav';
import { ANCHORS, PICKUP_LOCATIONS, RITE_ALTAR, ROADS, SHORTCUT, SLUICE, SPAWN, STRAND, type V2 } from '../../src/world/layout';
import { pineTemplates } from './pineFixture';
import { meshyTreeTemplates } from './meshyTreeFixture';

let meshy: MeshyForest, pine: PineForest, terrain: Terrain, excl: Exclusions, population: FloraTree[];
const claims: FloraClaim[] = [];
const variantFor = (tree: Readonly<FloraTree>) => tree.sp === 'pine' ? pine.variant('pine', tree.v + 1) : meshy.variant(tree.sp, tree.v, tree.assetId);
beforeAll(async () => {
  const [source, custom] = await Promise.all([meshyTreeTemplates(), pineTemplates()]);
  meshy = createMeshyForest(source); pine = createPineForest(custom); terrain = new Terrain(); excl = new Exclusions(terrain);
  population = createFloraPopulation(terrain, excl,
    (tree, fallback) => tree.sp === 'pine' ? pine.collisionRadius('pine', tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
      : fallback > 0 ? treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : fallback,
    tree => groundedTreeY(terrain, tree, variantFor(tree)), claim => claims.push(claim), tree => variantFor(tree).crownRadius * tree.s);
}, 30_000);
afterAll(() => { meshy?.dispose(); pine?.dispose(); });

describe('0.0.12 real source forest and connected habitats', () => {
  it('retains broad accepted companion bodies and a varied lower warm canopy after actual source rejection', () => {
    for (const id of ['swale_oaks', 'eastern_oaks']) {
      const stand = population.filter(tree => tree.radius > 0 && tree.sp === 'oak' && tree.standId === id);
      const adults = stand.filter(tree => tree.age === 'mature' || tree.age === 'veteran');
      // Measure the narrow principal axis of accepted adult origins. A two-tree row or
      // broad authoring ellipse cannot substitute for an actual two-dimensional body.
      expect(adults.length, id).toBeGreaterThanOrEqual(3);
      const meanX = adults.reduce((sum, tree) => sum + tree.x / adults.length, 0);
      const meanZ = adults.reduce((sum, tree) => sum + tree.z / adults.length, 0);
      let xx = 0, zz = 0, xz = 0;
      for (const tree of adults) {
        xx += (tree.x - meanX) ** 2; zz += (tree.z - meanZ) ** 2;
        xz += (tree.x - meanX) * (tree.z - meanZ);
      }
      const yaw = Math.atan2(2 * xz, xx - zz) / 2;
      const minor = adults.map(tree => -(tree.x - meanX) * Math.sin(yaw) + (tree.z - meanZ) * Math.cos(yaw));
      expect(Math.max(...minor) - Math.min(...minor), id).toBeGreaterThan(20);
      expect(new Set(stand.map(tree => variantFor(tree).assetId)).size, id).toBeGreaterThanOrEqual(3);
    }
    const warm = population.filter(tree => tree.radius > 0 && tree.sp === 'oak'
      && biomeAt(tree.x, tree.z).weights['ochre-woodland'] > 0.55);
    expect(new Set(warm.map(tree => variantFor(tree).assetId))).toEqual(new Set(['tree-1505', 'tree-0208', 'tree-1521']));
    const meanAdultHeight = (trees: FloraTree[]) => {
      const adults = trees.filter(tree => tree.age === 'mature' || tree.age === 'veteran');
      return adults.reduce((sum, tree) => sum + variantFor(tree).height * tree.s / adults.length, 0);
    };
    expect(meanAdultHeight(warm)).toBeLessThan(meanAdultHeight(population.filter(tree => tree.sp === 'pine')) * 0.8);
    // Diagnostic terminal claims are from the same source-fit pipeline, not its ungrounded plan.
    expect(claims.filter(claim => claim.outcome === 'accepted').map(claim => claim.tree)).toEqual(population);
    expect(new Set(claims.map(claim => claim.key)).size).toBe(claims.length);
  });
  it('uses supplied geometry for every family except the original custom pine, with planted palms and warm woodland', () => {
    expect(population.length).toBeGreaterThan(200);
    const families = new Set(population.map(tree => tree.sp));
    expect(families.has('palm')).toBe(true); expect(families.has('pine')).toBe(true); expect(families.has('fir')).toBe(true);
    expect(population.some(tree => tree.assetId === 'tree-1505')).toBe(true);
    const sentinels = population.filter(tree => tree.assetId === 'verdant-sentinel');
    expect(sentinels.length).toBeGreaterThan(0);
    for (const tree of sentinels) {
      expect(['oak', 'birch']).toContain(tree.sp);
      expect(biomeAt(tree.x, tree.z).weights['humid-broadleaf']).toBeGreaterThan(0.42);
    }
    for (const tree of population) {
      const variant = variantFor(tree);
      expect(variant.assetId !== undefined).toBe(tree.sp !== 'pine');
      if (tree.sp === 'dead') expect(variant.lods.every(lod => lod.leaf === null)).toBe(true);
      if (tree.sp === 'palm') {
        expect(biomeAt(tree.x, tree.z).weights['sheltered-palms']).toBeGreaterThan(0.35);
        expect(Math.hypot(tree.x - STRAND.x, tree.z - STRAND.z)).toBeGreaterThan(56);
      }
      expect(variant.lods.every(lod => lod.tris < 20_000)).toBe(true);
      expect(Number.isFinite(tree.y)).toBe(true);
      expect(forestClearingDistance(tree.x, tree.z)).toBeGreaterThanOrEqual(variant.crownRadius * tree.s + 0.5);
    }
  });
  it('retains the same canonical wood contacts across all presets and clears every road, pickup and interaction approach', () => {
    const colliders = new Colliders(); registerFloraColliders(population, colliders);
    for (const quality of ['low', 'medium', 'high'] as const) {
      const selected = selectFloraPopulation(population, quality), copy = new Colliders(); registerFloraColliders(selected.obstacles, copy);
      expect(copy.all).toEqual(colliders.all);
    }
    const conflicts: string[] = [];
    for (const tree of colliders.all as CircleCollider[]) for (const [index, road] of ROADS.entries()) {
      if (distToPolyline(tree.x, tree.z, road.points).d < tree.r + 0.55) conflicts.push(`${tree.id}:road:${index}`);
    }
    expect(conflicts).toEqual([]);
    expect([SPAWN, ...Object.values(ANCHORS), SLUICE.control, SHORTCUT.lever, ...PICKUP_LOCATIONS].filter(point => colliders.blocked(point.x, point.z, 0.55))).toEqual([]);
  });
  it('connects all 32 scheduled and core routes with actual imported tree footprints and rocks', () => {
    const colliders = buildStaticColliders(); registerFloraColliders(population, colliders);
    registerScatterColliders(createScatterPopulation(terrain, excl, population), colliders);
    const nav = new NavGrid(terrain, colliders, 0.55);
    const routes: [string, V2, V2][] = [
      ['strand to village', SPAWN, ANCHORS.village_square!], ['strand to lighthouse', SPAWN, ANCHORS.lantern_door!],
      ['village to sluice', ANCHORS.village_square!, SLUICE.control], ['sluice to shrine', SLUICE.control, { x: RITE_ALTAR.x, z: RITE_ALTAR.z + 2.4 }],
      ['village to quarry', ANCHORS.village_square!, ANCHORS.quarry_yard!], ['quarry to lever', ANCHORS.quarry_yard!, SHORTCUT.lever],
      ['quarry to ledge', ANCHORS.quarry_yard!, ANCHORS.cut_ledge!], ['village to ford', ANCHORS.village_square!, ANCHORS.ford_camp!],
    ];
    for (const npc of NPC_LIST) {
      const anchors = npc.schedule.map(entry => entry.anchor);
      for (let i = 0; i < anchors.length; i++) {
        const start = anchors[i]!, end = anchors[(i + 1) % anchors.length]!;
        if (start !== end) routes.push([`${npc.id}:${start}:${end}`, ANCHORS[start]!, ANCHORS[end]!]);
      }
      for (const override of npc.overrides ?? []) routes.push([`${npc.id}:${override.anchor}`, ANCHORS[anchors[0]!]!, ANCHORS[override.anchor]!]);
    }
    expect(routes).toHaveLength(32); expect(routes.filter(([, start, end]) => !nav.findPath(start, end)).map(([name]) => name)).toEqual([]);
  });
  it('places habitat floor cover only under actual source crowns and outside every canonical root', () => {
    const crowns = new PlantedCrownIndex();
    for (const tree of population) if (tree.collisionId && variantFor(tree).lods[0].leaf) crowns.add(tree.sp, tree, variantFor(tree).lods[0].leaf!);
    const floor = createForestFloorPopulation(terrain, excl, population, crowns);
    expect(floor.length).toBeGreaterThan(100);
    const conflicts: string[] = [];
    for (const piece of floor) {
      expect(crowns.coverAt(piece.x, piece.z)).toBeGreaterThanOrEqual(0.08);
      for (const tree of population.filter(t => t.radius > 0)) {
        const reach = piece.kind === 'log' ? piece.scale * 1.7 + 0.25 : 0.24;
        if (Math.hypot(piece.x - tree.x, piece.z - tree.z) < tree.radius + reach) conflicts.push(`${piece.id}/${tree.collisionId}`);
      }
    }
    expect(conflicts).toEqual([]);
  });
});
