import { BIOME_IDS, biomeAt, type BiomeId, type BiomeSample } from '../../world/biomes';

/** Muted ink washes match the shared planted habitat field, not a new set of named places.
 * Paths, real water, contours and discovered-place ink remain separate, higher priority marks. */
export const MAP_HABITATS: Readonly<Record<BiomeId, { label: string; color: readonly [number, number, number] }>> = {
  'grey-strand': { label: 'Open ground', color: [215, 190, 142] },
  'sheltered-palms': { label: 'Sheltered palms', color: [218, 190, 124] },
  'humid-broadleaf': { label: 'Damp broadleaf', color: [157, 178, 137] },
  'pine-deepwood': { label: 'Pine deepwood', color: [159, 167, 117] },
  'cool-fir-ridge': { label: 'Fir ridge', color: [165, 177, 156] },
  'ochre-woodland': { label: 'Ochre woods', color: [208, 168, 116] },
};

/** The source habitat weights blend without extra map noise or quantized region boundaries. */
export function mapTerrainColor(x: number, z: number, height: number, biome?: Readonly<BiomeSample>): [number, number, number] {
  // The sea's existing cool grey-green wash is physical elevation, independent of tree choices.
  if (x < -170 && height < 0) {
    const depth = Math.min(1, -height / 10);
    return [128 - depth * 46, 158 - depth * 44, 158 - depth * 30];
  }
  const weights = (biome ?? biomeAt(x, z)).weights;
  let r = 0, g = 0, b = 0;
  for (const id of BIOME_IDS) {
    const color = MAP_HABITATS[id].color, weight = weights[id];
    r += color[0] * weight; g += color[1] * weight; b += color[2] * weight;
  }
  const high = Math.max(0, Math.min(1, height / 30));
  return [r - high * 34, g - high * 39, b - high * 34];
}
