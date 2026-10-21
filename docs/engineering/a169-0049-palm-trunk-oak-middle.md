# A169: 0.0.49, the date palm's far trunk and a supplied oak's middle crown

## Before

- After A168, one template at a time against the sky (every other object hidden, every tree forced to each level), the supplied trees still had the largest steps between levels:
  - **Date palm (8 on the beach):** its far file's trunk is decimated into holes, so from the far level (Low from 64 to 96 m, Medium from 480 m, and the sun's shadows beyond 68 m) the trunk drew shredded. Far against middle: area −19%, luma −8.6; the change between them on screen 47.0, against 2.3 from near to middle.
  - **Tree-1505 (6 supplied oaks):** its middle crown has a third of its near crown's cards (3,398 triangles against 10,534), and it read 28% smaller and 5.7 levels darker than the near one; near-to-middle change 47.4. Medium crossfades the two at 120 to 180 m, and Low draws the middle level from the player's feet.

## Change

- **Date palm** (meshyTrees.ts, `FAR_WOOD_FROM_MIDDLE`): its far level draws its middle file's wood, which shares the same images. Its fronds stay the far file's, and the support twigs (A157, A167) still reach them.
- **Supplied oaks** (meshyTrees.ts, `SUPPLIED_OAK_MID_SCALE`): the middle crown's clumps and cards are 1.25 times larger, with the same number of cards. Larger scales gained little more: 1.4 left the near-to-middle change at 41.7 and 1.6 at 39.5, while the middle-to-far change grew to 30.4. Placing the middle clumps from the near file's leaves did no better (41.7, and 32.4 to far).

## Evidence

- One template against the sky, 0.0.48 → 0.0.49:

| Tree | Level | Area, against near | Luma, against near | Change on screen |
| --- | --- | ---: | ---: | ---: |
| Date palm | far | −19.5% → −10.6% | −8.8 → −7.6 | middle to far 47.0 → 33.7 |
| Tree-1505 | middle | −27.9% → −24.0% | −5.7 → −4.3 | near to middle 47.4 → 42.8; middle to far 27.1 → 25.5 |

- Triangles per template and level, in game: the date palm's far wood 980 → 1,886 (the middle wood's 1,460 and its twigs), at most +7,248 on Low with all eight date palms past the band; tree-1505's middle wood −30 (less wood trimmed under the larger clumps). Everything else is unchanged.
- Every tree's union bounds are unchanged or smaller.
- Canopy audit (world-metre reach 1.5 m, gap 0.75 m, 337 trees), detached cards / clumps: middle 28 / 28 and far 5,081 / 116, both unchanged.
- The date palm's fronds remain the far file's own: ragged at their tips, and lighter than the middle crown.

## Correction to A167 and A168

- The detached cards left after A167, far 5,081 in 116 clumps and middle 28, are the generated hero pine's, which the game draws by default (the approved solitary pine is its fallback). Its far level keeps one tip pad per limb and no limb wood (tools/tree-gen-pine, `LODS.far`), so its pads stand off the trunk.
- Against its middle crown the far crown also reads 19% smaller and 7.5 levels darker; middle-to-far change 73.8, the largest of any tree.
- Measured, not taken: a far level with the middle level's pads on two-segment limbs and traced shading brings the change to 41.1 and the far area to −2% of the middle's. It costs about 1,280 more triangles per far pine, about +71,000 (3%) on Low in the pine wood, and the audit still counts 4,875 of its far cards as standing off, against 5,081 now (a single quad has no vertex on its limb). Within the far level's 320 triangles, traced shading alone left the change at 73.7 and larger pads at 67.9.
