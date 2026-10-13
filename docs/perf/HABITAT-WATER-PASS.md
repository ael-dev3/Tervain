# Shared habitat water traversal

Habitat raster nodes computed distance to stream centre-lines and to stream banks in two traversals of the same polylines. Bank widths vary, so one result cannot be substituted for the other. The water-distance sampler now optionally writes the centre-line minimum into a reusable Float64 slot, retaining both original formulas and avoiding a second traversal. Existing two-argument callers retain their bank-distance result.

## Reproduce

`node tools/repro-habitat-water-pass.mjs --out water-pass.json` loads baseline and current Habitat implementations with actual terrain and stock exclusions. It samples 1,920 coordinates around fence, window, meadow and forest locations, filling 30 cold tiles. Diagnostic counters instrument actual stream polyline calls; no instrumentation enters the build.

Stream polyline evaluations: **78,030 → 52,020 (33.3% fewer)**. All interpolated samples and **43,350 raster words** remain exactly equal. The remaining third traversal belongs to ground colouring, outside this focused change. The before receipt intentionally fails the improvement assertion.

`node tools/repro-habitat-water-pixels.mjs --out water-pixels` renders baseline/current High grass with native software WebGL: all **712 instance buffers / 15,409,216 bytes** match, RGB images are identical, and submitted **21 draw calls / 620,193 triangles** are unchanged. The fixture uses stock exclusions without registered crowns or postprocessing; it does not verify shimmer or hardware frame pacing.

[Before](habitat-water-proof/before.png) · [After](habitat-water-proof/after.png) · [Counters](habitat-water-proof/after.json) · [Rendering receipt](habitat-water-proof/pixels.json)

Build, typecheck and 11 focused habitat/contact/distance tests pass. These are operation-count savings, not a claim that historical bow or inside-window frame spikes are fixed. Hardware play-gate evidence remains outstanding.
