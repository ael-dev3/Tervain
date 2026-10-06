import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { HuntingArrows, HUNTING_ARROW_GRAVITY } from '../../src/presentation/huntingArrow';

describe('swept ballistic hunting arrows', () => {
  it('travels the same analytical gravity arc at 30, 60 and 120 Hz', () => {
    const points = [30, 60, 120].map((hz) => {
      const arrows = new HuntingArrows();
      const shot = arrows.launch(new THREE.Vector3(0, 4, 0), new THREE.Vector3(0, 0, 1), 38)!;
      for (let i = 0; i < hz / 2; i++) arrows.update(1 / hz, () => null);
      const point = shot.position.clone();
      expect(shot.velocity.y).toBeCloseTo(-HUNTING_ARROW_GRAVITY * .5, 8);
      arrows.dispose();
      return point;
    });
    for (const point of points) {
      expect(point.z).toBeCloseTo(19, 8);
      expect(point.y).toBeCloseTo(4 - .5 * HUNTING_ARROW_GRAVITY * .5 ** 2, 8);
      expect(point.distanceTo(points[0]!)).toBeLessThan(1e-7);
    }
  });

  it('finds a thin contact during a long frame, lodges at its real point and calls impact only once', () => {
    const arrows = new HuntingArrows();
    const shot = arrows.launch(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0, 0, 1), 60)!;
    const impact = vi.fn();
    const sweep = vi.fn((from: THREE.Vector3, to: THREE.Vector3) => {
      if (from.z <= 3.005 && to.z >= 3.005) return { point: from.clone().lerp(to, (3.005 - from.z) / (to.z - from.z)) };
      return null;
    });
    arrows.update(.25, sweep, impact);
    expect(shot.position.z).toBeCloseTo(3.005, 8);
    expect(arrows.activeCount).toBe(0);
    expect(arrows.lodgedCount).toBe(1);
    expect(impact).toHaveBeenCalledOnce();
    const sweeps = sweep.mock.calls.length;
    arrows.update(.5, sweep, impact);
    expect(sweep).toHaveBeenCalledTimes(sweeps);
    expect(impact).toHaveBeenCalledOnce();
    arrows.dispose();
  });

  it('keeps a lodged animal arrow attached while the wounded body moves or falls', () => {
    const arrows = new HuntingArrows(), scene = new THREE.Scene(), animal = new THREE.Group();
    scene.add(arrows.group, animal);
    animal.position.set(0, 0, 3);
    const shot = arrows.launch(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1))!;
    arrows.update(.1, () => ({ point: new THREE.Vector3(0, 1, 3), parent: animal }));
    expect(shot.mesh.parent).toBe(animal);
    animal.position.x = 2;
    animal.rotation.z = Math.PI / 2;
    scene.updateMatrixWorld(true);
    expect(shot.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(1, 0, 3))).toBeLessThan(1e-6);
    arrows.clear();
    expect(animal.children).toHaveLength(0);
    arrows.dispose();
  });

  it('allows animal-owned impact effects without retaining a second world-space arrow', () => {
    const arrows = new HuntingArrows();
    const shot = arrows.launch(new THREE.Vector3(), new THREE.Vector3(0, 0, 1))!;
    const impact = vi.fn();
    arrows.update(.1, () => ({ point: new THREE.Vector3(0, 0, 2), lodge: false }), impact);
    expect(impact).toHaveBeenCalledOnce();
    expect(arrows.activeCount).toBe(0);
    expect(arrows.lodgedCount).toBe(0);
    expect(shot.mesh.parent).toBeNull();
    arrows.dispose();
  });

  it('bounds active/lodged meshes and disposes expired arrow geometry', () => {
    const arrows = new HuntingArrows(2, 2);
    const first = arrows.launch(new THREE.Vector3(), new THREE.Vector3(0, 0, 1))!;
    const mesh = first.mesh.children.find((object) => (object as THREE.Mesh).isMesh)! as THREE.Mesh;
    const disposed = vi.spyOn(mesh.geometry, 'dispose');
    arrows.launch(new THREE.Vector3(), new THREE.Vector3(0, 0, 1));
    arrows.launch(new THREE.Vector3(), new THREE.Vector3(0, 0, 1));
    expect(arrows.activeCount).toBe(2);
    expect(disposed).toHaveBeenCalledOnce();
    arrows.update(.1, (_from, to) => ({ point: to }));
    expect(arrows.lodgedCount).toBe(2);
    arrows.launch(new THREE.Vector3(), new THREE.Vector3(0, 0, 1));
    arrows.update(.1, (_from, to) => ({ point: to }));
    expect(arrows.lodgedCount).toBe(2);
    arrows.update(26, () => null);
    expect(arrows.lodgedCount).toBe(0);
    expect(arrows.group.children).toHaveLength(0);
    arrows.dispose();
    expect(arrows.launch(new THREE.Vector3(), new THREE.Vector3(0, 0, 1))).toBeNull();
  });

  it('rejects invalid vectors rather than creating nonfinite scene transforms', () => {
    const arrows = new HuntingArrows();
    expect(arrows.launch(new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(0, 0, 1))).toBeNull();
    expect(arrows.launch(new THREE.Vector3(), new THREE.Vector3())).toBeNull();
    expect(arrows.launch(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), Infinity)).toBeNull();
    expect(arrows.activeCount).toBe(0);
    arrows.dispose();
  });
});
