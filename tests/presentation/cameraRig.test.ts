import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CameraRig } from '../../src/presentation/cameraRig';
import { CAMERA_CLEARANCE } from '../../src/presentation/cameraObstruction';
import { Colliders } from '../../src/world/colliders';

const flat = { groundAt: () => 0 };
const distance = (cam: CameraRig) => Math.hypot(cam.camera.position.x, cam.camera.position.y - 1.55, cam.camera.position.z);

describe('woodland camera obstruction', () => {
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
    expect(first).toBeLessThan(5.4);
    for (let i = 0; i < 180; i++) cam.follow(1 / 60, 0, 0, 0, flat, colliders, true, 0);
    expect(distance(cam)).toBeGreaterThan(5.35);
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
    expect(distance(cam)).toBeGreaterThan(5.3);
  });

  it('clips recoil against a round post without retracting an otherwise clear boom', () => {
    const colliders = new Colliders();
    const z = -Math.cos(0.32) * 5.4;
    colliders.circle('post', 0.56, z, 0.21, true, { minY: 0, maxY: 6 });
    const cam = new CameraRig();
    for (let frame = 0; frame < 120; frame++) {
      cam.follow(1 / 60, 0, 0, 0, flat, colliders, false, 1);
      expect(Math.hypot(cam.camera.position.x - 0.56, cam.camera.position.z - z)).toBeGreaterThanOrEqual(0.21 + CAMERA_CLEARANCE);
    }
    expect(distance(cam)).toBeGreaterThan(5.3);
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
