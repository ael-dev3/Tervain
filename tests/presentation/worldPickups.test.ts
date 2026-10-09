import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app';
import { NPCS } from '../../src/content/npcs';
import { isWorldPickupItem, WORLD_PICKUP_ITEM_IDS } from '../../src/content/pickups';
import { S } from '../../src/content/strings';
import { Game } from '../../src/game/game';
import { MemoryStore, SaveStore } from '../../src/platform/storage';
import { finishNpcPath, NpcActor } from '../../src/presentation/actors';
import type { Rig } from '../../src/presentation/characters';
import * as characterPoses from '../../src/presentation/characters';
import { createFloraPopulation, registerFloraColliders } from '../../src/presentation/floraPopulation';
import { forestLandmarkGeometry } from '../../src/presentation/forestLandmarks';
import { chooseInteractable } from '../../src/presentation/interactionTarget';
import { buildHunterSupplies, disposeHunterSupplies, hunterTableSurfaceY } from '../../src/presentation/hunterSupplies';
import { buildInteractables, type Interactable } from '../../src/presentation/interactions';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { buildScenery, type SceneryHandles } from '../../src/presentation/settlement';
import { Exclusions } from '../../src/presentation/vegetation';
import { WorldScene } from '../../src/presentation/world';
import { pickupGeometry, pickupPlacement, setPickupVisible } from '../../src/presentation/worldPickups';
import { buildStaticColliders, Colliders } from '../../src/world/colliders';
import { ANCHORS, ARRIVAL_ROUTE, FOREST_WAYMARKERS, HUNTER_CAMP, HUNTER_SUPPLY, HUNTER_TABLE, hunterStationPoint, PICKUP_LOCATIONS, SPAWN } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { distToPolyline, Terrain } from '../../src/world/terrain';
import { Player } from '../../src/presentation/player';
import type { Collider } from '../../src/world/colliders';

// Keep all authored geometry/populations/physics. Raster painting is unrelated to ground contact and reach.
vi.mock('../../src/presentation/regions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/presentation/regions')>();
  class MaterialSet {
    readonly windowMat = new THREE.MeshBasicMaterial();
    readonly lanternMat = new THREE.MeshBasicMaterial();
    readonly daylightMat = new THREE.MeshBasicMaterial();
    private readonly materials = new Map<string, THREE.Material>([['pane', this.windowMat], ['glow', this.lanternMat], ['daylight', this.daylightMat]]);
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
    expect(Math.max(size.x, size.y, size.z)).toBeLessThan(item === 'hunting_bow' ? 1.4 : 0.9);
    expect(Math.min(size.x, size.y, size.z)).toBeGreaterThan(0.035);
    for (let i = 0; i < position.count; i++) {
      expect(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i)), item).toBe(true);
      expect(Number.isFinite(normal.getX(i) + normal.getY(i) + normal.getZ(i)), item).toBe(true);
    }
    geometry.dispose();
  });

  it('keeps food hand-sized, herbs compact and the hunter kit at usable physical sizes', () => {
    const ranges = {
      shore_apple: [0.10, 0.18], bread: [0.40, 0.60], field_mushroom: [0.14, 0.24],
      healing_herb: [0.45, 0.65], iron_scrap: [0.35, 0.60],
      hunting_bow: [1.2, 1.4], skinning_knife: [.35, .50], arrow: [.60, .80],
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

  it.each(additions.filter((point) => !point.support))('grounds the actual vertices and triangle centres of $id on its terrain', (point) => {
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

  it.each(additions.filter((point) => point.support === 'hunter_table'))('rests the complete $id on the shared horizontal tabletop, inside its edges', (point) => {
    if (!isWorldPickupItem(point.item)) throw new Error('test catalog');
    const { geometry } = pickupGeometry(point.item);
    const matrix = pickupPlacement(geometry, terrain, point), top = hunterTableSurfaceY(terrain);
    const tableMatrix = new THREE.Matrix4().compose(new THREE.Vector3(HUNTER_SUPPLY.x, top, HUNTER_SUPPLY.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), HUNTER_TABLE.yaw), new THREE.Vector3(1, 1, 1));
    const inverse = tableMatrix.invert(), world = new THREE.Vector3(), local = new THREE.Vector3();
    const positions = geometry.getAttribute('position');
    let gap = Infinity;
    for (let i = 0; i < positions.count; i++) {
      world.fromBufferAttribute(positions, i).applyMatrix4(matrix);
      expect(world.y - top, point.id).toBeGreaterThanOrEqual(.000499);
      expect(world.y - terrain.heightAt(world.x, world.z), point.id).toBeGreaterThan(.9);
      local.copy(world).applyMatrix4(inverse);
      expect(Math.abs(local.x), `${point.id} width`).toBeLessThan(HUNTER_TABLE.width / 2 - .025);
      expect(Math.abs(local.z), `${point.id} depth`).toBeLessThan(HUNTER_TABLE.depth / 2 - .025);
      gap = Math.min(gap, world.y - top);
    }
    expect(gap).toBeCloseTo(.0005, 6);
    // Unlike grounded provisions, the top plane remains level even on deliberately steep surrounding terrain.
    const steep = { heightAt: (x: number, z: number) => .3 * x + .2 * z, normalAt: (): [number, number, number] => [-.3, 1, -.2] };
    const tilted = pickupPlacement(geometry, steep, point);
    const up = new THREE.Vector3(0, 1, 0).transformDirection(tilted);
    expect(up.distanceTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(1e-10);
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
  let station: THREE.Group;

  function connectsToArrival(point: { x: number; z: number }, radius = .4): boolean {
    const cell = nav.toCell(point.x, point.z), y = terrain.groundAt(point.x, point.z);
    if (!nav.isBlocked(cell.i, cell.j)) return nav.findPath(SPAWN, point) !== null;
    // Final work/pickup stances can lie in a conservatively blocked 2 m cell. Prove the exact foot endpoint
    // with a continuous capsule sweep from an actually reachable open cell, never with a substituted goal.
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const i = cell.i + dx, j = cell.j + dz;
      if (nav.isBlocked(i, j)) continue;
      const from = nav.cellCenter(i, j), fy = terrain.groundAt(from.x, from.z);
      if (colliders.cast(from.x, from.z, point.x, point.z, radius, undefined,
        { minY: Math.min(fy, y) + .03, maxY: Math.max(fy, y) + 1.9 })) continue;
      const steps = Math.max(1, Math.ceil(Math.hypot(point.x - from.x, point.z - from.z) / .15));
      if (Array.from({ length: steps + 1 }, (_, k) => k / steps).some((t) => !terrain.walkable(from.x + (point.x - from.x) * t, from.z + (point.z - from.z) * t))) continue;
      if (nav.findPath(SPAWN, from) !== null) return true;
    }
    return false;
  }

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
    station = buildHunterSupplies(terrain, colliders);
    forestLandmarkGeometry(terrain, colliders);
    const exclusions = new Exclusions(terrain);
    registerFloraColliders(createFloraPopulation(terrain, exclusions), colliders);
    registerScatterColliders(createScatterPopulation(terrain, exclusions), colliders);
    nav = new NavGrid(terrain, colliders);
    targets = buildInteractables({ game, npcs: [], world: { terrain, scenery } } as unknown as App);
    // Exercise the real state synchronizer without creating a renderer/audio scene.
    scene = Object.assign(Object.create(WorldScene.prototype) as WorldScene, { scenery, colliders, nav, animals: { syncHunting: vi.fn() } });
  }, 20000);

  afterAll(() => {
    scenery?.group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    scenery?.dispose();
    if (station) disposeHunterSupplies(station);
    vi.unstubAllGlobals();
  });

  it('builds a solid grounded counter, behind-face sign mounting, and a clear reachable supplier stance', () => {
    const top = hunterTableSurfaceY(terrain);
    const board = station.getObjectByName('hunter-sign-board') as THREE.Mesh;
    const post = station.getObjectByName('hunter-sign-post') as THREE.Mesh;
    const label = station.getObjectByName('hunter-sign-lettering') as THREE.Mesh;
    const bounds = (mesh: THREE.Mesh) => {
      mesh.geometry.computeBoundingBox();
      return mesh.geometry.boundingBox!.clone().translate(mesh.position);
    };
    expect(bounds(post).max.z).toBeLessThan(bounds(board).min.z);
    expect(label.position.z - bounds(board).max.z).toBeCloseTo(.002, 6);
    expect(bounds(board).min.z).toBeGreaterThan(-HUNTER_TABLE.depth / 2 - .45);
    const legs: THREE.Mesh[] = [];
    station.traverse((object) => { if (object instanceof THREE.Mesh && object.name.startsWith('hunter-table-leg-')) legs.push(object); });
    expect(legs).toHaveLength(4);
    for (const leg of legs) {
      const legBounds = bounds(leg);
      expect(legBounds.max.y).toBeCloseTo(-HUNTER_TABLE.topThickness, 6);
      for (const x of [legBounds.min.x, legBounds.max.x]) for (const z of [legBounds.min.z, legBounds.max.z]) {
        const point = hunterStationPoint(x, z);
        expect(top + legBounds.min.y - terrain.heightAt(point.x, point.z), `${leg.name} foot`).toBeLessThanOrEqual(-.019999);
      }
    }
    const point = ANCHORS.hunter_station!;
    const y = terrain.groundAt(point.x, point.z);
    expect(terrain.walkable(point.x, point.z)).toBe(true);
    expect(y).toBeGreaterThan(.3);
    expect(colliders.blocked(point.x, point.z, .4, { minY: y + .02, maxY: y + 1.9 })).toBe(false);
    expect(connectsToArrival(point), 'exact work stance has no collision-free approach').toBe(true);
    expect(colliders.all.filter((collider) => collider.id.startsWith('hunter_table'))).toHaveLength(10);
  });

  it('places a purposeful dry working camp off the through-road with a reachable shelter and complete hide rack', () => {
    expect(distToPolyline(HUNTER_SUPPLY.x, HUNTER_SUPPLY.z, ARRIVAL_ROUTE).d).toBeGreaterThan(10);
    for (const marker of FOREST_WAYMARKERS) expect(Math.hypot(marker.x - HUNTER_SUPPLY.x, marker.z - HUNTER_SUPPLY.z)).toBeGreaterThan(10);
    for (const anchor of ['hunter_station', 'hunter_shelter', 'hunter_drying_rack']) {
      const point = ANCHORS[anchor]!;
      expect(terrain.groundAt(point.x, point.z), anchor).toBeGreaterThan(.3);
    }
    const sleep = ANCHORS.hunter_shelter!, sleepY = terrain.groundAt(sleep.x, sleep.z);
    expect(colliders.blocked(sleep.x, sleep.z, .35, { minY: sleepY + .03, maxY: sleepY + 1.84 })).toBe(false);
    expect(connectsToArrival(sleep, .35)).toBe(true);
    const work = ANCHORS.hunter_station!;
    for (const [from, to] of [[sleep, work], [work, sleep]]) {
      const path = finishNpcPath(nav.findPath(from!, to!), to!, { terrain, colliders }, 1.836);
      expect(path, 'scheduled day/night route has no path').not.toBeNull();
      expect(path!.at(-1), 'coarse grid leaves Rowan mending away from the counter').toEqual({ x: to!.x, z: to!.z });
    }
    expect(station.getObjectByName('hunter-bedroll')).toBeDefined();
    const roof = station.getObjectByName('hunter-shelter-canvas-roof') as THREE.Mesh;
    const roofCollider = colliders.all.find((shape) => shape.id === 'hunter_shelter_roof')!;
    expect(roofCollider.rockMesh).toBeDefined();
    expect(roofCollider.rockMesh!.indices).toHaveLength(36);
    expect(colliders.rockMeshes.some((shape) => shape.id === 'hunter_shelter_roof'), 'canvas becomes a boulder floor stain').toBe(false);
    const vertex = new THREE.Vector3(), positions = roof.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(roof.matrixWorld);
      expect(vertex.distanceTo(new THREE.Vector3().fromArray(roofCollider.rockMesh!.positions, i * 3))).toBeLessThan(1e-5);
    }
    const shelter = HUNTER_CAMP.shelter;
    const front = hunterStationPoint(shelter.x, shelter.z + shelter.depth / 2 + .65);
    const frontY = terrain.groundAt(front.x, front.z);
    expect(colliders.blocked(front.x, front.z, .4, { minY: frontY + .03, maxY: frontY + 1.9 })).toBe(false);
    expect(connectsToArrival(front)).toBe(true);
    for (let i = 0; i < 3; i++) {
      const skin = station.getObjectByName(`hunter-drying-hide-${i}`) as THREE.Mesh;
      skin.geometry.computeBoundingBox();
      expect(skin.geometry.boundingBox!.max.z - skin.geometry.boundingBox!.min.z, 'hide is only a one-sided card').toBeGreaterThan(.025);
      for (const side of [-1, 1]) {
        const tie = station.getObjectByName(`hunter-hide-tie-${i}-${side}`) as THREE.Mesh;
        expect(tie.position.y - .135 - (skin.position.y + .4)).toBeCloseTo(0, 6);
      }
    }
  });

  it('walks the real overnight schedule back to the exact workbench through the camp and forest collision set', () => {
    // Only GPU-independent joint posing is omitted: the real schedule, A*, capsule movement and terrain run unchanged.
    const pose = vi.spyOn(characterPoses, 'poseRig').mockImplementation(() => {});
    try {
      const hunter = new NpcActor(NPCS.trail_hunter,
        { root: new THREE.Group(), height: 1.836, materials: [], hitFlash: 0 } as unknown as Rig);
      const work = ANCHORS.hunter_station!, home = ANCHORS.hunter_shelter!;
      const ctx = { terrain, colliders, nav, state: game.state, hour: 23,
        player: { x: HUNTER_SUPPLY.x - 12, y: terrain.groundAt(HUNTER_SUPPLY.x - 12, HUNTER_SUPPLY.z - 12), z: HUNTER_SUPPLY.z - 12 },
        reducedMotion: false, onBark: vi.fn(() => false) };
      hunter.update(1 / 60, ctx);
      // Asleep on his bedroll at the shelter, not vanished (A70).
      expect(hunter.hidden).toBe(false);
      expect(hunter.lie).toBe(1);
      expect({ x: hunter.x, z: hunter.z }).toEqual({ x: home.x, z: home.z });
      ctx.hour = 7;
      let elapsed = 0, maxStep = 0;
      for (let frame = 0; frame < 1800; frame++) {
        const x = hunter.x, z = hunter.z;
        hunter.update(1 / 60, ctx);
        elapsed += 1 / 60;
        maxStep = Math.max(maxStep, Math.hypot(hunter.x - x, hunter.z - z));
        if (hunter.mode === 'work') break;
      }
      expect(hunter.hidden).toBe(false);
      expect(hunter.mode, `return stalls after ${elapsed.toFixed(2)} s at ${hunter.x}, ${hunter.z}`).toBe('work');
      expect(elapsed).toBeGreaterThan(3);
      expect(maxStep, 'scheduled resident teleports rather than walking the approach').toBeLessThan(.027);
      expect(Math.hypot(hunter.x - work.x, hunter.z - work.z)).toBeLessThan(.06);
      for (let i = 0; i < 300; i++) hunter.update(1 / 60, ctx);
      expect(Math.atan2(Math.sin(hunter.yaw - work.yaw), Math.cos(hunter.yaw - work.yaw))).toBeCloseTo(0, 4);
      expect(pose).toHaveBeenLastCalledWith(hunter.rig, expect.objectContaining({ mode: 'work', workGesture: 'provisioning' }), 1 / 60);
      ctx.hour = 23;
      for (let i = 0; i < 1800 && hunter.lie < 1; i++) hunter.update(1 / 60, ctx);
      expect(hunter.lie, 'night return never reaches the shelter and lies down (A70)').toBe(1);
      expect(hunter.hidden).toBe(false);
      expect(Math.hypot(hunter.x - home.x, hunter.z - home.z)).toBeLessThan(.35);
    } finally { pose.mockRestore(); }
  });

  it('keeps quest tools/rewards intact with 32 provisions and three one-time hunter supplies in eight batches', () => {
    expect(additions).toHaveLength(35);
    expect(new Set(PICKUP_LOCATIONS.map((point) => point.id)).size).toBe(PICKUP_LOCATIONS.length);
    expect(PICKUP_LOCATIONS.filter((point) => !isWorldPickupItem(point.item)).map((point) => point.id)).toEqual(['quarry_brace', 'quarry_wrench', 'side_path_cache', 'wreck_blade']);
    for (const point of additions) {
      expect(point.qty, point.id).toBe(point.id === 'hunter_arrows' ? 24 : 1);
      expect(scenery.pickups[point.id]?.userData.pickupInstance, point.id).toBeDefined();
    }
    const batches: THREE.InstancedMesh[] = [];
    scenery.group.traverse((object) => { if (object instanceof THREE.InstancedMesh && object.name.startsWith('loose-')) batches.push(object); });
    expect(batches).toHaveLength(8);
    expect(batches.reduce((n, mesh) => n + mesh.count, 0)).toBe(35);
    const triangles = batches.reduce((n, mesh) => n + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3 * mesh.count, 0);
    expect(triangles).toBeLessThan(18000);
  });

  function stationHarness() {
    const stationGame = new Game();
    // Exercise the real schedule and production player-contact construction; GPU surfaces are irrelevant to reach.
    const hunter = new NpcActor(NPCS.trail_hunter, { root: new THREE.Group() } as Rig);
    hunter.snapToGoal({ terrain, colliders, nav, state: stationGame.state, hour: 12,
      player: { x: HUNTER_SUPPLY.x, y: terrain.groundAt(HUNTER_SUPPLY.x, HUNTER_SUPPLY.z), z: HUNTER_SUPPLY.z },
      reducedMotion: true, onBark: () => false });
    const people = Reflect.apply(Reflect.get(Player.prototype, 'contacts'), Object.create(Player.prototype),
      [{ game: stationGame, npcs: [hunter], enemies: [] }]) as Collider[];
    const audio = { interact: vi.fn(), pickup: vi.fn() };
    const hud = { setPrompt: vi.fn(), toast: vi.fn() };
    const openHuntingNotes = vi.fn();
    const app = Object.assign(Object.create(App.prototype) as App, {
      game: stationGame, npcs: [hunter], enemies: [], mode: 'play', panels: { isOpen: false },
      worldBuilding: false, worldBuildFailed: false, qualityReload: null,
      world: { terrain, scenery, colliders, physics: { holding: false, candidate: () => null, occludedByProp: () => false, release: vi.fn() } },
      input: { label: () => 'E', pressed: (action: string) => action === 'interact' },
      player: { x: 0, y: 0, z: 0, yaw: 0, state: 'free' }, cam: { yaw: 0 },
      audio, hud, openHuntingNotes, observeNpc: vi.fn(),
    });
    const items = buildInteractables(app);
    Object.assign(app, { interactables: items });
    const frontStances = (target: Interactable) => {
      const pos = target.pos();
      return [-1.55, -1.25, -.9, -.6, 0, .6, .9, 1.25, 1.55].flatMap((x) => [1.23, 1.4, 1.6, 1.9].map((z) => {
        const point = hunterStationPoint(x, z), y = terrain.groundAt(point.x, point.z);
        return { ...point, y, yaw: Math.atan2(pos.x - point.x, pos.z - point.z), state: 'free' as const };
      })).filter((actor) => {
        const bounds = { minY: actor.y + .03, maxY: actor.y + 1.9 };
        const resolved = colliders.resolve(actor.x, actor.z, .4, undefined, bounds, people);
        return terrain.walkable(actor.x, actor.z) && !colliders.blocked(actor.x, actor.z, .4, bounds)
          && Math.hypot(resolved.x - actor.x, resolved.z - actor.z) < 1e-6
          && chooseInteractable([target], actor, actor.yaw, terrain, colliders) === target;
      });
    };
    const pressE = (actor: ReturnType<typeof frontStances>[number]) => {
      Object.assign(app, { player: actor, cam: { yaw: actor.yaw } });
      Reflect.apply(Reflect.get(App.prototype, 'updateInteraction'), app, []);
    };
    return { stationGame, hunter, people, app, items, audio, hud, openHuntingNotes, frontStances, pressE };
  }

  it.each(['pickup:hunter_bow', 'pickup:hunter_knife', 'pickup:hunter_arrows', 'hunter_notes', 'hunter_restock', 'hunter_sell_meat'])
  ('offers %s from a real front stance, retaining intervening-wall occlusion and the scheduled hunter’s collision', (id) => {
    const harness = stationHarness();
    harness.stationGame.state.inventory.animal_hide = 1;
    harness.stationGame.state.inventory.raw_meat = 1;
    const target = harness.items.find((item) => item.id === id)!;
    const stances = harness.frontStances(target);
    expect(stances.length, id).toBeGreaterThan(0);
    if (id === 'hunter_restock') {
      expect(target.ignoreColliders).toBeUndefined();
      expect(target.pos().y).toBeGreaterThan(hunterTableSurfaceY(terrain));
      expect(stances.some((actor) => chooseInteractable(harness.items, actor, actor.yaw, terrain, colliders) === target),
        'scheduled hunter or pickups mask every restock stance').toBe(true);
    }
    const actor = stances[0]!, pos = target.pos();
    const blocked = new Colliders();
    for (const shape of colliders.all) blocked.add({ ...shape });
    blocked.box('hunter-intervening-wall', (actor.x + pos.x) / 2, (actor.z + pos.z) / 2, .7, .035,
      Math.atan2(pos.x - actor.x, pos.z - actor.z), true, { minY: actor.y, maxY: actor.y + 3 });
    expect(chooseInteractable([target], actor, actor.yaw, terrain, blocked), id).toBeNull();
  });

  it('takes the tabletop bow on the first E press through the actual app action and preserves its original save identity', () => {
    const harness = stationHarness(), target = harness.items.find((item) => item.id === 'pickup:hunter_bow')!;
    const actor = harness.frontStances(target).find((stance) => chooseInteractable(harness.items, stance, stance.yaw, terrain, colliders) === target);
    expect(actor, 'bow is never selected by the complete interaction list').toBeDefined();
    harness.pressE(actor!);
    expect(harness.audio.interact).toHaveBeenCalledOnce();
    expect(harness.audio.pickup).toHaveBeenCalledWith('hunting_bow');
    expect(harness.stationGame.state.inventory.hunting_bow).toBe(1);
    expect(harness.stationGame.state.locationChanges['pickup:hunter_bow']).toBe('taken');
    expect(target.enabled()).toBe(false);
    expect(harness.stationGame.state.locationChanges['pickup:hunter_knife']).toBeUndefined();
    expect(harness.stationGame.state.locationChanges['pickup:hunter_arrows']).toBeUndefined();
    scene.syncStatic(harness.stationGame.state);
    expect(scenery.pickups.hunter_bow!.visible).toBe(false);
    expect(scenery.pickups.hunter_knife!.visible).toBe(true);
    const saves = new SaveStore(new MemoryStore(), () => 1000);
    expect(saves.save('slot-1', harness.stationGame.state).ok).toBe(true);
    const restored = saves.load('slot-1');
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.state.inventory.hunting_bow).toBe(1);
      expect(restored.state.locationChanges['pickup:hunter_bow']).toBe('taken');
    }
    const duplicate = harness.stationGame.dispatch({ t: 'pickup', pickupId: 'hunter_bow', item: 'hunting_bow', qty: 1 });
    expect(duplicate.ok).toBe(false);
    expect(harness.stationGame.state.inventory.hunting_bow).toBe(1);
    scene.syncStatic(game.state);
  });

  it('lets a front-side E press trade a hide for arrows while the actual scheduled hunter remains present', () => {
    const harness = stationHarness();
    harness.stationGame.state.inventory.animal_hide = 1;
    harness.stationGame.state.inventory.arrow = 24;
    for (const id of ['hunter_bow', 'hunter_knife', 'hunter_arrows']) harness.stationGame.state.locationChanges[`pickup:${id}`] = 'taken';
    const target = harness.items.find((item) => item.id === 'hunter_restock')!;
    const actor = harness.frontStances(target).find((stance) => chooseInteractable(harness.items, stance, stance.yaw, terrain, colliders) === target);
    expect(harness.hunter.hidden).toBe(false);
    expect(harness.people).toHaveLength(1);
    expect(harness.people[0]!.id).toBe('person:trail_hunter');
    expect(actor, 'NPC selection/collision leaves no complete-list restock stance').toBeDefined();
    harness.pressE(actor!);
    expect(harness.stationGame.state.inventory.animal_hide).toBe(0);
    expect(harness.stationGame.state.inventory.arrow).toBe(30);
    expect(harness.audio.pickup).toHaveBeenCalledOnce();
  });

  it('opens the physical sign notes from the front once supplies are taken and no hide trade is available', () => {
    const harness = stationHarness();
    for (const id of ['hunter_bow', 'hunter_knife', 'hunter_arrows']) harness.stationGame.state.locationChanges[`pickup:${id}`] = 'taken';
    const target = harness.items.find((item) => item.id === 'hunter_notes')!;
    const actor = harness.frontStances(target).find((stance) => chooseInteractable(harness.items, stance, stance.yaw, terrain, colliders) === target);
    expect(actor, 'physical board is never selected from the counter front').toBeDefined();
    harness.pressE(actor!);
    expect(harness.openHuntingNotes).toHaveBeenCalledOnce();
  });

  it('sells one piece of game for Rillford on E, records the delivery and persists the atomic trade', () => {
    const harness = stationHarness();
    harness.stationGame.state.inventory.raw_meat = 1;
    for (const id of ['hunter_bow', 'hunter_knife', 'hunter_arrows']) harness.stationGame.state.locationChanges[`pickup:${id}`] = 'taken';
    const target = harness.items.find((item) => item.id === 'hunter_sell_meat')!;
    const actor = harness.frontStances(target).find((stance) => chooseInteractable(harness.items, stance, stance.yaw, terrain, colliders) === target);
    expect(actor, 'NPC selection/collision leaves no meat-delivery stance').toBeDefined();
    const coin = harness.stationGame.state.inventory.coin!;
    harness.pressE(actor!);
    expect(harness.stationGame.state.inventory.raw_meat).toBe(0);
    expect(harness.stationGame.state.inventory.coin).toBe(coin + 2);
    expect(harness.stationGame.state.facts.hunter_game_delivered).toBe(true);
    expect(harness.stationGame.state.npcs.trail_hunter.met).toBe(true);
    expect(harness.audio.pickup).toHaveBeenCalledOnce();
    const saves = new SaveStore(new MemoryStore(), () => 1000);
    expect(saves.save('slot-1', harness.stationGame.state).ok).toBe(true);
    const restored = saves.load('slot-1');
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.state.inventory.raw_meat).toBe(0);
      expect(restored.state.inventory.coin).toBe(coin + 2);
      expect(restored.state.facts.hunter_game_delivered).toBe(true);
    }
  });

  it.each(additions)('makes $id reachable from the arrival through the full authored obstacle set', (point) => {
    const target = targets.find((item) => item.id === `pickup:${point.id}`)!;
    expect(target).toBeDefined();
    expect(target.ignoreColliders).toBeUndefined();
    expect(target.prompt()).toBe(S('prompt.pickup', { name: S(`item.${point.item}`) }));
    expect(target.prompt()).not.toContain('prompt.');
    const object = scenery.pickups[point.id]!;
    const link = object.userData.pickupInstance as MeshLink;
    const worldBox = link.mesh.geometry.boundingBox!.clone().applyMatrix4(link.matrix);
    expect(colliders.blocked(point.x, point.z, 0.15, { minY: worldBox.min.y + 0.02, maxY: worldBox.max.y }), `${point.id} embedded in scenery`).toBe(false);

    // Demand a real standing endpoint plus the exact interaction ray, rather than accepting nearestOpen's substitution.
    const approaches = Array.from({ length: 16 }, (_, i) => {
      const a = i * Math.PI * 2 / 16;
      const reach = point.support === 'hunter_table' ? 1.3 : .8;
      const x = point.x + Math.cos(a) * reach, z = point.z + Math.sin(a) * reach;
      const y = terrain.groundAt(x, z), yaw = Math.atan2(point.x - x, point.z - z);
      return { x, y, z, yaw };
    }).filter((actor) => terrain.walkable(actor.x, actor.z) && !colliders.blocked(actor.x, actor.z, 0.4, { minY: actor.y + 0.03, maxY: actor.y + 1.9 }) && chooseInteractable([target], actor, actor.yaw, terrain, colliders) === target);
    expect(approaches.length, `${point.id}: no finite unobstructed standing reach`).toBeGreaterThan(0);
    const approach = approaches.find((actor) => {
      const cell = nav.toCell(actor.x, actor.z);
      if (!nav.isBlocked(cell.i, cell.j)) return nav.findPath(SPAWN, actor) !== null;
      if (point.support !== 'hunter_table') return false;
      return connectsToArrival(actor);
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
    const point = additions.find((candidate) => candidate.item === 'shore_apple')!;
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
