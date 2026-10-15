# Reuse habitat slope and carve samples

Stacked on [#539](https://github.com/ael-dev3/Tervain/pull/539); this receipt isolates additional terrain-query work during cold grass/habitat generation.

A habitat node calculates slope and carve for plant suitability. Its soil blend then evaluates those same terrain methods again at the same point. Each duplicate slope query reads terrain height four more times. Reuse the already computed values through an optional `groundSplat` surface-sample argument. Keep one two-number scratch object per Habitat, with ordinary JavaScript number precision; no per-node object allocation or new persistent spatial cache. Other callers retain the original terrain-query path.

## Reproduce

```sh
node tools/repro-live-habitat-surface-sample.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out habitat-surface-proof
```

The runner uses the published Habitat, terrain, grass generator, crown field and tile meshes. It obtains the retained Habitat via the native generator's DevTools closure scope. Each arm starts from an empty habitat raster cache and refills the same existing grass tiles. Native terrain methods count actual slope, carve and height calls. Only the node evaluator is substituted with the baseline/candidate source method; the candidate receives the same reusable scratch object its constructor creates. Ground blending uses the current source function. The baseline's omitted surface argument must reproduce native terrain-call counts, raster values and generated data.

The baseline includes #539's separate crown-query reuse. That changes crown-query counts, not the terrain counts under test. Initial generated buffers must match the untouched published scene, and every active buffer, tile bound and complete raster must match the native control in both source arms. The full scene is refreshed at the capture camera; refilled native meshes then render through the native Grade/post path.

[JSON receipt](../../proofs/habitat-surface-sample/report.json), [before](../../proofs/habitat-surface-sample/before.png), [after](../../proofs/habitat-surface-sample/after.png).

These are deterministic terrain-method counts, not hardware frame times, total streaming cost or proof that historical ~33 ms frames are fixed. No geometry, material, density, shade or collision policy changes. Related: [#326](https://github.com/ael-dev3/Tervain/issues/326).

## Matched result

31 native grass tiles / 4,088 instances, backed by 22 cold habitat raster tiles / 6,358 nodes:

| Terrain method | Before | After |
| --- | ---: | ---: |
| `slopeAt` calls | 12,716 | 6,358 |
| `carveAt` calls | 12,716 | 6,358 |
| `heightAt` calls during regeneration | 77,662 | 52,230 |

The 25,432 removed height evaluations equal four per raster node. Generated-buffer/bounds hash `20d09afa…dc161aa` and complete raster hash `6ab48c31…be8199f` match the native control. Full-scene images are pixel-identical. Final draw calls, triangles and texture count remain 245 / 1,889,302 / 174.

Production build and **52 tests pass** across habitat/crown reuse, grass engine, ground contacts, terrain visuals, terrain tiles and texture workers. The new per-node slope-count regression fails on the baseline and passes after reuse. Exact ground-layer words/wetness match with supplied samples, including zero values; legacy callers and source-free habitat remain covered.
