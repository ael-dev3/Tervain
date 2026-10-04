import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { detachWaterOptics } from './waterOptics';

export interface WaterRenderInputs {
  meshes: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[];
  seaMaterial: THREE.ShaderMaterial;
  quality: 'low' | 'medium' | 'high';
  enabled: boolean;
  reducedMotion: boolean;
}

/** Reuse the opaque scene color/depth; only water is drawn again after the copy. */
export class WaterRenderPass {
  private composite: THREE.WebGLRenderTarget | null = null;
  private reflector: Reflector | null = null;
  private reflectionAge = Infinity;
  private reflectionValid = false;
  private reflectionScene: THREE.Scene | null = null;
  private reflectionLight = new THREE.Vector2(Infinity, Infinity);
  private reflectionCameraPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
  private reflectionCameraRotation = new THREE.Quaternion();
  private reflectionProjection = new THREE.Matrix4();
  private inverseReflectionWorld = new THREE.Matrix4();
  private visibilityFrustum = new THREE.Frustum();
  private visibilityProjection = new THREE.Matrix4();
  private visibilityBox = new THREE.Box3();
  private copyScene = new THREE.Scene();
  private reflectionGroup = new THREE.Group();
  private copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private copyMaterial = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: null }, tDepth: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tColor; uniform sampler2D tDepth; varying vec2 vUv; void main() { gl_FragColor = texture2D(tColor, vUv); gl_FragDepth = texture2D(tDepth, vUv).r; }',
    depthTest: true, depthFunc: THREE.AlwaysDepth, depthWrite: true,
    blending: THREE.NoBlending, toneMapped: false,
  });
  private quad: THREE.Mesh;
  private disposed = false;

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(geo, this.copyMaterial);
    this.quad.frustumCulled = false;
    this.copyScene.add(this.quad);
  }

  releaseTargets() {
    this.composite?.dispose(); this.composite = null;
    this.reflector?.dispose();
    this.reflector?.geometry.dispose(); this.reflector = null;
    this.reflectionAge = Infinity; this.reflectionValid = false; this.reflectionScene = null;
    this.copyMaterial.uniforms.tColor!.value = null;
    this.copyMaterial.uniforms.tDepth!.value = null;
  }

  private prepare(source: THREE.WebGLRenderTarget) {
    if (!this.composite || this.composite.texture.type !== source.texture.type) {
      this.composite?.dispose();
      this.composite = new THREE.WebGLRenderTarget(source.width, source.height, {
        type: source.texture.type, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, samples: 0,
      });
    }
    if (this.composite.width !== source.width || this.composite.height !== source.height) {
      this.composite.setSize(source.width, source.height);
    }
    this.copyMaterial.uniforms.tColor!.value = source.texture;
    this.copyMaterial.uniforms.tDepth!.value = source.depthTexture;
  }

  /** Conservative world-space boxes retain wave crests and changing channel levels at screen edges. */
  private waterInView(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>, camera: THREE.Camera): boolean {
    if (!camera.layers.test(mesh.layers) || !mesh.material.visible) return false;
    for (let parent: THREE.Object3D | null = mesh; parent; parent = parent.parent) if (!parent.visible) return false;
    mesh.updateWorldMatrix(true, false);
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox || mesh.geometry.boundingBox.isEmpty()) return false;
    // Sea relief is bounded below 0.48 m; inland bounds already include all hydraulic levels and ripples.
    // A full metre in local space deliberately overestimates both so visibility never clips an animated crest.
    this.visibilityBox.copy(mesh.geometry.boundingBox).expandByScalar(1).applyMatrix4(mesh.matrixWorld);
    return this.visibilityFrustum.intersectsBox(this.visibilityBox);
  }

  private captureReflection(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
    source: THREE.WebGLRenderTarget, dt: number, input: WaterRenderInputs) {
    const u = input.seaMaterial.uniforms;
    u.uWaterReflectionReady!.value = 0;
    // Only visible sea needs a planar capture; a map longitude is not a visibility boundary.
    if (camera.position.y < 0.08 || !input.meshes.some(m => m.name === 'sea' && this.waterInView(m, camera))) return;
    if (this.reflectionScene !== scene) { this.reflectionValid = false; this.reflectionScene = scene; }
    const size = input.quality === 'high' ? 512 : 384;
    if (!this.reflector) {
      this.reflector = new Reflector(new THREE.PlaneGeometry(1, 1), { textureWidth: size, textureHeight: size, multisample: 0, clipBias: 0.002 });
      this.reflector.rotation.x = -Math.PI / 2;
      this.reflector.updateMatrixWorld(true);
      this.reflector.getRenderTarget().texture.type = source.texture.type;
    }
    const target = this.reflector.getRenderTarget();
    if (target.width !== size) { target.setSize(size, size); this.reflectionValid = false; }
    if (Number.isFinite(dt) && dt > 0) this.reflectionAge += dt;
    const moved = this.reflectionCameraPosition.distanceToSquared(camera.position) > 0.09
      || this.reflectionCameraRotation.angleTo(camera.quaternion) > 0.012
      || !this.reflectionProjection.equals(camera.projectionMatrix);
    const sun = Number(u.uSunI?.value ?? 0), night = Number(u.uNight?.value ?? 0);
    const lightingChanged = Math.abs(this.reflectionLight.x - sun) > 0.025 || Math.abs(this.reflectionLight.y - night) > 0.02;
    const interval = input.quality === 'high' ? 1 / 15 : 1 / 10;
    if (!this.reflectionValid || this.reflectionAge >= interval && (moved || lightingChanged || !input.reducedMotion)) {
      const visible = input.meshes.map(mesh => mesh.visible);
      const oldTarget = renderer.getRenderTarget(), oldAutoClear = renderer.autoClear;
      const oldShadow = renderer.shadowMap.autoUpdate, oldXr = renderer.xr.enabled;
      try {
        for (const mesh of input.meshes) mesh.visible = false;
        renderer.autoClear = true;
        this.reflector.getReflectionCamera(camera).layers.mask = camera.layers.mask & ~2;
        this.reflector.onBeforeRender(renderer, scene, camera, this.reflector.geometry, this.reflector.material as THREE.Material, this.reflectionGroup);
        this.reflectionValid = true; this.reflectionAge = 0;
        this.reflectionCameraPosition.copy(camera.position);
        this.reflectionCameraRotation.copy(camera.quaternion);
        this.reflectionProjection.copy(camera.projectionMatrix);
        this.reflectionLight.set(sun, night);
      } finally {
        input.meshes.forEach((mesh, i) => { mesh.visible = visible[i]!; });
        renderer.autoClear = oldAutoClear; renderer.shadowMap.autoUpdate = oldShadow; renderer.xr.enabled = oldXr;
        renderer.setRenderTarget(oldTarget);
      }
    }
    if (this.reflectionValid) {
      u.tWaterReflection!.value = target.texture;
      // Reflector's matrix maps local plane space; our shader supplies world coordinates.
      u.uWaterReflectionMatrix!.value.copy((this.reflector.material as THREE.ShaderMaterial).uniforms.textureMatrix!.value)
        .multiply(this.inverseReflectionWorld.copy(this.reflector.matrixWorld).invert());
      u.uWaterReflectionReady!.value = 1;
    }
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera,
    source: THREE.WebGLRenderTarget, dt: number, input: WaterRenderInputs): THREE.Texture {
    if (this.disposed) throw new Error('WaterRenderPass has been disposed');
    if (!input.enabled || input.quality === 'low' || !source.depthTexture) {
      input.meshes.forEach(mesh => detachWaterOptics(mesh.material));
      this.releaseTargets();
      const previous = renderer.getRenderTarget();
      try { renderer.setRenderTarget(source); renderer.render(scene, camera); }
      finally { renderer.setRenderTarget(previous); }
      return source.texture;
    }
    camera.updateMatrixWorld();
    this.visibilityProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.visibilityFrustum.setFromProjectionMatrix(this.visibilityProjection);
    if (!input.meshes.some(mesh => this.waterInView(mesh, camera))) {
      // Looking inland needs one scene render, with no full-resolution copy or second water traversal. Retain
      // private targets for turning back toward the shore rather than reallocating them at every visibility change.
      input.meshes.forEach(mesh => detachWaterOptics(mesh.material));
      if (Number.isFinite(dt) && dt > 0) this.reflectionAge += dt;
      const previous = renderer.getRenderTarget(), previousAutoClear = renderer.autoClear;
      try { renderer.autoClear = true; renderer.setRenderTarget(source); renderer.render(scene, camera); }
      finally { renderer.autoClear = previousAutoClear; renderer.setRenderTarget(previous); }
      return source.texture;
    }
    this.prepare(source);
    const oldTarget = renderer.getRenderTarget(), oldAutoClear = renderer.autoClear;
    const oldMask = camera.layers.mask, meshMasks = input.meshes.map(mesh => mesh.layers.mask);
    try {
      camera.updateMatrixWorld();
      this.captureReflection(renderer, scene, camera, source, dt, input);
      for (const mesh of input.meshes) mesh.layers.set(1);
      camera.layers.mask = oldMask & ~2;
      renderer.autoClear = true;
      renderer.setRenderTarget(source); renderer.render(scene, camera);
      renderer.setRenderTarget(this.composite); renderer.render(this.copyScene, this.copyCamera);
      for (const mesh of input.meshes) {
        const u = mesh.material.uniforms;
        u.tWaterColor!.value = source.texture; u.tWaterDepth!.value = source.depthTexture;
        u.uWaterResolution!.value.set(source.width, source.height);
        const pc = camera as THREE.PerspectiveCamera;
        u.uWaterNear!.value = pc.near; u.uWaterFar!.value = pc.far;
        u.uWaterCapture!.value = 1;
      }
      // The copied opaque depth still hides water behind rocks, boats and people.
      renderer.autoClear = false; camera.layers.set(1);
      renderer.render(scene, camera);
      return this.composite!.texture;
    } catch (error) {
      input.meshes.forEach(mesh => detachWaterOptics(mesh.material));
      throw error;
    } finally {
      camera.layers.mask = oldMask;
      input.meshes.forEach((mesh, i) => { mesh.layers.mask = meshMasks[i]!; });
      renderer.autoClear = oldAutoClear; renderer.setRenderTarget(oldTarget);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.releaseTargets();
    this.copyMaterial.dispose(); this.quad.geometry.dispose();
  }
}
