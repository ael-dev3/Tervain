import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { createFloraPopulation, registerFloraColliders, selectFloraPopulation, type FloraTree } from '../../src/presentation/floraPopulation';
import { createPineForest, isPineSpecies, type PineForest } from '../../src/presentation/solitaryPine';
import { buildTreeVariant, type TreeVariant } from '../../src/presentation/treeGen';
import { groundedTreeY, treeWoodCollisionRadius } from '../../src/presentation/treeGrounding';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders, buildStaticColliders, type CircleCollider } from '../../src/world/colliders';
import { ANCHORS, PICKUP_LOCATIONS, RITE_ALTAR, ROADS, SHORTCUT, SLUICE, SPAWN, type V2 } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { Terrain, distToPolyline } from '../../src/world/terrain';
import { pineTemplates } from './pineFixture';

let forest: PineForest;
let terrain: Terrain;
let population: FloraTree[];
let trunks: Colliders;
const variants = new Map<string, TreeVariant>();
function variantFor(tree: Pick<FloraTree, 'sp' | 'v'>): TreeVariant {
  const key = `${tree.sp}:${tree.v}`;
  let variant = variants.get(key);
  if (!variant) {
    variant = isPineSpecies(tree.sp) ? forest.variant(tree.sp, tree.v + 1) : buildTreeVariant(tree.sp, tree.v + 1);
    variants.set(key, variant);
  }
  return variant;
}

const radiusFor = (tree: FloraTree) => isPineSpecies(tree.sp)
  ? forest.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
  : treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y);

beforeAll(async () => {
  forest = createPineForest(await pineTemplates());
  terrain = new Terrain();
  population = createFloraPopulation(terrain, new Exclusions(terrain), (tree, footprint) => isPineSpecies(tree.sp)
    ? forest.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
    : footprint > 0 ? treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : footprint,
    tree => groundedTreeY(terrain, tree, variantFor(tree)));
  trunks = new Colliders();
  registerFloraColliders(population, trunks, radiusFor);
});
afterAll(() => {
  forest.dispose();
  for (const variant of variants.values()) if (!isPineSpecies(variant.species)) for (const lod of variant.lods) { lod.wood?.dispose(); lod.leaf?.dispose(); }
});

describe('source-proportion pine collision and routes', () => {
  it('retains canonical identities and positions on every preset while matching all planted wood footprints', () => {
    const snapshot = structuredClone(population);
    const canonical = population.filter((tree) => tree.collisionId !== null);
    // Final authored population; broader actual wood corrects the old 376-circle layout.
    expect(canonical).toHaveLength(336);
    expect(canonical.filter((tree) => isPineSpecies(tree.sp))).toHaveLength(216);
    const circles = trunks.all as CircleCollider[];
    expect(circles).toHaveLength(canonical.length);
    expect(circles.every((circle) => circle.kind === 'circle')).toBe(true);
    const byId = new Map(circles.map((circle) => [circle.id, circle]));
    for (const tree of canonical) {
      const circle = byId.get(tree.collisionId!)!;
      expect([circle.x, circle.z], tree.collisionId!).toEqual([tree.x, tree.z]);
      if (isPineSpecies(tree.sp)) {
        // Authored population, rendered wood and movement use one source-matching footprint.
        expect(circle.r, tree.collisionId!).toBe(tree.radius);
      } else {
        expect(circle.r, tree.collisionId!).toBe(tree.radius);
      }
    }
    for (const quality of ['low', 'medium', 'high'] as const) {
      const selected = selectFloraPopulation(population, quality);
      const colliders = new Colliders();
      registerFloraColliders(selected.obstacles, colliders, radiusFor);
      expect(colliders.all, quality).toEqual(trunks.all);
    }
    expect(population).toEqual(snapshot);
  });

  it('keeps the complete road centerlines and interaction approaches clear with .55m player padding', () => {
    // Exact distance to each polyline checks every point of every segment, rather than sparse road samples.
    const blockedRoads: string[] = [];
    for (const circle of trunks.all as CircleCollider[]) {
      for (const [index, road] of ROADS.entries()) {
        if (distToPolyline(circle.x, circle.z, road.points).d < circle.r + 0.55) {
          blockedRoads.push(`${circle.id}:road:${index}`);
        }
      }
    }
    expect(blockedRoads).toEqual([]);
    const approaches = [SPAWN, ...Object.values(ANCHORS), SLUICE.control, SHORTCUT.lever, ...PICKUP_LOCATIONS];
    expect(approaches.filter((point) => trunks.blocked(point.x, point.z, 0.55))).toEqual([]);
  });

  it('preserves all 32 core, scheduled NPC and override routes with the delivered source wood colliders', () => {
    const colliders = buildStaticColliders();
    registerFloraColliders(population, colliders, radiusFor);
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
