import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { Terrain } from '../../src/world/terrain';
import { buildTerrainMesh, TERRAIN_RENDER_SUBDIVISIONS } from '../../src/presentation/terrainMesh';
import { createTerrainMaterial } from '../../src/presentation/terrainMaterial';
import { LAYERS, LAYER, makeTerrainTextures, type TerrainTextures } from '../../src/presentation/terrainTextures';
import { createGrassPatch, grassHabitatProfile } from '../../src/presentation/ground/grass';
import { createPatchMaterial, createPushers } from '../../src/presentation/ground/patchMaterial';
import { groundSplat } from '../../src/presentation/groundSplat';
import { coastX } from '../../src/world/coast';
import { ROADS, SEA_LEVEL } from '../../src/world/layout';
import { buildForestFernGeometry, buildForestFloor, buildForestLeafTexture, buildForestShrubGeometry } from '../../src/presentation/forestFloor';
import { disposeTreeTextures } from '../../src/presentation/treeTextures';
import { Exclusions } from '../../src/presentation/vegetation';

// All physical-grid assertions in this file are read-only. Build the real grid once rather
// than regenerating identical height/stream/rock data for each material / support check.
let physicalTerrain: Terrain;
beforeAll(() => { physicalTerrain = new Terrain(); });

function unequalBytes(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) return Math.abs(a.length - b.length) + 1;
  let unequal = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) unequal++;
  return unequal;
}

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
    const terrain = physicalTerrain, weights = new Float32Array(8);
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
    const source = physicalTerrain;
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
    expect(unequalBytes(a.albedo.image.data as Uint8Array, b.albedo.image.data as Uint8Array)).toBe(0);
    expect(unequalBytes(a.normal.image.data as Uint8Array, b.normal.image.data as Uint8Array)).toBe(0);
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

  it('keeps original turf and trodden soil muted, with shallow plant relief below the fractured mineral layers', async () => {
    const texture = await makeTerrainTextures(256);
    try {
      const albedo = texture.albedo.image.data as Uint8Array, normal = texture.normal.image.data as Uint8Array;
      const moments = (layer: number) => {
        const mean = [0, 0, 0], lateral: number[] = [];
        let nonOpaque = 0;
        for (let i = 0; i < 256 * 256; i++) {
          const offset = (layer * 256 * 256 + i) * 4;
          for (let channel = 0; channel < 3; channel++) mean[channel]! += albedo[offset + channel]! / (256 * 256);
          if (albedo[offset + 3] !== 255) nonOpaque++;
          lateral.push(Math.hypot(normal[offset]! / 255 * 2 - 1, normal[offset + 1]! / 255 * 2 - 1));
        }
        lateral.sort((a, b) => a - b);
        expect(nonOpaque).toBe(0);
        return { mean, relief95: lateral[Math.floor(lateral.length * 0.95)]! };
      };
      const turf = moments(LAYER.grass), soil = moments(LAYER.earth), track = moments(LAYER.path), stone = moments(LAYER.rock);
      // Olive-grey vegetation and warm earth occupy different groups without acid-green or orange channels.
      expect(turf.mean[1]).toBeGreaterThan(turf.mean[0]!);
      expect(turf.mean[1]! / turf.mean[0]!).toBeLessThan(1.3);
      expect(turf.mean[1]! / turf.mean[2]!).toBeLessThan(1.9);
      expect(soil.mean[0]).toBeGreaterThan(soil.mean[1]!);
      expect(track.mean[0]).toBeGreaterThan(track.mean[1]!);
      expect(track.mean[1]).toBeGreaterThan(track.mean[2]!);
      // A woven mat and a compacted walking surface cannot have the bumpy normals of a rock face.
      expect(turf.relief95).toBeLessThan(0.2);
      expect(track.relief95).toBeLessThan(0.35);
      expect(stone.relief95).toBeGreaterThan(track.relief95 * 1.8);
    } finally { texture.dispose(); }
  });

  it('keeps every authored road centre continuous and blends finite visual shoulders without changing supporting heights', () => {
    const terrain = physicalTerrain, weights = new Float32Array(8);
    for (const road of ROADS) for (let i = 1; i < road.points.length; i++) {
      const start = road.points[i - 1]!, end = road.points[i]!;
      const dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz);
      for (const t of [0.1, 0.4, 0.7, 0.9]) {
        const x = start.x + dx * t, z = start.z + dz * t, height = terrain.heightAt(x, z);
        groundSplat(terrain, x, z, weights);
        expect(weights[LAYER.path]).toBeGreaterThanOrEqual(0.91);
        expect(terrain.heightAt(x, z)).toBe(height);
        let previous: number | undefined;
        for (let offset = 0; offset <= road.width / 2 + 3; offset += 0.2) {
          const wet = groundSplat(terrain, x - dz / length * offset, z + dx / length * offset, weights);
          expect([...weights, wet].every(Number.isFinite)).toBe(true);
          expect(weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
          if (previous !== undefined) expect(Math.abs(previous - weights[LAYER.path]!)).toBeLessThan(0.25);
          previous = weights[LAYER.path];
        }
      }
    }
  });

  it('keeps the actual terrain shader composed with PBR roughness and world-projected normals without vertex displacement', () => {
    const texture = { albedo: new THREE.DataArrayTexture(), normal: new THREE.DataArrayTexture() } as TerrainTextures;
    const material = createTerrainMaterial(texture);
    try {
      const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} } as Parameters<THREE.Material['onBeforeCompile']>[0];
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      expect(shader.uniforms.uAlb!.value).toBe(texture.albedo);
      expect(shader.uniforms.uNrm!.value).toBe(texture.normal);
      expect(shader.fragmentShader).toContain('roughnessFactor = tRough');
      expect(shader.fragmentShader).toContain('textureGrad(uAlb');
      expect(shader.fragmentShader).toContain('tDn - tNg * dot(tNg, tDn)');
      expect(shader.vertexShader).not.toContain('transformed +=');
      expect(shader.fragmentShader).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/);
    } finally { material.dispose(); texture.albedo.dispose(); texture.normal.dispose(); }
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

  it('mixes ankle-height herb leaves and taller grass within a low tuft, with attached veins on grounded forest plants', () => {
    const geometry = createGrassPatch(13, 12345), positions = geometry.getAttribute('position');
    const heights: number[] = [];
    for (let blade = 0; blade < positions.count; blade += 18) {
      let height = 0;
      for (let vertex = blade; vertex < blade + 18; vertex++) height = Math.max(height, positions.getY(vertex));
      heights.push(height);
    }
    heights.sort((a, b) => a - b);
    expect(heights[0]).toBeLessThan(0.35);
    expect(heights[Math.floor(heights.length / 2)]).toBeLessThan(0.6);
    expect(heights.at(-1)).toBeLessThan(0.9);
    expect(heights.at(-1)! / heights[0]!).toBeGreaterThan(2);
    geometry.dispose();
    for (const plant of [buildForestFernGeometry(0), buildForestShrubGeometry(0)]) {
      const detail = plant.getAttribute('aLeafDetail');
      expect(detail.count).toBe(plant.getAttribute('position').count);
      expect(Array.from(detail.array).every(Number.isFinite)).toBe(true);
      expect(plant.boundingBox!.min.y).toBeLessThanOrEqual(0.011);
      let leaves = 0, stems = 0;
      for (let i = 0; i < detail.count; i++) {
        if (detail.getZ(i) === 0) stems++;
        else {
          leaves++;
          expect(detail.getX(i)).toBeGreaterThanOrEqual(0);
          expect(detail.getX(i)).toBeLessThanOrEqual(1);
          expect(detail.getY(i)).toBeGreaterThanOrEqual(0);
          expect(detail.getY(i)).toBeLessThanOrEqual(1);
        }
      }
      expect(stems).toBeGreaterThan(0); expect(leaves).toBeGreaterThan(stems);
      plant.dispose();
    }
  });

  it('paints original leaf tissue with real clear margins and uses the same cutout in colour, depth and distance passes', () => {
    const a = buildForestLeafTexture(128), b = buildForestLeafTexture(128);
    expect(unequalBytes(a.image.data as Uint8Array, b.image.data as Uint8Array)).toBe(0);
    expect(a).not.toBe(b); expect(a.source).not.toBe(b.source);
    expect(a.image.data).not.toBe(b.image.data);
    const pixels = a.image.data as Uint8Array;
    let clear = 0, opaque = 0, darkest = 255, lightest = 0;
    for (let pixel = 0; pixel < pixels.length; pixel += 4) {
      if (pixels[pixel + 3]! < 89) clear++;
      else { opaque++; darkest = Math.min(darkest, pixels[pixel + 1]!); lightest = Math.max(lightest, pixels[pixel + 1]!); }
    }
    expect(clear).toBeGreaterThan(opaque);
    expect(opaque / (128 * 128)).toBeGreaterThan(0.3);
    expect(lightest - darkest).toBeGreaterThan(25);
    expect(a.colorSpace).toBe(THREE.NoColorSpace);
    // An owner's private upload buffer cannot corrupt the cached original art or another World.
    const original = (b.image.data as Uint8Array)[0]!;
    pixels[0] = original === 0 ? 255 : 0;
    const c = buildForestLeafTexture(128);
    expect((c.image.data as Uint8Array)[0]).toBe(original);
    expect((b.image.data as Uint8Array)[0]).toBe(original);
    c.dispose();
    a.dispose(); b.dispose();
    const terrain = physicalTerrain, floor = buildForestFloor(terrain, new Exclusions(terrain), 'high');
    try {
      const fern = floor.group.children.find(mesh => mesh.name.startsWith('forest_floor_fern:')) as THREE.InstancedMesh;
      const compile = (material: THREE.Material, kind: 'standard' | 'depth' | 'distance') => {
        const source = THREE.ShaderLib[kind]!;
        const shader = { vertexShader: source.vertexShader, fragmentShader: source.fragmentShader, uniforms: {} } as Parameters<THREE.Material['onBeforeCompile']>[0];
        material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
        expect(shader.vertexShader.match(/attribute vec3 aLeafDetail;/g)).toHaveLength(1);
        expect(shader.fragmentShader).toContain('texture2D(uFloorLeafSurface, vFloorLeafDetail.xy).a < 0.35');
        expect(shader.fragmentShader).toContain('tvDistanceNoise(gl_FragCoord.xy)');
        return shader;
      };
      const colour = compile(fern.material as THREE.Material, 'standard');
      const depth = compile(fern.customDepthMaterial!, 'depth'), distance = compile(fern.customDistanceMaterial!, 'distance');
      expect(depth.uniforms.uFloorLeafSurface!.value).toBe(colour.uniforms.uFloorLeafSurface!.value);
      expect(distance.uniforms.uFloorLeafSurface!.value).toBe(colour.uniforms.uFloorLeafSurface!.value);
      let releases = 0;
      (colour.uniforms.uFloorLeafSurface!.value as THREE.Texture).addEventListener('dispose', () => releases++);
      floor.dispose?.(); floor.dispose?.();
      expect(releases).toBe(1);
    } finally { floor.dispose?.(); disposeTreeTextures(); }
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
    const terrain = physicalTerrain;
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
