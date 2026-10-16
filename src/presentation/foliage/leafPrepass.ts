import * as THREE from 'three';

/**
 * Leaves shaded once per pixel (Air budget). A crown is many cut-out cards deep, and a cut-out (discard, alpha to
 * coverage) keeps the GPU from rejecting hidden fragments before they are shaded, so every card behind the nearest
 * was lit, shadowed and coloured for nothing. The leaves now draw twice:
 *
 *  - a depth pass: the same material and vertex program (wind, distance dither, the A69/A133 cut-out and its alpha to
 *    coverage), stopping right after the cut-out, writing depth only;
 *  - the colour pass: depth test EQUAL and no depth write, no cut-out of its own. Only the nearest leaf's samples pass,
 *    exactly the samples the depth pass covered, so edges keep their multisampled coverage.
 *
 * Both programs declare `invariant gl_Position` (foliageMaterial.ts), so their depths match bit for bit.
 */
export const LEAF_DEPTH_ONLY = 'TV_LEAF_DEPTH_ONLY';
export const LEAF_SHADE_ONLY = 'TV_LEAF_SHADE_ONLY';

/** Colour material → its depth-pass twin. Tree profiles may share one leaf material between meshes. */
const split = new WeakMap<THREE.Material, THREE.Material>();

function splitMaterial(colour: THREE.Material): THREE.Material | null {
  if (!(colour.alphaTest > 0)) return null;
  const depth = colour.clone();
  // Material.clone() does not copy these hooks; the depth pass must run the very same patches.
  depth.onBeforeCompile = colour.onBeforeCompile;
  depth.onBeforeRender = colour.onBeforeRender;
  const key = colour.customProgramCacheKey;
  depth.customProgramCacheKey = function() { return `${key.call(this)}|leaf-depth`; };
  depth.defines = { ...colour.defines, [LEAF_DEPTH_ONLY]: '' };
  depth.colorWrite = false;
  depth.needsUpdate = true;

  colour.defines = { ...colour.defines, [LEAF_SHADE_ONLY]: '' };
  colour.alphaToCoverage = false;
  colour.depthWrite = false;
  colour.depthFunc = THREE.EqualDepth;
  const colourKey = colour.customProgramCacheKey;
  colour.customProgramCacheKey = function() { return `${colourKey.call(this)}|leaf-shade`; };
  colour.needsUpdate = true;
  split.set(colour, depth);
  return depth;
}

/** Turns `leaf` into the colour pass and returns its depth pass (drawn first), or null when it has no cut-out. */
export function splitLeafPrepass(leaf: THREE.InstancedMesh): THREE.InstancedMesh | null {
  const colour = leaf.material;
  if (Array.isArray(colour)) return null;
  const material = split.get(colour) ?? splitMaterial(colour);
  if (!material) return null;
  const depth = new THREE.InstancedMesh(leaf.geometry, material, leaf.instanceMatrix.count);
  // Shared buffers: the colour pass's instance writes and uploads serve both.
  depth.instanceMatrix = leaf.instanceMatrix;
  depth.instanceColor = leaf.instanceColor;
  depth.count = 0;
  depth.visible = false;
  depth.frustumCulled = false;
  depth.castShadow = false;
  // The same vertex program as the colour pass (receiving shadows adds vertex outputs, never moves a vertex).
  depth.receiveShadow = leaf.receiveShadow;
  depth.renderOrder = leaf.renderOrder - 1;
  depth.name = `${leaf.name}:depth`;
  return depth;
}
