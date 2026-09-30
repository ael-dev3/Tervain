import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Batch, Ctx } from '../../src/presentation/buildKit';
import { Region } from '../../src/presentation/regions';
import { gableRoof, hipRoof, leanRoof, roofSoffit, type RoofResult } from '../../src/presentation/roofs';

const material = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
const ray = (batches: Batch[], origin: THREE.Vector3, direction: THREE.Vector3) => {
  const meshes = batches.map((batch) => new THREE.Mesh(batch.toGeometry()!, material));
  const hits = new THREE.Raycaster(origin, direction).intersectObjects(meshes);
  for (const mesh of meshes) mesh.geometry.dispose();
  return hits;
};
const fromBelow = (R: Region, x: number, z: number) => ray([...R.batches.values()], new THREE.Vector3(x, -2, z), new THREE.Vector3(0, 1, 0));
const fromAbove = (R: Region, x: number, z: number) => ray([...R.batches.values()], new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0));

function expectRoofCoverage(R: Region, result: RoofResult, samples: [number, number][], height: (x: number, z: number) => number) {
  for (const [x, z] of samples) {
    const below = fromBelow(R, x, z);
    expect(below.length, `underside missing at ${x}, ${z}`).toBeGreaterThan(0);
    expect(below[0]!.point.y).toBeCloseTo(height(x, z) - 0.106, 4);
    const above = fromAbove(R, x, z);
    expect(above.length, `roof backing missing at ${x}, ${z}`).toBeGreaterThan(0);
    expect(above[0]!.point.y).toBeGreaterThanOrEqual(height(x, z) - 0.017);
  }
  expect(result.ridgeY).toBeGreaterThan(3);
}

function expectValidFaces(R: Region) {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (const batch of R.batches.values()) {
    for (let i = 0; i < batch.ix.n; i += 3) {
      const ia = batch.ix.a[i]!, ib = batch.ix.a[i + 1]!, ic = batch.ix.a[i + 2]!;
      a.fromArray(batch.p.a, ia * 3);
      b.fromArray(batch.p.a, ib * 3);
      c.fromArray(batch.p.a, ic * 3);
      const normal = b.sub(a).cross(c.sub(a));
      expect(normal.lengthSq(), `${batch.key} collapsed face at ${i / 3}`).toBeGreaterThan(1e-12);
      normal.normalize();
      n.fromArray(batch.nr.a, ia * 3);
      // Rounded ridge/rafter rods interpolate normals over as few as four radial facets.
      expect(normal.dot(n), `${batch.key} normal opposes winding at ${i / 3}`).toBeGreaterThan(0.65);
    }
  }
}

describe('complete roof geometry', () => {
  it.each([1, -1])('faces the soffit down for either eave direction (%s)', (side) => {
    const B = new Batch(new Ctx(), 'timber');
    roofSoffit(B, [0, 3, 0], [side, 0, 0], [0, 0.6, -0.8], 2, 3, 0x554433);
    expect(ray([B], new THREE.Vector3(side * 1.5, 0, -0.8), new THREE.Vector3(0, 1, 0))).toHaveLength(1);
    expect(ray([B], new THREE.Vector3(side * 1.5, 8, -0.8), new THREE.Vector3(0, -1, 0))).toHaveLength(0);
    for (let i = 1; i < B.nr.n; i += 3) expect(B.nr.a[i]).toBeLessThan(-0.7);
  });

  it.each(['tile', 'slate', 'thatch', 'shingle'] as const)('closes both gable slopes beneath %s courses', (style) => {
    const R = new Region('gable', new Ctx());
    const result = gableRoof(R, { w: 6, d: 4, y: 3, style });
    expectRoofCoverage(R, result, [[0.73, 0.31], [0.73, -0.31], [2.4, 1.8], [-2.4, -1.8]],
      (_x, z) => result.ridgeY - Math.abs(z) * Math.tan(result.pitch));
    expectValidFaces(R);
  });

  it.each([1, -1] as const)('closes the lean roof and its high rear edge (low side %s)', (lowSide) => {
    const R = new Region('lean', new Ctx());
    const result = leanRoof(R, { w: 6, d: 4, y: 3, style: 'shingle', lowSide });
    const height = (_x: number, z: number) => result.ridgeY - (result.halfSpan + lowSide * z) * Math.tan(result.pitch);
    expectRoofCoverage(R, result, [[0.73, 0.4], [0.73, -0.4], [2.4, 1.8], [-2.4, -1.8]], height);
    const back = -lowSide * result.halfSpan;
    expect(ray([...R.batches.values()], new THREE.Vector3(0.73, result.ridgeY - 0.06, back - lowSide * 2), new THREE.Vector3(0, 0, lowSide)).length).toBeGreaterThan(0);
    expectValidFaces(R);
  });

  it.each([[8, 4], [4, 8], [4, 4]])('keeps every hip plane connected over a %s by %s footprint', (w, d) => {
    const R = new Region('hip', new Ctx());
    const result = hipRoof(R, { w, d, y: 3, style: 'slate', oh: 0.6 });
    const hw = w / 2 + 0.6, hd = d / 2 + 0.6;
    const height = (x: number, z: number) => 2.94 + Math.min(hw - Math.abs(x), hd - Math.abs(z)) * Math.tan(result.pitch);
    // Interior samples cross all four sides and a hip seam away from ridge trims.
    expectRoofCoverage(R, result, [[0.31, 0.41], [hw - 0.3, 0.31], [-hw + 0.3, -0.31], [0.31, hd - 0.3], [-0.31, -hd + 0.3]], height);
    const x = hw - 0.8, z = hd - 0.8;
    const above = fromAbove(R, x, z);
    const below = fromBelow(R, x, z);
    expect(above.length).toBeGreaterThan(0);
    expect(below.length).toBeGreaterThan(0);
    expectValidFaces(R);
  });
});
