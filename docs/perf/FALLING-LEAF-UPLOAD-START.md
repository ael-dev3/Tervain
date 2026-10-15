# Omit discarded leading falling-leaf matrix uploads

Live reference: https://ael-dev3.github.io/Tervain/ (0.0.18 · 421d34b). Tracking: [#326](https://github.com/ael-dev3/Tervain/issues/326).

#503 truncates the drawn/uploaded suffix after the last visible leaf. Its matrix upload still begins at slot zero, even when those first slots are discarded by opacity. Track the first visible slot too and upload the contiguous matrix interval between the first and last visible slots. Keep the opacity prefix upload unchanged so previously visible slots become hidden correctly. CPU poses, stream order, sorting bounds, drawn prefix and materials stay unchanged.

This builds on #503. It does not add individual per-leaf uploads: the matrix interval remains one contiguous upload, alongside the existing opacity upload.

## Published snapshot

```sh
node tools/repro-live-falling-upload-start.mjs --url https://ael-dev3.github.io/Tervain/ --out falling-upload-native
```

[Native receipt](../../proofs/falling-upload-start/native/report.json): published Low forest, 77 streams, 11 visible, first visible slot 2, drawn prefix 63. Compare #503's tail-trimmed range with the proposed interval on a clone of those native buffers:

| Measurement | Tail-trimmed | Occupied interval |
| --- | ---: | ---: |
| Matrix + opacity upload bytes | 4,284 | 4,156 |
| Draws | 1 | 1 |
| Triangles | 630 | 630 |

The native saving is **128 bytes (3%) in this snapshot**, not 40% across the game. Pixels are identical, with 279 non-background pixels and zero WebGL errors. [Before](../../proofs/falling-upload-start/native/before.png) / [after](../../proofs/falling-upload-start/native/after.png).

This is an isolated published leaf snapshot with diagnostic camera, light and background. It uses the real material and buffers, direct framebuffer readback, and an upload-range intervention; it is not a candidate full-build replay, final post/MSAA quality verdict or hardware timing. `sourceAtProbeSha256` records the source available when that intervention ran.

## Actual source replay and re-entry

```sh
git fetch origin codex/falling-leaf-draw-prefix
node tools/repro-falling-upload-start.mjs falling-upload-proof
node tools/repro-falling-upload-start.mjs falling-upload-hidden-proof --hidden-poses
```

The replay runs both actual modules in SwiftShader: 256 seeded streams split between two woodland patches, delayed first visibility, camera turns, horizon exit/re-entry, a switch between patches and later phase advances. Across **211 updates**, total buffer uploads including initial allocations fall **2,458,196 → 1,474,644 bytes (40%)**. This controlled spatial distribution demonstrates larger savings than the native snapshot; it is not a world-load or frame-rate estimate.

Every visible matrix word, opacity word, cached sort bound, transparent order, draw/triangle count and texture count matches. Upload call counts match on every frame; texture image payload memory is zero in this untextured fixture. Nine image pairs are pixel-identical; a nonempty sample has 1,250 distinct RGB colors. [Report](../../proofs/falling-upload-start/report.json), [compressed per-frame hashes/counters](../../proofs/falling-upload-start/traces.json.gz), [before sample](../../proofs/falling-upload-start/baseline-50.png), [after sample](../../proofs/falling-upload-start/candidate-50.png).

The optional integration applies #509's cached-bound hidden-pose guard to **both** replay versions. It passes the same 211-update and nine-pair comparison, with the same byte reduction and unchanged upload-call counts. [Integration receipt](../../proofs/falling-upload-start/hidden-poses/report.json) and [per-frame hashes](../../proofs/falling-upload-start/hidden-poses/traces.json.gz). It checks compatibility without changing either existing branch.

The new two-patch re-entry regression fails on #503; all **12 falling-leaf tests** and production build/type check pass with the change. No hardware FPS improvement or explanation of the historical >25 ms frames is claimed. Hardware play-gate remains required.
