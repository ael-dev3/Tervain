# A166: 0.0.46, every broadleaf crown sways by its own limbs

## Before

- The foliage shader has two ways to move a tree in the wind:
  - Per branch (hierarchical): each limb, bough, twig and leaf card turns about its own pivot at its own phase.
  - As one crown: a smooth spatial wave across the whole crown.
- Per-branch motion needs branch data (`_wind`, `_pivot`) on both the wood and the leaves. A probe of every tree kind and level (pose/windprobe.mjs) found every broadleaf moving as one crown at its near and middle levels:

| Kind | Near | Middle | Far |
| --- | --- | --- | --- |
| Generated oaks, birches, orchard trees, sentinel | one crown | one crown | per branch |
| Supplied oak (tree-1505) | one crown | one crown | per branch |
| Bushes, pines, firs | per branch | per branch | per branch |
| Palms | one crown | one crown | one crown |

- High draws every tree at its near level at every distance, so on the default preset all broadleaves swayed as one crown.
- Three causes:
  - **Generated trees:** their wood carries branch data from the generator. The loader derives branch data only for wood that has none, so the rebuilt crown got none. Then, to keep wood and leaves in step, the wood's own data was removed too.
  - **Oak crowns** (all oaks, generated and supplied): the step that snaps detached clumps onto their wood (0.0.25) rebuilt the leaf geometry with only position, normal and uv, which dropped the branch data.
  - **Orchard near crowns:** the step that culls cards beyond the audit reach (0.0.28) did the same.

## Change

- `branchFieldOf` (branchWind.ts) builds the field over a wood's own branch data. A generated tree's rebuilt crown reads it, so its cards ride the limbs the generator grew.
- `snapDetachedClumps` and `cullFarCards` (canopy.ts) keep every attribute of the cards they keep.
- The per-branch motion is calmer at its two quickest levels (foliageWind.ts):
  - Twigs: 0.6 of their swing, 0.7 of their rate.
  - Leaf cards: 0.3 of their flutter, half its rate (1.75 to 3 Hz, from 3.5 to 6 Hz).
  - Limb and bough sway, the motion that reads as branches, is unchanged.
  - This applies to every tree that sways per branch: the broadleaves now, and the bushes, pines and firs that already did.

## Evidence

- After the change, every broadleaf kind sways per branch at every level. The generated oaks' near crowns ride 61 to 63 distinct limb phases, the birches' 36 to 54, the orchard trees' 15 and 16, the sentinel's 34 and tree-1505's 22. Palms are unchanged: no branch data is derived for them yet.
- Real-play walks (12 s, fixed 1/60 s steps, wind running: foliage wind strength 1), against 0.0.45:

| Flicker spikes | Oaks, 11:00 | Orchard, 11:00 | Sentinels, 11:00 | Shrubs, 11:00 | Pine wood, 15:00 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 40+ levels, upper 45% of the frame | −6.4% | −0.2% | −5.3% | −73.7% | −41.2% |
| 40+ levels, whole frame | −1.6% | −1.7% | −0.8% | −15.7% | −28.4% |
| 60+ levels, whole frame | −1.9% | −9.6% | −1.8% | −24.3% | −35.5% |

- A spike is a pixel that jumps and comes back within a frame. The bushes' and conifers' quick leaf flutter was most of their shimmer in the wind.
- With the old twig and leaf constants, per-branch motion on the broadleaves alone added flicker: orchard +7.8%, +2.6% and −3.7%; oaks +1.3%, +0.3% and −0.8%. That was not taken. Halving the leaf flutter at 0.6 of its rate brought the orchard to +2.5%, −0.3% and −7.7%, and calming the twigs as well to +1.5%, −0.7% and −8.2%. The shipped setting is the first with no increase on either walk.
- The trees still move. From a standing camera in the pine wood with the wind running, the share of crown pixels that change by 8+ levels each frame is 0.1017 (0.1018 before); the mean change per frame is 3.00 levels (3.37).
- GPU time at an oak pose with the wind running (1470 × 956 at 2×, three alternating rounds of 120 frames): median 6.71 ms against 6.62 ms, within the rounds' spread of 6.54 to 6.72 ms on each side.
- Draws and triangles: unchanged. Branch data adds vertex attributes, not geometry.

## Correction to A162 to A165

- The walk clips behind A162 to A165 ran in the capture tool's shot mode, which turns on reduced motion: foliage wind strength 0, so the trees stood still, and the grass gusts were off. A162, A163 and A164 say "wind running"; that was wrong. The tool (pose/liveclip.mjs) now runs the wind and records its strength with each clip.
- The same walks, recorded again with the wind running, each release against the one before it:

| Flicker spikes, wind running | 0.0.42 bark (A162) | 0.0.43 bushes (A163) | 0.0.44 orchard, along the rows (A164) | 0.0.44 orchard, past the pears (A164) | 0.0.45 sentinel (A165) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 40+ levels, upper 45% of the frame | −3.3% | +1.9% | −50.3% | −47.6% | −66.4% |
| 40+ levels, whole frame | −1.0% | +1.4% | −39.6% | −49.9% | −8.0% |
| 60+ levels, whole frame | −8.0% | −1.6% | −45.7% | −62.1% | −8.5% |

- With the wind running, the 0.0.43 bushes flickered a little more than the shrubs they replaced: their quick leaf flutter. This release's calmer flutter more than reverses that (shrubs −15.7% over the frame against 0.0.45).
