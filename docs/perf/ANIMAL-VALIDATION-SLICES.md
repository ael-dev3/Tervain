# Bound first-use animal validation work

Parsed wildlife sources can finish loading during play. Their original validation scanned every skin weight and asked Three to compute each cold skinned bounding box in one uninterrupted vertex walk. The largest supplied source has 46,639 vertices. Cooperative wildlife construction happened afterwards and did not divide that first-use scan.

The loader now consumes the existing validation as batches of 512 vertices, checking its two-millisecond work allowance between batches and yielding through the existing browser-presentation scheduler. Synchronous callers retain synchronous validation. The bounds use the same native posed vertices and expansion order; only completed per-mesh boxes are published. No geometry, skin weights, materials or animations change.

```sh
node tools/repro-animal-bounds-work.mjs --url http://127.0.0.1:4173/ --out animal-bounds-before
node tools/repro-animal-bounds-work.mjs --url http://127.0.0.1:4173/ --baseline animal-bounds-before/report.json --out animal-bounds-after
```

Run against the original and changed production builds. The probe hooks native unpublished quadruped vertex reads before source assets load, records their complete bounds, and measures reads between its microtask checkpoints.

| Counter | Before | After |
| --- | ---: | ---: |
| Source models | 19 | 19 |
| Total native posed-vertex reads | 492,444 | 492,444 |
| Maximum reads between probe checkpoints | 46,639 | 5,120 |
| Native animal instances | 19 | 19 |
| Exact source bounds and read-count equality | control | yes |

The maximum drops about 89%. Probe checkpoint counts are not exact browser task durations, frame times or GPU timings. Total work remains unchanged; yielding may increase loading latency. The time allowance is checked between batches, not a hard per-frame limit. Parsing, texture decoding/uploads and synchronous clone/placement work remain separate costs.

The original receipt uses 0.0.15 with the independent validation-reuse patch; its first-use source bounds path is unchanged. The changed receipt uses this PR's production build. The before/after comparison requires all 19 sources, identical per-source bounds and read counts, and a lower maximum checkpoint workload.

Validation: 31 tests, TypeScript and production build pass. New tests compare against Three's own posed bounds with nested transforms and static accessories, check weight/vertex batch sizes, reject an invalid weight beyond the first batch, and verify cancellation never publishes partial skin bounds. Supplied moving and seated source skins also match Three's bounds exactly. Native before/after assertions pass. Receipts are in `animal-bounds-proof/`.

No hardware FPS, heat, whole-startup speedup or resolution of a particular video hitch is claimed. Hardware play-gate comparison remains necessary.
