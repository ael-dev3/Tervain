# Repeatable frozen meadow capture

`tools/capture-frozen-grass.mjs` measures the noise floor before attributing a bright-pixel difference to a change. It does not alter application code, shaders, grass colours or visibility. It reads any supplied build URL, including a preview served from the current checkout.

```sh
node tools/capture-frozen-grass.mjs --url https://ael-dev3.github.io/Tervain/ --out live-grass
node tools/capture-frozen-grass.mjs --url PREVIEW_URL --reference live-grass --out candidate-grass
```

The default is High, a 1470 × 956 CSS window at DPR 2, eight frames after four warm-up renders, and **two independent browser launches**. `--frames N`, `--repeats N`, `--warmup N`, `--width`, `--height` and `--dpr` configure sampling. Both compared runs must use the same settings. `--head COMMIT` additionally requires the served revision to match. The tool rejects a deployment during a capture or across repeats, console/GL errors, blank frames, a disabled native post/MSAA path and drifting frozen controls.

The fixed meadow-edge pose is x=6, z=26: camera (x+3, terrain height+1.4, z+1.1), looking at (x−29, height+0.3, z−10.7), toward the low sun. Optional `--x` / `--z` select another fixed location. The hero is placed at (x+6,z+5), behind this camera, to keep its idle pose out of the grass rectangle. Other native actors remain visible if present; inspect retained frames. Default hour is 17.5 (`--hour` changes it). Clouds, wind time/direction/gust scroll, tree sway, post grain and water clocks are explicit constants. Simulation and interactions are frozen. Native rendering, materials, post-processing and four-sample MSAA remain active. Shadows warm before being held fixed. The tool fixes the native render-scale multiplier to 1 and uses the application’s own resize path and preset pixel-ratio cap. At High/DPR 2 the current cap is 1.5 (2205 × 1434 drawing pixels for this window). Requested DPR and actual buffer are recorded separately. It does not bypass the runtime cap or inherit an adaptive-resolution history.

The ROI spans the central 80% horizontally and 35–95% vertically. It is a **grass-region rectangle**, including ground/background and possibly actors, not a semantic blade mask. Retained full-frame PNGs let a reviewer inspect contamination. Never describe every measured bright pixel as a grass blade without additional attribution.

## Metrics

`report.json` contains each build revision, camera/projection, all phase controls, requested and actual buffer size, per-frame draws/triangles, PNG filenames and cropped RGB hashes. A root `complete:true` report is written only after all requested captures and validation succeed; each run also has its own report. Read only the N frames listed in the manifest, not leftover directory contents.

Display luminance is `0.2126 R + 0.7152 G + 0.0722 B` on decoded RGB values 0–255 (not linear radiance). Population variance uses all N observations at each fixed coordinate. Reported aggregates include mean, p95 and maximum variance, varying-coordinate count, per-frame bright count, and consecutive-frame jumps greater than 60 at pixels bright in either frame. The bright threshold is luminance ≥180. `--bright` and `--jump` override these thresholds. A persistently bright pixel has zero temporal variance. A run with no bright pixels returns a **null bright-population summary**, not proof that sparkle is fixed.

The independent-launch comparison reports changed RGB pixels, brightness-mask membership changes, jumps and Jaccard overlap. `--reference` compares the first retained image against another build after checking pose, projection, phase, resolution and sampling settings. A changed image is an observation, not a quality PASS or proof of causation. Inspect both builds' within-run variance and independent-launch disagreement before interpreting their difference. One launch cannot establish cross-launch repeatability.

Frozen captures measure capture noise and static instability. Zero variance does **not** clear sparkle during walking/turning, and capture time is not hardware frame time. There is no automatic visual-quality PASS or accepted-effect threshold.

## Validation

The metric tests include a known 100→220→100 transient (variance 3,200 at that coordinate), identical bright controls, dark-only transients, threshold boundaries, independent bright-mask disagreement and malformed inputs. A read-only tool adds zero production draws, triangles, shader work or per-frame JS; native capture counts are reported separately.


## Self-verification on 0.0.33

Native live `b317734`, High, 1470×956 CSS / requested DPR 2 / actual 2205×1434, four frames per launch after four warm-ups, two independent launches. All **1,517,040** ROI pixels match exactly between launches. Each sequence has the same **521 bright coordinates**, zero population variance (mean/p95/max), and zero >60 luminance jumps. Bright-mask Jaccard overlap is **1**. Actual capture draws/triangles are **296 / 5,949,281** per retained frame, errors zero.

This is a **mixed-region repeatability control**, not 521 grass glints or proof that walking sparkle is fixed. The retained PNGs include background in the ROI; the near foreground grass is darker. Inspect the images before any blade-attribution claim.

[Complete live report](proofs/grass-frozen/live/report.json), [first launch](proofs/grass-frozen/live/run-0/0000.png), [independent launch](proofs/grass-frozen/live/run-1/0000.png). All N frames are retained for independent recomputation; producer/helper source hashes are in the report.

The stock software budget on head `d5b2ce053` passes: live **b317734** / candidate **d5b2ce053**, **285 / 285 draws**, **3,048,306 / 3,048,306 triangles**, **0 / 0 errors**. Two same-revision live probes, four completed frames per probe, allowance 0, actual exit 0. Producer and sampler unchanged. [Budget receipt](proofs/grass-frozen/budget.json). This is a different camera from the measurement fixture.

`play-gate: PASS d5b2ce053`

## Preview URL and reference comparison

Ran the same four-frame/two-launch profile against the compiled `d5b2ce053` preview using `--url`, `--head` and `--reference` pointing to the completed live capture. Both preview sequences have the same 521 bright coordinates, zero mean/p95/max variance and zero >60 jumps. Its two cold launches match all 1,517,040 ROI pixels exactly. The preview/live reference comparison likewise has **zero changed pixels**, zero bright-membership changes and Jaccard **1**. Native draws/triangles remain **296 / 5,949,281** in every retained preview frame, zero errors.

[Complete preview/reference report](proofs/grass-frozen/preview/report.json), [preview first launch](proofs/grass-frozen/preview/run-0/0000.png), [preview independent launch](proofs/grass-frozen/preview/run-1/0000.png). All captured frames and source fingerprints are retained. This verifies the generic build-URL/reference path; it is an A/A production-rendering control because this PR changes no application code.

The zero noise floor is measured on this software renderer. Hardware users should establish their own A/A baseline on the same browser/GPU/profile before comparing a candidate. No cross-renderer pixel-identity or hardware timing claim.
