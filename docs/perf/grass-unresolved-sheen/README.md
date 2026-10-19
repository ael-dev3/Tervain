# Unresolved grass sheen: partial motion-sparkle fix

Production head: `d3f93f90e35185e0882afb22f0dbe4615026a8cb`. Published baseline: 0.0.33, `b317734`.

The blade's projected coverage already fades between 0.8 and 2.5 pixels. Its sheen used the transmission thickness factor, which retains a 0.4 floor even at zero coverage. The fix reads the existing coverage value for sheen. It leaves resolved blades, transmission, fragment shading, geometry, colours and animation unchanged. This changes subpixel highlight energy and is not pixel-identical overall.

## Reproduction

Run the motion and shader tools from this evidence branch against the production candidate build or the published baseline. The motion tool accepts `--url`, `--native candidate` (omit for baseline), `--frames`, `--hour`, `--width`, `--height`, `--dpr`, and `--out`. Defaults are 31 poses, hour 17.5, 1470×956 at requested DPR 2. High applies its native 1.5 DPR cap, yielding 2205×1434 pixels. Native post-processing and 4-sample MSAA remain enabled.

The camera advances at 2.6 m/s sampled at synthetic 60 Hz, while rotating 16°. It freezes the recorded wind, time, clouds, actors and shadows to isolate coverage. The first compiled-native frame must equal the matching instrumented mode; inactive instrumentation must be RGB-identical. Each final replay pose is tested baseline→candidate→restored baseline. Water reflections are refreshed equally in both modes, and native scene draw/triangle rosters must match. These are controlled walking-speed camera samples, not collision gameplay or measured hardware frame times.

`tools/summarize-grass-sheen-motion.mjs` counts luminance ≥140 observations, ≥180 near-white observations and temporal luminance jumps >60; a bright jump has at least one endpoint ≥140. The causal domain is the union of same-pose before/after RGB changes (including post neighbours and disocclusion), not a semantic grass-only mask or a pure shimmer score. The native 1280×720 grass crop also reports connected bright components. Components use all bright crop pixels for connectivity and are included only when touching the effect mask; sizes are observations, not tracked blades.

`tools/encode-grass-sheen-proof.mjs` writes native-pixel lossless grass-crop clips and decodes every frame to verify its RGB SHA-256 against the source PNG crop. The side-by-side MP4 is a lossy quarter-speed illustration; measurements use original pixels. Full-size context stills are supplied separately.

## Initial live pilot

Seven poses cover 0.26 m. Warm bright observations: 6,280→5,331; bright temporal jumps: 8,977→7,931. Mean whole-image display luminance: 60.502→60.306 (−0.32%). The crop has 161→115 single-pixel bright-component observations and 148→116 two-to-four-pixel observations. Near-white and strict-white affected observations are zero in both modes. This is a partial warm-sparkle fix, **not proof that reported white specks are closed**.

The pilot has exact inactive and endpoint restore controls; its summary deliberately reports `verificationPass: false` because the earlier capture did not retain all-pose restore/roster checks. The completed candidate replay will carry those stronger checks. Pilot total auxiliary draw counts must not be treated as savings: reflection cadence was not forced equal in the earlier tool.

## Shader and tests

270 actual WebGL2 transform-feedback cases pass: 20 unresolved positive highlights become zero; 45 resolved pairs and all 270 transmission pairs remain exact. The complete vertex source differs only by the existing coverage operand; fragment source and runtime update source are identical (apart from program key). Added source arithmetic and texture instructions: zero. This is not a compiled instruction/register or hardware GPU-time measurement.

45 focused tests and the production build/type-check pass. The old shader fails five regression cases and the unresolved GPU endpoint assertion. Final motion and exact-head budget receipts pass; see the candidate summary, capture report, lossless clips and budget receipt in this directory.

## Completed candidate replay



Matched live-equivalent **0.0.33 · b317734** versus candidate **d3f93f90e**, 31 native post/MSAA poses, 1.3 m at 2.6 m/s sampled at synthetic 60 Hz; camera yaw −8°→+8°. Requested 1470×956 DPR2; native High cap yields 2205×1434 DPR1.5. Recorded phase/time/wind/actors/shadows frozen. This is a controlled camera replay, not hardware FPS or collision gameplay.

| Measurement | Before → after |
| --- | ---: |
| Whole-scene affected bright observations (luminance ≥140) | 26,521 → 22,228 |
| Whole-scene affected bright temporal jumps (>60, endpoint ≥140) | 40,909 → 35,561 |
| Native grass-crop bright observations | 17,845 → 15,055 |
| Native grass-crop bright temporal jumps | 28,249 → 24,502 |
| Single-pixel bright component observations (crop) | 722 → 494 |
| Two-to-four-pixel bright component observations (crop) | 743 → 513 |
| Affected near-white observations (≥180) | 0 → 0 |
| Affected strict-white observations (RGB minimum ≥245) | 0 → 0 |
| Mean whole-image display luminance change | -0.335% |

**Partial warm-sparkle fix; white-speck report remains open.** The causal effect mask includes post neighbours/disocclusion and is not a semantic grass mask or pure shimmer metric. Every pose restores baseline RGB exactly; inactive instrumentation is exact; compiled native candidate matches probe mode. Water reflection refreshed equally; all scene rosters match. Native lossless grass-crop clips are decoded and verified frame-by-frame against PNG RGB hashes. MP4 is a lossy quarter-speed preview, not the metric source. Full-size start/middle/end stills provide context.


