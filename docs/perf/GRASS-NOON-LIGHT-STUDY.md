# Noon grass bright-observation attribution

Read-only native capture on published **0.0.33 · b317734**. Earlier low-sun sampling did not reproduce luminance-180 grass-lighting observations. This repeats the frozen-phase strafe/turn at **hour 11.5**, with no application changes.

Requested 1470×956/DPR2, actual native High buffer **2205×1434**, post and MSAA4. Three camera poses cover 1.3 m and −8°→+8° yaw, starting (6,2.677,23), looking 80 m forward with a 1.2 m downward offset. Simulation, wind/cloud/post phase, actors and warmed shadows are held fixed. This is a short synthetic camera walk, not input-driven gameplay, a complete meadow survey or hardware frame timing.

Inactive shader instrumentation matches every RGB channel of the native original. At each pose, restored baseline pixels also match exactly. Deployment is unchanged, with zero console/GL errors. Lighting ablations exist only in the diagnostic browser session; source grass colours, lighting and materials are not modified in the application.

| Contribution disabled | Affected pixel observations | Baseline / ablated luminance ≥180 | Baseline / ablated luminance ≥220 | Baseline / ablated jumps >60 |
| --- | ---: | ---: | ---: | ---: |
| Transmission | 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Sheen | 2,581,040 | **1,165 / 23** | 0 / 0 | 247,878 / 155,990 |

Maximum baseline luminance in the sheen-affected set is **203.3922**; maximum after ablation is **185.7228**. Whole-image strict-white count (all channels ≥245) is zero at every pose. Disabling transmission changes no pixels at this lighting/view: its affected set is empty, so its maximum luminance is **null**, not evidence of black grass.

The direct-light `sheen * G_SHEEN * 0.9` contribution explains most luminance-180 observations in this sample. This is a stronger bright-glint reproduction than the low-sun route (which only reached 169.3542 in its sheen-affected set). It is **not** evidence that removing sheen is the correct fix: disabling it also changes 92,234→20,791 luminance-140 observations, so it affects intended broader lighting. No production clamp or appearance change is proposed.

Counts are observations across frames, not unique pixels or tracked blades. The lighting-difference domain isolates causal contribution, not exclusive grass ownership: post/MSAA can spread changes to neighbouring samples. Temporal jumps use the union of affected pixels in consecutive poses and include normal camera disocclusion. Bright endpoints can be background pixels. The 2,753→1,384 bright-endpoint jump count in the raw summary is therefore not a pure sparkle measure or visual PASS. No near-white ≥220 or strict-white bug is reproduced here.

A numerical follow-up is to test interpolation of `vGInfo`: colour/edge already use a centroid varying, while through/sheen use an ordinary varying with a clamp. Whether that remaining interpolation contributes to edge glints is **unproven**; changing the qualifier needs its own matched captures and fully covered controls. This study only attributes the observed radiance term.

[Baseline](proofs/grass-noon-light/baseline-1.webp) · [transmission off](proofs/grass-noon-light/noThrough-1.webp) · [sheen off](proofs/grass-noon-light/noSheen-1.webp) · [three-pose preview](proofs/grass-noon-light/three-poses.mp4) · [report](proofs/grass-noon-light/report.json) · [summary](proofs/grass-noon-light/summary.json) · [RGB hashes](proofs/grass-noon-light/rgb-manifest.json).

Stills are lossless WebP with decoded RGB checked against native PNGs. The MP4 is a 2 fps three-pose preview, with one padding column for codec alignment, not real-time video. The manifest records every original, inactive, per-mode and restored PNG. The full scene contains bright sky/background; whole-image luminance counts are not grass counts.

```sh
node tools/study-grass-walking-light.mjs --route strafe --controls docs/perf/proofs/grass-noon-light/controls.json --width 1470 --height 956 --dpr 2 --out noon-light
node tools/summarize-grass-walking-light.mjs noon-light
```

`--url` accepts a build/preview. The script uses native `renderWorld`, fixes the native scale multiplier and retains the preset DPR cap. Every ablation marker must exist exactly once. This is read-only evidence; there is no production candidate budget or claimed performance improvement.
