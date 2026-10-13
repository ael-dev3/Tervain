import { expect, it } from 'vitest';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { anchorLeafIslands } from '../../src/presentation/leafIslands';
import { woodAnchor } from '../../src/presentation/canopy';

const trunk = () => new THREE.CylinderGeometry(0.2, 0.3, 4, 6).translate(0, 2, 0);
const nearest = (g: THREE.BufferGeometry, wood: THREE.BufferGeometry, from: number, to: number) => {
  const anchor = woodAnchor(wood), p = g.getAttribute('position'), hit = new THREE.Vector3();
  let best = Infinity; for (let i = from; i < to; i++) best = Math.min(best, anchor(new THREE.Vector3().fromBufferAttribute(p, i), hit));
  return best;
};

it('moves a card whose opaque leaves hang clear of the wood, and keeps attached cards', () => {
  const leaf = mergeGeometries([new THREE.PlaneGeometry(1, 1).translate(0.8, 3, 0), new THREE.PlaneGeometry(1, 1).translate(3, 3, 0)]);
  const r = anchorLeafIslands(leaf, trunk(), null, { reach: 0.5, gap: 0.6 });
  expect(r).toMatchObject({ islands: 1, moved: 1, dropped: 0 });
  expect(nearest(leaf, trunk(), 4, 8)).toBeLessThanOrEqual(0.5);
  expect(leaf.getAttribute('position').getX(0)).toBeCloseTo(0.3);
});

it('links cards by opaque texels only, and drops a far island', () => {
  // Two touching quads: only the left fifth of each is opaque, so the second's leaves are 1.6 m from the first's.
  const leaf = mergeGeometries([new THREE.PlaneGeometry(2, 0.5).translate(1.3, 3, 0), new THREE.PlaneGeometry(2, 0.5).translate(3.3, 3, 0)]);
  const cutout = { uv: 'uv', cutoff: 0.42, alpha: (u: number) => (u < 0.2 ? 1 : 0) };
  expect(anchorLeafIslands(leaf.clone(), trunk(), null)).toMatchObject({ islands: 0 });
  expect(anchorLeafIslands(leaf.clone(), trunk(), cutout)).toMatchObject({ islands: 1, moved: 1 });
  const far = new THREE.PlaneGeometry(1, 1).translate(9, 3, 0);
  expect(anchorLeafIslands(far, trunk(), null, { drop: 4 })).toMatchObject({ dropped: 1 });
  expect(far.index!.count).toBe(0);
});
