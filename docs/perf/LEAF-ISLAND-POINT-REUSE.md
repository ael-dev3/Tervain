# Leaf-island repair point reuse

Published build: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). Related playtest checklist: [#326](https://github.com/ael-dev3/Tervain/issues/326).

Leaf-island repair constructs a temporary point for each triangle, although each sample resets it before use. Bounds consume its coordinates and retained surface samples already clone it. Keep one private scratch point per repair call instead.

The software-WebGL replay extracts 40 distinct native near/middle leaf templates, their wood and cutout masks, and runs parent and candidate repair with the selected instance scale. It substitutes the resulting geometries into the native forest for postprocessed captures.

| Check | Parent | Candidate |
| --- | ---: | ---: |
| Temporary point constructor requests | 241,439 | 40 |
| Changed image channels against native | 0 | 0 |
| Draw calls | 121 | 121 |
| Triangles | 824,790 | 824,790 |

Every output attribute/index hash and repair result matches; source geometry remains unchanged. These are constructor requests, not measured heap bytes, GC duration, frame timings or whole-load savings. Floating-leaf placement policy is unchanged. Hardware performance verification remains pending.

[Machine-readable receipt](proofs/leaf-island-point/report.json) · [Native](proofs/leaf-island-point/native.png) · [Before](proofs/leaf-island-point/before.png) · [After](proofs/leaf-island-point/after.png)

Reproduce from the repository root:

```sh
node tools/repro-live-leaf-island-point.mjs --out leaf-island-point-proof
```

The default URL is the published build. `--url` accepts another served build. The parent source is pinned to `32640d961`; `--candidate-ref 32640d961` is the unchanged-source negative control and must fail the reduction assertion.

The identity regression test observes points passed to bounds expansion: parent uses four objects for two attached cards; candidate uses one. The original implementation fails that assertion. Related leaf-island, leaf-surface-site and canopy suites: 23 tests pass. Type-check and production build pass.
