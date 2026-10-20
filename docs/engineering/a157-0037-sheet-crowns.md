# A157: 0.0.37, birch, fir and palm foliage holds to its wood

- After A156 the canopy audit still found 139 detached clumps (2,384 cards), so the gate without a baseline failed: fir-spire 84, birch 41 (tree-1527 17, verdant-sentinel 14, tree-4815 10), palm 13 (fan 6, lean 5, date 2), shorepine (the fir model) 1.
- Birch crowns are rebuilt from cluster cards like the oaks, and at the largest scale (1.46) their far cards sat only a median 0.15 and at most 0.82 template units past the reach. `seatFarCards` now covers birch; the branch-wind attributes the birch leaves carry are kept.
- The supplied fir and palms are different. The fir's wood stops at about two fifths of its height (trunk top 9.35 of 24 units) with branches only near the ground, so its needle sheets, 5 to 10 units across, stand away from any wood, and the top sheet is 8.6 units above the trunk. Palm fronds rise above their trunks. Moving these parts would wreck the trees, and the audit's samples (the centre point and up to eight vertices) also miss real contact on a few large sheets.
- Change: `anchorFarFoliage` continues a conifer's trunk up its axis with a leader to just under the tip, then grows a twig from the nearest wood toward each part still past the reach at the species' largest planted scale (horizon conifers 2.25, palms 1.2; the ranges now live in treeScale.ts beside the orchard's), ending just inside the reach short of the part. No leaf moves. The twigs follow the wood's original index (`twigIndex`), so colliders ignore them.
- The leaf-island pass in flora.ts runs after the variants are built and can carry a chunk toward one bough, away from the twig that held another of its parts. A second `anchorFarFoliage` pass right after it, at the template's actual largest planted scale, writes any new twigs into the variant's wood in place.
- Cost, near crowns only: fir +222 triangles (a 12-triangle leader and 35 twigs), palm-fan +168, palm-lean +78, palm-date +6. No draw is added; middle and far crowns are unchanged.

| Canopy audit (LOD 0, gap 0.75, reach 1.5 m) | 0.0.36 | 0.0.37 |
| --- | ---: | ---: |
| Fir and shorepine (fir-spire) | 85 / 1,972 | 0 / 0 |
| Birch | 41 / 244 | 0 / 0 |
| Palm | 13 / 168 | 0 / 0 |
| Whole world: detached clumps / cards | 139 / 2,384 | 0 / 0 |
| Canopy gate with no baseline | fails | passes |

- Fixed poses (fir tree:1:57 at scale 2.14, palm tree:palm:13:13 at 1.20): the unpainted trees look the same on 0.0.36 and 0.0.37; the far parts painted on 0.0.36 cover the fir's upper half and most of the palm's crown.
