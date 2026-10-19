# Controlled live walk: visibility-update appearances

Published source: **0.0.33 · b317734**, High, default tree detail setting (`treeDetailByDistance: false`), normal view ranges, native post-processing and four-sample MSAA. Buffer: 960×540. No production visibility, density, colour or range change.

The meadow camera walks from (6, terrain+1.7, 23) to (9.9, terrain+1.7, 23), rotating −15°→+15°. Thirty-one samples cover 3.9 m at 2.6 m/s, sampled at synthetic 20 Hz. This is a short controlled camera replay, not a recorded hardware frame rate, collision walk, long streaming-grid scan or proof about every route.

At each new camera pose, render the previous visibility roster, then run the native forest/grass visibility update and render again at **the same pose**. This separates CPU streaming/culling changes from camera motion. Repeat the updated render and require exact RGB. Freeze time, wind, actors and shadow updates; refresh reflections equally. Count connected difference components of either sign inside the central 80% crop: channel difference ≥20 and area ≥16 pixels. They are appearance **candidates**, not semantic object IDs. This test cannot exclude GPU-only LOD/raster transitions, wind-dependent appearances, smaller/lower-contrast changes or untested paths.

## Completed meadow result

- **0 central appearance candidates, 0/m**, across all 31 samples.
- Every repeated updated render matches exactly; zero console errors.
- Whole-frame stale-versus-updated images differ only in seven samples: 1–3 pixels each, largest channel difference 17/255. There is no larger changed patch hidden by the central crop or the event threshold on this route.
- Maximum retained frame: 223 draws / 2,979,885 triangles. These are observed route costs, **not a separate budget-gate PASS**.
- Full-size lossless clip is decoded and each frame checked against PNG RGB. Matched stale/updated start, middle and end stills are supplied. They are before/after a visibility update, **not before/after a product fix**.
- The meadow run predates the deliberate missing-group positive-control addition (`positiveControl: null`); the woods run uses that stronger control. Both retain stable-render controls. No production fix is justified by this negative result alone.

## Reproduce

Use `tools/repro-walk-popin.mjs --url BUILD_URL --route meadow --frames 31 --out OUTPUT`, then `tools/summarize-walk-popin.mjs OUTPUT` and `tools/encode-walk-popin.mjs OUTPUT`. The current tool deliberately hides/restores the forest and ground-cover groups before the retained walk and requires the metric to detect that positive control without restore drift. The woods route is also supported. Tools default to the public Pages URL and permit a preview URL. Startup helpers may suppress drawing during load only; retained rasters reject suppression and GL errors.

No claim that player-reported pop-in is closed. A cheap streaming/culling fix was not reproduced on this short meadow route. GPU-only hand-over effects and the low-sun speck path remain separate investigations.
