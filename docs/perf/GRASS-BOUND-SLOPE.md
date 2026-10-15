# Share the grass clump slope extent

The [published build](https://ael-dev3.github.io/Tervain/) evaluates the same `Math.hypot(gx, gz)` twice for every accepted grass clump: once for the lower tile bound and once for the upper bound. Grass streaming repeats this work whenever a tile is filled.

Compute `GRASS_CLUMP.radius * 1.5 * Math.hypot(gx, gz)` once and use the result in both bounds. Multiplication order, gradients, placement, appearance and culling bounds remain unchanged.

## Matched results

Published 0.0.18 (`421d34b`), with paired native/baseline/candidate runs for each preset:

| Preset | Retained tiles | Generated clumps | Bounds-site evaluations before → after | Draws / triangles |
| --- | ---: | ---: | ---: | ---: |
| Low | 31 | 4,088 | 8,176 → 4,088 | 245 / 1,889,302 |
| High | 108 | 63,664 | 127,328 → 63,664 | 404 / 5,558,316 |

Every instance attribute, vertical bound, bounding sphere and complete habitat raster matches exactly, as do final pixels and draw counts. The unchanged-source Low control correctly fails the reduction assertion. Each row compares variants within the same preset; it is not a Low-to-High comparison. Counts cover complete retained-tile refills, including reserve tiles, not one rendered frame.

## Reproduce

```sh
node tools/repro-live-grass-bound-slope.mjs --quality high --out grass-bound-proof
npx vitest run tests/presentation/grassEngine.test.ts tests/presentation/grassFlowers.test.ts tests/presentation/grassCaptureRanks.test.ts --testTimeout=90000
npm run build
```

The script compiles the actual baseline/candidate grass-field modules, then installs their generation callbacks on the published world's retained native tile layers. Terrain, Habitat, tile filling and the post/MSAA render path stay native. It refills those tiles with cold Habitat caches and compares every generated instance attribute, count, vertical bound, bounding sphere, complete habitat raster and final rendered pixel. Counters are inserted only at the two original bounds-site expressions or the candidate's shared expression.

An unchanged-source control must fail the reduction assertion. Thirty-one grass tests and the production build pass.

[Matched receipt, screenshots and unchanged-source control](../../proofs/grass-bound-slope).

This measures bounds-site evaluations in an instrumented streaming replay. It does not measure hardware frame times, prove a village-pan hitch fixed, or establish an Apple GPU performance gain. No grass shape, shading, density or distance rule changes.
