import { expect, it, vi } from 'vitest';
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

it('uses one scratch point across triangles while retaining independent opaque samples', () => {
  const leaf = mergeGeometries([new THREE.PlaneGeometry(1, 1).translate(0.1, 3, 0), new THREE.PlaneGeometry(1, 1).translate(0.2, 2, 0)]);
  const wood = trunk(), before = leaf.getAttribute('position').array.slice(), points = new Set<THREE.Vector3Like>();
  const expand = THREE.Box3.prototype.expandByPoint;
  const spy = vi.spyOn(THREE.Box3.prototype, 'expandByPoint').mockImplementation(function(this: THREE.Box3, point: THREE.Vector3Like) {
    points.add(point); return expand.call(this, point);
  });
  try {
    expect(anchorLeafIslands(leaf, wood, { uv: 'uv', cutoff: 0.42, alpha: () => 1 })).toEqual({ islands: 0, moved: 0, dropped: 0 });
    expect(leaf.getAttribute('position').array).toEqual(before);
    expect(spy.mock.calls.length).toBeGreaterThan(4);
    expect(points.size).toBe(1);
  } finally { spy.mockRestore(); leaf.dispose(); wood.dispose(); }
});

function thinLeaf(x: number, collapsed = false) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(collapsed ? [x, 3, 0, x, 3, 0, x, 3, 0] : [x, 3, 0, x + 1, 3, 0, x, 3, 1], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  return g;
}
const needle = { uv: 'uv', cutoff: 0.42, alpha: (u: number, v: number) => Math.hypot(u - 1 / 48, v - 1 / 48) < 0.004 ? 1 : 0 };
it('repairs an opaque needle missed by the coarse alpha grid', () => {
  const leaf = thinLeaf(4), wood = trunk();
  try {
    expect(anchorLeafIslands(leaf, wood, needle)).toEqual({ islands: 1, moved: 1, dropped: 0 });
    const p = leaf.getAttribute('position'), point = new THREE.Vector3().fromBufferAttribute(p, 0).multiplyScalar(1 - 2 / 48)
      .addScaledVector(new THREE.Vector3().fromBufferAttribute(p, 1), 1 / 48).addScaledVector(new THREE.Vector3().fromBufferAttribute(p, 2), 1 / 48);
    expect(woodAnchor(wood)(point, new THREE.Vector3())).toBeLessThanOrEqual(0.5);
  } finally { leaf.dispose(); wood.dispose(); }
});
it('keeps supported thin needles and transparent cards unchanged', () => {
  for (const [x, alpha] of [[0.1, needle.alpha], [4, () => 0]] as const) {
    const leaf = thinLeaf(x), wood = trunk(), before = leaf.getAttribute('position').array.slice();
    try { expect(anchorLeafIslands(leaf, wood, { ...needle, alpha })).toEqual({ islands: 0, moved: 0, dropped: 0 }); expect(leaf.getAttribute('position').array).toEqual(before); }
    finally { leaf.dispose(); wood.dispose(); }
  }
});
it('does not let a collapsed first triangle hide real needles sharing its UVs', () => {
  const leaf = mergeGeometries([thinLeaf(4, true), thinLeaf(4)]), wood = trunk();
  try { expect(anchorLeafIslands(leaf, wood, needle)).toEqual({ islands: 1, moved: 1, dropped: 0 }); }
  finally { leaf.dispose(); wood.dispose(); }
});
