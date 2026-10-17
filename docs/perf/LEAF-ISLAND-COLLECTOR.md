# Reuse the leaf-island sample collector

Published source: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). Related checklist: [#326](https://github.com/ael-dev3/Tervain/issues/326).

The leaf-island pass evaluates a new sample-collector function for every triangle, including transparent triangles. The collector runs synchronously and retains no reference to the loop iteration. Reuse one collector per repair call, resetting its current triangle and part before processing each triangle. Opaque sample vectors remain independent clones.

The software-WebGL replay extracts distinct native near/middle leaf templates, their wood and alpha masks, and runs parent and candidate repair with the maximum selected instance scale. It removes the instanced coverage attribute before repair, compares every output attribute/index hash and repair result, then restores instance coverage for the rendered comparison. This is a deterministic repair replay on published assets, not a fresh full-world load benchmark.

| Check across 40 templates | Parent | Candidate |
| --- | ---: | ---: |
| Sample-collector creation sites evaluated | 241,439 | 40 |
| Scene draw calls | 121 | 121 |
| Scene triangles | 824,790 | 824,790 |

Every output attribute/index hash and repair result matches. Before/after captures differ in zero channels; the hidden-leaf control changes 23,585 channels.

The receipt counts **function-creation sites evaluated**, not measured heap allocations: an engine may optimize short-lived functions. No GC, loading-time or hardware frame-rate improvement is claimed. Placement, alpha thresholds, shaders, materials and draw decisions remain unchanged.

[Receipt](proofs/leaf-island-collector/report.json) · [Before](proofs/leaf-island-collector/before.png) · [After](proofs/leaf-island-collector/after.png) · [Hidden-leaf control](proofs/leaf-island-collector/empty.png)

Reproduce from the repository root:

```sh
node tools/repro-live-leaf-island-collector.mjs --out leaf-island-collector-proof
```

The default target is the published build; `--url` accepts another served build. The parent source is pinned to `e249483db`. The unchanged-source negative control is `--candidate-ref e249483db`: it must fail the reduction assertion. The [executed negative-control receipt](proofs/leaf-island-collector/unchanged-source.json) retains 241,439 creations in both variants and exits with failure, as expected. Source geometries must remain unchanged and the hidden-leaf control must change pixels.

The related leaf-island, leaf-surface-site and canopy suites pass 29 tests. Type-check and production build pass. Hardware verification remains pending; the tracked GPU evidence in `docs/perf/LATEST.md` is still `live16`.
