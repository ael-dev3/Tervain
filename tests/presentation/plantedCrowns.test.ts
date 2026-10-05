import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PlantedCrownIndex } from '../../src/presentation/plantedCrowns';
import { Habitat, newSample } from '../../src/presentation/ground/habitat';
import { groundSplat } from '../../src/presentation/groundSplat';
import { buildTerrainMesh } from '../../src/presentation/terrainMesh';
import { LAYER, type TerrainTextures } from '../../src/presentation/terrainTextures';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { pineTemplates } from './pineFixture';
import { createPineForest } from '../../src/presentation/solitaryPine';
import { disposeTreeTextures } from '../../src/presentation/treeTextures';

/** Small hand-authored foliage patches, including a real disconnected gap around their logical origin. */
function patches(rectangles: readonly [number, number, number, number][], indexed = true): THREE.BufferGeometry {
  const positions: number[] = [], indices: number[] = [];
  for (const [x0, z0, x1, z1] of rectangles) {
    const first = positions.length / 3;
    positions.push(x0, 6, z0, x1, 6, z0, x1, 6, z1, x0, 6, z1);
    indices.push(first, first + 2, first + 1, first, first + 3, first + 2);
  }
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)).setIndex(indices);
  if (indexed) return geometry;
  const expanded = geometry.toNonIndexed(); geometry.dispose(); return expanded;
}

const nativePatches: readonly [number, number, number, number][] = [[4, -2, 10, 1], [-8, 4, -6, 7]];

describe('planted source crown shade', () => {
  it('retains asymmetric disconnected foliage instead of painting a disc around a logical trunk', () => {
    for (const indexed of [true, false]) {
      const geometry = patches(nativePatches, indexed), field = new PlantedCrownIndex();
      field.add('oak', { x: 0, z: 0, s: 1, yaw: 0 }, geometry);
      expect(field.coverAt(7, -0.5)).toBeGreaterThan(0.6);
      expect(field.coverAt(-7, 5.5)).toBeGreaterThan(0.4);
      expect(field.coverAt(0, 0)).toBe(0);
      expect(field.coverAt(-7, -0.5)).toBe(0);
      expect(field.coverAt(3, 3)).toBe(0);
      expect(field.coverAt(50, 50)).toBe(0);
      expect(field.broadleafAt(7, -0.5)).toBe(field.coverAt(7, -0.5));
      geometry.dispose();
    }
  });

  it('follows uniform source scale, yaw and translation on both sides of negative spatial-hash boundaries', () => {
    const geometry = patches(nativePatches), native = new PlantedCrownIndex();
    native.add('pine', { x: 0, z: 0, s: 1, yaw: 0 }, geometry);
    const probes = [[7, -0.5], [-7, 5.5], [0, 0], [-7, -0.5], [10.5, 0]];
    for (const placement of [
      { x: -65, z: -33, s: 2.2, yaw: Math.PI / 2 },
      { x: -31.99, z: -64.01, s: 0.65, yaw: -0.7 },
      { x: 31.99, z: 0.01, s: 1.3, yaw: 2.1 },
    ]) {
      const planted = new PlantedCrownIndex(); planted.add('pine', placement, geometry);
      // A Three.js matrix is the rendering authority; the shade sample must follow that transform.
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(placement.x, 0, placement.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), placement.yaw), new THREE.Vector3().setScalar(placement.s));
      for (const [x, z] of probes) {
        const world = new THREE.Vector3(x, 0, z).applyMatrix4(matrix);
        expect(planted.coverAt(world.x, world.z)).toBeCloseTo(native.coverAt(x!, z!), 10);
        expect(planted.broadleafAt(world.x, world.z)).toBe(0);
      }
    }
    geometry.dispose();
  });

  it('bounds overlapping canopy shade, separates broadleaf shade and gives deterministic insertion-independent samples', () => {
    const geometry = patches([[-5, -5, 5, 5]]), single = new PlantedCrownIndex(), forward = new PlantedCrownIndex(), reverse = new PlantedCrownIndex();
    const a = { x: -32.1, z: -31.9, s: 1.2, yaw: 0.4 }, b = { x: -30, z: -34, s: 0.9, yaw: -1.1 };
    single.add('oak', a, geometry);
    forward.add('oak', a, geometry); forward.add('pine', b, geometry);
    reverse.add('pine', b, geometry); reverse.add('oak', a, geometry);
    let overlaps = 0;
    for (let z = -40; z <= -24; z += 0.5) for (let x = -40; x <= -24; x += 0.5) {
      const cover = forward.coverAt(x, z), broadleaf = forward.broadleafAt(x, z);
      expect(cover).toBeGreaterThanOrEqual(0); expect(cover).toBeLessThanOrEqual(1);
      expect(broadleaf).toBeGreaterThanOrEqual(0); expect(broadleaf).toBeLessThanOrEqual(cover);
      expect(cover).toBeCloseTo(reverse.coverAt(x, z), 12);
      expect(broadleaf).toBeCloseTo(single.coverAt(x, z), 12);
      if (cover > broadleaf + 0.1 && broadleaf > 0.1) overlaps++;
    }
    expect(overlaps).toBeGreaterThan(25);
    geometry.dispose();
  });

  it('shares the same crown shade with rendered soil layers and grass habitat without turning canopy into a trunk obstacle', () => {
    const terrain = new Terrain(), geometry = patches([[-12, -10, 12, 10]]), field = new PlantedCrownIndex();
    field.add('oak', { x: -184, z: -12, s: 1, yaw: 0 }, geometry);
    const colliders = new Colliders(), excl = new Exclusions(terrain);
    const habitat = new Habitat({ terrain, colliders, excl, plantedCrowns: field });
    const crop = {
      nx: 8, nz: 8, vertexX: (i: number) => -192 + i * 2, vertexZ: (j: number) => -20 + j * 2,
      heightAt: terrain.heightAt.bind(terrain), carveAt: terrain.carveAt.bind(terrain), slopeAt: terrain.slopeAt.bind(terrain),
    } as Terrain;
    const textures = { albedo: new THREE.DataArrayTexture(), normal: new THREE.DataArrayTexture() } as TerrainTextures;
    const mesh = buildTerrainMesh(crop, textures, field), positions = mesh.geometry.getAttribute('position');
    const a = mesh.geometry.getAttribute('aSplatA'), b = mesh.geometry.getAttribute('aSplatB');
    const splat = new Float32Array(8), bare = new Float32Array(8);
    let sampled = 0, earthier = 0;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      groundSplat(terrain, x, z, splat, field);
      const rendered = [a.getX(i), a.getY(i), a.getZ(i), a.getW(i), b.getX(i), b.getY(i), b.getZ(i), b.getW(i)];
      expect(rendered).toEqual(Array.from(splat));
      groundSplat(terrain, x, z, bare, { coverAt: () => 0, broadleafAt: () => 0 });
      if (splat[LAYER.earth]! > bare[LAYER.earth]! + 0.01) earthier++;
      if (x % 2 === 0 && z % 2 === 0) {
        expect(habitat.sample(x, z, newSample()).wood).toBeCloseTo(field.coverAt(x, z), 6);
        sampled++;
      }
    }
    expect(sampled).toBeGreaterThan(50); expect(earthier).toBeGreaterThan(50);
    expect(habitat.hardBlocked(-184, -12)).toBe(false);
    mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
    textures.albedo.dispose(); textures.normal.dispose(); geometry.dispose();
  });

  it('samples the delivered pine geometry with finite asymmetric planted shade without deforming its source vertices', async () => {
    const pine = createPineForest(await pineTemplates());
    try {
      const leaf = pine.variant('pine', 2).lods[0].leaf!;
      const positions = leaf.getAttribute('position'), snapshot = Array.from(positions.array), field = new PlantedCrownIndex();
      field.add('pine', { x: -190, z: 12, s: 1.2, yaw: 0.63 }, leaf);
      let occupied = 0, gaps = 0;
      for (let z = -5; z <= 30; z += 1) for (let x = -210; x <= -170; x += 1) {
        const shade = field.coverAt(x, z);
        expect(Number.isFinite(shade)).toBe(true); expect(shade).toBeGreaterThanOrEqual(0); expect(shade).toBeLessThanOrEqual(1);
        expect(field.broadleafAt(x, z)).toBe(0);
        if (shade > 0.1) occupied++; else if (shade === 0) gaps++;
      }
      expect(occupied).toBeGreaterThan(20); expect(gaps).toBeGreaterThan(100);
      expect(Array.from(positions.array)).toEqual(snapshot);
    } finally { pine.dispose(); disposeTreeTextures(); }
  });
});
