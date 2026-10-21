# A165: 0.0.45, the generated sentinel

## Before

- The humid broadleaf habitat assigns a supplied tree, verdant-sentinel, to some of its groves' birch slots (7) and oak slots (4): a tall broadleaf with a slim trunk under a wide, dense crown.
- From under its crown, its limbs read as black, torn shards against the leaves. 0.0.42's bark (A162) lightened its trunk, but not these.
- It cost more than the generated trees at every level: 19,726 triangles near, 12,552 middle and 9,646 far. Its far level alone carried 8,204 triangles of wood.

## Change

- **Generator** (tools/tree-gen, `--species sentinel`, seed 66; `SENTINEL` in skeleton.mjs):
  - The orchard grower (A164) at a tree's scale. A slim, straight bole is clear to about a third of the height and carries a leader to near the top.
  - Eleven to fourteen limbs climb the leader and spread into a wide, rounded, dense crown, a lime's habit.
  - Boughs, twigs and growth steps are scaled to it (`boughLength`, `twigLength`, `stepScale` and `ringStep`). The apple and pear, which do not set them, build byte-identically.
  - Bark: grey-brown, darker than a birch's (pale bark flickered behind swaying leaves, A160).
  - It reaches 8.05 m from its trunk at 16 m tall, within the verdant-sentinel's 8.23 m.
  - It borrows the oak's images and carries none.
- **In game** (meshyTrees.ts):
  - `SUPERSEDED` maps a supplied source a habitat assigns by name to the generated tree that draws it in either slot. The verdant-sentinel's own footprint still places it.
  - `HERO_MODEL` gives a generated model the crown handling of the species it was grown as, whichever slot draws it. The sentinel's is a birch's: no lobes, and its far cards seated.
  - `?herosentinel=0` keeps the supplied verdant-sentinel.

## What was measured and not taken

A real-play walk past two birch-slot verdant-sentinels (A162's walk: 12 s, fixed 1/60 s steps, 11:00), against the 0.0.44 build:

| Drawn instead by | Upper 45%, 40+ | Whole frame, 40+ | Whole frame, 60+ |
| --- | ---: | ---: | ---: |
| The birch family of its slot | −7.0% | +22.0% | +26.1% |
| The oaks, in either slot | +74.2% | +36.4% | +30.7% |
| The generated sentinel (shipped) | −58.9% | −5.6% | −10.8% |

- **Birch family:** a birch's narrow crown left the meadow the sentinel had shaded in sun. Sunlit grass shimmers more (A161): the increase came from the grass, not the trees.
- **Oaks:** their veteran boles and great limbs crowded a grove spaced for slim trees.

## Budget

Per template in game (wood plus leaves), birch slot / oak slot:

| Level | verdant-sentinel | hero-sentinel |
| --- | ---: | ---: |
| Near | 19,726 / 19,684 | 14,016 / 14,028 |
| Middle | 12,552 / 12,570 | 8,074 / 8,074 |
| Far | 9,646 / 9,646 | 2,186 / 2,186 |

- Every draw at the budget gate's pose, listed one by one: 241 on the 0.0.44 build, 240 on the candidate.
- Download: the three sentinel files add 1,997,252 bytes. They carry no images. The verdant-sentinel still loads, because its footprint places the trees.

## Evidence

- From under the crown: a trunk and limbs branching into leaves, where the verdant-sentinel showed black shards.
- A second walk, through the pine wood past two oak-slot sentinels (15:00), against the 0.0.44 build: −1.8%, −1.5% and −1.4%. The crowns stand above the frame there.
- Canopy audit (LOD 0, gap 0.75, reach 1.5 m), all 337 trees: 0 detached clumps, 0 detached cards. The 11 sentinels (7 in birch slots, 4 in oak slots) have 0 candidates.

## Self-score against Gothic 3

| | Before | After |
| --- | ---: | ---: |
| The moist groves' tall broadleaf (scored on its own from now on) | 5 | 7 |

- What remains: tree-1505, the ochre woodland's spreading oak (6 trees), is the last supplied broadleaf. It looks like an oak and is kept for variety.
