import { FOREST_SWALE } from './layout';
import { fbm, smoothstep } from './noise';
import { distToPolyline } from './terrain';

export type ForestFamily = 'pine' | 'oak' | 'fir' | 'birch';
export type ForestFamilyRole = 'dominant' | 'secondary' | 'other';

/** Owner's approximate regional composition target, not a measured universal Gothic 3 ratio.
 * Counts are checked after terrain, clearings and collision rejection; no per-cell quotas. */
export const FOREST_PALETTE = {
  dominant: 'pine', secondary: 'oak', other: ['fir', 'birch'],
  target: { dominant: 0.75, secondary: 0.20, other: 0.05 },
} as const;

/** Broad companion stands within a continuous pine-led woodland, not 48 m species lotteries.
 * Narrower cross-stand axes preserve the regional palette after the imported pine's larger
 * wood footprints reject crowded claims; long axes retain coherent oak reaches. */
export const FOREST_COMPANION_STANDS = [
  { id: 'swale_oaks', x: -194, z: 3, rx: 34, rz: 8, yaw: -0.12 },
  { id: 'eastern_oaks', x: -112, z: 62, rx: 12, rz: 32, yaw: 0.20 },
] as const;

export interface ForestStandSample {
  sp: ForestFamily;
  role: ForestFamilyRole;
  id: string;
  tint: number;
  regrowth: number;
}

/** Family choice is a continuous, correlated spatial field. Moving a cell's random roll cannot
 * turn its tree into an unrelated species. Small-scale noise only roughens the stand boundary. */
export function forestStandAt(x: number, z: number): ForestStandSample {
  const wx = x + 6 * fbm(x / 47, z / 47, 2, 151);
  const wz = z + 7 * fbm(x / 53 + 8, z / 53, 2, 153);
  let d = Infinity, id = 'deepwood_pines';
  for (const stand of FOREST_COMPANION_STANDS) {
    const dx = wx - stand.x, dz = wz - stand.z;
    const u = dx * Math.cos(stand.yaw) + dz * Math.sin(stand.yaw);
    const v = -dx * Math.sin(stand.yaw) + dz * Math.cos(stand.yaw);
    const candidate = Math.hypot(u / stand.rx, v / stand.rz);
    if (candidate < d) { d = candidate; id = stand.id; }
  }
  // Scallop the binary family boundary with 9 m noise coordinates and .07 normalized amplitude.
  const edge = 0.07 * fbm(x / 9, z / 9, 2, 155);
  const secondary = d + edge < 1;
  const accent = fbm(x / 19 + 4, z / 19 - 7, 2, 157) > 0.56;
  const damp = distToPolyline(x, z, FOREST_SWALE.points).d < 16;
  const role: ForestFamilyRole = accent ? 'other' : secondary ? 'secondary' : 'dominant';
  const sp: ForestFamily = role === 'other' ? damp ? 'birch' : 'fir' : secondary ? 'oak' : 'pine';
  const regrowth = smoothstep(-0.25, 0.45, fbm(x / 33 - 3, z / 33 + 9, 2, 159));
  return { sp, role, id: secondary ? id : 'deepwood_pines', tint: 0.975 + fbm(x / 95, z / 95, 2, 161) * 0.022, regrowth };
}

/** Conservative horizontal envelopes at instance scale one, including all three LODs.
 * The original broadleaf bounds and wider authored conifer clearances are retained: delivered
 * source-faithful Solitary Pine geometry fits inside the pine/fir bounds on every seeded height.
 * The integration regression measures the imported binaries rather than procedural conifers. */
export const FOREST_CROWN_ENVELOPE: Record<ForestFamily, number> = {
  oak: 24.2, pine: 10.9, fir: 8.4, birch: 15.2,
};
