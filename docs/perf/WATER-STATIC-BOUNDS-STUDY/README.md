# Static water bounds during a forest pan — measurement only

Live **0.0.47 · 9cc3589**, High. The sea has **533** conservative local boxes. Across 120 fixed-position camera directions in the dense-fir view, its existing visibility predicate performs **46,779 box-to-world transforms**. Every sampled sea world matrix and every sampled local box remains exactly unchanged. Console errors: **0**.

This independently repeats the visibility predicate once per view, so it is the remaining work after #772 removes the second same-frame query. It does not run the full game loop or compare candidate code. No production change, saved milliseconds, FPS, heat, or rendered pixel identity is claimed. A future cache would need to preserve changed matrices, edited/replaced local boxes and conservative padding before being considered safe.

The loading raster is temporarily suppressed to collect CPU-side geometry without software drawing cost, then restored before measurement. The 120 measurements are read-only visibility queries; there are no rendered captures in this study.

Exact views/results: `report.json`. Reproduce from the repository checkout with Chrome configured for WebGL:

```sh
node docs/perf/WATER-STATIC-BOUNDS-STUDY/repro.mjs artifacts/water-static-bounds
```

This is a next-step investigation, separate from #772’s completed rendered proof and compiled budget.
