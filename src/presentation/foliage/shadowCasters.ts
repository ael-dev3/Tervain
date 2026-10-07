import * as THREE from 'three';

/**
 * A group drawn only into the sun's shadow map. Three builds the camera's render list before it renders shadows, so the
 * group is hidden as each render of the scene begins and shown only when the sun's shadow pass starts (its shadow
 * matrices are updated immediately before the casters are drawn). The colour pass never sees these meshes, so lighter
 * shadow geometry costs the picture nothing, and reflections or captures that skip shadow updates never draw them.
 *
 * Returns a function that removes both hooks again (dispose in reverse order of installation, as the world does).
 */
export function installShadowOnlyGroup(scene: THREE.Scene, light: THREE.DirectionalLight, group: THREE.Object3D): () => void {
  const previousRender = scene.onBeforeRender;
  scene.onBeforeRender = function (this: THREE.Scene, renderer, s, camera, geometry, material, g) {
    group.visible = false;
    previousRender.call(this, renderer, s, camera, geometry, material, g);
  };
  const shadow = light.shadow;
  const hadOwn = Object.prototype.hasOwnProperty.call(shadow, 'updateMatrices');
  const previousUpdate = shadow.updateMatrices;
  shadow.updateMatrices = function (this: THREE.LightShadow<THREE.Camera>, ...args: Parameters<THREE.LightShadow<THREE.Camera>['updateMatrices']>) {
    group.visible = true;
    return previousUpdate.apply(this, args);
  };
  group.visible = false;
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    scene.onBeforeRender = previousRender;
    if (hadOwn) shadow.updateMatrices = previousUpdate;
    else delete (shadow as { updateMatrices?: unknown }).updateMatrices;
    group.visible = false;
  };
}

/** A shadow-only copy of a mesh's geometry: the same GPU buffers, its own instance list. */
export function shadowGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    // Per-instance and per-mesh visibility data stay with the colour mesh.
    if (name === 'aDistanceCoverage') continue;
    geometry.setAttribute(name, attribute);
  }
  geometry.setIndex(source.index);
  if (!source.boundingSphere) source.computeBoundingSphere();
  geometry.boundingSphere = source.boundingSphere?.clone() ?? null;
  return geometry;
}

/** The depth material a cut-out leaf needs to cast its own shape. */
export function shadowDepthMaterial(source: THREE.Material): THREE.MeshDepthMaterial {
  const s = source as THREE.MeshStandardMaterial;
  return new THREE.MeshDepthMaterial({
    map: s.map ?? null, alphaMap: s.alphaMap ?? null, alphaTest: s.alphaTest ?? 0, side: s.side,
    depthPacking: THREE.RGBADepthPacking,
  });
}
