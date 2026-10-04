import * as THREE from 'three';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildSea, seaVisibilityBounds, type SeaHandle } from '../../src/presentation/sea';
import { disposeSceneResources } from '../../src/presentation/disposeScene';
import { sharedNoise } from '../../src/presentation/noiseTextures';
import { SKY } from '../../src/presentation/skyState';
import { Terrain } from '../../src/world/terrain';

let terrain: Terrain;
const fixtures: { sea: SeaHandle; scene: THREE.Scene }[] = [];
const captures: THREE.WebGLRenderTarget[] = [];
const fixture = (quality: 'low' | 'medium' = 'medium') => {
  const sea = buildSea(terrain, quality), scene = new THREE.Scene();
  scene.add(sea.group); fixtures.push({ sea, scene });
  return { sea, scene, uniforms: sea.mesh.material.uniforms };
};

beforeAll(() => { terrain = new Terrain(); });
afterEach(() => {
  for (const { sea, scene } of fixtures) disposeSceneResources(scene, () => sea.dispose());
  for (const capture of captures) capture.dispose();
  fixtures.length = captures.length = 0;
  vi.restoreAllMocks();
});

describe('coastal sea handle', () => {
  it('caches wet coastal bounds without shrinking or changing the complete stitched source geometry', () => {
    const { sea } = fixture();
    const geometry = sea.mesh.geometry, pieces = sea.mesh.userData.waterVisibilityBounds as THREE.Box3[];
    const bounds = pieces.reduce((box, piece) => box.union(piece), new THREE.Box3());
    expect(pieces.length).toBeGreaterThan(0); expect(pieces.length).toBeLessThan(1000);
    expect(geometry.boundingBox!.max.x).toBe(-180);
    expect(bounds.max.x).toBeLessThan(-210);
    expect(bounds.min.x).toBe(geometry.boundingBox!.min.x);
    expect(bounds.min.z).toBe(geometry.boundingBox!.min.z);
    expect(bounds.max.z).toBe(geometry.boundingBox!.max.z);
    const position = geometry.getAttribute('position'), depth = geometry.getAttribute('aDepth'), point = new THREE.Vector3();
    for (let i = 0; i < depth.count; i++) if (depth.getX(i) >= -0.035) {
      point.fromBufferAttribute(position, i);
      expect(pieces.some(piece => piece.containsPoint(point))).toBe(true);
    }
    expect(sea.mesh.frustumCulled).toBe(false);
  });

  it('retains the visible interiors of partially wet triangles and excludes entirely dry surfaces', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-2, 0, 0, 4, 0, 0, 4, 0, 8], 3));
    geometry.setAttribute('aDepth', new THREE.Float32BufferAttribute([1, -1, -1], 1));
    geometry.setIndex([0, 1, 2]);
    try {
      const bounds = seaVisibilityBounds(geometry)[0]!;
      // A barycentric point with positive interpolated depth has no wet source vertex at its position.
      expect(bounds.containsPoint(new THREE.Vector3(0.4, 0, 1.6))).toBe(true);
      expect(bounds.containsPoint(new THREE.Vector3(4, 0, 8))).toBe(false);
      // Wave allowance also encloses portions briefly wetted beyond the mean-depth zero crossing.
      expect(bounds.max.x).toBeGreaterThan(1.105);
      geometry.setAttribute('aDepth', new THREE.Float32BufferAttribute([-1, -2, -1], 1));
      expect(seaVisibilityBounds(geometry)).toHaveLength(0);
    } finally { geometry.dispose(); }
  });

  it.each(['low', 'medium'] as const)('uses the real shared data textures and a single upward-facing sea mesh on %s', (quality) => {
    const { sea, uniforms } = fixture(quality), noise = sharedNoise();
    expect(sea.group.children).toEqual([sea.mesh]);
    expect(sea.mesh.name).toBe('sea');
    expect(sea.mesh.material.side).toBe(THREE.FrontSide);
    expect(sea.mesh.material.depthWrite).toBe(false);
    expect(uniforms.uNoise!.value).toBe(noise.detail);
    expect(uniforms.uCells!.value).toBe(noise.cell);
    expect(noise.detail).toBeInstanceOf(THREE.DataTexture);
    expect(noise.cell).toBeInstanceOf(THREE.DataTexture);
    expect(noise.detail.colorSpace).toBe(THREE.NoColorSpace);
    expect(noise.cell.colorSpace).toBe(THREE.NoColorSpace);
    expect(noise.detail.image.data?.length ?? 0).toBeGreaterThan(0);
    expect(noise.cell.image.data?.length ?? 0).toBeGreaterThan(0);
    expect(uniforms.uWaterCapture!.value).toBe(0);
    expect(uniforms.uWaterReflectionReady!.value).toBe(0);
    expect(uniforms.tWaterColor!.value).toBeNull();
    expect(uniforms.tWaterDepth!.value).toBeNull();
    expect(uniforms.tWaterReflection!.value).toBeNull();
  });

  it('freezes the exact current animation clock and resumes without following or resetting to the supplied world time', () => {
    const { sea, uniforms } = fixture();
    sea.update(0.125, 15000);
    sea.update(0.125, -900);
    expect(uniforms.uTime!.value).toBe(0.25);
    const positions = sea.mesh.geometry.getAttribute('position').array.slice();
    for (const time of [0, 999999, Number.NaN]) sea.update(100, time, true);
    expect(uniforms.uTime!.value).toBe(0.25);
    expect(sea.mesh.geometry.getAttribute('position').array).toEqual(positions);
    sea.update(0.125, 0, false);
    expect(uniforms.uTime!.value).toBe(0.375);
    sea.update(-1, 8000, false);
    expect(uniforms.uTime!.value).toBe(0.375);
  });

  it('ignores invalid or backwards frame deltas without poisoning the clock, then resumes normally', () => {
    const { sea, uniforms } = fixture();
    sea.update(0.04, 100);
    const current = uniforms.uTime!.value;
    for (const dt of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1]) {
      sea.update(dt, 200);
      expect(uniforms.uTime!.value).toBe(current);
      expect(Number.isFinite(uniforms.uTime!.value)).toBe(true);
    }
    sea.update(0.02, Number.NaN);
    expect(uniforms.uTime!.value).toBeCloseTo(0.06, 12);
  });

  it.each(['low', 'medium'] as const)('respects reduced effects independently of motion without restoring extra detail on low (%s)', (quality) => {
    const { sea, uniforms } = fixture(quality);
    const normalDetail = quality === 'low' ? 0 : 1;
    expect(uniforms.uDetail!.value).toBe(normalDetail);
    sea.update(0.125, 10);
    const time = uniforms.uTime!.value;
    sea.update(10, 100, true, true);
    expect(uniforms.uDetail!.value).toBe(0);
    expect(uniforms.uTime!.value).toBe(time);
    sea.update(10, 200, true, false);
    expect(uniforms.uDetail!.value).toBe(normalDetail);
    expect(uniforms.uTime!.value).toBe(time);
  });

  it('keeps live linear sky uniform objects by reference through daylight and night changes', () => {
    const { uniforms } = fixture();
    const originals = { top: SKY.top.value.clone(), horizon: SKY.horizon.value.clone(), sunDir: SKY.sunDir.value.clone(), sunColor: SKY.sunColor.value.clone(), intensity: SKY.sunI.value, night: SKY.night.value };
    try {
      expect(uniforms.uTop).toBe(SKY.top); expect(uniforms.uHorizon).toBe(SKY.horizon);
      expect(uniforms.uSunDir).toBe(SKY.sunDir); expect(uniforms.uSunColor).toBe(SKY.sunColor);
      expect(uniforms.uSunI).toBe(SKY.sunI); expect(uniforms.uNight).toBe(SKY.night);
      SKY.top.value.setRGB(0.01, 0.02, 0.04); SKY.horizon.value.setRGB(0.05, 0.06, 0.08);
      SKY.sunDir.value.set(0.1, 0.8, 0.3).normalize(); SKY.sunColor.value.setRGB(0.2, 0.3, 0.4);
      SKY.sunI.value = 0.2; SKY.night.value = 1;
      expect(uniforms.uTop!.value.toArray()).toEqual([0.01, 0.02, 0.04]);
      expect(uniforms.uHorizon!.value).toBe(SKY.horizon.value);
      expect(uniforms.uSunDir!.value).toBe(SKY.sunDir.value);
      expect(uniforms.uSunColor!.value).toBe(SKY.sunColor.value);
      expect(uniforms.uSunI!.value).toBe(0.2); expect(uniforms.uNight!.value).toBe(1);
    } finally {
      SKY.top.value.copy(originals.top); SKY.horizon.value.copy(originals.horizon);
      SKY.sunDir.value.copy(originals.sunDir); SKY.sunColor.value.copy(originals.sunColor);
      SKY.sunI.value = originals.intensity; SKY.night.value = originals.night;
    }
  });

  it('detaches borrowed capture/reflection attachments without disposing them or stealing generic geometry cleanup', () => {
    const { sea, scene, uniforms } = fixture();
    const capture = new THREE.WebGLRenderTarget(32, 32, { depthTexture: new THREE.DepthTexture(32, 32) });
    const reflection = new THREE.WebGLRenderTarget(16, 16);
    captures.push(capture, reflection);
    const attach = () => {
      uniforms.tWaterColor!.value = capture.texture; uniforms.tWaterDepth!.value = capture.depthTexture;
      uniforms.tWaterReflection!.value = reflection.texture;
      uniforms.uWaterCapture!.value = uniforms.uWaterReflectionReady!.value = 1;
    };
    const geometryDispose = vi.spyOn(sea.mesh.geometry, 'dispose'), materialDispose = vi.spyOn(sea.mesh.material, 'dispose');
    const borrowedDisposals = [capture.texture, capture.depthTexture!, reflection.texture].map((texture) => vi.spyOn(texture, 'dispose'));
    attach(); sea.dispose(); sea.dispose();
    for (const key of ['tWaterColor', 'tWaterDepth', 'tWaterReflection']) expect(uniforms[key]!.value).toBeNull();
    expect(uniforms.uWaterCapture!.value).toBe(0); expect(uniforms.uWaterReflectionReady!.value).toBe(0);
    expect(geometryDispose).not.toHaveBeenCalled(); expect(materialDispose).not.toHaveBeenCalled();
    expect(sea.group.children).toEqual([sea.mesh]);
    for (const dispose of borrowedDisposals) expect(dispose).not.toHaveBeenCalled();
    // The actual world cleanup sees attachments first, runs the sea hook, then traverses the surviving graph.
    attach(); disposeSceneResources(scene, () => sea.dispose());
    expect(geometryDispose).toHaveBeenCalledTimes(1); expect(materialDispose).toHaveBeenCalledTimes(1);
    for (const dispose of borrowedDisposals) expect(dispose).not.toHaveBeenCalled();
    expect(scene.children).toHaveLength(0);
  });
});
