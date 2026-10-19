# Hero-pine branch-wind coordinate correction

Baseline: published **0.0.33 · b317734**, High preset, native post/MSAA4, software WebGL. Candidate: **57afcf693**.

The loader scales vertex positions to the planted pine height but leaves authored `_pivot` points in source units. The hierarchical wind shader consumes both in the same coordinate space. The correction scales both wood and leaf anchors once during loading. It retains every position/index, material, authored wind weight/phase, shader and placement.

## Published witness

`tree:wild:28:30` at approximately **(-196.178, 0.758, 21.489)**. The measurement inventories all retained pine templates, not only this instance. Three native variants are present across all three LODs (18 wood/leaf buffers); the regression additionally covers the fourth authored variant.

| Native variant | Vertex scale | Maximum unscaled-anchor discrepancy |
| --- | ---: | ---: |
| 0 | 1.574791 | 8.7032 |
| 1 | 1.291471 | 5.4150 |
| 2 | 1.130474 | 2.8871 |

Discrepancies are Euclidean distances in **scaled tree-template space, before the per-instance transform**. They are not detached-card counts or measured world-space branch gaps. Native wood coordinates match the delivered scaled vertices within 0.000002; original pivot prefixes exactly match the unscaled asset. A contact pass can split/move leaf vertices after loading; the probe recovers scale from unchanged wood and preserves that pass's leaf geometry.

## Capture method

Run `tools/repro-live-pine-wind-pivots.mjs` with `--url` and `--out`. Freeze the live scene and replay the same pivot multiplication on its retained native buffers. Warm both modes, capture before/after/restore at fixed wind times, then repeat with wind disabled. Every restoration must reproduce baseline RGB exactly. This is a native-scene operation replay supported by delivered-asset loader tests; it is not a separate candidate-build video or hardware timing measurement.

The view contains nearby canopy occluders; it is a wind-coordinate regression view, not an isolated-tree beauty comparison or a crown-quality score. Changed-pixel counts demonstrate a visible consequence, not an improvement metric. Static detached clump clearance remains open.

- [Near view before](pose-0-before.png) / [after](pose-0-after.png)
- [Second wind phase before](pose-1-before.png) / [after](pose-1-after.png)
- [Third wind phase before](pose-2-before.png) / [after](pose-2-after.png)
- [42 m view before](pose-3-before.png) / [after](pose-3-after.png)
- [Wind-disabled control before](pose-4-before.png) / [after](pose-4-after.png)

## Validation

11 focused tests and the build/type check pass. The new all-variant/all-LOD asset regression fails on the original loader. It verifies vertex/anchor scale agreement and unchanged indices/wind weights while using cloned buffers.

Final native report and exact-head stock budget receipt are added after completion. No hardware FPS or heat claim.

## Completed native comparisons

Every camera is asserted to remain at least 2 m above its terrain sample.

| Camera distance | Wind time | Wind strength | Draws before → after | Triangles before → after | Changed pixels | Baseline restore |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | 0 | 1 | 258 → 258 | 2,504,822 → 2,504,822 | 206,384 | exact RGB |
| 20 | 1 | 1 | 258 → 258 | 2,504,822 → 2,504,822 | 206,665 | exact RGB |
| 20 | 2 | 1 | 258 → 258 | 2,504,822 → 2,504,822 | 207,018 | exact RGB |
| 42 | 1 | 1 | 271 → 271 | 2,996,852 → 2,996,852 | 201,554 | exact RGB |
| 20 | 1 | 0 | 258 → 258 | 2,504,822 → 2,504,822 | 0 | exact RGB |

Wind-disabled images are RGB-identical; zero native console errors. See [raw report](report.json). Counts are full-frame pixels at 640×360, including occlusion and shadows; they do not quantify detached clumps. Shadow/depth proxies share the original attribute buffers and receive the same replayed correction.
