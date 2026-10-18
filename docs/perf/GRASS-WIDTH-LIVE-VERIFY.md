# Published grass-width fix: scoped native smoke check

Loaded application **0.0.27 · e0f5161**, published at https://ael-dev3.github.io/Tervain/ after #666 merged. Revision comes from the loaded application's diagnostic API, not only the deployment endpoint.

| Check | Result |
| --- | ---: |
| Native software camera samples | 3 |
| Original → inactive instrumentation changed channels | **0** |
| Grass-mask pixel observations | 4,338,127 |
| Strict near-white observations | **0** |
| Luminance≥180 observations | 57 |
| Maximum grass luminance | 195.392 / 255 |
| Fresh draw GL errors / context loss | 0 / 0 |

High, browser 1440×900@2×; actual drawing buffer 2160×1350 with native post/MSAA4. ANGLE SwiftShader, fixed controls, backlit grazing camera from the #666 repro. Three synthetic 60 Hz samples span only 0.086667 m. This is not a long gameplay walk, hardware timing/heat proof, visual-quality score or closure of strict white specks.

No intervention is enabled: the published shader already contains the fix. This checks the deployed build after merge. Do not compare its absolute brightness totals with 0.0.26 as a matched A/B: the 0.0.27 canopy release also changed tree geometry and shadows. The separate matched 0.0.26 before/after evidence and budget remain in [#666](https://github.com/ael-dev3/Tervain/pull/666), including its 7.2% mean grass-luminance tradeoff.

[Native first image](proofs/grass-width-live-e0f/live-native.png) · [capture report](proofs/grass-width-live-e0f/report.json) · [per-frame brightness](proofs/grass-width-live-e0f/brightness.json) · [original PNG hashes](proofs/grass-width-live-e0f/capture-sha256.json).

Reproduce from the repository root, selecting a software-WebGL Chrome through `CHROME`:

```sh
node docs/perf/proofs/grass-rendered-width/acquisition.mjs --compiled true --controls docs/perf/proofs/grass-rendered-width/controls.json --x 6 --z 26 --frames 3 --modes baseline,mask --out live-grass-width-check
```

No raster-suppression preload or new production code is involved. The [front-lit repeat-pose failure](GRASS-FRONTLIT-CONTROL.md) remains excluded; this check does not reinterpret that unstable view as a grass result.
