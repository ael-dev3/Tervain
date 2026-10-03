import { DEEPWOOD } from './layout';
import { shoreDistance } from './coast';
import { fbm, smoothstep } from './noise';

/** Light pockets reveal bends and stewardship traces without opening the whole wooded journey. */
export const FOREST_OPENINGS = [
  { id: 'waystone_glimpse', x: -196, z: 13, rx: 12, rz: 8 },
  { id: 'overlook_light', x: -148, z: 31, rx: 14, rz: 10 },
  { id: 'waystation_glimpse', x: -123, z: 20, rx: 10, rz: 8 },
] as const;

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
  // Independent edge offsets change the inner density contour. The original outer envelope
  // retains the sparse strand and keeps terrain/floor/population authoring in one footprint.
  const wx = x + 8 * fbm(z / 38 + 4, x / 80, 2, 113);
  const wz = z + 11 * fbm(x / 43 - 7, z / 90, 2, 117);
  const envelope = smoothstep(DEEPWOOD.minX, DEEPWOOD.minX + 4, x)
    * (1 - smoothstep(DEEPWOOD.maxX - 4, DEEPWOOD.maxX, x))
    * smoothstep(DEEPWOOD.minZ, DEEPWOOD.minZ + 4, z)
    * (1 - smoothstep(DEEPWOOD.maxZ - 4, DEEPWOOD.maxZ, z));
  const west = smoothstep(DEEPWOOD.minX, DEEPWOOD.minX + 18, wx);
  const east = 1 - smoothstep(DEEPWOOD.maxX - 24, DEEPWOOD.maxX, wx);
  const north = smoothstep(DEEPWOOD.minZ, DEEPWOOD.minZ + 25, wz);
  const south = 1 - smoothstep(DEEPWOOD.maxZ - 25, DEEPWOOD.maxZ, wz);
  const coast = smoothstep(DEEPWOOD.shoreClearance, DEEPWOOD.shoreClearance + 12, shoreDistance(x, z));
  return envelope * west * east * north * south * coast;
}
