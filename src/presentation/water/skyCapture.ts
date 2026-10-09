import { GPU } from '../skyState';
import * as THREE from 'three';

/** The layer the sky dome and stars also live on, so a capture can draw them and nothing else. */
export const WATER_SKY_LAYER = 4;

/**
 * The sky as water sees it: the actual dome, clouds, sun glow and stars, captured into a small cube with mip levels,
 * so calm water reflects the clouds overhead and rough water a blur of them. Refreshed a few times a second; the sky
 * changes slowly.
 */
export class SkyCapture {
  private readonly target: THREE.WebGLCubeRenderTarget;
  private readonly camera: THREE.CubeCamera;
  private age = Infinity;
  private disposed = false;
  ready = false;

  constructor(size = 128, private readonly interval = 0.6) {
    this.target = new THREE.WebGLCubeRenderTarget(size, {
      type: GPU.halfTargets ? THREE.HalfFloatType : THREE.UnsignedByteType, generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    this.camera = new THREE.CubeCamera(1, 2400, this.target);
    // The cube renders through its six face cameras: each must see only the sky, or the capture redraws the world.
    this.camera.layers.set(WATER_SKY_LAYER);
    for (const face of this.camera.children) face.layers.set(WATER_SKY_LAYER);
  }

  get texture(): THREE.CubeTexture {
    return this.target.texture;
  }

  /** Mark every object of the sky (its dome and stars) as visible to the capture. */
  static include(root: THREE.Object3D) {
    root.traverse((o) => o.layers.enable(WATER_SKY_LAYER));
  }

  /** Capture when due (or now, when `force`), from `position` (the sky dome's own centre). */
  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, position: THREE.Vector3, dt: number, force = false) {
    if (this.disposed) return;
    if (Number.isFinite(dt) && dt > 0) this.age += dt;
    if (!force && this.ready && this.age < this.interval) return;
    this.age = 0;
    const oldTarget = renderer.getRenderTarget(), oldShadow = renderer.shadowMap.autoUpdate, oldAutoClear = renderer.autoClear;
    try {
      renderer.shadowMap.autoUpdate = false;
      renderer.autoClear = true;
      this.camera.position.copy(position);
      this.camera.updateMatrixWorld(true);
      this.camera.update(renderer, scene);
      this.ready = true;
    } finally {
      renderer.shadowMap.autoUpdate = oldShadow;
      renderer.autoClear = oldAutoClear;
      renderer.setRenderTarget(oldTarget);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    this.target.dispose();
  }
}
