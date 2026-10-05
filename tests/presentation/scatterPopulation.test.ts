import { beforeAll, describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import type { Quality } from '../../src/presentation/context';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { createScatterPopulation, createShoreDetailPopulation, registerScatterColliders, selectScatterPopulation, type ScatterRock } from '../../src/presentation/scatterPopulation';
import { createShoreWoodSegments } from '../../src/presentation/scatter';
import { rockShapes, rockTransform } from '../../src/presentation/rockGeometry';
import * as THREE from 'three';
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
  it('keeps boulder and tree movement footprints apart without changing unrelated rock identities', () => {
    const trunks = createFloraPopulation(terrain, exclusions).filter((t) => t.radius > 0);
    const combined = createScatterPopulation(terrain, exclusions, trunks);
    expect(createScatterPopulation(terrain, exclusions, trunks)).toEqual(combined);
    const byId = new Map(population.filter((r) => r.collisionId).map((r) => [r.collisionId, r]));
    for (const rock of combined.filter((r) => r.radius > 0)) {
      expect(rock).toEqual(byId.get(rock.collisionId));
      for (const tree of trunks) expect(Math.hypot(rock.x - tree.x, rock.z - tree.z)).toBeGreaterThanOrEqual(rock.radius + tree.radius + 0.35);
    }
    expect(combined.filter((r) => r.radius > 0).length).toBeGreaterThan(20);
    for (const quality of presets) expect(selectScatterPopulation(combined, quality).obstacles).toEqual(selectScatterPopulation(combined, 'high').obstacles);
  });

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
    for (const plan of plans) {
      expect(population.filter(rock => rock.contact).every(rock => plan.rocks.includes(rock))).toBe(true);
      expect(plan.rocks.filter(rock => rock.contact).map(rock => rock.contact!.id)).toEqual(plans[2]!.rocks.filter(rock => rock.contact).map(rock => rock.contact!.id));
    }
    const collections = plans.map((plan) => {
      const colliders = new Colliders();
      registerScatterColliders(plan.rocks, colliders);
      return colliders;
    });
    for (const colliders of collections) {
      expect(colliders.all).toEqual(collections[2]!.all);
      expect(colliders.rockMeshes).toEqual(collections[2]!.rockMeshes);
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

  it('groups dry shelf stones with exact finite contacts and embeds their whole transformed bases', () => {
    const shelf = population.filter(rock => rock.kind === 'shelf');
    expect(shelf.length).toBeGreaterThan(5);
    expect(shelf.some(rock => rock.size > 1.25)).toBe(true);
    for (const rock of shelf) {
      expect(rock.contact).toBeDefined();
      expect(exclusions.blocked(rock.x, rock.z, rock.size * 1.25 + 0.55)).toBe(false);
      const source = (rock.size > 0.55 ? rockShapes().big : rockShapes().small)[rock.shape]!.getAttribute('position');
      const matrix = rockTransform(rock), p = new THREE.Vector3();
      let low = Infinity, high = -Infinity;
      for (let i = 0; i < source.count; i++) {
        p.fromBufferAttribute(source, i).applyMatrix4(matrix);
        low = Math.min(low, p.y); high = Math.max(high, p.y);
        expect(rock.contact!.positions[i * 3]).toBeCloseTo(p.x, 4);
        expect(rock.contact!.positions[i * 3 + 1]).toBeCloseTo(p.y, 4);
        expect(rock.contact!.positions[i * 3 + 2]).toBeCloseTo(p.z, 4);
      }
      for (let i = 0; i < source.count; i++) {
        p.fromBufferAttribute(source, i).applyMatrix4(matrix);
        if (p.y <= low + (high - low) * 0.12 + 1e-5) expect(p.y).toBeLessThan(terrain.heightAt(p.x, p.z));
      }
    }
  });

  it('keeps sparse dry shore dressing deterministic and away from whole interaction envelopes', () => {
    const details = createShoreDetailPopulation(terrain, exclusions);
    expect(createShoreDetailPopulation(terrain, exclusions)).toEqual(details);
    expect(details.some(detail => detail.kind === 'driftwood')).toBe(true);
    expect(details.some(detail => detail.kind === 'scrub')).toBe(true);
    expect(details.length).toBeLessThan(42);
    for (const detail of details) {
      const reach = detail.kind === 'driftwood' ? detail.scale * 0.65 + 0.2 : detail.scale * 0.9;
      expect(exclusions.blocked(detail.x, detail.z, reach)).toBe(false);
      expect(Math.hypot(detail.x - SPAWN.x, detail.z - SPAWN.z)).toBeGreaterThan(32 + reach);
      expect(detail.y).toBe(terrain.heightAt(detail.x, detail.z));
    }
    const wood = details.find(detail => detail.kind === 'driftwood')!;
    const segments = createShoreWoodSegments(wood, (x, z) => terrain.heightAt(x, z));
    expect(segments.length).toBeGreaterThanOrEqual(3);
    expect(segments.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < 3; i++) expect(segments[i]!.a).toBe(segments[i - 1]!.b);
    for (const fork of segments.slice(3)) expect(segments.slice(0, 3).some(trunk => trunk.b === fork.a)).toBe(true);
    for (const segment of segments) {
      for (const [point, radius] of [[segment.a, segment.radius], [segment.b, segment.endRadius]] as const) {
        expect(point[1] - radius).toBeLessThanOrEqual(terrain.heightAt(point[0], point[2]) + 0.01);
        expect(point[1] + radius - terrain.heightAt(point[0], point[2])).toBeLessThan(0.2);
      }
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
