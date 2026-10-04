import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { App } from '../../src/app';
import { isWorldPickupItem, WORLD_PICKUP_ITEM_IDS } from '../../src/content/pickups';
import { S } from '../../src/content/strings';
import { Game } from '../../src/game/game';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { forestLandmarkGeometry } from '../../src/presentation/forestLandmarks';
import { chooseInteractable } from '../../src/presentation/interactionTarget';
import { buildInteractables, type Interactable } from '../../src/presentation/interactions';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { buildScenery, type SceneryHandles } from '../../src/presentation/settlement';
import { Exclusions } from '../../src/presentation/vegetation';
import { WorldScene } from '../../src/presentation/world';
import { pickupGeometry, pickupPlacement, setPickupVisible } from '../../src/presentation/worldPickups';
import { buildStaticColliders, Colliders } from '../../src/world/colliders';
import { PICKUP_LOCATIONS, SPAWN } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { Terrain } from '../../src/world/terrain';

// Keep all authored geometry/populations/physics. Raster painting is unrelated to ground contact and reach.
vi.mock('../../src/presentation/regions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/presentation/regions')>();
  class MaterialSet {
    readonly windowMat = new THREE.MeshBasicMaterial();
    readonly lanternMat = new THREE.MeshBasicMaterial();
    private readonly materials = new Map<string, THREE.Material>([['pane', this.windowMat], ['glow', this.lanternMat]]);
    get(key: string) {
      if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial());
      return this.materials.get(key)!;
    }
    dispose() { for (const material of this.materials.values()) material.dispose(); }
  }
  return { ...actual, MaterialSet };
});

const additions = PICKUP_LOCATIONS.filter((point) => isWorldPickupItem(point.item));
type MeshLink = { mesh: THREE.InstancedMesh; index: number; matrix: THREE.Matrix4 };

describe('original loose pickup geometry', () => {
  const terrain = new Terrain();
  it.each(WORLD_PICKUP_ITEM_IDS)('gives %s a readable finite solid silhouette within its modest geometry budget', (item) => {
    const { geometry } = pickupGeometry(item);
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const count = geometry.index?.count ?? position.count;
    const size = geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(count / 3).toBeGreaterThan(50);
    expect(count / 3).toBeLessThan(1400);
    expect(Math.max(size.x, size.y, size.z)).toBeGreaterThan(0.1);
    expect(Math.max(size.x, size.y, size.z)).toBeLessThan(0.9);
    expect(Math.min(size.x, size.y, size.z)).toBeGreaterThan(0.035);
    for (let i = 0; i < position.count; i++) {
      expect(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i)), item).toBe(true);
      expect(Number.isFinite(normal.getX(i) + normal.getY(i) + normal.getZ(i)), item).toBe(true);
    }
    geometry.dispose();
  });

  it('keeps food hand-sized and gathered herbs compact rather than enlarging them for visibility', () => {
    const ranges = {
      shore_apple: [0.10, 0.18], bread: [0.40, 0.60], field_mushroom: [0.14, 0.24],
      healing_herb: [0.45, 0.65], iron_scrap: [0.35, 0.60],
    } as const;
    for (const item of WORLD_PICKUP_ITEM_IDS) {
      const { geometry } = pickupGeometry(item);
      const size = geometry.boundingBox!.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z);
      expect(extent, item).toBeGreaterThan(ranges[item][0]);
      expect(extent, item).toBeLessThan(ranges[item][1]);
      geometry.dispose();
    }
  });

  it.each(additions)('grounds the actual vertices and triangle centres of $id on its terrain', (point) => {
    if (!isWorldPickupItem(point.item)) throw new Error('test catalog');
    const { geometry } = pickupGeometry(point.item);
    const matrix = pickupPlacement(geometry, terrain, point);
    const vertices = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    let gap = Infinity;
    for (let i = 0; i < vertices.count; i++) {
      vertex.fromBufferAttribute(vertices, i).applyMatrix4(matrix);
      const dy = vertex.y - terrain.heightAt(vertex.x, vertex.z);
      expect(dy, `${point.id} vertex ${i}`).toBeGreaterThanOrEqual(-1e-6);
      gap = Math.min(gap, dy);
    }
    const indices = geometry.index;
    const count = indices?.count ?? vertices.count;
    const centre = new THREE.Vector3(), corner = new THREE.Vector3();
    for (let i = 0; i < count; i += 3) {
      centre.set(0, 0, 0);
      for (let j = 0; j < 3; j++) centre.add(corner.fromBufferAttribute(vertices, indices?.getX(i + j) ?? i + j));
      centre.multiplyScalar(1 / 3).applyMatrix4(matrix);
      const dy = centre.y - terrain.heightAt(centre.x, centre.z);
      expect(dy, `${point.id} face ${i / 3}`).toBeGreaterThanOrEqual(-1e-5);
      gap = Math.min(gap, dy);
    }
    // Terrain-edge contact may fall between our independent vertex/centre samples on a tilted lower face.
    expect(gap, point.id).toBeLessThan(0.003);
    geometry.dispose();
  });

  it('grounds a face against a terrain diagonal even when neither its vertices nor its centre touches the ridge', () => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 0, -0.5), new THREE.Vector3(-0.5, 0, 0.5),
    ]);
    // Within this real 2 m grid cell, both rendered triangle grades meet on x + z = 2.
    const ridge = { heightAt: (x: number, z: number) => 1 - Math.abs(x + z - 2), normalAt: (): [number, number, number] => [0, 1, 0] };
    const matrix = pickupPlacement(geometry, ridge, { x: 1.2, z: 1.2 });
    expect(matrix.elements[13]).toBeCloseTo(1, 10);
    const edgeContact = new THREE.Vector3(-0.2, 0, -0.2).applyMatrix4(matrix);
    expect(edgeContact.y - ridge.heightAt(edgeContact.x, edgeContact.z)).toBeCloseTo(0, 10);
    geometry.dispose();
  });
});

describe('persistent reachable world pickups with full scenery and vegetation', () => {
  const terrain = new Terrain();
  const game = new Game();
  let colliders: Colliders;
  let scenery: SceneryHandles;
  let targets: Interactable[];
  let nav: NavGrid;
  let scene: WorldScene;

  beforeAll(() => {
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = { width: 0, height: 0, getContext: () => context };
        const context = new Proxy<Record<string, unknown>>({
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
        }, { get: (target, key) => target[String(key)] ?? (() => {}) });
        return canvas;
      },
    });
    colliders = buildStaticColliders(terrain);
    scenery = buildScenery(terrain, colliders, 'low');
    forestLandmarkGeometry(terrain, colliders);
    const exclusions = new Exclusions(terrain);
    registerFloraColliders(createFloraPopulation(terrain, exclusions), colliders);
    registerScatterColliders(createScatterPopulation(terrain, exclusions), colliders);
    nav = new NavGrid(terrain, colliders);
    targets = buildInteractables({ game, npcs: [], world: { terrain, scenery } } as unknown as App);
    // Exercise the real state synchronizer without creating a renderer/audio scene.
    scene = Object.assign(Object.create(WorldScene.prototype) as WorldScene, { scenery, colliders, nav });
  }, 20000);

  afterAll(() => {
    scenery?.group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    scenery?.dispose();
    vi.unstubAllGlobals();
  });

  it('keeps quest tools/rewards intact and adds 32 one-time native items in only five batches', () => {
    expect(additions).toHaveLength(32);
    expect(new Set(PICKUP_LOCATIONS.map((point) => point.id)).size).toBe(PICKUP_LOCATIONS.length);
    expect(PICKUP_LOCATIONS.filter((point) => !isWorldPickupItem(point.item)).map((point) => point.id)).toEqual(['quarry_brace', 'quarry_wrench', 'side_path_cache', 'wreck_blade']);
    for (const point of additions) {
      expect(point.qty, point.id).toBe(1);
      expect(scenery.pickups[point.id]?.userData.pickupInstance, point.id).toBeDefined();
    }
    const batches: THREE.InstancedMesh[] = [];
    scenery.group.traverse((object) => { if (object instanceof THREE.InstancedMesh && object.name.startsWith('loose-')) batches.push(object); });
    expect(batches).toHaveLength(5);
    expect(batches.reduce((n, mesh) => n + mesh.count, 0)).toBe(32);
    const triangles = batches.reduce((n, mesh) => n + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3 * mesh.count, 0);
    expect(triangles).toBeLessThan(18000);
  });

  it.each(additions)('makes $id reachable from the arrival through the full authored obstacle set', (point) => {
    const target = targets.find((item) => item.id === `pickup:${point.id}`)!;
    expect(target).toBeDefined();
    expect(target.ignoreColliders).toBeUndefined();
    expect(target.prompt()).toBe(S('prompt.pickup', { name: S(point.nameKey) }));
    expect(target.prompt()).not.toContain('prompt.');
    const object = scenery.pickups[point.id]!;
    const link = object.userData.pickupInstance as MeshLink;
    const worldBox = link.mesh.geometry.boundingBox!.clone().applyMatrix4(link.matrix);
    expect(colliders.blocked(point.x, point.z, 0.15, { minY: worldBox.min.y + 0.02, maxY: worldBox.max.y }), `${point.id} embedded in scenery`).toBe(false);

    // Demand a real standing endpoint plus the exact interaction ray, rather than accepting nearestOpen's substitution.
    const approaches = Array.from({ length: 16 }, (_, i) => {
      const a = i * Math.PI * 2 / 16;
      const x = point.x + Math.cos(a) * 0.8, z = point.z + Math.sin(a) * 0.8;
      const y = terrain.groundAt(x, z), yaw = Math.atan2(point.x - x, point.z - z);
      return { x, y, z, yaw };
    }).filter((actor) => terrain.walkable(actor.x, actor.z) && !colliders.blocked(actor.x, actor.z, 0.4, { minY: actor.y + 0.03, maxY: actor.y + 1.9 }) && chooseInteractable([target], actor, actor.yaw, terrain, colliders) === target);
    expect(approaches.length, `${point.id}: no finite unobstructed standing reach`).toBeGreaterThan(0);
    const approach = approaches.find((actor) => {
      const cell = nav.toCell(actor.x, actor.z);
      return !nav.isBlocked(cell.i, cell.j) && nav.findPath(SPAWN, actor) !== null;
    });
    expect(approach, `${point.id}: not connected to the arrival route`).toBeDefined();

    const actor = approaches[0]!;
    expect(chooseInteractable([target], { ...actor, y: actor.y + 6 }, actor.yaw, terrain, colliders)).toBeNull();
    const distant = { x: point.x - Math.sin(actor.yaw) * (target.r + 1), z: point.z - Math.cos(actor.yaw) * (target.r + 1), y: actor.y, yaw: actor.yaw };
    expect(chooseInteractable([target], distant, distant.yaw, terrain, colliders)).toBeNull();
    const blocked = new Colliders();
    for (const shape of colliders.all) blocked.add({ ...shape });
    blocked.box('temporary-intervening-wall', (actor.x + point.x) / 2, (actor.z + point.z) / 2, 0.5, 0.5, 0, true, { minY: Math.min(actor.y, worldBox.min.y), maxY: actor.y + 3 });
    expect(chooseInteractable([target], actor, actor.yaw, terrain, blocked), `${point.id}: wall bypass`).toBeNull();
  });

  it('hides a taken native instance on the same state sync, disables its prompt and restores the exact matrix on new-game sync', () => {
    const point = additions[0]!;
    const target = targets.find((item) => item.id === `pickup:${point.id}`)!;
    const object = scenery.pickups[point.id]!;
    const neighbour = scenery.pickups[additions.find((other) => other.id !== point.id && other.item === point.item)!.id]!;
    const link = object.userData.pickupInstance as MeshLink;
    const otherLink = neighbour.userData.pickupInstance as MeshLink;
    game.state.locationChanges[`pickup:${point.id}`] = 'taken';
    scene.syncStatic(game.state);
    const matrix = new THREE.Matrix4(), untouched = new THREE.Matrix4();
    link.mesh.getMatrixAt(link.index, matrix);
    otherLink.mesh.getMatrixAt(otherLink.index, untouched);
    expect(matrix.determinant()).toBe(0);
    expect(object.visible).toBe(false);
    expect(target.enabled()).toBe(false);
    expect(untouched.elements).toEqual(otherLink.matrix.elements.map(Math.fround));

    const initial = new Game().state;
    scene.syncStatic(initial);
    link.mesh.getMatrixAt(link.index, matrix);
    expect(object.visible).toBe(true);
    expect(matrix.elements).toEqual(link.matrix.elements.map(Math.fround));
    game.replaceState(initial);
    expect(target.enabled()).toBe(true);
  });

  it('preserves the visibility contract of original quest pickup groups', () => {
    const object = scenery.pickups.quarry_brace!;
    setPickupVisible(object, false); expect(object.visible).toBe(false);
    setPickupVisible(object, true); expect(object.visible).toBe(true);
  });
});
