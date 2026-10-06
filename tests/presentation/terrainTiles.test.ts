import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { Terrain } from '../../src/world/terrain';
import type { TerrainTextures } from '../../src/presentation/terrainTextures';
import type { PlantedCrownField } from '../../src/presentation/plantedCrowns';
import { buildTerrainMesh, buildTerrainTiles, buildTerrainTilesAsync } from '../../src/presentation/terrainMesh';
import { disposeSceneResources } from '../../src/presentation/disposeScene';

const crop = {
  nx: 5, nz: 4,
  vertexX: (i: number) => -204 + i * 2,
  vertexZ: (j: number) => 10 + j * 2,
  heightAt: (x: number, z: number) => Math.sin(x * 0.3) * 2 + Math.cos(z * 0.4),
  slopeAt: () => 0.2,
  carveAt: () => 0,
} as unknown as Terrain;

function textures(): TerrainTextures {
  return { albedo: new THREE.DataArrayTexture(), normal: new THREE.DataArrayTexture() } as TerrainTextures;
}
function triangles(geometry: THREE.BufferGeometry): string[] {
  const index = geometry.index!, position = geometry.getAttribute('position'), result: string[] = [];
  for (let i = 0; i < index.count; i += 3) {
    result.push([0, 1, 2].map(v => {
      const at = index.getX(i + v);
      return `${position.getX(at)},${position.getY(at)},${position.getZ(at)}`;
    }).join(';'));
  }
  return result;
}
function release(group: THREE.Object3D) {
  const scene = new THREE.Scene(); scene.add(group); disposeSceneResources(scene, () => {});
}

describe('resident terrain tiles', () => {
  it('retains every ground triangle and exact normals/material values at shared edges, including partial tiles', () => {
    const tex = textures();
    const coverAt = vi.fn((x: number, z: number) => 0.43 + Math.sin(x + z) * 0.2);
    const crowns: PlantedCrownField = { coverAt, broadleafAt: () => 0 };
    const source = buildTerrainMesh(crop, tex, crowns);
    coverAt.mockClear();
    const tiles = buildTerrainTiles(crop, tex, crowns, 3);
    try {
      const original = source.geometry, positions = original.getAttribute('position');
      expect(tiles.children.length).toBe(12); // 10 × 8 render cells; both axes have partial edge tiles.
      expect(coverAt).toHaveBeenCalledTimes(positions.count);
      const byCoordinate = new Map<string, number>();
      for (let i = 0; i < positions.count; i++) byCoordinate.set(`${positions.getX(i)}:${positions.getZ(i)}`, i);
      const tiledTriangles: string[] = [], seen = new Map<string, number>();
      for (const child of tiles.children) {
        const mesh = child as THREE.Mesh, g = mesh.geometry, p = g.getAttribute('position');
        expect(mesh.material).toBe((tiles.children[0] as THREE.Mesh).material);
        expect(mesh.receiveShadow).toBe(true);
        expect(mesh.matrixAutoUpdate).toBe(false);
        expect(mesh.matrix.equals(new THREE.Matrix4())).toBe(true);
        expect(g.boundingBox).not.toBeNull(); expect(g.boundingSphere).not.toBeNull();
        for (let i = 0; i < p.count; i++) {
          const key = `${p.getX(i)}:${p.getZ(i)}`, sourceIndex = byCoordinate.get(key)!;
          expect(sourceIndex).toBeDefined(); seen.set(key, (seen.get(key) ?? 0) + 1);
          for (const name of Object.keys(original.attributes)) {
            const a = g.getAttribute(name), b = original.getAttribute(name);
            for (let c = 0; c < b.itemSize; c++) expect(a.array[i * a.itemSize + c]).toBe(b.array[sourceIndex * b.itemSize + c]);
          }
        }
        tiledTriangles.push(...triangles(g));
      }
      expect(seen.size).toBe(positions.count);
      expect([...seen.values()].some(n => n === 4)).toBe(true);
      expect(new Set(tiledTriangles).size).toBe(tiledTriangles.length);
      expect(tiledTriangles.sort()).toEqual(triangles(original).sort());
    } finally { release(tiles); release(source); tex.albedo.dispose(); tex.normal.dispose(); }
  });

  it('uses bounds for view culling while retaining all geometry and disposing the shared material once', () => {
    const tex = textures(), tiles = buildTerrainTiles(crop, tex, undefined, 3);
    const material = (tiles.children[0] as THREE.Mesh).material as THREE.Material;
    const disposeMaterial = vi.spyOn(material, 'dispose');
    const disposeAlbedo = vi.spyOn(tex.albedo, 'dispose'), disposeNormal = vi.spyOn(tex.normal, 'dispose');
    const geometryDisposes = tiles.children.map(child => vi.spyOn((child as THREE.Mesh).geometry, 'dispose'));
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 8);
    camera.position.set(-202, 5, 8); camera.lookAt(-202, 0, 12); camera.updateMatrixWorld();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const intersecting = tiles.children.filter(child => frustum.intersectsObject(child));
    expect(intersecting.length).toBeGreaterThan(0);
    expect(intersecting.length).toBeLessThan(tiles.children.length);
    for (const child of tiles.children) {
      expect(child.visible).toBe(true); expect(child.frustumCulled).toBe(true);
      expect((child as THREE.Mesh).geometry.index!.count).toBeGreaterThan(0);
    }
    release(tiles);
    for (const dispose of geometryDisposes) expect(dispose).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    // These sampler arrays are borrowed from World's terrain-texture owner, including after shader compilation.
    expect(disposeAlbedo).not.toHaveBeenCalled(); expect(disposeNormal).not.toHaveBeenCalled();
    tex.albedo.dispose(); tex.normal.dispose();
    expect(disposeAlbedo).toHaveBeenCalledTimes(1); expect(disposeNormal).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid partition before allocating the full ground', () => {
    const tex = textures(), height = vi.spyOn(crop, 'heightAt');
    try {
      for (const size of [0, -1, 0.5, Infinity, NaN]) expect(() => buildTerrainTiles(crop, tex, undefined, size)).toThrow('positive integer');
      expect(height).not.toHaveBeenCalled();
    } finally { height.mockRestore(); tex.albedo.dispose(); tex.normal.dispose(); }
  });

  it('cooperatively builds the exact same triangles, normals and ground fields before returning the ready group', async () => {
    const tex = textures(), reference = buildTerrainTiles(crop, tex, undefined, 3);
    const yieldNow = vi.fn(async () => {}), progress: { phase: string; completed: number; total: number }[] = [];
    const result = await buildTerrainTilesAsync(crop, tex, undefined, 3, undefined, { yieldNow, budgetMs: 0, onProgress: p => progress.push(p) });
    try {
      expect(yieldNow).toHaveBeenCalled();
      expect(progress.filter(p => p.phase === 'tiles').map(p => p.completed)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
      for (let i = 0; i < result.children.length; i++) {
        const a = (result.children[i] as THREE.Mesh).geometry, b = (reference.children[i] as THREE.Mesh).geometry;
        expect(a.index!.array).toEqual(b.index!.array);
        for (const name of Object.keys(b.attributes)) expect(a.getAttribute(name).array).toEqual(b.getAttribute(name).array);
      }
    } finally { release(result); release(reference); tex.albedo.dispose(); tex.normal.dispose(); }
  });

  it('releases completed and partial terrain allocations when cancelled between tiles, while retaining borrowed textures', async () => {
    const tex = textures(), controller = new AbortController();
    const geometries = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose'), materials = vi.spyOn(THREE.MeshStandardMaterial.prototype, 'dispose');
    const albedo = vi.spyOn(tex.albedo, 'dispose'), normal = vi.spyOn(tex.normal, 'dispose');
    const reason = new DOMException('New world request', 'AbortError');
    try {
      await expect(buildTerrainTilesAsync(crop, tex, undefined, 3, undefined, {
        signal: controller.signal, yieldNow: async () => {}, budgetMs: 0,
        onProgress: p => { if (p.phase === 'tiles' && p.completed === 3) controller.abort(reason); },
      })).rejects.toBe(reason);
      // One whole-surface buffer and the three complete tiles are owned; sampler arrays belong to WorldScene.
      expect(geometries).toHaveBeenCalledTimes(4);
      expect(materials).toHaveBeenCalledOnce();
      expect(albedo).not.toHaveBeenCalled(); expect(normal).not.toHaveBeenCalled();
    } finally { geometries.mockRestore(); materials.mockRestore(); tex.albedo.dispose(); tex.normal.dispose(); }
  });

  it('releases a completed source surface when its loading callback fails before any tiles are accepted', async () => {
    const tex = textures(), failure = new Error('Loading UI detached');
    const geometries = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose'), materials = vi.spyOn(THREE.MeshStandardMaterial.prototype, 'dispose');
    try {
      await expect(buildTerrainTilesAsync(crop, tex, undefined, 3, undefined, {
        yieldNow: async () => {}, budgetMs: 0,
        onProgress: p => { if (p.phase === 'surface' && p.completed === p.total) throw failure; },
      })).rejects.toBe(failure);
      expect(geometries).toHaveBeenCalledOnce(); expect(materials).toHaveBeenCalledOnce();
    } finally { geometries.mockRestore(); materials.mockRestore(); tex.albedo.dispose(); tex.normal.dispose(); }
  });
});
