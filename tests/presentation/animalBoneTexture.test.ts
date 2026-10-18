import * as THREE from 'three';
import { expect, it } from 'vitest';
import { compactAnimalBoneTexture } from '../../src/presentation/animals/boneTexture';

it.each([1, 4, 5, 16, 17, 29, 36, 64, 65])('preserves native texel addressing and animated matrices for %i bones', count => {
  const bones = Array.from({ length: count }, () => new THREE.Bone());
  const controls = Array.from({ length: count }, () => new THREE.Bone());
  const compact = new THREE.Skeleton(bones), normal = new THREE.Skeleton(controls);
  compactAnimalBoneTexture(compact); compact.computeBoneTexture(); normal.computeBoneTexture();
  const width = normal.boneTexture!.image.width;
  expect(compact.boneTexture!.image.width).toBe(width);
  expect(compact.boneTexture!.image.height).toBe(Math.ceil(count * 4 / width));
  for (let frame = 0; frame < 12; frame++) {
    for (let i = 0; i < count; i++) {
      bones[i]!.rotation.set(frame * .03, i * .01, frame * .02);
      controls[i]!.rotation.copy(bones[i]!.rotation);
      bones[i]!.position.set(i, frame * .1, -i); controls[i]!.position.copy(bones[i]!.position);
      bones[i]!.updateMatrixWorld(true); controls[i]!.updateMatrixWorld(true);
    }
    const version = compact.boneTexture!.version;
    compact.update(); normal.update();
    expect(compact.boneTexture!.version).toBe(version + 1);
    expect(compact.boneMatrices!.slice(0, count * 16)).toEqual(normal.boneMatrices!.slice(0, count * 16));
    // Exercise exactly the shader's four texelFetch addresses, including the last joint.
    for (let joint = 0; joint < count; joint++) for (let column = 0; column < 4; column++) {
      const texel = joint * 4 + column, x = texel % width, y = Math.floor(texel / width);
      expect(y).toBeLessThan(compact.boneTexture!.image.height);
      expect(compact.boneMatrices!.slice((y * width + x) * 4, (y * width + x + 1) * 4))
        .toEqual(normal.boneMatrices!.slice(texel * 4, (texel + 1) * 4));
    }
  }
  compact.computeBoneTexture(); compact.update();
  expect(compact.boneMatrices!.slice(0, count * 16)).toEqual(normal.boneMatrices!.slice(0, count * 16));
});

it('also trims an existing texture, retaining its width, filter and complete last bone', () => {
  const s = new THREE.Skeleton(Array.from({ length: 29 }, () => new THREE.Bone()));
  s.computeBoneTexture(); s.update(); const t = s.boneTexture!, filter = t.minFilter;
  compactAnimalBoneTexture(s);
  expect(s.boneTexture).toBe(t); expect(t.image.width).toBe(12); expect(t.image.height).toBe(10);
  expect(t.image.data!.byteLength).toBe(1920); expect(t.minFilter).toBe(filter);
  expect(s.boneMatrices![28 * 16 + 15]).toBe(1);
});
