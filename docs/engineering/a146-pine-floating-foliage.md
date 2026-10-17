# A146: no floating needles on the hero pine

- The canopy audit (`tools/audit-canopy.mjs`) counts a leaf card more than 1.5 m from any wood as detached. Run over the village's 110 hero pines it found 5,058 detached cards in 1,184 clumps, the farthest 5.84 m from wood; the solitary pine it replaced had none.
- Cause: the near model builds its lateral twigs without wood (`lateralSides: 0`), yet each lateral still carried needle pads at its tip, 1 to 2.9 m beyond the limb (the larger pad scale of A144 pushed them further). Nothing connected those pads to the tree.
- Fix: a lateral pad's root stays within 0.5 m of its limb (`tools/tree-gen-pine/lib/build.mjs`). Triangle counts are unchanged; only the near model changes.
- Audit after the fix, same 110 pines: 0 detached cards, 0 clumps, farthest gap 0. Intermediate settings for the record: 1.35 m left 1,076 cards, 0.8 m left 31. Shrinking or capping the pads themselves did not help (5,058 to 2,039 for a 0.67 scale, 4,207 for a size cap): it is the lateral reach that matters, not the pad size.
- Same-camera stills at 10 m and 30 m show the same full conical crown.
