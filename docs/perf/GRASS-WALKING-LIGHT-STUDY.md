# Low-sun walking grass lighting attribution

Read-only study on published 0.0.33 · b317734. No application or material changes are proposed. Browser-session shader ablations are diagnostic controls, not candidate artwork.

The capture reuses #695's explicit frozen phase, native canvas PNG capture, High/post/four-sample MSAA and preset resize cap. The camera moves 0.65 m per sample while time, wind and simulation remain fixed. Transmission and sheen are disabled independently. Original versus inactive instrumentation must match every RGB channel. Each pose ends with a restored baseline that must match its first capture exactly. Deployment changes, console/GL errors or missing shader markers reject the run.

```sh
node tools/study-grass-walking-light.mjs --out grass-light-pilot
node tools/summarize-grass-walking-light.mjs grass-light-pilot
node tools/study-grass-walking-light.mjs --x -7 --z 45 --width 1470 --height 956 --dpr 2 --out grass-light-retina
node tools/summarize-grass-walking-light.mjs grass-light-retina
```

`--url` accepts a preview or the published build. The native drawing-buffer dimensions are recorded separately from requested DPR. Raw PNGs are captured synchronously from the native canvas after the full `renderWorld` path. Shadows are warmed and held; this isolates lighting attribution with a fixed shadow map, not normal gameplay or shadow-motion verification.

## Village-edge pilot

Three poses, 1.3 m total, hour 17.5, 640×360. Camera starts (9,2.477,27.1), looking toward (-23,1.377,15.3). All inactive and restored controls match exactly; zero console errors. The report retains the other two camera matrices.

| Lighting contribution removed | Affected pixel observations | Baseline luminance ≥180 | Ablated luminance ≥180 | Baseline jumps >60 | Ablated jumps >60 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Transmission | 193,823 | 0 | 0 | 248 | 223 |
| Sheen | 10,988 | 0 | 0 | 158 | 108 |

These are observations across frames, not unique pixels. The temporal domain is the union of pixels affected by that lighting term in either consecutive pose. Camera-motion disocclusion remains included, so these jump reductions alone do **not** establish a sparkle fix. No attributed pixel reaches luminance 180; maximum baseline luminance is 126.224 in the transmission-affected set. Strict-white count (all RGB channels ≥245) is zero in every whole image. Bright background pixels are not classified as grass glints.

This village-edge route does not reproduce the reported near-white grass specks. It neither clears the bug nor attributes it to a parameter. A separate open-meadow Retina-size run is required before drawing that conclusion.

[Raw report](proofs/grass-walking-light/pilot/report.json) · [summary](proofs/grass-walking-light/pilot/summary.json) · [baseline](proofs/grass-walking-light/pilot/baseline-1.png) · [transmission off](proofs/grass-walking-light/pilot/noThrough-1.png) · [sheen off](proofs/grass-walking-light/pilot/noSheen-1.png)

The draw counts in the raw report include native auxiliary passes and vary by pose. This is not a release-budget receipt or hardware frame-time measurement. Software rendering does not establish MacBook performance.
