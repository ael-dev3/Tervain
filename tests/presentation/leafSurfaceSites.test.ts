import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { leafCutoutSampler, sampleLeafRgbaAlpha, sampleLeafSurfaceSites, type LeafRgbaImage } from '../../src/presentation/leafSurfaceSites';

const rgba = (alphas: number[], width = 2): LeafRgbaImage => ({ width, height: alphas.length / width,
  data: new Uint8ClampedArray(alphas.flatMap(alpha => [255, 255, 255, alpha])) });
const map = () => {
  const texture = new THREE.Texture(); texture.flipY = false; texture.magFilter = THREE.NearestFilter; return texture;
};
function faces(uvs: readonly [number, number][]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry(), positions: number[] = [], uv: number[] = [];
  for (let i = 0; i < uvs.length; i++) {
    positions.push(i * 3, 5, 0, i * 3 + 1, 5, 0, i * 3, 6, 0);
    for (let corner = 0; corner < 3; corner++) uv.push(...uvs[i]!);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(Array.from({ length: positions.length / 3 }, (_, i) => i));
  return geometry;
}

describe('visible native leaf surface sites', () => {
  it('uses decoded glTF top-row orientation, with the explicit flipY alternative', () => {
    const image = rgba([255, 0, 0, 255]), texture = map();
    expect(sampleLeafRgbaAlpha(image, 0.25, 0.25, texture)).toBe(1);
    expect(sampleLeafRgbaAlpha(image, 0.25, 0.75, texture)).toBe(0);
    texture.flipY = true;
    expect(sampleLeafRgbaAlpha(image, 0.25, 0.25, texture)).toBe(0);
    expect(sampleLeafRgbaAlpha(image, 0.25, 0.75, texture)).toBe(1);
  });

  it('applies automatic and explicit UV matrices without mutating the template matrix', () => {
    const image = rgba([255, 0, 0, 255]), texture = map();
    const before = texture.matrix.elements.slice(); texture.offset.x = 0.5;
    expect(sampleLeafRgbaAlpha(image, 0.25, 0.25, texture)).toBe(0);
    expect(texture.matrix.elements).toEqual(before);
    texture.matrixAutoUpdate = false; texture.matrix.setUvTransform(0, 0.5, 1, 1, 0, 0, 0);
    expect(sampleLeafRgbaAlpha(image, 0.25, 0.25, texture)).toBe(0);
  });

  it('matches repeat, mirror and clamp sampling on both axes, including negative UVs', () => {
    const image = rgba([255, 0, 0, 255]), texture = map();
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
    expect(sampleLeafRgbaAlpha(image, 1.25, 1.25, texture)).toBe(1);
    expect(sampleLeafRgbaAlpha(image, -0.25, 0.25, texture)).toBe(0);
    texture.wrapS = THREE.MirroredRepeatWrapping; texture.wrapT = THREE.MirroredRepeatWrapping;
    expect(sampleLeafRgbaAlpha(image, 1.25, 0.25, texture)).toBe(0);
    expect(sampleLeafRgbaAlpha(image, -0.25, 0.25, texture)).toBe(1);
    expect(sampleLeafRgbaAlpha(image, 0.25, 1.25, texture)).toBe(0);
    texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
    expect(sampleLeafRgbaAlpha(image, -2, 0.25, texture)).toBe(1);
    expect(sampleLeafRgbaAlpha(image, 2, 0.25, texture)).toBe(0);
  });

  it('filters transparent faces by UV-interpolated alpha, material opacity and MASK cutoff', () => {
    const geometry = faces([[0.25, 0.25], [0.75, 0.25], [0.25, 0.75]]), texture = map();
    const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.35, opacity: 0.8 });
    const image = rgba([255, 128, 64, 0]);
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: () => image })).toEqual([
      { x: 1 / 3, y: 16 / 3, z: 0 }, { x: 10 / 3, y: 16 / 3, z: 0 },
    ]);
    material.opacity = 0.5;
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: () => image })).toHaveLength(1);
    geometry.dispose(); material.dispose(); texture.dispose();
  });

  it('interpolates all triangle-corner UVs and samples linear alpha at texel centres', () => {
    const image = rgba([255, 0], 2), texture = map(); texture.magFilter = THREE.LinearFilter;
    expect(sampleLeafRgbaAlpha(image, 0.5, 0.5, texture)).toBeCloseTo(0.5);
    const geometry = faces([[0.5, 0.5]]); geometry.getAttribute('uv').setXY(0, 0.25, 0.5);
    geometry.getAttribute('uv').setXY(1, 0.25, 0.5); geometry.getAttribute('uv').setXY(2, 1, 0.5);
    const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.6 });
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: () => image })).toHaveLength(0);
    material.alphaTest = 0.4;
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: () => image })).toHaveLength(1);
    geometry.dispose(); material.dispose(); texture.dispose();
  });

  it('keeps opaque volumes valid without DOM/image access and bounds the candidate work', () => {
    const geometry = faces(Array.from({ length: 1000 }, () => [0.25, 0.25] as const));
    const material = new THREE.MeshStandardMaterial({ map: map() }), read = vi.fn(() => null);
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: read })).toHaveLength(500);
    expect(sampleLeafSurfaceSites(geometry, material, { limit: 120, readImage: read })).toHaveLength(112);
    expect(read).not.toHaveBeenCalled();
    expect(sampleLeafSurfaceSites(geometry, material, { limit: 0 })).toEqual([]);
    geometry.dispose(); material.map!.dispose(); material.dispose();
  });

  it('shares one alpha-only readback across cloned texture wrappers of the same decoded image', () => {
    const pixels = rgba([255, 0, 0, 255]); let reads = 0;
    const image = { width: 2, height: 2, get data() { reads++; return pixels.data; } };
    const texture = map(); texture.image = image;
    const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.35 });
    const geometry = faces([[0.25, 0.25]]);
    expect(sampleLeafSurfaceSites(geometry, material)).toHaveLength(1);
    const readbackAccesses = reads; expect(readbackAccesses).toBeGreaterThan(0);
    const cloned = material.clone(); cloned.map = texture.clone();
    expect(cloned.map.image).toBe(image);
    expect(sampleLeafSurfaceSites(geometry, cloned)).toHaveLength(1);
    expect(reads).toBe(readbackAccesses);
    geometry.dispose(); material.dispose(); cloned.dispose(); texture.dispose(); cloned.map.dispose();
  });

  it('uses the selected UV channel and alpha-map green rather than its alpha channel', () => {
    const geometry = faces([[0.75, 0.25]]), texture = map(); texture.channel = 1;
    geometry.setAttribute('uv1', new THREE.Float32BufferAttribute([0.25, 0.25, 0.25, 0.25, 0.25, 0.25], 2));
    const alphaMap = map(), material = new THREE.MeshStandardMaterial({ map: texture, alphaMap, alphaTest: 0.35 });
    const base = rgba([255, 0, 0, 255]);
    const mask: LeafRgbaImage = { width: 2, height: 2, data: new Uint8Array([
      255, 255, 255, 0, 255, 0, 255, 255, 255, 255, 255, 0, 255, 0, 255, 255,
    ]) };
    texture.image = base; alphaMap.image = mask;
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: image => image as LeafRgbaImage })).toEqual([]);
    alphaMap.offset.x = -0.5;
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: image => image as LeafRgbaImage })).toHaveLength(1);
    geometry.dispose(); material.dispose(); texture.dispose(); alphaMap.dispose();
  });

  it('emits nothing for unavailable MASK pixels, UVs, invalid transforms or degenerate faces', () => {
    const geometry = faces([[0.25, 0.25]]), material = new THREE.MeshStandardMaterial({ map: map(), alphaTest: 0.35 });
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: () => null })).toEqual([]);
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: () => { throw new Error('closed bitmap'); } })).toEqual([]);
    const missingMap = new THREE.MeshStandardMaterial({ alphaTest: 0.35 });
    expect(sampleLeafSurfaceSites(geometry, missingMap)).toEqual([]); missingMap.dispose();
    material.map!.offset.x = Number.NaN;
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: () => rgba([255, 255, 255, 255]) })).toEqual([]);
    material.map!.offset.x = 0; geometry.deleteAttribute('uv');
    expect(sampleLeafSurfaceSites(geometry, material, { readImage: () => rgba([255, 255, 255, 255]) })).toEqual([]);
    material.alphaTest = 0;
    geometry.getAttribute('position').setXYZ(1, 0, 5, 0);
    expect(sampleLeafSurfaceSites(geometry, material)).toEqual([]);
    geometry.dispose(); material.map!.dispose(); material.dispose();
  });
});


it('only rejects UV triangles whose transformed texture bounds prove transparent', () => {
  let rejected = 0, supported = 0;
  for (const filter of [THREE.NearestFilter, THREE.LinearFilter]) for (const wrap of [THREE.RepeatWrapping, THREE.MirroredRepeatWrapping, THREE.ClampToEdgeWrapping]) for (const flip of [false, true]) for (const [width, height] of [[8, 8], [7, 5]] as const) {
    const pixels = new Uint8Array(width * height * 4); pixels[(Math.floor(height / 2) * width + Math.floor(width / 2)) * 4 + 3] = 255;
    const texture = new THREE.DataTexture(pixels, width, height); texture.magFilter = filter; texture.wrapS = texture.wrapT = wrap; texture.flipY = flip;
    texture.offset.set(0.13, -0.11); texture.repeat.set(1.2, 0.9); texture.rotation = 0.2;
    const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.42 }), cutout = leafCutoutSampler(material)!;
    try {
      for (let z = -2; z < 10; z++) for (let x = -2; x < 10; x++) {
        const u = x / 8, v = z / 8, maybe = cutout.mayHaveOpaque(u, v, u + 0.06, v, u, v + 0.06);
        if (!maybe) rejected++;
        for (let i = 0; i <= 6; i++) for (let j = 0; i + j <= 6; j++) {
          const alpha = cutout.alpha(u + i / 6 * 0.06, v + j / 6 * 0.06);
          if (alpha >= cutout.cutoff) { supported++; expect(maybe).toBe(true); }
        }
      }
      const broad = cutout.mayHaveOpaque(-1e10, -1e10, 1e10, -1e10, 0, 1e10); expect(broad).toBe(true);
    } finally { material.dispose(); texture.dispose(); }
  }
  expect(rejected).toBeGreaterThan(100); expect(supported).toBeGreaterThan(10);
});

it('rejects opacity outside a triangle while keeping boundary-filter contributions', () => {
  const pixels = new Uint8Array(8 * 8 * 4); pixels[(6 * 8 + 6) * 4 + 3] = 255;
  const texture = new THREE.DataTexture(pixels, 8, 8); texture.flipY = false;
  const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.42 });
  try {
    const c = leafCutoutSampler(material)!;
    expect(c.mayHaveOpaque(0.1, 0.1, 0.95, 0.1, 0.1, 0.95)).toBe(false);
    expect(c.mayHaveOpaque(0.8, 0.8, 0.9, 0.8, 0.8, 0.9)).toBe(true);
  } finally { material.dispose(); texture.dispose(); }
});
