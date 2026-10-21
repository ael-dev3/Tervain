# A167: 0.0.47, crowns held by their wood at the middle and far levels too

## Before

- The canopy audit (world-metre reach 1.5 m, gap 0.75 m) found no detached clump at the near level. At the middle and far levels it flagged many: middle 2,091 cards in 166 clumps, far 18,090 cards in 487 clumps (0.0.45).
- High draws every tree at its near level, so these were seen on the Medium and Low presets and in the sun's shadows of distant trees. Low draws a tree's middle level from the player's feet.
- Two sources:
  - **Firs and palms:** their support pass (A157, 0.0.37: a leader up the fir's axis and twigs out to the sheets and fronds past the reach) and its repeat after the leaf-island repair ran at the near level only. The fir-spire's middle and far wood stops at 20 m under needles that reach 52 m (found by Sol on the live build).
  - **Broadleaf far crowns:** the far level keeps the source's cards over wood with only trunk and limbs, so the cards at the boughs' ends hung past the reach.

## Change

- **Firs and palms** (meshyTrees.ts, flora.ts): both support passes now run at every level.
- **Broadleaf far crowns** (meshyTrees.ts): cards past the reach move just inside it, toward their wood (`seatFarCards`, as the near and middle crowns' outer cards do since 0.0.36). No card is removed, no triangle added. The orchard's middle crown is seated too; its near crown was already culled to the reach.

## Evidence

- Canopy audit (world-metre reach 1.5 m, gap 0.75 m), all 337 trees:

| Level | 0.0.45 cards / clumps | 0.0.47 cards / clumps | What remains |
| --- | ---: | ---: | --- |
| Near | 0 / 0 | 0 / 0 | |
| Middle | 2,091 / 166 | 28 / 28 | the solitary pine (28) |
| Far | 18,090 / 487 | 5,135 / 143 | the solitary pine (5,081), generated oaks (54) |

- The solitary pine (labelled "procedural" in the audit) is the approved custom pine, whose three files are pinned by hash. Its far model's baked needle planes stand off its trunk by design; it is not changed here.
- In the tests, every fir and palm level and every generated broadleaf far crown (oaks, birch, sentinel) keeps no card past the reach at its largest planted scale.
- Triangles per template in game, middle / far: fir-spire 8,099 / 2,599 → 8,351 / 2,857; shorepine 8,099 / 2,599 → 8,141 / 2,659; the three palms +12 to +162 middle, +72 to +468 far. Near levels and every broadleaf are unchanged.
- Every draw at the budget gate's pose: 240 on both. The firs' middle and far shadow wood adds 3,177 triangles. Seating the far oak cards tightened the oaks' bounds, and one hero-oak-c that stood off screen inside the culling guard is no longer drawn (−27,916). Net −24,739.
- High draws the near level, so its views barely change. Two real-play walks with the wind running, against 0.0.46: pine wood −0.5%, −0.1% and −0.3%; oaks ±0.0%.
- On Low, Sol's fir camera ((97.9, 12.4, 122.7) toward (89.9, 27.6, 87.6)): the fir's leader shows as a thin dark line through gaps in its needles, where its upper crown had no wood. From the sea at Low, the seated far crowns look the same as before.
