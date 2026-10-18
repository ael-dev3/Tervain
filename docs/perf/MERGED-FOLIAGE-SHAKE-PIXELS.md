# Current-main shake-cache pixel verification

Verified the published **0.0.23 · 5144dd3**, which includes merged #655, at five High forest poses through native post-processing and 4× MSAA. All five are RGB-identical to explicit reconstructed pre-#655 vec4-array shader controls; restored native controls match exactly. This compares the two transports inside current main, **not two historical build binaries**.

| Pose | Draws, both modes | Triangles, both modes | Changed RGB channels | Array-control uploads | Warmed current-main uploads |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 376 | 6,413,125 | 0 | 96 | 0 |
| 1 | 379 | 6,447,213 | 0 | 96 | 0 |
| 2 | 380 | 6,491,322 | 0 | 96 | 0 |
| 3 | 381 | 6,506,078 | 0 | 96 | 0 |
| 4 | 380 | 6,505,694 | 0 | 96 | 0 |

Both modes use 274 textures; zero console errors and no invalid/lost WebGL contexts. Shadows refresh throughout. An active strike and five fixed wind phases exercise the same four native source vectors. The native opaque order is retained and its inactive adapter is checked against native pixels. Linked-program metadata confirms one `mat4` versus four `vec4` entries (16 GPU floats in either case).

[Raw verification and all five matched image pairs](proofs/merged-foliage-shake). `current-N.png` is the published merged transport; `array-control-N.png` restores the old declaration and original field uniform. In `native.json`, `before` means current main and `after` means the reconstructed array control, as its `comparison` field states. No tree attachment or styling is changed. Frozen-field uploads are not a claim of zero uploads when new strike data arrives. This is software-renderer correctness proof, not hardware performance evidence.

```sh
node tools/repro-live-foliage-shake-uniform.mjs --url https://ael-dev3.github.io/Tervain/ --merged true --head 5144dd39f --out proof/merged-shake
```

The merged-control mode rejects CPU mode and raster-suppressed image collection. All five RGB, restored-control, geometry, linked-uniform-type and upload-direction assertions must pass before it writes the receipt.
