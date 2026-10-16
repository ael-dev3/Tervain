# Keep foliage clearance on the moving leaf

Published repro: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), native oak `tree:wild:40:42`, related to camera/foliage clearance in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

The leaf shader computes `vTvWorld` before its wind deformation. The camera-to-hero clearance test therefore fades leaves using their rest positions while drawing them somewhere else. The native wind replay measures up to 10.3 cm of disagreement across 256 sampled vertices at two wind times.

Only the clearance coordinate moves after deformation, immediately before projection. Crown lighting, clump noise, wind, geometry, textures and clearance radii remain unchanged. The leaf program key changes to prevent reuse of the previous shader. The wood path is unchanged.

## Proof

The replay opens the published build with motion enabled and uses the native leaf geometry, instance transform, compiled shader hook and wind uniforms. A floating-point software-WebGL probe reads both the clearance position and actual rendered position. It checks all samples were written and lie near the native geometry. An unchanged-source control must fail the correction assertion.

The rendered comparison isolates the same native leaf instance on the original terrain through the native post pipeline. It places the camera and clearance target through the crown deliberately to expose the mask boundary; this is a controlled foliage-clearance inspection, not a recorded player route or a crown-art score. Two controls disable clearance or wind. Neither should change pixels. Deformed-position and original-geometry hashes must match.

| Check | Before | After |
| --- | ---: | ---: |
| Maximum clearance-coordinate error | 0.102739 m | 0 m |
| Mean clearance-coordinate error | 0.046353 m | 0 m |
| Inspection draw calls | 46 | 46 |
| Inspection triangles | 191,709 | 191,709 |

The active-clearance comparison changes 13,313 image channels. Clearance-disabled and zero-wind controls both remain pixel-identical (zero changed channels). Deformed-position and geometry hashes match. These counts establish the corrected mask alignment, not a grass-flicker score or a frame-time improvement.

[Before clearance inspection](../../proofs/leaf-focus-position/before-active.png) · [after](../../proofs/leaf-focus-position/after-active.png) · [receipt](../../proofs/leaf-focus-position/report.json) · [unchanged-source coordinate control](../../proofs/leaf-focus-position/unchanged-source-control.json)

## Reproduce

```sh
node tools/repro-live-leaf-focus.mjs --out leaf-focus-proof
node tools/repro-live-leaf-focus.mjs --candidate-ref 421d34b --images 0 --out leaf-focus-control
```

The first command must pass and the unchanged-source command must fail. Defaults are live Pages and software WebGL. Shader-coordinate reads and image readbacks are diagnostic work, not hardware frame timings. This does not establish a hardware play-gate PASS or resolve crown shape, root seating or grass sparkle.

Validation: regression fails before the fix; 33 foliage/bark/pine-integration tests and production build pass. Stacked on #581.
