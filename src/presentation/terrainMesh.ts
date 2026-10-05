import * as THREE from 'three';
import type { Terrain } from '../world/terrain';
import { groundSplat } from './groundSplat';
import { createTerrainMaterial } from './terrainMaterial';
import type { TerrainTextures } from './terrainTextures';
import type { PlantedCrownField } from './plantedCrowns';

/** Refine material boundaries without changing the authored ground planes used by physics. */
export const TERRAIN_RENDER_SUBDIVISIONS = 2;

export function buildTerrainMesh(terrain: Terrain, tex: TerrainTextures, crowns?: PlantedCrownField): THREE.Mesh {
  const subdivisions = TERRAIN_RENDER_SUBDIVISIONS;
  const nx = terrain.nx * subdivisions, nz = terrain.nz * subdivisions;
  const w = nx + 1;
  const h = nz + 1;
  const pos = new Float32Array(w * h * 3);
  const splatA = new Float32Array(w * h * 4);
  const splatB = new Float32Array(w * h * 4);
  const wet = new Float32Array(w * h);
  const sp = new Float32Array(8);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const x = terrain.vertexX(i / subdivisions);
      const z = terrain.vertexZ(j / subdivisions);
      pos[k * 3] = x;
      pos[k * 3 + 1] = terrain.heightAt(x, z);
      pos[k * 3 + 2] = z;
      wet[k] = groundSplat(terrain, x, z, sp, crowns);
      for (let q = 0; q < 4; q++) {
        splatA[k * 4 + q] = sp[q]!;
        splatB[k * 4 + q] = sp[4 + q]!;
      }
    }
  }
  const idx = new Uint32Array(nx * nz * 6);
  let p = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * w + i;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      idx[p++] = a;
      idx[p++] = c;
      idx[p++] = b;
      idx[p++] = b;
      idx[p++] = c;
      idx[p++] = d;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSplatA', new THREE.BufferAttribute(splatA, 4));
  geo.setAttribute('aSplatB', new THREE.BufferAttribute(splatB, 4));
  geo.setAttribute('aWet', new THREE.BufferAttribute(wet, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, createTerrainMaterial(tex));
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.name = 'terrain';
  return mesh;
}
