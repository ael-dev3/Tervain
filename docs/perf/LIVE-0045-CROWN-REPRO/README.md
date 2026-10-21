# Current 0.0.45 canopy receipt

Published `9394371`, including the merged seat/floor/fine-witness/cleanup fixes. High, 640×360 DPR1, software WebGL. Same world-metre parameters as the 0.0.44 study: gap 0.75, woodReach 1.5, cap 300,000,000 operations per audit. All 451 placements (301 trees, 150 shrubs) covered completely; no missing wood or console/GL errors. The loaded/end revision matches.

**Near coarse audit: zero detached cards/clumps/candidates. Near alpha-aware isolated candidates: 53 on 0.0.44 → 0 now**, independently verifying the merged fine-witness correction. Other alpha-aware distance diagnostics are retained in report.json and are not labelled visible detached leaves.

| Retained LOD | Distance-flagged cards | Clumps |
| --- | ---: | ---: |
| 0 | 0 | 0 |
| 1 | 2649 | 202 |
| 2 | 19450 | 511 |

## Which levels actually draw

`floraPopulation.ts:floraLodWeights` returns `[1,0,0]` for default High non-shrub trees. Shrubs use separate bands; profiling overrides can select other tree levels. **Middle/far retained-geometry flags do not explain a mid/far LOD swap in the default High main view.** They are leads for lower presets/reflection proxies. Raw card counts across changed generated assets are not a visual-quality score.

The fir/spire at (89.929,1.071,87.731), label `tree:2:62`, still has the same placement matrix at all levels. Wood top above its base: near 49.787 m, middle/far 20.427 m; leaf top 52.407 m. The final support repair is near-only in `flora.ts`. This is a lower-detail support-coverage lead, not confirmation of a visible High floating clump. The two current normal-scene PNGs repeat the same fixed ground-height camera and are RGB-identical. They do not constitute a new motion or a cross-version pixel comparison.

Camera (97.929,12.399,122.731), target (89.903,27.581,87.601), hour15, frozen time/wind, original post path; load raster suppression restored/asserted off. Sharp thin foliage edges remain visible, but no alpha-only material/mip root cause is established. No geometry/material/style change proposed.

The earlier 0.0.44 repeated motion clips remain separately pinned under LIVE-0044-CROWN-REPRO; do not relabel their counts as 0.0.45. Hardware frame pacing remains unverified here: docs/perf/LATEST.md still identifies its hardware run as live16 / 9ab40b3. Software-renderer wall time is not Mac 60 Hz evidence.
