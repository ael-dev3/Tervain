import { expect, it } from 'vitest';
import { createMeshyForest } from '../../src/presentation/meshyTrees';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';
import { woodReachLocal } from '../../src/presentation/canopy';
import { CONIFER_MAX_SCALE, PALM_MAX_SCALE } from '../../src/presentation/treeScale';
import { meshyTreeTemplates } from './meshyTreeFixture';

it('leaves no fir or palm sheet past the audit reach at its largest planted scale, at every level', async () => {
  const forest = createMeshyForest(await meshyTreeTemplates(['fir-spire', 'palm-fan', 'palm-lean', 'palm-date']));
  try {
    for (const [species, id, scale] of [['fir', 'fir-spire', CONIFER_MAX_SCALE], ['shorepine', 'fir-spire', CONIFER_MAX_SCALE], ['palm', 'palm-fan', PALM_MAX_SCALE], ['palm', 'palm-lean', PALM_MAX_SCALE], ['palm', 'palm-date', PALM_MAX_SCALE]] as const) {
      // A167: the middle and far levels too. Low draws the fir's middle level from the player's feet, and its wood
      // stopped at 20 m under needles that reach 52 m.
      for (const lod of [0, 1, 2] as const) {
        const { wood, leaf } = forest.variant(species, 0, id).lods[lod]!;
        const set = detachedClumpSet(leaf!, wood!, woodReachLocal(1.5, scale), woodReachLocal(0.75, scale));
        expect(set.far.filter(Boolean).length, `${species}/${id} lod ${lod}`).toBe(0);
        expect(wood!.userData.twigIndex, `${species}/${id} lod ${lod}`).toBeLessThan(wood!.index!.count);
      }
      expect(forest.variant(species, 0, id).lods[0]!.wood!.userData.anchoredTwigs, `${species}/${id}`).toBeGreaterThan(0);
    }
  } finally { forest.dispose(); }
}, 600000);

it('draws the date palm’s middle wood at its far level, whose own trunk is decimated into holes (A169)', async () => {
  const forest = createMeshyForest(await meshyTreeTemplates(['palm-date']));
  try {
    const [, mid, far] = forest.variant('palm', 0, 'palm-date').lods;
    // The far level carries the middle trunk and limbs first, then its own twigs out to its fronds.
    const head = (twigIndex: number | undefined, wood: typeof mid.wood) => Array.from(wood!.index!.array).slice(0, twigIndex);
    const midHead = head(mid.wood!.userData.twigIndex as number, mid.wood);
    expect(far.wood!.userData.twigIndex).toBe(mid.wood!.userData.twigIndex);
    expect(head(far.wood!.userData.twigIndex as number, far.wood)).toEqual(midHead);
    const position = (wood: typeof mid.wood, i: number) => [0, 1, 2].map(axis => wood!.getAttribute('position').array[i * 3 + axis]);
    for (let i = 0; i < 64; i++) expect(position(far.wood, midHead[i]!)).toEqual(position(mid.wood, midHead[i]!));
  } finally { forest.dispose(); }
}, 120000);
