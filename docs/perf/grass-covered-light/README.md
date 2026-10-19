# Covered grass-light interpolation

This sampling study is stacked on #700. It preserves the authored lighting formulas, transmission floor, colours, instance counts and draw distances. It changes the two lighting varyings to centroid interpolation, matching the existing colour/edge vector.

An isolated WebGL2 fixture imports the actual production shader declarations and lighting macros. It supplies bounded, valid light values on subpixel triangles under four-sample MSAA. Ordinary interpolation produces 160 observations outside the vertex-light bounds; centroid interpolation produces zero. Bounds allow two byte levels for storage and sample-resolve rounding. Coverage is identical. Single-sample controls are pixel-identical, and the large resolved-triangle control differs by at most one channel byte. This proves an interpolation defect, not a live white-speck count or hardware speedup.

Reproduce from this proof branch:

```sh
node tools/repro-grass-light-interpolation.mjs output d3f93f90e 8b1f9958f
```

The paired native walking capture and exact-head render-budget run are separate checks. The compiled motion capture serves runtime commit `968143ca8`; final head `8b1f9958f` only corrects a test comment, with identical runtime source, public assets and build configuration. Its grass material SHA-256 is `47cd43f162c2310153f3fd7b1be577103f85d2af77aba4506f94553dd5111631`. The budget run targets the final head directly. Both are now complete; see the receipts below.

The preceding normal-distance pop-in probes are in [walk-popin](../walk-popin/README.md). They found no central abrupt events on the sampled short meadow and woods paths, so they do not justify changing fades, draw distance or density. They do not close the general pop-in report.


## Native walking receipt

[Report](report.json) · [summary](summary.json) · [before still](before-004.png) · [after still](after-004.png) · [slow side-by-side preview](side-by-side-preview.mp4) · [before lossless clip](before-lossless.mkv) · [after lossless clip](after-lossless.mkv).

Requested 1470×956 at DPR 2; native High caps this to DPR 1.5, yielding **2205×1434**, with native post and four-sample MSAA. Nine consecutive fixed-step input poses after 30 lead ticks, **0.24735 m** actual recorded travel near meadow (116, 36), low sun at 17:30, gradual camera yaw. This is a short controlled segment, not a long-route or hardware-FPS claim. Time/wind and the prepared shadow map are held, actors/input advance once per tick, reflections refresh equally for each pair. Before is parent #700; after is this qualifier correction. The compiled candidate's unmodified output equals its inactive adapter pixel-for-pixel; every before→after→before restore is RGB-exact. Draws, triangles and texture counts match at every paired pose, including all render passes.

| Observations across nine frames | Before | After |
| --- | ---: | ---: |
| Causal-mask luminance jumps >60 | 5,253 | 4,951 |
| Ground-region jumps >60 | 4,008 | 3,759 |
| Bright observations ≥140 | 41 | 36 |
| Bright-endpoint jumps >60 / endpoint ≥140 | 289 | 283 |
| Near-white observations ≥180 | 5 | 5 |
| Strict-white observations (minimum RGB ≥245) | 0 | 0 |
| Ground-region single-pixel bright components | 12 | 11 |
| Mean full-image display luminance | 50.673587 | 50.672585 |

Large jumps drop 5.75% overall and 6.21% in the predefined ground region; mean display luminance changes −0.00198%. Counts use the union of same-pose shader-affected pixels across consecutive frames. This includes post neighbours and reflections, not a semantic grass-only mask or tracked individual blades. The ground region is the full-width lower 75%, excluding the central hero rectangle, chosen before reading pair outcomes. All-frame and region results are both retained. **Near-white is unchanged; general white sparkle remains open.**

Both full-resolution lossless clips decode to source RGB exactly on every frame; see their verification JSON files. The reduced side-by-side preview is an inspection aid at 12× slow cadence, left before/right after. Metrics use full-resolution PNGs, not that preview.

Reproduce the compiled native-candidate capture and verification:

```sh
node tools/repro-grass-light-centroid-walk.mjs --url BUILD_URL --native candidate --x 116 --z 36 --out output
node tools/summarize-grass-light-centroid-walk.mjs output output/summary.json
node tools/encode-grass-light-centroid-walk.mjs output before
node tools/encode-grass-light-centroid-walk.mjs output after
node tools/preview-grass-light-centroid-walk.mjs output
```

## Cost and checks

[Exact-head stock budget receipt](budget.txt): live b317734 and final head 8b1f9958f both **285 draws / 3,048,306 triangles / zero console errors**, zero triangle allowance. The larger of two live probes is compared with the maximum of four completed candidate samples. This standard-scene count differs from the all-pass meadow replay count; they are separate measurements.

No added shader arithmetic, texture taps, uniform payload or production frame-update JS. Six varying scalars remain six; centroid-qualified scalars increase four→six. Hardware interpolation-unit cost, frame pacing and Mac heat are not measured here. 23 focused tests, type-check/build, software-WebGL and all CI test shards pass. The small rendered fixture and native captures are additional self-verification.
