# Navigation search backing-store reuse

The village-turn hitch remains unchecked in [#326](https://github.com/ael-dev3/Tervain/issues/326). The published 0.0.18 · 421d34b route search allocates a fresh score, predecessor and closed-cell array for every query: 49,300 cells × (4 + 4 + 1) bytes = **443,700 bytes per query**. Resident planning and blocked hostile chases use this search.

Retain these three scratch arrays lazily per `NavGrid`, and reset their contents before each synchronous search. Returned routes contain independent point objects. Wider-creature grids retain their own workspace. This trades **443,700 retained bytes per used grid** for eliminating repeated search backing-store allocation. Score/predecessor resets remain; closed flags are explicitly cleared. This does not eliminate A* work or other query allocations.

## Reproduce

```sh
node tools/repro-live-nav-search-workspace.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out nav-search-workspace-proof
```

The script runs the baseline from `421d34b` and the candidate source on copied native published colliders and the native terrain. Both complete navigation grids must match the native grid. It intercepts the three native typed-array constructors during 64 published route queries and compares that measurement to the instrumented baseline. Every candidate and baseline route must match the native result exactly, both on the initial pass and on a repeat pass. Queries cover the village, walk-fence, run-round, bow and forest/resume positions; eight deliberately use a zero expansion budget to exercise failure cleanup. The receipt's `unreachable` field counts null results, including those deliberately limited searches; it is not a claim that those destinations are physically unreachable.

See [JSON receipt](../../proofs/nav-search-workspace/report.json) and unchanged-scene native post-render [before](../../proofs/nav-search-workspace/before.png) / [after](../../proofs/nav-search-workspace/after.png) images.

These are exact backing-store allocation counts and bytes at the three search sites, not total heap usage, upload bytes, natural query frequency, GC timings or hardware frame times. A hardware re-gate is still required; this does not prove the historical ~33 ms frames are resolved.

## Matched result

| Search workspace allocation | Before | After |
| --- | ---: | ---: |
| First 64 queries: typed-array constructions | 192 | 3 |
| First 64 queries: backing-store bytes | 28,396,800 | 443,700 |
| Repeated 64 queries: typed-array constructions | 192 | 0 |
| Repeated 64 queries: backing-store bytes | 28,396,800 | 0 |

All 128 returned results per arm match the native control (56 routes and eight expansion-limited null results per pass). The route hash is `154328cd…1c563dbe`. Both complete grids match, and unchanged-scene images are pixel-identical. Final native post-render cost is unchanged: 121 draw calls, 824,790 triangles, 102 textures.

Production build and 46 existing/new navigation, collider, cooperative-construction, stockade-gate and enemy-motion tests pass. New tests exercise state reset across success, expansion limits, an unreachable closed gate, gate reopening, separate wider-creature grids, and preservation of earlier returned route objects.
