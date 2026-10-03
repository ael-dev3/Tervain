import { DEEPWOOD } from './layout';
import { shoreDistance } from './coast';
import { fbm, smoothstep } from './noise';

const FOREST_LOBES = [
  { x: -174, z: -40, rx: 62, rz: 57 }, { x: -164, z: 60, rx: 63, rz: 50 },
  { x: -148, z: 5, rx: 70, rz: 80 }, { x: -218, z: 8, rx: 20, rz: 42 },
] as const;

/** Light pockets reveal bends and stewardship traces without opening the whole wooded journey. */
export const FOREST_OPENINGS = [
  { id: 'waystone_glimpse', x: -196, z: 13, rx: 12, rz: 8 },
  { id: 'overlook_light', x: -148, z: 31, rx: 14, rz: 10 },
  { id: 'waystation_glimpse', x: -123, z: 20, rx: 10, rz: 8 },
] as const;

/** Broad open cores away from the main walking strip; their shoulders have irregular regrowth.
 * These are new original composition controls, not copied Gothic 3 coordinates. */
export const FOREST_CLEARINGS = [
  { id: 'north_hogback_glade', x: -180, z: -58, rx: 16, rz: 11, yaw: -0.28 },
  { id: 'south_hogback_glade', x: -181, z: 80, rx: 19, rz: 13, yaw: 0.32 },
] as const;

/** Lower bound on distance outside a rotated ellipse, negative inside. Multiplying normalized
 * distance by its smaller radius is conservative, including diagonal crown approaches. */
export function forestClearingDistance(x: number, z: number): number {
  let distance = Infinity;
  for (const clearing of FOREST_CLEARINGS) {
    const dx = x - clearing.x, dz = z - clearing.z;
    const u = dx * Math.cos(clearing.yaw) + dz * Math.sin(clearing.yaw);
    const v = -dx * Math.sin(clearing.yaw) + dz * Math.cos(clearing.yaw);
    distance = Math.min(distance, (Math.hypot(u / clearing.rx, v / clearing.rz) - 1) * Math.min(clearing.rx, clearing.rz));
  }
  return distance;
}

/** No trees in a clearing core; the outer density transition is softly scalloped over 12-22 m. */
export function forestClearingCover(x: number, z: number): number {
  const d = forestClearingDistance(x, z);
  return smoothstep(0, 17 + 5 * fbm(x / 16, z / 16, 2, 163), d);
}

export function forestOpeningCover(x: number, z: number): number {
  let cover = 1;
  for (const opening of FOREST_OPENINGS) {
    const rough = 1 + 0.15 * fbm(x / 12 + 3, z / 12 - 5, 2, 121);
    const d = Math.hypot((x - opening.x) / opening.rx, (z - opening.z) / opening.rz) * rough;
    cover = Math.min(cover, 0.16 + 0.84 * smoothstep(0.25, 1.15, d));
  }
  return cover;
}

/** Shared habitat mask: the arrival woodland fades into dune, clearing and vale without a biome seam. */
export function deepwoodCover(x: number, z: number): number {
  // Overlapping organic landform-sized lobes replace the filled rectangular interior. The old
  // maximum envelope remains a safety boundary, rather than the visible forest outline.
  const rough = 0.07 * fbm(x / 37 + 4, z / 37 - 7, 2, 113);
  let edge = Infinity;
  for (const lobe of FOREST_LOBES) edge = Math.min(edge, Math.hypot((x - lobe.x) / lobe.rx, (z - lobe.z) / lobe.rz));
  const envelope = smoothstep(DEEPWOOD.minX, DEEPWOOD.minX + 24, x)
    * (1 - smoothstep(DEEPWOOD.maxX - 24, DEEPWOOD.maxX, x))
    * smoothstep(DEEPWOOD.minZ, DEEPWOOD.minZ + 24, z)
    * (1 - smoothstep(DEEPWOOD.maxZ - 24, DEEPWOOD.maxZ, z));
  const outline = 1 - smoothstep(0.77, 1.06, edge + rough);
  const coast = smoothstep(DEEPWOOD.shoreClearance, DEEPWOOD.shoreClearance + 12, shoreDistance(x, z));
  return envelope * outline * coast;
}
