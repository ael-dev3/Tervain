# Skip calculations for zero-width grass blades

The grass shader's root thinning, distance band and blade-prefix fade already collapse some blades to zero width. Their triangles have no area, but the vertex shader still computed shape hashes, fetched both wind fields, sampled trample when applicable, bent the stem and computed normals and colour.

Reject those whole blades immediately after the existing presence calculation. Every vertex of a blade shares that calculation; indexed triangles never join different blades. Rejected vertices use the same position outside the clip volume. Positive-presence blades retain all calculations. The program cache key advances to avoid reusing the previous shader.

```sh
node tools/repro-grass-collapsed-vertices.mjs --url http://127.0.0.1:4173/ --out grass-collapsed-proof
```

This runs native High grass in a frozen built-game scene at 640×360. The full-work control removes the early-return guard from the actual compiled shader under a separate program cache key. Both variants use the same camera, uniforms, instance buffers, lighting and shadow map. The control recompilation is warmed before counters are read.

| View | Draw calls, both | Triangles, both | Source uploads, both | Pixel-identical | Estimated zero-width / indexed vertices |
| --- | ---: | ---: | ---: | --- | ---: |
| (-7,45), forward | 107 | 1,571,979 | 0 B | yes | 245,184 / 888,598 |
| (-7,45), turned 0.6 radians | 110 | 1,697,222 | 0 B | yes | 327,529 / 1,005,527 |
| (18,20), forward | 138 | 1,958,874 | 0 B | yes | 556,639 / 1,214,391 |

The last column is a conservative CPU estimate from native drawn tiles, with margins at fade boundaries: 27.6–45.8% of indexed blade vertices. It is not a GPU invocation counter or GPU-time reduction. Actual vertex executions depend on index caching and shader branching. Draw and triangle submission counts remain unchanged. Texture storage and visible geometry are unchanged. The existing software-WebGL cost gate reports nominal texture storage separately.

All three native A/B PNG pairs are byte-identical. The receipts and images are in `grass-collapsed-proof/`. This does not establish a shimmer fix or hardware frame rate. Hardware gate comparison should measure shader/GPU time with the same route and settings.

Validation: TypeScript, production build and 25 grass/visibility tests pass. The geometry test also asserts that every indexed primitive belongs to a single blade, the invariant required by whole-blade rejection.
