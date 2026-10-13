# Canopy preprocessing budget

The canopy audit's operation budget covered contact searches and bounds queries, but omitted leaf welding, component construction and wood-triangle construction. Large input could therefore do substantial preprocessing outside the limit, and even return complete coverage under an impossibly small budget.

`node tools/repro-canopy-preprocess-budget.mjs --out budget-proof.json` compares the original/current audit on a controlled 10,201-vertex plane and a wood box:

| 20-operation budget | Before | After |
| --- | ---: | ---: |
| Source vertex X reads | 30,611 | 0 |
| Result | Complete, zero candidates | Budget exhausted |

Reserve the leaf vertex work before allocating its weld graph, then charge triangle traversal, vertex grouping/bounds and wood-triangle construction to the same shared budget. A normal-budget control returns the same complete coverage summary. Geometry and rendering remain unchanged.

[Before/after receipt](canopy-budget-proof/report.json). Nine canopy tests, typecheck and build pass. Operation units are not CPU instructions, wall time or an exact memory limit. Counts now include preprocessing, so previous tight budgets may legitimately reject input earlier. The controlled reproduction does not attribute any live gameplay frame spike to this offline diagnostic.

When applying alongside leaf-surface projection, use this same shared charge callback for that projection as well; do not create a second preprocessing budget.
