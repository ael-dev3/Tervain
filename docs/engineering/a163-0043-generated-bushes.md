# A163: 0.0.43, generated bushes

## The shrubs against Gothic 3

- Gothic 3's undergrowth is bushes: many thin stems from one root, leaves down to knee height, sky and grass showing through the edges.
- Tervain's 62 shrubs were two supplied models scaled to 1.5 m: tree-1521 (47) and tree-4949 (15). Both are small trees, one trunk under a round crown: a lollipop in the meadow.
- They were also the most expensive thing per metre in the world: 13,542 to 14,409 triangles for a near shrub, as much as a near oak's crown.

## Change

- **Generator** (tools/tree-gen, `--species bush`; seed 28 gives hero-bush, seed 31 hero-bush-b).
  - Skeleton (`growBush`, skeleton.mjs):
    - Seven to ten slim stems leave a root crown together: two steep inner ones, the rest leaning out to 40 degrees, and they arch over.
    - Each stem carries three to five branches and each branch three to five twigs, angled out and drooping.
    - The leaves sit on a rounded dome, irregular at its edge, from just above the ground to the top. It is about as wide as it is tall: 1.57 to 1.70 m across at 1.5 m, the supplied shrubs' 1.53 to 1.70 m.
    - No trunk: the level-0 stub the mesher expects sits under the ground.
  - Leaves: the oak's cards, small (0.42 of the oak's size near, 0.45 at the other levels, so no level's leaves reach past the near crown's outline), packed closer together (6 cm apart, oaks 14 cm) and allowed nearer the wood (3 cm, oaks 15 cm), because the twigs are thin. There are no clumps under the limbs (`undersides: false`).
  - Wood: hazel-grey stems, a little moss, no dark foot; the thinnest wood a little darker.
  - Oaks and birches build exactly as before: their files are byte-identical.
- **Images**: a bush carries none. It names hero-oak-near and borrows the oak's bark and leaves. The loader now matches borrowed materials by role (the name before the `|`), so a bush's "Foliage | hero bush" takes the oak's "Foliage | hero oak".
- **In game** (meshyTrees.ts `HERO_FAMILY`, `heroFamilyId`):
  - The generated bushes replace the shrub family slot for slot: hero-bush where the supplied family places tree-1521 (two slots of three), hero-bush-b where it places tree-4949. The bushes therefore draw as many templates as the shrubs did.
  - Spacing, clearing guards, colliders and grounding still read the supplied shrub's footprint, so no shrub moves.
  - A bush has no rebuilt crown: its own cards, with their baked crown shade, are drawn at every level.
  - Its leaves are tinted a little warmer (`BUSH_LEAF_TINT`, 1.0 / 0.88 / 0.73 linear). The oak leaf reads cool, almost mint, against the meadow's warm grass.
  - `?herobush=0` keeps the supplied shrubs.

## Budget

Per template in game (wood plus leaves), against the supplied shrubs the family replaces:

| Level | Supplied (tree-1521 / tree-4949) | Generated (hero-bush / -b) |
| --- | ---: | ---: |
| Near | 14,409 / 13,542 | 4,268 / 4,062 |
| Middle | 8,508 / 7,763 | 2,106 / 2,126 |
| Far | 2,837 / 2,404 | 1,220 / 1,230 |

- Averaged over the 62 shrubs as placed: near 14,199 → 4,218 (−70%), middle 8,328 → 2,111 (−75%), far 2,732 → 1,222 (−55%).
- Every draw at the budget gate's pose, listed one by one: 241 on live and 241 on the candidate. The shrubs' six shadow draws become the bushes' six.
- Download: the six bush files add 1,653,668 bytes. They carry no images. The supplied shrubs still load, because their footprints place the bushes.

## What was measured and not taken

- **A low, wide dome** (2.4 to 2.5 m across at 1.5 m tall): it stood outside the footprint placement and clearings were tuned to. A far bush just off the screen's edge then reached into the culling guard, and the gate's pose drew three more draws than live.
- **Three bush templates**, as for the oaks and birches: the supplied family places tree-1521 in two of its three slots. Three bushes split those instances into two batches and drew more.
- **The oak's leaf clearance**: with 15 cm between a leaf card and any wood, most of a bush's cards were refused (its twigs are close together), leaving bare sticks.
- **The oak's leaf colour**: untinted, the bushes read mint against the grass. On the first, wider version they also flickered more than tinted: crown band −9.1% against live (tinted −13.2%), whole frame +2.8% (tinted −2.0%), 60+ levels −3.3% (tinted −8.4%).

## Evidence

- A real-play walk past a group of shrubs (12 s, fixed 1/60 s steps; the trees stood still, the capture ran with reduced motion: corrected and re-measured with the wind in A166), against live 0.0.42:

| Spikes against live 0.0.42 | Change |
| --- | ---: |
| 40+ levels, upper 45% of the frame | −11.5% |
| 40+ levels, whole frame | −4.8% |
| 60+ levels, whole frame | −11.1% |

- A spike is a pixel that jumps and comes back within a frame. Fewer, larger leaf edges low in the frame replace the supplied shrubs' fine crowns on thin stems.
- Canopy audit (LOD 0, gap 0.75, reach 1.5 m), all 337 trees: 0 detached clumps, 0 detached cards. The 62 bushes have 0 candidates.

## Self-score against Gothic 3

| | Before | After |
| --- | ---: | ---: |
| Shrubs (scored on their own from now on) | 5 | 6.5 |

- They read as bushes: rounded, leafy to near the ground, many stems.
- What remains: the leaves are the oak's, a little large for a bush and still cooler than the grass. There is no flowering or berried undergrowth, and no bush under 1 m.
