import * as THREE from 'three';

/** Derived bounds only: a moving object or an edited local bound invalidates its entry. */
export class ReflectionBounds {
  private readonly spheres = new WeakMap<THREE.Matrix4, { matrix: THREE.Matrix4; local: THREE.Sphere; world: THREE.Sphere }>();
  private readonly boxes = new WeakMap<THREE.Matrix4, { matrix: THREE.Matrix4; local: THREE.Box3; world: THREE.Box3 }>();

  sphere(local: THREE.Sphere, matrix: THREE.Matrix4): THREE.Sphere {
    let entry = this.spheres.get(matrix);
    if (!entry) {
      entry = { matrix: matrix.clone(), local: local.clone(), world: local.clone().applyMatrix4(matrix) };
      this.spheres.set(matrix, entry);
    } else if (!entry.matrix.equals(matrix) || !entry.local.equals(local)) {
      entry.matrix.copy(matrix); entry.local.copy(local);
      entry.world.copy(local).applyMatrix4(matrix);
    }
    return entry.world;
  }

  box(local: THREE.Box3, matrix: THREE.Matrix4): THREE.Box3 {
    let entry = this.boxes.get(matrix);
    if (!entry) {
      entry = { matrix: matrix.clone(), local: local.clone(), world: local.clone().applyMatrix4(matrix) };
      this.boxes.set(matrix, entry);
    } else if (!entry.matrix.equals(matrix) || !entry.local.equals(local)) {
      entry.matrix.copy(matrix); entry.local.copy(local);
      entry.world.copy(local).applyMatrix4(matrix);
    }
    return entry.world;
  }
}
