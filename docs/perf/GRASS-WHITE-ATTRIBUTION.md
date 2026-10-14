# White grass flicker: source attribution

This diagnostic extends the native whole-scene capture in [LIVE-FOLIAGE-MOTION.md](LIVE-FOLIAGE-MOTION.md). It changes shaders only in the inspection page; it does not change production shaders, grass colours, geometry or settings.

Run against the published build or a production preview:

```sh
node tools/repro-grass-white-attribution.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --controls docs/perf/proofs/grass-white-attribution/controls.json \
  --out grass-white-attribution
```

The fixed route is a 1.3 m camera walk at the village edge, starting at (-7, 45): 31 samples at a synthetic 60 Hz and 2.6 m/s. It freezes clock, wind, actors and interactions, and renders the whole scene through the native post-processing and MSAA path. It is not a hardware frame-time benchmark or a survey of the entire meadow.

The diagnostic records normal grass, a grass-contribution mask, black grass colour with other objects unchanged, and separate removal of petal tint, straw tint, sheen and transmitted-light contributions. Each intervention preserves geometry, alpha/discards and depth. The mask indicates grass contribution, not exclusive pixel ownership: post-processing and translucent foregrounds can mix contributions.

Shader hooks keep their original cache-key identity. Before sampling, the instrumented scene with all controls enabled must match every original image channel. Every capture rejects a WebGL draw error or lost context. The near-white threshold and motion-alignment metric are the same as the preceding live walk report; counts are pixel observations across frames, not unique blades or objects. Removing a term is a causal diagnostic, not a proposed visual change or a quality pass.

## Published 0.0.17 results (5da2776)

High quality, 640×360 drawing buffer, native four-sample post target, fixed dusk controls. All 449 scene materials retain their original cache-key identity; two are grass materials. Inactive instrumentation changes **zero image channels**. All captured draws pass the fresh WebGL error check.

| Diagnostic setting | Near-white flicker observations | ROI sparkle share |
| --- | ---: | ---: |
| Normal | 28 | 0.552% |
| Black grass colour, other objects unchanged | 0 | 0.0105% |
| No petal-colour mix | 28 | 0.541% |
| No straw-colour mix | 14 | 0.322% |
| No added sheen | 28 | 0.525% |
| No transmitted-light contribution | 28 | 0.511% |

Alignment coverage is about 99.54% in each case. The straw mix contributes to the sampled flashes: removing it halves the near-white count and lowers overall ROI sparkle by about 42%. The other individual terms leave the near-white count unchanged. This does not rule out their joint contribution, all flowers, other times of day or other routes.

A separate five-frame window (source frames 7–11, measuring the three interior frames) rejects a tempting footprint fix: multiplying estimated width by the blade's visibility factor changes **5 → 5** white observations. Removing wrapped direct diffuse changes **5 → 4**. Neither demonstrates a sufficient fix. The footprint intervention changes 2,862 ROI channels by at most two levels, confirming it ran rather than silently doing nothing.

The production dry-colour term uses `gDry * 0.8` without `gBladeCov`; tip lift and several lighting contributions already use that coverage. The next diagnostic is to gate only that dry-colour term with the existing coverage, preserving palette constants and fully resolved blades. This report does **not** propose deleting straw colour or diffuse lighting from the game.

[Full walk receipt](proofs/grass-white-attribution/report.json) · [Footprint window receipt](proofs/grass-white-attribution/footprint-window.json) · [Original](proofs/grass-white-attribution/original.png) · [Inactive control](proofs/grass-white-attribution/control.png)

[Lossless motion comparison](proofs/grass-white-attribution/normal-vs-no-straw.mp4): normal on the left, straw-colour ablation on the right. The clip crops the whole-scene capture to the metric ROI and plays the same 31 frames at 12 fps for 5× slower inspection. Decoding reproduces every source RGB channel exactly ([verification](proofs/grass-white-attribution/video-verification.json)). Metrics use the original 60 Hz sample positions, not re-encoded frames. [Normal frame 9](proofs/grass-white-attribution/normal-09.png) · [No-straw frame 9](proofs/grass-white-attribution/no-straw-09.png).

To repeat the rejected width hypothesis or isolate wrapped lighting:

```sh
node tools/repro-grass-white-attribution.mjs \
  --controls docs/perf/proofs/grass-white-attribution/controls.json \
  --start 7 --frames 5 --modes baseline,mask,noWrapped,coveragePresence \
  --out grass-footprint-window
```

## Targeted dry-tint coverage test

The same five-frame window improves **5 → 1** near-white observations when only the `gDry * 0.8` weight is multiplied by the existing `gBladeCov`. Palette constants, geometry, thresholds and the seed-head term are retained. Inactive instrumentation is again pixel-identical; all draws pass the WebGL check. [Window receipt](proofs/grass-white-attribution/straw-coverage-window.json).

This small window is promising, not a full-walk fix receipt. The larger matched walk is being checked separately. To repeat the window:

```sh
node tools/repro-grass-white-attribution.mjs \
  --controls docs/perf/proofs/grass-white-attribution/controls.json \
  --start 7 --frames 5 --modes baseline,mask,strawCoverage \
  --out grass-straw-window
```

A subsequent experiment can reuse the original contribution masks with `--reference grass-white-attribution --modes baseline,strawCoverage`. It requires matching build, profile, controls and frame window, and verifies every newly captured normal image against the reference before using its mask. Geometry and depth are unchanged by the colour-only intervention. The receipt records the number of verified normal frames and reused masks; reference paths are not included.
