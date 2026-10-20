# Settled arrow trail culling

Candidate `a32cb5d31b2f35a44e9453f47cd885ec38daf0e2`, baseline/live 0.0.36 `81b8195fce20c102c4ce6ac63a672d0437686e2c`. Scripted visual-manager launches use real world terrain contacts, not player inventory/input. This is a retained-cap stress case with 24 lodged arrows, not typical gameplay or hardware FPS/heat evidence.

An initially uncullable zero-length trail warms the arrow program. Original code retains that setting for the full 25-second lodged lifetime. Candidate enables normal per-camera frustum culling after the initial 0.45-second impact interval. Initial warm-up is asserted submitted in both sources, including a native render. Active flights, geometry/materials, lifetime and on-screen trail draws are unchanged. Both Reduced Motion cases are regression-tested: original fails 2 new tests, candidate passes all 76 hunting tests and build.

## Native images and costs

One shared frozen High world, 640×360 DPR1, software WebGL, native post/MSAA. Separate original/candidate managers use real terrain sweeps; contact positions, retained transforms and trail scales match exactly. Two repeats per mode/pose; all 20 PNGs are independently RGB-identical by pose using Pillow and Sharp. See [pixel hashes](independent-pixels.json) and [raw report](report.json). Native raster is restored before screenshots. No new shader links during kept frames.

| Pose | Draws original → candidate | Triangles original → candidate | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fence | 935 → 887 | 7,463,402 → 7,462,826 | 0 |
| birch | 724 → 676 | 5,634,132 → 5,633,556 | 0 |
| bow | 915 → 867 | 7,738,024 → 7,737,448 | 0 |
| sea-unused | 137 → 137 | 778,895 → 778,895 | 0 |
| on-screen-control | 1,133 → 1,133 | 7,404,572 → 7,404,572 | 0 |

The three off-camera scenes remove exactly 48 trail draws / 576 triangles. The on-screen control retains all 48 trail draws; zero-arrow sea is unchanged. Fence and bow remove 96 matrix uniform calls / 6,144 matrix-payload bytes; birch removes 98 / 6,272 (includes renderer cache ordering). These are matrix-uniform payloads, not total upload bytes.

## CPU submission, diagnostic scope

Three warm rounds, nine rotating measured rounds ×12 frames per mode. Arrow update, explicit matrix sync and full native render submission included. GL draw entrypoints are intercepted only in this timing phase, after native captures; restored afterward. This is CPU/driver submission with counters, not GPU frame time or Mac pacing. See [raw timings](report.json) and [summary](cpu-summary.json).

| Mode | Average ms | p95 ms | Samples |
| --- | ---: | ---: | ---: |
| before | 2.067 | 2.500 | 108 |
| after | 2.017 | 2.300 | 108 |
| control | 2.026 | 2.200 | 108 |

The small candidate improvement overlaps the unchanged-source control. The deterministic removed submissions, rather than a general CPU speedup claim, are the firm result.

## Published-build repro

[live report](live/report.json), [original](live/live.png), [normal-culling control](live/culling-control.png). Published 0.0.36 retains 24 trails with frustum culling disabled after settling: 48 trail callback submissions → 0, identical RGB. Cold whole-scene counters include two other draw differences, so only callback-attributed 48/576 are credited; the warmed source pairs above remove that ambiguity.

## Independent foliage follow-up (not a repair)

[Audit](foliage/audit.json), [views](foliage/views.json), [birch ROI](foliage/birch-roi.json), [camera-cache check](foliage/camera-cache.json). High near LOD, unmasked, gap 0.75 m, woodReach 1.5 m, 300M operations: 117 selected fir/birch/palm trees; 2,948 distance-card flags / 162 groups, but zero unsupported connected-crown candidates. Fir 72 trees: 2,536/108; birch 28:244/41; palm 17:168/13. These selected labels/scopes are not directly comparable with older forest totals. Flags alone do not prove visible floating crowns.

At birch `tree:wild:71:20`, visible upper-edge patches (components 3169,3175,4007) are already within 1.481,1.339,1.377 m of wood. Extending generic distance seating would move 76 other components and miss these patches, so that candidate was rejected. All 451 current registered camera crowns match actual near geometry bounds within 1e-5; the source-order cache suspicion does not reproduce. Fir thin-alpha sampling is already covered by open #611. No tree geometry/style change is included here; crown defects remain open.

Repro tools are in `tools/`: run from the checkout with installed dependencies and a configured headless Chrome. Each accepts an output directory as its first argument. Source-paired repro imports original source from the pinned Git revision and candidate from the checkout. Read-only live scripts target the public Pages build. Compiled exact-head budget receipt is reported separately on #738.
