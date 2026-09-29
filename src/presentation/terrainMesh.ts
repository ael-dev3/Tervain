import * as THREE from 'three';
import { FIELDS, STREAMS, WORLD } from '../world/layout';
import { clamp, fbm, lerp, smoothstep } from '../world/noise';
import { distToPolyline, roadWeight, type Terrain } from '../world/terrain';
import { PAL } from './kit';

const c1 = new THREE.Color();
const c2 = new THREE.Color();

function waterDistance(x: number, z: number): number {
  let d = Infinity;
  for (const s of STREAMS) d = Math.min(d, distToPolyline(x, z, s.points).d);
  return d;
}

function inField(x: number, z: number) {
  for (const f of FIELDS) {
    const dx = x - f.x;
    const dz = z - f.z;
    const lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw);
    const lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
    if (Math.abs(lx) < f.w / 2 && Math.abs(lz) < f.d / 2) return { f, lx, lz };
  }
  return null;
}

/** Colour of the ground at a point: moisture, slope, altitude, tracks and cultivated rows. */
export function groundColor(terrain: Terrain, x: number, z: number, out: THREE.Color): THREE.Color {
  const h = terrain.heightAt(x, z);
  const slope = terrain.slopeAt(x, z);
  const carve = terrain.carveAt(x, z);
  const n = fbm(x / 22, z / 22, 3, 21) * 0.5 + 0.5;
  const n2 = fbm(x / 6, z / 6, 2, 33) * 0.5 + 0.5;
  const wet = 1 - smoothstep(3, 26, waterDistance(x, z));
  const dry = clamp(1 - wet * 1.2, 0, 1) * smoothstep(0.35, 0.75, n);

  c1.setHex(PAL.grassA).lerp(c2.setHex(PAL.grassB), n2);
  c1.lerp(c2.setHex(PAL.moss), wet * 0.55);
  c1.lerp(c2.setHex(PAL.grassGold), dry * 0.55);

  // Forest floor darkens on hills with a soft noise mask.
  const forest = smoothstep(0.55, 0.85, fbm(x / 35 + 40, z / 35 - 12, 3, 44) * 0.5 + 0.5) * smoothstep(3, 8, h);
  c1.lerp(c2.setHex(PAL.forest), forest * 0.6);

  // Cultivated rows.
  const field = inField(x, z);
  if (field) {
    const stripe = 0.5 + 0.5 * Math.sin(field.lz * 2.6);
    const base = field.f.crop === 'grain' ? PAL.grassGold : field.f.crop === 'greens' ? PAL.leafB : PAL.dirt;
    c2.setHex(base).lerp(c1.clone().setHex(PAL.mud), stripe * 0.35);
    c1.lerp(c2, 0.85);
  }

  // Rock on steep faces and high ground.
  const rock = smoothstep(0.5, 0.85, slope) + smoothstep(22, 46, h) * 0.8;
  c2.setHex(PAL.rockA).lerp(c1.clone().setHex(PAL.rockB), n2);
  if (h > 40) c2.lerp(c1.clone().setHex(PAL.rockHigh), smoothstep(40, 70, h));
  c1.lerp(c2, clamp(rock, 0, 1));

  // Tracks and roads.
  const road = roadWeight(x, z);
  if (road > 0) {
    c2.setHex(PAL.dirt).lerp(c1.clone().setHex(PAL.grassGold), n2 * 0.35);
    c1.lerp(c2, road * 0.92);
  }

  // Channel beds: mud that shows whether or not water runs over it.
  if (carve > 0.03) {
    c2.setHex(PAL.mud).lerp(c1.clone().setHex(PAL.mudDry), n2 * 0.5);
    c1.lerp(c2, clamp(carve * 1.8, 0, 1));
  }
  return out.copy(c1);
}

export function buildTerrainMesh(terrain: Terrain): THREE.Mesh {
  const w = terrain.nx + 1;
  const h = terrain.nz + 1;
  const pos = new Float32Array(w * h * 3);
  const col = new Float32Array(w * h * 3);
  const color = new THREE.Color();
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      const x = terrain.vertexX(i);
      const z = terrain.vertexZ(j);
      pos[k * 3] = x;
      pos[k * 3 + 1] = terrain.vertexHeight(i, j);
      pos[k * 3 + 2] = z;
      groundColor(terrain, x, z, color);
      // Subtle vertex-level variation keeps the flat-shaded facets readable.
      const v = (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1;
      const jit = (v - Math.floor(v) - 0.5) * 0.05;
      col[k * 3] = clamp(color.r + jit, 0, 1);
      col[k * 3 + 1] = clamp(color.g + jit, 0, 1);
      col[k * 3 + 2] = clamp(color.b + jit, 0, 1);
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
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  return mesh;
}

/** A skirt of distant peaks beyond the playable world so the horizon has parallax and no visible edge. */
export function buildFarMountains(): THREE.Mesh {
  const rings = 3;
  const segs = 72;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const color = new THREE.Color();
  const cx = 0;
  const cz = -20;
  for (let r = 0; r <= rings; r++) {
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const rad = 380 + r * 260;
      const noise = fbm(Math.cos(a) * 3 + r, Math.sin(a) * 3 - r, 4, 91) * 0.5 + 0.5;
      const peak = (r === 0 ? 40 : r === 1 ? 150 : r === 2 ? 210 : 140) + noise * (r === 0 ? 60 : 140);
      const jag = fbm(a * 20 + r * 7, r * 3, 3, 12) * 30;
      const y = r === rings ? peak * 0.5 : peak + jag;
      positions.push(cx + Math.cos(a) * rad * 1.15, y - (r === 0 ? 12 : 0), cz + Math.sin(a) * rad * 0.9);
      const t = clamp(y / 260, 0, 1);
      color.setHex(PAL.forest).lerp(c2.setHex(PAL.rockA), smoothstep(0.15, 0.6, t)).lerp(c2.setHex(0xe0e2e4), smoothstep(0.8, 1, t) * 0.35);
      colors.push(color.r, color.g, color.b);
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
  void lerp;
  void WORLD;
  return mesh;
}
