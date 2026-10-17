# Share shoreline samples during grass streaming

Follow-up to [#540](https://github.com/ael-dev3/Tervain/pull/540), using its branch (`18a61f374`) as the baseline. Earlier canopy, slope and carve savings are excluded from this change's claim.

A cold habitat raster node samples shoreline distance for dune suitability after ground painting has already sampled it at the same point. Near the sea, ground painting also asks coastal wetness to compute that distance again. Each distance calculation evaluates the coastline curve and five noise octaves.

Store the distance in the existing reusable surface sample and let ground painting consume it. Pass the same ordinary-precision value to coastal wetness. Both APIs retain their original fallback when no sampled value is supplied; zero remains a valid sample. No texture, vegetation placement rule, material or draw distance changes.

## Reproduce

```sh
node tools/repro-live-habitat-shore-sample.mjs --out habitat-shore-proof
```

The default target is [the published game](https://ael-dev3.github.io/Tervain/). The script retains the native Habitat, planted crown field, grass generators, tile meshes and renderer. It resets raster caches per arm and refills the native grass tiles using native, baseline and candidate node methods. Each source arm imports its matching ground-paint and coastline code. Habitat and ground painting share the same instrumented coastline module, whose actual counter binding is re-exported by the Habitat module.

The gate requires complete generated attribute buffers, counts, bounds and raster bytes to match the native build. Source-arm terrain sampling must stay identical. Baseline shoreline calls must equal twice the node count plus coastal wetness calls; the candidate must perform one shoreline calculation per node while retaining the same wetness queries. The module counter excludes separate coastline imports elsewhere in biome/terrain code. This is not a claim that all world shoreline work disappears.

Native Grade/post endpoint images and draw statistics must match. They are rendered regeneration controls, not a hardware pacing test or a motion-video score. Use `--candidate-ref 18a61f374` for the unchanged-source negative control.

Validation includes cold/warm raster sampling, sampled shoreline values below/at/above zero, and exact ground-paint bytes and wetness. Hardware frame timing and the remaining village-pan hitch remain unverified.

## Recorded result

Published **0.0.18 · 421d34b**, low preset, software WebGL:

| Work | Baseline (#540) | Candidate |
| --- | ---: | ---: |
| Native grass tiles regenerated | 31 | 31 |
| Grass instances | 4,088 | 4,088 |
| Raster tiles / nodes | 22 / 6,358 | 22 / 6,358 |
| Shoreline calculations in the measured path | 14,965 | 6,358 |
| Coastal-wetness queries | 2,249 | 2,249 |
| Endpoint draws | 245 | 245 |
| Endpoint triangles | 1,889,302 | 1,889,302 |
| Endpoint texture count | 174 | 174 |

This removes **8,607 repeated shoreline evaluations (~58%)** in the measured path. Other biome/terrain shoreline evaluations are outside this counter. Height, slope and carve call counts are unchanged against #540; earlier reuse savings are not attributed here.

All generated attributes, counts and bounds match native (SHA-256 `20d09afae8cc889ae23deb2be8492d201b8949447e592f8a844759109dc161aa`). All raster bytes match native (`6ab48c315cdd42626327d581da29809c60151a45eed223579dcdcc825be8199f`). Native/before/after pixels are identical.

[Report](../../proofs/habitat-shore-sample/report.json), [native control](../../proofs/habitat-shore-sample/native.png), [before](../../proofs/habitat-shore-sample/before.png), [after](../../proofs/habitat-shore-sample/after.png).

**42 targeted tests and production build pass.** Hardware play-gate verification remains pending; no hardware FPS, frame-time or GC improvement is claimed.

The unchanged-source control correctly fails the reduction assertion: it retains 14,965 shoreline evaluations while matching native buffers and pixels. [Control receipt](../../proofs/habitat-shore-sample/unchanged-source-control.json).
