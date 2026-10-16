import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { growTwigs } from '../../src/presentation/canopy';

function wood() {
  const g = new THREE.CylinderGeometry(0.3, 0.5, 3, 6);
  g.computeTangents();
  return g;
}

describe('grown twig normal-map frame', () => {
  it('follows increasing U around each ring and decreasing V along the twig, retaining the source frame', () => {
    const source = wood(), count = source.getAttribute('position').count;
    const twigs = [
      { from: new THREE.Vector3(0, 1, 0), to: new THREE.Vector3(2, 2, 0.4) },
      { from: new THREE.Vector3(0, 1, 0), to: new THREE.Vector3(-1, 5, 2) },
    ];
    const g = growTwigs(source, twigs), p = g.getAttribute('position'), n = g.getAttribute('normal'), tangent = g.getAttribute('tangent');
    expect(Array.from(tangent.array.slice(0, count * 4))).toEqual(Array.from(source.getAttribute('tangent').array));
    const normal = new THREE.Vector3(), u = new THREE.Vector3(), actual = new THREE.Vector3(), prev = new THREE.Vector3(), next = new THREE.Vector3();
    for (let ring = count; ring < p.count; ring += 4) for (let k = 0; k < 4; k++) {
      const i = ring + k;
      prev.fromBufferAttribute(p, ring + (k + 2) % 3); next.fromBufferAttribute(p, ring + (k + 1) % 3);
      normal.fromBufferAttribute(n, i);
      u.subVectors(next, prev).addScaledVector(normal, -u.dot(normal)).normalize();
      actual.fromBufferAttribute(tangent, i);
      expect(actual.length()).toBeCloseTo(1, 6);
      expect(actual.dot(normal)).toBeCloseTo(0, 6);
      expect(actual.dot(u)).toBeGreaterThan(0.99999);
      expect(tangent.getW(i)).toBe(-1);
    }
    expect(g.index!.count).toBe(source.index!.count + twigs.reduce((n, t) => n + (t.from.distanceTo(t.to) > 2.5 ? 12 : 6) * 3, 0));
    const uv = g.getAttribute('uv');
    for (let ring = count; ring < p.count; ring += 4) {
      expect(uv.getX(ring + 3) - uv.getX(ring)).toBeCloseTo(0.02, 6);
      for (let k = 0; k < 3; k++) expect(uv.getX(ring + k + 1)).toBeGreaterThan(uv.getX(ring + k));
      expect(new THREE.Vector3().fromBufferAttribute(p, ring).toArray()).toEqual(new THREE.Vector3().fromBufferAttribute(p, ring + 3).toArray());
    }
    g.dispose(); source.dispose();
  });

  it('leaves geometry without source tangents unchanged', () => {
    const source = wood(); source.deleteAttribute('tangent');
    const g = growTwigs(source, [{ from: new THREE.Vector3(0, 1, 0), to: new THREE.Vector3(2, 2, 0) }]);
    expect(g.getAttribute('tangent')).toBeUndefined();
    expect(g.getAttribute('position').count).toBe(source.getAttribute('position').count + 6);
    g.dispose(); source.dispose();
  });
});
