import { Frustum, Matrix4, type Camera, type Material, type Scene, type ShaderMaterial, type Sprite, type Texture, type WebGLRenderer } from 'three';
import { checkCancelled, yieldToBrowser, type CooperativeOptions } from './cooperative';

export interface PrepareSceneTexturesOptions extends CooperativeOptions {
  onProgress?: (completed: number, total: number) => void;
  /** Restrict prewarming to the real entry camera; rendering visibility stays authoritative. */
  camera?: Camera;
}

/** Collect actual sampler resources without following object/geometry back-references.
 * Texture identities remain separate even when they share decoded image pixels;
 * renderer.initTexture retains Three's own source/sampler GPU reuse policy. */
function sceneTextures(scene: Scene, camera?: Camera): Texture[] {
  const textures = new Set<Texture>(), materials = new Set<Material>(), visited = new WeakSet<object>();
  let frustum: Frustum | undefined;
  if (camera) {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
      camera.coordinateSystem, camera.reversedDepth);
  }
  const add = (value: unknown): boolean => {
    if (!(value as Texture | null)?.isTexture) return false;
    const texture = value as Texture;
    // Render passes allocate and configure their own attachments. Treat them
    // as terminal resources without uploading or walking into their images.
    if (!texture.isRenderTargetTexture) textures.add(texture);
    return true;
  };
  const uniformValue = (value: unknown): void => {
    if (add(value) || !value || typeof value !== 'object' || visited.has(value)) return;
    const resource = value as { isObject3D?: boolean; isMaterial?: boolean; isBufferGeometry?: boolean };
    if (resource.isObject3D || resource.isMaterial || resource.isBufferGeometry || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return;
    visited.add(value);
    for (const entry of Object.values(value)) uniformValue(entry);
  };
  const material = (source: Material): void => {
    if (!source.visible || materials.has(source)) return;
    materials.add(source);
    for (const value of Object.values(source)) add(value);
    // Shader extensions may explicitly expose closure-held sampler textures.
    // This is preparation metadata only; their factory/cache keeps ownership.
    uniformValue(source.userData.preparationTextures);
    for (const uniform of Object.values((source as ShaderMaterial).uniforms ?? {})) uniformValue(uniform.value);
  };
  add(scene.background); add(scene.environment);
  scene.traverseVisible(object => {
    if (camera && !object.layers.test(camera.layers)) return;
    const source = (object as { material?: Material | Material[] }).material;
    if (!source) return;
    if (frustum && object.frustumCulled) {
      const drawable = object as { isSprite?: boolean; geometry?: unknown };
      if (drawable.isSprite ? !frustum.intersectsSprite(object as Sprite) : drawable.geometry && !frustum.intersectsObject(object)) return;
    }
    if (Array.isArray(source)) source.forEach(material);
    else if (source) material(source);
  });
  return [...textures];
}

/** Upload immutable scene samplers before the first draw, yielding between bounded batches.
 * These resources remain owned by their original scene/cache; cancellation never disposes them. */
export async function prepareSceneTextures(renderer: Pick<WebGLRenderer, 'initTexture'>, scene: Scene,
  options: PrepareSceneTexturesOptions = {}): Promise<void> {
  checkCancelled(options.signal);
  const textures = sceneTextures(scene, options.camera), budget = Math.max(0, options.budgetMs ?? 8);
  let deadline = performance.now() + budget, completed = 0;
  options.onProgress?.(completed, textures.length);
  for (const texture of textures) {
    checkCancelled(options.signal);
    renderer.initTexture(texture);
    completed++;
    options.onProgress?.(completed, textures.length);
    if (completed < textures.length && performance.now() >= deadline) {
      await (options.yieldNow ?? yieldToBrowser)();
      deadline = performance.now() + budget;
    }
  }
  checkCancelled(options.signal);
}
