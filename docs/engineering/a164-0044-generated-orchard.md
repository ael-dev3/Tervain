# A164: 0.0.44, generated orchard trees

## The orchard against Gothic 3

- The orchard beside the starting village has 9 trees, two supplied models scaled to 7 m: tree-4949 (5) and tree-4815 (4).
- Both were dense, even balls of leaves on a short trunk: topiary, not fruit trees. From under the crown they were a solid wall of leaves.
- A Gothic 3 fruit tree is a short, crooked trunk that forks low into a few scaffold limbs, under an open, rounded crown of leafy masses with sky between them.

## Change

- **Generator** (tools/tree-gen, `--species apple` and `--species pear`; `growFruit`, skeleton.mjs):
  - A short trunk, leaning a little, forks into four to six crooked scaffold limbs (elbows at random steps, as old fruit trees grow).
  - The apple (seed 43) has an open vase: its limbs part at 1.3 to 1.8 m and spread at 44 to 62 degrees.
  - The pear (seed 55) keeps a leader and grows narrow and upright: its limbs climb it at 26 to 40 degrees.
  - Boughs grow along the outer limb, plus one that carries each limb on past its end. Short twigs, the fruit tree's spurs, grow along each bough.
  - Bark: greyer and darker than an oak's, a little mossy.
  - Cards: half the oak's size, the same at every level, so no level reaches past the near crown's outline.
  - Both stay within the supplied tree's footprint. The apple reaches 4.93 m from its trunk at 7 m tall (tree-4949: 5.35 m); the pear reaches 2.88 m (tree-4815: 3.07 m).
  - Oaks, birches and bushes build exactly as before: their files are byte-identical.
- **Images**: the orchard trees carry none and borrow the oak's (matched by role, as the bushes do, A163).
- **In game** (meshyTrees.ts):
  - The apple stands where the orchard family places tree-4949 (two slots of three), the pear in tree-4815's slot (`HERO_FAMILY`, `heroFamilyId`). They draw as many templates as the supplied trees.
  - The game rebuilds the near and middle crowns from clumps of leaf cards (A134). For these trees, under half an oak's height, the clumps and cards are scaled to 0.65 of the oak's (`ORCHARD_CANOPY_SCALE`).
  - The clumps gather into lobes (`ORCHARD_LOBES`): five to seven, larger for the crown's width and rounder than the oak's lobes (A159).
  - A clump more than 2.5 clump radii from any wood is dropped, where the oak's crown grows a twig out to it (`anchorDrop`, canopy.ts; the default is unchanged).
  - `?heroorchard=0` keeps the supplied orchard trees.

## What was measured and not taken

| Candidate | Why not |
| --- | --- |
| The oak's canopy scale (clumps 0.95 m, cards 0.6 to 1.2 m), with or without the oak's lobes | Still dense balls: at 7 m tall the crown is a few clumps across. |
| The oak's lobes at the orchard scale | The pear's narrow crown became a column of small puffs: lobe size follows the crown's width. |
| Twigs out to far clumps (the oak's default, up to 7 clump radii) | A long, straight bare twig ran out to a lone lobe against the sky. |
| Limbs ending at the crown's edge | Seen from under the open crown, a thick limb stopped like a sawn stub. |
| The first seeds (apple 41, pear 51) once their limbs carried on | The apple reached 8.1 m across, past the supplied tree's footprint. |

- Also measured, for the grass: damping each blade's flutter where it is under two pixels wide changed flicker by less than 0.1%. Turning flutter off entirely cut it by only 1.6% to 3.0%. Grass shimmer comes from the camera moving over thin blades, not from the wind.

## Budget

Per template in game (wood plus leaves):

| Level | Supplied (tree-4949 / tree-4815) | Generated (hero-apple / hero-pear) |
| --- | ---: | ---: |
| Near | 18,970 / 19,020 | 13,134 / 13,054 |
| Middle | 8,339 / 8,281 | 4,452 / 4,348 |
| Far | 2,404 / 3,400 | 1,628 / 1,598 |

- Averaged over the 9 trees as placed: near 18,992 → 13,098 (−31%), middle 8,313 → 4,406 (−47%), far 2,847 → 1,615 (−43%).
- Every draw at the budget gate's pose, listed one by one: 241 on live and 241 on the candidate.
- Download: the six orchard files add 2,538,860 bytes. They carry no images. The supplied orchard trees still load, because their footprints place the trees.

## Evidence

Two real-play walks through the orchard (12 s, fixed 1/60 s steps, wind running), against live 0.0.43:

| Flicker spikes | Along the rows at 11:00 | Past the pears at 15:00 |
| --- | ---: | ---: |
| 40+ levels, upper 45% of the frame | −51.2% | −48.0% |
| 40+ levels, whole frame | −45.2% | −55.0% |
| 60+ levels, whole frame | −54.6% | −66.3% |

- A spike is a pixel that jumps and comes back within a frame.
- The supplied crowns filled much of each frame with fine, high-contrast leaf texture. The generated crowns are smaller masses with sky, limbs and grass between them.
- Canopy audit (LOD 0, gap 0.75, reach 1.5 m), all 337 trees: 0 detached clumps, 0 detached cards. The 9 orchard trees have 0 candidates.
- In the tests, both near crowns stay within the audit reach at the largest orchard scale.

## Self-score against Gothic 3

| | Before | After |
| --- | ---: | ---: |
| Orchard trees (scored on their own from now on) | 4.5 | 7 |

- They read as fruit trees: a crooked trunk forking low, a few rounded leafy masses, and limbs and sky seen from under the crown.
- What remains: no blossom or fruit, and the leaves are the oak's. The crowns are a little uniform in colour.
