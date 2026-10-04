import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { CameraRig } from '../../src/presentation/cameraRig';
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
});
