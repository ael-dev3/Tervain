# Cull packed forest batches for each render camera

The main camera selects the forest's packed tree instances. The resulting colour batches disabled Three's frustum culling, so every secondary camera submitted every packed tree, even when a cube face pointed away from the forest. The window's lighter-model substitution reduced geometry but did not remove those invisible draws. This is a cost lead for the inside-window/secondary-pass work recorded in `LATEST.md`; those older hardware timings are not treated as a measurement of this change.

Accumulate a sphere per packed detail level from the existing cached placement bounds, which already include every source LOD and the two-metre movement guard. Give colour and leaf-depth meshes the same sphere and enable per-camera frustum culling. Bounds reset and rebuild when the packed instance list changes; unchanged lists reuse their bounds without additional sphere unions. Reflection/window proxy geometries remain covered because the source bounds include all LODs. Shadow-only casters retain their existing selection and disabled per-mesh culling.

## Before/after proof

A native software-WebGL fixture loads delivered pine models plus the procedural broadleaf catalog. It packs once for the main view, draws all six cube directions using the actual lighter-model substitution, then checks the original primary camera. All seven before/after images match every RGB channel; all WebGL errors are zero.

| Measurement | Original | Changed |
| --- | ---: | ---: |
| Six capture faces, total calls | 372 | 244 |
| Six capture faces, total triangles | 3,439,974 | 2,622,286 |
| Backward capture, calls | 62 | 16 |
| Backward capture, triangles | 573,329 | 51,344 |
| Primary-view calls | 62 | 62 |
| Primary-view triangles | 1,612,531 | 1,612,531 |
| Textures | 24 | 24 |
| Nominal texture-image payload | 85,263,368 B | 85,263,368 B |
| First proxy-buffer upload | 2,797,440 B | 2,797,440 B |
| Subsequent capture/primary source uploads | 0 B | 0 B |

That is 23.8% fewer capture triangles and 34.4% fewer capture draws in this fixture. It does not establish an Air M5 frame time or a live quality pass. Texture estimates omit framebuffer/depth storage and driver overhead; uploads omit uniforms.

Thirty-five foliage/pine/distance tests pass and the production build passes. Bounds checks cover initial packing, empty/reappearing batches, matching leaf colour/depth spheres and middle-model proxies. Existing tests retain off-screen shadow casters and verify no per-turn placement-bound transforms.

[Receipt](proofs/forest-capture-culling/fixture.json) · [Forward original](proofs/forest-capture-culling/baseline-0.png) · [Forward changed](proofs/forest-capture-culling/candidate-0.png) · [Backward original](proofs/forest-capture-culling/baseline-5.png) · [Backward changed](proofs/forest-capture-culling/candidate-5.png) · [Primary original](proofs/forest-capture-culling/baseline-6.png) · [Primary changed](proofs/forest-capture-culling/candidate-6.png)

```sh
node tools/repro-forest-capture.mjs --baseline 5da2776 --out forest-capture-proof
npx vitest run tests/presentation/foliageEngine.test.ts tests/presentation/pineForestIntegration.test.ts tests/presentation/distanceVisibility.test.ts --testTimeout=90000
npm run build
```

## Compiled whole-scene control

A compiled capture-culling build with the delivered catalog (453 trees, 177 colour/depth batches) also matches every RGB channel in all seven whole-scene comparisons through native post/water rendering. Its tested asset is `tervain-C1s1VKRA.js`; its displayed revision retains the 0.0.17 base label. The control disables only forest batch frustum culling in that same frozen scene.

The primary view's complete rendering pipeline, including water passes, improves **337 → 206 calls** and **5,649,112 → 3,998,162 triangles** (29.2% fewer triangles). The isolated primary forest draw above stays unchanged; the pipeline saves work in secondary passes. Observed texture-image/mip payload remains about **1,285,397,200 bytes**. This is nominal storage, not measured driver VRAM. Cold control draws initialize resources, so their upload bytes must not be compared with the following warm candidate draws as an upload saving.

[Whole-scene receipt](proofs/forest-capture-culling/compiled-all-views.json) · [Primary control](proofs/forest-capture-culling/compiled-6-control.png) · [Primary actual](proofs/forest-capture-culling/compiled-6-actual.png) · [Capture control](proofs/forest-capture-culling/compiled-4-control.png) · [Capture actual](proofs/forest-capture-culling/compiled-4-actual.png). This compiled receipt covers the capture-culling implementation; the final source fixture additionally verifies the cached-bounds implementation.

To run the same controlled check against a served build:

```sh
node tools/repro-forest-capture-build.mjs --url https://ael-dev3.github.io/Tervain/ --expect before --out published-capture-control
# Against a build containing the change, omit --expect before.
# --faces 6 checks only the primary pipeline; the default checks all seven views.
```

The scripts validate software-renderer output and counters. A hardware gate is still needed before treating this as a live frame-time or quality fix.
