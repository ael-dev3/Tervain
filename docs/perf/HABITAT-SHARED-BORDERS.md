# Reuse resident habitat raster borders

The [published build](https://ael-dev3.github.io/Tervain/) generates a 17×17 habitat raster for each 32 m tile. Adjacent rasters share an entire row or column of world coordinates, but each raster evaluates those samples again. Every duplicate includes terrain, soil, road, water and canopy queries. This is avoidable work when grass streams into new tiles; it is not evidence that a particular hardware hitch is resolved.

The change copies the exact five Float32 channels from a completed neighboring raster when its border is already resident. Interior and unavailable-border nodes still use the original evaluator. It adds no cache or retained storage. Cached tile identity and interpolation stay unchanged.

## Matched result

On published 0.0.18 (`421d34b`), refilling 31 native grass tiles (4,088 instances) builds 22 habitat rasters. Actual node evaluations fall **6,358 → 5,793**: 565 fewer (**8.9%**). All 16,089 sampled values, complete rasters, generated buffers and bounds match exactly, as do rendered pixels. Both variants submit 245 draws / 1,889,302 triangles with 174 textures.

## Reproduce

```sh
node tools/repro-live-habitat-borders.mjs --out habitat-border-proof
npx vitest run tests/presentation/habitatBorders.test.ts tests/presentation/groundHabitat.test.ts
npm run build
```

The script defaults to the published build. It finds the native Habitat retained by the actual grass generator, clears its raster cache, then refills the same retained grass tiles with native, baseline and candidate raster-builder methods. The original node evaluator, sampler and all their dependencies remain native. The script compares every sampled channel, complete raster bytes, generated instance buffers and bounds, endpoint pixels, draw calls and triangles. It counts actual node-evaluator calls, not estimated heap allocations.

The unchanged-source control must fail the reduction assertion. Five regression cases fail on the original builder; all 15 selected tests pass with the change. Tests cover all four neighbor directions, shared corners, cache identity, and real terrain samples on tile seams. The production build passes.

[Matched receipt, screenshots and unchanged-source control](../../proofs/habitat-shared-borders).

This is software-WebGL verification on a cold-cache grass-generation workload at the Low preset. It is not a timed gameplay walk, a hardware GPU measurement, or proof that the live16 missed refreshes are gone. Existing rasters are already immutable for the lifetime of this Habitat; the change reuses that existing contract.
