import { expect, it } from 'vitest';
import { createMeshyForest } from '../../src/presentation/meshyTrees';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';
import { woodReachLocal } from '../../src/presentation/canopy';
import { CONIFER_MAX_SCALE, PALM_MAX_SCALE } from '../../src/presentation/treeScale';
import { meshyTreeTemplates } from './meshyTreeFixture';

it('leaves no fir or palm sheet past the audit reach at its largest planted scale, near crown', async () => {
  const forest = createMeshyForest(await meshyTreeTemplates(['fir-spire', 'palm-fan', 'palm-lean', 'palm-date']));
  try {
    for (const [species, id, scale] of [['fir', 'fir-spire', CONIFER_MAX_SCALE], ['shorepine', 'fir-spire', CONIFER_MAX_SCALE], ['palm', 'palm-fan', PALM_MAX_SCALE], ['palm', 'palm-lean', PALM_MAX_SCALE], ['palm', 'palm-date', PALM_MAX_SCALE]] as const) {
      const { wood, leaf } = forest.variant(species, 0, id).lods[0]!;
      const set = detachedClumpSet(leaf!, wood!, woodReachLocal(1.5, scale), woodReachLocal(0.75, scale));
      expect(set.far.filter(Boolean).length, `${species}/${id}`).toBe(0);
      expect(wood!.userData.anchoredTwigs, `${species}/${id}`).toBeGreaterThan(0);
      expect(wood!.userData.twigIndex, `${species}/${id}`).toBeLessThan(wood!.index!.count);
    }
  } finally { forest.dispose(); }
}, 600000);
