import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Ctx } from '../../src/presentation/buildKit';
import { Region, disposeGroup, type MatKey } from '../../src/presentation/regions';
import { buildMenuCamp, HERMIT_DOOR } from '../../src/presentation/menu/menuCamp';
import { TREE_HOLLOW, buildAncientTree, type AncientTree } from '../../src/presentation/menu/menuTree';

const finite = (values: ArrayLike<number>) => Array.from(values).every(Number.isFinite);

function fixture() {
  const borrowed = new Map<MatKey, THREE.Material>();
  const mats = { get(key: MatKey) {
    if (!borrowed.has(key)) borrowed.set(key, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, vertexColors: true }));
    return borrowed.get(key)!;
  } };
  const region = new Region('Test_Door_Static', new Ctx());
  // Exercise a translated, rotated doorway; an identity frame can hide a misplaced hinge.
  const at = new THREE.Vector3(18, 0.7, 9);
  const camp = buildMenuCamp(region, { at, facing: 0.63 }, { x: 18, z: 9, r: 2.9, roots: [] }, mats);
  const staticGroup = region.toGroup(mats);
  const door = camp.group.getObjectByName('Menu_Tree_Door')!;
  const hinge = camp.group.getObjectByName('Menu_Tree_Door_Hinge')!;
  camp.group.updateMatrixWorld(true);
  staticGroup.updateMatrixWorld(true);
  return { camp, door, hinge, staticGroup, borrowed, cleanup() {
    camp.dispose();
    disposeGroup(staticGroup);
    for (const material of borrowed.values()) material.dispose();
  } };
}

function vertexWorld(mesh: THREE.Mesh, index = 0) {
  return new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'), index).applyMatrix4(mesh.matrixWorld);
}

function localRay(frame: THREE.Object3D, origin: THREE.Vector3, direction: THREE.Vector3, far: number) {
  return new THREE.Raycaster(origin.clone().applyMatrix4(frame.matrixWorld), direction.clone().transformDirection(frame.matrixWorld), 0, far);
}

describe('the tree doorway aperture', () => {
  let tree: AncientTree;
  let bark: THREE.Mesh;
  let frame: THREE.Object3D;
  let material: THREE.MeshBasicMaterial;
  beforeAll(() => {
    tree = buildAncientTree(1207, {
      leafCards: 0,
      ground: (x, z) => 0.35 + 0.04 * z - 0.02 * x,
      door: { az: 1.68, halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop,
        opening: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height } },
    });
    material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    bark = new THREE.Mesh(tree.wood, material);
    bark.updateMatrixWorld(true);
    const face = tree.door!;
    frame = new THREE.Object3D();
    frame.position.fromArray(face.origin);
    frame.rotation.y = Math.atan2(face.normal[0], face.normal[2]);
    frame.updateMatrixWorld(true);
  });
  afterAll(() => { tree.wood.dispose(); tree.leaves.dispose(); material.dispose(); });

  it('has an actual open passage through the front bark and on into the hollow, including the edges of the opening', () => {
    const half = HERMIT_DOOR.width / 2;
    const xs = [-half + 0.006, -half + 0.035, -0.2, 0, 0.2, half - 0.035, half - 0.006];
    const ys = [0.07, 0.23, 0.51, 0.89, 1.26, 1.53, HERMIT_DOOR.height - 0.006];
    const blocked: { x: number; y: number; depth: number }[] = [];
    for (const x of xs) for (const y of ys) {
      // Nothing of the tree — bark, bough or root — may lie in the doorway or anywhere in the hollow behind it.
      const hits = localRay(frame, new THREE.Vector3(x, y, 0.35), new THREE.Vector3(0, 0, -1), 0.35 + TREE_HOLLOW.depth - 0.02).intersectObject(bark);
      if (hits.length) blocked.push({ x, y, depth: hits[0]!.distance - 0.35 });
    }
    expect(blocked, 'bark triangles must not block the door aperture').toEqual([]);
  });

  it('retains the bark beside and above the door, and the far side of the bole', () => {
    for (const x of [-0.53, 0.53]) for (const y of [0.3, 0.8, 1.35]) {
      const hits = localRay(frame, new THREE.Vector3(x, y, 0.35), new THREE.Vector3(0, 0, -1), 0.6).intersectObject(bark);
      expect(hits.length, `missing bark behind the post at ${x},${y}`).toBeGreaterThan(0);
    }
    const lintel = localRay(frame, new THREE.Vector3(0, 1.82, 0.35), new THREE.Vector3(0, 0, -1), 0.6).intersectObject(bark);
    expect(lintel.length).toBeGreaterThan(0);
    const back = localRay(frame, new THREE.Vector3(0, 0.9, 0.35), new THREE.Vector3(0, 0, -1), 8).intersectObject(bark);
    expect(back.length).toBeGreaterThan(0);
    expect(back[0]!.distance).toBeGreaterThan(0.35 + TREE_HOLLOW.depth);
    expect(back[0]!.distance).toBeLessThan(7);
  });
});

describe('the native hinged tree door', () => {
  it('keeps the leaf, grille and its light together around the fixed left-post hinge', () => {
    const f = fixture();
    try {
      f.camp.setDoorAngle(0);
      const meshes = ['planks', 'metal', 'glow'].map((key) => f.hinge.getObjectByName(`Menu_Tree_Door_Leaf:${key}`) as THREE.Mesh);
      expect(meshes.every((mesh) => mesh?.isMesh)).toBe(true);
      const pivot = f.hinge.getWorldPosition(new THREE.Vector3());
      const pivotInDoor = f.door.worldToLocal(pivot.clone());
      expect(pivotInDoor.x).toBeCloseTo(-HERMIT_DOOR.width / 2, 7);
      expect(pivotInDoor.y).toBeCloseTo(0, 7);
      expect(pivotInDoor.z).toBeCloseTo(HERMIT_DOOR.hingeZ, 7);
      expect(pivotInDoor.z).toBeGreaterThan(0.08); // hinge is in front of the solid post's outer face
      const closed = meshes.map((mesh) => vertexWorld(mesh));
      const distances = closed.map((p) => p.distanceTo(pivot));
      const lantern = f.camp.lanterns[0]!.clone();
      const grilleLight = f.camp.lanterns[1]!.clone();
      const grilleDistance = grilleLight.distanceTo(pivot);
      for (const angle of [0.3, 1.0, 1.34, 0]) {
        f.camp.setDoorAngle(angle);
        expect(f.hinge.rotation.y).toBeCloseTo(-angle, 9);
        expect(f.hinge.getWorldPosition(new THREE.Vector3()).distanceTo(pivot)).toBeLessThan(1e-7);
        const points = meshes.map((mesh) => vertexWorld(mesh));
        points.forEach((p, i) => expect(p.distanceTo(pivot)).toBeCloseTo(distances[i]!, 6));
        for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
          expect(points[i]!.distanceTo(points[j]!)).toBeCloseTo(closed[i]!.distanceTo(closed[j]!), 6);
        }
        expect(f.camp.lanterns[0]!.distanceTo(lantern)).toBe(0);
        expect(f.camp.lanterns[1]!.distanceTo(pivot)).toBeCloseTo(grilleDistance, 6);
        if (angle === 1.34) {
          points.forEach((p, i) => expect(p.distanceTo(closed[i]!)).toBeGreaterThan(0.03));
          expect(f.camp.lanterns[1]!.distanceTo(grilleLight)).toBeGreaterThan(0.3);
        }
        if (angle === 0) points.forEach((p, i) => expect(p.distanceTo(closed[i]!)).toBeLessThan(1e-7));
      }
    } finally { f.cleanup(); }
  });

  it('swings the leaf outward only, never into the doorway or the hollow, and clamps invalid angles', () => {
    const f = fixture();
    try {
      expect(f.door.getObjectByName('Menu_Tree_Door_Interior')).toBeUndefined();
      for (const angle of [0, 0.25, 0.6, 1, 1.34]) {
        f.camp.setDoorAngle(angle);
        f.hinge.traverse((object) => {
          if (!(object as THREE.Mesh).isMesh) return;
          const mesh = object as THREE.Mesh;
          const pos = mesh.geometry.getAttribute('position');
          expect(finite(pos.array)).toBe(true);
          for (let i = 0; i < pos.count; i++) {
            const p = f.door.worldToLocal(vertexWorld(mesh, i));
            expect(p.z, `${mesh.name} intersects the doorway at angle ${angle}`).toBeGreaterThanOrEqual(-1e-6);
          }
        });
      }
      for (const [angle, expected] of [[-4, 0], [4, Math.PI / 2], [Number.NaN, 0], [Number.POSITIVE_INFINITY, 0], [0.7, 0.7]] as const) {
        f.camp.setDoorAngle(angle);
        expect(f.hinge.rotation.y).toBeCloseTo(-expected, 9);
        expect(finite(f.hinge.matrixWorld.elements)).toBe(true);
      }
    } finally { f.cleanup(); }
  });

  it('disposes its own door geometry once while leaving borrowed camp materials and static geometry intact', () => {
    const f = fixture();
    try {
      const geometries = new Set<THREE.BufferGeometry>();
      f.door.traverse((object) => { if ((object as THREE.Mesh).isMesh) geometries.add((object as THREE.Mesh).geometry); });
      expect(geometries.size).toBeGreaterThanOrEqual(3);
      const owned = [...geometries].map((geometry) => vi.spyOn(geometry, 'dispose'));
      const borrowed = [...f.borrowed.values()].map((material) => vi.spyOn(material, 'dispose'));
      const timber = f.staticGroup.getObjectByName('Test_Door_Static:timber') as THREE.Mesh;
      const staticGeometry = vi.spyOn(timber.geometry, 'dispose');
      f.camp.dispose();
      f.camp.dispose();
      for (const spy of owned) expect(spy).toHaveBeenCalledTimes(1);
      for (const spy of borrowed) expect(spy).not.toHaveBeenCalled();
      expect(staticGeometry).not.toHaveBeenCalled();
    } finally { f.cleanup(); }
  });
});