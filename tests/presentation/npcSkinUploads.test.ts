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
    const texture = mesh.skeleton.boneTexture!, data = texture.image.data as Float32Array;
    const initial = data.slice(), version = texture.version;
    for (let i = 0; i < 120; i++) mesh.skeleton.update();
    expect(texture.version - version).toBe(0);
    expect(Array.from(data)).toEqual(Array.from(initial));
    expect(data.byteLength).toBe(2112);
    expect(mesh.skeleton.boneMatrices!.byteLength).toBe(66 * 16 * 4);
    expect(data).not.toBe(mesh.skeleton.boneMatrices);
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

for (const count of [36, 66]) it(`keeps ${count}-joint CPU matrices and animated motion data correct in a compact rectangular texture`, () => {
  const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  const bones = Array.from({ length: count }, () => new THREE.Bone());
  for (const bone of bones.slice(1)) bones[0]!.add(bone);
  mesh.add(bones[0]!); mesh.bind(new THREE.Skeleton(bones));
  const reference = new THREE.Skeleton(bones, mesh.skeleton.boneInverses);
  const skin = installDualQuaternionSkinning(mesh), texture = mesh.skeleton.boneTexture!;
  const gpu = texture.image.data as Float32Array;
  try {
    expect(texture.image.width).toBe(12);
    expect(texture.image.height).toBe(count === 36 ? 6 : 11);
    expect(gpu.byteLength).toBe(count === 36 ? 1152 : 2112);
    expect(skin.base).toBe(0);
    expect(skin.motions.buffer).toBe(gpu.buffer);
    expect(mesh.skeleton.computeBoneTexture().boneTexture).toBe(texture);
    const before = skin.motions.slice();
    for (let i = 1; i <= 120; i++) {
      bones[1]!.rotation.set(i / 300, i / 180, i / 240);
      bones[2]!.position.set(i / 700, 0, -i / 900);
      mesh.updateMatrixWorld(true); reference.update();
      const version = texture.version;
      mesh.skeleton.update();
      expect(Array.from(mesh.skeleton.boneMatrices!)).toEqual(Array.from(reference.boneMatrices!));
      expect(texture.version).toBe(version + 1);
      const packed = skin.motions.slice();
      mesh.skeleton.update();
      expect(texture.version).toBe(version + 1);
      expect(Array.from(skin.motions)).toEqual(Array.from(packed));
    }
    expect(Array.from(skin.motions)).not.toEqual(Array.from(before));
  } finally { skin.dispose(); mesh.skeleton.dispose(); reference.dispose(); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
});
