# Bound tree footprint distances before evaluating hypot

Published reproduction: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), related to tree loading and CPU cost in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

`treeWoodCollisionRadius` scans woody edges through the player-height slab. It evaluates `Math.hypot` even for endpoints and clipped edge intersections that cannot enlarge the maximum radius already found. The candidate uses `abs(x) + abs(z)` as a conservative upper bound. If that upper bound is within the current radius, it skips the distance calculation; possible maxima retain the original `Math.hypot`, interpolation and rounding. The negated comparison also preserves invalid-coordinate propagation.

The software-WebGL replay uses the published native models and terrain, replays planting-plane burial depths, and starts shared variant caches cold in both implementations. It checks 225 retained non-pine trees across 17 variants. Pines use another collision implementation and are excluded. This is a retained-tree workload, not an instrumented count of all rejected population attempts or an entire live load.

| Deterministic check | Before | After |
| --- | ---: | ---: |
| Cold distance evaluations | 3,819,344 | 253,534 |
| Warm repeated-query distance evaluations | 0 | 0 |
| Exact matching returned radii | 225 | 225 |

All radius records match exactly, as do original geometry-buffer hashes. The unchanged-source control correctly fails the reduction assertion. Counts measure executed distance calls, not hardware frame times, heap allocations, a per-frame saving or a foliage-quality score. This does not close floating crowns or grass sparkle.

[Before/after receipt](../../proofs/tree-radius-bound/report.json) · [unchanged-source control](../../proofs/tree-radius-bound/unchanged-source-control.json)

Reproduce from a checkout containing the published revision:

```sh
node tools/repro-live-tree-radius-bound.mjs --out tree-radius-bound-proof
node tools/repro-live-tree-radius-bound.mjs --candidate-ref 421d34b --out tree-radius-bound-control
```

The first command must exit zero, the second nonzero. Both default to the live Pages build and headless Chrome with software WebGL. Native model data is retained; no scene geometry or placement is modified by the proof. Exact radius data is compared rather than an image score because this change affects only the CPU calculation.

Validation: 24 grounding and pine-integration tests, type checking and production build pass. Hardware frame-time verification remains outstanding.
