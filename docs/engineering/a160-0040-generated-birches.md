# A160: 0.0.40, generated birches

## The birch slot against Gothic 3

- Gothic 3's broadleaf trees are a few leafy masses on visible limbs, with sky between them. The 28 trees in Tervain's birch slot were three supplied models:
  - tree-1527 (14 trees): a grey trunk under a round, even crown.
  - tree-4815 (7 trees): orange trunks under the same kind of crown.
  - verdant-sentinel (7 trees, assigned by the moist broadleaf habitat): a near-black trunk.
- None read as birches, and every crown was the dense, even clump canopy (A134).

## Change

- **Generator** (tools/tree-gen, `--species birch`; seeds 11, 12 and 13 give hero-birch, hero-birch-b and hero-birch-c).
  - Skeleton (`growBirch`, skeleton.mjs):
    - One slender stem runs nearly to the top.
    - Eleven to fourteen limbs climb it on a golden-angle spiral: the low ones spread wide (about 64 degrees from vertical), the high ones climb steeply.
    - Limbs arch out and a little down at their ends. Boughs and twigs leave them angled down and hang.
    - The crown is a narrow ovoid, drawn to a point at the top.
  - Bark (`generateBirchBark`, bark.mjs): chalk-white papery bark in faint horizontal bands, scattered dark lenticels (short horizontal dashes, 2 to 7 cm), and a few black marks.
  - The dark, fissured foot of a birch varies with height, so the mesher paints it into the wood's vertex colour (addTube's palette), with a ragged edge 1 to 3 m up. The thin wood darkens toward the twigs.
  - Oaks build exactly as before: their files are byte-identical.
- **Images**: the three birches share one set (bark, its normal map at 1024 px, leaves), carried by hero-birch-near, as the oaks do with hero-oak-near (A159).
- **In game** (meshyTrees.ts `HERO_FAMILY`):
  - The generated birches replace the birch family (tree-1527 and tree-4815); verdant-sentinel stays where the habitat assigns it.
  - Spacing, clearing guards, colliders and grounding still read the supplied birch's footprint, as for the oaks, so no tree moves.
  - A generated birch's crown is open: 38% of a crown's cards (`BIRCH_CANOPY_SHARE`), in clumps 65% of the usual size (`BIRCH_CLUMP`). It reads as small sprays with sky between them, and the white limbs show between the clumps.
  - As on the lobed oaks, wood is trimmed only where it stands bare at the crown's shell.
  - `?herobirch=0` keeps the supplied birches.
- **Far level**: the far crown draws the generator's own cards. Their baked crown shade starts at 0.68 (oaks 0.56), so the far crown is about as bright as the middle one it replaces.

## Budget

Per template in game (wood plus leaves), the generated birches against the supplied birches they replace:

| Level | Supplied (tree-1527 / tree-4815) | Generated (hero-birch / -b / -c) |
| --- | ---: | ---: |
| Near | 15,920 / 19,708 | 7,730 / 7,380 / 6,830 |
| Middle | 9,622 / 8,281 | 3,986 / 4,006 / 3,794 |
| Far | 2,238 / 3,400 | 1,200 / 1,166 / 1,202 |

- Download: the nine birch files add 5,767,212 bytes. The supplied birches still load, because their footprints place the trees.
  - The near files' leaf clusters were cut to 900: the game rebuilds the near crown at its own card count, so they only mark where the clumps go.
  - The birch normal map is stored at 1024 px.

## Evidence

- Canopy audit (LOD 0, gap 0.75, reach 1.5 m), all 337 trees: 0 detached clumps, 0 detached cards. The 28 birches have 0 candidates.
- Views of the birches alone and in place (eye level, from under the crown, the trunk's foot):
  - The white trunks with lenticels read as birch from 70 m to arm's length.
  - From below, white limbs lead out to small clumps with sky between them.
  - The trunk's foot darkens to a fifth of its brightness, from 183 to 33 levels at the ground in the same light.
- Middle against far level at 70 m (Low quality switches at 64 to 96 m): crown size within 6%, mean brightness within 2 levels (99.2 against 101.3).

## Self-score against Gothic 3

| | Before | After |
| --- | ---: | ---: |
| Birches (21 of the 28 in the birch slot) | 6 | 7 |
| Hero oaks | 7.5 | 7.5 |
| Other broadleaves (verdant-sentinel, supplied oaks, orchard, shrubs) | 6 | 6 |
| Grass in motion | 7 | 7 |

- The birch crowns are rounded clumps, not yet the long hanging sprays of a silver birch.
- Their leaves are the shared broadleaf atlas, not birch leaves.
- The verdant-sentinel keeps its black trunk.
