import * as THREE from 'three';
import { expect, it } from 'vitest';
import { installDualQuaternionSkinning } from '../../src/presentation/npc/dualQuaternionSkinning';

it('does not request repeat bone-texture uploads for unchanged poses, but uploads every changed packed pose', () => {
  const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  const bones = Array.from({ length: 66 }, () => new THREE.Bone());
  for (let i = 1; i < bones.length; i++) bones[0]!.add(bones[i]!);
  mesh.add(bones[0]!);
  mesh.bind(new THREE.Skeleton(bones));
  const skin = installDualQuaternionSkinning(mesh);
  try {
    mesh.updateMatrixWorld(true); mesh.skeleton.update();
    const texture = mesh.skeleton.boneTexture!, data = mesh.skeleton.boneMatrices!;
    const initial = data.slice(), version = texture.version;
    for (let i = 0; i < 120; i++) mesh.skeleton.update();
    expect(texture.version - version).toBe(0);
    expect(Array.from(data)).toEqual(Array.from(initial));
    expect(data.byteLength).toBe(6400);
    bones[1]!.rotation.y = .4;
    mesh.updateMatrixWorld(true); mesh.skeleton.update();
    expect(texture.version).toBe(version + 1);
    expect(Array.from(data)).not.toEqual(Array.from(initial));
    const moved = data.slice();
    mesh.skeleton.update();
    expect(texture.version).toBe(version + 1);
    expect(Array.from(data)).toEqual(Array.from(moved));
    // Bind changes affect the packed dual quaternions even when the bone matrices stay unchanged.
    mesh.bindMatrix.makeTranslation(.3, 0, 0);
    mesh.bindMatrixInverse.copy(mesh.bindMatrix).invert();
    mesh.skeleton.update();
    expect(texture.version).toBe(version + 2);
    expect(Array.from(data)).not.toEqual(Array.from(moved));
    const inverse = mesh.skeleton.boneInverses[0]!;
    Reflect.set(mesh.skeleton.boneInverses, 0, undefined);
    expect(() => mesh.skeleton.update()).toThrow();
    expect(mesh.skeleton.boneTexture).toBe(texture);
    mesh.skeleton.boneInverses[0] = inverse;
  } finally { skin.dispose(); mesh.skeleton.dispose(); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
});
