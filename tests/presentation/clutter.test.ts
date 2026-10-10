import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CLUTTER_SPOTS, clutterGeometry, clutterOnPiece, type ClutterKind } from '../../src/presentation/clutter';

/** A stand-in table: a 0.06 m top at 0.72–0.78 m on four legs. */
function table(): THREE.Mesh {
  const parts = [new THREE.BoxGeometry(1.7, 0.06, 0.93).translate(0, 0.75, 0)];
  for (const [x, z] of [[-0.75, -0.38], [0.75, -0.38], [-0.75, 0.38], [0.75, 0.38]]) parts.push(new THREE.BoxGeometry(0.08, 0.72, 0.08).translate(x!, 0.36, z!));
  const merged = new THREE.BufferGeometry();
  const positions: number[] = [], normals: number[] = [];
  for (const p of parts) {
    const g = p.toNonIndexed();
    positions.push(...g.getAttribute('position').array); normals.push(...g.getAttribute('normal').array);
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return new THREE.Mesh(merged, new THREE.MeshStandardMaterial());
}

describe('clutter on the furniture (A76)', () => {
  it('stands every thing on the table top, none floating or sunk', () => {
    const items = clutterOnPiece('table', table(), [1.7, 0.78, 0.9342]);
    expect(items.length).toBe(CLUTTER_SPOTS.table!.length);
    for (const item of items) expect(item.at.y).toBeCloseTo(0.78, 4);
  });

  it('leaves out a spot with nothing level under it', () => {
    const slope = new THREE.Mesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2 + 0.4).translate(0, 0.6, 0), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
    expect(clutterOnPiece('table', slope, [1.7, 0.78, 0.9342])).toEqual([]);
    expect(clutterOnPiece('bed', table(), [2.05, 1.05, 1.1])).toEqual([]);
  });

  it('keeps every thing small, standing on y = 0', () => {
    for (const kind of ['bowl', 'jug', 'cup', 'loaf', 'candle', 'pot'] as ClutterKind[]) {
      const g = clutterGeometry(kind);
      g.computeBoundingBox();
      expect(g.boundingBox!.min.y).toBeGreaterThanOrEqual(-1e-6);
      expect(g.boundingBox!.max.y).toBeLessThan(0.25);
      const triangles = (g.index?.count ?? g.getAttribute('position').count) / 3;
      expect(triangles).toBeLessThan(400);
      g.dispose();
    }
  });
});
