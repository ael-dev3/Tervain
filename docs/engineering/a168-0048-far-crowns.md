# A168: 0.0.48, far crowns rebuilt like the nearer ones

## Before

- A broadleaf has three levels, and the forest crossfades between them:
  - Medium: near to middle at 120 to 180 m, middle to far at 480 to 620 m.
  - Low: the middle level from the player's feet, the far level from 64 to 96 m.
  - On every preset, the sun's shadows of broadleaves beyond 68 m come from the far level.
- Near and middle crowns are rebuilt as clumps of small leaf-cluster cards in the shared foliage atlas (A134). Far crowns kept their files' own cards and the shade baked into them.
- One template at a time against the sky (every other object hidden, every tree forced to each level), each broadleaf's far crown read 5 to 25 levels darker than the middle crown it crossfades with, and some much smaller: the sentinel's by 30%, the pear's by 28% (table below).
- They also swayed differently. A far file's own cards carry the generator's twig phases (150 to 319 of them), while the middle crown rides the middle wood's boughs (55 to 68 on an oak).

## Change

- **Far crowns rebuilt** (meshyTrees.ts): every broadleaf's far crown goes through the same canopy pass as its nearer ones, with the far shape `FAR_CANOPY` (canopy.ts).
  - Cards: as many as its far file has, in fewer, larger clumps (2 m, cards 1.5 to 2.8 m).
  - A generated oak's lobed crown takes clumps and cards 1.45 times larger: at the plain size it read a quarter smaller than its middle crown. The orchard's take 0.55: at its middle scale the pear's narrow crown read a sixth larger.
  - Clumps are placed from the middle file's leaves, the crown the far one crossfades with. The far file's own leaves sit lower and narrower on the oaks: hero-oak-b's far crown read 20% smaller than its near crown from them, 16% from the middle file's.
  - The leaves sway on the middle crown's boughs (its branch field), as the middle crown's do. The far wood keeps only the limbs, and on those alone an orchard tree's whole far crown swayed on four to six parts.
- **Cost:** a rebuilt far crown keeps to its far file's triangles, wood and twigs included. Beyond 68 m every broadleaf casts its shadow from this level, on every preset.
- **Culling:** the forest culls a tree by the union of its levels' bounds. As a far crown's cards are seated toward their wood (`seatFarCards`, A167), each is first moved back inside its near and middle levels' bounds, and a move toward the wood stops at those bounds. A card they leave short of its wood is dropped: one of the sentinel's 994.

## Evidence

- Far crown against the middle crown, 0.0.47 → this release, from 80 m (60 m for the orchard) through a 14° lens. "Change" is the mean luma change between the two levels over the tree, at the size it has at that distance through the game's own lens (a quarter of the capture); the near-to-middle change, which this release leaves alone, is given for scale:

| Kind | Far crown's area, of the middle crown's | Far crown's luma, against the middle crown's | Middle-to-far change | Near-to-middle change |
| --- | ---: | ---: | ---: | ---: |
| hero-oak | −4% → −4% | −14.6 → −1.5 | 44.4 → 27.0 | 25.5 |
| hero-oak-b | −11% → −9% | −7.9 → −4.0 | 41.7 → 32.5 | 29.3 |
| sentinel | −30% → −3% | −25.1 → 0.0 | 51.8 → 17.3 | 16.5 |
| hero-birch | −11% → −12% | −11.2 → −2.5 | 34.2 → 23.9 | 18.7 |
| apple | −9% → −4% | −15.5 → −1.3 | 35.0 → 21.6 | 19.6 |
| pear | −28% → +1% | −8.4 → +0.2 | 41.3 → 21.4 | 20.0 |
| tree-1505 (supplied oak) | −18% → −4% | −5.5 → +1.8 | 52.6 → 27.1 | 47.4 |
| bush (not rebuilt) | −3% → −3% | −1.7 → −1.7 | 25.6 → 25.6 | 23.3 |

- Hero-oak-b's far crown is still the furthest from its middle one: 4 levels darker and 9% smaller.
- Canopy audit (world-metre reach 1.5 m, gap 0.75 m, 337 trees), detached cards / clumps: near 0 / 0 and middle 28 / 28, both unchanged; far 5,135 / 143 → 5,081 / 116. The generated oaks' 54 far cards are gone; what remains is the approved solitary pine's far needle planes, as before.
- Triangles per template and level, in game: unchanged, except the sentinel's far crown (−2). Every tree's union bounds are unchanged or smaller (up to 1.48 m on a side).
- Every draw at the budget gate's pose, against live: the trees cast one far-crown shadow fewer (a hero-oak-c whose tighter bounds now leave the sun's view, −892 triangles). The only other differences are residents' shadows that come and go with their timing (the fisher's and the keeper's).
- Wind: each far crown now rides its middle crown's boughs. Distinct phases: oaks 50 to 62 (their middle crowns 55 to 68); birch 55, sentinel 35, apple 17 and pear 15, as their middle crowns. On the far wood alone they were 18, 14, 12, 4 and 6.
- A frozen walk replay on Low through the woods (121 steps 0.13 m apart, each drawn before and after the world's update): no pop-in event on either build; pixels changed by each step's update 3,873 → 3,252; draws and triangles at the first and last frames identical.
- A real-play walk on Low across the meadow toward the sentinels (20 s, wind running; they come from 90 m to 58 m, through the far-to-middle band), against 0.0.47: flicker spikes −0.1%, −0.1%, +0.0%; jumps (every change of that size from one frame to the next) −0.6%, −0.3%, −0.2%.
- High draws every tree's near level, so on High only the shadows of distant broadleaves change. Real-play walks with the wind running, against 0.0.47 (flicker spikes, 40+ levels in the upper 45% of the frame, 40+ and 60+ in the whole frame): oaks +0.1%, +0.1%, +0.3%; orchard +0.1%, −0.1%, −0.3%. The same walk recorded twice on one build differs by as much (0.0.47: +0.2%, +0.1%, +0.3%; 0.0.48: −0.0%, −0.1%, −0.3%), and a second pair of runs gives −0.1%, −0.1%, −0.4%: High is unchanged within that noise.
- Building the trees as the world loads takes 4% longer (in node, twelve broadleaf templates: 5.48 s → 5.72 s).
