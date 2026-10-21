# A163: 0.0.43, generated bushes

## The shrubs against Gothic 3

- Gothic 3's undergrowth is low, wide bushes: many thin stems from one root, leaves down to knee height, sky and grass showing through the edges.
- Tervain's 62 shrubs were two supplied models scaled to 1.5 m: tree-1521 (47) and tree-4949 (15). Both are small trees: one trunk under a round crown, a lollipop in the meadow.
- They were also the most expensive thing per metre in the world: 13,542 to 14,409 triangles for a near shrub, as much as a near oak's crown.

## Change

- **Generator** (tools/tree-gen, `--species bush`; seeds 21, 22 and 23 give hero-bush, hero-bush-b and hero-bush-c).
  - Skeleton (`growBush`, skeleton.mjs):
    - Seven to ten slim stems leave a root crown together: two steep inner ones, the rest leaning out to about 52 degrees, and they arch over.
    - Each stem carries three to five branches and each branch three to five twigs, angled out and drooping.
    - The leaves sit on a low, wide dome (as wide as 0.62 to 0.8 of the height on each side). Its lower edge is lifted, so the stems show between the ground and the leaves.
    - No trunk: the level-0 stub the mesher expects sits under the ground.
  - Leaves: the oak's cards, small (0.42 of the oak's size near), packed closer together (6 cm apart, oaks 14 cm) and allowed nearer the wood (3 cm, oaks 15 cm), because the twigs are thin. Clumps under the limbs are left out (`undersides: false`): a bush has none.
  - Wood: hazel-grey stems, a little moss, no dark foot; the thinnest wood a little darker.
  - Oaks and birches build exactly as before: their files are byte-identical.
- **Images**: a bush carries none. It names hero-oak-near and borrows the oak's bark and leaves. The loader now matches the borrowed materials by role (the name before the `|`), so a bush's "Foliage | hero bush" takes the oak's "Foliage | hero oak".
- **In game** (meshyTrees.ts `HERO_FAMILY`):
  - The generated bushes replace the shrub family (tree-1521 and tree-4949), as the oaks and birches replaced theirs.
  - Spacing, clearing guards, colliders and grounding still read the supplied shrub's footprint, so no shrub moves.
  - A bush has no rebuilt crown: its own cards, with their baked crown shade, are drawn at every level.
  - Its leaves are tinted a little warmer (`BUSH_LEAF_TINT`, 1.0 / 0.88 / 0.73 linear). The oak leaf reads cool, almost mint, against the meadow's warm grass.
  - `?herobush=0` keeps the supplied shrubs.

## Budget

Per template in game (wood plus leaves), against the supplied shrubs the family replaces:

| Level | Supplied (tree-1521 / tree-4949) | Generated (hero-bush / -b / -c) |
| --- | ---: | ---: |
| Near | 14,409 / 13,542 | 4,634 / 4,480 / 4,316 |
| Middle | 8,508 / 7,763 | 1,910 / 1,878 / 1,778 |
| Far | 2,837 / 2,404 | 578 / 586 / 556 |

- Averaged over the 62 shrubs as placed: near 14,199 → 4,484 (−68%), middle 8,328 → 1,855 (−78%), far 2,732 → 572 (−79%).
- Download: the nine bush files add 2,153,700 bytes. They carry no images. The supplied shrubs still load, because their footprints place the bushes.

## What was measured and not taken

- **Oak-sized clearance**: with the oak's 15 cm between a leaf card and any wood, most of a bush's cards were refused (its twigs are close together), leaving bare sticks.
- **The oak's leaf colour**: untinted, the bushes read mint against the grass. On the walk below they also flickered more than the tinted ones: crown band −9.1% against live (tinted −13.2%), whole frame +2.8% (tinted −2.0%), 60+ levels −3.3% (tinted −8.4%).

## Evidence

- A real-play walk past a group of shrubs (12 s, fixed 1/60 s steps, wind running), against live 0.0.42:

| Spikes against live 0.0.42 | Change |
| --- | ---: |
| 40+ levels, upper 45% of the frame | −13.2% |
| 40+ levels, whole frame | −2.0% |
| 60+ levels, whole frame | −8.4% |

- A spike is a pixel that jumps and comes back within a frame. Fewer, larger leaf edges low in the frame replace the supplied shrubs' fine crowns.
- Mean colour of the near bush 87 / 100 / 69 against the grass around it 97 / 101 / 63.
- Canopy audit (LOD 0, gap 0.75, reach 1.5 m), all 337 trees: 0 detached clumps, 0 detached cards. The 62 bushes have 0 candidates.

## Self-score against Gothic 3

| | Before | After |
| --- | ---: | ---: |
| Shrubs (scored on their own from now on) | 5 | 6.5 |

- They read as bushes: low, wide, open underneath, many stems.
- What remains: the leaves are the oak's, a little large for a bush and still cooler than the grass; there is no flowering or berried undergrowth, and no small bush under 1 m.
