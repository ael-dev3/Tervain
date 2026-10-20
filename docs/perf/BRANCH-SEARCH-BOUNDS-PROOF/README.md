# Bound nearest-wood search shells

Runtime head `c1e8253e98000ac10869f6bec248b4969abe0713`; published baseline 0.0.33 · b317734.

The original branch-anchor query enumerates full expanding shells before rejecting cells outside the wood grid. Intersecting each shell with that grid skips impossible cells, retaining the order of every valid cell, squared-distance comparisons, early stop, reach cutoff and lowest-index tie break. No geometry, shader, draw interval, texture, per-frame update, upload payload or resource allocation is added. This is a tree-construction optimization, not a static-floating-clump repair or an FPS/heat claim.

## Failed-on-old regression

A synthetic tree and query at (24, 24, 24) produce 290,276 shell-coordinate checks with the old search; the candidate performs 4,332 (same selected vertex 97). This counts Math.abs calls during the query, not elapsed time. A separate direct-vertex oracle checks 120 inside/outside positions at five reach limits, including zero and infinity. All 37 focused tests and production build/typecheck pass. The old source fails exactly the empty-space-work regression while the other 14 branch tests pass. Logs are included.

## Published-geometry query replay

Read actual retained High wood/leaf geometries from live b317734, remove their existing branch attributes on clones, and derive branch fields with baseline and candidate code. This is a representative retained-geometry query workload, not the original untrimmed construction sequence. All 106,121 nearest indices and all generated wood/leaf branch attributes match across 51 model/LOD cases. Warm two full repetitions, then run nine rotating baseline/candidate/unchanged-control batches. Candidate beats both controls in every batch. Mean elapsed time per complete query batch: 303.444 ms before, 279.633 ms after, 304.311 ms unchanged control (7.85% reduction vs baseline). Batch p95 is 306 / 292 / 312.8 ms respectively. These are batch times, not per-frame p95 or total world-loading time. Raw samples and checksums are retained.

The initial study found only 46 duplicate fallback searches among 106,121 queries. Removing that fallback was not pursued; this change instead eliminates out-of-grid enumeration.

## Actual construction check and images

A development-only verification transform calls baseline and candidate on every real branch field construction and every nearest query. All 118,237 queries match; all 80 checked wind/pivot arrays match exactly, across 34 derived fields and 274,055 wood vertices. Identical nearest indices and wood attributes feed the unchanged leaf derivation. The transform is in the portable proof script, not runtime code or the stock gate. The initial construction and image acquisition used the original b317734 baseline. After three baseline commits landed, the PR was rebased on 718f1d4 and this construction check repeated on the rebased head: 118,237 queries and 80 arrays match again. The search helper itself did not change between those baselines. The original images and query timings remain labelled with their original acquisition; they are not relabelled as rebased-head frame timings.

The first development-server acquisition had matching images but failed its console check because its WebSocket transport was disabled. That run is retained in first-dev-attempt.log and is not a passing receipt. The server configuration was corrected and the complete acquisition rerun with no console errors.

Seven poses (five adjacent forest walk poses, forest turn, sea) are rendered at 640×360 through native post/MSAA with normal motion enabled, foliage strength 1 and wind clocks fixed at three seconds. All three repeat images per pose are byte-identical in RGB, independently checked from PNGs. Images are repeatability controls on the directly verified construction output, not separate old/new compiled-world loads or real-time motion clips. Before/after/restore filenames identify those repeat controls. Fresh reflection caches are requested each render; not all window cube faces are claimed.

## Cost table and stock gate

| Cost | Before → after |
| --- | --- |
| Isolated query batch mean | 303.444 → 279.633 ms |
| Isolated query batch p95 | 306 → 292 ms |
| Per-frame JS source, shader code, texture taps | unchanged |
| Stock maximum draws | 285 → 285 |
| Stock maximum triangles | 3,048,306 → 3,048,306 |
| Console errors | 0 → 0 |

An initial budget run correctly failed because Pages moved from 8ad6077 to 718f1d4 between its two baseline probes; mixed-baseline-budget.log preserves that failure. The final unmodified stock gate loads the actual compiled head with ordinary startup and no initialization script, allowance or sampler changes. Actual exit zero; `play-gate: PASS c1e8253e9`. No hardware pacing, M5 FPS, GPU frame-time or thermal result is inferred.

## Reproduce

From repository root, with software-WebGL Chrome selected via CHROME:

```sh
REPRO_INIT_FILE=docs/perf/BRANCH-SEARCH-BOUNDS-PROOF/raster-suppression-init.js node docs/perf/BRANCH-SEARCH-BOUNDS-PROOF/repro-query-pair.mjs
REPRO_INIT_FILE=docs/perf/BRANCH-SEARCH-BOUNDS-PROOF/raster-suppression-init.js node docs/perf/BRANCH-SEARCH-BOUNDS-PROOF/repro-native-construction.mjs
npx vitest run tests/presentation/branchWind.test.ts tests/presentation/canopy.test.ts tests/presentation/meshyTrees.test.ts
npm run build
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head c1e8253e9
```

The first two scripts suppress raster during loading only; the construction script restores raster before images. Run browsers sequentially. Leave REPRO_INIT_FILE unset for the stock gate. The paired query script reads published geometry, so a later live release may give a different workload; it records the live revision. The construction script compares against the fixed b317734 helper and loads the current checkout. PROOF_OUT selects the output file/directory respectively. PROOF_CONSTRUCTION_ONLY=1 requests just the supplementary full-construction agreement check without image acquisition.
