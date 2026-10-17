# Habitat interpolation helper reuse

Reference: [published 0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/) and [playtest checklist #326](https://github.com/ael-dev3/Tervain/issues/326). This is a small grass-streaming code-cost change, not a measured hardware hitch fix.

The grass generator samples Habitat before accepting or rejecting each candidate. `Habitat.sample` evaluates a local helper closure and calls it five times for its channels. Inline those five expressions while preserving the arithmetic order, tile lookup, interpolation weights and caller-owned output identity.

## Native replay result

| Work / equality control | Before | After |
| --- | ---: | ---: |
| Habitat sample calls | 16,089 | 16,089 |
| Local helper expressions evaluated | 16,089 | 0 |
| Raster nodes | 6,358 | 6,358 |
| Native grass tiles / instances | 31 / 4,088 | 31 / 4,088 |
| Draw calls | 245 | 245 |
| Triangles | 1,889,302 | 1,889,302 |
| Texture objects | 174 | 174 |

All sampled values, generated buffers/bounds, raster channels and Grade/post pixels match the published reference exactly. An additional isolated CPU timing probe was inconclusive; no timing gain is asserted.

## Reproduce

Run `node tools/repro-live-habitat-interpolation.mjs --url https://ael-dev3.github.io/Tervain/ --out habitat-interpolation-proof` with the repository's Chromium/software-WebGL prerequisites.

The repro reads baseline `421d34b`, obtains the published scene's retained Habitat and grass generators, and overrides only the sample method with the actual baseline/candidate implementation. Raster generation and its dependencies stay native in all three arms. It resets raster caches and refills the actual grass tile buffers. No previous habitat/coast optimizations are attributed here.

The executed pre-change control has **16,089 evaluated local helper expressions** in both arms. It correctly fails the required reduction assertion while retaining identical sampled values, rasters, grass buffers and pixels. Add `--candidate-ref 421d34b` to repeat that negative control.

Every sample's coordinates and five returned channels are hashed in order, in addition to all generated tile attributes/bounds and habitat raster channels. Screenshots use the native Grade/post renderer at a frozen endpoint.

- [Native before/after receipt](../../proofs/habitat-interpolation/report.json)
- [Executed unchanged-source control](../../proofs/habitat-interpolation/unchanged-source-control.json)
- [Native image](../../proofs/habitat-interpolation/native.png)
- [Before image](../../proofs/habitat-interpolation/before.png)
- [After image](../../proofs/habitat-interpolation/after.png)

The counter measures evaluation of the function expression at its source site. It does **not** measure actual heap allocations or GC: the JavaScript engine may optimize closures. No hardware timing, GPU savings, upload-byte reduction or MacBook Air FPS improvement is claimed. Renderer counts are equality controls. Low preset, 640×360; this is preparation of native tiles, not a timed real-input walk.

Validation: 32 tests across habitat, visibility, terrain visuals and seam interpolation. The new test covers 66 positions around negative coordinates, cell edges and raster seams, all five channels and output identity. Production build and rendered comparison pass. Hardware play-gate receipt remains pending.
