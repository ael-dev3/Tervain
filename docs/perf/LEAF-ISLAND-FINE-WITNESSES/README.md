# Repair thin opaque needles omitted from the island graph

Candidate `d6c5eb1582dc183b67347869afe7f8ff01611659`, original `4ea5b5a4d` (published 0.0.38). The load-time island repair searches opacity at six subdivisions, then 48 if empty. The alpha-aware audit has a further positive-hint-only 192 search. A thin needle missed by 48 is therefore present in the renderer and audit, but absent from the repair graph.

Match the final witness search in the repair, only when the texture's conservative coverage hint is positive. Cache the grid resolution along with each UV pattern so coordinates found on 192 are interpolated with that denominator. Proven-clear patterns and patterns without a positive hint take their old path. No shader, texture, palette, art style, menu or humour changes.

## Published native reproduction

[live-probe.json](live-probe.json) uses the actual native `tree:2:60` (`fir/fir-spire`) geometry, mask and world matrix from live 0.0.38 `4ea5b5a`. Reapply each complete repair to a clone after construction: original moves zero parts and retains three isolated alpha-aware components; candidate moves three, drops zero, and leaves zero isolated candidates. Leaf triangles **5,936 → 5,936**, split vertices **5,255 → 5,264**. This helper repro is separate from the complete construction runs below (where subsequent twig support also executes).

The original whole-near-forest alpha-aware audit gives **53 isolated candidate components across 451 trees**. It also returns 283,709 broader distance-flagged opaque-triangle components; those are not 283,709 disconnected tree crowns. The baseline root audit finds **0 candidates / 0 unsupported samples out of 5,551 samples on 451 roots**. No root change is proposed.

A discarded collapsed-triangle hypothesis changed no live counts: the source near leaves contain no zero-area triangles. It produced no production change.

## Complete old/new world proof

Two independent native High worlds, sequentially loaded with only `leafIslands.ts` selected between the pinned original and candidate. The normal forest constructor and subsequent twig-support pass run in each. The target label, matrix and all five cameras/targets match exactly. Time/wind are frozen before rendering. No load-only raster suppression remains when images are drawn (asserted). Post/MSAA and auxiliary passes are retained.

Alpha-aware near audit (`gap=.75`, `woodReach=1.5` world metres, `maxOperations=300000000`):

| Metric | Original | Candidate |
| --- | ---: | ---: |
| Trees / complete | 451 / true | 451 / true |
| Opaque-triangle components | 2,441,379 | 2,441,379 |
| Isolated candidate components | 53 | 0 |
| Broader distance-flagged components | 283,709 | 283,523 |
| Distance-flagged clumps | 5,329 | 5,259 |
| Trees with distance flags | 240 | 240 |

**This is partial**: the broader distance flags remain, and this sampled rest-geometry audit does not prove visual connectivity under wind, every LOD or all views. The selected fir fragments are occluded in these player-height captures. The 19 changed overview pixels are not proof that those exact three target fragments are visibly resolved; some changes are on other affected instances/shadows. No broad visual-quality score or live-shipped fix is claimed.

Twenty PNGs: each pose/mode has two RGB-identical repeats. Four cross-build poses are RGB-identical. The fir overview differs by 19 RGB pixels. Draws/triangles match at every pose. These are actual complete source builds, not an isolated substitute scene or a walk clip.

| Pose | Original / candidate draws | Original / candidate triangles | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fir-overview | 682 / 682 | 11,004,525 / 11,004,525 | 19 |
| fir-lower | 233 / 233 | 3,933,528 / 3,933,528 | 0 |
| fir-upper | 236 / 236 | 3,911,673 / 3,911,673 | 0 |
| fence-control | 602 / 602 | 7,110,257 / 7,110,257 | 0 |
| sea-control | 137 / 137 | 778,895 / 778,895 | 0 |

## Cost and regression

20 focused tests pass: `npx vitest run tests/presentation/leafIslands.test.ts tests/presentation/leafIslandSearchScratch.test.ts tests/presentation/canopyAlphaSampling.test.ts`. Build passes. The regression fails on original code (zero repaired islands instead of two), verifies the cached 192-pattern coordinates, and retains attached/proven-transparent controls.

All 60 construction inputs have matching pre-repair vertex/triangle counts. All retain their triangle counts, with **26 extra split vertices in total across the source templates** (nine on the selected fir). Added unique-vertex processing/load bytes are not claimed to be zero. The shader code and texture taps are unchanged; the repair adds no per-frame JS work.

| Instrumented construction counter | Original | Candidate |
| --- | ---: | ---: |
| Templates | 60 | 60 |
| Alpha lookups | 5,062,001 | 16,949,836 |
| Conservative-hint calls | 18,987 | 18,987 |
| Moved islands, source templates | 525 | 535 |
| Dropped islands | 0 | 0 |
| Single instrumented construction elapsed ms | 2399.8 | 3703.5 |

This adds **11,887,835 load-only alpha probes** in this world (635 cached positive UV patterns × 18,721). The single cold instrumented elapsed sum is advisory, includes counter overhead/scheduling and is not a paired CPU benchmark, frame timing, GPU or Mac heat result. This is a correctness tradeoff, not a performance win. Historical live16 ~33 ms frames are not established as fixed.

Reproduce from the candidate checkout with Chrome/dependencies: `node tools/repro-leaf-fine-worlds.mjs [output-directory]`. Fetch the pinned original if shallow. The tool creates two sequential source builds, instruments load-only counters, runs the real audit, and records repeat-stable frames and pixel deltas. The compiled stock budget is supplied separately; no PASS is inferred from these source captures.
## Current-head compiled budget

Unmodified stock gate on `d6c5eb1582dc183b67347869afe7f8ff01611659`: live **285 draws / 3,046,047 triangles / 0 errors**, candidate **285 draws / 3,046,047 triangles / 0 errors**. Two matching-revision live probes, four distinct completed samples per probe/candidate, default limits, no allowance, hook or sampler edits. [Raw receipt](budget.txt). This fixed placement does not prove hardware pacing, Mac heat or the historical live16 ~33 ms cause; those remain open. Added source split vertices/load sampling are documented above rather than claimed free.
