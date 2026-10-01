import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { buildAmbient } from '../../src/presentation/ambient';
import { personBuildOptions } from '../../src/presentation/characters';
import type { BuildContext } from '../../src/presentation/context';
import { buildForestLandmarks, forestLandmarkGeometry } from '../../src/presentation/forestLandmarks';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { Exclusions } from '../../src/presentation/vegetation';
import { buildStaticColliders } from '../../src/world/colliders';
import { ANCHORS, ARRIVAL_ROUTE, ARRIVAL_SIGN, ARRIVAL_TRAIL_WIDTH, ARRIVAL_WRECK, BUILDINGS, DECKS, FOREST_HILLS, FOREST_REGION, FOREST_RUIN, FOREST_SWALE, FOREST_WAYMARKERS, HAMLET_PROPS, INLAND_HAMLET, INSPECT_LOCATIONS, PALISADE, PLACES, ROADS, SPAWN, WAGON, type V2 } from '../../src/world/layout';
import { shoreDistance } from '../../src/world/coast';
import { deepwoodCover } from '../../src/world/forest';
import { NavGrid } from '../../src/world/nav';
import { distToPolyline, forestRelief, roadWeight, Terrain } from '../../src/world/terrain';

// These tests check people's geometry, projection and paint logic, not texture resolution: paint small sheets inline.
personBuildOptions.sheetSize = 256;

let terrain: Terrain;
let colliders: ReturnType<typeof buildStaticColliders>;
let nav: NavGrid;

// Only the Canvas-backed texture boundary is replaced; real residents author their actual positions and collision.
vi.mock('../../src/presentation/buildingTextures', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/presentation/buildingTextures')>(),
  makeTexPair: () => ({ map: new THREE.Texture(), normal: new THREE.Texture() }),
}));

beforeAll(() => {
  terrain = new Terrain();
  colliders = buildStaticColliders();
  const exclusions = new Exclusions(terrain);
  registerFloraColliders(createFloraPopulation(terrain, exclusions), colliders);
  registerScatterColliders(createScatterPopulation(terrain, exclusions), colliders);
  forestLandmarkGeometry(terrain, colliders);
  for (const p of HAMLET_PROPS.barrels) colliders.circle('camp_barrel', p.x, p.z, 0.4);
  for (const p of HAMLET_PROPS.crates) colliders.box('camp_crate', p.x, p.z, 0.45, 0.35, 0);
  const cart = HAMLET_PROPS.handcart;
  colliders.box('camp_handcart', cart.x, cart.z, 0.65, 1.1, cart.yaw);
  colliders.circle('camp_fire', ANCHORS.strand_fire!.x, ANCHORS.strand_fire!.z, 0.7);
  const residents = buildAmbient({ terrain, colliders } as BuildContext);
  residents.dispose?.();
  nav = new NavGrid(terrain, colliders);
});

describe('quiet landing and deepwood arrival', () => {
  it('releases its native landmark geometry, sign surfaces and owned textures once, clearing the scene before fallback cleanup', () => {
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = { width: 0, height: 0, getContext: () => ({ canvas, clearRect() {}, fillText() {} }) };
        return canvas;
      },
    });
    try {
      const handle = buildForestLandmarks(terrain, buildStaticColliders(), 'medium');
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      handle.group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material);
          const textured = material as THREE.MeshStandardMaterial;
          if (textured.map) textures.add(textured.map);
          if (textured.normalMap) textures.add(textured.normalMap);
        }
      });
      expect(geometries.size).toBe(handle.stats.meshes);
      expect(textures.size).toBe(6);
      const disposals = [...geometries, ...materials, ...textures].map((resource) => vi.spyOn(resource, 'dispose'));
      handle.dispose();
      handle.dispose();
      expect(handle.group.children).toHaveLength(0);
      expect(disposals.every((spy) => spy.mock.calls.length === 1)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('wakes on dry, walkable beach sand facing the actual first inland track point', () => {
    expect(shoreDistance(SPAWN.x, SPAWN.z)).toBeGreaterThan(5);
    expect(shoreDistance(SPAWN.x, SPAWN.z)).toBeLessThan(10);
    expect(terrain.heightAt(SPAWN.x, SPAWN.z)).toBeGreaterThan(0.2);
    expect(terrain.heightAt(SPAWN.x, SPAWN.z)).toBeLessThan(1);
    expect(terrain.walkable(SPAWN.x, SPAWN.z, 0.8)).toBe(true);
    const first = ARRIVAL_ROUTE[0]!;
    expect(SPAWN.yaw).toBeCloseTo(Math.atan2(first.x - SPAWN.x, first.z - SPAWN.z));
    expect(nav.findPath(SPAWN, first)).not.toBeNull();
  });

  it('discovers deepwood only after walking into the actual forest rather than on the beach or open dune', () => {
    const place = PLACES.deepwood;
    const inside = (point: V2) => Math.hypot(point.x - place.x, point.z - place.z) < place.r;
    expect(inside(SPAWN)).toBe(false);
    expect(inside(ARRIVAL_ROUTE[0]!)).toBe(false);
    let discovered: V2 | null = null;
    for (let segment = 0; segment < ARRIVAL_ROUTE.length - 1 && !discovered; segment++) {
      const start = ARRIVAL_ROUTE[segment]!;
      const end = ARRIVAL_ROUTE[segment + 1]!;
      const steps = Math.ceil(Math.hypot(end.x - start.x, end.z - start.z));
      for (let step = 0; step <= steps && !discovered; step++) {
        const t = step / steps;
        const point = { x: start.x + (end.x - start.x) * t, z: start.z + (end.z - start.z) * t };
        if (inside(point)) discovered = point;
      }
    }
    expect(discovered).not.toBeNull();
    expect(deepwoodCover(discovered!.x, discovered!.z)).toBeGreaterThan(0.5);
  });

  it('builds finite native landmarks with buried footings and real visible geometry for every obstacle', () => {
    const regions = forestLandmarkGeometry(terrain, { circle: () => undefined, box: () => undefined });
    expect(regions).toHaveLength(FOREST_WAYMARKERS.length + 2);
    for (const [index, region] of regions.entries()) {
      expect(region.tris).toBeGreaterThan(0);
      for (const batch of region.batches.values()) {
        const geometry = batch.toGeometry()!;
        expect(Array.from(geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
        expect(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
        expect(Array.from(geometry.index!.array).every((vertex) => vertex < geometry.getAttribute('position').count)).toBe(true);
        geometry.computeBoundingBox();
        if (index < FOREST_WAYMARKERS.length && batch.key === 'stone') {
          const marker = FOREST_WAYMARKERS[index]!;
          expect(geometry.boundingBox!.min.y).toBeLessThan(terrain.heightAt(marker.x, marker.z));
          expect(geometry.boundingBox!.max.y).toBeGreaterThan(terrain.heightAt(marker.x, marker.z) + 1.25);
        }
        geometry.dispose();
      }
    }
  });

  it('keeps every occupied building and scheduled NPC beyond a real woodland walk', () => {
    const distance = (p: V2) => Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z);
    expect(BUILDINGS.every((building) => distance(building) > 145)).toBe(true);
    const scheduled = NPC_LIST.flatMap((npc) => [npc.home, ...npc.schedule.map((entry) => entry.anchor), ...(npc.overrides ?? []).map((entry) => entry.anchor)]);
    expect(scheduled.every((id) => distance(ANCHORS[id]!) > 150)).toBe(true);
    expect(distance(WAGON)).toBeGreaterThan(150);
    const residents = colliders.all.filter((collider) => collider.id.startsWith('ambient:'));
    expect(residents).toHaveLength(3);
    expect(residents.every((resident) => distance(resident) > 150)).toBe(true);
    expect(DECKS.some((deck) => deck.x < FOREST_REGION.minX)).toBe(false);
    expect(ARRIVAL_WRECK.x).toBeLessThan(FOREST_REGION.minX);
  });

  it('keeps a continuous person-wide road from the sparse strand through woodland to the first hamlet', () => {
    const failures: string[] = [];
    for (let segment = 0; segment < ARRIVAL_ROUTE.length - 1; segment++) {
      const a = ARRIVAL_ROUTE[segment]!;
      const b = ARRIVAL_ROUTE[segment + 1]!;
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.ceil(length);
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
        for (const side of [-1, 0, 1]) {
          const x = p.x - side * (b.z - a.z) / length;
          const z = p.z + side * (b.x - a.x) / length;
          if (!terrain.walkable(x, z, 0.8) || colliders.blocked(x, z, 0.55)) failures.push(`${segment}:${step}:${side}@${x.toFixed(1)},${z.toFixed(1)}`);
        }
      }
    }
    expect(failures).toEqual([]);
    expect(nav.findPath(SPAWN, ANCHORS.overlook_wagon!)).not.toBeNull();
    expect(nav.findPath(ANCHORS.overlook_wagon!, ANCHORS.village_square!)).not.toBeNull();
    expect(INLAND_HAMLET.x).toBeGreaterThan(FOREST_REGION.minX + 145);
    expect(nav.findPath(SPAWN, { x: PALISADE.gate.x, z: (PALISADE.gate.z0 + PALISADE.gate.z1) / 2 })).not.toBeNull();
  });

  it('marks the actual coast/woodland fork with a grounded sign outside the clear arrival lane', () => {
    const junction = ARRIVAL_ROUTE[0]!;
    expect(ROADS[2]!.points[0]).toEqual(junction);
    expect(nav.findPath(SPAWN, { x: ARRIVAL_SIGN.x, z: ARRIVAL_SIGN.z - 1.8 })).not.toBeNull();
    expect(colliders.blocked(ARRIVAL_SIGN.x, ARRIVAL_SIGN.z, 0.55)).toBe(true);
    expect(distToPolyline(ARRIVAL_SIGN.x, ARRIVAL_SIGN.z, ARRIVAL_ROUTE).d).toBeGreaterThan(ARRIVAL_TRAIL_WIDTH / 2 + 1);
    // Physical pointer direction agrees with the route's first inland leg and its destination.
    const pointEast = { x: Math.cos(ARRIVAL_SIGN.yaw), z: -Math.sin(ARRIVAL_SIGN.yaw) };
    expect(pointEast.x * (PLACES.rillford.x - ARRIVAL_SIGN.x) + pointEast.z * (PLACES.rillford.z - ARRIVAL_SIGN.z)).toBeGreaterThan(0);
    expect(ARRIVAL_SIGN.boardWidth).toBeGreaterThan(3);
    for (const segment of [1, 2, 3, 4, 5]) {
      const a = ARRIVAL_ROUTE[segment]!;
      const b = ARRIVAL_ROUTE[segment + 1]!;
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const x = (a.x + b.x) / 2;
      const z = (a.z + b.z) / 2;
      // Both sides of a person-wide strip carry the visible worn-earth layer and have no movement obstacle.
      for (const side of [-1, 0, 1]) {
        const sx = x + side * -(b.z - a.z) / length;
        const sz = z + side * (b.x - a.x) / length;
        expect(roadWeight(sx, sz)).toBeGreaterThan(0.95);
        expect(terrain.walkable(sx, sz, 0.8)).toBe(true);
        expect(colliders.blocked(sx, sz, 0.55)).toBe(false);
      }
    }
  });

  it('adds distinct wooded crests and a dry hollow away from the graded walking road', () => {
    for (const hill of FOREST_HILLS) {
      const near = distToPolyline(hill.x, hill.z, ARRIVAL_ROUTE);
      const a = ARRIVAL_ROUTE[near.seg]!;
      const b = ARRIVAL_ROUTE[near.seg + 1]!;
      const road = { x: a.x + (b.x - a.x) * near.t, z: a.z + (b.z - a.z) * near.t };
      expect(terrain.heightAt(hill.x, hill.z) - terrain.heightAt(road.x, road.z), hill.id).toBeGreaterThan(2.5);
    }
    expect(forestRelief(FOREST_HILLS[0]!.x, FOREST_HILLS[0]!.z)).toBeGreaterThan(8);
    expect(forestRelief(FOREST_SWALE.points[4]!.x, FOREST_SWALE.points[4]!.z)).toBeLessThan(-1.5);
    expect(forestRelief(SPAWN.x, SPAWN.z)).toBe(0);
    expect(FOREST_SWALE.points.every((point) => terrain.heightAt(point.x, point.z) > 0.2)).toBe(true);
    // Traversal stays graded while nearby banks and gullies vary in elevation.
    expect(ARRIVAL_ROUTE.every((point) => Math.abs(forestRelief(point.x, point.z)) < 0.001)).toBe(true);
  });

  it('grounds moved buildings on low terraces without returning a mountain wall to the coast', () => {
    for (const id of ['fisher_house', 'net_store', 'keeper_cottage', 'overlook_lodge']) {
      const b = BUILDINGS.find((building) => building.id === id)!;
      const heights = [-0.4, 0, 0.4].flatMap((sx) => [-0.4, 0, 0.4].map((sz) => terrain.heightAt(b.x + sx * b.w, b.z + sz * b.d)));
      expect(Math.max(...heights) - Math.min(...heights), id).toBeLessThan(0.4);
      expect(Math.min(...heights), id).toBeGreaterThan(0.2);
    }
    expect(Math.max(...ARRIVAL_ROUTE.map((point) => terrain.heightAt(point.x, point.z)))).toBeLessThan(8);
  });

  it('places stewardship traces off the travel lane and keeps their observation approaches reachable', () => {
    for (const marker of FOREST_WAYMARKERS) {
      expect(distToPolyline(marker.x, marker.z, ARRIVAL_ROUTE).d).toBeGreaterThan(4.5);
      expect(colliders.blocked(marker.x, marker.z, 0.4)).toBe(true);
    }
    for (const id of ['arrival_wreckage', 'templar_waymarker']) {
      const inspect = INSPECT_LOCATIONS.find((point) => point.id === id)!;
      const approaches = Array.from({ length: 16 }, (_, index) => ({ x: inspect.x + Math.sin(index / 16 * Math.PI * 2) * 2.4, z: inspect.z + Math.cos(index / 16 * Math.PI * 2) * 2.4 }));
      expect(approaches.some((p) => terrain.walkable(p.x, p.z) && !colliders.blocked(p.x, p.z, 0.55) && nav.findPath(SPAWN, p) !== null), id).toBe(true);
    }
    // The roofless rest-place has actual open entrances; its visual walls alone block movement.
    const spec = FOREST_RUIN;
    const local = (x: number, z: number) => ({ x: spec.x + x * Math.cos(spec.yaw) + z * Math.sin(spec.yaw), z: spec.z - x * Math.sin(spec.yaw) + z * Math.cos(spec.yaw) });
    expect(nav.findPath(local(0, spec.hz + 3), local(0, 0))).not.toBeNull();
    expect(colliders.blocked(local(0, spec.hz).x, local(0, spec.hz).z, 0.55)).toBe(false);
    expect(colliders.blocked(local(spec.hx, 0).x, local(spec.hx, 0).z, 0.55)).toBe(true);
  });
});
