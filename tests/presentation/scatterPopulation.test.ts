import { beforeAll, describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import type { Quality } from '../../src/presentation/context';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { createScatterPopulation, registerScatterColliders, selectScatterPopulation, type ScatterRock } from '../../src/presentation/scatterPopulation';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders, buildStaticColliders } from '../../src/world/colliders';
import { ANCHORS, BUILDINGS, PICKUP_LOCATIONS, RITE_ALTAR, ROADS, SHORTCUT, SLUICE, SPAWN, type V2 } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { Terrain } from '../../src/world/terrain';

const presets: Quality[] = ['low', 'medium', 'high'];
let terrain: Terrain;
let exclusions: Exclusions;
let population: ScatterRock[];

beforeAll(() => {
  terrain = new Terrain();
  exclusions = new Exclusions(terrain);
  population = createScatterPopulation(terrain, exclusions);
});

describe('canonical rock population', () => {
  it('authors deterministic obstacle identities and visible rock shapes without graphics settings', () => {
    expect(createScatterPopulation(terrain, exclusions)).toEqual(population);
    const obstacles = population.filter((rock) => rock.radius > 0);
    expect(obstacles.length).toBeGreaterThan(20);
    expect(new Set(obstacles.map((rock) => rock.collisionId)).size).toBe(obstacles.length);
    expect(obstacles.some((rock) => rock.kind === 'surf')).toBe(true);
    expect(obstacles.some((rock) => rock.kind === 'erratic')).toBe(true);
    expect(obstacles.some((rock) => rock.kind === 'lighthouse')).toBe(true);
    expect(population.every((rock) => Number.isFinite(rock.y) && rock.size > 0 && rock.shape >= 0 && rock.shape < 6)).toBe(true);
  });

  it('retains all obstacle geometry and offshore landmarks on every preset while thinning decorative stones', () => {
    const plans = presets.map((quality) => selectScatterPopulation(population, quality));
    for (const plan of plans) {
      expect(plan.obstacles).toEqual(plans[2]!.obstacles);
      expect(plan.obstacles.every((rock) => plan.rocks.includes(rock))).toBe(true);
      expect(population.filter((rock) => rock.kind === 'stack').every((rock) => plan.rocks.includes(rock))).toBe(true);
    }
    expect(plans[0]!.rocks.length).toBeLessThan(plans[1]!.rocks.length);
    expect(plans[1]!.rocks.length).toBeLessThan(plans[2]!.rocks.length);
    expect(plans[0]!.rocks.every((rock) => plans[1]!.rocks.includes(rock))).toBe(true);
    expect(plans[1]!.rocks.every((rock) => plans[2]!.rocks.includes(rock))).toBe(true);
    expect(plans[2]!.rocks).toEqual(population);
    const collections = plans.map((plan) => {
      const colliders = new Colliders();
      registerScatterColliders(plan.rocks, colliders);
      return colliders;
    });
    for (const colliders of collections) {
      expect(colliders.all).toEqual(collections[2]!.all);
      for (const rock of plans[2]!.obstacles) expect(colliders.blocked(rock.x, rock.z, 0.55)).toBe(true);
    }
  });

  it('keeps the six authored sea-stack landmarks when their seabed supports them, independently of decoration thinning', () => {
    const offshore = createScatterPopulation({ heightAt: () => -1, slopeAt: () => 0 }, { blocked: () => false });
    const stacks = offshore.filter((rock) => rock.kind === 'stack');
    expect(stacks).toHaveLength(6);
    expect(stacks.every((rock) => rock.radius === 0 && rock.collisionId === null)).toBe(true);
    for (const quality of presets) {
      const plan = selectScatterPopulation(offshore, quality);
      expect(stacks.every((rock) => plan.rocks.includes(rock))).toBe(true);
    }
  });

  it('leaves roads, building shells, spawn, schedule anchors and interaction approaches clear of rocks', () => {
    const colliders = new Colliders();
    registerScatterColliders(population, colliders);
    const points = [SPAWN, ...Object.values(ANCHORS), SLUICE.control, SHORTCUT.lever, ...PICKUP_LOCATIONS];
    expect(points.filter((point) => colliders.blocked(point.x, point.z, 0.55))).toEqual([]);
    const blockedRoads: string[] = [];
    for (const [roadIndex, road] of ROADS.entries()) {
      for (let segment = 0; segment < road.points.length - 1; segment++) {
        const start = road.points[segment]!;
        const end = road.points[segment + 1]!;
        const steps = Math.ceil(Math.hypot(end.x - start.x, end.z - start.z) / 0.75);
        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          if (colliders.blocked(start.x + (end.x - start.x) * t, start.z + (end.z - start.z) * t, 0.55)) blockedRoads.push(`${roadIndex}:${segment}:${step}`);
        }
      }
    }
    expect(blockedRoads).toEqual([]);
    const overlaps: string[] = [];
    for (const rock of population.filter((candidate) => candidate.radius > 0)) {
      for (const building of BUILDINGS) {
        const dx = rock.x - building.x;
        const dz = rock.z - building.z;
        const lx = dx * Math.cos(building.yaw) - dz * Math.sin(building.yaw);
        const lz = dx * Math.sin(building.yaw) + dz * Math.cos(building.yaw);
        const outside = Math.hypot(Math.max(0, Math.abs(lx) - building.w / 2), Math.max(0, Math.abs(lz) - building.d / 2));
        if (outside < rock.radius + 0.55) overlaps.push(`${rock.collisionId}:${building.id}`);
      }
    }
    expect(overlaps).toEqual([]);
  });

  it('preserves core routes and NPC schedule transitions with both canonical trees and rocks installed', () => {
    const colliders = buildStaticColliders();
    registerFloraColliders(createFloraPopulation(terrain, exclusions), colliders);
    registerScatterColliders(population, colliders);
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
      for (const override of npc.overrides ?? []) routes.push([`${npc.id}: override ${override.anchor}`, ANCHORS[anchors[0]!]!, ANCHORS[override.anchor]!]);
    }
    expect(routes.filter(([, start, end]) => !nav.findPath(start, end)).map(([name]) => name)).toEqual([]);
  });
});
