# Orchard 143-card audit diagnosis

Fresh published **0.0.28 · 30d1f0d**, `tree:orchard:0:2`, near detail, rest geometry. Measurement only; no tree edits. Reproduces **143 detached cards, one far clump, zero detached whole-chunk candidates** with `gap:0.75`, `woodReach:1.5`, `alpha:false`, `lod:0`, operation allowance 300,000,000.

Every one of the 143 is flagged by **woodReach 1.5 m**. None belongs to a whole chunk flagged by the **gap 0.75 m** contact test. Gap is also the bounding-box proximity threshold used to connect leaf components and group the far cards. A connected crown can therefore have zero whole-chunk candidates while its outer cards exceed wood reach.

| Measurement | Minimum | Maximum |
| --- | ---: | ---: |
| Nearest sampled leaf-surface/vertex to wood, world m | 1.500331074 | 1.684816508 |
| Leaf bounding-box centre to wood, world m | 1.500763257 | 1.685057392 |
| Nearest sampled contact, tree-local units | 1.333935592 | 1.497960513 |

Instance uniform scale **1.1247402672073803**. The correct local thresholds are **0.66682** for gap and **1.333641** for wood reach (exact values are 0.75/scale and 1.5/scale). All 143 contacts are below 1.5 *local* units despite exceeding 1.5 *world* metres. Thus a routine using an unconverted local reach of 1.5 could leave this entire flagged set unchanged. This is a measured unit distinction, not a claim about the unpublished re-seat implementation.

[All 143 rows, CSV](proofs/orchard-143/cards.csv) include stable audit component ID, component vertex IDs, world centre, sampled and centre nearest-wood distances, both flag columns and far-clump ID. [JSON with sample coordinates](proofs/orchard-143/cards.json) and [compressed live geometry](proofs/orchard-143/geometry.json.gz) permit independent replay.

Distances are exact closest-point searches against wood triangles **for the audit's supplied sample points**; they are not continuous triangle-to-triangle surface distances. No capped search or early exit is used for the independent distance. These exact sampled distances equal the native audit contact distances for every flagged card. Alpha:false includes card geometry, not cutout texels; no wind deformation is included.

Audit code: `src/diagnostics/canopyAudit.ts`, `auditCanopies`; component/proximity code: `src/diagnostics/canopyConnectivity.ts`, `components`, `spanningLeafEdges`, `farClumps`. Shared geometry scale range was preserved (0.9250548002–1.1247402672) when replaying the audit's capped contact search. Each card belongs to a gap-connected chunk with a near-wood member, explaining the zero gap candidates.

Run `node tools/trace-orchard-cards.mjs docs/perf/proofs/orchard-143/geometry.json.gz OUTPUT.json` from the repository. The diagnostic temporarily instruments an audit copy, removes it on exit, asserts the compiled revision and 143-card count, and changes no generator source. The geometry export used a CPU-only raster-suppressed load; no pixels, render budget or frame-time conclusions are drawn from it.
