import * as THREE from 'three';

/**
 * One clump of grass blades as a tiny, shared mesh. A blade is a strip of `segments` quads narrowing to a single tip
 * vertex; every vertex stores only which blade it belongs to, how far up the blade it sits and which edge it is on.
 * The grass shader builds the actual blade from those and the clump's own seed: where it roots, how tall and wide it
 * is, how it curves, how the wind and anything pushing through bend it. So one small buffer serves every clump in the
 * world, and no two clumps look alike.
 *
 * position = (blade index, height fraction 0..1, edge -1 | 0 | 1). The tip vertex has edge 0.
 */
export interface ClumpSpec {
  blades: number;
  segments: number;
}

/** Rows bunch toward the tip, with the last edge pair sampling both the seed head and flower petals. */
export function bladeRow(row: number, segments: number): number {
  if (row === segments) return 1;
  if (segments === 1) return 0;
  // Both shader head profiles peak at 0.88. Keep that row at every LOD without adding vertices or triangles,
  // and spread the remaining rows below it so leaves still follow the blade's curve.
  return 0.88 * Math.pow(row / (segments - 1), 0.85);
}

export function createGrassClump({ blades, segments }: ClumpSpec): THREE.BufferGeometry {
  if (!Number.isInteger(blades) || blades < 1 || blades > 256) throw new RangeError('A clump needs 1..256 blades.');
  if (!Number.isInteger(segments) || segments < 1 || segments > 12) throw new RangeError('A blade needs 1..12 segments.');
  const perBlade = segments * 2 + 1;
  const position = new Float32Array(blades * perBlade * 3);
  const index: number[] = [];
  for (let b = 0; b < blades; b++) {
    const base = b * perBlade;
    for (let row = 0; row < segments; row++) {
      const t = bladeRow(row, segments);
      for (const [k, edge] of [[0, -1], [1, 1]] as const) {
        const v = (base + row * 2 + k) * 3;
        position[v] = b; position[v + 1] = t; position[v + 2] = edge;
      }
    }
    const tip = (base + segments * 2) * 3;
    position[tip] = b; position[tip + 1] = 1; position[tip + 2] = 0;
    for (let row = 0; row < segments - 1; row++) {
      const a = base + row * 2, c = a + 2;
      index.push(a, a + 1, c + 1, a, c + 1, c);
    }
    const last = base + (segments - 1) * 2;
    index.push(last, last + 1, base + segments * 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
  return geometry;
}

/** Triangles a clump draws. */
export function clumpTriangles({ blades, segments }: ClumpSpec): number {
  return blades * (segments * 2 - 1);
}
