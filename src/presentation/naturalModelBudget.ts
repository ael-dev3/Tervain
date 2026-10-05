import type * as THREE from 'three';

/** Owner cap applies to one complete rock/tree model, including wood and leaves. */
export const NATURAL_MODEL_TRIANGLE_LIMIT = 20_000;

export function assertNaturalModelBudget(label: string, geometries: readonly (THREE.BufferGeometry | null)[]): number {
  let triangles = 0;
  for (const geometry of geometries) {
    if (!geometry) continue;
    const vertices = geometry.index?.count ?? geometry.getAttribute('position')?.count;
    if (vertices === undefined || !Number.isFinite(vertices) || vertices <= 0 || vertices % 3 !== 0) {
      throw new Error(`${label} requires finite triangle-list geometry.`);
    }
    triangles += vertices / 3;
  }
  if (triangles <= 0 || triangles > NATURAL_MODEL_TRIANGLE_LIMIT) {
    throw new Error(`${label} has ${triangles} triangles; complete rock/tree models must fit ${NATURAL_MODEL_TRIANGLE_LIMIT}.`);
  }
  return triangles;
}
