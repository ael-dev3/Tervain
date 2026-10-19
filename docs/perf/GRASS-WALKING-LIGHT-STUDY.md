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

## Retina strafe/turn result

Completed on the same published revision. Requested 1470×956/DPR2; native High buffer **2205×1434**, effective DPR1.5. Three poses over 1.3 m, yaw −8°/0°/+8°, camera starts (6,2.677,23), looking 80 m forward with a 1.2 m downward offset. The [recorded phase](proofs/grass-walking-light/retina/controls.json) reuses the earlier validated strafe/turn study, rather than the pilot's wind phase. All three inactive/restored RGB controls are exact and console/GL errors are zero. The earlier attempted west-facing Retina fixture looked into a house and was rejected; it produced no completed result and is not used here.

| Removed contribution | Affected observations | Baseline/ablated luminance ≥140 | Baseline/ablated luminance ≥180 | Baseline/ablated jumps >60 |
| --- | ---: | ---: | ---: | ---: |
| Transmission | 199,496 | 0 / 0 | 0 / 0 | 6,382 / 6,027 |
| Sheen | 1,823,555 | **1,780 / 1** | **0 / 0** | 215,597 / 99,907 |

The sheen expression in `grassMaterial.ts`, `directLight.color * material.diffuseColor * sheen * G_SHEEN * 0.9`, drives these **warm luminance-140 glints** at this view and phase. Disabling it is an attribution experiment, **not a proposed production fix**. Transmission does not account for the brightest grass observations in this sample. Maximum baseline luminance in the sheen-affected set is **169.3542**, compared with **133.6786** in the transmission-affected set. Whole-image strict-white count is zero in every pose. The near-white ≥180 report remains unreproduced here; do not relabel the lower threshold as white or conclude the bug is cleared.

Counts are per-frame observations, not unique blades. Temporal jumps include normal camera motion and geometry disocclusion; a union event can also have a bright **background** endpoint outside the grass-lighting-affected set. Therefore the temporal reduction is not a pure sparkle score and must not be used as a visual PASS. The two routes also differ in wind phase and viewport; their raw counts are not an A/B comparison with each other.

[Full report](proofs/grass-walking-light/retina/report.json) · [summary](proofs/grass-walking-light/retina/summary.json) · [baseline](proofs/grass-walking-light/retina/baseline-1.webp) · [transmission off](proofs/grass-walking-light/retina/noThrough-1.webp) · [sheen off](proofs/grass-walking-light/retina/noSheen-1.webp) · [three-pose preview](proofs/grass-walking-light/retina/three-poses.mp4).

The three stills use lossless WebP, with decoded RGB verified identical to the source native PNGs. The [manifest](proofs/grass-walking-light/retina/rgb-manifest.json) records decoded RGB hashes for all retained PNGs, including inactive/restored controls. The MP4 is a **2 fps three-pose preview**, not a real-time gameplay recording; it adds one padding column for codec alignment. The source script can regenerate every capture. Reproduce the Retina route with the controls file above, `--route strafe --x 6 --z 26 --width 1470 --height 956 --dpr 2`. No application files were changed, so there is no candidate release-budget or hardware-FPS claim.
