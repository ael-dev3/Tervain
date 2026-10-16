import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { growTwigs } from '../../src/presentation/canopy';

function source(points: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('barkTag', new THREE.Float32BufferAttribute(points.filter((_, i) => i % 3 === 0).map((_, i) => i), 1));
  return geometry;
}

describe('twig bark inheritance', () => {
  it('keeps the closest original vertex and lowest-index ties across both search directions', () => {
    const points = [1, 0, 0, -1, 0, 0, 0, 2, 0, 0, -2, 0];
    for (let i = 0; i < 100; i++) points.push(Math.sin(i) * 3, i / 5 - 10, Math.cos(i) * 3);
    const geometry = source(points), p = geometry.getAttribute('position');
    const queries = [new THREE.Vector3(), new THREE.Vector3(0, 0, 100), new THREE.Vector3(0, -100, 0), new THREE.Vector3(0, 100, 0)];
    for (let i = 0; i < 60; i++) queries.push(new THREE.Vector3(Math.sin(i * 13), i / 3 - 10, Math.cos(i * 7)));
    const grown = growTwigs(geometry, queries.map(from => ({ from, to: from.clone().add(new THREE.Vector3(0.2, 1, 0.1)) })));
    const tags = grown.getAttribute('barkTag');
    for (const [query, from] of queries.entries()) {
      let closest = 0, distance = Infinity;
      for (let i = 0; i < p.count; i++) {
        const d = (p.getX(i) - from.x) ** 2 + (p.getY(i) - from.y) ** 2 + (p.getZ(i) - from.z) ** 2;
        if (d < distance) { distance = d; closest = i; }
      }
      for (let i = 0; i < 6; i++) expect(tags.getX(p.count + query * 6 + i)).toBe(closest);
    }
    grown.dispose(); geometry.dispose();
  });

  it('keeps lower-index ties across different spatial cells', () => {
    const geometry = source([2, 0.5, 0.5, -1, 0.5, 0.5, 0, 10, 0]);
    const from = new THREE.Vector3(0.5, 0.5, 0.5), to = new THREE.Vector3(0.5, 1.5, 0.5);
    const grown = growTwigs(geometry, Array.from({ length: 32 }, () => ({ from, to })));
    const tags = grown.getAttribute('barkTag');
    for (let i = 3; i < tags.count; i++) expect(tags.getX(i)).toBe(0);
    grown.dispose(); geometry.dispose();
  });

  it('does not rescan the entire tall trunk for every twig', () => {
    const points: number[] = [];
    for (let i = 0; i < 1000; i++) points.push(Math.sin(i) * 0.1, i * 0.1, Math.cos(i) * 0.1);
    const geometry = source(points), p = geometry.getAttribute('position'), reads = vi.spyOn(p, 'getX');
    const twigs = Array.from({ length: 32 }, (_, i) => {
      const from = new THREE.Vector3(0.2, i * 3 + 0.02, 0);
      return { from, to: from.clone().add(new THREE.Vector3(0.2, 1, 0)) };
    });
    try {
      const grown = growTwigs(geometry, twigs);
      expect(reads.mock.calls.length).toBeLessThan(4000); // Includes bounds and grid construction over the source vertices.
      grown.dispose();
    } finally { reads.mockRestore(); geometry.dispose(); }
  });
});
