import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildCoastalBackdrop, coastalBackdropGeometry } from '../src/presentation/coastalBackdrop';
import { groundSplat } from '../src/presentation/groundSplat';
import { buildTerrainMesh } from '../src/presentation/terrainMesh';
import { LAYER, type TerrainTextures } from '../src/presentation/terrainTextures';
import { MAP_BOUNDS } from '../src/presentation/ui/mapProjection';
import { mapTerrainColor } from '../src/presentation/ui/mapTerrain';
import { coastX, shoreDistance } from '../src/world/coast';
import { DISTANT_COAST, distantCoastHeight } from '../src/world/distantCoast';
import { ARRIVAL_ROUTE, COAST_SHELVES, LIGHTHOUSE, SEA_LEVEL, SPAWN, WORLD } from '../src/world/layout';
import { Terrain } from '../src/world/terrain';
import { BATHY, BATHY_NX, BATHY_NZ, buildBathymetry, SWASH_LIMIT } from '../src/world/water/bathymetry';

let terrain: Terrain;
beforeAll(() => { terrain = new Terrain(); });

function surface(x: number, z: number) {
  const weights = new Float32Array(8);
  const wet = groundSplat(terrain, x, z, weights);
  return { weights, wet };
}

function emptyTextures(): TerrainTextures {
  return { albedo: new THREE.DataArrayTexture(), normal: new THREE.DataArrayTexture() } as TerrainTextures;
}

describe('original coastal bay composition and physical ground', () => {
  it('encloses a recessed cove between separated rocky points while retaining the safe beach arrival', () => {
    const centre = coastX(52);
    expect(centre - coastX(-138)).toBeGreaterThan(55);
    expect(centre - coastX(LIGHTHOUSE.z)).toBeGreaterThan(55);
    expect(shoreDistance(SPAWN.x, SPAWN.z)).toBeGreaterThan(5);
    expect(shoreDistance(SPAWN.x, SPAWN.z)).toBeLessThan(10);
    expect(terrain.heightAt(SPAWN.x, SPAWN.z)).toBeGreaterThan(0.2);
    expect(terrain.heightAt(SPAWN.x, SPAWN.z)).toBeLessThan(1);
    expect(terrain.walkable(SPAWN.x, SPAWN.z, 0.8)).toBe(true);
    expect(SPAWN.yaw).toBeCloseTo(Math.atan2(ARRIVAL_ROUTE[0]!.x - SPAWN.x, ARRIVAL_ROUTE[0]!.z - SPAWN.z));
  });

  it('keeps a broad low sand apron and shallow wading before the dry grass-capped rock shelves', () => {
    const z = 0, shore = coastX(z);
    for (const distance of [12, 20, 28]) {
      const x = shore + distance, { weights, wet } = surface(x, z);
      expect(terrain.heightAt(x, z)).toBeGreaterThan(0.5);
      expect(terrain.heightAt(x, z)).toBeLessThan(2);
      expect(terrain.walkable(x, z, 0.8)).toBe(true);
      expect(weights[LAYER.sand]).toBeGreaterThan(0.85);
      expect(wet).toBe(0);
    }
    expect(terrain.walkable(shore - 2, z)).toBe(true);
    expect(terrain.isDeepWater(shore - 40, z)).toBe(true);

    for (const shelf of COAST_SHELVES) {
      const { weights, wet } = surface(shelf.x, shelf.z);
      expect(terrain.heightAt(shelf.x, shelf.z)).toBeGreaterThan(shelf.height * 0.9);
      expect(terrain.slopeAt(shelf.x, shelf.z)).toBeLessThan(0.15);
      expect(weights[LAYER.grass]).toBeGreaterThan(0.6);
      expect(weights[LAYER.sand]).toBeLessThan(0.12);
      expect(weights[LAYER.rock]).toBeLessThan(0.2);
      expect(wet).toBe(0);
    }
    for (const z of [-70, -35, 56]) {
      const x = coastX(z) + 20, { weights, wet } = surface(x, z);
      expect(terrain.slopeAt(x, z)).toBeGreaterThan(0.8);
      expect(weights[LAYER.rock]).toBeGreaterThan(0.8);
      expect(wet).toBe(0);
    }
  });

  it('matches both sides of the new shelf diagonals to rendered ground and standing support', () => {
    const tex = emptyTextures();
    try {
      let maximumError = 0, sampled = 0;
      // Aligned crops cover the new steep lip, flat cap and landward falloff, not a synthetic flat plane.
      for (const [x0, z0] of [[-296, -76], [-274, -38], [-238, -38], [-256, 54]] as const) {
        const crop = { nx: 4, nz: 4, vertexX: (i: number) => x0 + i * WORLD.cell,
          vertexZ: (j: number) => z0 + j * WORLD.cell,
          heightAt: terrain.heightAt.bind(terrain), slopeAt: terrain.slopeAt.bind(terrain),
          carveAt: terrain.carveAt.bind(terrain) } as Terrain;
        const mesh = buildTerrainMesh(crop, tex), position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index!;
        try {
          for (let triangle = 0; triangle < index.count; triangle += 3) {
            const vertices = [0, 1, 2].map(corner => new THREE.Vector3().fromBufferAttribute(position, index.getX(triangle + corner)));
            for (const weights of [[1 / 3, 1 / 3, 1 / 3], [0.1, 0.68, 0.22], [0.63, 0.11, 0.26]]) {
              const point = new THREE.Vector3();
              vertices.forEach((vertex, corner) => point.addScaledVector(vertex, weights[corner]!));
              maximumError = Math.max(maximumError, Math.abs(point.y - terrain.heightAt(point.x, point.z)),
                Math.abs(point.y - terrain.supportAt(point.x, point.z, point.y)));
              sampled++;
            }
          }
        } finally { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
      }
      expect(sampled).toBeGreaterThan(1000);
      expect(maximumError).toBeLessThan(0.000004);
    } finally { tex.albedo.dispose(); tex.normal.dispose(); }
  });

  it('shows the playable sea and newly raised coast from physical elevation on the regional map', () => {
    for (const z of [-35, 0, 27, 56]) {
      const seaX = coastX(z) - 15, landX = coastX(z) + 12;
      const seaHeight = terrain.heightAt(seaX, z), landHeight = terrain.heightAt(landX, z);
      expect(seaHeight).toBeLessThan(SEA_LEVEL);
      expect(landHeight).toBeGreaterThan(SEA_LEVEL);
      const seaWash = mapTerrainColor(seaX, z, seaHeight), landWash = mapTerrainColor(landX, z, landHeight);
      expect(seaWash[2]).toBeGreaterThan(seaWash[0]);
      expect(landWash[0]).toBeGreaterThan(landWash[2]);
      expect(seaWash).not.toEqual(landWash);
    }
    expect(DISTANT_COAST.maxX).toBe(WORLD.minX);
    expect(DISTANT_COAST.maxX).toBeLessThan(MAP_BOUNDS.x0);
    expect(terrain.walkable(-720, -97, Infinity)).toBe(false);
  });
});

describe('resident uninhabited promontory and sea contact', () => {
  it('uses finite upward triangles under20k, normalized surfaces and the same dry-land planes as the water', () => {
    const land = coastalBackdropGeometry(), bathymetry = buildBathymetry(terrain);
    try {
      const position = land.getAttribute('position'), index = land.index!;
      expect(index.count / 3).toBeGreaterThan(1000);
      expect(index.count / 3).toBeLessThan(20000);
      expect(land.boundingBox!.max.x).toBe(WORLD.minX);
      let maximumError = 0, minimumArea = Infinity, dry = 0, wet = 0;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let triangle = 0; triangle < index.count; triangle += 3) {
        a.fromBufferAttribute(position, index.getX(triangle));
        b.fromBufferAttribute(position, index.getX(triangle + 1));
        c.fromBufferAttribute(position, index.getX(triangle + 2));
        const point = a.clone().add(b).add(c).divideScalar(3);
        maximumError = Math.max(maximumError, Math.abs(point.y - distantCoastHeight(point.x, point.z)));
        minimumArea = Math.min(minimumArea, b.clone().sub(a).cross(c.clone().sub(a)).y);
      }
      expect(minimumArea).toBeGreaterThan(0);
      expect(maximumError).toBeLessThan(0.000008);
      for (const name of ['position', 'normal', 'aSplatA', 'aSplatB', 'aWet']) {
        expect(Array.from(land.getAttribute(name).array).every(Number.isFinite)).toBe(true);
      }
      const splatA = land.getAttribute('aSplatA'), splatB = land.getAttribute('aSplatB');
      for (let vertex = 0; vertex < position.count; vertex++) {
        const sum = splatA.getX(vertex) + splatA.getY(vertex) + splatA.getZ(vertex) + splatA.getW(vertex)
          + splatB.getX(vertex) + splatB.getY(vertex) + splatB.getZ(vertex) + splatB.getW(vertex);
        expect(sum).toBeCloseTo(1, 5);
      }
      // The sea's bed under the distant coast is that same ground: water stands exactly where it lies below sea level,
      // and land above the swash's reach is never sea.
      const columns = BATHY_NX + 1;
      let maximumWaterError = 0, checked = 0;
      for (let j = 0; j <= BATHY_NZ; j++) for (let i = 0; i <= BATHY_NX; i++) {
        const x = BATHY.minX + i * BATHY.cell, z = BATHY.minZ + j * BATHY.cell;
        if (x < DISTANT_COAST.minX || x >= WORLD.minX || z < DISTANT_COAST.minZ || z > DISTANT_COAST.maxZ) continue;
        const id = j * columns + i, actualDepth = SEA_LEVEL - distantCoastHeight(x, z);
        maximumWaterError = Math.max(maximumWaterError, Math.abs(SEA_LEVEL - bathymetry.bed[id]! - actualDepth));
        if (actualDepth < -SWASH_LIMIT - 0.1) { expect(bathymetry.height[id]!).toBeLessThan(0); dry++; }
        if (actualDepth > 0.1 && bathymetry.height[id]! >= 0) wet++;
        checked++;
      }
      expect(checked).toBeGreaterThan(9000);
      expect(dry).toBeGreaterThan(500);
      expect(wet).toBeGreaterThan(1000);
      expect(maximumWaterError).toBeLessThan(0.000008);
    } finally { land.dispose(); }
  });

  it('retains its silhouette through updates and releases private geometry/material without disposing borrowed terrain textures', () => {
    const tex = emptyTextures(), handle = buildCoastalBackdrop(tex);
    const mesh = handle.group.children[0] as THREE.Mesh;
    const geometry = vi.spyOn(mesh.geometry, 'dispose'), material = vi.spyOn(mesh.material as THREE.Material, 'dispose');
    const albedo = vi.spyOn(tex.albedo, 'dispose'), normal = vi.spyOn(tex.normal, 'dispose');
    try {
      expect(mesh.visible).toBe(true);
      const pose = mesh.matrix.clone();
      expect(handle.stats!()).toHaveProperty('coastalPromontoryTris');
      handle.update(60, {} as Parameters<typeof handle.update>[1]);
      expect(mesh.visible).toBe(true);
      expect(mesh.matrix.equals(pose)).toBe(true);
      handle.dispose!(); handle.dispose!();
      expect(handle.group.children).toHaveLength(0);
      expect(geometry).toHaveBeenCalledTimes(1);
      expect(material).toHaveBeenCalledTimes(1);
      expect(albedo).not.toHaveBeenCalled();
      expect(normal).not.toHaveBeenCalled();
    } finally { handle.dispose!(); tex.albedo.dispose(); tex.normal.dispose(); }
  });
});
