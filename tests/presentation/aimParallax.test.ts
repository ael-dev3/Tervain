import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AIM_VIEW, CameraRig } from '../../src/presentation/cameraRig';
import { arrowDirection } from '../../src/presentation/huntingController';
import { HuntingArrows } from '../../src/presentation/huntingArrow';
import { Colliders } from '../../src/world/colliders';

const flat = { groundAt: () => 0 };

describe('the drawn shoulder view keeps the reticle true (B11)', () => {
  it('is a lateral view: at least a metre to the draw side, close, and lifted', () => {
    expect(AIM_VIEW.right).toBeGreaterThanOrEqual(.8); expect(AIM_VIEW.right).toBeLessThanOrEqual(1.1);
    expect(AIM_VIEW.boom).toBeLessThan(2.6);
  });

  it('eases in within about 0.15 s and out again, only for the drawn state', () => {
    const cam = new CameraRig(); cam.pitch = 0;
    for (let i = 0; i < 120; i++) cam.follow(1 / 60, 0, 0, 0, flat, new Colliders(), false, 0);
    const rest = cam.camera.position.clone();
    cam.setAiming(true);
    for (let i = 0; i < 9; i++) cam.follow(1 / 60, 0, 0, 0, flat, new Colliders(), false, 0);
    expect(cam.aimBlend).toBeGreaterThan(.85);
    cam.setAiming(false);
    for (let i = 0; i < 900; i++) cam.follow(1 / 60, 0, 0, 0, flat, new Colliders(), false, 0);
    expect(cam.aimBlend).toBe(0);
    expect(cam.camera.position.distanceTo(rest)).toBeLessThan(.05);
  });

  for (const range of [5, 12, 25]) {
    it(`lands an arrow released through the reticle on the target at ${range} m`, () => {
      const cam = new CameraRig(); cam.pitch = .05; cam.setAiming(true, 1);
      cam.follow(1 / 60, 0, 0, 0, flat, new Colliders(), true, 0);
      cam.camera.updateMatrixWorld();
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0, 0), cam.camera);
      const target = ray.ray.at(range, new THREE.Vector3());
      // The bow hand is out to the left of the hero's shoulder and ahead of him, well off the camera's axis.
      const muzzle = new THREE.Vector3(.3, 1.5, .8);
      const direction = arrowDirection(muzzle, target);
      const arrows = new HuntingArrows();
      const shot = arrows.launch(muzzle, direction, 65)!;
      let hit: THREE.Vector3 | null = null;
      // Impact at the target's depth along the view axis (a wall facing the camera through the reticle).
      const axis = ray.ray.direction.clone(), depth = target.dot(axis);
      for (let i = 0; i < 600 && !hit; i++) {
        arrows.update(1 / 120, (from, to) => {
          const a = from.dot(axis) - depth, b = to.dot(axis) - depth;
          if (a <= 0 && b > 0) { hit = from.clone().lerp(to, a / (a - b)); return { point: hit }; }
          return null;
        });
      }
      expect(hit).not.toBeNull();
      expect(hit!.distanceTo(target)).toBeLessThan(.08);
      expect(shot.id).toBeGreaterThan(-1);
      arrows.dispose();
    });
  }
});
