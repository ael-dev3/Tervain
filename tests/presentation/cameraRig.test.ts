import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CameraRig } from '../../src/presentation/cameraRig';
import { CAMERA_CLEARANCE } from '../../src/presentation/cameraObstruction';
import { buildStaticColliders, Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { WaterWorld } from '../../src/world/water/waterWorld';

const flat = { groundAt: () => 0 };
const distance = (cam: CameraRig) => Math.hypot(cam.camera.position.x, cam.camera.position.y - 1.55, cam.camera.position.z);

describe('woodland camera obstruction', () => {
  it('aims over the right shoulder with a closer boom and narrower field of view without changing exploration zoom', () => {
    const cam = new CameraRig(); cam.pitch = 0; cam.wantDist = 7;
    cam.setAiming(true);
    cam.follow(1 / 60, 0, 0, 0, flat, new Colliders(), true, 0);
    expect(cam.camera.position.x).toBeCloseTo(-.42, 8);
    expect(cam.camera.position.z).toBeCloseTo(-2.8, 8);
    expect(cam.camera.fov).toBe(48);
    expect(cam.wantDist).toBe(7);
    expect(cam.camera.getWorldDirection(new THREE.Vector3()).dot(new THREE.Vector3(0, 0, 1))).toBeCloseTo(1, 8);
    cam.setAiming(false);
    for (let i = 0; i < 240; i++) cam.follow(1 / 60, 0, 0, 0, flat, new Colliders(), true, 0);
    expect(cam.camera.position.x).toBeCloseTo(0, 8);
    expect(cam.camera.fov).toBe(60);
    expect(distance(cam)).toBeGreaterThan(6.98);
    cam.setAiming(true); cam.reset();
    expect(cam.isAiming).toBe(false); expect(cam.camera.fov).toBe(60);
    cam.follow(1 / 60, 0, 0, 0, flat, new Colliders(), true, 0);
    expect(distance(cam)).toBeCloseTo(7, 8);
  });

  it('sweeps both the shoulder shift and aimed boom against nearby walls and trees', () => {
    const wall = new Colliders(); wall.box('ruin:shoulder-wall', -.65, 0, .1, .8, 0);
    const cam = new CameraRig(); cam.pitch = 0; cam.setAiming(true);
    const near = vi.spyOn(wall, 'near');
    cam.follow(1 / 60, 0, 0, 0, flat, wall, true, 0);
    expect(cam.camera.position.x).toBeGreaterThan(-.21);
    expect(near).toHaveBeenCalledTimes(1);
    const trunk = new Colliders(); trunk.circle('tree:aim-path', -.42, -1.7, .3);
    cam.reset(); cam.setAiming(true);
    cam.follow(1 / 60, 0, 0, 0, flat, trunk, true, 0);
    expect(cam.camera.position.z).toBeGreaterThan(-1.05);
    expect(Math.hypot(cam.camera.position.x + .42, cam.camera.position.z + 1.7)).toBeGreaterThan(.64);
  });

  it('keeps an aimed low camera above a rising bank and smooths aim FOV only when motion is enabled', () => {
    const cam = new CameraRig(); cam.pitch = -.3; cam.setAiming(true);
    const bank = { groundAt: (_x: number, z: number) => z < -1.7 ? 2 : 0 };
    cam.follow(1 / 60, 0, 0, 0, bank, new Colliders(), false, 0);
    expect(cam.camera.position.z).toBeGreaterThan(-1.7);
    expect(cam.camera.fov).toBeGreaterThan(48); expect(cam.camera.fov).toBeLessThan(60);
    for (let i = 0; i < 60; i++) cam.follow(1 / 60, 0, 0, 0, bank, new Colliders(), false, 0);
    expect(cam.camera.fov).toBe(48);
    expect(cam.camera.position.y).toBeGreaterThanOrEqual(bank.groundAt(cam.camera.position.x, cam.camera.position.z) + .45);
  });

  it('clips the shoulder shift at a terrain bank before moving the camera pivot into it', () => {
    const cam = new CameraRig(); cam.pitch = 0; cam.setAiming(true);
    const bank = { groundAt: (x: number) => x < -.4 ? 3 : 0 };
    cam.follow(1 / 60, 0, 0, 0, bank, new Colliders(), true, 0);
    expect(cam.camera.position.x).toBeGreaterThan(-.06);
    expect(cam.camera.position.y).toBeCloseTo(1.55, 8);
    expect(cam.camera.position.z).toBeCloseTo(-2.8, 8);
  });

  it('allows a regular upward view of tall landmarks while retaining terrain clearance', () => {
    const camera = new CameraRig();
    camera.applyLook(0, -0.8, 0);
    camera.follow(1 / 60, 0, 0, 0, flat, new Colliders(), true, 0);
    expect(camera.camera.getWorldDirection(new THREE.Vector3()).y).toBeGreaterThan(0.4);
    expect(camera.camera.position.y).toBeGreaterThanOrEqual(0.45);
    expect(camera.bodyVisible).toBe(true);
    camera.applyLook(0, -100, 0);
    expect(camera.pitch).toBe(-0.65);
  });

  it('keeps the camera outside a trunk and queries the broad phase only once per follow', () => {
    const colliders = new Colliders();
    colliders.circle('tree:oak:17', 0, -3.4, 0.65);
    const near = vi.spyOn(colliders, 'near');
    const cam = new CameraRig();
    cam.follow(1 / 60, 0, 0, 0, flat, colliders, true, 0);
    expect(distance(cam)).toBeLessThan(3);
    expect(Math.hypot(cam.camera.position.x, cam.camera.position.z + 3.4)).toBeGreaterThan(0.95);
    expect(near).toHaveBeenCalledTimes(1);
  });

  it('pulls in immediately for stonework and recovers gradually after it clears', () => {
    const colliders = new Colliders();
    colliders.box('ruin:wall', 0, -3.2, 1.4, 0.25, 0.18);
    const cam = new CameraRig();
    cam.follow(1 / 60, 0, 0, 0, flat, colliders, true, 0);
    const blocked = distance(cam);
    expect(blocked).toBeLessThan(3.2);
    colliders.setActive('ruin:wall', false);
    cam.follow(1 / 60, 0, 0, 0, flat, colliders, true, 0);
    const first = distance(cam);
    expect(first).toBeGreaterThan(blocked);
    expect(first).toBeLessThan(6.2);
    for (let i = 0; i < 180; i++) cam.follow(1 / 60, 0, 0, 0, flat, colliders, true, 0);
    expect(distance(cam)).toBeGreaterThan(6.15);
  });

  it('clears a rising bank while keeping an unobstructed boom steady', () => {
    const cam = new CameraRig();
    const colliders = new Colliders();
    const bank = { groundAt: (_x: number, z: number) => z < -2.3 ? 4 : 0 };
    cam.follow(1 / 60, 0, 0, 0, bank, colliders, true, 0);
    expect(distance(cam)).toBeLessThan(2.3);
    const previous = cam.camera.position.clone();
    cam.follow(1 / 60, 0, 0, 0, bank, colliders, true, 0);
    expect(cam.camera.position.equals(previous)).toBe(true);
    expect(cam.camera.position.y).toBeGreaterThanOrEqual(bank.groundAt(cam.camera.position.x, cam.camera.position.z) + 0.45);
  });

  it.each([30, 60, 120])('keeps impact recoil outside a wall that runs alongside a clear boom at %i Hz', (hz) => {
    const colliders = new Colliders();
    // The unobstructed centreline is legal, but its first positive recoil pulse crosses the side wall.
    colliders.box('side-wall', 0.36, -3, 0.01, 5, 0, true, { minY: 0, maxY: 6 });
    const cam = new CameraRig();
    for (let frame = 0; frame < hz * 2; frame++) {
      cam.follow(1 / hz, 0, 0, 0, flat, colliders, false, 1);
      expect(cam.camera.position.x + CAMERA_CLEARANCE).toBeLessThanOrEqual(0.35 + 1e-6);
    }
    expect(distance(cam)).toBeGreaterThan(6.1);
  });

  it('clips recoil against a round post without retracting an otherwise clear boom', () => {
    const colliders = new Colliders();
    const z = -Math.cos(0.32) * 6.2;
    colliders.circle('post', 0.56, z, 0.21, true, { minY: 0, maxY: 6 });
    const cam = new CameraRig();
    for (let frame = 0; frame < 120; frame++) {
      cam.follow(1 / 60, 0, 0, 0, flat, colliders, false, 1);
      expect(Math.hypot(cam.camera.position.x - 0.56, cam.camera.position.z - z)).toBeGreaterThanOrEqual(0.21 + CAMERA_CLEARANCE);
    }
    expect(distance(cam)).toBeGreaterThan(6.1);
  });

  it('keeps recoil out of the terrain clearance envelope and freezes it for Reduced Motion', () => {
    const ground = { groundAt: (x: number) => x };
    const cam = new CameraRig(); cam.pitch = -0.4;
    for (let frame = 0; frame < 120; frame++) {
      cam.follow(1 / 60, 0, 0, 0, ground, new Colliders(), false, 1);
      const point = cam.camera.position;
      expect(point.y).toBeGreaterThanOrEqual(ground.groundAt(point.x + CAMERA_CLEARANCE) + CAMERA_CLEARANCE - 1e-6);
    }
    cam.follow(1 / 60, 0, 0, 0, ground, new Colliders(), true, 1);
    const held = cam.camera.position.clone();
    cam.follow(1 / 60, 0, 0, 0, ground, new Colliders(), true, 1);
    expect(cam.camera.position.equals(held)).toBe(true);
  });
});

describe('waterline camera stability', () => {
  const deep = { groundAt: () => -30 };

  it('keeps the underwater lens out of a real shallow coastal bank', () => {
    const terrain = new Terrain(), water = new WaterWorld(terrain), cam = new CameraRig();
    water.time = 4;
    const x = -289.7614399256793, z = 30, swimmer = water.sample(x, z)!;
    expect(swimmer.depth).toBeGreaterThan(1.35);
    cam.yaw = -Math.PI / 2; cam.pitch = -0.12;
    cam.follow(1 / 60, x, swimmer.surface - 1.25, z, terrain, buildStaticColliders(terrain), true, 0);
    const p = cam.camera.position, r = CAMERA_CLEARANCE;
    const floor = Math.max(terrain.groundAt(p.x,p.z), terrain.groundAt(p.x-r,p.z), terrain.groundAt(p.x+r,p.z), terrain.groundAt(p.x,p.z-r), terrain.groundAt(p.x,p.z+r));
    const surface = water.surfaceAt(p.x, p.z)!;
    expect(p.y).toBeGreaterThanOrEqual(floor + r);
    expect(surface - 0.3).toBeLessThan(floor + r);
    cam.clearWater((cx, cz) => water.surfaceAt(cx, cz), true);
    expect(p.y).toBeGreaterThanOrEqual(floor + r);
    expect(p.y).toBeGreaterThanOrEqual(surface + 0.28);
  });

  it('reuses the boom candidates to avoid lowering the lens into a submerged rock', () => {
    const colliders = new Colliders(), cam = new CameraRig();
    colliders.box('submerged-rock', 0, -6.2, 0.5, 0.5, 0, true, { minY: -1, maxY: -0.5 });
    const near = vi.spyOn(colliders, 'near');
    cam.pitch = Math.asin((-0.06 - 0.3) / cam.wantDist);
    cam.follow(1 / 60, 0, -1.25, 0, deep, colliders, true, 0);
    expect(cam.camera.position.y).toBeCloseTo(-0.06, 8);
    cam.clearWater(() => 0, true);
    expect(cam.camera.position.y).toBeCloseTo(0.28, 8);
    expect(near).toHaveBeenCalledOnce();
  });

  it.each([-0.04, -0.06])('holds the chosen waterline side through passing waves at nominal eye height %s', eyeHeight => {
    const cam = new CameraRig(), colliders = new Colliders();
    cam.pitch = Math.asin((eyeHeight - 0.3) / cam.wantDist);
    let previousY: number | null = null;
    const initiallyUnder = eyeHeight < -0.05;
    for (let frame = 0; frame < 600; frame++) {
      const surface = Math.sin(frame / 60 * 2) * 0.06;
      cam.follow(1 / 60, 0, -1.25, 0, deep, colliders, false, 0);
      cam.clearWater(() => surface, true);
      expect(cam.camera.position.y < surface).toBe(initiallyUnder);
      expect(Math.abs(cam.camera.position.y - surface)).toBeGreaterThanOrEqual(0.28 - 1e-9);
      if (previousY !== null) expect(Math.abs(cam.camera.position.y - previousY)).toBeLessThan(0.01);
      previousY = cam.camera.position.y;
    }
  });

  it('crosses the surface after a deliberate pitch change and keeps a non-swimmer above it', () => {
    const cam = new CameraRig(), colliders = new Colliders();
    const follow = (pitch: number, swimming = true) => {
      cam.pitch = pitch;
      cam.follow(1 / 60, 0, -1.25, 0, deep, colliders, true, 0);
      cam.clearWater(() => 0, swimming);
    };
    follow(0);
    expect(cam.camera.position.y).toBeGreaterThan(0);
    follow(-0.12);
    expect(cam.camera.position.y).toBeLessThan(-0.3);
    follow(-0.055);
    expect(cam.camera.position.y).toBeCloseTo(-0.3, 8);
    follow(0);
    expect(cam.camera.position.y).toBeGreaterThan(0.28);
    follow(-0.12, false);
    expect(cam.camera.position.y).toBeCloseTo(0.28, 8);
  });

  it.each(['reset', 'dry-ground'] as const)('forgets the previous side after %s', reset => {
    const cam = new CameraRig(), colliders = new Colliders();
    cam.pitch = -0.12;
    cam.follow(1 / 60, 0, -1.25, 0, deep, colliders, true, 0);
    cam.clearWater(() => 0, true);
    expect(cam.camera.position.y).toBeLessThan(0);
    if (reset === 'reset') cam.reset();
    else cam.clearWater(() => null, true);
    cam.pitch = -0.05;
    cam.follow(1 / 60, 0, -1.25, 0, deep, colliders, true, 0);
    cam.clearWater(() => 0, true);
    expect(cam.camera.position.y).toBeCloseTo(0.28, 8);
  });
});
