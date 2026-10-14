# Published 0.0.18 verification

Target: https://ael-dev3.github.io/Tervain/ . The published version endpoint and the visible title-screen stamp both report **0.0.18 · 421d34b**. Checks use the published application and asset bytes with certificate-verified transport, software WebGL and native post-processing/MSAA. They are correctness/metric checks, not measurements of frame pacing or heat on an integrated GPU.

## Crown support and hand-over

The alpha-aware audit covers all 453 registered tree/shrub targets at near and middle detail. Far detail has wood geometry for 325 targets; 128 pine targets remain leaf-only and are explicitly listed as missing support. Across seven samples in each of the two native medium-distance transition bands, all 6,342 expected samples execute. There are no entirely empty samples, but 768 wood/leaf coverage mismatches remain.

| Rest-geometry metric | Near | Middle | Far |
| --- | ---: | ---: | ---: |
| Targets with wood | 453/453 | 453/453 | 325/453 |
| Disconnected component candidates | 0 | 0 | 723 |
| Clumps beyond the direct 1.5 m wood reach | 43,491 | 25,763 | 8,360 |

The component-connectivity metric can pass while leaf clumps chain away from wood. The direct wood-reach metric is therefore retained separately; these geometric candidates still need visible-pixel review and are not confirmed floating objects. Both use alpha cutout sampling at six subdivisions, 0.75 m contact tolerance and 1.5 m direct wood reach on rest geometry. Wind deformation and screen-space exposure are outside this audit.

The previous 0.0.16 receipt reports the same 128 missing far targets, 723 far component candidates and 768 unmatched transition samples. Direct-reach clump counts fall from 53,506/27,257/8,725 to 43,491/25,763/8,360, respectively. These counts are not the exposed-area video metric and should not be compared to its percentage improvement.

High retains full non-shrub models; the hand-over test deliberately enables medium-distance detail. Thus these findings do not overturn the High-preset dusk visual pass, and zero near/middle component candidates do not establish universal crown correctness.

[Crown summary](proofs/live-0018/crown-summary.json) · [Full compressed receipt](proofs/live-0018/crowns.json.gz) · [Previous receipt](proofs/live-foliage-motion/after-crowns.json).

```sh
node tools/audit-live-crown-transitions.mjs --url https://ael-dev3.github.io/Tervain/ --diagnostics "$DIAGNOSTIC_MODULE_ORIGIN" --out crown-transitions.json
```

Serve the checked-in diagnostic modules through Vite. The audit imports measurement routines; geometry and materials come from the target build.

## Grass motion and update pop-in

The existing recorded 0.0.16 receipt is the before baseline; it was not newly recaptured as 0.0.17. The new published 0.0.18 capture uses the same camera path beginning at (-7, 45), 640×360 High/native post-processing with a four-sample target, and the recorded sky-hour, wind, sway and post-phase controls. The gameplay clock metadata differs (19:28 before, 19:18 after); the sky hour is explicitly restored. Other release changes remain present, so this is a version comparison, not a causal shader ablation.

| Grass-region measurement | Recorded 0.0.16 | Published 0.0.18 |
| --- | ---: | ---: |
| Near-white flicker observations | 28 | 0 |
| ROI sparkle share | 0.55294% | 0.14334% |
| Alignment coverage | 99.55% | 99.54% |
| Grass-update pop events over 12 m | 0 | 0 |
| Events per metre | 0 | 0 |

All six new capture-validity assertions pass. Stationary sparkle and near-white flicker are zero; repeated same-camera draws are pixel-identical. Startup errors are empty in the new receipt; every controlled draw rejects GL errors and context loss. The before receipt separately retained startup error 1282; its controlled draws passed.

The walk contains 31 samples at 2.6 m/s and synthetic 60 Hz cadence, spanning 1.3 m. Counts are pixel observations, not distinct blades. The ROI includes non-grass surfaces. The separate 12 m sweep compares the same camera immediately before/after a grass update every 0.5 m, counting components of at least 16 pixels with channel delta ≥20. Zero events does not exclude a hard edge already on screen, gradual fading, other routes or other streaming systems.

[New receipt](proofs/live-0018/grass-walk.json) · [Before receipt](proofs/live-foliage-motion/after-walk.json) · [Native frame](proofs/live-0018/grass-frame.png) · [Lossless before/after clip](proofs/live-0018/grass-before-after.mp4).

In the comparison clip, left is 0.0.16 and right is 0.0.18. Its 31 original samples play at 12 fps for fivefold slower inspection. Decoding reproduces both source sequences with zero changed RGB channels ([verification](proofs/live-0018/video-verification.json)); the metrics use original PNG pixels.

```sh
node tools/capture-live-grass-walk.mjs --url https://ael-dev3.github.io/Tervain/ --controls docs/perf/proofs/grass-white-attribution/controls.json --quality high --frames 31 --metres 12 --out grass-walk
```

## Distance-runner validity

The documented `--size 640x360` argument previously reached Chrome with invalid dimensions. It now accepts the documented form and the legacy comma form, and rejects malformed, zero or oversized dimensions before changing output files. Six invalid-input checks preserve a marker in the output directory ([receipt](proofs/live-0018/size-parser.json)).

The runner also advanced wildlife inside its supposedly frozen scene. Across 20 native updates, 409 of 5,510 bone-local components changed with the original wildlife-active context; none changed with wildlife disabled ([native control](proofs/live-0018/distance-actor-control.json)). Streaming captures now disable wildlife by default and require a positive movement control plus a zero-change frozen control before recording the route. The preliminary mixed run is discarded.

```sh
node tools/check-distance-capture-size.mjs
node tools/capture-distance-walk.mjs --url https://ael-dev3.github.io/Tervain/ --from 20,52 --to 12,52 --size 640x360 --clip-step 1 --pop-step 0.5 --hour 19.3 --quality high --out distance-walk
```

An optional `REPRO_INIT_FILE` uses the same pre-navigation hook as the other live proof tools. It permits environment-specific transport without disabling certificate verification; it is not needed on a browser that can directly reach the published assets.

## Native playtest camera views

The grove, hill and woods cameras use the checked-in `visual-gate.mjs` positions. Nine stepped views of the published High scene pass GL-error/context-loss checks through native Grade, four-sample MSAA and water inputs. Wind/time/actors are frozen. Clips play three inspection views per second; they are not real-time walks or visual scores.

| Spot | Whole-pipeline draws | Whole-pipeline triangles |
| --- | ---: | ---: |
| Grove | 651–688 | 9.46–10.23 million |
| Hill | 242–247 | 2.59–2.79 million |
| Woods | 585–587 | 9.15–9.28 million |

The dense grove/woods views are a concrete geometry/submission lead for the integrated-GPU budget. These totals include the native pipeline's secondary passes; they are not isolated tree counts or GPU-time measurements. At the middle grove view, the forest's own counter reports 2,030,333 colour triangles plus 768,727 shadow triangles, before extra passes.

[Native receipt](proofs/live-0018/spots.json) · [Grove clip](proofs/live-0018/grove.mp4) · [Hill clip](proofs/live-0018/hill.mp4) · [Woods clip](proofs/live-0018/woods.mp4).

[Grove frame](proofs/live-0018/grove.png) · [Hill frame](proofs/live-0018/hill.png) · [Woods frame](proofs/live-0018/woods.png).

```sh
node tools/capture-live-foliage-spots.mjs --url https://ael-dev3.github.io/Tervain/ --frames 3 --out foliage-spots
```

Validation so far: five focused motion/video metric tests, six invalid-size CLI checks, the complete 31-frame grass walk/12 m sweep, all crown levels/6,342 transition samples, nine native spot views, and lossless comparison decoding.

## Evidence limits

The tracked GPU report in `docs/perf/LATEST.md` is **live16 / 0.0.16**, not this release. It cannot certify 0.0.18 performance. Hearth placement is already against walls in the current implementation; the remaining room quality score requires visual review rather than another assumed placement fix. Distant terrain texture quality and sustained integrated-GPU performance remain open.
