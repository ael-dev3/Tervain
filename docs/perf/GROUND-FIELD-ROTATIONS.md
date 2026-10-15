# Fixed crop-field rotations in surface sampling

Reference: [published 0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/) and [playtest checklist #326](https://github.com/ael-dev3/Tervain/issues/326). This addresses preparation work during grass/terrain generation. It does not establish a hardware frame-time improvement or close the reported hitch.

`groundSplat` tests each point against three authored crop fields. The old `inField` recalculates two cosines and two sines per tested field. Those field yaws are fixed; Habitat already precomputes its separate rotations. Precompute six values once for the surface sampler too. Keep references to the original fields, their order, strict edge comparisons and the arithmetic order.

## Reproduction and evidence

Run `node tools/repro-live-ground-field-rotations.mjs --url https://ael-dev3.github.io/Tervain/ --out ground-field-proof` with the repository's Chromium/software-WebGL prerequisites.

The script reads baseline `805812bab` (#553), so previous habitat/coast savings are excluded. It loads the published scene, retains its Habitat, planted crown field and grass generators, resets the raster cache and refills actual native tile buffers with baseline/candidate dependencies. Field counters are re-exported from the exact surface module used by each arm, avoiding duplicate-module counters.

The pre-change executed control has 76,296 runtime trig evaluations in each arm, 6,358 nodes and matching native buffers/rasters/pixels. It correctly fails the required reduction assertion. The new sampler unit test also fails before the change (24 cosine calls in its five query cases).

The candidate replay passes:

| Work / control | Before | After |
| --- | ---: | ---: |
| Surface nodes | 6,358 | 6,358 |
| Runtime field trig evaluations | 76,296 | 0 |
| Once-per-module field trig evaluations | 0 | 6 |
| Native grass tiles / instances | 31 / 4,088 | 31 / 4,088 |
| Draw calls | 245 | 245 |
| Triangles | 1,889,302 | 1,889,302 |
| Texture objects | 174 | 174 |

Full grass attributes/bounds, habitat raster channels and Grade/post pixels match the published reference exactly. Renderer counts are unchanged controls, not rendering savings.

The candidate proof additionally samples 147 positions at/inside/outside all three fields' rotated edges and corners and requires exact full surface weights and wetness. It records the candidate's module-initialization trig separately from runtime sampling.

- [Native before/after receipt](../../proofs/ground-field-rotations/report.json)
- [Executed pre-change control](../../proofs/ground-field-rotations/unchanged-source-control.json)
- [Native image](../../proofs/ground-field-rotations/native.png)
- [Before image](../../proofs/ground-field-rotations/before.png)
- [After image](../../proofs/ground-field-rotations/after.png)

An unchanged-source rerun uses `--candidate-ref 805812bab` and must fail the reduction assertion. The committed pre-change control predates the extra boundary-probe assertions, and is evidence for the runtime-call negative control only.

Counters cover `groundSplat` field rotation work, not all application trigonometry. Baseline/candidate rendering is a frozen endpoint control, not two independently timed walks. Low preset, 640×360, software WebGL; no hardware timing, GPU savings or MacBook Air FPS claim.

Validation: 20 targeted tests and production build pass. No assets, shader, geometry, density, quality setting or menu changes. Hardware play-gate receipt remains pending.
