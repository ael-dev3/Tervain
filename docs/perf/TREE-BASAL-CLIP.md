# Reject upper wood before root clipping

Published reproduction: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), linked to the tree and loading-cost items in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

Root seating clips all woody LOD triangles against a low horizontal plane. The old implementation constructs three point arrays, a triangle array and a polygon array even when every vertex is above that plane. Those triangles cannot contribute a root surface. The candidate rejects them before those construction sites; touching and crossing triangles retain the existing clipping path.

The replay imports the original and candidate grounding functions and supplies the published build's actual geometry and terrain. Each implementation starts with cold variant caches. It compares root polygons, planting seats and flare seats across all 341 native low-preset targets, covering 20 shared variants.

| Deterministic check | Before | After |
| --- | ---: | ---: |
| Triangle clipping entries | 565,484 | 70,591 |
| Executions of the five base array-construction sites | 2,827,420 | 352,955 |
| Native placements checked | 341 | 341 |

This removes 87.5% of those construction-site executions. Polygon hashes and all placement heights match exactly. Original geometry buffers also retain the same hash. This is a cold tree-loading reduction, not a per-frame saving. Counts are source execution counts, not measured heap allocations, GC pauses, hardware timings or a claim that floating roots are solved.

[Full before/after receipt](../../proofs/tree-basal-clip/report.json) includes per-tree heights and source hashes. The [unchanged-source negative control](../../proofs/tree-basal-clip/unchanged-source-control.json) fails the reduction assertion while retaining matching output. No geometry, material, placement policy or rendering code changes, so the proof compares exact data rather than an image score.

Reproduce from a checkout containing the published revision:

```sh
node tools/repro-live-basal-clip.mjs --out basal-clip-proof
node tools/repro-live-basal-clip.mjs --candidate-ref 421d34b --out basal-clip-control
```

The first command must exit zero; the second must exit nonzero. Both default to the published Pages build and run in headless Chrome with software WebGL. The source overlay changes only the grounding functions used by the proof; it does not replace native model data or modify the live scene.

Validation: 24 grounding and pine-integration tests pass; type checking and production build pass. No hardware frame-time receipt is asserted.
