# Grass brightness coverage follows rendered width

## Reproduced defect

Live **0.0.26 · 03d82c3** estimates a grass blade's brightness footprint from nominal clump width. Its geometry also applies LOD presence, the blade/stalk profile and near-camera narrowing. A narrow or disappearing surface can therefore keep the dry tint, translucency and sheen budget of a wider surface. This is a sampling mismatch; no blade albedo texture or alpha-cutout mip chain is involved.

The fix reuses `gW * gNear * gProfile`, the across-blade span already used by `gBladePos`, for projected brightness coverage. Seed/flower coverage uses that same rendered span. Geometry, palette constants, lighting equations and density remain unchanged. The shader cache key advances.

The source regression evaluates the production width declaration against the across-blade geometry span: **five failures and one passing resolved control before, six passes after**. The selected grass suites pass **35 tests**; type-check and build pass. This is not a hardware frame-time result.

## Matched live shader intervention

High, browser 1440×900 at 2×. The game caps its drawing buffer to **2160×1350**; screenshots are 2880×1800 browser pixels. ANGLE SwiftShader, native post/MSAA4, hour 17.5, fixed wind/cloud/clock. Nine consecutive synthetic 60 Hz camera samples span 0.346667 m, not a long gameplay walkthrough.

At distance `d = frame * 2.6 / 60`, terrain is sampled at `(6-d,26)`; camera is `(9-d,height+1.4,27.1)` and looks at `(-23-d,height+0.3,15.3)`. This faces the low sun at a grazing angle. Screenshot ROI: x288/y630/w2304/h1080.

| Measurement | Live formula | Rendered width | Delta |
| --- | ---: | ---: | ---: |
| Grass-mask observations | 12,908,771 | 12,908,771 | 0 |
| Grass luminance ≥180 observations | 272 | 206 | −24.3% |
| Strict near-white observations | 0 | 0 | 0 |
| Bright changes >20, consecutive grass-mask intersection | 434 | 353 | −18.7% |
| Bright threshold entries, same intersection | 238 | 186 | −21.8% |
| Bright changes >20, consecutive grass-mask union | 741 | 661 | −10.8% |
| Maximum grass luminance | 199.6636 | 199.4510 | −0.2126 |
| Mean grass luminance | 72.1109 | 66.9001 | **−7.2%** |
| Generic motion-compensated ROI sparkle share | 0.5347% | 0.1986% | −62.9% |

Luminance uses decoded RGB weights .2126/.7152/.0722. Strict near-white means min RGB≥180, luminance≥200 and RGB spread≤40. Grass-contribution mask threshold is 64. Bright temporal changes have |ΔY|>20 and Y≥180 in either image. The intersection has 10,089,066 eligible pair observations; the union has 12,864,647. These raw events include ordinary motion and are not an isolated shimmer classifier. The generic ROI residual also includes other visible geometry.

**Limitations:** strict white specks were not reproduced, so this is a partial bright-transient fix. Mean grass luminance falls 7.2%; visual review must judge that tradeoff. This does not clear the wider sparkle report, whole-world streaming, hardware pacing or Mac thermals. Only groundcover preparation/update runs between sampled camera poses; wind, actors and interactions remain fixed, and shadows are held after warm-up. No raster-suppression preload was used. Native draws check fresh GL errors/context loss. Inactive intervention/mask instrumentation changes **zero original image channels**.

A separate nine-frame Retina view looking along +z at the same location/hour also reports strict white 0 across 13,575,604 grass observations, brightness≥180 count 470, peak 186.9622. It is a different view, not an A/B comparison.

## Evidence and reproduction

[Native same-pose before](proofs/grass-rendered-width/before.png) · [after](proofs/grass-rendered-width/after.png) · [paired motion clip, before left / after right, 4× slow](proofs/grass-rendered-width/paired-4x-slow.mp4).

The short clip is resized/encoded for viewing. Counts use original lossless screenshots; [all PNG hashes](proofs/grass-rendered-width/capture-sha256.json), [per-frame counts](proofs/grass-rendered-width/width-metrics.json), [capture report](proofs/grass-rendered-width/report.json) and [controls](proofs/grass-rendered-width/controls.json) are retained.

The portable acquisition controller retains the measured intervention, normalizes imports, and adds a compiled-build verification switch. `coveragePresence` is the retained diagnostic mode name; here it selects the complete rendered-width formula, not presence alone. The default intervention requires the unfixed shader and fails when that marker is absent. Supply an unfixed build URL after production moves on:

```sh
node docs/perf/proofs/grass-rendered-width/acquisition.mjs --controls docs/perf/proofs/grass-rendered-width/controls.json --x 6 --z 26 --frames 9 --modes baseline,mask,coveragePresence --out grass-width-proof
node docs/perf/proofs/grass-rendered-width/measure.mjs grass-width-proof
```

For a compiled candidate, use `--url <candidate-build> --compiled true --frames 3 --modes baseline,mask`; compare its `baseline-00..02` images with the intervention's `coveragePresence-00..02`. The compiled verification and exact-head budget result are posted on the PR after they complete. Capture provenance uses the loaded application's compiled revision, not a deployment endpoint fetched after loading.

## Cost scope

| Cost | Change |
| --- | --- |
| Geometry / instances / draw submission | None; measured maxima belong in the exact-head gate receipt |
| Textures / texture samples / uniforms / varyings | None |
| Per-frame JavaScript path | Unchanged; no CPU-ms benefit claimed |
| Arithmetic in the two footprint declarations, before compiler optimization | Multiplications 9→4; one addition removed; one `max` removed |

The static arithmetic count is not a GPU time measurement; compiler optimization may change actual instruction counts. The budget gate must run unmodified, without capture instrumentation, on the final compiled commit. No receipt is claimed by the intervention captures themselves.
