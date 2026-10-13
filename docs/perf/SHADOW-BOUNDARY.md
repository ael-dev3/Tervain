# Measure the moving sun-shadow boundary

A capture-only check isolates the native sun's shadow factor on native terrain. It renders the actual shadow map first, then samples that map through a diagnostic material, with a fixed camera looking along the light direction. The camera covers 190 metres; the shadow camera covers 140 metres. The projection therefore follows the real footprint rather than guessing a screen rectangle.

```sh
node tools/check-shadow-boundary.mjs --url http://127.0.0.1:4173/ --out shadow-boundary-proof
# On a hardware-backed browser:
node tools/check-shadow-boundary.mjs --url http://127.0.0.1:4173/ --headed true --out shadow-boundary-proof
```

The check captures focus positions (15,30) and (31,30), keeping its diagnostic camera fixed. It requires nonempty native shadows, complete coverage of all four edges, 60 native terrain tiles, finite footprint movement and the snapped target displacement within 0.2 m of the requested 16 m. It measures an 18/255 brightening threshold two screen pixels either side of each edge, excluding corners. Invalid, crossed or uncovered footprints do not pass completeness checks.

Software-WebGL native results:

| Focus | Boundary samples | Samples with sharp outside brightening | Outside samples fully lit |
| --- | ---: | ---: | ---: |
| (15,30) | 1,356 | 364 (26.8%) | 100% |
| (31,30) | 1,356 | 386 (28.5%) | 100% |

The target moves 15.949 m. Applying the stale first footprint to the second image reports 5.1%, compared with 28.5% at its actual moved boundary. The maps are 4096×4096, with a 140 m footprint. Both factor images contain real shadows and fully lit ground (0–255 range).

The receipts use the 0.0.15 light and terrain on the isolated grass vertex-work branch. Grass does not cast shadows; that patch leaves these light/terrain paths unchanged. Images are diagnostic shadow factors, not altered gameplay lighting. No product rendering changes are made by this PR.

This confirms a shadow-factor discontinuity aligned with the moving map boundary. It does not establish that every bright boundary in a gameplay recording has this cause, nor measure its perceptual severity. Compare the matching gameplay clip before changing lighting.

No image-quality pass is awarded by default: `qualityGateConfigured` is false and `qualityPass` is null. An explicit `--max-edge-share <0..1>` can enforce a threshold after calibration; completeness is still required. This threshold is a configurable diagnostic policy, not a supplied visual-quality standard.

Validation: five metric tests cover a uniform negative control, a bright rectangular positive control, shifted versus stale footprints, incomplete frames, and invalid quadrilaterals. TypeScript and syntax checks pass. Native captures, metrics and movement assertions pass. Receipts are in `shadow-boundary-proof/`. No frame-time improvement or hardware performance result is claimed.
