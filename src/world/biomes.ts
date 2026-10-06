import { shoreDistance } from './coast';
import { deepwoodCover } from './forest';
import { FOREST_SWALE, STREAMS, STRAND } from './layout';
import { clamp, fbm, smoothstep } from './noise';

/** Original ecological composition controls inside the connected coastal vale. These are
 * habitats, not new settlements, quest regions or established names in the world's history. */
export const BIOME_IDS = [
  'grey-strand', 'sheltered-palms', 'humid-broadleaf', 'pine-deepwood', 'cool-fir-ridge', 'ochre-woodland',
] as const;
export type BiomeId = typeof BIOME_IDS[number];

export interface BiomeEllipse { x: number; z: number; rx: number; rz: number; yaw: number; feather: number }
export const BIOME_REGIONS = {
  palms: [
    { x: -266, z: -82, rx: 21, rz: 35, yaw: -0.18, feather: 17 },
    { x: -283, z: 124, rx: 21, rz: 25, yaw: 0.2, feather: 16 },
  ],
  humid: [
    { x: -205, z: -8, rx: 21, rz: 12, yaw: -0.26, feather: 10 },
    { x: -191, z: 1, rx: 14, rz: 12, yaw: 0.32, feather: 10 },
  ],
  fir: [{ x: -174, z: -76, rx: 45, rz: 24, yaw: -0.22, feather: 18 }],
  warm: [
    { x: -111, z: 67, rx: 29, rz: 31, yaw: -0.22, feather: 19 },
    { x: -52, z: 20, rx: 26, rz: 23, yaw: 0.1, feather: 16 },
    { x: 109, z: 27, rx: 36, rz: 33, yaw: -0.28, feather: 23 },
  ],
  pine: [{ x: -171, z: 18, rx: 32, rz: 30, yaw: 0.16, feather: 13 }],
} as const satisfies Record<string, readonly BiomeEllipse[]>;

export interface BiomeSample {
  id: BiomeId;
  /** Normalized, overlapping composition weights, not planted crown cover or a stem quota. */
  weights: Record<BiomeId, number>;
  /** 0..1 authoring suitability for a wooded habitat; physical tree guards remain independent. */
  woodland: number;
  /** Soil/plant fertility cues; neither value creates water or a wet surface. */
  moisture: number;
  exposure: number;
  /** Density multipliers used by ground cover, preserving roads, hard obstacles and real shade. */
  grassDensity: number;
  lowGrowth: number;
}

function ellipseCover(x: number, z: number, ellipse: BiomeEllipse): number {
  const dx = x - ellipse.x, dz = z - ellipse.z;
  const u = dx * Math.cos(ellipse.yaw) + dz * Math.sin(ellipse.yaw);
  const v = -dx * Math.sin(ellipse.yaw) + dz * Math.cos(ellipse.yaw);
  const distance = (Math.hypot(u / ellipse.rx, v / ellipse.rz) - 1) * Math.min(ellipse.rx, ellipse.rz);
  return 1 - smoothstep(0, ellipse.feather, distance);
}

function regionCover(x: number, z: number, ellipses: readonly BiomeEllipse[]): number {
  let cover = 0;
  for (const ellipse of ellipses) cover = Math.max(cover, ellipseCover(x, z, ellipse));
  return cover;
}

/** Small allocation-free distance query, avoiding a dependency on Terrain's height authoring. */
function lineDistance(x: number, z: number, points: readonly { x: number; z: number }[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / Math.max(1e-8, dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

/** Shared deterministic region field for supplied-tree selection, soil and understory.
 * Correlated metre-scale feathers produce transitional woodland, rather than random species
 * cells or a hard biome border. Grey Strand's landing remains deliberately sparse. */
export function biomeAt(x: number, z: number): BiomeSample {
  const wx = x + 3.5 * fbm(x / 51 + 2, z / 51 - 5, 2, 191);
  const wz = z + 4 * fbm(x / 57 - 4, z / 57 + 2, 2, 193);
  const shore = shoreDistance(x, z);
  const land = smoothstep(8, 22, shore);
  const deepwood = deepwoodCover(x, z);
  const pineRefuge = regionCover(wx, wz, BIOME_REGIONS.pine);
  const sheltered = regionCover(wx, wz, BIOME_REGIONS.palms)
    * smoothstep(16, 34, shore) * (1 - smoothstep(66, 92, shore))
    * smoothstep(56, 84, Math.hypot(x - STRAND.x, z - STRAND.z));
  const swale = 1 - smoothstep(8, 24, lineDistance(x, z, FOREST_SWALE.points));
  let river = 0;
  for (const stream of STREAMS) river = Math.max(river, 1 - smoothstep(stream.halfWidth + 6, stream.halfWidth + 23, lineDistance(x, z, stream.points)));
  const humid = Math.max(regionCover(wx, wz, BIOME_REGIONS.humid) * deepwood,
    swale * deepwood * 0.74, river * 0.76) * land * (1 - pineRefuge * 0.94);
  const fir = regionCover(wx, wz, BIOME_REGIONS.fir) * deepwood * (1 - pineRefuge);
  const warm = regionCover(wx, wz, BIOME_REGIONS.warm) * land * (1 - pineRefuge) * (1 - river * 0.84);
  const special = Math.max(sheltered, humid, fir, warm);
  const pine = deepwood * (1 - special * 0.94);
  const weights: Record<BiomeId, number> = {
    'grey-strand': Math.max(0.025, 1 - Math.max(deepwood, special)),
    'sheltered-palms': sheltered,
    'humid-broadleaf': humid,
    'pine-deepwood': pine,
    'cool-fir-ridge': fir,
    'ochre-woodland': warm,
  };
  let sum = 0;
  for (const id of BIOME_IDS) sum += weights[id];
  let id: BiomeId = 'grey-strand';
  for (const key of BIOME_IDS) {
    weights[key] /= sum;
    if (weights[key] > weights[id]) id = key;
  }
  const h = weights['humid-broadleaf'], f = weights['cool-fir-ridge'];
  const p = weights['pine-deepwood'], w = weights['ochre-woodland'], s = weights['sheltered-palms'];
  return {
    id, weights,
    woodland: clamp(Math.max(deepwood, humid * 0.8, warm * 0.72, sheltered * 0.34), 0, 1),
    moisture: clamp(h * 0.82 + f * 0.28 + p * 0.16 + s * 0.04, 0, 1),
    exposure: clamp(w * 0.72 + s * 0.88, 0, 1),
    grassDensity: 1 - f * 0.15 - w * 0.14 - s * 0.58,
    lowGrowth: 1 + h * 0.55 + f * 0.12 - w * 0.28 - s * 0.6,
  };
}
