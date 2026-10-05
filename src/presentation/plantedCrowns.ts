import type * as THREE from 'three';
import type { Species } from './treeGen';

/** Geometric shade proxy, shared by terrain, grass and the woodland floor.
 * It measures projected planted foliage, not alpha coverage or rendered pixels. */
export interface PlantedCrownField {
  coverAt(x: number, z: number): number;
  broadleafAt(x: number, z: number): number;
}

type Placement = { x: number; z: number; s: number; yaw: number };
type Mask = { minX: number; minZ: number; stepX: number; stepZ: number; cells: Float32Array };
type Crown = Placement & { cos: number; sin: number; mask: Mask; broadleaf: boolean };
const GRID = 24, HASH = 32;
const masks = new WeakMap<THREE.BufferGeometry, Mask>();

function edgeDistance(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const d = dx * dx + dz * dz;
  const t = d > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / d)) : 0;
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

/** Rasterize actual leaf triangles once per shared source geometry. Thin upright cards
 * contribute their projected edges too. Empty crown holes remain empty; one-cell filtering
 * softens the low-resolution proxy without replacing it with a trunk-centred disc. */
function crownMask(geometry: THREE.BufferGeometry): Mask {
  const cached = masks.get(geometry);
  if (cached) return cached;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!, p = geometry.getAttribute('position'), index = geometry.index;
  const stepX = Math.max(0.01, (box.max.x - box.min.x) / (GRID - 4));
  const stepZ = Math.max(0.01, (box.max.z - box.min.z) / (GRID - 4));
  const mask: Mask = { minX: box.min.x - 2 * stepX, minZ: box.min.z - 2 * stepZ, stepX, stepZ, cells: new Float32Array(GRID * GRID) };
  const raw = new Uint8Array(GRID * GRID), pad = Math.hypot(stepX, stepZ) * 0.5;
  const count = index?.count ?? p.count;
  for (let i = 0; i + 2 < count; i += 3) {
    const a = index ? index.getX(i) : i, b = index ? index.getX(i + 1) : i + 1, c = index ? index.getX(i + 2) : i + 2;
    const ax = p.getX(a), az = p.getZ(a), bx = p.getX(b), bz = p.getZ(b), cx = p.getX(c), cz = p.getZ(c);
    const x0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - pad - mask.minX) / stepX));
    const x1 = Math.min(GRID - 1, Math.ceil((Math.max(ax, bx, cx) + pad - mask.minX) / stepX));
    const z0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - pad - mask.minZ) / stepZ));
    const z1 = Math.min(GRID - 1, Math.ceil((Math.max(az, bz, cz) + pad - mask.minZ) / stepZ));
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
      const at = iz * GRID + ix;
      if (raw[at]) continue;
      const x = mask.minX + ix * stepX, z = mask.minZ + iz * stepZ;
      const u = (bx - ax) * (z - az) - (bz - az) * (x - ax);
      const v = (cx - bx) * (z - bz) - (cz - bz) * (x - bx);
      const w = (ax - cx) * (z - cz) - (az - cz) * (x - cx);
      const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      const inside = Math.abs(area) > 1e-10 && ((u >= 0 && v >= 0 && w >= 0) || (u <= 0 && v <= 0 && w <= 0));
      if (inside || Math.min(edgeDistance(x, z, ax, az, bx, bz), edgeDistance(x, z, bx, bz, cx, cz), edgeDistance(x, z, cx, cz, ax, az)) <= pad) raw[at] = 1;
    }
  }
  for (let z = 1; z < GRID - 1; z++) for (let x = 1; x < GRID - 1; x++) {
    let sum = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) sum += raw[(z + dz) * GRID + x + dx]! * (dx === 0 ? 2 : 1) * (dz === 0 ? 2 : 1);
    mask.cells[z * GRID + x] = sum / 16;
  }
  masks.set(geometry, mask);
  return mask;
}

function localCover(mask: Mask, x: number, z: number): number {
  const gx = (x - mask.minX) / mask.stepX, gz = (z - mask.minZ) / mask.stepZ;
  const ix = Math.floor(gx), iz = Math.floor(gz);
  if (ix < 0 || iz < 0 || ix >= GRID - 1 || iz >= GRID - 1) return 0;
  const u = gx - ix, v = gz - iz, at = iz * GRID + ix;
  return ((mask.cells[at]! * (1 - u) + mask.cells[at + 1]! * u) * (1 - v)
    + (mask.cells[at + GRID]! * (1 - u) + mask.cells[at + GRID + 1]! * u) * v) * 0.72;
}

/** Contains only accepted, planted trees, identical across graphics presets. */
export class PlantedCrownIndex implements PlantedCrownField {
  private buckets = new Map<string, Crown[]>();
  add(species: Species, placement: Placement, geometry: THREE.BufferGeometry): void {
    if (!(placement.s > 0) || ![placement.x, placement.z, placement.s, placement.yaw].every(Number.isFinite)) throw new Error('Invalid planted crown transform.');
    const mask = crownMask(geometry), cos = Math.cos(placement.yaw), sin = Math.sin(placement.yaw);
    const crown: Crown = { ...placement, cos, sin, mask, broadleaf: species === 'oak' || species === 'birch' || species === 'orchard' };
    const xs = [mask.minX, mask.minX + (GRID - 1) * mask.stepX], zs = [mask.minZ, mask.minZ + (GRID - 1) * mask.stepZ];
    const corners = xs.flatMap(x => zs.map(z => [placement.x + placement.s * (x * cos + z * sin), placement.z + placement.s * (z * cos - x * sin)]));
    const minX = Math.floor(Math.min(...corners.map(p => p[0]!)) / HASH), maxX = Math.floor(Math.max(...corners.map(p => p[0]!)) / HASH);
    const minZ = Math.floor(Math.min(...corners.map(p => p[1]!)) / HASH), maxZ = Math.floor(Math.max(...corners.map(p => p[1]!)) / HASH);
    for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) {
      const key = `${x}:${z}`, bucket = this.buckets.get(key);
      if (bucket) bucket.push(crown); else this.buckets.set(key, [crown]);
    }
  }
  coverAt(x: number, z: number): number { return this.sample(x, z, false); }
  broadleafAt(x: number, z: number): number { return this.sample(x, z, true); }
  private sample(x: number, z: number, broadleafOnly: boolean): number {
    let transmission = 1;
    for (const crown of this.buckets.get(`${Math.floor(x / HASH)}:${Math.floor(z / HASH)}`) ?? []) {
      if (broadleafOnly && !crown.broadleaf) continue;
      const dx = (x - crown.x) / crown.s, dz = (z - crown.z) / crown.s;
      transmission *= 1 - localCover(crown.mask, dx * crown.cos - dz * crown.sin, dz * crown.cos + dx * crown.sin);
    }
    return 1 - transmission;
  }
}
