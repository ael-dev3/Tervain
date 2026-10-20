import { expect, it } from 'vitest';
import { createMeshyForest } from '../../src/presentation/meshyTrees';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';
import { MAX_TREE_SCALE, woodReachLocal } from '../../src/presentation/canopy';
import { meshyTreeTemplates } from './meshyTreeFixture';

it('leaves no birch card past the audit reach at the largest tree scale, in the near or middle crown', async () => {
  const ids = ['tree-1527', 'verdant-sentinel', 'tree-4815'], forest = createMeshyForest(await meshyTreeTemplates(ids));
  try {
    for (const id of ids) for (const lod of [0, 1]) {
      const { wood, leaf } = forest.variant('birch', 0, id).lods[lod]!;
      const set = detachedClumpSet(leaf!, wood!, woodReachLocal(1.5, MAX_TREE_SCALE), woodReachLocal(0.75, MAX_TREE_SCALE));
      expect(set.far.filter(Boolean).length, `${id} lod ${lod}`).toBe(0);
      // The crown keeps its branch-wind binding through the move.
      for (const name of ['_wind', '_pivot']) if (lod === 0) expect(leaf!.hasAttribute(name), `${id} ${name}`).toBe(true);
    }
  } finally { forest.dispose(); }
}, 600000);
