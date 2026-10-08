import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createThornback } from '../../src/presentation/characters';
import { limb, loft, type RGB, type Section } from '../../src/presentation/humanGeo';

const tan: RGB = [0.5, 0.4, 0.3];

/** How many triangles face away from the surface's outside (winding against the outward direction). */
function inward(g: THREE.BufferGeometry): { faces: number; inward: number } {
  const p = g.attributes.position!, idx = g.index!.array;
  const tri = new THREE.Triangle(), normal = new THREE.Vector3(), mid = new THREE.Vector3();
  const centre = new THREE.Vector3();
  g.computeBoundingBox();
  g.boundingBox!.getCenter(centre);
  let count = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const v = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(p, idx[i + j]!));
    tri.set(v[0]!, v[1]!, v[2]!);
    tri.getNormal(normal);
    tri.getMidpoint(mid);
    if (normal.dot(mid.sub(centre)) < 0) count++;
  }
  return { faces: idx.length / 3, inward: count };
}

describe('lofted creature surfaces', () => {
  it('face outward when the sections rise, as the trunk and snout do', () => {
    const sections: Section[] = [-1, 0, 1].map((y) => ({ y, rx: 0.5, rz: 0.4, color: tan }));
    expect(inward(loft(sections, 10, { capBottom: true, capTop: true })).inward).toBe(0);
  });

  it('face outward when the sections fall, as a limb does', () => {
    expect(inward(limb(0.17, 0.08, 0.72, { top: tan, bottom: tan })).inward).toBe(0);
  });

  it('close the Thornback trunk from outside', () => {
    const rig = createThornback();
    const trunk = rig.torso.children.find((o) => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.index) as THREE.Mesh;
    expect(trunk).toBeDefined();
    const g = trunk.geometry.clone().applyMatrix4(trunk.matrix);
    expect(inward(g)).toMatchObject({ inward: 0 });
  });
});
