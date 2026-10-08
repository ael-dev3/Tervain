import * as THREE from 'three';

/**
 * Matte surfaces (A67). Imported models carry their own roughness maps, and some of them read as wet plastic under the
 * sky light: polished hides, glazed leather, skin like lacquer. A floor under the final roughness keeps the maps' variation
 * above it and lifts only what is glossier. Applied to a material it chains any earlier `onBeforeCompile` and extends the
 * program cache key; applying it again just moves the floor. Three's `clone()` does not carry it, so apply it to copies.
 */
export function roughnessFloor<T extends THREE.MeshStandardMaterial>(material: T, floor: number): T {
  const data = material.userData as { tvRoughFloor?: { value: number } };
  if (data.tvRoughFloor && material.customProgramCacheKey().includes(ROUGH_FLOOR_KEY)) {
    data.tvRoughFloor.value = floor;
    material.roughness = Math.max(material.roughness, floor);
    return material;
  }
  const uniform = { value: floor };
  data.tvRoughFloor = uniform;
  const compile = material.onBeforeCompile, programKey = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    shader.uniforms.uTvRoughFloor = uniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uTvRoughFloor;\nvoid main() {')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = max( roughnessFactor, uTvRoughFloor );');
  };
  material.customProgramCacheKey = function () { return `${programKey.call(this)}|${ROUGH_FLOOR_KEY}`; };
  material.roughness = Math.max(material.roughness, floor);
  material.needsUpdate = true;
  return material;
}

const ROUGH_FLOOR_KEY = 'tervain-rough-floor-v1';

/** Hide, fur and feathers: never metal, never polished, and a softer share of the sky's reflection. */
export function matteHide<T extends THREE.MeshStandardMaterial>(material: T): T {
  material.metalness = 0;
  material.metalnessMap = null;
  material.envMapIntensity = Math.min(material.envMapIntensity, 0.75);
  return roughnessFloor(material, 0.8);
}
