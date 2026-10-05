import * as THREE from 'three';
import { DISTANT_COAST, distantCoastHeight } from '../world/distantCoast';
import { fbm, smoothstep } from '../world/noise';
import { createTerrainMaterial } from './terrainMaterial';
import { LAYER, type TerrainTextures } from './terrainTextures';
import type { SceneModule } from './context';

/** Resident original shoreline silhouette: material textures are borrowed from this world's terrain owner. */
export function coastalBackdropGeometry(): THREE.BufferGeometry {
  const p = DISTANT_COAST, nx = (p.maxX - p.minX) / p.cellX, nz = (p.maxZ - p.minZ) / p.cellZ;
  const row = nx + 1, count = row * (nz + 1);
  const position = new Float32Array(count * 3), a = new Float32Array(count * 4), b = new Float32Array(count * 4);
  const wet = new Float32Array(count), weights = new Float32Array(8), indices: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * row + i, x = p.minX + i * p.cellX, z = p.minZ + j * p.cellZ;
    const h = distantCoastHeight(x, z), e = 2;
    const slope = Math.hypot((distantCoastHeight(x + e, z) - distantCoastHeight(x - e, z)) / (2 * e),
      (distantCoastHeight(x, z + e) - distantCoastHeight(x, z - e)) / (2 * e));
    position.set([x, h, z], k * 3);
    weights.fill(0);
    const sand = 1 - smoothstep(2, 5, h), stone = smoothstep(0.42, 0.95, slope);
    const green = 0.36 + fbm(x / 34, z / 29, 2, 227) * 0.2;
    weights[LAYER.sand] = sand;
    weights[LAYER.rock] = (1 - sand) * stone;
    weights[LAYER.grass] = (1 - sand) * (1 - stone) * green;
    weights[LAYER.heath] = (1 - sand) * (1 - stone) * (1 - green);
    for (let q = 0; q < 4; q++) { a[k * 4 + q] = weights[q]!; b[k * 4 + q] = weights[q + 4]!; }
    wet[k] = 1 - smoothstep(0, 1.2, h);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * row + i;
    indices.push(k, k + row, k + 1, k + 1, k + row, k + row + 1);
  }
  const g = new THREE.BufferGeometry();
  g.name = 'Original_Uninhabited_Bay_Promontory';
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aSplatA', new THREE.BufferAttribute(a, 4)); g.setAttribute('aSplatB', new THREE.BufferAttribute(b, 4));
  g.setAttribute('aWet', new THREE.BufferAttribute(wet, 1)); g.setIndex(indices);
  g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

export function buildCoastalBackdrop(tex: TerrainTextures): SceneModule {
  const group = new THREE.Group(), geometry = coastalBackdropGeometry(), material = createTerrainMaterial(tex);
  group.name = 'Uninhabited coast across the bay';
  const mesh = new THREE.Mesh(geometry, material); mesh.name = geometry.name; mesh.receiveShadow = true;
  group.add(mesh);
  let released = false;
  return { group, update() {}, stats: () => ({ coastalPromontoryTris: geometry.index!.count / 3 }),
    dispose() { if (released) return; released = true; geometry.dispose(); material.dispose(); group.clear(); } };
}
