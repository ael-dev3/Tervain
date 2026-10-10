# The wanderer's hand weights evened (A78, 0.0.13)

## Measured as the game draws it

The hand-stretch figures in A73 and A75 came from three.js's linear blend (`SkinnedMesh.getVertexPosition`), but the
wanderer is drawn with dual-quaternion skinning (`installDualQuaternionSkinning`, A63). Measured with the shader's own
blend (`blendDualQuaternions`), every hand edge of at least 1 mm, grips taken from the authored closed hand
(Boxing_Practice) by the amounts in `HERO_HAND_GRIPS`:

| Worst hand edge (one in a thousand) | Previous body (A45, as shipped) | A75 | A78 |
| --- | ---: | ---: | ---: |
| Sword's grip | 6.88× (3.74×) | 6.36× (3.92×) | 5.63× (3.67×) |
| Fist | 8.75× (4.41×) | 7.00× (4.51×) | 6.72× (4.13×) |
| Bow | 7.99× (4.21×) | 6.65× (4.31×) | 6.38× (3.95×) |
| Relaxed | 2.68× (2.08×) | 3.32× (1.90×) | 2.40× (1.76×) |

Under the linear blend the previous body read 5.1× on the sword's grip and 5.9× in a fist, which is where the "about 5×"
target came from. The game never drew that blend: as drawn, the previous body stretched more than the current one in
every grip. A78 is lower than the previous body on the worst edge and on the one-in-a-thousand edge in every grip.

## What changed

`evenHandWeights` in [`hero/fingerFit.ts`](../../src/presentation/hero/fingerFit.ts) runs once per loaded asset, after
the joints are seated (A75). The body's fingers are fused at the webs, and a vertex on one finger often carried a little
of a neighbouring finger at another knuckle (the ring fingertip some of the middle finger's second joint). In a grip
those joints end up centimetres apart, so a 2% difference in weight between two neighbours opened a 1–2 mm web sliver to
6–7 times its length.

- Each cross-finger weight moves to the neighbour's joint at the vertex's own knuckle, which curls alongside it. Thumbs
  keep theirs.
- The hand's weights are then smoothed three times over the surface, with seams welded by position.

Weights never change the bind pose, so the skin still stands exactly as modelled. The test (`heroAnimation.test.ts`,
"keeps the hands from tearing in a grip") now measures with the dual-quaternion blend: sword's grip under 6× (one in a
thousand under 3.75×), fist under 7× (under 4.3×).

Tried and not kept: smoothing alone (2 passes: sword 5.80×, fist 6.51×, but one in a thousand rose to 4.37×). With
the linear blend: more passes (10 to 20 made the fist worse, 6.5–7.2×, as weight bled between fingers), and moving every
cross-finger weight onto the vertex's own finger (it tore the webs, 40×).

## Checked in the served build

Production builds of main (before) and this branch (after), served locally and drawn headed on an RTX 3080 Ti. Both hands
were framed from four sides at 0.36 m, the right on the sword's grip and the left in a fist, with only the wanderer drawn
(`tools/hero/hands.mjs`). Neither build tears, and at this range the difference between them is slight (the changed
edges are 1–2 mm). The pale, jagged edge under the sword hand's curled fingertips is the same in both: it is the fused
fingertips' own outline, and in play the sword's handle covers it.

## Tools kept

- `tools/hero/hands.mjs`: the hand close-ups above, for any two builds.
- `tools/hero/views.mjs`, `tools/hero/mi3d.mjs`: the reference renders and the Meshy multi-image job behind A74's body.
  They write under `shots/`, which is ignored. `mi3d.mjs create` spends 35 credits.
- `tools/resident-hands.mjs`: close looks at the residents' hands (the quarry hand at work, the reeve standing).

No Meshy credits spent in A78. Totals stay as recorded: trees and fingers 30 of 100, hero 35 of 200.
