# Use the single-sample leaf cutout on Low

Published repro: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), Low preset, native wooded view around oak `tree:wild:40:42`. Related to foliage edges in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

Low disables scene-target MSAA. Its tree materials nevertheless retain `alphaToCoverage: true`, so the leaf shader takes its multisample coverage ramp instead of its already-authored single-sample fallback. With zero samples, that ramp cannot soften coverage: fractional-alpha fragments still write full opaque RGB/depth, broadening the leaf edges into hard cutouts.

The fix disables alpha-to-coverage when cloning Low tree profile materials. The existing single-sample cutout then runs. Other presets retain their source flag. Source shader hooks and program keys are preserved, and source materials remain immutable. No textures, geometry, colors, cutoffs, dither constants, foliage instance counts or preset sample counts change.

## Native proof

The replay imports the original and candidate profile-material cloning functions into the published build, retaining the native forest, shaders, textures and post pipeline. It samples actual GL state after main-target leaf draws, including the pan frames. The unchanged-source control skips clips and records the 25 leaf draws of one fixed inspection frame; the complete before/after capture records 451 observations across inspection and pan. It also reads the scene texture to count fractional-alpha pixels: on this zero-sample opaque scene target those pixels witness the unsupported coverage ramp.

| Check | Before | After |
| --- | ---: | ---: |
| Leaf-draw observations using coverage with zero samples (inspection + pan) | 451 | 0 |
| Fractional-alpha pixels in the zero-sample scene target | 76,768 | 0 |
| Inspection draw calls | 184 | 184 |
| Inspection triangles | 1,166,205 | 1,166,205 |

The four-sample renderer/material-policy control on the same geometry remains pixel-identical. This control does not rebuild the world at Medium; it tests that the multisampled policy is preserved. Geometry-buffer hashes match. The unchanged-source negative control retains the unsupported state and correctly fails the fix assertion.

[Before Low clip](../../proofs/low-tree-coverage/before.mp4) · [after Low clip](../../proofs/low-tree-coverage/after.mp4) · [before still](../../proofs/low-tree-coverage/before-low.png) · [after still](../../proofs/low-tree-coverage/after-low.png)

[Four-sample before](../../proofs/low-tree-coverage/before-medium.png) · [four-sample after](../../proofs/low-tree-coverage/after-medium.png) · [receipt](../../proofs/low-tree-coverage/report.json) · [unchanged-source control](../../proofs/low-tree-coverage/unchanged-source-control.json)

The fixed native forest is viewed through a small camera pan, 17 offline frames at 8 fps. GL-state queries and readbacks are diagnostic work; these captures are not frame-time or hardware-performance measurements. The fix restores the intended Low path. Crown geometry and the highest-preset image quality remain separate work.

## Reproduce

From a checkout containing the published revision:

```sh
node tools/repro-live-tree-coverage.mjs --out tree-coverage-proof
node tools/repro-live-tree-coverage.mjs --candidate-ref 421d34b --clips 0 --out tree-coverage-control
```

The first command must pass; the unchanged-source control must fail. Defaults are live Pages and software WebGL. FFmpeg encodes the matched clips. The proof records the cloning-function hashes, forest call-site hashes and native build identity.

Validation: 33 foliage/bark/pine-integration tests, type checking and production build pass. Hardware play-gate evidence remains outstanding. Stacked on #580.
