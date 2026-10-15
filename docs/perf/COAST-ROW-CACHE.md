# Reuse the coastline curve across raster rows

Follow-up to [#550](https://github.com/ael-dev3/Tervain/pull/550), using its branch (`02cef3d1c`) as the baseline. Its shoreline-sample reuse is already present and is not counted again here.

The shoreline curve depends only on `z`. A habitat raster row evaluates seventeen `x` positions at the same `z`, but previously repeated the Hermite curve and five noise octaves for each point. Keep the latest `z` and curve result in two scalar fields. A different `z` replaces that entry; there is no growing coordinate map or per-query object construction. The uncached formula and its arithmetic order are unchanged.

## Reproduce

```sh
node tools/repro-live-coast-row-cache.mjs --out coast-row-proof
```

The default target is [the published game](https://ael-dev3.github.io/Tervain/). The script retains the native Habitat, planted crown field, grass generators, tile meshes and renderer, resets raster caches per arm, and regenerates native tiles with native/baseline/candidate code. Each source arm uses its matching ground-paint and coastline dependencies. Its Habitat module re-exports the actual coastline counter binding, so cache-miss work is counted inside `shoreNoise` after the cache lookup.

The gate requires native generated buffers, counts, bounds and raster bytes to match exactly. Shoreline, wetness and terrain query counts must stay unchanged against #550. Baseline shore-noise calls must equal the node count; candidate calls must be positive and no more than one per seventeen-node row. Adjacent tile boundaries can reuse one value too. Counts cover the measured coastline module, excluding separate biome/terrain imports.

Native Grade/post endpoint images must match. They are rendered regeneration controls, not hardware timings or motion-video scores. Run `--candidate-ref 02cef3d1c` for the unchanged-source negative control.

## Recorded result

Published **0.0.18 · 421d34b**, low preset, software WebGL:

| Work | Baseline (#550) | Candidate |
| --- | ---: | ---: |
| Grass tiles / instances | 31 / 4,088 | 31 / 4,088 |
| Raster tiles / nodes | 22 / 6,358 | 22 / 6,358 |
| Shoreline queries in the measured module | 6,358 | 6,358 |
| Coastal-wetness queries | 2,249 | 2,249 |
| Shore-noise evaluations | 6,358 | 368 |
| Endpoint draws | 245 | 245 |
| Endpoint triangles | 1,889,302 | 1,889,302 |
| Endpoint texture count | 174 | 174 |

Shore-noise work drops **~94% beyond #550** for this corpus. This does not measure total world CPU cost or all shoreline imports.

All generated attributes, counts and bounds match native (`20d09afae8cc889ae23deb2be8492d201b8949447e592f8a844759109dc161aa`). All raster bytes match native (`6ab48c315cdd42626327d581da29809c60151a45eed223579dcdcc825be8199f`). Native/before/after pixels are identical.

[Report](../../proofs/coast-row-cache/report.json), [native control](../../proofs/coast-row-cache/native.png), [before](../../proofs/coast-row-cache/before.png), [after](../../proofs/coast-row-cache/after.png).

**44 targeted tests and production build pass.** Tests compare the cached curve to the uncached compatibility oracle at 2,000 deterministic points, coastline anchors, signed zero and extreme/non-finite inputs. A separate count check verifies sharing across callers and eviction after a different `z`.

Hardware play-gate verification remains pending. No hardware FPS, frame-time or GC gain is claimed, and the remaining village-pan hitch is not declared fixed.

The unchanged-source control correctly fails the reduction assertion: it retains 6,358 shore-noise evaluations while matching native buffers and pixels. [Control receipt](../../proofs/coast-row-cache/unchanged-source-control.json).
