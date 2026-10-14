import * as THREE from 'three';
import type { Terrain } from '../world/terrain';
import { groundSplat } from './groundSplat';
import { createTerrainMaterial } from './terrainMaterial';
import type { TerrainTextures } from './terrainTextures';
import type { PlantedCrownField } from './plantedCrowns';
import type { GroundContactField } from './groundContacts';
import type { MeadowGround } from './grass/grassField';
import { finishCooperatively, type CooperativeOptions } from '../platform/cooperative';

/** Refine material boundaries without changing the authored ground planes used by physics. */
export const TERRAIN_RENDER_SUBDIVISIONS = 2;
/** Spatial culling only: every tile retains the full authored triangles at every graphics preset. */
export const TERRAIN_TILE_CELLS = 64;

export interface TerrainBuildProgress {
  phase: 'surface' | 'tiles';
  completed: number;
  total: number;
}

/** Render vertices between the far-ground grass samples (B11). */
const MEADOW_STEP = 4;

function finishNow<T>(steps: Generator<TerrainBuildProgress, T>): T {
  for (;;) { const next = steps.next(); if (next.done) return next.value; }
}

export function buildTerrainMesh(terrain: Terrain, tex: TerrainTextures, crowns?: PlantedCrownField, contacts?: GroundContactField, meadow?: MeadowGround): THREE.Mesh {
  return finishNow(terrainMeshSteps(terrain, tex, crowns, contacts, meadow));
}

/** Keep the globally calculated normals and splats, but yield after short runs of complete rows. */
function* terrainMeshSteps(terrain: Terrain, tex: TerrainTextures, crowns?: PlantedCrownField, contacts?: GroundContactField, meadow?: MeadowGround): Generator<TerrainBuildProgress, THREE.Mesh> {
  const subdivisions = TERRAIN_RENDER_SUBDIVISIONS;
  const nx = terrain.nx * subdivisions, nz = terrain.nz * subdivisions;
  const w = nx + 1;
  const h = nz + 1;
  const pos = new Float32Array(w * h * 3);
  const splatA = new Float32Array(w * h * 4);
  const splatB = new Float32Array(w * h * 4);
  const wet = new Float32Array(w * h);
  const canopy = new Float32Array(w * h);
  const surface = new Float32Array(w * h * 3), contact = new Float32Array(3);
  // B11: the grass's own colour and cover for the far ground; without grass (w = -1) the shader keeps its plain sward.
  const meadowField = new Float32Array(w * h * 4);
  const sp = new Float32Array(8);
  const total = h + nz + 1;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const x = terrain.vertexX(i / subdivisions);
      const z = terrain.vertexZ(j / subdivisions);
      pos[k * 3] = x;
      pos[k * 3 + 1] = terrain.heightAt(x, z);
      pos[k * 3 + 2] = z;
      const cover = crowns?.coverAt(x, z) ?? 0;
      canopy[k] = Math.min(1, Math.max(0, cover));
      contacts?.sampleAt(x, z, contact);
      surface.set(contact, k * 3);
      if (!meadow) meadowField[k * 4 + 3] = -1;
      // Keep double precision for material weights; storing the shader attribute first would
      // round cover and disagree with the shared grass / floor sample at this coordinate.
      wet[k] = groundSplat(terrain, x, z, sp, crowns, undefined, cover, contact);
      for (let q = 0; q < 4; q++) {
        splatA[k * 4 + q] = sp[q]!;
        splatB[k * 4 + q] = sp[4 + q]!;
      }
    }
    if ((j + 1) % 4 === 0 || j + 1 === h) yield { phase: 'surface', completed: j + 1, total };
  }
  if (meadow) {
    // The grass's colour and cover change over metres, not centimetres: sample every MEADOW_STEP vertices and
    // interpolate (the habitat lookups per vertex took minutes of loading).
    const S = MEADOW_STEP, cw = Math.ceil((w - 1) / S) + 1, ch = Math.ceil((h - 1) / S) + 1, coarse = new Float32Array(cw * ch * 4);
    for (let cj = 0; cj < ch; cj++) {
      for (let ci = 0; ci < cw; ci++) meadow(terrain.vertexX(Math.min(ci * S, w - 1) / subdivisions), terrain.vertexZ(Math.min(cj * S, h - 1) / subdivisions), coarse, (cj * cw + ci) * 4);
      if ((cj + 1) % 8 === 0) yield { phase: 'surface', completed: h, total };
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const fi = i / S, fj = j / S, i0 = Math.min(Math.floor(fi), cw - 2), j0 = Math.min(Math.floor(fj), ch - 2);
      const tx = Math.min(1, fi - i0), tz = Math.min(1, fj - j0), k = (j * w + i) * 4;
      const a = (j0 * cw + i0) * 4, b = a + 4, c = a + cw * 4, d = c + 4;
      for (let q = 0; q < 4; q++) meadowField[k + q] = (coarse[a + q]! * (1 - tx) + coarse[b + q]! * tx) * (1 - tz) + (coarse[c + q]! * (1 - tx) + coarse[d + q]! * tx) * tz;
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
    if ((j + 1) % 64 === 0 || j + 1 === nz) yield { phase: 'surface', completed: h + j + 1, total };
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSplatA', new THREE.BufferAttribute(splatA, 4));
  geo.setAttribute('aSplatB', new THREE.BufferAttribute(splatB, 4));
  geo.setAttribute('aWet', new THREE.BufferAttribute(wet, 1));
  geo.setAttribute('aCanopy', new THREE.BufferAttribute(canopy, 1));
  geo.setAttribute('aSurface', new THREE.BufferAttribute(surface, 3));
  geo.setAttribute('aMeadow', new THREE.BufferAttribute(meadowField, 4));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, createTerrainMaterial(tex));
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.name = 'terrain';
  let transferred = false;
  try {
    yield { phase: 'surface', completed: total, total };
    transferred = true;
    return mesh;
  } finally {
    if (!transferred) { geo.dispose(); (mesh.material as THREE.Material).dispose(); }
  }
}

/** Partition the same surface into resident pieces so a camera (including water captures) submits
 * only intersecting ground. Copy globally computed normals/material fields at shared boundaries:
 * independent per-tile normal generation would make lighting seams. No distance LOD or unloading. */
export function buildTerrainTiles(terrain: Terrain, tex: TerrainTextures, crowns?: PlantedCrownField, tileCells = TERRAIN_TILE_CELLS, contacts?: GroundContactField, meadow?: MeadowGround): THREE.Group {
  return finishNow(terrainTileSteps(terrain, tex, crowns, tileCells, contacts, meadow));
}

/** The ready group is returned only after all tiles exist; cancellation never exposes partial terrain. */
export function buildTerrainTilesAsync(terrain: Terrain, tex: TerrainTextures, crowns?: PlantedCrownField, tileCells = TERRAIN_TILE_CELLS, contacts?: GroundContactField,
  options: CooperativeOptions & { onProgress?: (progress: TerrainBuildProgress) => void; meadow?: MeadowGround } = {}): Promise<THREE.Group> {
  return finishCooperatively(terrainTileSteps(terrain, tex, crowns, tileCells, contacts, options.meadow), options);
}

function* terrainTileSteps(terrain: Terrain, tex: TerrainTextures, crowns: PlantedCrownField | undefined, tileCells: number, contacts?: GroundContactField, meadow?: MeadowGround): Generator<TerrainBuildProgress, THREE.Group> {
  if (!Number.isInteger(tileCells) || tileCells < 1) throw new Error('Terrain tile cells must be a positive integer.');
  const source = yield* terrainMeshSteps(terrain, tex, crowns, contacts, meadow), geometry = source.geometry;
  const nx = terrain.nx * TERRAIN_RENDER_SUBDIVISIONS, nz = terrain.nz * TERRAIN_RENDER_SUBDIVISIONS;
  const sourceRow = nx + 1, group = new THREE.Group();
  group.name = 'terrain';
  const total = Math.ceil(nx / tileCells) * Math.ceil(nz / tileCells);
  let completed = 0, transferred = false;
  try {
    for (let z0 = 0; z0 < nz; z0 += tileCells) for (let x0 = 0; x0 < nx; x0 += tileCells) {
      const width = Math.min(tileCells, nx - x0), depth = Math.min(tileCells, nz - z0), row = width + 1;
      const g = new THREE.BufferGeometry();
      const tile = new THREE.Mesh(g, source.material);
      tile.name = `terrain:${x0}:${z0}`; tile.receiveShadow = true; tile.matrixAutoUpdate = false;
      group.add(tile);
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        const a = attribute as THREE.BufferAttribute, values = new Float32Array(row * (depth + 1) * a.itemSize);
        for (let z = 0; z <= depth; z++) for (let x = 0; x <= width; x++) {
          const from = ((z0 + z) * sourceRow + x0 + x) * a.itemSize, to = (z * row + x) * a.itemSize;
          for (let c = 0; c < a.itemSize; c++) values[to + c] = a.array[from + c]!;
        }
        g.setAttribute(name, new THREE.BufferAttribute(values, a.itemSize, a.normalized));
      }
      const indices = new Uint32Array(width * depth * 6);
      let at = 0;
      for (let z = 0; z < depth; z++) for (let x = 0; x < width; x++) {
        const a = z * row + x, b = a + 1, c = a + row, d = c + 1;
        indices.set([a, c, b, b, c, d], at); at += 6;
      }
      g.setIndex(new THREE.BufferAttribute(indices, 1)); g.computeBoundingSphere(); g.computeBoundingBox();
      yield { phase: 'tiles', completed: ++completed, total };
    }
    transferred = true;
    return group;
  } finally {
    geometry.dispose();
    if (!transferred) {
      group.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
      (source.material as THREE.Material).dispose();
      group.clear();
    }
  }
}
