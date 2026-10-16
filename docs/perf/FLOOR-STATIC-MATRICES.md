# Static forest-floor batch matrices

Forest-floor placements are stored in each batch's `instanceMatrix`; plant wind is shader-driven. The batch Object3D local transform remains identity. Leaving `matrixAutoUpdate` enabled recomposes that unchanged transform whenever Three walks the scene, including extra render passes.

Initialize the local matrix once, then disable its automatic recomposition. World-matrix propagation remains enabled, so a moving/rotating/scaled parent still transforms the batch normally. Instance packing, fading, materials, draw counts and geometry are unchanged.

## Reproduce

```sh
node tools/repro-live-floor-static-matrices.mjs --out floor-static-matrix-proof
```

The script defaults to [published Pages](https://ael-dev3.github.io/Tervain/), retains its actual floor inputs, and rebuilds the original and candidate floor modules in the native scene. It instruments the target batch matrices' real `compose` calls, performs 120 forced whole-scene matrix walks with parent translation/rotation/scale, and compares every batch world matrix, the drawn native instance prefixes, and full baseline/candidate instance buffers. Unused native buffer tails retain earlier culling history, so those are excluded from the cross-build comparison. It also compares original native, baseline and candidate images through the native post/MSAA render path.

These are 120 forced matrix walks, not 120 measured gameplay frames. This proves redundant CPU work removed, not a measured frame-time, GPU-time, power or FPS improvement.

An unchanged-source negative control must fail the reduction assertion:

```sh
node tools/repro-live-floor-static-matrices.mjs --candidate-ref 421d34b --out floor-static-matrix-control
```

## Validation

The new parent-transform/compose regression test fails on the original source and passes after the fix. The focused forest-floor suite passes **14 tests**; production build passes. Parent transforms are checked separately from the local-compose reduction.

## Published-build receipt

Input: **0.0.18 · 421d34b**, Low profile, native grove endpoint. Canonical retained tree input: 453 trees; 11 floor batches, 36 drawn floor instances.

| Check | Original native | Rebuilt baseline | Candidate |
| --- | ---: | ---: | ---: |
| Target local matrix compositions / 120 walks | 1,320 | 1,320 | 0 |
| Draw calls in final native render | 245 | 245 | 245 |
| Triangles in final native render | 1,889,302 | 1,889,302 | 1,889,302 |

All three per-walk world-matrix hashes and drawn instance-prefix hashes match. Full baseline/candidate instance buffers match too. All three images are pixel-identical.

[Structured receipt](../../proofs/floor-static-matrices/report.json) · [baseline image](../../proofs/floor-static-matrices/before.png) · [candidate image](../../proofs/floor-static-matrices/after.png) · [unchanged-source control](../../proofs/floor-static-matrices/unchanged-source-control.json).

The unchanged-source control reports `pass:false` as required: it still performs the 1,320 local compositions. No hardware play-gate result is claimed here.
