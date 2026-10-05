import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createGroundContactField } from '../../src/presentation/groundContacts';
import { groundSplat } from '../../src/presentation/groundSplat';
import { attachGroundedRockSurface } from '../../src/presentation/rockSurface';
import { buildTerrainMesh, buildTerrainTiles } from '../../src/presentation/terrainMesh';
import { LAYER, type TerrainTextures } from '../../src/presentation/terrainTextures';
import { buildingEntry } from '../../src/world/buildingEntries';
import { BUILDINGS, WORLD } from '../../src/world/layout';
import type { PhysicalRockGeometry } from '../../src/world/physicsGeometry';
import type { Terrain } from '../../src/world/terrain';

const flat = { heightAt: () => 0 };
function rock(y: number): PhysicalRockGeometry {
  return { id: `synthetic-rock-${y}`, positions: new Float32Array([-2, y, -1, 1, y, -1, 1, y, 1, -2, y, 1, 0, y + 2, 0]),
    indices: new Uint32Array([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]),
    bounds: { minX: -2, maxX: 1, minY: y, maxY: y + 2, minZ: -1, maxZ: 1 } };
}

describe('placement-aware original mineral/soil joins', () => {
  it('uses accepted grounded basal rock hulls, excludes elevated shapes, and feathers a bounded toe without altering source contacts', () => {
    const source = rock(-0.1), positions = source.positions.slice(), indices = source.indices.slice();
    const field = createGroundContactField(flat, [source, rock(5)], []), sample = new Float32Array(3);
    expect(field.rockFootprints).toBe(1);
    field.sampleAt(0.3, 0, sample); expect(sample[1]).toBeGreaterThan(0.45);
    let previous = sample[1]!;
    for (let x = 1; x <= 3; x += 0.05) {
      field.sampleAt(x, 0, sample);
      expect([...sample].every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
      expect(Math.abs(sample[1]! - previous)).toBeLessThan(0.15); previous = sample[1]!;
    }
    field.sampleAt(3, 0, sample); expect([...sample]).toEqual([0, 0, 0]);
    expect(source.positions).toEqual(positions); expect(source.indices).toEqual(indices);
    expect(createGroundContactField(flat, [rock(5)], []).rockFootprints).toBe(0);
  });

  it('places worn aprons at actual authored doorway offsets in rotated building frames', () => {
    for (const building of BUILDINGS) {
      const field = createGroundContactField(flat, [], [building]), sample = new Float32Array(3);
      const door = buildingEntry(building), c = Math.cos(building.yaw), s = Math.sin(building.yaw);
      const x = building.x + door.x * c + (door.z + 0.9) * s;
      const z = building.z - door.x * s + (door.z + 0.9) * c;
      field.sampleAt(x, z, sample); expect(sample[0]).toBeCloseTo(0.87);
      field.sampleAt(building.x, building.z - building.d - 8, sample); expect(sample[0]).toBe(0);
    }
  });

  it('stores identical material fields along shared resident tile edges while keeping the exact terrain/support positions', () => {
    const terrain = { nx: 3, nz: 2, vertexX: (i: number) => -4 + i * 2, vertexZ: (j: number) => -2 + j * 2,
      heightAt: () => 0, slopeAt: () => 0.1, carveAt: () => 0 } as unknown as Terrain;
    const contacts = createGroundContactField(terrain, [rock(-0.1)], []);
    const tex = { albedo: new THREE.DataArrayTexture(), normal: new THREE.DataArrayTexture() } as TerrainTextures;
    const original = buildTerrainMesh(terrain, tex, undefined, contacts), tiles = buildTerrainTiles(terrain, tex, undefined, 3, contacts);
    try {
      const p = original.geometry.getAttribute('position'), fields = original.geometry.getAttribute('aSurface');
      const source = new Map<string, number>();
      for (let i = 0; i < p.count; i++) source.set(`${p.getX(i)}:${p.getZ(i)}`, i);
      let stained = 0;
      for (const child of tiles.children) {
        const mesh = child as THREE.Mesh, position = mesh.geometry.getAttribute('position'), field = mesh.geometry.getAttribute('aSurface');
        for (let i = 0; i < position.count; i++) {
          const key = `${position.getX(i)}:${position.getZ(i)}`, index = source.get(key)!;
          expect(position.getY(i)).toBe(terrain.heightAt(position.getX(i), position.getZ(i)));
          for (let channel = 0; channel < 3; channel++) expect(field.array[i * 3 + channel]).toBe(fields.array[index * 3 + channel]);
          if (field.getY(i) > 0) stained++;
        }
      }
      expect(stained).toBeGreaterThan(0);
      const weights = new Float32Array(8);
      groundSplat(terrain, 0, 0, weights, undefined, undefined, 0, new Float32Array([1, 1, 1]));
      expect(weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
      expect(weights[LAYER.path]).toBeGreaterThan(0.4);
    } finally {
      original.geometry.dispose(); (original.material as THREE.Material).dispose();
      tiles.children.forEach(child => (child as THREE.Mesh).geometry.dispose());
      ((tiles.children[0] as THREE.Mesh).material as THREE.Material).dispose(); tex.albedo.dispose(); tex.normal.dispose();
    }
  });

  it('composes real ground-derived rock weathering with PBR map/normal chunks and releases its private data view only once', () => {
    const terrain = { heights: new Float32Array([0, 1, 2, 3]), nx: 1, nz: 1 } as unknown as Terrain;
    const material = new THREE.MeshStandardMaterial({ roughness: 0.97 });
    const prior = vi.fn(); material.onBeforeCompile = prior;
    attachGroundedRockSurface(material, terrain);
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} } as Parameters<THREE.Material['onBeforeCompile']>[0];
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(prior).toHaveBeenCalledOnce();
    const height = shader.uniforms.uRockGround!.value as THREE.DataTexture, dispose = vi.spyOn(height, 'dispose');
    expect(height.image.data).toBe(terrain.heights); expect(height.colorSpace).toBe(THREE.NoColorSpace);
    expect(height.minFilter).toBe(THREE.NearestFilter);
    expect(shader.uniforms.uRockGrid!.value.toArray()).toEqual([WORLD.minX, WORLD.minZ, WORLD.cell]);
    expect(shader.fragmentShader).toContain('f.x + f.y <= 1.0');
    expect(shader.fragmentShader).toContain('#include <normal_fragment_maps>');
    expect(shader.fragmentShader).toContain('#include <map_fragment>');
    expect(shader.vertexShader).not.toContain('transformed +=');
    material.dispose(); material.dispose(); expect(dispose).toHaveBeenCalledOnce();
  });
});
