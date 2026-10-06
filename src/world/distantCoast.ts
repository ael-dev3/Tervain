import { clamp, fbm, lerp, ridged, smoothstep } from './noise';

/** An original uninhabited promontory across the bay, outside the playable vale. No new discovered place or quest. */
export const DISTANT_COAST = { minX: -960, maxX: -380, minZ: -182, maxZ: 182, cellX: 20, cellZ: 2 } as const;

function authoredHeight(x: number, z: number): number {
  const dx = (x + 700) / 198;
  const dz = (z + 97) / 70;
  const radius = Math.hypot(dx, dz) + fbm(x / 52, z / 37, 3, 221) * 0.09;
  if (radius >= 1.2) return -16;
  const apron = 1 - smoothstep(0.96, 1.16, radius);
  const rock = 1 - smoothstep(0.58, 0.94, radius);
  const ridge = 19 + 16 * ridged(x / 79, z / 63, 3, 223) + 5 * fbm(x / 41, z / 31, 2, 225);
  return lerp(-16, 1.1 + rock * ridge, apron);
}

/** Same fixed diagonals as the land mesh; water samples these planes rather than an unrelated silhouette proxy. */
export function distantCoastHeight(x: number, z: number): number {
  const p = DISTANT_COAST;
  if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) return -16;
  const gx = (x - p.minX) / p.cellX, gz = (z - p.minZ) / p.cellZ;
  const i = clamp(Math.floor(gx), 0, (p.maxX - p.minX) / p.cellX - 1);
  const j = clamp(Math.floor(gz), 0, (p.maxZ - p.minZ) / p.cellZ - 1);
  const fx = clamp(gx - i, 0, 1), fz = clamp(gz - j, 0, 1);
  const px = p.minX + i * p.cellX, pz = p.minZ + j * p.cellZ;
  const a = authoredHeight(px, pz), b = authoredHeight(px + p.cellX, pz);
  const c = authoredHeight(px, pz + p.cellZ), d = authoredHeight(px + p.cellX, pz + p.cellZ);
  return fx + fz <= 1 ? a + fx * (b - a) + fz * (c - a) : d + (1 - fx) * (c - d) + (1 - fz) * (b - d);
}
