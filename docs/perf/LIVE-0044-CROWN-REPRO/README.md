# Published 0.0.44 crown diagnostics

Build `fcfd799`, High preset, 640×360 at DPR 1, software WebGL. The renderer is confirmed software; no hardware FPS or heat claim. Both studies finish against the same revision they loaded. All audits complete, zero console/GL errors and no context loss. Load-only raster suppression is restored and asserted off before screenshots. Native post-processing is retained.

## Coverage

451 placements includes **301 trees and 150 shrubs**; this differs from lower-preset inventories. Parameters: gap 0.75 world metres, woodReach 1.5 world metres, operation cap 300,000,000 per audit. These are rest-geometry flags, not visible defect counts.

| LOD | Distance-flagged cards | Clumps | Isolated candidates |
| --- | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 |
| 1 | 2652 | 202 | 0 |
| 2 | 17821 | 448 | 0 |

The separate alpha-aware near audit finds **53 isolated candidates / 281,843 distance-flagged components in 5,030 clumps**, not 281,843 visibly floating leaves. Thin-cutout witness omission is the separate pending #753 correction. Never mix alpha/non-alpha or different-LOD counts into a before/after claim.

## Repro targets and mechanism

- Fir `tree:2:62`, `fir/fir-spire`, origin (89.929, 1.071, 87.731), scale 2.183634. Middle LOD flags 48 cards in one clump. Camera (97.929, 12.399, 122.731), looking at (89.903, 27.581, 87.601): ground height +1.7 m. Its sharp thin foliage edges are visible in the normal scene; no alpha-only material attribution/quality score is claimed.
- Wood world-height span **49.787 m near → 20.427 m middle / 20.425 m far**; leaf span remains **51.794 m**. All three placement matrices are bit-identical. This rules out a per-LOD placement offset for this target. `flora.ts` adds the final fir/shorepine/palm support twigs only under `l === 0`; near clearance does not establish middle/far support. Extending/changing the tree is a visual decision, not implemented here.
- Oak `tree:wild:79:22`, `oak/hero-oak-b`, origin (119.956, 1.512, -23.715): 340 far-LOD distance flags in one clump. Camera (127.956, 5.239, 61.285) is blocked by the foreground giant tree. **Rejected as proof of visible detachment**; retained as a whole-scene control. Its matrices also match across LODs. Null wood-gap values mean the bounded search did not supply a finite distance, not a measured infinite gap.

## Motion

Two repeated 16-sample camera pans from −2° to +2°, fixed position, hour 15, time/wind/actors and the initial visibility selection frozen. **All 32 A/A frame pairs are RGB-identical.** This is camera-only aliasing/residual evidence, not a walking LOD-transition test. Lossless FFV1 clips play at 8 samples/s for inspection, not measured display cadence. Metrics use original RGB PNGs.

Upper 45% crop (640×162), Rec.709 luminance on a 0–255 scale: raw jumps >60 between adjacent samples; reversals require two opposite >60 changes and return within 20. Counts are observations, include ordinary optical motion and are not unique specks. Motion-compensated residual uses the existing shimmer metric (block 16, radius 8, threshold 18, maxCost 24); it includes shading/parallax/edges and has no calibrated visual PASS threshold.

| View | Raw jumps >60 | Reversals | Residual mean | Alignment share |
| --- | ---: | ---: | ---: | ---: |
| tree:wild:79:22 | 18109 | 2150 | 3.827139 | 0.9886 |
| tree:2:62 | 25298 | 1618 | 2.971601 | 0.9977 |

No confirmed production alpha/mip bug is inferred solely from these counts. The matching-path A/A controls prove reproducibility, not absence of movement shimmer.

## Hardware pacing remains unverified

`docs/perf/LATEST.md` still labels its hardware run `live16`, revision `9ab40b3`. Its 33.6 ms walk-fence frame has 14.2 ms main-thread busy; run-round 33.4/13.2 ms, bow 33.3/19.4 ms, Mac resume 33.4/12.9 ms. These are historical and cannot establish current 0.0.44 pacing or identify CPU vs GPU/compositor cause.

Hardware repro: the existing play gate, Mac profile at 1440×900 DPR 2, with pause/resume, walk-fence near (-2,35–39.5), run-round (-12.3,44.8), bow (-4,46). Pair the current live build with the candidate on a quiet GPU; retain frame/busy/long-task/upload data. Software-renderer wall times are deliberately excluded here.

## Reproduce the read-only studies

```sh
CHROME=<Chrome-binary> node tools/repro-live-0044-canopies.mjs live-canopy-study <build-url>
CHROME=<Chrome-binary> node tools/repro-live-0044-crown-pan.mjs live-crown-motion live-canopy-study/report.json <same-build-url>
```

The first tool records the full audits and three near-clear control views. The second targets the two recorded labels, requires the same build, and captures repeated pans. Labels are always accompanied by asset and world position because older fallback labels are not stable across presets. Scripts set diagnostic camera/clocks only; no production geometry/material changes.
