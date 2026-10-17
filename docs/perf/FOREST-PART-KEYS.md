# Forest refresh part-key reuse

Reproduced against the published 0.0.18 · 421d34b scene for the camera-turn cost tracked in [#326](https://github.com/ael-dev3/Tervain/issues/326).

`buildFlora.refresh` constructed `['wood', 'leaf']` inside each visible tree's active LOD loop. Reuse one immutable part-order tuple per forest module instead. Packing order, geometry, materials, culling and shadow policy stay the same.

## Reproduce

```sh
node tools/repro-live-forest-part-keys.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --out forest-part-proof
```

The runner imports the baseline refresh block from commit `421d34b` and the candidate block from the checkout. Both run on the published scene's native forest batches and terrain-following camera. Each arm first has to match the native published forest state. It then walks hero x = −2, z = 34.6…39.5 while turning through 120 camera updates. Only the wood/leaf key-list literal is instrumented; snapshots compare every active instance matrix, tint, coverage interval, count, bound and forest statistic at each update. Final images use the native Grade/post render path with a frozen clock.

The receipt covers the Low colour path. List constructions are source-level counts; they do not measure heap bytes, GC pauses, hardware frame time, or the cause of the historical ~33 ms frames. This is a CPU cleanup, not a foliage appearance or Mac frame-pacing fix.

See [machine-readable receipt](../../proofs/forest-part-keys/report.json) and matched [before](../../proofs/forest-part-keys/before.png) / [after](../../proofs/forest-part-keys/after.png) images.

Validation: production build passes; 31 existing forest/pine integration, tree and stand tests pass (three files, serial worker). The rendered replay also checks complete refresh output against the published control.

## Matched result

| 120 refreshes, 20 native batches | Before | After |
| --- | ---: | ---: |
| Per-refresh part-key list constructions | 7,946 | 0 |
| Final rendered draw calls | 255 | 255 |
| Final rendered triangles | 1,313,876 | 1,313,876 |
| Final texture count | 180 | 180 |
| Final warmed buffer upload bytes | 0 | 0 |

One shared tuple is created when the forest module is built. Both arms match the native initial state and every per-update state hash (`eafba06b…824ac17`); final images are pixel-identical. The buffer number covers only the final warmed draw, not total streaming uploads across the route.
