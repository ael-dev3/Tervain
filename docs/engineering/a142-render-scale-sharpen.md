# A142: render scale on a 2x laptop, and the final-pass sharpen

## How the drawing resolution is chosen (A113, unchanged)

- The preset's pixel ratio is a ceiling: `min(device ratio, 1.5)` on High and Medium, 1 on Low. A multiplier then scales it.
- The multiplier watches shown frames. A frame later than 23.3 ms (1.4 x 16.7 ms) is missed; gaps over 250 ms are ignored.
- More than 10% of the last 90 frames missed lowers it by 0.15. Fewer than 1% of the last 600 missed raises it by 0.1. After each change the windows clear and 90 frames are skipped.
- The floor is `min(1, max(0.75, preset x 0.5) / preset)`: 0.5 at preset 1.5, 0.75 on Low.
- It is off in shot mode, during benchmarks and when the setting is off.

On a 1440x900 screen at 2x on High the preset is 1.5, so the multiplier steps 1.0, 0.85, 0.70, 0.55, 0.50. The canvas falls from 2160x1350 to 1080x675, 0.75 drawn pixel per CSS pixel on a 2x screen. The multiplier settles at the largest step where fewer than 10% of frames exceed 23 ms, and rises again only after about 10 s of nearly perfect frames, so a loaded forest or village scene on such a laptop is likely to sit around 0.55 to 0.7 and look soft: MSAA stays on, the edges are just coarser. The floor and steps were deliberately not changed (fps cost).

## Sharpen

A contrast-adaptive sharpen runs inside the existing final grade pass: four neighbour taps of the scene colour, pulled away from their mean and clamped to the neighbourhood's range so edges gain no halo. It adds no render pass or material.

- Strength is `min(1, 2 x (1 - scale))`, applied only while the multiplier is below 0.9 (`sharpenStrength`, `src/platform/renderScale.ts`).
- `?sharpen=0` turns it off; `?sharpen=1` applies the formula at any scale. `?renderscale=0.75` fixes the multiplier, for comparing stills.
- Measured on the oak target at 0.75: draw calls and triangles identical; GPU time within run-to-run noise (median 4.8 ms off, 5.4 ms on over three runs, spread about 1.3 ms). Stills at 0.75 and 0.5 show crisper bark and leaf detail without halos. It cannot recover resolution; it only restores edge contrast.

## Low tier leaf edges

Without MSAA (Low), alpha to coverage degraded to a single cut at the alpha threshold: a one-pixel staircase with the leaf texture's dark rim round every card. The leaf cut-out now resolves the same coverage ramp (1.2 px) by a pixel-fixed dither when the scene target is not multisampled (`FOLIAGE_MSAA`, set by `Grade`). High and Medium are unchanged. Pan shimmer on Low rose from 3.9 to 4.7 (mean frame difference) in exchange for losing the outline.
