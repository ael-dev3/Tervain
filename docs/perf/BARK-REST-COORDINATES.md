# Keep bark attached to wind-deformed wood

Published repro: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), native oak `tree:wild:40:42`. Related to bark/tree motion quality in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

The metre-scale bark detail took its coordinates from `transformed`, after the foliage wind patch moved the vertex. That makes the detail sample a different part of the bark texture as a branch sways: grain slides over the wood instead of following it. Use the undeformed `position`, then retain the original instance/world transforms and metre scale. The shader cache version changes so the corrected mapping gets its own program.

The textures, colors, detail strength, scale, tree shape and wind deformation retain their existing values. This addresses mapping during motion. Crown shape and giant-tree geometry still require separate work.

## Matched proof

The replay uses the published oak geometry, material hook and native wind uniforms. It overlays the single position-assignment statement from the candidate source onto that hook. A floating-point software-WebGL diagnostic reads 256 native vertices at wind times 0 and 3 seconds. A second output reads the actual deformed positions. Native post/MSAA captures isolate the original wood on the native terrain so its grain can be inspected.

| Check | Before | After |
| --- | ---: | ---: |
| Maximum sampled bark-coordinate drift | 1.856 cm | 0 cm |
| Mean sampled bark-coordinate drift | 0.574 cm | 0 cm |
| Deformed-position hashes | Matching | Matching |
| Draw calls in the isolated inspection | 47 | 47 |
| Triangles in the isolated inspection | 196,106 | 196,106 |

With tree wind strength set to zero, before/after images have **zero changed channels**. The original geometry buffers keep the same hash. An unchanged-source control retains the coordinate drift and correctly fails the fix assertion.

[Before clip](../../proofs/bark-rest-coordinates/before.mp4) · [after clip](../../proofs/bark-rest-coordinates/after.mp4) · [before still](../../proofs/bark-rest-coordinates/before.png) · [after still](../../proofs/bark-rest-coordinates/after.png)

[Full receipt](../../proofs/bark-rest-coordinates/report.json) · [unchanged-source control](../../proofs/bark-rest-coordinates/unchanged-source-control.json) · [zero-wind before](../../proofs/bark-rest-coordinates/still-before.png) · [zero-wind after](../../proofs/bark-rest-coordinates/still-after.png)

The clips contain 25 offline frames at 8 fps. The camera and native wind field stay fixed while shader wind time advances from 0 to 3 seconds. They illustrate texture attachment; they do not measure real-time frame pacing, hardware performance or a tree-art quality score. The coordinate metric measures sliding of detail over its source vertices, separately from the wood's intended movement.

## Reproduce

From a checkout containing the published revision:

```sh
node tools/repro-live-bark-coordinates.mjs --out bark-coordinate-proof
node tools/repro-live-bark-coordinates.mjs --candidate-ref 421d34b --out bark-coordinate-control
```

The first command must pass; the second must fail. The script defaults to live Pages, explicitly enables motion, and uses headless Chrome with software WebGL. FFmpeg encodes the clips. The original and candidate statements, source hashes and native build identity are recorded.

Validation: 17 bark/foliage tests, type checking and production build pass. Hardware play-gate evidence remains outstanding. This PR is stacked on #579; its code change is limited to bark mapping and the shader cache key.
