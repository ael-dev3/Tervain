# Orchard world-reach cull: before/after proof

Live **0.0.28 · 30d1f0d**, candidate **c1f53590f**. The live orchard cull's literal 1.5 is in geometry-local units, while the audit's woodReach is in world metres. On `tree:orchard:0:2` (scale 1.1247402672), the live cull can keep contacts up to 1.68711 world metres away.

The existing centre cull stays in place, followed by the unmasked audit's component/contact predicate. The second cull converts the 1.5 m world limit using the **existing orchard maximum instance scale, 1.15**: local reach **1.3043478261**. The scale range is shared with population generation; its arithmetic and RNG sequence are unchanged. Shared geometry must satisfy the largest supported instance, so the target removes 199 cards: its 143 currently flagged cards plus 56 required by the shared maximum-scale bound. No vertices, normals, UVs, shaders, textures, materials, placement or wood are edited.

| Near-detail audit, alpha:false, gap 0.75, woodReach 1.5 | Live | Candidate |
| --- | ---: | ---: |
| Target detached cards / clumps | 143 / 1 | 0 / 0 |
| All nine orchard detached cards | 239 | 0 |
| Target detached whole-chunk candidates | 0 | 0 |
| Target leaf triangles | 10,966 | 10,568 |

This is the requested rest-geometry/unmasked near-detail rule, not a claim that all species, cutout-aware coverage or wind-motion defects are closed.

Two shared source variants remove 176 and 199 cards. Referenced crown height remains 100% on both; horizontal spans retain 98.5–99.7% on one and 97.7–99.8% on the target's variant. Captures remain necessary for visual review; those extents are not an art-quality score.

## Native rendered comparison

High, 640×360, post/MSAA4, hour 15, reduced motion. Each view refreshes world/camera selection before its adjacent pair. Native warm and measured renders include colour, depth, shadows and secondary passes. Only initial loading draws were suppressed; native raster methods were restored before recording. Candidate indices apply to **all derived shadow geometries**, not just the colour source.

| View | Draws live → candidate | Triangles live → candidate | Changed RGB channels |
| --- | ---: | ---: | ---: |
| Target orchard | 359 → 359 | 5,867,518 → 5,860,768 | 71,106 (intended correction) |
| Forest control | 404 → 404 | 6,872,757 → 6,866,053 | 0 |

[Target before](proofs/orchard-world-reach/0-before.png) · [target after](proofs/orchard-world-reach/0-after.png) · [forest before](proofs/orchard-world-reach/1-before.png) · [forest after](proofs/orchard-world-reach/1-after.png).

The controlled live-page adapter uses the exact candidate index masks; independent export from the **actual compiled c1f5359** confirms identical candidate indices and unchanged surviving per-vertex arrays for both variants. Its separate compiled audit matches every orchard component/detachment count in the paired run. This is not a two-binary pixel comparison. [Agreement](proofs/orchard-world-reach/compiled-agreement.json), [compiled audit](proofs/orchard-world-reach/compiled-audit.json), [full paired report](proofs/orchard-world-reach/report.json). Console errors: zero.

No extra per-frame application code or shader taps are introduced. Contact detection runs during variant construction and removes triangles; vertex attribute storage remains unchanged. One instrumented source run took about 198 + 114 ms for the two load-time scans under concurrent task load; that is not a load benchmark, frame CPU or Apple GPU timing. No Mac 60-fps/thermal or hardware-gate claim.

50 focused tests, type-check and production build pass. The production integration regression fails on the original caller with 176 detached cards at maximum supported scale, then passes with zero. Tests also preserve surviving attributes, original input indices and surface-contact semantics.

## Reproduce

On this candidate source, run:

```sh
REPRO_INIT_FILE=tools/orchard-reach-capture-init.js node tools/prove-orchard-world-reach.mjs OUTPUT docs/perf/proofs/orchard-world-reach/compiled-geometry.json.gz
```

The optional final arguments select the expected compiled live revision and URL for a pinned rebuild. The script rejects revision drift, checks exact exported candidate buffers, requires the target correction to be visible, verifies no increased draws/triangles and pixel-identical forest control, and audits all orchard trees. Software renderer setup is required. The stock budget run is recorded separately when complete; the paired counters above already satisfy no increase at both recorded views.
