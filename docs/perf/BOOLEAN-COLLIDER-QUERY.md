# Boolean collision query early-out

`blocked` collected every nearby collider into a temporary array and Set before checking whether any collider blocked the point. Visit the same grid buckets directly, deduplicate candidates with bounded per-query stamps, and return on the first blocking collider. Existing custom `near` providers keep their original dispatch path. Geometry predicates, height bounds and support filtering remain unchanged; active state is read each query.

`node tools/repro-boolean-collider-query.mjs boolean-queries.json` compares actual original/current classes on the authored terrain and 811 static colliders, with multiple radii and terrain-height body bounds:

| Result | Before | After |
| --- | ---: | ---: |
| Boolean queries | 15,399 | 15,399 |
| Nearby array/Set collection calls | 15,399 | 0 |
| Bucket candidate visits | 8,919 | 7,475 |
| Different blocked results | 0 | 0 |

Persistent stamp storage replaces temporary deduplication; these counts do not measure total heap allocations or bytes. Stamps clear before reuse, and no collision result is cached.

`node tools/repro-boolean-collider-query.mjs boolean-timings.json --timings` runs uninstrumented alternating batches after warm-up, discarding the first pair. Each batch repeats the authored queries 50 times (769,950 queries). Median CPU workload time **110.8 → 93.4 ms (15.8% lower)**; each recorded pair favours the candidate, and every hit checksum matches. This is a query-throughput workload, not frame time or Mac hardware evidence.

[Query receipt](boolean-collider-proof/queries.json) · [All timing rounds](boolean-collider-proof/timings.json).

Build/typecheck and 32 collision/camera/navigation tests pass. Regressions cover repeated grid membership, stamp rollover after geometry changes, active-state changes and custom providers. No rendering or animation changes. Hardware play-gate and live validation remain outstanding.
