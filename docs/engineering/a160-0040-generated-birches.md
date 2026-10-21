# A160: 0.0.40, generated birches

## The birch slot against Gothic 3

- Gothic 3's broadleaf trees are a few leafy masses on visible limbs, with sky between them. The 28 trees in Tervain's birch slot were three supplied models:
  - tree-1527 (14 trees): a grey trunk under a round, even crown.
  - tree-4815 (7 trees): orange trunks under the same kind of crown.
  - verdant-sentinel (7 trees, assigned by the moist broadleaf habitat): a near-black trunk.
- None read as birches.

## Change

- **Generator** (tools/tree-gen, `--species birch`; seeds 11, 12 and 13 give hero-birch, hero-birch-b and hero-birch-c).
  - Skeleton (`growBirch`, skeleton.mjs):
    - One slender stem runs nearly to the top.
    - Eleven to fourteen limbs climb it on a golden-angle spiral: the low ones spread wide (about 64 degrees from vertical), the high ones climb steeply.
    - Limbs arch out and a little down at their ends. Boughs and twigs leave them angled down and hang.
    - The crown is a narrow ovoid, drawn to a point at the top.
  - Bark (`generateBirchBark`, bark.mjs): pale papery bark in faint horizontal bands, scattered mid-grey lenticels (short horizontal dashes, 2 to 7 cm) and a few darker marks.
  - The mesher paints the rest into the wood's vertex colour (addTube's palette), because it varies with height:
    - The bark is a light grey (76% of white).
    - A dark foot runs with a ragged edge 1 to 3 m up.
    - The stem darkens from the crown's base up, where it stands in the leaves' shade.
    - Limbs are greyer than the stem, and twigs darker still.
  - Oaks build exactly as before: their files are byte-identical.
- **Images**: the three birches share one set (bark, its normal map at 1024 px, leaves), carried by hero-birch-near, as the oaks do with hero-oak-near (A159).
- **In game** (meshyTrees.ts `HERO_FAMILY`):
  - The generated birches replace the birch family (tree-1527 and tree-4815); verdant-sentinel stays where the habitat assigns it.
  - Spacing, clearing guards, colliders and grounding still read the supplied birch's footprint, as for the oaks, so no tree moves.
  - The crown is the broadleaf clump canopy (A134) at its usual density. Wood is trimmed only where it stands bare at the crown's shell, as on the oaks.
  - `?herobirch=0` keeps the supplied birches.
- **Far level**: the far crown draws the generator's own cards. Their baked crown shade starts at 0.68 (oaks 0.56), so the far crown matches the middle one it replaces.

## What was measured and not taken

Flicker was measured on two real-play walks into birch groves (12 s, fixed 1/60 s steps, the same paths on live 0.0.39 and each candidate). A spike is a pixel that jumps 40 or more levels from one frame and comes back by as much in the next: the up-and-down of aliasing, which an edge moving steadily across a pixel does not produce. The figures are spikes in the upper 45% of the frame (the crowns), against live, on the first walk.

| Candidate | Spikes |
| --- | ---: |
| Open crown: 38% of the cards in clumps at 65% size, white bark | +56% |
| Open crown with more cards or larger clumps (45% to 55% of the cards, clumps at 72% to 120%) | +23% to +41% |
| The usual density, white bark | +15% |
| … with the stem and limbs darker inside the crown | +5% |
| … and the crown lobed, as on the oaks | +8% |
| … not lobed, light-grey bark and softer lenticels (shipped) | +0.2% |
| The usual density, dark bark (a diagnostic, not a birch) | −9% |

- **Not taken:** the open crown, small sprays with sky between them, reads most like a silver birch, but its many leaf edges against the sky flickered. It needs a crown that holds its edges still.
- **Not taken:** chalk-white bark. Leaves swaying across it flickered more than over grey bark, and so did its charcoal lenticels at a distance.
- **What remains:** with dark bark the generated crowns flicker 9% less than the supplied birches'. Light bark brings the spikes back to:

| Measure | First walk | Second walk |
| --- | ---: | ---: |
| Crown band | +0.2% | +2.1% |
| Whole frame | +0.8% | +0.8% |
| Crown band, jumps of 60+ levels | +33% | +7% |

- The 60+ jumps are other trees' foliage swaying across the light trunks, most where pine boughs cross one: the new contrast of pale bark.

## Budget

Per template in game (wood plus leaves), against the supplied birches the family replaces:

| Level | Supplied (tree-1527 / tree-4815) | Generated (hero-birch / -b / -c) |
| --- | ---: | ---: |
| Near | 15,920 / 19,708 | 15,164 / 14,820 / 14,264 |
| Middle | 9,622 / 8,281 | 8,340 / 8,586 / 8,436 |
| Far | 2,238 / 3,400 | 1,200 / 1,166 / 1,202 |

- The family places tree-1527 twice for each tree-4815, and each generated template once in three. Averaged over the family, near falls from 17,183 to 14,749, middle from 9,175 to 8,454, and far from 2,625 to 1,189.
- Download: the nine birch files add 5,767,212 bytes. The supplied birches still load, because their footprints place the trees.
  - The near files' leaf clusters are cut to 900: the game rebuilds the near crown at its own card count, so they only mark where the clumps go.
  - The birch normal map is stored at 1024 px.

## Evidence

- Canopy audit (LOD 0, gap 0.75, reach 1.5 m), all 337 trees: 0 detached clumps, 0 detached cards. The 28 birches have 0 candidates.
- Middle against far birch at 70 m (Low quality switches between them at 64 to 96 m): crown size within 2%, mean brightness 98.9 against 98.5.

## Self-score against Gothic 3

| | Before | After |
| --- | ---: | ---: |
| Birches (21 of the 28 in the birch slot) | 6 | 6.5 |
| Hero oaks | 7.5 | 7.5 |
| Other broadleaves (verdant-sentinel, supplied oaks, orchard, shrubs) | 6 | 6 |
| Grass in motion | 7 | 7 |

- The birches now have pale trunks with lenticels and a dark foot, but their crowns are the even clump canopy, round and dense, not the open hanging crown of a silver birch.
- The verdant-sentinel keeps its black trunk.
