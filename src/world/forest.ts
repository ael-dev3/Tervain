import { DEEPWOOD } from './layout';
import { shoreDistance } from './coast';
import { smoothstep } from './noise';

/** Shared habitat mask: the arrival woodland fades into dune, clearing and vale without a biome seam. */
export function deepwoodCover(x: number, z: number): number {
  const west = smoothstep(DEEPWOOD.minX, DEEPWOOD.minX + 18, x);
  const east = 1 - smoothstep(DEEPWOOD.maxX - 24, DEEPWOOD.maxX, x);
  const north = smoothstep(DEEPWOOD.minZ, DEEPWOOD.minZ + 25, z);
  const south = 1 - smoothstep(DEEPWOOD.maxZ - 25, DEEPWOOD.maxZ, z);
  const coast = smoothstep(DEEPWOOD.shoreClearance, DEEPWOOD.shoreClearance + 12, shoreDistance(x, z));
  return west * east * north * south * coast;
}
