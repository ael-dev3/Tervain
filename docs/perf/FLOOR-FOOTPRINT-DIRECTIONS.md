# Forest-floor contact directions

On published 0.0.18 · 421d34b, moss/litter placement repeatedly evaluates sine and cosine for the same eight compass angles when checking terrain contact. Compute these eight pairs once at module initialization, using the original angle expression and double precision, and reuse them for every placement attempt. All sample positions, early exits and contact tolerances remain unchanged.

## Reproduction

```sh
node tools/repro-live-floor-footprint-directions.mjs --out floor-footprint-proof
```

The default target is [live Pages](https://ael-dev3.github.io/Tervain/). The script loads the published world and captures the retained canonical tree population, exclusions and planted crown field. It runs the actual baseline and candidate forest-floor population builders against that terrain. It counts all sine/cosine calls during each build, restoring the original functions before rendering. Imports and module initialization are outside the count; the candidate precomputes eight sine/cosine pairs once.

It compares every piece property and all three quality selections, then rebuilds each floor in the original scene through native post-processing/MSAA. Both replacement images must equal the original native pixels. Add `--candidate-ref 421d34b` for an unchanged-source control, which must exit nonzero because no work reduction occurs.

## Matched result

[Report](../../proofs/floor-footprint-directions/report.json) · [unchanged-source control](../../proofs/floor-footprint-directions/unchanged-source-control.json) · [before](../../proofs/floor-footprint-directions/before.png) · [after](../../proofs/floor-footprint-directions/after.png)

| One native population build | Baseline | Candidate |
| --- | ---: | ---: |
| Sine calls | 197,503 | 195,545 |
| Cosine calls | 197,503 | 195,545 |
| Pieces | 545 | 545 |
| Low / medium / high selection | 197 / 365 / 545 | 197 / 365 / 545 |
| Matched draw calls | 245 | 245 |
| Matched triangles | 1,889,302 | 1,889,302 |

The candidate removes 1,958 repeated contact-direction pairs (3,916 trig calls) per build. Whole-population trig work falls about 1%; this is a modest saving, not a measured load-time or FPS claim. Eight pairs are computed once when the module initializes. All piece records and selections match exactly, SHA-256 `eb72325d983dcf4a583a55889a61bdd8d850bddc82273e91056be9c37f7fdbff`, using all 453 retained canonical trees. Original native, baseline-rebuilt and candidate-rebuilt scene pixels are identical. The unchanged-source control correctly fails the reduction assertion; render totals are compared within each matched run, not across separate control/candidate loads.

Validation: all 18 forest-floor/planted-crown tests pass with the CI test timeout; type-check and production build pass.

## Scope

This is a deterministic reduction in repeated load-time math, not a hardware timing or M5 frame-rate receipt. It does not resolve crown shape, floating foliage or grass shimmer. Rendering uses software WebGL at low quality; population selection data is compared at low, medium and high. Texture counts in the receipt include temporary replacement-floor textures and are not a memory-saving claim.
