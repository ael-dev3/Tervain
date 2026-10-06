import * as THREE from 'three';
import type { AnimalDefinition } from './catalog';
import type { AnimalId } from '../../game/hunting';

export interface AnimalArrowHit {
  id: AnimalId;
  /** A rigid antler or existing corpse stops the arrow without damaging the animal. */
  zone: 'head' | 'body' | null;
  point: { x: number; y: number; z: number };
  distance: number;
  /** The animal root, rather than the surface impact, anchors a persistent carcass. */
  position: { x: number; y: number; z: number };
  yaw: number;
}

// Skull stations in the delivered models' rest geometry. Antlers/ears are not a skull hit box.
// These values follow the same individual proportions as the authored skeletons, including the seated cat.
const SKULLS: Record<string, { height: number; rear: number }> = {
  'bear-a': { height: .75, rear: .27 }, 'bear-b': { height: .76, rear: .26 },
  lion: { height: .83, rear: .21 }, tiger: { height: .76, rear: .22 },
  'wolf-a': { height: .82, rear: .22 }, 'wolf-b': { height: .79, rear: .21 }, 'wolf-c': { height: .80, rear: .28 },
  'cat-a': { height: .76, rear: .22 }, 'cat-b': { height: .83, rear: .23 }, 'cat-c': { height: .76, rear: .21 },
  'dog-a': { height: .81, rear: .21 }, 'dog-b': { height: .78, rear: .19 },
  'boar-a': { height: .64, rear: .33 }, 'boar-b': { height: .65, rear: .28 }, 'boar-c': { height: .65, rear: .28 },
  stag: { height: .70, rear: .23 }, 'deer-mount': { height: .69, rear: .23 },
  'deer-a': { height: .70, rear: .24 }, 'deer-b': { height: .66, rear: .24 },
};

interface Surface {
  mesh: THREE.SkinnedMesh;
  bounds: THREE.Box3;
  headJoints: Set<number>;
  cells: { bounds: THREE.Box3; triangles: number[]; joints: number[] }[];
  transforms: THREE.Matrix4[];
  vertices: Float64Array;
  versions: Uint32Array;
  version: number;
}

/** Actual animated triangles decide contact; rest-surface anatomy decides which tissue was contacted. */
export class AnimalArrowSurface {
  private surfaces: Surface[] = [];
  private raycaster = new THREE.Raycaster();
  private local = new THREE.Vector3();
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  private c = new THREE.Vector3();
  private barycentric = new THREE.Vector3();
  private rest = new THREE.Vector3();
  private source = new THREE.Vector3();
  private sphere = new THREE.Sphere();
  private nearest = new THREE.Vector3();
  private cellBounds = new THREE.Box3();
  private transformed = new THREE.Box3();
  private point = new THREE.Vector3();

  constructor(private definition: AnimalDefinition, scene: THREE.Group) {
    scene.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox!.clone(), size = bounds.getSize(new THREE.Vector3());
      const position = mesh.geometry.attributes.position!, skinIndex = mesh.geometry.attributes.skinIndex!, skinWeight = mesh.geometry.attributes.skinWeight!, index = mesh.geometry.index;
      const cells = new Map<string, { bounds: THREE.Box3; triangles: number[]; joints: Set<number> }>();
      const count = index?.count ?? position.count;
      for (let triangle = 0; triangle < count; triangle += 3) {
        const vertices = [index?.getX(triangle) ?? triangle, index?.getX(triangle + 1) ?? triangle + 1, index?.getX(triangle + 2) ?? triangle + 2];
        this.rest.set(0, 0, 0);
        for (const vertex of vertices) this.rest.add(this.source.fromBufferAttribute(position, vertex));
        this.rest.multiplyScalar(1 / 3).sub(bounds.min).divide(size);
        const key = `${Math.min(3, Math.floor(this.rest.x * 4))},${Math.min(3, Math.floor(this.rest.y * 4))},${Math.min(7, Math.floor(this.rest.z * 8))}`;
        let cell = cells.get(key);
        if (!cell) { cell = { bounds: new THREE.Box3(), triangles: [], joints: new Set() }; cells.set(key, cell); }
        cell.triangles.push(triangle);
        for (const vertex of vertices) {
          cell.bounds.expandByPoint(this.source.fromBufferAttribute(position, vertex));
          for (let component = 0; component < 4; component++) if (skinWeight.getComponent(vertex, component) > 0) cell.joints.add(skinIndex.getComponent(vertex, component));
        }
      }
      this.surfaces.push({ mesh, bounds, cells: [...cells.values()].map((cell) => ({ ...cell, joints: [...cell.joints] })),
        headJoints: new Set(mesh.skeleton.bones.flatMap((bone, index) => bone.name === 'Head' || bone.name === 'Jaw' ? [index] : [])),
        transforms: mesh.skeleton.bones.map(() => new THREE.Matrix4()), vertices: new Float64Array(position.count * 3), versions: new Uint32Array(position.count), version: 0 });
    });
  }

  trace(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): Omit<AnimalArrowHit, 'id' | 'position' | 'yaw'> | null {
    if (!(maxDistance > 0) || !Number.isFinite(maxDistance) || direction.lengthSq() < 1e-12) return null;
    this.raycaster.set(origin, direction.clone().normalize());
    this.raycaster.near = 0; this.raycaster.far = maxDistance;
    let result: Omit<AnimalArrowHit, 'id' | 'position' | 'yaw'> | null = null;
    for (const surface of this.surfaces) {
      const { mesh } = surface;
      this.sphere.copy(mesh.boundingSphere ?? mesh.geometry.boundingSphere ?? new THREE.Sphere()).applyMatrix4(mesh.matrixWorld);
      const along = this.nearest.copy(this.sphere.center).sub(origin).dot(this.raycaster.ray.direction);
      this.raycaster.ray.at(Math.max(0, Math.min(maxDistance, along)), this.nearest);
      if (this.nearest.distanceToSquared(this.sphere.center) > this.sphere.radius * this.sphere.radius) continue;
      surface.version++;
      for (let joint = 0; joint < surface.transforms.length; joint++) surface.transforms[joint]!.copy(mesh.matrixWorld).multiply(mesh.bindMatrixInverse)
        .multiply(mesh.skeleton.bones[joint]!.matrixWorld).multiply(mesh.skeleton.boneInverses[joint]!).multiply(mesh.bindMatrix);
      const index = mesh.geometry.index;
      for (const cell of surface.cells) {
        this.cellBounds.makeEmpty();
        // A weighted vertex is a convex blend of joint-transformed rest vertices. This union encloses that blend.
        for (const joint of cell.joints) this.cellBounds.union(this.transformed.copy(cell.bounds).applyMatrix4(surface.transforms[joint]!));
        this.cellBounds.expandByScalar(.00001);
        const inBox = this.raycaster.ray.intersectBox(this.cellBounds, this.point);
        if (!inBox || !this.cellBounds.containsPoint(origin) && origin.distanceToSquared(inBox) > (result?.distance ?? maxDistance) ** 2) continue;
        for (const triangle of cell.triangles) {
          const a = index?.getX(triangle) ?? triangle, b = index?.getX(triangle + 1) ?? triangle + 1, c = index?.getX(triangle + 2) ?? triangle + 2;
          this.posedVertex(surface, a, this.a); this.posedVertex(surface, b, this.b); this.posedVertex(surface, c, this.c);
          const material = Array.isArray(mesh.material) ? mesh.material[0]! : mesh.material;
          const point = material.side === THREE.BackSide ? this.raycaster.ray.intersectTriangle(this.c, this.b, this.a, true, this.point)
            : this.raycaster.ray.intersectTriangle(this.a, this.b, this.c, material.side !== THREE.DoubleSide, this.point);
          if (!point) continue;
          const distance = origin.distanceTo(point);
          if (distance > maxDistance || result && distance >= result.distance) continue;
          const zone = this.classify(surface, { object: mesh, point: point.clone(), distance, face: { a, b, c, normal: new THREE.Vector3(), materialIndex: 0 } });
          result = { zone, point: { x: point.x, y: point.y, z: point.z }, distance };
        }
      }
    }
    return result;
  }

  private posedVertex(surface: Surface, vertex: number, target: THREE.Vector3) {
    const offset = vertex * 3;
    if (surface.versions[vertex] !== surface.version) {
      surface.mesh.getVertexPosition(vertex, target); surface.mesh.localToWorld(target);
      surface.vertices[offset] = target.x; surface.vertices[offset + 1] = target.y; surface.vertices[offset + 2] = target.z;
      surface.versions[vertex] = surface.version;
    } else target.set(surface.vertices[offset]!, surface.vertices[offset + 1]!, surface.vertices[offset + 2]!);
  }

  private classify(surface: Surface, intersection: THREE.Intersection): 'head' | 'body' | null {
    const { mesh, bounds, headJoints } = surface, face = intersection.face!;
    mesh.worldToLocal(this.local.copy(intersection.point));
    mesh.getVertexPosition(face.a, this.a); mesh.getVertexPosition(face.b, this.b); mesh.getVertexPosition(face.c, this.c);
    THREE.Triangle.getBarycoord(this.local, this.a, this.b, this.c, this.barycentric);
    this.rest.set(0, 0, 0);
    let headWeight = 0;
    const position = mesh.geometry.attributes.position!, indices = mesh.geometry.attributes.skinIndex!, weights = mesh.geometry.attributes.skinWeight!;
    for (const [vertex, amount] of [[face.a, this.barycentric.x], [face.b, this.barycentric.y], [face.c, this.barycentric.z]] as const) {
      this.rest.addScaledVector(this.source.fromBufferAttribute(position, vertex), amount);
      for (let component = 0; component < 4; component++) if (headJoints.has(indices.getComponent(vertex, component))) headWeight += amount * weights.getComponent(vertex, component);
    }
    const profile = SKULLS[this.definition.id];
    if (!profile) return 'body';
    const height = bounds.max.y - bounds.min.y, length = bounds.max.z - bounds.min.z;
    const relativeY = (this.rest.y - bounds.min.y) / height;
    const fromNose = (bounds.max.z - this.rest.z) / length;
    const crowned = this.definition.species === 'deer' || this.definition.species === 'stag';
    // Antlers are rigidly weighted to Head for animation. Weight alone would turn every antler into a lethal head shot.
    if (crowned && relativeY > profile.height + .075) return null;
    const skull = fromNose <= profile.rear && relativeY >= profile.height - .22 && relativeY <= profile.height + .075;
    // These two stocky cats blend the face heavily with Chest/Neck. Deformation weights are not tissue labels.
    const faceInfluence = this.definition.species === 'cat' || headWeight >= .22;
    return skull && faceInfluence ? 'head' : 'body';
  }
}
