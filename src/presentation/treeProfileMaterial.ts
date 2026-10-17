import type * as THREE from 'three';
import type { Quality } from './context';

/** Each tree profile owns its uniforms, while retaining the source's shader hooks. */
export function cloneTreeProfileMaterial(source: THREE.Material, quality: Quality): THREE.Material {
  const material = source.clone();
  // Material.clone() does not copy the bark and other source patches.
  material.onBeforeCompile = source.onBeforeCompile;
  material.customProgramCacheKey = source.customProgramCacheKey;
  // Low has no multisample scene target: use the existing single-sample cutout
  // rather than emitting fractional alpha with no coverage samples to apply it to.
  if (quality === 'low') material.alphaToCoverage = false;
  return material;
}
