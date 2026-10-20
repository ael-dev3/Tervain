import * as THREE from 'three';
import { expect, it } from 'vitest';
import { deriveBranchLeaf, type BranchField } from '../../src/presentation/foliage/branchWind';

it('skips empty cells outside a twig grid without changing the chosen branch', () => {
  const leaf = new THREE.PlaneGeometry(.5, .5).rotateX(Math.PI / 2).translate(12, 12, 12);
  const field: BranchField = {
    axis: [0, 0], height: 30, limbs: 1,
    nearest: () => 0,
    position: (_, out) => { out.set(0, 0, 0); },
    read: (_, wind, pivot) => { wind.set(.8, 1.25, .75, 0); pivot.set(0, 0, 0); },
  };
  const get = Map.prototype.get;
  let reads = 0;
  Map.prototype.get = function (key) { reads++; return get.call(this, key); };
  try {
    expect(deriveBranchLeaf(leaf, field, [{ from: new THREE.Vector3(), to: new THREE.Vector3(12, 12, 12) }], 50)).not.toBeNull();
  } finally { Map.prototype.get = get; }
  // The old 43-cubed search reads ~80,000 cells for this one card.
  expect(reads).toBeLessThan(10000);
  const wind = leaf.getAttribute('_wind'), pivot = leaf.getAttribute('_pivot');
  for (let i = 0; i < wind.count; i++) {
    expect(wind.getX(i)).toBeCloseTo(.8); expect(wind.getY(i)).toBe(1.25); expect(wind.getZ(i)).toBe(.75);
    expect([pivot.getX(i), pivot.getY(i), pivot.getZ(i)]).toEqual([0, 0, 0]);
  }
  leaf.dispose();
});
