# Strict-white grass check: live 0.0.27

Published build **0.0.27 · 163ee68**, sampled at the backlit village meadow edge. No product source change or fix PR follows from this measurement. A negative result on this route does not close the reported grass sparkle issue.

## Collection

High, browser 1440×900 at 2×; actual render buffer 2160×1350 because of the preset's pixel-ratio cap. Native ANGLE SwiftShader, post enabled, MSAA4, no raster suppression. This is software rendering, not Apple hardware timing.

The sequence has **61 consecutive synthetic camera poses**, spaced 2.6/60 m, spanning **2.6 m**. For frame `n = 0..60`, let `d = n * 2.6 / 60`, and `h = terrain.heightAt(6-d,26)`. Camera position is `(9-d,h+1.4,27.1)`, looking at `(-23-d,h+0.3,15.3)`. Hour is 17.5. The recorded wind, sky and grade clocks are held; actors/player remain fixed. Groundcover presentation updates at each pose.

This isolates camera translation. It does **not** reproduce input locomotion, footsteps, wind animation, turns or continuous streaming. Capture calls `grade.render(scene,camera,0)`: the main picture and post/MSAA are native, but App water/interior capture preparation is not replayed. The synthetic playback cadence is not measured FPS.

A diagnostic material pass supplies a grass-contribution mask. Analysis uses screenshot ROI `(288,630,2304,1080)` and mask maximum RGB ≥64. Mixed antialiased pixels are approximate contribution, not unique grass ownership. The original image, inactive-instrumentation image and normal frame 0 have identical PNG SHA-256: `9079cecbbfc58e5e4b2c9c42bae68aa1abb0b3dcb9469415d1d2e2a71956f823`.

Strict white uses the existing tested classifier: minimum RGB ≥180, **rounded** decoded luminance ≥200, channel spread ≤40. Luminance is `0.2126 R + 0.7152 G + 0.0722 B` in decoded 8-bit RGB, not linear/HDR radiance. Counts are observations across frames, not unique blades or independent trials.

## Results

| Quantity | Observed |
| --- | ---: |
| Grass-mask observations | 82,527,824 |
| Strict-white observations | 0 |
| Luminance ≥180 observations | 1,099 |
| Maximum luminance | 203.4928 |
| Consecutive eligible observations | 70,628,376 |
| Consecutive changes >20 | 15,037,920 (21.2916%) |
| Inactive-instrumentation changed channels | 0 |

The reported **strict-white defect is not reproduced on this sequence**. Bright mask-qualified pixels and ordinary motion remain; the absence of strict-white observations is not a general shimmer PASS. No new root-cause fix or production PR is justified by this negative control.

The maximum occurs at frame 23, screenshot pixel `(2579,957)`, RGB `(231,199,167)`: on the cat/grass boundary in the [native witness image](proofs/grass-live27-walk/brightest.png). It fails the strict-white colour bounds. This also illustrates why a contribution-mask hit is not proof that all its brightness comes from grass.

Raw consecutive luminance changes >20 are counted only where both frames' masks qualify. They include ordinary camera motion and occlusion; they are **not** a shimmer-only metric. There is no before/after reduction claim because no new defect or production intervention has been established by this pass.

## Reproduce and verify

From the repository root, with Chrome available:

```sh
node docs/perf/proofs/grass-live27-walk/acquisition.mjs --controls docs/perf/proofs/grass-live27-walk/controls.json --compiled true --x 6 --z 26 --frames 61 --modes baseline,mask --out <capture-directory>
node docs/perf/proofs/grass-live27-walk/verify.mjs <capture-directory>/report.json
node docs/perf/proofs/grass-live27-walk/recount.mjs <capture-directory>
```

The collector rejects nonzero inactive-control changes and WebGL draw errors/context loss. The verifier checks the compiled revision, complete route, native profile and totals. The independent recount uses `rgbFrame` from the existing metric. These are collection checks, not a hardware/performance/quality gate. The existing foliage-motion and shimmer metric tests pass (9 tests). [Negative controls](proofs/grass-live27-walk/collection-controls.json) check that truncated samples, nonzero instrumentation changes and mismatched totals are rejected. The clip is a lossy viewing aid; counts use lossless captured PNGs.

[Mask example](proofs/grass-live27-walk/mask-start.png) · [Raw report](proofs/grass-live27-walk/report.json) · [Motion, slowed 4×](proofs/grass-live27-walk/walk-4x-slow.mp4) · [Start](proofs/grass-live27-walk/start.png) · [End](proofs/grass-live27-walk/end.png)
