import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Terrain } from '../../src/world/terrain';
import { buildTerrainMesh, TERRAIN_RENDER_SUBDIVISIONS } from '../../src/presentation/terrainMesh';
import { LAYERS, LAYER, makeTerrainTextures, type TerrainTextures } from '../../src/presentation/terrainTextures';
import { createGrassPatch, grassHabitatProfile } from '../../src/presentation/ground/grass';
import { createPatchMaterial, createPushers } from '../../src/presentation/ground/patchMaterial';
import { groundSplat } from '../../src/presentation/groundSplat';
import { coastX } from '../../src/world/coast';
import { SEA_LEVEL } from '../../src/world/layout';

describe('close-view ground and plant detail', () => {
  it('lets patchy fern floor dominate below dense crowns while preserving sunny meadow grass', () => {
    const habitat = { open: 1, wet: 0.2, dry: 1, wood: 0, slope: 0 };
    const sun = grassHabitatProfile(habitat, 0.85);
    const shade = grassHabitatProfile({ ...habitat, wood: 1 }, 0.85);
    expect(shade.density).toBeLessThan(sun.density * 0.23);
    expect(shade.height).toBeLessThan(sun.height * 0.75);
    expect(shade.exposure).toBeLessThan(sun.exposure * 0.07);
    expect(grassHabitatProfile(habitat, 0.1).density).toBeLessThan(sun.density * 0.35);
    expect(grassHabitatProfile({ ...habitat, open: 0 }, 0.85).density).toBe(0);
    expect(grassHabitatProfile({ ...habitat, wet: 1 }, 0.85).height).toBeGreaterThan(sun.height);
    for (const wood of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const profile = grassHabitatProfile({ ...habitat, wood }, 0.85);
      expect(Object.values(profile).every(Number.isFinite)).toBe(true);
      expect(profile.density).toBeGreaterThanOrEqual(0);
      expect(profile.density).toBeLessThanOrEqual(1);
    }
  });

  it('limits tidal wetness to the real ground elevation rather than soaking the full headland above the same waterline', () => {
    const x = coastX(104) + 1, z = 104, weights = new Float32Array(8);
    let height = SEA_LEVEL + 0.2;
    const ground = {
      heightAt: () => height,
      slopeAt: () => 1.4,
      carveAt: () => 0,
    } as unknown as Terrain;
    const tidal = groundSplat(ground, x, z, weights);
    expect(tidal).toBeGreaterThan(0.5);
    expect(weights[LAYER.rock]).toBeCloseTo(1, 5);
    height = SEA_LEVEL + 1.4;
    const splash = groundSplat(ground, x, z, weights);
    expect(splash).toBeGreaterThan(0);
    expect(splash).toBeLessThan(tidal);
    height = SEA_LEVEL + 3;
    expect(groundSplat(ground, x, z, weights)).toBe(0);
    expect(groundSplat(ground, x - 2, z, weights)).toBe(0);
    expect(weights[LAYER.rock]).toBeCloseTo(1, 5);
    height = SEA_LEVEL + 13;
    expect(groundSplat(ground, x, z, weights)).toBe(0);
    expect(groundSplat(ground, x - 2, z, weights)).toBe(0);
    expect(weights[LAYER.rock]).toBeCloseTo(1, 5);
    height = SEA_LEVEL - 0.1;
    expect(groundSplat(ground, x - 2, z, weights)).toBe(1);
  });

  it('retains splash falloff on actual raised lighthouse ground seaward of the approximate coastline', () => {
    const terrain = new Terrain(), weights = new Float32Array(8);
    let checked = 0;
    for (let z = 92; z <= 116; z += 0.5) {
      const x = coastX(z) - 0.25;
      const height = terrain.heightAt(x, z) - SEA_LEVEL;
      if (height <= 0.55) continue;
      expect(groundSplat(terrain, x, z, weights)).toBeLessThan(1);
      if (height >= 2.4) expect(groundSplat(terrain, x, z, weights)).toBe(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('refines soil and path material sampling while retaining the same physical ground planes, including their diagonals', () => {
    const source = new Terrain();
    // An aligned crop of the actual hilly inland terrain; every physical query still uses the source grid.
    const crop = {
      nx: 4, nz: 4,
      vertexX: (i: number) => -204 + i * 2,
      vertexZ: (j: number) => 10 + j * 2,
      heightAt: source.heightAt.bind(source),
      carveAt: source.carveAt.bind(source),
      slopeAt: source.slopeAt.bind(source),
    } as Terrain;
    const tex = { albedo: new THREE.DataArrayTexture(), normal: new THREE.DataArrayTexture() } as TerrainTextures;
    const mesh = buildTerrainMesh(crop, tex), geo = mesh.geometry;
    const positions = geo.getAttribute('position'), index = geo.index!;
    expect(positions.count).toBe((4 * TERRAIN_RENDER_SUBDIVISIONS + 1) ** 2);
    let maximumError = 0;
    for (let tri = 0; tri < index.count; tri += 3) {
      const vertices = [0, 1, 2].map(n => new THREE.Vector3().fromBufferAttribute(positions, index.getX(tri + n)));
      for (const weights of [[1 / 3, 1 / 3, 1 / 3], [0.1, 0.65, 0.25], [0.68, 0.12, 0.2]]) {
        const p = new THREE.Vector3();
        vertices.forEach((v, i) => p.addScaledVector(v, weights[i]!));
        maximumError = Math.max(maximumError, Math.abs(p.y - source.heightAt(p.x, p.z)));
      }
    }
    expect(maximumError).toBeLessThan(0.000003);
    for (let i = 0; i < positions.count; i++) {
      const a = geo.getAttribute('aSplatA'), b = geo.getAttribute('aSplatB');
      expect(a.getX(i) + a.getY(i) + a.getZ(i) + a.getW(i) + b.getX(i) + b.getY(i) + b.getZ(i) + b.getW(i)).toBeCloseTo(1, 5);
    }
    geo.dispose(); (mesh.material as THREE.Material).dispose(); tex.albedo.dispose(); tex.normal.dispose();
  });

  it('generates deterministic original albedo/relief layers with correct color spaces and normalized wrap-derived normals', async () => {
    const a = await makeTerrainTextures(64), b = await makeTerrainTextures(64);
    expect(a.albedo.image.data).toEqual(b.albedo.image.data);
    expect(a.normal.image.data).toEqual(b.normal.image.data);
    expect(a.albedo.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(a.normal.colorSpace).toBe(THREE.NoColorSpace);
    expect(a.normal.wrapS).toBe(THREE.RepeatWrapping);
    const normals = a.normal.image.data as Uint8Array;
    let maximumError = 0;
    for (let i = 0; i < normals.length; i += 4) {
      const x = normals[i]! / 255 * 2 - 1, y = normals[i + 1]! / 255 * 2 - 1, z = normals[i + 2]! / 255 * 2 - 1;
      maximumError = Math.max(maximumError, Math.abs(Math.hypot(x, y, z) - 1));
    }
    expect(maximumError).toBeLessThan(0.007);
    const albedo = a.albedo.image.data as Uint8Array;
    const mean = (layer: number, channel: number) => {
      let sum = 0;
      for (let i = 0; i < 64 * 64; i++) sum += albedo[(layer * 64 * 64 + i) * 4 + channel]!;
      return sum / (64 * 64);
    };
    expect(mean(LAYER.grass, 1)).toBeGreaterThan(mean(LAYER.grass, 0));
    expect(mean(LAYER.earth, 0)).toBeGreaterThan(mean(LAYER.earth, 1));
    expect(a.albedo.image.depth).toBe(LAYERS.length);
    a.dispose(); b.dispose();
  });

  it('builds genuinely folded grass rather than two flat ribbons and retains rooted wind weights and finite normals', () => {
    const geometry = createGrassPatch(13, 12345);
    const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), blade = geometry.getAttribute('aBlade');
    expect(positions.count / 3).toBe(13 * 6);
    let maximumFold = 0;
    for (let first = 0; first < positions.count; first += 18) {
      // Mid-left, mid-centre and mid-right belong to each physical blade ridge.
      const left = new THREE.Vector3().fromBufferAttribute(positions, first + 2);
      const centre = new THREE.Vector3().fromBufferAttribute(positions, first + 4);
      const right = new THREE.Vector3().fromBufferAttribute(positions, first + 10);
      maximumFold = Math.max(maximumFold, centre.distanceTo(left.clone().add(right).multiplyScalar(0.5)));
    }
    expect(maximumFold).toBeGreaterThan(0.012);
    for (let i = 0; i < positions.count; i++) {
      expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
      if (positions.getY(i) === 0) {
        expect(blade.getY(i)).toBe(0);
        expect(geometry.getAttribute('aRoot').getX(i)).toBe(positions.getX(i));
        expect(geometry.getAttribute('aRoot').getY(i)).toBe(positions.getZ(i));
      }
    }
    geometry.dispose();
  });

  it('injects the physical grass shader into the actual Three standard chunks, with coverage after alpha testing', () => {
    const patch = createPatchMaterial({ uTime: { value: 0 }, uWind: { value: 1 } }, createPushers(), new THREE.Vector4(0, 1, 0, 1),
      { vertexColors: false, fadeStart: 12, fadeEnd: 96, sizeComp: 1.12, power: 2.1, windAmp: 0.13, rootShade: 0.42, tipShade: 1.08 });
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} } as Parameters<THREE.Material['onBeforeCompile']>[0];
    patch.material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(patch.ok()).toBe(true);
    expect(patch.material.isMeshStandardMaterial).toBe(true);
    expect(shader.fragmentShader.indexOf('tvDistanceNoise(gl_FragCoord.xy) >= vGCoverage')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <alphatest_fragment>'));
    expect(shader.vertexShader.match(/varying float vGAcross;/g)).toHaveLength(1);
    expect(shader.fragmentShader.match(/varying float vGAcross;/g)).toHaveLength(1);
    patch.material.dispose();
  });

  it('binds the authoritative height grid to fitted roots and releases its private GPU texture once', () => {
    const terrain = new Terrain();
    const patch = createPatchMaterial({ uTime: { value: 0 }, uWind: { value: 1 } }, createPushers(), new THREE.Vector4(0, 1, 0, 1),
      { vertexColors: false, fadeStart: 12, fadeEnd: 96, sizeComp: 1.12, power: 2.1, windAmp: 0.13, rootShade: 0.42, tipShade: 1.08, terrain });
    const texture = patch.uniforms.uGroundHeights!.value;
    expect(texture.image.data).toBe(terrain.heights);
    expect([texture.image.width, texture.image.height]).toEqual([terrain.nx + 1, terrain.nz + 1]);
    expect(texture.minFilter).toBe(THREE.NearestFilter);
    expect(texture.type).toBe(THREE.FloatType);
    expect(texture.format).toBe(THREE.RedFormat);
    expect(texture.colorSpace).toBe(THREE.NoColorSpace);
    expect(patch.material.defines).toHaveProperty('GROUND_FIT');
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} } as Parameters<THREE.Material['onBeforeCompile']>[0];
    patch.material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(patch.ok()).toBe(true);
    expect(shader.uniforms.uGroundHeights!.value).toBe(texture);
    expect(shader.vertexShader).toContain('fraction.x + fraction.y <= 1.0');
    expect(shader.vertexShader).toContain('gOriginY = gTerrainHeight(worldRoot)');
    expect(shader.vertexShader).toContain('float gh = max(gw.y - gOriginY, 0.0)');
    let releases = 0;
    texture.addEventListener('dispose', () => releases++);
    patch.material.dispose(); patch.material.dispose();
    expect(releases).toBe(1);
  });
});
