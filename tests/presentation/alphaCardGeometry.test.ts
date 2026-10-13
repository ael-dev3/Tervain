import * as THREE from 'three';
import { expect, it } from 'vitest';
import { alphaCardGeometry } from '../../src/diagnostics/alphaCardGeometry';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';
const card = () => new THREE.PlaneGeometry(4, .5).translate(2, 1, 0);
const audit = (leaves: THREE.BufferGeometry) => auditCanopies([{ label: 'alpha-card', wood: new THREE.BoxGeometry(.4, 2, .4).translate(0, 1, 0), leaves, matrix: new THREE.Matrix4() }]);
it('exposes a visible detached island hidden by transparent connecting geometry', () => {
  const source = card(), alpha = new Uint8Array(16); alpha.fill(255, 0, 2); alpha.fill(255, 13);
  expect(audit(source).summary.candidates).toBe(0);
  const clipped = alphaCardGeometry(source, { width: 16, height: 1, alpha, cutoff: .42 });
  expect(audit(clipped.geometry).summary).toMatchObject({ components: 2, chunks: 2, candidates: 1 });
  const restored = alphaCardGeometry(source, { width: 16, height: 1, alpha: new Uint8Array(16).fill(255), cutoff: .42 });
  expect(audit(restored.geometry).summary.candidates).toBe(0);
});
it('retains opaque area and handles a fully transparent card', () => {
  const source = card(), result = alphaCardGeometry(source, { width: 2, height: 2, alpha: new Uint8Array(4).fill(255), cutoff: .5 });
  const p = result.geometry.getAttribute('position'); let area = 0;
  for (let i = 0; i < p.count; i += 3) area += new THREE.Triangle(...[0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, i + j)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]).getArea();
  expect(area).toBeCloseTo(2);
  expect(alphaCardGeometry(source, { width: 1, height: 1, alpha: new Uint8Array(1), cutoff: .5 }).triangles).toBe(0);
});
it('uses opacity and rejects incomplete or unsupported scans', () => {
  expect(alphaCardGeometry(card(), { width: 1, height: 1, alpha: new Uint8Array([255]), cutoff: .5, opacity: .4 }).triangles).toBe(0);
  expect(() => alphaCardGeometry(card(), { width: 16, height: 1, alpha: new Uint8Array(16), cutoff: .5 }, 1)).toThrow(/budget/);
  const bad = card(); bad.getAttribute('uv').setX(0, 2);
  expect(() => alphaCardGeometry(bad, { width: 1, height: 1, alpha: new Uint8Array([255]), cutoff: .5 })).toThrow(/Unsupported/);
  expect(() => alphaCardGeometry(card(), { width: 1, height: 1, alpha: new Uint8Array(2), cutoff: .5 })).toThrow(/Invalid/);
});
