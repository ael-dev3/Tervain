import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { disposeSceneResources } from '../../src/presentation/disposeScene';
import { Grade } from '../../src/presentation/grade';
import { buildSea } from '../../src/presentation/sea';
import { detachWaterOptics, makeWaterOpticsUniforms } from '../../src/presentation/waterOptics';
import { WaterRenderPass, type WaterRenderInputs } from '../../src/presentation/waterRenderPass';
import { Terrain } from '../../src/world/terrain';

interface Draw {
  scene: THREE.Scene;
  camera: THREE.Camera;
  target: THREE.WebGLRenderTarget | null;
  mask: number;
  autoClear: boolean;
  visibility: boolean[];
}

/** A real Three scene/target with only the GL renderer replaced; this checks orchestration, not shader pixels. */
function fixture() {
  const source = new THREE.WebGLRenderTarget(64, 32, {
    type: THREE.HalfFloatType,
    colorSpace: THREE.LinearSRGBColorSpace,
    depthTexture: new THREE.DepthTexture(64, 32, THREE.UnsignedIntType),
  });
  const previousTarget = new THREE.WebGLRenderTarget(7, 5);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 2, 0.25, 900);
  camera.position.set(0, 2, 4); // Inland: only the stream lies in view in the capture tests.
  camera.layers.enable(5);
  const meshes: WaterRenderInputs['meshes'] = ['sea', 'stream'].map((name, index) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: makeWaterOpticsUniforms() }));
    mesh.name = name;
    if (!index) mesh.position.x = -300;
    if (index) mesh.layers.enable(6);
    scene.add(mesh);
    return mesh;
  });
  const input: WaterRenderInputs = { meshes, seaMaterial: meshes[0]!.material, quality: 'medium', enabled: true, reducedMotion: false };
  let target: THREE.WebGLRenderTarget | null = previousTarget;
  const draws: Draw[] = [];
  const renderer = {
    autoClear: false,
    shadowMap: { autoUpdate: true },
    xr: { enabled: true },
    state: { buffers: { depth: { setMask: vi.fn() } }, viewport: vi.fn() },
    getRenderTarget: vi.fn(() => target),
    setRenderTarget: vi.fn((next: THREE.WebGLRenderTarget | null) => { target = next; }),
    clear: vi.fn(),
    render: vi.fn((drawScene: THREE.Scene, drawCamera: THREE.Camera) => {
      draws.push({ scene: drawScene, camera: drawCamera, target, mask: drawCamera.layers.mask,
        autoClear: renderer.autoClear, visibility: meshes.map(mesh => mesh.visible) });
    }),
  };
  const pass = new WaterRenderPass();
  return { source, previousTarget, scene, camera, meshes, input, renderer, draws, pass,
    render: () => pass.render(renderer as unknown as THREE.WebGLRenderer, scene, camera, source, 1 / 60, input) };
}

const fixtures: ReturnType<typeof fixture>[] = [];
function setup() { const f = fixture(); fixtures.push(f); return f; }
function coastalView(f: ReturnType<typeof fixture>) {
  f.camera.position.set(-300, 3, 4);
  f.camera.lookAt(-300, 0, 0);
  f.meshes[0]!.position.x = -300;
  f.meshes[0]!.rotation.x = -Math.PI / 2;
}

afterEach(() => {
  for (const f of fixtures.splice(0)) {
    f.meshes.forEach(mesh => detachWaterOptics(mesh.material));
    f.pass.dispose();
    disposeSceneResources(f.scene, () => {});
    f.source.dispose(); f.previousTarget.dispose();
  }
});

describe('water capture/composite orchestration', () => {
  it('does not capture shader-discarded sea while looking inland from the forest, and restores full reflection when turning west', () => {
    const f = setup(), sea = buildSea(new Terrain(), 'high');
    const previousSea = f.meshes[0]!;
    f.scene.remove(previousSea); previousSea.geometry.dispose(); previousSea.material.dispose();
    f.meshes[0] = sea.mesh; f.input.seaMaterial = sea.mesh.material; f.input.quality = 'high';
    f.scene.add(sea.mesh); f.meshes[1]!.visible = false;
    f.camera.fov = 58; f.camera.aspect = 1422 / 800; f.camera.far = 1400; f.camera.updateProjectionMatrix();
    f.camera.position.set(-206.956, 3.01, 11.92);
    f.camera.lookAt(-200, 2.45, 11.3846); f.camera.updateMatrixWorld();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(f.camera.projectionMatrix, f.camera.matrixWorldInverse));
    expect(frustum.intersectsBox(sea.mesh.geometry.boundingBox!.clone().expandByScalar(1))).toBe(true);
    expect(f.render()).toBe(f.source.texture);
    expect(f.draws).toHaveLength(1);
    expect(sea.mesh.material.uniforms.uWaterReflectionReady!.value).toBe(0);
    f.camera.lookAt(-300, 0, 11.92); f.draws.length = 0;
    f.render();
    expect(f.draws).toHaveLength(4);
    expect(f.draws[0]!.camera).not.toBe(f.camera);
    expect(f.draws[0]!.target!.width).toBe(512);
    expect(sea.mesh.material.uniforms.uWaterReflectionReady!.value).toBe(1);
    // Return and re-enter without releasing targets or a map-coordinate discontinuity.
    const reflection = f.draws[0]!.target!;
    f.camera.lookAt(-200, 2.45, 11.3846); f.draws.length = 0; f.render();
    expect(f.draws).toHaveLength(1);
    f.camera.lookAt(-300, 0, 11.92); f.draws.length = 0; f.render();
    expect(f.draws).toHaveLength(3); // The original reflection is still fresh at the unchanged 15 Hz cadence.
    expect(sea.mesh.material.uniforms.tWaterReflection!.value).toBe(reflection.texture);
    expect(sea.mesh.material.uniforms.uWaterReflectionReady!.value).toBe(1);
  });

  it('skips capture and copy when water is outside the camera frustum, detaches stale bindings, and reuses its targets on return', () => {
    const f = setup();
    f.render();
    const composite = f.draws[1]!.target!;
    const dispose = vi.spyOn(composite, 'dispose');
    const masks = f.meshes.map(m => m.layers.mask);
    f.meshes.forEach(m => { m.position.x = 500; });
    f.draws.length = 0;
    expect(f.render()).toBe(f.source.texture);
    expect(f.draws).toHaveLength(1);
    expect(f.draws[0]!.scene).toBe(f.scene);
    expect(f.draws[0]!.target).toBe(f.source);
    expect(f.draws[0]!.autoClear).toBe(true);
    expect(f.renderer.autoClear).toBe(false);
    expect(f.renderer.getRenderTarget()).toBe(f.previousTarget);
    expect(f.meshes.map(m => m.layers.mask)).toEqual(masks);
    expect(dispose).not.toHaveBeenCalled();
    for (const mesh of f.meshes) {
      expect(mesh.material.uniforms.uWaterCapture!.value).toBe(0);
      expect(mesh.material.uniforms.tWaterColor!.value).toBeNull();
      expect(mesh.material.uniforms.tWaterDepth!.value).toBeNull();
    }
    f.camera.lookAt(500, 0, 0);
    f.meshes[0]!.position.x = -300; // The stream re-enters view; the sea remains behind the camera.
    f.draws.length = 0;
    f.render();
    expect(f.draws).toHaveLength(3);
    expect(f.draws[1]!.target).toBe(composite);
  });

  it('restores caller state when the direct offscreen-water draw fails', () => {
    const f = setup();
    f.meshes.forEach(mesh => { mesh.position.x = 500; });
    const cameraMask = f.camera.layers.mask, meshMasks = f.meshes.map(mesh => mesh.layers.mask);
    f.renderer.render.mockImplementation(() => { throw new Error('direct draw failed'); });
    expect(f.render).toThrow('direct draw failed');
    expect(f.renderer.getRenderTarget()).toBe(f.previousTarget);
    expect(f.renderer.autoClear).toBe(false);
    expect(f.camera.layers.mask).toBe(cameraMask);
    expect(f.meshes.map(mesh => mesh.layers.mask)).toEqual(meshMasks);
    expect(f.renderer.shadowMap.autoUpdate).toBe(true);
    expect(f.renderer.xr.enabled).toBe(true);
  });

  it.each(['hidden-parent', 'hidden-material', 'unseen-layer'] as const)('uses one scene draw for %s water even when its geometry intersects the view', (mode) => {
    const f = setup();
    if (mode === 'hidden-parent') {
      const parent = new THREE.Group();
      f.scene.add(parent); parent.add(...f.meshes); parent.visible = false;
    }
    if (mode === 'hidden-material') f.meshes.forEach(m => { m.material.visible = false; });
    if (mode === 'unseen-layer') f.meshes.forEach(m => { m.layers.set(4); });
    expect(f.render()).toBe(f.source.texture);
    expect(f.draws).toHaveLength(1);
    expect(f.meshes.every(m => m.material.uniforms.uWaterCapture!.value === 0)).toBe(true);
  });

  it('checks transformed world bounds and conservatively retains crests just beyond the static geometry edge', () => {
    const f = setup();
    const parent = new THREE.Group();
    f.scene.add(parent); parent.add(...f.meshes);
    parent.position.x = 400;
    f.render();
    expect(f.draws).toHaveLength(1);
    parent.position.set(0, 0, 0);
    f.camera.lookAt(0, 0, 0);
    f.camera.updateMatrixWorld();
    f.meshes[1]!.visible = false;
    f.meshes[0]!.position.x = 0;
    const geometry = f.meshes[0]!.geometry;
    geometry.computeBoundingBox();
    // Move the tiny test surface until the bare geometry misses the lower edge, while a sub-metre crest can enter it.
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(f.camera.projectionMatrix, f.camera.matrixWorldInverse));
    let edgeY = 0;
    for (let y = -0.05; y > -12; y -= 0.05) {
      const box = geometry.boundingBox!.clone().translate(new THREE.Vector3(0, y, 0));
      if (!frustum.intersectsBox(box) && frustum.intersectsBox(box.clone().expandByScalar(0.45))) { edgeY = y; break; }
    }
    expect(edgeY).toBeLessThan(0);
    f.meshes[0]!.position.y = edgeY;
    f.draws.length = 0;
    f.render();
    expect(f.draws).toHaveLength(4); // Visible sea also receives its planar reflection at any map position.
  });

  it('captures visible inland water without rendering a planar sea reflection behind the camera', () => {
    const f = setup();
    coastalView(f);
    f.meshes[1]!.position.x = -300;
    f.meshes[0]!.position.x = -700;
    f.render();
    expect(f.draws).toHaveLength(3);
    expect(f.input.seaMaterial.uniforms.uWaterReflectionReady!.value).toBe(0);
    expect(f.meshes[0]!.visible).toBe(true);
    f.camera.lookAt(-700, 0, 0);
    f.draws.length = 0;
    f.render();
    expect(f.draws).toHaveLength(4);
    expect(f.draws[0]!.camera).not.toBe(f.camera);
    expect(f.input.seaMaterial.uniforms.uWaterReflectionReady!.value).toBe(1);
  });

  it('retains the same visible-sea reflection while crossing the former inland longitude cutoff', () => {
    const f = setup();
    coastalView(f);
    f.meshes[0]!.position.x = -250;
    f.camera.position.x = -190.1;
    f.camera.lookAt(-250, 0, 0);
    f.render();
    expect(f.draws).toHaveLength(4);
    const target = f.draws[0]!.target;
    expect(f.input.seaMaterial.uniforms.uWaterReflectionReady!.value).toBe(1);
    f.camera.position.x = -189.9;
    f.camera.lookAt(-250, 0, 0);
    f.draws.length = 0;
    f.pass.render(f.renderer as unknown as THREE.WebGLRenderer, f.scene, f.camera, f.source, 0.2, f.input);
    expect(f.draws).toHaveLength(4);
    expect(f.draws[0]!.target).toBe(target);
    expect(f.input.seaMaterial.uniforms.uWaterReflectionReady!.value).toBe(1);
  });

  it('draws the base scene once, copies its depth, and samples only the distinct source during the water draw', () => {
    const f = setup();
    const originalMask = f.camera.layers.mask;
    const meshMasks = f.meshes.map(mesh => mesh.layers.mask);
    const result = f.render();
    expect(f.draws).toHaveLength(3);
    const [opaque, copy, water] = f.draws;
    expect(opaque!.scene).toBe(f.scene);
    expect(opaque!.target).toBe(f.source);
    expect(opaque!.mask).toBe(originalMask & ~2);
    expect(opaque!.autoClear).toBe(true);
    expect(copy!.scene).not.toBe(f.scene);
    expect(copy!.target).not.toBe(f.source);
    expect(copy!.target!.samples).toBe(0);
    expect(copy!.target!.texture.colorSpace).toBe(THREE.LinearSRGBColorSpace);
    const copyMesh = copy!.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    expect(copyMesh.material.depthTest).toBe(true);
    expect(copyMesh.material.depthWrite).toBe(true);
    expect(copyMesh.material.depthFunc).toBe(THREE.AlwaysDepth);
    expect(copyMesh.material.blending).toBe(THREE.NoBlending);
    expect(copyMesh.material.uniforms.tColor!.value).toBe(f.source.texture);
    expect(copyMesh.material.uniforms.tDepth!.value).toBe(f.source.depthTexture);
    expect(water!.scene).toBe(f.scene);
    expect(water!.target).toBe(copy!.target);
    expect(water!.mask).toBe(2);
    expect(water!.autoClear).toBe(false);
    expect(result).toBe(copy!.target!.texture);
    for (const mesh of f.meshes) {
      const u = mesh.material.uniforms;
      expect(u.uWaterCapture!.value).toBe(1);
      expect(u.tWaterColor!.value).toBe(f.source.texture);
      expect(u.tWaterDepth!.value).toBe(f.source.depthTexture);
      expect(u.tWaterColor!.value).not.toBe(water!.target!.texture);
      expect(u.uWaterResolution!.value.toArray()).toEqual([64, 32]);
      expect(u.uWaterNear!.value).toBe(0.25);
      expect(u.uWaterFar!.value).toBe(900);
    }
    expect(f.camera.layers.mask).toBe(originalMask);
    expect(f.meshes.map(mesh => mesh.layers.mask)).toEqual(meshMasks);
    expect(f.renderer.autoClear).toBe(false);
    expect(f.renderer.getRenderTarget()).toBe(f.previousTarget);
  });

  it.each([0, 1, 2])('restores caller state when render stage %s throws', (stage) => {
    const f = setup();
    const originalMask = f.camera.layers.mask;
    const meshMasks = f.meshes.map(mesh => mesh.layers.mask);
    let calls = 0;
    f.renderer.render.mockImplementation(() => { if (calls++ === stage) throw new Error('GPU draw failed'); });
    expect(f.render).toThrow('GPU draw failed');
    expect(f.camera.layers.mask).toBe(originalMask);
    expect(f.meshes.map(mesh => mesh.layers.mask)).toEqual(meshMasks);
    expect(f.renderer.getRenderTarget()).toBe(f.previousTarget);
    expect(f.renderer.autoClear).toBe(false);
    expect(f.renderer.xr.enabled).toBe(true);
    expect(f.renderer.shadowMap.autoUpdate).toBe(true);
  });

  it.each(['disabled', 'low', 'no-depth'] as const)('uses one direct draw and clears stale capture bindings for %s', (mode) => {
    const f = setup();
    f.render();
    const composite = f.draws[1]!.target!;
    const dispose = vi.spyOn(composite, 'dispose');
    f.draws.length = 0; f.renderer.render.mockClear();
    if (mode === 'disabled') f.input.enabled = false;
    if (mode === 'low') f.input.quality = 'low';
    if (mode === 'no-depth') f.source.depthTexture = null;
    const originalMask = f.camera.layers.mask;
    const meshMasks = f.meshes.map(mesh => mesh.layers.mask);
    expect(f.render()).toBe(f.source.texture);
    expect(f.draws).toHaveLength(1);
    expect(f.draws[0]!.target).toBe(f.source);
    expect(f.draws[0]!.mask).toBe(originalMask);
    expect(dispose).toHaveBeenCalledTimes(1);
    for (const mesh of f.meshes) {
      const u = mesh.material.uniforms;
      expect(u.uWaterCapture!.value).toBe(0);
      expect(u.uWaterReflectionReady!.value).toBe(0);
      expect(u.tWaterColor!.value).toBeNull();
      expect(u.tWaterDepth!.value).toBeNull();
      expect(u.tWaterReflection!.value).toBeNull();
    }
    expect(f.camera.layers.mask).toBe(originalMask);
    expect(f.meshes.map(mesh => mesh.layers.mask)).toEqual(meshMasks);
    expect(f.renderer.getRenderTarget()).toBe(f.previousTarget);
    expect(f.renderer.autoClear).toBe(false);
  });

  it('keeps capture resolution synchronized after resize and releases its resources once without owning source textures', () => {
    const f = setup();
    f.render();
    const composite = f.draws[1]!.target!;
    const copyMesh = f.draws[1]!.scene.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    f.source.setSize(91, 53); f.draws.length = 0;
    f.render();
    expect(f.draws[1]!.target).toBe(composite);
    expect([composite.width, composite.height]).toEqual([91, 53]);
    expect(f.meshes[0]!.material.uniforms.uWaterResolution!.value.toArray()).toEqual([91, 53]);
    const release = vi.spyOn(composite, 'dispose');
    const geometry = vi.spyOn(copyMesh.geometry, 'dispose');
    const material = vi.spyOn(copyMesh.material, 'dispose');
    const source = vi.spyOn(f.source, 'dispose');
    const color = vi.spyOn(f.source.texture, 'dispose');
    const depth = vi.spyOn(f.source.depthTexture!, 'dispose');
    f.pass.dispose(); f.pass.dispose();
    expect(release).toHaveBeenCalledTimes(1);
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
    expect(source).not.toHaveBeenCalled();
    expect(color).not.toHaveBeenCalled();
    expect(depth).not.toHaveBeenCalled();
    expect(copyMesh.material.uniforms.tColor!.value).toBeNull();
    expect(copyMesh.material.uniforms.tDepth!.value).toBeNull();
    expect(f.render).toThrow('WaterRenderPass has been disposed');
  });

  it('detaches borrowed render textures before scene cleanup while still releasing private water geometry/material', () => {
    const f = setup();
    f.render();
    const color = vi.spyOn(f.source.texture, 'dispose');
    const depth = vi.spyOn(f.source.depthTexture!, 'dispose');
    const geometry = vi.spyOn(f.meshes[0]!.geometry, 'dispose');
    const material = vi.spyOn(f.meshes[0]!.material, 'dispose');
    disposeSceneResources(f.scene, () => f.meshes.forEach(mesh => detachWaterOptics(mesh.material)));
    expect(color).not.toHaveBeenCalled();
    expect(depth).not.toHaveBeenCalled();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
  });

  it('hides water in the planar capture and restores renderer/visibility state on reflection failure', () => {
    const f = setup();
    coastalView(f);
    f.camera.updateMatrixWorld();
    f.meshes[1]!.visible = false;
    const mask = f.camera.layers.mask;
    const masks = f.meshes.map(mesh => mesh.layers.mask);
    f.renderer.render.mockImplementation((drawScene, drawCamera) => {
      expect(drawScene).toBe(f.scene);
      expect(drawCamera).not.toBe(f.camera);
      expect(drawCamera.layers.mask & 2).toBe(0);
      expect(f.meshes.every(mesh => !mesh.visible)).toBe(true);
      expect(f.renderer.xr.enabled).toBe(false);
      expect(f.renderer.shadowMap.autoUpdate).toBe(false);
      throw new Error('reflection failed');
    });
    expect(f.render).toThrow('reflection failed');
    expect(f.meshes.map(mesh => mesh.visible)).toEqual([true, false]);
    expect(f.camera.layers.mask).toBe(mask);
    expect(f.meshes.map(mesh => mesh.layers.mask)).toEqual(masks);
    expect(f.renderer.xr.enabled).toBe(true);
    expect(f.renderer.shadowMap.autoUpdate).toBe(true);
    expect(f.renderer.autoClear).toBe(false);
    expect(f.renderer.getRenderTarget()).toBe(f.previousTarget);
    expect(f.meshes[0]!.material.uniforms.uWaterReflectionReady!.value).toBe(0);
  });

  it('freezes a valid planar reflection for reduced motion, refreshes after camera movement, and owns its private resources', () => {
    const f = setup();
    coastalView(f);
    f.input.reducedMotion = true;
    f.render();
    expect(f.draws).toHaveLength(4);
    const reflected = f.draws[0]!;
    expect(reflected.scene).toBe(f.scene);
    expect(reflected.camera).not.toBe(f.camera);
    expect(reflected.visibility).toEqual([false, false]);
    expect(reflected.target!.samples).toBe(0);
    expect([reflected.target!.width, reflected.target!.height]).toEqual([384, 384]);
    const u = f.input.seaMaterial.uniforms;
    expect(u.uWaterReflectionReady!.value).toBe(1);
    expect(u.tWaterReflection!.value).toBe(reflected.target!.texture);
    expect(u.uWaterReflectionMatrix!.value.elements.every(Number.isFinite)).toBe(true);
    f.draws.length = 0;
    f.pass.render(f.renderer as unknown as THREE.WebGLRenderer, f.scene, f.camera, f.source, 4, f.input);
    expect(f.draws).toHaveLength(3); // Stable camera + reduced motion: reuse the existing planar target.
    f.camera.position.x += 1;
    f.draws.length = 0; f.render();
    expect(f.draws).toHaveLength(4);
    expect(f.draws[0]!.target).toBe(reflected.target);
    const release = vi.spyOn(reflected.target!, 'dispose');
    f.pass.releaseTargets(); f.pass.releaseTargets();
    expect(release).toHaveBeenCalledTimes(1);
    expect(f.renderer.getRenderTarget()).toBe(f.previousTarget);
  });

  it.each([['medium', 1 / 10], ['high', 1 / 15]] as const)('caps %s reflection refresh despite continuous camera movement', (quality, interval) => {
    const f = setup();
    coastalView(f);
    f.input.quality = quality;
    f.render();
    f.draws.length = 0;
    f.camera.position.x += 1;
    f.pass.render(f.renderer as unknown as THREE.WebGLRenderer, f.scene, f.camera, f.source, interval / 4, f.input);
    expect(f.draws).toHaveLength(3);
    f.draws.length = 0;
    f.camera.position.x += 1;
    f.pass.render(f.renderer as unknown as THREE.WebGLRenderer, f.scene, f.camera, f.source, interval, f.input);
    expect(f.draws).toHaveLength(4);
    expect(f.draws[0]!.visibility).toEqual([false, false]);
  });

  it('invalidates the reduced-motion reflection after a world rebuild even with an unchanged camera', () => {
    const f = setup();
    coastalView(f);
    f.input.reducedMotion = true;
    f.render();
    const reflectionTarget = f.draws[0]!.target;
    const nextScene = new THREE.Scene();
    // Keep every other identity stable to isolate the world-scene cache key.
    nextScene.add(...f.meshes);
    f.draws.length = 0;
    try {
      f.pass.render(f.renderer as unknown as THREE.WebGLRenderer, nextScene, f.camera, f.source, 0.001, f.input);
      expect(f.draws).toHaveLength(4); // A new world initializes immediately, below the normal refresh interval.
      expect(f.draws[0]!.scene).toBe(nextScene);
      expect(f.draws[0]!.camera).not.toBe(f.camera);
      expect(f.draws[0]!.visibility).toEqual([false, false]);
      expect(f.draws[0]!.target).toBe(reflectionTarget);
      expect(f.input.seaMaterial.uniforms.uWaterReflectionReady!.value).toBe(1);
    } finally {
      f.scene.add(...f.meshes);
    }
  });
});

describe('Grade water attachment ownership', () => {
  it.each(['low', 'grade-disabled'] as const)('detaches and releases borrowed depth once when switching to %s', (mode) => {
    const f = setup();
    const renderer = Object.assign(f.renderer, {
      extensions: { has: () => true },
      info: { autoReset: true, reset: vi.fn() },
    });
    const grade = new Grade(renderer as unknown as THREE.WebGLRenderer, { msaa: true });
    grade.setSize(64, 32); grade.setBloom(false);
    // Match Three's allocated-target cleanup: disposing a target also disposes any attached depth texture.
    // This makes double disposal observable instead of relying on the mock renderer's lack of GPU listeners.
    const onRelease = () => grade.target.depthTexture?.dispose();
    grade.target.addEventListener('dispose', onRelease);
    try {
      grade.render(f.scene, f.camera, 1 / 60, f.input);
      const depth = grade.target.depthTexture!;
      const releaseDepth = vi.spyOn(depth, 'dispose');
      const composite = f.draws[1]!.target!;
      const releaseComposite = vi.spyOn(composite, 'dispose');
      expect(f.meshes[0]!.material.uniforms.tWaterDepth!.value).toBe(depth);
      if (mode === 'low') f.input.quality = 'low';
      else grade.enabled = false;
      grade.render(f.scene, f.camera, 1 / 60, f.input);
      expect(grade.target.depthTexture).toBeNull();
      expect(releaseDepth).toHaveBeenCalledTimes(1);
      expect(releaseComposite).toHaveBeenCalledTimes(1);
      for (const mesh of f.meshes) {
        expect(mesh.material.uniforms.tWaterColor!.value).toBeNull();
        expect(mesh.material.uniforms.tWaterDepth!.value).toBeNull();
        expect(mesh.material.uniforms.uWaterCapture!.value).toBe(0);
      }
      grade.dispose();
      expect(releaseDepth).toHaveBeenCalledTimes(1);
      expect(releaseComposite).toHaveBeenCalledTimes(1);
    } finally {
      grade.target.removeEventListener('dispose', onRelease);
    }
  });
});
