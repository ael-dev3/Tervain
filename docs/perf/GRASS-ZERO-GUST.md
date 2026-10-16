# Skip the broad grass gust sample at zero amplitude

Published repro: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), village grass view at world (18, 20), related to grass/performance in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

Reduced Motion sets `uWindDir.w`, the broad-gust amplitude, to zero. The grass vertex shader still samples that gust field, although its only use is multiplied by the zero amplitude in `gPush`. The separate turbulence sample still affects flutter and must remain.

Initialize the broad sample to zero and fetch it only when gust amplitude is nonzero. Update the grass shader program key. The steady lean, turbulence/flutter, trampling, blade shape, colours and all authored parameters remain unchanged. This targets disabled broad gusts, not default active-gust performance.

## Native proof

The replay retains a native drawn tile's instanced buffers and actual blade shader/wind/trample uniforms. A floating-point raster probe counts logical gust-sampler wrapper calls per surviving vertex, interpolated across the covered triangles. This is a raster witness, **not** a total GPU invocation count, physical texture-traffic count or timing measurement. Both before/after covered-pixel masks and view-position-buffer hashes must match. Zero and 0.42 gust-amplitude controls must have different positions, guarding against a dead field.

The native post-pipeline scene comparison uses uninstrumented grass shaders, changing only the actual blade block extracted from the candidate. Shader wind time and camera are held fixed. Recorded position/index/base/shape buffer hashes, render counts and image pixels must match in both gust modes.

| Check | Before | After |
| --- | ---: | ---: |
| Logical gust-sampler calls at zero amplitude (raster witness) | 2 | 1 |
| Logical gust-sampler calls at amplitude 0.42 | 2 | 2 |
| Zero-amplitude covered probe pixels | 8,641 | 8,641 |
| Active-amplitude covered probe pixels | 8,756 | 8,756 |
| Inspection draw calls | 105 | 105 |
| Inspection triangles | 570,640 | 570,640 |

Both view-position-buffer hashes match across the change. Both native scene comparisons have zero changed image channels. Recorded geometry/instance buffers match. The unchanged-source control retains two calls at zero amplitude and returns `pass: false`. The probe uses a native tile containing 99 clumps; covered pixels are not a count of vertex invocations.

[Zero-amplitude before](../../proofs/grass-zero-gust/before-0.png) · [after](../../proofs/grass-zero-gust/after-0.png) · [active before](../../proofs/grass-zero-gust/before-0.42.png) · [after](../../proofs/grass-zero-gust/after-0.42.png) · [receipt](../../proofs/grass-zero-gust/report.json) · [unchanged-source control](../../proofs/grass-zero-gust/unchanged-source-control.json)

## Reproduce

```sh
node tools/repro-live-grass-zero-gust.mjs --out grass-zero-gust-proof
node tools/repro-live-grass-zero-gust.mjs --candidate-ref 421d34b --images 0 --out grass-zero-gust-control
```

The first command must pass; the unchanged-source control must fail because it retains both gust-sampler calls. Defaults are live Pages and software WebGL. This does not measure a hardware FPS/heat gain or establish that grass sparkle is resolved. Hardware play-gate receipt remains outstanding.

Validation: native GPU regression fails before the fix; 29 grass engine/flower tests and production build pass. Stacked on #585.
