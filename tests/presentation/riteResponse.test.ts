import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildRiteResponse } from '../../src/presentation/riteResponse';

function fixture() {
  const anchor = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.2, 10), new THREE.MeshStandardMaterial());
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.36, 10), new THREE.MeshBasicMaterial());
  water.rotation.x = -Math.PI / 2;
  anchor.add(bowl, water);
  const response = buildRiteResponse(anchor);
  return { anchor, bowl, water, response };
}

describe('physically anchored rite response', () => {
  it('keeps the stone cup hollow with visible inside walls and a closed floor on the altar', () => {
    const { bowl, response } = fixture();
    const cast = (x: number, y: number, direction: THREE.Vector3) => new THREE.Raycaster(new THREE.Vector3(x, y, 0), direction).intersectObject(bowl)[0]?.point;
    // A view from inside sees the inner wall, and a view from outside sees the thicker outer shell.
    const inside = cast(0, 0, new THREE.Vector3(1, 0, 0));
    const outside = cast(1, 0, new THREE.Vector3(-1, 0, 0));
    expect(inside?.x).toBeGreaterThan(0.3);
    expect(outside?.x).toBeGreaterThan(inside!.x + 0.04);
    expect(cast(0, 1, new THREE.Vector3(0, -1, 0))?.y).toBeCloseTo(-0.075, 5);
    expect(cast(0, -1, new THREE.Vector3(0, 1, 0))?.y).toBeCloseTo(-0.14, 5);
    response.dispose();
  });

  it.each([false, true])('confines feedback to the bowl/slab and ends without a lingering outline (reduced motion %s)', (reduced) => {
    const { anchor, water, response } = fixture();
    const effect = anchor.getObjectByName('rite-response')!;
    const ash = anchor.getObjectByName('rite-ash') as THREE.Mesh;
    response.play();
    for (let step = 0; step < 24; step++) {
      response.update(0.1, reduced, step % 2);
      expect(effect.visible).toBe(true);
      const positions = water.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        expect(Math.hypot(positions.getX(i), positions.getY(i))).toBeLessThan(0.324);
        expect(Math.abs(positions.getZ(i))).toBeLessThanOrEqual(reduced ? 0 : 0.003);
        expect(water.position.y + positions.getZ(i)).toBeLessThan(0.06);
      }
      const ashPositions = ash.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < ashPositions.count; i++) {
        expect(Math.abs(ashPositions.getX(i))).toBeLessThan(1.1);
        expect(Math.abs(ashPositions.getZ(i))).toBeLessThan(0.8);
        expect(ashPositions.getY(i)).toBeGreaterThanOrEqual(-0.14);
        if (reduced) expect(ashPositions.getY(i)).toBeCloseTo(-0.139, 5);
      }
    }
    response.update(0.1, reduced, 1);
    expect(effect.visible).toBe(false);
    const positions = water.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) expect(positions.getZ(i)).toBeCloseTo(0, 7);
    response.dispose();
    expect(anchor.getObjectByName('rite-response')).toBeUndefined();
  });
});
