import { loadBakedTextures } from './bakedTextures';
import type { Quality } from './context';
import { loadFurniture } from './furniture';
import { loadMeshyTrees } from './meshyTrees';
import { loadSolitaryPine } from './solitaryPine';
import { loadSourceRockPile } from './sourceRockPile';
import { prefetchTerrainTextureData, TERRAIN_TEXTURE_SIZE } from './terrainTextures';

/**
 * Start everything the first world needs as soon as a journey begins (A68). Called after the wanderer and the residents
 * have asked for their models, so those keep the first of the shared load slots; the world's models and surfaces queue
 * behind them, and a worker makes the ground's pixels meanwhile. The network then never waits while the residents are
 * prepared, and the ground is ready when the build reaches it. Each loader keeps its request, so the world build takes
 * these up where they are; a failure here is reported by the world build, which asks again. The animals are not
 * prefetched: they arrive after the world opens (A70).
 */
export function prefetchJourney(quality: Quality) {
  const quiet = (request: Promise<unknown>) => { void request.catch(() => {}); };
  prefetchTerrainTextureData(TERRAIN_TEXTURE_SIZE[quality]);
  quiet(loadMeshyTrees());
  quiet(loadSolitaryPine());
  quiet(loadSourceRockPile());
  quiet(loadFurniture());
  quiet(loadBakedTextures(quality));
}
