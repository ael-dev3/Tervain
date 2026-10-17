import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SkyRig } from '../../src/presentation/sky';
import { installShadowOnlyGroup } from '../../src/presentation/foliage/shadowCasters';

let sky: SkyRig;
beforeEach(() => { vi.stubGlobal('window', { devicePixelRatio: 1 }); sky = new SkyRig(4096); });
afterEach(() => { sky.sun.shadow.map?.dispose(); sky.dispose(); vi.unstubAllGlobals(); });

function target(compare: THREE.TextureComparisonFunction | null, format: THREE.PixelFormat = THREE.RGBAFormat) {
  const depth = new THREE.DepthTexture(4096, 4096, THREE.UnsignedIntType);
  depth.compareFunction = compare; depth.minFilter = depth.magFilter = THREE.LinearFilter;
  const map = new THREE.WebGLRenderTarget(4096, 4096, { depthTexture: depth, format });
  sky.sun.shadow.map = map;
  return { map, depth };
}

it.each([THREE.LessEqualCompare, THREE.GreaterEqualCompare])('compacts a new comparison shadow target (%s) while preserving depth sampling and hook chaining', compare => {
  const { map, depth } = target(compare);
  const scene = new THREE.Scene(), casters = new THREE.Group();
  const remove = installShadowOnlyGroup(scene, sky.sun, casters);
  const version = map.texture.version;
  sky.sun.updateMatrixWorld(); sky.sun.target.updateMatrixWorld();
  sky.sun.shadow.updateMatrices(sky.sun);
  expect(casters.visible).toBe(true);
  expect(sky.sun.shadow.map).toBe(map);
  expect(map.texture.format).toBe(THREE.RedFormat);
  expect(map.depthTexture).toBe(depth);
  expect([map.width, map.height, depth.image.width, depth.image.height]).toEqual([4096, 4096, 4096, 4096]);
  expect([depth.type, depth.format, depth.compareFunction, depth.minFilter, depth.magFilter]).toEqual([
    THREE.UnsignedIntType, THREE.DepthFormat, compare, THREE.LinearFilter, THREE.LinearFilter,
  ]);
  expect(sky.sun.shadow.matrix.elements.every(Number.isFinite)).toBe(true);
  remove();
  for (let i = 0; i < 60; i++) sky.sun.shadow.updateMatrices(sky.sun);
  expect(map.texture.format).toBe(THREE.RedFormat);
  expect(map.texture.version).toBe(version);
});

it.each(['no-depth', 'regular-depth', 'moments', 'float-colour'] as const)('preserves a target outside the comparison RGBA8 path: %s', kind => {
  const { map } = target(kind === 'regular-depth' ? null : THREE.LessEqualCompare, kind === 'moments' ? THREE.RGFormat : THREE.RGBAFormat);
  if (kind === 'no-depth') map.depthTexture = null;
  if (kind === 'float-colour') map.texture.type = THREE.FloatType;
  const format = map.texture.format;
  sky.sun.shadow.updateMatrices(sky.sun);
  expect(map.texture.format).toBe(format);
});

it('compacts the replacement after a quality change and preserves cold-night initialization', () => {
  const focus = new THREE.Vector3(-268, .5, 27);
  sky.update(21.5166666667, focus, 0, true);
  expect(sky.sun.shadow.map).toBeNull();
  expect(sky.sun.shadow.needsUpdate).toBe(true);
  const first = target(THREE.LessEqualCompare);
  sky.sun.shadow.updateMatrices(sky.sun);
  expect(first.map.texture.format).toBe(THREE.RedFormat);
  sky.sun.shadow.needsUpdate = false;
  sky.update(21.5166666667, focus, 0, true);
  expect(sky.sun.shadow.autoUpdate).toBe(false);
  expect(sky.sun.shadow.needsUpdate).toBe(false);
  sky.setShadowSize(2048);
  expect(sky.sun.shadow.map).toBeNull();
  sky.update(21.5166666667, focus, 0, true);
  expect(sky.sun.shadow.needsUpdate).toBe(true);
  const next = target(THREE.LessEqualCompare);
  next.map.setSize(2048, 2048);
  sky.sun.shadow.updateMatrices(sky.sun);
  expect(next.map.texture.format).toBe(THREE.RedFormat);
  expect([next.map.width, next.map.height]).toEqual([2048, 2048]);
});
