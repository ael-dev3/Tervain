import { FOREST_SWALE } from './layout';
import { fbm, smoothstep } from './noise';
import { distToPolyline } from './terrain';
import { biomeAt } from './biomes';

export type ForestFamily = 'pine' | 'oak' | 'fir' | 'birch';
export type ForestFamilyRole = 'dominant' | 'secondary' | 'other';

/** Historical pine-body composition target, retained for the original component study. The
 * owner-authorized 0.0.12 mixed habitats supersede this as a whole-region acceptance quota. */
export const FOREST_PALETTE = {
  dominant: 'pine', secondary: 'oak', other: ['fir', 'birch'],
  target: { dominant: 0.75, secondary: 0.20, other: 0.05 },
} as const;

/** Overlapping grove cores occupy both sides of the swale and a rounded eastern shoulder.
 * These two-dimensional bodies replace the narrow path-like ribbons. A taper is an authoring
 * field in metres, not a tree quota: actual wood, roads and clearing crowns still reject sites. */
export const FOREST_COMPANION_STANDS = [
  {
    id: 'swale_oaks',
    cores: [
      { x: -205, z: -8, rx: 21, rz: 12, yaw: -0.26, margin: 10 },
      { x: -191, z: 1, rx: 14, rz: 12, yaw: 0.32, margin: 10 },
    ],
  },
  {
    id: 'eastern_oaks',
    cores: [
      { x: -115, z: 52, rx: 15, rz: 20, yaw: -0.22, margin: 12 },
      { x: -108, z: 74, rx: 16, rz: 15, yaw: 0.28, margin: 10 },
    ],
  },
] as const;

export interface ForestStandSample {
  sp: ForestFamily;
  role: ForestFamilyRole;
  id: string;
  tint: number;
  regrowth: number;
  /** Smooth companion-grove suitability; not accepted canopy coverage or a density quota. */
  companionCover: number;
}

/** Family choice is a continuous, correlated spatial field. Moving a cell's random roll cannot
 * turn its tree into an unrelated species. Small-scale noise only roughens the stand boundary. */
export function forestStandAt(x: number, z: number): ForestStandSample {
  const biome = biomeAt(x, z);
  const wx = x + 6 * fbm(x / 47, z / 47, 2, 151);
  const wz = z + 7 * fbm(x / 53 + 8, z / 53, 2, 153);
  let companionCover = 0, id = 'deepwood_pines';
  for (const stand of FOREST_COMPANION_STANDS) {
    let cover = 0;
    for (const core of stand.cores) {
      const dx = wx - core.x, dz = wz - core.z;
      const u = dx * Math.cos(core.yaw) + dz * Math.sin(core.yaw);
      const v = -dx * Math.sin(core.yaw) + dz * Math.cos(core.yaw);
      // A lower-bound ellipse distance provides a soft, broad shoulder at diagonal approaches.
      const distance = (Math.hypot(u / core.rx, v / core.rz) - 1) * Math.min(core.rx, core.rz);
      cover = Math.max(cover, 1 - smoothstep(0, core.margin, distance));
    }
    if (cover > companionCover) { companionCover = cover; id = stand.id; }
  }
  // Nearby margins interlock with the pine body as a coherent 14 m field. Individual trees do
  // not roll their species: moving a cell's random acceptance leaves this family field intact.
  const edge = 0.5 + 0.12 * fbm(x / 14, z / 14, 2, 155);
  const secondary = companionCover > edge;
  const accent = fbm(x / 19 + 4, z / 19 - 7, 2, 157) > 0.56;
  const damp = distToPolyline(x, z, FOREST_SWALE.points).d < 16;
  const firRidge = biome.weights['cool-fir-ridge'] > 0.42;
  const warmGrove = biome.weights['ochre-woodland'] > 0.48;
  const humidGrove = biome.weights['humid-broadleaf'] > 0.5;
  const role: ForestFamilyRole = firRidge || accent ? 'other' : secondary || warmGrove || humidGrove ? 'secondary' : 'dominant';
  const sp: ForestFamily = firRidge ? 'fir' : role === 'other' ? damp ? 'birch' : 'fir' : role === 'secondary' ? 'oak' : 'pine';
  if (firRidge) id = 'north_fir_ridge';
  else if (warmGrove && !secondary) id = 'ochre_woodland';
  else if (humidGrove && !secondary) id = 'humid_fringe';
  const regrowth = smoothstep(-0.25, 0.45, fbm(x / 33 - 3, z / 33 + 9, 2, 159));
  return { sp, role, id: firRidge || role === 'secondary' ? id : 'deepwood_pines', tint: 0.975 + fbm(x / 95, z / 95, 2, 161) * 0.022, regrowth, companionCover };
}

/** Conservative horizontal envelopes at instance scale one, including all three LODs.
 * The original broadleaf bounds and wider authored conifer clearances are retained: delivered
 * source-faithful Solitary Pine geometry fits inside the pine/fir bounds on every seeded height.
 * The integration regression measures the imported binaries rather than procedural conifers. */
export const FOREST_CROWN_ENVELOPE: Record<ForestFamily, number> = {
  oak: 24.2, pine: 10.9, fir: 8.4, birch: 15.2,
};
