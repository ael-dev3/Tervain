# Cull packed forest batches for each render camera

The main camera selects the forest's packed tree instances. The resulting colour batches disabled Three's frustum culling, so every secondary camera submitted every packed tree, even when a cube face pointed away from the forest. The window's lighter-model substitution reduced geometry but did not remove those invisible draws. This is a cost lead for the inside-window/secondary-pass work recorded in `LATEST.md`; those older hardware timings are not treated as a measurement of this change.

Accumulate a sphere per packed detail level from the existing cached placement bounds, which already include every source LOD and the two-metre movement guard. Give colour and leaf-depth meshes the same sphere and enable per-camera frustum culling. Bounds reset and rebuild with packing. Reflection/window proxy geometries remain covered because the source bounds include all LODs. Shadow-only casters retain their existing selection and disabled per-mesh culling.

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
