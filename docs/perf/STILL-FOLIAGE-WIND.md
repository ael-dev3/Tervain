# Skip the foliage motion shader when strength is zero

Published repro: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), native oak `tree:wild:40:42` and the surrounding wooded view; related to foliage/performance in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

Reduced Motion sets the shared foliage strength to zero. Every wind, mover and strike term in `tvFoliageOffset` is then zero, but the original shader still calculates its gust, sway and flutter before multiplying the result away. Wood calls the gust sampler once; leaves call it twice.

Return zero immediately when `uFoliageWind == 0.0`. The active path is unchanged, including movers and strikes. This shared function serves tree colour/depth/shadow programs and forest-floor plants; their program keys are updated. No geometry, textures, colours, wind settings or motion parameters change. This targets the zero-strength path, not default active-wind performance.

## Native proof

The replay loads the original and candidate wind declarations and verifies the original matches the native material hook. It samples 256 native wood vertices and 256 native leaf vertices with the actual instance transform and native wind uniforms. An instrumented software-WebGL shader counts logical gust-sampler wrapper calls; a second capture checks deformed positions are unchanged and nonblank. The active-wind pose must differ from the still pose so the control cannot pass with motion accidentally disabled.

These counters measure instrumented GLSL calls, **not physical texture transactions, memory bytes or hardware GPU time**. The instrumentation itself is not used for the screenshots. Uninstrumented native forest captures through the post pipeline compare both zero and active wind, overlaying the declaration on tree wood/leaf material hooks. Geometry hashes, render counts and raw image pixels must match. Film grain is held still for the image comparison; the active wind uniform and time are controlled explicitly.

| Check | Before | After |
| --- | ---: | ---: |
| Still wood sampler calls, 256 sampled vertices | 256 | 0 |
| Still leaf sampler calls, 256 sampled vertices | 512 | 0 |
| Active wood sampler calls, 256 sampled vertices | 256 | 256 |
| Active leaf sampler calls, 256 sampled vertices | 512 | 512 |
| Inspection draw calls | 184 | 184 |
| Inspection triangles | 1,166,205 | 1,166,205 |

All four deformed-position hashes match across the change. Both zero- and active-wind full-scene images have zero changed channels, and the geometry-buffer hashes match. The unchanged-source control retains the still sampler calls and correctly returns `pass: false`.

[Still before](../../proofs/still-foliage-wind/before-0.png) · [still after](../../proofs/still-foliage-wind/after-0.png) · [active before](../../proofs/still-foliage-wind/before-1.png) · [active after](../../proofs/still-foliage-wind/after-1.png) · [receipt](../../proofs/still-foliage-wind/report.json) · [unchanged-source control](../../proofs/still-foliage-wind/unchanged-source-control.json)

## Reproduce

```sh
node tools/repro-live-still-foliage.mjs --out still-foliage-proof
node tools/repro-live-still-foliage.mjs --candidate-ref 421d34b --images 0 --out still-foliage-control
```

The first command must pass; the unchanged-source control must fail because its zero-strength calls remain. Defaults are live Pages and software WebGL. This is not a hardware play-gate or a measured frame-time/heat improvement. The GPU gate data remains separate.

Validation: native GPU regression fails before the fix; 46 foliage/bark/pine/floor tests and production build pass. Stacked on #584.
