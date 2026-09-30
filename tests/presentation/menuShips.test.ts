import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MENU_CAMERA } from '../../src/presentation/menu/menuLayout';
import { MENU_SEA_LEVEL } from '../../src/presentation/menu/menuSky';
import { buildMenuFar } from '../../src/presentation/menu/menuFar';
import {
  buildMenuShips, generateMenuShipRoutes, isMenuShipOpenWater, sampleMenuShipRoute,
  type MenuShipQuality,
} from '../../src/presentation/menu/menuShips';

const qualities: MenuShipQuality[] = ['low', 'medium', 'high'];
const fleets: ReturnType<typeof buildMenuShips>[] = [];
function fleet(seed = 5, quality: MenuShipQuality = 'high') {
  const ships = buildMenuShips(seed, quality);
  fleets.push(ships);
  return ships;
}

function assets(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const m of Array.isArray(object.material) ? object.material : [object.material]) materials.add(m);
  });
  return { geometries, materials };
}

function transforms(group: THREE.Group) {
  const numbers: number[] = [];
  group.traverse((object) => numbers.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()));
  return numbers;
}

describe('menu sea traffic', () => {
  afterEach(() => {
    for (const ships of fleets.splice(0)) ships.dispose();
  });

  it('varies voyages by launch seed while keeping both crossing directions and modest speeds on every preset', () => {
    for (let seed = 0; seed < 32; seed++) {
      const low = generateMenuShipRoutes(seed, 'low');
      const medium = generateMenuShipRoutes(seed, 'medium');
      expect(medium.slice(0, low.length)).toEqual(low);
      expect(generateMenuShipRoutes(seed, 'high')).toEqual(medium);
    }
    for (const quality of qualities) {
      for (let seed = 0; seed < 32; seed++) {
        const routes = generateMenuShipRoutes(seed, quality);
        expect(routes).toEqual(generateMenuShipRoutes(seed, quality));
        expect(routes).not.toEqual(generateMenuShipRoutes(seed + 1, quality));
        expect(routes.length).toBeGreaterThanOrEqual(2);
        expect(routes.length).toBeLessThanOrEqual(3);
        expect(routes.some((r) => r.end.x > r.start.x)).toBe(true);
        expect(routes.some((r) => r.end.x < r.start.x)).toBe(true);
        for (const route of routes) {
          expect(route.speed).toBeGreaterThan(0);
          expect(route.speed).toBeLessThan(4);
          expect(route.period).toBeGreaterThan(180);
          expect(route.phase).toBeGreaterThanOrEqual(0);
          expect(route.phase).toBeLessThan(1);
          expect(route.period * route.speed).toBeCloseTo(Math.hypot(route.end.x - route.start.x, route.end.z - route.start.z), 5);
          expect([route.start.x, route.start.z, route.end.x, route.end.z, route.size, route.variant].every(Number.isFinite)).toBe(true);
        }
      }
    }
  });

  it('sails forward at a continuous bounded pace and fades completely before each voyage wraps', () => {
    for (const route of generateMenuShipRoutes(71)) {
      const r = { ...route, phase: 0 };
      const mid = sampleMenuShipRoute(r, r.period / 2);
      const after = sampleMenuShipRoute(r, r.period / 2 + 1);
      expect(Math.hypot(after.x - mid.x, after.z - mid.z)).toBeCloseTo(r.speed, 6);
      const direction = new THREE.Vector3(r.end.x - r.start.x, 0, r.end.z - r.start.z).normalize();
      const bow = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), mid.heading);
      expect(bow.dot(direction)).toBeCloseTo(1, 6);
      expect(mid.opacity).toBe(1);
      expect(sampleMenuShipRoute(r, 0).opacity).toBe(0);
      expect(sampleMenuShipRoute(r, r.period).opacity).toBe(0);
      for (const t of [r.period - 0.01, r.period + 0.01]) expect(sampleMenuShipRoute(r, t).opacity).toBeLessThan(0.001);
      for (let i = 0; i <= 100; i++) {
        const p = sampleMenuShipRoute(r, (r.period * i) / 100);
        expect([p.x, p.z, p.heading, p.opacity].every(Number.isFinite)).toBe(true);
        expect(p.opacity).toBeGreaterThanOrEqual(0);
        expect(p.opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the shipping corridor clear of the actual far headlands and coast geometry', () => {
    const noise = new THREE.Texture();
    const far = buildMenuFar(noise);
    far.group.updateMatrixWorld(true);
    const land = far.group.children.filter((o) => /Headland|Wood_Hill|Far_Coast/.test(o.name));
    const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
    try {
      for (let seed = 0; seed < 8; seed++) {
        for (const route of generateMenuShipRoutes(seed)) {
          const r = { ...route, phase: 0 };
          for (let i = 0; i <= 24; i++) {
            const p = sampleMenuShipRoute(r, r.period * i / 24);
            expect(isMenuShipOpenWater(p.x, p.z)).toBe(true);
            // Include the bowsprit and furthest sail/rigging corners, not only each route's centreline.
            for (const [dx, dz] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) {
              expect(isMenuShipOpenWater(p.x + dx!, p.z + dz!)).toBe(true);
            }
            ray.ray.origin.set(p.x, 120, p.z);
            const aboveWater = ray.intersectObjects(land, false).filter((hit) => hit.point.y > MENU_SEA_LEVEL - 0.5);
            expect(aboveWater, `seed ${seed} at (${p.x}, ${p.z})`).toHaveLength(0);
          }
        }
      }
    } finally {
      far.dispose();
      noise.dispose();
    }
  });

  it('starts with a visible voyage in the sea beside the central menu choices', () => {
    const camera = new THREE.PerspectiveCamera(MENU_CAMERA.fov, 16 / 9, 0.2, 2600);
    camera.position.set(MENU_CAMERA.x, MENU_CAMERA.y, MENU_CAMERA.z);
    camera.lookAt(MENU_CAMERA.lookX, MENU_CAMERA.lookY, MENU_CAMERA.lookZ);
    camera.updateMatrixWorld(true);
    for (const quality of qualities) {
      for (let seed = 0; seed < 32; seed++) {
        const projected = generateMenuShipRoutes(seed, quality).map((r) => {
          const p = sampleMenuShipRoute(r, 0);
          return { opacity: p.opacity, screen: new THREE.Vector3(p.x, MENU_SEA_LEVEL + 10, p.z).project(camera) };
        });
        expect(projected.some(({ opacity, screen }) => opacity > 0.5 && screen.x > 0.3 && screen.x < 0.9 && Math.abs(screen.y) < 1 && Math.abs(screen.z) < 1), `${quality}, seed ${seed}`).toBe(true);
      }
    }
  });

  it('uses finite original low-poly geometry and preserves assets when routes are regenerated', () => {
    for (const quality of qualities) {
      const ships = fleet(123, quality);
      const before = assets(ships.group);
      expect(ships.stats.ships).toBe(ships.routes.length);
      expect(ships.stats.meshes).toBeLessThanOrEqual(12);
      expect(ships.stats.triangles).toBeGreaterThan(100);
      expect(ships.stats.triangles).toBeLessThan(12000);
      for (const geometry of before.geometries) {
        for (const attr of ['position', 'normal']) {
          const values = geometry.getAttribute(attr);
          if (values) expect(Array.from(values.array).every(Number.isFinite)).toBe(true);
        }
      }
      const firstRoutes = structuredClone(ships.routes);
      ships.update(30);
      ships.reset(124);
      expect(ships.routes).not.toEqual(firstRoutes);
      expect(ships.routes).toEqual(generateMenuShipRoutes(124, quality));
      expect(assets(ships.group)).toEqual(before);
    }
  });

  it('poses deterministically at a held clock and releases all owned geometry and materials once', () => {
    const ships = fleet();
    ships.update(60);
    const held = transforms(ships.group);
    ships.update(60);
    expect(transforms(ships.group)).toEqual(held);
    ships.update(61);
    expect(transforms(ships.group)).not.toEqual(held);
    const owned = assets(ships.group);
    const disposes = [...owned.geometries, ...owned.materials].map((resource) => vi.spyOn(resource, 'dispose'));
    ships.dispose();
    ships.dispose();
    for (const dispose of disposes) expect(dispose).toHaveBeenCalledTimes(1);
    const disposed = transforms(ships.group);
    expect(() => ships.update(100)).not.toThrow();
    expect(transforms(ships.group)).toEqual(disposed);
  });
});
