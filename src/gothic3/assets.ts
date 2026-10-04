import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import type { SceneModel } from './types';

/** The page and its static assets share a folder at /Tervain/gothic3/. */
export const assetUrl = (path: string): string => new URL(path, new URL('./', location.href)).href;

export class NativeAssets {
  private cache = new Map<string, Promise<THREE.Group>>();
  private textures = new THREE.TextureLoader();

  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  async model(model: SceneModel): Promise<THREE.Group> {
    const key = model.obj + '|' + (model.mtl ?? '') + '|' + (model.unitScale ?? 1);
    let pending = this.cache.get(key);
    if (!pending) {
      pending = this.load(model);
      this.cache.set(key, pending);
    }
    return (await pending).clone(true);
  }

  private async load(model: SceneModel): Promise<THREE.Group> {
    const url = assetUrl(model.obj);
    const manager = new THREE.LoadingManager();
    const loadFailures: string[] = [];
    let materials: MTLLoader.MaterialCreator | undefined;
    if (model.mtl && !url.toLowerCase().endsWith('.fbx')) {
      materials = await new MTLLoader(manager).loadAsync(assetUrl(model.mtl));
    }
    // The OBJ can finish before its images. Include texture completion in the
    // loading screen, and propagate missing images as visible asset warnings.
    const resourcesReady = new Promise<void>((resolve) => { manager.onLoad = resolve; });
    manager.onError = (failedUrl) => { loadFailures.push(failedUrl); };
    let result: THREE.Group;
    if (url.toLowerCase().endsWith('.fbx')) {
      result = await new FBXLoader(manager).loadAsync(url);
    } else {
      const loader = new OBJLoader(manager);
      if (materials) {
        materials.preload();
        loader.setMaterials(materials);
      }
      result = await loader.loadAsync(url);
    }
    await resourcesReady;
    if (loadFailures.length) throw new Error('Missing model resources: ' + loadFailures.join(', '));
    result.scale.setScalar(model.unitScale ?? 1);
    result.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.side = THREE.DoubleSide;
        const textured = material as THREE.MeshPhongMaterial;
        const native = model.materials?.[material.name.replace(/\|$/, '')];
        if (native) {
          // Honor the recorded alpha mode. DXT alpha alone does not make an
          // opaque material transparent (stone textures can contain alpha).
          // Native masks use GREATER with byte/255. Three uses a < discard;
          // one small epsilon also rejects the native equality boundary.
          material.alphaTest = native.blendMode === 1
            ? Math.min(255, Math.max(0, native.maskReference)) / 255 + 1e-7 : 0;
          material.transparent = native.blendMode === 2;
          material.depthWrite = native.blendMode !== 2;
        }
        if (textured.map) {
          textured.map.colorSpace = THREE.SRGBColorSpace;
          textured.map.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        }
        if (material instanceof THREE.MeshPhongMaterial) {
          material.specular.setScalar(0.03);
          material.shininess = 8;
          if (material.name === 'EMFX_Default') material.color.set(0xbba58b);
        }
      }
    });
    return result;
  }

  async texture(path: string): Promise<THREE.Texture> {
    const texture = await this.textures.loadAsync(assetUrl(path));
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
