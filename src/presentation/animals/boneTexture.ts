import type { Skeleton } from 'three';

/** Native linear skinning addresses texels by width. Remove only unused bottom rows. */
export function compactAnimalBoneTexture(skeleton: Skeleton): void {
  const compute = skeleton.computeBoneTexture;
  skeleton.computeBoneTexture = function() {
    compute.call(this);
    trimBoneTextureRows(this);
    return this;
  };
  if (skeleton.boneTexture) trimBoneTextureRows(skeleton);
}

function trimBoneTextureRows(skeleton: Skeleton): void {
  const texture = skeleton.boneTexture!;
  const image = texture.image;
  const height = Math.max(1, Math.ceil(skeleton.bones.length * 4 / image.width));
  if (height >= image.height) return;
  const matrices = skeleton.boneMatrices!.subarray(0, image.width * height * 4);
  skeleton.boneMatrices = matrices;
  image.data = matrices;
  image.height = height;
  texture.needsUpdate = true;
}
