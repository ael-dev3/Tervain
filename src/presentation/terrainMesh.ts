import * as THREE from 'three';
import { clamp, fbm, ridged, smoothstep } from '../world/noise';
import type { Terrain } from '../world/terrain';
import { PAL } from './kit';
import { groundSplat } from './groundSplat';
import { createTerrainMaterial } from './terrainMaterial';
import type { TerrainTextures } from './terrainTextures';

const c2 = new THREE.Color();

export function buildTerrainMesh(terrain: Terrain, tex: TerrainTextures): THREE.Mesh {
  const w = terrain.nx + 1;
  const h = terrain.nz + 1;
  const pos = new Float32Array(w * h * 3);
  const splatA = new Float32Array(w * h * 4);
  const splatB = new Float32Array(w * h * 4);
  const wet = new Float32Array(w * h);
  const sp = new Float32Array(8);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const x = terrain.vertexX(i);
      const z = terrain.vertexZ(j);
      pos[k * 3] = x;
      pos[k * 3 + 1] = terrain.vertexHeight(i, j);
      pos[k * 3 + 2] = z;
      wet[k] = groundSplat(terrain, x, z, sp);
      for (let q = 0; q < 4; q++) {
        splatA[k * 4 + q] = sp[q]!;
        splatB[k * 4 + q] = sp[4 + q]!;
      }
    }
  }
  const idx = new Uint32Array(terrain.nx * terrain.nz * 6);
  let p = 0;
  for (let j = 0; j < terrain.nz; j++) {
    for (let i = 0; i < terrain.nx; i++) {
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

/**
 * A skirt of distant hills beyond the playable land so the horizon has parallax and no visible edge. On the west the skirt sinks below
 * the sea: the horizon there is open water.
 */
export function buildFarMountains(): THREE.Mesh {
  const rings = 5;
  const segs = 220;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const color = new THREE.Color();
  const cx = -30;
  const cz = -20;
  for (let r = 0; r <= rings; r++) {
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const rad = 380 + r * 170 + 30 * fbm(a * 4 + r, r * 2, 2, 3);
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      // Sharp ridges in three octaves, tall in the middle rings and falling off into the distance.
      const ridge = ridged(cs * 5 + r * 1.7 + 4, sn * 5 - r * 2.3, 4, 17);
      const crest = ridged(a * 30 + r * 5, r * 3, 3, 23);
      const envelope = r === 0 ? 0.35 : r === 1 ? 0.75 : r === 2 ? 1 : r === 3 ? 0.9 : r === 4 ? 0.7 : 0.4;
      let y = envelope * (28 + 240 * ridge + 60 * crest) - (r === 0 ? 22 : 0);
      const west = smoothstep(-0.1, -0.55, cs);
      y = y * (1 - west) + west * -6;
      positions.push(cx + cs * rad * 1.25, y, cz + sn * rad * 0.95);
      const t = clamp(y / 260, 0, 1);
      color.setHex(PAL.forest).lerp(c2.setHex(PAL.rockB), smoothstep(0.12, 0.55, t)).lerp(c2.setHex(0x9a9a98), smoothstep(0.75, 1, t) * 0.3);
      // Banding: darker forested lower slopes, lighter screes, streaks along the ridges.
      const bandK = 0.8 + 0.4 * ridged(a * 45 + r * 9, y * 0.02, 2, 31);
      colors.push(color.r * bandK, color.g * bandK, color.b * bandK);
    }
  }
  const row = segs + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * row + s;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, fog: true, side: THREE.DoubleSide }));
  mesh.matrixAutoUpdate = false;
  return mesh;
}
